'use strict';
// Timeline + player. render(t) is a pure function of time.

const DURATION = F(492); // 16.37s, the clip's length

const TIMELINE = [
  [0, F(97), scenePrompt],
  [F(97), F(118.5), sceneBurst],
  [F(118.5), F(160.5), sceneConnect],
  [F(160.5), F(214), sceneCards],
  [F(214), F(286.5), sceneField],
  [F(286.5), F(372.5), sceneOverview],
  [F(372.5), DURATION + 1, sceneEnd],
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
  Grain.draw(ctx, t, 0.04);
}

const ui = { play: document.getElementById('play'), scrub: document.getElementById('scrub'), time: document.getElementById('time') };
const params = new URLSearchParams(location.search);
let playing = !params.has('t') && !params.has('capture');
let now = params.has('t') ? parseFloat(params.get('t')) || 0 : 0;
let last = null;

function setPlaying(p) { playing = p; ui.play.textContent = p ? 'Pause' : 'Play'; ui.play.setAttribute('aria-pressed', String(p)); last = null; }
function frame(ts) {
  if (playing) {
    if (last !== null) now += (ts - last) / 1000;
    last = ts;
    if (now >= DURATION) now = 0;
  }
  render(now);
  ui.scrub.value = String(Math.round((now / DURATION) * 1000));
  ui.time.textContent = `${now.toFixed(2)}s / ${DURATION.toFixed(2)}s`;
  requestAnimationFrame(frame);
}
ui.play.addEventListener('click', () => setPlaying(!playing));
ui.scrub.addEventListener('input', () => { now = (ui.scrub.value / 1000) * DURATION; setPlaying(false); });
window.addEventListener('keydown', e => {
  if (e.code === 'Space') { e.preventDefault(); setPlaying(!playing); }
  if (e.code === 'ArrowRight') { now = Math.min(DURATION, now + 1 / 30); setPlaying(false); }
  if (e.code === 'ArrowLeft') { now = Math.max(0, now - 1 / 30); setPlaying(false); }
});

window.renderAt = t => render(t);
window.motionReady = Promise.all(['Inter:400', 'Inter:500', 'Inter:600', 'Figtree:500', 'Instrument Serif:400']
  .map(s => { const [f, w] = s.split(':'); return document.fonts.load(`${w} 20px "${f}"`); }))
  .catch(() => {})
  .then(() => {
    const m = document.createElement('canvas').getContext('2d');
    fitPillFont(m); fitBtnFont(m); fitSerif(m); fitWords(m); fitMark(m);
    if (params.has('capture')) return;
    setPlaying(playing);
    requestAnimationFrame(frame);
  });
