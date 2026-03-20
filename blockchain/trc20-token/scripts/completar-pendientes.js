#!/usr/bin/env node
'use strict';
/**
 * Checklist y guía para completar pendientes del token Colateral USD.
 * Ejecuta: npm run completar-pendientes
 * - Muestra estado actual (check-mainnet-live)
 * - Verifica requisitos perfil Tronscan (check-perfil-ready)
 * - Imprime pasos manuales y automatizables
 */
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.join(__dirname, '..');

function run(cmd, opts = {}) {
  try {
    return execSync(cmd, { encoding: 'utf8', cwd: opts.cwd || ROOT, stdio: opts.silent ? 'pipe' : 'inherit' });
  } catch (e) {
    if (opts.silent) return null;
    throw e;
  }
}

function main() {
  console.log('');
  console.log('=== COMPLETAR PENDIENTES — Token Colateral USD (TV4P3sVf) ===');
  console.log('');

  const items = [
    {
      id: '0',
      name: 'Corregir symbol USDT→USTD (mainnet actual vs esperado)',
      automated: true,
      steps: [
        'Mainnet tiene symbol=USDT, esperado USTD (token-info.json).',
        'Comando: npm run set:symbol USTD',
        'Requisitos: PRIVATE_KEY + TRON_PRO_API_KEY en .env, ~3 TRX.',
        'No requiere upgrade; setSymbol es cambio de estado en Implementation activa.'
      ],
      check: 'npm run revisar:contratos (comparar symbol actual vs esperado)'
    },
    {
      id: '1',
      name: 'Perfil token Tronscan (logo, descripción, web)',
      automated: false,
      steps: [
        '1. Ejecutar: npm run perfil (muestra datos para pegar)',
        '2. Abrir https://tronscan.org/#/tokens/create/TRC20',
        '3. Conectar wallet owner (TWYhXqeMMtEe...)',
        '4. Pegar Contract address: TV4P3sVfSQULNnsCPyzLnofCbK6cwkHeDm',
        '5. Pegar Description, Logo URL, Project website del output de npm run perfil',
        '6. Guardar'
      ],
      check: 'npm run check:perfil'
    },
    {
      id: '2',
      name: 'Verificación Implementation en Tronscan',
      automated: false,
      steps: [
        'TXaXTSUK (Implementation antigua): bytecode no coincidió con source local — obsoleta tras upgrade.',
        'Tras upgrade: verificar la NUEVA Implementation con verification/PAQUETE-VERIFICACION-POST-UPGRADE/',
        'Pasos: npm run guardar:verificacion, luego Tronscan → Contract address = deploy-info.json implementationAddress',
        'Subir: TRC20TokenUpgradeable.sol (de verification/PAQUETE-VERIFICACION-POST-UPGRADE/)',
        'Contract Verify: https://tronscan.org/#/contracts/verify'
      ],
      check: 'npm run guardar:verificacion (genera paquete para post-upgrade)'
    },
    {
      id: '3',
      name: 'MCP TRON (Cursor) — opcional',
      automated: false,
      steps: [
        'Reconfigurado: usa @bankofai/mcp-server-tron vía scripts/mcp-tron-wrapper.js.',
        'El wrapper carga PRIVATE_KEY y TRON_PRO_API_KEY desde blockchain/trc20-token/.env.',
        'Reinicia Cursor una vez para cargar las herramientas TRON (balances, transfers, contratos).',
        'Si no aparecen: comprobar Node ≥20, npm run check OK; ver logs MCP en Cursor (Output → MCP).',
        'NO bloquea perfil ni verificación: se hacen en tronscan.org en el navegador.'
      ],
      check: null
    },
    {
      id: '4',
      name: 'Upgrade (nueva Implementation + batchTransfer/batchMint/setName/setSymbol)',
      automated: true,
      steps: [
        '1. npm run preparar:redespliegue (genera paquete verificación)',
        '2. npm run verify:pre-upgrade (wallet = ProxyAdmin.owner)',
        '3. npm run upgrade:mainnet (deploy nueva Implementation, actualiza Proxy)',
        '4. Verificar nueva Implementation en Tronscan: verification/PAQUETE-VERIFICACION-POST-UPGRADE/',
        '   Contract address = deploy-info.json → implementationAddress',
        'Opcional: npm run initialize-v2 mainnet 2 max (si se quiere version=2, cap ilimitado)'
      ],
      check: 'npm run verify:pre-upgrade'
    },
    {
      id: '5',
      name: 'Trust Wallet Assets (logo y datos para display en wallets)',
      automated: false,
      steps: [
        '1. Generar logo 256×256 PNG: npm run generate:logo',
        '2. Preparar metadata: npm run preparar:wallet-display (crea/actualiza token-metadata.json)',
        '3. Registrar en https://developer.trustwallet.com/add_new_asset',
        '   Requisitos: logo 256×256 PNG, fondo transparente, ≤100 KB',
        '   Fee: 500 TWT o 2.5 BNB por pull request',
        '4. Contract address, symbol, decimals del contrato on-chain'
      ],
      check: 'npm run preparar:wallet-display'
    },
    {
      id: '6',
      name: 'Display automático en wallets (sin interacción del receptor)',
      automated: false,
      steps: [
        'Para que el receptor vea el token automáticamente al recibir la transferencia:',
        '1. Logo URL 200: npm run upload:logo:pinata (sube a Pinata IPFS) o push de logo.png al repo',
        '2. Añadir logoUrlPinata a trc20-token.config.json con la URL devuelta',
        '3. Completar perfil Tronscan — https://tronscan.org/#/tokens/create/TRC20 (Contract, Logo URL, Description, Website)',
        '4. Trust Wallet (opcional) — assets.trustwallet.com para más cobertura'
      ],
      check: 'npm run verificar:display-wallet'
    }
  ];

  // 1. Estado mainnet
  console.log('--- Estado mainnet (check-mainnet-live) ---');
  try {
    run('node scripts/check-mainnet-live.js');
  } catch (e) {
    console.log('(check-mainnet-live falló o no disponible)');
  }
  console.log('');

  // 2. Requisitos perfil
  console.log('--- Requisitos perfil Tronscan (check:perfil) ---');
  try {
    run('node scripts/check-perfil-ready.js');
  } catch (e) {
    console.log('Faltan requisitos. Ver pasos manuales abajo.');
  }
  console.log('');

  // 2b. Verificación display en wallets (garantía nombre, símbolo, logo)
  console.log('--- Verificación display en wallets (verificar:display-wallet) ---');
  try {
    run('node scripts/verificar-display-wallet.js');
  } catch (e) {
    console.log('Hay requisitos pendientes para display automático. Ver ítems ✗ arriba.');
  }
  console.log('');

  // 3. Checklist
  console.log('--- PENDIENTES Y PASOS MANUALES ---');
  items.forEach((item) => {
    console.log('');
    console.log(`[${item.id}] ${item.name}`);
    console.log('    ' + (item.automated ? '(automatizable: ver comando abajo)' : '(requiere acción manual)'));
    item.steps.forEach((s) => console.log('    • ' + s));
    if (item.check) {
      console.log('    Verificación: ' + item.check);
    }
  });

  console.log('');
  console.log('--- COMANDOS ÚTILES ---');
  console.log('  npm run verificar:display-wallet  — Verificar requisitos para display (on-chain + logo + alternativas)');
  console.log('  npm run garantizar:display-wallet  — Verificar + preparar (garantía completa)');
  console.log('  npm run perfil             — Datos listos para pegar en Tronscan');
  console.log('  npm run check:perfil        — Comprobar requisitos perfil (múltiples URLs logo)');
  console.log('  npm run preparar:wallet-display — Token metadata + checklist Tronscan/Trust Wallet');
  console.log('  npm run generate:logo       — Generar logo.png 256×256 para Trust Wallet');
  console.log('  npm run check-mainnet       — Estado contratos');
  console.log('');
  console.log('Vitácora: docs/vitacora/CONSOLIDACION_COMPLETA_TODO.md');
  console.log('  Sección ACTUALIZACION_TRON_2026-03-13, Pendientes.');
  console.log('');
}

main();
