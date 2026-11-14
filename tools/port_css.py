#!/usr/bin/env python3
"""One-time port: scope the $HORIZON site's styles.css under .eh-mod so its rank/crew/pfp/meter components can live in the
V7 page without clobbering the new mockup-matching styles. Usage: port_css.py in.css out.css"""
import re, sys
src = open(sys.argv[1]).read()
src = re.sub(r'/\*.*?\*/', '', src, flags=re.S)
def split_top(s, sep=','):
    out, d, cur = [], 0, ''
    for ch in s:
        if ch in '([': d += 1
        if ch in ')]': d -= 1
        if ch == sep and d == 0: out.append(cur); cur = ''
        else: cur += ch
    out.append(cur); return out
def scope(sel):
    parts = []
    for s in split_top(sel):
        s = s.strip()
        if not s: continue
        if s in ('html', 'body', ':root'): parts.append('.eh-mod'); continue
        if s == '*': parts.append('.eh-mod, .eh-mod *'); continue
        s = re.sub(r'^(html|body)\s+', '', s)
        parts.append('.eh-mod ' + s)
    return ', '.join(parts)
def parse(s):
    out, i, n = [], 0, len(s)
    while i < n:
        j = s.find('{', i)
        if j < 0: break
        head = s[i:j].strip(); d = 1; k = j + 1
        while k < n and d:
            if s[k] == '{': d += 1
            elif s[k] == '}': d -= 1
            k += 1
        body = s[j + 1:k - 1]
        if head.startswith('@font-face'): out.append(head + '{' + body.replace('url(assets/', 'url(../fonts/') + '}')
        elif head.startswith('@keyframes'): out.append(head + '{' + body + '}')
        elif head.startswith('@media'): out.append(head + '{' + parse(body) + '}')
        else: out.append(scope(head) + '{' + body + '}')
        i = k
    return '\n'.join(out)
open(sys.argv[2], 'w').write(parse(src) + '\n')
