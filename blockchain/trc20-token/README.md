# Token TRC-20 Upgradeable

Documentación de proyecto y bitácora: [docs/vitacora/CONSOLIDACION_COMPLETA_TODO.md](../../docs/vitacora/CONSOLIDACION_COMPLETA_TODO.md)

`npm install` · Configurar `.env` (ver vitácora)

**Perfil público:** `token-profile.json` — metadata del token con logo (Pinata IPFS). Solo datos públicos.

---

## Verificación del contrato (Implementation en mainnet)

Carpeta generada con todo lo necesario:

`verification/PAQUETE-VERIFICACION-POST-UPGRADE/`

**Guía principal (léela primero):** `VERIFICAR_AHORA.txt`  
**Si falla OKLink:** `OKLINK-ERRORES-SOLUCIONES.txt` · **Tronscan:** `TRONSCAN-POR-QUE-FALLA.txt`  
**Error «Invalid EVM version» (JSONError):** puede ser en **Tronscan** (formulario EVM/compilador) o en **OKLink** (JSON). Ver **`TRONSCAN-POR-QUE-FALLA.txt`** y **`OKLINK-INVALID-EVM.txt`** — en OKLink usar **`standard-input-TFeLLtutbo-oklink.json`**, no el `standard-input-TFeLLtutbo.json` (lleva `evmVersion`).

### Comandos npm (ejecutar desde `blockchain/trc20-token`)

| Comando | Uso |
|--------|-----|
| **`npm run gate:mainnet`** | **Puerta de calidad:** `check:mainnet` + `check:alignment` + aviso Tronscan (no falla si solo falta verificación en explorador) |
| **`npm run gate:mainnet:strict`** | Igual, pero **falla** si proxy/implementation/admin **no** están verificados en Tronscan |
| **`npm run flujo:continuo`** | **Orquestador:** `lint:js` → `test` → `gate:mainnet` → `verify:implementation:pipeline`; guarda checkpoint para retomar |
| **`npm run flujo:continuo:resume`** | Igual que `flujo:continuo --resume` — continúa tras fallo. Flags: `--resume`, `--from-step=gate:mainnet`, `--reset`, `--only-local` |
| `npm run guardar:verificacion` | Regenera el paquete + Standard JSON OKLink (obligatorio si cambias `contracts/`) |
| `npm run verify:oklink:prepare` | Solo regenera `standard-input-TFeLLtutbo*.json` |
| `npm run verify:implementation:pipeline` | Compile + comprobaciones bytecode + lint |
| `npm run check:alignment` | Comprueba que el bytecode local coincide con mainnet |
| `npm run check:bytecode:mainnet` | Informe detallado (`BYTECODE-MAINNET-REPORT.txt`) |
| `npm run verify:oklink:playwright` | Abre OKLink y rellena el formulario (Submit manual) |
| `npm run verify:oklink:playwright:auto` | Igual, sin quedar bloqueado en “pulsa Enter” |
| `npm run verify:oklink:playwright:submit` | Rellena el formulario y **pulsa Submit** (completa el envío; revisar resultado en navegador o `oklink-last-submit-debug.log`) |
| `npm run verify:oklink:sniff` | Solo diagnóstico: captura respuestas HTTP en `oklink-network-sniff.log` (error genérico en UI) |
| `npm run verify:oklink:proxy` | Tras verificar la Implementation: vincular proxy en OKLink |
| `npm run verify:tronscan:prepare` | Paquete + checklist Tronscan (limitación `bytecodeHash`) |
| `npm run verify:tronscan:playwright` | Abre **Tronscan** y rellena el formulario (reCAPTCHA + Verify manual) |
| `npm run verify:tronscan:playwright:auto` | Igual, sin bloqueo en Enter (`--no-wait`) |
| `npm run check:oklink` | Comprueba estado de verificación vía script |
| `npm run verify:objective:status` | `check:alignment` + `check:oklink` (estado del objetivo verificación) |

**URL OKLink:** https://www.oklink.com/tron/verify-contract-preliminary  

**Compilación auxiliar Hardhat (no sustituye al flujo de despliegue):** `npm run compile:hardhat`
