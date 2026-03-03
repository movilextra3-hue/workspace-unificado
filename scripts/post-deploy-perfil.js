#!/usr/bin/env node
'use strict';
/**
 * Tras el despliegue: lee deploy-info.json e imprime todo lo necesario para
 * completar el perfil en Tronscan. Usa cuenta de .env (GITHUB_*) o trc20-token.config.json o git remote origin.
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Cargar .env (cuenta configurada en Cursor / proyecto)
const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  try {
    const env = fs.readFileSync(envPath, 'utf8');
    env.split('\n').forEach(function (line) {
      const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
      if (m && process.env[m[1]] === undefined) process.env[m[1]] = (m[2] || '').trim();
    });
  } catch (e) { /* ignore */ }
}

const deployInfoPath = path.join(__dirname, '..', 'deploy-info.json');

if (!fs.existsSync(deployInfoPath)) {
  console.error('No existe deploy-info.json. Ejecuta antes: npm run listo (despliegue en mainnet).');
  process.exit(1);
}

const info = JSON.parse(fs.readFileSync(deployInfoPath, 'utf8'));
const tokenAddress = info.tokenAddress;

const tronscanUrl = 'https://tronscan.org/#/tokens/create/TRC20';

const description = 'Token TRC-20 estable vinculado a USD en la red TRON. Compatible con wallets y exploradores estándar.';

let websiteUrl = process.env.WEBSITE_URL || process.env.GITHUB_WEBSITE_URL || 'https://tudominio.com';
let githubUser = process.env.GITHUB_USER || '';
let githubRepo = process.env.GITHUB_REPO || '';
let branch = process.env.GITHUB_BRANCH || process.env.BRANCH || 'main';
let logoPathInRepo = process.env.LOGO_PATH_IN_REPO || 'blockchain/trc20-token/assets/tether-logo.webp';

// 1) trc20-token.config.json
const configPath = path.join(__dirname, '..', 'trc20-token.config.json');
if (fs.existsSync(configPath)) {
  try {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    if (config.websiteUrl) websiteUrl = config.websiteUrl;
    if (config.githubUser) githubUser = config.githubUser;
    if (config.githubRepo) githubRepo = config.githubRepo;
    if (config.branch) branch = config.branch;
    if (config.logoPathInRepo) logoPathInRepo = config.logoPathInRepo;
  } catch (e) { /* usar env */ }
}

// 2) Si faltan user/repo, intentar git remote origin (cuenta configurada en Cursor/Git)
const rootDir = path.join(__dirname, '..');
const parentDir = path.join(rootDir, '..');
for (const cwd of [rootDir, parentDir]) {
  if ((!githubUser || !githubRepo) && fs.existsSync(path.join(cwd, '.git'))) {
    try {
      const origin = execSync('git remote get-url origin', { cwd, encoding: 'utf8' }).trim();
      const match = origin.match(/github\.com[/:]([^/]+)\/([^/]+?)(?:\.git)?$/);
      if (match) {
        if (!githubUser) githubUser = match[1];
        if (!githubRepo) githubRepo = match[2].replace(/\.git$/, '');
        break;
      }
    } catch (e) { /* no remote */ }
  }
}

let logoUrl = '';
if (githubUser && githubRepo && branch) {
  const lp = (logoPathInRepo || 'blockchain/trc20-token/assets/tether-logo.webp').replace(/^\//, '');
  logoUrl = 'https://raw.githubusercontent.com/' + githubUser + '/' + githubRepo + '/' + branch + '/' + lp;
}

console.log('');
console.log('========== PERFIL TRONSCAN — DATOS LISTOS PARA PEGAR ==========');
console.log('');
console.log('1. Dirección del contrato (tokenAddress / Proxy):');
console.log('   ' + tokenAddress);
console.log('');
console.log('2. Abre esta URL y conecta tu wallet (owner):');
console.log('   ' + tronscanUrl);
console.log('');
console.log('3. En "Contract address" pega:');
console.log('   ' + tokenAddress);
console.log('');
console.log('4. Description (copia y pega en Tronscan):');
console.log('   ---');
console.log('   ' + description);
console.log('   ---');
console.log('');
console.log('5. Logo (URL para pegar en Tronscan):');
if (logoUrl) {
  console.log('   ' + logoUrl);
} else {
  console.log('   Rellena trc20-token.config.json (githubUser, githubRepo, branch) y sube el repo a GitHub.');
  console.log('   Ejemplo: https://raw.githubusercontent.com/TU_USUARIO/TU_REPO/main/blockchain/trc20-token/assets/tether-logo.webp');
}
console.log('');
console.log('6. Project website:');
console.log('   ' + websiteUrl);
console.log('');
console.log('Ver todos los textos y pasos: docs/TRONSCAN_DATOS_PEGAR.md');
console.log('');
