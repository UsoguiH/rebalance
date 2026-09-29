// Generative music in maqam Hijaz on D (with an upper Rast colour on G that
// brings in the B half-flat, a quarter tone), ~84 BPM. Plucked oud melody
// (Karplus–Strong), a shimmering qanun, darbuka + riq, and a soft drone.
// Everything here is composed on the fly: short motifs are invented, repeated,
// varied and answered, so the loop keeps changing without wandering off.

import { clamp, rand, pick, mtof } from './lib.js';

const BPM = 84;
const STEP = 60 / BPM / 4;     // one sixteenth
const LOOKAHEAD = 0.5;         // seconds scheduled ahead of the clock

// Scale degrees in semitones above D (fractions = quarter tones).
const SCALES = {
  hijaz: [0, 1, 4, 5, 7, 8, 10],       // D Eb F# G | A Bb C  (Hijaz + Nahawand on G)
  rast: [0, 1, 4, 5, 7, 8.5, 10],      // D Eb F# G | A B½♭ C (Hijaz + Rast on G)
};
const D3 = 50;

function degToMidi(deg, scale, base = D3) {
  const o = Math.floor(deg / 7);
  const i = ((deg % 7) + 7) % 7;
  return base + 12 * o + SCALES[scale][i];
}

// Rhythm cells (in sixteenths) that make up half a bar each.
const CELLS = [[8], [4, 4], [6, 2], [2, 2, 4], [4, 2, 2], [3, 3, 2], [2, 2, 2, 2], [2, 6], [1, 1, 2, 4], [3, 1, 4]];
const END_CELLS = [[8], [4, 4], [2, 6], [8]];

// Drum patterns for one bar of 16 sixteenths: D = doum, T = tek.
const DRUMS = {
  maqsum: { 0: 'D', 2: 'T', 6: 'T', 8: 'D', 12: 'T' },
  baladi: { 0: 'D', 2: 'D', 6: 'T', 8: 'D', 12: 'T' },
  saidi: { 0: 'D', 2: 'T', 6: 'D', 8: 'D', 12: 'T' },
};

export function createMusic(kit, dest, reverb) {
  const { ac } = kit;
  const stats = { notes: 0, bars: 0, section: '', phrase: 0 };

  // ---- Mixer -----------------------------------------------------------
  const bus = ac.createGain();
  bus.gain.value = 0;
  bus.connect(dest);
  const send = ac.createGain();
  send.gain.value = 1;
  send.connect(reverb);

  const oudBus = ac.createGain();
  oudBus.gain.value = 0.42;
  const oudBody = ac.createBiquadFilter();
  oudBody.type = 'peaking'; oudBody.frequency.value = 230; oudBody.gain.value = 4; oudBody.Q.value = 1.2;
  const oudTone = ac.createBiquadFilter();
  oudTone.type = 'lowpass'; oudTone.frequency.value = 2800; oudTone.Q.value = 0.5;
  oudBus.connect(oudBody); oudBody.connect(oudTone); oudTone.connect(bus);
  const oudSend = ac.createGain(); oudSend.gain.value = 0.22; oudTone.connect(oudSend); oudSend.connect(send);

  const qBus = ac.createGain();
  qBus.gain.value = 0.16;
  const qHp = ac.createBiquadFilter();
  qHp.type = 'highpass'; qHp.frequency.value = 280;
  qBus.connect(qHp); qHp.connect(bus);
  // A soft dotted-eighth echo makes the qanun shimmer.
  const qDelay = ac.createDelay(1.5);
  qDelay.delayTime.value = STEP * 3;
  const qFb = ac.createGain(); qFb.gain.value = 0.28;
  const qFbLp = ac.createBiquadFilter(); qFbLp.type = 'lowpass'; qFbLp.frequency.value = 2600;
  qHp.connect(qDelay); qDelay.connect(qFbLp); qFbLp.connect(qFb); qFb.connect(qDelay);
  const qEcho = ac.createGain(); qEcho.gain.value = 0.45; qFbLp.connect(qEcho); qEcho.connect(bus);
  const qSend = ac.createGain(); qSend.gain.value = 0.4; qHp.connect(qSend); qSend.connect(send);

  const drumBus = ac.createGain();
  drumBus.gain.value = 0.55;
  drumBus.connect(bus);
  const drumSend = ac.createGain(); drumSend.gain.value = 0.12; drumBus.connect(drumSend); drumSend.connect(send);

  const droneBus = ac.createGain();
  droneBus.gain.value = 0;
  droneBus.connect(bus);
  const droneSend = ac.createGain(); droneSend.gain.value = 0.3; droneBus.connect(droneSend); droneSend.connect(send);

  // ---- Instruments -----------------------------------------------------
  function pluck(style, t, midi, vel, pan, out, len = 1.2) {
    const { buffer, rate } = kit.ks(mtof(midi), style);
    const v = kit.voice(out);
    const src = v.buf(buffer);
    src.playbackRate.value = rate;
    const g = v.gain(vel);
    const p = v.panner(pan);
    src.connect(g);
    if (p) { g.connect(p); p.connect(v.out); } else g.connect(v.out);
    const end = t + Math.min(buffer.duration / rate, len);
    g.gain.setValueAtTime(vel, end - 0.12);
    g.gain.linearRampToValueAtTime(0, end);
    v.play(src, t, end + 0.01);
    stats.notes++;
  }
  const oud = (t, midi, vel, len) => pluck('oud', t, midi, vel, -0.15 + rand(-0.05, 0.05), oudBus, len);
  function qanun(t, midi, vel) {
    // Three strings per course on a qanun: two slightly detuned plucks, spread.
    pluck('qanun', t, midi + 0.04, vel * 0.7, 0.45, qBus, 1.1);
    pluck('qanun', t + 0.004, midi - 0.04, vel * 0.7, -0.05, qBus, 1.1);
  }

  function doum(t, vel) {
    const v = kit.voice(drumBus);
    const o = v.osc('sine', 118);
    const g = v.gain(0);
    o.connect(g); g.connect(v.out);
    o.frequency.setValueAtTime(118, t);
    o.frequency.exponentialRampToValueAtTime(56, t + 0.14);
    kit.env(g.gain, t, 0.95 * vel, 0.004, 0.42);
    v.play(o, t, t + 0.6);
    kit.noiseBurst(v, v.out, t, { type: 'lowpass', freq: 380, Q: 0.7, peak: 0.35 * vel, decay: 0.06 });
  }
  function tek(t, vel, soft) {
    const v = kit.voice(drumBus);
    const p = v.panner(soft ? -0.2 : 0.15);
    const out = p || v.out;
    if (p) p.connect(v.out);
    kit.noiseBurst(v, out, t, { type: 'bandpass', freq: soft ? 2300 : 3400, Q: 1.3, peak: (soft ? 0.35 : 0.6) * vel, decay: soft ? 0.035 : 0.06 });
    const o = v.osc('sine', soft ? 900 : 1320);
    const g = v.gain(0);
    o.connect(g); g.connect(out);
    o.frequency.setValueAtTime(soft ? 900 : 1320, t);
    o.frequency.exponentialRampToValueAtTime(soft ? 700 : 980, t + 0.05);
    kit.env(g.gain, t, (soft ? 0.12 : 0.25) * vel, 0.001, 0.06);
    v.play(o, t, t + 0.12);
  }
  function jingle(t, vel) {
    const v = kit.voice(drumBus);
    const p = v.panner(0.35);
    const out = p || v.out;
    if (p) p.connect(v.out);
    kit.noiseBurst(v, out, t, { type: 'highpass', freq: 6500, Q: 0.7, peak: 0.16 * vel, decay: 0.1 });
    kit.noiseBurst(v, out, t + 0.018, { type: 'bandpass', freq: 8200, Q: 3, peak: 0.12 * vel, decay: 0.08 });
  }
  function daf(t, vel) {
    const v = kit.voice(drumBus);
    const o = v.osc('sine', 88);
    const g = v.gain(0);
    o.connect(g); g.connect(v.out);
    o.frequency.setValueAtTime(88, t);
    o.frequency.exponentialRampToValueAtTime(62, t + 0.3);
    kit.env(g.gain, t, 0.6 * vel, 0.008, 0.6);
    v.play(o, t, t + 0.8);
    kit.noiseBurst(v, v.out, t, { type: 'lowpass', freq: 240, Q: 0.7, peak: 0.25 * vel, decay: 0.12 });
  }
  const DRUM = { D: doum, T: (t, v) => tek(t, v, false), K: (t, v) => tek(t, v, true), J: jingle, F: daf };

  // Drone: D and A, breathing slowly under everything.
  let drone = null;
  function startDrone(t) {
    if (drone) return;
    const lp = ac.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = 420; lp.Q.value = 0.8;
    lp.connect(droneBus);
    const lfo = ac.createOscillator(); lfo.frequency.value = 0.06;
    const lfoAmt = ac.createGain(); lfoAmt.gain.value = 140;
    lfo.connect(lfoAmt); lfoAmt.connect(lp.frequency);
    const oscs = [
      [mtof(38), 'sawtooth', -4, 0.5], [mtof(38), 'sawtooth', 5, 0.5],
      [mtof(45), 'triangle', 0, 0.6], [mtof(50), 'sine', 2, 0.25],
    ].map(([f, type, det, lvl]) => {
      const o = ac.createOscillator();
      o.type = type; o.frequency.value = f; o.detune.value = det;
      const g = ac.createGain(); g.gain.value = lvl;
      o.connect(g); g.connect(lp);
      o.start(t);
      return o;
    });
    lfo.start(t);
    drone = { lp, lfo, oscs };
    droneBus.gain.setValueAtTime(0, t);
    droneBus.gain.linearRampToValueAtTime(0.09, t + 6);
  }

  // ---- Composition -----------------------------------------------------
  // A phrase = 2 bars (32 sixteenths): notes {s, len, deg}.
  function rhythm(pickup) {
    const out = [];
    let s = 0;
    for (let c = 0; c < 4; c++) {
      let cell = c === 3 ? pick(END_CELLS) : pick(CELLS);
      // A pickup phrase starts after an eighth of silence.
      if (c === 0 && pickup) cell = [2, ...cell.slice(0, -1), cell[cell.length - 1] - 2].filter((x) => x > 0);
      cell.forEach((len, i) => {
        out.push({ s, len, rest: c === 0 && pickup && i === 0 });
        s += len;
      });
    }
    return out;
  }
  function melody(rh, start, target, lo, hi) {
    let d = start;
    const sounding = rh.filter((n) => !n.rest);
    sounding.forEach((n, i) => {
      const left = sounding.length - 1 - i;
      if (left === 0) d = target;
      else if (i > 0) {
        if (left <= 2) d += Math.sign(target - d) * (Math.abs(target - d) > 2 ? 2 : 1);
        else {
          const r = Math.random();
          const step = r < 0.12 ? 0 : r < 0.72 ? 1 : r < 0.93 ? 2 : 3;
          d += step * (Math.random() < 0.5 ? -1 : 1);
        }
        d = clamp(d, lo, hi);
      }
      n.deg = d;
    });
    return rh;
  }
  const clone = (ph, shift = 0) => ph.map((n) => ({ ...n, deg: n.deg === undefined ? undefined : n.deg + shift }));

  function emptyBar(scale) {
    return { scale, at: Array.from({ length: 16 }, () => []) };
  }
  function addPhrase(bars, ph, scale, vel = 0.9) {
    for (const n of ph) {
      if (n.rest) continue;
      const bar = bars[Math.floor(n.s / 16)], s = n.s % 16;
      bar.at[s].push({ type: 'oud', deg: n.deg, vel: vel * rand(0.85, 1), len: n.len * STEP + 0.5, grace: n.len >= 4 && Math.random() < 0.22 });
      // Oud tremolo (risha) on some long notes.
      if (n.len >= 6 && Math.random() < 0.35) {
        for (let k = 2; k < n.len; k += 1) {
          const ss = n.s + k;
          bars[Math.floor(ss / 16)].at[ss % 16].push({ type: 'oud', deg: n.deg, vel: vel * 0.32 * (1 - k / (n.len + 2)), len: STEP * 2 });
        }
      }
    }
  }
  function addQanun(bar, kind, center, vel = 0.7) {
    const q = (s, deg, v = vel) => bar.at[s].push({ type: 'qanun', deg, vel: v * rand(0.8, 1) });
    if (kind === 'arp') {
      const tones = [0, 2, 4, 7, 9, 7, 4, 2].map((x) => x + center);
      tones.forEach((d, i) => q(8 + i, d, vel * (0.6 + 0.4 * Math.sin((i / 7) * Math.PI))));
    } else if (kind === 'run') {
      for (let i = 0; i < 8; i++) q(8 + i, center + 7 - i, vel * (0.9 - i * 0.05));
    } else if (kind === 'shimmer') {
      for (let i = 0; i < 12; i++) q(4 + i, center + (i % 2 ? 2 : 0), vel * 0.55 * (0.5 + 0.5 * Math.sin((i / 11) * Math.PI)));
    } else if (kind === 'answer') {
      [[0, 4], [3, 3], [6, 2], [8, 3], [12, 0]].forEach(([s, d]) => q(s, center + d));
    } else if (kind === 'sparse') {
      q(0, center + 7, vel * 0.7); q(6, center + 4, vel * 0.5); q(10, center + 2, vel * 0.45);
    }
  }
  function addDrums(bar, pattern, { ghosts = 0.3, fill = false, riq = true, vel = 1 } = {}) {
    const d = (s, k, v) => bar.at[s].push({ type: 'drum', k, vel: v * vel * rand(0.85, 1) });
    if (fill) {
      d(0, 'D', 1); d(2, 'T', 0.8); d(4, 'D', 0.9);
      for (let s = 6; s < 16; s++) d(s, s % 2 ? 'K' : 'T', 0.35 + (s - 6) * 0.06);
      return;
    }
    const p = DRUMS[pattern];
    for (let s = 0; s < 16; s++) {
      if (p[s]) d(s, p[s], p[s] === 'D' ? 1 : 0.8);
      else if (s % 2 && Math.random() < ghosts) d(s, 'K', 0.5);
      else if (riq && (s === 4 || s === 10 || s === 14) && Math.random() < 0.7) d(s, 'J', 0.8);
    }
  }

  // One section = a list of bars.
  function makeSection(kind) {
    stats.section = kind;
    if (kind === 'intro') {
      const bars = [emptyBar('hijaz'), emptyBar('hijaz')];
      addQanun(bars[0], 'sparse', 4, 0.6);
      addQanun(bars[1], 'arp', 0, 0.5);
      bars[1].at[8].push({ type: 'drum', k: 'F', vel: 0.5 });
      return bars;
    }
    if (kind === 'taqsim') {
      // Drums rest; the oud improvises slowly over the drone.
      const scale = Math.random() < 0.5 ? 'hijaz' : 'rast';
      const bars = Array.from({ length: 4 }, () => emptyBar(scale));
      for (let p = 0; p < 2; p++) {
        const rh = [];
        let s = 0;
        while (s < 28) {
          const len = Math.min(pick([2, 4, 4, 6, 8, 3]), 28 - s);
          rh.push({ s, len });
          s += len;
        }
        rh.push({ s: 28, len: 4 });
        melody(rh, p ? 4 : 7, p ? 0 : 3, -2, 9);
        addPhrase(bars.slice(p * 2, p * 2 + 2), rh, scale, 0.8);
      }
      bars[0].at[0].push({ type: 'drum', k: 'F', vel: 0.55 });
      addQanun(bars[3], 'answer', 3, 0.45);
      return bars;
    }
    // 'A' low and grounded in Hijaz; 'B' higher, with the Rast colour.
    const B = kind === 'B';
    const scale = B ? (Math.random() < 0.7 ? 'rast' : 'hijaz') : 'hijaz';
    const lo = B ? 1 : -3, hi = B ? 10 : 7;
    const bars = Array.from({ length: 8 }, () => emptyBar(scale));
    const motif = melody(rhythm(Math.random() < 0.4), B ? 7 : 0, B ? 5 : 3, lo, hi);
    const variant = clone(motif, pick([1, 2, -1]));
    variant[variant.length - 1].deg = B ? 3 : 4;
    const answer = melody(rhythm(Math.random() < 0.5), B ? 5 : 4, B ? 4 : 1, lo, hi);
    const home = clone(motif);
    home[home.length - 1].deg = B ? 7 : 0;
    const phrases = [motif, variant, answer, home];
    phrases.forEach((ph, i) => addPhrase(bars.slice(i * 2, i * 2 + 2), ph, scale, i === 3 ? 0.95 : 0.85));
    stats.phrase++;
    const patA = B ? pick(['baladi', 'saidi']) : 'maqsum';
    for (let i = 0; i < 8; i++) {
      const bar = bars[i];
      if (i === 7) addDrums(bar, patA, { fill: true });
      else addDrums(bar, i % 4 === 3 && Math.random() < 0.5 ? 'maqsum' : patA, { ghosts: B ? 0.4 : 0.25 });
      if (i % 2 === 0 && Math.random() < (B ? 0.55 : 0.3)) bar.at[0].push({ type: 'oud', deg: pick([-7, -3]), vel: 0.45, len: 1.2 });
      const qChance = B ? 0.75 : 0.45;
      if (Math.random() < qChance) addQanun(bar, i === 7 ? 'run' : pick(['arp', 'shimmer', 'answer']), B ? 3 : pick([0, 4]), B ? 0.65 : 0.5);
    }
    return bars;
  }

  let lastSection = 'intro';
  function nextSection() {
    const options = { A: ['B', 'A', 'taqsim'], B: ['A', 'A', 'taqsim'], taqsim: ['A', 'B'], intro: ['A'] }[lastSection];
    let next = pick(options);
    if (next === lastSection && Math.random() < 0.5) next = pick(options);
    lastSection = next;
    return makeSection(next);
  }

  // ---- Scheduler ---------------------------------------------------------
  let running = false, queue = [], bar = null, stepInBar = 0, nextTime = 0;
  let level = 0.8, duck = 1;

  function playEvent(e, t, scale) {
    const jitter = rand(-0.006, 0.006);
    t = Math.max(ac.currentTime + 0.005, t + jitter);
    if (e.type === 'oud') {
      const midi = degToMidi(e.deg, scale);
      if (e.grace) oud(Math.max(ac.currentTime + 0.003, t - 0.06), degToMidi(e.deg + 1, scale), e.vel * 0.45, 0.2);
      oud(t, midi, e.vel, e.len);
    } else if (e.type === 'qanun') {
      qanun(t, degToMidi(e.deg, scale, D3 + 12), e.vel);
    } else if (e.type === 'drum') {
      DRUM[e.k](t, e.vel);
    }
  }

  function schedule() {
    if (!running) return; // (while suspended the clock stands still, so nothing piles up)
    const now = ac.currentTime;
    if (nextTime < now) nextTime = now + 0.05; // fell behind (stall): skip ahead
    while (nextTime < now + LOOKAHEAD) {
      if (stepInBar === 0) {
        if (!queue.length) queue = nextSection();
        bar = queue.shift();
        stats.bars++;
      }
      const swing = stepInBar % 2 ? STEP * 0.06 : 0;
      for (const e of bar.at[stepInBar]) playEvent(e, nextTime + swing, bar.scale);
      nextTime += STEP;
      stepInBar = (stepInBar + 1) % 16;
    }
  }
  const timer = setInterval(schedule, 90);

  function applyLevel(time = 1.2) {
    bus.gain.cancelScheduledValues(ac.currentTime);
    bus.gain.setTargetAtTime(level * duck, ac.currentTime, time / 3);
  }

  return {
    stats,
    start() {
      if (running) return;
      running = true;
      const t = ac.currentTime + 0.1;
      queue = makeSection('intro');
      lastSection = 'intro';
      stepInBar = 0;
      nextTime = t;
      startDrone(t);
      bus.gain.cancelScheduledValues(ac.currentTime);
      bus.gain.setValueAtTime(0.0001, ac.currentTime);
      bus.gain.linearRampToValueAtTime(level * duck, ac.currentTime + 5);
      schedule();
    },
    get running() { return running; },
    setDuck(open) { duck = open ? 0.4 : 1; if (running) applyLevel(open ? 0.8 : 2); },
    update: schedule,
    dispose() { clearInterval(timer); },
  };
}
