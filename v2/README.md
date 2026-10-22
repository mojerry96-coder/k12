# Gradient Lab v2

The redesign: the 14 reference screens in `references/`, built from
`Gradient_Lab_14_Pages_Replication.md`, as a game-like lesson for young learners. No walkthrough.

- **Responsive:** every size is design pixels × `--u`. On landscape screens each element keeps its design
  position and the background fills the window; on portrait screens the same elements regroup into a
  column (board → Fitila and her bubble → controls).
- **Fitila is animated:** a looping, transparent clip for every pose (`media/fitila/`, WebM for
  Chrome/Edge/Firefox, HEVC for Safari). Generated with Kling 3.0 from each design pose with her beak
  closed (she never talks: her gestures and eyes tell the story; where the model still opened it,
  `tools/pingpong.py` keeps only the closed-beak stretch, played forwards and back), then every frame lifted with macOS
  Vision and repaired by `tools/matte.py` so pale head feathers are never cut (`tools/alphaclip.sh`);
  `tools/clipmeta.py` records where her resting pose sits so each clip lines up with the design.
- **Fitila's bubble is timed:** it says the task for a few seconds and steps aside, then offers "Tap me for
  a hint!"; the offer comes back whenever the learner has been still for a while. Tapping Fitila gives a
  hint for that screen (on screen 4 she opens the hint screen).
- **Answers are not given away:** B starts in the wrong place on screen 3 (drag it to (2, 2)); screen 4 asks
  "Across ?" / "Up ?"; the intercept graph marks points on the line, not the intercept; the targets screen
  starts with neither target hit.
- **Levels come from the learning platform.** Learners never choose or see a level. Beginner = screens 2–5,
  Intermediate = 6–8, Advanced = 11 and 9. "Let’s play" opens the assigned level's first activity.
- **Support when a learner struggles (screens 6–9, 11):** the 1st wrong answer gets the short nudge; the 2nd makes
  Fitila offer "Let’s build this together. Want to try it step by step?" (Try together / Keep trying); the 3rd
  shows the answer and its working, then a fresh question of the same kind with the offer again. Only valid,
  submitted answers use a try — empty or non-numeric boxes, hints and the walkthrough never do.
- **Try together:** a simpler, step-by-step version of the same skill (place A and B and watch the line appear,
  count across and up, find where it crosses the y-axis; or substitute x; or find the intercept; or lift and tilt
  the line onto targets), with one small action at a time. The challenge — answers, tries left, sliders — is
  saved and comes back as it was, or the learner can take a similar question.
- **How to play:** a walkthrough inside the live activity (the opener's button, or **?** in the header at any
  time): a soft spotlight and a hand show one thing at a time, Fitila says what it does, and the learner tries
  it (drag a slider, place A then B, type a practice value from y = 3x − 2, pick an answer). Next / Back / Skip /
  close; nothing counts as an answer, and the screen is restored when it closes.
- **Admin preview (development):** Ctrl+M, or the slim **Admin** tab on the left edge for touch, opens a small
  panel to load Beginner / Intermediate / Advanced and to return to the assigned activity. It exists only when
  the platform says the user is an admin (or, on localhost / file:// only, with `?admin` in the URL); the shortcut
  alone does nothing. Previewing a level never changes the learner's assignment.
- **Motion:** staged reveal (board, then Fitila hopping in, her bubble popping out with words arriving, then
  controls); springy buttons, fields and choices; the graph draws itself; confetti on success; a shake on a
  wrong answer; the background flowers turn slowly. Progressive reveal: "Walk the line" appears after the
  first slider move. Reduced motion turns it all off.

**Integration (platform side, still to wire up).** The simulation already talks through browser events, and
through `postMessage` to the parent when embedded in a frame:

- In: `window.GradientLabConfig = { level: 'Intermediate', role: 'admin' }` before the script, or a
  `gradientlab:config` event / message with `{ level, role }`, or `?level=intermediate` in the URL.
- Out: `gradientlab:attempt` (correct, tries left), `gradientlab:support-offered`, `gradientlab:support`
  (choice `try-together` / `keep-trying`, outcome `completed` / `left-early`, next `original-question` /
  `similar-question`), `gradientlab:tutorial` (start / finished / closed) and `gradientlab:complete`.

The platform must listen for these and decide any change to the learner's assignment; the simulation only
reports support choices and never reassigns a level itself. Until it does, everything works locally. Note the
admin check runs in the browser, so real access control belongs to the platform that sets `role`.

**Open:** `dist/index.html` with `dist/media/` and `dist/assets/` beside it. Jump to any screen with `#1` … `#14`
(e.g. `#13` = incorrect y-intercept feedback). Lesson flow: 1 → 2 → 3 → 4 ↔ 5 → 6 → 7 → 8 → 11 → 9 → 10;
12–14 are feedback states.

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
| `tools/` | `lift.swift` / `lift_all.py` (pose cut-outs), `liftdir.swift` + `matte.py` + `alphaclip.sh` (transparent clips), `pingpong.py` (closed-beak loops), `clipmeta.py`, `compare.mjs` + `pair.py` (fidelity check) |
