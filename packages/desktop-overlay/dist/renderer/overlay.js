"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const stateBadge = document.getElementById("state-badge");
const message = document.getElementById("overlay-message");
const updated = document.getElementById("overlay-updated");
const debug = document.getElementById("overlay-debug");
const card = document.querySelector(".overlay-card");
function applyPayload(payload) {
    if (!stateBadge || !message || !updated || !debug || !card) {
        return;
    }
    stateBadge.textContent = payload.state;
    stateBadge.className = `state-badge state-${payload.state}`;
    message.textContent = payload.message;
    updated.textContent = `마지막 업데이트: ${new Date(payload.updatedAt).toLocaleTimeString("ko-KR")}`;
    debug.textContent = `w: a${payload.scoreWeights.away.toFixed(2)} e${payload.scoreWeights.edge.toFixed(2)} c${payload.scoreWeights.centerAvoid.toFixed(2)}`;
    card.style.opacity = String(payload.opacity);
    card.dataset.behavior = payload.behavior;
}
window.tenderOverlay.onUpdate((payload) => {
    applyPayload(payload);
});
void window.tenderOverlay.ping();
