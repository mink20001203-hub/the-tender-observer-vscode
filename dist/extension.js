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
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
class RhythmMonitor {
    context;
    keyStrokes = 0;
    fileSwitches = 0;
    lastInputAt = Date.now();
    lastWhisperAt = 0;
    lastState = "calm";
    stateStreak = 0;
    snapshots = [];
    panel;
    statusBar;
    pulseTimer;
    constructor(context) {
        this.context = context;
        this.statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 8);
        this.statusBar.text = "$(sparkle) Tender Observer";
        this.statusBar.command = "tenderObserver.openAmbient";
        this.statusBar.tooltip = "Open The Tender Observer";
        this.statusBar.show();
    }
    start() {
        this.context.subscriptions.push(vscode.workspace.onDidChangeTextDocument((event) => {
            if (event.contentChanges.length > 0) {
                this.keyStrokes += event.contentChanges.reduce((acc, item) => acc + item.text.length, 0);
                this.lastInputAt = Date.now();
            }
        }), vscode.window.onDidChangeActiveTextEditor(() => {
            this.fileSwitches += 1;
        }), vscode.commands.registerCommand("tenderObserver.openAmbient", () => this.openPanel()), vscode.commands.registerCommand("tenderObserver.openWeeklyRhythmLog", () => void this.openWeeklyRhythmLog()), vscode.commands.registerCommand("tenderObserver.secretMode", () => {
            this.postAmbient({ type: "disperse" });
            vscode.window.setStatusBarMessage("Tender Observer entered secret mode.", 1800);
        }), this.statusBar);
        this.pulseTimer = setInterval(() => {
            void this.sampleAndPersist();
        }, 60_000);
        this.context.subscriptions.push({
            dispose: () => {
                if (this.pulseTimer) {
                    clearInterval(this.pulseTimer);
                }
            }
        });
    }
    computeState(typingPerMinute, switchesPerMinute, idleMinutes) {
        if (idleMinutes >= 8) {
            return "idle";
        }
        if (switchesPerMinute >= 14 || (switchesPerMinute >= 9 && typingPerMinute < 120)) {
            return "lost";
        }
        if (typingPerMinute >= 220 || (typingPerMinute >= 150 && switchesPerMinute >= 7)) {
            return "anxious";
        }
        if (typingPerMinute >= 55 && switchesPerMinute <= 8 && idleMinutes < 2.5) {
            return "focused";
        }
        return "calm";
    }
    canWhisper(now, cooldownMinutes) {
        return now - this.lastWhisperAt >= cooldownMinutes * 60_000;
    }
    whisperForState(state, previousState, stateStreak, now, idleMinutes) {
        const hour = new Date(now).getHours();
        if (state === "anxious" && stateStreak >= 2 && this.canWhisper(now, 12)) {
            if (hour >= 2 && hour <= 5) {
                return {
                    message: "밤의 적막이 깊네요. 당신의 코드는 아름답지만, 내일의 당신을 위해 잠시 램프를 꺼두는 건 어떨까요?",
                    reason: "anxious_streak_night"
                };
            }
            return {
                message: "잠시 커피를 내리는 향기가 그리운 시간입니다. 지친 마음을 잠시 비우고 돌아오세요.",
                reason: "anxious_streak"
            };
        }
        if (state === "lost" && stateStreak >= 2 && this.canWhisper(now, 10)) {
            return {
                message: "길을 찾는 손끝에도 리듬이 있습니다. 한 파일만 고르고, 숨을 고른 뒤 다시 시작해요.",
                reason: "lost_streak"
            };
        }
        if (state === "idle" && previousState !== "idle" && idleMinutes >= 12 && this.canWhisper(now, 30)) {
            return {
                message: "고요한 틈도 작업의 일부입니다. 돌아오는 걸음이 조금 더 가벼워지길 바랍니다.",
                reason: "idle_transition_long"
            };
        }
        if (state === "focused" && previousState !== "focused" && hour >= 2 && hour <= 5 && this.canWhisper(now, 90)) {
            return {
                message: "깊은 몰입이 이어지고 있어요. 지금은 집중을 마무리하고 쉬어갈 타이밍일지도 모릅니다.",
                reason: "focused_transition_night"
            };
        }
        return undefined;
    }
    async sampleAndPersist() {
        const now = Date.now();
        const idleMinutes = (now - this.lastInputAt) / 1000 / 60;
        const typingPerMinute = this.keyStrokes;
        const switchesPerMinute = this.fileSwitches;
        this.keyStrokes = 0;
        this.fileSwitches = 0;
        const state = this.computeState(typingPerMinute, switchesPerMinute, idleMinutes);
        const previousState = this.lastState;
        this.stateStreak = state === previousState ? this.stateStreak + 1 : 1;
        this.lastState = state;
        const intensity = Math.min(1, (typingPerMinute + switchesPerMinute * 6) / 320);
        const whisper = this.whisperForState(state, previousState, this.stateStreak, now, idleMinutes);
        const snapshot = {
            timestamp: new Date(now).toISOString(),
            hour: new Date(now).getHours(),
            typingPerMinute,
            switchesPerMinute,
            idleMinutes: Number(idleMinutes.toFixed(2)),
            state,
            previousState,
            stateStreak: this.stateStreak,
            intensity: Number(intensity.toFixed(3)),
            whisperShown: Boolean(whisper),
            whisperReason: whisper?.reason
        };
        this.snapshots.push(snapshot);
        if (this.snapshots.length > 10_080) {
            this.snapshots.shift();
        }
        await this.persistWeeklyRhythm();
        this.postAmbient({
            type: "state",
            state,
            intensity
        });
        if (whisper) {
            this.lastWhisperAt = now;
            this.postAmbient({ type: "whisper", message: whisper.message });
        }
    }
    async persistWeeklyRhythm() {
        const folder = vscode.Uri.joinPath(this.context.globalStorageUri, "rhythm");
        const file = vscode.Uri.joinPath(folder, "weekly-rhythm.json");
        await vscode.workspace.fs.createDirectory(folder);
        const payload = {
            schemaVersion: 1,
            privacy: "local-memory-and-local-storage-only",
            updatedAt: new Date().toISOString(),
            snapshots: this.snapshots
        };
        const encoded = new TextEncoder().encode(JSON.stringify(payload, null, 2));
        await vscode.workspace.fs.writeFile(file, encoded);
    }
    async openWeeklyRhythmLog() {
        const folder = vscode.Uri.joinPath(this.context.globalStorageUri, "rhythm");
        const file = vscode.Uri.joinPath(folder, "weekly-rhythm.json");
        await vscode.workspace.fs.createDirectory(folder);
        try {
            await vscode.workspace.fs.stat(file);
        }
        catch {
            const emptyPayload = {
                schemaVersion: 1,
                privacy: "local-memory-and-local-storage-only",
                updatedAt: new Date().toISOString(),
                snapshots: []
            };
            const encoded = new TextEncoder().encode(JSON.stringify(emptyPayload, null, 2));
            await vscode.workspace.fs.writeFile(file, encoded);
        }
        const document = await vscode.workspace.openTextDocument(file);
        await vscode.window.showTextDocument(document, { preview: false });
    }
    openPanel() {
        if (this.panel) {
            this.panel.reveal(vscode.ViewColumn.Beside, true);
            return;
        }
        this.panel = vscode.window.createWebviewPanel("tenderObserverAmbient", "The Tender Observer", vscode.ViewColumn.Beside, {
            enableScripts: true,
            retainContextWhenHidden: true
        });
        this.panel.webview.html = this.webviewHtml(this.panel.webview);
        this.panel.onDidDispose(() => {
            this.panel = undefined;
        });
    }
    postAmbient(payload) {
        if (this.panel) {
            void this.panel.webview.postMessage(payload);
        }
    }
    webviewHtml(webview) {
        const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this.context.extensionUri, "src", "webview", "ambient.js"));
        const nonce = String(Date.now());
        return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8" />
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-${nonce}';" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>The Tender Observer</title>
  <style>
    :root {
      --ivory: #F9F8F5;
      --ink: #2f2d2a;
      --dust: rgba(80, 76, 70, 0.56);
      --mist: rgba(130, 122, 112, 0.2);
    }
    html, body {
      margin: 0;
      width: 100%;
      height: 100%;
      background: radial-gradient(circle at 30% 20%, #fffdfa 0%, var(--ivory) 48%, #f2efe9 100%);
      color: var(--ink);
      font-family: "Iowan Old Style", "Times New Roman", serif;
      overflow: hidden;
    }
    .frame {
      position: relative;
      width: 100%;
      height: 100%;
    }
    canvas {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
    }
    .whisper {
      position: absolute;
      left: 18px;
      right: 18px;
      bottom: 18px;
      padding: 12px 14px;
      border-radius: 10px;
      background: rgba(249, 248, 245, 0.72);
      backdrop-filter: blur(2px);
      border: 1px solid rgba(120, 112, 103, 0.2);
      font-size: 13px;
      line-height: 1.55;
      opacity: 0;
      transform: translateY(6px);
      transition: opacity 640ms ease, transform 640ms ease;
      letter-spacing: 0.2px;
    }
    .whisper.show {
      opacity: 1;
      transform: translateY(0);
    }
    .label {
      position: absolute;
      top: 16px;
      left: 18px;
      font-size: 11px;
      letter-spacing: 1.2px;
      text-transform: uppercase;
      color: rgba(54, 50, 45, 0.62);
    }
  </style>
</head>
<body>
  <div class="frame">
    <div class="label">The Tender Observer</div>
    <canvas id="ambient"></canvas>
    <div id="whisper" class="whisper"></div>
  </div>
  <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
    }
}
function activate(context) {
    const monitor = new RhythmMonitor(context);
    monitor.start();
    console.log("Tender Observer activated");
    void vscode.window.showInformationMessage("Tender Observer is awake.");
}
function deactivate() {
    // no-op
}
//# sourceMappingURL=extension.js.map