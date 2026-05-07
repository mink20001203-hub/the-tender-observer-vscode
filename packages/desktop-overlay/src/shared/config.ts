export const OVERLAY_CONFIG = {
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
} as const;

export interface ScoreWeights {
  away: number;
  edge: number;
  centerAvoid: number;
}

export const DEFAULT_SCORE_WEIGHTS: ScoreWeights = {
  away: 0.5,
  edge: 0.3,
  centerAvoid: 0.2
};
