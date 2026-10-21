// Mission data. Text, hints and success messages are verbatim from the original brief
// (Gradient_Lab_Original_Brief.pdf). Predicates run only after a real movement.
import { near, lineThrough, clamp } from './math.js';

export const BEGINNER_MISSIONS = [
  { id: 1, cue: 'm', text: 'Make the line climb uphill from left to right.', test: ({ m }) => m > 0,
    hint: 'Uphill lines have a positive gradient. Move the m slider to the right of 0.',
    success: 'A positive gradient makes the line rise from left to right.' },
  { id: 2, cue: 'm', text: 'Make the line go downhill from left to right.', test: ({ m }) => m < 0,
    hint: 'Downhill lines have a negative gradient. Move m below 0.',
    success: 'A negative gradient makes the line fall from left to right.' },
  { id: 3, cue: 'm', text: 'Make the line completely flat.', test: ({ m }) => m === 0,
    hint: 'A flat line neither climbs nor falls. What value of m would that be?',
    success: 'When m = 0, the line is flat. It does not go up or down.' },
  { id: 4, cue: 'c', text: 'Make the line cross the y-axis at 3.', test: ({ c }) => c === 3,
    hint: 'c is the y-intercept. It tells you where the line crosses the y-axis.',
    success: 'c = 3, so the line crosses the y-axis at (0, 3).' },
  { id: 5, cue: 'mc', text: 'Build the line from the lesson: y = 2x − 4.', test: ({ m, c }) => m === 2 && c === -4,
    hint: 'Match the equation to y = mx + c. What is m? What is c?',
    success: 'm = 2 and c = −4. This is the line through A (5, 6) and B (3, 2) from the lesson.' },
  { id: 6, cue: 'mc', text: 'Make a gentle uphill line, y = ½x + 1.', test: ({ m, c }) => m === 0.5 && c === 1,
    hint: 'A gradient of ½ means the line goes up 1 for every 2 steps across.',
    success: 'With m = ½, the line rises 1 square for every 2 squares across. It is less steep than m = 1.' },
  { id: 7, cue: 'm', text: 'Make a downhill line steeper than y = −2x + 1.', test: ({ m }) => m < -2,
    hint: 'Steeper downhill means a bigger negative number. Try something further from 0 than −2.',
    success: 'The further m is from 0, the steeper the line. m = −3 is steeper than m = −2.' },
];

export const INTERMEDIATE_MISSIONS = [
  { id: 1, text: 'Drag A and B so the gradient is 2.',
    hint: 'A gradient of 2 means the change in y is twice the change in x. Try moving 1 across and 2 up.',
    success: 'Change in y ÷ change in x = 2. The line goes up 2 for every 1 across.' },
  { id: 2, text: 'Make the gradient −1.',
    hint: 'The line must fall from left to right, going down 1 for every 1 across.',
    success: 'The line falls 1 for every 1 across, so the gradient is −1.' },
  { id: 3, text: 'Make the gradient ½.',
    hint: 'Change in y must be half of the change in x. Try 2 across and 1 up.',
    success: 'Up 1 for every 2 across gives a gradient of ½.' },
  { id: 4, text: 'Same line, different points. A and B now stay on y = 2x − 4. Try 3 different pairs of points and watch the gradient.',
    hint: 'Drag A or B along the dashed line. Each new position makes a new pair of points.',
    success: 'Every pair of points gave a gradient of 2. The gradient of a straight line is the same for any two points on the line.' },
  { id: 5, text: 'Make a line with gradient −3 that crosses the y-axis at 2.',
    hint: 'Put one point at (0, 2). Then move the other 1 across and 3 down.',
    success: 'Gradient −3 and y-intercept 2: this is the line y = −3x + 2.' },
  { id: 6, text: 'Make the gradient ⅔ using points that are not on the y-axis.',
    hint: 'Change in y ÷ change in x = 2 ÷ 3. Try 3 across and 2 up, away from the y-axis.',
    success: 'Up 2 for every 3 across gives a gradient of ⅔.' },
];

export const LEVEL_DONE = 'You finished every mission at this level. Try the next level.';

// ---------- Intermediate predicates and the Mission 4 constraint ----------
export function intermediateComplete(id, a, b, pairs = []) {
  const l = lineThrough(a, b);
  if (l.kind !== 'line') return false;
  switch (id) {
    case 1: return near(l.m, 2);
    case 2: return near(l.m, -1);
    case 3: return near(l.m, 0.5);
    case 4: return near(l.m, 2) && near(l.c, -4) && new Set(pairs).size >= 3;
    case 5: return near(l.m, -3) && near(l.c, 2);
    case 6: return near(l.m, 2 / 3) && a.x !== 0 && b.x !== 0;
    default: return false;
  }
}

// Mission 4: project to a legal integer x first, then compute y (never round both coordinates).
export const M4 = { min: -1, max: 5 };
export const onLessonLine = (x) => ({ x, y: 2 * x - 4 });
export const constrainedPoint = (rawX) => onLessonLine(clamp(Math.round(rawX), M4.min, M4.max));
export const isLegalM4 = (p) => Number.isInteger(p.x) && p.x >= M4.min && p.x <= M4.max && p.y === 2 * p.x - 4;
export const pairKey = (a, b) => [a.x, b.x].sort((x, y) => x - y).join(',');

// Adds the unordered pair if legal and new. Swapped A/B is the same pair.
export function commitPair(pairs, a, b) {
  if (a.x === b.x || !isLegalM4(a) || !isLegalM4(b)) return pairs;
  const k = pairKey(a, b);
  return pairs.includes(k) ? pairs : [...pairs, k];
}

export const FREE = { min: -7, max: 7 };
