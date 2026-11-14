#!/usr/bin/env node
// One-command test runner: unit/static tests (root), mint unit+CLI tests, art integrity check, mint preflight (must FAIL = launch still blocked),
// and, if a local server is up on :8802, the browser e2e suite. The local-validator test needs solana-test-validator and is run separately (mint: npm run test:local).
import { spawnSync } from 'node:child_process'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'); let failed = 0;
function step(name, cmd, args, cwd = root, expect = 0) { process.stdout.write(`\n=== ${name}\n`); const r = spawnSync(cmd, args, { cwd, stdio: 'inherit' }); const ok = r.status === expect; if (!ok) failed++; console.log(`--- ${ok ? 'OK' : 'FAILED'}: ${name}`); }
step('root unit + static security tests', 'node', ['--test', 'tests/unit.test.mjs']);
step('art integrity (partial allowed)', 'python3', ['launch-kit/validate_collection.py', '--allow-partial']);
step('mint preflight must still BLOCK mainnet (exit 1 expected)', 'python3', ['launch-kit/mint/preflight.py'], root, 1);
step('strict art validation must still FAIL until 1,000 are done (exit 2 expected)', 'python3', ['launch-kit/validate_collection.py'], root, 2);
step('mint unit + CLI safety tests', 'npm', ['test', '--silent'], path.join(root, 'mint'));
const up = await fetch('http://127.0.0.1:8802/').then(r => r.ok).catch(() => false);
if (up) step('browser e2e (server on :8802)', 'python3', ['tests/e2e.py']); else console.log('\n(skipping browser e2e: start `npm run build && npm run serve` first)');
console.log(failed ? `\n${failed} step(s) FAILED` : '\nAll executed steps passed.'); process.exit(failed ? 1 : 0);
