'use strict';
// Timeline + player. render(t) is a pure function of time.

const DURATION = 25.0;
// Bottom-right (Suno) and bottom-left (Base 44) beats, alternating.
const TIMELINE = [
  [0, BR(146), sceneGlowPrompt],   // BR: glass prompt over the swirl, card shuts into the island
  [BR(146), BR(186), sceneSphere], // BR: ringed sphere, which opens its eyes: Bloub
  [BR(186), BR(300), sceneBars],   // BR: discs, glossy waveform bars, squeezed into one
  [BR(300), 11.55, sceneTracks],   // BR: slab, glass, three agent "tracks"
  [11.55, 12.4, sceneTiles],       // BR: stacked tiles merge into one
  [12.4, 14.867, blCards],         // BL: card slam and orbit
  [14.867, 17.75, blPage],         // BL: window, dive onto Allow, click, iris
  [17.75, 20.133, blWords],        // BL: native. local. alive.
  [20.133, 22.43, blSun],          // BL: Bloub mark, the name types in
  [22.43, DURATION + 1, sceneFinale], // BR: glowing wordmark and neon ring
];

const canvas = document.getElementById('stage');
const ctx = canvas.getContext('2d');
canvas.width = W; canvas.height = H;

function render(t) {
  t = clamp(t + 0.002, 0, DURATION - 1e-4);
  ctx.save();
  ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0);
  ctx.globalAlpha = 1; ctx.filter = 'none'; ctx.globalCompositeOperation = 'source-over';
  const scene = TIMELINE.find(([a, b]) => t >= a && t < b) || TIMELINE[TIMELINE.length - 1];
  scene[2](ctx, t);
  ctx.restore();
  Grain.draw(ctx, t, 0.035);
}

const ui = { play: document.getElementById('play'), scrub: document.getElementById('scrub'), time: document.getElementById('time'), sound: document.getElementById('sound') };

// Soundtrack: only the typing passages, at the cue times (tools/mix.py builds
// it from js/cues.js). It is kept within a frame of the picture.
const track = document.getElementById('track');
let soundOn = false;
function syncAudio() {
  if (!track) return;
  const want = soundOn && playing && now < DURATION;
  if (!want) { if (!track.paused) track.pause(); return; }
  if (Math.abs(track.currentTime - now) > 0.06) track.currentTime = now;
  if (track.paused) track.play().catch(() => {});
}
const params = new URLSearchParams(location.search);
// Opens paused behind a "Play with sound" button: browsers only allow audio
// after a click, so the first click starts the picture and the music together.
const startBtn = document.getElementById('start');
let playing = false;
let now = params.has('t') ? parseFloat(params.get('t')) || 0 : 0;
let last = null;

function setPlaying(p) { playing = p; ui.play.textContent = p ? 'Pause' : 'Play'; ui.play.setAttribute('aria-pressed', String(p)); last = null; syncAudio(); }
function frame(ts) {
  if (playing) {
    if (last !== null) now += (ts - last) / 1000;
    last = ts;
    if (now >= DURATION) { now = 0; if (track) track.currentTime = 0; }
  }
  syncAudio();
  render(now);
  ui.scrub.value = String(Math.round((now / DURATION) * 1000));
  ui.time.textContent = `${now.toFixed(2)}s / ${DURATION.toFixed(2)}s`;
  requestAnimationFrame(frame);
}
ui.play.addEventListener('click', () => { if (startBtn) startBtn.hidden = true; setPlaying(!playing); });
function setSound(on) {
  soundOn = on;
  ui.sound.textContent = soundOn ? 'Sound on' : 'Sound off';
  ui.sound.setAttribute('aria-pressed', String(soundOn));
  syncAudio();
}
if (startBtn) {
  if (params.has('t') || params.has('capture')) startBtn.hidden = true;
  startBtn.addEventListener('click', () => {
    startBtn.hidden = true;
    if (now >= DURATION - 0.05) now = 0;
    setSound(true);
    setPlaying(true);
  });
}
ui.sound.addEventListener('click', () => setSound(!soundOn));
ui.scrub.addEventListener('input', () => { now = (ui.scrub.value / 1000) * DURATION; setPlaying(false); });
window.addEventListener('keydown', e => {
  if (e.code === 'Space') { e.preventDefault(); if (startBtn && !startBtn.hidden) startBtn.click(); else setPlaying(!playing); }
  if (e.code === 'ArrowRight') { now = Math.min(DURATION, now + 1 / 30); setPlaying(false); }
  if (e.code === 'ArrowLeft') { now = Math.max(0, now - 1 / 30); setPlaying(false); }
});

window.renderAt = t => render(t);
window.motionReady = Promise.all([
  'Inter:400', 'Inter:500', 'Inter:600', 'Inter:700', 'Inter Tight:600', 'Inter Tight:800', 'Figtree:400', 'Instrument Serif:400', 'DM Mono:400',
].map(s => { const [f, w] = s.split(':'); return document.fonts.load(`${w} 20px "${f}"`); }))
  .catch(() => {})
  .then(() => {
    const m = document.createElement('canvas').getContext('2d');
    fitPromptFont(m); fitTreeFont(m); fitWordFont(m); fitBaseFont(m);
    makeBackdrops(); makeSwirl();
    if (params.has('capture')) return;
    setPlaying(playing);
    requestAnimationFrame(frame);
  });
