/**
 * Requisitos de compilación para que el bytecode sea verificable en Tronscan.
 * Tronscan ofrece 0.8.25 + Shanghai. Si desplegamos con otra versión, la verificación falla.
 *
 * Uso: require desde upgrade.js, deploy-upgradeable.js y check-tronbox-config.js
 * para bloquear despliegue si tronbox.js no cumple estos requisitos.
 */
'use strict';

/** Compilador del proyecto (Tronscan ofrece 0.8.25; debe coincidir con tronbox.js). */
const TRONSCAN_COMPILER = '0.8.25';

/** EVM que Tronscan acepta; Cancun da "Invalid EVM version". */
const TRONSCAN_EVM_VERSION = 'shanghai';

/** Optimizer runs (debe coincidir con tronbox y con lo que eliges en Tronscan). */
const TRONSCAN_OPTIMIZER_RUNS = 200;

/**
 * Lee tronbox.js y devuelve la config de compilador (version + settings.evmVersion).
 * @returns {{ version: string, evmVersion: string, runs: number } | null }
 */
function getTronboxCompilerConfig() {
  const path = require('node:path');
  const configPath = path.join(__dirname, '..', '..', 'config', 'trc20-networks.js');
  let config;
  try {
    config = require(configPath);
  } catch (e) {
    return null;
  }
  const compilers = config && config.compilers && config.compilers.solc;
  if (!compilers) return null;
  const version = (compilers.version || '').trim();
  const evmVersion = (compilers.settings && compilers.settings.evmVersion) || '';
  const runs = (compilers.settings && compilers.settings.optimizer && compilers.settings.optimizer.runs) || 0;
  return { version, evmVersion, runs };
}

/**
 * Comprueba que tronbox.js use compilador y EVM compatibles con Tronscan.
 * Si no, escribe mensaje a stderr y termina el proceso con código 1.
 * No lanza excepción; hace process.exit(1).
 */
function assertTronscanCompatibleOrExit() {
  const cfg = getTronboxCompilerConfig();
  if (!cfg) {
    console.error('');
    console.error('ERROR: No se pudo leer compilador en tronbox.js. No se puede garantizar que el bytecode sea verificable en Tronscan.');
    process.exit(1);
  }
  const okVersion = cfg.version === TRONSCAN_COMPILER;
  const okEvm = (cfg.evmVersion || '').toLowerCase() === TRONSCAN_EVM_VERSION;
  const okRuns = Number(cfg.runs) === TRONSCAN_OPTIMIZER_RUNS;
  if (okVersion && okEvm && okRuns) return;
  console.error('');
  console.error('ERROR: tronbox.js no está configurado para verificación en Tronscan.');
  console.error('  Tronscan acepta: Compiler ' + TRONSCAN_COMPILER + ', EVM ' + TRONSCAN_EVM_VERSION + ', Optimizer runs ' + TRONSCAN_OPTIMIZER_RUNS + '.');
  console.error('  Actual en tronbox.js: Compiler ' + cfg.version + ', EVM ' + (cfg.evmVersion || '(vacío)') + ', runs ' + cfg.runs + '.');
  console.error('  Si desplegas con otra config, el bytecode NO coincidirá y gastarás TRX sin poder verificar.');
  console.error('  Corrige tronbox.js (compilers.solc.version y compilers.solc.settings.evmVersion) y vuelve a ejecutar.');
  console.error('');
  process.exit(1);
}

module.exports = {
  TRONSCAN_COMPILER,
  TRONSCAN_EVM_VERSION,
  TRONSCAN_OPTIMIZER_RUNS,
  getTronboxCompilerConfig,
  assertTronscanCompatibleOrExit
};
