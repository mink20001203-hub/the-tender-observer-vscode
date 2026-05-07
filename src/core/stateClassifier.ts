import { RhythmState, Sensitivity } from "./types";
import { sensitivityProfile } from "./sensitivityProfile";

export function computeState(
  typingPerMinute: number,
  switchesPerMinute: number,
  idleMinutes: number,
  sensitivity: Sensitivity
): RhythmState {
  const profile = sensitivityProfile(sensitivity);

  if (idleMinutes >= profile.idleMinutes) {
    return "idle";
  }
  if (
    switchesPerMinute >= profile.lostSwitches ||
    (switchesPerMinute >= profile.lostSwitchesWithLowTyping && typingPerMinute < profile.lowTypingThreshold)
  ) {
    return "lost";
  }
  if (
    typingPerMinute >= profile.anxiousTyping ||
    (typingPerMinute >= profile.anxiousTypingWithSwitches && switchesPerMinute >= profile.anxiousSwitches)
  ) {
    return "anxious";
  }
  if (
    typingPerMinute >= profile.focusedTyping &&
    switchesPerMinute <= profile.focusedMaxSwitches &&
    idleMinutes < profile.focusedMaxIdleMinutes
  ) {
    return "focused";
  }
  return "calm";
}
