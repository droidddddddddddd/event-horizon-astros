#!/usr/bin/env python3
"""Perceptual-hash duplicate audit (numpy + Pillow only).

Hash: 1024-bit horizontal-gradient dHash on a 33x32 grayscale resize (insensitive to colour tint, which is how the
V6 drafts were 'varied'). Distance = fraction of differing bits. Calibrated on the V6 drafts: tint/insignia variants of
the same source portrait are <= 0.084 apart; independently drawn portraits are >= 0.114 apart. So 0.10 is the
near-duplicate threshold and 0.15 flags 'similar, review by eye'.
Usage: python3 tools/phash_audit.py <dir> <glob> [--out report.json] [--thr 0.10,0.15]"""
import sys, json, glob, os, re
import numpy as np
from PIL import Image

def dhash(path):
    a = np.asarray(Image.open(path).convert('L').resize((33, 32), Image.Resampling.LANCZOS), dtype=np.float32)
    return (a[:, 1:] > a[:, :-1]).flatten()

def num(p):
    m = re.findall(r'\d+', os.path.basename(p)); return int(m[0]) if m else 0

def audit(files, thrs=(0.10, 0.15)):
    ids = [num(f) for f in files]
    H = np.array([dhash(f) for f in files], dtype=np.int8)
    n = len(files)
    if not n: raise ValueError('No images matched')
    D = np.empty((n, n), dtype=np.float32)
    for i in range(0, n, 16):
        D[i:i+16] = (H[i:i+16, None, :] != H[None, :, :]).sum(-1) / H.shape[1]
    np.fill_diagonal(D, 9.0)
    res = {'count': n, 'hash': 'dHash 33x32 (1024-bit)', 'thresholds': {}}
    for t in thrs:
        par = list(range(n))
        def f(x):
            while par[x] != x: par[x] = par[par[x]]; x = par[x]
            return x
        for i, j in zip(*np.where(np.triu(D <= t, 1))): par[f(i)] = f(j)
        comp = {}
        for i in range(n): comp.setdefault(f(i), []).append(ids[i])
        cl = sorted(comp.values(), key=len, reverse=True)
        res['thresholds'][str(t)] = {
            'distinct_clusters': len(cl), 'redundant_images': n - len(cl),
            'images_with_a_near_duplicate': int((D.min(1) <= t).sum()),
            'largest_cluster': len(cl[0]), 'clusters_of_2plus': sum(1 for c in cl if len(c) > 1),
            'examples': [sorted(c)[:10] for c in cl[:6] if len(c) > 1],
            'review_clusters': [sorted(c) for c in cl if len(c) > 1],
            'review_pairs': [[ids[i], ids[j], round(float(D[i,j]), 4)] for i,j in zip(*np.where(np.triu(D <= t, 1)))]}
    iu = np.triu_indices(n, 1); order = np.argsort(D[iu])[:10]
    res['closest_pairs'] = [(ids[iu[0][k]], ids[iu[1][k]], round(float(D[iu][k]), 3)) for k in order]
    res['min_distance'] = round(float(D[iu].min()), 3) if n > 1 else None
    return res, D, ids

if __name__ == '__main__':
    d, g = sys.argv[1], sys.argv[2]; out = None; thrs = (0.10, 0.15)
    if '--out' in sys.argv: out = sys.argv[sys.argv.index('--out') + 1]
    if '--thr' in sys.argv: thrs = tuple(float(x) for x in sys.argv[sys.argv.index('--thr') + 1].split(','))
    files = sorted(glob.glob(os.path.join(d, g)), key=num)
    res, D, ids = audit(files, thrs)
    if out: json.dump(res, open(out, 'w'), indent=1)
    print(json.dumps(res, indent=1))
