const PERIODS = [
    { key: "1H", label: "1H", metricId: "perf_1H", filterId: "btn_1H" },
    { key: "1W", label: "1W", metricId: "perf_1W", filterId: "btn_1W" },
    { key: "1M", label: "1M", metricId: "perf_1M", filterId: "btn_1M" },
    { key: "YTD", label: "YTD", metricId: "perf_YTD", filterId: "btn_YTD" },
    { key: "6M", label: "6M", metricId: "perf_6M", filterId: "btn_6M" },
    { key: "1Y", label: "1Y", metricId: "perf_1Y", filterId: "btn_1Y" },
    { key: "5Y", label: "5Y", metricId: "perf_5Y", filterId: "btn_5Y" }
];

let currentData = null;
let activeKey = "1M";

function getRoot() {
    let root = document.getElementById("finly-root");
    if (!root) {
        root = document.createElement("div");
        root.id = "finly-root";
        document.body.innerHTML = "";
        document.body.appendChild(root);
    }
    return root;
}

function safeNumber(value) {
    if (value == null || value === "") return null;
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
}

function formatPercent(value) {
    const n = safeNumber(value);
    if (n == null) return "--";
    const sign = n > 0 ? "+" : "";
    return `${sign}${n.toFixed(2)}%`;
}

function getMetricValue(data, metricId) {
    try {
        const rows = data.tables.DEFAULT;
        if (!rows || !rows.length) return null;

        const firstRow = rows[0];
        if (!firstRow || !(metricId in firstRow)) return null;

        const cell = firstRow[metricId];
        if (cell && typeof cell === "object" && "value" in cell) {
            return cell.value;
        }

        return firstRow[metricId];
    } catch (e) {
        console.error("getMetricValue error:", e);
        return null;
    }
}

function getConceptId(data, fieldId) {
    try {
        if (!data || !data.fields) return null;

        const allFields = [
            ...(data.fields.dimensions || []),
            ...(data.fields.metrics || [])
        ];

        const found = allFields.find((f) => f.id === fieldId || f.name === fieldId);
        return found ? found.id : null;
    } catch (e) {
        console.error("getConceptId error:", e);
        return null;
    }
}

function applyPeriodFilter(periodKey) {
    try {
        if (!currentData) return;

        const selected = PERIODS.find((p) => p.key === periodKey);
        if (!selected) return;

        const interactionId = "periodFilter";
        const conceptId = getConceptId(currentData, selected.filterId);

        if (!conceptId) {
            console.warn("Filter concept not found:", selected.filterId);
            activeKey = periodKey;
            renderTabs(currentData, activeKey);
            return;
        }

        dscc.sendInteraction(interactionId, dscc.InteractionType.FILTER, {
            concepts: [conceptId],
            values: [["true"]]
        });

        activeKey = periodKey;
        renderTabs(currentData, activeKey);
        console.log("Applied filter:", selected.filterId);
    } catch (e) {
        console.error("applyPeriodFilter error:", e);
    }
}

function renderTabs(data, activePeriodKey = "1M") {
    const root = getRoot();

    root.innerHTML = `
    <div class="fa-tabs-wrap">
      ${PERIODS.map((p) => {
        const value = formatPercent(getMetricValue(data, p.metricId));
        return `
          <button class="fa-tab ${p.key === activePeriodKey ? "active" : ""}" data-key="${p.key}">
            <div class="fa-tab-label">${p.label}</div>
            <div class="fa-tab-value">${value}</div>
          </button>
        `;
    }).join("")}
    </div>
  `;

    root.querySelectorAll(".fa-tab").forEach((btn) => {
        btn.addEventListener("click", () => {
            const key = btn.getAttribute("data-key");
            applyPeriodFilter(key);
        });
    });
}

function drawViz(data) {
    currentData = data;
    renderTabs(currentData, activeKey);
    console.log("Looker data:", data);
}

dscc.subscribeToData(drawViz, { transform: dscc.objectTransform });