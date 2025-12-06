import { Stack, StackProps, CfnOutput } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { DocumentLambdas } from '../constructs/document-lambdas';
import { EnvironmentConfig } from '../../config/types';

/**
 * Props for Lambda Stack
 */
export interface LambdaStackProps extends StackProps {
  /**
   * Environment configuration
   */
  config: EnvironmentConfig;

  /**
   * S3 bucket ARN from Storage Stack
   */
  bucketArn: string;

  /**
   * S3 bucket name from Storage Stack
   */
  bucketName: string;

  /**
   * DynamoDB table ARN from Storage Stack
   */
  tableArn: string;

  /**
   * DynamoDB table name from Storage Stack
   */
  tableName: string;

  /**
   * DynamoDB versions table ARN from Storage Stack
   */
  versionsTableArn: string;

  /**
   * DynamoDB versions table name from Storage Stack
   */
  versionsTableName: string;
}

/**
 * Lambda Stack
 *
 * Creates all Lambda functions for document management:
 * - Upload document (base64)
 * - Generate upload URL (presigned)
 * - Confirm upload
 * - Get document
 * - Get documents by user
 * - Delete document
 * - Update document status
 * - Generate version upload URL
 * - Confirm version upload
 * - List versions
 * - Download version
 *
 * Depends on: Storage Stack (S3 bucket and DynamoDB table)
 */
export class LambdaStack extends Stack {
  /**
   * Document Lambda functions construct
   */
  public readonly lambdas: DocumentLambdas;

  constructor(scope: Construct, id: string, props: LambdaStackProps) {
    super(scope, id, props);

    const { config, bucketArn, bucketName, tableArn, tableName, versionsTableArn, versionsTableName } = props;

    // Import existing resources from Storage Stack
    const bucket = s3.Bucket.fromBucketAttributes(this, 'ImportedBucket', {
      bucketArn,
      bucketName,
    });

    const table = dynamodb.Table.fromTableName(this, 'ImportedTable', tableName);

    const versionsTable = dynamodb.Table.fromTableName(this, 'ImportedVersionsTable', versionsTableName);

    // Create all Lambda functions
    this.lambdas = new DocumentLambdas(this, 'DocumentLambdas', {
      config,
      bucket,
      table,
      versionsTable,
    });

    // CloudFormation Outputs
    new CfnOutput(this, 'UploadDocumentFunctionName', {
      value: this.lambdas.uploadDocument.functionName,
      description: 'Upload Document Lambda Function Name',
      exportName: `${config.environmentName}-UploadDocumentFunctionName`,
    });

    new CfnOutput(this, 'UploadDocumentFunctionArn', {
      value: this.lambdas.uploadDocument.functionArn,
      description: 'Upload Document Lambda Function ARN',
      exportName: `${config.environmentName}-UploadDocumentFunctionArn`,
    });

    new CfnOutput(this, 'GenerateUploadUrlFunctionName', {
      value: this.lambdas.generateUploadUrl.functionName,
      description: 'Generate Upload URL Lambda Function Name',
      exportName: `${config.environmentName}-GenerateUploadUrlFunctionName`,
    });

    new CfnOutput(this, 'GenerateUploadUrlFunctionArn', {
      value: this.lambdas.generateUploadUrl.functionArn,
      description: 'Generate Upload URL Lambda Function ARN',
      exportName: `${config.environmentName}-GenerateUploadUrlFunctionArn`,
    });

    new CfnOutput(this, 'ConfirmUploadFunctionName', {
      value: this.lambdas.confirmUpload.functionName,
      description: 'Confirm Upload Lambda Function Name',
      exportName: `${config.environmentName}-ConfirmUploadFunctionName`,
    });

    new CfnOutput(this, 'ConfirmUploadFunctionArn', {
      value: this.lambdas.confirmUpload.functionArn,
      description: 'Confirm Upload Lambda Function ARN',
      exportName: `${config.environmentName}-ConfirmUploadFunctionArn`,
    });

    new CfnOutput(this, 'GetDocumentFunctionName', {
      value: this.lambdas.getDocument.functionName,
      description: 'Get Document Lambda Function Name',
      exportName: `${config.environmentName}-GetDocumentFunctionName`,
    });

    new CfnOutput(this, 'GetDocumentFunctionArn', {
      value: this.lambdas.getDocument.functionArn,
      description: 'Get Document Lambda Function ARN',
      exportName: `${config.environmentName}-GetDocumentFunctionArn`,
    });

    new CfnOutput(this, 'GetDocumentsByUserFunctionName', {
      value: this.lambdas.getDocumentsByUser.functionName,
      description: 'Get Documents By User Lambda Function Name',
      exportName: `${config.environmentName}-GetDocumentsByUserFunctionName`,
    });

    new CfnOutput(this, 'GetDocumentsByUserFunctionArn', {
      value: this.lambdas.getDocumentsByUser.functionArn,
      description: 'Get Documents By User Lambda Function ARN',
      exportName: `${config.environmentName}-GetDocumentsByUserFunctionArn`,
    });

    new CfnOutput(this, 'DeleteDocumentFunctionName', {
      value: this.lambdas.deleteDocument.functionName,
      description: 'Delete Document Lambda Function Name',
      exportName: `${config.environmentName}-DeleteDocumentFunctionName`,
    });

    new CfnOutput(this, 'DeleteDocumentFunctionArn', {
      value: this.lambdas.deleteDocument.functionArn,
      description: 'Delete Document Lambda Function ARN',
      exportName: `${config.environmentName}-DeleteDocumentFunctionArn`,
    });

    new CfnOutput(this, 'UpdateDocumentStatusFunctionName', {
      value: this.lambdas.updateDocumentStatus.functionName,
      description: 'Update Document Status Lambda Function Name',
      exportName: `${config.environmentName}-UpdateDocumentStatusFunctionName`,
    });

    new CfnOutput(this, 'UpdateDocumentStatusFunctionArn', {
      value: this.lambdas.updateDocumentStatus.functionArn,
      description: 'Update Document Status Lambda Function ARN',
      exportName: `${config.environmentName}-UpdateDocumentStatusFunctionArn`,
    });

    // Version Management Outputs
    new CfnOutput(this, 'GenerateVersionUploadUrlFunctionName', {
      value: this.lambdas.generateVersionUploadUrl.functionName,
      description: 'Generate Version Upload URL Lambda Function Name',
      exportName: `${config.environmentName}-GenerateVersionUploadUrlFunctionName`,
    });

    new CfnOutput(this, 'GenerateVersionUploadUrlFunctionArn', {
      value: this.lambdas.generateVersionUploadUrl.functionArn,
      description: 'Generate Version Upload URL Lambda Function ARN',
      exportName: `${config.environmentName}-GenerateVersionUploadUrlFunctionArn`,
    });

    new CfnOutput(this, 'ConfirmVersionUploadFunctionName', {
      value: this.lambdas.confirmVersionUpload.functionName,
      description: 'Confirm Version Upload Lambda Function Name',
      exportName: `${config.environmentName}-ConfirmVersionUploadFunctionName`,
    });

    new CfnOutput(this, 'ConfirmVersionUploadFunctionArn', {
      value: this.lambdas.confirmVersionUpload.functionArn,
      description: 'Confirm Version Upload Lambda Function ARN',
      exportName: `${config.environmentName}-ConfirmVersionUploadFunctionArn`,
    });

    new CfnOutput(this, 'ListVersionsFunctionName', {
      value: this.lambdas.listVersions.functionName,
      description: 'List Versions Lambda Function Name',
      exportName: `${config.environmentName}-ListVersionsFunctionName`,
    });

    new CfnOutput(this, 'ListVersionsFunctionArn', {
      value: this.lambdas.listVersions.functionArn,
      description: 'List Versions Lambda Function ARN',
      exportName: `${config.environmentName}-ListVersionsFunctionArn`,
    });

    new CfnOutput(this, 'DownloadVersionFunctionName', {
      value: this.lambdas.downloadVersion.functionName,
      description: 'Download Version Lambda Function Name',
      exportName: `${config.environmentName}-DownloadVersionFunctionName`,
    });

    new CfnOutput(this, 'DownloadVersionFunctionArn', {
      value: this.lambdas.downloadVersion.functionArn,
      description: 'Download Version Lambda Function ARN',
      exportName: `${config.environmentName}-DownloadVersionFunctionArn`,
    });
  }
}
