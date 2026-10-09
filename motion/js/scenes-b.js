'use strict';
// Scenes 4.07s – 9.37s: thermal head ("you dont." / "you just show it."),
// fire-band whip into the pixel-icon ring with ink blobs, and "action.".

// ------------------------------- head ----------------------------------
function initShapes() {
  if (Thermal.shapes.head) return;
  Thermal.make('head', HEAD_POLY, { depthBlur: 38 });
  Thermal.make('hand', HAND_POLY, { depthBlur: 30 });
  Thermal.make('pinch', PINCH_POLY, { depthBlur: 30 });
}
const banded = rampStops => (x, y, d, r) => {
  const c = headHeat(rampStops)(x, y, d, r);
  const v = (d * 6 + y / 140) % 1;
  return v < 0.18 ? mix(c, [250, 110, 90], 0.45) : c;
};
const HEAD_LOOKS = {
  purple: headHeat(HEAT.purple),
  red: banded(HEAT.red),
  orange: headHeat(HEAT.head),
  olive: (x, y, d, r) => mix(headHeat(HEAT.head)(x, y, d, r), ramp(HEAT.olive, d), 0.72),
  ash: (x, y, d) => ramp([[0, [64, 54, 48]], [1, [86, 74, 64]]], d),
  gray: (x, y, d) => ramp([[0, [70, 70, 70]], [1, [60, 60, 60]]], d),
  light: (x, y, d) => ramp([[0, [168, 168, 168]], [1, [150, 150, 150]]], d),
};
function headTransform(t) {
  // measured from the reference: rises in from lower right, overshoots left, then drifts right
  const s = kf(t, [[4.067, 1.02], [4.45, 1.0], [6.5, 1.01, E.lin]]);
  const dx = kf(t, [[4.067, 60], [4.2, -10, E.lin], [4.33, -55, E.outQ], [4.45, -75, E.outQ], [4.67, -60, E.ioQ], [5.0, -36, E.lin], [5.33, 0, E.lin], [6.13, 17, E.lin], [6.5, 20, E.lin]]);
  const dy = kf(t, [[4.067, 190], [4.2, 115, E.lin], [4.33, 60, E.lin], [4.47, 50, E.lin], [4.53, 27, E.lin], [4.67, 0, E.outQ]]);
  return ctx => { ctx.translate(800 + dx, 500 + dy); ctx.scale(s, s); ctx.translate(-800, -500); };
}
function drawHead(ctx, t, o = {}) {
  const tr = headTransform(t);
  const blur = kf(t, [[4.067, 22], [4.17, 13, E.lin], [4.3, 6, E.lin], [4.45, 0, E.lin]]);
  const look = (key, alpha = 1, b = blur) => Thermal.draw(ctx, 'head', key, HEAD_LOOKS[key], { transform: tr, alpha, blur: b });
  if (t < 4.2) look('purple');
  else if (t < 4.3) { look('purple'); look('red', seg(t, 4.2, 4.25)); }
  else if (t < 4.45) { look('red'); look('orange', seg(t, 4.3, 4.38)); }
  else if (t < 5.87) look('orange');
  else if (t < 6.17) { look('orange'); look('olive', seg(t, 5.87, 6.12) * 0.85); }
  else if (t < 6.37) {
    Thermal.burn(ctx, 'head', { key: 'olive', fn: HEAD_LOOKS.olive }, { key: 'ash', fn: HEAD_LOOKS.ash },
      lerp(0.4, 1.02, E.ioQ(seg(t, 6.17, 6.37))), { transform: tr, band: 0.08 });
  } else if (t < 6.47) { look('ash', 1, 1.5); look('gray', seg(t, 6.4, 6.47), 2); }
  else { look('gray', 1, 2); look('light', seg(t, 6.47, 6.5), 3); }
}

const headBG = t => kf(t, [
  [5.83, [35, 35, 35]], [5.9, [58, 42, 45], E.lin], [6.0, [76, 66, 70], E.lin], [6.07, [106, 96, 100], E.lin],
  [6.13, [138, 128, 132], E.lin], [6.2, [163, 154, 157], E.lin], [6.3, [196, 190, 192], E.lin], [6.37, [217, 213, 214], E.lin],
  [6.42, [236, 235, 235], E.lin], [6.5, [240, 240, 240], E.lin],
]);
const headText = t => kf(t, [
  [5.98, [242, 232, 226]], [6.07, [196, 188, 190], E.lin], [6.17, [130, 122, 126], E.lin], [6.3, [118, 108, 108], E.lin],
  [6.36, [80, 64, 60], E.lin], [6.42, [43, 29, 26], E.lin],
]);

function headOverlays(ctx, t) {
  const orange = { color: '#f5a535', glow: 22, glowColor: 'rgba(255,150,40,0.9)', taper: 0.3 };
  // orange swirl around the head + comet into the ear
  writeOn(ctx, t, ellipsePts(782, 420, 290, 70, 0.12, Math.PI * 1.05, Math.PI * 3.1, 90), 4.15, 4.22, 4.23, 4.3, { ...orange, width: 14, blur: 4 });
  glow(ctx, 553, 265, 46, [240, 170, 50], 0.8 * (1 - seg(t, 4.22, 4.27)) * (t > 4.15 ? 1 : 0));
  writeOn(ctx, t, ellipsePts(800, 215, 105, 75, 0, Math.PI * 1.05, Math.PI * 1.95, 40), 4.2, 4.26, 4.29, 4.36, { color: '#b81e2a', width: 22, blur: 4, taper: 0.3 });
  writeOn(ctx, t, [[590, 433], [730, 452], [867, 469]], 4.2, 4.24, 4.25, 4.31, { ...orange, width: 10, blur: 1.5 });
  if (t > 4.22 && t < 5.25) {
    const k = seg(t, 4.25, 4.6);
    const p = kf(t, [[4.25, [867, 469]], [5.25, [872, 478]]]);
    glow(ctx, p[0], p[1], lerp(26, 6, k), mix([255, 170, 60], [255, 255, 255], k), lerp(1, 0.9, k));
    ctx.fillStyle = rgb(mix([255, 200, 90], [255, 255, 255], k)); ctx.beginPath(); ctx.arc(p[0], p[1], lerp(9, 2.2, k), 0, TAU); ctx.fill();
  }
  if (t > 4.24 && t < 4.62) { // bokeh
    const a = 1 - seg(t, 4.4, 4.62);
    glow(ctx, 332, 150, 80, [245, 170, 60], 0.75 * a);
    glow(ctx, 477, 708, 48, [200, 30, 40], 0.7 * a);
  }
  const white = { color: '#f6f2ee', width: 3.4, glow: 6, glowColor: 'rgba(255,255,255,0.5)', taper: 0.2 };
  writeOn(ctx, t, ellipsePts(722, 375, 318, 116, -0.42, Math.PI * 0.75, Math.PI * 0.75 + TAU, 120), 4.57, 4.67, 4.65, 4.77, white);
  writeOn(ctx, t, ellipsePts(580, 165, 85, 40, -0.6, Math.PI * 0.95, Math.PI * 1.9, 40), 4.95, 5.0, 5.01, 5.06, white);
  writeOn(ctx, t, ellipsePts(925, 410, 55, 185, 0.42, -Math.PI * 0.4, Math.PI * 1.4, 80), 5.0, 5.07, 5.06, 5.15, white);
}

function sceneHead(ctx, t) {
  initShapes();
  if (t >= 6.5) { sceneWhip(ctx, t); return; }
  solid(ctx, headBG(t));
  if (t > 5.84 && t < 6.2) {
    const a = Math.sin(Math.PI * seg(t, 5.84, 6.2));
    glow(ctx, 60, 820, 520, [150, 30, 30], 0.55 * a);
  }
  if (t > 6.33) { // window light
    const a = seg(t, 6.33, 6.4);
    for (const [x, w] of [[420, 34], [1003, 46]]) {
      const g = ctx.createLinearGradient(x - w, 0, x + w, 0);
      g.addColorStop(0, 'rgba(255,230,232,0)'); g.addColorStop(0.5, `rgba(250,236,238,${0.9 * a})`); g.addColorStop(1, 'rgba(255,230,232,0)');
      ctx.fillStyle = g; ctx.fillRect(x - w, 0, w * 2, H);
      ctx.fillStyle = `rgba(220,150,160,${0.25 * a})`; ctx.fillRect(x + w * 0.6, 0, 6, H);
    }
  }
  drawHead(ctx, t);
  headOverlays(ctx, t);
  // copy
  const size = 38, x = 166, y = 443;
  const col = t < 5.98 ? [242, 232, 226] : headText(t);
  if (t < 5.53) {
    const blur = kf(t, [[4.067, 10], [4.15, 8], [4.2, 0]]);
    text(ctx, 'you dont.', x, y, { size, color: col, blur });
    if (t < 4.15) { ctx.save(); ctx.filter = 'blur(4px)'; ctx.fillStyle = rgb(col); ctx.fillRect(302, 416, 40, 30); ctx.restore(); }
    else if (t < 4.64) cursorBar(ctx, kf(t, [[4.15, 390], [4.6, 520, E.lin]]), 457, 40, col, 0.9, 3);
  } else {
    const words = [{ s: 'you', t: 0 }, { s: 'just', t: 5.667 }, { s: 'show', t: 5.933 }, { s: 'it.', t: 6.233 }];
    wordsLine(ctx, t, x, y, words, { size, weight: 700, color: col, fresh: mix(col, [120, 112, 112], 0.6), settle: 0.1 });
  }
}

function sceneWhip(ctx, t) {
  if (t < 6.567) {
    const k = E.inQ(seg(t, 6.5, 6.567));
    smearLayer(ctx, 'whip', g => {
      g.translate(0, 610 * k + 200 * k * k);
      solid(g, [240, 240, 240]);
      drawHead(g, 6.5);
      text(g, 'you just show it.', 166, 443, { size: 38, color: [43, 29, 26] });
    }, 0, 160 * k + 30, 10, 1, 2);
    const g = ctx.createLinearGradient(0, 0, W * 0.6, H * 0.8);
    g.addColorStop(0, `rgba(40,40,40,${0.95 * k})`); g.addColorStop(0.5, `rgba(80,80,80,${0.4 * k})`); g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    return;
  }
  if (t < 6.633) { // fire band
    solid(ctx, [33, 33, 33]);
    const g = ctx.createLinearGradient(0, 460, 0, H);
    g.addColorStop(0, 'rgba(60,10,10,0)'); g.addColorStop(0.35, '#5c0b0e'); g.addColorStop(0.58, '#c4181b');
    g.addColorStop(0.78, '#e8661a'); g.addColorStop(0.92, '#f1c35a'); g.addColorStop(1, '#f6e6b4');
    ctx.fillStyle = g; ctx.fillRect(0, 460, W, H - 460);
    Grain.draw(ctx, t, 0.12);
    return;
  }
  if (t < 6.667) {
    solid(ctx, [33, 33, 33]);
    glow(ctx, 640, 790, 170, [180, 20, 20], 0.8);
    pixelated(ctx, 'skate', 10, g => Sprites.draw(g, 'skateboard', 650, 780, 250, { rot: -0.35, variant: 'thermal' }));
    return;
  }
  if (t < 6.733) {
    solid(ctx, [58, 58, 58]);
    withLayer(ctx, 'ringTb', g => pixelated(g, 'ringT', 13, g2 => drawRing(g2, 6.667, { cx: 500, cy: 600, scale: 0.7, omega: -185, variant: 'thermal', persp: 0.55, sizeK: 1.6 })), { blur: 2.5 });
    return;
  }
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#a5a3a4'); g.addColorStop(1, '#8c8a8b');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  withLayer(ctx, 'ringGb', g3 => pixelated(g3, 'ringG', 9, g2 => drawRing(g2, 6.733, { cx: 626, cy: 480, scale: 1.0, omega: -165, variant: 'gray', persp: 0.45, sizeK: 1.2 })), { blur: 2 });
}

function pixelated(ctx, name, cell, fn) {
  const [lc, lg] = Layers.get(name, Math.ceil(W / cell), Math.ceil(H / cell));
  lg.setTransform(1 / cell, 0, 0, 1 / cell, 0, 0);
  fn(lg);
  ctx.save(); ctx.imageSmoothingEnabled = false; ctx.drawImage(lc, 0, 0, lc.width * cell, lc.height * cell); ctx.restore();
}

// ------------------------------- ring ----------------------------------
// Angles (deg, screen space, clockwise) measured at t = 7.13 on a 380x190 ellipse.
const RING = [
  { n: 'camera', a: -93, size: 140 },
  { n: 'cat', a: -71, size: 125 },
  { n: 'coin', a: -55, size: 128 },
  { n: 'controller', a: -33, size: 178, rot: 0.06 },
  { n: 'cap', a: -3, size: 192, rot: 0.15 },
  { n: 'heart', a: 48, size: 275 },
  { n: 'cash', a: 94, size: 290, rot: 0.42 },
  { n: 'plant', a: 146, size: 215 },
  { n: 'clapper', a: 171, size: 205, rot: -0.06 },
  { n: 'skateboard', a: 208, size: 285, rot: -0.42 },
  { n: 'vinyl', a: 231, size: 142 },
  { n: 'book', a: 247, size: 150, d3: true },
];
const DEG = Math.PI / 180;

function drawItem(ctx, it, x, y, size, o = {}) {
  if (it.n === 'book' && !o.variant) {
    drawBook3D(ctx, x, y, size * 0.82, { rx: 0.62, ry: -0.42, rz: (it.rot || 0) + 0.6 + (o.rot || 0), blur: o.blur, alpha: o.alpha });
    return;
  }
  Sprites.draw(ctx, it.n, x, y, size, { rot: (it.rot || 0) + (o.rot || 0), variant: o.variant, blur: o.blur, alpha: o.alpha, shadow: o.shadow, shadowBlur: o.shadowBlur });
}
// opts: cx, cy, scale, omega (deg), rx, ry, persp, variant, hits: {name: 0..1}, sizeK
function drawRing(ctx, t, o) {
  if (o.blur > 0.3) { // draw sharp into a layer, blur once
    const cv = ctx.canvas;
    const [lc, lg] = Layers.get(`ring_${cv.width}x${cv.height}`, cv.width, cv.height);
    lg.setTransform(ctx.getTransform());
    const list = drawRing(lg, t, { ...o, blur: 0 });
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.filter = `blur(${o.blur}px)`; ctx.drawImage(lc, 0, 0); ctx.restore();
    return list;
  }
  const rx = (o.rx ?? 380) * o.scale, ry = (o.ry ?? 205) * o.scale * (o.ryK ?? 1);
  const list = RING.map((it, i) => {
    // uniform: evenly spaced slots with the heart at `omega` (second ring)
    const a = (o.uniform ? o.omega + (i - 5) * 30 : it.a + o.omega) * DEG;
    const depth = Math.sin(a);
    let s = o.scale * (o.sizeK ?? 1) * (1 + (o.persp ?? 0.1) * depth);
    if (o.sizes) s *= o.sizes[it.n] / it.size;
    return { it, x: o.cx + Math.cos(a) * rx, y: o.cy + Math.sin(a) * ry, s, depth, a };
  }).sort((p, q) => p.depth - q.depth);
  for (const p of list) {
    const hit = o.hits ? o.hits[p.it.n] || 0 : 0;
    const v = o.inked && o.inked[p.it.n] ? 'black' : o.variant;
    drawItem(ctx, p.it, p.x, p.y, p.it.size * p.s, { variant: v, blur: o.blur, rot: o.itemRot ? o.itemRot(p) : 0 });
    if (hit > 0) hitGlow(ctx, p, hit);
  }
  return list;
}
function hitGlow(ctx, p, k) {
  const r = p.it.size * p.s * 0.55;
  ctx.save();
  ctx.globalCompositeOperation = 'source-over';
  glow(ctx, p.x, p.y, r * 1.4, [245, 160, 40], 0.85 * k);
  ctx.globalAlpha = 0.65 * k;
  ctx.globalCompositeOperation = 'screen';
  glow(ctx, p.x, p.y, r, [255, 190, 60], 1);
  ctx.restore();
  // spark rays
  const r2 = mulberry32(p.it.size);
  for (let i = 0; i < 8; i++) {
    const a = r2() * TAU, d0 = r * (1 + (1 - k) * 0.8), d1 = d0 + 18 + r2() * 30;
    stroke(ctx, [[p.x + Math.cos(a) * d0, p.y + Math.sin(a) * d0], [p.x + Math.cos(a) * d1, p.y + Math.sin(a) * d1]], 0, 1, { width: 4, color: rgb([240, 160, 40], k), taper: 0.5 });
  }
}

// Ink blob: keyed positions with a soft trail
function inkBlob(ctx, t, keys, o = {}) {
  if (t < keys[0][0] || t > keys[keys.length - 1][0]) return;
  const pos = tt => kf(clamp(tt, keys[0][0], keys[keys.length - 1][0]), keys.map(k => [k[0], [k[1], k[2], k[3] ?? (o.r || 20)], k[4] || E.ioQ]));
  const [x, y, r] = pos(t);
  const [px, py] = pos(t - 0.03);
  const vx = x - px, vy = y - py, sp = Math.hypot(vx, vy);
  // trail
  if (sp > 4) {
    const pts = [];
    for (let i = 10; i >= 0; i--) { const p = pos(t - i * 0.012); pts.push([p[0], p[1]]); }
    stroke(ctx, pts, 0, 1, { width: r * 1.6, color: 'rgba(30,30,30,0.35)', taper: 0.9, blur: 6 });
  }
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(Math.atan2(vy, vx));
  const stretch = 1 + Math.min(1.6, sp / 40);
  ctx.scale(stretch, 1 / Math.sqrt(stretch));
  ctx.filter = `blur(${o.blur ?? 2.5}px)`;
  ctx.fillStyle = '#141212';
  ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill();
  ctx.restore();
}

const ringOmega = t => kf(t, [[6.8, -141], [7.0, -40, E.outC], [7.13, 0, E.lin], [7.47, 38, E.outQ], [7.67, 44, E.lin], [8.0, 50, E.lin], [8.27, 70, E.inQ], [8.33, 80, E.lin], [8.47, 123, E.lin], [8.533, 150, E.lin]]);
// The ring opens in steep perspective, settles, then flattens edge-on and
// zooms onto the coin (which hands over to the conveyor shots later).
function ringCam(t) {
  return {
    cx: kf(t, [[6.8, 565], [7.0, 590, E.outC], [8.0, 578, E.lin], [8.2, 585, E.lin], [8.33, 560, E.lin], [8.47, 518, E.inQ], [8.533, 518, E.lin]]),
    cy: kf(t, [[6.8, 470], [7.0, 420, E.outC], [7.13, 420], [8.0, 440, E.lin], [8.2, 440, E.lin], [8.33, 440, E.lin], [8.47, 387, E.inQ], [8.533, 400, E.lin]]),
    scale: kf(t, [[6.8, 0.8], [7.0, 1.0, E.outC], [8.2, 1.0], [8.33, 1.02, E.lin], [8.47, 2.2, E.inQ], [8.533, 2.3, E.lin]]),
    sizeK: kf(t, [[6.8, 1.8], [7.0, 1.0, E.outC], [8.2, 1.0], [8.33, 1.0], [8.47, 0.85], [8.533, 0.95]]),
    ryK: kf(t, [[8.33, 1], [8.47, 0.24, E.inQ], [8.533, 0.22]]),
    persp: kf(t, [[6.8, 0.6], [7.0, 0.1, E.outC], [8.2, 0.1], [8.33, 0.2], [8.47, 0.45]]),
  };
}
const HITS = { cap: 7.4, heart: 7.6, cash: 7.8, plant: 8.07 };

function sceneRing(ctx, t) {
  paperBG(ctx);
  const cam = ringCam(t);
  const hits = {};
  for (const [n, th] of Object.entries(HITS)) if (t > th - 0.03 && t < th + 0.3) hits[n] = 1 - seg(t, th + 0.05, th + 0.3);
  const blur = t < 6.85 ? 2 : 0;
  drawRing(ctx, t, { ...cam, omega: ringOmega(t), hits, blur });
  // ink blob ballet
  inkBlob(ctx, t, [
    [6.8, 660, 300, 30], [6.9, 610, 360, 18],
    [7.0, 590, 400, 12], [7.13, 575, 340, 20], [7.2, 560, 330, 22], [7.27, 640, 300, 22], [7.33, 800, 160, 26],
    [7.4, 975, 330, 30], [7.47, 535, 87, 26], [7.53, 621, 300, 26], [7.6, 590, 600, 30], [7.67, 290, 87, 26],
    [7.73, 347, 87, 24], [7.8, 330, 600, 28], [7.87, 838, 116, 26], [7.93, 867, 130, 22], [8.0, 600, 260, 24],
    [8.07, 250, 470, 26], [8.13, 575, 420, 18], [8.3, 575, 420, 26], [8.4, 554, 385, 40], [8.533, 560, 330, 60],
  ], { r: 22 });
  // splat specks when hit
  for (const th of Object.values(HITS)) {
    if (t > th && t < th + 0.25) {
      const r = mulberry32(th * 100);
      for (let i = 0; i < 6; i++) { ctx.fillStyle = 'rgba(20,18,18,0.8)'; ctx.beginPath(); ctx.arc(200 + r() * 760, 150 + r() * 560, 2 + r() * 4, 0, TAU); ctx.fill(); }
    }
  }
}

// ------------------------------ action ---------------------------------
function cameraPose(t) {
  return {
    x: kf(t, [[8.533, 577], [8.567, 470, E.outQ], [8.6, 452], [8.87, 440, E.lin], [8.93, 415], [9.13, 410, E.lin], [9.2, 380], [9.27, 361, E.lin], [9.37, 250, E.inQ]]),
    y: kf(t, [[8.533, 445], [8.567, 420], [8.6, 440], [8.87, 440, E.lin], [8.93, 365], [9.13, 375, E.lin], [9.2, 420], [9.27, 409, E.lin], [9.37, 420, E.inQ]]),
    size: kf(t, [[8.533, 300], [8.6, 320], [8.87, 330, E.lin], [8.93, 700], [9.13, 720, E.lin], [9.2, 720], [9.37, 740]]),
    rx: kf(t, [[8.87, 0], [8.93, -0.85], [9.13, -0.9, E.lin], [9.2, -1.42], [9.37, -1.45]]),
    ry: kf(t, [[8.533, 0.15], [8.87, 0.25, E.lin], [8.93, 0.1], [9.2, 0.12]]),
    rz: kf(t, [[8.533, -0.08], [8.6, -0.25], [8.87, -0.27, E.lin], [8.93, -1.38], [9.13, -1.42, E.lin], [9.2, -0.2], [9.37, -0.22]]),
    blur: kf(t, [[8.533, 8], [8.6, 5], [8.87, 3, E.lin], [8.93, 0]]),
  };
}
function redStar(ctx, x, y, rx, ry, rot = 0, alpha = 1, noisy = false) {
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.fillStyle = '#e8321f';
  if (noisy) ctx.filter = 'blur(1px)';
  ctx.fill(starPath(x, y, rx, ry, noisy ? 0.02 : 0.1, rot));
  if (noisy) { ctx.clip(starPath(x, y, rx, ry, 0.02, rot)); ctx.globalCompositeOperation = 'multiply'; Grain.draw(ctx, 3.1, 0.9); }
  ctx.restore();
}
function typed(ctx, t, word, x, y, size, times, o = {}) {
  // times: [blockOnly, partial, full, thin]
  const col = o.color || C.cream;
  if (t < times[0]) return;
  let shown = '';
  if (t >= times[2]) shown = word; else if (t >= times[1]) shown = word.slice(0, Math.max(1, Math.ceil(word.length * seg(t, times[1], times[2]))));
  const blur = o.blur ?? 0;
  text(ctx, shown, x, y, { size, color: col, blur, tracking: -0.02 });
  const w = measure(ctx, shown, size, 700, -0.02);
  if (t < times[3]) {
    const bw = shown.length === word.length ? 26 : lerp(260, 70, seg(t, times[0], times[2]));
    ctx.save(); ctx.filter = `blur(${blur + 1}px)`; ctx.fillStyle = rgb(col); ctx.fillRect(x + w + 8, y - size * 0.72, bw, size * 0.78); ctx.restore();
  } else if (o.cursorX) cursorBar(ctx, o.cursorX, y + 4, size * 0.85, col, 1, 5);
}

function sceneAction(ctx, t) {
  nightBG(ctx);
  Grain.draw(ctx, t, 0.08);
  const p = cameraPose(t);
  // star that flies in, rides the camera's top corner, then streaks off
  if (t < 8.567) redStar(ctx, 867, 433, 330, 470, 0, 0.9, true);
  Sprites.draw3D(ctx, 'camera', p.x, p.y, p.size, { rx: p.rx, ry: p.ry, rz: p.rz, depth: 2.5, blur: p.blur });
  if (t >= 8.567) {
    const sx = kf(t, [[8.567, 560], [8.6, 500], [8.87, 494, E.lin], [8.93, 458], [9.13, 458, E.lin], [9.2, 690], [9.37, 600, E.lin]]);
    const sy = kf(t, [[8.567, 330], [8.6, 255], [8.87, 250, E.lin], [8.93, 193], [9.13, 195, E.lin], [9.2, 335], [9.37, 320, E.lin]]);
    const rx = kf(t, [[8.567, 120], [8.6, 95], [8.87, 90, E.lin], [8.93, 75], [9.13, 80, E.lin], [9.2, 330], [9.37, 360, E.lin]]);
    const ry = kf(t, [[8.567, 120], [8.6, 105], [8.87, 110, E.lin], [8.93, 250], [9.13, 260, E.lin], [9.2, 55], [9.37, 50, E.lin]]);
    const rot = kf(t, [[8.87, -0.15], [8.93, 0], [9.13, 0], [9.2, -0.25]]);
    redStar(ctx, sx, sy, rx, ry, rot, 0.95);
  }
  typed(ctx, t, 'action.', 775, 456, 66, [8.533, 8.6, 8.7, 8.733], { cursorX: 1038, blur: kf(t, [[8.533, 6], [8.75, 3], [8.78, 0]]) });
  // scribbles + streaks
  const wh = { color: '#ece6e0', width: 4, taper: 0.2 };
  const rd = { color: '#e3262c', width: 9, taper: 0.3 };
  writeOn(ctx, t, [[700, 300], [820, 230], [760, 330], [880, 270], [840, 360]], 8.545, 8.57, 8.58, 8.62, wh);
  writeOn(ctx, t, [[720, 500], [820, 560], [740, 640], [900, 700]], 8.545, 8.57, 8.58, 8.62, wh);
  writeOn(ctx, t, [[960, 240], [1060, 80]], 8.55, 8.57, 8.58, 8.64, rd);
  writeOn(ctx, t, [[1000, 640], [1100, 720]], 8.55, 8.57, 8.58, 8.64, rd);
  writeOn(ctx, t, [[1080, 210], [1150, 120], [1040, 170]], 8.57, 8.6, 8.61, 8.68, wh);
  writeOn(ctx, t, [[960, 610], [1060, 760], [930, 700]], 8.57, 8.6, 8.61, 8.68, wh);
  writeOn(ctx, t, [[1090, 640], [1150, 690]], 8.58, 8.6, 8.61, 8.66, rd);
  writeOn(ctx, t, [[1010, 300], [1060, 230]], 8.62, 8.65, 8.66, 8.7, wh);
  const r = mulberry32(9);
  if (t > 8.6 && t < 8.85) for (let i = 0; i < 5; i++) { ctx.fillStyle = '#d42328'; ctx.beginPath(); ctx.arc(700 + r() * 440, 60 + r() * 760, 5 + r() * 5, 0, TAU); ctx.fill(); }
  if (t > 8.7) { ctx.fillStyle = 'rgba(240,240,240,0.9)'; ctx.beginPath(); ctx.arc(lerp(838, 820, seg(t, 8.7, 9.3)), lerp(188, 170, seg(t, 8.7, 9.3)), 3, 0, TAU); ctx.fill(); }
}
