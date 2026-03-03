/**
 * Prepara paquete para verificación en Tronscan.
 * Genera verification/ con todos los contratos desplegados.
 * Uso: node scripts/prepare-verification.js
 */
'use strict';
const fs = require('fs');
const path = require('path');

const VERIFICATION_DIR = path.join(__dirname, '..', 'verification');
const CONTRACTS_DIR = path.join(__dirname, '..', 'contracts');
const DEPLOY_INFO_PATH = path.join(__dirname, '..', 'deploy-info.json');

const CONTRACTS_TO_VERIFY = [
  { src: 'TRC20TokenUpgradeable.sol', mainContract: true },
  { src: 'Initializable.sol' },
  { src: 'TransparentUpgradeableProxy.sol' },
  { src: 'ProxyAdmin.sol' }
];

function main() {
  if (!fs.existsSync(VERIFICATION_DIR)) {
    fs.mkdirSync(VERIFICATION_DIR, { recursive: true });
  }

  CONTRACTS_TO_VERIFY.forEach(({ src }) => {
    const srcPath = path.join(CONTRACTS_DIR, src);
    if (fs.existsSync(srcPath)) {
      const content = fs.readFileSync(srcPath, 'utf8');
      fs.writeFileSync(path.join(VERIFICATION_DIR, src), content);
    }
  });

  const metadata = {
    compiler: '0.8.34',
    optimization: true,
    runs: 200,
    license: 'MIT',
    mainContract: 'TRC20TokenUpgradeable',
    note: 'Verificar cada contrato con su dirección. Token = Proxy. Ver VERIFICATION.md.'
  };

  let deployInfo = {};
  if (fs.existsSync(DEPLOY_INFO_PATH)) {
    try {
      deployInfo = JSON.parse(fs.readFileSync(DEPLOY_INFO_PATH, 'utf8'));
    } catch (e) {
      console.warn('deploy-info.json inválido, usando metadata por defecto:', e.message);
    }
  }

  const verificationInfo = { ...metadata, ...deployInfo };
  fs.writeFileSync(
    path.join(VERIFICATION_DIR, 'verification-params.json'),
    JSON.stringify(verificationInfo, null, 2)
  );

  console.log('Paquete de verificación generado en verification/');
  CONTRACTS_TO_VERIFY.forEach(({ src }) => console.log(`- ${src}`));
  console.log('- verification-params.json');
  console.log('\nMainnet - Verificar contratos en Tronscan:');
  console.log('https://tronscan.org/#/contracts/verify');
}

main();
