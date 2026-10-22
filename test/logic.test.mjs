import test from 'node:test';
import assert from 'node:assert/strict';
import * as M from '../src/math.js';
import * as Mi from '../src/missions.js';
import * as C from '../src/challenges.js';
import * as S from '../src/state.js';

// Seeded RNG for reproducible sampling.
function rng(seed = 1) { return () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296); }

test('parseAnswer accepts the brief\'s formats and rejects bad input', () => {
  assert.equal(M.parseAnswer('1/2'), 0.5);
  assert.equal(M.parseAnswer('.5'), 0.5);
  assert.equal(M.parseAnswer('−2'), -2);
  assert.equal(M.parseAnswer(' -3 / 2 '), -1.5);
  assert.equal(M.parseAnswer('½'), 0.5);
  assert.equal(M.parseAnswer('3/2'), M.parseAnswer('1.5'));
  for (const bad of ['', ' ', '1/0', 'abc', '2x', '1//2', '--1', 'Infinity', '1e5', 'NaN']) assert.equal(M.parseAnswer(bad), null, bad);
});

test('equations are simplified', () => {
  assert.equal(M.equationText(1, 2), 'y = x + 2');
  assert.equal(M.equationText(-1, 0), 'y = −x');
  assert.equal(M.equationText(0, 0), 'y = 0');
  assert.equal(M.equationText(-3, 2), 'y = −3x + 2');
  assert.equal(M.equationText(0.5, 1), 'y = 1/2 x + 1');
  assert.equal(M.equationText(2, -4), 'y = 2x − 4');
  assert.equal(M.equationText(-1.5, 2), 'y = −3/2 x + 2');
});

test('simplify moves the sign to the top', () => {
  assert.deepEqual(M.simplify(12, -8), { n: -3, d: 2 });
  assert.deepEqual(M.simplify(-4, -4), { n: 1, d: 1 });
  assert.deepEqual(M.simplify(0, -5), { n: 0, d: 1 });
});

test('beginner triangle: run 2 for half gradients, hidden when flat', () => {
  assert.equal(M.beginnerTriangle(0, 3), null);
  assert.equal(M.beginnerTriangle(2, 0).run, 1);
  assert.equal(M.beginnerTriangle(0.5, 1).run, 2);
  assert.equal(M.beginnerTriangle(-1.5, 1).rise, -3);
  assert.equal(M.steepness(1), 'gentle');
  assert.equal(M.steepness(-1.5), 'steep');
  assert.equal(M.steepness(3), 'very steep');
});

test('beginner predicates', () => {
  const t = (id, m, c = 0) => Mi.BEGINNER_MISSIONS[id - 1].test({ m, c });
  assert.ok(t(1, 0.5) && !t(1, 0));
  assert.ok(t(2, -0.5) && !t(2, 0));
  assert.ok(t(3, 0) && !t(3, 0.5));
  assert.ok(t(4, 1, 3) && !t(4, 1, 2));
  assert.ok(t(5, 2, -4) && !t(5, 2, -3));
  assert.ok(t(6, 0.5, 1) && !t(6, 1, 1));
  assert.ok(t(7, -2.5) && !t(7, -2), 'strict inequality');
});

test('intermediate predicates incl. vertical and mission 6 y-axis rule', () => {
  assert.ok(Mi.intermediateComplete(1, { x: 0, y: 0 }, { x: 1, y: 2 }));
  assert.ok(Mi.intermediateComplete(2, { x: 1, y: 3 }, { x: -1, y: 5 }));
  assert.ok(Mi.intermediateComplete(3, { x: 2, y: 2 }, { x: -2, y: 0 }), 'B left of A');
  assert.ok(!Mi.intermediateComplete(1, { x: 1, y: 0 }, { x: 1, y: 2 }), 'vertical never completes');
  assert.ok(Mi.intermediateComplete(5, { x: 0, y: 2 }, { x: 1, y: -1 }));
  assert.ok(Mi.intermediateComplete(6, { x: -3, y: 0 }, { x: 3, y: 4 }));
  assert.ok(!Mi.intermediateComplete(6, { x: 0, y: 0 }, { x: 3, y: 2 }), 'A on y-axis');
  assert.ok(!Mi.intermediateComplete(6, { x: -3, y: -2 }, { x: 0, y: 0 }), 'B on y-axis');
});

test('mission 4: constrained projection and unordered unique pairs', () => {
  assert.deepEqual(Mi.constrainedPoint(2.4), { x: 2, y: 0 });
  assert.deepEqual(Mi.constrainedPoint(9), { x: 5, y: 6 });
  assert.deepEqual(Mi.constrainedPoint(-4), { x: -1, y: -6 });
  let p = [];
  p = Mi.commitPair(p, { x: 1, y: -2 }, { x: 3, y: 2 });
  p = Mi.commitPair(p, { x: 3, y: 2 }, { x: 1, y: -2 }); // swapped
  assert.equal(p.length, 1);
  p = Mi.commitPair(p, { x: 1, y: -2 }, { x: 1, y: -2 }); // overlap
  p = Mi.commitPair(p, { x: 0, y: 0 }, { x: 3, y: 2 }); // off-line
  assert.equal(p.length, 1);
  p = Mi.commitPair(p, { x: 0, y: -4 }, { x: 3, y: 2 });
  p = Mi.commitPair(p, { x: 0, y: -4 }, { x: 5, y: 6 });
  assert.equal(p.length, 3);
  assert.ok(Mi.intermediateComplete(4, { x: 0, y: -4 }, { x: 5, y: 6 }, p));
  assert.ok(!Mi.intermediateComplete(4, { x: 0, y: -4 }, { x: 5, y: 6 }, p.slice(0, 2)));
});

test('gradient working uses B − A, brackets negatives, sign on top', () => {
  const sr = C.gradientChainHTML({ x: 4, y: -4 }, { x: -4, y: 8 }).match(/<span class="sr-only">[^<]*<\/span>/g).map((t) => t.replace(/<[^>]+>/g, ''));
  assert.ok(sr.includes('8 − (−4) over −4 − 4'), 'B − A with bracketed negative');
  assert.ok(sr.includes('12 over −8'));
  assert.ok(sr.at(-1) === '3 over 2' && C.gradientChainHTML({ x: 4, y: -4 }, { x: -4, y: 8 }).includes('= −<span class="frac">'), 'simplified −3/2, sign on top');
});

test('read-the-graph generator obeys ranges and has an extra on-screen grid point', () => {
  const allowed = [1, 2, 3, 1 / 2, 3 / 2, 1 / 3, 2 / 3].flatMap((v) => [v, -v]);
  const r = rng(7);
  for (let i = 0; i < 500; i++) {
    const ch = C.generate('read', r);
    assert.ok(allowed.some((v) => M.near(v, ch.m)));
    assert.ok(Number.isInteger(ch.c) && ch.c >= -4 && ch.c <= 4);
    assert.ok(ch.pts.length >= 1 && ch.pts.every((p) => p.x !== 0 && Number.isInteger(p.y) && Math.abs(p.x) <= 7 && Math.abs(p.y) <= 7 && M.near(ch.m * p.x + ch.c, p.y)));
  }
});

test('two-points generator: distinct whole-number points on the line', () => {
  const r = rng(3);
  for (let i = 0; i < 500; i++) {
    const ch = C.generate('two', r);
    assert.ok(ch.c >= -5 && ch.c <= 5);
    assert.ok(ch.p1.x !== ch.p2.x);
    for (const p of [ch.p1, ch.p2]) { assert.ok(Number.isInteger(p.x) && Number.isInteger(p.y)); assert.ok(M.near(ch.m * p.x + ch.c, p.y)); }
  }
});

test('missing-coordinate generator: ranges and balanced versions', () => {
  const r = rng(11); let k = 0;
  for (let i = 0; i < 2000; i++) {
    const ch = C.generate('missing', r);
    assert.ok(Number.isInteger(ch.m) && ch.m !== 0 && Math.abs(ch.m) <= 4);
    assert.ok(ch.c >= -6 && ch.c <= 6 && ch.x !== 0 && Math.abs(ch.x) <= 5);
    assert.equal(ch.y, ch.m * ch.x + ch.c);
    if (ch.mode === 'k') k++;
  }
  assert.ok(k > 850 && k < 1150, `k versions: ${k}`);
});

test('targets generator: steps of 0.5, distinct target x, both on screen', () => {
  const r = rng(5);
  for (let i = 0; i < 500; i++) {
    const ch = C.generate('targets', r);
    assert.ok(Math.abs(ch.m) >= 0.5 && Math.abs(ch.m) <= 3 && Number.isInteger(ch.m * 2));
    assert.ok(ch.c >= -4 && ch.c <= 4);
    assert.ok([-4, -2, 2, 4].includes(ch.t1.x) && [-4, -2, 2, 4].includes(ch.t2.x) && ch.t1.x !== ch.t2.x);
    assert.ok(Math.abs(ch.t1.y) <= 8 && Math.abs(ch.t2.y) <= 8);
    // reachable with the sliders: m in -4..4 step .5, c in -8..8 step 1
    assert.equal(C.hitCount(ch, ch.m, ch.c), 2);
  }
});

test('checking: invalid input is not an attempt; specific comments', () => {
  const ch = { type: 'read', m: 2, c: 1 };
  assert.equal(C.check(ch, { m: '', c: '1' }).valid, false);
  assert.equal(C.check(ch, { m: '1/0', c: '1' }).valid, false);
  assert.equal(C.check(ch, { m: '2', c: '1' }).correct, true);
  assert.equal(C.check(ch, { m: '2', c: '3' }).comment, 'Your gradient is right, but c is not.');
  assert.equal(C.check(ch, { m: '3', c: '1' }).comment, 'Your c is right, but the gradient is not.');
  assert.equal(C.check(ch, { m: '−2', c: '0' }).comment, 'Check the sign of your gradient.');
  const t = { type: 'targets', m: 1, c: 0, t1: { x: 2, y: 2 }, t2: { x: 4, y: 4 } };
  assert.equal(C.check(t, { m: 0, c: 2 }).comment, 'Your line passes through 1 of the 2 dots.');
  assert.equal(C.check({ type: 'missing', answer: 3, mode: 'k' }, { v: '3.0' }).correct, true);
});

test('similar example uses different numbers', () => {
  const r = rng(9);
  for (const type of C.TYPES) for (let i = 0; i < 100; i++) {
    const ch = C.generate(type, r); const ex = C.similar(ch, r);
    assert.equal(ex.type, type);
    assert.ok(!(M.near(ex.m, ch.m) && M.near(ex.c, ch.c)));
  }
});

test('scoring ladder +3/+2/+1/0, streaks and locks', () => {
  let a = S.initialState().advanced;
  a = S.recordAttempt(a, { valid: true, correct: true });
  assert.deepEqual([a.points, a.solved, a.streak, a.bestStreak, a.locked], [3, 1, 1, 1, true]);
  const again = S.recordAttempt(a, { valid: true, correct: true });
  assert.equal(again, a, 'locked check not counted');
  a = S.freshChallenge(a, {});
  a = S.recordAttempt(a, { valid: false, correct: false });
  assert.equal(a.attempts, 0, 'invalid input consumes nothing');
  a = S.recordAttempt(a, { valid: true, correct: false });
  assert.equal(a.streak, 0);
  a = S.recordAttempt(a, { valid: true, correct: true });
  assert.deepEqual([a.points, a.solved, a.bestStreak], [5, 2, 1]);
  a = S.freshChallenge(a, {});
  for (let i = 0; i < 3; i++) a = S.recordAttempt(a, { valid: true, correct: false });
  assert.deepEqual([a.points, a.solved, a.locked, a.feedback], [5, 2, true, 'answer']);
  a = S.resetScore(a);
  assert.deepEqual([a.points, a.solved, a.streak, a.bestStreak], [0, 0, 0, 0]);
});

test('storage saves only permitted fields and validates on load', () => {
  const store = new Map(); const storage = { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, v) };
  const s = S.initialState();
  s.screen = 'intermediate'; s.beginner.m = 3; s.beginner.completed = [1, 3]; s.advanced.points = 9; s.advanced.challenge = { type: 'read' };
  S.save(s, storage);
  const raw = JSON.parse(store.get(S.STORAGE_KEY));
  assert.equal(raw.lastLevel, 'intermediate');
  assert.ok(!('m' in raw.beginner) && !JSON.stringify(raw).includes('challenge'));
  const l = S.load(storage);
  assert.equal(l.beginner.m, 0); assert.deepEqual(l.beginner.completed, [1, 3]); assert.equal(l.advanced.points, 9); assert.equal(l.advanced.challenge, null);
  store.set(S.STORAGE_KEY, JSON.stringify({ version: 1, lastLevel: 'hacker', beginner: [99, 2, 'x'], advanced: { points: -4, type: 'evil' } }));
  const bad = S.load(storage);
  assert.equal(bad.lastLevel, null); assert.deepEqual(bad.beginner.completed, [2]); assert.equal(bad.advanced.points, 0); assert.equal(bad.advanced.type, 'mixed');
  assert.equal(S.initialState().prefs.theme, 'light'); // light unless the learner chooses dark
  store.set(S.STORAGE_KEY, JSON.stringify({ version: 1, prefs: { theme: 'dark' } }));
  assert.equal(S.load(storage).prefs.theme, 'dark');
  store.set(S.STORAGE_KEY, JSON.stringify({ version: 1, prefs: { theme: 'neon' } }));
  assert.equal(S.load(storage).prefs.theme, 'light');
  const broken = { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); } };
  assert.equal(S.save(s, broken), false);
  assert.equal(S.load(broken).screen, 'welcome');
});
