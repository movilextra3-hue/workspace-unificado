#!/usr/bin/env node
/**
 * set-pancake-params.js — Configura Factory, WMATIC y USDC para integración DEX (QuickSwap).
 * Uso: node scripts/set-pancake-params.js
 */
"use strict";

require("dotenv").config();
const { ethers } = require("ethers");
const {
  CONTRACT_ADDRESS,
  QUICKSWAP_FACTORY,
  WMATIC,
  USDC,
  ABI,
} = require("../config.js");

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

  console.log("=== Set Pancake Params (QuickSwap) ===\n");
  console.log("Factory:", QUICKSWAP_FACTORY);
  console.log("WMATIC:", WMATIC);
  console.log("USDC:", USDC);
  console.log("Wallet:", wallet.address);
  console.log("");

  const tx = await contract.setPancakeParams(QUICKSWAP_FACTORY, WMATIC, USDC);
  console.log("TX enviada:", tx.hash);
  await tx.wait();
  console.log("Confirmado.");

  const factory = await contract.factory();
  const wbnb = await contract.WBNB();
  if (
    factory.toLowerCase() !== QUICKSWAP_FACTORY.toLowerCase() ||
    wbnb.toLowerCase() !== WMATIC.toLowerCase()
  ) {
    console.error("ERROR: Verificación fallida. Factory:", factory, "| WMATIC:", wbnb);
    process.exit(1);
  }
  console.log("OK: Paso 2 finalizado correctamente.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
