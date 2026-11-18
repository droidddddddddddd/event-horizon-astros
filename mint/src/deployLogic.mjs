// Core collection + three Core Candy Machines (early / public / reserve) with exact allocations and guards.
// Pure of file/CLI concerns: caller passes a configured Umi (identity = deployer), the plan and public addresses.
import { generateSigner, publicKey, some, sol, dateTime } from '@metaplex-foundation/umi';
import { createCollection, ruleSet } from '@metaplex-foundation/mpl-core';
import { create, addConfigLines, getMerkleRoot, fetchCandyMachine, fetchCandyGuard } from '@metaplex-foundation/mpl-core-candy-machine';
import { PLAN, PHASES, validatePlan } from './plan.mjs';
import { seededShuffle } from './shuffle.mjs';
import { isBase58Address } from './safety.mjs';

export const LINES_PER_TX = 25;
/** items: the plan's token numbers (plan.tokenIds, else 1..supply), shuffled with the disclosed seed and sliced into disjoint pools [early | public | reserve]. */
export function buildPools(plan, shuffleSeed) {
  validatePlan(plan);
  const tokens = seededShuffle(tokenNumbers(plan), shuffleSeed);
  let o = 0; const pools = {};
  for (const k of PHASES) { pools[k] = tokens.slice(o, o + plan.phases[k].allocation); o += plan.phases[k].allocation; }
  return pools;
}
export function tokenNumbers(plan) { return plan.tokenIds ? plan.tokenIds.slice() : Array.from({ length: plan.supply }, (_, i) => i + 1); }
export function configLineSettings(metadataBase, plan) {
  const maxN = String(Math.max(...tokenNumbers(plan))).length;
  return { prefixName: plan.namePrefix, nameLength: maxN, prefixUri: metadataBase + '/', uriLength: maxN + '.json'.length, isSequential: false };
}
export function checkConfig(c, plan) {
  for (const k of ['treasury', 'reserveWallet']) if (!isBase58Address(c[k])) throw new Error(`config.${k} must be a public Solana address`);
  if (!Array.isArray(c.allowlist) || !c.allowlist.length || new Set(c.allowlist).size !== c.allowlist.length || !c.allowlist.every(isBase58Address)) throw new Error('config.allowlist must be a non-empty list of unique public addresses');
  if (c.allowlist.length > plan.phases.early.allocation * 50) throw new Error('allowlist unreasonably large');
  const e = Date.parse(c.earlyStart), p = Date.parse(c.publicStart);
  if (!(Number.isFinite(e) && Number.isFinite(p) && p > e)) throw new Error('earlyStart and publicStart must be ISO dates with publicStart after earlyStart');
  if (!c.shuffleSeed || String(c.shuffleSeed).length < 8) throw new Error('config.shuffleSeed (a disclosed seed string, >= 8 chars) is required');
  if (!/^https:\/\//.test(c.collectionUri || '')) throw new Error('config.collectionUri must be an https permanent-storage URI');
}
export async function deployAll({ umi, plan = PLAN, config: c, log = () => {}, state = {} }) {
  checkConfig(c, plan);
  const pools = buildPools(plan, c.shuffleSeed);
  const treasury = publicKey(c.treasury), reserve = publicKey(c.reserveWallet), allowlist = c.allowlist.map(publicKey);
  const collection = generateSigner(umi);
  state.collection = collection.publicKey; state.machines = {}; state.pools = pools;
  await createCollection(umi, { collection, name: c.collectionName || 'Astros', uri: c.collectionUri,
    plugins: [{ type: 'Royalties', basisPoints: plan.royaltyBps, creators: [{ address: treasury, percentage: 100 }], ruleSet: ruleSet('None') }] }).sendAndConfirm(umi);
  log(`collection ${collection.publicKey}`);
  const { early, public: pub, reserve: res } = plan.phases;
  const guards = {
    early: { allowList: some({ merkleRoot: getMerkleRoot(allowlist) }), solPayment: some({ lamports: sol(early.lamports / 1e9), destination: treasury }),
      startDate: some({ date: dateTime(c.earlyStart) }), endDate: some({ date: dateTime(c.publicStart) }), mintLimit: some({ id: early.mintLimitId, limit: early.walletLimit }) },
    public: { solPayment: some({ lamports: sol(pub.lamports / 1e9), destination: treasury }), startDate: some({ date: dateTime(c.publicStart) }), mintLimit: some({ id: pub.mintLimitId, limit: pub.walletLimit }) },
    reserve: { addressGate: some({ address: reserve }) }
  };
  const cls = configLineSettings(c.metadataBase, plan);
  for (const k of PHASES) {
    const machine = generateSigner(umi), tokens = pools[k];
    state.machines[k] = { address: machine.publicKey, loaded: 0, items: tokens.length };
    await (await create(umi, { candyMachine: machine, collection: collection.publicKey, collectionUpdateAuthority: umi.identity, itemsAvailable: tokens.length, isMutable: false,
      configLineSettings: some(cls), guards: guards[k] })).sendAndConfirm(umi);
    for (let i = 0; i < tokens.length; i += LINES_PER_TX) {
      const slice = tokens.slice(i, i + LINES_PER_TX);
      await addConfigLines(umi, { candyMachine: machine.publicKey, index: i, configLines: slice.map(n => ({ name: String(n), uri: `${n}.json` })) }).sendAndConfirm(umi);
      state.machines[k].loaded = i + slice.length;
    }
    const m = await fetchCandyMachine(umi, machine.publicKey);
    if (Number(m.itemsLoaded) !== tokens.length) throw new Error(`On-chain load mismatch for ${k}: ${m.itemsLoaded} vs ${tokens.length}`);
    log(`machine ${k} ${machine.publicKey}: ${tokens.length} items loaded`);
  }
  return state;
}
/** Read the deployed machines back from chain and assert they match the plan. Returns a report; throws on mismatch. */
export async function verifyDeployment({ umi, plan = PLAN, state, config: c }) {
  const report = { ok: true, phases: {} }; const lam = x => Number(x.basisPoints);
  for (const k of PHASES) {
    const cm = await fetchCandyMachine(umi, publicKey(state.machines[k].address)), g = (await fetchCandyGuard(umi, cm.mintAuthority)).guards, ph = plan.phases[k];
    const un = o => (o && o.__option === 'Some' ? o.value : null);
    const r = { items: Number(cm.data.itemsAvailable), loaded: Number(cm.itemsLoaded), redeemed: Number(cm.itemsRedeemed), collection: String(cm.collectionMint), mutable: cm.data.isMutable };
    const issues = [];
    if (r.items !== ph.allocation) issues.push(`itemsAvailable ${r.items} != ${ph.allocation}`);
    if (r.loaded !== ph.allocation) issues.push(`itemsLoaded ${r.loaded}`);
    if (r.collection !== String(state.collection)) issues.push('collection mismatch');
    if (k !== 'reserve') {
      const sp = un(g.solPayment), ml = un(g.mintLimit);
      if (!sp || lam(sp.lamports) !== ph.lamports) issues.push(`price ${sp && lam(sp.lamports)} != ${ph.lamports}`);
      if (!sp || String(sp.destination) !== c.treasury) issues.push('payment destination != treasury');
      if (!ml || ml.limit !== ph.walletLimit) issues.push('mint limit mismatch');
    } else {
      const ag = un(g.addressGate); if (!ag || String(ag.address) !== c.reserveWallet) issues.push('reserve address gate mismatch');
      if (un(g.solPayment)) issues.push('reserve must be free');
    }
    if (k === 'early' && !un(g.allowList)) issues.push('early allowList missing');
    if (k === 'early' && !un(g.endDate)) issues.push('early endDate missing');
    r.issues = issues; report.phases[k] = r; if (issues.length) report.ok = false;
  }
  return report;
}
