"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.openWeeklySummaryPanel = openWeeklySummaryPanel;
const vscode = __importStar(require("vscode"));
function escapeHtml(input) {
    return input
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");
}
function openWeeklySummaryPanel(payload, insights) {
    const panel = vscode.window.createWebviewPanel("tenderObserverWeeklySummary", "Tender Observer: Weekly Summary", vscode.ViewColumn.Beside, { enableScripts: false });
    const listHtml = insights.map((line) => `<li>${escapeHtml(line)}</li>`).join("");
    const states = payload.summary.stateCounts;
    panel.webview.html = `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Weekly Summary</title>
  <style>
    :root {
      --bg: #f7f5f1;
      --ink: #2d2a27;
      --card: #ffffff;
      --line: #e4dfd8;
      --muted: #6e6760;
    }
    body {
      margin: 0;
      padding: 20px;
      background: var(--bg);
      color: var(--ink);
      font-family: "Segoe UI", sans-serif;
    }
    h1 {
      font-size: 18px;
      margin: 0 0 14px 0;
    }
    .meta {
      color: var(--muted);
      font-size: 12px;
      margin-bottom: 16px;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
      gap: 10px;
      margin-bottom: 16px;
    }
    .card {
      background: var(--card);
      border: 1px solid var(--line);
      border-radius: 10px;
      padding: 10px;
      font-size: 13px;
    }
    h2 {
      font-size: 14px;
      margin: 0 0 8px 0;
    }
    ul {
      margin: 8px 0 0 0;
      padding-left: 18px;
      line-height: 1.6;
    }
  </style>
</head>
<body>
  <h1>주간 요약</h1>
  <div class="meta">업데이트: ${escapeHtml(payload.updatedAt)}</div>

  <div class="grid">
    <div class="card">총 스냅샷: <strong>${payload.summary.totalSnapshots}</strong></div>
    <div class="card">Whisper 횟수: <strong>${payload.summary.whisperCount}</strong></div>
    <div class="card">평균 타이핑/분: <strong>${payload.summary.averageTypingPerMinute}</strong></div>
    <div class="card">평균 전환/분: <strong>${payload.summary.averageSwitchesPerMinute}</strong></div>
    <div class="card">평균 유휴(분): <strong>${payload.summary.averageIdleMinutes}</strong></div>
    <div class="card">평균 강도: <strong>${payload.summary.averageIntensity}</strong></div>
  </div>

  <div class="grid">
    <div class="card">calm: <strong>${states.calm}</strong></div>
    <div class="card">focused: <strong>${states.focused}</strong></div>
    <div class="card">anxious: <strong>${states.anxious}</strong></div>
    <div class="card">idle: <strong>${states.idle}</strong></div>
    <div class="card">lost: <strong>${states.lost}</strong></div>
  </div>

  <div class="card">
    <h2>인사이트</h2>
    <ul>${listHtml}</ul>
  </div>
</body>
</html>`;
}
//# sourceMappingURL=weeklySummaryPanel.js.map