#!/usr/bin/env node
/**
 * refresh-metadata.js — Actualiza la caché de metadatos (name, symbol, decimals).
 * Uso: node scripts/refresh-metadata.js
 */
"use strict";

require("dotenv").config();
const { ethers } = require("ethers");
const { CONTRACT_ADDRESS, ABI } = require("../config.js");

async function main() {
  const pk = process.env.PRIVATE_KEY;
  const { POLYGON_RPC_DEFAULT } = require("../config.js");
  const rpc = process.env.POLYGON_RPC || POLYGON_RPC_DEFAULT;

  if (!pk) {
    console.error("ERROR: PRIVATE_KEY no definida en .env");
    process.exit(1);
  }

  const provider = new ethers.JsonRpcProvider(rpc);
  const wallet = new ethers.Wallet(pk, provider);
  const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, wallet);

  console.log("=== Refresh Metadata Cache ===\n");

  const tx = await contract.refreshMetadataCache();
  console.log("TX enviada:", tx.hash);
  await tx.wait();
  console.log("Confirmado.");

  const name = await contract.name();
  const symbol = await contract.symbol();
  const decimals = await contract.decimals();
  const esperado = { name: "Tether USD", symbol: "USDT", decimals: 6n };
  if (name !== esperado.name || symbol !== esperado.symbol || Number(decimals) !== 6) {
    console.error("ERROR: Verificación fallida. name:", name, "symbol:", symbol, "decimals:", decimals);
    process.exit(1);
  }
  console.log("OK: Paso 3 finalizado correctamente.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
