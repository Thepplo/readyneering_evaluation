// ============================================================
// HPT skeleton — minimal flow: intro → 5 quotient pages → results
// Submits to the same /submit edge function as the triad app.
// ============================================================

// ---- Config ------------------------------------------------
const SUPABASE_FUNCTIONS_BASE = 'https://supabase-andqfive-u72683.vm.elestio.app/functions/v1';


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
    const def = VARIANT.instrument.definition;
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

/* const QUOTIENTS = [
  {
    key: 'vitality',
    label: 'Vitality Q',
    description: 'Energy, recovery, and sustainable engagement.',
    items: [
      { key: 'q1', text: 'Our team is small enough that every member carries real weight — there are no passengers.' },
      { key: 'q2', text: 'We talk openly about workload. Overload is flagged early, before people burn out or disengage.' },
      { key: 'q3', text: 'Team members show up fully — our interactions have real energy, not going-through-the-motions.' },
      { key: 'q4', text: 'After intense periods, we deliberately recover together rather than pushing through exhaustion.' },
      { key: 'q5', text: 'We celebrate progress and wins in ways that genuinely recharge the people in this team.' },
    ],
  },
  {
    key: 'emotion',
    label: 'Emotion Q',
    description: 'Trust, care, and how the team handles tension.',
    items: [
      { key: 'q6', text: "We are genuinely invested in each other's growth — not just delivery." },
      { key: 'q7', text: 'Tensions and difficult emotions are named early, before they damage relationships or performance.' },
      { key: 'q8', text: 'There is a quality of care in this team that goes beyond professionalism.' },
      { key: 'q9', text: 'When we disagree, we resolve it — conflicts do not go underground or get buried under false consensus.' },
      { key: 'q10', text: 'Feedback in this team is direct and honest. People say what they actually think, not what is easiest.' },
    ],
  },
  {
    key: 'mind',
    label: 'Mind Q',
    description: 'Skills, thinking quality, and collective intelligence.',
    items: [
      { key: 'q11', text: 'Our team has the right mix of technical and functional skills to meet our goals.' },
      { key: 'q12', text: 'Our team actively develops the interpersonal skills needed to work well together.' },
      { key: 'q13', text: 'When facing a complex problem, we slow down to separate facts from assumptions before deciding.' },
      { key: 'q14', text: 'We actively challenge dominant narratives and our own collective blind spots.' },
      { key: 'q15', text: 'After setbacks, we analyse what happened structurally — what our patterns reveal, not just who to blame.' },
    ],
  },
  {
    key: 'execution',
    label: 'Execution Q',
    description: 'Goals, working agreements, and accountability.',
    items: [
      { key: 'q16', text: 'Our team goals are specific and measurable — concrete outcomes everyone can point to and track.' },
      { key: 'q17', text: 'We have explicit, agreed ways of working — how we meet, decide, and share progress is clear.' },
      { key: 'q18', text: 'How we handle conflict is agreed and consistently followed.' },
      { key: 'q19', text: 'When someone commits to something, everyone expects follow-through — we hold each other accountable.' },
      { key: 'q20', text: 'We regularly review how we are working together, not only what we are delivering.' },
      { key: 'q21', text: 'We adjust our ways of working when something is not working.' },
      { key: 'q22', text: 'When we take on a challenge, we produce something together that none of us could have produced alone.' },
    ],
  },
  {
    key: 'alignment',
    label: 'Alignment Q',
    description: 'Shared purpose, identity, and direction.',
    items: [
      { key: 'q23', text: 'Our team has a shared purpose beyond the task list — a reason for existing every member could articulate.' },
      { key: 'q24', text: 'That purpose genuinely shapes daily decisions, not just what gets said at kick-offs or off-sites.' },
      { key: 'q25', text: 'Decisions made as a team are implemented consistently — even those who disagreed get behind the outcome.' },
      { key: 'q26', text: 'Belonging to this team has shaped how members see themselves — there is a shared identity.' },
      { key: 'q27', text: "Our team's purpose connects meaningfully to something larger than our own results." },
      { key: 'q28', text: 'Every member could articulate why our work matters beyond us.' },
    ],
  },
]; */

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

function renderQuotient() {
  const q = QUOTIENTS[currentQuotient];
  $('progress').textContent = `Page ${currentQuotient + 1} of ${QUOTIENTS.length} — ${q.label}`;
  $('quotient-title').textContent = `${q.label}: ${q.description}`;

  const container = $('questions-container');
  container.innerHTML = '';
  for (const item of q.items) {
    const div = document.createElement('div');
    div.className = 'question';
    div.innerHTML = `
      <div class="stem"><strong>${ITEM_INDEX[item.key]}.</strong> ${item.text}</div>
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
