// Runs test/flow.js in headless Chrome against dist/index.html and prints the results.
import { spawn, execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const here = dirname(fileURLToPath(import.meta.url));
const port = 9336;
try { execFileSync('pkill', ['-f', `remote-debugging-port=${port}`]); } catch { /* none */ }
const chrome = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', ['--headless=new', `--remote-debugging-port=${port}`,
  '--user-data-dir=/tmp/gl-v2-test', '--no-first-run', 'about:blank'], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
for (let i = 0; i < 50; i++) { try { await fetch(`http://127.0.0.1:${port}/json/version`); break; } catch { await sleep(200); } }
const page = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find((t) => t.type === 'page');
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener('open', r));
let id = 0; const pending = new Map();
ws.addEventListener('message', (e) => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } });
const send = (method, params = {}) => new Promise((res) => { const i = ++id; pending.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });
await send('Emulation.setDeviceMetricsOverride', { width: 1366, height: 768, deviceScaleFactor: 1, mobile: false });
await send('Page.navigate', { url: pathToFileURL(join(here, '..', 'dist', 'index.html')).href + '#1' });
await sleep(1200);
const r = await send('Runtime.evaluate', { expression: readFileSync(join(here, 'flow.js'), 'utf8'), awaitPromise: true, returnByValue: true });
const text = r.result?.result?.value || JSON.stringify(r.result?.exceptionDetails || r.error);
console.log(text);
ws.close(); chrome.kill();
const fails = (text.match(/^FAIL/gm) || []).length, passes = (text.match(/^PASS/gm) || []).length;
console.log(`\n${passes} passed, ${fails} failed`);
process.exit(fails ? 1 : 0);
