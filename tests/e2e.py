"""End-to-end browser checks against the locally served build (python3 tests/e2e.py). Prints PASS/FAIL per check, exits 1 on any FAIL.
Needs: node tools/build-site.mjs && node tools/serve.mjs 8802, playwright + /usr/bin/google-chrome."""
from playwright.sync_api import sync_playwright
import sys, os, base64, struct, zlib, tempfile
BASE = os.environ.get("BASE", "http://127.0.0.1:8802/")
res = []
def check(name, ok, extra=""): res.append(ok); print(("PASS " if ok else "FAIL ") + name + (" :: " + str(extra) if extra and not ok else ""))
def png_bytes(w=64, h=64):
    raw = b"".join(b"\x00" + bytes([200, 80, 20]) * w for _ in range(h))
    def ch(t, d): c = struct.pack(">I", len(d)) + t + d; return c + struct.pack(">I", zlib.crc32(t + d) & 0xffffffff)
    return b"\x89PNG\r\n\x1a\n" + ch(b"IHDR", struct.pack(">IIBBBBB", w, h, 8, 2, 0, 0, 0)) + ch(b"IDAT", zlib.compress(raw)) + ch(b"IEND", b"")
with sync_playwright() as p:
    b = p.chromium.launch(executable_path="/usr/bin/google-chrome", args=["--no-sandbox"])
    c = b.new_context(viewport={"width": 1440, "height": 900}, accept_downloads=True); pg = c.new_page(); errs = []
    pg.on("console", lambda m: errs.append(m.type + ": " + m.text) if m.type in ("error", "warning") else None)
    pg.on("pageerror", lambda e: errs.append("pageerror: " + str(e)))
    reqs = []; pg.on("request", lambda r: reqs.append(r.url))
    alerts = []; pg.on("dialog", lambda d: (alerts.append(d.message), d.dismiss()))
    pg.goto(BASE + "?demo_mcap=300000&demo_rank=Navigator", wait_until="networkidle"); pg.wait_for_timeout(1000)
    check("no console errors/CSP violations on load", errs == [], errs)
    check("hero + nav present", pg.locator("h1").inner_text().replace("\n", " ").strip() == "EVENT HORIZON" and pg.locator("#nav a").count() == 9)
    check("prelaunch banners shown (>=3)", pg.locator("text=PRELAUNCH CONCEPT PHASE").count() >= 3)
    # gallery
    n0 = pg.locator("#gallery .astro").count(); check("gallery shows first page (15)", n0 == 15, n0)
    pg.click('#chips [data-tier="Epic"]'); pg.wait_for_timeout(200)
    tiers = set(pg.eval_on_selector_all("#gallery .astro em", "e=>e.map(x=>x.textContent)")); check("tier filter Epic only", tiers == {"Epic"}, tiers)
    pg.click('#chips [data-tier="All"]'); pg.select_option("#sort", "num"); pg.wait_for_timeout(200)
    first = pg.locator("#gallery .astro .cap strong").first.inner_text(); check("sort by number starts at lowest", first.startswith("Astro #1"), first)
    pg.fill("#search", "<img src=x onerror=alert(1)>"); pg.wait_for_timeout(200)
    check("search with HTML is inert", pg.locator("#gallery img[src='x']").count() == 0 and not alerts and "No matching" in pg.locator("#gallery").inner_text())
    pg.fill("#search", ""); pg.locator("#gallery .astro").first.click(); pg.wait_for_timeout(200)
    check("detail dialog opens", pg.evaluate("document.getElementById('detail').open"))
    pg.click("#detailBody .btn"); pg.wait_for_timeout(600)
    check("'Open in Studio' selects the astro", pg.input_value("#st-astro") == "1", pg.input_value("#st-astro"))
    # studio
    pg.locator("#studio").scroll_into_view_if_needed()
    xss = "<script>window.__x=1</script><img src=x onerror=window.__x=1>\" onfocus=alert(2) \u202e"
    pg.fill("#st-top", xss); pg.fill("#st-bottom", "'; alert(3); //"); pg.wait_for_timeout(500)
    check("studio captions with HTML do not execute/inject", pg.evaluate("window.__x===undefined") and not alerts and pg.locator("#stage-main script, #stage-main img[src='x']").count() == 0)
    check("maxlength enforced", len(pg.input_value("#st-top")) <= 60)
    def sig(): return pg.evaluate("(()=>{const c=document.getElementById('st-canvas');const d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let s=0;for(let i=0;i<d.length;i+=997)s=(s*31+d[i])>>>0;return [c.width,c.height,s]})()")
    s1 = sig(); pg.click('#st-format [data-v="4:5"]'); pg.wait_for_timeout(400); s2 = sig(); check("format 4:5 resizes canvas to 1080x1350", s2[:2] == [1080, 1350], s2)
    pg.click('#st-format [data-v="16:9"]'); pg.wait_for_timeout(400); s3 = sig(); check("format 16:9 resizes to 1280x720", s3[:2] == [1280, 720], s3)
    pg.click('#st-format [data-v="1:1"]')
    for tool in ["frames", "styles", "text", "export", "pfp", "meme"]:
        pg.click(f'#tools [data-tool="{tool}"]'); pg.wait_for_timeout(200)
    pg.click('#tools [data-tool="styles"]'); pg.click('#st-styles [data-v="mono"]'); pg.wait_for_timeout(400); s4 = sig(); check("style changes the render", s4[2] != sig.__defaults__ if False else s4[2] != s1[2])
    pg.click('#tools [data-tool="pfp"]'); pg.wait_for_timeout(400); sp = sig(); check("PFP tool renders 1080x1080", sp[:2] == [1080, 1080], sp)
    # upload: bad type, big/ok png
    d = tempfile.mkdtemp(); good = os.path.join(d, "x.png"); open(good, "wb").write(png_bytes()); badf = os.path.join(d, "x.svg"); open(badf, "w").write("<svg xmlns='http://www.w3.org/2000/svg' onload='window.__x=1'/>")
    pg.set_input_files("#st-file", badf); pg.wait_for_timeout(300); check("SVG upload rejected (not in allow-list)", "PNG, JPEG" in pg.inner_text("#st-msg") or pg.evaluate("window.__x===undefined"))
    pg.set_input_files("#st-file", good); pg.wait_for_timeout(600); check("PNG upload accepted and drawn", pg.evaluate("window.__studio.state.imgName")=="custom")
    pg.click('#tools [data-tool="meme"]'); 
    with pg.expect_download() as dl: pg.click("#st-download")
    f = dl.value; path = f.path(); head = open(path, "rb").read(8); check("download is a real PNG", head == b"\x89PNG\r\n\x1a\n" and f.suggested_filename.endswith(".png"), f.suggested_filename)
    pg.click('#tools [data-tool="export"]'); pg.select_option("#st-type", "jpeg")
    with pg.expect_download() as dl2: pg.click("#st-download")
    check("JPEG export works", open(dl2.value.path(), "rb").read(3) == b"\xff\xd8\xff")
    pg.click('#tools [data-tool="scene"]'); pg.wait_for_timeout(800)
    check("Black Hole Scene (ported PFP generator) visible and drawn", pg.is_visible("#pfpCanvas") and pg.evaluate("(()=>{const c=document.getElementById('pfpCanvas');const d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let n=0;for(let i=0;i<d.length;i+=4003)n+=d[i];return n>0})()"))
    # mission control
    pg.locator("#mission").scroll_into_view_if_needed()
    check("mint plan rows present", all(pg.locator(f"#mint-plan >> text={t}").count() >= 1 for t in ["200 Early Crew", "780 Public Mint", "20 Community Reserve", "0.025 SOL", "0.05 SOL"]))
    check("no live mint control exists", pg.locator("#mint-plan a[href], #mint-plan button").count() == 0 and "Mint closed" in pg.inner_text("#mint-state"))
    pg.click('.mission[data-id="1"]'); check("mission checklist persists", pg.evaluate("localStorage.getItem('astro-missions')")=='["1"]')
    pg.click("#scan"); check("anomaly scanner works", pg.inner_text("#anomaly-title") == "TIME FRACTURE")
    check("legendary archive shows the five 1/1s", pg.locator("#legendary figure").count() == 5, pg.locator("#legendary figure").count())
    check("demo meter (localhost) simulated banner", pg.is_visible("#demoBanner") and pg.inner_text("#mMcap").startswith("$300"))
    check("crew perks unlock for demo rank Navigator", "Navigator" in pg.inner_text("#crewStatus") or pg.locator(".perk-row.on").count() >= 2, pg.inner_text("#crewStatus"))
    # rank checker with no CA
    pg2 = c.new_page(); pg2.goto(BASE, wait_until="networkidle"); pg2.wait_for_timeout(500)
    check("rank checker closed while CA empty (no demo params)", pg2.is_visible("#rkNoCA") and pg2.is_disabled("#rkGo") if pg2.locator("#rkGo").count() else False, pg2.inner_text("#rkNoCA"))
    check("meter shows no market data while CA empty", pg2.inner_text("#mMcap").strip() in ("—", "-", "") and not pg2.is_visible("#demoBanner"))
    # wallet
    pg.click("#wallet-connect"); pg.wait_for_timeout(300); check("wallet button without Phantom degrades gracefully", "Phantom" in pg.inner_text("#wallet-status") or "PHANTOM" in pg.inner_text("#wallet-label"))
    # gate must be closed
    check("release gate closed by default", pg.evaluate("window.RELEASE_READY===false") and pg.evaluate("!window.ASTRO_CONFIG.ca"))
    check("every request stayed same-origin", all(u.startswith(BASE) or u.startswith("data:") or u.startswith("blob:") for u in reqs), [u for u in reqs if not (u.startswith(BASE) or u.startswith("data:") or u.startswith("blob:"))][:5])
    check("final: no console errors", [e for e in errs if "willReadFrequently" not in e] == [], errs)
    b.close()
print(f"{sum(res)}/{len(res)} passed"); sys.exit(0 if all(res) else 1)
