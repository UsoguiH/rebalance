'use strict';
// The composition's fixed chrome: a white page, the film panel, and under it
// an editor-style timeline (chapter blocks, a playhead and a waveform strip).

const P = { x: 48, y: 47, w: 787, h: 442 }; // the film panel
const PCX = P.x + P.w / 2, PCY = P.y + P.h / 2; // 441.5, 268
const CHAPTERS = [['Intro', 63, 146], ['Agents', 148, 316], ['Island', 318, 425], ['Limits', 427, 670], ['Outro', 672, 817]];
const playheadX = t => 64.5 + t * 11.09;

let WAVE = null;
function makeWave() {
  const r = mulberry32(5);
  WAVE = [];
  let k = 0;
  for (let x = 67; x < 818; x += 5.45, k++) WAVE.push([x, (k % 2 ? 0.35 : 0.75) + 0.25 * r()]);
}

let WAVE_IMG = null;
function waveImage() {
  if (WAVE_IMG) return WAVE_IMG;
  const c = document.createElement('canvas'); c.width = SW * SCALE; c.height = 44 * SCALE;
  const g = c.getContext('2d'); g.scale(SCALE, SCALE);
  g.filter = `blur(${0.6 * SCALE}px)`;
  for (const [x, v] of WAVE) {
    const h = 6 + v * 20;
    g.fillStyle = 'rgba(150,150,150,0.42)'; rrect(g, x - 1.3, 22 - h / 2, 2.6, h, 1.3); g.fill();
  }
  WAVE_IMG = c;
  return c;
}
function chrome(ctx, t) {
  // page: white above the panel, a soft grey gradient under it
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, SW, SH);
  const g = ctx.createLinearGradient(0, 489, 0, SH);
  g.addColorStop(0, '#f5f5f5'); g.addColorStop(0.35, '#eeeeee'); g.addColorStop(0.7, '#e5e5e5'); g.addColorStop(1, '#dfdfdf');
  ctx.fillStyle = g; ctx.fillRect(0, 489, SW, SH - 489);
  // chapters
  for (const [name, x0, x1] of CHAPTERS) {
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.06)'; ctx.shadowBlur = 3; ctx.shadowOffsetY = 1;
    rrect(ctx, x0 + 0.5, 526.5, x1 - x0 - 1, 48, 4);
    const bg = ctx.createLinearGradient(0, 526, 0, 575);
    bg.addColorStop(0, '#f0f0f0'); bg.addColorStop(1, '#ebebeb');
    ctx.fillStyle = bg; ctx.fill(); ctx.restore();
    rrect(ctx, x0 + 0.5, 526.5, x1 - x0 - 1, 48, 4);
    ctx.strokeStyle = 'rgba(0,0,0,0.1)'; ctx.lineWidth = 0.8; ctx.stroke();
    text(ctx, name, (x0 + x1) / 2, 556, { size: 11.5, color: [44, 44, 44], align: 'center' });
  }
  // waveform strip (static, so it is painted once and reused)
  ctx.drawImage(waveImage(), 0, 580, SW, 44);
  // playhead
  const px = playheadX(t);
  ctx.fillStyle = '#4a4a4a'; ctx.fillRect(px - 0.5, 521, 1.1, 55);
  ctx.fillStyle = '#0a0a0a'; ctx.beginPath(); ctx.moveTo(px - 7, 512); ctx.lineTo(px + 7, 512); ctx.lineTo(px, 523); ctx.closePath(); ctx.fill();
}

// Panel background used by most light scenes: warm off-white with a faint
// darker band along the bottom edge.
function panelBG(ctx, col = [246, 245, 243]) {
  ctx.fillStyle = rgb(col); ctx.fillRect(P.x, P.y, P.w, P.h);
  const g = ctx.createLinearGradient(0, P.y + P.h - 60, 0, P.y + P.h);
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.035)');
  ctx.fillStyle = g; ctx.fillRect(P.x, P.y + P.h - 60, P.w, 60);
}
function clipPanel(ctx) { ctx.beginPath(); ctx.rect(P.x, P.y, P.w, P.h); ctx.clip(); }
