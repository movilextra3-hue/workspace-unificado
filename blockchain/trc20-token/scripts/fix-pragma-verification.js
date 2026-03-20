#!/usr/bin/env node
'use strict';
/**
 * Corrige pragma en archivos .sol de verification para evitar error IDE:
 * "Source file requires different compiler version (current compiler is 0.8.34)"
 * Cambia pragma solidity 0.8.25 → ^0.8.25 (acepta 0.8.25-0.8.x; Tronscan sigue usando 0.8.25).
 * Uso: node scripts/fix-pragma-verification.js
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const VERIFICATION_DIR = path.join(ROOT, 'verification');
const FORGE_VERIFY_DIR = path.join(ROOT, '.forge-verify');

function fixPragma(dir) {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      fixPragma(p);
    } else if (e.name.endsWith('.sol')) {
      let content = fs.readFileSync(p, 'utf8');
      const before = content;
      content = content.replace(/pragma\s+solidity\s+0\.8\.25\s*;/g, 'pragma solidity ^0.8.25;');
      if (content !== before) {
        fs.writeFileSync(p, content);
        console.log('Actualizado:', p.replace(path.join(__dirname, '..'), '').replace(/\\/g, '/'));
      }
    }
  }
}

fixPragma(VERIFICATION_DIR);
fixPragma(FORGE_VERIFY_DIR);
// Archivo en raíz del proyecto
const rootSol = path.join(ROOT, 'TRC20TokenUpgradeable-flattened-CERCANO.sol');
if (fs.existsSync(rootSol)) {
  let c = fs.readFileSync(rootSol, 'utf8');
  const before = c;
  c = c.replace(/pragma\s+solidity\s+0\.8\.25\s*;/g, 'pragma solidity ^0.8.25;');
  if (c !== before) {
    fs.writeFileSync(rootSol, c);
    console.log('Actualizado: TRC20TokenUpgradeable-flattened-CERCANO.sol');
  }
}
console.log('fix-pragma-verification: listo.');
