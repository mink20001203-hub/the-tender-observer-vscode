import { BrowserWindow, Point, Rectangle, screen } from "electron";
import * as path from "node:path";
import { DEFAULT_SCORE_WEIGHTS, OVERLAY_CONFIG, ScoreWeights } from "../shared/config";

function workAreaBounds(): Rectangle {
  return screen.getPrimaryDisplay().workArea;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function edgeBandPx(bounds: Rectangle): number {
  return Math.round(Math.min(bounds.width, bounds.height) * OVERLAY_CONFIG.edgeBandRatio);
}

function centerOf(x: number, y: number): Point {
  return {
    x: x + OVERLAY_CONFIG.width / 2,
    y: y + OVERLAY_CONFIG.height / 2
  };
}

function clampToWorkArea(x: number, y: number, bounds: Rectangle): { x: number; y: number } {
  const maxX = bounds.x + bounds.width - OVERLAY_CONFIG.width;
  const maxY = bounds.y + bounds.height - OVERLAY_CONFIG.height;
  return {
    x: clamp(Math.round(x), bounds.x + OVERLAY_CONFIG.margin, maxX - OVERLAY_CONFIG.margin),
    y: clamp(Math.round(y), bounds.y + OVERLAY_CONFIG.margin, maxY - OVERLAY_CONFIG.margin)
  };
}

function isInsideCenterSafeZone(candidate: { x: number; y: number }, bounds: Rectangle): boolean {
  const centerRatio = OVERLAY_CONFIG.centerSafeRatio;
  const zoneWidth = bounds.width * centerRatio;
  const zoneHeight = bounds.height * centerRatio;
  const zoneX = bounds.x + (bounds.width - zoneWidth) / 2;
  const zoneY = bounds.y + (bounds.height - zoneHeight) / 2;

  const c = centerOf(candidate.x, candidate.y);
  return c.x >= zoneX && c.x <= zoneX + zoneWidth && c.y >= zoneY && c.y <= zoneY + zoneHeight;
}

function nearestEdgeDistance(candidate: { x: number; y: number }, bounds: Rectangle): number {
  const maxX = bounds.x + bounds.width - OVERLAY_CONFIG.width;
  const maxY = bounds.y + bounds.height - OVERLAY_CONFIG.height;
  const dLeft = Math.abs(candidate.x - bounds.x);
  const dRight = Math.abs(maxX - candidate.x);
  const dTop = Math.abs(candidate.y - bounds.y);
  const dBottom = Math.abs(maxY - candidate.y);
  return Math.min(dLeft, dRight, dTop, dBottom);
}

function clampToEdgeBand(candidate: { x: number; y: number }, bounds: Rectangle): { x: number; y: number } {
  const c = clampToWorkArea(candidate.x, candidate.y, bounds);
  const band = edgeBandPx(bounds);
  const maxX = bounds.x + bounds.width - OVERLAY_CONFIG.width;
  const maxY = bounds.y + bounds.height - OVERLAY_CONFIG.height;

  const leftEdge = c.x - bounds.x;
  const rightEdge = maxX - c.x;
  const topEdge = c.y - bounds.y;
  const bottomEdge = maxY - c.y;
  const nearest = Math.min(leftEdge, rightEdge, topEdge, bottomEdge);

  if (nearest === leftEdge) {
    return { x: bounds.x + OVERLAY_CONFIG.margin, y: c.y };
  }
  if (nearest === rightEdge) {
    return { x: maxX - OVERLAY_CONFIG.margin, y: c.y };
  }
  if (nearest === topEdge) {
    return { x: c.x, y: bounds.y + OVERLAY_CONFIG.margin };
  }
  if (nearest === bottomEdge) {
    return { x: c.x, y: maxY - OVERLAY_CONFIG.margin };
  }

  const minX = bounds.x + OVERLAY_CONFIG.margin;
  const maxXWithMargin = maxX - OVERLAY_CONFIG.margin;
  const minY = bounds.y + OVERLAY_CONFIG.margin;
  const maxYWithMargin = maxY - OVERLAY_CONFIG.margin;

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

function generateRingCandidates(current: { x: number; y: number }, stepPx: number, count: number): { x: number; y: number }[] {
  const out: { x: number; y: number }[] = [];
  for (let i = 0; i < count; i += 1) {
    const angle = (Math.PI * 2 * i) / count;
    out.push({
      x: current.x + Math.cos(angle) * stepPx,
      y: current.y + Math.sin(angle) * stepPx
    });
  }
  return out;
}

function chooseBestCandidate(params: {
  current: { x: number; y: number };
  cursor: Point;
  bounds: Rectangle;
  candidates: { x: number; y: number }[];
  weights?: ScoreWeights;
}): { x: number; y: number } {
  const weights = params.weights ?? DEFAULT_SCORE_WEIGHTS;
  const currentCenter = centerOf(params.current.x, params.current.y);
  const band = edgeBandPx(params.bounds);
  const maxDist = Math.hypot(params.bounds.width / 2, params.bounds.height / 2) || 1;

  let best: { x: number; y: number; score: number } | null = null;

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

    const centerDist = Math.hypot(
      nextCenter.x - (params.bounds.x + params.bounds.width / 2),
      nextCenter.y - (params.bounds.y + params.bounds.height / 2)
    );
    const centerAvoidScore = centerDist / maxDist;

    const cursorDist = Math.hypot(nextCenter.x - params.cursor.x, nextCenter.y - params.cursor.y);
    const overlapPenalty = cursorDist < OVERLAY_CONFIG.cursorExclusionRadiusPx ? 0.45 : 0;
    const centerPenalty = isInsideCenterSafeZone(clamped, params.bounds) ? 0.35 : 0;

    const score =
      awayScore * weights.away +
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

export function createOverlayWindow(): BrowserWindow {
  const area = workAreaBounds();
  const x = area.x + area.width - OVERLAY_CONFIG.width - OVERLAY_CONFIG.margin;
  const y = area.y + area.height - OVERLAY_CONFIG.height - OVERLAY_CONFIG.margin;

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

export function calculateAvoidPosition(window: BrowserWindow, cursor: Point, stepPx: number, weights?: ScoreWeights): { x: number; y: number } {
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

export function calculateDriftPosition(window: BrowserWindow, stepPx: number, weights?: ScoreWeights): { x: number; y: number } {
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
