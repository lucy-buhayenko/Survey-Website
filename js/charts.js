/* ============================================================
   GLOBAL CHART UTILITIES
============================================================ */

/* Registry to track active charts */
const ChartRegistry = {};

function destroyChart(id) {
  if (ChartRegistry[id]) {
    ChartRegistry[id].destroy();
    delete ChartRegistry[id];
  }
}

/* Color palette */
const C = {
  forest:  "#076a40ff",
  sage:    "#13ac67ff",
  sageMid: "#86e5adff",
  mint:    "#D8F3DC",
  blue:    "#2b90cfff",
  warn:    "#fbc655ff",
  danger:  "#C0392B",
};


/* ============================================================
   EXECUTIVE DASHBOARDS (1–3)
============================================================ */


/* =============================================
   1. Participant Readiness Bar
============================================= */
function buildReadinessBar(participants) {
  const canvasId = "chart-readiness-bar";
  destroyChart(canvasId);
  const ctx = document.getElementById(canvasId);
  if (!ctx) return;

  const sorted = [...participants].sort((a, b) => b.weeklyAvg - a.weeklyAvg);

  ChartRegistry[canvasId] = new Chart(ctx, {
    type: "bar",
    data: {
      labels: sorted.map(p => p.name.split(" ")[0]),
      datasets: [{
        label: "Weekly Readiness",
        data: sorted.map(p => p.weeklyAvg),
        backgroundColor: sorted.map(p =>
          p.weeklyAvg >= 80 ? C.sage :
          p.weeklyAvg >= 50 ? C.warn : C.danger
        ),
        borderRadius: 8,
        borderSkipped: false
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: {
        y: {
          min: 0,
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
   2. Readiness Distribution Donut
============================================= */
function buildDistributionDonut(participants) {
  const canvasId = "chart-distribution";
  destroyChart(canvasId);
  const ctx = document.getElementById(canvasId);
  if (!ctx) return;

  let low = 0, mid = 0, high = 0;
  participants.forEach(p => {
    if (p.weeklyAvg >= 80) high++;
    else if (p.weeklyAvg >= 50) mid++;
    else low++;
  });

  ChartRegistry[canvasId] = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: ["High (≥80)", "Developing (50–79)", "Needs Support (<50)"],
      datasets: [{
        data: [high, mid, low],
        backgroundColor: [C.sage, C.warn, C.danger],
        borderWidth: 0,
        hoverOffset: 6
      }]
    },
    options: {
      responsive: true,
      cutout: "65%",
      plugins: {
        legend: {
          position: "bottom",
          labels: { padding: 16, font: { size: 12 } }
        }
      }
    }
  });
}



/* =============================================
   3. Work Track Distribution
============================================= */
function buildTrackChart(weeklyRows) {
  const canvasId = "chart-tracks";
  destroyChart(canvasId);
  const ctx = document.getElementById(canvasId);
  if (!ctx) return;

  const counts = {};
  weeklyRows.forEach(r => {
    const t = (r.workTrack || "Unknown")
      .replace(/^phase \d+ — /i, "")
      .trim();
    counts[t] = (counts[t] || 0) + 1;
  });

  const labels = Object.keys(counts);
  const data = Object.values(counts);

  ChartRegistry[canvasId] = new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [{
        label: "Assessments",
        data,
        backgroundColor: C.blue,
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



/* =============================================
   4. Placement Status (Endpoint)
============================================= */
function buildPlacementChart(endpointRows) {
  const canvasId = "chart-placement";
  destroyChart(canvasId);
  const ctx = document.getElementById(canvasId);
  if (!ctx) return;

  const counts = {};
  endpointRows.forEach(r => {
    const raw = r.placementStatus || "Unknown";
    let label = "Unknown";
    const v = raw.toLowerCase();

    if (v.includes("full-time")) label = "Full-Time";
    else if (v.includes("part-time")) label = "Part-Time";
    else if (v.includes("still actively looking")) label = "Still Looking";
    else if (v.includes("not looking")) label = "Not Looking";
    else if (v.includes("exited early")) label = "Early Exit";

    counts[label] = (counts[label] || 0) + 1;
  });

  const bgMap = {
    "Full-Time": C.sage,
    "Part-Time": C.sageMid,
    "Still Looking": C.blue,
    "Not Looking": C.warn,
    "Early Exit": C.danger,
    "Unknown": "#ccc"
  };

  const labels = Object.keys(counts);

  ChartRegistry[canvasId] = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels,
      datasets: [{
        data: Object.values(counts),
        backgroundColor: labels.map(l => bgMap[l] || "#ccc"),
        borderWidth: 0,
        hoverOffset: 6
      }]
    },
    options: {
      responsive: true,
      cutout: "60%",
      plugins: {
        legend: {
          position: "bottom",
          labels: { padding: 14, font: { size: 12 } }
        }
      }
    }
  });
}



/* =============================================
   5. Retention Milestones (Follow-Up)
============================================= */
function buildRetentionChart(followupRows) {
  const canvasId = "chart-retention";
  destroyChart(canvasId);
  const ctx = document.getElementById(canvasId);
  if (!ctx) return;

  const counts = {};
  followupRows.forEach(r => {
    const raw = r.retentionMilestone || "Unknown";
    let label = "Unknown";
    const v = raw.toLowerCase();

    if (v.includes("90-day")) label = "90-Day ✓";
    else if (v.includes("30-day")) label = "30-Day ✓";
    else if (v.includes("less than 30")) label = "< 30 Days";
    else if (v.includes("not employed")) label = "Not Employed";

    counts[label] = (counts[label] || 0) + 1;
  });

  const bgMap = {
    "90-Day ✓": C.sage,
    "30-Day ✓": C.sageMid,
    "< 30 Days": C.warn,
    "Not Employed": C.danger,
    "Unknown": "#ccc"
  };

  const labels = Object.keys(counts);

  ChartRegistry[canvasId] = new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [{
        label: "Participants",
        data: Object.values(counts),
        backgroundColor: labels.map(l => bgMap[l] || "#ccc"),
        borderRadius: 8,
        borderSkipped: false
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: {
        y: {
          beginAtZero: true,
          grid: { color: "#EEF1EF" }
        },
        x: { grid: { display: false } }
      }
    }
  });
}
