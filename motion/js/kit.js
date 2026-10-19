// Kit: namespace, timing/easing, and the drawing helpers every scene shares.
// Everything is drawn in a 1920x1080 design space; render(t) is a pure function
// of time, so any frame can be scrubbed to or rendered offline.
(function () {
  const M = (window.M = {});
  M.W = 1920;
  M.H = 1080;
  M.FPS = 30;
  M.FONT = '"Inter", "SF Pro Display", system-ui, -apple-system, sans-serif';

  // ---------- math ----------
  M.clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  M.lerp = (a, b, t) => a + (b - a) * t;
  M.mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
  // progress of t through [a, b], clamped to 0..1
  M.prog = (t, a, b) => M.clamp((t - a) / (b - a), 0, 1);
  M.hash = (n) => {
    const x = Math.sin(n * 127.1 + 311.7) * 43758.5453123;
    return x - Math.floor(x);
  };
  M.rng = (seed) => {
    let a = seed >>> 0;
    const r = () => {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    r.range = (lo, hi) => lo + r() * (hi - lo);
    return r;
  };

  // ---------- easing ----------
  const E = (M.ease = {
    linear: (t) => t,
    inQuad: (t) => t * t,
    outQuad: (t) => 1 - (1 - t) * (1 - t),
    inOutQuad: (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
    inCubic: (t) => t * t * t,
    outCubic: (t) => 1 - Math.pow(1 - t, 3),
    inOutCubic: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
    outQuart: (t) => 1 - Math.pow(1 - t, 4),
    inQuart: (t) => t * t * t * t,
    inOutQuart: (t) => (t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2),
    outQuint: (t) => 1 - Math.pow(1 - t, 5),
    inOutQuint: (t) => (t < 0.5 ? 16 * t * t * t * t * t : 1 - Math.pow(-2 * t + 2, 5) / 2),
    outExpo: (t) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t)),
    inExpo: (t) => (t <= 0 ? 0 : Math.pow(2, 10 * t - 10)),
    inOutExpo: (t) =>
      t <= 0 ? 0 : t >= 1 ? 1 : t < 0.5 ? Math.pow(2, 20 * t - 10) / 2 : (2 - Math.pow(2, -20 * t + 10)) / 2,
    outBack: (t, s = 1.70158) => 1 + (s + 1) * Math.pow(t - 1, 3) + s * Math.pow(t - 1, 2),
    // critically-damped-ish spring settle with a small overshoot
    spring: (t, k = 7, d = 0.45) => 1 - Math.exp(-k * t) * Math.cos(k * t * (1 - d) * 1.6),
  });
  // eased value between keyframes: key(t, [[t0, v0], [t1, v1, ease], ...])
  M.key = (t, keys) => {
    if (t <= keys[0][0]) return keys[0][1];
    for (let i = 1; i < keys.length; i++) {
      const [t1, v1, ez] = keys[i];
      if (t <= t1) {
        const [t0, v0] = keys[i - 1];
        const p = (E[ez || 'inOutCubic'] || ez)((t - t0) / (t1 - t0));
        return v0 + (v1 - v0) * p;
      }
    }
    return keys[keys.length - 1][1];
  };
  // ease between a and b over [t0, t1]
  M.tw = (t, t0, t1, a, b, ez = 'inOutCubic') => a + (b - a) * (E[ez] || ez)(M.prog(t, t0, t1));

  // ---------- canvases ----------
  M.layer = (w = M.W, h = M.H) => {
    const cv = document.createElement('canvas');
    cv.width = w;
    cv.height = h;
    return cv;
  };
  // a cached offscreen picture, painted once by fn(ctx, w, h)
  const cache = {};
  M.pic = (name, w, h, fn) => {
    if (!cache[name]) {
      const cv = M.layer(w, h);
      fn(cv.getContext('2d'), w, h);
      cache[name] = cv;
    }
    return cache[name];
  };
  // a pool of scratch layers, reused per frame
  const pool = [];
  let poolTop = 0;
  M.scratch = () => {
    if (!pool[poolTop]) pool[poolTop] = M.layer();
    const cv = pool[poolTop++];
    const c = cv.getContext('2d');
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.globalAlpha = 1;
    c.globalCompositeOperation = 'source-over';
    c.filter = 'none';
    c.clearRect(0, 0, cv.width, cv.height);
    return cv;
  };
  M.releaseAll = () => (poolTop = 0);
  M.release = (n = 1) => (poolTop = Math.max(0, poolTop - n));

  // draw fn into a layer (inheriting ctx's transform), then composite it in
  // screen space with an optional blur/alpha
  M.withLayer = (ctx, fn, { blur = 0, alpha = 1, op } = {}) => {
    if (alpha <= 0.002) return;
    const cv = M.scratch();
    const l = cv.getContext('2d');
    l.setTransform(ctx.getTransform());
    fn(l);
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha *= alpha;
    if (op) ctx.globalCompositeOperation = op;
    if (blur > 0.3) ctx.filter = `blur(${blur}px)`;
    ctx.drawImage(cv, 0, 0);
    ctx.restore();
    M.release();
  };

  // camera-style motion blur: average n renders of fn(c, u) for u in [0, 1]
  M.motionBlur = (ctx, n, fn) => {
    if (n <= 1) return fn(ctx, 0.5);
    const acc = M.scratch();
    const ac = acc.getContext('2d');
    for (let i = 0; i < n; i++) {
      const cv = M.scratch();
      const l = cv.getContext('2d');
      l.setTransform(ctx.getTransform());
      fn(l, (i + 0.5) / n);
      ac.globalAlpha = 1 / (i + 1);
      ac.drawImage(cv, 0, 0);
      M.release();
    }
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(acc, 0, 0);
    ctx.restore();
    M.release();
  };

  // ---------- shapes ----------
  M.rr = (c, x, y, w, h, r) => {
    r = Math.max(0, Math.min(r, w / 2, h / 2));
    c.beginPath();
    c.moveTo(x + r, y);
    c.arcTo(x + w, y, x + w, y + h, r);
    c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r);
    c.arcTo(x, y, x + w, y, r);
    c.closePath();
  };
  M.fillRR = (c, x, y, w, h, r, fill) => {
    M.rr(c, x, y, w, h, r);
    c.fillStyle = fill;
    c.fill();
  };
  M.strokeRR = (c, x, y, w, h, r, stroke, lw) => {
    M.rr(c, x, y, w, h, r);
    c.strokeStyle = stroke;
    c.lineWidth = lw;
    c.stroke();
  };
  M.vgrad = (c, y0, y1, stops) => {
    const g = c.createLinearGradient(0, y0, 0, y1);
    stops.forEach(([o, col]) => g.addColorStop(o, col));
    return g;
  };
  M.hgrad = (c, x0, x1, stops) => {
    const g = c.createLinearGradient(x0, 0, x1, 0);
    stops.forEach(([o, col]) => g.addColorStop(o, col));
    return g;
  };
  M.rgrad = (c, x, y, r0, r1, stops) => {
    const g = c.createRadialGradient(x, y, r0, x, y, r1);
    stops.forEach(([o, col]) => g.addColorStop(o, col));
    return g;
  };
  M.rgba = (rgb, a) => `rgba(${rgb[0] | 0},${rgb[1] | 0},${rgb[2] | 0},${a})`;

  // ---------- text ----------
  // a piece can remap every weight at once (e.g. a lighter cut of the whole film)
  M.weight = (w) => w;
  M.font = (size, weight = 400) => `${M.weight(weight)} ${size}px ${M.FONT}`;
  M.setFont = (c, size, weight = 400, track = 0) => {
    c.font = M.font(size, weight);
    if ('letterSpacing' in c) c.letterSpacing = `${track * size}px`;
    c.textBaseline = 'alphabetic';
    c.textAlign = 'left';
  };
  // Inter sets ~7% wider than the SF Pro face of the original, so all text
  // is condensed horizontally to match its widths
  M.COND = 0.93;
  M.measure = (c, s, size, weight = 400, track = 0) => {
    M.setFont(c, size, weight, track);
    return c.measureText(s).width * M.COND;
  };
  // origin x that puts a glyph run's left ink edge at x (measured positions are ink edges)
  M.inkX = (c, s, x, size, weight = 400) => {
    M.setFont(c, size, weight, 0);
    return x + c.measureText(s).actualBoundingBoxLeft * M.COND;
  };
  M.text = (c, s, x, y, { size = 40, weight = 400, color = '#fff', align = 'left', track = 0, alpha = 1 } = {}) => {
    if (alpha <= 0.002) return 0;
    M.setFont(c, size, weight, track);
    const w = c.measureText(s).width * M.COND;
    const dx = align === 'center' ? -w / 2 : align === 'right' ? -w : 0;
    c.save();
    c.globalAlpha *= alpha;
    c.fillStyle = color;
    c.translate(x + dx, y);
    c.scale(M.COND, 1);
    c.fillText(s, 0, 0);
    c.restore();
    return w;
  };

  // A word that "blurs in": fades up from a soft blur while sliding into place.
  // p is 0..1 progress of its entrance.
  M.blurWord = (c, s, x, y, p, o) => {
    if (p <= 0) return;
    const blur = (1 - p) * (o.blurFrom ?? 14);
    const a = Math.min(1, p * 1.25);
    if (blur < 0.4) return M.text(c, s, x, y, Object.assign({}, o, { alpha: a * (o.alpha ?? 1) }));
    M.withLayer(c, (l) => M.text(l, s, x, y, Object.assign({}, o, { alpha: 1 })), { blur, alpha: a * (o.alpha ?? 1) });
  };

  // ---------- brand icons ----------
  // draws a Simple Icons mark (see js/icons.js) centred on (x, y), fitting a box of size s
  const iconPaths = {};
  M.icon = (c, slug, x, y, s, color) => {
    const ic = M.ICONS && M.ICONS[slug];
    if (!ic) return false;
    if (!iconPaths[slug]) iconPaths[slug] = new Path2D(ic.path);
    c.save();
    c.translate(x - s / 2, y - s / 2);
    c.scale(s / 24, s / 24);
    c.fillStyle = color || '#' + ic.hex;
    c.fill(iconPaths[slug]);
    c.restore();
    return true;
  };

  // ---------- cursor ----------
  // The macOS pointing-hand cursor: white glove, black outline, knuckle lines.
  // (x, y) is the fingertip. s is the scale (1 = 64px tall), press 0..1 squashes it.
  const HAND = new Path2D(
    'M13.5 2.2c-2.2 0-3.9 1.8-3.9 4v19.4l-2.3-2.5c-1.6-1.8-4.3-1.9-6-.3-1.6 1.5-1.8 3.9-.6 5.7l9.4 13.6c2.6 3.8 6.9 6 11.5 6h7.3' +
      'c7 0 12.6-5.6 12.6-12.6V24.3c0-2.1-1.7-3.8-3.8-3.8s-3.8 1.7-3.8 3.8v-1.6c0-2.1-1.7-3.8-3.8-3.8s-3.8 1.7-3.8 3.8v-1.4' +
      'c0-2.1-1.7-3.8-3.8-3.8-1.1 0-2 .4-2.7 1.1V6.2c0-2.2-1.8-4-4.1-4z'
  );
  M.cursor = (c, x, y, s = 1, { press = 0, alpha = 1, rot = 0, blur = 0 } = {}) => {
    if (alpha <= 0.01) return;
    const draw = (cc) => {
      cc.save();
      cc.translate(x, y);
      cc.rotate(rot);
      const sq = 1 - press * 0.12;
      cc.scale(s * 1.42 * sq, s * 1.42 * (1 - press * 0.08));
      cc.translate(-13.5, -2.2);
      // drop shadow
      cc.save();
      cc.translate(1.6, 2.2);
      cc.fillStyle = 'rgba(0,0,0,0.35)';
      cc.filter = `blur(${1.2 * s}px)`;
      cc.fill(HAND);
      cc.restore();
      cc.lineJoin = 'round';
      cc.lineWidth = 2.6;
      cc.strokeStyle = '#000';
      cc.stroke(HAND);
      cc.fillStyle = '#fff';
      cc.fill(HAND);
      // knuckle lines
      cc.strokeStyle = '#000';
      cc.lineWidth = 1.7;
      cc.lineCap = 'round';
      cc.beginPath();
      for (const lx of [21.2, 25.6, 30]) {
        cc.moveTo(lx, 29);
        cc.lineTo(lx, 37);
      }
      cc.stroke();
      cc.restore();
    };
    if (blur > 0.3) M.withLayer(c, draw, { blur, alpha });
    else {
      c.save();
      c.globalAlpha *= alpha;
      draw(c);
      c.restore();
    }
  };
  // cursor with directional motion blur (smear between two positions)
  M.cursorSmear = (c, x0, y0, x1, y1, s, o = {}) => {
    const n = Math.min(10, 1 + Math.round(Math.hypot(x1 - x0, y1 - y0) / 14));
    for (let i = 0; i < n; i++) {
      const u = n === 1 ? 1 : i / (n - 1);
      M.cursor(c, M.lerp(x0, x1, u), M.lerp(y0, y1, u), s, Object.assign({}, o, { alpha: (o.alpha ?? 1) * (n === 1 ? 1 : 1.6 / n) }));
    }
  };

  // ---------- frame furniture ----------
  // cinematic bars: h is the height of each bar in px
  M.bars = (c, top, bottom = top) => {
    c.fillStyle = '#000';
    if (top > 0.5) c.fillRect(0, 0, M.W, top);
    if (bottom > 0.5) c.fillRect(0, M.H - bottom, M.W, bottom);
  };
  // small caption under each showcased button, e.g. "[ Simple Button ]"
  M.caption = (c, s, { y = 1000, color = 'rgba(255,255,255,0.55)', alpha = 1 } = {}) => {
    M.text(c, `[ ${s} ]`, M.W / 2, y, { size: 13, weight: 400, color, align: 'center', alpha });
  };
})();

// ---------- tracks & lines (appended helpers) ----------
(function () {
  // smooth 2D path through timed points [[t, x, y], ...] (Catmull-Rom in time)
  M.track = (t, pts) => {
    if (t <= pts[0][0]) return [pts[0][1], pts[0][2]];
    const n = pts.length - 1;
    if (t >= pts[n][0]) return [pts[n][1], pts[n][2]];
    let i = 0;
    while (t > pts[i + 1][0]) i++;
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(n, i + 2)];
    const u = (t - p1[0]) / (p2[0] - p1[0]);
    const cr = (a, b, c, d) =>
      0.5 * (2 * b + (-a + c) * u + (2 * a - 5 * b + 4 * c - d) * u * u + (-a + 3 * b - 3 * c + d) * u * u * u);
    return [cr(p0[1], p1[1], p2[1], p3[1]), cr(p0[2], p1[2], p2[2], p3[2])];
  };

  // A line of words that appear one at a time. Each word fades up out of a
  // blur while sliding left into place, and the line re-centres as it grows.
  // words: [{ s, t0, dur?, weight?, color?, gap? }]; returns the word boxes.
  M.wordLine = (c, words, t, o) => {
    const size = o.size;
    const boxes = [];
    let total = 0;
    for (const w of words) {
      const p = M.clamp((t - w.t0) / (w.dur || o.dur || 0.3), 0, 1);
      const grow = M.ease.outCubic(p);
      const ww = w.width ?? M.measure(c, w.s, size, w.weight || o.weight || 400, o.track || 0);
      const gap = w.gap ?? o.gap ?? size * 0.28;
      boxes.push({ w, p, grow, ww, gap });
      total += (ww + gap) * grow;
    }
    if (boxes.length) total -= boxes[boxes.length - 1].gap * boxes[boxes.length - 1].grow;
    let x = o.align === 'left' ? o.x : o.x - total / 2;
    for (const b of boxes) {
      if (b.p > 0) {
        const slide = (1 - M.ease.outCubic(b.p)) * (o.slide ?? size * 0.9);
        const bx = x + slide;
        if (b.w.draw) b.w.draw(c, bx, o.y, b.p);
        else
          M.blurWord(c, b.w.s, bx, o.y, M.ease.outQuad(b.p), {
            size,
            weight: b.w.weight || o.weight || 400,
            color: b.w.color || o.color,
            track: o.track || 0,
            blurFrom: o.blurFrom ?? 16,
          });
        b.x = bx;
      }
      x += (b.ww + b.gap) * b.grow;
    }
    return boxes;
  };
})();
