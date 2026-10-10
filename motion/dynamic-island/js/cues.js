'use strict';
// Typed text and the typing sound under it. Each cue plays one of the
// reference video's own typing passages (../sfx/typing/), untouched, and its
// letters land on that passage's key clicks. `at` is when the first click
// sounds. tools/mix.py reads this same file to build the soundtrack, so
// picture and sound can't drift apart.
const PASSAGES = {
  'typing-1.wav': [0.03, 0.125, 0.265, 0.317, 0.442, 0.487, 0.539],
  'typing-2.wav': [0.03, 0.097, 0.162, 0.225, 0.269, 0.329, 0.424, 0.614, 0.711, 0.843, 0.896, 0.993],
  'typing-3.wav': [0.03, 0.077, 0.184, 0.237, 0.282, 0.326],
  'typing-4.wav': [0.03, 0.125, 0.179, 0.282, 0.374, 0.469, 0.561, 0.621, 0.726],
};
const CUES = [
  { "id": "headline", "text": "Bring your agents to life", "at": 0.40, "passage": "typing-1.wav" },
  { "id": "prompt", "text": "Add a dark mode toggle to the settings page", "at": 1.75, "passage": "typing-2.wav" },
  { "id": "agent0", "text": "aurora-web", "at": 10.02, "passage": "typing-3.wav" },
  { "id": "agent1", "text": "pixel-api", "at": 10.36, "passage": "typing-1.wav" },
  { "id": "agent2", "text": "notes-cli", "at": 10.84, "passage": "typing-3.wav" },
  { "id": "name", "text": "Island", "at": 21.46, "passage": "typing-3.wav" }
];

// When each letter of a cue appears: the letters are shared out over the
// passage's clicks in order.
const CUE_TIMES = {};
for (const c of CUES) {
  const k = PASSAGES[c.passage], n = c.text.length;
  CUE_TIMES[c.id] = [...c.text].map((_, i) => c.at + k[Math.min(k.length - 1, Math.floor((i * k.length) / n))] - k[0]);
}
const cueOf = id => CUES.find(c => c.id === id);
// letters of cue `id` visible at time t
function typed(id, t) {
  const ts = CUE_TIMES[id];
  let n = 0;
  while (n < ts.length && ts[n] <= t) n++;
  return n;
}
function cueDone(id) { const ts = CUE_TIMES[id]; return ts[ts.length - 1]; }
