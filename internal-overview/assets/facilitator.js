// ─── config ────────────────────────────────────────────────────────

const SUPABASE_FUNCTIONS_BASE = 'https://supabase-andqfive-u72683.vm.elestio.app/functions/v1';

const SCALE = 1.5;
function s(n) { return n * SCALE; }

const TA = {x: 250 * SCALE, y: 130 * SCALE};
const TB = {x: 48  * SCALE, y: 360 * SCALE};
const TC = {x: 452 * SCALE, y: 360 * SCALE};
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

function pointOnEllipse(cx, cy, rx, ry, deg) {
  const rad = (deg * Math.PI) / 180;
  return {
    x: cx + rx * Math.cos(rad),
    y: cy + ry * Math.sin(rad)
  };
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

// ─── state ─────────────────────────────────────────────────────────

let currentReport = null;
let selectedIndustryLabel = null;  // facilitator view doesn't collect these,
let selectedSizeLabel = null;      // but renderReportMetaLine references them
let selectedIndustry = null;
let selectedSize = null;

// ─── entrypoint ────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  const token = getFacilitatorTokenFromURL();
  if (!token) {
    showError('No facilitator token in URL.');
    return;
  }
  loadAndRender(token);
});

function getFacilitatorTokenFromURL() {
  // Path is /facilitator/report/<token> or ?t=<token> depending on your routing
  const pathMatch = location.pathname.match(/\/facilitator\/report\/([^/?#]+)/);
  if (pathMatch) return pathMatch[1];
  const params = new URLSearchParams(location.search);
  return params.get('t');
}

// ─── fetch ─────────────────────────────────────────────────────────

async function loadAndRender(token) {
  try {
    const data = await fetchFacilitatorReport(token);
    currentReport = data;
    selectedIndustryLabel = data.submission?.industry_label || null;
    selectedIndustry = data.submission?.industry || null;
    selectedSizeLabel = data.submission?.size_label || null;
    selectedSize = data.submission?.size || null;
    renderFacilitatorHeader(data);
    renderReportForFacilitator(data);
  } catch (err) {
    console.error('load failed', err);
    showError(err.message || 'Could not load report.');
  }
}

async function fetchFacilitatorReport(token) {
  const response = await fetch(`${SUPABASE_FUNCTIONS_BASE}/facilitator-report`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ facilitator_token: token }),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Report not available.');
  }
  return data;
  // Expected shape:
  // {
  //   report: { open, locked },   // both always present for facilitator
  //   participant: { name, email, submitted_at },
  //   booking: { scheduled_time, facilitator_name, facilitator_email },
  //   variant: { key, ... },
  //   prep: { ai_content, notes, ... } | null   // null until v2
  // }
}

// ─── facilitator header ────────────────────────────────────────────

function renderFacilitatorHeader(data) {
  const el = document.getElementById('facilitator-header');
  if (!el) return;

  const p = data.participant || {};
  const b = data.booking || {};

  el.innerHTML = `
    <div class="fac-header">
      <div class="fac-header__participant">
        <div class="fac-header__label">Participant</div>
        <div class="fac-header__name">${esc(p.name || p.email || 'Unknown')}</div>
        <div class="fac-header__email">${esc(p.email || '')}</div>
      </div>
      <div class="fac-header__booking">
        <div class="fac-header__label">Debrief scheduled</div>
        <div class="fac-header__time">${esc(formatBookingTime(b.scheduled_time))}</div>
      </div>
      <div class="fac-header__submission">
        <div class="fac-header__label">Assessment submitted</div>
        <div class="fac-header__time">${esc(formatBookingTime(p.submitted_at))}</div>
      </div>
    </div>
  `;
}

function formatBookingTime(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('en-GB', {
      dateStyle: 'full',
      timeStyle: 'short',
      timeZone: 'Europe/Berlin',
    });
  } catch {
    return iso;
  }
}

// ─── main render (facilitator variant of renderServerReport) ──────

function renderReportForFacilitator(data) {
  const open = data.report.open;
  const locked = data.report.locked;
  const res = getScoresFromOpenReport(open);
  const quotientData = open.quotients.slice().sort((a, b) => b.score - a.score);

  // Same body as questionnaire.js renderOpenReport
  renderOpenReport(open, res, quotientData);

  // Facilitator always sees the locked (action) sections — no gate.
  if (locked) {
    renderUnlockedSections(locked, open);
    const unlockedEl = document.getElementById('focus-section-unlocked');
    if (unlockedEl) unlockedEl.hidden = false;
  }

  // Hide the participant-facing "book to unlock" section entirely.
  const lockedCta = document.getElementById('focus-section-locked');
  if (lockedCta) lockedCta.hidden = true;

  // v2: renderAiPrep(data.prep);
  // v2: renderFacilitatorNotes(data.prep);
}


function showError(message) {
  const content = document.getElementById('results-content');
  if (content) {
    content.innerHTML = `
      <div class="results-error">
        <h2>Report unavailable</h2>
        <p>${esc(message)}</p>
      </div>`;
  }
}

function escapeHtml(unsafe) {
  return String(unsafe ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
function esc(s) {
  return s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
}

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function nextFrame() {
  return new Promise(resolve => requestAnimationFrame(() => resolve()));
}

function capitalizeFirst(value) {
  if (!value) return '';
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function splitFirstSentence(text) {
  const match = text.match(/^(.+?[.!?])(\s+[\s\S]*)?$/);

  return {
    heading: match ? match[1] : text,
    body: match && match[2] ? match[2].trim() : ''
  };
}

function formatList(items) {
  if (items.length === 1) return items[0];
  if (items.length === 2) return items[0] + ' and ' + items[1];

  return items.slice(0, -1).join(', ') + ', and ' + items[items.length - 1];
}
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
function formatLevel(score) {
  const level = getDebriefLevel(score);

  const labels = {
    risk: 'At risk',
    developing: 'Developing',
    building: 'Building',
    strong: 'Strong'
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
function getScoresFromOpenReport(open) {
  return {
    R: open.scores.resilience,
    P: open.scores.preparedness,
    O: open.scores.overall,
    dim: open.scores.dimensions
  };
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
    risk: 'At risk',
    developing: 'Developing',
    building: 'Building',
    ready: 'Ready'
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
}

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
  const modes = buildModeCards(results);

  return `
    <div class="mode-grid">
      ${modes.map(renderModeCard).join('')}
    </div>
  `;
}

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

  if (chips.length === 2) {
    return chips[0] + ' <span class="subtitle-and">and</span> ' + chips[1];
  }

  return chips.slice(0, -1).join(', ') +
    ', <span class="subtitle-and">and</span> ' +
    chips[chips.length - 1];
}

function renderServerFocusSubtitle(focusActions) {
  const items = focusActions.subtitleItems || [];

  if (!items.length) return '';

  const chipHtml = renderFocusChipList(items);

  const intro = items.length === 1
    ? 'These come directly from your lowest-scoring quotient - '
    : 'These come directly from your two lowest-scoring quotients - ';

  return `
    <p class="page-sub" style="color:#555555 !important; line-height: 1.75; font-size: 13px; max-width: 755px; margin-bottom: 5%;">
      ${intro}${chipHtml}.
      They apply whether you are a people manager, an individual contributor, or both.
    </p>
  `;
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
  const items = focusActions.subtitleItems || [];
  const quotientChips = renderFocusChipList(items);

  const finalSentence = quotientChips
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
    risk: 'This is your most immediate ' + buildLabel + ' opportunity.',
    developing: 'Strengthening this builds your ' + buildLabel + ' foundation.',
    building: 'These are current strengths to repeat, and make more dependable.'
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
          <p class="focus-question-item">${escapeHtml(item.text)}</p>
        `;
      }).join('')}
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
function renderUnlockedSections(locked, open) {
  const setHTML = (id, html) => {
    const el = document.getElementById(id);
    if (el) el.innerHTML = html;
  };

  setHTML('focus-actions-wrapper', renderFocusActionsSection(locked));
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