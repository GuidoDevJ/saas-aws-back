# SaaS Backend - Sistema de Gestión de Documentos

Sistema backend serverless completo para gestión de documentos con versionado, construido con TypeScript, AWS CDK y servicios AWS nativos (S3, DynamoDB, Lambda, API Gateway, Cognito).

## Tabla de Contenidos

- [Características Principales](#características-principales)
- [Stack Tecnológico](#stack-tecnológico)
- [Quick Start](#quick-start)
- [Arquitectura de Stacks](#arquitectura-de-stacks)
- [Estructura del Proyecto](#estructura-del-proyecto)
- [API Endpoints](#api-endpoints)
- [Modelos de Datos](#modelos-de-datos)
- [Configuración y Variables de Entorno](#configuración-y-variables-de-entorno)
- [CI/CD y Deployment](#cicd-y-deployment)
- [Testing](#testing)
- [Scripts Disponibles](#scripts-disponibles)

## Características Principales

### Infraestructura y Deployment
- **Infraestructura como Código (IaC)** - AWS CDK v2 para deployments reproducibles y versionados
- **6 Stacks Modulares** - Storage, Lambda, Auth, API Gateway, WAF y Monitoring organizados por responsabilidad
- **Multi-Ambiente** - Configuraciones específicas para Local (LocalStack), Dev, Staging y Production
- **CI/CD Automatizado** - GitHub Actions con pipelines para testing automático y deployment continuo

### Funcionalidad y Desarrollo
- **Gestión Completa de Documentos** - Upload, download, delete, list y status tracking
- **Versionado de Documentos** - Sistema completo de versiones con historial y rollback
- **Doble Método de Upload** - Base64 para archivos pequeños (<10MB), Presigned URLs para archivos grandes
- **Testing Local Sin Costos** - LocalStack para desarrollo completo sin gastos en AWS

### Seguridad y Escalabilidad
- **Autenticación** - Amazon Cognito User Pool con JWT tokens
- **Protección WAF** - Defensa contra SQL Injection, XSS y rate limiting por IP
- **Cifrado End-to-End** - S3 encryption (S3-managed/KMS) y DynamoDB encryption at rest
- **Auto-Scaling** - DynamoDB on-demand pricing, Lambda concurrent execution automático

### Observabilidad
- **Monitoring Completo** - CloudWatch dashboards con métricas de API, Lambda, DynamoDB y S3
- **15+ CloudWatch Alarms** - Alertas configuradas para errores 5xx, throttles y latencia
- **Logging Centralizado** - CloudWatch Logs con trazabilidad completa de requests
- **X-Ray Tracing** - Seguimiento distribuido de requests a través de todos los servicios

## Stack Tecnológico

**Backend Runtime**
- Node.js 22.x
- TypeScript 5.9+
- Dynamoose 4.x (DynamoDB ORM)
- AWS SDK v3

**Infraestructura AWS**
- AWS CDK 2.228+ (Infrastructure as Code)
- AWS Lambda (11 funciones serverless)
- Amazon S3 (Object storage con versionado)
- Amazon DynamoDB (2 tablas NoSQL con GSIs)
- Amazon Cognito (User authentication)
- API Gateway (REST API con 11 endpoints)
- AWS WAF (Web Application Firewall)
- CloudWatch (Monitoring, logs y alarmas)

**Desarrollo Local y Testing**
- LocalStack (Emulación completa de servicios AWS)
- Docker & Docker Compose
- ts-node para testing
- axios para tests de integración

## Quick Start

### Prerequisitos

```bash
# Requerido
node >= 18.x
npm >= 9.x
aws-cli >= 2.x
docker >= 20.x
docker-compose >= 2.x
```

### Instalación y Setup Local

```bash
# 1. Clonar repositorio
git clone <repository-url>
cd saas-aws-back

# 2. Instalar dependencias
npm install

# 3. Configurar variables de entorno
cp .env.example .env.local
# Editar .env.local con tus valores (o dejar valores por defecto para LocalStack)

# 4. Iniciar LocalStack
npm run localstack:up

# 5. Verificar salud de LocalStack
npm run localstack:health

# 6. Bootstrap CDK (primera vez solamente)
npm run cdk:bootstrap:local

# 7. Deploy de infraestructura local
npm run cdk:deploy:local

# 8. Ejecutar tests de integración
npm run test:local

# Opcional: Ver logs de LocalStack
npm run localstack:logs
```

### Deploy a AWS (Dev Environment)

```bash
# 1. Configurar credenciales AWS
aws configure --profile saas-maestria

# 2. Verificar configuración
aws sts get-caller-identity --profile saas-maestria

# 3. Bootstrap CDK en cuenta AWS (primera vez solamente)
npm run cdk:bootstrap:dev

# 4. Deploy de todos los stacks (Storage → Lambda → Auth → API → WAF → Monitoring)
npm run cdk:deploy:dev

# 5. Ver outputs con endpoints
# Los outputs incluyen: API Gateway URL, S3 Bucket name, DynamoDB table names, Cognito User Pool ID
```

## Arquitectura de Stacks

El proyecto está organizado en **6 stacks CDK** que se despliegan en orden de dependencias:

```
Storage Stack (Fundación de datos)
    ↓
Lambda Stack (Lógica de negocio)
    ↓
Auth Stack (Autenticación)
    ↓
API Stack (Endpoints REST)
    ↓
WAF Stack (Seguridad)
    ↓
Monitoring Stack (Observabilidad)
```

### 1. Storage Stack (`SaasBackend-Storage-{env}`)

**Propósito:** Recursos de almacenamiento persistente

**Recursos Creados:**

#### S3 Bucket (DocumentBucket)
- Versionado: Habilitado en staging/prod, deshabilitado en local/dev
- Encryption: S3-managed (dev), AWS KMS (prod)
- CORS: Configurado para uploads directos desde frontend
- Lifecycle Rules:
  - Transición a Infrequent Access después de 90 días
  - Expiración después de 365 días
- Auto-delete on destroy: Solo en local/dev

#### DynamoDB Table (Items)
- **Partition Key:** `documentId` (String)
- **Billing Mode:** PAY_PER_REQUEST (auto-scaling)
- **Global Secondary Indexes:**
  - `UserIdIndex` - Query documentos por userId
  - `S3KeyIndex` - Query documento por S3 key
- **Features:**
  - Point-in-time recovery (prod/staging)
  - Encryption at rest habilitado
  - DynamoDB Streams (opcional para triggers)

#### DynamoDB Table (Versions)
- **Partition Key:** `documentId` (String)
- **Sort Key:** `versionId` (String)
- **Purpose:** Almacenar historial completo de versiones de documentos
- **Billing Mode:** PAY_PER_REQUEST

**Outputs:** BucketName, BucketArn, TableName, TableArn, VersionsTableName

---

### 2. Lambda Stack (`SaasBackend-Lambda-{env}`)

**Propósito:** 11 funciones Lambda para operaciones de documentos

**Configuración Común:**
- Runtime: Node.js 22.x
- Memory: 512 MB
- Timeout: 30 segundos
- X-Ray tracing: Enabled
- Environment Variables: `S3_BUCKET_NAME`, `DYNAMODB_TABLE_NAME`, `ENVIRONMENT`
- IAM Permissions: Least privilege (S3 GetObject/PutObject/DeleteObject, DynamoDB Query/GetItem/PutItem/UpdateItem/DeleteItem)

**Lambda Functions:**

| Función | Endpoint | Método | Propósito |
|---------|----------|--------|-----------|
| `uploadDocument` | `/documents` | POST | Upload documento base64 (archivos pequeños) |
| `generateUploadUrl` | `/documents/upload-url` | POST | Generar presigned URL para upload directo |
| `confirmUpload` | `/documents/confirm` | POST | Confirmar upload directo y registrar en DB |
| `getDocument` | `/documents/{id}` | GET | Obtener documento por ID + opcional download URL |
| `getDocumentsByUser` | `/documents/user/{userId}` | GET | Listar todos los documentos de un usuario |
| `deleteDocument` | `/documents/{id}` | DELETE | Eliminar documento de S3 y DynamoDB |
| `updateDocumentStatus` | `/documents/{id}/status` | PATCH | Actualizar estado (pending/processing/completed/failed) |
| `generateVersionUploadUrl` | `/documents/{id}/versions/upload-url` | POST | Generar URL para nueva versión |
| `confirmVersionUpload` | `/documents/{id}/versions/confirm` | POST | Confirmar nueva versión |
| `listVersions` | `/documents/{id}/versions` | GET | Listar todas las versiones |
| `downloadVersion` | `/documents/{id}/versions/{versionId}/download` | GET | Download versión específica |

**Outputs:** Lambda Function ARNs para integración con API Gateway

---

### 3. Auth Stack (`SaasBackend-Auth-{env}`)

**Propósito:** Autenticación y autorización de usuarios

**Recursos:**
- **Amazon Cognito User Pool**
  - Password policies configuradas
  - Email verification
  - MFA support (opcional)
  - Custom attributes: `userId`

- **User Pool Client**
  - Client ID/Secret para aplicaciones
  - OAuth 2.0 flows configurados

**Outputs:** UserPoolId, UserPoolArn, ClientId

---

### 4. API Stack (`SaasBackend-Api-{env}`)

**Propósito:** REST API para exponer funciones Lambda

**Configuración:**
- **API Name:** `{env}-documents-api`
- **Type:** REST API (not HTTP API)
- **CORS:**
  - Local/Dev: `*` (all origins)
  - Prod: Restricto a dominios específicos
- **Throttling:**
  - Rate limit: 50 requests/second (steady state)
  - Burst limit: 100 requests/second
- **Authorization:** Cognito User Pool Authorizer en todos los endpoints
- **Request Validation:** JSON Schema validation habilitado
- **Logging:** CloudWatch Logs con nivel INFO

**Outputs:** ApiUrl, ApiId

---

### 5. WAF Stack (`SaasBackend-Waf-{env}`)

**Propósito:** Protección contra ataques web comunes

**Reglas Configuradas:**

1. **AWS Managed Rule Sets:**
   - `AWSManagedRulesCommonRuleSet` (OWASP Top 10)
   - `AWSManagedRulesKnownBadInputsRuleSet`

2. **Custom Rules:**
   - **SQL Injection Protection:** Detecta patrones de SQLi en body/queries
   - **XSS Protection:** Detecta scripts maliciosos
   - **Rate Limiting:** 100 requests por 5 minutos por IP

3. **Logging:**
   - S3 bucket via Kinesis Firehose
   - CloudWatch Metrics: Allowed/Blocked count por regla

**Mode:** COUNT (logging only) en dev, BLOCK en staging/prod

**Outputs:** WebACLId, WebACLArn

---

### 6. Monitoring Stack (`SaasBackend-Monitoring-{env}`)

**Propósito:** Observabilidad completa del sistema

**CloudWatch Dashboard:**
```
Dashboard: {env}-documents-dashboard
├── API Gateway Metrics
│   ├── Request count (Sum, 1 min)
│   ├── Latency p50/p90/p99 (milliseconds)
│   ├── 4xx errors (Sum)
│   └── 5xx errors (Sum)
├── Lambda Metrics
│   ├── Invocations por función
│   ├── Errors por función
│   ├── Duration p50/p90/p99
│   └── Throttles
├── DynamoDB Metrics
│   ├── Read/Write capacity consumed
│   ├── Throttled requests
│   └── ConsumedReadCapacityUnits
└── S3 Metrics
    ├── Bucket size (GB)
    └── Number of objects
```

**CloudWatch Alarms (15+):**

| Alarm | Threshold | Action |
|-------|-----------|--------|
| API 5xx Errors | > 5 in 5 min | SNS notification |
| API 4xx Errors | > 20 in 5 min | SNS notification |
| Lambda Errors | > 5 in 5 min | SNS notification |
| Lambda Throttles | > 0 | SNS notification |
| Lambda Duration | > 25 seconds | SNS warning |
| DynamoDB Throttles | > 0 | SNS notification |
| DynamoDB Read Capacity | > 80% | SNS warning |
| DynamoDB Write Capacity | > 80% | SNS warning |

**SNS Topic:** Configurado para enviar emails a administradores

**Outputs:** DashboardName, SnsTopicArn

---

## Estructura del Proyecto

```
saas-aws-back/
│
├── src/                            # Código fuente de Lambda functions
│   ├── core/                       # Configuraciones y utilidades compartidas
│   │   ├── dynamo.ts              # Cliente DynamoDB/Dynamoose
│   │   ├── s3.ts                  # Cliente S3 con endpoint config
│   │   ├── http.ts                # Helpers HTTP (ok, created, badRequest, etc)
│   │   └── validation.ts          # Validación JSON Schema con AJV
│   │
│   ├── models/                    # Interfaces TypeScript
│   │   ├── item.ts                # Interfaz Document
│   │   └── version.ts             # Interfaz Version
│   │
│   ├── schemas/                   # Esquemas Dynamoose ORM
│   │   ├── item.ts                # Schema de tabla Items
│   │   └── version.ts             # Schema de tabla Versions
│   │
│   ├── services/                  # Lógica de negocio
│   │   ├── document.service.ts    # CRUD de documentos
│   │   └── version.service.ts     # Gestión de versiones
│   │
│   ├── handlers/                  # Lambda handlers (11 funciones)
│   │   ├── upload-document.ts
│   │   ├── generate-upload-url.ts
│   │   ├── confirm-upload.ts
│   │   ├── get-document.ts
│   │   ├── get-documents-by-user.ts
│   │   ├── delete-document.ts
│   │   ├── update-document-status.ts
│   │   └── versions/              # Handlers de versionado
│   │       ├── generate-version-upload-url.ts
│   │       ├── confirm-version-upload.ts
│   │       ├── list-versions.ts
│   │       └── download-version.ts
│   │
│   ├── types/                     # Definiciones TypeScript
│   │   ├── lambda.types.ts        # Tipos API Gateway Event/Response
│   │   └── version.types.ts       # Tipos específicos de versiones
│   │
│   └── test/                      # Tests de integración
│       └── test-handlers.ts       # Tests contra LocalStack
│
├── infra/                         # Infraestructura AWS CDK
│   ├── bin/
│   │   └── app.ts                 # Entry point CDK (define orden de stacks)
│   │
│   ├── config/                    # Configuraciones por ambiente
│   │   ├── types.ts               # Interfaces de configuración
│   │   ├── index.ts               # Config loader (selecciona según ENVIRONMENT)
│   │   ├── local.ts               # Config LocalStack
│   │   ├── dev.ts                 # Config Dev AWS
│   │   ├── staging.ts             # Config Staging AWS
│   │   └── prod.ts                # Config Production AWS
│   │
│   ├── lib/
│   │   ├── constructs/            # Componentes reutilizables CDK (L3 constructs)
│   │   │   ├── document-bucket.ts    # S3 Bucket con CORS/lifecycle
│   │   │   ├── document-table.ts     # DynamoDB Items table con GSIs
│   │   │   ├── version-table.ts      # DynamoDB Versions table
│   │   │   └── document-lambdas.ts   # Las 11 Lambda functions
│   │   │
│   │   └── stacks/                # CDK Stacks (6 stacks)
│   │       ├── storage-stack.ts   # S3 + DynamoDB
│   │       ├── lambda-stack.ts    # 11 Lambda functions
│   │       ├── auth-stack.ts      # Cognito User Pool
│   │       ├── api-stack.ts       # API Gateway REST
│   │       ├── waf-stack.ts       # Web Application Firewall
│   │       └── monitoring-stack.ts # CloudWatch dashboards/alarms
│   │
│   ├── test-scripts/              # Tests de seguridad WAF
│   │   ├── legitimate-traffic.ts       # Tests de tráfico legítimo
│   │   ├── sql-injection-attack.ts     # Tests de ataque SQLi
│   │   ├── xss-attack.ts               # Tests de ataque XSS
│   │   ├── rate-limit-test.ts          # Tests de rate limiting
│   │   └── run-all-tests.ts            # Ejecutor de todos los tests
│   │
│   ├── cdk.json                   # Configuración CDK
│   └── tsconfig.json              # TypeScript config infra
│
├── .github/
│   └── workflows/                 # CI/CD Pipelines (GitHub Actions)
│       ├── test-localstack.yml    # Tests automáticos en PRs
│       ├── deploy-dev.yml         # Deploy a Dev on push to develop
│       ├── deploy-staging.yml     # Deploy a Staging on push to main
│       └── deploy-prod.yml        # Deploy manual a Production
│
├── scripts/                       # Scripts de automatización
│   ├── setup-localstack.sh        # Setup inicial de LocalStack
│   └── verify-localstack.sh       # Verificación de recursos
│
├── package.json                   # Dependencias y scripts NPM
├── tsconfig.json                  # TypeScript config principal
├── .env.example                   # Template de variables de entorno
├── .env.local                     # Variables locales (git ignored)
├── .env.dev                       # Variables dev (git ignored)
├── iam-deployment-policy.json     # Permisos IAM mínimos para CI/CD
└── s3-cors.json                   # Configuración CORS de S3
```

## API Endpoints

Todos los endpoints requieren autenticación via Cognito JWT token en el header `Authorization: Bearer {token}`.

### Gestión de Documentos

#### 1. Upload Document (Base64)
**POST** `/documents`

Sube un documento codificado en base64. Recomendado para archivos pequeños (<10MB).

**Request:**
```json
{
  "fileName": "documento.pdf",
  "mimeType": "application/pdf",
  "fileContent": "base64_encoded_content",
  "userId": "user-123"
}
```

**Response (201 Created):**
```json
{
  "message": "Document uploaded successfully",
  "document": {
    "documentId": "550e8400-e29b-41d4-a716-446655440000",
    "fileName": "documento.pdf",
    "fileSize": 12345,
    "mimeType": "application/pdf",
    "s3Key": "documents/user-123/550e8400.../documento.pdf",
    "s3VersionId": "abc123",
    "userId": "user-123",
    "uploadedAt": "2025-01-15T10:30:00.000Z",
    "status": "pending"
  }
}
```

---

#### 2. Generate Upload URL (Presigned)
**POST** `/documents/upload-url`

Genera una URL prefirmada para upload directo a S3. Recomendado para archivos grandes (>10MB).

**Request:**
```json
{
  "fileName": "archivo-grande.zip",
  "mimeType": "application/zip",
  "userId": "user-123"
}
```

**Response (200 OK):**
```json
{
  "message": "Upload URL generated successfully",
  "uploadUrl": "https://s3.amazonaws.com/bucket/key?X-Amz-Algorithm=AWS4-HMAC-SHA256...",
  "documentId": "660e9500-f39c-51e5-b827-556766550111",
  "s3Key": "documents/user-123/660e9500.../archivo-grande.zip",
  "expiresIn": 900
}
```

**Uso del Upload URL:**
```bash
# Cliente sube directamente a S3 (bypass Lambda)
curl -X PUT "${uploadUrl}" \
  -H "Content-Type: application/zip" \
  --upload-file archivo-grande.zip
```

---

#### 3. Confirm Upload
**POST** `/documents/confirm`

Confirma una subida directa a S3 y registra metadata en DynamoDB.

**Request:**
```json
{
  "documentId": "660e9500-f39c-51e5-b827-556766550111",
  "s3Key": "documents/user-123/660e9500.../archivo-grande.zip",
  "fileSize": 524288,
  "userId": "user-123",
  "fileName": "archivo-grande.zip",
  "mimeType": "application/zip"
}
```

**Response (201 Created):**
```json
{
  "message": "Upload confirmed successfully",
  "document": {
    "documentId": "660e9500-f39c-51e5-b827-556766550111",
    "fileName": "archivo-grande.zip",
    "fileSize": 524288,
    "status": "pending"
  }
}
```

---

#### 4. Get Document
**GET** `/documents/{documentId}?includeDownloadUrl=true`

Obtiene metadata de un documento por ID. Opcionalmente genera URL de descarga.

**Query Parameters:**
- `includeDownloadUrl` (boolean, opcional): Si es `true`, genera presigned URL para descarga (válida 1 hora)

**Response (200 OK):**
```json
{
  "document": {
    "documentId": "550e8400-e29b-41d4-a716-446655440000",
    "fileName": "documento.pdf",
    "fileSize": 12345,
    "mimeType": "application/pdf",
    "s3Key": "documents/user-123/550e8400.../documento.pdf",
    "userId": "user-123",
    "uploadedAt": "2025-01-15T10:30:00.000Z",
    "status": "completed"
  },
  "downloadUrl": "https://s3.amazonaws.com/bucket/key?X-Amz-Algorithm=...&X-Amz-Expires=3600"
}
```

---

#### 5. List User Documents
**GET** `/documents/user/{userId}`

Lista todos los documentos de un usuario.

**Response (200 OK):**
```json
{
  "userId": "user-123",
  "count": 5,
  "documents": [
    {
      "documentId": "550e8400-e29b-41d4-a716-446655440000",
      "fileName": "documento.pdf",
      "fileSize": 12345,
      "mimeType": "application/pdf",
      "uploadedAt": "2025-01-15T10:30:00.000Z",
      "status": "completed"
    },
    {
      "documentId": "660e9500-f39c-51e5-b827-556766550111",
      "fileName": "archivo-grande.zip",
      "fileSize": 524288,
      "mimeType": "application/zip",
      "uploadedAt": "2025-01-14T09:15:00.000Z",
      "status": "pending"
    }
  ]
}
```

---

#### 6. Delete Document
**DELETE** `/documents/{documentId}`

Elimina un documento de S3 y DynamoDB (operación irreversible).

**Response (200 OK):**
```json
{
  "message": "Document deleted successfully",
  "documentId": "550e8400-e29b-41d4-a716-446655440000"
}
```

---

#### 7. Update Document Status
**PATCH** `/documents/{documentId}/status`

Actualiza el estado de procesamiento de un documento.

**Request:**
```json
{
  "status": "completed",
  "reason": "Processing finished successfully"
}
```

**Status válidos:** `pending` | `processing` | `completed` | `failed`

**Response (200 OK):**
```json
{
  "message": "Document status updated successfully",
  "document": {
    "documentId": "550e8400-e29b-41d4-a716-446655440000",
    "status": "completed",
    "updatedAt": "2025-01-15T11:00:00.000Z"
  }
}
```

---

### Versionado de Documentos

#### 8. Generate Version Upload URL
**POST** `/documents/{documentId}/versions/upload-url`

Genera URL prefirmada para subir una nueva versión del documento.

**Request:**
```json
{
  "fileName": "documento_v2.pdf",
  "mimeType": "application/pdf",
  "userId": "user-123",
  "comment": "Correcciones menores en página 3"
}
```

**Response (200 OK):**
```json
{
  "message": "Version upload URL generated",
  "uploadUrl": "https://s3.amazonaws.com/bucket/versions/key?...",
  "versionId": "770f0600-g40d-62f6-c938-667877661222",
  "documentId": "550e8400-e29b-41d4-a716-446655440000",
  "s3Key": "documents/user-123/550e8400.../versions/770f0600.../documento_v2.pdf",
  "expiresIn": 900
}
```

---

#### 9. Confirm Version Upload
**POST** `/documents/{documentId}/versions/confirm`

Confirma la subida de una nueva versión y actualiza metadata.

**Request:**
```json
{
  "versionId": "770f0600-g40d-62f6-c938-667877661222",
  "s3Key": "documents/.../versions/.../documento_v2.pdf",
  "fileSize": 14500,
  "fileName": "documento_v2.pdf",
  "mimeType": "application/pdf",
  "userId": "user-123",
  "comment": "Correcciones menores en página 3"
}
```

**Response (201 Created):**
```json
{
  "message": "Version confirmed successfully",
  "version": {
    "versionId": "770f0600-g40d-62f6-c938-667877661222",
    "documentId": "550e8400-e29b-41d4-a716-446655440000",
    "versionNumber": 2,
    "fileName": "documento_v2.pdf",
    "size": 14500,
    "uploadedAt": "2025-01-15T12:00:00.000Z",
    "uploadedBy": "user-123",
    "isActive": true,
    "comment": "Correcciones menores en página 3"
  }
}
```

---

#### 10. List Document Versions
**GET** `/documents/{documentId}/versions`

Lista todas las versiones de un documento ordenadas por fecha (más reciente primero).

**Response (200 OK):**
```json
{
  "documentId": "550e8400-e29b-41d4-a716-446655440000",
  "count": 3,
  "versions": [
    {
      "versionId": "880g1711-h51e-73g7-d049-778988772333",
      "versionNumber": 3,
      "fileName": "documento_v3.pdf",
      "size": 15000,
      "uploadedAt": "2025-01-16T08:30:00.000Z",
      "uploadedBy": "user-123",
      "isActive": true,
      "comment": "Versión final revisada"
    },
    {
      "versionId": "770f0600-g40d-62f6-c938-667877661222",
      "versionNumber": 2,
      "fileName": "documento_v2.pdf",
      "size": 14500,
      "uploadedAt": "2025-01-15T12:00:00.000Z",
      "uploadedBy": "user-123",
      "isActive": false,
      "comment": "Correcciones menores en página 3"
    },
    {
      "versionId": "550e8400-e29b-41d4-a716-446655440000",
      "versionNumber": 1,
      "fileName": "documento.pdf",
      "size": 12345,
      "uploadedAt": "2025-01-15T10:30:00.000Z",
      "uploadedBy": "user-123",
      "isActive": false
    }
  ]
}
```

---

#### 11. Download Document Version
**GET** `/documents/{documentId}/versions/{versionId}/download`

Genera presigned URL para descargar una versión específica.

**Response (200 OK):**
```json
{
  "versionId": "770f0600-g40d-62f6-c938-667877661222",
  "documentId": "550e8400-e29b-41d4-a716-446655440000",
  "downloadUrl": "https://s3.amazonaws.com/bucket/key?versionId=abc&X-Amz-Expires=3600...",
  "expiresIn": 3600
}
```

---

## Modelos de Datos

### Document (Item)

```typescript
interface Item {
  documentId: string;        // UUID, Partition Key
  userId: string;            // Owner, GSI UserIdIndex
  fileName: string;          // Original filename
  fileSize: number;          // Bytes
  mimeType: string;          // e.g., application/pdf
  s3Key: string;             // S3 path, GSI S3KeyIndex
  s3VersionId: string;       // S3 version ID for recovery
  uploadedAt: string;        // ISO 8601 datetime
  status: string;            // pending | processing | completed | failed
  createdAt?: string;        // Auto-generated by Dynamoose
  updatedAt?: string;        // Auto-updated by Dynamoose
}
```

**DynamoDB Schema:**
- Table Name: `Items-{env}`
- Partition Key: `documentId`
- GSI 1: `UserIdIndex` (PK: userId)
- GSI 2: `S3KeyIndex` (PK: s3Key)
- Billing: PAY_PER_REQUEST
- Encryption: AWS managed

---

### Version

```typescript
interface Version {
  documentId: string;        // Parent document, Partition Key
  versionId: string;         // UUID, Sort Key
  versionNumber: number;     // Sequential: 1, 2, 3...
  s3VersionId?: string;      // S3 version tracking
  s3Key: string;             // File location in S3
  fileName: string;          // Version filename
  mimeType: string;
  size: number;              // Bytes
  uploadedAt: string;        // ISO 8601 datetime
  uploadedBy: string;        // User who uploaded
  isActive: boolean;         // Current active version flag
  checksum?: string;         // Optional MD5/SHA256 for integrity
  comment?: string;          // Version notes/changelog
  createdAt?: string;
  updatedAt?: string;
}
```

**DynamoDB Schema:**
- Table Name: `Versions-{env}`
- Partition Key: `documentId`
- Sort Key: `versionId`
- Billing: PAY_PER_REQUEST
- Encryption: AWS managed

---

## Configuración y Variables de Entorno

### Variables de Entorno (.env.local para LocalStack)

```bash
# AWS Configuration
AWS_PROFILE=localstack
AWS_ENDPOINT_URL=http://localhost:4566    # LocalStack endpoint
AWS_ACCESS_KEY_ID=test                    # LocalStack dummy credentials
AWS_SECRET_ACCESS_KEY=test                # LocalStack dummy credentials
AWS_REGION=us-west-2

# S3 Configuration
S3_BUCKET_NAME=documents-bucket-local

# DynamoDB Configuration
DYNAMODB_TABLE_NAME=Items-local
VERSIONS_TABLE_NAME=Versions-local

# Environment
ENVIRONMENT=local
```

### Variables de Entorno (.env.dev para AWS Dev)

```bash
# AWS Configuration
AWS_PROFILE=saas-maestria
AWS_REGION=us-east-2

# Environment
ENVIRONMENT=dev

# S3 y DynamoDB names son generados automáticamente por CDK
# y exportados como outputs del stack
```

### Configuración por Ambiente

Los archivos en `infra/config/` contienen configuraciones específicas:

**local.ts** (LocalStack):
```typescript
{
  environmentName: 'local',
  region: 'us-west-2',
  endpoint: 'http://localhost:4566',
  s3: {
    bucketName: 'documents-bucket-local',
    versioned: false,
    encrypted: false
  },
  dynamodb: {
    tableName: 'Items-local',
    billingMode: 'PAY_PER_REQUEST',
    pointInTimeRecovery: false
  }
}
```

**dev.ts** (AWS Dev):
```typescript
{
  environmentName: 'dev',
  region: 'us-east-2',
  s3: {
    bucketName: 'documents-bucket-dev-{timestamp}',
    versioned: true,
    encrypted: true,
    encryptionType: 'S3_MANAGED'
  },
  dynamodb: {
    tableName: 'Items-dev-{timestamp}',
    billingMode: 'PAY_PER_REQUEST',
    pointInTimeRecovery: false
  },
  api: {
    throttle: {
      rateLimit: 50,
      burstLimit: 100
    }
  }
}
```

**prod.ts** (AWS Production):
```typescript
{
  environmentName: 'prod',
  region: 'us-east-1',
  s3: {
    bucketName: 'documents-bucket-prod-{timestamp}',
    versioned: true,
    encrypted: true,
    encryptionType: 'KMS',
    kmsKeyId: 'arn:aws:kms:...'
  },
  dynamodb: {
    tableName: 'Items-prod-{timestamp}',
    billingMode: 'PAY_PER_REQUEST',
    pointInTimeRecovery: true
  },
  monitoring: {
    alarms: {
      api5xxThreshold: 5,
      lambdaErrorThreshold: 5,
      snsTopicArn: 'arn:aws:sns:...'
    }
  }
}
```

---

## CI/CD y Deployment

### GitHub Actions Workflows

#### 1. Test LocalStack (`.github/workflows/test-localstack.yml`)

**Trigger:** Pull Request a `develop` o `main`, o push a estas ramas

**Pasos:**
1. Checkout código
2. Setup Node.js 18
3. Install dependencies (`npm ci`)
4. Build TypeScript (`npm run build`)
5. Start LocalStack container
6. Wait for LocalStack health check
7. Bootstrap CDK local (`npm run cdk:bootstrap:local`)
8. Deploy all stacks (`npm run cdk:deploy:local`)
9. Run integration tests (`npm run test:local`)
10. Cleanup (destroy stacks, stop LocalStack)

**Status:** Required check para merge

---

#### 2. Deploy to Dev (`.github/workflows/deploy-dev.yml`)

**Trigger:** Push a branch `develop`

**Environment:** AWS Dev

**Pasos:**
1. Checkout código
2. Setup Node.js 18
3. Install dependencies
4. Build TypeScript
5. Configure AWS credentials (from GitHub Secrets)
6. CDK Bootstrap (si es necesario)
7. Deploy Storage Stack
8. Deploy Lambda Stack
9. Deploy Auth Stack
10. Deploy API Stack
11. Deploy WAF Stack
12. Deploy Monitoring Stack
13. Extract API URL from outputs
14. Report success with API URL

**Secrets Requeridos:**
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `AWS_ACCOUNT_ID`

---

#### 3. Deploy to Staging (`.github/workflows/deploy-staging.yml`)

**Trigger:** Push a branch `main`

**Environment:** AWS Staging

Similar a Deploy Dev, pero con configuraciones de staging.

---

#### 4. Deploy to Production (`.github/workflows/deploy-prod.yml`)

**Trigger:** Manual workflow dispatch

**Environment:** AWS Production

**Pasos adicionales:**
- Manual approval step (GitHub Environment protection)
- Pre-deployment backup/snapshot
- Blue-green deployment strategy
- Post-deployment health checks
- Automatic rollback capability si falla health check

---

### Deployment Manual

```bash
# Local (LocalStack)
npm run cdk:deploy:local

# Dev (AWS)
npm run cdk:deploy:dev

# Staging (AWS)
npm run cdk:deploy:staging

# Production (AWS) - requiere confirmación manual
npm run cdk:deploy:prod
```

### Destruir Infraestructura

```bash
# Local (LocalStack)
npm run cdk:destroy:local

# Dev (AWS) - con confirmación
npm run cdk:destroy:dev

# CUIDADO: Prod requiere parámetros adicionales
# No hay script directo para evitar destrucción accidental
cd infra && cdk destroy --all --force --profile prod-profile
```

---

## Testing

### Tests Locales (LocalStack)

```bash
# 1. Asegurar LocalStack corriendo
npm run localstack:up

# 2. Deploy infraestructura local
npm run cdk:deploy:local

# 3. Ejecutar tests de integración
npm run test:local
```

**Test Coverage:**
- Upload documento (base64)
- Generate presigned URL
- Confirm upload
- Get documento por ID
- List documentos por usuario
- Delete documento
- Update status
- Versionado completo

---

### Tests de Seguridad WAF

```bash
# Test completo (todos los escenarios)
npm run test:waf

# Tests individuales
npm run test:waf:legitimate    # Tráfico normal
npm run test:waf:sqli          # SQL Injection attacks
npm run test:waf:xss           # Cross-Site Scripting attacks
npm run test:waf:ratelimit     # Rate limiting (150 requests)
```

**Resultados Esperados:**
- Tráfico legítimo: 200 OK
- SQL Injection: 403 Forbidden (WAF blocked)
- XSS: 403 Forbidden (WAF blocked)
- Rate limit: Primeros 100 OK, resto 429 Too Many Requests

---

## Scripts Disponibles

### Build y Desarrollo

```bash
npm run build                    # Compilar TypeScript (src + infra)
```

### LocalStack

```bash
npm run localstack:up            # Iniciar LocalStack (Docker)
npm run localstack:down          # Detener LocalStack
npm run localstack:restart       # Reiniciar LocalStack
npm run localstack:logs          # Ver logs en tiempo real
npm run localstack:health        # Check health status
npm run localstack:setup         # Setup recursos (Linux/Mac)
npm run localstack:setup:win     # Setup recursos (Windows)
npm run localstack:verify        # Verificar recursos creados (Linux/Mac)
npm run localstack:verify:win    # Verificar recursos creados (Windows)
```

### CDK - Synth y Diff

```bash
npm run cdk:synth               # Sintetizar templates CloudFormation (dev)
npm run cdk:synth:local         # Sintetizar templates (local)
npm run cdk:diff                # Ver diferencias con stack deployed
npm run cdk:diff:local          # Ver diferencias (local)
npm run cdk:diff:dev            # Ver diferencias (dev)
npm run cdk:list                # Listar todos los stacks
npm run cdk:list:local          # Listar stacks (local)
```

### CDK - Bootstrap

```bash
npm run cdk:bootstrap:local     # Bootstrap CDK en LocalStack (primera vez)
npm run cdk:bootstrap:dev       # Bootstrap CDK en AWS Dev (primera vez)
```

### CDK - Deploy

```bash
npm run cdk:deploy:local        # Deploy a LocalStack
npm run cdk:deploy:dev          # Deploy a AWS Dev
npm run cdk:deploy:staging      # Deploy a AWS Staging
npm run cdk:deploy:prod         # Deploy a AWS Production
```

### CDK - Destroy

```bash
npm run cdk:destroy:local       # Destruir stacks en LocalStack
npm run cdk:destroy:dev         # Destruir stacks en AWS Dev
```

### Deploy Específico

```bash
npm run deploy:lambda           # Deploy solo Lambda stack (dev)
```

### Testing

```bash
npm run test:local              # Tests de integración con LocalStack
npm run test:waf                # Tests de seguridad WAF (todos)
npm run test:waf:legitimate     # Test tráfico legítimo
npm run test:waf:sqli           # Test SQL Injection
npm run test:waf:xss            # Test XSS
npm run test:waf:ratelimit      # Test rate limiting
```

### Desarrollo Completo

```bash
npm run dev                     # LocalStack up + Deploy + Test
```

---

## Dependencias

### Runtime Dependencies

```json
{
  "@aws-sdk/client-dynamodb": "^3.936.0",
  "@aws-sdk/client-s3": "^3.937.0",
  "@aws-sdk/lib-dynamodb": "^3.936.0",
  "@aws-sdk/s3-request-presigner": "^3.937.0",
  "@types/uuid": "^8.3.4",
  "ajv": "^8.17.1",
  "axios": "^1.7.9",
  "dynamoose": "^4.0.4",
  "uuid": "^8.3.2"
}
```

### Dev Dependencies

```json
{
  "@types/node": "^24.10.1",
  "aws-cdk": "^2.1033.0",
  "aws-cdk-lib": "^2.228.0",
  "aws-cdk-local": "^3.0.1",
  "constructs": "^10.4.3",
  "cross-env": "^10.1.0",
  "dotenv": "^16.6.1",
  "source-map-support": "^0.5.21",
  "ts-node": "^10.9.2",
  "typescript": "^5.9.3"
}
```

---

## Flujos de Trabajo

### Upload de Archivo Pequeño (Base64)

```
Cliente
  ↓ POST /documents (base64 encoded)
Lambda (uploadDocument)
  ↓ 1. Decode base64
  ↓ 2. Generate UUID
  ↓ 3. Upload to S3
  ↓ 4. Save metadata to DynamoDB
  ↓ 5. Return document object
Cliente
  ← 201 Created
```

### Upload de Archivo Grande (Presigned URL)

```
Cliente
  ↓ POST /documents/upload-url
Lambda (generateUploadUrl)
  ↓ 1. Generate UUID
  ↓ 2. Build S3 key
  ↓ 3. Create presigned PUT URL (15 min expiry)
  ↓ 4. Return URL
Cliente
  ← 200 OK (uploadUrl, documentId)
  ↓
  ↓ PUT {uploadUrl} (direct to S3, bypass Lambda)
S3
  ← File uploaded
Cliente
  ↓ POST /documents/confirm
Lambda (confirmUpload)
  ↓ 1. Verify file exists in S3
  ↓ 2. Get file size
  ↓ 3. Save metadata to DynamoDB
  ↓ 4. Return document object
Cliente
  ← 201 Created
```

### Download con URL Temporal

```
Cliente
  ↓ GET /documents/{id}?includeDownloadUrl=true
Lambda (getDocument)
  ↓ 1. Query DynamoDB by documentId
  ↓ 2. Generate presigned GET URL (1 hour expiry)
  ↓ 3. Return document + downloadUrl
Cliente
  ← 200 OK
  ↓ GET {downloadUrl} (direct from S3)
S3
  ← File downloaded
```

### Versionado

```
Cliente
  ↓ POST /documents/{id}/versions/upload-url
Lambda (generateVersionUploadUrl)
  ↓ 1. Verify parent document exists
  ↓ 2. Generate version UUID
  ↓ 3. Increment version number
  ↓ 4. Create presigned PUT URL for version
  ↓ 5. Return URL
Cliente
  ← 200 OK (uploadUrl, versionId)
  ↓ PUT {uploadUrl} (direct to S3)
S3
  ← Version file uploaded
Cliente
  ↓ POST /documents/{id}/versions/confirm
Lambda (confirmVersionUpload)
  ↓ 1. Verify version file in S3
  ↓ 2. Mark previous version as inactive (isActive=false)
  ↓ 3. Save new version to Versions table (isActive=true)
  ↓ 4. Return version object
Cliente
  ← 201 Created
```

---

## Arquitectura de Seguridad

### Capas de Seguridad

1. **Network Layer**
   - VPC endpoints para S3/DynamoDB (opcional)
   - Security Groups para Lambda (si en VPC)

2. **Application Layer (WAF)**
   - SQL Injection protection
   - XSS protection
   - Rate limiting por IP
   - AWS Managed Rules (OWASP Top 10)

3. **API Layer**
   - Cognito JWT authentication
   - Request validation (JSON schemas)
   - Throttling (50 req/s, burst 100)
   - CORS restrictions

4. **Data Layer**
   - S3 encryption at rest (S3-managed o KMS)
   - DynamoDB encryption at rest
   - S3 versioning (prod)
   - DynamoDB point-in-time recovery (prod)

5. **IAM Layer**
   - Lambda execution roles (least privilege)
   - S3 bucket policies
   - DynamoDB resource policies
   - CDK deployment role (minimal permissions)

### Mejores Prácticas Implementadas

- Secrets en GitHub Secrets (no hardcoded)
- Environment variables para configuración
- HTTPS only (API Gateway, S3 presigned URLs)
- X-Ray tracing para auditoría
- CloudWatch Logs retention (90 días)
- Multi-factor authentication (Cognito MFA opcional)
- Presigned URL expiration (15 min upload, 1 hour download)

---

## Costos Estimados

### Ambiente Local (LocalStack)
- **Costo:** $0 (Docker local)

### Ambiente Dev (AWS)
**Asumiendo:** 1000 documents/month, 100 MB promedio, 10K API requests/month

| Servicio | Cantidad | Costo Mensual |
|----------|----------|---------------|
| Lambda invocations | 30K invocations | ~$0.60 |
| Lambda compute | 512MB, 1s avg | ~$0.20 |
| DynamoDB | 10K reads, 5K writes | ~$1.25 |
| S3 storage | 100 GB | ~$2.30 |
| S3 requests | 10K PUT, 10K GET | ~$0.10 |
| API Gateway | 10K requests | ~$0.04 |
| CloudWatch Logs | 1 GB | ~$0.50 |
| **TOTAL** | | **~$5-10/month** |

### Ambiente Production (AWS)
**Asumiendo:** 100K documents/month, 5K API requests/day

| Servicio | Cantidad | Costo Mensual |
|----------|----------|---------------|
| Lambda invocations | 450K invocations | ~$9 |
| Lambda compute | 512MB, 1s avg | ~$3 |
| DynamoDB | 150K reads, 100K writes | ~$18 |
| S3 storage | 10 TB | ~$230 |
| S3 requests | 150K PUT, 300K GET | ~$2 |
| API Gateway | 150K requests | ~$0.50 |
| CloudWatch | 20 GB logs, 15 alarms | ~$12 |
| WAF | 150K requests | ~$6 |
| **TOTAL** | | **~$280-300/month** |

**Nota:** Costos varían según región, uso real y configuraciones.

---

## Troubleshooting

### LocalStack no inicia

```bash
# Verificar Docker
docker ps

# Ver logs de LocalStack
npm run localstack:logs

# Reiniciar LocalStack
npm run localstack:restart
```

### Error en CDK Deploy

```bash
# Ver diferencias
npm run cdk:diff:local

# Verificar credenciales
aws sts get-caller-identity --profile saas-maestria

# Bootstrap si es primera vez
npm run cdk:bootstrap:dev
```

### Lambda function errors

```bash
# Ver logs en LocalStack
docker logs localstack

# Ver logs en AWS
aws logs tail /aws/lambda/uploadDocument --follow --profile saas-maestria
```

### Tests fallan

```bash
# Verificar que LocalStack está corriendo
npm run localstack:health

# Verificar que infraestructura está deployed
npm run localstack:verify

# Re-deploy
npm run cdk:deploy:local
```

---

## Roadmap y Mejoras Futuras

### Planeadas
- [ ] GraphQL API (AppSync) como alternativa a REST
- [ ] Streaming de archivos grandes (S3 Multipart Upload)
- [ ] OCR processing con Amazon Textract
- [ ] Full-text search con Amazon OpenSearch
- [ ] CDN con CloudFront para downloads
- [ ] Frontend React (separado)

### Consideradas
- [ ] SQS queue para procesamiento asíncrono
- [ ] Step Functions para workflows complejos
- [ ] EventBridge para event-driven architecture
- [ ] Lambda@Edge para manipulación de requests
- [ ] S3 Glacier para archivado de documentos antiguos

---

## Contribución

1. Fork el proyecto
2. Crear feature branch (`git checkout -b feature/amazing-feature`)
3. Commit cambios (`git commit -m 'Add amazing feature'`)
4. Push a branch (`git push origin feature/amazing-feature`)
5. Abrir Pull Request

**Nota:** Los PRs correrán tests automáticos con LocalStack. Deben pasar para ser considerados.

---

## Licencia

Este proyecto es privado. Todos los derechos reservados.

---

## Contacto

Para preguntas o soporte, contactar a: [tu-email@example.com]

---

## Changelog

### v1.0.0 (2025-01-15)
- Infraestructura inicial con 6 stacks CDK
- 11 Lambda functions para gestión de documentos
- Sistema de versionado completo
- WAF con reglas de seguridad
- CloudWatch monitoring y alarms
- CI/CD con GitHub Actions
- LocalStack para desarrollo local
- Testing completo de seguridad

---

**Built with TypeScript, AWS CDK, and Serverless Architecture**
