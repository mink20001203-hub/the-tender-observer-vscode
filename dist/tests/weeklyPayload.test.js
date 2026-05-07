"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = __importDefault(require("node:test"));
const strict_1 = __importDefault(require("node:assert/strict"));
const weeklyPayload_1 = require("../core/weeklyPayload");
const settings = {
    whisperEnabled: true,
    sensitivity: "normal",
    nightWhisperEnabled: true
};
(0, node_test_1.default)("aggregates state counts and whisper count correctly", () => {
    const snapshots = [
        {
            timestamp: "2026-05-07T00:00:00.000Z",
            hour: 9,
            typingPerMinute: 60,
            switchesPerMinute: 3,
            idleMinutes: 1.1,
            state: "focused",
            previousState: "calm",
            stateStreak: 1,
            intensity: 0.3,
            whisperShown: false,
            triggerVariant: "A"
        },
        {
            timestamp: "2026-05-07T00:01:00.000Z",
            hour: 9,
            typingPerMinute: 180,
            switchesPerMinute: 8,
            idleMinutes: 0.8,
            state: "anxious",
            previousState: "focused",
            stateStreak: 2,
            intensity: 0.7,
            whisperShown: true,
            whisperReason: "anxious_streak_vA",
            triggerVariant: "A"
        },
        {
            timestamp: "2026-05-07T00:02:00.000Z",
            hour: 9,
            typingPerMinute: 20,
            switchesPerMinute: 1,
            idleMinutes: 10.5,
            state: "idle",
            previousState: "anxious",
            stateStreak: 1,
            intensity: 0.1,
            whisperShown: true,
            whisperReason: "idle_transition_long_vA",
            triggerVariant: "A"
        }
    ];
    const payload = (0, weeklyPayload_1.buildWeeklyPayload)({
        snapshots,
        triggerVariant: "A",
        settings,
        extensionVersion: "0.0.1"
    });
    strict_1.default.equal(payload.summary.totalSnapshots, 3);
    strict_1.default.equal(payload.summary.whisperCount, 2);
    strict_1.default.equal(payload.summary.stateCounts.focused, 1);
    strict_1.default.equal(payload.summary.stateCounts.anxious, 1);
    strict_1.default.equal(payload.summary.stateCounts.idle, 1);
    strict_1.default.equal(payload.summary.stateCounts.calm, 0);
    strict_1.default.equal(payload.summary.stateCounts.lost, 0);
});
(0, node_test_1.default)("computes rounded averages with expected precision", () => {
    const snapshots = [
        {
            timestamp: "2026-05-07T00:00:00.000Z",
            hour: 10,
            typingPerMinute: 100,
            switchesPerMinute: 5,
            idleMinutes: 1.23,
            state: "focused",
            previousState: "calm",
            stateStreak: 1,
            intensity: 0.3333,
            whisperShown: false,
            triggerVariant: "B"
        },
        {
            timestamp: "2026-05-07T00:01:00.000Z",
            hour: 10,
            typingPerMinute: 50,
            switchesPerMinute: 7,
            idleMinutes: 2.34,
            state: "calm",
            previousState: "focused",
            stateStreak: 1,
            intensity: 0.6666,
            whisperShown: false,
            triggerVariant: "B"
        }
    ];
    const payload = (0, weeklyPayload_1.buildWeeklyPayload)({
        snapshots,
        triggerVariant: "B",
        settings,
        extensionVersion: "0.0.1"
    });
    strict_1.default.equal(payload.summary.averageTypingPerMinute, 75);
    strict_1.default.equal(payload.summary.averageSwitchesPerMinute, 6);
    strict_1.default.equal(payload.summary.averageIdleMinutes, 1.78);
    strict_1.default.equal(payload.summary.averageIntensity, 0.5);
});
(0, node_test_1.default)("returns safe zeroed summary for empty snapshots", () => {
    const payload = (0, weeklyPayload_1.buildWeeklyPayload)({
        snapshots: [],
        triggerVariant: "A",
        settings,
        extensionVersion: "0.0.1"
    });
    strict_1.default.equal(payload.summary.totalSnapshots, 0);
    strict_1.default.equal(payload.summary.whisperCount, 0);
    strict_1.default.equal(payload.summary.averageTypingPerMinute, 0);
    strict_1.default.equal(payload.summary.averageSwitchesPerMinute, 0);
    strict_1.default.equal(payload.summary.averageIdleMinutes, 0);
    strict_1.default.equal(payload.summary.averageIntensity, 0);
    strict_1.default.deepEqual(payload.summary.stateCounts, {
        calm: 0,
        focused: 0,
        anxious: 0,
        idle: 0,
        lost: 0
    });
});
//# sourceMappingURL=weeklyPayload.test.js.map