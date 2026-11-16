#!/usr/bin/env python3
"""Check candidate resolution, exact duplication, and visual similarity to reference sets."""

import argparse
from hashlib import sha256
import json
from pathlib import Path

import numpy as np
from PIL import Image

SUFFIXES = {'.jpg', '.jpeg', '.png', '.webp'}
THRESHOLD = 0.10
REVIEW_THRESHOLD = 0.15


def read_portrait(path):
    image = Image.open(path).convert('RGB')
    width, height = image.size
    middle = image.crop((int(width * 0.18), int(height * 0.12),
                         int(width * 0.82), int(height * 0.85)))
    hashes = []
    for region in (image, middle):
        grayscale = np.asarray(region.convert('L').resize((33, 32), Image.Resampling.LANCZOS))
        hashes.append((grayscale[:, 1:] > grayscale[:, :-1]).ravel())
    return {
        'path': str(path),
        'sha256': sha256(path.read_bytes()).hexdigest(),
        'pixelSha256': sha256(image.tobytes()).hexdigest(),
        'dimensions': [width, height],
        'hashes': np.asarray(hashes),
    }


def check(candidate, comparisons):
    distances = [(float(d[0]), float(d[1]), rival)
                 for rival in comparisons
                 for d in [(candidate['hashes'] != rival['hashes']).mean(axis=1)]]
    distances.sort(key=lambda row: min(row[0], row[1]))
    exact = [row['path'] for row in comparisons
             if candidate['pixelSha256'] == row['pixelSha256']]
    width, height = candidate['dimensions']
    reasons = []
    if width != height or width < 1024:
        reasons.append('below square 1024 px standard')
    if exact:
        reasons.append('pixel duplicate')
    if distances and min(distances[0][:2]) <= THRESHOLD:
        reasons.append('near-duplicate threshold hit')
    return {
        **{key: value for key, value in candidate.items() if key != 'hashes'},
        'automatedStatus': 'blocked' if reasons else 'visual-review-required',
        'reasons': reasons,
        'closest': [{'path': rival['path'], 'wholeImageDistance': round(whole, 4),
                     'centerCropDistance': round(center, 4)}
                    for whole, center, rival in distances[:5]],
        'similarCount': sum(min(whole, center) <= REVIEW_THRESHOLD for whole, center, _ in distances),
        'pixelDuplicates': exact,
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('candidates', type=Path)
    parser.add_argument('--reference', action='append', type=Path, default=[])
    parser.add_argument('--out', required=True, type=Path)
    args = parser.parse_args()
    candidates = portrait_directory(args.candidates)
    references = [image for directory in args.reference for image in portrait_directory(directory)]
    rows = [check(candidate, [rival for rival in [*references, *candidates]
                              if rival['path'] != candidate['path']])
            for candidate in candidates]
    args.out.write_text(json.dumps({'nearDuplicateThreshold': THRESHOLD,
                                    'similarityReviewThreshold': REVIEW_THRESHOLD,
                                    'candidates': rows}, indent=2) + '\n')
    print(f'{len(rows)} candidates screened, {sum(bool(r["reasons"]) for r in rows)} blocked')


def portrait_directory(directory):
    return [read_portrait(path) for path in sorted(directory.iterdir())
            if path.is_file() and path.suffix.lower() in SUFFIXES
            and path.name != 'orange-background-master.png']


if __name__ == '__main__':
    main()
