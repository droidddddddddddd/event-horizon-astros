"""Visual QA decisions. Usage:
  python3 astros/v3/visual.py reject 12 "face off-model"   # image moved to rejected/, token back to pending (regenerate)
  python3 astros/v3/visual.py approve                     # every qa_pass / qa_review token still unreviewed -> done (except those listed in --except)
  python3 astros/v3/visual.py approve --except 12,30
"""
import sys, os, json, shutil
HERE=os.path.dirname(os.path.abspath(__file__)); MP=os.path.join(HERE,"manifest.json"); man=json.load(open(MP))
if sys.argv[1]=="reject":
    n=sys.argv[2]; t=man["tokens"][n]; why=sys.argv[3] if len(sys.argv)>3 else "visual"
    os.makedirs(os.path.join(HERE,"rejected"),exist_ok=True)
    src=os.path.join(HERE,"images",f"{n}.jpg")
    if os.path.exists(src): shutil.move(src,os.path.join(HERE,"rejected",f"{n}_a{t['attempts']}_visual.jpg"))
    t["status"]="pending"; t.setdefault("visual_rejects",[]).append(why); man["stats"]["rejected"]+=1
else:
    ex=set()
    if "--except" in sys.argv: ex=set(sys.argv[sys.argv.index("--except")+1].split(","))
    c=0
    for n,t in man["tokens"].items():
        if t["status"] in ("qa_pass","qa_review") and n not in ex: t["status"]="done"; t["qa"]="visual-ok"; man["stats"]["accepted"]+=1; c+=1
    print("approved",c)
json.dump(man,open(MP,"w"),indent=1)
