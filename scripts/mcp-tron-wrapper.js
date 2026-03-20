#!/usr/bin/env node
'use strict';
/**
 * Wrapper para @bankofai/mcp-server-tron que carga variables desde blockchain/trc20-token/.env
 * para que coincidan con el proyecto (PRIVATE_KEY → TRON_PRIVATE_KEY, TRON_PRO_API_KEY → TRONGRID_API_KEY).
 * Uso: node scripts/mcp-tron-wrapper.js (Cursor lo invoca desde mcp.json)
 */
const path = require('path');
const { spawn } = require('child_process');

const fs = require('fs');
const ROOT = path.resolve(__dirname, '..');
const ENV_PATH = path.join(ROOT, 'blockchain', 'trc20-token', '.env');

try {
  require('dotenv').config({ path: ENV_PATH });
} catch {
  if (fs.existsSync(ENV_PATH)) {
    const content = fs.readFileSync(ENV_PATH, 'utf8');
    for (const line of content.split('\n')) {
      const m = line.match(/^([^#=]+)=(.*)$/);
      if (m) process.env[m[1].trim()] = m[2].trim();
    }
  }
}

const env = { ...process.env };
const pk = (process.env.PRIVATE_KEY || '').replace(/^0x/, '').trim();
const apiKey = (process.env.TRON_PRO_API_KEY || '').trim();
if (pk) env.TRON_PRIVATE_KEY = pk;
if (apiKey) env.TRONGRID_API_KEY = apiKey;
env.TRON_NETWORK = env.TRON_NETWORK || 'mainnet';

const child = spawn('npx', ['-y', '@bankofai/mcp-server-tron'], {
  cwd: ROOT,
  env,
  shell: true
});
child.on('exit', (code) => process.exit(code || 0));
