"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.whisperForState = whisperForState;
function canWhisper(lastWhisperAt, now, cooldownMinutes) {
    return now - lastWhisperAt >= cooldownMinutes * 60_000;
}
function whisperForState(params, settings) {
    if (!settings.whisperEnabled) {
        return undefined;
    }
    const hour = new Date(params.now).getHours();
    const isNightHour = hour >= 2 && hour <= 5;
    if (!settings.nightWhisperEnabled && isNightHour) {
        return undefined;
    }
    const anxiousStreakThreshold = params.triggerVariant === "A" ? 2 : 3;
    const anxiousCooldown = params.triggerVariant === "A" ? 12 : 16;
    const lostStreakThreshold = params.triggerVariant === "A" ? 2 : 3;
    const lostCooldown = params.triggerVariant === "A" ? 10 : 14;
    const idleThresholdMinutes = params.triggerVariant === "A" ? 12 : 15;
    const idleCooldown = params.triggerVariant === "A" ? 30 : 40;
    const focusedNightCooldown = params.triggerVariant === "A" ? 90 : 120;
    if (params.state === "anxious" &&
        params.stateStreak >= anxiousStreakThreshold &&
        canWhisper(params.lastWhisperAt, params.now, anxiousCooldown)) {
        if (isNightHour) {
            return {
                message: "밤의 적막이 깊네요. 당신의 코드는 아름답지만, 내일의 당신을 위해 잠시 램프를 꺼두는 건 어떨까요?",
                reason: `anxious_streak_night_v${params.triggerVariant}`
            };
        }
        return {
            message: "잠시 커피를 내리는 향기가 그리운 시간입니다. 지친 마음을 잠시 비우고 돌아오세요.",
            reason: `anxious_streak_v${params.triggerVariant}`
        };
    }
    if (params.state === "lost" &&
        params.stateStreak >= lostStreakThreshold &&
        canWhisper(params.lastWhisperAt, params.now, lostCooldown)) {
        return {
            message: "길을 찾는 손끝에도 리듬이 있습니다. 한 파일만 고르고, 숨을 고른 뒤 다시 시작해요.",
            reason: `lost_streak_v${params.triggerVariant}`
        };
    }
    if (params.state === "idle" &&
        params.previousState !== "idle" &&
        params.idleMinutes >= idleThresholdMinutes &&
        canWhisper(params.lastWhisperAt, params.now, idleCooldown)) {
        return {
            message: "고요한 틈도 작업의 일부입니다. 돌아오는 걸음이 조금 더 가벼워지길 바랍니다.",
            reason: `idle_transition_long_v${params.triggerVariant}`
        };
    }
    if (params.state === "focused" &&
        params.previousState !== "focused" &&
        isNightHour &&
        canWhisper(params.lastWhisperAt, params.now, focusedNightCooldown)) {
        return {
            message: "깊은 몰입이 이어지고 있어요. 지금은 집중을 마무리하고 쉬어갈 타이밍일지도 모릅니다.",
            reason: `focused_transition_night_v${params.triggerVariant}`
        };
    }
    return undefined;
}
//# sourceMappingURL=interventionEngine.js.map