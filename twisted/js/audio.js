// Audio: everything is synthesized with Web Audio. Engine voice with gear shifts,
// tire skid, guns, launches, explosions, freeze zaps, flamethrower, pickups, thunder,
// and a procedural drop-D metal soundtrack (distorted power chords, double kick, snare).
import { G, clamp, R } from './core.js';

let ctx = null;
let master, sfx, musicBus, comp, noiseBuf, distCurve;
const listener = { x: 0, y: 0, z: 0, yaw: 0 };

function init() {
  if (ctx) return ctx;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  ctx = new AC();
  comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -14;
  comp.ratio.value = 6;
  master = ctx.createGain();
  master.gain.value = G.settings.volume;
  sfx = ctx.createGain();
  musicBus = ctx.createGain();
  musicBus.gain.value = G.settings.music * 0.55;
  sfx.connect(comp);
  musicBus.connect(comp);
  comp.connect(master);
  master.connect(ctx.destination);
  noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  const d = noiseBuf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  distCurve = new Float32Array(1024);
  for (let i = 0; i < 1024; i++) {
    const x = (i / 1023) * 2 - 1;
    distCurve[i] = Math.tanh(x * 9) * 0.9;
  }
  return ctx;
}

function noise(dur) {
  const s = ctx.createBufferSource();
  s.buffer = noiseBuf;
  s.loop = dur > 1.9;
  return s;
}
function env(g, t, a, peak, d, sus = 0, rel = 0.05) {
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(Math.max(peak, 0.0002), t + a);
  g.gain.exponentialRampToValueAtTime(Math.max(sus, 0.0001), t + a + d);
  if (rel) g.gain.exponentialRampToValueAtTime(0.0001, t + a + d + rel);
}
// distance attenuation + stereo pan relative to the listener
function spatial(pos, vol = 1, near = false) {
  if (!pos || near) return { gain: vol, pan: 0 };
  const dx = pos.x - listener.x, dz = pos.z - listener.z;
  const d = Math.hypot(dx, dz);
  const g = vol * clamp(1 / (1 + d * d * 0.0016), 0, 1);
  const s = Math.sin(-listener.yaw), c = Math.cos(-listener.yaw);
  const rx = dx * c - dz * s;
  return { gain: g, pan: clamp(-rx / (d + 8), -0.9, 0.9) };
}
function out(gain, pan) {
  const g = ctx.createGain();
  g.gain.value = gain;
  if (ctx.createStereoPanner) {
    const p = ctx.createStereoPanner();
    p.pan.value = pan;
    g.connect(p);
    p.connect(sfx);
  } else g.connect(sfx);
  return g;
}

// ---------- engine voice ----------
class Engine {
  constructor() {
    const t = ctx.currentTime;
    this.o1 = ctx.createOscillator();
    this.o1.type = 'sawtooth';
    this.o2 = ctx.createOscillator();
    this.o2.type = 'square';
    this.o3 = ctx.createOscillator();
    this.o3.type = 'sawtooth';
    this.o3.detune.value = 12;
    this.lp = ctx.createBiquadFilter();
    this.lp.type = 'lowpass';
    this.lp.Q.value = 3;
    this.shaper = ctx.createWaveShaper();
    this.shaper.curve = distCurve;
    this.g = ctx.createGain();
    this.g.gain.value = 0;
    const pre = ctx.createGain();
    pre.gain.value = 0.35;
    this.o1.connect(pre);
    this.o2.connect(pre);
    this.o3.connect(pre);
    pre.connect(this.lp);
    this.lp.connect(this.shaper);
    this.shaper.connect(this.g);
    this.g.connect(sfx);
    // turbo hiss
    this.ns = noise(3);
    this.nf = ctx.createBiquadFilter();
    this.nf.type = 'bandpass';
    this.nf.frequency.value = 2400;
    this.ng = ctx.createGain();
    this.ng.gain.value = 0;
    this.ns.connect(this.nf);
    this.nf.connect(this.ng);
    this.ng.connect(sfx);
    // skid squeal
    this.sk = noise(3);
    this.skf = ctx.createBiquadFilter();
    this.skf.type = 'bandpass';
    this.skf.frequency.value = 1100;
    this.skf.Q.value = 8;
    this.skg = ctx.createGain();
    this.skg.gain.value = 0;
    this.sk.connect(this.skf);
    this.skf.connect(this.skg);
    this.skg.connect(sfx);
    for (const o of [this.o1, this.o2, this.o3, this.ns, this.sk]) o.start(t);
    this.rpm = 0;
  }
  set(car, vol) {
    const t = ctx.currentTime;
    if (!car || !car.alive) {
      this.g.gain.setTargetAtTime(0, t, 0.1);
      this.ng.gain.setTargetAtTime(0, t, 0.1);
      this.skg.gain.setTargetAtTime(0, t, 0.1);
      return;
    }
    const sp = Math.abs(car.fwdSpeed);
    const top = car.turboTop;
    // fake gearbox: 5 gears
    const gearSpan = top / 5;
    const gear = Math.min(4, Math.floor(sp / gearSpan));
    const inGear = (sp - gear * gearSpan) / gearSpan;
    const target = 0.25 + inGear * 0.7 + (car.engineLoad ? 0.08 : 0) + (car.boosting ? 0.1 : 0);
    this.rpm += (target - this.rpm) * 0.25;
    const heavy = car.mass > 3000 ? 0.65 : car.mass < 1000 ? 1.35 : 1;
    const f = (34 + this.rpm * 95) * heavy;
    this.o1.frequency.setTargetAtTime(f, t, 0.03);
    this.o2.frequency.setTargetAtTime(f * 0.5, t, 0.03);
    this.o3.frequency.setTargetAtTime(f * 1.5, t, 0.03);
    this.lp.frequency.setTargetAtTime(300 + this.rpm * 1400 + (car.engineLoad ? 600 : 0), t, 0.05);
    this.g.gain.setTargetAtTime(vol * (0.12 + car.engineLoad * 0.08), t, 0.05);
    this.ng.gain.setTargetAtTime(car.boosting ? vol * 0.08 : 0, t, 0.08);
    this.skg.gain.setTargetAtTime(clamp(car.skid, 0, 1) * vol * 0.12, t, 0.05);
    this.skf.frequency.setTargetAtTime(900 + Math.random() * 300, t, 0.02);
  }
}

// ---------- music ----------
const NOTE = (n) => 440 * Math.pow(2, (n - 69) / 12);
// riffs in drop D: [step(16th), midi, len(16ths), palm]
const D = 38;
const RIFFS = [
  // chug gallop
  [[0, D, 1, 1], [1, D, 1, 1], [2, D, 1, 1], [3, D + 3, 2, 0], [6, D, 1, 1], [7, D, 1, 1], [8, D + 5, 2, 0], [10, D, 1, 1], [11, D, 1, 1], [12, D + 6, 1, 0], [13, D + 5, 1, 0], [14, D + 3, 2, 0]],
  [[0, D, 1, 1], [1, D, 1, 1], [2, D + 1, 2, 0], [4, D, 1, 1], [5, D, 1, 1], [6, D + 8, 2, 0], [8, D, 1, 1], [9, D, 1, 1], [10, D + 7, 2, 0], [12, D + 5, 2, 0], [14, D + 3, 2, 0]],
  [[0, D + 10, 4, 0], [4, D + 8, 4, 0], [8, D + 7, 4, 0], [12, D + 5, 2, 0], [14, D + 3, 2, 0]],
  [[0, D, 1, 1], [2, D, 1, 1], [3, D, 1, 1], [4, D + 12, 1, 0], [6, D, 1, 1], [7, D, 1, 1], [8, D + 11, 1, 0], [10, D, 1, 1], [11, D, 1, 1], [12, D + 10, 2, 0], [14, D + 6, 2, 0]],
];
const SONG = [0, 0, 1, 1, 0, 0, 3, 3, 2, 2, 1, 3];

class Music {
  constructor() {
    this.playing = false;
    this.mode = 'menu';
    this.step = 0;
    this.bar = 0;
    this.next = 0;
    this.bpm = 152;
    this.timer = null;
    // guitar chain: distortion + cab filter
    this.gin = ctx.createGain();
    this.gin.gain.value = 0.5;
    const sh = ctx.createWaveShaper();
    sh.curve = distCurve;
    sh.oversample = '4x';
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 90;
    const cab = ctx.createBiquadFilter();
    cab.type = 'lowpass';
    cab.frequency.value = 3200;
    cab.Q.value = 0.7;
    const mid = ctx.createBiquadFilter();
    mid.type = 'peaking';
    mid.frequency.value = 800;
    mid.gain.value = -5;
    this.gout = ctx.createGain();
    this.gout.gain.value = 0.16;
    this.gin.connect(hp);
    hp.connect(sh);
    sh.connect(mid);
    mid.connect(cab);
    cab.connect(this.gout);
    this.gout.connect(musicBus);
    this.drums = ctx.createGain();
    this.drums.gain.value = 0.55;
    this.drums.connect(musicBus);
  }
  start(mode) {
    this.mode = mode;
    this.bpm = mode === 'menu' ? 96 : 152;
    if (this.playing) return;
    this.playing = true;
    this.next = ctx.currentTime + 0.1;
    this.step = 0;
    this.bar = 0;
    this.timer = setInterval(() => this.schedule(), 25);
  }
  stop() {
    this.playing = false;
    clearInterval(this.timer);
  }
  schedule() {
    const sixteenth = 60 / this.bpm / 4;
    while (this.next < ctx.currentTime + 0.12) {
      this.tick(this.next, sixteenth);
      this.next += sixteenth;
      this.step++;
      if (this.step >= 16) {
        this.step = 0;
        this.bar++;
      }
    }
  }
  tick(t, s16) {
    const menu = this.mode === 'menu';
    const riff = RIFFS[SONG[this.bar % SONG.length]];
    if (menu) {
      // slow doom riff: whole-bar power chords, sparse drums
      if (this.step === 0) this.chord(t, D + [0, 0, 3, 1][this.bar % 4], s16 * 14, false);
      if (this.step === 8 && this.bar % 2) this.chord(t, D + 6, s16 * 6, false);
      if (this.step === 0 || this.step === 10) this.kick(t);
      if (this.step === 8) this.snare(t, 0.6);
      if (this.step % 4 === 2) this.hat(t, 0.25);
      return;
    }
    for (const [st, n, len, palm] of riff) if (st === this.step) this.chord(t, n, s16 * len * (palm ? 0.7 : 1), !!palm);
    // drums: double kick gallop, snare on 2 and 4, ride on eighths
    const st = this.step;
    const gallop = [0, 2, 3, 6, 8, 10, 11, 14];
    if (gallop.includes(st) || (this.bar % 4 === 3 && st >= 12)) this.kick(t);
    if (st === 4 || st === 12) this.snare(t, 1);
    if (this.bar % 8 === 7 && st >= 12) this.snare(t, 0.7);
    if (st % 2 === 0) this.hat(t, st % 4 === 0 ? 0.5 : 0.3);
    if (st === 0 && this.bar % 4 === 0) this.crash(t);
  }
  chord(t, root, dur, palm) {
    for (const [iv, det] of [
      [0, -6],
      [7, 4],
      [12, 0],
    ]) {
      const o = ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.value = NOTE(root + iv);
      o.detune.value = det;
      const g = ctx.createGain();
      env(g, t, 0.004, palm ? 0.5 : 0.42, dur, palm ? 0.0001 : 0.25, 0.06);
      o.connect(g);
      g.connect(this.gin);
      o.start(t);
      o.stop(t + dur + 0.1);
    }
    // bass doubles the root
    const b = ctx.createOscillator();
    b.type = 'triangle';
    b.frequency.value = NOTE(root - 12);
    const bg = ctx.createGain();
    env(bg, t, 0.005, 0.5, dur, 0.2, 0.05);
    b.connect(bg);
    bg.connect(musicBus);
    b.start(t);
    b.stop(t + dur + 0.1);
  }
  kick(t) {
    const o = ctx.createOscillator();
    o.frequency.setValueAtTime(140, t);
    o.frequency.exponentialRampToValueAtTime(42, t + 0.09);
    const g = ctx.createGain();
    env(g, t, 0.002, 1.1, 0.16, 0.0001, 0);
    o.connect(g);
    g.connect(this.drums);
    o.start(t);
    o.stop(t + 0.25);
    const n = noise(0.05);
    const ng = ctx.createGain();
    env(ng, t, 0.001, 0.35, 0.02, 0.0001, 0);
    const f = ctx.createBiquadFilter();
    f.type = 'highpass';
    f.frequency.value = 2000;
    n.connect(f);
    f.connect(ng);
    ng.connect(this.drums);
    n.start(t);
    n.stop(t + 0.05);
  }
  snare(t, v) {
    const n = noise(0.3);
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = 1800;
    f.Q.value = 0.7;
    const g = ctx.createGain();
    env(g, t, 0.002, 0.9 * v, 0.14, 0.0001, 0.02);
    n.connect(f);
    f.connect(g);
    g.connect(this.drums);
    n.start(t);
    n.stop(t + 0.25);
    const o = ctx.createOscillator();
    o.frequency.setValueAtTime(240, t);
    o.frequency.exponentialRampToValueAtTime(160, t + 0.05);
    const og = ctx.createGain();
    env(og, t, 0.002, 0.5 * v, 0.07, 0.0001, 0);
    o.connect(og);
    og.connect(this.drums);
    o.start(t);
    o.stop(t + 0.12);
  }
  hat(t, v) {
    const n = noise(0.1);
    const f = ctx.createBiquadFilter();
    f.type = 'highpass';
    f.frequency.value = 7500;
    const g = ctx.createGain();
    env(g, t, 0.001, 0.22 * v, 0.03, 0.0001, 0);
    n.connect(f);
    f.connect(g);
    g.connect(this.drums);
    n.start(t);
    n.stop(t + 0.08);
  }
  crash(t) {
    const n = noise(2);
    const f = ctx.createBiquadFilter();
    f.type = 'highpass';
    f.frequency.value = 5000;
    const g = ctx.createGain();
    env(g, t, 0.003, 0.35, 1.4, 0.0001, 0.1);
    n.connect(f);
    f.connect(g);
    g.connect(this.drums);
    n.start(t);
    n.stop(t + 1.6);
  }
}

// ---------- public api ----------
let engine = null, otherEngine = null, music = null, flameVoice = null;
export const audio = {
  muted: false,
  unlock() {
    if (!init()) return;
    if (ctx.state === 'suspended') ctx.resume();
    if (!engine) {
      engine = new Engine();
      otherEngine = new Engine();
      music = new Music();
    }
  },
  get ready() {
    return !!ctx && ctx.state === 'running';
  },
  setListener(pos, yaw) {
    listener.x = pos.x;
    listener.y = pos.y;
    listener.z = pos.z;
    listener.yaw = yaw;
  },
  setVolume() {
    if (!ctx) return;
    master.gain.value = this.muted ? 0 : G.settings.volume;
    musicBus.gain.value = G.settings.music * 0.55;
  },
  toggleMute() {
    this.muted = !this.muted;
    this.setVolume();
  },
  music(mode) {
    if (!ctx || !music) return;
    if (mode) music.start(mode);
    else music.stop();
  },
  engines(player, cars) {
    if (!engine) return;
    engine.set(player, 1);
    // nearest other car drives the second voice
    let best = null, bd = 1e9;
    for (const c of cars) {
      if (c === player || !c.alive) continue;
      const d = Math.hypot(c.pos.x - listener.x, c.pos.z - listener.z);
      if (d < bd) {
        bd = d;
        best = c;
      }
    }
    otherEngine.set(best, clamp(1 - bd / 70, 0, 1) * 0.6);
    if (flameVoice && ctx.currentTime - flameVoice.last > 0.15) {
      flameVoice.g.gain.setTargetAtTime(0, ctx.currentTime, 0.05);
    }
  },
  gun(pos, near) {
    if (!ctx) return;
    const t = ctx.currentTime;
    const { gain, pan } = spatial(pos, near ? 0.32 : 0.5, near);
    if (gain < 0.01) return;
    const o = out(gain, pan);
    const n = noise(0.1);
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = 1400 + R() * 600;
    f.Q.value = 0.8;
    const g = ctx.createGain();
    env(g, t, 0.001, 1, 0.045, 0.0001, 0);
    n.connect(f);
    f.connect(g);
    g.connect(o);
    n.start(t);
    n.stop(t + 0.08);
    const k = ctx.createOscillator();
    k.frequency.setValueAtTime(220, t);
    k.frequency.exponentialRampToValueAtTime(70, t + 0.04);
    const kg = ctx.createGain();
    env(kg, t, 0.001, 0.7, 0.04, 0.0001, 0);
    k.connect(kg);
    kg.connect(o);
    k.start(t);
    k.stop(t + 0.06);
  },
  launch(pos, kind, near) {
    if (!ctx) return;
    const t = ctx.currentTime;
    const { gain, pan } = spatial(pos, near ? 0.6 : 0.7, near);
    if (gain < 0.01) return;
    const o = out(gain, pan);
    const n = noise(1);
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.Q.value = 1.2;
    const heavy = kind === 'power' || kind === 'gurney' || kind === 'taxi';
    f.frequency.setValueAtTime(heavy ? 500 : 900, t);
    f.frequency.exponentialRampToValueAtTime(heavy ? 1600 : 3200, t + 0.35);
    const g = ctx.createGain();
    env(g, t, 0.01, 0.9, 0.5, 0.0001, 0.05);
    n.connect(f);
    f.connect(g);
    g.connect(o);
    n.start(t);
    n.stop(t + 0.7);
    if (kind === 'ghost') {
      // the clown head cackles
      for (let i = 0; i < 5; i++) {
        const v = ctx.createOscillator();
        v.type = 'square';
        v.frequency.setValueAtTime(520 - i * 30, t + i * 0.09);
        v.frequency.exponentialRampToValueAtTime(380 - i * 20, t + i * 0.09 + 0.07);
        const vg = ctx.createGain();
        env(vg, t + i * 0.09, 0.005, 0.18, 0.06, 0.0001, 0);
        v.connect(vg);
        vg.connect(o);
        v.start(t + i * 0.09);
        v.stop(t + i * 0.09 + 0.1);
      }
    }
  },
  boom(pos, size = 1, near) {
    if (!ctx) return;
    const t = ctx.currentTime;
    const { gain, pan } = spatial(pos, 1.0 * Math.min(1.4, size), false);
    if (gain < 0.008) return;
    const o = out(gain, pan);
    const n = noise(2);
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.setValueAtTime(2400, t);
    f.frequency.exponentialRampToValueAtTime(120, t + 0.9 * size);
    const g = ctx.createGain();
    env(g, t, 0.003, 1.2, 0.9 * size, 0.0001, 0.2);
    n.connect(f);
    f.connect(g);
    g.connect(o);
    n.start(t);
    n.stop(t + 1.6 * size);
    const s = ctx.createOscillator();
    s.frequency.setValueAtTime(110, t);
    s.frequency.exponentialRampToValueAtTime(32, t + 0.4);
    const sg = ctx.createGain();
    env(sg, t, 0.003, 1.3, 0.45 * size, 0.0001, 0.05);
    s.connect(sg);
    sg.connect(o);
    s.start(t);
    s.stop(t + 0.8);
    void near;
  },
  impact(pos, strength) {
    if (!ctx) return;
    const t = ctx.currentTime;
    const { gain, pan } = spatial(pos, clamp(strength / 25, 0.15, 1), false);
    if (gain < 0.01) return;
    const o = out(gain, pan);
    const n = noise(0.5);
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = 500 + R() * 400;
    f.Q.value = 0.9;
    const g = ctx.createGain();
    env(g, t, 0.002, 1, 0.22, 0.0001, 0.05);
    n.connect(f);
    f.connect(g);
    g.connect(o);
    n.start(t);
    n.stop(t + 0.35);
    // metallic clang partials
    for (const fr of [310, 470, 820]) {
      const m = ctx.createOscillator();
      m.type = 'triangle';
      m.frequency.value = fr * (0.9 + R() * 0.2);
      const mg = ctx.createGain();
      env(mg, t, 0.002, 0.12, 0.25, 0.0001, 0);
      m.connect(mg);
      mg.connect(o);
      m.start(t);
      m.stop(t + 0.3);
    }
  },
  ping(pos) {
    if (!ctx) return;
    const t = ctx.currentTime;
    const { gain, pan } = spatial(pos, 0.25, false);
    if (gain < 0.01) return;
    const o = out(gain, pan);
    const m = ctx.createOscillator();
    m.type = 'sine';
    m.frequency.setValueAtTime(2400 + R() * 1500, t);
    m.frequency.exponentialRampToValueAtTime(900, t + 0.15);
    const g = ctx.createGain();
    env(g, t, 0.001, 0.4, 0.12, 0.0001, 0);
    m.connect(g);
    g.connect(o);
    m.start(t);
    m.stop(t + 0.2);
  },
  zap(pos, near) {
    if (!ctx) return;
    const t = ctx.currentTime;
    const { gain, pan } = spatial(pos, 0.7, near);
    const o = out(gain, pan);
    const m = ctx.createOscillator();
    m.type = 'sawtooth';
    m.frequency.setValueAtTime(1800, t);
    m.frequency.exponentialRampToValueAtTime(200, t + 0.5);
    const g = ctx.createGain();
    env(g, t, 0.005, 0.5, 0.5, 0.0001, 0.05);
    const f = ctx.createBiquadFilter();
    f.type = 'highpass';
    f.frequency.value = 600;
    m.connect(f);
    f.connect(g);
    g.connect(o);
    m.start(t);
    m.stop(t + 0.6);
  },
  flame(pos, near, dt) {
    if (!ctx) return;
    if (!flameVoice) {
      const n = noise(3);
      const f = ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = 900;
      const g = ctx.createGain();
      g.gain.value = 0;
      n.connect(f);
      f.connect(g);
      g.connect(sfx);
      n.start();
      flameVoice = { g, last: 0 };
    }
    const { gain } = spatial(pos, 0.5, near);
    flameVoice.g.gain.setTargetAtTime(gain, ctx.currentTime, 0.04);
    flameVoice.last = ctx.currentTime;
    void dt;
  },
  thunder(dist) {
    if (!ctx) return;
    const t = ctx.currentTime + dist / 340;
    const n = noise(3);
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = 260;
    const g = ctx.createGain();
    const v = clamp(1.8 - dist / 1200, 0.2, 1) * 0.6;
    env(g, t, 0.06, v, 2.6, 0.0001, 0.4);
    n.connect(f);
    f.connect(g);
    g.connect(sfx);
    n.start(t);
    n.stop(t + 3.5);
  },
  ui(kind) {
    if (!ctx) return;
    const t = ctx.currentTime;
    const o = out(0.35, 0);
    const m = ctx.createOscillator();
    const g = ctx.createGain();
    if (kind === 'tick') {
      m.type = 'square';
      m.frequency.value = 1300;
      env(g, t, 0.001, 0.25, 0.03, 0.0001, 0);
    } else if (kind === 'select') {
      m.type = 'sawtooth';
      m.frequency.setValueAtTime(220, t);
      m.frequency.exponentialRampToValueAtTime(880, t + 0.12);
      env(g, t, 0.002, 0.4, 0.18, 0.0001, 0.04);
    } else if (kind === 'back') {
      m.type = 'sawtooth';
      m.frequency.setValueAtTime(600, t);
      m.frequency.exponentialRampToValueAtTime(180, t + 0.12);
      env(g, t, 0.002, 0.3, 0.14, 0.0001, 0.04);
    } else if (kind === 'pickup') {
      m.type = 'triangle';
      m.frequency.setValueAtTime(660, t);
      m.frequency.setValueAtTime(990, t + 0.07);
      m.frequency.setValueAtTime(1320, t + 0.14);
      env(g, t, 0.003, 0.5, 0.25, 0.0001, 0.05);
    } else if (kind === 'mine') {
      m.type = 'square';
      m.frequency.value = 330;
      env(g, t, 0.003, 0.3, 0.08, 0.0001, 0);
    } else if (kind === 'warn') {
      m.type = 'square';
      m.frequency.setValueAtTime(980, t);
      m.frequency.setValueAtTime(740, t + 0.1);
      env(g, t, 0.003, 0.25, 0.2, 0.0001, 0);
    } else if (kind === 'kill') {
      m.type = 'sawtooth';
      m.frequency.setValueAtTime(110, t);
      m.frequency.exponentialRampToValueAtTime(55, t + 0.5);
      env(g, t, 0.003, 0.6, 0.5, 0.0001, 0.1);
    } else {
      m.type = 'sine';
      m.frequency.value = 440;
      env(g, t, 0.003, 0.3, 0.1, 0.0001, 0);
    }
    m.connect(g);
    g.connect(o);
    m.start(t);
    m.stop(t + 0.7);
  },
};
