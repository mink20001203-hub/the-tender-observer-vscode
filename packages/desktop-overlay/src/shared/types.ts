export type OverlayState = "calm" | "focused" | "anxious" | "idle" | "lost";
export type OverlayBehavior = "resting" | "fading" | "avoiding" | "hiding" | "recovering" | "drifting";

export interface MotionBudget {
  windowStartedAt: number;
  moveCount: number;
  travelPx: number;
}

export interface OverlayRuntimeState {
  behavior: OverlayBehavior;
  activity: OverlayState;
  lastAvoidAt: number;
  lastHideAt: number;
  recoveringUntil: number;
  budget: MotionBudget;
}

export interface OverlayPayload {
  state: OverlayState;
  message: string;
  updatedAt: string;
  behavior: OverlayBehavior;
  opacity: number;
  scoreWeights: {
    away: number;
    edge: number;
    centerAvoid: number;
  };
  debug: {
    cursorDistancePx: number;
    avoidCooldownMsLeft: number;
    hideCooldownMsLeft: number;
    budgetMoveLeft: number;
    budgetTravelLeftPx: number;
  };
}
