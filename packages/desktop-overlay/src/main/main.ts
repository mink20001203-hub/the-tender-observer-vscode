import { app, powerMonitor, screen } from "electron";
import { calculateAvoidPosition, calculateDriftPosition, createOverlayWindow } from "./window";
import { registerIpc } from "./ipc";
import { DEFAULT_SCORE_WEIGHTS, OVERLAY_CONFIG, ScoreWeights } from "../shared/config";
import { OverlayBehavior, OverlayPayload } from "../shared/types";
import { existsSync, readFileSync, watch } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import * as path from "node:path";

function createSamplePayload(behavior: OverlayBehavior, opacity: number, scoreWeights: ScoreWeights): OverlayPayload {
  const idleSeconds = powerMonitor.getSystemIdleTime();

  if (idleSeconds >= 8 * 60) {
    return {
      state: "idle",
      message: "지금은 고요한 흐름이에요. 잠시 쉬어가도 괜찮습니다.",
      updatedAt: new Date().toISOString(),
      behavior,
      opacity,
      scoreWeights
    };
  }

  return {
    state: "calm",
    message: "지금은 조용한 흐름이에요.",
    updatedAt: new Date().toISOString(),
    behavior,
    opacity,
    scoreWeights
  };
}

async function bootstrap(): Promise<void> {
  const window = createOverlayWindow();
  registerIpc(window);
  const configDir = app.getPath("userData");
  const configFile = path.join(configDir, "overlay-config.json");
  let scoreWeights: ScoreWeights = { ...DEFAULT_SCORE_WEIGHTS };
  let behavior: OverlayBehavior = "resting";
  let opacity: number = OVERLAY_CONFIG.normalOpacity;
  let lastDriftAt = Date.now();
  let lastAvoidAt = 0;

  const normalizeWeights = (input: Partial<ScoreWeights> | undefined): ScoreWeights => {
    const away = Number(input?.away);
    const edge = Number(input?.edge);
    const centerAvoid = Number(input?.centerAvoid);
    if (!Number.isFinite(away) || !Number.isFinite(edge) || !Number.isFinite(centerAvoid)) {
      return { ...DEFAULT_SCORE_WEIGHTS };
    }
    const sum = away + edge + centerAvoid;
    if (sum <= 0) {
      return { ...DEFAULT_SCORE_WEIGHTS };
    }
    return {
      away: away / sum,
      edge: edge / sum,
      centerAvoid: centerAvoid / sum
    };
  };

  const applyWeightsFromFile = (): void => {
    try {
      const raw = JSON.parse(readFileSync(configFile, "utf8")) as { scoreWeights?: Partial<ScoreWeights> };
      scoreWeights = normalizeWeights(raw.scoreWeights);
      console.log("[overlay] scoreWeights updated:", scoreWeights);
    } catch {
      scoreWeights = { ...DEFAULT_SCORE_WEIGHTS };
    }
  };

  if (!existsSync(configDir)) {
    await mkdir(configDir, { recursive: true });
  }
  if (!existsSync(configFile)) {
    const payload = { scoreWeights: DEFAULT_SCORE_WEIGHTS };
    await writeFile(configFile, JSON.stringify(payload, null, 2), "utf8");
  }
  applyWeightsFromFile();
  watch(configFile, { persistent: false }, () => {
    applyWeightsFromFile();
  });

  const publishOverlayState = (): void => {
    const payload = createSamplePayload(behavior, opacity, scoreWeights);
    window.setOpacity(payload.opacity);
    window.webContents.send("overlay:update", payload);
  };

  const tickBehavior = (): void => {
    const bounds = window.getBounds();
    const cursor = screen.getCursorScreenPoint();
    const centerX = bounds.x + bounds.width / 2;
    const centerY = bounds.y + bounds.height / 2;
    const distance = Math.hypot(centerX - cursor.x, centerY - cursor.y);
    const now = Date.now();

    if (distance <= OVERLAY_CONFIG.avoidRadiusPx) {
      const next = calculateAvoidPosition(window, cursor, scoreWeights);
      window.setPosition(next.x, next.y, true);
      behavior = "avoid";
      opacity = OVERLAY_CONFIG.avoidOpacity;
      lastAvoidAt = now;
      publishOverlayState();
      return;
    }

    if (now - lastAvoidAt < 2_000) {
      return;
    }

    opacity = OVERLAY_CONFIG.normalOpacity;
    if (now - lastDriftAt >= OVERLAY_CONFIG.driftIntervalMs) {
      const next = calculateDriftPosition(window, scoreWeights);
      window.setPosition(next.x, next.y, true);
      behavior = "drift";
      lastDriftAt = now;
      publishOverlayState();
      return;
    }

    behavior = "resting";
  };

  window.webContents.once("did-finish-load", () => {
    publishOverlayState();
    setInterval(tickBehavior, OVERLAY_CONFIG.behaviorTickMs);
    setInterval(publishOverlayState, OVERLAY_CONFIG.sampleIntervalMs);
  });
}

app.whenReady().then(() => {
  void bootstrap();
});

app.on("window-all-closed", () => {
  app.quit();
});
