'use strict';
/**
 * Elimina los archivos .md originales consolidados en docs/vitacora
 * para evitar duplicados. Usa MAPA_RUTAS_MD_CONSOLIDACION.json
 *
 * Uso: node scripts/eliminar-originales-md.js [--dry-run]
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const MAP_PATH = path.join(ROOT, 'docs', 'vitacora', 'MAPA_RUTAS_MD_CONSOLIDACION.json');

const dryRun = process.argv.includes('--dry-run');
const map = JSON.parse(fs.readFileSync(MAP_PATH, 'utf8'));

// READMEs que conservamos como stub (apuntan a vitacora)
const STUB_README = {
  'README.md': '# Workspace unificado\n\nDocumentación consolidada en [docs/vitacora/](docs/vitacora/).\n',
  'blockchain/trc20-token/README.md': '# Token TRC-20\n\nDocumentación en [docs/vitacora/trc20-token/README_blockchain_trc20-token.md](docs/vitacora/trc20-token/README_blockchain_trc20-token.md).\n',
  'blockchain/token-erc20/README.md': '# Token ERC-20\n\nDocumentación en [docs/vitacora/blockchain/token-erc20/README.md](docs/vitacora/blockchain/token-erc20/README.md).\n',
  'apps/rtsp-virtual-webcam/README.md': '# RTSP Virtual Webcam\n\nDocumentación en [docs/vitacora/apps/rtsp-virtual-webcam/README.md](docs/vitacora/apps/rtsp-virtual-webcam/README.md).\n',
  'apps/rtsp-webcam/README.md': '# RTSP Webcam\n\nDocumentación en [docs/vitacora/apps/rtsp-webcam/README.md](docs/vitacora/apps/rtsp-webcam/README.md).\n',
};

let deleted = 0;
let stubbed = 0;

for (const { orig } of map) {
  const full = path.join(ROOT, orig.replace(/\//g, path.sep));
  if (!fs.existsSync(full)) continue;

  if (STUB_README[orig]) {
    if (!dryRun) fs.writeFileSync(full, STUB_README[orig]);
    stubbed++;
    console.log((dryRun ? '[DRY] ' : '') + 'Stub:', orig);
  } else {
    if (!dryRun) fs.unlinkSync(full);
    deleted++;
    console.log((dryRun ? '[DRY] ' : '') + 'Eliminado:', orig);
  }
}

console.log('\n' + (dryRun ? '[DRY-RUN] ' : '') + `Eliminados: ${deleted}, Stubs: ${stubbed}`);
if (dryRun) console.log('Ejecuta sin --dry-run para aplicar.');
