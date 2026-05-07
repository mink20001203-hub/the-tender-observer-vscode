export type RhythmState = "calm" | "focused" | "anxious" | "idle" | "lost";
export type TriggerVariant = "A" | "B";
export type Sensitivity = "low" | "normal" | "high";

export interface ObserverSettings {
  whisperEnabled: boolean;
  sensitivity: Sensitivity;
  nightWhisperEnabled: boolean;
}

export interface RhythmSnapshot {
  timestamp: string;
  hour: number;
  typingPerMinute: number;
  switchesPerMinute: number;
  idleMinutes: number;
  state: RhythmState;
  previousState: RhythmState;
  stateStreak: number;
  intensity: number;
  whisperShown: boolean;
  whisperReason?: string;
  triggerVariant: TriggerVariant;
}

export interface WeeklyRhythmMeta {
  generatedAt: string;
  extensionVersion: string;
  sampleIntervalSeconds: number;
  triggerVariant: TriggerVariant;
  settings: ObserverSettings;
}

export interface WeeklyRhythmSummary {
  totalSnapshots: number;
  whisperCount: number;
  stateCounts: Record<RhythmState, number>;
  averageTypingPerMinute: number;
  averageSwitchesPerMinute: number;
  averageIdleMinutes: number;
  averageIntensity: number;
}

export interface WeeklyRhythmPayload {
  schemaVersion: number;
  privacy: string;
  updatedAt: string;
  meta: WeeklyRhythmMeta;
  summary: WeeklyRhythmSummary;
  snapshots: RhythmSnapshot[];
}

export interface WhisperDecision {
  message: string;
  reason: string;
}
