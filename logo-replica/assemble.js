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
  // Gaps between ink boxes in the original logo, measured by fitting each
  // letter to the trace's last frame (to a hundredth of a unit).
  const ORIGINAL_GAP = { sl: -12.9, la: 1.9, aa: 4.21, ac: 3.09, ce: 2.5 };

  // Spacing between two glyphs of the built font: the original's own gaps
  // between its letters (3 units for pairs it does not have), otherwise as
  // close as their ink allows with a 3-unit gap, never wider than the ink
  // boxes plus 3 and never more than 14 units tighter.
  function advance(F, a, b) {
    const A = F.glyphs[a], B = F.glyphs[b];
    if ('slace'.includes(a) && 'slace'.includes(b)) return A.w + (ORIGINAL_GAP[a + b] != null ? ORIGINAL_GAP[a + b] : 3);
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
  // frame to frame. Pieces more than 1.2 x-heights from the letter are left
  // out: they are half-size copies the fit threw onto another letter's place
  // (up to 2.5 x-heights away), which on a typed word fly off past its ends.
  // Leaving them out changes the replay of "slaace" by 0.04 levels in 255.
  // `lead` is how many frames the clip starts before the letter's place in
  // the stagger (its time origin), so a word whose letters sit where the
  // original's did replays the original's timing exactly.
  function buildClips(M) {
    const s0 = M.letters[0].pos;
    return M.letters.map((L, k) => {
      const keep = (p) => p[1] === k && Math.hypot(p[4], p[5]) < 1.2;
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
      return { ch: L.ch, on, lead: origin - on, frames, len, creamFull };
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

  // One requestAnimationFrame loop drives every playing instance on the page.
  const ticking = new Set();
  let instances = 0;
  let rafId = 0;
  function loop(now) {
    rafId = 0;
    for (const fn of Array.from(ticking)) {
      // one failing callback must not stop the others, or the loop itself
      try { fn(now); } catch (e) { setTimeout(() => { throw e; }); }
    }
    // a callback may have started the loop again already (play() in onUpdate)
    if (ticking.size && !rafId) rafId = requestAnimationFrame(loop);
  }
  function startTicking(fn) { ticking.add(fn); if (!rafId) rafId = requestAnimationFrame(loop); }
  function stopTicking(fn) { ticking.delete(fn); }

  function hashPick(ch) {
    const keys = 'abcdefghijklmnopqrstuvwxyz';
    let h = 0;
    for (const c of ch) h = (h * 31 + c.codePointAt(0)) >>> 0;
    return keys[h % keys.length];
  }

  function create(container, options) {
    const o = Object.assign({
      word: 'slaace', font: 'slaace', registered: true, speed: 1, loop: true, exact: true, still: false,
      maxFps: 0,   // redraw at most this often (0: every screen refresh)
      colors: {}, onUpdate: null, onReady: null,
    }, options || {});
    const colors = Object.assign({}, COLORS, o.colors);
    const data = root.SLAACE_MOTION;
    if (!data) throw new Error('LogoAssemble needs motion.data.js');
    const clips = buildClips(data);

    const canvas = document.createElement('canvas');
    canvas.setAttribute('role', 'img');
    canvas.setAttribute('aria-label', 'Animated wordmark');
    // Positioned absolutely, so its fixed size never holds the container open
    // (the container must be able to shrink, or the resize never comes).
    canvas.style.cssText = 'display:block;position:absolute';
    container.appendChild(canvas);
    const ctx = canvas.getContext('2d');

    let scene = null, frame = 0, playing = false, last = 0, token = 0;
    // A capped player draws once per time slot, offset from the others' slots,
    // so players take turns even after a long frame (they never fall in step).
    const phase = instances++ * 7;
    let slot = -1;
    let drawn = -1;   // frame last drawn, or -1 when the canvas must be redrawn
    let drawnLook = '';   // colours and options the last drawing used

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
      letters.forEach((q, i) => {
        q.i = i;
        q.cx = q.x + (q.l + q.r) / 2; q.cy = (q.t + q.b) / 2;
        // slices only need to reach the corners of the letter's own box
        q.rad = Math.hypot((q.r - q.l) / 2, (q.b - q.t) / 2) * 1.05 + xh * 0.05;
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
        paint: reach(letters, xh, { x: x0, y: top, r: x1, b: bot }),
        trace: null,
      };
      // The original word in the original letterforms plays the frame-exact trace.
      const T = root.SLAACE;
      if (o.exact && font.glyphs && T && letters.map((q) => q.ch).join('') === 'slaace') {
        S.trace = T.frames.map((layers) => layers.map((levels) => levels.map(([op, d]) => [op, new Path2D(d)])));
        S.traceSeq = T.sequence;
        S.frames = FRAMES;
      }
      S.still = stillFrom(S);
      return S;
    }

    // The box every piece of the word's clips stays inside, together with the
    // word itself and the wave and ® around it. A piece is its letter clipped
    // to slices of radius q.rad round the letter's centre, then rotated,
    // scaled and moved, so it lies within those sectors turned by its rotation
    // and scaled by its scale. (Interpolated frames lie between two such
    // pieces; the 4% margin covers the sweep between them.)
    function reach(letters, xh, box) {
      let x = box.x - xh * 0.6, y = Math.min(box.y, -xh * 1.4), r = box.r + xh * 1.1, b = box.b + xh * 0.2;
      const add = (px, py) => { x = Math.min(x, px); r = Math.max(r, px); y = Math.min(y, py); b = Math.max(b, py); };
      for (const q of letters) {
        for (const fr of q.clip.frames) {
          for (const p of fr) {
            const th = q.mirror ? -p[1] : p[1], R = q.rad * p[2] * 1.04;
            const px = q.cx + (q.mirror ? -p[3] : p[3]) * xh, py = q.cy + p[4] * xh;
            add(px, py);
            for (let [a0, a1] of p[6]) {
              if (a1 - a0 >= 359.5) { a0 = 0; a1 = 360; }
              if (q.mirror) [a0, a1] = [180 - a1, 180 - a0];
              // sector ends, every 10 degrees, and the axis directions inside it
              const angles = [a0, a1];
              for (let a = Math.ceil(a0 / 10) * 10; a < a1; a += 10) angles.push(a);
              for (const a of angles) add(px + R * Math.cos((a + th) * DEG), py + R * Math.sin((a + th) * DEG));
            }
          }
        }
      }
      return { x, y, r, b };
    }

    // The first frame from which nothing on the canvas changes any more: every
    // clip has ended, the wave has gone and the registered mark is fully in.
    // Playback stops redrawing from there until the loop starts again.
    function stillFrom(S) {
      const ro = data.registered.opacity;
      let reg = 0;
      for (let i = ro.length - 1; i > 0; i--) if (ro[i] !== ro[i - 1]) { reg = i + 1; break; }
      let t = S.frames - FRAMES + reg;
      if (S.trace) {
        let i = S.traceSeq.length - 1;
        while (i > 0 && S.traceSeq[i - 1] === S.traceSeq[i]) i--;
        const wl = data.wave.frames.reduce((m, w, k) => (w ? k : m), 0) + 1;
        return Math.max(t, i, wl);
      }
      S.letters.forEach((q) => { t = Math.max(t, q.start + q.clip.len / q.speed); });
      for (let f = S.frames; f > 0; f -= 0.25) if (waveAt(S, f - S.t0)) { t = Math.max(t, f + 0.25); break; }
      return Math.min(S.frames, Math.ceil(t));
    }

    // Clip to the angular slices of one piece, around the letter's centre.
    // The path is built in place each time: it is a handful of points.
    function clipSlices(q, runs, mirror) {
      if (runs.length === 1 && runs[0][1] - runs[0][0] >= 359.5) return;
      const R = q.rad;
      ctx.beginPath();
      for (let [a0, a1] of runs) {
        if (mirror) [a0, a1] = [180 - a1, 180 - a0];
        ctx.moveTo(q.cx, q.cy);
        const n = Math.max(2, Math.ceil((a1 - a0) / 10));
        for (let i = 0; i <= n; i++) {
          const a = (a0 + ((a1 - a0) * i) / n) * DEG;
          ctx.lineTo(q.cx + R * Math.cos(a), q.cy + R * Math.sin(a));
        }
        ctx.closePath();
      }
      ctx.clip();
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
      const w = waveAt(scene, t);
      if (w) strokeWave(w.pts, w.op);
    }

    function waveAt(S, t) {
      const { xh, x0, x1, W } = S;
      const wf = data.wave.frames, wx = data.width_xh;
      const last = wf.reduce((m, w, i) => (w ? i : m), 0);
      const at = (f) => {
        const f0 = Math.max(0, Math.min(last, Math.floor(f))), f1 = Math.min(last, f0 + 1), u = clamp01(f - f0);
        const a = wf[f0] || wf[f1], b = wf[f1] || a;
        return a.map((x, i) => lerp(x, b[i], u));
      };
      if (t < 0) return null;
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
      if (head <= tail || op <= 0.01) return null;
      const cx = x0 + crest * wx * fit * xh;
      const n = Math.max(8, Math.ceil((head - tail) / 0.08));
      const pts = [];
      for (let i = 0; i <= n; i++) {
        const x = x0 + (tail + ((head - tail) * i) / n) * xh;
        pts.push([x, (yc - amp * Math.cos((2 * Math.PI * (x - cx)) / (lam * xh))) * xh]);
      }
      return { pts, op };
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

    const look = () => `${colors.green}|${colors.cream}|${o.registered}|${o.still}`;

    function render() {
      drawn = frame; drawnLook = look();
      const w = canvas.width, h = canvas.height;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, w, h);
      if (!scene) return;
      const F = fit;
      ctx.setTransform(F.k * F.dpr, 0, 0, F.k * F.dpr, F.ox * F.dpr, F.oy * F.dpr);
      const { xh, x1 } = scene;

      if (o.still) {
        // the finished wordmark, without motion
        ctx.fillStyle = colors.cream;
        scene.letters.forEach(drawGlyph);
      } else if (scene.trace) {
        const fi = Math.min(FRAMES - 1, Math.floor(frame));
        const layers = scene.trace[scene.traceSeq[fi]];
        ctx.save(); ctx.translate(-354.2, -416);   // the s's ink edge and the baseline in the trace
        layers.forEach((levels, ink) => {
          ctx.fillStyle = ink ? colors.cream : colors.green;
          for (const [op, p] of levels) { ctx.globalAlpha = op; ctx.fill(p, 'evenodd'); }
        });
        ctx.restore(); ctx.globalAlpha = 1;
        drawTraceWave(frame);
      } else {
        // Once a letter is fully cream under its settling copies, draw it as a
        // base, so no background shows between slices. (A green base before
        // that would show as green rims round the springing cream copy, which
        // the original does not have.)
        scene.letters.forEach((q) => {
          if ((frame - q.start) * q.speed >= q.clip.creamFull + 2) { ctx.fillStyle = colors.cream; drawGlyph(q); }
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
          clipSlices(q, runs, q.mirror);
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
          ctx.globalAlpha = op; ctx.strokeStyle = colors.cream; ctx.lineJoin = 'round'; ctx.lineCap = 'butt';
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

    // The word is scaled to fit its view box in the container. The canvas
    // covers only where pieces can reach (scene.paint), within the container,
    // so a tall phone screen does not make it clear and composite empty space.
    let fit = { k: 1, dpr: 1, ox: 0, oy: 0 };
    let autoHeight = false;   // the container had no height of its own: give it the word's
    function resize() {
      if (!container.isConnected) return;   // laid out once it is in the document (ResizeObserver)
      const cs = getComputedStyle(container);
      // the canvas is positioned against the container
      if (cs.position === 'static') container.style.position = 'relative';
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const padL = parseFloat(cs.paddingLeft) || 0, padT = parseFloat(cs.paddingTop) || 0;
      const cw = Math.max(1, container.clientWidth - padL - (parseFloat(cs.paddingRight) || 0));
      let ch = container.clientHeight - padT - (parseFloat(cs.paddingBottom) || 0);
      if (scene && (autoHeight || ch < 2)) {
        autoHeight = true;
        ch = Math.max(1, Math.round((cw * scene.view.h) / scene.view.w));
        // min-height counts padding and borders too when the box is border-box
        const extra = cs.boxSizing === 'border-box'
          ? padT + (parseFloat(cs.paddingBottom) || 0) + (parseFloat(cs.borderTopWidth) || 0) + (parseFloat(cs.borderBottomWidth) || 0) : 0;
        container.style.minHeight = ch + extra + 'px';
      }
      ch = Math.max(1, ch);
      let left = 0, top = 0, dw = cw, dh = ch, k = 1, cx = 0, cy = 0;
      if (scene) {
        const v = scene.view, P = scene.paint;
        k = Math.min(cw / v.w, ch / v.h);
        cx = (cw - v.w * k) / 2 - v.x * k; cy = (ch - v.h * k) / 2 - v.y * k;   // unit 0 in container px
        left = Math.max(0, Math.floor(P.x * k + cx)); top = Math.max(0, Math.floor(P.y * k + cy));
        dw = Math.max(1, Math.min(cw, Math.ceil(P.r * k + cx)) - left);
        dh = Math.max(1, Math.min(ch, Math.ceil(P.b * k + cy)) - top);
      }
      fit = { k, dpr, ox: cx - left, oy: cy - top };
      const w = Math.round(dw * dpr), h = Math.round(dh * dpr);
      if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
      const st = canvas.style;
      st.width = dw + 'px'; st.height = dh + 'px'; st.left = left + padL + 'px'; st.top = top + padT + 'px';
      render();
    }
    let ro = null;
    if (root.ResizeObserver) { ro = new ResizeObserver(resize); ro.observe(container); }

    function show(f) {
      frame = Math.max(0, Math.min(api.frames, f));
      // nothing moves after scene.still: keep what is on the canvas
      if (!(scene && drawn >= 0 && drawn >= scene.still && frame >= scene.still && drawnLook === look())) render();
      if (o.onUpdate) o.onUpdate(frame, api.frames);
    }

    function tick(now) {
      if (!playing) { stopTicking(tick); return; }
      const dt = Math.max(0, Math.min(0.1, (now - last) / 1000));
      last = now;
      const n = api.frames;
      let f = frame + dt * FPS * o.speed;
      if (f >= n) {
        if (!o.loop) { show(n); playing = false; stopTicking(tick); return; }
        f %= n;
      }
      if (o.maxFps) {
        const iv = 1000 / o.maxFps, s = Math.floor((now - (phase % iv)) / iv + 0.15);
        if (s === slot) { frame = f; return; }
        slot = s;
      }
      show(f);
    }

    const api = {
      play() {
        if (playing) return api;
        if (frame >= api.frames) frame = 0;
        playing = true; last = performance.now(); slot = -1;
        startTicking(tick);
        return api;
      },
      pause() { playing = false; stopTicking(tick); return api; },
      replay() { api.pause(); show(0); return api.play(); },
      seek(f) { show(f); return api; },
      set(opts) {
        opts = opts || {};
        Object.assign(o, opts);
        if (opts.colors) Object.assign(colors, opts.colors);
        drawn = -1;
        // colours and playback settings only need a redraw, not a new scene
        const light = ['colors', 'speed', 'loop', 'maxFps', 'registered', 'onUpdate', 'onReady'];
        const keys = Object.keys(opts);
        if (scene && keys.length && keys.every((k) => light.includes(k))) {
          render();
          if (o.onReady) o.onReady(api);
          return Promise.resolve(api);
        }
        return build();   // anything else, or set() with no options: lay the word out again
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
