// Entry: renderer + lighting, async world build behind the loading card, showroom scenes
// for the menus and vehicle select, chase / death / guided-missile cameras, the intro
// flyover, and the main loop (physics in fixed substeps, post-processing, HUD).
import * as THREE from 'three';
import { G, clamp, damp, dampAngle, lerp, R, loadSettings, bus, easeInOut } from './core.js';
import { input } from './input.js';
import { audio } from './audio.js';
import { setAniso, concreteTex, detailTex } from './textures.js';
import { World } from './world.js';
import { Batch } from './geo.js';
import { buildTown } from './town.js';
import { Props } from './props.js';
import { createSky } from './sky.js';
import { FX } from './fx.js';
import { Weapons } from './weapons.js';
import { HUD } from './hud.js';
import { UI } from './ui.js';
import { Post } from './post.js';
import { Match } from './match.js';
import { buildVehicle } from './vehicles.js';
import { Peds } from './peds.js';

loadSettings();
const glCanvas = document.getElementById('gl');
const hudCanvas = document.getElementById('hud');
const renderer = new THREE.WebGLRenderer({ canvas: glCanvas, antialias: false, powerPreference: 'high-performance', stencil: false });
renderer.shadowMap.enabled = !location.hash.includes('lowq');
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.NoToneMapping;
setAniso(renderer.capabilities.getMaxAnisotropy());
G.renderer = renderer;
G.input = input;

const LOWQ = location.hash.includes('lowq');
// dev: #ts=N speeds up simulated time (headless captures run at a few fps)
const TIME_SCALE = +((location.hash.match(/ts=([\d.]+)/) || [])[1] || 1);
const post = new Post(renderer, LOWQ ? 0 : 4);
const hud = new HUD(hudCanvas);
const ui = new UI(hud);

// ---------- game scene ----------
const scene = new THREE.Scene();
G.scene = scene;
const SUN_DIR = new THREE.Vector3(-0.52, 0.42, -0.74).normalize();
scene.fog = new THREE.FogExp2(0xb48250, 0.0019);
scene.background = new THREE.Color(0xb27a46);
const hemi = new THREE.HemisphereLight(0xcdbca4, 0x4a4036, 1.15);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xffe6c8, 2.5);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -95;
sun.shadow.camera.right = 95;
sun.shadow.camera.top = 95;
sun.shadow.camera.bottom = -95;
sun.shadow.camera.near = 1;
sun.shadow.camera.far = 420;
sun.shadow.bias = -0.0006;
sun.shadow.normalBias = 0.6;
scene.add(sun);
scene.add(sun.target);
const camera = new THREE.PerspectiveCamera(62, 16 / 9, 0.3, 4200);
G.camera = camera;
const sky = createSky(scene, SUN_DIR);
sky.onThunder((d) => audio.thunder(d));
const fx = new FX(scene);
G.fx = fx;
const weapons = new Weapons(scene, fx, audio);
G.weapons = weapons;

// environment map for car paint reflections (smoggy orange dome)
function makeEnv() {
  const pm = new THREE.PMREMGenerator(renderer);
  const es = new THREE.Scene();
  const geo = new THREE.SphereGeometry(10, 32, 16);
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    vertexShader: 'varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: `varying vec3 vP; void main(){ float h = normalize(vP).y;
      vec3 sky = mix(vec3(1.4,0.85,0.45), vec3(0.45,0.25,0.12), clamp(h,0.0,1.0));
      vec3 gnd = vec3(0.22,0.17,0.12);
      vec3 c = h > 0.0 ? sky : mix(vec3(0.9,0.6,0.35), gnd, clamp(-h*4.0,0.0,1.0));
      float sun = pow(max(dot(normalize(vP), normalize(vec3(-0.52,0.42,-0.74))),0.0), 64.0);
      gl_FragColor = vec4(c + vec3(4.0,3.0,2.0)*sun, 1.0); }`,
  });
  es.add(new THREE.Mesh(geo, mat));
  const rt = pm.fromScene(es, 0.02);
  pm.dispose();
  return rt.texture;
}
G.envMap = makeEnv();
G.lights = { hemi, sun };
G.hud = hud;
G.post = post;

// ---------- showroom scene (menus / vehicle select) ----------
const show = new THREE.Scene();
show.fog = new THREE.Fog(0x050302, 14, 42);
show.background = new THREE.Color(0x050302);
const showCam = new THREE.PerspectiveCamera(36, 16 / 9, 0.1, 200);
{
  const road = new THREE.Mesh(
    new THREE.PlaneGeometry(80, 80),
    new THREE.MeshStandardMaterial({ map: concreteTex('#3a3836', 0), roughness: 0.85, color: 0x9a9690 }),
  );
  road.material.map.repeat.set(10, 10);
  road.rotation.x = -Math.PI / 2;
  road.receiveShadow = true;
  show.add(road);
  const line = new THREE.Mesh(new THREE.PlaneGeometry(0.25, 60), new THREE.MeshStandardMaterial({ color: 0xc89a2a, roughness: 0.7 }));
  line.rotation.x = -Math.PI / 2;
  line.rotation.z = 0.25;
  line.position.set(2.2, 0.01, 0);
  show.add(line);
  void detailTex;
  show.add(new THREE.HemisphereLight(0x6a5a50, 0x0a0806, 0.6));
  const key = new THREE.SpotLight(0xffe2c0, 520, 40, 0.55, 0.6, 1.6);
  key.position.set(-6, 9, 8);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  show.add(key);
  show.add(key.target);
  const rim = new THREE.SpotLight(0xff3a1a, 260, 30, 0.6, 0.8, 1.6);
  const front = new THREE.SpotLight(0xfff0dc, 70, 30, 0.6, 0.9, 1.4);
  front.position.set(1, 3, 12);
  show.add(front);
  show.add(front.target);
  rim.position.set(5, 5, -8);
  show.add(rim);
  show.add(rim.target);
  const fill = new THREE.PointLight(0xff8a3a, 12, 20, 2);
  fill.position.set(4, 1.5, 5);
  show.add(fill);
  show.userData.fill = fill;
}
const showFx = new FX(show);
const showModels = {};
let showId = null;
function showVehicle(id) {
  if (showId && showModels[showId]) showModels[showId].root.visible = false;
  if (!showModels[id]) {
    const m = buildVehicle(id, G.envMap);
    show.add(m.root);
    showModels[id] = m;
  }
  showModels[id].root.visible = true;
  showModels[id].spin = 0;
  showId = id;
}
ui.onSelectVehicle = showVehicle;

// ---------- state ----------
let state = 'menu';
let match = null;
let world = null;
let introT = 0;
let resultT = 0;
let camYaw = 0;
const camPos = new THREE.Vector3();
const camLook = new THREE.Vector3();
let lookBackBlend = 0;

function resize() {
  const w = window.innerWidth, h = window.innerHeight;
  const dpr = LOWQ ? 0.5 : Math.min(window.devicePixelRatio || 1, G.settings.quality ? 1.5 : 0.85);
  renderer.setPixelRatio(dpr);
  renderer.setSize(w, h, false);
  post.setSize(Math.round(w * dpr), Math.round(h * dpr));
  hud.resize(w, h, Math.min(window.devicePixelRatio || 1, 2));
  camera.aspect = showCam.aspect = w / h;
  camera.updateProjectionMatrix();
  showCam.updateProjectionMatrix();
}
window.addEventListener('resize', resize);
resize();

const nextFrame = () => new Promise((r) => requestAnimationFrame(() => r()));

async function buildWorld() {
  if (world) return world;
  const step = async (txt) => {
    ui.loadText = txt;
    ui.draw();
    await nextFrame();
    await nextFrame();
  };
  await step('Painting the streets of Sunsprings...');
  world = new World();
  world.scene = scene;
  G.world = world;
  const paint = world.paintGround();
  await step('Raising the town...');
  const batch = new Batch();
  world.buildBlocks(batch);
  buildTown(world, batch, paint);
  await step('Pouring the hills...');
  world.buildGround(scene);
  batch.group('ground', world.groundMat);
  batch.build(scene);
  await step('Planting trees and parking cars...');
  const props = new Props(world, scene);
  G.props = props;
  props.populate();
  props.build();
  props.onBreak = (it, speed) => {
    fx.sparks(it.pos.clone().setY(it.pos.y + 0.8), null, 6, 0xffd890, 6);
    audio.impact(it.pos, Math.min(12, speed));
    if (it.type.hydrant) it.burning = 12;
  };
  props.onBurn = (it) => {
    if (it.type.hydrant) fx.water(it.pos.clone().setY(it.pos.y + 0.6));
    else if (R() < 0.5) fx.fireTrail(it.pos.clone().setY(it.pos.y + 1.0 + R()), 0xffc060, 0xff3a00, 1.2);
  };
  props.onExplode = (it, by) => {
    const p = it.pos.clone().setY(it.pos.y + 1);
    const big = it.type.explode.big;
    fx.explosion(p, big ? 2.6 : 1.6);
    audio.boom(p, big ? 2 : 1.3, false);
    for (const car of G.cars) {
      const d = car.pos.distanceTo(p);
      if (d < it.type.explode.r) {
        car.damage(it.type.explode.dmg * (1 - d / it.type.explode.r), by && by.isCar ? by : by, big ? 'Gas Pump Explosion' : 'Car Explosion');
        car.vel.y += 6 * (1 - d / it.type.explode.r);
        car.onGround = false;
      }
    }
    props.blast(p, it.type.explode.r * 0.8, 15, by);
  };
  props.onBump = (it, rel) => audio.impact(it.pos, rel);
  await step('Filling the sidewalks...');
  const peds = new Peds(world, scene, fx);
  G.peds = peds;
  peds.onSplat = (p, car, k) => {
    audio.impact(p.pos, 6);
    if (car.isPlayer) hud.splat(k);
  };
  // smoke columns from fires burning around town
  world.smokeSources = [
    [62, -18, 1.2], [-150, 128, 1], [196, 210, 1.4], [-60, -232, 0.8], [210, -130, 1.1], [-300, 40, 1.6], [120, 300, 1.8],
  ].map(([x, z, k]) => ({ x, z, k, y: world.groundHeight(x, z, 50) }));
  await step('Wiring the roads...');
  world.buildGraph();
  world.buildMinimap();
  await step('Loading weapons...');
  return world;
}

async function startMatch(cfg) {
  if (match) endMatch(false);
  state = 'loading';
  ui.go('loading');
  audio.music(null);
  await nextFrame();
  await buildWorld();
  weapons.clear();
  weapons.spawnPickups();
  ui.loadText = 'Starting engines...';
  ui.draw();
  await nextFrame();
  match = new Match(cfg, { fx, hud, weapons });
  G.match = match;
  hud.damageLines = [];
  hud.feed = [];
  // warm up shaders with one render from the intro position
  introT = 0;
  setIntroCamera(0);
  post.render(scene, camera);
  state = 'intro';
  ui.screen = 'none';
  audio.music('game');
}
function endMatch(toMenu = true) {
  if (match) match.dispose();
  match = null;
  weapons.clear();
  if (toMenu) {
    state = 'menu';
    ui.go('main');
    audio.music('menu');
  }
}
ui.onStart = (cfg) => startMatch(cfg);
ui.onQuit = () => endMatch(true);
ui.onResume = () => {
  state = 'play';
  ui.screen = 'none';
};

// ---------- cameras ----------
const INTRO = [
  // [from, to, lookFrom, lookTo, seconds]
  [new THREE.Vector3(160, 95, 260), new THREE.Vector3(60, 55, 60), new THREE.Vector3(0, 10, 0), new THREE.Vector3(0, 15, -50), 3.2],
  [new THREE.Vector3(-40, 14, -110), new THREE.Vector3(30, 18, -150), new THREE.Vector3(0, 22, -225), new THREE.Vector3(0, 18, -210), 2.6],
];
const INTRO_LEN = INTRO.reduce((a, s) => a + s[4], 0) + 2.2;
function setIntroCamera(t) {
  let acc = 0;
  for (const [a, b, la, lb, d] of INTRO) {
    if (t < acc + d) {
      const k = easeInOut((t - acc) / d);
      camera.position.lerpVectors(a, b, k);
      camLook.lerpVectors(la, lb, k);
      camera.lookAt(camLook);
      camera.fov = 55;
      camera.updateProjectionMatrix();
      return;
    }
    acc += d;
  }
  // final swoop down behind the player
  const p = G.player;
  const k = easeInOut(clamp((t - acc) / 2.2, 0, 1));
  const behind = new THREE.Vector3(p.pos.x - Math.sin(p.yaw) * 9, p.pos.y + 3.4, p.pos.z - Math.cos(p.yaw) * 9);
  const high = behind.clone().add(new THREE.Vector3(0, 30, 0)).addScaledVector(p.forward, -30);
  camera.position.lerpVectors(high, behind, k);
  camLook.copy(p.pos).addScaledVector(p.forward, 6).add(new THREE.Vector3(0, 1.5, 0));
  camera.lookAt(camLook);
  camYaw = p.yaw;
  camPos.copy(camera.position);
}

function chaseCamera(dt) {
  const p = G.player;
  const guided = weapons.guided && weapons.guided.owner === p ? weapons.guided : null;
  if (guided) {
    const dir = guided.vel.clone().normalize();
    const want = guided.pos.clone().addScaledVector(dir, -6).add(new THREE.Vector3(0, 2.2, 0));
    camPos.lerp(want, 1 - Math.exp(-12 * dt));
    camera.position.copy(camPos);
    camera.lookAt(guided.pos.clone().addScaledVector(dir, 10));
    camera.fov = damp(camera.fov, 70, 4, dt);
    camera.updateProjectionMatrix();
    return;
  }
  if (!p.alive) {
    // orbit the wreck (or follow the killer in LMS when out of lives)
    const focus = p.lives <= 0 && match ? G.cars.find((c) => c.alive) || p : p;
    const a = G.time * 0.35;
    const want = focus.pos.clone().add(new THREE.Vector3(Math.cos(a) * 13, 7, Math.sin(a) * 13));
    camPos.lerp(want, 1 - Math.exp(-3 * dt));
    camera.position.copy(camPos);
    camera.lookAt(focus.pos.x, focus.pos.y + 1, focus.pos.z);
    return;
  }
  const look = input.look ? 1 : 0;
  lookBackBlend = damp(lookBackBlend, look, 12, dt);
  // follow heading; when reversing fast keep looking forward like TM
  camYaw = dampAngle(camYaw, p.yaw, p.onGround ? 5.5 : 2.5, dt);
  const yaw = camYaw + Math.PI * (lookBackBlend > 0.5 ? 1 : 0);
  const mech = p.mechT > 0 ? 1 : 0;
  // close, slightly high chase cam like TM 2012: the car sits in the lower middle third
  // calibrated on the Roadkill reference shot: rear bumper ~80% down the screen, car ~20% wide
  const back = 4.6 + p.length * 0.5 + p.height * 0.75 + mech * 3;
  const up = 1.4 + p.height * 1.12 + (p.model.parts.head ? 0.7 : 0) + mech * 2;
  const pivot = new THREE.Vector3(p.pos.x, p.pos.y + p.height * 0.6 + mech * 2, p.pos.z);
  const want = new THREE.Vector3(p.pos.x - Math.sin(yaw) * back, p.pos.y + up, p.pos.z - Math.cos(yaw) * back);
  // keep the camera out of buildings
  const t = world.segmentBlocked(pivot.x, pivot.y, pivot.z, want.x, want.y, want.z, 1.5);
  if (t >= 0) want.lerpVectors(pivot, want, Math.max(0.15, t - 0.08));
  const gy = world.groundHeight(want.x, want.z, want.y + 2);
  want.y = Math.max(want.y, gy + 1.0);
  if (lookBackBlend > 0.5 || look) camPos.copy(want);
  else {
    camPos.x = damp(camPos.x, want.x, 14, dt);
    camPos.z = damp(camPos.z, want.z, 14, dt);
    camPos.y = damp(camPos.y, want.y, 8, dt);
  }
  camera.position.copy(camPos);
  // shake
  const sh = fx.shakeAmt;
  if (sh > 0) camera.position.add(new THREE.Vector3((R() - 0.5) * sh, (R() - 0.5) * sh, (R() - 0.5) * sh).multiplyScalar(0.6));
  const ahead = lookBackBlend > 0.5 ? -7 : 7;
  camLook.set(p.pos.x + Math.sin(camYaw) * ahead, p.pos.y + 0.7 + p.height * 0.45 + mech * 2, p.pos.z + Math.cos(camYaw) * ahead);
  camera.lookAt(camLook);
  const speedFov = 58 + clamp(p.speed / p.turboTop, 0, 1) * 8 + (p.boosting ? 6 : 0);
  camera.fov = damp(camera.fov, speedFov, 3, dt);
  camera.updateProjectionMatrix();
}

// ---------- main loop ----------
let last = performance.now();
let fpsAcc = 0, fpsN = 0;
G.fps = 60;
G.prof = {};
const edgeless = new Proxy(input, {
  get(t, k) {
    if (['fire', 'alt', 'prev', 'next', 'jump', 'freeze', 'shield', 'mine', 'pause', 'confirm', 'back'].includes(k)) return false;
    return t[k];
  },
});

function frame(now) {
  const rawDt = clamp((now - last) / 1000, 0, 0.1);
  last = now;
  const dt = Math.min(rawDt, 1 / 20) * TIME_SCALE;
  G.dt = dt;
  G.time += dt;
  fpsAcc += Math.max(0, (now - (frame.prev || now)) / 1000);
  frame.prev = now;
  fpsN++;
  if (fpsAcc > 0.5) {
    G.fps = fpsN / fpsAcc;
    fpsAcc = fpsN = 0;
  }
  input.update(dt);
  if (input.any) audio.unlock();
  if (input.mute) audio.toggleMute();

  if (state === 'menu') {
    ui.update(dt);
    menuScene(dt);
    post.u.uRadial.value = 0;
    post.u.uHit.value = 0;
    post.u.uFrozen.value = 0;
    post.u.uLowHp.value = 0;
    post.u.uVignette.value = 0.8;
    post.u.uExposure.value = 1.0;
    post.render(show, showCam);
    ui.draw();
  } else if (state === 'loading') {
    ui.update(dt);
    ui.draw();
  } else if (state === 'intro' || state === 'play' || state === 'paused' || state === 'results') {
    const paused = state === 'paused';
    if (state === 'intro') {
      introT += dt;
      if (introT > INTRO_LEN || (input.confirm && introT > 0.4) || location.hash.includes('nointro')) {
        state = 'play';
        const names = { dm: 'BEGIN\nDEATH MATCH!', lms: 'BEGIN\nLAST MAN STANDING!', hunted: 'BEGIN\nHUNTED!', endurance: 'BEGIN\nENDURANCE!' };
        hud.bigCenter(names[match.cfg.mode], '#e8862a', 2.6, 58);
        camYaw = G.player.yaw;
        camPos.copy(camera.position);
      }
    }
    if (state === 'play' && input.pause) {
      state = 'paused';
      ui.go('pause');
    }
    if (!paused) {
      if (state === 'play' || state === 'results') {
        // fixed substeps for stable collisions at speed
        const n = Math.min(12, Math.max(1, Math.ceil(dt / (1 / 60))));
        const sdt = dt / n;
        const t0 = performance.now();
        for (let i = 0; i < n; i++) {
          if (i === 1) G.input = edgeless;
          match.update(sdt);
          weapons.update(sdt);
        }
        G.prof.sim = performance.now() - t0;
        G.input = input;
      } else {
        // during the intro the world idles
        for (const car of G.cars) car.updateVisual(dt);
      }
      fx.update(dt);
      for (const a of world.animated) a(dt);
      if (G.peds) G.peds.update(dt);
      for (const sm of world.smokeSources) {
        if (Math.hypot(sm.x - camera.position.x, sm.z - camera.position.z) > 700 || R() > 0.55) continue;
        fx.emit('alpha', { pos: new THREE.Vector3(sm.x + (R() - 0.5) * 3, sm.y + 1, sm.z + (R() - 0.5) * 3), vel: new THREE.Vector3(1.2 + R(), 4 + R() * 2, 0.4), size: 2.5 * sm.k, size1: 14 * sm.k, life: 9, drag: 0.15, grav: -0.3, color: 0x1e1a16, color2: 0x5a5048, alpha: 0.55, frame: 9, fadeIn: 0.6, fadePow: 1.2 });
        if (R() < 0.5) fx.fireTrail(new THREE.Vector3(sm.x + (R() - 0.5) * 2, sm.y + 0.5 + R(), sm.z + (R() - 0.5) * 2), 0xffc060, 0xff3a00, 1.4 * sm.k);
      }
    } else ui.update(dt);
    if (state === 'intro') setIntroCamera(introT);
    else if (state === 'results') {
      resultT += dt;
      const p = G.player;
      const a = resultT * 0.3 + p.yaw;
      camera.position.set(p.pos.x + Math.sin(a) * 9, p.pos.y + 3, p.pos.z + Math.cos(a) * 9);
      camera.lookAt(p.pos.x, p.pos.y + 1, p.pos.z);
      ui.update(dt);
    } else if (!paused) chaseCamera(dt);
    // end of match -> results
    if (state === 'play' && match.over) {
      match.overT = (match.overT || 0) + dt;
      if (match.overT === dt) hud.bigCenter(match.win ? 'VICTORY!' : 'DEFEATED', match.win ? '#f2c24a' : '#c8261c', 3, 64);
      if (match.overT > 3) {
        state = 'results';
        resultT = 0;
        ui.results = match.results();
        ui.go('results');
        audio.music('menu');
      }
    }
    // lighting follows the player
    const focus = G.player ? G.player.pos : camera.position;
    sun.position.copy(focus).addScaledVector(SUN_DIR, 200);
    sun.target.position.copy(focus);
    sky.update(dt, camera);
    sun.intensity = 2.5 + sky.uniforms.uFlash.value * 3;
    hemi.intensity = 1.15 + sky.uniforms.uFlash.value * 1.5;
    if (G.player) {
      audio.setListener(camera.position, Math.atan2(camLook.x - camera.position.x, camLook.z - camera.position.z));
      audio.engines(state === 'play' ? G.player : null, G.cars);
    }
    // post fx driven by gameplay
    const p = G.player;
    G.hitPulse = Math.max(0, (G.hitPulse || 0) - dt * 2.5);
    post.u.uHit.value = G.hitPulse;
    post.u.uRadial.value = damp(post.u.uRadial.value, p && p.alive && (p.boosting || p.ramBoost > 0) ? clamp(p.speed / p.turboTop, 0, 1) * 1.0 : 0, 6, dt);
    post.u.uFrozen.value = damp(post.u.uFrozen.value, p && p.frozen > 0 ? 1 : 0, 8, dt);
    post.u.uLowHp.value = p && p.alive && p.hpFrac < 0.25 ? 1 : 0;
    post.u.uVignette.value = 0.55;
    post.u.uExposure.value = 0.92;
    post.u.uDesat.value = p && !p.alive ? 0.4 : 0;
    post.u.uTime.value = G.time;
    const t1 = performance.now();
    post.render(scene, camera);
    G.prof.render = performance.now() - t1;
    G.prof.calls = renderer.info.render.calls;
    G.prof.tris = renderer.info.render.triangles;
    // HUD
    if (state === 'play' || state === 'intro') {
      const hs = state === 'intro' ? { hidden: true } : match.hudState();
      if (state === 'play' && match.over) hs.minimal = true;
      hud.draw(dt, hs);
    } else if (state === 'paused' || state === 'results') {
      ui.draw();
    }
  }
  requestAnimationFrame(frame);
}

function menuScene(dt) {
  // main menu: Sweet Tooth's truck under a burning glow; vehicle select: the picked car
  const id = ui.screen === 'select' ? ui.screen && showId : 'sweettooth';
  if (ui.screen !== 'select' && showId !== 'sweettooth') showVehicle('sweettooth');
  const m = showModels[showId];
  const t = G.time;
  if (ui.screen === 'select') {
    m.spin = (m.spin || 0) + dt;
    const sz = m.def.size;
    // frame by the biggest dimension; Axel is shown more head-on so the rider is visible
    const span = Math.max(sz[2], sz[0] * 2, sz[1] * 2);
    const ang = m.def.id === 'axel' ? 0.15 : 0.5;
    m.root.rotation.y = (m.def.id === 'axel' ? -0.25 : -0.6) + Math.sin(t * 0.25) * 0.12;
    m.root.position.set(0, 0, 0);
    const d = 3.2 + span * 0.95;
    showCam.position.set(Math.sin(ang) * d - 1.1, 1.2 + sz[1] * 0.45, Math.cos(ang) * d);
    showCam.lookAt(-1.25 * (d / 9), 0.55 + sz[1] * 0.32, 0);
  } else {
    // main menu: the burning head looms over the logo, truck angled toward the camera
    m.root.rotation.y = -0.7;
    m.root.position.set(3.6, 0, -1.2);
    showCam.position.set(-0.2 + Math.sin(t * 0.2) * 0.25, 1.5 + Math.sin(t * 0.3) * 0.08, 7.6);
    showCam.lookAt(2.4, 2.9, -0.8);
  }
  // wheels idle / head bob and fire
  if (m.parts.flamePoint) {
    m.root.updateMatrixWorld();
    const fp = m.parts.flamePoint.clone().applyMatrix4(m.root.matrixWorld);
    for (let i = 0; i < 2; i++) showFx.fireTrail(fp.clone().add(new THREE.Vector3((R() - 0.5) * 0.5, R() * 0.2, (R() - 0.5) * 0.5)), 0xffe0a0, 0xff3a08, 0.6 + R() * 0.3);
    showFx.emit('add', { pos: fp, vel: new THREE.Vector3((R() - 0.5) * 0.4, 2.2, (R() - 0.5) * 0.4), size: 0.4, size1: 0.05, life: 0.6, color: 0xffd080, color2: 0xff2a00, frame: 8 });
    if (m.parts.head) m.parts.head.position.y = 0.95 + Math.sin(t * 4) * 0.03;
  }
  // embers + smoke drifting through the showroom
  if (R() < 0.5) showFx.emit('add', { pos: new THREE.Vector3((R() - 0.5) * 16, 0.2, (R() - 0.5) * 10 - 2), vel: new THREE.Vector3((R() - 0.5) * 0.6, 0.8 + R(), (R() - 0.5) * 0.4), size: 0.06, life: 4, color: 0xffb060, color2: 0xff3a00, frame: 0 });
  if (R() < 0.15) showFx.emit('alpha', { pos: new THREE.Vector3((R() - 0.5) * 20, 0.3, -6 - R() * 6), vel: new THREE.Vector3(0.3, 0.3, 0), size: 3, size1: 9, life: 7, color: 0x3a2018, alpha: 0.35, frame: 1, fadeIn: 1 });
  show.userData.fill.intensity = 10 + Math.sin(t * 13) * 2 + Math.sin(t * 7.3) * 2;
  showFx.update(dt);
  void id;
  void lerp;
}

// embedded pages only get keyboard input once focused: clicking anywhere focuses the game
window.addEventListener('pointerdown', () => {
  glCanvas.focus();
  audio.unlock();
});

// boot
showVehicle('sweettooth');
document.getElementById('boot').remove();
ui.go('title');
if (location.hash.includes('auto')) {
  // dev shortcut: #auto[=vehicle] jumps straight into a match
  const v = (location.hash.match(/auto=(\w+)/) || [])[1] || 'roadkill';
  ui.vehicleIdx = Math.max(0, ['sweettooth', 'roadkill', 'kamikaze', 'outlaw', 'meatwagon', 'axel', 'crimsonfury', 'reaper', 'darkside', 'vermin', 'shadow', 'junkyarddog'].indexOf(v));
  startMatch({ mode: 'dm', modeName: 'DEATH MATCH', vehicle: v });
}
window.__G = G;
// dev: teleport the player, e.g. __tp(0, 120, Math.PI)
window.__tp = (x, z, yaw = 0) => {
  const p = G.player;
  p.spawn(x, z, yaw);
  p.protect = 0;
  camYaw = yaw;
  camPos.set(x - Math.sin(yaw) * 9, p.pos.y + 3.4, z - Math.cos(yaw) * 9);
};
window.__input = input;
window.__ui = ui;
Object.defineProperty(window, '__state', { get: () => state });
window.__bus = bus;
requestAnimationFrame(frame);
