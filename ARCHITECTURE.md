# 🏗️ Arquitectura del Sistema

Documentación detallada de la arquitectura del sistema de gestión de documentos.

---

## 📊 Diagrama de Arquitectura

```
┌─────────────────────────────────────────────────────────────────┐
│                          CLIENTE                                 │
│  (Frontend / Mobile / API Consumer)                             │
└────────────┬────────────────────────────────────────────────────┘
             │
             │ HTTP Request
             ▼
┌─────────────────────────────────────────────────────────────────┐
│                      API GATEWAY                                 │
│  (Routing, Authentication, Rate Limiting)                       │
└────────────┬────────────────────────────────────────────────────┘
             │
             │ Event
             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    LAMBDA HANDLERS                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │   Upload     │  │  Get Doc     │  │  Delete      │         │
│  │  Document    │  │  By ID       │  │  Document    │  ...    │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘         │
│         │                  │                  │                  │
│         └──────────────────┼──────────────────┘                 │
│                            │                                     │
└────────────────────────────┼─────────────────────────────────────┘
                             │
                             │ Service Call
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                   DOCUMENT SERVICE                               │
│  (Business Logic Layer)                                         │
│                                                                  │
│  • uploadDocument()         • getDocument()                     │
│  • generateUploadUrl()      • getDocumentsByUser()             │
│  • confirmUpload()          • deleteDocument()                  │
│  • updateDocumentStatus()   • getDownloadUrl()                 │
│                                                                  │
└───────────┬──────────────────────────────┬──────────────────────┘
            │                              │
            │                              │
            ▼                              ▼
┌─────────────────────┐      ┌──────────────────────────────────┐
│      AWS S3         │      │        AWS DynamoDB              │
│  (File Storage)     │      │     (Metadata Storage)           │
│                     │      │                                  │
│  documents/         │      │  Table: Items                    │
│  ├─ user-123/       │      │  ├─ PK: documentId               │
│  │  ├─ doc-1/       │      │  ├─ GSI: UserIdIndex            │
│  │  │  └─ file.pdf  │      │  └─ GSI: S3KeyIndex             │
│  │  └─ doc-2/       │      │                                  │
│  │     └─ file.txt  │      │                                  │
└─────────────────────┘      └──────────────────────────────────┘
```

---

## 🔄 Flujos de Operación

### Flujo 1: Upload Documento (Base64)

```
Cliente
  │
  │ POST /documents/upload
  │ { fileName, mimeType, fileContent, userId }
  │
  ▼
Handler: upload-document
  │
  │ 1. Valida payload
  │ 2. Decodifica base64 → Buffer
  │
  ▼
DocumentService.uploadDocument()
  │
  ├─► S3.putObject()
  │     │
  │     └─► documents/userId/docId/fileName
  │
  ├─► DynamoDB.create()
  │     │
  │     └─► Item { documentId, userId, s3Key, ... }
  │
  └─► Return: Document metadata
        │
        ▼
Cliente recibe:
{
  message: "Document uploaded successfully",
  document: { ... }
}
```

### Flujo 2: Upload Directo a S3 (Archivos Grandes)

```
Cliente
  │
  │ PASO 1: Generar URL
  │ POST /documents/upload-url
  │
  ▼
Handler: generate-upload-url
  │
  ▼
DocumentService.generateUploadUrl()
  │
  ├─► Genera documentId (UUID)
  ├─► Define s3Key
  └─► getSignedUrl() → URL prefirmada (15 min)
        │
        ▼
Cliente recibe:
{ uploadUrl, documentId, s3Key }
  │
  │ PASO 2: Upload directo
  │ PUT uploadUrl
  │ --data-binary @archivo.zip
  │
  ▼
S3 (sin pasar por Lambda)
  │
  │ PASO 3: Confirmar
  │ POST /documents/confirm-upload
  │ { documentId, s3Key, fileSize, ... }
  │
  ▼
Handler: confirm-upload
  │
  ▼
DocumentService.confirmUpload()
  │
  └─► DynamoDB.create()
        │
        └─► Item { documentId, s3Key, status: 'completed' }
```

### Flujo 3: Obtener Documento

```
Cliente
  │
  │ GET /documents/{id}?includeDownloadUrl=true
  │
  ▼
Handler: get-document
  │
  ▼
DocumentService.getDocument(id)
  │
  └─► DynamoDB.get(documentId)
        │
        ▼
      Metadata encontrada
        │
        ├─► DocumentService.getDownloadUrl(s3Key)
        │     │
        │     └─► getSignedUrl() → URL prefirmada (1 hora)
        │
        └─► Return { document, downloadUrl }
```

### Flujo 4: Listar Documentos por Usuario

```
Cliente
  │
  │ GET /users/{userId}/documents
  │
  ▼
Handler: get-documents-by-user
  │
  ▼
DocumentService.getDocumentsByUser(userId)
  │
  └─► DynamoDB.query(UserIdIndex)
        │
        └─► WHERE userId = :userId
              │
              ▼
            Return: Array[Document]
```

---

## 🗂️ Modelo de Datos

### DynamoDB Table: Items

```
┌─────────────────────────────────────────────────────────────────┐
│ Table: Items                                                    │
├─────────────────────────────────────────────────────────────────┤
│ Partition Key: documentId (String)                             │
│ Sort Key: -                                                     │
├─────────────────────────────────────────────────────────────────┤
│ Attributes:                                                     │
│  • documentId      : String  (PK)                              │
│  • userId          : String  (GSI-1-PK)                        │
│  • fileName        : String                                     │
│  • fileSize        : Number                                     │
│  • mimeType        : String                                     │
│  • s3Key           : String  (GSI-2-PK)                        │
│  • s3VersionId     : String                                     │
│  • uploadedAt      : String  (ISO 8601)                        │
│  • status          : String  (pending|processing|completed|failed)│
│  • createdAt       : String  (auto)                            │
│  • updatedAt       : String  (auto)                            │
├─────────────────────────────────────────────────────────────────┤
│ Global Secondary Indexes:                                       │
│                                                                  │
│  1. UserIdIndex                                                 │
│     • Partition Key: userId                                     │
│     • Projection: ALL                                           │
│     • Use Case: Listar documentos de un usuario                │
│                                                                  │
│  2. S3KeyIndex                                                  │
│     • Partition Key: s3Key                                      │
│     • Projection: ALL                                           │
│     • Use Case: Buscar documento por ubicación S3              │
└─────────────────────────────────────────────────────────────────┘
```

### S3 Bucket Structure

```
documents-bucket/
│
├── documents/
│   │
│   ├── user-123/
│   │   ├── doc-uuid-1/
│   │   │   └── document.pdf
│   │   │
│   │   ├── doc-uuid-2/
│   │   │   └── report.xlsx
│   │   │
│   │   └── doc-uuid-3/
│   │       └── image.png
│   │
│   ├── user-456/
│   │   └── doc-uuid-4/
│   │       └── contract.docx
│   │
│   └── user-789/
│       └── ...
│
└── (otros directorios si los hay)
```

**Patrón de S3 Keys:**
```
documents/{userId}/{documentId}/{fileName}
```

**Ejemplo:**
```
documents/user-123/550e8400-e29b-41d4-a716-446655440000/contract.pdf
```

## 📦 Capas de la Aplicación

### 1. Handler Layer (Presentación)

**Responsabilidades:**
- Recibir requests HTTP
- Validar estructura básica
- Parsear payloads
- Extraer parámetros
- Invocar servicios
- Formatear respuestas

**Archivos:**
- `src/handlers/*.ts`

**Ejemplo:**
```typescript
export const handler = async (event: APIGatewayEvent) => {
  // 1. Validar request
  if (!event.body) return badRequest('Body required');

  // 2. Parsear
  const { userId, fileName } = JSON.parse(event.body);

  // 3. Llamar servicio
  const doc = await documentService.uploadDocument(...);

  // 4. Retornar respuesta
  return created({ document: doc });
};
```

### 2. Service Layer (Lógica de Negocio)

**Responsabilidades:**
- Lógica de negocio
- Orquestación de operaciones
- Validaciones complejas
- Interacción con múltiples recursos
- Transformación de datos

**Archivos:**
- `src/services/*.ts`

**Ejemplo:**
```typescript
class DocumentService {
  async uploadDocument(...) {
    // 1. Subir a S3
    await s3Client.send(putCommand);

    // 2. Registrar en DynamoDB
    const item = await ItemModel.create(...);

    // 3. Retornar
    return item;
  }
}
```

### 3. Model/Schema Layer (Persistencia)

**Responsabilidades:**
- Definir estructura de datos
- Validar tipos
- Configurar índices
- Mapear objetos

**Archivos:**
- `src/models/*.ts`
- `src/schemas/*.ts`

### 4. Core Layer (Infraestructura)

**Responsabilidades:**
- Clientes AWS (S3, DynamoDB)
- Configuración
- Utilidades transversales

**Archivos:**
- `src/core/*.ts`

---

## 🔄 Estados del Documento

```
┌─────────┐
│ PENDING │  ← Inicial (después de upload)
└────┬────┘
     │
     │ Sistema de procesamiento
     ▼
┌────────────┐
│ PROCESSING │  ← En proceso (OCR, análisis, etc.)
└────┬───┬───┘
     │   │
     │   └────────┐
     ▼            ▼
┌───────────┐  ┌────────┐
│ COMPLETED │  │ FAILED │
└───────────┘  └────────┘
```

**Transiciones válidas:**
- `pending` → `processing`
- `processing` → `completed`
- `processing` → `failed`
- `failed` → `processing` (reintentar)

---

## 🚀 Escalabilidad

### Horizontal

```
┌──────────────┐
│ API Gateway  │
└───────┬──────┘
        │
        ├─► Lambda 1 ─┐
        ├─► Lambda 2 ─┤
        ├─► Lambda 3 ─┼─► S3 + DynamoDB
        ├─► Lambda 4 ─┤
        └─► Lambda N ─┘
```

**Características:**
- Lambdas escalan automáticamente
- Sin límite de concurrencia (configurable)
- S3 y DynamoDB escalan automáticamente

### Vertical (Mejoras futuras)

1. **CloudFront CDN** para archivos estáticos
2. **ElastiCache** para caché de metadatos frecuentes
3. **SQS** para procesamiento asíncrono
4. **Step Functions** para workflows complejos

---

## 📊 Patrones de Acceso

### Query Patterns

1. **Get document by ID**
   ```
   DynamoDB.get({ documentId })
   ```
   - Access Pattern: Directo por PK
   - Latency: ~1-5ms

2. **List user documents**
   ```
   DynamoDB.query(UserIdIndex, { userId })
   ```
   - Access Pattern: GSI query
   - Latency: ~5-10ms

3. **Find document by S3 key**
   ```
   DynamoDB.query(S3KeyIndex, { s3Key })
   ```
   - Access Pattern: GSI query
   - Latency: ~5-10ms

---

## 🔧 Configuración por Ambiente

### Development (LocalStack)
```yaml
AWS_ENDPOINT_URL: http://localhost:4566
S3_BUCKET_NAME: documents-bucket-local
```

### Staging
```yaml
AWS_REGION: us-west-2
S3_BUCKET_NAME: documents-bucket-staging
```

### Production
```yaml
AWS_REGION: us-west-2
S3_BUCKET_NAME: documents-bucket-prod
ENABLE_VERSIONING: true
ENABLE_ENCRYPTION: true
```

---

## 📈 Métricas a Monitorear

1. **Lambda:**
   - Invocations
   - Duration
   - Errors
   - Throttles

2. **S3:**
   - PUT requests
   - GET requests
   - Storage used
   - Bandwidth

3. **DynamoDB:**
   - Read/Write capacity units
   - Throttled requests
   - Item count
   - GSI performance

---

## 🔗 Integraciones Futuras

```
DocumentService
    │
    ├─► EventBridge → Process Pipeline
    ├─► SNS → Notifications
    ├─► SQS → Async tasks
    ├─► Lambda (Thumbnail) → Generate previews
    └─► Textract → OCR processing
```

---

Esta arquitectura está diseñada para ser:
- ✅ Escalable
- ✅ Mantenible
- ✅ Testeable
- ✅ Segura
- ✅ Cost-effective
