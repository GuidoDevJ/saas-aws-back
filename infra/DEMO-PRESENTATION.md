# 🛡️ AWS WAF - Presentación de Demostración

## 📊 Slide 1: Título
**Protección de API con AWS WAF**
*Implementación y Demostración en Vivo*

---

## 📊 Slide 2: Problema

### ¿Por qué necesitamos WAF?

**Amenazas Comunes a APIs:**
- 💉 **SQL Injection** - Inyección de código SQL malicioso
- 🔓 **XSS (Cross-Site Scripting)** - Inyección de scripts en navegadores
- 🌊 **DDoS/Rate Limiting** - Ataques de denegación de servicio
- 🔍 **Data Scraping** - Extracción masiva de datos
- 🎯 **Targeted Attacks** - Ataques dirigidos a vulnerabilidades

**Estadísticas:**
- 43% de las brechas de seguridad involucran APIs
- SQL Injection es el ataque #1 en OWASP Top 10
- Costo promedio de una brecha: $4.24M USD

---

## 📊 Slide 3: Solución - AWS WAF

### ¿Qué es AWS WAF?

**Web Application Firewall de AWS**
- ✅ Protección en tiempo real
- ✅ Reglas gestionadas por AWS
- ✅ Reglas personalizables
- ✅ Integración nativa con API Gateway
- ✅ Logging y monitoreo completo
- ✅ Escalable automáticamente

**Modos de Operación:**
- **COUNT Mode**: Registra sin bloquear (testing)
- **BLOCK Mode**: Bloquea tráfico malicioso (producción)

---

## 📊 Slide 4: Arquitectura Implementada

```
┌──────────────┐
│   Internet   │
└──────┬───────┘
       │
       ▼
┌──────────────────────────────────────┐
│          AWS WAF (WebACL)            │
│  ┌────────────────────────────────┐  │
│  │  AWS Managed Rules:            │  │
│  │  • Common Rule Set             │  │
│  │  • SQL Injection Protection    │  │
│  │  • Known Bad Inputs            │  │
│  └────────────────────────────────┘  │
│  ┌────────────────────────────────┐  │
│  │  Custom Rules:                 │  │
│  │  • Rate Limiting (5000/5min)   │  │
│  │  • XSS Detection               │  │
│  │  • Size Constraints (10MB)     │  │
│  └────────────────────────────────┘  │
└──────┬───────────────────────────────┘
       │ ✅ Allowed    │ 🚫 Blocked
       ▼               ▼
┌──────────────┐  ┌─────────────┐
│ API Gateway  │  │ Kinesis     │
│              │  │ Firehose    │
└──────────────┘  └──────┬──────┘
                         ▼
                  ┌─────────────┐
                  │ S3 Logs     │
                  └─────────────┘
```

---

## 📊 Slide 5: Reglas Implementadas

### 8 Capas de Protección

| # | Regla | Propósito | Acción |
|---|-------|-----------|--------|
| 1 | Common Rule Set | Protección general OWASP | COUNT/BLOCK |
| 2 | Known Bad Inputs | Entradas maliciosas conocidas | COUNT/BLOCK |
| 3 | SQLi Rule Set | SQL Injection (AWS) | COUNT/BLOCK |
| 4 | Custom SQLi | SQL Injection (Custom) | COUNT/BLOCK |
| 5 | Custom XSS | Cross-Site Scripting | COUNT/BLOCK |
| 6 | Rate Limiting | 5000 req/5min por IP | COUNT/BLOCK |
| 7 | Size Constraint | Máx 10MB por request | COUNT/BLOCK |
| 8 | Geo Blocking* | Bloqueo por país (opcional) | BLOCK |

*Opcional, no incluido por defecto

---

## 📊 Slide 6: Demo - Preparación

### Antes de Empezar

**Verificar:**
1. ✅ API Gateway desplegado
2. ✅ WAF Stack desplegado
3. ✅ Scripts de testing listos
4. ✅ CloudWatch abierto en otra pestaña

**Comandos Pre-Demo:**
```bash
# Obtener API URL
aws cloudformation describe-stacks \
  --stack-name SaasBackend-Api-dev \
  --query 'Stacks[0].Outputs[?OutputKey==`ApiUrl`].OutputValue' \
  --output text --profile saas-maestria

# Configurar variable
export API_URL=https://xxxxxxx.execute-api.us-east-1.amazonaws.com/dev

# Verificar WAF está activo
aws wafv2 list-web-acls --scope REGIONAL --region us-east-1 --profile saas-maestria
```

---

## 📊 Slide 7: Demo - Parte 1: Baseline

### Tráfico Legítimo sin WAF

```bash
# Terminal 1: Ejecutar tráfico normal
npm run test:waf:legitimate
```

**Resultado Esperado:**
```
✅ Successful requests: 50/50
📊 Success rate: 100%
⏱️  Total time: ~5000ms
```

**Mostrar:**
- CloudWatch Metrics (sin WAF aún)
- API funcionando normalmente
- Sin restricciones

---

## 📊 Slide 8: Demo - Parte 2: SQL Injection

### Ataque de SQL Injection

```bash
# Terminal 1: Ejecutar ataques SQL Injection
npm run test:waf:sqli
```

**Modo COUNT (Testing):**
```
⚠️  Attack 1/20 ALLOWED - Status: 401
⚠️  Attack 2/20 ALLOWED - Status: 401
...
📊 Block rate: 0%
```

**Modo BLOCK (Producción):**
```
🛡️  Attack 1/20 BLOCKED - 403
🛡️  Attack 2/20 BLOCKED - 403
...
📊 Block rate: 100%
```

**Payloads Usados:**
- `' OR '1'='1`
- `'; DROP TABLE users--`
- `UNION SELECT username, password FROM users--`

---

## 📊 Slide 9: Demo - Parte 3: XSS

### Ataque de Cross-Site Scripting

```bash
# Terminal 1: Ejecutar ataques XSS
npm run test:waf:xss
```

**Modo BLOCK:**
```
🛡️  Attack 1/20 BLOCKED - Payload: "<script>alert('XSS')</script>"
🛡️  Attack 2/20 BLOCKED - Payload: "<img src=x onerror=alert('XSS')>"
...
📊 Block rate: 100%
```

**Payloads Usados:**
- `<script>alert("XSS")</script>`
- `<img src=x onerror=alert("XSS")>`
- `<svg/onload=alert("XSS")>`
- `javascript:alert('XSS')`

---

## 📊 Slide 10: Demo - Parte 4: Rate Limiting

### Test de Rate Limiting

```bash
# Terminal 1: Ejecutar test de rate limiting
npm run test:waf:ratelimit
```

**Resultado:**
```
✅ Request 1/200 SUCCESS - 200
✅ Request 2/200 SUCCESS - 200
...
✅ Request 150/200 SUCCESS - 200
🚫 Request 151/200 RATE LIMITED - 403
🚫 Request 152/200 RATE LIMITED - 403
...
🎯 First rate limit triggered at request: 151
📊 Rate limited: 50/200
```

**Métricas:**
- Requests por segundo
- Primer rate limit en request #X
- % de requests limitados

---

## 📊 Slide 11: Demo - Parte 5: Monitoring

### CloudWatch Metrics

**Abrir CloudWatch Dashboard:**
1. Ir a CloudWatch > Metrics > WAF
2. Seleccionar WebACL

**Métricas Importantes:**
- **AllowedRequests**: Tráfico legítimo (verde)
- **BlockedRequests**: Ataques bloqueados (rojo)
- **CountedRequests**: Modo testing (amarillo)

**Mostrar:**
- Gráfica de requests en tiempo real
- Picos de ataques bloqueados
- Distribución por regla

---

## 📊 Slide 12: Demo - Parte 6: Logs

### Análisis de Logs en S3

```bash
# Ver logs en S3
aws s3 ls s3://saas-documents-waf-logs-dev/waf-logs/ --profile saas-maestria

# Descargar y analizar log
aws s3 cp s3://saas-documents-waf-logs-dev/waf-logs/2024/12/06/xxx.gz . --profile saas-maestria
gunzip *.gz
cat *.json | jq .
```

**Información en Logs:**
- Timestamp del ataque
- IP del atacante
- Regla que lo bloqueó
- Payload completo
- Headers HTTP

---

## 📊 Slide 13: Suite Completa

### Ejecutar Todos los Tests

```bash
# Suite completa de tests
npm run test:waf
```

**Output:**
```
═══════════════════════════════════════════════════
        WAF SECURITY TESTING SUITE
═══════════════════════════════════════════════════

[1/4] Running: Legitimate Traffic
    ✅ PASSED - Success Rate: 100%

[2/4] Running: SQL Injection Attacks
    ✅ PASSED - Block Rate: 100%

[3/4] Running: XSS Attacks
    ✅ PASSED - Block Rate: 100%

[4/4] Running: Rate Limiting
    ✅ PASSED - Rate Limited: 50 requests

═══════════════════════════════════════════════════
              COMPREHENSIVE REPORT
═══════════════════════════════════════════════════

✅ SQL Injection: All attacks blocked
✅ XSS Protection: All attacks blocked
✅ Rate Limiting: Working correctly
```

---

## 📊 Slide 14: Cambiar Modos

### De COUNT a BLOCK Mode

**PowerShell:**
```powershell
# Cambiar a BLOCK mode
.\scripts\toggle-waf-mode.ps1 block

# Desplegar
npm run cdk:deploy:dev

# Verificar
npm run test:waf
```

**Bash:**
```bash
# Cambiar a BLOCK mode
./scripts/toggle-waf-mode.sh block

# Desplegar
npm run cdk:deploy:dev

# Verificar
npm run test:waf
```

---

## 📊 Slide 15: Resultados

### Comparación Antes/Después

| Métrica | Sin WAF | Con WAF (BLOCK) |
|---------|---------|-----------------|
| SQL Injection Bloqueados | 0% | 100% ✅ |
| XSS Bloqueados | 0% | 100% ✅ |
| Rate Limiting | No | Sí (5000/5min) ✅ |
| Logging | Limitado | Completo ✅ |
| Costo Mensual | $0 | ~$16-21 💰 |
| Tiempo de Respuesta | X ms | X ms (sin impacto) |
| Seguridad | ⚠️ Vulnerable | ✅ Protegido |

---

## 📊 Slide 16: Costos

### Desglose de Costos

| Componente | Costo Mensual | Notas |
|------------|---------------|-------|
| WAF WebACL Base | $5.00 | Fijo |
| Reglas (8) | $8.00 | $1 por regla |
| Requests | $0.60/millón | Variable |
| S3 Logs | ~$2-5 | Según tráfico |
| Kinesis Firehose | ~$1-3 | Según volumen |
| **Total** | **~$16-21** | Para tráfico bajo-medio |

**ROI:**
- Costo de una brecha de seguridad: $4.24M
- Costo de WAF: $200/año
- **ROI: 21,200%** 📈

---

## 📊 Slide 17: Próximos Pasos

### Roadmap de Producción

1. ✅ **Fase 1: Testing** (Completada)
   - WAF en modo COUNT
   - Tests automatizados
   - Validación de reglas

2. 🚀 **Fase 2: Producción** (Siguiente)
   - Cambiar a modo BLOCK
   - Configurar alarmas SNS
   - Monitoreo 24/7

3. 📊 **Fase 3: Optimización**
   - Ajustar rate limits
   - Agregar reglas custom
   - Geo-blocking si necesario

4. 🔒 **Fase 4: Compliance**
   - Auditoría de seguridad
   - Certificaciones (SOC2, ISO27001)
   - Reportes de cumplimiento

---

## 📊 Slide 18: Preguntas Frecuentes

### Q&A

**Q: ¿WAF afecta el rendimiento?**
A: Mínimo. Latencia típica: <5ms adicionales

**Q: ¿Qué pasa con falsos positivos?**
A: Por eso usamos COUNT mode primero, para afinar reglas

**Q: ¿Se puede usar con otros servicios?**
A: Sí. CloudFront, ALB, AppSync, etc.

**Q: ¿Cómo se manejan actualizaciones de reglas AWS?**
A: Automáticas. AWS actualiza managed rules sin intervención

**Q: ¿Y si necesito reglas más complejas?**
A: Podemos agregar reglas custom basadas en tu lógica de negocio

---

## 📊 Slide 19: Conclusiones

### Resumen

✅ **Implementamos:**
- 8 capas de protección
- Logging completo a S3
- Monitoreo en CloudWatch
- Tests automatizados
- Modo COUNT/BLOCK flexible

✅ **Beneficios:**
- Protección contra OWASP Top 10
- Visibilidad completa de ataques
- Costo efectivo (~$20/mes)
- Sin impacto en rendimiento
- Fácil de demostrar

✅ **Próximo Paso:**
- Activar en producción
- Configurar alertas
- Entrenar equipo

---

## 📊 Slide 20: Demo en Vivo

### ¡Demostración!

**Preparado para ejecutar:**

1. ✅ Tráfico legítimo
2. ✅ SQL Injection attacks
3. ✅ XSS attacks
4. ✅ Rate limiting
5. ✅ Métricas en CloudWatch
6. ✅ Logs en S3

**Comandos listos:**
```bash
export API_URL=https://xxxxx.execute-api.us-east-1.amazonaws.com/dev
npm run test:waf
```

---

## 📊 Slide 21: Recursos

### Links y Documentación

**Documentación:**
- 📖 [WAF-README.md](WAF-README.md) - Guía completa
- 📖 [AWS WAF Docs](https://docs.aws.amazon.com/waf/)
- 📖 [OWASP Top 10](https://owasp.org/www-project-top-ten/)

**Código:**
- 📁 [lib/stacks/waf-stack.ts](lib/stacks/waf-stack.ts) - Infraestructura
- 📁 [test-scripts/](test-scripts/) - Tests automatizados
- 📁 [scripts/toggle-waf-mode.ps1](scripts/toggle-waf-mode.ps1) - Utilidades

**Contacto:**
- 📧 Email: tu-email@example.com
- 💬 Slack: #security-team

---

## 🎬 Script de Presentación

### Timing: 20 minutos

| Minuto | Acción |
|--------|--------|
| 0-2 | Introducción y problema |
| 2-4 | Explicar WAF y arquitectura |
| 4-6 | Mostrar reglas implementadas |
| 6-8 | Demo: Tráfico legítimo |
| 8-11 | Demo: SQL Injection (COUNT → BLOCK) |
| 11-13 | Demo: XSS attacks |
| 13-15 | Demo: Rate limiting |
| 15-17 | Mostrar CloudWatch y logs |
| 17-18 | Costos y ROI |
| 18-19 | Próximos pasos |
| 19-20 | Q&A |

---

## 💡 Tips para la Presentación

### Consejos

1. **Preparación:**
   - Tener WAF en COUNT mode inicialmente
   - Script de cambio a BLOCK listo
   - CloudWatch abierto en segunda pantalla
   - API URL en variable de entorno

2. **Durante Demo:**
   - Explicar cada comando antes de ejecutar
   - Mostrar outputs completos
   - Hacer zoom en métricas importantes
   - Pausar para preguntas

3. **Backup Plan:**
   - Screenshots de resultados anteriores
   - Video grabado de la demo
   - Logs de ejemplo pre-descargados

4. **Engagement:**
   - Preguntar si alguien ha sufrido ataques
   - Mostrar ejemplos reales de payloads
   - Comparar costos vs. beneficios
