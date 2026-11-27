// The agent cursor (arrow + name pill) from the reference image, drawn in place of the cursor
// in Slate's loading screen. Every time Slate's cursor changes colour, the name changes to the
// next one in the list.
//
// How it works: the loader's Rive file is fetched with its cursor recoloured to "marker"
// colours (tools/fetch-slate-assets.js). Rive's Canvas2D player paints every shape with a
// plain ctx.fill()/stroke(), so this file patches those two calls. When the cursor's marker
// colour comes through, Slate's cursor is skipped and this one is drawn at the same spot and
// layer, turning and changing colour with Slate's cursor. The pill stays upright and trails
// the arrow on a spring so fast moves feel soft.
(function () {
  'use strict';

  // a different name at each colour change, women and men in turn, all in one font
  // (IBM Plex Sans Arabic from Google Fonts, loaded in index.html)
  const FONT = '700 {px}px "IBM Plex Sans Arabic"';
  const CREW = [
    { name: 'سارة', font: FONT, size: 0.86, dy: 0 },
    { name: 'فهد', font: FONT, size: 0.86, dy: 0 },
    { name: 'نورة', font: FONT, size: 0.86, dy: 0 },
    { name: 'خالد', font: FONT, size: 0.86, dy: 0 },
    { name: 'ليان', font: FONT, size: 0.86, dy: 0 },
    { name: 'محمد', font: FONT, size: 0.86, dy: 0 },
    { name: 'رهف', font: FONT, size: 0.86, dy: 0 },
    { name: 'سعود', font: FONT, size: 0.86, dy: 0 },
    { name: 'جود', font: FONT, size: 0.86, dy: 0 },
    { name: 'ناصر', font: FONT, size: 0.86, dy: 0 },
    { name: 'ريم', font: FONT, size: 0.86, dy: 0 },
    { name: 'تركي', font: FONT, size: 0.86, dy: 0 },
    { name: 'هيا', font: FONT, size: 0.86, dy: 0 },
    { name: 'ماجد', font: FONT, size: 0.86, dy: 0 },
  ];
  const FALLBACK = ', "Segoe UI", Tahoma, sans-serif';
  // ask the browser for the font up front, with every name's letters, so it is ready at once
  if (document.fonts) document.fonts.load(FONT.replace('{px}', '40'), CREW.map((c) => c.name).join('')).catch(() => {});
  const TEXT = '#ffffff';

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
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

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

  // Slate's cursor colours by marker index (see tools/fetch-slate-assets.js); 1 is the blue
  const COLORS = { 1: [10, 132, 255], 2: [0, 183, 43], 3: [250, 93, 30], 4: [200, 138, 250], 5: [255, 103, 145], 6: [10, 132, 255] };
  function toHsl([r, g, b]) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2, d = max - min;
    if (!d) return [0, 0, l * 100];
    const sat = d / (1 - Math.abs(2 * l - 1));
    const h = max === r ? ((g - b) / d + 6) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
    return [h * 60, sat * 100, l * 100];
  }

  // Honey smoothing: instead of jumping to each pose, the arrow is pulled toward it by a soft,
  // critically damped spring (position, turn and size), so Slate's quick hops become one
  // flowing path. AgentCursor.smooth sets how soft: 0 follows exactly, higher is runnier.
  function honey(rig, pose, dt, fresh) {
    const soft = rig.smooth != null ? rig.smooth : AC.smooth || 0;
    const m = pose;
    const sx = Math.hypot(m.a, m.b), det = m.a * m.d - m.b * m.c;
    const raw = {
      x: m.a * TIP.x + m.c * TIP.y + m.e, y: m.b * TIP.x + m.d * TIP.y + m.f,
      a: Math.atan2(m.b, m.a), sx, sy: det / (sx || 1),
    };
    const st = rig.sm;
    if (!soft || fresh || !st) {
      // following exactly: still track speed, so a later switch to honey carries on from it
      const v = { xV: 0, yV: 0, aV: 0, sxV: 0, syV: 0 };
      if (st && !fresh && dt > 0) {
        for (const key of ['x', 'y', 'sx', 'sy']) v[key + 'V'] = (raw[key] - st[key]) / dt;
        v.aV = Math.atan2(Math.sin(raw.a - st.a), Math.cos(raw.a - st.a)) / dt;
      }
      rig.sm = Object.assign(v, raw);
      if (!soft) return pose;
    }
    else {
      const k = 1600 / (1 + soft * soft); // soft 0 -> very tight, soft 5 -> honey
      st.a = raw.a + Math.atan2(Math.sin(st.a - raw.a), Math.cos(st.a - raw.a)); // turn the short way
      for (const key of ['x', 'y', 'a', 'sx', 'sy']) spring(st, key, raw[key], k, 1, dt);
    }
    const q = rig.sm;
    return new DOMMatrix().translate(q.x, q.y).rotate((q.a * 180) / Math.PI).scale(q.sx, q.sy).translate(-TIP.x, -TIP.y);
  }

  // draw the cursor. pose maps Slate cursor space to canvas pixels, so the arrow turns and
  // flips exactly like Slate's; the pill stays upright beside the tip so the name reads.
  function draw(ctx, rig, pose, alpha, variant, now) {
    let dt = rig.t ? (now - rig.t) / 1000 : 0;
    const fresh = !rig.t || dt > 0.25;
    rig.t = now;
    dt = Math.min(dt, 1 / 20);
    const m = honey(rig, pose, dt, fresh);
    const s = Math.sqrt(Math.abs(m.a * m.d - m.b * m.c));
    const tipX = m.a * TIP.x + m.c * TIP.y + m.e;
    const tipY = m.b * TIP.x + m.d * TIP.y + m.f;

    // which colour Slate is showing; a new colour that holds for a moment = a new person
    const v = clamp(Math.round(variant), 1, 6);
    if (rig.who == null) { rig.who = (lastWho + 1) % CREW.length; lastWho = rig.who; }
    if (fresh) { rig.v = v; rig.seen = v; rig.seenAt = now; }
    if (v !== rig.seen) { rig.seen = v; rig.seenAt = now; }
    // Slate blends through other colours on its way (green -> orange -> purple), so a colour
    // only counts once it holds for a moment; then the name and the fade both follow it
    if (rig.seen !== rig.v && now - rig.seenAt > 120) {
      rig.v = rig.seen;
      rig.who = (rig.who + 1) % CREW.length;
      lastWho = rig.who;
    }
    const target = COLORS[rig.v] || COLORS[1];
    // fade colours around the colour wheel, so green -> purple stays bright instead of going brown
    const goal = toHsl(target);
    if (fresh || !rig.hsl) rig.hsl = goal.slice();
    else {
      const k = Math.min(1, dt * 14);
      rig.hsl[0] += (((goal[0] - rig.hsl[0] + 540) % 360) - 180) * k;
      rig.hsl[1] += (goal[1] - rig.hsl[1]) * k;
      rig.hsl[2] += (goal[2] - rig.hsl[2]) * k;
    }
    rig.color = target;
    const fill = `hsl(${(((rig.hsl[0] % 360) + 360) % 360).toFixed(1)} ${rig.hsl[1].toFixed(1)}% ${rig.hsl[2].toFixed(1)}%)`;

    // pill trails the tip on a spring
    const tx = tipX + PILL.dx * s, ty = tipY + PILL.dy * s;
    if (fresh || Math.hypot(tx - rig.px, ty - rig.py) > 420 * s) {
      rig.px = tx; rig.py = ty; rig.pxV = rig.pyV = 0;
    } else {
      // honey: soft and fully damped, it flows after the tip and settles without a wobble
      spring(rig, 'px', tx, rig.pillK || 150, rig.pillZ || 1, dt);
      spring(rig, 'py', ty, rig.pillK || 150, rig.pillZ || 1, dt);
    }

    const w = PILL.w * s, h = PILL.h * s;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = alpha;
    const pill = new Path2D();
    if (pill.roundRect) pill.roundRect(rig.px, rig.py, w, h, h / 2);
    else pill.rect(rig.px, rig.py, w, h);
    ctx.fillStyle = fill;
    nativeFill.call(ctx, pill);
    ctx.fillStyle = TEXT;
    const who = CREW[rig.who];
    ctx.font = who.font.replace('{px}', (PILL.font * s * who.size).toFixed(2)) + FALLBACK;
    ctx.direction = 'rtl';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(who.name, rig.px + w / 2, rig.py + h * (0.5 + who.dy));
    // arrow, turning with Slate's cursor
    ctx.setTransform(m.a, m.b, m.c, m.d, m.e, m.f);
    ctx.fillStyle = fill;
    nativeFill.call(ctx, ARROW_PATH);
    ctx.restore();
  }

  // ---------------------------------------------------------------- Rive interception
  // marker colours are rgb(1, g, b); g 254 = the cursor arrow fill (b = which colour),
  // 252/253 = its shadow/outline
  function readMarker(style) {
    if (typeof style !== 'string') return null;
    if (style.length === 7 && style.startsWith('#01f')) {
      const g = parseInt(style.slice(3, 5), 16);
      return g >= 248 ? { g, b: parseInt(style.slice(5, 7), 16), a: 1 } : null;
    }
    if (style.startsWith('rgba(1, 2')) {
      const m = /^rgba\(1, (\d+), (\d+), ([\d.]+)\)$/.exec(style);
      if (m && +m[1] >= 248) return { g: +m[1], b: +m[2], a: +m[3] };
    }
    return null;
  }

  const rigs = new WeakMap(); // canvas -> rig
  let lastWho = -1;           // carried across replays, so each run continues with the next name
  const P = CanvasRenderingContext2D.prototype;
  P.fill = function () {
    const mk = readMarker(this.fillStyle);
    if (!mk) return nativeFill.apply(this, arguments);
    if (mk.g !== 254 || mk.a <= 0.004) return; // Slate's own shadow/outline: not part of this cursor
    let pose = this.getTransform();
    // data-monika-scale on the canvas draws it bigger, grown around the arrow tip
    const grow = parseFloat(this.canvas.dataset && this.canvas.dataset.monikaScale) || 1;
    if (grow !== 1) pose = pose.multiply(new DOMMatrix().translate(TIP.x, TIP.y).scale(grow).translate(-TIP.x, -TIP.y));
    // a page can watch Slate's cursor (and hide it, by returning false) through AgentCursor.hook;
    // the loader uses it to hand its own intro cursor over to Slate's without a jump
    if (AC.hook && AC.hook(this.canvas, pose, mk.b) === false) return;
    let rig = rigs.get(this.canvas);
    if (!rig) rigs.set(this.canvas, (rig = { t: 0, px: 0, py: 0 }));
    draw(this, rig, pose, mk.a, mk.b, performance.now());
  };
  P.stroke = function () {
    if (readMarker(this.strokeStyle)) return;
    return nativeStroke.apply(this, arguments);
  };

  const AC = (window.AgentCursor = {
    CREW, TIP, ARROW, draw, hook: null, smooth: 0,
    newRig: () => ({ t: 0, px: 0, py: 0 }),
    setRig: (canvas, rig) => rigs.set(canvas, rig),
  });
})();
