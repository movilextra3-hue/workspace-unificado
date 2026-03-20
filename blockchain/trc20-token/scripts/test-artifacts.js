'use strict';
/**
 * Valida que la compilación produjo artifacts correctos para deploy/upgrade.
 * Alternativa ligera a tronbox test — no requiere red TRON.
 * Uso: node scripts/test-artifacts.js (tras npm run compile)
 */
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const BUILD = path.join(ROOT, 'build', 'contracts');

const REQUIRED = ['TRC20TokenUpgradeable', 'TransparentUpgradeableProxy', 'ProxyAdmin'];

function main() {
  let ok = true;
  for (const name of REQUIRED) {
    const p = path.join(BUILD, name + '.json');
    if (!fs.existsSync(p)) {
      console.error('Falta:', p);
      ok = false;
      continue;
    }
    const art = JSON.parse(fs.readFileSync(p, 'utf8'));
    const bc = (art.bytecode || '').replace(/^0x/, '');
    if (!bc || bc.length < 100) {
      console.error(name, ': bytecode inválido o vacío');
      ok = false;
    } else if (!Array.isArray(art.abi) || art.abi.length === 0) {
      console.error(name, ': ABI vacío');
      ok = false;
    } else {
      console.log('  [OK]', name);
    }
  }
  if (!ok) process.exit(1);
  console.log('\nArtifacts válidos para deploy/upgrade.');
}

main();
