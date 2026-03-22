'use strict';

const fs = require('node:fs');
const path = require('node:path');

/**
 * Registra respuestas HTTP de OKLink relevantes para depurar errores genéricos en la UI.
 * Antes solo se capturaba Content-Type: application/json; OKLink a veces devuelve JSON con
 * otro tipo, HTML con error embebido, o texto plano.
 *
 * @param {import('playwright').Page} page
 * @param {string} logPath ruta absoluta al archivo de log
 * @param {{ overwrite?: boolean }} [opts]
 * @returns {{ getLastResponse: () => { ts: string, status: number, url: string, body: string } | null, append: (s: string) => void }}
 */
function attachOklinkNetworkDebug(page, logPath, opts) {
  const overwrite = opts && opts.overwrite === true;
  let lastResponse = null;

  try {
    fs.mkdirSync(path.dirname(logPath), { recursive: true });
  } catch (_) { /* ignore */ }

  const append = (text) => {
    try {
      fs.appendFileSync(logPath, text + '\n', 'utf8');
    } catch (_) { /* ignore */ }
  };

  if (overwrite) {
    try {
      fs.writeFileSync(logPath, 'OKLink network debug — ' + new Date().toISOString() + '\n\n', 'utf8');
    } catch (_) { /* ignore */ }
  } else {
    try {
      fs.appendFileSync(logPath, '\n--- sesión ' + new Date().toISOString() + ' ---\n', 'utf8');
    } catch (_) { /* ignore */ }
  }

  page.on('requestfailed', (req) => {
    const fail = req.failure();
    const line = 'REQUEST_FAILED ' + req.method() + ' ' + req.url() + ' | ' + (fail ? fail.errorText : '');
    append(line);
  });

  page.on('response', async (res) => {
    const url = res.url();
    if (!/oklink\.com/i.test(url)) return;
    const pathLike = url.replace(/^https?:\/\/[^/]+/i, '');
    const interesting =
      /\/api\/|verify|contract|source|submit|compile|explorer|tron\/|\/v\d+\//i.test(pathLike + url);
    if (!interesting) return;

    const status = res.status();
    const ct = (res.headers()['content-type'] || '').toLowerCase();

    try {
      const bodyText = await res.text();
      const trim = bodyText.trim();
      const looksJson = trim.startsWith('{') || trim.startsWith('[');
      const hintError = /error|fail|invalid|code|message|msg|exception|denied|limit|429|503|500/i.test(
        bodyText.slice(0, 4000)
      );
      const shouldLog =
        status >= 400 ||
        ct.includes('json') ||
        looksJson ||
        hintError ||
        (status === 200 && looksJson);

      if (!shouldLog) {
        if (status === 200 && ct.includes('text/html') && bodyText.length > 20000) return;
        return;
      }

      const maxBody = 16000;
      const chunk = bodyText.length > maxBody ? bodyText.slice(0, maxBody) + '\n...[truncado ' + bodyText.length + ' chars]' : bodyText;

      const block = [
        'ts=' + new Date().toISOString(),
        'status=' + status,
        'content-type=' + ct,
        'url=' + url,
        'body:\n' + chunk
      ].join('\n');

      append(block);
      lastResponse = {
        ts: new Date().toISOString(),
        status,
        url,
        body: bodyText.slice(0, 8000)
      };
    } catch (e) {
      append('response_read_error ' + url + ' ' + (e && e.message));
    }
  });

  return {
    getLastResponse: () => lastResponse,
    append
  };
}

module.exports = { attachOklinkNetworkDebug };
