// Boot: renderer, lights, the title screen over a live bot battle, pause and results.
import * as THREE from 'three';
import { Game } from './game.js';
import { Input } from './input.js';
import { Audio } from './audio.js';
import { princessFaceSVG } from './hud.js';
import { CharModel, PrincessModel } from './chars.js';
import { cakeModel, logModel, oreChunkModel } from './props.js';

const Q = new URLSearchParams(location.search);
const canvas = document.getElementById('view');
const screens = document.getElementById('screens');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, Q.get('lowres') ? 1 : 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0x9fd2ee, 75, 160);
const camera = new THREE.PerspectiveCamera(34, 16 / 9, 0.5, 2200);
const hemi = new THREE.HemisphereLight(0xffffff, 0x88a882, 1.35);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xfff4e2, 1.95);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -34, right: 34, top: 30, bottom: -30, near: 1, far: 130 });
sun.shadow.bias = -0.0006;
sun.shadow.normalBias = 0.04;
scene.add(sun, sun.target);

const input = new Input(canvas);
const audio = new Audio(null);
const game = new Game({ renderer, scene, camera, input, audio, hudRoot: document.getElementById('hud'), opts: {} });
audio.game = game;
game.sun = sun;
window.__game = game;

function resize() {
  const w = canvas.clientWidth, h = canvas.clientHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
addEventListener('resize', resize);
resize();

// ------------------------------------------------------------------ screens
function el(html) {
  const d = document.createElement('div');
  d.innerHTML = html.trim();
  return d.firstChild;
}
const logo = `<div class="logo"><span class="l1">Cake</span><span class="l2">Crusade</span></div>`;
function loading() {
  const s = el(`<div class="screen loading">${logo}<div class="load-msg">Loading…</div></div>`);
  screens.appendChild(s);
  return { set: (t) => (s.querySelector('.load-msg').textContent = t + '…'), close: () => s.remove() };
}

const prefs = (() => {
  try {
    return JSON.parse(localStorage.getItem('cakecrusade') || '{}');
  } catch (e) {
    return {};
  }
})();
const savePrefs = () => {
  try {
    localStorage.setItem('cakecrusade', JSON.stringify(prefs));
  } catch (e) {}
};

function title() {
  const size = prefs.size || 8;
  const s = el(`<div class="screen title">
    ${logo}
    <div class="tagline">Rescue the Princess · A cel-shaded castle brawl</div>
    <div class="title-princesses">
      <div class="tp tp-blue"><svg viewBox="-42 -42 84 84">${princessFaceSVG(0, 'sad')}</svg><span>Princess Bluebell</span></div>
      <div class="tp tp-red"><svg viewBox="-42 -42 84 84">${princessFaceSVG(1, 'sad')}</svg><span>Princess Rosalind</span></div>
    </div>
    <div class="menu">
      <div class="menu-row"><button class="btn btn-blue" data-team="0">Play Blue</button><button class="btn btn-red" data-team="1">Play Red</button></div>
      <div class="menu-row sizes">${[4, 6, 8, 12, 16].map((n) => `<button class="chip ${n === size ? 'on' : ''}" data-size="${n}">${n} v ${n}</button>`).join('')}</div>
      <button class="btn btn-small" data-howto>How to play</button>
    </div>
    <div class="credit">A fan-made tribute to <i>Fat Princess</i> (Titan Studios, 2009). All art and sound are generated in code.</div>
  </div>`);
  screens.appendChild(s);
  s.querySelectorAll('[data-size]').forEach((b) =>
    b.addEventListener('click', () => {
      s.querySelectorAll('[data-size]').forEach((x) => x.classList.remove('on'));
      b.classList.add('on');
      prefs.size = +b.dataset.size;
      savePrefs();
      audio.init();
      audio.play('click');
    }),
  );
  s.querySelectorAll('[data-team]').forEach((b) =>
    b.addEventListener('click', () => {
      audio.init();
      audio.play('click');
      const n = prefs.size || 8;
      location.search = `?play=1&team=${b.dataset.team}&size=${n}`;
    }),
  );
  s.querySelector('[data-howto]').addEventListener('click', () => {
    audio.init();
    howTo();
  });
}

function howTo(onClose) {
  const s = el(`<div class="screen modal"><div class="panel">
    <h2>How to play</h2>
    <p class="lead">Each castle holds the other team's princess in its dungeon. Carry <b>your</b> princess home to your throne while keeping theirs locked up. Hold both for <b>30 seconds</b> to win.</p>
    <div class="cols">
      <div><h3>Controls</h3>
        <ul class="keys">
          <li><kbd>WASD</kbd> Move</li><li><kbd>Mouse</kbd> Aim</li>
          <li><kbd>Left click</kbd> Attack · hold to charge</li><li><kbd>Right click</kbd> Block (Warrior)</li>
          <li><kbd>E</kbd> Pick up · grab princess · drop</li><li><kbd>Q</kbd> Swap to upgraded weapon</li>
          <li><kbd>Space</kbd> Jump</li><li><kbd>C</kbd> Eat carried cake</li>
          <li><kbd>Tab</kbd> Scores</li><li><kbd>Esc</kbd> Pause · <kbd>M</kbd> Mute</li>
        </ul>
        <p class="small">Gamepad: left stick move, right stick aim, RT/X attack, LT block, B grab, A jump, Y swap.</p>
      </div>
      <div><h3>The war</h3>
        <ul class="tips">
          <li>You spawn as a <b>Villager</b>. Grab a hat from a <b>hat machine</b> to change class.</li>
          <li><b>Workers</b> chop trees and mine ore, carry them to the stockpile or an outpost, then build upgrades (3 wood + 3 ore) and the catapult.</li>
          <li>Feed <b>cake</b> to the princess in your dungeon. Fat princesses take many soldiers to carry.</li>
          <li>Smash the enemy <b>gate</b>, or catapult over the walls.</li>
          <li>Stand by an <b>outpost</b> to capture it: it heals your team and takes deliveries.</li>
          <li>Walk past a <b>torch</b> as a Warrior or Ranger to set your weapon alight.</li>
        </ul>
      </div>
    </div>
    <button class="btn btn-small" data-close>Got it</button>
  </div></div>`);
  screens.appendChild(s);
  s.querySelector('[data-close]').addEventListener('click', () => {
    s.remove();
    onClose?.();
  });
}

let pauseEl = null;
function setPaused(p) {
  if (game.over || !game.started || game.spectate) return;
  game.paused = p;
  if (p && !pauseEl) {
    pauseEl = el(`<div class="screen modal pause"><div class="panel narrow">
      <h2>Paused</h2>
      <button class="btn" data-resume>Resume</button>
      <button class="btn btn-small" data-howto>How to play</button>
      <button class="btn btn-small" data-mute>${audio.muted ? 'Unmute' : 'Mute'} sound</button>
      <button class="btn btn-small btn-red" data-quit>Quit to title</button>
    </div></div>`);
    screens.appendChild(pauseEl);
    pauseEl.querySelector('[data-resume]').onclick = () => setPaused(false);
    pauseEl.querySelector('[data-howto]').onclick = () => howTo();
    pauseEl.querySelector('[data-mute]').onclick = (e) => {
      audio.toggleMute();
      e.target.textContent = (audio.muted ? 'Unmute' : 'Mute') + ' sound';
    };
    pauseEl.querySelector('[data-quit]').onclick = () => (location.search = '');
  } else if (!p && pauseEl) {
    pauseEl.remove();
    pauseEl = null;
    canvas.focus();
  }
}
addEventListener('keydown', (e) => {
  if (e.code === 'Escape' || e.code === 'KeyP') setPaused(!game.paused);
  if (e.code === 'KeyM') audio.toggleMute();
});
addEventListener('blur', () => setPaused(true));

function results(team) {
  const won = team === game.playerTeam;
  const units = [...game.units].sort((a, b) => b.score - a.score);
  const mvp = units[0];
  const me = game.player;
  const s = el(`<div class="screen modal results ${won ? 'won' : 'lost'}"><div class="panel">
    <div class="res-title t${team}">${team === 0 ? 'Blue' : 'Red'} Team Wins!</div>
    <div class="res-sub">${won ? 'The princess is home and the cake was worth it.' : 'Your princess is still in their dungeon…'}</div>
    <div class="res-badge">${won ? 'Reaper' : 'Giant Chicken'}</div>
    <div class="res-stats">
      <div><b>${me.score}</b><span>Your score</span></div>
      <div><b>${me.kills}</b><span>Kills</span></div>
      <div><b>${me.deaths}</b><span>Deaths</span></div>
      <div><b>${units.indexOf(me) + 1}</b><span>Rank</span></div>
    </div>
    <div class="res-mvp">MVP: <b class="t${mvp.team}">${mvp.name}</b> with ${mvp.score} points</div>
    <div class="menu-row"><button class="btn" data-again>Play again</button><button class="btn btn-small" data-title>Title screen</button></div>
  </div></div>`);
  screens.appendChild(s);
  s.querySelector('[data-again]').onclick = () => location.reload();
  s.querySelector('[data-title]').onclick = () => (location.search = '');
}
game.onEnd = (team) => setTimeout(() => results(team), 1800);

// ------------------------------------------------------------------ boot
(async () => {
  const ld = loading();
  await document.fonts?.ready;
  await game.build((t) => ld.set(t));
  if (Q.get('gallery')) {
    gallery();
    ld.close();
  } else if (Q.get('play')) {
    game.startMatch({ teamSize: +(Q.get('size') || 8), playerTeam: +(Q.get('team') || 0), autopilot: !!Q.get('bot') });
    ld.close();
    document.body.classList.add('playing');
    canvas.focus();
    // browsers need a gesture before audio can start
    const unlock = () => {
      audio.init();
      removeEventListener('pointerdown', unlock);
      removeEventListener('keydown', unlock);
    };
    addEventListener('pointerdown', unlock);
    addEventListener('keydown', unlock);
    if (Q.get('ff')) fastForward(+Q.get('ff'));
  } else {
    game.startMatch({ teamSize: 6, playerTeam: 0, spectate: true });
    ld.close();
    title();
    if (Q.get('ff')) fastForward(+Q.get('ff'));
  }
  if (Q.get('cam')) {
    const [x, z] = Q.get('cam').split(',').map(Number);
    game.focus.set(x, 0, z);
    game.camLock = [x, z];
  }
  last = performance.now();
  requestAnimationFrame(frame);
})();

// Simulate ahead without rendering (used for screenshots and tests).
function fastForward(seconds) {
  const step = 1 / 30;
  const render = game.render;
  game.render = () => {};
  for (let t = 0; t < seconds; t += step) game.update(step);
  game.render = render;
}

let last = performance.now(), frames = 0;
function frame(now) {
  const dt = Math.max(0, Math.min(0.05, (now - last) / 1000));
  last = now;
  if (game.camLock) game.focus.set(game.camLock[0], 0, game.camLock[1]);
  game.update(dt);
  if (galleryList) for (const g of galleryList) g.update(dt, { moving: Q.get('run') === '1' });
  if (++frames === 3) window.__ready = true;
  requestAnimationFrame(frame);
}

// Model line-up for visual checks (?gallery=1&cam=x,z)
let galleryList = null;
function gallery() {
  galleryList = [];
  const [fx, fz] = (Q.get('cam') || '-30,6').split(',').map(Number);
  const classes = ['villager', 'worker', 'warrior', 'ranger', 'mage', 'priest'];
  classes.forEach((c, i) => {
    for (const team of [0, 1]) {
      for (const up of [0, 1]) {
        if (up && c === 'villager') continue;
        const cm = new CharModel(team, c, { upgraded: !!up, alt: !!up, seed: i * 3 + team + up * 7 });
        cm.root.position.set(fx - 9 + i * 3.2, 0, fz - 4 + team * 3 + up * 6);
        cm.root.rotation.y = +(Q.get('rot') ?? 0);
        scene.add(cm.root);
        galleryList.push(cm);
      }
    }
  });
  for (const team of [0, 1]) {
    const p = new PrincessModel(team);
    p.fat = team * 0.66;
    p.root.position.set(fx + 11, 0, fz - 3 + team * 5);
    scene.add(p.root);
    galleryList.push(p);
  }
  const cake = cakeModel();
  cake.position.set(fx + 7, 0, fz + 6);
  const log = logModel();
  log.position.set(fx + 9, 0, fz + 7);
  const ore = oreChunkModel();
  ore.position.set(fx + 11, 0, fz + 8);
  scene.add(cake, log, ore);
  game.opts.camDist = +(Q.get('dist') || 16);
  game.opts.camPitch = +(Q.get('pitch') || 46);
  game.focus.set(fx, 0, fz);
  game.camLock = [fx, fz];
  game.placeCamera(0);
  const orig = game.update.bind(game);
  game.update = (dt) => {
    orig(dt);
    game.placeCamera(dt);
  };
}
