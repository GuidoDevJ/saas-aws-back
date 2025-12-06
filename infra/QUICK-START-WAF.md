# 🚀 Quick Start - AWS WAF

## Deploy WAF (5 minutos)

```bash
# 1. Instalar dependencias
npm install

# 2. Sintetizar para verificar cambios
npm run cdk:synth:dev

# 3. Desplegar WAF Stack
npm run cdk:deploy:dev
# Esto desplegará todos los stacks incluyendo WAF

# 4. Obtener API URL del output de CloudFormation
# Copiar el valor de "ApiUrl" del output
```

## Test WAF (2 minutos)

```bash
# Windows (PowerShell)
$env:API_URL="https://tu-api.execute-api.us-east-1.amazonaws.com/dev"

# Windows (CMD)
set API_URL=https://tu-api.execute-api.us-east-1.amazonaws.com/dev

# Linux/Mac
export API_URL=https://tu-api.execute-api.us-east-1.amazonaws.com/dev

# Ejecutar suite completa de tests
npm run test:waf
```

## Cambiar a BLOCK Mode (1 minuto)

```powershell
# PowerShell
.\scripts\toggle-waf-mode.ps1 block
npm run cdk:deploy:dev
```

## Ver Resultados

1. **CloudWatch Metrics:**
   - AWS Console > CloudWatch > Metrics > WAF
   - Ver: BlockedRequests, AllowedRequests

2. **Logs:**
   - AWS Console > S3 > saas-documents-waf-logs-dev
   - Descargar archivos .gz y descomprimir

3. **WAF Console:**
   - AWS Console > WAF & Shield > Web ACLs
   - Ver reglas y métricas

## Comandos Útiles

```bash
# Tests individuales
npm run test:waf:legitimate    # Tráfico normal
npm run test:waf:sqli          # SQL Injection
npm run test:waf:xss           # XSS
npm run test:waf:ratelimit     # Rate limiting

# CDK
npm run cdk:diff:dev           # Ver cambios
npm run cdk:list               # Listar stacks
npm run cdk:destroy:dev        # Eliminar todo (cuidado!)

# Ver logs de WAF
aws s3 ls s3://saas-documents-waf-logs-dev/waf-logs/ --profile saas-maestria

# Ver WebACL
aws wafv2 list-web-acls --scope REGIONAL --region us-east-1 --profile saas-maestria
```

## Troubleshooting

**WAF no bloquea:**
- Verificar que estás en BLOCK mode (no COUNT)
- Esperar 5-10 minutos después del deploy
- Verificar WebACL está asociado al API Gateway

**Tests fallan:**
- Verificar API_URL está correcta
- Verificar API Gateway está desplegado
- Verificar credenciales AWS

**No veo logs:**
- Esperar hasta 5 minutos (buffer de Kinesis)
- Verificar Firehose está activo
- Verificar permisos IAM del rol

## Documentación Completa

Ver [WAF-README.md](WAF-README.md) para documentación completa.
