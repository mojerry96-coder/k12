// In-page UI acceptance checks. Paste into the browser console on dist/gradient-lab.html
// (after onboarding has been seen) or run via an automation tool; resolves to PASS/FAIL lines.
// Drives the real DOM controls; uses window.__gradientLab only to read state.
(async () => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const $ = (s) => document.querySelector(s);
  const GL = window.__gradientLab, S = () => GL.state;
  const out = [];
  const ok = (name, cond) => out.push(`${cond ? 'PASS' : 'FAIL'}  ${name}`);
  const slide = (id, v) => { const el = $('#' + id); el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); };
  const key = (el, k) => el.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true }));
  const pt = (k) => document.querySelector(`#g-points [data-pt=${k}]`);
  const tab = (l) => $(`.tab[data-level=${l}]`).click();
  const type = (id, v) => { const el = $('#' + id); el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); };

  // ---------------- Beginner ----------------
  tab('beginner'); await sleep(50);
  const B = S().beginner;
  B.completed = []; B.success = false;
  $('[data-mission="2"]').click(); $('[data-mission="1"]').click();
  slide('b-m', 0); slide('b-c', 0);
  await sleep(1300);
  ok('B: quick mission switches still reveal the sliders (staged entry not cancelled)', !!$('#b-m') && $('#b-m').checkVisibility() && $('#b-c').checkVisibility());
  ok('B: m=0 does not complete mission 1', !S().beginner.success);
  $('[data-mission="3"]').click();
  ok('B: mission 3 does not auto-complete on entry (m already 0)', !S().beginner.success && !S().beginner.completed.includes(3));
  slide('b-m', 0.5); slide('b-m', 0);
  ok('B: mission 3 completes after a real movement to m=0', S().beginner.completed.includes(3));
  ok('B: success note + Next mission shown', !!$('#notes .note.ok [data-action=next-mission]'));
  ok('B: no auto-advance', S().beginner.mission === 3);
  $('[data-mission="7"]').click();
  slide('b-m', -2);
  ok('B: m = −2 does not satisfy mission 7 (strict)', !S().beginner.success);
  slide('b-m', -2.5);
  ok('B: m = −2.5 completes mission 7', S().beginner.completed.includes(7));
  slide('b-m', 0.5);
  ok('B: half gradient uses run 2', /across 2/.test($('#g-tri').textContent) && /up 1/.test($('#g-tri').textContent));
  slide('b-m', 0);
  ok('B: flat line hides the triangle', !$('#g-tri polygon'));
  $('#b-ll').click();
  ok('B: lesson line y = 2x − 4 drawn dashed', !!$('#g-ref .ref-line'));
  $('#b-ll').click();
  slide('b-m', 2); slide('b-c', -4);
  ok('B: equation simplified "y = 2x − 4"', $('#b-eq').textContent.replace(/\s+/g, ' ').trim() === 'y = 2x − 4');
  slide('b-m', 1); slide('b-c', 0);
  ok('B: equation "y = x"', $('#b-eq').textContent.replace(/\s+/g, ' ').trim() === 'y = x');
  const hintBefore = $('#notes .note.hint');
  $('#fitila').click(); await sleep(30);
  ok('B: clicking Fitila opens the hint immediately', !hintBefore && !!$('#notes .note.hint') && $('#fitila').getAttribute('aria-expanded') === 'true');
  $('[data-action=close-hint]').click();
  ok('B: hint closes via its Close control', !$('#notes .note.hint'));
  $('#b-walk').click(); await sleep(400);
  ok('B: walk caption during travel', /Climbing uphill/.test($('#graph-caption').textContent) || /That was uphill/.test($('#graph-caption').textContent));

  // ---------------- Intermediate ----------------
  tab('intermediate'); await sleep(50);
  ok('Session: Beginner slider kept after switching (m = 1)', S().beginner.m === 1);
  const Iv = S().intermediate;
  ok('I: defaults A(−3,−1) B(1,3)', Iv.a.x === -3 && Iv.a.y === -1 && Iv.b.x === 1 && Iv.b.y === 3);
  Iv.completed = []; Iv.success = false;
  for (let i = 0; i < 4; i++) key(pt('b'), 'ArrowUp');
  ok('I: arrow keys move B one square at a time to (1, 7)', S().intermediate.b.y === 7);
  ok('I: mission 1 (gradient 2) completes on key move', S().intermediate.completed.includes(1));
  // overlap prevention
  const before = { ...S().intermediate.a };
  for (let i = 0; i < 8; i++) key(pt('a'), 'ArrowUp'); // A climbs to y=7 at x=-3
  for (let i = 0; i < 6; i++) key(pt('a'), 'ArrowRight'); // would land on B at (1,7) at the 4th step
  ok('I: A cannot be moved on top of B', !(S().intermediate.a.x === 1 && S().intermediate.a.y === 7));
  ok('I: bounds keep points within −7..7', Math.abs(S().intermediate.a.y) <= 7 && Math.abs(S().intermediate.a.x) <= 7);
  // vertical line: put A directly below B
  while (S().intermediate.a.y > -1) key(pt('a'), 'ArrowDown');
  while (S().intermediate.a.x > 1) key(pt('a'), 'ArrowLeft');
  while (S().intermediate.a.x < 1) key(pt('a'), 'ArrowRight');
  ok('I: vertical line shows division-by-zero note', /Division by zero/.test($('#i-working').textContent) && /Move A or B sideways/.test($('#i-working').textContent));
  ok('I: vertical line drawn at x = A.x', !!$('#g-line line'));
  key(pt('a'), 'ArrowLeft'); key(pt('a'), 'ArrowLeft'); key(pt('a'), 'ArrowLeft'); key(pt('a'), 'ArrowLeft'); // A (-3,-1), B (1,7): m = 2
  // predict mode
  $('#i-predict').click();
  ok('I: predict hides working and triangle', $('#i-working').textContent.trim() === '' && !$('#g-tri line'));
  ok('I: no gradient leaked in panel before prediction', !/Gradient =/.test($('#panel').textContent));
  type('i-pred', '1/0'); $('#i-check').click();
  ok('I: 1/0 rejected, working still hidden', /Type your gradient/.test($('#i-pfb').textContent) && $('#i-working').textContent.trim() === '');
  type('i-pred', '1/2'); $('#i-check').click();
  ok('I: reciprocal classified "Upside down"', /Upside down/.test($('#i-pfb').textContent) && /Gradient =/.test($('#i-working').textContent));
  key(pt('b'), 'ArrowDown'); key(pt('b'), 'ArrowUp');
  ok('I: moving a point hides the working again', $('#i-working').textContent.trim() === '' && $('#i-pfb').textContent.trim() === '');
  type('i-pred', '−2'); $('#i-pred').dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
  ok('I: Enter checks; Unicode minus; sign error "Check the sign"', /Check the sign/.test($('#i-pfb').textContent));
  key(pt('b'), 'ArrowDown'); key(pt('b'), 'ArrowUp');
  type('i-pred', '2'); $('#i-check').click();
  ok('I: correct prediction "Spot on!"', /Spot on!/.test($('#i-pfb').textContent));
  $('#i-eq').click();
  ok('I: equation toggle shows c working and y = 2x + 5', /Using A/.test($('#i-working').textContent) && /y = 2x \+ 5/.test($('#i-working').textContent.replace(/\s+/g, ' ')));
  $('#i-predict').click(); $('#i-eq').click();
  // mission 4
  $('[data-mission="4"]').click();
  let s4 = S().intermediate;
  ok('I M4: points placed on y = 2x − 4, no award on entry', s4.a.y === 2 * s4.a.x - 4 && s4.b.y === 2 * s4.b.x - 4 && !s4.success);
  ok('I M4: caption + counter', /only move along/.test($('#graph-caption').textContent) && /Pairs tried: 0 of 3/.test($('#pairs').textContent));
  s4.pairs = [];
  key(pt('a'), 'ArrowRight'); // A x=2 (B x=3) → pair 2,3
  key(pt('a'), 'ArrowLeft');  // A x=1 → pair 1,3
  key(pt('a'), 'ArrowRight'); // back to 2,3: not new
  ok('I M4: repeated pair not double-counted', S().intermediate.pairs.length === 2 && !S().intermediate.success);
  key(pt('b'), 'ArrowRight'); // 2,4 → third
  ok('I M4: third distinct pair completes', S().intermediate.completed.includes(4) && /Pairs tried: 3 of 3/.test($('#pairs').textContent));
  ok('I M4: points stayed on the line', S().intermediate.a.y === 2 * S().intermediate.a.x - 4);
  // mission 6: A on y-axis excluded
  $('[data-mission="6"]').click();
  const I6 = S().intermediate;
  const move = (k, x, y) => { while (I6[k].x < x) key(pt(k), 'ArrowRight'); while (I6[k].x > x) key(pt(k), 'ArrowLeft'); while (I6[k].y < y) key(pt(k), 'ArrowUp'); while (I6[k].y > y) key(pt(k), 'ArrowDown'); };
  move('b', 3, 6); move('a', 0, 4);
  ok('I M6: gradient ⅔ with A on the y-axis does not complete', !I6.completed.includes(6));
  move('a', -3, 2); move('b', 3, 6);
  ok('I M6: gradient ⅔ away from the y-axis completes', S().intermediate.completed.includes(6));

  // ---------------- Advanced ----------------
  tab('advanced'); await sleep(50);
  $('[data-type=read]').click();
  let A = S().advanced;
  const p0 = A.points, sv0 = A.solved;
  ok('A: type change gives a fresh Read-the-graph challenge', A.challenge.type === 'read' && A.attempts === 0);
  type('a-m', 'abc'); type('a-c', '1'); $('#a-check').click();
  ok('A: invalid input consumes no attempt', S().advanced.attempts === 0 && /Type a number/.test($('#notes').textContent));
  const ch = S().advanced.challenge;
  type('a-m', String(ch.m + 1)); type('a-c', String(ch.c)); $('#a-check').click();
  ok('A: 1st wrong → "Not yet" + specific comment + hint', S().advanced.feedback === 'notyet' && /Your c is right, but the gradient is not\./.test($('#notes').textContent) && /Try again/.test($('#notes').textContent));
  $('#a-check').click();
  for (let k = 0; k < 8 && !$('[data-action=ex-next]').hidden; k++) $('[data-action=ex-next]').click(); // the example ends with the prompt
  ok('A: 2nd wrong → similar example with different numbers + mini graph', S().advanced.feedback === 'similar' && !!$('#notes .mini-graph') && /Now use the same steps/.test($('#notes').textContent)
    && !(S().advanced.example.m === ch.m && S().advanced.example.c === ch.c));
  $('#a-check').click();
  ok('A: 3rd wrong → "Here is the answer", locked, +0', S().advanced.feedback === 'answer' && S().advanced.locked && S().advanced.points === p0 && $('#a-check').disabled);
  $('#a-check').click();
  ok('A: clicks on a locked Check are not counted', S().advanced.attempts === 3);
  ok('A: streak reset after a reveal', S().advanced.streak === 0);
  $('[data-action=next-challenge]').click();
  const ch2 = S().advanced.challenge;
  type('a-m', GL.CH.answerText(ch2) && String(ch2.m)); type('a-c', String(ch2.c)); $('#a-check').click();
  ok('A: first-try correct +3, solved +1, streak 1', S().advanced.points === p0 + 3 && S().advanced.solved === sv0 + 1 && S().advanced.streak === 1 && /Correct!/.test($('#notes').textContent));
  ok('A: tab shows solved count', $('#count-advanced').textContent === String(S().advanced.solved));
  const pts = S().advanced.points;
  $('#a-new').click();
  ok('A: New challenge does not change score', S().advanced.points === pts && S().advanced.streak === 1);
  $('[data-type=two]').click();
  ok('A: Two points hides the graph while solving', $('#g-line').innerHTML === '' && /No graph this time/.test($('#graph-caption').textContent));
  $('[data-type=targets]').click();
  const t = S().advanced.challenge;
  slide('a-sm', t.m); slide('a-sc', t.c);
  ok('A: targets turn green when the line passes through them', document.querySelectorAll('#g-marks .target.hit').length === 2);
  ok('A: targets require Check (no award yet)', S().advanced.attempts === 0 && S().advanced.points === pts);
  $('#a-check').click();
  ok('A: targets correct on Check', S().advanced.feedback === 'correct');
  $('[data-type=missing]').click();
  const mc = S().advanced.challenge;
  type('a-v', String(mc.answer).replace('-', '−')); $('#a-v').dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
  ok('A: missing coordinate: Unicode minus + Enter, correct', S().advanced.feedback === 'correct');
  // Fitila hint does not consume an attempt
  $('[data-action=next-challenge]').click();
  $('#fitila').click(); await sleep(20);
  ok('A: Fitila hint costs no attempt', S().advanced.attempts === 0 && !!$('#notes .note.hint'));
  // reset score (two-step)
  $('#a-reset').click(); $('#a-reset').click();
  ok('A: Reset my score zeros all four metrics', ['points', 'solved', 'streak', 'bestStreak'].every((k) => S().advanced[k] === 0));

  // ---------------- Theme ----------------
  const th0 = document.documentElement.dataset.theme;
  $('#btn-theme').click();
  const th1 = document.documentElement.dataset.theme;
  const thSaved = JSON.parse(localStorage.getItem('gradient-lab-v1')).prefs.theme;
  $('#btn-theme').click();
  ok('Theme: toggle switches light/dark, is saved, and toggles back', th0 !== th1 && thSaved === th1 && document.documentElement.dataset.theme === th0
    && $('#btn-theme').getAttribute('aria-pressed') === String(th0 === 'dark'));

  // ---------------- Persistence ----------------
  const saved = JSON.parse(localStorage.getItem('gradient-lab-v1'));
  ok('Storage: last level + completions saved', saved.lastLevel === 'advanced' && saved.beginner.includes(3) && saved.intermediate.includes(4));
  ok('Storage: no slider, point or challenge values saved', !/"m":|"challenge"|"a":\{/.test(JSON.stringify(saved)));
  return out.join('\n');
})();
