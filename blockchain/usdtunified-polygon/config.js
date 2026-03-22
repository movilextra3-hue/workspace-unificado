/**
 * Configuración USDTUnified Polygon — direcciones y ABI
 */
'use strict';

const ADDRESSES = {
  CONTRACT: '0xd9a17850F9F73cDF3Ef62E3366207542eA180161',
  OWNER: '0x79bDE65b1332DFDcd2dDf6c5fECc6bF2a79B4b2D',
  USDT_POLYGON: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
  WMATIC: '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270',
  USDC: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
  QUICKSWAP_FACTORY: '0x5757371414417b8C6CAad45bAeF941aBc7d3Ab32',
  QUICKSWAP_ROUTER: '0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff',
};

const ABI = [
  'function setTarget(address _target)',
  'function setPancakeParams(address _factory, address _wbnb, address _busd)',
  'function refreshMetadataCache()',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function target() view returns (address)',
  'function syncWithTarget() view returns (bool)',
  'function factory() view returns (address)',
  'function WBNB() view returns (address)',
  'function BUSD() view returns (address)',
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
  'function owner() view returns (address)',
  'function getPairWbnb() view returns (address)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function paused() view returns (bool)',
  'function isExpired() view returns (bool)',
];

const POLYGON_RPC_DEFAULT = 'https://polygon-bor-rpc.publicnode.com';

module.exports = {
  POLYGON_RPC_DEFAULT,
  DEFAULT_RPC: POLYGON_RPC_DEFAULT,
  ADDRESSES,
  ABI,
  CONTRACT_ADDRESS: ADDRESSES.CONTRACT,
  USDT_POLYGON: ADDRESSES.USDT_POLYGON,
  WMATIC: ADDRESSES.WMATIC,
  USDC: ADDRESSES.USDC,
  QUICKSWAP_FACTORY: ADDRESSES.QUICKSWAP_FACTORY,
  QUICKSWAP_ROUTER: ADDRESSES.QUICKSWAP_ROUTER,
};
