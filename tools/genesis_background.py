#!/usr/bin/env python3
"""Make review candidates on the shared #001 background without editing the source archive.

Dependencies: numpy, Pillow, opencv-python-headless.
Gallery WebPs yield 512 px proofs. Native masters and new high-resolution art retain source dimensions.
"""

import argparse
from hashlib import sha256
import json
from pathlib import Path

import cv2
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
GALLERY = ROOT / 'assets' / 'astros'


def load_rgb(path):
    with Image.open(path) as image:
        return np.asarray(image.convert('RGB'))


def build_master(reference, size):
    # This patch is entirely outside the helmet in the original #001 preview.
    # Mirrored repetition keeps the observed low-level texture without seams.
    patch = reference[8:104, 8:56]
    row = np.concatenate((patch, patch[:, ::-1]), axis=1)
    tile = np.concatenate((row, row[::-1]), axis=0)
    repeats = tuple((512 + dim - 1) // dim for dim in tile.shape[:2])
    field = np.tile(tile, (*repeats, 1))[:512, :512]
    return np.asarray(Image.fromarray(field).resize((size, size), Image.Resampling.BICUBIC))


def foreground_mask(rgb):
    size = rgb.shape[0]
    lab = cv2.cvtColor(rgb, cv2.COLOR_RGB2LAB).astype(np.float32)
    small = max(3, round(size * 0.025))
    samples = np.concatenate((lab[:small * 2, :small * 2].reshape(-1, 3),
                              lab[:small * 2, -small * 2:].reshape(-1, 3)))
    backdrop = np.median(samples, axis=0)
    # Fit gradual variation only from narrow side strips close to the corner
    # color. This removes shaded mint bands without fitting across the subject.
    side_width = max(3, size // 100)
    vertical = np.arange(size, dtype=np.float32) / size
    side_fields = []
    for strip in (lab[:, :side_width], lab[:, -side_width:]):
        medians = np.median(strip, axis=1)
        use = (vertical < 0.78) & (np.linalg.norm(medians - backdrop, axis=1) < 22)
        if use.sum() < size * 0.4:
            side_fields.append(np.broadcast_to(backdrop, (size, 3)))
            continue
        model = np.polyfit(vertical[use], medians[use], 1)
        model[0] = np.clip(model[0], -24, 24)
        side_fields.append(model[1] + vertical[:, None] * model[0])
    horizontal = vertical[None, :, None]
    expected = side_fields[0][:, None] * (1 - horizontal) + side_fields[1][:, None] * horizontal
    residual = np.linalg.norm(lab - expected, axis=2)
    corner_spread = np.percentile(np.linalg.norm(samples - backdrop, axis=1), 95)
    threshold = float(np.clip(corner_spread + 7, 10, 24))
    likely_bg = (residual < threshold).astype(np.uint8)
    _, regions = cv2.connectedComponents(likely_bg, connectivity=4)
    edge_labels = np.unique(np.concatenate((regions[0], regions[:size // 2, 0],
                                           regions[:size // 2, -1])))
    edge_labels = edge_labels[edge_labels != 0]
    background = np.isin(regions, edge_labels).astype(np.uint8)

    radius = max(2, round(size / 180))
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * radius + 1,) * 2)
    inner_bg = cv2.erode(background, kernel).astype(bool)
    inner_fg = ~cv2.dilate(background, kernel).astype(bool)
    mask = np.where(background, cv2.GC_PR_BGD, cv2.GC_PR_FGD).astype(np.uint8)
    mask[inner_bg] = cv2.GC_BGD
    mask[inner_fg] = cv2.GC_FGD
    if not inner_bg.any() or not inner_fg.any():
        raise ValueError('could not separate background and foreground')
    cv2.grabCut(rgb, mask, None, np.zeros((1, 65), np.float64),
                np.zeros((1, 65), np.float64), 2, cv2.GC_INIT_WITH_MASK)
    foreground = np.isin(mask, (cv2.GC_FGD, cv2.GC_PR_FGD)).astype(np.uint8)
    count, labels, stats, _ = cv2.connectedComponentsWithStats(foreground, connectivity=8)
    if count <= 1:
        raise ValueError('no foreground after segmentation')
    main = 1 + np.argmax(stats[1:, cv2.CC_STAT_AREA])
    # Preserve smaller detected components for review. They may be character effects.
    alpha = cv2.GaussianBlur(foreground.astype(np.float32), (3, 3), 0.55)
    return alpha, {
        'foregroundFraction': round(float(foreground.mean()), 4),
        'outsideLargestComponentFraction': round(float((foreground.astype(bool) & (labels != main)).mean()), 4),
        'sourceCornerSpread': round(float(corner_spread), 2),
    }


def composite(rgb, background):
    alpha, metrics = foreground_mask(rgb)
    alpha = alpha[:, :, None]
    image = np.rint(rgb * alpha + background * (1 - alpha)).astype(np.uint8)
    return image, metrics


def main():
    cv2.setNumThreads(1)
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--out', required=True, type=Path)
    parser.add_argument('--sources', type=Path, default=GALLERY)
    parser.add_argument('--ids', type=int, nargs='+')
    args = parser.parse_args()
    args.out.mkdir(parents=True, exist_ok=True)
    source_paths = {int(path.stem): path for path in sorted(args.sources.iterdir())
                    if path.is_file() and path.stem.isdecimal()
                    and path.suffix.lower() in {'.jpg', '.jpeg', '.webp', '.png'}}
    if args.out.resolve() == args.sources.resolve():
        parser.error('write candidates to a separate directory')
    reference_path = GALLERY / '1.webp'
    reference = load_rgb(reference_path)
    canonical_master = build_master(reference, 1024)
    master_file = args.out / 'orange-background-master.png'
    Image.fromarray(canonical_master).save(master_file)
    reference_hash = sha256(reference_path.read_bytes()).hexdigest()
    master_hash = sha256(master_file.read_bytes()).hexdigest()
    rows = []
    for token_id in sorted(args.ids or source_paths):
        source = source_paths[token_id]
        rgb = load_rgb(source)
        source_height, source_width = rgb.shape[:2]
        row = {
            'id': token_id,
            'sourceName': source.name,
            'sourceSha256': sha256(source.read_bytes()).hexdigest(),
            'sourceDimensions': [source_width, source_height],
            'status': 'review-required' if source_width >= 1024 else 'resolution-proof-only',
        }
        try:
            if source_width != source_height:
                raise ValueError('source portrait must be square')
            field = np.asarray(Image.fromarray(canonical_master).resize((source_width, source_height),
                                                                         Image.Resampling.BICUBIC))
            result, metrics = composite(rgb, field)
            destination = args.out / f'{token_id:04}.jpg'
            Image.fromarray(result).save(destination, quality=96, subsampling=0, optimize=True)
            row.update(candidateSha256=sha256(destination.read_bytes()).hexdigest(), **metrics)
        except ValueError as error:
            row.update(status='segmentation-failed', reason=str(error))
        rows.append(row)
    (args.out / 'candidate-provenance.json').write_text(json.dumps({
        'reference': 'assets/astros/1.webp',
        'referenceSha256': reference_hash,
        'backgroundSha256': master_hash,
        'backgroundMethod': 'reconstruction from a clear #001 orange field sample',
        'tokens': rows,
    }, indent=2) + '\n')
    print(f'Staged {len(rows)} records in {args.out}')


if __name__ == '__main__':
    main()
