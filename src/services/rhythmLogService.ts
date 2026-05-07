import * as vscode from "vscode";
import { buildWeeklyInsights } from "../core/weeklyInsights";
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

export async function readWeeklyRhythmPayload(params: {
  context: vscode.ExtensionContext;
  triggerVariant: TriggerVariant;
  settings: ObserverSettings;
}): Promise<WeeklyRhythmPayload> {
  const folder = vscode.Uri.joinPath(params.context.globalStorageUri, "rhythm");
  const file = vscode.Uri.joinPath(folder, "weekly-rhythm.json");
  await vscode.workspace.fs.createDirectory(folder);

  let payload: WeeklyRhythmPayload;
  try {
    const bytes = await vscode.workspace.fs.readFile(file);
    payload = JSON.parse(new TextDecoder().decode(bytes)) as WeeklyRhythmPayload;
  } catch {
    payload = {
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
  }

  return payload;
}

export async function readWeeklyInsights(params: {
  context: vscode.ExtensionContext;
  triggerVariant: TriggerVariant;
  settings: ObserverSettings;
}): Promise<{ payload: WeeklyRhythmPayload; insights: string[] }> {
  const payload = await readWeeklyRhythmPayload(params);
  const insights = buildWeeklyInsights(payload);
  return { payload, insights };
}
