#!/usr/bin/env python3
"""Build the V7 collection from the v3 Astros art pipeline (/workspace/event-horizon/astros/v3).

Reads v3 plan.json (token n -> tier/traits/title/backdrop) and manifest.json (status). Only tokens with status 'done'
(visually approved, QA'd) count as final art. Writes:
  art/NNNN.jpg                 full-res 1024px (git-ignored; back these up / upload to permanent storage)
  art-manifest.json            sha256 + size per final image (committed; lets anyone verify the archive)
  assets/astros/N.webp         640px web thumbnails used by the site (committed)
  collection.js                window.ASTROS (final art only) + window.ASTROS_STATUS (counts incl. pending)
  launch-kit/production-manifest.json  the 500 collection rows (launch-kit/supply.json tokenIds), art_status approved|pending
Never invents art: pending tokens stay pending and are NOT shown as part of the collection."""
import json, os, sys, shutil, hashlib, collections
from PIL import Image
V3 = sys.argv[1] if len(sys.argv) > 1 else '/workspace/event-horizon/astros/v3'
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
plan = json.load(open(f'{V3}/plan.json')); man = json.load(open(f'{V3}/manifest.json'))
TIERS = ['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary']; LEVEL = {t: i + 1 for i, t in enumerate(TIERS)}
SUPPLY = json.load(open(f'{ROOT}/launch-kit/supply.json'))   # collection supply source of truth (500)
EXPECT = SUPPLY['tiers']; IDS = set(SUPPLY['tokenIds'])
# plan.json still holds the original 1,000 deterministic plan entries; only the 500 in supply.json are the collection.
assert [p['n'] for p in plan] == list(range(1, 1001))
plan = [p for p in plan if p['n'] in IDS]
assert len(plan) == SUPPLY['supply'] and collections.Counter(p['tier'] for p in plan) == EXPECT
assert all(man['tokens'][str(n)]['status'] != 'done' or n in IDS for n in range(1, 1001)), 'an approved Astro is missing from supply.json'
os.makedirs(f'{ROOT}/art', exist_ok=True); os.makedirs(f'{ROOT}/assets/astros', exist_ok=True)
prod, final, amani = [], [], {}
for p in plan:
    n = p['n']; t = man['tokens'][str(n)]; done = t['status'] == 'done'
    attrs = [{'trait_type': 'Tier', 'value': p['tier']}, {'trait_type': 'Tier Level', 'value': LEVEL[p['tier']], 'display_type': 'number'},
             {'trait_type': 'Backdrop', 'value': p['backdrop']['name']}] + [{'trait_type': k, 'value': v} for k, v in p['traits'].items()]
    if p.get('title'): attrs.append({'trait_type': 'Title', 'value': p['title']})
    row = {'id': n, 'name': f'Astro #{n}', 'tier': p['tier'], 'image': f'art/{n:04}.jpg', 'attributes': attrs,
           'art_status': 'approved' if done else 'pending', 'concept': p.get('title') or ''}
    prod.append(row)
    if not done: continue
    src = f'{V3}/images/{n}.jpg'; dst = f'{ROOT}/art/{n:04}.jpg'
    im = Image.open(src); assert im.size == (1024, 1024) and im.mode == 'RGB', (n, im.size, im.mode)
    if not os.path.exists(dst) or hashlib.sha256(open(src, 'rb').read()).hexdigest() != hashlib.sha256(open(dst, 'rb').read()).hexdigest(): shutil.copyfile(src, dst)
    b = open(dst, 'rb').read(); amani[n] = {'sha256': hashlib.sha256(b).hexdigest(), 'bytes': len(b)}
    th = f'{ROOT}/assets/astros/{n}.webp'
    im.resize((512, 512), Image.Resampling.LANCZOS).save(th, quality=80, method=4)
    final.append({'id': n, 'name': row['name'], 'tier': p['tier'], 'title': p.get('title') or '', 'image': f'assets/astros/{n}.webp',
                  'backdrop': p['backdrop'], 'traits': p['traits'], 'art_status': 'approved'})
status = {t: {'total': EXPECT[t], 'done': sum(1 for r in prod if r['tier'] == t and r['art_status'] == 'approved')} for t in TIERS}
for t in TIERS: status[t]['pending'] = status[t]['total'] - status[t]['done']
open(f'{ROOT}/collection.js', 'w').write('window.ASTROS=' + json.dumps(final, separators=(',', ':')) + ';window.ASTROS_STATUS=' + json.dumps(status, separators=(',', ':')) + ';')
json.dump(prod, open(f'{ROOT}/launch-kit/production-manifest.json', 'w'), indent=1)
json.dump({'note': 'sha256 of full-res art/NNNN.jpg for every approved token', 'approved': len(amani), 'files': {f'{n:04}.jpg': v for n, v in amani.items()}}, open(f'{ROOT}/art-manifest.json', 'w'), indent=1)
print('approved', len(final), status)
