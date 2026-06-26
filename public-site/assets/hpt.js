const SUPABASE_FUNCTIONS_BASE = 'https://supabase-andqfive-u72683.vm.elestio.app/functions/v1';
// ---- Turnstile state ----

const PAGE_LOADED_AT = Date.now();

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
  const variantKey = getQueryParam('variant') || 'hpt-test';
  const r = await fetch(`${SUPABASE_FUNCTIONS_BASE}/variant?variant=${encodeURIComponent(variantKey)}`);
  if (!r.ok) throw new Error('Failed to load variant');
  return r.json();
}

let VARIANT = null;
let QUOTIENTS = [];
let ITEM_INDEX = {};
let SCALE_CHOICES = [1, 2, 3, 4, 5];
let SCALE_LABELS = {};

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

function renderResults(saved) {
  const report = saved.report?.open;
  if (!report) {
    $('results-summary').innerHTML = '<p>No report returned.</p>';
    $('results-debug').textContent = JSON.stringify(saved, null, 2);
    return;
  }

  const html = `
    <p class="results-eb">Team Type</p>
    <p class="results-team"><span class=results-teamtype>${report.teamType.label}</span> (${report.teamType.range}) — total ${report.total}/140</p>
    <p class="team-desc">${report.teamType.description}</p>
    <h3>Indices</h3>
    <ul>
      <li>Resilience: ${(report.indices.resilience * 100).toFixed(0)}%</li>
      <li>Preparedness: ${(report.indices.preparedness * 100).toFixed(0)}%</li>
      <li>Mind: ${(report.indices.mind * 100).toFixed(0)}%</li>
      <li><strong>Readiness:</strong> ${(report.readiness.value * 100).toFixed(0)}% — ${report.readiness.level}</li>
    </ul>
    <p><em>${report.readiness.resilienceVsPreparedness}</em> · Primary constraint: <strong>${report.readiness.primaryConstraint}</strong></p>
    <h3>Quotients</h3>
    <div>
      ${Object.entries(report.quotients).map(([k, q]) => `
        <div class="quotient-row">
          <div class="q-meta">
            <div class="q-chip ${q}">${q.label}</div>
            <div class="q-score">
              <span class="q-value">${q.score}/${q.max}</span>
              <span class="q-band band-${q.signal.level}">${q.signal.level}</span>
            </div>
          </div>
          <div class="q-scale" style="--pos:${(q.pct * 100).toFixed(0)}%;">
            <div class="q-bar"></div>
            <div
              class="q-bar-fill"
              style="--width:${(q.pct * 100).toFixed(0)}%; --current-quotient:${q}"
            ></div>
          </div>
          <div>
            <small>${q.signal.text}</small>
          </div>
        </div>
      `).join('')}
    </div>
    <h3>Critical questions for your team</h3>
    <ol>${report.criticalQuestions.map(q => `<li>${q}</li>`).join('')}</ol>
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