'use strict';
// Island versions of the study's stand-ins. These load after the scene files
// and replace their photo, call-tile and snippet drawings, and add the ending.

// "photos" become Island moments: Bloub celebrating, and the agent team
const MOMENT_LOOK = ['lilac', 'streak', 'violet', 'mist', 'teal'];
function photo(ctx, i, x, y, w, h, o = {}) {
  ctx.save(); ctx.globalAlpha *= o.alpha ?? 1;
  rrect(ctx, x, y, w, h, o.r ?? 3); ctx.clip();
  ctx.drawImage(gradImage(MOMENT_LOOK[i % MOMENT_LOOK.length], 300, 300), x, y, w, h);
  const r = Math.min(w, h) * 0.27, cx = x + w / 2, cy = y + h * 0.54;
  if (i === 0) { // Bloub leaps out of the island: "I'm done!"
    ctx.fillStyle = 'rgba(40,20,80,0.12)'; ctx.beginPath(); ctx.ellipse(cx, cy + r * 1.15, r * 0.9, r * 0.16, 0, 0, TAU); ctx.fill();
    bloub(ctx, cx, cy, r, { look: [0.5, -0.1] });
    ctx.fillStyle = rgb(GREEN); ctx.beginPath(); ctx.arc(cx - r * 0.72, cy - r * 0.72, r * 0.24, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = r * 0.06; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(cx - r * 0.82, cy - r * 0.72); ctx.lineTo(cx - r * 0.74, cy - r * 0.63); ctx.lineTo(cx - r * 0.6, cy - r * 0.82); ctx.stroke();
    ctx.fillStyle = '#fff'; rrect(ctx, cx + r * 0.3, cy - r * 1.55, r * 1.55, r * 0.5, r * 0.25); ctx.fill();
    text(ctx, 'I’m done!', cx + r * 1.07, cy - r * 1.2, { size: r * 0.27, weight: 600, color: [30, 28, 40], align: 'center' });
    const rr = mulberry32(5);
    for (let k = 0; k < 18; k++) { ctx.fillStyle = rgb(k % 2 ? AGENTS[0].body : [255, 255, 255]); ctx.fillRect(x + rr() * w, y + rr() * h * 0.6, 2.4, 1.4); }
  } else {
    const ag = AGENTS[(i - 1) % AGENTS.length];
    const g = ctx.createRadialGradient(cx, cy + r * 0.2, 2, cx, cy + r * 0.2, r * 2); g.addColorStop(0, rgb(ag.body, 0.45)); g.addColorStop(1, rgb(ag.body, 0));
    ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
    bloub(ctx, cx, cy, r, { body: ag.body, look: [Math.sin(i * 2) * 0.6, 0.2] });
    text(ctx, ag.name, cx, y + h - 7, { size: Math.max(5, h * 0.07), weight: 500, color: [255, 255, 255], align: 'center' });
  }
  if (o.tint) { ctx.fillStyle = rgb([150, 130, 230], o.tint * 0.5); ctx.fillRect(x, y, w, h); }
  ctx.restore();
}
// the call tile's phone becomes the now-playing button
function phoneDot(ctx, x, y, r) {
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
  pauseBars(ctx, x, y, r * 0.36, r * 0.16, r * 0.62);
}
function uiSnippet(ctx, kind, x, y, w, h) {
  if (kind === 'ui-phone') { // the expanded media island
    ctx.fillStyle = '#050506'; rrect(ctx, x, y + h * 0.1, w, h * 0.8, h * 0.22); ctx.fill();
    const s = h * 0.46;
    ctx.drawImage(gradImage('magenta', 100, 100), x + h * 0.14, y + h * 0.27, s, s);
    text(ctx, 'Midnight City', x + h * 0.14 + s + 6, y + h * 0.44, { size: h * 0.12, weight: 600, color: [246, 246, 250] });
    text(ctx, 'M83', x + h * 0.14 + s + 6, y + h * 0.6, { size: h * 0.1, color: [150, 150, 160] });
    ctx.fillStyle = 'rgba(255,255,255,0.2)'; ctx.fillRect(x + h * 0.14, y + h * 0.8, w - h * 0.28, 1.4);
    ctx.fillStyle = '#fff'; ctx.fillRect(x + h * 0.14, y + h * 0.8, (w - h * 0.28) * 0.48, 1.4);
  } else { // a tab tile: the battery ring
    ctx.fillStyle = '#0b0b0d'; rrect(ctx, x, y, w, h, 8); ctx.fill();
    const r = h * 0.26, cx = x + w * 0.3, cy = y + h * 0.55;
    ctx.lineWidth = r * 0.22; ctx.lineCap = 'round';
    ctx.strokeStyle = 'rgba(255,255,255,0.1)'; ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.stroke();
    ctx.strokeStyle = rgb(GREEN); ctx.beginPath(); ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + TAU * 0.62); ctx.stroke();
    text(ctx, '62%', x + w * 0.55, cy + h * 0.06, { size: h * 0.18, weight: 600, color: [246, 246, 250] });
    text(ctx, 'Battery', x + 6, y + h * 0.18, { size: h * 0.09, color: [140, 140, 150] });
  }
}

// ------------------------------------------------------------ ending: the sphere is Bloub
function sceneOutroIsland(ctx, t) {
  sceneOutro(ctx, Math.min(t, FR(1026)));
  if (t > FR(1026)) { // keep the grid and dots alive while the name types in
    const r2 = mulberry32(31);
    for (let i = 0; i < 20; i++) {
      const a = r2() * TAU, d = 120 + r2() * 300 + (t - FR(1026)) * 6;
      ctx.fillStyle = `rgba(20,20,20,${0.5 + 0.5 * Math.sin(t * 2 + i)})`;
      ctx.fillRect(PCX + Math.cos(a) * d - 1.2, PCY + Math.sin(a) * d * 0.6 - 1.2, 2.4, 2.4);
    }
  }
  // eyes open on the sphere
  const eyes = seg(t, FR(1009), FR(1015));
  const lift = E.ioC(seg(t, FR(1032), FR(1046)));
  const r = lerp(21, 30, lift), cx = PCX, cy = PCY - 40 * lift;
  if (lift > 0) { // the sphere rises to make room for the name
    ctx.fillStyle = 'rgb(244,243,241)'; ctx.beginPath(); ctx.arc(PCX, PCY, 23, 0, TAU); ctx.fill();
    ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.clip();
    ctx.drawImage(gradImage('magenta', 300, 200), cx - r, cy - r, 2 * r, 2 * r);
    const g = ctx.createRadialGradient(cx - r * 0.4, cy - r * 0.5, 1, cx, cy, r * 1.3);
    g.addColorStop(0, 'rgba(255,255,255,0.35)'); g.addColorStop(1, 'rgba(90,0,50,0.25)');
    ctx.fillStyle = g; ctx.fillRect(cx - r, cy - r, 2 * r, 2 * r);
    ctx.restore();
  }
  if (eyes > 0) {
    ctx.save(); ctx.globalAlpha *= eyes;
    const blink = blinkAt(t, [FR(1022), FR(1066)]);
    const look = t > FR(1050) ? [0, 0.6] : [Math.sin(t * 1.5) * 0.4, 0];
    pauseBars(ctx, cx + look[0] * 3, cy + look[1] * 3, r * 0.5, r * 0.17, r * 0.42, [20, 12, 24], blink);
    ctx.restore();
  }
  // the name, then the line under it types in
  const pL = seg(t, FR(1040), FR(1048)), pR = seg(t, FR(1043), FR(1050));
  if (pL > 0) {
    const size = 27, w = elevenMark(ctx, -1000, -1000, size, 0);
    elevenMark(ctx, PCX - w / 2, PCY + 34, size, 1, pL, pR, t);
  }
  const n = typed('end', t);
  if (n > 0) {
    const s = cueOf('end').text, size = 12, full = measure(ctx, s, size, 'Inter', 400);
    text(ctx, s.slice(0, n), PCX - full / 2, PCY + 62, { size, color: [120, 118, 130] });
    if (t < cueDone('end') + 0.15 || Math.floor(t * 2.6) % 2 === 0) {
      ctx.fillStyle = 'rgba(40,40,40,0.8)'; ctx.fillRect(PCX - full / 2 + measure(ctx, s.slice(0, n), size, 'Inter', 400) + 1.5, PCY + 51.5, 0.9, 13);
    }
  }
}
