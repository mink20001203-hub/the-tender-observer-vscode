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
exports.createOverlayWindow = createOverlayWindow;
exports.calculateAvoidPosition = calculateAvoidPosition;
exports.calculateDriftPosition = calculateDriftPosition;
const electron_1 = require("electron");
const path = __importStar(require("node:path"));
const config_1 = require("../shared/config");
function workAreaBounds() {
    return electron_1.screen.getPrimaryDisplay().workArea;
}
function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}
function clampToWorkArea(x, y, bounds) {
    const maxX = bounds.x + bounds.width - config_1.OVERLAY_CONFIG.width;
    const maxY = bounds.y + bounds.height - config_1.OVERLAY_CONFIG.height;
    return {
        x: clamp(Math.round(x), bounds.x, maxX),
        y: clamp(Math.round(y), bounds.y, maxY)
    };
}
function snapToEdgeBand(x, y, bounds) {
    const leftDist = Math.abs(x - bounds.x);
    const rightX = bounds.x + bounds.width - config_1.OVERLAY_CONFIG.width;
    const rightDist = Math.abs(rightX - x);
    const topDist = Math.abs(y - bounds.y);
    const bottomY = bounds.y + bounds.height - config_1.OVERLAY_CONFIG.height;
    const bottomDist = Math.abs(bottomY - y);
    const nearest = Math.min(leftDist, rightDist, topDist, bottomDist);
    if (nearest === leftDist) {
        return { x: bounds.x + config_1.OVERLAY_CONFIG.margin, y };
    }
    if (nearest === rightDist) {
        return { x: rightX - config_1.OVERLAY_CONFIG.margin, y };
    }
    if (nearest === topDist) {
        return { x, y: bounds.y + config_1.OVERLAY_CONFIG.margin };
    }
    return { x, y: bottomY - config_1.OVERLAY_CONFIG.margin };
}
function centerOf(x, y) {
    return {
        x: x + config_1.OVERLAY_CONFIG.width / 2,
        y: y + config_1.OVERLAY_CONFIG.height / 2
    };
}
function normalizedAwayScore(candidate, current, cursor) {
    const c0 = centerOf(current.x, current.y);
    const c1 = centerOf(candidate.x, candidate.y);
    const fromCursorX = c1.x - cursor.x;
    const fromCursorY = c1.y - cursor.y;
    const movementX = c1.x - c0.x;
    const movementY = c1.y - c0.y;
    const lenA = Math.hypot(fromCursorX, fromCursorY) || 1;
    const lenB = Math.hypot(movementX, movementY) || 1;
    const cosine = (fromCursorX * movementX + fromCursorY * movementY) / (lenA * lenB);
    return (cosine + 1) / 2;
}
function edgeScore(candidate, bounds) {
    const rightX = bounds.x + bounds.width - config_1.OVERLAY_CONFIG.width;
    const bottomY = bounds.y + bounds.height - config_1.OVERLAY_CONFIG.height;
    const dLeft = Math.abs(candidate.x - bounds.x);
    const dRight = Math.abs(rightX - candidate.x);
    const dTop = Math.abs(candidate.y - bounds.y);
    const dBottom = Math.abs(bottomY - candidate.y);
    const nearest = Math.min(dLeft, dRight, dTop, dBottom);
    const normalized = Math.max(0, 1 - nearest / config_1.OVERLAY_CONFIG.edgeBandPx);
    return normalized;
}
function centerAvoidScore(candidate, bounds) {
    const c = centerOf(candidate.x, candidate.y);
    const screenCenterX = bounds.x + bounds.width / 2;
    const screenCenterY = bounds.y + bounds.height / 2;
    const dist = Math.hypot(c.x - screenCenterX, c.y - screenCenterY);
    const maxDist = Math.hypot(bounds.width / 2, bounds.height / 2) || 1;
    return dist / maxDist;
}
function chooseBestCandidate(params) {
    const weights = params.weights ?? config_1.DEFAULT_SCORE_WEIGHTS;
    const candidates = [];
    for (let i = 0; i < params.count; i += 1) {
        const angle = (Math.PI * 2 * i) / params.count;
        const rawX = params.current.x + Math.cos(angle) * params.stepPx;
        const rawY = params.current.y + Math.sin(angle) * params.stepPx;
        const clamped = clampToWorkArea(rawX, rawY, params.bounds);
        const snapped = snapToEdgeBand(clamped.x, clamped.y, params.bounds);
        const away = normalizedAwayScore(snapped, params.current, params.cursor);
        const edge = edgeScore(snapped, params.bounds);
        const centerAvoid = centerAvoidScore(snapped, params.bounds);
        const score = away * weights.away + edge * weights.edge + centerAvoid * weights.centerAvoid;
        candidates.push({ ...snapped, score });
    }
    candidates.sort((a, b) => b.score - a.score);
    return { x: candidates[0].x, y: candidates[0].y };
}
function createOverlayWindow() {
    const area = workAreaBounds();
    const screenWidth = area.width;
    const screenHeight = area.height;
    const x = screenWidth - config_1.OVERLAY_CONFIG.width - config_1.OVERLAY_CONFIG.margin;
    const y = screenHeight - config_1.OVERLAY_CONFIG.height - config_1.OVERLAY_CONFIG.margin;
    const window = new electron_1.BrowserWindow({
        width: config_1.OVERLAY_CONFIG.width,
        height: config_1.OVERLAY_CONFIG.height,
        x,
        y,
        frame: false,
        transparent: true,
        resizable: false,
        alwaysOnTop: true,
        skipTaskbar: true,
        hasShadow: false,
        fullscreenable: false,
        webPreferences: {
            preload: path.join(__dirname, "../preload/preload.js"),
            contextIsolation: true,
            nodeIntegration: false
        }
    });
    window.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
    window.loadFile(path.join(__dirname, "../../src/renderer/index.html"));
    window.setOpacity(config_1.OVERLAY_CONFIG.normalOpacity);
    return window;
}
function calculateAvoidPosition(window, cursor, weights) {
    const bounds = window.getBounds();
    const area = workAreaBounds();
    return chooseBestCandidate({
        current: { x: bounds.x, y: bounds.y },
        cursor,
        bounds: area,
        stepPx: config_1.OVERLAY_CONFIG.avoidStepPx,
        count: 12,
        weights
    });
}
function calculateDriftPosition(window, weights) {
    const bounds = window.getBounds();
    const area = workAreaBounds();
    const fakeCursor = centerOf(area.x + area.width / 2 - config_1.OVERLAY_CONFIG.width / 2, area.y + area.height / 2 - config_1.OVERLAY_CONFIG.height / 2);
    return chooseBestCandidate({
        current: { x: bounds.x, y: bounds.y },
        cursor: { x: fakeCursor.x, y: fakeCursor.y },
        bounds: area,
        stepPx: config_1.OVERLAY_CONFIG.driftStepPx,
        count: 8,
        weights
    });
}
