"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = __importDefault(require("node:test"));
const strict_1 = __importDefault(require("node:assert/strict"));
const weeklyInsights_1 = require("../core/weeklyInsights");
function createBasePayload() {
    return {
        schemaVersion: 2,
        privacy: "local-memory-and-local-storage-only",
        updatedAt: "2026-05-07T00:00:00.000Z",
        meta: {
            generatedAt: "2026-05-07T00:00:00.000Z",
            extensionVersion: "0.0.1",
            sampleIntervalSeconds: 60,
            triggerVariant: "A",
            settings: {
                whisperEnabled: true,
                sensitivity: "normal",
                nightWhisperEnabled: true
            }
        },
        summary: {
            totalSnapshots: 0,
            whisperCount: 0,
            stateCounts: {
                calm: 0,
                focused: 0,
                anxious: 0,
                idle: 0,
                lost: 0
            },
            averageTypingPerMinute: 0,
            averageSwitchesPerMinute: 0,
            averageIdleMinutes: 0,
            averageIntensity: 0
        },
        snapshots: []
    };
}
(0, node_test_1.default)("returns onboarding insight when snapshots are empty", () => {
    const payload = createBasePayload();
    const insights = (0, weeklyInsights_1.buildWeeklyInsights)(payload);
    strict_1.default.equal(insights.length, 1);
    strict_1.default.match(insights[0], /데이터가 아직 충분하지 않아요/);
});
(0, node_test_1.default)("detects afternoon-lost concentration pattern", () => {
    const payload = createBasePayload();
    payload.summary.totalSnapshots = 8;
    payload.summary.stateCounts.lost = 4;
    payload.summary.stateCounts.focused = 2;
    payload.summary.stateCounts.calm = 2;
    payload.snapshots = [
        { timestamp: "", hour: 13, typingPerMinute: 40, switchesPerMinute: 12, idleMinutes: 1, state: "lost", previousState: "calm", stateStreak: 2, intensity: 0.4, whisperShown: false, triggerVariant: "A" },
        { timestamp: "", hour: 14, typingPerMinute: 35, switchesPerMinute: 11, idleMinutes: 1, state: "lost", previousState: "lost", stateStreak: 3, intensity: 0.42, whisperShown: false, triggerVariant: "A" },
        { timestamp: "", hour: 15, typingPerMinute: 50, switchesPerMinute: 10, idleMinutes: 1, state: "lost", previousState: "focused", stateStreak: 1, intensity: 0.5, whisperShown: false, triggerVariant: "A" },
        { timestamp: "", hour: 9, typingPerMinute: 45, switchesPerMinute: 9, idleMinutes: 1, state: "lost", previousState: "focused", stateStreak: 1, intensity: 0.4, whisperShown: false, triggerVariant: "A" },
        { timestamp: "", hour: 10, typingPerMinute: 70, switchesPerMinute: 3, idleMinutes: 1, state: "focused", previousState: "calm", stateStreak: 1, intensity: 0.3, whisperShown: false, triggerVariant: "A" },
        { timestamp: "", hour: 11, typingPerMinute: 80, switchesPerMinute: 3, idleMinutes: 1, state: "focused", previousState: "focused", stateStreak: 2, intensity: 0.33, whisperShown: false, triggerVariant: "A" },
        { timestamp: "", hour: 16, typingPerMinute: 30, switchesPerMinute: 2, idleMinutes: 4, state: "calm", previousState: "lost", stateStreak: 1, intensity: 0.2, whisperShown: false, triggerVariant: "A" },
        { timestamp: "", hour: 17, typingPerMinute: 20, switchesPerMinute: 1, idleMinutes: 5, state: "calm", previousState: "calm", stateStreak: 2, intensity: 0.1, whisperShown: false, triggerVariant: "A" }
    ];
    const insights = (0, weeklyInsights_1.buildWeeklyInsights)(payload);
    strict_1.default.ok(insights.some((text) => text.includes("오후 시간대")));
});
(0, node_test_1.default)("returns stable default insight when no strong rule matches", () => {
    const payload = createBasePayload();
    payload.summary.totalSnapshots = 10;
    payload.summary.stateCounts.calm = 6;
    payload.summary.stateCounts.focused = 3;
    payload.summary.stateCounts.idle = 1;
    payload.summary.whisperCount = 0;
    payload.snapshots = Array.from({ length: 10 }).map((_, index) => ({
        timestamp: "",
        hour: 9 + (index % 5),
        typingPerMinute: 40,
        switchesPerMinute: 3,
        idleMinutes: 2,
        state: index < 6 ? "calm" : index < 9 ? "focused" : "idle",
        previousState: "calm",
        stateStreak: 1,
        intensity: 0.25,
        whisperShown: false,
        triggerVariant: "A"
    }));
    const insights = (0, weeklyInsights_1.buildWeeklyInsights)(payload);
    strict_1.default.ok(insights.some((text) => text.includes("전반적으로 안정적")));
});
//# sourceMappingURL=weeklyInsights.test.js.map