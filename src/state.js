// Session state, scoring and validated persistence. Only the brief's saved items persist:
// last level, completed missions, Advanced metrics and type, plus preferences/onboarding.
export const STORAGE_KEY = 'gradient-lab-v1';
export const LEVELS = ['beginner', 'intermediate', 'advanced'];
const ADV_TYPES = ['mixed', 'read', 'two', 'missing', 'targets'];

export function initialState() {
  return {
    screen: 'welcome',
    lastLevel: null,
    beginner: { mission: 1, m: 0, c: 0, riseRun: true, lessonLine: false, hint: false, success: false, completed: [], optionsOpen: false, whyOpen: false },
    intermediate: {
      mission: 1, a: { x: -3, y: -1 }, b: { x: 1, y: 3 }, predict: false, equation: false,
      revealed: false, prediction: '', feedback: null, validation: null, pairs: [], hint: false, success: false, completed: [],
    },
    advanced: {
      type: 'mixed', challenge: null, attempts: 0, locked: false, feedback: null, validation: null,
      example: null, hint: false, inputs: { m: '', c: '', v: '' }, sliders: { m: 0, c: 0 },
      points: 0, solved: 0, streak: 0, bestStreak: 0,
    },
    prefs: { sound: false, reducedMotion: null, onboardingSeen: false, voice: true },
    session: { completeShown: { beginner: false, intermediate: false }, cueShown: {}, moved: {} },
  };
}

// Valid attempt bookkeeping. Locked or invalid attempts change nothing.
export function recordAttempt(adv, { valid, correct }) {
  if (adv.locked || !valid) return adv;
  const a = { ...adv, attempts: adv.attempts + 1 };
  if (correct) {
    a.earned = 4 - a.attempts; // 3, 2, 1
    a.points += a.earned;
    a.solved += 1;
    a.streak = a.attempts === 1 ? a.streak + 1 : 0;
    a.bestStreak = Math.max(a.bestStreak, a.streak);
    a.locked = true;
    a.feedback = 'correct';
  } else {
    a.streak = 0;
    a.feedback = a.attempts === 1 ? 'notyet' : a.attempts === 2 ? 'similar' : 'answer';
    a.locked = a.attempts >= 3;
  }
  return a;
}
export const freshChallenge = (adv, challenge) => ({
  ...adv, challenge, attempts: 0, locked: false, feedback: null, validation: null, example: null, hint: false,
  comment: null, inputs: { m: '', c: '', v: '' }, sliders: { m: 0, c: 0 },
});
export const resetScore = (adv) => ({ ...adv, points: 0, solved: 0, streak: 0, bestStreak: 0 });

const natural = (v) => Number.isInteger(v) && v >= 0 && v < 1e7;
const ids = (arr, max) => (Array.isArray(arr) ? [...new Set(arr.filter((i) => Number.isInteger(i) && i >= 1 && i <= max))].sort() : []);

export function serialise(state) {
  const a = state.advanced;
  return {
    version: 1,
    lastLevel: LEVELS.includes(state.screen) ? state.screen : state.lastLevel,
    beginner: state.beginner.completed,
    intermediate: state.intermediate.completed,
    advanced: { type: a.type, points: a.points, solved: a.solved, streak: a.streak, bestStreak: a.bestStreak },
    prefs: state.prefs,
  };
}

export function save(state, storage) {
  try { storage.setItem(STORAGE_KEY, JSON.stringify(serialise(state))); return true; } catch { return false; }
}

// Restore into a fresh state, accepting only validated fields.
export function load(storage) {
  const s = initialState();
  let raw;
  try { raw = JSON.parse(storage.getItem(STORAGE_KEY) || 'null'); } catch { return s; }
  if (!raw || raw.version !== 1) return s;
  if (LEVELS.includes(raw.lastLevel)) s.lastLevel = raw.lastLevel;
  s.beginner.completed = ids(raw.beginner, 7);
  s.intermediate.completed = ids(raw.intermediate, 6);
  const a = raw.advanced || {};
  if (ADV_TYPES.includes(a.type)) s.advanced.type = a.type;
  for (const k of ['points', 'solved', 'streak', 'bestStreak']) if (natural(a[k])) s.advanced[k] = a[k];
  s.advanced.bestStreak = Math.max(s.advanced.bestStreak, s.advanced.streak);
  const p = raw.prefs || {};
  if (typeof p.sound === 'boolean') s.prefs.sound = p.sound;
  if (typeof p.reducedMotion === 'boolean') s.prefs.reducedMotion = p.reducedMotion;
  if (typeof p.onboardingSeen === 'boolean') s.prefs.onboardingSeen = p.onboardingSeen;
  if (typeof p.voice === 'boolean') s.prefs.voice = p.voice;
  return s;
}
