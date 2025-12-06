/**
 * Interfaz que define la estructura de un documento en la base de datos
 */
export interface Item {
  /** ID único del documento (clave primaria) */
  documentId: string;

  /** ID del usuario propietario del documento */
  userId: string;

  /** Nombre original del archivo */
  fileName: string;

  /** Tamaño del archivo en bytes */
  fileSize: number;

  /** Tipo MIME del archivo (ej: application/pdf, image/png) */
  mimeType: string;

  /** Clave (path) del archivo en S3 */
  s3Key: string;

  /** ID de versión del archivo en S3 */
  s3VersionId: string;

  /** Fecha y hora de subida del documento (formato ISO) */
  uploadedAt: string;

  /** Estado actual del procesamiento del documento */
  status: 'pending' | 'processing' | 'completed' | 'failed';

  /** Fecha de creación del registro (generada automáticamente) */
  createdAt?: string;

  /** Fecha de última actualización del registro (generada automáticamente) */
  updatedAt?: string;
}
