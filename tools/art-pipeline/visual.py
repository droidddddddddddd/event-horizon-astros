"""Visual QA decisions. Usage:
  python3 astros/v3/visual.py reject 12 "face off-model"   # image moved to rejected/, token back to pending (regenerate)
  python3 astros/v3/visual.py approve --tokens 12,30      # explicitly reviewed tokens only
  python3 astros/v3/visual.py approve --tokens 12,30
"""
import sys, os, json, shutil
HERE=os.path.dirname(os.path.abspath(__file__)); MP=os.path.join(HERE,"manifest.json"); man=json.load(open(MP))
if sys.argv[1]=="reject":
    n=sys.argv[2]; t=man["tokens"][n]; why=sys.argv[3] if len(sys.argv)>3 else "visual"
    os.makedirs(os.path.join(HERE,"rejected"),exist_ok=True)
    src=os.path.join(HERE,"images",f"{n}.jpg")
    if os.path.exists(src): shutil.move(src,os.path.join(HERE,"rejected",f"{n}_a{t['attempts']}_visual.jpg"))
    t["status"]="pending"; t.setdefault("visual_rejects",[]).append(why); man["stats"]["rejected"]+=1
elif sys.argv[1]=="approve":
    if "--tokens" not in sys.argv: sys.exit("Explicit visually reviewed IDs required: approve --tokens 12,30")
    selected=set(sys.argv[sys.argv.index("--tokens")+1].split(","))
    if not selected or any(n not in man["tokens"] or man["tokens"][n]["status"] not in ("qa_pass","qa_review") or not os.path.isfile(os.path.join(HERE,"images",f"{n}.jpg")) for n in selected): sys.exit("All selected tokens must have an image and pass automated QA or be flagged for review")
    c=0
    for n,t in man["tokens"].items():
        if t["status"] in ("qa_pass","qa_review") and n in selected: t["status"]="done"; t["qa"]="visual-ok"; man["stats"]["accepted"]+=1; c+=1
    print("approved",c)
else:
    sys.exit("Expected reject or approve")
json.dump(man,open(MP,"w"),indent=1)
