'use strict';
const https = require('node:https');
const txId = process.argv[2] || 'bcc04dc99aec269d12e5b623ca68f57e017d89cfab72bf75a798e6ce95c24498';
const body = JSON.stringify({ value: txId });
const req = https.request({
  hostname: 'api.trongrid.io',
  path: '/wallet/gettransactioninfobyid',
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body, 'utf8') }
}, (res) => {
  let data = '';
  res.on('data', (c) => data += c);
  res.on('end', () => console.log(data));
});
req.on('error', (e) => console.error(e));
req.write(body);
req.end();
