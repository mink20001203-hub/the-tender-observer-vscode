"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.computeState = computeState;
const settings_1 = require("./settings");
function computeState(typingPerMinute, switchesPerMinute, idleMinutes, sensitivity) {
    const profile = (0, settings_1.sensitivityProfile)(sensitivity);
    if (idleMinutes >= profile.idleMinutes) {
        return "idle";
    }
    if (switchesPerMinute >= profile.lostSwitches ||
        (switchesPerMinute >= profile.lostSwitchesWithLowTyping && typingPerMinute < profile.lowTypingThreshold)) {
        return "lost";
    }
    if (typingPerMinute >= profile.anxiousTyping ||
        (typingPerMinute >= profile.anxiousTypingWithSwitches && switchesPerMinute >= profile.anxiousSwitches)) {
        return "anxious";
    }
    if (typingPerMinute >= profile.focusedTyping &&
        switchesPerMinute <= profile.focusedMaxSwitches &&
        idleMinutes < profile.focusedMaxIdleMinutes) {
        return "focused";
    }
    return "calm";
}
//# sourceMappingURL=stateClassifier.js.map