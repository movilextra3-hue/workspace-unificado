# Comprobación de archivos y delegaciones en ejecución

**Objetivo:** Verificar que en todas las ejecuciones se cargan los archivos correctos, que no hay rutas equivocadas ni delegaciones (ABI/dirección) incorrectas.

---

## 1. Origen de artefactos (TronBox)

- **tronbox.js** define `contracts_build_directory: './build/contracts'`.
- **tronbox compile** genera en esa carpeta un JSON por contrato, con el **nombre del contrato** en Solidity:
  - `TRC20TokenUpgradeable.sol` → `TRC20TokenUpgradeable.json`
  - `TransparentUpgradeableProxy.sol` → `TransparentUpgradeableProxy.json`
  - `ProxyAdmin.sol` → `ProxyAdmin.json`
  - `Migrations.sol` → `Migrations.json`
  - `Initializable.sol` → `Initializable.json` (solo si se compila como contrato; en este proyecto se importa desde TRC20TokenUpgradeable).

Todas las referencias que siguen usan exactamente estos nombres.

---

## 2. Migraciones (TronBox)

| Archivo | Qué carga | Ruta / Origen | ¿Correcto? |
|---------|-----------|----------------|------------|
| 1_initial_migration.js | Migrations | artifacts.require('Migrations') → build/contracts/Migrations.json | Sí |
| 2_deploy_trc20.js | TRC20TokenUpgradeable, TransparentUpgradeableProxy, ProxyAdmin | artifacts.require(...) → mismos nombres en build/contracts | Sí |
| 2_deploy_trc20.js | deploy-info.json (escritura) | path.join(__dirname, '..', 'deploy-info.json') → raíz del proyecto | Sí |
| 3_deploy_impl_and_proxy_reuse_admin.js | Igual que migración 2 + tronbox.js | artifacts.require(...); require(tronbox.js) para feeLimit | Sí |
| 3_deploy_impl_and_proxy_reuse_admin.js | deploy-info.json (escritura) | path.join(__dirname, '..', 'deploy-info.json') | Sí |

**Delegación en migraciones:**  
- `token = TRC20TokenUpgradeable.at(proxy.address)` → se usa el **ABI de la implementación** (TRC20TokenUpgradeable) sobre la **dirección del proxy**. Correcto: las llamadas van al proxy y el proxy hace delegatecall a la impl.  
- Constructor del Proxy: `(impl.address, admin.address, '0x')` → orden (logic, admin, data) correcto.

---

## 3. Scripts que leen build/contracts

| Script | Archivos que lee | Ruta (buildDir) | Uso del artefacto | ¿Correcto? |
|--------|-------------------|------------------|--------------------|------------|
| deploy-upgradeable.js | TRC20TokenUpgradeable.json, TransparentUpgradeableProxy.json, ProxyAdmin.json | path.join(__dirname, '..', 'build', 'contracts') | Impl: deploy + luego ABI en proxy para initialize. Admin: deploy. Proxy: deploy con (impl, admin, '0x'). | Sí |
| upgrade.js | TRC20TokenUpgradeable.json, ProxyAdmin.json | path.join(__dirname, '..', 'build', 'contracts') | Impl: deploy nueva implementación. Admin: ABI para llamar proxyAdmin.upgrade(proxyAddr, newImplAddress). | Sí |
| initialize-v2.js | TRC20TokenUpgradeable.json | path.join(__dirname, '..', 'build', 'contracts') | ABI de impl para tronWeb.contract(abi, proxyAddress) y llamar initializeV2. | Sí |
| verify-before-migrate-3.js | TRC20TokenUpgradeable.json, TransparentUpgradeableProxy.json | path.join(__dirname, '..', 'build', 'contracts') | Solo tamaño de bytecode (estimación energía). No llama contratos. | Sí |
| estimate-deploy-cost.js | TRC20TokenUpgradeable.json, ProxyAdmin.json, TransparentUpgradeableProxy.json | path.join(__dirname, '..', 'build', 'contracts') | Solo tamaño de bytecode. | Sí |

**Comprobación de delegación:**

- **deploy-upgradeable.js:**  
  - Despliega Impl, Admin, Proxy.  
  - `tokenContract = await tronWeb.contract(implArtifact.abi, proxyAddress)` → ABI de la **implementación**, dirección del **proxy**. Correcto.  
  - `tokenContract.initialize(...)` → se envía al proxy; el proxy delega a la impl. Correcto.

- **upgrade.js:**  
  - Despliega nueva Impl.  
  - `proxyAdmin = await tronWeb.contract(adminArtifact.abi, adminAddr)` → ABI de **ProxyAdmin**, dirección del **ProxyAdmin**. Correcto.  
  - `proxyAdmin.upgrade(proxyAddr, newImplAddress)` → llama a ProxyAdmin.upgrade(proxy, newImpl). En el contrato ProxyAdmin, upgrade hace `proxyAddress.call(abi.encodeWithSignature("upgradeTo(address)", newImplementation))`, es decir llama al **proxy** (no a la impl). Correcto.

- **initialize-v2.js:**  
  - `token = await tronWeb.contract(implArtifact.abi, proxyAddress)` → ABI de la **implementación**, dirección del **proxy**. initializeV2 se ejecuta en el contexto del proxy (delegatecall). Correcto.

---

## 4. Scripts que leen deploy-info.json

| Script | Clave(s) usada(s) | Significado en deploy-info | ¿Correcto? |
|--------|--------------------|----------------------------|------------|
| upgrade.js | tokenAddress → proxyAddr; proxyAdminAddress → adminAddr | tokenAddress = dirección del proxy (token). proxyAdminAddress = ProxyAdmin. | Sí |
| initialize-v2.js | tokenAddress → proxyAddress | tokenAddress = dirección del proxy (token). | Sí |
| post-deploy-perfil.js | tokenAddress | Dirección del token (proxy) para Tronscan. | Sí |

Quienes **escriben** deploy-info (migraciones 2 y 3, deploy-upgradeable.js) guardan:

- `tokenAddress` = proxy (dirección permanente del token).  
- `implementationAddress` = implementación.  
- `proxyAdminAddress` = ProxyAdmin.

No hay confusión entre tokenAddress (siempre proxy) e implementationAddress (siempre impl).

---

## 5. Rutas relativas (__dirname)

Todos los scripts se ejecutan con **cwd = raíz del proyecto** (por npm run o por `node scripts/xxx.js` desde la raíz). En todos:

- `path.join(__dirname, '..', 'deploy-info.json')` → raíz/deploy-info.json.  
- `path.join(__dirname, '..', 'build', 'contracts')` → raíz/build/contracts.  
- `path.join(__dirname, '..', 'tronbox.js')` → raíz/tronbox.js.  
- setup-env / desplegar-completar: `path.join(__dirname, '..', '.env')`, `path.join(__dirname, '..', 'ENV_TEMPLATE.txt')` → raíz.

**desplegar-completar-token.js** hace `execSync(..., { cwd: root })` con `root = path.join(__dirname, '..')`, por tanto los hijos (compile:tronbox, verify, migrate) se ejecutan desde la raíz. Las rutas de los scripts hijos siguen siendo correctas porque usan su propio `__dirname` (scripts/).

---

## 6. prepare-verification.js y post-deploy-perfil.js

| Script | Archivos / rutas | ¿Correcto? |
|--------|-------------------|------------|
| prepare-verification.js | CONTRACTS_DIR = .. /contracts; DEPLOY_INFO_PATH = .. /deploy-info.json; VERIFICATION_DIR = .. /verification. Copia TRC20TokenUpgradeable.sol, Initializable.sol, TransparentUpgradeableProxy.sol, ProxyAdmin.sol (no Migrations). | Sí. Coincide con contratos a verificar. |
| post-deploy-perfil.js | deploy-info.json (tokenAddress); .env; trc20-token.config.json (opcional); path.join(rootDir/parentDir, '.git') para git remote. | Sí. |

---

## 7. Tests

- **test/TRC20TokenUpgradeable.test.js** usa artifacts.require('TRC20TokenUpgradeable'), 'TransparentUpgradeableProxy', 'ProxyAdmin'.  
- Montaje: Impl.new(), ProxyAdmin.new(), TransparentUpgradeableProxy.new(impl.address, admin.address, '0x'), TRC20TokenUpgradeable.at(proxy.address), token.initialize(...).  
- Uso de ABI de implementación en dirección del proxy y orden (impl, admin, '0x') correctos.

---

## 8. Resumen

| Comprobación | Resultado |
|--------------|-----------|
| Nombres de artefactos (TRC20TokenUpgradeable, TransparentUpgradeableProxy, ProxyAdmin, Migrations) | Coinciden con contratos Solidity y con lo que leen migraciones y scripts. |
| Ruta build/contracts | Siempre path.join(__dirname, '..', 'build', 'contracts'); coherente con tronbox.js. |
| deploy-info.json: tokenAddress = proxy | Consistente en escritura y lectura; no se usa como impl. |
| Uso de ABI impl en dirección proxy (initialize, initializeV2) | Correcto en migraciones, deploy-upgradeable e initialize-v2. |
| Uso de ABI ProxyAdmin en dirección ProxyAdmin (upgrade) | Correcto en upgrade.js. |
| Orden de argumentos en constructor del Proxy (logic, admin, data) | Correcto en migraciones, deploy-upgradeable y tests. |
| Rutas .env, ENV_TEMPLATE, tronbox.js, deploy-info, verification | Todas relativas a la raíz del proyecto y correctas. |

**Conclusión:** No se detectan archivos incorrectos ni delegaciones equivocadas. Las ejecuciones cargan los artefactos y configuraciones correctos y las direcciones/ABI usadas corresponden al patrón proxy/impl/ProxyAdmin definido en el proyecto.
