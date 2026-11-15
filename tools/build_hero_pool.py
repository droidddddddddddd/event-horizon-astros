#!/usr/bin/env python3
"""Builds js/hero.js from tools/hero.template.js + the curated pool.
Pool = every approved Legendary + Epic + Rare that has a cutout in assets/hero/ and is NOT listed in tools/hero_exclude.json
(tokens whose cutout failed visual QA). Removes cutout files that are not in the pool so nothing unused ships.
Usage: python3 tools/build_hero_pool.py"""
import json, os, re, glob
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
src = open(os.path.join(root, 'collection.js')).read(); data = json.loads(src[src.index('['):src.rindex(']') + 1])
exc = set(json.load(open(os.path.join(root, 'tools', 'hero_exclude.json')))['exclude']) if os.path.exists(os.path.join(root, 'tools', 'hero_exclude.json')) else set()
have = {int(re.match(r'(\d+)-768', os.path.basename(f)).group(1)) for f in glob.glob(os.path.join(root, 'assets', 'hero', '*-768.webp'))}
RANK = {'Legendary': 0, 'Epic': 1, 'Rare': 2}
pool = [{'i': a['id'], 't': a['tier'], 'n': a['title']} for a in sorted(data, key=lambda a: (RANK.get(a['tier'], 9), a['id']))
        if a['art_status'] == 'approved' and a['tier'] in RANK and a['id'] in have and a['id'] not in exc]
if not any(p['i'] == 1 for p in pool): raise SystemExit('Astro #1 (static fallback) must be in the pool')
keep = {p['i'] for p in pool}
for f in glob.glob(os.path.join(root, 'assets', 'hero', '*.webp')):
    if int(os.path.basename(f).split('-')[0]) not in keep: os.remove(f)
tpl = open(os.path.join(root, 'tools', 'hero.template.js')).read()
js = re.sub(r'/\*POOL\*/.*?/\*END\*/', lambda m: '/*POOL*/' + json.dumps(pool, separators=(',', ':')) + '/*END*/', tpl, flags=re.S)
open(os.path.join(root, 'js', 'hero.js'), 'w').write(js)
from collections import Counter
print(len(pool), 'in pool', dict(Counter(p['t'] for p in pool)), 'excluded', sorted(exc))
