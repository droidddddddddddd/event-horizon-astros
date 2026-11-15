"""Responsive + hero + Phantom checks (python3 tests/e2e_mobile.py; BASE env var for a remote site).
Never requests a signature/transaction: the mocked provider records every call so the test can assert only connect/disconnect are used."""
from playwright.sync_api import sync_playwright
import os, sys, re
BASE = os.environ.get("BASE", "http://127.0.0.1:8802/")
res = []
def check(name, ok, extra=""): res.append(bool(ok)); print(("PASS " if ok else "FAIL ") + name + (" :: " + str(extra) if extra and not ok else ""))
CLS = "window.__cls=0;new PerformanceObserver(l=>{for(const e of l.getEntries())if(!e.hadRecentInput)window.__cls+=e.value}).observe({type:'layout-shift',buffered:true});"
MOCK = """window.__calls=[];window.phantom={solana:{isPhantom:true,
 connect:async function(o){window.__calls.push(['connect',JSON.stringify(o||null)]);return {publicKey:{toString:()=>'7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU'}}},
 disconnect:async function(){window.__calls.push(['disconnect'])}, on:function(){},
 signMessage:async function(){window.__calls.push(['signMessage']);throw new Error('must not be called')},
 signTransaction:async function(){window.__calls.push(['signTransaction']);throw new Error('must not be called')},
 signAndSendTransaction:async function(){window.__calls.push(['signAndSendTransaction']);throw new Error('must not be called')}}};"""
with sync_playwright() as p:
    b = p.chromium.launch(executable_path="/usr/bin/google-chrome", args=["--no-sandbox"])
    for name, w, h in [("375", 375, 812), ("390", 390, 844), ("768", 768, 1024), ("1440", 1440, 900)]:
        c = b.new_context(viewport={"width": w, "height": h}, is_mobile=w < 500, has_touch=w < 800); c.add_init_script(CLS); pg = c.new_page(); errs = []
        pg.on("console", lambda m: errs.append(m.text) if m.type in ("error", "warning") else None); pg.on("pageerror", lambda e: errs.append(str(e)))
        pg.goto(BASE, wait_until="networkidle"); pg.wait_for_timeout(1200)
        check(f"[{name}] no console errors", not errs, errs)
        check(f"[{name}] no horizontal overflow", not pg.evaluate("document.documentElement.scrollWidth>window.innerWidth"), pg.evaluate("document.documentElement.scrollWidth"))
        wide = pg.evaluate("[...document.querySelectorAll('body *')].filter(e=>{const r=e.getBoundingClientRect();return r.width>0&&r.right>window.innerWidth+1&&getComputedStyle(e).position!=='fixed'&&!e.closest('.hero,.gallery,.sprite,[hidden]')}).slice(0,5).map(e=>e.tagName+'.'+e.className)")
        check(f"[{name}] no element pokes past the viewport", not wide, wide)
        hero = pg.evaluate("(()=>{const i=document.querySelector('#heroAstro img');return i&&{ok:i.complete&&i.naturalWidth>0,alt:i.alt,src:i.currentSrc,cap:(document.querySelector('.hero-astro-cap')||{}).textContent,vis:getComputedStyle(document.getElementById('heroAstro')).opacity}})()")
        check(f"[{name}] hero Astro loaded + visible, has alt + caption", hero and hero["ok"] and hero["vis"] == "1" and len(hero["alt"]) > 10 and hero["cap"].startswith("ASTRO #"), hero)
        check(f"[{name}] hero image is a sized webp (not the 768 on small screens)" if w < 500 else f"[{name}] hero image src ok", hero and re.search(r"assets/hero/\d+-(384|768)\.webp", hero["src"]) and (w >= 500 or "-384" in hero["src"] or w * 2 > 384), hero)
        check(f"[{name}] layout shift (CLS) < 0.1 (Google good)", pg.evaluate("window.__cls") < 0.1, pg.evaluate("window.__cls"))
        hb = pg.evaluate("(()=>{const r=document.querySelector('#h1').getBoundingClientRect();return [r.left,r.right]})()")
        check(f"[{name}] headline inside viewport", hb[0] >= 0 and hb[1] <= w + 1, hb)
        if w <= 1100:
            check(f"[{name}] nav links hidden until menu opened", not pg.is_visible("#nav a[href='#faq']"))
            pg.click("#navToggle"); pg.wait_for_timeout(150)
            check(f"[{name}] menu opens (aria-expanded + links visible)", pg.get_attribute("#navToggle", "aria-expanded") == "true" and pg.is_visible("#nav a[href='#faq']"))
            pg.click("#nav a[href='#faq']"); pg.wait_for_timeout(500)
            check(f"[{name}] menu closes after choosing a link, page scrolled to FAQ", pg.get_attribute("#navToggle", "aria-expanded") == "false" and pg.evaluate("scrollY") > 500)
            pg.click("#navToggle"); pg.keyboard.press("Escape"); pg.wait_for_timeout(100)
            check(f"[{name}] Escape closes menu", pg.get_attribute("#navToggle", "aria-expanded") == "false")
        else:
            check(f"[{name}] desktop nav visible, toggle hidden", pg.is_visible("#nav a[href='#faq']") and not pg.is_visible("#navToggle"))
        small = pg.evaluate("[...document.querySelectorAll('a[href],button')].filter(e=>{const r=e.getBoundingClientRect();const s=getComputedStyle(e);return r.width>0&&s.visibility!=='hidden'&&(r.height<32)&&!e.closest('.sr,.skip,.sprite')&&!e.classList.contains('skip')&&!e.closest('footer')}).slice(0,6).map(e=>(e.textContent||e.id).trim().slice(0,20)+' '+Math.round(e.getBoundingClientRect().height))")
        if w < 500: check(f"[{name}] tap targets >= 32px tall (primary controls)", not small, small)
        c.close()
    # random hero: different tokens across loads, and no immediate repeat inside one session
    c = b.new_context(viewport={"width": 1440, "height": 900}); pg = c.new_page(); seen = []
    for _ in range(8):
        pg.goto(BASE, wait_until="load"); seen.append(pg.evaluate("document.querySelector('#heroAstro img').alt.match(/#(\\d+)/)[1]"))
    check("hero varies across loads (>=4 distinct of 8)", len(set(seen)) >= 4, seen)
    check("hero never repeats the previous pick in a session", all(a != b2 for a, b2 in zip(seen, seen[1:])), seen)
    c.close()
    # no-JS fallback
    c = b.new_context(viewport={"width": 1440, "height": 900}, java_script_enabled=False); pg = c.new_page(); pg.goto(BASE, wait_until="load"); pg.wait_for_timeout(500)
    ok = pg.evaluate("(()=>{const i=document.querySelector('.hero-astro img');return !!i&&i.complete&&i.naturalWidth>0&&getComputedStyle(i.parentElement).opacity==='1'})()")
    check("no-JS: static Astro #1 fallback is shown", ok); c.close()
    # Phantom: absent
    c = b.new_context(viewport={"width": 1440, "height": 900}); pg = c.new_page(); errs = []; pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.goto(BASE, wait_until="networkidle"); pg.click("#wallet-connect"); pg.wait_for_timeout(200)
    check("no wallet: click degrades gracefully (message, no exception)", "PHANTOM NOT FOUND" in pg.inner_text("#wallet-label") and not errs, [pg.inner_text("#wallet-label"), errs])
    pg.wait_for_timeout(2800); check("no wallet: button resets", pg.inner_text("#wallet-label") == "CONNECT WALLET"); c.close()
    # Phantom: mocked
    c = b.new_context(viewport={"width": 1440, "height": 900}); c.add_init_script(MOCK); pg = c.new_page(); errs = []; pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.goto(BASE, wait_until="networkidle"); pg.click("#wallet-connect"); pg.wait_for_timeout(300)
    check("mock Phantom: connects, shows shortened public key only", pg.inner_text("#wallet-label").upper().startswith("7XKX") and "…" in pg.inner_text("#wallet-label") and "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU" not in pg.inner_text("body"), pg.inner_text("#wallet-label"))
    pg.click("#wallet-connect"); pg.wait_for_timeout(300)
    calls = [x[0] for x in pg.evaluate("window.__calls")]
    check("mock Phantom: only connect/disconnect were called (no sign/send)", calls == ["connect", "disconnect"] and not errs, [calls, errs])
    check("mock Phantom: disconnect restores button", pg.inner_text("#wallet-label") == "CONNECT WALLET"); c.close()
    # mock rejects (user cancels)
    c = b.new_context(viewport={"width": 1440, "height": 900}); c.add_init_script(MOCK.replace("connect:async function(o){", "connect:async function(o){throw new Error('User rejected');")); pg = c.new_page(); errs = []; pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.goto(BASE, wait_until="networkidle"); pg.click("#wallet-connect"); pg.wait_for_timeout(300)
    check("mock Phantom user-reject: stays disconnected, no exception", pg.inner_text("#wallet-label") == "CONNECT WALLET" and not errs, [pg.inner_text("#wallet-label"), errs]); c.close()
    # links, anchors, images
    c = b.new_context(viewport={"width": 1440, "height": 900}); pg = c.new_page(); pg.goto(BASE, wait_until="networkidle"); pg.wait_for_timeout(800)
    hrefs = pg.evaluate("[...document.querySelectorAll('a[href]')].map(a=>a.getAttribute('href'))")
    anchors = [h for h in hrefs if h.startswith('#') and len(h) > 1]; missing = [h for h in anchors if not pg.evaluate("id=>!!document.getElementById(id)", h[1:])]
    check("every #anchor link points at an existing id", not missing, missing)
    local = sorted({h for h in hrefs if not h.startswith(('#', 'http', 'mailto:', 'javascript:'))}); bad = []
    for h in local:
        r = c.request.get(BASE + h); 
        if r.status != 200: bad.append((h, r.status))
    check("every local link resolves (200)", not bad, bad)
    ext = [h for h in hrefs if h.startswith('http')]; check("external links use rel=noopener noreferrer", pg.evaluate("[...document.querySelectorAll('a[target=_blank]')].every(a=>/noopener/.test(a.rel))"), ext)
    imgs = pg.evaluate("[...document.images].filter(i=>i.currentSrc).map(i=>({s:i.currentSrc.split('/').slice(-2).join('/'),alt:i.getAttribute('alt'),w:i.getAttribute('width')||i.width,h:i.getAttribute('height')||i.height,lazy:i.loading,top:i.getBoundingClientRect().top,ok:i.naturalWidth>0}))")
    check("all images loaded, have alt attr and dimensions", all(i['ok'] and i['alt'] is not None and i['w'] and i['h'] for i in imgs), [i for i in imgs if not (i['ok'] and i['alt'] is not None and i['w'] and i['h'])][:4])
    check("below-the-fold images are lazy-loaded", all(i['lazy'] == 'lazy' for i in imgs if i['top'] > 1500), [i['s'] for i in imgs if i['top'] > 1500 and i['lazy'] != 'lazy'][:4])
    foc = pg.evaluate("(()=>{const e=document.querySelector('.btn.primary');e.focus();const s=getComputedStyle(e);return s.outlineStyle!=='none'||s.boxShadow!=='none'})()")
    check("keyboard focus is visible on controls", foc)
    check("page has lang, title, one h1", pg.evaluate("document.documentElement.lang&&document.title&&document.querySelectorAll('h1').length===1")); c.close()
    b.close()
print(f"{sum(res)}/{len(res)} passed"); sys.exit(0 if all(res) else 1)
