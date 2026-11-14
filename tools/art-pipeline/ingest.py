"""Ingest freshly generated images into the manifest and run automated QA.
Usage: python3 astros/v3/ingest.py 12=/path/to/a.jpg 13=/path/b.jpg ...
Status flow: pending -> qa_pass | qa_review (soft flag) | qa_fail (hard fail, will be regenerated) -> done (after visual approval via visual.py)."""
import sys, os, json, shutil
HERE=os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0,HERE)
import qa
MP=os.path.join(HERE,"manifest.json"); plan={p["n"]:p for p in json.load(open(os.path.join(HERE,"plan.json")))}
man=json.load(open(MP))
for arg in sys.argv[1:]:
    n,path=arg.split("=",1); n=int(n); t=man["tokens"][str(n)]; tier=plan[n]["tier"]
    t["traits"]=plan[n]["traits"]; t["backdrop"]=plan[n]["backdrop"]
    t["attempts"]=t.get("attempts",0)+1; man["stats"]["calls"]+=1
    os.makedirs(os.path.join(HERE,"raw"),exist_ok=True); raw=os.path.join(HERE,"raw",f"{n}_a{t['attempts']}.jpg"); shutil.copyfile(path,raw)
    ok,m,why=qa.check(raw,tier,plan[n]["backdrop"]["name"])
    t["metrics"]={k:v for k,v in m.items() if k!="soft"}
    if not ok:
        t["status"]="qa_fail"; t["reasons"]=why; man["stats"]["rejected"]+=1
        os.makedirs(os.path.join(HERE,"rejected"),exist_ok=True); shutil.move(raw,os.path.join(HERE,"rejected",f"{n}_a{t['attempts']}.jpg"))
        print(n,tier,"QA FAIL:",why)
    else:
        shutil.copyfile(raw,os.path.join(HERE,"images",f"{n}.jpg"))
        t["status"]="qa_review" if m["soft"] else "qa_pass"; t["reasons"]=m["soft"]
        print(n,tier,t["status"],m["soft"] or "")
json.dump(man,open(MP,"w"),indent=1)
