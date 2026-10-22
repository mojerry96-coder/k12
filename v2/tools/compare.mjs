// Renders every screen (#1…#14) at the design size and saves build-vs-reference pairs.
// usage: node tools/compare.mjs OUTDIR [screens e.g. 1,2,3]
import { spawn, execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync, readdirSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const out = resolve(process.argv[2] || '/tmp/compare');
const only = process.argv[3] ? process.argv[3].split(',').map(Number) : [...Array(14)].map((_, i) => i + 1);
mkdirSync(out, { recursive: true });
const url = pathToFileURL(join(here, '..', 'dist', 'index.html')).href;
const port = 9335;
try { execFileSync('pkill', ['-f', `remote-debugging-port=${port}`]); } catch { /* none */ }
const chrome = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', ['--headless=new', `--remote-debugging-port=${port}`,
  `--user-data-dir=${join(out, '.profile')}`, '--hide-scrollbars', '--no-first-run', '--force-device-scale-factor=1', 'about:blank'], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
for (let i = 0; i < 50; i++) { try { await fetch(`http://127.0.0.1:${port}/json/version`); break; } catch { await sleep(200); } }
const page = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find((t) => t.type === 'page');
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener('open', r));
let id = 0; const pending = new Map();
ws.addEventListener('message', (e) => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } });
const send = (method, params = {}) => new Promise((res) => { const i = ++id; pending.set(i, (m) => res(m.result)); ws.send(JSON.stringify({ id: i, method, params })); });
await send('Page.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 1672, height: 941, deviceScaleFactor: 1, mobile: false });
for (const n of only) {
  await send('Page.navigate', { url: `${url}#${n}` });
  await sleep(900);
  await send('Runtime.evaluate', { expression: 'document.fonts.ready', awaitPromise: true });
  await sleep(2600); // the staged entrance settles
  const shot = await send('Page.captureScreenshot', { format: 'png', clip: { x: 0, y: 0, width: 1672, height: 941, scale: 1 } });
  writeFileSync(join(out, `build_${String(n).padStart(2, '0')}.png`), Buffer.from(shot.data, 'base64'));
}
ws.close(); chrome.kill();
// pair each build render with its reference (stacked: reference on top, build below)
execFileSync('python3', [join(here, 'pair.py'), out, join(here, '..', 'references'), only.join(',')], { stdio: 'inherit' });
