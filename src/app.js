// Gradient Lab — UI. One persistent page; state → targeted DOM updates. Maths lives in
// math.js / missions.js / challenges.js; this file never computes answers itself.
import {
  near, parseAnswer, numText, numHTML, pointText, equationHTML, equationText, lineThrough, beginnerTriangle,
  steepness, px, py, ux, uy, VIEW, PAD, clamp, MINUS,
} from './math.js';
import { gridSVG, lineSVG, verticalSVG } from './graph.js';
import {
  BEGINNER_MISSIONS, INTERMEDIATE_MISSIONS, LEVEL_DONE, intermediateComplete, constrainedPoint, isLegalM4,
  commitPair, onLessonLine, FREE,
} from './missions.js';
import * as CH from './challenges.js';
import { initialState, recordAttempt, freshChallenge, resetScore, save, load, LEVELS } from './state.js';

// Fitila is animated with clips generated directly on the app's own background colours — one
// version per theme, so no transparency/keying is involved (see tools/bgclip.py). Stills are the
// clips' own first/last frames on the same colours, so swapping still <-> video is seamless.
// neutral: transparent still (used only where Fitila floats over mixed UI: walkthrough, dialog).
// The logo is still an interim cut-out from the design library — NOT a production asset.
const ASSET = {
  neutral: 'assets/fitila_neutral_clip.webp',
  greet_light_first: 'assets/fitila_greet_light_first.webp',
  greet_light_last: 'assets/fitila_greet_light_last.webp',
  greet_dark_first: 'assets/fitila_greet_dark_first.webp',
  greet_dark_last: 'assets/fitila_greet_dark_last.webp',
  tap_light_rest: 'assets/fitila_tap_light_rest.webp',
  tap_dark_rest: 'assets/fitila_tap_dark_rest.webp',
  celebrate_light_rest: 'assets/fitila_celebrate_light_rest.webp',
  celebrate_dark_rest: 'assets/fitila_celebrate_dark_rest.webp',
  logo: 'assets/ulesson_logo_interim.png',
  flyin_last: 'assets/fitila_flyin_dark_last.webp',
  beginner: 'assets/icon_beginner.png',
  intermediate: 'assets/icon_intermediate.png',
  advanced: 'assets/icon_advanced.png',
};
const POSE_RATIO = { neutral: 393 / 698, greet_light_last: 828 / 720, greet_dark_last: 828 / 720 };

// Greeting: page background (#F0F8FD / #0E1B29). Tap: panel surface (#FFFFFF / #162839).
const CLIP = {
  greet: {
    light: { src: 'media/fitila_greet_light.mp4', first: 'greet_light_first', last: 'greet_light_last' },
    dark: { src: 'media/fitila_greet_dark.mp4', first: 'greet_dark_first', last: 'greet_dark_last' },
  },
  // Corner clips all start and end on the same rest frame, so they hand over without a jump.
  tap: {
    light: { src: 'media/fitila_tap_light.mp4', first: 'tap_light_rest', last: 'tap_light_rest' },
    dark: { src: 'media/fitila_tap_dark.mp4', first: 'tap_dark_rest', last: 'tap_dark_rest' },
  },
  idle: {
    light: { src: 'media/fitila_idle_light.mp4', first: 'tap_light_rest', last: 'tap_light_rest' },
    dark: { src: 'media/fitila_idle_dark.mp4', first: 'tap_dark_rest', last: 'tap_dark_rest' },
  },
  nod: {
    light: { src: 'media/fitila_nod_light.mp4', first: 'tap_light_rest', last: 'tap_light_rest' },
    dark: { src: 'media/fitila_nod_dark.mp4', first: 'tap_dark_rest', last: 'tap_dark_rest' },
  },
  retry: {
    light: { src: 'media/fitila_retry_light.mp4', first: 'tap_light_rest', last: 'tap_light_rest' },
    dark: { src: 'media/fitila_retry_dark.mp4', first: 'tap_dark_rest', last: 'tap_dark_rest' },
  },
  // Celebration plays in the corner. Same scale and centre as the other corner clips, but a
  // slightly wider frame for her wings (.celebrating widens the stage symmetrically).
  celebrate: {
    light: { src: 'media/fitila_celebrate_light.mp4', first: 'celebrate_light_rest', last: 'celebrate_light_rest' },
    dark: { src: 'media/fitila_celebrate_dark.mp4', first: 'celebrate_dark_rest', last: 'celebrate_dark_rest' },
  },
};
const darkMQ = matchMedia('(prefers-color-scheme: dark)');
const theme = () => (darkMQ.matches ? 'dark' : 'light');
const clipFor = (name) => CLIP[name][theme()];

// One reusable <video> per host: created once (preloaded), rewound and replayed instantly.
function clipVideo(host, src) {
  let v = host.querySelector('video');
  if (v && v.dataset.src === src) return v;
  v?.remove();
  v = document.createElement('video');
  v.muted = true; v.playsInline = true; v.preload = 'auto';
  v.setAttribute('aria-hidden', 'true');
  v.className = 'fitila-video';
  v.dataset.src = src; v.src = src;
  host.appendChild(v);
  v.load();
  return v;
}
// Preload a host's clip without playing it, so the first tap reacts instantly.
function prepClip(host, name) {
  const c = clipFor(name);
  if (!reduced() && !demo?.static && c.src) clipVideo(host, c.src);
}
// Browsers may pause muted video in background/power-saving states (AbortError): keep the
// still and retry when the page is visible. Any other refusal calls fail().
function startVideo(v, fail) {
  const start = () => v.play()?.catch((e) => {
    if (!v.isConnected) return;
    if (e.name === 'AbortError' || document.hidden) {
      const again = () => { if (!document.hidden) { document.removeEventListener('visibilitychange', again); if (v.isConnected && v.paused && !v.ended) start(); } };
      document.addEventListener('visibilitychange', again);
    } else fail();
  });
  start();
}
// Plays a clip inside a .fitila-stage host (which holds a still <img>). Reduced motion, autoplay
// refusal or a load failure leave the still in place. When it ends, the video keeps showing the
// final frame (identical to the still) and stays loaded for an instant replay.
function playClip(host, name, { onEnd, loop = false } = {}) {
  const c = clipFor(name), img = host.querySelector('img');
  const still = () => { img.src = ASSET[c.last]; host.classList.remove('video-on'); host.querySelector('video')?.remove(); onEnd?.(); };
  if (reduced() || demo?.static || !c.src) return still();
  const v = clipVideo(host, c.src);
  v.loop = loop;
  v.onplaying = () => host.classList.add('video-on');
  v.onended = () => { img.src = ASSET[c.last]; onEnd?.(); };
  v.onerror = still;
  v.currentTime = 0;
  startVideo(v, still);
  return v;
}
const clipPlaying = (host) => { const v = host?.querySelector('video'); return !!v && !v.paused && !v.ended; };

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const store = (() => {
  try { const ls = window.localStorage; ls.setItem('__gl', '1'); ls.removeItem('__gl'); return ls; } catch {
    return { getItem: () => null, setItem: () => { throw new Error('storage blocked'); } };
  }
})();

let state = load(store);
let demo = null; // walkthrough sandbox context; while set nothing is saved
const mq = matchMedia('(prefers-reduced-motion: reduce)');
const reduced = () => state.prefs.reducedMotion ?? mq.matches;
const persist = () => { if (!demo) save(state, store); };
const isLevel = (s) => LEVELS.includes(s);

// ---------- timers (cleared on navigation so stale feedback never plays on a new task) ----------
const timers = new Map();
function later(key, ms, fn) { clearTimeout(timers.get(key)); timers.set(key, setTimeout(() => { timers.delete(key); fn(); }, ms)); }
function cancelTimers(prefix, keep) { for (const [k, id] of timers) if (k.startsWith(prefix) && !(keep && k.startsWith(keep))) { clearTimeout(id); timers.delete(k); } }

// ---------- screen-reader announcements ----------
let liveT;
function announce(text, delay = 0) {
  clearTimeout(liveT);
  liveT = setTimeout(() => { const el = $('#live'); el.textContent = ''; requestAnimationFrame(() => { el.textContent = text; }); }, delay);
}
const plain = (html) => { const d = document.createElement('div'); d.innerHTML = html; $$('.fstack', d).forEach((n) => n.remove()); return d.textContent.replace(/\s+/g, ' ').trim(); };

// ---------- gentle synthesised cues (off by default; no autoplay assumption) ----------
let actx;
function chime(kind) {
  if (!state.prefs.sound || demo) return;
  try {
    actx ??= new AudioContext();
    const t = actx.currentTime, notes = kind === 'ok' ? [659.3, 880] : [523.3];
    notes.forEach((f, i) => {
      const o = actx.createOscillator(), g = actx.createGain();
      o.type = 'sine'; o.frequency.value = f;
      g.gain.setValueAtTime(0, t + i * 0.12); g.gain.linearRampToValueAtTime(0.07, t + i * 0.12 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.12 + 0.4);
      o.connect(g).connect(actx.destination); o.start(t + i * 0.12); o.stop(t + i * 0.12 + 0.45);
    });
  } catch { /* audio unavailable: silent */ }
}

// ---------- icons (code recreations; see VALIDATION.md) ----------
const I = {
  bulb: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.6 10.8c.6.5 1 1.2 1 2V16h5.2v-.2c0-.8.4-1.5 1-2A6 6 0 0 0 12 3z"/></svg>',
  chev: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>',
  check: '<svg class="check-draw" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
  info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/></svg>',
  warn: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3l9.5 17h-19z"/><path d="M12 10v4.5M12 17.5v.5"/></svg>',
};
const note = (kind, title, body, { icon, close } = {}) =>
  `<div class="note ${kind} note-in" ${kind === 'ok' || kind === 'bad' ? 'role="status"' : ''}>`
  + `<h3>${icon || (kind === 'ok' ? I.check : kind === 'hint' ? I.bulb : kind === 'bad' ? I.warn : I.info)}${title}</h3>${body}`
  + (close ? `<button class="close" type="button" data-action="close-hint" aria-label="Close hint">×</button>` : '') + `</div>`;

// =====================================================================================
// Fitila — clickable semantic button; still poses + code-driven gestures (no video yet).
// =====================================================================================
function makeFitila(btn) {
  const img = btn.querySelector('img');
  let token = 0;
  const api = {
    btn,
    pose(p) { if (img.dataset.pose !== p) { img.src = ASSET[p]; img.dataset.pose = p; } },
    react(kind, { pose } = {}) {
      if (kind === 'click' && btn.classList.contains('react-click')) return; // no repeated bouncing
      const t = ++token;
      btn.classList.remove('react-click', 'react-nod', 'react-retry', 'react-cheer', 'react-guide', 'idle');
      void btn.offsetWidth;
      if (pose) api.pose(pose);
      btn.classList.add('react-' + kind);
      const dur = { click: 1200, nod: 1600, retry: 2000, cheer: 1800, guide: 3000 }[kind] || 1500;
      later('fitila-' + btn.id, dur, () => {
        if (t !== token) return; // stale reaction: ignore
        btn.classList.remove('react-' + kind); btn.classList.add('idle'); api.sync();
      });
    },
    reset() { token++; cancelTimers('fitila-' + btn.id); btn.className = btn.className.replace(/\breact-\w+/g, '').trim(); btn.classList.add('idle'); api.sync(); },
    sync: () => {},
  };
  return api;
}
const corner = makeFitila($('#fitila'));
corner.sync = () => {
  const open = isLevel(state.screen) && state[state.screen].hint;
  const stage = $('#fitila .fitila-stage');
  if (!clipPlaying(stage)) stage.querySelector('img').src = ASSET[clipFor('tap').first];
  corner.btn.setAttribute('aria-expanded', String(!!open));
};

// Corner Fitila: idle loop at rest; one-shot reactions cut in and hand back to idle.
// Priority (spec): current click (tap) > feedback (nod / retry / celebrate; newest wins, so an old
// success never plays over a new task) > idle. A reaction already playing is never restarted by a
// repeat trigger. Reduced motion / no level on screen -> still rest frame.
// Every corner clip is a preloaded <video> kept in the stage, so a reaction starts instantly:
// switching clips is just rewind + play on an already-buffered video.
const cornerStage = () => $('#fitila .fitila-stage');
const CORNER_CLIPS = ['idle', 'tap', 'nod', 'retry', 'celebrate'];
// Times in each idle loop where Fitila is at (or within ~1.6 grey levels of) her rest pose,
// measured from the clips. A loop wraps, so "near rest" = t <= end || t >= start.
const IDLE_REST = { light: { end: 1.0, start: 4.04, len: 5.04 }, dark: { end: 0.54, start: 3.58, len: 5.04 } };
const MAX_REST_WAIT = 0.7; // s: wait this long at most for a rest moment, otherwise crossfade
let cornerPending = null, pendingTimer = 0;
let cornerClip = null; // 'idle' | 'tap' | 'nod' | 'retry' | 'celebrate' | null
let pool = {}, poolTheme = null;
function ensurePool() {
  const th = theme();
  if (poolTheme === th) return;
  const host = cornerStage();
  host.querySelectorAll('video').forEach((v) => v.remove());
  pool = {};
  for (const name of CORNER_CLIPS) {
    const src = CLIP[name][th].src;
    if (!src) continue;
    const v = document.createElement('video');
    v.className = 'fitila-video pool';
    v.muted = true; v.playsInline = true; v.preload = 'auto'; v.loop = name === 'idle';
    v.setAttribute('aria-hidden', 'true');
    v.src = src;
    host.appendChild(v);
    v.load();
    pool[name] = v;
  }
  poolTheme = th;
}
function showPool(name, { fade = false } = {}) {
  const host = cornerStage();
  const others = Object.entries(pool).filter(([k]) => k !== name).map(([, v]) => v);
  const hideOthers = () => others.forEach((v) => { v.classList.remove('active'); if (!v.paused) v.pause(); });
  host.classList.toggle('xfade', fade);
  if (fade) { // the outgoing clip stays underneath while the new one fades in over it
    pool[name].classList.add('fading-in');
    later('fitila-xfade', 220, () => { hideOthers(); pool[name]?.classList.remove('fading-in'); host.classList.remove('xfade'); });
  } else hideOthers();
  host.classList.toggle('celebrating', name === 'celebrate');
  const v = pool[name];
  v.currentTime = 0;
  v.classList.add('active');
  // Only hide the still once this video actually has a frame to show (no blank flash).
  if (v.readyState >= 2) host.classList.add('video-on');
  else {
    const reveal = () => { if (v.classList.contains('active')) host.classList.add('video-on'); };
    for (const ev of ['loadeddata', 'seeked', 'playing']) v.addEventListener(ev, reveal, { once: true });
  }
  return v;
}
function cornerStop() {
  const host = cornerStage();
  cornerClip = null; cornerPending = null; clearTimeout(pendingTimer);
  host.classList.remove('celebrating', 'video-on');
  for (const v of Object.values(pool)) { v.classList.remove('active'); if (!v.paused) v.pause(); }
  host.querySelector('img').src = ASSET[clipFor('tap').first];
}
function cornerIdle() {
  if (reduced() || demo?.static || !isLevel(state.screen)) return cornerStop();
  ensurePool();
  if (cornerClip === 'idle' || !pool.idle) return;
  cornerClip = 'idle';
  const v = showPool('idle');
  v.onended = null;
  startVideo(v, cornerStop);
}
// Seconds until the idle loop is next near her rest pose (0 if it is now).
function untilRest() {
  const idle = pool.idle, r = IDLE_REST[theme()];
  if (!idle || idle.paused) return 0;
  const t = idle.currentTime % r.len;
  if (t <= r.end || t >= r.start) return 0;
  return r.start - t;
}
function cornerReact(name) {
  if (reduced() || demo?.static || !isLevel(state.screen)) return;
  ensurePool();
  if (!pool[name]) name = 'nod';                         // no approved clip for this theme yet
  if (!pool[name] || cornerClip === name || cornerPending === name) return; // no restart on repeats
  if (cornerClip === 'tap' || cornerPending === 'tap') return; // the learner's click outranks feedback
  // From idle: start on her rest pose. Wait for it if it is close; otherwise blend in quickly.
  if (cornerClip === 'idle') {
    const wait = untilRest();
    if (wait > 0 && wait <= MAX_REST_WAIT) {
      cornerPending = name;
      clearTimeout(pendingTimer);
      pendingTimer = setTimeout(() => { if (cornerPending === name) { cornerPending = null; playReaction(name, false); } }, wait * 1000);
      return;
    }
    return playReaction(name, wait > 0);
  }
  cornerPending = null; clearTimeout(pendingTimer);
  playReaction(name, false);
}
function playReaction(name, fade) {
  if (reduced() || demo?.static || !isLevel(state.screen) || !pool[name]) return;
  cornerClip = name;
  const v = showPool(name, { fade });
  v.onended = () => { if (cornerClip === name) { cornerClip = null; cornerStage().classList.remove('celebrating'); cornerIdle(); } };
  startVideo(v, () => { cornerClip = null; cornerIdle(); });
}
// Hover / keyboard focus: an instant reaction, but only while she is idling, so it never
// interrupts feedback. Clicking during it simply opens the hint (no restart).
const greetHover = (e) => {
  if (e.type === 'pointerenter' && e.pointerType === 'touch') return;
  if (e.type === 'focus' && !corner.btn.matches(':focus-visible')) return;
  if (cornerClip === 'idle') cornerReact('tap');
};
corner.btn.addEventListener('pointerenter', greetHover);
corner.btn.addEventListener('focus', greetHover);

// Feedback hooks: correct -> nod, wrong / not yet -> encouraging retry, level complete -> celebrate.
const FEEDBACK_CLIP = { nod: 'nod', retry: 'retry', cheer: 'celebrate' };
const _cornerReact = corner.react;
corner.react = (kind, opts) => (FEEDBACK_CLIP[kind] ? cornerReact(FEEDBACK_CLIP[kind]) : _cornerReact(kind, opts));
const _cornerReset = corner.reset;
corner.reset = () => { _cornerReset(); if (cornerClip !== 'idle') { cornerClip = null; cornerIdle(); } };

function showCue() {
  return; // owner: no pop-up cues; hints open only when asked
  const lvl = state.screen;
  if (demo || state.session.cueShown[lvl]) return;
  state.session.cueShown[lvl] = true;
  later('lvl-cue', 1400, () => { $('#fitila-cue').hidden = false; });
  later('lvl-cue-hide', 7000, hideCue);
}
function hideCue() { $('#fitila-cue').hidden = true; cancelTimers('lvl-cue'); }

// =====================================================================================
// Chrome: header, tabs, preferences
// =====================================================================================
function renderChrome() {
  document.documentElement.classList.toggle('anim', !reduced() && !demo?.static);
  for (const t of $$('.tab')) {
    const on = t.dataset.level === state.screen;
    if (on) t.setAttribute('aria-current', 'page'); else t.removeAttribute('aria-current');
  }
  const b = state.beginner.completed.length, i = state.intermediate.completed.length, a = state.advanced.solved;
  $('#count-beginner').textContent = `${b}/7`;
  $('#count-intermediate').textContent = `${i}/6`;
  $('#count-advanced').textContent = String(a);
  $('[data-level=beginner]').setAttribute('aria-label', `Beginner, ${b} of 7 missions done`);
  $('[data-level=intermediate]').setAttribute('aria-label', `Intermediate, ${i} of 6 missions done`);
  $('[data-level=advanced]').setAttribute('aria-label', `Advanced, ${a} challenge${a === 1 ? '' : 's'} solved`);
  $('#btn-sound').setAttribute('aria-pressed', String(state.prefs.sound));
  $('#btn-sound').setAttribute('aria-label', state.prefs.sound ? 'Sound on' : 'Sound off');
  $('#btn-motion').setAttribute('aria-pressed', String(reduced()));
  placeTabIndicator();
}
let tabIndPos = null;
function placeTabIndicator() {
  const ind = $('#tab-ind'), t = $('.tab[aria-current=page]');
  if (!t) { ind.style.opacity = '0'; tabIndPos = null; return; }
  const to = { x: t.offsetLeft, w: t.offsetWidth }, from = tabIndPos;
  ind.style.width = to.w + 'px';
  ind.style.transform = `translateX(${to.x}px)`;
  ind.style.opacity = '1';
  // Stretch: the leading edge reaches the new tab first, then the trailing edge catches up.
  if (from && (from.x !== to.x) && !reduced()) {
    const left = Math.min(from.x, to.x), span = Math.max(from.x + from.w, to.x + to.w) - left;
    ind.animate([
      { transform: `translateX(${from.x}px)`, width: from.w + 'px' },
      { transform: `translateX(${left}px)`, width: span + 'px', offset: 0.42 },
      { transform: `translateX(${to.x}px)`, width: to.w + 'px' },
    ], { duration: 560, easing: 'cubic-bezier(.3,1.25,.6,1)' });
  }
  tabIndPos = to;
}

function go(screen) {
  if (screen === state.screen) return;
  stopTransient();
  state.screen = screen;
  if (isLevel(screen)) state.lastLevel = screen;
  persist();
  render();
}
function stopTransient() {
  cancelTimers('lvl'); cancelTimers('fitila');
  B.stopWalk(true);
  hideCue();
  closeDialog(false);
}

function render() {
  renderChrome();
  const lvl = isLevel(state.screen);
  $('#welcome').hidden = lvl;
  $('#workspace').hidden = !lvl;
  if (!lvl) cornerStop();
  if (lvl) renderLevel(); else renderWelcome();
}

// =====================================================================================
// Welcome
// =====================================================================================
let welcomeFitila;
function renderWelcome() {
  const cards = [
    ['beginner', 'Beginner', 'Move a line'],
    ['intermediate', 'Intermediate', 'Explore two points'],
    ['advanced', 'Advanced', 'Solve a challenge'],
  ];
  $('#welcome').innerHTML = `
    <div class="welcome-fitila">
      <button class="fitila-btn" id="w-fitila" type="button" aria-label="Ask Fitila for a hint" aria-expanded="false" aria-controls="w-tip">
        <span class="fitila-stage"><img alt="" src="${ASSET[clipFor('greet').last]}" width="828" height="720"></span>
      </button>
    </div>
    <div class="welcome-copy">
      <h1 id="welcome-title" tabindex="-1" class="enter">Explore lines. Discover gradients.</h1>
      <p class="sub enter enter-2">Choose your level.</p>
      <div id="w-tip" class="welcome-bubble" hidden></div>
      <div class="cards">${cards.map(([id, t, s], n) => `
        <div class="card enter enter-${n + 3}">
          <img src="${ASSET[id]}" alt="" width="129" height="128">
          <div class="card-text"><h2>${t}</h2><p>${s}</p></div>
          <button class="btn primary" type="button" data-go="${id}" aria-label="Start ${t}: ${s}">Start</button>
        </div>`).join('')}
      </div>
    </div>`;
  welcomeFitila = makeFitila($('#w-fitila'));
  $('#w-fitila').addEventListener('pointerenter', welcomeHover);
  welcomeFitila.sync = () => {};
  if (!state.session.welcomeGestured && !demo) {
    state.session.welcomeGestured = true;
    playClip($('#w-fitila .fitila-stage'), 'greet'); // animated greeting once, then holds her settled pose
  } else prepClip($('#w-fitila .fitila-stage'), 'greet'); // ready for an instant replay on tap/hover
}
function welcomeHover(e) {
  if (e.pointerType === 'touch') return;
  const stage = $('#w-fitila .fitila-stage');
  if (stage && !clipPlaying(stage)) playClip(stage, 'greet');
}
function toggleWelcomeTip() {
  const tip = $('#w-tip'), open = tip.hidden;
  tip.hidden = !open;
  tip.innerHTML = open ? note('hint', 'Fitila says', '<p>Pick any level to start. You can switch levels at any time from the bar at the top.</p>', { close: true }) : '';
  $('#w-fitila').setAttribute('aria-expanded', String(open));
  const stage = $('#w-fitila .fitila-stage');
  if (open && !clipPlaying(stage)) playClip(stage, 'greet'); // her own animated reaction to the tap
  if (open) { announce('Pick any level to start. You can switch levels at any time from the bar at the top.'); }
}

// =====================================================================================
// Level shell: shared grid, panel, mission strip, notes
// =====================================================================================
const svg = $('#graph');
const G = { ref: $('#g-ref'), tri: $('#g-tri'), line: $('#g-line'), marks: $('#g-marks'), points: $('#g-points'), hiker: $('#g-hiker') };
// Axis numbers step aside when a live label (across/up, point names, intercepts, targets) lands on them.
let declutterQ = 0;
function declutter() {
  declutterQ = 0;
  const live = [...svg.querySelectorAll('#g-tri text, #g-points text, #g-marks text, #g-line text')]
    .map((t) => t.getBoundingClientRect()).filter((r) => r.width);
  for (const t of svg.querySelectorAll('#g-grid .tick-label')) {
    const b = t.getBoundingClientRect(), pad = 2;
    t.classList.toggle('yield', live.some((l) => b.left < l.right + pad && l.left < b.right + pad && b.top < l.bottom + pad && l.top < b.bottom + pad));
  }
}
new MutationObserver(() => { if (!declutterQ) declutterQ = requestAnimationFrame(declutter); })
  .observe(svg, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['x', 'y', 'transform'] });
$('#g-grid').innerHTML = gridSVG({ clipId: 'plot-clip' });
const LEVEL = {};

function renderLevel() {
  const L = LEVEL[state.screen];
  for (const k in G) G[k].innerHTML = '';
  svg.classList.remove('hidden-graph');
  const panel = $('#panel');
  panel.innerHTML = L.panel();
  panel.scrollTop = 0;
  L.after?.();
  L.draw();
  setCaption(L.caption());
  corner.reset();
  showCue();
  stageIn(panel);
}

// Staged entry: [data-stage="1"] shows at once, 2 and 3 follow. [data-gate="moved"] items
// wait until the learner first moves something on this level (this session).
const STAGE_GAP = 420;
const staticMotion = () => reduced() || !!demo?.static;
const gatedNow = (el) => el.dataset.gate === 'moved' && !state.session.moved[state.screen];
function revealEl(el, i = 0) {
  if (gatedNow(el) || !el.classList.contains('staged-out')) return;
  el.classList.remove('staged-out', 'stage-in');
  if (staticMotion()) return;
  void el.offsetWidth;
  el.style.animationDelay = i * 90 + 'ms';
  el.classList.add('stage-in');
}
function stageIn(root) {
  const key = 'lvl-stage-' + (root.id || 'x');
  cancelTimers(key);
  const items = $$('[data-stage]', root);
  for (const el of items) {
    el.classList.remove('stage-in');
    el.classList.toggle('staged-out', gatedNow(el) || (+el.dataset.stage > 1 && !staticMotion()));
  }
  const run = (n) => { root.dataset.reached = n; $$(`[data-stage="${n}"]`, root).forEach(revealEl); updateMore(); };
  if (staticMotion()) { root.dataset.reached = 3; updateMore(); return; }
  run(1);
  later(key + '-2', STAGE_GAP, () => run(2));
  later(key + '-3', STAGE_GAP * 2, () => run(3));
}
function ungate() {
  const lvl = state.screen;
  if (state.session.moved[lvl]) return;
  state.session.moved[lvl] = true;
  const root = $('#panel');
  $$('[data-gate="moved"]', root).forEach((el, i) => { if (+root.dataset.reached >= +el.dataset.stage) revealEl(el, i); });
}
function setCaption(t) { $('#graph-caption').innerHTML = t; } // internal strings only (may carry <i> maths)
function setDesc(t) { $('#graph-desc').textContent = t; }
function updateMore() {
  const p = $('#panel');
  $('#panel-card').classList.toggle('more', p.scrollHeight - p.scrollTop - p.clientHeight > 8);
}

const stripHTML = (n, cur, done) => `<div class="strip" role="group" aria-label="Missions">${Array.from({ length: n }, (_, i) => i + 1).map((id) =>
  `<button type="button" data-mission="${id}" class="${done.includes(id) ? 'done' : ''}" ${id === cur ? 'aria-current="step"' : ''} aria-label="Mission ${id}${done.includes(id) ? ', completed' : ''}">${id}</button>`).join('')}</div>`;

const MISSIONS = { beginner: BEGINNER_MISSIONS, intermediate: INTERMEDIATE_MISSIONS };
const NEXT_LEVEL = { beginner: 'intermediate', intermediate: 'advanced' };
const LEVEL_NAME = { beginner: 'Beginner', intermediate: 'Intermediate', advanced: 'Advanced' };

function nextMissionId(lvl) {
  const s = state[lvl], n = MISSIONS[lvl].length;
  if (s.mission < n) return s.mission + 1;
  for (let i = 1; i <= n; i++) if (!s.completed.includes(i)) return i;
  return null;
}
function missionNotesHTML(lvl) {
  const s = state[lvl], mi = MISSIONS[lvl][s.mission - 1];
  let h = '';
  if (s.hint) h += note('hint', 'Hint', `<p>${mi.hint}</p>`, { close: true });
  if (s.success) {
    const nx = nextMissionId(lvl), all = s.completed.length === MISSIONS[lvl].length;
    const btn = nx ? `<button class="btn primary" type="button" data-action="next-mission">Next mission</button>`
      : `<button class="btn primary" type="button" data-go="${NEXT_LEVEL[lvl]}">Try the next level</button>`;
    const text = `<p>${mi.success}</p>${all ? `<p>${LEVEL_DONE}</p>` : ''}`;
    h += note('ok', 'Mission complete!', `<div class="ok-row"><div>${text}</div>${btn}</div>`);
  }
  return h;
}
function missionCardHTML(lvl) {
  const s = state[lvl], mi = MISSIONS[lvl][s.mission - 1];
  const done = s.completed.includes(s.mission);
  const extra = lvl === 'intermediate' && s.mission === 4
    ? `<p class="counter" id="pairs">Pairs tried: ${Math.min(3, s.pairs.length)} of 3</p>` : '';
  return `<p class="mission-text" id="mission-text">${mi.text}</p>${extra}
    ${s.success ? '' : `<div class="mission-tools">
      <button class="link-btn" type="button" data-action="hint" aria-expanded="${s.hint}" aria-controls="notes">${I.bulb}Give me a hint</button>
      ${done ? `<span class="done-tag">${I.check.replace('check-draw', '')} Completed</span>` : ''}
    </div>`}
    <div class="notes" id="notes">${missionNotesHTML(lvl)}</div>`;
}
function missionHeadHTML(lvl) {
  const s = state[lvl], n = MISSIONS[lvl].length;
  return `<div class="mission-row"><span class="mission-of" id="m-of">Mission ${s.mission} of ${n}</span>${stripHTML(n, s.mission, s.completed)}</div>`;
}
function refreshMission(lvl) {
  const s = state[lvl], n = MISSIONS[lvl].length;
  $('#m-of').textContent = `Mission ${s.mission} of ${n}`;
  $('.strip').outerHTML = stripHTML(n, s.mission, s.completed);
  $('#mission-card').innerHTML = missionCardHTML(lvl);
  corner.sync();
  updateMore();
}
function renderNotes(lvl) {
  $('#notes').innerHTML = missionNotesHTML(lvl);
  $('[data-action=hint]')?.setAttribute('aria-expanded', String(state[lvl].hint));
  corner.sync();
  updateMore();
}
function setHint(lvl, open, { viaFitila } = {}) {
  hideCue();
  const s = state[lvl];
  s.hint = open;
  if (lvl === 'advanced') A.renderNotes(); else renderNotes(lvl);
  if (open) {
    const txt = lvl === 'advanced' ? (s.locked ? 'You have finished this challenge. Press Next challenge for a new one.' : CH.HINTS[s.challenge.type])
      : MISSIONS[lvl][s.mission - 1].hint;
    announce('Hint. ' + txt);
    $('#notes .note.hint')?.scrollIntoView({ block: 'nearest', behavior: reduced() ? 'auto' : 'smooth' });
    if (!viaFitila) corner.sync();
  }
}
function selectMission(lvl, id) {
  const s = state[lvl];
  if (id === s.mission) return;
  cancelTimers('lvl', 'lvl-stage'); // the panel's staged entry must still finish, or controls stay hidden
  s.mission = id; s.hint = false; s.success = false;
  const card = $('#mission-card');
  if (card && !staticMotion()) { card.classList.remove('stage-in'); void card.offsetWidth; card.style.animationDelay = '0ms'; card.classList.add('stage-in'); }
  if (lvl === 'intermediate') LEVEL.intermediate.enterMission();
  refreshMission(lvl);
  LEVEL[lvl].draw(); setCaption(LEVEL[lvl].caption());
  LEVEL[lvl].cueControl?.();
  corner.reset();
  announce(`Mission ${id}: ${plain(MISSIONS[lvl][id - 1].text)}`);
}
// Award once per visit; record completion idempotently; never auto-advance.
function completeMission(lvl) {
  const s = state[lvl], mi = MISSIONS[lvl][s.mission - 1];
  if (s.success) return;
  s.success = true;
  s.hint = false; // the success note takes the hint's place, so the panel never piles up
  const wasDone = s.completed.includes(mi.id);
  if (!wasDone) s.completed = [...s.completed, mi.id].sort((x, y) => x - y);
  persist();
  renderChrome();
  refreshMission(lvl);
  $(`[data-mission="${mi.id}"]`)?.classList.add('just-done');
  corner.react('nod');
  chime('ok');
  announce(`Mission complete! ${plain(mi.success)}`);
  if (!wasDone && s.completed.length === MISSIONS[lvl].length && !state.session.completeShown[lvl] && !demo) {
    state.session.completeShown[lvl] = true;
    later('lvl-complete', 1100, () => levelCompleteDialog(lvl));
  }
}

const PICKER_SHORT = { read: 'Read graph', two: 'Two points', missing: 'Missing value', targets: 'Targets' };

// =====================================================================================
// Beginner — Line Lab
// =====================================================================================
const sliderHTML = (id, sym, label, min, max, step, v, stage = 2) => `
  <div class="slider" id="${id}-wrap" data-stage="${stage}">
    <div class="slider-top"><label for="${id}"><b>${sym}</b> · ${label}</label><output id="${id}-out" for="${id}">${numHTML(v)}</output></div>
    <div class="slider-body"><span aria-hidden="true">${numText(min)}</span>
      <input type="range" id="${id}" min="${min}" max="${max}" step="${step}" value="${v}" aria-valuetext="${sym} = ${numText(v)}" style="--fill:${((v - min) / (max - min)) * 100}%">
      <span aria-hidden="true">${numText(max)}</span></div>
  </div>`;
function syncSlider(id, sym, v) {
  const el = $('#' + id);
  if (Number(el.value) !== v) el.value = v;
  el.style.setProperty('--fill', `${((v - el.min) / (el.max - el.min)) * 100}%`);
  el.setAttribute('aria-valuetext', `${sym} = ${numText(v)}`);
  $(`#${id}-out`).innerHTML = numHTML(v);
}

const B = LEVEL.beginner = {
  walk: null,
  get s() { return state.beginner; },
  // Staged entry: mission first; the slider(s) this mission needs next; the rest after.
  // Graph options and the explanation stay hidden until the learner first moves a slider.
  panel() {
    const s = this.s, cue = BEGINNER_MISSIONS[s.mission - 1].cue;
    return `
      <div class="lvl-head" data-stage="1"><h2 class="lvl-title" id="lvl-title" tabindex="-1">Line Lab</h2>${missionHeadHTML('beginner')}</div>
      <div class="mission-card" id="mission-card" data-stage="1">${missionCardHTML('beginner')}</div>
      <div class="equation" id="b-eq" aria-hidden="true" data-stage="2">${equationHTML(s.m, s.c)}</div>
      ${sliderHTML('b-m', 'm', 'Tilt', -4, 4, 0.5, s.m, cue.includes('m') ? 2 : 3)}
      ${sliderHTML('b-c', 'c', 'Move up or down', -6, 6, 1, s.c, cue.includes('c') ? 2 : 3)}
      <div class="row" data-stage="3"><button class="btn primary" type="button" id="b-walk">Walk the line</button></div>
      <div class="disc-row" data-stage="3" data-gate="moved"><details class="disclosure" id="b-opts" ${s.optionsOpen ? 'open' : ''}><summary>${I.chev}Graph options</summary>
        <div class="disclosure-body">
          <label class="check"><input type="checkbox" id="b-rr" ${s.riseRun ? 'checked' : ''}> Show rise and run</label>
          <label class="check"><input type="checkbox" id="b-ll" ${s.lessonLine ? 'checked' : ''}> Show the lesson’s line, y = 2x − 4</label>
        </div></details>
      <details class="disclosure" id="b-why" ${s.whyOpen ? 'open' : ''}><summary>${I.chev}Why this line?</summary>
        <div class="disclosure-body"><ol class="why-list" id="b-why-list"></ol></div></details></div>`;
  },
  after() { this.explain(); },
  sentences() {
    const { m, c } = this.s;
    const s1 = m === 0 ? `<i>m</i> = 0, so the line is flat. It does not go up or down.`
      : `<i>m</i> = ${numHTML(m)} is ${m > 0 ? 'positive, so the line climbs uphill' : 'negative, so the line goes downhill'} from left to right. It is ${steepness(m)}.`;
    const t = beginnerTriangle(m, c);
    const s2 = t ? `For every ${t.run} square${t.run > 1 ? 's' : ''} across, the line goes ${t.rise > 0 ? 'up' : 'down'} ${numHTML(Math.abs(t.rise))}.`
      : 'For every square across, the line goes up 0: it stays level.';
    const s3 = `<i>c</i> = ${numHTML(c)}, so the line crosses the y-axis at (0, ${numHTML(c)}).`;
    return [s1, s2, s3];
  },
  explain() {
    const [s1, s2, s3] = this.sentences();
    $('#b-why-list').innerHTML = `<li>${s1}</li><li>${s2}</li><li>${s3}</li>`;
    if (!this.walk) setCaption(this.caption());
  },
  // Under the graph: the walk instruction until the learner moves something, then a live
  // plain-words reading of the line (the walk's own commentary while the hiker is out).
  caption() {
    return this.walk?.caption || (state.session.moved.beginner ? this.sentences()[0] : 'Press “Walk the line” to send the hiker along your line.');
  },
  cueControl() {
    const cue = BEGINNER_MISSIONS[this.s.mission - 1].cue;
    const ids = cue === 'mc' ? ['b-m', 'b-c'] : ['b-' + cue];
    for (const id of ids) $(`#${id}-wrap`)?.classList.add('cue');
    $('#mission-card')?.classList.add('cue');
    later('lvl-cue-ctl', 650, () => $$('.cue').forEach((e) => e.classList.remove('cue')));
  },
  draw() {
    const { m, c, riseRun, lessonLine } = this.s;
    G.ref.innerHTML = lessonLine ? lineSVG(2, -4, 'ref-line') : '';
    const t = beginnerTriangle(m, c);
    if (riseRun && t) {
      const [p0, p1, p2] = t.pts;
      const lx = clamp((px(p0.x) + px(p1.x)) / 2, PAD + 30, VIEW - PAD - 30);
      const ly = clamp(py(c) + (t.rise > 0 ? 24 : -12), PAD + 18, VIEW - PAD - 8);
      const ry = clamp(py(c + t.rise / 2) + 6, PAD + 18, VIEW - PAD - 8);
      G.tri.innerHTML = `<g clip-path="url(#plot-clip)">`
        + `<polygon class="tri" points="${t.pts.map((p) => `${px(p.x)},${py(p.y)}`).join(' ')}"/>`
        + `<line class="run-seg" x1="${px(p0.x)}" y1="${py(p0.y)}" x2="${px(p1.x)}" y2="${py(p1.y)}"/>`
        + `<line class="rise-seg" x1="${px(p1.x)}" y1="${py(p1.y)}" x2="${px(p2.x)}" y2="${py(p2.y)}"/></g>`
        + `<text class="run-label" x="${lx}" y="${ly}" text-anchor="middle">across ${t.run}</text>`
        + `<text class="rise-label" x="${px(p1.x) + 9}" y="${ry}">${t.rise > 0 ? 'up' : 'down'} ${numText(Math.abs(t.rise))}</text>`;
    } else G.tri.innerHTML = '';
    G.line.innerHTML = lineSVG(m, c);
    G.marks.innerHTML = `<circle class="int-dot" cx="${px(0)}" cy="${py(c)}" r="7"/>`
      + `<text class="int-label" x="${px(0) - 12}" y="${clamp(py(c) - 10, PAD + 16, VIEW - PAD - 6)}" text-anchor="end">(0, ${numText(c)})</text>`;
    setDesc(`Red line ${equationText(m, c)}. It crosses the y-axis at (0, ${numText(c)}).${lessonLine ? ' The lesson’s line y = 2x − 4 is shown dashed.' : ''}`);
    if (this.walk && !this.walk.raf) this.placeHiker(this.walk.endX);
  },
  onSlide(which, v) {
    const s = this.s;
    if (s[which] === v) return;
    s[which] = v;
    ungate();
    syncSlider('b-' + which, which, v);
    $('#b-eq').innerHTML = equationHTML(s.m, s.c);
    const term = $('#b-eq .eq-' + which) || $('#b-eq .eq-c');
    term?.classList.add('flash');
    later('lvl-flash', 250, () => $$('#b-eq .flash').forEach((e) => e.classList.remove('flash')));
    if (this.walk && !this.walk.raf) this.stopWalk(true);
    this.draw(); this.explain();
    if (!this.walk) setCaption(this.caption());
    announce(equationText(s.m, s.c), 700);
  },
  // Checked after a real slider movement (on release / each key step), never on mount.
  evaluate() {
    const s = this.s;
    if (BEGINNER_MISSIONS[s.mission - 1].test({ m: s.m, c: s.c })) completeMission('beginner');
  },
  placeHiker(x) {
    const { m, c } = this.s, y = m * x + c;
    const op = clamp((8.4 - Math.abs(y)) / 0.6, 0, 1) * clamp((8.4 - Math.abs(x)) / 0.4, 0, 1);
    G.hiker.innerHTML = `<circle class="hiker" r="10" cx="${px(x)}" cy="${py(clamp(y, -9, 9))}" opacity="${op}"/>`;
  },
  startWalk() {
    this.stopWalk(true);
    const dirCap = () => { const m = this.s.m; return m > 0 ? 'Climbing uphill…' : m < 0 ? 'Walking downhill…' : 'Walking on flat ground…'; };
    const endCap = () => { const m = this.s.m; return m > 0 ? 'That was uphill: m is positive.' : m < 0 ? 'That was downhill: m is negative.' : 'Flat all the way: m is 0.'; };
    const finish = () => { this.walk = { caption: endCap(), endX: 8 }; this.placeHiker(8); setCaption(endCap()); announce(endCap()); };
    if (reduced()) return finish();
    const t0 = performance.now();
    this.walk = { caption: dirCap() };
    setCaption(dirCap());
    announce(dirCap());
    const step = (now) => {
      const p = Math.min(1, (now - t0) / 3200);
      this.placeHiker(-8 + 16 * p);
      const cap = dirCap();
      if (cap !== this.walk.caption) { this.walk.caption = cap; setCaption(cap); }
      if (p < 1) this.walk.raf = requestAnimationFrame(step); else finish();
    };
    this.walk.raf = requestAnimationFrame(step);
  },
  stopWalk(clear) {
    if (this.walk?.raf) cancelAnimationFrame(this.walk.raf);
    this.walk = null;
    if (clear) { G.hiker.innerHTML = ''; if (state.screen === 'beginner') setCaption(this.caption()); }
  },
};

// =====================================================================================
// Intermediate — Two-point Gradient
// =====================================================================================
const Iv = LEVEL.intermediate = {
  drag: null,
  get s() { return state.intermediate; },
  panel() {
    const s = this.s;
    return `
      <div class="lvl-head" data-stage="1"><h2 class="lvl-title" id="lvl-title" tabindex="-1">Two-point Gradient</h2>
        <p class="lvl-sub">Drag the points. Explore the slope.</p>${missionHeadHTML('intermediate')}</div>
      <div class="mission-card" id="mission-card" data-stage="1">${missionCardHTML('intermediate')}</div>
      <div class="point-chips" id="i-chips" data-stage="2"></div>
      <div class="disc-row" data-stage="3"><details class="disclosure" id="i-opts"><summary>${I.chev}Options</summary>
        <div class="disclosure-body toggles">
          <label class="check"><input type="checkbox" id="i-predict" ${s.predict ? 'checked' : ''}> Predict before you see</label>
          <label class="check"><input type="checkbox" id="i-eq" ${s.equation ? 'checked' : ''}> Show the equation</label>
        </div></details></div>
      <div id="i-predict-box" data-stage="3"></div>
      <div id="i-working" data-stage="3"></div>`;
  },
  after() { this.chips(); this.renderPredict(); this.renderWorking(false); },
  caption() { return this.s.mission === 4 ? 'A and B can only move along y = 2x − 4.' : 'Drag A or B, or select one and use the arrow keys.'; },
  enterMission() {
    const s = this.s;
    if (s.mission === 4 && !(isLegalM4(s.a) && isLegalM4(s.b) && s.a.x !== s.b.x)) {
      s.a = onLessonLine(1); s.b = onLessonLine(3); // legal, distinct; not counted, not awarded
      this.resetPrediction();
      if ($('#i-chips')) { this.chips(); this.renderPredict(); this.renderWorking(false); }
    }
  },
  chips() {
    const chip = (k) => { const p = this.s[k], K = k.toUpperCase();
      return `<button type="button" class="chip" data-focus-point="${k}" aria-label="Select point ${K} at ${pointText(p)}"><span class="sw ${k}"></span><span><b>${K} ${pointText(p)}</b><small>x = ${numText(p.x)}, y = ${numText(p.y)}</small></span></button>`; };
    $('#i-chips').innerHTML = chip('a') + chip('b');
  },
  shown() { return !this.s.predict || this.s.revealed; },
  renderPredict() {
    const s = this.s, box = $('#i-predict-box');
    if (!s.predict) { box.innerHTML = ''; return; }
    box.innerHTML = `<div class="working">
      <p class="predict-q" id="i-q">The line passes through A ${pointText(s.a)} and B ${pointText(s.b)}. What is its gradient?</p>
      <div class="answer-row"><label for="i-pred" class="sr-only">Your gradient</label>
        <input class="answer-box" id="i-pred" autocomplete="off" spellcheck="false" inputmode="text" value="${s.prediction.replace(/"/g, '&quot;')}" ${s.validation ? 'aria-invalid="true"' : ''}>
        <button class="btn primary" type="button" id="i-check">Check</button>
        <button class="btn quiet" type="button" id="i-show">Just show me</button></div>
      <div class="notes" id="i-pfb">${this.feedbackHTML()}</div></div>`;
  },
  feedbackHTML() {
    const s = this.s;
    if (s.validation) return note('hint', 'Type a number', `<p>${s.validation}</p>`);
    const f = s.feedback;
    if (!f) return '';
    const l = lineThrough(s.a, s.b), g = l.kind === 'line' ? numHTML(l.m) : '';
    const ans = f.value !== undefined ? numHTML(f.value) : '';
    const T = {
      correct: ['ok', 'Spot on!', `You predicted ${ans}, and the gradient is ${g}.`],
      reciprocal: ['bad', 'Upside down', `You found change in x ÷ change in y. The gradient is the other way up: ${g}.`],
      sign: ['bad', 'Check the sign', `The size is right but the sign is not. This line ${l.m > 0 ? 'rises' : 'falls'}, so the gradient is ${g}.`],
      other: ['bad', 'Not quite', `You predicted ${ans}. The working below shows how to get ${g}.`],
      vertical: ['bad', 'Careful', 'The change in x is 0, so you cannot divide by it. This vertical line has no number for its gradient.'],
    }[f.kind];
    return note(T[0], T[1], `<p>${T[2]}</p>`);
  },
  workingHTML(animate) {
    const s = this.s, { a, b } = s, l = lineThrough(a, b);
    const pts = `<b>A</b> (${numHTML(a.x, 'rx')}, ${numHTML(a.y, 'ry')}) and <b>B</b> (${numHTML(b.x, 'rx')}, ${numHTML(b.y, 'ry')})`;
    const steps = [`<p class="calc">${CH.gradientChainHTML(a, b)}</p>`];
    if (l.kind === 'vertical') {
      steps.push(note('bad', 'Division by zero.', '<p>The change in x is 0, so the line is vertical. You cannot divide by 0, so this line has no number for its gradient. Move A or B sideways.</p>'));
    } else {
      steps.push(`<p>${l.m > 0 ? 'The line climbs uphill from left to right.' : l.m < 0 ? 'The line goes downhill from left to right.' : 'The line is flat.'}</p>`);
      if (s.equation) {
        steps.push(`<p class="calc">${CH.interceptHTML(a, l.m, 'Using A: ')}</p>`);
        steps.push(`<p class="big-eq">${equationHTML(l.m, l.c)}</p>`);
      }
    }
    return `<div class="working ${animate ? 'reveal' : ''}"><h3>Working it out <span class="work-pts">${pts}</span></h3>${steps.map((h, i) =>
      `<div class="work-step" style="animation-delay:${600 + i * 150}ms">${h}</div>`).join('')}</div>`;
  },
  renderWorking(animate) {
    $('#i-working').innerHTML = this.shown() ? this.workingHTML(animate && !reduced()) : '';
    updateMore();
  },
  resetPrediction() {
    const s = this.s;
    s.revealed = false; s.feedback = null; s.validation = null; s.prediction = '';
  },
  reveal({ feedback } = {}) {
    const s = this.s;
    s.revealed = true; s.validation = null; s.feedback = feedback || null;
    // the feedback and working now answer the question: fold the question line, close an open hint
    $('#i-predict-box .working')?.classList.add('answered');
    if (s.hint) { s.hint = false; renderNotes('intermediate'); }
    $('#i-pfb').innerHTML = this.feedbackHTML();
    $('#i-pred')?.removeAttribute('aria-invalid');
    this.draw({ trace: true });
    this.renderWorking(true);
    if (feedback) {
      announce(plain(this.feedbackHTML()));
      if (feedback.kind === 'correct') { corner.react('nod'); chime('ok'); } else {
        corner.react('retry');
        const box = $('#i-pred'); box?.classList.remove('shake'); void box?.offsetWidth; box?.classList.add('shake');
      }
    } else announce('Working shown.');
  },
  checkPrediction() {
    const s = this.s, raw = $('#i-pred').value, l = lineThrough(s.a, s.b);
    s.prediction = raw;
    const v = parseAnswer(raw);
    if (l.kind === 'vertical' && raw.trim()) return this.reveal({ feedback: { kind: 'vertical' } });
    if (v === null) {
      s.validation = 'Type your gradient as a number, like 2, −1, 1/2 or 0.5.';
      $('#i-pfb').innerHTML = this.feedbackHTML();
      $('#i-pred').setAttribute('aria-invalid', 'true');
      announce(s.validation);
      return;
    }
    const kind = near(v, l.m) ? 'correct' : l.m !== 0 && near(v, 1 / l.m) ? 'reciprocal' : near(v, -l.m) ? 'sign' : 'other';
    this.reveal({ feedback: { kind, value: v } });
  },
  draw({ trace } = {}) {
    const s = this.s, { a, b } = s, l = lineThrough(a, b);
    G.ref.innerHTML = s.mission === 4 ? lineSVG(2, -4, 'ref-line') : '';
    G.line.innerHTML = l.kind === 'vertical' ? verticalSVG(a.x) : l.kind === 'line' ? lineSVG(l.m, l.c) : '';
    G.tri.innerHTML = this.shown() && l.kind !== 'coincident' ? this.triangleSVG(trace && !reduced()) : '';
    this.drawPoints();
    setDesc(`Point A at ${pointText(a)}, point B at ${pointText(b)}. A red line passes through A and B.${s.mission === 4 ? ' Both points stay on the dashed line y = 2x − 4.' : ''}`);
  },
  triangleSVG(trace) {
    const { a, b } = this.s, c = { x: b.x, y: a.y }, dx = b.x - a.x, dy = b.y - a.y;
    const L = (p, q) => Math.hypot(px(p.x) - px(q.x), py(p.y) - py(q.y));
    let h = '';
    if (dx !== 0 && dy !== 0) h += `<polygon class="tri" points="${px(a.x)},${py(a.y)} ${px(c.x)},${py(c.y)} ${px(b.x)},${py(b.y)}"/>`;
    if (dx !== 0) h += `<line class="run-seg ${trace ? 'trace' : ''}" style="--len:${L(a, c)}" x1="${px(a.x)}" y1="${py(a.y)}" x2="${px(c.x)}" y2="${py(c.y)}"/>`;
    if (dy !== 0) h += `<line class="rise-seg ${trace ? 'trace second' : ''}" style="--len:${L(c, b)}" x1="${px(c.x)}" y1="${py(c.y)}" x2="${px(b.x)}" y2="${py(b.y)}"/>`;
    // Run label: outside the triangle (opposite side to B), flipped near the grid edge.
    if (dx !== 0) {
      let below = dy >= 0;
      const yb = py(a.y) + 24, ya = py(a.y) - 12;
      if (below && yb > VIEW - PAD - 4) below = false; else if (!below && ya < PAD + 16) below = true;
      const xm = clamp((px(a.x) + px(c.x)) / 2, PAD + 44, VIEW - PAD - 44);
      h += `<text class="run-label" x="${xm}" y="${below ? yb : ya}" text-anchor="middle">across ${numText(dx)}</text>`;
    }
    if (dy !== 0) {
      let right = dx >= 0;
      if (right && px(c.x) + 80 > VIEW - PAD) right = false; else if (!right && px(c.x) - 80 < PAD) right = true;
      const ym = clamp((py(c.y) + py(b.y)) / 2 + 6, PAD + 16, VIEW - PAD - 6);
      h += `<text class="rise-label" x="${px(c.x) + (right ? 10 : -10)}" y="${ym}" text-anchor="${right ? 'start' : 'end'}">${dy > 0 ? 'up' : 'down'} ${Math.abs(dy)}</text>`;
    }
    return h;
  },
  // Points are created once and then updated in place so pointer capture and focus survive moves.
  drawPoints() {
    for (const k of ['a', 'b']) {
      let g = G.points.querySelector(`[data-pt=${k}]`);
      const K = k.toUpperCase(), p = this.s[k];
      if (!g) {
        g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        g.setAttribute('class', `pt pt-${k}`);
        g.dataset.pt = k;
        g.setAttribute('tabindex', '0');
        g.setAttribute('role', 'button');
        g.setAttribute('aria-roledescription', 'draggable point');
        g.innerHTML = `<circle class="hit" r="26"/><circle class="ring" r="17"/>`
          + (k === 'a' ? '<circle class="mark" r="9.5"/>' : '<rect class="mark" x="-8.5" y="-8.5" width="17" height="17" rx="2" transform="rotate(45)"/>')
          + `<text class="pt-label"></text>`;
        G.points.appendChild(g);
      }
      g.setAttribute('transform', `translate(${px(p.x)},${py(p.y)})`);
      g.setAttribute('aria-label', `Point ${K} at ${pointText(p)}. Use the arrow keys to move it.`);
      const t = g.querySelector('text');
      const left = p.x >= 4, below = p.y >= 6;
      t.setAttribute('x', left ? -16 : 16); t.setAttribute('y', below ? 28 : -14);
      t.setAttribute('text-anchor', left ? 'end' : 'start');
      t.textContent = `${K} ${pointText(p)}`;
    }
  },
  // Live geometry update while moving (drag or key); evaluation happens in commit().
  tryMove(k, p) {
    const s = this.s, other = k === 'a' ? s.b : s.a, cur = s[k];
    if (p.x === other.x && p.y === other.y) return 'overlap';
    if (p.x === cur.x && p.y === cur.y) return false;
    s[k] = p;
    if (s.predict && (s.revealed || s.feedback || s.validation || s.prediction)) { this.resetPrediction(); this.renderPredict(); }
    else if (s.predict) $('#i-q').textContent = `The line passes through A ${pointText(s.a)} and B ${pointText(s.b)}. What is its gradient?`;
    this.draw();
    this.chips();
    this.renderWorking(false);
    return true;
  },
  commit(k) {
    const s = this.s;
    const g = G.points.querySelector(`[data-pt=${k}]`);
    if (g) { g.classList.remove('dropped'); void g.getBoundingClientRect(); g.classList.add('dropped'); }
    announce(`Point ${k.toUpperCase()} moved to ${pointText(s[k])}.`);
    if (s.mission === 4) {
      s.pairs = commitPair(s.pairs, s.a, s.b);
      const el = $('#pairs'); if (el) el.textContent = `Pairs tried: ${Math.min(3, s.pairs.length)} of 3`;
    }
    if (intermediateComplete(s.mission, s.a, s.b, s.pairs)) completeMission('intermediate');
  },
  key(e, k) {
    const d = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, 1], ArrowDown: [0, -1] }[e.key];
    if (!d) return;
    e.preventDefault();
    const s = this.s, p = s[k];
    const next = s.mission === 4 ? constrainedPoint(p.x + (d[0] || d[1]))
      : { x: clamp(p.x + d[0], FREE.min, FREE.max), y: clamp(p.y + d[1], FREE.min, FREE.max) };
    const r = this.tryMove(k, next);
    if (r === 'overlap') announce(`${k.toUpperCase()} cannot sit on top of the other point.`);
    else if (r) this.commit(k);
  },
  toUnits(e) {
    const pt = svg.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY;
    const q = pt.matrixTransform(svg.getScreenCTM().inverse());
    return { x: ux(q.x), y: uy(q.y) };
  },
  snap(u) {
    return this.s.mission === 4 ? constrainedPoint(u.x)
      : { x: clamp(Math.round(u.x), FREE.min, FREE.max), y: clamp(Math.round(u.y), FREE.min, FREE.max) };
  },
};

// =====================================================================================
// Advanced — Equation Detective
// =====================================================================================
const A = LEVEL.advanced = {
  resetArmed: false,
  get s() { return state.advanced; },
  ensure() { if (!this.s.challenge) state.advanced = freshChallenge(this.s, this.generate()); },
  generate() { return demo?.queue?.length ? demo.queue.shift() : CH.generate(this.s.type, Math.random, this.s.challenge); },
  panel() {
    this.ensure();
    const types = ['mixed', ...CH.TYPES];
    return `
      <div class="lvl-head" data-stage="1"><div class="lvl-title-row a-title-row"><h2 class="lvl-title" id="lvl-title" tabindex="-1">Equation Detective</h2>
        <span class="a-actions"><button class="btn quiet sm" type="button" id="a-new" aria-label="New challenge">New</button>
        <button class="btn quiet sm" type="button" id="a-reset" aria-label="Reset my score">Reset</button></span></div></div>
      <div class="a-toolbar" data-stage="1">
        <details class="disclosure type-picker" id="a-types"><summary>${I.chev}<span><b id="a-type-label"></b></span></summary>
          <div class="disclosure-body"><div class="types" role="group" aria-label="Challenge type">${types.map((t) =>
            `<button type="button" data-type="${t}" aria-pressed="${t === this.s.type}">${CH.TYPE_LABELS[t]}</button>`).join('')}</div></div></details>
        <div class="scores" id="a-scores"></div>
      </div>
      <div id="a-challenge" class="a-challenge"></div>`;
  },
  after() { this.scores(); this.renderChallenge(); },
  scores() {
    const s = this.s;
    const prev = this.lastScores || [];
    const vals = [['Points', s.points], ['Solved', s.solved], ['Streak', s.streak], ['Best', s.bestStreak, 'Best streak']];
    $('#a-scores').innerHTML = vals.map(([l, v, full], k) =>
      `<div class="score" ${full ? `aria-label="${full} ${v}"` : ''}><b class="${prev.length && prev[k] !== v ? 'pop' : ''}">${v}</b><span>${l}</span></div>`).join('');
    this.lastScores = vals.map((x) => x[1]);
    const ch = s.challenge;
    // the closed picker shows a short name so it never truncates beside the scores; the menu keeps full names
    if ($('#a-type-label') && ch) {
      $('#a-type-label').textContent = s.type === 'mixed' ? 'Mixed' : PICKER_SHORT[ch.type];
      $('#a-types > summary').title = (s.type === 'mixed' ? 'Mixed · ' : '') + CH.TYPE_LABELS[ch.type];
    }
  },
  caption() {
    const ch = this.s.challenge;
    if (!ch) return '';
    return { read: 'Find the equation of the red line.', two: this.s.locked ? 'Here is the line through the two points.' : 'No graph this time. Use the coordinates.',
      missing: `The red line is ${equationText(ch.m, ch.c)}.`, targets: 'Move the sliders until the line passes through both dots.' }[ch.type];
  },
  renderChallenge() {
    const s = this.s, ch = s.challenge, dis = s.locked ? 'disabled' : '';
    // Answer boxes sit inside the equation itself; once solved or revealed, the controls step
    // aside (.locked) and the worked solution takes their place, so nothing needs scrolling.
    const box = (id, key, label, ph) => `<label class="sr-only" for="${id}">${label}</label><input class="answer-box" id="${id}" data-input="${key}" placeholder="${ph}" autocomplete="off" spellcheck="false" inputmode="text" value="${s.inputs[key]}" ${dis}>`;
    let controls;
    if (ch.type === 'read' || ch.type === 'two') {
      controls = `<div class="answer-eq" data-stage="2"><i>y</i> = ${box('a-m', 'm', 'm, the gradient', 'm')}<i>x</i> + ${box('a-c', 'c', 'c, the y-intercept', 'c')}</div>`;
    } else if (ch.type === 'missing') {
      controls = `<div class="answer-eq" data-stage="2"><i>${ch.mode}</i> = ${box('a-v', 'v', ch.mode, '?')}</div>`;
    } else {
      controls = `${sliderHTML('a-sm', 'm', 'Gradient', -4, 4, 0.5, s.sliders.m)}${sliderHTML('a-sc', 'c', 'y-intercept', -8, 8, 1, s.sliders.c)}`;
    }
    const eqInline = ch.type === 'targets' ? `<span class="eq-inline" id="a-eq" aria-hidden="true">${equationHTML(s.sliders.m, s.sliders.c)}</span>` : '';
    const host = $('#a-challenge');
    host.classList.toggle('locked', s.locked);
    host.innerHTML = `
      <p class="q" id="a-q" data-stage="1">${CH.questionHTML(ch)}</p>
      <div class="a-controls">${controls}
        <div class="check-row" data-stage="2"><button class="btn primary" type="button" id="a-check" ${dis}>Check answer</button>${eqInline}<span class="attempts" id="a-att"></span></div>
      </div>
      <div class="notes" id="notes"></div>`;
    this.scores();
    if (ch.type === 'targets' && s.locked) for (const id of ['a-sm', 'a-sc']) $('#' + id).disabled = true;
    this.attempts();
    this.renderNotes();
  },
  attempts() {
    const s = this.s, left = 3 - s.attempts;
    $('#a-att').textContent = s.locked ? (s.feedback === 'correct' ? 'Solved.' : 'No attempts left.') : `${left} attempt${left === 1 ? '' : 's'} remaining`;
  },
  renderNotes() {
    const s = this.s, ch = s.challenge;
    let h = '';
    const hintNote = (close) => note('hint', 'Hint', `<p>${CH.HINTS[ch.type]}</p>`, { close });
    if (s.validation) h += note('hint', 'Type a number', `<p>${s.validation}</p>`);
    if (s.hint && !['notyet', 'similar'].includes(s.feedback)) {
      h += s.locked ? note('hint', 'Hint', '<p>You have finished this challenge. Press “Next challenge” for a new one.</p>', { close: true }) : hintNote(true);
    }
    const next = `<button class="btn primary" type="button" data-action="next-challenge">Next challenge</button>`;
    switch (s.feedback) {
      case 'correct': h += note('ok', 'Correct!', `<p>You earned ${s.earned} point${s.earned === 1 ? '' : 's'}.</p>${CH.workingHTML(ch)}${next}`); break;
      case 'notyet': h += note('hint', 'Not yet', `${s.comment ? `<p><b>${s.comment}</b></p>` : ''}<p>${CH.HINTS[ch.type]}</p><p>Try again.</p>`); break;
      case 'similar': // retained hint folded into the header; the worked example is stepped through
        h += note('info', 'Try a similar one first', `<p class="hint-line"><b>Hint:</b> ${CH.HINTS[ch.type]}</p>${CH.similarHTML(s.example)}
          <div class="ex-nav"><button class="btn quiet sm" type="button" data-action="ex-prev">‹ Back</button>
          <span class="ex-count" id="ex-count" aria-live="polite"></span>
          <button class="btn secondary sm" type="button" data-action="ex-next">Next step ›</button></div>`);
        break;
      case 'answer': h += note('bad', 'Here is the answer', `${CH.workingHTML(ch)}${next}`); break;
    }
    $('#notes').innerHTML = h;
    if (s.feedback === 'similar') this.exStep(0);
    corner.sync();
    updateMore();
  },
  // Show worked-example step i (others hidden); the closing line appears on the last step.
  exStep(i) {
    const items = $$('#notes .ex-work .steps > li');
    if (!items.length) return;
    this.exIndex = Math.max(0, Math.min(items.length - 1, i));
    items.forEach((li, k) => li.classList.toggle('ex-current', k === this.exIndex));
    const last = this.exIndex === items.length - 1;
    // the last step's prompt takes the counter's place, so the note never grows a line
    $('#ex-count').textContent = last ? 'Now use the same steps and try again.' : `Step ${this.exIndex + 1} of ${items.length}`;
    $('#ex-count').classList.toggle('ex-done', last);
    $('[data-action=ex-prev]').disabled = this.exIndex === 0;
    $('[data-action=ex-next]').hidden = last;
  },
  draw() {
    const s = this.s, ch = s.challenge;
    G.ref.innerHTML = G.tri.innerHTML = G.points.innerHTML = G.marks.innerHTML = '';
    svg.classList.toggle('hidden-graph', ch.type === 'two' && !s.locked);
    const dot = (p, label) => Math.abs(p.x) <= 8 && Math.abs(p.y) <= 8
      ? `<circle class="pt-dot" cx="${px(p.x)}" cy="${py(p.y)}" r="8"/><text class="pt-label" style="fill:var(--pa)" x="${px(p.x) + (p.x >= 4 ? -14 : 14)}" y="${py(p.y) + (p.y >= 6 ? 26 : -12)}" text-anchor="${p.x >= 4 ? 'end' : 'start'}">${label}</text>` : '';
    if (ch.type === 'read') G.line.innerHTML = lineSVG(ch.m, ch.c);
    else if (ch.type === 'two') {
      G.line.innerHTML = s.locked ? lineSVG(ch.m, ch.c) : '';
      if (s.locked) G.marks.innerHTML = dot(ch.p1, pointText(ch.p1)) + dot(ch.p2, pointText(ch.p2));
    } else if (ch.type === 'missing') {
      G.line.innerHTML = lineSVG(ch.m, ch.c);
      if (s.locked) G.marks.innerHTML = dot({ x: ch.x, y: ch.y }, pointText({ x: ch.x, y: ch.y }));
    } else {
      const { m, c } = s.sliders;
      G.line.innerHTML = lineSVG(m, c);
      G.marks.innerHTML = [ch.t1, ch.t2].map((t) => {
        const hit = CH.onLine(m, c, t), X = px(t.x), Y = py(t.y), cls = hit ? ' hit' : '';
        return `<circle class="target${cls}" cx="${X}" cy="${Y}" r="15"/><circle class="target-core${cls}" cx="${X}" cy="${Y}" r="4.5"/>`
          + (hit ? `<path class="target-check" d="M${X + 12},${Y - 24} l5,5 l10,-11"/>` : '')
          + `<text class="target-label${cls}" x="${X + (t.x > 0 ? -20 : 20)}" y="${Y + (t.y >= 6 ? 34 : -20)}" text-anchor="${t.x > 0 ? 'end' : 'start'}">${pointText(t)}${hit ? ' ✓' : ''}</text>`;
      }).join('');
    }
    let d = CH.describeForSR(ch);
    if (ch.type === 'targets') d += ` Your line is ${equationText(s.sliders.m, s.sliders.c)}. It passes through ${CH.hitCount(ch, s.sliders.m, s.sliders.c)} of the 2 dots.`;
    if (s.locked && ch.type !== 'targets') d += ` The answer: ${CH.answerText(ch)}.`;
    setDesc(d);
  },
  onSlide(which, v) {
    const s = this.s;
    if (s.locked || s.sliders[which] === v) return;
    const before = CH.hitCount(s.challenge, s.sliders.m, s.sliders.c);
    s.sliders[which] = v;
    syncSlider('a-s' + which, which, v);
    $('#a-eq').innerHTML = equationHTML(s.sliders.m, s.sliders.c);
    this.draw();
    const after = CH.hitCount(s.challenge, s.sliders.m, s.sliders.c);
    announce(`${equationText(s.sliders.m, s.sliders.c)}. ${after !== before ? `Passes through ${after} of 2 dots.` : ''}`, 600);
  },
  check() {
    let s = this.s;
    if (s.locked) return; // repeated clicks on a locked check are ignored
    const ch = s.challenge;
    const res = CH.check(ch, ch.type === 'targets' ? { ...s.sliders } : { ...s.inputs });
    if (!res.valid) {
      s.validation = res.message;
      this.renderNotes();
      $$('#a-challenge .answer-box').forEach((el) => { if (parseAnswer(el.value) === null) el.setAttribute('aria-invalid', 'true'); });
      announce(res.message);
      return;
    }
    $$('#a-challenge .answer-box').forEach((el) => el.removeAttribute('aria-invalid'));
    s = state.advanced = { ...recordAttempt(s, res), validation: null };
    s.comment = s.feedback === 'notyet' ? res.comment : null;
    if (s.feedback === 'similar') s.example = CH.similar(ch);
    if (s.feedback === 'correct' || s.feedback === 'answer') s.hint = false;
    persist();
    renderChrome();
    this.scores();
    if (s.locked) {
      $$('#a-challenge input').forEach((el) => { el.disabled = true; });
      $('#a-check').disabled = true;
      $('#a-challenge').classList.add('locked');
    }
    this.attempts();
    this.renderNotes();
    if (s.feedback === 'answer' && ch.type === 'targets') this.animateSliders(ch.m, ch.c);
    this.draw();
    setCaption(this.caption());
    if (!res.correct) { const row = $('#a-challenge .a-controls'); row?.classList.remove('shake'); void row?.offsetWidth; row?.classList.add('shake'); }
    const fb = { correct: () => { corner.react('nod'); chime('ok'); }, notyet: () => corner.react('retry'),
      similar: () => corner.react('retry'), answer: () => corner.react('retry') }[s.feedback];
    fb?.();
    const head = { correct: `Correct! You earned ${s.earned} point${s.earned === 1 ? '' : 's'}. ${CH.answerText(ch)}.`,
      notyet: `Not yet. ${s.comment || ''} Hint: ${CH.HINTS[ch.type]} Try again.`,
      similar: 'Not yet. Try a similar one first: a worked example with different numbers is shown below.',
      answer: `Here is the answer: ${CH.answerText(ch)}.` }[s.feedback];
    announce(head);
    if (s.locked) $('[data-action=next-challenge]')?.focus();
    else if (s.feedback === 'similar') $('#notes .note.info')?.scrollIntoView({ block: 'nearest', behavior: reduced() ? 'auto' : 'smooth' });
  },
  animateSliders(m, c) {
    const s = this.s, from = { ...s.sliders };
    const apply = (mm, cc) => {
      s.sliders = { m: mm, c: cc };
      syncSlider('a-sm', 'm', mm); syncSlider('a-sc', 'c', cc);
      $('#a-eq').innerHTML = equationHTML(mm, cc);
      this.draw();
    };
    if (reduced()) return apply(m, c);
    const t0 = performance.now();
    const step = (now) => {
      if (state.screen !== 'advanced' || this.s.challenge?.type !== 'targets') return;
      const p = Math.min(1, (now - t0) / 700), e = 1 - (1 - p) ** 3;
      if (p < 1) { apply(Math.round((from.m + (m - from.m) * e) * 2) / 2, Math.round(from.c + (c - from.c) * e)); requestAnimationFrame(step); } else apply(m, c);
    };
    requestAnimationFrame(step);
  },
  newChallenge({ focus } = {}) {
    state.advanced = freshChallenge(this.s, this.generate());
    this.renderChallenge(); this.draw(); setCaption(this.caption());
    stageIn($('#a-challenge'));
    corner.reset();
    announce(`New challenge. ${plain(CH.questionHTML(this.s.challenge))}`);
    if (focus) ($('#a-challenge .answer-box') || $('#a-sm'))?.focus();
  },
  setType(t) {
    this.s.type = t;
    $('#a-types')?.removeAttribute('open');
    $$('[data-type]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.type === t)));
    persist();
    this.newChallenge();
  },
  reset() {
    const btn = $('#a-reset');
    if (!this.resetArmed) {
      this.resetArmed = true;
      btn.textContent = 'Confirm?';
      announce('Press Reset again to set all four scores to 0.');
      later('lvl-reset', 4000, () => { this.resetArmed = false; if ($('#a-reset')) $('#a-reset').textContent = 'Reset'; });
      return;
    }
    this.resetArmed = false; cancelTimers('lvl-reset');
    state.advanced = resetScore(this.s);
    btn.textContent = 'Reset';
    persist(); renderChrome(); this.scores();
    announce('Score reset. Points, solved, streak and best streak are all 0.');
  },
};

// =====================================================================================
// Dialogs (completion). User-dismissable, focus trapped, Escape closes, focus returns.
// =====================================================================================
let dialog = null;
function openDialog(html, { onClose } = {}) {
  closeDialog(false);
  const prev = document.activeElement;
  const root = document.createElement('div');
  root.className = 'scrim';
  root.innerHTML = `<div class="dialog" role="dialog" aria-modal="true" aria-labelledby="dlg-title">${html}</div>`;
  $('#overlays').appendChild(root);
  dialog = { root, prev, onClose };
  $('#app').setAttribute('aria-hidden', 'true');
  root.addEventListener('click', (e) => { if (e.target === root) closeDialog(); });
  (root.querySelector('[data-autofocus]') || root.querySelector('button')).focus();
}
function closeDialog(restore = true) {
  if (!dialog) return;
  const { root, prev, onClose } = dialog;
  dialog = null;
  root.remove();
  $('#app').removeAttribute('aria-hidden');
  onClose?.();
  if (restore) (prev && document.contains(prev) ? prev : $('#lvl-title') || $('#main'))?.focus();
}
// No pop-up (owner): the level-done message appears in the mission card's success note and
// Fitila celebrates once in her corner.
function levelCompleteDialog(lvl) {
  if (state.screen !== lvl) return;
  corner.react('cheer');
  announce(`All missions done. ${LEVEL_DONE}`);
}


// =====================================================================================
// Events (delegated)
// =====================================================================================
$('#brand').addEventListener('click', () => go('welcome'));
$('#tabs').addEventListener('click', (e) => { const t = e.target.closest('.tab'); if (t) go(t.dataset.level); });
$('#btn-sound').addEventListener('click', () => { state.prefs.sound = !state.prefs.sound; persist(); renderChrome(); chime('ok'); announce(state.prefs.sound ? 'Sound on' : 'Sound off'); });
$('#btn-motion').addEventListener('click', () => { state.prefs.reducedMotion = !reduced(); persist(); renderChrome(); cornerStop(); cornerIdle(); announce(reduced() ? 'Reduced motion on' : 'Reduced motion off'); });
$('#btn-replay').addEventListener('click', () => runWalkthrough({ first: false }));
mq.addEventListener?.('change', () => { renderChrome(); cornerStop(); cornerIdle(); });
darkMQ.addEventListener?.('change', () => {
  for (const host of $$('.fitila-stage')) host.querySelector('video')?.remove(), host.classList.remove('video-on');
  poolTheme = null;
  cornerStop(); cornerIdle();
  corner.sync();
  const w = $('#w-fitila img'); if (w) w.src = ASSET[clipFor('greet').last];
});
addEventListener('resize', () => { placeTabIndicator(); if (isLevel(state.screen)) updateMore(); });
$('#panel').addEventListener('scroll', updateMore, { passive: true });

$('#welcome').addEventListener('click', (e) => {
  const g = e.target.closest('[data-go]');
  if (g) { go(g.dataset.go); $('#lvl-title')?.focus(); return; }
  if (e.target.closest('#w-fitila') || e.target.closest('[data-action=close-hint]')) toggleWelcomeTip();
});

$('#fitila').addEventListener('click', () => {
  if (!isLevel(state.screen)) return;
  const lvl = state.screen, open = !state[lvl].hint;
  cornerReact('tap');                      // her own playful reaction (never restarted by rapid taps)…
  setHint(lvl, open, { viaFitila: true }); // …while help opens immediately
});

const panel = $('#panel');
panel.addEventListener('click', (e) => {
  const lvl = state.screen;
  const t = e.target;
  const mBtn = t.closest('[data-mission]');
  if (mBtn) return selectMission(lvl, Number(mBtn.dataset.mission));
  const act = t.closest('[data-action]')?.dataset.action;
  if (act === 'hint') return setHint(lvl, !state[lvl].hint);
  if (act === 'close-hint') { setHint(lvl, false); ((lvl !== 'advanced' && $('[data-action=hint]')) || $('#fitila'))?.focus(); return; }
  if (act === 'next-mission') { const nx = nextMissionId(lvl); if (nx) { selectMission(lvl, nx); $(`[data-mission="${nx}"]`)?.focus(); } return; }
  if (act === 'next-challenge') return A.newChallenge({ focus: true });
  if (act === 'ex-next' || act === 'ex-prev') {
    A.exStep(A.exIndex + (act === 'ex-next' ? 1 : -1));
    return announce(plain($('#notes .ex-current')?.innerHTML || ''));
  }
  const g = t.closest('[data-go]');
  if (g) { go(g.dataset.go); $('#lvl-title')?.focus(); return; }
  if (t.closest('#b-walk')) return B.startWalk();
  const fp = t.closest('[data-focus-point]');
  if (fp) return G.points.querySelector(`[data-pt=${fp.dataset.focusPoint}]`)?.focus();
  if (t.closest('#i-check')) return Iv.checkPrediction();
  if (t.closest('#i-show')) { Iv.s.prediction = $('#i-pred').value; return Iv.reveal(); }
  const ty = t.closest('[data-type]');
  if (ty) return A.setType(ty.dataset.type);
  if (t.closest('#a-check')) return A.check();
  if (t.closest('#a-new')) return A.newChallenge({ focus: true });
  if (t.closest('#a-reset')) return A.reset();
});
panel.addEventListener('input', (e) => {
  const t = e.target;
  if (t.id === 'b-m' || t.id === 'b-c') return B.onSlide(t.id.slice(2), Number(t.value));
  if (t.id === 'a-sm' || t.id === 'a-sc') return A.onSlide(t.id.slice(3), Number(t.value));
  if (t.dataset.input) { A.s.inputs[t.dataset.input] = t.value; return; }
  if (t.id === 'i-pred') Iv.s.prediction = t.value;
});
panel.addEventListener('change', (e) => {
  const t = e.target, s = state[state.screen];
  if (t.id === 'b-m' || t.id === 'b-c') return B.evaluate();
  if (t.id === 'b-rr') { s.riseRun = t.checked; return B.draw(); }
  if (t.id === 'b-ll') { s.lessonLine = t.checked; return B.draw(); }
  if (t.id === 'i-predict') {
    s.predict = t.checked; Iv.resetPrediction(); Iv.renderPredict(); Iv.renderWorking(false); Iv.draw();
    return announce(t.checked ? 'Predict mode on. The working is hidden until you predict.' : 'Predict mode off. The working is shown.');
  }
  if (t.id === 'i-eq') { s.equation = t.checked; return Iv.renderWorking(false); }
});
panel.addEventListener('toggle', (e) => {
  if (e.target.open && e.target.parentElement?.classList.contains('disc-row')) {
    for (const d of e.target.parentElement.querySelectorAll('details[open]')) if (d !== e.target) d.open = false;
  }
  if (e.target.id === 'b-opts') state.beginner.optionsOpen = e.target.open;
  if (e.target.id === 'b-why') state.beginner.whyOpen = e.target.open;
  updateMore();
}, true);
// Desktop: the floating disclosures close on an outside press or Escape.
const floatsDisclosures = matchMedia('(min-width: 900px)');
document.addEventListener('pointerdown', (e) => {
  if (floatsDisclosures.matches) for (const d of $$('.disc-row details[open]')) if (!d.contains(e.target)) d.open = false;
});
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape' || !floatsDisclosures.matches) return;
  for (const d of $$('.disc-row details[open]')) { d.open = false; d.querySelector('summary').focus(); }
});
panel.addEventListener('keydown', (e) => {
  if (e.key !== 'Enter') return;
  if (e.target.id === 'i-pred') { e.preventDefault(); Iv.checkPrediction(); }
  if (e.target.dataset.input) { e.preventDefault(); A.check(); }
});

// Intermediate pointer + keyboard interaction on the SVG points.
svg.addEventListener('pointerdown', (e) => {
  const g = e.target.closest('.pt');
  if (!g || state.screen !== 'intermediate') return;
  e.preventDefault();
  g.focus({ preventScroll: true });
  const k = g.dataset.pt;
  Iv.drag = { k, id: e.pointerId, start: { ...Iv.s[k] }, g };
  g.setPointerCapture(e.pointerId);
  g.classList.add('dragging');
});
svg.addEventListener('pointermove', (e) => {
  const d = Iv.drag;
  if (!d || e.pointerId !== d.id) return;
  Iv.tryMove(d.k, Iv.snap(Iv.toUnits(e)));
});
const endDrag = (e) => {
  const d = Iv.drag;
  if (!d || e.pointerId !== d.id) return;
  Iv.drag = null;
  d.g.classList.remove('dragging');
  const p = Iv.s[d.k];
  if (p.x !== d.start.x || p.y !== d.start.y) Iv.commit(d.k);
};
svg.addEventListener('pointerup', endDrag);
svg.addEventListener('pointercancel', endDrag);
svg.addEventListener('keydown', (e) => {
  const g = e.target.closest?.('.pt');
  if (g && state.screen === 'intermediate') Iv.key(e, g.dataset.pt);
});

document.addEventListener('click', (e) => {
  if (!dialog) return;
  const go2 = e.target.closest('[data-dlg-go]');
  if (go2) { const to = go2.dataset.dlgGo; closeDialog(false); go(to); $('#lvl-title')?.focus(); }
  else if (e.target.closest('[data-dlg-close]')) closeDialog();
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    if (wt) { e.preventDefault(); wt.skip(); return; }
    if (dialog) { e.preventDefault(); closeDialog(); return; }
    if (isLevel(state.screen) && state[state.screen].hint) { setHint(state.screen, false); return; }
    if (!$('#w-tip')?.hidden && state.screen === 'welcome') toggleWelcomeTip();
  }
  if (e.key === 'Tab') trapFocus(e, dialog?.root || wt?.root);
});
function trapFocus(e, root) {
  if (!root) return;
  const f = $$('button:not([disabled]), [href], input:not([disabled]), [tabindex="0"]', root).filter((el) => el.offsetParent !== null);
  if (!f.length) return;
  const first = f[0], last = f[f.length - 1];
  if (!root.contains(document.activeElement)) { e.preventDefault(); first.focus(); }
  else if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
  else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
}

// =====================================================================================
// Opener: the approved splash look (navy, soft rings, gradient line). Fitila flies in from the
// top left, lands and waves; the logo arrives beside her as she lands. ~6 s, skippable, silent.
// The clip is generated on the opener navy, so it sits on the page with no edge. Its 16:9 box
// covers the screen (landscape) or is widened around the composition (portrait); every layer is
// placed in that box's units so the logo always lands beside her.
// =====================================================================================
const FLYIN = { src: 'media/fitila_flyin_dark.mp4', land: 2.5, wave: 3.6 };
function runOpener() {
  return new Promise((resolve) => {
    const still = reduced();
    const el = document.createElement('div');
    el.className = 'opener' + (still ? ' still' : '');
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-label', 'uLesson');
    el.innerHTML = `<div class="op-box">
        <div class="op-rings" aria-hidden="true"><i></i><i></i><i></i><b></b></div>
        ${still ? `<img class="op-video" src="${ASSET.flyin_last}" alt="">`
          : `<video class="op-video" muted playsinline preload="auto" poster="" aria-hidden="true"></video>`}
        <div class="op-glow" aria-hidden="true"></div>
        <div class="op-brand"><div class="op-plate"><img src="${ASSET.logo}" alt="uLesson"></div>
          <div class="op-line" aria-hidden="true"><i></i></div></div>
      </div>
      <button class="btn secondary pill opener-skip" type="button">Skip</button>`;
    $('#overlays').appendChild(el);
    $('#app').setAttribute('aria-hidden', 'true');
    let done = false;
    const timers = [];
    const at = (ms, fn) => timers.push(setTimeout(fn, ms));
    const finish = (fast) => {
      if (done) return; done = true;
      timers.forEach(clearTimeout);
      el.classList.add('out');
      setTimeout(() => { el.remove(); $('#app').removeAttribute('aria-hidden'); resolve(); }, fast || still ? 220 : 650);
    };
    const land = () => el.classList.add('landed');
    if (still) { land(); at(1800, () => finish(false)); }
    else {
      const v = el.querySelector('video');
      let started = false;
      const begin = () => {
        if (started) return; started = true;
        el.classList.add('play');
        at(FLYIN.land * 1000, land);
        at(FLYIN.wave * 1000 + 2300, () => finish(false)); // she waves, holds, then the tour begins
      };
      v.addEventListener('playing', begin, { once: true });
      // If the browser will not play video (power saving, codecs), show her landed instead.
      const fallback = () => { if (started) return; v.replaceWith(Object.assign(new Image(), { className: 'op-video', src: ASSET.flyin_last, alt: '' })); started = true; el.classList.add('play'); land(); at(2600, () => finish(false)); };
      v.addEventListener('error', fallback, { once: true });
      at(2500, () => { if (!started) fallback(); });
      v.src = FLYIN.src;
      v.play().catch(() => {});
    }
    const skip = el.querySelector('.opener-skip');
    skip.addEventListener('click', () => finish(true));
    el.addEventListener('keydown', (e) => { if (e.key === 'Escape') finish(true); });
    skip.focus({ preventScroll: true });
  });
}

// =====================================================================================
// Walkthrough — Fitila-led tour of the real UI on an isolated sandbox state.
// Never writes progress; restores the exact previous task state afterwards.
// =====================================================================================
const CANCEL = Symbol('cancel');
let wt = null;

function makeClock() {
  const c = { t: 0, paused: false, cancelled: false, waiters: new Set(), anims: new Set(), held: [] };
  // Timer-driven (not paint-driven) so the tour keeps time even when frames are throttled.
  let last = performance.now();
  const tick = () => {
    const now = performance.now(), dt = Math.min(250, now - last); last = now;
    if (c.paused) return;
    c.t += dt;
    for (const w of [...c.waiters]) if (c.t >= w.at) { c.waiters.delete(w); w.res(); }
  };
  const iv = setInterval(tick, 30);
  c.sleep = (ms) => new Promise((res, rej) => {
    if (c.cancelled) return rej(CANCEL);
    c.waiters.add({ at: c.t + ms, res, rej });
  });
  c.pause = (on) => {
    c.paused = on;
    if (on) { c.held = document.getAnimations().filter((a) => a.playState === 'running'); c.held.forEach((a) => a.pause()); }
    else { c.held.forEach((a) => { try { a.play(); } catch { /* removed */ } }); c.held = []; }
  };
  c.cancel = () => {
    c.cancelled = true; clearInterval(iv);
    for (const w of c.waiters) w.rej(CANCEL);
    c.waiters.clear();
    for (const a of c.anims) { try { a.cancel(); } catch { /* gone */ } }
  };
  return c;
}

// Narration: Fitila explains what each part is for. Voice: ElevenLabs "sim-adaeze"
// (eleven_multilingual_v2). Captions show the same words, lit up as they are spoken.
const NARRATION = [
  { title: 'Welcome', src: 'media/voice/wt_01_welcome.mp3?v=2', dur: 8.4,
    text: "Hi, I'm Fitila! In Gradient Lab, you'll discover how the slope of a line works. Pick any level to start, and don't worry, you can switch whenever you like." },
  { title: 'Your mission', src: 'media/voice/wt_02_mission.mp3?v=2', dur: 7.5,
    text: 'Each level gives you one mission at a time. Your mission is right here. Read it first, because it tells you exactly what to make.' },
  { title: 'Line Lab', src: 'media/voice/wt_03_sliders.mp3?v=2', dur: 9.5,
    text: 'In Line Lab, the m slider tilts the line. That is the gradient. The c slider moves the whole line up or down. Watch the equation change as you slide.' },
  { title: 'Two-point Gradient', src: 'media/voice/wt_04_points.mp3?v=2', dur: 9.6,
    text: 'In Two-point Gradient, you drag points A and B. The blue step shows how far across, and the green step shows how far up. The gradient is up, divided by across.' },
  { title: 'Equation Detective', src: 'media/voice/wt_05_challenge.mp3?v=2', dur: 7.5,
    text: 'In Equation Detective, you solve challenges. Type m and c, then press Check. Get it right the first time to earn three points.' },
  { title: 'Need a hint?', src: 'media/voice/wt_06_hint.mp3?v=2', dur: 3.6,
    text: "Stuck? Tap me any time, and I'll give you a hint." },
  { title: 'Your turn', src: 'media/voice/wt_07_your_turn.mp3?v=2', dur: 4.0,
    text: "That's it! Now it's your turn. Choose a level, and let's begin." },
];
const STEPS = NARRATION.map((n) => n.text);

async function runWalkthrough({ first }) {
  if (wt) return;
  stopTransient();
  const snapshot = structuredClone(state);
  const prevFocus = document.activeElement;
  // Sandbox: fresh state with the learner's presentation prefs; walkthrough demo values.
  state = initialState();
  state.prefs = { ...snapshot.prefs };
  state.session.welcomeGestured = true;
  state.beginner.mission = 5; // demo moves (y = x, then y = x + 1) cannot complete this mission
  const stepMode = reduced() || innerWidth < 900;
  demo = { queue: [], static: stepMode };

  const root = document.createElement('div');
  root.className = 'wt';
  root.setAttribute('role', 'dialog');
  root.setAttribute('aria-modal', 'true');
  root.setAttribute('aria-label', 'Walkthrough');
  root.innerHTML = `<div class="wt-block"></div><div class="wt-ring" id="wt-ring"></div>
    <div class="wt-guide" id="wt-guide" hidden><img alt="" src="${ASSET.neutral}"></div>
    <svg class="wt-cursor" id="wt-cursor" viewBox="0 0 24 24" aria-hidden="true" style="opacity:0"><path d="M4 2l15 11.5-6.5 1 3.6 6.8-2.6 1.4-3.7-6.9L4 20z" fill="#fff" stroke="#09223d" stroke-width="1.6" stroke-linejoin="round"/></svg>
    <div class="wt-bar">
      <div class="wt-progress" aria-hidden="true">${NARRATION.map(() => '<span><i></i></span>').join('')}</div>
      <div class="wt-chip" id="wt-chip" aria-hidden="true"><b id="wt-num"></b><span id="wt-title"></span></div>
      <p class="wt-caption" id="wt-caption" aria-live="polite"></p>
      <div class="wt-controls">
        <button class="btn quiet sm wt-voice" type="button" id="wt-voice" aria-pressed="true">Voice on</button>
        ${stepMode
          ? '<button class="btn quiet sm" type="button" id="wt-back">Back</button><button class="btn primary sm" type="button" id="wt-next">Next</button>'
          : '<button class="btn quiet sm" type="button" id="wt-pause" aria-pressed="false">Pause</button>'}
        <button class="btn secondary sm" type="button" id="wt-skip">Skip</button></div>
    </div>`;
  $('#overlays').appendChild(root);
  $('#app').setAttribute('aria-hidden', 'true');
  document.body.classList.add('wt-active');
  const clock = makeClock();
  let fast = stepMode;
  let finished = false, resolveDone;
  const done = new Promise((r) => { resolveDone = r; });
  wt = { root, skip: () => finish() };

  const appEl = $('#app');
  const narrow = innerWidth < 900;
  const BASE = narrow ? 1 : 0.86; // the stage shrinks a little to make room for the caption bar
  if (narrow) document.body.style.paddingBottom = '22vh';
  if (!narrow) appEl.style.transform = `translate(${(innerWidth - innerWidth * BASE) / 2}px, 8px) scale(${BASE})`;
  const guideEl = $('#wt-guide'), guideImg = guideEl.querySelector('img'), cursor = $('#wt-cursor'), ring = $('#wt-ring');
  let gpos = null, cpos = { x: innerWidth / 2, y: innerHeight };

  const wait = async (ms) => { if (fast) return; await clock.sleep(ms); if (clock.cancelled) throw CANCEL; };
  const anim = async (el, frames, opts) => {
    if (fast) { const last = frames[frames.length - 1]; Object.assign(el.style, last); return; }
    const a = el.animate(frames, { fill: 'forwards', easing: 'cubic-bezier(.22,.8,.22,1)', ...opts });
    clock.anims.add(a);
    try { await a.finished; } catch { /* cancelled */ }
    clock.anims.delete(a);
    Object.assign(el.style, frames[frames.length - 1]);
    a.cancel();
    if (clock.cancelled) throw CANCEL;
  };

  // ---------- voice + captions ----------
  const audio = new Audio();
  audio.preload = 'auto';
  let voiceOn = state.prefs.voice !== false, blocked = false, speakIdx = -1, speakStart = 0, capTimer = 0;
  const voiceBtn = $('#wt-voice');
  const syncVoiceBtn = () => {
    voiceBtn.textContent = blocked ? 'Turn on voice' : voiceOn ? 'Voice on' : 'Voice off';
    voiceBtn.setAttribute('aria-pressed', String(voiceOn && !blocked));
    voiceBtn.classList.toggle('attention', blocked);
  };
  syncVoiceBtn();
  const elapsed = () => (!audio.paused || audio.currentTime > 0) && !blocked && voiceOn
    ? audio.currentTime : (clock.t - speakStart) / 1000;
  // Caption text is split into words; each lights up when its share of the line is reached.
  const renderCaption = (i) => {
    const words = NARRATION[i].text.split(' ');
    const total = NARRATION[i].text.length;
    let acc = 0;
    $('#wt-caption').innerHTML = words.map((w) => { const at = acc / total; acc += w.length + 1; return `<span class="w" data-at="${at.toFixed(3)}">${w}</span>`; }).join(' ');
    fitCaption();
    $('#wt-num').textContent = `${i + 1}/${NARRATION.length}`;
    $('#wt-title').textContent = NARRATION[i].title;
    const chip = $('#wt-chip');
    chip.classList.remove('swap'); void chip.offsetWidth; chip.classList.add('swap');
    $$('.wt-progress span', root).forEach((sp, k) => { sp.classList.toggle('done', k < i); sp.classList.toggle('now', k === i); sp.firstChild.style.width = k < i ? '100%' : '0%'; });
  };
  // Text must never overflow its box: shrink until two lines fit, keep it centred.
  const fitCaption = () => {
    const cap = $('#wt-caption');
    let fs = narrow ? 17 : 21;
    cap.style.fontSize = fs + 'px';
    while (cap.scrollHeight > cap.clientHeight + 1 && fs > (narrow ? 15 : 14)) { fs -= 1; cap.style.fontSize = fs + 'px'; }
  };
  addEventListener('resize', fitCaption);
  const tickCaption = () => {
    if (speakIdx < 0) return;
    const frac = Math.min(1, elapsed() / NARRATION[speakIdx].dur);
    $$('#wt-caption .w').forEach((w) => { const at = +w.dataset.at; w.classList.toggle('said', at <= frac); });
    const bar = $$('.wt-progress span', root)[speakIdx];
    if (bar) bar.firstChild.style.width = `${frac * 100}%`;
  };
  // Speak line i: returns when the line has finished (audio end, or its length if voice is off/blocked).
  const speak = async (i) => {
    speakIdx = i; speakStart = clock.t;
    renderCaption(i);
    clearInterval(capTimer); capTimer = setInterval(tickCaption, 60);
    audio.pause(); audio.src = NARRATION[i].src; audio.currentTime = 0; audio.muted = !voiceOn;
    blocked = false;
    try { await audio.play(); } catch { blocked = true; }
    syncVoiceBtn();
    if (fast) return;
    while (elapsed() < NARRATION[i].dur - 0.05 && !(audio.ended && !blocked && voiceOn)) await wait(80);
    tickCaption();
  };
  voiceBtn.addEventListener('click', async () => {
    if (blocked) { // first click is the user gesture browsers need for sound
      blocked = false; voiceOn = true; audio.muted = false;
      audio.currentTime = Math.min(elapsed(), NARRATION[speakIdx]?.dur || 0);
      try { await audio.play(); } catch { blocked = true; }
    } else { voiceOn = !voiceOn; audio.muted = !voiceOn; }
    snapshot.prefs.voice = voiceOn;
    syncVoiceBtn();
  });

  // ---------- spotlight ----------
  let ringEl = null, ringPad = 8;
  const placeRing = () => {
    if (!ringEl || !document.contains(ringEl)) { ring.classList.remove('on'); return; }
    const r = ringEl.getBoundingClientRect(), p = ringPad;
    Object.assign(ring.style, { left: r.left - p + 'px', top: r.top - p + 'px', width: r.width + p * 2 + 'px', height: r.height + p * 2 + 'px' });
    ring.classList.add('on');
  };
  const ringOn = (el, pad = 10) => {
    const moved = el !== ringEl;
    ringEl = el; ringPad = pad;
    if (el && narrow) el.scrollIntoView({ block: 'center' }); // scroll first, then measure
    placeRing();
    if (el && moved && !fast) { ring.classList.remove('land'); void ring.offsetWidth; ring.classList.add('land'); }
  };
  addEventListener('scroll', placeRing, { passive: true });
  addEventListener('resize', placeRing);

  // ---------- guide Fitila (faces the workspace in the mascot column) ----------
  const guideAt = (x, y, h, pose) => {
    if (narrow) return;
    guideImg.src = ASSET[pose];
    guideImg.style.transform = pose === 'neutral' ? 'scaleX(-1)' : '';
    guideEl.style.width = h * POSE_RATIO[pose] + 'px'; guideEl.style.height = h + 'px';
    guideEl.style.transform = `translate(${x}px, ${y}px)`;
    guideEl.hidden = false; gpos = { x, y, h };
  };
  const takeOff = async () => {
    if (guideEl.hidden || !gpos || fast || narrow) { guideEl.hidden = true; return; }
    const f = gpos;
    await anim(guideEl, [{ transform: `translate(${f.x}px, ${f.y}px)`, opacity: 1 }, { transform: `translate(${f.x}px, ${f.y - 14}px) scale(.96)`, opacity: 0 }], { duration: 280, easing: 'ease-in' });
    guideEl.hidden = true;
  };
  const land = async (x, y, h, pose) => {
    guideAt(x, y, h, pose);
    if (fast || narrow) return;
    await anim(guideEl, [{ transform: `translate(${x}px, ${y - 18}px) scale(.94)`, opacity: 0 }, { transform: `translate(${x}px, ${y}px)`, opacity: 1 }], { duration: 520, easing: 'cubic-bezier(.34,1.56,.64,1)' });
  };
  const fly = async (x, y, h, pose) => {
    if (fast || narrow) return guideAt(x, y, h, pose);
    if (!gpos || guideEl.hidden) return land(x, y, h, pose);
    await takeOff();
    return land(x, y, h, pose);
  };
  const besideInColumn = (el, h = 150) => {
    const col = $('.mascot-col').getBoundingClientRect(), r = el.getBoundingClientRect();
    const w = h * POSE_RATIO.neutral;
    return { x: col.left + (col.width - w) / 2, y: clamp(r.top + r.height / 2 - h / 2, 90, innerHeight * 0.84 - h - 8), h };
  };

  // ---------- pointer ----------
  const cursorTo = async (x, y, ms = 650) => {
    if (fast) { cursor.style.opacity = '0'; return; }
    cursor.style.opacity = '1';
    const from = `translate(${cpos.x}px, ${cpos.y}px)`; cpos = { x, y };
    await anim(cursor, [{ transform: from }, { transform: `translate(${x}px, ${y}px)` }], { duration: ms });
  };
  const centre = (el) => { const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; };
  const cursorToEl = (el, ms) => { const c = centre(el); return cursorTo(c.x - 4, c.y - 2, ms); };
  const press = async (el) => {
    if (!fast) await anim(cursor, [{ transform: `translate(${cpos.x}px, ${cpos.y}px) scale(1)` }, { transform: `translate(${cpos.x}px, ${cpos.y}px) scale(.82)` }, { transform: `translate(${cpos.x}px, ${cpos.y}px) scale(1)` }], { duration: 220 });
    el.click();
    $('.wt-controls button', root)?.focus({ preventScroll: true });
    await wait(80);
  };
  const thumbPos = (input) => { const r = input.getBoundingClientRect(), p = (input.value - input.min) / (input.max - input.min); return { x: r.left + 14 + p * (r.width - 28), y: r.top + r.height / 2 }; };
  const slideTo = async (id, values) => {
    const input = $('#' + id);
    for (const v of values) {
      input.value = v;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
      if (!fast) { const t = thumbPos(input); await cursorTo(t.x - 2, t.y, 380); }
      await wait(420);
    }
  };
  const type = async (id, text) => {
    const input = $('#' + id);
    if (!fast) await cursorToEl(input, 500);
    input.value = '';
    for (const ch of text) { input.value += ch; input.dispatchEvent(new Event('input', { bubbles: true })); await wait(160); }
  };

  // ---------- the seven beats: actions play while Fitila explains them ----------
  const beats = [
    async () => { // Welcome
      go('welcome'); render();
      const talk = speak(0);
      const stage = $('#w-fitila .fitila-stage');
      ringOn($('.cards'), 14);
      if (!fast) { playClip(stage, 'greet'); await wait(5100); } // the real Welcome Fitila greets
      await cursorToEl($('[data-go=beginner]'), 800);
      await talk;
    },
    async () => { // Beginner: the mission card
      const talk = speak(1);
      ringOn(null);
      if (state.screen === 'welcome') await press($('[data-go=beginner]'));
      $('#fitila').classList.add('wt-hide');
      await wait(900); // staged entry settles
      const card = $('#mission-card');
      const p = besideInColumn(card);
      await fly(p.x, p.y, p.h, 'neutral');
      ringOn(card);
      await talk;
    },
    async () => { // sliders
      const talk = speak(2);
      const mWrap = $('#b-m-wrap');
      ringOn(mWrap);
      const p = besideInColumn(mWrap);
      await fly(p.x, p.y, p.h, 'neutral');
      const t = thumbPos($('#b-m')); await cursorTo(t.x - 2, t.y, 600);
      await slideTo('b-m', [0.5, 1, 1.5, 1]);
      await wait(900);
      ringOn($('#b-c-wrap'));
      const t2 = thumbPos($('#b-c')); await cursorTo(t2.x - 2, t2.y, 500);
      await slideTo('b-c', [1, 2, 1]);
      ringOn($('#b-eq'));
      await talk;
    },
    async () => { // Intermediate
      const talk = speak(3);
      ringOn(null);
      const tab = $('[data-level=intermediate]');
      await cursorToEl(tab, 700); await press(tab);
      $('#fitila').classList.add('wt-hide');
      await wait(1000); // staged entry settles
      const p = besideInColumn($('#i-working'));
      await fly(p.x, p.y, p.h, 'neutral');
      ringOn($('.graph-card'), 6);
      await cursorToEl(G.points.querySelector('[data-pt=b]'), 700);
      Iv.s.a = { x: -3, y: -1 };
      if (Iv.tryMove('b', { x: 2, y: 4 })) Iv.commit('b');
      if (!fast) { const c = centre(G.points.querySelector('[data-pt=b]')); await cursorTo(c.x - 4, c.y - 2, 500); }
      Iv.draw({ trace: true });
      await wait(2600);
      ringOn($('#i-working'));
      await talk;
    },
    async () => { // Advanced
      const talk = speak(4);
      ringOn(null);
      state.advanced = freshChallenge({ ...state.advanced, type: 'read' }, CH.readChallenge(1, 2));
      demo.queue = [CH.readChallenge(-2, 1)];
      const tab = $('[data-level=advanced]');
      await cursorToEl(tab, 700); await press(tab);
      $('#fitila').classList.add('wt-hide');
      await wait(1000); // staged entry settles
      const chBox = $('#a-challenge');
      const p = besideInColumn(chBox);
      await fly(p.x, p.y, p.h, 'neutral');
      ringOn(chBox);
      await type('a-m', '1'); await type('a-c', '2');
      const chk = $('#a-check');
      await cursorToEl(chk, 500); await press(chk);
      await talk;
    },
    async () => { // Hint: a fresh demo challenge first, then tap the corner Fitila
      const talk = speak(5);
      ringOn(null);
      const next = $('[data-action=next-challenge]');
      if (next) { await cursorToEl(next, 600); await press(next); }
      await takeOff();
      const cf = $('#fitila');
      cf.classList.remove('wt-hide');
      ringOn(cf, 8);
      await cursorToEl(cf, 600); await press(cf);
      await talk;
      await wait(700);
    },
    async () => { // Your turn
      const talk = speak(6);
      ringOn(null);
      await cursorToEl($('#brand'), 700); await press($('#brand'));
      cursor.style.opacity = '0';
      guideEl.hidden = true;
      if (!fast) playClip($('#w-fitila .fitila-stage'), 'greet');
      ringOn($('.cards'), 14);
      await talk;
      await wait(900);
      ringOn(null);
    },
  ];

  async function finish() {
    if (finished) return;
    finished = true;
    clock.cancel();
    clearInterval(capTimer);
    audio.pause(); audio.removeAttribute('src');
    removeEventListener('scroll', placeRing);
    removeEventListener('resize', placeRing);
    removeEventListener('resize', fitCaption);
    stopTransient();
    root.remove();
    appEl.style.transform = '';
    document.body.style.paddingBottom = '';
    appEl.removeAttribute('aria-hidden');
    document.body.classList.remove('wt-active');
    $$('.wt-hide').forEach((e) => e.classList.remove('wt-hide'));
    // Restore exactly; first viewing ends at Welcome. The voice preference is kept.
    state = snapshot;
    state.prefs.onboardingSeen = true;
    if (first) { state.screen = 'welcome'; state.session.welcomeGestured = false; }
    demo = null; wt = null;
    persist();
    render();
    const back = !first && prevFocus && prevFocus !== document.body && document.contains(prevFocus) ? prevFocus : (first ? $('#welcome-title') : $('#btn-replay'));
    back?.focus();
    resolveDone();
  }

  $('#wt-skip').addEventListener('click', finish);
  if (stepMode) {
    let i = 0;
    const show = async (n) => {
      // Rebuild sandbox from scratch, then apply beats up to n instantly; narrate step n.
      state = initialState(); state.prefs = { ...snapshot.prefs }; state.session.welcomeGestured = true; state.beginner.mission = 5; demo = { queue: [], static: true };
      $$('.wt-hide').forEach((e) => e.classList.remove('wt-hide'));
      guideEl.hidden = true;
      for (let k = 0; k <= n; k++) await beats[k]();
      speak(n);
      $('#wt-back').disabled = n === 0;
      $('#wt-next').textContent = n === NARRATION.length - 1 ? 'Finish' : 'Next';
    };
    let busy = false;
    const goStep = async (n) => { if (busy) return; busy = true; i = n; try { await show(n); } finally { busy = false; } };
    $('#wt-next').addEventListener('click', () => { if (busy) return; if (i >= NARRATION.length - 1) return finish(); goStep(i + 1); });
    $('#wt-back').addEventListener('click', () => { if (i > 0) goStep(i - 1); });
    await show(0);
    $('#wt-next').focus();
  } else {
    const pauseBtn = $('#wt-pause');
    pauseBtn.addEventListener('click', () => {
      const on = !clock.paused;
      clock.pause(on);
      if (on) audio.pause(); else if (voiceOn && !blocked && !audio.ended) audio.play().catch(() => {});
      pauseBtn.textContent = on ? 'Resume' : 'Pause';
      pauseBtn.setAttribute('aria-pressed', String(on));
    });
    pauseBtn.focus();
    (async () => {
      try {
        for (const b of beats) { await b(); await wait(350); }
        finish();
      } catch (e) { if (e !== CANCEL) { console.error(e); finish(); } }
    })();
  }
  return done;
}

// =====================================================================================
// Boot (owner request): every launch runs the full sequence: opener → walkthrough → Welcome.
// Both are skippable (Skip button or Escape), and the walkthrough never touches saved progress.
// =====================================================================================
async function boot() {
  state.screen = 'welcome';
  state.session.welcomeGestured = true; // the walkthrough's first beat plays the Welcome greeting
  render(); // Welcome is ready behind the opener, so the dissolve reveals it
  if (!state.prefs.onboardingSeen) { state.prefs.onboardingSeen = true; persist(); }
  await runOpener();
  await runWalkthrough({ first: true });
}
boot();

// Exposed for automated checks only (no effect on behaviour).
window.__gradientLab = { get state() { return state; }, get cornerClip() { return cornerClip; }, LEVEL, CH };
