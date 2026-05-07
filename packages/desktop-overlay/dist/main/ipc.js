"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerIpc = registerIpc;
const electron_1 = require("electron");
function registerIpc(window) {
    electron_1.ipcMain.handle("overlay:ping", () => {
        return { ok: true, title: window.getTitle() };
    });
}
