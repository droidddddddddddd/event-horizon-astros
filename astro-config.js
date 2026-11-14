/* Configuration for the ported rank checker / crew perks / milestone meter. Everything public. NEVER put a keyed RPC URL here.
   The contract address comes from launch-config.js and only appears once the release gate passes. */
(() => {
  'use strict';
  const L = window.LAUNCH || {}, ok = x => typeof x === 'string' && /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(x);
  const https = x => { try { return new URL(x).protocol === 'https:' ? x : ''; } catch { return ''; } };
  window.ASTRO_CONFIG = Object.freeze({
    ticker: 'ASTRO', name: 'Event Horizon Astros', slogan: 'The point of no return.',
    ca: window.RELEASE_READY && ok(L.tokenMint) ? L.tokenMint : '',
    socials: { x: https(L.xUrl || ''), telegram: '', community: https(L.discordUrl || '') },
    refreshSeconds: 30,
    lore: 'data/lore.json',
    minBalance: 10000,
    ranks: [
      { name: 'Drifter', minDays: 0, blurb: 'Just entered the pull. Under 24 hours.' },
      { name: 'Navigator', minDays: 1, blurb: 'Steering through the glow. 1 to 7 days.' },
      { name: 'Event Horizon', minDays: 7, blurb: 'Right at the edge, still here. 7 to 30 days.' },
      { name: 'Singularity', minDays: 30, blurb: 'The center. 30 days or more.' }
    ],
    perks: [
      { id: 'badge', name: 'Rank badge on your rank card', minRank: 'Drifter' },
      { id: 'frame', name: 'Rank frames in the PFP maker', minRank: 'Drifter', note: 'each frame needs its own rank' },
      { id: 'wall', name: 'Opt-in crew wall', minRank: 'Navigator' },
      { id: 'early', name: 'Early transmissions (bonus lore)', minRank: 'Event Horizon' },
      { id: 'classified', name: 'Classified log (Singularity only)', minRank: 'Singularity' },
      { id: 'astro', name: 'Astro claim (planned, not live)', minRank: 'Drifter', planned: true }
    ],
    crewWall: 'data/crew.json', crewLore: 'data/crew-lore.json',
    rpcEndpoints: ['https://solana-rpc.publicnode.com', 'https://api.mainnet-beta.solana.com'],
    rpcProxy: '',
    maxSigPages: 8
  });
})();
