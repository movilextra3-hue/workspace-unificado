# Verificar contratos ahora – pasos finales

En el navegador ya está abierta la página de verificación de Tronscan con **parte del formulario rellenada** para el primer contrato (Token/Proxy).

## Lo que ya está rellenado

- **Contract Address:** `TV4P3sVfSQULNnsCPyzLnofCbK6cwkHeDm`
- **Main Contract:** `TransparentUpgradeableProxy`
- **Runs:** `200`

## Lo que debes hacer tú (en la pestaña de Tronscan)

1. **Solidity Compiler Version:** elegir **0.8.30** (Tronscan no tiene 0.8.34; los .sol en verification/ ya llevan pragma ^0.8.25 para que acepte 0.8.30).
2. **Optimization:** elegir **Yes** / **Enabled**.
3. **VM version:** Paris ≈ 0.8.18, Shanghai ≈ 0.8.20, Cancun ≈ 0.8.25. Con compilador **0.8.30** probar **Shanghai** o **Cancun** (el que haga pasar la verificación).
4. **License:** si no aparece o no acepta "MIT", elegir **None**. (El código tiene SPDX-License-Identifier: MIT; Tronscan a veces solo ofrece "None" y la verificación pasa igual.)
4. **Subir el archivo:** pulsar "Upload Contract File(s)" y seleccionar el archivo:
   ```
   <tu proyecto>/blockchain/trc20-token/verification/TransparentUpgradeableProxy.sol
   ```
   Ruta absoluta ejemplo: `e:\workspace-unificado\blockchain\trc20-token\verification\TransparentUpgradeableProxy.sol`
5. **CAPTCHA:** completar el CAPTCHA que aparezca.
6. Pulsar **"Verify and Publish"**.

Si la verificación es correcta, Tronscan mostrará éxito. Luego repite el proceso para los otros dos contratos con los datos de abajo.

---

## Contrato 2 – Implementation

- **Contract Address:** `TYqRvxioNWBqVa2nJGog8RkYQrXQdPJwR3`
- **Main Contract:** `TRC20TokenUpgradeable`
- **Compiler:** 0.8.34 | **Optimization:** Yes | **Runs:** 200 | **License:** MIT o **None**
- **Archivo a subir:** `verification/TRC20TokenUpgradeable.sol` (nombre = Main Contract; NO el de contracts/).

---

## Contrato 3 – ProxyAdmin

- **Contract Address:** `TVeVPZGiMc9GWQ8sQHvUwhfg19EDZt3UjZ`
- **Main Contract:** `ProxyAdmin`
- **Compiler:** 0.8.34 | **Optimization:** Yes | **Runs:** 200 | **License:** MIT o **None**
- **Archivo a subir:** `verification/ProxyAdmin.sol`

---

## Si no tienes la carpeta verification/

En la raíz del proyecto (blockchain/trc20-token):

```bash
npm run prepare:verification
```

Eso genera la carpeta `verification/` con los .sol necesarios.

**URL:** https://tronscan.org/#/contracts/verify (comprueba que estés en **Mainnet**).
