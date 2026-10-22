// Bundles src/ into dist/index.html (fonts, art and styles inlined) and copies Fitila's clips to dist/media/.
import { readFileSync, writeFileSync, mkdirSync, cpSync, rmSync, existsSync } from 'node:fs';
import { join, dirname, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const read = (p) => readFileSync(join(root, p), 'utf8');
const MIME = { '.webp': 'image/webp', '.png': 'image/png', '.ttf': 'font/ttf', '.svg': 'image/svg+xml' };
const inline = (text) => text.replace(/assets\/[\w/.\-]+\.(webp|png|ttf|svg)/g, (path) =>
  `data:${MIME[extname(path)]};base64,${readFileSync(join(root, path)).toString('base64')}`);
// clip metadata (where Fitila's resting pose sits in each clip) goes straight into the script
const clips = existsSync(join(root, 'media/fitila/clips.json')) ? read('media/fitila/clips.json') : '{}';
const js = read('src/app.js').replace('/*CLIPS*/ {}', clips);

let html = read('src/index.html');
html = html.replace('<link rel="stylesheet" href="styles.css">', () => `<style>\n${inline(read('src/styles.css'))}</style>`);
html = html.replace('<script src="app.js"></script>', () => `<script>\n${inline(js)}</script>`);
html = inline(html);
mkdirSync(join(root, 'dist'), { recursive: true });
writeFileSync(join(root, 'dist', 'index.html'), html);
rmSync(join(root, 'dist', 'media'), { recursive: true, force: true });
cpSync(join(root, 'media'), join(root, 'dist', 'media'), { recursive: true, filter: (p) => !p.endsWith('clips.json') });
// still cut-outs (reduced motion, or video unavailable) are chosen at run time, so they ship as files
rmSync(join(root, 'dist', 'assets'), { recursive: true, force: true });
cpSync(join(root, 'assets', 'fitila'), join(root, 'dist', 'assets', 'fitila'), { recursive: true, filter: (p) => !p.endsWith('.png') && !p.endsWith('.json') });
console.log(`dist/index.html  ${(html.length / 1024).toFixed(0)} KB  (+ dist/media)`);
