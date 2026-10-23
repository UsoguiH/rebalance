/*
 * LogoAssemble: the slaace logo animation, replayed on any word.
 *
 * The motion is not invented. motion.data.js holds a rotoscope of the original
 * 25 fps animation: in every one of its 57 frames, each coloured piece was
 * matched to a copy of one of the six letters, moved by a similarity transform
 * (rotation, scale, shift) and clipped to the angular slices around the copy's
 * centre where the piece is visible. Pieces are faint cream ghosts, green
 * copies or cream copies, painted in that order. Each piece is linked to the
 * piece it becomes in the next frame, so playback interpolates between the
 * original's frames and runs at the screen's refresh rate. The wave is a sine
 * stroke fitted to every frame.
 *
 * A typed word reuses that data. Each of its letters takes the pieces of the
 * original letter nearest to it in the word (by position), shifted in time by
 * 20.8 frames per word width, which is how the original's letters are staggered.
 * Shifts and sizes are in x-heights, so the motion scales to any font.
 *
 * Everything is drawn on one <canvas>.
 */
(function (root) {
  'use strict';

  const FPS = 25;
  const FRAMES = 57;
  const STAGGER = 20.8;   // frames per word width between the first and last letter
  const COLORS = { bg: '#022713', cream: '#CDE4B1', green: '#18C76B' };
  const DEG = Math.PI / 180;

  const FONTS = {
    original: { label: 'Original letterforms (s l a c e)', original: true },
    anybody: { label: 'Anybody', family: 'Anybody', weight: 880, stretch: 'semi-expanded',
      css: 'Anybody:wdth,wght@50..150,100..900' },
    unbounded: { label: 'Unbounded', family: 'Unbounded', weight: 800, stretch: 'normal', css: 'Unbounded:wght@800' },
    bricolage: { label: 'Bricolage Grotesque', family: 'Bricolage Grotesque', weight: 800, stretch: 'normal',
      css: 'Bricolage+Grotesque:opsz,wght@96,800' },
    syne: { label: 'Syne', family: 'Syne', weight: 800, stretch: 'normal', css: 'Syne:wght@800' },
  };

  const lerp = (a, b, t) => a + (b - a) * t;

  function fontString(f, size) {
    return `${f.stretch && f.stretch !== 'normal' ? f.stretch + ' ' : ''}${f.weight} ${size}px "${f.family}"`;
  }

  function loadFont(font, text) {
    if (font.original || !font.css) return Promise.resolve();
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

  // Letters of the word with ink boxes, in a coordinate system where the
  // baseline is y = 0 and one x-height is `xh` units.
  function layout(word, font, data) {
    const chars = Array.from(word).filter((ch) => ch.trim());
    const G = data.glyphs;
    const useOriginal = font.original && chars.length && chars.every((ch) => G.letters[ch.toLowerCase()]);
    const letters = [];
    if (useOriginal) {
      let x = 0, prev = null;
      for (const ch0 of chars) {
        const ch = ch0.toLowerCase(), g = G.letters[ch];
        if (prev) x += (G.kern[prev + ch] != null ? G.kern[prev + ch] : G.gap);
        letters.push({ ch, path: new Path2D(g.d), x, l: 0, r: g.w, t: g.t, b: g.b });
        x += g.w; prev = ch;
      }
      return { letters, xh: G.xh, original: true };
    }
    const f = font.original ? FONTS.anybody : font;
    const c = document.createElement('canvas').getContext('2d');
    const size = 200;
    c.font = fontString(f, size);
    const xh = c.measureText('x').actualBoundingBoxAscent || size * 0.52;
    const all = Array.from(word);
    all.forEach((ch, i) => {
      if (!ch.trim()) return;
      const before = c.measureText(all.slice(0, i).join('')).width;
      const m = c.measureText(ch);
      letters.push({
        ch, font: fontString(f, size), x: before,
        l: -m.actualBoundingBoxLeft, r: m.actualBoundingBoxRight,
        t: -m.actualBoundingBoxAscent, b: m.actualBoundingBoxDescent,
      });
    });
    return { letters, xh, original: false };
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

  function create(container, options) {
    const o = Object.assign({
      word: 'slaace', font: 'original', registered: true, speed: 1, loop: true,
      colors: {}, onUpdate: null, onReady: null,
    }, options || {});
    const colors = Object.assign({}, COLORS, o.colors);
    const data = root.SLAACE_MOTION;
    if (!data) throw new Error('LogoAssemble needs motion.data.js');

    const canvas = document.createElement('canvas');
    canvas.setAttribute('role', 'img');
    canvas.setAttribute('aria-label', 'Animated wordmark');
    canvas.style.cssText = 'display:block;width:100%;height:100%';
    container.appendChild(canvas);
    const ctx = canvas.getContext('2d');

    let scene = null, frame = 0, playing = false, raf = 0, last = 0, token = 0;

    function build() {
      const my = ++token;
      const font = FONTS[o.font] || FONTS.original;
      return loadFont(font.original ? FONTS.anybody : font, o.word).then(() => {
        if (my !== token) return;
        const L = layout(o.word, font, data);
        scene = L.letters.length ? prepare(L) : null;
        resize();
        if (o.onReady) o.onReady(api);
      });
    }

    function prepare(L) {
      const { letters, xh } = L;
      const x0 = Math.min(...letters.map((q) => q.x + q.l));
      const x1 = Math.max(...letters.map((q) => q.x + q.r));
      const top = Math.min(...letters.map((q) => q.t)), bot = Math.max(...letters.map((q) => q.b));
      const W = x1 - x0;
      letters.forEach((q) => {
        q.cx = q.x + (q.l + q.r) / 2; q.cy = (q.t + q.b) / 2;
        q.pos = W > 0 ? (q.cx - x0) / W : 0.5;
        let k = 0, best = 1e9;
        data.letters.forEach((s, i) => { const dd = Math.abs(s.pos - q.pos); if (dd < best) { best = dd; k = i; } });
        q.src = k;
        q.shift = (q.pos - data.letters[k].pos) * STAGGER;
      });
      const S = {
        letters, xh, x0, x1, W,
        view: { x: x0 - xh * 0.55, y: top - xh * 0.7, w: W + xh * 1.4, h: bot - top + xh * 1.6 },
        trace: null, wedges: new Map(),
      };
      // the original word in its own letterforms plays the frame-exact trace
      const T = root.SLAACE;
      if (L.original && T && letters.map((q) => q.ch).join('') === 'slaace') {
        S.trace = T.frames.map((layers) => layers.map((levels) => levels.map(([op, d]) => [op, new Path2D(d)])));
        S.traceSeq = T.sequence;
      }
      return S;
    }

    function wedge(q, runs) {
      if (runs.length === 1 && runs[0][1] - runs[0][0] >= 359.5) return null;
      const key = q.cx + ',' + q.cy + '|' + runs.map((r) => r[0].toFixed(1) + '-' + r[1].toFixed(1)).join(',');
      let p = scene.wedges.get(key);
      if (p) return p;
      p = new Path2D();
      const R = scene.xh * 4;
      for (const [a0, a1] of runs) {
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
      if (q.path) { ctx.translate(q.x, 0); ctx.fill(q.path); ctx.translate(-q.x, 0); }
      else { ctx.font = q.font; ctx.fillText(q.ch, q.x, 0); }
    }

    // Pieces of one original letter at fractional source time fs.
    function piecesAt(src, fs) {
      const out = [];
      if (fs < 0) return out;
      if (fs >= FRAMES - 1) {
        for (const p of data.frames[FRAMES - 1]) if (p[1] === src) out.push(p);
        return out;
      }
      const f0 = Math.floor(fs), u = fs - f0;
      const A = data.frames[f0], B = data.frames[f0 + 1];
      const targeted = new Set();
      for (const p of A) {
        if (p[8] >= 0) targeted.add(p[8]);
        if (p[1] !== src) continue;
        if (p[8] >= 0) {
          const q = B[p[8]];
          const dth = ((q[2] - p[2] + 540) % 360) - 180;
          out.push([p[0], src, p[2] + dth * u, lerp(p[3], q[3], u), lerp(p[4], q[4], u), lerp(p[5], q[5], u),
            lerp(p[6], q[6], u), blendRuns(p[7], q[7], u)]);
        } else if (u < 0.5) out.push(p);
      }
      if (u >= 0.5) B.forEach((q, i) => { if (q[1] === src && !targeted.has(i)) out.push(q); });
      return out;
    }

    function render() {
      const w = canvas.width, h = canvas.height;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, w, h);
      if (!scene) return;
      const v = scene.view, k = Math.min(w / v.w, h / v.h);
      ctx.setTransform(k, 0, 0, k, (w - v.w * k) / 2 - v.x * k, (h - v.h * k) / 2 - v.y * k);
      const { xh, x0, x1, W } = scene;

      if (scene.trace) {
        const fi = Math.min(FRAMES - 1, Math.floor(frame));
        const layers = scene.trace[scene.traceSeq[fi]];
        ctx.save(); ctx.translate(-354, -416);
        layers.forEach((levels, ink) => {
          ctx.fillStyle = ink ? colors.cream : colors.green;
          for (const [op, p] of levels) { ctx.globalAlpha = op; ctx.fill(p, 'evenodd'); }
        });
        ctx.restore(); ctx.globalAlpha = 1;
      } else {
        // Once the original letter is fully green (later fully cream) underneath its moving
        // copies, draw that as a base, so no background shows through between slices.
        scene.letters.forEach((q) => {
          const fs = frame - q.shift, s = data.letters[q.src];
          const base = fs >= s.creamFull + 2 ? colors.cream : fs >= s.greenFull ? colors.green : null;
          if (base) { ctx.fillStyle = base; drawGlyph(q); }
        });
        const items = [];
        scene.letters.forEach((q) => { for (const p of piecesAt(q.src, frame - q.shift)) items.push([p, q]); });
        items.sort((a, b) => a[0][0] - b[0][0]);
        const fill = [colors.cream, colors.green, colors.cream];
        for (const [p, q] of items) {
          const [cls, , th, s, tx, ty, alpha, runs] = p;
          ctx.save();
          ctx.translate(q.cx + tx * xh, q.cy + ty * xh);
          ctx.rotate(th * DEG);
          ctx.scale(s, s);
          ctx.translate(-q.cx, -q.cy);
          const clip = wedge(q, runs);
          if (clip) ctx.clip(clip);
          ctx.globalAlpha = alpha;
          ctx.fillStyle = fill[cls];
          drawGlyph(q);
          ctx.restore();
        }
        ctx.globalAlpha = 1;
      }

      // wave, interpolated between the fitted frames
      const f0 = Math.floor(frame), u = frame - f0;
      const a = data.wave.frames[f0], b = data.wave.frames[Math.min(FRAMES - 1, f0 + 1)];
      const wv = a && b ? a.map((x, i) => lerp(x, b[i], u)) : (u < 0.5 ? a : b);
      if (wv) {
        const [yc, amp, lam, crest, xa, xb, op] = wv;
        const ax = x0 + xa * W, bx = x0 + xb * W, cx = x0 + crest * W;
        const n = Math.max(8, Math.ceil((bx - ax) / (xh * 0.05)));
        ctx.beginPath();
        for (let i = 0; i <= n; i++) {
          const x = ax + ((bx - ax) * i) / n;
          const y = (yc - amp * Math.cos((2 * Math.PI * (x - cx)) / (lam * xh))) * xh;
          i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
        }
        ctx.globalAlpha = op; ctx.strokeStyle = colors.green; ctx.lineWidth = data.wave.width * xh;
        ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.stroke(); ctx.globalAlpha = 1;
      }

      // registered mark
      if (o.registered) {
        const R = data.registered, ro = R.opacity;
        const op = lerp(ro[Math.min(ro.length - 1, f0)], ro[Math.min(ro.length - 1, f0 + 1)], u);
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
      frame = Math.max(0, Math.min(FRAMES, f));
      render();
      if (o.onUpdate) o.onUpdate(frame, FRAMES);
    }

    function tick(now) {
      if (!playing) return;
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      let f = frame + dt * FPS * o.speed;
      if (f >= FRAMES) {
        if (!o.loop) { show(FRAMES); playing = false; if (o.onUpdate) o.onUpdate(frame, FRAMES); return; }
        f %= FRAMES;
      }
      show(f);
      raf = requestAnimationFrame(tick);
    }

    const api = {
      play() { if (playing) return api; if (frame >= FRAMES) frame = 0; playing = true; last = performance.now(); raf = requestAnimationFrame(tick); return api; },
      pause() { playing = false; cancelAnimationFrame(raf); return api; },
      replay() { api.pause(); show(0); return api.play(); },
      seek(f) { show(f); return api; },
      set(opts) {
        Object.assign(o, opts || {});
        if (opts && opts.colors) Object.assign(colors, opts.colors);
        return build();
      },
      get frame() { return frame; },
      get frames() { return FRAMES; },
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

  root.LogoAssemble = { create, FONTS, COLORS, FRAMES, FPS };
})(typeof window !== 'undefined' ? window : this);
