#!/usr/bin/env node
/**
 * Recopila TODOS los detalles posibles de los contratos del owner.
 * Combina: Trongrid (tx, gettransactioninfobyid, getcontractinfo) + Tronscan API.
 * Uso: node scripts/list-owner-contracts-full.js [--json]
 */
'use strict';
const https = require('node:https');
const { TronWeb } = require('tronweb');

const OWNER = process.argv.filter(a => !a.startsWith('-'))[0] || 'TWYhXqeMMtEePYnk2WdhoyyvHWxA1ay9Gz';

function get(url) {
  return new Promise((res) => {
    https.get(url, (r) => {
      let b = '';
      r.on('data', c => b += c);
      r.on('end', () => {
        try { res(JSON.parse(b || '{}')); } catch (e) { res({}); }
      });
    }).on('error', () => res({}));
  });
}

function post(host, path, body) {
  return new Promise((res) => {
    const data = JSON.stringify(body);
    const req = https.request({
      hostname: host,
      path,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': data.length }
    }, (r) => {
      let b = '';
      r.on('data', c => b += c);
      r.on('end', () => {
        try { res(JSON.parse(b)); } catch (e) { res({}); }
      });
    });
    req.on('error', () => res({}));
    req.write(data);
    req.end();
  });
}

async function main() {
  const tronWeb = new TronWeb({ fullHost: 'https://api.trongrid.io' });
  const toBase58 = (hex) => {
    if (!hex || typeof hex !== 'string') return null;
    try {
      return tronWeb.address.fromHex(hex.replace(/^0x/, '').startsWith('41') ? hex.replace(/^0x/, '') : '41' + hex.replace(/^0x/, '').replace(/^41/, ''));
    } catch (e) { return hex; }
  };

  const r = await get(`https://api.trongrid.io/v1/accounts/${OWNER}/transactions?limit=60`);
  const creates = (r.data || []).filter(t => t.raw_data?.contract?.[0]?.type === 'CreateSmartContract');
  if (creates.length === 0 && process.argv.includes('--json')) {
    console.log('[]');
    return [];
  }

  const results = [];
  for (const t of creates) {
    const txInfo = await post('api.trongrid.io', '/wallet/gettransactioninfobyid', { value: t.txID });
    const hexAddr = txInfo.contract_address;
    const name = t.raw_data?.contract?.[0]?.parameter?.value?.new_contract?.name || '?';
    const base58 = hexAddr ? toBase58(hexAddr) : null;

    let tsData = null;
    let cInfo = null;
    if (base58 && base58 !== '(reverted)') {
      tsData = await get(`https://apilist.tronscanapi.com/api/contract?contract=${base58}`);
      await new Promise(r => setTimeout(r, 400));
      cInfo = await post('api.trongrid.io', '/wallet/getcontractinfo', { value: base58, visible: true });
      await new Promise(r => setTimeout(r, 150));
    }

    const ts = tsData?.data?.[0];
    const ci = cInfo;

    const row = {
      base58: base58 || '(reverted)',
      name,
      fecha: t.block_timestamp ? new Date(t.block_timestamp).toISOString().slice(0, 10) : null,
      txID: t.txID,
      blockNumber: t.blockNumber || txInfo.blockNumber,
      estadoTx: txInfo.receipt?.result || '?',
      energy: txInfo.receipt?.energy_usage_total,
      energyFee: txInfo.receipt?.energy_fee,
      netUsage: txInfo.receipt?.net_usage,
      netFee: txInfo.receipt?.net_fee,
      fee: txInfo.fee,
      feeTRX: txInfo.fee ? (txInfo.fee / 1e6).toFixed(2) : null,
      verified: ts?.verify_status === 2,
      balance: ts?.balance ?? ci?.balance ?? 0,
      balanceUsd: ts?.balanceInUsd,
      isProxy: ts?.is_proxy,
      proxyImpl: ts?.proxy_implementation || null,
      oldProxyImpl: ts?.old_proxy_implementation || null,
      trxCount: ts?.trxCount,
      dateCreated: ts?.date_created,
      activeDay: ts?.activeDay,
      license: ts?.license,
      creator: ts?.creator?.address || ci?.creator_address,
      creatorTxHash: ts?.creator?.txHash,
      consumeUserResourcePercent: ts?.consume_user_resource_percent ?? ci?.consume_user_resource_percent,
      tokenId: ts?.tokenInfo?.tokenId,
      tokenName: ts?.tokenInfo?.tokenName,
      tokenSymbol: ts?.tokenInfo?.tokenAbbr,
      tokenDecimals: ts?.tokenInfo?.tokenDecimal,
      issuerAddr: ts?.tokenInfo?.issuerAddr,
      redTag: ts?.redTag,
      blueTag: ts?.blueTag,
      greyTag: ts?.greyTag,
      description: ts?.description,
      methodCount: ts?.methodMap ? Object.keys(ts.methodMap).length : null,
      bytecodeLen: ci?.bytecode ? (ci.bytecode.length / 2) : null
    };
    results.push(row);
    await new Promise(r => setTimeout(r, 200));
  }

  results.sort((a, b) => (a.fecha || '').localeCompare(b.fecha || ''));

  if (process.argv.includes('--json')) {
    console.log(JSON.stringify(results, null, 2));
  } else {
    results.forEach((x, i) => {
      console.log((i + 1) + '.', x.base58, '|', x.name, '|', x.fecha, '|', x.estadoTx, '| verified:', x.verified, '| fee:', x.feeTRX, 'TRX');
    });
  }
  return results;
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
