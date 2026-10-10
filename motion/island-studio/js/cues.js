'use strict';
// Typed lines and the typing sound under them. Each cue plays one of the
// reference typing passages (../../sfx/typing/), untouched, and its letters
// land on that passage's key clicks. `at` is when the first click sounds.
// tools/mix.py reads this file to build the soundtrack.
const PASSAGES = {
  'typing-1.wav': [0.03, 0.125, 0.265, 0.317, 0.442, 0.487, 0.539],
  'typing-2.wav': [0.03, 0.097, 0.162, 0.225, 0.269, 0.329, 0.424, 0.614, 0.711, 0.843, 0.896, 0.993],
  'typing-3.wav': [0.03, 0.077, 0.184, 0.237, 0.282, 0.326],
  'typing-4.wav': [0.03, 0.125, 0.179, 0.282, 0.374, 0.469, 0.561, 0.621, 0.726],
};
const CUES = [
  { "id": "prompt1", "text": "Add a dark mode toggle ", "at": 8.40, "passage": "typing-2.wav" },
  { "id": "prompt2", "text": "to the settings page", "at": 9.35, "passage": "typing-4.wav" },
  { "id": "reply1", "text": "Go ahead. Match the colours in @theme.ts ", "at": 13.85, "passage": "typing-2.wav" },
  { "id": "reply2", "text": "and ping me on the @island when it’s done", "at": 14.55, "passage": "typing-2.wav" },
  { "id": "pricing", "text": "Opening the diff", "at": 19.92, "passage": "typing-1.wav" },
  { "id": "end", "text": "A living Dynamic Island for Windows.", "at": 35.0, "passage": "typing-2.wav" }
];
// Some lines are typed as two passages back to back; these stitch them into one.
const JOINED = { prompt: ['prompt1', 'prompt2'], reply: ['reply1', 'reply2'] };

const CUE_TIMES = {};
for (const c of CUES) {
  const k = PASSAGES[c.passage], n = c.text.length;
  CUE_TIMES[c.id] = [...c.text].map((_, i) => c.at + k[Math.min(k.length - 1, Math.floor((i * k.length) / n))] - k[0]);
}
for (const [id, parts] of Object.entries(JOINED)) CUE_TIMES[id] = parts.flatMap(p => CUE_TIMES[p]);
const cueOf = id => JOINED[id] ? { text: JOINED[id].map(p => CUES.find(c => c.id === p).text).join('') } : CUES.find(c => c.id === id);
function typed(id, t) {
  const ts = CUE_TIMES[id];
  let n = 0;
  while (n < ts.length && ts[n] <= t) n++;
  return n;
}
function cueDone(id) { const ts = CUE_TIMES[id]; return ts[ts.length - 1]; }
