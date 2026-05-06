# The Tender Observer (VS Code Extension)

A privacy-first ambient companion that observes coding rhythm and responds with minimal, gentle interventions.

## What It Does

- Samples local activity every 60 seconds:
  - typing amount
  - file switches
  - idle duration
- Classifies rhythm state:
  - `calm`, `focused`, `anxious`, `idle`, `lost`
- Renders ambient feedback in a webview
- Shows whisper messages only when trigger rules are met
- Saves all data locally in `weekly-rhythm.json` (schema v2)

## Usage Scenario

1. Start coding as usual.
2. Open `Tender Observer: Open Ambient View`.
3. Keep the panel open while you work.
4. Let the extension classify your rhythm and occasionally intervene.
5. Review accumulated data via `Tender Observer: Open Weekly Rhythm Log`.

This is designed for low-friction awareness, not constant coaching.

## Commands

- `Tender Observer: Open Ambient View`
- `Tender Observer: Open Weekly Rhythm Log`
- `Tender Observer: Secret Mode (Disperse)`

## Settings

Use VS Code Settings (`tenderObserver.*`):

- `tenderObserver.whisperEnabled` (`true`/`false`)
  - master switch for whisper messages
- `tenderObserver.sensitivity` (`low`/`normal`/`high`)
  - controls classification thresholds
- `tenderObserver.nightWhisperEnabled` (`true`/`false`)
  - allows or blocks whisper interventions during 2AM-5AM

## Trigger Philosophy

- Intervene only when there is sustained signal, not on one noisy minute.
- Apply cooldowns to avoid user fatigue.
- Keep behavior local and explainable through logs.
- Compare trigger variants (`A`/`B`) to find lower-fatigue rules.

## Data Schema (weekly-rhythm.json v2)

The file includes:

- `meta`
  - extension version
  - sample interval
  - A/B trigger variant
  - active settings snapshot
- `summary`
  - state counts
  - whisper count
  - averaged metrics
- `snapshots`
  - minute-level observations and trigger reasons

## Debugging Checklist

1. Build check:
   - `npm run build`
2. If commands do not appear:
   - reload VS Code window
   - confirm extension is installed and enabled
3. If TypeScript diagnostics look wrong (`NodeJS`, `setInterval`, `TextEncoder` missing):
   - select workspace TypeScript version
   - restart TS server
4. If behavior looks too noisy or too quiet:
   - tune `tenderObserver.sensitivity`
   - inspect `triggerVariant` and `whisperReason` in the weekly log

## Privacy

All runtime signals are processed and stored locally.
No external network transmission is included by this extension.
