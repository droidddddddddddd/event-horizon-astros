"""pHash duplicate check for freshly ingested tokens against every other token already in images/ (same 1024-bit dHash as tools/phash_audit.py).
Usage: python3 dupcheck.py 629 762 ...   -> prints nearest neighbour per token; exit 1 if any <0.10 (near-duplicate, must be regenerated).
Also prints 'similar' (<0.15) neighbours count as a variety warning."""
import sys, os, glob, re
import numpy as np
from PIL import Image
H = os.path.dirname(os.path.abspath(__file__))
def dh(p):
    a = np.asarray(Image.open(p).convert('L').resize((33, 32), Image.Resampling.LANCZOS), dtype=np.float32); return (a[:, 1:] > a[:, :-1]).flatten()
files = {int(re.findall(r'(\d+)\.jpg$', f)[0]): f for f in glob.glob(f'{H}/images/*.jpg')}
cache = {n: dh(f) for n, f in files.items()}; bad = 0
for n in map(int, sys.argv[1:]):
    d = sorted((float((cache[n] != cache[m]).mean()), m) for m in cache if m != n)
    s15 = sum(1 for x, _ in d if x < .15); flag = 'DUP' if d[0][0] < .10 else ('similar' if d[0][0] < .15 else 'ok')
    if flag == 'DUP': bad = 1
    print(f'{n}: nearest #{d[0][1]} dist {d[0][0]:.3f} [{flag}]  neighbours<0.15: {s15}')
sys.exit(bad)
