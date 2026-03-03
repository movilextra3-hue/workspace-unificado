# Seguridad — Token TRC-20 Upgradeable

## Datos sensibles (obligatorio)

- **Nunca** subas a Git ni compartas en chat: contraseñas, claves privadas (`.env`), ni tokens de GitHub.
- **GitHub:** Para `git push` GitHub **no acepta contraseña**; exige un [Personal Access Token (PAT)](https://github.com/settings/tokens). Crear uno con permiso `repo`, usarlo cuando Git pida "Password" y no guardarlo en ningún archivo del proyecto.
- **Si alguna vez se expuso una contraseña o token:** cámbiala de inmediato en la web del servicio (GitHub → Settings → Password and authentication; o revoca el token y crea uno nuevo).
- `.env` y `secrets/` están en `.gitignore`; no crear archivos con credenciales en la raíz ni con nombres que los contengan.

---

## Análisis estático

### Slither (recomendado)

[Slither](https://github.com/crytic/slither) es una herramienta de análisis estático para contratos Solidity.

**Instalación (Python):**
```bash
pip install slither-analyzer
```

**Ejecución:**
```bash
cd trc20-token
slither contracts/ --exclude naming-convention
```

**Nota:** Slither puede reportar falsos positivos. Revisar cada hallazgo manualmente.

### Solhint

```bash
npm run lint
```

Ejecuta reglas de estilo y buenas prácticas sobre los contratos.

**Instalación:** `npm install` ya incluye solhint como devDependency.

---

## Proceso recomendado

1. **Antes de cada deploy:** Ejecutar `npm run compile`, `npm run test`, `npm run lint`
2. **Antes de mainnet:** Ejecutar Slither manualmente o en CI
3. **Para listing en exchanges:** Considerar auditoría externa (Trail of Bits, OpenZeppelin, ConsenSys Diligence)

---

## Medidas implementadas

| Medida | Estado |
|--------|--------|
| Bloqueo transfer a address(0) y address(this) | ✓ |
| recoverTokens para tokens enviados por error | ✓ |
| increaseAllowance/decreaseAllowance (race condition) | ✓ |
| Ownership en dos pasos | ✓ |
| Sin llamadas externas en transfer | ✓ |
| Solidity 0.8+ (overflow checks) | ✓ |
| Patrón CEI (Checks-Effects-Interactions) | ✓ |

---

## Reportar vulnerabilidades

Si descubres una vulnerabilidad, no la hagas pública. Contacta al equipo del proyecto de forma privada.
