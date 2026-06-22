const TURNSTILE_SITE_KEY = '0x4AAAAAADTHusttqatb2uD0';
const FALLBACK_BOOKINGS_URL = 'https://youtube.com';

let turnstileWidgetId = null;
let turnstilePending = null;
let turnstileReadyPromise = null;
let isSubmittingAssessment = false;
let turnstileShellTimer = null;

let turnstileReady = false;
let pendingToken = null;

window.onTurnstileLoad = function () { turnstileReady = true; };

function showVerifyCard() { setTurnstileChallengeActive(true); }
function hideVerifyCard() { setTurnstileChallengeActive(false); }

function beginVerifyAndSubmit() {
  if (turnstileWidgetId === null) {
    renderTurnstileWidgetOnce();
  } else {
    try { window.turnstile.reset(turnstileWidgetId); } catch (e) {}
  }
}

function submitWithToken(token) {
  if (currentResult && currentResult.result_id) {
    return;
  }
  pendingToken = token;
  showResultsPage(renderAfterVerify);
}

async function renderAfterVerify() {
  try {
    const saved = await saveAssessment(buildSubmissionPayload(), pendingToken);
    pendingToken = null;
    currentResult = {
      result_id: saved.result_id,
      access_token: saved.access_token,
      locked: saved.locked,
      unlocked: Boolean(saved.report && saved.report.locked),
      report: { open: saved.report.open, locked: saved.report.locked || null },
      unlock: saved.unlock || null
    };
    if (currentResult.access_token && getQueryParam('t') !== currentResult.access_token) {
      history.replaceState(null, '', '?t=' + encodeURIComponent(currentResult.access_token));
    }
    clearAssessmentState();

    teardownTurnstile();

    renderServerReport(currentResult);
  } catch (err) {
    showVerifyRetry(err.message || 'We couldn’t save your results. Please try again.');
  }
}

function teardownTurnstile() {
  try {
    if (turnstileWidgetId !== null && window.turnstile) {
      window.turnstile.remove(turnstileWidgetId);
    }
  } catch (e) {}
  turnstileWidgetId = null;
  turnstilePending = null;
  pendingToken = null;
  const shell = document.getElementById('turnstile-shell');
  if (shell) shell.classList.remove('challenge-active');
}

function showVerifyRetry(message) {
  const copy = document.querySelector('#turnstile-shell .turnstile-copy');
  if (copy) copy.textContent = message;
  const btn = document.getElementById('turnstile-cancel');
  if (btn) { btn.textContent = 'Try again'; btn.onclick = beginVerifyAndSubmit; }
  showVerifyCard();
}

 function setResultsLoaderText(title, copy) {
  const titleEl = document.querySelector('.results-loader-title');
  const copyEl = document.querySelector('.results-loader-copy');

  if (titleEl) titleEl.textContent = title;
  if (copyEl) copyEl.textContent = copy;
}
/*
function makeCancelError() {
  const e = new Error('Verification cancelled.');
  e.cancelled = true;
  return e;
}


function showTurnstileShell() {
  clearTimeout(turnstileShellTimer);

  turnstileShellTimer = setTimeout(function () {
    setTurnstileChallengeActive(true);
  }, 350);
}

function hideTurnstileShell() {
  clearTimeout(turnstileShellTimer);
  turnstileShellTimer = null;
  setTurnstileChallengeActive(false);
}

function cancelTurnstile() {
  if (turnstilePending) {
    clearTimeout(turnstilePending.timeout);
    const reject = turnstilePending.reject;
    turnstilePending = null;
    reject(makeCancelError());
  }

  hideTurnstileShell();

  try {
    window.turnstile.reset(turnstileWidgetId);
  } catch (e) {}
}

function waitForTurnstile() {
  if (window.turnstile) return Promise.resolve();
  if (!turnstileReadyPromise) {
    turnstileReadyPromise = new Promise((resolve, reject) => {
      const startedAt = Date.now();
      const timer = setInterval(() => {
        if (window.turnstile) {
          clearInterval(timer);
          resolve();
          return;
        }
        if (Date.now() - startedAt > 10_000) {
          clearInterval(timer);
          reject(new Error('Verification script failed to load. Please refresh and try again.'));
        }
      }, 50);
    });
  }
  return turnstileReadyPromise;
}
*/
function setTurnstileChallengeActive(isActive) {
  const shell = document.getElementById('turnstile-shell');
  if (!shell) return;

  shell.classList.toggle('challenge-active', isActive);
  shell.setAttribute('aria-hidden', isActive ? 'false' : 'true');
}

function renderTurnstileWidgetOnce() {
  if (turnstileWidgetId !== null) return;
  turnstileWidgetId = window.turnstile.render('#turnstile-widget', {
    sitekey: TURNSTILE_SITE_KEY,
    appearance: 'interaction-only',                 // invisible unless a click is required
    'before-interactive-callback': function () { showVerifyCard(); },
    'after-interactive-callback':  function () { hideVerifyCard(); },
    callback: function (token) { hideVerifyCard(); submitWithToken(token); },
    'error-callback':   function () { showVerifyRetry('Verification failed. Please try again.'); },
    'timeout-callback': function () { showVerifyRetry('Verification timed out. Please try again.'); },
    'expired-callback': function () { try { window.turnstile.reset(turnstileWidgetId); } catch (e) {} }
  });
}
/* 
async function initTurnstile() {
  await waitForTurnstile();
  renderTurnstileWidgetOnce();
}

async function getTurnstileToken() {
  await waitForTurnstile();
  renderTurnstileWidgetOnce();

  showTurnstileShell();

  return new Promise(function (resolve, reject) {
    const timeout = setTimeout(function () {
      turnstilePending = null;
      hideTurnstileShell();
      reject(new Error('Verification didn’t complete. Please try again.'));
    }, 120_000);

    turnstilePending = {
      resolve: function (token) { clearTimeout(timeout); hideTurnstileShell(); resolve(token); },
      reject:  function (err)  { clearTimeout(timeout); hideTurnstileShell(); reject(err); },
      timeout: timeout
    };

    try {
      const r = window.turnstile.getResponse(turnstileWidgetId);
      if (r) window.turnstile.reset(turnstileWidgetId);
      window.turnstile.execute(turnstileWidgetId);
    } catch (e) {
      clearTimeout(timeout);
      hideTurnstileShell();
      reject(e);
    }
  });
} */  

function escapeHtml(unsafe) {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function getSubmitAttemptId() {
  let id = localStorage.getItem('submit_attempt_id');

  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem('submit_attempt_id', id);
  }

  return id;
}

const SUPABASE_FUNCTIONS_BASE = 'https://supabase-andqfive-u72683.vm.elestio.app/functions/v1';

async function saveAssessment(payload, token) {
  setResultsLoaderText('Saving your responses', 'Your answers are being securely saved before we build your profile.');
  const idempotencyKey = getSubmitAttemptId();
  const response = await fetch(`${SUPABASE_FUNCTIONS_BASE}/submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Idempotency-Key': idempotencyKey },
    body: JSON.stringify({ ...payload, turnstileToken: token })
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Failed to save assessment');
  }

  localStorage.removeItem('submit_attempt_id');

  setResultsLoaderText(
    'Building your readiness profile',
    'Analyzing system patterns across resilience, preparedness, and the five quotients.'
  );

  return data;
}

async function submitAssessmentOnce() {
  if (currentResult) return currentResult;

  const payload = buildSubmissionPayload();
  const saved = await saveAssessment(payload);

  currentResult = {
    result_id: saved.result_id,
    access_token: saved.access_token,
    locked: saved.locked,
    unlocked: Boolean(saved.report && saved.report.locked),
    report: { open: saved.report.open, locked: saved.report.locked || null },
    unlock: saved.unlock || null,
    submittedAt: new Date().toISOString()
  };
  return currentResult;
}

const MODE_META = {
  resilience: {
    role: "How strong you are when the environment becomes unstable or unpredictable.",
    signal: {
      high: "The system tends to stay functional and effective when conditions get difficult.",
      mid: "The system absorbs some pressure, but not always with consistency.",
      low: "Pressure is more likely to disrupt consistency, judgment, or follow-through."
    },
    risk: {
      high: "Strong resilience can hide where people are compensating for weak structure.",
      mid: "Resilience may hold in some conditions, but break in others.",
      low: "When pressure rises, performance is more likely to depend on individuals than on the system."
    },
    question: {
      high: "Where does the system still hold mainly because capable people absorb the strain?",
      mid: "What tends to break first when conditions become difficult?",
      low: "Where does pressure expose weak points faster than the system can absorb them?"
    }
  },

  preparedness: {
    role: "How well prepared you are for known and unknown challenges ahead.",
    signal: {
      high: "The system appears well prepared, with expectations and structure in place ahead of time.",
      mid: "Preparation exists, but not always at the level needed to create consistency.",
      low: "The system is more reactive than designed, with readiness gaps showing up too late."
    },
    risk: {
      high: "Strong preparedness can still fail if plans do not hold under live conditions.",
      mid: "Preparedness may be present in principle, but not fully embedded in practice.",
      low: "Too much depends on reaction and memory rather than design and readiness."
    },
    question: {
      high: "Where do we know what good looks like-but fail to make it hold in practice?",
      mid: "What are we repeatedly reacting to that should already be designed for?",
      low: "Where is readiness depending more on memory than on structure?"
    }
  }
};


const QUOTIENT_ICONS = {
  vitality: 'assets/images/q-vitality.svg',
  emotion: 'assets/images/q-emotion.svg',
  mind: 'assets/images/q-mind.svg',
  execution: 'assets/images/q-execution.svg',
  alignment: 'assets/images/q-alignment.svg'
};

const TRIADS = [

  /* 1 - Vitality (R) */
  {
    quotient:"Vitality",
    id:"vitality-1",
    scenario:"Recent months have been relentless. At work and at home. You hit every deadline. You held it together. But Sunday evening has a feeling you recognize — a knot, a low hum of dread. Monday morning is something you are getting through, not looking forward to.",
    question:"What does your energy actually tell you right now?",
    A:"No energy. No momentum. I got through it. That is about all I can say.",
    B:"I am genuinely back. Recovery was something I planned for, protected, and used.",
    C:"I am tired. But I bounce back. I always have. That is just how I operate.",
    scores:{ R_vitality:[-0.9, 0.9, 0.4], P_vitality:[-0.5, 0.9, 0.2] }
  },

  /* 2 - Emotion (R) */
  {
    quotient:"Emotion",
    id:"emotion-1",
    scenario:"Something went wrong and emotions ran high. A fallout, a failure, a moment that left a mark. The professional thing was to move on. You moved on. But something stayed.",
    question:"How honest are you being about what that experience actually cost you?",
    A:"I moved past it. What matters is what comes next. Looking back is not useful.",
    B:"I stayed professional. But if I am honest, I never fully processed it. The residue is still there.",
    C:"I named it — to myself and to the people it affected. I worked through it and came out of it differently.",


    scores:{ R_emotion:[-0.8, 0.1, 0.9], P_emotion:[-0.6, 0.1, 0.7] }
  },

  /* 3 - Mind (P) */
  {
    quotient:"Mind",
    id:"mind-1",
    scenario:"You can see the pressure building. A significant challenge. A period where the usual playbook will not be enough. The world is too full, too loud, too unclear right now. And it does not wait for you to feel ready.",
    question:"How do you actually prepare your thinking before the storm hits?",
    A:"I lock in my priorities and hold them. Clarity before chaos. That is what I know how to do.",
    B:"I plan for the most likely scenario and stay flexible from there.",
    C:"I work through multiple possibilities and what I would do in each. Discomfort in the thinking is better than surprise in the moment.",
    scores:{ R_mind:[0.2, -0.5, 0.8], P_mind:[0.3, -0.8, 0.9] }
  },

  /* 4 - Alignment (R) */
  {
    quotient:"Alignment",
    id:"alignment-1",
    scenario:"A key person you depend on is suddenly unavailable. A colleague, a partner, a caregiver. The system was built around them. Now they are gone. There is no plan. This is yours to navigate.",
    question:"What does owning this situation actually look like?",
    A:"I see it. I step up. I absorb the strain and keep things moving. That is what is needed.",
    B:"Real disruption. Too much was sitting with one person. Including things it should not have been.",
    C:"Minimal disruption. I built enough shared clarity that others can navigate without me holding it all together.",
    scores:{ R_alignment:[-0.1, -0.9, 0.9], P_alignment:[-0.1, -0.9, 0.8] }
  },

  /* 5 - Execution (R) */
  {
    quotient:"Execution",
    id:"execution-1",
    scenario:"Something lands without warning. A message, a call, a development that changes everything. No time to plan. No meeting to schedule. The world just became non-linear and it is happening right now.",
    question:"What does the next hour actually look like?",
    A:"I absorb it. Orient. Start moving. Clarity comes fast even when the situation does not.",
    B:"I freeze briefly then push through. There is a cost — to my thinking, to the people around me. But I move.",
    C:"The urgency is running me. I am already on the defensive before I have had time to think.",
    scores:{ R_execution:[0.4, 0.9, -0.8], P_execution:[0.3, 0.8, -0.6] }
  },

  /* 6 - Vitality (P) */
  {
    quotient:"Vitality",
    id:"vitality-2",
    scenario:"The calendar is full. Big commitments at work, real responsibilities at home. Aging parents. School pickups. You are close to the limit and the next few months are not getting lighter. You know what this has cost you before. The question is what you do about it this time.",
    question:"What does deliberately managing your capacity actually look like?",
    A:"I build in recovery and protect it like any other commitment. Sustainability is a design choice.",
    B:"I try to model a pace I would be comfortable asking of the people around me.",
    C:"I run at full capacity and deal with the consequences later. That is what this phase requires.",
    scores:{ R_vitality:[0.2, 0.8, -0.6], P_vitality:[0.2, 0.9, -0.8] }
  },

  /* 7 - Emotion (R) */
  {
    quotient:"Emotion",
    id:"emotion-2",
    scenario:"Someone you work closely with needs to hear something difficult. A pattern they cannot see. An impact they are not owning. You have been avoiding the conversation. So have they. Keeping quiet is comfortable. It is also a choice with consequences.",
    question:"What do you actually do?",
    A:"I find a way to say it carefully. Sometimes it lands well, sometimes it does not.",
    B:"I say it directly. With care but without softening it until the message disappears. It gets received.",
    C:"I tell myself I am waiting for the right moment. The right moment rarely arrives.",
    scores:{ R_emotion:[0.1, 0.9, -0.7], P_emotion:[0.2, 0.7, -0.5] }
  },

  /* 8 - Alignment (R) */
  {
    quotient:"Alignment",
    id:"alignment-2",
    scenario:"Something that matters to you is getting quietly squeezed. Nobody is going to resolve this for you. Nobody even knows it is a conflict because you have not told them. You are already on the defensive and no one in the room knows why.",
    question:"How do you actually make the call?",
    A:"The loudest demand tends to win. I respond to what is in front of me rather than what matters most.",
    B:"I make deliberate choices. I own those choices, even the uncomfortable ones.",
    C:"I have a clear personal hierarchy of what matters. I apply it — especially when it is inconvenient.",
    scores:{ R_alignment:[-0.8, 0.2, 0.9], P_alignment:[-0.7, 0.1, 0.7] }
  },

  /* 9 - Execution (P) */
  {
    quotient:"Execution",
    id:"execution-2",
    scenario:"A moment that truly matters is approaching. High stakes. Real pressure. The kind of situation where being unprepared is not an option. The question is not whether you will face it. The question is whether you are already ready — before the pressure starts.",
    question:"What do you actually have in place right now?",
    A:"I have thought through my decision principles. I know what I stand for before I need to stand for it.",
    B:"I know what I own and what I will do first. The picture is clear even if not everything is written down.",
    C:"I have thought about it in theory. Nothing is rehearsed. I will figure it out when I get there.",
    scores:{ R_execution:[0.8, 0.1, -0.7], P_execution:[0.9, 0.2, -0.8] }
  },

  /* 10 - Vitality (R) */
  {
    quotient:"Vitality",
    id:"vitality-3",
    scenario:"The signals have been building for months. More tired than usual. Shorter fuse. The things that used to give you energy now feel like obligations. You have been telling yourself it is temporary. You have been saying that for a while.",
    question:"How honest are you being with yourself about what you are actually seeing?",
    A:"I am still calling it a phase. It will ease up. It always does. Eventually.",
    B:"I see it clearly. I am naming it — to myself and to at least one other person who can actually hear it.",
    C:"I see it. But I manage it alone. Because naming it feels like admitting something I am not ready to admit.",
    scores:{ R_vitality:[-0.6, 0.9, -0.1], P_vitality:[-0.4, 0.8, 0.0] }
  },

  /* 11 - Execution (R) */
  {
    quotient:"Execution",
    id:"execution-3",
    scenario:"You made a significant decision. Two weeks later the execution has drifted. Quietly. Incrementally. Each small shift seemed reasonable at the time. The gap between what you decided and what is actually happening is real. And it belongs to you.",
    question:"How do you handle the gap between deciding and doing?",
    A:"Rarely happens. I build regular check ins into how I work and catch drift early.",
    B:"Occasionally. I notice and correct before it becomes a real problem.",
    C:"It is a pattern I recognize in myself. I decide well and execute loosely. The two rarely stay aligned for long.",
    scores:{ R_execution:[0.9, 0.3, -0.8], P_execution:[0.8, 0.2, -0.7] }
  },

  /* 12 - Emotion (P) */
  {
    quotient:"Emotion",
    id:"emotion-3",
    scenario:"A peak moment is on the horizon. High stakes, personally significant, the kind of stretch that will test you in ways you can already feel. You have time to prepare. Not just operationally. As a person. The question is whether you use it.",
    question:"What does real personal preparation look like for you?",
    A:"I focus on what needs to get done. How I feel is something I deal with as it comes.",
    B:"I think about who I want to be in this moment — and I have that conversation with the people closest to me.",
    C:"I reflect on my own. I do not tend to bring others into this kind of preparation.",
    scores:{ R_emotion:[-0.4, 0.7, 0.2], P_emotion:[-0.8, 0.9, 0.1] }
  },

  /* 13 - Mind (R) */
  {
    quotient:"Mind",
    id:"mind-2",
    scenario:"Something significant did not work. A strategy that missed, a decision that backfired, a result that fell short. The pessimism is real. The derailing thoughts are louder than you would like. Now comes the reflection. The question is whether it changes something — or just evaporates.",
    question:"What does the reflection that actually makes you stronger look like?",
    A:"I look at what in my process created the conditions for this. That is where the change lives.",
    B:"I focus on the outcome — what went wrong and what I own. That feels like the right place to start.",
    C:"I keep it surface level and move on. Sitting with failure too long is not useful.",
    scores:{ R_mind:[0.9, -0.3, -0.6], P_mind:[0.8, 0.1, -0.5] }
  },

  /* 14 - Alignment (P) */
  {
    quotient:"Alignment",
    id:"alignment-3",
    scenario:"You have a clear direction. In your work, your priorities, what matters. Or so you believe. Six months in you pause and ask the people closest to you whether they see the same thing. Not to validate it. To find out whether it actually landed.",
    question:"What do you find?",
    A:"Consistent clarity. They describe it the way I do. They can act on it without me in the room.",
    B:"Clear in my head. Others have fragments. The gap between my clarity and theirs is larger than I expected.",
    C:"Significant divergence. What they describe is not what I intended. The direction I thought I had shared never actually landed.",
    scores:{ R_alignment:[0.6, 0.1, -0.7], P_alignment:[0.9, 0.2, -0.8] }
  },

  /* 15 - Mind (R) */
  {
    quotient:"Mind",
    id:"mind-3",
    scenario:"Under pressure a story has taken hold. About why things are hard, who is responsible, what is and is not possible. It has been running so long it has become the wallpaper. Nobody questions it anymore. Including you. That is exactly when it becomes dangerous.",
    question:"How do you relate to your own narrative when it has stopped feeling like a choice?",
    A:"I interrogate it deliberately. Comfortable stories are where blind spots live. Thinking differently is the work.",
    B:"I accept it. Challenging my own narrative feels like undermining myself or the people around me.",
    C:"I sense it is limiting. But naming it out loud feels like a risk I am not ready to take.",
    scores:{ R_mind:[0.9, -0.7, -0.2], P_mind:[0.7, -0.5, -0.1] }
  },

  /* 16 - Vitality */
  {
    quotient:"Vitality",
    id:"vitality-4",
    scenario:"You have made sacrifices to keep up — sleep, relationships, things that matter to you outside of work. Each one felt necessary at the time. Together they form a pattern. The question is not whether you can keep going. It is whether this is how you want to lead.",
    question:"What does that pattern tell you about how you are actually operating?",
    A:"I run at the limit and absorb the cost. That is what this stage of life and leadership requires.",
    B:"I see the costs clearly. I know the pattern. I have not changed it yet.",
    C:"I have deliberately designed recovery and protection into how I live and work. And I hold that boundary.",
    scores:{ R_vitality:[-0.9, 0.2, 0.9], P_vitality:[-0.8, 0.2, 0.9] }
  },

  /* 17 - Emotion */
  {
    quotient:"Emotion",
    id:"emotion-4",
    scenario:"Emotions are running strong. In this conversation, this room, this moment. Something has triggered you. You can feel it. So can everyone else. This is the moment where Readiness is either real or it is not.",
    question:"What actually happens next?",
    A:"I react. I see the impact afterwards. By then it has already landed.",
    B:"I notice it. I pause long enough to choose my response rather than just express my reaction.",
    C:"I have practiced this enough that the pause is almost automatic. The discomfort is familiar. I can work with it.",
    scores:{ R_emotion:[0.9, 0.2, -0.8], P_emotion:[0.9, 0.2, -0.9] }
  },

  /* 18 - Mind */
  {
    quotient:"Mind",
    id:"mind-4",
    scenario:"The situation is moving fast. The information is a mixture of confirmed fact, rumor, and your own interpretation. Too full. Too loud. Too unclear. You need to make sense of it. You need to move. The question is which of those two you are actually doing.",
    question:"How clearly do you separate what you know from what you are assuming?",
    A:"I explicitly label what I know, what I am assuming, and what I am still interpreting. I decide from the first category.",
    B:"Facts and assumptions blur. I act on the full picture even when parts of it are not yet confirmed.",
    C:"I rely on instinct and experience. I read the room and move. Analysis takes time I do not have.",
    scores:{ R_mind:[0.9, -0.8, 0.2], P_mind:[0.8, -0.7, 0.1] }
  },

  /* 19 - Execution */
  {
    quotient:"Execution",
    id:"execution-4",
    scenario:"You just completed something significant. The calendar does not stop. There is already pressure to move to the next thing. A small voice says: pause. Learn something that actually sticks this time. Not knowledge that evaporates after two weeks. Real change.",
    question:"What do you do with that voice?",
    A:"I create space for it. Real reflection changes how I approach the next thing. That is the whole point.",
    B:"I make time for a brief debrief. If I am honest, the insights rarely change what I do next.",
    C:"I move on. There is always something more urgent waiting. I cannot afford to look backwards.",
    scores:{ R_execution:[0.9, 0.1, -0.8], P_execution:[0.8, 0.1, -0.8] }
  },

  /* 20 - Alignment */
  {
    quotient:"Alignment",
    id:"alignment-4",
    scenario:"Significant change is coming. Professionally, personally, in circumstances beyond your control. The direction is unclear. Roles may shift. The structure has not caught up with the new reality. In a brittle and anxious world, this is the moment that separates leaders who run on instruction from leaders who run on clarity.",
    question:"How do you hold yourself and others together when the map has not been redrawn yet?",
    A:"I communicate clearly. Direction does not wait for structure. We navigate from a shared sense of what matters.",
    B:"I lean on informal relationships and instinct. I fill gaps where I can and wait where I cannot.",
    C:"I wait for clarity before I move. Ambiguity without a clear answer tends to paralyze me.",
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

const STORAGE_KEY = 'readyneering_assessment_state';
let currentResult = null;

function saveAssessmentState() {
  const prevState = loadAssessmentState() || {};

  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    ...prevState,
    current,
    placements,
    triadOrder: SHUFFLED_TRIADS.map(t => t.id),
    selectedIndustry,
    selectedIndustryLabel,
    selectedSize,
    selectedSizeLabel,
    screen: getCurrentScreen()
  }));
}

function loadAssessmentState() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
  } catch {
    return null;
  }
}

function clearAssessmentState() {
  localStorage.removeItem(STORAGE_KEY);
}

function getCurrentScreen() {
  if (document.getElementById('scr-results').style.display === 'block') return 'results';
  if (document.getElementById('scr-assess').style.display === 'block') return 'assess';
  return 'intro';
}

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

/* function getBounds(pad) {
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
} */


function wrapText(ctx, text, maxWidth) {
  const words = String(text || '').split(/\s+/).filter(Boolean);
  if (!words.length) return [''];

  const lines = [];
  let line = words[0];

  for (let i = 1; i < words.length; i++) {
    const test = line + ' ' + words[i];
    if (ctx.measureText(test).width <= maxWidth) {
      line = test;
    } else {
      lines.push(line);
      line = words[i];
    }
  }

  lines.push(line);
  return lines;
}


// ── State ─────────────────────────────────────────────────
var current = 0;
var placements = [];

var selectedIndustry = null;
var selectedIndustryLabel = null;
var selectedSize = null;
var selectedSizeLabel = null;

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

function measureWrappedBlock(ctx, text, maxWidth, lineHeight) {
  const lines = wrapText(ctx, text, maxWidth);
  let width = 0;

  for (let i = 0; i < lines.length; i++) {
    width = Math.max(width, ctx.measureText(lines[i]).width);
  }

  return {
    lines,
    width,
    height: Math.max(1, lines.length) * lineHeight
  };
}
function fitTextToRegion(ctx, text, region, lineHeight, opts) {
  const minWidth = opts.minWidth;
  const maxWidth = Math.min(opts.maxWidth, region.width);

  let best = null;

  for (let w = maxWidth; w >= minWidth; w -= opts.step || 4) {
    const block = measureWrappedBlock(ctx, text, w, lineHeight);

    if (block.width <= region.width && block.height <= region.height) {
      best = {
        lines: block.lines,
        textWidth: block.width,
        textHeight: block.height,
        wrapWidth: w
      };
      break;
    }
  }

  if (!best) {
    const fallback = measureWrappedBlock(ctx, text, maxWidth, lineHeight);
    best = {
      lines: fallback.lines,
      textWidth: Math.min(fallback.width, region.width),
      textHeight: fallback.height,
      wrapWidth: maxWidth
    };
  }

  return best;
}
function tspansFromLines(lines, anchor, x) {
  var out = '';
  for (var i = 0; i < lines.length; i++) {
    out += '<tspan x="' + x + '" dy="' + (i === 0 ? '0' : LH) + '" text-anchor="' + anchor + '">'
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

function getBounds(pad) {
  if (typeof pad === 'number') {
    pad = { top: pad, right: pad, bottom: pad, left: pad };
  }

  const minX = Math.min(TA.x, TB.x, TC.x) - pad.left;
  const maxX = Math.max(TA.x, TB.x, TC.x) + pad.right;
  const minY = Math.min(TA.y, TB.y, TC.y) - pad.top;
  const maxY = Math.max(TA.y, TB.y, TC.y) + pad.bottom;

  return {
    x: minX,
    y: minY,
    w: maxX - minX,
    h: maxY - minY
  };
}


function makeSVG(idx) {
  var t = SHUFFLED_TRIADS[idx];
  var fs = 'font-size="' + FS + '" fill="#2a2a28" font-weight="500" font-family="-apple-system,BlinkMacSystemFont,\'Segoe UI\',sans-serif"';

  // top label
  var aWrapped = wrapText(ctx, t.A, s(250));
  var aBottomY = TA.y - s(14);
  var aTopY = aBottomY - (aWrapped.length - 1) * LH;

  // Explicit safe regions for side labels
  // B region: starts just right of left vertex, extends downward
  // C region: ends just left of right vertex, extends downward
  var sideTop = TB.y + s(16);
  var sideBottom = TB.y + s(108); // adjust this if you want more/less allowed height
  var sideHeight = sideBottom - sideTop;

  var bRegion = {
    x: TB.x + s(6),
    y: sideTop,
    width: GX - TB.x - s(28),
    height: sideHeight
  };

  var cRegion = {
    x: GX + s(28),
    y: sideTop,
    width: TC.x - GX - s(34),
    height: sideHeight
  };

  var bFit = fitTextToRegion(ctx, t.B, bRegion, LH, {
    minWidth: s(70),
    maxWidth: s(150),
    step: 4
  });

  var cFit = fitTextToRegion(ctx, t.C, cRegion, LH, {
    minWidth: s(70),
    maxWidth: s(150),
    step: 4
  });

  var bTopY = bRegion.y;
  var cTopY = cRegion.y;

  var gx = GX.toFixed(1), gy = GY.toFixed(1);
  var mABx = ((TA.x + TB.x) / 2).toFixed(1), mABy = ((TA.y + TB.y) / 2).toFixed(1);
  var mBCx = ((TB.x + TC.x) / 2).toFixed(1), mBCy = ((TB.y + TC.y) / 2).toFixed(1);
  var mCAx = ((TC.x + TA.x) / 2).toFixed(1), mCAy = ((TC.y + TA.y) / 2).toFixed(1);

  // Bottom padding is driven by actual fitted block height, not just line count
  var sideTextBottom = Math.max(
    bRegion.y + bFit.textHeight,
    cRegion.y + cFit.textHeight
  );

  var extraBottomPad = Math.max(
    s(60),
    sideTextBottom - TB.y + s(20)
  );

  var vw = window.innerWidth;

  var sidePad = vw <= 1023 ? s(28) : s(90);

  const B = getBounds({
    top: s(80),
    right: sidePad,
    bottom: extraBottomPad,
    left: sidePad
  });

  return '<svg id="svg-' + idx + '" viewBox="' + B.x + ' ' + B.y + ' ' + B.w + ' ' + B.h + '" xmlns="http://www.w3.org/2000/svg"'
    + ' style="display:block;width:100%;cursor:crosshair;touch-action:pan-y;user-select:none;overflow:visible">'

    + '<line x1="' + gx + '" y1="' + gy + '" x2="' + mABx + '" y2="' + mABy + '" stroke="rgba(119,1,54,0.1)" stroke-width="' + s(1) + '"/>'
    + '<line x1="' + gx + '" y1="' + gy + '" x2="' + mBCx + '" y2="' + mBCy + '" stroke="rgba(119,1,54,0.1)" stroke-width="' + s(1) + '"/>'
    + '<line x1="' + gx + '" y1="' + gy + '" x2="' + mCAx + '" y2="' + mCAy + '" stroke="rgba(119,1,54,0.1)" stroke-width="' + s(1) + '"/>'

    + '<polygon points="' + TA.x + ',' + TA.y + ' ' + TB.x + ',' + TB.y + ' ' + TC.x + ',' + TC.y + '"'
    + ' fill="rgba(119,1,54,0.05)" stroke="rgba(119,1,54,0.3)" stroke-width="' + s(1.5) + '" stroke-linejoin="round"/>'

    + '<circle cx="' + TA.x + '" cy="' + TA.y + '" r="' + s(5) + '" fill="#770136" opacity="0.4"/>'
    + '<circle cx="' + TB.x + '" cy="' + TB.y + '" r="' + s(5) + '" fill="#770136" opacity="0.4"/>'
    + '<circle cx="' + TC.x + '" cy="' + TC.y + '" r="' + s(5) + '" fill="#770136" opacity="0.4"/>'

    + '<text ' + fs + ' y="' + aTopY + '">' + tspansFromLines(aWrapped, 'middle', TA.x) + '</text>'
    + '<text ' + fs + ' y="' + bTopY + '">' + tspansFromLines(bFit.lines, 'start', bRegion.x) + '</text>'
    + '<text ' + fs + ' y="' + cTopY + '">' + tspansFromLines(cFit.lines, 'end', cRegion.x + cRegion.width) + '</text>'

    + '<circle id="ring-' + idx + '" cx="-999" cy="-999" r="' + s(20) + '" fill="rgba(119,1,54,0.8)" opacity="0" style="pointer-events:none"/>'
    + '<circle id="dot-' + idx + '"  cx="-999" cy="-999" r="' + s(11) + '" fill="#770136" opacity="0" style="pointer-events:none"/>'
    + '<circle id="pip-' + idx + '"  cx="-999" cy="-999" r="' + s(5) + '"  fill="#fff" opacity="0" style="pointer-events:none"/>'

    + '<rect x="' + B.x + '" y="' + B.y + '" width="' + B.w + '" height="' + B.h + '" fill="transparent"/>'
    + '</svg>';
}

// ── Build all steps ───────────────────────────────────────
function buildSteps(savedState) {
  var wrap = document.getElementById('steps-wrap');
  var html = '';

  if (savedState && savedState.triadOrder && savedState.triadOrder.length) {
    SHUFFLED_TRIADS = savedState.triadOrder
      .map(id => TRIADS.find(t => t.id === id))
      .filter(Boolean);
  } else {
    SHUFFLED_TRIADS = shuffle([...TRIADS]);
  }

  placements = (savedState && savedState.placements) 
    ? savedState.placements 
    : new Array(SHUFFLED_TRIADS.length).fill(null);

  current = (savedState && typeof savedState.current === 'number')
    ? savedState.current
    : 0;

  for (var i = 0; i < SHUFFLED_TRIADS.length; i++) {
    var t = SHUFFLED_TRIADS[i];
    var display = i === current ? 'block' : 'none';

    html += '<div id="step-'+i+'" style="display:'+display+'">'
      +'<div class="card">'
      +'<div class="scenario-text">'+esc(t.scenario)+'</div>'
      +'</div>'
      +'<div class="question">'+esc(t.question)
      +'<div class="hint">Click or tap anywhere inside the triangle. You can reposition your dot before moving on.</div>'
      +'</div>'
      +'<div class="tri-wrap">'+makeSVG(i)+'</div>'
      +'<div class="placed" id="placed-'+i+'"></div>'
/*       +'<div class="pills">'
      +'<div class="pill">A: <b id="pa-'+i+'">-</b></div>'
      +'<div class="pill">B: <b id="pb-'+i+'">-</b></div>'
      +'<div class="pill">C: <b id="pc-'+i+'">-</b></div>' */
      +'</div>'
      +'</div>';
  }

  wrap.innerHTML = html;

  for (var j = 0; j < SHUFFLED_TRIADS.length; j++) {
    attachEvents(j);
  }

  rehydratePlacements();
}

function rehydratePlacements() {
  for (var idx = 0; idx < placements.length; idx++) {
    var pt = placements[idx];
    if (!pt) continue;

    var ring = document.getElementById('ring-' + idx);
    var dot  = document.getElementById('dot-' + idx);
    var pip  = document.getElementById('pip-' + idx);

    if (!ring || !dot || !pip) continue;

    ring.setAttribute('cx', pt.x);
    ring.setAttribute('cy', pt.y);
    dot.setAttribute('cx', pt.x);
    dot.setAttribute('cy', pt.y);
    pip.setAttribute('cx', pt.x);
    pip.setAttribute('cy', pt.y);

    gsap.set(ring, { opacity: 0.7 });
    gsap.set(dot,  { opacity: 1 });
    gsap.set(pip,  { opacity: 1 });

    var b = bary(pt.x, pt.y);
    var tot = Math.max(b[0] + b[1] + b[2], 0.001);

/*     document.getElementById('pa-' + idx).textContent = Math.round(b[0] / tot * 100) + '%';
    document.getElementById('pb-' + idx).textContent = Math.round(b[1] / tot * 100) + '%';
    document.getElementById('pc-' + idx).textContent = Math.round(b[2] / tot * 100) + '%'; */
    /* document.getElementById('placed-' + idx).textContent = 'Dot placed - click to reposition'; */
  }
}

function attachEvents(idx) {
  var svg = document.getElementById('svg-'+idx);
  if (!svg) return;

  function place(e) {
    var pt = svgPt(svg, e);
    if (!inTri(pt.x, pt.y)) return;
    e.preventDefault();

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
    /* document.getElementById('pa-'+idx).textContent = Math.round(b[0]/tot*100)+'%';
    document.getElementById('pb-'+idx).textContent = Math.round(b[1]/tot*100)+'%';
    document.getElementById('pc-'+idx).textContent = Math.round(b[2]/tot*100)+'%';
    /* document.getElementById('placed-'+idx).textContent = 'Dot placed - click to reposition'; */
    document.getElementById('warn').style.display = 'none';
    saveAssessmentState();
  }

  svg.addEventListener('click', place);
  svg.addEventListener('touchstart', place, {passive:false});
  //svg.addEventListener('touchmove', place, {passive:false});
}

// ── Navigation ────────────────────────────────────────────
function updateUI() {
  var pct = (current / SHUFFLED_TRIADS.length * 100);

  const isLast = current === SHUFFLED_TRIADS.length - 1;
  const isHalfway = (current + 1) === Math.ceil(SHUFFLED_TRIADS.length / 2);
  let label = 'Next';
  
  if (isLast) {
    label = 'Generate my readiness profile';
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
  if (isSubmittingAssessment) return;

  if (!placements[current]) {
    document.getElementById('warn').style.display = 'block';
    return;
  }

  if (current === SHUFFLED_TRIADS.length - 1) {
    isSubmittingAssessment = true;
    document.getElementById('btn-next').innerHTML = 'Generating profile...';
    document.getElementById('btn-next').style.pointerEvents = 'none';
    document.getElementById('btn-back').disabled = true;

    beginVerifyAndSubmit();

    return;
  }

  var next = current + 1;
  showStep(next, 'forward');
  current = next;
  saveAssessmentState();
  setTimeout(updateUI, 100);
  window.scrollTo(0, 0);
});

document.getElementById('btn-back').addEventListener('click', function() {
  if (current > 0) {
    var prev = current - 1;
    showStep(prev, 'back');
    current = prev;
    saveAssessmentState();
    setTimeout(updateUI, 100);
    window.scrollTo(0, 0);
  }
});

function getLevel(score) {
  if (score >= 3.3) return 'high';
  if (score >= 3.0) return 'mid';
  return 'low';
}


function getDebriefLevel(score) {
  if (score < 2.5) return 'risk';
  if (score < 3.5) return 'developing';
  if (score < 4.3) return 'building';
  return 'strong';
}

function isDevelopingOrLower(level) {
  return level === 'risk' || level === 'developing';
}

function isBuildingOrHigher(level) {
  return level === 'building' || level === 'strong';
}

function getModeStructure(rScore, pScore) {
  const rLevel = getDebriefLevel(rScore);
  const pLevel = getDebriefLevel(pScore);

  const rLow = isDevelopingOrLower(rLevel);
  const pLow = isDevelopingOrLower(pLevel);

  const rHigh = isBuildingOrHigher(rLevel);
  const pHigh = isBuildingOrHigher(pLevel);

  if (rLevel === 'strong' && pLevel === 'strong') {
    return {
      modeStructure: 'both-strong',
      modeTag: 'Genuinely ready - protect this and help others build it',
      resilienceLevel: rLevel,
      preparednessLevel: pLevel
    };
  }

  if (rLow && pLow) {
    return {
      modeStructure: 'both-low',
      modeTag: 'The foundation needs work across both dimensions',
      resilienceLevel: rLevel,
      preparednessLevel: pLevel
    };
  }

  if (rLow && pHigh) {
    return {
      modeStructure: 'preparedness-high-resilience-low',
      modeTag: 'Strong direction and execution, but the personal resilience foundation is fragile',
      resilienceLevel: rLevel,
      preparednessLevel: pLevel
    };
  }

  if (rHigh && pLow) {
    return {
      modeStructure: 'resilience-high-preparedness-low',
      modeTag: 'Relying on individual effort where shared habits and clearer thinking could do the work',
      resilienceLevel: rLevel,
      preparednessLevel: pLevel
    };
  }

  if (rHigh && pHigh) {
    return {
      modeStructure: 'both-building-or-higher',
      modeTag: 'Current pattern: solid across both dimensions - the priority now is consistency under sustained pressure',
      resilienceLevel: rLevel,
      preparednessLevel: pLevel
    };
  }

  return {
    modeStructure: 'unknown',
    modeTag: '',
    resilienceLevel: rLevel,
    preparednessLevel: pLevel
  };
}

function buildModeInsights(results) {
  function avgLabel(key) {
    return key.charAt(0).toUpperCase() + key.slice(1);
  }

  var rParts = [];
  var pParts = [];

  for (var i = 0; i < QDIMS.length; i++) {
    var q = QDIMS[i];
    rParts.push({
      key: q,
      label: avgLabel(q),
      value: results.dim['R_' + q]
    });
    pParts.push({
      key: q,
      label: avgLabel(q),
      value: results.dim['P_' + q]
    });
  }

  var rAsc = rParts.slice().sort(function(a, b) { return a.value - b.value; });
  var rDesc = rParts.slice().sort(function(a, b) { return b.value - a.value; });
  var pAsc = pParts.slice().sort(function(a, b) { return a.value - b.value; });
  var pDesc = pParts.slice().sort(function(a, b) { return b.value - a.value; });

  var delta = results.P - results.R;

  var structure = 'balanced';
  if (delta > 0.25) structure = 'preparedness-heavy';
  else if (delta < -0.25) structure = 'resilience-heavy';
  const mode = getModeStructure(results.R, results.P);

  return {
    delta: delta,
    structure: structure,
    modeStructure: mode.modeStructure,
    modeTag: mode.modeTag,
    resilienceLevel: mode.resilienceLevel,
    preparednessLevel: mode.preparednessLevel,
    resilience: {
      key: 'resilience',
      label: 'Resilience',
      score: results.R,
      level: getLevel(results.R),
      strongest: rDesc[0],
      weakest: rAsc[0],
      spread: rDesc[0].value - rAsc[0].value,
      parts: rParts
    },
    preparedness: {
      key: 'preparedness',
      label: 'Preparedness',
      score: results.P,
      level: getLevel(results.P),
      strongest: pDesc[0],
      weakest: pAsc[0],
      spread: pDesc[0].value - pAsc[0].value,
      parts: pParts
    }
  };
}

function getModeSupportLine(mode) {
  function styledLabel(q) {
    return `<span class="q-chip ${q.key}">${q.label}</span>`;
  }

  return `Supported most by ${styledLabel(mode.strongest)}, constrained most by ${styledLabel(mode.weakest)}.`;
}

function getModeSpreadLine(mode) {
  if (mode.spread > 0.6) {
    return "This pattern is uneven across quotients, suggesting it depends on a few stronger areas more than a complete system.";
  }
  if (mode.spread > 0.35) {
    return "This pattern is somewhat uneven across quotients, with a few visible weak points.";
  }
  return "This pattern is relatively coherent across quotients.";
}

function getModeStructureLine(modeKey, structure) {
  if (modeKey === 'resilience' && structure === 'preparedness-heavy') {
    return "Preparedness is currently stronger than resilience, suggesting intended standards may not always hold under pressure.";
  }

  if (modeKey === 'preparedness' && structure === 'preparedness-heavy') {
    return "Preparedness is currently the stronger mode, suggesting expectations and structure are ahead of live consistency.";
  }

  if (modeKey === 'resilience' && structure === 'resilience-heavy') {
    return "Resilience is currently the stronger mode, suggesting people may be coping well even where structure is less developed.";
  }

  if (modeKey === 'preparedness' && structure === 'resilience-heavy') {
    return "Preparedness currently trails resilience, suggesting performance may depend more on coping than on design.";
  }

  return "Resilience and preparedness are relatively balanced in the current profile.";
}

function buildModeCards(results) {
  var insights = buildModeInsights(results);

  return ['resilience', 'preparedness'].map(function(modeKey) {
    var mode = insights[modeKey];
    var meta = MODE_META[modeKey];
    var level = mode.level;

    return {
      key: mode.key,
      label: mode.label,
      score: mode.score,
      level: level,
      role: meta.role,
      signal: meta.signal[level],
      risk: meta.risk[level],
      question: meta.question[level],
      supportLine: getModeSupportLine(mode),
      spreadLine: getModeSpreadLine(mode),
      structureLine: getModeStructureLine(modeKey, insights.structure),
      strongest: mode.strongest,
      weakest: mode.weakest,
      spread: mode.spread
    };
  });
}

var MODE_QS = {
  resilience: ['vitality', 'emotion'],
  preparedness: ['execution', 'mind', 'alignment']
};

function renderQChipsForMode(key) {
  var qs = MODE_QS[key] || [];

  return qs.map(function(q) {
    return `<span class="q-chip ${q}">${q}</span>`;
  }).join('');
}

function renderModeCard(m) {
  return `
    <div class="mode-card ${m.key} ${m.level}">
      <div class="mode-head">
        <div class="mode-label ${m.key}">${m.label} - </div>
        <div class="mode-score">${m.score.toFixed(2)}</div>
      </div>

      <div class="mode-role">${m.role}</div>

      <div class="mode-quotients">
        ${renderQChipsForMode(m.key)}
      </div>

      <!--
      <div class="mode-section">
        <div class="mode-section-label">Current signal</div>
        <div class="mode-copy">${m.signal}</div>
      </div>

      <div class="mode-section">
        <div class="mode-section-label">Composition</div>
        <div class="mode-copy">${m.supportLine}</div>
      </div>

      <div class="mode-section">
        <div class="mode-section-label">Structural pattern</div>
        <div class="mode-copy">${m.structureLine}</div>
      </div>

      <div class="mode-section">
        <div class="mode-section-label">Risk</div>
        <div class="mode-copy">${m.risk}</div>
      </div>

      <div class="mode-section">
        <div class="mode-section-label">Reflection question</div>
        <div class="mode-copy">${m.question}</div>
      </div>
      -->
    </div>
  `;
}

function renderModeGrid(results) {
  var modes = buildModeCards(results);

  return `
    <div class="mode-grid">
      ${modes.map(renderModeCard).join('')}
    </div>
  `;
}

// ── Scoring ───────────────────────────────────────────────
var DIMS = ['R_vitality','R_emotion','R_mind','R_execution','R_alignment',
            'P_vitality','P_emotion','P_mind','P_execution','P_alignment'];
var QDIMS = ['vitality','emotion','mind','execution','alignment'];


function renderFocusChipList(items) {
  if (!items || !items.length) return '';

  var chips = items.map(function(item) {
    return `
      <span class="q-chip ${item.key}">
        ${item.label} <span class="chip-build ${item.build}">(${capitalizeFirst(item.build)})</span>
      </span>
    `;
  });

  if (chips.length === 1) {
    return chips[0];
  }

  if (chips.length === 2) {
    return chips[0] + ' <span class="subtitle-and">and</span> ' + chips[1];
  }

  return chips.slice(0, -1).join(', ') +
    ', <span class="subtitle-and">and</span> ' +
    chips[chips.length - 1];
}

function renderServerFocusSubtitle(focusActions) {
  var items = focusActions.subtitleItems || [];

  if (!items.length) return '';

  var chipHtml = renderFocusChipList(items);

  var intro = items.length === 1
    ? 'These come directly from your lowest-scoring quotient - '
    : 'These come directly from your two lowest-scoring quotients - ';

  return `
    <p class="page-sub" style="color:#555555 !important; line-height: 1.75; font-size: 13px; max-width: 755px; margin-bottom: 5%;">
      ${intro}${chipHtml}.
      They apply whether you are a people manager, an individual contributor, or both.
    </p>
  `;
}
const QUOTIENT_DIMENSIONS = {
  vitality:  'Resilience',
  emotion:   'Resilience',
  mind:      'Preparedness',
  execution: 'Preparedness',
  alignment: 'Preparedness',
};

function bandLabelFromScore(score) {
  if (score < 2.5) return 'at-risk';
  if (score < 3.5) return 'developing';
  if (score < 4.3) return 'building';
  return 'ready';
}

function dimensionAverage(scores, dimension) {
  // scores.dimensions has keys like 'R_vitality', 'P_mind', etc.
  const prefix = dimension === 'Resilience' ? 'R_' : 'P_';
  const dims = Object.keys(scores.dimensions).filter((k) => k.startsWith(prefix));
  if (!dims.length) return null;
  const sum = dims.reduce((acc, k) => acc + scores.dimensions[k], 0);
  return sum / dims.length;
}

function renderPatternDiagnosis(open) {
  const ranked = open.ranked || [];
  if (ranked.length < 2) return '';
  const [a, b] = ranked;
  const dimA = QUOTIENT_DIMENSIONS[a.key];
  const dimB = QUOTIENT_DIMENSIONS[b.key];
  const sameDimension = dimA === dimB;

  let combinationLine;

  if (sameDimension) {
    const dimBand = bandLabelFromScore(dimensionAverage(open.scores, dimA));
    combinationLine = `two ${escapeHtml(dimBand)} ${escapeHtml(dimA)} quotients pulling against the rest`;
  } else {
    const dimAScore = dimensionAverage(open.scores, dimA);
    const dimBScore = dimensionAverage(open.scores, dimB);
    const bandA = bandLabelFromScore(dimAScore);
    const bandB = bandLabelFromScore(dimBScore);
    const sameBand = bandA === bandB;

    if (sameBand) {
      combinationLine = `both Resilience and Preparedness in the ${escapeHtml(bandA)} band, with ${escapeHtml(a.key)} and ${escapeHtml(b.key)} under the most strain`;
    } else {
      const weakerDim   = dimAScore <= dimBScore ? dimA : dimB;
      const strongerDim = dimAScore <= dimBScore ? dimB : dimA;
      const weakerBand   = bandLabelFromScore(Math.min(dimAScore, dimBScore));
      const strongerBand = bandLabelFromScore(Math.max(dimAScore, dimBScore));
      combinationLine = `${escapeHtml(weakerBand)} ${escapeHtml(weakerDim)} against ${escapeHtml(strongerBand)} ${escapeHtml(strongerDim)}`;
    }
  }

  const symptomLine = getSymptomLine(a.key, b.key);
  return `
    <p class="next-lede">
      A Readiness score is a starting point. <span class="next-lede__bold">Not a verdict. Not a destination.</span>
    </p>
    <p class="next-lede">
      Your <span class="next-q-name next-q-name--${escapeHtml(a.key)}">${escapeHtml(a.label)}</span> is at <strong>${a.score.toFixed(1)}</strong>. 
      Your <span class="next-q-name next-q-name--${escapeHtml(b.key)}">${escapeHtml(b.label)}</span> is at <strong>${b.score.toFixed(1)}</strong>. 
      That specific combination — ${combinationLine} — shows up in a predictable way. 
      ${symptomLine}
    </p>
  `;
}
function renderSourceComment(open) {
  const ranked = open.ranked || [];
  if (ranked.length < 2) return '';
  const [a, b] = ranked;
  const dimA = QUOTIENT_DIMENSIONS[a.key];
  const dimB = QUOTIENT_DIMENSIONS[b.key];

  return `
    <p class="next-lede">
      Shaped from your ${escapeHtml(a.label)} and ${escapeHtml(b.label)} scores.
    </p>
  `;
}
function getSymptomLine(keyA, keyB) {
  const pair = [keyA, keyB].sort().join('|');
  const lines = {
    'execution|mind':
      'In meetings. In Monday mornings. In the gap between what you decide and what actually happens.',

    'emotion|vitality':
      'In the third day of a hard week. In the response you wish you had not sent. In how you arrive home.',

    'alignment|mind':
      'In the meeting where the direction sounded clear and nothing moved. In the strategy you have explained three times and still see misread. In the second draft that never came.',

    'execution|alignment':
      'In the project that drifted. In the priorities that quietly multiplied. In what got shipped versus what got planned.',

    'emotion|mind':
      'In the decision made too fast to feel. In the conversation you keep meaning to have. In the story you keep telling yourself about why it has not happened yet.',

    'emotion|execution':
      'In the call you postponed. In the action you knew was right but did not take. In how Friday afternoon feels.',

    'mind|vitality':
      'In the 4pm strategy session. In the decision made on an empty tank. In the thinking that should have been clearer than it was.',

    'alignment|emotion':
      'In the team meeting where the real thing did not get said. In the silence after a hard call. In the trust that quietly thins.',

    'alignment|vitality':
      'In the week that lost its shape. In the priorities that shifted without anyone noticing. In what you meant to build versus what got built.',

    'execution|vitality':
      'In the plan that ran out of fuel before it ran out of work. In the Friday afternoon where commitments dissolve. In what got done versus what mattered.',
  };
  return lines[pair] ||
    'In meetings. In transitions. In the quiet moments where the pattern repeats itself.';
}

function renderFocusCallout(focusActions) {
  var items = focusActions.subtitleItems || [];
  var quotientChips = renderFocusChipList(items);

  var finalSentence = quotientChips
    ? `Small, consistent shifts in ${quotientChips} will do more than a significant effort in an area where you are already strong.`
    : 'Small, consistent shifts where your scores are lowest will do more than a significant effort in an area where you are already strong.';

  return `
    <div class="focus-actions-callout">
      <p>
        These three priorities come from where your scores are lowest across the Five Quotients.
        <br>
        Remember: <strong>Readiness = Preparedness × Resilience.</strong>
        A gap in either dimension cannot be covered by strength in the other.
        <br>
        ${finalSentence}
      </p>
    </div>
  `;
}

function capitalizeFirst(value) {
  if (!value) return '';
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function buildActionGroup(quotients, actionKey, limit) {
  if (!quotients || !quotients.length) return [];

  if (quotients.length === 1) {
    return buildActionsForQuotient(quotients[0], actionKey).slice(0, limit);
  }

  var firstActions = buildActionsForQuotient(quotients[0], actionKey);
  var secondActions = buildActionsForQuotient(quotients[1], actionKey);

  var actions = [
    firstActions[0],
    firstActions[1],
    secondActions[0]
  ].filter(Boolean);

  return actions.slice(0, limit);
}

function buildActionsForQuotient(q, actionKey) {
  return (q[actionKey] || []).map(function(text) {
    return {
      key: q.key,
      label: q.label,
      score: q.score,
      band: getQuotientLevel(Number(q.score)),
      build: q.build,
      text: text
    };
  });
}

/* function computeVerdict(overallScore) {
  const levels = [
    {min:20.0, cls:'v-s1', label:'Ready',
     desc:'You operate as a deliberately designed system. Pressure reveals capability, not fragility.'},
    {min:13.0, cls:'v-s2', label:'Building',
     desc:'You execute well under normal conditions. One significant disruption will expose structural gaps.'},
    {min:7.0, cls:'v-s3', label:'Developing',
     desc:'Firefighting dominates. Heroics compensate for missing systems. Structural investment is the answer.'},
    {min:0.0, cls:'v-s4', label:'At risk',
     desc:'Instability is likely under sustained stress. Immediate structural intervention required.'}
  ];

  for (let i = 0; i < levels.length; i++) {
    if (overallScore >= levels[i].min) {
      return levels[i];
    }
  }

  return levels[levels.length - 1];
} */

function getVariantKey() {
  const params = new URLSearchParams(window.location.search);

  return params.get('v') || 'public';
}

function getBarycentricForPlacement(placement) {
  const b = bary(placement.x, placement.y);
  const total = Math.max(b[0] + b[1] + b[2], 0.001);

  return {
    a: b[0] / total,
    b: b[1] / total,
    c: b[2] / total
  };
}

function buildSubmissionPayload() {
  const items = SHUFFLED_TRIADS.map(function(triad, index) {
    const placement = placements[index];

    return {
      item_key: triad.id,
      item_index: index,
      item_type: 'triad',
      response_value: {
        barycentric: getBarycentricForPlacement(placement)
      }
    };
  });

  return {
    submission: {
      variant_key: getVariantKey(),
      session_id: getSessionId(),
      metadata: {
        source: 'web_app',
        batch_id: getQueryParam('batch_id'),
        industry: selectedIndustry,
        size: selectedSize,
        privacy: getPrivacyConsentRecord()
      }
    },
    items
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
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="#252525" stroke="${trackColor}" stroke-width="10" />
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
/* function renderQuotientCard(q, isLast) {
  return `
    <div class="q-card ${q.level} ${q.key} ${isLast ? 'span-2' : ''}">
      <span class="orb orb-1"></span>
      <span class="orb orb-2"></span>
      <span class="orb orb-3"></span>
      ${isLast ? '<div class="q-last">Your Primary Constraint</div>' : ''}
      <div class="q-head">
        <div class="q-label">${q.label}</div>
        <div class="q-metrics">
          <div class="q-score">${q.score.toFixed(1)}</div>
          <div class="q-bars">
            <div>R ${q.resilience.toFixed(1)}</div>
            <span>·</span>
            <div>P ${q.preparedness.toFixed(1)}</div>
          </div>
        </div>
      </div>

      <div class="q-role">${q.role}</div>

      <div class="q-section">
        <div class="q-section-label">What this layer reveals</div>
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
    </div>
  `;
} */


var MODE_QS_COMPACT = {
  resilience: ['vitality', 'emotion'],
  preparedness: ['mind', 'execution', 'alignment']
};

function getQuotientLevel(score) {
  if (score < 2.5) return 'risk';
  if (score < 3.5) return 'developing';
  if (score < 4.3) return 'building';
  return 'ready';
}

function getQuotientLevelLabel(level) {
  var labels = {
    risk: 'At risk',
    developing: 'Developing',
    building: 'Building',
    ready: 'Ready'
  };

  return labels[level] || 'Developing';
}

function getQuotientBarPercent(score) {
  var pos = ((score - 1) / (5 - 1)) * 100;
  return Math.max(0, Math.min(100, pos));
}

function getQuotientRowColor(q) {
  var level = getQuotientLevel(q.score);

  var levelColors = {
    risk: '#f87171',
    developing: '#fbbf24',
    building: '#34d399',
    ready: '#60a5fa'
  };

  return levelColors[level] || '#60a5fa';
}

/* function renderCompactQuotientRow(q) {
  var level = getQuotientLevel(q.score);
  var levelLabel = getQuotientLevelLabel(level);
  var barPercent = getQuotientBarPercent(q.score);
  var color = getQuotientRowColor(q);

  return `
    <div class="q-compact-row ${q.key} ${level}">
      <div class="q-compact-info">
        <div class="q-chip ${q.key}">${q.label}</div>
        <div class="q-compact-role">${q.roleS}</div>
      </div>

      <div class="q-compact-bar-wrap">
        <div class="q-compact-bar-track">
          <div 
            class="q-compact-bar-fill" 
            style="width: ${barPercent}%; background-color: ${color};">
          </div>
        </div>
      </div>

      <div class="q-compact-score">${q.score.toFixed(1)}</div>

      <div class="q-compact-badge ${level}">
        ${levelLabel}
      </div>
    </div>
  `;
} */
function renderCompactQuotientRow(q) {
  var level = getQuotientLevel(q.score);
  var levelLabel = getQuotientLevelLabel(level);
  var barPercent = getQuotientBarPercent(q.score);
  var color = getQuotientRowColor(q);

  return `
    <div class="quotient-row">
      <div class="q-meta">
        <div class="q-chip ${q.key}">${q.label}</div>
        <div class="q-desc">${q.roleS}</div>
      </div>
      <div class="q-scale" style="--pos:${barPercent}%;">
        <div class="q-bar"></div>
        <div class="q-tick"></div>
      </div>
      <div class="q-score">
        <span class="q-value">${q.score.toFixed(1)}</span>
        <span class="q-band band-${level}">${levelLabel}</span>
      </div>
    </div>
  `;
}
function renderCompactQuotientSection(title, keys, quotients) {
  var rows = keys
    .map(function(key) {
      return quotients.find(function(q) {
        return q.key === key;
      });
    })
    .filter(Boolean);

  var subtitle = rows.map(function(q) {
    return q.label;
  }).join(' · ');

  return `
    <div class="q-compact-section">
      <div class="q-compact-section-head">
        <div class="q-compact-title">${title}</div>
        <div class="q-compact-subtitle">${subtitle}</div>
      </div>

      <div class="q-compact-rows">
        ${rows.map(renderCompactQuotientRow).join('')}
      </div>
    </div>
  `;
}

function renderCompactQuotientList(quotients) {
  return `
    <div class="q-compact-list">
      ${renderCompactQuotientSection(
        'Resilience Quotients',
        MODE_QS_COMPACT.resilience,
        quotients
      )}

      ${renderCompactQuotientSection(
        'Preparedness Quotients',
        MODE_QS_COMPACT.preparedness,
        quotients
      )}
    </div>
  `;
}

function mountCompactQuotientList(wrapperId, quotients) {
  var wrapper = document.getElementById(wrapperId);

  if (!wrapper) return;

  wrapper.innerHTML = renderCompactQuotientList(quotients);
}

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function nextFrame() {
  return new Promise(resolve => requestAnimationFrame(() => resolve()));
}

function renderServerRankedSignalList(ranked) {
  const lowest = ranked[0];
  const nextLowest = ranked[1];
  const strongest = ranked.slice(2);

  return `
    <div class="ranked-signal-card">
      ${renderRankedSignalRow(lowest, 'risk')}
      ${renderRankedSignalRow(nextLowest, 'developing')}
      ${renderRankedSignalGroup(strongest, 'building')}
    </div>
  `;
}


function splitFirstSentence(text) {
  const match = text.match(/^(.+?[.!?])(\s+[\s\S]*)?$/);

  return {
    heading: match ? match[1] : text,
    body: match && match[2] ? match[2].trim() : ''
  };
}

function getOutcomePrefix(actionType) {
  if (actionType === 'doLess') {
    return 'Supports';
  }

  if (actionType === 'sitWith') {
    return 'Reflecting on this supports';
  }

  return 'Supports';
}

function renderTinyUpArrow() {
  return `
    <svg class="outcome-arrow" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 20L12 4M12 4L18 10M12 4L6 10"></path>
    </svg>
  `;
}

function renderFocusActionList(items, actionType) {
  return items.map(function(item, index) {
    const parts = splitFirstSentence(item.text);
    const outcomePrefix = getOutcomePrefix(actionType);
    const upArrow = renderTinyUpArrow();

    return `
      <div class="focus-action-card ${item.key}">
        <div class="focus-action-number">${index + 1}</div>

        <div class="focus-action-copy">
          <h4 class="focus-action-heading">${parts.heading}</h4>
          ${parts.body ? `<p class="focus-action-body">${parts.body}</p>` : ''}

          <div class="focus-action-outcome">
            <span class="outcome-prefix">${outcomePrefix}</span>
            <span class="q-chip ${item.key}">${item.label} ${upArrow}</span>
            <span class="${item.build}">${item.build} ${upArrow}</span>
          </div>
        </div>
      </div>
    `;
  }).join('');
}


function renderFocusActionsSection(focusActions) {
  return `
    <div class="focus-actions-section">
      <div class="focus-actions-block do-more">
        <div class="focus-actions-block-header">
          <span class="section-icon section-icon-up" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <path d="M12 4L12 20M12 20L18 14M12 20L6 14" />
            </svg>
          </span>
          <strong>Do more of this</strong>
        </div>
        ${renderFocusActionList(focusActions.doMore, 'doMore')}
      </div>

      <div class="focus-actions-block do-less">
        <div class="focus-actions-block-header">
          <span class="section-icon section-icon-down" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <path d="M12 4L12 20M12 20L18 14M12 20L6 14" />
            </svg>
          </span>
          <strong>Do less of this</strong>
        </div>
        ${renderFocusActionList(focusActions.doLess, 'doLess')}
      </div>

      <div class="focus-actions-block questions">
        <div class="focus-actions-block-header">
          <span class="section-icon section-icon-question" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <path d="M12 19H12.01M8.21704 7.69689C8.75753 6.12753 10.2471 5 12 5C14.2091 5 16 6.79086 16 9C16 10.6565 14.9931 12.0778 13.558 12.6852C12.8172 12.9988 12.4468 13.1556 12.3172 13.2767C12.1629 13.4209 12.1336 13.4651 12.061 13.6634C12 13.8299 12 14.0866 12 14.6L12 16" />
            </svg>
          </span>
          <strong>Sit with these questions</strong>
        </div>
        <p class="focus-question-intro">
          These are questions to sit with, not problems to solve immediately. There are no right answers - just honest ones.
        </p>
        ${renderFocusQuestionList(focusActions.sitWith)}
      </div>
      ${renderFocusCallout(focusActions)}
    </div>
  `;
}

function renderFocusQuestionList(items) {
  return `
    <div class="focus-question-list">
      ${items.map(function(item) {
        return `
          <p class="focus-question-item">${item.text}</p>
        `;
      }).join('')}
    </div>
  `;
}

function renderRankedSignalRow(q, tone) {
  if (!q) return '';

  var suffix = getRankedSignalSuffix(tone, [q]);

  return `
    <div class="ranked-signal-row ${tone}">

      <div class="ranked-signal-copy">
        <div class="ranked-signal-copy-title-div">
          <span class="q-chip ${q.key}">${q.label}</span> <strong>(${q.score.toFixed(1)} - ${formatLevel(q.score)}).</strong>
        </div>
        ${q.signal}
        ${suffix ? `<span class="ranked-signal-suffix">${suffix}</span>` : ''}
      </div>
    </div>
  `;
}

function getRankedSignalSuffix(tone, items) {
  var build = items && items[0] ? items[0].build : null;

  var buildLabel = build
    ? build.charAt(0).toUpperCase() + build.slice(1)
    : 'readiness';

  var suffixes = {
    risk: 'This is your most immediate ' + buildLabel + ' opportunity.',
    developing: 'Strengthening this builds your ' + buildLabel + ' foundation.',
    building: 'These are current strengths to repeat, and make more dependable.'
  };

  return suffixes[tone] || '';
}

function renderRankedSignalGroup(items, tone) {
  if (!items || !items.length) return '';

  var scoreRange = getScoreRangeLabel(items);
  var levelLabel = getGroupedLevelLabel(items);

  var copy = items.map(function(q) {
    return q.signal;
  }).join(' ');

  var suffix = getRankedSignalSuffix(tone, items);

  return `
    <div class="ranked-signal-row ${tone}">
      <div class="ranked-signal-copy">
        <div class="ranked-signal-copy-title-div">
          <span class="ranked-chip-list">
            ${renderQChipList(items)}
          </span>
          <strong>(${scoreRange} - ${levelLabel}).</strong>
        </div>
        ${copy}
        ${suffix ? `<span class="ranked-signal-suffix">${suffix}</span>` : ''}
      </div>
    </div>
  `;
}

function renderQChip(q) {
  return `<span class="q-chip ${q.key}">${q.label}</span>`;
}

function renderQChipList(items) {
  return items.map(function(q) {
    return renderQChip(q);
  }).join(' ');
}

function formatLevel(score) {
  var level = getDebriefLevel(score);

  var labels = {
    risk: 'At risk',
    developing: 'Developing',
    building: 'Building',
    strong: 'Strong'
  };

  return labels[level] || level;
}

function getScoreRangeLabel(items) {
  var scores = items.map(function(q) {
    return q.score;
  });

  var min = Math.min.apply(null, scores);
  var max = Math.max.apply(null, scores);

  if (min === max) return min.toFixed(1);

  return min.toFixed(1) + '–' + max.toFixed(1);
}

function getGroupedLevelLabel(items) {
  var levels = items.map(function(q) {
    return q.level;
  });

  var allSame = levels.every(function(level) {
    return level === levels[0];
  });

  if (allSame) return formatLevel(levels[0]);

  return 'Mixed';
}

function formatList(items) {
  if (items.length === 1) return items[0];
  if (items.length === 2) return items[0] + ' and ' + items[1];

  return items.slice(0, -1).join(', ') + ', and ' + items[items.length - 1];
}

async function showResultsPage(renderFn) {
  const render = renderFn || renderResults;
  const assess = document.getElementById('scr-assess');
  const results = document.getElementById('scr-results');
  const loader = document.getElementById('results-loader');
  const content = document.getElementById('results-content');

  assess.style.display = 'none';
  results.style.display = 'block';

  loader.classList.add('active');
  content.classList.add('is-hidden');

  await nextFrame();
  await nextFrame();

  const started = performance.now();

  await render();

  const elapsed = performance.now() - started;
  const minDuration = 800;

  if (elapsed < minDuration) {
    await wait(minDuration - elapsed);
  }

  await nextFrame();

  loader.classList.remove('active');
  content.classList.remove('is-hidden');

  if (window.gsap) {
    revealResults();
  }

  window.scrollTo(0, 0);
}

function revealResults() {
  if (!window.gsap) return;

  gsap.set('.reveal-hero, .reveal-modes, .reveal-debrief', {
    opacity: 0,
    y: 18
  });

  gsap.set('.reveal-quotients .q-card, .reveal-signals .signal-card', {
    opacity: 0,
    y: 18
  });

  gsap.timeline({ defaults: { ease: 'power2.out' } })
    .to('.reveal-hero', {
      opacity: 1,
      y: 0,
      duration: 0.45
    })
    .to('.reveal-modes', {
      opacity: 1,
      y: 0,
      duration: 0.4
    }, '-=0.18')
    .to('.reveal-quotients .q-card', {
      opacity: 1,
      y: 0,
      duration: 0.35,
      stagger: 0.06
    }, '-=0.08')
    .to('.reveal-signals .signal-card', {
      opacity: 1,
      y: 0,
      duration: 0.3,
      stagger: 0.05
    }, '-=0.12')
    .to('.reveal-debrief', {
      opacity: 1,
      y: 0,
      duration: 0.35
    }, '-=0.08');
}

function renderReportMetaLine(profile) {
  function isRealMetaValue(value) {
    if (!value) return false;

    var normalized = String(value).trim().toLowerCase();

    return ![
      'select industry',
      'company size',
      'select company size',
      'select size'
    ].includes(normalized);
  }

  var items = [
    'Completed ' + profile.completedDate,
    profile.industry,
    profile.companySize
  ].filter(function(item, index) {
    return index === 0 || isRealMetaValue(item);
  });

  return `
    <div class="report-meta-line">
      ${items.map(function(item) {
        return `<span>${item}</span>`;
      }).join('')}
    </div>
  `;
}

function formatCompletedDate(date) {
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
}

function getSelectedOptionLabel(selectEl) {
  if (!selectEl || !selectEl.selectedOptions || !selectEl.selectedOptions.length) {
    return null;
  }

  return selectEl.selectedOptions[0].textContent.trim() || null;
}

// ── Results ───────────────────────────────────────────────
async function renderResults() {
  saveAssessmentState();

  let serverResult;
  try {
    serverResult = await submitAssessmentOnce();
  } catch (err) {
      if (err && err.cancelled) {
        showStep(SHUFFLED_TRIADS.length - 1);
        return;
      }
    showResultsError(err);
    throw err;
  }

  if (serverResult.access_token && getQueryParam('t') !== serverResult.access_token) {
    history.replaceState(null, '', '?t=' + encodeURIComponent(serverResult.access_token));
  }

  clearAssessmentState();

  renderServerReport(serverResult);
}

function showResultsError(err) {
  const content = document.getElementById('results-content');

  if (!content) return;

  content.classList.remove('is-hidden');
  content.innerHTML = `
    <div class="results-error">
      <h2>We couldn’t save your assessment.</h2>
      <p>${escapeHtml(err.message || 'Please try again.')}</p>
      <button onclick="showResultsPage()">Try again</button>
    </div>
  `;
}

function getScoresFromOpenReport(open) {
  return {
    R: open.scores.resilience,
    P: open.scores.preparedness,
    O: open.scores.overall,
    dim: open.scores.dimensions
  };
}

function renderServerReport(serverResult) {
  const open = serverResult.report.open;
  const locked = serverResult.report.locked;
  const res = getScoresFromOpenReport(open);
  const quotientData = open.quotients.slice().sort((a, b) => b.score - a.score);

  renderOpenReport(open, res, quotientData);

  const unlockedEl = document.getElementById('focus-section-unlocked');
  const lockedEl   = document.getElementById('focus-section-locked');

  if (locked) {
    renderUnlockedSections(locked, open);
    show(unlockedEl);
    hide(lockedEl);
  } else if (serverResult.locked) {
    renderBookingUnlockCTA(serverResult);
    show(lockedEl);
    hide(unlockedEl);
  } else {
    renderNoLockedSections();
    hide(lockedEl);
    hide(unlockedEl);
  }
}

function show(el) { if (el) el.hidden = false; }
function hide(el) { if (el) el.hidden = true;  }

function renderBookingUnlockCTA(serverResult) {
  const el = document.getElementById('focus-section-locked');
  if (!el) return;
  el.innerHTML = renderDebriefInvitationSection(serverResult);
  bindDebriefInvitationControls(serverResult);
}

function renderUnlockedSections(locked, open) {
  const setHTML = (id, html) => {
    const el = document.getElementById(id);
    if (el) el.innerHTML = html;
  };

  setHTML('focus-actions-wrapper', renderFocusActionsSection(locked));
}

function renderOpenReport(open, res, quotientData) {
  const debriefMode = buildModeInsights(res);
  const modeHtml = renderModeGrid(res);
  const setHTML = (id, html) => {
    const el = document.getElementById(id);
    if (el) el.innerHTML = html;
  };

  document.getElementById('pattern-main').textContent = debriefMode.modeTag;
  document.getElementById('pattern-chip-p-score').textContent =
    debriefMode.preparedness.score.toFixed(2);
  document.getElementById('pattern-chip-r-score').textContent =
    debriefMode.resilience.score.toFixed(2);
  document.getElementById('pattern-chip-p-mode').textContent =
    debriefMode.preparednessLevel;
  document.getElementById('pattern-chip-r-mode').textContent =
    debriefMode.resilienceLevel;

  document.getElementById('mode-grid').innerHTML = modeHtml;
  document.getElementById('mode-grid-wm').innerHTML = modeHtml;

  document.getElementById('ranked-signal-wrapper').innerHTML =
    renderServerRankedSignalList(open.ranked);

/*   document.getElementById('action-sub').innerHTML =
    renderServerFocusSubtitle(open.focus); */

  document.getElementById('meta-line').innerHTML = renderReportMetaLine({
    completedDate: formatCompletedDate(new Date()),
    industry: selectedIndustryLabel || selectedIndustry,
    companySize: selectedSizeLabel || selectedSize
  });
  setHTML('focus-copy', `
    <h2 class="section-title" style="margin-bottom:0px; color: #1A1A1A; font-weight:600;">Your three priorities for action</h2>
  `);
  setHTML('action-sub', renderServerFocusSubtitle(open.focus));

  renderOrbit(res);
  renderVerdictFromServer(open.verdict, res);
  mountCompactQuotientList('q-grid-wrapper', quotientData);
}

function getBookingUrl(serverResult) {
  const base = serverResult.unlock?.bookings_url || FALLBACK_BOOKINGS_URL;
  let url;
  try {
    url = new URL(base);
  } catch (e) {
    console.warn('Invalid bookings_url:', base);
    return null;
  }
  if (serverResult.booking_ref) {
    url.searchParams.set('booking_ref', serverResult.booking_ref);
  }
  return url.toString();
}


const DEBRIEF_PREVIEW_SECTIONS = [
  {
    type: 'do-more',
    iconType: 'up',
    title: 'Do more of this',
    summary: 'Three actions, shaped from your scores.',
    body: 'All three open as soon as you book. The conversation is where they become commitments.',
    status: 'Reveals after booking'
  },
  {
    type: 'do-less',
    iconType: 'down',
    title: 'Do less of this',
    summary: 'Three patterns to interrupt before they cost you again.',
    body: 'All three open as soon as you book. The conversation is where they become commitments.',
    status: 'Reveals after booking'
  },
  {
    type: 'questions',
    iconType: 'question',
    title: 'Sit with these questions',
    summary: 'Three prompts to bring to the conversation.',
    body: 'All three open as soon as you book. The conversation is where they become commitments.',
    status: 'Reveals after booking'
  }
];


function renderDebriefInvitationSection(serverResult) {
  const bookingUrl = getBookingUrl(serverResult);
  return `
      <section class="next-section">
        <header class="next-header">
          <div class="next-kicker">What happens next</div>
        </header>

        <div class="next-body">
          <div class="next-tag">andQfive · Readyneering</div>
          <h2 class="next-title">
            <span>Your three priorities for action</span>
            <span>Open them by booking the conversation.</span>
          </h2>
          ${renderSourceComment(serverResult.report.open)}
          <div class="next-divider"></div>
          <div class="next-offer-grid">
            <article class="next-offer">
              <div class="next-offer__icon next-offer__icon--more">↑</div>
              <h3>Do more of this</h3>
              <p>The actions that move you forward, specific to your pattern.</p>
              <div class="next-offer--meta">
                <p>3 actions · one to start this week</p>
              </div>
            </article>
            <article class="next-offer">
              <div class="next-offer__icon next-offer__icon--less">↓</div>
              <h3>Do less of this</h3>
              <p>The defaults that quietly cost you, named and interrupted.</p>
              <div class="next-offer--meta">
                <p>3 patterns · one to spot tomorrow</p>
              </div>
            </article>
            <article class="next-offer">
              <div class="next-offer__icon next-offer__icon--sit">?</div>
              <h3>Sit with these questions</h3>
              <p>The reflections that go deeper than the report can.</p>
              <div class="next-offer--meta">
                <p>3 prompts · one you have not asked yourself</p>
              </div>
            </article>
          </div>
          <p class="next-lede">
            Book your debrief and all three open immediately — read them before we talk.
          </p>
          <p class"next-lede next-lede--bold" style="margin-bottom: 12px;">
            You have seen the pattern.
            Now turn it into your next move.
          </p>
          <div class="what-next-actions">
            ${bookingUrl ? `
              <a
                class="btn primary"
                id="book-followup-btn"
                href="${escapeHtml(bookingUrl)}"
                target="_blank"
                rel="noopener"
              >
                Book your 30-minute debrief
                <span class="arrow"></span>
              </a>
            ` : ''}

            <button type="button" class="what-next-secondary-btn" id="check-unlock-btn">
              I’ve booked - reveal my actions
            </button>
          </div>
          <div class="next-divider"></div>
          <p class="next-lede">
            ${renderPatternDiagnosis(serverResult.report.open)}
          </p>

          <p class="next-lede">
            The actions above are prepared for a reason. The right next move is specific
            to your pattern. A generic list would be motivational confetti. What you need
            is a conversation.
          </p>
          <p class="next-lede">
            We have had this conversation before. We know which question 
            cuts through. And we can almost guarantee it is not the one 
            you are already asking yourself.
          </p>
          <p class="next-lede next-lede--bold">
            Thirty minutes. Your scores, your patterns, your next move.
          </p>
  `;
}

function renderDebriefPreviewCard(section) {
  return `
    <article class="debrief-card debrief-preview-card--${escapeHtml(section.type)}">

      <div class="debrief-preview-card-header">
        <span class="debrief-card__icon ${getDebriefIconClass(section.iconType)}" aria-hidden="true">
          ${renderDebriefIcon(section.iconType)}
        </span>
      </div>

      <div class="debrief-preview-card-body">
        <strong class="debrief-preview-card__title">${escapeHtml(section.summary)}</strong>
        <p class="debrief-card__desc">${escapeHtml(section.body)}</p>
      </div>
    </article>
  `;
}

/* function renderWhatHappensNextSection(serverResult) {
  const bookingUrl = getBookingUrl(serverResult);

  return `
    <section class="what-happens-next-section">
      <div class="what-next-bar">What happens next</div>

      <div class="what-next-card">
        <div class="what-next-brandline">andQfive · Readyneering</div>

        <h2>
          You have seen the pattern.<br>
          Now turn it into your next move.
        </h2>

        <div class="what-next-rule"></div>

        <p>
          A Readiness score is a starting point.
          <strong>Not a verdict. Not a destination.</strong>
        </p>

        <p>
          Your scores show where your pattern is likely showing up:
          in meetings, in Monday mornings, and in the gap between what you decide
          and what actually happens.
        </p>

        <p>
          The actions above are prepared for a reason. The right next move is specific
          to your pattern. A generic list would be motivational confetti. What you need
          is a conversation.
        </p>

        <p>
          Once your debrief is booked, your personalized actions, stops, and questions
          will appear here immediately, so you can review them before the call.
        </p>

        <p class="what-next-strong">
          Thirty minutes. Your scores, your patterns, your next move.
        </p>

        <p class="what-next-italic">
          If you do only one thing to build your Readiness — book the conversation that reveals what to do next.
        </p>

        <div class="what-next-actions">
          ${bookingUrl ? `
            <a
              class="btn primary"
              id="book-followup-btn"
              href="${escapeHtml(bookingUrl)}"
              target="_blank"
              rel="noopener"
            >
              Book your 30-minute debrief
              <span class="arrow"></span>
            </a>
          ` : ''}

          <button type="button" class="what-next-secondary-btn" id="check-unlock-btn">
            I’ve booked - reveal my actions
          </button>
        </div>

        ${serverResult.booking_ref ? `
          <div class="booking-ref-box booking-ref-box--dark">
            <span>Your booking reference</span>
            <strong>${escapeHtml(serverResult.booking_ref)}</strong>
          </div>
        ` : ''}

        <p class="what-next-footnote">
          Your actions, stops, and questions reveal immediately after booking.
          Bring them into the call so the conversation starts from your real pattern.
        </p>

        <p id="unlock-status" class="form-status what-next-status"></p>
      </div>
    </section>
  `;
} */

function bindDebriefInvitationControls(serverResult) {
  const checkBtn = document.getElementById('check-unlock-btn');

  if (checkBtn) {
    checkBtn.addEventListener('click', function() {
      refreshReportUnlockStatus(serverResult);
    });
  }
}
function getDebriefIconClass(type) {
  if (type === 'up') return 'section-icon-up';
  if (type === 'down') return 'section-icon-down';
  if (type === 'question') return 'section-icon-question';
  return '';
}

function renderDebriefIcon(type) {
  if (type === 'question') {
    return `
      <svg viewBox="0 0 24 24">
        <path d="M12 19H12.01M8.21704 7.69689C8.75753 6.12753 10.2471 5 12 5C14.2091 5 16 6.79086 16 9C16 10.6565 14.9931 12.0778 13.558 12.6852C12.8172 12.9988 12.4468 13.1556 12.3172 13.2767C12.1629 13.4209 12.1336 13.4651 12.061 13.6634C12 13.8299 12 14.0866 12 14.6L12 16" />
      </svg>
    `;
  }

  return `
    <svg viewBox="0 0 24 24">
      <path d="M12 4L12 20M12 20L18 14M12 20L6 14" />
    </svg>
  `;
}
/* const LOCKED_FOCUS_PREVIEWS = {
  doMore: [
    'Your highest-leverage action - unlocked in your debrief',
    'The habit that closes the gap between deciding and doing',
    'The one thing to start before the pressure starts'
  ],
  doLess: [
    'Stop the pattern that is limiting your Readiness most',
    'Stop the behavior that erodes Execution before it starts',
    'The thing you are doing more of that feels like progress but is not'
  ],
  questions: [
    'The question that reveals what you are avoiding',
    'The question that shows where your energy is leaking',
    'The question to bring into your 30-minute debrief'
  ]
};

function renderLockedFocusActionsSection(serverResult) {
  return `
    <div class="focus-actions-section focus-actions-section--locked">
      ${renderLockedFocusActionBlock({
        type: 'do-more',
        iconClass: 'section-icon-up',
        title: 'Do more of this',
        items: LOCKED_FOCUS_PREVIEWS.doMore,
        lockCopy: 'Your specific actions are waiting in your debrief. Book your 30-minute conversation to unlock them.',
        serverResult: serverResult
      })}

      ${renderLockedFocusActionBlock({
        type: 'do-less',
        iconClass: 'section-icon-down',
        title: 'Do less of this',
        items: LOCKED_FOCUS_PREVIEWS.doLess,
        lockCopy: 'Your specific stops are waiting in your debrief. Book your 30-minute conversation to unlock them.',
        serverResult: serverResult
      })}

      ${renderLockedFocusQuestionBlock({
        items: LOCKED_FOCUS_PREVIEWS.questions,
        lockCopy: 'Your specific reflection questions are waiting in your debrief. Book your 30-minute conversation to unlock them.'
      })}
      ${renderLockedBookingControls(serverResult)}
    </div>
  `;
}

function renderLockedFocusActionBlock(config) {
  return `
    <div class="focus-actions-block ${config.type} locked-focus-actions-block">
      <div class="focus-actions-block-header">
        <span class="section-icon ${config.iconClass}" aria-hidden="true">
          <svg viewBox="0 0 24 24">
            <path d="M12 4L12 20M12 20L18 14M12 20L6 14" />
          </svg>
        </span>
        <strong>${escapeHtml(config.title)}</strong>
      </div>

      <div class="locked-focus-list locked-focus-list--noninteractive">
        ${config.items.map(function(item, index) {
          return renderLockedFocusActionCard(item, index);
        }).join('')}

        <div class="locked-focus-overlay">
          <div class="locked-focus-lock" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M7 10.0288C7.47142 10 8.05259 10 8.8 10H15.2C15.9474 10 16.5286 10 17 10.0288M7 10.0288C6.41168 10.0647 5.99429 10.1455 5.63803 10.327C5.07354 10.6146 4.6146 11.0735 4.32698 11.638C4 12.2798 4 13.1198 4 14.8V16.2C4 17.8802 4 18.7202 4.32698 19.362C4.6146 19.9265 5.07354 20.3854 5.63803 20.673C6.27976 21 7.11984 21 8.8 21H15.2C16.8802 21 17.7202 21 18.362 20.673C18.9265 20.3854 19.3854 19.9265 19.673 19.362C20 18.7202 20 17.8802 20 16.2V14.8C20 13.1198 20 12.2798 19.673 11.638C19.3854 11.0735 18.9265 10.6146 18.362 10.327C18.0057 10.1455 17.5883 10.0647 17 10.0288M7 10.0288V8C7 5.23858 9.23858 3 12 3C14.7614 3 17 5.23858 17 8V10.0288" stroke="#000000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
</svg></div>
          <p>${escapeHtml(config.lockCopy)}</p>
        </div>
      </div>
    </div>
  `;
}

function renderLockedFocusActionCard(text, index) {
  return `
    <div class="focus-action-card locked-focus-card ${index > 0 ? 'is-more-locked' : ''}" aria-hidden="true">
      <div class="focus-action-number">${index + 1}</div>

      <div class="focus-action-copy">
        <h4 class="focus-action-heading">${escapeHtml(text)}</h4>

        <p class="locked-blur-line locked-blur-line--wide"></p>
        <p class="locked-blur-line locked-blur-line--medium"></p>
      </div>
    </div>
  `;
}

function renderLockedFocusQuestionBlock(config) {
  return `
    <div class="focus-actions-block questions locked-focus-actions-block">
      <div class="focus-actions-block-header">
        <span class="section-icon section-icon-question" aria-hidden="true">
          <svg viewBox="0 0 24 24">
            <path d="M12 19H12.01M8.21704 7.69689C8.75753 6.12753 10.2471 5 12 5C14.2091 5 16 6.79086 16 9C16 10.6565 14.9931 12.0778 13.558 12.6852C12.8172 12.9988 12.4468 13.1556 12.3172 13.2767C12.1629 13.4209 12.1336 13.4651 12.061 13.6634C12 13.8299 12 14.0866 12 14.6L12 16" />
          </svg>
        </span>
        <strong>Sit with these questions</strong>
      </div>

      <p class="focus-question-intro">
        These are questions to sit with, not problems to solve immediately. There are no right answers - just honest ones.
      </p>

      <div 
        class="locked-focus-list locked-focus-list--noninteractive"
        aria-hidden="true"
        inert
      >
        <div class="focus-question-list locked-question-list">
          ${config.items.map(function(item, index) {
            return renderLockedFocusQuestionItem(item, index);
          }).join('')}
        </div>

        <div class="locked-focus-overlay">
          <div class="locked-focus-lock" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none">
              <path d="M7 10.0288C7.47142 10 8.05259 10 8.8 10H15.2C15.9474 10 16.5286 10 17 10.0288M7 10.0288C6.41168 10.0647 5.99429 10.1455 5.63803 10.327C5.07354 10.6146 4.6146 11.0735 4.32698 11.638C4 12.2798 4 13.1198 4 14.8V16.2C4 17.8802 4 18.7202 4.32698 19.362C4.6146 19.9265 5.07354 20.3854 5.63803 20.673C6.27976 21 7.11984 21 8.8 21H15.2C16.8802 21 17.7202 21 18.362 20.673C18.9265 20.3854 19.3854 19.9265 19.673 19.362C20 18.7202 20 17.8802 20 16.2V14.8C20 13.1198 20 13.1198 19.673 11.638C19.3854 11.0735 18.9265 10.6146 18.362 10.327C18.0057 10.1455 17.5883 10.0647 17 10.0288M7 10.0288V8C7 5.23858 9.23858 3 12 3C14.7614 3 17 5.23858 17 8V10.0288" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </div>
          <p>${escapeHtml(config.lockCopy)}</p>
        </div>
      </div>
    </div>
  `;
}

function renderLockedFocusQuestionItem(text, index) {
  return `
    <p class="focus-question-item locked-focus-question-item ${index > 0 ? 'is-more-locked' : ''}">
      ${escapeHtml(text)}
    </p>
  `;
}

function renderLockedBookingControls(serverResult) {
  const bookingUrl = getBookingUrl(serverResult);

  return `
    <div class="locked-report-card locked-report-card--compact">
      <div class="locked-report-eyebrow">Full report locked</div>

      <h3>Book a follow-up call to unlock your takeaways</h3>

      <p>
        Your full report includes what to do more of, what to do less of,
        and the follow-up questions to bring into the call.
      </p>

      ${serverResult.booking_ref ? `
        <div class="booking-ref-box">
          <span>Your booking reference</span>
          <strong>${escapeHtml(serverResult.booking_ref)}</strong>
          <button type="button" id="copy-booking-ref">Copy</button>
        </div>
      ` : ''}

      ${bookingUrl ? `
        <a class="primary-btn" id="book-followup-btn" href="${escapeHtml(bookingUrl)}" target="_blank" rel="noopener">
          Book follow-up call
        </a>
      ` : ''}

      <button type="button" class="secondary-btn" id="check-unlock-btn">
        I’ve booked — check unlock status
      </button>

      <p id="unlock-status" class="form-status"></p>
    </div>
  `;
}

function bindBookingUnlockControls(serverResult) {
  const copyBtn = document.getElementById('copy-booking-ref');

  if (copyBtn && serverResult.booking_ref) {
    copyBtn.addEventListener('click', function() {
      navigator.clipboard.writeText(serverResult.booking_ref);
    });
  }

  const checkBtn = document.getElementById('check-unlock-btn');

  if (checkBtn) {
    checkBtn.addEventListener('click', function() {
      refreshReportUnlockStatus(serverResult);
    });
  }
}
 */


async function loadResultByToken(token) {
  const response = await fetch(`${SUPABASE_FUNCTIONS_BASE}/report`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ access_token: token })
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'This results link is no longer valid.');
  }
  return {
    result_id: data.result_id,
    access_token: token,
    locked: data.locked,
    unlocked: data.unlocked,
    report: data.report,
    unlock: data.booking || null
  };
}

async function renderResultsFromToken(token) {
  try {
    const serverResult = await loadResultByToken(token);
    const state = loadAssessmentState() || {};
    currentResult = serverResult; 
    renderServerReport(serverResult);
  } catch (err) {
    const content = document.getElementById('results-content');
    if (content) {
      content.innerHTML = `
        <div class="results-error">
          <h2>This results link isn’t available.</h2>
          <p>${escapeHtml(err.message || 'The link may have expired or is incorrect.')}</p>
        </div>`;
    }
  }
}

function showResultsByToken(token) {
  const intro = document.getElementById('scr-intro');
  if (intro) intro.style.display = 'none';
  return showResultsPage(function () { return renderResultsFromToken(token); });
}

async function refreshReportUnlockStatus(serverResult) {
  const status = document.getElementById('unlock-status');
  if (!status) return;
  status.textContent = 'Checking unlock status...';

  const response = await fetch(`${SUPABASE_FUNCTIONS_BASE}/report`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      result_id: serverResult.result_id,
      access_token: serverResult.access_token
    })
  });

  const data = await response.json();

  if (!response.ok) {
    status.textContent = data.error || 'Could not check the report yet.';
    return;
  }

  const updated = { ...serverResult, locked: data.locked, report: data.report };
  currentResult = updated;
  if (data.report.locked) {
    renderServerReport(updated);
  } else {
    status.textContent = 'Not unlocked yet. If you just booked, try again in a moment.';
  }
}

window.addEventListener('focus', function () {
  if (currentResult && currentResult.locked && !currentResult.report?.locked) {
    refreshReportUnlockStatus(currentResult);
  }
});

function renderOrbit(res) {
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

  const qRx = rx;
  const qRy = ry;

  function ellipsePointDeg(cx, cy, rx, ry, deg) {
    const a = deg * Math.PI / 180;
    return {
      x: cx + rx * Math.cos(a),
      y: cy + ry * Math.sin(a)
    };
  }

  const qDegrees = {
    mind: 30,
    alignment: 360,
    execution: 305,
    vitality: 180,
    emotion: 235
  };

  const qPos = {};
  Object.keys(qDegrees).forEach(key => {
    qPos[key] = ellipsePointDeg(orbitCx, orbitCy, qRx, qRy, qDegrees[key]);
  });

  function makeQNodes(qPos) {
    const size = 20;

    return Object.keys(qPos).map(key => {
      const p = qPos[key];
      const href = QUOTIENT_ICONS[key];

      return `
        <image
          href="${href}"
          x="${p.x - size / 2}"
          y="${p.y - size / 2}"
          width="${size}"
          height="${size}"
          preserveAspectRatio="xMidYMid meet"
        />
      `;
    }).join('');
  }

  const rr = document.getElementById('ring-row');
  rr.innerHTML = `
    <svg class="orbit-svg" viewBox="0 0 630 420" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="backArcFade" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#9b7890" stop-opacity="0.95" />
          <stop offset="18%" stop-color="#9b7890" stop-opacity="0.68" />
          <stop offset="50%" stop-color="#9b7890" stop-opacity="0.04" />
          <stop offset="82%" stop-color="#9b7890" stop-opacity="0.68" />
          <stop offset="100%" stop-color="#9b7890" stop-opacity="0.95" />
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
        d="M ${leftX} ${cy} A ${rx} ${ry} 0 0 1 ${rightX} ${cy}"
        fill="none"
        stroke="url(#backArcFade)"
        stroke-opacity="0.28"
        stroke-width="1.5"
      />

      <path
        d="M ${rightX} ${cy} A ${rx} ${ry} 0 0 1 ${leftX} ${cy}"
        fill="none"
        stroke="#7d5c6e"
        stroke-opacity="0.28"
        stroke-width="1.5"
      />

      <path
        d="M ${resiliencePos.x} ${resiliencePos.y}
          Q ${orbitCx - 95} ${orbitCy - 35} ${orbitCx} ${orbitCy}"
        fill="none"
        stroke="url(#linkLeft)"
        stroke-width="2"
        stroke-linecap="round"
      />

      <path
        d="M ${preparednessPos.x} ${preparednessPos.y}
          Q ${orbitCx + 95} ${orbitCy - 35} ${orbitCx} ${orbitCy}"
        fill="none"
        stroke="url(#linkRight)"
        stroke-width="2"
        stroke-linecap="round"
      />

      <foreignObject x="${resilienceX}" y="${resilienceY}" width="${smallSize}" height="${smallSize}">
        <div xmlns="http://www.w3.org/1999/xhtml" class="ring-node">
          ${makeRing(res.R, 0, 5, '#665BD0', '#CFCBC2', smallSize)}
        </div>
      </foreignObject>

      <text x="${resiliencePos.x}" y="${resiliencePos.y + smallSize / 2 + 18}" text-anchor="middle" class="score-label">
        RESILIENCE
      </text>

      <foreignObject x="${preparednessX}" y="${preparednessY}" width="${smallSize}" height="${smallSize}">
        <div xmlns="http://www.w3.org/1999/xhtml" class="ring-node">
          ${makeRing(res.P, 0, 5, '#24A987', '#CFCBC2', smallSize)}
        </div>
      </foreignObject>

      <text x="${preparednessPos.x}" y="${preparednessPos.y + smallSize / 2 + 18}" text-anchor="middle" class="score-label">
        PREPAREDNESS
      </text>

      <foreignObject x="${centerX}" y="${centerY}" width="${centerSize}" height="${centerSize}">
        <div xmlns="http://www.w3.org/1999/xhtml" class="ring-node ring-node-center">
          ${makeRing(res.O, 0, 25, '#ffda33', '#ffda3371', centerSize)}
        </div>
      </foreignObject>

      <text x="${orbitCx}" y="${centerY + centerSize + 18}" text-anchor="middle" class="score-label center-label">
        OVERALL READINESS
      </text>
      <text x="${orbitCx}" y="${centerY + centerSize + 34}" text-anchor="middle" class="score-sub center-sub">
        Resilience × Preparedness
      </text>

      ${makeQNodes(qPos)}
    </svg>
  `;
}


function setScoreMarkerPositions(score, rscore, pscore) {
  const overallPos = v => Math.max(0, Math.min(100, ((v - 1) / 24) * 100));
  const subPos     = v => Math.max(0, Math.min(100, ((v - 1) / 4)  * 100));

  const setVar  = (id, name, value) => { const el = document.getElementById(id); if (el) el.style.setProperty(name, value); };
  const setText = (id, text)        => { const el = document.getElementById(id); if (el) el.textContent = text; };

  setVar('zone-strip', '--score-pos', overallPos(score) + '%');
  setText('zone-marker-score', score.toFixed(2));
  setText('zone-label-score',  score.toFixed(2));

  const rPct = subPos(rscore);
  const pPct = subPos(pscore);
  setVar('zone-scale-rp', '--pos-r', rPct + '%');
  setVar('zone-scale-rp', '--pos-p', pPct + '%');
  setText('marker-r-score', rscore.toFixed(2));
  setText('marker-p-score', pscore.toFixed(2));

  const markerR = document.getElementById('marker-r');
  const markerP = document.getElementById('marker-p');
  if (markerR && markerP) {
    const overlap = Math.abs(rPct - pPct) < 6;
    markerR.classList.toggle('stacked-top',    overlap);
    markerP.classList.toggle('stacked-bottom', overlap);
  }
}

function activateVerdictZone(label) {
  document.querySelectorAll('.zone').forEach(function(zone) {
    zone.classList.remove('active');
  });

  const activeZoneClass = {
    Ready: 'z-ready',
    Building: 'z-build',
    Developing: 'z-dev',
    'At risk': 'z-risk',
    'At Risk': 'z-risk'
  }[label];

  const activeZone = document.querySelector('.zone.' + activeZoneClass);
  if (activeZone) activeZone.classList.add('active');
}

function renderVerdictFromServer(verdict, res) {
  const rvalue = document.getElementById('v-r-val');
  const pvalue = document.getElementById('v-p-val');
  const oval = document.getElementById('v-ov-val');
  const vmodel = document.getElementById('v-ov-mode');
  const zonelabel = document.getElementById('zone-label');

  const score = res.O;
  const pscore = res.P;
  const rscore = res.R;

  zonelabel.innerHTML =
    'Where does <span class="zone-label-score">' +
    score.toFixed(2) +
    '</span> sit on the full scale?';

  setScoreMarkerPositions(score, rscore, pscore);

  rvalue.textContent = rscore.toFixed(2);
  pvalue.textContent = pscore.toFixed(2);
  oval.textContent = score.toFixed(2);

  vmodel.textContent = verdict.label;
  vmodel.className = 'verdict-ov-mode ' + verdict.cls;

  activateVerdictZone(verdict.label);
}

function getStructuralSignal(structure, R, P) {
  if (structure === 'preparedness-heavy') {
    return `<strong>Preparedness</strong> (${P.toFixed(2)}) is ahead of <strong>Resilience</strong> (${R.toFixed(2)}). Plans and intended standards may be stronger than live performance under pressure.`;
  }

  if (structure === 'resilience-heavy') {
    return `<strong>Resilience</strong> (${R.toFixed(2)}) is ahead of <strong>Preparedness</strong> (${P.toFixed(2)}). The system is coping in the moment more than it is designing in advance.`;
  }

  return `<strong>Resilience</strong> (${R.toFixed(2)}) and <strong>Preparedness</strong> (${P.toFixed(2)}) are relatively balanced. The main constraint is less about mode imbalance and more about where specific quotients are lagging.`;
}

function getGapSignal(item) {
  if (item.gap > 0.35) {
    return `it is stronger under pressure than it is structurally prepared for, which may not be sustainable.`;
  }
  if (item.gap < -0.35) {
    return `it is better designed in principle than it is enacted under pressure, suggesting an implementation gap.`;
  }
  return `resilience and preparedness are reasonably aligned here.`;
}

function buildSignals(dim, R, P) {
  const sg = document.getElementById('signal-grid');

  const qScores = QDIMS.map(q => {
    const key = q.toLowerCase();
    const r = dim[`R_${key}`];
    const p = dim[`P_${key}`];
    return {
      q,
      r,
      p,
      avg: (r + p) / 2,
      gap: r - p,
      absGap: Math.abs(r - p)
    };
  });

  const byAvgDesc = qScores.slice().sort((a, b) => b.avg - a.avg);
  const byAvgAsc = qScores.slice().sort((a, b) => a.avg - b.avg);
  const byGapDesc = qScores.slice().sort((a, b) => b.absGap - a.absGap);

  const strongest = byAvgDesc[0];
  const weakest = byAvgAsc[0];
  const biggestGap = byGapDesc[0];

  const delta = P - R;
  const structure =
    delta > 0.25 ? 'preparedness-heavy' :
    delta < -0.25 ? 'resilience-heavy' :
    'balanced';

  const weakerMode = R < P ? 'Resilience' : 'Preparedness';
  const leverageLift = (0.3 * Math.max(R, P)).toFixed(2);

  sg.innerHTML = `
    <div class="signal-card strength ${strongest.q.toLowerCase()}">
      <div class="sc-head">Consistent strength</div>
      <div class="signal-item">
        <div class="signal-dot" style="background:#1D9E75"></div>
        <div class="signal-text">
          <strong><span class="q-chip ${strongest.q.toLowerCase()}">${strongest.q}</span></strong> is currently your most reliable strength across both resilience and preparedness
          <span class="signal-meta">(avg ${strongest.avg.toFixed(1)})</span>.
        </div>
      </div>
    </div>

    <div class="signal-card constraint ${weakest.q.toLowerCase()}">
      <div class="sc-head">Primary constraint</div>
      <div class="signal-item">
        <div class="signal-dot" style="background:#D85A30"></div>
        <div class="signal-text">
          <strong><span class="q-chip ${weakest.q.toLowerCase()}">${weakest.q}</span></strong> is the main constraint in the system right now
          <span class="signal-meta">(avg ${weakest.avg.toFixed(1)})</span>.
          This is the most likely place where performance breaks first.
        </div>
      </div>
    </div>

    <div class="signal-card pattern">
      <div class="sc-head">Structural pattern</div>
      <div class="signal-item">
        <div class="signal-dot" style="background:#534AB7"></div>
        <div class="signal-text">
          ${getStructuralSignal(structure, R, P)}
        </div>
      </div>
      ${biggestGap.absGap > 0.35 ? `
        <div class="signal-item">
          <div class="signal-dot" style="background:#BA7517"></div>
          <div class="signal-text">
            The largest internal imbalance is in <strong>${biggestGap.q}</strong>:
            ${getGapSignal(biggestGap)}.
          </div>
        </div>
      ` : ''}
    </div>

    <div class="signal-card leverage">
      <div class="sc-head">Highest leverage</div>
      <div class="signal-item">
        <div class="signal-dot" style="background:#534AB7"></div>
        <div class="signal-text">
          Small gains in <strong>${weakerMode}</strong> will have outsized impact on overall readiness.
          A +0.3 increase would lift the total by approximately <strong>${leverageLift}</strong>.
        </div>
      </div>
    </div>
  `;
}

const PRIVACY_NOTICE_VERSION = '2026-04-28';

function togglePrivacyDetails() {
  var details = document.getElementById('privacy-details');
  var toggle = document.getElementById('privacy-details-toggle');

  if (!details || !toggle) return;

  var isOpen = details.classList.toggle('is-open');

  details.setAttribute('aria-hidden', String(!isOpen));
  toggle.setAttribute('aria-expanded', String(isOpen));
  toggle.textContent = isOpen
    ? 'Hide privacy details'
    : 'Read more about how your data is used';
}

function hasPrivacyConsent() {
  var consent = document.getElementById('privacy-consent');
  return consent && consent.checked;
}

function getPrivacyConsentRecord() {
  return {
    accepted: hasPrivacyConsent(),
    acceptedAt: new Date().toISOString(),
    noticeVersion: PRIVACY_NOTICE_VERSION
  };
}

// ── Start ─────────────────────────────────────────────────
function startAssessment() {
  currentResult = null;
  var industrySelect = document.getElementById('industry-select');
  var sizeSelect = document.getElementById('size-select');

  if (!industrySelect || !sizeSelect) {
    console.error('Industry or size select not found');
    return;
  }

  selectedIndustry = industrySelect.value || null;
  selectedIndustryLabel = getSelectedOptionLabel(industrySelect) || selectedIndustry;

  selectedSize = sizeSelect.value || null;
  selectedSizeLabel = getSelectedOptionLabel(sizeSelect) || selectedSize;

  if (!hasPrivacyConsent()) {
    document.getElementById('privacy-warn').style.display = 'block';
    return;
  }

  document.getElementById('privacy-warn').style.display = 'none';
  document.getElementById('industry-warn').style.display = 'none';

  document.getElementById('scr-intro').style.display = 'none';
  document.getElementById('scr-assess').style.display = 'block';

  buildSteps();
  updateUI();
  window.scrollTo(0, 0);
}
function restoreAssessment() {
  const saved = loadAssessmentState();
  if (!saved) return;

  selectedIndustry = saved.selectedIndustry || null;
  selectedIndustryLabel = saved.selectedIndustryLabel || null;

  const industrySelect = document.getElementById('industry-select');
  if (industrySelect && selectedIndustry) {
    industrySelect.value = selectedIndustry;
    selectedIndustryLabel =
      selectedIndustryLabel ||
      getSelectedOptionLabel(industrySelect) ||
      selectedIndustry;
  }

  selectedSize = saved.selectedSize || null;
  selectedSizeLabel = saved.selectedSizeLabel || null;

  const sizeSelect = document.getElementById('size-select');
  if (sizeSelect && selectedSize) {
    sizeSelect.value = selectedSize;
    selectedSizeLabel =
      selectedSizeLabel ||
      getSelectedOptionLabel(sizeSelect) ||
      selectedSize;
  }

  document.getElementById('scr-intro').style.display = 'none';
  document.getElementById('scr-assess').style.display = 'block';

  buildSteps(saved);
  updateUI();
}

const resultToken = getQueryParam('t');
if (resultToken) {
  showResultsByToken(resultToken);
} else {
  restoreAssessment();
}

document.getElementById('start-btn').addEventListener('click', startAssessment);

/* document.getElementById('turnstile-cancel').addEventListener('click', cancelTurnstile);
document.addEventListener('keydown', function (e) {
  if (e.key === 'Escape' && turnstilePending) cancelTurnstile();
}); */
/* 
document.getElementById('btn-restart').addEventListener('click', function() {
  currentResult = null;
  placements = [];
  for (var i=0; i<SHUFFLED_TRIADS.length; i++) placements.push(null);
  current = 0;
  history.replaceState(null, '', location.pathname);
  clearAssessmentState();
  document.getElementById('scr-results').style.display = 'none';
  document.getElementById('scr-intro').style.display = 'block';
  window.scrollTo(0, 0);
}); */

document.getElementById('foot-download-pdf').addEventListener('click', function() {
  const originalTitle = document.title;
  document.title = `andQfive Readiness Report — ${new Date().toISOString().slice(0,10)}`;
  window.print();
  // Restore title after print dialog closes
  setTimeout(() => { document.title = originalTitle; }, 100);
});

document.getElementById('foot-copy-url').addEventListener('click', async function() {
  const btn = this;
  const label = document.getElementById('foot-copy-url-label');
  if (!label) return;

  try {
    await navigator.clipboard.writeText(window.location.href);
    const original = label.textContent;
    label.textContent = 'Copied';
    btn.classList.add('is-copied');
    setTimeout(() => {
      label.textContent = original;
      btn.classList.remove('is-copied');
    }, 1800);
  } catch (err) {
    label.textContent = 'Press Ctrl+C to copy';
    setTimeout(() => {
      label.textContent = 'Copy link to my report';
    }, 2000);
  }
});