const SUPABASE_FUNCTIONS_BASE = 'https://supabase-andqfive-u72683.vm.elestio.app/functions/v1';
const AGGREGATE_ENDPOINT = '/api/aggregate';

// ---- State -------------------------------------------------
let DATA = null;
let CURRENT = 0;

const $ = (id) => document.getElementById(id);

function show(id) {
  document.querySelectorAll('.deck-overlay').forEach(o => o.classList.remove('active'));
  if (id) $(id).classList.add('active');
}

function error(msg) {
  $('deck-error-msg').textContent = msg;
  show('deck-error');
}

// ---- Data fetch --------------------------------------------
function parseQuery() {
  const p = new URLSearchParams(window.location.search);
  return {
    variants: p.get('variants')?.split(',').map(s => s.trim()).filter(Boolean) ?? null,
    date_from: p.get('date_from') || null,
    date_to: p.get('date_to') || null,
    instrument_version_id: p.get('instrument_version_id') || null,
    min_n: p.get('min_n') ? Number(p.get('min_n')) : 3,
  };
}

async function fetchAggregate(filters) {
  const body = {};
  if (filters.variants) body.variants = filters.variants;
  if (filters.date_from) body.date_from = filters.date_from;
  if (filters.date_to) body.date_to = filters.date_to;
  if (filters.instrument_version_id) body.instrument_version_id = filters.instrument_version_id;
  if (filters.min_n) body.min_n = filters.min_n;

  const r = await fetch(AGGREGATE_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!r.ok) {
    const err = await r.json().catch(() => ({}));
    throw new Error(err.error || `Request failed (${r.status})`);
  }
  return r.json();
}

// ============================================================
// Slide definitions
// Each slide is { id, title, render(data) -> HTML string }
// To add/remove a slide, edit this array. Nothing else changes.
// ============================================================

const SLIDES = [

  {
    id: 'cover',
    title: 'Cover',
    render: (d) => `
      <article class="slide slide-cover">
        <p class="slide-kicker">Highest Performing Teams · Team Debrief</p>
        <h1>${d.filters_applied.variants?.[0] ?? 'Team report'}</h1>
        <p class="slide-meta">
          ${d.cohort.n} respondents
          ${d.cohort.first_submission ? `· first submission ${formatDate(d.cohort.first_submission)}` : ''}
        </p>
      </article>
    `,
  },

  {
    id: 'team-type',
    title: 'Team type',
    render: (d) => {
      const dist = d.distributions.team_type || {};
      const sorted = Object.entries(dist).sort((a, b) => b[1] - a[1]);
      const modal = sorted[0]?.[0] ?? null;
      const total = sorted.reduce((n, [, c]) => n + c, 0);

      return `
        <article class="slide slide-team-type">
          <p class="slide-kicker">Where this team sits</p>
          <h2>${modal ? labelTeamType(modal) : 'No clear team type'}</h2>
          <p class="slide-lede">
            ${sorted.length > 1
              ? `${sorted[0][1]} of ${total} respondents see the team as ${labelTeamType(modal)}.`
              : `All respondents see the team as ${labelTeamType(modal)}.`}
          </p>
          ${renderDistributionBars(dist, labelTeamType)}
        </article>
      `;
    },
  },

  {
    id: 'readiness',
    title: 'Readiness',
    render: (d) => {
      const r = d.numeric.readiness ?? { mean: 0, std: null, min: 0, max: 0 };
      const pct = (r.mean * 100).toFixed(0);
      return `
        <article class="slide slide-readiness">
          <p class="slide-kicker">Readiness Index</p>
          <div class="slide-bignum">
            <span class="num">${pct}<small>%</small></span>
            <span class="num-spread">${r.std !== null ? `± ${(r.std * 100).toFixed(0)}%` : ''}</span>
          </div>
          <p class="slide-lede">${readinessNarrative(r.mean)}</p>
          <p class="slide-detail">
            Range across respondents:
            ${(r.min * 100).toFixed(0)}% to ${(r.max * 100).toFixed(0)}%.
            ${r.std !== null && r.std > 0.15
              ? 'The team holds noticeably different views — worth surfacing.'
              : 'The teams view is broadly consistent.'}
          </p>
        </article>
      `;
    },
  },

  {
    id: 'r-vs-p',
    title: 'Resilience vs Preparedness',
    render: (d) => {
      const res = d.numeric.resilience_index ?? { mean: 0 };
      const prep = d.numeric.preparedness_index ?? { mean: 0 };
      const delta = res.mean - prep.mean;
      const lead = Math.abs(delta) < 0.08
        ? 'Balanced'
        : delta > 0 ? 'Resilience leads' : 'Preparedness leads';

      return `
        <article class="slide slide-r-vs-p">
          <p class="slide-kicker">Two foundations of performance</p>
          <div class="r-vs-p-grid">
            <div>
              <h3>Resilience</h3>
              <p class="num">${(res.mean * 100).toFixed(0)}%</p>
              <p class="caption">Capacity to absorb pressure and recover. Built on Vitality + Emotion.</p>
            </div>
            <div>
              <h3>Preparedness</h3>
              <p class="num">${(prep.mean * 100).toFixed(0)}%</p>
              <p class="caption">Structural readiness to perform. Built on Execution + Alignment.</p>
            </div>
          </div>
          <p class="slide-lede slide-conclusion">${lead}</p>
        </article>
      `;
    },
  },

  ...['vitality', 'emotion', 'mind', 'execution', 'alignment'].map(q => ({
    id: `q-${q}`,
    title: capitalize(q),
    render: (d) => {
      const score = d.numeric[`${q}_score`] ?? { mean: 0, std: null, min: 0, max: 0 };
      const pct = d.numeric[`${q}_pct`] ?? { mean: 0 };
      const signalDist = d.distributions[`${q}_signal`] || {};
      const modalSignal = Object.entries(signalDist).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

      return `
        <article class="slide slide-quotient" data-quotient="${q}">
          <p class="slide-kicker">${capitalize(q)} Quotient</p>
          <h2>${capitalize(q)}</h2>
          <div class="quotient-num">
            <span class="num">${(pct.mean * 100).toFixed(0)}<small>%</small></span>
            ${score.std !== null ? `<span class="num-spread">± ${score.std.toFixed(1)} pts</span>` : ''}
          </div>
          <p class="slide-lede">
            ${modalSignal ? `Most respondents read this as <strong>${modalSignal}</strong>.` : ''}
          </p>
          ${Object.keys(signalDist).length > 1 ? renderDistributionBars(signalDist, s => s) : ''}
        </article>
      `;
    },
  })),

  // ---- 10. Primary constraint ----------------------------
  {
    id: 'constraint',
    title: 'Primary constraint',
    render: (d) => {
      const dist = d.distributions.primary_constraint || {};
      const sorted = Object.entries(dist).sort((a, b) => b[1] - a[1]);
      return `
        <article class="slide slide-constraint">
          <p class="slide-kicker">Where the team's energy is best spent</p>
          <h2>${sorted[0]?.[0] ?? 'No clear constraint'}</h2>
          <p class="slide-lede">
            ${sorted.length > 1
              ? `${sorted[0][1]} of ${d.cohort.n} respondents see this as the team's primary constraint.`
              : 'All respondents converge on this constraint.'}
          </p>
          ${renderDistributionBars(dist, s => s)}
        </article>
      `;
    },
  },

  // ---- 11. Closing ---------------------------------------
  {
    id: 'close',
    title: 'Closing',
    render: (d) => `
      <article class="slide slide-close">
        <p class="slide-kicker">For the discussion</p>
        <h2>Where to take this</h2>
        <ul class="close-prompts">
          <li>What does the team agree on? Where do views diverge?</li>
          <li>The primary constraint — does the team accept it as the right focus?</li>
          <li>What would shifting this score by 10% look like in daily behaviour?</li>
        </ul>
        <p class="slide-meta">Cohort: ${d.cohort.n} respondents, instrument v${d.cohort.instrument_version_id ?? '—'}.</p>
      </article>
    `,
  },

];

// ---- Render helpers ----------------------------------------
function renderDistributionBars(dist, labelFn) {
  const total = Object.values(dist).reduce((n, c) => n + c, 0);
  if (total === 0) return '';
  return `
    <div class="dist-bars">
      ${Object.entries(dist)
        .sort((a, b) => b[1] - a[1])
        .map(([k, n]) => `
          <div class="dist-row">
            <span class="dist-label">${labelFn(k)}</span>
            <span class="dist-bar"><span class="dist-bar-fill" style="width:${(n / total * 100).toFixed(1)}%"></span></span>
            <span class="dist-n">${n}</span>
          </div>
        `).join('')}
    </div>
  `;
}

function labelTeamType(key) {
  return {
    working_group: 'Working Group',
    pseudo_team: 'Pseudo-Team',
    potential_team: 'Potential Team',
    real_team: 'Real Team',
    highest_performing: 'Highest-Performing Team',
  }[key] ?? key;
}

function readinessNarrative(mean) {
  if (mean < 0.2)  return 'Low. Both foundations require attention before complex work can be sustained.';
  if (mean < 0.36) return 'Fragile. One of the two foundations is insufficient under pressure.';
  if (mean < 0.56) return 'Building. Readiness is developing but inconsistent.';
  if (mean < 0.75) return 'Solid. The team can take on complex, high-stakes work.';
  return 'Exceptional. The team is operating at full readiness.';
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function capitalize(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ---- Slide navigation --------------------------------------
function renderSlide(idx) {
  CURRENT = Math.max(0, Math.min(SLIDES.length - 1, idx));
  const slide = SLIDES[CURRENT];
  $('slide-stage').innerHTML = slide.render(DATA);
  $('slide-index').textContent = CURRENT + 1;
  $('deck-prev').disabled = CURRENT === 0;
  $('deck-next').disabled = CURRENT === SLIDES.length - 1;
  renderDots();
  window.scrollTo(0, 0);
}

function renderDots() {
  const dots = SLIDES.map((s, i) => `
    <button class="deck-dot${i === CURRENT ? ' is-current' : ''}"
            data-i="${i}" aria-label="Go to ${s.title}"
            title="${s.title}"></button>
  `).join('');
  $('deck-dots').innerHTML = dots;
  $('deck-dots').querySelectorAll('.deck-dot').forEach(b => {
    b.addEventListener('click', () => renderSlide(Number(b.dataset.i)));
  });
}

function next() { renderSlide(CURRENT + 1); }
function prev() { renderSlide(CURRENT - 1); }

// ---- Keyboard ---------------------------------------------
document.addEventListener('keydown', (e) => {
  if (!DATA) return;
  if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ') {
    e.preventDefault(); next();
  } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
    e.preventDefault(); prev();
  } else if (e.key === 'Home') {
    e.preventDefault(); renderSlide(0);
  } else if (e.key === 'End') {
    e.preventDefault(); renderSlide(SLIDES.length - 1);
  }
});

async function init() {
  const filters = parseQuery();
  if (!filters.variants && !filters.date_from) {
    error('Provide at least one filter: ?variants=hpt-test or ?date_from=…');
    return;
  }
  try {
    const data = await fetchAggregate(filters);
    if (data.cohort?.suppressed) {
      error(`Cohort too small to display (n=${data.cohort.n}, minimum ${filters.min_n}).`);
      return;
    }
    DATA = data;

    $('deck-variant').textContent = filters.variants?.join(', ') ?? 'all cohorts';
    $('deck-n').textContent = `n = ${data.cohort.n}`;
    $('slide-total').textContent = SLIDES.length;
    $('deck').hidden = false;
    show(null);

    renderSlide(0);

    $('deck-prev').addEventListener('click', prev);
    $('deck-next').addEventListener('click', next);
  } catch (err) {
    console.error(err);
    error(err.message || 'Failed to load aggregate data.');
  }
}

init();
