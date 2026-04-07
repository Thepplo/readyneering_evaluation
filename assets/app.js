const Q = [
  { name:'Vitality',   ang:-90, r:3.8, p:3.2,
    dr:'How well the organization sustains energy and pace under prolonged pressure without burning people out.',
    dp:'Whether capacity planning, recovery cycles and wellbeing practices are structurally designed in.' },
  { name:'Emotion',    ang:-18, r:4.1, p:3.6,
    dr:'How leaders and teams regulate emotional responses during conflict, failure and uncertainty.',
    dp:'Whether the organization proactively prepares for predictable emotional patterns in high-pressure phases.' },
  { name:'Mind',       ang: 54, r:3.5, p:3.0,
    dr:'The quality of thinking and decision-making when data is incomplete and time is short.',
    dp:'Whether scenario planning, pre-mortems and assumption-testing are built into how you operate.' },
  { name:'Execution',  ang:126, r:4.3, p:3.9,
    dr:'How decisively and consistently the organization acts under constraint and real time pressure.',
    dp:'Whether decision rights, escalation paths and implementation briefs are defined in advance.' },
  { name:'Alignment',  ang:198, r:3.6, p:3.4,
    dr:'Whether the organization stays coherent — roles, priorities, collaboration — when under stress.',
    dp:'How well the system is designed to survive personnel changes and strategic fragmentation.' }
];

const CX=160, CY=160, OR=125, CIRC=2*Math.PI*OR;
const SVG_NS='http://www.w3.org/2000/svg';
let mode='R', hovered=null;

function rad(d){ return d*Math.PI/180; }
function pos(a){ return { x: CX+OR*Math.cos(rad(a)), y: CY+OR*Math.sin(rad(a)) }; }

function el(tag,attrs){
  const e=document.createElementNS(SVG_NS,tag);
  Object.entries(attrs).forEach(([k,v])=>e.setAttribute(k,v));
  return e;
}

function buildNodes(){
  const g=document.getElementById('nodes');
  g.innerHTML='';
  Q.forEach((q,i)=>{
    const {x,y}=pos(q.ang);
    const score=mode==='R'?q.r:q.p;
    const active=hovered===i;
    const r=18+((score-1)/4)*7;

    const ng=document.createElementNS(SVG_NS,'g');
    ng.style.cursor='pointer';

    // counter-rotate so text stays upright
    ng.setAttribute('transform',`rotate(${-pos(q.ang).x+CX} ${x} ${y})`);

    const circle=el('circle',{
      cx:x, cy:y, r,
      fill: active?'#770136':'#f4e8ee',
      stroke:'#770136','stroke-width':'1.5'
    });

    const nameT=el('text',{
      x, y:y+3, 'text-anchor':'middle',
      'font-size':'8.5','font-weight':'500',
      'letter-spacing':'0.6',
      fill: active?'#fff':'#770136',
      'font-family':"'DM Sans',sans-serif"
    });
    nameT.textContent=q.name.toUpperCase();

    const scoreT=el('text',{
      x, y:y-6, 'text-anchor':'middle',
      'font-size':'10',
      'font-family':"'DM Serif Display',serif",
      fill: active?'rgba(255,255,255,0.75)':'#c4537e'
    });
    scoreT.textContent=score.toFixed(1);

    ng.appendChild(circle);
    ng.appendChild(scoreT);
    ng.appendChild(nameT);

    ng.addEventListener('mouseenter',()=>{ hovered=i; render(); });
    ng.addEventListener('mouseleave',()=>{ hovered=null; render(); });
    ng.addEventListener('click',()=>{ hovered=hovered===i?null:i; render(); });

    g.appendChild(ng);
  });
}

function updateArc(){
  const avg=Q.reduce((s,q)=>s+(mode==='R'?q.r:q.p),0)/Q.length;
  const filled=((avg-1)/4)*CIRC;
  document.getElementById('score-arc')
    .setAttribute('stroke-dasharray',filled.toFixed(1)+' '+CIRC.toFixed(1));
}

function updateCentre(){
  const avgR=Q.reduce((s,q)=>s+q.r,0)/Q.length;
  const avgP=Q.reduce((s,q)=>s+q.p,0)/Q.length;
  document.getElementById('c-r').textContent=avgR.toFixed(1);
  document.getElementById('c-p').textContent=avgP.toFixed(1);
}

function updateInfo(){
  const title=document.getElementById('info-title');
  const desc=document.getElementById('info-desc');
  const meter=document.getElementById('meter');
  if(hovered===null){
    title.textContent='Five quotients of readiness';
    desc.textContent='Hover a quotient node to explore. Each is assessed under pressure and by structural design.';
    meter.style.width='0%';
  } else {
    const q=Q[hovered];
    title.textContent=q.name;
    desc.textContent=mode==='R'?q.dr:q.dp;
    const s=mode==='R'?q.r:q.p;
    meter.style.width=((s-1)/4*100)+'%';
  }
}

function render(){
  buildNodes();
  updateArc();
  updateCentre();
  updateInfo();
}

function setMode(m){
  mode=m;
  document.getElementById('pill-r').classList.toggle('on',m==='R');
  document.getElementById('pill-p').classList.toggle('on',m==='P');
  render();
}

// pause spin on hover
document.getElementById('nodes').addEventListener('mouseenter',()=>{
  document.getElementById('nodes').style.animationPlayState='paused';
});
document.getElementById('nodes').addEventListener('mouseleave',()=>{
  document.getElementById('nodes').style.animationPlayState='running';
});

const dotWrap = document.getElementById('q-dots');

if (dotWrap) {
  Q.forEach((q, i) => {
    const d = document.createElement('div');
    d.className = 'q-dot' + (i === 0 ? ' on' : '');
    d.innerHTML = `<span class="q-dot-tip">${q.name}</span>`;
    dotWrap.appendChild(d);
  });

  let di = 0;
  setInterval(() => {
    dotWrap.querySelectorAll('.q-dot').forEach((d, i) =>
      d.classList.toggle('on', i === di)
    );
    di = (di + 1) % Q.length;
  }, 1600);
}
render();
