#!/usr/bin/env node
'use strict';
/**
 * Puente stdio → MCP remoto oficial TronScan (Streamable HTTP).
 * Documentación: https://mcpdoc.tronscan.org/en/mcp
 * URL producción: https://mcp.tronscan.org/mcp
 * Cabecera opcional: TRON-PRO-API-KEY (misma variable que el proyecto: TRON_PRO_API_KEY en .env)
 */
const path = require('node:path');
const { spawn } = require('node:child_process');
const fs = require('node:fs');

const ROOT = path.resolve(__dirname, '..');
const ENV_PATH = path.join(ROOT, 'blockchain', 'trc20-token', '.env');

try {
  require('dotenv').config({ path: ENV_PATH });
} catch {
  if (fs.existsSync(ENV_PATH)) {
    const content = fs.readFileSync(ENV_PATH, 'utf8');
    const lineRe = /^([^#=]+)=(.*)$/;
    for (const line of content.split('\n')) {
      const m = lineRe.exec(line);
      if (m) process.env[m[1].trim()] = m[2].trim();
    }
  }
}

const apiKey = (process.env.TRON_PRO_API_KEY || '').trim();
const args = ['-y', 'mcp-remote', 'https://mcp.tronscan.org/mcp'];
if (apiKey) {
  args.push('--header', `TRON-PRO-API-KEY:${apiKey}`);
}

const child = spawn('npx', args, {
  cwd: ROOT,
  env: { ...process.env },
  shell: true,
  stdio: 'inherit'
});
child.on('exit', (code) => process.exit(code ?? 0));
