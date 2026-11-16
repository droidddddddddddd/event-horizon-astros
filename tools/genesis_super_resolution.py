#!/usr/bin/env python3
"""Stage identity-preserving 2x restorations of the ASTROS gallery sources.

Use the official Real-ESRGAN general-x4v3 weights. Outputs are review candidates
with an explicit source-resolution and model record, never recovered originals.
"""

import argparse
from hashlib import sha256
import json
from pathlib import Path

import cv2
import numpy as np
from PIL import Image
import torch
from torch import nn

from genesis_background import GALLERY, ROOT, build_master, composite, load_rgb

WEIGHT_SHA256 = '8dc7edb9ac80ccdc30c3a5dca6616509367f05fbc184ad95b731f05bece96292'


def load_model(path):
    if sha256(path.read_bytes()).hexdigest() != WEIGHT_SHA256:
        raise ValueError('weights do not match the pinned Real-ESRGAN general-x4v3 release')
    state = torch.load(path, map_location='cpu', weights_only=True)['params']
    layers = [nn.Conv2d(3, 64, 3, 1, 1), nn.PReLU(64)]
    for _ in range(32):
        layers.extend([nn.Conv2d(64, 64, 3, 1, 1), nn.PReLU(64)])
    layers.append(nn.Conv2d(64, 48, 3, 1, 1))
    body = nn.Module()
    body.body = nn.Sequential(*layers)
    body.load_state_dict(state)
    return body.eval().to(memory_format=torch.channels_last)


@torch.inference_mode()
def restore(model, rgb):
    source = torch.from_numpy(rgb.copy()).float().div(255).permute(2, 0, 1).unsqueeze(0)
    source = source.contiguous(memory_format=torch.channels_last)
    detail = nn.functional.pixel_shuffle(model.body(source), 4)
    baseline = nn.functional.interpolate(source, scale_factor=4, mode='nearest')
    result = (detail + baseline).clamp(0, 1)
    result = result[0].permute(1, 2, 0).mul(255).round().byte().numpy()
    # Finish at 2x to reduce noise and preserve the original line weight.
    restored = Image.fromarray(result).resize((1024, 1024), Image.Resampling.LANCZOS)
    base = Image.fromarray(rgb).resize((1024, 1024), Image.Resampling.LANCZOS)
    return np.asarray(Image.blend(base, restored, 0.6))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--weights', type=Path, required=True)
    parser.add_argument('--out', type=Path, required=True)
    parser.add_argument('--ids', type=int, nargs='+')
    parser.add_argument('--threads', type=int, default=4)
    args = parser.parse_args()

    if args.out.resolve().is_relative_to(ROOT):
        parser.error('stage restorations outside the published repository')
    cv2.setNumThreads(1)
    torch.set_num_threads(args.threads)
    model = load_model(args.weights)
    args.out.mkdir(parents=True, exist_ok=True)
    master = build_master(load_rgb(GALLERY / '1.webp'), 1024)
    master_file = args.out / 'orange-background-master.png'
    Image.fromarray(master).save(master_file)
    output_rows = args.out / 'restoration-provenance.jsonl'
    completed = {}
    if output_rows.exists():
        for line in output_rows.read_text().splitlines():
            row = json.loads(line)
            completed[row['id']] = row

    ids = sorted(args.ids or (int(p.stem) for p in GALLERY.glob('*.webp')))
    for token_id in ids:
        source = GALLERY / f'{token_id}.webp'
        destination = args.out / f'{token_id:04}.jpg'
        source_hash = sha256(source.read_bytes()).hexdigest()
        master_hash = sha256(master_file.read_bytes()).hexdigest()
        previous = completed.get(token_id, {})
        if destination.is_file() and previous.get('sourceSha256') == source_hash \
                and previous.get('backgroundSha256') == master_hash \
                and previous.get('backgroundMaskRevision') == 2 \
                and previous.get('modelSha256') == WEIGHT_SHA256 \
                and previous.get('candidateSha256') == sha256(destination.read_bytes()).hexdigest():
            continue

        rgb = load_rgb(source)
        if rgb.shape[:2] != (512, 512):
            raise ValueError(f'unexpected source size for #{token_id}')
        enhanced = restore(model, rgb)
        staged, metrics = composite(enhanced, master)
        Image.fromarray(staged).save(destination, quality=96, subsampling=0, optimize=True)
        row = {
            'id': token_id,
            'source': f'assets/astros/{token_id}.webp',
            'sourceSha256': source_hash,
            'sourceDimensions': [512, 512],
            'candidateDimensions': [1024, 1024],
            'candidateSha256': sha256(destination.read_bytes()).hexdigest(),
            'backgroundSha256': master_hash,
            'modelSha256': WEIGHT_SHA256,
            'backgroundMaskRevision': 2,
            'method': 'Real-ESRGAN general-x4v3 blended at 2x; new orange background',
            'status': 'review-required',
            **metrics,
        }
        with output_rows.open('a') as log:
            log.write(json.dumps(row) + '\n')
        print(f'Staged #{token_id:04}', flush=True)


if __name__ == '__main__':
    main()
