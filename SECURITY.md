# Seguridad — Token TRC-20 Upgradeable

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
