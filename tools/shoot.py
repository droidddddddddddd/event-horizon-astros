"""Desktop screenshots of the LOCAL built site (node tools/build-site.mjs && node tools/serve.mjs 8802). python3 tools/shoot.py"""
from playwright.sync_api import sync_playwright
import os, sys
OUT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "screenshots"); os.makedirs(OUT, exist_ok=True)
BASE = "http://127.0.0.1:8802/"
with sync_playwright() as p:
    b = p.chromium.launch(executable_path="/usr/bin/google-chrome", args=["--no-sandbox"])
    c = b.new_context(viewport={"width": 1440, "height": 900}); pg = c.new_page(); errs = []
    pg.on("console", lambda m: errs.append(m.type + ": " + m.text) if m.type in ("error", "warning") else None)
    pg.on("pageerror", lambda e: errs.append("pageerror: " + str(e)))
    pg.goto(BASE, wait_until="networkidle"); pg.wait_for_timeout(1500)
    pg.screenshot(path=f"{OUT}/home.png")
    pg.evaluate("document.querySelector(\".nav\").style.setProperty(\"position\",\"static\")")
    for name, sel in [("collection", "#collection"), ("studio", "#studio"), ("mission-control", "#mission"), ("roadmap", "#roadmap")]:
        pg.locator(sel).scroll_into_view_if_needed(); pg.wait_for_timeout(500); pg.locator(sel).screenshot(path=f"{OUT}/{name}.png")
    pg.screenshot(path=f"{OUT}/full-page.png", full_page=True)
    print("overflow-x:", pg.evaluate("document.documentElement.scrollWidth>window.innerWidth"))
    print("errors:", errs)
    b.close()
