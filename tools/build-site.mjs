#!/usr/bin/env node
// Copies ONLY the public website files into dist/ (the Render publish directory). Keeps art/, mint/, legacy/, reports/, launch-kit/,
// docs and any config/keys out of the deployed site. No dependencies.
import fs from 'node:fs'; import path from 'node:path'; import {fileURLToPath} from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), dist = path.join(root, 'dist');
fs.rmSync(dist, {recursive: true, force: true}); fs.mkdirSync(dist, {recursive: true});
const files = ['index.html', 'privacy.html', 'terms.html', 'launch-config.js', 'astro-config.js', 'collection.js'];
const dirs = ['css', 'js', 'data', 'fonts', 'assets'];
const skip = /(\.map|\.psd|\.zip|hero-source\.jpg)$/i;
function cp(src, dst) {
  const st = fs.statSync(src);
  if (st.isDirectory()) { fs.mkdirSync(dst, {recursive: true}); for (const f of fs.readdirSync(src)) cp(path.join(src, f), path.join(dst, f)); }
  else if (!skip.test(src)) fs.copyFileSync(src, dst);
}
for (const f of files) cp(path.join(root, f), path.join(dist, f));
for (const d of dirs) cp(path.join(root, d), path.join(dist, d));
// refuse to publish anything that looks like a secret
const bad = []; (function walk(d) { for (const f of fs.readdirSync(d)) { const p = path.join(d, f); if (fs.statSync(p).isDirectory()) walk(p); else if (/keypair|deployment\.json|\.env|id\.json|secret/i.test(f)) bad.push(p); } })(dist);
if (bad.length) { console.error('Refusing: secret-looking files in dist:', bad); process.exit(1); }
let n = 0, bytes = 0; (function walk(d) { for (const f of fs.readdirSync(d)) { const p = path.join(d, f); if (fs.statSync(p).isDirectory()) walk(p); else { n++; bytes += fs.statSync(p).size; } } })(dist);
console.log(`dist/ ready: ${n} files, ${(bytes / 1048576).toFixed(1)} MB`);
