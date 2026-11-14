import {createUmi} from '@metaplex-foundation/umi-bundle-defaults';
import {generateSigner,publicKey,some,transactionBuilder,unwrapOption} from '@metaplex-foundation/umi';
import {walletAdapterIdentity} from '@metaplex-foundation/umi-signer-wallet-adapters';
import {mplCore} from '@metaplex-foundation/mpl-core';
import {mplCandyMachine,fetchCandyMachine,fetchCandyGuard,mintV1,route,getMerkleRoot,getMerkleProof} from '@metaplex-foundation/mpl-core-candy-machine';
import {setComputeUnitLimit} from '@metaplex-foundation/mpl-toolbox';
const button=document.querySelector('#mint'),status=document.querySelector('#status');
button.onclick=async()=>{button.disabled=true;try{
 const r=await fetch('./deployment-public.json');if(!r.ok)throw Error('No test deployment configured');const c=await r.json();if(c.network!=='devnet')throw Error('Devnet only');
 const phase=document.querySelector('#phase').value,p=window.phantom?.solana;if(!p?.isPhantom)throw Error('Open in Phantom browser');await p.connect();
 const umi=createUmi('https://api.devnet.solana.com').use(mplCore()).use(mplCandyMachine()).use(walletAdapterIdentity(p));
 const machine=await fetchCandyMachine(umi,publicKey(c.machines[phase].address));const collection=publicKey(c.collection);if(machine.collection!==collection)throw Error('Collection mismatch');
 const guard=await fetchCandyGuard(umi,machine.mintAuthority),g=guard.guards,pay=unwrapOption(g.solPayment),limit=unwrapOption(g.mintLimit);
 if(!pay||pay.destination!==publicKey(c.treasury)||Number(pay.lamports.basisPoints)!==(phase==='early'?25000000:50000000)||!limit||limit.limit!==2)throw Error('Unexpected on-chain payment or limit');
 if(Number(machine.itemsRedeemed)>=Number(machine.data.itemsAvailable))throw Error('Sold out');
 const mintArgs={solPayment:some({destination:pay.destination}),mintLimit:some({id:limit.id})};
 if(phase==='early'){const list=c.allowlist.map(publicKey),root=getMerkleRoot(list),actual=unwrapOption(g.allowList);if(!actual||String(root)!==String(actual.merkleRoot)||!list.includes(umi.identity.publicKey))throw Error('Not eligible');await route(umi,{candyMachine:machine.publicKey,guard:'allowList',routeArgs:{path:'proof',merkleRoot:root,merkleProof:getMerkleProof(list,umi.identity.publicKey)}}).sendAndConfirm(umi);mintArgs.allowList=some({merkleRoot:root});}
 const asset=generateSigner(umi);status.textContent='Review test transaction in Phantom.';await transactionBuilder().add(setComputeUnitLimit(umi,{units:300000})).add(mintV1(umi,{candyMachine:machine.publicKey,asset,collection,mintArgs})).sendAndConfirm(umi);status.textContent='Confirmed test asset: '+asset.publicKey;
}catch(e){status.textContent=String(e.message||e);}finally{button.disabled=false;}};
