'use strict';
// 5.33 – 16.37s: finance cards stream past "SECURED BY PLAID", a flower
// field with the Computer bubble, the Spending Overview card with its typed
// line, and the glass logo resolving into the wordmark.

// ---------------------------------------------------------------- cards
function glassCard(ctx, w, h, o = {}) {
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 14;
  rrect(ctx, -w / 2, -h / 2, w, h, o.r ?? 16);
  const g = ctx.createLinearGradient(-w / 2, -h / 2, w / 2, h / 2);
  g.addColorStop(0, o.c0 || '#173336'); g.addColorStop(0.55, o.c1 || '#0f1d20'); g.addColorStop(1, o.c2 || '#0b1416');
  ctx.fillStyle = g; ctx.fill();
  ctx.restore();
  rrect(ctx, -w / 2, -h / 2, w, h, o.r ?? 16);
  const s = ctx.createLinearGradient(-w / 2, -h / 2, w / 2, h / 2);
  s.addColorStop(0, 'rgba(120,230,210,0.55)'); s.addColorStop(0.5, 'rgba(60,120,120,0.25)'); s.addColorStop(1, 'rgba(110,220,200,0.5)');
  ctx.strokeStyle = s; ctx.lineWidth = 1.1; ctx.stroke();
}
function spendingCard(ctx) {
  glassCard(ctx, 171, 171, { r: 18 });
  text(ctx, 'spending', -66, -58, { size: 8, weight: 500, color: '#3ff0b0' });
  text(ctx, '$8,357', -66, -33, { size: 13, weight: 600, color: [226, 232, 230] });
  text(ctx, 'this month', -66, -22, { size: 4.5, color: [130, 150, 150] });
  const bars = [['#41f2d6', 0.86], ['#9bd84a', 0.8], ['#6a6af0', 0.58], ['#f0f060', 0.45]];
  bars.forEach(([c, v], i) => {
    const y = 4 + i * 13;
    rrect(ctx, -66, y, 124, 5, 2.5); ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.fill();
    rrect(ctx, -66, y, 124 * v, 5, 2.5); ctx.fillStyle = c; ctx.fill();
    text(ctx, ['$2,840', '$1,960', '$1,130', '$820'][i], 62, y + 4.5, { size: 3.6, color: [150, 160, 160], align: 'right' });
  });
}
function chartCard(ctx) {
  glassCard(ctx, 162, 173, { r: 18, c0: '#1d4a48', c1: '#132a2c' });
  text(ctx, 'Net worth', -64, -60, { size: 7, weight: 500, color: '#3ff0b0' });
  text(ctx, '$42,180', -64, -40, { size: 11, weight: 600, color: [226, 232, 230] });
  rrect(ctx, -70, -28, 140, 100, 12); ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fill();
  ctx.save(); ctx.strokeStyle = '#3fe6a0'; ctx.lineWidth = 1.6; ctx.lineJoin = 'round'; ctx.shadowColor = '#3fe6a0'; ctx.shadowBlur = 4;
  const pts = [[-62, 60], [-48, 46], [-38, 52], [-24, 34], [-12, 40], [2, 28], [14, 30], [28, 14], [40, 18], [52, 2], [62, -6]];
  ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.stroke(); ctx.restore();
}
function donutCard(ctx) {
  glassCard(ctx, 150, 155, { r: 18, c0: '#1f4c4a', c1: '#14292b' });
  ctx.save(); ctx.lineCap = 'round'; ctx.shadowColor = '#2ff5d8'; ctx.shadowBlur = 8;
  ctx.strokeStyle = '#2ff5d8'; ctx.lineWidth = 12;
  ctx.beginPath(); ctx.arc(-6, -6, 30, -Math.PI * 0.35, Math.PI * 1.3); ctx.stroke(); ctx.restore();
  ctx.fillStyle = 'rgba(220,240,240,0.8)'; for (let i = 0; i < 3; i++) ctx.fillRect(44, -40 + i * 6, 12, 2);
  text(ctx, 'budget used', -6, 48, { size: 5, color: [150, 170, 170], align: 'center' });
}
function barsCard(ctx) {
  glassCard(ctx, 170, 95, { r: 14, c0: '#1d3f3f', c1: '#122426' });
  [['#41f2d6', 0.85], ['#9bd84a', 0.7], ['#f0f060', 0.5]].forEach(([c, v], i) => {
    rrect(ctx, -70, -26 + i * 18, 140 * v, 9, 4); ctx.fillStyle = c; ctx.fill();
  });
}
const SC_X = [[F(166), 640], [F(167), 608], [F(169), 576], [F(171), 537], [F(173), 488], [F(175), 440], [F(177), 394], [F(179), 336],
  [F(181), 267], [F(183), 218], [F(185), 152], [F(187), 50], [F(189), -90]];
const CC_X = [[F(182), 600], [F(183), 547], [F(185), 498], [F(187), 426], [F(189), 347], [F(191), 267], [F(193), 177], [F(195), 107], [F(197), -40], [F(198), -100]];
const DC_X = [[F(194), 600], [F(195), 542], [F(197), 415], [F(199), 336], [F(201), 224], [F(203), 108], [F(205), -10], [F(206), -90]];
const BR_X = [[F(198), 640], [F(199), 520], [F(201), 411], [F(203), 300], [F(205), 187], [F(207), 83], [F(209), -40], [F(210), -100]];
const BC_X = [[F(160), 600], [F(161), 545], [F(165), 500], [F(169), 455], [F(171), 413], [F(175), 323], [F(179), 268], [F(181), 155], [F(183), 105], [F(185), -100]];
const SERIF = 'SECURED BY PLAID';
const S_LEFT = [[F(175), 477], [F(181), 296], [F(183), 246], [F(185), 173], [F(187), 94], [F(189), 22], [F(191), -55], [F(193), -125],
  [F(195), -199], [F(197), -330], [F(199), -460], [F(201), -610], [F(203), -752], [F(205), -867], [F(207), -990]];
const S_COUNT = [[F(174), 0], [F(175), 1], [F(181), 2], [F(183), 3], [F(185), 3], [F(187), 4], [F(189), 5], [F(191), 6], [F(193), 7],
  [F(195), 9], [F(197), 10], [F(199), 12], [F(201), 14], [F(203), 16]];
let serifK = 1;
function fitSerif(ctx) { serifK = 990 / measure(ctx, SERIF, 170, 'Instrument Serif', 400, 0); }

function sceneCards(ctx, t) {
  ctx.fillStyle = '#16171a'; ctx.fillRect(0, 0, SW, SH);
  const glow = ctx.createRadialGradient(380, 230, 10, 380, 230, 360);
  glow.addColorStop(0, 'rgba(30,70,66,0.55)'); glow.addColorStop(1, 'rgba(20,22,24,0)');
  ctx.fillStyle = glow; ctx.fillRect(0, 0, SW, SH);
  const fadeIn = seg(t, F(160), F(166)), fadeOut = 1 - seg(t, F(205), F(211));
  ctx.save(); ctx.globalAlpha = fadeOut;
  // big serif line, revealed as it scrolls
  const n = kf(t, S_COUNT);
  if (n > 0) {
    layer(ctx, 'serif', g => {
      g.translate(kf(t, S_LEFT), 220); g.scale(serifK, 1);
      let x = 0;
      for (let i = 0; i < SERIF.length; i++) {
        const a = clamp(n - i);
        if (a > 0) text(g, SERIF[i], x, 0, { size: 170, family: 'Instrument Serif', color: [150, 160, 158], alpha: a * 0.9 });
        x += measure(g, SERIF[i], 170, 'Instrument Serif', 400, 0);
      }
    }, { blur: 1.6 });
  }
  // scanlines over the whole frame
  ctx.fillStyle = 'rgba(0,0,0,0.28)';
  for (let y = 0; y < SH; y += 2.6) ctx.fillRect(0, y, SW, 1);
  ctx.fillStyle = 'rgba(40,200,170,0.05)'; ctx.fillRect(0, 0, SW, SH);
  // blurred card along the bottom and top
  if (t < F(185)) layer(ctx, 'bc', g => { g.translate(kf(t, BC_X), 300); g.globalAlpha = fadeIn; barsCard(g); }, { blur: 5 });
  if (t > F(198)) layer(ctx, 'br', g => { g.translate(kf(t, BR_X), 55); barsCard(g); }, { blur: 4 });
  // sharp cards
  if (t > F(166) && t < F(189)) layer(ctx, 'sc', g => { g.translate(kf(t, SC_X), 108); g.rotate(-0.02); spendingCard(g); }, { blur: 1.3 });
  if (t > F(182) && t < F(198)) layer(ctx, 'cc', g => { g.translate(kf(t, CC_X), 204); chartCard(g); }, { blur: 0.8 });
  if (t > F(194) && t < F(206)) { ctx.save(); ctx.translate(kf(t, DC_X), 88); donutCard(ctx); ctx.restore(); }
  ctx.restore();
}

// --------------------------------------------------------- flower field
let FLOWERS = null;
function buildFlowers() {
  if (FLOWERS) return;
  const c = document.createElement('canvas'); c.width = SW * SCALE; c.height = 200 * SCALE;
  const g = c.getContext('2d'); g.scale(SCALE, SCALE);
  const r = mulberry32(7);
  // stems and leaves
  for (let i = 0; i < 160; i++) {
    const x = r() * 260, y = 60 + r() * 140;
    g.strokeStyle = `rgba(${70 + r() * 30},${95 + r() * 30},${60 + r() * 20},0.7)`; g.lineWidth = 0.6;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 8, y + 30); g.stroke();
  }
  // white umbels (queen anne's lace) over the left
  for (let i = 0; i < 150; i++) {
    const x = r() * 270, top = 15 + x * 0.32 + r() * 25, y = top + r() * 120;
    const rad = 8 + r() * 10;
    const shade = 0.75 + r() * 0.25;
    for (let k = 0; k < 45; k++) {
      const a = r() * TAU, d = Math.sqrt(r()) * rad;
      const v = (200 + r() * 55) * shade;
      g.fillStyle = `rgba(${v},${v + 2},${v - 12},${0.75 + r() * 0.25})`;
      g.beginPath(); g.arc(x + Math.cos(a) * d, y + Math.sin(a) * d * 0.55, 1 + r() * 1.3, 0, TAU); g.fill();
    }
  }
  // small yellow florets along the bottom
  for (let i = 0; i < 90; i++) {
    const x = 120 + r() * 400, y = 165 + r() * 35;
    for (let k = 0; k < 6; k++) {
      g.fillStyle = `rgba(${215 + r() * 30},${200 + r() * 30},${90 + r() * 40},0.9)`;
      g.beginPath(); g.arc(x + (r() - 0.5) * 6, y + (r() - 0.5) * 4, 0.8 + r() * 0.8, 0, TAU); g.fill();
    }
  }
  FLOWERS = c;
}
const FIELD_DY = [[F(214), 200], [F(217), 120, E.outQ], [F(225), 62, E.outQ], [F(235), 55], [F(250), 70], [F(262), 78], [F(271), 100, E.inQ], [F(279), 190, E.inQ]];
const BUBBLE = [[F(224), [253, 213, 0]], [F(225), [253, 213, 3]], [F(227), [318, 186, 5], E.lin], [F(229), [354, 165, 7], E.lin], [F(231), [368, 145, 10], E.lin],
  [F(233), [354, 126, 20], E.lin], [F(235), [332, 120, 39], E.lin], [F(237), [318, 116, 58], E.outQ], [F(239), [303, 118, 66], E.outQ],
  [F(241), [289, 122, 72], E.outQ], [F(249), [266, 132, 85], E.outQ], [F(261), [271, 137, 84]], [F(271), [249, 145, 98], E.lin],
  [F(277), [256, 156, 126], E.inQ], [F(281), [264, 150, 151], E.lin], [F(283), [267, 150, 180], E.lin], [F(285), [272, 160, 232], E.inQ], [F(287), [275, 160, 420], E.inQ]];
const PERP_N = [[F(234), 0], [F(237), 1, E.lin], [F(241), 4, E.lin], [F(243), 5, E.lin], [F(245), 6, E.lin], [F(247), 7, E.lin], [F(251), 8, E.lin], [F(253), 9, E.lin], [F(255), 10, E.lin]];
const PERP_POS = [[F(241), [12, 60, 1]], [F(251), [12, 55, 1.02]], [F(261), [0, 52, 1.05]], [F(271), [-22, 46, 1.1]], [F(275), [-45, 24, 1.15], E.inQ], [F(279), [-80, 0, 1.2], E.inQ], [F(283), [-120, -40, 1.3], E.inQ]];
const COMP_N = [[F(254), 0], [F(255), 1, E.lin], [F(257), 4, E.lin], [F(261), 4, E.lin], [F(263), 5, E.lin], [F(265), 6, E.lin], [F(267), 7, E.lin], [F(269), 8, E.lin]];
const COMP_POS = [[F(255), [340, 268, 1]], [F(261), [340, 270, 1]], [F(269), [347, 278, 1.05]], [F(271), [347, 280, 1.06]], [F(277), [361, 300, 1.15], E.inQ], [F(281), [375, 330, 1.3], E.inQ], [F(285), [400, 380, 1.5], E.inQ]];
let wordSize = 40;
function fitWords(ctx) { wordSize = 40 * 219 / measure(ctx, 'perplexity', 40, 'Inter', 400, -0.03); }

function bubbleWord(ctx, word, n, pos) {
  const [x, y, s] = pos;
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  let cx = 0;
  for (let i = 0; i < word.length; i++) {
    const a = clamp(n - i);
    if (a > 0) text(ctx, word[i], cx, 0, { size: wordSize, weight: 400, color: [218, 224, 214], tracking: -0.03, alpha: a, blur: (1 - a) * 3 + 1.3 });
    cx += measure(ctx, word[i], wordSize, 'Inter', 400, -0.03);
  }
  ctx.restore();
}
function laptopBubble(ctx, t, cx, cy, r) {
  if (r <= 0.5) return;
  ctx.save();
  // glass sphere
  const body = ctx.createRadialGradient(cx - r * 0.2, cy - r * 0.2, r * 0.1, cx, cy, r);
  body.addColorStop(0, 'rgba(120,170,150,0.05)'); body.addColorStop(0.75, 'rgba(70,140,130,0.12)'); body.addColorStop(1, 'rgba(110,210,190,0.28)');
  ctx.fillStyle = body; ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.fill();
  ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.clip();
  ctx.filter = `blur(${r * 0.08 * SCALE}px)`;
  ctx.fillStyle = 'rgba(40,150,140,0.45)'; ctx.beginPath(); ctx.ellipse(cx + r * 0.08, cy + r * 0.45, r * 0.22, r * 0.75, 0.1, 0, TAU); ctx.fill();
  ctx.fillStyle = 'rgba(60,110,180,0.45)'; ctx.beginPath(); ctx.ellipse(cx - r * 0.55, cy - r * 0.05, r * 0.25, r * 0.45, 0, 0, TAU); ctx.fill();
  ctx.filter = 'none';
  // leaf and blossom reflections
  ctx.fillStyle = 'rgba(220,210,90,0.9)'; ctx.beginPath(); ctx.ellipse(cx - r * 0.45, cy + r * 0.38, r * 0.16, r * 0.09, -0.5, 0, TAU); ctx.fill();
  ctx.save(); ctx.filter = `blur(${r * 0.04 * SCALE}px)`; ctx.fillStyle = 'rgba(235,235,230,0.95)';
  ctx.beginPath(); ctx.ellipse(cx - r * 0.35, cy + r * 0.62, r * 0.17, r * 0.15, 0, 0, TAU); ctx.fill(); ctx.restore();
  ctx.restore();
  // rim
  const rim = ctx.createLinearGradient(cx - r, cy, cx + r, cy);
  rim.addColorStop(0, 'rgba(110,235,215,0.9)'); rim.addColorStop(0.5, 'rgba(160,220,210,0.35)'); rim.addColorStop(1, 'rgba(200,220,210,0.6)');
  ctx.strokeStyle = rim; ctx.lineWidth = Math.max(1, r * 0.035);
  ctx.beginPath(); ctx.arc(cx, cy, r * 0.98, 0, TAU); ctx.stroke();
  // laptop
  const sx = cx - r * 0.1, sy = cy - r * 0.06, w = r * 0.69, h = r * 0.51;
  ctx.strokeStyle = 'rgba(235,240,236,0.95)'; ctx.lineWidth = Math.max(1, r * 0.045);
  rrect(ctx, sx - w / 2, sy - h / 2, w, h, r * 0.06); ctx.stroke();
  ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(sx - r * 0.46, sy + h / 2 + r * 0.07); ctx.lineTo(sx + r * 0.42, sy + h / 2 + r * 0.07); ctx.stroke();
  const eye = kf(t, [[F(273), [255, 255, 255]], [F(275), [230, 110, 255]], [F(277), [70, 235, 225]], [F(283), [60, 220, 190]]]);
  ctx.save(); ctx.shadowColor = rgb(eye); ctx.shadowBlur = r * 0.12; ctx.fillStyle = rgb(eye);
  for (const s of [-1, 1]) { rrect(ctx, sx + s * r * 0.09 - r * 0.04, sy - r * 0.08, r * 0.08, r * 0.16, r * 0.03); ctx.fill(); }
  ctx.restore();
  ctx.restore();
}
function sceneField(ctx, t) {
  const k = seg(t, F(214), F(261));
  const top = mix([38, 42, 38], [80, 98, 78], k), bot = mix([36, 40, 36], [70, 88, 70], k);
  const g = ctx.createLinearGradient(0, 0, 0, SH); g.addColorStop(0, rgb(top)); g.addColorStop(1, rgb(bot));
  ctx.fillStyle = g; ctx.fillRect(0, 0, SW, SH);
  const zoom = kf(t, [[F(255), 1], [F(281), 1.0], [F(286.5), 1.45, E.inQ]]);
  ctx.save(); ctx.translate(270, 155); ctx.scale(zoom, zoom); ctx.translate(-270, -155);
  buildFlowers();
  const dy = kf(t, FIELD_DY);
  ctx.save(); ctx.filter = `blur(${0.9 * SCALE}px)`;
  ctx.drawImage(FLOWERS, 0, 205 + dy - 80, SW, 200); ctx.restore();
  const [bx, by, br] = kf(t, BUBBLE);
  if (t > F(224)) layer(ctx, 'bubble', g => { // the bubble sits a touch out of focus
    g.translate(270, 155); g.scale(zoom, zoom); g.translate(-270, -155);
    laptopBubble(g, t, bx, by, br);
  }, { blur: 1.8 * zoom });
  ctx.restore();
  if (t > F(234)) bubbleWord(ctx, 'perplexity', kf(t, PERP_N), kf(t, PERP_POS));
  if (t > F(254)) bubbleWord(ctx, 'computer', kf(t, COMP_N), kf(t, COMP_POS));
}

// ------------------------------------------------------ spending overview
const LINE = 'Your finances. Finally understood.';
const LINE_N = [[F(303), 0], [F(305), 1, E.lin], [F(307), 4, E.lin], [F(309), 12, E.lin], [F(311), 17, E.lin], [F(313), 22, E.lin], [F(315), 25, E.lin],
  [F(317), 28, E.lin], [F(319), 29, E.lin], [F(321), 30, E.lin], [F(323), 31, E.lin], [F(325), 32, E.lin], [F(329), 33, E.lin], [F(337), 34, E.lin],
  [F(363), 34, E.lin], [F(365), 27, E.lin], [F(367), 18, E.lin], [F(369), 12, E.lin], [F(371), 3, E.lin], [F(373), 0, E.lin]];
const CARD = [[F(288), [285, 150, 280, 0]], [F(299), [289, 166, 318, 0], E.outQ], [F(311), [284, 164, 324, 0]], [F(329), [289, 166, 336, 0]],
  [F(361), [289, 162, 346, 0]], [F(365), [292, 162, 340, 0.12], E.inQ], [F(369), [293, 161, 322, 0.32], E.inQ], [F(371), [298, 160, 296, 0.55], E.inQ], [F(372.5), [330, 160, 250, 1.1], E.inQ]];
const COUNTS = [
  { s: '$40', t: [F(299), F(301), F(303)] },
  { s: '$384', t: [F(305), F(311), F(313), F(315)] },
  { s: '$8,357', t: [F(311), F(311), F(317), F(321), F(323), F(325)] },
];
function countText(t, c) { // reveal the figure one glyph at a time, the next glyph rolling
  let n = 0;
  c.t.forEach((tt, i) => { if (t >= tt) n = i + 1; });
  if (c.s === '$8,357') n = n >= 6 ? 6 : n;
  const extra = c.s.length - c.t.length;
  const shown = c.s.slice(0, Math.min(c.s.length, n + (n === c.t.length ? extra : 0)));
  return shown;
}
function heat(c, r, t) {
  const v = 0.5 + 0.3 * Math.sin(c * 0.45 + r * 0.7 + t * 1.2) + 0.25 * Math.sin(c * 0.17 - r * 1.3 - t * 0.7);
  return ramp([[0, [40, 118, 215]], [0.4, [72, 168, 238]], [0.7, [150, 222, 250]], [1, [236, 250, 255]]], v);
}
function overviewCard(ctx, t) {
  const W0 = 336, H0 = 200;
  ctx.save(); ctx.translate(-W0 / 2, -H0 / 2);
  ctx.save(); ctx.shadowColor = 'rgba(0,0,0,0.55)'; ctx.shadowBlur = 20; ctx.shadowOffsetY = 6;
  rrect(ctx, 0, 0, W0, H0, 16);
  const g = ctx.createLinearGradient(0, 0, 0, H0); g.addColorStop(0, '#071214'); g.addColorStop(1, '#0c1d21');
  ctx.fillStyle = g; ctx.fill(); ctx.restore();
  rrect(ctx, 0, 0, W0, H0, 16); ctx.strokeStyle = 'rgba(80,200,190,0.45)'; ctx.lineWidth = 1; ctx.stroke();
  text(ctx, 'Spending Overview', 22, 21, { size: 8, weight: 500, color: [235, 240, 240] });
  [['Today', 59], ['This week', 164], ['This month', 284]].forEach(([s, x], i) => {
    text(ctx, s, x, 48, { size: 5.2, color: [120, 135, 140], align: 'center' });
    const v = countText(t, COUNTS[i]);
    text(ctx, v, x, 73, { size: 13, weight: 500, color: [238, 242, 242], align: 'center' });
    const full = COUNTS[i].s;
    if (v.length < full.length && t > COUNTS[i].t[0]) { // rolling digit
      const w = measure(ctx, v, 13, 'Inter', 500);
      text(ctx, String(Math.floor(t * 40) % 10), x + w / 2 + 2, 73, { size: 13, weight: 500, color: [238, 242, 242], alpha: 0.5, blur: 1.6 });
    }
  });
  rrect(ctx, 28, 84, 279, 101, 12); ctx.fillStyle = '#0a1a1e'; ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,0.07)'; ctx.stroke();
  text(ctx, 'Daily activity', 40, 95, { size: 4.5, color: [130, 145, 150] });
  [['jan', 73], ['feb', 118], ['mar', 163], ['apr', 211], ['june', 255]].forEach(([s, x]) => text(ctx, s, x, 107, { size: 4.2, color: [140, 150, 160], align: 'center' }));
  ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'].forEach((s, r) => text(ctx, s, 36, 117 + r * 7.43, { size: 3.8, color: [140, 150, 160] }));
  const reveal = seg(t, F(296), F(307)) * 30;
  for (let c = 0; c < 27; c++) {
    const a = clamp(reveal - c);
    if (a <= 0) continue;
    for (let r = 0; r < 7; r++) {
      ctx.fillStyle = rgb(heat(c, r, t), a);
      rrect(ctx, 52 + c * 8.48, 112 + r * 7.43, 6.8, 5.8, 0.8); ctx.fill();
    }
  }
  if (reveal > 0) { // soft bloom drifting over the hot cells
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let k = 0; k < 4; k++) {
      const gx = 52 + ((k * 61 + t * 14) % 230), gy = 125 + 10 * Math.sin(k * 2 + t);
      if (gx - 52 > reveal * 8.48) continue;
      const rg = ctx.createRadialGradient(gx, gy, 0, gx, gy, 34);
      rg.addColorStop(0, 'rgba(120,200,255,0.22)'); rg.addColorStop(1, 'rgba(120,200,255,0)');
      ctx.fillStyle = rg; ctx.fillRect(gx - 34, gy - 34, 68, 68);
    }
    ctx.restore();
  }
  ctx.restore();
}
let FOLIAGE = null;
function buildFoliage() {
  if (FOLIAGE) return;
  const c = document.createElement('canvas'); c.width = 140 * SCALE; c.height = 140 * SCALE;
  const g = c.getContext('2d'); g.scale(SCALE, SCALE);
  const r = mulberry32(21);
  const inBush = () => { for (;;) { const x = r() * 2 - 1, y = r() * 2 - 1; if (x * x + y * y < 1) return [70 + x * 62, 70 + y * 62]; } };
  for (let i = 0; i < 160; i++) {
    const [x, y] = inBush();
    g.fillStyle = `rgba(${62 + r() * 35},${78 + r() * 30},${60 + r() * 25},0.9)`;
    g.beginPath(); g.ellipse(x, y, 3 + r() * 6, 1.4 + r() * 2.4, r() * 3, 0, TAU); g.fill();
  }
  for (let i = 0; i < 46; i++) { // creamy umbels
    const [x, y] = inBush(), rad = 4 + r() * 6;
    for (let k = 0; k < 34; k++) {
      const a = r() * TAU, d = Math.sqrt(r()) * rad;
      g.fillStyle = `rgba(${206 + r() * 22},${210 + r() * 20},${188 + r() * 22},0.9)`;
      g.beginPath(); g.arc(x + Math.cos(a) * d, y + Math.sin(a) * d * 0.7, 0.6 + r() * 0.8, 0, TAU); g.fill();
    }
  }
  FOLIAGE = c;
}
function sceneOverview(ctx, t) {
  if (t < F(288.5)) { // teal-navy smear as the camera passes through the bubble
    const g = ctx.createLinearGradient(0, 0, SW, 0);
    g.addColorStop(0, '#153a43'); g.addColorStop(0.4, '#17434a'); g.addColorStop(0.7, '#183236'); g.addColorStop(1, '#181f20');
    ctx.fillStyle = g; ctx.fillRect(0, 0, SW, SH);
    return;
  }
  const g = ctx.createLinearGradient(0, 0, 0, SH);
  g.addColorStop(0, '#1d1d25'); g.addColorStop(0.5, '#383a4a'); g.addColorStop(1, '#585c78');
  ctx.fillStyle = g; ctx.fillRect(0, 0, SW, SH);
  const dark = seg(t, F(288.5), F(297));
  ctx.fillStyle = `rgba(8,16,20,${0.85 * (1 - dark)})`; ctx.fillRect(0, 0, SW, SH);
  const [cx, cy, w, rotY] = kf(t, CARD);
  const s = w / 336;
  buildFoliage();
  const grow = seg(t, F(303), F(319));
  if (grow > 0 && t < F(372.5)) {
    ctx.save(); ctx.globalAlpha = grow;
    ctx.filter = 'blur(1.2px)';
    const sl = 120 * s * grow + 1, sr = 135 * s * grow + 1;
    ctx.drawImage(FOLIAGE, cx - 160 * s - sl / 2, cy - 55 * s - sl / 2, sl, sl);
    ctx.drawImage(FOLIAGE, cx + 125 * s - sr / 2, cy + 62 * s - sr / 2, sr, sr);
    ctx.restore();
  }
  if (t < F(372.5)) {
    const blur = kf(t, [[F(288.5), 8], [F(299), 0]]);
    layer(ctx, 'ov', g2 => {
      g2.translate(cx, cy);
      g2.transform(Math.cos(rotY), -Math.sin(rotY) * 0.12, 0, 1, 0, 0);
      g2.scale(s, s);
      overviewCard(g2, t);
    }, { blur, alpha: seg(t, F(288.5), F(291)) });
  }
  const n = Math.floor(kf(t, LINE_N));
  if (t > F(303) && t < F(373)) {
    const shown = LINE.slice(0, n), size = 13;
    const full = measure(ctx, LINE, size, 'Inter', 400, -0.01);
    const x0 = 289 - full / 2;
    text(ctx, shown, x0, 40, { size, weight: 400, color: [238, 238, 242], tracking: -0.01 });
    if (t < F(351) || t > F(362)) {
      const cxp = x0 + measure(ctx, shown, size, 'Inter', 400, -0.01) + 1;
      ctx.fillStyle = 'rgba(238,238,242,0.9)'; ctx.fillRect(cxp, 29, 0.7, 13);
    }
  }
}

// --------------------------------------------------------- the end card
const END_LOGO = [[F(372.5), [289, 163, 30, 0.02]], [F(375), [289, 145, 30, 0.04]], [F(379), [289, 160, 45, 0.25], E.outQ], [F(381), [289, 163, 55, 0.5], E.outQ],
  [F(385), [289, 163, 60, 1], E.outQ], [F(389), [289, 163, 62, 1]], [F(425), [282, 163, 62, 1]], [F(427), [275, 163, 61, 1]], [F(429), [267, 163, 60, 1]],
  [F(431), [246, 163, 58, 1], E.inQ], [F(433), [166, 163, 56, 1], E.lin], [F(435), [152, 163, 55, 1], E.outQ], [F(439), [145, 163, 55, 1], E.outQ],
  [F(441), [137, 163, 55, 1], E.outQ], [F(492), [137, 163, 55, 1]]];
const WORD_N = [[F(424.5), 0], [F(425), 1], [F(427), 1], [F(429), 2, E.lin], [F(431), 4, E.lin], [F(433), 6, E.lin], [F(435), 8, E.lin], [F(437), 9, E.lin], [F(439), 10, E.lin]];
const WORD_X = [[F(425), 376], [F(427), 376], [F(429), 361], [F(431), 344], [F(433), 264, E.lin], [F(435), 253], [F(437), 246], [F(439), 238], [F(441), 238], [F(492), 236]];
const END_SPIN = [[F(372.5), 1.45], [F(381), 0.85, E.outQ], [F(395), 0.32, E.outQ], [F(492), 0.14, E.ioQ]];
let markSize = 50;
function fitMark(ctx) { markSize = 50 * 252 / measure(ctx, 'perplexity', 50, 'Inter', 500, -0.035); }

function sceneEnd(ctx, t) {
  ctx.fillStyle = '#0b0b0b'; ctx.fillRect(0, 0, SW, SH);
  const g = ctx.createLinearGradient(0, 0, 0, SH);
  const blue = 1 - seg(t, F(375), F(392));
  g.addColorStop(0, rgb(mix([12, 12, 13], [24, 26, 31], blue)));
  g.addColorStop(0.45, rgb(mix([25, 25, 27], [40, 41, 47], blue)));
  g.addColorStop(1, rgb(mix([38, 39, 42], [58, 60, 73], blue)));
  ctx.fillStyle = g; ctx.fillRect(0, 0, SW, SH);
  const [cx, cy, R, open] = kf(t, END_LOGO);
  drawLogo3D(ctx, { cx, cy, R, rx: 0.55, ry: kf(t, END_SPIN), rz: -0.04, open, look: 'glass' });
  const n = kf(t, WORD_N);
  if (n <= 0) return;
  const x0 = kf(t, WORD_X), base = 183;
  let x = x0;
  const word = 'perplexity';
  for (let i = 0; i < word.length; i++) {
    const a = clamp(n - i);
    const adv = measure(ctx, word[i], markSize, 'Inter', 500, -0.035);
    if (a > 0) {
      const born = WORD_N.find(k => k[1] >= i + 1)?.[0] ?? F(439);
      const fresh = 1 - seg(t, born, born + 0.35);
      let col = mix([232, 232, 234], [255, 255, 255], fresh);
      if (i === 0 && t < F(429)) col = [110, 170, 150];
      col = mix(col, [140, 222, 200], fresh * 0.75);
      const tealK = (i >= 8) ? Math.sin(Math.PI * seg(t, F(453), F(467))) : 0;
      col = mix(col, [120, 225, 205], tealK * 0.8);
      ctx.save();
      const bloom = (i >= 4 ? fresh : 0) + (i >= 7 ? (1 - seg(t, F(441), F(455))) * 0.7 : 0);
      if (bloom > 0.02) {
        const gx = x + adv / 2, gy = base - markSize * 0.3;
        const rg = ctx.createRadialGradient(gx, gy, 0, gx, gy, 62);
        rg.addColorStop(0, `rgba(255,255,255,${0.16 * Math.min(1, bloom)})`); rg.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = rg; ctx.fillRect(gx - 62, gy - 62, 124, 124);
      }
      const glowK = Math.max(fresh, (i >= 7 ? 1 - seg(t, F(441), F(455)) : 0) * 0.8);
      if (glowK > 0.02) { ctx.shadowColor = `rgba(255,255,255,${0.85 * glowK})`; ctx.shadowBlur = 16 * glowK; }
      ctx.font = `500 ${markSize}px Inter`;
      if ('letterSpacing' in ctx) ctx.letterSpacing = -0.035 * markSize + 'px';
      ctx.globalAlpha = a;
      ctx.fillStyle = rgb(col);
      ctx.fillText(word[i], x, base);
      ctx.restore();
    }
    x += adv;
  }
}
