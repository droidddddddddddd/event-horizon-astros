/* Release gate (informational only, not a security boundary or blockchain verifier).
   Sale/token links stay hidden unless EVERY approval flag is true, addresses/URLs validate, the launch time has passed,
   status is "live", AND mainnetPaymentsEnabled is explicitly true. Defaults are all false. */
(() => {
  'use strict';
  const c = window.LAUNCH;
  const flags = ['artApproved', 'metadataVerified', 'devnetTested', 'securityReviewed', 'mainnetVerified', 'termsApproved'];
  const key = x => typeof x === 'string' && /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(x);
  const url = x => { try { const u = new URL(x); return u.protocol === 'https:' && !u.username && !u.password; } catch { return false; } };
  const ready = flags.every(k => c[k] === true) && c.mainnetPaymentsEnabled === true && c.cluster === 'mainnet-beta' &&
    key(c.tokenMint) && key(c.collectionMint) && url(c.mintUrl) &&
    c.tokenUrl === 'https://pump.fun/coin/' + c.tokenMint &&
    typeof c.nftPrice === 'number' && Number.isFinite(c.nftPrice) && c.nftPrice >= 0 &&
    typeof c.launchTime === 'string' && Number.isFinite(Date.parse(c.launchTime)) && Date.now() >= Date.parse(c.launchTime);
  window.RELEASE_READY = ready && c.status === 'live';
  window.RELEASE_FLAGS = flags;
})();
