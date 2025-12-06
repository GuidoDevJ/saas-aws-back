# 📦 Resumen del Proyecto - Backend SaaS

Sistema completo de gestión de documentos usando AWS Lambda, S3 y DynamoDB, con soporte para testing local con LocalStack.

---

## 🎯 ¿Qué se creó?

### ✅ Infraestructura Core
- **S3 Client** configurado con soporte para LocalStack ([src/core/s3.ts](src/core/s3.ts))
- **DynamoDB Client** configurado con soporte para LocalStack ([src/core/dynamo.ts](src/core/dynamo.ts))
- **Funciones HTTP helpers** para respuestas estandarizadas ([src/core/http.ts](src/core/http.ts))
- **Sistema de validación** con AJV ([src/core/validation.ts](src/core/validation.ts))

### ✅ Modelos y Esquemas
- **Interfaz Item** con tipos TypeScript ([src/models/item.ts](src/models/item.ts))
- **Esquema Dynamoose** con índices optimizados ([src/schemas/item.ts](src/schemas/item.ts))
  - Índice global: `UserIdIndex` (consultas por usuario)
  - Índice global: `S3KeyIndex` (búsquedas por ubicación S3)

### ✅ Servicio de Negocio
**DocumentService** ([src/services/document.service.ts](src/services/document.service.ts)) con 9 métodos:
1. `uploadDocument()` - Sube archivo a S3 y registra en DynamoDB
2. `getDocument()` - Obtiene documento por ID
3. `getDocumentsByUser()` - Lista documentos de un usuario
4. `getDownloadUrl()` - Genera URL prefirmada de descarga
5. `deleteDocument()` - Elimina de S3 y DynamoDB
6. `updateDocumentStatus()` - Actualiza estado de procesamiento
7. `generateUploadUrl()` - Genera URL para subida directa a S3
8. `confirmUpload()` - Registra documento subido directamente
9. Manejo completo de errores y validaciones

### ✅ Lambda Handlers (7 endpoints)
1. **upload-document.ts** - Subir documento codificado en base64
2. **generate-upload-url.ts** - Generar URL prefirmada para archivos grandes
3. **confirm-upload.ts** - Confirmar subida directa a S3
4. **get-document.ts** - Obtener documento por ID (con URL de descarga opcional)
5. **get-documents-by-user.ts** - Listar todos los documentos de un usuario
6. **delete-document.ts** - Eliminar documento completo
7. **update-document-status.ts** - Actualizar estado de procesamiento

### ✅ Testing Local
- **docker-compose.yml** - Configuración de LocalStack
- **Scripts de setup** para Linux/Mac y Windows
- **Suite de tests automáticos** ([src/test/test-handlers.ts](src/test/test-handlers.ts))
- **Scripts npm** para facilitar el desarrollo

### ✅ Documentación
- **README.md** - Documentación principal del proyecto
- **TESTING.md** - Guía completa de testing con LocalStack
- **QUICKSTART.md** - Guía rápida de 5 minutos
- **RESUMEN.md** - Este archivo

---

## 🚀 Cómo Empezar

### Opción 1: Quick Start (5 minutos)
```bash
npm install
npm run dev
```

### Opción 2: Paso a Paso
```bash
# 1. Instalar dependencias
npm install

# 2. Levantar LocalStack
npm run localstack:up

# 3. Crear recursos AWS (S3 + DynamoDB)
npm run localstack:setup:win  # Windows
# o
npm run localstack:setup      # Linux/Mac

# 4. Ejecutar tests
npm run test:local
```

---

## 📂 Estructura del Proyecto

```
back/
├── src/
│   ├── core/                     # Configuraciones base
│   │   ├── dynamo.ts            # Cliente DynamoDB
│   │   ├── s3.ts                # Cliente S3
│   │   ├── http.ts              # Helpers HTTP
│   │   ├── validation.ts        # Validación AJV
│   │   └── index.ts             # Exportaciones
│   │
│   ├── models/                   # Interfaces TypeScript
│   │   └── item.ts              # Modelo de documento
│   │
│   ├── schemas/                  # Esquemas Dynamoose
│   │   └── item.ts              # Esquema tabla Items
│   │
│   ├── services/                 # Lógica de negocio
│   │   └── document.service.ts  # Servicio de documentos
│   │
│   ├── handlers/                 # Lambda handlers
│   │   ├── upload-document.ts
│   │   ├── generate-upload-url.ts
│   │   ├── confirm-upload.ts
│   │   ├── get-document.ts
│   │   ├── get-documents-by-user.ts
│   │   ├── delete-document.ts
│   │   ├── update-document-status.ts
│   │   └── index.ts
│   │
│   ├── types/                    # Tipos TypeScript
│   │   └── lambda.types.ts      # Tipos Lambda/API Gateway
│   │
│   └── test/                     # Tests
│       └── test-handlers.ts     # Suite de tests
│
├── scripts/                      # Scripts de utilidad
│   ├── setup-localstack.sh      # Setup Linux/Mac
│   └── setup-localstack.bat     # Setup Windows
│
├── docker-compose.yml            # LocalStack config
├── s3-cors.json                 # Configuración CORS S3
├── .env.local                   # Variables de entorno local
├── tsconfig.json                # Config TypeScript
├── package.json                 # Dependencias y scripts
├── .gitignore                   # Archivos ignorados
├── README.md                    # Documentación principal
├── TESTING.md                   # Guía de testing
├── QUICKSTART.md                # Guía rápida
└── RESUMEN.md                   # Este archivo
```

---

## 🎨 Arquitectura

### Flujo de Subida (Base64)
```
Cliente → Lambda (upload-document)
  ↓
  ├─→ S3: Guarda archivo
  └─→ DynamoDB: Registra metadatos
  ↓
Respuesta con documento creado
```

### Flujo de Subida (Directa a S3)
```
Cliente → Lambda (generate-upload-url)
  ↓
Recibe URL prefirmada
  ↓
Cliente → S3 (PUT directo)
  ↓
Cliente → Lambda (confirm-upload)
  ↓
  └─→ DynamoDB: Registra metadatos
  ↓
Respuesta confirmación
```

### Separación de Responsabilidades
```
Handlers (capa HTTP)
    ↓
Services (lógica de negocio)
    ↓
Schemas/Models (persistencia)
    ↓
Core (clientes AWS)
```

---

## 🔧 Scripts Disponibles

```bash
# Desarrollo
npm run dev                    # Todo en uno: inicia LocalStack, crea recursos y ejecuta tests

# Testing
npm run test:local             # Ejecutar tests

# Build
npm run build                  # Compilar TypeScript
```

---

## 📊 Tests Incluidos

La suite de tests cubre:

1. ✅ Upload de documento (base64)
2. ✅ Get documento por ID (con URL de descarga)
3. ✅ Get documentos por usuario
4. ✅ Update estado a "processing"
5. ✅ Update estado a "completed"
6. ✅ Generate URL prefirmada
7. ✅ Confirm upload directo
8. ✅ Get todos los documentos (verifica 2 documentos)
9. ✅ Delete documento
10. ✅ Get documento eliminado (debe fallar con 404)
11. ✅ Manejo de errores (validación)

---

## 🛠️ Comandos Útiles AWS CLI

### S3
```bash
# Listar archivos
aws --endpoint-url=http://localhost:4566 s3 ls s3://documents-bucket-local --recursive

# Descargar archivo
aws --endpoint-url=http://localhost:4566 s3 cp s3://documents-bucket-local/path/file.txt ./file.txt

# Eliminar archivo
aws --endpoint-url=http://localhost:4566 s3 rm s3://documents-bucket-local/path/file.txt
```

### DynamoDB
```bash
# Listar tablas
aws --endpoint-url=http://localhost:4566 dynamodb list-tables

# Escanear tabla
aws --endpoint-url=http://localhost:4566 dynamodb scan --table-name Items

# Get item
aws --endpoint-url=http://localhost:4566 dynamodb get-item \
  --table-name Items \
  --key '{"documentId": {"S": "tu-id"}}'

# Query por userId
aws --endpoint-url=http://localhost:4566 dynamodb query \
  --table-name Items \
  --index-name UserIdIndex \
  --key-condition-expression "userId = :userId" \
  --expression-attribute-values '{":userId": {"S": "user-123"}}'
```

---

## 🔐 Configuración

### Variables de Entorno (.env.local)
```bash
AWS_ENDPOINT_URL=http://localhost:4566
AWS_ACCESS_KEY_ID=test
AWS_SECRET_ACCESS_KEY=test
AWS_REGION=us-west-2
S3_BUCKET_NAME=documents-bucket-local
DYNAMODB_TABLE_NAME=Items
```

### Recursos Requeridos

**S3 Bucket:**
- Nombre: `documents-bucket-local`
- CORS configurado para uploads directos

**DynamoDB Table:**
- Nombre: `Items`
- Partition Key: `documentId` (String)
- GSI 1: `UserIdIndex` → `userId`
- GSI 2: `S3KeyIndex` → `s3Key`
- Billing: PAY_PER_REQUEST

---

## 📝 Características Técnicas

### Seguridad
- Validación de payloads con AJV
- URLs prefirmadas con expiración
- Control de tamaño de archivos
- Estados de procesamiento

### Optimizaciones
- Índices globales para consultas eficientes
- Subida directa a S3 para archivos grandes
- Timestamps automáticos
- Versionado de S3

### Manejo de Errores
- Respuestas HTTP estandarizadas
- Validación en múltiples capas
- Logging detallado
- Error handling en todos los handlers

---

## 🎓 Código Comentado

**TODO el código está completamente documentado con:**
- Comentarios JSDoc en todas las funciones
- Descripción de parámetros y retornos
- Explicación del flujo de trabajo
- Ejemplos de uso en README


## 💡 Tips

1. **LocalStack gratis** no persiste datos entre reinicios
2. Usa `npm run dev` para setup automático
3. Los tests se ejecutan en ~10 segundos
4. Todos los handlers siguen el mismo patrón arquitectónico
5. El código está listo para producción (solo falta auth)

---

## 📞 Recursos

- [Documentación LocalStack](https://docs.localstack.cloud/)
- [AWS SDK v3 Docs](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/)
- [Dynamoose Docs](https://dynamoosejs.com/)
- [API Gateway Event Format](https://docs.aws.amazon.com/lambda/latest/dg/services-apigateway.html)

---

¡Todo listo para testing local! 🎉
