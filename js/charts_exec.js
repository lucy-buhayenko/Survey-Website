/* ============================================================
   Includes:
   1. Workforce Readiness Gauge
   2. Readiness by Cohort
   3. Employment Funnel
============================================================ */


/* =============================================
   1. Workforce Readiness Gauge
============================================= */
function buildReadinessGauge(avgScore) {
  const canvasId = "chart-readiness-gauge";
  destroyChart(canvasId);
  const ctx = document.getElementById(canvasId);
  if (!ctx) return;

  ChartRegistry[canvasId] = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: ["Score", "Remaining"],
      datasets: [{
        data: [avgScore, 100 - avgScore],
        backgroundColor: [C.sage, "#EAEAEA"],
        borderWidth: 0,
        cutout: "78%"
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } }
    }
  });
}



/* =============================================
   2. Readiness by Cohort
============================================= */
function buildCohortComparison(cohortData) {
  const canvasId = "chart-cohort-readiness";
  destroyChart(canvasId);
  const ctx = document.getElementById(canvasId);
  if (!ctx) return;

  ChartRegistry[canvasId] = new Chart(ctx, {
    type: "bar",
    data: {
      labels: cohortData.map(c => c.cohort),
      datasets: [{
        label: "Avg Readiness",
        data: cohortData.map(c => c.avg),
        backgroundColor: C.blue,
        borderRadius: 6,
        borderSkipped: false
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: {
        y: {
          beginAtZero: true,
          max: 100,
          ticks: { callback: v => v + "%" },
          grid: { color: "#EEF1EF" }
        },
        x: { grid: { display: false } }
      }
    }
  });
}



/* =============================================
   3. Employment Funnel (Horizontal Bar)
============================================= */
function buildEmploymentFunnel(stages) {
  const canvasId = "chart-employment-funnel";
  destroyChart(canvasId);
  const ctx = document.getElementById(canvasId);
  if (!ctx) return;

  ChartRegistry[canvasId] = new Chart(ctx, {
    type: "bar",
    data: {
      labels: stages.map(s => s.stage),
      datasets: [{
        label: "Participants",
        data: stages.map(s => s.count),
        backgroundColor: C.sage,
        borderRadius: 6,
        borderSkipped: false
      }]
    },
    options: {
      indexAxis: "y",
      responsive: true,
      plugins: { legend: { display: false } },
      scales: {
        x: {
          beginAtZero: true,
          grid: { color: "#EEF1EF" }
        },
        y: { grid: { display: false } }
      }
    }
  });
}
