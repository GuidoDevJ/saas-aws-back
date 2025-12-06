# Backend SaaS - Sistema de Gestión de Documentos

Sistema backend completo para gestión de documentos en AWS utilizando S3, DynamoDB, Lambda y API Gateway.

## ✨ Features

- 🚀 **Infraestructura como Código** - AWS CDK para deployment reproducible
- 📦 **4 Stacks Independientes** - Storage, Lambda, API Gateway y Monitoring
- 🔄 **CI/CD Completo** - GitHub Actions para Dev, Staging y Production
- 📊 **Monitoring** - CloudWatch dashboards y alarms configurados
- 🧪 **Testing Local** - LocalStack para desarrollo sin costos
- 🌍 **Multi-ambiente** - Local, Dev, Staging y Production
- 🔐 **Seguridad** - CORS, throttling, request validation
- 📈 **Escalable** - DynamoDB on-demand, Lambda auto-scaling

## 📚 Documentación

- **[🚀 Quick Start (5 min)](CDK_QUICKSTART.md)** - Empezar rápidamente
- **[🏗️ Infraestructura Completa](INFRASTRUCTURE.md)** - Arquitectura y deployment
- **[🧪 Testing Guide](TESTING.md)** - Guía completa de testing

## 🚀 Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Deploy infrastructure
npm run cdk:bootstrap:local
npm run cdk:deploy:local

# 3. Test
npm run test:local
```

## 📊 Stacks

| Stack | Descripción | Recursos |
|-------|-------------|----------|
| **Storage** | S3 + DynamoDB | 1 bucket, 1 table |
| **Lambda** | Funciones serverless | 7 Lambda functions |
| **API** | REST API | API Gateway + integrations |
| **Monitoring** | Observabilidad | Dashboard + 15 alarms |

## Estructura del Proyecto

```
src/
├── core/                    # Configuraciones y utilidades core
│   ├── dynamo.ts           # Configuración de DynamoDB/Dynamoose
│   ├── s3.ts               # Configuración de S3 Client
│   ├── http.ts             # Funciones de respuesta HTTP
│   └── validation.ts       # Utilidades de validación con AJV
│
├── models/                  # Interfaces TypeScript
│   └── item.ts             # Interfaz del modelo de documento
│
├── schemas/                 # Esquemas de Dynamoose
│   └── item.ts             # Esquema de la tabla Items
│
├── services/                # Lógica de negocio
│   └── document.service.ts # Servicio de gestión de documentos
│
├── handlers/                # Lambda handlers
│   ├── upload-document.ts          # Subir documento con base64
│   ├── generate-upload-url.ts      # Generar URL prefirmada
│   ├── confirm-upload.ts           # Confirmar subida directa
│   ├── get-document.ts             # Obtener un documento
│   ├── get-documents-by-user.ts    # Listar documentos de usuario
│   ├── delete-document.ts          # Eliminar documento
│   └── update-document-status.ts   # Actualizar estado
│
└── types/                   # Tipos y definiciones TypeScript
    └── lambda.types.ts     # Tipos para eventos y respuestas Lambda
```

## Lambdas Disponibles

### 1. **upload-document** (POST)
Sube un documento codificado en base64 a S3 y registra en DynamoDB.

**Request:**
```json
{
  "fileName": "documento.pdf",
  "mimeType": "application/pdf",
  "fileContent": "base64_encoded_content",
  "userId": "user-123"
}
```

**Response:**
```json
{
  "message": "Document uploaded successfully",
  "document": {
    "documentId": "uuid",
    "fileName": "documento.pdf",
    "fileSize": 12345,
    "s3Key": "documents/user-123/uuid/documento.pdf",
    "status": "pending",
    ...
  }
}
```

### 2. **generate-upload-url** (POST)
Genera una URL prefirmada para subida directa a S3 (archivos grandes).

**Request:**
```json
{
  "fileName": "archivo-grande.zip",
  "mimeType": "application/zip",
  "userId": "user-123"
}
```

**Response:**
```json
{
  "message": "Upload URL generated successfully",
  "uploadUrl": "https://s3.amazonaws.com/...",
  "documentId": "uuid",
  "s3Key": "documents/user-123/uuid/archivo-grande.zip",
  "expiresIn": 900
}
```

### 3. **confirm-upload** (POST)
Confirma una subida directa a S3 y registra en DynamoDB.

**Request:**
```json
{
  "documentId": "uuid",
  "s3Key": "documents/user-123/uuid/archivo-grande.zip",
  "fileSize": 524288,
  "userId": "user-123",
  "fileName": "archivo-grande.zip",
  "mimeType": "application/zip"
}
```

### 4. **get-document** (GET)
Obtiene información de un documento por ID.

**Path:** `/documents/{documentId}?includeDownloadUrl=true`

**Response:**
```json
{
  "document": {
    "documentId": "uuid",
    "fileName": "documento.pdf",
    ...
  },
  "downloadUrl": "https://s3.amazonaws.com/..." // Si se solicita
}
```

### 5. **get-documents-by-user** (GET)
Lista todos los documentos de un usuario.

**Path:** `/users/{userId}/documents`

**Response:**
```json
{
  "userId": "user-123",
  "count": 5,
  "documents": [...]
}
```

### 6. **delete-document** (DELETE)
Elimina un documento de S3 y DynamoDB.

**Path:** `/documents/{documentId}`

**Response:**
```json
{
  "message": "Document deleted successfully",
  "documentId": "uuid"
}
```

### 7. **update-document-status** (PATCH)
Actualiza el estado de procesamiento de un documento.

**Path:** `/documents/{documentId}/status`

**Request:**
```json
{
  "status": "completed"  // pending | processing | completed | failed
}
```

## Configuración

### Variables de Entorno

```bash
# S3
S3_BUCKET_NAME=documents-bucket

# DynamoDB
AWS_REGION=us-west-2

# Opcional para desarrollo local
AWS_ACCESS_KEY_ID=your-key
AWS_SECRET_ACCESS_KEY=your-secret
```

## Instalación

```bash
npm install
```

## Dependencias Principales

- `@aws-sdk/client-dynamodb`: Cliente DynamoDB v3
- `@aws-sdk/client-s3`: Cliente S3 v3
- `@aws-sdk/s3-request-presigner`: Generación de URLs prefirmadas
- `dynamoose`: ORM para DynamoDB
- `uuid`: Generación de IDs únicos
- `ajv`: Validación de esquemas JSON

## Recursos AWS Necesarios

### DynamoDB Table: Items

**Atributos:**
- `documentId` (String) - Partition Key
- `userId` (String)
- `fileName` (String)
- `fileSize` (Number)
- `mimeType` (String)
- `s3Key` (String)
- `s3VersionId` (String)
- `uploadedAt` (String)
- `status` (String)

**Índices Globales:**
1. `UserIdIndex` - Partition Key: `userId`
2. `S3KeyIndex` - Partition Key: `s3Key`

### S3 Bucket

- Nombre: configurado en variable de entorno
- Versionado: recomendado habilitarlo
- CORS: configurar si se usa upload directo desde frontend

**Ejemplo CORS:**
```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["PUT", "POST", "DELETE"],
    "AllowedOrigins": ["https://tu-dominio.com"],
    "ExposeHeaders": []
  }
]
```

## Flujo de Trabajo

### Subida con Base64 (archivos pequeños)
1. Cliente llama a `upload-document` con archivo en base64
2. Lambda sube a S3 y registra en DynamoDB
3. Cliente recibe confirmación

### Subida Directa (archivos grandes)
1. Cliente llama a `generate-upload-url`
2. Cliente sube archivo directamente a S3 usando la URL
3. Cliente llama a `confirm-upload` con metadatos
4. Lambda registra en DynamoDB


