import { Stack, StackProps, CfnOutput } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { DocumentBucket, DocumentTable, VersionTable } from '../constructs';
import { EnvironmentConfig } from '../../config';

/**
 * Props para el StorageStack
 */
export interface StorageStackProps extends StackProps {
  /** Configuración del ambiente */
  config: EnvironmentConfig;
}

/**
 * Stack que contiene todos los recursos de almacenamiento
 *
 * Incluye:
 * - Bucket S3 para archivos
 * - Tabla DynamoDB para metadatos de documentos
 * - Tabla DynamoDB para versiones de documentos
 * - Outputs con nombres de recursos
 */
export class StorageStack extends Stack {
  /** Bucket S3 para documentos */
  public readonly documentBucket: DocumentBucket;

  /** Tabla DynamoDB para metadatos de documentos */
  public readonly documentTable: DocumentTable;

  /** Tabla DynamoDB para versiones de documentos */
  public readonly versionTable: VersionTable;

  /** Acceso directo al bucket S3 */
  public get bucket() {
    return this.documentBucket.bucket;
  }

  /** Acceso directo a la tabla DynamoDB de documentos */
  public get table() {
    return this.documentTable.table;
  }

  /** Acceso directo a la tabla DynamoDB de versiones */
  public get versionsTable() {
    return this.versionTable.table;
  }

  constructor(scope: Construct, id: string, props: StorageStackProps) {
    super(scope, id, props);

    const { config } = props;

    // Crear bucket S3
    this.documentBucket = new DocumentBucket(this, 'DocumentBucket', {
      config,
    });

    // Crear tabla DynamoDB para documentos
    this.documentTable = new DocumentTable(this, 'DocumentTable', {
      config,
    });

    // Crear tabla DynamoDB para versiones
    this.versionTable = new VersionTable(this, 'VersionTable', {
      config,
    });

    // ========================================
    // Outputs - Exportar nombres de recursos
    // ========================================

    // Bucket S3
    new CfnOutput(this, 'BucketName', {
      value: this.documentBucket.bucket.bucketName,
      description: 'Nombre del bucket S3 para documentos',
      exportName: `${config.environmentName}-DocumentBucketName`,
    });

    new CfnOutput(this, 'BucketArn', {
      value: this.documentBucket.bucket.bucketArn,
      description: 'ARN del bucket S3',
      exportName: `${config.environmentName}-DocumentBucketArn`,
    });

    // Tabla DynamoDB
    new CfnOutput(this, 'TableName', {
      value: this.documentTable.table.tableName,
      description: 'Nombre de la tabla DynamoDB',
      exportName: `${config.environmentName}-DocumentTableName`,
    });

    new CfnOutput(this, 'TableArn', {
      value: this.documentTable.table.tableArn,
      description: 'ARN de la tabla DynamoDB',
      exportName: `${config.environmentName}-DocumentTableArn`,
    });

    // Stream ARN (si está habilitado)
    if (this.documentTable.table.tableStreamArn) {
      new CfnOutput(this, 'TableStreamArn', {
        value: this.documentTable.table.tableStreamArn,
        description: 'ARN del DynamoDB Stream',
        exportName: `${config.environmentName}-DocumentTableStreamArn`,
      });
    }

    // Tabla de Versiones DynamoDB
    new CfnOutput(this, 'VersionTableName', {
      value: this.versionTable.table.tableName,
      description: 'Nombre de la tabla DynamoDB de versiones',
      exportName: `${config.environmentName}-VersionTableName`,
    });

    new CfnOutput(this, 'VersionTableArn', {
      value: this.versionTable.table.tableArn,
      description: 'ARN de la tabla DynamoDB de versiones',
      exportName: `${config.environmentName}-VersionTableArn`,
    });

    // Stream ARN de versiones (si está habilitado)
    if (this.versionTable.table.tableStreamArn) {
      new CfnOutput(this, 'VersionTableStreamArn', {
        value: this.versionTable.table.tableStreamArn,
        description: 'ARN del DynamoDB Stream de versiones',
        exportName: `${config.environmentName}-VersionTableStreamArn`,
      });
    }

    // Resumen del ambiente
    new CfnOutput(this, 'Environment', {
      value: config.environmentName,
      description: 'Ambiente desplegado',
    });

    new CfnOutput(this, 'Region', {
      value: config.region,
      description: 'Región de AWS',
    });
  }
}
