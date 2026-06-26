const metrics = [
  {
    key: "vigor",
    name: "精力",
    hint: "睡眠、體能、精神恢復",
    action: "固定一個睡眠收尾時間，安排 2 次低門檻運動。"
  },
  {
    key: "wealth",
    name: "財務",
    hint: "收入、現金流、風險緩衝",
    action: "整理本週支出，設定一個可自動化的儲蓄或還款動作。"
  },
  {
    key: "capability",
    name: "能力",
    hint: "技能、判斷、可替代性",
    action: "選一個最有回報的技能，排入 3 次 30 分鐘練習。"
  },
  {
    key: "connection",
    name: "關係",
    hint: "家庭、朋友、合作網絡",
    action: "主動約一位重要的人，進行一次不趕時間的交流。"
  },
  {
    key: "execution",
    name: "執行",
    hint: "專注、節奏、完成率",
    action: "每天先完成一件最重要的小任務，再開通訊軟體。"
  },
  {
    key: "fulfillment",
    name: "成就感",
    hint: "意義、滿足、內在動機",
    action: "寫下本週最想完成的一件事，拆成可以今天開始的第一步。"
  },
  {
    key: "stability",
    name: "穩定",
    hint: "秩序、安全感、生活基礎",
    action: "清理一個反覆消耗你的流程，讓它變成固定檢查清單。"
  },
  {
    key: "hygiene",
    name: "環境",
    hint: "空間、工具、日常維護",
    action: "花 20 分鐘整理最常使用的工作區，移除一個干擾源。"
  }
];

const influence = [
  [0, 0.15, 0.20, 0.25, 0.40, 0.35, 0.45, 0.20],
  [0.15, 0, 0.20, 0.35, 0.30, 0.45, 0.25, 0.10],
  [0.20, 0.45, 0, 0.30, 0.25, 0.40, 0.15, 0.10],
  [0.10, 0.40, 0.15, 0, 0.20, 0.45, 0.30, 0.15],
  [0.30, 0.45, 0.40, 0.30, 0, 0.50, 0.35, 0.55],
  [0.40, 0.20, 0.35, 0.45, 0.50, 0, 0.30, 0.15],
  [0.40, 0.20, 0.20, 0.25, 0.45, 0.35, 0, 0.30],
  [0.50, 0.10, 0.25, 0.30, 0.40, 0.20, 0.35, 0]
];

const storageKey = "life-planner-scores";
const defaultScores = [5, 5, 5, 5, 5, 5, 5, 5];
const sampleScores = [7.2, 4.5, 6.8, 3.2, 5.8, 4.0, 6.0, 2.8];

const inputRoot = document.getElementById("inputs");
const priorityName = document.getElementById("priorityName");
const priorityReason = document.getElementById("priorityReason");
const leverageName = document.getElementById("leverageName");
const leverageReason = document.getElementById("leverageReason");
const overallScore = document.getElementById("overallScore");
const overallLabel = document.getElementById("overallLabel");
const actionList = document.getElementById("actionList");
const detailRows = document.getElementById("detailRows");

function buildInputs() {
  metrics.forEach((metric, index) => {
    const row = document.createElement("label");
    row.className = "metric-row";
    row.innerHTML = `
      <span>
        <span class="metric-title">
          <strong>${metric.name}</strong>
          <span>${metric.hint}</span>
        </span>
      </span>
      <input id="score-${index}" type="number" min="0" max="10" step="0.1" value="5.0" inputmode="decimal">
      <input id="slider-${index}" type="range" min="0" max="10" step="0.1" value="5.0" aria-label="${metric.name}">
    `;
    inputRoot.appendChild(row);

    const number = row.querySelector(`#score-${index}`);
    const slider = row.querySelector(`#slider-${index}`);

    number.addEventListener("input", () => {
      const value = clamp(Number(number.value), 0, 10);
      slider.value = value;
      update();
    });

    slider.addEventListener("input", () => {
      number.value = Number(slider.value).toFixed(1);
      update();
    });
  });
}

function getScores() {
  return metrics.map((_, index) => {
    const input = document.getElementById(`score-${index}`);
    return clamp(Number(input.value), 0, 10);
  });
}

function setScores(scores) {
  scores.forEach((score, index) => {
    const value = clamp(Number(score), 0, 10);
    document.getElementById(`score-${index}`).value = value.toFixed(1);
    document.getElementById(`slider-${index}`).value = value;
  });
  update();
}

function analyze(scores) {
  const outgoing = influence.map((row) => row.reduce((sum, value) => sum + value, 0));
  const incoming = influence[0].map((_, col) => influence.reduce((sum, row) => sum + row[col], 0));
  const maxOutgoing = Math.max(...outgoing);
  const maxIncoming = Math.max(...incoming);

  const rows = metrics.map((metric, index) => {
    const gap = 10 - scores[index];
    const leverage = outgoing[index] / maxOutgoing;
    const dependency = incoming[index] / maxIncoming;
    const priority = gap * (0.7 + leverage * 0.3);
    return {
      ...metric,
      index,
      score: scores[index],
      gap,
      leverage,
      dependency,
      priority
    };
  });

  rows.sort((a, b) => b.priority - a.priority);
  const byLeverage = [...rows].sort((a, b) => b.leverage - a.leverage);
  const average = scores.reduce((sum, score) => sum + score, 0) / scores.length;

  return {
    rows,
    priority: rows[0],
    leverage: byLeverage[0],
    average
  };
}

function update() {
  const scores = getScores();
  const result = analyze(scores);

  priorityName.textContent = `${result.priority.name} ${result.priority.score.toFixed(1)}`;
  priorityReason.textContent = `缺口 ${result.priority.gap.toFixed(1)}，影響力 ${percent(result.priority.leverage)}`;

  leverageName.textContent = result.leverage.name;
  leverageReason.textContent = `能帶動其他面向的比例最高：${percent(result.leverage.leverage)}`;

  overallScore.textContent = result.average.toFixed(1);
  overallLabel.textContent = getOverallLabel(result.average);

  renderActions(result.rows.slice(0, 3));
  renderDetails(result.rows);
  drawScoreChart(scores, result.rows);
  drawHeatmap(scores);
}

function renderActions(items) {
  actionList.innerHTML = "";
  items.forEach((item) => {
    const li = document.createElement("li");
    li.innerHTML = `
      <strong>${item.name}: ${item.action}</strong>
      <span class="metric-meta">目前 ${item.score.toFixed(1)} / 10，優先度 ${item.priority.toFixed(1)}。</span>
    `;
    actionList.appendChild(li);
  });
}

function renderDetails(rows) {
  detailRows.innerHTML = "";
  rows.forEach((item) => {
    const row = document.createElement("div");
    row.className = "detail-row";
    row.innerHTML = `
      <div>
        <strong>${item.name}</strong>
        <div class="detail-meta">${item.hint}</div>
      </div>
      <div class="bar-track" aria-label="${item.name} 優先度">
        <div class="bar-fill" style="--width: ${clamp(item.priority * 10, 4, 100)}%"></div>
      </div>
      <span class="badge ${badgeClass(item.score)}">${badgeText(item.score)}</span>
    `;
    detailRows.appendChild(row);
  });
}

function drawScoreChart(scores, rows) {
  const canvas = document.getElementById("scoreChart");
  const ctx = setupCanvas(canvas);
  const width = canvas.clientWidth || 760;
  const height = Math.max(320, width * 0.47);
  const ordered = [...rows].sort((a, b) => b.priority - a.priority);
  const left = Math.max(86, width * 0.16);
  const right = 48;
  const top = 24;
  const rowH = (height - top - 24) / metrics.length;
  const graphW = width - left - right;

  ctx.clearRect(0, 0, width, height);
  ctx.font = "12px Segoe UI, Noto Sans TC, Arial";
  ctx.textBaseline = "middle";

  ordered.forEach((item, row) => {
    const y = top + row * rowH;
    const scoreW = graphW * (item.score / 10);
    const priorityW = graphW * (item.priority / 10);

    ctx.fillStyle = "#172123";
    ctx.fillText(item.name, 12, y + rowH / 2);

    ctx.fillStyle = "#edf1f2";
    roundRect(ctx, left, y + 6, graphW, rowH - 12, 5);
    ctx.fill();

    ctx.fillStyle = "#0f766e";
    roundRect(ctx, left, y + 6, scoreW, rowH - 12, 5);
    ctx.fill();

    ctx.fillStyle = "rgba(180, 83, 9, 0.22)";
    roundRect(ctx, left, y + rowH - 12, priorityW, 5, 3);
    ctx.fill();

    ctx.fillStyle = "#657174";
    ctx.fillText(item.score.toFixed(1), left + graphW + 10, y + rowH / 2);
  });
}

function drawHeatmap(scores) {
  const canvas = document.getElementById("heatmap");
  const ctx = setupCanvas(canvas);
  const width = canvas.clientWidth || 760;
  const height = Math.max(320, width * 0.47);
  const labelW = Math.max(82, width * 0.14);
  const top = 18;
  const size = metrics.length;
  const cell = Math.min((width - labelW - 16) / size, (height - top - 20) / size);
  const max = Math.max(...influence.flat());

  ctx.clearRect(0, 0, width, height);
  ctx.font = "12px Segoe UI, Noto Sans TC, Arial";
  ctx.textBaseline = "middle";

  metrics.forEach((metric, row) => {
    ctx.fillStyle = "#172123";
    ctx.fillText(metric.name, 12, top + row * cell + cell / 2);

    metrics.forEach((_, col) => {
      const impact = influence[row][col] * (scores[row] / 10);
      const x = labelW + col * cell;
      const y = top + row * cell;
      ctx.fillStyle = colorRamp(impact / max);
      ctx.fillRect(x, y, cell, cell);
      ctx.strokeStyle = "#d9e0e3";
      ctx.strokeRect(x, y, cell, cell);
    });
  });
}

function setupCanvas(canvas) {
  const dpr = window.devicePixelRatio || 1;
  const width = canvas.clientWidth || 760;
  const height = Math.max(320, width * 0.47);
  canvas.width = Math.floor(width * dpr);
  canvas.height = Math.floor(height * dpr);
  const ctx = canvas.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return ctx;
}

function colorRamp(value) {
  const t = clamp(value, 0, 1);
  const r = Math.round(245 - t * 135);
  const g = Math.round(248 - t * 92);
  const b = Math.round(248 - t * 100);
  return `rgb(${r}, ${g}, ${b})`;
}

function roundRect(ctx, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}

function getOverallLabel(score) {
  if (score >= 8) return "狀態很好，適合維持節奏並挑一項突破。";
  if (score >= 6) return "基礎穩定，先補一個最拖累的缺口。";
  if (score >= 4) return "需要收斂焦點，先做最小可持續行動。";
  return "先降低壓力和混亂，從睡眠、環境、執行三者選一個。";
}

function badgeText(score) {
  if (score < 4) return "急需補";
  if (score < 7) return "可改善";
  return "維持";
}

function badgeClass(score) {
  if (score < 4) return "danger";
  if (score < 7) return "warn";
  return "";
}

function clamp(value, min, max) {
  const safe = Number.isFinite(value) ? value : min;
  return Math.min(max, Math.max(min, safe));
}

function percent(value) {
  return `${Math.round(value * 100)}%`;
}

function loadSavedScores() {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey));
    return Array.isArray(saved) && saved.length === metrics.length ? saved : defaultScores;
  } catch {
    return defaultScores;
  }
}

buildInputs();
setScores(loadSavedScores());

document.getElementById("resetBtn").addEventListener("click", () => setScores(defaultScores));
document.getElementById("sampleBtn").addEventListener("click", () => setScores(sampleScores));
document.getElementById("saveBtn").addEventListener("click", () => {
  localStorage.setItem(storageKey, JSON.stringify(getScores()));
  document.getElementById("saveBtn").textContent = "已儲存";
  window.setTimeout(() => {
    document.getElementById("saveBtn").textContent = "儲存目前分數";
  }, 1200);
});
window.addEventListener("resize", update);
