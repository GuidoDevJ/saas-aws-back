import { Construct } from 'constructs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { RemovalPolicy } from 'aws-cdk-lib';
import { EnvironmentConfig } from '../../config';

/**
 * Props para el construct DocumentTable
 */
export interface DocumentTableProps {
  /** Configuración del ambiente */
  config: EnvironmentConfig;
}

/**
 * Construct que crea y configura la tabla DynamoDB para metadatos de documentos
 *
 * Características:
 * - Partition Key: documentId
 * - Global Secondary Index: UserIdIndex (para consultas por usuario)
 * - Global Secondary Index: S3KeyIndex (para consultas por ubicación S3)
 * - Point-in-time recovery según ambiente
 * - Billing mode configurable
 * - DynamoDB Streams opcional
 */
export class DocumentTable extends Construct {
  /** Tabla DynamoDB creada */
  public readonly table: dynamodb.Table;

  constructor(scope: Construct, id: string, props: DocumentTableProps) {
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

    // Crear tabla
    this.table = new dynamodb.Table(this, 'DocumentTable', {
      tableName: config.dynamodb.tableName,

      // Partition Key
      partitionKey: {
        name: 'documentId',
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

      // Timestamps automáticos
      timeToLiveAttribute: undefined, // Configurar si necesitas TTL
    });

    // Global Secondary Index: UserIdIndex
    // Permite consultar todos los documentos de un usuario
    this.table.addGlobalSecondaryIndex({
      indexName: 'UserIdIndex',
      partitionKey: {
        name: 'userId',
        type: dynamodb.AttributeType.STRING,
      },
      projectionType: dynamodb.ProjectionType.ALL,
      ...(provisionedCapacity && {
        readCapacity: provisionedCapacity.readCapacity,
        writeCapacity: provisionedCapacity.writeCapacity,
      }),
    });

    // Global Secondary Index: S3KeyIndex
    // Permite buscar documentos por su ubicación en S3
    this.table.addGlobalSecondaryIndex({
      indexName: 'S3KeyIndex',
      partitionKey: {
        name: 's3Key',
        type: dynamodb.AttributeType.STRING,
      },
      projectionType: dynamodb.ProjectionType.ALL,
      ...(provisionedCapacity && {
        readCapacity: Math.ceil(provisionedCapacity.readCapacity / 2), // Menos capacidad para este índice
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
