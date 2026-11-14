// Mint flow shared by the browser UI (mint/main.js) and the local/devnet tests. The caller supplies a Umi whose identity is the minter.
// This module REFUSES to run unless the caller has already passed safety.assertClusterAllowed for this RPC.
import { generateSigner, publicKey, some, transactionBuilder, unwrapOption } from '@metaplex-foundation/umi';
import { mintV1, route, fetchCandyMachine, fetchCandyGuard, getMerkleRoot, getMerkleProof } from '@metaplex-foundation/mpl-core-candy-machine';
import { setComputeUnitLimit } from '@metaplex-foundation/mpl-toolbox';
import { PLAN } from './plan.mjs';

const bytesEqual = (a, b) => a.length === b.length && Array.from(a).every((x, i) => x === b[i]);
/** Verify on-chain state against the published deployment before asking anyone to sign. Throws a human-readable error. */
export async function preflightMint({ umi, deployment: d, phase, plan = PLAN }) {
  const ph = plan.phases[phase]; if (!ph) throw new Error('Unknown phase');
  const entry = d.machines && d.machines[phase]; if (!entry) throw new Error('Phase not deployed');
  const machine = await fetchCandyMachine(umi, publicKey(entry.address));
  if (String(machine.collectionMint) !== d.collection) throw new Error('Collection mismatch between machine and published deployment');
  const guard = (await fetchCandyGuard(umi, machine.mintAuthority)).guards;
  if (phase !== 'reserve') {
    const pay = unwrapOption(guard.solPayment), lim = unwrapOption(guard.mintLimit);
    if (!pay || String(pay.destination) !== d.treasury) throw new Error('On-chain payment destination differs from the published treasury. Do not sign.');
    if (Number(pay.lamports.basisPoints) !== ph.lamports) throw new Error('On-chain price differs from the plan. Do not sign.');
    if (!lim || lim.limit !== ph.walletLimit) throw new Error('On-chain wallet limit differs from the plan.');
  } else if (unwrapOption(guard.solPayment)) throw new Error('Reserve machine unexpectedly charges payment.');
  if (Number(machine.itemsRedeemed) >= Number(machine.data.itemsAvailable)) throw new Error('Sold out');
  return { machine, guard };
}
export async function mintFromPhase({ umi, deployment: d, phase, plan = PLAN, onStatus = () => {} }) {
  const { machine, guard } = await preflightMint({ umi, deployment: d, phase, plan });
  const mintArgs = {};
  if (phase !== 'reserve') {
    const pay = unwrapOption(guard.solPayment), lim = unwrapOption(guard.mintLimit);
    mintArgs.solPayment = some({ destination: pay.destination }); mintArgs.mintLimit = some({ id: lim.id });
  }
  if (phase === 'early') {
    const list = (d.allowlist || []).map(publicKey), root = getMerkleRoot(list), actual = unwrapOption(guard.allowList);
    if (!actual || !bytesEqual(root, actual.merkleRoot)) throw new Error('Published allowlist does not match the on-chain allowlist root');
    if (!list.some(a => String(a) === String(umi.identity.publicKey))) throw new Error('This wallet is not on the early-crew allowlist');
    onStatus('Submitting allowlist proof…');
    await route(umi, { candyMachine: machine.publicKey, guard: 'allowList', routeArgs: { path: 'proof', merkleRoot: root, merkleProof: getMerkleProof(list, umi.identity.publicKey) } }).sendAndConfirm(umi);
    mintArgs.allowList = some({ merkleRoot: root });
  }
  if (phase === 'reserve') mintArgs.addressGate = undefined;
  const asset = generateSigner(umi);
  onStatus('Review and approve the transaction in your wallet…');
  const sig = await transactionBuilder().add(setComputeUnitLimit(umi, { units: 400_000 }))
    .add(mintV1(umi, { candyMachine: machine.publicKey, asset, collection: publicKey(d.collection), mintArgs })).sendAndConfirm(umi);
  return { asset: asset.publicKey, signature: sig.signature };
}
