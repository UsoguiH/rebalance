'use strict';
// Timeline + player. render(t) is pure: any time can be drawn in any order,
// which is what tools/capture.js relies on to export frames.

const DURATION = 17.75;
const TIMELINE = [
  [0, 0.967, sceneHowDo],
  [0.967, 2.2, sceneSentence],
  [2.2, 4.067, sceneStar],
  [4.067, 6.8, sceneHead],
  [6.8, 8.533, sceneRing],
  [8.533, 9.35, sceneAction],
  [9.35, 10.1, (c, t) => sceneConveyor(c, t, 1)],
  [10.1, 10.8, sceneIntention],
  [10.8, 11.25, (c, t) => sceneConveyor(c, t, 2)],
  [11.25, 12.05, sceneCuriosity],
  [12.05, 13.967, sceneRing2],
  [13.967, 14.033, sceneThroughCut],
  [14.033, 16.12, sceneHand],
  [16.12, 17.45, sceneLove],
  [17.45, DURATION + 1, sceneOutro],
];

const canvas = document.getElementById('stage');
const ctx = canvas.getContext('2d');
canvas.width = W; canvas.height = H;

function render(t) {
  // +2ms keeps keyframes typed as 3-decimal frame times on the right side of the cut
  t = clamp(t + 0.002, 0, DURATION - 1e-4);
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1; ctx.filter = 'none'; ctx.globalCompositeOperation = 'source-over';
  const scene = TIMELINE.find(([a, b]) => t >= a && t < b) || TIMELINE[TIMELINE.length - 1];
  scene[2](ctx, t);
  ctx.restore();
  // film finish
  Grain.draw(ctx, t, 0.055);
  vignette(ctx, 0.12, 0.45);
}

// ------------------------------- player --------------------------------
const ui = {
  play: document.getElementById('play'),
  scrub: document.getElementById('scrub'),
  time: document.getElementById('time'),
};
const params = new URLSearchParams(location.search);
let playing = !params.has('t');
let now = params.has('t') ? parseFloat(params.get('t')) || 0 : 0;
let last = null;

function setPlaying(p) {
  playing = p;
  ui.play.textContent = p ? 'Pause' : 'Play';
  ui.play.setAttribute('aria-pressed', String(p));
  last = null;
}
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
window.motionReady = document.fonts.load(`700 40px ${FONT}`)
  .then(() => Promise.all([600, 800].map(w => document.fonts.load(`${w} 40px ${FONT}`))))
  .catch(() => {})
  .then(() => {
    initShapes();
    if (params.has('capture')) return; // the capture tool drives render() itself
    setPlaying(playing);
    requestAnimationFrame(frame);
  });
