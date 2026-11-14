// Devnet/localnet test mint UI (Phantom). It re-verifies the on-chain machine against the published deployment BEFORE asking for a signature.
// Mainnet is not available in this UI: MAINNET_UI is false and assertClusterAllowed would refuse anyway (mainnetEnabled is never passed).
import { Buffer } from 'buffer'; globalThis.Buffer = globalThis.Buffer || Buffer;
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { walletAdapterIdentity } from '@metaplex-foundation/umi-signer-wallet-adapters';
import { mplCore } from '@metaplex-foundation/mpl-core';
import { mplCandyMachine } from '@metaplex-foundation/mpl-core-candy-machine';
import { fetchGenesisHash, assertClusterAllowed, DEVNET_RPC, isLoopback } from './safety.mjs';
import { mintFromPhase } from './mintLogic.mjs';
const MAINNET_UI = false;
const button = document.querySelector('#mint'), status = document.querySelector('#status');
const say = t => { status.textContent = t; };
button.addEventListener('click', async () => {
  button.disabled = true;
  try {
    const r = await fetch('./deployment-public.json', { cache: 'no-store' }); if (!r.ok) throw new Error('No deployment-public.json: deploy to devnet first (see mint/README.md).');
    const d = await r.json().catch(() => { throw new Error('deployment-public.json is missing or invalid: deploy to devnet first (see mint/README.md).'); });
    if (!MAINNET_UI && d.network === 'mainnet-beta') throw new Error('This build refuses mainnet.');
    const rpc = d.network === 'localnet' && d.rpc && isLoopback(d.rpc) ? d.rpc : DEVNET_RPC;
    const cluster = assertClusterAllowed({ declared: d.network, rpcUrl: rpc, genesisHash: await fetchGenesisHash(rpc) });
    say(`Cluster verified: ${cluster}.`);
    const p = window.phantom && window.phantom.solana; if (!p || !p.isPhantom) throw new Error('Open this page with the Phantom extension installed (use a throwaway devnet wallet).');
    await p.connect();
    const umi = createUmi(rpc, { commitment: 'confirmed' }).use(mplCore()).use(mplCandyMachine()).use(walletAdapterIdentity(p));
    const res = await mintFromPhase({ umi, deployment: d, phase: document.querySelector('#phase').value, onStatus: say });
    say(`Confirmed test asset ${res.asset}\nTransaction ${res.signature ? Buffer.from(res.signature).toString('hex').slice(0, 16) + '…' : ''}`);
  } catch (e) { say(String((e && e.message) || e)); } finally { button.disabled = false; }
});
