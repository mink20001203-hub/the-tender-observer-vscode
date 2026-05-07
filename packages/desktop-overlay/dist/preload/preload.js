"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
electron_1.contextBridge.exposeInMainWorld("tenderOverlay", {
    onUpdate: (callback) => {
        electron_1.ipcRenderer.on("overlay:update", (_event, payload) => callback(payload));
    },
    ping: () => electron_1.ipcRenderer.invoke("overlay:ping")
});
