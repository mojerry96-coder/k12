// SVG string builders for the coordinate grid. Pure (no DOM) so they serve the live graph,
// mini example graphs and tests alike. Square plot, equal units, -8..8, numbered every 2.
import { VIEW, PAD, px, py, MINUS } from './math.js';

const lbl = (v) => (v < 0 ? MINUS + Math.abs(v) : String(v));

export function gridSVG({ clipId, every = 2, font = 15, axisLabels = true } = {}) {
  let g = `<defs><clipPath id="${clipId}"><rect x="${PAD}" y="${PAD}" width="${VIEW - 2 * PAD}" height="${VIEW - 2 * PAD}"/></clipPath>`
    + `<marker id="${clipId}-ar" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" class="axis-head"/></marker></defs>`;
  g += `<rect class="plot-bg" x="${PAD}" y="${PAD}" width="${VIEW - 2 * PAD}" height="${VIEW - 2 * PAD}"/>`;
  let lines = '';
  for (let i = -8; i <= 8; i++) {
    const cls = i % 2 === 0 ? 'grid major' : 'grid';
    lines += `<line class="${cls}" x1="${px(i)}" y1="${py(-8)}" x2="${px(i)}" y2="${py(8)}"/>`;
    lines += `<line class="${cls}" x1="${px(-8)}" y1="${py(i)}" x2="${px(8)}" y2="${py(i)}"/>`;
  }
  g += `<g aria-hidden="true">${lines}`;
  g += `<line class="axis" x1="${px(-8) - 14}" y1="${py(0)}" x2="${px(8) + 14}" y2="${py(0)}" marker-start="url(#${clipId}-ar)" marker-end="url(#${clipId}-ar)"/>`;
  g += `<line class="axis" x1="${px(0)}" y1="${py(-8) + 14}" x2="${px(0)}" y2="${py(8) - 14}" marker-start="url(#${clipId}-ar)" marker-end="url(#${clipId}-ar)"/>`;
  let t = '';
  for (let i = -8; i <= 8; i += every) {
    if (i === 0) continue;
    t += `<line class="tick" x1="${px(i)}" y1="${py(0) - 5}" x2="${px(i)}" y2="${py(0) + 5}"/>`;
    t += `<line class="tick" x1="${px(0) - 5}" y1="${py(i)}" x2="${px(0) + 5}" y2="${py(i)}"/>`;
    t += `<text class="tick-label" x="${px(i)}" y="${py(0) + font + 6}" text-anchor="middle" font-size="${font}">${lbl(i)}</text>`;
    t += `<text class="tick-label" x="${px(0) - 9}" y="${py(i) + font / 3}" text-anchor="end" font-size="${font}">${lbl(i)}</text>`;
  }
  t += `<text class="tick-label" x="${px(0) - 8}" y="${py(0) + font + 4}" text-anchor="end" font-size="${font}">0</text>`;
  if (axisLabels) {
    t += `<text class="axis-label" x="${px(8) + 16}" y="${py(0) - 10}" font-size="${font + 3}">x</text>`;
    t += `<text class="axis-label" x="${px(0) + 12}" y="${py(8) - 10}" font-size="${font + 3}">y</text>`;
  }
  return g + t + '</g>';
}

// A line y = mx + c drawn well past the plot and clipped to it.
export const lineSVG = (m, c, cls = 'main-line', clipId = 'plot-clip') =>
  `<line class="${cls}" clip-path="url(#${clipId})" x1="${px(-12)}" y1="${py(m * -12 + c)}" x2="${px(12)}" y2="${py(m * 12 + c)}"/>`;

export const verticalSVG = (x, cls = 'main-line', clipId = 'plot-clip') =>
  `<line class="${cls}" clip-path="url(#${clipId})" x1="${px(x)}" y1="${py(-12)}" x2="${px(x)}" y2="${py(12)}"/>`;

export function miniGraphSVG({ m, c, targets = [], points = [], label }) {
  const id = 'mini' + Math.random().toString(36).slice(2, 8);
  let s = `<svg class="mini-graph" viewBox="0 0 ${VIEW} ${VIEW}" role="img" aria-label="${label}">`;
  s += gridSVG({ clipId: id, every: 4, font: 30, axisLabels: false });
  s += lineSVG(m, c, 'main-line thick', id);
  for (const t of targets) s += `<circle class="target hit" cx="${px(t.x)}" cy="${py(t.y)}" r="16"/>`;
  for (const p of points) s += `<circle class="pt-dot" cx="${px(p.x)}" cy="${py(p.y)}" r="11"/>`;
  return s + '</svg>';
}
