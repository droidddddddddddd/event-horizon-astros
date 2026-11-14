/* $ASTRO rank checker. Read-only: takes a pasted PUBLIC wallet address, asks public Solana RPC
   endpoints for that wallet's $ASTRO token account, and ranks it by how long ago the account
   first received tokens. No wallet connect, no signing, no keys, nothing is sent anywhere except
   standard read-only RPC calls. */
(function () {
  "use strict";
  var C = window.ASTRO_CONFIG || {};
  var CA = (C.ca || "").trim();
  var B58 = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
  var validCA = B58.test(CA);
  var $ = function (id) { return document.getElementById(id); };
  var isLocal = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
  var demoParam = isLocal ? new URLSearchParams(location.search).get("demo_rank") : null;
  var RANKS = (C.ranks || []).slice().sort(function (a, b) { return a.minDays - b.minDays; });
  var MIN = C.minBalance || 0;
  var TOKEN = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";
  var TOKEN22 = "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb";
  var ATA_PROG = "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL";

  /* ---------- base58 / PDA helpers ---------- */
  var ALPHA = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
  function b58decode(s) {
    var n = 0n, i;
    for (i = 0; i < s.length; i++) { var v = ALPHA.indexOf(s[i]); if (v < 0) throw new Error("bad base58"); n = n * 58n + BigInt(v); }
    var bytes = [];
    while (n > 0n) { bytes.unshift(Number(n & 255n)); n >>= 8n; }
    for (i = 0; i < s.length && s[i] === "1"; i++) bytes.unshift(0);
    return new Uint8Array(bytes);
  }
  function b58encode(b) {
    var n = 0n, i, out = "";
    for (i = 0; i < b.length; i++) n = n * 256n + BigInt(b[i]);
    while (n > 0n) { out = ALPHA[Number(n % 58n)] + out; n /= 58n; }
    for (i = 0; i < b.length && b[i] === 0; i++) out = "1" + out;
    return out;
  }
  var P = (1n << 255n) - 19n;
  function pw(b, e) { var r = 1n; b %= P; while (e > 0n) { if (e & 1n) r = r * b % P; b = b * b % P; e >>= 1n; } return r; }
  var D = (P - 121665n * pw(121666n, P - 2n) % P) % P;
  function onCurve(bytes) { // is this 32-byte string a valid ed25519 point? (PDAs must NOT be)
    var y = 0n, i;
    for (i = 31; i >= 0; i--) y = (y << 8n) | BigInt(i === 31 ? bytes[i] & 127 : bytes[i]);
    if (y >= P) return false;
    var y2 = y * y % P, u = (y2 - 1n + P) % P, v = (D * y2 + 1n) % P;
    var x2 = u * pw(v, P - 2n) % P;
    if (x2 === 0n) return true;
    return pw(x2, (P - 1n) / 2n) === 1n;
  }
  function concat(arrs) {
    var len = 0, o = 0; arrs.forEach(function (a) { len += a.length; });
    var r = new Uint8Array(len); arrs.forEach(function (a) { r.set(a, o); o += a.length; }); return r;
  }
  async function sha256(bytes) { return new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)); }
  async function deriveATA(owner, mint, tokenProg) {
    var seeds = concat([owner, b58decode(tokenProg), mint]), prog = b58decode(ATA_PROG);
    var tag = new TextEncoder().encode("ProgramDerivedAddress");
    for (var bump = 255; bump >= 0; bump--) {
      var h = await sha256(concat([seeds, new Uint8Array([bump]), prog, tag]));
      if (!onCurve(h)) return b58encode(h);
    }
    throw new Error("no ATA");
  }

  /* ---------- RPC with endpoint rotation + graceful rate-limit handling ---------- */
  var cool = {}, noMethod = {}, rpcId = 1;
  function eps() {
    var l = [];
    if (C.rpcProxy && /^https:\/\//.test(C.rpcProxy) || (isLocal && C.rpcProxy)) l.push(C.rpcProxy);
    (C.rpcEndpoints || []).forEach(function (e) { if (/^https:\/\//.test(e)) l.push(e); });
    return l;
  }
  function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  async function rpc(method, params) {
    var list = eps(), lastErr = null;
    if (!list.length) throw new Error("No RPC endpoint configured.");
    for (var round = 0; round < 2; round++) {
      var usable = list.filter(function (e) { return !(noMethod[e + method]) && !(cool[e] > Date.now()); });
      if (!usable.length) usable = list.filter(function (e) { return !(noMethod[e + method]); });
      for (var i = 0; i < usable.length; i++) {
        var ep = usable[i], ctl = new AbortController(), to = setTimeout(function () { ctl.abort(); }, 14000);
        try {
          var res = await fetch(ep, { method: "POST", headers: { "content-type": "application/json" }, signal: ctl.signal,
            body: JSON.stringify({ jsonrpc: "2.0", id: rpcId++, method: method, params: params }) });
          clearTimeout(to);
          if (res.status === 429 || res.status === 403 || res.status >= 500) { cool[ep] = Date.now() + 20000; lastErr = "busy"; continue; }
          var j = await res.json();
          if (j.error) {
            var msg = String(j.error.message || ""), code = j.error.code;
            if (code === 429 || code === -32005 || /too many|rate/i.test(msg)) { cool[ep] = Date.now() + 20000; lastErr = "busy"; continue; }
            if (/blocked|personal token|indexed|not available|upgrade/i.test(msg)) { noMethod[ep + method] = true; lastErr = "unsupported"; continue; }
            var e = new Error(msg); e.fatal = true; throw e;
          }
          return j.result;
        } catch (err) {
          clearTimeout(to);
          if (err && err.fatal) throw err;
          cool[ep] = Date.now() + 20000; lastErr = "network";
        }
      }
      await sleep(1500);
    }
    var e2 = new Error(lastErr === "unsupported" ? "These public endpoints don't support this lookup." : "The free public Solana RPC is busy or rate-limited right now.");
    e2.busy = true; throw e2;
  }

  /* ---------- core lookup ---------- */
  function tokAmt(t) { // some RPC nodes return uiAmount: null; fall back to uiAmountString / raw amount
    if (!t) return 0;
    if (t.uiAmountString != null && isFinite(Number(t.uiAmountString))) return Number(t.uiAmountString);
    if (t.uiAmount != null) return Number(t.uiAmount);
    return Number(t.amount || 0) / Math.pow(10, t.decimals || 0);
  }
  function fmtNum(n) { return n >= 1e9 ? (n / 1e9).toFixed(2) + "B" : n >= 1e6 ? (n / 1e6).toFixed(2) + "M" : n >= 1e3 ? (n / 1e3).toFixed(1) + "K" : String(Math.round(n * 100) / 100); }
  function rankFor(days) { var r = null; RANKS.forEach(function (x) { if (days >= x.minDays) r = x; }); return r; }
  function nextRank(days) { for (var i = 0; i < RANKS.length; i++) if (RANKS[i].minDays > days) return RANKS[i]; return null; }
  function human(ms) {
    var m = Math.floor(ms / 60000), h = Math.floor(m / 60), d = Math.floor(h / 24);
    if (d >= 2) return d + " days";
    if (h >= 2) return h + " hours";
    return Math.max(m, 1) + " minutes";
  }

  async function oldestBlockTime(acct, onProgress) {
    var before, pages = 0, oldest = null, capped = false, total = 0;
    var max = C.maxSigPages || 8;
    for (;;) {
      var opts = { limit: 1000 }; if (before) opts.before = before;
      var sigs = await rpc("getSignaturesForAddress", [acct, opts]);
      pages++; total += sigs.length;
      for (var i = sigs.length - 1; i >= 0; i--) { if (!sigs[i].err && sigs[i].blockTime) { oldest = sigs[i].blockTime; break; } }
      if (sigs.length < 1000) break;
      before = sigs[sigs.length - 1].signature;
      if (pages >= max) { capped = true; break; }
      onProgress && onProgress(total);
    }
    return { time: oldest, capped: capped };
  }

  async function lookup(addr, onStep) {
    var owner;
    try { owner = b58decode(addr); } catch (e) { owner = null; }
    if (!owner || owner.length !== 32) throw new Error("That doesn't look like a Solana wallet address.");
    onStep("Finding the $ASTRO token…");
    var mintAcc = await rpc("getAccountInfo", [CA, { encoding: "base64", dataSlice: { offset: 0, length: 0 } }]);
    if (!mintAcc || !mintAcc.value) throw new Error("The $ASTRO token wasn't found on-chain yet.");
    var prog = mintAcc.value.owner;
    onStep("Reading the wallet's balance…");
    var ata = await deriveATA(owner, b58decode(CA), prog);
    var ai = await rpc("getAccountInfo", [ata, { encoding: "jsonParsed" }]);
    var accounts = [], checkedOthers = true;
    if (ai && ai.value && ai.value.data && ai.value.data.parsed) {
      var info = ai.value.data.parsed.info;
      accounts.push({ pubkey: ata, amount: tokAmt(info.tokenAmount) });
    } else {
      // No standard account. Best-effort check for non-standard token accounts (not all public RPCs allow it).
      try {
        var r = await rpc("getTokenAccountsByOwner", [addr, { mint: CA }, { encoding: "jsonParsed" }]);
        (r.value || []).forEach(function (a) { accounts.push({ pubkey: a.pubkey, amount: tokAmt(a.account.data.parsed.info.tokenAmount) }); });
      } catch (e) { checkedOthers = false; }
    }
    var total = accounts.reduce(function (s, a) { return s + a.amount; }, 0);
    var out = { balance: total, accounts: accounts, checkedOthers: checkedOthers, first: null, capped: false };
    if (total <= 0) return out;
    onStep("Reading when it first arrived…");
    var best = null, capped = false;
    for (var i = 0; i < accounts.length; i++) {
      if (accounts[i].amount <= 0) continue;
      var o = await oldestBlockTime(accounts[i].pubkey, function (n) { onStep("Reading history… (" + n + " transactions so far)"); });
      if (o.time && (best === null || o.time < best)) best = o.time;
      capped = capped || o.capped;
    }
    out.first = best; out.capped = capped;
    return out;
  }

  /* ---------- UI ---------- */
  function publish(c) { // tell the crew section a rank was just verified (or cleared). Only the rank name leaves this file: never the wallet.
    var d = c ? { rank: c.rank, simulated: !!c.simulated } : null; window.__astroLastRank = d;
    try { window.dispatchEvent(new CustomEvent("astro:rank", { detail: d })); } catch (e) {}
  }
  var badgeImgs = {};
  function badgeImg(name) {
    var k = name.toLowerCase().replace(/\s+/g, "-");
    if (!badgeImgs[k]) badgeImgs[k] = new Promise(function (res) { var i = new Image(); i.onload = function () { res(i); }; i.onerror = function () { res(null); }; i.src = "assets/badges/" + k + ".webp"; });
    return badgeImgs[k];
  }
  var current = null; // {rank, days, since, wallet, balance, simulated, capped}
  function setStatus(t, bad) { var s = $("rkStatus"); s.textContent = t; s.className = "rk-status" + (bad ? " bad" : ""); s.hidden = !t; }

  function buildLadder() {
    var ul = $("rkLadder"); ul.textContent = "";
    RANKS.forEach(function (r) {
      var li = document.createElement("li");
      var b = document.createElement("b"); b.textContent = r.name;
      var sp = document.createElement("span"); sp.textContent = r.blurb;
      var bi = new Image(); bi.src = "assets/badges/" + r.name.toLowerCase().replace(/\s+/g, "-") + ".webp"; bi.alt = ""; bi.width = 72; bi.height = 72; bi.loading = "lazy";
      li.appendChild(bi); li.appendChild(b); li.appendChild(sp); ul.appendChild(li);
    });
  }

  function show(res, wallet, simulated) {
    var box = $("rkResult"); box.hidden = false;
    var days = res.first ? (Date.now() / 1000 - res.first) / 86400 : 0;
    var qualifies = res.balance >= MIN && res.first;
    var note = $("rkNote");
    if (!res.accounts.length || res.balance <= 0) {
      $("rkRank").textContent = "No $ASTRO found";
      $("rkSince").textContent = "This wallet doesn't hold any $ASTRO right now.";
      note.textContent = res.checkedOthers ? "" : "Couldn't double-check non-standard token accounts because the free RPC is limited. Standard accounts were checked.";
      $("rkCardWrap").hidden = true; current = null; publish(null); return;
    }
    if (res.balance >= MIN && !res.first) {
      $("rkRank").textContent = "Couldn't read the history";
      $("rkSince").textContent = "Balance " + fmtNum(res.balance) + " $ASTRO, but the free RPC didn't return when it first arrived. Try again in a minute.";
      note.textContent = ""; $("rkCardWrap").hidden = true; current = null; publish(null); return;
    }
    if (!qualifies) {
      $("rkRank").textContent = "Below the minimum";
      $("rkSince").textContent = "Balance " + fmtNum(res.balance) + " $ASTRO. A rank needs at least " + fmtNum(MIN) + ".";
      note.textContent = ""; $("rkCardWrap").hidden = true; current = null; publish(null); return;
    }
    var r = rankFor(days), nx = nextRank(days);
    var since = new Date(res.first * 1000);
    $("rkRank").textContent = r.name;
    $("rkSince").textContent = "First received " + since.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }) +
      " · " + (res.capped ? "at least " : "") + human(Date.now() - since.getTime()) + " ago";
    var extra = nx ? "Next rank: " + nx.name + " in " + human(nx.minDays * 86400000 - (Date.now() - since.getTime())) + ". " : "Top rank reached. ";
    note.textContent = extra + (res.capped ? "This wallet's history is long, so the time shown is a minimum. " : "") +
      "Time is measured from the first arrival in this token account, so selling everything and buying back isn't detected. Free public RPCs may not keep very old history.";
    $("rkBal").textContent = fmtNum(res.balance) + " $ASTRO";
    current = { rank: r.name, blurb: r.blurb, days: days, since: since, wallet: wallet, balance: res.balance, simulated: !!simulated, capped: res.capped };
    $("rkCardWrap").hidden = false; drawCard(); publish(current);
  }

  async function onCheck(ev) {
    ev.preventDefault();
    var addr = $("rkAddr").value.trim();
    var btn = $("rkGo");
    $("rkResult").hidden = true; publish(null);
    if (!B58.test(addr)) { setStatus("Paste a Solana wallet address (32–44 letters and numbers). Never paste a seed phrase or private key here.", true); return; }
    if (addr.split(/\s+/).length > 1) { setStatus("That looks like more than an address. This tool only needs a public wallet address.", true); return; }
    btn.disabled = true; setStatus("Starting…");
    try {
      var res = await lookup(addr, function (m) { setStatus(m); });
      setStatus(""); show(res, addr, false);
    } catch (e) {
      setStatus(e.busy ? e.message + " Wait a minute and try again, or it may need a dedicated RPC (see the project notes)." : (e.message || "Something went wrong."), true);
    } finally { btn.disabled = false; }
  }

  /* ---------- share card (canvas PNG) ---------- */
  var plate = new Image(); plate.src = "assets/plate.webp";
  var plateReady = new Promise(function (res) { plate.onload = res; plate.onerror = res; });
  function fontsReady() { return document.fonts && document.fonts.load ? document.fonts.load('700 60px "Oxanium"') : Promise.resolve(); }
  async function drawCard() {
    if (!current) return;
    var bimg = await badgeImg(current.rank);
    await Promise.all([plateReady, fontsReady()]);
    if (!current) return;
    var cv = $("rkCanvas"), g = cv.getContext("2d"), W = 1200, H = 630;
    g.clearRect(0, 0, W, H);
    g.fillStyle = "#030202"; g.fillRect(0, 0, W, H);
    // plate on the right
    var s = 820; g.drawImage(plate, W - s + 90, (H - s) / 2 + 20, s, s);
    var gr = g.createLinearGradient(0, 0, W, 0); gr.addColorStop(0, "rgba(3,2,2,1)"); gr.addColorStop(.45, "rgba(3,2,2,.92)"); gr.addColorStop(.75, "rgba(3,2,2,.0)");
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
    // machined metal frame: steel gradient edge, inner amber line, corner rivets
    var mg = g.createLinearGradient(0, 0, W, H); mg.addColorStop(0, "#c9ccd2"); mg.addColorStop(.25, "#4a4c52"); mg.addColorStop(.5, "#e9ebef"); mg.addColorStop(.75, "#4a4c52"); mg.addColorStop(1, "#b9bcc2");
    g.lineWidth = 14; g.strokeStyle = mg; g.strokeRect(10, 10, W - 20, H - 20);
    g.lineWidth = 2; g.strokeStyle = "rgba(0,0,0,.7)"; g.strokeRect(3, 3, W - 6, H - 6); g.strokeRect(17, 17, W - 34, H - 34);
    g.lineWidth = 3; g.strokeStyle = "rgba(255,176,64,.7)"; g.strokeRect(24, 24, W - 48, H - 48);
    [[10, 10], [W - 10, 10], [10, H - 10], [W - 10, H - 10]].forEach(function (p) { var rg = g.createRadialGradient(p[0] - 2, p[1] - 2, 0, p[0], p[1], 9); rg.addColorStop(0, "#fff"); rg.addColorStop(.4, "#9a9ca2"); rg.addColorStop(1, "#18191c"); g.fillStyle = rg; g.beginPath(); g.arc(p[0], p[1], 9, 0, 7); g.fill(); });
    var F = '"Oxanium", ui-sans-serif, system-ui, sans-serif';
    g.textBaseline = "alphabetic";
    g.fillStyle = "#ffb040"; g.font = "700 34px " + F; g.fillText("$ASTRO", 70, 98);
    g.fillStyle = "#b9a58b"; g.font = "600 22px " + F; g.fillText("CREW RANK", 70, 190);
    var name = current.rank.toUpperCase(), fs = 120;
    g.font = "800 " + fs + "px " + F;
    while (g.measureText(name).width > 640 && fs > 50) { fs -= 4; g.font = "800 " + fs + "px " + F; }
    var tg = g.createLinearGradient(70, 0, 70 + g.measureText(name).width, 0); tg.addColorStop(0, "#fff4e1"); tg.addColorStop(.5, "#ffb040"); tg.addColorStop(1, "#ff7a1a");
    g.fillStyle = tg; g.fillText(name, 70, 190 + fs * .95);
    var y = 190 + fs * .95 + 58;
    g.fillStyle = "#fff4e1"; g.font = "600 30px " + F;
    var days = current.days, held = days >= 2 ? Math.floor(days) + " days" : (days * 24 >= 2 ? Math.floor(days * 24) + " hours" : "under 2 hours");
    g.fillText("Held " + (current.capped ? "at least " : "") + held, 70, y);
    g.fillStyle = "#b9a58b"; g.font = "400 22px " + F;
    g.fillText("Since " + current.since.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }), 70, y + 38);
    var call = ($("rkCall").value || "").trim().slice(0, 24), lines = [];
    if (call) lines.push("Callsign: " + call);
    if ($("rkShowW").checked) lines.push(current.wallet.slice(0, 4) + "…" + current.wallet.slice(-4));
    if ($("rkShowB").checked) lines.push(fmtNum(current.balance) + " $ASTRO");
    g.fillStyle = "#ffd9a8"; g.font = "600 24px " + F;
    lines.forEach(function (l, i) { g.fillText(l, 70, y + 90 + i * 34); });
    if (bimg) { g.save(); g.shadowColor = "rgba(0,0,0,.7)"; g.shadowBlur = 24; g.drawImage(bimg, W - 300, 250, 250, 250); g.restore(); }
    g.fillStyle = "#8a7a66"; g.font = "400 19px " + F;
    g.fillText("Past the point of no return.  Meme coin. Not financial advice.", 70, H - 48);
    if (current.simulated) {
      g.save(); g.translate(W / 2, H / 2); g.rotate(-.22); g.fillStyle = "rgba(255,255,255,.22)"; g.font = "800 120px " + F; g.textAlign = "center";
      g.fillText("SIMULATED", 0, 40); g.restore();
    }
  }
  function download() {
    if (!current) return;
    $("rkCanvas").toBlob(function (b) {
      var a = document.createElement("a"); a.href = URL.createObjectURL(b);
      a.download = "astro-rank-" + current.rank.toLowerCase().replace(/\s+/g, "-") + (current.simulated ? "-SIMULATED" : "") + ".png";
      document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000);
    }, "image/png");
  }
  function copyCaption() {
    if (!current) return;
    var t = "Crew rank: " + current.rank + " on $ASTRO. Past the point of no return. Meme coin, not financial advice.";
    var b = $("rkCopy");
    function ok() { b.textContent = "Copied"; setTimeout(function () { b.textContent = "Copy caption"; }, 1500); }
    if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(t).then(ok, function () {}); else { var ta = document.createElement("textarea"); ta.value = t; document.body.appendChild(ta); ta.select(); try { document.execCommand("copy"); ok(); } catch (e) {} ta.remove(); }
  }

  function start() {
    if (!$("rank")) return;
    buildLadder();
    var form = $("rkForm");
    if (demoParam != null) {
      $("rkDemo").hidden = false; $("rkNoCA").hidden = true;
      var idx = isNaN(+demoParam) ? RANKS.findIndex(function (r) { return r.name.toLowerCase() === demoParam.toLowerCase(); }) : +demoParam;
      if (idx < 0 || idx >= RANKS.length) idx = 1;
      var days = Math.max(RANKS[idx].minDays + .4, .3);
      $("rkAddr").value = "DemoWa11etDemoWa11etDemoWa11etDemoWa11e1";
      $("rkAddr").disabled = true; $("rkGo").disabled = true;
      show({ balance: 250000, accounts: [{}], first: Date.now() / 1000 - days * 86400, capped: false, checkedOthers: true }, "DemoWa11etDemoWa11etDemoWa11etDemoWa11e1", true);
    } else if (!validCA) {
      $("rkNoCA").hidden = false; $("rkAddr").disabled = true; $("rkGo").disabled = true;
    } else {
      form.addEventListener("submit", onCheck);
    }
    ["rkCall", "rkShowW", "rkShowB"].forEach(function (id) { $(id).addEventListener("input", drawCard); });
    $("rkDl").addEventListener("click", download);
    $("rkCopy").addEventListener("click", copyCaption);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();

  // tiny test hook (used by tests only; read-only helpers)
  window.__astroRank = { deriveATA: deriveATA, b58decode: b58decode, lookup: lookup };
})();
