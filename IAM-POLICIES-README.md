# 🔐 Políticas IAM para Deployment

## ⚠️ Problema: Límite de Caracteres

AWS tiene un límite de **6,144 caracteres** para políticas IAM inline. La política original excedía este límite.

## ✅ Solución: 4 Políticas Separadas

He dividido los permisos en **4 políticas más pequeñas** que cumplen con el límite:

---

## 📄 Políticas Creadas

### 1. `iam-policy-1-core.json` - Core Services
**Servicios:** CloudFormation, S3, DynamoDB, Lambda

**Permisos:**
- ✅ CloudFormation: Crear/actualizar/eliminar stacks
- ✅ S3: Buckets de documentos y CDK
- ✅ DynamoDB: Tabla Items con índices
- ✅ Lambda: Todas las funciones

**Tamaño:** ~700 caracteres ✅

---

### 2. `iam-policy-2-api.json` - API & Monitoring
**Servicios:** API Gateway, CloudWatch, SNS, X-Ray

**Permisos:**
- ✅ API Gateway: Gestión completa de REST API
- ✅ Execute API: Invocación y conexiones
- ✅ CloudWatch: Logs, métricas, dashboards, alarmas
- ✅ SNS: Tópicos de notificación
- ✅ X-Ray: Tracing distribuido

**Tamaño:** ~550 caracteres ✅

---

### 3. `iam-policy-3-iam.json` - IAM Management
**Servicios:** IAM, STS

**Permisos:**
- ✅ IAM Roles: Crear roles para Lambda y CDK
- ✅ IAM Policies: Gestión de políticas
- ✅ STS: AssumeRole para CDK

**Tamaño:** ~850 caracteres ✅

---

### 4. `iam-policy-4-cdk.json` - CDK Bootstrap
**Servicios:** ECR, SSM

**Permisos:**
- ✅ ECR: Repositorios para assets de CDK
- ✅ SSM: Parameter Store para bootstrap

**Tamaño:** ~450 caracteres ✅

---

## 🚀 Cómo Usar

### Opción A: Via AWS Console (Recomendado)

1. **Crear las 4 políticas:**
   ```
   IAM Console → Policies → Create Policy → JSON
   ```
   - Copiar contenido de `iam-policy-1-core.json` → Nombre: `SaasBackend-CoreServices`
   - Copiar contenido de `iam-policy-2-api.json` → Nombre: `SaasBackend-APIMonitoring`
   - Copiar contenido de `iam-policy-3-iam.json` → Nombre: `SaasBackend-IAM`
   - Copiar contenido de `iam-policy-4-cdk.json` → Nombre: `SaasBackend-CDKBootstrap`

2. **Crear usuario IAM:**
   ```
   IAM Console → Users → Create User
   Nombre: saas-backend-deployer
   Access type: Programmatic access
   ```

3. **Adjuntar las 4 políticas al usuario:**
   - Attach policies directly
   - Seleccionar las 4 políticas creadas
   - Create user

4. **Guardar credenciales:**
   ```
   Access Key ID: AKIA...
   Secret Access Key: ...
   ```

5. **Configurar AWS CLI:**
   ```bash
   aws configure
   ```

---

### Opción B: Via AWS CLI

```bash
# 1. Crear las 4 políticas
aws iam create-policy \
  --policy-name SaasBackend-CoreServices \
  --policy-document file://iam-policy-1-core.json

aws iam create-policy \
  --policy-name SaasBackend-APIMonitoring \
  --policy-document file://iam-policy-2-api.json

aws iam create-policy \
  --policy-name SaasBackend-IAM \
  --policy-document file://iam-policy-3-iam.json

aws iam create-policy \
  --policy-name SaasBackend-CDKBootstrap \
  --policy-document file://iam-policy-4-cdk.json

# 2. Crear usuario
aws iam create-user --user-name saas-backend-deployer

# 3. Adjuntar políticas (reemplazar ACCOUNT_ID)
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

aws iam attach-user-policy \
  --user-name saas-backend-deployer \
  --policy-arn arn:aws:iam::${ACCOUNT_ID}:policy/SaasBackend-CoreServices

aws iam attach-user-policy \
  --user-name saas-backend-deployer \
  --policy-arn arn:aws:iam::${ACCOUNT_ID}:policy/SaasBackend-APIMonitoring

aws iam attach-user-policy \
  --user-name saas-backend-deployer \
  --policy-arn arn:aws:iam::${ACCOUNT_ID}:policy/SaasBackend-IAM

aws iam attach-user-policy \
  --user-name saas-backend-deployer \
  --policy-arn arn:aws:iam::${ACCOUNT_ID}:policy/SaasBackend-CDKBootstrap

# 4. Crear access key
aws iam create-access-key --user-name saas-backend-deployer
```

---

## 📊 Resumen de Permisos por Política

| Política | Servicios | Caracteres | Estado |
|----------|-----------|------------|--------|
| **1-core** | CloudFormation, S3, DynamoDB, Lambda | ~700 | ✅ |
| **2-api** | API Gateway, CloudWatch, SNS, X-Ray | ~550 | ✅ |
| **3-iam** | IAM Roles, IAM Policies, STS | ~850 | ✅ |
| **4-cdk** | ECR, SSM | ~450 | ✅ |
| **TOTAL** | 10 servicios AWS | ~2,550 | ✅ |

---

## ✅ Verificar Configuración

```bash
# Ver usuario
aws iam get-user --user-name saas-backend-deployer

# Ver políticas adjuntas
aws iam list-attached-user-policies --user-name saas-backend-deployer

# Probar credenciales
aws sts get-caller-identity
```

---

## 🎯 Siguiente Paso: Deploy

Una vez configurado el usuario:

```bash
# 1. Configurar credenciales
aws configure

# 2. Bootstrap CDK
npm run cdk:bootstrap:dev

# 3. Deploy
npm run cdk:deploy:dev
```

---

## 🔄 Actualizar Políticas

Si necesitas modificar permisos:

```bash
# Via Console
IAM → Policies → [Nombre de política] → Edit

# Via CLI
aws iam create-policy-version \
  --policy-arn arn:aws:iam::ACCOUNT_ID:policy/SaasBackend-CoreServices \
  --policy-document file://iam-policy-1-core.json \
  --set-as-default
```

---

## 🗑️ Limpiar (Eliminar Usuario y Políticas)

```bash
# 1. Listar access keys
aws iam list-access-keys --user-name saas-backend-deployer

# 2. Eliminar access key
aws iam delete-access-key \
  --user-name saas-backend-deployer \
  --access-key-id AKIA...

# 3. Desadjuntar políticas
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

aws iam detach-user-policy \
  --user-name saas-backend-deployer \
  --policy-arn arn:aws:iam::${ACCOUNT_ID}:policy/SaasBackend-CoreServices

aws iam detach-user-policy \
  --user-name saas-backend-deployer \
  --policy-arn arn:aws:iam::${ACCOUNT_ID}:policy/SaasBackend-APIMonitoring

aws iam detach-user-policy \
  --user-name saas-backend-deployer \
  --policy-arn arn:aws:iam::${ACCOUNT_ID}:policy/SaasBackend-IAM

aws iam detach-user-policy \
  --user-name saas-backend-deployer \
  --policy-arn arn:aws:iam::${ACCOUNT_ID}:policy/SaasBackend-CDKBootstrap

# 4. Eliminar usuario
aws iam delete-user --user-name saas-backend-deployer

# 5. Eliminar políticas
aws iam delete-policy \
  --policy-arn arn:aws:iam::${ACCOUNT_ID}:policy/SaasBackend-CoreServices

aws iam delete-policy \
  --policy-arn arn:aws:iam::${ACCOUNT_ID}:policy/SaasBackend-APIMonitoring

aws iam delete-policy \
  --policy-arn arn:aws:iam::${ACCOUNT_ID}:policy/SaasBackend-IAM

aws iam delete-policy \
  --policy-arn arn:aws:iam::${ACCOUNT_ID}:policy/SaasBackend-CDKBootstrap
```

---

## 📚 Archivos

- `iam-policy-1-core.json` - CloudFormation, S3, DynamoDB, Lambda
- `iam-policy-2-api.json` - API Gateway, CloudWatch, SNS, X-Ray
- `iam-policy-3-iam.json` - IAM, STS
- `iam-policy-4-cdk.json` - ECR, SSM
- `IAM-SETUP-GUIDE.md` - Guía paso a paso completa
- `iam-deployment-policy.json` - ⚠️ Obsoleto (excede límite de caracteres)

---

## ⚠️ Nota Importante

El archivo `iam-deployment-policy.json` original **NO se puede usar** porque excede el límite de 6,144 caracteres de AWS.

**Usa las 4 políticas divididas en su lugar.**

---

¡Listo para desplegar! 🚀
