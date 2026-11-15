#!/usr/bin/env node
// Tiny static server for local review that applies the SAME security headers declared in render.yaml (so CSP problems show up locally).
// Usage: node tools/serve.mjs [port] [root]
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import {fileURLToPath} from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url)); const repo = path.resolve(here, '..'); const root = path.resolve(process.argv[3] || path.join(repo, 'dist')); const port = +process.argv[2] || 8802;
const types = {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.webp':'image/webp','.jpg':'image/jpeg','.png':'image/png','.svg':'image/svg+xml','.ttf':'font/ttf','.woff2':'font/woff2','.xml':'application/xml','.md':'text/markdown; charset=utf-8','.txt':'text/plain'};
function headers() { // parse headers from render.yaml: lines "name: X" / "value: Y" under path "/*"
  const y = fs.readFileSync(path.join(repo, 'render.yaml'), 'utf8'); const out = {}; const re = /- path: \/\*\s*\n\s*name: (.+)\n\s*value: (.+)/g; let m;
  while ((m = re.exec(y))) out[m[1].trim()] = m[2].trim().replace(/^"|"$/g, ''); return out; }
const H = headers(); if (H['Content-Security-Policy']) H['Content-Security-Policy'] = H['Content-Security-Policy'].replace(/;?\s*upgrade-insecure-requests/, '');
http.createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname); if (p.endsWith('/')) p += 'index.html';
  const f = path.join(root, p); if (!f.startsWith(root)) { res.writeHead(403); return res.end('forbidden'); }
  fs.readFile(f, (e, b) => { if (e) { res.writeHead(404); return res.end('not found'); } res.writeHead(200, {...H, 'content-type': types[path.extname(f)] || 'application/octet-stream'}); res.end(b); });
}).listen(port, '127.0.0.1', () => console.log(`serving ${root} on http://127.0.0.1:${port}`));
