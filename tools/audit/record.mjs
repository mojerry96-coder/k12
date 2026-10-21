// Records a review video of the real app: first-visit opener, the voiced walkthrough, then a short
// playthrough of all three levels. Frames come from Chrome's screencast; Fitila's narration is
// laid back in at the moments the page actually started each line.
// usage: node tools/audit/record.mjs URL OUT.mp4 [WxH]   (needs Google Chrome, ffmpeg; Node 22+)
import { spawn, execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync, rmSync, readFileSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const [url, outFile, size = '1920x1080'] = process.argv.slice(2);
const [W, H] = size.split('x').map(Number);
const here = dirname(fileURLToPath(import.meta.url));
const work = join(dirname(resolve(outFile)), '.record-work');
rmSync(work, { recursive: true, force: true }); mkdirSync(join(work, 'f'), { recursive: true });
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const port = 9334;
try { execFileSync('pkill', ['-f', `remote-debugging-port=${port}`]); await new Promise((r) => setTimeout(r, 500)); } catch { /* none running */ }
const chrome = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${join(work, 'profile')}`,
  '--hide-scrollbars', '--autoplay-policy=no-user-gesture-required', '--mute-audio', '--no-first-run', `--window-size=${W},${H}`, 'about:blank'], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
for (let i = 0; i < 50; i++) { try { await (await fetch(`http://127.0.0.1:${port}/json/version`)).json(); break; } catch { await sleep(200); } }
const page = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find((t) => t.type === 'page');
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener('open', r));
let id = 0; const pending = new Map(); const frames = [];
const send = (method, params = {}) => new Promise((res, rej) => { const i = ++id; pending.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method, params })); });
ws.addEventListener('message', (e) => {
  const m = JSON.parse(e.data);
  if (m.id && pending.has(m.id)) { const { res, rej } = pending.get(m.id); pending.delete(m.id); m.error ? rej(new Error(m.error.message)) : res(m.result); return; }
  if (m.method === 'Page.screencastFrame') {
    const n = frames.length + 1, f = join(work, 'f', `${String(n).padStart(6, '0')}.jpg`);
    writeFileSync(f, Buffer.from(m.params.data, 'base64'));
    frames.push({ f, t: m.params.metadata.timestamp });
    send('Page.screencastFrameAck', { sessionId: m.params.sessionId }).catch(() => {});
  }
});
const evaluate = async (expression) => {
  const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
  return r.result.value;
};
await send('Page.enable'); await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: false });
await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: process.env.THEME || 'light' }] });
// note when each narration line really starts, in wall-clock seconds (the screencast's clock)
await send('Page.addScriptToEvaluateOnNewDocument', { source: `
  window.__voiceLog = [];
  const play = HTMLMediaElement.prototype.play;
  HTMLMediaElement.prototype.play = function () {
    const p = play.apply(this, arguments);
    if (/\\/voice\\//.test(this.src)) { const el = this, src = el.src, from = el.currentTime;
      Promise.resolve(p).then(() => window.__voiceLog.push({ src, from, t: (performance.timeOrigin + performance.now()) / 1000 })).catch(() => {}); }
    return p;
  };` });
await send('Page.navigate', { url });
await sleep(150);
await send('Page.startScreencast', { format: 'jpeg', quality: 90, maxWidth: W, maxHeight: H, everyNthFrame: 1 });
console.log('recording opener + walkthrough…');
// wait for the walkthrough to appear and finish
for (let i = 0; i < 300 && !(await evaluate('!!document.querySelector(".wt")')); i++) await sleep(100);
for (let i = 0; i < 1500 && (await evaluate('!!document.querySelector(".wt")')); i++) await sleep(100);
await sleep(1200);
console.log('playthrough…');
await evaluate(readFileSync(join(here, 'playthrough.js'), 'utf8'));
await sleep(800);
await send('Page.stopScreencast');
const voices = await evaluate('window.__voiceLog');
ws.close(); chrome.kill();

// frames → constant 30 fps video (each frame held until the next arrives)
const t0 = frames[0].t, end = frames.at(-1).t + 0.8;
let list = '';
frames.forEach((fr, i) => { list += `file '${fr.f}'\nduration ${((frames[i + 1]?.t ?? end) - fr.t).toFixed(4)}\n`; });
list += `file '${frames.at(-1).f}'\n`;
writeFileSync(join(work, 'frames.txt'), list);
const dist = resolve(here, '../../dist');
const args = ['-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', join(work, 'frames.txt')];
const lines = voices.filter((v) => v.t >= t0);
lines.forEach((v) => { args.push('-ss', String(v.from), '-i', join(dist, 'media', 'voice', decodeURIComponent(v.src.split('/voice/')[1].split('?')[0]))); });
const fc = lines.map((v, i) => `[${i + 1}:a]adelay=${Math.round((v.t - t0) * 1000)}:all=1[a${i}]`);
if (lines.length) fc.push(`${lines.map((_, i) => `[a${i}]`).join('')}amix=inputs=${lines.length}:normalize=0[aout]`);
args.push('-filter_complex', [`[0:v]fps=30,scale=${W}:${H}:flags=lanczos,format=yuv420p[vout]`, ...fc].join(';'), '-map', '[vout]');
if (lines.length) args.push('-map', '[aout]', '-c:a', 'aac', '-b:a', '160k');
args.push('-c:v', 'libx264', '-preset', 'slow', '-crf', '19', '-movflags', '+faststart', '-t', String(end - t0), outFile);
execFileSync('ffmpeg', args, { stdio: 'inherit' });
console.log(`${outFile}: ${frames.length} frames, ${(end - t0).toFixed(1)} s, ${lines.length} narration lines`);
rmSync(work, { recursive: true, force: true });
