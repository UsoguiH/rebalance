'use strict';
// The three dashboard cards, drawn in their own local px at "page" size
// (the size they have once docked in the CreatorHub window at 9.33s).
//   revenue 159×159   course 116×174   chart 165×171
// tint: 0 = glass/yellow flash, 1 = orange, 2 = final dark

const CARD = { revenue: [159, 159], course: [116, 174], chart: [165, 171] };

function tintFill(tint, dark) {
  // dark = [topColour, bottomColour] of the final card
  if (tint <= 1) {
    const a = mix([255, 255, 250], [244, 178, 112], tint);
    const b = mix([255, 252, 236], [238, 120, 52], tint);
    return [a, b];
  }
  const k = clamp(tint - 1);
  return [mix([236, 116, 50], dark[0], E.inQ(k)), mix([232, 96, 36], dark[1], E.inQ(k))];
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
    rrect(ctx, 1.5, 1.5, w - 3, h - 3, r); ctx.strokeStyle = '#eef25a'; ctx.lineWidth = 3; ctx.stroke();
    ctx.restore();
  }
}
function zigzag(ctx, x, y, s, col, lw = 1.2) {
  ctx.save(); ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(x, y + s * 0.55); ctx.lineTo(x + s * 0.35, y + s * 0.15); ctx.lineTo(x + s * 0.55, y + s * 0.4); ctx.lineTo(x + s, y); ctx.stroke();
  ctx.restore();
}
const fmtMoney = v => '$' + Math.round(v);

function drawRevenueCard(ctx, o) {
  const [w, h] = CARD.revenue, tint = o.tint ?? 2, ca = o.content ?? 1;
  cardBody(ctx, w, h, 11, tint, [[42, 38, 37], [64, 24, 8]], tint < 0.8 ? 0.7 : 1);
  const ink = tint >= 1.5 ? [236, 228, 222] : mix([255, 240, 225], [236, 228, 222], clamp(tint - 1));
  ctx.save(); ctx.globalAlpha *= ca;
  text(ctx, 'Total revenue', w / 2, 27, { size: 17.5, family: 'Instrument Serif', color: ink, align: 'center' });
  text(ctx, fmtMoney(o.value ?? 14250), w / 2, 99, { size: 50, family: 'Instrument Serif', color: ink, align: 'center', tracking: -0.04 });
  ctx.globalAlpha *= clamp(tint - 1.2);
  zigzag(ctx, 21, 129, 18, '#e8722c', 1.3);
  text(ctx, '+23%', 44, 128, { size: 5.3, color: '#e8722c' });
  text(ctx, 'vs last month', 63, 140, { size: 8.4, color: [150, 128, 118] });
  ctx.restore();
}

// Stylised render for the course thumbnail: white plinth, tilted white
// panels and a glossy orange play triangle.
function courseArt(ctx, x, y, w, h, tint) {
  ctx.save();
  ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
  const bg = ctx.createLinearGradient(0, y, 0, y + h);
  bg.addColorStop(0, '#f7f6f4'); bg.addColorStop(1, '#e9e6e2');
  ctx.fillStyle = bg; ctx.fillRect(x, y, w, h);
  if (tint >= 0.9) {
    const k = clamp(tint - 0.9);
    ctx.globalAlpha = k;
    const X = u => x + u * w, Y = v => y + v * h;
    // plinth
    ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.moveTo(X(0.1), Y(0.78)); ctx.lineTo(X(0.55), Y(0.7)); ctx.lineTo(X(0.92), Y(0.78)); ctx.lineTo(X(0.5), Y(0.88)); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#dedad6'; ctx.beginPath(); ctx.moveTo(X(0.1), Y(0.78)); ctx.lineTo(X(0.5), Y(0.88)); ctx.lineTo(X(0.5), Y(0.93)); ctx.lineTo(X(0.1), Y(0.83)); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#cfcac5'; ctx.beginPath(); ctx.moveTo(X(0.5), Y(0.88)); ctx.lineTo(X(0.92), Y(0.78)); ctx.lineTo(X(0.92), Y(0.83)); ctx.lineTo(X(0.5), Y(0.93)); ctx.closePath(); ctx.fill();
    // stacked thin slabs on the left
    for (let i = 0; i < 3; i++) { ctx.fillStyle = i % 2 ? '#e4e0dc' : '#ffffff'; ctx.fillRect(X(0.08), Y(0.62 + i * 0.035), w * 0.28, h * 0.03); }
    // tilted back panels
    ctx.fillStyle = '#fbfaf9'; ctx.beginPath(); ctx.moveTo(X(0.45), Y(0.2)); ctx.lineTo(X(0.82), Y(0.14)); ctx.lineTo(X(0.86), Y(0.7)); ctx.lineTo(X(0.5), Y(0.74)); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#e6e2de'; ctx.beginPath(); ctx.moveTo(X(0.82), Y(0.14)); ctx.lineTo(X(0.9), Y(0.2)); ctx.lineTo(X(0.92), Y(0.72)); ctx.lineTo(X(0.86), Y(0.7)); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.08)'; ctx.lineWidth = 0.6; ctx.beginPath(); ctx.moveTo(X(0.66), Y(0.17)); ctx.lineTo(X(0.69), Y(0.72)); ctx.stroke();
    // play triangle
    const g = ctx.createLinearGradient(X(0.25), Y(0.25), X(0.7), Y(0.6));
    g.addColorStop(0, '#f8c832'); g.addColorStop(0.55, '#f39226'); g.addColorStop(1, '#ec5a1e');
    ctx.fillStyle = g; ctx.shadowColor = 'rgba(240,110,30,0.35)'; ctx.shadowBlur = 6;
    ctx.beginPath(); ctx.moveTo(X(0.3), Y(0.24)); ctx.lineTo(X(0.72), Y(0.45)); ctx.lineTo(X(0.32), Y(0.66)); ctx.closePath(); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.beginPath(); ctx.moveTo(X(0.3), Y(0.24)); ctx.lineTo(X(0.5), Y(0.34)); ctx.lineTo(X(0.31), Y(0.42)); ctx.closePath(); ctx.fill();
  }
  ctx.restore();
}
function drawCourseCard(ctx, o) {
  const [w, h] = CARD.course, tint = o.tint ?? 2, ca = o.content ?? 1;
  cardBody(ctx, w, h, 4, tint, [[30, 21, 15], [24, 16, 11]], tint < 0.8 ? 0.85 : 1, 1);
  const ix = 4, iy = 3.5, iw = w - 8, ih = h * 0.64;
  if (tint < 1) { // glass phase: white panel with yellow frame
    ctx.save(); rrect(ctx, ix, iy, iw, ih, 2); ctx.fillStyle = '#ffffff'; ctx.fill(); ctx.restore();
  } else {
    courseArt(ctx, ix, iy, iw, ih, tint);
    const glare = 1 - seg(tint, 1.05, 1.7); // over-exposed while the cards are still hot
    if (glare > 0) { ctx.save(); ctx.globalAlpha = glare * 0.75; ctx.fillStyle = '#fbf3a8'; ctx.fillRect(ix, iy, iw, ih); ctx.restore(); }
  }
  ctx.save(); ctx.globalAlpha *= ca;
  const ink = [240, 232, 226];
  text(ctx, 'Digital Course', 6, h * 0.735, { size: 14.2, family: 'Instrument Serif', color: ink, tracking: -0.01 });
  text(ctx, '$' + Math.round(o.price ?? 99), w - 4, h * 0.735, { size: 14.2, family: 'Instrument Serif', color: ink, align: 'right' });
  ctx.globalAlpha *= clamp(tint - 1.3);
  text(ctx, 'Master modern skills with 40+ video lessons,', 6, h * 0.79, { size: 3.6, color: [150, 140, 134] });
  text(ctx, 'templates, and lifetime access.', 6, h * 0.835, { size: 3.6, color: [150, 140, 134] });
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
  cardBody(ctx, w, h, 9, tint, [[39, 38, 38], [36, 34, 34]], tint < 0.8 ? 0.6 : 1, 0.35);
  ctx.save(); ctx.globalAlpha *= ca;
  const lab = tint >= 1.5 ? [232, 228, 226] : [255, 236, 220];
  text(ctx, 'Last 7 months performance', 6.5, 17, { size: 5.1, family: 'DM Mono', color: lab, tracking: 0.04 });
  zigzag(ctx, w * 0.77, 9.5, 12, '#e8722c', 0.9);
  text(ctx, '+23%', w * 0.85, 11, { size: 3.2, color: '#e8722c' });
  const dim = rgb(tint >= 1.5 ? [92, 88, 86] : [255, 220, 190], tint >= 1.5 ? 1 : 0.7);
  [['$15k', 0.22], ['$10k', 0.42], ['$5k', 0.61], ['$0', 0.8]].forEach(([s, v]) => text(ctx, s, 6.5, h * v, { size: 5.6, family: 'Instrument Serif', color: dim }));
  ['jan', 'feb', 'mar', 'apr', 'may', 'jun'].forEach((s, i) => text(ctx, s, w * (0.15 + i * 0.14), h * 0.93, { size: 6.4, family: 'Instrument Serif', color: dim, align: 'center' }));
  ctx.restore();
  if (draw > 0) {
    const pts = chartPath(w, h, draw);
    const last = pts[pts.length - 1];
    // area fill
    ctx.save();
    ctx.beginPath(); smoothLine(ctx, pts); ctx.lineTo(last[0], h * 0.86); ctx.lineTo(pts[0][0], h * 0.86); ctx.closePath();
    const g = ctx.createLinearGradient(w * 0.3, 0, w * 0.88, 0);
    g.addColorStop(0, 'rgba(232,96,30,0)'); g.addColorStop(0.55, 'rgba(232,96,30,0.45)'); g.addColorStop(1, 'rgba(240,110,36,0.95)');
    ctx.fillStyle = g; ctx.fill();
    const v = ctx.createLinearGradient(0, h * 0.3, 0, h * 0.86);
    v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, rgb(tintFill(tint, [[39, 38, 38], [36, 34, 34]])[1], 0.9));
    ctx.fillStyle = v; ctx.fill();
    // line: orange → white toward the top end
    ctx.beginPath(); smoothLine(ctx, pts);
    const lg = ctx.createLinearGradient(w * 0.14, 0, w * 0.87, 0);
    lg.addColorStop(0, '#e8641e'); lg.addColorStop(0.7, '#f08a40'); lg.addColorStop(1, '#ffffff');
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
