"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sensitivityProfile = sensitivityProfile;
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
//# sourceMappingURL=sensitivityProfile.js.map