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
const stateClassifier_1 = require("./core/stateClassifier");
const settings_1 = require("./core/settings");
const interventionEngine_1 = require("./core/interventionEngine");
const rhythmLogService_1 = require("./services/rhythmLogService");
const variantService_1 = require("./services/variantService");
const webviewPanel_1 = require("./ui/webviewPanel");
class RhythmMonitor {
    context;
    keyStrokes = 0;
    fileSwitches = 0;
    lastInputAt = Date.now();
    lastWhisperAt = 0;
    lastState = "calm";
    stateStreak = 0;
    snapshots = [];
    triggerVariant = "A";
    panel;
    statusBar;
    pulseTimer;
    constructor(context) {
        this.context = context;
        this.panel = new webviewPanel_1.AmbientPanel(context);
        this.statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 8);
        this.statusBar.text = "$(sparkle) Tender Observer";
        this.statusBar.command = "tenderObserver.openAmbient";
        this.statusBar.tooltip = "Open The Tender Observer";
        this.statusBar.show();
    }
    async start() {
        this.triggerVariant = await (0, variantService_1.resolveTriggerVariant)(this.context);
        this.context.subscriptions.push(vscode.workspace.onDidChangeTextDocument((event) => {
            if (event.contentChanges.length > 0) {
                this.keyStrokes += event.contentChanges.reduce((acc, item) => acc + item.text.length, 0);
                this.lastInputAt = Date.now();
            }
        }), vscode.window.onDidChangeActiveTextEditor(() => {
            this.fileSwitches += 1;
        }), vscode.commands.registerCommand("tenderObserver.openAmbient", () => this.panel.openPanel()), vscode.commands.registerCommand("tenderObserver.openWeeklyRhythmLog", () => void (0, rhythmLogService_1.openWeeklyRhythmLog)({
            context: this.context,
            triggerVariant: this.triggerVariant,
            settings: (0, settings_1.getSettings)()
        })), vscode.commands.registerCommand("tenderObserver.secretMode", () => {
            this.panel.postAmbient({ type: "disperse" });
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
    async sampleAndPersist() {
        const now = Date.now();
        const idleMinutes = (now - this.lastInputAt) / 1000 / 60;
        const typingPerMinute = this.keyStrokes;
        const switchesPerMinute = this.fileSwitches;
        const settings = (0, settings_1.getSettings)();
        this.keyStrokes = 0;
        this.fileSwitches = 0;
        const state = (0, stateClassifier_1.computeState)(typingPerMinute, switchesPerMinute, idleMinutes, settings.sensitivity);
        const previousState = this.lastState;
        this.stateStreak = state === previousState ? this.stateStreak + 1 : 1;
        this.lastState = state;
        const intensity = Math.min(1, (typingPerMinute + switchesPerMinute * 6) / 320);
        const whisper = (0, interventionEngine_1.whisperForState)({
            state,
            previousState,
            stateStreak: this.stateStreak,
            now,
            idleMinutes,
            triggerVariant: this.triggerVariant,
            lastWhisperAt: this.lastWhisperAt
        }, settings);
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
            whisperReason: whisper?.reason,
            triggerVariant: this.triggerVariant
        };
        this.snapshots.push(snapshot);
        if (this.snapshots.length > 10_080) {
            this.snapshots.shift();
        }
        await (0, rhythmLogService_1.persistWeeklyRhythm)({
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
function activate(context) {
    const monitor = new RhythmMonitor(context);
    void monitor.start();
    console.log("Tender Observer activated");
    void vscode.window.showInformationMessage("Tender Observer is awake.");
}
function deactivate() {
    // no-op
}
//# sourceMappingURL=extension.js.map