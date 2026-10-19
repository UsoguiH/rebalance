// Synthesised sound: every effect is built from oscillators and noise, plus a jaunty
// medieval loop (recorder, lute, tabor) from a tiny step sequencer.
export class Audio {
  constructor(game) {
    this.game = game;
    this.ctx = null;
    this.muted = false;
    this.musicOn = true;
    this.last = {};
  }
  init() {
    if (this.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.55;
    this.master.connect(this.ctx.destination);
    this.sfx = this.ctx.createGain();
    this.sfx.gain.value = 0.9;
    this.sfx.connect(this.master);
    this.mus = this.ctx.createGain();
    this.mus.gain.value = 0.22;
    this.mus.connect(this.master);
    const len = this.ctx.sampleRate;
    this.noise = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = this.noise.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this.startMusic();
  }
  toggleMute() {
    this.muted = !this.muted;
    if (this.master) this.master.gain.value = this.muted ? 0 : 0.55;
  }

  // ------------------------------------------------------------ primitives
  tone(type, f0, f1, dur, vol = 0.3, delay = 0, dest = this.sfx) {
    const c = this.ctx, t = c.currentTime + delay;
    const o = c.createOscillator(), g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(dest);
    o.start(t);
    o.stop(t + dur + 0.05);
  }
  hiss(dur, vol = 0.3, f0 = 2000, f1 = 600, q = 1, delay = 0, type = 'bandpass', dest = this.sfx) {
    const c = this.ctx, t = c.currentTime + delay;
    const s = c.createBufferSource();
    s.buffer = this.noise;
    const f = c.createBiquadFilter();
    f.type = type;
    f.Q.value = q;
    f.frequency.setValueAtTime(f0, t);
    f.frequency.exponentialRampToValueAtTime(Math.max(40, f1), t + dur);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f).connect(g).connect(dest);
    s.start(t, Math.random() * 0.5);
    s.stop(t + dur + 0.05);
  }

  // Positional-ish play: louder near the camera focus, silent far away.
  play(name, src) {
    if (!this.ctx || this.muted) return;
    const now = this.ctx.currentTime;
    if (this.last[name] && now - this.last[name] < 0.04) return;
    this.last[name] = now;
    let v = 1;
    const f = this.game.focus;
    if (src && f && src.x !== undefined) {
      const d = Math.hypot(src.x - f.x, src.z - f.z);
      v = Math.max(0, 1 - d / 34);
      if (v <= 0.02) return;
      if (src.isPlayer) v = 1;
    }
    const s = (x) => x * v;
    switch (name) {
      case 'swing': this.hiss(0.16, s(0.22), 3000, 900, 1.2); break;
      case 'spin': this.hiss(0.35, s(0.3), 1200, 4000, 1); break;
      case 'hit':
        this.tone('square', 180, 60, 0.12, s(0.18));
        this.hiss(0.12, s(0.4), 1600, 300, 0.8);
        break;
      case 'squish':
        this.hiss(0.18, s(0.35), 900, 200, 2);
        this.tone('sine', 220, 90, 0.14, s(0.2));
        break;
      case 'block': this.tone('triangle', 900, 700, 0.15, s(0.25)); this.tone('square', 1800, 1500, 0.08, s(0.08)); break;
      case 'die':
        this.hiss(0.4, s(0.45), 700, 120, 1.5);
        this.tone('sawtooth', 300, 70, 0.35, s(0.12));
        break;
      case 'bow': this.tone('triangle', 520, 180, 0.12, s(0.2)); this.hiss(0.1, s(0.15), 4000, 2000, 2); break;
      case 'gun': this.hiss(0.35, s(0.7), 1500, 100, 0.6, 0, 'lowpass'); this.tone('square', 120, 40, 0.2, s(0.3)); break;
      case 'fire': this.hiss(0.4, s(0.3), 500, 1800, 0.7); break;
      case 'ice': this.tone('sine', 1800, 2600, 0.2, s(0.12)); this.tone('sine', 2400, 3200, 0.2, s(0.08), 0.05); break;
      case 'explode':
        this.hiss(0.9, s(0.9), 900, 60, 0.5, 0, 'lowpass');
        this.tone('sine', 90, 30, 0.6, s(0.6));
        break;
      case 'heal': this.tone('sine', 660, 990, 0.25, s(0.12)); this.tone('sine', 880, 1320, 0.25, s(0.1), 0.08); break;
      case 'curse': this.tone('sawtooth', 200, 90, 0.5, s(0.15)); this.tone('sawtooth', 210, 95, 0.5, s(0.15)); break;
      case 'chop': this.tone('square', 260, 140, 0.07, s(0.25)); this.hiss(0.06, s(0.3), 1800, 900, 2); break;
      case 'timber': this.hiss(0.8, s(0.5), 300, 80, 0.5, 0, 'lowpass'); this.tone('triangle', 120, 50, 0.6, s(0.3), 0.2); break;
      case 'clink': this.tone('triangle', 1800, 1700, 0.18, s(0.18)); this.tone('sine', 2700, 2600, 0.12, s(0.1)); break;
      case 'hammer': this.tone('square', 600, 400, 0.06, s(0.18)); this.tone('triangle', 1400, 1200, 0.1, s(0.1)); break;
      case 'wood': this.tone('square', 140, 70, 0.12, s(0.35)); this.hiss(0.12, s(0.35), 600, 200, 1); break;
      case 'pickup': this.tone('triangle', 520, 880, 0.12, s(0.22)); break;
      case 'hat': this.tone('triangle', 440, 660, 0.09, s(0.2)); this.tone('triangle', 660, 990, 0.12, s(0.2), 0.08); break;
      case 'deposit': [784, 988, 1175].forEach((f, i) => this.tone('triangle', f, f, 0.15, s(0.18), i * 0.06)); break;
      case 'munch': for (let i = 0; i < 4; i++) this.hiss(0.07, s(0.25), 1200, 600, 3, i * 0.12); break;
      case 'princess': this.tone('sine', 900, 1500, 0.25, s(0.15)); this.tone('sine', 1500, 1100, 0.3, s(0.12), 0.2); break;
      case 'splash': this.hiss(0.4, s(0.4), 2500, 400, 0.7); break;
      case 'jump': this.tone('sine', 300, 600, 0.12, s(0.1)); break;
      case 'land': this.hiss(0.25, s(0.4), 500, 100, 0.8, 0, 'lowpass'); break;
      case 'thud': this.tone('sine', 120, 50, 0.2, s(0.4)); break;
      case 'swap': this.tone('triangle', 700, 500, 0.08, s(0.15)); this.tone('triangle', 500, 900, 0.1, s(0.15), 0.07); break;
      case 'charged': this.tone('sine', 1200, 1800, 0.12, s(0.12)); break;
      case 'catapult': this.hiss(0.5, s(0.4), 300, 2000, 0.8); this.tone('square', 90, 50, 0.3, s(0.3)); break;
      case 'upgrade': [523, 659, 784, 1047].forEach((f, i) => this.tone('square', f, f, 0.18, 0.12, i * 0.09)); break;
      case 'capture': [392, 523, 659].forEach((f, i) => this.tone('sawtooth', f, f, 0.25, 0.1, i * 0.12)); break;
      case 'lose': [440, 370, 311].forEach((f, i) => this.tone('sawtooth', f, f, 0.25, 0.08, i * 0.12)); break;
      case 'horn': [262, 330, 392, 523].forEach((f, i) => this.tone('sawtooth', f, f * 1.01, 0.4, 0.13, i * 0.15)); break;
      case 'tick': this.tone('square', 1000, 1000, 0.05, 0.12); break;
      case 'win': [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) => this.tone('square', f, f, 0.22, 0.14, i * 0.13)); break;
      case 'click': this.tone('triangle', 900, 700, 0.05, 0.15); break;
    }
  }

  // ------------------------------------------------------------ music
  startMusic() {
    const c = this.ctx;
    const bpm = 132, step = 60 / bpm / 2;
    // D dorian ditty: melody (recorder), bass (lute pluck), drum (tabor)
    const mel = 'D5 - F5 G5 A5 - G5 F5 | E5 - C5 D5 E5 - G5 - | F5 - E5 D5 C5 - A4 C5 | D5 - - A4 D5 - - - | A5 - G5 F5 G5 - A5 - | C6 - A5 G5 F5 - E5 - | F5 G5 A5 F5 E5 - C5 E5 | D5 - - - D5 - - - |'.split(/\s+/).filter((s) => s !== '|');
    const bass = 'D3 A3 D3 A3 C3 G3 C3 G3 F3 C4 F3 C4 D3 A3 D3 A3 D3 A3 D3 A3 F3 C4 F3 C4 C3 G3 C3 G3 D3 A3 D3 A3'.split(' ');
    const drum = 'x.x.x..x x.x.xx.x'.replace(/ /g, '');
    const note = (n) => {
      const m = /([A-G])(#?)(\d)/.exec(n);
      if (!m) return 0;
      const idx = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[m[1]] + (m[2] ? 1 : 0);
      return 440 * Math.pow(2, (idx - 9 + (+m[3] - 4) * 12) / 12);
    };
    let i = 0;
    let next = c.currentTime + 0.1;
    const tick = () => {
      if (!this.musicOn) return;
      while (next < c.currentTime + 0.25) {
        const m = mel[i % mel.length];
        if (m && m !== '-') {
          const f = note(m);
          let len = 1;
          while (mel[(i + len) % mel.length] === '-' && len < 4) len++;
          this.pluck(f, step * len * 0.95, 0.16, next, 'recorder');
        }
        if (i % 2 === 0) this.pluck(note(bass[(i / 2) % bass.length]), step * 1.8, 0.2, next, 'lute');
        if (drum[i % drum.length] === 'x') this.drum(next, i % 8 === 0);
        i++;
        next += step;
      }
    };
    this.musicTimer = setInterval(tick, 60);
  }
  pluck(f, dur, vol, t, kind) {
    const c = this.ctx;
    const o = c.createOscillator(), g = c.createGain();
    o.type = kind === 'lute' ? 'triangle' : 'square';
    o.frequency.value = f;
    const filt = c.createBiquadFilter();
    filt.type = 'lowpass';
    filt.frequency.value = kind === 'lute' ? 1200 : 2400;
    if (kind === 'recorder') {
      const vib = c.createOscillator(), vg = c.createGain();
      vib.frequency.value = 5.5;
      vg.gain.value = f * 0.008;
      vib.connect(vg).connect(o.frequency);
      vib.start(t);
      vib.stop(t + dur + 0.1);
    }
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol * (kind === 'recorder' ? 0.35 : 1), t + (kind === 'lute' ? 0.005 : 0.03));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(filt).connect(g).connect(this.mus);
    o.start(t);
    o.stop(t + dur + 0.05);
  }
  drum(t, accent) {
    const c = this.ctx;
    const s = c.createBufferSource();
    s.buffer = this.noise;
    const f = c.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = accent ? 300 : 900;
    const g = c.createGain();
    g.gain.setValueAtTime(accent ? 0.5 : 0.22, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
    s.connect(f).connect(g).connect(this.mus);
    s.start(t);
    s.stop(t + 0.15);
  }
}
