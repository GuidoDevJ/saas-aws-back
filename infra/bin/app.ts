#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { StorageStack } from '../lib/stacks/storage-stack';
import { LambdaStack } from '../lib/stacks/lambda-stack';
import { AuthStack } from '../lib/stacks/auth-stack';
import { ApiStack } from '../lib/stacks/api-stack';
import { MonitoringStack } from '../lib/stacks/monitoring-stack';
import { WafStack } from '../lib/stacks/waf-stack';
import { getConfig, getCurrentEnvironment, LocalStackConfig } from '../config';

/**
 * Entry point de la aplicación CDK
 *
 * Crea y despliega todos los stacks según el ambiente configurado:
 * 1. Storage Stack - S3 bucket y DynamoDB table
 * 2. Lambda Stack - Lambda functions para document management
 * 3. Auth Stack - Cognito User Pool y autorización
 * 4. API Stack - API Gateway REST API con autorización Cognito
 * 5. WAF Stack - Web Application Firewall para protección del API
 * 6. Monitoring Stack - CloudWatch dashboards y alarms
 */

// Obtener ambiente desde variable de entorno o usar 'local' por defecto
const environment = getCurrentEnvironment();
console.log(`🚀 Desplegando infraestructura para ambiente: ${environment}`);

// Cargar configuración del ambiente
const config = getConfig(environment);
console.log(`📦 Configuración cargada para: ${config.environmentName}`);

// Crear la aplicación CDK
const app = new cdk.App();

// Configurar props del stack según el ambiente
const stackProps: cdk.StackProps = {
  env: {
    region: config.region,
    // Para LocalStack, no especificar account
    // Para AWS real, especificar account desde env o config
    ...(environment !== 'local' && {
      account: process.env.CDK_DEFAULT_ACCOUNT,
    }),
  },

  // Tags comunes para todos los recursos
  tags: config.tags,
};

// Si es LocalStack, configurar synthesizer custom
if (environment === 'local') {
  const localConfig = config as LocalStackConfig;
  console.log(`🔧 Configurando para LocalStack: ${localConfig.endpoint}`);
}

// ========================================
// 1. Storage Stack - S3 + DynamoDB
// ========================================
const storageStack = new StorageStack(
  app,
  `SaasBackend-Storage-${config.environmentName}`,
  {
    ...stackProps,
    description: `Storage infrastructure for ${config.environmentName} environment`,
    config,
  }
);

cdk.Tags.of(storageStack).add('Stack', 'Storage');
cdk.Tags.of(storageStack).add('Application', 'SaaS-Backend');

console.log(`✅ Storage Stack '${storageStack.stackName}' sintetizado`);

// ========================================
// 2. Lambda Stack - Lambda Functions
// ========================================
const lambdaStack = new LambdaStack(
  app,
  `SaasBackend-Lambda-${config.environmentName}`,
  {
    ...stackProps,
    description: `Lambda functions for ${config.environmentName} environment`,
    config,
    bucketArn: storageStack.bucket.bucketArn,
    bucketName: storageStack.bucket.bucketName,
    tableArn: storageStack.table.tableArn,
    tableName: storageStack.table.tableName,
    versionsTableArn: storageStack.versionsTable.tableArn,
    versionsTableName: storageStack.versionsTable.tableName,
  }
);

// Lambda stack depends on Storage stack
lambdaStack.addDependency(storageStack);

cdk.Tags.of(lambdaStack).add('Stack', 'Lambda');
cdk.Tags.of(lambdaStack).add('Application', 'SaaS-Backend');

console.log(`✅ Lambda Stack '${lambdaStack.stackName}' sintetizado`);

// ========================================
// 3. Auth Stack - Amazon Cognito
// ========================================
const authStack = new AuthStack(
  app,
  `SaasBackend-Auth-${config.environmentName}`,
  {
    ...stackProps,
    description: `Authentication with Cognito for ${config.environmentName} environment`,
    config,
  }
);

// Auth stack depends on Lambda stack
authStack.addDependency(lambdaStack);

cdk.Tags.of(authStack).add('Stack', 'Auth');
cdk.Tags.of(authStack).add('Application', 'SaaS-Backend');

console.log(`✅ Auth Stack '${authStack.stackName}' sintetizado`);

// ========================================
// 4. API Stack - API Gateway
// ========================================
const apiStack = new ApiStack(
  app,
  `SaasBackend-Api-${config.environmentName}`,
  {
    ...stackProps,
    description: `API Gateway for ${config.environmentName} environment`,
    config,
    userPool: authStack.userPool,
    functions: {
      uploadDocument: lambdaStack.lambdas.uploadDocument,
      generateUploadUrl: lambdaStack.lambdas.generateUploadUrl,
      confirmUpload: lambdaStack.lambdas.confirmUpload,
      getDocument: lambdaStack.lambdas.getDocument,
      getDocumentsByUser: lambdaStack.lambdas.getDocumentsByUser,
      deleteDocument: lambdaStack.lambdas.deleteDocument,
      updateDocumentStatus: lambdaStack.lambdas.updateDocumentStatus,
      generateVersionUploadUrl: lambdaStack.lambdas.generateVersionUploadUrl,
      confirmVersionUpload: lambdaStack.lambdas.confirmVersionUpload,
      listVersions: lambdaStack.lambdas.listVersions,
      downloadVersion: lambdaStack.lambdas.downloadVersion,
    },
  }
);

// API stack depends on Auth stack
apiStack.addDependency(authStack);

cdk.Tags.of(apiStack).add('Stack', 'API');
cdk.Tags.of(apiStack).add('Application', 'SaaS-Backend');

console.log(`✅ API Stack '${apiStack.stackName}' sintetizado`);

// ========================================
// 5. WAF Stack - Web Application Firewall
// ========================================
const wafStack = new WafStack(
  app,
  `SaasBackend-Waf-${config.environmentName}`,
  {
    ...stackProps,
    description: `WAF protection for ${config.environmentName} environment`,
    config,
    apiGatewayArn: apiStack.apiArn,
  }
);

// WAF stack depends on API stack
wafStack.addDependency(apiStack);

cdk.Tags.of(wafStack).add('Stack', 'WAF');
cdk.Tags.of(wafStack).add('Application', 'SaaS-Backend');

console.log(`✅ WAF Stack '${wafStack.stackName}' sintetizado`);

// ========================================
// 6. Monitoring Stack - CloudWatch
// ========================================
const monitoringStack = new MonitoringStack(
  app,
  `SaasBackend-Monitoring-${config.environmentName}`,
  {
    ...stackProps,
    description: `Monitoring and alarms for ${config.environmentName} environment`,
    config,
    api: apiStack.api,
    functions: {
      uploadDocument: lambdaStack.lambdas.uploadDocument,
      generateUploadUrl: lambdaStack.lambdas.generateUploadUrl,
      confirmUpload: lambdaStack.lambdas.confirmUpload,
      getDocument: lambdaStack.lambdas.getDocument,
      getDocumentsByUser: lambdaStack.lambdas.getDocumentsByUser,
      deleteDocument: lambdaStack.lambdas.deleteDocument,
      updateDocumentStatus: lambdaStack.lambdas.updateDocumentStatus,
    },
    bucketName: storageStack.bucket.bucketName,
    tableName: storageStack.table.tableName,
    // Add alarm emails for non-local environments
    alarmEmails:
      environment !== 'local'
        ? [
            // Add your email addresses here
            // 'devops@example.com',
          ]
        : undefined,
  }
);

// Monitoring stack depends on WAF stack
monitoringStack.addDependency(wafStack);

cdk.Tags.of(monitoringStack).add('Stack', 'Monitoring');
cdk.Tags.of(monitoringStack).add('Application', 'SaaS-Backend');

console.log(`✅ Monitoring Stack '${monitoringStack.stackName}' sintetizado`);

// ========================================
// Sintetizar la aplicación
// ========================================
app.synth();

console.log(`\n🎉 Todos los stacks sintetizados exitosamente:`);
console.log(`   1. ${storageStack.stackName}`);
console.log(`   2. ${lambdaStack.stackName}`);
console.log(`   3. ${authStack.stackName}`);
console.log(`   4. ${apiStack.stackName}`);
console.log(`   5. ${wafStack.stackName}`);
console.log(`   6. ${monitoringStack.stackName}`);
