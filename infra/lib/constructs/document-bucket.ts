import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { RemovalPolicy, Duration } from 'aws-cdk-lib';
import { EnvironmentConfig } from '../../config';

/**
 * Props para el construct DocumentBucket
 */
export interface DocumentBucketProps {
  /** Configuración del ambiente */
  config: EnvironmentConfig;
}

/**
 * Construct que crea y configura el bucket S3 para almacenar documentos
 *
 * Características:
 * - CORS configurado para uploads directos
 * - Versionado opcional según ambiente
 * - Encriptación según ambiente
 * - Reglas de ciclo de vida para optimizar costos
 * - Políticas de acceso seguras
 */
export class DocumentBucket extends Construct {
  /** Bucket S3 creado */
  public readonly bucket: s3.Bucket;

  constructor(scope: Construct, id: string, props: DocumentBucketProps) {
    super(scope, id);

    const { config } = props;

    // Configurar reglas CORS
    const corsRules: s3.CorsRule[] = [
      {
        allowedHeaders: ['*'],
        allowedMethods: config.s3.cors.allowedMethods.map((method) =>
          this.mapHttpMethod(method)
        ),
        allowedOrigins: config.s3.cors.allowedOrigins,
        exposedHeaders: ['ETag'],
        maxAge: 3000,
      },
    ];

    // Configurar reglas de ciclo de vida si están definidas
    const lifecycleRules: s3.LifecycleRule[] = [];

    if (config.s3.lifecycleRules) {
      const { transitionToIADays, expirationDays } = config.s3.lifecycleRules;

      if (transitionToIADays) {
        lifecycleRules.push({
          id: 'transition-to-infrequent-access',
          enabled: true,
          transitions: [
            {
              storageClass: s3.StorageClass.INFREQUENT_ACCESS,
              transitionAfter: Duration.days(transitionToIADays),
            },
          ],
        });
      }

      if (expirationDays) {
        lifecycleRules.push({
          id: 'expire-old-documents',
          enabled: true,
          expiration: Duration.days(expirationDays),
        });
      }
    }

    // Reglas de ciclo de vida para versiones antiguas (si versionado está habilitado)
    if (config.s3.versioned) {
      // Mantener solo las últimas 10 versiones
      // Las versiones que excedan las 10 más recientes se eliminarán después de 1 día
      lifecycleRules.push({
        id: 'limit-version-count',
        enabled: true,
        noncurrentVersionExpiration: Duration.days(1), // Debe ser >= 1
        noncurrentVersionsToRetain: 10, // Mantener las últimas 10 versiones
      });

      // Mover versiones antiguas a Glacier después de 30 días
      lifecycleRules.push({
        id: 'archive-old-versions',
        enabled: true,
        noncurrentVersionTransitions: [
          {
            storageClass: s3.StorageClass.GLACIER,
            transitionAfter: Duration.days(30),
          },
        ],
      });
    }

    // Crear bucket
    this.bucket = new s3.Bucket(this, 'DocumentBucket', {
      bucketName: config.s3.bucketName,
      versioned: config.s3.versioned,

      // Encriptación
      encryption: config.s3.encrypted
        ? s3.BucketEncryption.S3_MANAGED
        : s3.BucketEncryption.UNENCRYPTED,

      // CORS
      cors: corsRules,

      // Ciclo de vida
      lifecycleRules: lifecycleRules.length > 0 ? lifecycleRules : undefined,

      // Bloquear acceso público
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,

      // Política de eliminación
      removalPolicy:
        config.environmentName === 'prod'
          ? RemovalPolicy.RETAIN
          : RemovalPolicy.DESTROY,

      // Auto-eliminar objetos al destruir (solo no-prod)
      autoDeleteObjects: config.environmentName !== 'prod',

      // Habilitar event notifications
      eventBridgeEnabled: true,
    });

    // Agregar tags
    Object.entries(config.tags).forEach(([key, value]) => {
      this.bucket.node.addMetadata(key, value);
    });
  }

  /**
   * Mapea string de método HTTP a enum de CDK
   */
  private mapHttpMethod(method: string): s3.HttpMethods {
    const methodMap: { [key: string]: s3.HttpMethods } = {
      GET: s3.HttpMethods.GET,
      PUT: s3.HttpMethods.PUT,
      POST: s3.HttpMethods.POST,
      DELETE: s3.HttpMethods.DELETE,
      HEAD: s3.HttpMethods.HEAD,
    };

    return methodMap[method.toUpperCase()] || s3.HttpMethods.GET;
  }
}
