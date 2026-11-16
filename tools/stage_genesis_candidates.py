#!/usr/bin/env python3
"""Stage reviewed or proposed new Astro candidates without touching published files."""

import argparse
from hashlib import sha256
import json
from pathlib import Path

import cv2
import numpy as np
from PIL import Image

from genesis_background import GALLERY, ROOT, build_master, composite, load_rgb


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('batch', type=Path, help='JSON rows with id, source path, references and observed traits')
    parser.add_argument('--out', type=Path, required=True)
    args = parser.parse_args()
    if args.out.resolve().is_relative_to(ROOT):
        parser.error('stage candidates outside the published repository')
    args.out.mkdir(parents=True, exist_ok=True)

    cv2.setNumThreads(1)
    plan = json.loads((ROOT / 'launch-kit' / 'genesis-production-plan.json').read_text())
    pending = {row['id']: row['tier'] for row in plan['pendingTokens']}
    selected = json.loads(args.batch.read_text())
    ids = [row['id'] for row in selected]
    if not set(ids) <= set(pending) or len(ids) != len(set(ids)):
        parser.error('batch IDs must be unique and already pending in the production tracker')

    background_path = args.out / 'orange-background-master.png'
    master = build_master(load_rgb(GALLERY / '1.webp'), 1024)
    Image.fromarray(master).save(background_path)
    background_hash = sha256(background_path.read_bytes()).hexdigest()
    staged = []
    for row in selected:
        token_id = row['id']
        source = Path(row['source'])
        rgb = load_rgb(source)
        width, height = rgb.shape[1], rgb.shape[0]
        if width != height or width < 1024:
            raise ValueError(f'#{token_id}: native candidate must be square and at least 1024 px')
        image = np.asarray(Image.fromarray(rgb).resize((1024, 1024), Image.Resampling.LANCZOS))
        normalized, metrics = composite(image, master)
        filename = f'{token_id:04}.jpg'
        output = args.out / filename
        Image.fromarray(normalized).save(output, quality=96, subsampling=0, optimize=True)
        staged.append({
            'id': token_id,
            'tier': pending[token_id],
            'image': filename,
            'sourceName': source.name,
            'sourceDimensions': [width, height],
            'sourceSha256': sha256(source.read_bytes()).hexdigest(),
            'candidateSha256': sha256(output.read_bytes()).hexdigest(),
            'backgroundSha256': background_hash,
            'references': [{'id': ref, 'sha256': sha256((GALLERY / f'{ref}.webp').read_bytes()).hexdigest()}
                           for ref in row['references']],
            'method': 'native raster generation and shared orange background composite',
            'attributes': {'Backdrop': 'Astro Orange', 'Character Type': row['characterType'],
                           **row['observedTraits']},
            'status': 'candidate',
            **metrics,
        })
    (args.out / 'provenance.json').write_text(json.dumps(staged, indent=2) + '\n')
    print(f'Staged {len(staged)} new portraits')


if __name__ == '__main__':
    main()
