#!/usr/bin/env python3
"""Generate Metaplex-style metadata JSON (0001.json ...) from the V7 manifest.

usage: python3 launch-kit/build_metadata.py --image-base https://.../images [--allow-partial] [--out DIR]

Strict mode: requires all 500 collection tokens art-approved; writes launch-kit/metadata/. --allow-partial: writes only approved tokens to
launch-kit/metadata-draft/ with "draft" noted in collection.json; those files must NOT be uploaded for a real mint.
The image base must be https:// or ipfs:// (immutable storage, e.g. Arweave). Filenames are 0001.json (9 chars) to match the
candy machine config-line settings (prefixName "Astro #", nameLength 4, uriLength 9).
"""
import json, sys, argparse
from pathlib import Path
root = Path(__file__).resolve().parent.parent
ap = argparse.ArgumentParser(); ap.add_argument('--image-base', required=True); ap.add_argument('--allow-partial', action='store_true'); ap.add_argument('--out')
a = ap.parse_args(); base = a.image_base.rstrip('/')
if not base.startswith(('https://', 'ipfs://')): sys.exit('image base must be https:// or ipfs://')
rows = json.loads((root / 'launch-kit' / 'production-manifest.json').read_text())
pending = [r['id'] for r in rows if r['art_status'] != 'approved']
if pending and not a.allow_partial: sys.exit(f'{len(pending)} tokens are not art-approved. Refusing strict build. (Use --allow-partial for a local draft.)')
out = Path(a.out) if a.out else root / 'launch-kit' / ('metadata-draft' if pending else 'metadata'); out.mkdir(parents=True, exist_ok=True)
DESC = 'One of 500 Astros: original-character explorers of the Event Horizon collection on Solana. Concept art by the Event Horizon team.'
n = 0
for r in rows:
    if r['art_status'] != 'approved': continue
    img = f"{base}/{Path(r['image']).name}"
    (out / f"{r['id']:04}.json").write_text(json.dumps({
        'name': r['name'], 'symbol': 'ASTROS', 'description': DESC, 'image': img,
        'external_url': '', 'seller_fee_basis_points': 250,
        'attributes': r['attributes'],
        'properties': {'category': 'image', 'files': [{'uri': img, 'type': 'image/jpeg'}]}}, indent=2) + '\n'); n += 1
(out / 'collection.json').write_text(json.dumps({'name': 'Astros', 'symbol': 'ASTROS', 'description': DESC, 'seller_fee_basis_points': 250,
    'draft': bool(pending), 'tokens_written': n, 'tokens_pending_art': len(pending)}, indent=2) + '\n')
print(f'wrote {n} metadata files to {out}' + (f' (DRAFT: {len(pending)} tokens still lack approved art; do not upload)' if pending else ''))
