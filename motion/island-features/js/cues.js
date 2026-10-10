'use strict';
// Typed lines and the typing sound under them. Each line plays one of the
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
  { "id": "tagline", "text": "A living Dynamic Island for Windows", "at": 4.15, "passage": "typing-2.wav" },
  { "id": "agents", "text": "Every Claude Code session, as a team.", "at": 6.0, "passage": "typing-2.wav" },
  { "id": "needs", "text": "Allow or deny, right from the island.", "at": 9.9, "passage": "typing-2.wav" },
  { "id": "done", "text": "Bloub tells you when it’s done.", "at": 12.9, "passage": "typing-4.wav" },
  { "id": "limits", "text": "Your real plan limits.", "at": 15.75, "passage": "typing-1.wav" },
  { "id": "tabs", "text": "17 tabs. Pin the ones you use.", "at": 18.95, "passage": "typing-4.wav" },
  { "id": "music", "text": "Your music, one glance away.", "at": 22.15, "passage": "typing-4.wav" },
  { "id": "retract", "text": "Never in your way.", "at": 24.95, "passage": "typing-1.wav" },
  { "id": "url", "text": "github.com/UsoguiH/dynamic-island-windows", "at": 30.35, "passage": "typing-2.wav" }
];

const CUE_TIMES = {};
for (const c of CUES) {
  const k = PASSAGES[c.passage], n = c.text.length;
  CUE_TIMES[c.id] = [...c.text].map((_, i) => c.at + k[Math.min(k.length - 1, Math.floor((i * k.length) / n))] - k[0]);
}
const cueOf = id => CUES.find(c => c.id === id);
function typed(id, t) {
  const ts = CUE_TIMES[id];
  let n = 0;
  while (n < ts.length && ts[n] <= t) n++;
  return n;
}
function cueDone(id) { const ts = CUE_TIMES[id]; return ts[ts.length - 1]; }
