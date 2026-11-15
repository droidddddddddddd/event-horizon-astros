/* Home hero: shows a random APPROVED Astro (real collection art, backdrop cut out) in front of the black-hole scene.
   GENERATED POOL: edit data via tools/build_hero_pool.py, not by hand. Runs synchronously right after #heroAstro so the image request
   starts at parse time (no waiting for deferred scripts); the box has a fixed aspect-ratio so there is no layout shift.
   Fallback without JS: the <noscript> figure (Astro #1). Never repeats the previous pick within a browser session when it can help. */
(function () {
  'use strict';
  var POOL = /*POOL*/[]/*END*/;
  var fig = document.getElementById('heroAstro'); if (!fig || !POOL.length) return;
  var KEY = 'eh_hero_last', last = -1;
  try { last = parseInt(sessionStorage.getItem(KEY), 10); } catch (e) {}
  var choices = POOL.filter(function (p) { return p.i !== last; }); if (!choices.length) choices = POOL;
  var pick = choices[Math.floor(Math.random() * choices.length)];
  try { sessionStorage.setItem(KEY, String(pick.i)); } catch (e) {}
  var base = 'assets/hero/' + pick.i, img = new Image();
  img.className = 'hero-astro-img'; img.width = 768; img.height = 768; img.decoding = 'async'; img.setAttribute('fetchpriority', 'high');
  img.sizes = '(max-width: 700px) 80vw, 600px'; img.srcset = base + '-384.webp 384w, ' + base + '-768.webp 768w'; img.src = base + '-768.webp';
  var label = 'Astro #' + pick.i + ' · ' + pick.t + (pick.n ? ' · ' + pick.n : '');
  img.alt = label + ': a real Astro from the collection';
  function ready() { fig.classList.add('is-ready'); }
  img.onload = ready;
  img.onerror = function () { if (img.dataset.fb) return; img.dataset.fb = '1'; img.removeAttribute('srcset'); img.src = 'assets/hero/1-768.webp'; img.alt = 'Astro #1 · Legendary · The Original'; cap.textContent = 'ASTRO #1 · LEGENDARY · THE ORIGINAL'; };
  var cap = document.createElement('figcaption'); cap.className = 'hero-astro-cap'; cap.textContent = label.toUpperCase();
  fig.appendChild(img); fig.appendChild(cap);
  if (img.complete && img.naturalWidth) ready();
})();
