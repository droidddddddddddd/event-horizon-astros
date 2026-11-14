import os, json, collections
HERE=os.path.dirname(os.path.abspath(__file__)); man=json.load(open(os.path.join(HERE,"manifest.json"))); plan={p["n"]:p for p in json.load(open(os.path.join(HERE,"plan.json")))}
c=collections.Counter((plan[int(n)]["tier"],t["status"]) for n,t in man["tokens"].items())
for tier in ("Common","Uncommon","Rare","Epic","Legendary"):
    print(tier.ljust(10),{s:c[(tier,s)] for s in ("done","qa_pass","qa_review","qa_fail","pending") if c[(tier,s)]})
s=man["stats"]; print("calls",s["calls"],"accepted",s["accepted"],"rejected",s["rejected"])
