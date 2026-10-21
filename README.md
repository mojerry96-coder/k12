# Gradient Lab

Single-page simulation for lesson MTH12_09_02_01 (Linear Equations and Gradients), built from the Gradient Lab replication pack. Three levels with 7 + 6 missions and unlimited Advanced challenges, plus an opener and a Fitila-led walkthrough. No backend, login or live AI.

**Open:** `index.html`, or serve `dist/` and open its address (`dist/index.html` and `dist/gradient-lab.html` are the same page; keep `dist/media/` beside them). Every launch runs opener → voiced walkthrough → Welcome; both are skippable and saved progress is kept. Read `VALIDATION.md` before release: the Fitila clips await approval and the uLesson logo is still an interim cut-out.

## Develop

```
npm test          # logic tests (node:test, no dependencies)
npm run build     # bundles src/ + assets/ into dist/gradient-lab.html
```

With the page served at http://localhost:8731 (see `.claude/launch.json`):

```
node tools/audit/shoot.mjs http://localhost:8731/gradient-lab.html /tmp/audit          # screenshots + report.txt
node tools/audit/record.mjs http://localhost:8731/gradient-lab.html review/gradient_lab_review.mp4
```

| Path | Contents |
|---|---|
| `src/math.js` | Parsing (no eval), exact fractions, equation formatting, plot mapping |
| `src/missions.js` | 13 missions with the brief's verbatim hints/success copy; Mission 4 constraint |
| `src/challenges.js` | Advanced generators (enumerated valid candidates), checking, worked solutions, similar examples |
| `src/state.js` | Session state, scoring ladder, validated persistence |
| `src/graph.js` | SVG grid/line string builders |
| `src/app.js` | UI, Fitila, dialogs, opener, walkthrough |
| `src/styles.css`, `src/index.html` | Tokens (light/dark), layout, shell |
| `assets/` | Interim Fitila cut-outs, interim logo, level icons |
| `test/` | `logic.test.mjs` (node); `ui-checks.js` and `overflow-check.js` (paste into the page console) |
| `tools/` | `bgclip.py` (match a generated clip's backdrop to an app colour), `review_grid.sh`, earlier keying experiments |
| `tools/audit/` | `shoot.mjs` + `tour.js`: headless-Chrome visual audit of every state (screenshots + overlap/overflow report); `record.mjs` + `playthrough.js`: records the review video with narration |
| `media/` | Fitila clips (light/dark, plus the opener fly-in) and walkthrough narration, copied beside the HTML by the build |

To swap in final art, replace the files in `assets/` (or update `ASSET` / `POSE_RATIO` in `src/app.js`) and rebuild.
