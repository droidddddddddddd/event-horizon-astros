/* Launch terminal text + gate status. Wallet identity lives in wallet.js. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id), cfg = window.LAUNCH;
  const gates = $('release-gates');
  const money = n => Number(n).toString();
  for (const t of [
    'Token: planned Pump.fun / ' + Number(cfg.tokenSupply).toLocaleString('en-US') + ' target supply',
    'NFTs: ' + cfg.nftSupply.toLocaleString('en-US') + ' planned · ' + money(cfg.nftPrice) + ' SOL public · ' + money(cfg.earlyPrice) + ' SOL early crew (' + cfg.earlyAllocation + ') · ' + cfg.reserveAllocation + ' reserve',
    'Royalty: ' + (cfg.royaltyBps / 100) + '% proposed',
    'Release: coordinated launch window / date pending'
  ]) { const p = document.createElement('p'); p.textContent = t; gates.append(p); }
  $('readiness').textContent = window.RELEASE_READY
    ? 'Release links enabled. Independently verify before signing.'
    : 'Prelaunch: sale links disabled until every release check is complete (art, metadata, devnet, security review, mainnet verification, terms, explicit mainnet-payments flag).';
  const t = $('countdown');
  t.textContent = (cfg.launchTime && Number.isFinite(Date.parse(cfg.launchTime)))
    ? 'Scheduled window: ' + new Date(cfg.launchTime).toLocaleString() + ' (your local time).' : 'Launch date to be announced.';
  const mp = $('mint-state');
  if (mp && window.RELEASE_READY) mp.textContent = 'Release checks passed per configuration. Verify the mint URL and addresses independently.';
  if (window.RELEASE_READY && cfg.tokenUrl) {
    try {
      const u = new URL(cfg.tokenUrl);
      if (u.protocol === 'https:' && u.hostname === 'pump.fun' && u.pathname === '/coin/' + cfg.tokenMint) {
        const a = document.createElement('a'); a.href = u.href; a.textContent = 'Official Pump.fun token'; a.className = 'btn primary'; a.rel = 'noopener noreferrer'; gates.append(a);
      }
    } catch { /* ignore */ }
  }
})();
