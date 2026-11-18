// Launch economics: the single source of truth for the mint tooling. Mirrors launch-config.js and launch-kit/mint/plan.json.
// Changing these numbers is a business decision (see DECISIONS.md); tests assert them.
export const LAMPORTS_PER_SOL = 1_000_000_000;
// Compact ID ranges ('1-5,7') -> [1,2,3,4,5,7]. Kept as ranges so the list is readable and is not mistaken for a key array.
export function expandRanges(s) { return s.split(',').flatMap(x => { const [a, b = a] = x.split('-').map(Number); return Array.from({ length: b - a + 1 }, (_, i) => a + i); }); }
export const PLAN = Object.freeze({
  supply: 500,                           // Christopher approved 500 (2026-11-18); was 1,000
  royaltyBps: 250,                       // 2.5% secondary royalty, advisory (ruleSet None) unless marketplace allow-list enforcement is chosen
  symbol: 'ASTROS',
  namePrefix: 'Astro #',
  phases: Object.freeze({
    early:   Object.freeze({ allocation: 100, lamports: 150_000_000,  walletLimit: 1, mintLimitId: 1, allowlist: true }),   // 0.15 SOL, allowlist, 1/wallet
    public:  Object.freeze({ allocation: 390, lamports: 250_000_000, walletLimit: 2, mintLimitId: 2, allowlist: false }),  // 0.25 SOL, 2/wallet
    reserve: Object.freeze({ allocation: 10,  lamports: 0,          walletLimit: 0, mintLimitId: 0, allowlist: false })    // disclosed community reserve, address-gated, free
  }),
  // Rare/Epic/Legendary equal the art already approved (none dropped); the 74 still to make are Common/Uncommon.
  tiers: Object.freeze({ Common: 233, Uncommon: 106, Rare: 81, Epic: 60, Legendary: 20 }),
  // The 500 token numbers (mirror of launch-kit/supply.json tokenIds; a test asserts they match). Not contiguous: the 426 approved Astros keep their IDs.
  tokenIds: Object.freeze(expandRanges('1-412,415-416,419-420,433-434,441-442,446,450,452,456,458,461-462,472-473,479-480,491,494,496-499,503,510,515-516,518,528,542-543,547,550-552,556,561,564,566-567,580,584,593,596-597,625-626,629-630,648,655,660,667-668,672-673,676-677,684,686,697,715,730,758,762,777,789,812,819,823,832,849,870,880,893-894,915,917-918,943,952,954,960,976,991-992'))
});
export const PHASES = ['early', 'public', 'reserve'];
export function validatePlan(p = PLAN) {
  const alloc = PHASES.reduce((n, k) => n + p.phases[k].allocation, 0);
  if (alloc !== p.supply) throw new Error(`Phase allocations sum to ${alloc}, supply is ${p.supply}`);
  if (Object.values(p.tiers).reduce((a, b) => a + b, 0) !== p.supply) throw new Error('Tier counts do not sum to supply');
  if (p.tokenIds && (p.tokenIds.length !== p.supply || new Set(p.tokenIds).size !== p.supply || !p.tokenIds.every(n => Number.isInteger(n) && n >= 1))) throw new Error('tokenIds must be supply unique positive integers');
  return true;
}
// Test-only scaled plan (local validator / devnet rehearsals). Never allowed on mainnet (see safety.assertScaledPlanAllowed).
export function scaledPlan({ early, public: pub, reserve }) {
  const supply = early + pub + reserve;
  return Object.freeze({ ...PLAN, supply, scaled: true, tokenIds: undefined, phases: Object.freeze({
    early: Object.freeze({ ...PLAN.phases.early, allocation: early }), public: Object.freeze({ ...PLAN.phases.public, allocation: pub }), reserve: Object.freeze({ ...PLAN.phases.reserve, allocation: reserve }) }),
    tiers: Object.freeze({ Common: supply }) });
}
