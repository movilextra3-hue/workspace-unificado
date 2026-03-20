#!/usr/bin/env node
/**
 * Pre-verificación antes de TronScan. Acepta dirección como argumento.
 * Método TNduz3: Compiler 0.8.25 (Ethereum), EVM Shanghai (20), Optimization Yes, Runs 200.
 *
 * Uso: node scripts/verify-before-tronscan.js <ADDRESS>
 *   o: ADDRESS=TNduz3... node scripts/verify-before-tronscan.js
 *
 * Si el contrato fue desplegado con 0.8.34+default, indica que usar OKLink.
 */
'use strict';
const addr = process.argv[2] || process.env.ADDRESS;
if (!addr) {
  console.error('Uso: node scripts/verify-before-tronscan.js <ADDRESS>');
  console.error('  Ej: node scripts/verify-before-tronscan.js TNduz3PrYRDDN9HmEWXFn3nEsXKCaJt9er');
  process.exit(1);
}

const CONTRACTS = [
  { address: 'TTTT4AeRUjJEmTepb9X4uK4f6Pxg8UwwkW', mainContract: 'ProxyAdmin', sourceFile: 'ProxyAdmin.sol' },
  { address: 'TQJ6f3eczr2rK9x9kN2JMTdDN1zTm46XxE', mainContract: 'ProxyAdmin', sourceFile: 'ProxyAdmin.sol' },
  { address: 'TVeVPZGiMc9GWQ8sQHvUwhfg19EDZt3UjZ', mainContract: 'ProxyAdmin', sourceFile: 'ProxyAdmin.sol' },
  { address: 'TYqRvxioNWBqVa2nJGog8RkYQrXQdPJwR3', mainContract: 'TRC20TokenUpgradeable', sourceFile: 'TRC20TokenUpgradeable.sol' },
  { address: 'TPK7VWSGSH1nK4jetcNCz1BQqMU7gmnaLe', mainContract: 'TRC20TokenUpgradeable', sourceFile: 'TRC20TokenUpgradeable.sol' },
  { address: 'TNduz3PrYRDDN9HmEWXFn3nEsXKCaJt9er', mainContract: 'TRC20TokenUpgradeable', sourceFile: 'TRC20TokenUpgradeable.sol' },
  { address: 'TXaXTSUKgdAdX76MhQoqQ98msE8azBwiFS', mainContract: 'TRC20TokenUpgradeable', sourceFile: 'TRC20TokenUpgradeable.sol' }
];

const c = CONTRACTS.find(x => x.address === addr);
if (!c) {
  console.error('Dirección no reconocida. Contratos configurados:', CONTRACTS.map(x => x.address).join(', '));
  process.exit(1);
}

// TNduz3 tiene script dedicado (ESM) con checks exhaustivos; para otros, ejecutar genérico
if (addr === 'TNduz3PrYRDDN9HmEWXFn3nEsXKCaJt9er') {
  const { spawnSync } = require('node:child_process');
  const { join } = require('node:path');
  const r = spawnSync('node', [join(__dirname, 'verify-before-tronscan-TNduz3.mjs')], { stdio: 'inherit' });
  process.exit(r.status ?? 0);
} else {
  require('./verify-before-tronscan-generic.js').run(addr, c).catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
