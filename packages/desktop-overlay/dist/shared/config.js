"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_SCORE_WEIGHTS = exports.OVERLAY_CONFIG = void 0;
exports.OVERLAY_CONFIG = {
    width: 320,
    height: 140,
    margin: 20,
    edgeBandRatio: 0.13,
    centerSafeRatio: 0.66,
    sampleIntervalMs: 60_000,
    behaviorTickMs: 250,
    driftIntervalMs: 15_000,
    driftStepMinPx: 20,
    driftStepMaxPx: 48,
    fadeRadiusPx: 160,
    avoidRadiusPx: 96,
    panicRadiusPx: 44,
    cursorExclusionRadiusPx: 120,
    avoidStepMinPx: 52,
    avoidStepMaxPx: 96,
    avoidCooldownMs: 6_500,
    hideCooldownMs: 10_000,
    recoverDelayMs: 1_600,
    motionBudgetWindowMs: 30_000,
    maxMovesPerWindow: 4,
    maxTravelPerWindowPx: 180,
    normalOpacity: 0.95,
    fadeOpacity: 0.32,
    hideOpacity: 0.12
};
exports.DEFAULT_SCORE_WEIGHTS = {
    away: 0.5,
    edge: 0.3,
    centerAvoid: 0.2
};
