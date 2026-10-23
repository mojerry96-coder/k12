'use strict';
// Gradient Lab v2 — a game-like lesson for young learners, built from the 14 reference screens
// (Gradient_Lab_14_Pages_Replication.md). Every screen is assembled from groups (board, Fitila and
// her bubble, controls): on landscape screens each element sits at its design position (in design
// pixels × --u); on portrait screens the groups stack. Elements arrive in stages; Fitila is a looping,
// transparent clip for every pose. Open a screen directly with #1 … #14.

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const scene = $('#scene');
const MINUS = '−';
const fmt = (n) => (n < 0 ? MINUS + Math.abs(n) : String(n));
const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const SVGNS = 'http://www.w3.org/2000/svg';

// ---------- Fitila: resting-pose boxes in the design, still cut-outs, and looping clips ----------
const POSE = {
  wave: [154, 326, 523, 533], point: [1226, 372, 287, 377], side: [1153, 362, 410, 386], wing: [1264, 247, 322, 395],
  hint: [1281, 421, 235, 386], wingwave: [1309, 295, 272, 406], think: [1209, 340, 280, 471], puzzled: [1346, 360, 232, 411],
  celebrate: [636, 138, 418, 418], raise: [1115, 318, 380, 385], almost: [765, 295, 139, 147], success: [727, 296, 222, 178],
  thumbs: [1237, 379, 266, 357],
};
// Per clip: the clip's size, where Fitila's resting pose sits inside it, and a fingerprint of its files (filled in by the build).
const CLIPS = /*CLIPS*/ {};
const BUST = new Set(['almost', 'success']);

// ---------- graphs: box, origin and unit size measured per screen ----------
// ax: where the axes (and the line) stop inside the frame [left, right, top, bottom];
// labels: which of "0", "x", "y" the design shows; gridIn: grid kept inside the axes.
const GRAPHS = {
  2: { box: [214, 194, 939, 526], o: [683, 463], u: [101.25, 53], range: [-4, 4, -4, 4], ax: [19, 20, 22, 30], labels: '0xy', xName: 'below' },
  3: { box: [277, 145, 713, 690], o: [629, 491], u: [75, 75.6], range: [-4, 4, -4, 4], ax: [20, 23, 15, 20], labels: '', gridIn: true },
  4: { box: [214, 128, 794, 632], o: [606, 441], u: [79.1, 63.25], range: [-4, 4, -4, 4], ax: [18, 18, 19, 18], labels: '' },
  5: { box: [271, 112, 773, 621], o: [649, 433], u: [76.75, 63.25], range: [-4, 4, -4, 4], ax: [36, 41, 21, 25], labels: '0xy', gridIn: true, yName: 'above', faintZero: true },
  6: { box: [169, 162, 694, 664], o: [516, 519], u: [72.9, 61], range: [-4, 4, -4, 4], ax: [21, 28, 30, 23], labels: '0xy' },
  8: { box: [201, 155, 687, 678], o: [540, 499], u: [65.4, 65], range: [-4, 4, -4, 4], ax: [35, 35, 57, 40], labels: '0xy', gridIn: true },
  9: { box: [148, 121, 990, 576], o: [322, 521], u: [45, 50.8], range: [-2, 16, -2, 6], step: 2, ax: [20, 20, 22, 20], labels: 'y', zeroTicks: true },
  11: { box: [322, 128, 750, 560], o: [673, 437], u: [66, 53], range: [-4, 4, -4, 4], step: 2, ax: [21, 39, 47, 16], labels: 'xy', gridIn: true, xName: 'end' },
  12: { box: [161, 128, 819, 672], o: [533, 465], u: [61.3, 56], range: [-4, 4, -4, 4], dashed: true, ax: [39, 40, 47, 48], labels: 'y', gridIn: true },
};
GRAPHS[13] = GRAPHS[6]; GRAPHS[14] = GRAPHS[12];
let TARGETS = []; // set by the targets screen (and guided practice)

// ---------- levels: assigned by the learning platform, never chosen by the learner ----------
const LEVELS = [{ name: 'Beginner', screens: [2, 3, 4, 5, 12, 14] }, { name: 'Intermediate', screens: [6, 7, 8, 13] }, { name: 'Advanced', screens: [11, 9] }];
const params = new URLSearchParams(location.search);
const levelIndex = (v) => { const i = LEVELS.findIndex((l) => l.name.toLowerCase() === String(v ?? '').toLowerCase()); return i < 0 ? null : i; };
// Admin tools need the platform to say so (role: 'admin'); on a development host, ?admin stands in for it.
const DEV_HOST = location.protocol === 'file:' || /^(localhost|127\.0\.0\.1|\[::1\])$|\.localhost$|\.test$/.test(location.hostname);
const platform = { level: levelIndex(window.GradientLabConfig?.level ?? params.get('level')) ?? 0, admin: window.GradientLabConfig?.role === 'admin' || (DEV_HOST && params.has('admin')) };
const firstScreen = (lv = platform.level) => LEVELS[lv].screens[0];
let override = null; // an admin previewing another level: { level, back: snapshot of where they were }

// ---------- question sets: the reference question first, then fresh equivalents ----------
const Q = {
  6: [{ m: 1, c: 1 }, { m: 2, c: -1 }, { m: -1, c: 2 }],
  7: [{ A: [-2, -2], B: [2, 2] }, { A: [0, 1], B: [2, 5] }, { A: [-1, 3], B: [1, 1] }],
  8: [{ m: 1, c: 1, x: 2 }, { m: 2, c: -1, x: 3 }, { m: -1, c: 3, x: 1 }],
  9: [{ m: 0.5, c: 1, pts: [[4, 3], [10, 6]], choices: [-2, -1, 1, 5] }, { m: 0.5, c: -1, pts: [[4, 1], [10, 4]], choices: [-2, -1, 1, 4] },
    { m: 0.25, c: 2, pts: [[4, 3], [12, 5]], choices: [-2, 2, 3, 4] }],
  11: [{ targets: [[2, 1], [-2, -3]], start: [-0.5, 1] }, { targets: [[1, 3], [-1, -1]], start: [-0.5, 0] }, { targets: [[2, 0], [-2, 4]], start: [0.5, 1] }],
};
const qv = { 6: 0, 7: 0, 8: 0, 9: 0, 11: 0 };
const q = (n = page) => Q[n][qv[n] % Q[n].length];
const lineThrough = (a, b) => { const mv = (b[1] - a[1]) / (b[0] - a[0]); return { m: mv, c: a[1] - mv * a[0] }; };
// the skill each later screen practises, for guided support
const SUPPORT = { 6: 'equation', 7: 'equation', 8: 'substitute', 9: 'intercept', 11: 'targets' };

// ---------- Fitila's help when tapped: a hint per screen (4 opens the hint screen, 5 says it again) ----------
const HINTS = {
  2: 'Slide m to the right. The bigger m is, the steeper the line climbs.',
  3: 'Start in the middle at (0, 0). Count 2 squares right, then 2 squares up.',
  6: 'm is how far the line climbs for each 1 step right. c is where it crosses the y-axis.',
  7: 'm = change in y ÷ change in x. Then find where the line crosses the y-axis.',
  8: () => `Put x = ${fmt(q(8).x)} into y = ${exprHTML(q(8).m, q(8).c)}.`,
  9: 'The y-intercept is where the line crosses the y-axis, where x = 0.',
  11: 'Get the line through one target first, then change m until it reaches the other.',
};

// ---------- state ----------
let page = 1, m = 0, c = 0, pointB = null, attempts = 3, selected = null, walkTimer = 0, modalOpen = null, moved = false;

// =====================================================================================
// Building blocks. box = [x, y, w, h] in design pixels; stage orders the staged entry.
// =====================================================================================
const STAGE_AT = [0, 0, 420, 900, 1350]; // ms: 1 board, 2 Fitila & bubble, 3 controls, 4 extras
let stageCount = {};
function stageDelay(stage) { stageCount[stage] = (stageCount[stage] || 0) + 1; return STAGE_AT[stage] + (stageCount[stage] - 1) * 80; }
function group(name) {
  const g = document.createElement('div');
  g.className = `grp g-${name}`;
  scene.append(g);
  return g;
}
function place(el, b, { into = scene, anim, stage = 3, pw, delay } = {}) {
  if (b) { el.classList.add('L'); el.style.setProperty('--x', b[0]); el.style.setProperty('--y', b[1]); el.style.setProperty('--w', b[2]); if (b[3] != null) el.style.setProperty('--h', b[3]); else el.classList.add('auto-h'); }
  if (pw) el.style.setProperty('--pw', `calc(var(--u) * ${pw})`);
  if (anim) { el.dataset.in = anim; el.style.setProperty('--d', `${delay ?? stageDelay(stage)}ms`); }
  into.append(el);
  return el;
}
function make(tag, cls, html = '') { const el = document.createElement(tag); if (cls) el.className = cls; el.innerHTML = html; return el; }
function button(label, b, fn, { cls = '', into, stage = 3, anim = 'rise', pw } = {}) {
  const el = make('button', `btn ${cls}`, label);
  el.type = 'button';
  el.addEventListener('click', fn);
  return place(el, b, { into, stage, anim, pw });
}
function text(html, b, size, { into, cls = 'hand', style = '', stage = 1, anim = 'rise' } = {}) {
  const el = make('div', `${cls} fs`, html);
  el.style.cssText = `--fs:${size};line-height:1.1;${style}`;
  return place(el, b, { into, stage, anim });
}
// split plain words so they can arrive one at a time
const words = (s, start = 0) => s.split(/(\s+)/).map((w, i) => (/^\s+$/.test(w) ? w : `<span class="w" style="--i:${start + i / 2}">${w}</span>`)).join('');

// Speech bubble: pops out of its tail, words arrive one by one. tail = [baseX, baseY, tipX, tipY] (design px).
function bubble(lines, b, size, tail, { into, extra = '', stage = 2, delay } = {}) {
  const [x, y, w, h] = b;
  let n = 0;
  const html = lines.map((l) => { const s = words(l, n); n += l.split(/\s+/).length; return s; }).join('<br>');
  const el = make('div', 'bubble fs', `<div class="bubble-text">${html}${extra}</div>`);
  el.style.setProperty('--fs', size);
  if (tail) {
    const [bx, by, tx, ty] = tail.map((v, i) => v - (i % 2 ? y : x)), half = 20;
    const dx = tx - bx, dy = ty - by, len = Math.hypot(dx, dy) || 1, nx = -dy / len, ny = dx / len;
    const a = [bx + nx * half, by + ny * half], bb = [bx - nx * half, by - ny * half], mid = [(bx + tx) / 2 + nx * 6, (by + ty) / 2 + ny * 6];
    el.insertAdjacentHTML('afterbegin', `<svg class="tail" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" aria-hidden="true"><path d="M${a} Q${mid} ${tx},${ty} Q${(bx + tx) / 2},${(by + ty) / 2} ${bb} Z" fill="#fff" stroke="#E4EBF1" stroke-width="2" stroke-linejoin="round"/></svg>`);
    el.style.setProperty('--origin', `${(tx / w) * 100}% ${(ty / h) * 100}%`);
  }
  return place(el, b, { into, stage, anim: 'pop', delay: delay ?? STAGE_AT[2] + 380 });
}
// Fitila: a looping transparent clip placed so her resting pose fills the box; the still cut-out until it plays.
function fitila(pose, b = POSE[pose], { into, stage = 2, anim = 'hop', cls = '' } = {}) {
  const el = make('div', `fitila ${BUST.has(pose) ? 'bust' : ''} ${cls}`, '<span class="shadow"></span>');
  el.setAttribute('role', 'img');
  el.setAttribute('aria-label', 'Fitila the parrot');
  const r = b || POSE[pose];
  el.style.setProperty('--ar', r[2] / r[3]);
  const clip = CLIPS[pose];
  if (clip && !reduced()) {
    const [vw, vh, rx, ry, rw, rh, ver] = clip, q = ver ? `?v=${ver}` : '';
    const v = document.createElement('video');
    Object.assign(v, { muted: true, loop: true, autoplay: true, playsInline: true, preload: 'auto' });
    v.setAttribute('muted', ''); v.setAttribute('playsinline', ''); v.setAttribute('aria-hidden', 'true');
    v.poster = `media/fitila/${pose}_poster.webp${q}`;
    v.style.cssText = `width:${(vw / rw) * 100}%;height:${(vh / rh) * 100}%;left:${(-rx / rw) * 100}%;top:${(-ry / rh) * 100}%`;
    v.innerHTML = `<source src="media/fitila/${pose}.mov${q}" type='video/quicktime; codecs="hvc1"'><source src="media/fitila/${pose}.webm${q}" type="video/webm">`;
    el.append(v);
    v.play?.().catch(() => {}); // a blocked autoplay just leaves the poster showing
  } else {
    el.insertAdjacentHTML('beforeend', `<img class="still" src="assets/fitila/${pose}.webp" alt="">`);
  }
  return b ? place(el, b, { into, stage, anim }) : el;
}
// little hand-drawn emphasis strokes that draw themselves in
function burst(cx, cy, color, angles, len = 26, gap = 10, width = 7, into = scene) {
  const lines = angles.map((a) => {
    const r = (a * Math.PI) / 180, c1 = Math.cos(r), s1 = Math.sin(r);
    return `<line data-burst x1="${cx + c1 * gap}" y1="${cy + s1 * gap}" x2="${cx + c1 * (gap + len)}" y2="${cy + s1 * (gap + len)}"/>`;
  }).join('');
  return deco(`<g stroke="${color}" stroke-width="${width}" stroke-linecap="round">${lines}</g>`, into);
}
function deco(inner, into = scene, z = 1) {
  const s = document.createElementNS(SVGNS, 'svg');
  s.setAttribute('viewBox', '0 0 1672 941');
  s.setAttribute('aria-hidden', 'true');
  s.setAttribute('class', 'deco deco-layer L');
  s.style.cssText = `--x:0;--y:0;--w:1672;--h:941;z-index:${z}`;
  s.innerHTML = inner;
  s.style.setProperty('--d', `${STAGE_AT[2]}ms`);
  into.append(s);
  return s;
}
const ICON = {
  arrowR: '<svg viewBox="0 0 40 30" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"><path d="M3 15h32M24 4l11 11-11 11"/></svg>',
  arrowUp: '<svg viewBox="0 0 30 40" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"><path d="M15 37V5M4 16L15 5l11 11"/></svg>',
  bulb: '<svg viewBox="0 0 30 34" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M10 25h10M11.5 30h7M15 2a10 10 0 0 0-6 18c1 .8 1.5 2 1.5 3v2h9v-2c0-1 .5-2.2 1.5-3A10 10 0 0 0 15 2z"/></svg>',
  walk: '<svg viewBox="0 0 46 40" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M6 32l10-13 9 6 14-16"/><circle cx="6" cy="32" r="3.5" fill="#fff"/><circle cx="16" cy="19" r="3.5" fill="#fff"/><circle cx="25" cy="25" r="3.5" fill="#fff"/><circle cx="39" cy="9" r="3.5" fill="#fff"/></svg>',
  reset: '<svg viewBox="0 0 34 34" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"><path d="M7 17a10 10 0 1 0 3-7.2"/><path d="M7 5v6h6"/></svg>',
  pencil: '<svg viewBox="0 0 34 30" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 26l4-10L26 3l5 5-18 13z"/><path d="M8 16l5 5"/></svg>',
  check: '<svg viewBox="0 0 22 22" fill="none" stroke="#fff" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 11.5l4 4 8-9"/></svg>',
};

// =====================================================================================
// The coordinate graph (drawn from the maths; the SVG scales with its frame)
// =====================================================================================
function graph(n, opts = {}, into) {
  const g = GRAPHS[n];
  const host = make('div', 'graph');
  host.id = 'graph';
  host._g = g;
  host.style.setProperty('--ar', `${g.box[2]} / ${g.box[3]}`);
  place(host, g.box, { into, stage: 1, anim: 'frame' });
  drawGraph(opts);
  // practice taps (guided practice, walkthrough): tap or arrow keys + Enter, snapped to whole numbers
  host.addEventListener('pointerdown', (e) => { if (host._tap) { e.preventDefault(); host._tap(snapAt(host, e)); } });
  host.addEventListener('keydown', (e) => {
    if (!host._tap) return;
    const step = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, 1], ArrowDown: [0, -1] }[e.key], [x0, x1, y0, y1] = g.range;
    if (step) {
      e.preventDefault();
      const cu = host._cursor || [0, 0];
      host._cursor = [Math.max(x0, Math.min(x1, cu[0] + step[0])), Math.max(y0, Math.min(y1, cu[1] + step[1]))];
      drawGraph(host._opts);
    }
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); host._tap(host._cursor || [0, 0]); }
  });
  return host;
}
function snapAt(host, e) {
  const svg = host.querySelector('svg'), [x0, x1, y0, y1] = host._g.range;
  const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(svg.getScreenCTM().inverse());
  const [gx, gy] = mapping(host._g).toGraph(p.x, p.y);
  return [Math.max(x0, Math.min(x1, Math.round(gx))), Math.max(y0, Math.min(y1, Math.round(gy)))];
}
function mapping(g) {
  const [bx, by, bw, bh] = g.box, inset = 3;
  const W = bw - inset * 2, H = bh - inset * 2, ox = g.o[0] - bx - inset, oy = g.o[1] - by - inset;
  return { W, H, ox, oy, X: (v) => ox + v * g.u[0], Y: (v) => oy - v * g.u[1], toGraph: (px, py) => [(px - ox) / g.u[0], (oy - py) / g.u[1]] };
}
function drawGraph(o = {}) {
  const host = $('#graph');
  if (!host) return;
  const first = !host._drawn;
  const intro = first && !reduced(); // drawing itself on: arrowheads wait until the lines are complete
  host._opts = o;
  const g = host._g, M = mapping(g), { W, H, X, Y } = M;
  const [x0, x1, y0, y1] = g.range, step = g.step || 1, [al, ar, at, ab] = g.ax;
  const L = (a, b, cc, d, stroke, width = 2, extra = '') => `<line x1="${a}" y1="${b}" x2="${cc}" y2="${d}" stroke="${stroke}" stroke-width="${width}" ${extra}/>`;
  const drawn = (len) => (intro ? `class="draw" style="--len:${Math.ceil(len)}"` : '');
  const arrows = (id) => (intro || o.lineIn ? '' : `marker-start="url(#${id})" marker-end="url(#${id})"`);
  let s = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Coordinate grid${o.m != null ? `, line y equals ${o.m} x plus ${o.c || 0}` : ''}"><defs>
      <marker id="ah" viewBox="0 0 12 12" refX="10" refY="6" markerUnits="userSpaceOnUse" markerWidth="14" markerHeight="14" orient="auto-start-reverse"><path d="M2 2L10 6L2 10Z" fill="var(--axis)"/></marker>
      <marker id="ahl" viewBox="0 0 12 12" refX="9" refY="6" markerUnits="userSpaceOnUse" markerWidth="20" markerHeight="20" orient="auto-start-reverse"><path d="M2 1.5L10 6L2 10.5" fill="none" stroke="var(--orange)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></marker></defs>`;
  const gx = g.gridIn ? [al + 10, W - ar - 10] : [0, W], gy = g.gridIn ? [at + 10, H - ab - 10] : [0, H];
  const dash = g.dashed ? 'stroke-dasharray="6 6"' : '';
  for (let v = Math.ceil((gx[0] - M.ox) / g.u[0] / step) * step; X(v) <= gx[1]; v += step) s += L(X(v), gy[0], X(v), gy[1], '#DCE3EA', 1.5, dash);
  for (let v = Math.ceil((M.oy - gy[1]) / g.u[1] / step) * step; Y(v) >= gy[0]; v += step) s += L(gx[0], Y(v), gx[1], Y(v), '#DCE3EA', 1.5, dash);
  s += L(al, Y(0), W - ar, Y(0), 'var(--axis)', 2.2, `${arrows('ah')} ${drawn(W)}`);
  s += L(X(0), H - ab, X(0), at, 'var(--axis)', 2.2, `${arrows('ah')} ${drawn(H)}`);
  for (let v = x0; v <= x1; v += step) {
    if (v === 0 && !g.zeroTicks) continue;
    s += L(X(v), Y(0) - 7, X(v), Y(0) + 7, 'var(--axis)', 2) + `<text x="${X(v)}" y="${Y(0) + 34}" text-anchor="middle">${fmt(v)}</text>`;
  }
  for (let v = y0; v <= y1; v += step) {
    if (v === 0 && !g.zeroTicks) continue;
    s += L(X(0) - 7, Y(v), X(0) + 7, Y(v), 'var(--axis)', 2) + `<text x="${X(0) - 22}" y="${Y(v) + 8}" text-anchor="end">${fmt(v)}</text>`;
  }
  const has = (k) => (g.labels || '').includes(k);
  if (has('0')) s += `<text x="${X(0) + 14}" y="${Y(0) + 32}" ${g.faintZero ? 'style="fill:#A9B6C3"' : ''}>0</text>`;
  if (has('x')) s += g.xName === 'below' ? `<text class="axis-name" x="${W - ar - 6}" y="${Y(0) + 30}">x</text>`
    : g.xName === 'end' ? `<text class="axis-name" x="${W - ar + 8}" y="${Y(0) + 8}">x</text>` : `<text class="axis-name" x="${W - ar - 2}" y="${Y(0) - 14}">x</text>`;
  if (has('y')) s += g.yName === 'above' ? `<text class="axis-name" x="${X(0) - 7}" y="${at - 6}">y</text>` : `<text class="axis-name" x="${X(0) + 12}" y="${at + 12}">y</text>`;
  if (o.m != null) {
    const a = o.m, b = o.c || 0, lim = [al, W - ar, at, H - ab];
    // the line stops a little past the last tick, as drawn in the designs, and never beyond the axes
    const gx0 = Math.max(M.toGraph(lim[0], 0)[0], x0 - 0.55), gx1 = Math.min(M.toGraph(lim[1], 0)[0], x1 + 0.55);
    const gyTop = Math.min(M.toGraph(0, lim[2])[1], y1 + 0.7), gyBot = Math.max(M.toGraph(0, lim[3])[1], y0 - 0.7);
    const pts = [];
    for (const xv of [gx0, gx1]) { const yv = a * xv + b; if (yv <= gyTop + 1e-9 && yv >= gyBot - 1e-9) pts.push([xv, yv]); }
    if (a !== 0) for (const yv of [gyTop, gyBot]) { const xv = (yv - b) / a; if (xv >= gx0 - 1e-9 && xv <= gx1 + 1e-9) pts.push([xv, yv]); }
    const uniq = pts.filter((p, i) => pts.findIndex((q) => Math.abs(q[0] - p[0]) + Math.abs(q[1] - p[1]) < 1e-6) === i).sort((p, q) => p[0] - q[0]);
    if (uniq.length >= 2) {
      const [u, v] = [uniq[0], uniq[uniq.length - 1]];
      const len = Math.hypot(X(v[0]) - X(u[0]), Y(v[1]) - Y(u[1]));
      s += L(X(u[0]), Y(u[1]), X(v[0]), Y(v[1]), 'var(--orange)', 4, `stroke-linecap="round" ${arrows('ahl')} ${o.lineIn ? `class="draw-now" style="--len:${Math.ceil(len)}"` : drawn(len)}`);
    }
    if (o.ends) for (const xv of [-4, 4]) { const yv = a * xv + b; if (yv >= y0 && yv <= y1) s += `<circle cx="${X(xv)}" cy="${Y(yv)}" r="12" fill="var(--orange)" stroke="#fff" stroke-width="4"/>`; }
  }
  let pi = 0;
  const pt = (inner) => `<g class="${first ? 'pt' : ''}" style="--i:${pi++}">${inner}</g>`;
  const dot = (xv, yv, fill, r = 17) => `<circle cx="${X(xv)}" cy="${Y(yv)}" r="${r}" fill="${fill}" stroke="#fff" stroke-width="5"/>`;
  const tag = (xv, yv, label, fill, dx, dy, w = 130) => `<rect x="${X(xv) + dx}" y="${Y(yv) + dy}" width="${w}" height="40" rx="10" fill="${fill}"/><text x="${X(xv) + dx + w / 2}" y="${Y(yv) + dy + 28}" text-anchor="middle" style="fill:#fff;font-size:23px;font-weight:600">${label}</text>`;
  if (o.hint) {
    s += L(X(-2) + 20, Y(-2), X(2) - 4, Y(-2), '#1FA3E4', 3, `stroke-dasharray="11 9" marker-end="url(#ahl)"`);
    s += L(X(2), Y(-2) - 4, X(2), Y(2) + 22, '#14A86E', 3, `stroke-dasharray="11 9" marker-end="url(#ahl)"`);
    s += pt(`<rect x="${X(0) - 11}" y="${Y(-2) + 14}" width="46" height="40" rx="9" fill="#CDEBFC"/><text x="${X(0) + 12}" y="${Y(-2) + 42}" text-anchor="middle" style="fill:#1C8FD8;font-size:25px;font-weight:700">4</text>`);
    s += pt(`<rect x="${X(2) + 12}" y="${Y(0) - 3}" width="42" height="38" rx="9" fill="#D3F3E5"/><text x="${X(2) + 33}" y="${Y(0) + 24}" text-anchor="middle" style="fill:#12A066;font-size:25px;font-weight:700">4</text>`);
  }
  if (o.points) {
    s += pt(dot(-2, -2, '#1EA1E6') + (o.hint ? tag(-2, -2, 'A (−2, −2)', '#1EA1E6', -50, 20, 126) : tag(-2, -2, 'A (−2, −2)', '#2BA3E5', -24, 22, 130)));
    s += pt(dot(2, 2, '#7A4BD8') + (o.hint ? tag(2, 2, 'B (2, 2)', '#7A4BD8', -2, -62, 100) : tag(2, 2, 'B (2, 2)', '#7A55D2', 31, -20, 106)));
  }
  if (o.place) {
    s += pt(dot(-2, -2, '#1EA1E6') + `<text x="${X(-2) - 28}" y="${Y(-2) - 26}" style="fill:#1E9BE0;font-size:30px;font-weight:600">A</text>`);
    s += `<g class="${first ? 'pt' : ''} drag-b" style="--i:1"><circle cx="${X(pointB[0])}" cy="${Y(pointB[1])}" r="30" fill="#EFE6FD" stroke="#B89BEF" stroke-width="2" stroke-dasharray="6 5"/>${dot(pointB[0], pointB[1], '#7A4BD8')}<text x="${X(pointB[0]) + 22}" y="${Y(pointB[1]) - 26}" style="fill:#7A4BD8;font-size:30px;font-weight:600">B</text></g>`;
  }
  if (o.success) s += pt(dot(-2, -2, '#7547CD'));
  if (o.pts) s += o.pts.map(([px, py]) => pt(dot(px, py, '#5A35B8', 15))).join(''); // points on the line, never the intercept itself
  if (o.targets) {
    for (const [tx, ty] of TARGETS) {
      const hit = Math.abs(m * tx + c - ty) < 0.08, col = hit ? '#0FA36C' : '#7A4BD8', halo = hit ? '#D3F1E4' : '#E9DEFC';
      s += `<circle class="${hit ? '' : 'target-halo'}" cx="${X(tx)}" cy="${Y(ty)}" r="38" fill="${halo}"/>` + pt(dot(tx, ty, col, 15));
      if (hit) s += `<g class="pt" style="--i:0"><circle cx="${X(tx) + 28}" cy="${Y(ty) - 37}" r="15" fill="#0FA36C" stroke="#fff" stroke-width="3"/><path d="M${X(tx) + 21} ${Y(ty) - 37}l5 5 9-10" fill="none" stroke="#fff" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/></g>`;
    }
  }
  if (o.draw) s += o.draw({ X, Y, dot, L });
  if (host._tap && host._cursor) s += `<circle cx="${X(host._cursor[0])}" cy="${Y(host._cursor[1])}" r="24" fill="none" stroke="#FFBD20" stroke-width="4" stroke-dasharray="7 5"/>`;
  s += '</svg>';
  host.innerHTML = s;
  host._drawn = true;
  if (intro) setTimeout(() => { if (host.isConnected && !host._settled) { host._settled = true; drawGraph(host._opts); } }, 1400);
  if (o.place && !host._wired) wirePlacement(host);
}

// Screen 3: drag B, tap the grid, or use the arrow keys; snaps to whole numbers in −4…4.
function wirePlacement(host) {
  host._wired = true;
  host.tabIndex = 0;
  host.setAttribute('role', 'application');
  host.setAttribute('aria-label', 'Point B. Drag it, tap the grid, or use the arrow keys; Enter checks.');
  const put = ([px, py]) => {
    const next = [Math.max(-4, Math.min(4, px)), Math.max(-4, Math.min(4, py))];
    if (next[0] === pointB[0] && next[1] === pointB[1]) return;
    pointB = next;
    drawGraph({ place: true });
    $('#b-label').textContent = `B (${pointB.map(fmt).join(', ')})`;
    bump($('#b-label').parentElement);
    announce($('#b-label').textContent);
  };
  host.addEventListener('pointerdown', (e) => {
    if (host._tap) return; // a walkthrough practice tap, not the learner's B
    try { host.setPointerCapture(e.pointerId); } catch { /* synthetic pointer */ }
    host.classList.add('dragging'); put(snapAt(host, e));
  });
  host.addEventListener('pointermove', (e) => { if (host.classList.contains('dragging') && !host._tap) put(snapAt(host, e)); });
  const stop = () => host.classList.remove('dragging');
  host.addEventListener('pointerup', stop);
  host.addEventListener('pointercancel', stop);
  host.addEventListener('keydown', (e) => {
    if (host._tap) return;
    const moves = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, 1], ArrowDown: [0, -1] };
    if (moves[e.key]) { e.preventDefault(); put([pointB[0] + moves[e.key][0], pointB[1] + moves[e.key][1]]); }
    if (e.key === 'Enter') confirmB();
  });
}

// =====================================================================================
// Equation badge, answer fields, tries, sliders
// =====================================================================================
function exprHTML(mv, cv) {
  if (mv === 0) return fmt(cv);
  const mt = mv === 1 ? '' : mv === -1 ? MINUS : fmt(mv);
  return `${mt}x${cv === 0 ? '' : cv > 0 ? ` + ${cv}` : ` ${MINUS} ${Math.abs(cv)}`}`;
}
function equation(b, cls = '', into) {
  const el = make('div', `equation ${cls}`);
  el.id = 'equation';
  place(el, b, { into, stage: 1, anim: 'drop', delay: 260 });
  updateEquation();
  return el;
}
function updateEquation() {
  const el = $('#equation');
  if (!el) return;
  const plain = el.classList.contains('peach');
  const next = plain ? `y = ${exprHTML(m, c)}` : `y = <span class="num">${exprHTML(m, c)}</span>`;
  if (el.innerHTML !== next) { el.innerHTML = next; bump(plain ? el : el.querySelector('.num')); }
}
function bump(el) { if (!el || reduced()) return; el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump'); }
function field(id, label, b, kind = '', value = '', { into, stage = 3, pw } = {}) {
  const el = make('label', `field ${kind}`, `<b>${label}</b><input id="${id}" type="text" inputmode="decimal" autocomplete="off" spellcheck="false" aria-label="${label.replace('=', '').trim()}" value="${value}">`);
  place(el, b, { into, stage, anim: 'rise', pw });
  return el.querySelector('input');
}
function tries(b, { into, dots = true, cls = '' } = {}) {
  const el = make('div', `tries ${cls}`);
  el.id = 'tries';
  el._dots = dots;
  place(el, b, { into, stage: 4, anim: 'fade' });
  renderTries();
  return el;
}
function renderTries() {
  const el = $('#tries');
  if (!el) return;
  el.innerHTML = (el._dots ? `<div class="dots">${[0, 1, 2].map((i) => `<i class="${i < attempts ? '' : 'used'}"></i>`).join('')}</div>` : '') + `${attempts} ${attempts === 1 ? 'try' : 'tries'}`;
}
const announce = (s) => { const l = $('#live'); l.textContent = ''; requestAnimationFrame(() => { l.textContent = s; }); };

function slider(key, b, { min, max, step, compact = false, filled = false, into, onFirst } = {}) {
  const el = make('div', `slider ${key} ${compact ? 'compact' : ''} ${filled ? 'filled' : ''}`,
    `<span class="key">${key}</span><div class="rail"><span class="track"><span class="fill"></span></span>
     <input type="range" min="${min}" max="${max}" step="${step}" value="${key === 'm' ? m : c}" aria-label="${key === 'm' ? 'Gradient, m' : 'Y-intercept, c'}">
     <span class="thumb"></span><span class="lim lo">${fmt(min)}</span><span class="lim hi">${fmt(max)}</span><span class="val"></span></div>`);
  place(el, b, { into, stage: 3, anim: 'rise' });
  const input = el.querySelector('input'), out = el.querySelector('.val');
  const show = (animate = true) => {
    const v = +input.value;
    el.style.setProperty('--f', (v - min) / (max - min));
    const t = fmt(+v.toFixed(2));
    if (out.textContent !== t) { out.textContent = t; if (animate) bump(out); }
    input.setAttribute('aria-valuetext', `${key} = ${t}`);
  };
  input.addEventListener('input', () => {
    const v = +input.value;
    if (key === 'm') m = v; else c = v;
    show();
    drawGraph({ ...$('#graph')._opts, m, c });
    updateEquation();
    updateHits();
    if (!moved) { moved = true; onFirst?.(); }
  });
  show(false);
  input._show = show;
  return input;
}

// =====================================================================================
// Modal (outside the frame, sized in --u like everything else) and celebration confetti
// =====================================================================================
const MODAL_DECO = `<svg class="decor" viewBox="0 0 572 460" preserveAspectRatio="none" aria-hidden="true">
  <path fill="#F1F2F4" d="M88 70l10 22 22-12-6 24 24 4-21 12 14 20-24-6-4 24-12-21-20 14 6-24-24-4 21-12-14-20 24 6z"/>
  <path fill="none" stroke="#F1F2F4" stroke-width="26" stroke-linecap="round" d="M470 -10c-40 20-30 60 10 70s50 50 20 80"/>
  <path fill="#F3F4F6" d="M462 470c-10-36 20-58 44-44 8-26 50-24 54 6 26 0 30 34 12 46z"/></svg>`;
function modal({ title, body, pose, action = 'Continue', onAction, remaining = null, success = false }) {
  closeModal(false);
  const returnFocus = document.activeElement;
  const artW = pose === 'success' ? 226 : BUST.has(pose) ? 150 : 170;
  const confettiMarks = success ? `<svg viewBox="0 0 300 190" style="position:absolute;left:50%;top:0;width:calc(var(--u)*300);height:calc(var(--u)*190);transform:translateX(-50%);z-index:3" aria-hidden="true" fill="none" stroke-linecap="round" stroke-width="9">
      <path class="sparkle" d="M38 63l-14-8" stroke="#7A4BD8"/><path class="sparkle" d="M85 22l-6-12" stroke="#F2A12E"/><path class="sparkle" d="M228 56l12-9" stroke="#FE6011"/><path class="sparkle" d="M252 100l14-5" stroke="#12AA75"/></svg>` : '';
  const scrim = make('div', '');
  scrim.id = 'scrim';
  const el = make('div', 'modal');
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-modal', 'true');
  el.setAttribute('aria-labelledby', 'modal-title');
  el.innerHTML = `<div class="inner">${MODAL_DECO}<div class="art" style="width:calc(var(--u) * ${artW})">${confettiMarks}</div>
    <h2 id="modal-title">${title}</h2><p class="${success ? 'success' : ''}">${body}</p>
    <button class="btn" type="button" id="modal-button">${action}</button>${remaining !== null ? `<small>${remaining} ${remaining === 1 ? 'try' : 'tries'} left</small>` : ''}</div>`;
  const p = POSE[pose], artH = (artW * p[3]) / p[2];
  const art = fitila(pose, null);
  art.style.cssText += `position:relative;width:calc(var(--u) * ${artW});height:calc(var(--u) * ${artH})`;
  el.querySelector('.art').prepend(art);
  document.body.append(scrim, el);
  $('#app').inert = true;
  modalOpen = { el, scrim, returnFocus };
  $('#modal-button').addEventListener('click', () => { closeModal(); onAction?.(); });
  $('#modal-button').focus({ preventScroll: true });
  announce(`${title}. ${el.querySelector('p').textContent}`);
  if (success) confetti();
}
function closeModal(restore = true) {
  if (!modalOpen) return;
  const { el, scrim, returnFocus } = modalOpen;
  modalOpen = null;
  el.remove(); scrim.remove();
  $('#app').inert = false;
  if (restore && returnFocus?.isConnected) returnFocus.focus({ preventScroll: true });
}
function confetti(x = innerWidth / 2, y = innerHeight / 2) {
  if (reduced()) return;
  const host = make('div', 'confetti');
  host.style.cssText = `left:${x}px;top:${y}px`;
  const colors = ['#FE6011', '#7A4BD8', '#12AA75', '#F5C400', '#3EA9EC'];
  for (let i = 0; i < 36; i++) {
    const a = (Math.PI * 2 * i) / 36 + Math.random() * 0.4, r = 160 + Math.random() * 260;
    const p = document.createElement('i');
    p.style.cssText = `background:${colors[i % 5]};--dx:${Math.cos(a) * r}px;--dy:${Math.sin(a) * r * 0.8 + 140}px;--r:${Math.random() * 720 - 360}deg;animation-delay:${Math.random() * 120}ms`;
    host.append(p);
  }
  document.body.append(host);
  setTimeout(() => host.remove(), 1400);
}
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && modalOpen) { e.preventDefault(); closeModal(); }
  if (e.key === 'Tab' && modalOpen) { e.preventDefault(); $('#modal-button').focus(); } // the dialog has one control
});

// =====================================================================================
// Checking
// =====================================================================================
function success(message, next) {
  emit('attempt', { skill: SUPPORT[page] || null, correct: true, attemptsLeft: attempts });
  modal({ title: 'You got it!', body: message, pose: 'success', action: 'Continue', onAction: () => go(next), success: true }); }
// A wrong (valid) answer. On the later screens: 1st → a short nudge; 2nd → Fitila offers to work through it
// together; 3rd → the answer with its working, then a fresh question of the same kind.
function failure(message, fields = [], working = null) {
  attempts = Math.max(0, attempts - 1);
  renderTries();
  for (const id of fields) { const f = $('#' + id)?.closest('.field'); if (f) { f.classList.remove('wrong'); void f.offsetWidth; f.classList.add('wrong'); } }
  const skill = SUPPORT[page];
  emit('attempt', { skill: skill || null, correct: false, attemptsLeft: attempts });
  if (skill && attempts === 1 && coach) { announce(message); wsNudge(); offerSupport(); return; }
  if (skill && attempts === 0 && working) {
    modal({ title: 'Here’s how it works', body: working, pose: 'think', action: 'Got it', onAction: () => freshQuestion(true) });
    return;
  }
  const out = attempts === 0;
  modal({ title: 'Almost!', body: out ? `${message} Let’s practise this step again.` : message + wsNudge(), pose: 'almost',
    action: out ? 'Practise again' : 'Try again', remaining: attempts, onAction: () => { if (out) { attempts = 3; renderTries(); } } });
}
const par = (v) => (v < 0 ? `(${fmt(v)})` : fmt(v));
const WORKING = {
  6: ({ m: mv, c: cv }) => `The line goes ${mv > 0 ? 'up' : 'down'} ${fmt(Math.abs(mv))} for every 1 step right, so m = ${fmt(mv)}. It crosses the y-axis at ${fmt(cv)}, so c = ${fmt(cv)}.`,
  7: ({ A, B }) => {
    const L = lineThrough(A, B);
    return `From A to B it goes ${B[1] >= A[1] ? 'up' : 'down'} ${fmt(Math.abs(B[1] - A[1]))} and across ${fmt(B[0] - A[0])}, so m = ${fmt(B[1] - A[1])} ÷ ${fmt(B[0] - A[0])} = ${fmt(L.m)}. Then c = y − m × x = ${fmt(A[1])} − ${par(L.m)} × ${par(A[0])} = ${fmt(L.c)}.`;
  },
  8: ({ m: mv, c: cv, x }) => `Put x = ${fmt(x)} into y = ${exprHTML(mv, cv)}: y = ${substitution(mv, cv, x)} = ${fmt(mv * x + cv)}.`,
  9: ({ c: cv }) => `The line crosses the y-axis, where x = 0, at y = ${fmt(cv)}. So the y-intercept is ${fmt(cv)}.`,
  11: ({ targets }) => {
    const [a, b] = [...targets].sort((p, r) => p[0] - r[0]), L = lineThrough(a, b);
    return `From (${a.map(fmt).join(', ')}) to (${b.map(fmt).join(', ')}) the line goes ${b[1] >= a[1] ? 'up' : 'down'} ${fmt(Math.abs(b[1] - a[1]))} and across ${fmt(b[0] - a[0])}, so m = ${fmt(L.m)}. It crosses the y-axis at ${fmt(L.c)}, so c = ${fmt(L.c)}.`;
  },
};
const substitution = (mv, cv, x) => `${mv === 1 ? par(x) : `${fmt(mv)} × ${par(x)}`} ${cv < 0 ? '−' : '+'} ${fmt(Math.abs(cv))}`;
// after the answer has been shown, carry on with a fresh question of the same kind (full tries again)
let offerOnArrival = false;
function freshQuestion(offer) {
  qv[page] += 1;
  offerOnArrival = offer;
  go(page);
}
function numeric(id) {
  const raw = ($('#' + id)?.value || '').trim().replace(/[−–]/g, '-');
  if (!raw || !/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(raw)) return null;
  return Number(raw);
}
function check(fields, answers, next, message, working) {
  if (tour) return; // the walkthrough never submits answers
  const nums = fields.map(numeric);
  const bad = nums.findIndex((v) => v === null || !Number.isFinite(v));
  if (bad >= 0) { // blank or not a number: no try used, just a nudge
    announce('Enter a number in each answer box.');
    const f = $('#' + fields[bad]); f.focus(); bump(f.closest('.field'));
    return;
  }
  if (nums.every((v, i) => Math.abs(v - answers[i]) < 1e-6)) return success(message, next);
  const cRight = fields.includes('c-answer') && Math.abs(nums[0] - answers[0]) < 1e-6;
  failure(cRight ? 'Check where the line crosses the y-axis.' : 'Check the rise and run, then try again.', cRight ? ['c-answer'] : fields, working);
}
function confirmB() {
  if (tour) return;
  if (pointB[0] === 2 && pointB[1] === 2) go(4);
  else modal({ title: 'Almost!', body: `B is at (${pointB.map(fmt).join(', ')}). Count from the middle to find (2, 2).${wsNudge()}`, pose: 'almost', action: 'Try again' });
}
const hitCount = () => TARGETS.filter(([x, y]) => Math.abs(m * x + c - y) < 0.08).length;
function updateHits() {
  const el = $('#hits');
  if (!el) return;
  const before = el.dataset.n;
  const rings = TARGETS.map(([x, y]) => (Math.abs(m * x + c - y) < 0.08 ? `<span class="ring hit"><i></i><span class="ok">${ICON.check}</span></span>` : '<span class="ring miss"><i></i></span>'));
  el.innerHTML = `${rings.join('')}<span class="sep"></span>${hitCount()} / 2`;
  el.dataset.n = hitCount();
  el.setAttribute('aria-label', `${hitCount()} of 2 targets hit`);
  if (before != null && before !== el.dataset.n) bump(el);
}

// =====================================================================================
// Fitila's bubble: the question stays on show. When the learner has been still for a while,
// "Tap me for a hint!" pops up for a moment and the question comes straight back. After a second
// wrong answer she offers to work through the idea together instead.
// =====================================================================================
const TIP_MS = 3000, IDLE_MS = 14000;
let coach = null;
function coachStop() {
  if (!coach) return;
  coach.timers.forEach(clearTimeout);
  clearTimeout(coach.idle);
  coach = null;
}
function coachStart({ quiet = false } = {}) {
  coachStop();
  const b = $('.g-buddy .bubble', scene), f = $('.g-buddy .fitila', scene);
  if (!b) return;
  const t = b.querySelector('.bubble-text');
  coach = { b, f, say: t.innerHTML, text: t.textContent.replace(/\s+/g, ' ').trim(), timers: [], idle: 0, offered: false, offering: false };
  const entry = quiet ? 0 : parseFloat(b.style.getPropertyValue('--d')) || 0;
  if (quiet) { bubbleSay(words('Your turn!')); coachLater(sayQuestion, 2600); }
  b.addEventListener('click', (e) => {
    const act = e.target.closest('[data-act]')?.dataset.act;
    if (act === 'together') { e.stopPropagation(); startGuided(); }
    else if (act === 'keep') { e.stopPropagation(); coach.offering = false; emit('support', { skill: SUPPORT[page], choice: 'keep-trying' }); sayQuestion(); armIdle(); }
    else if (b.classList.contains('tip')) helpMe();
  });
  if (!f || !(HINTS[page] || page === 4 || page === 5)) return;
  f.classList.add('tappable');
  f.setAttribute('role', 'button');
  f.tabIndex = 0;
  f.setAttribute('aria-label', `Fitila says: ${coach.text} Tap her for a hint.`);
  f.addEventListener('click', helpMe);
  f.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); helpMe(); } });
  if (offerOnArrival) { offerOnArrival = false; coachLater(() => offerSupport(true), entry + 700); }
}
function coachLater(fn, ms) { const c0 = coach; c0.timers.push(setTimeout(() => { if (coach === c0) fn(); }, ms)); }
function armIdle() {
  if (!coach?.f?.classList.contains('tappable')) return;
  clearTimeout(coach.idle);
  const c0 = coach;
  coach.idle = setTimeout(() => { if (coach === c0) offerHelp(); }, IDLE_MS);
}
['pointerdown', 'keydown', 'input'].forEach((t) => addEventListener(t, () => armIdle(), true));
function bubbleSay(html, cls) {
  const { b } = coach;
  b.querySelector('.bubble-text').innerHTML = html;
  b.classList.remove('away', 'again', 'tip', 'offer');
  if (cls) b.classList.add(cls);
  void b.offsetWidth;
  b.classList.add('again');
}
function bubbleAway() { if (!coach) return; coach.b.classList.remove('again'); coach.b.classList.add('away'); }
function sayQuestion() { if (coach && !coach.offering) bubbleSay(coach.say); }
function offerHelp() {
  if (!coach) return;
  const { b, f } = coach;
  // never talk over a dialog, the walkthrough, a hidden tab or an open offer
  if (modalOpen || tour || document.hidden || coach.offering || b.classList.contains('tip')) { armIdle(); return; }
  bubbleSay(`${words('Tap me')}<br>${words('for a hint!', 2)}`, 'tip');
  f.classList.remove('hey'); void f.offsetWidth; f.classList.add('hey');
  if (!coach.offered) { coach.offered = true; announce('Tap Fitila for a hint.'); }
  coachLater(sayQuestion, TIP_MS); // a moment, then the question is back
  armIdle();
}
function helpMe() {
  if (!coach || tour) return;
  if (coach.offering) return; // her offer is already showing
  if (page === 4) { go(5); return; }
  sayQuestion(); // the question stays in her bubble (on screen 5 it holds the hint itself)
  if (page === 5) return;
  const h = HINTS[page];
  modal({ title: coach.text, body: typeof h === 'function' ? h() : h, pose: 'think', action: 'Got it' });
}
// "Let's build this together": stays until the learner chooses, so it never times out on them
function offerSupport(fresh = false) {
  if (!coach) return;
  coach.timers.forEach(clearTimeout); coach.timers = [];
  coach.offering = true;
  const first = fresh ? 'Here’s a fresh one.' : 'Let’s build this together.';
  bubbleSay(`${words(first)} ${words('Want to try it step by step?', 4)}<span class="offer-acts"><button type="button" class="btn small" data-act="together">Try together</button><button type="button" class="btn small outline" data-act="keep">Keep trying</button></span>`, 'offer');
  const { f } = coach;
  f.classList.remove('hey'); void f.offsetWidth; f.classList.add('hey');
  announce(`Fitila: ${first} Want to try it step by step? Try together, or keep trying.`);
  emit('support-offered', { skill: SUPPORT[page], attemptsLeft: attempts, freshQuestion: fresh });
}

// =====================================================================================
// Navigation, and saving/restoring a screen's work (for guided practice, the walkthrough and admin preview)
// =====================================================================================
function snapshot() {
  return { page, attempts, m, c, selected, moved, pointB: pointB && [...pointB], qv: qv[page],
    fields: Object.fromEntries($$('input[type=text]', scene).map((i) => [i.id, i.value])) };
}
function restoreState(s) {
  attempts = s.attempts; renderTries();
  for (const [id, v] of Object.entries(s.fields)) { const el = $('#' + id); if (el) el.value = v; }
  if (s.selected != null) { selected = s.selected; $$('.choice', scene)[selected]?.classList.add('selected'); }
  if (s.pointB && $('#b-label')) { pointB = s.pointB; drawGraph({ place: true }); $('#b-label').textContent = `B (${pointB.map(fmt).join(', ')})`; }
  const sliders = $$('.slider input', scene);
  if (sliders.length) {
    m = s.m; c = s.c;
    for (const input of sliders) { input.value = input.getAttribute('aria-label').startsWith('Gradient') ? m : c; input._show(false); }
    drawGraph({ ...$('#graph')._opts, m, c }); updateEquation(); updateHits();
    if (s.moved) { moved = true; const w = $('#walk'); if (w) { w.hidden = false; w.classList.add('cta'); } }
  }
}
const trail = []; // screens visited, for Back
function go(n, { restore = null, quiet = false, back = false } = {}) {
  clearInterval(walkTimer);
  coachStop();
  if (tour) endTour(false, false);
  guided = null;
  closeModal(false);
  if (typeof speechSynthesis !== 'undefined') speechSynthesis.cancel();
  $('#audio').setAttribute('aria-pressed', 'false');
  const keepTries = [4, 5].includes(page) && [4, 5].includes(n);
  if (!back && page && n !== page && trail[trail.length - 1] !== page) trail.push(page);
  page = n;
  if (restore && qv[n] != null) qv[n] = restore.qv;
  if (!keepTries) attempts = 3;
  pointB = null; selected = null; moved = false;
  if (location.hash !== '#' + n) history.replaceState(null, '', '#' + n);
  paint(() => PAGES[n](), quiet);
  if (restore) restoreState(restore);
  coachStart({ quiet });
  armIdle();
  $('#help').hidden = !TOURS[n];
  $('#back').hidden = n === 1;
  $('.header').classList.toggle('has-back', n !== 1);
  wsForPage(n);
  if (!quiet) announce(`Screen ${n}`);
}
// builds a screen into the scene; quiet = no entrance (coming back to work already in progress)
function paint(build, quiet = false) {
  stageCount = {};
  scene.classList.remove('enter');
  scene.innerHTML = '';
  build();
  if (!quiet) { void scene.offsetWidth; scene.classList.add('enter'); }
  $$('input[type=text]', scene).forEach((el) => el.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') $$('button', scene).find((b) => /^Check/.test(b.textContent.trim()))?.click();
  }));
  scrollTo(0, 0);
}

// =====================================================================================
// The fourteen screens. Groups are added in their portrait (stacked) order.
// =====================================================================================
function renderWelcome() {
  const top = group('title'), buddy = group('buddy'), ctl = group('controls');
  fitila('wave', undefined, { into: buddy, stage: 1 });
  burst(476, 392, '#FE6011', [-62, -22], 18, 18, 6);
  burst(1318, 318, '#FE6011', [-68, -32], 30, 14, 9);
  deco(`<g stroke-width="4" stroke-dasharray="11 9" stroke-linecap="round">
      <line x1="537" y1="268" x2="650" y2="196" stroke="#2D9BE8"/><line x1="1467" y1="318" x2="1580" y2="247" stroke="#F26A22"/><line x1="1420" y1="572" x2="1508" y2="508" stroke="#8D5BE0"/></g>
    <g class="sparkle"><circle cx="537" cy="268" r="10" fill="#2D9BE8"/></g><g class="sparkle"><circle cx="650" cy="196" r="10" fill="#2D9BE8"/></g>
    <g class="sparkle"><circle cx="1467" cy="318" r="10" fill="#F26A22"/></g><g class="sparkle"><circle cx="1580" cy="247" r="10" fill="#F26A22"/></g>
    <g stroke="#7A4BD8" stroke-width="3.5" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M1420 612V464M1409 476l11-12 11 12M1384 574h166M1538 563l12 11-12 11"/></g>
    <g class="sparkle"><circle cx="1510" cy="506" r="10" fill="#7A4BD8"/></g>`);
  const letters = [...'Gradient Lab'].map((ch, i) => (ch === ' ' ? ' ' : `<span class="ch" style="--i:${i}">${ch}</span>`)).join('');
  text(`<span class="title-letters">${letters}</span>`, [618, 262, 790, null], 158, { into: top, style: 'color:#0B2C4C;letter-spacing:-1px;-webkit-text-stroke:.05em #0B2C4C;text-shadow:0 0 8px #fff,0 0 14px #fff;white-space:nowrap', anim: '' });
  text('Let’s make some lines!', [750, 438, 620, null], 66, { into: top, style: 'color:#0B2C4C;white-space:nowrap', stage: 2 });
  button(`Let’s play ${ICON.arrowR}`, [751, 557, 493, 92], () => go(firstScreen()), { cls: 'cta', into: ctl, pw: 560 }).style.cssText += 'font-size:calc(var(--u)*38);--iw:44';
  button('How to play', [842, 692, 313, 70], () => { go(firstScreen()); setTimeout(() => { if (!modalOpen && !tour) startTour(); }, reduced() ? 200 : 1700); }, { cls: 'outline', into: ctl, pw: 400 });
}

function renderLineLab() {
  m = 0; c = 0;
  const board = group('board'), buddy = group('buddy'), ctl = group('controls');
  equation([612, 89, 240, 64], '', board);
  graph(2, { m, c, ends: true }, board);
  fitila('point', undefined, { into: buddy });
  bubble(['Make the line climb', 'from left to right to get', 'a positive slope.'], [1166, 168, 424, 172], 38, [1338, 336, 1350, 380], { into: buddy });
  const walk = button(`${ICON.walk} Walk the line`, [1302, 785, 308, 80], () => {
    if (tour) return;
    if (m <= 0) { modal({ title: 'Make it climb!', body: `Move m above zero so the line rises from left to right.${wsNudge()}`, pose: 'point', action: 'Try again' }); return; }
    walkLine();
  }, { into: ctl, anim: '', pw: 560 });
  walk.style.cssText += '--iw:46';
  walk.hidden = true; // progressive reveal: walking appears once the learner has moved a slider
  walk.id = 'walk';
  const reveal = () => { walk.hidden = false; walk.dataset.in = 'pop'; walk.style.setProperty('--d', '0ms'); walk.classList.add('cta'); };
  slider('m', [95, 767, 519, 115], { min: -4, max: 4, step: 0.25, into: ctl, onFirst: reveal });
  slider('c', [707, 767, 519, 115], { min: -6, max: 6, step: 0.25, into: ctl, onFirst: reveal });
  ctl.append(walk);
}
function walkLine() {
  const host = $('#graph'), M = mapping(host._g), svg = host.querySelector('svg');
  const dotEl = document.createElementNS(SVGNS, 'circle');
  Object.entries({ r: 13, fill: '#19A6E6', stroke: '#fff', 'stroke-width': 4, class: 'walk-dot' }).forEach(([k, v]) => dotEl.setAttribute(k, v));
  svg.append(dotEl);
  let i = 0;
  clearInterval(walkTimer);
  walkTimer = setInterval(() => {
    const x = -4 + (8 * i) / 45, y = m * x + c;
    dotEl.setAttribute('cx', M.X(x)); dotEl.setAttribute('cy', M.Y(y));
    dotEl.setAttribute('visibility', y < -4.6 || y > 4.6 ? 'hidden' : 'visible');
    if (++i > 45) { clearInterval(walkTimer); go(3); }
  }, reduced() ? 1 : 30);
}

function renderPlace() {
  const board = group('board'), buddy = group('buddy'), row = group('row'), ctl = group('controls');
  pointB = [-3, 3]; // B starts in the wrong place: the learner finds (2, 2) on the grid
  graph(3, { place: true }, board);
  fitila('side', undefined, { into: buddy });
  bubble(['Move B', 'to (2, 2)'], [1037, 296, 276, 134], 44, [1286, 392, 1325, 428], { into: buddy });
  const bulb = place(make('button', 'round', ICON.bulb), [1516, 404, 80, 80], { into: buddy, stage: 2, anim: 'pop', delay: STAGE_AT[2] + 700 });
  bulb.style.cssText += 'background:#FFE36A;border-color:#F2C935;color:#B58600;';
  bulb.setAttribute('aria-label', 'Show a hint for placing point B');
  bulb.addEventListener('click', () => modal({ title: 'Move B to (2, 2)', body: HINTS[3], pose: 'think', action: 'Got it' }));
  place(make('div', 'chip-point a', '<span class="dot"></span>A (−2, −2)'), [1020, 570, 223, 71], { into: row, anim: 'pop', pw: 300 });
  place(make('div', 'chip-point b', '<span class="dot"></span><span id="b-label">B (−3, 3)</span>'), [1020, 662, 223, 71], { into: row, anim: 'pop', pw: 300 });
  const reset = place(make('button', 'round', ICON.reset), [279, 853, 68, 68], { into: ctl, stage: 4, anim: 'pop' });
  reset.setAttribute('aria-label', 'Reset point B');
  reset.addEventListener('click', () => go(3));
  const cont = button('Check', [1020, 790, 223, 70], confirmB, { into: ctl, stage: 4, pw: 400 });
  cont.id = 'confirm-b'; cont.style.fontSize = 'calc(var(--u) * 27)';
}

function renderGradient(hint) {
  const board = group('board'), under = group('row'), buddy = group('buddy'), ctl = group('controls');
  graph(hint ? 5 : 4, { m: 1, c: 0, points: true, hint }, board);
  const checkIt = () => check(['m-answer'], [1], 6, '4 ÷ 4 = 1');
  if (hint) {
    fitila('hint', undefined, { into: buddy });
    deco(`<g stroke="#F5C400" stroke-width="6" stroke-linecap="round"><line data-burst x1="1542" y1="356" x2="1544" y2="344"/><line data-burst x1="1512" y1="364" x2="1506" y2="354"/><line data-burst x1="1574" y1="372" x2="1584" y2="364"/><line data-burst x1="1584" y1="402" x2="1596" y2="402"/></g>
      <g class="sparkle"><path d="M1534 380a26 26 0 0 1 16 47c-3 3-4 6-4 9v6h-22v-6c0-3-2-6-4-9a26 26 0 0 1 14-47z" fill="#FFE04D" stroke="#F2BE16" stroke-width="3"/><rect x="1523" y="444" width="24" height="14" rx="4" fill="#C9C9C9"/></g>`, buddy, 2);
    const b = bubble(['What’s the gradient?'], [1060, 182, 428, 214], 48, [1300, 386, 1336, 446],
      { into: buddy, extra: `<div style="margin-top:calc(var(--u)*14)"><span class="hintpill"><span style="color:#E2B007;display:grid">${ICON.bulb}</span>Up ÷ across</span></div><button class="hintlink" id="hide-hint" type="button">Hide hint</button>` });
    b.addEventListener('click', (e) => { if (e.target.closest('#hide-hint')) go(4); }); // the bubble is re-said, so delegate
    place(make('div', 'measure across', `<span>Across</span><b>4</b><span style="color:#1C8FD8;display:grid">${ICON.arrowR}</span>`), [273, 777, 283, 93], { into: under, anim: 'rise', pw: 300 });
    place(make('div', 'measure up', `<span>Up</span><b>4</b><span style="color:#129A63;display:grid">${ICON.arrowUp}</span>`), [575, 777, 250, 93], { into: under, anim: 'rise', pw: 280 });
    field('m-answer', 'm =', [846, 779, 213, 90], 'tight', '', { into: ctl, pw: 400 });
    button('Check', [1092, 786, 234, 72], checkIt, { into: ctl, pw: 400 });
  } else {
    fitila('wing', undefined, { into: buddy });
    burst(1112, 225, '#F5C400', [200, 240, 285], 26, 14, 7, buddy);
    const b = bubble(['What’s the', 'gradient?'], [1077, 230, 256, 142], 46, [1318, 330, 1352, 352], { into: buddy });
    b.style.cursor = 'pointer';
    b.setAttribute('role', 'button'); b.tabIndex = 0;
    b.setAttribute('aria-label', 'What’s the gradient? Show a hint');
    b.addEventListener('click', () => go(5));
    b.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(5); } });
    field('m-answer', 'm =', [1064, 592, 311, 93], '', '', { into: ctl, pw: 480 });
    button('Check', [1064, 702, 312, 62], checkIt, { into: ctl, pw: 480 });
    place(make('div', 'pill blue', `<span style="color:#1C9BE6;display:grid">${ICON.arrowR}</span>Across <b class="ask">?</b>`), [341, 794, 262, 78], { into: under, stage: 4, anim: 'pop', pw: 290 });
    place(make('div', 'pill green', `<span style="color:#17A56C;display:grid">${ICON.arrowUp}</span>Up <b class="ask">?</b>`), [620, 794, 261, 78], { into: under, stage: 4, anim: 'pop', pw: 290 });
  }
}

function renderMC(feedback) {
  const board = group('board'), buddy = group('buddy'), row = group('row'), ctl = group('controls');
  const Qn = feedback ? Q[6][0] : q(6);
  graph(feedback ? 13 : 6, { m: Qn.m, c: Qn.c }, board);
  const checkIt = () => check(['m-answer', 'c-answer'], [Qn.m, Qn.c], 7, `m = ${fmt(Qn.m)}, c = ${fmt(Qn.c)}`, WORKING[6](Qn));
  if (!feedback) {
    fitila('wingwave', undefined, { into: buddy });
    burst(1378, 318, '#F5C400', [235, 270], 28, 12, 7, buddy);
    bubble(['Find m and c.'], [935, 240, 367, 143], 54, [1288, 340, 1345, 366], { into: buddy });
    field('m-answer', 'm', [898, 459, 184, 86], 'tag', '', { into: row, pw: 260 });
    field('c-answer', 'c', [1101, 459, 184, 86], 'tag purple', '', { into: row, pw: 260 });
    button('Check', [905, 590, 371, 66], checkIt, { into: ctl, pw: 540 });
    tries([990, 690, 200, null], { into: ctl });
  } else {
    text('Find m and c.', [1183, 285, 400, null], 54, { into: buddy, stage: 2 });
    field('m-answer', 'm', [1145, 452, 193, 86], 'tag', '1', { into: row, pw: 260 });
    field('c-answer', 'c', [1361, 452, 196, 86], 'tag purple', '0', { into: row, pw: 260 });
    button('Check', [1163, 582, 389, 66], checkIt, { into: ctl, pw: 540 });
    attempts = 2;
    modal({ title: 'Almost!', body: 'Check where the line crosses the y-axis.', pose: 'almost', action: 'Try again', remaining: 2 });
  }
}

function renderCoordinates() {
  const buddy = group('buddy'), cards = group('row'), fields = group('row'), ctl = group('controls');
  fitila('think', undefined, { into: buddy });
  bubble(['Find the line’s equation.'], [1146, 208, 363, 92], 37, [1238, 290, 1262, 345], { into: buddy });
  deco('<path d="M628 383Q720 330 808 378" stroke="#CBD5DF" stroke-width="7" stroke-linecap="round" fill="none" stroke-dasharray="12 16"/>', cards);
  burst(372, 262, '#3EA9EC', [200, 245], 28, 12, 7, cards);
  burst(1046, 262, '#7A55D6', [-20, -65], 28, 12, 7, cards);
  const Qc = q(7), L = lineThrough(Qc.A, Qc.B), P = (p) => `(${p.map(fmt).join(', ')})`;
  place(make('div', 'coord', `<span class="badge">A</span>${P(Qc.A)}`), [360, 274, 264, 214], { into: cards, stage: 1, anim: 'rise', pw: 380 });
  place(make('div', 'coord purple', `<span class="badge">B</span>${P(Qc.B)}`), [811, 270, 254, 216], { into: cards, stage: 1, anim: 'rise', pw: 380 });
  field('m-answer', 'm', [372, 569, 309, 112], 'cream', '', { into: fields, pw: 380 });
  field('c-answer', 'c', [765, 569, 310, 112], 'cream', '', { into: fields, pw: 380 });
  button('Check Answer', [518, 720, 403, 76], () => check(['m-answer', 'c-answer'], [L.m, L.c], 8, `m = ${fmt(L.m)}, c = ${fmt(L.c)}`, WORKING[7](Qc)), { into: ctl, pw: 560 });
  tries([945, 748, 120, null], { into: ctl, dots: false, cls: 'inline' });
}

function renderMissing() {
  const Qm = q(8), y = Qm.m * Qm.x + Qm.c;
  m = Qm.m; c = Qm.c;
  const board = group('board'), buddy = group('buddy'), ctl = group('controls');
  equation([417, 115, 239, 70], 'peach', board);
  graph(8, { m, c }, board);
  fitila('puzzled', undefined, { into: buddy });
  text('?', [1520, 322, 70, null], 96, { into: buddy, stage: 2, anim: 'pop', style: 'color:#F5A21B;font-weight:700;text-shadow:0 3px 0 #E07B12;transform:rotate(12deg)' });
  bubble(['Find the missing number.'], [939, 195, 528, 122], 52, [1338, 308, 1378, 372], { into: buddy });
  place(make('div', 'qcard', `<span>(${fmt(Qm.x)}, <span class="q">?</span>)</span>`), [998, 404, 260, 144], { into: ctl, anim: 'pop', pw: 380 });
  field('y-answer', 'y =', [946, 584, 363, 97], 'soft', '', { into: ctl, pw: 480 });
  button('Check', [946, 705, 364, 66], () => check(['y-answer'], [y], 11, `${substitution(Qm.m, Qm.c, Qm.x)} = ${fmt(y)}`, WORKING[8](Qm)), { into: ctl, pw: 480 });
  tries([1046, 790, 164, null], { into: ctl, dots: false });
}

function renderIntercept() {
  const board = group('board'), buddy = group('buddy'), choices = group('choices'), row = group('row'), ctl = group('controls');
  const Qi = q(9);
  graph(9, { m: Qi.m, c: Qi.c, pts: Qi.pts }, board);
  const t = POSE.think;
  fitila('think', [1297, 355, Math.round((350 * t[2]) / t[3]), 350], { into: buddy });
  bubble(['What is the y-intercept', 'of this line?'], [1203, 195, 344, 135], 35, [1330, 320, 1352, 358], { into: buddy });
  const values = Qi.choices;
  values.forEach((v, i) => {
    const b = place(make('button', 'choice', `<span class="letter">${'ABCD'[i]}</span>${fmt(v)}<span class="tick">${ICON.check.replace('#fff', '#C94A10')}</span>`),
      [[148, 503, 853, 1204][i], 733, [320, 316, 315, 320][i], 72], { into: choices, anim: 'rise' });
    b.type = 'button';
    b.setAttribute('aria-label', `Answer ${'ABCD'[i]}: ${fmt(v)}`);
    b.addEventListener('click', () => { selected = i; $$('.choice', scene).forEach((x) => x.classList.toggle('selected', x === b)); });
  });
  const hint = button(`${ICON.bulb}Hint`, [83, 834, 149, 64], () => modal({ title: 'Hint', body: 'The y-intercept is the y-value where x = 0.', pose: 'think', action: 'Try again' }), { cls: 'yellow', into: row, stage: 4, pw: 220 });
  hint.style.cssText += 'font-size:calc(var(--u)*28);gap:calc(var(--u)*10);--iw:30';
  const ask = button(`${ICON.pencil}Ask Fitila`, [261, 834, 204, 64], () => modal({ title: 'Find the crossing', body: 'Follow the vertical y-axis up to the orange line.', pose: 'think', action: 'Try again' }), { cls: 'sky', into: row, stage: 4, pw: 280 });
  ask.style.cssText += 'font-size:calc(var(--u)*28);gap:calc(var(--u)*10);--iw:34';
  button('Check Answer', [1327, 834, 270, 62], () => {
    if (tour) return;
    if (selected === null) { announce('Choose an answer first.'); return; }
    if (values[selected] === Qi.c) success(`The y-intercept is ${fmt(Qi.c)}.`, 10);
    else { failure('Check where the line crosses y.', [], WORKING[9](Qi)); selected = null; $$('.choice', scene).forEach((x) => x.classList.remove('selected')); }
  }, { into: ctl, stage: 4, pw: 560 }).style.fontSize = 'calc(var(--u) * 24)';
}

function renderComplete() {
  const buddy = group('buddy'), top = group('title'), ctl = group('controls');
  fitila('celebrate', undefined, { into: buddy, stage: 1 });
  deco(`<g class="sparkle"><path d="M951 140l7 18 18 7-18 7-7 18-7-18-18-7 18-7z" fill="#F57A2A"/></g>
    <g class="sparkle"><path d="M1018 418l6 16 16 6-16 6-6 16-6-16-16-6 16-6z" fill="#FFD233"/></g>
    <g class="sparkle" fill="#3EA9EC"><circle cx="617" cy="367" r="10"/>${[0, 45, 90, 135, 180, 225, 270, 315].map((a) => `<rect x="614" y="343" width="6" height="16" rx="3" transform="rotate(${a} 617 367)"/>`).join('')}</g>
    <g stroke="#3EA9EC" stroke-width="5" stroke-linecap="round"><path data-burst d="M596 240l20 14M612 226l10 22"/><path data-burst d="M1062 312l26-14M1070 296l14-10"/></g>`, buddy);
  const letters = [...'Brilliant work!'].map((ch, i) => (ch === ' ' ? ' ' : `<span class="ch" style="--i:${i}">${ch}</span>`)).join('');
  const t = text(`<span class="title-letters">${letters}</span>`, [500, 580, 675, null], 100, { into: top, anim: '', style: 'text-align:center;color:#0B2C4C;white-space:nowrap' });
  t.style.setProperty('--d', `${STAGE_AT[2]}ms`);
  place(make('div', 'done-line', `<i>${ICON.check}</i>Activity complete`), [600, 690, 480, 46], { into: top, anim: 'pop', pw: 480 });
  button('Back to lesson', [669, 776, 336, 66], () => { emit('complete', { completed: true }); go(1); }, { into: ctl, pw: 480 }).style.fontSize = 'calc(var(--u) * 24)';
  setTimeout(() => { if (page === 10) confetti(innerWidth / 2, innerHeight * 0.4); }, 700);
}

function renderTargets() {
  const Qt = q(11);
  TARGETS = Qt.targets;
  [m, c] = Qt.start; // a line that misses both targets
  const board = group('board'), buddy = group('buddy'), ctl = group('controls');
  equation([559, 102, 251, 52], 'peach orange-text', board);
  graph(11, { m, c, targets: true }, board);
  fitila('raise', undefined, { into: buddy });
  bubble(['Hit both targets!'], [1245, 207, 323, 111], 44, [1296, 308, 1302, 360], { into: buddy });
  slider('m', [325, 741, 640, 56], { min: -4, max: 4, step: 0.25, compact: true, filled: true, into: ctl });
  slider('c', [325, 838, 640, 56], { min: -8, max: 8, step: 0.25, compact: true, filled: true, into: ctl });
  const h = place(make('div', 'target-count'), [1052, 727, 293, 79], { into: ctl, stage: 4, anim: 'pop', pw: 400 });
  h.id = 'hits';
  h.setAttribute('role', 'status');
  updateHits();
  button('Check', [1022, 822, 350, 66], () => {
    if (tour) return;
    if (hitCount() === 2) success('Both targets hit!', 9);
    else failure('Move m and c until the line passes through both targets.', [], WORKING[11](Qt));
  }, { into: ctl, pw: 540 });
}

function renderSuccess(single) {
  const board = group('board'), buddy = group('buddy');
  graph(single ? 14 : 12, { m: 1, c: 0, success: true }, board);
  if (!single) {
    fitila('thumbs', undefined, { into: buddy });
    bubble(['Great work!'], [1152, 233, 262, 107], 40, [1290, 330, 1312, 378], { into: buddy });
  }
  modal({ title: 'You got it!', body: '4 ÷ 4 = 1', pose: 'success', action: 'Continue', onAction: () => go(6), success: true });
}

const PAGES = { 1: renderWelcome, 2: renderLineLab, 3: renderPlace, 4: () => renderGradient(false), 5: () => renderGradient(true),
  6: () => renderMC(false), 7: renderCoordinates, 8: renderMissing, 9: renderIntercept, 10: renderComplete, 11: renderTargets,
  12: () => renderSuccess(false), 13: () => renderMC(true), 14: () => renderSuccess(true) };

// =====================================================================================
// Guided practice ("Try together"): the same skill on a simpler example, one small action at a
// time. The challenge — answers typed, tries left, sliders — is saved and comes back untouched.
// =====================================================================================
GRAPHS.guide = { ...GRAPHS[6] };
let guided = null;
const sleep = (ms) => new Promise((r) => setTimeout(r, reduced() ? Math.min(ms, 250) : ms));
const same = (p, r) => p[0] === r[0] && p[1] === r[1];
const P = (p) => `(${p.map(fmt).join(', ')})`;
// three numbers to pick from, the right one not always in the same place
const around = (v) => { const o = [v - 1, v, v + 1], k = Math.abs(Math.round(v * 2)) % 3; return [...o.slice(k), ...o.slice(0, k)]; };
// worked examples per skill; one is picked that differs from the learner's live question
const EXAMPLES = {
  equation: [{ A: [-1, 1], B: [1, 3] }, { A: [0, -2], B: [2, 2] }, { A: [0, 3], B: [2, 1] }],
  substitute: [{ m: 2, c: 1, x: 1 }, { m: 1, c: 2, x: 2 }, { m: 3, c: -1, x: 1 }],
  intercept: [{ m: 1, c: 2 }, { m: 2, c: -1 }, { m: -1, c: 1 }],
  targets: [{ t: [[0, 1], [1, 3]] }, { t: [[0, -1], [2, 3]] }, { t: [[0, 2], [2, 0]] }],
};
function pickExample(skill) {
  const live = q(), key = {
    equation: (e) => lineThrough(e.A, e.B).m, substitute: (e) => `${e.m},${e.c}`, intercept: (e) => e.c, targets: (e) => lineThrough(...e.t).m,
  }[skill];
  const liveKey = { equation: page === 7 ? lineThrough(live.A ?? [0, 0], live.B ?? [1, 1]).m : live.m, substitute: `${live.m},${live.c}`, intercept: live.c,
    targets: live.targets ? lineThrough(...live.targets).m : null }[skill];
  const list = EXAMPLES[skill];
  return list.find((e, i) => i >= qv[page] % list.length && key(e) !== liveKey) || list.find((e) => key(e) !== liveKey) || list[0];
}
function startGuided() {
  const skill = SUPPORT[page];
  if (!skill || guided || tour) return;
  emit('support', { skill, choice: 'try-together', attemptsLeft: attempts });
  const g = { skill, from: snapshot(), done: false };
  coachStop();
  closeModal(false);
  guided = g;
  let ui;
  paint(() => { ui = guidedStage(); });
  $('#help').hidden = true;
  GUIDED[skill](g, ui, pickExample(skill));
}
function guidedStage() {
  const board = group('board'), buddy = group('buddy'), row = group('row'), ctl = group('controls');
  graph('guide', {}, board);
  fitila('point', undefined, { into: buddy });
  const b = bubble(['Let’s build it together!'], [905, 196, 560, 150], 38, [1300, 346, 1336, 392], { into: buddy });
  b.id = 'guide-bubble';
  b.classList.add('guide');
  b.addEventListener('click', (e) => { const a = e.target.closest('[data-act]')?.dataset.act; if (a) endGuided(a); });
  const back = button('Back to my challenge', [905, 806, 340, 64], () => endGuided('back'), { cls: 'outline', into: ctl, stage: 4, pw: 480 });
  back.id = 'guide-back';
  back.style.fontSize = 'calc(var(--u) * 24)';
  return { row, ctl };
}
const alive = (g) => guided === g;
function gsay(text) {
  const b = $('#guide-bubble');
  if (!b) return;
  b.querySelector('.bubble-text').innerHTML = words(text);
  b.classList.remove('again'); void b.offsetWidth; b.classList.add('again');
  announce(text);
}
function gopts(o) { const host = $('#graph'); host._opts = { ...host._opts, ...o }; drawGraph(host._opts); }
// wait for a tap (or arrow keys + Enter) on a grid point the step asks for
function tapGraph(accept, nudge) {
  const host = $('#graph');
  host.tabIndex = 0;
  host.setAttribute('role', 'application');
  host.setAttribute('aria-label', 'Grid. Tap a point, or move with the arrow keys and press Enter.');
  host.classList.add('tapping');
  return new Promise((res) => {
    let misses = 0;
    host._tap = (p) => {
      if (accept(p)) { host._tap = null; host._cursor = null; host.classList.remove('tapping'); res(p); return; }
      misses += 1; bump(host);
      if (nudge) gsay(nudge(p, misses));
    };
  });
}
// three number buttons; only the right one moves on (a wrong pick costs nothing)
function choose(row, options, right, nudge) {
  row.innerHTML = '';
  return new Promise((res) => {
    options.forEach((v, i) => {
      const b = place(make('button', 'choice pick', fmt(v)), [905 + i * 104, 432, 92, 84], { into: row, anim: 'pop', delay: i * 70 });
      b.type = 'button';
      b.setAttribute('aria-label', fmt(v));
      b.addEventListener('click', () => {
        if (Math.abs(v - right) < 1e-9) { b.classList.add('selected'); setTimeout(() => { row.innerHTML = ''; res(v); }, reduced() ? 0 : 520); }
        else { b.classList.remove('wrong'); void b.offsetWidth; b.classList.add('wrong'); if (nudge) gsay(nudge); }
      });
    });
    row.querySelector('button')?.focus({ preventScroll: true });
  });
}
const label = (X, Y, p, text, col) => `<text x="${X(p[0]) + 20}" y="${Y(p[1]) - 22}" style="fill:${col};font-size:30px;font-weight:700">${text}</text>`;
const arrowLine = (X, Y, a, b, col, n) => `<line class="dash-in" x1="${X(a[0])}" y1="${Y(a[1])}" x2="${X(b[0])}" y2="${Y(b[1])}" stroke="${col}" stroke-width="4" stroke-dasharray="11 9" stroke-linecap="round"/>`
  + (n != null ? `<g class="pt-now"><rect x="${(X(a[0]) + X(b[0])) / 2 - 22}" y="${(Y(a[1]) + Y(b[1])) / 2 - 20}" width="44" height="40" rx="9" fill="#fff" stroke="${col}" stroke-width="2"/><text x="${(X(a[0]) + X(b[0])) / 2}" y="${(Y(a[1]) + Y(b[1])) / 2 + 9}" text-anchor="middle" style="fill:${col};font-size:24px;font-weight:700">${fmt(n)}</text></g>` : '');

const GUIDED = {
  // place two points, watch the line appear, read across and up, then where it crosses the y-axis
  async equation(g, ui, ex) {
    const { A, B } = ex, L = lineThrough(A, B), dx = B[0] - A[0], dy = B[1] - A[1], corner = [B[0], A[1]];
    const marks = [];
    const draw = (more = () => '') => gopts({ draw: ({ X, Y, dot }) => marks.map(([p, col, t]) => dot(p[0], p[1], col) + label(X, Y, p, t, col)).join('') + more(X, Y) });
    gsay(`Tap the grid to put A at ${P(A)}.`);
    await tapGraph((p) => same(p, A), (p, n) => (n > 1 ? `Start at the middle (0, 0) and count to ${P(A)}.` : `That’s ${P(p)}. Find ${P(A)}.`));
    if (!alive(g)) return;
    marks.push([A, '#1EA1E6', 'A']); draw();
    gsay(`Now put B at ${P(B)}.`);
    await tapGraph((p) => same(p, B), (p) => `That’s ${P(p)}. Find ${P(B)}.`);
    if (!alive(g)) return;
    marks.push([B, '#7A4BD8', 'B']);
    gopts({ m: L.m, c: L.c, lineIn: true }); draw();
    gsay('Look! A line through both points.');
    await sleep(1800); if (!alive(g)) return;
    gopts({ lineIn: false });
    draw((X, Y) => arrowLine(X, Y, A, corner, '#1C8FD8'));
    gsay('How many steps across from A to B?');
    await choose(ui.row, around(dx), dx, 'Count the squares across.'); if (!alive(g)) return;
    draw((X, Y) => arrowLine(X, Y, A, corner, '#1C8FD8', dx) + arrowLine(X, Y, corner, B, '#12A066'));
    gsay(dy >= 0 ? 'How many steps up to B?' : 'How many steps down to B?');
    await choose(ui.row, around(Math.abs(dy)), Math.abs(dy), 'Count the squares.'); if (!alive(g)) return;
    draw((X, Y) => arrowLine(X, Y, A, corner, '#1C8FD8', dx) + arrowLine(X, Y, corner, B, '#12A066', Math.abs(dy)));
    gsay(dy >= 0 ? 'm = up ÷ across. So m is…' : 'Going down makes m negative. m is…');
    await choose(ui.row, around(L.m), L.m, `${fmt(dy)} ÷ ${fmt(dx)} = ?`); if (!alive(g)) return;
    gsay('Tap where the line crosses the y-axis.');
    await tapGraph((p) => same(p, [0, L.c]), () => 'Find the up-and-down axis, then follow it to the line.'); if (!alive(g)) return;
    marks.push([[0, L.c], '#12A066', 'c']); draw();
    finishGuided(g, `So c = ${fmt(L.c)}. You built y = ${exprHTML(L.m, L.c)}!`);
  },
  // find x on the x-axis, go up to the line, read y
  async substitute(g, ui, ex) {
    const y = ex.m * ex.x + ex.c;
    gopts({ m: ex.m, c: ex.c, lineIn: true });
    gsay(`Here’s the line y = ${exprHTML(ex.m, ex.c)}.`);
    await sleep(1700); if (!alive(g)) return;
    gopts({ lineIn: false });
    gsay(`Tap x = ${fmt(ex.x)} on the x-axis.`);
    await tapGraph((p) => same(p, [ex.x, 0]), () => `The x-axis is the flat line. Find ${fmt(ex.x)} on it.`); if (!alive(g)) return;
    gopts({ draw: ({ X, Y, dot }) => dot(ex.x, 0, '#1EA1E6') + arrowLine(X, Y, [ex.x, 0], [ex.x, y], '#12A066') + `<g class="pt-now">${dot(ex.x, y, '#7A4BD8')}</g>` });
    gsay('Go straight up to the line…');
    await sleep(1600); if (!alive(g)) return;
    gsay('What is y there?');
    await choose(ui.row, around(y), y, 'Count up from the x-axis.'); if (!alive(g)) return;
    finishGuided(g, `Yes! y = ${substitution(ex.m, ex.c, ex.x)} = ${fmt(y)}.`);
  },
  // find the y-axis, then where the line crosses it
  async intercept(g, ui, ex) {
    gopts({ m: ex.m, c: ex.c, lineIn: true });
    gsay('Here’s a line.');
    await sleep(1300); if (!alive(g)) return;
    gopts({ lineIn: false, draw: ({ X, Y }) => `<line class="y-glow" x1="${X(0)}" y1="${Y(4.4)}" x2="${X(0)}" y2="${Y(-4.4)}" stroke="#3EA9EC" stroke-width="16" stroke-linecap="round" opacity=".35"/>` });
    gsay('This up-and-down line is the y-axis.');
    await sleep(1800); if (!alive(g)) return;
    gsay('Tap where the orange line crosses it.');
    await tapGraph((p) => same(p, [0, ex.c]), () => 'Stay on the y-axis and find the orange line.'); if (!alive(g)) return;
    gopts({ draw: ({ X, Y, dot }) => dot(0, ex.c, '#12A066') + label(X, Y, [0, ex.c], '?', '#12A066') });
    gsay('What number is that?');
    await choose(ui.row, around(ex.c), ex.c, 'Read the number beside it on the y-axis.'); if (!alive(g)) return;
    finishGuided(g, `That’s the y-intercept: ${fmt(ex.c)}!`);
  },
  // lift the line onto the target on the y-axis with c, then tilt it with m to the other
  async targets(g, ui, ex) {
    const [t0, t1] = ex.t, L = lineThrough(t0, t1);
    TARGETS = ex.t; m = 0; c = 0;
    gopts({ m, c, targets: true });
    const ms = slider('m', [905, 560, 300, 70], { min: -4, max: 4, step: 0.25, compact: true, filled: true, into: ui.ctl });
    const cs = slider('c', [905, 680, 300, 70], { min: -4, max: 4, step: 0.25, compact: true, filled: true, into: ui.ctl });
    const until = (input, ok) => new Promise((res) => { const h = () => { if (ok()) { input.removeEventListener('input', h); res(); } }; input.addEventListener('input', h); });
    gsay('Slide c to lift the line onto the first target.');
    cs.focus({ preventScroll: true });
    await until(cs, () => Math.abs(c - t0[1]) < 1e-9); if (!alive(g)) return;
    gsay('Now tilt it with m until it reaches the other one.');
    ms.focus({ preventScroll: true });
    await until(ms, () => hitCount() === 2); if (!alive(g)) return;
    finishGuided(g, `Both hit! m = ${fmt(L.m)} and c = ${fmt(L.c)}.`);
  },
};
function finishGuided(g, text) {
  if (!alive(g)) return;
  g.done = true;
  emit('support', { skill: g.skill, choice: 'try-together', outcome: 'completed' });
  gsay(text);
  const f = $('.g-buddy .fitila', scene);
  f?.classList.add('hey');
  confetti(innerWidth / 2, innerHeight * 0.4);
  setTimeout(() => {
    if (!alive(g)) return;
    $('#guide-back').hidden = true;
    const b = $('#guide-bubble');
    b.querySelector('.bubble-text').innerHTML = `${words('Great building! Ready?')}<span class="offer-acts"><button type="button" class="btn small" data-act="back">Back to my challenge</button><button type="button" class="btn small outline" data-act="similar">Try a similar one</button></span>`;
    b.classList.add('offer');
    b.classList.remove('again'); void b.offsetWidth; b.classList.add('again');
    b.querySelector('[data-act="back"]').focus({ preventScroll: true });
    announce('Great building! Back to my challenge, or try a similar one.');
  }, reduced() ? 300 : 2200);
}
function endGuided(how) {
  const g = guided;
  if (!g) return;
  emit('support', { skill: g.skill, choice: 'try-together', outcome: g.done ? 'completed' : 'left-early', next: how === 'similar' ? 'similar-question' : 'original-question' });
  guided = null;
  if (how === 'similar') { qv[g.from.page] += 1; go(g.from.page); }
  else go(g.from.page, { restore: g.from, quiet: true });
}

// =====================================================================================
// How to play: a walkthrough inside the live activity. A soft spotlight and a hand show one thing
// at a time, Fitila says what it does, and the learner tries it. Nothing here counts as an answer,
// and the screen goes back exactly as it was when the walkthrough closes.
// =====================================================================================
let tour = null;
const PRACTICE = { m: 3, c: -2 }; // the walkthrough's practice line, y = 3x − 2: never a live answer
const fieldOf = (id) => () => $('#' + id)?.closest('.field');
const buttonNamed = (re) => () => $$('button', scene).find((b) => re.test(b.textContent.trim()));
const stepFitila = { el: () => $('.g-buddy .fitila', scene), say: 'Stuck? Tap me any time for a hint.', gesture: 'tap' };
const stepTries = { el: () => $('#tries'), say: 'You get 3 tries. Empty boxes don’t use one.' };
const slide = (key, say) => ({ el: () => $(`.slider.${key}`, scene), say, gesture: 'drag', target: () => $(`.slider.${key} .thumb`, scene),
  wait: (done) => { const i = $(`.slider.${key} input`, scene), h = () => done(); i.addEventListener('input', h); return () => i.removeEventListener('input', h); } });
const typeIn = (id, v, say) => ({ el: fieldOf(id), say, gesture: 'tap', target: () => $('#' + id),
  wait: (done) => { const i = $('#' + id), h = () => { if (numeric(id) === v) done(); }; i.addEventListener('input', h); setTimeout(() => i.focus({ preventScroll: true }), 50); return () => i.removeEventListener('input', h); } });
const practiceLine = () => { const host = $('#graph'); if (host) { host._opts = { ...host._opts, m: PRACTICE.m, c: PRACTICE.c, draw: ({ X, Y }) => `<text x="${X(0) + 16}" y="${Y(3.6)}" style="fill:#7A4BD8;font-size:24px;font-weight:700">practice</text>` }; drawGraph(host._opts); } };
// screen 3: the learner places practice A, then B; only then does the line appear through both
function practiceTap(which) {
  return (done) => {
    const host = $('#graph');
    host._tap = (p) => {
      if (which === 'B' && same(p, tour.pA)) return;
      tour[`p${which}`] = p; host._tap = null;
      const pts = [[tour.pA, '#1EA1E6', 'A'], [tour.pB, '#7A4BD8', 'B']].filter(([p0]) => p0);
      host._opts = { draw: ({ X, Y, dot }) => pts.map(([p0, col, t]) => `<g class="pt-now">${dot(p0[0], p0[1], col)}${label(X, Y, p0, t, col)}</g>`).join('') };
      drawGraph(host._opts);
      done();
    };
    return () => { host._tap = null; };
  };
}
function practiceThrough() {
  const host = $('#graph'), { pA, pB } = tour;
  if (!pA || !pB) return;
  const old = host._opts.draw;
  const d = [pB[0] - pA[0], pB[1] - pA[1]], a = [pA[0] - d[0] * 6, pA[1] - d[1] * 6], b = [pA[0] + d[0] * 7, pA[1] + d[1] * 7];
  host._opts = { draw: (k) => `<line class="draw-now" style="--len:2400" x1="${k.X(a[0])}" y1="${k.Y(a[1])}" x2="${k.X(b[0])}" y2="${k.Y(b[1])}" stroke="var(--orange)" stroke-width="4" stroke-linecap="round"/>` + old(k) };
  drawGraph(host._opts);
}
const equationTour = (checkRe) => [
  { el: () => $('#graph'), say: 'A practice line: y = 3x − 2.', before: practiceLine },
  typeIn('m-answer', 3, 'm is how steep it is. Type 3.'),
  typeIn('c-answer', -2, 'c is where it crosses the y-axis. Type −2.'),
  { el: buttonNamed(checkRe), say: 'Tap Check when you’re sure.' },
  stepTries, stepFitila,
];
const TOURS = {
  2: () => [slide('m', 'Drag m to tilt the line.'), slide('c', 'Drag c to slide it up and down.'),
    { el: () => $('#graph'), say: 'Your line changes here. Make it climb!' }, stepFitila],
  3: () => [
    { el: () => $('#graph'), say: 'Tap the grid to place A.', gesture: 'tap', before: () => { tour.pA = tour.pB = null; const h = $('#graph'); h._opts = { draw: () => '' }; drawGraph(h._opts); }, wait: practiceTap('A') },
    { el: () => $('#graph'), say: 'Now tap again to place B.', gesture: 'tap', wait: practiceTap('B') },
    { el: () => $('#graph'), say: 'A line goes through both points!', before: practiceThrough },
    { el: () => $('.chip-point.b', scene), say: 'This shows where your B is.' },
    { el: () => $('#confirm-b'), say: 'Tap Check when B is in place.' },
  ],
  4: () => [{ el: () => $('#graph'), say: 'A and B sit on this line.' },
    { el: () => $$('.pill', scene), say: 'Count across from A to B, then up.' },
    typeIn('m-answer', 9, 'Your answer goes here. Type 9 to practise.'),
    { el: buttonNamed(/^Check$/), say: 'Then tap Check.' },
    { el: () => $('.g-buddy .fitila', scene), say: 'Stuck? Tap me for a hint.', gesture: 'tap' }],
  5: () => [{ el: () => $$('.measure', scene), say: 'Across and up are counted for you.' },
    typeIn('m-answer', 9, 'Your answer goes here. Type 9 to practise.'),
    { el: buttonNamed(/^Check$/), say: 'Then tap Check.' }],
  6: () => equationTour(/^Check$/),
  7: () => [{ el: () => $$('.coord', scene), say: 'Two practice points on a line.', before: () => { const k = $$('.coord', scene); k[0].innerHTML = '<span class="badge">A</span>(0, −2)'; k[1].innerHTML = '<span class="badge">B</span>(2, 4)'; } },
    typeIn('m-answer', 3, 'Up 6, across 2: m = 3. Type 3.'), typeIn('c-answer', -2, 'It crosses the y-axis at −2. Type −2.'),
    { el: buttonNamed(/^Check Answer$/), say: 'Tap Check Answer when you’re sure.' }, stepTries, stepFitila],
  8: () => [{ el: () => [$('#equation'), $('#graph')], say: 'A practice line: y = 3x − 2.', before: () => { $('#equation').textContent = 'y = 3x − 2'; practiceLine(); } },
    { el: () => $('.qcard', scene), say: 'Find y when x = 1.', before: () => { $('.qcard', scene).innerHTML = '<span>(1, <span class="q">?</span>)</span>'; } },
    typeIn('y-answer', 1, '3 × 1 − 2 = 1. Type 1.'),
    { el: buttonNamed(/^Check$/), say: 'Then tap Check.' }, stepFitila],
  9: () => [{ el: () => $('#graph'), say: 'Look for where the line crosses the y-axis.' },
    { el: () => $$('.choice', scene), say: 'Tap an answer to pick it.', gesture: 'tap', target: () => $$('.choice', scene)[0],
      wait: (done) => { const h = (e) => { if (e.target.closest('.choice')) done(); }; scene.addEventListener('click', h); return () => scene.removeEventListener('click', h); } },
    { el: buttonNamed(/^Check Answer$/), say: 'Then tap Check Answer.' },
    { el: () => [buttonNamed(/Hint$/)(), buttonNamed(/Ask Fitila$/)()], say: 'Need help? Tap Hint or Ask Fitila.' }],
  11: () => [{ el: () => $('#graph'), say: 'Make the line hit both purple targets.' }, slide('m', 'Drag m to tilt the line.'), slide('c', 'Drag c to move it up and down.'),
    { el: () => $('#hits'), say: 'Your hits show here.' }, { el: buttonNamed(/^Check$/), say: 'Tap Check when both are hit.' }],
};
TOURS[13] = TOURS[6];
const HAND = '<svg viewBox="0 0 48 56" aria-hidden="true"><path d="M17 30V9a4.5 4.5 0 0 1 9 0v15l2-.5a4 4 0 0 1 4.6 3.2l.3 1.6 1.6-.4a4 4 0 0 1 4.8 3.4l.2 1.3a4 4 0 0 1 5 3.6V45c0 6-5 10-11 10H27c-4 0-7-2-9-5l-8-12a4 4 0 0 1 6-5z" fill="#fff" stroke="#0E2C47" stroke-width="2.6" stroke-linejoin="round"/></svg>';
const CLOSE = '<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round"><path d="M9 9l14 14M23 9L9 23"/></svg>';
function startTour() {
  const stepsFor = TOURS[page];
  if (!stepsFor || tour || guided) return;
  closeModal(false);
  if (coach) { coach.timers.forEach(clearTimeout); clearTimeout(coach.idle); sayQuestion(); }
  tour = { page, i: -1, steps: stepsFor(), snap: snapshot(), cleanup: null, targets: [], raf: 0, pA: null, pB: null };
  emit('tutorial', { action: 'start' });
  const el = make('div', 'tour');
  el.id = 'tour';
  el.innerHTML = `<div class="tour-spot"></div><div class="tour-hand">${HAND}</div>
    <div class="tour-tip" id="tour-tip" role="dialog" aria-label="How to play">
      <img class="tour-fitila" src="media/fitila/point_poster.webp${CLIPS.point?.[6] ? `?v=${CLIPS.point[6]}` : ''}" alt="">
      <div class="tour-body"><p class="tour-say" id="tour-say" aria-live="polite"></p>
        <div class="tour-nav"><span class="tour-dots" aria-hidden="true"></span><button type="button" class="tour-skip">Skip</button>
          <button type="button" class="btn small outline tour-back">Back</button><button type="button" class="btn small tour-next">Next</button></div></div>
      <button type="button" class="tour-close" aria-label="Close how to play">${CLOSE}</button></div>`;
  document.body.append(el);
  $('.tour-next', el).addEventListener('click', () => tourStep(tour.i + 1));
  $('.tour-back', el).addEventListener('click', () => tourStep(tour.i - 1));
  $('.tour-skip', el).addEventListener('click', () => endTour(false));
  $('.tour-close', el).addEventListener('click', () => endTour(false));
  for (const t of ['pointerdown', 'click']) document.addEventListener(t, tourGuard, true);
  document.addEventListener('keydown', tourKeys, true);
  tourStep(0);
  const loop = () => { if (!tour) return; tourPlace(); tour.raf = requestAnimationFrame(loop); };
  loop();
}
// during the walkthrough only the highlighted element and the walkthrough itself respond
function tourGuard(e) {
  if (!tour || e.target.closest?.('#tour-tip, #admin, #admin-fab')) return;
  if (tour.targets.some((t) => t.contains(e.target))) return;
  e.preventDefault(); e.stopPropagation();
}
function tourKeys(e) {
  if (!tour) return;
  if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); endTour(false); }
}
function tourStep(i) {
  if (!tour) return;
  tour.cleanup?.(); tour.cleanup = null;
  if (i >= tour.steps.length) { endTour(true); return; }
  if (i < 0) return;
  tour.i = i;
  const st = tour.steps[i], tip = $('#tour-tip');
  st.before?.();
  tour.targets = [].concat(st.el?.() || []).filter(Boolean);
  tour.pointAt = st.target?.() || tour.targets[0];
  tour.gesture = st.gesture || '';
  tour.targets[0]?.scrollIntoView?.({ block: 'center', inline: 'nearest' });
  $('.tour-say', tip).innerHTML = st.say;
  $('.tour-dots', tip).innerHTML = tour.steps.map((_, k) => `<i class="${k === i ? 'on' : ''}"></i>`).join('');
  $('.tour-back', tip).disabled = i === 0;
  const next = $('.tour-next', tip);
  next.textContent = i === tour.steps.length - 1 ? 'Let’s play!' : 'Next';
  tip.classList.toggle('waiting', !!st.wait);
  next.disabled = !!st.wait;
  if (st.wait) {
    tour.cleanup = st.wait(() => {
      if (!tour || tour.i !== i) return;
      next.disabled = false; tip.classList.remove('waiting');
      $('.tour-say', tip).insertAdjacentHTML('beforeend', ' <b class="tour-nice">Nice!</b>');
      setTimeout(() => { if (tour && tour.i === i) tourStep(i + 1); }, reduced() ? 400 : 1000);
    });
  } else next.focus({ preventScroll: true });
  const hand = $('.tour-hand');
  hand.className = `tour-hand ${tour.gesture}`;
  tourPlace();
}
// spotlight, hand and tip follow the target; the tip moves to whichever side has room
function tourPlace() {
  const spot = $('.tour-spot'), hand = $('.tour-hand'), tip = $('#tour-tip');
  if (!spot) return;
  const rs = tour.targets.map((t) => t.getBoundingClientRect()).filter((r) => r.width || r.height);
  const vw = innerWidth, vh = visualViewport?.height || innerHeight, pad = 10, gap = 14, edge = 12;
  if (!rs.length) { spot.style.cssText = 'opacity:0'; hand.style.opacity = 0; }
  const r = rs.length ? { left: Math.min(...rs.map((x) => x.left)) - pad, top: Math.min(...rs.map((x) => x.top)) - pad,
    right: Math.max(...rs.map((x) => x.right)) + pad, bottom: Math.max(...rs.map((x) => x.bottom)) + pad } : { left: vw / 2, top: vh / 2, right: vw / 2, bottom: vh / 2 };
  if (rs.length) spot.style.cssText = `left:${r.left}px;top:${r.top}px;width:${r.right - r.left}px;height:${r.bottom - r.top}px`;
  const pr = tour.pointAt?.getBoundingClientRect();
  if (pr && tour.gesture) hand.style.cssText = `opacity:1;left:${Math.min(vw - 50, pr.left + pr.width / 2)}px;top:${Math.min(vh - 60, pr.top + pr.height / 2)}px`;
  else hand.style.opacity = 0;
  const tw = tip.offsetWidth, th = tip.offsetHeight;
  const fits = { below: r.bottom + gap + th <= vh - edge, above: r.top - gap - th >= edge, right: r.right + gap + tw <= vw - edge, left: r.left - gap - tw >= edge };
  let x, y;
  const cx = (r.left + r.right) / 2 - tw / 2, cy = (r.top + r.bottom) / 2 - th / 2;
  if (fits.below) { x = cx; y = r.bottom + gap; } else if (fits.above) { x = cx; y = r.top - gap - th; }
  else if (fits.right) { x = r.right + gap; y = cy; } else if (fits.left) { x = r.left - gap - tw; y = cy; }
  else { x = cx; y = vh - th - edge; } // a target as big as the screen: the tip sits at the bottom
  tip.style.left = `${Math.max(edge, Math.min(vw - tw - edge, x))}px`;
  tip.style.top = `${Math.max(edge, Math.min(vh - th - edge, y))}px`;
}
function endTour(finished = false, restore = true) {
  if (!tour) return;
  const t = tour;
  tour = null;
  t.cleanup?.();
  cancelAnimationFrame(t.raf);
  for (const k of ['pointerdown', 'click']) document.removeEventListener(k, tourGuard, true);
  document.removeEventListener('keydown', tourKeys, true);
  $('#tour')?.remove();
  const host = $('#graph');
  if (host) host._tap = null;
  emit('tutorial', { action: finished ? 'finished' : 'closed', step: t.i + 1, of: t.steps.length });
  if (restore && page === t.page) { go(t.page, { restore: t.snap, quiet: true }); $('#help').focus({ preventScroll: true }); }
}

// =====================================================================================
// Admin preview (development only): Ctrl+M, or the Admin button on touch screens, opens a small
// panel to load any level. It needs the platform's admin role — the shortcut alone does nothing —
// and it never changes the learner's assigned level.
// =====================================================================================
const STAR = '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 1.8l2.5 5.2 5.7.8-4.1 4 1 5.6L10 14.7l-5.1 2.7 1-5.6-4.1-4 5.7-.8z"/></svg>';
function adminReady() {
  if (!platform.admin || $('#admin-fab')) return;
  const fab = make('button', 'admin-fab', 'Admin');
  fab.id = 'admin-fab'; fab.type = 'button';
  fab.setAttribute('aria-label', 'Open the developer level override');
  fab.addEventListener('click', () => adminPanel());
  document.body.append(fab);
}
function adminPanel(open = !$('#admin')) {
  $('#admin')?.remove();
  if (!open || !platform.admin) { $('#admin-fab')?.focus({ preventScroll: true }); return; }
  const el = make('div', 'admin');
  el.id = 'admin';
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-label', 'Developer level override');
  const current = override?.level;
  el.innerHTML = `<div class="admin-head"><b>Developer override</b><button type="button" class="admin-close" aria-label="Close the developer panel">${CLOSE}</button></div>
    <p class="admin-note">Assigned by the platform: <b>${LEVELS[platform.level].name}</b>${override ? `<br>Previewing: <b>${LEVELS[current].name}</b>` : ''}</p>
    <div class="admin-levels">${LEVELS.map((l, i) => `<button type="button" data-level="${i}" aria-pressed="${current === i}"><span class="stars">${STAR.repeat(i + 1)}</span>${l.name}</button>`).join('')}</div>
    <button type="button" class="btn small outline admin-return" ${override ? '' : 'disabled'}>Return to assigned activity</button>`;
  document.body.append(el);
  $('.admin-close', el).addEventListener('click', () => adminPanel(false));
  $$('[data-level]', el).forEach((b) => b.addEventListener('click', () => {
    const i = Number(b.dataset.level);
    if (!override) override = { back: snapshot() };
    override.level = i;
    adminPanel(false);
    $('#admin-fab').textContent = `Admin · ${LEVELS[i].name}`;
    go(firstScreen(i));
  }));
  $('.admin-return', el).addEventListener('click', () => {
    const back = override?.back;
    override = null;
    adminPanel(false);
    $('#admin-fab').textContent = 'Admin';
    if (back) go(back.page, back.page === 1 ? {} : { restore: back, quiet: true });
  });
  $('[data-level]', el).focus({ preventScroll: true });
}
document.addEventListener('keydown', (e) => {
  if (e.ctrlKey && !e.metaKey && !e.altKey && (e.code === 'KeyM' || e.key.toLowerCase() === 'm')) {
    if (!platform.admin) { // the shortcut alone grants nothing; tell developers why in the console only
      console.info('Gradient Lab: the level panel needs admin access (the platform’s role: "admin", or ?admin on localhost / file://).');
      return;
    }
    e.preventDefault();
    adminPanel();
  }
  if (e.key === 'Escape' && $('#admin')) adminPanel(false);
});

// ---------- the learning platform: assigned level and admin role in, attempts and support choices out ----------
function emit(type, detail = {}) {
  const d = { screen: page, ...detail };
  dispatchEvent(new CustomEvent(`gradientlab:${type}`, { detail: d }));
  if (window.parent !== window) window.parent.postMessage({ type: `gradientlab:${type}`, ...d }, '*');
}
function configure(cfg = {}) {
  const lv = levelIndex(cfg.level);
  if (lv != null) platform.level = lv;
  if (cfg.role === 'admin') { platform.admin = true; adminReady(); }
}
addEventListener('gradientlab:config', (e) => configure(e.detail));
addEventListener('message', (e) => { if (e.source === window.parent && e.data?.type === 'gradientlab:config') configure(e.data); });
adminReady();

// =====================================================================================
// Worksheet: a practice graph that slides in from the right-edge tab, on every question screen.
// Tap (or arrow keys + Enter) to plot points; two points draw a line and show its across and up.
// It is scratch paper only: nothing on it is marked, used as a try, or tells the answer.
// It keeps its points until the learner moves to a different screen.
// =====================================================================================
const WS = { range: 6, size: 520, pad: 34 };
const worksheet = { page: null, pts: [], cursor: null };
const wsScreen = (n) => ![1, 10].includes(n);
function wsSetup() {
  const tab = make('button', 'ws-tab', `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="3"/><path d="M3 9h18M3 15h18M9 3v18M15 3v18"/></svg><span>Worksheet</span>`);
  tab.id = 'ws-tab'; tab.type = 'button';
  tab.setAttribute('aria-controls', 'worksheet');
  tab.setAttribute('aria-expanded', 'false');
  tab.addEventListener('click', () => wsOpen(!$('#worksheet').classList.contains('open')));
  const panel = make('aside', 'worksheet', `<div class="ws-head"><b id="ws-title">My worksheet</b>
      <button type="button" class="ws-close" aria-label="Close the worksheet">${CLOSE}</button></div>
    <p class="ws-help">Tap the grid to plot points. Two points make a line.</p>
    <div class="ws-grid" tabindex="0" role="application" aria-label="Worksheet grid. Tap to plot a point, or use the arrow keys and Enter."></div>
    <p class="ws-read" aria-live="polite"></p>
    <div class="ws-tools"><button type="button" class="btn small outline ws-undo">Undo</button><button type="button" class="btn small outline ws-clear">Clear</button></div>`);
  panel.id = 'worksheet';
  panel.setAttribute('aria-labelledby', 'ws-title');
  panel.inert = true;
  document.body.append(tab, panel);
  $('.ws-close', panel).addEventListener('click', () => wsOpen(false));
  $('.ws-undo', panel).addEventListener('click', () => { worksheet.pts.pop(); wsDraw(); });
  $('.ws-clear', panel).addEventListener('click', () => { worksheet.pts = []; wsDraw(); });
  const grid = $('.ws-grid', panel);
  grid.addEventListener('pointerdown', (e) => {
    const svg = grid.querySelector('svg'), p = new DOMPoint(e.clientX, e.clientY).matrixTransform(svg.getScreenCTM().inverse());
    wsPlot([Math.round(wsFromX(p.x)), Math.round(wsFromY(p.y))]);
  });
  grid.addEventListener('keydown', (e) => {
    const step = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, 1], ArrowDown: [0, -1] }[e.key];
    const cu = worksheet.cursor || [0, 0];
    if (step) { e.preventDefault(); worksheet.cursor = cu.map((v, i) => Math.max(-WS.range, Math.min(WS.range, v + step[i]))); wsDraw(); }
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); wsPlot(cu); }
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && panel.classList.contains('open') && !modalOpen && !tour) wsOpen(false); });
  wsDraw();
}
const wsUnit = () => (WS.size - WS.pad * 2) / (WS.range * 2);
const wsX = (v) => WS.pad + (v + WS.range) * wsUnit(), wsY = (v) => WS.size - WS.pad - (v + WS.range) * wsUnit();
const wsFromX = (px) => (px - WS.pad) / wsUnit() - WS.range, wsFromY = (py) => (WS.size - WS.pad - py) / wsUnit() - WS.range;
function wsPlot(p) {
  if (Math.abs(p[0]) > WS.range || Math.abs(p[1]) > WS.range) return;
  const i = worksheet.pts.findIndex((q) => same(q, p));
  if (i >= 0) worksheet.pts.splice(i, 1); // tapping a point again takes it off
  else worksheet.pts.push(p);
  wsDraw();
}
function wsDraw() {
  const grid = $('.ws-grid');
  if (!grid) return;
  const R = WS.range, S = WS.size, u = wsUnit();
  let s = `<svg viewBox="0 0 ${S} ${S}" aria-hidden="true"><defs><marker id="ws-ah" viewBox="0 0 12 12" refX="10" refY="6" markerWidth="11" markerHeight="11" orient="auto-start-reverse"><path d="M2 2L10 6L2 10Z" fill="var(--axis)"/></marker>
    <clipPath id="ws-clip"><rect x="${wsX(-R)}" y="${wsY(R)}" width="${wsX(R) - wsX(-R)}" height="${wsY(-R) - wsY(R)}"/></clipPath></defs>`;
  for (let v = -R; v <= R; v++) s += `<line x1="${wsX(v)}" y1="${wsY(-R)}" x2="${wsX(v)}" y2="${wsY(R)}" stroke="#DCE3EA" stroke-width="1.2"/><line x1="${wsX(-R)}" y1="${wsY(v)}" x2="${wsX(R)}" y2="${wsY(v)}" stroke="#DCE3EA" stroke-width="1.2"/>`;
  s += `<line x1="${wsX(-R) - 10}" y1="${wsY(0)}" x2="${wsX(R) + 12}" y2="${wsY(0)}" stroke="var(--axis)" stroke-width="2" marker-start="url(#ws-ah)" marker-end="url(#ws-ah)"/>`;
  s += `<line x1="${wsX(0)}" y1="${wsY(-R) + 10}" x2="${wsX(0)}" y2="${wsY(R) - 12}" stroke="var(--axis)" stroke-width="2" marker-start="url(#ws-ah)" marker-end="url(#ws-ah)"/>`;
  for (let v = -R; v <= R; v += 2) if (v) s += `<text x="${wsX(v)}" y="${wsY(0) + 20}" text-anchor="middle" class="ws-n">${fmt(v)}</text><text x="${wsX(0) - 8}" y="${wsY(v) + 5}" text-anchor="end" class="ws-n">${fmt(v)}</text>`;
  s += `<text x="${wsX(R) + 4}" y="${wsY(0) - 10}" class="ws-axis">x</text><text x="${wsX(0) + 10}" y="${wsY(R) - 2}" class="ws-axis">y</text>`;
  const pts = worksheet.pts, read = [];
  if (pts.length >= 2) {
    const a = pts[pts.length - 2], b = pts[pts.length - 1], d = [b[0] - a[0], b[1] - a[1]];
    s += `<line clip-path="url(#ws-clip)" x1="${wsX(a[0] - d[0] * 20)}" y1="${wsY(a[1] - d[1] * 20)}" x2="${wsX(a[0] + d[0] * 20)}" y2="${wsY(a[1] + d[1] * 20)}" stroke="var(--orange)" stroke-width="3.5" stroke-linecap="round"/>`;
    if (d[0] && d[1]) {
      const corner = [b[0], a[1]];
      s += `<line x1="${wsX(a[0])}" y1="${wsY(a[1])}" x2="${wsX(corner[0])}" y2="${wsY(corner[1])}" stroke="#1C8FD8" stroke-width="3" stroke-dasharray="8 6"/>`;
      s += `<line x1="${wsX(corner[0])}" y1="${wsY(corner[1])}" x2="${wsX(b[0])}" y2="${wsY(b[1])}" stroke="#12A066" stroke-width="3" stroke-dasharray="8 6"/>`;
      s += `<text x="${(wsX(a[0]) + wsX(corner[0])) / 2}" y="${wsY(a[1]) + (d[1] > 0 ? 22 : -10)}" text-anchor="middle" class="ws-tag" style="fill:#1C8FD8">across ${fmt(d[0])}</text>`;
      s += `<text x="${wsX(b[0]) + (d[0] > 0 ? 10 : -10)}" y="${(wsY(corner[1]) + wsY(b[1])) / 2 + 6}" text-anchor="${d[0] > 0 ? 'start' : 'end'}" class="ws-tag" style="fill:#12A066">up ${fmt(d[1])}</text>`;
    }
    read.push(d[0] ? `Across ${fmt(d[0])}, up ${fmt(d[1])}.` : 'That line goes straight up and down.');
  }
  pts.forEach((p, i) => {
    const col = i === pts.length - 1 ? '#7A4BD8' : '#1EA1E6';
    s += `<circle cx="${wsX(p[0])}" cy="${wsY(p[1])}" r="${u * 0.24}" fill="${col}" stroke="#fff" stroke-width="3"/><text x="${wsX(p[0]) + 10}" y="${wsY(p[1]) - 10}" class="ws-pt" style="fill:${col}">(${p.map(fmt).join(', ')})</text>`;
  });
  if (worksheet.cursor) s += `<circle cx="${wsX(worksheet.cursor[0])}" cy="${wsY(worksheet.cursor[1])}" r="${u * 0.42}" fill="none" stroke="#FFBD20" stroke-width="3" stroke-dasharray="6 4"/>`;
  grid.innerHTML = `${s}</svg>`;
  if (pts.length) read.unshift(`Points: ${pts.map((p) => `(${p.map(fmt).join(', ')})`).join(', ')}.`);
  $('.ws-read').textContent = read.join(' ');
  $('.ws-undo').disabled = $('.ws-clear').disabled = !pts.length;
}
function wsOpen(open) {
  const panel = $('#worksheet'), tab = $('#ws-tab');
  if (!panel) return;
  panel.classList.toggle('open', open);
  panel.inert = !open;
  tab.setAttribute('aria-expanded', String(open));
  if (open) {
    tab.classList.remove('pulse');
    emit('worksheet', { action: 'open' });
    setTimeout(() => $('.ws-grid', panel).focus({ preventScroll: true }), 50);
  } else if (panel.contains(document.activeElement)) tab.focus({ preventScroll: true });
}
// after a wrong answer: Fitila points the learner to the worksheet (or their book) and the tab pulses
function wsNudge() {
  if (!wsScreen(page)) return '';
  if (!$('#worksheet')?.classList.contains('open')) $('#ws-tab').classList.add('pulse');
  return ' Try it on your worksheet or in your book.';
}
// each screen gets a fresh worksheet; coming back to the same screen keeps it
function wsForPage(n) {
  $('#ws-tab').hidden = !wsScreen(n);
  if (!wsScreen(n)) wsOpen(false);
  if (worksheet.page !== n) { worksheet.page = n; worksheet.pts = []; worksheet.cursor = null; $('#ws-tab').classList.remove('pulse'); wsDraw(); }
}
wsSetup();

// ---------- keep the focused answer box (and its button) above an on-screen keyboard ----------
if (window.visualViewport) {
  const lift = () => {
    const el = document.activeElement, app = $('#app'), shift = Number(app.dataset.shift || 0);
    const typing = el?.matches?.('#scene input[type=text]');
    if (getComputedStyle(app).position !== 'fixed') { if (typing) el.scrollIntoView({ block: 'center' }); return; }
    const need = typing ? el.getBoundingClientRect().bottom + shift + 96 - (visualViewport.offsetTop + visualViewport.height) : 0;
    const next = Math.max(0, Math.round(need));
    if (next !== shift) { app.dataset.shift = next; app.style.translate = next ? `0 ${-next}px` : ''; }
  };
  visualViewport.addEventListener('resize', lift);
  addEventListener('focusin', () => setTimeout(lift, 250));
  addEventListener('focusout', () => setTimeout(lift, 120));
}

// ---------- header controls and start ----------
addEventListener('hashchange', () => { const n = Number(location.hash.slice(1)); if (PAGES[n] && n !== page) go(n); });
$('#audio').addEventListener('click', () => {
  const btn = $('#audio');
  if (!('speechSynthesis' in window)) { announce('Reading aloud is not available in this browser.'); return; }
  if (speechSynthesis.speaking) { speechSynthesis.cancel(); btn.setAttribute('aria-pressed', 'false'); return; }
  const say = modalOpen ? modalOpen.el.innerText : coach ? coach.text : $$('.grp > .hand', scene).map((e) => e.innerText).join('. ');
  const u = new SpeechSynthesisUtterance(say);
  u.onend = () => btn.setAttribute('aria-pressed', 'false');
  btn.setAttribute('aria-pressed', 'true');
  speechSynthesis.speak(u);
});
$('#help').addEventListener('click', () => startTour());
// Back: leaves guided practice or the walkthrough first, otherwise returns to the previous screen
$('#back').addEventListener('click', () => {
  if (tour) { endTour(false); return; }
  if (guided) { endGuided('back'); return; }
  let prev = trail.pop();
  while (prev === page) prev = trail.pop();
  go(prev ?? 1, { back: true });
});
$('#exit').addEventListener('click', () => modal({ title: 'Leave Gradient Lab?', body: 'You can come back to the welcome screen.', pose: 'think', action: 'Back to start', onAction: () => go(1) }));
document.documentElement.classList.toggle('anim', !reduced());
matchMedia('(prefers-reduced-motion: reduce)').addEventListener?.('change', () => document.documentElement.classList.toggle('anim', !reduced()));
// wait for Patrick Hand and SN Pro so the first screen is laid out in the real type
const start = () => go(PAGES[Number(location.hash.slice(1))] ? Number(location.hash.slice(1)) : 1);
Promise.all([document.fonts.load('40px "Patrick Hand"'), document.fonts.load('600 30px "SN Pro"'), document.fonts.load('500 22px "SN Pro"')])
  .catch(() => {}).finally(start);
