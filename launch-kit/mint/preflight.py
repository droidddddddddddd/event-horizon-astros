import json, pathlib, sys, re
from collections import Counter
p=pathlib.Path(__file__).resolve().parent
plan=json.loads((p/'plan.json').read_text()); rows=json.loads((p.parent/'production-manifest.json').read_text())
assert sum(x['allocation'] for x in plan['phases'])==plan['supply']==len(rows)==1000
assert Counter(r['tier'] for r in rows)=={'Common':550,'Uncommon':250,'Rare':120,'Epic':60,'Legendary':20}
assert sum(x['allocation']*x['lamports'] for x in plan['phases'])==44_000_000_000
errors=[]
for key in ['treasury','collection','candyMachine','tokenMint']:
 if not re.fullmatch(r'[1-9A-HJ-NP-Za-km-z]{32,44}',plan.get(key) or ''): errors.append('Missing or invalid '+key)
for key in ['earlyStart','publicStart','metadataBase']:
 if not plan.get(key): errors.append('Missing '+key)
missing=sum(r['art_status']!='approved' or not (p.parent/r['image']).is_file() for r in rows)
if missing: errors.append(f'{missing} artwork entries not approved or missing')
print('Supply, rarity and revenue arithmetic passed.')
for e in errors: print('BLOCKED:',e)
sys.exit(bool(errors))
