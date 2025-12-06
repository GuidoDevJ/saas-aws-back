import { EnvironmentConfig } from './types';

/**
 * Configuración para ambiente de producción en AWS
 */
export const prodConfig: EnvironmentConfig = {
  environmentName: 'prod',
  region: 'us-east-2',

  s3: {
    bucketName: 'documents-bucket-prod',
    versioned: true, // Crítico en producción
    encrypted: true, // Encriptación obligatoria

    cors: {
      allowedOrigins: [
        'https://tu-dominio.com',
        'https://www.tu-dominio.com',
        // Solo dominios de producción
      ],
      allowedMethods: ['GET', 'PUT', 'POST'],
    },

    lifecycleRules: {
      transitionToIADays: 30, // Optimizar costos
      // No expirar en producción (o un período muy largo)
    },
  },

  dynamodb: {
    tableName: 'Items-prod',
    billingMode: 'PAY_PER_REQUEST', // O PROVISIONED si tienes carga predecible
    pointInTimeRecovery: true, // Obligatorio en producción
    stream: true, // Para auditoría y procesamiento

    // Si decides usar PROVISIONED:
    // billingMode: 'PROVISIONED',
    // provisionedCapacity: {
    //   readCapacity: 10,
    //   writeCapacity: 5,
    // },
  },

  tags: {
    Environment: 'prod',
    ManagedBy: 'CDK',
    Project: 'SaaS-Backend',
    CostCenter: 'Production',
    Compliance: 'Required',
    Backup: 'Daily',
  },
};
