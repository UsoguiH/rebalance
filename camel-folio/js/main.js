import * as THREE from 'three';
import { World, ZONES } from './world.js';
import { Camel } from './camel.js';
import { Props } from './props.js';
import { FX } from './fx.js';
import { Input } from './input.js';
import { Audio } from './audio.js';
import { UI } from './ui.js';
import { projects, ui as copy } from './content.js';
import { setAnisotropy } from './textures.js';
import { stylize } from './stylize.js';
import { applyReveal, Island, reveal } from './reveal.js';

const touch = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
const mobile = touch && Math.min(screen.width, screen.height) < 900;

const nextFrame = () => new Promise((r) => requestAnimationFrame(() => r()));

async function loadFonts() {
  if (!document.fonts) return;
  const wanted = ['700 64px "Reem Kufi"', '400 32px "Cairo"', '700 32px "Cairo"', '700 40px "Aref Ruqaa"'];
  const all = Promise.all(wanted.map((f) => document.fonts.load(f, 'أبجد abc')));
  await Promise.race([all, new Promise((r) => setTimeout(r, 3000))]);
}

function webglAvailable() {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch { return false; }
}

async function main() {
  const uiLayer = new UI({ touch });
  if (!webglAvailable()) {
    document.getElementById('nogl').hidden = false;
    document.getElementById('loader').remove();
    return;
  }

  const canvas = document.getElementById('scene');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !mobile || devicePixelRatio < 2, powerPreference: 'high-performance' });
  let pixelRatio = Math.min(devicePixelRatio, mobile ? 1.75 : 2);
  renderer.setPixelRatio(pixelRatio);
  renderer.setSize(innerWidth, innerHeight, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  setAnisotropy(Math.min(8, renderer.capabilities.getMaxAnisotropy()));

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, innerWidth / innerHeight, 0.5, 900);

  uiLayer.setLoading(0.1, copy.loading);
  await loadFonts();
  uiLayer.setLoading(0.25);
  await nextFrame();

  const audio = new Audio();
  const world = new World(scene, { mobile, touch });
  uiLayer.setLoading(0.55);
  await nextFrame();

  const camel = new Camel();
  scene.add(camel.group);
  camel.position.set(0, 0, 1);
  const props = new Props(scene, world, audio);
  const fx = new FX(scene, { mobile });
  const input = new Input(canvas, document.getElementById('joy'));
  uiLayer.setLoading(0.8);
  await nextFrame();

  // Compile shaders up front so the first frames don't hitch.
  const look3 = stylize(scene);
  // Clip everything to the starting island; the island's own pieces are added after.
  reveal.center.value.set(camel.position.x, camel.position.z);
  applyReveal(scene);
  const island = new Island(scene);
  world.sky.visible = false;
  renderer.compile(scene, camera);
  uiLayer.setLoading(1);

  // ---------- camera ----------
  const cam = {
    target: new THREE.Vector3(0, 1.5, 0),
    az: 0,
    elev: 0.95,
    dist: 23,
    shake: 0,
    intro: -1, // -1: the island before the start, 0..1 reveal, >1 play
  };
  const camForward = new THREE.Vector3(0, 0, -1);
  const look = new THREE.Vector3();
  const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

  function updateCamera(dt, t) {
    const fwd = camel.forward(new THREE.Vector3());
    look.copy(camel.position).addScaledVector(fwd, camel.speed * 0.28);
    look.y = camel.position.y * 0.5 + 1.4;
    cam.target.lerp(look, 1 - Math.exp(-dt * 4.5));
    const portrait = innerHeight > innerWidth;
    let dist = cam.dist * input.zoom * (portrait ? 1.35 : 1);
    let elev = cam.elev;
    let az = cam.az;
    // Island framing: a three-quarter view that fits the island on any screen.
    const islandAz = 0.62 + Math.sin(t * 0.25) * 0.04;
    const islandElev = 0.78;
    const islandDist = (portrait ? 38 : 32) * Math.max(1, 1.2 / camera.aspect * (portrait ? 0.62 : 1));
    if (cam.intro < 0) {
      az = islandAz;
      dist = islandDist;
      elev = islandElev;
      cam.target.set(reveal.center.value.x, 0.4, reveal.center.value.y);
    } else if (cam.intro < 1) {
      const k = ease(cam.intro);
      az = THREE.MathUtils.lerp(islandAz, cam.az, k);
      dist = THREE.MathUtils.lerp(islandDist, dist, k);
      elev = THREE.MathUtils.lerp(islandElev, cam.elev, k);
      cam.intro += dt / 3;
      // The island grows until it swallows the desert.
      const r = 7.5 + Math.pow(cam.intro, 2.4) * 320;
      reveal.radius.value = r;
      island.set(r, 1 - Math.min(1, Math.max(0, (cam.intro - 0.45) / 0.4)));
      reveal.glow.value = Math.max(0, 1 - cam.intro * 3);
      world.sky.visible = cam.intro > 0.35;
      if (cam.intro >= 1) { reveal.radius.value = 1e5; island.set(1e5, 0); }
    }
    camera.position.set(
      cam.target.x + Math.sin(az) * Math.cos(elev) * dist,
      cam.target.y + Math.sin(elev) * dist,
      cam.target.z + Math.cos(az) * Math.cos(elev) * dist,
    );
    camera.lookAt(cam.target);
    if (cam.shake > 0.001) {
      camera.position.x += (Math.random() - 0.5) * cam.shake;
      camera.position.y += (Math.random() - 0.5) * cam.shake;
      cam.shake *= Math.exp(-dt * 10);
    }
    camForward.set(-Math.sin(az), 0, -Math.cos(az));
    world.followSun(cam.target);
  }

  // ---------- sounds and effects hooks ----------
  camel.onStep = (leg, pos, strength) => {
    if (camel.inWater) {
      fx.splash(pos);
      audio.splash(0.6 + strength * 0.4);
      return;
    }
    fx.footprint(pos.x, camel.position.y, pos.z, camel.heading);
    if (camel.speed > 7 || Math.random() < 0.35) fx.kick(pos, camel.forward(new THREE.Vector3()), strength);
    audio.footstep(0.6 + strength * 0.5, leg.side * 0.25);
    if (leg.front && camel.speed > 4) audio.bell(Math.min(1, camel.speed / 14));
  };
  camel.onBump = (v) => {
    audio.hit('rock', v * 1.5, 'bump');
    cam.shake = Math.min(0.6, v * 0.06);
  };
  camel.onLand = (v) => {
    fx.landing(camel.position);
    cam.shake = Math.min(0.8, v * 0.05);
    audio.hit('rock', v, 'land');
    if (camel.inWater) audio.splash(1.2);
  };

  function grunt() {
    audio.grunt();
    camel.grunt();
  }

  let strikeShown = false;
  props.onJarsChange = (n, total, all) => {
    uiLayer.setJars(n, total, true);
    if (all && !strikeShown) {
      strikeShown = true;
      fx.celebrate(world.jarOrigin.x !== undefined ? new THREE.Vector3(world.jarOrigin.x, 0, world.jarOrigin.z) : camel.position);
      audio.ui('strike');
      uiLayer.toast(copy.strike, 3000);
      setTimeout(grunt, 400);
    }
    if (n === 0) strikeShown = false;
  };

  // ---------- triggers ----------
  let activeTrigger = null;

  function runAction(a) {
    if (!a) return;
    if (a.type === 'project') uiLayer.project(a.project);
    else if (a.type === 'about') uiLayer.about();
    else if (a.type === 'skills') uiLayer.skills();
    // Show real links rather than opening them from script: popups and mailto
    // jumps are blocked in sandboxed frames and some in-app browsers.
    else if (a.type === 'link') uiLayer.contact(a.item.id);
    else if (a.type === 'reset') {
      props.resetJars();
      audio.ui('close');
      uiLayer.toast(copy.reset);
      return;
    }
    audio.ui('open');
  }

  function updateTriggers(dt, t) {
    let best = null;
    let bestD = Infinity;
    for (const tr of world.triggers) {
      const d = Math.hypot(camel.position.x - tr.x, camel.position.z - tr.z);
      if (d < tr.r && d < bestD) { best = tr; bestD = d; }
    }
    for (const tr of world.triggers) {
      const inside = tr === best;
      tr.active += ((inside ? 1 : 0) - tr.active) * Math.min(1, dt * 8);
      if (inside && !tr.done && !uiLayer.open) {
        tr.progress = Math.min(1, tr.progress + dt / 1.1);
        if (tr.progress >= 1) { tr.done = true; runAction(tr.action); }
      } else if (!inside) {
        tr.progress = Math.max(0, tr.progress - dt * 3);
        tr.done = false;
      }
      tr.fillMat.uniforms.progress.value = tr.done ? 1 : tr.progress;
      const pulse = 1 + tr.active * 0.06 + Math.sin(t * 3 + tr.x) * 0.015;
      tr.group.scale.set(pulse, 1, pulse);
    }
    if (best !== activeTrigger) {
      activeTrigger = best;
      uiLayer.showPrompt(best ? best.label : null);
      if (best) audio.ui('close');
    }
  }

  uiLayer.onPromptTap = () => { audio.unlock(); if (activeTrigger) runAction(activeTrigger.action); };

  // ---------- zones ----------
  let currentZone = 'welcome';
  function updateZones() {
    let zone = null;
    for (const [id, z] of Object.entries(ZONES)) {
      if (Math.hypot(camel.position.x - z.x, camel.position.z - z.z) < (id === 'projects' ? 20 : 14)) { zone = id; break; }
    }
    if (zone && zone !== currentZone) uiLayer.toast(copy.sections[zone]);
    if (zone) currentZone = zone;
    const nearJars = Math.hypot(camel.position.x - ZONES.playground.x, camel.position.z - ZONES.playground.z) < 20;
    uiLayer.setJars(props.knocked, props.jars.length, nearJars);
  }

  function teleport(x, z, heading) {
    const p = world.resolve(x, z, camel.radius);
    camel.position.set(p.x, 0, p.z);
    camel.heading = heading;
    camel.speed = 0;
    cam.target.set(p.x, 1.5, p.z);
  }

  uiLayer.onMenuPick = ({ zone, project }) => {
    uiLayer.closePanel();
    if (project) {
      const tr = world.triggers.find((t) => t.id === `project:${project}`);
      teleport(tr.x, tr.z + 0.5, Math.PI);
      setTimeout(() => uiLayer.project(projects.find((p) => p.id === project)), 450);
      return;
    }
    const z = ZONES[zone];
    const d = Math.hypot(z.x, z.z) || 1;
    const back = zone === 'welcome' ? 0 : 13;
    teleport(z.x - (z.x / d) * back, z.z - (z.z / d) * back + (zone === 'welcome' ? 1 : 0), Math.atan2(z.x, z.z) + (zone === 'welcome' ? Math.PI : 0));
  };

  // ---------- keys ----------
  input.on('key', (e) => {
    if (e.code === 'Escape') { uiLayer.closePanel(); return; }
    if (cam.intro < 0) return;
    if (e.code === 'KeyM') toggleSound();
    if (uiLayer.open) return;
    if (e.code === 'Enter' || e.code === 'NumpadEnter') { if (activeTrigger) { e.preventDefault(); runAction(activeTrigger.action); } }
    if (e.code === 'KeyH') grunt();
  });

  function toggleSound() {
    audio.unlock();
    audio.setMuted(!audio.muted);
    uiLayer.setSound(!audio.muted);
  }
  document.getElementById('btn-sound').addEventListener('click', toggleSound);
  uiLayer.setSound(!audio.muted);

  const jumpBtn = document.getElementById('btn-jump');
  const gruntBtn = document.getElementById('btn-grunt');
  jumpBtn.addEventListener('pointerdown', (e) => { e.preventDefault(); input.jumpQueued = true; });
  gruntBtn.addEventListener('pointerdown', (e) => { e.preventDefault(); audio.unlock(); grunt(); });

  // ---------- resize / visibility ----------
  function resize() {
    const w = innerWidth, h = innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.fov = w < h ? 42 : 30;
    camera.updateProjectionMatrix();
  }
  addEventListener('resize', resize);
  if (window.visualViewport) visualViewport.addEventListener('resize', resize);
  resize();

  let paused = false;
  document.addEventListener('visibilitychange', () => {
    paused = document.hidden;
    if (paused) audio.suspend(); else audio.resume();
  });

  // ---------- start ----------
  uiLayer.ready(() => {
    audio.unlock();
    cam.intro = 0;
    input.enabled = true;
    setTimeout(() => props.dropLetters(), 1100);
    setTimeout(grunt, 300);
    setTimeout(() => uiLayer.toast(copy.sections.welcome), 3200);
  });

  // ---------- loop ----------
  const timer = new THREE.Timer();
  timer.connect(document);
  let perfAcc = 0, perfFrames = 0, perfChecks = 0;

  function frame(now) {
    requestAnimationFrame(frame);
    timer.update(now);
    if (paused) return;
    const dt = Math.min(timer.getDelta(), 1 / 20);
    const t = timer.getElapsed();

    const inputState = uiLayer.open || cam.intro < 0.6 ? { throttle: 0, steer: 0, stick: null, run: false, jump: false } : input.read();
    camel.inWater = world.inPond(camel.position.x, camel.position.z);
    camel.update(dt, inputState, camForward, world);
    props.syncCamel(camel, dt);
    props.update(dt);
    audio.setMotion(camel.onGround ? camel.speed : 0, inputState.run);
    // Day cycle: starts at warm dusk, drifts to violet night and back (~70 s).
    const night = 0.5 - 0.5 * Math.cos((t / 70) * Math.PI * 2);
    world.setNight(night);
    look3.setNight(night);
    world.update(t, dt);
    fx.update(dt);
    if (cam.intro >= 0) { updateTriggers(dt, t); updateZones(); }
    updateCamera(dt, t);
    if (cam.intro < 0) uiLayer.placeStartHint(camera, reveal.center.value, reveal.radius.value);
    renderer.render(scene, camera);

    // Drop resolution on slow devices (checked a few times after start).
    if (cam.intro >= 1 && perfChecks < 4) {
      perfAcc += dt; perfFrames++;
      if (perfAcc > 2.5) {
        const fps = perfFrames / perfAcc;
        if (fps < 45 && pixelRatio > 1) {
          pixelRatio = Math.max(1, pixelRatio - 0.35);
          renderer.setPixelRatio(pixelRatio);
          resize();
        }
        perfAcc = 0; perfFrames = 0; perfChecks++;
      }
    }
  }
  frame();

  // Handy for debugging and automated tests.
  window.__folio = { camel, world, props, audio, camera, renderer, input, cam, ui: uiLayer, teleport, reveal };
}

main().catch((err) => {
  console.error(err);
  const l = document.getElementById('load-label');
  if (l) l.textContent = 'حدث خطأ أثناء التحميل. حدّث الصفحة.';
});
