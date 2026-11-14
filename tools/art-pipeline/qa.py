"""Automated QA for generated Astro images. Returns (ok, metrics, reasons). Visual QA (contact sheets) is still required."""
import numpy as np, json, os
from PIL import Image, ImageFilter
HERE=os.path.dirname(os.path.abspath(__file__))
BD={"Common":"#b6afa2","Uncommon":"#87cca1","Rare":"#7dc9fd","Epic":"#68488b","Legendary":"#cb7005"}  # measured on the approved anchors
def hexrgb(h): return np.array([int(h[i:i+2],16) for i in (1,3,5)],float)
def load(p): return Image.open(p).convert("RGB")
def struct(im):
    g=im.convert("L").crop((int(.18*1024),int(.04*1024),int(.82*1024),int(.62*1024))).resize((64,64),Image.LANCZOS).filter(ImageFilter.GaussianBlur(1.2))
    a=np.asarray(g,float); gx=np.abs(np.diff(a,axis=1))[:-1]; gy=np.abs(np.diff(a,axis=0))[:,:-1]; e=np.hypot(gx,gy); e=(e-e.mean())/(e.std()+1e-6); return e
SOFT={'Common':.15,'Uncommon':.12,'Rare':.15,'Epic':.10,'Legendary':.06}  # soft flags only: they send a piece to visual review, never auto-reject
REF=None
def ref():
    global REF
    if REF is None: REF=struct(load(os.path.join(HERE,"refs/common.jpg")))
    return REF
QAHEX={"Stone":"#b2aca0","Sage":"#6d7f64","Dusty Blue":"#8595a2","Mauve":"#8f7a7b","Clay":"#a88f85","Sand":"#b0a380"}  # measured/provisional rendered colors of the Common backdrops
def check(path,tier,bdname=None):
    bd=QAHEX.get(bdname) if tier=="Common" else None
    tol=70 if (tier!="Common" or bdname in (None,"Stone")) else 110
    im=load(path); a=np.asarray(im,float); r=[]; m={}
    if im.size!=(1024,1024): r.append(f"size {im.size}")
    strip=np.r_[a[:40,:180].reshape(-1,3),a[:40,-180:].reshape(-1,3)]; med=np.median(strip,axis=0); cstd=strip.std(0).max()
    m["top_strip_std"]=round(float(cstd),1); m["bg_dist"]=round(float(np.linalg.norm(med-hexrgb(bd or BD[tier]))),1)
    if m["bg_dist"]>tol: r.append(f"backdrop color off ({m['bg_dist']})")
    if cstd>14: r.append(f"backdrop not flat (std {m['top_strip_std']})")
    d=np.linalg.norm(a-med,axis=-1); fg=d>45
    ys,xs=np.where(fg)
    if len(ys)==0: r.append("empty"); return False,m,r
    row=fg[int(.5*1024)]; xs2=np.where(row)[0]; width=(xs2.max()-xs2.min())/1024 if len(xs2) else 0
    m["top"]=round(float(ys.min()/1024),3); m["width50"]=round(float(width),3); m["fg_frac"]=round(float(fg.mean()),3)
    if width<.55: r.append(f"figure too small/narrow ({width:.2f})")
    if m["top"]>.30: r.append(f"figure too low ({m['top']})")
    c=float((struct(im)*ref()).mean()); m["struct_corr"]=round(c,3)
    soft=[]
    if c<SOFT[tier]: soft.append(f"low structure match to reference ({c:.2f} < {SOFT[tier]})")
    m["soft"]=soft
    return (not r),m,r
if __name__=="__main__":
    import sys
    plan={p["n"]:p for p in json.load(open(os.path.join(HERE,"plan.json")))}
    for n in map(int,sys.argv[1:]):
        print(n,plan[n]["tier"],check(os.path.join(HERE,"images",f"{n}.jpg"),plan[n]["tier"],plan[n]["backdrop"]["name"]))
