/* Collection explorer, nav, hero particles, local mission checklist. No innerHTML with data: DOM + textContent only. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const data = Array.isArray(window.ASTROS) ? window.ASTROS : [];
  const status = window.ASTROS_STATUS || {};
  const TIERS = ['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary'];
  const PLANNED = { Common: 550, Uncommon: 250, Rare: 120, Epic: 60, Legendary: 20 };
  const RANK = { Common: 1, Uncommon: 2, Rare: 3, Epic: 4, Legendary: 5 };
  let tier = 'All', limit = 15;
  const el = (t, c, x) => { const e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; };

  /* ---- chips ---- */
  const chips = $('chips');
  ['All', ...TIERS].forEach(t => {
    const b = el('button', 'chip t-' + t.toLowerCase(), t); b.type = 'button'; b.dataset.tier = t; b.setAttribute('aria-pressed', t === 'All' ? 'true' : 'false');
    b.addEventListener('click', () => { tier = t; limit = 15; chips.querySelectorAll('.chip').forEach(c => c.setAttribute('aria-pressed', c.dataset.tier === t ? 'true' : 'false')); render(); });
    chips.append(b);
  });
  window.ASTRO_SELECT_TIER = t => { const b = chips.querySelector('[data-tier="' + t + '"]'); if (b) b.click(); };

  /* ---- reveal status (honest) ---- */
  (() => {
    const done = TIERS.reduce((n, t) => n + ((status[t] || {}).done || 0), 0);
    const parts = TIERS.map(t => t + ' ' + ((status[t] || {}).done || 0) + '/' + PLANNED[t]).join(' · ');
    $('revealStatus').textContent = done + ' of 1,000 Astros illustrated and reviewed so far (' + parts + '). The rest are still in production.';
  })();

  function matches(a, q) {
    if (!q) return true;
    const hay = ('#' + a.id + ' ' + a.name + ' ' + a.tier + ' ' + (a.title || '') + ' ' + Object.values(a.traits || {}).join(' ')).toLowerCase();
    return hay.includes(q);
  }
  function sorted(items) {
    const m = $('sort').value, c = items.slice();
    if (m === 'num') c.sort((a, b) => a.id - b.id);
    else if (m === 'numdesc') c.sort((a, b) => b.id - a.id);
    else c.sort((a, b) => RANK[b.tier] - RANK[a.tier] || a.id - b.id);
    return c;
  }
  function openDetail(a) {
    const body = $('detailBody'); body.replaceChildren();
    const im = el('img'); im.src = a.image; im.alt = a.name + (a.title ? ' ' + a.title : '') + ', ' + a.tier; im.width = 512; im.height = 512; body.append(im);
    const h = el('h3', null, a.name + (a.title ? ' · ' + a.title : '')); body.append(h);
    const t = el('p', 't-' + a.tier.toLowerCase() + ' tier', a.tier + ' · Concept art · Not minted'); body.append(t);
    const dl = el('dl', 'traits');
    const rows = [['Backdrop', a.backdrop && a.backdrop.name]].concat(Object.entries(a.traits || {}).filter(([, v]) => v && v !== 'None'));
    rows.forEach(([k, v]) => { if (!v) return; dl.append(el('dt', null, k), el('dd', null, v)); });
    body.append(dl);
    const roles = ['Navigation','Signal recovery','Engineering','Deep-space survey','Flight operations','Anomaly research'];
    const origins = ['Luna Relay','Mars Outpost','Ceres Station','Europa Array','Titan Dock','Outer Belt'];
    const n = Number(a.id);
    const dossier = el('section', 'astro-dossier');
    dossier.append(el('h3', null, 'Crew dossier / Fictional lore'));
    const info = el('dl', 'traits');
    [['Callsign', 'EH-' + String(n).padStart(4, '0')], ['Assignment', roles[n % roles.length]], ['Origin', origins[Math.floor(n / roles.length) % origins.length]], ['Mission', 'Recover the last signal beyond the horizon']].forEach(([k,v]) => info.append(el('dt',null,k),el('dd',null,v)));
    dossier.append(info);
    body.append(dossier);
    const go = el('button', 'btn primary', 'Open in Astro Studio'); go.type = 'button';
    go.addEventListener('click', () => { $('detail').close(); window.dispatchEvent(new CustomEvent('astro:use', { detail: { id: a.id } })); location.hash = '#studio'; });
    body.append(go);
    const share = el('button', 'btn ghost', 'Copy Astro link'); share.type = 'button';
    share.addEventListener('click', async () => { try { const u = new URL(location.href); u.searchParams.set('astro', String(a.id)); u.hash = 'collection'; await navigator.clipboard.writeText(u.href); share.textContent = 'Link copied'; } catch { share.textContent = 'Copy unavailable'; } }); body.append(share);
    $('detail').showModal();
  }
  window.ASTRO_OPEN_DETAIL = id => { const a = data.find(x => Number(x.id) === Number(id)); if (a) openDetail(a); };
  function render() {
    const q = $('search').value.trim().toLowerCase();
    const items = sorted(data.filter(a => (tier === 'All' || a.tier === tier) && matches(a, q)));
    const g = $('gallery'); g.replaceChildren();
    items.slice(0, limit).forEach(a => {
      const b = el('button', 'astro t-' + a.tier.toLowerCase()); b.type = 'button';
      const im = el('img'); im.src = a.image; im.alt = a.name + ', ' + a.tier; im.loading = 'lazy'; im.width = 256; im.height = 256;
      const cap = el('span', 'cap'); cap.append(el('strong', null, a.name + (a.title ? ' · ' + a.title : '')), el('em', null, a.tier));
      b.append(im, cap); b.addEventListener('click', () => openDetail(a)); g.append(b);
    });
    if (!items.length) g.textContent = tier !== 'All' && !data.some(a => a.tier === tier) ? 'None of the ' + tier + ' Astros are finished yet.' : 'No matching Astros.';
    $('more').hidden = items.length <= limit;
  }
  $('search').addEventListener('input', () => { limit = 15; render(); });
  $('sort').addEventListener('change', () => { limit = 15; render(); });
  $('more').addEventListener('click', () => { limit += 15; render(); });
  $('close').addEventListener('click', () => $('detail').close());
  $('detail').addEventListener('click', e => { if (e.target === $('detail')) $('detail').close(); });
  render();
  const linked = new URLSearchParams(location.search).get('astro'); if (linked && /^\d{1,4}$/.test(linked)) window.ASTRO_OPEN_DETAIL(linked);

  /* ---- mobile menu (below 1100px the section links live in a dropdown) ---- */
  (() => {
    const tg = $('navToggle'), nv = $('nav'), hd = $('top'); if (!tg || !nv || !hd) return;
    const set = o => { hd.classList.toggle('open', o); tg.setAttribute('aria-expanded', o ? 'true' : 'false'); };
    tg.addEventListener('click', () => set(!hd.classList.contains('open')));
    nv.addEventListener('click', e => { if (e.target.closest('a')) set(false); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && hd.classList.contains('open')) { set(false); tg.focus(); } });
    document.addEventListener('click', e => { if (hd.classList.contains('open') && !hd.contains(e.target)) set(false); });
    matchMedia('(min-width: 1101px)').addEventListener('change', e => { if (e.matches) set(false); });
  })();

  /* ---- nav highlight ---- */
  const links = [...document.querySelectorAll('#nav a')], secs = links.map(a => document.querySelector(a.getAttribute('href')));
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) links.forEach((a, i) => a.classList.toggle('on', secs[i] === e.target)); }), { rootMargin: '-35% 0px -55% 0px' });
    secs.forEach(s => s && io.observe(s));
  }

  /* ---- local mission checklist ---- */
  let done = []; try { done = JSON.parse(localStorage.getItem('astro-missions') || '[]'); if (!Array.isArray(done)) done = []; } catch { done = []; }
  done = [...new Set(done)].filter(id => [...document.querySelectorAll('.mission')].some(b => b.dataset.id === id));
  function progress() {
    document.querySelectorAll('.mission').forEach(b => { b.textContent = done.includes(b.dataset.id) ? 'Completed ✓' : 'Mark complete'; b.setAttribute('aria-pressed', String(done.includes(b.dataset.id))); });
    $('progress').textContent = done.length + '/' + document.querySelectorAll('.mission').length + ' missions completed on this device';
  }
  document.querySelectorAll('.mission').forEach(b => b.addEventListener('click', () => {
    const id = b.dataset.id; done = done.includes(id) ? done.filter(x => x !== id) : [...done, id];
    try { localStorage.setItem('astro-missions', JSON.stringify(done)); } catch { /* ignore */ }
    progress();
  }));
  progress();

  /* ---- hero: drifting embers around the black hole (kept from V6's animated black hole); respects reduced motion ---- */
  const cv = $('space'), c = cv.getContext('2d'); let w = 0, h = 0, raf = 0;
  const parts = Array.from({ length: 70 }, (_, i) => ({ a: i * 2.399, r: 0.6 + (i % 17) / 17 * 0.9, s: 0.0002 + (i % 5) * 0.00006 }));
  function resize() { w = cv.width = cv.clientWidth; h = cv.height = cv.clientHeight; }
  function frame(ms) {
    c.clearRect(0, 0, w, h);
    const cx = w * (w < 700 ? 0.58 : 0.365), cy = h * (w < 700 ? 0.42 : 0.52), R = Math.min(w, h) * 0.22;
    c.save(); c.translate(cx, cy); c.rotate(-0.38);
    parts.forEach(p => { const t = p.a + ms * p.s, rr = R * (1.1 + p.r * 0.9); c.globalAlpha = 0.35 + 0.3 * Math.sin(ms * 0.001 + p.a); c.fillStyle = '#ffb057'; c.fillRect(Math.cos(t) * rr * 1.6, Math.sin(t) * rr * 0.5, 2, 2); });
    c.restore(); c.globalAlpha = 1;
    if (!matchMedia('(prefers-reduced-motion: reduce)').matches) raf = requestAnimationFrame(frame);
  }
  window.addEventListener('resize', resize); raf = requestAnimationFrame(t => { resize(); raf = requestAnimationFrame(frame); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) cancelAnimationFrame(raf); else if (!matchMedia('(prefers-reduced-motion: reduce)').matches) raf = requestAnimationFrame(frame); });
})();
