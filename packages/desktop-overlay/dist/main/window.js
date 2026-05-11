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
function edgeBandPx(bounds) {
    return Math.round(Math.min(bounds.width, bounds.height) * config_1.OVERLAY_CONFIG.edgeBandRatio);
}
function centerOf(x, y) {
    return {
        x: x + config_1.OVERLAY_CONFIG.width / 2,
        y: y + config_1.OVERLAY_CONFIG.height / 2
    };
}
function clampToWorkArea(x, y, bounds) {
    const maxX = bounds.x + bounds.width - config_1.OVERLAY_CONFIG.width;
    const maxY = bounds.y + bounds.height - config_1.OVERLAY_CONFIG.height;
    return {
        x: clamp(Math.round(x), bounds.x + config_1.OVERLAY_CONFIG.margin, maxX - config_1.OVERLAY_CONFIG.margin),
        y: clamp(Math.round(y), bounds.y + config_1.OVERLAY_CONFIG.margin, maxY - config_1.OVERLAY_CONFIG.margin)
    };
}
function isInsideCenterSafeZone(candidate, bounds) {
    const centerRatio = config_1.OVERLAY_CONFIG.centerSafeRatio;
    const zoneWidth = bounds.width * centerRatio;
    const zoneHeight = bounds.height * centerRatio;
    const zoneX = bounds.x + (bounds.width - zoneWidth) / 2;
    const zoneY = bounds.y + (bounds.height - zoneHeight) / 2;
    const c = centerOf(candidate.x, candidate.y);
    return c.x >= zoneX && c.x <= zoneX + zoneWidth && c.y >= zoneY && c.y <= zoneY + zoneHeight;
}
function nearestEdgeDistance(candidate, bounds) {
    const maxX = bounds.x + bounds.width - config_1.OVERLAY_CONFIG.width;
    const maxY = bounds.y + bounds.height - config_1.OVERLAY_CONFIG.height;
    const dLeft = Math.abs(candidate.x - bounds.x);
    const dRight = Math.abs(maxX - candidate.x);
    const dTop = Math.abs(candidate.y - bounds.y);
    const dBottom = Math.abs(maxY - candidate.y);
    return Math.min(dLeft, dRight, dTop, dBottom);
}
function clampToEdgeBand(candidate, bounds) {
    const c = clampToWorkArea(candidate.x, candidate.y, bounds);
    const band = edgeBandPx(bounds);
    const maxX = bounds.x + bounds.width - config_1.OVERLAY_CONFIG.width;
    const maxY = bounds.y + bounds.height - config_1.OVERLAY_CONFIG.height;
    const leftEdge = c.x - bounds.x;
    const rightEdge = maxX - c.x;
    const topEdge = c.y - bounds.y;
    const bottomEdge = maxY - c.y;
    const nearest = Math.min(leftEdge, rightEdge, topEdge, bottomEdge);
    if (nearest === leftEdge) {
        return { x: bounds.x + config_1.OVERLAY_CONFIG.margin, y: c.y };
    }
    if (nearest === rightEdge) {
        return { x: maxX - config_1.OVERLAY_CONFIG.margin, y: c.y };
    }
    if (nearest === topEdge) {
        return { x: c.x, y: bounds.y + config_1.OVERLAY_CONFIG.margin };
    }
    if (nearest === bottomEdge) {
        return { x: c.x, y: maxY - config_1.OVERLAY_CONFIG.margin };
    }
    const minX = bounds.x + config_1.OVERLAY_CONFIG.margin;
    const maxXWithMargin = maxX - config_1.OVERLAY_CONFIG.margin;
    const minY = bounds.y + config_1.OVERLAY_CONFIG.margin;
    const maxYWithMargin = maxY - config_1.OVERLAY_CONFIG.margin;
    const leftBandMaxX = minX + band;
    const rightBandMinX = maxXWithMargin - band;
    const topBandMaxY = minY + band;
    const bottomBandMinY = maxYWithMargin - band;
    if (c.x <= leftBandMaxX || c.x >= rightBandMinX || c.y <= topBandMaxY || c.y >= bottomBandMinY) {
        return c;
    }
    const toLeft = Math.abs(c.x - minX);
    const toRight = Math.abs(maxXWithMargin - c.x);
    const toTop = Math.abs(c.y - minY);
    const toBottom = Math.abs(maxYWithMargin - c.y);
    const nearestBand = Math.min(toLeft, toRight, toTop, toBottom);
    if (nearestBand === toLeft) {
        return { x: minX, y: c.y };
    }
    if (nearestBand === toRight) {
        return { x: maxXWithMargin, y: c.y };
    }
    if (nearestBand === toTop) {
        return { x: c.x, y: minY };
    }
    return { x: c.x, y: maxYWithMargin };
}
function generateRingCandidates(current, stepPx, count) {
    const out = [];
    for (let i = 0; i < count; i += 1) {
        const angle = (Math.PI * 2 * i) / count;
        out.push({
            x: current.x + Math.cos(angle) * stepPx,
            y: current.y + Math.sin(angle) * stepPx
        });
    }
    return out;
}
function chooseBestCandidate(params) {
    const weights = params.weights ?? config_1.DEFAULT_SCORE_WEIGHTS;
    const currentCenter = centerOf(params.current.x, params.current.y);
    const band = edgeBandPx(params.bounds);
    const maxDist = Math.hypot(params.bounds.width / 2, params.bounds.height / 2) || 1;
    let best = null;
    for (const raw of params.candidates) {
        const clamped = clampToEdgeBand(raw, params.bounds);
        const nextCenter = centerOf(clamped.x, clamped.y);
        const movement = {
            x: nextCenter.x - currentCenter.x,
            y: nextCenter.y - currentCenter.y
        };
        const cursorVector = {
            x: nextCenter.x - params.cursor.x,
            y: nextCenter.y - params.cursor.y
        };
        const moveLen = Math.hypot(movement.x, movement.y) || 1;
        const cursorLen = Math.hypot(cursorVector.x, cursorVector.y) || 1;
        const awayCos = (movement.x * cursorVector.x + movement.y * cursorVector.y) / (moveLen * cursorLen);
        const awayScore = (awayCos + 1) / 2;
        const edgeDist = nearestEdgeDistance(clamped, params.bounds);
        const edgeScore = Math.max(0, 1 - edgeDist / band);
        const centerDist = Math.hypot(nextCenter.x - (params.bounds.x + params.bounds.width / 2), nextCenter.y - (params.bounds.y + params.bounds.height / 2));
        const centerAvoidScore = centerDist / maxDist;
        const cursorDist = Math.hypot(nextCenter.x - params.cursor.x, nextCenter.y - params.cursor.y);
        const overlapPenalty = cursorDist < config_1.OVERLAY_CONFIG.cursorExclusionRadiusPx ? 0.45 : 0;
        const centerPenalty = isInsideCenterSafeZone(clamped, params.bounds) ? 0.35 : 0;
        const score = awayScore * weights.away +
            edgeScore * weights.edge +
            centerAvoidScore * weights.centerAvoid -
            overlapPenalty -
            centerPenalty;
        if (!best || score > best.score) {
            best = { x: clamped.x, y: clamped.y, score };
        }
    }
    return best ? { x: best.x, y: best.y } : params.current;
}
function createOverlayWindow() {
    const area = workAreaBounds();
    const x = area.x + area.width - config_1.OVERLAY_CONFIG.width - config_1.OVERLAY_CONFIG.margin;
    const y = area.y + area.height - config_1.OVERLAY_CONFIG.height - config_1.OVERLAY_CONFIG.margin;
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
function calculateAvoidPosition(window, cursor, stepPx, weights) {
    const bounds = window.getBounds();
    const area = workAreaBounds();
    const candidates = generateRingCandidates({ x: bounds.x, y: bounds.y }, stepPx, 12);
    return chooseBestCandidate({
        current: { x: bounds.x, y: bounds.y },
        cursor,
        bounds: area,
        candidates,
        weights
    });
}
function calculateDriftPosition(window, stepPx, weights) {
    const bounds = window.getBounds();
    const area = workAreaBounds();
    const fakeCursor = {
        x: area.x + area.width / 2,
        y: area.y + area.height / 2
    };
    const candidates = generateRingCandidates({ x: bounds.x, y: bounds.y }, stepPx, 8);
    return chooseBestCandidate({
        current: { x: bounds.x, y: bounds.y },
        cursor: fakeCursor,
        bounds: area,
        candidates,
        weights
    });
}
