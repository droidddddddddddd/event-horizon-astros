"""Ingest by 8-char hash prefix of the GenerateImage output file. Usage: python3 ig.py 346=55ca2269 355=a2bb9b70 ...
Runs ingest.py (QA), then dupcheck.py on the ingested tokens."""
import sys, glob, subprocess, os
H = os.path.dirname(os.path.abspath(__file__)); A = '/cursor/stores/user/grok-bot/agents/bf6cb3a3-04a9-472b-9efb-21336dc46874/assets'
args, ns = [], []
for a in sys.argv[1:]:
    n, h = a.split('='); m = glob.glob(f'{A}/{h}*.jpg'); assert len(m) == 1, (a, m); args.append(f'{n}={m[0]}'); ns.append(n)
subprocess.run(['python3', f'{H}/ingest.py'] + args, check=True)
subprocess.run(['python3', f'{H}/dupcheck.py'] + ns)
