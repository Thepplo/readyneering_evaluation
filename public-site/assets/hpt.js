const SUPABASE_FUNCTIONS_BASE = 'https://supabase-andqfive-u72683.vm.elestio.app/functions/v1';

const PAGE_LOADED_AT = Date.now();
const DEV_MODE = getQueryParam('dev') === '1';

function t(key, vars) {
  let str = key.split('.').reduce((o, k) => o?.[k], window.__I18N__) ?? key;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      str = str.replaceAll(`{${k}}`, v);
    }
  }
  return str;
}

const indexMeta = {
  resilience:   { components: ["vitality", "emotion"] },
  preparedness: { components: ["execution", "alignment"] },
  mind:         { components: ["mind"] },
};
function indexText(key, field) { return t(`indices.${key}.${field}`); }

const quotientMeta = {
  vitality:  { color: "var(--vitality)" },
  emotion:   { color: "var(--emotion)" },
  mind:      { color: "var(--mind)" },
  execution: { color: "var(--execution)" },
  alignment: { color: "var(--alignment)" },
};
const RVP_KEYS = {
  'Balanced': 'balanced',
  'Resilience leads — build structure': 'resilience_leads',
  'Preparedness leads — build capacity': 'preparedness_leads',
};
function isNoConstraint(pc) { return !pc || pc === 'none' || pc === 'None found'; }

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
  if (!r.ok) throw new Error(t('errors.variant_failed'));
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
      alert(t('errors.wrong_type'));
      return;
    }
    SCALE_LABELS = def.scale.labels ?? {};
    SCALE_CHOICES = [];
    MAX_SCORE = def.total.max;
    for (let v = def.scale.min; v <= def.scale.max; v++) SCALE_CHOICES.push(v);
    document.documentElement.style.setProperty('--scale-steps', SCALE_CHOICES.length);
    renderAnswerLegend(def);
    QUOTIENTS = buildQuotientsFromDefinition(def);
    let idx = 1;
    for (const q of QUOTIENTS) for (const it of q.items) ITEM_INDEX[it.key] = it.index ?? idx++;
    $('btn-start').disabled = false;
  } catch (err) {
    console.error(err);
    alert(t('errors.load_failed', { error: err.message }));
  }
}


const answers = {};
let currentQuotient = 0;
let currentResult = null;

function $(id) { return document.getElementById(id); }
let _screenTl = null;

function showScreen(id) {
  const next = document.getElementById(id);
  if (!next) return;

  if (_screenTl) { _screenTl.kill(); _screenTl = null; }
  document.querySelectorAll('.screen').forEach(el => gsap.killTweensOf(el));

  const current = document.querySelector('.screen.active');
  if (current === next) return;

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    document.querySelectorAll('.screen').forEach(el => {
      el.classList.remove('active');
      gsap.set(el, { clearProps: 'transform,opacity' });
    });
    next.classList.add('active');
    return;
  }

  _screenTl = gsap.timeline({ onComplete: () => { _screenTl = null; } });

  if (current) {
    _screenTl.to(current, {
      opacity: 0, y: -8, duration: 0.2, ease: 'power2.in',
      onComplete: () => {
        current.classList.remove('active');
        gsap.set(current, { clearProps: 'transform,opacity' });
      },
    });
  }

  _screenTl.add(() => next.classList.add('active'))
    .fromTo(next,
      { opacity: 0, y: 12 },
      { opacity: 1, y: 0, duration: 0.35, ease: 'power2.out', clearProps: 'transform,opacity' }
    );

  window.scrollTo({ top: 0, behavior: 'instant' });
}
function getQueryParam(name) {
  return new URLSearchParams(window.location.search).get(name);
}
function getVariantKey() {
  return getQueryParam('variant') || 'hpt-default';
}
function getSessionId() {
  if (DEV_MODE) {
    return crypto.randomUUID();
  }
  let s = sessionStorage.getItem('hpt_session');
  if (!s) { s = crypto.randomUUID(); sessionStorage.setItem('hpt_session', s); }
  return s;
}

/* function getSubmitAttemptId() {
  let id = localStorage.getItem('hpt_submit_attempt_id');
  if (!id) { id = crypto.randomUUID(); localStorage.setItem('hpt_submit_attempt_id', id); }
  return id;
} */

function renderQuotientInfo(quotient, label) {
  const meta = quotientMeta[quotient];
  const title = document.getElementById("quotient-title");
  const info = document.getElementById("quotient-info");

  document.documentElement.style.setProperty(
    "--current-quotient",
    meta.color
  ); 

  title.textContent = label;

  info.innerHTML = `
    <p class="description">${t(`quotients.${quotient}.description`)}</p>

    <div class="reflection">
      <strong style="font-size: 11px;letter-spacing: 0.12em;text-transform: uppercase;font-weight: 600;color: var(--ink,#2A251E);margin-bottom: 9px;">${t('assessment.reflection_label')}</strong>
      <p>${t(`quotients.${quotient}.reflection`)}</p>
    </div>
  `;
}

function renderAnswerLegend(def) {
  const grid = $('answer-legend-grid');
  const { min, max, labels = {} } = def.scale;

  const spans = [];
  for (let v = min; v <= max; v++) {
    spans.push(`<span>${labels[v] ?? v}</span>`);
  }
  grid.innerHTML = spans.join('');

  grid.style.setProperty('--scale-steps', max - min + 1);

  if (def.scale.prompt) {
    $('answer-legend-title').textContent = def.scale.prompt;
  }
}

function renderQuotient() {
  const q = QUOTIENTS[currentQuotient];
  $('progress-page').textContent = t('assessment.page_indicator', { current: currentQuotient + 1, total: QUOTIENTS.length });

  renderQuotientInfo(q.key, q.label)

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
  if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      gsap.fromTo('#questions-container .question',
        { opacity: 0, y: 8 },
        { opacity: 1, y: 0, duration: 0.3, stagger: 0.04, ease: 'power2.out', clearProps: 'all' }
      );
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
  $('btn-next-label').textContent = currentQuotient === QUOTIENTS.length - 1 ? t('assessment.submit') : t('assessment.next');
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
    $('quotient-err').textContent = t('assessment.error_missing', { total: q.items.length, missing: missing.length });
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
    ? t('privacy.toggle_close')
    : t('privacy.toggle_open');
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
/*   const idempotencyKey = getSubmitAttemptId();
 */  const response = await fetch(`${SUPABASE_FUNCTIONS_BASE}/submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || t('errors.save_failed'));
  localStorage.removeItem('hpt_submit_attempt_id');
  return data;
}

async function submitAssessment() {
  showScreen('scr-loading');
  $('loading-msg').textContent = t('loading.saving');
  try {
    const saved = await saveAssessment(buildSubmissionPayload());
    currentResult = saved;
    $('loading-msg').textContent = t('loading.building');
    updateUrlForResult(saved.access_token); 
    renderResults(saved);
    showScreen('scr-results');
  } catch (err) {
    console.error(err);
    if (err.message?.includes('already submitted')) {
      parkLeadForm();
      showScreen('scr-results');
      $('results-summary').innerHTML = `
        <p>${t('errors.already_submitted')}</p>
      `;
      return;
    }
    alert(t('errors.submit_failed', { error: err.message }));
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
      <span class="tt-band-label">${t('results.band_prefix')} ${bands.find(b => b.key === activeKey).range}</span>
    </div>
    <div class="tt-bar">
      ${segments.map(s => `
        <div class="tt-seg ${s.key === activeKey ? 'is-active' : ''} ${s.isFirst ? 'is-first' : ''} ${s.isLast ? 'is-last' : ''}"
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
  const labelPct = Math.max(6, Math.min(94, tickPct));

  const labelTransform =
    tickPct <= 6 ? "translateX(0)" :
    tickPct >= 94 ? "translateX(-100%)" :
    "translateX(-50%)";

  const activeKey = bands.find(b => value <= b.upTo)?.key ?? bands.at(-1).key;

  const segClass = s => [
    "rd-seg",
    s.key === activeKey && "is-active",
    s.isFirst && "is-first",
    s.isLast && "is-last",
  ].filter(Boolean).join(" ");

  return `
    <div class="rd-bar-wrap">
      <span
        class="rd-level"
        style="left:${labelPct}%; transform:${labelTransform};"
      >
        ${level}
      </span>

      <div class="rd-bar">
        ${segments.map(s => `
          <div class="${segClass(s)}" style="left:${s.left}%; width:${s.width}%;"></div>
        `).join("")}
        <div class="rd-tick" style="left:${tickPct}%;"></div>
      </div>

      <div class="rd-poles">
        <span>${t('results.pole_left')}</span>
        <span>${t('results.pole_right')}</span>
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
      <p class="index-eb">${indexText(key, 'label')}</p>
      <div class="index-hero">
        <span class="index-value">${value.toFixed(2)}</span>
        <span class="index-raw">${score} / ${max}</span>
      </div>
      <p class="index-formula">${indexText(key, 'formula')}</p>
      <div class="index-bar"><div class="index-bar-fill" style="width:${pct}%;"></div></div>
      <p class="index-desc">${indexText(key, 'description')}</p>
    </div>
  `;
}

function renderMindCard(value, report) {
  const meta = indexMeta.mind;
  const pct = (value * 100).toFixed(0);
  return `
    <div class="mind-card">
      <p class="index-eb">${indexText('mind', 'label')}</p>
      <div class="mind-card-grid">
        <div>
          <span class="index-value">${value.toFixed(2)}</span>
        </div>
        <div class="index-bar"><div class="index-bar-fill" style="width:${pct}%;"></div></div>
        <p class="index-desc" style="max-width:260px;">${indexText('mind', 'description')}</p>
      </div>
    </div>
  `;
}

function renderReadinessCard(readiness, report, def) {
  const pct = (readiness.value * 100).toFixed(0);
  const primaryConstraint = readiness.primaryConstraint;
  const hasPrimaryConstraint = !isNoConstraint(primaryConstraint);

  const primaryConstraintLabel = hasPrimaryConstraint
    ? report.quotients[primaryConstraint]?.label ?? primaryConstraint
    : null;

  const rvpKey = RVP_KEYS[readiness.resilienceVsPreparedness];
  const rvpText = rvpKey ? t(`results.rvp.${rvpKey}`) : readiness.resilienceVsPreparedness;

  return `
    <div class="readiness-card">
      <p class="index-eb">${t('results.readiness_title')}</p>
      <div class="index-hero">
        <span class="readiness-value">${pct}%</span>
      </div>

      ${renderReadinessBar(readiness.value, def.readiness.bands, readiness.level)}

      <p class="index-desc" style="color:rgba(255,255,255,0.75); margin-top:14px;">
        ${rvpText}
        ${hasPrimaryConstraint ? `
          · ${t('results.primary_constraint_prefix')}
          <strong style="color:#fff;">${primaryConstraintLabel}</strong>
        ` : ""}
      </p>
    </div>
  `;
}

function renderCriticalQuestions(qs) {
  return `
    <div class="result-questions-wrapper">
      <p class="results-eb-title">${t('results.critical_title')}</p>
      <p class="title-sub" style="margin-bottom: 25px !important;">${t('results.critical_sub')}</p>
      ${qs.map((q, i) => `
        <div class="result-question">
          <span class="result-question-num">${String(i + 1).padStart(2, '0')}</span>
          <p class="result-question-text">${q}</p>
        </div>`).join('')}
    </div>`;
}

function renderInvitation(report, { withForm }) {
  const pc = report?.readiness?.primaryConstraint;
  const hasPc = !isNoConstraint(pc);
  const pcLabel = hasPc ? (report.quotients[pc]?.label ?? pc) : null;
  const pcColor = hasPc ? (quotientMeta[pc]?.color ?? 'currentColor') : null;

  return `
    <section class="hpt-invite">
      <header class="hpt-invite__header">
        <p class="hpt-invite__kicker">${t('results.critical_title')}</p>
      </header>
      <div class="hpt-invite__body">
        <p class="hpt-invite__lede">
          ${t(withForm ? 'results.critical_locked_sub' : 'results.critical_sent_sub')}
        </p>
        ${hasPc ? `
          <p class="hpt-invite__context" style="--current-quotient:${pcColor};">
            <span class="q-tag">${t('results.primary_constraint')}</span>
            <span class="q-chip">${escapeHtml(pcLabel)}</span>
          </p>` : ''}
        ${withForm ? `
          <div class="hpt-invite__divider"></div>
          <div id="invite-form-slot"></div>` : ''}
      </div>
    </section>`;
}

let leadHome = null;

function mountLeadForm(section) {
  const slot = $('invite-form-slot');
  if (!slot) return;
  if (!leadHome) {
    leadHome = document.createComment('hpt-lead-home');
    section.parentNode.insertBefore(leadHome, section);
  }
  slot.appendChild(section);
  section.classList.add('is-glass');
}

function parkLeadForm() {
  const section = $('hpt-lead');
  if (!section || !leadHome) return;
  section.hidden = true;
  section.classList.remove('is-glass');
  leadHome.parentNode.insertBefore(section, leadHome);
}

document.addEventListener('newsletter:success', (e) => {
  if (!e.target.closest('#hpt-lead')) return;
  const locked = e.detail?.report?.locked;
  if (!locked?.criticalQuestions || !currentResult) return;
  currentResult.report = { ...currentResult.report, locked };
  parkLeadForm();
  $('critical-slot').innerHTML = renderCriticalQuestions(locked.criticalQuestions);
  $('critical-slot').scrollIntoView({ behavior: 'smooth', block: 'start' });
});

function renderResults(saved) {
  parkLeadForm();
  const report = saved.report?.open;
  if (!report) {
    $('results-summary').innerHTML = `<p>${t('errors.no_report')}</p>`;
    console.warn('No open report in response', saved);
    return;
  }
  const isFull = Boolean(saved.full);
  const isLockedVariant = Boolean(saved.locked);
  const def = VARIANT.instrument.definition;
  const primaryConstraint = report.readiness?.primaryConstraint;
  const hasPrimaryConstraint = !isNoConstraint(primaryConstraint);
  const critical = isFull
  ? (saved.report?.locked?.criticalQuestions ?? report.criticalQuestions)
  : report.criticalQuestions;
  const canExport = isFull || !isLockedVariant;


  const html = `
    <div class="results-container">
      <p class="results-eb">${t('results.team_type')}</p>
      ${renderTeamTypeBar(report.total, def.teamType.bands, report.teamType.label)}
      <p class="team-desc">${stripSignalPrefix(report.teamType.description)}</p>
    </div>
    <div class="results-container">
      <p class="results-eb">${t('results.quotients_title')}</p>
      <p class="results-desc">
        ${hasPrimaryConstraint
          ? t('results.quotients_desc_primary')
          : t('results.quotients_desc_none')
        }
      </p>
      <div class="quotient-flex">
      ${Object.entries(report.quotients).map(([k, q]) => {
        const meta = quotientMeta[k] ?? {};
        const color = meta.color ?? "#999";
        const pct = (q.pct * 100).toFixed(0);
        const isPrimary =
          hasPrimaryConstraint &&
          k === report.readiness.primaryConstraint;

        return `
          <div class="quotient-row${isPrimary ? ' is-primary' : ''}"
              style="--current-quotient:${color};">
            <div class="q-meta">
              <div class="q-chip-flex">
                <div class="q-chip ${q.label}">${q.label}</div>
                ${isPrimary ? `<span class="q-tag">${t('results.primary_constraint')}</span>` : ''}
              </div>
              <div class="q-score">
                <span class="q-value">${q.score}/${q.max}</span>
                <span class="q-percent ${q.label}">${pct}%</span>
                <span class="q-band band-${q.signal.level}">${t(`signal_levels.${q.signal.level}`)}</span>
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
      <p class="results-eb">${t('results.indices_title')}</p>
      <p class="results-desc">${t('results.indices_desc')}</p>
      <div class="index-pair">
        ${renderIndexCard('resilience', report.indices.resilience, report)}
        ${renderIndexCard('preparedness', report.indices.preparedness, report)}
      </div>

      ${renderMindCard(report.indices.mind, report)}

      ${renderReadinessCard(report.readiness, report, def)}
    </div>
    <div id="critical-slot">
      ${critical
        ? renderCriticalQuestions(critical)
        : isLockedVariant
          ? renderInvitation(report, { withForm: !saved.unlocked })
          : ''}
    </div>
  `;
  $('results-summary').innerHTML = html;
  showLeadForm(report, isLockedVariant && !saved.unlocked && !isFull);
  document.body.classList.toggle('can-export', canExport);
  const printBtn = $('btn-print');
  if (printBtn) printBtn.hidden = !canExport;

  const forgetBtn = $('btn-forget');
  if (forgetBtn) forgetBtn.hidden = !isFull;
  if (isFull && getQueryParam('action') === 'delete') {
    setTimeout(forgetReport, 300);
  }
}

function setupLeadQuotientSelect(section, report) {
  const select = section.querySelector('#lead-quotient');
  if (!select) return;
  const wrap = select.closest('.contact-form__select-wrap');

  if (select.options.length <= 1) {
    const qs = buildQuotientsFromDefinition(VARIANT.instrument.definition);
    for (const q of qs) select.add(new Option(q.label, q.key));
    select.addEventListener('change', sync);
  }

  const pc = report?.readiness?.primaryConstraint;
  if (!isNoConstraint(pc) && [...select.options].some(o => o.value === pc)) select.value = pc;
  sync();

  function sync() {
    const color = quotientMeta[select.value]?.color;
    if (color) wrap.style.setProperty('--q-color', color);
    else wrap.style.removeProperty('--q-color');
    wrap.dataset.q = select.value || '';
  }
}

function showLeadForm(report, show) {
  const section = $('hpt-lead');
  if (!section) return;
  if (!show) { section.hidden = true; return; }
  const variantInput = section.querySelector('input[name="variant_key"]');
  if (variantInput) variantInput.value = getVariantKey();
  setupLeadQuotientSelect(section, report);
  const tokenInput = section.querySelector('input[name="access_token"]');
  if (tokenInput) tokenInput.value = currentResult?.access_token || '';
  mountLeadForm(section);
  section.hidden = false;
}

document.getElementById('btn-start').addEventListener('click', startAssessment);

document.getElementById('btn-print').addEventListener('click', function() {
  const originalTitle = document.title;
  document.title = `andQfive HPT report - ${new Date().toISOString().slice(0,10)}`;
  globalThis.print();
  setTimeout(() => { document.title = originalTitle; }, 100);
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

$('btn-forget')?.addEventListener('click', forgetReport);

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

function updateUrlForResult(token) {
  if (!token) return;
  const params = new URLSearchParams(window.location.search);
  params.set('variant', getVariantKey());
  params.set('t', token);
  const newUrl = `${window.location.pathname}?${params.toString()}`;
  window.history.replaceState({}, '', newUrl);
}

async function loadResultByToken(tokenBody) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(`${SUPABASE_FUNCTIONS_BASE}/report`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(tokenBody),
      signal: controller.signal
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || t('errors.link_invalid'));
    }

    return {
      result_id: data.result_id,
      access_token: tokenBody.access_token ?? null,
      locked: Boolean(data.locked),
      unlocked: Boolean(data.unlocked),
      full: Boolean(data.full),
      report: data.report,
    };
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error(t('errors.link_timeout'));
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
    parkLeadForm();
    console.error(err);

    showScreen('scr-results');

    const content =
      document.getElementById('results-content') ||
      document.getElementById('results-summary');

    if (content) {
      content.innerHTML = `
        <div class="results-error">
          <h2>${t('errors.link_unavailable')}</h2>
          <p>${escapeHtml(err.message || t('errors.link_default'))}</p>
        </div>`;
    }
  }
}

async function forgetReport() {
  const token = getQueryParam('r');
  if (!token) return;
  if (!confirm(t('privacy.forget_confirm'))) return;

  const res = await fetch(`${SUPABASE_FUNCTIONS_BASE}/hpt-forget`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ report_token: token }),
  });
  if (!res.ok) { alert(t('privacy.forget_failed')); return; }

  window.history.replaceState({}, '', window.location.pathname);
  $('results-summary').innerHTML = `<div class="results-error"><h2>${t('privacy.forget_done')}</h2></div>`;
  $('btn-print')?.setAttribute('hidden', '');
  $('btn-forget')?.setAttribute('hidden', '');
}

function showResultsByToken(token) {
  showScreen('scr-loading');
  $('loading-msg').textContent = t('loading.loading_report');
  return renderResultsFromToken(token);
}

const reportToken = getQueryParam('r');
const resultToken = getQueryParam('t');

$('btn-start').disabled = true;

if (reportToken) showResultsByToken({ report_token: reportToken });
else if (resultToken) showResultsByToken({ access_token: resultToken });
else init();