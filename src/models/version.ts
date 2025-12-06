/**
 * Interfaz que define la estructura de una versión de documento en la base de datos
 */
export interface Version {
  /** ID del documento padre */
  documentId: string;

  /** ID único de la versión (clave de rango) */
  versionId: string;

  /** Número de versión incremental */
  versionNumber: number;

  /** ID de versión asignado por S3 (opcional) */
  s3VersionId?: string;

  /** Clave (path) del archivo en S3 */
  s3Key: string;

  /** Nombre del archivo */
  fileName: string;

  /** Tipo MIME del archivo */
  mimeType: string;

  /** Tamaño del archivo en bytes */
  size: number;

  /** Fecha y hora de subida (formato ISO) */
  uploadedAt: string;

  /** ID del usuario que subió esta versión */
  uploadedBy: string;

  /** Indica si es la versión activa */
  isActive: boolean;

  /** Checksum del archivo (opcional) */
  checksum?: string;

  /** Comentario o descripción de la versión (opcional) */
  comment?: string;

  /** Fecha de creación del registro (generada automáticamente) */
  createdAt?: string;

  /** Fecha de última actualización del registro (generada automáticamente) */
  updatedAt?: string;
}
