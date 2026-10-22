// Headless-Chrome layout audit: drives tour.js through every screen state at several viewport
// sizes and both themes, saving a screenshot per state plus a geometry report (overlaps,
// near-touching controls, clipped text, page/panel overflow).
// usage: node tools/audit/shoot.mjs URL OUTDIR [WxH ...]   (needs Google Chrome; Node 22+)
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const [url, outDir, ...sizeArgs] = process.argv.slice(2);
const sizes = (sizeArgs.length ? sizeArgs : ['1366x768', '1280x720', '1920x1080', '1024x768', '768x1024', '390x844'])
  .map((s) => s.split('x').map(Number));
const themes = (process.env.THEMES || 'light,dark').split(',');
const only = process.env.ONLY ? new RegExp(process.env.ONLY) : null;
const tour = readFileSync(process.env.TOUR || join(dirname(fileURLToPath(import.meta.url)), 'tour.js'), 'utf8');
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const port = 9333, profile = join(outDir, '.profile');
mkdirSync(outDir, { recursive: true });
const chrome = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`,
  '--hide-scrollbars', '--autoplay-policy=no-user-gesture-required', '--mute-audio', '--no-first-run', 'about:blank'], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let ver;
for (let i = 0; i < 50 && !ver; i++) { try { ver = await (await fetch(`http://127.0.0.1:${port}/json/version`)).json(); } catch { await sleep(200); } }
const page = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find((t) => t.type === 'page');
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener('open', r));
let id = 0; const pending = new Map(); const handlers = [];
ws.addEventListener('message', (e) => {
  const m = JSON.parse(e.data);
  if (m.id && pending.has(m.id)) { const { res, rej } = pending.get(m.id); pending.delete(m.id); m.error ? rej(new Error(m.error.message)) : res(m.result); }
  else handlers.forEach((h) => h(m));
});
const send = (method, params = {}) => new Promise((res, rej) => { const i = ++id; pending.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method, params })); });
await send('Page.enable'); await send('Runtime.enable');
await send('Runtime.addBinding', { name: '__snapBinding' });

const report = [];
let current = '', vw = 0, vh = 0, themeScript = null;
handlers.push(async (m) => {
  if (m.method !== 'Runtime.bindingCalled' || m.params.name !== '__snapBinding') return;
  const { label, issues } = JSON.parse(m.params.payload);
  const name = `${current}__${label.replace(/[^a-z0-9]+/gi, '_')}`;
  if (!only || only.test(name)) {
    // clip is in page coordinates: follow the scroll so phone states show what is on screen
    const [sx, sy] = (await send('Runtime.evaluate', { expression: '[scrollX, scrollY]', returnByValue: true })).result.value;
    const shot = await send('Page.captureScreenshot', { format: 'png', clip: { x: sx, y: sy, width: vw, height: vh, scale: 1 } });
    writeFileSync(join(outDir, name + '.png'), Buffer.from(shot.data, 'base64'));
  }
  report.push(`${issues.length ? 'ISSUES' : 'ok    '} ${name}${issues.map((x) => '\n         - ' + x).join('')}`);
  await send('Runtime.evaluate', { expression: 'window.__snapDone && window.__snapDone()' });
});

for (const theme of themes) for (const [w, h] of sizes) {
  current = `${w}x${h}_${theme}`; vw = w; vh = h;
  await send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile: w < 768 });
  await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: theme }] });
  await send('Runtime.evaluate', { expression: 'try{localStorage.clear()}catch{}' });
  // the app's theme is a saved preference (light by default), so seed it for this run
  if (themeScript) await send('Page.removeScriptToEvaluateOnNewDocument', { identifier: themeScript });
  themeScript = (await send('Page.addScriptToEvaluateOnNewDocument', { source:
    `try { localStorage.setItem('gradient-lab-v1', JSON.stringify({ version: 1, prefs: { theme: '${theme}' } })); } catch {}` })).identifier;
  await send('Page.navigate', { url: `${url}${url.includes('?') ? '&' : '?'}audit=${Date.now()}` });
  await sleep(1200);
  const r = await send('Runtime.evaluate', { expression: tour, awaitPromise: true, returnByValue: true });
  if (r.exceptionDetails) report.push(`ERROR  ${current}: ${r.exceptionDetails.exception?.description || r.exceptionDetails.text}`);
  console.log('done', current);
}
writeFileSync(join(outDir, 'report.txt'), report.join('\n') + '\n');
ws.close(); chrome.kill(); await sleep(300);
try { rmSync(profile, { recursive: true, force: true }); } catch { /* busy */ }
console.log(report.filter((l) => !l.startsWith('ok')).join('\n') || 'no issues');
