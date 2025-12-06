import { EnvironmentConfig } from './types';

/**
 * Configuración para ambiente de desarrollo en AWS
 */
export const devConfig: EnvironmentConfig = {
  environmentName: 'dev',
  region: 'us-east-2',

  s3: {
    bucketName: `documents-bucket-dev-${Date.now()}`, // Nombre único para evitar conflictos
    versioned: true, // Habilitar versionado
    encrypted: true, // Encriptación habilitada

    cors: {
      allowedOrigins: [
        'http://localhost:3000',
        'http://localhost:5173',
        // Agrega tus dominios de dev aquí
      ],
      allowedMethods: ['GET', 'PUT', 'POST'],
    },

    lifecycleRules: {
      transitionToIADays: 90, // Mover a IA después de 90 días
      expirationDays: 365, // Eliminar después de 1 año
    },
  },

  dynamodb: {
    tableName: `Items-dev-${Date.now()}`, // Nombre único para evitar conflictos
    billingMode: 'PAY_PER_REQUEST', // On-demand para dev
    pointInTimeRecovery: false, // Opcional en dev
    stream: true, // Habilitar para triggers
  },

  tags: {
    Environment: 'dev',
    ManagedBy: 'CDK',
    Project: 'SaaS-Backend',
    CostCenter: 'Development',
  },
};
