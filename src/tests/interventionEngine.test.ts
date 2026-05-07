import test from "node:test";
import assert from "node:assert/strict";
import { whisperForState } from "../core/interventionEngine";
import { ObserverSettings } from "../core/types";

const defaultSettings: ObserverSettings = {
  whisperEnabled: true,
  sensitivity: "normal",
  nightWhisperEnabled: true
};

test("blocks whisper when whisperEnabled is false", () => {
  const decision = whisperForState(
    {
      state: "anxious",
      previousState: "focused",
      stateStreak: 3,
      now: Date.UTC(2026, 0, 1, 6, 0),
      idleMinutes: 1,
      triggerVariant: "A",
      lastWhisperAt: 0
    },
    { ...defaultSettings, whisperEnabled: false }
  );

  assert.equal(decision, undefined);
});

test("variant B is stricter than variant A for anxious streak", () => {
  const now = Date.UTC(2026, 0, 1, 6, 0);

  const decisionA = whisperForState(
    {
      state: "anxious",
      previousState: "focused",
      stateStreak: 2,
      now,
      idleMinutes: 1,
      triggerVariant: "A",
      lastWhisperAt: 0
    },
    defaultSettings
  );

  const decisionB = whisperForState(
    {
      state: "anxious",
      previousState: "focused",
      stateStreak: 2,
      now,
      idleMinutes: 1,
      triggerVariant: "B",
      lastWhisperAt: 0
    },
    defaultSettings
  );

  assert.ok(decisionA);
  assert.equal(decisionB, undefined);
});

test("respects cooldown for same-state interventions", () => {
  const now = Date.UTC(2026, 0, 1, 6, 0);
  const lastWhisperAt = now - 5 * 60_000;

  const decision = whisperForState(
    {
      state: "lost",
      previousState: "lost",
      stateStreak: 4,
      now,
      idleMinutes: 1,
      triggerVariant: "A",
      lastWhisperAt
    },
    defaultSettings
  );

  assert.equal(decision, undefined);
});

test("creates night-focused message only during night hours when enabled", () => {
  const nightNow = Date.UTC(2026, 0, 1, 18, 0); // 03:00 KST
  const dayNow = Date.UTC(2026, 0, 1, 6, 0); // 15:00 KST

  const nightDecision = whisperForState(
    {
      state: "focused",
      previousState: "calm",
      stateStreak: 1,
      now: nightNow,
      idleMinutes: 1,
      triggerVariant: "A",
      lastWhisperAt: 0
    },
    defaultSettings
  );

  const dayDecision = whisperForState(
    {
      state: "focused",
      previousState: "calm",
      stateStreak: 1,
      now: dayNow,
      idleMinutes: 1,
      triggerVariant: "A",
      lastWhisperAt: 0
    },
    defaultSettings
  );

  assert.ok(nightDecision);
  assert.equal(dayDecision, undefined);
});
