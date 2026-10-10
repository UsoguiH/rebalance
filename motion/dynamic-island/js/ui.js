'use strict';
// Island's UI pieces (the pill and what it grows into), spring motion, typed
// captions and the shared effects. Colours and copy come from the
// dynamic-island-windows README and its GIF captures.

const AGENTS = [
  { name: 'aurora-web', body: [74, 142, 255], act: 'Editing theme.ts' },
  { name: 'pixel-api', body: [240, 82, 98], act: 'Running npm test' },
  { name: 'notes-cli', body: [142, 104, 246], act: 'Reading package.json' },
  { name: 'orbit-landing', body: [246, 104, 182], act: 'Writing Hero.tsx' },
];
const BLUE = [10, 132, 255], VIOLET = [94, 92, 230], ORANGE = [255, 159, 10], GREEN = [48, 209, 88];

// Interruptible-spring feel (SwiftUI response ~0.5, damping ~0.7): fast rise,
// one soft overshoot, settled by p = 1.
const spring = p => (p <= 0 ? 0 : p >= 1 ? 1 : 1 - Math.exp(-6.5 * p) * Math.cos(8.6 * p));
// keys: [[startTime, value], ...]; each change springs over `dur` seconds
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

function camera(ctx, fx, fy, s, cx = SW / 2, cy = SH / 2) {
  ctx.translate(cx, cy); ctx.scale(s, s); ctx.translate(-fx, -fy);
}

// The island: a black rounded shape hanging from y, centred on cx.
function island(ctx, cx, y, w, h, r, o = {}) {
  ctx.save();
  if (o.glow) { // the orange "needs you" halo
    ctx.shadowColor = rgb(o.glowColor || ORANGE, 0.75 * o.glow); ctx.shadowBlur = 22 * o.glow;
    rrect(ctx, cx - w / 2, y, w, h, r); ctx.fillStyle = '#000'; ctx.fill();
    ctx.shadowColor = 'transparent';
  }
  ctx.shadowColor = 'rgba(24,16,48,0.32)'; ctx.shadowBlur = 16; ctx.shadowOffsetY = 5;
  rrect(ctx, cx - w / 2, y, w, h, r); ctx.fillStyle = '#000'; ctx.fill();
  ctx.restore();
  ctx.save();
  rrect(ctx, cx - w / 2 + 0.5, y + 0.5, w - 1, h - 1, r);
  ctx.strokeStyle = 'rgba(255,255,255,0.07)'; ctx.lineWidth = 0.8; ctx.stroke();
  ctx.restore();
}

// Island's face: a small Bloub with a soft glint, used in the pill
function face(ctx, x, y, r, t, o = {}) {
  const blink = blinkAt(t, o.blinks || [0.9, 3.1, 5.4]);
  bloub(ctx, x, y, r, { body: o.body || [238, 238, 244], blink, look: o.look || [Math.sin(t * 1.3) * 0.5, 0] });
}
function blinkAt(t, times) {
  for (const b of times) { const d = t - b; if (d >= 0 && d < 0.16) return Math.sin((d / 0.16) * Math.PI); }
  return 0;
}

// Typed caption: letters appear in place (the line is laid out at full length)
// with a thin caret while it types and a few blinks after.
function caption(ctx, id, t, x, y, o = {}) {
  const c = cueOf(id);
  const n = typed(id, t);
  if (n <= 0 && t < c.at - 0.25) return;
  const size = o.size || 12, weight = o.weight || 500, col = o.color || [34, 30, 52];
  const full = measure(ctx, c.text, size, 'Inter', weight, -0.01);
  const x0 = o.align === 'left' ? x : x - full / 2;
  const alpha = o.alpha ?? 1;
  if (n > 0) text(ctx, c.text.slice(0, n), x0, y, { size, weight, color: col, tracking: -0.01, alpha });
  const done = cueDone(id);
  const on = t < done + 0.12 || (t < done + (o.caretFor ?? 1.4) && Math.floor((t - done) * 2.6) % 2 === 0);
  if (on && t >= c.at - 0.25) {
    const cx = x0 + measure(ctx, c.text.slice(0, n), size, 'Inter', weight, -0.01) + 1.2;
    ctx.save(); ctx.globalAlpha *= alpha; ctx.fillStyle = rgb(col, 0.9);
    ctx.fillRect(cx, y - size * 0.8, Math.max(0.7, size * 0.07), size * 0.98); ctx.restore();
  }
}

// Pointer with a press squash
function pointer(ctx, x, y, press = 0, alpha = 1) {
  ctx.save(); ctx.globalAlpha *= alpha; ctx.translate(x, y); ctx.scale(1 - press * 0.12, 1 - press * 0.12);
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, 15); ctx.lineTo(3.8, 11.5); ctx.lineTo(6.4, 17); ctx.lineTo(8.7, 16);
  ctx.lineTo(6.2, 10.6); ctx.lineTo(11, 10.6); ctx.closePath();
  ctx.shadowColor = 'rgba(0,0,0,0.3)'; ctx.shadowBlur = 4; ctx.shadowOffsetY = 1.5;
  ctx.fillStyle = '#111'; ctx.fill(); ctx.shadowColor = 'transparent';
  ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.1; ctx.lineJoin = 'round'; ctx.stroke();
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

function confetti(ctx, x, y, t, t0, col, seed = 3) {
  const p = t - t0;
  if (p < 0 || p > 1.6) return;
  const r = mulberry32(seed);
  for (let i = 0; i < 46; i++) {
    const a = -Math.PI / 2 + (r() - 0.5) * 2.6, v = 90 + r() * 120, spin = r() * 8;
    const px = x + Math.cos(a) * v * p, py = y + Math.sin(a) * v * p + 160 * p * p;
    const c = i % 3 === 0 ? [255, 255, 255] : i % 3 === 1 ? col : mix(col, [255, 220, 120], 0.6);
    ctx.save(); ctx.globalAlpha *= clamp(1.4 - p); ctx.translate(px, py); ctx.rotate(spin * p + i);
    ctx.fillStyle = rgb(c); ctx.fillRect(-2, -1, 4, 2.2); ctx.restore();
  }
}

// Dark stage with soft coloured blooms (the grid's dark scenes)
function darkStage(ctx, blooms, base = [12, 11, 16]) {
  ctx.fillStyle = rgb(base); ctx.fillRect(0, 0, SW, SH);
  for (const [x, y, r, c, a] of blooms) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, rgb(c, a)); g.addColorStop(1, rgb(c, 0));
    ctx.fillStyle = g; ctx.fillRect(0, 0, SW, SH);
  }
}

// Light studio sweep (Base 44's pale backdrop)
function lightStage(ctx) {
  const g = ctx.createLinearGradient(0, 0, 0, SH);
  g.addColorStop(0, '#f6f5f8'); g.addColorStop(0.55, '#eeedf2'); g.addColorStop(1, '#dedce6');
  ctx.fillStyle = g; ctx.fillRect(0, 0, SW, SH);
}

// Progress ring
function ring(ctx, x, y, r, p, col, w = 5, track = 'rgba(255,255,255,0.1)') {
  ctx.save(); ctx.lineCap = 'round'; ctx.lineWidth = w;
  ctx.strokeStyle = track; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.stroke();
  if (p > 0.001) { ctx.strokeStyle = rgb(col); ctx.beginPath(); ctx.arc(x, y, r, -Math.PI / 2, -Math.PI / 2 + TAU * p); ctx.stroke(); }
  ctx.restore();
}
