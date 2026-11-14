"""Print the next K pending tokens (interleaved across tiers, proportional) with prompt and refs.
Usage: python3 astros/v3/next.py 8 [--compact]"""
import sys, os, json
HERE=os.path.dirname(os.path.abspath(__file__)); man=json.load(open(os.path.join(HERE,"manifest.json"))); plan=json.load(open(os.path.join(HERE,"plan.json")))
by={}
for p in plan:
    if man["tokens"][str(p["n"])]["status"]=="pending": by.setdefault(p["tier"],[]).append(p)
order=[]
for tier,ps in by.items():
    ps.sort(key=lambda p:p["n"])
    for i,p in enumerate(ps): order.append(((i+.5)/len(ps),p))
order.sort(key=lambda x:x[0])
k=int(sys.argv[1]) if len(sys.argv)>1 else 8
for _,p in order[:k]:
    print(f"### {p['n']} {p['tier']} refs={p['refs']}\n{p['prompt']}\n")
