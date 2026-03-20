'use strict';
/**
 * Carga datos del perfil del token (deploy-info + trc20-token.config.json + .env).
 * Usado por post-deploy-perfil.js, check-perfil-ready.js y tronscan-perfil-open.js.
 */
const path = require('node:path');
const fs = require('node:fs');
const { execSync } = require('node:child_process');

const ROOT = path.join(__dirname, '..', '..');

function loadEnv() {
  const envPath = path.join(ROOT, '.env');
  if (!fs.existsSync(envPath)) return;
  try {
    const content = fs.readFileSync(envPath, 'utf8');
    content.split('\n').forEach((line) => {
      const m = (/^\s*([A-Za-z_]\w*)\s*=\s*(.*)$/).exec(line);
      if (m && process.env[m[1]] === undefined) process.env[m[1]] = (m[2] || '').trim();
    });
  } catch (err) {
    if (err.code !== 'ENOENT') console.warn('loadEnv:', err.message);
  }
}

function loadConfig(configPath) {
  if (!fs.existsSync(configPath)) return null;
  try {
    return JSON.parse(fs.readFileSync(configPath, 'utf8'));
  } catch (err) {
    console.warn('trc20-token.config.json:', err.message);
    return null;
  }
}

function getGitOrigin(cwd) {
  try {
    const origin = execSync('git remote get-url origin', { cwd, encoding: 'utf8' }).trim();
    const match = (/github\.com[/:]([^/]+)\/([^/]+?)(?:\.git)?$/).exec(origin);
    return match ? { user: match[1], repo: match[2].replace(/\.git$/, '') } : null;
  } catch (err) {
    if (process.env.DEBUG) console.debug('git origin:', err.message);
    return null;
  }
}

function applyConfigDefaults(config) {
  const defaults = {
    description: 'Token TRC-20 estable vinculado a USD en la red TRON. Compatible con wallets y exploradores estándar.',
    websiteUrl: process.env.WEBSITE_URL || process.env.GITHUB_WEBSITE_URL || 'https://tudominio.com',
    githubUser: process.env.GITHUB_USER || '',
    githubRepo: process.env.GITHUB_REPO || '',
    branch: process.env.GITHUB_BRANCH || process.env.BRANCH || 'main',
    logoPathInRepo: process.env.LOGO_PATH_IN_REPO || 'assets/logo.png',
    socials: { twitter: '', telegram: '', discord: '' }
  };
  if (!config) return defaults;
  if (config.description) defaults.description = config.description;
  if (config.websiteUrl) defaults.websiteUrl = config.websiteUrl;
  if (config.githubUser) defaults.githubUser = config.githubUser;
  if (config.githubRepo) defaults.githubRepo = config.githubRepo;
  if (config.branch) defaults.branch = config.branch;
  if (config.logoPathInRepo) defaults.logoPathInRepo = config.logoPathInRepo;
  if (config.socials && typeof config.socials === 'object') defaults.socials = { ...defaults.socials, ...config.socials };
  return defaults;
}

function buildLogoUrl(githubUser, githubRepo, branch, logoPathInRepo) {
  if (!githubUser || !githubRepo || !branch) return '';
  const lp = (logoPathInRepo || 'assets/logo.png').replace(/^\//, '');
  return 'https://raw.githubusercontent.com/' + githubUser + '/' + githubRepo + '/' + branch + '/' + lp;
}

function getPerfilData() {
  loadEnv();
  let tokenAddress = '';
  const deployPath = path.join(ROOT, 'deploy-info.json');
  const addressesPath = path.join(ROOT, 'abi', 'addresses.json');
  if (fs.existsSync(deployPath)) {
    const info = JSON.parse(fs.readFileSync(deployPath, 'utf8'));
    tokenAddress = info.tokenAddress || '';
  } else if (fs.existsSync(addressesPath)) {
    const info = JSON.parse(fs.readFileSync(addressesPath, 'utf8'));
    tokenAddress = info.tokenAddress || '';
  }
  if (!tokenAddress) throw new Error('Falta deploy-info.json o abi/addresses.json con tokenAddress.');

  const config = loadConfig(path.join(ROOT, 'trc20-token.config.json'));
  const opts = applyConfigDefaults(config);

  if ((!opts.githubUser || !opts.githubRepo) && fs.existsSync(path.join(ROOT, '.git'))) {
    const git = getGitOrigin(ROOT);
    if (git) {
      if (!opts.githubUser) opts.githubUser = git.user;
      if (!opts.githubRepo) opts.githubRepo = git.repo;
    }
  }
  if ((!opts.githubUser || !opts.githubRepo) && fs.existsSync(path.join(ROOT, '..', '..', '.git'))) {
    const git = getGitOrigin(path.join(ROOT, '..', '..'));
    if (git) {
      if (!opts.githubUser) opts.githubUser = git.user;
      if (!opts.githubRepo) opts.githubRepo = git.repo;
    }
  }

  let websiteUrl = opts.websiteUrl;
  if (!websiteUrl || websiteUrl === 'https://tudominio.com') {
    if (opts.githubUser && opts.githubRepo) {
      websiteUrl = 'https://github.com/' + opts.githubUser + '/' + opts.githubRepo;
    } else {
      websiteUrl = opts.websiteUrl || 'https://tudominio.com';
    }
  }

  const githubLogoUrl = buildLogoUrl(opts.githubUser, opts.githubRepo, opts.branch, opts.logoPathInRepo);
  const logoUrl = config?.logoUrlPinata || githubLogoUrl;
  return {
    tokenAddress,
    description: opts.description,
    websiteUrl,
    logoUrl,
    socials: opts.socials,
    logoPathInRepo: opts.logoPathInRepo,
    githubUser: opts.githubUser,
    githubRepo: opts.githubRepo,
    branch: opts.branch
  };
}

/**
 * Devuelve todas las URLs alternativas del logo para redundancia ante fallos.
 * Si una fuente falla (GitHub raw 404, rate limit, CDN caído), otra puede funcionar.
 * @returns {string[]} Array de URLs [primaria, jsDelivr, ...fallbacks de config]
 */
function getLogoUrls() {
  let opts;
  try {
    opts = getPerfilData();
  } catch {
    const config = loadConfig(path.join(ROOT, 'trc20-token.config.json'));
    opts = applyConfigDefaults(config);
  }
  const urls = [];
  const config = loadConfig(path.join(ROOT, 'trc20-token.config.json'));
  // Pinata (IPFS) — primera prioridad: URL permanente, no depende de GitHub
  const pinataUrl = config?.logoUrlPinata;
  if (typeof pinataUrl === 'string' && pinataUrl) urls.push(pinataUrl);

  const { logoUrl, logoPathInRepo } = opts;
  const gu = opts.githubUser;
  const gr = opts.githubRepo;
  const br = opts.branch;

  if (logoUrl && !urls.includes(logoUrl)) urls.push(logoUrl);
  if (gu && gr && br) {
    const lp = (logoPathInRepo || 'assets/logo.png').replace(/^\//, '');
    const jsd = 'https://cdn.jsdelivr.net/gh/' + gu + '/' + gr + '@' + br + '/' + lp;
    if (!urls.includes(jsd)) urls.push(jsd);
  }
  const fallbacks = config?.logoUrlFallbacks;
  if (Array.isArray(fallbacks)) {
    fallbacks.forEach((u) => { if (typeof u === 'string' && u && !urls.includes(u)) urls.push(u); });
  }
  // Fallback final: URLs conocidas del workspace (garantía ante cualquier fallo de config/git)
  if (urls.length === 0) {
    const known = [
      'https://raw.githubusercontent.com/movilextra3-hue/workspace-unificado/main/blockchain/trc20-token/assets/logo.png',
      'https://cdn.jsdelivr.net/gh/movilextra3-hue/workspace-unificado@main/blockchain/trc20-token/assets/logo.png'
    ];
    urls.push(...known);
  }
  return urls.filter(Boolean);
}

/** Ruta local del archivo del logo (desde la raíz del token). */
function getLocalLogoPath() {
  const configPath = path.join(ROOT, 'trc20-token.config.json');
  let logoPathInRepo = 'assets/logo.png';
  const config = loadConfig(configPath);
  if (config?.logoPathInRepo) logoPathInRepo = config.logoPathInRepo;
  const basename = path.basename(logoPathInRepo);
  const dir = path.dirname(logoPathInRepo);
  if (dir === 'assets' || dir.endsWith('/assets')) return path.join(ROOT, 'assets', basename);
  return path.join(ROOT, 'assets', basename);
}

module.exports = { getPerfilData, getLocalLogoPath, getLogoUrls, ROOT };
