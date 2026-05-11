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
function createSamplePayload(state, behavior, opacity, scoreWeights) {
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
        scoreWeights
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
            console.log("[overlay] scoreWeights updated:", scoreWeights);
        }
        catch {
            scoreWeights = { ...config_1.DEFAULT_SCORE_WEIGHTS };
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
        const payload = createSamplePayload(activity, behavior, opacity, scoreWeights);
        window.setOpacity(payload.opacity);
        window.webContents.send("overlay:update", payload);
    };
    if (!(0, node_fs_1.existsSync)(configDir)) {
        await (0, promises_1.mkdir)(configDir, { recursive: true });
    }
    if (!(0, node_fs_1.existsSync)(configFile)) {
        const payload = { scoreWeights: config_1.DEFAULT_SCORE_WEIGHTS };
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
            behavior = "recovering";
            opacity = config_1.OVERLAY_CONFIG.fadeOpacity;
            return;
        }
        if (distance <= config_1.OVERLAY_CONFIG.panicRadiusPx && canHide(now)) {
            behavior = "hiding";
            opacity = config_1.OVERLAY_CONFIG.hideOpacity;
            lastHideAt = now;
            recoveringUntil = now + config_1.OVERLAY_CONFIG.recoverDelayMs;
            lastBehaviorAt = now;
            publishOverlayState();
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
                behavior = "avoiding";
                opacity = config_1.OVERLAY_CONFIG.fadeOpacity;
                lastAvoidAt = now;
                recoveringUntil = now + config_1.OVERLAY_CONFIG.recoverDelayMs;
                lastBehaviorAt = now;
                publishOverlayState();
            }
            else {
                behavior = "fading";
                opacity = config_1.OVERLAY_CONFIG.fadeOpacity;
            }
            return;
        }
        if (distance <= config_1.OVERLAY_CONFIG.fadeRadiusPx) {
            behavior = "fading";
            opacity = config_1.OVERLAY_CONFIG.fadeOpacity;
            return;
        }
        const driftBlockedByState = activity === "focused" || activity === "anxious";
        const driftReady = now - lastDriftAt >= config_1.OVERLAY_CONFIG.driftIntervalMs;
        if (!driftBlockedByState && driftReady && canMoveByBudget()) {
            const driftStep = randomBetween(config_1.OVERLAY_CONFIG.driftStepMinPx, config_1.OVERLAY_CONFIG.driftStepMaxPx);
            const next = (0, window_1.calculateDriftPosition)(window, driftStep, scoreWeights);
            window.setPosition(next.x, next.y, true);
            recordMove(from, next);
            behavior = "drifting";
            opacity = config_1.OVERLAY_CONFIG.normalOpacity;
            lastDriftAt = now;
            lastBehaviorAt = now;
            publishOverlayState();
            return;
        }
        if (behavior !== "resting" && now - lastBehaviorAt >= config_1.OVERLAY_CONFIG.recoverDelayMs) {
            behavior = "resting";
        }
        opacity = config_1.OVERLAY_CONFIG.normalOpacity;
    };
    const tickActivity = () => {
        activity = nextActivityState();
        publishOverlayState();
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
