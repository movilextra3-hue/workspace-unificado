'use strict';
/**
 * Dirección de la Implementation en mainnet — misma fuente que deploy-info / abi/addresses.json.
 * Evita desincronizar scripts de verificación con constantes obsoletas.
 */
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..', '..');
/** Fallback documentado si no hay JSON (mismo contrato del último upgrade documentado en vitácora). */
const DEFAULT_IMPLEMENTATION = 'TFeLLtutboNwVwSSdNqAiXoQGzXZrbTDMC';

/**
 * @returns {string} Base58 TRON implementation address
 */
function loadImplementationAddress() {
  for (const rel of ['deploy-info.json', path.join('abi', 'addresses.json')]) {
    const fp = path.join(ROOT, rel);
    if (!fs.existsSync(fp)) continue;
    try {
      const d = JSON.parse(fs.readFileSync(fp, 'utf8'));
      const impl = d.implementationAddress || d.implementation;
      if (typeof impl === 'string' && impl.length >= 30 && /^T[A-Za-z0-9]{33}$/.test(impl.trim())) {
        return impl.trim();
      }
    } catch (_) {
      /* siguiente archivo */
    }
  }
  return DEFAULT_IMPLEMENTATION;
}

module.exports = {
  loadImplementationAddress,
  DEFAULT_IMPLEMENTATION,
  ROOT
};
