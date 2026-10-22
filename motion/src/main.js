// Entry: builds the world, then renders any time t deterministically.
// window.renderFrame(t) is used by tools/render.mjs; the page itself is a preview player.
import * as THREE from 'three';
import { buildWorld } from './world.js';
import { Cues } from './cues.js';
import { Director } from './shots.js';
import { Overlay } from './overlay.js';

export const WIDTH = 1080, HEIGHT = 1920;

async function boot() {
  const fonts = [
    new FontFace('Murmure', 'url(fonts/LeMurmure.otf)'),
    new FontFace('Montserrat', 'url(fonts/Montserrat.ttf)', { weight: '100 900' }),
  ];
  for (const f of fonts) document.fonts.add(await f.load());

  const cuesUrl = new URLSearchParams(location.search).get('cues') || 'cues.json';
  const cues = new Cues(await (await fetch(cuesUrl, { cache: 'no-store' })).json());

  const out = document.getElementById('out');
  out.width = WIDTH; out.height = HEIGHT;
  const ctx = out.getContext('2d');

  const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1);
  renderer.setSize(WIDTH, HEIGHT, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const camera = new THREE.PerspectiveCamera(38, WIDTH / HEIGHT, 0.05, 260);
  const world = buildWorld();
  const director = new Director(world, camera, cues);
  const overlay = new Overlay(cues, director);

  const project = (v) => {
    const p = v.clone().project(camera);
    return { x: (p.x * 0.5 + 0.5) * WIDTH, y: (-p.y * 0.5 + 0.5) * HEIGHT, z: p.z, behind: p.z > 1 };
  };

  function render3D(t) {
    director.apply(t);
    renderer.render(world.scene, camera);
  }

  // Camera speed decides how many sub-frames to blend (motion blur on whips).
  function renderFrame(t, fps = 30) {
    const speed = director.cameraSpeed(t, 1 / fps);
    const samples = speed > 0.06 ? Math.min(6, 3 + Math.round(speed * 10)) : 1;
    const shutter = 0.5 / fps;
    ctx.globalAlpha = 1;
    if (samples === 1) {
      render3D(t);
      ctx.drawImage(renderer.domElement, 0, 0);
    } else {
      for (let i = 0; i < samples; i++) {
        const ts = t - shutter / 2 + (shutter * i) / (samples - 1);
        render3D(ts);
        ctx.globalAlpha = 1 / (i + 1);
        ctx.drawImage(renderer.domElement, 0, 0);
      }
      ctx.globalAlpha = 1;
      director.apply(t);
    }
    overlay.draw(ctx, t, project);
    return out;
  }

  window.renderFrame = (t, fps) => { renderFrame(t, fps); return true; };
  window.frameData = (t, fps, type = 'image/png', q) => { renderFrame(t, fps); return out.toDataURL(type, q); };
  window.duration = cues.duration;
  window.ready = true;

  if (!new URLSearchParams(location.search).has('render')) player(renderFrame, cues.duration);
}

function player(renderFrame, duration) {
  const ui = document.getElementById('ui');
  ui.hidden = false;
  const audio = document.getElementById('vo');
  const scrub = document.getElementById('scrub');
  const btn = document.getElementById('play');
  const label = document.getElementById('time');
  scrub.max = duration;
  let playing = false, t0 = 0, start = 0, hasAudio = false;
  audio.addEventListener('loadedmetadata', () => (hasAudio = true));
  audio.addEventListener('error', () => (hasAudio = false));
  const now = () => (hasAudio && playing ? audio.currentTime : playing ? start + (performance.now() - t0) / 1000 : +scrub.value);
  function tick() {
    let t = now();
    if (t >= duration) { playing = false; t = duration; audio.pause(); btn.textContent = 'Play'; }
    scrub.value = t;
    label.textContent = t.toFixed(2) + 's';
    renderFrame(t, 60);
    if (playing) requestAnimationFrame(tick);
  }
  btn.onclick = () => {
    playing = !playing;
    btn.textContent = playing ? 'Pause' : 'Play';
    if (playing) {
      start = +scrub.value >= duration ? 0 : +scrub.value;
      t0 = performance.now();
      if (hasAudio) { audio.currentTime = start; audio.play(); }
      tick();
    } else audio.pause();
  };
  scrub.oninput = () => { if (!playing) tick(); };
  tick();
}

boot();
