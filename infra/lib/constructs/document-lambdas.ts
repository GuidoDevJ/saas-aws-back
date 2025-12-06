import { Duration } from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';
import * as path from 'path';
import { EnvironmentConfig } from '../../config/types';

/**
 * Props for DocumentLambdas construct
 */
export interface DocumentLambdasProps {
  /**
   * Environment configuration
   */
  config: EnvironmentConfig;

  /**
   * S3 bucket for document storage
   */
  bucket: s3.IBucket;

  /**
   * DynamoDB table for document metadata
   */
  table: dynamodb.ITable;

  /**
   * DynamoDB table for document versions (optional)
   */
  versionsTable?: dynamodb.ITable;
}

/**
 * Construct for creating all document-related Lambda functions
 *
 * Creates 11 Lambda functions for document management:
 * - uploadDocument: Upload document with base64 encoding
 * - generateUploadUrl: Generate presigned URL for large files
 * - confirmUpload: Confirm direct S3 upload
 * - getDocument: Get document by ID with optional download URL
 * - getDocumentsByUser: List all documents for a user
 * - deleteDocument: Delete document from S3 and DynamoDB
 * - updateDocumentStatus: Update document processing status
 * - generateVersionUploadUrl: Generate presigned URL for new version
 * - confirmVersionUpload: Confirm version upload
 * - listVersions: List all versions of a document
 * - downloadVersion: Generate download URL for specific version
 */
export class DocumentLambdas extends Construct {
  /**
   * Lambda function for uploading documents with base64 encoding
   */
  public readonly uploadDocument: lambda.Function;

  /**
   * Lambda function for generating presigned upload URLs
   */
  public readonly generateUploadUrl: lambda.Function;

  /**
   * Lambda function for confirming direct S3 uploads
   */
  public readonly confirmUpload: lambda.Function;

  /**
   * Lambda function for getting document by ID
   */
  public readonly getDocument: lambda.Function;

  /**
   * Lambda function for getting all documents by user
   */
  public readonly getDocumentsByUser: lambda.Function;

  /**
   * Lambda function for deleting documents
   */
  public readonly deleteDocument: lambda.Function;

  /**
   * Lambda function for updating document status
   */
  public readonly updateDocumentStatus: lambda.Function;

  /**
   * Lambda function for generating version upload URL
   */
  public readonly generateVersionUploadUrl: lambda.Function;

  /**
   * Lambda function for confirming version upload
   */
  public readonly confirmVersionUpload: lambda.Function;

  /**
   * Lambda function for listing all versions
   */
  public readonly listVersions: lambda.Function;

  /**
   * Lambda function for downloading specific version
   */
  public readonly downloadVersion: lambda.Function;

  constructor(scope: Construct, id: string, props: DocumentLambdasProps) {
    super(scope, id);

    const { config, bucket, table, versionsTable } = props;

    // Common Lambda configuration
    const commonEnv = {
      S3_BUCKET_NAME: bucket.bucketName,
      DYNAMODB_TABLE_NAME: table.tableName,
      DYNAMODB_VERSIONS_TABLE_NAME: versionsTable?.tableName || `${table.tableName}-Versions`,
      ENVIRONMENT: config.environmentName,
    };

    const runtime = lambda.Runtime.NODEJS_22_X;
    const timeout = Duration.seconds(30);
    const memorySize = 512;
    const tracing = lambda.Tracing.ACTIVE;
    // Path from this file (infra/lib/constructs/document-lambdas.ts) to project root
    // Includes dist/ and node_modules/
    const code = lambda.Code.fromAsset(path.join(__dirname, '../../..'), {
      exclude: [
        'infra',
        'src',
        '.git',
        '.env*',
        'cdk.out',
        '*.md',
        'scripts',
        'test',
        '.claude',
        'node_modules/@aws-cdk*',
        'node_modules/aws-cdk*',
        'node_modules/constructs',
        'node_modules/typescript',
        'node_modules/@types',
      ],
    });

    // Upload Document (base64)
    this.uploadDocument = new lambda.Function(this, 'UploadDocument', {
      runtime,
      timeout,
      memorySize,
      environment: commonEnv,
      tracing,
      functionName: `${config.environmentName}-upload-document`,
      description: 'Upload document with base64 encoding (for small files)',
      code,
      handler: 'dist/handlers/upload-document.handler',
    });

    // Generate Upload URL (presigned)
    this.generateUploadUrl = new lambda.Function(this, 'GenerateUploadUrl', {
      runtime,
      timeout,
      memorySize,
      environment: commonEnv,
      tracing,
      functionName: `${config.environmentName}-generate-upload-url`,
      description:
        'Generate presigned URL for direct S3 upload (for large files)',
      code,
      handler: 'dist/handlers/generate-upload-url.handler',
    });

    // Confirm Upload
    this.confirmUpload = new lambda.Function(this, 'ConfirmUpload', {
      runtime,
      timeout,
      memorySize,
      environment: commonEnv,
      tracing,
      functionName: `${config.environmentName}-confirm-upload`,
      description: 'Confirm direct S3 upload and register in DynamoDB',
      code,
      handler: 'dist/handlers/confirm-upload.handler',
    });

    // Get Document
    this.getDocument = new lambda.Function(this, 'GetDocument', {
      runtime,
      timeout,
      memorySize,
      environment: commonEnv,
      tracing,
      functionName: `${config.environmentName}-get-document`,
      description: 'Get document by ID with optional download URL',
      code,
      handler: 'dist/handlers/get-document.handler',
    });

    // Get Documents By User
    this.getDocumentsByUser = new lambda.Function(this, 'GetDocumentsByUser', {
      runtime,
      timeout,
      memorySize,
      environment: commonEnv,
      tracing,
      functionName: `${config.environmentName}-get-documents-by-user`,
      description: 'List all documents for a specific user',
      code,
      handler: 'dist/handlers/get-documents-by-user.handler',
    });

    // Delete Document
    this.deleteDocument = new lambda.Function(this, 'DeleteDocument', {
      runtime,
      timeout,
      memorySize,
      environment: commonEnv,
      tracing,
      functionName: `${config.environmentName}-delete-document`,
      description: 'Delete document from both S3 and DynamoDB',
      code,
      handler: 'dist/handlers/delete-document.handler',
    });

    // Update Document Status
    this.updateDocumentStatus = new lambda.Function(
      this,
      'UpdateDocumentStatus',
      {
        runtime,
        timeout,
        memorySize,
        environment: commonEnv,
        tracing,
        functionName: `${config.environmentName}-update-document-status`,
        description: 'Update document processing status',
        code,
        handler: 'dist/handlers/update-document-status.handler',
      }
    );

    // ========================================
    // Version Management Lambdas
    // ========================================

    // Generate Version Upload URL
    this.generateVersionUploadUrl = new lambda.Function(
      this,
      'GenerateVersionUploadUrl',
      {
        runtime,
        timeout,
        memorySize,
        environment: commonEnv,
        tracing,
        functionName: `${config.environmentName}-generate-version-upload-url`,
        description: 'Generate presigned URL for uploading a new document version',
        code,
        handler: 'dist/handlers/versions/generate-version-upload-url.handler',
      }
    );

    // Confirm Version Upload
    this.confirmVersionUpload = new lambda.Function(
      this,
      'ConfirmVersionUpload',
      {
        runtime,
        timeout,
        memorySize,
        environment: commonEnv,
        tracing,
        functionName: `${config.environmentName}-confirm-version-upload`,
        description: 'Confirm version upload and register in DynamoDB',
        code,
        handler: 'dist/handlers/versions/confirm-version-upload.handler',
      }
    );

    // List Versions
    this.listVersions = new lambda.Function(this, 'ListVersions', {
      runtime,
      timeout,
      memorySize,
      environment: commonEnv,
      tracing,
      functionName: `${config.environmentName}-list-versions`,
      description: 'List all versions of a document',
      code,
      handler: 'dist/handlers/versions/list-versions.handler',
    });

    // Download Version
    this.downloadVersion = new lambda.Function(this, 'DownloadVersion', {
      runtime,
      timeout,
      memorySize,
      environment: commonEnv,
      tracing,
      functionName: `${config.environmentName}-download-version`,
      description: 'Generate download URL for a specific document version',
      code,
      handler: 'dist/handlers/versions/download-version.handler',
    });

    // Grant permissions to all functions
    this.grantPermissions(bucket, table, versionsTable);

    // Add tags to all functions
    this.addTags(config);
  }

  /**
   * Grant necessary permissions to all Lambda functions
   */
  private grantPermissions(
    bucket: s3.IBucket,
    table: dynamodb.ITable,
    versionsTable?: dynamodb.ITable
  ): void {
    const functions = [
      this.uploadDocument,
      this.generateUploadUrl,
      this.confirmUpload,
      this.getDocument,
      this.getDocumentsByUser,
      this.deleteDocument,
      this.updateDocumentStatus,
      this.generateVersionUploadUrl,
      this.confirmVersionUpload,
      this.listVersions,
      this.downloadVersion,
    ];

    functions.forEach((fn) => {
      // Grant DynamoDB permissions (table and indexes)
      table.grantReadWriteData(fn);

      // Grant additional DynamoDB permissions for queries on GSI indexes
      fn.addToRolePolicy(
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: [
            'dynamodb:Query',
            'dynamodb:Scan',
          ],
          resources: [
            table.tableArn,
            `${table.tableArn}/index/*`, // All indexes
          ],
        })
      );

      // Grant permissions to versions table (if provided)
      if (versionsTable) {
        versionsTable.grantReadWriteData(fn);

        // Grant additional DynamoDB permissions for versions table
        fn.addToRolePolicy(
          new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: [
              'dynamodb:Query',
              'dynamodb:Scan',
            ],
            resources: [
              versionsTable.tableArn,
              `${versionsTable.tableArn}/index/*`, // All indexes
            ],
          })
        );
      }

      // Grant S3 permissions
      bucket.grantReadWrite(fn);
      bucket.grantPut(fn);
      bucket.grantDelete(fn);

      // Grant additional S3 permissions for presigned URLs and versioning
      fn.addToRolePolicy(
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: [
            's3:PutObject',
            's3:GetObject',
            's3:GetObjectVersion',
            's3:ListBucketVersions',
          ],
          resources: [`${bucket.bucketArn}/*`, bucket.bucketArn],
        })
      );
    });
  }

  /**
   * Add common tags to all Lambda functions
   */
  private addTags(config: EnvironmentConfig): void {
    const functions = [
      this.uploadDocument,
      this.generateUploadUrl,
      this.confirmUpload,
      this.getDocument,
      this.getDocumentsByUser,
      this.deleteDocument,
      this.updateDocumentStatus,
      this.generateVersionUploadUrl,
      this.confirmVersionUpload,
      this.listVersions,
      this.downloadVersion,
    ];

    functions.forEach((fn) => {
      if (config.tags) {
        Object.entries(config.tags).forEach(([key, value]) => {
          fn.node.addMetadata(key, value);
        });
      }
    });
  }
}
