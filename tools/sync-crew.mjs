// Sync the public Crew Manifest from Mission Control into same-origin files (data/crew-manifest.json + assets/crew/cards/N.jpg),
// so the site keeps its strict CSP (connect-src/img-src 'self'). Read-only: GET /crew and the card images. No secrets.
// Usage: node tools/sync-crew.mjs   (exit 0 = synced or unchanged; exit 2 = Mission Control unreachable, nothing written)
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const API = 'https://astros-mission-control.onrender.com';
const cardsDir = path.join(root, 'assets', 'crew', 'cards'); fs.mkdirSync(cardsDir, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function get(url, kind) {
  for (let i = 0; i < 6; i++) {   // the free instance may be asleep: allow ~2 minutes for a cold start
    try {
      const r = await fetch(url, { signal: AbortSignal.timeout(45000), headers: { 'User-Agent': 'astrosonsol-crew-sync' } });
      if (r.ok) return kind === 'json' ? await r.json() : Buffer.from(await r.arrayBuffer());
      if (r.status === 404) return null;
    } catch {}
    await sleep(15000);
  }
  throw new Error('unreachable: ' + url);
}
const str = (v, n) => (typeof v === 'string' ? v : '').replace(/[\u0000-\u001f<>]/g, '').slice(0, n);
let d;
try { d = await get(API + '/crew', 'json'); } catch (e) { console.error(String(e)); process.exit(2); }
if (!d || !Array.isArray(d.crew)) { console.error('unexpected /crew payload'); process.exit(2); }
const crew = [];
for (const m of d.crew) {
  if (!Number.isInteger(m.crew_no) || m.crew_no < 0 || m.crew_no > 99999) continue;
  const file = `assets/crew/cards/${m.crew_no}.jpg`, dest = path.join(root, file);
  const img = await get(`${API}/crew/card/${m.crew_no}.jpg?w=640`, 'bin').catch(() => null);
  if (img && img.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff])) && img.length < 600000) {
    if (!fs.existsSync(dest) || !fs.readFileSync(dest).equals(img)) fs.writeFileSync(dest, img);
  }
  crew.push({ crew_no: m.crew_no, id: str(m.id, 12), handle: m.handle ? str(m.handle, 20) : null, name: str(m.name, 30), role: str(m.role, 30), rank: str(m.rank, 20),
    founding: !!m.founding, founder: !!m.founder, enlisted: str(m.enlisted, 10), checkins: Number.isInteger(m.checkins) ? m.checkins : 0, card: fs.existsSync(dest) ? file : null });
}
const keep = new Set(crew.map(m => `${m.crew_no}.jpg`));
for (const f of fs.readdirSync(cardsDir)) if (/^\d+\.jpg$/.test(f) && !keep.has(f)) fs.unlinkSync(path.join(cardsDir, f));   // removed members
const post = /^https:\/\/x\.com\/AstrosOnSol\/status\/\d+$/.test(d.manifest_post || '') ? d.manifest_post : null;
const out = { crew, total: Number.isInteger(d.total) ? d.total : 0, founding_count: Number.isInteger(d.founding_count) ? d.founding_count : 0, founding_limit: 100, manifest_post: post };
const file = path.join(root, 'data', 'crew-manifest.json'); const prev = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : null;
if (prev) { const { synced_at, ...rest } = prev; if (JSON.stringify(rest) === JSON.stringify(out)) { console.log('crew manifest unchanged (' + crew.length + ' entries)'); process.exit(0); } }
fs.writeFileSync(file, JSON.stringify({ ...out, synced_at: new Date().toISOString() }, null, 1) + '\n');
console.log('crew manifest synced: ' + crew.length + ' entries, founding ' + out.founding_count + '/100');
