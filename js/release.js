/* Anomaly scanner, legendary archive, official links (all gated by RELEASE_READY where money or addresses are involved). */
(() => {
  'use strict';
  const $ = id => document.getElementById(id), cfg = window.LAUNCH;
  const signals = [['TIME FRACTURE', 'Your coffee arrived before you ordered it.'], ['GRAVITY WELL', 'The crew has lost another wrench to the void.'], ['UNKNOWN SIGNAL', 'Houston, we have a liquidity problem.'], ['THE ORIGINAL', 'No thoughts. Just gravity.'], ['EVENT HORIZON', 'There is no return transmission.']];
  signals.push(['RELAY 07','The signal is repeating. It sounds like our own distress call.'], ['MISSING MINUTE','Every clock on the ship has lost the same sixty seconds.'], ['CREW ECHO','A voice on the radio knows your callsign. Nobody is transmitting.']);
  let last = -1, found = [];
  try { const saved = JSON.parse(localStorage.getItem('eh-signals') || '[]'); if (Array.isArray(saved)) found = [...new Set(saved.filter(n => Number.isInteger(n) && n >= 0 && n < signals.length))]; } catch {}
  const scan = $('scan'), count = document.createElement('p'); count.className = 'fine'; count.setAttribute('role','status'); scan.after(count);
  function update() { count.textContent = found.length + '/' + signals.length + ' fictional transmissions recovered on this device.'; }
  update();
  scan.onclick = () => { const remaining = signals.map((_,i) => i).filter(i => !found.includes(i)); last = remaining.length ? remaining[Math.floor(Math.random()*remaining.length)] : (last+1)%signals.length; if (!found.includes(last)) found.push(last); try { localStorage.setItem('eh-signals',JSON.stringify(found)); } catch {} $('anomaly-title').textContent = signals[last][0]; $('anomaly-text').textContent = signals[last][1]; update(); };
  const arch = $('legendary'), ones = (window.ASTROS || []).filter(a => a.title);
  ones.forEach(a => {
    const fig = document.createElement('figure'), im = document.createElement('img'), cap = document.createElement('figcaption');
    im.src = a.image; im.alt = a.name + ' ' + a.title; im.loading = 'lazy'; im.width = 200; im.height = 200;
    cap.textContent = a.title + ' · #' + a.id; const b = document.createElement('button'); b.type = 'button'; b.className = 'archive-open'; b.setAttribute('aria-label', 'View ' + a.title); b.append(im); b.addEventListener('click', () => window.ASTRO_OPEN_DETAIL?.(a.id)); fig.append(b, cap); arch.append(fig);
  });
  const note = $('legendary-note');
  note.textContent = ones.length === 5 ? 'All five 1/1 pieces are illustrated.' : ones.length + ' of 5 one-of-one pieces shown.';
  for (const [label, key] of [['Official X', 'xUrl'], ['Official Telegram', 'telegramUrl'], ['Discord', 'discordUrl'], ['Mint', 'mintUrl']]) {
    if (!cfg[key] || (key === 'mintUrl' && !window.RELEASE_READY)) continue;
    try { const url = new URL(cfg[key]); if (url.protocol !== 'https:' || url.username || url.password) continue; const a = document.createElement('a'); a.href = url.href; a.textContent = label; a.className = 'btn ghost'; a.rel = 'noopener noreferrer'; $('official-links').append(a); } catch { /* ignore */ }
  }
  for (const [label, key] of [['Token mint', 'tokenMint'], ['Collection mint', 'collectionMint']]) {
    if (!window.RELEASE_READY || !/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(cfg[key])) continue;
    const p = document.createElement('p'); p.textContent = label + ': ' + cfg[key]; $('official-links').append(p);
  }
  if (window.RELEASE_READY) $('launch-status').textContent = 'Official launch links below. Verify addresses independently.';
})();
