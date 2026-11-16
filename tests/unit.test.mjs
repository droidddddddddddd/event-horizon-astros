// Dependency-free unit/static tests. Run: npm run test:unit
import test from 'node:test'; import assert from 'node:assert/strict'; import fs from 'node:fs'; import vm from 'node:vm'; import path from 'node:path'; import { spawnSync } from 'node:child_process';
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
function loadLaunch(overrides = {}) {
  const win = {}; vm.runInNewContext(read('launch-config.js'), { window: win });
  const base = JSON.parse(JSON.stringify(win.LAUNCH)); return { base, cfg: { ...base, ...overrides } };
}
function runGate(cfg) { const win = { LAUNCH: Object.freeze(cfg) }; vm.runInNewContext(read('js/gate.js'), { window: win, URL, Date, Number }); return win.RELEASE_READY; }
const K = '9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin', K2 = 'So11111111111111111111111111111111111111112';
const LIVE = { status: 'live', cluster: 'mainnet-beta', mainnetPaymentsEnabled: true, artApproved: true, metadataVerified: true, devnetTested: true, securityReviewed: true, mainnetVerified: true, termsApproved: true,
  tokenMint: K, collectionMint: K2, mintUrl: 'https://example.com/mint', tokenUrl: 'https://pump.fun/coin/' + K, nftPrice: 0.25, launchTime: '2020-01-01T00:00:00Z' };

test('launch-config: economics match the approved plan exactly', () => {
  const { base: c } = loadLaunch();
  assert.equal(c.nftSupply, 1000); assert.equal(c.earlyAllocation, 200); assert.equal(c.publicAllocation, 780); assert.equal(c.reserveAllocation, 20);
  assert.equal(c.earlyAllocation + c.publicAllocation + c.reserveAllocation, c.nftSupply);
  assert.equal(c.earlyPrice, 0.15); assert.equal(c.nftPrice, 0.25); assert.equal(c.royaltyBps, 250); assert.equal(c.tokenSupply, 1_000_000_000); assert.equal(c.tokenPlatform, 'Pump.fun'); assert.equal(c.sequence, 'simultaneous');
});
test('launch-config ships fail-closed: prelaunch, devnet, payments off, every approval false, no addresses/urls', () => {
  const { base: c } = loadLaunch();
  assert.equal(c.status, 'prelaunch'); assert.equal(c.cluster, 'devnet'); assert.equal(c.mainnetPaymentsEnabled, false);
  for (const k of ['artApproved', 'metadataVerified', 'devnetTested', 'securityReviewed', 'mainnetVerified', 'termsApproved']) assert.equal(c[k], false, k);
  for (const k of ['tokenMint', 'collectionMint', 'mintUrl', 'tokenUrl']) assert.equal(c[k], '', k);
});
test('gate: shipped config is NOT release-ready', () => assert.equal(runGate(loadLaunch().base), false));
test('gate: a fully valid mainnet config IS ready (proves the gate can open, so the negative tests mean something)', () => assert.equal(runGate({ ...loadLaunch().base, ...LIVE }), true));
test('gate: flipping ANY single requirement closes it', () => {
  const b = { ...loadLaunch().base, ...LIVE };
  const mut = { status: 'prelaunch', cluster: 'devnet', mainnetPaymentsEnabled: false, artApproved: false, metadataVerified: false, devnetTested: false, securityReviewed: false, mainnetVerified: false, termsApproved: false,
    tokenMint: 'bad', collectionMint: '', mintUrl: 'http://insecure.example', tokenUrl: 'https://evil.example/coin/' + K, nftPrice: -1, launchTime: '2999-01-01T00:00:00Z' };
  for (const [k, v] of Object.entries(mut)) assert.equal(runGate({ ...b, [k]: v }), false, `gate stayed open with ${k}=${v}`);
  assert.equal(runGate({ ...b, mintUrl: 'https://user:pw@example.com/mint' }), false); assert.equal(runGate({ ...b, launchTime: 'nonsense' }), false); assert.equal(runGate({ ...b, nftPrice: NaN }), false);
});
test('collection manifest: 1,000 tokens, exact tier counts, unique ids, tiers match attributes', () => {
  const rows = JSON.parse(read('launch-kit/production-manifest.json')); const n = {};
  assert.equal(rows.length, 1000); assert.equal(new Set(rows.map(r => r.id)).size, 1000);
  for (const r of rows) { n[r.tier] = (n[r.tier] || 0) + 1; assert.equal(r.attributes.find(a => a.trait_type === 'Tier').value, r.tier); }
  assert.deepEqual(n, { Common: 550, Uncommon: 250, Rare: 120, Epic: 60, Legendary: 20 });
});
test('site collection.js only publishes art-approved entries and reports the honest per-tier status', () => {
  const win = {}; vm.runInNewContext(read('collection.js'), { window: win });
  const rows = JSON.parse(read('launch-kit/production-manifest.json')); const want = {};
  for (const r of rows) { const t = want[r.tier] ||= { total: 0, done: 0, pending: 0 }; t.total++; r.art_status === 'approved' ? t.done++ : t.pending++; }
  assert.deepEqual(JSON.parse(JSON.stringify(win.ASTROS_STATUS)), want);
  assert.equal(win.ASTROS.length, rows.filter(r => r.art_status === 'approved').length);
  const approved = new Set(rows.filter(r => r.art_status === 'approved').map(r => r.id)); for (const a of win.ASTROS) assert.ok(approved.has(a.id), 'unapproved art published: ' + a.id);
});
test('static XSS scan: no innerHTML/eval/Function/document.write/inline handlers/inline script or style in site code', () => {
  const bad = [];
  for (const f of fs.readdirSync(path.join(root, 'js')).map(x => 'js/' + x).concat(['astro-config.js', 'collection.js', 'launch-config.js'])) {
    read(f).split('\n').forEach((l, i) => { const code = l.replace(/\/\*.*?\*\//g, '').replace(/\/\/.*$/, ''); if (/\.(innerHTML|outerHTML)\s*=|insertAdjacentHTML|document\.write|\beval\s*\(|new Function\s*\(|setTimeout\s*\(\s*['"`]|setInterval\s*\(\s*['"`]/.test(code)) bad.push(`${f}:${i + 1}`); });
  }
  for (const f of ['index.html', 'privacy.html', 'terms.html']) { const h = read(f); if (/\son[a-z]+\s*=/i.test(h) || /\sstyle\s*=/i.test(h) || /<script(?![^>]*\bsrc=)[^>]*>/i.test(h) || /<style[\s>]/i.test(h) || /javascript:/i.test(h)) bad.push(f); }
  assert.deepEqual(bad, []);
});
test('static scan: JS only talks to the CSP allow-listed hosts', () => {
  const allowed = new Set(['api.dexscreener.com', 'dexscreener.com', 'jup.ag', 'pump.fun', 'solana-rpc.publicnode.com', 'api.mainnet-beta.solana.com', 'x.com']);
  const csp = read('render.yaml'); const hosts = new Set();
  for (const f of fs.readdirSync(path.join(root, 'js')).map(x => 'js/' + x).concat(['astro-config.js'])) for (const m of read(f).matchAll(/https?:\/\/([a-z0-9.-]+)/gi)) hosts.add(m[1]);
  for (const h of hosts) assert.ok(allowed.has(h), 'unexpected host ' + h);
  for (const h of ['api.dexscreener.com', 'solana-rpc.publicnode.com', 'api.mainnet-beta.solana.com']) assert.ok(csp.includes('https://' + h), 'CSP connect-src missing ' + h);
});
test('render.yaml: CSP has no unsafe-inline/unsafe-eval/wildcards; all security headers present; publishes dist only', () => {
  const y = read('render.yaml'); const csp = y.match(/Content-Security-Policy\n\s+value: "([^"]+)"/)[1];
  assert.ok(!/unsafe-|\*/.test(csp), csp); assert.match(csp, /frame-ancestors 'none'/); assert.match(csp, /object-src 'none'/);
  for (const h of ['X-Content-Type-Options', 'Referrer-Policy', 'X-Frame-Options', 'Permissions-Policy', 'Cross-Origin-Opener-Policy', 'Strict-Transport-Security']) assert.ok(y.includes(h), h);
  assert.match(y, /staticPublishPath: \.\/dist/); assert.ok(!/sync: false|privateKey|keypair|secret|password|api[-_]?key/i.test(y)); const keys = [...y.matchAll(/- key: (\S+)/g)].map(m => m[1]); assert.deepEqual(keys, ['NODE_VERSION'], 'only NODE_VERSION env var allowed (no secrets)');
  assert.ok(!/immutable/i.test(y), 'no immutable caching on unhashed assets');
});
test('build: dist contains only public files (no art/, mint/, legacy/, launch-kit/, reports/, keys)', () => {
  const r = spawnSync('node', ['tools/build-site.mjs'], { cwd: root, encoding: 'utf8' }); assert.equal(r.status, 0, r.stderr);
  const all = []; (function walk(d) { for (const f of fs.readdirSync(d)) { const p = path.join(d, f); fs.statSync(p).isDirectory() ? walk(p) : all.push(path.relative(path.join(root, 'dist'), p)); } })(path.join(root, 'dist'));
  assert.ok(all.includes('index.html')); assert.ok(!all.some(f => /^(art|mint|legacy|launch-kit|reports|tools|tests|screenshots)\//.test(f) || /keypair|\.env|deployment|hero-source/i.test(f)), 'leak');
});
test('secret scan is clean', () => { const r = spawnSync('python3', ['tools/secret_scan.py'], { cwd: root, encoding: 'utf8' }); assert.equal(r.status, 0, r.stdout + r.stderr); });
test('build: canonical/OG/twitter URLs are absolute, come from site.config.json, and no placeholder leaks', () => {
  const r = spawnSync('node', ['tools/build-site.mjs'], { cwd: root, encoding: 'utf8' }); assert.equal(r.status, 0, r.stderr);
  const site = JSON.parse(read('site.config.json')).siteUrl; assert.match(site, /^https:\/\/[a-z0-9.-]+$/);
  for (const f of ['index.html', 'privacy.html', 'terms.html']) assert.ok(!/\{\{SITE_URL\}\}/.test(fs.readFileSync(path.join(root, 'dist', f), 'utf8')), f + ' placeholder left');
  const h = fs.readFileSync(path.join(root, 'dist', 'index.html'), 'utf8');
  for (const re of [/rel="canonical" href="([^"]+)"/, /property="og:url" content="([^"]+)"/, /property="og:image" content="([^"]+)"/, /name="twitter:image" content="([^"]+)"/]) { const m = h.match(re); assert.ok(m && m[1].startsWith(site + '/'), String(re)); }
  assert.ok(fs.existsSync(path.join(root, 'dist', 'sitemap.xml')) && fs.existsSync(path.join(root, 'dist', 'robots.txt')));
  assert.ok(fs.existsSync(path.join(root, 'dist', 'assets/brand/og.jpg')));
});
test('hero pool: every pooled Astro is approved, has both webp sizes, and #1 (fallback) is included', () => {
  const js = read('js/hero.js'); const pool = JSON.parse(js.match(/\/\*POOL\*\/(.*?)\/\*END\*\//s)[1]); assert.ok(pool.length >= 80, 'pool too small');
  const src = read('collection.js'); const col = JSON.parse(src.slice(src.indexOf('['), src.lastIndexOf(']') + 1)); const byId = new Map(col.map(a => [a.id, a]));
  assert.ok(pool.some(p => p.i === 1));
  for (const p of pool) { const a = byId.get(p.i); assert.ok(a && a.art_status === 'approved' && ['Legendary', 'Epic', 'Rare'].includes(a.tier) && a.tier === p.t, 'bad pool entry ' + p.i); for (const s of [384, 768]) assert.ok(fs.existsSync(path.join(root, `assets/hero/${p.i}-${s}.webp`)), `${p.i}-${s}`); }
  assert.equal(fs.readdirSync(path.join(root, 'assets/hero')).length, pool.length * 2, 'unused hero files shipped');
});
