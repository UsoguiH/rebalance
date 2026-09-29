// Every sound is synthesised with the Web Audio API: no audio files.

const STORE_KEY = 'camel-folio-muted';

function readMuted() {
  try { return localStorage.getItem(STORE_KEY) === '1'; } catch { return false; }
}
function writeMuted(v) {
  try { localStorage.setItem(STORE_KEY, v ? '1' : '0'); } catch { /* private mode */ }
}

// Maqam Hijaz on D (Hz), two octaves.
const HIJAZ = [146.83, 155.56, 185.0, 196.0, 220.0, 233.08, 261.63, 293.66, 311.13, 369.99, 392.0, 440.0];

export class Audio {
  constructor() {
    this.ctx = null;
    this.muted = readMuted();
    this.lastHit = new Map();
    this.plucks = new Map();
  }

  // Must be called from a user gesture (iOS / Chrome autoplay rules).
  unlock() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ctx = (this.ctx = new AC());
    this.master = ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 1;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14;
    comp.ratio.value = 4;
    this.master.connect(comp).connect(ctx.destination);

    this.sfx = ctx.createGain();
    this.sfx.gain.value = 0.9;
    this.sfx.connect(this.master);

    // Short echo send so everything sits in the same open space.
    this.reverb = ctx.createGain();
    this.reverb.gain.value = 0.18;
    const delay = ctx.createDelay(1);
    delay.delayTime.value = 0.23;
    const fb = ctx.createGain();
    fb.gain.value = 0.32;
    const damp = ctx.createBiquadFilter();
    damp.type = 'lowpass';
    damp.frequency.value = 1800;
    this.reverb.connect(delay).connect(damp).connect(fb).connect(delay);
    damp.connect(this.master);

    this.noiseBuf = this.makeNoise(2);
    this.startWind();
    this.startMusic();
    // Some mobile browsers start the context suspended even inside a gesture.
    if (ctx.state === 'suspended') ctx.resume();
  }

  setMuted(m) {
    this.muted = m;
    writeMuted(m);
    if (this.master) this.master.gain.setTargetAtTime(m ? 0 : 1, this.ctx.currentTime, 0.05);
  }

  suspend() { if (this.ctx && this.ctx.state === 'running') this.ctx.suspend(); }
  resume() { if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume(); }

  makeNoise(seconds) {
    const len = Math.floor(this.ctx.sampleRate * seconds);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }

  noiseSource(loop = false) {
    const s = this.ctx.createBufferSource();
    s.buffer = this.noiseBuf;
    s.loop = loop;
    return s;
  }

  // ---------- ambience ----------
  startWind() {
    const ctx = this.ctx;
    const src = this.noiseSource(true);
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 500;
    bp.Q.value = 0.7;
    const g = ctx.createGain();
    g.gain.value = 0.05;
    // Slow LFOs make the wind gust.
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.07;
    const lfoG = ctx.createGain();
    lfoG.gain.value = 260;
    lfo.connect(lfoG).connect(bp.frequency);
    const lfo2 = ctx.createOscillator();
    lfo2.frequency.value = 0.11;
    const lfo2G = ctx.createGain();
    lfo2G.gain.value = 0.03;
    lfo2.connect(lfo2G).connect(g.gain);
    src.connect(bp).connect(g).connect(this.master);
    src.start();
    lfo.start();
    lfo2.start();
    this.windGain = g;
  }

  // ---------- music: generative oud + darbuka ----------
  // Karplus-Strong plucked string rendered once per pitch into a buffer.
  pluckBuffer(freq) {
    const key = Math.round(freq * 100);
    if (this.plucks.has(key)) return this.plucks.get(key);
    const sr = this.ctx.sampleRate;
    const len = Math.floor(sr * 1.8);
    const buf = this.ctx.createBuffer(1, len, sr);
    const out = buf.getChannelData(0);
    const period = Math.max(2, Math.round(sr / freq));
    const ring = new Float32Array(period);
    for (let i = 0; i < period; i++) ring[i] = Math.random() * 2 - 1;
    let idx = 0;
    let prev = 0;
    for (let i = 0; i < len; i++) {
      const cur = ring[idx];
      const next = ring[(idx + 1) % period];
      const v = 0.4985 * (cur + next);
      ring[idx] = v;
      // Slight body resonance: one-pole smoothing.
      prev = prev * 0.2 + cur * 0.8;
      out[i] = prev;
      idx = (idx + 1) % period;
    }
    this.plucks.set(key, buf);
    return buf;
  }

  pluck(freq, when, vel = 0.3) {
    const ctx = this.ctx;
    const src = ctx.createBufferSource();
    src.buffer = this.pluckBuffer(freq);
    const g = ctx.createGain();
    g.gain.value = vel;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 2600;
    src.connect(lp).connect(g);
    g.connect(this.musicGain);
    g.connect(this.reverb);
    src.start(when);
  }

  doum(when, vel = 0.5) {
    const ctx = this.ctx;
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(120, when);
    o.frequency.exponentialRampToValueAtTime(55, when + 0.18);
    const g = ctx.createGain();
    g.gain.setValueAtTime(vel, when);
    g.gain.exponentialRampToValueAtTime(0.001, when + 0.35);
    o.connect(g).connect(this.musicGain);
    o.start(when);
    o.stop(when + 0.4);
  }

  tak(when, vel = 0.25) {
    const ctx = this.ctx;
    const n = this.noiseSource();
    const hp = ctx.createBiquadFilter();
    hp.type = 'bandpass';
    hp.frequency.value = 3200;
    hp.Q.value = 1.4;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vel, when);
    g.gain.exponentialRampToValueAtTime(0.001, when + 0.07);
    n.connect(hp).connect(g).connect(this.musicGain);
    n.start(when, Math.random());
    n.stop(when + 0.08);
  }

  startMusic() {
    const ctx = this.ctx;
    this.musicGain = ctx.createGain();
    this.musicGain.gain.value = 0.32;
    this.musicGain.connect(this.master);
    this.bpm = 92;
    this.step = 0;
    this.nextTime = ctx.currentTime + 0.3;
    this.melodyIdx = 4;
    this.phrase = [];
    // Maqsum rhythm, 8 eighth-notes: D T - T D - T -
    this.rhythm = ['D', 'T', '', 'T', 'D', '', 'T', ''];
    this.musicTimer = setInterval(() => this.scheduleMusic(), 50);
  }

  newPhrase() {
    // A phrase is a random walk over the scale that resolves to the tonic.
    const len = 8;
    const p = [];
    let i = this.melodyIdx;
    for (let k = 0; k < len; k++) {
      if (Math.random() < 0.28) { p.push(null); continue; }
      i += [-2, -1, -1, 1, 1, 2, 0][Math.floor(Math.random() * 7)];
      i = Math.max(0, Math.min(HIJAZ.length - 1, i));
      p.push(i);
    }
    // Land on D or A at the end of the phrase.
    p[len - 1] = Math.random() < 0.5 ? 0 : 4;
    this.melodyIdx = p[len - 1] === 0 ? 3 : 5;
    return p;
  }

  scheduleMusic() {
    if (!this.ctx || this.ctx.state !== 'running') return;
    const eighth = 60 / this.bpm / 2;
    while (this.nextTime < this.ctx.currentTime + 0.25) {
      const s = this.step % 8;
      const bar = Math.floor(this.step / 8);
      const t = this.nextTime;
      const hit = this.rhythm[s];
      if (hit === 'D') this.doum(t, 0.42);
      if (hit === 'T') this.tak(t, 0.12 + Math.random() * 0.05);
      if (s === 0) this.phrase = bar % 4 === 3 ? [] : this.newPhrase();
      const note = this.phrase[s];
      if (note != null) {
        this.pluck(HIJAZ[note], t, 0.22 + Math.random() * 0.08);
        // Oud players often double a note with a quick tremolo.
        if (Math.random() < 0.18) this.pluck(HIJAZ[note], t + eighth / 2, 0.14);
      }
      // Drone on the tonic every other bar.
      if (s === 0 && bar % 2 === 0) this.pluck(HIJAZ[0] / 2, t, 0.2);
      this.nextTime += eighth;
      this.step++;
    }
  }

  // ---------- sound effects ----------
  ready() { return this.ctx && this.ctx.state === 'running'; }

  footstep(strength = 1, pan = 0) {
    if (!this.ready()) return;
    const ctx = this.ctx;
    const t = ctx.currentTime;
    const n = this.noiseSource();
    const bp = ctx.createBiquadFilter();
    bp.type = 'lowpass';
    bp.frequency.value = 700 + Math.random() * 500;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.16 * strength, t + 0.015);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
    const p = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
    let node = n.connect(bp).connect(g);
    if (p) { p.pan.value = pan; node = node.connect(p); }
    node.connect(this.sfx);
    n.start(t, Math.random() * 1.5);
    n.stop(t + 0.2);
  }

  splash(strength = 1) {
    if (!this.ready()) return;
    const ctx = this.ctx;
    const t = ctx.currentTime;
    const n = this.noiseSource();
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(900, t);
    bp.frequency.exponentialRampToValueAtTime(2400, t + 0.2);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.18 * strength, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
    n.connect(bp).connect(g).connect(this.sfx);
    n.start(t, Math.random());
    n.stop(t + 0.32);
  }

  // Camel grumble: a buzzy low voice through two vowel formants.
  grunt() {
    if (!this.ready()) return;
    const ctx = this.ctx;
    const t = ctx.currentTime;
    const dur = 0.9 + Math.random() * 0.3;
    const o = ctx.createOscillator();
    o.type = 'sawtooth';
    const base = 70 + Math.random() * 20;
    o.frequency.setValueAtTime(base * 1.5, t);
    o.frequency.linearRampToValueAtTime(base * 1.9, t + 0.15);
    o.frequency.linearRampToValueAtTime(base, t + dur);
    const vib = ctx.createOscillator();
    vib.frequency.value = 23;
    const vibG = ctx.createGain();
    vibG.gain.value = 18;
    vib.connect(vibG).connect(o.frequency);
    const f1 = ctx.createBiquadFilter();
    f1.type = 'bandpass';
    f1.frequency.value = 480;
    f1.Q.value = 3;
    const f2 = ctx.createBiquadFilter();
    f2.type = 'bandpass';
    f2.frequency.setValueAtTime(1100, t);
    f2.frequency.linearRampToValueAtTime(700, t + dur);
    f2.Q.value = 4;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.6, t + 0.06);
    g.gain.setValueAtTime(0.55, t + dur * 0.6);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    const mix = ctx.createGain();
    o.connect(f1).connect(mix);
    o.connect(f2).connect(mix);
    mix.connect(g);
    g.connect(this.sfx);
    g.connect(this.reverb);
    o.start(t);
    vib.start(t);
    o.stop(t + dur + 0.05);
    vib.stop(t + dur + 0.05);
  }

  // kind: 'jar' | 'crate' | 'ball' | 'rock'
  hit(kind, strength, id = kind) {
    if (!this.ready() || strength < 0.8) return;
    const now = this.ctx.currentTime;
    if (now - (this.lastHit.get(id) || 0) < 0.08) return;
    this.lastHit.set(id, now);
    const v = Math.min(1, strength / 9);
    const ctx = this.ctx;
    if (kind === 'jar') {
      // Fired clay: a few inharmonic partials with a fast decay.
      const f0 = 520 + Math.random() * 180;
      for (const [ratio, amp] of [[1, 1], [2.32, 0.5], [4.1, 0.3]]) {
        const o = ctx.createOscillator();
        o.frequency.value = f0 * ratio;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.18 * v * amp, now);
        g.gain.exponentialRampToValueAtTime(0.001, now + 0.25 / ratio + 0.05);
        o.connect(g).connect(this.sfx);
        o.start(now);
        o.stop(now + 0.35);
      }
      this.thud(now, v * 0.6, 260);
    } else if (kind === 'ball') {
      const o = ctx.createOscillator();
      o.frequency.setValueAtTime(260, now);
      o.frequency.exponentialRampToValueAtTime(120, now + 0.12);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.35 * v, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
      o.connect(g).connect(this.sfx);
      o.start(now);
      o.stop(now + 0.2);
    } else {
      this.thud(now, v, kind === 'crate' ? 420 : 300);
    }
  }

  thud(t, v, freq) {
    const ctx = this.ctx;
    const n = this.noiseSource();
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.6 * v, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
    n.connect(lp).connect(g).connect(this.sfx);
    n.start(t, Math.random());
    n.stop(t + 0.2);
  }

  ui(kind = 'open') {
    if (!this.ready()) return;
    const ctx = this.ctx;
    const t = ctx.currentTime;
    const notes = kind === 'open' ? [HIJAZ[4] * 2, HIJAZ[7] * 2] : kind === 'strike' ? [HIJAZ[0] * 2, HIJAZ[2] * 2, HIJAZ[4] * 2, HIJAZ[7] * 2] : [HIJAZ[7] * 2, HIJAZ[4] * 2];
    notes.forEach((f, i) => {
      const src = ctx.createBufferSource();
      src.buffer = this.pluckBuffer(f);
      const g = ctx.createGain();
      g.gain.value = 0.28;
      src.connect(g).connect(this.sfx);
      g.connect(this.reverb);
      src.start(t + i * 0.07);
    });
  }
}
