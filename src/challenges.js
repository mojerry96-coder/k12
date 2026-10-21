// Advanced level "Equation Detective": constrained generators, answer checking, specific
// feedback and fully worked solutions. Every generator enumerates valid candidates first and
// picks one, so generation is bounded and never "hopes" a random line fits.
import {
  near, parseAnswer, simplify, numHTML, brHTML, fracHTML, equationHTML, equationText,
  numText, pointText, MINUS,
} from './math.js';
import { miniGraphSVG } from './graph.js';

export const TYPES = ['read', 'two', 'missing', 'targets'];
export const TYPE_LABELS = {
  mixed: 'Mixed', read: 'Read the graph', two: 'Two points', missing: 'Missing coordinate', targets: 'Hit the targets',
};
export const HINTS = {
  read: 'c is where the line crosses the y-axis. For m, find two places where the line passes exactly through grid corners, then work out change in y ÷ change in x.',
  two: 'First find the gradient: change in y ÷ change in x. Then put one point into y = mx + c and solve for c.',
  missing: 'Replace y and x with the numbers you know, then solve; or put the x-value in, multiply first, then add or subtract c.',
  targets: 'Work out the gradient between the two dots first and set m. Then move c until the line passes through one dot. It will pass through both.',
};

const pick = (arr, rng) => arr[Math.floor(rng() * arr.length) % arr.length];
const range = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
const FRACS = [[1, 1], [2, 1], [3, 1], [1, 2], [3, 2], [1, 3], [2, 3]].flatMap(([n, d]) => [[n, d], [-n, d]]);

// ---------- Candidate enumeration (exported for tests) ----------
export function readCandidates() {
  const out = [];
  for (const [n, d] of FRACS) for (const c of range(-4, 4)) {
    const pts = [];
    for (let k = -8; k <= 8; k++) {
      if (k === 0) continue;
      const p = { x: k * d, y: c + k * n };
      if (Math.abs(p.x) <= 7 && Math.abs(p.y) <= 7) pts.push(p);
    }
    if (pts.length) out.push({ type: 'read', m: n / d, c, pts });
  }
  return out;
}
export function twoCandidates() {
  const out = [];
  for (const [n, d] of FRACS) for (const c of range(-5, 5)) {
    const xs = range(-6, 6).filter((x) => x !== 0 && x % d === 0 && Math.abs(c + (n * x) / d) <= 10);
    if (xs.length >= 2) out.push({ m: n / d, c, xs });
  }
  return out;
}
export function targetCandidates() {
  const out = [];
  const ms = [0.5, 1, 1.5, 2, 2.5, 3].flatMap((v) => [v, -v]);
  const X = [-4, -2, 2, 4];
  for (const m of ms) for (const c of range(-4, 4)) for (let i = 0; i < 4; i++) for (let j = i + 1; j < 4; j++) {
    const t1 = { x: X[i], y: m * X[i] + c }, t2 = { x: X[j], y: m * X[j] + c };
    if (Math.abs(t1.y) <= 7 && Math.abs(t2.y) <= 7) out.push({ type: 'targets', m, c, t1, t2 });
  }
  return out;
}
const READ = readCandidates(), TWO = twoCandidates(), TARGETS = targetCandidates();

const sameLine = (a, b) => a && b && near(a.m, b.m) && near(a.c, b.c);

// Create a challenge of `type` ('mixed' picks one of the four). `avoid` = a challenge whose
// numbers must not be reused (previous challenge, or the current one for similar examples).
export function generate(type, rng = Math.random, avoid = null) {
  const t = type === 'mixed' ? pick(TYPES, rng) : type;
  for (let tries = 0; tries < 50; tries++) {
    const ch = make(t, rng);
    if (!avoid || !sameLine(ch, avoid)) return { ...ch, id: Math.floor(rng() * 1e9) };
  }
  return { ...make(t, rng), id: Math.floor(rng() * 1e9) };
}

function make(t, rng) {
  if (t === 'read') {
    const cand = pick(READ, rng);
    // A described pair of grid points for screen-reader users, avoiding the y-axis when possible.
    const off = cand.pts.filter((p) => p.x !== 0);
    const a = off[0], b = off.length > 1 ? off[off.length - 1] : { x: 0, y: cand.c };
    return { type: 'read', m: cand.m, c: cand.c, pts: cand.pts, describe: [a, b] };
  }
  if (t === 'two') {
    const cand = pick(TWO, rng);
    const x1 = pick(cand.xs, rng);
    const x2 = pick(cand.xs.filter((x) => x !== x1), rng);
    const P = (x) => ({ x, y: cand.c + cand.m * x });
    return { type: 'two', m: cand.m, c: cand.c, p1: P(x1), p2: P(x2) };
  }
  if (t === 'missing') {
    const m = pick([1, 2, 3, 4].flatMap((v) => [v, -v]), rng);
    const c = pick(range(-6, 6), rng);
    const x = pick([1, 2, 3, 4, 5].flatMap((v) => [v, -v]), rng);
    const mode = rng() < 0.5 ? 'k' : 'y';
    const y = m * x + c;
    return { type: 'missing', m, c, mode, x, y, answer: mode === 'k' ? x : y };
  }
  const cand = pick(TARGETS, rng);
  return rng() < 0.5 ? { ...cand } : { ...cand, t1: cand.t2, t2: cand.t1 };
}

// A specific Read-the-graph challenge (walkthrough demo data). Must be a valid candidate.
export function readChallenge(m, c) {
  const cand = READ.find((r) => near(r.m, m) && r.c === c);
  if (!cand) throw new Error('not a valid read-the-graph candidate');
  const off = cand.pts.filter((p) => p.x !== 0);
  return { type: 'read', m, c, pts: cand.pts, describe: [off[0], off.length > 1 ? off[off.length - 1] : { x: 0, y: c }], id: -1 };
}

// Similar example: same type, different numbers.
export function similar(ch, rng = Math.random) {
  for (let i = 0; i < 80; i++) {
    const s = generate(ch.type, rng, ch);
    if (ch.type !== 'missing' || (s.x !== ch.x && s.mode === ch.mode)) return s;
  }
  return generate(ch.type, rng, ch);
}

// ---------- Question text ----------
export function questionHTML(ch) {
  switch (ch.type) {
    case 'read': return 'Find the equation of the red line. Give <i>m</i> and <i>c</i>.';
    case 'two': return `A straight line passes through <b>${pointText(ch.p1)}</b> and <b>${pointText(ch.p2)}</b>. Find its equation in the form <i>y</i> = <i>mx</i> + <i>c</i>.`;
    case 'missing': return ch.mode === 'k'
      ? `The point <b>(<i>k</i>, ${numText(ch.y)})</b> lies on the line <b class="nowrap">${equationHTML(ch.m, ch.c)}</b>. Find <i>k</i>.`
      : `The point <b>(${numText(ch.x)}, <i>y</i>)</b> lies on the line <b class="nowrap">${equationHTML(ch.m, ch.c)}</b>. Find <i>y</i>.`;
    case 'targets': return `Set <i>m</i> and <i>c</i> so the line hits both dots, <b>${pointText(ch.t1)}</b> and <b>${pointText(ch.t2)}</b>. Then press Check.`;
  }
  return '';
}

// ---------- Checking ----------
// answer: read/two {m,c} strings; missing {v} string; targets {m,c} numbers from sliders.
export function check(ch, answer) {
  if (ch.type === 'targets') {
    const hits = hitCount(ch, answer.m, answer.c);
    const correct = hits === 2;
    return { valid: true, correct, comment: correct ? null : firstComment(ch, answer.m, answer.c, hits) };
  }
  if (ch.type === 'missing') {
    const v = parseAnswer(answer.v);
    if (v === null) return { valid: false, message: `Type a number for ${ch.mode === 'k' ? 'k' : 'y'}, like 4, −2 or 1.5.` };
    return { valid: true, correct: near(v, ch.answer), comment: null };
  }
  const m = parseAnswer(answer.m), c = parseAnswer(answer.c);
  if (m === null || c === null) return { valid: false, message: 'Type a number in both boxes, like 2, −3, 1.5 or 3/2.' };
  const correct = near(m, ch.m) && near(c, ch.c);
  return { valid: true, correct, comment: correct ? null : firstComment(ch, m, c) };
}

export const onLine = (m, c, p) => near(m * p.x + c, p.y);
export const hitCount = (ch, m, c) => [ch.t1, ch.t2].filter((t) => onLine(m, c, t)).length;

// Source wording for the specific comment on a first wrong answer.
export function firstComment(ch, m, c, hits) {
  if (ch.type === 'targets' && hits === 1) return 'Your line passes through 1 of the 2 dots.';
  if (near(m, ch.m) && !near(c, ch.c)) return 'Your gradient is right, but c is not.';
  if (near(c, ch.c) && !near(m, ch.m)) return 'Your c is right, but the gradient is not.';
  if (!near(ch.m, 0) && near(m, -ch.m)) return 'Check the sign of your gradient.';
  return null;
}

// ---------- Worked solutions ----------
// Gradient chain with y-values green (.ry) and x-values blue (.rx), negatives bracketed,
// then simplified with the sign moved to the top.
export function gradientChainHTML(p1, p2, { label = 'Gradient' } = {}) {
  const dy = p2.y - p1.y, dx = p2.x - p1.x;
  let s = `${label} = ${fracHTML('change in <span class="ry">y</span>', 'change in <span class="rx">x</span>')}`;
  s += ` = ${fracHTML(`${numHTML(p2.y, 'ry')} ${MINUS} ${brHTML(p1.y, 'ry')}`, `${numHTML(p2.x, 'rx')} ${MINUS} ${brHTML(p1.x, 'rx')}`)}`;
  s += ` = ${fracHTML(numHTML(dy, 'ry'), numHTML(dx, 'rx'))}`;
  if (dx === 0) return s;
  const f = simplify(dy, dx);
  if (!(f.n === dy && f.d === dx)) s += ` = ${numHTML(f.n / f.d)}`;
  else if (f.d === 1) s += ` = ${numHTML(f.n)}`;
  return s;
}

// c = y − mx using a known point.
export function interceptHTML(p, m, lead = '') {
  const prod = m * p.x;
  return `${lead}<i>c</i> = <i>y</i> ${MINUS} <i>mx</i> = ${numHTML(p.y)} ${MINUS} ${brHTML(m)} × ${brHTML(p.x)} = ${numHTML(p.y)} ${MINUS} ${brHTML(prod)} = ${numHTML(p.y - prod)}`;
}

const step = (html) => `<li>${html}</li>`;

export function workingHTML(ch) {
  const eq = `<span class="nowrap">${equationHTML(ch.m, ch.c)}</span>`;
  if (ch.type === 'read') {
    const p = ch.pts.find((q) => q.x > 0) || ch.pts[0];
    return `<ol class="steps">`
      + step(`The line crosses the y-axis at (0, ${numHTML(ch.c)}), so <i>c</i> = ${numHTML(ch.c)}.`)
      + step(`It also passes exactly through the grid point (${numHTML(p.x)}, ${numHTML(p.y)}).`)
      + step(gradientChainHTML({ x: 0, y: ch.c }, p))
      + step(`So <i>m</i> = ${numHTML(ch.m)} and <i>c</i> = ${numHTML(ch.c)}. The equation is ${eq}.`)
      + `</ol>`;
  }
  if (ch.type === 'two') {
    const prod = ch.m * ch.p1.x;
    return `<ol class="steps">`
      + step(gradientChainHTML(ch.p1, ch.p2))
      + step(`Substitute (${numHTML(ch.p1.x)}, ${numHTML(ch.p1.y)}): ${numHTML(ch.p1.y)} = ${numHTML(ch.m)} × ${brHTML(ch.p1.x)} + <i>c</i>, so <i>c</i> = ${numHTML(ch.p1.y)} ${MINUS} ${brHTML(prod)} = ${numHTML(ch.c)}.`)
      + step(`The equation is ${eq}.`)
      + `</ol>`;
  }
  if (ch.type === 'missing') {
    const cTerm = near(ch.c, 0) ? '' : ch.c < 0 ? ` ${MINUS} ${numHTML(-ch.c)}` : ` + ${numHTML(ch.c)}`;
    if (ch.mode === 'y') {
      const prod = ch.m * ch.x;
      return `<ol class="steps">`
        + step(`Put <i>x</i> = ${numHTML(ch.x)} into ${eq}.`)
        + step(`<i>y</i> = ${numHTML(ch.m)} × ${brHTML(ch.x)}${cTerm} = ${numHTML(prod)}${cTerm} = ${numHTML(ch.y)}`)
        + step(`So <i>y</i> = ${numHTML(ch.y)}. The point is (${numHTML(ch.x)}, ${numHTML(ch.y)}).`)
        + `</ol>`;
    }
    const rhs = ch.y - ch.c;
    return `<ol class="steps">`
      + step(`Replace <i>y</i> with ${numHTML(ch.y)} and <i>x</i> with <i>k</i>: ${numHTML(ch.y)} = ${numHTML(ch.m)}<i>k</i>${cTerm}`)
      + (near(ch.c, 0) ? '' : step(`${ch.c < 0 ? 'Add' : 'Subtract'} ${numHTML(Math.abs(ch.c))} on both sides: ${numHTML(ch.y)} ${MINUS} ${brHTML(ch.c)} = ${numHTML(ch.m)}<i>k</i>, so ${numHTML(rhs)} = ${numHTML(ch.m)}<i>k</i>`))
      + step(`Divide by ${brHTML(ch.m)}: <i>k</i> = ${numHTML(rhs)} ÷ ${brHTML(ch.m)} = ${numHTML(ch.x)}`)
      + step(`So <i>k</i> = ${numHTML(ch.x)}. The point is (${numHTML(ch.x)}, ${numHTML(ch.y)}).`)
      + `</ol>`;
  }
  // targets
  return `<ol class="steps">`
    + step(gradientChainHTML(ch.t1, ch.t2, { label: 'Gradient between the dots' }))
    + step(interceptHTML(ch.t1, ch.m, `Using (${numHTML(ch.t1.x)}, ${numHTML(ch.t1.y)}): `))
    + step(`Set <i>m</i> = ${numHTML(ch.m)} and <i>c</i> = ${numHTML(ch.c)}. The line is ${eq}.`)
    + `</ol>`;
}

export function answerText(ch) {
  if (ch.type === 'missing') return ch.mode === 'k' ? `k = ${numText(ch.x)}` : `y = ${numText(ch.y)}`;
  return `${equationText(ch.m, ch.c)}`;
}

// Fully worked example with different numbers (never solves the current challenge).
export function similarHTML(ex) {
  let graph = '';
  if (ex.type === 'read') graph = miniGraphSVG({ m: ex.m, c: ex.c, label: 'Example graph of a red line' });
  if (ex.type === 'targets') graph = miniGraphSVG({ m: ex.m, c: ex.c, targets: [ex.t1, ex.t2], label: 'Example graph with two target dots on the line' });
  const q = ex.type === 'read' ? 'Example: find the equation of this red line.'
    : ex.type === 'targets' ? `Example: make a line through ${pointText(ex.t1)} and ${pointText(ex.t2)}.`
    : 'Example: ' + questionHTML(ex);
  return `<p class="ex-q">${q}</p><div class="ex-body${graph ? ' has-graph' : ''}">${graph ? `<div class="ex-graph">${graph}</div>` : ''}<div class="ex-work">${workingHTML(ex)}</div></div>`;
}

export const describeForSR = (ch) => {
  if (ch.type === 'read') return `A red line on the grid. It passes exactly through the grid points ${pointText(ch.describe[0])} and ${pointText(ch.describe[1])}.`;
  if (ch.type === 'targets') return `Two target dots at ${pointText(ch.t1)} and ${pointText(ch.t2)}.`;
  if (ch.type === 'missing') return 'The red line from the question is drawn on the grid.';
  return 'No graph this time.';
};
