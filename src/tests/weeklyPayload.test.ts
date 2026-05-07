import test from "node:test";
import assert from "node:assert/strict";
import { buildWeeklyPayload } from "../core/weeklyPayload";
import { ObserverSettings, RhythmSnapshot } from "../core/types";

const settings: ObserverSettings = {
  whisperEnabled: true,
  sensitivity: "normal",
  nightWhisperEnabled: true
};

test("aggregates state counts and whisper count correctly", () => {
  const snapshots: RhythmSnapshot[] = [
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

  const payload = buildWeeklyPayload({
    snapshots,
    triggerVariant: "A",
    settings,
    extensionVersion: "0.0.1"
  });

  assert.equal(payload.summary.totalSnapshots, 3);
  assert.equal(payload.summary.whisperCount, 2);
  assert.equal(payload.summary.stateCounts.focused, 1);
  assert.equal(payload.summary.stateCounts.anxious, 1);
  assert.equal(payload.summary.stateCounts.idle, 1);
  assert.equal(payload.summary.stateCounts.calm, 0);
  assert.equal(payload.summary.stateCounts.lost, 0);
});

test("computes rounded averages with expected precision", () => {
  const snapshots: RhythmSnapshot[] = [
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

  const payload = buildWeeklyPayload({
    snapshots,
    triggerVariant: "B",
    settings,
    extensionVersion: "0.0.1"
  });

  assert.equal(payload.summary.averageTypingPerMinute, 75);
  assert.equal(payload.summary.averageSwitchesPerMinute, 6);
  assert.equal(payload.summary.averageIdleMinutes, 1.78);
  assert.equal(payload.summary.averageIntensity, 0.5);
});

test("returns safe zeroed summary for empty snapshots", () => {
  const payload = buildWeeklyPayload({
    snapshots: [],
    triggerVariant: "A",
    settings,
    extensionVersion: "0.0.1"
  });

  assert.equal(payload.summary.totalSnapshots, 0);
  assert.equal(payload.summary.whisperCount, 0);
  assert.equal(payload.summary.averageTypingPerMinute, 0);
  assert.equal(payload.summary.averageSwitchesPerMinute, 0);
  assert.equal(payload.summary.averageIdleMinutes, 0);
  assert.equal(payload.summary.averageIntensity, 0);
  assert.deepEqual(payload.summary.stateCounts, {
    calm: 0,
    focused: 0,
    anxious: 0,
    idle: 0,
    lost: 0
  });
});
