
/* =========================
CHART SYSTEM (CLEAN VERSION)
========================= */

function createReadinessChart() {
    const canvas = document.getElementById("readinessChart");
    if (!canvas) return;

    new Chart(canvas, {
        type: "line",
        data: {
            labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
            datasets: [{
                label: "Readiness Score",
                data: [58, 63, 67, 74, 79, 82],
                borderColor: "#2E7D4F",
                backgroundColor: "rgba(46,125,79,0.15)",
                fill: true,
                tension: 0.4,
                pointBackgroundColor: "#2E7D4F",
                pointRadius: 4
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    display: true,
                    labels: {
                        color: "#2F3432"
                    }
                },
                tooltip: {
                    enabled: true
                }
            },
            scales: {
                x: {
                    grid: { display: false }
                },
                y: {
                    suggestedMin: 40,
                    suggestedMax: 100
                }
            }
        }
    });
}

function createBarrierChart() {
    const canvas = document.getElementById("barrierChart");
    if (!canvas) return;

    new Chart(canvas, {
        type: "doughnut",
        data: {
            labels: [
                "Transportation",
                "Housing",
                "Mental Health",
                "Documentation"
            ],
            datasets: [{
                data: [35, 25, 20, 20],
                backgroundColor: [
                    "#D23838",
                    "#F4B400",
                    "#2E7D4F",
                    "#2D5C8A"
                ],
                borderWidth: 2,
                borderColor: "#FFFFFF"
            }]
        },
        options: {
            responsive: true,
            cutout: "65%",
            plugins: {
                legend: {
                    position: "bottom",
                    labels: {
                        color: "#2F3432",
                        padding: 15
                    }
                }
            }
        }
    });
}

/* =========================
INIT CHARTS
========================= */

document.addEventListener("DOMContentLoaded", function () {
    createReadinessChart();
    createBarrierChart();
});