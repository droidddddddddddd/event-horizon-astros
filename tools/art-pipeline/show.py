"""Compact view: python3 show.py TIER K  -> 'n [code] body'. Full prompt = PRE + body + ' The backdrop is a flat solid ' + BD + ' background (#hex). No scenery, gradient, text, letters, numbers or logos. Original character.'"""
import sys, json, re
plan = json.load(open('plan.json')); man = json.load(open('manifest.json')); tier, k = sys.argv[1], int(sys.argv[2])
PRE = 'Same chubby astronaut character, gritty ink-and-paint style, framing and head position as the reference image. '
for p in [p for p in plan if p['tier'] == tier and man['tokens'][str(p['n'])]['status'] == 'pending'][:k]:
    s = p['prompt'][len(PRE):]; i = s.index(' The backdrop is a flat solid '); m = re.search(r'solid (.*?) background \((#\w+)\)', s)
    print(p['n'], f'[{m.group(1)} {m.group(2)}]', s[:i].replace(f'Variant: {tier.upper()} tier Astro. ', ''))
