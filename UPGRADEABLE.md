# Arquitectura upgradeable — Dirección del token permanente

## Resumen

El token puede desplegarse en modo **upgradeable**. La dirección del token (Proxy) **no cambia** al actualizar; solo se reemplaza la lógica (Implementation).

## Componentes

| Contrato | Rol | Dirección |
|----------|-----|-----------|
| **TransparentUpgradeableProxy** | Contrato con el que interactúan los usuarios. **Esta es la dirección del token.** | Permanente |
| **TRC20TokenUpgradeable** | Lógica del token (balances, transfer, mint, etc.) | Se reemplaza en cada upgrade |
| **ProxyAdmin** | Gestiona upgrades. Solo el owner puede actualizar. | Permanente |

## Despliegue

```bash
npm run compile
npm run deploy:nile   # o deploy:shasta, deploy:mainnet
```

La salida incluye:
- **tokenAddress** (Proxy) — Dirección que deben usar usuarios, exchanges y wallets
- **implementationAddress** — Implementación actual
- **proxyAdminAddress** — Contrato que gestiona upgrades

## Proceso de actualización

```bash
npm run compile
npm run upgrade:nile   # o upgrade:shasta, upgrade:mainnet
```

El script `scripts/upgrade.js` usa `deploy-info.json` para obtener proxy y ProxyAdmin, despliega la implementación actual y ejecuta `ProxyAdmin.upgrade`.

**Requisito:** La `PRIVATE_KEY` en `.env` debe ser la del **owner de ProxyAdmin** (por defecto, el deployer). Si transferiste ownership de ProxyAdmin a una multisig, ejecuta el upgrade desde esa wallet o usa `ProxyAdmin.callProxy` manualmente.

**ProxyAdmin.transferOwnership:** Si transfieres ownership a otra dirección (ej. multisig), `upgrade.js` ya no funcionará con la clave original. Deberás ejecutar el upgrade desde la nueva owner o crear un script que use la clave de la multisig.

**Si perdiste deploy-info.json:** Las direcciones están en la blockchain. Busca en Tronscan las transacciones de deploy de tu wallet; las direcciones de los contratos aparecen ahí. O conserva una copia de seguridad de deploy-info.json.

1. **Desarrollar** la nueva versión (ej. `TRC20TokenUpgradeableV2.sol`)
   - Mantener el **mismo layout de storage** que V1
   - Las nuevas variables deben añadirse al final
   - Usar `reinitializer(2)` para lógica de migración si es necesario

2. **Compilar** la nueva implementación

3. **Desplegar** la nueva implementación

4. **Ejecutar** `ProxyAdmin.upgrade(proxyAddress, nuevaImplementationAddress)`

5. **Verificar** que las funciones nuevas funcionan correctamente

## Releases y versionado (Coinbase / auditoría)

Para tokens upgradeable, se recomienda usar **releases distintos** por cada versión desplegada:

1. **Git tags:** Crear un tag por cada versión antes de upgrade:
   ```bash
   git tag -a v1.0.0 -m "Versión inicial"
   git tag -a v2.0.0 -m "Upgrade con permit"
   git push --tags
   ```

2. **Correspondencia:** Cada tag debe apuntar al código exacto de la implementación desplegada en ese momento.

3. **Changelog:** Mantener un `CHANGELOG.md` con los cambios por versión.

---

## Reglas de storage (críticas)

- El orden de las variables de estado **no puede cambiar** entre versiones
- Solo se pueden **añadir** variables al final
- No eliminar ni reordenar variables existentes

## Ejemplo de upgrade

```javascript
// Deploy V2
const implV2 = await TRC20TokenUpgradeableV2.deployed();

// Upgrade
const proxyAdmin = await ProxyAdmin.at(proxyAdminAddress);
await proxyAdmin.upgrade(proxyAddress, implV2.address);

// Si V2 tiene initializeV2()
const token = await TRC20TokenUpgradeableV2.at(proxyAddress);
await token.initializeV2();
```

