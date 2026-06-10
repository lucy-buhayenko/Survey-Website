/* =============================================
   KEY NORMALIZER
   Strips whitespace, newlines, lowercases
============================================= */
function normalizeKey(key) {
  return key.replace(/\n/g, " ").replace(/\s+/g, " ").trim().toLowerCase();
}

function cleanRow(row) {
  const out = {};
  Object.keys(row).forEach(k => { out[normalizeKey(k)] = row[k]; });
  return out;
}

/* =============================================
   WEEKLY NORMALIZER
============================================= */
function normalizeWeekly(row) {
  const r = cleanRow(row);
  return {
    source: "weekly",
    recordId:           r["id"],
    startTime:          r["start time"],
    participantName:    (r["participant's name (first and last)?"] || "Unknown").trim(),
    evaluatorName:      (r["evaluator/staff name (first and last)?"] || "Unknown").trim(),
    workTrack:          r["applied work experience track which applied work experience track did the participant primarily work in this week?"] || "Unknown",

    oralCommunication:  r["oral communication how effectively did the participant practice professional oral communication this week? (avoiding slang, pausing before speaking, respectful tone)"],
    writtenComm:        r["written communication what percentage of the participant's written communications used complete sentences, accurate punctuation, and no lazy one-word answers?"],
    responseTime:       r["written response time how promptly did the participant respond to digital messages and requests this week?"],
    commitments:        r["keeping commitments how consistently did the participant keep scheduled commitments, follow through on tasks, and own mistakes this week?"],
    materialPrep:       r["material preparedness what percentage of sessions did the participant arrive with all physical workplace tools? (charged laptop, notebook, pen, assignment materials)"],
    mentalFocus:        r["mental preparedness & focus how mentally prepared was the participant this week? (arrived focused, alert, and maintained consistent effort across sessions)"],
    applyingFeedback:   r["applying feedback how effectively did the participant apply feedback this week?"],
    punctuality:        r["punctuality rate what percentage of scheduled sessions and workshops did the participant arrive to on time this week?"],
    deadlineMgmt:       r["task deadline management how consistently did the participant complete tasks by their deadlines?"],
    taskAccuracy:       r["task accuracy of the work completed by the participant this week, what percentage was done accurately without requiring significant corrections or re-work?"],
    groupActivities:    r["group activities count how many group activities did the participant participate in this week?"],
    leadership:         r["leadership occurrences how many times did you observe the participant demonstrate leadership behaviors this week? (volunteering for extra tasks, leading a group, helping/guiding a peer)"],
    trackFeedback:      r["participant feedback how engaging, useful, or motivating did the participant find their primary work track assignment this week?"],
    selfAwareness:      r["self-awareness & review how accurately could the participant identify the workplace skills they used and describe their personal performance during weekly review?"],
  };
}

/* =============================================
   ENDPOINT NORMALIZER
============================================= */
function normalizeEndpoint(row) {
  const r = cleanRow(row);
  return {
    source: "endpoint",
    recordId:           r["id"],
    startTime:          r["start time"],
    participantName:    (r["participant's name (first and last)?"] || "Unknown").trim(),
    evaluatorName:      (r["evaluator/staff name (first and last)?"] || "Unknown").trim(),

    placementStatus:    r["official job placement status has the student successfully secured an official employment placement by their graduation date?"],
    totalApplications:  r["total job applications submitted what is the final total count of actual job applications this student submitted during their time in the program?"],
    professionalsContacted: r["total professionals contacted how many industry professionals, employers, or corporate partners did the student actively network with?"],
    referencesSecured:  r["professional references secured how many verified professional references (staff, supervisors, or partners) has the participant successfully secured for their job search portfolio?"],
    resumeStatus:       r["final resume status what is the quality of the participant's resume at program completion?"],
    mockInterviewScore: r["graduation mock interview what was the participant's final mock interview score (based on the vdp mock interview rubric)?"],
    growthAwareness:    r["post-program growth awareness can the participant clearly articulate the specific personal or professional growth areas they still need to work on after program completion?"],
    professionalism:    r["professionalism synthesizing all growth, is the student ready to participate effectively and handle themselves appropriately in a professional environment?"],
    followUpRisk:       r["follow-up communication expectation based on their digital response times during the program, what is the expected risk level for tracking this student's 30/60/90-day job retention?"],
  };
}

/* =============================================
   FOLLOWUP NORMALIZER
   (Two-row layout: milestone row + data row)
   Column A is the retention milestone status (no header),
   then the rest have headers.
============================================= */
function normalizeFollowup(row) {
  const r = cleanRow(row);

  // The first column has no header - it holds the retention milestone value
  // SheetJS assigns it "__rownum__" or similar, so we check a few candidates
  // and also scan for any key that has a retention-milestone-like value
  let retentionMilestone = r["c"] || r[""] || r["__empty"] || "";

  // Fallback: scan all keys for the milestone string pattern
  if (!retentionMilestone) {
    Object.entries(r).forEach(([k, v]) => {
      if (typeof v === "string" && (v.includes("Retention") || v.includes("Employed") || v.includes("Not Employed"))) {
        if (!retentionMilestone) retentionMilestone = v;
      }
    });
  }

  return {
    source: "followup",
    recordId:           r["id"],
    startTime:          r["start time"],
    participantName:    (r["participant's name (first and last)?"] || "Unknown").trim(),
    evaluatorName:      (r["evaluator/staff name (first and last)?"] || "Unknown").trim(),

    retentionMilestone: retentionMilestone || "Unknown",
    timeToHire:         r["time to hire how long did it take the participant to obtain employment since starting the vdp?"],
    employmentStatus:   r["employment status what is the participant's current employment status?"],
    certificationsEarned: r["post-program certifications earned has the participant earned a credential or certification since completing the program?"],
    attendanceReliability: r["workplace attendance reliability how would you rate the participant's attendance reliability at work?"],
    selfEfficacy:       r["participant self-efficacy & confidence how confident does the participant feel regarding their daily job performance and duties?"],
    workplaceIncidents: r["workplace incidents how many professional issues, conflicts, or disciplinary actions has the participant experienced on the job?"],
    vdpFeedback:        r["vdp framework feedback how helpful does the participant feel the vdp framework was in preparing them for this employment opportunity?"],
    commResponsiveness: r["communication responsiveness how responsive is the graduate to staff follow-up texts, calls, or surveys?"],
  };
}

/* =============================================
   SCORE ENGINE
   Returns 0-100 from any descriptive answer
============================================= */
function mapScore(value) {
  if (!value) return null;
  const v = value.toString().toLowerCase().trim();

  // Qualitative performance
  if (v.includes("excellent"))                             return 100;
  if (v.includes("consistently dependable"))               return 95;
  if (v.includes("good"))                                  return 80;
  if (v.includes("developing"))                            return 60;
  if (v.includes("fair"))                                  return 50;
  if (v.includes("struggling") || v.includes("poor"))      return 30;

  // Alignment
  if (v.includes("high alignment"))                        return 95;
  if (v.includes("moderate alignment"))                    return 70;
  if (v.includes("low alignment"))                         return 35;

  // Percentage brackets
  if (v.includes("81-100") || v.includes("81–100"))        return 95;
  if (v.includes("61-80")  || v.includes("61–80"))         return 75;
  if (v.includes("41-60")  || v.includes("41–60"))         return 55;
  if (v.includes("21-40")  || v.includes("21–40"))         return 35;
  if (v.includes("0-20")   || v.includes("0–20"))          return 15;

  // Response time
  if (v.includes("same day"))                              return 100;
  if (v.includes("next business day") || v.includes("24 hours")) return 80;
  if (v.includes("within 2"))                              return 60;
  if (v.includes("within 1 week"))                         return 35;

  // Commitments
  if (v.includes("kept all"))                              return 100;
  if (v.includes("missed 1") && v.includes("advance"))     return 75;
  if (v.includes("missed 1") && v.includes("without"))     return 55;
  if (v.includes("missed 2"))                              return 30;

  // Leadership / group activity counts
  if (v.includes("3 or more"))                             return 100;
  if (v.startsWith("2"))                                   return 75;
  if (v.startsWith("1"))                                   return 50;
  if (v.startsWith("0"))                                   return 0;

  // Self-awareness
  if (v.includes("highly reflective"))                     return 100;
  if (v.includes("surface-level"))                         return 60;
  if (v.includes("unaware"))                               return 20;

  return null;
}

/* =============================================
   WEEKLY READINESS SCORE (0-100)
============================================= */
function calcWeeklyReadiness(w) {
  const fields = [
    [w.oralCommunication, 0.10],
    [w.writtenComm,       0.08],
    [w.responseTime,      0.07],
    [w.commitments,       0.12],
    [w.mentalFocus,       0.12],
    [w.applyingFeedback,  0.10],
    [w.punctuality,       0.10],
    [w.deadlineMgmt,      0.10],
    [w.taskAccuracy,      0.13],
    [w.leadership,        0.04],
    [w.groupActivities,   0.04],
  ];

  let total = 0, wSum = 0;
  fields.forEach(([val, weight]) => {
    const s = mapScore(val);
    if (s !== null) { total += s * weight; wSum += weight; }
  });

  return wSum > 0 ? Math.round(total / wSum) : 0;
}

/* =============================================
   ENDPOINT SCORE (0-100)
============================================= */
function calcEndpointScore(e) {
  const placementMap = {
    "yes, placed in full-time employment": 100,
    "yes, placed in part-time employment": 80,
    "no, graduated but still actively looking": 55,
    "no, graduated but not looking": 25,
    "no, exited early": 0,
  };

  let placementScore = 50;
  if (e.placementStatus) {
    const v = e.placementStatus.toLowerCase();
    Object.entries(placementMap).forEach(([k, val]) => {
      if (v.includes(k)) placementScore = val;
    });
  }

  const interviewScore = mapScore(e.mockInterviewScore) ?? 50;
  const profScore      = mapScore(e.professionalism)    ?? 50;
  const growthScore    = mapScore(e.growthAwareness)    ?? 50;

  return Math.round(
    placementScore * 0.40 +
    interviewScore * 0.25 +
    profScore      * 0.20 +
    growthScore    * 0.15
  );
}

/* =============================================
   FOLLOWUP SCORE (0-100)
============================================= */
function calcFollowupScore(f) {
  const milestoneMap = {
    "achieved 90-day retention milestone": 100,
    "achieved 30-day retention milestone": 75,
    "employed (less than 30 days)":         50,
    "not employed":                          15,
  };

  let milestoneScore = 50;
  if (f.retentionMilestone) {
    const v = f.retentionMilestone.toLowerCase();
    Object.entries(milestoneMap).forEach(([k, val]) => {
      if (v.includes(k)) milestoneScore = val;
    });
  }

  const attendScore  = mapScore(f.attendanceReliability) ?? 50;
  const efficacyScore = mapScore(f.selfEfficacy)         ?? 50;

  // Incidents: 0 = 100, 1 = 60, 2+ = 20
  let incidentScore = 80;
  if (f.workplaceIncidents !== undefined && f.workplaceIncidents !== null) {
    const n = parseInt(f.workplaceIncidents);
    if (!isNaN(n)) incidentScore = n === 0 ? 100 : n === 1 ? 60 : 20;
  }

  return Math.round(
    milestoneScore * 0.45 +
    attendScore    * 0.20 +
    efficacyScore  * 0.20 +
    incidentScore  * 0.15
  );
}