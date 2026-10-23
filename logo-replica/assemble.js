/*
 * LogoAssemble: the slaace logo animation, replayed on any word.
 *
 * The motion is not invented. motion.data.js holds a rotoscope of the original
 * 25 fps animation: in every one of its 57 frames, each coloured piece was
 * matched to a copy of one of the six letters, moved by a similarity transform
 * (rotation, scale, shift) and clipped to the angular sectors around the copy's
 * centre where the piece is visible. Pieces are faint cream ghosts, green
 * copies or cream copies, painted in that order. The wave is the centreline
 * traced from each frame.
 *
 * A typed word reuses that data. Each of its letters takes the pieces of the
 * original letter nearest to it in the word (by position), shifted in time by
 * 20.8 frames per word width, which is how the original's letters are staggered.
 * Shifts and sizes are in x-heights, so the motion scales to any font.
 */
(function (root) {
  'use strict';

  const NS = 'http://www.w3.org/2000/svg';
  const FPS = 25;
  const FRAMES = 57;
  const STAGGER = 20.8;   // frames per word width between the first and last letter
  const COLORS = { bg: '#022713', cream: '#CDE4B1', green: '#18C76B' };

  const FONTS = {
    original: { label: 'Original letterforms (s l a c e)', original: true },
    anybody: { label: 'Anybody', family: 'Anybody', weight: 880, stretch: 'semi-expanded',
      css: 'Anybody:wdth,wght@50..150,100..900' },
    unbounded: { label: 'Unbounded', family: 'Unbounded', weight: 800, stretch: 'normal', css: 'Unbounded:wght@800' },
    bricolage: { label: 'Bricolage Grotesque', family: 'Bricolage Grotesque', weight: 800, stretch: 'normal',
      css: 'Bricolage+Grotesque:opsz,wght@96,800' },
    syne: { label: 'Syne', family: 'Syne', weight: 800, stretch: 'normal', css: 'Syne:wght@800' },
  };

  const el = (name, attrs, parent) => {
    const e = document.createElementNS(NS, name);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  };
  const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);

  function loadFont(font, text) {
    if (font.original || !font.css) return Promise.resolve();
    const id = 'la-font-' + font.family.replace(/\s+/g, '-');
    if (!document.getElementById(id)) {
      const l = document.createElement('link');
      l.id = id; l.rel = 'stylesheet';
      l.href = `https://fonts.googleapis.com/css2?family=${font.css}&display=block`;
      document.head.appendChild(l);
    }
    const spec = `${font.stretch !== 'normal' ? font.stretch + ' ' : ''}${font.weight} 200px "${font.family}"`;
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
        letters.push({ ch, kind: 'path', d: g.d, x, l: 0, r: g.w, t: g.t, b: g.b });
        x += g.w; prev = ch;
      }
      return { letters, xh: G.xh, original: true };
    }
    const f = font.original ? FONTS.anybody : font;
    const c = document.createElement('canvas').getContext('2d');
    const size = 200;
    c.font = `${f.weight} ${size}px "${f.family}"`;
    try { c.fontStretch = f.stretch; } catch (e) { /* older browsers */ }
    const xh = c.measureText('x').actualBoundingBoxAscent || size * 0.52;
    const all = Array.from(word);
    all.forEach((ch, i) => {
      if (!ch.trim()) return;
      const before = c.measureText(all.slice(0, i).join('')).width;
      const m = c.measureText(ch);
      letters.push({
        ch, kind: 'text', font: f, size, x: before,
        l: -m.actualBoundingBoxLeft, r: m.actualBoundingBoxRight,
        t: -m.actualBoundingBoxAscent, b: m.actualBoundingBoxDescent,
      });
    });
    return { letters, xh, original: false };
  }

  function wedgePath(runs, cx, cy, R) {
    let d = '';
    for (const [a0, a1] of runs) {
      if (a1 - a0 >= 360) return null;
      d += `M${cx} ${cy}`;
      for (let a = a0; a <= a1 + 1e-6; a += 5) {
        const r = (a * Math.PI) / 180;
        d += `L${(cx + R * Math.cos(r)).toFixed(1)} ${(cy + R * Math.sin(r)).toFixed(1)}`;
      }
      d += 'Z';
    }
    return d;
  }

  function create(container, options) {
    const o = Object.assign({
      word: 'slaace', font: 'original', registered: true, speed: 1, loop: true,
      colors: {}, onUpdate: null, onReady: null,
    }, options || {});
    const colors = Object.assign({}, COLORS, o.colors);
    const data = root.SLAACE_MOTION;
    if (!data) throw new Error('LogoAssemble needs motion.data.js');

    const svg = el('svg', { role: 'img', 'aria-label': 'Animated wordmark', preserveAspectRatio: 'xMidYMid meet' });
    svg.style.cssText = 'display:block;width:100%;height:100%;overflow:visible';
    container.appendChild(svg);

    let frames = [], shown = -1, frame = 0, playing = false, raf = 0, last = 0, acc = 0, token = 0;

    function build() {
      const my = ++token;
      const font = FONTS[o.font] || FONTS.original;
      return loadFont(font.original ? FONTS.anybody : font, o.word).then(() => {
        if (my !== token) return;
        svg.innerHTML = '';
        frames = []; shown = -1;
        const L = layout(o.word, font, data);
        if (!L.letters.length) { if (o.onUpdate) o.onUpdate(frame, FRAMES); return; }
        compose(L);
        show(frame);
        if (o.onReady) o.onReady(api);
      });
    }

    // The original word in its own letterforms plays the frame-exact vector trace
    // of the source video (slaace.frames.js), when that file is on the page.
    function composeTrace(L) {
      const T = root.SLAACE;
      const last = L.letters[L.letters.length - 1];
      const x1 = last.x + last.r, xh = L.xh;
      svg.setAttribute('viewBox', `${-xh * 0.55} ${-xh * 1.98} ${x1 + xh * 1.4} ${xh * 3.05}`);
      const inks = [colors.green, colors.cream];
      const groups = T.frames.map((layers) => {
        const g = el('g', { transform: 'translate(-354 -416)' });
        layers.forEach((levels, ink) => levels.forEach(([op, d]) => {
          const p = el('path', { d, fill: inks[ink], 'fill-rule': 'evenodd' }, g);
          if (op < 1) p.setAttribute('fill-opacity', op);
        }));
        return g;
      });
      for (let f = 0; f < FRAMES; f++) {
        const g = el('g', {}, svg);
        g.style.display = 'none';
        g.appendChild(groups[T.sequence[Math.min(f, T.sequence.length - 1)]].cloneNode(true));
        drawMark(g, f, x1, xh);
        frames.push(g);
      }
    }

    function drawMark(g, f, x1, xh) {
      if (!o.registered) return;
      const R = data.registered, op = R.opacity[Math.min(R.opacity.length - 1, f)];
      if (op <= 0.01) return;
      const r = R.r * xh, mx = x1 + R.x * xh, my = R.y * xh;
      const m = el('g', { fill: 'none', stroke: colors.cream, opacity: op.toFixed(3) }, g);
      el('circle', { cx: mx, cy: my, r, 'stroke-width': r * 0.24 }, m);
      el('path', {
        d: `M${mx - r * 0.36} ${my + r * 0.52}v${-r * 1.04}h${r * 0.45}a${r * 0.31} ${r * 0.31} 0 0 1 0 ${r * 0.62}h${-r * 0.45}M${mx + r * 0.02} ${my - r * 0.1}l${r * 0.36} ${r * 0.62}`,
        'stroke-width': r * 0.2, 'stroke-linejoin': 'round',
      }, m);
    }

    function compose(L) {
      if (L.original && root.SLAACE && L.letters.map((q) => q.ch).join('') === 'slaace') return composeTrace(L);
      const { letters, xh } = L;
      const x0 = Math.min(...letters.map((q) => q.x + q.l));
      const x1 = Math.max(...letters.map((q) => q.x + q.r));
      const top = Math.min(...letters.map((q) => q.t)), bot = Math.max(...letters.map((q) => q.b));
      const W = x1 - x0;
      const padX = xh * 0.55;
      svg.setAttribute('viewBox', `${x0 - padX} ${top - xh * 0.7} ${W + padX * 2 + xh * 0.3} ${bot - top + xh * 1.6}`);
      const defs = el('defs', {}, svg);

      // glyph symbols, positioned in word space
      letters.forEach((q, j) => {
        q.id = `la-g${token}-${j}`;
        if (q.kind === 'path') el('path', { id: q.id, d: q.d, transform: `translate(${q.x} 0)` }, defs);
        else {
          const t = el('text', { id: q.id, x: q.x, y: 0 }, defs);
          t.setAttribute('style', `font-family:"${q.font.family}";font-weight:${q.font.weight};font-stretch:${q.font.stretch};font-size:${q.size}px;font-kerning:none`);
          t.textContent = q.ch;
        }
        q.cx = q.x + (q.l + q.r) / 2; q.cy = (q.t + q.b) / 2;
        q.pos = W > 0 ? (q.cx - x0) / W : 0.5;
        // the original letter whose motion this one replays
        let k = 0, best = 1e9;
        data.letters.forEach((s, i) => { const dd = Math.abs(s.pos - q.pos); if (dd < best) { best = dd; k = i; } });
        q.src = k;
        q.shift = (q.pos - data.letters[k].pos) * STAGGER;
      });

      const clipCache = new Map();
      const clipFor = (q, runs) => {
        const key = q.id + '|' + JSON.stringify(runs);
        if (clipCache.has(key)) return clipCache.get(key);
        const d = wedgePath(runs, q.cx, q.cy, xh * 4);
        let id = null;
        if (d) {
          id = `la-c${token}-${clipCache.size}`;
          el('path', { d }, el('clipPath', { id }, defs));
        }
        clipCache.set(key, id);
        return id;
      };

      const fill = [colors.cream, colors.green, colors.cream];
      for (let f = 0; f < FRAMES; f++) {
        const g = el('g', {}, svg);
        g.style.display = 'none';
        // all ghosts first, then green, then cream, as in the original
        const items = [];
        letters.forEach((q) => {
          let fs = Math.round(f - q.shift);
          if (fs < 0) return;
          if (fs > FRAMES - 1) fs = FRAMES - 1;
          for (const p of data.frames[fs]) {
            if (p[1] === q.src) items.push([p, q]);
          }
        });
        items.sort((a, b) => a[0][0] - b[0][0]);
        for (const [p, q] of items) {
          const [cls, , th, s, tx, ty, alpha, runs] = p;
          const outer = el('g', {
            transform: `translate(${(q.cx + tx * xh).toFixed(2)} ${(q.cy + ty * xh).toFixed(2)}) rotate(${th}) scale(${s}) translate(${(-q.cx).toFixed(2)} ${(-q.cy).toFixed(2)})`,
          }, g);
          const clip = clipFor(q, runs);
          const use = el('use', { href: '#' + q.id, fill: fill[cls] }, outer);
          if (clip) use.setAttribute('clip-path', `url(#${clip})`);
          if (alpha < 0.99) use.setAttribute('fill-opacity', alpha);
        }
        // the wave: a sine stroke fitted to every frame of the original. Its shape is in
        // x-heights; where it starts, ends and crests is relative to the word's width.
        const wv = data.wave.frames[f];
        if (wv) {
          const [yc, amp, lam, crest, xa, xb, op] = wv;
          const ax = x0 + xa * W, bx = x0 + xb * W, cx = x0 + crest * W;
          const n = Math.max(8, Math.ceil((bx - ax) / (xh * 0.05)));
          let d = '';
          for (let i = 0; i <= n; i++) {
            const x = ax + ((bx - ax) * i) / n;
            const y = (yc - amp * Math.cos((2 * Math.PI * (x - cx)) / (lam * xh))) * xh;
            d += (i ? 'L' : 'M') + x.toFixed(1) + ' ' + y.toFixed(1);
          }
          el('path', {
            d, fill: 'none', stroke: colors.green, 'stroke-opacity': op,
            'stroke-width': data.wave.width * xh, 'stroke-linecap': 'round', 'stroke-linejoin': 'round',
          }, g);
        }
        drawMark(g, f, x1, xh);
        frames.push(g);
      }
    }

    function show(f) {
      frame = Math.max(0, Math.min(FRAMES, f));
      const k = Math.min(FRAMES - 1, Math.floor(frame));
      if (k !== shown && frames.length) {
        if (shown >= 0 && frames[shown]) frames[shown].style.display = 'none';
        frames[k].style.display = '';
        shown = k;
      }
      if (o.onUpdate) o.onUpdate(frame, FRAMES);
    }

    function tick(now) {
      if (!playing) return;
      acc = (now - last) / 1000 * FPS * o.speed;
      last = now;
      let f = frame + acc;
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
      get svg() { return svg; },
      options: o,
      colors,
      ready: null,
    };
    api.ready = build();
    return api;
  }

  root.LogoAssemble = { create, FONTS, COLORS, FRAMES, FPS };
})(typeof window !== 'undefined' ? window : this);
