# Vitácora — único archivo

Cambios, interacciones, procedimientos y estado. **Un solo archivo.** No crear documentación adicional en vitacora.

---

## Objetivo principal

Token TRC20 en mainnet: desplegado, verificado, con perfil completo (logo, descripción) — visible en billeteras sin avisos.

**Regla absoluta:** Nada se marca ni define como terminado si no se cumplió el objetivo principal.

---

## Reglas mínimas

| Aspecto | Regla |
|---------|-------|
| Idioma | Español. OKLink/Tronscan pueden estar en español; scripts soportan ES/EN. |
| Secretos | Nunca en código/commits. |
| Raíz TRON | `blockchain/trc20-token`. |
| tronbox.js | No abrirlo (salvo que el usuario pida). |
| Comprobar | Investigar (web, APIs) cuando no se entienda; no solo lo del repo. |
| Alternativas | Retomar el objetivo; no centrarse en lo secundario; no marcar terminado hasta comprobar resultado real. |
| "No se puede" | No usarlo ni declarar imposible hasta agotar procedimientos, formas, tipos, métodos, alternativas. Solo tras evaluar todo: concluir con evidencia. |

---

## Estado actual

- **Proxy, ProxyAdmin:** verificados en Tronscan.
- **Implementation TYqRvxio:** pendiente OKLink. <https://www.oklink.com/tron/address/TYqRvxioNWBqVa2nJGog8RkYQrXQdPJwR3>
- **Perfil:** config OK; si no guardado: `npm run post-deploy:perfil` → Tronscan tokens/create.

---

## Procedimientos

**Pre-despliegue:** `.env` con PRIVATE_KEY y TRON_PRO_API_KEY. TRX en mainnet. `npm run listo` compila y despliega; crea deploy-info.json.

**Implementation OKLink:** `npm run verify:oklink:playwright -- --step2`. Parámetros: 0.8.34, Optimization Yes, Runs 200, License MIT, EVM default. Comprobar después en OKLink "Verified".

**Perfil:** `npm run post-deploy:perfil` → pegar en Tronscan tokens/create (docs/TRONSCAN_DATOS_PEGAR.md) → guardar.

**Comprobaciones:** `node scripts/check-contract-verified.js --all` | `node scripts/check-perfil-ready.js`

---

## Para continuar

1. **Implementation OKLink:** Ejecutar `npm run verify:oklink:playwright -- --step2` y verificar en OKLink que aparezca "Verified".
2. **Perfil Tronscan:** Si no guardado, `npm run post-deploy:perfil` → pegar datos en https://tronscan.org/#/tokens/create/TRC20 → guardar.
3. **Reglas y vitácora:** Consultar siempre antes de actuar. Todo actualizado y listo.

---

## Registro (append-only)

- **2026-03-06**: verify-oklink-playwright: License MIT, Optimization Yes, soporte español (Sí/Enviar/Siguiente/Licencia MIT).
- **2026-03-06 22:42**: verify-oklink-playwright ejecutado, Submit OK. Pendiente comprobar Verified en OKLink.
- **2026-03-06**: check-contract-verified, check-perfil-ready, prepare:verification — Proxy/ProxyAdmin verificados, Implementation pendiente.
- **2026-03-06**: Regla: nada terminado hasta cumplir objetivo. No documentación excesiva; vitácora = este único archivo.
- **2026-03-06**: Consolidación: eliminados REGLAS_INTERACCION, PASOS_PARA_FINALIZAR, REVISION_ACTIVIDAD, README, LINEA_DE_TIEMPO, REGISTRO_INTERACCIONES, PENDIENTES_Y_LO_FALTANTE, PENDIENTE_ORDEN. Vitácora = VITACORA.md (único archivo). vitacora-registro.mdc y workspace-unificado actualizados.
- **2026-03-06**: LO_NECESARIO_TRON eliminado; contenido pre-despliegue/procedimientos incorporado en VITACORA. Referencias actualizadas (README, DESPLIEGUE_TRON_CHECKLIST, ALINEACION_TRON_OFFICIAL).
- **2026-03-06**: Reglas: uso obligatorio de vitácora y rules para interacción; soluciones reales y válidas, sin suposiciones ni limitantes artificiales; evidencia sobre conjetura. workspace-unificado.mdc y vitacora-registro.mdc actualizados.
- **2026-03-06**: Regla "no se puede": no usarlo ni declarar algo imposible hasta agotar todas las posibilidades (procedimientos, formas, tipos, métodos, alternativas, herramientas, APIs). Solo tras evaluar todo lo necesario: concluir con evidencia.
- **2026-03-06**: Actualización final. Sección "Para continuar" añadida (OKLink step2, perfil Tronscan). Reglas, vitácora y procedimientos listos para seguir.
