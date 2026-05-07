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
exports.getSettings = getSettings;
exports.sensitivityProfile = sensitivityProfile;
const vscode = __importStar(require("vscode"));
function getSettings() {
    const config = vscode.workspace.getConfiguration("tenderObserver");
    const sensitivity = config.get("sensitivity", "normal");
    const normalizedSensitivity = sensitivity === "low" || sensitivity === "high" || sensitivity === "normal" ? sensitivity : "normal";
    return {
        whisperEnabled: config.get("whisperEnabled", true),
        sensitivity: normalizedSensitivity,
        nightWhisperEnabled: config.get("nightWhisperEnabled", true)
    };
}
function sensitivityProfile(sensitivity) {
    if (sensitivity === "low") {
        return {
            idleMinutes: 10,
            lostSwitches: 16,
            lostSwitchesWithLowTyping: 11,
            lowTypingThreshold: 110,
            anxiousTyping: 250,
            anxiousTypingWithSwitches: 170,
            anxiousSwitches: 8,
            focusedTyping: 70,
            focusedMaxSwitches: 7,
            focusedMaxIdleMinutes: 2.0
        };
    }
    if (sensitivity === "high") {
        return {
            idleMinutes: 6,
            lostSwitches: 12,
            lostSwitchesWithLowTyping: 8,
            lowTypingThreshold: 130,
            anxiousTyping: 190,
            anxiousTypingWithSwitches: 130,
            anxiousSwitches: 6,
            focusedTyping: 45,
            focusedMaxSwitches: 9,
            focusedMaxIdleMinutes: 3.0
        };
    }
    return {
        idleMinutes: 8,
        lostSwitches: 14,
        lostSwitchesWithLowTyping: 9,
        lowTypingThreshold: 120,
        anxiousTyping: 220,
        anxiousTypingWithSwitches: 150,
        anxiousSwitches: 7,
        focusedTyping: 55,
        focusedMaxSwitches: 8,
        focusedMaxIdleMinutes: 2.5
    };
}
//# sourceMappingURL=settings.js.map