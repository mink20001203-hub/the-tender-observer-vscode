"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_SCORE_WEIGHTS = exports.OVERLAY_CONFIG = void 0;
exports.OVERLAY_CONFIG = {
    width: 320,
    height: 140,
    margin: 28,
    edgeBandPx: 180,
    sampleIntervalMs: 60_000,
    behaviorTickMs: 800,
    driftIntervalMs: 14_000,
    driftStepPx: 44,
    avoidRadiusPx: 180,
    avoidStepPx: 120,
    normalOpacity: 0.96,
    avoidOpacity: 0.18
};
exports.DEFAULT_SCORE_WEIGHTS = {
    away: 0.5,
    edge: 0.3,
    centerAvoid: 0.2
};
