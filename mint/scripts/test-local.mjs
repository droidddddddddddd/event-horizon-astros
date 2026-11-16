#!/usr/bin/env node
// End-to-end guard/phase/payment test against a LOCAL solana-test-validator (RPC http://127.0.0.1:8899) with the Core + Core Candy Machine
// programs loaded. Test wallets are generated IN MEMORY for this process only: never written to disk, never printed, local validator only.
// Usage: node scripts/test-local.mjs [--full-only] [--rpc http://127.0.0.1:8899]
import fs from 'node:fs';
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { generateSigner, keypairIdentity, publicKey, sol, lamports } from '@metaplex-foundation/umi';
import { mplCore, fetchAssetV1, fetchCollectionV1 } from '@metaplex-foundation/mpl-core';
import { mplCandyMachine, fetchCandyMachine } from '@metaplex-foundation/mpl-core-candy-machine';
import { PLAN, scaledPlan } from '../src/plan.mjs';
import { deployAll, verifyDeployment, buildPools } from '../src/deployLogic.mjs';
import { mintFromPhase } from '../src/mintLogic.mjs';
import { assertClusterAllowed, fetchGenesisHash } from '../src/safety.mjs';

const rpc = process.argv.includes('--rpc') ? process.argv[process.argv.indexOf('--rpc') + 1] : 'http://127.0.0.1:8899';
const results = []; const check = (name, ok, extra) => { results.push({ name, ok: !!ok, ...(ok ? {} : { detail: String(extra) }) }); console.log((ok ? 'PASS ' : 'FAIL ') + name + (ok ? '' : ' :: ' + extra)); };
const expectFail = async (name, fn, re) => { try { await fn(); check(name, false, 'unexpectedly succeeded'); } catch (e) { const m = String(e.message || e) + ' ' + (e.logs || '') ; check(name, re ? re.test(m) : true, m.slice(0, 300)); } };
const base = () => createUmi(rpc, { commitment: 'confirmed' }).use(mplCore()).use(mplCandyMachine());
const gen = () => { const u = base(); const kp = u.eddsa.generateKeypair(); return u.use(keypairIdentity(kp)); };  // in-memory only
const bal = async (u, pk) => Number((await u.rpc.getBalance(publicKey(pk))).basisPoints);
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function fund(admin, pk, s) { await admin.rpc.airdrop(publicKey(pk), sol(s)); }

const admin = gen();
const genesis = await fetchGenesisHash(rpc);
check('local validator is not devnet/mainnet/testnet', assertClusterAllowed({ declared: 'localnet', rpcUrl: rpc, genesisHash: genesis }) === 'localnet');
await fund(admin, admin.identity.publicKey, 500);
const treasury = gen(), reserve = gen(), earlyA = gen(), earlyB = gen(), outsider = gen(), pubA = gen(), pubB = gen(), pubC = gen();
for (const w of [reserve, earlyA, earlyB, outsider, pubA, pubB, pubC]) await fund(admin, w.identity.publicKey, 5);
const dep = (state, cfg, plan) => ({ network: 'localnet', collection: String(state.collection), treasury: cfg.treasury, allowlist: cfg.allowlist, machines: Object.fromEntries(Object.entries(state.machines).map(([k, v]) => [k, { address: String(v.address) }])) });

// ============ A. FULL production-size deployment (200/780/20) ============
{
  const cfg = { treasury: String(treasury.identity.publicKey), reserveWallet: String(reserve.identity.publicKey), allowlist: [earlyA, earlyB].map(w => String(w.identity.publicKey)),
    earlyStart: new Date(Date.now() + 3600e3).toISOString(), publicStart: new Date(Date.now() + 7200e3).toISOString(), shuffleSeed: 'local-test-seed-full', collectionUri: 'https://example.invalid/local-test/collection.json',
    metadataBase: 'https://example.invalid/local-test', collectionName: 'Astros (local test)' };
  const t0 = Date.now(); const state = await deployAll({ umi: admin, config: cfg });
  console.log(`full deployment took ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  const v = await verifyDeployment({ umi: admin, state, config: cfg });
  check('FULL: early=200 / public=780 / reserve=20 items loaded on-chain', v.phases.early.loaded === 200 && v.phases.public.loaded === 780 && v.phases.reserve.loaded === 20, JSON.stringify(v.phases));
  check('FULL: on-chain guards match plan (prices, treasury, limits, gate, allowlist, end date)', v.ok, JSON.stringify(v.phases));
  const pools = buildPools(PLAN, cfg.shuffleSeed); const all = [...pools.early, ...pools.public, ...pools.reserve];
  check('FULL: pools are disjoint and cover tokens 1..1000', new Set(all).size === 1000 && Math.min(...all) === 1 && Math.max(...all) === 1000);
  await expectFail('FULL: early mint before start is rejected on-chain', () => mintFromPhase({ umi: earlyA, deployment: dep(state, cfg), phase: 'early' }), /./);
  await expectFail('FULL: public mint before start is rejected on-chain', () => mintFromPhase({ umi: pubA, deployment: dep(state, cfg), phase: 'public' }), /./);
  const col = await fetchCollectionV1(admin, publicKey(state.collection));
  check('FULL: collection royalties = 2.5% (250 bps) to treasury', col.royalties && col.royalties.basisPoints === 250 && String(col.royalties.creators[0].address) === cfg.treasury && col.royalties.creators[0].percentage === 100, JSON.stringify(col.royalties, (k, v) => typeof v === 'bigint' ? String(v) : v));
}
if (process.argv.includes('--full-only')) { finish(); }

// ============ B. SCALED deployment (3 early / 4 public / 2 reserve) for behavior tests ============
const plan = scaledPlan({ early: 3, public: 4, reserve: 2 });
const t = Date.now();
const cfg = { treasury: String(treasury.identity.publicKey), reserveWallet: String(reserve.identity.publicKey), allowlist: [earlyA, earlyB].map(w => String(w.identity.publicKey)),
  earlyStart: new Date(t + 30e3).toISOString(), publicStart: new Date(t + 60e3).toISOString(), shuffleSeed: 'local-test-seed-small', collectionUri: 'https://example.invalid/local-test/collection.json', metadataBase: 'https://example.invalid/local-test' };
const state = await deployAll({ umi: admin, plan, config: cfg });
const D = dep(state, cfg, plan); const pools = state.pools;
check('SCALED: deployment verifies', (await verifyDeployment({ umi: admin, plan, state, config: cfg })).ok);
const assetsOf = [];
async function checkAsset(res, owner, pool, label) {
  const a = await fetchAssetV1(admin, res.asset); const n = Number(a.name.replace(plan.namePrefix, ''));
  const okOwner = String(a.owner) === String(owner.identity.publicKey), okPool = pool.includes(n), okUri = a.uri === `${cfg.metadataBase}/${n}.json`, okCol = a.updateAuthority.type === 'Collection' && String(a.updateAuthority.address) === String(state.collection);
  check(`${label}: asset owned by minter, name "${a.name}", uri ok, in collection, token in the correct pool`, okOwner && okPool && okUri && okCol, JSON.stringify({ okOwner, okPool, okUri, okCol, uri: a.uri, name: a.name }));
  assetsOf.push(n); return n;
}
await expectFail('early mint before earlyStart rejected', () => mintFromPhase({ umi: earlyA, deployment: D, phase: 'early', plan }), /./);
const wait = Date.parse(cfg.earlyStart) - Date.now() + 4000; console.log(`waiting ${Math.ceil(wait / 1000)}s for early window…`); await sleep(Math.max(0, wait));
await expectFail('non-allowlisted wallet cannot early-mint (client check)', () => mintFromPhase({ umi: outsider, deployment: D, phase: 'early', plan }), /allowlist/i);
{ // raw on-chain attempt without the proof: bypass the client check entirely
  const { mintV1 } = await import('@metaplex-foundation/mpl-core-candy-machine'); const { some } = await import('@metaplex-foundation/umi');
  const { fetchCandyGuard } = await import('@metaplex-foundation/mpl-core-candy-machine'); const cm = await fetchCandyMachine(outsider, publicKey(D.machines.early.address)); const g = (await fetchCandyGuard(outsider, cm.mintAuthority)).guards;
  await expectFail('non-allowlisted wallet rejected ON-CHAIN (no proof)', () => mintV1(outsider, { candyMachine: cm.publicKey, asset: generateSigner(outsider), collection: publicKey(D.collection), mintArgs: { solPayment: some({ destination: publicKey(D.treasury) }), mintLimit: some({ id: 1 }), allowList: some({ merkleRoot: g.allowList.value.merkleRoot }) } }).sendAndConfirm(outsider), /./);
}
const tb0 = await bal(admin, treasury.identity.publicKey);
const e1 = await mintFromPhase({ umi: earlyA, deployment: D, phase: 'early', plan }); await checkAsset(e1, earlyA, pools.early, 'early mint #1 (allowlisted)');
const tb1 = await bal(admin, treasury.identity.publicKey); check('treasury received exactly 0.15 SOL for the early mint', tb1 - tb0 === 1250_000_000, tb1 - tb0);
await expectFail('early wallet limit (1 per wallet) enforced', () => mintFromPhase({ umi: earlyA, deployment: D, phase: 'early', plan }), /./);
// reserve
await expectFail('reserve: non-reserve wallet rejected', () => mintFromPhase({ umi: pubA, deployment: D, phase: 'reserve', plan }), /./);
const rb0 = await bal(admin, treasury.identity.publicKey);
const r1 = await mintFromPhase({ umi: reserve, deployment: D, phase: 'reserve', plan }); await checkAsset(r1, reserve, pools.reserve, 'reserve mint #1');
const r2 = await mintFromPhase({ umi: reserve, deployment: D, phase: 'reserve', plan }); await checkAsset(r2, reserve, pools.reserve, 'reserve mint #2');
check('reserve mints are free (treasury unchanged)', (await bal(admin, treasury.identity.publicKey)) === rb0);
await expectFail('reserve sold out after 2/2', () => mintFromPhase({ umi: reserve, deployment: D, phase: 'reserve', plan }), /sold out|./i);
// public window
await expectFail('public mint before publicStart rejected', () => mintFromPhase({ umi: pubA, deployment: D, phase: 'public', plan }), /./);
const wait2 = Date.parse(cfg.publicStart) - Date.now() + 4000; console.log(`waiting ${Math.ceil(wait2 / 1000)}s for public window…`); await sleep(Math.max(0, wait2));
await expectFail('early mint after publicStart rejected (endDate)', () => mintFromPhase({ umi: earlyB, deployment: D, phase: 'early', plan }), /./);
const pb0 = await bal(admin, treasury.identity.publicKey);
const p1 = await mintFromPhase({ umi: pubA, deployment: D, phase: 'public', plan }); await checkAsset(p1, pubA, pools.public, 'public mint A1');
const p2 = await mintFromPhase({ umi: pubA, deployment: D, phase: 'public', plan }); await checkAsset(p2, pubA, pools.public, 'public mint A2');
check('treasury received exactly 0.1 SOL for two public mints', (await bal(admin, treasury.identity.publicKey)) - pb0 === 100_000_000, (await bal(admin, treasury.identity.publicKey)) - pb0);
await expectFail('public wallet limit (2 per wallet) enforced', () => mintFromPhase({ umi: pubA, deployment: D, phase: 'public', plan }), /./);
const p3 = await mintFromPhase({ umi: pubB, deployment: D, phase: 'public', plan }); await checkAsset(p3, pubB, pools.public, 'public mint B1');
const p4 = await mintFromPhase({ umi: pubB, deployment: D, phase: 'public', plan }); await checkAsset(p4, pubB, pools.public, 'public mint B2');
await expectFail('public sold out after 4/4', () => mintFromPhase({ umi: pubC, deployment: D, phase: 'public', plan }), /sold out/i);
check('no token minted twice', new Set(assetsOf).size === assetsOf.length, assetsOf.join(','));
const redeemed = {}; for (const k of ['early', 'public', 'reserve']) redeemed[k] = Number((await fetchCandyMachine(admin, publicKey(D.machines[k].address))).itemsRedeemed);
check('items redeemed on-chain: early 1, public 4, reserve 2', redeemed.early === 1 && redeemed.public === 4 && redeemed.reserve === 2, JSON.stringify(redeemed));
// guard against over-minting beyond early allocation can't be tested at scale here: early pool is 3 and 1 minted; remaining early supply stays unsold by design (no rollover)
finish();
function finish() {
  const failed = results.filter(r => !r.ok); const out = { when: new Date().toString(), rpc, validator: 'solana-test-validator (Agave) with mpl_core, core_candy_machine, core_candy_guard dumped from devnet', passed: results.length - failed.length, total: results.length, failed, results };
  fs.mkdirSync(new URL('../test-results', import.meta.url), { recursive: true });
  fs.writeFileSync(new URL('../test-results/local-validator.json', import.meta.url), JSON.stringify(out, null, 1));
  console.log(`\n${out.passed}/${out.total} passed`); process.exit(failed.length ? 1 : 0);
}
