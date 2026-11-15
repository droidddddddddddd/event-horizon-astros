#!/usr/bin/env python3
"""Cut approved Astros (real art files in art/NNNN.jpg, flat backdrops) out of their backdrop for the home hero.
Soft alpha + colour un-mixing against the backdrop colour (no new generation: pixels come from the approved art).
Usage: python3 tools/make_hero_cutouts.py [--tiers Legendary,Epic,Rare] [--ids 1,2] ; writes assets/hero/NNNN-768.webp + -384.webp
and /workspace/hero-work/cut-sheet-*.jpg (QA contact sheets on the dark scene colour)."""
import sys, json, os
import numpy as np, cv2
from PIL import Image
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
out = os.path.join(root, 'assets', 'hero'); os.makedirs(out, exist_ok=True)
src = open(os.path.join(root, 'collection.js')).read(); data = json.loads(src[src.index('['):src.rindex(']') + 1])
args = sys.argv[1:]
tiers = (args[args.index('--tiers') + 1].split(',') if '--tiers' in args else ['Legendary', 'Epic', 'Rare'])
ids = set(int(x) for x in args[args.index('--ids') + 1].split(',')) if '--ids' in args else None
def smooth(x, a, b): t = np.clip((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t)
def cutout(path):
    im = cv2.imread(path); rgb = cv2.cvtColor(im, cv2.COLOR_BGR2RGB).astype(np.float32)
    lab = cv2.cvtColor(im, cv2.COLOR_BGR2LAB).astype(np.float32); h, w = lab.shape[:2]
    # backdrop colour: median of the top strip (never contains the body in these busts)
    bg_lab = np.median(lab[:10].reshape(-1, 3), 0); bg_rgb = np.median(rgb[:10].reshape(-1, 3), 0)
    d = np.linalg.norm(lab - bg_lab, axis=2)
    near = (d < 14).astype(np.uint8); n, lbl, st, _ = cv2.connectedComponentsWithStats(near)
    touch = set(np.unique(np.concatenate([lbl[0], lbl[-1], lbl[:, 0], lbl[:, -1]]))) - {0}
    bgm = np.zeros((h, w), np.uint8)
    big = [k for k in range(1, n) if k in touch or st[k, 4] > 1500]
    for k in big:
        if k in touch or d[lbl == k].mean() < 6: bgm[lbl == k] = 1   # enclosed gaps (between wings/body) too
    bgm = cv2.dilate(bgm, np.ones((5, 5), np.uint8))
    a = np.where(bgm > 0, smooth(d, 5, 24), 1.0).astype(np.float32)
    a = cv2.GaussianBlur(a, (0, 0), 0.7)
    # drop specks: keep components of alpha>0.5 that are big
    fg = (a > 0.5).astype(np.uint8); n, lbl, st, _ = cv2.connectedComponentsWithStats(fg)
    keep = np.zeros_like(fg)
    for k in [k for k in range(1, n) if st[k, 4] > 2500]: keep[lbl == k] = 1
    keep = cv2.dilate(keep, np.ones((7, 7), np.uint8)); a = a * keep
    # un-mix backdrop from semi-transparent pixels
    aa = np.maximum(a, 1e-3)[..., None]; col = (rgb - (1 - aa) * bg_rgb) / aa
    col = np.where(a[..., None] < 0.999, np.clip(col, 0, 255), rgb)
    # fade the bottom (bust is cut by the canvas; side edges would show a hard vertical cut)
    ys = np.linspace(0, 1, h)[:, None]; a = a * np.clip((1 - ys) / 0.20, 0, 1)
    rgba = np.dstack([col, a * 255]).clip(0, 255).astype(np.uint8)
    # trim to content box (keeps all of it); square canvas centred on the content
    ys_, xs_ = np.nonzero(a > 0.02); y0, y1, x0, x1 = ys_.min(), ys_.max() + 1, xs_.min(), xs_.max() + 1
    return Image.fromarray(rgba, 'RGBA'), (x0, y0, x1, y1)
sel = [t for t in data if t['art_status'] == 'approved' and t['tier'] in tiers and (ids is None or t['id'] in ids)]
meta = {}
for t in sel:
    img, box = cutout(os.path.join(root, 'art', f"{t['id']:04d}.jpg"))
    for s in (768, 384):
        img.resize((s, s), Image.LANCZOS).save(os.path.join(out, f"{t['id']}-{s}.webp"), quality=84, method=6, exact=True)
    meta[t['id']] = box
print(len(sel), 'cutouts')
