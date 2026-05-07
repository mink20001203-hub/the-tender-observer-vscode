import * as vscode from "vscode";
import { buildWeeklyPayload } from "../core/weeklyPayload";
import { ObserverSettings, RhythmSnapshot, TriggerVariant, WeeklyRhythmPayload } from "../core/types";

export async function persistWeeklyRhythm(params: {
  context: vscode.ExtensionContext;
  snapshots: RhythmSnapshot[];
  triggerVariant: TriggerVariant;
  settings: ObserverSettings;
}): Promise<void> {
  const folder = vscode.Uri.joinPath(params.context.globalStorageUri, "rhythm");
  const file = vscode.Uri.joinPath(folder, "weekly-rhythm.json");

  await vscode.workspace.fs.createDirectory(folder);

  const payload = buildWeeklyPayload({
    snapshots: params.snapshots,
    triggerVariant: params.triggerVariant,
    settings: params.settings,
    extensionVersion: params.context.extension.packageJSON.version ?? "0.0.0"
  });

  const encoded = new TextEncoder().encode(JSON.stringify(payload, null, 2));
  await vscode.workspace.fs.writeFile(file, encoded);
}

export async function openWeeklyRhythmLog(params: {
  context: vscode.ExtensionContext;
  triggerVariant: TriggerVariant;
  settings: ObserverSettings;
}): Promise<void> {
  const folder = vscode.Uri.joinPath(params.context.globalStorageUri, "rhythm");
  const file = vscode.Uri.joinPath(folder, "weekly-rhythm.json");
  await vscode.workspace.fs.createDirectory(folder);

  try {
    await vscode.workspace.fs.stat(file);
  } catch {
    const emptyPayload: WeeklyRhythmPayload = {
      schemaVersion: 2,
      privacy: "local-memory-and-local-storage-only",
      updatedAt: new Date().toISOString(),
      meta: {
        generatedAt: new Date().toISOString(),
        extensionVersion: params.context.extension.packageJSON.version ?? "0.0.0",
        sampleIntervalSeconds: 60,
        triggerVariant: params.triggerVariant,
        settings: params.settings
      },
      summary: {
        totalSnapshots: 0,
        whisperCount: 0,
        stateCounts: {
          calm: 0,
          focused: 0,
          anxious: 0,
          idle: 0,
          lost: 0
        },
        averageTypingPerMinute: 0,
        averageSwitchesPerMinute: 0,
        averageIdleMinutes: 0,
        averageIntensity: 0
      },
      snapshots: []
    };
    const encoded = new TextEncoder().encode(JSON.stringify(emptyPayload, null, 2));
    await vscode.workspace.fs.writeFile(file, encoded);
  }

  const document = await vscode.workspace.openTextDocument(file);
  await vscode.window.showTextDocument(document, { preview: false });
}
