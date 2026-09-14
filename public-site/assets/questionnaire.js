const TURNSTILE_SITE_KEY = '0x4AAAAAADTHusttqatb2uD0';
const FALLBACK_BOOKINGS_URL = 'https://calendly.com/berry-ext/andqfive-readiness-debrief';

const ICON_BUILD_READINESS = `
  <svg width="36px" height="36px" viewBox="0 0 24 24" fill="rgba(16, 185, 129, 0.15)" xmlns="http://www.w3.org/2000/svg">
  <path d="M13.024 14.5601C10.7142 15.484 9.5593 15.946 8.89964 15.4977C8.74324 15.3914 8.60834 15.2565 8.50206 15.1001C8.0538 14.4405 8.51575 13.2856 9.43967 10.9758C9.63673 10.4831 9.73527 10.2368 9.90474 10.0435C9.94792 9.99429 9.99429 9.94792 10.0435 9.90474C10.2368 9.73527 10.4831 9.63673 10.9758 9.43966C13.2856 8.51575 14.4405 8.0538 15.1001 8.50206C15.2565 8.60834 15.3914 8.74324 15.4977 8.89964C15.946 9.5593 15.484 10.7142 14.5601 13.024C14.363 13.5166 14.2645 13.763 14.095 13.9562C14.0518 14.0055 14.0055 14.0518 13.9562 14.095C13.763 14.2645 13.5166 14.363 13.024 14.5601Z" stroke="currentColor" stroke-width="1.5"/>
  <path d="M7 3.33782C8.47087 2.48697 10.1786 2 12 2C17.5228 2 22 6.47715 22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12C2 10.1786 2.48697 8.47087 3.33782 7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
  </svg>
`;

const ICON_REMOVE_FRICTION = `
  <svg width="36px" height="36px" viewBox="0 0 24 24" fill="rgba(239, 68, 68, 0.15)" xmlns="http://www.w3.org/2000/svg">
  <path d="M12 7V13" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
  <circle cx="12" cy="16" r="1" fill="currentColor"/>
  <path d="M7 3.33782C8.47087 2.48697 10.1786 2 12 2C17.5228 2 22 6.47715 22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12C2 10.1786 2.48697 8.47087 3.33782 7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
  </svg>
`;

const ICON_GO_DEEPER = `
  <svg width="36px" height="36px" viewBox="0 0 24 24" fill="rgba(139, 92, 246, 0.15)" xmlns="http://www.w3.org/2000/svg">
  <path d="M18.5 18.5L22 22" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
  <path d="M6.75 3.27093C8.14732 2.46262 9.76964 2 11.5 2C16.7467 2 21 6.25329 21 11.5C21 16.7467 16.7467 21 11.5 21C6.25329 21 2 16.7467 2 11.5C2 9.76964 2.46262 8.14732 3.27093 6.75" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
  </svg>
`;

let turnstileWidgetId = null;
let turnstilePending = null;
let turnstileReadyPromise = null;
let isSubmittingAssessment = false;
let turnstileShellTimer = null;

let turnstileReady = false;
let pendingToken = null;

function t(key, vars) {
  let str = key.split('.').reduce((o, k) => o?.[k], window.__I18N__) ?? key;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      str = str.replaceAll(`{${k}}`, v);
    }
  }
  return str;
}

globalThis.onTurnstileLoad = function () { turnstileReady = true; };

function showVerifyCard() { setTurnstileChallengeActive(true); }
function hideVerifyCard() { setTurnstileChallengeActive(false); }

function showVerifyLoading() {
  const shell = document.getElementById('turnstile-shell');
  if (!shell) return;

  const titleEl = shell.querySelector('.turnstile-title');
  const copyEl = shell.querySelector('.turnstile-copy');
  const cancelBtn = document.getElementById('turnstile-cancel');

  if (titleEl) titleEl.textContent = t('questionnaire.results.turnstile-title');
  if (copyEl) copyEl.textContent = t('questionnaire.results.turnstile-copy');
  if (cancelBtn) {
    cancelBtn.textContent = t('questionnaire.results.turnstile-cancel');
    cancelBtn.onclick = hideVerifyCard;
  }

  shell.classList.add('challenge-active', 'is-loading');
  shell.setAttribute('aria-hidden', 'false');

  clearTimeout(turnstileShellTimer);
  turnstileShellTimer = setTimeout(() => {
    if (!shell.classList.contains('is-loading')) return;
    if (copyEl) copyEl.textContent = t('questionnaire.results.turnstile-loading-failed');
    if (cancelBtn) { cancelBtn.textContent = t('questionnaire.results.turnstile-retry'); cancelBtn.onclick = beginVerifyAndSubmit; }
  }, 8000);
}

function beginVerifyAndSubmit() {
  showVerifyLoading();
  if (turnstileWidgetId === null) {
    renderTurnstileWidgetOnce();
  } else {
    try { globalThis.turnstile.reset(turnstileWidgetId); } catch (e) {}
  }
}

function submitWithToken(token) {
  if (currentResult?.result_id) {
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
      unlocked: Boolean(saved.report?.locked),
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
    if (turnstileWidgetId !== null && globalThis.turnstile?.remove) {
      globalThis.turnstile.remove(turnstileWidgetId);
    }
  } catch (err) {
    console.warn('Failed to remove Turnstile widget during teardown:', err);
  } finally {
    turnstileWidgetId = null;
    turnstilePending = null;
    pendingToken = null;

    const shell = document.getElementById('turnstile-shell');
    if (shell) shell.classList.remove('challenge-active');
    clearTimeout(turnstileShellTimer);
  }
}

function showVerifyRetry(message) {
  const copy = document.querySelector('#turnstile-shell .turnstile-copy');
  if (copy) copy.textContent = message;
  const btn = document.getElementById('turnstile-cancel');
  if (btn) { btn.textContent = t('questionnaire.results.turnstile-retry'); btn.onclick = beginVerifyAndSubmit; }
  showVerifyCard();
}

 function setResultsLoaderText(title, copy) {
  const titleEl = document.querySelector('.results-loader-title');
  const copyEl = document.querySelector('.results-loader-copy');

  if (titleEl) titleEl.textContent = title;
  if (copyEl) copyEl.textContent = copy;
}

function setTurnstileChallengeActive(isActive) {
  const shell = document.getElementById('turnstile-shell');
  if (!shell) return;

  shell.classList.toggle('challenge-active', isActive);
  shell.setAttribute('aria-hidden', isActive ? 'false' : 'true');
}

function renderTurnstileWidgetOnce() {
  if (turnstileWidgetId !== null) return;
  turnstileWidgetId = globalThis.turnstile.render('#turnstile-widget', {
    sitekey: TURNSTILE_SITE_KEY,
    appearance: 'interaction-only',
    'before-interactive-callback': function () {
      clearTimeout(turnstileShellTimer);
      const shell = document.getElementById('turnstile-shell');
      if (shell) shell.classList.remove('is-loading');
      const copy = document.querySelector('#turnstile-shell .turnstile-copy');
      if (copy) copy.textContent = t('questionnaire.results.turnstile-challenge-prompt');
      showVerifyCard();
    },
    'after-interactive-callback': function () { hideVerifyCard(); },
      callback: function (token) {
        clearTimeout(turnstileShellTimer);
        hideVerifyCard();
        submitWithToken(token);
    },
    callback: function (token) { hideVerifyCard(); submitWithToken(token); },
    'error-callback':   function () { showVerifyRetry(t('questionnaire.results.turnstile-loading-failed')); },
    'timeout-callback': function () { showVerifyRetry(t('questionnaire.results.turnstile-loading-timed-out')); },
    'expired-callback': function () { try { globalThis.turnstile.reset(turnstileWidgetId); } catch (e) {} }
  });
}


function escapeHtml(unsafe) {
  return String(unsafe ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
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
  setResultsLoaderText(t('questionnaire.results.loader-title-pre'), t('questionnaire.results.loader-body-pre'));
  /* const idempotencyKey = getSubmitAttemptId(); */
  const response = await fetch(`${SUPABASE_FUNCTIONS_BASE}/submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json'},
    body: JSON.stringify({ ...payload, turnstileToken: token })
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || t('questionnaire.results.loader-error'));
  }

  localStorage.removeItem('submit_attempt_id');

  setResultsLoaderText(
    t('questionnaire.results.loader-title'), t('questionnaire.results.loader-copy')
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
/* 
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
}; */


const QUOTIENT_ICONS = {
  vitality: 'assets/images/q-vitality.svg',
  emotion: 'assets/images/q-emotion.svg',
  mind: 'assets/images/q-mind.svg',
  execution: 'assets/images/q-execution.svg',
  alignment: 'assets/images/q-alignment.svg'
};

const TRIADS = []

async function loadVariant() {
  const variantKey = getQueryParam('v') || 'public';
  const r = await fetch(`${SUPABASE_FUNCTIONS_BASE}/variant?variant=${encodeURIComponent(variantKey)}`);
  if (!r.ok) throw new Error('Failed to load variant');
  return r.json();
}

// ── Geometry ──────────────────────────────────────────────
const SCALE = 1.5;
function s(n) { return n * SCALE; }

const TA = {x: 250 * SCALE, y: 130 * SCALE};
const TB = {x: 48  * SCALE, y: 360 * SCALE};
const TC = {x: 452 * SCALE, y: 360 * SCALE};

let SHUFFLED_TRIADS = [];

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
  const other = document.getElementById('industry-other');
  other.style.display = this.value === 'other' ? 'block' : 'none';
});


function bary(px, py) {
  const d = (TB.y-TC.y)*(TA.x-TC.x) + (TC.x-TB.x)*(TA.y-TC.y);
  const a = ((TB.y-TC.y)*(px-TC.x) + (TC.x-TB.x)*(py-TC.y)) / d;
  const b = ((TC.y-TA.y)*(px-TC.x) + (TA.x-TC.x)*(py-TC.y)) / d;
  return [a, b, 1-a-b];
}

function inTri(px, py) {
  const b = bary(px, py);
  return b[0] >= -0.02 && b[1] >= -0.02 && b[2] >= -0.02;
}

function svgPt(svg, e) {
  const pt = svg.createSVGPoint();
  const src = e.touches ? e.touches[0] : e;
  pt.x = src.clientX;
  pt.y = src.clientY;
  return pt.matrixTransform(svg.getScreenCTM().inverse());
}


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
let  current = 0;
let  placements = [];
let  selectedIndustry = null;
let  selectedIndustryLabel = null;
let  selectedSize = null;
let  selectedSizeLabel = null;

// ── SVG builder ───────────────────────────────────────────

const VW = s(500), VH = s(520), LH = s(18), FS = s(14);
const GX = (TA.x + TB.x + TC.x) / 3;
const GY = (TA.y + TB.y + TC.y) / 3;

const ctx = document.createElement('canvas').getContext('2d');
ctx.font = FS + 'px -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif';
function esc(s) {
  return s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
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
  return new URLSearchParams(globalThis.location.search).get(name);
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
  const t = SHUFFLED_TRIADS[idx];

  // ── Layout constants ──────────────────────────────────────
  const MAX_LINES = 5;
  const MAX_LINES_TOP=4;
  const SLOT_HEIGHT = MAX_LINES * LH;
  const SLOT_HEIGHT_TOP = MAX_LINES_TOP * LH;
  const SLOT_WIDTH_SIDE = s(200);
  const SLOT_WIDTH_TOP = s(260);
  const CORNER_GAP = s(14);
  const labelStyle = 'font-size:' + FS + 'px;color:#2a2a28;font-weight:500;'
    + 'font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',sans-serif;'
    + 'line-height:' + LH + 'px;text-wrap:balance;text-align:center;'
    + 'pointer-events:none;';

  const aSlotX = TA.x - SLOT_WIDTH_TOP / 2;
  const aSlotY = TA.y - CORNER_GAP - SLOT_HEIGHT;

  const sideSlotY = TB.y + CORNER_GAP;
  const bSlotX = TB.x - SLOT_WIDTH_SIDE / 2;
  const cSlotX = TC.x - SLOT_WIDTH_SIDE / 2;

  const gx = GX.toFixed(1), gy = GY.toFixed(1);
  const mABx = ((TA.x + TB.x) / 2).toFixed(1), mABy = ((TA.y + TB.y) / 2).toFixed(1);
  const mBCx = ((TB.x + TC.x) / 2).toFixed(1), mBCy = ((TB.y + TC.y) / 2).toFixed(1);
  const mCAx = ((TC.x + TA.x) / 2).toFixed(1), mCAy = ((TC.y + TA.y) / 2).toFixed(1);

  const vw = globalThis.innerWidth;
  const sidePad = vw <= 1023 ? s(28) : s(90);

  const sideOverhang = SLOT_WIDTH_SIDE / 2 + s(8);

  const B = getBounds({
    top: SLOT_HEIGHT + CORNER_GAP + s(12),
    right: Math.max(sidePad, sideOverhang),
    bottom: SLOT_HEIGHT + CORNER_GAP + s(12),
    left: Math.max(sidePad, sideOverhang)
  });

  function labelBox(x, y, w, h, text, anchor) {
    const align = anchor === 'bottom' ? 'flex-end' : 'flex-start';
    const boxStyle = 'display:flex;align-items:' + align + ';justify-content:center;'
      + 'height:' + h + 'px;width:100%;';
    return '<foreignObject x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '">'
      + '<div xmlns="http://www.w3.org/1999/xhtml" style="' + boxStyle + '">'
      + '<div style="' + labelStyle + '">' + esc(text) + '</div>'
      + '</div>'
      + '</foreignObject>';
  }

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

    + labelBox(aSlotX, aSlotY, SLOT_WIDTH_TOP, SLOT_HEIGHT_TOP, t.A, 'bottom')
    + labelBox(bSlotX, sideSlotY, SLOT_WIDTH_SIDE, SLOT_HEIGHT, t.B, 'top')
    + labelBox(cSlotX, sideSlotY, SLOT_WIDTH_SIDE, SLOT_HEIGHT, t.C, 'top')

    + '<circle id="ring-' + idx + '" cx="-999" cy="-999" r="' + s(20) + '" fill="rgba(119,1,54,0.8)" opacity="0" style="pointer-events:none"/>'
    + '<circle id="dot-' + idx + '"  cx="-999" cy="-999" r="' + s(11) + '" fill="#770136" opacity="0" style="pointer-events:none"/>'
    + '<circle id="pip-' + idx + '"  cx="-999" cy="-999" r="' + s(5) + '"  fill="#fff" opacity="0" style="pointer-events:none"/>'

    + '<rect x="' + B.x + '" y="' + B.y + '" width="' + B.w + '" height="' + B.h + '" fill="transparent"/>'
    + '</svg>';
}

// ── Build all steps ───────────────────────────────────────
async function buildSteps(savedState) {
  const wrap = document.getElementById('steps-wrap');
  let html = '';
  const TRIADS = (await loadVariant()).instrument.definition.triads;
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

  for (let i = 0; i < SHUFFLED_TRIADS.length; i++) {
    const t = SHUFFLED_TRIADS[i];
    const display = i === current ? 'block' : 'none';

    html += '<div id="step-'+i+'" style="display:'+display+'">'
      +'<div class="scenario-wrapper">'
      +'<div class="card">'
      +'<div class="scenario-text">'+esc(t.scenario)+'</div>'
      +'</div>'
      +'<div class="question">'+esc(t.question)
      +'<div class="hint">Click or tap anywhere inside the triangle. You can reposition your dot before moving on.</div>'
      +'</div>'
      +'</div>'
      +'<div class="tri-wrap">'+makeSVG(i)+'</div>'
      +'<div class="placed" id="placed-'+i+'"></div>'
      +'</div>'
      +'</div>';
  }

  wrap.innerHTML = html;

  for (let j = 0; j < SHUFFLED_TRIADS.length; j++) {
    attachEvents(j);
  }

  rehydratePlacements();
}

function rehydratePlacements() {
  for (let idx = 0; idx < placements.length; idx++) {
    const pt = placements[idx];
    if (!pt) continue;

    const ring = document.getElementById('ring-' + idx);
    const dot  = document.getElementById('dot-' + idx);
    const pip  = document.getElementById('pip-' + idx);

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

    const b = bary(pt.x, pt.y);
    const tot = Math.max(b[0] + b[1] + b[2], 0.001);

  }
}

function attachEvents(idx) {
  const svg = document.getElementById('svg-'+idx);
  if (!svg) return;

  function place(e) {
    const pt = svgPt(svg, e);
    if (!inTri(pt.x, pt.y)) return;
    e.preventDefault();

    placements[idx] = {x: pt.x, y: pt.y};
    const ring = document.getElementById('ring-'+idx);
    const dot  = document.getElementById('dot-'+idx);
    const pip  = document.getElementById('pip-'+idx);

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

    const b = bary(pt.x, pt.y);
    const tot = Math.max(b[0]+b[1]+b[2], 0.001);
    document.getElementById('warn').style.display = 'none';
    saveAssessmentState();
  }

  svg.addEventListener('click', place);
  svg.addEventListener('touchstart', place, {passive:false});
  //svg.addEventListener('touchmove', place, {passive:false});
}

// ── Navigation ────────────────────────────────────────────
function updateUI() {
  const pct = (current / SHUFFLED_TRIADS.length * 100);

  const isLast = current === SHUFFLED_TRIADS.length - 1;
  const isHalfway = (current + 1) === Math.ceil(SHUFFLED_TRIADS.length / 2);
  let label = t('questionnaire.assessment.next-button-next');
  
  if (isLast) {
    label = t('questionnaire.assessment.next-button-submit');
  } else if (isHalfway) {
    label = t('questionnaire.assessment.next-button-halfway');
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
  const currentEl = document.getElementById('step-' + current);
  const nextEl = document.getElementById('step-' + idx);

  const outY = direction === 'back' ? 8 : -8;
  const inY  = direction === 'back' ? -8 : 8;

  gsap.to(currentEl, {
    opacity: 0,
    y: outY,
    duration: 0.18,
    ease: "power1.out",
    onComplete: function () {
      for (let i = 0; i < SHUFFLED_TRIADS.length; i++) {
        const el = document.getElementById('step-' + i);
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
    document.getElementById('btn-next').innerHTML = t('questionnaire.assessment.next-button-submitting') + ' <span class="arrow"></span>';
    document.getElementById('btn-next').style.pointerEvents = 'none';
    document.getElementById('btn-back').disabled = true;

    beginVerifyAndSubmit();

    return;
  }

  const next = current + 1;
  showStep(next, 'forward');
  current = next;
  saveAssessmentState();
  setTimeout(updateUI, 100);
  globalThis.scrollTo(0, 0);
});

document.getElementById('btn-back').addEventListener('click', function() {
  if (current > 0) {
    const prev = current - 1;
    showStep(prev, 'back');
    current = prev;
    saveAssessmentState();
    setTimeout(updateUI, 100);
    globalThis.scrollTo(0, 0);
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
      modeTag: t('questionnaire.results.mode-tag-both-strong'),
      resilienceLevel: rLevel,
      preparednessLevel: pLevel
    };
  }

  if (rLow && pLow) {
    return {
      modeStructure: 'both-low',
      modeTag: t('questionnaire.results.mode-tag-both-low'),
      resilienceLevel: rLevel,
      preparednessLevel: pLevel
    };
  }

  if (rLow && pHigh) {
    return {
      modeStructure: 'preparedness-high-resilience-low',
      modeTag: t('questionnaire.results.mode-tag-preparedness-high-resilience-low'),
      resilienceLevel: rLevel,
      preparednessLevel: pLevel
    };
  }

  if (rHigh && pLow) {
    return {
      modeStructure: 'resilience-high-preparedness-low',
      modeTag: t('questionnaire.results.mode-tag-resilience-high-preparedness-low'),
      resilienceLevel: rLevel,
      preparednessLevel: pLevel
    };
  }

  if (rHigh && pHigh) {
    return {
      modeStructure: 'both-building-or-higher',
      modeTag: t('questionnaire.results.mode-tag-both-building-or-higher'),
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

  const rParts = [];
  const pParts = [];

  for (let i = 0; i < QDIMS.length; i++) {
    const q = QDIMS[i];
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

  const rAsc = rParts.slice().sort(function(a, b) { return a.value - b.value; });
  const rDesc = rParts.slice().sort(function(a, b) { return b.value - a.value; });
  const pAsc = pParts.slice().sort(function(a, b) { return a.value - b.value; });
  const pDesc = pParts.slice().sort(function(a, b) { return b.value - a.value; });

  const delta = results.P - results.R;

  let structure = 'balanced';
  if (delta > 0.25) structure = 'preparedness-heavy';
  else if (delta < -0.25) structure = 'resilience-heavy';  const mode = getModeStructure(results.R, results.P);

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

/* function getModeSupportLine(mode) {
  function styledLabel(q) {
    return `<span class="q-chip ${q.key}">${q.label}</span>`;
  }

  return `Supported most by ${styledLabel(mode.strongest)}, constrained most by ${styledLabel(mode.weakest)}.`;
} */

/* function getModeSpreadLine(mode) {
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
} */

/* function buildModeCards(results) {
  const insights = buildModeInsights(results);

  return ['resilience', 'preparedness'].map(function(modeKey) {
    const mode = insights[modeKey];
    const meta = MODE_META[modeKey];
    const level = mode.level;

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
} */

const MODE_QS = {
  resilience: ['vitality', 'emotion'],
  preparedness: ['execution', 'mind', 'alignment']
};

function renderQChipsForMode(key) {
  const qs = MODE_QS[key] || [];

  return qs.map(function(q) {
    return `<span class="q-chip ${q}">${q}</span>`;
  }).join('');
}
/* 
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
} */
/* 
function renderModeGrid(results) {
  const modes = buildModeCards(results);

  return `
    <div class="mode-grid">
      ${modes.map(renderModeCard).join('')}
    </div>
  `;
} */

// ── Scoring ───────────────────────────────────────────────
const DIMS = ['R_vitality','R_emotion','R_mind','R_execution','R_alignment',
            'P_vitality','P_emotion','P_mind','P_execution','P_alignment'];
const QDIMS = ['vitality','emotion','mind','execution','alignment'];


function renderFocusChipList(items) {
  if (!items || !items.length) return '';

  const chips = items.map(function(item) {
    return `
      <span class="q-chip ${item.key}">
        ${item.label} <span class="chip-build ${item.build}">(${capitalizeFirst(item.build)})</span>
      </span>
    `;
  });

  if (chips.length === 1) {
    return chips[0];
  }

  const and = t('questionnaire.results.focus.callout.chip_conjunction');

  if (chips.length === 2) {
    return chips[0] + ` <span class="subtitle-and">${and}</span> ` + chips[1];
  }

  return chips.slice(0, -1).join(', ') +
    `, <span class="subtitle-and">${and}</span> ` +
    chips[chips.length - 1];
}

function renderServerFocusSubtitle(focusActions) {
  const items = focusActions.subtitleItems || [];

  if (!items.length) return '';

  const chipHtml = renderFocusChipList(items);

  const intro = items.length === 1
    ? t('questionnaire.results.focus-subtitle-single') + ' '
    : t('questionnaire.results.focus-subtitle-multiple') + ' ';

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
  if (score < 2.5) return t('questionnaire.results.zone-legend.zone-risk');
  if (score < 3.5) return t('questionnaire.results.zone-legend.zone-dev');
  if (score < 4.3) return t('questionnaire.results.zone-legend.zone-build');
  return t('questionnaire.results.zone-legend.zone-ready');
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
    combinationLine = t('pattern.combination.same_dim', {
      band: escapeHtml(t(`levels.${dimBand}`)),
      dim: escapeHtml(t(`dimensions.${dimA}`)),
    });
  } else {
    const dimAScore = dimensionAverage(open.scores, dimA);
    const dimBScore = dimensionAverage(open.scores, dimB);
    const bandA = bandLabelFromScore(dimAScore);
    const bandB = bandLabelFromScore(dimBScore);
    const sameBand = bandA === bandB;

    if (sameBand) {
      combinationLine = t('pattern.combination.same_band', {
        band: escapeHtml(t(`levels.${bandA}`)),
        a: escapeHtml(t(`quotients.${a.key}.name`)),
        b: escapeHtml(t(`quotients.${b.key}.name`)),
      });
    } else {
      const weakerDim   = dimAScore <= dimBScore ? dimA : dimB;
      const strongerDim = dimAScore <= dimBScore ? dimB : dimA;
      const weakerBand   = bandLabelFromScore(Math.min(dimAScore, dimBScore));
      const strongerBand = bandLabelFromScore(Math.max(dimAScore, dimBScore));
      combinationLine = t('pattern.combination.mismatched', {
        weakerBand: escapeHtml(t(`levels.${weakerBand}`)),
        weakerDim: escapeHtml(t(`dimensions.${weakerDim}`)),
        strongerBand: escapeHtml(t(`levels.${strongerBand}`)),
        strongerDim: escapeHtml(t(`dimensions.${strongerDim}`)),
      });
    }
  }

  const symptomLine = getSymptomLine(a.key, b.key);

  const aLabelHtml = `<span class="next-q-name next-q-name--${escapeHtml(a.key)}">${escapeHtml(t(`quotients.${a.key}.name`))}</span>`;
  const bLabelHtml = `<span class="next-q-name next-q-name--${escapeHtml(b.key)}">${escapeHtml(t(`quotients.${b.key}.name`))}</span>`;
  const aScoreHtml = `<strong>${a.score.toFixed(1)}</strong>`;
  const bScoreHtml = `<strong>${b.score.toFixed(1)}</strong>`;

  return `
    <p class="next-lede">
      ${t('pattern.lede_intro')} <span class="next-lede__bold">${t('pattern.lede_bold')}</span>
    </p>
    <p class="next-lede">
      ${t('pattern.main_paragraph', {
        aLabel: aLabelHtml,
        aScore: aScoreHtml,
        bLabel: bLabelHtml,
        bScore: bScoreHtml,
        combination: combinationLine,
        symptom: symptomLine,
      })}
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
      Built around your ${escapeHtml(a.label)} and ${escapeHtml(b.label)} scores — where the conversation will be most useful.
    </p>
    <p class="next-lede">
      Three things we'll work through together.
    </p>
  `;
}
function getSymptomLine(keyA, keyB) {
  const pair = [keyA, keyB].sort().join('|');
  const lines = {
    'execution|mind':
      t('pattern.symptom.execution_mind'),

    'emotion|vitality':
      t('pattern.symptom.emotion_vitality'),

    'alignment|mind':
      t('pattern.symptom.alignment_mind'),

    'execution|alignment':
      t('pattern.symptom.execution_alignment'),

    'emotion|mind':
      t('pattern.symptom.emotion_mind'),

    'emotion|execution':
      t('pattern.symptom.emotion_execution'),

    'mind|vitality':
      t('pattern.symptom.mind_vitality'),

    'alignment|emotion':
      t('pattern.symptom.alignment_emotion'),

    'alignment|vitality':
      t('pattern.symptom.alignment_vitality'),

    'execution|vitality':
      t('pattern.symptom.execution_vitality'),
  };
  return lines[pair] ||
    'In meetings. In transitions. In the quiet moments where the pattern repeats itself.';
}

function renderFocusCallout(focusActions) {
  const items = focusActions.subtitleItems || [];
  const quotientChips = renderFocusChipList(items);

  const finalSentence = quotientChips
    ? t('questionnaire.results.focus.callout.final_with_chips', { chips: quotientChips })
    : t('questionnaire.results.focus.callout.final_fallback');

  return `
    <div class="focus-actions-callout">
      <p>
        ${t('questionnaire.results.focus.callout.intro')}
        <br>
        ${t('questionnaire.results.focus.callout.reminder')}
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

  const firstActions = buildActionsForQuotient(quotients[0], actionKey);
  const secondActions = buildActionsForQuotient(quotients[1], actionKey);

  const actions = [
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

function getVariantKey() {
  const params = new URLSearchParams(globalThis.location.search);

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
      session_id: crypto.randomUUID(),
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

const MODE_QS_COMPACT = {
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
  const labels = {
    risk: t('questionnaire.results.zone-legend.zone-risk'),
    developing: t('questionnaire.results.zone-legend.zone-dev'),
    building: t('questionnaire.results.zone-legend.zone-build'),
    ready: t('questionnaire.results.zone-legend.zone-ready')
  };

  return labels[level] || 'Developing';
}

function getQuotientBarPercent(score) {
  const pos = ((score - 1) / (5 - 1)) * 100;
  return Math.max(0, Math.min(100, pos));
}

function getQuotientRowColor(q) {
  const level = getQuotientLevel(q.score);

  const levelColors = {
    risk: '#f87171',
    developing: '#fbbf24',
    building: '#34d399',
    ready: '#60a5fa'
  };

  return levelColors[level] || '#60a5fa';
}

function renderCompactQuotientRow(q) {
  const level = getQuotientLevel(q.score);
  const levelLabel = getQuotientLevelLabel(level);
  const barPercent = getQuotientBarPercent(q.score);
  const color = getQuotientRowColor(q);

  return `
    <div class="quotient-row">
      <div class="q-meta">
        <div class="q-chip ${escapeHtml(q.key)}">${escapeHtml(q.label)}</div>
        <div class="q-desc">${escapeHtml(q.roleS)}</div>
      </div>
      <div class="q-scale" style="--pos:${barPercent}%;">
        <div class="q-bar"></div>
        <div class="q-tick"></div>
      </div>
      <div class="q-score">
        <span class="q-value">${escapeHtml(q.score.toFixed(1))}</span>
        <span class="q-band band-${level}">${levelLabel}</span>
      </div>
    </div>
  `;
}
function renderCompactQuotientSection(title, keys, quotients) {
  const rows = keys
    .map(function(key) {
      return quotients.find(function(q) {
        return q.key === key;
      });
    })
    .filter(Boolean);

  const subtitle = rows.map(function(q) {
    return escapeHtml(q.label);
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
  const wrapper = document.getElementById(wrapperId);

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
    return t('questionnaire.results.focus.callout.outcome-prefix-do-less');
  }

  if (actionType === 'sitWith') {
    return t('questionnaire.results.focus.callout.outcome-prefix-sit-with');
  }

  return t('questionnaire.results.focus.callout.outcome-prefix-do-more');
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
      <div class="focus-action-card ${escapeHtml(item.key)}">
        <div class="focus-action-number">${index + 1}</div>
        <div class="focus-action-copy">
          <h4 class="focus-action-heading">${escapeHtml(parts.heading)}</h4>
          ${parts.body ? `<p class="focus-action-body">${escapeHtml(parts.body)}</p>` : ''}
          <div class="focus-action-outcome">
            <span class="outcome-prefix">${outcomePrefix}</span>
            <span class="q-chip ${escapeHtml(item.key)}">${escapeHtml(item.label)} ${upArrow}</span>
            <span class="${escapeHtml(item.build)}">${escapeHtml(item.build)} ${upArrow}</span>
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
          <strong>${t('questionnaire.results.focus.do-more-heading')}</strong>
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
          <strong>${t('questionnaire.results.focus.do-less-heading')}</strong>
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
          <strong>${t('questionnaire.results.focus.sit-with-heading')}</strong>
        </div>
        <p class="focus-question-intro">
          ${t('questionnaire.results.focus.sit-with-subheading')}
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
          <p class="focus-question-item">${escapeHtml(item.text)}</p>
        `;
      }).join('')}
    </div>
  `;
}

function renderRankedSignalRow(q, tone) {
  if (!q) return '';

  const suffix = getRankedSignalSuffix(tone, [q]);

  return `
    <div class="ranked-signal-row ${tone}">
      <div class="ranked-signal-copy">
        <div class="ranked-signal-copy-title-div">
          <span class="q-chip ${escapeHtml(q.key)}">${escapeHtml(q.label)}</span>
          <strong>(${q.score.toFixed(1)} - ${formatLevel(q.score)}).</strong>
        </div>
        ${escapeHtml(q.signal)}
        ${suffix ? `<span class="ranked-signal-suffix">${suffix}</span>` : ''}
      </div>
    </div>
  `;
}

function getRankedSignalSuffix(tone, items) {
  const build = items && items[0] ? items[0].build : null;

  const buildLabel = build
    ? build.charAt(0).toUpperCase() + build.slice(1)
    : 'readiness';

  const suffixes = {
    risk: t('questionnaire.results.ranked-signal-suffix.risk', { build: buildLabel }),
    developing: t('questionnaire.results.ranked-signal-suffix.developing', { build: buildLabel }),
    building: t('questionnaire.results.ranked-signal-suffix.building')
  };

  return suffixes[tone] || '';
}

function renderRankedSignalGroup(items, tone) {
  if (!items || !items.length) return '';

  const scoreRange = getScoreRangeLabel(items);
  const levelLabel = getGroupedLevelLabel(items);

  const copy = items.map(function(q) {
    return q.signal;
  }).join(' ');

  const suffix = getRankedSignalSuffix(tone, items);

  return `
    <div class="ranked-signal-row ${tone}">
      <div class="ranked-signal-copy">
        <div class="ranked-signal-copy-title-div">
          <span class="ranked-chip-list">
            ${renderQChipList(items)}
          </span>
          <strong>(${escapeHtml(scoreRange)}- ${escapeHtml(levelLabel)}).</strong>
        </div>
        ${escapeHtml(copy)}
        ${suffix ? `<span class="ranked-signal-suffix">${suffix}</span>` : ''}
      </div>
    </div>
  `;
}

function renderQChip(q) {
  return `<span class="q-chip ${escapeHtml(q.key)}">${escapeHtml(q.label)}</span>`;
}

function renderQChipList(items) {
  return items.map(function(q) {
    return renderQChip(q);
  }).join(' ');
}

function formatLevel(score) {
  const level = getDebriefLevel(score);

  const labels = {
    risk: t('questionnaire.results.zone-legend.zone-risk'),
    developing: t('questionnaire.results.zone-legend.zone-dev'),
    building: t('questionnaire.results.zone-legend.zone-build'),
    strong: t('questionnaire.results.zone-legend.zone-ready')
  };

  return labels[level] || level;
}

function getScoreRangeLabel(items) {
  const scores = items.map(function(q) {
    return q.score;
  });

  const min = Math.min.apply(null, scores);
  const max = Math.max.apply(null, scores);

  if (min === max) return min.toFixed(1);

  return min.toFixed(1) + '–' + max.toFixed(1);
}

function getGroupedLevelLabel(items) {
  const levels = items.map(function(q) {
    return q.level;
  });

  const allSame = levels.every(function(level) {
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

  if (globalThis.gsap) {
    revealResults();
  }

  globalThis.scrollTo(0, 0);
}

function revealResults() {
  if (!globalThis.gsap) return;

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

    const normalized = String(value).trim().toLowerCase();

    return ![
      'select industry',
      'company size',
      'select company size',
      'select size'
    ].includes(normalized);
  }

  const items = [
    'Completed ' + profile.completedDate,
    profile.industry,
    profile.companySize
  ].filter(function(item, index) {
    return index === 0 || isRealMetaValue(item);
  });

  return `
    <div class="report-meta-line">
      ${items.map(function(item) {
        return `<span>${escapeHtml(item)}</span>`;
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
  const unlockedBreak = document.getElementById('focus-section-unlocked-break');
  const lockedEl   = document.getElementById('focus-section-locked');

  if (locked) {
    renderUnlockedSections(locked, open);
    show(unlockedEl);
    show(unlockedBreak);
    hide(lockedEl);
  } else if (serverResult.locked) {
    renderBookingUnlockCTA(serverResult);
    show(lockedEl);
    hide(unlockedEl);
    hide(unlockedBreak);
  } else {
    renderNoLockedSections();
    hide(lockedEl);
    hide(unlockedEl);
    hide(unlockedBreak);
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
/*   const modeHtml = renderModeGrid(res); */
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

/*   document.getElementById('mode-grid').innerHTML = modeHtml;
  document.getElementById('mode-grid-wm').innerHTML = modeHtml; */

  document.getElementById('ranked-signal-wrapper').innerHTML =
    renderServerRankedSignalList(open.ranked);


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
  if (serverResult.result_id) {
    url.searchParams.set('salesforce_uuid', serverResult.result_id);
  }
  return url.toString();
}


function getOfferCards(open) {
  const hints = open?.focus?.hints || {};

  return [
    {
      type: 'more',
      icon: ICON_BUILD_READINESS,
      title: t('questionnaire.results.focus.do-more.title'),
      hint: hints.doMore,
      meta: t('questionnaire.results.focus.do-more.body'),
    },
    {
      type: 'less',
      icon: ICON_REMOVE_FRICTION,
      title: t('questionnaire.results.focus.do-less.title'),
      hint: hints.doLess,
      meta: t('questionnaire.results.focus.do-less.body'),
    },
    {
      type: 'sit',
      icon: ICON_GO_DEEPER,
      title: t('questionnaire.results.focus.do-sit.title'),
      hint: hints.sitWith,
      meta: t('questionnaire.results.focus.do-sit.body'),
    },
  ];
}

function renderOfferCard(offer) {
const teaser = offer.hint
  ? `<div class="next-offer__teaser">${t('questionnaire.results.focus.offer-teaser', { hint: escapeHtml(offer.hint) })}</div>`
  : '';

  return `
    <article class="next-offer">
      <div class="next-offer__icon next-offer__icon--${escapeHtml(offer.type)}">
        ${offer.icon}
      </div>
      <h3>${escapeHtml(offer.title)}</h3>
      ${teaser}
      <div class="next-offer--meta">
        <p>${escapeHtml(offer.meta)}</p>
      </div>
    </article>
  `;
}

function renderDebriefInvitationSection(serverResult) {
  const bookingUrl = getBookingUrl(serverResult);
  const offers = getOfferCards(serverResult.report.open);

  return `
    <section class="next-section">
      <header class="next-header">
        <div class="next-kicker">${t('questionnaire.results.focus.offer-next-kicker')}</div>
      </header>

      <div class="next-body">
        <h2 class="next-title">
          <span>${t('questionnaire.results.focus.offer-next-title')}</span>
          <span style="color: #f5f5f5">${t('questionnaire.results.focus.offer-next-subtitle')}</span>
        </h2>

        ${renderSourceComment(serverResult.report.open)}
        <div class="next-divider"></div>

        <div class="next-offer-grid">
          ${offers.map(renderOfferCard).join('')}
        </div>

        <p class="next-lede next-lede--bold" style="margin-bottom: 12px;">
          ${t('questionnaire.results.focus.offer-next-cta')}
        </p>

        <div class="what-next-actions">
          ${bookingUrl ? `
            <a class="btn primary" id="book-followup-btn" href="${escapeHtml(bookingUrl)}" target="_blank" rel="noopener">
              ${t('questionnaire.results.focus.offer-next-cta-book')}
              <span class="arrow"></span>
            </a>
          ` : ''}
          <button type="button" class="what-next-secondary-btn" id="check-unlock-btn">
            ${t('questionnaire.results.focus.offer-next-cta-reveal')}
          </button>
        </div>
        <p id="unlock-status" class="unlock-status" aria-live="polite"></p>

        <div class="next-divider"></div>

        <p class="next-lede">
          ${renderPatternDiagnosis(serverResult.report.open)}
        </p>
        <p class="next-lede">
          ${t('questionnaire.results.focus.offer-next-closing-lede-1')}
        </p>
        <p class="next-lede">
          ${t('questionnaire.results.focus.offer-next-closing-lede-2')}
        </p>
        <p class="next-lede next-lede--bold">
          ${t('questionnaire.results.focus.offer-next-closing-lede-3')}
        </p>
      </div>
    </section>
  `;
}


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


async function loadResultByToken(token) {
  const response = await fetch(`${SUPABASE_FUNCTIONS_BASE}/report`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ access_token: token })
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || t('questionnaire.results.error-loading-report'));
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
          <h2>${t('questionnaire.results.error-loading-report')}</h2>
          <p>${escapeHtml(err.message || t('questionnaire.results.error-loading-report-details'))}</p>
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
    status.textContent = data.error || t('questionnaire.results.error-loading-report');
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

globalThis.addEventListener('focus', function () {
  if (currentResult?.locked && !currentResult.report?.locked) {
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
        ${t('questionnaire.results.overall-score')}
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

  zonelabel.innerHTML = t('questionnaire.results.zone-legend.label_question', { score: score.toFixed(2) });

  setScoreMarkerPositions(score, rscore, pscore);

  rvalue.textContent = rscore.toFixed(2);
  pvalue.textContent = pscore.toFixed(2);
  oval.textContent = score.toFixed(2);

  vmodel.textContent = verdict.label;
  vmodel.className = 'verdict-ov-mode ' + verdict.cls;

  activateVerdictZone(verdict.label);
}

const PRIVACY_NOTICE_VERSION = '2026-04-28';

function togglePrivacyDetails() {
  const details = document.getElementById('privacy-details');
  const toggle = document.getElementById('privacy-details-toggle');

  if (!details || !toggle) return;

  const isOpen = details.classList.toggle('is-open');

  details.setAttribute('aria-hidden', String(!isOpen));
  toggle.setAttribute('aria-expanded', String(isOpen));
  toggle.textContent = isOpen
    ? t('questionnaire.privacy.toggle-hide-details')
    : t('questionnaire.privacy.toggle-show-details');
}

function hasPrivacyConsent() {
  const consent = document.getElementById('privacy-consent');
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
  const industrySelect = document.getElementById('industry-select');
  const sizeSelect = document.getElementById('size-select');

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
  globalThis.scrollTo(0, 0);
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


document.getElementById('foot-download-pdf').addEventListener('click', function() {
  const originalTitle = document.title;
  document.title = `andQfive Readiness Report — ${new Date().toISOString().slice(0,10)}`;
  globalThis.print();
  setTimeout(() => { document.title = originalTitle; }, 100);
});

document.getElementById('foot-copy-url').addEventListener('click', async function() {
  const btn = this;
  const label = document.getElementById('foot-copy-url-label');
  if (!label) return;

  try {
    await navigator.clipboard.writeText(globalThis.location.href);
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