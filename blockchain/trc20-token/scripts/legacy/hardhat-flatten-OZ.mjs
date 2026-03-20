#!/usr/bin/env node
/**
 * Genera flatten Hardhat con Initializable-OZ.
 * Copia OZ a contracts, flatten, restaura original.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const INIT = path.join(ROOT, 'contracts', 'Initializable.sol');
const OZ = path.join(ROOT, 'verification', 'TXaXTSUK-verification', 'Initializable-OZ.sol');
const OUT = path.join(ROOT, 'verification', 'TXaXTSUK-verification', 'TRC20TokenUpgradeable-hardhat-OZ.sol');

const backup = fs.readFileSync(INIT, 'utf8');
try {
  fs.copyFileSync(OZ, INIT);
  const flat = execSync('npx hardhat flatten contracts/TRC20TokenUpgradeable.sol', {
    cwd: ROOT,
    encoding: 'utf8',
    maxBuffer: 10 * 1024 * 1024
  });
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, flat, 'utf8');
  console.log('Guardado:', OUT);
} finally {
  fs.writeFileSync(INIT, backup, 'utf8');
  console.log('Initializable restaurado.');
}
