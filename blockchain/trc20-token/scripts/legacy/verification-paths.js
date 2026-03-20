#!/usr/bin/env node
'use strict';
const path = require('node:path');
const ROOT = path.join(__dirname, '..');
const VERIFICATION = path.join(ROOT, 'verification');
const impl = path.join(VERIFICATION, 'TRC20TokenUpgradeable.sol');
const init = path.join(VERIFICATION, 'Initializable.sol');
const proxyAdmin = path.join(VERIFICATION, 'ProxyAdmin.sol');
console.log('Carpeta verification:', VERIFICATION);
console.log('Implementation (subir ambos):', impl);
console.log('', init);
console.log('ProxyAdmin (subir uno):', proxyAdmin);
console.log('');
console.log('Copia la ruta y pégala en "Abrir" al subir archivos en Tronscan.');
