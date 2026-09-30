import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { P } from './core/palette.js';
import { LAYOUT, heightAt, normalAt, noise, createTerrain } from './core/terrain.js';
import { createPhysics } from './core/physics.js';
import { createInput } from './core/input.js';
import { createPlayer } from './core/player.js';
import { createCamera } from './core/camera.js';
import { createZones } from './core/zones.js';
import { createEvents } from './core/events.js';
import { Builder, mat } from './core/builder.js';
import { applyReveal, createRevealController, reveal } from './core/reveal.js';
import { createPostFX } from './core/postfx.js';
import * as content from './content.js';

import { createCamel } from './camel/camel.js';
import { createVillage } from './world/village.js';
import { createNature } from './world/nature.js';
import { createUI } from './ui/ui.js';
import { createAudio } from './audio/audio.js';
import { createStorm } from './world/storm.js';
import { createPads } from './world/pads.js';
import { createCamp } from './world/camp.js';

const touch = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
const mobile = touch && Math.min(screen.width, screen.height) < 900;
const nextFrame = () => new Promise((r) => requestAnimationFrame(() => r()));

function webglAvailable() {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch { return false; }
}

async function main() {
  const events = createEvents();
  const canvas = document.getElementById('scene');

  // The shared context every module receives. See ARCHITECTURE.md.
  const ctx = {
    THREE, CANNON, P, content, events, mobile, touch,
    heightAt, normalAt, noise, LAYOUT,
    Builder, mat,
    updaters: [],
    onUpdate(fn) { ctx.updaters.push(fn); },
  };

  const ui = createUI(ctx);
  ctx.ui = ui;
  if (!webglAvailable()) { ui.noWebGL?.(); return; }

  ui.setProgress(0.05);
  await nextFrame();

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !mobile, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, mobile ? 1.5 : 2));
  renderer.setSize(innerWidth, innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(P.skyHorizon);
  scene.fog = new THREE.Fog(P.fog, 70, 220);

  // Lighting: warm sun from the south-west, sky/sand bounce.
  const hemi = new THREE.HemisphereLight('#fff4de', '#d09a62', 1.35);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(P.sun, 2.1);
  sun.castShadow = true;
  sun.shadow.mapSize.set(mobile ? 1536 : 2048, mobile ? 1536 : 2048);
  sun.shadow.radius = 2.5;
  const sc = sun.shadow.camera;
  sc.left = -38; sc.right = 38; sc.top = 38; sc.bottom = -38; sc.near = 1; sc.far = 160;
  sun.shadow.bias = -0.0006;
  sun.shadow.normalBias = 0.04;
  const sunOffset = new THREE.Vector3(-30, 55, 22);
  scene.add(sun, sun.target);

  const physics = createPhysics({ events });
  const input = createInput({ events, canvas });
  Object.assign(ctx, { renderer, scene, sun, sunOffset, hemi, physics, input });

  createTerrain({ scene, world: physics.world, material: physics.material, mobile });
  ui.setProgress(0.2);
  await nextFrame();

  const nature = createNature(ctx);
  ui.setProgress(0.4);
  await nextFrame();

  const village = createVillage(ctx);
  ui.setProgress(0.65);
  await nextFrame();

  const camp = createCamp(ctx);
  const pads = createPads(ctx);

  // The start island: everything is clipped to a circle around the spawn
  // point, inside a sandstorm, until the visitor starts.
  const revealCtl = createRevealController(ctx);
  revealCtl.setCenter(LAYOUT.spawn.x, LAYOUT.spawn.z);
  ctx.reveal = revealCtl;
  const storm = createStorm(ctx);

  const player = createPlayer(ctx);
  const camel = createCamel(ctx);
  scene.add(camel.group);
  player.visual = camel;
  ctx.player = player;
  ctx.camel = camel;

  const rig = createCamera(ctx);
  ctx.camera = rig.camera;
  ctx.rig = rig;
  rig.snap(player.position.set(LAYOUT.spawn.x, heightAt(LAYOUT.spawn.x, LAYOUT.spawn.z), LAYOUT.spawn.z));

  applyReveal(scene);
  // Hand-written shaders the clip can't patch (water, dust, ripples, bugs…)
  // simply wait until the growing circle reaches them.
  const late = [];
  scene.traverse((o) => {
    if (o.userData.noReveal || !o.material || o === nature.sky?.dome) return;
    const m = Array.isArray(o.material) ? o.material[0] : o.material;
    if (!m?.isMaterial || m.userData.revealPatched || o.isSprite) return;
    o.geometry?.computeBoundingSphere?.();
    const bs = o.geometry?.boundingSphere;
    const p = bs ? bs.center.clone().applyMatrix4(o.matrixWorld) : o.getWorldPosition(new THREE.Vector3());
    const r = bs && bs.radius < 60 ? bs.radius * 0.5 : 0;
    late.push({ o, x: p.x, z: p.z, r, follow: bs ? bs.radius >= 60 : true });
    o.visible = false;
  });

  const postfx = createPostFX(renderer, { mobile });

  const zones = createZones(ctx);
  const audio = createAudio(ctx);
  ctx.audio = audio;
  ui.attach?.(ctx);
  ui.setProgress(0.85);

  // Warm up shaders so the first moving frame doesn't hitch.
  renderer.compile(scene, rig.camera);
  renderer.render(scene, rig.camera);
  ui.setProgress(1);
  window.__qarya = ctx; // handy for debugging and screenshots
  window.__qaryaReady = true;

  events.on('input:first', () => audio.unlock?.());
  events.on('camel:grunt', () => camel.grunt?.());

  addEventListener('resize', () => {
    renderer.setSize(innerWidth, innerHeight);
    rig.resize();
    postfx.resize();
  });

  // Main loop.
  const timer = new THREE.Timer();
  let t = 0;
  let started = false;
  function frame() {
    timer.update();
    const dt = Math.min(timer.getDelta(), 1 / 20);
    t += dt;
    input.update();
    revealCtl.update(dt);
    rig.intro = started ? Math.max(0, 1 - revealCtl.progress * 1.15) : 1;
    if (late.length) {
      const c = reveal.center.value, r = reveal.radius.value;
      for (let i = late.length - 1; i >= 0; i--) {
        const l = late[i];
        if (revealCtl.done || (!l.follow && Math.hypot(l.x - c.x, l.z - c.y) - l.r < r)) { l.o.visible = true; late.splice(i, 1); }
      }
    }
    if (input.take('grunt')) events.emit('camel:grunt');
    player.update(dt, t);
    physics.step(dt);
    zones.update(dt, player);
    rig.update(dt, player, input);
    sun.position.copy(rig.target).add(sunOffset);
    sun.target.position.copy(rig.target);
    for (const fn of ctx.updaters) fn(dt, t);
    storm.update(dt, t, revealCtl.storm);
    pads.update(dt, t);
    nature.update?.(dt, t);
    village.update?.(dt, t);
    audio.update?.(dt, t);
    ui.update?.(dt, t);
    postfx.render(scene, rig.camera, t);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  // Wait on the title screen, then let the camel go.
  await ui.ready();
  audio.unlock?.();
  started = true;
  revealCtl.start();
  events.emit('game:start');
  setTimeout(() => { input.enabled = true; }, 1400);
}

main().catch((err) => {
  console.error(err);
  const el = document.getElementById('fatal');
  if (el) { el.hidden = false; el.textContent = 'حدث خطأ أثناء التحميل: ' + err.message; }
});
