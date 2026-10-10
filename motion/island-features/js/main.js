'use strict';
// Timeline + player. render(t) is a pure function of time.

const DURATION = 32.0;
const TIMELINE = [
  [0, 3.0, sIntro],
  [3.0, 5.6, sMark],
  [5.6, 9.6, sAgents],
  [9.6, 12.6, sNeeds],
  [12.6, 15.4, sDone],
  [15.4, 18.6, sLimits],
  [18.6, 21.8, sTabs],
  [21.8, 24.6, sMusic],
  [24.6, 27.6, sRetract],
  [27.6, DURATION + 1, sOutro],
];

const canvas = document.getElementById('stage');
const ctx = canvas.getContext('2d');
canvas.width = W; canvas.height = H;

function render(t) {
  t = clamp(t + 0.002, 0, DURATION - 1e-4);
  ctx.save();
  ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0);
  ctx.globalAlpha = 1; ctx.filter = 'none'; ctx.globalCompositeOperation = 'source-over';
  chrome(ctx, t);
  ctx.save(); clipPanel(ctx);
  const scene = TIMELINE.find(([a, b]) => t >= a && t < b) || TIMELINE[TIMELINE.length - 1];
  scene[2](ctx, t);
  ctx.restore();
  ctx.restore();
  Grain.draw(ctx, t, 0.03);
}
const ui = { play: document.getElementById('play'), scrub: document.getElementById('scrub'), time: document.getElementById('time'), sound: document.getElementById('sound') };
// Sound: only the reference typing passages (../sfx/typing/), placed at the typed lines
// (tools/mix.py builds audio/soundtrack.* from js/cues.js).
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
window.motionReady = Promise.all(['Inter:400', 'Inter:500', 'Inter:600', 'Inter:700', 'DM Mono:400', 'DM Mono:500']
  .map(s => { const [f, w] = s.split(':'); return document.fonts.load(`${w} 20px "${f}"`); }))
  .catch(() => {})
  .then(() => {
    makeWave();
    if (params.has('capture')) return;
    setPlaying(playing);
    requestAnimationFrame(frame);
  });
