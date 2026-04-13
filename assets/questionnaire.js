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

const QUOTIENT_META = {
  vitality: {
    label: 'Vitality',
    role: 'Energy and capacity to perform under pressure',
    signal: {
      high: 'Energy and capacity are sustaining performance well.',
      mid: 'Energy is generally present, but not consistently sustained.',
      low: 'Energy and capacity are limiting consistent performance.'
    },
    failure: {
      high: 'Strong energy can hide structural overload if effort keeps compensating for weak design.',
      mid: 'Performance may depend too much on conditions or key people.',
      low: 'Pressure is more likely to drain capacity than be absorbed effectively.'
    },
    question: {
      high: 'Where are we still relying on effort instead of reducing load?',
      mid: 'Where does performance drop when pressure rises?',
      low: 'Where is limited capacity constraining outcomes most?'
    }
  },

  emotion: {
    label: 'Emotion',
    role: 'Emotional steadiness and awareness in leadership situations',
    signal: {
      high: 'Emotional dynamics are being handled with steadiness and awareness.',
      mid: 'Emotional awareness is present, but not consistently shaping better responses.',
      low: 'Emotional dynamics are likely affecting consistency and judgment.'
    },
    failure: {
      high: 'Composure can become detachment if signals from people are missed.',
      mid: 'Emotional steadiness may hold in normal conditions but weaken under strain.',
      low: 'Reactivity is more likely to shape outcomes than deliberate response.'
    },
    question: {
      high: 'Where do we need more candor, not just calm?',
      mid: 'Where do emotions start influencing decisions more than we intend?',
      low: 'Where are reactions shaping outcomes more than reflection?'
    }
  },

  mind: {
    label: 'Mind',
    role: 'Clarity of thinking, judgment, and sense-making',
    signal: {
      high: 'Thinking and judgment are creating clear direction.',
      mid: 'There is some clarity, but not enough to guide action consistently.',
      low: 'Unclear thinking is likely reducing consistency and confidence.'
    },
    failure: {
      high: 'Strong conviction can become rigidity if assumptions are not challenged.',
      mid: 'Different people may be working from different interpretations.',
      low: 'Ambiguity is more likely to produce hesitation or conflicting judgments.'
    },
    question: {
      high: 'Where might our certainty be preventing better questions?',
      mid: 'Where are people interpreting the same situation differently?',
      low: 'Where does lack of clarity create drift or confusion?'
    }
  },

  execution: {
    label: 'Execution',
    role: 'Turning intent into coordinated action',
    signal: {
      high: 'Intent is translating into action with consistency.',
      mid: 'Execution happens, but not always with enough reliability or follow-through.',
      low: 'Execution is not consistently converting intent into results.'
    },
    failure: {
      high: 'Strong execution can mask overdependence on a few capable people.',
      mid: 'Things move, but not always in a repeatable or dependable way.',
      low: 'Important work is more likely to stall, fragment, or depend on heroics.'
    },
    question: {
      high: 'Where does execution still depend too heavily on specific individuals?',
      mid: 'Where do plans lose momentum after decisions are made?',
      low: 'Where are we deciding without reliably following through?'
    }
  },

  alignment: {
    label: 'Alignment',
    role: 'Consistency of direction across people and teams',
    signal: {
      high: 'People are acting in a shared direction with consistency.',
      mid: 'Alignment exists, but it weakens under pressure or ambiguity.',
      low: 'People are not consistently acting in the same direction.'
    },
    failure: {
      high: 'Strong alignment can suppress useful challenge if it goes unquestioned.',
      mid: 'Shared direction may exist in principle, but not in practice.',
      low: 'Different people are likely making different decisions in similar situations.'
    },
    question: {
      high: 'Where might strong alignment be preventing useful dissent?',
      mid: 'Where does alignment hold, and where does it start to break?',
      low: 'Where do we see different decisions being made in the same situation?'
    }
  }
};
const TRIADS = [

/* 1 - Vitality (R) */
{
  quotient:"Vitality",
  id:"vitality-1",
  scenario:"Your team has just come through a demanding six-month delivery phase. Key deadlines were met - but at what cost? Looking at your team now, describe the energy level you observe.",
  question:"Where does the energy situation sit?",
  A:"Visibly exhausted - recovery has not happened",
  B:"Energy restored; recovery was built into the plan",
  C:"Tired but bounces back; the system absorbs pressure",
  scores:{ R_vitality:[-0.9, 0.9, 0.4], P_vitality:[-0.5, 0.9, 0.2] }
},

/* 2 - Emotion (R) */
{
  quotient:"Emotion",
  id:"emotion-1",
  scenario:"During a difficult period - a restructuring, a failed project, or a leadership conflict - emotions ran high. Some things were said that created lasting tension between people.",
  question:"How did your organization handle the emotional aftermath?",
  A:"Leaders named it openly; worked through it together",
  B:"Stayed professional; tension faded on its own",
  C:"Never properly addressed; damage lingers",
  scores:{ R_emotion:[0.9, 0.1, -0.8], P_emotion:[0.7, 0.1, -0.6] }
},

/* 3 - Mind (P) */
{
  quotient:"Mind",
  id:"mind-1",
  scenario:"Your organization is about to enter a period of significant uncertainty - a market shift, a new competitor, or a major strategic bet. Before the pressure arrives, how does the organization prepare its thinking?",
  question:"What best describes your planning approach?",
  A:"Priorities defined clearly before things get hard",
  B:"Plan for likely scenario adapt as we go",
  C:"Scenario planning and pre-mortems are standard",
  scores:{ P_mind:[0.3, -0.8, 0.9], R_mind:[0.2, -0.5, 0.8] }
},

/* 4 - Alignment (R) */
{
  quotient:"Alignment",
  id:"alignment-1",
  scenario:"A critical team leader is suddenly unavailable - illness, resignation, or an unexpected absence - right in the middle of a high-stakes delivery. No succession has been formally planned.",
  question:"What happens to operational stability?",
  A:"Minimal disruption shared clarity holds",
  B:"Significant disruption - too much was in one person",
  C:"Others step up; strain but the system holds",
  scores:{ R_alignment:[0.9, -0.9, 0.1], P_alignment:[0.8, -0.9, -0.1] }
},

/* 5 - Execution (R) */
{
  quotient:"Execution",
  id:"execution-1",
  scenario:"An unexpected external event - a regulatory change, a competitor move, a sudden client escalation - forces your organization to change direction mid-delivery. Speed and clarity of response matter enormously.",
  question:"What best describes how your organization responds?",
  A:"Recalibrate within days; not panicked, not paralyzed",
  B:"Ownership defined fast; implementation without drama",
  C:"Overreact or freeze; no clear middle ground",
  scores:{ R_execution:[0.4, 0.9, -0.8], P_execution:[0.3, 0.8, -0.6] }
},

/* 6 - Vitality (P) */
{
  quotient:"Vitality",
  id:"vitality-2",
  scenario:"You are in the planning phase for next year. The ambition is high, the timeline is tight, and the team is already running at close to full capacity. How does your organization approach this?",
  question:"What does capacity planning look like in practice?",
  A:"Realistic workload with deliberate recovery built in",
  B:"Leaders model the pace they expect from others",
  C:"Plan at full capacity; people absorb what is needed",
  scores:{ P_vitality:[0.2, 0.9, -0.8], R_vitality:[0.2, 0.8, -0.6] }
},

/* 7 - Emotion (R) */
{
  quotient:"Emotion",
  id:"emotion-2",
  scenario:"Someone on the leadership team needs to give difficult feedback to a peer - about behavior under pressure, a leadership blind spot, or impact on others. This is the kind of feedback that could cause friction.",
  question:"What typically happens in your organization?",
  A:"Given carefully; sometimes taken personally",
  B:"Direct and normal; received without defensiveness",
  C:"Feedback softened or avoided; relationship comes first",
  scores:{ R_emotion:[0.1, 0.9, -0.7], P_emotion:[0.2, 0.7, -0.5] }
},

/* 8 - Alignment (R) */
{
  quotient:"Alignment",
  id:"alignment-2",
  scenario:"Three teams are working toward the same goal but their priorities conflict. One team's urgent is another team's low priority. The pressure is building and no one has resolved the tension.",
  question:"How does your organization resolve cross-team priority conflicts?",
  A:"Clear escalation; resolved quickly at right level",
  B:"Informal negotiation; takes time, creates friction",
  C:"Persists until a failure forces the conversation",
  scores:{ R_alignment:[0.9, 0.2, -0.8], P_alignment:[0.7, 0.1, -0.7] }
},

/* 9 - Execution (P) */
{
  quotient:"Execution",
  id:"execution-2",
  scenario:"Before a major initiative launches, your organization needs to decide how decisions will be made during implementation - especially when things go wrong and speed matters. How prepared is the organization?",
  question:"What is in place before the pressure starts?",
  A:"Decision principles documented in advance",
  B:"Crisis roles formally defined, practiced and known",
  C:"Discussed in theory; not documented or rehearsed",
  scores:{ P_execution:[0.9, 0.2, -0.8], R_execution:[0.8, 0.1, -0.7] }
},

/* 10 - Vitality (R) */
{
  quotient:"Vitality",
  id:"vitality-3",
  scenario:"Over several months, a pattern emerges: some people look visibly drained, productivity is subtly declining, and a few key people show signs of disengagement. The workload has not decreased.",
  question:"How does your organization respond to these signals?",
  A:"Signals normalized - ‘this is just a demanding phase’",
  B:"Leaders name it openly; acted on as a system issue",
  C:"Individuals manage privately; some speak up, others don’t",
  scores:{ R_vitality:[-0.6, 0.9, -0.1], P_vitality:[-0.4, 0.8, 0.0] }
},

/* 11 - Execution (R) */
{
  quotient:"Execution",
  id:"execution-3",
  scenario:"A significant decision has been made at leadership level. Two weeks later, implementation is inconsistent - different teams are executing in different ways and no one is sure which interpretation is correct.",
  question:"How common is this, and how is it addressed?",
  A:"Rare - clear briefs and accountable owners from the start",
  B:"Occasionally - caught in review before it becomes a problem",
  C:"A known pattern - structural gap between decide and do",
  scores:{ R_execution:[0.9, 0.3, -0.8], P_execution:[0.8, 0.2, -0.7] }
},

/* 12 - Emotion (P) */
{
  quotient:"Emotion",
  id:"emotion-3",
  scenario:"Before a known high-pressure phase - a major launch, a restructuring, a difficult negotiation - your leadership team has the opportunity to prepare not just operationally, but emotionally and relationally.",
  question:"What does that preparation look like?",
  A:"Operational focus only; emotion is personal responsibility",
  B:"Team discusses how to behave under pressure - and revisits it",
  C:"Individual reflection; not a team conversation",
  scores:{ P_emotion:[-0.8, 0.9, 0.1], R_emotion:[-0.4, 0.7, 0.2] }
},

/* 13 - Mind (R) */
{
  quotient:"Mind",
  id:"mind-2",
  scenario:"Your organization has just come through a significant setback - a strategy that did not work, a major project that failed to deliver, or a market bet that was wrong. The post-mortem conversation is about to happen.",
  question:"What does that conversation look like?",
  A:"Structural analysis - what in our process allowed this",
  B:"Outcome focus - what went wrong, who owns it",
  C:"Limited and cautious; real causes stay unspoken",
  scores:{ R_mind:[0.9, -0.3, -0.6], P_mind:[0.8, 0.1, -0.5] }
},

/* 14 - Alignment (P) */
{
  quotient:"Alignment",
  id:"alignment-3",
  scenario:"Your organization has articulated a clear strategic direction. Six months into implementation, you ask people at different levels to describe what that strategy means in practice for their work.",
  question:"What do you find?",
  A:"Consistent clarity at every level",
  B:"Clear at the top; fragments going down",
  C:"Significant divergence; contradictory descriptions",
  scores:{ P_alignment:[0.9, 0.2, -0.8], R_alignment:[0.6, 0.1, -0.7] }
},

/* 15 - Mind (R) */
{
  quotient:"Mind",
  id:"mind-3",
  scenario:"Your organization is under pressure and a dominant narrative has taken hold - a shared story about why things are difficult, who is responsible, and what is possible. The narrative may be partially true, but it is also limiting.",
  question:"How does your organization relate to its own dominant narrative under pressure?",
  A:"We actively interrogate it - groupthink is a leadership risk",
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
  A:"Individual endurance; people manage their own limits",
  B:"Wellbeing on the agenda but not systematically managed",
  C:"Sustainable performance is a design question we actively solve",
  scores:{ R_vitality:[-0.9, 0.2, 0.9], P_vitality:[-0.8, 0.2, 0.9] }
},

/* 17 - Emotion */
{
  quotient:"Emotion",
  id:"emotion-4",
  scenario:"A senior leader reflects on how they personally behave when under significant pressure. Do they know their own stress patterns - and has the leadership team ever discussed this explicitly together?",
  question:"How emotionally self-aware and prepared is your leadership team?",
  A:"Leaders know their patterns; team has discussed this openly",
  B:"Some self-awareness; not yet a shared team conversation",
  C:"Stress reactions noticed only after they have caused damage",
  scores:{ R_emotion:[0.9, 0.2, -0.8], P_emotion:[0.9, 0.2, -0.9] }
},

/* 18 - Mind */
{
  quotient:"Mind",
  id:"mind-4",
  scenario:"In the middle of a fast-moving situation, your leadership team is trying to make sense of what is happening. Some information is confirmed, some is rumour, some is interpretation. How clearly does the team separate these?",
  question:"How does your team handle the mix of facts, assumptions and interpretations in real time?",
  A:"We explicitly label what we know, what we assume, what we interpret",
  B:"Facts and assumptions blend; decisions made on incomplete picture",
  C:"Mostly implicit - experienced leaders read the situation",
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
  A:"Leadership communicates clear intent; people navigate from shared direction",
  B:"Informal networks hold things; some fill gaps, others wait",
  C:"Confusion dominates until the new structure is announced",
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
    const testLine = line ? line + ' ' + words[i] : words[i];
    const width = ctx.measureText(testLine).width;

    if (width > maxWidth && line) {
      lines.push(line);
      line = words[i];
    } else {
      line = testLine;
    }
  }

  if (line) lines.push(line);
  return lines;
}


// ── State ─────────────────────────────────────────────────
var current = 0;
var placements = [];

// ── SVG builder ───────────────────────────────────────────

var VW = s(500), VH = s(520), LH = s(18), FS = s(13);

var GX = (TA.x+TB.x+TC.x)/3;
var GY = (TA.y+TB.y+TC.y)/3;
const ctx = document.createElement('canvas').getContext('2d');
ctx.font = FS + 'px -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif';
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
    out += '<tspan x="'+x+'" dy="'+(i === 0 ? '0' : LH)+'" text-anchor="'+anchor+'">'
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
  var aWrapped = wrapText(ctx, t.A, s(250));
  var bWrapped = wrapText(ctx, t.B, s(100));
  var cWrapped = wrapText(ctx, t.C, s(100));

  var aLines = aWrapped.length;
  var aBottomY = TA.y - s(14);
  var aTopY = aBottomY - (aLines - 1) * LH;
  var bTopY = TB.y + s(16);
  var cTopY = TC.y + s(16);
  var fs = 'font-size="'+FS+'" fill="#2a2a28" font-weight="500" font-family="-apple-system,BlinkMacSystemFont,\'Segoe UI\',sans-serif"';
  var gx = GX.toFixed(1), gy = GY.toFixed(1);
  var mABx = ((TA.x+TB.x)/2).toFixed(1), mABy = ((TA.y+TB.y)/2).toFixed(1);
  var mBCx = ((TB.x+TC.x)/2).toFixed(1), mBCy = ((TB.y+TC.y)/2).toFixed(1);
  var mCAx = ((TC.x+TA.x)/2).toFixed(1), mCAy = ((TC.y+TA.y)/2).toFixed(1);
  const B = getBounds(s(60));

  return '<svg id="svg-'+idx+'" viewBox="'+B.x+' '+B.y+' '+B.w+' '+B.h+'" xmlns="http://www.w3.org/2000/svg"'
    +' style="display:block;width:100%;cursor:crosshair;touch-action:none;user-select:none;overflow:hidden">'

    // center → mid lines
    +'<line x1="'+gx+'" y1="'+gy+'" x2="'+mABx+'" y2="'+mABy+'" stroke="rgba(119,1,54,0.1)" stroke-width="'+s(1)+'"/>'
    +'<line x1="'+gx+'" y1="'+gy+'" x2="'+mBCx+'" y2="'+mBCy+'" stroke="rgba(119,1,54,0.1)" stroke-width="'+s(1)+'"/>'
    +'<line x1="'+gx+'" y1="'+gy+'" x2="'+mCAx+'" y2="'+mCAy+'" stroke="rgba(119,1,54,0.1)" stroke-width="'+s(1)+'"/>'

    // triangle
    +'<polygon points="'+TA.x+','+TA.y+' '+TB.x+','+TB.y+' '+TC.x+','+TC.y+'"'
    +' fill="rgba(119,1,54,0.05)" stroke="rgba(119,1,54,0.3)" stroke-width="'+s(1.5)+'" stroke-linejoin="round"/>'

    // corner dots
    +'<circle cx="'+TA.x+'" cy="'+TA.y+'" r="'+s(5)+'" fill="#770136" opacity="0.4"/>'
    +'<circle cx="'+TB.x+'" cy="'+TB.y+'" r="'+s(5)+'" fill="#770136" opacity="0.4"/>'
    +'<circle cx="'+TC.x+'" cy="'+TC.y+'" r="'+s(5)+'" fill="#770136" opacity="0.4"/>'

    // labels
    +'<text '+fs+' y="'+aTopY+'">'+tspansFromLines(aWrapped,'middle',TA.x)+'</text>'
    +'<text '+fs+' y="'+bTopY+'">'+tspansFromLines(bWrapped,'start',TB.x + s(4))+'</text>'
    +'<text '+fs+' y="'+cTopY+'">'+tspansFromLines(cWrapped,'end',TC.x - s(4))+'</text>'

    // interaction markers
    +'<circle id="ring-'+idx+'" cx="-999" cy="-999" r="'+s(20)+'" fill="rgba(119,1,54,0.8)" opacity="0" style="pointer-events:none"/>'
    +'<circle id="dot-'+idx+'"  cx="-999" cy="-999" r="'+s(11)+'" fill="#770136" opacity="0" style="pointer-events:none"/>'
    +'<circle id="pip-'+idx+'"  cx="-999" cy="-999" r="'+s(5)+'"  fill="#fff" opacity="0" style="pointer-events:none"/>'

    // hit area
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
      /* +'<div class="eyebrow">Situation '+(i+1)+' of '+SHUFFLED_TRIADS.length+'</div>' */
      +'<div class="card">'
      +'<div class="scenario-text">'+esc(t.scenario)+'</div>'
      +'</div>'
      +'<div class="question">'+esc(t.question)
      +'<div class="hint">Click or tap anywhere inside the triangle. You can reposition your dot before moving on.</div>'
      +'</div>'
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
    var ring = document.getElementById('ring-'+idx);
    var dot  = document.getElementById('dot-'+idx);
    var pip  = document.getElementById('pip-'+idx);

    ring.setAttribute('cx', pt.x);
    ring.setAttribute('cy', pt.y);
    dot.setAttribute('cx', pt.x);
    dot.setAttribute('cy', pt.y);
    pip.setAttribute('cx', pt.x);
    pip.setAttribute('cy', pt.y);

    gsap.set(ring, { opacity: 0.7 });
    gsap.set(dot,  { opacity: 1 });
    gsap.set(pip,  { opacity: 1 });

    gsap.fromTo(dot,
      { attr: { r: s(16) } },
      { attr: { r: s(11) }, duration: 0.25, ease: "power2.out" }
    );

    gsap.fromTo(ring,
      { attr: { r: s(12) }, opacity: 0.7 },
      { attr: { r: s(20) }, opacity: 0, duration: 0.4, ease: "power2.out" }
    );

    gsap.fromTo(pip,
      { attr: { r: s(2) } },
      { attr: { r: s(5) }, duration: 0.2, delay: 0.05, ease: "power2.out" }
    );

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

  const isLast = current === SHUFFLED_TRIADS.length - 1;
  const isHalfway = (current + 1) === Math.ceil(SHUFFLED_TRIADS.length / 2);
  let label = 'Next';
  
  if (isLast) {
    label = 'See results';
  } else if (isHalfway) {
    label = 'Halfway there';
    gsap.fromTo('#prog',
      { boxShadow: '0 0 0 rgba(255,218,51,0)' },
      { boxShadow: '0 0 12px rgba(255,218,51,0.6)', duration: 0.4, yoyo: true, repeat: 1 }
    );
  }

  document.getElementById('prog').style.width = pct + '%';
  document.getElementById('step-ind').textContent = 'Situation ' + (current+1) + ' of ' + SHUFFLED_TRIADS.length;
  document.getElementById('btn-back').disabled = current === 0;
  document.getElementById('btn-next').innerHTML =
    label + ' <span class="arrow"></span>';
  }

function showStep(idx, direction) {
  var currentEl = document.getElementById('step-' + current);
  var nextEl = document.getElementById('step-' + idx);

  var outY = direction === 'back' ? 8 : -8;
  var inY  = direction === 'back' ? -8 : 8;

  gsap.to(currentEl, {
    opacity: 0,
    y: outY,
    duration: 0.18,
    ease: "power1.out",
    onComplete: function () {
      for (var i = 0; i < SHUFFLED_TRIADS.length; i++) {
        var el = document.getElementById('step-' + i);
        el.style.display = 'none';
        gsap.set(el, { clearProps: 'opacity,transform' });
      }

      nextEl.style.display = 'block';

      gsap.fromTo(nextEl,
        { opacity: 0, y: inY },
        { opacity: 1, y: 0, duration: 0.22, ease: "power1.out" }
      );
    }
  });
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

  var next = current + 1;
  showStep(next, 'forward');
  current = next;
  setTimeout(updateUI, 100);
  window.scrollTo(0, 0);
});

document.getElementById('btn-back').addEventListener('click', function() {
  if (current > 0) {
    var prev = current - 1;
    showStep(prev, 'back');
    current = prev;
    setTimeout(updateUI, 100);
    window.scrollTo(0, 0);
  }
});

function getLevel(score) {
  if (score >= 3.3) return 'high';
  if (score >= 3.0) return 'mid';
  return 'low';
}

function getDominantPole(r, p, threshold) {
  threshold = threshold || 0.2;
  if (p - r > threshold) return 'preparedness';
  if (r - p > threshold) return 'resilience';
  return 'balanced';
}


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

function buildQuotients(results) {
  var out = [];

  for (var i = 0; i < QDIMS.length; i++) {
    var key = QDIMS[i];
    var r = results.dim['R_' + key];
    var p = results.dim['P_' + key];
    var score = (r + p) / 2;
    var level = getLevel(score);
    var dominant = getDominantPole(r, p);
    var meta = QUOTIENT_META[key];

    out.push({
      key: key,
      label: meta.label,
      resilience: r,
      preparedness: p,
      score: score,
      gap: Math.abs(p - r),
      dominant: dominant,
      level: level,
      role: meta.role,
      signal: meta.signal[level],
      failure: meta.failure[level],
      question: meta.question[level]
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
function pointOnEllipse(cx, cy, rx, ry, deg) {
  const rad = (deg * Math.PI) / 180;
  return {
    x: cx + rx * Math.cos(rad),
    y: cy + ry * Math.sin(rad)
  };
}

function makeRing(score, min, max, color, trackColor, size) {
  const R = size / 2;
  const r = R - 11;
  const cx = R;
  const cy = R;
  const circ = 2 * Math.PI * r;
  const progress = Math.max(0, Math.min(1, (score - min) / (max - min)));
  const dashOffset = circ * (1 - progress);

  return `
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" style="display:block">
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="white" stroke="${trackColor}" stroke-width="10" />
      <circle
        cx="${cx}" cy="${cy}" r="${r}"
        fill="none"
        stroke="${color}"
        stroke-width="10"
        stroke-dasharray="${circ}"
        stroke-dashoffset="${dashOffset}"
        stroke-linecap="round"
        transform="rotate(-90 ${cx} ${cy})"
      />
      <text
        x="${cx}" y="${cy + 2}"
        text-anchor="middle"
        dominant-baseline="middle"
        font-size="${size > 100 ? 20 : 16}"
        font-weight="500"
        fill="${color}"
        font-family="-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif"
      >${score.toFixed(2)}</text>
    </svg>
  `;
}
function renderQuotientCard(q, isLast) {
  return `
    <div class="q-card ${q.level} ${q.key} ${isLast ? 'span-2' : ''}">
      <div class="q-head">
        <div class="q-label">${q.label}</div>
        <div class="q-score">${q.score.toFixed(1)}</div>
      </div>

      <div class="q-role">${q.role}</div>

      <div class="q-section">
        <div class="q-section-label">Current signal</div>
        <div class="q-copy">${q.signal}</div>
      </div>

      <div class="q-section">
        <div class="q-section-label">Failure mode</div>
        <div class="q-copy">${q.failure}</div>
      </div>

      <div class="q-section">
        <div class="q-section-label">Reflection question</div>
        <div class="q-copy">${q.question}</div>
      </div>

      <div class="q-bars">
        <div>R ${q.resilience.toFixed(1)}</div>
        <div>P ${q.preparedness.toFixed(1)}</div>
      </div>
    </div>
  `;
}
function renderQuotientGrid(quotients) {
  return `
    <div class="q-grid">
      ${quotients.map(function(q, i) {
        return renderQuotientCard(q, i === quotients.length - 1);
      }).join('')}
    </div>
  `;
}
// ── Results ───────────────────────────────────────────────
async function showResults() {
  document.getElementById('scr-assess').style.display = 'none';
  document.getElementById('scr-results').style.display = 'block';

  var answers = getAnswerBreakdown();
  console.log('--- ANSWER BREAKDOWN ---');
  console.table(answers);

  var res = computeAll();
  var quotientData = buildQuotients(res);
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
  const orbitCx = 315;
  const orbitCy = 200;
  const rx = 250;
  const ry = 155;

  const centerSize = 140;
  const smallSize = 92;
  const leftX = orbitCx - rx;
  const rightX = orbitCx + rx;
  const cy = orbitCy;
  const resiliencePos = pointOnEllipse(orbitCx, orbitCy, rx, ry, 215);
  const preparednessPos = pointOnEllipse(orbitCx, orbitCy, rx, ry, 325);
  const resilienceX = resiliencePos.x - smallSize / 2;
  const resilienceY = resiliencePos.y - smallSize / 2;

  const preparednessX = preparednessPos.x - smallSize / 2;
  const preparednessY = preparednessPos.y - smallSize / 2;

  const centerX = orbitCx - centerSize / 2;
  const centerY = orbitCy - centerSize / 2 - 5;
  document.getElementById('r-overall').textContent = res.O.toFixed(0);
  document.getElementById('r-resil').textContent   = res.R.toFixed(2);
  document.getElementById('r-prep').textContent    = res.P.toFixed(2);

  const rr = document.getElementById('ring-row');
  rr.innerHTML = `
    <svg class="orbit-svg" viewBox="0 0 630 420" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="backArcFade" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#7d5c6e" stop-opacity="1" />
        <stop offset="18%" stop-color="#7d5c6e" stop-opacity="0.78" />
        <stop offset="50%" stop-color="#7d5c6e" stop-opacity="0.05" />
        <stop offset="82%" stop-color="#7d5c6e" stop-opacity="0.78" />
        <stop offset="100%" stop-color="#7d5c6e" stop-opacity="1" />
      </linearGradient>

      <linearGradient id="linkLeft" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#534AB7" stop-opacity="0.28" />
        <stop offset="100%" stop-color="#534AB7" stop-opacity="0.06" />
      </linearGradient>

      <linearGradient id="linkRight" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#1D9E75" stop-opacity="0.28" />
        <stop offset="100%" stop-color="#1D9E75" stop-opacity="0.06" />
      </linearGradient>
    </defs>

      <path
        d="M ${leftX} ${cy}
          A ${rx} ${ry} 0 0 1 ${rightX} ${cy}"
        fill="none"
        stroke="url(#backArcFade)"
        stroke-opacity="0.28"
        stroke-width="1.5"
      />

      <path
        d="M ${rightX} ${cy}
          A ${rx} ${ry} 0 0 1 ${leftX} ${cy}"
        fill="none"
        stroke="#7d5c6e"
        stroke-opacity="0.28"
        stroke-width="1.5"
      />

      <path
        d="M ${resiliencePos.x} ${resiliencePos.y}
          Q ${orbitCx - 95} ${orbitCy - 35}
            ${orbitCx} ${orbitCy}"
        fill="none"
        stroke="url(#linkLeft)"
        stroke-width="2"
        stroke-linecap="round"
      />

      <path
        d="M ${preparednessPos.x} ${preparednessPos.y}
          Q ${orbitCx + 95} ${orbitCy - 35}
            ${orbitCx} ${orbitCy}"
        fill="none"
        stroke="url(#linkRight)"
        stroke-width="2"
        stroke-linecap="round"
      />

      <foreignObject x="${resilienceX}" y="${resilienceY}" width="${smallSize}" height="${smallSize}">
        <div xmlns="http://www.w3.org/1999/xhtml" class="ring-node">
          ${makeRing(res.R, 0, 5, '#534AB7', '#E8E7E0', smallSize)}
        </div>
      </foreignObject>
      <text x="${resiliencePos.x}" y="${resiliencePos.y + smallSize / 2 + 18}" text-anchor="middle" class="score-label">
        RESILIENCE
      </text>

      <foreignObject x="${preparednessX}" y="${preparednessY}" width="${smallSize}" height="${smallSize}">
        <div xmlns="http://www.w3.org/1999/xhtml" class="ring-node">
          ${makeRing(res.P, 0, 5, '#1D9E75', '#E8E7E0', smallSize)}
        </div>
      </foreignObject>
      <text x="${preparednessPos.x}" y="${preparednessPos.y + smallSize / 2 + 18}" text-anchor="middle" class="score-label">
        PREPAREDNESS
      </text>

      <foreignObject x="${centerX}" y="${centerY}" width="${centerSize}" height="${centerSize}">
        <div xmlns="http://www.w3.org/1999/xhtml" class="ring-node ring-node-center">
          ${makeRing(res.O, 0, 25, '#F4A623', '#F1E7D0', centerSize)}
        </div>
      </foreignObject>
      <text x="${orbitCx}" y="${centerY + centerSize + 18}" text-anchor="middle" class="score-label center-label">
        OVERALL READINESS
      </text>
      <text x="${orbitCx}" y="${centerY + centerSize + 34}" text-anchor="middle" class="score-sub center-sub">
        Resilience × Preparedness
      </text>
    </svg>
  `;

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


  document.getElementById('q-grid-wrapper').innerHTML = renderQuotientGrid(quotientData);
  // Quotient cards
/*   var qg = document.getElementById('q-grid');
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
  qg.innerHTML = qhtml; */
  buildSignals(res.dim,res.R,res.P);

  window.scrollTo(0, 0);
}

function buildSignals(dim,R,P){
  const sg=document.getElementById('signal-grid');
  const qScores=QDIMS.map(q=>({q,r:dim[`R_${q.toLowerCase()}`],p:dim[`P_${q.toLowerCase()}`],avg:(dim[`R_${q.toLowerCase()}`]+dim[`P_${q.toLowerCase()}`])/2}));
  qScores.sort((a,b)=>b.avg-a.avg);
  const strengths=qScores.slice(0,2);
  const risks=qScores.slice(-2).reverse();

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
