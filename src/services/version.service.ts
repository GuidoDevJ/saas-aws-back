import {
  GetObjectCommand,
  ListObjectVersionsCommand,
} from '@aws-sdk/client-s3';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';
import { BUCKET_NAME, s3Client } from '../core/s3';
import { VersionModel } from '../schemas/version';
import { ItemModel } from '../schemas/item';
import { Version } from '../models/version';
import {
  DocumentVersion,
  VersionMetadata,
  GenerateVersionUploadUrlResponse,
  ConfirmVersionUploadResponse,
  ListVersionsResponse,
  DownloadVersionResponse,
} from '../types/version.types';

/**
 * Servicio para gestionar versiones de documentos
 *
 * Maneja:
 * - Generación de URLs para subir nuevas versiones
 * - Confirmación y registro de versiones
 * - Listado de versiones de un documento
 * - Descarga de versiones específicas
 */
export class VersionService {
  /**
   * Genera una URL prefirmada para subir una nueva versión de un documento
   *
   * @param documentId - ID del documento al que se añadirá la versión
   * @param userId - ID del usuario que sube la versión
   * @param fileName - Nombre del archivo
   * @param mimeType - Tipo MIME del archivo
   * @param comment - Comentario opcional para la versión
   * @param expiresIn - Tiempo de expiración de la URL en segundos (default: 15 min)
   * @returns Información de la URL de subida y metadata de la versión
   */
  async generateVersionUploadUrl(
    documentId: string,
    userId: string,
    fileName: string,
    mimeType: string,
    comment?: string,
    expiresIn: number = 900
  ): Promise<GenerateVersionUploadUrlResponse> {
    // Verificar que el documento existe
    const document = await ItemModel.get(documentId);
    if (!document) {
      throw new Error(`Document with ID ${documentId} not found`);
    }

    // Obtener el siguiente número de versión
    const existingVersions = await VersionModel.query('documentId')
      .eq(documentId)
      .exec();
    const versionNumber = existingVersions.length + 1;

    // Generar ID único para la versión
    const versionId = uuidv4();

    // Construir la clave S3 (mantener la misma estructura que el documento original)
    const s3Key = `documents/${userId}/${documentId}/versions/${versionNumber}-${fileName}`;

    // Generar URL prefirmada para subir
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: s3Key,
      ContentType: mimeType,
    });

    const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn });

    return {
      uploadUrl,
      versionId,
      versionNumber,
      s3Key,
      expiresIn,
      instructions:
        'Use PUT method to upload the file to the uploadUrl, then call /confirm endpoint with the version details',
    };
  }

  /**
   * Confirma y registra una nueva versión después de que fue subida a S3
   *
   * @param documentId - ID del documento
   * @param versionId - ID de la versión
   * @param s3Key - Clave S3 donde se subió el archivo
   * @param fileName - Nombre del archivo
   * @param mimeType - Tipo MIME
   * @param size - Tamaño del archivo en bytes
   * @param userId - ID del usuario
   * @param checksum - Checksum opcional del archivo
   * @param comment - Comentario opcional
   * @returns Confirmación y metadata de la versión
   */
  async confirmVersionUpload(
    documentId: string,
    versionId: string,
    s3Key: string,
    fileName: string,
    mimeType: string,
    size: number,
    userId: string,
    checksum?: string,
    comment?: string
  ): Promise<ConfirmVersionUploadResponse> {
    // Verificar que el documento existe
    const document = await ItemModel.get(documentId);
    if (!document) {
      throw new Error(`Document with ID ${documentId} not found`);
    }

    // Obtener número de versión
    const existingVersions = await VersionModel.query('documentId')
      .eq(documentId)
      .exec();
    const versionNumber = existingVersions.length + 1;

    // Obtener el versionId de S3 si está disponible
    let s3VersionId: string | undefined;
    try {
      const listVersionsCommand = new ListObjectVersionsCommand({
        Bucket: BUCKET_NAME,
        Prefix: s3Key,
      });
      const versionsList = await s3Client.send(listVersionsCommand);
      if (versionsList.Versions && versionsList.Versions.length > 0) {
        s3VersionId = versionsList.Versions[0].VersionId;
      }
    } catch (error) {
      console.warn('Could not retrieve S3 versionId:', error);
      // Continuar sin el versionId de S3
    }

    // Crear registro de la versión en DynamoDB
    const version = new VersionModel({
      documentId,
      versionId,
      versionNumber,
      s3VersionId,
      s3Key,
      fileName,
      mimeType,
      size,
      uploadedAt: new Date().toISOString(),
      uploadedBy: userId,
      isActive: false, // Nueva versión no es activa por defecto
      checksum,
      comment,
    });

    await version.save();

    const savedVersion = version as unknown as Version;

    // Preparar metadata para la respuesta
    const versionMetadata: VersionMetadata = {
      versionId,
      versionNumber,
      uploadedAt: savedVersion.uploadedAt,
      uploadedBy: userId,
      size,
      fileName,
      isActive: false,
      comment,
    };

    return {
      success: true,
      message: `Version ${versionNumber} created successfully`,
      version: versionMetadata,
    };
  }

  /**
   * Lista todas las versiones de un documento
   *
   * @param documentId - ID del documento
   * @returns Lista de versiones con metadata
   */
  async listVersions(documentId: string): Promise<ListVersionsResponse> {
    // Verificar que el documento existe
    const document = await ItemModel.get(documentId);
    if (!document) {
      throw new Error(`Document with ID ${documentId} not found`);
    }

    // Obtener todas las versiones del documento, ordenadas por versionNumber descendente
    const versions = await VersionModel.query('documentId').eq(documentId).exec();

    // Convertir a VersionMetadata
    const versionsList: VersionMetadata[] = versions
      .map((v: any) => ({
        versionId: v.versionId,
        versionNumber: v.versionNumber,
        uploadedAt: v.uploadedAt,
        uploadedBy: v.uploadedBy,
        size: v.size,
        fileName: v.fileName,
        isActive: v.isActive,
        comment: v.comment,
      }))
      .sort((a, b) => b.versionNumber - a.versionNumber); // Más reciente primero

    return {
      documentId,
      totalVersions: versionsList.length,
      versions: versionsList,
    };
  }

  /**
   * Genera una URL de descarga para una versión específica
   *
   * @param documentId - ID del documento
   * @param versionId - ID de la versión
   * @param expiresIn - Tiempo de expiración en segundos (default: 1 hora)
   * @returns URL de descarga y metadata de la versión
   */
  async getVersionDownloadUrl(
    documentId: string,
    versionId: string,
    expiresIn: number = 3600
  ): Promise<DownloadVersionResponse> {
    // Buscar la versión en DynamoDB
    const versionData = await VersionModel.get({ documentId, versionId });

    if (!versionData) {
      throw new Error(
        `Version ${versionId} not found for document ${documentId}`
      );
    }

    const version = versionData as unknown as Version;

    // Generar URL prefirmada para descargar
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: version.s3Key,
      // Si tenemos el versionId de S3, usarlo para obtener la versión exacta
      ...(version.s3VersionId && { VersionId: version.s3VersionId }),
    });

    const downloadUrl = await getSignedUrl(s3Client, command, { expiresIn });

    // Preparar metadata
    const versionMetadata: VersionMetadata = {
      versionId: version.versionId,
      versionNumber: version.versionNumber,
      uploadedAt: version.uploadedAt,
      uploadedBy: version.uploadedBy,
      size: version.size,
      fileName: version.fileName,
      isActive: version.isActive,
      comment: version.comment,
    };

    return {
      downloadUrl,
      expiresIn,
      version: versionMetadata,
    };
  }

  /**
   * Obtiene una versión específica completa
   *
   * @param documentId - ID del documento
   * @param versionId - ID de la versión
   * @returns Información completa de la versión
   */
  async getVersion(
    documentId: string,
    versionId: string
  ): Promise<Version | null> {
    const versionData = await VersionModel.get({ documentId, versionId });

    if (!versionData) {
      return null;
    }

    return versionData as unknown as Version;
  }
}
