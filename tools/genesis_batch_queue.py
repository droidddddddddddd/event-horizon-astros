#!/usr/bin/env python3
"""Build a reproducible remaining-art queue once existing types have been reviewed.

Input JSON maps each art-approved ID to one of the collection's character types.
Reviewed artworks are never overwritten. Generated prompts are production briefs,
and their suggested visual traits must be checked against the result before integration.
"""

import argparse
from collections import Counter
import json
from pathlib import Path
import random

ROOT = Path(__file__).resolve().parents[1]
FRAMING = ('Single 1024px or larger square portrait. Centered chunky round head, heavy eyelids, '
           'tiny nose, oversized round helmet, close shoulder crop. Thick pen contour, crosshatching, '
           'chipped matte weathering. Plain #001 orange background. One character, no scene or text.')
TYPE_DIRECTION = {
    'Male': 'Adult male Astro with distinctive face, posture and role-specific equipment',
    'Female': 'Adult female Astro with distinctive face, hairstyle inside the helmet and trade-specific equipment',
    'Baby': 'Baby Astro with small features, round cheeks and a padded infant suit at the established portrait scale',
    'Dog': 'Dog Astro with short expressive muzzle, distinct breed, ears inside the helmet and heavy-lidded eyes',
    'Cat': 'Cat Astro with short muzzle, distinct coat and ear shapes, whiskers inside the helmet and heavy-lidded eyes',
    'Robot': 'Robot Astro with a chunky rounded face, shutter eyes and specific mechanical functions described by its face panels',
    'Alien': 'Alien Astro with a distinctive facial structure, compact head anatomy and clearly nonhuman sensory organs',
}
TIER_DIRECTION = {
    'Common': 'Plain scuffed canvas suit and a restrained utility detail',
    'Uncommon': 'Recognizable custom hardware or a signature visible prop beyond ordinary trim',
    'Rare': 'Distinct brushed alloy suit construction, specific accent lighting and non-generic specialty hardware',
}
ROLES = ['salvage diver', 'flight medic', 'excavator', 'navigator', 'mechanic', 'communications technician',
         'field scientist', 'welder', 'rigger', 'survey pilot', 'cargo operator', 'orbital gardener']
FEATURES = ['offset helmet seam', 'asymmetric shoulder harness', 'low jaw gasket', 'split ceramic earpiece',
            'raised left shoulder guard', 'tilted breathing collar', 'exposed side gauge', 'flat rear visor brace']
POSTURES = ['chin subtly tucked', 'face turned slightly left', 'face tilted three degrees to the right',
            'unimpressed sidelong glance', 'shoulder angle shifted without changing crop', 'direct deadpan stare',
            'asymmetric sleepy brow', 'half-lidded eyes glancing slightly upward']


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('classified', type=Path)
    parser.add_argument('--out', type=Path, required=True)
    args = parser.parse_args()
    manifest = json.loads((ROOT / 'launch-kit' / 'production-manifest.json').read_text())
    tracker = json.loads((ROOT / 'launch-kit' / 'genesis-production-plan.json').read_text())
    classifications = {int(i): kind for i, kind in json.loads(args.classified.read_text()).items()}
    approved = {row['id'] for row in manifest if row['art_status'] == 'approved'}
    if classifications.keys() != approved or set(classifications.values()) - TYPE_DIRECTION.keys():
        parser.error('one verified character type is required for each art-approved ID')
    counts = Counter(classifications.values())
    targets = tracker['targetCharacterTypes']
    if any(counts[kind] > target for kind, target in targets.items()):
        parser.error('current type counts exceed one or more collection targets')
    remaining_types = [kind for kind, target in targets.items() for _ in range(target - counts[kind])]
    remaining_rows = sorted(tracker['pendingTokens'], key=lambda row: row['id'])
    if len(remaining_rows) != len(remaining_types):
        parser.error('remaining type quantities do not reconcile with pending IDs')

    rng = random.Random(20261116)
    combinations = [(role, feature, posture) for role in ROLES for feature in FEATURES for posture in POSTURES]
    rng.shuffle(remaining_types)
    rng.shuffle(combinations)
    result = []
    for row, kind, (role, feature, posture) in zip(remaining_rows, remaining_types, combinations, strict=False):
        tier = row['tier']
        ref = {'Common': 11, 'Uncommon': 18, 'Rare': 10}[tier]
        result.append({
            'id': row['id'], 'tier': tier, 'characterType': kind, 'references': [ref, 1],
            'prompt': f'{TYPE_DIRECTION[kind]}. Character concept: {role}; {feature}; {posture}. '
                      f'{TIER_DIRECTION[tier]}. {FRAMING}',
        })
    if len(result) != len(remaining_rows):
        raise ValueError('concept combinations cannot cover pending supply')
    args.out.write_text(json.dumps(result, indent=2) + '\n')


if __name__ == '__main__':
    main()
