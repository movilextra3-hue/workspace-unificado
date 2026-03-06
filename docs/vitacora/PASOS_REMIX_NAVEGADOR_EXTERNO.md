# Comprobaciones en Remix IDE (navegador externo)

Remix se abre en el navegador externo con: compilador **0.8.34**, **Optimization** activada, **runs 200** (según la URL).

## Pasos en Remix (en tu navegador)

1. **Espera** a que Remix cargue por completo (panel izquierdo con archivos, panel del compilador a la derecha).

2. **Compilador (Solidity Compiler):**
   - Versión: **0.8.34**
   - Enable optimization: **sí**
   - Runs: **200**

3. **Añadir los contratos** (desde la carpeta del proyecto `blockchain/trc20-token/contracts/`):
   - En el panel **File Explorer** de Remix: botón **"Add a new file"** o arrastra/copia.
   - Crea o pega el contenido de estos archivos (en este orden, por los `import`):
     - `Initializable.sol`  → contenido de `contracts/Initializable.sol`
     - `TRC20TokenUpgradeable.sol` → contenido de `contracts/TRC20TokenUpgradeable.sol`
     - `ProxyAdmin.sol` → contenido de `contracts/ProxyAdmin.sol`
     - `TransparentUpgradeableProxy.sol` → contenido de `contracts/TransparentUpgradeableProxy.sol`
   - Puedes abrir cada archivo en VS Code/Cursor y copiar/pegar en Remix.

4. **Compilar:**
   - Pulsa **"Compile"** en el panel Solidity Compiler.
   - Comprobación correcta: **sin errores** (icono verde / "Compilation successful").

5. **Contrato a compilar:**  
   Si Remix pide "Contract", elige por ejemplo **TRC20TokenUpgradeable** (o el que quieras verificar); con los 4 archivos y los imports correctos, todos compilan.

---

**Resumen:** Compilador 0.8.34, optimization runs 200, los 4 `.sol` con el mismo contenido que en `contracts/`, Compile → sin errores = comprobación OK.
