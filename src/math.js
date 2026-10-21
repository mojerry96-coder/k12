// Gradient Lab — mathematical core. Pure functions, no DOM. Single source of truth for
// numbers, fractions, equations and plot geometry used by every screen and by the tests.

export const MINUS = '−';
export const near = (a, b) => Number.isFinite(a) && Number.isFinite(b) && Math.abs(a - b) < 1e-9;

const VULGAR = { '½': 1 / 2, '⅓': 1 / 3, '⅔': 2 / 3, '¼': 1 / 4, '¾': 3 / 4 };

// Accepts whole numbers, decimals, negatives and fractions; ASCII or Unicode minus.
// Returns a finite number or null. Never uses eval. "1/0" -> null.
export function parseAnswer(raw) {
  const s = String(raw ?? '').trim().replace(/[−–—]/g, '-').replace(/\s+/g, '');
  if (!s) return null;
  const vm = s.match(/^([+-]?)([½⅓⅔¼¾])$/);
  if (vm) return (vm[1] === '-' ? -1 : 1) * VULGAR[vm[2]];
  const num = '[+-]?(?:\\d+(?:\\.\\d*)?|\\.\\d+)';
  if (!new RegExp(`^${num}(?:/${num})?$`).test(s)) return null;
  const [a, b] = s.split('/').map(Number);
  if (b === 0) return null;
  const v = b === undefined ? a : a / b;
  return Number.isFinite(v) ? v : null;
}

export function gcd(a, b) {
  a = Math.abs(a); b = Math.abs(b);
  while (b) [a, b] = [b, a % b];
  return a || 1;
}

// Exact for the curriculum's rational values (denominators up to 96).
export function toFrac(v) {
  if (!Number.isFinite(v)) return null;
  for (let d = 1; d <= 96; d++) {
    const n = Math.round(v * d);
    if (Math.abs(v * d - n) < 1e-7) return { n: n === 0 ? 0 : n, d };
  }
  return { n: Number(v.toFixed(6)), d: 1 };
}

// Simplify n/d with the sign moved to the top.
export function simplify(n, d) {
  if (d === 0) return null;
  const g = gcd(n, d), s = d < 0 ? -1 : 1;
  return { n: (s * n) / g || 0, d: Math.abs(d) / g };
}

// ---------- Plain-text formatting (screen-reader text, aria labels) ----------
export function numText(v) {
  const f = toFrac(v);
  if (!f) return 'undefined';
  const sign = f.n < 0 ? MINUS : '';
  return f.d === 1 ? sign + Math.abs(f.n) : `${sign}${Math.abs(f.n)}/${f.d}`;
}
export const pointText = (p) => `(${numText(p.x)}, ${numText(p.y)})`;

export function equationText(m, c) {
  if (near(m, 0)) return `y = ${numText(c)}`;
  const xTerm = near(m, 1) ? 'x' : near(m, -1) ? `${MINUS}x`
    : toFrac(m).d === 1 ? `${numText(m)}x` : `${numText(m)} x`;
  const cPart = near(c, 0) ? '' : c < 0 ? ` ${MINUS} ${numText(-c)}` : ` + ${numText(c)}`;
  return `y = ${xTerm}${cPart}`;
}

// ---------- HTML formatting (stacked fractions, Unicode minus) ----------
// Visually stacked; screen readers get "n over d".
export const fracHTML = (n, d) =>
  `<span class="frac"><span class="fstack" aria-hidden="true"><span class="fn">${n}</span><span class="fd">${d}</span></span><span class="sr-only">${String(n).replace(/<[^>]+>/g, '')} over ${String(d).replace(/<[^>]+>/g, '')}</span></span>`;

// A value as HTML: integers inline, fractions stacked, sign in front.
export function numHTML(v, cls = '') {
  const f = toFrac(v);
  if (!f) return 'undefined';
  const sign = f.n < 0 ? MINUS : '';
  const body = f.d === 1 ? String(Math.abs(f.n)) : fracHTML(Math.abs(f.n), f.d);
  const inner = sign + body;
  return cls ? `<span class="${cls}">${inner}</span>` : inner;
}
// Negative operands inside working are bracketed: 3 − (−1).
export const brHTML = (v, cls = '') => (v < 0 ? `(${numHTML(v, cls)})` : numHTML(v, cls));
export const brText = (v) => (v < 0 ? `(${numText(v)})` : numText(v));

// Equation as HTML with separately addressable m and c terms (for change highlighting).
export function equationHTML(m, c) {
  if (near(m, 0)) return `<span class="eq-y">y</span> = <span class="eq-c">${numHTML(c)}</span>`;
  const coef = near(m, 1) ? '' : near(m, -1) ? MINUS : numHTML(m);
  const cPart = near(c, 0) ? '' : c < 0 ? ` ${MINUS} ${numHTML(-c)}` : ` + ${numHTML(c)}`;
  return `<span class="eq-y">y</span> = <span class="eq-m">${coef}<i>x</i></span><span class="eq-c">${cPart}</span>`;
}

// ---------- Geometry ----------
export function lineThrough(a, b) {
  if (a.x === b.x && a.y === b.y) return { kind: 'coincident' };
  const dx = b.x - a.x, dy = b.y - a.y;
  if (dx === 0) return { kind: 'vertical', x: a.x, dx, dy };
  const m = dy / dx;
  return { kind: 'line', dx, dy, m, c: a.y - m * a.x };
}

// Beginner rise/run triangle: starts at (0,c); run 1 for whole m, 2 for half m; hidden at m=0.
export function beginnerTriangle(m, c) {
  if (near(m, 0)) return null;
  const run = Number.isInteger(m) ? 1 : 2;
  return { run, rise: m * run, pts: [{ x: 0, y: c }, { x: run, y: c }, { x: run, y: c + m * run }] };
}

export function steepness(m) {
  const a = Math.abs(m);
  return a < 1.5 ? 'gentle' : a < 3 ? 'steep' : 'very steep';
}
export const direction = (m) => (m > 0 ? 'uphill' : m < 0 ? 'downhill' : 'flat');

// Plot mapping: 640-unit square viewBox, 32-unit padding, -8..8 on both axes (equal units).
export const VIEW = 640, PAD = 32, STEP = (VIEW - 2 * PAD) / 16;
export const px = (x) => PAD + (x + 8) * STEP;
export const py = (y) => PAD + (8 - y) * STEP;
export const ux = (X) => (X - PAD) / STEP - 8;
export const uy = (Y) => 8 - (Y - PAD) / STEP;
export const inGrid = (p, lim = 8) => Math.abs(p.x) <= lim && Math.abs(p.y) <= lim;

export const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
