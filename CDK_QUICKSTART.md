# ⚡ CDK Quick Start - 5 Minutos

Guía ultra rápida para empezar con CDK.

---

## 🎯 ¿Qué es CDK?

AWS CDK (Cloud Development Kit) te permite definir infraestructura con código TypeScript en lugar de bash scripts.

**Antes:**
```bash
aws s3 mb s3://bucket
aws dynamodb create-table --table-name Items ...
```

**Ahora:**
```typescript
new DocumentBucket(this, 'Bucket', { config });
new DocumentTable(this, 'Table', { config });
```

---

## 🚀 Setup Inicial (Una sola vez)

```bash
# 1. Instalar CDK CLI
npm install -g aws-cdk

# 2. Ya está todo configurado en el proyecto
# (las dependencias ya están en package.json)
```

---

## ⚡ Deploy a LocalStack

```bash
# 1. Levantar LocalStack
npm run localstack:up

# 2. Esperar 10 segundos y deploy
npm run cdk:deploy:local

# 3. Verificar
npm run localstack:verify:win

# 4. Testear
npm run test:local
```

**Listo! Recursos creados en 30 segundos** ⏱️

---

## 🌍 Deploy a AWS (Dev/Staging/Prod)

### Primera vez en AWS

```bash
# 1. Configurar AWS credentials
aws configure

# 2. Bootstrap CDK (una sola vez por región)
npm run cdk:bootstrap:dev

# 3. Deploy
npm run cdk:deploy:dev
```

### Deployments siguientes

```bash
# Solo ejecuta deploy
npm run cdk:deploy:dev
```

---

## 🔧 Cambiar Configuración

### 1. Edita el config del ambiente

```typescript
// infra/config/local.ts
export const localConfig = {
  s3: {
    bucketName: 'mi-bucket-local',  // ← Cambiar aquí
    cors: { ... }
  }
}
```

### 2. Deploy el cambio

```bash
npm run cdk:deploy:local
```

**Eso es todo!** CDK detecta los cambios y actualiza solo lo necesario.

---

## 📋 Comandos Esenciales

```bash
# LocalStack (desarrollo local)
npm run cdk:deploy:local      # Deploy
npm run cdk:diff:local        # Ver cambios
npm run cdk:destroy:local     # Limpiar

# AWS Dev
npm run cdk:deploy:dev        # Deploy
npm run cdk:destroy:dev       # Limpiar

# AWS Staging
npm run cdk:deploy:staging    # Deploy (con confirmación)

# AWS Prod
npm run cdk:deploy:prod       # Deploy (con confirmación)
```

---

## 📁 Archivos Importantes

```
infra/
├── config/
│   ├── local.ts      ← Edita para LocalStack
│   ├── dev.ts        ← Edita para AWS Dev
│   ├── staging.ts    ← Edita para AWS Staging
│   └── prod.ts       ← Edita para AWS Prod
│
└── lib/
    ├── constructs/   ← Componentes reutilizables
    └── stacks/       ← Stacks de recursos
```

---

## 🎨 Qué Puedes Configurar

En cada ambiente (`local.ts`, `dev.ts`, etc.):

### S3
- ✅ Nombre del bucket
- ✅ Versionado
- ✅ Encriptación
- ✅ CORS origins
- ✅ Lifecycle rules (cuándo mover a IA o eliminar)

### DynamoDB
- ✅ Nombre de la tabla
- ✅ Billing mode (PAY_PER_REQUEST o PROVISIONED)
- ✅ Capacidad (si es PROVISIONED)
- ✅ Point-in-time recovery
- ✅ Streams

### Tags
- ✅ Environment, Project, CostCenter, etc.

---

## 🔍 Ver Qué Se Va a Cambiar

Antes de deploy, siempre puedes ver los cambios:

```bash
npm run cdk:diff:local
```

**Output:**
```
Stack SaasBackend-Storage-local
Resources
[~] AWS::S3::Bucket DocumentBucket
 └─ [~] Versioned: false → true
```

Luego decides si deployar o no.

---

## 🚨 Troubleshooting

### Error: "Cannot find module"

```bash
npm install
```

### Error: "Stack already exists"

```bash
npm run cdk:destroy:local
npm run cdk:deploy:local
```

### Error: "No credentials"

**LocalStack:**
```bash
# Ya configurado en .env.local
AWS_ACCESS_KEY_ID=test
AWS_SECRET_ACCESS_KEY=test
```

**AWS Real:**
```bash
aws configure
```

### LocalStack no responde

```bash
npm run localstack:down
npm run localstack:up
# Esperar 10 segundos
npm run cdk:deploy:local
```

---

## 💡 Tips

### 1. Siempre hacer diff primero

```bash
npm run cdk:diff:local   # Ver cambios
npm run cdk:deploy:local # Si todo OK, deploy
```

### 2. Destruir y recrear si hay problemas

```bash
npm run cdk:destroy:local
npm run cdk:deploy:local
```

### 3. Verificar recursos creados

```bash
npm run localstack:verify:win
```

### 4. Ver outputs del stack

```bash
aws --endpoint-url=http://localhost:4566 \
    cloudformation describe-stacks
```

**Para cambiar algo:**

1. Edita `infra/config/local.ts`
2. Ejecuta `npm run cdk:deploy:local`
3. Listo!

---

¡CDK hace la infraestructura más fácil de mantener! 🎉
