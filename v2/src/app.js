'use strict';
// Gradient Lab v2 — the 14 reference screens on a fixed 1672 × 941 stage.
// Built from Gradient_Lab_14_Pages_Replication.md. Coordinates are design pixels measured
// from the reference PNGs; every graph is drawn from mathematics, never from pixels.
// Open a screen directly with #1 … #14 (e.g. #13 = incorrect-intercept feedback).

const $ = (s, r = document) => r.querySelector(s);
const scene = $('#scene'), stage = $('#stage'), scrim = $('#scrim'), modalHost = $('#modal-host');
const MINUS = '−';
const fmt = (n) => (n < 0 ? MINUS + Math.abs(n) : String(n));

// ---------- Fitila: transparent cut-outs lifted from the references, placed where the design has them ----------
const POSE = {
  wave: { src: 'assets/fitila/wave.webp', box: [154, 326, 523, 533] },
  point: { src: 'assets/fitila/point.webp', box: [1226, 372, 287, 377] },
  side: { src: 'assets/fitila/side.webp', box: [1153, 362, 410, 386] },
  wing: { src: 'assets/fitila/wing.webp', box: [1264, 247, 322, 395] },
  hint: { src: 'assets/fitila/hint.webp', box: [1281, 421, 235, 386] },
  wingwave: { src: 'assets/fitila/wingwave.webp', box: [1309, 295, 272, 406] },
  think: { src: 'assets/fitila/think.webp', box: [1209, 340, 280, 471] },
  puzzled: { src: 'assets/fitila/puzzled.webp', box: [1346, 360, 232, 411] },
  celebrate: { src: 'assets/fitila/celebrate.webp', box: [636, 138, 418, 418] },
  raise: { src: 'assets/fitila/raise.webp', box: [1115, 318, 380, 385] },
  almost: { src: 'assets/fitila/almost.webp', box: [765, 295, 139, 147] },
  success: { src: 'assets/fitila/success.webp', box: [727, 296, 222, 178] },
  thumbs: { src: 'assets/fitila/thumbs.webp', box: [1237, 379, 266, 357] }, // recovered from under screen 12's overlay
};

// ---------- graphs: box, origin and unit size measured per screen ----------
// ax: where the axes (and the drawn line) stop inside the frame [left, right, top, bottom];
// labels: which of "0", "x", "y" the design shows; gridIn: grid kept inside the axes rather than edge to edge.
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

// ---------- state ----------
let page = 1, m = 0, c = 0, pointB = null, attempts = 3, selected = null, walkTimer = 0, modalOpen = null;

// ---------- element helpers (all positions in design pixels) ----------
const box = (x, y, w, h) => `left:${x}px;top:${y}px;width:${w}px;${h ? `height:${h}px;` : ''}`;
function node(tag, cls, x, y, w, h, html = '') {
  const el = document.createElement(tag);
  if (cls) el.className = cls;
  el.style.cssText = box(x, y, w, h);
  el.innerHTML = html;
  scene.append(el);
  return el;
}
function text(html, x, y, w, size, cls = 'hand', extra = '') {
  const el = node('div', cls, x, y, w, 0, html);
  el.style.cssText += `font-size:${size}px;line-height:1.1;${extra}`;
  return el;
}
function button(label, x, y, w, fn, cls = '', h = 70) {
  const el = node('button', `btn ${cls}`, x, y, w, h, label);
  el.type = 'button';
  el.addEventListener('click', fn);
  return el;
}
// Speech bubble with a tail. tail = [baseX, baseY, tipX, tipY] in design pixels (the base sits under the bubble edge).
function bubble(html, x, y, w, h, size, tail) {
  if (tail) {
    const [bx, by, tx, ty] = tail, half = 20;
    const dx = tx - bx, dy = ty - by, len = Math.hypot(dx, dy) || 1, nx = -dy / len, ny = dx / len;
    const a = [bx + nx * half, by + ny * half], b = [bx - nx * half, by - ny * half];
    const mid = [(bx + tx) / 2 + nx * 6, (by + ty) / 2 + ny * 6];
    const t = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    t.setAttribute('class', 'tail-svg');
    t.setAttribute('viewBox', '0 0 1672 941');
    t.style.cssText = 'left:0;top:0;width:1672px;height:941px;z-index:1;pointer-events:none;overflow:visible';
    t.innerHTML = `<path d="M${a} Q${mid} ${tx},${ty} Q${(bx + tx) / 2},${(by + ty) / 2} ${b} Z" fill="#fff" stroke="#E4EBF1" stroke-width="2" stroke-linejoin="round"/>`;
    scene.append(t);
  }
  const el = node('div', 'bubble', x, y, w, h, `<div class="bubble-text">${html}</div>`);
  el.style.fontSize = size + 'px';
  return el;
}
function mascot(pose, b) {
  const p = POSE[pose], [x, y, w, h] = b || p.box;
  const el = node('div', 'mascot', x, y, w, h, `<span class="shadow"></span><img src="${p.src}" alt="Fitila the parrot">`);
  return el;
}
// little hand-drawn emphasis strokes around a point (angles in degrees)
function burst(x, y, color, angles, len = 26, gap = 10, width = 7) {
  const lines = angles.map((a) => {
    const r = (a * Math.PI) / 180, c1 = Math.cos(r), s1 = Math.sin(r);
    return `<line x1="${x + c1 * gap}" y1="${y + s1 * gap}" x2="${x + c1 * (gap + len)}" y2="${y + s1 * (gap + len)}"/>`;
  }).join('');
  const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  s.setAttribute('viewBox', '0 0 1672 941');
  s.style.cssText = 'left:0;top:0;width:1672px;height:941px;pointer-events:none;overflow:visible';
  s.innerHTML = `<g stroke="${color}" stroke-width="${width}" stroke-linecap="round">${lines}</g>`;
  scene.append(s);
}
function svgLayer(inner, z = 0) {
  const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  s.setAttribute('viewBox', '0 0 1672 941');
  s.setAttribute('aria-hidden', 'true');
  s.style.cssText = `left:0;top:0;width:1672px;height:941px;pointer-events:none;overflow:visible;z-index:${z}`;
  s.innerHTML = inner;
  scene.append(s);
  return s;
}
const ICON = {
  arrowR: '<svg width="40" height="30" viewBox="0 0 40 30" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"><path d="M3 15h32M24 4l11 11-11 11"/></svg>',
  arrowUp: '<svg width="30" height="40" viewBox="0 0 30 40" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"><path d="M15 37V5M4 16L15 5l11 11"/></svg>',
  bulb: '<svg width="30" height="34" viewBox="0 0 30 34" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M10 25h10M11.5 30h7M15 2a10 10 0 0 0-6 18c1 .8 1.5 2 1.5 3v2h9v-2c0-1 .5-2.2 1.5-3A10 10 0 0 0 15 2z"/></svg>',
  walk: '<svg width="46" height="40" viewBox="0 0 46 40" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M6 32l10-13 9 6 14-16"/><circle cx="6" cy="32" r="3.5" fill="#fff"/><circle cx="16" cy="19" r="3.5" fill="#fff"/><circle cx="25" cy="25" r="3.5" fill="#fff"/><circle cx="39" cy="9" r="3.5" fill="#fff"/></svg>',
  reset: '<svg width="34" height="34" viewBox="0 0 34 34" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"><path d="M7 17a10 10 0 1 0 3-7.2"/><path d="M7 5v6h6"/></svg>',
  pencil: '<svg width="34" height="30" viewBox="0 0 34 30" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 26l4-10L26 3l5 5-18 13z"/><path d="M8 16l5 5"/></svg>',
  check: '<svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="#fff" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 11.5l4 4 8-9"/></svg>',
};

// ---------- the coordinate graph ----------
function graph(n, opts = {}) {
  const g = GRAPHS[n], [x, y, w, h] = g.box;
  const host = node('div', 'graph', x, y, w, h);
  host.id = 'graph';
  host._g = g;
  drawGraph(opts);
  return host;
}
function mapping(g) {
  const [bx, by, bw, bh] = g.box, inset = 3;
  const W = bw - inset * 2, H = bh - inset * 2;
  const ox = g.o[0] - bx - inset, oy = g.o[1] - by - inset;
  return { W, H, X: (v) => ox + v * g.u[0], Y: (v) => oy - v * g.u[1], ox, oy,
    toGraph: (px, py) => [(px - ox) / g.u[0], (oy - py) / g.u[1]] };
}
function drawGraph(o = {}) {
  const host = $('#graph');
  if (!host) return;
  host._opts = o;
  const g = host._g, M = mapping(g), { W, H, X, Y } = M;
  const [x0, x1, y0, y1] = g.range, step = g.step || 1;
  const [al, ar, at, ab] = g.ax; // axes stop where the design's do
  const L = (a, b, cc, d, stroke, width = 2, extra = '') => `<line x1="${a}" y1="${b}" x2="${cc}" y2="${d}" stroke="${stroke}" stroke-width="${width}" ${extra}/>`;
  let s = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Coordinate grid${o.m != null ? `, line y equals ${o.m} x plus ${o.c || 0}` : ''}">
    <defs>
      <marker id="ah" viewBox="0 0 12 12" refX="10" refY="6" markerUnits="userSpaceOnUse" markerWidth="14" markerHeight="14" orient="auto-start-reverse"><path d="M2 2L10 6L2 10Z" fill="var(--axis)"/></marker>
      <marker id="ahl" viewBox="0 0 12 12" refX="9" refY="6" markerUnits="userSpaceOnUse" markerWidth="20" markerHeight="20" orient="auto-start-reverse"><path d="M2 1.5L10 6L2 10.5" fill="none" stroke="var(--orange)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></marker>
      <clipPath id="plot"><rect x="${al - 6}" y="${at - 6}" width="${W - al - ar + 12}" height="${H - at - ab + 12}"/></clipPath>
    </defs>`;
  // grid: every unit (every step on wide graphs), across the whole frame
  const dash = g.dashed ? 'stroke-dasharray="6 6"' : '';
  const gx = g.gridIn ? [al + 10, W - ar - 10] : [0, W], gy = g.gridIn ? [at + 10, H - ab - 10] : [0, H];
  for (let v = Math.ceil((gx[0] - M.ox) / g.u[0] / step) * step; X(v) <= gx[1]; v += step) s += L(X(v), gy[0], X(v), gy[1], '#DCE3EA', 1.5, dash);
  for (let v = Math.ceil((M.oy - gy[1]) / g.u[1] / step) * step; Y(v) >= gy[0]; v += step) s += L(gx[0], Y(v), gx[1], Y(v), '#DCE3EA', 1.5, dash);
  // axes with small arrowheads at both ends
  s += L(al, Y(0), W - ar, Y(0), 'var(--axis)', 2.2, 'marker-start="url(#ah)" marker-end="url(#ah)"');
  s += L(X(0), H - ab, X(0), at, 'var(--axis)', 2.2, 'marker-start="url(#ah)" marker-end="url(#ah)"');
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
  // the line y = mx + c, between the edges of the plot area, with arrowheads
  if (o.m != null) {
    const a = o.m, b = o.c || 0, lim = [al, W - ar, at, H - ab];
    // the line stops a little past the last tick (as drawn in the designs), and never beyond the axes
    const gx0 = Math.max(M.toGraph(lim[0], 0)[0], x0 - 0.55), gx1 = Math.min(M.toGraph(lim[1], 0)[0], x1 + 0.55);
    const gyTop = Math.min(M.toGraph(0, lim[2])[1], y1 + 0.7), gyBot = Math.max(M.toGraph(0, lim[3])[1], y0 - 0.7);
    const pts = [];
    for (const xv of [gx0, gx1]) { const yv = a * xv + b; if (yv <= gyTop + 1e-9 && yv >= gyBot - 1e-9) pts.push([xv, yv]); }
    if (a !== 0) for (const yv of [gyTop, gyBot]) { const xv = (yv - b) / a; if (xv >= gx0 - 1e-9 && xv <= gx1 + 1e-9) pts.push([xv, yv]); }
    const uniq = pts.filter((p, i) => pts.findIndex((q) => Math.abs(q[0] - p[0]) + Math.abs(q[1] - p[1]) < 1e-6) === i).sort((p, q) => p[0] - q[0]);
    if (uniq.length >= 2) {
      const [u, v] = [uniq[0], uniq[uniq.length - 1]];
      s += L(X(u[0]), Y(u[1]), X(v[0]), Y(v[1]), 'var(--orange)', 4, `stroke-linecap="round" marker-start="url(#ahl)" marker-end="url(#ahl)"`);
    }
    if (o.ends) for (const xv of [-4, 4]) { const yv = a * xv + b; if (yv >= y0 && yv <= y1) s += `<circle cx="${X(xv)}" cy="${Y(yv)}" r="12" fill="var(--orange)" stroke="#fff" stroke-width="4"/>`; }
  }
  const dot = (xv, yv, fill, r = 17) => `<circle cx="${X(xv)}" cy="${Y(yv)}" r="${r}" fill="${fill}" stroke="#fff" stroke-width="5"/>`;
  const tag = (xv, yv, label, fill, dx, dy, w = 130) => `<rect x="${X(xv) + dx}" y="${Y(yv) + dy}" width="${w}" height="40" rx="10" fill="${fill}"/><text x="${X(xv) + dx + w / 2}" y="${Y(yv) + dy + 28}" text-anchor="middle" style="fill:#fff;font-size:23px;font-weight:600">${label}</text>`;
  if (o.hint) {
    s += L(X(-2) + 20, Y(-2), X(2) - 4, Y(-2), '#1FA3E4', 3, 'stroke-dasharray="11 9" marker-end="url(#ahl)"');
    s += L(X(2), Y(-2) - 4, X(2), Y(2) + 22, '#14A86E', 3, 'stroke-dasharray="11 9" marker-end="url(#ahl)"');
    s += `<rect x="${X(0) - 11}" y="${Y(-2) + 14}" width="46" height="40" rx="9" fill="#CDEBFC"/><text x="${X(0) + 12}" y="${Y(-2) + 42}" text-anchor="middle" style="fill:#1C8FD8;font-size:25px;font-weight:700">4</text>`;
    s += `<rect x="${X(2) + 12}" y="${Y(0) - 3}" width="42" height="38" rx="9" fill="#D3F3E5"/><text x="${X(2) + 33}" y="${Y(0) + 24}" text-anchor="middle" style="fill:#12A066;font-size:25px;font-weight:700">4</text>`;
  }
  if (o.points) {
    s += dot(-2, -2, '#1EA1E6') + dot(2, 2, '#7A4BD8');
    s += o.hint ? tag(-2, -2, 'A (−2, −2)', '#1EA1E6', -50, 20, 126) + tag(2, 2, 'B (2, 2)', '#7A4BD8', -2, -62, 100)
      : tag(-2, -2, 'A (−2, −2)', '#2BA3E5', -24, 22, 130) + tag(2, 2, 'B (2, 2)', '#7A55D2', 31, -20, 106);
  }
  if (o.place) {
    s += dot(-2, -2, '#1EA1E6', 17) + `<text x="${X(-2) - 28}" y="${Y(-2) - 26}" style="fill:#1E9BE0;font-size:30px;font-weight:600">A</text>`;
    if (pointB) s += dot(pointB[0], pointB[1], '#7A4BD8', 17) + `<text x="${X(pointB[0]) + 22}" y="${Y(pointB[1]) - 22}" style="fill:#7A4BD8;font-size:30px;font-weight:600">B</text>`;
    else s += `<circle cx="${X(2)}" cy="${Y(2)}" r="30" fill="#EFE6FD" stroke="#B89BEF" stroke-width="2" stroke-dasharray="6 5"/><circle cx="${X(2)}" cy="${Y(2)}" r="17" fill="#C9B2F4" stroke="#A985EE" stroke-width="2"/>`;
  }
  if (o.success) s += dot(-2, -2, '#7547CD', 17);
  if (o.wide) s += dot(0, 1, '#5A35B8', 15) + dot(10, 6, '#5A35B8', 15);
  if (o.targets) {
    for (const [tx, ty] of TARGETS) {
      const hit = Math.abs(m * tx + c - ty) < 0.08, col = hit ? '#0FA36C' : '#7A4BD8', halo = hit ? '#D3F1E4' : '#E9DEFC';
      s += `<circle cx="${X(tx)}" cy="${Y(ty)}" r="38" fill="${halo}" opacity=".9"/>` + dot(tx, ty, col, 15);
      if (hit) s += `<circle cx="${X(tx) + 28}" cy="${Y(ty) - 37}" r="15" fill="#0FA36C" stroke="#fff" stroke-width="3"/><path d="M${X(tx) + 21} ${Y(ty) - 37}l5 5 9-10" fill="none" stroke="#fff" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/>`;
    }
  }
  s += '</svg>';
  host.innerHTML = s;
  if (o.place) wirePlacement(host, M);
}
const TARGETS = [[2, 1], [-2, -3]];

// Screen 3: click/tap the grid (or use the arrow keys) to place B; snaps to whole numbers in −4…4.
function wirePlacement(host, M) {
  const svg = host.querySelector('svg');
  svg.setAttribute('tabindex', '0');
  svg.setAttribute('role', 'application');
  svg.setAttribute('aria-label', 'Place point B. Click the grid or use the arrow keys; Enter confirms.');
  const place = ([px, py]) => {
    pointB = [Math.max(-4, Math.min(4, px)), Math.max(-4, Math.min(4, py))];
    drawGraph({ place: true });
    $('#b-label').textContent = `B (${pointB.map(fmt).join(', ')})`;
    $('#confirm-b').hidden = false;
    announce($('#b-label').textContent);
    $('#graph svg').focus();
  };
  svg.addEventListener('pointerdown', (e) => {
    const pt = svg.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY;
    const p = pt.matrixTransform(svg.getScreenCTM().inverse());
    const [gx, gy] = M.toGraph(p.x, p.y);
    place([Math.round(gx), Math.round(gy)]);
  });
  svg.addEventListener('keydown', (e) => {
    const moves = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, 1], ArrowDown: [0, -1] };
    const a = pointB || [2, 2];
    if (moves[e.key]) { e.preventDefault(); place([a[0] + moves[e.key][0], a[1] + moves[e.key][1]]); }
    if (e.key === 'Enter' && pointB) confirmB();
  });
}

// ---------- equation badge, answer fields, tries ----------
function exprHTML(mv, cv) {
  if (mv === 0) return fmt(cv);
  const mt = mv === 1 ? '' : mv === -1 ? MINUS : fmt(mv);
  return `${mt}x${cv === 0 ? '' : cv > 0 ? ` + ${cv}` : ` ${MINUS} ${Math.abs(cv)}`}`;
}
function equation(x, y, w, h, cls = '') {
  const el = node('div', `equation ${cls}`, x, y, w, h);
  el.id = 'equation';
  updateEquation();
  return el;
}
function updateEquation() {
  const el = $('#equation');
  if (!el) return;
  el.innerHTML = el.classList.contains('peach') ? `y = ${exprHTML(m, c)}` : `y = <span class="num">${exprHTML(m, c)}</span>`;
}
function field(id, label, x, y, w, h, kind = '', value = '') {
  const el = node('label', `field ${kind}`, x, y, w, h, `<b>${label}</b><input id="${id}" type="text" inputmode="decimal" autocomplete="off" spellcheck="false" aria-label="${label.replace('=', '').trim()}" value="${value}">`);
  return el.querySelector('input');
}
function tries(x, y, w, withDots = true) {
  const el = node('div', 'tries', x, y, w, 0);
  el.id = 'tries';
  el._dots = withDots;
  renderTries();
  return el;
}
function renderTries() {
  const el = $('#tries');
  if (!el) return;
  el.innerHTML = (el._dots ? `<div class="dots">${[0, 1, 2].map((i) => `<i class="${i < attempts ? '' : 'used'}"></i>`).join('')}</div>` : '')
    + `${attempts} ${attempts === 1 ? 'try' : 'tries'}`;
}
const announce = (s) => { $('#live').textContent = ''; requestAnimationFrame(() => { $('#live').textContent = s; }); };

// ---------- sliders (custom-drawn track and thumb over a native range input) ----------
function slider(key, cfg) {
  const { track: [x0, x1, ty], min, max, step, chip, lim, val, fill, compact } = cfg;
  const wrap = node('div', `slider ${key} ${compact ? 'compact' : ''}`, 0, 0, 1672, 941);
  wrap.style.pointerEvents = 'none';
  const v0 = key === 'm' ? m : c;
  wrap.innerHTML = `<span class="key" style="${box(...chip)}">${key}</span>
    <span class="track" style="left:${x0}px;top:${ty - 5}px;width:${x1 - x0}px"><span class="fill"></span></span>
    <input type="range" min="${min}" max="${max}" step="${step}" value="${v0}" aria-label="${key === 'm' ? 'Gradient, m' : 'Y-intercept, c'}"
      style="left:${x0 - 21}px;top:${ty - 28}px;width:${x1 - x0 + 42}px;pointer-events:auto">
    <span class="thumb"></span>
    <span class="lim" style="${lim.style[0]}">${fmt(min)}</span><span class="lim" style="${lim.style[1]}">${fmt(max)}</span>
    <span class="val"></span>`;
  const input = wrap.querySelector('input'), thumb = wrap.querySelector('.thumb'), out = wrap.querySelector('.val'), fl = wrap.querySelector('.fill');
  if (fill) fl.style.background = key === 'm' ? 'var(--orange)' : 'var(--purple)';
  const place = () => {
    const v = +input.value, f = (v - min) / (max - min), cx = x0 + f * (x1 - x0);
    thumb.style.left = cx - 21 + 'px'; thumb.style.top = ty - 21 + 'px';
    out.textContent = fmt(+v.toFixed(2));
    const vw = compact ? 92 : 100;
    out.style.left = cx - vw / 2 + 'px'; out.style.top = val.top + 'px';
    fl.style.width = f * (x1 - x0) + 'px';
    input.setAttribute('aria-valuetext', `${key} = ${fmt(+v.toFixed(2))}`);
  };
  input.addEventListener('input', () => {
    const v = +input.value;
    if (key === 'm') m = v; else c = v;
    place();
    drawGraph({ ...$('#graph')._opts, m, c });
    updateEquation();
    updateHits();
  });
  place();
  return input;
}

// ---------- modal (kept inside the scaled stage so it lines up with the design) ----------
const MODAL_DECO = `<svg class="deco" viewBox="0 0 572 460" preserveAspectRatio="none" aria-hidden="true">
  <path fill="#F1F2F4" d="M88 70l10 22 22-12-6 24 24 4-21 12 14 20-24-6-4 24-12-21-20 14 6-24-24-4 21-12-14-20 24 6z"/>
  <path fill="none" stroke="#F1F2F4" stroke-width="26" stroke-linecap="round" d="M470 -10c-40 20-30 60 10 70s50 50 20 80"/>
  <path fill="#F3F4F6" d="M462 470c-10-36 20-58 44-44 8-26 50-24 54 6 26 0 30 34 12 46z"/></svg>`;
function modal({ title, body, pose, action = 'Continue', onAction, remaining = null, success = false, width = 572 }) {
  closeModal(false);
  const returnFocus = document.activeElement;
  const art = POSE[pose];
  const artW = pose === 'success' ? 226 : pose === 'almost' ? 142 : 150;
  const confetti = success ? `<svg viewBox="0 0 300 190" style="position:absolute;left:50%;top:0;width:300px;height:190px;transform:translateX(-50%)" aria-hidden="true" fill="none" stroke-linecap="round" stroke-width="9">
      <path d="M38 63l-14-8" stroke="#7A4BD8"/><path d="M85 22l-6-12" stroke="#F2A12E"/><path d="M228 56l12-9" stroke="#FE6011"/><path d="M252 100l14-5" stroke="#12AA75"/></svg>` : '';
  const el = document.createElement('div');
  el.className = 'modal';
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-modal', 'true');
  el.setAttribute('aria-labelledby', 'modal-title');
  el.style.cssText = `left:${(1672 - width) / 2}px;width:${width}px;`;
  el.innerHTML = `<div class="inner">${MODAL_DECO}
    <div class="art" style="width:${artW}px">${confetti}<img src="${art.src}" alt=""></div>
    <h2 id="modal-title">${title}</h2><p class="${success ? 'success' : ''}">${body}</p>
    <button class="btn" type="button" id="modal-button">${action}</button>${remaining !== null ? `<small>${remaining} ${remaining === 1 ? 'try' : 'tries'} left</small>` : ''}</div>`;
  modalHost.append(el);
  scrim.hidden = false;
  scene.inert = true; $('.header').inert = true;
  modalOpen = { el, returnFocus };
  $('#modal-button').addEventListener('click', () => { closeModal(); onAction?.(); });
  $('#modal-button').focus();
  announce(`${title}. ${el.querySelector('p').textContent}`);
}
function closeModal(restore = true) {
  if (!modalOpen) return;
  const { el, returnFocus } = modalOpen;
  el.remove(); scrim.hidden = true; scene.inert = false; $('.header').inert = false; modalOpen = null;
  if (restore && returnFocus?.isConnected) returnFocus.focus();
}
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && modalOpen) { e.preventDefault(); closeModal(); }
  if (e.key === 'Tab' && modalOpen) { e.preventDefault(); $('#modal-button').focus(); } // the dialog has one control
});

// ---------- checking ----------
function success(message, next) { modal({ title: 'You got it!', body: message, pose: 'success', action: 'Continue', onAction: () => go(next), success: true }); }
function failure(message) {
  attempts = Math.max(0, attempts - 1);
  renderTries();
  const out = attempts === 0;
  modal({ title: 'Almost!', body: out ? `${message} Let’s practise this step again.` : message, pose: 'almost',
    action: out ? 'Practise again' : 'Try again', remaining: attempts,
    onAction: () => { if (out) { attempts = 3; renderTries(); } } });
}
function numeric(id) {
  const raw = ($('#' + id)?.value || '').trim().replace(/[−–]/g, '-');
  if (!raw || !/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(raw)) return null;
  return Number(raw);
}
function check(fields, answers, next, message) {
  const nums = fields.map(numeric);
  const bad = nums.findIndex((v) => v === null || !Number.isFinite(v));
  if (bad >= 0) { announce('Enter a number in each answer box.'); $('#' + fields[bad]).focus(); return; } // blank or non-numeric: no try used
  if (nums.every((v, i) => Math.abs(v - answers[i]) < 1e-6)) return success(message, next);
  failure(fields.includes('c-answer') && Math.abs(nums[0] - answers[0]) < 1e-6 ? 'Check where the line crosses the y-axis.' : 'Check the rise and run, then try again.');
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
  const rings = TARGETS.map(([x, y]) => Math.abs(m * x + c - y) < 0.08
    ? `<span class="ring hit"><i></i><span class="ok">${ICON.check.replace('width="22" height="22"', 'width="13" height="13"')}</span></span>` : '<span class="ring miss"><i></i></span>');
  el.innerHTML = `${rings.join('')}<span class="sep"></span>${hitCount()} / 2`;
  el.setAttribute('aria-label', `${hitCount()} of 2 targets hit`);
}

// ---------- navigation ----------
function go(n) {
  clearInterval(walkTimer);
  closeModal(false);
  if (typeof speechSynthesis !== 'undefined') speechSynthesis.cancel();
  $('#audio').setAttribute('aria-pressed', 'false');
  const keepTries = [4, 5].includes(page) && [4, 5].includes(n);
  page = n;
  if (!keepTries) attempts = 3;
  pointB = null; selected = null;
  scene.innerHTML = '';
  if (location.hash !== '#' + n) history.replaceState(null, '', '#' + n);
  PAGES[n]();
  scene.querySelectorAll('input[type=text]').forEach((el) => el.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') [...scene.querySelectorAll('button')].find((b) => /^Check/.test(b.textContent.trim()))?.click();
  }));
  announce(`Screen ${n}`);
}

// =====================================================================================
// The fourteen screens
// =====================================================================================
function renderWelcome() {
  mascot('wave');
  burst(476, 392, '#FE6011', [-62, -22], 18, 18, 6);
  burst(1318, 318, '#FE6011', [-68, -32], 30, 14, 9);
  // dotted segments and a little axes sketch
  svgLayer(`<g stroke-width="4" stroke-dasharray="11 9" stroke-linecap="round">
      <line x1="537" y1="268" x2="650" y2="196" stroke="#2D9BE8"/><line x1="1467" y1="318" x2="1580" y2="247" stroke="#F26A22"/>
      <line x1="1420" y1="572" x2="1508" y2="508" stroke="#8D5BE0"/></g>
    <circle cx="537" cy="268" r="10" fill="#2D9BE8"/><circle cx="650" cy="196" r="10" fill="#2D9BE8"/>
    <circle cx="1467" cy="318" r="10" fill="#F26A22"/><circle cx="1580" cy="247" r="10" fill="#F26A22"/>
    <g stroke="#7A4BD8" stroke-width="3.5" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M1420 612V464M1409 476l11-12 11 12M1384 574h166M1538 563l12 11-12 11"/></g>
    <circle cx="1510" cy="506" r="10" fill="#7A4BD8"/>`);
  text('Gradient Lab', 618, 262, 790, 158, 'hand', 'color:#0B2C4C;letter-spacing:-1px;-webkit-text-stroke:.05em #0B2C4C;text-shadow:0 0 8px #fff,0 0 14px #fff');
  text('Let’s make some lines!', 750, 438, 620, 66, 'hand', 'color:#0B2C4C;white-space:nowrap');
  const play = button(`Let’s play <span style="margin-left:6px">${ICON.arrowR}</span>`, 751, 557, 493, () => go(2), '', 92);
  play.style.fontSize = '38px'; play.style.fontWeight = '500';
  button('How to play', 842, 692, 313, () => modal({ title: 'How to play', body: 'Move the sliders, place points, and use up ÷ across to find the gradient.', pose: 'point', action: 'Let’s play', onAction: () => go(2) }), 'outline', 70);
}

function renderLineLab() {
  m = 0; c = 0;
  equation(612, 89, 240, 64);
  graph(2, { m, c, ends: true });
  bubble('Make the line climb!', 1183, 235, 362, 106, 44, [1338, 330, 1347, 378]);
  mascot('point');
  slider('m', { track: [198, 614, 797], min: -4, max: 4, step: 0.25, chip: [95, 767, 74, 74], val: { top: 830 },
    lim: { style: ['left:198px;top:819px', 'left:600px;top:819px'] } });
  slider('c', { track: [810, 1226, 797], min: -6, max: 6, step: 0.25, chip: [707, 767, 74, 74], val: { top: 830 },
    lim: { style: ['left:810px;top:819px', 'left:1212px;top:819px'] } });
  const walk = button(`${ICON.walk} Walk the line`, 1302, 785, 308, () => {
    if (m <= 0) { modal({ title: 'Make it climb!', body: 'Move m above zero so the line rises from left to right.', pose: 'point', action: 'Try again' }); return; }
    walkLine();
  }, '', 80);
  walk.style.fontSize = '30px';
}
function walkLine() {
  const host = $('#graph'), M = mapping(host._g), svg = host.querySelector('svg');
  const dotEl = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  dotEl.setAttribute('r', '13'); dotEl.setAttribute('fill', '#19A6E6'); dotEl.setAttribute('stroke', '#fff'); dotEl.setAttribute('stroke-width', '4');
  dotEl.classList.add('walk-dot');
  svg.append(dotEl);
  let i = 0;
  clearInterval(walkTimer);
  walkTimer = setInterval(() => {
    const x = -4 + (8 * i) / 45, y = m * x + c;
    dotEl.setAttribute('cx', M.X(x)); dotEl.setAttribute('cy', M.Y(y));
    dotEl.setAttribute('visibility', y < -4.6 || y > 4.6 ? 'hidden' : 'visible');
    if (++i > 45) { clearInterval(walkTimer); go(3); }
  }, matchMedia('(prefers-reduced-motion: reduce)').matches ? 1 : 30);
}

function renderPlace() {
  graph(3, { place: true });
  bubble('Now place B', 1037, 306, 276, 114, 48, [1286, 392, 1325, 428]);
  mascot('side');
  node('div', 'chip-point a', 1020, 570, 223, 71, '<span class="dot"></span>A (−2, −2)');
  node('div', 'chip-point b', 1020, 662, 223, 71, '<span class="dot"></span><span id="b-label">B (?, ?)</span>');
  const bulb = node('button', 'round', 1516, 404, 80, 80, `<span style="color:#C99500">${ICON.bulb}</span>`);
  bulb.style.cssText += 'background:#FFE36A;border-color:#F2C935;';
  bulb.setAttribute('aria-label', 'Show a hint for placing point B');
  bulb.addEventListener('click', () => modal({ title: 'Place point B', body: 'Move two units right and two units up from the origin.', pose: 'think', action: 'Try it' }));
  const reset = node('button', 'round', 279, 853, 68, 68, ICON.reset);
  reset.setAttribute('aria-label', 'Reset point B');
  reset.addEventListener('click', () => go(3));
  const cont = button('Continue', 1020, 790, 223, confirmB, '', 70);
  cont.id = 'confirm-b'; cont.hidden = true; cont.style.fontSize = '27px';
}

function renderGradient(hint) {
  graph(hint ? 5 : 4, { m: 1, c: 0, points: true, hint });
  const checkIt = () => check(['m-answer'], [1], 6, '4 ÷ 4 = 1');
  if (hint) {
    const b = bubble(`What’s the gradient?<div style="margin-top:14px"><span class="hintpill"><span style="color:#E2B007">${ICON.bulb}</span>Up ÷ across</span></div><button class="hintlink" id="hide-hint" type="button">Hide hint</button>`, 1060, 182, 428, 214, 48, [1300, 386, 1336, 446]);
    b.querySelector('#hide-hint').addEventListener('click', () => go(4));
    mascot('hint');
    // glowing bulb beside Fitila
    svgLayer(`<g stroke="#F5C400" stroke-width="6" stroke-linecap="round"><line x1="1542" y1="356" x2="1544" y2="344"/><line x1="1512" y1="364" x2="1506" y2="354"/><line x1="1574" y1="372" x2="1584" y2="364"/><line x1="1584" y1="402" x2="1596" y2="402"/></g>
      <path d="M1534 380a26 26 0 0 1 16 47c-3 3-4 6-4 9v6h-22v-6c0-3-2-6-4-9a26 26 0 0 1 14-47z" fill="#FFE04D" stroke="#F2BE16" stroke-width="3"/>
      <rect x="1523" y="444" width="24" height="14" rx="4" fill="#C9C9C9"/>`, 2);
    node('div', 'measure across', 273, 777, 283, 93, `<span>Across</span><b>4</b><span style="color:#1C8FD8">${ICON.arrowR}</span>`);
    node('div', 'measure up', 575, 777, 250, 93, `<span>Up</span><b>4</b><span style="color:#129A63">${ICON.arrowUp}</span>`);
    field('m-answer', 'm =', 846, 779, 213, 90, '').parentElement.style.cssText += 'gap:12px;padding:0 24px 0 28px;';
    button('Check', 1092, 786, 234, checkIt, '', 72);
  } else {
    burst(1112, 225, '#F5C400', [200, 240, 285], 26, 14, 7);
    const b = bubble('What’s the<br>gradient?', 1077, 230, 256, 142, 46, [1318, 330, 1352, 352]);
    b.style.cursor = 'pointer';
    b.setAttribute('role', 'button'); b.tabIndex = 0;
    b.setAttribute('aria-label', 'What’s the gradient? Show a hint');
    b.addEventListener('click', () => go(5));
    b.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(5); } });
    mascot('wing');
    field('m-answer', 'm =', 1064, 592, 311, 93);
    button('Check', 1064, 702, 312, checkIt, '', 62);
    node('div', 'pill blue', 341, 794, 262, 78, `<span style="color:#1C9BE6">${ICON.arrowR}</span>Across 4`);
    node('div', 'pill green', 620, 794, 261, 78, `<span style="color:#17A56C">${ICON.arrowUp}</span>Up 4`);
  }
}

function renderMC(feedback) {
  graph(feedback ? 13 : 6, { m: 1, c: 1 });
  const checkIt = () => check(['m-answer', 'c-answer'], [1, 1], 7, 'm = 1, c = 1');
  if (!feedback) {
    bubble('Find m and c.', 935, 240, 367, 143, 54, [1288, 340, 1345, 366]);
    burst(1378, 318, '#F5C400', [235, 270], 28, 12, 7);
    mascot('wingwave');
    field('m-answer', 'm', 898, 459, 184, 86, 'tag');
    field('c-answer', 'c', 1101, 459, 184, 86, 'tag purple');
    button('Check', 905, 590, 371, checkIt, '', 66);
    tries(990, 690, 200);
  } else {
    text('Find m and c.', 1183, 285, 400, 54);
    field('m-answer', 'm', 1145, 452, 193, 86, 'tag', '1');
    field('c-answer', 'c', 1361, 452, 196, 86, 'tag purple', '0');
    button('Check', 1163, 582, 389, checkIt, '', 66);
    attempts = 2;
    modal({ title: 'Almost!', body: 'Check where the line crosses the y-axis.', pose: 'almost', action: 'Try again', remaining: 2 });
  }
}

function renderCoordinates() {
  mascot('think');
  bubble('Find the line’s equation.', 1146, 208, 363, 92, 37, [1238, 290, 1262, 345]);
  svgLayer('<path d="M628 383Q720 330 808 378" stroke="#CBD5DF" stroke-width="7" stroke-linecap="round" fill="none" stroke-dasharray="12 16"/>');
  burst(372, 262, '#3EA9EC', [200, 245], 28, 12, 7);
  burst(1046, 262, '#7A55D6', [-20, -65], 28, 12, 7);
  node('div', 'coord', 360, 274, 264, 214, '<span class="badge">A</span>(−2, −2)');
  node('div', 'coord purple', 811, 270, 254, 216, '<span class="badge">B</span>(2, 2)');
  field('m-answer', 'm', 372, 569, 309, 112, 'cream').parentElement.style.cssText += 'gap:26px;padding:0 22px 0 44px;font-size:40px;';
  field('c-answer', 'c', 765, 569, 310, 112, 'cream').parentElement.style.cssText += 'gap:26px;padding:0 22px 0 44px;font-size:40px;';
  button('Check Answer', 518, 720, 403, () => check(['m-answer', 'c-answer'], [1, 0], 8, 'm = 1, c = 0'), '', 76);
  const t = tries(945, 748, 120, false);
  t.style.cssText += 'font-size:24px;color:var(--ink);text-align:left;';
}

function renderMissing() {
  m = 1; c = 1;
  graph(8, { m, c });
  equation(417, 115, 239, 70, 'peach');
  bubble('Find the missing number.', 939, 195, 528, 122, 52, [1338, 308, 1378, 372]);
  mascot('puzzled');
  text('?', 1520, 322, 70, 96, 'hand', 'color:#F5A21B;font-weight:700;text-shadow:0 3px 0 #E07B12;transform:rotate(12deg)');
  node('div', 'qcard', 998, 404, 260, 144, '<span>(2, <span class="q">?</span>)</span>');
  field('y-answer', 'y =', 946, 584, 363, 97, 'soft');
  button('Check', 946, 705, 364, () => check(['y-answer'], [3], 11, '2 + 1 = 3'), '', 66);
  tries(1046, 790, 164, false);
}

function renderIntercept() {
  graph(9, { m: 0.5, c: 1, wide: true });
  bubble('What is the y-intercept<br>of this line?', 1203, 195, 344, 135, 35, [1330, 320, 1352, 358]);
  const t = POSE.think;
  mascot('think', [1297, 355, Math.round(350 * t.box[2] / t.box[3]), 350]);
  const values = [-2, -1, 1, 5];
  values.forEach((v, i) => {
    const b = node('button', 'choice', [148, 503, 853, 1204][i], 733, [320, 316, 315, 320][i], 72,
      `<span class="letter">${'ABCD'[i]}</span>${fmt(v)}<span class="tick">${ICON.check.replace('#fff', '#C94A10').replace('width="22" height="22"', 'width="18" height="18"')}</span>`);
    b.type = 'button';
    b.setAttribute('aria-label', `Answer ${'ABCD'[i]}: ${fmt(v)}`);
    b.addEventListener('click', () => { selected = i; scene.querySelectorAll('.choice').forEach((x) => x.classList.toggle('selected', x === b)); });
  });
  const hint = button(`<span>${ICON.bulb}</span>Hint`, 83, 834, 149, () => modal({ title: 'Hint', body: 'The y-intercept is the y-value where x = 0.', pose: 'think', action: 'Try again' }), 'yellow', 64);
  hint.style.fontSize = '28px'; hint.style.gap = '10px';
  const ask = button(`<span>${ICON.pencil}</span>Ask Fitila`, 261, 834, 204, () => modal({ title: 'Find the crossing', body: 'Follow the vertical y-axis up to the orange line.', pose: 'think', action: 'Try again' }), 'sky', 64);
  ask.style.fontSize = '28px'; ask.style.gap = '10px';
  button('Check Answer', 1327, 834, 270, () => {
    if (selected === null) { announce('Choose an answer first.'); return; }
    if (values[selected] === 1) success('The y-intercept is 1.', 10);
    else failure('Check where the line crosses y.');
  }, '', 62).style.fontSize = '24px';
  // reference state: a wrong answer chosen, retry overlay showing
  selected = 1;
  scene.querySelectorAll('.choice')[selected].classList.add('selected');
  attempts = 2;
  modal({ title: 'Almost!', body: 'Check where the line crosses y.', pose: 'almost', action: 'Try again', remaining: 2,
    onAction: () => { selected = null; scene.querySelectorAll('.choice').forEach((b) => b.classList.remove('selected')); } });
}

function renderComplete() {
  mascot('celebrate');
  svgLayer(`<path d="M951 140l7 18 18 7-18 7-7 18-7-18-18-7 18-7z" fill="#F57A2A"/>
    <path d="M1018 418l6 16 16 6-16 6-6 16-6-16-16-6 16-6z" fill="#FFD233"/>
    <g fill="#3EA9EC"><circle cx="617" cy="367" r="10"/>${[0, 45, 90, 135, 180, 225, 270, 315].map((a) => `<rect x="614" y="343" width="6" height="16" rx="3" transform="rotate(${a} 617 367)"/>`).join('')}</g>
    <g stroke="#3EA9EC" stroke-width="5" stroke-linecap="round"><path d="M596 240l20 14M612 226l10 22M1062 312l26-14M1070 296l14-10"/></g>`);
  text('Brilliant work!', 500, 580, 675, 100, 'hand', 'text-align:center;color:#0B2C4C');
  node('div', 'done-line', 600, 690, 480, 46, `<i>${ICON.check}</i>Activity complete`);
  button('Back to lesson', 669, 776, 336, () => { window.dispatchEvent(new CustomEvent('gradientlab:complete', { detail: { completed: true } })); go(1); }, '', 66).style.fontSize = '24px';
}

function renderTargets() {
  m = 0.5; c = 0;
  graph(11, { m, c, targets: true });
  equation(559, 102, 251, 52, 'peach orange-text');
  $('#equation').style.cssText += 'font-family:var(--ui);font-weight:500;font-size:38px;line-height:48px;';
  bubble('Hit both targets!', 1245, 207, 323, 111, 44, [1296, 308, 1302, 360]);
  mascot('raise');
  slider('m', { track: [457, 942, 770], min: -4, max: 4, step: 0.25, chip: [325, 741, 61, 56], val: { top: 716 }, fill: true, compact: true,
    lim: { style: ['left:421px;top:758px', 'left:960px;top:758px'] } });
  slider('c', { track: [457, 942, 867], min: -8, max: 8, step: 0.25, chip: [325, 838, 61, 56], val: { top: 812 }, fill: true, compact: true,
    lim: { style: ['left:421px;top:855px', 'left:960px;top:855px'] } });
  const h = node('div', 'target-count', 1052, 727, 293, 79, '');
  h.id = 'hits';
  h.setAttribute('role', 'status');
  updateHits();
  button('Check', 1022, 822, 350, () => (hitCount() === 2 ? success('Both targets hit!', 10) : failure('Move m and c until the line passes through both targets.')), '', 66);
}

function renderSuccess(single) {
  graph(single ? 14 : 12, { m: 1, c: 0, success: true });
  if (!single) {
    bubble('Great work!', 1152, 233, 262, 107, 40, [1290, 330, 1312, 378]);
    mascot('thumbs');
  }
  modal({ title: 'You got it!', body: '4 ÷ 4 = 1', pose: 'success', action: 'Continue', onAction: () => go(6), success: true });
}

const PAGES = { 1: renderWelcome, 2: renderLineLab, 3: renderPlace, 4: () => renderGradient(false), 5: () => renderGradient(true),
  6: () => renderMC(false), 7: renderCoordinates, 8: renderMissing, 9: renderIntercept, 10: renderComplete, 11: renderTargets,
  12: () => renderSuccess(false), 13: () => renderMC(true), 14: () => renderSuccess(true) };

// ---------- stage scaling, header controls, start ----------
function resize() { stage.style.transform = `translate(-50%, -50%) scale(${Math.min(innerWidth / 1672, innerHeight / 941)})`; }
addEventListener('resize', resize);
resize();
addEventListener('hashchange', () => { const n = Number(location.hash.slice(1)); if (PAGES[n] && n !== page) go(n); });
$('#audio').addEventListener('click', () => {
  const btn = $('#audio');
  if (!('speechSynthesis' in window)) { announce('Reading aloud is not available in this browser.'); return; }
  if (speechSynthesis.speaking) { speechSynthesis.cancel(); btn.setAttribute('aria-pressed', 'false'); return; }
  const words = modalOpen ? modalOpen.el.innerText : [...scene.querySelectorAll('.bubble, .hand')].map((e) => e.innerText).join('. ');
  const u = new SpeechSynthesisUtterance(words);
  u.onend = () => btn.setAttribute('aria-pressed', 'false');
  btn.setAttribute('aria-pressed', 'true');
  speechSynthesis.speak(u);
});
$('#exit').addEventListener('click', () => modal({ title: 'Leave Gradient Lab?', body: 'You can come back to the welcome screen.', pose: 'think', action: 'Back to start', onAction: () => go(1) }));
// wait for Patrick Hand and SN Pro so the first screen is laid out in the real type
const start = () => go(PAGES[Number(location.hash.slice(1))] ? Number(location.hash.slice(1)) : 1);
Promise.all([document.fonts.load('40px "Patrick Hand"'), document.fonts.load('600 30px "SN Pro"'), document.fonts.load('500 22px "SN Pro"')])
  .catch(() => {}).finally(start);
