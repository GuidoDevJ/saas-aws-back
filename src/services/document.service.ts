import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';
import { BUCKET_NAME, s3Client } from '../core/s3';
import { Item } from '../models/item';
import { ItemModel } from '../schemas/item';

/**
 * Servicio para gestionar operaciones de documentos en S3 y DynamoDB
 * Maneja la subida, recuperación y eliminación de archivos
 */
export class DocumentService {
  /**
   * Sube un archivo a S3 y registra los metadatos en DynamoDB
   * @param file - Buffer del archivo a subir
   * @param fileName - Nombre original del archivo
   * @param mimeType - Tipo MIME del archivo
   * @param userId - ID del usuario propietario
   * @returns Promesa que resuelve con los datos del documento creado
   */
  async uploadDocument(
    file: Buffer,
    fileName: string,
    mimeType: string,
    userId: string
  ): Promise<Item> {
    const documentId = uuidv4();
    const s3Key = `documents/${userId}/${documentId}/${fileName}`;

    // Subir archivo a S3
    const putCommand = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: s3Key,
      Body: file,
      ContentType: mimeType,
    });

    const s3Response = await s3Client.send(putCommand);

    // Crear registro en DynamoDB
    const item = new ItemModel({
      documentId,
      userId,
      fileName,
      fileSize: file.length,
      mimeType,
      s3Key,
      s3VersionId: s3Response.VersionId || 'none',
      uploadedAt: new Date().toISOString(),
      status: 'pending',
    });
    await item.save();
    return item as unknown as Item;
  }

  /**
   * Obtiene un documento por su ID desde DynamoDB
   * @param documentId - ID único del documento
   * @returns Promesa que resuelve con los datos del documento o null si no existe
   */
  async getDocument(documentId: string): Promise<Item | null> {
    const item = await ItemModel.get(documentId);
    return item as unknown as Item;
  }

  /**
   * Obtiene todos los documentos de un usuario específico
   * @param userId - ID del usuario
   * @returns Promesa que resuelve con un array de documentos del usuario
   */
  async getDocumentsByUser(userId: string): Promise<Item[]> {
    const items = await ItemModel.query('userId').eq(userId).exec();
    return items as unknown as Item[];
  }

  /**
   * Genera una URL prefirmada para descargar un documento desde S3
   * @param s3Key - Clave del archivo en S3
   * @param expiresIn - Tiempo de expiración en segundos (por defecto 1 hora)
   * @returns Promesa que resuelve con la URL prefirmada
   */
  async getDownloadUrl(
    s3Key: string,
    expiresIn: number = 3600
  ): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: s3Key,
    });

    const url = await getSignedUrl(s3Client, command, { expiresIn });
    return url;
  }

  /**
   * Elimina un documento de S3 y su registro en DynamoDB
   * @param documentId - ID único del documento a eliminar
   * @returns Promesa que resuelve cuando la eliminación es exitosa
   */
  async deleteDocument(documentId: string): Promise<void> {
    // Obtener el documento para conocer su s3Key
    const item = await this.getDocument(documentId);

    if (!item) {
      throw new Error('Document not found');
    }

    // Eliminar de S3
    const deleteCommand = new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: item.s3Key,
    });

    await s3Client.send(deleteCommand);

    // Eliminar de DynamoDB
    await ItemModel.delete(documentId);
  }

  /**
   * Actualiza el estado de procesamiento de un documento
   * @param documentId - ID único del documento
   * @param status - Nuevo estado del documento
   * @returns Promesa que resuelve con el documento actualizado
   */
  async updateDocumentStatus(
    documentId: string,
    status: 'pending' | 'processing' | 'completed' | 'failed'
  ): Promise<Item> {
    const document = await ItemModel.get(documentId);
    if (!document) {
      throw new Error(`Document with ID ${documentId} not found`);
    }
    (document as any).status = status;
    await (document as any).save();
    return document as unknown as Item;
  }

  /**
   * Genera una URL prefirmada para subir un archivo directamente a S3
   * Útil para subidas grandes desde el frontend
   * @param fileName - Nombre del archivo
   * @param mimeType - Tipo MIME del archivo
   * @param userId - ID del usuario propietario
   * @param expiresIn - Tiempo de expiración en segundos (por defecto 15 minutos)
   * @returns Promesa que resuelve con la URL prefirmada y el documentId generado
   */
  async generateUploadUrl(
    fileName: string,
    mimeType: string,
    userId: string,
    expiresIn: number = 900
  ): Promise<{ uploadUrl: string; documentId: string; s3Key: string }> {
    const documentId = uuidv4();
    const s3Key = `documents/${userId}/${documentId}/${fileName}`;

    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: s3Key,
      ContentType: mimeType,
    });

    const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn });

    return { uploadUrl, documentId, s3Key };
  }

  /**
   * Confirma y registra un documento que fue subido directamente a S3
   * Este método se usa después de que el cliente sube un archivo usando una URL prefirmada
   * @param documentId - ID del documento generado previamente
   * @param s3Key - Clave del archivo en S3
   * @param fileSize - Tamaño del archivo en bytes
   * @param userId - ID del usuario propietario
   * @param fileName - Nombre del archivo
   * @param mimeType - Tipo MIME del archivo
   * @returns Promesa que resuelve con los datos del documento registrado
   */
  async confirmUpload(
    documentId: string,
    s3Key: string,
    fileSize: number,
    userId: string,
    fileName: string,
    mimeType: string
  ): Promise<Item> {
    // Crear registro en DynamoDB
    const item = new ItemModel({
      documentId,
      userId,
      fileName,
      fileSize,
      mimeType,
      s3Key,
      s3VersionId: 'direct-upload', // Para subidas directas no tenemos VersionId inmediatamente
      uploadedAt: new Date().toISOString(),
      status: 'completed', // La subida ya fue exitosa
    });

    await item.save();

    return item as unknown as Item;
  }
}
