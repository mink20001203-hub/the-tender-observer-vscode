import { contextBridge, ipcRenderer, IpcRendererEvent } from "electron";
import { OverlayPayload } from "../shared/types";

contextBridge.exposeInMainWorld("tenderOverlay", {
  onUpdate: (callback: (payload: OverlayPayload) => void) => {
    ipcRenderer.on("overlay:update", (_event: IpcRendererEvent, payload: OverlayPayload) => callback(payload));
  },
  ping: () => ipcRenderer.invoke("overlay:ping")
});
