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
exports.persistWeeklyRhythm = persistWeeklyRhythm;
exports.openWeeklyRhythmLog = openWeeklyRhythmLog;
exports.readWeeklyRhythmPayload = readWeeklyRhythmPayload;
exports.readWeeklyInsights = readWeeklyInsights;
const vscode = __importStar(require("vscode"));
const weeklyInsights_1 = require("../core/weeklyInsights");
const weeklyPayload_1 = require("../core/weeklyPayload");
async function persistWeeklyRhythm(params) {
    const folder = vscode.Uri.joinPath(params.context.globalStorageUri, "rhythm");
    const file = vscode.Uri.joinPath(folder, "weekly-rhythm.json");
    await vscode.workspace.fs.createDirectory(folder);
    const payload = (0, weeklyPayload_1.buildWeeklyPayload)({
        snapshots: params.snapshots,
        triggerVariant: params.triggerVariant,
        settings: params.settings,
        extensionVersion: params.context.extension.packageJSON.version ?? "0.0.0"
    });
    const encoded = new TextEncoder().encode(JSON.stringify(payload, null, 2));
    await vscode.workspace.fs.writeFile(file, encoded);
}
async function openWeeklyRhythmLog(params) {
    const folder = vscode.Uri.joinPath(params.context.globalStorageUri, "rhythm");
    const file = vscode.Uri.joinPath(folder, "weekly-rhythm.json");
    await vscode.workspace.fs.createDirectory(folder);
    try {
        await vscode.workspace.fs.stat(file);
    }
    catch {
        const emptyPayload = {
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
async function readWeeklyRhythmPayload(params) {
    const folder = vscode.Uri.joinPath(params.context.globalStorageUri, "rhythm");
    const file = vscode.Uri.joinPath(folder, "weekly-rhythm.json");
    await vscode.workspace.fs.createDirectory(folder);
    let payload;
    try {
        const bytes = await vscode.workspace.fs.readFile(file);
        payload = JSON.parse(new TextDecoder().decode(bytes));
    }
    catch {
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
async function readWeeklyInsights(params) {
    const payload = await readWeeklyRhythmPayload(params);
    const insights = (0, weeklyInsights_1.buildWeeklyInsights)(payload);
    return { payload, insights };
}
//# sourceMappingURL=rhythmLogService.js.map