# Gradient Lab v2

The redesign: the 14 reference screens in `references/`, built from
`Gradient_Lab_14_Pages_Replication.md`, as a game-like lesson for young learners. No walkthrough.

- **Responsive:** every size is design pixels × `--u`. On landscape screens each element keeps its design
  position and the background fills the window; on portrait screens the same elements regroup into a
  column (board → Fitila and her bubble → controls).
- **Fitila is animated:** a looping, transparent clip for every pose (`media/fitila/`, WebM for
  Chrome/Edge/Firefox, HEVC for Safari). Generated with Kling 3.0 from each design pose, then every frame
  lifted with macOS Vision (`tools/alphaclip.sh`); `tools/clipmeta.py` records where her resting pose sits
  so each clip lines up with the design.
- **Motion:** staged reveal (board, then Fitila hopping in, her bubble popping out with words arriving, then
  controls); springy buttons, fields and choices; the graph draws itself; confetti on success; a shake on a
  wrong answer. Progressive reveal: "Walk the line" appears after the first slider move, Continue after B
  is placed. Reduced motion turns it all off.

**Open:** `dist/index.html` with `dist/media/` and `dist/assets/` beside it. Jump to any screen with `#1` … `#14`
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
| `media/fitila/` | the looping clips (`.webm`, `.mov`, transparent posters) and `clips.json` |
| `tools/` | `lift.swift` / `lift_all.py` (pose cut-outs), `liftdir.swift` + `alphaclip.sh` (transparent clips), `clipmeta.py`, `compare.mjs` + `pair.py` (fidelity check) |
