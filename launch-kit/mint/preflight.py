#!/usr/bin/env python3
"""Mainnet-readiness preflight. Expected to FAIL (exit 1) until every gate below is real. Never sends anything."""
import json, pathlib, sys, re
from collections import Counter
p = pathlib.Path(__file__).resolve().parent
plan = json.loads((p / 'plan.json').read_text()); rows = json.loads((p.parent / 'production-manifest.json').read_text())
assert sum(x['allocation'] for x in plan['phases']) == plan['supply'] == len(rows) == 1000
assert Counter(r['tier'] for r in rows) == {'Common': 550, 'Uncommon': 250, 'Rare': 120, 'Epic': 60, 'Legendary': 20}
assert sum(x['allocation'] * x['lamports'] for x in plan['phases']) == 200 * 25_000_000 + 780 * 50_000_000 == 44_000_000_000
assert plan['royaltyBasisPoints'] == 250
print('Supply, rarity, royalty and revenue arithmetic passed (max primary revenue 44 SOL before fees).')
B58 = r'[1-9A-HJ-NP-Za-km-z]{32,44}'; errors = []
for k in ['treasury', 'reserveWallet', 'collection', 'tokenMint']:
    if not re.fullmatch(B58, plan.get(k) or ''): errors.append('Missing or invalid ' + k)
for k, v in plan['candyMachines'].items():
    if not re.fullmatch(B58, v or ''): errors.append('Missing or invalid candy machine: ' + k)
for k in ['earlyStart', 'publicStart']:
    if not plan.get(k): errors.append('Missing ' + k)
if not (plan.get('metadataBase') or '').startswith(('https://arweave.net/', 'ipfs://')): errors.append('metadataBase must be permanent storage (arweave/ipfs)')
missing = sum(r['art_status'] != 'approved' or not (p.parent.parent / r['image']).is_file() for r in rows)
if missing: errors.append(f'{missing} of 1000 artwork entries are not approved or missing')
cfg = (p.parent.parent / 'launch-config.js').read_text()
print('INFO: launch-config.js mainnetPaymentsEnabled is currently', 'FALSE (correct for now; flip only after every BLOCKED item below is cleared and reviewed)' if re.search(r'"?mainnetPaymentsEnabled"?\s*:\s*false', cfg) else 'NOT false - review immediately')
for e in errors: print('BLOCKED:', e)
sys.exit(bool(errors))
