/**
 * Tipos de configuración para diferentes ambientes
 */

/**
 * Configuración específica de cada ambiente
 */
export interface EnvironmentConfig {
  /** Nombre del ambiente */
  environmentName: string;

  /** Región de AWS */
  region: string;

  /** Configuración de S3 */
  s3: {
    /** Nombre del bucket (será sufijado con el ambiente) */
    bucketName: string;

    /** Habilitar versionado de archivos */
    versioned: boolean;

    /** Habilitar encriptación */
    encrypted: boolean;

    /** Configuración de CORS */
    cors: {
      allowedOrigins: string[];
      allowedMethods: string[];
    };

    /** Configuración de ciclo de vida */
    lifecycleRules?: {
      /** Días antes de mover a Infrequent Access */
      transitionToIADays?: number;

      /** Días antes de expirar */
      expirationDays?: number;
    };
  };

  /** Configuración de DynamoDB */
  dynamodb: {
    /** Nombre de la tabla */
    tableName: string;

    /** Modo de facturación */
    billingMode: 'PAY_PER_REQUEST' | 'PROVISIONED';

    /** Point-in-time recovery */
    pointInTimeRecovery: boolean;

    /** Habilitar streams */
    stream?: boolean;

    /** Configuración de capacidad (solo si billingMode es PROVISIONED) */
    provisionedCapacity?: {
      readCapacity: number;
      writeCapacity: number;
    };
  };

  /** Tags comunes para todos los recursos */
  tags: {
    [key: string]: string;
  };
}

/**
 * Configuración específica para LocalStack
 */
export interface LocalStackConfig extends EnvironmentConfig {
  /** Endpoint de LocalStack */
  endpoint: string;

  /** Credenciales de prueba */
  credentials: {
    accessKeyId: string;
    secretAccessKey: string;
  };
}
