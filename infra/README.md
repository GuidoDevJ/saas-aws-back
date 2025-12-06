# 🏗️ Infraestructura con AWS CDK

Infraestructura como código usando AWS CDK para gestionar recursos de S3 y DynamoDB.

---

## 📂 Estructura

```
infra/
├── bin/
│   └── app.ts              # Entry point de CDK
│
├── lib/
│   ├── constructs/          # Componentes reutilizables
│   │   ├── document-bucket.ts
│   │   └── document-table.ts
│   │
│   └── stacks/             # Stacks CDK
│       └── storage-stack.ts
│
├── config/                 # Configuraciones por ambiente
│   ├── types.ts
│   ├── local.ts           # LocalStack
│   ├── dev.ts             # Desarrollo
│   ├── staging.ts         # Staging
│   ├── prod.ts            # Producción
│   └── index.ts
│
├── cdk.json               # Configuración CDK
└── tsconfig.json          # TypeScript config
```

---

## 🚀 Quick Start

### 1. Instalar CDK CLI (una sola vez)

```bash
npm install -g aws-cdk
```

### 2. Deploy a LocalStack

```bash
# Iniciar LocalStack
npm run localstack:up

# Esperar 10 segundos

# Bootstrap (primera vez)
npm run cdk:bootstrap:local

# Deploy
npm run cdk:deploy:local
```

### 3. Verificar

```bash
# Ver recursos creados
npm run localstack:verify:win

# Ver stack en LocalStack
aws --endpoint-url=http://localhost:4566 cloudformation describe-stacks
```

---

## 📋 Comandos Disponibles

### LocalStack (Desarrollo Local)

```bash
# Sintetizar (generar CloudFormation)
npm run cdk:synth:local

# Ver diferencias antes de deploy
npm run cdk:diff:local

# Deploy
npm run cdk:deploy:local

# Destruir stack
npm run cdk:destroy:local

# Bootstrap (primera vez)
npm run cdk:bootstrap:local
```

### AWS Real - Development

```bash
# Deploy a dev
npm run cdk:deploy:dev

# Destruir
npm run cdk:destroy:dev

# Bootstrap (primera vez)
npm run cdk:bootstrap:dev
```

### AWS Real - Staging

```bash
# Deploy a staging (requiere confirmación)
npm run cdk:deploy:staging
```

### AWS Real - Production

```bash
# Deploy a producción (requiere confirmación)
npm run cdk:deploy:prod
```

---

## 🔧 Configuración por Ambiente

### Local (LocalStack)

[config/local.ts](config/local.ts):
- Bucket: `documents-bucket-local`
- Tabla: `Items`
- Sin encriptación
- Sin versionado
- CORS: `*` (todos los orígenes)

### Development

[config/dev.ts](config/dev.ts):
- Bucket: `documents-bucket-dev`
- Tabla: `Items-dev`
- Encriptación: ✅
- Versionado: ✅
- Lifecycle: 90 días → IA, 365 días → Delete
- Streams: ✅

### Staging

[config/staging.ts](config/staging.ts):
- Bucket: `documents-bucket-staging`
- Tabla: `Items-staging`
- Encriptación: ✅
- Versionado: ✅
- Point-in-time recovery: ✅
- Lifecycle: 60 días → IA, 180 días → Delete

### Production

[config/prod.ts](config/prod.ts):
- Bucket: `documents-bucket-prod`
- Tabla: `Items-prod`
- Encriptación: ✅ (obligatorio)
- Versionado: ✅ (obligatorio)
- Point-in-time recovery: ✅ (obligatorio)
- Lifecycle: 30 días → IA
- Removal Policy: RETAIN (no se elimina)

---

## 📦 Recursos Creados

### S3 Bucket

**Características:**
- Nombre según ambiente
- CORS configurado
- Versionado (según ambiente)
- Encriptación (según ambiente)
- Lifecycle rules (según ambiente)
- Block public access: ✅
- EventBridge notifications: ✅

**Outputs:**
- `BucketName`: Nombre del bucket
- `BucketArn`: ARN del bucket

### DynamoDB Table

**Características:**
- Partition Key: `documentId`
- GSI 1: `UserIdIndex` → `userId`
- GSI 2: `S3KeyIndex` → `s3Key`
- Billing: PAY_PER_REQUEST o PROVISIONED
- Point-in-time recovery (según ambiente)
- DynamoDB Streams (según ambiente)

**Outputs:**
- `TableName`: Nombre de la tabla
- `TableArn`: ARN de la tabla
- `TableStreamArn`: ARN del stream (si está habilitado)

---

## 🎯 Workflows Comunes

### Primera vez - LocalStack

```bash
# 1. Levantar LocalStack
npm run localstack:up

# 2. Bootstrap CDK
npm run cdk:bootstrap:local

# 3. Deploy
npm run cdk:deploy:local

# 4. Verificar
npm run localstack:verify:win
```

### Primera vez - AWS Dev

```bash
# 1. Configurar credentials AWS
aws configure

# 2. Bootstrap CDK (una sola vez por región/cuenta)
npm run cdk:bootstrap:dev

# 3. Deploy
npm run cdk:deploy:dev

# 4. Verificar en AWS Console
```

### Actualizar infraestructura

```bash
# 1. Modificar código en lib/ o config/

# 2. Ver cambios
npm run cdk:diff:local  # o :dev, :staging, :prod

# 3. Deploy
npm run cdk:deploy:local  # o el ambiente que necesites
```

### Destruir recursos

```bash
# LocalStack
npm run cdk:destroy:local

# Dev (¡CUIDADO! Elimina todo)
npm run cdk:destroy:dev
```

---

## 🔍 Debugging

### Ver stack sintetizado

```bash
npm run cdk:synth:local
cat infra/cdk.out/*.template.json
```

### Ver diferencias antes de deploy

```bash
npm run cdk:diff:local
```

### Ver outputs del stack

```bash
# LocalStack
aws --endpoint-url=http://localhost:4566 \
    cloudformation describe-stacks \
    --stack-name SaasBackend-Storage-local

# AWS Real
aws cloudformation describe-stacks \
    --stack-name SaasBackend-Storage-dev
```

---

## 🎨 Personalización

### Cambiar configuración de un ambiente

Edita el archivo correspondiente en `config/`:
- `local.ts` - LocalStack
- `dev.ts` - Development
- `staging.ts` - Staging
- `prod.ts` - Production

### Agregar nuevo ambiente

1. Crear `config/qa.ts`:
```typescript
export const qaConfig: EnvironmentConfig = {
  environmentName: 'qa',
  region: 'us-east-1',
  // ... configuración
};
```

2. Agregar en `config/index.ts`:
```typescript
case 'qa':
  return qaConfig;
```

3. Agregar script en `package.json`:
```json
"cdk:deploy:qa": "cd infra && ENVIRONMENT=qa cdk deploy"
```

### Crear nuevo construct

1. Crear archivo en `lib/constructs/mi-recurso.ts`
2. Implementar construct extendiendo `Construct`
3. Exportar en `lib/constructs/index.ts`
4. Usar en stack

---

## 🚨 Troubleshooting

### Error: "Cannot find module"

```bash
# Reinstalar dependencias
cd infra
npm install
```

### Error: "Stack already exists"

```bash
# Destruir y recrear
npm run cdk:destroy:local
npm run cdk:deploy:local
```

### Error: "No credentials"

```bash
# LocalStack
export AWS_ACCESS_KEY_ID=test
export AWS_SECRET_ACCESS_KEY=test

# AWS Real
aws configure
```

### Error: "Bootstrap required"

```bash
# Ejecutar bootstrap primero
npm run cdk:bootstrap:local  # o :dev
```

### LocalStack no responde

```bash
# Reiniciar
npm run localstack:down
npm run localstack:up

# Esperar 10 segundos y probar
npm run localstack:health
```

---

## 📚 Recursos

- [AWS CDK Docs](https://docs.aws.amazon.com/cdk/)
- [CDK API Reference](https://docs.aws.amazon.com/cdk/api/v2/)
- [LocalStack Docs](https://docs.localstack.cloud/)
- [cdklocal CLI](https://github.com/localstack/aws-cdk-local)

---

## 🔐 Best Practices

1. **Nunca hardcodear credentials** - Usa IAM roles y profiles
2. **Usar tags** - Para tracking y billing
3. **Review diffs** - Antes de deploy a prod
4. **Backup antes de destruir** - Especialmente en prod
5. **Usar RETAIN en prod** - Para recursos críticos
6. **Habilitar encriptación** - En todos los ambientes no-local
7. **Configurar lifecycle rules** - Para optimizar costos

---

¡Infraestructura lista! 🎉
