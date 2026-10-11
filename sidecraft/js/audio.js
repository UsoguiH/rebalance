// Audio: every sound is synthesized with the Web Audio API. Includes a quiet
// generative piano that plays now and then, in the spirit of the original.
(function () {
  const SC = window.SC;
  let ctx = null, master = null, sfxBus = null, musicBus = null, noise = null, verb = null;
  const A = (SC.audio = { muted: false, musicOn: true });

  A.unlock = () => {
    if (ctx) {
      if (ctx.state === 'suspended') ctx.resume();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = A.muted ? 0 : 0.7;
    master.connect(ctx.destination);
    sfxBus = ctx.createGain();
    sfxBus.gain.value = 0.8;
    sfxBus.connect(master);
    musicBus = ctx.createGain();
    musicBus.gain.value = 0.35;
    // feedback delay as a cheap reverb for the piano
    const d = ctx.createDelay(1);
    d.delayTime.value = 0.33;
    const fb = ctx.createGain();
    fb.gain.value = 0.38;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 2200;
    musicBus.connect(master);
    musicBus.connect(d);
    d.connect(lp);
    lp.connect(fb);
    fb.connect(d);
    lp.connect(master);
    verb = musicBus;
    A.applyVolumes();
    noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const ch = noise.getChannelData(0);
    for (let i = 0; i < ch.length; i++) ch[i] = Math.random() * 2 - 1;
    A.musicT = 20;
  };
  A.setMuted = (m) => {
    A.muted = m;
    A.applyVolumes();
  };

  function burst(dur, type, freq, q, vol, when = 0, sweepTo) {
    const t = ctx.currentTime + when;
    const src = ctx.createBufferSource();
    src.buffer = noise;
    src.playbackRate.value = 0.8 + Math.random() * 0.4;
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.setValueAtTime(freq, t);
    if (sweepTo) f.frequency.exponentialRampToValueAtTime(sweepTo, t + dur);
    f.Q.value = q;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(f);
    f.connect(g);
    g.connect(sfxBus);
    src.start(t, Math.random() * 0.5);
    src.stop(t + dur + 0.05);
  }
  function tone(freq, dur, type, vol, when = 0, slideTo, bus) {
    const t = ctx.currentTime + when;
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g);
    g.connect(bus || sfxBus);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  const MAT = {
    stone: ['bandpass', 1400, 1.2],
    dirt: ['lowpass', 700, 1],
    grass: ['highpass', 2200, 0.7],
    sand: ['highpass', 3200, 0.5],
    wood: ['bandpass', 650, 3],
    glass: ['highpass', 4000, 2],
    wool: ['lowpass', 500, 0.5],
  };

  const S = {
    dig(o) {
      const m = MAT[o.mat] || MAT.stone;
      burst(0.09, m[0], m[1], m[2], 0.35 * o.v);
      if (o.mat === 'wood') tone(180 + Math.random() * 40, 0.05, 'triangle', 0.15 * o.v);
    },
    break(o) {
      const m = MAT[o.mat] || MAT.stone;
      burst(0.22, m[0], m[1] * 0.9, m[2], 0.6 * o.v);
      burst(0.12, m[0], m[1] * 1.3, m[2], 0.3 * o.v, 0.05);
      if (o.mat === 'glass') for (let i = 0; i < 4; i++) tone(2400 + Math.random() * 2000, 0.15, 'sine', 0.06 * o.v, i * 0.03);
    },
    place(o) {
      const m = MAT[o.mat] || MAT.stone;
      burst(0.1, m[0], m[1] * 0.8, m[2], 0.5 * o.v);
    },
    step(o) {
      const m = MAT[o.mat] || MAT.stone;
      burst(0.06, m[0], m[1], m[2], 0.12 * o.v);
    },
    pop(o) {
      tone(500 + Math.random() * 300, 0.08, 'sine', 0.2 * o.v, 0, 1100);
    },
    hurt(o) {
      tone(240, 0.18, 'square', 0.14 * o.v, 0, 120);
      burst(0.1, 'lowpass', 800, 1, 0.2 * o.v);
    },
    fall(o) {
      burst(0.2, 'lowpass', 300, 1, 0.5 * o.v);
    },
    mobHurt(o) {
      const p = { zombie: 140, skeleton: 600, creeper: 300, pig: 420, sheep: 520 }[o.kind] || 300;
      tone(p, 0.16, o.kind === 'skeleton' ? 'square' : 'sawtooth', 0.12 * o.v, 0, p * 0.6);
      if (o.kind === 'skeleton') burst(0.1, 'highpass', 3000, 3, 0.2 * o.v);
    },
    mobDie(o) {
      S.mobHurt(o);
      burst(0.4, 'lowpass', 500, 1, 0.25 * o.v, 0.05, 120);
    },
    say(o) {
      const v = o.v;
      if (o.kind === 'pig') {
        tone(360, 0.12, 'sawtooth', 0.08 * v, 0, 300);
        tone(330, 0.14, 'sawtooth', 0.08 * v, 0.14, 260);
      } else if (o.kind === 'sheep') {
        const t = ctx.currentTime;
        const osc = ctx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.value = 480;
        const lfo = ctx.createOscillator();
        lfo.frequency.value = 18;
        const lg = ctx.createGain();
        lg.gain.value = 30;
        lfo.connect(lg);
        lg.connect(osc.frequency);
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(0.07 * v, t + 0.05);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
        const f = ctx.createBiquadFilter();
        f.frequency.value = 1500;
        osc.connect(f);
        f.connect(g);
        g.connect(sfxBus);
        osc.start(t);
        lfo.start(t);
        osc.stop(t + 0.55);
        lfo.stop(t + 0.55);
      } else if (o.kind === 'zombie') {
        tone(95, 0.7, 'sawtooth', 0.1 * v, 0, 70);
        tone(100, 0.6, 'sawtooth', 0.06 * v, 0.05, 80);
      } else if (o.kind === 'skeleton') {
        for (let i = 0; i < 4; i++) burst(0.04, 'bandpass', 2500, 4, 0.18 * v, i * 0.07);
      }
    },
    explode(o) {
      burst(1.4, 'lowpass', 1200, 0.7, 1.0 * o.v, 0, 60);
      tone(70, 0.8, 'sine', 0.6 * o.v, 0, 30);
    },
    fuse(o) {
      burst(1.4, 'highpass', 3000, 0.5, 0.25 * o.v);
    },
    fizz(o) {
      burst(0.5, 'highpass', 2500, 0.5, 0.2 * o.v);
    },
    eat(o) {
      burst(0.08, 'bandpass', 1200, 2, 0.25 * o.v);
    },
    burp(o) {
      tone(140, 0.25, 'sawtooth', 0.08 * o.v, 0, 90);
    },
    splash(o) {
      burst(0.35, 'lowpass', 1500, 0.6, 0.35 * o.v, 0, 300);
    },
    door(o) {
      tone(210, 0.12, 'triangle', 0.15 * o.v, 0, 160);
      burst(0.08, 'bandpass', 500, 3, 0.25 * o.v);
    },
    bow(o) {
      burst(0.15, 'bandpass', 900, 2, 0.3 * o.v, 0, 2500);
    },
    arrowHit(o) {
      burst(0.06, 'bandpass', 1800, 3, 0.2 * o.v);
    },
    click(o) {
      tone(900, 0.03, 'square', 0.05 * o.v);
    },
    toolBreak(o) {
      burst(0.3, 'highpass', 2500, 2, 0.4 * o.v);
      tone(700, 0.2, 'square', 0.08 * o.v, 0, 200);
    },
    orb(o) {
      tone(1400 + Math.random() * 900, 0.12, 'sine', 0.08 * o.v);
    },
    levelUp(o) {
      [523, 659, 784].forEach((f, i) => tone(f, 0.3, 'triangle', 0.1 * o.v, i * 0.08));
    },
  };

  const CAT = {
    dig: 'blocks', break: 'blocks', place: 'blocks', step: 'blocks', fizz: 'blocks', explode: 'blocks', door: 'blocks', splash: 'blocks',
    fuse: 'hostile', click: 'master',
  };
  const category = (name, o) => {
    if (CAT[name]) return CAT[name];
    if (o.kind) return o.kind === 'pig' || o.kind === 'sheep' ? 'friendly' : 'hostile';
    return 'players';
  };
  A.play = (name, o = {}) => {
    if (!ctx || A.muted || !S[name]) return;
    const opt = SC.options || {};
    const cat = category(name, o);
    const cv = cat === 'master' ? 1 : opt[cat] === undefined ? 1 : opt[cat];
    o.v = (o.v === undefined ? 1 : o.v) * cv;
    if (o.v <= 0.001) return;
    S[name](o);
  };
  A.applyVolumes = () => {
    if (!ctx) return;
    const opt = SC.options || {};
    master.gain.value = A.muted ? 0 : 0.7 * (opt.master === undefined ? 1 : opt.master);
    musicBus.gain.value = 0.35 * (opt.music === undefined ? 1 : opt.music);
  };
  // positional: quieter with distance from the player
  A.at = (name, x, y, o = {}) => {
    const p = SC.game && SC.game.player;
    let v = 1;
    if (p && x !== undefined) {
      const d = Math.hypot(p.x - x, p.y - y);
      v = SC.clamp(1 - d / 28, 0, 1);
      if (!v) return;
    }
    A.play(name, Object.assign(o, { v: (o.v || 1) * v }));
  };

  // ---------- music ----------
  const SCALES = [
    [0, 2, 4, 7, 9],
    [0, 3, 5, 7, 10],
    [0, 2, 4, 7, 11],
  ];
  function piano(f, when, vol) {
    const t = ctx.currentTime + when;
    for (const [mul, v, type] of [[1, 1, 'triangle'], [2, 0.3, 'sine'], [3, 0.08, 'sine']]) {
      const o = ctx.createOscillator();
      o.type = type;
      o.frequency.value = f * mul;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol * v, t + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 2.6 / mul);
      o.connect(g);
      g.connect(verb);
      o.start(t);
      o.stop(t + 2.8);
    }
  }
  function phrase() {
    const sc = SCALES[(Math.random() * SCALES.length) | 0];
    const root = 196 * Math.pow(2, ((Math.random() * 5) | 0) / 12);
    const note = (deg, oct) => root * Math.pow(2, oct + sc[((deg % 5) + 5) % 5] / 12 + Math.floor(deg / 5));
    let t = 0;
    let deg = (Math.random() * 5) | 0;
    const n = 14 + ((Math.random() * 10) | 0);
    for (let i = 0; i < n; i++) {
      deg += [-2, -1, -1, 1, 1, 2, 0][(Math.random() * 7) | 0];
      deg = SC.clamp(deg, -3, 8);
      piano(note(deg, 0), t, 0.16);
      if (i % 4 === 0) piano(note(deg - 5, -1), t, 0.1);
      if (Math.random() < 0.25) piano(note(deg + 2, 0), t, 0.08);
      t += [0.6, 0.9, 1.2, 1.8][(Math.random() * 4) | 0];
    }
    return t;
  }
  A.update = (dt) => {
    if (!ctx || A.muted || (SC.options && SC.options.music === 0)) return;
    A.musicT -= dt;
    if (A.musicT <= 0) {
      const len = phrase();
      A.musicT = len + 60 + Math.random() * 120;
    }
  };
})();
