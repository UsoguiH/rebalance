// Sound effects: the camel (padded footsteps, saddle bells and tassels,
// sand swish, grunt, jump and landing), knocked props and UI sounds.

import { clamp, rand, mtof } from './lib.js';

const HIJAZ = [0, 1, 4, 5, 7, 8, 10];
const degMidi = (deg, base = 62) => base + 12 * Math.floor(deg / 7) + HIJAZ[((deg % 7) + 7) % 7];

export function createSfx(kit, dest, uiDest, reverb, ctx, panFor) {
  const { ac } = kit;
  const stats = { steps: 0, bells: 0, grunts: 0, jumps: 0, lands: 0, propHits: 0, propDropped: 0, propVoices: 0, ui: 0, swish: 0 };

  const bus = ac.createGain();
  bus.gain.value = 0.9;
  bus.connect(dest);
  const send = ac.createGain();
  send.gain.value = 0.35;
  send.connect(reverb);

  const now = () => ac.currentTime + 0.005;
  function out(v, pan) {
    const p = pan !== undefined ? v.panner(pan) : null;
    if (p) { p.connect(v.out); return p; }
    return v.out;
  }
  function tone(v, to, t, type, freq, peak, attack, decay, freqTo, glide) {
    const o = v.osc(type, freq);
    const a = v.gain(0);
    o.connect(a); a.connect(to);
    if (freqTo) {
      o.frequency.setValueAtTime(freq, t);
      o.frequency.exponentialRampToValueAtTime(freqTo, t + (glide || decay));
    }
    kit.env(a.gain, t, peak, attack, decay);
    v.play(o, t, t + attack + decay * 1.3 + 0.02);
    return o;
  }
  // Inharmonic struck metal: partials [ratio, decay, amp].
  function metal(v, to, t, f0, partials, peak) {
    for (const [k, d, amp] of partials) tone(v, to, t, 'sine', f0 * k * rand(0.995, 1.005), peak * amp, 0.002, d);
  }

  // ---- Camel movement ----------------------------------------------------
  // Sand swish: a noise bed whose level follows the speed.
  const swishGain = ac.createGain();
  swishGain.gain.value = 0;
  swishGain.connect(bus);
  const swishBp = ac.createBiquadFilter();
  swishBp.type = 'bandpass'; swishBp.frequency.value = 1000; swishBp.Q.value = 0.8;
  swishBp.connect(swishGain);
  const swishSrc = ac.createBufferSource();
  swishSrc.buffer = kit.pink; swishSrc.loop = true;
  swishSrc.connect(swishBp);
  swishSrc.start(ac.currentTime, Math.random() * 3);

  const BELLS = [mtof(86), mtof(81)]; // D6 and A5: they sit inside the music's maqam
  const BELL_PARTIALS = [[1, 0.7, 1], [2.32, 0.4, 0.45], [4.25, 0.22, 0.25], [6.63, 0.12, 0.12]];
  let bellIdx = 0;
  function bell(vol, t = now()) {
    const v = kit.voice(bus);
    const o = out(v, rand(-0.2, 0.2));
    const s = v.gain(0.6); o.connect(s); s.connect(send);
    metal(v, o, t, BELLS[bellIdx++ % 2], BELL_PARTIALS, 0.05 * vol);
    stats.bells++;
  }
  function tassels(vol, t = now(), n = 3) {
    const v = kit.voice(bus);
    const o = out(v, rand(-0.3, 0.3));
    for (let i = 0; i < n; i++) {
      kit.noiseBurst(v, o, t + i * rand(0.012, 0.035), { type: 'bandpass', freq: rand(5000, 7500), Q: 4, peak: 0.05 * vol, attack: 0.001, decay: 0.03 });
    }
  }

  let side = 1, stepCount = 0, phase = 0.7;
  function footstep(k, boost) {
    const t = now();
    const v = kit.voice(bus);
    const o = out(v, side * 0.22);
    side = -side;
    const vol = (0.2 + 0.35 * k) * rand(0.85, 1.05);
    // Soft pad: a low thump and a muffled burst, then a little sand grit.
    tone(v, o, t, 'sine', rand(70, 82), 0.5 * vol, 0.004, 0.09, 42);
    kit.noiseBurst(v, o, t, { type: 'lowpass', freq: 320, Q: 0.7, peak: 0.45 * vol, attack: 0.006, decay: 0.07 });
    kit.noiseBurst(v, o, t + 0.012, { type: 'bandpass', freq: boost ? 3200 : 2300, Q: 0.8, peak: (boost ? 0.1 : 0.06) * vol, attack: 0.004, decay: 0.05 });
    stepCount++;
    stats.steps++;
    if (stepCount % 2 === 0 && Math.random() < 0.85) bell(0.5 + 0.5 * k, t + 0.03);
    if (Math.random() < 0.55) tassels(0.4 + 0.6 * k, t + 0.02, 2 + (Math.random() * 2 | 0));
    // A swish accent on each footfall.
    swishGain.gain.setTargetAtTime(swishLevel * 1.5, t, 0.02);
    swishGain.gain.setTargetAtTime(swishLevel, t + 0.06, 0.08);
  }

  let swishLevel = 0, acc = 0;
  function update(dt) {
    const pl = ctx.player;
    if (!pl) return;
    const sp = Math.abs(pl.speed || 0);
    const k = clamp(sp / 13, 0, 1);
    const moving = pl.grounded && sp > 0.5;
    if (moving) {
      const rate = 0.9 + sp * 0.3; // steps per second: ~3 walking, ~5 running
      phase += dt * rate;
      if (phase >= 1) { phase -= 1; footstep(k, pl.boost); }
    } else phase = 0.7; // first step lands soon after starting off

    acc += dt;
    if (acc >= 0.05) {
      acc = 0;
      swishLevel = moving ? Math.pow(k, 1.2) * (pl.boost ? 0.3 : 0.2) : 0;
      stats.swish = swishLevel;
      swishGain.gain.setTargetAtTime(swishLevel, ac.currentTime, 0.12);
      swishBp.frequency.setTargetAtTime(pl.boost ? 2200 : 900 + sp * 50, ac.currentTime, 0.2);
    }
  }

  // ---- Camel actions -----------------------------------------------------
  function grunt() {
    const t = now();
    const v = kit.voice(bus);
    const o = out(v, 0);
    const dur = rand(1.1, 1.45);
    const f0 = rand(58, 70);
    // Voice: a rough low sawtooth, jittered and chopped for the growl.
    const saw = v.osc('sawtooth', f0);
    saw.frequency.setValueAtTime(f0, t);
    saw.frequency.linearRampToValueAtTime(f0 * 1.35, t + 0.3);
    saw.frequency.linearRampToValueAtTime(f0 * 1.1, t + dur * 0.7);
    saw.frequency.linearRampToValueAtTime(f0 * 0.8, t + dur);
    const fm = v.osc('sine', 23);
    const fmAmt = v.gain(9);
    fm.connect(fmAmt); fmAmt.connect(saw.frequency);
    const am = v.osc('triangle', 31);
    const amAmt = v.gain(0.45);
    const voiced = v.gain(0.55);
    am.connect(amAmt); amAmt.connect(voiced.gain);
    saw.connect(voiced);
    const env = v.gain(0);
    // Formants moving from "oo" to "aa" and back.
    [[380, 700, 6, 1], [850, 1150, 7, 0.55], [2400, 2500, 8, 0.2]].forEach(([a, b, q, lvl]) => {
      const bp = v.filter('bandpass', a, q);
      bp.frequency.setValueAtTime(a, t);
      bp.frequency.linearRampToValueAtTime(b, t + 0.35);
      bp.frequency.linearRampToValueAtTime(a * 1.1, t + dur);
      const fg = v.gain(lvl * 2.2);
      voiced.connect(bp); bp.connect(fg); fg.connect(env);
    });
    // Breath.
    kit.noiseBurst(v, env, t, { type: 'bandpass', freq: 900, Q: 1, peak: 0.25, attack: 0.1, decay: dur * 0.8, buffer: kit.pink });
    env.connect(o);
    env.gain.setValueAtTime(0, t);
    env.gain.linearRampToValueAtTime(0.9, t + 0.08);
    env.gain.setValueAtTime(0.9, t + dur * 0.6);
    env.gain.linearRampToValueAtTime(0, t + dur);
    v.play(saw, t, t + dur + 0.05);
    v.play(fm, t, t + dur + 0.05);
    v.play(am, t, t + dur + 0.05);
    // Gurgle: quick wet bubbles in the second half.
    const bub = v.osc('sine', 200);
    const bg = v.gain(0);
    const blp = v.filter('lowpass', 1100, 0.7);
    bub.connect(bg); bg.connect(blp); blp.connect(o);
    for (let tt = t + dur * 0.4; tt < t + dur + 0.25; tt += rand(0.035, 0.07)) {
      const fb = rand(170, 420);
      bub.frequency.setValueAtTime(fb, tt);
      bub.frequency.exponentialRampToValueAtTime(fb * 1.6, tt + 0.03);
      bg.gain.setValueAtTime(0, tt);
      bg.gain.linearRampToValueAtTime(rand(0.08, 0.18), tt + 0.005);
      bg.gain.exponentialRampToValueAtTime(0.001, tt + 0.03);
    }
    v.play(bub, t + dur * 0.4, t + dur + 0.3);
    stats.grunts++;
  }

  function jump() {
    const t = now();
    const v = kit.voice(bus);
    const o = out(v, 0);
    const { f } = kit.noiseBurst(v, o, t, { type: 'bandpass', freq: 300, Q: 1.4, peak: 0.35, attack: 0.12, decay: 0.32, buffer: kit.pink });
    f.frequency.setValueAtTime(300, t);
    f.frequency.exponentialRampToValueAtTime(1500, t + 0.16);
    f.frequency.exponentialRampToValueAtTime(500, t + 0.45);
    bell(0.8, t + 0.02);
    tassels(0.9, t + 0.04, 4);
    stats.jumps++;
  }

  function land() {
    const t = now();
    const v = kit.voice(bus);
    const o = out(v, 0);
    tone(v, o, t, 'sine', 68, 0.6, 0.004, 0.25, 36, 0.2);
    kit.noiseBurst(v, o, t, { type: 'lowpass', freq: 260, Q: 0.7, peak: 0.4, attack: 0.004, decay: 0.12 });
    // Sand puff: a falling, airy burst.
    kit.noiseBurst(v, o, t + 0.01, { type: 'bandpass', freq: 1600, Q: 0.7, peak: 0.16, attack: 0.012, decay: 0.4, sweepTo: 450, buffer: kit.pink });
    bell(1, t + 0.03);
    tassels(1, t + 0.02, 5);
    stats.lands++;
  }

  // ---- Props ---------------------------------------------------------------
  const MAX_PROP_VOICES = 8;
  let propVoices = [], recent = [];
  function propHit({ kind = 'wood', speed = 2, position } = {}) {
    const tNow = ac.currentTime;
    propVoices = propVoices.filter((v) => v.end > tNow);
    recent = recent.filter((x) => tNow - x < 0.06);
    stats.propVoices = propVoices.length;
    // Throttle: at most 3 new hits per 60 ms and 8 ringing at once.
    if (recent.length >= 3 || propVoices.length >= MAX_PROP_VOICES) { stats.propDropped++; return; }
    const pp = ctx.player?.position;
    const d = pp && position ? Math.hypot(position.x - pp.x, (position.y || 0) - pp.y, position.z - pp.z) : 5;
    if (d > 70) return;
    const vol = clamp((speed - 1) / 7, 0.06, 1) / (1 + Math.max(0, d - 3) / 6);
    if (vol < 0.02) return;
    recent.push(tNow);
    const t = now();
    const v = kit.voice(bus);
    const o = out(v, position ? panFor(position) * 0.8 : 0);
    if (kind === 'pot') {
      const f0 = rand(320, 470);
      for (const [k, dd, amp] of [[1, 0.12, 1], [2.63, 0.07, 0.5], [4.1, 0.04, 0.3]]) tone(v, o, t, 'sine', f0 * k, 0.4 * vol * amp, 0.002, dd);
      kit.noiseBurst(v, o, t, { type: 'bandpass', freq: 1300, Q: 2, peak: 0.3 * vol, attack: 0.001, decay: 0.03 });
      if (speed > 5) {
        // Crack: a scatter of tiny sharp clicks and shards.
        for (let i = 0; i < 6; i++) kit.noiseBurst(v, o, t + 0.01 + Math.random() * 0.12, { type: 'highpass', freq: rand(2500, 5000), Q: 0.7, peak: rand(0.1, 0.3) * vol, attack: 0.001, decay: rand(0.006, 0.02) });
        kit.noiseBurst(v, o, t + 0.02, { type: 'bandpass', freq: 2600, Q: 1, peak: 0.18 * vol, attack: 0.003, decay: 0.16 });
      }
    } else if (kind === 'metal') {
      metal(v, o, t, rand(300, 430), [[1, 1.1, 1], [2.41, 0.8, 0.6], [3.87, 0.5, 0.45], [5.3, 0.35, 0.3], [7.1, 0.2, 0.2]], 0.22 * vol);
      kit.noiseBurst(v, o, t, { type: 'bandpass', freq: 3200, Q: 1.5, peak: 0.25 * vol, attack: 0.001, decay: 0.02 });
      const s = v.gain(0.5); o.connect(s); s.connect(send);
    } else if (kind === 'fabric') {
      kit.noiseBurst(v, o, t, { type: 'lowpass', freq: 280, Q: 0.6, peak: 0.5 * vol, attack: 0.008, decay: 0.12 });
      tone(v, o, t, 'sine', 90, 0.25 * vol, 0.005, 0.1, 60);
    } else {
      const f0 = rand(170, 260);
      tone(v, o, t, 'triangle', f0, 0.45 * vol, 0.002, 0.09, f0 * 0.9);
      tone(v, o, t, 'sine', f0 * 2.3, 0.2 * vol, 0.002, 0.05);
      kit.noiseBurst(v, o, t, { type: 'bandpass', freq: 850, Q: 3, peak: 0.35 * vol, attack: 0.001, decay: 0.04 });
      if (speed > 4) tone(v, o, t + 0.07, 'triangle', f0 * 1.12, 0.2 * vol, 0.002, 0.07);
    }
    propVoices.push(v);
    stats.propHits++;
  }

  // ---- UI --------------------------------------------------------------------
  const uiBus = ac.createGain();
  uiBus.gain.value = 0.8;
  uiBus.connect(uiDest);
  const uiSend = ac.createGain();
  uiSend.gain.value = 0.5;
  uiBus.connect(uiSend); uiSend.connect(reverb);

  function uiPluck(t, midi, vel, pan, style = 'qanun') {
    const { buffer, rate } = kit.ks(mtof(midi), style);
    const v = kit.voice(uiBus);
    const o = out(v, pan);
    const src = v.buf(buffer);
    src.playbackRate.value = rate;
    const g = v.gain(vel);
    src.connect(g); g.connect(o);
    v.play(src, t, t + Math.min(1.2, buffer.duration / rate));
  }
  function click() {
    const t = now();
    const v = kit.voice(uiBus);
    tone(v, v.out, t, 'sine', 2100, 0.12, 0.001, 0.025);
    kit.noiseBurst(v, v.out, t, { type: 'highpass', freq: 4500, Q: 0.7, peak: 0.08, attack: 0.001, decay: 0.008 });
    stats.ui++;
  }
  function chime() {
    const t = now();
    [[mtof(81), 0], [mtof(86), 0.13]].forEach(([f0, dt], i) => {
      const v = kit.voice(uiBus);
      metal(v, out(v, i ? 0.2 : -0.2), t + dt, f0, BELL_PARTIALS, 0.09);
    });
    stats.ui++;
  }
  function openGliss() {
    const t = now();
    // A rising qanun sweep through Hijaz, D4 → D6.
    for (let i = 0; i <= 14; i++) uiPluck(t + i * 0.034, degMidi(i), 0.12 + i * 0.02, -0.5 + i / 14);
    stats.ui++;
  }
  function close() {
    const t = now();
    uiPluck(t, degMidi(4), 0.3, 0.1, 'pluck');
    uiPluck(t + 0.09, degMidi(0), 0.3, -0.1, 'pluck');
    const v = kit.voice(uiBus);
    kit.noiseBurst(v, v.out, t, { type: 'lowpass', freq: 400, Q: 0.7, peak: 0.12, attack: 0.01, decay: 0.08 });
    stats.ui++;
  }

  return { update, stats, grunt, jump, land, propHit, click, chime, openGliss, close };
}
