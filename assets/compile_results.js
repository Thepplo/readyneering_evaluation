/*    const QUOTIENT_ICONS = {
  vitality: 'assets/images/q-vitality.svg',
  emotion: 'assets/images/q-emotion.svg',
  mind: 'assets/images/q-mind.svg',
  execution: 'assets/images/q-execution.svg',
  alignment: 'assets/images/q-alignment.svg'
}; */

   const sampleData = {
      ok: true,
      batch_id: 'demo-batch-001',
      session: {
        batch_id: 'demo-batch-001',
        submission_count: 14,
        industries: {
          Healthcare: 6,
          Finance: 4,
          Technology: 4
        },
        sources: {
          web: 9,
          facilitated: 5
        },
        averages: {
          overall_score: 10.4,
          preparedness_score: 3.3,
          resilience_score: 3.5,
          vitality_overall: 64.2,
          emotion_overall: 69.7,
          mind_overall: 73.8,
          execution_overall: 76.1,
          alignment_overall: 72.4
        },
        medians: {
          overall_score: 10.1,
          preparedness_score: 75.8,
          resilience_score: 67.2,
          vitality_overall: 64.6,
          emotion_overall: 70.3,
          mind_overall: 73.2,
          execution_overall: 77.5,
          alignment_overall: 71.8
        },
        std_devs: {
          overall_score: 1,
          preparedness_score: 0.1,
          resilience_score: 0.1,
          vitality_overall: 0.3,
          emotion_overall: 0.4,
          mind_overall: 0.7,
          execution_overall: 0.4,
          alignment_overall: 0.3
        },
        distributions: {
          overall_band: {
            'Strategic Readiness': 4,
            'Functional but Vulnerable': 7,
            'Reactive Mode': 3
          }
        },
        strongest_numeric_score: {
          score_key: 'execution_overall',
          average: 76.1
        },
        weakest_numeric_score: {
          score_key: 'vitality_overall',
          average: 64.2
        }
      }
    };

    const els = {
      batchIdInput: document.getElementById('batchIdInput'),
      loadButton: document.getElementById('loadButton'),
      demoButton: document.getElementById('demoButton'),
      //metricBatchId: document.getElementById('metricBatchId'),
      metricCount: document.getElementById('metricCount'),
      //metricOverall: document.getElementById('metricOverall'),
      metricPattern: document.getElementById('metricPattern'),
      preparednessValue: document.getElementById('preparednessValue'),
      resilienceValue: document.getElementById('resilienceValue'),
      preparednessBar: document.getElementById('preparednessBar'),
      resilienceBar: document.getElementById('resilienceBar'),
      overviewNote: document.getElementById('overviewNote'),
      overviewHighlight: document.getElementById('overviewHighlight'),
      industriesPills: document.getElementById('industriesPills'),
      sourcesPills: document.getElementById('sourcesPills'),
      strengthsList: document.getElementById('strengthsList'),
      constraintsList: document.getElementById('constraintsList'),
      distributionList: document.getElementById('distributionList'),
      averagesTableBody: document.getElementById('averagesTableBody'),
      preparednessRing: document.getElementById('preparednessRing'),
      resilienceRing: document.getElementById('resilienceRing'),
      overallRing: document.getElementById('overallRing'),
      signalsDiv: document.getElementById('signal-list-wrap'),
      qGrid: document.getElementById('q-grid-wrapper'),
      varianceWrap: document.getElementById('variance-wrap'),
    };
  document.addEventListener('DOMContentLoaded', () => {
    initAtomAnimation();
  });

  function initAtomAnimation() {
    const wrap = document.getElementById('atom-svg');
    if (!wrap) return;
    fetch('./assets/images/atom-model.svg')
      .then(res => res.text())
      .then(svg => {
        wrap.innerHTML = svg;

        gsap.to("#atom-svg .atom-path-1", {
          opacity: 0.45,
          duration: 4.5,
          ease: "sine.inOut",
          repeat: -1,
          yoyo: true,
          stagger: 0.6
        });
        gsap.to("#atom-svg .atom-path-2", {
          opacity: 0.45,
          duration: 5.5,
          ease: "sine.inOut",
          repeat: -1,
          yoyo: true,
          stagger: 0.6
        });
        gsap.to("#atom-svg .atom-path-3", {
          opacity: 0.45,
          duration: 2.5,
          ease: "sine.inOut",
          repeat: -1,
          yoyo: true,
          stagger: 0.6
        });
        gsap.to("#atom-svg .atom-path-4", {
          opacity: 0.45,
          duration: 6.5,
          ease: "sine.inOut",
          repeat: -1,
          yoyo: true,
          stagger: 0.6
        });
        gsap.to("#atom-svg .atom-core-1", {
          scale: 1.02,
          duration: 3.7,
          ease: "sine.inOut",
          repeat: -1,
          yoyo: true,
          transformOrigin: "center center",
          transformBox: "fill-box"
        });

        gsap.to("#atom-svg .atom-core-2", {
          scale: 1.03,
          duration: 4.1,
          ease: "sine.inOut",
          repeat: -1,
          yoyo: true,
          transformOrigin: "center center",
          transformBox: "fill-box"
        });

        gsap.to("#atom-svg .atom-core-3", {
          scale: 1.022,
          duration: 3.9,
          ease: "sine.inOut",
          repeat: -1,
          yoyo: true,
          transformOrigin: "center center",
          transformBox: "fill-box"
        });

      });
  }
    function formatNumber(value) {
      if (typeof value !== 'number' || Number.isNaN(value)) return '—';
      return value.toFixed(1);
    }

    function titleize(key) {
      return key
        .replace(/_/g, ' ')
        .replace(/\b\w/g, c => c.toUpperCase());
    }

    function toEntriesSorted(obj = {}, direction = 'desc') {
      return Object.entries(obj).sort((a, b) => {
        const av = a[1];
        const bv = b[1];
        return direction === 'asc' ? av - bv : bv - av;
      });
    }

    function renderPills(container, obj = {}) {
      container.innerHTML = '';
      const entries = Object.entries(obj);

      if (!entries.length) {
        container.innerHTML = '<div class="empty" style="width:100%;">No data</div>';
        return;
      }

      for (const [key, value] of entries) {
        const pill = document.createElement('div');
        pill.className = 'pill';
        pill.textContent = `${key}: ${value}`;
        container.appendChild(pill);
      }
    }

    function renderList(container, entries, valueFormatter = v => v) {
      container.innerHTML = '';
      if (!entries.length) {
        container.innerHTML = '<li><span>No data</span><strong>—</strong></li>';
        return;
      }

      for (const [key, value] of entries) {
        const li = document.createElement('li');
        li.innerHTML = `<span>${titleize(key)}</span><strong>${valueFormatter(value)}</strong>`;
        container.appendChild(li);
      }
    }

    function derivePattern(preparedness, resilience) {
      if (typeof preparedness !== 'number' || typeof resilience !== 'number') return 'Unknown';
      const diff = preparedness - resilience;
      if (Math.abs(diff) < 3) return 'Balanced';
      return diff > 0 ? 'Preparedness-heavy' : 'Resilience-heavy';
    }

    function buildHighlight(preparedness, resilience, strongest, weakest) {
      const pattern = derivePattern(preparedness, resilience).toLowerCase();
      const strongestLabel = strongest ? titleize(strongest.score_key) : 'No clear strength yet';
      const weakestLabel = weakest ? titleize(weakest.score_key) : 'No clear constraint yet';

      return `This batch reads as ${pattern}. The strongest shared area is ${strongestLabel}, while ${weakestLabel} looks like the main collective constraint.`;
    }

    function renderAveragesTable(session) {
      const averages = session.averages || {};
      const medians = session.medians || {};
      const stdDevs = session.std_devs || {};
      const keys = Object.keys(averages);

      if (!keys.length) {
        els.averagesTableBody.innerHTML = '<tr><td colspan="4"><div class="empty">No numeric scores available.</div></td></tr>';
        return;
      }

      els.averagesTableBody.innerHTML = keys
        .sort((a, b) => (averages[b] ?? 0) - (averages[a] ?? 0))
        .map(key => `
          <tr>
            <td>${titleize(key)}</td>
            <td>${formatNumber(averages[key])}</td>
            <td>${formatNumber(medians[key])}</td>
            <td>${formatNumber(stdDevs[key])}</td>
          </tr>
        `)
        .join('');
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
    function makeVarianceHaloSvg(cx, cy, baseRadius, stdDev, color) {
      const scale = 35;
      const radius = baseRadius + stdDev * scale;

      return `
        <circle
          cx="${cx}"
          cy="${cy}"
          r="${radius}"
          fill="${color}"
          fill-opacity="0.08"
        />
        <circle
          cx="${cx}"
          cy="${cy}"
          r="${radius * 0.82}"
          fill="${color}"
          fill-opacity="0.04"
        />
      `;
    }
    function pointOnEllipse(cx, cy, rx, ry, deg) {
      const rad = (deg * Math.PI) / 180;
      return {
        x: cx + rx * Math.cos(rad),
        y: cy + ry * Math.sin(rad)
      };
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

      const resilienceCenterX = resiliencePos.x;
      const resilienceCenterY = resiliencePos.y;

      const preparednessCenterX = preparednessPos.x;
      const preparednessCenterY = preparednessPos.y;

      const overallCenterX = orbitCx;
      const overallCenterY = orbitCy - 5;
      const smallHaloBase = 32;
      const centerHaloBase = 48;

      function ellipsePointDeg(cx, cy, rx, ry, deg) {
        const a = deg * Math.PI / 180;
        return {
          x: cx + rx * Math.cos(a),
          y: cy + ry * Math.sin(a)
        };
      }

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
          ${makeVarianceHaloSvg(
            resilienceCenterX,
            resilienceCenterY,
            smallHaloBase,
            res.std_devs.resilience_score,
            '#534AB7'
          )}

          ${makeVarianceHaloSvg(
            preparednessCenterX,
            preparednessCenterY,
            smallHaloBase,
            res.std_devs.preparedness_score,
            '#1D9E75'
          )}

          ${makeVarianceHaloSvg(
            overallCenterX,
            overallCenterY,
            centerHaloBase,
            res.std_devs.overall_score,
            '#770136'
          )}
          <foreignObject x="${resilienceX}" y="${resilienceY}" width="${smallSize}" height="${smallSize}">
            <div xmlns="http://www.w3.org/1999/xhtml" class="ring-node">
              ${makeRing(res.averages.resilience_score, 0, 5, '#534AB7', '#E8E7E0', smallSize)}
            </div>
          </foreignObject>

          <text x="${resiliencePos.x}" y="${resiliencePos.y + smallSize / 2 + 18}" text-anchor="middle" class="score-label">
            AVG. RESILIENCE
          </text>

          <foreignObject x="${preparednessX}" y="${preparednessY}" width="${smallSize}" height="${smallSize}">
            <div xmlns="http://www.w3.org/1999/xhtml" class="ring-node">
              ${makeRing(res.averages.preparedness_score, 0, 5, '#1D9E75', '#E8E7E0', smallSize)}
            </div>
          </foreignObject>

          <text x="${preparednessPos.x}" y="${preparednessPos.y + smallSize / 2 + 18}" text-anchor="middle" class="score-label">
            AVG. PREPAREDNESS
          </text>

          <foreignObject x="${centerX}" y="${centerY}" width="${centerSize}" height="${centerSize}">
            <div xmlns="http://www.w3.org/1999/xhtml" class="ring-node ring-node-center">
              ${makeRing(res.averages.overall_score, 0, 25, '#770136', '#7701363f', centerSize)}
            </div>
          </foreignObject>

          <text x="${orbitCx}" y="${centerY + centerSize + 18}" text-anchor="middle" class="score-label center-label">
            AVG. OVERALL READINESS
          </text>
          <text x="${orbitCx}" y="${centerY + centerSize + 34}" text-anchor="middle" class="score-sub center-sub">
            Resilience × Preparedness
          </text>

        </svg>
      `;
    }

    function titleCase(str) {
      if (!str) return '';
      return str.charAt(0).toUpperCase() + str.slice(1);
    }

    function renderSignalLead(signal) {
      if (!signal.key) return '';
      return `<span class="q-chip ${signal.key}">${titleCase(signal.key)}</span> `;
    }

    function renderExecutiveSignals(executiveSignals) {
      const wrap = els.signalsDiv;
      const items = executiveSignals?.items || [];

      if (!items.length) {
        wrap.innerHTML = `
          <div class="signal-empty">
            No strong session-level signals were detected yet.
          </div>
        `;
        return;
      }

      wrap.innerHTML = items.map(signal => `
        <div class="signal-item ${signal.type}">
          <div class="signal-marker"></div>
          <div class="signal-body">
            <div class="signal-type">${signal.title}</div>
            <div class="signal-text">
              ${renderSignalLead(signal)}${signal.message}
            </div>
          </div>
        </div>
      `).join('');
    }
    function getAggregatePatternLine(q) {
      if (q.average >= 3.35) {
        return `${q.key} is a relatively strong shared dimension in this cohort.`;
      }
      if (q.average >= 2.75) {
        return `${q.key} is present, but not consistently strong across the group.`;
      }
      return `${q.key} is emerging as a weaker shared dimension in this cohort.`;
    }
    function getConsistencyLine(q) {
      if (q.consistency === 'Consistent') {
        return 'Experience is relatively consistent across respondents.';
      }
      if (q.consistency === 'Mixed') {
        return 'Experience is somewhat uneven across respondents.';
      }
      return 'Experience varies widely across respondents.';
    }

    function getImbalanceLine(q) {
      if (q.pattern === 'resilience-heavy') {
        return 'This dimension leans more toward resilience than preparedness.';
      }
      if (q.pattern === 'preparedness-heavy') {
        return 'This dimension leans more toward preparedness than resilience.';
      }
      return 'Resilience and preparedness are relatively balanced in this dimension.';
    }

    function getRoleLine(q) {
      if (q.key === 'vitality') {
        return 'Physiological regulation underlying sustained cognitive and emotional capacity';
      }
      if (q.key === 'emotion') {
        return 'Emotional regulation shaping decisions before conscious awareness';
      }
      if (q.key === 'mind') {
        return 'Mental models and pattern recognition under uncertainty';
      }
      if (q.key === 'execution') {
        return 'The biological gap between intention and action';
      }
      return 'Coherence, belonging, and clarity across the system';
    }
    function getBandPercents(bands) {
      const low = bands?.low || 0;
      const mid = bands?.mid || 0;
      const high = bands?.high || 0;
      const total = low + mid + high;

      if (!total) {
        return { low: 0, mid: 0, high: 0 };
      }

      return {
        low: Math.round((low / total) * 100),
        mid: Math.round((mid / total) * 100),
        high: Math.round((high / total) * 100)
      };
    }

    function renderDistribution(bands) {
      const pct = getBandPercents(bands);

      return `
        <div class="q-distribution">
          <div class="q-distribution-labels">
            <span>Low ${pct.low}%</span>
            <span>·</span>
            <span>Mid ${pct.mid}%</span>
            <span>·</span>
            <span>High ${pct.high}%</span>
          </div>

          <div class="q-distribution-bar" aria-label="Distribution bar">
            <div class="q-distribution-seg low" style="width:${pct.low}%"></div>
            <div class="q-distribution-seg mid" style="width:${pct.mid}%"></div>
            <div class="q-distribution-seg high" style="width:${pct.high}%"></div>
          </div>
        </div>
      `;
    }
    function renderQuotientCard(q, isLast) {
      return `
        <div class="q-card ${q.level} ${q.key}">
          <span class="orb orb-1"></span>
          <span class="orb orb-2"></span>
          <span class="orb orb-3"></span>
          <div class="q-head">
            <div class="q-label">${titleCase(q.key)}</div>
            <div class="q-metrics">
              <div class="q-score">${q.average.toFixed(1)}</div>
              <div class="q-bars">
                <div>Avg R ${q.resilience_average.toFixed(1)}</div>
                <span>·</span>
                <div>Avg P ${q.preparedness_average.toFixed(1)}</div>
              </div>
            </div>
          </div>

          <div class="q-role">${getRoleLine(q)}</div>

          <div class="q-section">
            <div class="q-section-label">What this layer shows across the group</div>
            <div class="q-copy">${titleCase(getAggregatePatternLine(q))}</div>
          </div>

          <div class="q-section">
            <div class="q-section-label">Consistency</div>
            <div class="q-copy">${getConsistencyLine(q)}</div>
          </div>

          <div class="q-section">
            <div class="q-section-label">Distribution across cohort</div>
            ${renderDistribution(q.bands)}
          </div>
          <div class="q-section">
            <div class="q-section-label">Distribution</div>
            <div class="q-copy">${getImbalanceLine(q)}</div>
          </div>
        </div>
      `;
    }

    function renderQuotientGrid(quotientsObj) {
      const quotients = Object.values(quotientsObj || {});

      return `
        <div class="q-grid">
          ${quotients.map(function(q, i) {
            return renderQuotientCard(q, i === quotients.length - 1);
          }).join('')}
        </div>
      `;
    }

    function varianceToWidth(stdDev) {
      const max = 0.7;
      return Math.min((stdDev / max) * 100, 100);
    }


    function renderVarianceSection(quotients) {
      const sorted = Object.values(quotients)
        .sort((a, b) => b.std_dev - a.std_dev);

      return `
        <div class="variance-list">
          ${sorted.map(q => `
            <div class="variance-row ${q.consistency}">
              <div class="variance-label"><span class="q-chip ${q.key}"> ${titleCase(q.key)}</div>
              <div class="variance-bar">
                <div class="variance-fill" style="width:${varianceToWidth(q.std_dev)}%"></div>
              </div>
              <div class="variance-meta">${q.consistency}</div>
            </div>
          `).join('')}
        </div>
      `;
    }

    function renderSession(payload) {
      const session = payload.session || {};
      const averages = session.averages || {};
      const preparedness = averages.preparedness_score;
      const resilience = averages.resilience_score;
      const overall = averages.overall_score;
      const strongest = session.strongest_numeric_score;
      const weakest = session.weakest_numeric_score;
      const pattern = derivePattern(preparedness, resilience);
      



/*       els.metricBatchId.textContent = payload.mode_insights || session.mode_insights || '—'; 
 */      
      els.metricCount.textContent = session.submission_count ?? '—';
      //els.metricOverall.textContent = formatNumber(overall);
      els.metricPattern.textContent = pattern;

      els.preparednessValue.textContent = formatNumber(preparedness);
      els.resilienceValue.textContent = formatNumber(resilience);

      
/*       els.preparednessBar.style.width = `${Math.max(0, Math.min(5, preparedness || 0)) / 5 * 100}%`;
      els.resilienceBar.style.width = `${Math.max(0, Math.min(5, resilience || 0)) / 5 * 100}%`; */

      els.overviewNote.textContent = `${session.submission_count ?? 0} submissions loaded`;
      els.overviewHighlight.textContent = buildHighlight(preparedness, resilience, strongest, weakest);

      renderPills(els.industriesPills, session.industries || {});
      renderPills(els.sourcesPills, session.sources || {});
      renderExecutiveSignals(session.executive_signals);

      els.varianceWrap.innerHTML = renderVarianceSection(session.quotient_insights);

      els.qGrid.innerHTML = renderQuotientGrid(session.quotient_insights);

      renderList(
        els.strengthsList,
        toEntriesSorted(averages, 'desc').slice(0, 5),
        v => formatNumber(v)
      );

      renderList(
        els.constraintsList,
        toEntriesSorted(averages, 'asc').slice(0, 5),
        v => formatNumber(v)
      );
      const min = 0;
      const max = 5;

/*       els.preparednessRing.innerHTML = makeRing(
        preparedness,
        min,
        max,
        '#2ecc71',
        '#e5e7eb',
        120
      );

      els.resilienceRing.innerHTML = makeRing(
        resilience,
        min,
        max,
        '#6366f1',
        '#e5e7eb',
        120
      );

      els.overallRing.innerHTML = makeRing(
        overall,
        min,
        max,
        '#9b1c31',
        '#e5e7eb',
        140
      ); */

      renderOrbit(session)
      const firstDistribution = Object.entries(session.distributions || {})[0]?.[1] || {};
      renderList(els.distributionList, Object.entries(firstDistribution), v => v);

      renderAveragesTable(session);
    }

    async function fetchBatchResults(batchId) {
      const response = await fetch(
        `/assessments/getBatchResults?batch_id=${encodeURIComponent(batchId)}`
      );

      const text = await response.text();
      console.log('status:', response.status);
      console.log('body:', text);

      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}: ${text}`);
      }

      return JSON.parse(text);
    }

    els.loadButton.addEventListener('click', async () => {
      const batchId = els.batchIdInput.value.trim();
      if (!batchId) return;

      els.overviewNote.textContent = 'Loading...';

      try {
        const data = await fetchBatchResults(batchId);
        renderSession(data);
      } catch (error) {
        console.error(error);
        els.overviewNote.textContent = 'Load failed';
        els.overviewHighlight.textContent = 'Could not load this batch yet. Check the endpoint path and returned JSON shape.';
      }
    });

    els.demoButton.addEventListener('click', () => {
      renderSession(sampleData);
    });

    renderSession(sampleData);