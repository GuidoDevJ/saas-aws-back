import * as dynamoose from 'dynamoose';
import { Item } from 'dynamoose/dist/Item';

/**
 * Esquema de Dynamoose para la tabla de documentos
 * Define la estructura y configuración de la base de datos
 */
const itemSchema = new dynamoose.Schema(
  {
    /**
     * ID único del documento - Clave primaria (Partition Key)
     */
    documentId: {
      type: String,
      hashKey: true,
      required: true,
    },

    /**
     * ID del usuario propietario - Indexado para consultas por usuario
     */
    userId: {
      type: String,
      required: true,
      index: {
        name: 'UserIdIndex',
        type: 'global',
      },
    },

    /**
     * Nombre original del archivo subido
     */
    fileName: {
      type: String,
      required: true,
    },

    /**
     * Tamaño del archivo en bytes
     */
    fileSize: {
      type: Number,
      required: true,
    },

    /**
     * Tipo MIME del archivo para identificar su formato
     */
    mimeType: {
      type: String,
      required: true,
    },

    /**
     * Clave del archivo en S3 - Indexado para búsquedas por ubicación
     */
    s3Key: {
      type: String,
      required: true,
      index: {
        name: 'S3KeyIndex',
        type: 'global',
      },
    },

    /**
     * ID de versión del archivo en S3 para control de versiones
     */
    s3VersionId: {
      type: String,
      required: true,
    },

    /**
     * Fecha y hora de subida en formato ISO string
     */
    uploadedAt: {
      type: String,
      required: true,
    },

    /**
     * Estado del procesamiento del documento
     * - pending: Recién subido, esperando procesamiento
     * - processing: En proceso de análisis o transformación
     * - completed: Procesamiento exitoso
     * - failed: Error en el procesamiento
     */
    status: {
      type: String,
      required: true,
      enum: ['pending', 'processing', 'completed', 'failed'],
      default: 'pending',
    },
  },
  {
    timestamps: true, // Agrega createdAt y updatedAt automáticamente
    saveUnknown: false, // No guarda campos no definidos en el schema
  }
);

/**
 * Obtener nombre de tabla desde variables de entorno
 * Esto permite que CDK controle el nombre de la tabla
 */
const TABLE_NAME = process.env.DYNAMODB_TABLE_NAME || 'Items';

/**
 * Modelo de Dynamoose para operaciones CRUD sobre la tabla Items
 * create: false - No intenta crear la tabla automáticamente (la tabla es creada por CDK)
 * waitForActive: false - No espera a que la tabla esté activa
 */
export const ItemModel = dynamoose.model<Item>(TABLE_NAME, itemSchema, {
  create: false, // No crear tabla automáticamente
  waitForActive: false, // No esperar a que la tabla esté activa
});
