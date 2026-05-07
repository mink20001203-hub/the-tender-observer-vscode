"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = __importDefault(require("node:test"));
const strict_1 = __importDefault(require("node:assert/strict"));
const interventionEngine_1 = require("../core/interventionEngine");
const defaultSettings = {
    whisperEnabled: true,
    sensitivity: "normal",
    nightWhisperEnabled: true
};
(0, node_test_1.default)("blocks whisper when whisperEnabled is false", () => {
    const decision = (0, interventionEngine_1.whisperForState)({
        state: "anxious",
        previousState: "focused",
        stateStreak: 3,
        now: Date.UTC(2026, 0, 1, 6, 0),
        idleMinutes: 1,
        triggerVariant: "A",
        lastWhisperAt: 0
    }, { ...defaultSettings, whisperEnabled: false });
    strict_1.default.equal(decision, undefined);
});
(0, node_test_1.default)("variant B is stricter than variant A for anxious streak", () => {
    const now = Date.UTC(2026, 0, 1, 6, 0);
    const decisionA = (0, interventionEngine_1.whisperForState)({
        state: "anxious",
        previousState: "focused",
        stateStreak: 2,
        now,
        idleMinutes: 1,
        triggerVariant: "A",
        lastWhisperAt: 0
    }, defaultSettings);
    const decisionB = (0, interventionEngine_1.whisperForState)({
        state: "anxious",
        previousState: "focused",
        stateStreak: 2,
        now,
        idleMinutes: 1,
        triggerVariant: "B",
        lastWhisperAt: 0
    }, defaultSettings);
    strict_1.default.ok(decisionA);
    strict_1.default.equal(decisionB, undefined);
});
(0, node_test_1.default)("respects cooldown for same-state interventions", () => {
    const now = Date.UTC(2026, 0, 1, 6, 0);
    const lastWhisperAt = now - 5 * 60_000;
    const decision = (0, interventionEngine_1.whisperForState)({
        state: "lost",
        previousState: "lost",
        stateStreak: 4,
        now,
        idleMinutes: 1,
        triggerVariant: "A",
        lastWhisperAt
    }, defaultSettings);
    strict_1.default.equal(decision, undefined);
});
(0, node_test_1.default)("creates night-focused message only during night hours when enabled", () => {
    const nightNow = Date.UTC(2026, 0, 1, 18, 0); // 03:00 KST
    const dayNow = Date.UTC(2026, 0, 1, 6, 0); // 15:00 KST
    const nightDecision = (0, interventionEngine_1.whisperForState)({
        state: "focused",
        previousState: "calm",
        stateStreak: 1,
        now: nightNow,
        idleMinutes: 1,
        triggerVariant: "A",
        lastWhisperAt: 0
    }, defaultSettings);
    const dayDecision = (0, interventionEngine_1.whisperForState)({
        state: "focused",
        previousState: "calm",
        stateStreak: 1,
        now: dayNow,
        idleMinutes: 1,
        triggerVariant: "A",
        lastWhisperAt: 0
    }, defaultSettings);
    strict_1.default.ok(nightDecision);
    strict_1.default.equal(dayDecision, undefined);
});
//# sourceMappingURL=interventionEngine.test.js.map