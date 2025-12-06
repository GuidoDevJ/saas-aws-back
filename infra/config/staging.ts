import { EnvironmentConfig } from './types';

/**
 * Configuración para ambiente de staging en AWS
 */
export const stagingConfig: EnvironmentConfig = {
  environmentName: 'staging',
  region: 'us-east-2',

  s3: {
    bucketName: 'documents-bucket-staging',
    versioned: true,
    encrypted: true,

    cors: {
      allowedOrigins: [
        'https://staging.tu-dominio.com',
        // Agrega tus dominios de staging aquí
      ],
      allowedMethods: ['GET', 'PUT', 'POST'],
    },

    lifecycleRules: {
      transitionToIADays: 60,
      expirationDays: 180, // 6 meses
    },
  },

  dynamodb: {
    tableName: 'Items-staging',
    billingMode: 'PAY_PER_REQUEST',
    pointInTimeRecovery: true, // Habilitar backup
    stream: true,
  },

  tags: {
    Environment: 'staging',
    ManagedBy: 'CDK',
    Project: 'SaaS-Backend',
    CostCenter: 'PreProduction',
  },
};
