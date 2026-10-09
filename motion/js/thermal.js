'use strict';
// "Thermal camera" silhouettes: the traced outline is turned into a soft
// depth field (blurred mask), then coloured through heat ramps. Also
// supports the burn-away reveal used on the head.

const Thermal = (() => {
  const shapes = {};
  const PAD = 40;

  function make(name, flat, opts = {}) {
    const pts = flatToPts(flat);
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    pts.forEach(([x, y]) => { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); });
    x0 -= PAD; y0 -= PAD; x1 += PAD; y1 = Math.max(y1 + PAD, H + 10);
    const w = Math.ceil(x1 - x0), h = Math.ceil(y1 - y0);
    const path = pathFrom(pts.map(([x, y]) => [x - x0, y - y0]));
    const field = (blur) => {
      const c = document.createElement('canvas'); c.width = w; c.height = h;
      const g = c.getContext('2d');
      g.fillStyle = '#000'; g.fillRect(0, 0, w, h);
      g.filter = blur ? `blur(${blur}px)` : 'none';
      g.fillStyle = '#fff'; g.fill(path);
      // extend the silhouette below the frame so the bottom edge is not darkened
      g.fillRect(0, h - 2, 0, 0);
      const d = g.getImageData(0, 0, w, h).data, out = new Float32Array(w * h);
      for (let i = 0; i < w * h; i++) out[i] = d[i * 4] / 255;
      return out;
    };
    const mask = field(1.2);
    const deep = field(opts.depthBlur || 34);
    const mid = field(12);
    shapes[name] = { name, x0, y0, w, h, mask, deep, mid, bottom: opts.bottom ?? 1e9, cache: {}, path, pts };
    return shapes[name];
  }

  // Colour a shape. fn(u, v, depth, rim) -> [r,g,b]; u,v in frame px
  function paint(name, key, fn) {
    const s = shapes[name];
    if (s.cache[key]) return s.cache[key];
    const c = document.createElement('canvas'); c.width = s.w; c.height = s.h;
    const g = c.getContext('2d');
    const id = g.createImageData(s.w, s.h), d = id.data;
    for (let y = 0; y < s.h; y++) for (let x = 0; x < s.w; x++) {
      const i = y * s.w + x, a = s.mask[i];
      if (a < 0.01) continue;
      const fy = y + s.y0;
      const depth = clamp((s.deep[i] - 0.45) / 0.55);
      const rim = clamp((s.mid[i] - 0.5) / 0.5);
      const col = fn(x + s.x0, fy, depth, rim);
      d[i * 4] = col[0]; d[i * 4 + 1] = col[1]; d[i * 4 + 2] = col[2]; d[i * 4 + 3] = a * 255;
    }
    g.putImageData(id, 0, 0);
    s.cache[key] = c;
    return c;
  }
  function draw(ctx, name, key, fn, o = {}) {
    const s = shapes[name];
    const c = paint(name, key, fn);
    ctx.save();
    ctx.globalAlpha *= o.alpha ?? 1;
    if (o.blur > 0.1) ctx.filter = `blur(${o.blur}px)`;
    if (o.transform) o.transform(ctx);
    ctx.drawImage(c, s.x0, s.y0);
    ctx.restore();
  }
  // Burn: pixels whose depth < threshold are "burnt" (show the under colour),
  // a charred band sits on the burn front.
  function burn(ctx, name, top, under, thr, o = {}) {
    const s = shapes[name];
    const A = paint(name, top.key, top.fn), B = paint(name, under.key, under.fn);
    const [lc, lg] = Layers.get('burn_' + name, s.w, s.h);
    const ga = A.getContext('2d').getImageData(0, 0, s.w, s.h).data;
    const gb = B.getContext('2d').getImageData(0, 0, s.w, s.h).data;
    const id = lg.createImageData(s.w, s.h), d = id.data;
    const band = o.band ?? 0.07;
    for (let i = 0; i < s.w * s.h; i++) {
      const a = s.mask[i];
      if (a < 0.01) continue;
      const v = s.deep[i] * 0.85 + hashNoise(i) * 0.15; // ragged front
      const p = i * 4;
      if (v < thr) {
        d[p] = gb[p]; d[p + 1] = gb[p + 1]; d[p + 2] = gb[p + 2];
      } else {
        const k = clamp((v - thr) / band);
        const charK = 1 - k;
        d[p] = lerp(ga[p], 30, charK * 0.9); d[p + 1] = lerp(ga[p + 1], 24, charK * 0.9); d[p + 2] = lerp(ga[p + 2], 18, charK * 0.9);
      }
      d[p + 3] = a * 255;
    }
    lg.putImageData(id, 0, 0);
    ctx.save();
    if (o.transform) o.transform(ctx);
    ctx.drawImage(lc, s.x0, s.y0);
    ctx.restore();
  }
  const noise = new Float32Array(1 << 16);
  { const r = mulberry32(77); let v = 0; for (let i = 0; i < noise.length; i++) { v = v * 0.6 + r() * 0.4; noise[i] = v; } }
  const hashNoise = i => noise[(i * 7 + ((i / 37) | 0) * 131) & 0xffff];

  return { make, draw, burn, shapes };
})();

// Heat ramps
const HEAT = {
  orange: [[0, [200, 26, 20]], [0.22, [226, 58, 24]], [0.45, [238, 112, 30]], [0.66, [242, 150, 44]], [0.82, [245, 186, 82]], [0.93, [246, 222, 160]], [1, [238, 234, 226]]],
  red: [[0, [120, 10, 40]], [0.3, [190, 20, 50]], [0.6, [226, 40, 50]], [0.85, [236, 90, 60]], [1, [240, 150, 110]]],
  purple: [[0, [60, 30, 170]], [0.35, [100, 30, 170]], [0.65, [170, 30, 130]], [0.9, [210, 40, 90]], [1, [230, 70, 80]]],
  olive: [[0, [140, 110, 50]], [0.5, [168, 140, 66]], [1, [196, 172, 100]]],
  ash: [[0, [92, 82, 74]], [0.5, [80, 72, 66]], [1, [70, 64, 60]]],
  mono: [[0, [70, 70, 70]], [0.6, [64, 64, 64]], [1, [58, 58, 58]]],
};

// Head heat model (sampled from the reference): cool red face edge, hotter
// orange-yellow toward the back/top of the skull, grey-white T-shirt.
HEAT.head = [[0, [182, 48, 42]], [0.25, [194, 56, 41]], [0.4, [206, 74, 40]], [0.55, [214, 100, 38]], [0.7, [220, 138, 40]], [0.85, [222, 163, 50]], [0.95, [214, 190, 130]], [1, [204, 204, 206]]];
function headHeat(ramp_) {
  return (x, y, depth, rim) => {
    const back = clamp((x - 610) / 360) * (1 - 0.5 * clamp((y - 480) / 120));
    let v = 0.12 * rim + 0.2 * depth + 0.6 * back;
    v += 0.22 * clamp(1 - Math.hypot(x - 840, y - 340) / 230);
    v += 0.04 * (Math.sin(x * 0.05 + y * 0.03) + Math.sin(x * 0.021 - y * 0.047));
    if (v > 0.78) v = 0.78 + (v - 0.78) * 0.35; // soft knee: keeps hot spots from clipping into flat patches
    const sh = clamp((1 - ((x - 880) / 168) ** 2 - ((y - 905) / 138) ** 2) * 5); // T-shirt
    v = lerp(v, 1.0, sh);
    return ramp(ramp_, v);
  };
}
// Hand heat model (sampled from the reference): the near fingers and palm
// read pale yellow, the far finger and the wrist fall off to orange/red.
HEAT.hand = [[0, [205, 60, 40]], [0.3, [214, 89, 42]], [0.5, [221, 140, 40]], [0.65, [222, 165, 50]], [0.8, [226, 195, 110]], [1, [228, 212, 150]]];
function handHeat(ramp_) {
  return (x, y, depth, rim) => {
    let v = 0.45 + 0.3 * rim + 0.15 * depth;
    v += 0.35 * clamp((620 - x) / 120) * clamp((700 - y) / 150);
    v -= 0.3 * clamp((x - 600) / 50) * clamp((560 - y) / 120);
    v = lerp(v, Math.min(v, 0.64), clamp((y - 620) / 180));
    v += 0.03 * Math.sin(x * 0.04 + y * 0.03);
    return ramp(ramp_, v);
  };
}
