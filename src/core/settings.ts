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
