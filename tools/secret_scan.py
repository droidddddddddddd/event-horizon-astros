#!/usr/bin/env python3
"""Repo secret scan (working tree files not ignored by git + full git history of added lines). Exits 1 on any finding.
Looks for: Solana keypair arrays (64 ints), long base58 secret keys, seed-phrase-looking lines, PEM keys, Helius/other API keys in URLs,
GitHub/Slack/AWS/OpenAI tokens, `.env`-style assignments with long secrets, and keypair/.env files that are tracked.
It never prints a matched secret: only file:line, pattern name and a redacted preview."""
import re, subprocess, sys, pathlib
root = pathlib.Path(__file__).resolve().parent.parent
PATTERNS = {
  'solana-keypair-array': re.compile(r'\[\s*(?:\d{1,3}\s*,\s*){62,}\d{1,3}\s*\]'),
  'base58-secret-key(87-88)': re.compile(r'(?<![1-9A-HJ-NP-Za-km-z])[1-9A-HJ-NP-Za-km-z]{86,88}(?![1-9A-HJ-NP-Za-km-z])'),
  'pem-private-key': re.compile(r'-----BEGIN [A-Z ]*PRIVATE KEY-----'),
  'api-key-in-url': re.compile(r'[?&](?:api[-_]?key|apikey|access_token|token)=[A-Za-z0-9\-_]{16,}', re.I),
  'github-token': re.compile(r'\bgh[pousr]_[A-Za-z0-9]{30,}\b'),
  'slack-token': re.compile(r'\bxox[abprs]-[A-Za-z0-9-]{10,}\b'),
  'aws-key': re.compile(r'\bAKIA[0-9A-Z]{16}\b'),
  'openai-style-key': re.compile(r'\bsk-[A-Za-z0-9]{32,}\b'),
  'secret-assignment': re.compile(r'(?i)\b(?:secret|password|passwd|private[_-]?key|seed[_-]?phrase|mnemonic)\b\s*[:=]\s*["\']?[A-Za-z0-9+/=_\-]{16,}'),
  'seed-phrase-like': re.compile(r'(?i)(?:seed phrase|mnemonic|recovery phrase)[^\n]{0,20}[:=]\s*(?:[a-z]{3,8}\s+){11,23}[a-z]{3,8}'),
}
BAD_NAMES = re.compile(r'(^|/)(id\.json|\.env(\..*)?|.*keypair.*\.json|.*\.pem)$', re.I)
ALLOW_NAMES = {'.env.example', 'deployment.example.json'}
def sh(*a): return subprocess.run(a, cwd=root, capture_output=True, text=True, check=False).stdout
findings = []
def scan(text, where):
    for i, line in enumerate(text.splitlines(), 1):
        for name, rx in PATTERNS.items():
            m = rx.search(line)
            if m: findings.append(f'{where}:{i}: {name}: {m.group(0)[:6]}…[redacted {len(m.group(0))} chars]')
files = [f for f in sh('git', 'ls-files', '-co', '--exclude-standard').split('\n') if f]
for f in files:
    p = root / f
    if f.rsplit('/', 1)[-1] in ALLOW_NAMES: pass
    elif BAD_NAMES.search(f): findings.append(f'{f}: file name looks like a key/env file and is NOT ignored')
    if f.startswith('tools/secret_scan.py') or not p.is_file() or p.stat().st_size > 3_000_000: continue
    if p.suffix.lower() in {'.webp', '.jpg', '.jpeg', '.png', '.woff2', '.woff', '.ttf', '.ico', '.gif'}: continue
    try: scan(p.read_text(errors='ignore'), f)
    except Exception: pass
# git history (added lines only)
log = sh('git', 'log', '-p', '--all', '--no-color', '--diff-filter=AM', '-U0', '--', '.', ':(exclude)tools/secret_scan.py', ':(exclude)*.webp', ':(exclude)*.jpg', ':(exclude)package-lock.json')
scan('\n'.join(l[1:] for l in log.split('\n') if l.startswith('+') and not l.startswith('+++')), 'git-history')
n = len(files)
if findings:
    print(f'SECRET SCAN: {len(findings)} finding(s) in {n} files + history'); [print(' ', x) for x in findings[:60]]; sys.exit(1)
print(f'SECRET SCAN: clean ({n} files + git history checked)')
