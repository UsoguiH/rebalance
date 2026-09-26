// Audio: a tiny synthesised jazz band (stride bass, banjo stabs, clarinet/trumpet
// lead, brushed drums) plus record crackle and cartoon sound effects.
(function () {
  const A = (G.audio = { ready: false, song: null, muted: false });
  let ac, master, music, sfx, noiseBuf, crackleSrc;

  A.unlock = () => {
    if (A.ready) {
      if (ac.state === 'suspended') ac.resume();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ac = new AC();
    master = ac.createGain();
    master.gain.value = 0.9;
    master.connect(ac.destination);
    music = ac.createGain();
    sfx = ac.createGain();
    music.connect(master);
    sfx.connect(master);
    A.applyVolumes();
    noiseBuf = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    // vinyl crackle bed
    const cb = ac.createBuffer(1, ac.sampleRate * 3, ac.sampleRate);
    const cd = cb.getChannelData(0);
    for (let i = 0; i < cd.length; i++) {
      cd[i] = (Math.random() * 2 - 1) * 0.012;
      if (Math.random() < 0.0006) cd[i] = (Math.random() * 2 - 1) * 0.6;
    }
    crackleSrc = ac.createBufferSource();
    crackleSrc.buffer = cb;
    crackleSrc.loop = true;
    const cg = ac.createGain();
    cg.gain.value = 0.35;
    const hp = ac.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 900;
    crackleSrc.connect(hp).connect(cg).connect(music);
    crackleSrc.start();
    A.ready = true;
    setInterval(tick, 25);
    if (A.pending) {
      const p = A.pending;
      A.pending = null;
      A.play(p);
    }
  };

  A.applyVolumes = () => {
    if (!ac) return;
    const m = A.muted ? 0 : 1;
    music.gain.value = G.settings.music * 0.55 * m;
    sfx.gain.value = G.settings.sfx * 0.7 * m;
  };
  A.toggleMute = () => {
    A.muted = !A.muted;
    A.applyVolumes();
  };

  const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
  const Q = {
    maj: [0, 4, 7],
    maj6: [0, 4, 7, 9],
    dom7: [0, 4, 7, 10],
    min: [0, 3, 7],
    min7: [0, 3, 7, 10],
    dim: [0, 3, 6, 9],
  };
  function parseChord(s) {
    // e.g. "0:maj" root offset from key
    const [r, q] = s.split(':');
    return { r: +r, q: Q[q] };
  }

  const SONGS = {
    title: { bpm: 172, key: 60, lead: 'clarinet', prog: ['0:maj6', '0:maj6', '9:dom7', '9:dom7', '2:dom7', '2:dom7', '7:dom7', '7:dom7'], drums: 'stride', busy: 0.8 },
    town: { bpm: 118, key: 65, lead: 'clarinet', prog: ['0:maj6', '9:dom7', '2:min7', '7:dom7', '0:maj6', '0:dom7', '5:maj6', '7:dom7'], drums: 'brush', busy: 0.55 },
    shop: { bpm: 140, key: 58, lead: 'piano', prog: ['0:maj6', '0:maj6', '9:dom7', '9:dom7', '2:dom7', '7:dom7', '0:maj6', '7:dom7'], drums: 'brush', busy: 0.7 },
    dungeon: { bpm: 128, key: 57, lead: 'clarinet', prog: ['0:min', '0:min', '5:min', '5:min', '7:dom7', '7:dom7', '0:min', '7:dom7'], drums: 'brush', busy: 0.5, minor: true },
    boss: { bpm: 196, key: 62, lead: 'trumpet', prog: ['0:min', '0:min7', '5:min', '5:min7', '10:dom7', '9:dom7', '0:min', '9:dom7'], drums: 'hot', busy: 0.95, minor: true },
    final: { bpm: 184, key: 60, lead: 'trumpet', prog: ['0:min', '8:dom7', '5:min', '7:dom7', '0:min', '3:maj', '2:dim', '7:dom7'], drums: 'hot', busy: 1, minor: true },
    story: { bpm: 92, key: 60, lead: 'musicbox', prog: ['0:maj', '9:min', '5:maj', '7:dom7'], drums: 'none', busy: 0.45 },
    victory: { bpm: 150, key: 60, lead: 'trumpet', prog: ['0:maj6', '5:maj6', '7:dom7', '0:maj6'], drums: 'stride', busy: 0.8, once: true },
  };

  let cur = null,
    nextTime = 0,
    step = 0,
    songSeed = 1;
  A.play = (name) => {
    if (!A.ready) {
      A.pending = name;
      return;
    }
    if (A.song === name) return;
    A.song = name;
    cur = name ? SONGS[name] : null;
    step = 0;
    nextTime = ac.currentTime + 0.12;
    songSeed = name ? name.length * 131 + name.charCodeAt(0) : 1;
  };
  A.stop = () => A.play(null);

  function tick() {
    if (!cur || !ac) return;
    const s8 = 60 / cur.bpm / 2; // eighth note
    while (nextTime < ac.currentTime + 0.18) {
      scheduleStep(step, nextTime, s8);
      nextTime += s8;
      step++;
    }
  }

  function scheduleStep(st, t, s8) {
    const bar = Math.floor(st / 8);
    const pos = st % 8;
    const prog = cur.prog;
    if (cur.once && bar >= prog.length) {
      if (pos === 0 && bar === prog.length) note(cur.key, t, 1.2, 'trumpet', 0.2);
      return;
    }
    const ch = parseChord(prog[bar % prog.length]);
    const root = cur.key + ch.r;
    const swing = pos % 2 === 1 ? s8 * 0.32 : 0;
    const tt = t + swing;
    // ---- bass (oom) ----
    if (pos === 0 || pos === 4) {
      const bn = pos === 0 ? root - 24 : root - 24 + ch.q[2];
      note(bn, tt, s8 * 1.6, 'tuba', 0.34);
    }
    // ---- chord stab (pah) ----
    if (cur.drums !== 'none' && (pos === 2 || pos === 6)) {
      ch.q.slice(0, 3).forEach((iv, i) => note(root - 12 + iv + (i === 0 ? 12 : 0), tt, s8 * 0.7, 'banjo', 0.07));
    }
    if (cur.drums === 'none' && pos % 4 === 0) {
      ch.q.forEach((iv, i) => note(root - 12 + iv, tt + i * 0.05, s8 * 3, 'musicbox', 0.05));
    }
    // ---- drums ----
    if (cur.drums === 'stride' || cur.drums === 'hot') {
      if (pos === 0 || pos === 4) kick(tt);
      if (pos === 2 || pos === 6) snare(tt, 0.2);
      if (cur.drums === 'hot' && pos % 2 === 1) hat(tt, 0.05);
      if (cur.drums === 'hot' && pos === 7 && bar % 2 === 1) snare(tt, 0.12);
    } else if (cur.drums === 'brush') {
      hat(tt, pos % 2 ? 0.035 : 0.05, 0.08);
      if (pos === 2 || pos === 6) snare(tt, 0.09);
    }
    // ---- lead melody (seeded per 4-bar phrase so it repeats musically) ----
    const phraseBar = bar % 8;
    const r = G.rng(songSeed * 1000 + phraseBar * 17 + (bar % 16 >= 8 ? 5 : 0));
    const pattern = [];
    for (let i = 0; i < 8; i++) pattern.push(r() < cur.busy * (i % 2 === 0 ? 0.9 : 0.55));
    if (pattern[pos]) {
      const r2 = G.rng(songSeed * 7 + bar * 97 + pos * 13);
      const tones = ch.q;
      const deg = tones[Math.floor(r2() * tones.length)];
      let oct = 12;
      if (r2() < 0.3) oct = 24;
      let n = root + deg + oct;
      // passing tones
      if (pos % 2 === 1 && r2() < 0.35) n += cur.minor ? 2 : r2() < 0.5 ? 2 : -1;
      const len = pattern[pos + 1] ? s8 * 0.9 : s8 * 1.8;
      note(n, tt, len, cur.lead, cur.lead === 'trumpet' ? 0.09 : 0.1);
    }
  }

  function env(g, t, a, d, peak, sustain = 0) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0001, sustain), t + a + d);
  }

  function note(m, t, len, inst, vol) {
    const f = mtof(m);
    const g = ac.createGain();
    const o = ac.createOscillator();
    let out = g;
    if (inst === 'tuba') {
      o.type = 'square';
      const lp = ac.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 380;
      o.connect(lp).connect(g);
      env(g, t, 0.02, len, vol);
    } else if (inst === 'banjo') {
      o.type = 'sawtooth';
      const lp = ac.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 2400;
      o.connect(lp).connect(g);
      env(g, t, 0.004, 0.18, vol);
    } else if (inst === 'clarinet') {
      o.type = 'square';
      const lp = ac.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 1500;
      const vib = ac.createOscillator();
      const vg = ac.createGain();
      vib.frequency.value = 5.5;
      vg.gain.value = f * 0.008;
      vib.connect(vg).connect(o.frequency);
      vib.start(t);
      vib.stop(t + len + 0.2);
      o.connect(lp).connect(g);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol, t + 0.03);
      g.gain.setValueAtTime(vol, t + len * 0.7);
      g.gain.exponentialRampToValueAtTime(0.0001, t + len + 0.08);
    } else if (inst === 'trumpet') {
      o.type = 'sawtooth';
      const lp = ac.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.setValueAtTime(700, t);
      lp.frequency.linearRampToValueAtTime(2600, t + 0.05);
      o.connect(lp).connect(g);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol, t + 0.025);
      g.gain.setValueAtTime(vol * 0.8, t + len * 0.7);
      g.gain.exponentialRampToValueAtTime(0.0001, t + len + 0.06);
    } else if (inst === 'piano') {
      o.type = 'triangle';
      env(g, t, 0.005, 0.5, vol * 1.3);
      o.connect(g);
    } else {
      // music box
      o.type = 'sine';
      const o2 = ac.createOscillator();
      o2.type = 'sine';
      o2.frequency.value = f * 4;
      const g2 = ac.createGain();
      g2.gain.value = 0.2;
      o2.connect(g2).connect(g);
      o2.start(t);
      o2.stop(t + len + 0.6);
      o.connect(g);
      env(g, t, 0.004, 0.9, vol * 1.4);
    }
    o.frequency.setValueAtTime(f, t);
    out.connect(music);
    o.start(t);
    o.stop(t + len + 0.9);
  }

  function noise(t, dur, vol, type, freq, dest) {
    const s = ac.createBufferSource();
    s.buffer = noiseBuf;
    const f = ac.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    const g = ac.createGain();
    env(g, t, 0.003, dur, vol);
    s.connect(f).connect(g).connect(dest || music);
    s.start(t, Math.random());
    s.stop(t + dur + 0.05);
  }
  function kick(t) {
    const o = ac.createOscillator();
    const g = ac.createGain();
    o.frequency.setValueAtTime(120, t);
    o.frequency.exponentialRampToValueAtTime(45, t + 0.12);
    env(g, t, 0.003, 0.18, 0.4);
    o.connect(g).connect(music);
    o.start(t);
    o.stop(t + 0.25);
  }
  const snare = (t, v) => noise(t, 0.12, v, 'bandpass', 1800);
  const hat = (t, v, d = 0.04) => noise(t, d, v, 'highpass', 7000);

  // ---------- sound effects ----------
  function blip(f1, f2, dur, type = 'square', vol = 0.2, delay = 0) {
    if (!A.ready) return;
    const t = ac.currentTime + delay;
    const o = ac.createOscillator();
    const g = ac.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f1, t);
    o.frequency.exponentialRampToValueAtTime(Math.max(20, f2), t + dur);
    env(g, t, 0.004, dur, vol);
    o.connect(g).connect(sfx);
    o.start(t);
    o.stop(t + dur + 0.05);
  }
  const nz = (dur, vol, type, freq, delay = 0) => A.ready && noise(ac.currentTime + delay, dur, vol, type, freq, sfx);

  A.sfx = (name) => {
    if (!A.ready) return;
    switch (name) {
      case 'shoot':
        blip(900 + Math.random() * 200, 300, 0.06, 'square', 0.05);
        break;
      case 'ex':
        blip(200, 900, 0.25, 'sawtooth', 0.18);
        nz(0.3, 0.2, 'lowpass', 900);
        break;
      case 'hit':
        nz(0.06, 0.12, 'bandpass', 1200);
        break;
      case 'enemyDie':
        blip(500, 80, 0.25, 'square', 0.12);
        nz(0.2, 0.2, 'lowpass', 700);
        break;
      case 'hurt':
        blip(700, 90, 0.4, 'sawtooth', 0.22);
        nz(0.2, 0.25, 'lowpass', 500);
        break;
      case 'dodge':
        nz(0.18, 0.18, 'bandpass', 2500);
        break;
      case 'parry':
        blip(1320, 1320, 0.25, 'triangle', 0.25);
        blip(1760, 1760, 0.3, 'triangle', 0.2, 0.06);
        break;
      case 'coin':
        blip(1320, 1320, 0.07, 'square', 0.08);
        blip(1980, 1980, 0.18, 'square', 0.08, 0.07);
        break;
      case 'pickup':
        blip(600, 1200, 0.12, 'triangle', 0.18);
        break;
      case 'select':
        blip(700, 700, 0.05, 'square', 0.07);
        break;
      case 'confirm':
        blip(880, 880, 0.08, 'square', 0.09);
        blip(1320, 1320, 0.12, 'square', 0.09, 0.08);
        break;
      case 'back':
        blip(500, 300, 0.1, 'square', 0.08);
        break;
      case 'type':
        blip(1800 + Math.random() * 300, 1500, 0.02, 'square', 0.025);
        break;
      case 'door':
        nz(0.25, 0.25, 'lowpass', 400);
        blip(160, 90, 0.2, 'triangle', 0.2);
        break;
      case 'chest':
        blip(400, 800, 0.15, 'triangle', 0.18);
        blip(800, 1600, 0.2, 'triangle', 0.15, 0.12);
        break;
      case 'bell':
        blip(2093, 2093, 0.6, 'sine', 0.2);
        blip(2637, 2637, 0.6, 'sine', 0.12, 0.02);
        break;
      case 'register':
        blip(2600, 2600, 0.05, 'square', 0.08);
        nz(0.1, 0.2, 'highpass', 3000, 0.04);
        blip(1568, 1568, 0.5, 'sine', 0.2, 0.1);
        break;
      case 'happy':
        blip(600, 1200, 0.15, 'triangle', 0.14);
        break;
      case 'angry':
        blip(220, 110, 0.35, 'sawtooth', 0.12);
        break;
      case 'meh':
        blip(500, 350, 0.25, 'triangle', 0.12);
        break;
      case 'boom':
        nz(0.8, 0.5, 'lowpass', 400);
        blip(120, 30, 0.6, 'sine', 0.4);
        break;
      case 'announce':
        blip(523, 523, 0.12, 'sawtooth', 0.12);
        blip(659, 659, 0.12, 'sawtooth', 0.12, 0.12);
        blip(784, 784, 0.35, 'sawtooth', 0.14, 0.24);
        break;
      case 'bop':
        blip(300, 150, 0.1, 'triangle', 0.15);
        break;
      case 'heal':
        [0, 0.08, 0.16].forEach((d, i) => blip(660 * (1 + i * 0.25), 660 * (1 + i * 0.25), 0.15, 'triangle', 0.12, d));
        break;
      case 'leader':
        blip(1000, 1000, 0.18, 'sine', 0.25);
        break;
      case 'hook':
        blip(300, 1200, 0.35, 'sawtooth', 0.14);
        nz(0.4, 0.2, 'bandpass', 1500);
        break;
      case 'whistle':
        blip(1200, 2200, 0.5, 'sine', 0.15);
        break;
      case 'sad':
        [0, 0.2, 0.4].forEach((d, i) => blip(392 - i * 40, 370 - i * 40, 0.25, 'sawtooth', 0.1, d));
        break;
    }
  };
})();
