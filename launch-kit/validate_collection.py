#!/usr/bin/env python3
"""Validate the V7 collection manifest against the approved economics and the art on disk.

usage: python3 launch-kit/validate_collection.py [--allow-partial]

Strict mode (default, required before any mainnet work): all 1,000 tokens must be art-approved, tier totals exact,
every approved image present, square JPEG >= 1024px, byte-unique, and matching art-manifest.json hashes.
--allow-partial: same integrity checks on what exists, reports pending counts, exits 0. It NEVER reports the collection complete.
"""
import json, sys, hashlib
from pathlib import Path
from collections import Counter
from PIL import Image
root = Path(__file__).resolve().parent.parent
partial = '--allow-partial' in sys.argv
rows = json.loads((root / 'launch-kit' / 'production-manifest.json').read_text())
artman = json.loads((root / 'art-manifest.json').read_text())['files']
EXPECTED = {'Common': 550, 'Uncommon': 250, 'Rare': 120, 'Epic': 60, 'Legendary': 20}
errors, pending = [], Counter()
if len(rows) != 1000 or sorted(r['id'] for r in rows) != list(range(1, 1001)): errors.append('IDs must be exactly 1..1000')
if Counter(r['tier'] for r in rows) != EXPECTED: errors.append(f'Tier totals wrong: {dict(Counter(r["tier"] for r in rows))}')
seen, approved = {}, 0
for r in rows:
    if r['art_status'] != 'approved':
        pending[r['tier']] += 1; continue
    approved += 1
    f = root / r['image']
    if not f.is_file(): errors.append(f'Missing image {f.name}'); continue
    b = f.read_bytes(); h = hashlib.sha256(b).hexdigest()
    if h in seen: errors.append(f'Byte-duplicate art: {f.name} == {seen[h]}')
    seen[h] = f.name
    if artman.get(f.name, {}).get('sha256') != h: errors.append(f'Hash differs from art-manifest.json: {f.name}')
    try:
        im = Image.open(f)
        if im.format != 'JPEG' or im.width != im.height or im.width < 1024: errors.append(f'{f.name}: need square JPEG >=1024 (got {im.format} {im.size})')
        im.verify()
    except Exception as e: errors.append(f'{f.name}: unreadable ({e})')
    if not r.get('name') or len(r.get('attributes', [])) < 2: errors.append(f'Invalid metadata record {r["id"]}')
    tt = [a['value'] for a in r['attributes'] if a['trait_type'] == 'Tier']
    if tt != [r['tier']]: errors.append(f'Tier attribute mismatch on {r["id"]}')
print(f'approved {approved}/1000; pending {sum(pending.values())} {dict(pending)}')
for e in errors: print('ERROR:', e)
if errors: sys.exit(1)
if pending:
    if partial: print('PARTIAL: integrity OK for approved art. Collection is NOT complete; strict mode will fail.'); sys.exit(0)
    print('INCOMPLETE: strict mode requires all 1,000 art-approved.'); sys.exit(2)
print('Structural checks passed. Perceptual-duplicate audit (tools/phash_audit.py), visual review and on-chain verification are still required.')
