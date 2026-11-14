// Node-only (uses node:crypto). Kept out of plan.mjs so the browser bundle stays free of Node built-ins.
// Deterministic, disclosable shuffle (NOT cryptographically fair; the seed must be published before launch and the order is public once uploaded).
import { createHash } from 'node:crypto';
export function seededShuffle(arr, seed) {
  const out = arr.slice(); let counter = 0, buf = Buffer.alloc(0), pos = 0;
  const rnd = () => { if (pos + 4 > buf.length) { buf = createHash('sha256').update(`${seed}:${counter++}`).digest(); pos = 0; } const v = buf.readUInt32BE(pos); pos += 4; return v; };
  for (let i = out.length - 1; i > 0; i--) { const j = rnd() % (i + 1); [out[i], out[j]] = [out[j], out[i]]; }
  return out;
}
