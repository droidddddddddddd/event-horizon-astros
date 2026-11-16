// Launch economics: the single source of truth for the mint tooling. Mirrors launch-config.js and launch-kit/mint/plan.json.
// Changing these numbers is a business decision (see DECISIONS.md); tests assert them.
export const LAMPORTS_PER_SOL = 1_000_000_000;
export const PLAN = Object.freeze({
  supply: 1000,
  royaltyBps: 250,                       // 2.5% secondary royalty, advisory (ruleSet None) unless marketplace allow-list enforcement is chosen
  symbol: 'ASTROS',
  namePrefix: 'Astro #',
  phases: Object.freeze({
    early:   Object.freeze({ allocation: 200, lamports: 1250_000_000, walletLimit: 1, mintLimitId: 1, allowlist: true }),   // 0.15 SOL, allowlist, 1/wallet
    public:  Object.freeze({ allocation: 780, lamports: 250_000_000, walletLimit: 2, mintLimitId: 2, allowlist: false }),  // 0.25 SOL, 2/wallet
    reserve: Object.freeze({ allocation: 20,  lamports: 0,          walletLimit: 0, mintLimitId: 0, allowlist: false })    // disclosed community reserve, address-gated, free
  }),
  tiers: Object.freeze({ Common: 550, Uncommon: 250, Rare: 120, Epic: 60, Legendary: 20 })
});
export const PHASES = ['early', 'public', 'reserve'];
export function validatePlan(p = PLAN) {
  const alloc = PHASES.reduce((n, k) => n + p.phases[k].allocation, 0);
  if (alloc !== p.supply) throw new Error(`Phase allocations sum to ${alloc}, supply is ${p.supply}`);
  if (Object.values(p.tiers).reduce((a, b) => a + b, 0) !== p.supply) throw new Error('Tier counts do not sum to supply');
  return true;
}
// Test-only scaled plan (local validator / devnet rehearsals). Never allowed on mainnet (see safety.assertScaledPlanAllowed).
export function scaledPlan({ early, public: pub, reserve }) {
  const supply = early + pub + reserve;
  return Object.freeze({ ...PLAN, supply, scaled: true, phases: Object.freeze({
    early: Object.freeze({ ...PLAN.phases.early, allocation: early }), public: Object.freeze({ ...PLAN.phases.public, allocation: pub }), reserve: Object.freeze({ ...PLAN.phases.reserve, allocation: reserve }) }),
    tiers: Object.freeze({ Common: supply }) });
}
