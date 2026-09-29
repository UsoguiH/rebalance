// Shared Web Audio helpers: noise buffers, Karplus–Strong plucks, one-shot
// voices that clean up after themselves, tiny math helpers.

export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const lerp = (a, b, k) => a + (b - a) * k;
export const rand = (a, b) => a + Math.random() * (b - a);
export const pick = (arr) => arr[(Math.random() * arr.length) | 0];
export const smoothstep = (e0, e1, x) => {
  const k = clamp((x - e0) / (e1 - e0), 0, 1);
  return k * k * (3 - 2 * k);
};
export const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);

// Smooth 1-D value noise (0..1), for gusts and murmurs.
function h1(i) {
  const s = Math.sin(i * 127.1 + 17.3) * 43758.5453;
  return s - Math.floor(s);
}
export function noise1(x) {
  const i = Math.floor(x), f = x - i;
  const u = f * f * (3 - 2 * f);
  return h1(i) * (1 - u) + h1(i + 1) * u;
}

export function createKit(ac) {
  const sr = ac.sampleRate;
  const stats = { created: 0, active: 0, peakActive: 0 };

  // --- Noise buffers (built once, reused by every voice) -------------------
  function buffer(seconds, fill, channels = 1) {
    const n = Math.floor(sr * seconds);
    const b = ac.createBuffer(channels, n, sr);
    for (let c = 0; c < channels; c++) fill(b.getChannelData(c), n);
    return b;
  }
  const white = buffer(2, (d, n) => { for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1; });
  // Pink (Paul Kellet's economy filter), stereo so beds feel wide.
  const pink = buffer(4, (d, n) => {
    let b0 = 0, b1 = 0, b2 = 0;
    for (let i = 0; i < n; i++) {
      const w = Math.random() * 2 - 1;
      b0 = 0.99765 * b0 + w * 0.099046;
      b1 = 0.963 * b1 + w * 0.2965164;
      b2 = 0.57 * b2 + w * 1.0526913;
      d[i] = (b0 + b1 + b2 + w * 0.1848) * 0.2;
    }
    crossfadeLoop(d, n);
  }, 2);
  const brown = buffer(4, (d, n) => {
    let last = 0;
    for (let i = 0; i < n; i++) {
      last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02;
      d[i] = last * 3.2;
    }
    crossfadeLoop(d, n);
  }, 2);
  function crossfadeLoop(d, n) {
    // Remove the drift between the ends so the loop point doesn't click.
    const step = (d[n - 1] - d[0]) / (n - 1);
    for (let i = 0; i < n; i++) d[i] -= step * i;
  }

  // Impulse response for a small, warm courtyard reverb.
  const impulse = buffer(2.4, (d, n) => {
    let lp = 0;
    for (let i = 0; i < n; i++) {
      const t = i / n;
      lp += (Math.random() * 2 - 1 - lp) * (0.6 - 0.45 * t);
      d[i] = lp * Math.pow(1 - t, 2.6) * (i < sr * 0.012 ? i / (sr * 0.012) : 1);
    }
  }, 2);

  // --- Karplus–Strong plucked strings -------------------------------------
  // Buffers are rendered once per integer delay length and style; the exact
  // pitch (quarter tones included) comes from playbackRate.
  const ksCache = new Map();
  function ks(freq, style = 'oud') {
    const cfg = STYLES[style];
    const N = Math.max(8, Math.round(sr / freq - 0.5));
    const key = style + N;
    let b = ksCache.get(key);
    if (!b) {
      const n = Math.floor(sr * cfg.dur);
      b = ac.createBuffer(1, n, sr);
      const y = b.getChannelData(0);
      // Excitation: a filtered noise burst with a pick-position comb.
      let lp = 0;
      const exc = new Float32Array(N + 1);
      for (let i = 0; i <= N; i++) {
        lp += (Math.random() * 2 - 1 - lp) * cfg.bright;
        exc[i] = lp;
      }
      const p = Math.max(1, Math.floor(N * cfg.pick));
      for (let i = N; i >= p; i--) exc[i] -= exc[i - p] * 0.9;
      for (let i = 0; i <= N && i < n; i++) y[i] = exc[i];
      const g = cfg.decay, s = cfg.stretch;
      for (let i = N + 1; i < n; i++) y[i] = g * ((1 - s) * y[i - N] + s * y[i - N - 1]);
      let peak = 0;
      for (let i = 0; i < n; i++) peak = Math.max(peak, Math.abs(y[i]));
      const norm = peak > 0 ? 0.9 / peak : 1;
      const fade = Math.floor(sr * 0.05);
      for (let i = 0; i < n; i++) y[i] *= norm * (i > n - fade ? (n - i) / fade : 1);
      ksCache.set(key, b);
    }
    return { buffer: b, rate: freq / (sr / (N + 0.5)), dur: cfg.dur };
  }
  const STYLES = {
    oud: { dur: 1.8, decay: 0.994, stretch: 0.5, bright: 0.35, pick: 0.13 },
    qanun: { dur: 1.5, decay: 0.997, stretch: 0.42, bright: 0.75, pick: 0.21 },
    pluck: { dur: 0.7, decay: 0.99, stretch: 0.5, bright: 0.6, pick: 0.3 },
  };

  // --- Voices: a group of nodes disconnected when its sources end ---------
  function voice(dest) {
    const nodes = [];
    let pending = 0, done = false;
    const out = ac.createGain();
    out.connect(dest);
    nodes.push(out);
    stats.created++;
    stats.active++;
    stats.peakActive = Math.max(stats.peakActive, stats.active);
    const v = {
      out,
      end: 0,
      node(n) { nodes.push(n); return n; },
      gain(value = 1) { const g = ac.createGain(); g.gain.value = value; nodes.push(g); return g; },
      filter(type, freq, Q = 1) {
        const f = ac.createBiquadFilter();
        f.type = type; f.frequency.value = freq; f.Q.value = Q;
        nodes.push(f);
        return f;
      },
      panner(pan) {
        if (!ac.createStereoPanner) return null;
        const p = ac.createStereoPanner();
        p.pan.value = clamp(pan, -1, 1);
        nodes.push(p);
        return p;
      },
      osc(type, freq) { const o = ac.createOscillator(); o.type = type; o.frequency.value = freq; return o; },
      buf(buffer, loop = false) { const s = ac.createBufferSource(); s.buffer = buffer; s.loop = loop; return s; },
      // Start a source now-ish; the voice frees itself when the last one ends.
      play(src, t0, t1, offset) {
        nodes.push(src);
        pending++;
        v.end = Math.max(v.end, t1);
        src.onended = () => { if (--pending === 0) v.dispose(); };
        if (offset !== undefined) src.start(t0, offset); else src.start(t0);
        src.stop(t1);
        return src;
      },
      dispose() {
        if (done) return;
        done = true;
        stats.active--;
        for (const n of nodes) { try { n.disconnect(); } catch { /* already */ } }
      },
    };
    return v;
  }

  // Envelope helper on an AudioParam: quick attack, exponential decay.
  function env(param, t, peak, attack, decay, floor = 0.0001) {
    param.cancelScheduledValues(t);
    param.setValueAtTime(floor, t);
    param.linearRampToValueAtTime(peak, t + attack);
    param.setTargetAtTime(floor, t + attack, decay / 4);
  }

  // Noise burst: a random slice of the white buffer through a filter.
  function noiseBurst(v, dest, t, { type = 'bandpass', freq = 1000, Q = 1, peak = 0.5, attack = 0.002, decay = 0.1, sweepTo, buffer = white } = {}) {
    const src = v.buf(buffer, true);
    const f = v.filter(type, freq, Q);
    const g = v.gain(0);
    src.connect(f); f.connect(g); g.connect(dest);
    if (sweepTo) f.frequency.exponentialRampToValueAtTime(sweepTo, t + attack + decay);
    env(g.gain, t, peak, attack, decay);
    v.play(src, t, t + attack + decay * 1.3 + 0.02, Math.random() * (buffer.duration - 0.6));
    return { src, f, g };
  }

  return { ac, sr, stats, white, pink, brown, impulse, ks, voice, env, noiseBurst };
}
