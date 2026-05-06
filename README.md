# The Tender Observer (VS Code Extension)

A privacy-first ambient companion for developers.

## Structure

- `src/extension.ts`: rhythm monitor, local JSON persistence, command registration, webview host
- `src/webview/ambient.js`: Canvas particle animation (dust -> genie -> dispersal)
- `package.json`: extension metadata and commands

## Commands

- `Tender Observer: Open Ambient View`
- `Tender Observer: Secret Mode (Disperse)`

## Privacy

All runtime signals (typing rhythm, idle time, editor switching) are processed locally.
No external network transmission is included.
