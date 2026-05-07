import * as vscode from "vscode";
import { ObserverSettings, Sensitivity } from "./types";

export function getSettings(): ObserverSettings {
  const config = vscode.workspace.getConfiguration("tenderObserver");
  const sensitivity = config.get<Sensitivity>("sensitivity", "normal");
  const normalizedSensitivity: Sensitivity =
    sensitivity === "low" || sensitivity === "high" || sensitivity === "normal" ? sensitivity : "normal";

  return {
    whisperEnabled: config.get<boolean>("whisperEnabled", true),
    sensitivity: normalizedSensitivity,
    nightWhisperEnabled: config.get<boolean>("nightWhisperEnabled", true)
  };
}

export function sensitivityProfile(sensitivity: Sensitivity): {
  idleMinutes: number;
  lostSwitches: number;
  lostSwitchesWithLowTyping: number;
  lowTypingThreshold: number;
  anxiousTyping: number;
  anxiousTypingWithSwitches: number;
  anxiousSwitches: number;
  focusedTyping: number;
  focusedMaxSwitches: number;
  focusedMaxIdleMinutes: number;
} {
  if (sensitivity === "low") {
    return {
      idleMinutes: 10,
      lostSwitches: 16,
      lostSwitchesWithLowTyping: 11,
      lowTypingThreshold: 110,
      anxiousTyping: 250,
      anxiousTypingWithSwitches: 170,
      anxiousSwitches: 8,
      focusedTyping: 70,
      focusedMaxSwitches: 7,
      focusedMaxIdleMinutes: 2.0
    };
  }

  if (sensitivity === "high") {
    return {
      idleMinutes: 6,
      lostSwitches: 12,
      lostSwitchesWithLowTyping: 8,
      lowTypingThreshold: 130,
      anxiousTyping: 190,
      anxiousTypingWithSwitches: 130,
      anxiousSwitches: 6,
      focusedTyping: 45,
      focusedMaxSwitches: 9,
      focusedMaxIdleMinutes: 3.0
    };
  }

  return {
    idleMinutes: 8,
    lostSwitches: 14,
    lostSwitchesWithLowTyping: 9,
    lowTypingThreshold: 120,
    anxiousTyping: 220,
    anxiousTypingWithSwitches: 150,
    anxiousSwitches: 7,
    focusedTyping: 55,
    focusedMaxSwitches: 8,
    focusedMaxIdleMinutes: 2.5
  };
}
