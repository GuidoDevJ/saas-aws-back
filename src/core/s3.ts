import { S3Client } from '@aws-sdk/client-s3';

/**
 * Cliente de S3 configurado para AWS SDK v3
 * Soporta LocalStack para desarrollo local mediante variables de entorno
 *
 * Para usar LocalStack, configura:
 * - AWS_ENDPOINT_URL=http://localhost:4566
 * - AWS_ACCESS_KEY_ID=test
 * - AWS_SECRET_ACCESS_KEY=test
 */
export const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-west-2',
  ...(process.env.AWS_ENDPOINT_URL && {
    endpoint: process.env.AWS_ENDPOINT_URL,
    forcePathStyle: true, // Necesario para LocalStack
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'test',
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'test',
    },
  }),
});

/**
 * Nombre del bucket S3 donde se almacenan los documentos
 * Se obtiene de las variables de entorno o usa un valor por defecto
 */
export const BUCKET_NAME = process.env.S3_BUCKET_NAME || 'documents-bucket';
