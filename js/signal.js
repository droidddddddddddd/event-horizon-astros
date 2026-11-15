// Fictional teaser; no mint or payment controls. The provisional arrival is public in this static source.
const arrival=Date.parse('2026-11-22T00:00:00Z'), day=86400000;
const fragments=['SHBUJO PU ZLCLU KHFZ','19.9.7.14.1.12','01000101 01001000','13.9.19.19.9.14.7','0x564F4944','20.8.5 1.18.18.9.22.1.12','◉ // NO RETURN'];
const clues=['SEVEN ORBITS. ONE DIRECTION.','THE ALPHABET IS A CIRCLE.','THE SIGNAL ARRIVED BEFORE ITS SOURCE.'];
const phases=['DORMANT','ECHO','DRIFT','DISTORTION','COLLAPSE','THRESHOLD','IMMINENT'];
const indices=[7,19,34,52,71,88,97];
const $=id=>document.getElementById(id);
function tick(){const now=Date.now(), left=Math.max(0,arrival-now), stage=Math.max(0,Math.min(6,7-Math.ceil(left/day))), done=left===0;
 // Early telemetry is a stage code, not a reversible exact timer. Last day exposes coarse hours in hexadecimal.
 const bucket=Math.floor(now/60000), mix=(Math.imul(bucket,2654435761)>>>0).toString(16).toUpperCase().padStart(8,'0');
 $('clock').textContent=done?'00 : 00 : 00 : 00':stage===6?'Ø'+Math.ceil(left/3600000).toString(16).toUpperCase().padStart(2,'0')+' : '+mix.slice(0,2)+' : ██':mix.slice(0,2)+' : '+mix.slice(2,4)+' : '+mix.slice(4,6)+' : '+mix.slice(6);
 $('phase').textContent=done?'CONVERGED':phases[stage];$('index').textContent=(done?100:indices[stage])+'%';
 document.querySelectorAll('#segments i').forEach((el,i)=>el.classList.toggle('active',done||i<=stage));
 $('fragment-id').textContent='FILE_0'+(done?8:stage+1);$('fragment').textContent=done?'FINAL TRANSMISSION // THE HORIZON HAS BEEN CROSSED':fragments[stage];
 if(done)$('message').textContent='The signal is no longer coming from beyond the horizon. It is coming from here.';
}
document.querySelectorAll('[data-key]').forEach(b=>b.addEventListener('click',()=>{$('clue').textContent=clues[Number(b.dataset.key)];}));tick();setInterval(tick,1000);