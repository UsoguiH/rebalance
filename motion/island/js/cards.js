'use strict';
// The three dashboard cards (plan limit, agent, weekly usage), drawn in their
// own local px at "page" size, the size they have once docked in the window.
// Slot names (revenue / course / chart) follow the Base 44 choreography.
//   revenue 159×159   course 116×174   chart 165×171
// tint: 0 = glass flash, 1 = violet, 2 = the island's black

const CARD = { revenue: [159, 159], course: [116, 174], chart: [165, 171] };

function tintFill(tint, dark) {
  // glass → violet → the island's black panels
  if (tint <= 1) {
    const a = mix([255, 255, 255], [184, 168, 255], tint);
    const b = mix([250, 248, 255], [126, 104, 244], tint);
    return [a, b];
  }
  const k = clamp(tint - 1);
  return [mix([150, 132, 252], dark[0], E.inQ(k)), mix([112, 90, 236], dark[1], E.inQ(k))];
}
function cardBody(ctx, w, h, r, tint, dark, alpha = 1, rim = 0) {
  const [c0, c1] = tintFill(tint, dark);
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, rgb(c0, alpha)); g.addColorStop(1, rgb(c1, alpha));
  ctx.save();
  if (tint >= 1.6) { ctx.shadowColor = 'rgba(0,0,0,0.25)'; ctx.shadowBlur = 10; ctx.shadowOffsetY = 3; }
  rrect(ctx, 0, 0, w, h, r); ctx.fillStyle = g; ctx.fill();
  ctx.restore();
  if (tint < 0.8 && rim) { // glass flash: yellow rim
    ctx.save(); ctx.globalAlpha = (1 - tint / 0.8) * rim;
    rrect(ctx, 1.5, 1.5, w - 3, h - 3, r); ctx.strokeStyle = '#b6a8ff'; ctx.lineWidth = 3; ctx.stroke();
    ctx.restore();
  }
}
function zigzag(ctx, x, y, s, col, lw = 1.2) {
  ctx.save(); ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(x, y + s * 0.55); ctx.lineTo(x + s * 0.35, y + s * 0.15); ctx.lineTo(x + s * 0.55, y + s * 0.4); ctx.lineTo(x + s, y); ctx.stroke();
  ctx.restore();
}
const fmtMoney = v => '$' + Math.round(v);

// "revenue" slot → plan-limit card: the 5-hour limit counts up to 47%
function drawRevenueCard(ctx, o) {
  const [w, h] = CARD.revenue, tint = o.tint ?? 2, ca = o.content ?? 1;
  cardBody(ctx, w, h, 14, tint, [[24, 23, 30], [12, 12, 16]], tint < 0.8 ? 0.7 : 1);
  const ink = tint >= 1.5 ? [242, 242, 247] : [255, 255, 255];
  const pct = Math.round((o.value ?? 14250) / 14250 * 47);
  ctx.save(); ctx.globalAlpha *= ca;
  text(ctx, '5-hour limit', w / 2, 27, { size: 13.5, weight: 500, color: ink, align: 'center' });
  text(ctx, pct + '%', w / 2, 96, { size: 50, weight: 600, family: 'Inter Tight', color: ink, align: 'center', tracking: -0.03 });
  ctx.globalAlpha *= clamp(tint - 1.2);
  // usage bar
  rrect(ctx, 20, 113, w - 40, 5, 2.5); ctx.fillStyle = 'rgba(255,255,255,0.1)'; ctx.fill();
  const g = ctx.createLinearGradient(20, 0, w - 20, 0); g.addColorStop(0, '#5e5ce6'); g.addColorStop(1, '#bf5af2');
  rrect(ctx, 20, 113, (w - 40) * pct / 100, 5, 2.5); ctx.fillStyle = g; ctx.fill();
  text(ctx, 'weekly 63%', 20, 138, { size: 7.4, weight: 500, color: '#a99cff' });
  text(ctx, 'resets in 2h 14m', w - 20, 138, { size: 7.4, color: [140, 138, 156], align: 'right' });
  ctx.restore();
}

// "course" slot → agent card: a blue Bloub hard at work on aurora-web
function agentArt(ctx, x, y, w, h, tint, t) {
  ctx.save();
  ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
  const bg = ctx.createLinearGradient(0, y, 0, y + h);
  bg.addColorStop(0, '#16161d'); bg.addColorStop(1, '#0d0d12');
  ctx.fillStyle = bg; ctx.fillRect(x, y, w, h);
  const cx = x + w / 2, cy = y + h * 0.55, r = w * 0.3;
  const halo = ctx.createRadialGradient(cx, cy, r * 0.8, cx, cy, r * 1.45);
  halo.addColorStop(0, 'rgba(40,110,255,0.35)'); halo.addColorStop(1, 'rgba(40,110,255,0)');
  ctx.fillStyle = halo; ctx.fillRect(x, y, w, h);
  const blink = ((t || 0) % 2.6) > 2.45 ? 1 : 0;
  bloub(ctx, cx, cy, r, { body: [52, 128, 255], eye: '#0b1530', look: [0.5, 0.1], blink, rim: false });
  // "•••" bubble
  const bx = cx - r * 1.05, by = cy - r * 0.95;
  rrect(ctx, bx, by, r * 0.85, r * 0.5, r * 0.25); ctx.fillStyle = '#2f7cf6'; ctx.fill();
  ctx.strokeStyle = '#0d0d12'; ctx.lineWidth = 1.2; ctx.stroke();
  ctx.fillStyle = '#fff';
  for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(bx + r * (0.2 + i * 0.22), by + r * 0.25, r * 0.065, 0, TAU); ctx.fill(); }
  ctx.restore();
}
function courseArt(ctx, x, y, w, h, tint, t) { agentArt(ctx, x, y, w, h, tint, t); }
function drawCourseCard(ctx, o) {
  const [w, h] = CARD.course, tint = o.tint ?? 2, ca = o.content ?? 1;
  cardBody(ctx, w, h, 8, tint, [[22, 22, 28], [12, 12, 16]], tint < 0.8 ? 0.85 : 1, 1);
  const ix = 4, iy = 3.5, iw = w - 8, ih = h * 0.64;
  if (tint < 1) {
    ctx.save(); rrect(ctx, ix, iy, iw, ih, 5); ctx.fillStyle = '#ffffff'; ctx.fill(); ctx.restore();
  } else {
    ctx.save(); rrect(ctx, ix, iy, iw, ih, 5); ctx.clip();
    courseArt(ctx, ix, iy, iw, ih, tint, o.t);
    const glare = 1 - seg(tint, 1.05, 1.7);
    if (glare > 0) { ctx.globalAlpha = glare * 0.75; ctx.fillStyle = '#e6e0ff'; ctx.fillRect(ix, iy, iw, ih); }
    ctx.restore();
  }
  ctx.save(); ctx.globalAlpha *= ca;
  text(ctx, 'aurora-web', 6, h * 0.735, { size: 11, weight: 600, color: [242, 242, 247] });
  text(ctx, 'working…', w - 5, h * 0.735, { size: 7.4, weight: 500, color: '#4aa3ff', align: 'right' });
  ctx.globalAlpha *= clamp(tint - 1.3);
  text(ctx, 'Dark mode for the settings page', 6, h * 0.8, { size: 4.6, color: [150, 148, 166] });
  rrect(ctx, 6, h * 0.835, 40, 2.6, 1.3); ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.fill();
  rrect(ctx, 6, h * 0.835, 32, 2.6, 1.3); ctx.fillStyle = '#30d158'; ctx.fill();
  text(ctx, '4 of 5 · opus · 82k context', 50, h * 0.85, { size: 3.9, color: [130, 128, 146] });
  ctx.restore();
}

const CHART_PTS = [[0.14, 0.81], [0.22, 0.72], [0.31, 0.665], [0.4, 0.7], [0.5, 0.64], [0.58, 0.6], [0.66, 0.53], [0.73, 0.47], [0.79, 0.4], [0.83, 0.33], [0.865, 0.24]];
function chartPath(w, h, upTo) {
  const pts = CHART_PTS.map(([x, y]) => [x * w, y * h]);
  const n = Math.max(2, Math.ceil(upTo * (pts.length - 1)) + 1);
  const out = pts.slice(0, n);
  if (upTo < 1) { // trim the last segment
    const f = upTo * (pts.length - 1) - (n - 2);
    const a = pts[n - 2], b = pts[n - 1];
    out[n - 1] = [lerp(a[0], b[0], f), lerp(a[1], b[1], f)];
  }
  return out;
}
function smoothLine(ctx, pts) {
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length - 1; i++) {
    const mx = (pts[i][0] + pts[i + 1][0]) / 2, my = (pts[i][1] + pts[i + 1][1]) / 2;
    ctx.quadraticCurveTo(pts[i][0], pts[i][1], mx, my);
  }
  const l = pts[pts.length - 1]; ctx.lineTo(l[0], l[1]);
}
function drawChartCard(ctx, o) {
  const [w, h] = CARD.chart, tint = o.tint ?? 2, ca = o.content ?? 1, draw = o.draw ?? 1;
  cardBody(ctx, w, h, 12, tint, [[22, 22, 28], [12, 12, 16]], tint < 0.8 ? 0.6 : 1, 0.35);
  ctx.save(); ctx.globalAlpha *= ca;
  const lab = tint >= 1.5 ? [232, 230, 240] : [255, 255, 255];
  text(ctx, 'Tokens this week', 6.5, 17, { size: 5.1, family: 'DM Mono', color: lab, tracking: 0.04 });
  zigzag(ctx, w * 0.77, 9.5, 12, '#a99cff', 0.9);
  text(ctx, '+18%', w * 0.85, 11, { size: 3.2, color: '#a99cff' });
  const dim = rgb(tint >= 1.5 ? [96, 94, 112] : [236, 230, 255], tint >= 1.5 ? 1 : 0.7);
  [['2M', 0.22], ['1M', 0.42], ['500k', 0.61], ['0', 0.8]].forEach(([s, v]) => text(ctx, s, 6.5, h * v, { size: 4.8, color: dim }));
  ['mon', 'tue', 'wed', 'thu', 'fri', 'sat'].forEach((s, i) => text(ctx, s, w * (0.15 + i * 0.14), h * 0.93, { size: 5.4, color: dim, align: 'center' }));
  ctx.restore();
  if (draw > 0) {
    const pts = chartPath(w, h, draw);
    const last = pts[pts.length - 1];
    // area fill
    ctx.save();
    ctx.beginPath(); smoothLine(ctx, pts); ctx.lineTo(last[0], h * 0.86); ctx.lineTo(pts[0][0], h * 0.86); ctx.closePath();
    const g = ctx.createLinearGradient(w * 0.3, 0, w * 0.88, 0);
    g.addColorStop(0, 'rgba(94,92,230,0)'); g.addColorStop(0.55, 'rgba(110,96,240,0.5)'); g.addColorStop(1, 'rgba(191,90,242,0.95)');
    ctx.fillStyle = g; ctx.fill();
    const v = ctx.createLinearGradient(0, h * 0.3, 0, h * 0.86);
    v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, rgb(tintFill(tint, [[22, 22, 28], [12, 12, 16]])[1], 0.9));
    ctx.fillStyle = v; ctx.fill();
    // line: orange → white toward the top end
    ctx.beginPath(); smoothLine(ctx, pts);
    const lg = ctx.createLinearGradient(w * 0.14, 0, w * 0.87, 0);
    lg.addColorStop(0, '#5e5ce6'); lg.addColorStop(0.7, '#bf5af2'); lg.addColorStop(1, '#ffffff');
    ctx.strokeStyle = tint < 1.5 ? 'rgba(255,240,220,0.9)' : lg; ctx.lineWidth = 1.4; ctx.lineCap = 'round'; ctx.stroke();
    ctx.restore();
  }
}

// place a card: centre (cx, cy), uniform scale, rotation
function placeCard(ctx, kind, cx, cy, s, rot, o) {
  const [w, h] = CARD[kind];
  ctx.save();
  ctx.translate(cx, cy); ctx.rotate(rot || 0); ctx.scale(s, s); ctx.translate(-w / 2, -h / 2);
  if (o.alpha !== undefined) ctx.globalAlpha *= o.alpha;
  ({ revenue: drawRevenueCard, course: drawCourseCard, chart: drawChartCard })[kind](ctx, o);
  ctx.restore();
}
