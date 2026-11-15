#!/usr/bin/env node
// Copies ONLY the public website files into dist/ (the Render publish directory). Keeps art/, mint/, legacy/, reports/, launch-kit/,
// docs and any config/keys out of the deployed site. No dependencies.
import fs from 'node:fs'; import path from 'node:path'; import {fileURLToPath} from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), dist = path.join(root, 'dist');
fs.rmSync(dist, {recursive: true, force: true}); fs.mkdirSync(dist, {recursive: true});
const files = ['index.html', 'privacy.html', 'terms.html', 'launch-config.js', 'astro-config.js', 'collection.js'];
const dirs = ['css', 'js', 'data', 'fonts', 'assets', 'signal'];
const skip = /(\.map|\.psd|\.zip|hero-source\.jpg|\.ttf)$/i;
function cp(src, dst) {
  const st = fs.statSync(src);
  if (st.isDirectory()) { fs.mkdirSync(dst, {recursive: true}); for (const f of fs.readdirSync(src)) cp(path.join(src, f), path.join(dst, f)); }
  else if (!skip.test(src)) fs.copyFileSync(src, dst);
}
for (const f of files) cp(path.join(root, f), path.join(dist, f));
for (const d of dirs) cp(path.join(root, d), path.join(dist, d));
// single source of truth for the public origin: site.config.json (SITE_URL env var overrides). Baked into the static HTML because crawlers do not run JS.
const cfg = JSON.parse(fs.readFileSync(path.join(root, 'site.config.json'), 'utf8')); const siteUrl = (process.env.SITE_URL || cfg.siteUrl || '').replace(/\/+$/, '');
if (!/^https:\/\/[a-z0-9.-]+(:\d+)?$/i.test(siteUrl)) { console.error('Invalid siteUrl (need https://host, no path):', siteUrl); process.exit(1); }
for (const f of ['index.html', 'privacy.html', 'terms.html']) { const p = path.join(dist, f); fs.writeFileSync(p, fs.readFileSync(p, 'utf8').replaceAll('{{SITE_URL}}', siteUrl)); }
fs.writeFileSync(path.join(dist, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${siteUrl}/sitemap.xml\n`);
fs.writeFileSync(path.join(dist, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${['/', '/privacy.html', '/terms.html'].map(u => `  <url><loc>${siteUrl}${u}</loc></url>`).join('\n')}\n</urlset>\n`);
console.log('siteUrl:', siteUrl);
// refuse to publish anything that looks like a secret
const bad = []; (function walk(d) { for (const f of fs.readdirSync(d)) { const p = path.join(d, f); if (fs.statSync(p).isDirectory()) walk(p); else if (/keypair|deployment\.json|\.env|id\.json|secret/i.test(f)) bad.push(p); } })(dist);
if (bad.length) { console.error('Refusing: secret-looking files in dist:', bad); process.exit(1); }
let n = 0, bytes = 0; (function walk(d) { for (const f of fs.readdirSync(d)) { const p = path.join(d, f); if (fs.statSync(p).isDirectory()) walk(p); else { n++; bytes += fs.statSync(p).size; } } })(dist);
console.log(`dist/ ready: ${n} files, ${(bytes / 1048576).toFixed(1)} MB`);
