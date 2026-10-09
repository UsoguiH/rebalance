'use strict';
// Scenes 9.37s – 17.75s: icon conveyor, "intention." / "curiosity.",
// the ring that gets inked, the thermal hand, L-O-V-E and the outro.

// ----------------------------- conveyor --------------------------------
const BELT_SIZE = { heart: 330, cap: 313, controller: 280, coin: 230, cat: 220, camera: 330, book: 300, vinyl: 300, skateboard: 330, clapper: 289, plant: 250, cash: 330 };
const RING2_SIZE = { vinyl: 145, camera: 165, cat: 125, coin: 140, controller: 150, cap: 140, heart: 175, cash: 185, plant: 125, clapper: 125, skateboard: 200, book: 125 };
function drawConveyor(ctx, t, heartDeg, o = {}) {
  const rx = 570, cx = 578, cy = 455, step = 30;
  const list = RING.map((it, i) => {
    const a = (heartDeg + (i - 5) * step) * DEG;
    const depth = Math.sin(a);
    return { it, a, depth, x: cx + Math.cos(a) * rx, y: cy + depth * 18 };
  }).filter(p => p.depth > -0.1).sort((p, q) => p.depth - q.depth);
  for (const p of list) {
    const s = 0.5 + 0.5 * p.depth;
    drawItem(ctx, p.it, p.x, p.y, BELT_SIZE[p.it.n] * s, { rot: -0.1 * Math.cos(p.a), blur: o.blur, alpha: clamp(p.depth * 4 + 0.4) });
  }
}
function speedLines(ctx, t, seed, n = 6) {
  for (let i = 0; i < n; i++) {
    const r = mulberry32(seed + i * 17 + Math.floor(t * 10));
    const y = r() < 0.5 ? 40 + r() * 200 : 640 + r() * 200;
    const x = r() * W, L = 80 + r() * 300;
    stroke(ctx, [[x, y], [x + L, y - 6 + r() * 12]], 0, 1, { width: 3 + r() * 3, color: `rgba(222,48,44,${0.5 + r() * 0.4})`, taper: 0.5 });
    if (r() < 0.6) { ctx.fillStyle = '#d42328'; ctx.beginPath(); ctx.arc(r() * W, r() * H, 2 + r() * 3, 0, TAU); ctx.fill(); }
  }
}
// heart angle on the belt, measured from the reference frame by frame
const conveyor1 = t => kf(t, [[9.35, -12], [9.4, -7, E.lin], [9.47, 51, E.outC], [9.53, 57, E.lin], [9.6, 66.6, E.lin], [9.67, 72, E.lin], [9.8, 81, E.lin], [9.87, 88.7, E.lin], [9.93, 109, E.inQ], [10.0, 120, E.lin], [10.07, 143, E.inQ], [10.1, 160, E.lin]]);
const conveyor2 = t => kf(t, [[10.8, 128], [10.87, 168, E.outC], [11.0, 177, E.lin], [11.07, 180, E.lin], [11.13, 195, E.inQ], [11.2, 256, E.lin], [11.25, 290, E.lin]]);

function sceneConveyor(ctx, t, which) {
  paperBG(ctx);
  const ang = which === 1 ? conveyor1(t) : conveyor2(t);
  const fast = which === 1 ? t > 10.06 : t > 11.17;
  if (fast) smearLayer(ctx, 'conv', g => drawConveyor(g, t, ang), -40, 0, 6, 1, 5);
  else drawConveyor(ctx, t, ang);
  speedLines(ctx, t, which * 100);
}

// --------------------------- intention ---------------------------------
function ribbon(ctx, pts, col = '#e2261f') { ctx.fillStyle = col; ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.closePath(); ctx.fill(); }
function sceneIntention(ctx, t) {
  nightBG(ctx);
  Grain.draw(ctx, t, 0.08);
  const bx = kf(t, [[10.1, 420], [10.2, 350, E.outC], [10.8, 318, E.lin]]);
  const by = kf(t, [[10.1, 440], [10.2, 448], [10.8, 452, E.lin]]);
  // red ribbons behind the book
  const k1 = E.outC(seg(t, 10.11, 10.18));
  ribbon(ctx, [[bx - 80, by + 60], [bx - 40, by + 100], [lerp(bx - 40, 0, k1), lerp(by + 100, 760, k1)], [lerp(bx - 80, 0, k1), lerp(by + 60, 640, k1)]]);
  const k2 = E.outC(seg(t, 10.2, 10.3));
  if (k2 > 0) ribbon(ctx, [[bx - 110, by - 40], [bx - 30, by - 70], [lerp(bx - 30, bx + 30, k2), lerp(by - 70, by - 250, k2)], [lerp(bx - 110, bx - 60, k2), lerp(by - 40, by - 230, k2)]]);
  const k3 = E.outC(seg(t, 10.55, 10.66));
  if (k3 > 0) ribbon(ctx, [[bx + 20, by - 60], [bx + 120, by - 20], [lerp(bx + 120, 1160, k3), lerp(by - 20, 60, k3)], [lerp(bx + 20, 1160, k3), lerp(by - 60, -120, k3)]]);
  if (t < 10.25) glow(ctx, 200, 60, 420, [120, 24, 26], 0.5 * (1 - seg(t, 10.17, 10.25)));
  drawBook3D(ctx, bx, by, 340, { rx: 1.0, ry: -0.55, rz: kf(t, [[10.1, 0.62], [10.8, 0.55, E.lin]]), depth: 5, blur: lerp(7, 0, seg(t, 10.1, 10.2)) });
  typed(ctx, t, 'intention.', 670, 456, 65, [10.1, 10.13, 10.2, 10.3], { cursorX: 1058, blur: lerp(5, 0, seg(t, 10.1, 10.2)) });
  const wh = { color: '#ece6e0', width: 4, taper: 0.2 };
  writeOn(ctx, t, catmull([[560, 280], [600, 200], [640, 260], [700, 210], [760, 250], [920, 150]], 6), 10.1, 10.13, 10.14, 10.2, wh);
  writeOn(ctx, t, catmull([[600, 560], [620, 640], [700, 600], [900, 660], [1060, 700], [980, 640]], 6), 10.11, 10.14, 10.15, 10.22, wh);
  writeOn(ctx, t, catmull([[700, 810], [720, 830], [800, 850], [930, 900]], 5), 10.17, 10.21, 10.22, 10.3, wh);
  if (t > 10.13 && t < 10.3) { ctx.fillStyle = '#d42328'; for (const [x, y] of [[700, 790], [1100, 640], [1140, 520]]) { ctx.beginPath(); ctx.arc(x, y, 5, 0, TAU); ctx.fill(); } }
  ctx.fillStyle = 'rgba(240,240,240,0.8)'; ctx.beginPath(); ctx.arc(lerp(625, 600, seg(t, 10.2, 10.8)), 820, 2.5, 0, TAU); ctx.fill();
}

// --------------------------- curiosity ---------------------------------
function sceneCuriosity(ctx, t) {
  nightBG(ctx);
  Grain.draw(ctx, t, 0.08);
  if (t < 11.32) { // red dotted ring flash
    ctx.save();
    ctx.strokeStyle = 'rgba(200,30,40,0.85)';
    ctx.lineWidth = 38; ctx.setLineDash([3, 5]);
    ctx.beginPath(); ctx.arc(578, 433, 545, 0, TAU); ctx.stroke();
    ctx.restore();
  }
  const vx = kf(t, [[11.27, 578], [11.33, 383, E.outC], [11.5, 350, E.lin], [12.05, 300, E.lin]]);
  const vs = kf(t, [[11.27, 300], [11.33, 304], [12.05, 320, E.lin]]);
  Sprites.draw3D(ctx, 'vinyl', vx, 433, vs, { rz: (t - 11.27) * 0.3, ry: kf(t, [[11.27, 0.3], [11.36, 0.05]]), depth: 2, blur: t < 11.3 ? 3 : 0 });
  typed(ctx, t, 'curiosity.', 673, 456, 65, [11.27, 11.3, 11.33, 11.47], { cursorX: 1062 });
  const pop = (t0) => E.outBack(seg(t, t0, t0 + 0.09), 2.2);
  if (t > 11.37) noteShape(ctx, 'quarter', kf(t, [[11.37, 790], [12.05, 850, E.lin]]), kf(t, [[11.37, 690], [12.05, 700, E.lin]]), 2.9 * pop(11.37), 0.18);
  if (t > 11.63) noteShape(ctx, 'beamed', kf(t, [[11.63, 530], [12.05, 555, E.lin]]), kf(t, [[11.63, 295], [12.05, 285, E.lin]]), 2.8 * pop(11.63), -0.12);
  if (t > 11.83) noteShape(ctx, 'eighth', kf(t, [[11.83, 515], [12.05, 440, E.lin]]), kf(t, [[11.83, 690], [12.05, 695, E.lin]]), 2.3 * pop(11.83), -0.35);
  const wh = { color: '#f2ede8', width: 3, taper: 0.3 };
  writeOn(ctx, t, [[650, 262], [838, 175]], 11.3, 11.33, 11.34, 11.4, wh);
  writeOn(ctx, t, [[708, 535], [1011, 607]], 11.3, 11.33, 11.34, 11.4, wh);
  writeOn(ctx, t, ellipsePts(540, 150, 20, 26, 0.3, -1, 1.6, 20), 11.32, 11.35, 11.36, 11.42, wh);
  writeOn(ctx, t, ellipsePts(780, 140, 16, 20, 0.6, -1, 1.4, 20), 11.38, 11.42, 11.45, 11.5, wh);
  writeOn(ctx, t, ellipsePts(780, 270, 26, 18, 0.2, -0.4, 1.8, 20), 11.7, 11.74, 11.76, 11.82, wh);
  if (t > 11.3 && t < 11.45) { ctx.fillStyle = '#d42328'; for (const [x, y] of [[990, 210], [1060, 433], [840, 770]]) { ctx.beginPath(); ctx.ellipse(x, y, 9, 5, 0.4, 0, TAU); ctx.fill(); } }
  for (const [x, y, t0] of [[1236, 140, 11.5], [822, 200, 11.4], [860, 820, 11.9]]) if (t > t0) { ctx.fillStyle = '#efefef'; ctx.beginPath(); ctx.arc(x - 200, y, 3, 0, TAU); ctx.fill(); }
}

// -------------------------- ring 2 + scatter ---------------------------
const SCATTER = {
  clapper: [130, 390, 150], plant: [190, 352, 82], vinyl: [480, 130, 105], camera: [752, 268, 96], book: [565, 335, 90],
  cap: [690, 405, 110], skateboard: [355, 380, 112], heart: [425, 497, 104], coin: [880, 485, 92], controller: [1010, 655, 160],
  cash: [230, 758, 135], cat: [885, 495, 112],
};
// where everything has gathered by the cut to black (14.0s)
const CLUSTER = {
  plant: [482, 132], cap: [482, 253], clapper: [602, 253], vinyl: [734, 349], skateboard: [638, 433], controller: [506, 518],
  camera: [698, 506], book: [674, 566], cat: [698, 650], heart: [560, 400], cash: [520, 440], coin: [620, 360],
};
const INKED_AT = { skateboard: 12.8, heart: 12.86, coin: 13.25, cash: 13.45, cat: 13.25 };
// heart slot angle on the evenly spaced second ring
const ring2Omega = t => kf(t, [[12.1, -150], [12.2, 40, E.outC], [12.33, 70, E.outQ], [12.47, 83, E.lin], [12.6, 92, E.lin], [12.67, 100, E.lin], [12.73, 120, E.inQ]]);

function sceneRing2(ctx, t) {
  if (t < 12.1) { // negative glitch frame
    nightBG(ctx, [20, 20, 20]);
    for (const [n, x, y, s, r] of [['skateboard', 250, 440, 300, -0.3], ['cash', 330, 440, 350, 0.45], ['heart', 600, 450, 340, 0], ['cap', 880, 420, 300, 0.1]])
      Sprites.draw(ctx, n, x, y, s, { rot: r, variant: 'white' });
    return;
  }
  paperBG(ctx);
  const sc = kf(t, [[12.1, 1.15], [12.2, 1.03, E.outC], [12.33, 1.0]]);
  const blur = kf(t, [[12.1, 7], [12.2, 2], [12.3, 0]]);
  if (t < 12.733) {
    drawRing(ctx, t, { cx: 578, cy: 445, rx: 300, ry: 290, scale: sc, omega: ring2Omega(t), uniform: true, sizes: RING2_SIZE, persp: 0.06, blur });
    if (t > 12.3) inkBlob(ctx, t, [[12.3, 575, 433, 16], [12.5, 580, 430, 22], [12.73, 575, 433, 24]]);
    return;
  }
  // break-up: fly from ring slots to scattered positions
  const k = E.outC(seg(t, 12.733, 12.93));
  const om = ring2Omega(12.733) * DEG;
  const conv = E.inC(seg(t, 13.8, 14.0));
  const items = RING.map((it, i) => {
    const a = om + (i - 5) * 30 * DEG;
    const from = [578 + Math.cos(a) * 300, 445 + Math.sin(a) * 290, RING2_SIZE[it.n]];
    const to = SCATTER[it.n];
    const drift = 1 + 0.04 * seg(t, 12.93, 13.8);
    let x = lerp(from[0], 578 + (to[0] - 578) * drift, k), y = lerp(from[1], 433 + (to[1] - 433) * drift, k), s = lerp(from[2], to[2], k);
    if (conv > 0) { const c = CLUSTER[it.n]; x = lerp(x, c[0], conv); y = lerp(y, c[1], conv); s *= lerp(1, 0.85, conv); }
    return { it, x, y, s, from };
  });
  // motion smears during the break
  if (k < 1) withLayer(ctx, 'smears', g => { for (const p of items) stroke(g, [p.from.slice(0, 2), [p.x, p.y]], 0.3, 1, { width: p.s * 0.25, color: 'rgba(40,40,40,0.25)', taper: 0.6 }); }, { blur: 8 });
  for (const p of items) {
    if (p.it.n === 'cat' && t < 13.62) continue;
    if (p.it.n === 'coin' && t > 13.62) continue;
    const ik = INKED_AT[p.it.n];
    const inked = ik !== undefined && t > ik;
    if (p.it.n === 'coin' && inked) { // swallowed by a big ink drop
      ctx.save(); ctx.filter = 'blur(4px)'; ctx.fillStyle = '#131111'; ctx.beginPath(); ctx.arc(p.x, p.y + 5, lerp(30, 62, seg(t, 13.25, 13.35)), 0, TAU); ctx.fill(); ctx.restore();
      continue;
    }
    if (p.it.n === 'cat') {
      ctx.save(); ctx.filter = 'blur(2px)'; ctx.fillStyle = '#131111'; ctx.beginPath(); ctx.arc(p.x - 6, p.y + 8, 52 * (1 - conv * 0.4), 0, TAU); ctx.fill(); ctx.restore();
    }
    drawItem(ctx, p.it, p.x, p.y, p.s, { variant: inked ? 'black' : undefined, alpha: t > 13.97 ? 0 : 1 });
  }
  // ink action
  const ink = (keys, r) => inkBlob(ctx, t, keys, { r });
  ink([[12.73, 575, 433, 24], [12.8, 360, 380, 26], [12.86, 425, 497, 22], [12.9, 470, 600, 10]], 24);
  ink([[13.03, 760, 120, 20], [13.1, 881, 130, 26], [13.2, 809, 300, 24], [13.25, 880, 485, 30]], 26);
  ink([[13.38, 250, 600, 18], [13.45, 230, 758, 28], [13.5, 300, 700, 12]], 22);
  ink([[13.45, 400, 120, 14], [13.55, 290, 140, 18], [13.65, 290, 145, 14]], 16);
  const tendril = (pts, t0) => writeOn(ctx, t, catmull(pts, 6), t0, t0 + 0.07, t0 + 0.12, t0 + 0.25, { width: 6, color: '#161414', taper: 0.4 });
  tendril([[60, 470], [110, 430], [90, 520], [150, 560], [120, 640]], 12.86);
  tendril([[260, 280], [330, 250], [380, 320]], 12.95);
  tendril([[300, 330], [350, 260], [400, 300], [430, 250]], 13.0);
  tendril([[1040, 300], [1080, 360], [1050, 420], [1100, 470]], 13.2);
  tendril([[1060, 760], [1100, 800], [1140, 770]], 13.3);
  tendril([[60, 600], [120, 680], [90, 760], [160, 800]], 13.45);
  tendril([[1120, 560], [1150, 600], [1130, 640]], 13.55);
  // specks
  const nSpecks = Math.floor(lerp(0, 34, seg(t, 12.85, 13.6)));
  const r = mulberry32(4242);
  ctx.fillStyle = 'rgba(20,18,18,0.85)';
  for (let i = 0; i < nSpecks; i++) {
    const x = r() * W, y = r() * H, w = 3 + r() * 5, h = 5 + r() * 10, a = r() * TAU;
    if (conv > 0 && r() < conv) continue;
    ctx.save(); ctx.translate(x, y); ctx.rotate(a); ctx.fillRect(-w / 2, -h / 2, w, h); ctx.restore();
  }
  // "through" with a black typing block
  if (t > 13.8) {
    const tk = seg(t, 13.82, 13.93);
    const word = 'through';
    const shown = t < 13.84 ? '' : word.slice(word.length - Math.max(1, Math.ceil(word.length * tk)));
    const fullW = measure(ctx, word, 38, 700, -0.02);
    text(ctx, shown, 215 + fullW - measure(ctx, shown, 38, 700, -0.02), 446, { size: 38, color: C.ink, tracking: -0.02 });
    if (t < 13.93) { ctx.fillStyle = '#1b1616'; ctx.fillRect(lerp(433, 390, tk), 410, lerp(290, 120, tk), 46); }
  }
}

function sceneThroughCut(ctx, t) { // 13.967 – 14.033
  nightBG(ctx);
  glow(ctx, 545, 420, 160, [255, 255, 255], 0.85);
  const k = seg(t, 13.967, 14.033);
  for (const it of RING) {
    const c = CLUSTER[it.n];
    const x = lerp(c[0], 530, k * 0.5), y = lerp(c[1], 385, k * 0.5);
    const black = INKED_AT[it.n] !== undefined;
    drawItem(ctx, it, x, y, SCATTER[it.n][2] * 1.25 * (1 - k * 0.4), { variant: black ? 'black' : undefined });
  }
  text(ctx, 'through', 208, 446, { size: 38, color: C.cream, tracking: -0.02 });
}

// -------------------------------- hand ---------------------------------
const HAND_LOOKS = {
  purple: handHeat(HEAT.purple),
  red: handHeat(HEAT.red),
  warm: handHeat(HEAT.hand),
  pale: (x, y, d, r) => mix(handHeat(HEAT.hand)(x, y, d, r), [236, 222, 206], 0.55),
};
const handBG = t => kf(t, [[15.73, [35, 35, 35]], [15.8, [56, 42, 44], E.lin], [15.9, [64, 50, 52], E.lin], [16.0, [74, 63, 66], E.lin], [16.07, [90, 82, 84], E.lin], [16.12, [104, 98, 100], E.lin]]);
function handTr(t, extra) {
  const dx = kf(t, [[14.03, -40], [14.2, -20, E.outQ], [14.4, 0, E.outQ]]);
  const dy = kf(t, [[14.03, 260], [14.2, 90, E.outQ], [14.4, 0, E.outQ]]);
  const s = kf(t, [[14.03, 1.08], [14.4, 1.0, E.outQ]]);
  const rot = kf(t, [[14.03, -0.35], [14.2, -0.15, E.outQ], [14.4, 0, E.outQ]]) + 0.012 * Math.sin(t * 2.2);
  return ctx => {
    ctx.translate(580 + dx, 867 + dy); ctx.rotate(rot); ctx.scale(s, s); ctx.translate(-580, -867);
    if (extra) extra(ctx);
  };
}
function drawHandLayer(ctx, t) {
  const blur = kf(t, [[14.03, 14], [14.2, 7, E.lin], [14.35, 2, E.lin], [14.42, 0, E.lin]]);
  const pinch = seg(t, 15.84, 15.9);
  const handAlpha = 1 - pinch;
  const look = (shape, key, alpha, tr, b = blur) => Thermal.draw(ctx, shape, key + shape, HAND_LOOKS[key], { transform: tr, alpha, blur: b });
  if (handAlpha > 0) {
    const tr = handTr(t, c => { c.translate(600, 600); c.rotate(-0.12 * pinch); c.translate(-600, -600); });
    if (t < 14.12) { look('hand', 'red', handAlpha, tr); look('hand', 'purple', handAlpha * 0.45, tr); }
    else if (t < 14.3) look('hand', 'red', handAlpha, tr);
    else if (t < 14.44) { look('hand', 'red', handAlpha, tr); look('hand', 'warm', handAlpha * seg(t, 14.3, 14.42), tr); }
    else look('hand', 'warm', handAlpha, tr, pinch * 3);
  }
  if (pinch > 0) {
    // after the pinch the hand flicks off to the left (16.09 – 16.12)
    const flick = seg(t, 16.07, 16.1);
    const tr = handTr(t, c => { c.translate(580 - 160 * flick, 867 + 40 * flick); c.rotate(-1.15 * flick); c.translate(-580, -867); });
    look('pinch', 'warm', pinch * (1 - flick), tr, (1 - pinch) * 3);
    if (flick > 0) look('pinch', 'pale', 1, tr, 0);
  }
}
function sceneHand(ctx, t) {
  initShapes();
  solid(ctx, handBG(t));
  if (t > 15.75) glow(ctx, 80, 300, 600, [120, 40, 40], 0.35 * seg(t, 15.75, 15.9));
  Grain.draw(ctx, t, 0.08);
  if (t > 16.07) {
    smearLayer(ctx, 'handwhip', g => drawHandLayer(g, t), -36, 0, 5, 1, 0.6);
    ctx.fillStyle = 'rgba(246,244,242,0.75)';
    for (let i = 0; i < 4; i++) { const r = mulberry32(i + 31); ctx.fillRect(r() * 200, 250 + r() * 50, 260 + r() * 300, 3 + r() * 3); }
  } else drawHandLayer(ctx, t);
  // orbit rings while the hand rises
  const white = { color: '#f4f0ec', width: 3.2, glow: 8, glowColor: 'rgba(255,255,255,0.6)', taper: 0.25 };
  writeOn(ctx, t, ellipsePts(520, 640, 140, 300, 0.25, -1.4, 4.2, 80), 14.04, 14.14, 14.13, 14.26, white);
  writeOn(ctx, t, ellipsePts(570, 600, 110, 250, -0.35, 2.2, 7.6, 80), 14.08, 14.18, 14.18, 14.32, white);
  writeOn(ctx, t, ellipsePts(600, 260, 90, 30, -0.3, 3.4, 5.6, 40), 14.2, 14.26, 14.27, 14.34, white);
  // specks above the fingers
  if (t > 14.25) {
    const a = seg(t, 14.25, 14.4);
    const dy = -(t - 14.25) * 8;
    ctx.fillStyle = rgb([250, 248, 244], a);
    for (const [x, y, r] of [[410, 290, 0.35], [520, 325, 0.5], [627, 236, -0.4]]) {
      ctx.save(); ctx.translate(x + (t > 15.85 ? (t - 15.85) * 200 : 0), y + dy); ctx.rotate(r); ctx.beginPath(); ctx.ellipse(0, 0, 2.6, 7, 0, 0, TAU); ctx.fill(); ctx.restore();
    }
  }
  if (t > 15.86 && t < 16.09) {
    const sp = { color: '#fbf8f4', width: 4, taper: 0.3 };
    writeOn(ctx, t, [[560, 330], [590, 318]], 15.86, 15.9, 15.92, 15.98, sp);
    writeOn(ctx, t, [[630, 300], [664, 286], [700, 290]], 15.92, 15.97, 16.0, 16.06, sp);
    writeOn(ctx, t, [[540, 285], [600, 276], [660, 270]], 16.02, 16.05, 16.06, 16.09, { ...sp, width: 6, blur: 2 });
  }
  // copy
  const tcol = mix(C.cream, [200, 190, 192], seg(t, 15.8, 16.07));
  const tblur = kf(t, [[14.03, 4], [14.1, 6], [14.3, 0, E.lin]]);
  text(ctx, t < 14.13 ? 'through' : 'through ones', 168, 448, { size: 38, color: tcol, blur: tblur, tracking: -0.02 });
  if (t > 14.46) {
    const own = t < 14.53 ? '' : t < 14.73 ? 'own' : t < 15.96 ? 'own ability' : 'own ability to';
    const ownCol = t > 15.82 && t < 15.88 ? mix(tcol, [90, 210, 230], 0.6) : tcol;
    text(ctx, own, 759, 448, { size: 38, color: ownCol, tracking: -0.02 });
    if (t < 14.6) { ctx.fillStyle = rgb(tcol); ctx.fillRect(own ? 830 : 708, 420, own ? 70 : 130, 32); }
    else if (t < 14.73) cursorBar(ctx, 910, 455, 36, tcol, 1, 4);
  }
}

// -------------------------------- LOVE ---------------------------------
function spinIn(t, t0, dur = 0.06) { const k = seg(t, t0, t0 + dur); return { k, ry: lerp(1.5, 0, E.outC(k)) }; }
function sceneLove(ctx, t) {
  const phase = t < 16.433 ? 'heart' : t < 16.8 ? 'camera' : t < 17.033 ? 'book' : 'vinyl';
  if (phase === 'heart') paperBG(ctx);
  else if (phase === 'book') {
    solid(ctx, [214, 42, 38]);
    const v = seg(t, 16.93, 17.0);
    if (v > 0) {
      const R = lerp(260, 760, v), gd = ctx.createRadialGradient(578, 440, 0, 578, 440, R);
      gd.addColorStop(0, `rgba(30,22,22,${0.97 * v})`); gd.addColorStop(0.55, `rgba(32,22,22,${0.9 * v})`); gd.addColorStop(1, 'rgba(40,20,20,0)');
      ctx.fillStyle = gd; ctx.fillRect(0, 0, W, H);
      const g = ctx.createRadialGradient(578, 433, 300, 578, 433, 820); g.addColorStop(0, 'rgba(40,10,10,0)'); g.addColorStop(1, `rgba(60,10,12,${v * 0.8})`); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    }
    Grain.draw(ctx, t, 0.12);
  } else if (t >= 17.42) { paperBG(ctx); vignette(ctx, 0.35, 0.3); }
  else { nightBG(ctx); Grain.draw(ctx, t, 0.08); }

  const letterCol = phase === 'heart' || t >= 17.42 ? [58, 34, 30] : phase === 'book' ? [100, 214, 232] : [240, 234, 230];
  const L = [['L', 107, 16.15], ['O', 420, 16.5], ['V', 737, 16.85], ['E', 1055, 17.12]];
  for (const [ch, x, t0] of L) {
    if (t < t0) continue;
    const cyan = (ch === 'O' && t > 16.7 && t < 17.033) || phase === 'book';
    text(ctx, ch, x, 453, { size: 56, color: cyan ? [100, 214, 232] : letterCol, align: 'center', tracking: 0 });
  }

  if (phase === 'heart') {
    if (t > 16.36) glow(ctx, 578, 440, 250, [20, 20, 20], 0.95 * seg(t, 16.36, 16.42));
    const { ry } = spinIn(t, 16.12);
    const s = kf(t, [[16.12, 120], [16.18, 215, E.outC], [16.43, 262, E.lin]]);
    Sprites.draw3D(ctx, 'heart', kf(t, [[16.12, 600], [16.2, 575]]), 433, s, { ry, rz: kf(t, [[16.12, 0.6], [16.18, 0], [16.43, 0.06]]), depth: 3 });
  } else if (phase === 'camera') {
    const gr = kf(t, [[16.45, 60], [16.6, 110], [16.73, 300, E.inQ], [16.8, 320]]);
    glow(ctx, 590, 440, gr, [226, 24, 24], kf(t, [[16.45, 0.8], [16.6, 0.6], [16.73, 0.95]]));
    const { ry } = spinIn(t, 16.45);
    const s = kf(t, [[16.45, 120], [16.52, 217, E.outC], [16.8, 272, E.lin]]);
    Sprites.draw3D(ctx, 'camera', 588, 440, s, { ry: ry - 0.25, rz: kf(t, [[16.45, -0.4], [16.52, 0.07]]), depth: 4 });
  } else if (phase === 'book') {
    if (t > 16.9 && t < 16.94) glow(ctx, 578, 440, 300, [30, 10, 10], 0.85);
    const { ry } = spinIn(t, 16.8);
    const s = kf(t, [[16.8, 110], [16.86, 270, E.outC], [17.033, 330, E.lin]]);
    drawBook3D(ctx, kf(t, [[16.8, 600], [16.86, 578], [17.033, 580]]), 440, s, { rx: 0.95, ry: -0.45 - ry, rz: 0.78, depth: 5 });
  } else {
    if (t > 17.28 && t < 17.42) glow(ctx, 578, 433, kf(t, [[17.28, 150], [17.4, 270, E.outQ]]), [236, 236, 236], kf(t, [[17.28, 0.6], [17.4, 1]]));
    const { ry } = spinIn(t, 17.033, 0.08);
    const s = kf(t, [[17.033, 100], [17.12, 210, E.outC], [17.4, 280, E.lin], [17.45, 340, E.lin]]);
    Sprites.draw3D(ctx, 'vinyl', 578, 433, s, { ry, rz: (t - 17.033) * 0.4, depth: 2 });
  }
}

// ------------------------------- outro ---------------------------------
const CURSIVE_LOVE = catmull([
  [200, 220], [260, 140], [300, 160], [250, 330], [200, 560], [180, 640], [230, 600], [300, 560],
  [360, 520], [420, 500], [440, 540], [400, 600], [350, 590], [380, 520], [450, 520], [520, 470],
  [560, 420], [580, 470], [600, 560], [660, 450], [720, 380], [720, 440], [760, 520], [840, 500],
  [880, 460], [860, 420], [800, 460], [820, 540], [900, 560], [1000, 500],
], 8);
function sceneOutro(ctx, t) {
  paperBG(ctx);
  if (t < 17.5) { // camera rushing through the giant handwriting
    withLayer(ctx, 'outroA', g => {
      g.translate(560, 300); g.scale(3.4, 3.4); g.rotate(0.1); g.translate(-600, -470);
      stroke(g, CURSIVE_LOVE, 0.38, 0.72, { width: 9, color: 'rgba(20,18,18,0.85)', taper: 0.05 });
      stroke(g, CURSIVE_LOVE, 0.0, 0.3, { width: 5, color: 'rgba(60,58,58,0.45)', taper: 0.05 });
    }, { blur: 9 });
    return;
  }
  if (t < 17.567) {
    withLayer(ctx, 'outroB', g => {
      g.translate(578, 433); g.scale(1.7, 1.7); g.translate(-610, -440);
      stroke(g, CURSIVE_LOVE, 0, 1, { width: 9, color: 'rgba(25,22,22,0.85)', taper: 0.05 });
      g.translate(-60, 40);
      stroke(g, CURSIVE_LOVE, 0.1, 0.9, { width: 14, color: 'rgba(60,58,58,0.3)', taper: 0.05 });
      g.fillStyle = 'rgba(20,18,18,0.9)'; g.beginPath(); g.arc(640, 560, 16, 0, TAU); g.fill();
    }, { blur: 3.5 });
    return;
  }
  // the letters burst into tiny ink fragments that drift and fade
  const k = seg(t, 17.567, 17.75);
  const r = mulberry32(17);
  withLayer(ctx, 'outroC', g => {
    for (let i = 0; i < 14; i++) {
      const x = 80 + r() * 1000, y = 60 + r() * 740, a = r() * TAU, red = r() < 0.35, sc = 10 + r() * 14;
      const pts = [];
      for (let j = 0; j < 4; j++) pts.push([x + Math.cos(a + j * 1.7) * sc * (0.4 + j * 0.25), y + Math.sin(a + j * 1.7) * sc * (0.4 + j * 0.25) + (y - 433) * k * 0.08]);
      const P = catmull(pts, 6);
      if (red) stroke(g, P, 0, 1, { width: 1.6, color: `rgba(224,96,96,${0.75 * (1 - k)})`, taper: 0.1 });
      else stroke(g, P, 0, 1, { width: 5, color: `rgba(30,28,28,${0.85 * (1 - k)})`, taper: 0.3 });
    }
  }, { blur: 1 });
}
