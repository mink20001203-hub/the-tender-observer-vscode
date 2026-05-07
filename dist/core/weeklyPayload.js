"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildWeeklyPayload = buildWeeklyPayload;
function buildWeeklyPayload(params) {
    const totalSnapshots = params.snapshots.length;
    const whisperCount = params.snapshots.reduce((count, snapshot) => (snapshot.whisperShown ? count + 1 : count), 0);
    const stateCounts = {
        calm: 0,
        focused: 0,
        anxious: 0,
        idle: 0,
        lost: 0
    };
    let typingSum = 0;
    let switchesSum = 0;
    let idleSum = 0;
    let intensitySum = 0;
    for (const snapshot of params.snapshots) {
        stateCounts[snapshot.state] += 1;
        typingSum += snapshot.typingPerMinute;
        switchesSum += snapshot.switchesPerMinute;
        idleSum += snapshot.idleMinutes;
        intensitySum += snapshot.intensity;
    }
    const divisor = totalSnapshots > 0 ? totalSnapshots : 1;
    const nowIso = new Date().toISOString();
    return {
        schemaVersion: 2,
        privacy: "local-memory-and-local-storage-only",
        updatedAt: nowIso,
        meta: {
            generatedAt: nowIso,
            extensionVersion: params.extensionVersion,
            sampleIntervalSeconds: 60,
            triggerVariant: params.triggerVariant,
            settings: params.settings
        },
        summary: {
            totalSnapshots,
            whisperCount,
            stateCounts,
            averageTypingPerMinute: Number((typingSum / divisor).toFixed(2)),
            averageSwitchesPerMinute: Number((switchesSum / divisor).toFixed(2)),
            averageIdleMinutes: Number((idleSum / divisor).toFixed(2)),
            averageIntensity: Number((intensitySum / divisor).toFixed(3))
        },
        snapshots: params.snapshots
    };
}
//# sourceMappingURL=weeklyPayload.js.map