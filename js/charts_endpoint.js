/* ============================================================
   ENDPOINT DASHBOARDS (10–15) — CLEAN OPTIMIZED VERSION
   Includes ONLY the 5 most valuable charts:
   1. Employer Readiness Gauge
   2. Applications Submitted
   3. Networking Activity
   4. References Secured
   5. Career Engagement Risk Matrix
============================================================ */


/* =============================================
   1. Employer Readiness Gauge
============================================= */
function buildEmployerReadinessGauge(score) {
  const canvasId = "chart-employer-readiness";
  destroyChart(canvasId);
  const ctx = document.getElementById(canvasId);
  if (!ctx) return;

  ChartRegistry[canvasId] = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: ["Ready", "Remaining"],
      datasets: [{
        data: [score, 100 - score],
        backgroundColor: [C.sage, "#EAEAEA"],
        borderWidth: 0,
        cutout: "75%"
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } }
    }
  });
}



/* =============================================
   2. Applications Submitted
============================================= */
function buildApplicationsChart(rows) {
  const canvasId = "chart-applications";
  destroyChart(canvasId);
  const ctx = document.getElementById(canvasId);
  if (!ctx) return;

  ChartRegistry[canvasId] = new Chart(ctx, {
    type: "bar",
    data: {
      labels: rows.map(r => r.name),
      datasets: [{
        label: "Applications",
        data: rows.map(r => r.count),
        backgroundColor: C.blue,
        borderRadius: 6
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: {
        y: { beginAtZero: true },
        x: { grid: { display: false } }
      }
    }
  });
}



/* =============================================
   3. Networking Activity Histogram
============================================= */
function buildNetworkingHistogram(values) {
  const canvasId = "chart-networking";
  destroyChart(canvasId);
  const ctx = document.getElementById(canvasId);
  if (!ctx) return;

  ChartRegistry[canvasId] = new Chart(ctx, {
    type: "bar",
    data: {
      labels: values.map((_, i) => "P" + (i + 1)),
      datasets: [{
        label: "Connections",
        data: values,
        backgroundColor: C.sageMid,
        borderRadius: 6
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: {
        y: { beginAtZero: true },
        x: { grid: { display: false } }
      }
    }
  });
}



/* =============================================
   4. References Secured
============================================= */
function buildReferencesDistribution(rows) {
  const canvasId = "chart-references";
  destroyChart(canvasId);
  const ctx = document.getElementById(canvasId);
  if (!ctx) return;

  ChartRegistry[canvasId] = new Chart(ctx, {
    type: "bar",
    data: {
      labels: rows.map(r => r.name),
      datasets: [{
        label: "References",
        data: rows.map(r => r.count),
        backgroundColor: C.blue,
        borderRadius: 6
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: {
        y: { beginAtZero: true },
        x: { grid: { display: false } }
      }
    }
  });
}



/* =============================================
   5. Career Engagement Risk Matrix
============================================= */
function buildRiskMatrix(matrix) {
  const canvasId = "chart-risk-matrix";
  destroyChart(canvasId);
  const ctx = document.getElementById(canvasId);
  if (!ctx) return;

  ChartRegistry[canvasId] = new Chart(ctx, {
    type: "bubble",
    data: {
      datasets: matrix.map(m => ({
        label: m.name,
        data: [{
          x: m.communication,
          y: m.search,
          r: m.risk * 4
        }],
        backgroundColor:
          m.risk === 3 ? C.danger :
          m.risk === 2 ? C.warn :
          C.sage
      }))
    },
    options: {
      responsive: true,
      scales: {
        x: {
          title: { display: true, text: "Responsiveness" },
          min: 0, max: 100
        },
        y: {
          title: { display: true, text: "Job Search Activity" },
          min: 0, max: 100
        }
      }
    }
  });
}
