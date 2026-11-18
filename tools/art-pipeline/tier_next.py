"""Print the next K pending tokens of one tier as JSON lines: n, prompt, absolute ref paths.
Usage: python3 tier_next.py Legendary 4"""
import sys, os, json
H = os.path.dirname(os.path.abspath(__file__)); man = json.load(open(f'{H}/manifest.json')); plan = json.load(open(f'{H}/plan.json'))
tier, k = sys.argv[1], int(sys.argv[2])
SUP = f'{H}/../../launch-kit/supply.json'; IDS = set(json.load(open(SUP))['tokenIds']) if os.path.exists(SUP) else None  # 500-piece collection only
out = [p for p in plan if p['tier'] == tier and man['tokens'][str(p['n'])]['status'] == 'pending' and (IDS is None or p['n'] in IDS)]
for p in out[:k]:
    print(json.dumps({'n': p['n'], 'refs': [f"{H}/{r.split('v3/',1)[1]}" for r in p['refs']], 'prompt': p['prompt']}))
