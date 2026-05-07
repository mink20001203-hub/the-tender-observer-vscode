import { BrowserWindow, Point, Rectangle, screen } from "electron";
import * as path from "node:path";
import { DEFAULT_SCORE_WEIGHTS, OVERLAY_CONFIG, ScoreWeights } from "../shared/config";

function workAreaBounds(): Rectangle {
  return screen.getPrimaryDisplay().workArea;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function clampToWorkArea(x: number, y: number, bounds: Rectangle): { x: number; y: number } {
  const maxX = bounds.x + bounds.width - OVERLAY_CONFIG.width;
  const maxY = bounds.y + bounds.height - OVERLAY_CONFIG.height;
  return {
    x: clamp(Math.round(x), bounds.x, maxX),
    y: clamp(Math.round(y), bounds.y, maxY)
  };
}

function snapToEdgeBand(x: number, y: number, bounds: Rectangle): { x: number; y: number } {
  const leftDist = Math.abs(x - bounds.x);
  const rightX = bounds.x + bounds.width - OVERLAY_CONFIG.width;
  const rightDist = Math.abs(rightX - x);
  const topDist = Math.abs(y - bounds.y);
  const bottomY = bounds.y + bounds.height - OVERLAY_CONFIG.height;
  const bottomDist = Math.abs(bottomY - y);

  const nearest = Math.min(leftDist, rightDist, topDist, bottomDist);
  if (nearest === leftDist) {
    return { x: bounds.x + OVERLAY_CONFIG.margin, y };
  }
  if (nearest === rightDist) {
    return { x: rightX - OVERLAY_CONFIG.margin, y };
  }
  if (nearest === topDist) {
    return { x, y: bounds.y + OVERLAY_CONFIG.margin };
  }
  return { x, y: bottomY - OVERLAY_CONFIG.margin };
}

function centerOf(x: number, y: number): { x: number; y: number } {
  return {
    x: x + OVERLAY_CONFIG.width / 2,
    y: y + OVERLAY_CONFIG.height / 2
  };
}

function normalizedAwayScore(candidate: { x: number; y: number }, current: { x: number; y: number }, cursor: Point): number {
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

function edgeScore(candidate: { x: number; y: number }, bounds: Rectangle): number {
  const rightX = bounds.x + bounds.width - OVERLAY_CONFIG.width;
  const bottomY = bounds.y + bounds.height - OVERLAY_CONFIG.height;
  const dLeft = Math.abs(candidate.x - bounds.x);
  const dRight = Math.abs(rightX - candidate.x);
  const dTop = Math.abs(candidate.y - bounds.y);
  const dBottom = Math.abs(bottomY - candidate.y);
  const nearest = Math.min(dLeft, dRight, dTop, dBottom);
  const normalized = Math.max(0, 1 - nearest / OVERLAY_CONFIG.edgeBandPx);
  return normalized;
}

function centerAvoidScore(candidate: { x: number; y: number }, bounds: Rectangle): number {
  const c = centerOf(candidate.x, candidate.y);
  const screenCenterX = bounds.x + bounds.width / 2;
  const screenCenterY = bounds.y + bounds.height / 2;
  const dist = Math.hypot(c.x - screenCenterX, c.y - screenCenterY);
  const maxDist = Math.hypot(bounds.width / 2, bounds.height / 2) || 1;
  return dist / maxDist;
}

function chooseBestCandidate(params: {
  current: { x: number; y: number };
  cursor: Point;
  bounds: Rectangle;
  stepPx: number;
  count: number;
  weights?: ScoreWeights;
}): { x: number; y: number } {
  const weights = params.weights ?? DEFAULT_SCORE_WEIGHTS;
  const candidates: { x: number; y: number; score: number }[] = [];

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

export function createOverlayWindow(): BrowserWindow {
  const area = workAreaBounds();
  const screenWidth = area.width;
  const screenHeight = area.height;

  const x = screenWidth - OVERLAY_CONFIG.width - OVERLAY_CONFIG.margin;
  const y = screenHeight - OVERLAY_CONFIG.height - OVERLAY_CONFIG.margin;

  const window = new BrowserWindow({
    width: OVERLAY_CONFIG.width,
    height: OVERLAY_CONFIG.height,
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
  window.setOpacity(OVERLAY_CONFIG.normalOpacity);
  return window;
}

export function calculateAvoidPosition(window: BrowserWindow, cursor: Point, weights?: ScoreWeights): { x: number; y: number } {
  const bounds = window.getBounds();
  const area = workAreaBounds();
  return chooseBestCandidate({
    current: { x: bounds.x, y: bounds.y },
    cursor,
    bounds: area,
    stepPx: OVERLAY_CONFIG.avoidStepPx,
    count: 12,
    weights
  });
}

export function calculateDriftPosition(window: BrowserWindow, weights?: ScoreWeights): { x: number; y: number } {
  const bounds = window.getBounds();
  const area = workAreaBounds();
  const fakeCursor = centerOf(area.x + area.width / 2 - OVERLAY_CONFIG.width / 2, area.y + area.height / 2 - OVERLAY_CONFIG.height / 2);
  return chooseBestCandidate({
    current: { x: bounds.x, y: bounds.y },
    cursor: { x: fakeCursor.x, y: fakeCursor.y },
    bounds: area,
    stepPx: OVERLAY_CONFIG.driftStepPx,
    count: 8,
    weights
  });
}
