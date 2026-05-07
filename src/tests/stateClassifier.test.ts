import test from "node:test";
import assert from "node:assert/strict";
import { computeState } from "../core/stateClassifier";

test("classifies idle when idleMinutes crosses threshold", () => {
  const state = computeState(20, 1, 8.5, "normal");
  assert.equal(state, "idle");
});

test("classifies lost on high switches with low typing", () => {
  const state = computeState(90, 10, 1, "normal");
  assert.equal(state, "lost");
});

test("classifies anxious on high typing and switching pattern", () => {
  const state = computeState(165, 8, 1, "normal");
  assert.equal(state, "anxious");
});

test("classifies focused on sustained moderate typing with stable context", () => {
  const state = computeState(70, 3, 1.2, "normal");
  assert.equal(state, "focused");
});

test("high sensitivity enters anxious faster than low sensitivity", () => {
  const high = computeState(200, 3, 1, "high");
  const low = computeState(200, 3, 1, "low");
  assert.equal(high, "anxious");
  assert.notEqual(low, "anxious");
});
