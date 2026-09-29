// رحلة الصحراء — GameAudio
// Fully synthesised soundscape for the camel ride (no samples, no external files):
//   * camel foley  : hoofbeats on sand, sand shuffle/scrape, breathing, snorts, saddle creak, halter bell
//   * ambience     : wind (slowly modulated band-pass), distant birds by day / crickets by night
//   * one-shots    : click, zoneEnter, zoneLeave, bump, call, sprint, collect, panelOpen, panelClose (+ snort)
//   * music        : original generative Hijaz piece (Karplus-Strong oud, drone, maqsum frame-drum)
//
// Usage:
//   const audio = new GameAudio();
//   button.onclick = () => audio.unlock();       // MUST be inside a user gesture (iOS)
//   each frame:  audio.update(dt, rideState);
//   events:      audio.play('bump', { strength: 0.7 });
//
// Test hooks: new GameAudio({ context: OfflineAudioContext, timeFn: () => simTime }) renders deterministically.

const LS_MUTED = 'rihla.audio.muted';
const LS_MUSIC = 'rihla.audio.music';

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const rnd = (a, b) => a + Math.random() * (b - a);
const pick = (arr) => arr[(Math.random() * arr.length) | 0];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function lsGet(key, dflt) {
  try {
    const v = globalThis.localStorage && globalThis.localStorage.getItem(key);
    return v === null || v === undefined ? dflt : v === '1';
  } catch (e) { return dflt; }
}
function lsSet(key, val) {
  try { globalThis.localStorage && globalThis.localStorage.setItem(key, val ? '1' : '0'); } catch (e) { /* private mode */ }
}

// ---- musical material ------------------------------------------------------------------------
// Hijaz on D (12-TET): D Eb F# G A Bb C. Index space: degree i -> octave floor(i/7) above D3.
const HIJAZ = [0, 1, 4, 5, 7, 8, 10];
const TONIC = 146.8324; // D3
const degHz = (i) => TONIC * Math.pow(2, (12 * Math.floor(i / 7) + HIJAZ[((i % 7) + 7) % 7]) / 12);
const D2 = 73.4162, A2 = 110.0;
// rhythmic cells for one bar (16th-note grid): [startStep, lengthInSteps]
const CELLS = [
  [[0, 3], [3, 1], [4, 2], [6, 2], [8, 4], [12, 4]],
  [[0, 2], [2, 2], [4, 4], [8, 2], [10, 2], [12, 4]],
  [[0, 4], [6, 2], [8, 2], [10, 2], [12, 4]],
  [[0, 2], [2, 1], [3, 1], [4, 4], [8, 3], [11, 1], [12, 4]],
  [[2, 2], [4, 2], [6, 2], [8, 8]],
  [[0, 6], [6, 2], [8, 2], [10, 2], [12, 2], [14, 2]],
];
const CADENCES = [
  [[0, 2], [2, 2], [4, 4], [8, 8]],
  [[0, 3], [3, 1], [4, 4], [8, 8]],
  [[0, 2], [2, 2], [4, 2], [6, 2], [8, 8]],
];

// per-gait footfall patterns: [phase, velocity]
const GAITS = {
  walk:   { beats: [[0, 1.0], [0.26, 0.7], [0.5, 0.92], [0.76, 0.66]], vol: 0.55, f0: 105, f1: 52, bp: 380, dec: 0.13, grain: 0.10 },
  trot:   { beats: [[0, 1.0], [0.5, 0.88]], vol: 0.70, f0: 115, f1: 55, bp: 480, dec: 0.11, grain: 0.14, flam: true },
  gallop: { beats: [[0, 0.85], [0.14, 0.62], [0.31, 1.0]], vol: 0.92, f0: 125, f1: 56, bp: 620, dec: 0.10, grain: 0.20 },
};

const BELL_NOTES = [1174.66, 1479.98, 1760.0, 2349.32];

function makeShaperCurve() {
  // identity below 0.6, soft knee, hard ceiling ~0.9: a last-resort guard behind the compressor
  const n = 2049;
  const c = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const x = (i / (n - 1)) * 2 - 1, a = Math.abs(x);
    const y = a <= 0.6 ? a : 0.6 + 0.3 * Math.tanh((a - 0.6) / 0.3);
    c[i] = Math.sign(x) * y;
  }
  return c;
}

function silentWavURI() {
  // 0.1 s of 8-bit silence at 8 kHz; used for the iOS "ringer switch" workaround
  const n = 800, buf = new ArrayBuffer(44 + n), dv = new DataView(buf);
  const w = (o, s) => { for (let i = 0; i < s.length; i++) dv.setUint8(o + i, s.charCodeAt(i)); };
  w(0, 'RIFF'); dv.setUint32(4, 36 + n, true); w(8, 'WAVE'); w(12, 'fmt ');
  dv.setUint32(16, 16, true); dv.setUint16(20, 1, true); dv.setUint16(22, 1, true);
  dv.setUint32(24, 8000, true); dv.setUint32(28, 8000, true); dv.setUint16(32, 1, true); dv.setUint16(34, 8, true);
  w(36, 'data'); dv.setUint32(40, n, true);
  for (let i = 0; i < n; i++) dv.setUint8(44 + i, 128);
  let s = ''; const u8 = new Uint8Array(buf);
  for (let i = 0; i < u8.length; i++) s += String.fromCharCode(u8[i]);
  return 'data:audio/wav;base64,' + btoa(s);
}

export class GameAudio {
  constructor(opts = {}) {
    this._opts = opts;
    this._ctx = null;
    this._timeFn = opts.timeFn || null;
    this._offline = !!opts.timeFn;
    this._muted = lsGet(LS_MUTED, false);
    this._musicWanted = lsGet(LS_MUSIC, true);
    this._duck = false;
    this._night = 0;
    this._disposed = false;
    this._g = null;
    this._listeners = [];
    this._voices = [];
    this._cap = 36;
    this._stats = { created: 0, ended: 0, dropped: 0, persistent: 0 };
    this._lastPlay = Object.create(null);
    this._ksCache = new Map();
    this._pumpTimer = null;
    this._suspendTimer = null;
    this._hiddenSuspended = false;
    this._masterCur = 0;
    this._audioEl = null;

    // Public tunables (linear gains). Safe to tweak before/after unlock.
    this.tuning = { master: 0.9, foley: 0.9, amb: 0.85, sfx: 0.85, music: 0.5, maxSpeed: 14, duckLevel: 0.3 };
    // If true, update() will fire 'bump' / 'sprint' itself from state.lastBump / rising state.sprint.
    this.autoBump = false;
    this.autoSprint = false;

    // ride-sound state
    this._sm = { speed: 0, sprint: 0, slip: 0 };
    this._prevPhase = null;
    this._lastBumpT = null;
    this._prevSprint = false;
    this._breathT = 1.0;
    this._snortT = rnd(6, 12);
    this._ambT = rnd(3, 8);
    this._creakCool = 0;
    this._bellCool = 0;
    this._lastSteer = 0;
    this._footCool = 0;

    // music state
    this._musicOn = false;
    this._inten = 0;
    this._bpm = 86;
    this._stepIdx = 0;
    this._nextT = 0;
    this._bar = null;
    this._pbar = 0;
    this._deg = 7;
    this._motif = null;
    this._cell = CELLS[0];
    this._fill = false;
    this._barNo = 0;
    this._drone = null;
  }

  // ---- public getters ------------------------------------------------------------------------
  get muted() { return this._muted; }
  get music() { return this._musicWanted; }
  get unlocked() { return !!this._ctx && (this._offline || this._ctx.state === 'running'); }
  get context() { return this._ctx; }
  get intensity() { return this._inten; }
  get _debugAnalyser() {
    if (!this._ctx || !this._g) return null;
    if (!this._analyser) {
      const a = this._ctx.createAnalyser();
      a.fftSize = 2048;
      a.smoothingTimeConstant = 0;
      this._g.shaper.connect(a);
      this._analyser = a;
    }
    return this._analyser;
  }
  /** created/ended source counts: (created - ended) is the number of live one-shot sources. */
  get _debugStats() {
    const s = this._stats;
    return { created: s.created, ended: s.ended, active: s.created - s.ended, dropped: s.dropped, persistent: s.persistent, voices: this._voices.length, ksBuffers: this._ksCache.size };
  }

  // ---- lifecycle -------------------------------------------------------------------------------
  /** Call from a user gesture (pointerdown/click/keydown/touchend). Idempotent; safe to call on every gesture. */
  async unlock() {
    if (this._disposed) return false;
    // NOTE: everything up to the first await runs synchronously inside the gesture (required by iOS Safari).
    if (!this._ctx) {
      try { this._createContext(); } catch (e) { this._failed = true; return false; }
    }
    const ctx = this._ctx;
    if (!this._offline) {
      this._iosSessionTricks();
      try { // silent-buffer unlock: a real start() inside the gesture
        const b = ctx.createBuffer(1, 1, 22050), s = ctx.createBufferSource();
        s.buffer = b; s.connect(ctx.destination); s.start(0);
      } catch (e) { /* ignore */ }
      if (ctx.state !== 'running') {
        try {
          const p = ctx.resume();
          if (p && p.then) await Promise.race([p.catch(() => {}), sleep(600)]);
        } catch (e) { /* ignore */ }
      }
    }
    this._onState();
    return this.unlocked;
  }

  /** Optional helper: auto-unlock on the first user gesture on `target` (default: window). */
  bindGestures(target) {
    const t = target || (typeof window !== 'undefined' ? window : null);
    if (!t) return;
    const h = () => { this.unlock(); };
    for (const ev of ['pointerdown', 'touchend', 'keydown', 'click']) {
      t.addEventListener(ev, h, { passive: true, capture: true });
      this._listeners.push([t, ev, h, { capture: true }]);
    }
  }

  _createContext() {
    let ctx = this._opts.context || null;
    if (!ctx) {
      const AC = globalThis.AudioContext || globalThis.webkitAudioContext;
      if (!AC) throw new Error('WebAudio unsupported');
      try { ctx = new AC({ latencyHint: 'interactive' }); } catch (e) { ctx = new AC(); }
    }
    this._ctx = ctx;
    this._buildGraph();
    if (!this._offline) this._installLifecycle();
  }

  _t() { return this._timeFn ? this._timeFn() : this._ctx.currentTime; }

  _live() {
    return !!this._ctx && !this._muted && !this._disposed && (this._offline || this._ctx.state === 'running');
  }

  _iosSessionTricks() {
    if (this._iosDone || typeof navigator === 'undefined') return;
    this._iosDone = true;
    try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) { /* ignore */ }
    // Older iOS: WebAudio obeys the ringer switch unless a media element is playing. Loop a silent clip.
    try {
      const ua = navigator.userAgent || '';
      const ios = /iP(hone|ad|od)/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
      if (ios && !navigator.audioSession && typeof Audio !== 'undefined') {
        const a = new Audio(silentWavURI());
        a.loop = true; a.volume = 0.01; a.setAttribute('playsinline', '');
        const p = a.play(); if (p && p.catch) p.catch(() => {});
        this._audioEl = a;
      }
    } catch (e) { /* ignore */ }
  }

  _installLifecycle() {
    const on = (t, ev, fn, o) => { t.addEventListener(ev, fn, o); this._listeners.push([t, ev, fn, o]); };
    const ctx = this._ctx;
    on(ctx, 'statechange', () => this._onState());
    if (typeof document !== 'undefined') {
      on(document, 'visibilitychange', () => (document.hidden ? this._hide() : this._show()));
      on(window, 'pagehide', () => this._hide());
      on(window, 'pageshow', () => this._show());
      on(window, 'focus', () => this._show());
      // iOS: after an interruption ('interrupted' state) only a fresh gesture can resume.
      const g = () => { if (this._ctx && this._ctx.state !== 'running' && !this._muted && !document.hidden) this._resumeQuiet(); };
      for (const ev of ['pointerdown', 'touchend', 'keydown']) on(window, ev, g, { passive: true, capture: true });
    }
  }

  _resumeQuiet() {
    try { const p = this._ctx.resume(); if (p && p.catch) p.catch(() => {}); } catch (e) { /* ignore */ }
  }
  _hide() {
    if (!this._ctx) return;
    this._hiddenSuspended = true;
    try { const p = this._ctx.suspend(); if (p && p.catch) p.catch(() => {}); } catch (e) { /* ignore */ }
    if (this._audioEl) try { this._audioEl.pause(); } catch (e) { /* ignore */ }
  }
  _show() {
    if (!this._ctx) return;
    this._hiddenSuspended = false;
    if (!this._muted) this._resumeQuiet();
    if (this._audioEl && !this._muted) try { this._audioEl.play().catch(() => {}); } catch (e) { /* ignore */ }
  }
  _onState() {
    if (!this._ctx || this._disposed) return;
    if (this.unlocked) {
      if (this._musicWanted && !this._musicOn) this._startMusic();
    }
  }

  dispose() {
    this._disposed = true;
    this._stopPump();
    if (this._suspendTimer) clearTimeout(this._suspendTimer);
    for (const [t, ev, fn, o] of this._listeners) { try { t.removeEventListener(ev, fn, o); } catch (e) { /* ignore */ } }
    this._listeners = [];
    if (this._audioEl) { try { this._audioEl.pause(); } catch (e) { /* ignore */ } this._audioEl = null; }
    const ctx = this._ctx;
    if (ctx) {
      try { this._g.master.gain.cancelScheduledValues(0); this._g.master.gain.value = 0; } catch (e) { /* ignore */ }
      if (!this._offline) { try { const p = ctx.close(); if (p && p.catch) p.catch(() => {}); } catch (e) { /* ignore */ } }
    }
    this._ksCache.clear();
    this._ctx = null; this._g = null;
  }

  // ---- graph -----------------------------------------------------------------------------------
  _buildGraph() {
    const c = this._ctx, T = this.tuning;
    const gain = (v) => { const g = c.createGain(); g.gain.value = v; return g; };
    const g = (this._g = {});
    g.mix = gain(1);
    g.master = gain(this._muted ? 0 : T.master);
    this._masterCur = this._muted ? 0 : T.master;
    g.comp = c.createDynamicsCompressor();
    g.comp.threshold.value = -14; g.comp.knee.value = 14; g.comp.ratio.value = 6;
    g.comp.attack.value = 0.004; g.comp.release.value = 0.2;
    g.shaper = c.createWaveShaper();
    g.shaper.curve = makeShaperCurve();
    try { g.shaper.oversample = '2x'; } catch (e) { /* ignore */ }
    g.mix.connect(g.master); g.master.connect(g.comp); g.comp.connect(g.shaper); g.shaper.connect(c.destination);

    g.foley = gain(T.foley); g.amb = gain(T.amb); g.sfx = gain(T.sfx);
    g.foley.connect(g.mix); g.amb.connect(g.mix); g.sfx.connect(g.mix);
    g.musicBus = gain(T.music);
    g.duck = gain(1);
    g.musicBus.connect(g.duck); g.duck.connect(g.mix);

    // reverb (one shared convolver, generated impulse)
    g.verbIn = gain(1);
    g.verb = c.createConvolver();
    g.verb.buffer = this._makeIR(1.6);
    g.verbRet = gain(0.55);
    g.verbIn.connect(g.verb); g.verb.connect(g.verbRet); g.verbRet.connect(g.mix);

    // music sub-buses
    g.pluckIn = gain(1);
    const pl = c.createBiquadFilter(); pl.type = 'lowpass'; pl.frequency.value = 3600; pl.Q.value = 0.5;
    const body = c.createBiquadFilter(); body.type = 'peaking'; body.frequency.value = 240; body.Q.value = 1.0; body.gain.value = 4;
    g.pluckIn.connect(pl); pl.connect(body); body.connect(g.musicBus);
    const pv = gain(0.32); body.connect(pv); pv.connect(g.verbIn);
    g.drumIn = gain(0.75); g.drumIn.connect(g.musicBus);
    const dv = gain(0.12); g.drumIn.connect(dv); dv.connect(g.verbIn);

    // shared noise buffer (4 s, mono)
    const sr = c.sampleRate, len = sr * 4;
    const nb = c.createBuffer(1, len, sr), d = nb.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this._noiseBuf = nb;

    // PeriodicWave for warm mallet tones
    try {
      const re = new Float32Array([0, 0, 0, 0, 0, 0]);
      const im = new Float32Array([0, 1, 0.34, 0.14, 0.05, 0.02]);
      this._warm = c.createPeriodicWave(re, im, { disableNormalization: false });
    } catch (e) { this._warm = null; }

    this._buildPersistent();
  }

  _makeIR(seconds) {
    const c = this._ctx, sr = c.sampleRate, len = Math.floor(sr * seconds);
    const ir = c.createBuffer(2, len, sr);
    for (let ch = 0; ch < 2; ch++) {
      const d = ir.getChannelData(ch);
      let lp = 0;
      for (let i = 0; i < len; i++) {
        const t = i / len;
        const a = 0.65 - 0.55 * Math.sqrt(t); // gets darker as it decays
        lp += ((Math.random() * 2 - 1) - lp) * a;
        d[i] = lp * Math.exp(-6.2 * t) * (i < 200 ? i / 200 : 1);
      }
    }
    return ir;
  }

  _noiseLoop(dest, target) {
    const c = this._ctx;
    const s = c.createBufferSource();
    s.buffer = this._noiseBuf; s.loop = true;
    s.start(0, Math.random() * 3);
    this._stats.persistent++;
    (this._persist || (this._persist = [])).push(s);
    if (target) s.connect(target);
    return s;
  }

  _buildPersistent() {
    const c = this._ctx, g = this._g;
    const gain = (v, d) => { const n = c.createGain(); n.gain.value = v; if (d) n.connect(d); return n; };
    const bq = (type, f, q) => { const n = c.createBiquadFilter(); n.type = type; n.frequency.value = f; n.Q.value = q; return n; };

    // wind: band-passed noise, centre + level slowly wandering
    g.windBP = bq('bandpass', 600, 0.9);
    g.windGain = gain(0, g.amb);
    g.windBP.connect(g.windGain);
    this._noiseLoop(null, g.windBP);
    g.rumbleLP = bq('lowpass', 200, 0.7);
    g.rumbleGain = gain(0, g.amb);
    g.rumbleLP.connect(g.rumbleGain);
    this._noiseLoop(null, g.rumbleLP);
    const lfo = (f, depth, param) => {
      const o = c.createOscillator(); o.frequency.value = f;
      const d = gain(depth); o.connect(d); d.connect(param); o.start();
      this._stats.persistent++; this._persist.push(o);
    };
    lfo(0.083, 260, g.windBP.frequency);
    lfo(0.21, 0.018, g.windGain.gain);
    lfo(0.05, 40, g.rumbleLP.frequency);

    // sand shuffle + scrape (foley)
    g.sandBP = bq('bandpass', 1800, 0.6);
    g.sandGain = gain(0, g.foley);
    g.sandBP.connect(g.sandGain);
    this._noiseLoop(null, g.sandBP);
    g.scrapeBP = bq('bandpass', 3400, 1.3);
    g.scrapeGain = gain(0, g.foley);
    g.scrapeBP.connect(g.scrapeGain);
    this._noiseLoop(null, g.scrapeBP);

    // breathing (envelope-driven from update())
    g.breathBP = bq('bandpass', 420, 0.8);
    g.breathGain = gain(0, g.foley);
    g.breathBP.connect(g.breathGain);
    this._noiseLoop(null, g.breathBP);
  }

  // ---- generic voice helpers ---------------------------------------------------------------------
  _reserve(n, endT, force) {
    const now = this._t(), v = this._voices;
    let w = 0;
    for (let i = 0; i < v.length; i++) if (v[i] > now) v[w++] = v[i];
    v.length = w;
    if (!force && w + n > this._cap) { this._stats.dropped++; return false; }
    for (let i = 0; i < n; i++) v.push(endT);
    return true;
  }

  /** start + stop a source, count it, and disconnect its chain when it ends (lets GC free it). */
  _go(src, t, end, off, ...chain) {
    if (off !== undefined && off !== null) src.start(t, off); else src.start(t);
    src.stop(end);
    this._stats.created++;
    src.onended = () => {
      this._stats.ended++;
      try { src.disconnect(); } catch (e) { /* ignore */ }
      for (const n of chain) { try { n.disconnect(); } catch (e) { /* ignore */ } }
    };
  }

  _noise() {
    const s = this._ctx.createBufferSource();
    s.buffer = this._noiseBuf; s.loop = true;
    return s;
  }
  _goNoise(src, t, end, ...chain) { this._go(src, t, end, Math.random() * 3, ...chain); }

  _bq(type, f, q) {
    const n = this._ctx.createBiquadFilter();
    n.type = type; n.frequency.value = f; if (q !== undefined) n.Q.value = q;
    return n;
  }
  _gn(v) { const n = this._ctx.createGain(); n.gain.value = v; return n; }
  _osc(type, f, detune) {
    const o = this._ctx.createOscillator();
    o.type = type; o.frequency.value = f; if (detune) o.detune.value = detune;
    return o;
  }
  _env(p, t, a, peak, d) {
    p.setValueAtTime(0.0001, t);
    p.linearRampToValueAtTime(Math.max(peak, 0.0002), t + a);
    p.exponentialRampToValueAtTime(0.0001, t + a + d);
  }
  _send(node, amount) { const s = this._gn(amount); node.connect(s); s.connect(this._g.verbIn); return s; }

  // ---- mute / music / duck ---------------------------------------------------------------------
  setMuted(b) {
    b = !!b;
    this._muted = b;
    lsSet(LS_MUTED, b);
    if (!this._ctx || !this._g) return;
    const p = this._g.master.gain, now = this._t();
    const target = b ? 0 : this.tuning.master;
    try {
      p.cancelScheduledValues(now);
      p.setValueAtTime(this._masterCur, now);
      p.linearRampToValueAtTime(target, now + 0.08);
    } catch (e) { p.value = target; }
    this._masterCur = target;
    if (this._suspendTimer) { clearTimeout(this._suspendTimer); this._suspendTimer = null; }
    if (this._offline) return;
    if (b) {
      // save battery: once the fade has finished, park the context
      this._suspendTimer = setTimeout(() => {
        this._suspendTimer = null;
        if (this._muted && this._ctx) { try { const r = this._ctx.suspend(); if (r && r.catch) r.catch(() => {}); } catch (e) { /* ignore */ } }
      }, 1200);
    } else if (!this._hiddenSuspended) {
      this._resumeQuiet();
    }
  }

  setMusic(b) {
    b = !!b;
    this._musicWanted = b;
    lsSet(LS_MUSIC, b);
    if (!this._ctx) return;
    if (b) { if (this.unlocked) this._startMusic(); } else this._stopMusic();
  }

  /** Lower the music while a content panel is open. */
  duck(b) {
    this._duck = !!b;
    if (!this._g) return;
    const p = this._g.duck.gain, now = this._t();
    p.cancelScheduledValues(now);
    p.setValueAtTime(this._duckCur === undefined ? 1 : this._duckCur, now);
    const target = this._duck ? this.tuning.duckLevel : 1;
    p.linearRampToValueAtTime(target, now + 0.45);
    this._duckCur = target;
  }

  /** 0 = day (birds), 1 = night (crickets). */
  setNight(n) { this._night = clamp(+n || 0, 0, 1); }

  // ---- per-frame update ------------------------------------------------------------------------
  update(dt, s) {
    if (!this._ctx || !s || !this._live()) return;
    dt = clamp(dt || 0.016, 0.001, 0.25);
    const g = this._g, T = this.tuning, now = this._t(), sm = this._sm;
    const gait = s.gait || 'idle';
    const spd = Math.abs(s.speed || 0);
    const speedN = clamp(spd / T.maxSpeed, 0, 1.2);
    const sprint = !!s.sprint;
    const moving = gait !== 'idle' && spd > 0.15;

    const k1 = 1 - Math.exp(-dt * 5), k2 = 1 - Math.exp(-dt * 2.5);
    sm.speed += (speedN - sm.speed) * k1;
    sm.sprint += ((sprint ? 1 : 0) - sm.sprint) * k2;
    sm.slip += (clamp(s.slip || 0, 0, 1) - sm.slip) * k1;
    // music intensity follows sprint / gait
    const iT = sprint ? 1 : gait === 'gallop' ? 0.6 : gait === 'trot' ? 0.3 : 0;
    this._inten += (iT - this._inten) * (1 - Math.exp(-dt * 0.7));

    // --- continuous layers
    const air = s.grounded === false ? 0.25 : 1;
    g.sandGain.gain.value = (moving ? 0.075 * Math.pow(sm.speed, 0.7) * (0.8 + 0.4 * sm.sprint) : 0) * air;
    g.sandBP.frequency.value = 900 + 1700 * sm.speed;
    g.scrapeGain.gain.value = sm.slip * 0.11 * clamp(sm.speed * 3, 0, 1) * air;
    g.scrapeBP.frequency.value = 2800 + 1200 * sm.speed;
    g.windGain.gain.value = 0.045 + 0.05 * sm.speed + 0.10 * sm.sprint;
    g.windBP.Q.value = 0.7 + 0.5 * sm.sprint;
    g.rumbleGain.gain.value = 0.030 + 0.04 * sm.speed + 0.07 * sm.sprint;

    // --- footfalls, bell, creak
    this._footCool -= dt; this._bellCool -= dt; this._creakCool -= dt;
    if (moving && GAITS[gait]) this._feet(now, dt, s, gait, sm.speed);
    else this._prevPhase = (s.gaitPhase === undefined) ? null : (((s.gaitPhase % 1) + 1) % 1);

    // steering creak
    const st = s.steer || 0;
    if (Math.abs(st) > 0.6 && Math.abs(this._lastSteer) <= 0.6 && this._creakCool <= 0 && spd > 1) {
      this._creak(now, 0.9); this._creakCool = 1.4;
    }
    this._lastSteer = st;

    // --- breathing
    this._breathT -= dt;
    if (this._breathT <= 0) {
      if (gait === 'gallop' || sprint) { this._breath(now, 'huff'); this._breathT = rnd(0.34, 0.46); }
      else if (gait === 'trot') { this._breath(now, 'pant'); this._breathT = rnd(0.9, 1.2); }
      else if (gait === 'walk') { this._breath(now, 'walk'); this._breathT = rnd(2.0, 2.8); }
      else { this._breath(now, 'idle'); this._breathT = rnd(3.4, 5.0); }
    }
    // idle snort / blubber
    if (gait === 'idle') {
      this._snortT -= dt;
      if (this._snortT <= 0) { this._snort(now); this._snortT = rnd(9, 17); }
    } else if (this._snortT < 4) this._snortT = 4;

    // --- distant ambience
    this._ambT -= dt;
    if (this._ambT <= 0) {
      if (this._night > 0.5) { this._cricket(now); this._ambT = rnd(1.4, 3.6); }
      else { this._chirp(now); this._ambT = rnd(6, 16); }
    }

    // --- optional automatic events
    if (this.autoBump && s.lastBump && s.lastBump.t !== this._lastBumpT) {
      this._lastBumpT = s.lastBump.t;
      this.play('bump', { strength: s.lastBump.strength });
    }
    if (this.autoSprint && sprint && !this._prevSprint) this.play('sprint');
    this._prevSprint = sprint;
  }

  // ---- footfalls -------------------------------------------------------------------------------
  _feet(now, dt, s, gait, speedN) {
    if (s.gaitPhase === undefined || s.gaitPhase === null) return;
    const P = GAITS[gait];
    const p = ((s.gaitPhase % 1) + 1) % 1, prev = this._prevPhase;
    this._prevPhase = p;
    if (prev === null) return;
    let d = p - prev;
    if (d > 0.5) d -= 1; else if (d < -0.5) d += 1;
    const ad = Math.abs(d);
    if (ad < 1e-6 || ad > 0.4) return;
    let fired = 0;
    for (let i = 0; i < P.beats.length && fired < 3; i++) {
      const th = P.beats[i][0];
      const rel = d > 0 ? ((th - prev + 1) % 1) : ((prev - th + 1) % 1);
      if (rel > 0 && rel <= ad) {
        fired++;
        this._footfall(now + 0.004, gait, P.beats[i][1], speedN, i);
      }
    }
  }

  _footfall(t, gait, vel, speedN, leg) {
    const P = GAITS[gait];
    if (!this._reserve(1, t + 0.3, false)) return;
    const c = this._ctx, g = this._g;
    const v = P.vol * (0.55 + 0.45 * clamp(speedN, 0, 1)) * vel * rnd(0.85, 1.15);
    const end = t + P.dec * 2.2 + 0.05;
    // muffled noise thud
    const n = this._noise();
    const bp = this._bq('bandpass', P.bp * rnd(0.8, 1.25), 0.9);
    const ng = this._gn(0);
    this._env(ng.gain, t, 0.003, v * 0.55, P.dec);
    n.connect(bp); bp.connect(ng); ng.connect(g.foley);
    // sand grain hiss
    const hp = this._bq('highpass', 2400 * rnd(0.9, 1.2), 0.7);
    const hg = this._gn(0);
    this._env(hg.gain, t, 0.002, v * P.grain, 0.03);
    n.connect(hp); hp.connect(hg); hg.connect(g.foley);
    this._goNoise(n, t, end, bp, ng, hp, hg);
    // low body thump
    const o = this._osc('sine', P.f0 * rnd(0.85, 1.2), rnd(-30, 30));
    o.frequency.setValueAtTime(o.frequency.value, t);
    o.frequency.exponentialRampToValueAtTime(P.f1, t + 0.09);
    const og = this._gn(0);
    this._env(og.gain, t, 0.002, v * 0.75, P.dec * 1.1);
    o.connect(og); og.connect(g.foley);
    this._go(o, t, end, null, og);

    // bell on the halter rides the stride (only on some beats, gait dependent)
    if (this._bellCool <= 0) {
      const chance = gait === 'walk' ? (leg % 2 === 0 ? 0.8 : 0.2) : gait === 'trot' ? 0.85 : 0.75;
      if (Math.random() < chance) {
        const vv = 0.030 * (0.6 + 0.4 * clamp(speedN, 0, 1)) * rnd(0.7, 1.2);
        this._bell(t + rnd(0.004, 0.02), pick(BELL_NOTES) * rnd(0.995, 1.005), vv, rnd(0.25, 0.45));
        if (gait === 'gallop' && Math.random() < 0.5) this._bell(t + 0.045, pick(BELL_NOTES), vv * 0.6, 0.25);
        this._bellCool = gait === 'gallop' ? 0.07 : 0.14;
      }
    }
    // leather creak once in a while
    if (this._creakCool <= 0 && Math.random() < (gait === 'walk' ? 0.05 : gait === 'trot' ? 0.08 : 0.10)) {
      this._creak(t, rnd(0.5, 1));
      this._creakCool = rnd(0.9, 2.2);
    }
  }

  // ---- foley one-shots -------------------------------------------------------------------------
  _bell(t, f, vel, dur) {
    if (!this._reserve(1, t + dur + 0.1, false)) return;
    const c = this._ctx;
    const car = this._osc('sine', f);
    const mod = this._osc('sine', f * 3.51);
    const mg = this._gn(0);
    mg.gain.setValueAtTime(f * 1.8, t);
    mg.gain.exponentialRampToValueAtTime(f * 0.05, t + dur * 0.5);
    mod.connect(mg); mg.connect(car.frequency);
    const out = this._gn(0);
    this._env(out.gain, t, 0.001, vel, dur);
    car.connect(out); out.connect(this._g.foley);
    const vs = this._send(out, 0.5);
    const e = t + dur + 0.05;
    this._go(mod, t, e, null, mg);
    this._go(car, t, e, null, out, vs);
  }

  _creak(t, intensity) {
    if (!this._reserve(1, t + 0.5, false)) return;
    const dur = rnd(0.16, 0.34);
    const o = this._osc('sawtooth', rnd(78, 130));
    const f0 = o.frequency.value;
    o.frequency.setValueAtTime(f0, t);
    const steps = 5;
    for (let i = 1; i <= steps; i++) o.frequency.linearRampToValueAtTime(f0 * rnd(0.82, 1.22), t + (dur * i) / steps);
    const bp = this._bq('bandpass', rnd(650, 1100), 7);
    const gn = this._gn(0);
    gn.gain.setValueAtTime(0.0001, t);
    gn.gain.linearRampToValueAtTime(0.16 * intensity, t + dur * 0.25);
    gn.gain.linearRampToValueAtTime(0.10 * intensity, t + dur * 0.7);
    gn.gain.linearRampToValueAtTime(0.0001, t + dur);
    o.connect(bp); bp.connect(gn); gn.connect(this._g.foley);
    this._go(o, t, t + dur + 0.03, null, bp, gn);
  }

  /** Persistent noise->bandpass->gain path, shaped per breath; no node creation. */
  _breath(t, kind) {
    const g = this._g;
    let a, d, peak, f0, f1;
    switch (kind) {
      case 'huff': a = 0.05; d = 0.16; peak = 0.16; f0 = 700; f1 = 1100; break;
      case 'pant': a = 0.10; d = 0.32; peak = 0.11; f0 = 520; f1 = 850; break;
      case 'walk': a = 0.35; d = 0.75; peak = 0.075; f0 = 380; f1 = 620; break;
      default:     a = 0.55; d = 1.15; peak = 0.055; f0 = 300; f1 = 480; break;
    }
    peak *= rnd(0.85, 1.15);
    const gp = g.breathGain.gain, fp = g.breathBP.frequency;
    try {
      gp.cancelScheduledValues(t);
      gp.setValueAtTime(0.0001, t);
      gp.linearRampToValueAtTime(peak, t + a);
      gp.exponentialRampToValueAtTime(0.0001, t + a + d);
      fp.cancelScheduledValues(t);
      fp.setValueAtTime(f0, t);
      fp.linearRampToValueAtTime(f1, t + a);
      fp.linearRampToValueAtTime(f0 * 0.8, t + a + d);
    } catch (e) { /* ignore */ }
  }

  _snort(t) {
    if (!this._reserve(1, t + 0.7, false)) return;
    const dur = rnd(0.35, 0.55);
    const n = this._noise();
    const bp = this._bq('bandpass', 1900, 1.6);
    bp.frequency.setValueAtTime(1900, t);
    bp.frequency.exponentialRampToValueAtTime(650, t + dur * 0.8);
    const fl = this._gn(0.5);
    const lfo = this._osc('sine', rnd(26, 38));
    const lg = this._gn(0.5);
    lfo.connect(lg); lg.connect(fl.gain);
    const env = this._gn(0);
    this._env(env.gain, t, 0.015, 0.20, dur);
    n.connect(bp); bp.connect(fl); fl.connect(env); env.connect(this._g.foley);
    this._goNoise(n, t, t + dur + 0.1, bp, fl, lg, env);
    this._go(lfo, t, t + dur + 0.1, null, lg);
  }

  _chirp(t) {
    if (!this._reserve(1, t + 1, false)) return;
    const notes = 2 + ((Math.random() * 3) | 0);
    const o = this._osc('sine', 3000);
    const gn = this._gn(0.0001);
    let tt = t + rnd(0, 0.3);
    const base = rnd(2300, 3700);
    for (let i = 0; i < notes; i++) {
      const f0 = base * rnd(0.9, 1.15), f1 = f0 * rnd(0.72, 1.45);
      o.frequency.setValueAtTime(f0, tt);
      o.frequency.exponentialRampToValueAtTime(f1, tt + 0.07);
      gn.gain.setValueAtTime(0.0001, tt);
      gn.gain.linearRampToValueAtTime(0.020, tt + 0.012);
      gn.gain.exponentialRampToValueAtTime(0.0001, tt + 0.085);
      tt += rnd(0.10, 0.16);
    }
    o.connect(gn); gn.connect(this._g.amb);
    const vs = this._send(gn, 1.6);
    this._go(o, t, tt + 0.1, null, gn, vs);
  }

  _cricket(t) {
    if (!this._reserve(1, t + 1.2, false)) return;
    const o = this._osc('sine', rnd(4300, 4900));
    const gn = this._gn(0.0001);
    let tt = t + rnd(0, 0.2);
    const bursts = 2 + ((Math.random() * 2) | 0);
    for (let b = 0; b < bursts; b++) {
      for (let i = 0; i < 6; i++) {
        gn.gain.setValueAtTime(0.0001, tt);
        gn.gain.linearRampToValueAtTime(0.011, tt + 0.006);
        gn.gain.linearRampToValueAtTime(0.0001, tt + 0.016);
        tt += 0.024;
      }
      tt += 0.12;
    }
    o.connect(gn); gn.connect(this._g.amb);
    const vs = this._send(gn, 1.0);
    this._go(o, t, tt + 0.05, null, gn, vs);
  }

  // ---- named one-shots --------------------------------------------------------------------------
  play(name, opts = {}) {
    if (!this._ctx || !this._live()) return;
    const now = this._t();
    const gap = { click: 0.03, bump: 0.08, zoneEnter: 0.4, zoneLeave: 0.4, call: 0.5, collect: 0.05 }[name] || 0.06;
    if (now - (this._lastPlay[name] ?? -9) < gap) return;
    this._lastPlay[name] = now;
    const t = now + 0.005;
    try {
      switch (name) {
        case 'click': return this._click(t);
        case 'zoneEnter': return this._zoneEnter(t);
        case 'zoneLeave': return this._zoneLeave(t);
        case 'bump': return this._bump(t, clamp(opts.strength ?? 0.5, 0, 1));
        case 'call': return this._call(t);
        case 'sprint': return this._sprint(t);
        case 'collect': return this._collect(t);
        case 'panelOpen': return this._panel(t, true);
        case 'panelClose': return this._panel(t, false);
        case 'snort': return this._snort(t);
        default: return;
      }
    } catch (e) {
      if (typeof console !== 'undefined') console.warn('[audio] play(' + name + ') failed', e);
    }
  }

  /** Warm rounded mallet/pluck tone using a custom harmonic wave (+ a slightly detuned twin). */
  _mallet(t, f, vel, dur, dest, verb) {
    if (!this._reserve(1, t + dur + 0.1, true)) return;
    const out = this._gn(0);
    this._env(out.gain, t, 0.007, vel, dur);
    out.connect(dest || this._g.sfx);
    const e = t + dur + 0.05;
    const chain = [out];
    for (const det of [0, 6]) {
      const o = this._osc('sine', f, det);
      if (this._warm) o.setPeriodicWave(this._warm);
      const og = this._gn(det ? 0.5 : 0.8);
      o.connect(og); og.connect(out);
      this._go(o, t, e, null, og, out);
    }
    if (verb) { const vs = this._send(out, verb); chain.push(vs); }
  }

  _fmBell(t, f, vel, dur, dest, verb) {
    if (!this._reserve(1, t + dur + 0.1, true)) return;
    const car = this._osc('sine', f), mod = this._osc('sine', f * 3.51);
    const mg = this._gn(0);
    mg.gain.setValueAtTime(f * 2.2, t);
    mg.gain.exponentialRampToValueAtTime(f * 0.06, t + dur * 0.6);
    mod.connect(mg); mg.connect(car.frequency);
    const out = this._gn(0);
    this._env(out.gain, t, 0.002, vel, dur);
    car.connect(out); out.connect(dest || this._g.sfx);
    const vs = verb ? this._send(out, verb) : null;
    const e = t + dur + 0.05;
    this._go(mod, t, e, null, mg);
    this._go(car, t, e, null, out, vs);
  }

  _whoosh(t, dur, f0, f1, f2, peak, dest) {
    if (!this._reserve(1, t + dur + 0.1, true)) return;
    const n = this._noise();
    const bp = this._bq('bandpass', f0, 1.1);
    bp.frequency.setValueAtTime(f0, t);
    bp.frequency.exponentialRampToValueAtTime(f1, t + dur * 0.45);
    bp.frequency.exponentialRampToValueAtTime(f2, t + dur);
    const gn = this._gn(0);
    gn.gain.setValueAtTime(0.0001, t);
    gn.gain.linearRampToValueAtTime(peak, t + dur * 0.4);
    gn.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    n.connect(bp); bp.connect(gn); gn.connect(dest || this._g.sfx);
    this._goNoise(n, t, t + dur + 0.05, bp, gn);
  }

  _click(t) {
    if (!this._reserve(2, t + 0.15, true)) return;
    const f = rnd(700, 860);
    const o = this._osc('triangle', f);
    o.frequency.setValueAtTime(f, t);
    o.frequency.exponentialRampToValueAtTime(f * 0.62, t + 0.045);
    const gn = this._gn(0);
    this._env(gn.gain, t, 0.002, 0.20, 0.06);
    o.connect(gn); gn.connect(this._g.sfx);
    this._go(o, t, t + 0.12, null, gn);
    const n = this._noise(), hp = this._bq('highpass', 3200, 0.7), ng = this._gn(0);
    this._env(ng.gain, t, 0.001, 0.07, 0.012);
    n.connect(hp); hp.connect(ng); ng.connect(this._g.sfx);
    this._goNoise(n, t, t + 0.05, hp, ng);
  }

  _zoneEnter(t) {
    const F = { D4: 293.66, Eb4: 311.13, Fs4: 369.99, A4: 440.0, D5: 587.33, Fs5: 739.99 };
    const seqs = [
      [F.D4, F.Eb4, F.Fs4, F.A4, F.D5],
      [F.D4, F.Fs4, F.A4, F.D5, F.Fs5],
    ];
    const seq = pick(seqs);
    let tt = t;
    for (let i = 0; i < seq.length; i++) {
      const last = i === seq.length - 1;
      this._mallet(tt, seq[i] * rnd(0.998, 1.002), (0.16 + 0.03 * i) * rnd(0.9, 1.1), last ? 1.3 : 0.7, this._g.sfx, 0.55);
      tt += (last ? 0 : 0.072) + rnd(-0.006, 0.006);
    }
    this._fmBell(t + 0.30, 1174.66, 0.035, 1.2, this._g.sfx, 0.8);
  }

  _zoneLeave(t) {
    const seq = [440.0, 392.0, 369.99, 293.66];
    let tt = t;
    for (let i = 0; i < seq.length; i++) {
      this._mallet(tt, seq[i] * rnd(0.998, 1.002), (0.13 - 0.012 * i) * rnd(0.9, 1.1), 0.55 + 0.2 * i, this._g.sfx, 0.5);
      tt += 0.095 + rnd(-0.008, 0.008);
    }
  }

  _bump(t, s) {
    if (!this._reserve(3, t + 0.6, true)) return;
    const g = this._g, vol = 0.22 + 0.7 * s;
    const o = this._osc('sine', rnd(115, 145) * (1.1 - 0.3 * s));
    o.frequency.setValueAtTime(o.frequency.value, t);
    o.frequency.exponentialRampToValueAtTime(40, t + 0.18);
    const og = this._gn(0);
    this._env(og.gain, t, 0.003, vol * 0.9, 0.16 + 0.24 * s);
    o.connect(og); og.connect(g.sfx);
    this._go(o, t, t + 0.6, null, og);
    const n = this._noise(), bp = this._bq('bandpass', 520 - 160 * s, 0.8), ng = this._gn(0);
    this._env(ng.gain, t, 0.002, vol * 0.7, 0.10 + 0.10 * s);
    n.connect(bp); bp.connect(ng); ng.connect(g.sfx);
    this._goNoise(n, t, t + 0.4, bp, ng);
    if (s > 0.55) { // debris / rattle
      const n2 = this._noise(), hp = this._bq('highpass', 2000, 0.8), hg = this._gn(0);
      this._env(hg.gain, t + 0.01, 0.004, 0.10 * s, 0.14);
      n2.connect(hp); hp.connect(hg); hg.connect(g.sfx);
      this._goNoise(n2, t, t + 0.4, hp, hg);
    }
    if (s > 0.3) { // halter bell shakes
      const k = s > 0.6 ? 3 : 2;
      for (let i = 0; i < k; i++) this._bell(t + 0.03 + i * rnd(0.04, 0.07), pick(BELL_NOTES), 0.05 + 0.05 * s, 0.4);
    }
  }

  _collect(t) {
    const pairs = [[880.0, 1174.66], [1174.66, 1479.98], [987.77, 1318.51]];
    const [a, b] = pick(pairs);
    this._fmBell(t, a * rnd(0.998, 1.002), 0.14, 0.55, this._g.sfx, 0.5);
    this._fmBell(t + 0.075, b * rnd(0.998, 1.002), 0.15, 0.9, this._g.sfx, 0.6);
    // sparkle
    if (this._reserve(1, t + 0.5, true)) {
      const n = this._noise(), hp = this._bq('highpass', 7000, 0.7), ng = this._gn(0);
      this._env(ng.gain, t + 0.07, 0.005, 0.03, 0.2);
      n.connect(hp); hp.connect(ng); ng.connect(this._g.sfx);
      this._goNoise(n, t, t + 0.5, hp, ng);
    }
  }

  _panel(t, open) {
    if (open) {
      this._whoosh(t, 0.30, 350, 1500, 2300, 0.11, this._g.sfx);
      this._mallet(t + 0.02, 440.0, 0.13, 0.45, this._g.sfx, 0.5);
      this._mallet(t + 0.11, 587.33, 0.14, 0.75, this._g.sfx, 0.6);
    } else {
      this._whoosh(t, 0.28, 1900, 1100, 300, 0.09, this._g.sfx);
      this._mallet(t + 0.01, 587.33, 0.11, 0.35, this._g.sfx, 0.4);
      this._mallet(t + 0.09, 440.0, 0.11, 0.55, this._g.sfx, 0.5);
    }
  }

  _sprint(t) {
    this._whoosh(t, 0.7, 300, 2600, 900, 0.16, this._g.sfx);
    if (!this._reserve(3, t + 0.5, true)) return;
    // "hup!" — a short voiced shout through two formants + breath
    const f = rnd(185, 215);
    const dur = 0.17;
    const o1 = this._osc('sawtooth', f), o2 = this._osc('sawtooth', f, 8);
    for (const o of [o1, o2]) {
      o.frequency.setValueAtTime(f, t + 0.03);
      o.frequency.linearRampToValueAtTime(f * 1.4, t + 0.03 + dur * 0.5);
      o.frequency.linearRampToValueAtTime(f * 1.15, t + 0.03 + dur);
    }
    const sum = this._gn(1);
    o1.connect(sum); o2.connect(sum);
    const out = this._gn(0);
    this._env(out.gain, t + 0.03, 0.015, 0.95, dur);
    const f1 = this._bq('bandpass', 720, 3.5), f2 = this._bq('bandpass', 1250, 4);
    const g2 = this._gn(0.7);
    sum.connect(f1); f1.connect(out); sum.connect(f2); f2.connect(g2); g2.connect(out);
    out.connect(this._g.sfx);
    const e = t + 0.03 + dur + 0.1;
    this._go(o1, t, e, null, sum, f1, f2, g2, out);
    this._go(o2, t, e, null);
    const n = this._noise(), nb = this._bq('bandpass', 1500, 0.9), ng = this._gn(0);
    this._env(ng.gain, t + 0.03, 0.01, 0.10, 0.12);
    n.connect(nb); nb.connect(ng); ng.connect(this._g.sfx);
    this._goNoise(n, t, e, nb, ng);
  }

  /** Camel groan: pitch glide + "voice crack", vibrato, growl AM, formant sweep, breath and a lip-blubber tail. */
  _call(t) {
    if (!this._reserve(6, t + 1.7, true)) return;
    const g = this._g, r = rnd(0.9, 1.13);
    const dur = rnd(1.25, 1.5);
    const e = t + dur + 0.15;
    const pitch = (o) => {
      o.frequency.setValueAtTime(92 * r, t);
      o.frequency.linearRampToValueAtTime(150 * r, t + 0.12);
      o.frequency.linearRampToValueAtTime(215 * r, t + 0.36);
      o.frequency.linearRampToValueAtTime(205 * r, t + 0.52);
      o.frequency.setValueAtTime(205 * r, t + 0.54);
      o.frequency.linearRampToValueAtTime(300 * r, t + 0.58); // the comic crack
      o.frequency.linearRampToValueAtTime(160 * r, t + 0.75);
      o.frequency.linearRampToValueAtTime(64 * r, t + dur);
    };
    const o1 = this._osc('sawtooth', 100), o2 = this._osc('sawtooth', 100, 11);
    pitch(o1); pitch(o2);
    // vibrato growing over time
    const vib = this._osc('sine', 6.3), vg = this._gn(0);
    vg.gain.setValueAtTime(1, t);
    vg.gain.linearRampToValueAtTime(3, t + 0.4);
    vg.gain.linearRampToValueAtTime(14, t + dur);
    vib.connect(vg); vg.connect(o1.frequency); vg.connect(o2.frequency);
    // growl amplitude modulation
    const am = this._gn(0.62), amL = this._osc('sine', 34), amG = this._gn(0.38);
    amL.connect(amG); amG.connect(am.gain);
    const src = this._gn(1);
    o1.connect(src); o2.connect(src);
    src.connect(am);
    // breath noise mixed in
    const nz = this._noise(), nzg = this._gn(0.35);
    nz.connect(nzg); nzg.connect(am);
    // formants
    const F1 = this._bq('bandpass', 380, 5), F2 = this._bq('bandpass', 900, 6), F3 = this._bq('bandpass', 2500, 8);
    const sw = (f, pts) => {
      f.frequency.setValueAtTime(pts[0][1], t);
      for (const [dt, v] of pts) f.frequency.linearRampToValueAtTime(v, t + dt * dur);
    };
    sw(F1, [[0, 380], [0.12, 650], [0.3, 800], [0.45, 700], [0.7, 520], [1, 380]]);
    sw(F2, [[0, 900], [0.12, 1150], [0.3, 1250], [0.45, 1400], [0.7, 1000], [1, 800]]);
    const g1 = this._gn(1.4), g2 = this._gn(1.0), g3 = this._gn(0.5);
    am.connect(F1); F1.connect(g1);
    am.connect(F2); F2.connect(g2);
    am.connect(F3); F3.connect(g3);
    const out = this._gn(0);
    out.gain.setValueAtTime(0.0001, t);
    out.gain.linearRampToValueAtTime(1.0, t + 0.09);
    out.gain.linearRampToValueAtTime(0.85, t + dur * 0.7);
    out.gain.linearRampToValueAtTime(0.0001, t + dur);
    g1.connect(out); g2.connect(out); g3.connect(out);
    out.connect(g.sfx);
    this._send(out, 0.25);
    this._go(o1, t, e, null, src, am, nzg, F1, F2, F3, g1, g2, g3, out);
    this._go(o2, t, e, null);
    this._go(vib, t, e, null, vg);
    this._go(amL, t, e, null, amG);
    this._goNoise(nz, t, e);
    // lip blubber tail: noise fluttering at ~25 Hz
    const bt = t + dur - 0.05;
    const bn = this._noise(), bb = this._bq('bandpass', 260, 1.2), bf = this._gn(0.5);
    const bl = this._osc('sine', 24), blg = this._gn(0.5);
    bl.connect(blg); blg.connect(bf.gain);
    const bo = this._gn(0);
    this._env(bo.gain, bt, 0.02, 0.28, 0.25);
    bn.connect(bb); bb.connect(bf); bf.connect(bo); bo.connect(g.sfx);
    this._goNoise(bn, bt, bt + 0.4, bb, bf, bo);
    this._go(bl, bt, bt + 0.4, null, blg);
  }

  // ---- generative music --------------------------------------------------------------------------
  _startMusic() {
    if (this._musicOn || !this._ctx || !this._g) return;
    this._musicOn = true;
    const now = this._t();
    this._nextT = now + 0.12;
    this._stepIdx = 0;
    this._pbar = 0;
    this._barNo = 0;
    this._startDrone(now);
    if (!this._offline) {
      this._pumpTimer = setInterval(() => this._pump(), 25);
    }
  }

  _stopMusic() {
    if (!this._musicOn) return;
    this._musicOn = false;
    this._stopPump();
    this._stopDrone();
  }
  _stopPump() { if (this._pumpTimer) { clearInterval(this._pumpTimer); this._pumpTimer = null; } }

  _startDrone(t) {
    const c = this._ctx, g = this._g;
    const out = this._gn(0.0001);
    out.gain.setValueAtTime(0.0001, t);
    out.gain.linearRampToValueAtTime(0.085, t + 3.5);
    const lp = this._bq('lowpass', 330, 0.6);
    lp.connect(out); out.connect(g.musicBus);
    const parts = [
      ['sawtooth', D2, 0.5, 0], ['sawtooth', D2, 0.5, 7], ['sawtooth', A2, 0.26, -4],
      ['triangle', D2 * 2, 0.35, 0], ['sine', D2 / 2, 0.5, 0],
    ];
    const oscs = [];
    for (const [type, f, lvl, det] of parts) {
      const o = this._osc(type, f, det), og = this._gn(lvl);
      o.connect(og); og.connect(lp);
      o.start(t); oscs.push(o);
      this._stats.persistent++;
    }
    const lfo = this._osc('sine', 0.055), lg = this._gn(110);
    lfo.connect(lg); lg.connect(lp.frequency); lfo.start(t);
    const alfo = this._osc('sine', 0.09), ag = this._gn(0.012);
    alfo.connect(ag); ag.connect(out.gain); alfo.start(t);
    this._stats.persistent += 2;
    this._drone = { out, lp, oscs: oscs.concat([lfo, alfo]) };
  }

  _stopDrone() {
    const d = this._drone;
    if (!d) return;
    this._drone = null;
    const now = this._t();
    try {
      d.out.gain.cancelScheduledValues(now);
      d.out.gain.setValueAtTime(d.out.gain.value, now);
      d.out.gain.linearRampToValueAtTime(0.0001, now + 0.6);
    } catch (e) { /* ignore */ }
    for (const o of d.oscs) { try { o.stop(now + 0.7); } catch (e) { /* ignore */ } this._stats.persistent--; }
    setTimeout(() => { try { d.out.disconnect(); } catch (e) { /* ignore */ } }, 1200);
  }

  /** Lookahead scheduler; called from setInterval(25ms) live, or manually when rendering offline. */
  _pump() {
    if (!this._musicOn || !this._ctx || this._disposed) return;
    if (!this._live()) { this._nextT = Math.max(this._nextT, this._t() + 0.05); return; }
    const now = this._t();
    const stepDur = 60 / this._bpm / 4;
    if (this._nextT < now - 0.3) this._nextT = now + 0.05; // throttled tab / long stall: skip ahead, no burst
    while (this._nextT < now + 0.16) {
      this._step(this._stepIdx, this._nextT);
      this._nextT += stepDur;
      this._stepIdx = (this._stepIdx + 1) & 15;
    }
  }

  _step(i, t) {
    if (i === 0) this._genBar();
    const ev = this._bar[i];
    if (ev) for (const e of ev) this._playNote(e, t);
    this._drums(i, t);
  }

  // Random walk over the Hijaz scale with phrase structure: motif / answer / lift / cadence (+ optional rest bar)
  _walk(from, n, bias) {
    const out = [];
    let d = from;
    const steps = [-2, -1, -1, 0, 1, 1, 2, 3, -3];
    for (let i = 0; i < n; i++) {
      let s = pick(steps);
      if (bias) s += bias > 0 ? (Math.random() < 0.35 ? 1 : 0) : (Math.random() < 0.35 ? -1 : 0);
      d += s;
      if (d > 13) d -= 3; if (d < 1) d += 3;
      out.push(d);
    }
    return out;
  }

  _genBar() {
    const bar = new Array(16).fill(null);
    this._bar = bar;
    const stepDur = 60 / this._bpm / 4;
    const I = this._inten;
    const pb = this._pbar;
    this._fill = pb === 3;
    const put = (step, ev) => { (bar[step] || (bar[step] = [])).push(ev); };
    // bass: tonic on 1, tonic/fifth on 3
    put(0, { bass: D2, vel: 0.42 });
    put(8, { bass: Math.random() < 0.4 ? A2 : D2, vel: 0.34 });

    if (pb < 4) {
      let cell, degs;
      if (pb === 0) {
        cell = this._cell = pick(CELLS);
        degs = this._motif = this._walk(this._deg, cell.length, 0);
        // downbeat notes lean to tonic/fifth (D, A)
        degs[0] = this._nearestStable(degs[0]);
      } else if (pb === 1) {
        cell = this._cell;
        const shift = pick([-2, -1, 1, 2]);
        degs = this._motif.map((d, i) => clamp(d + shift + (Math.random() < 0.25 ? pick([-1, 1]) : 0), 1, 13));
        degs[degs.length - 1] = this._nearestStable(degs[degs.length - 1]);
      } else if (pb === 2) {
        cell = pick(CELLS);
        degs = this._walk(clamp(this._motif[0] + pick([2, 3, 4]), 4, 12), cell.length, 1);
      } else {
        cell = pick(CADENCES);
        // walk down toward a resting tone (tonic D4/D3-ish or fifth A)
        const target = pick([7, 7, 0 + 7, 4 + 7 > 13 ? 4 : 11 - 7 + 0, 4]);
        const tgt = clamp(target, 0, 9);
        degs = [];
        let d = this._deg;
        for (let i = 0; i < cell.length; i++) {
          const remaining = cell.length - 1 - i;
          if (remaining === 0) d = tgt;
          else d += clamp(Math.round((tgt - d) / (remaining + 1)) + pick([-1, 0, 1]), -3, 3);
          d = clamp(d, 0, 13);
          degs.push(d);
        }
      }
      let notes = cell.map(([step, len], i) => ({ step, len, deg: degs[i], vel: (step % 4 === 0 ? 0.62 : 0.48) * rnd(0.9, 1.1) }));
      // higher intensity: split long notes with passing tones
      const split = [];
      for (const n of notes) {
        if (n.len >= 4 && Math.random() < 0.55 * I) {
          const h = n.len >> 1;
          split.push({ ...n, len: h }, { step: n.step + h, len: n.len - h, deg: clamp(n.deg + pick([-1, 1]), 0, 13), vel: n.vel * 0.85 });
        } else split.push(n);
      }
      notes = split;
      // ornaments
      for (const n of notes) {
        if (n.len >= 2 && Math.random() < 0.18) n.orn = 'mordent';
      }
      if (pb === 3) {
        const last = notes[notes.length - 1];
        last.trem = Math.random() < 0.6;
        last.vel = 0.62;
      }
      for (const n of notes) put(n.step, n);
      this._deg = notes[notes.length - 1].deg;
    }
    this._pbar++;
    if (this._pbar >= 4) {
      // after a phrase: maybe a bar of rest (drone + drums breathe)
      this._pbar = Math.random() < 0.4 && this._pbar === 4 && !this._restBar ? 4 : 0;
      this._restBar = this._pbar === 4;
      if (this._pbar === 4 && this._restBar) { /* next bar is rest: pbar 4 => no melody */ } else this._restBar = false;
    } else this._restBar = false;
    this._barNo++;
    void stepDur;
  }

  _nearestStable(d) { // scale indices whose degree is D (0) or A (4)
    let best = d, bd = 99;
    for (let x = Math.max(0, d - 3); x <= Math.min(13, d + 3); x++) {
      const m = x % 7;
      if ((m === 0 || m === 4) && Math.abs(x - d) < bd) { bd = Math.abs(x - d); best = x; }
    }
    return Math.random() < 0.65 ? best : d;
  }

  _playNote(e, t) {
    const stepDur = 60 / this._bpm / 4;
    const I = this._inten;
    if (e.bass) { this._pluck(t + rnd(0, 0.006), e.bass, e.vel, true); return; }
    const tt = t + rnd(0, 0.012);
    const f = degHz(e.deg);
    const vel = e.vel * (0.85 + 0.25 * I);
    if (e.orn === 'mordent') this._pluck(tt - 0.055, degHz(e.deg + 1), vel * 0.55, false);
    this._pluck(tt, f, vel, false);
    if (e.trem) {
      const n = 5;
      for (let i = 1; i <= n; i++) this._pluck(tt + i * 0.075 + 0.1, f, vel * (0.75 - i * 0.08), false);
    } else if (e.len >= 6 && Math.random() < 0.3) {
      // little re-pluck sustain
      this._pluck(tt + stepDur * (e.len - 2), f, vel * 0.5, false);
    }
  }

  /** Karplus-Strong string rendered once per pitch and cached, played back through the shared pluck bus. */
  _ks(freq, bass) {
    const c = this._ctx, sr = c.sampleRate;
    const N = Math.max(2, Math.round(sr / freq - 0.5));
    const key = (bass ? 'b' : 'm') + N;
    let e = this._ksCache.get(key);
    if (e) return e;
    const t60 = bass ? 2.2 : 1.5;
    const L = Math.floor(sr * (bass ? 2.2 : 1.6));
    const buf = c.createBuffer(1, L, sr), d = buf.getChannelData(0);
    // excitation: soft-pick noise, pick-position comb
    let lp = 0;
    const soft = bass ? 0.25 : 0.5;
    for (let i = 0; i < N; i++) { lp += ((Math.random() * 2 - 1) - lp) * soft; d[i] = lp; }
    const pp = Math.max(1, Math.floor(N * 0.18));
    const tmp = d.slice(0, N);
    for (let i = 0; i < N; i++) d[i] = tmp[i] - 0.6 * tmp[(i - pp + N) % N];
    const fEff = sr / (N + 0.5);
    const decay = Math.pow(0.001, 1 / (fEff * t60));
    const a = bass ? 0.5 : 0.56;
    for (let i = N; i < L; i++) d[i] = decay * (a * d[i - N] + (1 - a) * d[i - N - 1 < 0 ? 0 : i - N - 1]);
    let pk = 0;
    for (let i = 0; i < L; i++) { const v = Math.abs(d[i]); if (v > pk) pk = v; }
    const nrm = 0.9 / (pk || 1), fade = Math.floor(L * 0.12);
    for (let i = 0; i < L; i++) d[i] *= nrm * (i > L - fade ? (L - i) / fade : 1);
    e = { buf, rate: freq / fEff, dur: L / sr };
    this._ksCache.set(key, e);
    if (this._ksCache.size > 44) this._ksCache.delete(this._ksCache.keys().next().value);
    return e;
  }

  _pluck(t, freq, vel, bass) {
    if (!this._reserve(1, t + 1.6, true)) return;
    const c = this._ctx, e = this._ks(freq, bass);
    const gn = this._gn(vel * (bass ? 0.9 : 0.75));
    gn.connect(bass ? this._g.musicBus : this._g.pluckIn);
    const n = bass ? 1 : 2; // oud courses are doubled
    for (let i = 0; i < n; i++) {
      const s = c.createBufferSource();
      s.buffer = e.buf;
      s.playbackRate.value = e.rate * (i ? 1 + rnd(0.0008, 0.003) : 1);
      const sg = i ? this._gn(0.6) : gn;
      if (i) { s.connect(sg); sg.connect(gn); } else s.connect(gn);
      this._go(s, t + i * 0.004, t + i * 0.004 + e.dur / e.rate, null, i ? sg : gn);
    }
  }

  // maqsum: D T . T | D . T .  (dum/tek on eighths), ghost ka notes and fills on the 16th grid
  _drums(i, t) {
    const I = this._inten, pb = this._pbar; // note: pbar already advanced for next bar
    const j = () => rnd(0, 0.004);
    switch (i) {
      case 0: case 8: this._dum(t + j(), 1); break;
      case 2: case 6: case 12: this._tek(t + j(), i === 6 ? 0.85 : 1); break;
      case 3: if ((this._barNo & 1) && Math.random() < 0.3) this._dum(t + j(), 0.45); break;
      case 5: if (Math.random() < 0.25 + 0.3 * I) this._ka(t + j(), 0.6); break;
      case 10: if (Math.random() < 0.5) this._ka(t + j(), 0.5); break;
      case 13: case 15: if (Math.random() < 0.3 + 0.4 * I) this._ka(t + j(), 0.55); break;
      default: break;
    }
    if (this._fill && i >= 12) this._tek(t + j(), 0.55 + 0.1 * (i - 12));
    if (I > 0.25 && (i & 1)) this._shaker(t + j(), 0.35 + 0.65 * I);
  }

  _dum(t, v) {
    if (!this._reserve(2, t + 0.5, true)) return;
    const g = this._g, I = this._inten;
    const o = this._osc('sine', 150);
    o.frequency.setValueAtTime(150, t);
    o.frequency.exponentialRampToValueAtTime(58, t + 0.12);
    const og = this._gn(0);
    this._env(og.gain, t, 0.002, 0.60 * v * (0.85 + 0.3 * I), 0.30);
    o.connect(og); og.connect(g.drumIn);
    this._go(o, t, t + 0.5, null, og);
    const n = this._noise(), lp = this._bq('lowpass', 320, 0.7), ng = this._gn(0);
    this._env(ng.gain, t, 0.002, 0.16 * v, 0.07);
    n.connect(lp); lp.connect(ng); ng.connect(g.drumIn);
    this._goNoise(n, t, t + 0.2, lp, ng);
  }

  _tek(t, v) {
    if (!this._reserve(2, t + 0.2, true)) return;
    const g = this._g, I = this._inten;
    const n = this._noise(), bp = this._bq('bandpass', rnd(2900, 3500), 1.3), ng = this._gn(0);
    this._env(ng.gain, t, 0.001, 0.25 * v * (0.85 + 0.3 * I), 0.05);
    n.connect(bp); bp.connect(ng); ng.connect(g.drumIn);
    this._goNoise(n, t, t + 0.15, bp, ng);
    const o = this._osc('triangle', 1250);
    o.frequency.setValueAtTime(1250, t);
    o.frequency.exponentialRampToValueAtTime(820, t + 0.035);
    const og = this._gn(0);
    this._env(og.gain, t, 0.001, 0.075 * v, 0.05);
    o.connect(og); og.connect(g.drumIn);
    this._go(o, t, t + 0.15, null, og);
  }

  _ka(t, v) {
    if (!this._reserve(1, t + 0.1, true)) return;
    const n = this._noise(), bp = this._bq('bandpass', rnd(2100, 2500), 1.2), ng = this._gn(0);
    this._env(ng.gain, t, 0.001, 0.11 * v, 0.035);
    n.connect(bp); bp.connect(ng); ng.connect(this._g.drumIn);
    this._goNoise(n, t, t + 0.1, bp, ng);
  }

  _shaker(t, v) {
    if (!this._reserve(1, t + 0.08, true)) return;
    const n = this._noise(), hp = this._bq('highpass', 6500, 0.7), ng = this._gn(0);
    this._env(ng.gain, t, 0.002, 0.045 * v, 0.03);
    n.connect(hp); hp.connect(ng); ng.connect(this._g.drumIn);
    this._goNoise(n, t, t + 0.1, hp, ng);
  }
}

export default GameAudio;
