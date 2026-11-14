(function () {
  "use strict";
  var C = window.ASTRO_CONFIG || {};
  var CA = (C.ca || "").trim();
  var B58 = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
  var validCA = B58.test(CA);
  var $ = function (id) { return document.getElementById(id); };
  var chapters = [];
  var isLocal = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
  var demo = null;
  if (isLocal) {
    var q = new URLSearchParams(location.search).get("demo_mcap");
    if (q && !isNaN(+q)) demo = +q;
  }

  function usd(n, d) {
    if (n == null || !isFinite(n)) return "—";
    var a = Math.abs(n);
    if (a >= 1e9) return "$" + (n / 1e9).toFixed(2) + "B";
    if (a >= 1e6) return "$" + (n / 1e6).toFixed(a >= 1e7 ? 1 : 2) + "M";
    if (a >= 1e3) return "$" + (n / 1e3).toFixed(a >= 1e5 ? 0 : 1) + "K";
    return "$" + n.toFixed(d == null ? 0 : d);
  }
  function usdShort(n) { return usd(n).replace(/\.0+(?=[KMB]$)/, "").replace(/(\.\d*?)0+(?=[KMB]$)/, "$1"); }
  function price(p) {
    p = +p; if (!isFinite(p)) return "—";
    if (p >= 1) return "$" + p.toFixed(2);
    if (p >= 0.01) return "$" + p.toFixed(4);
    return "$" + p.toPrecision(3).replace(/e-(\d+)/, function (_, e) { return "e-" + e; });
  }
  function setLink(el, href) {
    if (href) { el.href = href; el.target = "_blank"; el.rel = "noopener noreferrer"; el.removeAttribute("aria-disabled"); }
    else { el.removeAttribute("href"); el.setAttribute("aria-disabled", "true"); }
  }

  // ---- CA, buy links, socials ----
  function initCA() {
    var box = $("caBox");
    if (validCA) {
      $("caValue").textContent = CA;
      box.classList.remove("empty");
      $("copyBtn").disabled = false;
      $("statusText").textContent = "Live on Solana";
      $("statusDot").classList.add("live");
      $("caNote").textContent = "Always check this address against the official X account before you do anything. Nobody from the project will DM you first.";
      setLink($("buyPump"), "https://pump.fun/coin/" + CA);
      setLink($("buyJup"), "https://jup.ag/swap/SOL-" + CA);
      setLink($("buyDex"), "https://dexscreener.com/solana/" + CA);
    } else {
      box.classList.add("empty");
      if (CA) $("caNote").textContent = "The configured address isn't a valid Solana address, so links are switched off.";
    }
    $("copyBtn").addEventListener("click", function () {
      var b = this;
      function ok() { b.textContent = "Copied"; b.classList.add("done"); setTimeout(function () { b.textContent = "Copy"; b.classList.remove("done"); }, 1600); }
      if (navigator.clipboard && window.isSecureContext) { navigator.clipboard.writeText(CA).then(ok, fallback); } else fallback();
      function fallback() {
        var t = document.createElement("textarea"); t.value = CA; t.style.position = "fixed"; t.style.opacity = "0";
        document.body.appendChild(t); t.select(); try { document.execCommand("copy"); ok(); } catch (e) {} document.body.removeChild(t);
      }
    });
    var s = C.socials || {};
    document.querySelectorAll(".soc").forEach(function (a) {
      var v = (s[a.getAttribute("data-k")] || "").trim();
      if (/^https:\/\//i.test(v)) { setLink(a, v); a.querySelector("small").textContent = "Official ↗"; }
    });
  }

  // ---- chapters + meter ----
  var scaleMin = 1000, scaleMax = 1e7, horizonMc = null;
  function pos(v) {
    if (!(v > scaleMin)) return 0;
    return Math.max(0, Math.min(1, (Math.log10(v) - Math.log10(scaleMin)) / (Math.log10(scaleMax) - Math.log10(scaleMin))));
  }
  function buildMeter() {
    var maxT = 0;
    chapters.forEach(function (c) { if (c.threshold > maxT) maxT = c.threshold; if (c.horizon) horizonMc = c.threshold; });
    if (maxT > scaleMin) scaleMax = maxT;
    var ticks = $("ticks"), labels = $("tickLabels"), n = 0;
    chapters.forEach(function (c) {
      if (c.threshold <= scaleMin) return;
      var left = (pos(c.threshold) * 100).toFixed(2) + "%";
      var i = document.createElement("i"); i.style.left = left; i.dataset.t = c.threshold; if (c.horizon) i.className = "hz"; ticks.appendChild(i);
      var s = document.createElement("span"); s.style.left = left; s.textContent = usdShort(c.threshold) + (c.horizon ? " · horizon" : ""); if (c.horizon) s.className = "hz"; labels.appendChild(s); n++;
    });
  }
  function nextChapter(mc) {
    for (var i = 0; i < chapters.length; i++) if (chapters[i].threshold > mc) return chapters[i];
    return null;
  }
  function renderChapters(mc) {
    var ol = $("chapters"); ol.textContent = "";
    chapters.forEach(function (c) {
      var open = c.threshold === 0 || (mc != null && mc >= c.threshold);
      var li = document.createElement("li");
      li.className = "chapter " + (open ? "unlocked" : "locked") + (c.horizon ? " hzc" : "");
      var hd = document.createElement("div"); hd.className = "hd";
      var l = document.createElement("div");
      var no = document.createElement("div"); no.className = "no"; no.textContent = "LOG " + c.id;
      var h = document.createElement("h3"); h.textContent = c.title;
      l.appendChild(no); l.appendChild(h);
      var th = document.createElement("div"); th.className = "th";
      th.textContent = c.threshold === 0 ? "Unlocked at launch" : (open ? "Unlocked · " : "Locked · unlocks at ") + usdShort(c.threshold) + " market cap";
      hd.appendChild(l); hd.appendChild(th);
      var p = document.createElement("p");
      p.textContent = open ? c.text : "Transmission sealed. The signal arrives when the chart does.";
      li.appendChild(hd); li.appendChild(p); ol.appendChild(li);
    });
  }
  function renderMeter(mc) {
    var track = $("track"), fill = $("fill"), astro = $("astro");
    if (mc == null) {
      fill.style.width = "0"; astro.classList.remove("on");
      $("mMcap").textContent = "—"; $("mDist").textContent = "—"; $("mNext").textContent = "—";
      track.setAttribute("aria-valuenow", "0");
      renderChapters(null); return;
    }
    var pct = pos(mc) * 100;
    fill.style.width = pct.toFixed(2) + "%"; astro.style.left = pct.toFixed(2) + "%"; astro.classList.add("on");
    track.setAttribute("aria-valuenow", Math.round(pct));
    document.querySelectorAll("#ticks i").forEach(function (i) { i.classList.toggle("hit", mc >= +i.dataset.t); });
    $("mMcap").textContent = usd(mc);
    if (horizonMc != null) $("mDist").textContent = mc >= horizonMc ? "Crossed" : usd(horizonMc - mc) + " to go";
    var nx = nextChapter(mc);
    $("mNext").textContent = nx ? usdShort(nx.threshold) + " · Log " + nx.id : "All logs unlocked";
    renderChapters(mc);
  }

  // ---- DexScreener ----
  function status(msg) { $("meterSub").textContent = msg; }
  function pickPair(pairs) {
    var best = null;
    (pairs || []).forEach(function (p) {
      if (!p || p.chainId !== "solana" || !p.baseToken || p.baseToken.address !== CA) return;
      var liq = (p.liquidity && p.liquidity.usd) || 0;
      if (!best || liq > ((best.liquidity && best.liquidity.usd) || 0)) best = p;
    });
    return best;
  }
  function showLive(mc, pair) {
    renderMeter(mc);
    var row = $("liveRow");
    if (pair) {
      row.hidden = false;
      $("mPrice").textContent = price(pair.priceUsd);
      var ch = pair.priceChange && pair.priceChange.h24;
      $("m24").textContent = ch == null ? "—" : (ch > 0 ? "+" : "") + ch + "%";
      $("mLiq").textContent = pair.liquidity && pair.liquidity.usd != null ? usd(pair.liquidity.usd) : "—";
      setLink($("mSrc"), pair.url || ("https://dexscreener.com/solana/" + CA));
    }
  }
  function poll() {
    if (demo != null) { showLive(demo, null); status("Demo mode on localhost: this market cap is simulated."); return; }
    fetch("https://api.dexscreener.com/latest/dex/tokens/" + CA, { cache: "no-store" })
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function (d) {
        var pair = pickPair(d && d.pairs);
        if (!pair) { renderMeter(null); $("liveRow").hidden = true; status("No trading pair found for this address yet. The meter starts as soon as DexScreener lists one."); return; }
        var mc = pair.marketCap != null ? +pair.marketCap : (pair.fdv != null ? +pair.fdv : null);
        if (mc == null || !isFinite(mc)) { renderMeter(null); status("DexScreener lists a pair but no market cap yet."); return; }
        status("Live market cap from DexScreener, refreshed every " + (C.refreshSeconds || 30) + " seconds.");
        showLive(mc, pair);
      })
      .catch(function () { status("Signal lost. Couldn't reach DexScreener, retrying shortly."); });
  }

  function start() {
    initCA();
    if (demo != null) $("demoBanner").hidden = false;
    fetch(C.lore || "data/lore.json", { cache: "no-cache" }).then(function (r) { return r.json(); }).then(function (j) {
      chapters = (j.chapters || []).slice().sort(function (a, b) { return a.threshold - b.threshold; });
      buildMeter(); renderMeter(null);
      if (validCA) {
        poll();
        var t = setInterval(function () { if (!document.hidden) poll(); }, Math.max(15, C.refreshSeconds || 30) * 1000);
      } else {
        status("Launching soon. The meter switches on the moment the contract address is set. No market data is shown until then.");
        if (demo != null) { poll(); }
      }
    }).catch(function () { $("chapters").textContent = "Couldn't load the mission log."; });
  }
  start();
})();
