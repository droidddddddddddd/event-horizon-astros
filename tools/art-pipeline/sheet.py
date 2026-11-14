"""Contact sheet(s) of tokens awaiting visual QA (or given tokens), labels drawn in code.
Usage: python3 astros/v3/sheet.py [--tokens 12,13] [--out name]   needs Pillow"""
import sys, os, json
from PIL import Image, ImageDraw, ImageFont
HERE=os.path.dirname(os.path.abspath(__file__)); man=json.load(open(os.path.join(HERE,"manifest.json"))); plan={p["n"]:p for p in json.load(open(os.path.join(HERE,"plan.json")))}
FONT=os.path.join(HERE,"..","..","site","assets","Oxanium.ttf")
toks=[int(x) for x in sys.argv[sys.argv.index("--tokens")+1].split(",")] if "--tokens" in sys.argv else sorted(int(n) for n,t in man["tokens"].items() if t["status"] in ("qa_pass","qa_review"))
name=sys.argv[sys.argv.index("--out")+1] if "--out" in sys.argv else "batch"
f=ImageFont.truetype(FONT,22); fs=ImageFont.truetype(FONT,16)
os.makedirs(os.path.join(HERE,"batches"),exist_ok=True)
S=300; cols=5; per=25; outs=[]
for si in range(0,len(toks),per):
    chunk=toks[si:si+per]; rows=(len(chunk)+cols-1)//cols; pad=10; lab=44
    W=Image.new("RGB",(cols*(S+pad)+pad,rows*(S+lab+pad)+pad),(26,24,28)); d=ImageDraw.Draw(W)
    for i,n in enumerate(chunk):
        x=pad+(i%cols)*(S+pad); y=pad+(i//cols)*(S+lab+pad)
        W.paste(Image.open(os.path.join(HERE,"images",f"{n}.jpg")).convert("RGB").resize((S,S),Image.LANCZOS),(x,y))
        t=man["tokens"][str(n)]; flag=" ?" if t["status"]=="qa_review" else ""
        d.text((x,y+S+4),f"#{n}  {plan[n]['tier']}{flag}",font=f,fill=(255,190,90) if flag else (235,228,215))
        tr=plan[n]["traits"]; d.text((x,y+S+26),f"{tr['Suit']} · {tr['Visor']}"[:38],font=fs,fill=(160,150,135))
    p=os.path.join(HERE,"batches",f"{name}_{si//per+1}.jpg"); W.save(p,quality=88); outs.append(p); print(p,W.size)
