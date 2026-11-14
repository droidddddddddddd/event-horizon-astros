#!/usr/bin/env node
// Deploy the Astros Core collection + Core Candy Machines to DEVNET or a LOCAL validator. Mainnet is disabled by default (see src/safety.mjs).
//   node deploy.mjs --config deployment.json --keypair /path/OUTSIDE/repo/devnet-keypair.json [--dry-run]
// The keypair file is read, never printed, never copied. It must live outside this repository.
import fs from 'node:fs'; import path from 'node:path'; import readline from 'node:readline/promises'; import { fileURLToPath } from 'node:url';
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { keypairIdentity, publicKey } from '@metaplex-foundation/umi';
import { mplCore } from '@metaplex-foundation/mpl-core';
import { mplCandyMachine } from '@metaplex-foundation/mpl-core-candy-machine';
import { PLAN, validatePlan } from './src/plan.mjs';
import { assertClusterAllowed, fetchGenesisHash, DEVNET_RPC, validMetadataBase, mainnetPhrase, isBase58Address } from './src/safety.mjs';
import { deployAll, verifyDeployment, checkConfig } from './src/deployLogic.mjs';

const here = path.dirname(fileURLToPath(import.meta.url)), repo = path.resolve(here, '..');
const arg = (n, d) => { const i = process.argv.indexOf(n); return i > -1 ? process.argv[i + 1] : d; };
const dry = process.argv.includes('--dry-run');
const die = m => { console.error('REFUSED: ' + m); process.exit(1); };

function launchFlags() { // parse the website's launch-config.js (JSON inside Object.freeze) so mainnet needs the same approvals the site shows
  const s = fs.readFileSync(path.join(repo, 'launch-config.js'), 'utf8'); const m = s.match(/Object\.freeze\((\{[\s\S]*\})\);?\s*$/); return JSON.parse(m[1]);
}
function mainnetPreflight(c) {
  const L = launchFlags(), miss = ['artApproved', 'metadataVerified', 'devnetTested', 'securityReviewed', 'termsApproved'].filter(k => L[k] !== true);
  if (miss.length) throw new Error('launch-config.js approval flags not true: ' + miss.join(', '));
  const rows = JSON.parse(fs.readFileSync(path.join(repo, 'launch-kit/production-manifest.json'), 'utf8')), pending = rows.filter(r => r.art_status !== 'approved').length;
  if (pending) throw new Error(`${pending} of ${rows.length} Astros do not have approved art`);
  if (!validMetadataBase(c.metadataBase) || !validMetadataBase(c.metadataBase) ) throw new Error('metadataBase must be permanent storage (Arweave/IPFS), not a test URI');
}
const cfgPath = arg('--config', 'deployment.json'); if (!fs.existsSync(cfgPath)) die(`No ${cfgPath}. Copy deployment.example.json and fill it in (public addresses only).`);
const c = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
validatePlan(PLAN); checkConfig(c, PLAN);
const declared = c.cluster || 'devnet';
const rpcUrl = c.rpc || (declared === 'devnet' ? DEVNET_RPC : declared === 'localnet' ? 'http://127.0.0.1:8899' : '');
if (!rpcUrl) die('config.rpc is required for this cluster (there is no default RPC for mainnet).');
if (!/^https:\/\//.test(rpcUrl) && !/^http:\/\/(localhost|127\.0\.0\.1)/.test(rpcUrl)) die('RPC must be https (or http on localhost).');
if (/api-key=|helius|apikey/i.test(rpcUrl)) console.warn('NOTE: RPC URL looks keyed. It is only used from this process and is never written to any output file.');
if (!validMetadataBase(c.metadataBase, { allowTest: declared !== 'mainnet-beta' && c.allowTestUris === true })) die('metadataBase is not a permanent-storage URI (Arweave/IPFS). Upload metadata first.');
const genesisHash = await fetchGenesisHash(rpcUrl);
let typed = ''; const interactive = !!process.stdin.isTTY && !!process.stdout.isTTY;
if (declared === 'mainnet-beta' && c.mainnetEnabled === true && interactive && !dry) {
  mainnetPreflight(c);
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  typed = await rl.question(`MAINNET. This spends real SOL and cannot be undone. Type exactly: ${mainnetPhrase(c.treasury)}\n> `); rl.close();
}
let actual; try { actual = assertClusterAllowed({ declared, rpcUrl, genesisHash, mainnetEnabled: c.mainnetEnabled === true, typedConfirmation: typed, treasury: c.treasury, interactive }); }
catch (e) { die(e.message); }
console.log(`cluster ok: ${actual} (genesis ${genesisHash.slice(0, 8)}…) · ${dry ? 'DRY RUN, nothing will be sent' : 'sending'}`);
console.log(`plan: ${PLAN.phases.early.allocation} early @ ${PLAN.phases.early.lamports / 1e9} SOL (allowlist ${c.allowlist.length}, ${PLAN.phases.early.walletLimit}/wallet) · ${PLAN.phases.public.allocation} public @ ${PLAN.phases.public.lamports / 1e9} SOL (${PLAN.phases.public.walletLimit}/wallet) · ${PLAN.phases.reserve.allocation} reserve · royalty ${PLAN.royaltyBps / 100}%`);
if (dry) process.exit(0);
const kpPath = path.resolve(arg('--keypair', process.env.SOLANA_KEYPAIR || ''));
if (!kpPath || !fs.existsSync(kpPath)) die('--keypair <file> (or SOLANA_KEYPAIR) is required: a funded keypair file for THIS cluster, stored outside the repo.');
if (kpPath.startsWith(repo + path.sep)) die('The keypair file must be outside the repository.');
const mode = fs.statSync(kpPath).mode & 0o077; if (mode) console.warn('WARNING: keypair file is readable by other users (chmod 600 it).');
if (fs.existsSync('deployment-state.json')) die('deployment-state.json exists: inspect chain state; do not create duplicate machines.');
const umi = createUmi(rpcUrl, { commitment: 'confirmed' }).use(mplCore()).use(mplCandyMachine());
umi.use(keypairIdentity(umi.eddsa.createKeypairFromSecretKey(Uint8Array.from(JSON.parse(fs.readFileSync(kpPath, 'utf8'))))));
console.log('deployer:', String(umi.identity.publicKey));
const state = {}; const save = () => fs.writeFileSync('deployment-state.json', JSON.stringify({ cluster: actual, ...state }, null, 2));
try { await deployAll({ umi, config: c, state, log: m => { console.log(m); save(); } }); }
catch (e) { save(); console.error('Deployment interrupted. State saved to deployment-state.json. Inspect chain state before retrying.\n', e.message); process.exit(1); }
save();
const rep = await verifyDeployment({ umi, state, config: c }); console.log('verification:', rep.ok ? 'OK' : JSON.stringify(rep, null, 1)); if (!rep.ok) process.exit(1);
fs.writeFileSync('deployment-public.json', JSON.stringify({ network: actual, collection: String(state.collection), treasury: c.treasury, reserveWallet: c.reserveWallet, allowlist: c.allowlist, earlyStart: c.earlyStart, publicStart: c.publicStart, rpc: actual === 'localnet' ? rpcUrl : undefined,
  machines: Object.fromEntries(Object.entries(state.machines).map(([k, v]) => [k, { address: String(v.address), items: v.items }])), shuffleSeed: c.shuffleSeed }, null, 2));
fs.writeFileSync('pool-assignment.json', JSON.stringify({ note: 'Disclose with the shuffle seed before launch. Pseudo-random, not cryptographically fair.', shuffleSeed: c.shuffleSeed, pools: state.pools }, null, 2));
console.log('wrote deployment-public.json and pool-assignment.json (public data only).');
