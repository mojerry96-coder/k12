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
// Per clip: the clip's size and where Fitila's resting pose sits inside it (filled in by the build).
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
const TARGETS = [[2, 1], [-2, -3]];

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
    const [vw, vh, rx, ry, rw, rh] = clip;
    const v = document.createElement('video');
    Object.assign(v, { muted: true, loop: true, autoplay: true, playsInline: true, preload: 'auto' });
    v.setAttribute('muted', ''); v.setAttribute('playsinline', ''); v.setAttribute('aria-hidden', 'true');
    v.poster = `media/fitila/${pose}_poster.webp`;
    v.style.cssText = `width:${(vw / rw) * 100}%;height:${(vh / rh) * 100}%;left:${(-rx / rw) * 100}%;top:${(-ry / rh) * 100}%`;
    v.innerHTML = `<source src="media/fitila/${pose}.mov" type='video/quicktime; codecs="hvc1"'><source src="media/fitila/${pose}.webm" type="video/webm">`;
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
  return host;
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
  const arrows = (id) => (intro ? '' : `marker-start="url(#${id})" marker-end="url(#${id})"`);
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
      s += L(X(u[0]), Y(u[1]), X(v[0]), Y(v[1]), 'var(--orange)', 4, `stroke-linecap="round" ${arrows('ahl')} ${drawn(Math.hypot(X(v[0]) - X(u[0]), Y(v[1]) - Y(u[1])))}`);
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
    if (pointB) s += `<g class="pt" style="--i:0">${dot(pointB[0], pointB[1], '#7A4BD8')}<text x="${X(pointB[0]) + 22}" y="${Y(pointB[1]) - 22}" style="fill:#7A4BD8;font-size:30px;font-weight:600">B</text></g>`;
    else s += `<g class="ghost-b"><circle cx="${X(2)}" cy="${Y(2)}" r="30" fill="#EFE6FD" stroke="#B89BEF" stroke-width="2" stroke-dasharray="6 5"/><circle cx="${X(2)}" cy="${Y(2)}" r="17" fill="#C9B2F4" stroke="#A985EE" stroke-width="2"/></g>`;
  }
  if (o.success) s += pt(dot(-2, -2, '#7547CD'));
  if (o.wide) s += pt(dot(0, 1, '#5A35B8', 15)) + pt(dot(10, 6, '#5A35B8', 15));
  if (o.targets) {
    for (const [tx, ty] of TARGETS) {
      const hit = Math.abs(m * tx + c - ty) < 0.08, col = hit ? '#0FA36C' : '#7A4BD8', halo = hit ? '#D3F1E4' : '#E9DEFC';
      s += `<circle class="${hit ? '' : 'target-halo'}" cx="${X(tx)}" cy="${Y(ty)}" r="38" fill="${halo}"/>` + pt(dot(tx, ty, col, 15));
      if (hit) s += `<g class="pt" style="--i:0"><circle cx="${X(tx) + 28}" cy="${Y(ty) - 37}" r="15" fill="#0FA36C" stroke="#fff" stroke-width="3"/><path d="M${X(tx) + 21} ${Y(ty) - 37}l5 5 9-10" fill="none" stroke="#fff" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/></g>`;
    }
  }
  s += '</svg>';
  host.innerHTML = s;
  host._drawn = true;
  if (intro) setTimeout(() => { if (host.isConnected && !host._settled) { host._settled = true; drawGraph(host._opts); } }, 1400);
  if (o.place) wirePlacement(host, M);
}

// Screen 3: click/tap the grid (or use the arrow keys) to place B; snaps to whole numbers in −4…4.
function wirePlacement(host, M) {
  const svg = host.querySelector('svg');
  svg.setAttribute('tabindex', '0');
  svg.setAttribute('role', 'application');
  svg.setAttribute('aria-label', 'Place point B. Click the grid or use the arrow keys; Enter confirms.');
  const put = ([px, py]) => {
    pointB = [Math.max(-4, Math.min(4, px)), Math.max(-4, Math.min(4, py))];
    drawGraph({ place: true });
    $('#b-label').textContent = `B (${pointB.map(fmt).join(', ')})`;
    bump($('#b-label').parentElement);
    const cont = $('#confirm-b');
    if (cont.hidden) { cont.hidden = false; cont.dataset.in = 'pop'; cont.style.setProperty('--d', '0ms'); }
    announce($('#b-label').textContent);
    $('#graph svg').focus({ preventScroll: true });
  };
  svg.addEventListener('pointerdown', (e) => {
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(svg.getScreenCTM().inverse());
    const [gx, gy] = M.toGraph(p.x, p.y);
    put([Math.round(gx), Math.round(gy)]);
  });
  svg.addEventListener('keydown', (e) => {
    const moves = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, 1], ArrowDown: [0, -1] };
    const a = pointB || [2, 2];
    if (moves[e.key]) { e.preventDefault(); put([a[0] + moves[e.key][0], a[1] + moves[e.key][1]]); }
    if (e.key === 'Enter' && pointB) confirmB();
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
function success(message, next) { modal({ title: 'You got it!', body: message, pose: 'success', action: 'Continue', onAction: () => go(next), success: true }); }
function failure(message, fields = []) {
  attempts = Math.max(0, attempts - 1);
  renderTries();
  for (const id of fields) { const f = $('#' + id)?.closest('.field'); if (f) { f.classList.remove('wrong'); void f.offsetWidth; f.classList.add('wrong'); } }
  const out = attempts === 0;
  modal({ title: 'Almost!', body: out ? `${message} Let’s practise this step again.` : message, pose: 'almost',
    action: out ? 'Practise again' : 'Try again', remaining: attempts, onAction: () => { if (out) { attempts = 3; renderTries(); } } });
}
function numeric(id) {
  const raw = ($('#' + id)?.value || '').trim().replace(/[−–]/g, '-');
  if (!raw || !/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(raw)) return null;
  return Number(raw);
}
function check(fields, answers, next, message) {
  const nums = fields.map(numeric);
  const bad = nums.findIndex((v) => v === null || !Number.isFinite(v));
  if (bad >= 0) { // blank or not a number: no try used, just a nudge
    announce('Enter a number in each answer box.');
    const f = $('#' + fields[bad]); f.focus(); bump(f.closest('.field'));
    return;
  }
  if (nums.every((v, i) => Math.abs(v - answers[i]) < 1e-6)) return success(message, next);
  const cRight = fields.includes('c-answer') && Math.abs(nums[0] - answers[0]) < 1e-6;
  failure(cRight ? 'Check where the line crosses the y-axis.' : 'Check the rise and run, then try again.', cRight ? ['c-answer'] : fields);
}
function confirmB() {
  if (!pointB) return;
  if (pointB[0] === 2 && pointB[1] === 2) go(4);
  else modal({ title: 'Almost!', body: 'Move B to (2, 2).', pose: 'almost', action: 'Try again' });
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
// Navigation
// =====================================================================================
function go(n) {
  clearInterval(walkTimer);
  closeModal(false);
  if (typeof speechSynthesis !== 'undefined') speechSynthesis.cancel();
  $('#audio').setAttribute('aria-pressed', 'false');
  const keepTries = [4, 5].includes(page) && [4, 5].includes(n);
  page = n;
  if (!keepTries) attempts = 3;
  pointB = null; selected = null; moved = false; stageCount = {};
  scene.classList.remove('enter');
  scene.innerHTML = '';
  if (location.hash !== '#' + n) history.replaceState(null, '', '#' + n);
  PAGES[n]();
  void scene.offsetWidth;
  scene.classList.add('enter');
  $$('input[type=text]', scene).forEach((el) => el.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') $$('button', scene).find((b) => /^Check/.test(b.textContent.trim()))?.click();
  }));
  scrollTo(0, 0);
  announce(`Screen ${n}`);
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
  button(`Let’s play ${ICON.arrowR}`, [751, 557, 493, 92], () => go(2), { cls: 'cta', into: ctl, pw: 560 }).style.cssText += 'font-size:calc(var(--u)*38);--iw:44';
  button('How to play', [842, 692, 313, 70], () => modal({ title: 'How to play', body: 'Move the sliders, place points, and use up ÷ across to find the gradient.', pose: 'point', action: 'Let’s play', onAction: () => go(2) }), { cls: 'outline', into: ctl, pw: 400 });
}

function renderLineLab() {
  m = 0; c = 0;
  const board = group('board'), buddy = group('buddy'), ctl = group('controls');
  equation([612, 89, 240, 64], '', board);
  graph(2, { m, c, ends: true }, board);
  fitila('point', undefined, { into: buddy });
  bubble(['Make the line climb!'], [1183, 235, 362, 106], 44, [1338, 330, 1347, 378], { into: buddy });
  const walk = button(`${ICON.walk} Walk the line`, [1302, 785, 308, 80], () => {
    if (m <= 0) { modal({ title: 'Make it climb!', body: 'Move m above zero so the line rises from left to right.', pose: 'point', action: 'Try again' }); return; }
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
  graph(3, { place: true }, board);
  fitila('side', undefined, { into: buddy });
  bubble(['Now place B'], [1037, 306, 276, 114], 48, [1286, 392, 1325, 428], { into: buddy });
  const bulb = place(make('button', 'round', ICON.bulb), [1516, 404, 80, 80], { into: buddy, stage: 2, anim: 'pop', delay: STAGE_AT[2] + 700 });
  bulb.style.cssText += 'background:#FFE36A;border-color:#F2C935;color:#B58600;';
  bulb.setAttribute('aria-label', 'Show a hint for placing point B');
  bulb.addEventListener('click', () => modal({ title: 'Place point B', body: 'Move two units right and two units up from the origin.', pose: 'think', action: 'Try it' }));
  place(make('div', 'chip-point a', '<span class="dot"></span>A (−2, −2)'), [1020, 570, 223, 71], { into: row, anim: 'pop', pw: 300 });
  place(make('div', 'chip-point b', '<span class="dot"></span><span id="b-label">B (?, ?)</span>'), [1020, 662, 223, 71], { into: row, anim: 'pop', pw: 300 });
  const reset = place(make('button', 'round', ICON.reset), [279, 853, 68, 68], { into: ctl, stage: 4, anim: 'pop' });
  reset.setAttribute('aria-label', 'Reset point B');
  reset.addEventListener('click', () => go(3));
  const cont = button('Continue', [1020, 790, 223, 70], confirmB, { into: ctl, anim: '', pw: 400 });
  cont.id = 'confirm-b'; cont.hidden = true; cont.style.fontSize = 'calc(var(--u) * 27)'; cont.classList.add('cta');
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
    b.querySelector('#hide-hint').addEventListener('click', () => go(4));
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
    place(make('div', 'pill blue', `<span style="color:#1C9BE6;display:grid">${ICON.arrowR}</span>Across 4`), [341, 794, 262, 78], { into: under, stage: 4, anim: 'pop', pw: 290 });
    place(make('div', 'pill green', `<span style="color:#17A56C;display:grid">${ICON.arrowUp}</span>Up 4`), [620, 794, 261, 78], { into: under, stage: 4, anim: 'pop', pw: 290 });
  }
}

function renderMC(feedback) {
  const board = group('board'), buddy = group('buddy'), row = group('row'), ctl = group('controls');
  graph(feedback ? 13 : 6, { m: 1, c: 1 }, board);
  const checkIt = () => check(['m-answer', 'c-answer'], [1, 1], 7, 'm = 1, c = 1');
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
  place(make('div', 'coord', '<span class="badge">A</span>(−2, −2)'), [360, 274, 264, 214], { into: cards, stage: 1, anim: 'rise', pw: 380 });
  place(make('div', 'coord purple', '<span class="badge">B</span>(2, 2)'), [811, 270, 254, 216], { into: cards, stage: 1, anim: 'rise', pw: 380 });
  field('m-answer', 'm', [372, 569, 309, 112], 'cream', '', { into: fields, pw: 380 });
  field('c-answer', 'c', [765, 569, 310, 112], 'cream', '', { into: fields, pw: 380 });
  button('Check Answer', [518, 720, 403, 76], () => check(['m-answer', 'c-answer'], [1, 0], 8, 'm = 1, c = 0'), { into: ctl, pw: 560 });
  tries([945, 748, 120, null], { into: ctl, dots: false, cls: 'inline' });
}

function renderMissing() {
  m = 1; c = 1;
  const board = group('board'), buddy = group('buddy'), ctl = group('controls');
  equation([417, 115, 239, 70], 'peach', board);
  graph(8, { m, c }, board);
  fitila('puzzled', undefined, { into: buddy });
  text('?', [1520, 322, 70, null], 96, { into: buddy, stage: 2, anim: 'pop', style: 'color:#F5A21B;font-weight:700;text-shadow:0 3px 0 #E07B12;transform:rotate(12deg)' });
  bubble(['Find the missing number.'], [939, 195, 528, 122], 52, [1338, 308, 1378, 372], { into: buddy });
  place(make('div', 'qcard', '<span>(2, <span class="q">?</span>)</span>'), [998, 404, 260, 144], { into: ctl, anim: 'pop', pw: 380 });
  field('y-answer', 'y =', [946, 584, 363, 97], 'soft', '', { into: ctl, pw: 480 });
  button('Check', [946, 705, 364, 66], () => check(['y-answer'], [3], 11, '2 + 1 = 3'), { into: ctl, pw: 480 });
  tries([1046, 790, 164, null], { into: ctl, dots: false });
}

function renderIntercept() {
  const board = group('board'), buddy = group('buddy'), choices = group('choices'), row = group('row'), ctl = group('controls');
  graph(9, { m: 0.5, c: 1, wide: true }, board);
  const t = POSE.think;
  fitila('think', [1297, 355, Math.round((350 * t[2]) / t[3]), 350], { into: buddy });
  bubble(['What is the y-intercept', 'of this line?'], [1203, 195, 344, 135], 35, [1330, 320, 1352, 358], { into: buddy });
  const values = [-2, -1, 1, 5];
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
    if (selected === null) { announce('Choose an answer first.'); return; }
    if (values[selected] === 1) success('The y-intercept is 1.', 10);
    else failure('Check where the line crosses y.');
  }, { into: ctl, stage: 4, pw: 560 }).style.fontSize = 'calc(var(--u) * 24)';
  // the reference state: a wrong answer chosen, the retry overlay showing
  selected = 1;
  $$('.choice', scene)[selected].classList.add('selected');
  attempts = 2;
  modal({ title: 'Almost!', body: 'Check where the line crosses y.', pose: 'almost', action: 'Try again', remaining: 2,
    onAction: () => { selected = null; $$('.choice', scene).forEach((b) => b.classList.remove('selected')); } });
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
  button('Back to lesson', [669, 776, 336, 66], () => { window.dispatchEvent(new CustomEvent('gradientlab:complete', { detail: { completed: true } })); go(1); }, { into: ctl, pw: 480 }).style.fontSize = 'calc(var(--u) * 24)';
  setTimeout(() => { if (page === 10) confetti(innerWidth / 2, innerHeight * 0.4); }, 700);
}

function renderTargets() {
  m = 0.5; c = 0;
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
  button('Check', [1022, 822, 350, 66], () => (hitCount() === 2 ? success('Both targets hit!', 10) : failure('Move m and c until the line passes through both targets.')), { into: ctl, pw: 540 });
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

// ---------- header controls and start ----------
addEventListener('hashchange', () => { const n = Number(location.hash.slice(1)); if (PAGES[n] && n !== page) go(n); });
$('#audio').addEventListener('click', () => {
  const btn = $('#audio');
  if (!('speechSynthesis' in window)) { announce('Reading aloud is not available in this browser.'); return; }
  if (speechSynthesis.speaking) { speechSynthesis.cancel(); btn.setAttribute('aria-pressed', 'false'); return; }
  const say = modalOpen ? modalOpen.el.innerText : $$('.bubble, .grp > .hand', scene).map((e) => e.innerText).join('. ');
  const u = new SpeechSynthesisUtterance(say);
  u.onend = () => btn.setAttribute('aria-pressed', 'false');
  btn.setAttribute('aria-pressed', 'true');
  speechSynthesis.speak(u);
});
$('#exit').addEventListener('click', () => modal({ title: 'Leave Gradient Lab?', body: 'You can come back to the welcome screen.', pose: 'think', action: 'Back to start', onAction: () => go(1) }));
document.documentElement.classList.toggle('anim', !reduced());
matchMedia('(prefers-reduced-motion: reduce)').addEventListener?.('change', () => document.documentElement.classList.toggle('anim', !reduced()));
// wait for Patrick Hand and SN Pro so the first screen is laid out in the real type
const start = () => go(PAGES[Number(location.hash.slice(1))] ? Number(location.hash.slice(1)) : 1);
Promise.all([document.fonts.load('40px "Patrick Hand"'), document.fonts.load('600 30px "SN Pro"'), document.fonts.load('500 22px "SN Pro"')])
  .catch(() => {}).finally(start);
