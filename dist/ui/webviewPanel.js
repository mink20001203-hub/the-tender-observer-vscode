"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.AmbientPanel = void 0;
const vscode = __importStar(require("vscode"));
class AmbientPanel {
    context;
    panel;
    constructor(context) {
        this.context = context;
    }
    openPanel() {
        if (this.panel) {
            this.panel.reveal(vscode.ViewColumn.Beside, true);
            return;
        }
        this.panel = vscode.window.createWebviewPanel("tenderObserverAmbient", "The Tender Observer", vscode.ViewColumn.Beside, {
            enableScripts: true,
            retainContextWhenHidden: true
        });
        this.panel.webview.html = this.webviewHtml(this.panel.webview);
        this.panel.onDidDispose(() => {
            this.panel = undefined;
        });
    }
    postAmbient(payload) {
        if (this.panel) {
            void this.panel.webview.postMessage(payload);
        }
    }
    webviewHtml(webview) {
        const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this.context.extensionUri, "src", "webview", "ambient.js"));
        const nonce = String(Date.now());
        return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8" />
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-${nonce}';" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>The Tender Observer</title>
  <style>
    :root {
      --ivory: #F9F8F5;
      --ink: #2f2d2a;
      --dust: rgba(80, 76, 70, 0.56);
      --mist: rgba(130, 122, 112, 0.2);
    }
    html, body {
      margin: 0;
      width: 100%;
      height: 100%;
      background: radial-gradient(circle at 30% 20%, #fffdfa 0%, var(--ivory) 48%, #f2efe9 100%);
      color: var(--ink);
      font-family: "Iowan Old Style", "Times New Roman", serif;
      overflow: hidden;
    }
    .frame {
      position: relative;
      width: 100%;
      height: 100%;
    }
    canvas {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
    }
    .whisper {
      position: absolute;
      left: 18px;
      right: 18px;
      bottom: 18px;
      padding: 12px 14px;
      border-radius: 10px;
      background: rgba(249, 248, 245, 0.72);
      backdrop-filter: blur(2px);
      border: 1px solid rgba(120, 112, 103, 0.2);
      font-size: 13px;
      line-height: 1.55;
      opacity: 0;
      transform: translateY(6px);
      transition: opacity 640ms ease, transform 640ms ease;
      letter-spacing: 0.2px;
    }
    .whisper.show {
      opacity: 1;
      transform: translateY(0);
    }
    .label {
      position: absolute;
      top: 16px;
      left: 18px;
      font-size: 11px;
      letter-spacing: 1.2px;
      text-transform: uppercase;
      color: rgba(54, 50, 45, 0.62);
    }
  </style>
</head>
<body>
  <div class="frame">
    <div class="label">The Tender Observer</div>
    <canvas id="ambient"></canvas>
    <div id="whisper" class="whisper"></div>
  </div>
  <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
    }
}
exports.AmbientPanel = AmbientPanel;
//# sourceMappingURL=webviewPanel.js.map