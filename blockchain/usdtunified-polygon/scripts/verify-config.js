#!/usr/bin/env node
/**
 * verify-config.js — Verifica que la configuración del contrato sea correcta (solo lectura).
 * Uso: node scripts/verify-config.js
 */
"use strict";

require("dotenv").config();
const { ethers } = require("ethers");
const {
  CONTRACT_ADDRESS,
  USDT_POLYGON,
  QUICKSWAP_FACTORY,
  WMATIC,
  ABI,
} = require("../config.js");

const config = require("../config.js");
const rpc = process.env.POLYGON_RPC || config.POLYGON_RPC_DEFAULT;

async function main() {
  const provider = new ethers.JsonRpcProvider(rpc);
  const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, provider);

  console.log("=== Verificación de Configuración ===\n");
  console.log("Contrato:", CONTRACT_ADDRESS);
  console.log("");

  const target = await contract.getFunction("target").staticCall();
  const syncWithTarget = await contract.syncWithTarget();
  const factory = await contract.factory();
  const wbnb = await contract.WBNB();
  const name = await contract.name();
  const symbol = await contract.symbol();
  const decimals = await contract.decimals();
  const paused = await contract.paused();
  const isExpired = await contract.isExpired();
  const pairWbnb = await contract.getPairWbnb();

  const targetOk = target.toLowerCase() === USDT_POLYGON.toLowerCase();
  const factoryOk = factory.toLowerCase() === QUICKSWAP_FACTORY.toLowerCase();
  const wmaticOk = wbnb.toLowerCase() === WMATIC.toLowerCase();

  console.log("Target:", target, targetOk ? "OK" : "FALTA CORREGIR");
  console.log("syncWithTarget:", syncWithTarget);
  console.log("Factory:", factory, factoryOk ? "OK" : "FALTA CONFIGURAR");
  console.log("WMATIC (WBNB):", wbnb, wmaticOk ? "OK" : "FALTA CONFIGURAR");
  console.log("name:", name);
  console.log("symbol:", symbol);
  console.log("decimals:", decimals);
  console.log("paused:", paused);
  console.log("isExpired:", isExpired);
  console.log("getPairWbnb():", pairWbnb === "0x0000000000000000000000000000000000000000" ? "(sin par)" : pairWbnb);
  console.log("");

  const allOk = targetOk && factoryOk && wmaticOk;
  if (allOk) {
    console.log("OK: Configuración correcta.");
  } else {
    console.log("ACCIÓN: Ejecutar npm run fix:target y/o npm run fix:dex");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
