"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = __importDefault(require("node:test"));
const strict_1 = __importDefault(require("node:assert/strict"));
const stateClassifier_1 = require("../core/stateClassifier");
(0, node_test_1.default)("classifies idle when idleMinutes crosses threshold", () => {
    const state = (0, stateClassifier_1.computeState)(20, 1, 8.5, "normal");
    strict_1.default.equal(state, "idle");
});
(0, node_test_1.default)("classifies lost on high switches with low typing", () => {
    const state = (0, stateClassifier_1.computeState)(90, 10, 1, "normal");
    strict_1.default.equal(state, "lost");
});
(0, node_test_1.default)("classifies anxious on high typing and switching pattern", () => {
    const state = (0, stateClassifier_1.computeState)(165, 8, 1, "normal");
    strict_1.default.equal(state, "anxious");
});
(0, node_test_1.default)("classifies focused on sustained moderate typing with stable context", () => {
    const state = (0, stateClassifier_1.computeState)(70, 3, 1.2, "normal");
    strict_1.default.equal(state, "focused");
});
(0, node_test_1.default)("high sensitivity enters anxious faster than low sensitivity", () => {
    const high = (0, stateClassifier_1.computeState)(200, 3, 1, "high");
    const low = (0, stateClassifier_1.computeState)(200, 3, 1, "low");
    strict_1.default.equal(high, "anxious");
    strict_1.default.notEqual(low, "anxious");
});
//# sourceMappingURL=stateClassifier.test.js.map