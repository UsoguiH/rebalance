// Procedural soundtrack: a soft 120-BPM bed plus sound design cut to the picture.
// Everything is synthesised with the Web Audio API; there are no audio files.
import { DURATION } from './main.js';

const SR = 44100, BPM = 120, BEAT = 60 / BPM, T0 = 1.35; // downbeats land on 3.35, 5.35, 7.35 ...
const midi = (n) => 440 * Math.pow(2, (n - 69) / 12);

export async function renderSoundtrack() {
  const ac = new OfflineAudioContext(2, Math.ceil(SR * DURATION), SR);
  const master = ac.createGain(); master.gain.value = 0.7;
  const comp = ac.createDynamicsCompressor(); comp.threshold.value = -18; comp.ratio.value = 6; comp.attack.value = 0.004; comp.release.value = 0.18;
  master.connect(comp); comp.connect(ac.destination);
  const music = ac.createGain(); music.gain.value = 2.3; music.connect(master);
  const fx = ac.createGain(); fx.gain.value = 0.95; fx.connect(master);

  // shared noise
  const nb = ac.createBuffer(1, SR * 2, SR), nd = nb.getChannelData(0);
  let seed = 1234; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647) * 2 - 1;
  for (let i = 0; i < nd.length; i++) nd[i] = rnd();

  const env = (g, t, a, d, peak, sustain = 0.0001) => { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(Math.max(0.0001, sustain), t + a + d); };
  const pan = (node, p, dest) => { const s = ac.createStereoPanner(); s.pan.value = p; node.connect(s); s.connect(dest); return s; };

  function tone(t, freq, dur, { type = 'sine', vol = 0.2, a = 0.005, to = null, dest = fx, p = 0, detune = 0 } = {}) {
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t); o.detune.value = detune;
    if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur);
    env(g, t, a, dur, vol); o.connect(g); pan(g, p, dest); o.start(t); o.stop(t + dur + a + 0.05);
  }
  function noise(t, dur, { vol = 0.2, type = 'bandpass', f0 = 800, f1 = null, q = 1, a = 0.01, dest = fx, p = 0, p1 = null, shape = 'ad' } = {}) {
    const s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
    s.buffer = nb; s.loop = true; f.type = type; f.Q.value = q; f.frequency.setValueAtTime(f0, t);
    if (f1) f.frequency.exponentialRampToValueAtTime(f1, t + dur);
    if (shape === 'swell') { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + dur * 0.6); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); }
    else env(g, t, a, dur, vol);
    s.connect(f); f.connect(g);
    const sp = pan(g, p, dest); if (p1 != null) sp.pan.linearRampToValueAtTime(p1, t + dur);
    s.start(t, (t * 0.37) % 1.5); s.stop(t + dur + 0.1);
  }

  // ---- sound design primitives -------------------------------------------------------------
  const whoosh = (t, dur = 0.45, vol = 0.3, up = true) => noise(t, dur, { vol, f0: up ? 300 : 5000, f1: up ? 5200 : 350, q: 0.9, shape: 'swell', p: up ? -0.7 : 0.7, p1: up ? 0.7 : -0.7 });
  const ding = (t, n = 88, vol = 0.14, p = 0) => { tone(t, midi(n), 0.32, { vol, p }); tone(t + 0.07, midi(n + 5), 0.4, { vol: vol * 0.9, p }); tone(t, midi(n + 12), 0.2, { vol: vol * 0.3, p }); };
  const pop = (t, n = 76, vol = 0.16, p = 0) => tone(t, midi(n) * 0.6, 0.09, { vol, to: midi(n) * 1.6, type: 'sine', a: 0.003, p });
  const tick = (t, vol = 0.08, p = 0) => noise(t, 0.025, { vol, type: 'highpass', f0: 3500, a: 0.001, p });
  const buzz = (t) => { for (let i = 0; i < 2; i++) tone(t + i * 0.13, 148, 0.1, { type: 'square', vol: 0.045, a: 0.01 }); };
  const impact = (t, vol = 0.5) => { tone(t, 150, 0.45, { vol, to: 38, a: 0.002 }); noise(t, 0.22, { vol: vol * 0.5, type: 'lowpass', f0: 2600, f1: 200, a: 0.002 }); noise(t, 0.5, { vol: vol * 0.16, type: 'highpass', f0: 5000, a: 0.002 }); };
  const riser = (t, dur) => { noise(t, dur, { vol: 0.2, f0: 400, f1: 7000, q: 2.5, shape: 'swell' }); tone(t, 220, dur, { type: 'sawtooth', vol: 0.05, to: 880, a: dur * 0.8 }); };
  const sparkle = (t, vol = 0.07) => { for (let i = 0; i < 9; i++) tone(t + i * 0.045, midi(84 + [0, 4, 7, 11, 12, 16, 19, 23, 24][i]), 0.5, { vol, p: (i % 2 ? 0.5 : -0.5) }); };
  const scratch = (t, dur) => { for (let k = 0; k < dur / 0.11; k++) noise(t + k * 0.11, 0.1, { vol: 0.035 + 0.02 * Math.sin(k), f0: 2400 + 500 * Math.sin(k * 1.7), q: 5, a: 0.02, p: -0.4 + (k / (dur / 0.11)) * 0.8 }); };

  // ---- music --------------------------------------------------------------------------------
  const duck = ac.createGain(); duck.connect(music); // side-chain pump on the kick
  const CH = [[53, 57, 60, 64], [55, 59, 62, 64], [52, 55, 59, 62], [57, 60, 64, 67]]; // Fmaj7 G6 Em7 Am7
  const bars = Math.ceil((DURATION - T0) / (BEAT * 4)) + 1;
  const section = (t) => (t < 3.3 ? 'intro' : t < 7.6 ? 'build' : t < 15.6 ? 'drop' : t < 18.6 ? 'air' : t < 23.3 ? 'drop2' : 'out');
  for (let b = -1; b < bars; b++) {
    const t = Math.max(0, T0 + b * BEAT * 4), ch = CH[((b % 4) + 4) % 4], sec = section(t + 0.05);
    if (t >= DURATION) break;
    const len = BEAT * 4;
    ch.forEach((n, i) => { // pad
      for (const det of [-7, 7]) {
        const o = ac.createOscillator(), g = ac.createGain(), f = ac.createBiquadFilter();
        o.type = 'sawtooth'; o.frequency.value = midi(n + 12); o.detune.value = det;
        f.type = 'lowpass'; f.frequency.value = sec === 'air' ? 2600 : sec === 'intro' ? 1100 : 1700; f.Q.value = 0.6;
        const v = (sec === 'out' ? 0.03 : 0.022);
        g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(v, t + 0.25); g.gain.setValueAtTime(v, t + len - 0.2); g.gain.linearRampToValueAtTime(0.0001, t + len + 0.25);
        o.connect(f); f.connect(g); pan(g, (i - 1.5) * 0.3, duck); o.start(t); o.stop(t + len + 0.3);
      }
    });
    if (sec === 'intro' || sec === 'out') continue;
    for (let s = 0; s < 8; s++) { // eighth notes
      const ts = t + s * BEAT / 2; if (ts >= DURATION - 0.05) break;
      const drums = sec === 'drop' || sec === 'drop2', light = sec === 'build';
      if (ts > 9.0 && ts < 9.5) continue; // leave the impact frames clean
      if ((drums && s % 2 === 0) || (light && s % 4 === 0)) { // kick
        tone(ts, 125, 0.22, { vol: drums ? 0.5 : 0.3, to: 42, a: 0.002, dest: music });
        duck.gain.setValueAtTime(0.45, ts); duck.gain.linearRampToValueAtTime(1, ts + 0.22);
      }
      if (drums && s % 4 === 2) { noise(ts, 0.16, { vol: 0.2, type: 'bandpass', f0: 1900, q: 0.8, a: 0.002, dest: music }); tone(ts, 190, 0.08, { vol: 0.1, to: 120, dest: music }); }
      if (sec !== 'air') noise(ts, s % 2 ? 0.05 : 0.03, { vol: (drums ? 0.07 : 0.04) * (s % 2 ? 1 : 0.6), type: 'highpass', f0: 7500, a: 0.001, dest: music, p: s % 2 ? 0.3 : -0.3 });
      if (sec !== 'air' && [0, 3, 6].includes(s)) tone(ts, midi(ch[0] - 12), 0.26, { type: 'triangle', vol: 0.2, a: 0.006, dest: music }); // bass
      if (sec === 'air' && s % 2 === 0) tone(ts, midi(ch[(s / 2) % 4] + 24), 0.5, { vol: 0.05, p: s % 4 ? 0.5 : -0.5, dest: music }); // arpeggio
      if (drums && [1, 4, 7].includes(s)) tone(ts, midi(ch[(s * 3) % 4] + 24), 0.14, { type: 'triangle', vol: 0.045, dest: music, p: 0.4 }); // pluck
    }
  }

  // ---- picture-locked sound design ------------------------------------------------------------
  buzz(0.9); [0.92, 1.02, 1.5, 1.66].forEach((t, i) => ding(t, 86 + (i % 2) * 2, 0.12, i % 2 ? 0.5 : -0.5));
  buzz(1.52); ding(2.05, 91, 0.17); whoosh(1.6, 0.6, 0.14);
  whoosh(3.0, 0.5, 0.32); whoosh(5.25, 0.45, 0.2); whoosh(5.9, 0.5, 0.22, false);
  pop(5.92, 72, 0.14); riser(6.35, 0.95);
  tick(7.3, 0.4); tone(7.3, 1900, 0.03, { vol: 0.16, a: 0.001 }); impact(7.31, 0.42); sparkle(7.34, 0.05);
  whoosh(7.6, 0.4, 0.34); impact(7.66, 0.5);
  for (let i = 0; i < 13; i++) tick(7.86 + i * 0.035, 0.07, -0.6);
  whoosh(8.75, 0.35, 0.3); impact(9.05, 0.5); impact(9.2, 0.42); impact(9.36, 0.6);
  whoosh(9.86, 0.3, 0.2, false); scratch(10.05, 1.25); whoosh(11.3, 0.3, 0.26); impact(11.5, 0.4);
  scratch(11.78, 0.8); pop(12.6, 79, 0.12); whoosh(12.7, 0.75, 0.24);
  whoosh(13.45, 0.6, 0.26, false); [13.7, 13.95, 14.2, 14.45].forEach((t, i) => noise(t, 0.2, { vol: 0.09, f0: 1500 + i * 300, q: 1.5, shape: 'swell', p: 0.8, p1: -0.8 }));
  pop(14.64, 60, 0.3); [15.07, 15.1, 15.14, 15.17].forEach((t, i) => pop(t, 67 + i * 4, 0.2, -0.5 + i * 0.33));
  whoosh(15.3, 0.4, 0.3); impact(15.67, 0.5); sparkle(15.85, 0.05);
  pop(16.47, 81, 0.12, -0.4); pop(16.69, 84, 0.12, 0.4); whoosh(17.3, 0.35, 0.16);
  whoosh(17.45, 0.5, 0.2, false); for (let i = 0; i < 8; i++) tick(17.82 + i * 0.045, 0.06, 0.6);
  whoosh(18.45, 0.35, 0.24); pop(18.7, 64, 0.22); whoosh(19.0, 0.7, 0.14, false);
  pop(19.47, 72, 0.18); [19.55, 19.62, 19.69].forEach((t, i) => pop(t, 79 + i * 3, 0.12, i - 1));
  whoosh(20.0, 0.4, 0.26); whoosh(20.4, 0.3, 0.3, false);
  [0, 1, 2, 3, 4, 5].forEach((i) => pop(20.99 + i * 0.085, 76 + i * 2, 0.13, -0.6 + i * 0.24));
  [20.89, 21.03, 21.17].forEach((t) => tick(t, 0.1));
  impact(21.67, 0.5); impact(21.84, 0.42); impact(22.0, 0.42);
  pop(22.2, 69, 0.16); whoosh(22.6, 0.5, 0.36); impact(23.17, 0.5);
  whoosh(23.3, 0.35, 0.16, false); noise(23.74, 0.95, { vol: 0.07, f0: 1800, f1: 3400, q: 1.2, shape: 'swell', p: -0.5, p1: 0.5 });
  [0, 4, 7, 12].forEach((n, i) => tone(24.63 + i * 0.03, midi(77 + n), 1.1, { vol: 0.1, p: (i - 1.5) * 0.35 })); sparkle(24.66, 0.045);

  // fade the tail
  master.gain.setValueAtTime(0.7, DURATION - 0.5); master.gain.linearRampToValueAtTime(0.0001, DURATION);
  return ac.startRendering();
}

export function toWav(buf) {
  const ch = buf.numberOfChannels, n = buf.length, out = new DataView(new ArrayBuffer(44 + n * ch * 2));
  const w = (o, s) => { for (let i = 0; i < s.length; i++) out.setUint8(o + i, s.charCodeAt(i)); };
  w(0, 'RIFF'); out.setUint32(4, 36 + n * ch * 2, true); w(8, 'WAVEfmt '); out.setUint32(16, 16, true); out.setUint16(20, 1, true);
  out.setUint16(22, ch, true); out.setUint32(24, buf.sampleRate, true); out.setUint32(28, buf.sampleRate * ch * 2, true);
  out.setUint16(32, ch * 2, true); out.setUint16(34, 16, true); w(36, 'data'); out.setUint32(40, n * ch * 2, true);
  const data = Array.from({ length: ch }, (_, c) => buf.getChannelData(c));
  let o = 44;
  for (let i = 0; i < n; i++) for (let c = 0; c < ch; c++) { out.setInt16(o, Math.max(-1, Math.min(1, data[c][i])) * 32767, true); o += 2; }
  return out.buffer;
}
