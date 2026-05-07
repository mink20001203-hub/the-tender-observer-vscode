export type OverlayState = "calm" | "focused" | "anxious" | "idle" | "lost";
export type OverlayBehavior = "resting" | "avoid" | "drift";

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
}
