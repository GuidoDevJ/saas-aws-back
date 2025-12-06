# Guía de Testing Local con LocalStack

Esta guía te muestra cómo probar todas las lambdas localmente usando LocalStack.

## Requisitos Previos

- Docker instalado y corriendo
- LocalStack instalado
- AWS CLI instalado
- Node.js y npm instalados

## 1. Configuración Inicial

### 1.1 Instalar LocalStack

```bash
# Opción 1: Con pip
pip install localstack

# Opción 2: Con Homebrew (Mac)
brew install localstack/tap/localstack-cli

# Opción 3: Usar Docker directamente (ver sección 1.2)
```

### 1.2 Levantar LocalStack con Docker

Crea un archivo `docker-compose.yml` en la raíz del proyecto:

```yaml
version: '3.8'

services:
  localstack:
    image: localstack/localstack:latest
    ports:
      - "4566:4566"            # LocalStack Gateway
      - "4510-4559:4510-4559"  # servicios externos
    environment:
      - SERVICES=s3,dynamodb
      - DEBUG=1
      - DATA_DIR=/tmp/localstack/data
      - DOCKER_HOST=unix:///var/run/docker.sock
    volumes:
      - "./localstack-data:/tmp/localstack"
      - "/var/run/docker.sock:/var/run/docker.sock"
```

Inicia LocalStack:

```bash
docker-compose up -d
```

Verifica que está corriendo:

```bash
# Ver logs
docker-compose logs -f

# Verificar estado
curl http://localhost:4566/_localstack/health
```

## 2. Configurar AWS CLI para LocalStack

### 2.1 Crear perfil de AWS para LocalStack

Edita `~/.aws/credentials` y agrega:

```ini
[localstack]
aws_access_key_id = test
aws_secret_access_key = test
```

Edita `~/.aws/config` y agrega:

```ini
[profile localstack]
region = us-west-2
output = json
```

### 2.2 Configurar variables de entorno

Crea un archivo `.env.local` en la raíz del proyecto:

```bash
# AWS LocalStack
AWS_ENDPOINT_URL=http://localhost:4566
AWS_ACCESS_KEY_ID=test
AWS_SECRET_ACCESS_KEY=test
AWS_REGION=us-west-2

# S3
S3_BUCKET_NAME=documents-bucket-local

# DynamoDB
DYNAMODB_TABLE_NAME=Items
```

## 3. Crear Recursos en LocalStack

### 3.1 Crear Bucket de S3

```bash
# Crear el bucket
aws --endpoint-url=http://localhost:4566 \
    s3 mb s3://documents-bucket-local

# Verificar que se creó
aws --endpoint-url=http://localhost:4566 \
    s3 ls

# Configurar CORS (opcional, para upload directo)
aws --endpoint-url=http://localhost:4566 \
    s3api put-bucket-cors \
    --bucket documents-bucket-local \
    --cors-configuration file://s3-cors.json
```

Crea el archivo `s3-cors.json`:

```json
{
  "CORSRules": [
    {
      "AllowedHeaders": ["*"],
      "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
      "AllowedOrigins": ["*"],
      "ExposeHeaders": ["ETag"]
    }
  ]
}
```

### 3.2 Crear Tabla de DynamoDB

```bash
# Crear la tabla
aws --endpoint-url=http://localhost:4566 \
    dynamodb create-table \
    --table-name Items \
    --attribute-definitions \
        AttributeName=documentId,AttributeType=S \
        AttributeName=userId,AttributeType=S \
        AttributeName=s3Key,AttributeType=S \
    --key-schema \
        AttributeName=documentId,KeyType=HASH \
    --billing-mode PAY_PER_REQUEST \
    --global-secondary-indexes \
        "[
          {
            \"IndexName\": \"UserIdIndex\",
            \"KeySchema\": [{\"AttributeName\":\"userId\",\"KeyType\":\"HASH\"}],
            \"Projection\": {\"ProjectionType\":\"ALL\"}
          },
          {
            \"IndexName\": \"S3KeyIndex\",
            \"KeySchema\": [{\"AttributeName\":\"s3Key\",\"KeyType\":\"HASH\"}],
            \"Projection\": {\"ProjectionType\":\"ALL\"}
          }
        ]"

# Verificar que se creó
aws --endpoint-url=http://localhost:4566 \
    dynamodb list-tables

# Ver detalles de la tabla
aws --endpoint-url=http://localhost:4566 \
    dynamodb describe-table \
    --table-name Items
```

## 4. Configurar el Código para LocalStack

### 4.1 Actualizar configuración de S3

Edita `src/core/s3.ts`:

```typescript
import { S3Client } from '@aws-sdk/client-s3';

/**
 * Cliente de S3 configurado para AWS SDK v3
 * Soporta LocalStack para desarrollo local
 */
export const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-west-2',
  ...(process.env.AWS_ENDPOINT_URL && {
    endpoint: process.env.AWS_ENDPOINT_URL,
    forcePathStyle: true, // Necesario para LocalStack
  }),
});

export const BUCKET_NAME = process.env.S3_BUCKET_NAME || 'documents-bucket';
```

### 4.2 Actualizar configuración de DynamoDB

Edita `src/core/dynamo.ts`:

```typescript
import { DynamoDB } from '@aws-sdk/client-dynamodb';
import * as dynamoose from 'dynamoose';

/**
 * Cliente de DynamoDB configurado para AWS SDK v3
 * Soporta LocalStack para desarrollo local
 */
const ddb = new DynamoDB({
  region: process.env.AWS_REGION || 'us-west-2',
  ...(process.env.AWS_ENDPOINT_URL && {
    endpoint: process.env.AWS_ENDPOINT_URL,
  }),
});

dynamoose.aws.ddb.set(ddb);

export { dynamoose };
```

## 5. Crear Scripts de Testing

### 5.1 Instalar dependencias para testing

```bash
npm install --save-dev dotenv ts-node
```

### 5.2 Crear script de testing

Crea `src/test/test-handlers.ts`:

```typescript
import * as dotenv from 'dotenv';
import { handler as uploadDocument } from '../handlers/upload-document';
import { handler as generateUploadUrl } from '../handlers/generate-upload-url';
import { handler as confirmUpload } from '../handlers/confirm-upload';
import { handler as getDocument } from '../handlers/get-document';
import { handler as getDocumentsByUser } from '../handlers/get-documents-by-user';
import { handler as deleteDocument } from '../handlers/delete-document';
import { handler as updateDocumentStatus } from '../handlers/update-document-status';
import { APIGatewayEvent } from '../types/lambda.types';
import * as fs from 'fs';

// Cargar variables de entorno
dotenv.config({ path: '.env.local' });

/**
 * Helper para crear un evento mock de API Gateway
 */
function createMockEvent(
  httpMethod: string,
  body?: any,
  pathParameters?: any,
  queryStringParameters?: any
): APIGatewayEvent {
  return {
    body: body ? JSON.stringify(body) : null,
    headers: {
      'Content-Type': 'application/json',
    },
    httpMethod,
    path: '/',
    queryStringParameters,
    pathParameters,
    requestContext: {
      requestId: 'test-request-id',
      authorizer: {
        claims: {
          sub: 'test-user-123',
        },
      },
    },
  } as APIGatewayEvent;
}

/**
 * Tests
 */
async function runTests() {
  console.log('🚀 Iniciando tests de handlers...\n');

  try {
    // Test 1: Upload Document (con base64)
    console.log('📤 Test 1: Upload Document');
    const testContent = 'Este es un archivo de prueba';
    const base64Content = Buffer.from(testContent).toString('base64');

    const uploadEvent = createMockEvent('POST', {
      fileName: 'test-document.txt',
      mimeType: 'text/plain',
      fileContent: base64Content,
      userId: 'user-test-123',
    });

    const uploadResult = await uploadDocument(uploadEvent);
    console.log('Resultado:', JSON.parse(uploadResult.body));
    console.log('Status:', uploadResult.statusCode);

    const uploadedDoc = JSON.parse(uploadResult.body).document;
    const documentId = uploadedDoc.documentId;
    console.log('✅ Documento subido con ID:', documentId, '\n');

    // Test 2: Get Document
    console.log('📥 Test 2: Get Document');
    const getEvent = createMockEvent(
      'GET',
      null,
      { documentId },
      { includeDownloadUrl: 'true' }
    );

    const getResult = await getDocument(getEvent);
    console.log('Resultado:', JSON.parse(getResult.body));
    console.log('✅ Documento obtenido\n');

    // Test 3: Get Documents by User
    console.log('📋 Test 3: Get Documents by User');
    const getUserDocsEvent = createMockEvent(
      'GET',
      null,
      { userId: 'user-test-123' }
    );

    const getUserDocsResult = await getDocumentsByUser(getUserDocsEvent);
    console.log('Resultado:', JSON.parse(getUserDocsResult.body));
    console.log('✅ Documentos del usuario obtenidos\n');

    // Test 4: Update Document Status
    console.log('🔄 Test 4: Update Document Status');
    const updateEvent = createMockEvent(
      'PATCH',
      { status: 'processing' },
      { documentId }
    );

    const updateResult = await updateDocumentStatus(updateEvent);
    console.log('Resultado:', JSON.parse(updateResult.body));
    console.log('✅ Estado actualizado\n');

    // Test 5: Generate Upload URL
    console.log('🔗 Test 5: Generate Upload URL');
    const genUrlEvent = createMockEvent('POST', {
      fileName: 'large-file.zip',
      mimeType: 'application/zip',
      userId: 'user-test-123',
    });

    const genUrlResult = await generateUploadUrl(genUrlEvent);
    const urlData = JSON.parse(genUrlResult.body);
    console.log('Resultado:', urlData);
    console.log('✅ URL generada\n');

    // Test 6: Confirm Upload
    console.log('✔️ Test 6: Confirm Upload');
    const confirmEvent = createMockEvent('POST', {
      documentId: urlData.documentId,
      s3Key: urlData.s3Key,
      fileSize: 1024,
      userId: 'user-test-123',
      fileName: 'large-file.zip',
      mimeType: 'application/zip',
    });

    const confirmResult = await confirmUpload(confirmEvent);
    console.log('Resultado:', JSON.parse(confirmResult.body));
    console.log('✅ Upload confirmado\n');

    // Test 7: Delete Document
    console.log('🗑️ Test 7: Delete Document');
    const deleteEvent = createMockEvent(
      'DELETE',
      null,
      { documentId }
    );

    const deleteResult = await deleteDocument(deleteEvent);
    console.log('Resultado:', JSON.parse(deleteResult.body));
    console.log('✅ Documento eliminado\n');

    console.log('🎉 Todos los tests completados exitosamente!');
  } catch (error) {
    console.error('❌ Error en tests:', error);
    process.exit(1);
  }
}

// Ejecutar tests
runTests();
```

### 5.3 Agregar script al package.json

Edita `package.json`:

```json
{
  "scripts": {
    "test:local": "ts-node src/test/test-handlers.ts"
  }
}
```

## 6. Ejecutar Tests

### 6.1 Iniciar LocalStack

```bash
docker-compose up -d
```

### 6.2 Crear recursos

```bash
# Ejecutar todos los comandos de la sección 3
```

### 6.3 Ejecutar tests

```bash
npm run test:local
```

## 7. Testing Manual con cURL

### 7.1 Preparar función Lambda (simulada)

Crea `test-local.js`:

```javascript
require('dotenv').config({ path: '.env.local' });

const handler = require('./dist/handlers/upload-document').handler;

// Simular evento
const event = {
  body: JSON.stringify({
    fileName: 'test.txt',
    mimeType: 'text/plain',
    fileContent: Buffer.from('Hello World').toString('base64'),
    userId: 'user-123'
  }),
  headers: {},
  httpMethod: 'POST',
  path: '/',
  requestContext: { requestId: 'test' }
};

handler(event).then(result => {
  console.log(JSON.stringify(result, null, 2));
});
```

Compila y ejecuta:

```bash
npm run build
node test-local.js
```

## 8. Verificar Recursos en LocalStack

### 8.1 Ver archivos en S3

```bash
# Listar objetos en el bucket
aws --endpoint-url=http://localhost:4566 \
    s3 ls s3://documents-bucket-local --recursive

# Descargar un archivo
aws --endpoint-url=http://localhost:4566 \
    s3 cp s3://documents-bucket-local/documents/user-123/xxx/test.txt ./downloaded.txt
```

### 8.2 Ver items en DynamoDB

```bash
# Escanear toda la tabla
aws --endpoint-url=http://localhost:4566 \
    dynamodb scan \
    --table-name Items

# Obtener un item específico
aws --endpoint-url=http://localhost:4566 \
    dynamodb get-item \
    --table-name Items \
    --key '{"documentId": {"S": "tu-document-id"}}'

# Query por userId (usando GSI)
aws --endpoint-url=http://localhost:4566 \
    dynamodb query \
    --table-name Items \
    --index-name UserIdIndex \
    --key-condition-expression "userId = :userId" \
    --expression-attribute-values '{":userId": {"S": "user-test-123"}}'
```

## 9. Troubleshooting

### Problema: No se puede conectar a LocalStack

```bash
# Verificar que el contenedor está corriendo
docker ps | grep localstack

# Ver logs
docker-compose logs localstack

# Reiniciar LocalStack
docker-compose restart localstack
```

### Problema: Error de credenciales AWS

```bash
# Asegúrate de tener las variables de entorno
export AWS_ACCESS_KEY_ID=test
export AWS_SECRET_ACCESS_KEY=test
export AWS_ENDPOINT_URL=http://localhost:4566
```

### Problema: Tabla no existe

```bash
# Listar tablas
aws --endpoint-url=http://localhost:4566 dynamodb list-tables

# Recrear tabla si es necesario
# (ver sección 3.2)
```

### Problema: Bucket no existe

```bash
# Listar buckets
aws --endpoint-url=http://localhost:4566 s3 ls

# Recrear bucket si es necesario
# (ver sección 3.1)
```

## 10. Limpiar Recursos

### 10.1 Limpiar datos de LocalStack

```bash
# Eliminar todos los items de DynamoDB
aws --endpoint-url=http://localhost:4566 \
    dynamodb delete-table \
    --table-name Items

# Eliminar todos los archivos de S3
aws --endpoint-url=http://localhost:4566 \
    s3 rm s3://documents-bucket-local --recursive

# Eliminar bucket
aws --endpoint-url=http://localhost:4566 \
    s3 rb s3://documents-bucket-local
```

### 10.2 Detener LocalStack

```bash
# Detener contenedor
docker-compose down

# Detener y eliminar volúmenes
docker-compose down -v
```

## 11. Scripts Útiles

Crea un archivo `scripts/setup-localstack.sh`:

```bash
#!/bin/bash

echo "🚀 Configurando LocalStack..."

# Crear bucket S3
echo "📦 Creando bucket S3..."
aws --endpoint-url=http://localhost:4566 s3 mb s3://documents-bucket-local

# Crear tabla DynamoDB
echo "🗄️ Creando tabla DynamoDB..."
aws --endpoint-url=http://localhost:4566 \
    dynamodb create-table \
    --table-name Items \
    --attribute-definitions \
        AttributeName=documentId,AttributeType=S \
        AttributeName=userId,AttributeType=S \
        AttributeName=s3Key,AttributeType=S \
    --key-schema \
        AttributeName=documentId,KeyType=HASH \
    --billing-mode PAY_PER_REQUEST \
    --global-secondary-indexes \
        "[
          {
            \"IndexName\": \"UserIdIndex\",
            \"KeySchema\": [{\"AttributeName\":\"userId\",\"KeyType\":\"HASH\"}],
            \"Projection\": {\"ProjectionType\":\"ALL\"}
          },
          {
            \"IndexName\": \"S3KeyIndex\",
            \"KeySchema\": [{\"AttributeName\":\"s3Key\",\"KeyType\":\"HASH\"}],
            \"Projection\": {\"ProjectionType\":\"ALL\"}
          }
        ]"

echo "✅ LocalStack configurado correctamente!"
```

Hazlo ejecutable:

```bash
chmod +x scripts/setup-localstack.sh
```

## 12. Resumen de Comandos

```bash
# 1. Iniciar LocalStack
docker-compose up -d

# 2. Configurar recursos
./scripts/setup-localstack.sh

# 3. Ejecutar tests
npm run test:local

# 4. Verificar S3
aws --endpoint-url=http://localhost:4566 s3 ls s3://documents-bucket-local --recursive

# 5. Verificar DynamoDB
aws --endpoint-url=http://localhost:4566 dynamodb scan --table-name Items

# 6. Limpiar
docker-compose down -v
```

## 13. Tips Adicionales

1. **GUI para LocalStack**: Puedes usar [LocalStack Desktop](https://localstack.cloud/products/desktop/) para visualizar recursos

2. **Debugging**: Activa logs detallados con `DEBUG=1` en docker-compose

3. **Persistencia**: LocalStack Free no persiste datos entre reinicios. Considera LocalStack Pro si necesitas persistencia

4. **Hot Reload**: Usa `nodemon` o `ts-node-dev` para desarrollo con hot reload

5. **Testing con Postman**: Importa una colección de Postman con todos los endpoints configurados para `http://localhost:3000` (si usas un API Gateway local)
