/* =========================
GLOBAL STATE
========================= */

let weeklyData = [];

let readinessBarChart = null;
let readinessDistributionChart = null;
let trackChart = null;


/* =========================
ROBUST KEY NORMALIZER
========================= */

function normalizeKey(key) {
    return key
        .replace(/\n/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .toLowerCase();
}


/* =========================
COLUMN NORMALIZER
========================= */

function normalizeRow(row) {

    const cleaned = {};

    Object.keys(row).forEach(key => {
        cleaned[normalizeKey(key)] = row[key];
    });

    return {
        recordId: cleaned["id"],
        startTime: cleaned["start time"],
        completionTime: cleaned["completion time"],
        email: cleaned["email"],

        participantName: cleaned["participant's name (first and last)?"] || "Unknown",
        evaluatorName: cleaned["evaluator/staff name (first and last)?"] || "Unknown",

        workTrack: cleaned["applied work experience track which applied work experience track did the participant primarily work in this week?"] || "Unknown",

        oralCommunication: cleaned["oral communication how effectively did the participant practice professional oral communication this week? (avoiding slang, pausing before speaking, respectful tone)"],

        writtenCommunication: cleaned["written communication what percentage of the participant's written communications used complete sentences, accurate punctuation, and no lazy one-word answers?"],

        responseTime: cleaned["written response time how promptly did the participant respond to digital messages and requests this week?"],

        commitments: cleaned["keeping commitments how consistently did the participant keep scheduled commitments, follow through on tasks, and own mistakes this week?"],

        materialPreparedness: cleaned["material preparedness what percentage of sessions did the participant arrive with all physical workplace tools? (charged laptop, notebook, pen, assignment materials)"],

        mentalFocus: cleaned["mental preparedness & focus how mentally prepared was the participant this week? (arrived focused, alert, and maintained consistent effort across sessions)"],

        feedback: cleaned["applying feedback how effectively did the participant apply feedback this week?"],

        punctuality: cleaned["punctuality rate what percentage of scheduled sessions and workshops did the participant arrive to on time this week?"],

        deadlineManagement: cleaned["task deadline management how consistently did the participant complete tasks by their deadlines?"],

        taskAccuracy: cleaned["task accuracy of the work completed by the participant this week, what percentage was done accurately without requiring significant corrections or re-work?"],

        groupActivities: cleaned["group activities count how many group activities did the participant participate in this week?"],

        leadership: cleaned["leadership occurrences how many times did you observe the participant demonstrate leadership behaviors this week? (volunteering for extra tasks, leading a group, helping/guiding a peer)"],

        trackFeedback: cleaned["participant feedback how engaging, useful, or motivating did the participant find their primary work track assignment this week?"],

        selfAwareness: cleaned["self-awareness & review how accurately could the participant identify the workplace skills they used and describe their personal performance during weekly review?"]
    };
}


/* =========================
LOAD EXCEL
========================= */

async function loadExcelData() {

    try {

        const response = await fetch("data/VDP_WEEKLY_ASSESSMENT_FORM.xlsx");

        const arrayBuffer = await response.arrayBuffer();

        const workbook = XLSX.read(arrayBuffer, { type: "array" });

        const sheet = workbook.Sheets[workbook.SheetNames[0]];

        const raw = XLSX.utils.sheet_to_json(sheet);

        weeklyData = raw.map(normalizeRow);

        buildDashboard();

    } catch (error) {
        console.error("Excel load failed:", error);
    }
}


/* =========================
SCORING ENGINE
========================= */

function mapScore(value) {

    if (!value) return 0;

    const v = value.toString().toLowerCase().trim();

    if (v.includes("excellent")) return 100;
    if (v.includes("consistently dependable")) return 95;
    if (v.includes("good")) return 80;
    if (v.includes("developing")) return 70;
    if (v.includes("fair")) return 55;
    if (v.includes("poor")) return 35;
    if (v.includes("struggling")) return 25;

    if (v.includes("high alignment")) return 95;
    if (v.includes("moderate alignment")) return 75;
    if (v.includes("low alignment")) return 35;

    if (v.includes("81-100") || v.includes("81–100")) return 100;
    if (v.includes("61-80") || v.includes("61–80")) return 80;
    if (v.includes("41-60") || v.includes("41–60")) return 60;
    if (v.includes("21-40") || v.includes("21–40")) return 40;

    if (v.includes("same day")) return 100;
    if (v.includes("next business day")) return 80;
    if (v.includes("within 2")) return 60;
    if (v.includes("within 1 week")) return 40;

    if (v.includes("kept all commitments")) return 100;
    if (v.includes("missed 1 commitment with advance notice")) return 75;
    if (v.includes("missed 1 commitment without notice")) return 55;
    if (v.includes("missed 2 commitments")) return 35;

    if (v.includes("3 or more")) return 100;
    if (v.includes("2")) return 75;
    if (v.includes("1")) return 50;

    return 50;
}


/* =========================
READINESS SCORE
========================= */

function calculateReadiness(row) {

    let score = 0;

    score += mapScore(row.oralCommunication) * 0.10;
    score += mapScore(row.writtenCommunication) * 0.08;
    score += mapScore(row.responseTime) * 0.07;
    score += mapScore(row.commitments) * 0.12;
    score += mapScore(row.mentalFocus) * 0.12;
    score += mapScore(row.feedback) * 0.10;
    score += mapScore(row.punctuality) * 0.10;
    score += mapScore(row.deadlineManagement) * 0.10;
    score += mapScore(row.taskAccuracy) * 0.13;
    score += mapScore(row.leadership) * 0.04;
    score += mapScore(row.groupActivities) * 0.04;

    return Math.round(score);
}


/* =========================
DASHBOARD
========================= */

function buildDashboard() {

    const scores = weeklyData.map(calculateReadiness);

    buildParticipantChart(scores);
    buildDistributionChart(scores);
    buildTrackChart();
    updateKPIs(scores);
    updateActivityTable();
}


/* =========================
KPIs
========================= */

function updateKPIs(scores) {

    const avg =
        scores.reduce((a, b) => a + b, 0) / scores.length;

    document.getElementById("activeResidents").innerText =
        weeklyData.length;

    document.getElementById("avgReadiness").innerText =
        `${Math.round(avg)}%`;

    document.getElementById("placementReady").innerText =
        scores.filter(x => x >= 80).length;

    document.getElementById("assessmentCount").innerText =
        weeklyData.length;

    document.getElementById("dataStatus").innerText =
        "Live";
}


/* =========================
CHART 1
========================= */

function buildParticipantChart(scores) {

    const ctx = document.getElementById("readinessChart");

    if (readinessBarChart) readinessBarChart.destroy();

    readinessBarChart = new Chart(ctx, {
        type: "bar",
        data: {
            labels: weeklyData.map(r => r.participantName || "Unknown"),
            datasets: [{
                label: "Readiness Score",
                data: scores,
                backgroundColor: "#2E7D4F"
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: { min: 0, max: 100 }
            }
        }
    });
}


/* =========================
CHART 2
========================= */

function buildDistributionChart(scores) {

    let low = 0, medium = 0, high = 0;

    scores.forEach(score => {
        if (score < 50) low++;
        else if (score < 80) medium++;
        else high++;
    });

    const ctx = document.getElementById("distributionChart");

    if (readinessDistributionChart)
        readinessDistributionChart.destroy();

    readinessDistributionChart = new Chart(ctx, {
        type: "doughnut",
        data: {
            labels: ["Low", "Medium", "High"],
            datasets: [{
                data: [low, medium, high],
                backgroundColor: ["#D32F2F", "#F9A825", "#2E7D4F"]
            }]
        }
    });
}


/* =========================
CHART 3
========================= */

function buildTrackChart() {

    const counts = {};

    weeklyData.forEach(r => {
        const track = r.workTrack || "Unknown";
        counts[track] = (counts[track] || 0) + 1;
    });

    const ctx = document.getElementById("trackChart");

    if (trackChart) trackChart.destroy();

    trackChart = new Chart(ctx, {
        type: "bar",
        data: {
            labels: Object.keys(counts),
            datasets: [{
                label: "Participants",
                data: Object.values(counts),
                backgroundColor: "#2D5C8A"
            }]
        },
        options: {
            indexAxis: "y",
            responsive: true
        }
    });
}


/* =========================
ACTIVITY TABLE
========================= */

function updateActivityTable() {

    const tbody = document.getElementById("activityTableBody");

    tbody.innerHTML = weeklyData.map(r => `
        <tr>
            <td>${r.participantName || "Unknown"}</td>
            <td>${r.evaluatorName || "Unknown"}</td>
            <td>${r.workTrack || "Unknown"}</td>
        </tr>
    `).join("");
}


/* =========================
START
========================= */

document.addEventListener("DOMContentLoaded", loadExcelData);


