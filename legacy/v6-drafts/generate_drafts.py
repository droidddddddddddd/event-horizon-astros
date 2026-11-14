"""Deterministic concept variations, not approved mint art."""
from PIL import Image,ImageDraw,ImageOps,ImageEnhance
from pathlib import Path
import json,random,hashlib
from collections import Counter
root=Path(__file__).resolve().parents[1]; out=root/'assets'/'genesis';out.mkdir(exist_ok=True)
rng=random.Random(73021)
# Correct source sheets are copied into source-art by the packager.
base={}; pools={'Common':[],'Uncommon':[],'Rare':[],'Epic':[],'Legendary':[]}
tiers=['Legendary','Common','Common','Common','Rare','Common','Common','Uncommon','Uncommon','Rare','Common','Uncommon','Uncommon','Uncommon','Uncommon','Common','Uncommon','Uncommon','Common','Common','Epic','Common','Rare','Common','Common']
for sheet in ['first','second']:
 im=Image.open(root/'source-art'/f'{sheet}.jpg').convert('RGB'); w,h=im.size
 for j in range(25):
  x,y=j%5,j//5; left=round((7+x*228)*w/1149); top=round((7+y*261)*h/1312); side=round(221*w/1149)
  key=f'{sheet}-{j+1:02}';base[key]=im.crop((left,top,left+side,top+side)).resize((512,512),Image.Resampling.LANCZOS);pools[tiers[j] if sheet=='first' else 'Common'].append(key)
# Legendary source concepts from the original presentation, not individually new illustrations.
im=Image.open(root/'source-art'/'legendary.png').convert('RGB');w,h=im.size
for j in range(5):
 x=round((41+j*204)*w/1079);y=round(1007*h/1408);side=round(176*w/1079);key=f'legend-{j+1}';base[key]=im.crop((x,y,x+side,y+side)).resize((512,512),Image.Resampling.LANCZOS);pools['Legendary'].append(key)
colors=['#d49a57','#86a6a5','#a78eaf','#b2a27d','#839b79','#c48375','#778ea8','#c2b7a4']; names=['Solar','Ion','Violet','Sand','Moss','Ember','Slate','Ash']; rows=[]
for tier,count in [('Common',550),('Uncommon',250),('Rare',120),('Epic',60),('Legendary',20)]:
 for j in range(count):
  i=len(rows)+1; pool=pools[tier]; key=pool[j%len(pool)]; variant=j//len(pool); color=colors[variant%8]; tone=names[variant%8]; mark=variant//8
  im=base[key].copy(); tint=ImageOps.colorize(ImageOps.grayscale(im),'#16151c',color); im=Image.blend(im,tint,0.10+0.035*(variant%5)); d=ImageDraw.Draw(im,'RGBA')
  # Visible mission insignia, not a hidden serial-number uniqueness trick.
  x,y=455,56; r=25; d.ellipse((x-r,y-r,x+r,y+r),fill=(15,14,19,210),outline=color,width=3)
  for k in range(1+mark%5):
   yy=y-12+k*6;d.line((x-12,yy,x+12,yy),fill=color,width=3)
  if tier in ('Rare','Epic','Legendary'):
   for k in range(12):
    xx=rng.randrange(12,500); yy=rng.randrange(12,100);d.ellipse((xx,yy,xx+3,yy+3),fill=color)
  file=out/f'{i:04}.webp';im.save(file,quality=88,method=2)
  attrs=[{'trait_type':'Rarity','value':tier},{'trait_type':'Base concept','value':key},{'trait_type':'Color treatment','value':tone},{'trait_type':'Mission insignia','value':str(1+mark%5)}]
  rows.append(dict(id=i,tier=tier,name=f'Astro #{i}',image=f'assets/genesis/{file.name}',attributes=attrs,art_status='draft'))
(root/'collection.js').write_text('window.ASTROS='+json.dumps(rows,separators=(',',':'))+';')
(root/'genesis-draft.json').write_text(json.dumps(rows,indent=2)); meta=root/'launch-kit'/'draft-metadata';meta.mkdir(exist_ok=True)
for r in rows:
 (meta/f'{r["id"]:04}.json').write_text(json.dumps(dict(name=r['name'],symbol='ASTROS',description='Event Horizon concept variation; not approved for mint.',image='../../'+r['image'],attributes=r['attributes']),indent=2))
print(Counter(r['tier'] for r in rows)); print('Unique file hashes:',len({hashlib.sha256((root/r['image']).read_bytes()).hexdigest() for r in rows}))
