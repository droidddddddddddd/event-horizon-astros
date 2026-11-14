/* Astro Studio: Meme Maker, PFP Creator, Frames, Styles, Text/Caption, Export (+ the ported Black Hole Scene PFP in pfp.js).
   Everything runs in this tab with <canvas>. User text is only ever drawn with fillText/strokeText and read via .value: it is
   never inserted as HTML. Uploaded images are type/size checked and never leave the browser. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const cv = $('st-canvas'), ctx = cv.getContext('2d');
  const data = Array.isArray(window.ASTROS) ? window.ASTROS : [];
  const FORMATS = { '1:1': [1080, 1080], '4:5': [1080, 1350], '16:9': [1280, 720] };
  const FRAMES = [
    { id: 'none', name: 'No frame', css: 'transparent' },
    { id: 'solar', name: 'Solar orange', css: '#ff8a1f' },
    { id: 'void', name: 'Void black', css: '#0a0807' },
    { id: 'gold', name: 'Gold double', css: '#ffcf6a' },
    { id: 'ion', name: 'Ion blue', css: '#5fd2ff' }
  ];
  const STYLES = [
    { id: 'none', name: 'Original', filter: 'none', css: 'linear-gradient(135deg,#d9c9ad,#6a5b48)' },
    { id: 'solar', name: 'Solar', filter: 'sepia(.55) saturate(1.7) contrast(1.05)', css: 'linear-gradient(135deg,#ffb34d,#d4540a)' },
    { id: 'void', name: 'Void', filter: 'hue-rotate(235deg) saturate(1.3) contrast(1.05)', css: 'linear-gradient(135deg,#9a7bff,#2b1160)' },
    { id: 'ion', name: 'Ion', filter: 'hue-rotate(165deg) saturate(1.2)', css: 'linear-gradient(135deg,#7fe3ff,#0b4a6b)' },
    { id: 'mono', name: 'Mono', filter: 'grayscale(1) contrast(1.2)', css: 'linear-gradient(135deg,#eee,#222)' },
    { id: 'poster', name: 'Poster', filter: 'contrast(1.5) saturate(1.8)', css: 'linear-gradient(135deg,#ff4d6d,#ffd23f)' }
  ];
  const MAX_UPLOAD = 12 * 1024 * 1024, OK_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];
  const S = { tool: 'meme', fmt: '1:1', frame: 'solar', style: 'none', img: null, imgName: 'astro', objectUrl: null };
  const img = new Image();

  /* ---- helpers ---- */
  const clean = s => String(s || '').replace(/[\u0000-\u001f\u007f\u200b-\u200f\u202a-\u202e\u2066-\u2069]/g, '').slice(0, 60);
  const msg = (t, bad) => { const m = $('st-msg'); m.textContent = t || ''; m.classList.toggle('bad', !!bad); };
  function fontStr(px) { return px + 'px "' + $('st-font').value + '", Impact, sans-serif'; }
  function wrap(g, text, maxW) {
    const words = text.split(/\s+/).filter(Boolean), lines = []; let line = '';
    words.forEach(w => { const t = line ? line + ' ' + w : w; if (g.measureText(t).width > maxW && line) { lines.push(line); line = w; } else line = t; });
    if (line) lines.push(line); return lines;
  }
  function layoutText(g, text, W, base) {
    let size = base;
    for (; size > 18; size -= 3) { g.font = fontStr(size); const lines = wrap(g, text, W * 0.9); if (lines.length <= 2 && lines.every(l => g.measureText(l).width <= W * 0.92)) return { lines, size }; }
    g.font = fontStr(18); return { lines: wrap(g, text, W * 0.9).slice(0, 3), size: 18 };
  }
  function drawText(g, W, H, text, where) {
    text = clean(text); if (!text) return;
    if ($('st-upper').checked) text = text.toUpperCase();
    const base = W * 0.115 * ($('st-size').value / 10), { lines, size } = layoutText(g, text, W, base), lh = size * 1.05, pad = W * 0.04;
    g.font = fontStr(size); g.textAlign = 'center'; g.textBaseline = 'alphabetic'; g.lineJoin = 'round'; g.miterLimit = 2;
    g.lineWidth = size * 0.16; g.strokeStyle = '#000'; g.fillStyle = $('st-tcolor').value;
    const total = lines.length * lh; let y = where === 'top' ? pad + size * 0.85 : H - pad - total + size * 0.85;
    if (S.frame !== 'none') y += where === 'top' ? W * 0.02 : -W * 0.02;
    lines.forEach(l => { g.strokeText(l, W / 2, y, W * 0.94); g.fillText(l, W / 2, y, W * 0.94); y += lh; });
  }
  function styleFilter() { return (STYLES.find(s => s.id === S.style) || STYLES[0]).filter; }
  function cover(g, im, W, H, zoom, ox, oy) {
    const iw = im.naturalWidth, ih = im.naturalHeight, base = Math.max(W / iw, H / ih), sc = base * zoom;
    const dw = iw * sc, dh = ih * sc, maxX = Math.max(0, (dw - W) / 2), maxY = Math.max(0, (dh - H) / 2);
    g.drawImage(im, (W - dw) / 2 + ox * maxX, (H - dh) / 2 + oy * maxY, dw, dh);
  }
  function drawFrame(g, W, H) {
    const t = Math.round(W * 0.026); g.save();
    if (S.frame === 'solar') { g.strokeStyle = '#ff8a1f'; g.lineWidth = t; g.strokeRect(t / 2, t / 2, W - t, H - t); g.strokeStyle = '#ffe3b0'; g.lineWidth = 3; g.strokeRect(t + 6, t + 6, W - 2 * t - 12, H - 2 * t - 12); }
    else if (S.frame === 'void') { g.strokeStyle = '#0a0807'; g.lineWidth = t * 1.4; g.strokeRect(t * 0.7, t * 0.7, W - t * 1.4, H - t * 1.4); g.strokeStyle = '#ff8a1f'; g.lineWidth = 3; g.strokeRect(t * 1.4 + 4, t * 1.4 + 4, W - t * 2.8 - 8, H - t * 2.8 - 8); }
    else if (S.frame === 'gold') { g.strokeStyle = '#ffcf6a'; g.lineWidth = t * 0.55; g.strokeRect(t * 0.3, t * 0.3, W - t * 0.6, H - t * 0.6); g.strokeStyle = '#7a4a10'; g.lineWidth = 3; g.strokeRect(t * 0.9, t * 0.9, W - t * 1.8, H - t * 1.8); g.strokeStyle = '#ffcf6a'; g.lineWidth = t * 0.3; g.strokeRect(t * 1.3, t * 1.3, W - t * 2.6, H - t * 2.6); }
    else if (S.frame === 'ion') { g.strokeStyle = '#5fd2ff'; g.lineWidth = t; g.shadowColor = '#5fd2ff'; g.shadowBlur = t; g.strokeRect(t / 2, t / 2, W - t, H - t); }
    g.restore();
  }
  function ring(g, W, H) {
    const r = W * 0.055, x = W - r - W * 0.04, y = H - r - H * 0.04;
    g.save(); g.fillStyle = 'rgba(10,8,7,.82)'; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
    g.strokeStyle = '#ff8a1f'; g.lineWidth = r * 0.14; g.beginPath(); g.arc(x, y, r * 0.88, 0, 7); g.stroke();
    g.translate(x, y); g.rotate(-0.4); g.strokeStyle = '#ffcf8a'; g.lineWidth = r * 0.12; g.beginPath(); g.ellipse(0, 0, r * 0.7, r * 0.22, 0, 0, 7); g.stroke();
    g.fillStyle = '#ff9a3a'; g.beginPath(); g.arc(0, 0, r * 0.3, 0, 7); g.fill(); g.restore();
  }
  function render(g, W, H) {
    g.save(); g.fillStyle = '#0c0a08'; g.fillRect(0, 0, W, H);
    if (img.naturalWidth) {
      const f = styleFilter(); const hasF = 'filter' in g;
      if (S.tool === 'pfp') {
        const zoom = $('st-zoom').value / 100, ox = $('st-ox').value / 100, oy = $('st-oy').value / 100;
        g.save(); g.beginPath();
        if ($('st-shape').value === 'circle') g.arc(W / 2, H / 2, W / 2, 0, 7); else g.roundRect ? g.roundRect(0, 0, W, H, W * 0.12) : g.rect(0, 0, W, H);
        g.clip(); if (hasF) g.filter = f; cover(g, img, W, H, zoom, ox, oy); g.restore();
        if ($('st-badge').checked) ring(g, W, H);
      } else {
        if (W / H > 1.4) { // wide: blurred fill + centered image
          g.save(); if (hasF) g.filter = 'blur(26px) brightness(.55) ' + (f === 'none' ? '' : f); cover(g, img, W, H, 1.25, 0, 0); g.restore();
          const s = H / img.naturalHeight; g.save(); if (hasF) g.filter = f; g.drawImage(img, (W - img.naturalWidth * s) / 2, 0, img.naturalWidth * s, H); g.restore();
        } else { g.save(); if (hasF) g.filter = f; cover(g, img, W, H, 1, 0, 0); g.restore(); }
        drawText(g, W, H, $('st-top').value, 'top'); drawText(g, W, H, $('st-bottom').value, 'bottom');
        drawFrame(g, W, H);
      }
    }
    g.restore();
  }
  function dims() { return S.tool === 'pfp' ? FORMATS['1:1'] : FORMATS[S.fmt]; }
  function draw() {
    const [W, H] = dims(); if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; }
    render(ctx, W, H);
    cv.setAttribute('aria-label', S.tool === 'pfp' ? 'Astro profile picture preview' : 'Meme preview. Top: ' + clean($('st-top').value) + '. Bottom: ' + clean($('st-bottom').value));
  }
  const redraw = () => (document.fonts && document.fonts.load ? document.fonts.load(fontStr(40)).then(draw, draw) : draw());

  /* ---- sources ---- */
  img.onload = () => { msg(''); redraw(); };
  img.onerror = () => msg('That image could not be loaded.', true);
  function useAstro(id) {
    const a = data.find(x => x.id === +id); if (!a) return;
    $('st-astro').value = String(a.id); S.imgName = 'astro-' + a.id; if (S.objectUrl) { URL.revokeObjectURL(S.objectUrl); S.objectUrl = null; } img.src = a.image;
  }
  const sel = $('st-astro');
  data.slice().sort((a, b) => a.id - b.id).forEach(a => { const o = document.createElement('option'); o.value = String(a.id); o.textContent = a.name + ' · ' + a.tier; sel.append(o); });
  if (!data.length) { const o = document.createElement('option'); o.textContent = 'No Astros available'; sel.append(o); }
  sel.addEventListener('change', () => { $('st-file').value = ''; useAstro(sel.value); });
  window.addEventListener('astro:use', e => { useAstro(e.detail.id); document.querySelector('#tools [data-tool="meme"]').click(); });
  $('st-file').addEventListener('change', e => {
    const f = e.target.files && e.target.files[0]; if (!f) return;
    if (!OK_TYPES.includes(f.type)) { msg('Use a PNG, JPEG, WebP or GIF image.', true); e.target.value = ''; return; }
    if (f.size > MAX_UPLOAD) { msg('That file is over 12 MB. Pick a smaller image.', true); e.target.value = ''; return; }
    if (S.objectUrl) URL.revokeObjectURL(S.objectUrl);
    S.objectUrl = URL.createObjectURL(f); S.imgName = 'custom'; img.src = S.objectUrl;
  });

  /* ---- swatches / segmented ---- */
  function swatches(host, list, key) {
    list.forEach(it => {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'sw'; b.setAttribute('role', 'radio'); b.dataset.v = it.id; b.title = it.name; b.setAttribute('aria-label', it.name);
      b.style.setProperty('--sw', it.css); b.setAttribute('aria-checked', S[key] === it.id ? 'true' : 'false');
      b.addEventListener('click', () => { S[key] = it.id; document.querySelectorAll('#st-frames .sw, #st-styles .sw').forEach(x => { if (x.parentElement === host) x.setAttribute('aria-checked', x.dataset.v === it.id ? 'true' : 'false'); }); redraw(); });
      host.append(b);
    });
  }
  swatches($('st-frames'), FRAMES, 'frame'); swatches($('st-styles'), STYLES, 'style');
  $('st-format').querySelectorAll('button').forEach(b => b.addEventListener('click', () => { S.fmt = b.dataset.v; $('st-format').querySelectorAll('button').forEach(x => x.setAttribute('aria-checked', x === b ? 'true' : 'false')); redraw(); }));
  ['st-top', 'st-bottom', 'st-font', 'st-size', 'st-tcolor', 'st-upper', 'st-shape', 'st-zoom', 'st-ox', 'st-oy', 'st-badge'].forEach(id => $(id).addEventListener('input', redraw));

  /* ---- tools ---- */
  const tabs = [...document.querySelectorAll('#tools [data-tool]')];
  function setTool(t) {
    S.tool = t; tabs.forEach(b => b.setAttribute('aria-selected', b.dataset.tool === t ? 'true' : 'false'));
    const scene = t === 'scene'; $('stage-main').hidden = scene; $('controls').hidden = scene; $('scene-host').hidden = !scene;
    document.querySelectorAll('#controls .ctl').forEach(c => { c.hidden = !(c.classList.contains('always') || (c.dataset.for || '').split(' ').includes(t)); });
    if (!scene) redraw();
  }
  tabs.forEach(b => b.addEventListener('click', () => setTool(b.dataset.tool)));
  tabs.forEach((b, i) => b.addEventListener('keydown', e => { if (e.key === 'ArrowDown' || e.key === 'ArrowRight') { tabs[(i + 1) % tabs.length].focus(); e.preventDefault(); } if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') { tabs[(i + tabs.length - 1) % tabs.length].focus(); e.preventDefault(); } }));

  /* ---- export ---- */
  function exportBlob(cb) {
    const [W, H] = dims(), scale = +$('st-scale').value || 1, type = $('st-type').value === 'jpeg' ? 'image/jpeg' : 'image/png';
    const off = document.createElement('canvas'); off.width = Math.round(W * scale); off.height = Math.round(H * scale);
    const g = off.getContext('2d'); g.scale(scale, scale); render(g, W, H); off.toBlob(cb, type, 0.92);
  }
  $('st-download').addEventListener('click', () => {
    if (!img.naturalWidth) { msg('Pick an Astro or upload an image first.', true); return; }
    exportBlob(b => {
      if (!b) { msg('Export failed. Try a smaller size.', true); return; }
      const url = URL.createObjectURL(b), a = document.createElement('a'), ext = b.type === 'image/jpeg' ? 'jpg' : 'png';
      a.href = url; a.download = S.imgName + (S.tool === 'pfp' ? '-pfp.' : '-meme.') + ext; document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1500);
      msg('Saved. Free fan art: not an NFT.');
    });
  });
  $('st-share').addEventListener('click', () => {
    const t = [clean($('st-top').value), clean($('st-bottom').value)].filter(Boolean).join(' / ');
    window.open('https://x.com/intent/tweet?text=' + encodeURIComponent((t ? t + ' ' : '') + '#Astros #EventHorizon'), '_blank', 'noopener,noreferrer');
  });

  /* ---- boot ---- */
  setTool('meme');
  if (data.length) useAstro((data.find(a => a.tier === 'Common') || data[0]).id);
  window.__studio = { draw, state: S };
})();
