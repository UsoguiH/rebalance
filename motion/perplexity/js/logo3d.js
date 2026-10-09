'use strict';
// A 3D build of the Perplexity mark. The flat mark is split into panels on
// each side of a vertical spine (the upper triangles, the wide wings and the
// lower pages); each panel is folded about the spine by its own angle, so the
// mark reads as a frontal asterisk head-on and as an open book from the side.
// Projected with perspective and drawn back to front. Two looks: 'neon' (grey
// panels, glowing white edges, used in the opening) and 'glass' (smoked
// panels, used for the end card).

// Panels on the right of the spine, in units of R (half the spine length,
// y down). The left side mirrors them. fold = angle out of the picture plane.
const LOGO_PANELS = [
  { pts: [[0, -0.4], [0.98, -0.4], [0.98, 0.36], [0.625, 0.17]], fold: -0.42 }, // wing
  { pts: [[0, -0.4], [0.625, 0.17], [0.625, 1.0], [0, 0.5]], fold: 0.42 },   // page
  { pts: [[0, -0.4], [0.625, -0.93], [0.625, -0.4]], fold: 0.18 },             // upper triangle
];
const SPINE_TOP = -1.1, SPINE_BOT = 1.0;

function logoProject(o) {
  const { cx, cy, R, rx = 0, ry = 0, rz = 0 } = o;
  const f = 4.2; // camera distance in R units
  const crx = Math.cos(rx), srx = Math.sin(rx), cry = Math.cos(ry), sry = Math.sin(ry), crz = Math.cos(rz), srz = Math.sin(rz);
  return (x, y, z) => {
    let X = x * cry + z * sry, Z = -x * sry + z * cry;          // spin about the spine
    let Y = y * crx - Z * srx; Z = y * srx + Z * crx;              // tilt toward camera
    const X2 = X * crz - Y * srz, Y2 = X * srz + Y * crz;          // roll
    const s = f / (f + Z);
    return [cx + X2 * R * s, cy + Y2 * R * s, Z];
  };
}

function drawLogo3D(ctx, o) {
  const P = logoProject(o);
  const open = o.open ?? 1;
  const fins = [];
  for (const pn of LOGO_PANELS) for (const side of [1, -1]) {
    const c = Math.cos(pn.fold), s = Math.sin(pn.fold);
    const pts = pn.pts.map(([u, v]) => P(u * c * side * open, v, u * s * open));
    const z = pts.reduce((a, p) => a + p[2], 0) / pts.length;
    fins.push({ pts, z });
  }
  fins.sort((p, q) => q.z - p.z); // far first
  const look = o.look || 'neon';
  const R = o.R;
  ctx.save();
  ctx.globalAlpha *= o.alpha ?? 1;
  ctx.lineJoin = 'round';
  const spineTop = P(0, SPINE_TOP, 0), spineBot = P(0, SPINE_BOT, 0);
  for (const fin of fins) {
    const path = new Path2D();
    fin.pts.forEach(([x, y], i) => (i ? path.lineTo(x, y) : path.moveTo(x, y)));
    path.closePath();
    const depth = clamp((fin.z + 1) / 2);
    if (look === 'neon') {
      ctx.fillStyle = rgb(mix([92, 92, 95], [58, 58, 62], depth), 0.97);
      ctx.fill(path);
      ctx.save();
      ctx.shadowColor = 'rgba(255,255,255,0.85)'; ctx.shadowBlur = R * 0.16;
      ctx.strokeStyle = rgb(mix([255, 255, 252], [214, 214, 212], depth));
      ctx.lineWidth = R * 0.075;
      ctx.stroke(path);
      ctx.restore();
    } else {
      const [x0, y0] = fin.pts[1], [x1, y1] = fin.pts[2];
      const g = ctx.createLinearGradient(x0, y0, x1, y1);
      g.addColorStop(0, rgb(mix([104, 104, 108], [66, 66, 70], depth), 0.9));
      g.addColorStop(1, rgb(mix([46, 46, 50], [34, 34, 37], depth), 0.92));
      ctx.fillStyle = g; ctx.fill(path);
      ctx.strokeStyle = rgb(mix([150, 150, 155], [80, 80, 84], depth), 0.95);
      ctx.lineWidth = Math.max(0.8, R * 0.03);
      ctx.stroke(path);
      // specular glint on the leading edge
      ctx.save(); ctx.globalAlpha *= 0.6 * (1 - depth);
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = Math.max(0.6, R * 0.02);
      ctx.beginPath(); ctx.moveTo(fin.pts[0][0], fin.pts[0][1]); ctx.lineTo(fin.pts[1][0], fin.pts[1][1]); ctx.stroke();
      ctx.restore();
    }
  }
  // spine
  ctx.save();
  if (look === 'neon') { ctx.shadowColor = 'rgba(255,255,255,0.9)'; ctx.shadowBlur = R * 0.16; ctx.strokeStyle = '#fbfbf8'; ctx.lineWidth = R * 0.075; }
  else { ctx.strokeStyle = 'rgba(150,150,156,0.95)'; ctx.lineWidth = Math.max(0.9, R * 0.04); }
  ctx.lineCap = 'butt';
  ctx.beginPath(); ctx.moveTo(spineTop[0], spineTop[1]); ctx.lineTo(spineBot[0], spineBot[1]); ctx.stroke();
  ctx.restore();
  ctx.restore();
}
