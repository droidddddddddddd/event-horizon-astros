/* Crew perks: rank-gated, cosmetic, SOFT-gated in the browser. A rank is "verified" only in the sense that the rank checker
   just read a pasted public address (no wallet connect, no signature). Only the rank NAME is kept (sessionStorage, 6 h): never the wallet.
   See docs/BADGES_PLAN.md for what would be needed for hard gating. */
(function () {
  "use strict";
  var C = window.ASTRO_CONFIG || {}, $ = function (id) { return document.getElementById(id); };
  if (!$("crew")) return;
  var RANKS = (C.ranks || []).slice().sort(function (a, b) { return a.minDays - b.minDays; }), NAMES = RANKS.map(function (r) { return r.name; });
  var isLocal = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
  var demo = isLocal && new URLSearchParams(location.search).get("demo_rank") != null;
  var KEY = "astro.crew.v1", TTL = 6 * 3600 * 1000;
  var state = window.AstroCrew = { rank: null, level: -1, simulated: false };
  var lore = null, loreP = null;
  function lvl(name) { return NAMES.indexOf(name); }
  function slug(n) { return n.toLowerCase().replace(/\s+/g, "-"); }
  function el(t, c, x) { var e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; }
  function lockLabel(node, text, locked) { if (locked) { var i = document.createElement("span"); i.className = "lock-ico"; i.setAttribute("aria-hidden", "true"); node.appendChild(i); } node.appendChild(document.createTextNode(text)); return node; }
  function can(minRank) { return state.level >= lvl(minRank); }

  function setRank(name, sim) {
    state.rank = name && lvl(name) >= 0 ? name : null; state.level = state.rank ? lvl(state.rank) : -1; state.simulated = !!sim && !!state.rank;
    try { if (state.rank && !state.simulated) sessionStorage.setItem(KEY, JSON.stringify({ rank: state.rank, t: Date.now() })); else if (!state.rank) sessionStorage.removeItem(KEY); } catch (e) {}
    render(); window.dispatchEvent(new CustomEvent("astro:crew", { detail: { rank: state.rank } }));
  }
  function getLore() { if (!loreP) loreP = fetch(C.crewLore || "data/crew-lore.json").then(function (r) { return r.json(); }).then(function (j) { lore = j; return j; }).catch(function () { return { early: [], classified: [] }; }); return loreP; }

  function perkRows() {
    var t = $("crewPerks"); t.textContent = "";
    (C.perks || []).forEach(function (p) {
      var ok = can(p.minRank) && !p.planned, row = el("div", "perk-row" + (ok ? " on" : ""));
      row.setAttribute("role", "row");
      var c1 = el("div", "pn", p.name + (p.note ? " (" + p.note + ")" : "")), c2 = el("div", "pr", p.minRank + "+"), c3 = lockLabel(el("div", "ps"), p.planned ? "Planned" : ok ? "Unlocked" : (state.level < 0 ? "Check rank" : "Locked"), !p.planned && !ok && state.level >= 0);
      [c1, c2, c3].forEach(function (c) { c.setAttribute("role", "cell"); row.appendChild(c); });
      t.appendChild(row);
    });
  }
  function badges() {
    var b = $("crewBadges"); b.textContent = "";
    NAMES.forEach(function (n, i) {
      var f = el("figure", "badge" + (state.level >= i ? "" : " locked")), im = new Image(); im.src = "assets/badges/" + slug(n) + ".webp"; im.alt = n + " badge"; im.width = 120; im.height = 120; im.loading = "lazy";
      f.appendChild(im); f.appendChild(lockLabel(el("figcaption"), n, state.level < i)); b.appendChild(f);
    });
    [["log-003", "Log 003"], ["log-004", "Log 004"], ["log-005", "Log 005"]].forEach(function (m) {
      var f = el("figure", "badge planned"), im = new Image(); im.src = "assets/badges/" + m[0] + ".webp"; im.alt = m[1] + " milestone badge (planned)"; im.width = 120; im.height = 120; im.loading = "lazy";
      f.appendChild(im); f.appendChild(el("figcaption", null, m[1] + " · planned")); b.appendChild(f);
    });
  }
  function loreBox(box, kind, perkId, head, lockedMsg) {
    var perk = (C.perks || []).filter(function (p) { return p.id === perkId; })[0], min = perk ? perk.minRank : NAMES[NAMES.length - 1];
    box.textContent = ""; box.appendChild(el("h4", null, head));
    if (!can(min)) { box.classList.add("locked"); box.appendChild(lockLabel(el("p", "lk"), lockedMsg + " Needs rank: " + min + ".", true)); return; }
    box.classList.remove("locked");
    getLore().then(function (j) {
      (j[kind] || []).forEach(function (e) { if (!can(e.minRank)) return; var d = el("article", "lore-entry"); d.appendChild(el("b", null, e.title)); d.appendChild(el("p", null, e.text)); box.appendChild(d); });
      if (state.simulated) box.appendChild(el("p", "fine", "(Shown because of the demo rank.)"));
    });
  }
  function wall() {
    var w = $("crewWall"); w.textContent = "";
    var srcs = [C.crewWall || "data/crew.json"]; if (demo) srcs.push("data/crew-demo.json");
    Promise.all(srcs.map(function (s) { return fetch(s).then(function (r) { return r.json(); }).catch(function () { return { entries: [] }; }); })).then(function (all) {
      var list = []; all.forEach(function (j) { (j.entries || []).forEach(function (e) { if (e && typeof e.callsign === "string") list.push(e); }); });
      if (!list.length) { w.appendChild(el("p", "fine", "No one is on the wall yet. It fills up as crew members ask to be added.")); return; }
      list.forEach(function (e) { var c = el("div", "wall-chip"); c.appendChild(el("b", null, e.callsign.slice(0, 24))); c.appendChild(el("span", null, e.rank)); w.appendChild(c); });
    });
  }
  function status() {
    var s = $("crewStatus");
    s.textContent = state.rank ? "Verified rank this session: " + state.rank + (state.simulated ? " (demo, simulated)" : "") + ". Unlocked perks are lit below." : "Check your rank above to see what you can unlock.";
  }
  function form() {
    var f = $("crewForm"); f.hidden = !can("Navigator") || state.level < 0;
  }
  function render() { status(); perkRows(); badges(); loreBox($("crewEarly"), "early", "early", "Early transmissions", "Bonus lore for the crew near the edge."); loreBox($("crewClassified"), "classified", "classified", "Classified log", "Singularity crew only."); form(); }

  window.addEventListener("astro:rank", function (e) { var d = e.detail; setRank(d && d.rank, d && d.simulated); });
  $("crewForm").addEventListener("submit", function (ev) {
    ev.preventDefault();
    var name = $("crewCall").value.trim(), out = $("crewOut");
    if (!/^[A-Za-z0-9 _.-]{2,24}$/.test(name)) { out.textContent = "Use 2 to 24 letters, numbers, spaces, dots, dashes or underscores."; return; }
    if (!$("crewOk").checked) { out.textContent = "Tick the box to confirm you want a public entry."; return; }
    var t = "Crew wall entry: " + name + " · " + state.rank + (state.simulated ? " (DEMO)" : "");
    out.textContent = t + "  — Nothing was sent. When the crew has a place to post, you'd send this line yourself (and your public address privately, so the team can check the rank). Your wallet is never shown on the wall.";
    if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(t).catch(function () {});
  });
  if (demo) $("crewDemo").hidden = false;
  var boot = window.__astroLastRank, saved = null;
  try { saved = JSON.parse(sessionStorage.getItem(KEY) || "null"); } catch (e) {}
  if (boot && boot.rank) setRank(boot.rank, boot.simulated);
  else if (saved && saved.rank && Date.now() - saved.t < TTL && lvl(saved.rank) >= 0) setRank(saved.rank, false);
  else render();
  wall();
  window.AstroCrew.can = can;
})();
