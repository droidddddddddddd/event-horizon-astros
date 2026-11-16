import test from 'node:test'; import assert from 'node:assert/strict';
import { assertClusterAllowed, GENESIS, mainnetPhrase, validMetadataBase, assertScaledPlanAllowed, isLoopback } from '../src/safety.mjs';
import { PLAN, PHASES, validatePlan, scaledPlan } from '../src/plan.mjs';
import { seededShuffle } from '../src/shuffle.mjs';
import { buildPools, configLineSettings } from '../src/deployLogic.mjs';
const T = 'Trea5ury11111111111111111111111111111111111';
test('plan economics are exactly the approved handoff numbers', () => {
  assert.equal(PLAN.supply, 1000); assert.equal(PLAN.royaltyBps, 250);
  assert.deepEqual([200, 780, 20], PHASES.map(k => PLAN.phases[k].allocation));
  assert.equal(PLAN.phases.early.lamports, 1250_000_000); assert.equal(PLAN.phases.public.lamports, 250_000_000); assert.equal(PLAN.phases.reserve.lamports, 0);
  assert.equal(PLAN.phases.public.walletLimit, 2); assert.deepEqual(PLAN.tiers, { Common: 550, Uncommon: 250, Rare: 120, Epic: 60, Legendary: 20 });
  assert.ok(validatePlan());
  assert.equal(200 * 1250_000_000 + 780 * 250_000_000, 225_000_000_000); // 225 SOL if all paid mints sell out
});
test('devnet and localnet are allowed', () => {
  assert.equal(assertClusterAllowed({ declared: 'devnet', rpcUrl: 'https://api.devnet.solana.com', genesisHash: GENESIS.devnet }), 'devnet');
  assert.equal(assertClusterAllowed({ declared: 'localnet', rpcUrl: 'http://127.0.0.1:8899', genesisHash: 'LocalGenesis1111111111111111111111111111111' }), 'localnet');
});
test('mismatched or hostile cluster combinations are refused', () => {
  assert.throws(() => assertClusterAllowed({ declared: 'devnet', rpcUrl: 'https://x', genesisHash: GENESIS['mainnet-beta'] }), /says mainnet-beta/);
  assert.throws(() => assertClusterAllowed({ declared: 'localnet', rpcUrl: 'https://api.mainnet-beta.solana.com', genesisHash: GENESIS['mainnet-beta'] }), /localhost/);
  assert.throws(() => assertClusterAllowed({ declared: 'localnet', rpcUrl: 'http://127.0.0.1:8899', genesisHash: GENESIS['mainnet-beta'] }), /mainnet/);
  assert.throws(() => assertClusterAllowed({ declared: 'testnet', rpcUrl: 'https://x', genesisHash: GENESIS.testnet }), /not supported/);
  assert.throws(() => assertClusterAllowed({ declared: 'devnet', rpcUrl: 'https://x', genesisHash: GENESIS.testnet }), /Testnet/);
});
test('MAINNET stays refused unless flag + interactive + exact typed phrase', () => {
  const base = { declared: 'mainnet-beta', rpcUrl: 'https://rpc.example', genesisHash: GENESIS['mainnet-beta'], treasury: T };
  assert.throws(() => assertClusterAllowed(base), /MAINNET DISABLED/);
  assert.throws(() => assertClusterAllowed({ ...base, mainnetEnabled: 'true', interactive: true, typedConfirmation: mainnetPhrase(T) }), /MAINNET DISABLED/); // must be boolean true
  assert.throws(() => assertClusterAllowed({ ...base, mainnetEnabled: true, interactive: false, typedConfirmation: mainnetPhrase(T) }), /interactive/);
  assert.throws(() => assertClusterAllowed({ ...base, mainnetEnabled: true, interactive: true, typedConfirmation: 'yes' }), /Typed confirmation/);
  assert.throws(() => assertClusterAllowed({ ...base, mainnetEnabled: true, interactive: true, typedConfirmation: mainnetPhrase(T).toLowerCase() }), /Typed confirmation/);
  assert.equal(assertClusterAllowed({ ...base, mainnetEnabled: true, interactive: true, typedConfirmation: mainnetPhrase(T) }), 'mainnet-beta'); // only with ALL gates
});
test('scaled test plans cannot touch mainnet', () => { assert.throws(() => assertScaledPlanAllowed(scaledPlan({ early: 1, public: 1, reserve: 1 }), 'mainnet-beta')); assert.doesNotThrow(() => assertScaledPlanAllowed(scaledPlan({ early: 1, public: 1, reserve: 1 }), 'localnet')); });
test('metadata base must be permanent storage; test base only when allowed', () => {
  assert.ok(validMetadataBase('https://arweave.net/' + 'a'.repeat(43)));
  assert.ok(!validMetadataBase('https://evil.example/meta')); assert.ok(!validMetadataBase('http://arweave.net/' + 'a'.repeat(43)));
  assert.ok(!validMetadataBase('https://example.invalid/local-test')); assert.ok(validMetadataBase('https://example.invalid/local-test', { allowTest: true }));
});
test('pools are disjoint, exact size, deterministic per seed, and differ across seeds', () => {
  const a = buildPools(PLAN, 'seed-one-xx'), b = buildPools(PLAN, 'seed-one-xx'), c = buildPools(PLAN, 'seed-two-xx');
  assert.deepEqual(a, b); assert.notDeepEqual(a.early, c.early);
  assert.deepEqual([a.early.length, a.public.length, a.reserve.length], [200, 780, 20]);
  const all = [...a.early, ...a.public, ...a.reserve]; assert.equal(new Set(all).size, 1000); assert.equal(Math.min(...all), 1); assert.equal(Math.max(...all), 1000);
  assert.equal(seededShuffle([1, 2, 3], 'x').length, 3);
});
test('config line settings fit the Candy Machine limits', () => {
  const s = configLineSettings('https://arweave.net/' + 'a'.repeat(43), PLAN); assert.equal(s.nameLength, 4); assert.equal(s.uriLength, 9); assert.ok(s.prefixUri.length <= 200); assert.equal(s.prefixName + '1000', 'Astro #1000');
});
test('isLoopback', () => { assert.ok(isLoopback('http://localhost:8899')); assert.ok(isLoopback('http://127.0.0.1:8899')); assert.ok(!isLoopback('https://api.devnet.solana.com')); });
