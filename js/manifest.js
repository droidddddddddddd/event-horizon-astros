/* Crew Manifest: read-only list of approved crew from Mission Control (GET /crew). Recognition only. */
(function () {
  'use strict';
  var API = 'https://astros-mission-control.onrender.com';
  var root = document.getElementById('manifest');
  if (!root) return;
  var grid = document.getElementById('mf-grid'), status = document.getElementById('mf-status'), retry = document.getElementById('mf-retry');
  var count = document.getElementById('mf-count'), bar = document.getElementById('mf-bar'), total = document.getElementById('mf-total'), post = document.getElementById('mf-post');
  var tries = 0, timer = null, loading = false;

  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function safeCard(u) { return typeof u === 'string' && u.indexOf(API + '/crew/card/') === 0 ? u : null; }

  function card(m) {
    var f = el('figure', 'mf-card' + (m.founder ? ' founder' : '') + (m.founding ? ' founding' : '')); f.setAttribute('role', 'listitem');
    var src = safeCard(m.card_url);
    if (src) {
      var img = new Image(); img.loading = 'lazy'; img.decoding = 'async'; img.width = 1200; img.height = 675; img.src = src;
      img.alt = 'Crew card ' + m.id + ': ' + m.name + ', ' + m.role + ', rank ' + m.rank;
      f.appendChild(img);
    }
    var cap = el('figcaption');
    var top = el('div', 'mf-top'); top.appendChild(el('b', 'mf-no', m.id));
    if (m.founder) top.appendChild(el('span', 'mf-tag', 'Founder · example card'));
    else if (m.founding) top.appendChild(el('span', 'mf-tag', 'Founding 100'));
    cap.appendChild(top);
    cap.appendChild(el('span', 'mf-name', m.name + (m.handle ? ' · ' + m.handle : '')));
    cap.appendChild(el('span', 'mf-meta', m.role + ' · ' + m.rank + (m.founder ? '' : ' · enlisted ' + m.enlisted)));
    f.appendChild(cap);
    return f;
  }

  function render(d) {
    var crew = Array.isArray(d.crew) ? d.crew : [];
    var limit = d.founding_limit || 100, n = Math.max(0, Math.min(limit, d.founding_count || 0));
    count.textContent = n; bar.style.width = (100 * n / limit) + '%'; bar.parentNode.setAttribute('aria-valuenow', String(n));
    total.textContent = (d.total || 0) === 1 ? '1 crew member enlisted' : (d.total || 0) + ' crew members enlisted';
    if (d.manifest_post && /^https:\/\/x\.com\/AstrosOnSol\/status\/\d+$/.test(d.manifest_post)) post.href = d.manifest_post;
    grid.textContent = '';
    crew.forEach(function (m) { grid.appendChild(card(m)); });
    status.textContent = (d.total || 0) ? 'Manifest synced with Mission Control.' : 'The manifest is open. No recruits approved yet: the first 100 become the Founding 100.';
    retry.hidden = true; root.setAttribute('data-state', 'ready');
  }

  function fail() {
    tries++;
    root.setAttribute('data-state', 'waking');
    status.textContent = 'Mission Control is waking up (it sleeps when idle and can take about a minute). ' + (tries < 5 ? 'Retrying automatically…' : 'Try again in a moment.');
    retry.hidden = false;
    if (tries < 5) { clearTimeout(timer); timer = setTimeout(load, 12000 + tries * 4000); }
  }

  function load() {
    if (loading) return; loading = true;
    status.textContent = tries ? 'Contacting Mission Control again…' : 'Contacting Mission Control…';
    var ctl = 'AbortController' in window ? new AbortController() : null, t = setTimeout(function () { if (ctl) ctl.abort(); }, 20000);
    fetch(API + '/crew', { mode: 'cors', credentials: 'omit', cache: 'no-store', signal: ctl ? ctl.signal : undefined })
      .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .then(render).catch(fail)
      .then(function () { clearTimeout(t); loading = false; });
  }

  retry.addEventListener('click', function () { tries = 0; clearTimeout(timer); load(); });
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (es) { if (es.some(function (e) { return e.isIntersecting; })) { io.disconnect(); load(); } }, { rootMargin: '600px' });
    io.observe(root);
  } else load();
  if (location.hash === '#manifest') load();
})();
