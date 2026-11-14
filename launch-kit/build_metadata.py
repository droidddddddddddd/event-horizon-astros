import json,sys,hashlib
from pathlib import Path
from collections import Counter
from PIL import Image
root=Path(__file__).parent; rows=json.loads((root/'production-manifest.json').read_text()); base=sys.argv[1].rstrip('/') if len(sys.argv)>1 else ''
assert base.startswith(('https://','ipfs://')), 'Supply verified immutable image base URI'
assert len(rows)==1000 and {r['id'] for r in rows}==set(range(1,1001))
assert Counter(r['tier'] for r in rows)=={'Common':550,'Uncommon':250,'Rare':120,'Epic':60,'Legendary':20}
seen=set(); output=[]
for r in rows:
 assert r['art_status']=='approved', f"Art not approved: {r['id']}"
 f=root/r['image']; im=Image.open(f); assert im.format=='PNG' and im.width==im.height and im.width>=1024; im.verify()
 h=hashlib.sha256(f.read_bytes()).hexdigest(); assert h not in seen, 'Duplicate art'; seen.add(h)
 assert len(r['attributes'])>=2, 'Record actual visual traits'
 output.append({'name':r['name'],'symbol':'ASTROS','description':'Event Horizon genesis collection.','image':base+'/'+f.name,'attributes':r['attributes'],'properties':{'category':'image','files':[{'uri':base+'/'+f.name,'type':'image/png'}]}})
 dest=root/'metadata'; dest.mkdir(exist_ok=True)
for i,m in enumerate(output,1): (dest/f'{i:04}.json').write_text(json.dumps(m,indent=2))
print('Metadata generated; verify uploaded URIs and review on-chain settings separately.')
