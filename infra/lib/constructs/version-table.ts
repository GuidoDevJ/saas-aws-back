import { Construct } from 'constructs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { RemovalPolicy } from 'aws-cdk-lib';
import { EnvironmentConfig } from '../../config';

/**
 * Props para el construct VersionTable
 */
export interface VersionTableProps {
  /** Configuración del ambiente */
  config: EnvironmentConfig;
}

/**
 * Construct que crea y configura la tabla DynamoDB para versiones de documentos
 *
 * Características:
 * - Partition Key: documentId
 * - Sort Key: versionId
 * - Global Secondary Index: UploadedByIndex (para consultas por usuario)
 * - Point-in-time recovery según ambiente
 * - Billing mode configurable
 * - DynamoDB Streams opcional
 *
 * Permite consultar:
 * - Todas las versiones de un documento específico (PK query)
 * - Una versión específica (PK + SK query)
 * - Versiones subidas por un usuario específico (GSI query)
 */
export class VersionTable extends Construct {
  /** Tabla DynamoDB creada */
  public readonly table: dynamodb.Table;

  constructor(scope: Construct, id: string, props: VersionTableProps) {
    super(scope, id);

    const { config } = props;

    // Determinar billing mode
    const billingMode =
      config.dynamodb.billingMode === 'PROVISIONED'
        ? dynamodb.BillingMode.PROVISIONED
        : dynamodb.BillingMode.PAY_PER_REQUEST;

    // Configurar capacidad si es PROVISIONED
    const provisionedCapacity =
      billingMode === dynamodb.BillingMode.PROVISIONED &&
      config.dynamodb.provisionedCapacity
        ? {
            readCapacity: config.dynamodb.provisionedCapacity.readCapacity,
            writeCapacity: config.dynamodb.provisionedCapacity.writeCapacity,
          }
        : undefined;

    // Crear tabla de versiones
    this.table = new dynamodb.Table(this, 'VersionTable', {
      tableName: `${config.dynamodb.tableName}-Versions`,

      // Partition Key (Hash Key)
      partitionKey: {
        name: 'documentId',
        type: dynamodb.AttributeType.STRING,
      },

      // Sort Key (Range Key) - Permite consultar versiones de un documento
      sortKey: {
        name: 'versionId',
        type: dynamodb.AttributeType.STRING,
      },

      // Billing
      billingMode,
      ...(provisionedCapacity && {
        readCapacity: provisionedCapacity.readCapacity,
        writeCapacity: provisionedCapacity.writeCapacity,
      }),

      // Point-in-time recovery
      pointInTimeRecovery: config.dynamodb.pointInTimeRecovery,

      // DynamoDB Streams
      stream: config.dynamodb.stream
        ? dynamodb.StreamViewType.NEW_AND_OLD_IMAGES
        : undefined,

      // Política de eliminación
      removalPolicy:
        config.environmentName === 'prod'
          ? RemovalPolicy.RETAIN
          : RemovalPolicy.DESTROY,

      // TTL no configurado por ahora
      timeToLiveAttribute: undefined,
    });

    // Global Secondary Index: UploadedByIndex
    // Permite consultar todas las versiones subidas por un usuario específico
    this.table.addGlobalSecondaryIndex({
      indexName: 'UploadedByIndex',
      partitionKey: {
        name: 'uploadedBy',
        type: dynamodb.AttributeType.STRING,
      },
      // Opcional: agregar sort key para ordenar por fecha
      sortKey: {
        name: 'uploadedAt',
        type: dynamodb.AttributeType.STRING,
      },
      projectionType: dynamodb.ProjectionType.ALL,
      ...(provisionedCapacity && {
        readCapacity: Math.ceil(provisionedCapacity.readCapacity / 2),
        writeCapacity: Math.ceil(provisionedCapacity.writeCapacity / 2),
      }),
    });

    // Agregar tags
    Object.entries(config.tags).forEach(([key, value]) => {
      this.table.node.addMetadata(key, value);
    });
  }

  /**
   * Otorga permisos de lectura a un principal (Lambda, Role, etc.)
   */
  public grantReadData(grantee: any) {
    this.table.grantReadData(grantee);
  }

  /**
   * Otorga permisos de escritura a un principal
   */
  public grantWriteData(grantee: any) {
    this.table.grantWriteData(grantee);
  }

  /**
   * Otorga permisos completos de lectura y escritura a un principal
   */
  public grantReadWriteData(grantee: any) {
    this.table.grantReadWriteData(grantee);
  }
}
