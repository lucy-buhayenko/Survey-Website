/* ============================================================
   Includes:
   1. Professional Skills Heatmap
   2. Leadership & Collaboration Scatter
   3. Weekly Growth Trends
============================================================ */


/* =============================================
   1. Professional Skills Heatmap
============================================= */
function buildSkillsHeatmap(matrix) {
  const canvasId = "chart-skills-heatmap";
  destroyChart(canvasId);
  const ctx = document.getElementById(canvasId);
  if (!ctx) return;

  const xLabels = [...new Set(matrix.map(m => m.x))];
  const yLabels = [...new Set(matrix.map(m => m.y))];

  ChartRegistry[canvasId] = new Chart(ctx, {
    type: "matrix",
    data: {
      datasets: [{
        label: "Skill Scores",
        data: matrix,
        backgroundColor(ctx) {
          const v = ctx.dataset.data[ctx.dataIndex].v;
          return v >= 80 ? C.sage : v >= 50 ? C.warn : C.danger;
        },
        width: 26,
        height: 26,
        borderWidth: 1,
        borderColor: "#fff"
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: {
        x: { type: "category", labels: xLabels, grid: { display: false } },
        y: { type: "category", labels: yLabels, grid: { display: false } }
      }
    }
  });
}



/* =============================================
   2. Leadership & Collaboration Scatter
============================================= */
function buildLeadershipScatter(points) {
  const canvasId = "chart-leadership-scatter";
  destroyChart(canvasId);
  const ctx = document.getElementById(canvasId);
  if (!ctx) return;

  ChartRegistry[canvasId] = new Chart(ctx, {
    type: "scatter",
    data: {
      datasets: [{
        label: "Leadership vs Collaboration",
        data: points,
        backgroundColor: C.blue,
        borderColor: C.blue
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: {
        x: {
          title: { display: true, text: "Collaboration" },
          min: 0,
          max: 10
        },
        y: {
          title: { display: true, text: "Leadership" },
          min: 0,
          max: 10
        }
      }
    }
  });
}



/* =============================================
   3. Weekly Growth Trends
============================================= */
function buildGrowthTrends(growthData) {
  const canvasId = "chart-growth-trends";
  destroyChart(canvasId);
  const ctx = document.getElementById(canvasId);
  if (!ctx) return;

  const colors = [C.sage, C.blue, C.warn, C.sageMid];

  ChartRegistry[canvasId] = new Chart(ctx, {
    type: "line",
    data: {
      labels: growthData.weeks,
      datasets: growthData.metrics.map((m, i) => ({
        label: m.name,
        data: m.values,
        borderColor: colors[i % colors.length],
        backgroundColor: colors[i % colors.length],
        tension: 0.3,
        fill: false
      }))
    },
    options: {
      responsive: true,
      plugins: { legend: { position: "bottom" } },
      scales: {
        y: { beginAtZero: true, max: 100, ticks: { callback: v => v + "%" } },
        x: { grid: { display: false } }
      }
    }
  });
}
