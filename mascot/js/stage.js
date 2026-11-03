// stage.js: draws one moment of a loop into a 2D canvas: the live shadow, the bent
// drawing (SpriteRig), then the effects that ride on it. The view is shared by every
// canvas: 420 × 560 drawing px, the floor 40 px above the bottom, so all poses keep
// the same size and the same floor.
(function (root) {
  'use strict';
  const { clamp, loop, bell, seeded } = root.Motion;
  const VIEW = { w: 420, h: 560, floorPad: 40 };
  const SHADOW = 'rgba(120,124,150,0.26)';

  const rigs = {};
  async function load(base) {
    const ids = Object.keys(root.Poses.DRAWINGS);
    await Promise.all(ids.map(async (id) => { rigs[id] = await root.SpriteRig.build(root.Poses.DRAWINGS[id], base); }));
    return rigs;
  }

  /** Same scale and floor for every pose; each is centred on its own drawing's box. */
  function viewFor(canvas, d, zoom, rig) {
    const W = canvas.width, H = canvas.height;
    const s = Math.min(W / VIEW.w, H / VIEW.h) * (zoom || 1);
    const cx = rig ? (rig.bbox[0] + rig.bbox[2]) / 2 : d.hip[0];
    return { scale: s, ox: W / 2, oy: H - VIEW.floorPad * s, ax: cx, ay: d.floor };
  }

  function star4(g, x, y, r, col) {
    g.beginPath();
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 4 - Math.PI / 2, rr = i % 2 ? r * 0.3 : r;
      g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    }
    g.closePath(); g.fillStyle = col; g.fill();
  }

  /**
   * Draw clip at time t. opts: { alpha, squash (extra sy for transitions), clear }.
   */
  function draw(canvas, clip, t, opts) {
    opts = opts || {};
    const g = canvas.getContext('2d');
    const d = clip.d, rig = rigs[clip.drawing];
    if (!rig) return;
    if (opts.clear !== false) { g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, canvas.width, canvas.height); }
    const { P, c } = root.Poses.params(clip, t);
    if (opts.squash) { P.root.sy *= opts.squash; P.root.sx /= Math.pow(opts.squash, 0.6); }
    const v = viewFor(canvas, d, opts.zoom, rig);
    const toPx = (x, y) => [(x - v.ax) * v.scale + v.ox, (y - v.ay) * v.scale + v.oy];
    const alpha = opts.alpha == null ? 1 : opts.alpha;

    // shadow: on the floor, shrinking as he rises (the jump drawing already floats above it)
    g.save();
    g.globalAlpha = alpha;
    const air = clip.inAir ? 16 : 0;
    const k = clamp(1 - (c.lift + air) / 300, 0.5, 1.1);
    const [sx, sy] = toPx(d.hip[0] + c.x * 0.5, d.floor);
    g.beginPath();
    g.ellipse(sx, sy, (d.seat ? 122 : 92) * k * v.scale, 9 * k * v.scale, 0, 0, Math.PI * 2);
    g.fillStyle = SHADOW; g.fill();
    g.restore();

    root.SpriteRig.render(g, rig, P, v, c.lid, alpha);

    // effects, riding on points of the drawing
    const at = (x, y) => toPx(...root.SpriteRig.warpPoint(rig, P, x, y));
    const s = v.scale;
    g.save();
    g.globalAlpha = alpha;
    if (c.stars) {
      const centre = clip.drawing === 'p03' ? [276, 108] : [250, 128];
      const [bx, by] = at(...centre);
      for (let i = 0; i < 5; i++) {
        const ph = loop(t, 1200 + seeded(i) * 500, seeded(i, 3));
        const a = seeded(i, 1) * Math.PI * 2, dd = (52 + seeded(i, 2) * 26) * s;
        star4(g, bx + Math.cos(a) * dd, by + Math.sin(a) * dd * 0.9, (6 + seeded(i, 4) * 6) * bell(ph) * s, i % 2 ? '#fbc85f' : '#ffffff');
      }
    }
    if (d.sparks) {
      // the drawing's own spark strokes, popping out from the pointer with each tap
      const k = c.sparkS || 1;
      g.lineCap = 'round'; g.strokeStyle = d.sparkColor; g.lineWidth = d.sparkW * s;
      for (const [x0, y0, x1, y1] of d.sparks) {
        const push = (k - 1) * 0.35;
        const ix = x0 + (x0 - x1) * -push, iy = y0 + (y0 - y1) * -push;
        const [ax, ay] = at(ix, iy), [bx, by] = at(ix + (x1 - x0) * k, iy + (y1 - y0) * k);
        g.beginPath(); g.moveTo(ax, ay); g.lineTo(bx, by); g.stroke();
      }
    }
    if (c.zzz) {
      const [hx, hy] = at(228, 44);
      for (let i = 0; i < 3; i++) {
        const p = loop(t, 2400, i / 3);
        g.save();
        g.translate(hx + (p * 46 + Math.sin(p * 5) * 6) * s, hy - p * 80 * s);
        g.rotate(-0.2 + Math.sin(p * 4) * 0.12);
        g.globalAlpha = alpha * bell(p);
        g.fillStyle = '#8a5ce6';
        g.font = `900 ${(16 + p * 16) * s}px Tajawal, system-ui, sans-serif`;
        g.textAlign = 'center'; g.textBaseline = 'middle';
        g.fillText('z', 0, 0);
        g.restore();
      }
    }
    if (c.sweat > 0.01 && c.sweat < 0.99) {
      const p = c.sweat;
      const [x0, y0] = at(214, 84);
      g.save();
      g.globalAlpha = alpha * bell(p);
      g.translate(x0 + p * 4 * s, y0 + p * 34 * s); g.scale(s, s);
      g.beginPath(); g.moveTo(0, -11); g.quadraticCurveTo(7, 0, 6, 4); g.arc(0, 4, 6, 0, Math.PI); g.quadraticCurveTo(-7, 0, 0, -11);
      g.fillStyle = '#8fd6ff'; g.fill();
      g.beginPath(); g.arc(-2, 3, 1.8, 0, Math.PI * 2); g.fillStyle = '#fff'; g.fill();
      g.restore();
    }
    if (c.dust > 0.01 && c.dust < 0.99) {
      const p = c.dust;
      g.globalAlpha = alpha * bell(p) * 0.9;
      for (const [fx, side] of [[31, -1], [31, 1], [70, -1], [215, 1]]) {
        for (let i = 0; i < 3; i++) {
          const [px, py] = toPx(fx + side * (6 + p * 22 + i * 8), d.floor - 4 - i * 5 - p * 8);
          g.beginPath(); g.arc(px, py, (4 + i * 1.4) * (0.5 + p) * s, 0, Math.PI * 2); g.fillStyle = '#efe0cc'; g.fill();
        }
      }
    }
    g.restore();
  }

  root.Stage = { load, draw, VIEW };
})(window);
