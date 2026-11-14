"""Validate final manifest: JSON array of {id,tier,image,name,attributes}; image paths relative to manifest."""
import json,sys,hashlib
from pathlib import Path
from collections import Counter
p=Path(sys.argv[1]); rows=json.loads(p.read_text()); expected={'Common':550,'Uncommon':250,'Rare':120,'Epic':60,'Legendary':20}; errors=[]
if Counter(r['tier'] for r in rows)!=expected: errors.append('Incorrect tier totals')
if sorted(r['id'] for r in rows)!=list(range(1,1001)): errors.append('IDs must be 1–1000')
seen=set()
for r in rows:
 f=p.parent/r['image']
 if not f.is_file(): errors.append(f'Missing {f}');continue
 h=hashlib.sha256(f.read_bytes()).hexdigest()
 if h in seen: errors.append(f'Duplicate image bytes: {f}')
 seen.add(h)
 if not r.get('name') or not isinstance(r.get('attributes'),list): errors.append(f'Invalid metadata: {r["id"]}')
print('\n'.join(errors) if errors else 'Structural checks passed; visual review and on-chain verification still required.')
sys.exit(bool(errors))
