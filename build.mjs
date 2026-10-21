// Bundles src/ into a single self-contained HTML file: dist/gradient-lab.html.
// Each ES module becomes a scoped IIFE; imports map to the earlier modules' exports.
// Images in assets/ are inlined as data URIs so the file works offline on its own.
import { readFileSync, writeFileSync, mkdirSync, readdirSync, copyFileSync, rmSync, cpSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const src = (f) => readFileSync(join(root, 'src', f), 'utf8');
const ORDER = ['math.js', 'graph.js', 'missions.js', 'challenges.js', 'state.js', 'app.js'];
const modName = (f) => '__' + f.replace(/\.js$/, '');

// Split a declaration line on commas at bracket depth 0, outside strings/templates.
function topLevelParts(s) {
  const parts = []; let depth = 0, q = null, cur = '';
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (q) { cur += ch; if (ch === '\\') { cur += s[++i] ?? ''; } else if (ch === q) q = null; continue; }
    if (ch === "'" || ch === '"' || ch === '`') q = ch;
    else if ('([{'.includes(ch)) depth++;
    else if (')]}'.includes(ch)) depth--;
    else if (ch === ';' && depth === 0) break;
    else if (ch === ',' && depth === 0) { parts.push(cur); cur = ''; continue; }
    cur += ch;
  }
  parts.push(cur);
  return parts;
}

let bundle = '';
for (const file of ORDER) {
  let code = src(file);
  const exported = new Set();
  code = code.replace(/^import\s+\*\s+as\s+(\w+)\s+from\s+'\.\/([\w.]+)';\s*$/gm, (_, ns, f) => `const ${ns} = ${modName(f)};`);
  code = code.replace(/^import\s+\{([\s\S]*?)\}\s+from\s+'\.\/([\w.]+)';\s*$/gm, (_, names, f) => `const {${names}} = ${modName(f)};`);
  if (/^import\s/m.test(code)) throw new Error(`${file}: unsupported import form`);
  code = code.replace(/^export\s+(async\s+function|function|const|let|class)\s+(\w+)/gm, (_, kind, name) => { exported.add(name); return `${kind} ${name}`; });
  code = code.replace(/^export\s+const\s+(\w+)\s*=/gm, (_, name) => { exported.add(name); return `const ${name} =`; });
  // multi-binding exports such as: export const VIEW = 640, PAD = 32, STEP = …;
  for (const m of src(file).matchAll(/^export\s+const\s+([^\n]+)/gm)) {
    for (const part of topLevelParts(m[1])) { const n = part.trim().match(/^(\w+)\s*=(?!=)/); if (n) exported.add(n[1]); }
  }
  if (/^export\s/m.test(code)) throw new Error(`${file}: unsupported export form`);
  bundle += `const ${modName(file)} = (() => {\n${code}\nreturn { ${[...exported].join(', ')} };\n})();\n`;
}

// Inline assets.
const assetsDir = join(root, 'assets');
const MIME = { png: 'image/png', webp: 'image/webp' };
for (const f of readdirSync(assetsDir).filter((n) => /\.(png|webp)$/.test(n))) {
  if (!bundle.includes(`'assets/${f}'`)) continue; // only inline what the app references
  const uri = `data:${MIME[f.split('.').pop()]};base64,` + readFileSync(join(assetsDir, f)).toString('base64');
  bundle = bundle.split(`'assets/${f}'`).join(`'${uri}'`);
}
if (/'assets\//.test(bundle)) throw new Error('un-inlined asset reference remains');
if (bundle.includes('</script')) throw new Error('bundle contains a closing script tag');

const html = src('index.html')
  .replace('<!--STYLES-->', () => `<style>\n${src('styles.css')}\n</style>`)
  .replace('<!--SCRIPT-->', () => `<script>\n"use strict";\n${bundle}\n</script>`);

rmSync(join(root, 'dist', 'media'), { recursive: true, force: true }); // no stale clips
mkdirSync(join(root, 'dist', 'media'), { recursive: true });
writeFileSync(join(root, 'dist', 'gradient-lab.html'), html);
// index.html too, so opening the folder or its address goes straight into the simulation (no file list)
writeFileSync(join(root, 'dist', 'index.html'), html);
// Video clips stay as files beside the HTML (too large to inline sensibly).
cpSync(join(root, 'media'), join(root, 'dist', 'media'), { recursive: true });
console.log(`dist/gradient-lab.html (+ dist/index.html)  ${(html.length / 1024).toFixed(0)} KB`);
