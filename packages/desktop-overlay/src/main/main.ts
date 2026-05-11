import { app, powerMonitor, screen } from "electron";
import { calculateAvoidPosition, calculateDriftPosition, createOverlayWindow } from "./window";
import { registerIpc } from "./ipc";
import { DEFAULT_SCORE_WEIGHTS, OVERLAY_CONFIG, ScoreWeights } from "../shared/config";
import { MotionBudget, OverlayBehavior, OverlayDebugMode, OverlayPayload, OverlayState } from "../shared/types";
import { existsSync, readFileSync, watch } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import * as path from "node:path";

function randomBetween(min: number, max: number): number {
  return Math.round(min + Math.random() * (max - min));
}

function createSamplePayload(
  state: OverlayState,
  behavior: OverlayBehavior,
  opacity: number,
  scoreWeights: ScoreWeights,
  debugMode: OverlayDebugMode,
  debug: OverlayPayload["debug"]
): OverlayPayload {
  const message = (() => {
    if (state === "idle") {
      return "지금은 고요한 흐름이에요. 잠시 쉬어가도 괜찮습니다.";
    }
    if (state === "focused") {
      return "좋아요. 지금 흐름을 조용히 유지해볼게요.";
    }
    if (state === "anxious") {
      return "호흡을 한번 정리해도 좋겠어요.";
    }
    if (state === "lost") {
      return "괜찮아요. 작은 단위로 다시 시작해봐요.";
    }
    return "지금은 조용한 흐름이에요.";
  })();

  return {
    state,
    message,
    updatedAt: new Date().toISOString(),
    behavior,
    opacity,
    scoreWeights,
    debugMode,
    debug
  };
}

function nextActivityState(): OverlayState {
  const idleSeconds = powerMonitor.getSystemIdleTime();
  if (idleSeconds >= 8 * 60) {
    return "idle";
  }
  if (idleSeconds >= 3 * 60) {
    return "lost";
  }
  return "calm";
}

async function bootstrap(): Promise<void> {
  const window = createOverlayWindow();
  registerIpc(window);

  const configDir = app.getPath("userData");
  const configFile = path.join(configDir, "overlay-config.json");

  let scoreWeights: ScoreWeights = { ...DEFAULT_SCORE_WEIGHTS };
  let debugMode: OverlayDebugMode = "simple";
  let activity: OverlayState = "calm";
  let behavior: OverlayBehavior = "resting";
  let opacity: number = OVERLAY_CONFIG.normalOpacity;
  let lastBehaviorAt = Date.now();
  let lastDriftAt = Date.now();
  let lastAvoidAt = 0;
  let lastHideAt = 0;
  let recoveringUntil = 0;
  let budget: MotionBudget = {
    windowStartedAt: Date.now(),
    moveCount: 0,
    travelPx: 0
  };

  const normalizeDebugMode = (input: unknown): OverlayDebugMode => {
    return input === "detail" ? "detail" : "simple";
  };

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
      const raw = JSON.parse(readFileSync(configFile, "utf8")) as {
        scoreWeights?: Partial<ScoreWeights>;
        debugMode?: unknown;
      };
      scoreWeights = normalizeWeights(raw.scoreWeights);
      debugMode = normalizeDebugMode(raw.debugMode);
      console.log("[overlay] scoreWeights updated:", scoreWeights);
      console.log("[overlay] debugMode updated:", debugMode);
    } catch {
      scoreWeights = { ...DEFAULT_SCORE_WEIGHTS };
      debugMode = "simple";
    }
  };

  const resetBudgetIfNeeded = (now: number): void => {
    if (now - budget.windowStartedAt >= OVERLAY_CONFIG.motionBudgetWindowMs) {
      budget = {
        windowStartedAt: now,
        moveCount: 0,
        travelPx: 0
      };
    }
  };

  const canMoveByBudget = (): boolean => {
    return budget.moveCount < OVERLAY_CONFIG.maxMovesPerWindow && budget.travelPx < OVERLAY_CONFIG.maxTravelPerWindowPx;
  };

  const recordMove = (from: { x: number; y: number }, to: { x: number; y: number }): void => {
    budget.moveCount += 1;
    budget.travelPx += Math.hypot(to.x - from.x, to.y - from.y);
  };

  const canAvoid = (now: number): boolean => {
    return now - lastAvoidAt >= OVERLAY_CONFIG.avoidCooldownMs;
  };

  const canHide = (now: number): boolean => {
    return now - lastHideAt >= OVERLAY_CONFIG.hideCooldownMs;
  };

  const isRecovering = (now: number): boolean => {
    return now < recoveringUntil;
  };

  const publishOverlayState = (): void => {
    const bounds = window.getBounds();
    const cursor = screen.getCursorScreenPoint();
    const centerX = bounds.x + bounds.width / 2;
    const centerY = bounds.y + bounds.height / 2;
    const distance = Math.hypot(centerX - cursor.x, centerY - cursor.y);
    const now = Date.now();
    const payload = createSamplePayload(activity, behavior, opacity, scoreWeights, debugMode, {
      cursorDistancePx: Math.round(distance),
      avoidCooldownMsLeft: Math.max(0, OVERLAY_CONFIG.avoidCooldownMs - (now - lastAvoidAt)),
      hideCooldownMsLeft: Math.max(0, OVERLAY_CONFIG.hideCooldownMs - (now - lastHideAt)),
      budgetMoveLeft: Math.max(0, OVERLAY_CONFIG.maxMovesPerWindow - budget.moveCount),
      budgetTravelLeftPx: Math.max(0, Math.round(OVERLAY_CONFIG.maxTravelPerWindowPx - budget.travelPx))
    });
    window.setOpacity(payload.opacity);
    window.webContents.send("overlay:update", payload);
  };

  if (!existsSync(configDir)) {
    await mkdir(configDir, { recursive: true });
  }
  if (!existsSync(configFile)) {
    const payload = { scoreWeights: DEFAULT_SCORE_WEIGHTS, debugMode: "simple" };
    await writeFile(configFile, JSON.stringify(payload, null, 2), "utf8");
  }
  applyWeightsFromFile();
  watch(configFile, { persistent: false }, () => {
    applyWeightsFromFile();
  });

  const tickBehavior = (): void => {
    const now = Date.now();
    resetBudgetIfNeeded(now);

    const bounds = window.getBounds();
    const from = { x: bounds.x, y: bounds.y };
    const cursor = screen.getCursorScreenPoint();
    const centerX = bounds.x + bounds.width / 2;
    const centerY = bounds.y + bounds.height / 2;
    const distance = Math.hypot(centerX - cursor.x, centerY - cursor.y);

    if (isRecovering(now)) {
      behavior = "recovering";
      opacity = OVERLAY_CONFIG.fadeOpacity;
      return;
    }

    if (distance <= OVERLAY_CONFIG.panicRadiusPx && canHide(now)) {
      behavior = "hiding";
      opacity = OVERLAY_CONFIG.hideOpacity;
      lastHideAt = now;
      recoveringUntil = now + OVERLAY_CONFIG.recoverDelayMs;
      lastBehaviorAt = now;
      publishOverlayState();
      return;
    }

    if (distance <= OVERLAY_CONFIG.avoidRadiusPx) {
      if (canAvoid(now) && canMoveByBudget()) {
        const avoidStep = activity === "focused" || activity === "anxious"
          ? OVERLAY_CONFIG.avoidStepMinPx
          : randomBetween(OVERLAY_CONFIG.avoidStepMinPx, OVERLAY_CONFIG.avoidStepMaxPx);
        const next = calculateAvoidPosition(window, cursor, avoidStep, scoreWeights);
        window.setPosition(next.x, next.y, true);
        recordMove(from, next);
        behavior = "avoiding";
        opacity = OVERLAY_CONFIG.fadeOpacity;
        lastAvoidAt = now;
        recoveringUntil = now + OVERLAY_CONFIG.recoverDelayMs;
        lastBehaviorAt = now;
        publishOverlayState();
      } else {
        behavior = "fading";
        opacity = OVERLAY_CONFIG.fadeOpacity;
      }
      return;
    }

    if (distance <= OVERLAY_CONFIG.fadeRadiusPx) {
      behavior = "fading";
      opacity = OVERLAY_CONFIG.fadeOpacity;
      return;
    }

    const driftBlockedByState = activity === "focused" || activity === "anxious";
    const driftReady = now - lastDriftAt >= OVERLAY_CONFIG.driftIntervalMs;
    if (!driftBlockedByState && driftReady && canMoveByBudget()) {
      const driftStep = randomBetween(OVERLAY_CONFIG.driftStepMinPx, OVERLAY_CONFIG.driftStepMaxPx);
      const next = calculateDriftPosition(window, driftStep, scoreWeights);
      window.setPosition(next.x, next.y, true);
      recordMove(from, next);
      behavior = "drifting";
      opacity = OVERLAY_CONFIG.normalOpacity;
      lastDriftAt = now;
      lastBehaviorAt = now;
      publishOverlayState();
      return;
    }

    if (behavior !== "resting" && now - lastBehaviorAt >= OVERLAY_CONFIG.recoverDelayMs) {
      behavior = "resting";
    }
    opacity = OVERLAY_CONFIG.normalOpacity;
  };

  const tickActivity = (): void => {
    activity = nextActivityState();
    publishOverlayState();
  };

  window.webContents.once("did-finish-load", () => {
    publishOverlayState();
    setInterval(tickBehavior, OVERLAY_CONFIG.behaviorTickMs);
    setInterval(tickActivity, OVERLAY_CONFIG.sampleIntervalMs);
  });
}

app.whenReady().then(() => {
  void bootstrap();
});

app.on("window-all-closed", () => {
  app.quit();
});
