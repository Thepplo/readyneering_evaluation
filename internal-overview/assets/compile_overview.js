    /*
      Expected backend response shape:

      {
        ok: true,
        rows: [
          {
            batch_id: "demo-batch-001",
            submission_count: 24,
            first_submitted_at: "2026-05-01T10:00:00Z",
            last_submitted_at: "2026-05-16T16:30:00Z",
            industries: { "SaaS": 12, "Finance": 8 },
            sizes: { "11-50": 10, "51-200": 14 },
            sources: { "LinkedIn": 11, "Partner": 13 },
            averages: {
              resilience: 3.7,
              preparedness: 3.2,
              overall: 72
            },
            operating_pattern: "Resilience-heavy"
          }
        ],
        filters: {
          batch_ids: ["demo-batch-001"],
          industries: ["SaaS", "Finance"],
          sizes: ["11-50", "51-200"],
          sources: ["LinkedIn", "Partner"]
        }
      }
    */

    const OVERVIEW_ENDPOINT = "/assessments/getResultsOverview";

    const sampleData = {
      ok: true,
      rows: [
        {
          batch_id: "demo-batch-001",
          submission_count: 24,
          first_submitted_at: "2026-05-01T10:00:00Z",
          last_submitted_at: "2026-05-16T16:30:00Z",
          industries: { "SaaS": 12, "Finance": 8, "Other": 4 },
          sizes: { "11-50": 10, "51-200": 14 },
          sources: { "LinkedIn": 11, "Partner": 13 },
          averages: { resilience: 3.7, preparedness: 3.2, overall: 72 },
          operating_pattern: "Resilience-heavy"
        },
        {
          batch_id: "leadership-may-2026",
          submission_count: 18,
          first_submitted_at: "2026-05-03T09:15:00Z",
          last_submitted_at: "2026-05-18T14:12:00Z",
          industries: { "Healthcare": 7, "Consulting": 6, "SaaS": 5 },
          sizes: { "1-10": 4, "11-50": 9, "51-200": 5 },
          sources: { "Workshop": 18 },
          averages: { resilience: 3.1, preparedness: 3.6, overall: 68 },
          operating_pattern: "Preparedness-heavy"
        },
        {
          batch_id: "rdy_web_05",
          submission_count: 31,
          first_submitted_at: "2026-04-22T11:20:00Z",
          last_submitted_at: "2026-05-14T12:45:00Z",
          industries: { "Startups": 21, "SaaS": 10 },
          sizes: { "1-10": 20, "11-50": 11 },
          sources: { "Newsletter": 15, "Community": 16 },
          averages: { resilience: 3.4, preparedness: 3.4, overall: 70 },
          operating_pattern: "Balanced"
        }
      ]
    };

    let allRows = [];
    let visibleRows = [];

    const els = {
      heroSearchInput: document.getElementById("heroSearchInput"),
      heroSearchButton: document.getElementById("heroSearchButton"),
      demoButton: document.getElementById("demoButton"),
      searchInput: document.getElementById("searchInput"),
      batchSelect: document.getElementById("batchSelect"),
      industrySelect: document.getElementById("industrySelect"),
      sizeSelect: document.getElementById("sizeSelect"),
      sourceSelect: document.getElementById("sourceSelect"),
      applyButton: document.getElementById("applyButton"),
      resetButton: document.getElementById("resetButton"),
      resultCount: document.getElementById("resultCount"),
      activeFiltersPill: document.getElementById("activeFiltersPill"),
      batchGrid: document.getElementById("batchGrid"),
      emptyState: document.getElementById("emptyState"),
      tableBody: document.getElementById("overviewTableBody"),
      metricBatches: document.getElementById("metricBatches"),
      metricSubmissions: document.getElementById("metricSubmissions"),
      metricResilience: document.getElementById("metricResilience"),
      metricPreparedness: document.getElementById("metricPreparedness")
    };

    function countKeys(obj = {}) {
      return Object.keys(obj).length ? Object.keys(obj).join(", ") : "—";
    }

    function compactCounts(obj = {}, limit = 3) {
      const entries = Object.entries(obj);
      if (!entries.length) return "—";

      const visible = entries
        .slice(0, limit)
        .map(([key, value]) => `${key} (${value})`)
        .join(", ");

      const remaining = entries.length - limit;
      return remaining > 0 ? `${visible}, +${remaining}` : visible;
    }

    function formatDate(value) {
      if (!value) return "—";
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) return "—";
      return date.toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric"
      });
    }

    function formatScore(value) {
      if (value === null || value === undefined || Number.isNaN(Number(value))) return "—";
      return Number(value).toFixed(1);
    }

    function getUniqueValues(rows, getter) {
      return [...new Set(rows.flatMap(row => getter(row)).filter(Boolean))].sort();
    }

    function populateSelect(select, values, defaultLabel) {
      const current = select.value;
      select.innerHTML = `<option value="">${defaultLabel}</option>`;

      values.forEach(value => {
        const option = document.createElement("option");
        option.value = value;
        option.textContent = value;
        select.appendChild(option);
      });

      if (values.includes(current)) select.value = current;
    }

    function populateFilters(rows) {
      populateSelect(els.batchSelect, getUniqueValues(rows, row => [row.batch_id]), "All batches");
      populateSelect(els.industrySelect, getUniqueValues(rows, row => Object.keys(row.industries || {})), "All industries");
      populateSelect(els.sizeSelect, getUniqueValues(rows, row => Object.keys(row.sizes || {})), "All sizes");
      populateSelect(els.sourceSelect, getUniqueValues(rows, row => Object.keys(row.sources || {})), "All sources");
    }

    function rowMatches(row, filters) {
      const haystack = [
        row.batch_id,
        row.operating_pattern,
        ...Object.keys(row.industries || {}),
        ...Object.keys(row.sizes || {}),
        ...Object.keys(row.sources || {})
      ].join(" ").toLowerCase();

      if (filters.search && !haystack.includes(filters.search.toLowerCase())) return false;
      if (filters.batch && row.batch_id !== filters.batch) return false;
      if (filters.industry && !(row.industries || {})[filters.industry]) return false;
      if (filters.size && !(row.sizes || {})[filters.size]) return false;
      if (filters.source && !(row.sources || {})[filters.source]) return false;

      return true;
    }

    function getFilters() {
      return {
        search: els.searchInput.value.trim(),
        batch: els.batchSelect.value,
        industry: els.industrySelect.value,
        size: els.sizeSelect.value,
        source: els.sourceSelect.value
      };
    }

    function getActiveFilterLabels(filters) {
      return Object.entries(filters)
        .filter(([, value]) => value)
        .map(([key, value]) => `${key}: ${value}`);
    }

    function applyFilters() {
      const filters = getFilters();
      visibleRows = allRows.filter(row => rowMatches(row, filters));
      render(visibleRows, filters);
    }

    function renderMetrics(rows) {
      const totalSubmissions = rows.reduce((sum, row) => sum + Number(row.submission_count || 0), 0);

      const weightedAverage = key => {
        const totalWeight = rows.reduce((sum, row) => sum + Number(row.submission_count || 0), 0);
        if (!totalWeight) return null;

        const total = rows.reduce((sum, row) => {
          const score = Number(row.averages && row.averages[key]);
          const weight = Number(row.submission_count || 0);
          return Number.isFinite(score) ? sum + score * weight : sum;
        }, 0);

        return total / totalWeight;
      };

      els.metricBatches.textContent = rows.length;
      els.metricSubmissions.textContent = totalSubmissions;
      els.metricResilience.textContent = formatScore(weightedAverage("resilience"));
      els.metricPreparedness.textContent = formatScore(weightedAverage("preparedness"));
    }

    function renderCards(rows) {
      els.batchGrid.innerHTML = "";

      rows.forEach(row => {
        const card = document.createElement("article");
        card.className = "batch-card";

        const detailUrl = `results.html?batch_id=${encodeURIComponent(row.batch_id)}`;

        card.innerHTML = `
          <div class="batch-card-head">
            <div>
              <div class="batch-id">${row.batch_id}</div>
              <div class="subtle">Last submission: ${formatDate(row.last_submitted_at)}</div>
            </div>
            <div class="batch-status">${row.operating_pattern || "Unclassified"}</div>
          </div>

          <div class="batch-metrics">
            <div class="batch-metric">
              <div class="batch-metric-label">Submissions</div>
              <div class="batch-metric-value">${row.submission_count || 0}</div>
            </div>
            <div class="batch-metric">
              <div class="batch-metric-label">Resilience</div>
              <div class="batch-metric-value">${formatScore(row.averages && row.averages.resilience)}</div>
            </div>
            <div class="batch-metric">
              <div class="batch-metric-label">Preparedness</div>
              <div class="batch-metric-value">${formatScore(row.averages && row.averages.preparedness)}</div>
            </div>
          </div>

          <div class="batch-meta">
            <span class="pill">Industries: ${compactCounts(row.industries)}</span>
            <span class="pill">Sizes: ${compactCounts(row.sizes)}</span>
            <span class="pill">Sources: ${compactCounts(row.sources)}</span>
          </div>

          <div class="batch-card-footer">
            <div class="batch-date">From ${formatDate(row.first_submitted_at)} to ${formatDate(row.last_submitted_at)}</div>
            <a class="view-link" href="${detailUrl}">View details</a>
          </div>
        `;

        els.batchGrid.appendChild(card);
      });

      els.emptyState.style.display = rows.length ? "none" : "block";
    }

    function renderTable(rows) {
      if (!rows.length) {
        els.tableBody.innerHTML = `<tr><td colspan="9"><div class="empty">No matching batches found.</div></td></tr>`;
        return;
      }

      els.tableBody.innerHTML = rows.map(row => {
        const detailUrl = `results.html?batch_id=${encodeURIComponent(row.batch_id)}`;

        return `
          <tr>
            <td><strong>${row.batch_id}</strong><br><span class="subtle">${row.operating_pattern || "Unclassified"}</span></td>
            <td>${row.submission_count || 0}</td>
            <td>${countKeys(row.industries)}</td>
            <td>${countKeys(row.sizes)}</td>
            <td>${countKeys(row.sources)}</td>
            <td>${formatScore(row.averages && row.averages.resilience)}</td>
            <td>${formatScore(row.averages && row.averages.preparedness)}</td>
            <td>${formatDate(row.last_submitted_at)}</td>
            <td class="table-actions"><a href="${detailUrl}">Open</a></td>
          </tr>
        `;
      }).join("");
    }

    function render(rows, filters = getFilters()) {
      const activeLabels = getActiveFilterLabels(filters);

      els.resultCount.textContent = `${rows.length} batch${rows.length === 1 ? "" : "es"} shown`;
      els.activeFiltersPill.textContent = activeLabels.length ? activeLabels.join(" · ") : "No active filters";

      renderMetrics(rows);
      renderCards(rows);
      renderTable(rows);
    }

    function loadRows(payload) {
      allRows = Array.isArray(payload.rows) ? payload.rows : [];
      visibleRows = allRows.slice();

      populateFilters(allRows);
      render(visibleRows, getFilters());
    }

    async function fetchOverview() {
      document.body.classList.add("is-loading");

      try {
        const response = await fetch(OVERVIEW_ENDPOINT, {
          headers: { "Accept": "application/json" }
        });

        if (!response.ok) {
          throw new Error(`Overview endpoint returned ${response.status}`);
        }

        const payload = await response.json();

        if (!payload.ok) {
          throw new Error(payload.error || "Overview endpoint returned ok:false");
        }

        loadRows(payload);
      } catch (error) {
        console.warn("Using sample overview data because live endpoint failed:", error);
        loadRows(sampleData);
      } finally {
        document.body.classList.remove("is-loading");
      }
    }

    els.applyButton.addEventListener("click", applyFilters);

    els.resetButton.addEventListener("click", () => {
      els.searchInput.value = "";
      els.heroSearchInput.value = "";
      els.batchSelect.value = "";
      els.industrySelect.value = "";
      els.sizeSelect.value = "";
      els.sourceSelect.value = "";
      applyFilters();
    });

    els.heroSearchButton.addEventListener("click", () => {
      els.searchInput.value = els.heroSearchInput.value.trim();
      applyFilters();
    });

    els.heroSearchInput.addEventListener("keydown", event => {
      if (event.key === "Enter") {
        els.searchInput.value = els.heroSearchInput.value.trim();
        applyFilters();
      }
    });

    els.searchInput.addEventListener("keydown", event => {
      if (event.key === "Enter") applyFilters();
    });

    els.demoButton.addEventListener("click", () => {
      loadRows(sampleData);
    });

    fetchOverview();