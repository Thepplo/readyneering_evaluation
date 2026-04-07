/* ─── SCENARIO LIBRARY ─── */
/* Corner order: A=top, B=bottom-left, C=bottom-right
   Score arrays: [A_weight, B_weight, C_weight] mapped to each dimension.
   Each weight ∈ [-1, 1]. Positive = good signal for that dimension.
   Scores are computed as barycentric dot product → normalized to 1–5 scale.
   Resilience dims: R_vitality, R_emotion, R_mind, R_execution, R_alignment
   Preparedness dims: P_vitality, P_emotion, P_mind, P_execution, P_alignment
*/

const TRIADS = [
  /* ── VITALITY 1 ── */
  {
    quotient:"Vitality",
    scenario:"Your organization ran a high-intensity delivery phase — a product launch, merger integration, or regulatory deadline — that required teams to sustain significantly elevated effort for four or more months.",
    question:"What best describes what happened to your people over that period?",
    A:"A few heroes carried it;\nothers checked out",
    B:"People pushed through;\nfatigue was visible",
    C:"Delivered and recovered\nwithout lasting damage",
    scores:{ R_vitality:[-0.7, 0.1, 0.9], P_vitality:[-0.5, -0.1, 0.7] }
  },
  /* ── VITALITY 2 ── */
  {
    quotient:"Vitality",
    scenario:"Budget cuts force a 20% headcount reduction while delivery expectations remain unchanged. The remaining team must absorb the gap for at least six months.",
    question:"Where does your organization's capacity to absorb this come from?",
    A:"Structured buffers;\nwe redistribute deliberately",
    B:"Improvisation and\nindividual commitment",
    C:"We'd struggle;\nthe load exceeds the system",
    scores:{ R_vitality:[0.8, 0.3, -0.7], P_vitality:[0.9, 0.1, -0.8] }
  },
  /* ── VITALITY 3 ── */
  {
    quotient:"Vitality",
    scenario:"After an unusually demanding quarter, leadership reviews whether the team has the energy to sustain another push. Signals are mixed — some people seem fine, others are quietly struggling.",
    question:"How does your organization read and respond to those signals?",
    A:"Structured practices;\nwe monitor and adjust pace",
    B:"Picked up informally;\ndepends on the manager",
    C:"We push through;\nrecovery happens after",
    scores:{ R_vitality:[0.4, 0.2, -0.5], P_vitality:[0.9, 0.3, -0.7] }
  },

  /* ── EMOTION 1 ── */
  {
    quotient:"Emotion",
    scenario:"A high-profile project fails publicly. The team is blamed internally, morale drops sharply, and two senior people consider leaving. The atmosphere is tense for weeks.",
    question:"How are the emotional dynamics handled in your organization?",
    A:"Leaders name it;\nactively rebuild trust",
    B:"Debrief held;\nresidue left to dissipate",
    C:"Move on quickly;\nfailure not discussed",
    scores:{ R_emotion:[0.9, 0.3, -0.7], P_emotion:[0.7, 0.2, -0.6] }
  },
  /* ── EMOTION 2 ── */
  {
    quotient:"Emotion",
    scenario:"Two senior leaders have a significant disagreement about strategic direction. The tension is visible in meetings. People start picking sides and communication between teams deteriorates.",
    question:"What typically happens when interpersonal conflict reaches leadership level?",
    A:"Surfaced quickly;\nresolution is modeled",
    B:"HR mediates eventually;\nbut slowly",
    C:"Plays out broadly\nbefore being named",
    scores:{ R_emotion:[0.9, 0.3, -0.6], P_emotion:[0.6, 0.2, -0.7] }
  },
  /* ── EMOTION 3 ── */
  {
    quotient:"Emotion",
    scenario:"Your organization is preparing to go through a restructuring that will affect roles and reporting lines. Before it is announced, anxiety, speculation and informal lobbying begin to spread.",
    question:"How does your organization manage the emotional climate before and during the change?",
    A:"Facts only;\nno emotional navigation",
    B:"Inconsistent;\nsome leaders engage, others don't",
    C:"Practiced norms;\nuncertainty named openly",
    scores:{ R_emotion:[-0.6, 0.2, 0.5], P_emotion:[-0.7, 0.1, 0.9] }
  },

  /* ── MIND 1 ── */
  {
    quotient:"Mind",
    scenario:"Your organization must decide whether to enter a new market. The data is incomplete, experts disagree, timelines are short, and the decision carries significant strategic risk.",
    question:"How does the decision-making process unfold?",
    A:"Loudest voice\ndrives the conclusion",
    B:"Facts separated from\nassumptions systematically",
    C:"Informal consensus;\nassumptions stay hidden",
    scores:{ R_mind:[-0.8, 0.9, -0.2], P_mind:[-0.6, 0.9, -0.1] }
  },
  /* ── MIND 2 ── */
  {
    quotient:"Mind",
    scenario:"Six months after a major initiative, patterns of underperformance are emerging that were not anticipated. Looking back, warning signals existed but were not acted on.",
    question:"What does your organization's relationship with early warning signals typically look like?",
    A:"Pre-mortems built\ninto our planning",
    B:"Signals exist;\nneeds courage to raise",
    C:"Risk discovered\nin hindsight",
    scores:{ R_mind:[0.4, 0.1, -0.6], P_mind:[0.9, 0.2, -0.8] }
  },
  /* ── MIND 3 ── */
  {
    quotient:"Mind",
    scenario:"A longstanding assumption about your business — a reliable customer segment, a stable supply chain, a regulatory environment — turns out to be wrong. The change has been underway for a year but the organization didn't see it.",
    question:"What does this reveal about your organization's cognitive habits?",
    A:"We stress-test\nassumptions regularly",
    B:"Good at optimizing;\nslow to question",
    C:"Assumptions shared\nbut rarely examined",
    scores:{ R_mind:[0.5, -0.3, -0.6], P_mind:[0.9, -0.2, -0.7] }
  },

  /* ── EXECUTION 1 ── */
  {
    quotient:"Execution",
    scenario:"An unexpected competitor move or regulatory change forces your organization to pivot strategy mid-year. Resources must be reallocated, priorities reshuffled, and some existing projects stopped.",
    question:"What best describes how your organization executes this kind of pivot?",
    A:"Clear criteria;\npivots happen cleanly",
    B:"Happens but messily;\npolitics slow it down",
    C:"Decisions made;\nimplementation lags badly",
    scores:{ R_execution:[0.9, 0.1, -0.7], P_execution:[0.7, 0.0, -0.8] }
  },
  /* ── EXECUTION 2 ── */
  {
    quotient:"Execution",
    scenario:"A critical decision is made at leadership level. Three weeks later, two different teams are implementing it in contradictory ways. Neither realizes the other exists.",
    question:"How common is this in your organization, and why?",
    A:"Rare;\nclear owners and briefs",
    B:"Occasional;\ncaught late but caught",
    C:"Common;\na known structural gap",
    scores:{ R_execution:[0.9, 0.3, -0.7], P_execution:[0.8, 0.2, -0.7] }
  },
  /* ── EXECUTION 3 ── */
  {
    quotient:"Execution",
    scenario:"Your organization needs to make a difficult call quickly — stopping a project, reallocating a key person, or committing significant budget — with incomplete information and real time pressure.",
    question:"What drives the quality of that decision?",
    A:"Pre-agreed principles;\nprocess holds under pressure",
    B:"Whoever is available\nand most confident",
    C:"Stalls or goes\nimpulsive — no middle ground",
    scores:{ R_execution:[0.4, -0.3, -0.7], P_execution:[0.9, -0.4, -0.8] }
  },

  /* ── ALIGNMENT 1 ── */
  {
    quotient:"Alignment",
    scenario:"Your most operationally critical team lead resigns with two weeks' notice during a peak delivery period. No successor has been identified. The team is anxious and no one has formal authority.",
    question:"What happens to operational stability?",
    A:"Minimal disruption;\nshared clarity holds",
    B:"Real strain;\na few absorb the gap",
    C:"Instability;\neverything depended on them",
    scores:{ R_alignment:[0.9, 0.1, -0.8], P_alignment:[0.8, 0.0, -0.9] }
  },
  /* ── ALIGNMENT 2 ── */
  {
    quotient:"Alignment",
    scenario:"During a high-pressure delivery phase, three teams realize they have conflicting priorities and contradictory understandings of what 'success' means for the same initiative.",
    question:"How does your organization resolve this in practice?",
    A:"Fast escalation;\nclean decision for all",
    B:"Informal negotiation;\nuneven resolution",
    C:"Each team carries on;\nconflict surfaces at the end",
    scores:{ R_alignment:[0.9, 0.2, -0.8], P_alignment:[0.7, 0.1, -0.7] }
  },
  /* ── ALIGNMENT 3 ── */
  {
    quotient:"Alignment",
    scenario:"Your organization launches a new strategic direction. Six months later, teams at different levels describe the strategy in noticeably different — sometimes contradictory — ways.",
    question:"What does this tell you about how strategic clarity works in your organization?",
    A:"Intent cascades clearly\nat every level",
    B:"Clear at the top;\nfragments going down",
    C:"Documents exist;\nclarity is assumed not verified",
    scores:{ R_alignment:[0.3, -0.4, -0.6], P_alignment:[0.9, -0.3, -0.7] }
  }
];

/* ── SVG TRIANGLE SYSTEM ──────────────────────────────────────────────────
   Pure SVG: coordinates are always exact — no canvas DPI, no CSS scale math.
   viewBox is 440×430. Three fixed vertices:
     A = top (apex), B = bottom-left, C = bottom-right
   getScreenCTM().inverse() converts any click/touch to viewBox space.
────────────────────────────────────────────────────────────────────────── */
const QDIMS = ["Vitality","Emotion","Mind","Execution","Alignment"];
let current=0, placements={};

const VW=500, VH=400;
const TA={x:250, y:60};
const TB={x:52,  y:340};
const TC={x:448, y:340};
const GX=(TA.x+TB.x+TC.x)/3, GY=(TA.y+TB.y+TC.y)/3;

function bary(px,py){
  const d=(TB.y-TC.y)*(TA.x-TC.x)+(TC.x-TB.x)*(TA.y-TC.y);
  const a=((TB.y-TC.y)*(px-TC.x)+(TC.x-TB.x)*(py-TC.y))/d;
  const b=((TC.y-TA.y)*(px-TC.x)+(TA.x-TC.x)*(py-TC.y))/d;
  const c=1-a-b;
  return [a,b,c];
}

function inTri(px,py){
  const [a,b,c]=bary(px,py);
  return a>=-0.02 && b>=-0.02 && c>=-0.02;
}

function svgPoint(svg,e){
  const pt=svg.createSVGPoint();
  const src=e.touches?e.touches[0]:e;
  pt.x=src.clientX; pt.y=src.clientY;
  return pt.matrixTransform(svg.getScreenCTM().inverse());
}


function makeSVGTriangle(idx,triad){
  /* Layout: pure SVG, labels rendered as foreignObject so they wrap/size naturally.
     Triangle sits in centre; label zones are outside each vertex.
     VW=500, VH=400. Vertices pulled in from edges to leave room for labels.
  */
  const W=500, H=400;
  const Ax=250, Ay=60;   // apex (top, centred)
  const Bx=52,  By=340;  // bottom-left
  const Cx=448, Cy=340;  // bottom-right
  const gx=(Ax+Bx+Cx)/3, gy=(Ay+By+Cy)/3;

  // label box helpers — split on \n, produce tspan lines
  function lines(txt){ return txt.split('\n'); }
  function tspans(txt, anchor, x){
    return lines(txt).map((l,i)=>
      `<tspan x="${x}" dy="${i===0?'0':'1.3em'}" text-anchor="${anchor}">${l}</tspan>`
    ).join('');
  }

  // A label: centred above apex
  const aY = Ay - 12;
  const aLines = lines(triad.A);

  // B label: left-aligned below bottom-left vertex
  const bLines = lines(triad.B);

  // C label: right-aligned below bottom-right vertex
  const cLines = lines(triad.C);

  return `<div style="position:relative;width:100%;padding-bottom:4px">
  <svg id="tri-${idx}" viewBox="0 0 ${W} ${H}" width="100%"
    style="display:block;cursor:crosshair;touch-action:none;user-select:none;overflow:visible"
    xmlns="http://www.w3.org/2000/svg">

    <!-- guide lines centroid → edge midpoints -->
    <line x1="${gx}" y1="${gy}" x2="${(Ax+Bx)/2}" y2="${(Ay+By)/2}" stroke="rgba(83,74,183,0.1)" stroke-width="1"/>
    <line x1="${gx}" y1="${gy}" x2="${(Bx+Cx)/2}" y2="${(By+Cy)/2}" stroke="rgba(83,74,183,0.1)" stroke-width="1"/>
    <line x1="${gx}" y1="${gy}" x2="${(Cx+Ax)/2}" y2="${(Cy+Ay)/2}" stroke="rgba(83,74,183,0.1)" stroke-width="1"/>

    <!-- triangle fill + border -->
    <polygon points="${Ax},${Ay} ${Bx},${By} ${Cx},${Cy}"
      fill="rgba(83,74,183,0.05)" stroke="rgba(83,74,183,0.28)" stroke-width="1.5" stroke-linejoin="round"/>

    <!-- corner vertex dots -->
    <circle cx="${Ax}" cy="${Ay}" r="5" fill="#534AB7" opacity="0.5"/>
    <circle cx="${Bx}" cy="${By}" r="5" fill="#534AB7" opacity="0.5"/>
    <circle cx="${Cx}" cy="${Cy}" r="5" fill="#534AB7" opacity="0.5"/>

    <!-- A label: centred, above apex, split on newline -->
    <text font-size="12" fill="#3a3a38" font-weight="500"
      font-family="-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif"
      y="${aY - (aLines.length-1)*16}">
      ${tspans(triad.A,'middle',Ax)}
    </text>

    <!-- B label: left-aligned, below bottom-left vertex -->
    <text font-size="12" fill="#3a3a38" font-weight="500"
      font-family="-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif"
      y="${By+22}">
      ${tspans(triad.B,'start',Bx)}
    </text>

    <!-- C label: right-aligned, below bottom-right vertex -->
    <text font-size="12" fill="#3a3a38" font-weight="500"
      font-family="-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif"
      y="${Cy+22}">
      ${tspans(triad.C,'end',Cx)}
    </text>

    <!-- placement dot (invisible until placed) -->
    <circle id="ring-${idx}" cx="-999" cy="-999" r="20" fill="rgba(83,74,183,0.13)" opacity="0" style="pointer-events:none"/>
    <circle id="dot-${idx}"  cx="-999" cy="-999" r="11" fill="#534AB7"              opacity="0" style="pointer-events:none"/>
    <circle id="pip-${idx}"  cx="-999" cy="-999" r="5"  fill="#ffffff"              opacity="0" style="pointer-events:none"/>

    <!-- full-area transparent hit target (on top) -->
    <rect x="0" y="0" width="${W}" height="${H}" fill="transparent"/>
  </svg>
</div>`;
}

function attachEvents(idx){
  const svg=document.getElementById(`tri-${idx}`);
  if(!svg)return;

  function place(e){
    e.preventDefault();
    e.stopPropagation();
    const {x,y}=svgPoint(svg,e);
    if(!inTri(x,y))return;
    placements[idx]={x,y};

    document.getElementById(`ring-${idx}`).setAttribute('cx',x);
    document.getElementById(`ring-${idx}`).setAttribute('cy',y);
    document.getElementById(`ring-${idx}`).setAttribute('opacity','1');
    document.getElementById(`dot-${idx}`).setAttribute('cx',x);
    document.getElementById(`dot-${idx}`).setAttribute('cy',y);
    document.getElementById(`dot-${idx}`).setAttribute('opacity','1');
    document.getElementById(`pip-${idx}`).setAttribute('cx',x);
    document.getElementById(`pip-${idx}`).setAttribute('cy',y);
    document.getElementById(`pip-${idx}`).setAttribute('opacity','1');

    const [a,b,c]=bary(x,y);
    const tot=Math.max(a+b+c,0.001);
    document.getElementById(`pa-${idx}`).textContent=Math.round(a/tot*100)+'%';
    document.getElementById(`pb-${idx}`).textContent=Math.round(b/tot*100)+'%';
    document.getElementById(`pc-${idx}`).textContent=Math.round(c/tot*100)+'%';
    document.getElementById(`placed-${idx}`).textContent='✓ Placed — click anywhere to reposition';
    document.getElementById('warn').style.display='none';
  }

  svg.addEventListener('click',place);
  svg.addEventListener('touchstart',place,{passive:false});
  svg.addEventListener('touchmove',place,{passive:false});
}

function buildSteps(){
  const wrap=document.getElementById('steps-wrap');
  wrap.innerHTML='';
  TRIADS.forEach((t,i)=>{
    const div=document.createElement('div');
    div.className='step'+(i===0?' active':'');
    div.id=`step-${i}`;
    div.innerHTML=`
      <div class="scenario-card">
        <div class="sc-eyebrow">Situation ${i+1} of ${TRIADS.length} &nbsp;·&nbsp; ${t.quotient}</div>
        <div class="sc-text">${t.scenario}</div>
      </div>
      <div class="tri-question">${t.question}</div>
      <div class="tri-hint">Click or tap anywhere inside the triangle. You can reposition until you move on.</div>
      <div class="tri-wrap">${makeSVGTriangle(i,t)}</div>
      <div class="placed-msg" id="placed-${i}"></div>
      <div class="pcts">
        <div class="pc">A: <b id="pa-${i}">—</b></div>
        <div class="pc">B: <b id="pb-${i}">—</b></div>
        <div class="pc">C: <b id="pc-${i}">—</b></div>
      </div>`;
    wrap.appendChild(div);
  });
  TRIADS.forEach((_,i)=>attachEvents(i));
}

function updateUI(){
  const pct=(current/TRIADS.length)*100;
  document.getElementById('prog').style.width=pct+'%';
  document.getElementById('sind').textContent=`${current+1} of ${TRIADS.length}`;
  document.getElementById('btn-back').disabled=current===0;
  document.getElementById('btn-next').textContent=current===TRIADS.length-1?'See results →':'Next →';
}

function nav(dir){
  if(dir===1&&!placements[current]){
    document.getElementById('warn').style.display='block';return;
  }
  if(dir===1&&current===TRIADS.length-1){showResults();return;}
  document.getElementById(`step-${current}`).classList.remove('active');
  current+=dir;
  document.getElementById(`step-${current}`).classList.add('active');
  updateUI();
  window.scrollTo({top:0,behavior:'smooth'});
}

function startAssessment(){
  document.getElementById('scr-intro').classList.add('hidden');
  document.getElementById('scr-assess').classList.remove('hidden');
  buildSteps();updateUI();
}

/* ─── SCORING ─── */
function w2score(raw){ return Math.min(5,Math.max(1,(raw+1)/2*4+1)); }

function computeAll(){
  const accum={}, count={};
  const keys=['R_vitality','R_emotion','R_mind','R_execution','R_alignment',
               'P_vitality','P_emotion','P_mind','P_execution','P_alignment'];
  keys.forEach(k=>{accum[k]=0;count[k]=0;});

  TRIADS.forEach((t,i)=>{
    if(!placements[i])return;
    const [a,b,c]=bary(placements[i].x,placements[i].y);
    const tot=Math.max(a+b+c,0.001);
    const coords=[a/tot,b/tot,c/tot];
    Object.entries(t.scores).forEach(([k,w])=>{
      const raw=w[0]*coords[0]+w[1]*coords[1]+w[2]*coords[2];
      accum[k]+=w2score(raw);count[k]++;
    });
  });

  const dim={};
  keys.forEach(k=>{ dim[k]=count[k]>0?accum[k]/count[k]:3; });

  const resilDims=QDIMS.map(q=>`R_${q.toLowerCase()}`);
  const prepDims=QDIMS.map(q=>`P_${q.toLowerCase()}`);
  const R=resilDims.reduce((s,k)=>s+dim[k],0)/resilDims.length;
  const P=prepDims.reduce((s,k)=>s+dim[k],0)/prepDims.length;
  const O=R*P;
  return{dim,R,P,O,resilDims,prepDims};
}

/* ── SVG DONUT RING ── */
function makeRing(score, max, color, trackColor, size){
  const R=size/2, r=R-11, cx=R, cy=R;
  const circ=2*Math.PI*r;
  const filled=((score-1)/(max-1))*circ; // map 1–max to 0–circumference
  const pct=Math.round((score-1)/(max-1)*100);
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" style="display:block;margin:0 auto">
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${trackColor}" stroke-width="10"/>
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${color}" stroke-width="10"
      stroke-dasharray="${filled.toFixed(2)} ${circ.toFixed(2)}"
      stroke-dashoffset="${(circ/4).toFixed(2)}"
      stroke-linecap="round" transform="rotate(-90 ${cx} ${cy})"/>
    <text x="${cx}" y="${cy+2}" text-anchor="middle" dominant-baseline="middle"
      font-size="20" font-weight="500" fill="${color}"
      font-family="-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">${score.toFixed(2)}</text>
  </svg>`;
}

/* ── DOT MATRIX (10×5 dots per quotient row, R then P) ── */
function makeDotMatrix(dim){
  const DOTS=10; // 10 dots = 0.4 per dot on scale 1–5
  function scoreToDots(s){ return Math.round(((s-1)/4)*DOTS); }

  function dotRow(score, color){
    const filled=scoreToDots(score);
    let d='';
    for(let i=0;i<DOTS;i++){
      const on=i<filled;
      d+=`<svg width="18" height="18" viewBox="0 0 18 18" style="display:inline-block;vertical-align:middle">
        <circle cx="9" cy="9" r="7" fill="${on?color:'#e8e7e0'}"/>
        ${on?`<circle cx="9" cy="9" r="3.5" fill="rgba(255,255,255,0.35)"/>`:''}
      </svg>`;
    }
    return d;
  }

  let html=`<div class="dot-matrix-wrap"><table class="dot-matrix-table"><thead><tr>
    <th class="dmt-head left" style="width:36px"></th>`;
  QDIMS.forEach(q=>{ html+=`<th class="dmt-head">${q}</th>`; });
  html+=`</tr></thead><tbody>`;

  // Resilience row
  html+=`<tr><td class="dmt-row-label" title="Resilience" style="color:#534AB7;font-size:12px;font-weight:600">R</td>`;
  QDIMS.forEach(q=>{
    const s=dim[`R_${q.toLowerCase()}`];
    html+=`<td class="dot-cell"><div style="display:flex;gap:2px;justify-content:center;flex-wrap:wrap;max-width:100px;margin:0 auto">${dotRow(s,'#534AB7')}</div>
      <div style="font-size:10px;color:#888780;text-align:center;margin-top:3px">${s.toFixed(1)}</div></td>`;
  });
  html+=`</tr>`;

  // gap spacer
  html+=`<tr><td colspan="${QDIMS.length+1}" style="height:6px"></td></tr>`;

  // Preparedness row
  html+=`<tr><td class="dmt-row-label" title="Preparedness" style="color:#1D9E75;font-size:12px;font-weight:600">P</td>`;
  QDIMS.forEach(q=>{
    const s=dim[`P_${q.toLowerCase()}`];
    html+=`<td class="dot-cell"><div style="display:flex;gap:2px;justify-content:center;flex-wrap:wrap;max-width:100px;margin:0 auto">${dotRow(s,'#1D9E75')}</div>
      <div style="font-size:10px;color:#888780;text-align:center;margin-top:3px">${s.toFixed(1)}</div></td>`;
  });
  html+=`</tr></tbody></table></div>`;
  return html;
}

/* ── DUMBBELL CHART (SVG) ── */
function makeDumbbell(dim){
  const W=560, H=QDIMS.length*56+20;
  const lpad=80, rpad=30, top=16;
  const xmin=1, xmax=5;
  function xpos(v){ return lpad+(v-xmin)/(xmax-xmin)*(W-lpad-rpad); }

  let svg=`<svg viewBox="0 0 ${W} ${H}" width="100%" style="display:block;overflow:visible"
    font-family="-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">`;

  // vertical grid lines at 1,2,3,4,5
  for(let v=1;v<=5;v++){
    const x=xpos(v);
    svg+=`<line x1="${x}" y1="${top}" x2="${x}" y2="${H}" stroke="#e8e7e0" stroke-width="1"/>`;
    svg+=`<text x="${x}" y="${top-4}" text-anchor="middle" font-size="10" fill="#b4b2a9">${v}</text>`;
  }

  QDIMS.forEach((q,i)=>{
    const y=top+i*56+28;
    const rv=dim[`R_${q.toLowerCase()}`], pv=dim[`P_${q.toLowerCase()}`];
    const rx=xpos(rv), px=xpos(pv);
    const lo=Math.min(rx,px), hi=Math.max(rx,px);
    const gapColor=Math.abs(rv-pv)>0.8?'#F0997B':'#d3d1c7';

    // quotient label
    svg+=`<text x="${lpad-8}" y="${y+4}" text-anchor="end" font-size="12" font-weight="500" fill="#444441">${q}</text>`;
    // connecting line
    svg+=`<line x1="${lo}" y1="${y}" x2="${hi}" y2="${y}" stroke="${gapColor}" stroke-width="3" stroke-linecap="round"/>`;
    // R dot
    svg+=`<circle cx="${rx}" cy="${y}" r="9" fill="#534AB7"/>`;
    svg+=`<text x="${rx}" y="${y+4}" text-anchor="middle" font-size="8.5" fill="#fff" font-weight="600">${rv.toFixed(1)}</text>`;
    // P dot
    svg+=`<circle cx="${px}" cy="${y}" r="9" fill="#1D9E75"/>`;
    svg+=`<text x="${px}" y="${y+4}" text-anchor="middle" font-size="8.5" fill="#fff" font-weight="600">${pv.toFixed(1)}</text>`;
  });

  svg+=`</svg>`;
  return svg;
}

function showResults(){
  document.getElementById('scr-assess').classList.add('hidden');
  const{dim,R,P,O}=computeAll();

  // ── Donut rings
  const rr=document.getElementById('ring-row');
  const overallMax=5*5; // R×P max = 25
  rr.innerHTML=`
    <div class="ring-card hero">
      <div class="rl">Overall Readiness</div>
      ${makeRing(O,25,'#534AB7','#d3cef5',110)}
      <div class="rs">Resilience × Preparedness</div>
    </div>
    <div class="ring-card">
      <div class="rl">Resilience</div>
      ${makeRing(R,5,'#534AB7','#e8e7e0',110)}
      <div class="rs">Behavior under pressure</div>
    </div>
    <div class="ring-card">
      <div class="rl">Preparedness</div>
      ${makeRing(P,5,'#1D9E75','#e8e7e0',110)}
      <div class="rs">Structural readiness</div>
    </div>`;

  // ── Verdict
  const vbox=document.getElementById('vbox');
  const levels=[
    {min:4.2*4.2,cls:'s1',label:'Strategic Readiness',title:'Strategic Readiness',desc:'You operate as a trained system. Pressure reveals capability, not fragility. Focus shifts to continuous calibration and raising the ceiling.'},
    {min:3.4*3.4,cls:'s2',label:'Functional but Vulnerable',title:'Functional but Vulnerable',desc:'You perform well in stable phases. One significant disruption will expose structural gaps. Targeted investment in your weakest quotients is the priority.'},
    {min:2.6*2.6,cls:'s3',label:'Reactive Mode',title:'Reactive Mode',desc:'Firefighting dominates architecture. Heroics compensate for missing systems. Sustainable readiness requires structural investment, not more effort from individuals.'},
    {min:0,cls:'s4',label:'Structural Risk Zone',title:'Structural Risk Zone',desc:'Instability is likely under sustained stress. Immediate systemic intervention required before the next major pressure event.'}
  ];
  const lv=levels.find(l=>O>=l.min)||levels[levels.length-1];
  vbox.className='verdict '+lv.cls;
  document.getElementById('vl').textContent=lv.label;
  document.getElementById('vt').textContent=lv.title;
  document.getElementById('vd').textContent=lv.desc;

  // ── Dot matrix
  document.getElementById('dot-matrix').innerHTML=makeDotMatrix(dim);

  // ── Dumbbell
  document.getElementById('dumbbell').innerHTML=makeDumbbell(dim);

  // ── Signals
  buildSignals(dim,R,P);

  // ── Rec button
  document.getElementById('rec-btn').onclick=()=>{
    const summary=`My READYNEERING diagnostic results: Overall Readiness ${O.toFixed(2)}, Resilience ${R.toFixed(2)}, Preparedness ${P.toFixed(2)}. Quotient breakdown — `+
      QDIMS.map(q=>`${q}: R=${dim['R_'+q.toLowerCase()].toFixed(1)} P=${dim['P_'+q.toLowerCase()].toFixed(1)}`).join(', ')+
      `. Based on these scores, what are the most important focus areas and concrete next steps for improving our organizational readiness?`;
    if(typeof sendPrompt==='function'){sendPrompt(summary);}
    else{prompt('Copy this for your debrief:',summary);}
  };

  document.getElementById('results').classList.add('on');
  window.scrollTo({top:0,behavior:'smooth'});
}

function buildSignals(dim,R,P){
  const sg=document.getElementById('signal-grid');
  // find highest and lowest scoring quotients across both R and P
  const qScores=QDIMS.map(q=>({q,r:dim[`R_${q.toLowerCase()}`],p:dim[`P_${q.toLowerCase()}`],avg:(dim[`R_${q.toLowerCase()}`]+dim[`P_${q.toLowerCase()}`])/2}));
  qScores.sort((a,b)=>b.avg-a.avg);
  const strengths=qScores.slice(0,2);
  const risks=qScores.slice(-2).reverse();

  // find biggest gap between R and P
  const gaps=QDIMS.map(q=>({q,gap:dim[`R_${q.toLowerCase()}`]-dim[`P_${q.toLowerCase()}`]}));
  gaps.sort((a,b)=>Math.abs(b.gap)-Math.abs(a.gap));
  const bigGap=gaps[0];

  const rHigh=R>=P, rLow=R<P;

  sg.innerHTML=`
    <div class="signal-card">
      <div class="sc-head">Strengths</div>
      ${strengths.map(s=>`<div class="signal-item"><div class="signal-dot" style="background:#1D9E75"></div><div class="signal-text">${s.q} — performing well in both resilience and preparedness (avg ${s.avg.toFixed(1)})</div></div>`).join('')}
    </div>
    <div class="signal-card">
      <div class="sc-head">Priority gaps</div>
      ${risks.map(s=>`<div class="signal-item"><div class="signal-dot" style="background:#D85A30"></div><div class="signal-text">${s.q} — lowest combined score (avg ${s.avg.toFixed(1)}); review both structural and behavioral dimensions</div></div>`).join('')}
    </div>
    <div class="signal-card">
      <div class="sc-head">Structural pattern</div>
      <div class="signal-item"><div class="signal-dot" style="background:#534AB7"></div>
        <div class="signal-text">${rHigh?`Resilience (${R.toFixed(2)}) exceeds Preparedness (${P.toFixed(2)}) — you rely on in-the-moment capability more than structural design. Risk: when individuals leave, the system is exposed.`:`Preparedness (${P.toFixed(2)}) exceeds Resilience (${R.toFixed(2)}) — plans exist but behavior under pressure doesn't match structural intent. Focus on rehearsal and real-conditions practice.`}</div>
      </div>
      ${Math.abs(bigGap.gap)>0.5?`<div class="signal-item"><div class="signal-dot" style="background:#BA7517"></div><div class="signal-text">Largest gap in ${bigGap.q}: ${bigGap.gap>0?`stronger under pressure than structurally designed for — check if this is sustainable`:`stronger structural design than actual under-pressure behavior — implementation fidelity needs attention`}</div></div>`:''}
    </div>
    <div class="signal-card">
      <div class="sc-head">The multiplication effect</div>
      <div class="signal-item"><div class="signal-dot" style="background:#534AB7"></div>
        <div class="signal-text">Overall Readiness = Resilience × Preparedness. A score of ${R.toFixed(1)} × ${P.toFixed(1)} = ${(R*P).toFixed(2)}. ${R*P<R&&R*P<P?`Both dimensions are pulling the score down. Improving either will have compound effect.`:`Even a 0.3 point gain in your weaker dimension (${P<R?'Preparedness':'Resilience'}) would lift Overall Readiness by approximately ${(0.3*Math.max(R,P)).toFixed(2)} points.`}</div>
      </div>
    </div>`;
}

function restart(){
  placements={};current=0;
  document.getElementById('results').classList.remove('on');
  document.getElementById('scr-intro').classList.remove('hidden');
}

// init
document.getElementById('scr-assess').classList.add('hidden');
