'use strict';
// The studio kit: typed lines with grey fresh letters, mono status labels that
// decode, corner guides, the pointer, springs, the bulging tile grid, and
// Bloub's eyes (which double as a pause sign).

const INK = [20, 20, 20];
const MONO = 'DM Mono';

// interruptible-spring feel: quick rise, one soft overshoot, settled at p = 1
const spring = p => (p <= 0 ? 0 : p >= 1 ? 1 : 1 - Math.exp(-6.5 * p) * Math.cos(8.6 * p));
function springKF(t, keys, dur = 0.6) {
  let v = keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    const [t0, nv] = keys[i];
    if (t < t0) break;
    const p = spring((t - t0) / dur);
    v = Array.isArray(v) ? v.map((a, j) => lerp(a, nv[j], p)) : lerp(v, nv, p);
  }
  return v;
}

function pauseBars(ctx, cx, cy, sep, w = 5.5, h = 26, col = INK, blink = 0) {
  ctx.fillStyle = rgb(col);
  const hh = Math.max(w, h * (1 - 0.85 * blink));
  rrect(ctx, cx - sep / 2 - w / 2, cy - hh / 2, w, hh, w / 2); ctx.fill();
  rrect(ctx, cx + sep / 2 - w / 2, cy - hh / 2, w, hh, w / 2); ctx.fill();
}

// --------------------------------------------------------------- text
function typedLine(ctx, id, x, y, t, o = {}) {
  const ts = CUE_TIMES[id], s = cueOf(id).text;
  const size = o.size || 13, w = o.weight || 400, col = o.color || [24, 24, 24], fresh0 = o.fresh || [180, 180, 186];
  let cx = o.align === 'center' ? x - measure(ctx, s, size, 'Inter', w) / 2 : x;
  for (let i = 0; i < s.length; i++) {
    if (t < ts[i]) break;
    const fresh = 1 - seg(t, ts[i], ts[i] + 0.35);
    text(ctx, s[i], cx, y, { size, weight: w, color: mix(col, fresh0, fresh * 0.85) });
    cx += measure(ctx, s[i], size, 'Inter', w);
  }
  const done = cueDone(id);
  if (t >= ts[0] - 0.3 && (t < done + 0.15 || (t < done + 1.6 && Math.floor((t - done) * 2.6) % 2 === 0))) {
    ctx.fillStyle = rgb(col, 0.85); ctx.fillRect(cx + 1.5, y - size * 0.82, Math.max(0.8, size * 0.07), size * 1.05);
  }
}
// section heading: a mono index, then the typed line
function heading(ctx, id, idx, name, t, t0, o = {}) {
  const a = seg(t, t0, t0 + 0.3);
  if (a <= 0) return;
  const col = o.color || INK;
  ctx.save(); ctx.globalAlpha *= a;
  ctx.fillStyle = rgb(col); ctx.fillRect(P.x + 30, P.y + 30, 2, 6.2);
  text(ctx, scramble(`${idx}  /  ${name}`, seg(t, t0, t0 + 0.4), idx.length * 3), P.x + 37, P.y + 36, { size: 6.2, family: MONO, weight: 500, color: col, tracking: 0.08 });
  ctx.restore();
  typedLine(ctx, id, P.x + 30, P.y + 60, t, { size: 15, color: col, fresh: o.fresh });
}
const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
function scramble(s, k, seed = 1) {
  const n = Math.floor(s.length * clamp(k));
  if (n >= s.length) return s;
  const r = mulberry32(seed + Math.floor(k * 40));
  let out = s.slice(0, n);
  for (let i = n; i < Math.min(s.length, n + 4); i++) out += s[i] === ' ' ? ' ' : GLYPHS[Math.floor(r() * GLYPHS.length)];
  return out;
}
// a mono label that decodes in from t0
function monoLabel(ctx, x, y, s, t, t0, o = {}) {
  const k = seg(t, t0, t0 + 0.35);
  if (k <= 0) return;
  const col = o.color || [40, 40, 40];
  ctx.save(); ctx.globalAlpha *= Math.min(1, k * 3) * (o.alpha ?? 1);
  if (o.sub) text(ctx, scramble(o.sub, k, 9), x + 7, y - 9, { size: 5.6, family: MONO, color: o.subColor || [165, 163, 160], tracking: 0.06 });
  ctx.fillStyle = rgb(col); ctx.fillRect(x, y - 5.6, 2, 6.2);
  text(ctx, scramble(s, k, x | 0), x + 7, y, { size: 5.8, family: MONO, weight: 500, color: col, tracking: 0.07 });
  ctx.restore();
}

// --------------------------------------------------------------- frames, pointer
function guides(ctx, x0, y0, x1, y1, a = 1, dark = false) {
  if (a <= 0) return;
  ctx.save(); ctx.globalAlpha *= a; ctx.strokeStyle = dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'; ctx.lineWidth = 0.7;
  ctx.beginPath(); ctx.moveTo(P.x, y0); ctx.lineTo(P.x + P.w, y0); ctx.moveTo(P.x, y1); ctx.lineTo(P.x + P.w, y1);
  ctx.moveTo(x0, P.y); ctx.lineTo(x0, P.y + P.h); ctx.moveTo(x1, P.y); ctx.lineTo(x1, P.y + P.h); ctx.stroke();
  ctx.fillStyle = dark ? '#eee' : '#111';
  for (const [x, y] of [[x0, y0], [x1, y0], [x0, y1], [x1, y1]]) ctx.fillRect(x - 1.3, y - 1.3, 2.6, 2.6);
  ctx.restore();
}
function arrow(ctx, x, y, s = 1, a = 1, press = 0) {
  if (a <= 0) return;
  ctx.save(); ctx.globalAlpha *= a; ctx.translate(x, y); ctx.scale(s * (1 - press * 0.12), s * (1 - press * 0.12));
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, 17); ctx.lineTo(4.4, 13.2); ctx.lineTo(7.4, 19.6); ctx.lineTo(10, 18.4); ctx.lineTo(7.1, 12.2); ctx.lineTo(12.8, 12.2); ctx.closePath();
  ctx.shadowColor = 'rgba(0,0,0,0.25)'; ctx.shadowBlur = 3; ctx.shadowOffsetY = 1;
  ctx.fillStyle = '#0c0c0c'; ctx.fill(); ctx.shadowColor = 'transparent';
  ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 0.9; ctx.lineJoin = 'round'; ctx.stroke();
  ctx.restore();
}
function ripples(ctx, x, y, t, t0, col = [255, 255, 255]) {
  for (let i = 0; i < 3; i++) {
    const p = seg(t, t0 + i * 0.09, t0 + i * 0.09 + 0.6);
    if (p <= 0 || p >= 1) continue;
    ctx.save(); ctx.strokeStyle = rgb(col, 0.7 * (1 - p)); ctx.lineWidth = 1.6 * (1 - p) + 0.3;
    ctx.beginPath(); ctx.arc(x, y, 6 + E.outC(p) * 46, 0, TAU); ctx.stroke(); ctx.restore();
  }
}
function paleBG(ctx) {
  const g = ctx.createLinearGradient(0, P.y, 0, P.y + P.h);
  g.addColorStop(0, '#efedeb'); g.addColorStop(0.6, '#ecebea'); g.addColorStop(1, '#e4e4e5');
  ctx.fillStyle = g; ctx.fillRect(P.x, P.y, P.w, P.h);
}
function silk(ctx, look, a = 1) {
  ctx.save(); ctx.globalAlpha *= a; ctx.drawImage(gradImage(look, 400, 225), P.x, P.y, P.w, P.h); ctx.restore();
}

// --------------------------------------------------------------- the island shape
// black rounded shape centred on cx, top at y; optional orange "needs you" glow
function islandShape(ctx, cx, y, w, h, r, o = {}) {
  ctx.save();
  if (o.glow) { ctx.shadowColor = rgb(o.glowColor || ORANGE, 0.8 * o.glow); ctx.shadowBlur = 24 * o.glow; rrect(ctx, cx - w / 2, y, w, h, r); ctx.fillStyle = '#000'; ctx.fill(); }
  ctx.shadowColor = 'rgba(20,10,40,0.28)'; ctx.shadowBlur = 16; ctx.shadowOffsetY = 5;
  rrect(ctx, cx - w / 2, y, w, h, r); ctx.fillStyle = '#050506'; ctx.fill();
  ctx.restore();
  rrect(ctx, cx - w / 2 + 0.5, y + 0.5, w - 1, h - 1, r); ctx.strokeStyle = 'rgba(255,255,255,0.07)'; ctx.lineWidth = 0.8; ctx.stroke();
}
// Bloub's eyes inside a pill-sized island
function islandEyes(ctx, x, cy, h, t, blinks = []) {
  pauseBars(ctx, x, cy, h * 0.22, h * 0.1, h * 0.38, [246, 246, 250], blinkAt(t, blinks));
}

// --------------------------------------------------------------- bulging tile grid
function gridEdges(n) { const e = [-1, 1]; for (let i = 2; i <= n; i++) { e.unshift(-i); e.push(i); } return e; }
const GX = gridEdges(7), GY = gridEdges(5);
const gpos = (u, unit, half) => Math.sign(u) * (half + (Math.abs(u) - 1) * unit * (1 - 0.025 * (Math.abs(u) - 1)));
function roundedQuad(ctx, p, r) {
  ctx.beginPath();
  const m0 = [(p[3][0] + p[0][0]) / 2, (p[3][1] + p[0][1]) / 2];
  ctx.moveTo(m0[0], m0[1]);
  for (let i = 0; i < 4; i++) { const a = p[i], b = p[(i + 1) % 4]; ctx.arcTo(a[0], a[1], b[0], b[1], r); }
  ctx.closePath();
}
function tileGrid(ctx, grow, mask, alpha = 1) {
  if (alpha <= 0) return;
  const half = 72 * grow, unit = 88 * grow, cy = PCY + 0.5;
  const bulge = (x, y) => {
    const nx = (x - PCX) / 400, ny = (y - cy) / 220;
    return [x + (x - PCX) * 0.1 * ny * ny, y + (y - cy) * 0.3 * nx * nx];
  };
  ctx.save(); ctx.globalAlpha *= alpha; ctx.lineWidth = 1;
  for (let i = 0; i < GX.length - 1; i++) for (let j = 0; j < GY.length - 1; j++) {
    const x0 = PCX + gpos(GX[i], unit, half) + 3.5, x1 = PCX + gpos(GX[i + 1], unit, half) - 3.5;
    const y0 = cy + gpos(GY[j], unit, half) + 3.5, y1 = cy + gpos(GY[j + 1], unit, half) - 3.5;
    const mx = ((x0 + x1) / 2 - PCX) / (400 * mask), my = ((y0 + y1) / 2 - cy) / (230 * mask);
    const vis = clamp(1.6 - Math.hypot(mx, my) * 1.2);
    if (vis <= 0) continue;
    const pts = [[x0, y0], [x1, y0], [x1, y1], [x0, y1]].map(([x, y]) => bulge(x, y));
    ctx.save(); ctx.globalAlpha *= vis;
    roundedQuad(ctx, pts, Math.min(14 * grow, (x1 - x0) / 3));
    ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.translate(0.6, 0.8); ctx.stroke();
    ctx.translate(-0.6, -0.8); ctx.lineWidth = 1.2; ctx.strokeStyle = 'rgba(0,0,0,0.085)'; ctx.stroke();
    ctx.restore();
  }
  ctx.restore();
}
// wordmark: a small island with eyes, "Island" bold, "for Windows"
function wordmark(ctx, x, y, size, pL = 1, pR = 1, t = 0, measureOnly = false) {
  const left = 'Island', right = 'for Windows';
  const pw = size * 1.35, ph = size * 0.66, gap = size * 0.26;
  const lw = measure(ctx, left, size, 'Inter', 700, -0.03), rw = measure(ctx, right, size, 'Inter', 400, -0.02);
  const total = pw + size * 0.28 + lw + gap + rw;
  if (measureOnly) return total;
  const nL = Math.round((left.length + 1) * pL);
  if (nL >= 1) {
    ctx.fillStyle = rgb(INK); rrect(ctx, x, y - size * 0.7, pw, ph, ph / 2); ctx.fill();
    pauseBars(ctx, x + ph / 2 + 2, y - size * 0.7 + ph / 2, ph * 0.22, ph * 0.1, ph * 0.38, [246, 246, 250], blinkAt(t, [4.9]));
  }
  if (nL > 1) text(ctx, left.slice(0, nL - 1), x + pw + size * 0.28, y, { size, weight: 700, color: INK, tracking: -0.03 });
  const nR = Math.round(right.length * pR);
  if (nR > 0) text(ctx, right.slice(0, nR), x + pw + size * 0.28 + lw + gap, y, { size, weight: 400, color: INK, tracking: -0.02 });
  return total;
}
