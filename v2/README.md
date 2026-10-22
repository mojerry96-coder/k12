# Gradient Lab v2

The redesign: the 14 reference screens in `references/`, built from
`Gradient_Lab_14_Pages_Replication.md`. A fixed 1672 × 941 stage scaled to the window
(letterboxed, never stretched). No walkthrough.

**Open:** `dist/index.html` (one self-contained file). Jump to any screen with `#1` … `#14`
(e.g. `#13` = incorrect y-intercept feedback). Lesson flow: 1 → 2 → 3 → 4 ↔ 5 → 6 → 7 → 8 → 11 → 10;
screen 9 is a separate intercept activity; 12–14 are feedback states.

```
node build.mjs                          # src/ + assets/ → dist/index.html
node test/run.mjs                       # end-to-end flow and checking rules (headless Chrome)
node tools/compare.mjs /tmp/cmp         # every screen beside its reference, at design size
```

| Path | Contents |
|---|---|
| `src/` | `index.html`, `styles.css`, `app.js` (screens, graph, sliders, checking, dialogs) |
| `assets/fitila/` | Fitila poses cut out of the references with macOS Vision (`tools/lift_all.py`); `poses.json` has each pose's box in design pixels |
| `assets/brand/` | uLesson icon and wordmark, cut from the official "On White" logo |
| `assets/fonts/` | Patrick Hand (display) and SN Pro (interface), both SIL OFL |
| `references/` | the 14 design screens and the logo file |
| `tools/` | `lift.swift` / `lift_all.py` (pose cut-outs), `compare.mjs` + `pair.py` (fidelity check) |
