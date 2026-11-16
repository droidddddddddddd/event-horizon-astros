#!/usr/bin/env python3
"""Integrate an explicitly reviewed, dHash-screened batch of new portraits."""

import argparse
from collections import Counter
from hashlib import sha256
import json
from pathlib import Path
import shutil

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
TIERS = ['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary']
ORANGE = {'name': 'Astro Orange', 'hex': '#d15f0d', 'prompt': 'the reconstructed #001 orange field'}


def read(path):
    return json.loads(path.read_text())


def write(path, data, indent=2):
    path.write_text(json.dumps(data, indent=indent) + '\n')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('batch', type=Path)
    parser.add_argument('--approve', type=int, nargs='+', required=True)
    args = parser.parse_args()

    rows_path = ROOT / 'launch-kit' / 'production-manifest.json'
    plan_path = ROOT / 'launch-kit' / 'genesis-production-plan.json'
    art_path = ROOT / 'art-manifest.json'
    historic_path = ROOT / 'launch-kit' / 'historical-art-manifest-v7.json'
    gallery_path = ROOT / 'collection.js'
    rows, plan, art = read(rows_path), read(plan_path), read(art_path)
    by_id = {row['id']: row for row in rows}
    pending = {row['id']: row for row in plan['pendingTokens']}
    provenances = {row['id']: row for row in read(args.batch / 'provenance.json')}
    quality = {row['sha256']: row for row in read(args.batch / 'qa.json')['candidates']}
    gallery_start = 'window.ASTROS='
    gallery_text = gallery_path.read_text()
    if not gallery_text.startswith(gallery_start):
        raise ValueError('unexpected collection.js format')
    gallery = json.loads(gallery_text[len(gallery_start):].split(';window.ASTROS_STATUS=', 1)[0])
    approved_ids = {row['id'] for row in gallery}
    pinned_hashes = {row['sha256'] for row in art['files'].values()}
    approved_entries = []
    for token_id in sorted(set(args.approve)):
        row = by_id[token_id]
        provenance = provenances[token_id]
        filename = f'{token_id:04}.jpg'
        source = args.batch / filename
        digest = sha256(source.read_bytes()).hexdigest()
        if token_id in approved_ids or token_id not in pending or row['art_status'] != 'pending' \
                or provenance['tier'] != row['tier'] or provenance['tier'] != pending[token_id]['tier']:
            raise ValueError(f'#{token_id} must be a pending ID in its original tier')
        if digest != provenance['candidateSha256'] or digest in pinned_hashes \
                or quality.get(digest, {}).get('automatedStatus') != 'visual-review-required':
            raise ValueError(f'#{token_id} candidate failed hash or automated QA checks')
        with Image.open(source) as image:
            if image.format != 'JPEG' or image.size != (1024, 1024) or image.mode != 'RGB':
                raise ValueError(f'#{token_id} candidate is not an RGB 1024 x 1024 JPEG')
            image.verify()
        destination = ROOT / row['image']
        thumb = ROOT / 'assets' / 'astros' / f'{token_id}.webp'
        if destination.exists() or thumb.exists():
            raise ValueError(f'#{token_id} would overwrite existing art')
        pinned_hashes.add(digest)
        approved_entries.append((token_id, source, destination, thumb, digest))

    if not historic_path.exists():
        shutil.copyfile(art_path, historic_path)
    for token_id, source, destination, thumb, digest in approved_entries:
        row = by_id[token_id]
        provenance = provenances[token_id]
        traits = provenance['attributes']
        prospective_traits = [{'trait_type': key, 'value': value} for key, value in traits.items()]
        row['attributes'] = [a for a in row['attributes'] if a['trait_type'] in {'Tier', 'Tier Level'}]
        row['attributes'].extend(prospective_traits)
        row['art_status'] = 'approved'
        destination.parent.mkdir(exist_ok=True)
        shutil.copyfile(source, destination)
        with Image.open(source) as image:
            image.resize((512, 512), Image.Resampling.LANCZOS).save(thumb, quality=85, method=4)
        art['files'][destination.name] = {
            'sha256': digest,
            'bytes': destination.stat().st_size,
            'provenance': {**provenance, 'status': 'art-reviewed'},
        }
        gallery.append({'id': token_id, 'name': row['name'], 'tier': row['tier'], 'title': row['concept'],
                        'image': str(thumb.relative_to(ROOT)), 'backdrop': ORANGE,
                        'traits': {key: value for key, value in traits.items() if key != 'Backdrop'},
                        'art_status': 'approved'})
        del pending[token_id]

    totals = Counter(row['tier'] for row in rows)
    remaining = Counter(row['tier'] for row in pending.values())
    status = {tier: {'total': totals[tier], 'done': totals[tier] - remaining[tier],
                     'pending': remaining[tier]} for tier in TIERS}
    art['approved'] = len(gallery)
    art['files'] = dict(sorted(art['files'].items()))
    plan['approved'] = len(gallery)
    plan['pending'] = len(pending)
    plan['pendingByTier'] = dict(remaining)
    plan['pendingTokens'] = list(pending.values())
    compact = (',', ':')
    gallery.sort(key=lambda row: row['id'])
    gallery_path.write_text(gallery_start + json.dumps(gallery, separators=compact)
                            + ';window.ASTROS_STATUS=' + json.dumps(status, separators=compact) + ';')
    write(rows_path, rows, indent=1)
    write(plan_path, plan)
    write(art_path, art, indent=1)
    print(f'Integrated {len(approved_entries)} reviewed portraits. {len(pending)} pending.')


if __name__ == '__main__':
    main()
