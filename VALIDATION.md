# Gradient Lab — validation report

Build date: 20 October 2026. Entry file: `dist/gradient-lab.html` (single self-contained file, ~1.1 MB, images inlined).

**Status: functional simulation complete; animated Fitila (greeting, idle, tap, nod, retry, celebration — light and dark) awaiting owner approval; logo still interim.** The mathematics, missions, challenges, feedback, persistence, accessibility behaviour, opener and walkthrough are implemented and tested. Fitila and the uLesson logo are **interim cut-outs from the approved screen references**, not clean production assets (see §4). Fitila's video clips (Kling 3.0) and the walkthrough narration (ElevenLabs) are AI-generated; see §4 and §4a-3.

## 1. Automated checks

| Suite | How to run | Result |
|---|---|---|
| Logic (maths, predicates, generators, scoring, storage) | `npm test` | 16/16 pass |
| In-page UI acceptance (drives real controls) | paste `test/ui-checks.js` into the console on the built page | 58/58 pass |
| No-scroll layout (29 panel states incl. every Advanced feedback state) | paste `test/overflow-check.js` on a fresh page | all fit at 1920×1080, 1536×864, 1440×900, 1366×768, 1280×800 and 1280×720; at 1024×768 (tablet) the two heaviest combined states scroll the panel by ≤ 29 px |
| Visual audit (every state, 6 sizes, light + dark: screenshots plus overlap / touching / clipped-text / overflow report) | `node tools/audit/shoot.mjs http://localhost:8731/gradient-lab.html OUTDIR` | see §4a-4 |

The UI suite covers: no completion on mission entry (incl. m = 0 for Mission 3); strict m < −2; run 2 for half gradients; flat line hides the triangle; lesson line; simplified equations; Fitila click opens the hint immediately; hint Close; walk captions; session state kept across level switches; arrow-key moves; overlap prevention; −7..7 bounds; vertical-line division-by-zero note; predict mode hiding working/triangle with no gradient leak; `1/0` rejected without revealing; reciprocal / sign / correct classification; Enter = Check; Unicode minus; moving a point re-hides working; equation toggle (c working + simplified equation); Mission 4 projection, counter, swapped-pair de-duplication and completion; Mission 6 y-axis exclusion; Advanced invalid input costs no attempt; full feedback ladder (Not yet + specific comment → similar example with different numbers + mini graph → Here is the answer, locked, +0); locked Check not counted; +3 first try / solved / streak; New challenge doesn’t change score; Two-points graph hidden; targets turn green and still require Check; Missing coordinate with Unicode minus; Fitila hint costs no attempt; Reset zeroes four metrics; storage holds only permitted fields.

Generators were sampled 500–2000 times each against the brief’s ranges (Read the graph: allowed m set, c −4..4, an extra on-screen grid point; Two points: whole-number distinct points; Missing coordinate: ranges and ~50/50 k/y split; Hit the targets: ±0.5..±3 step 0.5, x ∈ {−4,−2,2,4}, both on screen and reachable by the sliders).

## 2. Manual checks (Chromium, in-app browser)

- 1366×768 light and dark: Welcome, Beginner, Intermediate, Advanced fit with graph, current task and primary controls visible; extra working scrolls inside the panel with a fade cue.
- 375×812 (also represents 200% zoom of a 750 px window): one column, graph above panel, no horizontal page scroll, tabs fit, Fitila never over controls.
- Real mouse drag of point B snaps to integer coordinates through `getScreenCTM()` and announces “Point B moved to (5, 2).” only on drop.
- Every launch runs opener → walkthrough → Welcome (owner request; the pack asked for onboarding on the first visit only and returning visitors on their last level). Both stay skippable; saved progress is untouched. Opening the server's bare address loads the simulation (`dist/index.html`), not a file list.
- First visit: opener (~6 s fly-in, Skip) → walkthrough (7 voiced beats, about a minute, Pause/Skip) → Welcome with focus on the heading. Progress storage untouched by the demo (it scored 3 points and completed a mission inside the sandbox; nothing was saved).
- Replay from an active Advanced task, Skip midway: same challenge, typed answer and point positions restored exactly.
- Reduced motion or width < 900 px: walkthrough becomes a static step-by-step tour with Back / Next / Skip.

Not yet done: Safari / Firefox, real touch devices, VoiceOver / NVDA sessions, slow-device performance.

## 3. Contrast (WCAG 2.x)

Light: white on action blue 5.31; ink on background 14.95; secondary text on white 5.98; green note heading 4.81; red 5.60; yellow-note text 7.22; rise green on white 4.56; red line (graphic) 4.49. Dark: action text 8.36; ink 15.81; secondary 7.79; all note headings ≥ 6.6. The reference’s cyan buttons with white text (~2.1:1) were replaced by a darker blue as the spec instructs.

## 4. Asset status — read before release

| Asset | What is in the build | Status |
|---|---|---|
| Fitila animation | `media/fitila_greet_{light,dark}.mp4` (5 s: wave → point → neutral; opener + Welcome, and replayed when Welcome Fitila is tapped) and `media/fitila_tap_{light,dark}.mp4` (3 s tickled reaction, plays when the corner Fitila is tapped; starts and ends on her rest pose). Kling 3.0 pro, generated directly on the app's own colours (page #F0F8FD/#0E1B29, panel #FFFFFF/#162839) — no transparency. `tools/bgclip.py` snaps the backdrop to the exact app colour; verified in Chrome within 1 level of the CSS colour | **Awaiting owner approval.** Chosen by `prefers-color-scheme`, swaps live. Light and dark greetings are separate takes, so the choreography differs slightly. |
| Fitila stills | First/last frames of those clips on the same colours; `fitila_neutral_clip.webp` (transparent) only where she floats over mixed UI (walkthrough guide, completion dialog) | Derived from the clips. |
| Corner Fitila idle + nod | `media/fitila_idle_{light,dark}.mp4` (5 s seamless loop: breathing, blink, small head tilt; first/last frame differ by <1 level) and `media/fitila_nod_{light,dark}.mp4` (3 s approving double nod). Same rest frame and crop as the tap clips, so all corner clips hand over without a jump | **Awaiting owner approval.** Controller: idle loops while a level is on screen; tap and nod cut in and return to idle; tap outranks nod; no restarts on repeats; still frame on Welcome and with reduced motion. Nod plays on mission complete, Intermediate "Spot on!", Advanced "Correct!" and level completion. |
| Retry + celebration | `media/fitila_retry_{light,dark}.mp4` (3 s encouraging head tilt and wing gesture; plays on a wrong Intermediate prediction and every step of Advanced's wrong-answer ladder). `media/fitila_celebrate_light.mp4` (4 s cheer and hop) plays large in the level-complete dialog (its wings need the full frame; the corner nods) | **Awaiting owner approval.** Dark celebration installed on the third take (the first two whitened her wings). |
| Fitila other reactions (present-hint, uphill/downhill/flat, flights) | Not produced; those moments stay on the idle loop | To produce on approval. |
| Opener fly-in | `media/fitila_flyin_dark.mp4` (5 s, 1920×1080: Fitila flies in from the top left, brakes, lands, folds her wings and waves). Kling 3.0 pro from an empty navy start frame to her greeting pose composited where she should land; generated on the opener navy #0E1B29 and snapped with `tools/bgclip.py`. Still fallback `assets/fitila_flyin_dark_last.webp` (reduced motion, or if video cannot play) | **Awaiting owner approval.** One take of two chosen (the other landed more stiffly). |
| uLesson logo | Cut from the `Home.jpg` header (195×35 px), shown on a white plate in the opener | **Interim, low resolution.** Needs the official SVG / transparent PNG. Swap `ASSET.logo` in `src/app.js`. |
| Level card icons | Cropped from `01_welcome.png` with rounded alpha | Approved art, raster crop; clean SVG exports still recommended. |
| Header / UI icons (sound, replay, motion, hint bulb, chevron) | Simple inline SVG recreations | Code recreation; needs approval against the design library. |
| Sound | Optional two-note sine chime synthesised in code; off by default | Not an approved asset; remove or replace on request. |
| Narration / voice | Seven walkthrough lines, `media/voice/wt_0*.mp3` (ElevenLabs v3, designed voice "Fitila (Gradient Lab)", a warm young Nigerian woman; picked by the owner from six candidates) | **Chosen by the owner (Nigerian 2).** Captions show the same text. |
| Walkthrough video file | The tour runs live in the app; no 1080p MP4 export | Not produced. |
| Fonts | Afacad + Manrope from Google Fonts with system fallbacks | Proposed in the spec; the design library font was not supplied. Offline use falls back to system fonts. |

## 4a. Owner feedback round (21 Oct 2026)

- **No scrolling:** all three panels fit at 1366×768 and 1280×720 (compact mode below ~760 px height). Equation Detective was reworked: New/Reset beside the title, type picker as a dropdown next to compact score chips, answer boxes inside the equation (y = [m]x + [c]), Check beside the attempts count, the worked solution replaces the inputs once a challenge is locked, and the similar example is stepped through one step at a time ("Step 2 of 4").
- **Fewer pop-ups:** the "Need a hint?" bubble and the level-complete dialog are gone; the level-done message lives in the mission card and Fitila celebrates in her corner (light; dark nods until an on-model dark celebration exists).
- **Fitila faces the workspace:** corner clips are mirrored (CSS). All clips are now tagged with the sRGB transfer so colour-managed browsers (Safari, macOS Chrome) no longer shift the backdrop colour; verified 0–1 level from the CSS colour in Chrome.
- **Motion (CleanMyMac-style):** spring curves (`linear()` with cubic-bezier fallback) for staged reveals, a stretching tab indicator, squishy buttons, card lift, popping notes, bouncing completion badges, popping score numbers, a gentle shake on wrong answers and squash on point drops. The graph stays anchored; reduced motion disables all of it.
- **Voiced walkthrough:** seven narration lines (ElevenLabs; voice replaced in §4a-3), Fitila explaining what each part is for. Actions play during each line; a spotlight dims everything but the target and springs between targets; captions light up word by word, auto-fit (2 lines desktop, 4 on phones) and stay centred; segmented progress bar; Voice on/off, Pause (also pauses audio), Skip; a "Turn on voice" button appears if the browser blocks autoplay. Runs about a minute. Narration files: `media/voice/wt_0*.mp3`.

## 4a-4. Design QA and cinematic opener (21 Oct 2026)

A headless-Chrome audit (`tools/audit/shoot.mjs` + `tour.js`) now walks every screen state at 1366×768, 1280×720, 1920×1080, 1024×768, 768×1024 and 390×844 in both themes, saving a screenshot per state and reporting overlaps, touching controls, clipped text and overflow. It found and this round fixed:

- **Controls could vanish (bug):** switching missions within ~0.9 s of entering a level cancelled the staged-entry timers, so the sliders / point controls stayed hidden for good. Mission switches now leave those timers alone; regression check added to `ui-checks.js`. The earlier "all states fit" overflow result was measured with this bug active (sliders hidden), so it was wrong.
- **Panels overflowed (up to ~650 px) once a level's extras were revealed.** Nothing was removed; the panels were tightened instead: success note puts *Next mission* beside its title; the hint link and "Completed" tag give way to the success note once a mission is done (Fitila still gives hints); an open hint closes when the mission is completed or a prediction is checked; Beginner's plain-words summary moved into the caption under the graph; *Graph options* / *Why this line?* share a row and, on desktop, open as a small card floating above their row (outside click or Escape closes); Intermediate's point chips are one line on desktop, its answered prediction folds its question line, and the working shows the two points in its heading; compact spacing now applies to all laptop heights up to ~900 px with an extra notch up to ~800 px (slightly narrower Fitila column there); the graph is capped so the panel always keeps ≥ 500 px. Result: every state fits at all six desktop sizes tested.
- **Graph labels collided with axis numbers** ("across 2" over the x-axis 2, point and target labels over y-axis numbers). Axis numbers now step aside (fade out) wherever a live label lands on them.
- **Equation Detective picker truncated** ("Missing coordi…", "Hit the tar…"). The closed picker now shows short names (Read graph, Two points, Missing value, Targets; full name in its tooltip and in the menu); score chips tightened.
- **Similar example overflowed** by a line: the final "Now use the same steps and try again." now takes the step counter's place.
- **Hint close button overlapped hint text** at 1280 px: closable notes reserve room for it.
- The red "Here is the answer" note was kept red (spec §10 asks for red).

**Cinematic opener:** follows the approved `SplashScreen.jpg` direction: a navy stage with soft concentric rings, a slow camera push and a light bloom. Fitila flies in from the top left (generated clip, see §4), lands and waves; as she lands the uLesson logo glides in beside her on a white plate (the interim logo's navy wordmark needs a light ground) with a cyan-to-gold loading line beneath. About 6 s, silent, Skip always available, Escape skips. The 16:9 stage covers landscape screens; on portrait screens it is framed on Fitila with the logo beneath her. Reduced motion shows her landed with the logo and dissolves. Note the pack's opener spec asked for 2.5–3 s with no flourish; the owner asked for a longer, cinematic fly-in, which this follows.

**Review video:** `tools/audit/record.mjs` records the real app (first-visit opener, the voiced walkthrough, then one mission per level) to an MP4 with the narration laid in where it actually played: `review/gradient_lab_review.mp4`.

## 4a-3. Welcome, rest-moment and voice round (21 Oct 2026)

- **Welcome overlap fixed:** the Welcome Fitila stage is sized by width (not height) and the copy column sits above it, so the video never fades or covers the Beginner card. Measured gap to the cards: 12–23 px at 1000×520, 1100×900, 1280×720, 1366×768 and 1920×1080.
- **Reactions wait for idle's neutral moment:** a tap/hover/feedback reaction waits for the idle loop's rest frame when it is at most 0.7 s away (`MAX_REST_WAIT` in `src/app.js`), otherwise it crossfades in over 200 ms so it still feels instant. Verified with stubbed playback times: at rest → immediate; rest 0.44 s away → waits; rest 2 s away → immediate crossfade.
- **New narration voice:** the "sim-adaeze" lines (multilingual v2) sounded robotic. Six candidate voices were designed (three Nigerian, three Kenyan); the owner picked Nigerian 2, saved as "Fitila (Gradient Lab)" (`YUnyq526FeldMrD5ixUK`). All seven lines re-recorded with `eleven_v3` (stability 0.5, similarity 0.8) and checked by speech-to-text: every line matches its caption. Lines are 3.6–9.6 s (about 50 s in total, down from about 66 s); `NARRATION` durations updated. The welcome line now reads "…Pick any level to start, and don't worry, you can switch whenever you like." Audio URLs carry `?v=2` so browsers don't replay a cached old voice. Candidates are kept in `review/voice_options/`.
- Re-checked after these changes: logic 16/16, UI 57/57, overflow 29/29 at 1366×768; welcome caption fits on two lines at 21 px.

## 4a-2. Reactivity round (21 Oct 2026)

- **Instant reactions:** all corner clips are preloaded `<video>` elements kept in the stage (switching = rewind + play, measured ~2 ms); one-shot clips were trimmed to start 3 frames before motion (they previously held still for 0.25–0.67 s). Hover (mouse/pen) and keyboard focus trigger her reaction while she idles; a click during it opens the hint without restarting. The Welcome greeting is preloaded too, and replays on hover/tap.
- **Walkthrough no longer covers the UI:** the large Welcome-sized guide is no longer placed over the screen; the guide first appears beside the mission card in the mascot column. An automated check over the whole tour found zero overlaps with the graph, panel content or level cards.
- **Dark celebration installed** (third take: wings stay grey/charcoal, compact flutter and hop). Earlier off-model takes discarded.

## 4b. Staged level entry (progressive reveal)

Each level opens with the graph and the mission only; the controls the current mission needs follow (~0.4 s), then the remaining controls (~0.8 s). Beginner's Graph options and Why this line? stay hidden until the learner first moves a slider; Intermediate's Predict/Equation toggles sit in an Options disclosure; Advanced's challenge-type list sits in a picker, and each new challenge shows its question before its answer controls. Reduced motion shows everything at once (interaction-gated extras still wait).

## 5. Deliberate corrections and interpretations

Per the master spec’s reference table:
- Welcome shows no active tab until a level is chosen; all three Start buttons are equal.
- Plot is square, equal units, −8..8, gridlines every 1, numbered every 2 (the Beginner reference numbers every 1; the brief says every 2).
- Intermediate defaults to A(−3, −1), B(1, 3); B is purple and diamond-shaped (shape plus colour); the screenshot’s y = x labels and positions were not traced.
- Advanced shows all four score boxes and five type buttons (chips rather than a dropdown); Mixed is the default.
- Fitila in the activity corner is ~150 px tall in a reserved column; she never overlaps content.

Implementation choices worth reviewing:
1. **Beginner missions check on slider release** (and on every keyboard step), not on every drag frame, so the success note can’t push the slider out from under a dragging finger. Keyboard behaviour is unchanged.
2. **Predict mode also hides the rise/run triangle** until Check or Just show me, since its labels would reveal the answer; it then traces run then rise.
3. When B is left of A, the run label reads **“across −4”**, matching the B − A working.
4. Entering Intermediate Mission 4 with points off the line places A(1, −2), B(3, 2). This pair is not counted and nothing is awarded.
5. “Reset my score” asks for a second press within 4 seconds.
6. The completion dialog (all 7 / all 6 missions) appears once per session, only when the final mission is actually completed, and is dismissable.
7. For screen-reader users, Read the graph describes two grid points the line passes through (what a sighted learner reads), never m or c.
8. A **Reduce motion** toggle was added to the header next to Sound and Replay. It overrides the OS setting.
9. Walkthrough demo data: Beginner opens on Mission 5 so the demo slider moves (y = x, then y = x + 1) can’t complete it; Intermediate moves B to (2, 4) keeping m = 1; Advanced solves y = x + 2, then loads y = −2x + 1 before the hint beat.

States without an approved still (opener, walkthrough, hint panel, feedback notes, completion dialog, dark theme) are implemented to spec but are **not visually approved**.

## 6. Owner decisions needed

1. Supply clean Fitila art (transparent, full body, ideally neutral / attentive / presenting / nod / encouraging / celebration poses) and the official uLesson logo, or approve still generation using the pack’s prompt.
2. Video: test the available Kling model, or compare it with another model? Choose duration, resolution and credit budget, then approve a single welcome → point → neutral test clip before any further set is produced.
3. ~~Narration voice~~ Done: owner chose the designed Nigerian voice (§4a-3).
4. Keep, replace or remove the synthesised chime.
5. Confirm the fonts, or supply the design-library font so it can be bundled for offline use.
