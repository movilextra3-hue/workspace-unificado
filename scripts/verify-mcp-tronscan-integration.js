#!/usr/bin/env node
'use strict';
/**
 * Comprueba de forma reproducible que el MCP oficial TronScan responde
 * (initialize + tools/list) y que la configuración del repo referencia el puente.
 * No sustituye la verificación manual en Cursor (lista de herramientas en UI).
 */
const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');

const ROOT = path.resolve(__dirname, '..');
const MCP_JSON = path.join(ROOT, '.cursor', 'mcp.json');
const URL = 'https://mcp.tronscan.org/mcp';

function fail(msg) {
  console.error(msg);
  process.exit(1);
}

async function httpProbe() {
  const initBody = JSON.stringify({
    jsonrpc: '2.0',
    method: 'initialize',
    params: {
      protocolVersion: '2025-06-18',
      capabilities: {},
      clientInfo: { name: 'verify-mcp-tronscan-integration', version: '1.0' }
    },
    id: 1
  });
  const r1 = await fetch(URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json, text/event-stream'
    },
    body: initBody
  });
  if (r1.status !== 200) fail(`initialize: HTTP ${r1.status}`);
  const sid = r1.headers.get('mcp-session-id');
  if (!sid || !String(sid).trim()) fail('initialize: falta cabecera mcp-session-id');

  const listBody = JSON.stringify({
    jsonrpc: '2.0',
    method: 'tools/list',
    params: {},
    id: 2
  });
  const r2 = await fetch(URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json, text/event-stream',
      'mcp-session-id': sid
    },
    body: listBody
  });
  if (r2.status !== 200) fail(`tools/list: HTTP ${r2.status}`);
  const text = await r2.text();
  if (text.length < 500) fail('tools/list: cuerpo demasiado corto');
  if (!text.includes('tools') && !text.includes('getBlocks')) {
    fail('tools/list: respuesta sin marcadores esperados de herramientas');
  }
}

function configProbe() {
  if (!fs.existsSync(MCP_JSON)) fail(`Falta ${MCP_JSON}`);
  const j = JSON.parse(fs.readFileSync(MCP_JSON, 'utf8'));
  const ts = j.mcpServers?.tronscan;
  if (ts?.command !== 'node') fail('mcp.json: falta mcpServers.tronscan con command node');
  const args = ts.args?.join(' ') ?? '';
  if (!args.includes('mcp-tronscan-remote.js')) {
    fail('mcp.json: tronscan debe apuntar a scripts/mcp-tronscan-remote.js');
  }
}

function wrapperStarts() {
  return new Promise((resolve, reject) => {
    // Mantener stdin abierto (pipe sin consumir); si no, mcp-remote puede salir enseguida.
    const child = spawn('node', [path.join(ROOT, 'scripts', 'mcp-tronscan-remote.js')], {
      cwd: ROOT,
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: false
    });
    const t = setTimeout(() => {
      try {
        child.kill('SIGTERM');
      } catch {
        /* ignore */
      }
    }, 3500);
    child.on('error', (e) => {
      clearTimeout(t);
      reject(e);
    });
    child.on('exit', (code, signal) => {
      clearTimeout(t);
      if (signal === 'SIGTERM') resolve();
      else reject(new Error(`wrapper salió demasiado pronto: code=${code} signal=${signal}`));
    });
  });
}

async function main() {
  configProbe();
  await httpProbe();
  await wrapperStarts();
  console.log('OK: MCP TronScan — HTTP (initialize + tools/list), mcp.json y arranque del wrapper verificados.');
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
