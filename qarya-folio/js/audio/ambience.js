// Ambient beds: desert wind with gusts and a thin whistle, distant birds,
// the oasis (lapping water, frogs, crickets, the odd plop), a faint souq
// murmur with clinks near the market, and a crackle by the campfire.
// Beds are looping noise buffers whose levels follow the player; one-shots
// are scheduled at random while their place is within earshot.

import { clamp, rand, pick, smoothstep, noise1 } from './lib.js';

export function createAmbience(kit, dest, reverb, ctx, panFor) {
  const { ac } = kit;
  const { LAYOUT } = ctx;
  const spots = ctx.content?.spots || {};
  const souq = spots.souq || { x: LAYOUT.village.x, z: LAYOUT.village.z };
  const fire = spots.campfire || null;
  const oasis = LAYOUT.oasis;
  const stats = { wind: 0, gust: 0, oasis: 0, market: 0, fire: 0, birds: 0, frogs: 0, plops: 0, clinks: 0 };

  const out = ac.createGain();
  out.gain.value = 0;
  out.connect(dest);
  out.gain.setTargetAtTime(1, ac.currentTime, 1.2); // ease in on unlock

  const g = (v = 0, to = out) => { const n = ac.createGain(); n.gain.value = v; n.connect(to); return n; };
  const f = (type, freq, Q, to) => { const n = ac.createBiquadFilter(); n.type = type; n.frequency.value = freq; n.Q.value = Q; n.connect(to); return n; };
  const pan = (to) => {
    if (!ac.createStereoPanner) return to;
    const p = ac.createStereoPanner(); p.connect(to); return p;
  };
  const loop = (buffer, to) => {
    const s = ac.createBufferSource();
    s.buffer = buffer; s.loop = true;
    s.connect(to);
    s.start(ac.currentTime, Math.random() * buffer.duration);
    return s;
  };

  // ---- Wind -------------------------------------------------------------
  const windPan = pan(out);
  const windGain = g(0, windPan);
  const windLp = f('lowpass', 1400, 0.4, windGain);
  const windBp = f('bandpass', 500, 0.55, windLp);
  loop(kit.pink, windBp);
  const rumbleGain = g(0, out);
  loop(kit.brown, f('lowpass', 170, 0.6, rumbleGain));
  const whistleGain = g(0, windPan);
  const whistleBp = f('bandpass', 1200, 28, whistleGain);
  loop(kit.white, whistleBp);

  // ---- Oasis --------------------------------------------------------------
  const oasisPan = pan(out);
  const oasisBus = g(0, oasisPan);
  const lapGain = g(0, oasisBus);
  loop(kit.brown, f('lowpass', 560, 0.7, lapGain));
  const rippleGain = g(0, oasisBus);
  loop(kit.white, f('bandpass', 1900, 0.9, rippleGain));
  // Crickets: a high tone chopped by two square LFOs (fast pulses, slow chirps).
  function cricket(freq, pulse, chirp, level) {
    const o = ac.createOscillator(); o.frequency.value = freq;
    const a = ac.createGain(); a.gain.value = 0.5;
    const b = ac.createGain(); b.gain.value = 0.5;
    const lvl = g(level, oasisBus);
    const l1 = ac.createOscillator(); l1.type = 'square'; l1.frequency.value = pulse;
    const l2 = ac.createOscillator(); l2.type = 'square'; l2.frequency.value = chirp;
    const d1 = ac.createGain(); d1.gain.value = 0.5; l1.connect(d1); d1.connect(a.gain);
    const d2 = ac.createGain(); d2.gain.value = 0.5; l2.connect(d2); d2.connect(b.gain);
    o.connect(a); a.connect(b); b.connect(lvl);
    const t = ac.currentTime + rand(0, 0.5);
    o.start(t); l1.start(t); l2.start(t);
  }
  cricket(4650, 28, 1.7, 0.012);
  cricket(5120, 33, 2.3, 0.008);

  // ---- Market -------------------------------------------------------------
  const marketPan = pan(out);
  const marketBus = g(0, marketPan);
  const murmurLp = f('lowpass', 2600, 0.5, marketBus);
  const formants = [[420, 3, 1], [950, 4, 0.7], [2300, 5, 0.3]].map(([fr, q, lvl]) => {
    const gg = g(0, murmurLp);
    const bp = f('bandpass', fr, q, gg);
    return { gg, bp, fr, lvl };
  });
  const murmurSrc = ac.createBufferSource();
  murmurSrc.buffer = kit.pink; murmurSrc.loop = true;
  formants.forEach((fm) => murmurSrc.connect(fm.bp));
  murmurSrc.start(ac.currentTime, Math.random() * 3);

  // ---- Campfire -----------------------------------------------------------
  const fireBus = g(0, out);
  const fireRoar = g(0.35, fireBus);
  loop(kit.brown, f('lowpass', 260, 0.7, fireRoar));

  // ---- One-shots ----------------------------------------------------------
  const birdBus = g(1);
  const birdSend = ac.createGain(); birdSend.gain.value = 0.5; birdBus.connect(birdSend); birdSend.connect(reverb);

  function bird(near) {
    const v = kit.voice(birdBus);
    const p = v.panner(rand(-0.8, 0.8));
    const lp = v.filter('lowpass', near ? 7000 : 4200, 0.7);
    lp.connect(p || v.out); if (p) p.connect(v.out);
    const o = v.osc('sine', 3000);
    const a = v.gain(0);
    o.connect(a); a.connect(lp);
    const t = ac.currentTime + 0.05;
    const vol = rand(0.035, 0.08) * (near ? 1.3 : 1);
    const F = o.frequency, A = a.gain;
    let end;
    const kind = near && Math.random() < 0.45 ? 'coo' : pick(['tweet', 'trill', 'tweet']);
    if (kind === 'tweet') {
      const f0 = rand(2600, 3400);
      [[0, 1.12, 0.86, 0.13], [0.2, 1.0, 0.78, 0.15]].forEach(([dt, s, e, d]) => {
        F.setValueAtTime(f0 * s, t + dt);
        F.exponentialRampToValueAtTime(f0 * e, t + dt + d);
        A.setValueAtTime(0, t + dt);
        A.linearRampToValueAtTime(vol, t + dt + 0.015);
        A.linearRampToValueAtTime(0, t + dt + d);
      });
      end = t + 0.4;
    } else if (kind === 'trill') {
      const n = 6 + ((Math.random() * 6) | 0), f0 = rand(3600, 4400);
      for (let i = 0; i < n; i++) {
        const tt = t + i * 0.06, vv = vol * (1 - i / (n + 2));
        F.setValueAtTime(f0, tt);
        F.exponentialRampToValueAtTime(f0 * 1.25, tt + 0.035);
        A.setValueAtTime(0, tt);
        A.linearRampToValueAtTime(vv, tt + 0.008);
        A.linearRampToValueAtTime(0, tt + 0.04);
      }
      end = t + n * 0.06 + 0.05;
    } else {
      // A dove: soft low "coo-COO-coo-coo".
      o.type = 'triangle';
      lp.frequency.value = 1400;
      const f0 = rand(480, 560);
      let tt = t;
      [[1, 0.18], [1.12, 0.36], [1.04, 0.2], [0.96, 0.24]].forEach(([k, d], i) => {
        F.setValueAtTime(f0 * k * 0.94, tt);
        F.linearRampToValueAtTime(f0 * k, tt + d * 0.4);
        F.linearRampToValueAtTime(f0 * k * 0.92, tt + d);
        A.setValueAtTime(0, tt);
        A.linearRampToValueAtTime(vol * (i === 1 ? 1.4 : 1.1), tt + 0.05);
        A.linearRampToValueAtTime(0, tt + d);
        tt += d + 0.09;
      });
      end = tt;
    }
    v.play(o, t, end + 0.05);
    stats.birds++;
  }

  function frog(level) {
    const v = kit.voice(oasisBus);
    const p = v.panner(rand(-0.6, 0.6));
    const bp = v.filter('bandpass', rand(520, 760), 3);
    const o = v.osc('sawtooth', rand(105, 160));
    const a = v.gain(0);
    o.connect(bp); bp.connect(a); a.connect(p || v.out); if (p) p.connect(v.out);
    const t = ac.currentTime + 0.03;
    const bursts = Math.random() < 0.6 ? 2 : 1;
    let tt = t;
    const vol = 0.22 * level * rand(0.6, 1);
    for (let b = 0; b < bursts; b++) {
      const pulses = 5 + ((Math.random() * 4) | 0);
      for (let i = 0; i < pulses; i++) {
        a.gain.setValueAtTime(0, tt);
        a.gain.linearRampToValueAtTime(vol, tt + 0.006);
        a.gain.exponentialRampToValueAtTime(0.0005, tt + 0.026);
        tt += 0.03;
      }
      tt += 0.12;
    }
    v.play(o, t, tt + 0.05);
    stats.frogs++;
  }

  function plop(level) {
    const v = kit.voice(oasisBus);
    const o = v.osc('sine', 300);
    const a = v.gain(0);
    o.connect(a); a.connect(v.out);
    const t = ac.currentTime + 0.02, f0 = rand(260, 420);
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(f0 * rand(2.4, 3.4), t + 0.07);
    kit.env(a.gain, t, 0.12 * level, 0.004, 0.08);
    v.play(o, t, t + 0.14);
    stats.plops++;
  }

  function clink(level) {
    const v = kit.voice(marketBus);
    const f0 = rand(1700, 2600);
    [[1, 0.25, 1], [2.76, 0.12, 0.4]].forEach(([k, d, amp]) => {
      const o = v.osc('sine', f0 * k);
      const a = v.gain(0);
      o.connect(a); a.connect(v.out);
      const t = ac.currentTime + 0.02;
      kit.env(a.gain, t, 0.05 * amp * level, 0.002, d);
      v.play(o, t, t + d * 1.4);
    });
    stats.clinks++;
  }

  function crackle(level) {
    const v = kit.voice(fireBus);
    kit.noiseBurst(v, v.out, ac.currentTime + 0.01, { type: 'highpass', freq: rand(1500, 4000), Q: 0.7, peak: rand(0.05, 0.25) * level, attack: 0.001, decay: rand(0.005, 0.02) });
  }

  // ---- Per-frame control (20 Hz) ----------------------------------------
  let acc = 0;
  const timers = { bird: rand(3, 7), frog: 1, plop: 2, clink: 2, crackle: 0.2 };
  const dist = (p, x, z) => Math.hypot(p.x - x, p.z - z);

  function update(dt, t) {
    const p = ctx.player?.position;
    if (!p) return;
    const now = ac.currentTime;
    for (const k in timers) timers[k] -= dt;
    acc += dt;
    const doParams = acc >= 0.05;
    if (doParams) acc = 0;

    // Wind: slow gusts, stronger out on the dunes than inside the village.
    const gust = clamp(noise1(t * 0.09) * 0.65 + noise1(t * 0.31 + 7) * 0.35, 0, 1);
    const dv = dist(p, LAYOUT.village.x, LAYOUT.village.z);
    const exposure = 0.55 + 0.45 * smoothstep(30, 75, dv);
    const dO = dist(p, oasis.x, oasis.z);
    const oasisLvl = smoothstep(oasis.r + 40, oasis.r + 4, dO);
    const dM = dist(p, souq.x, souq.z);
    const marketLvl = smoothstep(34, 6, dM) * (1 - oasisLvl * 0.5);
    const fireLvl = fire ? smoothstep(18, 2, dist(p, fire.x, fire.z)) : 0;
    stats.gust = gust; stats.oasis = oasisLvl; stats.market = marketLvl; stats.fire = fireLvl;

    if (doParams) {
      const T = 0.15;
      // The start sandstorm (ctx.reveal.storm 1 → 0) howls over everything.
      const storm = ctx.reveal ? ctx.reveal.storm : 0;
      const wind = (0.1 + 0.3 * Math.pow(gust, 1.6)) * exposure + storm * 0.45;
      stats.wind = wind;
      windGain.gain.setTargetAtTime(wind, now, T);
      windBp.frequency.setTargetAtTime(280 + 750 * gust + storm * 500, now, T);
      rumbleGain.gain.setTargetAtTime((0.05 + 0.12 * gust) * exposure + storm * 0.22, now, T);
      whistleGain.gain.setTargetAtTime(Math.max(0, gust - 0.5) * 2.2 * exposure + storm * 0.5, now, 0.3);
      whistleBp.frequency.setTargetAtTime(950 + 700 * noise1(t * 0.05 + 11), now, 0.3);
      if (windPan.pan) windPan.pan.setTargetAtTime((noise1(t * 0.06 + 3) - 0.5) * 1.2, now, 0.4);

      oasisBus.gain.setTargetAtTime(oasisLvl, now, 0.3);
      if (oasisPan.pan) oasisPan.pan.setTargetAtTime(panFor({ x: oasis.x, z: oasis.z }) * (0.3 + 0.5 * smoothstep(4, 20, dO)), now, 0.2);
      const lap = Math.pow(Math.max(0, Math.sin(t * 2.2 + noise1(t * 0.4) * 3)), 2);
      lapGain.gain.setTargetAtTime(0.18 + 0.4 * lap, now, 0.12);
      rippleGain.gain.setTargetAtTime(0.004 + 0.02 * lap, now, 0.1);

      marketBus.gain.setTargetAtTime(marketLvl * 0.5, now, 0.3);
      if (marketPan.pan) marketPan.pan.setTargetAtTime(panFor({ x: souq.x, z: souq.z }) * smoothstep(3, 14, dM) * 0.7, now, 0.2);
      formants.forEach((fm, i) => {
        fm.gg.gain.setTargetAtTime(fm.lvl * (0.25 + 0.75 * noise1(t * 3.3 + i * 13.7)), now, 0.06);
        fm.bp.frequency.setTargetAtTime(fm.fr * (0.85 + 0.3 * noise1(t * 1.7 + i * 5.1)), now, 0.08);
      });

      fireBus.gain.setTargetAtTime(fireLvl * 0.6, now, 0.3);
    }

    // One-shots.
    if (timers.bird <= 0) {
      const near = oasisLvl > 0.3 || dv < 30;
      bird(near);
      timers.bird = rand(5, 15) / (1 + oasisLvl * 1.5);
    }
    if (oasisLvl > 0.05) {
      if (timers.frog <= 0) { frog(oasisLvl); timers.frog = rand(0.7, 3.2); }
      if (timers.plop <= 0) { plop(oasisLvl); timers.plop = rand(1.5, 5); }
    }
    if (marketLvl > 0.08 && timers.clink <= 0) { clink(marketLvl); timers.clink = rand(1.2, 4.5); }
    if (fireLvl > 0.05 && timers.crackle <= 0) { crackle(fireLvl); timers.crackle = rand(0.04, 0.35); }
  }

  return { update, stats };
}
