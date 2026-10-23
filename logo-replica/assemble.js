/*
 * LogoAssemble: the slaace logo animation, rebuilt so it works for any word.
 *
 * Every timing and proportion below was measured from the original 25 fps
 * animation (see README.md). Times are in source frames (1/25 s) and lengths
 * in x-heights (xh) or word widths (W), so the motion scales with any word.
 *
 * Per letter, in order:
 *   1. ghost: two or three chunks of the letter, cut by circles, rise from
 *      below while rotating and flipping, fading up to half-opacity cream
 *      (some chunks fly in solid green);
 *   2. green: the whole letter fills green from a growing circle;
 *   3. cream: two growing circles sweep cream over it.
 * Letters start as the wave reaches them. The wave is a sine stroke whose head
 * runs right, whose tail first reaches back to the start of the word and then
 * chases the head off the end, and whose crests drift left while it is drawn.
 */
(function (root) {
  'use strict';

  const NS = 'http://www.w3.org/2000/svg';
  const FRAMES = 57;          // one loop of the original, at 25 fps (2.28 s)
  const FPS = 25;

  const FONTS = {
    anybody: { label: 'Anybody (closest match)', family: 'Anybody', weight: 880, stretch: 'semi-expanded',
      css: 'Anybody:wdth,wght@50..150,100..900' },
    unbounded: { label: 'Unbounded', family: 'Unbounded', weight: 800, stretch: 'normal', css: 'Unbounded:wght@800' },
    bricolage: { label: 'Bricolage Grotesque', family: 'Bricolage Grotesque', weight: 800, stretch: 'normal',
      css: 'Bricolage+Grotesque:opsz,wght@96,800' },
    syne: { label: 'Syne', family: 'Syne', weight: 800, stretch: 'normal', css: 'Syne:wght@800' },
    climate: { label: 'Climate Crisis', family: 'Climate Crisis', weight: 400, stretch: 'normal', css: 'Climate+Crisis' },
  };

  const COLORS = { bg: '#022713', cream: '#CDE4B1', green: '#18C76B' };

  // Measured wave keyframes: [frame, position as a fraction of the word width].
  const HEAD = [[0, 0.67], [5, 0.67], [7, 0.75], [8, 0.78], [10, 0.84], [12, 0.88], [14, 0.93], [16, 0.97],
    [18, 1.0], [20, 1.02], [22, 1.04], [23, 1.045], [26, 1.08], [29, 1.11]];
  const TAIL = [[0, 0.56], [1, 0.52], [3, 0.33], [4, 0.2], [5, 0.12], [6, 0.07], [7, 0.02], [8, 0.0], [9, 0.08],
    [11, 0.37], [13, 0.56], [15, 0.68], [17, 0.77], [19, 0.84], [21, 0.91], [23, 0.955], [25, 1.015], [29, 1.09]];
  const WAVE = {
    amp: 0.238,     // xh
    lambda: 1.54,   // xh
    width: 0.107,   // xh
    centre: 0.47,   // xh below the x-height line
    opacity: 0.8,
    crest: 0.36,    // a crest settles at this fraction of W
    drift: 0.24,    // W: how far left of its resting place the crests start
    driftTau: 2.75, // frames
  };

  // ---------------------------------------------------------------- helpers
  const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
  const lerp = (a, b, t) => a + (b - a) * t;
  const easeOut = (t) => 1 - Math.pow(1 - clamp01(t), 3);
  const easeOutQuad = (t) => 1 - Math.pow(1 - clamp01(t), 2);
  const easeInOutQuad = (t) => { t = clamp01(t); return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; };
  const easeInOut = (t) => { t = clamp01(t); return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
  function keyed(keys, f) {
    if (f <= keys[0][0]) return keys[0][1];
    for (let i = 1; i < keys.length; i++) {
      if (f <= keys[i][0]) {
        const [f0, v0] = keys[i - 1], [f1, v1] = keys[i];
        const t = (f - f0) / (f1 - f0);
        return v0 + (v1 - v0) * (t * t * (3 - 2 * t) * 0.35 + t * 0.65);
      }
    }
    return keys[keys.length - 1][1];
  }
  function rng(seed) {
    let s = 2166136261 >>> 0;
    for (const c of String(seed)) s = Math.imul(s ^ c.charCodeAt(0), 16777619) >>> 0;
    return () => {
      s = (s + 0x6D2B79F5) >>> 0;
      let t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const el = (name, attrs, parent) => {
    const e = document.createElementNS(NS, name);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  };
  const circleD = (cx, cy, r) =>
    `M${cx - r} ${cy}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0z`;

  function loadFont(font, text) {
    const id = 'la-font-' + font.family.replace(/\s+/g, '-');
    if (!document.getElementById(id) && font.css) {
      const l = document.createElement('link');
      l.id = id; l.rel = 'stylesheet';
      l.href = `https://fonts.googleapis.com/css2?family=${font.css}&display=block`;
      document.head.appendChild(l);
    }
    const spec = `${font.stretch !== 'normal' ? font.stretch + ' ' : ''}${font.weight} 200px "${font.family}"`;
    const tryLoad = () => (document.fonts ? document.fonts.load(spec, text || 'abc') : Promise.resolve());
    // the stylesheet may not have arrived yet; retry a few times before measuring
    return tryLoad().then((r) => (r && r.length ? r : new Promise((ok) => setTimeout(ok, 350)).then(tryLoad)))
      .then((r) => (r && r.length ? r : new Promise((ok) => setTimeout(ok, 700)).then(tryLoad)))
      .catch(() => null);
  }

  // Ink metrics of the word, measured on a canvas in the same face.
  function measure(word, font, tracking) {
    const c = document.createElement('canvas').getContext('2d');
    const size = 200;
    c.font = `${font.weight} ${size}px "${font.family}"`;
    try { c.fontStretch = font.stretch; } catch (e) { /* older browsers */ }
    c.fontKerning = 'normal';
    const xm = c.measureText('x');
    const xh = xm.actualBoundingBoxAscent || size * 0.52;
    const letters = [];
    const chars = Array.from(word);
    let pen = 0;
    chars.forEach((ch, i) => {
      const before = c.measureText(chars.slice(0, i).join('')).width + tracking * size * i;
      const m = c.measureText(ch);
      if (ch.trim()) {
        letters.push({
          ch, x: before,
          l: -m.actualBoundingBoxLeft, r: m.actualBoundingBoxRight,
          t: -m.actualBoundingBoxAscent, b: m.actualBoundingBoxDescent,
        });
      }
      pen = before + m.width;
    });
    if (!letters.length) return null;
    const x0 = Math.min(...letters.map((L) => L.x + L.l));
    const x1 = Math.max(...letters.map((L) => L.x + L.r));
    const top = Math.min(...letters.map((L) => L.t));
    const bot = Math.max(...letters.map((L) => L.b));
    return { size, xh, letters, x0, x1, W: x1 - x0, top, bot, pen, css: c.font };
  }

  // ---------------------------------------------------------------- build
  function create(container, options) {
    const o = Object.assign({
      word: 'matcha', font: 'anybody', registered: true, seed: '', speed: 1, loop: true,
      tracking: -0.01, colors: {}, onUpdate: null, onReady: null,
    }, options || {});
    const colors = Object.assign({}, COLORS, o.colors);

    const svg = el('svg', { role: 'img', 'aria-label': 'Animated wordmark', preserveAspectRatio: 'xMidYMid meet' });
    svg.style.cssText = 'display:block;width:100%;height:100%;overflow:visible';
    container.appendChild(svg);

    let model = null, frame = 0, playing = false, raf = 0, last = 0, token = 0;

    function build() {
      const my = ++token;
      const font = FONTS[o.font] || FONTS.anybody;
      return loadFont(font, o.word).then(() => {
        if (my !== token) return;
        const m = measure(o.word, font, o.tracking);
        svg.innerHTML = '';
        model = null;
        if (!m) { if (o.onUpdate) o.onUpdate(frame, FRAMES); return; }
        model = assemble(m, font);
        seek(frame);
        if (o.onReady) o.onReady(api);
      });
    }

    function assemble(m, font) {
      const { xh, W, x0, x1 } = m;
      const rand = rng((o.seed || '') + '|' + o.word + '|' + o.font);
      const padX = xh * 0.6, padTop = xh * 1.0, padBot = xh * 0.9;
      const vbx = x0 - padX, vby = m.top - padTop;
      const vbw = (x1 - x0) + padX * 2 + xh * 0.5, vbh = (m.bot - m.top) + padTop + padBot;
      svg.setAttribute('viewBox', `${vbx} ${vby} ${vbw} ${vbh}`);
      const defs = el('defs', {}, svg);
      const font2 = `font-family:"${font.family}";font-weight:${font.weight};font-stretch:${font.stretch};font-size:${m.size}px;font-kerning:none`;
      let uid = 0;
      const id = (p) => `la${p}${++uid}`;

      const letters = m.letters.map((L) => {
        const g = el('g', { transform: `translate(${L.x} 0)` }, svg);
        const w = L.r - L.l, h = L.b - L.t;
        const cx = (L.l + L.r) / 2, cy = (L.t + L.b) / 2;
        const D = Math.hypot(w, h);
        const glyph = (parent, fill, extra) => {
          const t = el('text', Object.assign({ x: 0, y: 0, fill }, extra || {}), parent);
          t.setAttribute('style', font2);
          t.textContent = L.ch;
          return t;
        };
        // chunk regions: circle A, circle B minus A, the rest
        const pick = () => [L.l + w * (0.1 + 0.8 * rand()), L.t + h * (0.1 + 0.8 * rand())];
        const [ax, ay] = pick();
        const [bx, by] = [cx + (cx - ax) * 0.8, cy + (cy - ay) * 0.8];
        const ra = D * (0.38 + 0.14 * rand()), rb = D * (0.4 + 0.14 * rand());
        const big = `M${L.l - D} ${L.t - D}h${w + 2 * D}v${h + 2 * D}h${-(w + 2 * D)}z`;
        const notA = id('n'); el('path', { d: big + circleD(ax, ay, ra), 'clip-rule': 'evenodd' }, el('clipPath', { id: notA }, defs));
        const rA = id('a'); el('circle', { cx: ax, cy: ay, r: ra }, el('clipPath', { id: rA }, defs));
        const rB = id('b'); el('circle', { cx: bx, cy: by, r: rb }, el('clipPath', { id: rB, 'clip-path': `url(#${notA})` }, defs));
        const rC = id('c'); el('path', { d: big + circleD(bx, by, rb), 'clip-rule': 'evenodd' }, el('clipPath', { id: rC, 'clip-path': `url(#${notA})` }, defs));
        const regions = [[rA, ax, ay], [rB, bx, by], [rC, cx, cy]];
        rand() < 0.5 && regions.reverse();

        const ghostLayer = el('g', {}, g);
        const chunks = regions.map(([clip, px, py], j) => {
          const outer = el('g', {}, ghostLayer);
          const inner = el('g', { 'clip-path': `url(#${clip})` }, outer);
          const green = j < 2 && rand() < 0.22;   // the odd chunk arrives solid green
          const t = glyph(inner, green ? colors.green : colors.cream);
          const fromAbove = py < cy - h * 0.15 && rand() < 0.3;
          return {
            outer, t, green,
            px: Math.max(L.l, Math.min(L.r, px)), py: Math.max(L.t, Math.min(L.b, py)),
            dx: (rand() - 0.35) * xh * 0.5,
            dy: (fromAbove ? -1 : 1) * xh * (0.7 + 0.6 * rand()),
            rot: (rand() - 0.5) * 70,
            sy: rand() < 0.5 ? -0.25 + rand() * 0.4 : 0.15 + rand() * 0.3,
            at: j * 1.5 + rand() * 1.0,
          };
        });

        // reveal circles start on the letter's edge
        const edgePoint = () => {
          const a = rand() * Math.PI * 2;
          return [cx + Math.cos(a) * w * 0.55, cy + Math.sin(a) * h * 0.55];
        };
        // radius that covers the whole letter from (px, py)
        const reach = (px, py) => Math.max(
          Math.hypot(px - L.l, py - L.t), Math.hypot(px - L.r, py - L.t),
          Math.hypot(px - L.l, py - L.b), Math.hypot(px - L.r, py - L.b)) + xh * 0.05;
        const gClip = id('g'), cClip = id('k');
        const gp = el('clipPath', { id: gClip }, defs);
        const greens = [0, 1].map((j) => {
          const [px, py] = edgePoint();
          return { c: el('circle', { cx: px, cy: py, r: 0 }, gp), R: D * (0.38 + 0.22 * rand()), at: 2 + j * 3 + rand() * 1.5, dur: 7 + rand() * 2 };
        });
        const cp = el('clipPath', { id: cClip }, defs);
        const [c1x, c1y] = edgePoint();
        const creamPts = [[c1x, c1y], [cx + (cx - c1x) * 0.9, cy + (cy - c1y) * 0.9], edgePoint()];
        const creams = creamPts.map(([px, py], j) => ({
          c: el('circle', { cx: px, cy: py, r: 0 }, cp), R: reach(px, py),
          at: 4 + j * 2 + rand() * 1.5, dur: 13 - j + rand() * 2,
        }));
        const greenG = el('g', { 'clip-path': `url(#${gClip})` }, g);
        glyph(greenG, colors.green);
        const creamG = el('g', { 'clip-path': `url(#${cClip})` }, g);
        glyph(creamG, colors.cream);

        // letters start as the wave reaches their centre
        const centre = (L.x + cx - x0) / W;
        return {
          start: 2 + 20 * centre,   // colour reveals (cream begins about 6 frames later)
          fly: -1 + 15 * centre,     // chunks set off well before the wave arrives
          ghostLayer, chunks, greenG, creamG, greens, creams,
          done: Math.max(...creams.map((c) => c.at + c.dur)),
        };
      });

      // the wave
      const wave = el('path', {
        fill: 'none', stroke: colors.green, 'stroke-width': WAVE.width * xh,
        'stroke-linecap': 'round', 'stroke-linejoin': 'round',
      }, svg);

      // registered mark beside the last letter, at the x-height line
      let mark = null;
      if (o.registered) {
        const r = xh * 0.038;
        mark = el('g', { fill: 'none', stroke: colors.cream }, svg);
        const mx = x1 + xh * 0.09, my = -xh + xh * 0.05;
        el('circle', { cx: mx, cy: my, r, 'stroke-width': r * 0.24 }, mark);
        el('path', {
          d: `M${mx - r * 0.36} ${my + r * 0.52}v${-r * 1.04}h${r * 0.45}a${r * 0.31} ${r * 0.31} 0 0 1 0 ${r * 0.62}h${-r * 0.45}M${mx + r * 0.02} ${my - r * 0.1}l${r * 0.36} ${r * 0.62}`,
          'stroke-width': r * 0.2, 'stroke-linejoin': 'round',
        }, mark);
      }

      return { m, letters, wave, mark };
    }

    // ---------------------------------------------------------------- frame
    function render(f) {
      if (!model) return;
      const { m, letters, wave, mark } = model;
      const { xh, W, x0 } = m;
      for (const L of letters) {
        const k = f - L.start;
        const creamDone = k > L.done;
        L.ghostLayer.style.display = creamDone ? 'none' : '';
        for (const c of L.chunks) {
          const p = easeOutQuad((f - L.fly - c.at) / 9);
          if (p <= 0) { c.outer.style.display = 'none'; continue; }
          c.outer.style.display = '';
          const q = 1 - p;
          const sy = lerp(c.sy, 1, p);
          c.outer.setAttribute('transform',
            `translate(${c.dx * q + c.px} ${c.dy * q + c.py}) rotate(${c.rot * q}) scale(1 ${sy}) translate(${-c.px} ${-c.py})`);
          const a = clamp01(p * 2.4);
          c.t.setAttribute('fill-opacity', c.green ? a : a * 0.58);
        }
        let anyGreen = false;
        for (const c of L.greens) {
          const p = easeInOut((k - c.at) / c.dur);
          c.c.setAttribute('r', c.R * p);
          anyGreen = anyGreen || p > 0;
        }
        L.greenG.style.display = anyGreen && !creamDone ? '' : 'none';
        for (const c of L.creams) c.c.setAttribute('r', c.R * easeInOutQuad((k - c.at) / c.dur));
      }

      // wave
      const head = keyed(HEAD, f), tail = keyed(TAIL, f);
      const fade = 1 - clamp01((f - 24) / 5);
      if (head - tail < 0.004 || fade <= 0) {
        wave.setAttribute('d', '');
      } else {
        const grow = 0.81 + 0.19 * easeOut(f / 8);
        const amp = WAVE.amp * xh * grow, lam = WAVE.lambda * xh * grow;
        const drift = f < 4 ? WAVE.drift * Math.exp((4 - f) / WAVE.driftTau) : WAVE.drift * Math.exp(-(f - 4) / WAVE.driftTau);
        const crest = x0 + (WAVE.crest + drift) * W;
        const yc = -xh + WAVE.centre * xh;
        const xa = x0 + tail * W, xb = x0 + head * W, xr = x0 + W;
        const steps = Math.max(6, Math.ceil((xb - xa) / (xh * 0.06)));
        let d = '';
        for (let i = 0; i <= steps; i++) {
          const x = xa + (xb - xa) * (i / steps);
          // past the last letter the stroke bends down and away
          const over = Math.max(0, x - xr);
          const y = yc - amp * Math.cos((2 * Math.PI * (x - crest)) / lam) + over * 0.9;
          d += (i ? 'L' : 'M') + x.toFixed(2) + ' ' + y.toFixed(2);
        }
        wave.setAttribute('d', d);
      }
      wave.setAttribute('stroke-opacity', WAVE.opacity * fade);
      if (mark) mark.setAttribute('opacity', clamp01((f - 25) / 17));
    }

    function seek(f) {
      frame = Math.max(0, Math.min(FRAMES, f));
      render(frame);
      if (o.onUpdate) o.onUpdate(frame, FRAMES);
    }

    function tick(now) {
      if (!playing) return;
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      let f = frame + dt * FPS * o.speed;
      if (f >= FRAMES) {
        if (!o.loop) { seek(FRAMES); playing = false; if (o.onUpdate) o.onUpdate(frame, FRAMES); return; }
        f %= FRAMES;
      }
      seek(f);
      raf = requestAnimationFrame(tick);
    }

    const api = {
      play() { if (playing) return api; if (frame >= FRAMES) frame = 0; playing = true; last = performance.now(); raf = requestAnimationFrame(tick); return api; },
      pause() { playing = false; cancelAnimationFrame(raf); return api; },
      replay() { api.pause(); seek(0); return api.play(); },
      seek(f) { seek(f); return api; },
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
