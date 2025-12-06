import { Stack, StackProps, CfnOutput, Duration } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import { EnvironmentConfig } from '../../config/types';

/**
 * Props for API Stack
 */
export interface ApiStackProps extends StackProps {
  /**
   * Environment configuration
   */
  config: EnvironmentConfig;

  /**
   * Lambda functions from Lambda Stack
   */
  functions: {
    uploadDocument: lambda.IFunction;
    generateUploadUrl: lambda.IFunction;
    confirmUpload: lambda.IFunction;
    getDocument: lambda.IFunction;
    getDocumentsByUser: lambda.IFunction;
    deleteDocument: lambda.IFunction;
    updateDocumentStatus: lambda.IFunction;
    generateVersionUploadUrl: lambda.IFunction;
    confirmVersionUpload: lambda.IFunction;
    listVersions: lambda.IFunction;
    downloadVersion: lambda.IFunction;
  };

  /**
   * Cognito User Pool for authorization (optional)
   */
  userPool?: cognito.IUserPool;
}

/**
 * API Gateway Stack
 *
 * Creates REST API with the following endpoints:
 *
 * POST   /documents                                      - Upload document (base64)
 * POST   /documents/upload-url                           - Generate presigned upload URL
 * POST   /documents/confirm                              - Confirm direct S3 upload
 * GET    /documents/{id}                                 - Get document by ID
 * GET    /documents/user/{userId}                        - Get all documents by user
 * DELETE /documents/{id}                                 - Delete document
 * PATCH  /documents/{id}/status                          - Update document status
 * POST   /documents/{id}/versions/upload-url             - Generate version upload URL
 * POST   /documents/{id}/versions/confirm                - Confirm version upload
 * GET    /documents/{id}/versions                        - List all versions
 * GET    /documents/{id}/versions/{versionId}/download   - Download specific version
 *
 * Includes:
 * - CORS configuration
 * - Request validation
 * - API Gateway logs
 * - Throttling and quotas
 *
 * Depends on: Lambda Stack
 */
export class ApiStack extends Stack {
  /**
   * REST API Gateway
   */
  public readonly api: apigateway.RestApi;

  /**
   * API Gateway Stage ARN for WAF association
   */
  public readonly apiArn: string;

  constructor(scope: Construct, id: string, props: ApiStackProps) {
    super(scope, id, props);

    const { config, functions } = props;

    // Create REST API
    this.api = new apigateway.RestApi(this, 'DocumentsApi', {
      restApiName: `${config.environmentName}-documents-api`,
      description: `Document Management API - ${config.environmentName}`,
      deployOptions: {
        stageName: config.environmentName,
        tracingEnabled: true,
        dataTraceEnabled: false, // Deshabilitado temporalmente
        loggingLevel: apigateway.MethodLoggingLevel.OFF, // Deshabilitado hasta configurar CloudWatch role
        metricsEnabled: true,
        throttlingBurstLimit: 100,
        throttlingRateLimit: 50,
      },
      defaultCorsPreflightOptions: {
        allowOrigins: config.environmentName === 'prod'
          ? ['https://yourdomain.com'] // Replace with your production domain
          : apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: [
          'Content-Type',
          'X-Amz-Date',
          'Authorization',
          'X-Api-Key',
          'X-Amz-Security-Token',
        ],
        allowCredentials: true,
      },
      endpointConfiguration: {
        types: [apigateway.EndpointType.REGIONAL],
      },
    });

    // Request validators
    const bodyValidator = new apigateway.RequestValidator(this, 'BodyValidator', {
      restApi: this.api,
      requestValidatorName: 'body-validator',
      validateRequestBody: true,
      validateRequestParameters: false,
    });

    const paramsValidator = new apigateway.RequestValidator(this, 'ParamsValidator', {
      restApi: this.api,
      requestValidatorName: 'params-validator',
      validateRequestBody: false,
      validateRequestParameters: true,
    });

    const allValidator = new apigateway.RequestValidator(this, 'AllValidator', {
      restApi: this.api,
      requestValidatorName: 'all-validator',
      validateRequestBody: true,
      validateRequestParameters: true,
    });

    // ========================================
    // Cognito Authorizer
    // ========================================
    let cognitoAuthorizer: apigateway.CognitoUserPoolsAuthorizer | undefined;
    if (props.userPool) {
      cognitoAuthorizer = new apigateway.CognitoUserPoolsAuthorizer(
        this,
        'CognitoAuthorizer',
        {
          cognitoUserPools: [props.userPool],
          identitySource: apigateway.IdentitySource.header('Authorization'),
          resultsCacheTtl: Duration.seconds(300),
        }
      );
    }

    // Lambda integrations
    const uploadDocumentIntegration = new apigateway.LambdaIntegration(
      functions.uploadDocument,
      {
        proxy: true,
      }
    );

    const generateUploadUrlIntegration = new apigateway.LambdaIntegration(
      functions.generateUploadUrl,
      {
        proxy: true,
      }
    );

    const confirmUploadIntegration = new apigateway.LambdaIntegration(
      functions.confirmUpload,
      {
        proxy: true,
      }
    );

    const getDocumentIntegration = new apigateway.LambdaIntegration(
      functions.getDocument,
      {
        proxy: true,
      }
    );

    const getDocumentsByUserIntegration = new apigateway.LambdaIntegration(
      functions.getDocumentsByUser,
      {
        proxy: true,
      }
    );

    const deleteDocumentIntegration = new apigateway.LambdaIntegration(
      functions.deleteDocument,
      {
        proxy: true,
      }
    );

    const updateDocumentStatusIntegration = new apigateway.LambdaIntegration(
      functions.updateDocumentStatus,
      {
        proxy: true,
      }
    );

    // Version Management Integrations
    const generateVersionUploadUrlIntegration = new apigateway.LambdaIntegration(
      functions.generateVersionUploadUrl,
      {
        proxy: true,
      }
    );

    const confirmVersionUploadIntegration = new apigateway.LambdaIntegration(
      functions.confirmVersionUpload,
      {
        proxy: true,
      }
    );

    const listVersionsIntegration = new apigateway.LambdaIntegration(
      functions.listVersions,
      {
        proxy: true,
      }
    );

    const downloadVersionIntegration = new apigateway.LambdaIntegration(
      functions.downloadVersion,
      {
        proxy: true,
      }
    );

    // Create resources and methods
    const documents = this.api.root.addResource('documents');

    // POST /documents - Upload document (base64)
    documents.addMethod('POST', uploadDocumentIntegration, {
      requestValidator: bodyValidator,
      authorizer: cognitoAuthorizer,
      authorizationType: cognitoAuthorizer ? apigateway.AuthorizationType.COGNITO : undefined,
      methodResponses: [
        {
          statusCode: '201',
          responseModels: {
            'application/json': apigateway.Model.EMPTY_MODEL,
          },
        },
        {
          statusCode: '400',
          responseModels: {
            'application/json': apigateway.Model.ERROR_MODEL,
          },
        },
        {
          statusCode: '500',
          responseModels: {
            'application/json': apigateway.Model.ERROR_MODEL,
          },
        },
      ],
    });

    // POST /documents/upload-url - Generate presigned URL
    const uploadUrl = documents.addResource('upload-url');
    uploadUrl.addMethod('POST', generateUploadUrlIntegration, {
      requestValidator: bodyValidator,
      authorizer: cognitoAuthorizer,
      authorizationType: cognitoAuthorizer ? apigateway.AuthorizationType.COGNITO : undefined,
    });

    // POST /documents/confirm - Confirm upload
    const confirm = documents.addResource('confirm');
    confirm.addMethod('POST', confirmUploadIntegration, {
      requestValidator: bodyValidator,
      authorizer: cognitoAuthorizer,
      authorizationType: cognitoAuthorizer ? apigateway.AuthorizationType.COGNITO : undefined,
    });

    // GET /documents/{id} - Get document by ID
    const documentById = documents.addResource('{id}');
    documentById.addMethod('GET', getDocumentIntegration, {
      requestValidator: paramsValidator,
      authorizer: cognitoAuthorizer,
      authorizationType: cognitoAuthorizer ? apigateway.AuthorizationType.COGNITO : undefined,
      requestParameters: {
        'method.request.path.id': true,
        'method.request.querystring.includeDownloadUrl': false,
      },
    });

    // DELETE /documents/{id} - Delete document
    documentById.addMethod('DELETE', deleteDocumentIntegration, {
      requestValidator: paramsValidator,
      authorizer: cognitoAuthorizer,
      authorizationType: cognitoAuthorizer ? apigateway.AuthorizationType.COGNITO : undefined,
      requestParameters: {
        'method.request.path.id': true,
      },
    });

    // PATCH /documents/{id}/status - Update document status
    const status = documentById.addResource('status');
    status.addMethod('PATCH', updateDocumentStatusIntegration, {
      requestValidator: allValidator,
      authorizer: cognitoAuthorizer,
      authorizationType: cognitoAuthorizer ? apigateway.AuthorizationType.COGNITO : undefined,
      requestParameters: {
        'method.request.path.id': true,
      },
    });

    // ========================================
    // Version Management Endpoints
    // ========================================

    // /documents/{id}/versions - Base resource for versions
    const versions = documentById.addResource('versions');

    // POST /documents/{id}/versions/upload-url - Generate version upload URL
    const versionUploadUrl = versions.addResource('upload-url');
    versionUploadUrl.addMethod('POST', generateVersionUploadUrlIntegration, {
      requestValidator: allValidator,
      authorizer: cognitoAuthorizer,
      authorizationType: cognitoAuthorizer ? apigateway.AuthorizationType.COGNITO : undefined,
      requestParameters: {
        'method.request.path.id': true,
      },
    });

    // POST /documents/{id}/versions/confirm - Confirm version upload
    const versionConfirm = versions.addResource('confirm');
    versionConfirm.addMethod('POST', confirmVersionUploadIntegration, {
      requestValidator: allValidator,
      authorizer: cognitoAuthorizer,
      authorizationType: cognitoAuthorizer ? apigateway.AuthorizationType.COGNITO : undefined,
      requestParameters: {
        'method.request.path.id': true,
      },
    });

    // GET /documents/{id}/versions - List all versions
    versions.addMethod('GET', listVersionsIntegration, {
      requestValidator: paramsValidator,
      authorizer: cognitoAuthorizer,
      authorizationType: cognitoAuthorizer ? apigateway.AuthorizationType.COGNITO : undefined,
      requestParameters: {
        'method.request.path.id': true,
      },
    });

    // /documents/{id}/versions/{versionId} - Specific version resource
    const versionById = versions.addResource('{versionId}');

    // GET /documents/{id}/versions/{versionId}/download - Download specific version
    const versionDownload = versionById.addResource('download');
    versionDownload.addMethod('GET', downloadVersionIntegration, {
      requestValidator: paramsValidator,
      authorizer: cognitoAuthorizer,
      authorizationType: cognitoAuthorizer ? apigateway.AuthorizationType.COGNITO : undefined,
      requestParameters: {
        'method.request.path.id': true,
        'method.request.path.versionId': true,
        'method.request.querystring.expiresIn': false,
      },
    });

    // GET /documents/user/{userId} - Get documents by user
    const user = documents.addResource('user');
    const userDocuments = user.addResource('{userId}');
    userDocuments.addMethod('GET', getDocumentsByUserIntegration, {
      requestValidator: paramsValidator,
      authorizer: cognitoAuthorizer,
      authorizationType: cognitoAuthorizer ? apigateway.AuthorizationType.COGNITO : undefined,
      requestParameters: {
        'method.request.path.userId': true,
      },
    });

    // Usage Plan (for API Keys if needed in the future)
    const plan = this.api.addUsagePlan('DocumentsUsagePlan', {
      name: `${config.environmentName}-documents-usage-plan`,
      throttle: {
        rateLimit: 50,
        burstLimit: 100,
      },
      quota: {
        limit: 10000,
        period: apigateway.Period.MONTH,
      },
    });

    plan.addApiStage({
      stage: this.api.deploymentStage,
    });

    // Construct API ARN for WAF association
    // Format: arn:aws:apigateway:region::/restapis/api-id/stages/stage-name
    this.apiArn = `arn:aws:apigateway:${this.region}::/restapis/${this.api.restApiId}/stages/${this.api.deploymentStage.stageName}`;

    // CloudFormation Outputs
    new CfnOutput(this, 'ApiUrl', {
      value: this.api.url,
      description: 'API Gateway URL',
      exportName: `${config.environmentName}-ApiUrl`,
    });

    new CfnOutput(this, 'ApiId', {
      value: this.api.restApiId,
      description: 'API Gateway ID',
      exportName: `${config.environmentName}-ApiId`,
    });

    new CfnOutput(this, 'ApiStage', {
      value: this.api.deploymentStage.stageName,
      description: 'API Gateway Stage',
      exportName: `${config.environmentName}-ApiStage`,
    });

    // Endpoint examples
    new CfnOutput(this, 'UploadDocumentEndpoint', {
      value: `${this.api.url}documents`,
      description: 'POST endpoint for uploading documents',
    });

    new CfnOutput(this, 'GenerateUploadUrlEndpoint', {
      value: `${this.api.url}documents/upload-url`,
      description: 'POST endpoint for generating presigned upload URLs',
    });

    new CfnOutput(this, 'GetDocumentEndpoint', {
      value: `${this.api.url}documents/{id}`,
      description: 'GET endpoint for retrieving documents',
    });

    new CfnOutput(this, 'GetDocumentsByUserEndpoint', {
      value: `${this.api.url}documents/user/{userId}`,
      description: 'GET endpoint for retrieving user documents',
    });

    // Version Management Endpoints
    new CfnOutput(this, 'GenerateVersionUploadUrlEndpoint', {
      value: `${this.api.url}documents/{id}/versions/upload-url`,
      description: 'POST endpoint for generating version upload URLs',
    });

    new CfnOutput(this, 'ConfirmVersionUploadEndpoint', {
      value: `${this.api.url}documents/{id}/versions/confirm`,
      description: 'POST endpoint for confirming version uploads',
    });

    new CfnOutput(this, 'ListVersionsEndpoint', {
      value: `${this.api.url}documents/{id}/versions`,
      description: 'GET endpoint for listing document versions',
    });

    new CfnOutput(this, 'DownloadVersionEndpoint', {
      value: `${this.api.url}documents/{id}/versions/{versionId}/download`,
      description: 'GET endpoint for downloading specific version',
    });
  }
}
