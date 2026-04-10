async function saveAssessment(payload) {
  const response = await fetch('/assessments/submit', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Failed to save assessment');
  }

  return data;
}
const TRIADS = [

/* 1 - Vitality (R) */
{
  quotient:"Vitality",
  id:"vitality-1",
  scenario:"Your team has just come through a demanding six-month delivery phase. Key deadlines were met - but at what cost? Looking at your team now, describe the energy level you observe.",
  question:"Where does the energy situation sit?",
  A:"Visibly exhausted -\nrecovery has not happened",
  B:"Energy restored;\nrecovery was built into the plan",
  C:"Tired but bounces back;\nthe system absorbs pressure",
  scores:{ R_vitality:[-0.9, 0.9, 0.4], P_vitality:[-0.5, 0.9, 0.2] }
},

/* 2 - Emotion (R) */
{
  quotient:"Emotion",
  id:"emotion-1",
  scenario:"During a difficult period - a restructuring, a failed project, or a leadership conflict - emotions ran high. Some things were said that created lasting tension between people.",
  question:"How did your organization handle the emotional aftermath?",
  A:"Leaders named it openly;\nworked through it together",
  B:"Stayed professional;\ntension faded on its own",
  C:"Never properly addressed;\ndamage lingers",
  scores:{ R_emotion:[0.9, 0.1, -0.8], P_emotion:[0.7, 0.1, -0.6] }
},

/* 3 - Mind (P) */
{
  quotient:"Mind",
  id:"mind-1",
  scenario:"Your organization is about to enter a period of significant uncertainty - a market shift, a new competitor, or a major strategic bet. Before the pressure arrives, how does the organization prepare its thinking?",
  question:"What best describes your planning approach?",
  A:"Priorities defined clearly\nbefore things get hard",
  B:"Plan for likely scenario;\nadapt as we go",
  C:"Scenario planning and\npre-mortems are standard",
  scores:{ P_mind:[0.3, -0.8, 0.9], R_mind:[0.2, -0.5, 0.8] }
},

/* 4 - Alignment (R) */
{
  quotient:"Alignment",
  id:"alignment-1",
  scenario:"A critical team leader is suddenly unavailable - illness, resignation, or an unexpected absence - right in the middle of a high-stakes delivery. No succession has been formally planned.",
  question:"What happens to operational stability?",
  A:"Minimal disruption;\nshared clarity holds",
  B:"Significant disruption -\ntoo much was in one person",
  C:"Others step up; strain but\nthe system holds",
  scores:{ R_alignment:[0.9, -0.9, 0.1], P_alignment:[0.8, -0.9, -0.1] }
},

/* 5 - Execution (R) */
{
  quotient:"Execution",
  id:"execution-1",
  scenario:"An unexpected external event - a regulatory change, a competitor move, a sudden client escalation - forces your organization to change direction mid-delivery. Speed and clarity of response matter enormously.",
  question:"What best describes how your organization responds?",
  A:"Recalibrate within days;\nnot panicked, not paralyzed",
  B:"Ownership defined fast;\nimplementation without drama",
  C:"Overreact or freeze;\nno clear middle ground",
  scores:{ R_execution:[0.4, 0.9, -0.8], P_execution:[0.3, 0.8, -0.6] }
},

/* 6 - Vitality (P) */
{
  quotient:"Vitality",
  id:"vitality-2",
  scenario:"You are in the planning phase for next year. The ambition is high, the timeline is tight, and the team is already running at close to full capacity. How does your organization approach this?",
  question:"What does capacity planning look like in practice?",
  A:"Realistic workload with\ndeliberate recovery built in",
  B:"Leaders model the pace\nthey expect from others",
  C:"Plan at full capacity;\npeople absorb what is needed",
  scores:{ P_vitality:[0.2, 0.9, -0.8], R_vitality:[0.2, 0.8, -0.6] }
},

/* 7 - Emotion (R) */
{
  quotient:"Emotion",
  id:"emotion-2",
  scenario:"Someone on the leadership team needs to give difficult feedback to a peer - about behavior under pressure, a leadership blind spot, or impact on others. This is the kind of feedback that could cause friction.",
  question:"What typically happens in your organization?",
  A:"Given carefully; sometimes\ntaken personally",
  B:"Direct and normal;\nreceived without defensiveness",
  C:"Feedback softened or avoided;\nrelationship comes first",
  scores:{ R_emotion:[0.1, 0.9, -0.7], P_emotion:[0.2, 0.7, -0.5] }
},

/* 8 - Alignment (R) */
{
  quotient:"Alignment",
  id:"alignment-2",
  scenario:"Three teams are working toward the same goal but their priorities conflict. One team's urgent is another team's low priority. The pressure is building and no one has resolved the tension.",
  question:"How does your organization resolve cross-team priority conflicts?",
  A:"Clear escalation;\nresolved quickly at right level",
  B:"Informal negotiation;\ntakes time, creates friction",
  C:"Persists until a failure\nforces the conversation",
  scores:{ R_alignment:[0.9, 0.2, -0.8], P_alignment:[0.7, 0.1, -0.7] }
},

/* 9 - Execution (P) */
{
  quotient:"Execution",
  id:"execution-2",
  scenario:"Before a major initiative launches, your organization needs to decide how decisions will be made during implementation - especially when things go wrong and speed matters. How prepared is the organization?",
  question:"What is in place before the pressure starts?",
  A:"Decision principles\ndocumented in advance",
  B:"Crisis roles formally defined,\npracticed and known",
  C:"Discussed in theory;\nnot documented or rehearsed",
  scores:{ P_execution:[0.9, 0.2, -0.8], R_execution:[0.8, 0.1, -0.7] }
},

/* 10 - Vitality (R) */
{
  quotient:"Vitality",
  id:"vitality-3",
  scenario:"Over several months, a pattern emerges: some people look visibly drained, productivity is subtly declining, and a few key people show signs of disengagement. The workload has not decreased.",
  question:"How does your organization respond to these signals?",
  A:"Signals normalized -\n‘this is just a demanding phase’",
  B:"Leaders name it openly;\nacted on as a system issue",
  C:"Individuals manage privately;\nsome speak up, others don’t",
  scores:{ R_vitality:[-0.6, 0.9, -0.1], P_vitality:[-0.4, 0.8, 0.0] }
},

/* 11 - Execution (R) */
{
  quotient:"Execution",
  id:"execution-3",
  scenario:"A significant decision has been made at leadership level. Two weeks later, implementation is inconsistent - different teams are executing in different ways and no one is sure which interpretation is correct.",
  question:"How common is this, and how is it addressed?",
  A:"Rare - clear briefs and\naccountable owners from the start",
  B:"Occasionally - caught in\nreview before it becomes\na problem",
  C:"A known pattern -\nstructural gap between decide and do",
  scores:{ R_execution:[0.9, 0.3, -0.8], P_execution:[0.8, 0.2, -0.7] }
},

/* 12 - Emotion (P) */
{
  quotient:"Emotion",
  id:"emotion-3",
  scenario:"Before a known high-pressure phase - a major launch, a restructuring, a difficult negotiation - your leadership team has the opportunity to prepare not just operationally, but emotionally and relationally.",
  question:"What does that preparation look like?",
  A:"Operational focus only;\nemotion is personal responsibility",
  B:"Team discusses how to\nbehave under pressure - and revisits it",
  C:"Individual reflection;\nnot a team conversation",
  scores:{ P_emotion:[-0.8, 0.9, 0.1], R_emotion:[-0.4, 0.7, 0.2] }
},

/* 13 - Mind (R) */
{
  quotient:"Mind",
  id:"mind-2",
  scenario:"Your organization has just come through a significant setback - a strategy that did not work, a major project that failed to deliver, or a market bet that was wrong. The post-mortem conversation is about to happen.",
  question:"What does that conversation look like?",
  A:"Structural analysis -\nwhat in our process allowed this",
  B:"Outcome focus -\nwhat went wrong, who owns it",
  C:"Limited and cautious;\nreal causes stay unspoken",
  scores:{ R_mind:[0.9, -0.3, -0.6], P_mind:[0.8, 0.1, -0.5] }
},

/* 14 - Alignment (P) */
{
  quotient:"Alignment",
  id:"alignment-3",
  scenario:"Your organization has articulated a clear strategic direction. Six months into implementation, you ask people at different levels to describe what that strategy means in practice for their work.",
  question:"What do you find?",
  A:"Consistent clarity\nat every level",
  B:"Clear at the top;\nfragments going down",
  C:"Significant divergence;\ncontradictory descriptions",
  scores:{ P_alignment:[0.9, 0.2, -0.8], R_alignment:[0.6, 0.1, -0.7] }
},

/* 15 - Mind (R) */
{
  quotient:"Mind",
  id:"mind-3",
  scenario:"Your organization is under pressure and a dominant narrative has taken hold - a shared story about why things are difficult, who is responsible, and what is possible. The narrative may be partially true, but it is also limiting.",
  question:"How does your organization relate to its own dominant narrative under pressure?",
  A:"We actively interrogate it -\ngroupthink is a leadership risk",
  B:"We accept it -\nchallenging it feels naive",
  C:"Some question it privately;\nthe social cost is high",
  scores:{ R_mind:[0.9, -0.7, -0.2], P_mind:[0.7, -0.5, -0.1] }
},

/* 16 - Vitality */
{
  quotient:"Vitality",
  id:"vitality-4",
  scenario:"After an intense period, your organization reviews how it manages energy and wellbeing over time. The question on the table: do we treat sustainable performance as a design question - or as an individual responsibility?",
  question:"What best describes your organization’s relationship with sustainable energy?",
  A:"Individual endurance;\npeople manage their own limits",
  B:"Wellbeing on the agenda\nbut not systematically managed",
  C:"Sustainable performance\nis a design question we actively solve",
  scores:{ R_vitality:[-0.9, 0.2, 0.9], P_vitality:[-0.8, 0.2, 0.9] }
},

/* 17 - Emotion */
{
  quotient:"Emotion",
  id:"emotion-4",
  scenario:"A senior leader reflects on how they personally behave when under significant pressure. Do they know their own stress patterns - and has the leadership team ever discussed this explicitly together?",
  question:"How emotionally self-aware and prepared is your leadership team?",
  A:"Leaders know their patterns;\nteam has discussed this openly",
  B:"Some self-awareness;\nnot yet a shared team conversation",
  C:"Stress reactions noticed\nonly after they have caused damage",
  scores:{ R_emotion:[0.9, 0.2, -0.8], P_emotion:[0.9, 0.2, -0.9] }
},

/* 18 - Mind */
{
  quotient:"Mind",
  id:"mind-4",
  scenario:"In the middle of a fast-moving situation, your leadership team is trying to make sense of what is happening. Some information is confirmed, some is rumour, some is interpretation. How clearly does the team separate these?",
  question:"How does your team handle the mix of facts, assumptions and interpretations in real time?",
  A:"We explicitly label what we know,\nwhat we assume, what we interpret",
  B:"Facts and assumptions blend;\ndecisions made on incomplete picture",
  C:"Mostly implicit - experienced\nleaders read the situation",
  scores:{ R_mind:[0.9, -0.8, 0.2], P_mind:[0.8, -0.7, 0.1] }
},

/* 19 - Execution */
{
  quotient:"Execution",
  id:"execution-4",
  scenario:"Your organization has just completed a major initiative. There is pressure to move on immediately. Someone proposes a structured after-action review - to capture what worked and what needs to change before the next cycle.",
  question:"What happens to the after-action review?",
  A:"It happens quickly and drives real change in how we work next time",
  B:"A debrief happens but insights rarely change how we operate",
  C:"We move on - there is always something more urgent waiting",
  scores:{ R_execution:[0.9, 0.1, -0.8], P_execution:[0.8, 0.1, -0.8] }
},

/* 20 - Alignment */
{
  quotient:"Alignment",
  id:"alignment-4",
  scenario:"Your organization enters a period of significant ambiguity - a strategic shift is signalled but not yet defined, roles may change, and people are unsure who decides what. The formal structure has not caught up with the new reality.",
  question:"How does your organization maintain coherence during this ambiguous transition?",
  A:"Leadership communicates clear intent;\npeople navigate from shared direction",
  B:"Informal networks hold things;\nsome fill gaps, others wait",
  C:"Confusion dominates until\nthe new structure is announced",
  scores:{ R_alignment:[0.9, 0.0, -0.8], P_alignment:[0.8, -0.1, -0.8] }
}

];

// ── Geometry ──────────────────────────────────────────────
var SCALE = 1.5;
function s(n) { return n * SCALE; }

var TA = {x:250 * SCALE, y:130 * SCALE};
var TB = {x:48 * SCALE,  y:360 * SCALE};
var TC = {x:452 * SCALE, y:360 * SCALE};

var SHUFFLED_TRIADS = [];


document.getElementById('industry-select').addEventListener('change', function () {
  var other = document.getElementById('industry-other');
  other.style.display = this.value === 'other' ? 'block' : 'none';
});

function bary(px, py) {
  var d = (TB.y-TC.y)*(TA.x-TC.x) + (TC.x-TB.x)*(TA.y-TC.y);
  var a = ((TB.y-TC.y)*(px-TC.x) + (TC.x-TB.x)*(py-TC.y)) / d;
  var b = ((TC.y-TA.y)*(px-TC.x) + (TA.x-TC.x)*(py-TC.y)) / d;
  return [a, b, 1-a-b];
}

function inTri(px, py) {
  var b = bary(px, py);
  return b[0] >= -0.02 && b[1] >= -0.02 && b[2] >= -0.02;
}

function svgPt(svg, e) {
  var pt = svg.createSVGPoint();
  var src = e.touches ? e.touches[0] : e;
  pt.x = src.clientX;
  pt.y = src.clientY;
  return pt.matrixTransform(svg.getScreenCTM().inverse());
}

function getBounds(pad) {
  const minX = Math.min(TA.x, TB.x, TC.x) - pad;
  const maxX = Math.max(TA.x, TB.x, TC.x) + pad;
  const minY = Math.min(TA.y, TB.y, TC.y) - pad;
  const maxY = Math.max(TA.y, TB.y, TC.y) + pad;

  return {
    x: minX,
    y: minY,
    w: maxX - minX,
    h: maxY - minY
  };
}

function w2score(raw) {
  return Math.min(5, Math.max(1, (raw+1)/2*4+1));
}

function wrapText(ctx, text, maxWidth) {
  const words = text.split(/\s+/);
  const lines = [];
  let line = '';

  for (let i = 0; i < words.length; i++) {
    const test = line ? line + ' ' + words[i] : words[i];
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = words[i];
    } else {
      line = test;
    }
  }

  if (line) lines.push(line);
  return lines;
}

const ctx = document.createElement('canvas').getContext('2d');
ctx.font = FS + 'px -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif';

// ── State ─────────────────────────────────────────────────
var current = 0;
var placements = [];

// ── SVG builder ───────────────────────────────────────────

var VW = s(500), VH = s(520), LH = s(18), FS = s(13);
var GX = (TA.x+TB.x+TC.x)/3;
var GY = (TA.y+TB.y+TC.y)/3;

function esc(s) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function getSessionId() {
  let sessionId = localStorage.getItem('session_id');
  if (!sessionId) {
    sessionId = crypto.randomUUID();
    localStorage.setItem('session_id', sessionId);
  }
  return sessionId;
}

function getQueryParam(name) {
  return new URLSearchParams(window.location.search).get(name);
}

/* function makeTspans(txt, anchor, x, startY) {
  var parts = txt.split('\n');
  var out = '';
  for (var i=0; i<parts.length; i++) {
    out += '<tspan x="'+x+'" dy="'+(i===0?'0':LH)+'" text-anchor="'+anchor+'">'+esc(parts[i])+'</tspan>';
  }
  return out;
} */
function makeTspansAuto(txt, anchor, x, startY, maxWidth) {
  const lines = wrapText(ctx, txt, maxWidth);

  let out = '';
  for (let i = 0; i < lines.length; i++) {
    out += '<tspan x="'+x+'" dy="'+(i===0 ? '0' : LH)+'" text-anchor="'+anchor+'">'
      + esc(lines[i]) +
    '</tspan>';
  }
  return out;
}
function tspansFromLines(lines, anchor, x) {
  let out = '';
  for (let i = 0; i < lines.length; i++) {
    out += '<tspan x="'+x+'" dy="'+(i === 0 ? 0 : LH)+'" text-anchor="'+anchor+'">'
      + esc(lines[i]) +
      '</tspan>';
  }
  return out;
}
function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function makeSVG(idx) {
  var t = SHUFFLED_TRIADS[idx];
  var aLines = t.A.split('\n').length;
  var aBottomY = TA.y - s(14);
  var aTopY    = aBottomY - (aLines - 1) * LH;
  var bTopY    = TB.y + s(16);
  var cTopY    = TC.y + s(16);
  var fs = 'font-size="'+FS+'" fill="#2a2a28" font-weight="500" font-family="-apple-system,BlinkMacSystemFont,\'Segoe UI\',sans-serif"';
  var gx = GX.toFixed(1), gy = GY.toFixed(1);
  var mABx = ((TA.x+TB.x)/2).toFixed(1), mABy = ((TA.y+TB.y)/2).toFixed(1);
  var mBCx = ((TB.x+TC.x)/2).toFixed(1), mBCy = ((TB.y+TC.y)/2).toFixed(1);
  var mCAx = ((TC.x+TA.x)/2).toFixed(1), mCAy = ((TC.y+TA.y)/2).toFixed(1);
  const B = getBounds(s(60));

  return '<svg id="svg-'+idx+'" viewBox="'+B.x+' '+B.y+' '+B.w+' '+B.h+'" xmlns="http://www.w3.org/2000/svg"'
    +' style="display:block;width:100%;cursor:crosshair;touch-action:none;user-select:none;overflow:hidden">'
    +'<line x1="'+gx+'" y1="'+gy+'" x2="'+mABx+'" y2="'+mABy+'" stroke="rgba(119,1,54,0.1)" stroke-width="'+s(1)+'"/>'
    +'<line x1="'+gx+'" y1="'+gy+'" x2="'+mBCx+'" y2="'+mBCy+'" stroke="rgba(119,1,54,0.1)" stroke-width="'+s(1)+'"/>'
    +'<line x1="'+gx+'" y1="'+gy+'" x2="'+mCAx+'" y2="'+mCAy+'" stroke="rgba(119,1,54,0.1)" stroke-width="'+s(1)+'"/>'
    +'<polygon points="'+TA.x+','+TA.y+' '+TB.x+','+TB.y+' '+TC.x+','+TC.y+'" fill="rgba(119,1,54,0.05)" stroke="rgba(119,1,54,0.3)" stroke-width="'+s(1.5)+'" stroke-linejoin="round"/>'
    +'<circle cx="'+TA.x+'" cy="'+TA.y+'" r="'+s(5)+'" fill="#770136" opacity="0.4"/>'
    +'<circle cx="'+TB.x+'" cy="'+TB.y+'" r="'+s(5)+'" fill="#770136" opacity="0.4"/>'
    +'<circle cx="'+TC.x+'" cy="'+TC.y+'" r="'+s(5)+'" fill="#770136" opacity="0.4"/>'
    +'<text '+fs+' y="'+aTopY+'">'+tspansFromLines(aWrap, 'middle', TA.x)+'</text>'
    +'<text '+fs+' y="'+bTopY+'">'+tspansFromLines(bWrap, 'start', TB.x + s(4))+'</text>'
    +'<text '+fs+' y="'+cTopY+'">'+tspansFromLines(cWrap, 'end', TC.x - s(4))+'</text>'
    +'<circle id="ring-'+idx+'" cx="-999" cy="-999" r="'+s(20)+'" fill="rgba(119,1,54,0.13)" opacity="0" style="pointer-events:none"/>'
    +'<circle id="dot-'+idx+'"  cx="-999" cy="-999" r="'+s(11)+'" fill="#770136" opacity="0" style="pointer-events:none"/>'
    +'<circle id="pip-'+idx+'"  cx="-999" cy="-999" r="'+s(5)+'" fill="#fff" opacity="0" style="pointer-events:none"/>'
    +'<rect x="'+B.x+'" y="'+B.y+'" width="'+B.w+'" height="'+B.h+'" fill="transparent"/>'
    +'</svg>';
}

// ── Build all steps ───────────────────────────────────────
function buildSteps() {
  var wrap = document.getElementById('steps-wrap');
  var html = '';

  SHUFFLED_TRIADS = shuffle([...TRIADS]);
  placements = new Array(SHUFFLED_TRIADS.length).fill(null);
  current = 0;

  for (var i=0; i<SHUFFLED_TRIADS.length; i++) {
    var t = SHUFFLED_TRIADS[i];
    var display = i===0 ? 'block' : 'none';
    html += '<div id="step-'+i+'" style="display:'+display+'">'
      +'<div class="card">'
      +'<div class="eyebrow">Situation '+(i+1)+' of '+SHUFFLED_TRIADS.length+'</div>'
      +'<div class="scenario-text">'+esc(t.scenario)+'</div>'
      +'</div>'
      +'<div class="question">'+esc(t.question)+'</div>'
      +'<div class="hint">Click or tap anywhere inside the triangle. You can reposition your dot before moving on.</div>'
      +'<div class="tri-wrap">'+makeSVG(i)+'</div>'
      +'<div class="placed" id="placed-'+i+'"></div>'
      +'<div class="pills">'
      +'<div class="pill">A: <b id="pa-'+i+'">-</b></div>'
      +'<div class="pill">B: <b id="pb-'+i+'">-</b></div>'
      +'<div class="pill">C: <b id="pc-'+i+'">-</b></div>'
      +'</div>'
      +'</div>';
  }

  wrap.innerHTML = html;

  for (var j=0; j<SHUFFLED_TRIADS.length; j++) {
    attachEvents(j);
  }
}

function attachEvents(idx) {
  var svg = document.getElementById('svg-'+idx);
  if (!svg) return;

  function place(e) {
    e.preventDefault();
    var pt = svgPt(svg, e);
    if (!inTri(pt.x, pt.y)) return;
    placements[idx] = {x: pt.x, y: pt.y};

    document.getElementById('ring-'+idx).setAttribute('cx', pt.x);
    document.getElementById('ring-'+idx).setAttribute('cy', pt.y);
    document.getElementById('ring-'+idx).setAttribute('opacity', '1');
    document.getElementById('dot-'+idx).setAttribute('cx', pt.x);
    document.getElementById('dot-'+idx).setAttribute('cy', pt.y);
    document.getElementById('dot-'+idx).setAttribute('opacity', '1');
    document.getElementById('pip-'+idx).setAttribute('cx', pt.x);
    document.getElementById('pip-'+idx).setAttribute('cy', pt.y);
    document.getElementById('pip-'+idx).setAttribute('opacity', '1');

    var b = bary(pt.x, pt.y);
    var tot = Math.max(b[0]+b[1]+b[2], 0.001);
    document.getElementById('pa-'+idx).textContent = Math.round(b[0]/tot*100)+'%';
    document.getElementById('pb-'+idx).textContent = Math.round(b[1]/tot*100)+'%';
    document.getElementById('pc-'+idx).textContent = Math.round(b[2]/tot*100)+'%';
    document.getElementById('placed-'+idx).textContent = 'Dot placed - click to reposition';
    document.getElementById('warn').style.display = 'none';
  }

  svg.addEventListener('click', place);
  svg.addEventListener('touchstart', place, {passive:false});
  svg.addEventListener('touchmove', place, {passive:false});
}

// ── Navigation ────────────────────────────────────────────
function updateUI() {
  var pct = (current / SHUFFLED_TRIADS.length * 100);
  document.getElementById('prog').style.width = pct + '%';
  document.getElementById('step-ind').textContent = (current+1) + ' of ' + SHUFFLED_TRIADS.length;
  document.getElementById('btn-back').disabled = current === 0;
  document.getElementById('btn-next').innerHTML =
    current === SHUFFLED_TRIADS.length - 1
      ? 'See results <span class="arrow"></span>'
      : 'Next <span class="arrow"></span>';
  }

function showStep(idx) {
  for (var i=0; i<SHUFFLED_TRIADS.length; i++) {
    document.getElementById('step-'+i).style.display = i===idx ? 'block' : 'none';
  }
}

document.getElementById('btn-next').addEventListener('click', function() {
  if (!placements[current]) {
    document.getElementById('warn').style.display = 'block';
    return;
  }
  if (current === SHUFFLED_TRIADS.length - 1) {
    showResults();
    return;
  }
  current++;
  showStep(current);
  updateUI();
  window.scrollTo(0, 0);
});

document.getElementById('btn-back').addEventListener('click', function() {
  if (current > 0) {
    current--;
    showStep(current);
    updateUI();
    window.scrollTo(0, 0);
  }
});

// ── Scoring ───────────────────────────────────────────────
var DIMS = ['R_vitality','R_emotion','R_mind','R_execution','R_alignment',
            'P_vitality','P_emotion','P_mind','P_execution','P_alignment'];
var QDIMS = ['vitality','emotion','mind','execution','alignment'];

function computeAll() {
  var accum = {}, count = {};
  for (var k=0; k<DIMS.length; k++) { accum[DIMS[k]]=0; count[DIMS[k]]=0; }

  for (var i=0; i<SHUFFLED_TRIADS.length; i++) {
    if (!placements[i]) continue;
    var b = bary(placements[i].x, placements[i].y);
    var tot = Math.max(b[0]+b[1]+b[2], 0.001);
    var coords = [b[0]/tot, b[1]/tot, b[2]/tot];
    var sc = SHUFFLED_TRIADS[i].scores;
    for (var k in sc) {
      var raw = sc[k][0]*coords[0] + sc[k][1]*coords[1] + sc[k][2]*coords[2];
      accum[k] += w2score(raw);
      count[k]++;
    }
  }

  var dim = {};
  for (var k=0; k<DIMS.length; k++) {
    dim[DIMS[k]] = count[DIMS[k]] > 0 ? accum[DIMS[k]] / count[DIMS[k]] : 3;
  }

  var R=0, P=0;
  for (var q=0; q<QDIMS.length; q++) {
    R += dim['R_'+QDIMS[q]];
    P += dim['P_'+QDIMS[q]];
  }
  R /= QDIMS.length;
  P /= QDIMS.length;

  return {dim:dim, R:R, P:P, O:R*P};
}

function getAnswerBreakdown() {
  var out = [];

  for (var i = 0; i < SHUFFLED_TRIADS.length; i++) {
    if (!placements[i]) continue;

    var triad = SHUFFLED_TRIADS[i];
    var placement = placements[i];

    var b = bary(placement.x, placement.y);
    var tot = Math.max(b[0] + b[1] + b[2], 0.001);

    var a = b[0] / tot;
    var bb = b[1] / tot;
    var c = b[2] / tot;

    var percentA = Math.round(a * 100);
    var percentB = Math.round(bb * 100);
    var percentC = Math.round(c * 100);

    var dominant = 'A';
    if (percentB > percentA && percentB > percentC) dominant = 'B';
    if (percentC > percentA && percentC > percentB) dominant = 'C';

    out.push({
      index: i,
      item_key: triad.id,
      quotient: triad.quotient,
      question: triad.question,
      scenario: triad.scenario,
      labels: {
        A: triad.A,
        B: triad.B,
        C: triad.C
      },
      placement: {
        x: placement.x,
        y: placement.y
      },
      barycentric: {
        a: a,
        b: bb,
        c: c
      },
      percent: {
        a: percentA,
        b: percentB,
        c: percentC
      },
      dominant_label: dominant
    });
  }

  return out;
}
function computeVerdict(overallScore) {
  const levels = [
    {min:16.0, cls:'v-s1', label:'Strategic Readiness',
     desc:'You operate as a deliberately designed system. Pressure reveals capability, not fragility.'},
    {min:11.0, cls:'v-s2', label:'Functional but Vulnerable',
     desc:'You execute well under normal conditions. One significant disruption will expose structural gaps.'},
    {min:6.5, cls:'v-s3', label:'Reactive Mode',
     desc:'Firefighting dominates. Heroics compensate for missing systems. Structural investment is the answer.'},
    {min:0, cls:'v-s4', label:'Structural Risk Zone',
     desc:'Instability is likely under sustained stress. Immediate structural intervention required.'}
  ];

  for (let i = 0; i < levels.length; i++) {
    if (overallScore >= levels[i].min) {
      return levels[i];
    }
  }

  return levels[levels.length - 1];
}

function buildSubmissionPayload(res, verdict) {
  const breakdown = getAnswerBreakdown();

  const items = breakdown.map(answer => ({
    item_key: answer.item_key,
    item_index: answer.index,
    item_type: "triad",
    response_value: {
      quotient: answer.quotient,
      scenario: answer.scenario,
      question: answer.question,
      labels: answer.labels,
      placement: answer.placement,
      barycentric: answer.barycentric,
      percent: answer.percent,
      dominant_label: answer.dominant_label
    }
  }));

  const scores = [
    {
      score_key: "resilience_score",
      score_type: "numeric",
      numeric_value: res.R
    },
    {
      score_key: "preparedness_score",
      score_type: "numeric",
      numeric_value: res.P
    },
    {
      score_key: "overall_score",
      score_type: "numeric",
      numeric_value: res.O
    },
    {
      score_key: "verdict_label",
      score_type: "text",
      text_value: verdict.label
    },
    {
      score_key: "verdict_meta",
      score_type: "json",
      json_value: {
        class: verdict.cls,
        label: verdict.label,
        description: verdict.desc
      }
    }
  ];

  Object.entries(res.dim).forEach(([key, value]) => {
    scores.push({
      score_key: key,
      score_type: "numeric",
      numeric_value: value
    });
  });

  return {
    instrument: {
      key: "readyneering_diagnostic",
      version: "v1"
    },
    submission: {
      respondent_id: null,
      session_id: getSessionId(),
      status: "completed",
      metadata: {
        source: "web_app",
        batch_id: getQueryParam('batch_id'),
        industry: selectedIndustry
      }
    },
    items,
    scores
  };
}



// ── Results ───────────────────────────────────────────────
async function showResults() {
  document.getElementById('scr-assess').style.display = 'none';
  document.getElementById('scr-results').style.display = 'block';

  var answers = getAnswerBreakdown();
  console.log('--- ANSWER BREAKDOWN ---');
  console.table(answers);

  var res = computeAll();
  var verdict = computeVerdict(res.O);
  var payload = buildSubmissionPayload(res, verdict);

  console.log('Assessment Results:', res);
  console.log('Submission Payload:', payload);

  try {
    const saved = await saveAssessment(payload);
    console.log('Saved assessment:', saved);
  } catch (err) {
    console.error('Failed to save assessment:', err);
  }

  document.getElementById('r-overall').textContent = res.O.toFixed(2);
  document.getElementById('r-resil').textContent   = res.R.toFixed(2);
  document.getElementById('r-prep').textContent    = res.P.toFixed(2);

  var levels = [
    {min:16.0, cls:'v-s1', label:'Strategic Readiness',
     desc:'You operate as a deliberately designed system. Pressure reveals capability, not fragility.'},
    {min:11.0, cls:'v-s2', label:'Functional but Vulnerable',
     desc:'You execute well under normal conditions. One significant disruption will expose structural gaps.'},
    {min:6.5,  cls:'v-s3', label:'Reactive Mode',
     desc:'Firefighting dominates. Heroics compensate for missing systems. Structural investment is the answer.'},
    {min:0,    cls:'v-s4', label:'Structural Risk Zone',
     desc:'Instability is likely under sustained stress. Immediate structural intervention required.'}
  ];

  var lv = levels[levels.length-1];
  for (var i=0; i<levels.length; i++) {
    if (res.O >= levels[i].min) { lv = levels[i]; break; }
  }

  var vbox = document.getElementById('verdict');
  vbox.className = 'verdict ' + lv.cls;
  document.getElementById('v-lbl').textContent   = lv.label;
  document.getElementById('v-title').textContent = lv.label;
  document.getElementById('v-desc').textContent  = lv.desc;

  // Quotient cards
  var qg = document.getElementById('q-grid');
  var qhtml = '';
  var qnames = ['Vitality','Emotion','Mind','Execution','Alignment'];
  for (var i=0; i<QDIMS.length; i++) {
    var q = QDIMS[i];
    var rv = res.dim['R_'+q], pv = res.dim['P_'+q];
    var avg = (rv+pv)/2;
    var col = avg>=4 ? '#1d9e75' : avg>=3 ? '#770136' : avg>=2 ? '#ba7517' : '#d85a30';
    var rw = ((rv-1)/4*100).toFixed(0), pw = ((pv-1)/4*100).toFixed(0);
    qhtml += '<div class="qcard">'
      +'<div class="qcard-lbl">'+qnames[i]+'</div>'
      +'<div class="qcard-val" style="color:'+col+'">'+avg.toFixed(1)+'</div>'
      +'<div class="qbar-row"><span class="qbar-l">R</span><div class="qbar-t"><div class="qbar-f" style="width:'+rw+'%;background:#770136"></div></div></div>'
      +'<div class="qbar-row"><span class="qbar-l">P</span><div class="qbar-t"><div class="qbar-f" style="width:'+pw+'%;background:#1d9e75"></div></div></div>'
      +'</div>';
  }
  qg.innerHTML = qhtml;

  window.scrollTo(0, 0);
}

// ── Start ─────────────────────────────────────────────────
function startAssessment() {
  var industrySelect = document.getElementById('industry-select');

  if (!industrySelect) {
    console.error('Industry select not found');
    return;
  }

  selectedIndustry = industrySelect.value;

  if (!selectedIndustry) {
    document.getElementById('industry-warn').style.display = 'block';
    return;
  }

  document.getElementById('industry-warn').style.display = 'none';

  document.getElementById('scr-intro').style.display  = 'none';
  document.getElementById('scr-assess').style.display = 'block';

  buildSteps();
  updateUI();
  window.scrollTo(0, 0);
}

document.getElementById('start-btn').addEventListener('click', startAssessment);

document.getElementById('btn-restart').addEventListener('click', function() {
  placements = [];
  for (var i=0; i<SHUFFLED_TRIADS.length; i++) placements.push(null);
  current = 0;
  document.getElementById('scr-results').style.display = 'none';
  document.getElementById('scr-intro').style.display = 'block';
  window.scrollTo(0, 0);
});
