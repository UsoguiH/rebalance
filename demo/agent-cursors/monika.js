// The agent cursor (arrow + name pill) from the reference image, named سارة, drawn in place
// of the cursor in Slate's loading screen.
//
// How it works: the loader's Rive file is fetched with its cursor recoloured to "marker"
// colours (tools/fetch-slate-assets.js). Rive's Canvas2D player paints every shape with a
// plain ctx.fill()/stroke(), so this file patches those two calls. When the cursor's marker
// colour comes through, Slate's cursor is skipped and this one is drawn at the same spot and
// layer, always upright, always blue and flat. The pill trails the arrow on a spring so fast
// moves feel soft.
(function () {
  'use strict';

  const LOOK = {
    name: 'سارة',
    fill: '#0a84ff',            // arrow and pill
    text: '#ffffff',
    font: '700 {px}px "Tajawal", "IBM Plex Sans Arabic", "Segoe UI", Tahoma, sans-serif',
  };

  // Geometry, measured from the reference image (1536 x 1024: arrow tip at 403,305, arrow
  // ~245px tall), in Slate cursor units (their arrow is ~29 units tall, tip near -12.6,-14.2).
  // The arrow is a pointer, not a plain triangle: its lower edge has the notch a mouse cursor has.
  const TIP = { x: -12.6, y: -14.2 };
  const ARROW = [
    [-15.0, -16.4, 2.6], // tip
    [18.2, -5.1, 3.4],   // right point
    [2.1, 0.1, 1.6],     // notch on the lower edge
    [-2.5, 16.2, 3.6],   // bottom point
  ];
  // pill, from the tip; width fixed to the reference's so the shape stays the same for any name
  const PILL = { dx: 20.7, dy: 18.9, w: 82.5, h: 27.85, font: 17.5 };

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

  // draw the cursor with its arrow tip at (tipX, tipY) canvas pixels, s canvas pixels per unit
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
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = alpha;
    // pill
    const w = PILL.w * s, h = PILL.h * s;
    const pill = new Path2D();
    if (pill.roundRect) pill.roundRect(rig.px, rig.py, w, h, h / 2);
    else pill.rect(rig.px, rig.py, w, h);
    ctx.fillStyle = LOOK.fill;
    nativeFill.call(ctx, pill);
    ctx.fillStyle = LOOK.text;
    ctx.font = LOOK.font.replace('{px}', (PILL.font * s).toFixed(2));
    ctx.direction = 'rtl';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(LOOK.name, rig.px + w / 2, rig.py + h * 0.5);
    // arrow, upright, tip pinned
    ctx.setTransform(s, 0, 0, s, tipX - TIP.x * s, tipY - TIP.y * s);
    ctx.fillStyle = LOOK.fill;
    nativeFill.call(ctx, ARROW_PATH);
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
    if (mk.g !== 254 || mk.a <= 0.004) return; // Slate's own shadow/outline: not part of this cursor
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

  window.AgentCursor = { LOOK, draw };
})();
