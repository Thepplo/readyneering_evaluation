const SUPABASE_FUNCTIONS_BASE = 'https://supabase-andqfive-u72683.vm.elestio.app/functions/v1';
// ---- Turnstile state ----

const PAGE_LOADED_AT = Date.now();

const indexMeta = {
  resilience: {
    label: "Resilience Index",
    formula: "Vitality + Emotion",
    components: ["vitality", "emotion"],
    description: "Your team's capacity to absorb pressure and recover."
  },
  preparedness: {
    label: "Preparedness Index",
    formula: "Execution + Alignment",
    components: ["execution", "alignment"],
    description: "Your team's readiness to act, decide, and deliver."
  },
  mind: {
    label: "Mind Index",
    formula: "Mind Q",
    components: ["mind"],
    description: "The cognitive enabler underlying both dimensions."
  }
};

const quotientMeta = {
  vitality: {
    title: "Vitality",
    color: "var(--vitality)",
    description: 
      "The collective energy, resilience and sustainability of the team.",
    reflection:
      "Think about the team's typical rhythm over the past 3–6 months—not just the last busy week."
  },

  emotion: {
    title: "Emotion",
    color: "var(--emotion)",
    description:
      "The quality of trust, care and emotional honesty within the team.",
    reflection:
      "Consider what is consistently true, especially when the team is under pressure."
  },

  mind: {
    title: "Mind",
    color: "var(--mind)",
    description:
      "How the team learns, challenges assumptions and makes sense of complexity.",
    reflection:
      "Think about how decisions are actually made, not how they are intended to be made."
  },

  execution: {
    title: "Execution",
    color: "var(--execution)",
    description:
      "The team's ability to coordinate, commit and reliably deliver together.",
    reflection:
      "Focus on everyday habits and follow-through rather than exceptional moments."
  },

  alignment: {
    title: "Alignment",
    color: "var(--alignment)",
    description:
      "The shared purpose, identity and direction that connect the team.",
    reflection:
      "Think about whether purpose genuinely influences daily behaviour and decisions."
  }
};

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

/* const SCALE_LABELS = { 1: 'Never', 2: 'Rarely', 3: 'Sometimes', 4: 'Often', 5: 'Always' }; */
async function loadVariant() {
  const variantKey = getQueryParam('variant') || 'hpt-default';
  const r = await fetch(`${SUPABASE_FUNCTIONS_BASE}/variant?variant=${encodeURIComponent(variantKey)}`);
  if (!r.ok) throw new Error('Failed to load variant');
  return r.json();
}

let VARIANT = null;
let QUOTIENTS = [];
let ITEM_INDEX = {};
let SCALE_CHOICES = [1, 2, 3, 4, 5];
let SCALE_LABELS = {};
let MAX_SCORE = {};


function buildQuotientsFromDefinition(def) {
  const itemsByQuotient = {};
  for (const it of def.items) (itemsByQuotient[it.quotient] ??= []).push(it);
  for (const k of Object.keys(itemsByQuotient)) {
    itemsByQuotient[k].sort((a, b) => a.index - b.index);
  }
  const order = def.quotientOrder ?? Object.keys(def.quotients);

  return order.map(key => ({
    key,
    label: def.quotients[key].label,
    description: '',
    items: itemsByQuotient[key] ?? [],
  }));
}

async function init() {
  try {
    VARIANT = await loadVariant();
    const def = VARIANT.instrument.definition;
    if (def.type !== 'likert_sum') {
      alert('This variant is not an HPT assessment.');
      return;
    }
    SCALE_LABELS = def.scale.labels ?? { 1: 'Never', 2: 'Rarely', 3: 'Sometimes', 4: 'Often', 5: 'Always' };
    SCALE_CHOICES = [];
    MAX_SCORE = def.total.max;
    for (let v = def.scale.min; v <= def.scale.max; v++) SCALE_CHOICES.push(v);
    QUOTIENTS = buildQuotientsFromDefinition(def);
    let idx = 1;
    for (const q of QUOTIENTS) for (const it of q.items) ITEM_INDEX[it.key] = it.index ?? idx++;
    $('btn-start').disabled = false;
  } catch (err) {
    console.error(err);
    alert('Failed to load assessment: ' + err.message);
  }
}


const answers = {};
let currentQuotient = 0;
let currentResult = null;

function $(id) { return document.getElementById(id); }
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(el => el.classList.remove('active'));
  $(id).classList.add('active');
}
function getQueryParam(name) {
  return new URLSearchParams(window.location.search).get(name);
}
function getVariantKey() {
  return getQueryParam('variant') || 'hpt-default';
}
function getSessionId() {
  let s = sessionStorage.getItem('hpt_session');
  if (!s) { s = crypto.randomUUID(); sessionStorage.setItem('hpt_session', s); }
  return s;
}
function getSubmitAttemptId() {
  let id = localStorage.getItem('hpt_submit_attempt_id');
  if (!id) { id = crypto.randomUUID(); localStorage.setItem('hpt_submit_attempt_id', id); }
  return id;
}

function renderQuotientInfo(quotient) {
  const meta = quotientMeta[quotient];
  const title = document.getElementById("quotient-title");
  const info = document.getElementById("quotient-info");

  document.documentElement.style.setProperty(
    "--current-quotient",
    meta.color
  ); 

  title.textContent = meta.title;

  info.innerHTML = `
    <p class="description">${meta.description}</p>

    <div class="reflection">
      <strong style="font-size: 11px;letter-spacing: 0.12em;text-transform: uppercase;font-weight: 600;color: var(--ink,#2A251E);margin-bottom: 9px;">As you respond</strong>
      <p>${meta.reflection}</p>
    </div>
  `;
}

function renderQuotient() {
  const q = QUOTIENTS[currentQuotient];
  $('progress-page').textContent = `Page ${currentQuotient + 1} of ${QUOTIENTS.length}`;

  /* $('quotient-title').textContent = `${q.label}: ${q.description}`; */
  renderQuotientInfo(q.key)

  const container = $('questions-container');
  container.innerHTML = '';
  for (const item of q.items) {
    const div = document.createElement('div');
    div.className = 'question';
    div.innerHTML = `
      <div class="stem"><p class="stem-num">${ITEM_INDEX[item.key]}</p> <p class="stem-q">${item.text}</p></div>
      <div class="likert">
      ${SCALE_CHOICES.map((v, i) => {
        const isSelected = answers[item.key] === v;
        return `
          <button type="button"
                  class="likert-btn${isSelected ? ' is-selected' : ''}"
                  role="radio"
                  aria-checked="${isSelected}"
                  aria-label="${SCALE_LABELS[v] ?? v}"
                  data-item="${item.key}"
                  data-value="${v}">
            <span class="likert-dot" aria-hidden="true"></span>
          </button>
        `;
      }).join('')}
      </div>
    `;
    container.appendChild(div);
  }

  container.querySelectorAll('.likert-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const itemKey = btn.dataset.item;
      const value = Number(btn.dataset.value);
      answers[itemKey] = value;

      btn.parentElement.querySelectorAll('.likert-btn').forEach(b => {
        const sel = Number(b.dataset.value) === value;
        b.classList.toggle('is-selected', sel);
        b.setAttribute('aria-checked', sel);
      });

      $('quotient-err').hidden = true;
      updatePageProgress();
    });
  });

  $('btn-back').disabled = currentQuotient === 0;
  $('btn-next-label').textContent = currentQuotient === QUOTIENTS.length - 1 ? 'Submit' : 'Next';
  updatePageProgress();

}

function updatePageProgress() {
  const q = QUOTIENTS[currentQuotient];
  const total = q.items.length;
  const answered = q.items.filter(it => Number.isInteger(answers[it.key])).length;
  $('progress-answered').textContent = answered;
  $('progress-total').textContent = total;
  $('progress-fill').style.width = `${(answered / total) * 100}%`;
}

function validateCurrentQuotient() {
  const q = QUOTIENTS[currentQuotient];
  const missing = q.items.filter(it => !Number.isInteger(answers[it.key]));
  if (missing.length) {
    $('quotient-err').textContent = `Please answer all ${q.items.length} questions before continuing (${missing.length} remaining).`;
    $('quotient-err').hidden = false;
    return false;
  }
  return true;
}

function buildSubmissionPayload() {
  const items = [];
  for (const q of QUOTIENTS) {
    for (const item of q.items) {
      items.push({
        item_key: item.key,
        item_index: ITEM_INDEX[item.key],
        item_type: 'likert',
        response_value: { value: answers[item.key] },
      });
    }
  }
  return {
    submission: {
      variant_key: getVariantKey(),
      session_id: getSessionId(),
      started_at: PAGE_LOADED_AT,
      website: document.getElementById('website-honeypot')?.value || '',
      metadata: { source: 'web_app' },
    },
    items,
  };
}

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
function startAssessment() {
  currentResult = null;
  if (!hasPrivacyConsent()) {
    document.getElementById('privacy-warn').style.display = 'block';
    return;
  }
  currentQuotient = 0;
  renderQuotient();
  showScreen('scr-quotient');
}

async function saveAssessment(payload) {
  const idempotencyKey = getSubmitAttemptId();
  const response = await fetch(`${SUPABASE_FUNCTIONS_BASE}/submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Idempotency-Key': idempotencyKey },
    body: JSON.stringify(payload),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Failed to save assessment');
  localStorage.removeItem('hpt_submit_attempt_id');
  return data;
}

async function submitAssessment() {
  showScreen('scr-loading');
  $('loading-msg').textContent = 'Saving your responses.';
  try {
    const saved = await saveAssessment(buildSubmissionPayload());
    currentResult = saved;
    $('loading-msg').textContent = 'Building your profile.';
    renderResults(saved);
    showScreen('scr-results');
  } catch (err) {
    console.error(err);
    if (err.message?.includes('already submitted')) {
      showScreen('scr-results');
      $('results-summary').innerHTML = `
        <p>You've already completed this assessment.
        Your responses are saved with your facilitator.</p>
      `;
      $('results-debug').textContent = '';
      return;
    }
    alert('Submission failed: ' + err.message);
    showScreen('scr-quotient');
  }
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

function getQuotientLevel(score) {
  if (score < 2.5) return 'risk';
  if (score < 3.5) return 'developing';
  if (score < 4.3) return 'building';
  return 'ready';
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

function stripSignalPrefix(text) {
  return String(text || '').replace(/^[^:]+:\s*/, '');
}

function renderTeamTypeBar(total, bands, label) {
  const min = parseInt(bands[0].range.split('–')[0].trim(), 10);
  const max = bands[bands.length - 1].upTo;
  const span = max - min;

  const pct = v => ((v - min) / span) * 100;

  let prevUpTo = min;
  const segments = bands.map((b, i) => {
    const left = pct(prevUpTo);
    const width = pct(b.upTo) - left;
    prevUpTo = b.upTo;
    return { ...b, left, width, isFirst: i === 0, isLast: i === bands.length - 1 };
  });

  const tickPct = Math.max(0, Math.min(100, pct(total)));

  const activeKey = bands.find(b => total <= b.upTo)?.key ?? bands[bands.length - 1].key;

  return `
    <div class="tt-header">
      <p class="results-team"><span class=results-teamtype>${label}</span></p>
      <strong>${total} / ${max}</strong>
      <span class="tt-band-label">BAND ${bands.find(b => b.key === activeKey).range}</span>
    </div>
    <div class="tt-bar">
      ${segments.map(s => `
        <div class="tt-seg ${s.key === activeKey ? 'is-active' : ''}${s.isFirst ? 'is-first' : ''} ${s.isLast ? 'is-last' : ''}"
             style="left:${s.left}%; width:${s.width}%;"></div>
      `).join('')}
      <div class="tt-tick" style="left:${tickPct}%;"></div>
    </div>
    <div class="tt-axis"><span>${min}</span><span>${max}</span></div>
  `;
}
function renderReadinessBar(value, bands, level) {
  const min = 0;
  const max = 1;
  const pct = v => ((v - min) / (max - min)) * 100;

  let prev = min;
  const segments = bands.map((b, i) => {
    const left = pct(prev);
    const right = pct(Math.min(b.upTo, max));
    prev = b.upTo;
    return {
      ...b,
      left,
      width: right - left,
      isFirst: i === 0,
      isLast: i === bands.length - 1,
    };
  });

  const tickPct = Math.max(0, Math.min(100, pct(value)));
  const activeKey = bands.find(b => value <= b.upTo)?.key ?? bands.at(-1).key;

  const segClass = s => [
    'rd-seg',
    s.key === activeKey && 'is-active',
    s.isFirst && 'is-first',
    s.isLast && 'is-last',
  ].filter(Boolean).join(' ');

  return `
    <div class="rd-bar-wrap">
      <span class="rd-level" style="left:${tickPct}%;">${level}</span>
      <div class="rd-bar">
        ${segments.map(s => `
          <div class="${segClass(s)}" style="left:${s.left}%; width:${s.width}%;"></div>
        `).join('')}
        <div class="rd-tick" style="left:${tickPct}%;"></div>
      </div>
      <div class="rd-poles">
        <span>Structural Risk</span>
        <span>Strategic Readiness</span>
      </div>
    </div>
  `;
}
function renderIndexCard(key, value, report) {
  const meta = indexMeta[key];
  const score = meta.components.reduce((s, c) => s + report.quotients[c].score, 0);
  const max   = meta.components.reduce((s, c) => s + report.quotients[c].max, 0);
  const pct   = (value * 100).toFixed(0);

  return `
    <div class="index-card">
      <p class="index-eb">${meta.label}</p>
      <div class="index-hero">
        <span class="index-value">${value.toFixed(2)}</span>
        <span class="index-raw">${score} / ${max}</span>
      </div>
      <p class="index-formula">${meta.formula}</p>
      <div class="index-bar"><div class="index-bar-fill" style="width:${pct}%;"></div></div>
      <p class="index-desc">${meta.description}</p>
    </div>
  `;
}

function renderMindCard(value, report) {
  const meta = indexMeta.mind;
  const pct = (value * 100).toFixed(0);
  return `
    <div class="mind-card">
      <div>
        <p class="index-eb">${meta.label}</p>
        <span class="index-value">${value.toFixed(2)}</span>
      </div>
      <div class="index-bar"><div class="index-bar-fill" style="width:${pct}%;"></div></div>
      <p class="index-desc" style="max-width:260px;">${meta.description}</p>
    </div>
  `;
}

function renderReadinessCard(readiness, report, def) {
  const pct = (readiness.value * 100).toFixed(0);
  return `
    <div class="readiness-card">
      <p class="index-eb">Readiness</p>
      <div class="index-hero">
        <span class="readiness-value">${pct}%</span>
      </div>
      ${renderReadinessBar(readiness.value, def.readiness.bands, readiness.level )}
      <p class="index-desc" style="color:rgba(255,255,255,0.75); margin-top:14px;">
        ${readiness.resilienceVsPreparedness} · Primary constraint:
        <strong style="color:#fff;">${report.quotients[readiness.primaryConstraint]?.label ?? readiness.primaryConstraint}</strong>
      </p>
    </div>
  `;
}
function renderResults(saved) {
  const report = saved.report?.open;
  if (!report) {
    $('results-summary').innerHTML = '<p>No report returned.</p>';
    $('results-debug').textContent = JSON.stringify(saved, null, 2);
    return;
  }
  const def = VARIANT.instrument.definition;

  const html = `
    <div class="results-container">
      <p class="results-eb">Team Type</p>
      ${renderTeamTypeBar(report.total,def.teamType.bands, report.teamType.label)}
      <p class="team-desc">${stripSignalPrefix(report.teamType.description)}</p>
    </div>
    <div class="results-container">
      <p class="results-eb">The 5 Quotients</p>
      <p class="results-desc">Each dimension scored on its own scale. Your primary constraint is where attention will go furthest.</p>
      <div class="quotient-flex">
      ${Object.entries(report.quotients).map(([k, q]) => {
        const meta = quotientMeta[k] ?? {};
        const color = meta.color ?? "#999";
        const pct = (q.pct * 100).toFixed(0);
        const isPrimary = q.label === report.readiness.primaryConstraint;

        return `
          <div class="quotient-row${isPrimary ? ' is-primary' : ''}"
              style="--current-quotient:${color};">
            <div class="q-meta">
              <div class="q-chip ${q.label}">${q.label} ${isPrimary ? `<span class="q-tag">Primary constraint</span>` : ''}</div>
              <div class="q-score">
                <span class="q-value">${q.score}/${q.max}</span>
                <span class="q-percent ${q.label}">${pct}%</span>
                <span class="q-band band-${q.signal.level}">${q.signal.level}</span>
              </div>
            </div>

            <div class="q-scale" style="--pos:${pct}%;">
              <div class="q-bar">
                <div
                  class="q-bar-fill"
                  style="--width:${pct}%; --current-quotient:${color};"
                ></div>
              </div>
            </div>

            <div>
              <p class="q-desc">${stripSignalPrefix(q.signal.text)}</p>
            </div>
          </div>
        `;
      }).join("")}
      </div>
    </div>
    <div class="results-container">
      <p class="results-eb">Indices</p>

      <div class="index-pair">
        ${renderIndexCard('resilience', report.indices.resilience, report)}
        ${renderIndexCard('preparedness', report.indices.preparedness, report)}
      </div>

      ${renderMindCard(report.indices.mind, report)}

      ${renderReadinessCard(report.readiness, report, def)}
    </div>
    <div class="result-questions-wrapper">
      <p class="results-eb-title">Critical questions for your team</p>
      <p class="title-sub" style="margin-bottom: 10px !important;">Bring these to your team debrief. They matter more than the scores.</p>
      ${report.criticalQuestions.map((q, i) => `
        <div class="result-question">
          <span class="result-question-num">${String(i + 1).padStart(2, '0')}</span>
          <p class="result-question-text">${q}</p>
        </div>
      `).join('')}
    </div>
  `;
  $('results-summary').innerHTML = html;
  $('results-debug').textContent = JSON.stringify(report, null, 2);
}

document.getElementById('btn-start').addEventListener('click', startAssessment);


$('btn-back').addEventListener('click', () => {
  if (currentQuotient > 0) {
    currentQuotient--;
    renderQuotient();
    window.scrollTo(0, 0);
  }
});

$('btn-next').addEventListener('click', () => {
  if (!validateCurrentQuotient()) return;
  if (currentQuotient < QUOTIENTS.length - 1) {
    currentQuotient++;
    renderQuotient();
    window.scrollTo(0, 0);
  } else {
    submitAssessment();
  }
});


async function loadResultByToken(token) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(`${SUPABASE_FUNCTIONS_BASE}/report`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ access_token: token }),
      signal: controller.signal
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'This results link is no longer valid.');
    }

    return {
      result_id: data.result_id,
      access_token: token,
      locked: Boolean(data.locked),
      unlocked: Boolean(data.unlocked),
      report: data.report,
      booking: data.booking || null
    };
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error('Loading the report timed out. Please refresh and try again.');
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}
async function renderResultsFromToken(token) {
  VARIANT = await loadVariant();
  try {
    const serverResult = await loadResultByToken(token);
    currentResult = serverResult;

    renderResults(serverResult);
    showScreen('scr-results');
  } catch (err) {
    console.error(err);

    showScreen('scr-results');

    const content =
      document.getElementById('results-content') ||
      document.getElementById('results-summary');

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
  showScreen('scr-loading');
  $('loading-msg').textContent = 'Loading your report.';
  return renderResultsFromToken(token);
}

const resultToken = getQueryParam('t');

$('btn-start').disabled = true;

if (resultToken) {
  showResultsByToken(resultToken);
} else {
  init();
}