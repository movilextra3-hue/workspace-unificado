# Security Policy

## Supported Versions

Este proyecto mantiene soporte de seguridad para las siguientes versiones:

| Versión | Soportada          | Fin de Soporte |
| ------- | ------------------ | -------------- |
| 5.1.x   | :white_check_mark: | 2027-12-31     |
| 5.0.x   | :x:                | 2026-06-30     |
| 4.0.x   | :white_check_mark: | 2028-06-30     |
| < 4.0   | :x:                | 2025-12-31     |

**Nota:** Las versiones con ✅ reciben parches de seguridad. Las versiones con ❌ ya no tienen soporte oficial.

## Reporting a Vulnerability

Tu seguridad es importante para nosotros. Si descubres una vulnerabilidad de seguridad, **por favor no la publiques en un issue público**.

### Cómo Reportar

1. **Email**: [Envía un correo a movilextra3-hue@ejemplo.com](mailto:movilextra3@gmail.com) con los siguientes detalles:
   - Descripción clara de la vulnerabilidad
   - Versión(es) afectada(s)
   - Pasos detallados para reproducirla
   - Impacto potencial de la vulnerabilidad
   - Tu nombre y datos de contacto (opcional)

2. **GitHub Security Advisory** (alternativa):
   - Ve a la sección "Security" → "Advisories" en este repositorio
   - Haz clic en "Draft a security advisory"
   - Completa los detalles de forma privada

### Qué Esperar

Nos comprometemos a lo siguiente:

| Timeframe | Acción |
|-----------|--------|
| **48 horas** | Acuse de recibo de tu reporte |
| **7 días** | Evaluación inicial y clasificación de severidad |
| **14 días** | Actualización del estado de la investigación |
| **30 días** | Lanzamiento de parche o decisión final |

### Clasificación de Severidad

- **CRÍTICA** 🔴: Acceso sin autorización, RCE, pérdida de datos → Parche urgente
- **ALTA** 🟠: Escalada de privilegios, información sensible → Parche en semana
- **MEDIA** 🟡: Funcionalidad comprometida → Parche en próxima versión
- **BAJA** 🔵: Comportamiento inesperado → Revisión en próxima iteración

### Posibles Resultados

✅ **Vulnerabilidad Aceptada:**
- Se creará un parche de seguridad
- Se lanzará una nueva versión
- Se publicará un advisory
- Se te atribuirá el descubrimiento (si lo deseas)

❌ **Vulnerabilidad Rechazada:**
- Recibirás una explicación detallada del por qué
- Podemos ayudarte a entender el contexto de seguridad
- Tienes derecho a apelar la decisión

### Investigación Privada

Durante la investigación:
- No publicaremos detalles de la vulnerabilidad
- Te mantendremos informado del progreso
- Trabajaremos contigo para coordinación de disclosure
- Respetaremos confidencialidad mutua

## Security Best Practices

Recomendaciones para usuarios de este proyecto:

1. **Mantén actualizado**: Usa siempre la última versión soportada
2. **Revisa dependencias**: Ejecuta `npm audit` o equivalente regularmente
3. **Habilita 2FA**: En tu cuenta de GitHub
4. **Reporta responsablemente**: Sigue este proceso de disclosure coordinado
5. **Monitorea alertas**: Suscríbete a notificaciones de seguridad del repo

## Política de Disclosure Coordinado

Practicamos responsible disclosure. Esto significa:

- No publicaremos detalles antes de que exista un parche
- Trabajaremos contigo para determinar una fecha de publicación
- Típicamente: 90 días entre notification y disclosure público
- Excepciones para vulnerabilidades ya públicamente explotadas

## Contacto

- **Seguridad**: movilextra3-hue@ejemplo.com
- **Problemas generales**: [Abre un issue](https://github.com/movilextra3-hue/workspace-unificado/issues)

---

*Última actualización: 2026-03-03*
*Policy versión: 1.0*
