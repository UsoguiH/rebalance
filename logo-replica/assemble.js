/*
 * LogoAssemble: the slaace logo animation, built letter by letter for any word.
 *
 * The motion is not invented. motion.data.js holds a rotoscope of the original
 * 25 fps animation: in every one of its 57 frames, each coloured piece was
 * matched to a copy of one of the six letters, moved by a similarity transform
 * (rotation, scale, shift) and clipped to the angular slices around the copy's
 * centre where the piece is visible. Pieces are faint cream ghosts, green
 * copies or cream copies, painted in that order. Each piece is linked to the
 * piece it becomes in the next frame, so playback interpolates between the
 * original's frames and runs at the screen's refresh rate.
 *
 * Every letter has its own animation. The six original letters (s, l, the two
 * a's, c, e) each give one clip: that letter's pieces from the frame it first
 * appears to the frame it settles, without pieces that belong to its
 * neighbours. Every glyph is assigned one clip, mirrored or not and played a
 * little faster or slower (CLIP_OF below), so an "o" always builds the same
 * way wherever it is. A letter starts 3.94 frames per x-height after the first
 * one, which is the stagger measured on the original. The wave passes over the
 * letters at that same speed.
 *
 * Shifts and sizes are in x-heights, so the motion fits any font. The default
 * font, font.data.js, is the original's s, l, a, c, e plus every other letter
 * built from their parts. Everything is drawn on one <canvas>.
 */
(function (root) {
  'use strict';

  const FPS = 25;
  const FRAMES = 57;               // length of the original
  const STAGGER = 20.8 / 5.283;    // frames per x-height between letters (20.8 per original word width)
  const COLORS = { bg: '#022713', cream: '#CDE4B1', green: '#18C76B' };
  const DEG = Math.PI / 180;
  const SPACE = 0.42;              // word space, in x-heights

  const FONTS = {
    slaace: { label: 'Slaace (built from the logo)', glyphs: true },
    anybody: { label: 'Anybody', family: 'Anybody', weight: 880, stretch: 'semi-expanded',
      css: 'Anybody:wdth,wght@50..150,100..900' },
    unbounded: { label: 'Unbounded', family: 'Unbounded', weight: 800, stretch: 'normal', css: 'Unbounded:wght@800' },
    bricolage: { label: 'Bricolage Grotesque', family: 'Bricolage Grotesque', weight: 800, stretch: 'normal',
      css: 'Bricolage+Grotesque:opsz,wght@96,800' },
    syne: { label: 'Syne', family: 'Syne', weight: 800, stretch: 'normal', css: 'Syne:wght@800' },
  };

  // The clip each glyph plays: [original letter (s, l, a, A = second a, c, e),
  // mirrored, speed]. A letter repeated straight after itself plays its
  // alternate: the second a of "slaace" has its own clip, others mirror.
  const CLIP_OF = {
    a: ['a', 0, 1], b: ['e', 1, 1.06], c: ['c', 0, 1], d: ['a', 1, 1], e: ['e', 0, 1],
    f: ['l', 1, 0.94], g: ['c', 1, 1.08], h: ['A', 1, 1], i: ['s', 1, 1], j: ['s', 1, 0.92],
    k: ['l', 1, 1.08], l: ['l', 0, 1], m: ['A', 1, 0.94], n: ['A', 0, 1], o: ['c', 1, 1],
    p: ['e', 1, 0.94], q: ['a', 1, 1.08], r: ['e', 1, 1], s: ['s', 0, 1], t: ['l', 1, 1],
    u: ['A', 0, 1.08], v: ['s', 0, 1.1], w: ['s', 1, 0.94], x: ['s', 0, 0.9], y: ['a', 0, 1.1],
    z: ['s', 1, 1.08],
    0: ['c', 1, 0.94], 1: ['l', 0, 0.94], 2: ['s', 0, 0.94], 3: ['e', 0, 0.94], 4: ['a', 1, 0.94],
    5: ['s', 1, 1.06], 6: ['c', 0, 1.06], 7: ['l', 1, 1.06], 8: ['e', 1, 1.06], 9: ['A', 0, 0.94],
    '.': ['l', 0, 1.1], ',': ['l', 1, 1.1], ':': ['s', 0, 1.1], ';': ['s', 1, 1.1], '!': ['l', 0, 0.9],
    '?': ['e', 1, 0.9], '-': ['c', 0, 1.1], "'": ['l', 1, 0.9],
  };
  const ALT = { a: ['A', 0, 1] };
  const SRC = { s: 0, l: 1, a: 2, A: 3, c: 4, e: 5 };

  const lerp = (a, b, t) => a + (b - a) * t;
  const clamp01 = (v) => Math.max(0, Math.min(1, v));

  function fontString(f, size) {
    return `${f.stretch && f.stretch !== 'normal' ? f.stretch + ' ' : ''}${f.weight} ${size}px "${f.family}"`;
  }

  function loadFont(font, text) {
    if (font.glyphs || !font.css) return Promise.resolve();
    const id = 'la-font-' + font.family.replace(/\s+/g, '-');
    if (!document.getElementById(id)) {
      const l = document.createElement('link');
      l.id = id; l.rel = 'stylesheet';
      l.href = `https://fonts.googleapis.com/css2?family=${font.css}&display=block`;
      document.head.appendChild(l);
    }
    const spec = fontString(font, 200);
    const tryLoad = () => (document.fonts ? document.fonts.load(spec, text || 'abc') : Promise.resolve([1]));
    return tryLoad()
      .then((r) => (r && r.length ? r : new Promise((ok) => setTimeout(ok, 350)).then(tryLoad)))
      .then((r) => (r && r.length ? r : new Promise((ok) => setTimeout(ok, 700)).then(tryLoad)))
      .catch(() => null);
  }

  // ------------------------------------------------------------------ layout
  // Spacing between two glyphs of the built font: the original's own rule for
  // its letters, otherwise as close as their ink allows with a 3-unit gap,
  // never wider than the ink boxes plus 3 and never more than 14 units tighter.
  function advance(F, a, b) {
    const A = F.glyphs[a], B = F.glyphs[b];
    if ('slace'.includes(a) && 'slace'.includes(b)) return A.w + 3 + (a + b === 'sl' ? -12.8 : 0);
    let m = -1e9;
    for (let i = 0; i < A.pr.length; i++) {
      if (A.pr[i] == null) continue;
      for (let j = Math.max(0, i - 1); j <= Math.min(B.pl.length - 1, i + 1); j++) {
        if (B.pl[j] != null) m = Math.max(m, A.pr[i] - B.pl[j] + 3);
      }
    }
    return m < -1e8 ? A.w + 3 : Math.min(A.w + 3, Math.max(A.w + 3 - 14, m));
  }

  // Letters of the word with ink boxes, in a coordinate system where the
  // baseline is y = 0 and one x-height is `xh` units.
  function layout(word, font) {
    const letters = [];
    const all = Array.from(word);
    const F = root.SLAACE_FONT;
    if (font.glyphs && F) {
      const xh = F.xh;
      let x = 0, prev = null, gap = false;
      for (const ch0 of all) {
        const ch = ch0.toLowerCase();
        const g = F.glyphs[ch];
        if (!g) { gap = letters.length > 0; continue; }
        if (prev) x += gap ? F.glyphs[prev].w + SPACE * xh : advance(F, prev, ch);
        letters.push({ ch, path: new Path2D(g.d), x, l: 0, r: g.w, t: g.t, b: g.b });
        prev = ch; gap = false;
      }
      return { letters, xh };
    }
    const c = document.createElement('canvas').getContext('2d');
    const size = 200;
    c.font = fontString(font, size);
    const xh = c.measureText('x').actualBoundingBoxAscent || size * 0.52;
    all.forEach((ch, i) => {
      if (!ch.trim()) return;
      const before = c.measureText(all.slice(0, i).join('')).width;
      const m = c.measureText(ch);
      letters.push({
        ch: ch.toLowerCase(), glyph: ch, font: fontString(font, size), x: before,
        l: -m.actualBoundingBoxLeft, r: m.actualBoundingBoxRight,
        t: -m.actualBoundingBoxAscent, b: m.actualBoundingBoxDescent,
      });
    });
    return { letters, xh };
  }

  // ------------------------------------------------------------------- clips
  // One clip per original letter: its pieces from its first frame on, linked
  // frame to frame. A few fits squeezed to the smallest scale far from the
  // letter, or thrown more than 1.3 x-heights away, are left out.
  // `lead` is how many frames the clip starts before the letter's place in
  // the stagger (its time origin), so a word whose letters sit where the
  // original's did replays the original's timing exactly.
  function buildClips(M) {
    const s0 = M.letters[0].pos;
    return M.letters.map((L, k) => {
      const keep = (p) => {
        if (p[1] !== k) return false;
        const d = Math.hypot(p[4], p[5]);
        return d < 1.3 && !(p[3] <= 0.51 && d > 0.6);
      };
      let on = M.frames.findIndex((fr) => fr.some(keep));
      if (on < 0) on = 0;
      const local = M.frames.map((fr) => {
        const idx = new Map();
        fr.forEach((p, i) => { if (keep(p)) idx.set(i, idx.size); });
        return idx;
      });
      const frames = [];
      for (let f = on; f < FRAMES; f++) {
        const nxt = local[f + 1];
        frames.push(M.frames[f].filter(keep).map((p) => {
          const n = nxt && p[8] >= 0 && nxt.has(p[8]) ? nxt.get(p[8]) : -1;
          return [p[0], p[2], p[3], p[4], p[5], p[6], p[7], n];
        }));
      }
      const origin = (L.pos - s0) * 20.8;
      // the clip ends once the cream copy's spring has died down
      const creamFull = L.creamFull - on;
      const len = Math.min(frames.length - 1, Math.ceil(creamFull) + 16);
      return { ch: L.ch, on, lead: origin - on, frames, len, greenFull: L.greenFull - on, creamFull };
    });
  }

  // Interpolate one piece's slices toward its next-frame form. Runs are only
  // blended when both frames have the same number of them; otherwise switch half way.
  function blendRuns(a, b, u) {
    if (!b || a.length !== b.length) return u < 0.5 ? a : b || a;
    return a.map(([a0, a1], i) => {
      let [b0, b1] = b[i];
      while (b0 - a0 > 180) { b0 -= 360; b1 -= 360; }
      while (a0 - b0 > 180) { b0 += 360; b1 += 360; }
      return [lerp(a0, b0, u), lerp(a1, b1, u)];
    });
  }

  // Pieces of a clip at fractional clip time fs: [class, rotation, scale, dx, dy, opacity, runs].
  function piecesAt(clip, fs) {
    const out = [];
    if (fs < 0) return out;
    const F = clip.frames;
    if (fs >= clip.len) return out;   // settled: the cream base is the letter
    const f0 = Math.floor(fs), u = fs - f0;
    const A = F[f0], B = F[f0 + 1];
    const targeted = new Set();
    for (const p of A) {
      if (p[7] >= 0) {
        targeted.add(p[7]);
        const q = B[p[7]];
        const dth = ((q[1] - p[1] + 540) % 360) - 180;
        out.push([p[0], p[1] + dth * u, lerp(p[2], q[2], u), lerp(p[3], q[3], u), lerp(p[4], q[4], u),
          lerp(p[5], q[5], u), blendRuns(p[6], q[6], u)]);
      } else if (u < 0.5) out.push(p);
    }
    if (u >= 0.5) B.forEach((q, i) => { if (!targeted.has(i)) out.push(q); });
    return out;
  }

  function hashPick(ch) {
    const keys = 'abcdefghijklmnopqrstuvwxyz';
    let h = 0;
    for (const c of ch) h = (h * 31 + c.codePointAt(0)) >>> 0;
    return keys[h % keys.length];
  }

  function create(container, options) {
    const o = Object.assign({
      word: 'slaace', font: 'slaace', registered: true, speed: 1, loop: true, exact: true, still: false,
      colors: {}, onUpdate: null, onReady: null,
    }, options || {});
    const colors = Object.assign({}, COLORS, o.colors);
    const data = root.SLAACE_MOTION;
    if (!data) throw new Error('LogoAssemble needs motion.data.js');
    const clips = buildClips(data);

    const canvas = document.createElement('canvas');
    canvas.setAttribute('role', 'img');
    canvas.setAttribute('aria-label', 'Animated wordmark');
    canvas.style.cssText = 'display:block;width:100%;height:100%';
    container.appendChild(canvas);
    const ctx = canvas.getContext('2d');

    let scene = null, frame = 0, playing = false, raf = 0, last = 0, token = 0;

    function build() {
      const my = ++token;
      const font = FONTS[o.font] || FONTS.slaace;
      return loadFont(font, o.word).then(() => {
        if (my !== token) return;
        const L = layout(o.word, font);
        scene = L.letters.length ? prepare(L, font) : null;
        frame = Math.min(frame, api.frames);
        resize();
        if (o.onReady) o.onReady(api);
      });
    }

    function prepare(L, font) {
      const { letters, xh } = L;
      const x0 = Math.min(...letters.map((q) => q.x + q.l));
      const x1 = Math.max(...letters.map((q) => q.x + q.r));
      const top = Math.min(-xh * 1.3, ...letters.map((q) => q.t)), bot = Math.max(0, ...letters.map((q) => q.b));
      const W = x1 - x0;
      let prev = null, end = 0, first = Infinity;
      letters.forEach((q) => {
        q.cx = q.x + (q.l + q.r) / 2; q.cy = (q.t + q.b) / 2;
        let [src, mirror, speed] = (prev === q.ch && ALT[q.ch]) || CLIP_OF[q.ch] || CLIP_OF[hashPick(q.ch)];
        if (prev === q.ch && !ALT[q.ch]) mirror = 1 - mirror;
        q.clip = clips[SRC[src]]; q.mirror = mirror; q.speed = speed;
        q.start = ((q.cx - letters[0].cx) / xh) * STAGGER - q.clip.lead / speed;
        first = Math.min(first, q.start);
        prev = q.ch;
      });
      // Frame 0 is the first letter's place in the stagger (the original's
      // frame 0), or up to 3 frames before it when a clip starts early.
      // The word holds for 19 frames once its last letter is cream, as the
      // original does.
      const shift = Math.max(first, -3);
      let settled = 0;
      letters.forEach((q) => {
        q.start -= shift;
        end = Math.max(end, q.start + q.clip.len / q.speed);
        settled = Math.max(settled, q.start + (q.clip.creamFull + 2) / q.speed);
      });
      end = Math.max(end + 1, settled + 19);
      const t0 = -shift;
      const S = {
        letters, xh, x0, x1, W, t0, frames: Math.ceil(end),
        view: { x: x0 - xh * 0.55, y: top - xh * 0.35, w: W + xh * 1.4, h: bot - top + xh * 0.85 },
        trace: null, wedges: new Map(),
      };
      // The original word in the original letterforms plays the frame-exact trace.
      const T = root.SLAACE;
      if (o.exact && font.glyphs && T && letters.map((q) => q.ch).join('') === 'slaace') {
        S.trace = T.frames.map((layers) => layers.map((levels) => levels.map(([op, d]) => [op, new Path2D(d)])));
        S.traceSeq = T.sequence;
        S.frames = FRAMES;
      }
      return S;
    }

    function wedge(q, runs, mirror) {
      if (runs.length === 1 && runs[0][1] - runs[0][0] >= 359.5) return null;
      const key = q.cx + ',' + q.cy + ',' + mirror + '|' + runs.map((r) => r[0].toFixed(1) + '-' + r[1].toFixed(1)).join(',');
      let p = scene.wedges.get(key);
      if (p) return p;
      p = new Path2D();
      const R = scene.xh * 4;
      for (let [a0, a1] of runs) {
        if (mirror) [a0, a1] = [180 - a1, 180 - a0];
        p.moveTo(q.cx, q.cy);
        const n = Math.max(2, Math.ceil((a1 - a0) / 5));
        for (let i = 0; i <= n; i++) {
          const a = (a0 + ((a1 - a0) * i) / n) * DEG;
          p.lineTo(q.cx + R * Math.cos(a), q.cy + R * Math.sin(a));
        }
        p.closePath();
      }
      if (scene.wedges.size > 4000) scene.wedges.clear();
      scene.wedges.set(key, p);
      return p;
    }

    function drawGlyph(q) {
      if (q.path) { ctx.translate(q.x, 0); ctx.fill(q.path, 'evenodd'); ctx.translate(-q.x, 0); }
      else { ctx.font = q.font; ctx.fillText(q.glyph, q.x, 0); }
    }

    function strokeWave(pts, op) {
      ctx.beginPath();
      pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
      ctx.globalAlpha = op; ctx.strokeStyle = colors.green; ctx.lineWidth = data.wave.width * scene.xh;
      ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.stroke(); ctx.globalAlpha = 1;
    }

    // The wave is the original's, fitted frame by frame, in x-heights from
    // the start of the word. Its tail sweeps right as the letters build. On a
    // word longer than the original the tail keeps going at the letters'
    // stagger speed and the head stays ahead of it; on a shorter one the
    // sweep is compressed to the word.
    function drawWave(t) {
      const { xh, x0, x1, W } = scene;
      const wf = data.wave.frames, wx = data.width_xh;
      const last = wf.reduce((m, w, i) => (w ? i : m), 0);
      const at = (f) => {
        const f0 = Math.max(0, Math.min(last, Math.floor(f))), f1 = Math.min(last, f0 + 1), u = clamp01(f - f0);
        const a = wf[f0] || wf[f1], b = wf[f1] || a;
        return a.map((x, i) => lerp(x, b[i], u));
      };
      if (t < 0) return;
      const fit = Math.min(1, W / (wx * xh));
      const settle = 20, v = 1 / STAGGER;             // x-heights per frame after the original's sweep
      let [yc, amp, lam, crest, xa, xb, op] = at(Math.min(t, last));
      let tail = xa * wx * fit, head = xb * wx * fit;
      const end = (x1 - x0) / xh + 0.95;
      if (fit === 1 && t > settle) {
        tail = at(settle)[4] * wx + v * (t - settle);
        head = Math.max(head, tail + 1.2);
        op = 0.8;
      }
      head = Math.min(head, end);
      op *= clamp01((head - tail) / 0.35);
      if (t > last && fit < 1) op = 0;
      if (head <= tail || op <= 0.01) return;
      const cx = x0 + crest * wx * fit * xh;
      const n = Math.max(8, Math.ceil((head - tail) / 0.05));
      const pts = [];
      for (let i = 0; i <= n; i++) {
        const x = x0 + (tail + ((head - tail) * i) / n) * xh;
        pts.push([x, (yc - amp * Math.cos((2 * Math.PI * (x - cx)) / (lam * xh))) * xh]);
      }
      strokeWave(pts, op);
    }

    // The original's wave, fitted frame by frame, for the exact "slaace".
    function drawTraceWave(f) {
      const { xh, x0, W } = scene;
      const f0 = Math.floor(f), u = f - f0;
      const a = data.wave.frames[f0], b = data.wave.frames[Math.min(FRAMES - 1, f0 + 1)];
      const wv = a && b ? a.map((x, i) => lerp(x, b[i], u)) : (u < 0.5 ? a : b);
      if (!wv) return;
      const [yc, amp, lam, crest, xa, xb, op] = wv;
      const ax = x0 + xa * W, bx = x0 + xb * W, cx = x0 + crest * W;
      const n = Math.max(8, Math.ceil((bx - ax) / (xh * 0.05)));
      const pts = [];
      for (let i = 0; i <= n; i++) {
        const x = ax + ((bx - ax) * i) / n;
        pts.push([x, (yc - amp * Math.cos((2 * Math.PI * (x - cx)) / (lam * xh))) * xh]);
      }
      strokeWave(pts, op);
    }

    function render() {
      const w = canvas.width, h = canvas.height;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, w, h);
      if (!scene) return;
      const v = scene.view, k = Math.min(w / v.w, h / v.h);
      ctx.setTransform(k, 0, 0, k, (w - v.w * k) / 2 - v.x * k, (h - v.h * k) / 2 - v.y * k);
      const { xh, x1 } = scene;

      if (o.still) {
        // the finished wordmark, without motion
        ctx.fillStyle = colors.cream;
        scene.letters.forEach(drawGlyph);
      } else if (scene.trace) {
        const fi = Math.min(FRAMES - 1, Math.floor(frame));
        const layers = scene.trace[scene.traceSeq[fi]];
        ctx.save(); ctx.translate(-354, -416);
        layers.forEach((levels, ink) => {
          ctx.fillStyle = ink ? colors.cream : colors.green;
          for (const [op, p] of levels) { ctx.globalAlpha = op; ctx.fill(p, 'evenodd'); }
        });
        ctx.restore(); ctx.globalAlpha = 1;
        drawTraceWave(frame);
      } else {
        // Once a letter is fully green (later fully cream) under its moving
        // copies, draw that as a base, so no background shows between slices.
        scene.letters.forEach((q) => {
          const fs = (frame - q.start) * q.speed, c = q.clip;
          const base = fs >= c.creamFull + 2 ? colors.cream : fs >= c.greenFull ? colors.green : null;
          if (base) { ctx.fillStyle = base; drawGlyph(q); }
        });
        const items = [];
        scene.letters.forEach((q) => {
          for (const p of piecesAt(q.clip, (frame - q.start) * q.speed)) items.push([p, q]);
        });
        items.sort((a, b) => a[0][0] - b[0][0]);
        const fill = [colors.cream, colors.green, colors.cream];
        for (const [p, q] of items) {
          const [cls, th0, s, tx0, ty, alpha, runs] = p;
          const th = q.mirror ? -th0 : th0, tx = q.mirror ? -tx0 : tx0;
          ctx.save();
          ctx.translate(q.cx + tx * xh, q.cy + ty * xh);
          ctx.rotate(th * DEG);
          ctx.scale(s, s);
          ctx.translate(-q.cx, -q.cy);
          const clip = wedge(q, runs, q.mirror);
          if (clip) ctx.clip(clip);
          ctx.globalAlpha = alpha;
          ctx.fillStyle = fill[cls];
          drawGlyph(q);
          ctx.restore();
        }
        ctx.globalAlpha = 1;
        drawWave(frame - scene.t0);
      }

      // registered mark: fades in as the last letter settles, as in the original
      if (o.registered) {
        const ro = data.registered.opacity, R = data.registered;
        const rf = frame - (scene.frames - FRAMES);
        const f0 = Math.floor(rf), u = rf - f0;
        const at = (i) => ro[Math.max(0, Math.min(ro.length - 1, i))];
        const op = lerp(at(f0), at(f0 + 1), u);
        if (op > 0.01) {
          const r = R.r * xh, mx = x1 + R.x * xh, my = R.y * xh;
          ctx.globalAlpha = op; ctx.strokeStyle = colors.cream; ctx.lineJoin = 'round';
          ctx.lineWidth = r * 0.24; ctx.beginPath(); ctx.arc(mx, my, r, 0, Math.PI * 2); ctx.stroke();
          ctx.lineWidth = r * 0.2; ctx.beginPath();
          ctx.moveTo(mx - r * 0.36, my + r * 0.52); ctx.lineTo(mx - r * 0.36, my - r * 0.52); ctx.lineTo(mx + r * 0.09, my - r * 0.52);
          ctx.arc(mx + r * 0.09, my - r * 0.21, r * 0.31, -Math.PI / 2, Math.PI / 2);
          ctx.lineTo(mx - r * 0.36, my + r * 0.1);
          ctx.moveTo(mx + r * 0.02, my - r * 0.1); ctx.lineTo(mx + r * 0.38, my + r * 0.52);
          ctx.stroke(); ctx.globalAlpha = 1;
        }
      }
    }

    function resize() {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const w = Math.max(1, Math.round(container.clientWidth * dpr)), h = Math.max(1, Math.round(container.clientHeight * dpr));
      if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
      render();
    }
    let ro = null;
    if (root.ResizeObserver) { ro = new ResizeObserver(resize); ro.observe(container); }

    function show(f) {
      frame = Math.max(0, Math.min(api.frames, f));
      render();
      if (o.onUpdate) o.onUpdate(frame, api.frames);
    }

    function tick(now) {
      if (!playing) return;
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      const n = api.frames;
      let f = frame + dt * FPS * o.speed;
      if (f >= n) {
        if (!o.loop) { show(n); playing = false; return; }
        f %= n;
      }
      show(f);
      raf = requestAnimationFrame(tick);
    }

    const api = {
      play() { if (playing) return api; if (frame >= api.frames) frame = 0; playing = true; last = performance.now(); raf = requestAnimationFrame(tick); return api; },
      pause() { playing = false; cancelAnimationFrame(raf); return api; },
      replay() { api.pause(); show(0); return api.play(); },
      seek(f) { show(f); return api; },
      set(opts) {
        Object.assign(o, opts || {});
        if (opts && opts.colors) Object.assign(colors, opts.colors);
        return build();
      },
      get frame() { return frame; },
      get frames() { return scene ? scene.frames : FRAMES; },
      get fps() { return FPS; },
      get playing() { return playing; },
      get canvas() { return canvas; },
      options: o,
      colors,
      ready: null,
      destroy() { api.pause(); if (ro) ro.disconnect(); canvas.remove(); },
    };
    api.ready = build();
    return api;
  }

  root.LogoAssemble = { create, FONTS, COLORS, FRAMES, FPS, CLIP_OF };
})(typeof window !== 'undefined' ? window : this);
