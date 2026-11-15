(() => {
'use strict';
const $=id=>document.getElementById(id), root=$('immersion'); if(!root)return;
const read=(k,d)=>{try{return JSON.parse(localStorage.getItem('eh-immersion-'+k))??d}catch{return d}};
const save=(k,v)=>{try{localStorage.setItem('eh-immersion-'+k,JSON.stringify(v))}catch{}};
const hero=document.querySelector('.hero'); if(hero){const dust=document.createElement('div');dust.className='eh-dust';dust.setAttribute('aria-hidden','true');hero.prepend(dust)}
const motion=$('eh-motion');let paused=read('paused',false)===true;
function motionState(){document.documentElement.classList.toggle('eh-paused',paused);motion.setAttribute('aria-pressed',String(paused));motion.textContent=paused?'Resume ambient motion':'Pause ambient motion'}
motionState();motion.onclick=()=>{paused=!paused;save('paused',paused);motionState()};
const sectors=[
['Luna Relay','The last routine message: all systems nominal. The timestamp is tomorrow.',14,65],
['Ceres Station','An empty docking bay. One thousand crew tags remain on the wall.',31,27],
['Europa Array','The receiver hears a heartbeat from beyond the mapped stars.',49,69],
['Titan Dock','A navigation chart shows a route that should not exist.',62,23],
['Gravity Well','A clock runs backwards as the ship approaches the anomaly.',77,70],
['Event Horizon','The final transmission reads: We are still here.',88,35]];
let found=read('sectors',[]);if(!Array.isArray(found))found=[];found=[...new Set(found.filter(i=>Number.isInteger(i)&&i>=0&&i<sectors.length))];
const map=$('eh-map'), out=$('eh-sector'), progress=$('eh-progress');
function update(){progress.textContent=found.length+'/'+sectors.length+' sectors discovered on this device';map.querySelectorAll('button').forEach((b,i)=>b.setAttribute('aria-pressed',String(found.includes(i))))}
sectors.forEach(([name,story,x,y],i)=>{const b=document.createElement('button');b.type='button';b.className='eh-node';b.style.left=x+'%';b.style.top=y+'%';b.textContent=String(i+1);b.setAttribute('aria-label','Explore '+name);b.onclick=()=>{if(!found.includes(i))found.push(i);save('sectors',found);out.textContent=name+' — '+story;update()};map.append(b)});update();
const scenes=[
{t:'Approach',p:'The ship detects a distress signal from inside the gravity well.',a:['Follow the signal','Scan from orbit']},
{t:'Contact',p:'The transmission contains your own voice. A derelict relay appears ahead.',a:['Recover the relay','Record the echo']},
{t:'Crossing',p:'Time fractures. The crew must decide what to carry into the unknown.',a:['Preserve the crew log','Transmit a warning']},
{t:'Beyond',p:'The stars return in unfamiliar positions. Your expedition has survived the crossing.',a:[]}];
let step=0, choices=[];const scene=$('eh-scene'), actions=$('eh-choices');
function show(){const s=scenes[step];scene.textContent=s.t+' — '+s.p;actions.replaceChildren();const opts=s.a.length?s.a:['Restart expedition'];opts.forEach((v,i)=>{const b=document.createElement('button');b.type='button';b.className='btn ghost';b.textContent=v;b.onclick=()=>{if(step===scenes.length-1){step=0;choices=[]}else{choices.push(i);step++;if(step===scenes.length-1){save('completed',true);$('eh-expedition-status').textContent='Expedition completed. Fictional crew badge earned on this device.'}}show()};actions.append(b)})}
if(read('completed',false)===true)$('eh-expedition-status').textContent='Expedition completed. Fictional crew badge earned on this device.';show();
const quiz=$('eh-quiz'), result=$('eh-result');quiz.addEventListener('submit',e=>{e.preventDefault();const f=new FormData(quiz), scores=[0,0,0];for(const k of ['q1','q2','q3']){const n=Number(f.get(k));if(Number.isInteger(n)&&n>=0&&n<3)scores[n]++}const rank=['Signal Hunter','Void Engineer','Horizon Scout'][scores.indexOf(Math.max(...scores))];result.textContent='Your crew archetype: '+rank;save('archetype',rank)});
const previous=read('archetype','');if(['Signal Hunter','Void Engineer','Horizon Scout'].includes(previous))result.textContent='Your crew archetype: '+previous;
$('eh-share').onclick=()=>{const text='I recovered '+found.length+'/6 sectors in EVENT HORIZON / ASTROS. '+(read('completed',false)===true?'I crossed the horizon. ':'')+'Join the expedition.';const u=new URL('https://twitter.com/intent/tweet');u.searchParams.set('text',text);u.searchParams.set('url',location.origin+'/#immersion');window.open(u.href,'_blank','noopener,noreferrer')};
})();