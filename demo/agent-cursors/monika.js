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
  const css = (c) => `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})`;

  // draw the cursor. pose maps Slate cursor space to canvas pixels, so the arrow turns and
  // flips exactly like Slate's; the pill stays upright beside the tip so the name reads.
  function draw(ctx, rig, pose, alpha, variant, now) {
    let dt = rig.t ? (now - rig.t) / 1000 : 0;
    const fresh = !rig.t || dt > 0.25;
    rig.t = now;
    dt = Math.min(dt, 1 / 20);
    const m = pose;
    const s = Math.sqrt(Math.abs(m.a * m.d - m.b * m.c));
    const tipX = m.a * TIP.x + m.c * TIP.y + m.e;
    const tipY = m.b * TIP.x + m.d * TIP.y + m.f;

    // which colour Slate is showing; a new colour that holds for a moment = a new person
    const v = clamp(Math.round(variant), 1, 6);
    if (rig.who == null) { rig.who = (lastWho + 1) % CREW.length; lastWho = rig.who; }
    if (fresh) { rig.v = v; rig.seen = v; rig.seenAt = now; }
    if (v !== rig.seen) { rig.seen = v; rig.seenAt = now; }
    if (rig.seen !== rig.v && now - rig.seenAt > 70) {
      rig.v = rig.seen;
      rig.who = (rig.who + 1) % CREW.length;
      lastWho = rig.who;
    }
    const target = COLORS[v] || COLORS[1];
    if (fresh || !rig.color) rig.color = target.slice();
    else for (let i = 0; i < 3; i++) rig.color[i] += (target[i] - rig.color[i]) * Math.min(1, dt * 18);
    const fill = css(rig.color);

    // pill trails the tip on a spring
    const tx = tipX + PILL.dx * s, ty = tipY + PILL.dy * s;
    if (fresh || Math.hypot(tx - rig.px, ty - rig.py) > 420 * s) {
      rig.px = tx; rig.py = ty; rig.pxV = rig.pyV = 0;
    } else {
      spring(rig, 'px', tx, 320, 1, dt); // fully damped: follows smoothly, no bounce
      spring(rig, 'py', ty, 320, 1, dt);
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

  // ---------------------------------------------------------------- pointer pose and entrance
  // Like a regular mouse pointer it never turns or flips: it keeps the pose of the reference
  // image (tip at the top-left). With data-monika-upright on the canvas the cursor keeps that pose
  // whatever Slate's cursor does, and only follows where it is and how big.
  function pointerPose(x, y, s) {
    return new DOMMatrix().translate(x, y).scale(s).translate(-TIP.x, -TIP.y);
  }
  function liveParts(m) {
    return { x: m.a * TIP.x + m.c * TIP.y + m.e, y: m.b * TIP.x + m.d * TIP.y + m.f, s: Math.sqrt(Math.abs(m.a * m.d - m.b * m.c)) };
  }

  // The first time the cursor appears, it comes in from below the screen along a winding path
  // (traced from the sketch: up from the bottom, swinging left, right, left) in one smooth
  // movement, setting off gently and settling gently onto Slate's cursor.
  // Points are [x, y] offsets from where it lands, in screen heights.
  const ENTRANCE_PATH = [
    [0.079, 0.593], [0.067, 0.4375], [0.033, 0.4245], [-0.0075, 0.4155], [-0.0156, 0.3725],
    [0.0156, 0.3225], [0.05, 0.2655], [0.033, 0.2405], [-0.0092, 0.2095], [-0.0017, 0.1725],
    [0.0213, 0.1155], [0.047, 0.0755], [0.027, 0.0225], [0, 0],
  ];
  const ENTRANCE_MS = 1700;
  // a smooth curve through the points (Catmull-Rom), measured so it is travelled at an even pace
  const CURVE = (() => {
    const P = ENTRANCE_PATH, pts = [];
    for (let i = 0; i < P.length - 1; i++) {
      const p0 = P[Math.max(0, i - 1)], p1 = P[i], p2 = P[i + 1], p3 = P[Math.min(P.length - 1, i + 2)];
      for (let j = 0; j < 40; j++) {
        const t = j / 40, t2 = t * t, t3 = t2 * t;
        const f = (a, b, c, d) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
        pts.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
      }
    }
    pts.push(P[P.length - 1]);
    const len = [0];
    for (let i = 1; i < pts.length; i++) len.push(len[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    return { pts, len, total: len[len.length - 1] };
  })();
  function along(u) {
    const d = u * CURVE.total, L = CURVE.len, P = CURVE.pts;
    let i = 1;
    while (i < L.length - 1 && L[i] < d) i++;
    const k = (d - L[i - 1]) / (L[i] - L[i - 1] || 1), a = P[i - 1], b = P[i];
    return { x: a[0] + (b[0] - a[0]) * k, y: a[1] + (b[1] - a[1]) * k };
  }
  // minimum-jerk: the smoothest possible start-to-stop movement
  const minJerk = (t) => t * t * t * (10 - 15 * t + 6 * t * t);

  function entrancePose(canvas, rig, live, now) {
    const L = liveParts(live);
    const e = rig.entry || (rig.entry = { at: now, x: L.x, y: L.y });
    const k = (now - e.at) / ENTRANCE_MS;
    if (k >= 1) { e.done = true; return null; }
    const r = canvas.getBoundingClientRect();
    const Hpx = innerHeight * (canvas.width / (r.width || 1)); // screen height in canvas pixels
    const p = along(minJerk(k));
    let x = e.x + p.x * Hpx, y = e.y + p.y * Hpx;
    // over the last stretch, settle onto Slate's cursor wherever it is by now
    const land = k < 0.75 ? 0 : minJerk((k - 0.75) / 0.25);
    x += (L.x - x) * land; y += (L.y - y) * land;
    return pointerPose(x, y, L.s);
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
    let rig = rigs.get(this.canvas);
    if (!rig) rigs.set(this.canvas, (rig = { t: 0, px: 0, py: 0 }));
    const now = performance.now();
    const ds = this.canvas.dataset;
    // data-monika-entrance: come in along the winding path the first time it appears
    const entering = ds.monikaEntrance != null && !(rig.entry && rig.entry.done) && entrancePose(this.canvas, rig, pose, now);
    if (entering) pose = entering;
    else if (ds.monikaUpright != null) { const L = liveParts(pose); pose = pointerPose(L.x, L.y, L.s); } // a regular pointer
    draw(this, rig, pose, mk.a, mk.b, now);
  };
  P.stroke = function () {
    if (readMarker(this.strokeStyle)) return;
    return nativeStroke.apply(this, arguments);
  };

  window.AgentCursor = { CREW, draw };
})();
