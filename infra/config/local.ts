import { LocalStackConfig } from './types';

/**
 * Configuración para desarrollo local con LocalStack
 */
export const localConfig: LocalStackConfig = {
  environmentName: 'local',
  region: 'us-east-2',

  endpoint: process.env.AWS_ENDPOINT_URL || 'http://localhost:4566',

  credentials: {
    accessKeyId: 'test',
    secretAccessKey: 'test',
  },

  s3: {
    bucketName: 'documents-bucket-local',
    versioned: false, // No necesario en local
    encrypted: false, // No necesario en local

    cors: {
      allowedOrigins: ['*'], // Permitir todos en local
      allowedMethods: ['GET', 'PUT', 'POST', 'DELETE'],
    },
  },

  dynamodb: {
    tableName: 'Items',
    billingMode: 'PAY_PER_REQUEST',
    pointInTimeRecovery: false, // No soportado en LocalStack free
    stream: false, // Opcional en local
  },

  tags: {
    Environment: 'local',
    ManagedBy: 'CDK',
    Project: 'SaaS-Backend',
  },
};
