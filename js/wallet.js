/* Optional Phantom IDENTITY connection (no transaction, no signature, no balance read). Header button + status line. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id), btn = $('wallet-connect'), label = $('wallet-label'), status = $('wallet-status');
  const provider = () => { const p = window.phantom && window.phantom.solana; return p && p.isPhantom ? p : null; };
  let connected = false;
  function short(k) { const s = String(k); return s.length > 12 ? s.slice(0, 4) + '…' + s.slice(-4) : s; }
  function show(key) {
    connected = !!key;
    label.textContent = key ? short(key) + ' ✕' : 'CONNECT WALLET';
    btn.title = key ? 'Disconnect' : 'Connect Phantom (identity only, no transactions)';
    if (status) status.textContent = key ? 'Connected (identity only): ' + short(key) : 'Not connected';
  }
  btn.addEventListener('click', async () => {
    const p = provider();
    try {
      if (connected) { await (p && p.disconnect()); show(null); return; }
      if (!p) { if (status) status.textContent = 'Phantom not detected. Install the official Phantom extension or open this site in the Phantom browser.'; label.textContent = 'PHANTOM NOT FOUND'; setTimeout(() => show(null), 2500); return; }
      const r = await p.connect(); show(r.publicKey);
    } catch { if (status) status.textContent = 'Connection cancelled or unavailable.'; show(null); }
  });
  const p0 = provider();
  if (p0 && p0.on) { p0.on('accountChanged', k => show(k)); p0.on('disconnect', () => show(null)); }
  show(null);
})();
