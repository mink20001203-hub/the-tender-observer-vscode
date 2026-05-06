import * as vscode from "vscode";

type RhythmState = "calm" | "focused" | "anxious" | "idle" | "lost";
type TriggerVariant = "A" | "B";

interface RhythmSnapshot {
  timestamp: string;
  hour: number;
  typingPerMinute: number;
  switchesPerMinute: number;
  idleMinutes: number;
  state: RhythmState;
  previousState: RhythmState;
  stateStreak: number;
  intensity: number;
  whisperShown: boolean;
  whisperReason?: string;
  triggerVariant: TriggerVariant;
}

class RhythmMonitor {
  private keyStrokes = 0;
  private fileSwitches = 0;
  private lastInputAt = Date.now();
  private lastWhisperAt = 0;
  private lastState: RhythmState = "calm";
  private stateStreak = 0;
  private snapshots: RhythmSnapshot[] = [];
  private triggerVariant: TriggerVariant;
  private panel: vscode.WebviewPanel | undefined;
  private statusBar: vscode.StatusBarItem;
  private pulseTimer: NodeJS.Timeout | undefined;

  constructor(private readonly context: vscode.ExtensionContext) {
    this.triggerVariant = this.resolveTriggerVariant();
    this.statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 8);
    this.statusBar.text = "$(sparkle) Tender Observer";
    this.statusBar.command = "tenderObserver.openAmbient";
    this.statusBar.tooltip = "Open The Tender Observer";
    this.statusBar.show();
  }

  public start(): void {
    this.context.subscriptions.push(
      vscode.workspace.onDidChangeTextDocument((event) => {
        if (event.contentChanges.length > 0) {
          this.keyStrokes += event.contentChanges.reduce((acc, item) => acc + item.text.length, 0);
          this.lastInputAt = Date.now();
        }
      }),
      vscode.window.onDidChangeActiveTextEditor(() => {
        this.fileSwitches += 1;
      }),
      vscode.commands.registerCommand("tenderObserver.openAmbient", () => this.openPanel()),
      vscode.commands.registerCommand("tenderObserver.openWeeklyRhythmLog", () => void this.openWeeklyRhythmLog()),
      vscode.commands.registerCommand("tenderObserver.secretMode", () => {
        this.postAmbient({ type: "disperse" });
        vscode.window.setStatusBarMessage("Tender Observer entered secret mode.", 1800);
      }),
      this.statusBar
    );

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

  private computeState(typingPerMinute: number, switchesPerMinute: number, idleMinutes: number): RhythmState {
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

  private canWhisper(now: number, cooldownMinutes: number): boolean {
    return now - this.lastWhisperAt >= cooldownMinutes * 60_000;
  }

  private resolveTriggerVariant(): TriggerVariant {
    const key = "tenderObserver.triggerVariant";
    const existing = this.context.globalState.get<TriggerVariant>(key);
    if (existing === "A" || existing === "B") {
      return existing;
    }

    const seed = `${vscode.env.machineId}:${this.context.extension.id}`;
    const hash = [...seed].reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const assigned: TriggerVariant = hash % 2 === 0 ? "A" : "B";
    void this.context.globalState.update(key, assigned);
    return assigned;
  }

  private whisperForState(
    state: RhythmState,
    previousState: RhythmState,
    stateStreak: number,
    now: number,
    idleMinutes: number
  ): { message: string; reason: string } | undefined {
    const hour = new Date(now).getHours();
    const anxiousStreakThreshold = this.triggerVariant === "A" ? 2 : 3;
    const anxiousCooldown = this.triggerVariant === "A" ? 12 : 16;
    const lostStreakThreshold = this.triggerVariant === "A" ? 2 : 3;
    const lostCooldown = this.triggerVariant === "A" ? 10 : 14;
    const idleThresholdMinutes = this.triggerVariant === "A" ? 12 : 15;
    const idleCooldown = this.triggerVariant === "A" ? 30 : 40;
    const focusedNightCooldown = this.triggerVariant === "A" ? 90 : 120;

    if (state === "anxious" && stateStreak >= anxiousStreakThreshold && this.canWhisper(now, anxiousCooldown)) {
      if (hour >= 2 && hour <= 5) {
        return {
          message: "밤의 적막이 깊네요. 당신의 코드는 아름답지만, 내일의 당신을 위해 잠시 램프를 꺼두는 건 어떨까요?",
          reason: `anxious_streak_night_v${this.triggerVariant}`
        };
      }
      return {
        message: "잠시 커피를 내리는 향기가 그리운 시간입니다. 지친 마음을 잠시 비우고 돌아오세요.",
        reason: `anxious_streak_v${this.triggerVariant}`
      };
    }

    if (state === "lost" && stateStreak >= lostStreakThreshold && this.canWhisper(now, lostCooldown)) {
      return {
        message: "길을 찾는 손끝에도 리듬이 있습니다. 한 파일만 고르고, 숨을 고른 뒤 다시 시작해요.",
        reason: `lost_streak_v${this.triggerVariant}`
      };
    }

    if (
      state === "idle" &&
      previousState !== "idle" &&
      idleMinutes >= idleThresholdMinutes &&
      this.canWhisper(now, idleCooldown)
    ) {
      return {
        message: "고요한 틈도 작업의 일부입니다. 돌아오는 걸음이 조금 더 가벼워지길 바랍니다.",
        reason: `idle_transition_long_v${this.triggerVariant}`
      };
    }

    if (
      state === "focused" &&
      previousState !== "focused" &&
      hour >= 2 &&
      hour <= 5 &&
      this.canWhisper(now, focusedNightCooldown)
    ) {
      return {
        message: "깊은 몰입이 이어지고 있어요. 지금은 집중을 마무리하고 쉬어갈 타이밍일지도 모릅니다.",
        reason: `focused_transition_night_v${this.triggerVariant}`
      };
    }

    return undefined;
  }

  private async sampleAndPersist(): Promise<void> {
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

    const snapshot: RhythmSnapshot = {
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
      whisperReason: whisper?.reason,
      triggerVariant: this.triggerVariant
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

  private async persistWeeklyRhythm(): Promise<void> {
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

  private async openWeeklyRhythmLog(): Promise<void> {
    const folder = vscode.Uri.joinPath(this.context.globalStorageUri, "rhythm");
    const file = vscode.Uri.joinPath(folder, "weekly-rhythm.json");
    await vscode.workspace.fs.createDirectory(folder);

    try {
      await vscode.workspace.fs.stat(file);
    } catch {
      const emptyPayload = {
        schemaVersion: 1,
        privacy: "local-memory-and-local-storage-only",
        updatedAt: new Date().toISOString(),
        snapshots: [] as RhythmSnapshot[]
      };
      const encoded = new TextEncoder().encode(JSON.stringify(emptyPayload, null, 2));
      await vscode.workspace.fs.writeFile(file, encoded);
    }

    const document = await vscode.workspace.openTextDocument(file);
    await vscode.window.showTextDocument(document, { preview: false });
  }

  private openPanel(): void {
    if (this.panel) {
      this.panel.reveal(vscode.ViewColumn.Beside, true);
      return;
    }

    this.panel = vscode.window.createWebviewPanel(
      "tenderObserverAmbient",
      "The Tender Observer",
      vscode.ViewColumn.Beside,
      {
        enableScripts: true,
        retainContextWhenHidden: true
      }
    );

    this.panel.webview.html = this.webviewHtml(this.panel.webview);
    this.panel.onDidDispose(() => {
      this.panel = undefined;
    });
  }

  private postAmbient(payload: unknown): void {
    if (this.panel) {
      void this.panel.webview.postMessage(payload);
    }
  }

  private webviewHtml(webview: vscode.Webview): string {
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.context.extensionUri, "src", "webview", "ambient.js")
    );

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

export function activate(context: vscode.ExtensionContext): void {
  const monitor = new RhythmMonitor(context);
  monitor.start();
  console.log("Tender Observer activated");
  void vscode.window.showInformationMessage("Tender Observer is awake.");
}

export function deactivate(): void {
  // no-op
}
