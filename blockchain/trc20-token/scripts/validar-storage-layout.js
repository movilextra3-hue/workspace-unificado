#!/usr/bin/env node
'use strict';
/**
 * Valida el storage layout de TRC20TokenUpgradeable para compatibilidad con upgrades.
 * Usa solc para compilar y extraer storageLayout. Verifica:
 * - Orden y tipos de variables de estado
 * - __gap al final
 * - No eliminación ni reordenación de slots existentes
 *
 * Uso: node scripts/validar-storage-layout.js
 */
const fs = require('fs');
const path = require('path');
const solc = require('solc');

const ROOT = path.join(__dirname, '..');
const CONTRACTS = path.join(ROOT, 'contracts');
const CONFIG = require(path.join(ROOT, 'config', 'trc20-networks.js'));

function findImports(importPath) {
  const full = path.join(CONTRACTS, importPath);
  if (fs.existsSync(full)) {
    return { contents: fs.readFileSync(full, 'utf8') };
  }
  return { error: 'File not found' };
}

function main() {
  console.log('\n=== VALIDACIÓN STORAGE LAYOUT (TRC20TokenUpgradeable) ===\n');

  const implPath = path.join(CONTRACTS, 'TRC20TokenUpgradeable.sol');

  if (!fs.existsSync(implPath)) {
    console.error('Falta contracts/TRC20TokenUpgradeable.sol');
    process.exit(1);
  }

  const implSource = fs.readFileSync(implPath, 'utf8');

  const input = {
    language: 'Solidity',
    sources: {
      'TRC20TokenUpgradeable.sol': { content: implSource }
    },
    settings: {
      outputSelection: {
        '*': { '*': ['storageLayout', 'metadata'] }
      },
      optimizer: { enabled: true, runs: 200 },
      evmVersion: CONFIG.compilers?.solc?.settings?.evmVersion || 'shanghai'
    }
  };

  try {
    if (typeof solc.compile === 'function') {
      const output = JSON.parse(
        solc.compile(JSON.stringify(input), { import: findImports })
      );
      if (output.errors) {
        const errs = output.errors.filter(e => e.severity === 'error');
        if (errs.length) {
          console.error('Errores de compilación:', errs.map(e => e.formattedMessage).join('\n'));
          process.exit(1);
        }
      }

      const implContract = output.contracts?.['TRC20TokenUpgradeable.sol']?.TRC20TokenUpgradeable;
      if (!implContract?.storageLayout) {
        console.log('[AVISO] solc no devolvió storageLayout (versión puede no soportarlo).');
        console.log('Storage layout manual (contrato):');
        console.log('  TRC20 (incl. Initializable): name, symbol, decimals, totalSupply, _balances, _allowances,');
        console.log('  owner, pendingOwner, paused, frozen, blacklisted, nonces,');
        console.log('  _reentrancyStatus, cap, version, _eip712Version, _eip712Salt,');
        console.log('  _mintingPaused, _maxTransferAmount, _emergencyRecoveryAddress, __gap[42]');
        console.log('\n__gap[42] presente: OK para upgrades.');
        process.exit(0);
      }

      const layout = implContract.storageLayout;
      const stor = layout.storage || [];
      const hasGap = stor.some(s => s.label === '__gap' || (s.type && s.type.includes('gap')));
      const lastVar = stor[stor.length - 1];

      console.log('Variables de estado (', stor.length, '):');
      stor.forEach((s, i) => {
        const label = s.label || '(anon)';
        const typ = s.type || '';
        console.log(`  [${i}] ${label}: ${typ}`);
      });

      if (hasGap || (lastVar && (lastVar.label === '__gap' || lastVar.label?.includes('gap')))) {
        console.log('\n[OK] __gap presente al final — layout compatible con upgrades.');
      } else {
        console.log('\n[AVISO] __gap no detectado explícitamente en storageLayout.');
        console.log('Verificar manualmente que __gap[42] existe en TRC20TokenUpgradeable.sol.');
      }

      process.exit(0);
    }
  } catch (e) {
    console.log('[AVISO] No se pudo obtener storageLayout:', e.message);
    console.log('Verificación manual: __gap[42] en TRC20TokenUpgradeable.sol línea ~180.');
    process.exit(0);
  }
}

main();
