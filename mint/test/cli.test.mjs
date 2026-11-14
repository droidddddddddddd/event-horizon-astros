// Spawns deploy.mjs as a real process. Uses ONLY read-only RPC calls (getGenesisHash) and --dry-run / refusal paths: nothing is ever sent.
import test from 'node:test'; import assert from 'node:assert/strict'; import { spawnSync } from 'node:child_process'; import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
const here = path.dirname(new URL(import.meta.url).pathname), root = path.resolve(here, '..');
const A = '11111111111111111111111111111111', B = 'Stake11111111111111111111111111111111111111', C = 'Vote111111111111111111111111111111111111111';
const base = { treasury: A, reserveWallet: B, allowlist: [C], earlyStart: '2030-01-01T00:00:00Z', publicStart: '2030-01-01T02:00:00Z', shuffleSeed: 'cli-test-seed', collectionUri: 'https://arweave.net/' + 'c'.repeat(43), metadataBase: 'https://arweave.net/' + 'm'.repeat(43) };
function run(cfg, args = ['--dry-run']) { const d = fs.mkdtempSync(path.join(os.tmpdir(), 'astros-')); fs.writeFileSync(path.join(d, 'deployment.json'), JSON.stringify(cfg)); return spawnSync('node', [path.join(root, 'deploy.mjs'), ...args], { cwd: d, encoding: 'utf8', timeout: 60000, input: '' }); }
async function reachable(url) { try { const r = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{"jsonrpc":"2.0","id":1,"method":"getGenesisHash"}', signal: AbortSignal.timeout(8000) }); return r.ok; } catch { return false; } }
test('CLI: mainnet is refused by default even with a valid-looking config', async t => {
  if (!await reachable('https://solana-rpc.publicnode.com')) return t.skip('offline');
  const r = run({ ...base, cluster: 'mainnet-beta', rpc: 'https://solana-rpc.publicnode.com' }); assert.equal(r.status, 1); assert.match(r.stderr, /MAINNET DISABLED/);
});
test('CLI: mainnetEnabled=true still refuses non-interactive runs (no TTY here)', async t => {
  if (!await reachable('https://solana-rpc.publicnode.com')) return t.skip('offline');
  const r = run({ ...base, cluster: 'mainnet-beta', rpc: 'https://solana-rpc.publicnode.com', mainnetEnabled: true }); assert.equal(r.status, 1); assert.match(r.stderr, /interactive/);
});
test('CLI: declaring devnet against a mainnet RPC is refused', async t => {
  if (!await reachable('https://solana-rpc.publicnode.com')) return t.skip('offline');
  const r = run({ ...base, cluster: 'devnet', rpc: 'https://solana-rpc.publicnode.com' }); assert.equal(r.status, 1); assert.match(r.stderr, /genesis hash says mainnet-beta/);
});
test('CLI: test metadata URI is refused unless explicitly allowed', async t => {
  const r = run({ ...base, cluster: 'devnet', metadataBase: 'https://example.invalid/test' }); assert.equal(r.status, 1); assert.match(r.stderr, /permanent-storage/);
});
test('CLI: devnet dry run passes validation and sends nothing', async t => {
  if (!await reachable('https://api.devnet.solana.com')) return t.skip('offline');
  const r = run({ ...base, cluster: 'devnet' }); assert.equal(r.status, 0, r.stderr); assert.match(r.stdout, /DRY RUN/); assert.match(r.stdout, /200 early @ 0.025 SOL/); assert.match(r.stdout, /780 public @ 0.05 SOL/);
});
test('CLI: keypair inside the repo is refused (live run, bad key path)', async t => {
  if (!await reachable('https://api.devnet.solana.com')) return t.skip('offline');
  const kp = path.join(root, 'fake-keypair-for-test.json'); fs.writeFileSync(kp, '[1,2,3]');
  try { const r = run({ ...base, cluster: 'devnet' }, ['--keypair', kp]); assert.equal(r.status, 1); assert.match(r.stderr, /outside the repository/); } finally { fs.rmSync(kp); }
});
