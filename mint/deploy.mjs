import fs from 'node:fs';
import {createUmi} from '@metaplex-foundation/umi-bundle-defaults';
import {generateSigner,keypairIdentity,publicKey,some,sol,dateTime} from '@metaplex-foundation/umi';
import {mplCore,createCollection} from '@metaplex-foundation/mpl-core';
import {mplCandyMachine,create,addConfigLines,getMerkleRoot,fetchCandyMachine} from '@metaplex-foundation/mpl-core-candy-machine';
// Devnet only. No mainnet transactions are supported by this script.
const c=JSON.parse(fs.readFileSync('deployment.json','utf8'));
const items=JSON.parse(fs.readFileSync(c.itemsFile,'utf8'));
const validUri=s=>typeof s==='string'&&/^https:\/\/(arweave\.net|[a-z0-9.-]+\.ipfs\.[a-z0-9.-]+)\//i.test(s);
if(!validUri(c.collectionUri)||items.length!==1000||new Set(items.map(x=>x.uri)).size!==1000||items.some(x=>!validUri(x.uri)||!x.name||Buffer.byteLength(x.name)>32||Buffer.byteLength(x.uri)>200))throw Error('Need 1000 distinct permanent metadata URIs and collection URI');
if(!Array.isArray(c.allowlist)||new Set(c.allowlist).size!==c.allowlist.length||!c.allowlist.length)throw Error('Unique allowlist required');
const early=Date.parse(c.earlyStart),pub=Date.parse(c.publicStart);if(!(early>Date.now()&&pub>early))throw Error('Future ordered launch dates required');
const umi=createUmi('https://api.devnet.solana.com').use(mplCore()).use(mplCandyMachine());
const kp=umi.eddsa.createKeypairFromSecretKey(Uint8Array.from(JSON.parse(fs.readFileSync(process.env.SOLANA_KEYPAIR,'utf8'))));umi.use(keypairIdentity(kp));
const treasury=publicKey(c.treasury),allowlist=c.allowlist.map(publicKey);const reserve=publicKey(c.reserveWallet);
if(fs.existsSync('deployment-state.json'))throw Error('Existing deployment state: inspect before retrying; do not create duplicate machines');
const collection=generateSigner(umi);const state={network:'devnet',collection:collection.publicKey,machines:{}};const save=()=>fs.writeFileSync('deployment-state.json',JSON.stringify(state,null,2));save();
await createCollection(umi,{collection,name:'ASTROS Genesis',uri:c.collectionUri,plugins:[{type:'Royalties',basisPoints:250,creators:[{address:treasury,percentage:100}],ruleSet:{type:'None'}}]}).sendAndConfirm(umi);
// Three disjoint pools enforce exact allocations. Shuffle externally before deployment; public manifest should disclose pool membership.
for(const [label,offset,count,guards] of [
 ['early',0,200,{allowList:some({merkleRoot:getMerkleRoot(allowlist)}),solPayment:some({lamports:sol(.025),destination:treasury}),startDate:some({date:dateTime(c.earlyStart)}),endDate:some({date:dateTime(c.publicStart)}),mintLimit:some({id:1,limit:2})}],
 ['public',200,780,{solPayment:some({lamports:sol(.05),destination:treasury}),startDate:some({date:dateTime(c.publicStart)}),mintLimit:some({id:2,limit:2})}],
 ['reserve',980,20,{addressGate:some({address:reserve})}]
]){
 const machine=generateSigner(umi);state.machines[label]={address:machine.publicKey,loaded:0};save();
 await (await create(umi,{candyMachine:machine,collection:collection.publicKey,collectionUpdateAuthority:umi.identity,itemsAvailable:count,isMutable:false,configLineSettings:some({prefixName:'',nameLength:32,prefixUri:'',uriLength:200,isSequential:false}),guards})).sendAndConfirm(umi);
 for(let i=0;i<count;i+=3){await addConfigLines(umi,{candyMachine:machine.publicKey,index:i,configLines:items.slice(offset+i,offset+Math.min(i+3,count)).map(({name,uri})=>({name,uri}))}).sendAndConfirm(umi);state.machines[label].loaded=Math.min(i+3,count);save();}
 const m=await fetchCandyMachine(umi,machine.publicKey);if(Number(m.itemsLoaded)!==count)throw Error('On-chain load mismatch');
}
console.log(state);
