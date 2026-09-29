// رحلة الصحراء — integration: renderer, camera rig, game loop, zones, adaptive quality.
import * as THREE from 'three';
import { createWorld } from './world.js';
import { RideController, PropSystem } from './physics.js';
import { createCamelRider } from './camel.js';
import { GameAudio } from './audio.js';
import { content } from './content.js';
import { UI } from './ui.js';
import { createInput } from './controls.js';

const $ = (s) => document.querySelector(s);
const store = {
  get(k, d) { try { const v = localStorage.getItem('drive.' + k); return v === null ? d : v; } catch { return d; } },
  set(k, v) { try { localStorage.setItem('drive.' + k, v); } catch { /* private mode */ } },
};

const params = new URLSearchParams(location.search);
const isCoarse = matchMedia('(pointer:coarse)').matches || Math.min(screen.width, screen.height) < 700;
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
let qualitySetting = params.get('quality') || store.get('quality', 'auto'); // auto|low|med|high
const autoQuality = () => (isCoarse ? 'low' : 'high');
let quality = qualitySetting === 'auto' ? autoQuality() : qualitySetting;
let lang = params.get('lang') || store.get('lang', 'ar');

// ---------- renderer ----------
const canvas = $('#scene');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: !isCoarse, powerPreference: 'high-performance', alpha: false });
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

let pixelRatioCap = quality === 'low' ? 1.5 : quality === 'med' ? 1.75 : 2;
let dynScale = 1; // adaptive resolution multiplier
function resize() {
  const w = window.innerWidth, h = window.innerHeight;
  const pr = Math.min(window.devicePixelRatio || 1, pixelRatioCap) * dynScale;
  renderer.setPixelRatio(pr);
  renderer.setSize(w, h, false);
  canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}

let targetTime = 0.12, timeOfDay = 0.12;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(58, 1, 0.1, 700);

// ---------- game objects ----------
const world = createWorld({ quality });
world.applyTo(scene);
const ride = new RideController({ heightAt: world.heightAt, colliders: world.colliders, worldRadius: 140 });
const propSystem = new PropSystem({ heightAt: world.heightAt, colliders: world.colliders });
const propMeshes = new Map();
for (const p of world.props) {
  const id = propSystem.add({ x: p.x, z: p.z, r: p.r, mass: p.mass, type: p.type });
  propMeshes.set(id, p.mesh);
}
const camel = createCamelRider();
camel.setQuality?.(quality);
scene.add(camel.root);
const audio = new GameAudio();
let input = createInput(document.body);

// ---------- UI ----------
let modalOpen = false;   // any panel/settings open -> camel stands still
let started = false;

const ui = new UI({
  content, lang,
  onStart: async () => {
    started = true;
    introT = 0; introDone = false;
    await audio.unlock();
    audio.setMuted(!ui.prefs.sound);
    audio.setMusic(ui.prefs.music);
    audio.play('click');
  },
  onLangChange: (l) => { lang = l; store.set('lang', l); },
  onSoundToggle: (on) => { audio.setMuted(!on); },
  onMusicToggle: (on) => { audio.setMusic(on); },
  onQualityChange: (q) => { qualitySetting = q; applyQuality(q === 'auto' ? autoQuality() : q); },
  onTimeToggle: (night) => { targetTime = night ? 0.72 : 0.12; audio.setNight?.(night ? 1 : 0); },
  onZoneOpen: () => { audio.play('panelOpen'); audio.duck?.(true); },
  onModalChange: (open, kind) => {
    modalOpen = open;
    if (!open) { audio.duck?.(false); if (kind === 'zone') audio.play('panelClose'); }
  },
});
ui.setWorld({ radius: 140, zones: world.zones });
qualitySetting = params.get('quality') || ui.prefs.quality || 'auto';
if (ui.prefs.night) { targetTime = timeOfDay = 0.72; }

function applyQuality(q) {
  quality = q;
  pixelRatioCap = q === 'low' ? 1.5 : q === 'med' ? 1.75 : 2;
  renderer.shadowMap.enabled = q !== 'low' || !isCoarse;
  camel.setQuality?.(q);
  resize();
}


// ---------- camera rig ----------
const camPos = new THREE.Vector3(), camLook = new THREE.Vector3();
const tmpA = new THREE.Vector3(), tmpB = new THREE.Vector3();
let camYaw = 0, shake = 0, fov = 58;
let introT = 0, introDone = false;
let idleOrbit = 0;

function updateCamera(dt, t, s) {
  const portrait = camera.aspect < 0.9;
  const speedK = Math.min(Math.abs(s.speed) / 11, 1);
  const dist = (portrait ? 11.5 : 8.5) + speedK * 2.4 + (s.sprint ? 1 : 0);
  const height = (portrait ? 5.6 : 4.2) + speedK * 0.9;
  // yaw follows the heading with lag (shortest angle), and a touch of look-ahead into turns
  let dy = s.heading - camYaw;
  dy = Math.atan2(Math.sin(dy), Math.cos(dy));
  camYaw += dy * (1 - Math.exp(-dt * (2.4 + speedK * 1.2)));

  let want;
  if (!started) {
    // title-screen: slow cinematic orbit around the camel
    idleOrbit += dt * 0.12;
    const r = portrait ? 12 : 9.5;
    want = tmpA.set(s.x + Math.sin(idleOrbit + 0.6) * r, s.y + 3.4, s.z + Math.cos(idleOrbit + 0.6) * r);
    camLook.lerp(tmpB.set(s.x, s.y + 2.1, s.z), 1 - Math.exp(-dt * 4));
  } else {
    want = tmpA.set(s.x - Math.sin(camYaw) * dist, s.y + height, s.z - Math.cos(camYaw) * dist);
    const look = tmpB.set(s.x + Math.sin(s.heading) * (3 + speedK * 4), s.y + 2.2, s.z + Math.cos(s.heading) * (3 + speedK * 4));
    camLook.lerp(look, 1 - Math.exp(-dt * 6));
  }
  const gh = world.heightAt(want.x, want.z) + 1.2; // keep the camera above the dunes
  if (want.y < gh) want.y = gh;

  if (!introDone && started) {
    introT += dt;
    const k = Math.min(introT / (reducedMotion ? 0.01 : 2.4), 1);
    const e = 1 - Math.pow(1 - k, 3);
    camPos.lerp(want, 1 - Math.exp(-dt * (1.5 + e * 6)));
    if (k >= 1) introDone = true;
  } else {
    camPos.lerp(want, 1 - Math.exp(-dt * (started ? 5.5 : 3)));
  }
  camera.position.copy(camPos);
  if (shake > 0.001 && !reducedMotion) {
    camera.position.x += (Math.random() - 0.5) * shake;
    camera.position.y += (Math.random() - 0.5) * shake;
    shake *= Math.exp(-dt * 9);
  }
  camera.lookAt(camLook);
  const wantFov = (portrait ? 66 : 58) + speedK * 9 + (s.sprint ? 5 : 0);
  fov += (wantFov - fov) * (1 - Math.exp(-dt * 4));
  if (Math.abs(camera.fov - fov) > 0.05) { camera.fov = fov; camera.updateProjectionMatrix(); }
}

ride.on('bump', (e) => { shake = Math.min(0.5, 0.12 + (e.strength || 0.3) * 0.5); audio.play('bump', { strength: e.strength }); });
ride.on('sprintStart', () => audio.play('sprint'));
ride.on('call', () => { audio.play('call'); camel.root.userData.playCall?.(); });

// ---------- adaptive resolution ----------
let fpsAcc = 0, fpsN = 0, adaptCooldown = 3;
function adapt(dt) {
  fpsAcc += dt; fpsN++;
  if (fpsAcc < 1.5) return;
  const fps = fpsN / fpsAcc; fpsAcc = 0; fpsN = 0;
  adaptCooldown -= 1.5;
  if (adaptCooldown > 0 || qualitySetting !== 'auto') return;
  if (fps < 40 && dynScale > 0.55) { dynScale = Math.max(0.55, dynScale - 0.15); resize(); adaptCooldown = 2; if (dynScale <= 0.7 && quality !== 'low') applyQuality('low'); }
  else if (fps > 57 && dynScale < 1) { dynScale = Math.min(1, dynScale + 0.1); resize(); adaptCooldown = 6; }
}

// ---------- loop ----------
const clock = new THREE.Clock();
let stampAcc = 0;
let nearZoneId = null;

function frame() {
  const dt = Math.min(clock.getDelta(), 0.05);
  const t = clock.elapsedTime;

  const raw = input.read();
  const locked = !started || modalOpen;
  const inp = locked ? { throttle: 0, steer: 0, sprint: false, brake: true, call: raw.call && started, reset: false } : raw;
  if (raw.reset && started && !modalOpen) { ride.reset(0, 0, 0); camYaw = 0; camPos.set(0, 6, -10); }
  ride.update(dt, inp);
  const s = ride.state;

  propSystem.update(dt, ride);
  for (const b of propSystem.bodies) {
    const m = propMeshes.get(b.id);
    if (!m) continue;
    m.position.set(b.x, b.y, b.z);
    m.rotation.y = b.yaw || 0;
    if (b.spin && b.vy !== undefined && b.type !== 'crate') m.rotation.z = (b.tilt || 0);
  }

  camel.root.position.set(s.x, s.y, s.z);
  camel.root.rotation.y = s.heading;
  camel.update(dt, s, t);

  // trail in the sand
  stampAcc += dt;
  if (stampAcc > 0.22 && Math.abs(s.speed) > 0.6 && s.grounded) { stampAcc = 0; world.stamp?.(s.x, s.z, s.heading, Math.min(1, Math.abs(s.speed) / 8)); }

  // day/night easing
  timeOfDay += (targetTime - timeOfDay) * (1 - Math.exp(-dt * 0.9));
  world.setTimeOfDay(timeOfDay);
  world.update(dt, t, camel.root.position);

  // zone proximity -> "enter" prompt in the UI (Enter key / tap opens the panel)
  if (started) {
    let inside = null;
    for (const z of world.zones) if (Math.hypot(s.x - z.x, s.z - z.z) < z.r) { inside = z; break; }
    const id = inside ? inside.id : null;
    if (id !== nearZoneId) {
      nearZoneId = id;
      ui.setNearZone(id);
      if (id) audio.play('zoneEnter'); else if (!modalOpen) audio.play('zoneLeave');
    }
  }

  updateCamera(dt, t, s);
  audio.update(dt, s);

  ui.updateHud(s);

  adapt(dt);
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}

// ---------- boot ----------
window.addEventListener('resize', resize);
window.addEventListener('orientationchange', () => setTimeout(resize, 200));
document.addEventListener('visibilitychange', () => { if (!document.hidden) clock.getDelta(); });
resize();
applyQuality(quality);
camPos.set(6, 5, -10); camLook.set(0, 2, 0);
ui.setProgress(1);
ui.ready();
requestAnimationFrame(frame);

// test / debug hooks (used by Playwright)
window.__drive = { ride, world, camel, audio, ui, renderer, scene, camera, get started() { return started; }, setInput(o) { input = { read: () => ({ throttle: 0, steer: 0, sprint: false, brake: false, call: false, reset: false, ...o }), dispose() {} }; } };
