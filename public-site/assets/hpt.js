// ============================================================
// HPT skeleton — minimal flow: intro → 5 quotient pages → results
// Submits to the same /submit edge function as the triad app.
// ============================================================

// ---- Config ------------------------------------------------
const SUPABASE_FUNCTIONS_BASE = 'https://supabase-andqfive-u72683.vm.elestio.app/functions/v1';

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
  return Object.entries(def.quotients).map(([key, meta]) => ({
    key,
    label: meta.label,
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
  } catch (err) {
    console.error(err);
    alert('Failed to load assessment: ' + err.message);
  }
}

init();
let _idx = 1;
for (const q of QUOTIENTS) for (const it of q.items) ITEM_INDEX[it.key] = _idx++;

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

/*   document.documentElement.style.setProperty(
    "--current-quotient",
    meta.color
  ); */

  title.textContent = meta.title;

  info.innerHTML = `
    <p class="description">${meta.description}</p>

    <div class="reflection">
      <strong>As you respond</strong>
      <p>${meta.reflection}</p>
    </div>
  `;
}

function renderQuotient() {
  const q = QUOTIENTS[currentQuotient];
  $('progress').textContent = `Page ${currentQuotient + 1} of ${QUOTIENTS.length}`;
  /* $('quotient-title').textContent = `${q.label}: ${q.description}`; */
  renderQuotientInfo(q.key)

  const container = $('questions-container');
  container.innerHTML = '';
  for (const item of q.items) {
    const div = document.createElement('div');
    div.className = 'question';
    div.innerHTML = `
      <div class="stem"><p><strong>${ITEM_INDEX[item.key]}.</strong></p> <p>${item.text}</p></div>
      <div class="likert">
      ${SCALE_CHOICES.map((v, i) => {
        const isMidpoint = SCALE_CHOICES.length % 2 === 0 && i === SCALE_CHOICES.length / 2;
        return `
          ${isMidpoint ? '<span class="scale-divider" aria-hidden="true"></span>' : ''}
          <label>
            <input type="radio" name="${item.key}" value="${v}" ${answers[item.key] === v ? 'checked' : ''}>
            <span>${SCALE_LABELS[v] ?? v}</span>
          </label>
        `;
      }).join('')}
      </div>
    `;
    container.appendChild(div);
  }

  container.querySelectorAll('input[type=radio]').forEach(input => {
    input.addEventListener('change', e => {
      answers[e.target.name] = Number(e.target.value);
      $('quotient-err').hidden = true;
    });
  });

  $('btn-back').disabled = currentQuotient === 0;
  $('btn-next').textContent = currentQuotient === QUOTIENTS.length - 1 ? 'Submit' : 'Next';
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
      metadata: {
        source: 'web_app',
      },
    },
    items,
  };
}

async function saveAssessment(payload, turnstileToken = null) {
  const idempotencyKey = getSubmitAttemptId();
  const body = turnstileToken ? { ...payload, turnstileToken } : payload;
  const response = await fetch(`${SUPABASE_FUNCTIONS_BASE}/submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Idempotency-Key': idempotencyKey },
    body: JSON.stringify(body),
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
    // NOTE: Turnstile not wired up here — add it the same way as the triad app
    // if your edge function has TURNSTILE_SECRET_KEY configured.
    const saved = await saveAssessment(buildSubmissionPayload());
    currentResult = saved;
    $('loading-msg').textContent = 'Building your profile.';
    renderResults(saved);
    showScreen('scr-results');
  } catch (err) {
    console.error(err);
    alert('Submission failed: ' + err.message);
    showScreen('scr-quotient');
  }
}

function renderResults(saved) {
  const report = saved.report?.open;
  if (!report) {
    $('results-summary').innerHTML = '<p>No report returned.</p>';
    $('results-debug').textContent = JSON.stringify(saved, null, 2);
    return;
  }

  const html = `
    <p><strong>Team type:</strong> ${report.teamType.label} (${report.teamType.range}) — total ${report.total}/140</p>
    <p>${report.teamType.description}</p>
    <h3>Indices</h3>
    <ul>
      <li>Resilience: ${(report.indices.resilience * 100).toFixed(0)}%</li>
      <li>Preparedness: ${(report.indices.preparedness * 100).toFixed(0)}%</li>
      <li>Mind: ${(report.indices.mind * 100).toFixed(0)}%</li>
      <li><strong>Readiness:</strong> ${(report.readiness.value * 100).toFixed(0)}% — ${report.readiness.level}</li>
    </ul>
    <p><em>${report.readiness.resilienceVsPreparedness}</em> · Primary constraint: <strong>${report.readiness.primaryConstraint}</strong></p>
    <h3>Quotients</h3>
    <ul>
      ${Object.entries(report.quotients).map(([k, q]) => `
        <li><strong>${q.label}:</strong> ${q.score}/${q.max} (${(q.pct * 100).toFixed(0)}%) — ${q.signal.level}<br>
            <small>${q.signal.text}</small></li>
      `).join('')}
    </ul>
    <h3>Critical questions for your team</h3>
    <ol>${report.criticalQuestions.map(q => `<li>${q}</li>`).join('')}</ol>
  `;
  $('results-summary').innerHTML = html;
  $('results-debug').textContent = JSON.stringify(report, null, 2);
}

$('btn-start').addEventListener('click', () => {
  currentQuotient = 0;
  renderQuotient();
  showScreen('scr-quotient');
});

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
