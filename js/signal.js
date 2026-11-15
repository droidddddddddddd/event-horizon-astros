// Visual teaser only. No mint or payment controls.
const arrival=Date.parse('2026-11-22T00:00:00Z'), clock=document.getElementById('clock');
const alphabet='0123456789ABCDEF';
function tick(){const left=Math.max(0,Math.ceil((arrival-Date.now())/1000));if(!left){clock.textContent='◉';return;}const encoded=(left^0xA7F31).toString(16).toUpperCase().padStart(6,'0');const check=((left*31)>>>0).toString(16).toUpperCase().padStart(8,'0');clock.textContent=encoded.slice(0,2)+'∷'+encoded.slice(2,4)+'∷'+encoded.slice(4)+'  '+check.slice(-4);}
tick();setInterval(tick,1000);
const canvas=document.getElementById('space'),ctx=canvas.getContext('2d'), reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;let w,h,stars=[],frame=0,last=0;
function resize(){const d=Math.min(devicePixelRatio||1,2);w=innerWidth;h=innerHeight;canvas.width=w*d;canvas.height=h*d;ctx.setTransform(d,0,0,d,0,0);stars=Array.from({length:Math.min(420,Math.floor(w*h/1800))},()=>({x:Math.random()*w,y:Math.random()*h,r:.25+Math.random()*1.25,v:.04+Math.random()*.32,a:.15+Math.random()*.7,p:Math.random()*6.28}));}
function draw(t=0){const dt=last?Math.min(40,t-last)/16.67:1;last=t;ctx.clearRect(0,0,w,h);for(const s of stars){if(!reduced){s.x-=s.v*dt;s.y+=s.v*.16*dt;if(s.x<0)s.x=w;if(s.y>h)s.y=0;}ctx.globalAlpha=s.a*(.75+.25*Math.sin(t*.0008+s.p));ctx.fillStyle='#e5e2ef';ctx.beginPath();ctx.arc(s.x,s.y,s.r,0,Math.PI*2);ctx.fill();}ctx.globalAlpha=1;if(!reduced)frame=requestAnimationFrame(draw);}
function reset(){cancelAnimationFrame(frame);resize();last=0;draw();}addEventListener('resize',reset);reset();