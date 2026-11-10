// Realtime player for the browser. `window.promo` is also what tools/render.mjs drives.
import { createPromo } from './main.js';
import { versusPlate, VERSUS } from './versus.js';
import { renderSoundtrack, toWav } from './audio.js';

const q = new URLSearchParams(location.search);
const canvas = document.getElementById('view');
const promo = await createPromo({ canvas, scale3d: Number(q.get('s3')) || 1 });
window.promo = promo;
window.promoVersus = { plate: () => versusPlate().toDataURL('image/png'), layout: VERSUS };
// Offline renderer hook: returns the soundtrack as a base64 WAV.
window.promoAudio = async () => {
  const bytes = new Uint8Array(toWav(await renderSoundtrack()));
  let s = ''; for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
};

const seek = document.getElementById('seek'), time = document.getElementById('time');
const playBtn = document.getElementById('play'), modeSel = document.getElementById('mode'), soundBtn = document.getElementById('sound');
if (q.get('mode')) modeSel.value = q.get('mode');
let t = Number(q.get('t')) || 0, playing = !q.has('paused') && !q.has('t'), last = performance.now();

// Sound starts on the first click (browsers block autoplay); it follows play, pause, seek and loop.
let ac = null, track = null, src = null, soundOn = false;
function stopSound() { if (src) { try { src.stop(); } catch {} src = null; } }
function startSound() {
  stopSound();
  if (!soundOn || !playing || !track) return;
  src = ac.createBufferSource(); src.buffer = track; src.connect(ac.destination); src.start(0, Math.min(t, track.duration - 0.01));
}
soundBtn.onclick = async () => {
  soundOn = !soundOn; soundBtn.textContent = soundOn ? 'Sound on' : 'Sound off';
  if (soundOn && !track) { ac = new AudioContext(); track = await renderSoundtrack(); }
  if (ac) await ac.resume();
  startSound();
};

function paint() { promo.renderAt(t, modeSel.value); seek.value = t / promo.duration; time.textContent = `${t.toFixed(2)} s`; }
function tick(now) {
  if (playing) {
    const next = t + (now - last) / 1000;
    t = next % promo.duration;
    if (next >= promo.duration) startSound();
    paint();
  }
  last = now; requestAnimationFrame(tick);
}
playBtn.onclick = () => { playing = !playing; playBtn.textContent = playing ? 'Pause' : 'Play'; startSound(); };
seek.oninput = () => { t = seek.value * promo.duration; paint(); startSound(); };
modeSel.onchange = paint;
playBtn.textContent = playing ? 'Pause' : 'Play';
paint();
window.promoReady = true;
requestAnimationFrame(tick);
