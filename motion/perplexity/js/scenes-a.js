'use strict';
// 0.00 – 5.33s: the neon logo rises through frame, the prompt pill types a
// request, the click sets off a cyan light burst and an iris down to a dot,
// which becomes the "Connect Accounts" button.

// ------------------------------------------------------------ backdrops
function greyStage(ctx, t) {
  ctx.fillStyle = '#25272b'; ctx.fillRect(0, 0, SW, SH);
  const g = ctx.createRadialGradient(289, 95, 10, 289, 140, 330);
  g.addColorStop(0, 'rgba(96,101,112,0.95)'); g.addColorStop(0.45, 'rgba(70,74,84,0.7)'); g.addColorStop(1, 'rgba(28,29,33,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, SW, SH);
  // floor glow that the logo rises out of
  const k = 1 - seg(t, F(19), F(29));
  if (k > 0) {
    const f = ctx.createRadialGradient(289, 340, 0, 289, 340, 180);
    f.addColorStop(0, `rgba(120,122,128,${0.7 * k})`); f.addColorStop(1, 'rgba(120,122,128,0)');
    ctx.fillStyle = f; ctx.fillRect(0, 0, SW, SH);
  }
  const v = ctx.createRadialGradient(289, 160, 200, 289, 160, 420);
  v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(8,8,10,0.55)');
  ctx.fillStyle = v; ctx.fillRect(0, 0, SW, SH);
}

// ---------------------------------------------------------- neon logo
const RISE = [
  [F(1), [282, 405, 86]], [F(19), [282, 405, 86]], [F(21), [281, 290, 90], E.lin], [F(23), [280, 225, 94], E.lin],
  [F(25), [278, 190, 95], E.outQ], [F(27), [277, 160, 97], E.outQ], [F(31), [277, 163, 97]], [F(37), [275, 152, 98], E.lin],
  [F(39), [273, 122, 101], E.inQ], [F(41), [271, 68, 106], E.lin], [F(43), [270, 0, 112], E.lin], [F(45), [270, -140, 117], E.lin],
];
function neonLogo(ctx, t) {
  if (t > F(45)) return;
  const [cx, cy, R] = kf(t, RISE);
  const u = Math.max(0, t - F(19));
  drawLogo3D(ctx, { cx, cy, R, rx: -0.15, ry: -0.05 + u * 0.6, rz: 0.04 + u * 0.22, look: 'neon' });
}

// --------------------------------------------------------- prompt pill
const PROMPT = 'Build me a spending heatmap for this month';
const PILL = [
  [F(40.5), [296, 160, 150, 0.17]], [F(41), [296, 160, 208, 0.17], E.outQ], [F(45), [294, 161, 236, 0.18], E.outQ],
  [F(49), [293, 162, 255, 0.185], E.outQ], [F(61), [294, 162, 279, 0.2], E.outQ], [F(71), [291, 162, 293, 0.2], E.lin],
  [F(73.5), [290, 163, 302, 0.2], E.lin], [F(75), [272, 164, 371, 0.185], E.outQ], [F(79), [267, 165, 396, 0.18], E.outQ],
  [F(81), [267, 165, 405, 0.18], E.outQ], [F(91), [264, 163, 412, 0.178], E.lin], [F(95), [265, 163, 391, 0.18], E.outQ],
  [F(97), [257, 162, 354, 0.18], E.lin],
];
const TYPED = [[F(58), 0], [F(59), 3, E.lin], [F(61), 7, E.lin], [F(63), 16, E.lin], [F(65), 24, E.lin], [F(67), 29, E.lin],
  [F(69), 32, E.lin], [F(71), 35, E.lin], [F(73), 36, E.lin], [F(75), 38, E.lin], [F(77), 39, E.lin], [F(79), 40, E.lin],
  [F(81), 41, E.lin], [F(86), 41, E.lin], [F(87), 42, E.lin]];
let pillFont = 10;
function fitPillFont(ctx) { pillFont = 10 * 296 / measure(ctx, PROMPT, 10, 'Inter', 500, -0.01); } // full prompt spans 296px at w=405

function arrowIcon(ctx, x, y, r, ang, col = '#dfe6f2') {
  ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
  ctx.strokeStyle = col; ctx.lineWidth = r * 0.16; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.beginPath(); ctx.moveTo(-r * 0.5, 0); ctx.lineTo(r * 0.5, 0); ctx.moveTo(r * 0.12, -r * 0.38); ctx.lineTo(r * 0.5, 0); ctx.lineTo(r * 0.12, r * 0.38); ctx.stroke();
  ctx.restore();
}
function pillBody(ctx, w, h, o = {}) {
  const r = h / 2;
  ctx.save();
  ctx.shadowColor = 'rgba(80,120,220,0.45)'; ctx.shadowBlur = h * 0.3;
  rrect(ctx, -w / 2, -h / 2, w, h, r);
  const g = ctx.createLinearGradient(0, -h / 2, 0, h / 2);
  g.addColorStop(0, o.top || '#263247'); g.addColorStop(1, o.bot || '#161c29');
  ctx.fillStyle = g; ctx.fill();
  ctx.restore();
  rrect(ctx, -w / 2, -h / 2, w, h, r);
  const rim = ctx.createLinearGradient(-w / 2, 0, w / 2, 0);
  rim.addColorStop(0, 'rgba(170,190,235,0.75)'); rim.addColorStop(0.5, 'rgba(120,140,190,0.35)'); rim.addColorStop(1, 'rgba(150,140,240,0.8)');
  ctx.strokeStyle = rim; ctx.lineWidth = Math.max(0.8, h * 0.03); ctx.stroke();
}
function promptPill(ctx, t, o = {}) {
  const [cx, cy, w, k] = kf(t, PILL);
  const h = w * k;
  const appear = seg(t, F(40.5), F(42));
  if (appear <= 0) return;
  ctx.save();
  ctx.globalAlpha *= appear;
  ctx.translate(cx, cy); ctx.rotate(o.rot ?? 0.03);
  if (o.squash) ctx.scale(1, o.squash);
  pillBody(ctx, w, h);
  const size = pillFont * w / 405;
  const n = Math.floor(kf(t, TYPED));
  const shown = PROMPT.slice(0, n);
  // the typed line stays centred in the space left of the button until it fills it
  const tx = Math.max(-w / 2 + h * 0.62, -0.078 * w - measure(ctx, shown, size, 'Inter', 500, -0.01) / 2), ty = size * 0.36;
  if (o.textAlpha !== 0) {
    text(ctx, shown, tx, ty, { size, weight: 500, color: [236, 240, 248], tracking: -0.01, alpha: o.textAlpha ?? 1 });
    if (t > F(58) && t < F(97) && (Math.floor(t * 3) % 2 === 0 || t < F(88))) {
      const cxp = tx + measure(ctx, shown, size, 'Inter', 500, -0.01) + 1;
      ctx.fillStyle = 'rgba(236,240,248,0.9)'; ctx.fillRect(cxp, -size * 0.55, Math.max(0.6, size * 0.08), size * 1.1);
    }
  }
  // send button: ring with an arrow that swings round as the prompt is typed
  if (t > F(57)) {
    const br = h * 0.25 * (0.35 + 0.65 * E.outQ(seg(t, F(58), F(62)))), bx = w / 2 - h * 0.55;
    ctx.save(); ctx.globalAlpha *= seg(t, F(57), F(60));
    ctx.beginPath(); ctx.arc(bx, 0, br, 0, TAU);
    ctx.fillStyle = 'rgba(14,18,28,0.9)'; ctx.fill();
    ctx.strokeStyle = 'rgba(200,214,236,0.6)'; ctx.lineWidth = Math.max(0.6, br * 0.07); ctx.stroke();
    ctx.globalAlpha *= 0.85;
    const ang = kf(t, [[F(60), Math.PI * 0.75], [F(65), Math.PI * 1.25, E.lin], [F(69), Math.PI * 1.5, E.lin], [F(73), Math.PI * 1.72, E.lin], [F(79), Math.PI * 2, E.outQ]]);
    arrowIcon(ctx, bx, 0, br, ang);
    ctx.restore();
  }
  ctx.restore();
}

// dark grey 3D-looking pointer
function darkCursor(ctx, x, y, s = 1, a = 1) {
  ctx.save(); ctx.globalAlpha *= a; ctx.translate(x, y); ctx.scale(s, s); ctx.rotate(-0.25);
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, 17); ctx.lineTo(4.2, 13); ctx.lineTo(7, 19); ctx.lineTo(9.6, 18); ctx.lineTo(6.9, 12); ctx.lineTo(12, 12); ctx.closePath();
  const g = ctx.createLinearGradient(0, 0, 10, 18); g.addColorStop(0, '#5a5d63'); g.addColorStop(1, '#2a2c30');
  ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 4; ctx.shadowOffsetY = 2;
  ctx.fillStyle = g; ctx.fill();
  ctx.shadowColor = 'transparent'; ctx.strokeStyle = 'rgba(160,165,175,0.5)'; ctx.lineWidth = 0.6; ctx.stroke();
  ctx.restore();
}
const CURSOR = [[F(79), [520, 335]], [F(81), [505, 300], E.outQ], [F(83), [477, 271], E.lin], [F(85), [455, 235], E.lin], [F(87), [441, 217], E.outQ],
  [F(89), [441, 206], E.outQ], [F(91), [433, 200], E.lin], [F(93), [438, 193], E.lin], [F(95), [433, 185], E.lin], [F(97), [433, 178], E.lin],
  [F(99), [426, 172], E.lin], [F(101), [520, 64], E.inQ]];

function scenePrompt(ctx, t) {
  greyStage(ctx, t);
  if (t > F(40.5)) promptPill(ctx, t);
  neonLogo(ctx, t);
  if (t > F(79) && t < F(101)) {
    const [x, y] = kf(t, CURSOR);
    const press = t > F(94) && t < F(97) ? 0.88 : 1;
    darkCursor(ctx, x, y, 1.05 * press, seg(t, F(79), F(81)));
  }
}

// ------------------------------------------------- burst, spin and iris
const BURST_PILL = [
  [F(97), [257, 162, 354, 0, 1, -0.05]], [F(99), [253, 160, 210, 0, 0.9, 0.12]], [F(101), [276, 158, 135, 1, 1.4, -0.28]],
  [F(103), [274, 160, 269, 0, 1, -0.12]], [F(105), [267, 165, 150, 0, 1, -0.16]], [F(107), [275, 166, 12, 0, 6, 0.0]],
  [F(109), [278, 166, 152, 0, 0.55, 0.2]], [F(111), [271, 166, 138, 0, 0.55, 0.22]], [F(113), [271, 165, 80, 0, 0.55, 0.3]],
  [F(115), [277, 168, 32, 0, 0.6, 0.6]],
];
function beams(ctx, t, cx, cy, power) {
  const base = -Math.PI / 2 + (t - F(99)) * 2.4 + (t > F(103) ? 0.8 : 0);
  const L = 120 + 780 * E.outQ(seg(t, F(97.5), F(101.5)));
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const wedge = (a, half, w0) => {
    ctx.beginPath(); ctx.moveTo(cx + Math.cos(a + Math.PI / 2) * w0, cy + Math.sin(a + Math.PI / 2) * w0);
    ctx.lineTo(cx + Math.cos(a - half) * L, cy + Math.sin(a - half) * L);
    ctx.lineTo(cx + Math.cos(a + half) * L, cy + Math.sin(a + half) * L);
    ctx.lineTo(cx + Math.cos(a - Math.PI / 2) * w0, cy + Math.sin(a - Math.PI / 2) * w0);
    ctx.closePath(); ctx.fill();
  };
  for (let i = 0; i < 3; i++) {
    const a = base + (i * TAU) / 3;
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, L);
    g.addColorStop(0, `rgba(255,255,255,${power})`); g.addColorStop(0.08, `rgba(110,255,240,${power})`);
    g.addColorStop(0.35, `rgba(0,250,232,${0.95 * power})`); g.addColorStop(1, `rgba(0,230,218,${0.8 * power})`);
    ctx.fillStyle = g; wedge(a, 0.34, 8);
    const c = ctx.createRadialGradient(cx, cy, 0, cx, cy, L * 0.8);
    c.addColorStop(0, `rgba(255,255,255,${0.9 * power})`); c.addColorStop(0.25, `rgba(190,255,250,${0.55 * power})`); c.addColorStop(1, 'rgba(120,255,240,0)');
    ctx.fillStyle = c; wedge(a + 0.05, 0.06, 3);
  }
  ctx.fillStyle = `rgba(0,160,150,${0.32 * power})`; ctx.fillRect(cx - 900, cy - 900, 1800, 1800); // teal haze
  const core = ctx.createRadialGradient(cx, cy, 0, cx, cy, 70);
  core.addColorStop(0, `rgba(255,255,255,${0.9 * power})`); core.addColorStop(1, 'rgba(120,255,235,0)');
  ctx.fillStyle = core; ctx.fillRect(cx - 70, cy - 70, 140, 140);
  ctx.restore();
}
function cyanSphere(ctx, t, cx, cy, r, hw = r) {
  ctx.save();
  rrect(ctx, cx - hw, cy - r, 2 * hw, 2 * r, r); ctx.clip();
  const g = ctx.createRadialGradient(cx - r * 0.2, cy - r * 0.25, r * 0.1, cx, cy, r);
  g.addColorStop(0, '#5ffff0'); g.addColorStop(0.7, '#27f0e2'); g.addColorStop(1, '#19c8c8');
  ctx.fillStyle = g; ctx.fillRect(cx - hw, cy - r, 2 * hw, 2 * r);
  ctx.filter = `blur(${r * 0.18 * SCALE}px)`;
  for (let i = 0; i < 3; i++) { // three darker lobes, like the reference's mottled ball
    const a = -0.6 + i * 2.1 + t * 1.5;
    ctx.fillStyle = 'rgba(20,120,110,0.55)';
    ctx.beginPath(); ctx.arc(cx + Math.cos(a) * r * 0.45, cy + Math.sin(a) * r * 0.45, r * 0.32, 0, TAU); ctx.fill();
  }
  ctx.restore();
  // silver crescent on the inner left
  ctx.save(); ctx.globalAlpha *= clamp((1.5 - hw / r) * 2);
  const m = ctx.createLinearGradient(cx - r, cy - r, cx - r * 0.4, cy + r);
  m.addColorStop(0, '#e9eef2'); m.addColorStop(0.5, '#8f9aa3'); m.addColorStop(1, '#dfe6ea');
  ctx.strokeStyle = m; ctx.lineWidth = Math.max(1.5, r * 0.07); ctx.lineCap = 'round';
  ctx.beginPath(); ctx.arc(cx + r * 0.12, cy, r * 0.88, Math.PI * 0.62, Math.PI * 1.35); ctx.stroke();
  ctx.restore();
}
function sceneBurst(ctx, t) {
  greyStage(ctx, 1);
  const tint = seg(t, F(97), F(101));
  ctx.fillStyle = `rgba(12,40,44,${0.3 * tint})`; ctx.fillRect(0, 0, SW, SH);
  const [cx, cy, w, back, hk, rot] = kf(t, BURST_PILL.map(([tt, v], i) => [tt, v, i ? E.ioQ : undefined]));
  const power = t < F(115) ? seg(t, F(97), F(100)) : 0;
  if (t < F(114.5)) {
    layer(ctx, 'beams', g => beams(g, t, cx, cy, power), { blur: 6 });
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(rot);
    const h = Math.max(4, Math.min(w, 354) * 0.18 * hk);
    if (back > 0.5) { // the pill's silver back while it flips
      rrect(ctx, -w / 2, -h / 2, w, h, h / 2);
      const m = ctx.createLinearGradient(0, -h / 2, 0, h / 2); m.addColorStop(0, '#c6ccd2'); m.addColorStop(1, '#7f878f');
      ctx.fillStyle = m; ctx.fill();
    } else {
      pillBody(ctx, w, h);
      if (w > 100) text(ctx, PROMPT, -w / 2 + h * 0.6, h * 0.12, { size: Math.min(h * 0.32, pillFont * w / 405), weight: 600, color: [240, 244, 250], alpha: 0.95 });
    }
    ctx.restore();
    if (t < F(101)) darkCursor(ctx, ...kf(t, CURSOR), 1.05, 1);
    return;
  }
  const r = kf(t, [[F(114.5), 200], [F(115), 96, E.outQ], [F(117), 50, E.inQ], [F(118), 20, E.inQ], [F(118.5), 16]]);
  const sy = kf(t, [[F(115), 165], [F(117), 162]]), squash = 1 + 0.7 * seg(t, F(117), F(118));
  cyanSphere(ctx, t, 289, sy, r / Math.sqrt(squash), r * squash);
  ctx.save(); ctx.translate(278, 166); ctx.rotate(0.75); pillBody(ctx, r * 0.2, r * 0.06); ctx.restore();
}

// ------------------------------------------------------ connect accounts
const BTN = [[F(118.5), [289, 163, 60]], [F(119), [289, 163, 78]], [F(121), [288, 162, 149], E.outQ], [F(123), [289, 162, 206], E.outQ],
  [F(125), [288, 163, 236], E.outQ], [F(127), [289, 163, 252], E.outQ], [F(129), [289, 163, 260], E.outQ], [F(139), [291, 163, 262], E.lin],
  [F(141), [287, 163, 256], E.lin], [F(145), [289, 163, 262], E.lin], [F(147), [264, 163, 267], E.lin], [F(149), [249, 162, 195], E.outQ],
  [F(151), [231, 162, 153], E.outQ], [F(153), [206, 162, 132], E.lin], [F(155), [172, 162, 123], E.lin], [F(157), [120, 162, 123], E.inQ],
  [F(159), [15, 162, 95], E.inQ], [F(160.5), [-80, 162, 90], E.lin]];
const BTN_TEXT = [[F(120), 0], [F(121), 3, E.lin], [F(123), 7, E.lin], [F(125), 11, E.lin], [F(127), 14, E.lin], [F(129), 16, E.lin]];
const BG_TL = [[F(119), [60, 63, 75]], [F(129), [62, 70, 82]], [F(131), [75, 91, 103]], [F(133), [92, 112, 136], E.lin], [F(137), [114, 135, 168], E.lin],
  [F(139), [127, 150, 190], E.lin], [F(141), [136, 164, 204], E.lin], [F(143), [110, 140, 170], E.lin], [F(145), [60, 72, 78]], [F(151), [61, 73, 81]], [F(160), [35, 39, 42]]];
const BG_BR = [[F(119), [23, 25, 26]], [F(129), [26, 50, 52]], [F(131), [29, 79, 77]], [F(133), [33, 120, 112], E.lin], [F(137), [39, 177, 164], E.lin],
  [F(139), [43, 206, 191], E.lin], [F(141), [47, 235, 217], E.lin], [F(143), [40, 180, 170], E.lin], [F(145), [43, 53, 55]], [F(151), [30, 36, 40]], [F(160), [28, 29, 33]]];
const BG_C = [[F(119), [47, 50, 55]], [F(129), [55, 62, 70]], [F(131), [76, 104, 113]], [F(137), [100, 145, 162], E.lin], [F(141), [117, 173, 190], E.lin],
  [F(143), [95, 140, 150], E.lin], [F(145), [91, 122, 132]], [F(151), [81, 102, 109]], [F(160), [37, 41, 44]]];
let btnFont = 20;
function fitBtnFont(ctx) { btnFont = 20 * 185 / measure(ctx, 'Connect Accounts', 20, 'Figtree', 500, 0.04); }

function connectBG(ctx, t) {
  const tl = kf(t, BG_TL), br = kf(t, BG_BR), c = kf(t, BG_C);
  const g = ctx.createLinearGradient(0, 0, SW, SH);
  g.addColorStop(0, rgb(tl)); g.addColorStop(0.5, rgb(c)); g.addColorStop(1, rgb(br));
  ctx.fillStyle = g; ctx.fillRect(0, 0, SW, SH);
  // bright top-right sky early on, and a dark pool under the button later
  const sky = 1 - seg(t, F(127), F(131));
  if (sky > 0) { const s = ctx.createRadialGradient(560, 0, 0, 560, 0, 300); s.addColorStop(0, `rgba(150,170,185,${0.8 * sky})`); s.addColorStop(1, 'rgba(150,170,185,0)'); ctx.fillStyle = s; ctx.fillRect(0, 0, SW, SH); }
  const pool = seg(t, F(145), F(151));
  if (pool > 0) { const p = ctx.createRadialGradient(300, 330, 0, 300, 330, 220); p.addColorStop(0, `rgba(10,10,12,${0.8 * pool})`); p.addColorStop(1, 'rgba(10,10,12,0)'); ctx.fillStyle = p; ctx.fillRect(0, 0, SW, SH); }
  if (t > F(140) && t < F(144)) { // horizontal glitch lines
    const r = mulberry32(Math.floor(t * 30));
    ctx.fillStyle = 'rgba(235,245,255,0.55)';
    for (let i = 0; i < 6; i++) ctx.fillRect(0, r() * SH, SW, 0.8);
  }
}
function connectButton(ctx, t) {
  const [cx, cy, w] = kf(t, BTN);
  const h = w * 0.25;
  ctx.save(); ctx.translate(cx, cy);
  const cyanK = 1 - seg(t, F(121), F(127)); // starts as a cyan-blue gel pill
  const mint = Math.max(0, Math.sin(Math.PI * seg(t, F(137.5), F(144))));
  ctx.save();
  ctx.shadowColor = cyanK > 0.1 ? `rgba(40,200,255,${0.8 * cyanK})` : mint > 0.05 ? `rgba(80,255,220,${0.7 * mint})` : 'rgba(0,0,0,0.35)';
  ctx.shadowBlur = h * 0.5;
  rrect(ctx, -w / 2, -h / 2, w, h, h / 2);
  const g = ctx.createLinearGradient(-w / 2, 0, w / 2, 0);
  const dark = [[27, 33, 45], [22, 27, 37]];
  const L = mix(mix(dark[0], [40, 200, 240], cyanK), [170, 245, 230], mint), Rr = mix(mix(dark[1], [50, 110, 240], cyanK), [40, 240, 200], mint);
  g.addColorStop(0, rgb(L, 1 - 0.3 * mint)); g.addColorStop(1, rgb(Rr, 1 - 0.3 * mint));
  ctx.fillStyle = g; ctx.fill();
  ctx.restore();
  rrect(ctx, -w / 2, -h / 2, w, h, h / 2);
  ctx.strokeStyle = `rgba(200,225,240,${0.18 + 0.5 * cyanK + 0.6 * mint})`; ctx.lineWidth = Math.max(0.7, h * 0.03); ctx.stroke();
  const n = Math.floor(kf(t, BTN_TEXT));
  const size = btnFont * w / 262;
  const full = 'Connect Accounts';
  let x = -measure(ctx, full, size, 'Figtree', 500, 0.04) / 2;
  for (let i = 0; i < full.length; i++) {
    const adv = measure(ctx, full[i], size, 'Figtree', 500, 0.04);
    if (i < n || (i === n && t < F(129))) {
      const fresh = i >= n - 1 && t < F(129);
      text(ctx, full[i], x + (fresh ? size * 0.35 : 0), size * 0.36, { size, weight: 500, color: [238, 242, 248], tracking: 0.04, alpha: i < n ? 1 : 0.4 });
    }
    x += adv;
  }
  ctx.restore();
}
function sceneConnect(ctx, t) {
  connectBG(ctx, t);
  if (t < F(160.5)) connectButton(ctx, t);
}
