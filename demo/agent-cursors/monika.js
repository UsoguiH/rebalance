// Monika: the glowing blue agent cursor (arrow + "Monika" pill) from the reference image,
// drawn in place of the cursor in Slate's loading screen.
//
// How it works: the loader's Rive file is fetched with its cursor recoloured to "marker"
// colours (tools/fetch-slate-assets.js). Rive's Canvas2D player paints every shape with a
// plain ctx.fill()/stroke(), so this file patches those two calls. When the cursor's marker
// colour comes through, Slate's cursor is skipped and Monika is drawn at the same spot and
// layer, always upright and always blue, exactly as in the reference. The pill trails the
// arrow on a spring so fast moves feel soft.
(function () {
  'use strict';

  const LOOK = {
    name: 'Monika',
    fill: '#0a84ff',            // arrow and pill
    glow: 'rgba(0, 112, 255, 0.95)',
    text: '#ffffff',
    font: '700 {px}px "Inter", "SF Pro Display", system-ui, -apple-system, "Segoe UI", sans-serif',
  };

  // Geometry, measured from the reference image (1536 x 1024: arrow tip at 403,305, arrow
  // ~245px tall), in Slate cursor units (their arrow is ~29 units tall, tip near -12.6,-14.2).
  const TIP = { x: -12.6, y: -14.2 };
  const ARROW = [[-15.0, -16.4, 2.6], [18.2, -5.1, 3.4], [-2.5, 16.2, 3.6]]; // x, y, corner radius
  const PILL = { dx: 20.7, dy: 18.9, h: 27.85, font: 15.1, pad: 15.1 };   // from the tip
  const GLOW = 13;                                                         // blur radius, units

  function roundedPoly(pts) {
    const p = new Path2D();
    const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    const start = mid(pts[pts.length - 1], pts[0]);
    p.moveTo(start[0], start[1]);
    pts.forEach((cur, i) => {
      const m = mid(cur, pts[(i + 1) % pts.length]);
      p.arcTo(cur[0], cur[1], m[0], m[1], cur[2]);
    });
    p.closePath();
    return p;
  }
  const ARROW_PATH = roundedPoly(ARROW);

  const nativeFill = CanvasRenderingContext2D.prototype.fill;
  const nativeStroke = CanvasRenderingContext2D.prototype.stroke;

  // fill a path with the reference's glow: a wide soft halo, a tighter bright one, then the body
  function glowFill(ctx, path, blurPx, passes = [2.4, 1.3, 0.6, 0.25]) {
    ctx.fillStyle = LOOK.fill;
    ctx.shadowColor = LOOK.glow;
    for (const k of passes) {
      ctx.shadowBlur = blurPx * k;
      nativeFill.call(ctx, path);
    }
    ctx.shadowBlur = 0;
    ctx.shadowColor = 'transparent';
    nativeFill.call(ctx, path);
  }

  // ---------------------------------------------------------------- rig
  function spring(st, key, target, k, zeta, dt) {
    const c = 2 * Math.sqrt(k) * zeta;
    let x = st[key], v = st[key + 'V'] || 0;
    const steps = Math.max(1, Math.ceil(dt / (1 / 240)));
    const h = dt / steps;
    for (let i = 0; i < steps; i++) { v += (k * (target - x) - c * v) * h; x += v * h; }
    st[key] = x;
    st[key + 'V'] = v;
  }

  const widths = new Map();
  function textWidth(ctx, px) {
    const k = Math.round(px * 4);
    if (!widths.has(k)) { ctx.font = LOOK.font.replace('{px}', px.toFixed(2)); widths.set(k, ctx.measureText(LOOK.name).width); }
    return widths.get(k);
  }

  // draw Monika with her arrow tip at (tipX, tipY) canvas pixels, s canvas pixels per unit
  function draw(ctx, rig, tipX, tipY, s, alpha, now) {
    let dt = rig.t ? (now - rig.t) / 1000 : 0;
    const fresh = !rig.t || dt > 0.25;
    rig.t = now;
    dt = Math.min(dt, 1 / 20);
    const tx = tipX + PILL.dx * s, ty = tipY + PILL.dy * s;
    if (fresh || Math.hypot(tx - rig.px, ty - rig.py) > 420 * s) {
      rig.px = tx; rig.py = ty; rig.pxV = rig.pyV = 0;
    } else {
      spring(rig, 'px', tx, 520, 0.8, dt);
      spring(rig, 'py', ty, 520, 0.8, dt);
    }
    const blur = GLOW * s;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = alpha;
    // pill
    const h = PILL.h * s, fontPx = PILL.font * s;
    const w = textWidth(ctx, fontPx) + PILL.pad * 2 * s;
    const pill = new Path2D();
    if (pill.roundRect) pill.roundRect(rig.px, rig.py, w, h, h / 2);
    else pill.rect(rig.px, rig.py, w, h);
    glowFill(ctx, pill, blur);
    ctx.fillStyle = LOOK.text;
    ctx.font = LOOK.font.replace('{px}', fontPx.toFixed(2));
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    ctx.fillText(LOOK.name, rig.px + PILL.pad * s - 0.5 * s, rig.py + h * 0.505);
    // arrow, upright, tip pinned
    ctx.setTransform(s, 0, 0, s, tipX - TIP.x * s, tipY - TIP.y * s);
    // the arrow is smaller than the pill, so it gets extra halo passes to glow as brightly
    glowFill(ctx, ARROW_PATH, blur, [2.4, 1.8, 1.3, 0.9, 0.6, 0.25]);
    ctx.restore();
  }

  // ---------------------------------------------------------------- Rive interception
  // marker colours are rgb(1, g, b); g 254 = the cursor arrow fill, 252/253 = its shadow/outline
  function readMarker(style) {
    if (typeof style !== 'string') return null;
    if (style.length === 7 && style.startsWith('#01f')) {
      const g = parseInt(style.slice(3, 5), 16);
      return g >= 248 ? { g, a: 1 } : null;
    }
    if (style.startsWith('rgba(1, 2')) {
      const m = /^rgba\(1, (\d+), \d+, ([\d.]+)\)$/.exec(style);
      if (m && +m[1] >= 248) return { g: +m[1], a: +m[2] };
    }
    return null;
  }

  const rigs = new WeakMap(); // canvas -> rig
  const P = CanvasRenderingContext2D.prototype;
  P.fill = function () {
    const mk = readMarker(this.fillStyle);
    if (!mk) return nativeFill.apply(this, arguments);
    if (mk.g !== 254 || mk.a <= 0.004) return; // Slate's own shadow/outline: not part of Monika
    const m = this.getTransform();
    const s0 = Math.sqrt(Math.abs(m.a * m.d - m.b * m.c));
    const grow = parseFloat(this.canvas.dataset && this.canvas.dataset.monikaScale) || 1;
    const tipX = m.a * TIP.x + m.c * TIP.y + m.e;
    const tipY = m.b * TIP.x + m.d * TIP.y + m.f;
    let rig = rigs.get(this.canvas);
    if (!rig) rigs.set(this.canvas, (rig = { t: 0, px: 0, py: 0 }));
    draw(this, rig, tipX, tipY, s0 * grow, mk.a, performance.now());
  };
  P.stroke = function () {
    if (readMarker(this.strokeStyle)) return;
    return nativeStroke.apply(this, arguments);
  };

  window.MonikaCursor = { LOOK, draw };
})();
