"""axe-core audit of the built site (dev dependency, not shipped): AXE=/path/to/axe.min.js python3 tests/a11y_axe.py. Prints serious/critical + moderate violations."""
from playwright.sync_api import sync_playwright
import os, sys, json
BASE = os.environ.get("BASE", "http://127.0.0.1:8802/"); AXE = os.environ.get("AXE", "/tmp/axe/node_modules/axe-core/axe.min.js")
bad = 0
with sync_playwright() as p:
    b = p.chromium.launch(executable_path="/usr/bin/google-chrome", args=["--no-sandbox"])
    for w, h in [(1440, 900), (375, 812)]:
        c = b.new_context(viewport={"width": w, "height": h}, bypass_csp=True); pg = c.new_page(); pg.goto(BASE, wait_until="networkidle"); pg.wait_for_timeout(800)
        pg.add_script_tag(path=AXE); r = pg.evaluate("axe.run(document,{runOnly:['wcag2a','wcag2aa','wcag21a','wcag21aa','best-practice']}).then(r=>r.violations.map(v=>({id:v.id,impact:v.impact,n:v.nodes.length,help:v.help,ex:v.nodes.slice(0,3).map(n=>n.target.join(' ')+' :: '+(n.any[0]||n.all[0]||n.none[0]||{}).message)})))")
        print(f"--- {w}px: {len(r)} rule violations")
        for v in r:
            print(f"  [{v['impact']}] {v['id']} x{v['n']}: {v['help']}"); [print("      ", e[:220]) for e in v['ex']]
            if v['impact'] in ('serious', 'critical'): bad += 1
        c.close()
    b.close()
sys.exit(1 if bad else 0)
