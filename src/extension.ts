import * as vscode from "vscode";
import { computeState } from "./core/stateClassifier";
import { getSettings } from "./core/settings";
import { whisperForState } from "./core/interventionEngine";
import { RhythmSnapshot, RhythmState, TriggerVariant } from "./core/types";
import { openWeeklyRhythmLog, persistWeeklyRhythm } from "./services/rhythmLogService";
import { resolveTriggerVariant } from "./services/variantService";
import { AmbientPanel } from "./ui/webviewPanel";

class RhythmMonitor {
  private keyStrokes = 0;
  private fileSwitches = 0;
  private lastInputAt = Date.now();
  private lastWhisperAt = 0;
  private lastState: RhythmState = "calm";
  private stateStreak = 0;
  private snapshots: RhythmSnapshot[] = [];
  private triggerVariant: TriggerVariant = "A";
  private panel: AmbientPanel;
  private statusBar: vscode.StatusBarItem;
  private pulseTimer: NodeJS.Timeout | undefined;

  constructor(private readonly context: vscode.ExtensionContext) {
    this.panel = new AmbientPanel(context);
    this.statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 8);
    this.statusBar.text = "$(sparkle) Tender Observer";
    this.statusBar.command = "tenderObserver.openAmbient";
    this.statusBar.tooltip = "Open The Tender Observer";
    this.statusBar.show();
  }

  public async start(): Promise<void> {
    this.triggerVariant = await resolveTriggerVariant(this.context);

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
      vscode.commands.registerCommand("tenderObserver.openAmbient", () => this.panel.openPanel()),
      vscode.commands.registerCommand("tenderObserver.openWeeklyRhythmLog", () =>
        void openWeeklyRhythmLog({
          context: this.context,
          triggerVariant: this.triggerVariant,
          settings: getSettings()
        })
      ),
      vscode.commands.registerCommand("tenderObserver.secretMode", () => {
        this.panel.postAmbient({ type: "disperse" });
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

  private async sampleAndPersist(): Promise<void> {
    const now = Date.now();
    const idleMinutes = (now - this.lastInputAt) / 1000 / 60;
    const typingPerMinute = this.keyStrokes;
    const switchesPerMinute = this.fileSwitches;
    const settings = getSettings();

    this.keyStrokes = 0;
    this.fileSwitches = 0;

    const state = computeState(typingPerMinute, switchesPerMinute, idleMinutes, settings.sensitivity);
    const previousState = this.lastState;
    this.stateStreak = state === previousState ? this.stateStreak + 1 : 1;
    this.lastState = state;
    const intensity = Math.min(1, (typingPerMinute + switchesPerMinute * 6) / 320);
    const whisper = whisperForState(
      {
        state,
        previousState,
        stateStreak: this.stateStreak,
        now,
        idleMinutes,
        triggerVariant: this.triggerVariant,
        lastWhisperAt: this.lastWhisperAt
      },
      settings
    );

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

    await persistWeeklyRhythm({
      context: this.context,
      snapshots: this.snapshots,
      triggerVariant: this.triggerVariant,
      settings
    });

    this.panel.postAmbient({
      type: "state",
      state,
      intensity
    });

    if (whisper) {
      this.lastWhisperAt = now;
      this.panel.postAmbient({ type: "whisper", message: whisper.message });
    }
  }
}

export function activate(context: vscode.ExtensionContext): void {
  const monitor = new RhythmMonitor(context);
  void monitor.start();
  console.log("Tender Observer activated");
  void vscode.window.showInformationMessage("Tender Observer is awake.");
}

export function deactivate(): void {
  // no-op
}
