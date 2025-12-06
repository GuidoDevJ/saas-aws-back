# 🏗️ Infraestructura Completa - SaaS Backend

Documentación completa de la infraestructura AWS CDK para el sistema de gestión de documentos.

---

## 📋 Tabla de Contenidos

- [Overview](#overview)
- [Arquitectura](#arquitectura)
- [Stacks](#stacks)
- [Recursos AWS](#recursos-aws)
- [Deployment](#deployment)
- [CI/CD](#cicd)
- [Monitoring](#monitoring)
- [Costos Estimados](#costos-estimados)

---

## Overview

La infraestructura está dividida en **4 stacks independientes** que se despliegan en orden:

1. **Storage Stack** - S3 + DynamoDB
2. **Lambda Stack** - 7 funciones Lambda
3. **API Stack** - API Gateway REST API
4. **Monitoring Stack** - CloudWatch dashboards y alarms

### Ambientes

- **Local** - LocalStack para desarrollo local
- **Dev** - AWS Development (auto-deploy desde `develop` branch)
- **Staging** - AWS Staging (auto-deploy desde `main` branch)
- **Prod** - AWS Production (manual deploy desde releases)

---

## Arquitectura

```
┌─────────────────────────────────────────────────────────────┐
│                      API Gateway REST API                    │
│                  (SaasBackend-Api-{env})                    │
└─────────────────────────┬───────────────────────────────────┘
                          │
         ┌────────────────┼────────────────┐
         │                │                │
         ▼                ▼                ▼
┌────────────────┐ ┌────────────────┐ ┌────────────────┐
│  Upload Lambda │ │  Get Lambda    │ │ Delete Lambda  │
│  (base64)      │ │  (by ID/User)  │ │                │
└────────┬───────┘ └────────┬───────┘ └────────┬───────┘
         │                  │                  │
         └──────────────────┼──────────────────┘
                            │
         ┌──────────────────┴──────────────────┐
         │                                     │
         ▼                                     ▼
┌─────────────────┐                   ┌─────────────────┐
│   S3 Bucket     │                   │  DynamoDB Table │
│  (documents)    │                   │   (metadata)    │
└─────────────────┘                   └─────────────────┘
         │                                     │
         └──────────────────┬──────────────────┘
                            │
                            ▼
                   ┌─────────────────┐
                   │   CloudWatch    │
                   │ Dashboards +    │
                   │     Alarms      │
                   └─────────────────┘
```

---

## Stacks

### 1. Storage Stack (`SaasBackend-Storage-{env}`)

**Recursos:**
- S3 Bucket con versionado, CORS, lifecycle rules
- DynamoDB Table con GSIs (UserIdIndex, S3KeyIndex)
- Políticas de auto-delete en bucket (solo local/dev)

**Outputs:**
- BucketName
- BucketArn
- TableName
- TableArn

**Configuración por ambiente:**
```typescript
// local
bucketName: 'documents-bucket-local'
versioned: false
encrypted: false

// dev
bucketName: 'documents-bucket-dev'
versioned: true
encrypted: true (S3-managed)

// staging/prod
bucketName: 'documents-bucket-{env}'
versioned: true
encrypted: true (KMS)
lifecycle: transition to IA after 90 days
```

### 2. Lambda Stack (`SaasBackend-Lambda-{env}`)

**7 Funciones Lambda:**

| Función | Descripción | Handler |
|---------|-------------|---------|
| `uploadDocument` | Upload con base64 (archivos pequeños) | `upload-document.handler` |
| `generateUploadUrl` | Generar presigned URL (archivos grandes) | `generate-upload-url.handler` |
| `confirmUpload` | Confirmar upload directo a S3 | `confirm-upload.handler` |
| `getDocument` | Obtener documento por ID | `get-document.handler` |
| `getDocumentsByUser` | Listar documentos por usuario | `get-documents-by-user.handler` |
| `deleteDocument` | Eliminar documento (S3 + DynamoDB) | `delete-document.handler` |
| `updateDocumentStatus` | Actualizar estado de procesamiento | `update-document-status.handler` |

**Configuración común:**
- Runtime: Node.js 18
- Timeout: 30 segundos
- Memory: 512 MB
- Tracing: X-Ray habilitado
- Permisos: S3 read/write, DynamoDB read/write

**Outputs:**
- Function ARNs y Names para cada Lambda

### 3. API Stack (`SaasBackend-Api-{env}`)

**Endpoints:**

```
POST   /documents                   - Upload documento (base64)
POST   /documents/upload-url        - Generar presigned URL
POST   /documents/confirm           - Confirmar upload
GET    /documents/{id}              - Obtener documento
GET    /documents/user/{userId}     - Listar por usuario
DELETE /documents/{id}              - Eliminar documento
PATCH  /documents/{id}/status       - Actualizar estado
```

**Features:**
- CORS habilitado
- Request validation (body + parameters)
- Throttling: 50 req/s, burst 100
- Quota: 10,000 requests/month
- CloudWatch logs habilitados
- X-Ray tracing habilitado

**Outputs:**
- ApiUrl
- ApiId
- ApiStage

### 4. Monitoring Stack (`SaasBackend-Monitoring-{env}`)

**CloudWatch Dashboard:**
- API Gateway: requests, latency, 4xx/5xx errors
- Lambda: invocations, errors, duration, throttles
- DynamoDB: capacity, throttles
- S3: bucket size, object count

**CloudWatch Alarms:**
- API 5XX errors > 10 en 5 minutos
- API latency > 3 segundos
- Lambda errors > 5 por función en 5 minutos
- Lambda throttles > 0
- DynamoDB read/write throttles > 0

**SNS Topic:**
- Notificaciones por email para alarms
- Configurar emails en `bin/app.ts`:
```typescript
alarmEmails: ['devops@example.com']
```

**Outputs:**
- DashboardUrl
- AlarmTopicArn

---

## Recursos AWS

### Resumen por Stack

| Stack | S3 | DynamoDB | Lambda | API GW | CloudWatch | SNS |
|-------|----|----|--------|--------|-----------|-----|
| Storage | 1 bucket | 1 table | - | - | - | - |
| Lambda | - | - | 7 functions | - | - | - |
| API | - | - | - | 1 API | - | - |
| Monitoring | - | - | - | - | 1 dashboard, ~15 alarms | 1 topic |

### Estimación de Costos (US-West-2)

**Desarrollo (Dev):**
- S3: ~$0.50/mes (10 GB, 1000 requests)
- DynamoDB: $0 (on-demand, < 25 GB)
- Lambda: $0 (< 1M requests)
- API Gateway: ~$3.50/mes (1M requests)
- CloudWatch: ~$5/mes (dashboards + alarms)
- **Total: ~$10/mes**

**Staging:**
- Similar a Dev
- **Total: ~$15/mes**

**Production (estimado 100K users):**
- S3: ~$50/mes (500 GB, 10M requests)
- DynamoDB: ~$25/mes (on-demand)
- Lambda: ~$40/mes (5M requests)
- API Gateway: ~$35/mes (10M requests)
- CloudWatch: ~$20/mes
- Data Transfer: ~$100/mes
- **Total: ~$270/mes**

---

## Deployment

### Local (LocalStack)

```bash
# 1. Levantar LocalStack
npm run localstack:up

# 2. Esperar a que esté listo
npm run localstack:health

# 3. Bootstrap (primera vez)
npm run cdk:bootstrap:local

# 4. Deploy todos los stacks
npm run cdk:deploy:local

# 5. Verificar
npm run cdk:list:local
```

### Dev (AWS)

```bash
# 1. Configurar AWS credentials
aws configure --profile dev

# 2. Bootstrap (primera vez por región)
npm run cdk:bootstrap:dev

# 3. Ver cambios
npm run cdk:diff

# 4. Deploy todos los stacks
npm run cdk:deploy:dev
```

### Staging

```bash
# Deploy con confirmación manual
npm run cdk:deploy:staging
```

### Production

```bash
# Deploy con confirmación manual
npm run cdk:deploy:prod
```

### Deploy Específico de un Stack

```bash
# Solo Storage Stack
cd infra
ENVIRONMENT=dev npx cdk deploy SaasBackend-Storage-dev

# Solo Lambda Stack
cd infra
ENVIRONMENT=dev npx cdk deploy SaasBackend-Lambda-dev

# Solo API Stack
cd infra
ENVIRONMENT=dev npx cdk deploy SaasBackend-Api-dev

# Solo Monitoring Stack
cd infra
ENVIRONMENT=dev npx cdk deploy SaasBackend-Monitoring-dev
```

---

## CI/CD

### GitHub Actions Workflows

**1. `.github/workflows/test-localstack.yml`**
- Trigger: Push/PR a `develop` o `main`
- Ejecuta tests de integración con LocalStack
- Despliega todos los stacks a LocalStack
- Verifica deployment

**2. `.github/workflows/deploy-dev.yml`**
- Trigger: Push a `develop` branch
- Deploy automático a AWS Dev
- No requiere confirmación

**3. `.github/workflows/deploy-staging.yml`**
- Trigger: Push a `main` branch
- Deploy automático a AWS Staging
- Requiere environment protection rules
- Ejecuta smoke tests

**4. `.github/workflows/deploy-prod.yml`**
- Trigger: Release published o workflow_dispatch
- Deploy manual a AWS Production
- Requiere confirmación "DEPLOY"
- Crea backup de DynamoDB antes del deploy
- Ejecuta smoke tests
- Verifica deployment

### Secrets Requeridos

En GitHub Settings > Secrets > Actions:

```
AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY
AWS_ACCOUNT_ID
```

### Environments

Configurar en GitHub Settings > Environments:

1. **dev** - Sin protection rules
2. **staging** - Requiere approval de 1 reviewer
3. **production** - Requiere approval de 2 reviewers

---

## Monitoring

### Dashboard URL

Después del deploy, obtener URL:

```bash
aws cloudformation describe-stacks \
  --stack-name SaasBackend-Monitoring-dev \
  --query 'Stacks[0].Outputs[?OutputKey==`DashboardUrl`].OutputValue' \
  --output text
```

O ir directamente:
```
https://console.aws.amazon.com/cloudwatch/home?region=us-west-2#dashboards:name={env}-documents-api
```

### Métricas Clave

**API Gateway:**
- Request count
- 4XX/5XX error rate
- Latency (avg, p99)

**Lambda:**
- Invocation count
- Error count
- Duration
- Throttles

**DynamoDB:**
- Consumed capacity
- Throttled requests

**S3:**
- Bucket size
- Object count

### Alarms

Todas las alarms envían notificaciones al SNS Topic configurado.

**Suscribirse a alarms:**

```bash
# Obtener ARN del topic
aws cloudformation describe-stacks \
  --stack-name SaasBackend-Monitoring-dev \
  --query 'Stacks[0].Outputs[?OutputKey==`AlarmTopicArn`].OutputValue' \
  --output text

# Suscribir email
aws sns subscribe \
  --topic-arn arn:aws:sns:us-west-2:ACCOUNT_ID:dev-document-api-alarms \
  --protocol email \
  --notification-endpoint your-email@example.com
```

---

## Troubleshooting

### Error: "Stack already exists"

```bash
# Destruir stack existente
npm run cdk:destroy:local

# Re-deploy
npm run cdk:deploy:local
```

### Error: "Unable to locate credentials"

```bash
# LocalStack
export AWS_ACCESS_KEY_ID=test
export AWS_SECRET_ACCESS_KEY=test

# AWS Real
aws configure --profile dev
```

### Error: "Docker not available" (LocalStack)

Asegurarse de que el Docker socket esté montado correctamente en docker-compose.yml:

```yaml
volumes:
  - "/var/run/docker.sock:/var/run/docker.sock"
```

### Error: "Lambda code asset not found"

```bash
# Compilar TypeScript primero
npm run build

# Luego deploy
npm run cdk:deploy:local
```

### Ver logs de CloudFormation

```bash
# LocalStack
aws --endpoint-url=http://localhost:4566 \
    cloudformation describe-stack-events \
    --stack-name SaasBackend-Storage-local

# AWS Real
aws cloudformation describe-stack-events \
    --stack-name SaasBackend-Storage-dev
```

---

## Siguientes Pasos

### Mejoras Pendientes

1. **Autenticación y Autorización**
   - [ ] Cognito User Pool
   - [ ] API Gateway Authorizers
   - [ ] JWT validation

2. **Performance**
   - [ ] CloudFront CDN para assets
   - [ ] Lambda@Edge para auth
   - [ ] DynamoDB DAX para caching

3. **Seguridad**
   - [ ] WAF rules en API Gateway
   - [ ] Secrets Manager para credentials
   - [ ] VPC para Lambdas (si es necesario)

4. **Observabilidad**
   - [ ] X-Ray service map
   - [ ] CloudWatch Insights queries
   - [ ] Custom metrics

5. **Backup y DR**
   - [ ] Automated DynamoDB backups
   - [ ] S3 Cross-Region Replication
   - [ ] Disaster Recovery plan

---

## Referencias

- [AWS CDK Documentation](https://docs.aws.amazon.com/cdk/)
- [LocalStack Documentation](https://docs.localstack.cloud/)
- [CDK Best Practices](https://docs.aws.amazon.com/cdk/latest/guide/best-practices.html)
- [Proyecto README](README.md)
- [CDK Quick Start](CDK_QUICKSTART.md)
- [CDK Examples](CDK_EXAMPLES.md)

---

**Última actualización:** 2025-11-24
