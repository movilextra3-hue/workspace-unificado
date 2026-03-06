# Estado del sistema y red (verificación sin gastar TRX)

Última verificación: generada por comprobaciones automáticas.

## Procesos cerrados

| PID   | Proceso                         | Motivo                    |
|-------|---------------------------------|---------------------------|
| 26352 | node scripts/desplegar-completar-token.js | Script de despliegue colgado en segundo plano; cerrado para liberar recursos. |

## Procesos que NO se tocaron (necesarios)

- **Cursor**: procesos del IDE (múltiples PIDs).
- **node (Cursor)**: TypeScript (tsserver), typingsInstaller, SonarLint/ESLint bridge — parte del editor.
- **codex**: asistentes/agentes del workspace.

## Puertos en uso (resumen)

- **22**: SSH.
- **443**: Salida a internet (Trongrid, etc.) — no en LISTENING local.
- **5000, 5040, 8000**: Servicios en escucha (posibles dev servers).
- **127.0.0.1**: Varios puertos locales (Cursor, TypeScript, extensiones).

No hay conflicto con el uso de TronBox ni con la API de Trongrid (estos no abren puertos locales para el despliegue).

## Cachés limpiadas

- **npm**: `npm cache clean --force` ejecutado en el proyecto trc20-token.
- **node_modules/.cache**: eliminada si existía.

## Conexiones verificadas

| Comprobación        | Resultado |
|---------------------|-----------|
| **api.trongrid.io:443** | TCP OK (TcpTestSucceeded: True). Conexión HTTPS lista para la API. |
| **DNS api.trongrid.io** | Resuelve a IPs de AWS (us-west-2). |
| **Ping**             | Trongrid puede no responder ICMP; no afecta al uso de la API HTTPS. |

## Firewall

- **Perfiles (dominio, privado, público)**: Estado **DESACTIVAR** (firewall desactivado).
- No hay restricción de firewall bloqueando salida a Trongrid ni a Node/npm.

## Resumen

- Proceso de despliegue colgado cerrado (PID 26352).
- Caché npm y, si existía, node_modules/.cache limpiadas.
- Conexión a api.trongrid.io:443 y DNS correctos.
- Firewall desactivado; sin restricciones detectadas para el despliegue.

Para volver a comprobar el entorno del token sin gastar TRX:

```bash
npm run check:env
npm run check:tronbox-config
npm run verify:before-migrate-3
```
