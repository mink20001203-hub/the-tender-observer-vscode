import { BrowserWindow, ipcMain } from "electron";

export function registerIpc(window: BrowserWindow): void {
  ipcMain.handle("overlay:ping", () => {
    return { ok: true, title: window.getTitle() };
  });
}
