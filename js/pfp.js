/* $ASTRO PFP generator. Everything happens in this browser tab with <canvas>.
   Photos you pick are never uploaded anywhere: they're decoded locally and drawn onto the canvas. */
(function () {
  "use strict";
  var $ = function (id) { return document.getElementById(id); };
  if (!$("pfpCanvas")) return;
  var S = 1024;
  var cv = $("pfpCanvas"), g = cv.getContext("2d");
  var plate = new Image(), orig = new Image();
  plate.src = "assets/plate.webp"; orig.src = "assets/pfp.webp";
  var loaded = Promise.all([plate, orig].map(function (i) { return new Promise(function (r) { i.onload = r; i.onerror = r; }); }));
  var F = '"Oxanium", ui-sans-serif, system-ui, sans-serif';

  var PRESETS = [
    { id: "original", label: "Original", kind: "original" },
    { id: "void",  label: "Blank visor", kind: "blank", glass: ["#10131a", "#000000"], eyes: false },
    { id: "eyes",  label: "Glowing eyes", kind: "blank", glass: ["#120a05", "#000000"], eyes: true },
    { id: "gold",  label: "Gold visor", kind: "blank", glass: ["#ffd37a", "#a85a00"], eyes: false },
    { id: "ice",   label: "Ice visor", kind: "blank", glass: ["#bfe9ff", "#27608a"], eyes: false }
  ];
  var st = { preset: PRESETS[1], photo: null, mode: "drift", x: 749, y: 432, size: 130, rot: -20, zoom: 1, frame: "none" };

  function tilt(ctx, x, y, r, fn) { ctx.save(); ctx.translate(x, y); ctx.rotate(r * Math.PI / 180); fn(); ctx.restore(); }
  function capsule(ctx, x1, y1, x2, y2, w) { ctx.lineCap = "round"; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); }

  function drawVisorContent(ctx, r, preset, photo, zoom) {
    ctx.save(); ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.clip();
    if (photo) {
      var w = photo.width, h = photo.height, sc = Math.max(2 * r / w, 2 * r / h) * zoom;
      ctx.drawImage(photo, -w * sc / 2, -h * sc / 2, w * sc, h * sc);
    } else {
      var gl = ctx.createLinearGradient(-r, -r, r, r); gl.addColorStop(0, preset.glass[0]); gl.addColorStop(1, preset.glass[1]);
      ctx.fillStyle = gl; ctx.fillRect(-r, -r, 2 * r, 2 * r);
      if (preset.eyes) {
        ctx.shadowColor = "#ffb040"; ctx.shadowBlur = r * .25; ctx.fillStyle = "#ffcf70";
        [-1, 1].forEach(function (k) { ctx.beginPath(); ctx.ellipse(k * r * .3, -r * .05, r * .13, r * .08, 0, 0, Math.PI * 2); ctx.fill(); });
        ctx.shadowBlur = 0;
      }
    }
    // reflection of the black hole + glass sheen
    var rg = ctx.createRadialGradient(r * .55, -r * .35, 0, r * .55, -r * .35, r * 1.3);
    rg.addColorStop(0, "rgba(255,160,50,.55)"); rg.addColorStop(1, "rgba(255,120,20,0)");
    ctx.fillStyle = rg; ctx.fillRect(-r, -r, 2 * r, 2 * r);
    var sh = ctx.createLinearGradient(-r, -r, r * .3, r * .3); sh.addColorStop(0, "rgba(255,255,255,.35)"); sh.addColorStop(.5, "rgba(255,255,255,.04)"); sh.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = sh; ctx.beginPath(); ctx.ellipse(-r * .25, -r * .45, r * .75, r * .32, -.5, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  /* ---- v3 premium look: illustrated sprite + machined metal bezels ---- */
  var SPR = { W: 580, H: 874, vx: 289, vy: 223, vr: 122 };      // sprite size, visor centre and visor radius (px in the sprite)
  var spr = new Image(), vmask = new Image();
  spr.src = "assets/pfp/astro-sprite.webp"; vmask.src = "assets/pfp/visor-mask.png";
  var sprLoaded = Promise.all([spr, vmask].map(function (i) { return new Promise(function (r) { i.onload = r; i.onerror = r; }); }));
  var glassCv = document.createElement("canvas"); glassCv.width = SPR.W; glassCv.height = SPR.H;

  var figCv = document.createElement("canvas"); figCv.width = SPR.W; figCv.height = SPR.H;
  function drawAstronaut(ctx, cx, cy, size, rot, preset, photo, zoom) {
    if (!spr.complete || !spr.naturalWidth) return;
    var s = size * 3.4 / SPR.H;
    // 1) build the figure on its own canvas: visor content (cut to the visor hole by the mask), the sprite, warm rim light
    var gx = glassCv.getContext("2d"); gx.clearRect(0, 0, SPR.W, SPR.H);
    gx.save(); gx.translate(SPR.vx, SPR.vy); drawVisorContent(gx, SPR.vr, preset, photo, zoom); gx.restore();
    gx.globalCompositeOperation = "destination-in"; gx.drawImage(vmask, 0, 0, SPR.W, SPR.H); gx.globalCompositeOperation = "source-over";
    var f = figCv.getContext("2d"); f.clearRect(0, 0, SPR.W, SPR.H);
    f.drawImage(glassCv, 0, 0); f.drawImage(spr, 0, 0, SPR.W, SPR.H);
    f.save(); f.globalCompositeOperation = "source-atop";
    var lg = f.createLinearGradient(SPR.W, 0, 0, SPR.H * .8); lg.addColorStop(0, "rgba(255,150,40,.30)"); lg.addColorStop(.55, "rgba(255,150,40,0)"); lg.addColorStop(1, "rgba(20,5,0,.35)");
    f.fillStyle = lg; f.fillRect(0, 0, SPR.W, SPR.H); f.restore();
    // 2) place it (visor centre at cx,cy), with an amber glow from the accretion disk
    tilt(ctx, cx, cy, rot, function () {
      ctx.scale(s, s); ctx.translate(-SPR.vx, -SPR.vy);
      ctx.save(); ctx.shadowColor = "rgba(255,140,30,.6)"; ctx.shadowBlur = Math.max(6, 60 * s); ctx.drawImage(figCv, 0, 0); ctx.restore();
    });
  }

  /* machined bezel: brushed metal conic gradient, dark grooves, rivets, optional accent segments. kind: steel | gunmetal | chrome | gold */
  function bezel(ctx, c, rOut, w, kind, opts) {
    opts = opts || {}; var rIn = rOut - w, mid = (rOut + rIn) / 2;
    var P = { gunmetal: ["#2b2c30", "#6b6d73", "#3a3b40", "#8b8d93"], steel: ["#44464c", "#b4b7bd", "#5a5c62", "#e6e8ec"], chrome: ["#2b2d33", "#f6f8fb", "#6e727a", "#ffffff"], gold: ["#4a3410", "#ffd989", "#8a5d16", "#fff3c4"] }[kind];
    ctx.save(); ctx.translate(c, c);
    if (opts.glow) { ctx.shadowColor = opts.glow; ctx.shadowBlur = 36; }
    var cg = ctx.createConicGradient ? ctx.createConicGradient(-Math.PI * .75, 0, 0) : null;
    if (cg) { cg.addColorStop(0, P[0]); cg.addColorStop(.14, P[1]); cg.addColorStop(.3, P[2]); cg.addColorStop(.5, P[3]); cg.addColorStop(.66, P[2]); cg.addColorStop(.84, P[1]); cg.addColorStop(1, P[0]); }
    ctx.strokeStyle = cg || P[1]; ctx.lineWidth = w; ctx.beginPath(); ctx.arc(0, 0, mid, 0, 7); ctx.stroke(); ctx.shadowBlur = 0;
    // machined grooves + edge highlights
    ctx.lineWidth = 3; ctx.strokeStyle = "rgba(0,0,0,.6)"; ctx.beginPath(); ctx.arc(0, 0, rOut - 1.5, 0, 7); ctx.stroke(); ctx.beginPath(); ctx.arc(0, 0, rIn + 1.5, 0, 7); ctx.stroke();
    ctx.lineWidth = 2; ctx.strokeStyle = "rgba(255,255,255,.28)"; ctx.beginPath(); ctx.arc(0, 0, rOut - 5, 0, 7); ctx.stroke();
    ctx.strokeStyle = "rgba(0,0,0,.45)"; ctx.beginPath(); ctx.arc(0, 0, mid, 0, 7); ctx.stroke();
    // tick marks (accent coloured)
    if (opts.ticks) { ctx.strokeStyle = opts.tickCol || "#ff9a2e"; ctx.lineWidth = 3; ctx.lineCap = "butt"; for (var i = 0; i < opts.ticks; i++) { var a = i / opts.ticks * Math.PI * 2; ctx.beginPath(); ctx.moveTo(Math.cos(a) * (rIn + w * .22), Math.sin(a) * (rIn + w * .22)); ctx.lineTo(Math.cos(a) * (rIn + w * .42), Math.sin(a) * (rIn + w * .42)); ctx.stroke(); } }
    // rivets
    var rv = opts.rivets || 0;
    for (i = 0; i < rv; i++) { a = i / rv * Math.PI * 2 + Math.PI / rv; var x = Math.cos(a) * mid, y = Math.sin(a) * mid, rr = Math.max(4, w * .16);
      var rg = ctx.createRadialGradient(x - rr * .35, y - rr * .35, 0, x, y, rr); rg.addColorStop(0, "#fff"); rg.addColorStop(.35, P[3]); rg.addColorStop(1, "#15161a");
      ctx.fillStyle = rg; ctx.beginPath(); ctx.arc(x, y, rr, 0, 7); ctx.fill(); }
    // inner accent line
    if (opts.accent) { ctx.save(); ctx.strokeStyle = opts.accent; ctx.lineWidth = opts.accentW || 4; if (opts.accentGlow) { ctx.shadowColor = opts.accentGlow; ctx.shadowBlur = 22; } ctx.beginPath(); ctx.arc(0, 0, rIn - 2, 0, 7); ctx.stroke(); ctx.restore(); }
    ctx.restore();
  }
  function cutCorners(ctx, R) { var c = S / 2; ctx.fillStyle = "#030202"; ctx.beginPath(); ctx.rect(0, 0, S, S); ctx.moveTo(c + R, c); ctx.arc(c, c, R, 0, Math.PI * 2, true); ctx.fill("evenodd"); }

  function ringFrame(ctx, withText) {
    var c = S / 2; ctx.save(); cutCorners(ctx, S / 2 - 4);
    var w = withText ? 84 : 46;
    bezel(ctx, c, S / 2 - 8, w, "gold", { rivets: withText ? 0 : 16, ticks: withText ? 0 : 72, tickCol: "#2a1a05", accent: "#ff9a2e", accentW: 5, accentGlow: "rgba(255,140,30,.9)", glow: "rgba(255,150,40,.5)" });
    if (withText) {
      var text = "PAST THE POINT OF NO RETURN  ·  $ASTRO  ·  ", rr = S / 2 - 8 - w / 2;
      ctx.font = "800 40px " + F; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      var n = text.length, tot = 0, widths = []; for (var i = 0; i < n; i++) { var wd = ctx.measureText(text[i]).width + 3; widths.push(wd); tot += wd; }
      var k = (Math.PI * 2 * rr) / tot, a = -Math.PI / 2 - (tot * k / rr) / 2;
      for (i = 0; i < n; i++) {
        var step = widths[i] * k / rr; a += step / 2;
        ctx.save(); ctx.translate(c + Math.cos(a) * rr, c + Math.sin(a) * rr); ctx.rotate(a + Math.PI / 2);
        ctx.fillStyle = "rgba(255,240,200,.55)"; ctx.fillText(text[i], 0, 2); ctx.fillStyle = "#1b1006"; ctx.fillText(text[i], 0, 0); ctx.restore();
        a += step / 2;
      }
    }
    ctx.restore();
  }

  /* ---- rank frames: unlocked in the browser by a verified rank (cosmetic; see docs/BADGES_PLAN.md) ---- */
  var RANK_NAMES = ((window.ASTRO_CONFIG || {}).ranks || []).map(function (r) { return r.name; });
  var rankBadges = RANK_NAMES.map(function (n) { var i = new Image(); i.onload = function () { redraw(); }; i.src = "assets/badges/" + n.toLowerCase().replace(/\s+/g, "-") + ".webp"; return i; });
  function crewLevel() { return window.AstroCrew ? window.AstroCrew.level : -1; }
  function rankFrame(ctx, idx) {
    var c = S / 2, R = S / 2;
    ctx.save(); cutCorners(ctx, R - 4);
    var spec = [
      ["gunmetal", 60, { rivets: 12, ticks: 48, tickCol: "#a85d1c", accent: "rgba(255,150,50,.5)" }],
      ["steel", 66, { rivets: 16, ticks: 60, tickCol: "#ff9a2e", accent: "#ff9a2e", accentW: 4 }],
      ["chrome", 72, { rivets: 16, ticks: 72, tickCol: "#ff7a1a", accent: "#ffb040", accentW: 6, accentGlow: "rgba(255,150,30,.95)", glow: "rgba(255,140,30,.6)" }],
      ["gold", 78, { rivets: 20, ticks: 90, tickCol: "#2a1a05", accent: "#fff3c4", accentW: 6, accentGlow: "rgba(255,210,100,1)", glow: "rgba(255,200,90,.8)" }]
    ][idx];
    bezel(ctx, c, R - 8, spec[1], spec[0], spec[2]);
    if (idx === 2 || idx === 3) { // accretion-disk arc of light across the bezel
      ctx.save(); ctx.translate(c, c); ctx.globalCompositeOperation = "lighter";
      var arc = ctx.createLinearGradient(-R, 0, R, 0); arc.addColorStop(0, "rgba(255,140,30,0)"); arc.addColorStop(.5, idx === 3 ? "rgba(255,230,150,.7)" : "rgba(255,150,40,.55)"); arc.addColorStop(1, "rgba(255,140,30,0)");
      ctx.strokeStyle = arc; ctx.lineWidth = 10; ctx.beginPath(); ctx.arc(0, 0, R - 8 - spec[1] / 2, Math.PI * .08, Math.PI * .92); ctx.stroke(); ctx.restore();
    }
    var bi = rankBadges[idx];
    if (bi && bi.complete && bi.naturalWidth) { ctx.save(); ctx.shadowColor = "rgba(0,0,0,.8)"; ctx.shadowBlur = 24; ctx.drawImage(bi, c - 112, S - 232, 224, 224); ctx.restore(); }
    ctx.restore();
  }

  function render(target, size) {
    var ctx = target.getContext("2d"); ctx.save(); ctx.scale(size / S, size / S);
    ctx.clearRect(0, 0, S, S); ctx.fillStyle = "#030202"; ctx.fillRect(0, 0, S, S);
    if (st.preset.kind === "original" && !st.photo) {
      ctx.drawImage(orig, 0, 0, S, S);
    } else if (st.mode === "visor") {
      ctx.drawImage(plate, 0, 0, S, S);
      ctx.fillStyle = "rgba(0,0,0,.5)"; ctx.fillRect(0, 0, S, S);
      var R = 372; ctx.save(); ctx.translate(S / 2, S / 2);
      drawVisorContent(ctx, R, st.preset.kind === "original" ? PRESETS[1] : st.preset, st.photo, st.zoom);
      ctx.save(); ctx.beginPath(); ctx.arc(0, 0, R, 0, 7); ctx.clip(); ctx.globalCompositeOperation = "screen"; ctx.globalAlpha = .22;
      ctx.drawImage(plate, -R * 1.9, -R * 1.9, R * 3.8, R * 3.8); ctx.restore();
      ctx.restore();
      bezel(ctx, S / 2, R + 70, 72, "steel", { rivets: 14, ticks: 56, tickCol: "#ff9a2e", accent: "#ffb040", accentW: 7, accentGlow: "rgba(255,150,30,.95)", glow: "rgba(255,140,30,.55)" });
    } else {
      ctx.drawImage(plate, 0, 0, S, S);
      drawAstronaut(ctx, st.x, st.y, st.size, st.rot, st.preset.kind === "original" ? PRESETS[1] : st.preset, st.photo, st.zoom);
    }
    if (st.frame === "ring") ringFrame(ctx, false);
    if (st.frame === "text") ringFrame(ctx, true);
    if (/^rank:/.test(st.frame)) { var ri = +st.frame.slice(5); if (crewLevel() >= ri) rankFrame(ctx, ri); }
    ctx.restore();
  }
  function redraw() { render(cv, S); }

  /* ---------- controls ---------- */
  function buildPresets() {
    var wrap = $("pfpPresets"); wrap.textContent = "";
    PRESETS.forEach(function (p) {
      var b = document.createElement("button"); b.type = "button"; b.className = "pfp-preset"; b.setAttribute("aria-label", p.label); b.dataset.id = p.id;
      var c = document.createElement("canvas"); c.width = c.height = 96; b.appendChild(c);
      var l = document.createElement("span"); l.textContent = p.label; b.appendChild(l);
      b.addEventListener("click", function () { st.preset = p; st.photo = null; $("pfpFile").value = ""; if (p.kind === "original") { setMode("drift"); } sync(); });
      wrap.appendChild(b);
      p._thumb = c;
    });
  }
  function thumbs() {
    PRESETS.forEach(function (p) {
      var t = p._thumb.getContext("2d"), z = 96;
      t.save(); t.clearRect(0, 0, z, z);
      if (p.kind === "original") { t.drawImage(orig, 660, 330, 220, 220, 0, 0, z, z); }
      else {
        t.drawImage(plate, 660, 330, 220, 220, 0, 0, z, z);
        drawAstronaut(t, 50, 40, 36, -12, p, null, 1);
      }
      t.restore();
    });
  }
  function setMode(m) { st.mode = m; document.querySelectorAll("#pfpMode button").forEach(function (b) { b.setAttribute("aria-pressed", b.dataset.v === m); }); }
  function sync() {
    document.querySelectorAll(".pfp-preset").forEach(function (b) { b.setAttribute("aria-pressed", !st.photo && b.dataset.id === st.preset.id); });
    var orig = st.preset.kind === "original" && !st.photo;
    document.querySelectorAll("#pfpMode button").forEach(function (b) { b.disabled = orig; });
    var drift = st.mode === "drift" && !orig;
    ["pfpX", "pfpY", "pfpSize", "pfpRot"].forEach(function (id) { $(id).disabled = !drift; });
    $("pfpZoom").disabled = !st.photo;
    cv.style.cursor = drift ? "grab" : "default"; cv.style.touchAction = drift ? "none" : "auto";
    redraw();
  }
  function bindRange(id, key) { $(id).addEventListener("input", function () { st[key] = +this.value; redraw(); }); }
  async function loadFile(f) {
    var msg = $("pfpMsg"); msg.textContent = "";
    if (!f) return;
    if (!/^image\//.test(f.type)) { msg.textContent = "That file isn't an image."; return; }
    if (f.size > 20 * 1024 * 1024) { msg.textContent = "That image is over 20 MB. Pick a smaller one."; return; }
    try {
      var bmp;
      if (window.createImageBitmap) bmp = await createImageBitmap(f, { imageOrientation: "from-image" });
      else bmp = await new Promise(function (res, rej) { var i = new Image(); i.onload = function () { res(i); }; i.onerror = rej; i.src = URL.createObjectURL(f); });
      st.photo = bmp; st.zoom = 1; $("pfpZoom").value = 1; sync();
    } catch (e) { msg.textContent = "Couldn't read that image. Try a JPG or PNG."; }
  }
  function start() {
    buildPresets();
    $("pfpFile").addEventListener("change", function () { loadFile(this.files[0]); });
    document.querySelectorAll("#pfpMode button").forEach(function (b) { b.addEventListener("click", function () { setMode(b.dataset.v); sync(); }); });
    var rf = $("pfpRankFrames");
    RANK_NAMES.forEach(function (n, i) { var b = document.createElement("button"); b.type = "button"; b.dataset.v = "rank:" + i; b.setAttribute("aria-pressed", "false"); b.textContent = n; rf.appendChild(b); });
    function updateRankBtns() {
      var lv = crewLevel();
      rf.querySelectorAll("button").forEach(function (b, i) { var ok = lv >= i; b.disabled = !ok; b.title = ok ? "" : "Unlocks at " + RANK_NAMES[i] + " rank"; b.textContent = RANK_NAMES[i]; b.classList.toggle("locked", !ok); });
      $("pfpRankNote").textContent = lv >= 0 ? "Verified rank: " + RANK_NAMES[lv] + ". You can use every frame up to your rank." : "Rank frames unlock when you check your rank above.";
    }
    window.addEventListener("astro:crew", updateRankBtns); updateRankBtns();
    document.querySelectorAll("#pfpFrame button, #pfpRankFrames button").forEach(function (b) { b.addEventListener("click", function () {
      st.frame = b.dataset.v; document.querySelectorAll("#pfpFrame button, #pfpRankFrames button").forEach(function (x) { x.setAttribute("aria-pressed", x === b); }); redraw(); }); });
    bindRange("pfpSize", "size"); bindRange("pfpRot", "rot"); bindRange("pfpZoom", "zoom");
    window.addEventListener("astro:crew", function () { // rank changed: drop a rank frame that's no longer unlocked
      var m = /^rank:(\d)$/.exec(st.frame);
      if (m && crewLevel() < +m[1]) { st.frame = "none"; document.querySelectorAll("#pfpFrame button, #pfpRankFrames button").forEach(function (x) { x.setAttribute("aria-pressed", x.dataset.v === "none"); }); }
      redraw();
    });
    $("pfpX").addEventListener("input", function () { st.x = +this.value; redraw(); });
    $("pfpY").addEventListener("input", function () { st.y = +this.value; redraw(); });
    // drag the astronaut on the canvas
    var drag = false;
    function pos(e) { var r = cv.getBoundingClientRect(); return { x: (e.clientX - r.left) / r.width * S, y: (e.clientY - r.top) / r.height * S }; }
    cv.addEventListener("pointerdown", function (e) { if (cv.style.cursor !== "grab") return; drag = true; cv.setPointerCapture(e.pointerId); cv.style.cursor = "grabbing"; mv(e); });
    function mv(e) { if (!drag) return; var p = pos(e); st.x = Math.max(0, Math.min(S, p.x)); st.y = Math.max(0, Math.min(S, p.y)); $("pfpX").value = st.x; $("pfpY").value = st.y; redraw(); }
    cv.addEventListener("pointermove", mv);
    cv.addEventListener("pointerup", function () { drag = false; if (cv.style.cursor === "grabbing") cv.style.cursor = "grab"; });
    $("pfpDl").addEventListener("click", function () {
      cv.toBlob(function (b) { var a = document.createElement("a"); a.href = URL.createObjectURL(b); a.download = "astro-pfp.png"; document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000); }, "image/png");
    });
    $("pfpReset").addEventListener("click", function () {
      st = { preset: PRESETS[1], photo: null, mode: "drift", x: 749, y: 432, size: 130, rot: -20, zoom: 1, frame: "none" };
      $("pfpFile").value = ""; $("pfpX").value = st.x; $("pfpY").value = st.y; $("pfpSize").value = st.size; $("pfpRot").value = st.rot; $("pfpZoom").value = 1;
      setMode("drift"); document.querySelectorAll("#pfpFrame button, #pfpRankFrames button").forEach(function (x) { x.setAttribute("aria-pressed", x.dataset.v === "none"); }); sync();
    });
    Promise.all([loaded, sprLoaded]).then(function () { (document.fonts && document.fonts.load ? document.fonts.load('800 44px "Oxanium"') : Promise.resolve()).then(function () { thumbs(); sync(); }); });
    window.__pfp = { st: function () { return st; }, set: function (o) { Object.assign(st, o); sync(); }, presets: PRESETS };
  }
  start();
})();
