// Network safety. Mainnet is OFF by default and needs ALL of: declared cluster 'mainnet-beta', config.mainnetEnabled === true,
// the live RPC's genesis hash really being mainnet, a typed confirmation phrase, and an interactive terminal. Devnet/localnet need none of that.
export const GENESIS = Object.freeze({
  devnet: 'EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG',
  testnet: '4uhcVJyU9pJkvQyS88uRDiswHXSCkY3zQawwpjk2NsNY',
  'mainnet-beta': '5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d'
});
export const DEVNET_RPC = 'https://api.devnet.solana.com';
export function clusterFromGenesis(hash) { return Object.keys(GENESIS).find(k => GENESIS[k] === hash) || 'unknown'; }
export function isLoopback(rpcUrl) { try { const h = new URL(rpcUrl).hostname; return ['localhost', '127.0.0.1', '::1', '[::1]'].includes(h); } catch { return false; } }
export function mainnetPhrase(treasury) { return `MINT ASTROS ON MAINNET ${String(treasury || '').slice(0, 4)}`; }
export async function fetchGenesisHash(rpcUrl, fetchFn = fetch) {
  const r = await fetchFn(rpcUrl, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'getGenesisHash' }) });
  const j = await r.json(); if (!j.result) throw new Error('Could not read the cluster genesis hash from the RPC; refusing to continue.'); return j.result;
}
/** Throws unless the (declared cluster, RPC, genesis hash) combination is allowed. Returns the actual cluster. Pure: all inputs injected. */
export function assertClusterAllowed({ declared, rpcUrl, genesisHash, mainnetEnabled = false, typedConfirmation = '', treasury = '', interactive = false }) {
  const actual = clusterFromGenesis(genesisHash);
  if (!['devnet', 'localnet', 'mainnet-beta'].includes(declared)) throw new Error(`Cluster '${declared}' is not supported (devnet, localnet or mainnet-beta only).`);
  if (actual === 'testnet') throw new Error('Testnet is not supported.');
  if (declared === 'localnet') {
    if (!isLoopback(rpcUrl)) throw new Error('localnet requires an RPC on localhost/127.0.0.1.');
    if (actual !== 'unknown') throw new Error(`Declared localnet but the RPC is ${actual}.`);
    return 'localnet';
  }
  if (actual !== declared) throw new Error(`Declared ${declared} but the RPC genesis hash says ${actual}. Refusing.`);
  if (declared === 'devnet') return 'devnet';
  // ---- mainnet ----
  if (mainnetEnabled !== true) throw new Error('MAINNET DISABLED: set "mainnetEnabled": true in the deployment config only after art, security review, legal review and devnet verification are complete.');
  if (!interactive) throw new Error('Mainnet needs an interactive terminal for the typed confirmation. Refusing in non-interactive mode.');
  if (typedConfirmation !== mainnetPhrase(treasury)) throw new Error(`Typed confirmation did not match. Expected exactly: ${mainnetPhrase(treasury)}`);
  return 'mainnet-beta';
}
export function assertScaledPlanAllowed(plan, cluster) { if (plan.scaled && cluster === 'mainnet-beta') throw new Error('Scaled test plans can never be used on mainnet.'); }
const B58 = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
export const isBase58Address = s => typeof s === 'string' && B58.test(s);
/** Metadata base must be permanent storage (Arweave gateway or IPFS gateway/ipfs://). A test base is only allowed off-mainnet. */
export function validMetadataBase(base, { allowTest = false } = {}) {
  if (typeof base !== 'string') return false;
  if (/^https:\/\/arweave\.net\/[A-Za-z0-9_-]{43}$/.test(base)) return true;
  if (/^https:\/\/[a-z0-9]{46,70}\.ipfs\.[a-z0-9.-]+$/i.test(base)) return true;
  if (/^https:\/\/(ipfs\.io|gateway\.pinata\.cloud|cloudflare-ipfs\.com)\/ipfs\/[A-Za-z0-9]{46,70}$/.test(base)) return true;
  return allowTest && /^https:\/\/example\.invalid\/[a-z0-9-]+$/.test(base);
}
