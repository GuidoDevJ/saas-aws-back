# AWS WAF - Guía de Implementación y Demostración

## 📋 Descripción General

Este proyecto incluye AWS WAF (Web Application Firewall) para proteger el API Gateway contra:
- ✅ SQL Injection
- ✅ Cross-Site Scripting (XSS)
- ✅ Ataques de Rate Limiting / DDoS
- ✅ Entradas maliciosas conocidas
- ✅ Payloads de gran tamaño

## 🏗️ Arquitectura

```
┌─────────────┐      ┌──────────┐      ┌──────────────┐
│   Cliente   │─────▶│   WAF    │─────▶│ API Gateway  │
└─────────────┘      └──────────┘      └──────────────┘
                           │
                           ▼
                    ┌──────────────┐
                    │  Kinesis     │
                    │  Firehose    │
                    └──────────────┘
                           │
                           ▼
                    ┌──────────────┐
                    │  S3 Bucket   │
                    │  (WAF Logs)  │
                    └──────────────┘
```

## 📦 Componentes Implementados

### 1. **WAF Stack** ([lib/stacks/waf-stack.ts](lib/stacks/waf-stack.ts))
- WebACL con múltiples reglas de seguridad
- Asociación con API Gateway
- Logging a S3 vía Kinesis Firehose
- Configuración inicial en modo COUNT (para testing)

### 2. **Reglas de WAF**

#### AWS Managed Rules:
- **AWSManagedRulesCommonRuleSet** - Protección general
- **AWSManagedRulesKnownBadInputsRuleSet** - Entradas maliciosas
- **AWSManagedRulesSQLiRuleSet** - SQL Injection

#### Reglas Personalizadas:
- **RateLimitRule** - 5000 requests por 5 minutos por IP
- **CustomSQLiDetection** - Detección adicional de SQL Injection
- **CustomXSSDetection** - Detección de scripts maliciosos
- **SizeConstraintRule** - Límite de 10MB por request

### 3. **Scripts de Testing** ([test-scripts/](test-scripts/))
- `legitimate-traffic.ts` - Tráfico normal (baseline)
- `sql-injection-attack.ts` - Simulación de SQL Injection
- `xss-attack.ts` - Simulación de XSS
- `rate-limit-test.ts` - Test de rate limiting
- `run-all-tests.ts` - Ejecuta todos los tests

## 🚀 Deployment

### Prerrequisitos

1. Instalar dependencias:
```bash
npm install
```

2. Configurar credenciales de AWS (ya deberías tenerlo configurado)

### Desplegar WAF

#### Para ambiente DEV:
```bash
# Sintetizar primero para ver los cambios
npm run cdk:synth:dev

# Desplegar todos los stacks (incluido WAF)
npm run cdk:deploy:dev
```

#### Para ambiente específico:
```bash
cd infra
cross-env ENVIRONMENT=dev cdk deploy SaasBackend-Waf-dev --profile saas-maestria
```

### Verificar Deployment

Después del deployment, deberías ver estos outputs:
```
SaasBackend-Waf-dev.WebACLId = xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
SaasBackend-Waf-dev.WebACLArn = arn:aws:wafv2:us-east-1:...
SaasBackend-Waf-dev.WafLogsBucketName = saas-documents-waf-logs-dev
SaasBackend-Waf-dev.FirehoseDeliveryStreamName = aws-waf-logs-dev
```

## 🧪 Testing y Demostración

### Configurar API URL

Primero, obtén la URL de tu API desde los outputs:
```bash
npm run cdk:list:dev
# O ver los outputs en la consola de AWS CloudFormation
```

Exporta la variable de entorno:
```bash
# Windows (CMD)
set API_URL=https://xxxxxxxxxx.execute-api.us-east-1.amazonaws.com/dev

# Windows (PowerShell)
$env:API_URL="https://xxxxxxxxxx.execute-api.us-east-1.amazonaws.com/dev"

# Linux/Mac
export API_URL=https://xxxxxxxxxx.execute-api.us-east-1.amazonaws.com/dev
```

### Ejecutar Tests Individuales

#### 1. Tráfico Legítimo (Baseline)
```bash
npm run test:waf:legitimate
```
Debería mostrar:
```
✅ Successful requests: 50
❌ Failed requests: 0
📊 Success rate: 100%
```

#### 2. SQL Injection Attack
```bash
npm run test:waf:sqli
```
En modo COUNT:
```
⚠️  Attack 1/20 ALLOWED - Status: 401/403
```
En modo BLOCK:
```
🛡️  Attack 1/20 BLOCKED - 403
```

#### 3. XSS Attack
```bash
npm run test:waf:xss
```

#### 4. Rate Limiting Test
```bash
npm run test:waf:ratelimit
```

### Ejecutar Suite Completa

```bash
npm run test:waf
```

Esto ejecutará todos los tests en secuencia y generará un reporte completo.

## 📊 Monitoreo y Logs

### CloudWatch Metrics

Ve a CloudWatch > Metrics > WAF para ver:
- `AllowedRequests` - Requests permitidos
- `BlockedRequests` - Requests bloqueados
- `CountedRequests` - Requests contados (modo COUNT)

### WAF Logs en S3

Los logs se guardan en:
```
s3://saas-documents-waf-logs-dev/waf-logs/
```

Formato de logs: JSON comprimido (GZIP)

### Ver Logs

```bash
# Listar logs
aws s3 ls s3://saas-documents-waf-logs-dev/waf-logs/ --profile saas-maestria

# Descargar un log
aws s3 cp s3://saas-documents-waf-logs-dev/waf-logs/2024/12/06/xx.gz . --profile saas-maestria

# Descomprimir y ver
gunzip *.gz
cat *.json | jq .
```

## 🎬 Flujo de Demostración

### Demostración Completa (15-20 minutos)

#### 1. **Preparación** (5 min)
```bash
# Terminal 1: Monitorear logs de API
aws logs tail /aws/apigateway/dev-documents-api --follow --profile saas-maestria

# Terminal 2: Preparar tests
cd infra
```

#### 2. **Baseline - Sin WAF** (3 min)
- Mostrar configuración actual del API
- Ejecutar tráfico legítimo: `npm run test:waf:legitimate`
- Mostrar métricas en CloudWatch

#### 3. **Desplegar WAF en modo COUNT** (5 min)
```bash
npm run cdk:deploy:dev
```
- Explicar que en modo COUNT no bloquea, solo registra
- Mostrar WebACL en AWS Console

#### 4. **Ejecutar Ataques** (5 min)
```bash
npm run test:waf
```
- Mostrar que los ataques pasan pero se registran
- Ver métricas de CountedRequests en CloudWatch
- Revisar logs en S3

#### 5. **Activar BLOCK Mode** (2 min)
Editar [lib/stacks/waf-stack.ts](lib/stacks/waf-stack.ts):
```typescript
// Cambiar de:
count: {}
// A:
block: {}

// En todas las reglas
```

Desplegar:
```bash
npm run cdk:deploy:dev
```

#### 6. **Verificar Protección** (5 min)
```bash
npm run test:waf
```
- Mostrar que los ataques son bloqueados (403)
- Ver métricas de BlockedRequests
- Demostrar que tráfico legítimo sigue funcionando

### Demo Rápida (5 minutos)

```bash
# 1. Configurar API URL
export API_URL=https://tu-api.execute-api.us-east-1.amazonaws.com/dev

# 2. Ejecutar suite completa
npm run test:waf

# 3. Mostrar resultados en CloudWatch
# - Ir a CloudWatch > Dashboards
# - Mostrar métricas de WAF
```

## 🔧 Cambiar de COUNT a BLOCK Mode

### Opción 1: Editar el código

En [lib/stacks/waf-stack.ts](lib/stacks/waf-stack.ts), busca todas las instancias de:
```typescript
overrideAction: {
  count: {}, // COUNT mode for testing
  // none: {}, // Use this for BLOCK mode
}
```

O para reglas custom:
```typescript
action: {
  count: {}, // COUNT mode for testing
  // block: {}, // Use this for BLOCK mode
}
```

Cambia a:
```typescript
overrideAction: {
  // count: {}, // COUNT mode for testing
  none: {}, // Use this for BLOCK mode
}
```

Y:
```typescript
action: {
  // count: {}, // COUNT mode for testing
  block: {}, // Use this for BLOCK mode
}
```

### Opción 2: Usar parámetros CDK

Puedes agregar un parámetro en [config/types.ts](config/types.ts) para controlar el modo:
```typescript
export interface EnvironmentConfig {
  // ... otros campos
  waf?: {
    blockMode: boolean; // true = BLOCK, false = COUNT
  };
}
```

## 📈 Métricas y Alarmas

### Métricas Principales

| Métrica | Descripción | Umbral Recomendado |
|---------|-------------|-------------------|
| BlockedRequests | Requests bloqueados | > 100/5min = Alerta |
| AllowedRequests | Requests permitidos | - |
| CountedRequests | Requests contados (modo COUNT) | - |

### Configurar Alarmas

Agregar en [lib/stacks/waf-stack.ts](lib/stacks/waf-stack.ts):
```typescript
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as sns from 'aws-cdk-lib/aws-sns';

// SNS Topic para alarmas
const alarmTopic = new sns.Topic(this, 'WafAlarmTopic', {
  displayName: 'WAF Security Alerts',
});

// Alarma de ataques bloqueados
const blockedRequestsAlarm = new cloudwatch.Alarm(this, 'BlockedRequestsAlarm', {
  metric: new cloudwatch.Metric({
    namespace: 'AWS/WAFV2',
    metricName: 'BlockedRequests',
    dimensionsMap: {
      WebACL: this.webAcl.attrId,
      Region: this.region,
      Rule: 'ALL',
    },
    statistic: 'Sum',
    period: Duration.minutes(5),
  }),
  threshold: 100,
  evaluationPeriods: 1,
  alarmDescription: 'Alert when more than 100 requests are blocked in 5 minutes',
});

blockedRequestsAlarm.addAlarmAction(new SnsAction(alarmTopic));
```

## 💰 Costos

### Estimación Mensual

| Componente | Costo | Notas |
|------------|-------|-------|
| WAF WebACL | $5.00 | Base |
| WAF Rules (8 reglas) | $8.00 | $1 por regla |
| Requests | Variable | $0.60 por millón |
| Logs (S3) | ~$2-5 | Depende del tráfico |
| Kinesis Firehose | ~$1-3 | Depende del volumen |
| **Total** | **~$16-21** | Para tráfico bajo-medio |

### Optimización de Costos

1. **Reducir logging**: Loggear solo requests bloqueados
2. **Lifecycle policies**: Ya configurado (90 días)
3. **Disable en ambientes no-productivos**: Comentar WAF stack para local/dev

## 🔒 Seguridad - Mejores Prácticas

### Reglas Recomendadas para Producción

1. ✅ Activar modo BLOCK
2. ✅ Configurar alarmas SNS
3. ✅ Revisar logs semanalmente
4. ✅ Ajustar rate limiting según tráfico real
5. ✅ Habilitar geo-blocking si aplica
6. ✅ Usar AWS Managed Rules actualizados
7. ✅ Implementar IP whitelisting para APIs internas

### Geo-Blocking (Opcional)

Agregar regla en [lib/stacks/waf-stack.ts](lib/stacks/waf-stack.ts):
```typescript
rules.push({
  name: 'GeoBlockingRule',
  priority: priority++,
  statement: {
    geoMatchStatement: {
      countryCodes: ['CN', 'RU'], // Bloquear China y Rusia
    },
  },
  action: {
    block: {},
  },
  visibilityConfig: {
    sampledRequestsEnabled: true,
    cloudWatchMetricsEnabled: true,
    metricName: 'GeoBlockingRuleMetric',
  },
});
```

## 🐛 Troubleshooting

### WAF no está bloqueando ataques

1. Verificar que las reglas están en modo BLOCK
2. Revisar CloudWatch Logs del API Gateway
3. Verificar que el WebACL está asociado al API Gateway
4. Esperar 5-10 minutos después del deployment

### Logs no aparecen en S3

1. Verificar Kinesis Firehose está activo
2. Revisar IAM role tiene permisos correctos
3. Esperar hasta 5 minutos (buffer time)

### Tests fallan con errores de conexión

1. Verificar API_URL está correcta
2. Verificar API Gateway está desplegado
3. Verificar credenciales de Cognito si aplica

## 📚 Referencias

- [AWS WAF Developer Guide](https://docs.aws.amazon.com/waf/latest/developerguide/)
- [AWS Managed Rules List](https://docs.aws.amazon.com/waf/latest/developerguide/aws-managed-rule-groups-list.html)
- [WAF Pricing](https://aws.amazon.com/waf/pricing/)

## 🤝 Contribuciones

Para agregar nuevas reglas o mejorar los tests, edita:
- Reglas: [lib/stacks/waf-stack.ts](lib/stacks/waf-stack.ts)
- Tests: [test-scripts/](test-scripts/)

## 📝 Notas Adicionales

- WAF está configurado para REGIONAL (API Gateway REST)
- Para CloudFront, cambiar scope a CLOUDFRONT
- Logs se comprimen automáticamente (GZIP)
- Retention: 90 días en S3
