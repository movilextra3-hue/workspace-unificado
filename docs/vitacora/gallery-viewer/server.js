#!/usr/bin/env node
/**
 * Servidor local para visualizar todos los archivos multimedia de E: y D:
 * Sin necesidad de acceder a las ubicaciones originales.
 * Uso: node server.js
 * Abrir: http://localhost:3880
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = 3880;
const CSV_PATH = path.join(__dirname, '..', 'IMAGENES_VIDEOS_E_D.csv');
const ROOTS = ['E:\\', 'D:\\'];

function loadCsv() {
  const raw = fs.readFileSync(CSV_PATH, 'utf8');
  const lines = raw.split(/\r?\n/).filter(Boolean);
  const header = lines[0];
  const rows = lines.slice(1).map(line => {
    const match = line.match(/^"([^"]+)","(\d+)","([^"]+)"$/);
    if (!match) return null;
    return { FullName: match[1], Length: parseInt(match[2], 10), LastWriteTime: match[3] };
  }).filter(Boolean);
  return rows;
}

function safePath(decoded) {
  const p = decoded.replace(/\//g, '\\');
  return ROOTS.some(r => p.startsWith(r)) ? p : null;
}

function getMime(ext) {
  const m = {
    png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif',
    bmp: 'image/bmp', webp: 'image/webp', tiff: 'image/tiff', tif: 'image/tiff',
    ico: 'image/x-icon', heic: 'image/heic',
    mp4: 'video/mp4', mkv: 'video/x-matroska', avi: 'video/x-msvideo',
    mov: 'video/quicktime', wmv: 'video/x-ms-wmv', flv: 'video/x-flv',
    webm: 'video/webm', m4v: 'video/mp4', mpg: 'video/mpeg', mpeg: 'video/mpeg',
    '3gp': 'video/3gpp'
  };
  return m[ext.toLowerCase()] || 'application/octet-stream';
}

let files = [];
try {
  files = loadCsv();
  console.log(`CSV cargado: ${files.length} archivos`);
} catch (e) {
  console.error('Error cargando CSV:', e.message);
}

const server = http.createServer((req, res) => {
  const parsed = url.parse(req.url, true);
  const pathname = parsed.pathname;
  const query = parsed.query;

  // API: listado paginado y búsqueda
  if (pathname === '/api/list') {
    const page = Math.max(1, parseInt(query.page, 10) || 1);
    const limit = Math.min(100, Math.max(12, parseInt(query.limit, 10) || 48));
    const q = (query.q || '').toLowerCase().trim();
    let filtered = files;
    if (q) {
      filtered = files.filter(f => f.FullName.toLowerCase().includes(q) ||
        (f.LastWriteTime && f.LastWriteTime.toLowerCase().includes(q)));
    }
    const total = filtered.length;
    const start = (page - 1) * limit;
    const slice = filtered.slice(start, start + limit);
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ total, page, limit, files: slice }));
    return;
  }

  // Servir archivo multimedia por ruta (Base64)
  if (pathname === '/file') {
    const enc = query.path;
    if (!enc) {
      res.statusCode = 400;
      res.end('path required');
      return;
    }
    let filePath;
    try {
      filePath = Buffer.from(enc, 'base64').toString('utf8');
    } catch (_) {
      res.statusCode = 400;
      res.end('invalid path');
      return;
    }
    const safe = safePath(filePath);
    if (!safe || !fs.existsSync(safe)) {
      res.statusCode = 404;
      res.end('not found');
      return;
    }
    const ext = path.extname(safe).slice(1);
    res.setHeader('Content-Type', getMime(ext));
    fs.createReadStream(safe).pipe(res);
    return;
  }

  // Página principal
  if (pathname === '/' || pathname === '/index.html') {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.end(getHtml());
    return;
  }

  res.statusCode = 404;
  res.end('Not found');
});

function getHtml() {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Galería multimedia E: y D:</title>
  <style>
    * { box-sizing: border-box; }
    html { font-size: 18px; }
    body { margin: 0; font-family: 'Segoe UI', system-ui, sans-serif; background: #1a1a2e; color: #eee; line-height: 1.5; }
    .header { padding: 1rem 1.5rem; background: #16213e; display: flex; gap: 1rem; flex-wrap: wrap; align-items: center; }
    input[type="search"] { padding: 0.65rem 1rem; border-radius: 8px; border: 1px solid #0f3460; background: #0f3460; color: #eee; width: 360px; font-size: 1rem; }
    input:focus { outline: none; border-color: #e94560; }
    button { padding: 0.65rem 1.2rem; border-radius: 8px; border: none; background: #e94560; color: white; cursor: pointer; font-size: 1rem; }
    button:hover { background: #ff6b6b; }
    .stats { font-size: 1.05rem; }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 1rem; padding: 1rem; }
    .card { background: #16213e; border-radius: 12px; overflow: hidden; transition: box-shadow 0.2s; cursor: pointer; display: flex; flex-direction: column; min-width: 0; }
    .card:hover { box-shadow: 0 6px 24px rgba(233,69,96,0.35); }
    .card .thumb-wrap { width: 100%; height: 200px; min-height: 200px; background: #2d3a5a; display: flex; align-items: center; justify-content: center; overflow: hidden; }
    .card .thumb-wrap img, .card .thumb-wrap video { max-width: 100%; max-height: 100%; width: auto; height: auto; object-fit: contain; display: block; min-width: 1px; min-height: 1px; }
    .card .info { padding: 0.75rem 1rem; font-size: 0.9rem; min-height: 0; flex: 1; display: flex; flex-direction: column; gap: 0.35rem; overflow: hidden; }
    .card .info .name { font-weight: 600; word-break: break-all; overflow-wrap: break-word; line-height: 1.35; font-size: 0.9rem; overflow-y: auto; max-height: 3em; display: block; }
    .card .info .path { font-size: 0.72rem; color: #999; word-break: break-all; overflow-wrap: break-word; line-height: 1.3; max-height: 6em; overflow-y: auto; user-select: text; -webkit-user-select: text; }
    .card .info .meta { font-size: 0.8rem; opacity: 0.9; flex-shrink: 0; }
    .pagination { padding: 1rem 1.5rem; display: flex; gap: 1rem; align-items: center; flex-wrap: wrap; font-size: 1rem; }
    .pagination button { padding: 0.6rem 1.2rem; font-size: 1rem; background: #0f3460; }
    .pagination button:disabled { opacity: 0.5; cursor: not-allowed; }
    .modal { position: fixed; inset: 0; background: rgba(0,0,0,0.96); display: none; z-index: 1000; }
    .modal.active { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 3rem; }
    .modal .close { position: absolute; top: 1rem; right: 1.5rem; font-size: 2.5rem; color: white; cursor: pointer; z-index: 1001; }
    .modal .close:hover { color: #e94560; }
    .modal-box { display: flex; flex-direction: column; align-items: center; justify-content: center; max-width: 100%; }
    .modal-box img, .modal-box video { max-width: 92vw; max-height: 70vh; width: auto; height: auto; object-fit: contain; border-radius: 8px; }
    .modal .path-wrap { margin-top: 1rem; width: 95%; max-width: 90vw; background: #222; padding: 0.75rem 1rem; border-radius: 8px; max-height: 120px; overflow-y: auto; }
    .modal .path { color: #bbb; font-size: 0.85rem; word-break: break-all; overflow-wrap: break-word; white-space: pre-wrap; user-select: all; -webkit-user-select: all; }
    .modal .path-hint { font-size: 0.75rem; color: #666; margin-top: 0.35rem; }
    .loading { text-align: center; padding: 3rem; font-size: 1.25rem; }
  </style>
</head>
<body>
  <div class="header">
    <input type="search" id="search" placeholder="Buscar por nombre o ruta..." autocomplete="off">
    <button id="btnSearch">Buscar</button>
    <span class="stats" id="stats">Cargando...</span>
  </div>
  <div id="grid" class="grid"></div>
  <div class="pagination" id="pagination"></div>
  <div class="modal" id="modal"><span class="close" id="closeModal">&times;</span><div class="modal-box" id="modalBox"><div id="modalContent"></div><div class="path-wrap"><div class="path" id="modalPath"></div><div class="path-hint">Ruta completa (selecciona y copia si necesitas)</div></div></div></div>

  <script>
    const VIDEO_EXT = new Set(['mp4','mkv','avi','mov','wmv','flv','webm','m4v','mpg','mpeg','3gp']);
    let currentPage = 1;
    let currentQ = '';

    function isVideo(path) { return VIDEO_EXT.has((path.split('.').pop() || '').toLowerCase()); }
    function escapeHtml(s) { const d=document.createElement('div'); d.textContent=s; return d.innerHTML; }

    function renderFiles(data) {
      const grid = document.getElementById('grid');
      grid.innerHTML = '';
      if (!data.files.length) { grid.innerHTML = '<p class="loading">No hay resultados</p>'; return; }
      data.files.forEach(f => {
        const enc = btoa(unescape(encodeURIComponent(f.FullName)));
        const ext = (f.FullName.split('.').pop() || '').toLowerCase();
        const isVid = isVideo(f.FullName);
        const name = f.FullName.split(/[/\\\\]/).pop() || f.FullName;
        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = '<div class="thumb-wrap ' + (isVid ? 'video' : '') + '"></div><div class="info"><div class="name" title="' + escapeHtml(f.FullName) + '">' + escapeHtml(name) + '</div><div class="path" title="' + escapeHtml(f.FullName) + '">' + escapeHtml(f.FullName) + '</div><div class="meta">' + formatSize(f.Length) + ' · ' + (f.LastWriteTime || '') + '</div></div>';
        const thumb = card.querySelector('.thumb-wrap');
        if (isVid) {
          const v = document.createElement('video');
          v.src = '/file?path=' + enc;
          v.preload = 'metadata';
          v.muted = true;
          v.playing = false;
          thumb.appendChild(v);
        } else {
          const img = document.createElement('img');
          img.src = '/file?path=' + enc;
          img.alt = name;
          img.loading = 'lazy';
          img.onerror = () => { img.remove(); thumb.innerHTML = '<span style="color:#888;font-size:0.9rem;">Sin vista previa</span>'; };
          thumb.appendChild(img);
        }
        card.onclick = (e) => { if (!e.target.closest('.path')) openModal(f.FullName, enc, isVid); };
        card.querySelector('.path')?.addEventListener('click', e => e.stopPropagation());
        grid.appendChild(card);
      });
    }

    function formatSize(b) {
      if (b < 1024) return b + ' B';
      if (b < 1024*1024) return (b/1024).toFixed(1) + ' KB';
      return (b/(1024*1024)).toFixed(1) + ' MB';
    }

    function openModal(fullName, enc, isVid) {
      const content = document.getElementById('modalContent');
      const pathEl = document.getElementById('modalPath');
      content.innerHTML = '';
      if (isVid) {
        const v = document.createElement('video');
        v.controls = true;
        v.src = '/file?path=' + enc;
        v.autoplay = true;
        content.appendChild(v);
      } else {
        const img = document.createElement('img');
        img.src = '/file?path=' + enc;
        content.appendChild(img);
      }
      pathEl.textContent = fullName;
      document.getElementById('modal').classList.add('active');
    }

    function closeModal() {
      document.getElementById('modal').classList.remove('active');
      document.querySelector('#modalContent video')?.pause();
    }
    document.getElementById('closeModal').onclick = closeModal;
    document.getElementById('modal').onclick = (e) => { if (e.target.id === 'modal') closeModal(); };

    function fetchPage(page, q) {
      const params = new URLSearchParams({ page: page || 1, limit: 48 });
      if (q) params.set('q', q);
      return fetch('/api/list?' + params).then(r => r.json());
    }

    function go() {
      document.getElementById('grid').innerHTML = '<p class="loading">Cargando...</p>';
      fetchPage(currentPage, currentQ).then(data => {
        renderFiles(data);
        document.getElementById('stats').textContent = data.total + ' archivos' + (currentQ ? ' (filtrado)' : '');
        renderPagination(data.total, data.limit);
      });
    }

    function renderPagination(total, limit) {
      const pages = Math.ceil(total / limit);
      const div = document.getElementById('pagination');
      div.innerHTML = '';
      if (pages <= 1) return;
      const prev = document.createElement('button');
      prev.textContent = 'Anterior';
      prev.disabled = currentPage <= 1;
      prev.onclick = () => { currentPage--; go(); };
      div.appendChild(prev);
      const info = document.createElement('span');
      info.textContent = ' Página ' + currentPage + ' / ' + pages + ' ';
      div.appendChild(info);
      const next = document.createElement('button');
      next.textContent = 'Siguiente';
      next.disabled = currentPage >= pages;
      next.onclick = () => { currentPage++; go(); };
      div.appendChild(next);
    }

    document.getElementById('btnSearch').onclick = () => {
      currentQ = document.getElementById('search').value;
      currentPage = 1;
      go();
    };
    document.getElementById('search').onkeydown = (e) => { if (e.key === 'Enter') document.getElementById('btnSearch').click(); };

    go();
  </script>
</body>
</html>`;
}

server.listen(PORT, () => {
  console.log(`Galería multimedia: http://localhost:${PORT}`);
  console.log(`Total archivos: ${files.length}`);
});
