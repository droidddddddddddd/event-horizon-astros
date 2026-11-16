#!/usr/bin/env python3
"""Find and restore exact, manifest-pinned Genesis JPEGs from local directories."""

import argparse
from hashlib import sha256
import json
from pathlib import Path


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('sources', nargs='*', type=Path, help='Extracted backup directories to scan')
    parser.add_argument('--restore', action='store_true', help='Copy matches into missing art/ slots')
    args = parser.parse_args()
    for source in args.sources:
        if not source.is_dir():
            parser.error(f'Source directory does not exist: {source}')

    root = Path(__file__).resolve().parents[1]
    manifest = json.loads((root / 'art-manifest.json').read_text())['files']
    pinned_names = {(row['bytes'], row['sha256']): name for name, row in manifest.items()}
    valid_sizes = {size for size, _ in pinned_names}
    art = root / 'art'
    matches = {}
    conflicts = []
    for name, row in manifest.items():
        original = art / name
        if original.is_file() and sha256(original.read_bytes()).hexdigest() == row['sha256']:
            matches[name] = original
        elif original.exists() or original.is_symlink():
            conflicts.append(name)

    for directory in [root / 'tools' / 'art-pipeline' / 'refs', *args.sources]:
        for candidate in sorted(directory.rglob('*')):
            if not candidate.is_file() or candidate.suffix.lower() not in {'.jpg', '.jpeg'}:
                continue
            size = candidate.stat().st_size
            if size in valid_sizes:
                name = pinned_names.get((size, sha256(candidate.read_bytes()).hexdigest()))
                if name is not None:
                    matches.setdefault(name, candidate)

    if args.restore:
        art.mkdir(exist_ok=True)
        for name, candidate in sorted(matches.items()):
            destination = art / name
            if destination.exists() or destination.is_symlink():
                continue
            data = candidate.read_bytes()
            if sha256(data).hexdigest() != manifest[name]['sha256']:
                raise RuntimeError(f'Source changed while recovering {name}: {candidate}')
            with destination.open('xb') as output:
                output.write(data)

    missing = sorted(manifest.keys() - matches.keys())
    print(json.dumps({
        'exactMatches': {name: str(path) for name, path in sorted(matches.items())},
        'missing': missing,
        'conflictingDestinations': conflicts,
    }, indent=2))
    return 1 if missing or conflicts else 0


if __name__ == '__main__':
    raise SystemExit(main())
