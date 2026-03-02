# Auditoría y análisis de seguridad

Antes de desplegar en mainnet, se recomienda ejecutar herramientas de análisis estático y, si es posible, una auditoría profesional.

---

## 1. Herramientas recomendadas

### Solhint (ya integrado)

```bash
npm run lint
# o
npx solhint "contracts/**/*.sol"
```

Configuración en `.solhintrc.json` si existe. Útil para estilo y reglas básicas.

### Slither (análisis estático)

[Slither](https://github.com/crytic/slither) detecta vulnerabilidades y lógica insegura.

**Requisitos:** Python 3.8+, solc 0.8.34 en PATH o configurado.

```bash
# Instalación (en un entorno virtual recomendado)
pip install slither-analyzer

# Desde la raíz del proyecto (E:\Cursor-Workspace\trc20-token)
slither contracts/TRC20TokenUpgradeable.sol contracts/Initializable.sol --solc-remaps "@openzeppelin/=node_modules/@openzeppelin/" 2>/dev/null || slither contracts/ --solc-solcs-select 0.8.34
```

Si el proyecto no usa rutas de OpenZeppelin, basta:

```bash
slither contracts/ --solc-solcs-select 0.8.34
```

Revisar la salida para “High”/“Medium” y falsos positivos conocidos (p. ej. reentrancy en ERC-20 sin callbacks).

### MythX (análisis en la nube)

[MythX](https://mythx.io/) ofrece análisis bajo demanda (cuenta y API key).

- Integración con Hardhat/Truffle o CLI.
- Para TronBox: compilar y subir los bytecodes/ABI o usar la CLI de MythX con los `.sol`.

### Aderyn (opcional, ver ENTORNO.md)

Si usas el Dev Container o WSL, puedes ejecutar Aderyn para análisis adicional (ver documentación del proyecto).

---

## 2. Checklist pre-mainnet

- [ ] `npm run compile` / `npx tronbox compile` sin errores.
- [ ] `npm run lint` sin errores (o solo los aceptados por política).
- [ ] Slither ejecutado y revisados los hallazgos High/Medium.
- [ ] Tests (si existen) pasando.
- [ ] Variables sensibles solo en `.env` (nunca en código).
- [ ] Direcciones de proxy, implementación y ProxyAdmin guardadas (p. ej. en `deploy-info.json`).
- [ ] Opcional: auditoría externa o revisión por un segundo desarrollador.

---

## 3. Mejoras de seguridad ya implementadas en el contrato

- **ReentrancyGuard:** modifier `nonReentrant` en `mint`, `recoverTokens` y `recoverTRX`.
- **Cap de supply:** variable `cap`; por defecto `type(uint256).max` (ilimitado); en `initializeV2` se puede fijar un tope; `mint` comprueba `totalSupply + amount <= cap`.
- **Reinitializer:** `initializeV2(uint256 _version, uint256 _cap)` con modifier `reinitializer(2)` para upgrades sin re-desplegar.
- **Storage gap:** `uint256[47] __gap` para añadir variables en futuras versiones sin romper el layout.

Ver `docs/COMPARATIVA_BUENAS_PRACTICAS.md` para la comparativa completa.
