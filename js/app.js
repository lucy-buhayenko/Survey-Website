/* ============================================================
   VDP PORTAL — app.js
   Main application: data loading, participant model, rendering,
   lazy section rendering, navigation, activity filters, utils.
   ============================================================ */

/* ── STORE ──────────────────────────────────────────────────── */
const Store = {
  weekly:       [],
  endpoint:     [],
  followup:     [],
  participants: {},   // keyed by normalised lowercase name
};

/* Track which sections have already had their charts built */
const renderedSections = new Set();

/* ── DATA LOADING ───────────────────────────────────────────── */
async function loadAllData() {
  setStatus('loading', 'Loading data…');

  const files = [
    { path: 'data/weekly.xlsx',   normalizer: normalizeWeekly,   key: 'weekly'   },
    { path: 'data/endpoint.xlsx', normalizer: normalizeEndpoint, key: 'endpoint' },
    { path: 'data/followup.xlsx', normalizer: normalizeFollowup, key: 'followup' },
  ];

  let anyLoaded = false;

  await Promise.all(files.map(async ({ path, normalizer, key }) => {
    try {
      const res   = await fetch(path);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const buf   = await res.arrayBuffer();
      const wb    = XLSX.read(buf, { type: 'array' });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const raw   = XLSX.utils.sheet_to_json(sheet);
      Store[key]  = raw
        .map(normalizer)
        .filter(r => r.participantName && r.participantName !== 'Unknown');
      anyLoaded = true;
    } catch (err) {
      console.warn(`[VDP] Could not load ${path}:`, err.message);
      Store[key] = [];
    }
  }));

  buildParticipantModel();

  /* Render only the landing section + utility sections on startup */
  renderSection('sec-exec-readiness');
  renderParticipants();
  renderActivityTable();
  populateActivityFilters();

  setStatus(anyLoaded ? 'live' : 'error', anyLoaded ? 'Live' : 'No data');
  hideLoader();
}

/* ── PARTICIPANT MODEL ──────────────────────────────────────── */
function buildParticipantModel() {
  const map = {};

  function getOrCreate(name) {
    const key = name.toLowerCase().trim();
    if (!map[key]) {
      map[key] = {
        name,
        weeklyRecords:  [],
        endpointRecord: null,
        followupRecord: null,
        weeklyAvg:      0,
        endpointScore:  null,
        followupScore:  null,
        overallScore:   0,
      };
    }
    return map[key];
  }

  Store.weekly.forEach(r => {
    const p = getOrCreate(r.participantName);
    p.weeklyRecords.push({ ...r, score: calcWeeklyReadiness(r) });
  });

  Store.endpoint.forEach(r => {
    const p       = getOrCreate(r.participantName);
    p.endpointRecord = r;
    p.endpointScore  = calcEndpointScore(r);
  });

  Store.followup.forEach(r => {
    const p       = getOrCreate(r.participantName);
    p.followupRecord = r;
    p.followupScore  = calcFollowupScore(r);
  });

  Object.values(map).forEach(p => {
    if (p.weeklyRecords.length > 0) {
      p.weeklyAvg = Math.round(
        p.weeklyRecords.reduce((s, r) => s + r.score, 0) / p.weeklyRecords.length
      );
    }
    /* Weighted overall: weekly 40 %, endpoint 35 %, followup 25 % */
    let score = 0, wt = 0;
    if (p.weeklyAvg)     { score += p.weeklyAvg     * 0.40; wt += 0.40; }
    if (p.endpointScore) { score += p.endpointScore * 0.35; wt += 0.35; }
    if (p.followupScore) { score += p.followupScore * 0.25; wt += 0.25; }
    p.overallScore = wt > 0 ? Math.round(score / wt) : p.weeklyAvg;
  });

  Store.participants = map;
}

/* ── LAZY SECTION RENDERER ──────────────────────────────────── */
/*
   Called the FIRST time a section becomes visible.
   Each case maps a section ID to the render function(s) for
   that dashboard.  Safe to call with no data — every render
   function guards with an early return when rows are empty.
*/
function renderSection(id) {
  const participants = Object.values(Store.participants);
  const w = Store.weekly;
  const e = Store.endpoint;
  const f = Store.followup;

  switch (id) {

    /* ── EXECUTIVE ── */
    case 'sec-exec-readiness':
      renderExecReadiness(participants, w, e, f);
      break;

    case 'sec-exec-cohort':
      renderExecCohort(w);
      break;

    case 'sec-exec-funnel':
      renderExecFunnel(participants, e, f);
      break;

    /* ── WEEKLY ── */
    case 'sec-w-skills':
      renderWeeklySkills(w);
      break;

    case 'sec-w-leadership':
      renderWeeklyLeadership(w);
      break;

    case 'sec-w-growth':
      renderWeeklyGrowth(participants, w);
      break;

    /* ── ENDPOINT ── */
    case 'sec-e-readiness':
      renderEndpointReadiness(e);
      break;

    case 'sec-e-applications':
      renderEndpointApplications(e);
      break;

    case 'sec-e-networking':
      renderEndpointNetworking(e);
      break;

    case 'sec-e-references':
      renderEndpointReferences(e);
      break;

    case 'sec-e-risk':
      renderEndpointRisk(e);
      break;

    /* ── FOLLOW-UP ── */
    case 'sec-f-employment':
      renderFollowupEmployment(f);
      break;

    case 'sec-f-timetohire':
      renderFollowupTimeToHire(f);
      break;

    case 'sec-f-workplace':
      renderFollowupWorkplace(f);
      break;

    /*case 'sec-f-certs':
      renderFollowupCerts(f);
      break;*/

    case 'sec-f-alumni':
      renderFollowupAlumni(f);
      break;

    /* ── UTILITY SECTIONS (no charts, nothing to do) ── */
    case 'sec-participants':
    case 'sec-activity':
    case 'sec-forms':
      break;

    default:
      console.warn('[VDP] renderSection: unknown section id:', id);
  }
}

/* ── EXECUTIVE: WORKFORCE READINESS ────────────────────────── */
function renderExecReadiness(participants, w, e, f) {
  const total        = participants.length;
  const weeklyScores = participants.map(p => p.weeklyAvg);
  const avgScore     = total > 0
    ? Math.round(weeklyScores.reduce((a, b) => a + b, 0) / total) : 0;
  const ready        = participants.filter(p => p.weeklyAvg >= 80).length;

  setText('kpi-total',       total);
  setText('kpi-avg',         avgScore + '%');
  setText('kpi-ready',       ready);
  setText('kpi-weekly-rows', w.length);
  setText('kpi-endpoint',    e.length);
  setText('kpi-followup',    f.length);

  buildReadinessBar(participants);
  buildDistributionDonut(participants);
  buildTrackChart(w);
}

/* ── EXECUTIVE: READINESS BY COHORT ────────────────────────── */
function renderExecCohort(w) {
  if (!w.length) return;

  /* Group by evaluator */
  const groups = {};
  w.forEach(r => {
    const ev = r.evaluatorName || 'Unknown';
    if (!groups[ev]) groups[ev] = [];
    groups[ev].push(calcWeeklyReadiness(r));
  });

  const labels   = Object.keys(groups);
  const avgs     = labels.map(l => avg(groups[l]));
  const highs    = labels.map(l => Math.max(...groups[l]));
  const lows     = labels.map(l => Math.min(...groups[l]));
  const readyPct = labels.map(l =>
    Math.round((groups[l].filter(s => s >= 80).length / groups[l].length) * 100)
  );

  setText('kpi-cohort-count', labels.length);
  const maxAvg = Math.max(...avgs);
  const minAvg = Math.min(...avgs);
  setText('kpi-cohort-high', maxAvg + '%');
  setText('kpi-cohort-low',  minAvg + '%');

  /* Bar: avg per cohort */
  buildSimpleBar('chart-cohort-bar', labels, avgs, {
    label: 'Avg Readiness',
    colors: avgs.map(s => s >= 80 ? C.sage : s >= 50 ? C.warn : C.danger),
    yMax: 100, yPct: true,
  });

  /* Range: min/max/avg */
  buildRangeBar('chart-cohort-range', labels, lows, avgs, highs);

  /* Placement-ready % per cohort */
  buildSimpleBar('chart-cohort-placement-ready', labels, readyPct, {
    label: '% Placement Ready (≥80)',
    colors: C.sage,
    yMax: 100, yPct: true,
  });
}

/* ── EXECUTIVE: EMPLOYMENT FUNNEL ───────────────────────────── */
function renderExecFunnel(participants, e, f) {
  const enrolled   = participants.length;
  const graduated  = e.length;
  const placed     = e.filter(r => {
    const v = (r.placementStatus || '').toLowerCase();
    return v.includes('full-time') || v.includes('part-time');
  }).length;
  const ret30      = f.filter(r =>
    (r.retentionMilestone || '').toLowerCase().includes('30-day') ||
    (r.retentionMilestone || '').toLowerCase().includes('90-day')
  ).length;
  const ret90      = f.filter(r =>
    (r.retentionMilestone || '').toLowerCase().includes('90-day')
  ).length;

  setText('kpi-funnel-enrolled',  enrolled);
  setText('kpi-funnel-placed',    enrolled > 0 ? Math.round(placed / enrolled * 100) + '%' : '—');
  setText('kpi-funnel-retained',  enrolled > 0 ? Math.round(ret90  / enrolled * 100) + '%' : '—');
  setText('kpi-funnel-graduated', enrolled > 0 ? Math.round(graduated / enrolled * 100) + '%' : '—');

  /* CSS funnel */
  const stages = [
    { label: 'Enrolled',         count: enrolled },
    { label: 'Assessed (Weekly)',count: Store.weekly.length > 0 ? enrolled : 0 },
    { label: 'Graduated',        count: graduated },
    { label: 'Placed',           count: placed },
    { label: '30-Day Retention', count: ret30 },
    { label: '90-Day Retention', count: ret90 },
  ];
  const max = Math.max(...stages.map(s => s.count), 1);
  const container = document.getElementById('funnel-container');
  if (container) {
    container.innerHTML = stages.map(s => {
      const pct  = Math.round(s.count / max * 100);
      const conv = enrolled > 0 ? Math.round(s.count / enrolled * 100) + '%' : '—';
      return `
        <div class="funnel-row">
          <div class="funnel-lbl">${s.label}</div>
          <div class="funnel-track">
            <div class="funnel-fill" style="width:${pct}%">
              <span class="funnel-fill-val">${s.count}</span>
            </div>
          </div>
          <div class="funnel-pct">${conv}</div>
        </div>`;
    }).join('');
  }

  buildPlacementChart(e);
  buildRetentionChart(f);
}

/* ── WEEKLY: PROFESSIONAL SKILLS ────────────────────────────── */
function renderWeeklySkills(w) {
  if (!w.length) return;

  const participants = [...new Set(w.map(r => r.participantName))];
  const skillDefs = [
    { key: 'oralComm',      label: 'Oral Comm' },
    { key: 'writtenComm',   label: 'Written Comm' },
    { key: 'commitments',   label: 'Commitments' },
    { key: 'punctuality',   label: 'Punctuality' },
    { key: 'mentalFocus',   label: 'Focus' },
    { key: 'taskAccuracy',  label: 'Accuracy' },
    { key: 'applyFeedback', label: 'Feedback' },
  ];

  /* Build heatmap table */
  const head = document.getElementById('skills-heatmap-head');
  const body = document.getElementById('skills-heatmap-body');
  if (head && body) {
    head.innerHTML = '<tr><th>Participant</th>' +
      skillDefs.map(s => `<th>${s.label}</th>`).join('') + '</tr>';

    body.innerHTML = participants.map(name => {
      const rows = w.filter(r => r.participantName === name);
      const cells = skillDefs.map(s => {
        const score = avg(rows.map(r => mapScore(r[s.key])).filter(v => v !== null));
        return `<td class="${heatClass(score)}">${score > 0 ? score : '—'}</td>`;
      }).join('');
      return `<tr><td class="row-label">${name}</td>${cells}</tr>`;
    }).join('');
  }

  /* Grouped bar: avg skill per participant */
  const datasets = skillDefs.map((s, i) => ({
    label: s.label,
    data:  participants.map(name => {
      const rows = w.filter(r => r.participantName === name);
      return avg(rows.map(r => mapScore(r[s.key])).filter(v => v !== null));
    }),
    backgroundColor: skillColors[i % skillColors.length],
    borderRadius: 4,
  }));

  destroyChart('chart-skills-heatmap');
  const ctx = document.getElementById('chart-skills-heatmap');
  if (ctx) {
    ChartRegistry['chart-skills-heatmap'] = new Chart(ctx, {
      type: 'bar',
      data: { labels: participants.map(n => n.split(' ')[0]), datasets },
      options: {
        responsive: true,
        plugins: { legend: { position: 'bottom', labels: { font: { size: 11 } } } },
        scales: {
          y: { min: 0, max: 100, ticks: { callback: v => v + '%' }, grid: { color: '#EEF1EF' } },
          x: { grid: { display: false } },
        },
      },
    });
  }

  /* Feedback score bar 
  buildSimpleBar('chart-feedback-score',
    participants.map(n => n.split(' ')[0]),
    participants.map(name => avg(w.filter(r => r.participantName === name).map(r => mapScore(r.applyFeedback)).filter(v => v !== null))),
    { label: 'Feedback Application', colors: C.sage, yMax: 100, yPct: true }
  );*/

  /* KPIs */
  setText('kpi-w-comm',        avg(w.map(r => avg([mapScore(r.oralComm), mapScore(r.writtenComm)].filter(v => v !== null)))) + '%');
  setText('kpi-w-reliability', avg(w.map(r => avg([mapScore(r.commitments), mapScore(r.punctuality)].filter(v => v !== null)))) + '%');
  setText('kpi-w-accuracy',    avg(w.map(r => mapScore(r.taskAccuracy)).filter(v => v !== null)) + '%');
  setText('kpi-w-focus',       avg(w.map(r => mapScore(r.mentalFocus)).filter(v => v !== null)) + '%');
}

/* ── WEEKLY: LEADERSHIP & COLLABORATION ─────────────────────── */
function renderWeeklyLeadership(w) {
  if (!w.length) return;

  const participants = [...new Set(w.map(r => r.participantName))];

  /* Totals per participant */
  const leaderTotals = participants.map(name => {
    const rows = w.filter(r => r.participantName === name);
    return rows.reduce((s, r) => s + (mapScore(r.leadership) || 0), 0);
  });
  const groupTotals = participants.map(name => {
    const rows = w.filter(r => r.participantName === name);
    return rows.reduce((s, r) => s + (mapScore(r.groupActivities) || 0), 0);
  });

  setText('kpi-leadership-total', leaderTotals.reduce((a, b) => a + b, 0));
  setText('kpi-leadership-avg',   avg(leaderTotals) + ' pts');
  setText('kpi-group-rate',       avg(groupTotals)  + ' pts');

  /* Scatter: leadership vs group activities */
  destroyChart('chart-leadership-scatter');
  const ctxS = document.getElementById('chart-leadership-scatter');
  if (ctxS) {
    ChartRegistry['chart-leadership-scatter'] = new Chart(ctxS, {
      type: 'scatter',
      data: {
        datasets: [{
          label: 'Participants',
          data: participants.map((name, i) => ({ x: groupTotals[i], y: leaderTotals[i], name })),
          backgroundColor: C.sage,
          pointRadius: 8,
          pointHoverRadius: 10,
        }],
      },
      options: {
        responsive: true,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: ctx => `${ctx.raw.name}: Leadership ${ctx.raw.y}, Group ${ctx.raw.x}`,
            },
          },
        },
        scales: {
          x: { title: { display: true, text: 'Group Activity Score' }, grid: { color: '#EEF1EF' } },
          y: { title: { display: true, text: 'Leadership Score'      }, grid: { color: '#EEF1EF' } },
        },
      },
    });
  }

  /* Leaderboard bar */
  const sorted = participants
    .map((name, i) => ({ name: name.split(' ')[0], score: leaderTotals[i] }))
    .sort((a, b) => b.score - a.score);

  buildSimpleBar('chart-leadership-leaderboard',
    sorted.map(p => p.name), sorted.map(p => p.score),
    { label: 'Leadership Score', colors: C.forest, yMax: null, yPct: false }
  );

  /* Group distribution */
  buildSimpleBar('chart-group-distribution',
    participants.map(n => n.split(' ')[0]), groupTotals,
    { label: 'Group Activity Score', colors: C.sageMid, yMax: null, yPct: false }
  );
}

/* ── WEEKLY: GROWTH TRENDS ──────────────────────────────────── */
function renderWeeklyGrowth(participants, w) {
  if (!w.length) return;

  /* One line per participant across their weekly records in order */
  const pList  = participants.filter(p => p.weeklyRecords.length > 1);
  const maxLen = Math.max(...pList.map(p => p.weeklyRecords.length), 2);
  const labels = Array.from({ length: maxLen }, (_, i) => `Week ${i + 1}`);

  const colors = [C.forest, C.sage, C.sageMid, C.warn, C.danger, '#6c757d'];
  const datasets = pList.map((p, i) => ({
    label: p.name.split(' ')[0],
    data:  p.weeklyRecords.map(r => r.score),
    borderColor: colors[i % colors.length],
    backgroundColor: 'transparent',
    tension: 0.35,
    pointRadius: 4,
  }));

  destroyChart('chart-growth-trends');
  const ctx = document.getElementById('chart-growth-trends');
  if (ctx && datasets.length) {
    ChartRegistry['chart-growth-trends'] = new Chart(ctx, {
      type: 'line',
      data: { labels, datasets },
      options: {
        responsive: true,
        plugins: { legend: { position: 'bottom', labels: { font: { size: 11 } } } },
        scales: {
          y: { min: 0, max: 100, ticks: { callback: v => v + '%' }, grid: { color: '#EEF1EF' } },
          x: { grid: { display: false } },
        },
      },
    });
  }

  /* Delta (improvement) */
  const deltas = pList.map(p => {
    const scores = p.weeklyRecords.map(r => r.score);
    return scores[scores.length - 1] - scores[0];
  });
  const sortedDeltas = pList
    .map((p, i) => ({ name: p.name.split(' ')[0], delta: deltas[i] }))
    .sort((a, b) => b.delta - a.delta);

  if (sortedDeltas.length) {
    setText('kpi-most-improved', sortedDeltas[0].name);
    setText('kpi-avg-gain',      avg(deltas) + ' pts');
    setText('kpi-declining',     deltas.filter(d => d < 0).length);
  }

  buildSimpleBar('chart-improvement-rankings',
    sortedDeltas.map(p => p.name), sortedDeltas.map(p => p.delta),
    { label: 'Score Delta (first → latest)', colors: sortedDeltas.map(p => p.delta >= 0 ? C.sage : C.danger), yMax: null, yPct: false }
  );

  /* Category growth */
  const catLabels = ['Communication', 'Reliability', 'Accuracy', 'Leadership'];
  const catData   = pList.map(p => {
    const first = p.weeklyRecords[0];
    const last  = p.weeklyRecords[p.weeklyRecords.length - 1];
    return [
      avg([mapScore(last.oralComm), mapScore(last.writtenComm)].filter(v => v !== null)) -
      avg([mapScore(first.oralComm), mapScore(first.writtenComm)].filter(v => v !== null)),
      avg([mapScore(last.commitments), mapScore(last.punctuality)].filter(v => v !== null)) -
      avg([mapScore(first.commitments), mapScore(first.punctuality)].filter(v => v !== null)),
      (mapScore(last.taskAccuracy) || 0) - (mapScore(first.taskAccuracy) || 0),
      (mapScore(last.leadership)   || 0) - (mapScore(first.leadership)   || 0),
    ];
  });
  const catAvgs = catLabels.map((_, ci) => avg(catData.map(p => p[ci])));

  buildSimpleBar('chart-skill-growth-category', catLabels, catAvgs, {
    label: 'Avg Growth', colors: catAvgs.map(v => v >= 0 ? C.sage : C.danger),
    yMax: null, yPct: false,
  });
}

/* ── ENDPOINT: EMPLOYER READINESS ───────────────────────────── */
function renderEndpointReadiness(e) {
  if (!e.length) return;

  const employerReady = e.filter(r => (r.resumeStatus || '').toLowerCase().includes('employer ready')).length;
  const draftOnly     = e.filter(r => (r.resumeStatus || '').toLowerCase().includes('draft')).length;
  const avgInterview  = avg(e.map(r => mapScore(r.mockInterview)).filter(v => v !== null));
  const avgOverall    = avg(e.map(r => calcEndpointScore(r)));

  setText('kpi-e-ready',     employerReady);
  setText('kpi-e-interview', avgInterview + '%');
  setText('kpi-e-overall',   avgOverall + '%');
  setText('kpi-e-draft',     draftOnly);

  /* Resume status donut */
  const resumeCounts = {};
  e.forEach(r => {
    const v = (r.resumeStatus || 'Unknown').trim();
    resumeCounts[v] = (resumeCounts[v] || 0) + 1;
  });
  buildDoughnut('chart-employer-readiness', Object.keys(resumeCounts), Object.values(resumeCounts),
    [C.sage, C.warn, C.danger, '#ccc']);

  /* Mock interview bar 
  buildSimpleBar('chart-mock-interview',
    e.map(r => r.participantName.split(' ')[0]),
    e.map(r => mapScore(r.mockInterview) || 0),
    { label: 'Mock Interview Score', colors: C.forest, yMax: 100, yPct: true }
  ); */

  destroyChart('chart-professionalism-bar');
const ctxP = document.getElementById('chart-professionalism-bar');
if (ctxP) {
  ChartRegistry['chart-professionalism-bar'] = new Chart(ctxP, {
    type: 'bar',
    data: {
      labels: e.map(r => r.participantName.split(' ')[0]),
      datasets: [
        {
          label: 'Growth Mindset',
          data: e.map(r => mapScore(r.growthAwareness) || 0),
          backgroundColor: C.sage,
          borderRadius: 4
        }
      ],
    },
    options: {
      responsive: true,
      plugins: { legend: { position: 'bottom' } },
      scales: {
        y: { min: 0, max: 100, ticks: { callback: v => v + '%' }, grid: { color: '#EEF1EF' } },
        x: { grid: { display: false } },
      },
    },
  });
}

  
}

/* ── ENDPOINT: APPLICATIONS ─────────────────────────────────── */
function renderEndpointApplications(e) {
  if (!e.length) return;

  const appMap = {
    '0 applications':    0,
    '1–5 applications':  3,
    '6–15 applications': 10,
    '16+ applications':  16,
  };
  const appScores = e.map(r => {
    const v = (r.totalApplications || '').toLowerCase();
    if (v.includes('16')) return 16;
    if (v.includes('6'))  return 10;
    if (v.includes('1–5') || v.includes('1-5')) return 3;
    return 0;
  });

  setText('kpi-apps-total', appScores.reduce((a, b) => a + b, 0));
  setText('kpi-apps-avg',   avg(appScores));
  setText('kpi-apps-zero',  appScores.filter(s => s === 0).length);

  buildSimpleBar('chart-applications',
    e.map(r => r.participantName.split(' ')[0]), appScores,
    { label: 'Applications Submitted', colors: C.forest, yMax: null, yPct: false }
  );

  /* Bracket distribution */
  const brackets = { '0': 0, '1–5': 0, '6–15': 0, '16+': 0 };
  e.forEach(r => {
    const v = (r.totalApplications || '').toLowerCase();
    if (v.includes('16')) brackets['16+']++;
    else if (v.includes('6')) brackets['6–15']++;
    else if (v.includes('1')) brackets['1–5']++;
    else brackets['0']++;
  });
  buildDoughnut('chart-applications-dist',
    Object.keys(brackets), Object.values(brackets),
    [C.danger, C.warn, C.sageMid, C.sage]);
}

/* ── ENDPOINT: NETWORKING ───────────────────────────────────── */
function renderEndpointNetworking(e) {
  if (!e.length) return;

  const netScores = e.map(r => {
    const v = (r.profContacted || '').toLowerCase();
    if (v.includes('more than 10')) return 10;
    if (v.includes('4–10') || v.includes('4-10')) return 7;
    if (v.includes('1–3') || v.includes('1-3')) return 2;
    return 0;
  });

  setText('kpi-net-total', netScores.reduce((a, b) => a + b, 0));
  setText('kpi-net-avg',   avg(netScores));
  setText('kpi-net-zero',  netScores.filter(s => s === 0).length);

  buildSimpleBar('chart-networking',
    e.map(r => r.participantName.split(' ')[0]), netScores,
    { label: 'Professionals Contacted', colors: C.sage, yMax: null, yPct: false }
  );

  const brackets = { '0': 0, '1–3': 0, '4–10': 0, '10+': 0 };
  e.forEach(r => {
    const v = (r.profContacted || '').toLowerCase();
    if (v.includes('more than 10')) brackets['10+']++;
    else if (v.includes('4'))       brackets['4–10']++;
    else if (v.includes('1'))       brackets['1–3']++;
    else brackets['0']++;
  });
  buildDoughnut('chart-networking-dist',
    Object.keys(brackets), Object.values(brackets),
    [C.danger, C.warn, C.sageMid, C.sage]);
}

/* ── ENDPOINT: REFERENCES ───────────────────────────────────── */
function renderEndpointReferences(e) {
  if (!e.length) return;

  const refScores = e.map(r => {
    const v = (r.referencesSecured || '').toLowerCase();
    if (v.includes('3 or more') || v.includes('3+')) return 3;
    if (v.includes('2')) return 2;
    if (v.includes('1')) return 1;
    return 0;
  });

  setText('kpi-ref-total',  refScores.reduce((a, b) => a + b, 0));
  setText('kpi-ref-avg',    avg(refScores));
  setText('kpi-ref-strong', refScores.filter(s => s >= 3).length);
  setText('kpi-ref-zero',   refScores.filter(s => s === 0).length);

  buildSimpleBar('chart-references',
    e.map(r => r.participantName.split(' ')[0]), refScores,
    { label: 'References Secured', colors: C.forest, yMax: null, yPct: false }
  );

  const brackets = { '0': 0, '1': 0, '2': 0, '3+': 0 };
  refScores.forEach(s => {
    if (s === 0) brackets['0']++;
    else if (s === 1) brackets['1']++;
    else if (s === 2) brackets['2']++;
    else brackets['3+']++;
  });
  buildDoughnut('chart-references-dist',
    Object.keys(brackets), Object.values(brackets),
    [C.danger, C.warn, C.sageMid, C.sage]);
}

/* ── ENDPOINT: CAREER ENGAGEMENT RISK ──────────────────────── */
function renderEndpointRisk(e) {
  if (!e.length) return;

  let low = 0, mid = 0, high = 0;
  const riskNames = { low: [], mid: [], high: [] };

  e.forEach(r => {
    const v = (r.followUpRisk || '').toLowerCase();
    if (v.includes('low')) {
      low++; riskNames.low.push(r.participantName.split(' ')[0]);
    } else if (v.includes('moderate')) {
      mid++; riskNames.mid.push(r.participantName.split(' ')[0]);
    } else {
      high++; riskNames.high.push(r.participantName.split(' ')[0]);
    }
  });

  setText('kpi-risk-low',  low);
  setText('kpi-risk-mid',  mid);
  setText('kpi-risk-high', high);

  buildDoughnut('chart-risk-matrix',
    ['Low Risk', 'Moderate Risk', 'High Risk'],
    [low, mid, high],
    [C.sage, C.warn, C.danger]);

  /* Participant list */
  const list = document.getElementById('risk-participant-list');
  if (list) {
    const makeBlock = (cls, label, names) => names.length ? `
      <div style="margin-bottom:12px;">
        <div class="pill ${cls}" style="margin-bottom:6px;">${label}</div>
        <div style="font-size:.83rem;color:var(--text);">${names.join(', ')}</div>
      </div>` : '';
    list.innerHTML =
      makeBlock('p-green', 'Low Risk',      riskNames.low)  +
      makeBlock('p-amber', 'Moderate Risk', riskNames.mid)  +
      makeBlock('p-red',   'High Risk',     riskNames.high) ||
      '<p style="color:var(--muted);font-size:.83rem;">No data</p>';
  }
}

/* ── FOLLOW-UP: EMPLOYMENT STATUS ───────────────────────────── */
function renderFollowupEmployment(f) {
  if (!f.length) return;

  let ft = 0, pt = 0, none = 0;
  f.forEach(r => {
    const v = (r.employmentStatus || '').toLowerCase();
    if (v.includes('full')) ft++;
    else if (v.includes('part')) pt++;
    else none++;
  });

  const empRate = Math.round(((ft + pt) / f.length) * 100);
  setText('kpi-emp-rate', empRate + '%');
  setText('kpi-emp-ft',   Math.round(ft   / f.length * 100) + '%');
  setText('kpi-emp-pt',   Math.round(pt   / f.length * 100) + '%');
  setText('kpi-emp-none', none);

  buildDoughnut('chart-employment-status',
    ['Full-Time', 'Part-Time', 'Unemployed'],
    [ft, pt, none],
    [C.sage, C.sageMid, C.danger]);

  buildSimpleBar('chart-employment-by-person',
    f.map(r => r.participantName.split(' ')[0]),
    f.map(r => calcFollowupScore(r)),
    { label: 'Follow-Up Score', colors: C.forest, yMax: 100, yPct: true }
  );
}

/* ── FOLLOW-UP: TIME TO HIRE ────────────────────────────────── */
function renderFollowupTimeToHire(f) {
  if (!f.length) return;

  const brackets = { 'Not Employed': 0, '< 30 Days': 0, '31–60 Days': 0, '61–90 Days': 0, '90+ Days': 0 };
  f.forEach(r => {
    const v = (r.timeToHire || '').toLowerCase();
    if (v.includes('not employed'))          brackets['Not Employed']++;
    else if (v.includes('30') && v.includes('less')) brackets['< 30 Days']++;
    else if (v.includes('31') || (v.includes('30') && !v.includes('90'))) brackets['31–60 Days']++;
    else if (v.includes('61') || v.includes('60'))  brackets['61–90 Days']++;
    else if (v.includes('more') || v.includes('90')) brackets['90+ Days']++;
    else brackets['Not Employed']++;
  });

  setText('kpi-tth-fast', brackets['< 30 Days']);
  setText('kpi-tth-mid',  brackets['31–60 Days'] + brackets['61–90 Days']);
  setText('kpi-tth-slow', brackets['90+ Days']);

  buildSimpleBar('chart-time-to-hire',
    Object.keys(brackets), Object.values(brackets),
    { label: 'Participants', colors: [C.danger, C.sage, C.sageMid, C.warn, C.amber || C.warn], yMax: null, yPct: false }
  );
}

/* ── FOLLOW-UP: WORKPLACE SUCCESS ───────────────────────────── */
function renderFollowupWorkplace(f) {
  if (!f.length) return;

  const wpScores = f.map(r => calcFollowupScore(r));
  const cleanCount = f.filter(r => {
    const n = parseInt(r.incidents);
    return isNaN(n) || n === 0;
  }).length;
  const incidentCount = f.length - cleanCount;

  setText('kpi-wp-score',     avg(wpScores) + '%');
  setText('kpi-wp-clean',     cleanCount);
  setText('kpi-wp-incidents', incidentCount);

  buildSimpleBar('chart-workplace-success',
    f.map(r => r.participantName.split(' ')[0]), wpScores,
    { label: 'Workplace Success Score', colors: wpScores.map(s => s >= 80 ? C.sage : s >= 50 ? C.warn : C.danger), yMax: 100, yPct: true }
  );

  /* Attendance distribution */
  const attCounts = {};
  f.forEach(r => {
    const v = (r.attendanceReliab || 'Unknown').trim();
    attCounts[v] = (attCounts[v] || 0) + 1;
  });
  /*buildDoughnut('chart-attendance-dist',
    Object.keys(attCounts), Object.values(attCounts),
    [C.sage, C.sageMid, C.warn, C.danger, '#ccc']);*/

  /* Self-efficacy bar */
  /*buildSimpleBar('chart-self-efficacy',
    f.map(r => r.participantName.split(' ')[0]),
    f.map(r => mapScore(r.selfEfficacy) || 0),
    { label: 'Self-Efficacy Score', colors: C.forest, yMax: 100, yPct: true }
  );*/
}

/* ── FOLLOW-UP: CERTIFICATIONS ──────────────────────────────── */
/*function renderFollowupCerts(f) {
  if (!f.length) return;

  const certCounts = {};
  let certTotal = 0;
  f.forEach(r => {
    const v = (r.certifications || 'None').trim();
    certCounts[v] = (certCounts[v] || 0) + 1;
    if (!v.toLowerCase().includes('none')) certTotal++;
  });

  setText('kpi-cert-total', certTotal);
  setText('kpi-cert-rate',  Math.round(certTotal / f.length * 100) + '%');
  setText('kpi-cert-none',  f.length - certTotal);

  buildDoughnut('chart-certifications',
    Object.keys(certCounts), Object.values(certCounts),
    [C.sage, C.forest, C.sageMid, C.warn, C.danger, '#ccc']);

  buildSimpleBar('chart-certs-by-person',
    f.map(r => r.participantName.split(' ')[0]),
    f.map(r => (r.certifications || '').toLowerCase().includes('none') ? 0 : 1),
    { label: 'Certification Earned', colors: C.sage, yMax: null, yPct: false }
  );
}
*/
/* ── FOLLOW-UP: ALUMNI ENGAGEMENT ───────────────────────────── */
function renderFollowupAlumni(f) {
  if (!f.length) return;

  let active = 0, passive = 0, disengaged = 0;
  const names = { active: [], passive: [], disengaged: [] };

  f.forEach(r => {
    const v = (r.commResponsive || '').toLowerCase();
    if (v.includes('independent') || v.includes('proactive')) {
      active++; names.active.push(r.participantName.split(' ')[0]);
    } else if (v.includes('practiced') || v.includes('reminder')) {
      passive++; names.passive.push(r.participantName.split(' ')[0]);
    } else {
      disengaged++; names.disengaged.push(r.participantName.split(' ')[0]);
    }
  });

  setText('kpi-alumni-active',      active);
  setText('kpi-alumni-passive',     passive);
  setText('kpi-alumni-disengaged',  disengaged);

  buildDoughnut('chart-alumni-funnel',
    ['Active', 'Passive', 'Disengaged'],
    [active, passive, disengaged],
    [C.sage, C.warn, C.danger]);

  buildSimpleBar('chart-alumni-by-person',
    f.map(r => r.participantName.split(' ')[0]),
    f.map(r => mapScore(r.commResponsive) || 0),
    { label: 'Engagement Score', colors: C.forest, yMax: 100, yPct: true }
  );
}

/* ── PARTICIPANT CARDS ──────────────────────────────────────── */
function renderParticipants(filterName = '') {
  const grid = document.getElementById('participant-cards');
  if (!grid) return;

  let list = Object.values(Store.participants);
  if (filterName) {
    list = list.filter(p => p.name.toLowerCase().includes(filterName.toLowerCase()));
  }

  if (!list.length) {
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1">
      <h3>No participants found</h3><p>Try a different search term.</p></div>`;
    return;
  }

  grid.innerHTML = list.map(buildParticipantCard).join('');
}

function buildParticipantCard(p) {
  const bc  = p.weeklyAvg >= 80 ? 'high' : p.weeklyAvg >= 50 ? 'medium' : 'low';
  const bar = Math.min(100, Math.max(0, p.weeklyAvg));

  const trendHtml = [
    { label: 'Weekly', val: p.weeklyAvg,    cls: ''            },
    { label: 'End',    val: p.endpointScore, cls: 'endpoint-bar'},
    { label: 'Follow', val: p.followupScore, cls: 'followup-bar'},
  ].filter(s => s.val !== null && s.val !== undefined)
   .map(s => {
     const h = Math.round((s.val / 100) * 30);
     return `<div class="trend-dot-col">
       <div class="trend-bar ${s.cls}" style="height:${h}px;min-height:3px;"></div>
       <div class="trend-label">${s.label}</div>
     </div>`;
   }).join('');

  let placementPill = '';
  if (p.endpointRecord?.placementStatus) {
    const v = p.endpointRecord.placementStatus.toLowerCase();
    let cls = 'not-looking', lbl = 'Unknown';
    if      (v.includes('full-time'))  { cls = 'placed';      lbl = 'Full-Time';  }
    else if (v.includes('part-time'))  { cls = 'placed';      lbl = 'Part-Time';  }
    else if (v.includes('looking'))    { cls = 'looking';     lbl = 'Looking';    }
    else if (v.includes('exited'))     { cls = 'exited';      lbl = 'Early Exit'; }
    placementPill = `<span class="pill ${cls}">${lbl}</span>`;
  }

  const retention = p.followupRecord?.retentionMilestone
    ? `<div class="p-meta-item"><span>Retention</span><strong>${p.followupRecord.retentionMilestone.replace(/\(.*\)/, '').trim()}</strong></div>`
    : '';

  const track = p.weeklyRecords.length > 0
    ? `<div class="p-meta-item"><span>Last Track</span><strong>${(p.weeklyRecords.at(-1)?.workTrack || '—').replace(/^phase \d+\s*[—–-]+\s*/i, '').slice(0, 22)}</strong></div>`
    : '';

  const evaluator = p.weeklyRecords.length > 0
    ? `<div class="p-meta-item"><span>Evaluator</span><strong>${p.weeklyRecords.at(-1)?.evaluatorName || '—'}</strong></div>`
    : '';

  return `
    <div class="p-card">
      <div class="p-card-header">
        <div class="p-card-name">${p.name}</div>
        <div class="p-card-evaluator">${p.weeklyRecords.at(-1)?.evaluatorName || 'No evaluator'}</div>
      </div>
      <div class="p-card-body">
        <div class="p-card-score-row">
          <span class="p-card-score-label">Weekly Readiness</span>
          <span class="score-badge ${bc}">${p.weeklyAvg}%</span>
        </div>
        <div class="p-score-bar-track">
          <div class="p-score-bar-fill" style="width:${bar}%"></div>
        </div>
        <div class="p-card-meta">
          <div class="p-meta-item"><span>Weekly Records</span><strong>${p.weeklyRecords.length}</strong></div>
          ${track}${evaluator}${retention}
        </div>
        ${trendHtml ? `<div class="p-card-trend"><div class="p-card-trend-label">Score progression</div><div class="trend-dots">${trendHtml}</div></div>` : ''}
        ${placementPill ? `<div style="margin-top:10px">${placementPill}</div>` : ''}
      </div>
    </div>`;
}

/* ── ACTIVITY TABLE ─────────────────────────────────────────── */
function populateActivityFilters() {
  const personSelect = document.getElementById('activity-filter-person');
  if (!personSelect) return;
  const names = [...new Set([
    ...Store.weekly.map(r => r.participantName),
    ...Store.endpoint.map(r => r.participantName),
    ...Store.followup.map(r => r.participantName),
  ])].sort();
  names.forEach(name => {
    const opt = document.createElement('option');
    opt.value = name; opt.textContent = name;
    personSelect.appendChild(opt);
  });
}

function renderActivityTable(typeFilter = '', personFilter = '') {
  const tbody = document.getElementById('activity-tbody');
  if (!tbody) return;

  let rows = [
    ...Store.weekly.map(r   => ({ ...r, type: 'Weekly'    })),
    ...Store.endpoint.map(r => ({ ...r, type: 'Endpoint'  })),
    ...Store.followup.map(r => ({ ...r, type: 'Follow-Up' })),
  ];

  if (typeFilter)   rows = rows.filter(r => r.type === typeFilter);
  if (personFilter) rows = rows.filter(r => r.participantName === personFilter);

  if (!rows.length) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;color:var(--muted);padding:28px;">No records match the selected filters.</td></tr>`;
    return;
  }

  tbody.innerHTML = rows.map(r => {
    let score = '—';
    if (r.source === 'weekly')   score = calcWeeklyReadiness(r) + '%';
    if (r.source === 'endpoint') score = calcEndpointScore(r)   + '%';
    if (r.source === 'followup') score = calcFollowupScore(r)   + '%';

    const typeClass = r.type === 'Weekly' ? 'p-green' : r.type === 'Endpoint' ? 'p-muted' : 'p-amber';
    const stage = r.workTrack
      ? r.workTrack.replace(/^phase \d+\s*[—–-]+\s*/i, '').slice(0, 30)
      : r.placementStatus ? 'Endpoint' : r.retentionMilestone ? 'Follow-Up' : '—';

    return `<tr>
      <td><strong>${r.participantName || 'Unknown'}</strong></td>
      <td>${r.evaluatorName || '—'}</td>
      <td><span class="pill ${typeClass}">${r.type}</span></td>
      <td>${stage}</td>
      <td>${score}</td>
    </tr>`;
  }).join('');
}

/* ── CHART HELPERS ──────────────────────────────────────────── */

/* Generic single-dataset bar */
function buildSimpleBar(canvasId, labels, data, opts = {}) {
  destroyChart(canvasId);
  const ctx = document.getElementById(canvasId);
  if (!ctx) return;
  const colors = Array.isArray(opts.colors) ? opts.colors
    : new Array(data.length).fill(opts.colors || C.sage);
  ChartRegistry[canvasId] = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: opts.label || '',
        data,
        backgroundColor: colors,
        borderRadius: 6,
        borderSkipped: false,
      }],
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: {
        y: {
          beginAtZero: true,
          max: opts.yMax || undefined,
          grid: { color: '#EEF1EF' },
          ticks: opts.yPct ? { callback: v => v + '%' } : {},
        },
        x: { grid: { display: false } },
      },
    },
  });
}

/* Doughnut */
function buildDoughnut(canvasId, labels, data, colors) {
  destroyChart(canvasId);
  const ctx = document.getElementById(canvasId);
  if (!ctx) return;
  ChartRegistry[canvasId] = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{ data, backgroundColor: colors, borderWidth: 0, hoverOffset: 6 }],
    },
    options: {
      responsive: true,
      cutout: '62%',
      plugins: { legend: { position: 'bottom', labels: { padding: 14, font: { size: 11 } } } },
    },
  });
}

/* Min/max/avg range bar (floating bars) */
function buildRangeBar(canvasId, labels, lows, avgs, highs) {
  destroyChart(canvasId);
  const ctx = document.getElementById(canvasId);
  if (!ctx) return;
  ChartRegistry[canvasId] = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        { label: 'Range',   data: labels.map((_, i) => [lows[i], highs[i]]), backgroundColor: 'rgba(64,145,108,.18)', borderRadius: 4 },
        { label: 'Average', data: avgs, type: 'line', borderColor: C.forest, backgroundColor: 'transparent', pointRadius: 5, tension: 0.3 },
      ],
    },
    options: {
      responsive: true,
      plugins: { legend: { position: 'bottom' } },
      scales: {
        y: { min: 0, max: 100, ticks: { callback: v => v + '%' }, grid: { color: '#EEF1EF' } },
        x: { grid: { display: false } },
      },
    },
  });
}

/* Skill colour palette (7 distinct but harmonious) */
const skillColors = ['#1B4332','#40916C','#52B788','#74C69D','#C97B2A','#E8B86D','#8A9A8F'];

/* ── HELPERS ────────────────────────────────────────────────── */
function avg(arr) {
  const valid = arr.filter(v => v !== null && v !== undefined && !isNaN(v));
  return valid.length ? Math.round(valid.reduce((a, b) => a + b, 0) / valid.length) : 0;
}

function heatClass(score) {
  if (!score) return 'hm-0';
  if (score >= 92) return 'hm-100';
  if (score >= 82) return 'hm-90';
  if (score >= 72) return 'hm-80';
  if (score >= 62) return 'hm-70';
  if (score >= 52) return 'hm-60';
  if (score >= 42) return 'hm-50';
  if (score >= 32) return 'hm-40';
  if (score >= 22) return 'hm-30';
  if (score > 0)   return 'hm-20';
  return 'hm-0';
}

function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

function setStatus(state, text) {
  const dot   = document.getElementById('status-dot');
  const label = document.getElementById('status-label');
  if (dot)   dot.className = 'status-dot ' + (state === 'live' ? 'live' : state);
  if (label) label.textContent = text;
}

function hideLoader() {
  const overlay = document.getElementById('loading-overlay');
  if (overlay) {
    overlay.classList.add('hidden');
    setTimeout(() => { overlay.style.display = 'none'; }, 400);
  }
}

/* ── NAVIGATION ─────────────────────────────────────────────── */
function navigate(sectionId) {
  /* Swap visible section */
  document.querySelectorAll('.page-section').forEach(s => s.classList.remove('active'));
  const section = document.getElementById(sectionId);
  if (section) section.classList.add('active');

  /* Highlight nav item */
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  const navItem = document.querySelector(`[data-section="${sectionId}"]`);
  if (navItem) navItem.classList.add('active');

  /* Update topbar subtitle */
  const subtitle = document.getElementById('topbar-section-name');
  if (subtitle && navItem) subtitle.textContent = navItem.textContent.trim();

  /* Lazy-render: only build charts the first time a section is visited,
     AND only when data is already loaded.  If called before data loads,
     renderSection is skipped here — renderAll() handles the initial render. */
  if (!renderedSections.has(sectionId) && Store.weekly.length + Store.endpoint.length + Store.followup.length > 0) {
    renderedSections.add(sectionId);
    renderSection(sectionId);
  }
}

/* ── INIT ───────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {

  /* Nav item clicks */
  document.querySelectorAll('.nav-item[data-section]').forEach(item => {
    item.addEventListener('click', () => navigate(item.dataset.section));
  });

  /* Participant search */
  const searchInput = document.getElementById('participant-search');
  if (searchInput) {
    searchInput.addEventListener('input', e => renderParticipants(e.target.value));
  }

  /* Activity log filters */
  const typeFilter   = document.getElementById('activity-filter-type');
  const personFilter = document.getElementById('activity-filter-person');
  const clearFilter  = document.getElementById('activity-filter-clear');

  function applyActivityFilters() {
    renderActivityTable(
      typeFilter   ? typeFilter.value   : '',
      personFilter ? personFilter.value : ''
    );
  }

  if (typeFilter)   typeFilter.addEventListener('change', applyActivityFilters);
  if (personFilter) personFilter.addEventListener('change', applyActivityFilters);
  if (clearFilter)  clearFilter.addEventListener('click', () => {
    if (typeFilter)   typeFilter.value = '';
    if (personFilter) personFilter.value = '';
    renderActivityTable();
  });

  /* Mobile sidebar hamburger */
  const hamburger = document.getElementById('hamburger');
  const sidebar   = document.getElementById('sidebar');
  if (hamburger && sidebar) {
    hamburger.addEventListener('click', e => {
      e.stopPropagation();
      sidebar.classList.toggle('open');
    });
    document.addEventListener('click', e => {
      if (!sidebar.contains(e.target) && !hamburger.contains(e.target)) {
        sidebar.classList.remove('open');
      }
    });
  }

  /* Start on the first executive dashboard */
  navigate('sec-exec-readiness');

  /* Load data — renders first section + utilities when done */
  loadAllData();
});