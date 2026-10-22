// Bundles src/ into one self-contained page: dist/index.html (fonts and art inlined).
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const read = (p) => readFileSync(join(root, p), 'utf8');
const MIME = { '.webp': 'image/webp', '.png': 'image/png', '.ttf': 'font/ttf', '.svg': 'image/svg+xml' };
const inline = (text) => text.replace(/assets\/[\w/.\-]+\.(webp|png|ttf|svg)/g, (path) =>
  `data:${MIME[extname(path)]};base64,${readFileSync(join(root, path)).toString('base64')}`);

let html = read('src/index.html');
html = html.replace('<link rel="stylesheet" href="styles.css">', () => `<style>\n${inline(read('src/styles.css'))}</style>`);
html = html.replace('<script src="app.js"></script>', () => `<script>\n${inline(read('src/app.js'))}</script>`);
html = inline(html);
mkdirSync(join(root, 'dist'), { recursive: true });
writeFileSync(join(root, 'dist', 'index.html'), html);
console.log(`dist/index.html  ${(html.length / 1024).toFixed(0)} KB`);
