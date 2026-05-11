"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const window_1 = require("./window");
const ipc_1 = require("./ipc");
const config_1 = require("../shared/config");
const node_fs_1 = require("node:fs");
const promises_1 = require("node:fs/promises");
const path = __importStar(require("node:path"));
function randomBetween(min, max) {
    return Math.round(min + Math.random() * (max - min));
}
function createSamplePayload(state, behavior, opacity, scoreWeights, debugMode, debug) {
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
function nextActivityState() {
    const idleSeconds = electron_1.powerMonitor.getSystemIdleTime();
    if (idleSeconds >= 8 * 60) {
        return "idle";
    }
    if (idleSeconds >= 3 * 60) {
        return "lost";
    }
    return "calm";
}
async function bootstrap() {
    const window = (0, window_1.createOverlayWindow)();
    (0, ipc_1.registerIpc)(window);
    const configDir = electron_1.app.getPath("userData");
    const configFile = path.join(configDir, "overlay-config.json");
    let scoreWeights = { ...config_1.DEFAULT_SCORE_WEIGHTS };
    let debugMode = "simple";
    let activity = "calm";
    let behavior = "resting";
    let opacity = config_1.OVERLAY_CONFIG.normalOpacity;
    let lastBehaviorAt = Date.now();
    let lastDriftAt = Date.now();
    let lastAvoidAt = 0;
    let lastHideAt = 0;
    let recoveringUntil = 0;
    let budget = {
        windowStartedAt: Date.now(),
        moveCount: 0,
        travelPx: 0
    };
    let lastLoggedBehavior = behavior;
    let lastLoggedActivity = activity;
    const normalizeDebugMode = (input) => {
        return input === "detail" ? "detail" : "simple";
    };
    const normalizeWeights = (input) => {
        const away = Number(input?.away);
        const edge = Number(input?.edge);
        const centerAvoid = Number(input?.centerAvoid);
        if (!Number.isFinite(away) || !Number.isFinite(edge) || !Number.isFinite(centerAvoid)) {
            return { ...config_1.DEFAULT_SCORE_WEIGHTS };
        }
        const sum = away + edge + centerAvoid;
        if (sum <= 0) {
            return { ...config_1.DEFAULT_SCORE_WEIGHTS };
        }
        return {
            away: away / sum,
            edge: edge / sum,
            centerAvoid: centerAvoid / sum
        };
    };
    const applyWeightsFromFile = () => {
        try {
            const raw = JSON.parse((0, node_fs_1.readFileSync)(configFile, "utf8"));
            scoreWeights = normalizeWeights(raw.scoreWeights);
            debugMode = normalizeDebugMode(raw.debugMode);
            console.log("[overlay] scoreWeights updated:", scoreWeights);
            console.log("[overlay] debugMode updated:", debugMode);
        }
        catch {
            scoreWeights = { ...config_1.DEFAULT_SCORE_WEIGHTS };
            debugMode = "simple";
        }
    };
    const resetBudgetIfNeeded = (now) => {
        if (now - budget.windowStartedAt >= config_1.OVERLAY_CONFIG.motionBudgetWindowMs) {
            budget = {
                windowStartedAt: now,
                moveCount: 0,
                travelPx: 0
            };
        }
    };
    const canMoveByBudget = () => {
        return budget.moveCount < config_1.OVERLAY_CONFIG.maxMovesPerWindow && budget.travelPx < config_1.OVERLAY_CONFIG.maxTravelPerWindowPx;
    };
    const recordMove = (from, to) => {
        budget.moveCount += 1;
        budget.travelPx += Math.hypot(to.x - from.x, to.y - from.y);
    };
    const canAvoid = (now) => {
        return now - lastAvoidAt >= config_1.OVERLAY_CONFIG.avoidCooldownMs;
    };
    const canHide = (now) => {
        return now - lastHideAt >= config_1.OVERLAY_CONFIG.hideCooldownMs;
    };
    const isRecovering = (now) => {
        return now < recoveringUntil;
    };
    const publishOverlayState = () => {
        const bounds = window.getBounds();
        const cursor = electron_1.screen.getCursorScreenPoint();
        const centerX = bounds.x + bounds.width / 2;
        const centerY = bounds.y + bounds.height / 2;
        const distance = Math.hypot(centerX - cursor.x, centerY - cursor.y);
        const now = Date.now();
        const payload = createSamplePayload(activity, behavior, opacity, scoreWeights, debugMode, {
            cursorDistancePx: Math.round(distance),
            avoidCooldownMsLeft: Math.max(0, config_1.OVERLAY_CONFIG.avoidCooldownMs - (now - lastAvoidAt)),
            hideCooldownMsLeft: Math.max(0, config_1.OVERLAY_CONFIG.hideCooldownMs - (now - lastHideAt)),
            budgetMoveLeft: Math.max(0, config_1.OVERLAY_CONFIG.maxMovesPerWindow - budget.moveCount),
            budgetTravelLeftPx: Math.max(0, Math.round(config_1.OVERLAY_CONFIG.maxTravelPerWindowPx - budget.travelPx))
        });
        window.setOpacity(payload.opacity);
        window.webContents.send("overlay:update", payload);
    };
    const logBehaviorTransition = (params) => {
        const avoidCooldownLeft = Math.max(0, config_1.OVERLAY_CONFIG.avoidCooldownMs - (params.now - lastAvoidAt));
        const hideCooldownLeft = Math.max(0, config_1.OVERLAY_CONFIG.hideCooldownMs - (params.now - lastHideAt));
        const budgetMoveLeft = Math.max(0, config_1.OVERLAY_CONFIG.maxMovesPerWindow - budget.moveCount);
        const budgetTravelLeftPx = Math.max(0, Math.round(config_1.OVERLAY_CONFIG.maxTravelPerWindowPx - budget.travelPx));
        const time = new Date(params.now).toLocaleTimeString("ko-KR", { hour12: false });
        console.log(`[overlay][timeline][${time}] behavior ${params.from} -> ${params.to} | reason=${params.reason} | ` +
            `d=${Math.round(params.distancePx)}px | cooldown(a=${Math.ceil(avoidCooldownLeft / 1000)}s,h=${Math.ceil(hideCooldownLeft / 1000)}s) | ` +
            `budget(m=${budgetMoveLeft},t=${budgetTravelLeftPx}px) | activity=${activity}`);
    };
    const logActivityTransition = (from, to, now) => {
        const time = new Date(now).toLocaleTimeString("ko-KR", { hour12: false });
        const idleSeconds = electron_1.powerMonitor.getSystemIdleTime();
        console.log(`[overlay][timeline][${time}] activity ${from} -> ${to} | idle=${idleSeconds}s | behavior=${behavior}`);
    };
    const applyVisualState = (nextBehavior, nextOpacity, reason, distancePx, now) => {
        const previousBehavior = behavior;
        const changed = behavior !== nextBehavior || Math.abs(opacity - nextOpacity) > 0.001;
        behavior = nextBehavior;
        opacity = nextOpacity;
        if (changed) {
            if (lastLoggedBehavior !== nextBehavior) {
                logBehaviorTransition({
                    from: previousBehavior,
                    to: nextBehavior,
                    reason,
                    distancePx,
                    now
                });
                lastLoggedBehavior = nextBehavior;
            }
            publishOverlayState();
        }
    };
    if (!(0, node_fs_1.existsSync)(configDir)) {
        await (0, promises_1.mkdir)(configDir, { recursive: true });
    }
    if (!(0, node_fs_1.existsSync)(configFile)) {
        const payload = { scoreWeights: config_1.DEFAULT_SCORE_WEIGHTS, debugMode: "simple" };
        await (0, promises_1.writeFile)(configFile, JSON.stringify(payload, null, 2), "utf8");
    }
    applyWeightsFromFile();
    (0, node_fs_1.watch)(configFile, { persistent: false }, () => {
        applyWeightsFromFile();
    });
    const tickBehavior = () => {
        const now = Date.now();
        resetBudgetIfNeeded(now);
        const bounds = window.getBounds();
        const from = { x: bounds.x, y: bounds.y };
        const cursor = electron_1.screen.getCursorScreenPoint();
        const centerX = bounds.x + bounds.width / 2;
        const centerY = bounds.y + bounds.height / 2;
        const distance = Math.hypot(centerX - cursor.x, centerY - cursor.y);
        if (isRecovering(now)) {
            applyVisualState("recovering", config_1.OVERLAY_CONFIG.fadeOpacity, "recover-window", distance, now);
            return;
        }
        if (distance <= config_1.OVERLAY_CONFIG.panicRadiusPx && canHide(now)) {
            applyVisualState("hiding", config_1.OVERLAY_CONFIG.hideOpacity, "panic-radius", distance, now);
            lastHideAt = now;
            recoveringUntil = now + config_1.OVERLAY_CONFIG.recoverDelayMs;
            lastBehaviorAt = now;
            return;
        }
        if (distance <= config_1.OVERLAY_CONFIG.avoidRadiusPx) {
            if (canAvoid(now) && canMoveByBudget()) {
                const avoidStep = activity === "focused" || activity === "anxious"
                    ? config_1.OVERLAY_CONFIG.avoidStepMinPx
                    : randomBetween(config_1.OVERLAY_CONFIG.avoidStepMinPx, config_1.OVERLAY_CONFIG.avoidStepMaxPx);
                const next = (0, window_1.calculateAvoidPosition)(window, cursor, avoidStep, scoreWeights);
                window.setPosition(next.x, next.y, true);
                recordMove(from, next);
                applyVisualState("avoiding", config_1.OVERLAY_CONFIG.fadeOpacity, "avoid-radius", distance, now);
                lastAvoidAt = now;
                recoveringUntil = now + config_1.OVERLAY_CONFIG.recoverDelayMs;
                lastBehaviorAt = now;
            }
            else {
                applyVisualState("fading", config_1.OVERLAY_CONFIG.fadeOpacity, "avoid-blocked", distance, now);
            }
            return;
        }
        if (distance <= config_1.OVERLAY_CONFIG.fadeRadiusPx) {
            applyVisualState("fading", config_1.OVERLAY_CONFIG.fadeOpacity, "fade-radius", distance, now);
            return;
        }
        const driftBlockedByState = activity === "focused" || activity === "anxious";
        const driftReady = now - lastDriftAt >= config_1.OVERLAY_CONFIG.driftIntervalMs;
        if (!driftBlockedByState && driftReady && canMoveByBudget()) {
            const driftStep = randomBetween(config_1.OVERLAY_CONFIG.driftStepMinPx, config_1.OVERLAY_CONFIG.driftStepMaxPx);
            const next = (0, window_1.calculateDriftPosition)(window, driftStep, scoreWeights);
            window.setPosition(next.x, next.y, true);
            recordMove(from, next);
            applyVisualState("drifting", config_1.OVERLAY_CONFIG.normalOpacity, "drift-interval", distance, now);
            lastDriftAt = now;
            lastBehaviorAt = now;
            return;
        }
        if (behavior !== "resting" && now - lastBehaviorAt >= config_1.OVERLAY_CONFIG.recoverDelayMs) {
            applyVisualState("resting", config_1.OVERLAY_CONFIG.normalOpacity, "recover-to-rest", distance, now);
            return;
        }
        applyVisualState(behavior, config_1.OVERLAY_CONFIG.normalOpacity, "stabilize", distance, now);
    };
    const tickActivity = () => {
        const next = nextActivityState();
        if (next !== activity) {
            logActivityTransition(activity, next, Date.now());
            activity = next;
            lastLoggedActivity = next;
            publishOverlayState();
            return;
        }
        if (lastLoggedActivity !== activity) {
            lastLoggedActivity = activity;
        }
    };
    window.webContents.once("did-finish-load", () => {
        publishOverlayState();
        setInterval(tickBehavior, config_1.OVERLAY_CONFIG.behaviorTickMs);
        setInterval(tickActivity, config_1.OVERLAY_CONFIG.sampleIntervalMs);
    });
}
electron_1.app.whenReady().then(() => {
    void bootstrap();
});
electron_1.app.on("window-all-closed", () => {
    electron_1.app.quit();
});
