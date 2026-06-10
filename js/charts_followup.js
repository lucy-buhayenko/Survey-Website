/* ============================================================
   FOLLOW-UP DASHBOARDS (16–21) — CLEAN OPTIMIZED VERSION
   Includes ONLY the 5 most valuable charts:
   1. Employment Status
   2. Time to Hire
   3. Workplace Success
   4. Certification Breakdown
   5. Alumni Engagement Funnel
============================================================ */


/* =============================================
   1. Employment Status (Pie)
============================================= */
function buildEmploymentStatus(statusCounts) {
  const canvasId = "chart-employment-status";
  destroyChart(canvasId);
  const ctx = document.getElementById(canvasId);
  if (!ctx) return;

  ChartRegistry[canvasId] = new Chart(ctx, {
    type: "pie",
    data: {
      labels: Object.keys(statusCounts),
      datasets: [{
        data: Object.values(statusCounts),
        backgroundColor: [C.sage, C.sageMid, C.danger],
        borderWidth: 0
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { position: "bottom" } }
    }
  });
}



/* =============================================
   2. Time to Hire (Box Plot)
============================================= */
function buildTimeToHireBox(data) {
  const canvasId = "chart-time-to-hire";
  destroyChart(canvasId);
  const ctx = document.getElementById(canvasId);
  if (!ctx) return;

  ChartRegistry[canvasId] = new Chart(ctx, {
    type: "boxplot",
    data: {
      labels: data.labels,
      datasets: [{
        label: "Time to Hire (days)",
        data: data.values,
        backgroundColor: C.blue,
        borderColor: C.blue
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } }
    }
  });
}



/* =============================================
   3. Workplace Success (Bar)
============================================= */
function buildWorkplaceSuccess(scores) {
  const canvasId = "chart-workplace-success";
  destroyChart(canvasId);
  const ctx = document.getElementById(canvasId);
  if (!ctx) return;

  ChartRegistry[canvasId] = new Chart(ctx, {
    type: "bar",
    data: {
      labels: ["Attendance", "Confidence", "Incidents"],
      datasets: [{
        data: [
          scores.attendance,
          scores.confidence,
          scores.incidents
        ],
        backgroundColor: [C.sage, C.blue, C.danger],
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
   4. Certification Breakdown (Bar)
============================================= */
function buildCertificationBreakdown(certCounts) {
  const canvasId = "chart-certifications";
  destroyChart(canvasId);
  const ctx = document.getElementById(canvasId);
  if (!ctx) return;

  ChartRegistry[canvasId] = new Chart(ctx, {
    type: "bar",
    data: {
      labels: Object.keys(certCounts),
      datasets: [{
        label: "Certifications",
        data: Object.values(certCounts),
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
   5. Alumni Engagement Funnel (Horizontal Bar)
============================================= */
function buildAlumniEngagementFunnel(stages) {
  const canvasId = "chart-alumni-funnel";
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
        backgroundColor: C.blue,
        borderRadius: 6
      }]
    },
    options: {
      indexAxis: "y",
      responsive: true,
      plugins: { legend: { display: false } },
      scales: {
        x: { beginAtZero: true },
        y: { grid: { display: false } }
      }
    }
  });
}
