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
          overall_score: 71.4,
          preparedness_score: 74.9,
          resilience_score: 67.8,
          vitality_overall: 64.2,
          emotion_overall: 69.7,
          mind_overall: 73.8,
          execution_overall: 76.1,
          alignment_overall: 72.4
        },
        medians: {
          overall_score: 72.1,
          preparedness_score: 75.8,
          resilience_score: 67.2,
          vitality_overall: 64.6,
          emotion_overall: 70.3,
          mind_overall: 73.2,
          execution_overall: 77.5,
          alignment_overall: 71.8
        },
        std_devs: {
          overall_score: 8.7,
          preparedness_score: 7.9,
          resilience_score: 10.8,
          vitality_overall: 9.6,
          emotion_overall: 8.4,
          mind_overall: 7.5,
          execution_overall: 8.2,
          alignment_overall: 9.1
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
      metricBatchId: document.getElementById('metricBatchId'),
      metricCount: document.getElementById('metricCount'),
      metricOverall: document.getElementById('metricOverall'),
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
      averagesTableBody: document.getElementById('averagesTableBody')
    };

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

    function renderSession(payload) {
      const session = payload.session || {};
      const averages = session.averages || {};
      const preparedness = averages.preparedness_score;
      const resilience = averages.resilience_score;
      const overall = averages.overall_score;
      const strongest = session.strongest_numeric_score;
      const weakest = session.weakest_numeric_score;
      const pattern = derivePattern(preparedness, resilience);

      els.metricBatchId.textContent = payload.batch_id || session.batch_id || '—';
      els.metricCount.textContent = session.submission_count ?? '—';
      els.metricOverall.textContent = formatNumber(overall);
      els.metricPattern.textContent = pattern;

      els.preparednessValue.textContent = formatNumber(preparedness);
      els.resilienceValue.textContent = formatNumber(resilience);
      els.preparednessBar.style.width = `${Math.max(0, Math.min(100, preparedness || 0))}%`;
      els.resilienceBar.style.width = `${Math.max(0, Math.min(100, resilience || 0))}%`;

      els.overviewNote.textContent = `${session.submission_count ?? 0} submissions loaded`;
      els.overviewHighlight.textContent = buildHighlight(preparedness, resilience, strongest, weakest);

      renderPills(els.industriesPills, session.industries || {});
      renderPills(els.sourcesPills, session.sources || {});

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

      const firstDistribution = Object.entries(session.distributions || {})[0]?.[1] || {};
      renderList(els.distributionList, Object.entries(firstDistribution), v => v);

      renderAveragesTable(session);
    }

    async function fetchBatchResults(batchId) {
      const response = await fetch(`functions/assessments/getBatchResults?batch_id=${encodeURIComponent(batchId)}`);
      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }
      return response.json();
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