'use strict';
// The bottom-right reference's beats, rebuilt for Island: the glowing glass
// prompt, the ringed sphere (here Bloub), the glossy waveform bars, the three
// track cards (here the agents), the stacked tiles and the neon-ring finale.
// Film time throughout; the reference frame each beat comes from is noted
// as BR<n> (30 fps).

const BR = n => (n - 30) / 30; // bottom-right reference frame → film seconds

// ------------------------------------------------------------ backdrops
let SWIRL = null;
function makeSwirl() {
  const stops = [[0, [92, 44, 160]], [0.16, [190, 56, 130]], [0.34, [236, 96, 70]], [0.55, [246, 136, 56]], [0.76, [250, 178, 118]], [1, [158, 152, 186]]];
  SWIRL = noiseTexture(192, 108, 11, n => ramp(stops, clamp((n - 0.24) * 1.9)), { octaves: 4, scale: 2.2, warp: 1.4, stretch: 1.3 });
}
// the blurred, slowly churning gradient behind the prompt (BR38–146)
function swirlBG(ctx, t, bright = 1) {
  ctx.fillStyle = '#0c0810'; ctx.fillRect(0, 0, SW, SH);
  ctx.save();
  ctx.globalAlpha = bright;
  ctx.filter = `blur(${22 * SCALE}px)`;
  const s = 1.35 + 0.05 * Math.sin(t * 0.7);
  ctx.translate(SW / 2 + Math.sin(t * 0.45) * 18, SH / 2 + Math.cos(t * 0.38) * 10);
  ctx.rotate(Math.sin(t * 0.3) * 0.06);
  ctx.drawImage(SWIRL, -SW * s / 2, -SH * s / 2, SW * s, SH * s);
  ctx.restore();
}
// dark stage with tall blurred light streaks (BR162 onward)
function streakBG(ctx, t, a = 1) {
  ctx.fillStyle = rgb([22, 16, 28]); ctx.fillRect(0, 0, SW, SH);
  layer(ctx, 'streaks', g => {
    const cols = [[150, 90, 255], [255, 110, 190], [255, 160, 120], [110, 140, 255], [220, 120, 255]];
    for (let i = 0; i < 9; i++) {
      const x = ((i * 83 + t * 9 * (i % 2 ? 1 : -1)) % (SW + 80)) - 40;
      const gr = g.createLinearGradient(0, 0, 0, SH);
      const c = cols[i % cols.length];
      gr.addColorStop(0, rgb(c, 0.0)); gr.addColorStop(0.35, rgb(c, 0.32 * a)); gr.addColorStop(1, rgb(c, 0.05 * a));
      g.fillStyle = gr; g.fillRect(x, 0, 26 + (i % 3) * 14, SH);
    }
    const v = g.createRadialGradient(SW / 2, SH / 2, 40, SW / 2, SH / 2, 360);
    v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,0.55)');
    g.fillStyle = v; g.fillRect(0, 0, SW, SH);
  }, { blur: 16 });
}

// ------------------------------------------------------------ A · prompt (BR30–150)
const PCARD = [ // cx, cy, w, h
  [BR(38), [289, 222, 154, 36]], [BR(42), [289, 225, 262, 62], E.outQ], [BR(46), [289, 229, 382, 86], E.outQ],
  [BR(50), [289, 208, 412, 92], E.outQ], [BR(58), [289, 195, 420, 94], E.outQ], [BR(70), [288.5, 192, 423, 95], E.outQ],
];
const HEAD_Y = [[BR(42), 122], [BR(46), 113], [BR(54), 80], [BR(58), 74], [BR(70), 72]];
const PCAM = [[BR(70), 1], [BR(118), 1.17, E.ioQ], [BR(138), 1.17]];
function headline(ctx, t, y) {
  const c = cueOf('headline'), ts = CUE_TIMES.headline, size = 25;
  const full = measure(ctx, c.text, size, 'Inter', 600, -0.02);
  let x = 289 - full / 2;
  const out = seg(t, BR(138), BR(150));
  for (let i = 0; i < c.text.length; i++) {
    const ch = c.text[i], adv = measure(ctx, ch, size, 'Inter', 600, -0.02);
    const k = seg(t, ts[i], ts[i] + 0.16);
    const gone = clamp(out * 1.6 - (c.text.length - 1 - i) / c.text.length * 0.6); // leaves right to left
    const a = k * (1 - gone);
    if (a > 0.01 && ch !== ' ') text(ctx, ch, x, y, { size, weight: 600, color: [255, 250, 248], tracking: -0.02, alpha: a, blur: (1 - k) * 5 + gone * 6 });
    x += adv;
  }
}
function glassCard(ctx, x, y, w, h, r, a = 1, dark = 0) {
  ctx.save(); ctx.globalAlpha *= a;
  rrect(ctx, x, y, w, h, r);
  const g = ctx.createLinearGradient(0, y, 0, y + h);
  g.addColorStop(0, `rgba(${lerp(70, 22, dark)},${lerp(24, 6, dark)},${lerp(60, 14, dark)},${lerp(0.32, 0.85, dark)})`); g.addColorStop(1, `rgba(${lerp(60, 22, dark)},${lerp(20, 6, dark)},${lerp(40, 14, dark)},${lerp(0.42, 0.85, dark)})`);
  ctx.fillStyle = g; ctx.fill();
  ctx.strokeStyle = 'rgba(255,225,235,0.42)'; ctx.lineWidth = 0.8; ctx.stroke();
  ctx.restore();
}
function promptCardBR(ctx, t, cx, cy, w, h) {
  const x = cx - w / 2, y = cy - h / 2;
  glassCard(ctx, x, y, w, h, 12, 1, 1 - seg(t, BR(39), BR(45)));
  const ui = seg(t, BR(48), BR(56));
  if (ui <= 0) return;
  ctx.save(); ctx.globalAlpha *= ui;
  const n = typed('prompt', t);
  if (n === 0) text(ctx, 'Describe a task for a new agent', x + 18, y + 26, { size: 9.6, color: [255, 220, 225], alpha: 0.5 });
  else text(ctx, cueOf('prompt').text.slice(0, n), x + 18, y + 26, { size: 10.4, weight: 400, color: [255, 252, 250] });
  if (t > BR(80) && (t < cueDone('prompt') + 0.1 || Math.floor(t * 2.6) % 2 === 0)) {
    const cxp = x + 18 + measure(ctx, cueOf('prompt').text.slice(0, n), 10.4, 'Inter', 400) + 1.2;
    ctx.fillStyle = 'rgba(255,250,250,0.9)'; ctx.fillRect(cxp, y + 17, 0.7, 11.5);
  }
  const by = y + h - 19;
  ctx.fillStyle = 'rgba(255,255,255,0.16)'; ctx.beginPath(); ctx.arc(x + 21, by, 8.5, 0, TAU); ctx.fill();
  text(ctx, '+', x + 21, by + 3.6, { size: 11, color: [255, 245, 245], align: 'center' });
  ctx.fillStyle = 'rgba(255,255,255,0.14)'; rrect(ctx, x + 36, by - 9, 72, 18, 9); ctx.fill();
  bloub(ctx, x + 47, by, 4.2, { rim: false, body: AGENTS[0].body });
  text(ctx, 'aurora-web', x + 55, by + 2.6, { size: 7, weight: 500, color: [255, 240, 240] });
  // permission mode chip and the Launch button
  ctx.fillStyle = 'rgba(255,255,255,0.14)'; ctx.beginPath(); ctx.arc(x + w - 84, by, 8.5, 0, TAU); ctx.fill();
  ctx.strokeStyle = 'rgba(255,245,245,0.9)'; ctx.lineWidth = 1; ctx.beginPath();
  ctx.moveTo(x + w - 84, by - 4.2); ctx.lineTo(x + w - 80.5, by - 2.6); ctx.lineTo(x + w - 81, by + 1.5); ctx.lineTo(x + w - 84, by + 4.2);
  ctx.lineTo(x + w - 87, by + 1.5); ctx.lineTo(x + w - 87.5, by - 2.6); ctx.closePath(); ctx.stroke();
  const press = t > BR(127) && t < BR(131) ? 1 : 0;
  ctx.save(); ctx.translate(x + w - 41, by); ctx.scale(1 - press * 0.07, 1 - press * 0.07);
  const bg = ctx.createLinearGradient(-28, 0, 28, 0);
  bg.addColorStop(0, rgb(mix(VIOLET, [40, 30, 90], press * 0.4))); bg.addColorStop(1, rgb(mix([236, 80, 160], [90, 30, 70], press * 0.4)));
  ctx.fillStyle = bg; rrect(ctx, -28, -10, 56, 20, 10); ctx.fill();
  text(ctx, '+ Launch', 0, 2.6, { size: 7.4, weight: 600, color: [255, 255, 255], align: 'center' });
  ctx.restore();
  ctx.restore();
}
// the reference's big white arrow pointer
function whitePointer(ctx, x, y, s, a, press) {
  if (a <= 0) return;
  ctx.save(); ctx.globalAlpha *= a; ctx.translate(x, y); ctx.scale(s * (press ? 0.9 : 1), s * (press ? 0.9 : 1));
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, 15); ctx.lineTo(3.8, 11.4); ctx.lineTo(6.6, 17); ctx.lineTo(8.8, 16);
  ctx.lineTo(6.2, 10.6); ctx.lineTo(11.2, 10.6); ctx.closePath();
  ctx.shadowColor = 'rgba(0,0,0,0.35)'; ctx.shadowBlur = 5; ctx.shadowOffsetY = 1.5;
  ctx.fillStyle = '#fff'; ctx.fill(); ctx.restore();
}
function sceneGlowPrompt(ctx, t) {
  swirlBG(ctx, t, kf(t, [[BR(32), 0], [BR(38), 0.32], [BR(46), 1]]));
  if (t < BR(34)) { ctx.fillStyle = '#000'; ctx.fillRect(0, 0, SW, SH); return; }
  if (t < BR(38)) { // a single spark before the card
    ctx.fillStyle = `rgba(255,220,230,${seg(t, BR(34), BR(36))})`; ctx.beginPath(); ctx.arc(289, 205, 1.6, 0, TAU); ctx.fill();
    return;
  }
  ctx.save();
  const s = kf(t, PCAM);
  ctx.translate(289, 172); ctx.scale(s, s); ctx.translate(-289, -172);
  const collapse = seg(t, BR(137), BR(142));
  let [cx, cy, w, h] = kf(t, PCARD);
  if (t < BR(138) || collapse < 1) headline(ctx, t, kf(t, HEAD_Y));
  else headline(ctx, t, 72);
  if (collapse <= 0) promptCardBR(ctx, t, cx, cy, w, h);
  else if (t < BR(146)) { // the card snaps shut into the island
    const e = E.inC(collapse);
    const pw = lerp(w, 124, e), ph = lerp(h, 24, e), py = lerp(cy, 166, e);
    ctx.save(); ctx.globalAlpha *= 1 - e * 0.2; glassCard(ctx, 289 - pw / 2, py - ph / 2, pw, ph, lerp(12, 12, e)); ctx.restore();
    const ia = seg(t, BR(139), BR(142));
    island(ctx, 289, py - ph / 2, pw, ph, ph / 2, {}); ctx.globalAlpha = 1;
    if (ia > 0) face(ctx, 289 - pw / 2 + 13, py, 6.5 * ia, t);
    const shrink = seg(t, BR(143), BR(146));
    if (shrink > 0) { ctx.fillStyle = rgb([22, 16, 28], shrink); rrect(ctx, 289 - pw / 2 - 2, py - ph / 2 - 2, pw + 4, ph + 4, ph); }
  }
  // pointer comes in from the right and clicks Launch
  if (t > BR(116) && t < BR(140)) {
    const bx = cx + w / 2 - 41, by = cy + h / 2 - 19;
    const [px, py] = kf(t, [[BR(116), [bx + 70, by + 30]], [BR(126), [bx + 6, by + 4], E.outC], [BR(140), [bx + 9, by + 7]]]);
    whitePointer(ctx, px, py, 1.45, seg(t, BR(116), BR(119)) * (1 - seg(t, BR(136), BR(140))), t > BR(127) && t < BR(131));
  }
  ctx.restore();
}

// ------------------------------------------------------------ B · sphere → Bloub (BR146–198)
const SPH_R = [[BR(148), 0], [BR(150), 3], [BR(154), 36, E.outQ], [BR(158), 56, E.outQ], [BR(162), 76, E.outQ], [BR(166), 84, E.outQ], [BR(178), 86]];
// glossy sphere seen from the top: nested rings that sink toward the bottom
function ringSphere(ctx, cx, cy, r, t, spin = 0) {
  if (r < 0.5) return;
  ctx.save();
  ctx.shadowColor = 'rgba(200,110,255,0.55)'; ctx.shadowBlur = r * 0.35;
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.fillStyle = '#b06cff'; ctx.fill();
  ctx.restore();
  ctx.save();
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.clip();
  const pal = [[246, 236, 255], [196, 140, 255], [255, 168, 222], [140, 118, 255], [255, 214, 240], [176, 120, 250]];
  const N = 10;
  for (let i = 0; i < N; i++) { // ridges: each ring lit from the top left, shadowed on its lower lip
    const k = i / N, rr = r * (1.04 - k * 0.92);
    const ox = Math.sin(spin + i * 0.6) * r * 0.05 * k, oy = r * 0.34 * k;
    const g = ctx.createLinearGradient(cx + ox - rr, cy + oy - rr, cx + ox + rr * 0.6, cy + oy + rr);
    const c = pal[i % pal.length];
    g.addColorStop(0, rgb(mix(c, [255, 255, 255], 0.7))); g.addColorStop(0.45, rgb(c)); g.addColorStop(1, rgb(mix(c, [50, 16, 90], 0.55)));
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx + ox, cy + oy, rr, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = Math.max(0.6, r * 0.012);
    ctx.beginPath(); ctx.arc(cx + ox, cy + oy, rr, Math.PI * 1.05, Math.PI * 1.75); ctx.stroke();
  }
  const sp = ctx.createRadialGradient(cx - r * 0.35, cy - r * 0.45, 0, cx - r * 0.35, cy - r * 0.45, r * 0.6);
  sp.addColorStop(0, 'rgba(255,255,255,0.55)'); sp.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = sp; ctx.fillRect(cx - r, cy - r, 2 * r, 2 * r);
  ctx.restore();
}
function sceneSphere(ctx, t) {
  const dark = seg(t, BR(158), BR(170));
  swirlBG(ctx, t, 1 - dark);
  if (dark > 0) { ctx.save(); ctx.globalAlpha = dark; streakBG(ctx, t, dark); ctx.restore(); }
  const r = kf(t, SPH_R);
  ringSphere(ctx, 289, 162, r, t, (t - BR(150)) * 2.2);
  // it is Bloub: the eyes open, blink once, then he spins into discs
  const eyes = seg(t, BR(164), BR(170)) * (1 - seg(t, BR(186), BR(190)));
  if (eyes > 0) {
    const blink = blinkAt(t, [BR(178)]);
    ctx.save(); ctx.globalAlpha *= eyes; ctx.fillStyle = '#120a1e';
    for (const s of [-1, 1]) {
      const eh = r * 0.36 * (1 - blink * 0.9), ew = r * 0.15;
      rrect(ctx, 289 + s * r * 0.26 - ew / 2, 162 - r * 0.28 - eh / 2, ew, eh, ew / 2); ctx.fill();
    }
    ctx.restore();
  }
}

// ------------------------------------------------------------ C · discs → bars (BR186–282)
const NB = 9;
// a glossy bar with drifting light bands
function glossBar(ctx, x, y, w, h, t, i) {
  if (h < 1 || w < 0.5) return;
  ctx.save();
  rrect(ctx, x - w / 2, y - h / 2, w, h, Math.min(w, h) * 0.18); ctx.clip();
  const g = ctx.createLinearGradient(0, y - h / 2, 0, y + h / 2);
  g.addColorStop(0, '#fff6fd'); g.addColorStop(0.18, '#ff7ec4'); g.addColorStop(0.4, '#9a4cff'); g.addColorStop(0.62, '#fff0fb'); g.addColorStop(0.82, '#ff5fae'); g.addColorStop(1, '#7c6cff');
  ctx.fillStyle = g; ctx.fillRect(x - w / 2, y - h / 2, w, h);
  for (let k = 0; k < 3; k++) { // light ripples sliding down the bar
    const yy = y - h / 2 + ((t * 60 + k * h / 3 + i * 23) % (h + 30)) - 15;
    const bg = ctx.createLinearGradient(0, yy - 10, 0, yy + 10);
    bg.addColorStop(0, 'rgba(255,255,255,0)'); bg.addColorStop(0.5, 'rgba(255,255,255,0.55)'); bg.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = bg; ctx.beginPath(); ctx.ellipse(x, yy, w * 0.9, 9, 0.25, 0, TAU); ctx.fill();
  }
  ctx.fillStyle = 'rgba(255,255,255,0.45)'; ctx.fillRect(x - w / 2, y - h / 2, Math.max(0.8, w * 0.12), h);
  ctx.restore();
}
function barLayout(t, i) {
  // sliced sphere (p=0) → spaced bars (p=1) → waveform → squeezed into one bar
  const p = E.ioC(seg(t, BR(194), BR(214)));
  const d = (i - (NB - 1) / 2) / ((NB - 1) / 2);
  const r = 86;
  const sliceW = (2 * r) / NB;
  const chord = 2 * r * Math.sqrt(Math.max(0.02, 1 - d * d * 0.92));
  const slant = 1 - 0.35 * (d + 1) / 2; // the reference's bars descend to the right
  const wave = 0.55 + 0.25 * Math.sin(t * 6.1 + i * 1.7) + 0.2 * Math.sin(t * 10.3 + i * 0.9);
  const tall = 258 * slant * (0.5 + 0.5 * wave) * (1 - 0.45 * d * d);
  let x = 289 + d * lerp(r - sliceW / 2, 140, p), w = lerp(sliceW * 0.96, 22, p), h = lerp(chord, tall, p);
  const thin = E.ioC(seg(t, BR(246), BR(262)));
  h = lerp(h, h * 0.42, thin); w = lerp(w, 14, thin); x = lerp(x, 289 + d * 100, thin);
  const sq = E.ioC(seg(t, BR(266), BR(284)));
  x = lerp(x, 289, sq); w = lerp(w, 12, sq); h = lerp(h, 58, sq);
  if (sq > 0.97 && i !== (NB - 1) / 2) h = 0; // merged
  return [x, 162, w, h];
}
function sceneBars(ctx, t) {
  streakBG(ctx, t, 1);
  layer(ctx, 'barsglow', g => { for (let i = 0; i < NB; i++) { const [x, y, w, h] = barLayout(t, i); g.fillStyle = 'rgba(210,110,255,0.55)'; rrect(g, x - w / 2, y - h / 2, w, h, 4); g.fill(); } }, { blur: 10, alpha: 0.8 });
  for (let i = 0; i < NB; i++) { const [x, y, w, h] = barLayout(t, i); glossBar(ctx, x, y, w, h, t, i); }
}

// ------------------------------------------------------------ D · one bar → glass → three agents (BR302–386)
const SLAB = [[BR(300), [289, 162, 12, 58]], [BR(306), [289, 162, 16, 44], E.outQ], [BR(310), [289, 162, 64, 40], E.outQ], [BR(316), [289, 162, 330, 74], E.outQ], [BR(318), [289, 162, 406, 85], E.outQ]];
const TRACKS = [[289, 66.5], [289, 163.5], [289, 255]];
function trackCard(ctx, t, i, cx, cy, w, h, a) {
  const x = cx - w / 2, y = cy - h / 2, ag = AGENTS[i];
  ctx.save(); ctx.globalAlpha *= a;
  rrect(ctx, x, y, w, h, 10);
  ctx.fillStyle = 'rgba(28,22,40,0.72)'; ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.2)'; ctx.lineWidth = 0.8; ctx.stroke();
  const id = 'agent' + i, n = typed(id, t);
  bloub(ctx, x + 18, y + 13, 5.2, { body: ag.body, rim: false, blink: blinkAt(t, [10.6 + i * 0.3]) });
  if (n > 0) text(ctx, cueOf(id).text.slice(0, n), x + 28, y + 15.5, { size: 7.6, weight: 600, color: [248, 246, 252] });
  text(ctx, `${ag.act} · opus · ${[2, 4, 1][i]} of 5`, x + 28, y + 24, { size: 5, color: [160, 150, 176], alpha: seg(t, cueDone(id), cueDone(id) + 0.2) });
  // live activity as a waveform
  const n0 = 60, wx = x + 16, ww = w - 32;
  for (let k = 0; k < n0; k++) {
    const v = 0.25 + 0.75 * Math.abs(Math.sin(k * 0.71 + i * 2.1) * Math.cos(k * 0.23 + t * (2.2 + i * 0.4)));
    const hh = 2 + v * 14 * seg(t, 9.9 + k * 0.004, 10.25 + k * 0.004);
    ctx.fillStyle = rgb(mix(ag.body, [255, 255, 255], 0.25 + 0.4 * v));
    rrect(ctx, wx + (k / n0) * ww, y + 38 - hh / 2, ww / n0 * 0.55, hh, 0.6); ctx.fill();
  }
  ctx.restore();
}
function sceneTracks(ctx, t) {
  streakBG(ctx, t, 1);
  if (t < BR(300)) { sceneBars(ctx, t); return; }
  if (t < BR(322)) { // a single violet slab that widens into glass
    const [cx, cy, w, h] = kf(t, SLAB);
    const glass = seg(t, BR(310), BR(318));
    ctx.save();
    rrect(ctx, cx - w / 2, cy - h / 2, w, h, Math.min(8, h / 2));
    const g = ctx.createLinearGradient(cx - w / 2, 0, cx + w / 2, 0);
    g.addColorStop(0, rgb(mix([150, 80, 255], [80, 40, 120], glass), 1 - glass * 0.55)); g.addColorStop(1, rgb(mix([236, 80, 170], [120, 50, 110], glass), 1 - glass * 0.55));
    ctx.fillStyle = g; ctx.fill();
    ctx.strokeStyle = `rgba(255,200,240,${0.5 * glass})`; ctx.lineWidth = 0.8; ctx.stroke();
    ctx.restore();
    return;
  }
  // dotted line, then the slab splits into three agent cards
  const split = E.outC(seg(t, BR(324), BR(336)));
  if (split <= 0) {
    rrect(ctx, 86, 120, 406, 85, 8); ctx.fillStyle = 'rgba(110,50,120,0.45)'; ctx.fill();
    ctx.strokeStyle = 'rgba(255,200,240,0.5)'; ctx.stroke();
    for (let k = 0; k < 60; k++) { ctx.fillStyle = `rgba(255,200,240,${0.6 * seg(t, BR(320) + k * 0.004, BR(322) + k * 0.004)})`; ctx.fillRect(100 + k * 6.3, 162, 1.4, 1.4); }
    return;
  }
  layer(ctx, 'trackglow', g => { TRACKS.forEach(([x, y], i) => { const yy = lerp(162, y, split); g.fillStyle = rgb(AGENTS[i].body, 0.6); rrect(g, x - 144, yy - 28, 288, 57, 10); g.fill(); }); }, { blur: 14, alpha: 0.6 * (1 - seg(t, BR(340), BR(356))) });
  TRACKS.forEach(([x, y], i) => {
    const w = lerp(406, 288, split), h = lerp(85, 57, split), yy = lerp(162, y, split);
    // and later shrink into square tiles (BR386–398)
    const sq = E.ioC(seg(t, 11.2, 11.55));
    const ty = [79, 161, 241][i];
    trackCard(ctx, t, i, x, lerp(yy, ty, sq), lerp(w, 72, sq), lerp(h, 72, sq), 1 - sq);
    if (sq > 0) tileArt(ctx, t, i, x, lerp(yy, ty, sq), lerp(w, 72, sq), lerp(h, 72, sq), sq);
  });
}

// ------------------------------------------------------------ E · tiles (BR386–450)
function tileArt(ctx, t, i, cx, cy, w, h, a) {
  const ag = AGENTS[i];
  ctx.save(); ctx.globalAlpha *= a;
  rrect(ctx, cx - w / 2, cy - h / 2, w, h, Math.min(14, w * 0.2)); ctx.save(); ctx.clip();
  const g = ctx.createRadialGradient(cx - w * 0.2, cy - h * 0.3, 2, cx, cy, Math.max(w, h));
  g.addColorStop(0, rgb(mix(ag.body, [255, 255, 255], 0.45))); g.addColorStop(0.6, rgb(ag.body)); g.addColorStop(1, rgb(mix(ag.body, [20, 10, 40], 0.6)));
  ctx.fillStyle = g; ctx.fillRect(cx - w / 2, cy - h / 2, w, h);
  bloub(ctx, cx, cy - h * 0.06, Math.min(w, h) * 0.26, { body: mix(ag.body, [255, 255, 255], 0.25), rim: false, blink: blinkAt(t, [11.75 + i * 0.12]) });
  ctx.restore();
  text(ctx, ag.name, cx, cy + h / 2 - 7, { size: Math.min(6.4, w * 0.09), weight: 500, color: [255, 255, 255], align: 'center' });
  ctx.restore();
}
function sceneTiles(ctx, t) {
  streakBG(ctx, t, 1 - seg(t, 11.9, 12.3) * 0.6);
  const merge = E.ioC(seg(t, 11.9, 12.12)), big = E.outC(seg(t, 12.05, 12.2)), gone = E.inC(seg(t, 12.22, 12.4));
  const pos = [[289, 79], [289, 161], [289, 241]];
  [2, 1, 0].forEach(i => {
    const [x, y] = pos[i];
    const tx = 289 + (i - 0) * 6 * (1 - big), ty = 162 + (i - 0) * 6 * (1 - big);
    const s = i === 0 ? lerp(72, 96, big) * (1 - gone) : 72 * (1 - big);
    if (s < 0.5) return;
    tileArt(ctx, t, i, lerp(x, tx, merge), lerp(y, ty, merge), s, s, 1);
  });
}

// ------------------------------------------------------------ L · neon-ring finale (BR450–490)
function neonRing(ctx, t, t0) {
  const p = t - t0;
  if (p < 0) return;
  const R = 90 + 210 * E.outC(clamp(p / 0.9)) + p * 14;
  const cols = [[170, 140, 255], [255, 100, 200], [120, 245, 210]];
  layer(ctx, 'ring', g => {
    g.lineJoin = 'round';
    cols.forEach((c, k) => {
      g.beginPath();
      for (let a = 0; a <= 220; a++) {
        const th = (a / 220) * TAU;
        const n = Math.sin(th * 23 + k * 2 + p * 3) * 0.5 + Math.sin(th * 37 - k + p * 5) * 0.35 + Math.sin(th * 61 + k * 4) * 0.25;
        const rr = R * (1 + 0.1 * n) + k * 6;
        const x = 289 + Math.cos(th) * rr, y = 162 + Math.sin(th) * rr * 0.92;
        a ? g.lineTo(x, y) : g.moveTo(x, y);
      }
      g.strokeStyle = rgb(c); g.lineWidth = 1.6; g.shadowColor = rgb(c); g.shadowBlur = 8; g.stroke();
    });
  }, { alpha: clamp(p * 4) * (1 - seg(t, 24.6, 25)) });
}
function sceneFinale(ctx, t) {
  const g = ctx.createRadialGradient(289, 162, 20, 289, 162, 380);
  g.addColorStop(0, '#26222c'); g.addColorStop(1, '#141218');
  ctx.fillStyle = g; ctx.fillRect(0, 0, SW, SH);
  const t0 = 22.62;
  // the wordmark assembles from glowing fragments, then the ring bursts out
  const word = 'Island', size = 38;
  const full = measure(ctx, word, size, 'Inter', 700, -0.02);
  let x = 289 - full / 2;
  for (let i = 0; i < word.length; i++) {
    const adv = measure(ctx, word[i], size, 'Inter', 700, -0.02);
    const k = seg(t, 22.5 + [0.1, 0.0, 0.18, 0.06, 0.22, 0.14][i], 22.5 + [0.1, 0.0, 0.18, 0.06, 0.22, 0.14][i] + 0.22);
    if (k > 0) {
      ctx.save(); ctx.shadowColor = `rgba(255,255,255,${0.9})`; ctx.shadowBlur = 16 * (1.4 - k * 0.6);
      text(ctx, word[i], x, 176, { size, weight: 700, color: [255, 255, 255], tracking: -0.02, alpha: k, blur: (1 - k) * 4 });
      ctx.restore();
    }
    x += adv;
  }
  neonRing(ctx, t, t0);
}
