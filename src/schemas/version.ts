import * as dynamoose from 'dynamoose';
import { Item } from 'dynamoose/dist/Item';

/**
 * Esquema de Dynamoose para versiones de documentos
 *
 * Estructura de clave compuesta:
 * - PK (hashKey): documentId
 * - SK (rangeKey): versionId
 *
 * Esto permite:
 * - Consultar todas las versiones de un documento eficientemente
 * - Acceder a una versión específica directamente
 */
const versionSchema = new dynamoose.Schema(
  {
    /**
     * ID del documento padre - Partition Key
     */
    documentId: {
      type: String,
      hashKey: true,
      required: true,
    },

    /**
     * ID único de la versión - Sort Key
     */
    versionId: {
      type: String,
      rangeKey: true,
      required: true,
    },

    /**
     * Número de versión incremental (1, 2, 3, ...)
     */
    versionNumber: {
      type: Number,
      required: true,
    },

    /**
     * ID de versión asignado por S3 (opcional, S3 lo genera automáticamente)
     */
    s3VersionId: {
      type: String,
      required: false,
    },

    /**
     * Clave del archivo en S3
     */
    s3Key: {
      type: String,
      required: true,
    },

    /**
     * Nombre del archivo
     */
    fileName: {
      type: String,
      required: true,
    },

    /**
     * Tipo MIME del archivo
     */
    mimeType: {
      type: String,
      required: true,
    },

    /**
     * Tamaño del archivo en bytes
     */
    size: {
      type: Number,
      required: true,
    },

    /**
     * Fecha y hora de subida (ISO string)
     */
    uploadedAt: {
      type: String,
      required: true,
    },

    /**
     * ID del usuario que subió esta versión
     */
    uploadedBy: {
      type: String,
      required: true,
      index: {
        name: 'UploadedByIndex',
        type: 'global',
      },
    },

    /**
     * Indica si es la versión activa/actual
     */
    isActive: {
      type: Boolean,
      required: true,
      default: false,
    },

    /**
     * Checksum del archivo para verificar integridad
     */
    checksum: {
      type: String,
      required: false,
    },

    /**
     * Comentario o descripción de la versión
     */
    comment: {
      type: String,
      required: false,
    },
  },
  {
    timestamps: true, // Agrega createdAt y updatedAt automáticamente
    saveUnknown: false, // No guarda campos no definidos
  }
);

/**
 * Nombre de la tabla de versiones
 * Por convención, usamos el mismo nombre base que Items pero con sufijo -Versions
 */
const TABLE_NAME = process.env.DYNAMODB_VERSIONS_TABLE_NAME || 'DocumentVersions';

/**
 * Modelo de Dynamoose para operaciones sobre versiones de documentos
 */
export const VersionModel = dynamoose.model<Item>(TABLE_NAME, versionSchema, {
  create: false, // La tabla es creada por CDK
  waitForActive: false,
});
