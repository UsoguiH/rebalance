// The agent cursor (arrow + name pill) from the reference image, drawn in place of the cursor
// in Slate's loading screen. Every time Slate's cursor changes colour, a different person takes
// over, each with her own name and font, arriving with the effect of the world she comes from.
//
// How it works: the loader's Rive file is fetched with its cursor recoloured to "marker"
// colours (tools/fetch-slate-assets.js). Rive's Canvas2D player paints every shape with a
// plain ctx.fill()/stroke(), so this file patches those two calls. When the cursor's marker
// colour comes through, Slate's cursor is skipped and this one is drawn at the same spot and
// layer, turning and changing colour with Slate's cursor. The pill stays upright and trails
// the arrow on a spring so fast moves feel soft.
(function () {
  'use strict';

  // ---------------------------------------------------------------- the crew, one per world
  // name, font, how big that font draws (fonts differ), a baseline nudge, and the world's effect
  const CREW = [
    { name: 'سارة', font: '700 {px}px "Tajawal"', size: 1, dy: 0, world: 'glitch' },
    { name: 'نورة', font: '700 {px}px "Reem Kufi"', size: 0.92, dy: -0.04, world: 'pixel' },
    { name: 'ليان', font: '700 {px}px "Amiri"', size: 1.02, dy: -0.06, world: 'liquid' },
    { name: 'رهف', font: '400 {px}px "Lalezar"', size: 1, dy: 0.02, world: 'portal' },
    { name: 'جود', font: '700 {px}px "Marhey"', size: 0.9, dy: 0, world: 'flip' },
    { name: 'ريم', font: '400 {px}px "Rakkas"', size: 1, dy: 0.02, world: 'scan' },
    { name: 'هيا', font: '700 {px}px "Aref Ruqaa"', size: 1.02, dy: -0.08, world: 'hyperspace' },
  ];
  const FALLBACK = ', "Tajawal", "IBM Plex Sans Arabic", "Segoe UI", Tahoma, sans-serif';
  const SWITCH_MS = 650;   // how long one arrival takes
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
  const easeOut = (t) => 1 - Math.pow(1 - t, 3);
  const easeBack = (t) => { const c = 1.9; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };

  // ---------------------------------------------------------------- fonts
  // load every world's font up front; drop cached pills once they arrive
  const sprites = new Map();
  if (document.fonts) {
    for (const c of CREW) document.fonts.load(c.font.replace('{px}', '40'), c.name).catch(() => {});
    document.fonts.addEventListener && document.fonts.addEventListener('loadingdone', () => sprites.clear());
  }

  // ---------------------------------------------------------------- pill sprites
  // one pill (in a colour) per person, drawn once into an offscreen canvas, plus tinted ghosts
  function pillSprite(who, color, w, h) {
    const key = who.name + '|' + color + '|' + Math.round(w) + 'x' + Math.round(h);
    let sp = sprites.get(key);
    if (sp) return sp;
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h));
    const g = c.getContext('2d');
    const body = new Path2D();
    if (body.roundRect) body.roundRect(0, 0, w, h, h / 2); else body.rect(0, 0, w, h);
    g.fillStyle = color;
    nativeFill.call(g, body);
    g.fillStyle = TEXT;
    g.font = who.font.replace('{px}', (PILL.font / PILL.h * h * who.size).toFixed(2)) + FALLBACK;
    g.direction = 'rtl';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(who.name, w / 2, h * (0.5 + who.dy));
    const tint = (col) => {
      const t = document.createElement('canvas');
      t.width = c.width; t.height = c.height;
      const tg = t.getContext('2d');
      tg.drawImage(c, 0, 0);
      tg.globalCompositeOperation = 'source-in';
      tg.fillStyle = col;
      tg.fillRect(0, 0, t.width, t.height);
      return t;
    };
    sp = { img: c, red: tint('#ff2d55'), cyan: tint('#00e5ff'), w, h };
    if (sprites.size > 80) sprites.clear();
    sprites.set(key, sp);
    return sp;
  }

  const tiny = document.createElement('canvas');

  // draw one pill at (x, y) with its world's effect; p is presence: 0 gone, 1 fully here
  function drawWorld(ctx, sp, world, x, y, p, now, seed) {
    const { img, w, h } = sp;
    if (p <= 0) return;
    if (p >= 1) { ctx.drawImage(img, x, y, w, h); return; }
    const q = 1 - p;
    const rnd = (i) => { const v = Math.sin((i + 1) * 91.7 + seed * 13.3 + Math.floor(now / 45)) * 43758.5; return v - Math.floor(v); };
    ctx.save();
    switch (world) {
      case 'glitch': { // digital: torn into slices with an RGB split
        const n = 7;
        ctx.globalAlpha *= clamp(p * 1.6, 0, 1);
        for (let i = 0; i < n; i++) {
          const sy = (h / n) * i, sh = h / n + 1;
          const dx = (rnd(i) - 0.5) * q * w * 0.7;
          ctx.drawImage(img, 0, sy, w, sh, x + dx, y + sy, w, sh);
        }
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = q * 0.85;
        const k = q * h * 0.28;
        ctx.drawImage(sp.red, x - k, y, w, h);
        ctx.drawImage(sp.cyan, x + k, y, w, h);
        break;
      }
      case 'pixel': { // 8-bit: resolves out of big blocks
        const block = Math.max(1, Math.round(q * q * h * 0.55));
        const tw = Math.max(1, Math.round(w / block)), th = Math.max(1, Math.round(h / block));
        tiny.width = tw; tiny.height = th;
        const tg = tiny.getContext('2d');
        tg.imageSmoothingEnabled = true;
        tg.drawImage(img, 0, 0, tw, th);
        ctx.imageSmoothingEnabled = false;
        ctx.globalAlpha *= clamp(p * 2.2, 0, 1);
        ctx.drawImage(tiny, x, y, w, h);
        break;
      }
      case 'liquid': { // water: ripples into place
        ctx.globalAlpha *= clamp(p * 1.4, 0, 1);
        const strip = Math.max(2, Math.round(w / 60));
        for (let sx = 0; sx < w; sx += strip) {
          const dy = Math.sin(sx / w * Math.PI * 3 + now / 70) * q * h * 0.45;
          ctx.drawImage(img, sx, 0, strip, h, x + sx, y + dy, strip, h);
        }
        break;
      }
      case 'portal': { // through a ring: spins and grows out of a point
        const cx = x + w / 2, cy = y + h / 2;
        ctx.strokeStyle = 'rgba(255,255,255,' + (q * 0.9).toFixed(3) + ')';
        ctx.lineWidth = Math.max(1, h * 0.08);
        ctx.beginPath();
        ctx.ellipse(cx, cy, w * (0.2 + p * 0.55), h * (0.4 + p * 0.9), 0, 0, Math.PI * 2);
        nativeStroke.call(ctx);
        const sc = Math.max(0.01, easeBack(p));
        ctx.translate(cx, cy);
        ctx.rotate(q * q * Math.PI * 1.6);
        ctx.scale(sc, sc);
        ctx.globalAlpha *= clamp(p * 2, 0, 1);
        ctx.drawImage(img, -w / 2, -h / 2, w, h);
        break;
      }
      case 'flip': { // a card: flips over toward you
        const a = q * Math.PI / 2;
        const sy = Math.max(0.02, Math.cos(a));
        ctx.translate(x + w / 2, y + h / 2);
        ctx.transform(1, 0, Math.sin(a) * 0.35, sy, 0, 0);
        ctx.globalAlpha *= clamp(p * 1.8, 0, 1);
        ctx.drawImage(img, -w / 2, -h / 2, w, h);
        break;
      }
      case 'scan': { // light beam: written in from the right, the way Arabic reads
        const edge = w * easeOut(p);
        ctx.drawImage(img, w - edge, 0, edge, h, x + w - edge, y, edge, h);
        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = 'rgba(255,255,255,' + (0.9 * q + 0.1).toFixed(3) + ')';
        ctx.fillRect(x + w - edge - h * 0.06, y - h * 0.25, h * 0.12, h * 1.5);
        break;
      }
      case 'hyperspace': { // warp: streaks in from far away
        const stretch = 1 + q * q * 7;
        const off = q * q * w * 2.2;
        ctx.globalAlpha *= clamp(p * 1.5, 0, 1);
        const dh = h * (1 - q * 0.5);
        ctx.drawImage(img, x + off, y + (h - dh) / 2, w * stretch, dh);
        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = 'rgba(255,255,255,' + (q * 0.7).toFixed(3) + ')';
        for (let i = 0; i < 5; i++) {
          const ly = y + h * (0.15 + 0.17 * i);
          ctx.fillRect(x + off + w * 0.2, ly, w * stretch * (0.4 + rnd(i) * 0.6), Math.max(1, h * 0.03));
        }
        break;
      }
      default:
        ctx.globalAlpha *= p;
        ctx.drawImage(img, x, y, w, h);
    }
    ctx.restore();
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
    if (fresh) { rig.v = v; rig.seen = v; rig.seenAt = now; rig.from = -1; rig.switchAt = -1e9; }
    if (v !== rig.seen) { rig.seen = v; rig.seenAt = now; }
    if (rig.seen !== rig.v && now - rig.seenAt > 70) {
      rig.v = rig.seen;
      rig.from = rig.who;
      rig.who = (rig.who + 1) % CREW.length;
      lastWho = rig.who;
      rig.switchAt = now;
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
      spring(rig, 'px', tx, 520, 0.8, dt);
      spring(rig, 'py', ty, 520, 0.8, dt);
    }

    const k = clamp((now - rig.switchAt) / SWITCH_MS, 0, 1); // 0..1 through an arrival
    const jump = k < 1 ? Math.sin(k * Math.PI) : 0;          // peaks mid-arrival
    const w = PILL.w * s, h = PILL.h * s;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = alpha;
    // the one leaving goes back into her world, the one arriving comes out of hers
    if (k < 1 && rig.from >= 0) {
      const out = CREW[rig.from];
      drawWorld(ctx, pillSprite(out, fill, w, h), out.world, rig.px, rig.py, 1 - clamp(k / 0.45, 0, 1), now, rig.from);
    }
    const cur = CREW[rig.who];
    drawWorld(ctx, pillSprite(cur, fill, w, h), cur.world, rig.px, rig.py, rig.from >= 0 ? clamp((k - 0.3) / 0.7, 0, 1) : 1, now, rig.who);

    // arrow, turning with Slate's cursor; flickers between worlds while someone new arrives
    ctx.setTransform(m.a, m.b, m.c, m.d, m.e, m.f);
    if (jump > 0.02) {
      const o = jump * 2.2;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = alpha * jump * 0.8;
      ctx.translate(-o, 0); ctx.fillStyle = '#ff2d55'; nativeFill.call(ctx, ARROW_PATH);
      ctx.translate(2 * o, 0); ctx.fillStyle = '#00e5ff'; nativeFill.call(ctx, ARROW_PATH);
      ctx.restore();
    }
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
  let lastWho = -1;           // carried across replays, so each run continues with the next person
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
    draw(this, rig, pose, mk.a, mk.b, performance.now());
  };
  P.stroke = function () {
    if (readMarker(this.strokeStyle)) return;
    return nativeStroke.apply(this, arguments);
  };

  window.AgentCursor = { CREW, draw, _drawWorld: drawWorld, _pillSprite: pillSprite };
})();
