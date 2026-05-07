import * as vscode from "vscode";
import { TriggerVariant } from "../core/types";

export async function resolveTriggerVariant(context: vscode.ExtensionContext): Promise<TriggerVariant> {
  const key = "tenderObserver.triggerVariant";
  const existing = context.globalState.get<TriggerVariant>(key);
  if (existing === "A" || existing === "B") {
    return existing;
  }

  const seed = `${vscode.env.machineId}:${context.extension.id}`;
  const hash = [...seed].reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const assigned: TriggerVariant = hash % 2 === 0 ? "A" : "B";
  await context.globalState.update(key, assigned);
  return assigned;
}
