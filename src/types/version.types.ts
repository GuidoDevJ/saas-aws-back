/**
 * Tipos relacionados con el versionado de documentos
 */

/**
 * Información completa de una versión de documento
 */
export interface DocumentVersion {
  /** ID del documento padre */
  documentId: string;

  /** ID único de la versión */
  versionId: string;

  /** Número de versión (incremental) */
  versionNumber: number;

  /** ID de versión asignado por S3 */
  s3VersionId?: string;

  /** Clave del archivo en S3 */
  s3Key: string;

  /** Nombre del archivo */
  fileName: string;

  /** Tipo MIME del archivo */
  mimeType: string;

  /** Tamaño del archivo en bytes */
  size: number;

  /** Fecha y hora de subida (ISO string) */
  uploadedAt: string;

  /** ID del usuario que subió esta versión */
  uploadedBy: string;

  /** Indica si es la versión activa/actual */
  isActive: boolean;

  /** Checksum del archivo (opcional, para integridad) */
  checksum?: string;

  /** Comentario o descripción de la versión (opcional) */
  comment?: string;
}

/**
 * Metadata resumida de una versión (para listados)
 */
export interface VersionMetadata {
  /** ID único de la versión */
  versionId: string;

  /** Número de versión */
  versionNumber: number;

  /** Fecha de subida */
  uploadedAt: string;

  /** Usuario que subió */
  uploadedBy: string;

  /** Tamaño del archivo */
  size: number;

  /** Nombre del archivo */
  fileName: string;

  /** Indica si es la versión activa */
  isActive: boolean;

  /** Comentario opcional */
  comment?: string;
}

/**
 * Request para generar URL de subida de versión
 */
export interface GenerateVersionUploadUrlRequest {
  /** ID del documento al que se le añadirá una versión */
  documentId: string;

  /** Nombre del archivo */
  fileName: string;

  /** Tipo MIME */
  mimeType: string;

  /** Comentario opcional para esta versión */
  comment?: string;
}

/**
 * Response de generación de URL de subida
 */
export interface GenerateVersionUploadUrlResponse {
  /** URL prefirmada para subir el archivo */
  uploadUrl: string;

  /** ID de la versión generada */
  versionId: string;

  /** Número de versión asignado */
  versionNumber: number;

  /** Clave S3 donde se subirá el archivo */
  s3Key: string;

  /** Tiempo de expiración en segundos */
  expiresIn: number;

  /** Instrucciones de uso */
  instructions: string;
}

/**
 * Request para confirmar subida de versión
 */
export interface ConfirmVersionUploadRequest {
  /** ID del documento */
  documentId: string;

  /** ID de la versión */
  versionId: string;

  /** Clave S3 del archivo */
  s3Key: string;

  /** Tamaño del archivo */
  size: number;

  /** Checksum opcional */
  checksum?: string;
}

/**
 * Response de confirmación de subida
 */
export interface ConfirmVersionUploadResponse {
  /** Indica si fue exitoso */
  success: boolean;

  /** Mensaje de confirmación */
  message: string;

  /** Información de la versión creada */
  version: VersionMetadata;
}

/**
 * Response de listado de versiones
 */
export interface ListVersionsResponse {
  /** ID del documento */
  documentId: string;

  /** Total de versiones */
  totalVersions: number;

  /** Lista de versiones */
  versions: VersionMetadata[];
}

/**
 * Response de descarga de versión
 */
export interface DownloadVersionResponse {
  /** URL de descarga prefirmada */
  downloadUrl: string;

  /** Tiempo de expiración en segundos */
  expiresIn: number;

  /** Información de la versión */
  version: VersionMetadata;
}
