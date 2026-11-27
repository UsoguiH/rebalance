// Monika: an agent cursor (arrow + name pill) that takes over Slate's cursors.
//
// How it works: Slate's Rive files are loaded with their cursor recoloured to "marker"
// colours (tools/mark-cursor.py). The Rive Canvas2D player paints every shape with a plain
// ctx.fill()/stroke(), so this file patches those two calls. When a marker colour comes
// through, Slate's own cursor is skipped and Monika is drawn in its place with the exact same
// transform (position, rotation, scale, mirroring, fades) at the exact same layer depth.
// On top of Slate's motion, the name pill is rigged with a spring so it trails, tilts and
// settles, and bobs on clicks.
//
// MonikaCursor.page() also turns the visitor's own mouse into Monika.
(function () {
  'use strict';

  // ---------------------------------------------------------------- look
  // Slate's palette index -> Monika teammate. 1 (blue) is Monika herself.
  const CREW = {
    1: { name: 'Monika', fill: '#0a84ff' },
    2: { name: 'Jonas', fill: '#00b72b' },
    3: { name: 'Ava', fill: '#fa5d1e' },
    4: { name: 'Leo', fill: '#b06df5' },
    5: { name: 'Noor', fill: '#ff5c8a' },
    6: { name: 'Guest', fill: '#f5f5f4' },
  };
  const FONT = '700 {px}px "Inter", "SF Pro Display", system-ui, -apple-system, "Segoe UI", sans-serif';

  // Geometry is in Slate's cursor space (their arrow tip sits near (-12.6, -14.2), ~29 units tall),
  // measured from the reference image (arrow tip at its top-left, pill below-right).
  const TIP = { x: -12.6, y: -14.2 };
  const ARROW = [[-12.6, -14.2, 2.6], [15.8, -4.4, 3.4], [-1.5, 14.0, 3.6]]; // x, y, corner radius
  const PILL = { dx: 20.7, dy: 18.9, h: 28.6, font: 15.8, pad: 16.2 }; // offsets from the tip

  function roundedPoly(pts) {
    const p = new Path2D();
    const n = pts.length;
    const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    const start = mid(pts[n - 1], pts[0]);
    p.moveTo(start[0], start[1]);
    for (let i = 0; i < n; i++) {
      const cur = pts[i], next = pts[(i + 1) % n], m = mid(cur, next);
      p.arcTo(cur[0], cur[1], m[0], m[1], cur[2]);
    }
    p.closePath();
    return p;
  }
  const ARROW_PATH = roundedPoly(ARROW);

  function crewAt(v) {
    // colour keyframes interpolate, so the marker can land between two indices
    const i = Math.max(1, Math.min(6, Math.round(v)));
    return CREW[i] || CREW[6];
  }

  const widthCache = new Map();
  function textWidth(ctx, name, px) {
    const k = name + '|' + Math.round(px * 4);
    let w = widthCache.get(k);
    if (w == null) {
      ctx.font = FONT.replace('{px}', px.toFixed(2));
      w = ctx.measureText(name).width;
      widthCache.set(k, w);
    }
    return w;
  }

  // ---------------------------------------------------------------- rig
  // spring helpers: critically-ish damped, frame-rate independent via sub-steps
  function spring(st, key, target, k, zeta, dt) {
    const c = 2 * Math.sqrt(k) * zeta;
    let x = st[key], v = st[key + 'V'] || 0;
    const steps = Math.max(1, Math.ceil(dt / (1 / 240)));
    const h = dt / steps;
    for (let i = 0; i < steps; i++) {
      v += (k * (target - x) - c * v) * h;
      x += v * h;
    }
    st[key] = x;
    st[key + 'V'] = v;
  }

  function newRig() {
    return { t: 0, px: 0, py: 0, tilt: 0, stretch: 1, restS: 0, press: 0, born: 0, tuck: 0 };
  }

  // Advance one rig to the cursor's current screen pose and return the pill pose.
  function stepRig(rig, tipX, tipY, s, flip, now) {
    let dt = rig.t ? (now - rig.t) / 1000 : 0;
    const fresh = !rig.t || dt > 0.25;
    rig.t = now;
    dt = Math.min(dt, 1 / 20);
    const tx = tipX + (flip ? -PILL.dx : PILL.dx) * s;
    const ty = tipY + PILL.dy * s;
    if (fresh || Math.hypot(tx - rig.px, ty - rig.py) > 420 * Math.max(s, 0.5)) {
      rig.px = tx; rig.py = ty; rig.pxV = rig.pyV = 0; rig.tilt = rig.tiltV = 0; rig.restS = s;
      rig.born = now;
    } else {
      spring(rig, 'px', tx, 420, 0.62, dt);
      spring(rig, 'py', ty, 420, 0.62, dt);
      // lean into the motion, like a tag on a string
      const lean = Math.max(-0.26, Math.min(0.26, -(rig.pxV || 0) / (s * 2600)));
      spring(rig, 'tilt', lean, 260, 0.55, dt);
      const speed = Math.hypot(rig.pxV || 0, rig.pyV || 0) / Math.max(s, 0.01);
      spring(rig, 'stretch', 1 + Math.min(speed / 9000, 0.07), 300, 0.7, dt);
      // click detection: Slate squashes its cursor on press; remember the resting scale
      rig.restS = Math.max(s, rig.restS * (1 - dt * 0.6));
      const squash = Math.max(0, Math.min(1, (rig.restS - s) / (rig.restS * 0.12)));
      rig.press += (squash - rig.press) * Math.min(1, dt * 18);
    }
    // a comment bubble from the same teammate right beside the cursor: tuck the name away
    let near = 0;
    if (rig.bubbles) {
      for (const b of rig.bubbles) {
        if (b.v === rig.crewIndex && b.a > 0.05 && Math.hypot(b.x - tipX, b.y - tipY) < 150 * s) { near = 1; break; }
      }
    }
    if (fresh) rig.tuck = near;
    else spring(rig, 'tuck', near, near ? 520 : 240, near ? 0.9 : 0.5, dt);
    return rig;
  }

  // ---------------------------------------------------------------- drawing
  const nativeFill = CanvasRenderingContext2D.prototype.fill;
  const nativeStroke = CanvasRenderingContext2D.prototype.stroke;

  // draw the arrow in the current transform (Slate cursor space): flat fill, no glow
  function drawArrow(ctx, crew, alpha) {
    ctx.globalAlpha *= alpha;
    ctx.fillStyle = crew.fill;
    nativeFill.call(ctx, ARROW_PATH);
  }

  // draw the name pill in canvas pixels, anchored at its top-left (or top-right when mirrored)
  function drawPill(ctx, rig, s, flip, crew, alpha) {
    const h = PILL.h * s;
    const fontPx = PILL.font * s;
    const w = textWidth(ctx, crew.name, fontPx) + PILL.pad * 2 * s;
    const tuck = Math.max(0, Math.min(1.2, rig.tuck || 0));
    const show = Math.max(0, 1 - tuck);
    if (show <= 0.01) return;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = alpha * Math.min(1, show * 1.4);
    ctx.translate(rig.px, rig.py);
    ctx.scale(0.35 + 0.65 * show, 0.35 + 0.65 * show);
    // pivot the tilt around the corner nearest the arrow, so it swings like a tag
    ctx.rotate(rig.tilt);
    // on a click the tag gives a small bob
    const bob = 1 - 0.07 * (rig.press || 0);
    ctx.scale(rig.stretch * bob, (2 - rig.stretch) * bob);
    const x = flip ? -w : 0;
    const body = new Path2D();
    if (body.roundRect) body.roundRect(x, 0, w, h, h / 2);
    else body.rect(x, 0, w, h);
    ctx.fillStyle = crew.fill;
    nativeFill.call(ctx, body);
    ctx.fillStyle = crew === CREW[6] ? '#0b2a4a' : '#ffffff';
    ctx.font = FONT.replace('{px}', fontPx.toFixed(2));
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    ctx.fillText(crew.name, x + PILL.pad * s, h * 0.53);
  }

  function drawMonika(ctx, rig, crew, alpha, now, seed, poseMatrix) {
    // poseMatrix maps Slate cursor space -> canvas pixels
    const m = poseMatrix;
    const det = m.a * m.d - m.b * m.c;
    const s = Math.sqrt(Math.abs(det));
    const flip = det < 0;
    const tipX = m.a * TIP.x + m.c * TIP.y + m.e;
    const tipY = m.b * TIP.x + m.d * TIP.y + m.f;
    stepRig(rig, tipX, tipY, s, flip, now);
    const fadeIn = Math.min(1, (now - rig.born) / 160);
    ctx.save();
    drawPill(ctx, rig, s, flip, crew, alpha * fadeIn);
    ctx.restore();
    ctx.save();
    ctx.setTransform(m.a, m.b, m.c, m.d, m.e, m.f);
    drawArrow(ctx, crew, alpha * fadeIn);
    ctx.restore();
  }

  // ---------------------------------------------------------------- Rive interception
  // marker: rgb(1, g, b) with g >= 248 (see tools/mark-cursor.py)
  function readMarker(style) {
    if (typeof style !== 'string') return null;
    if (style.length === 7 && style.charCodeAt(0) === 35 && style.startsWith('#01f')) {
      const g = parseInt(style.slice(3, 5), 16);
      if (g < 248) return null;
      return { g, b: parseInt(style.slice(5, 7), 16), a: 1 };
    }
    if (style.startsWith('rgba(1, 2')) {
      const m = /^rgba\(1, (\d+), (\d+), ([\d.]+)\)$/.exec(style);
      if (m && +m[1] >= 248) return { g: +m[1], b: +m[2], a: +m[3] };
    }
    return null;
  }

  const perCanvas = new WeakMap(); // canvas -> { frame, index, rigs[] }
  let frameNo = 0;
  (function tick() { frameNo++; requestAnimationFrame(tick); })();

  function canvasState(ctx) {
    const cv = ctx.canvas;
    let st = perCanvas.get(cv);
    if (!st) { st = { frame: -1, index: 0, rigs: [], bubbles: [], lastBubbles: [] }; perCanvas.set(cv, st); }
    if (st.frame !== frameNo) {
      st.frame = frameNo; st.index = 0;
      st.lastBubbles = st.bubbles; st.bubbles = [];
    }
    return st;
  }

  const P = CanvasRenderingContext2D.prototype;
  P.fill = function (a, b) {
    const mk = readMarker(this.fillStyle);
    if (!mk) return nativeFill.apply(this, arguments);
    if (mk.g === 254) {
      // Slate's arrow fill: this is one cursor instance, draw Monika here
      const st = canvasState(this);
      const i = st.index++;
      const rig = st.rigs[i] || (st.rigs[i] = newRig());
      rig.bubbles = st.lastBubbles.concat(st.bubbles);
      rig.crewIndex = Math.round(mk.b);
      let crew = crewAt(mk.b);
      const ds = this.canvas.dataset || {};
      if (ds.monikaName) crew = Object.assign({}, crew, { name: ds.monikaName });
      let pose = this.getTransform();
      // data-monika-scale on the canvas draws Monika bigger, grown around the arrow tip
      const grow = parseFloat(ds.monikaScale);
      if (grow > 0 && grow !== 1) pose = pose.multiply(new DOMMatrix().translate(TIP.x, TIP.y).scale(grow).translate(-TIP.x, -TIP.y));
      if (mk.a > 0.004) drawMonika(this, rig, crew, mk.a, performance.now(), i * 1.7, pose);
      return;
    }
    if (mk.g === 248) {
      // a Slate comment bubble: wear the teammate's colour, and let the cursor beside it make room
      const st = canvasState(this);
      const m = this.getTransform();
      const crew = crewAt(mk.b);
      const k = Math.sqrt(Math.abs(m.a * m.d - m.b * m.c));
      // Slate grows the bubble's shape as its text types in, so test how much of it is there
      let hits = 0;
      if (a instanceof Path2D) {
        for (let dx = -90; dx <= 90; dx += 30) {
          for (let dy = -10; dy <= 10; dy += 10) {
            if (this.isPointInPath(a, m.e + dx * k, m.f + dy * k)) hits++;
          }
        }
      }
      st.bubbles.push({ x: m.e, y: m.f, v: Math.round(mk.b), a: mk.a * (hits >= 3 ? 1 : 0), k });
      this.save();
      this.fillStyle = crew.fill;
      this.globalAlpha *= mk.a;
      nativeFill.apply(this, arguments);
      this.restore();
      return;
    }
    if (mk.g === 250) {
      // other cursor shapes (e.g. the rotate icon): keep the shape, wear Monika's colours
      const crew = crewAt(mk.b);
      this.save();
      this.fillStyle = crew.fill;
      this.globalAlpha *= mk.a;
      nativeFill.apply(this, arguments);
      this.restore();
      return;
    }
    // 252 shadow / 253 outline: not part of Monika's look, skip
  };
  P.stroke = function () {
    const mk = readMarker(this.strokeStyle);
    if (!mk) return nativeStroke.apply(this, arguments);
    if (mk.g === 249) {
      const crew = crewAt(mk.b);
      this.save();
      this.strokeStyle = crew.fill;
      this.globalAlpha *= mk.a;
      nativeStroke.apply(this, arguments);
      this.restore();
    }
  };

  // ---------------------------------------------------------------- the visitor's own cursor
  // The arrow tip is pinned to the real pointer (clicks land where it points); the pill trails
  // on its spring, the arrow squashes on press and springs back on release.
  function overlay() {
    const cv = document.createElement('canvas');
    cv.setAttribute('aria-hidden', 'true');
    cv.style.cssText = 'position:fixed;inset:0;width:100vw;height:100vh;pointer-events:none;z-index:2147483000';
    document.body.appendChild(cv);
    const fit = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      cv.width = Math.round(innerWidth * dpr);
      cv.height = Math.round(innerHeight * dpr);
    };
    fit();
    addEventListener('resize', fit);
    return cv;
  }

  function page(opts = {}) {
    const size = opts.size || 1.25; // Slate-cursor units -> css px
    const crew = Object.assign({}, CREW[1], opts.name ? { name: opts.name } : null);
    const cv = overlay();
    const ctx = cv.getContext('2d');
    const rig = newRig();
    const st = { down: 0, downV: 0 };
    let x = -100, y = -100, visible = false, downTarget = 0, target = null, last = 0;
    addEventListener('pointermove', (e) => {
      if (e.pointerType === 'touch') { visible = false; document.documentElement.classList.remove('monika-cursor'); return; }
      x = e.clientX; y = e.clientY; target = e.target; visible = true;
      document.documentElement.classList.add('monika-cursor');
    }, { passive: true });
    addEventListener('pointerdown', (e) => { if (e.pointerType !== 'touch') downTarget = 1; }, { passive: true });
    addEventListener('pointerup', () => { downTarget = 0; }, { passive: true });
    addEventListener('blur', () => { downTarget = 0; });
    document.documentElement.addEventListener('mouseleave', () => { visible = false; });
    (function frame(now) {
      requestAnimationFrame(frame);
      const dt = last ? Math.min(0.05, (now - last) / 1000) : 0;
      last = now;
      spring(st, 'down', downTarget, downTarget ? 900 : 380, downTarget ? 0.9 : 0.42, dt);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, cv.width, cv.height);
      const hidden = opts.hideWhen && target && target.closest && target.closest(opts.hideWhen);
      if (!visible || hidden) { rig.t = 0; return; }
      const dpr = cv.width / innerWidth;
      const k = size * dpr * (1 - 0.12 * st.down);
      const m = new DOMMatrix([k, 0, 0, k, x * dpr - TIP.x * k, y * dpr - TIP.y * k]);
      rig.restS = size * dpr;
      drawMonika(ctx, rig, crew, 1, now, 0.3, m);
    })(0);
    return cv;
  }

  // A large Monika on her own, idling the way the reference shows her: drifting, leaning into
  // her motion, and tapping now and then.
  function portrait(cv, opts = {}) {
    if (!cv) return;
    const ctx = cv.getContext('2d');
    const crew = Object.assign({}, CREW[1], opts.name ? { name: opts.name } : null);
    const rig = newRig();
    const still = matchMedia('(prefers-reduced-motion: reduce)');
    const fit = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      cv.width = Math.round(cv.clientWidth * dpr);
      cv.height = Math.round(cv.clientHeight * dpr);
    };
    new ResizeObserver(fit).observe(cv);
    fit();
    (function frame(now) {
      requestAnimationFrame(frame);
      if (!cv.width) return;
      const W = cv.width, H = cv.height;
      const t = still.matches ? 0 : now / 1000;
      // the arrow tip sits where it does in the reference image (26% across, 30% down)
      const k = (H * 245) / 1024 / 28.2; // arrow is 245px of the reference image's 1024
      const tap = Math.max(0, Math.sin(t * 1.1)) ** 24; // a quick tap every few seconds
      const s = k * (1 - 0.1 * tap);
      const tx = W * 0.26 + Math.sin(t * 0.7) * W * 0.05 + Math.sin(t * 1.9) * W * 0.012;
      const ty = H * 0.30 + Math.sin(t * 0.9 + 1) * H * 0.06;
      const m = new DOMMatrix([s, 0, 0, s, tx - TIP.x * s, ty - TIP.y * s]);
      rig.restS = k;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, W, H);
      drawMonika(ctx, rig, crew, 1, now, 0.9, m);
    })(0);
  }

  window.MonikaCursor = { CREW, page, portrait, readMarker };
})();
