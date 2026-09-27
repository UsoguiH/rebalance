// Cel: clean cel-animation drawing kit. Brush outlines swell on the shadow side
// and thin out toward the light; fills get a hard-edged cel shadow crescent and a
// small specular highlight. Used to paint the sprite sheets and the live UI.
(function () {
  const CL = (G.cel = {});
  CL.INK = '#1b1310';
  CL.LIGHT = { x: -0.55, y: -0.83 }; // light from upper-left
  CL.jitter = 0; // tiny per-frame hand-drawn variance (baked sprites)
  let seed = 1,
    n = 0;
  CL.seed = (s) => {
    seed = s * 131.7;
    n = 0;
  };
  const jr = () => {
    n++;
    return (G.hash(seed + n * 3.17) - 0.5) * 2 * CL.jitter;
  };

  // ---------- colour helpers ----------
  const hex = (h) => {
    const v = parseInt(h.slice(1), 16);
    return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
  };
  const toHex = (r, g, b) => '#' + ((1 << 24) | (Math.round(r) << 16) | (Math.round(g) << 8) | Math.round(b)).toString(16).slice(1);
  CL.mix = (a, b, t) => {
    const A = hex(a),
      B = hex(b);
    return toHex(A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t);
  };
  // shadows shift toward a cool purple, like hand-painted cels
  CL.shade = (c, k = 0.34) => (typeof c === 'string' && c[0] === '#' && c.length === 7 ? CL.mix(c, '#2e1a3e', k) : null);
  CL.tint = (c, k = 0.45) => (typeof c === 'string' && c[0] === '#' && c.length === 7 ? CL.mix(c, '#fffdf4', k) : null);

  // ---------- geometry ----------
  // sample a smooth (midpoint-quadratic) curve through control points
  CL.smooth = (pts, closed = true, steps = 5) => {
    const out = [];
    const m = pts.length;
    if (m < 3) return pts.slice();
    const P = pts.map((p) => [p[0] + jr(), p[1] + jr()]);
    if (closed) {
      for (let i = 0; i < m; i++) {
        const a = P[(i - 1 + m) % m],
          b = P[i],
          c = P[(i + 1) % m];
        const s = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2],
          e = [(b[0] + c[0]) / 2, (b[1] + c[1]) / 2];
        for (let k = 0; k < steps; k++) {
          const t = k / steps,
            u = 1 - t;
          out.push([u * u * s[0] + 2 * u * t * b[0] + t * t * e[0], u * u * s[1] + 2 * u * t * b[1] + t * t * e[1]]);
        }
      }
    } else {
      out.push(P[0]);
      for (let i = 1; i < m - 1; i++) {
        const a = i === 1 ? P[0] : [(P[i - 1][0] + P[i][0]) / 2, (P[i - 1][1] + P[i][1]) / 2];
        const b = P[i];
        const e = i === m - 2 ? P[m - 1] : [(P[i][0] + P[i + 1][0]) / 2, (P[i][1] + P[i + 1][1]) / 2];
        for (let k = 1; k <= steps; k++) {
          const t = k / steps,
            u = 1 - t;
          out.push([u * u * a[0] + 2 * u * t * b[0] + t * t * e[0], u * u * a[1] + 2 * u * t * b[1] + t * t * e[1]]);
        }
      }
      if (m === 2) out.push(P[1]);
    }
    return out;
  };
  CL.ellipse = (cx, cy, rx, ry, rot = 0, count) => {
    const k = count || Math.max(12, Math.min(40, Math.round((rx + ry) * 0.9)));
    const cs = Math.cos(rot),
      sn = Math.sin(rot);
    const out = [];
    for (let i = 0; i < k; i++) {
      const a = (i / k) * Math.PI * 2;
      const x = Math.cos(a) * rx,
        y = Math.sin(a) * ry;
      out.push([cx + x * cs - y * sn + jr() * 0.5, cy + x * sn + y * cs + jr() * 0.5]);
    }
    return out;
  };
  const area = (p) => {
    let a = 0;
    for (let i = 0; i < p.length; i++) {
      const q = p[(i + 1) % p.length];
      a += p[i][0] * q[1] - q[0] * p[i][1];
    }
    return a / 2;
  };
  const trace = (c, poly) => {
    c.moveTo(poly[0][0], poly[0][1]);
    for (let i = 1; i < poly.length; i++) c.lineTo(poly[i][0], poly[i][1]);
    c.closePath();
  };
  CL.trace = trace;

  // ---------- brush outline of a closed polygon ----------
  // width swells on the side facing away from the light
  CL.outline = (poly, w = 3, color = CL.INK) => {
    const c = G.ctx;
    const m = poly.length;
    if (m < 3 || w <= 0) return;
    const dir = area(poly) > 0 ? 1 : -1;
    const outer = [],
      inner = [];
    for (let i = 0; i < m; i++) {
      const a = poly[(i - 1 + m) % m],
        b = poly[(i + 1) % m];
      let tx = b[0] - a[0],
        ty = b[1] - a[1];
      const l = Math.hypot(tx, ty) || 1;
      tx /= l;
      ty /= l;
      // outward normal
      const nx = ty * dir,
        ny = -tx * dir;
      const dark = Math.max(0, -(nx * CL.LIGHT.x + ny * CL.LIGHT.y));
      const ww = w * (0.5 + 0.85 * dark);
      outer.push([poly[i][0] + nx * ww * 0.55, poly[i][1] + ny * ww * 0.55]);
      inner.push([poly[i][0] - nx * ww * 0.45, poly[i][1] - ny * ww * 0.45]);
    }
    c.beginPath();
    trace(c, outer);
    trace(c, inner.reverse());
    c.fillStyle = color;
    c.fill('evenodd');
  };

  // ---------- filled cel shape ----------
  // o: {lw, shade (colour|false), cast (0..1 size of shadow), hl, line}
  CL.fill = (poly, base, o = {}) => {
    const c = G.ctx;
    if (base) {
      c.beginPath();
      trace(c, poly);
      c.fillStyle = base;
      c.fill();
      const sh = o.shade === false ? null : o.shade || CL.shade(base);
      if (sh) {
        // hard cel shadow: shape minus a copy nudged toward the light
        let minx = 1e9,
          maxx = -1e9,
          miny = 1e9,
          maxy = -1e9;
        poly.forEach((p) => {
          minx = Math.min(minx, p[0]);
          maxx = Math.max(maxx, p[0]);
          miny = Math.min(miny, p[1]);
          maxy = Math.max(maxy, p[1]);
        });
        const k = o.cast == null ? 0.2 : o.cast;
        const cd = o.castDir || [1, 1];
        const dx = (maxx - minx) * k * cd[0],
          dy = (maxy - miny) * k * cd[1];
        c.save();
        c.beginPath();
        trace(c, poly);
        c.clip();
        c.fillStyle = sh;
        c.fillRect(minx - 2, miny - 2, maxx - minx + 4, maxy - miny + 4);
        c.beginPath();
        c.moveTo(poly[0][0] + CL.LIGHT.x * dx, poly[0][1] + CL.LIGHT.y * dy);
        for (let i = 1; i < poly.length; i++) c.lineTo(poly[i][0] + CL.LIGHT.x * dx, poly[i][1] + CL.LIGHT.y * dy);
        c.closePath();
        c.fillStyle = base;
        c.fill();
        if (o.hl !== false) {
          const hx = minx + (maxx - minx) * 0.3,
            hy = miny + (maxy - miny) * 0.24;
          const hw = (maxx - minx) * 0.13,
            hh = (maxy - miny) * 0.08;
          if (hw > 1.2) {
            c.fillStyle = 'rgba(255,255,250,0.75)';
            c.beginPath();
            c.ellipse(hx, hy, hw, Math.max(1, hh), -0.5, 0, Math.PI * 2);
            c.fill();
          }
        }
        c.restore();
      }
    }
    if (o.lw !== 0) CL.outline(poly, o.lw || 3, o.line || CL.INK);
  };
  CL.shape = (pts, base, o = {}) => {
    const poly = o.sharp ? pts.map((p) => [p[0] + jr(), p[1] + jr()]) : CL.smooth(pts, true, o.steps || 5);
    CL.fill(poly, base, o);
    return poly;
  };
  CL.oval = (cx, cy, rx, ry, base, o = {}) => {
    const poly = CL.ellipse(cx, cy, rx, ry, o.rot || 0);
    CL.fill(poly, base, o);
    return poly;
  };
  CL.round = (x, y, w, h, r, base, o = {}) => {
    r = Math.min(r, w / 2, h / 2);
    const pts = [];
    const corner = (cx, cy, a0) => {
      for (let i = 0; i <= 4; i++) {
        const a = a0 + (i / 4) * (Math.PI / 2);
        pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
      }
    };
    corner(x + w - r, y + r, -Math.PI / 2);
    corner(x + w - r, y + h - r, 0);
    corner(x + r, y + h - r, Math.PI / 2);
    corner(x + r, y + r, Math.PI);
    const poly = pts.map((p) => [p[0] + jr() * 0.6, p[1] + jr() * 0.6]);
    CL.fill(poly, base, o);
    return poly;
  };

  // ---------- open brush stroke with tapered ends ----------
  CL.stroke = (pts, w = 3, color = CL.INK, o = {}) => {
    const c = G.ctx;
    const P = o.raw ? pts : CL.smooth(pts, false, o.steps || 6);
    const m = P.length;
    if (m < 2) return;
    const t0 = o.taper == null ? 0.35 : o.taper,
      t1 = o.taperEnd == null ? t0 : o.taperEnd;
    const L = [],
      R = [];
    for (let i = 0; i < m; i++) {
      const a = P[Math.max(0, i - 1)],
        b = P[Math.min(m - 1, i + 1)];
      let tx = b[0] - a[0],
        ty = b[1] - a[1];
      const l = Math.hypot(tx, ty) || 1;
      tx /= l;
      ty /= l;
      const u = i / (m - 1);
      let prof = 1;
      if (t0 > 0 && u < t0) prof = 0.25 + 0.75 * Math.sin((u / t0) * Math.PI * 0.5);
      if (t1 > 0 && u > 1 - t1) prof = Math.min(prof, 0.25 + 0.75 * Math.sin(((1 - u) / t1) * Math.PI * 0.5));
      const ww = (w * prof) / 2;
      L.push([P[i][0] - ty * ww, P[i][1] + tx * ww]);
      R.push([P[i][0] + ty * ww, P[i][1] - tx * ww]);
    }
    c.beginPath();
    c.moveTo(L[0][0], L[0][1]);
    for (let i = 1; i < m; i++) c.lineTo(L[i][0], L[i][1]);
    for (let i = m - 1; i >= 0; i--) c.lineTo(R[i][0], R[i][1]);
    c.closePath();
    c.fillStyle = color;
    c.fill();
    if (o.cap) {
      c.beginPath();
      c.arc(P[0][0], P[0][1], w / 2, 0, Math.PI * 2);
      c.arc(P[m - 1][0], P[m - 1][1], w / 2, 0, Math.PI * 2);
      c.fill();
    }
  };

  // rubber-hose limb: uniform ink tube with round caps, bending by `bend`
  CL.hose = (x1, y1, x2, y2, bend = 0, w = 4.5, color = CL.INK) => {
    const mx = (x1 + x2) / 2,
      my = (y1 + y2) / 2;
    const dx = x2 - x1,
      dy = y2 - y1;
    const l = Math.hypot(dx, dy) || 1;
    const cx = mx + (-dy / l) * bend,
      cy = my + (dx / l) * bend;
    CL.stroke([[x1, y1], [cx, cy], [x2, y2]], w, color, { taper: 0, cap: true, steps: 8 });
  };

  // ---------- character parts ----------
  // Four-finger cartoon glove. pose: fist | point | open | flat | grab
  CL.glove = (x, y, s = 8, rot = 0, pose = 'fist', flip = 1) => {
    const c = G.ctx;
    c.save();
    c.translate(x, y);
    c.rotate(rot);
    c.scale(1, flip);
    const W = CL.gloveColor || '#fffdf6';
    const lw = Math.max(1.8, s * 0.3);
    if (pose === 'point') {
      CL.shape([[s * 0.2, -s * 0.5], [s * 1.9, -s * 0.42], [s * 2.05, -s * 0.1], [s * 1.9, s * 0.2], [s * 0.2, s * 0.25]], W, { lw, cast: 0.35 });
      CL.stroke([[s * 1.55, -s * 0.38], [s * 1.6, s * 0.14]], s * 0.14, CL.INK, { taper: 0.4 });
    }
    if (pose === 'open' || pose === 'flat') {
      for (let i = 0; i < 4; i++) {
        const a = -0.75 + i * 0.5;
        const len = pose === 'flat' ? 1.5 : 1.35;
        CL.shape([[Math.cos(a) * s * 0.6, Math.sin(a) * s * 0.6 - s * 0.18], [Math.cos(a) * s * (len + 0.5), Math.sin(a) * s * (len + 0.5) - s * 0.25], [Math.cos(a + 0.2) * s * (len + 0.55), Math.sin(a + 0.2) * s * (len + 0.55)], [Math.cos(a + 0.28) * s * 0.6, Math.sin(a + 0.28) * s * 0.6 + s * 0.15]], W, { lw: lw * 0.85, cast: 0.3, hl: false });
      }
    }
    // palm / knuckles
    const kn = pose === 'fist' || pose === 'grab';
    CL.shape(
      kn
        ? [[-s * 0.7, -s * 0.75], [s * 0.35, -s * 0.95], [s * 1.05, -s * 0.55], [s * 1.12, s * 0.35], [s * 0.6, s * 0.9], [-s * 0.55, s * 0.8], [-s * 0.95, 0]]
        : [[-s * 0.7, -s * 0.7], [s * 0.45, -s * 0.8], [s * 0.85, 0], [s * 0.45, s * 0.75], [-s * 0.6, s * 0.72], [-s * 0.9, 0]],
      W,
      { lw, cast: 0.3 }
    );
    if (kn) {
      for (let i = 0; i < 3; i++) CL.stroke([[s * 0.55, -s * 0.55 + i * s * 0.42], [s * 1.02, -s * 0.52 + i * s * 0.42]], s * 0.13, CL.INK, { taper: 0.5 });
    }
    // thumb
    CL.shape([[-s * 0.25, -s * 0.55], [s * 0.2, -s * 1.3], [s * 0.6, -s * 1.15], [s * 0.35, -s * 0.45]], W, { lw: lw * 0.9, cast: 0.3, hl: false });
    // back-of-hand stitching
    CL.stroke([[-s * 0.35, -s * 0.25], [-s * 0.05, -s * 0.3]], s * 0.12, CL.INK, { taper: 0.5 });
    CL.stroke([[-s * 0.35, s * 0.2], [-s * 0.05, s * 0.18]], s * 0.12, CL.INK, { taper: 0.5 });
    // rolled cuff
    CL.shape([[-s * 0.75, -s * 0.85], [-s * 1.45, -s * 0.72], [-s * 1.5, s * 0.72], [-s * 0.75, s * 0.85], [-s * 0.95, 0]], W, { lw: lw * 0.9, cast: 0.25, hl: false });
    c.restore();
  };

  // bulbous cartoon shoe, facing +x when dir = 1
  CL.shoe = (x, y, s = 10, dir = 1, color = '#5a3222', rot = 0) => {
    const c = G.ctx;
    c.save();
    c.translate(x, y);
    c.rotate(rot);
    c.scale(dir, 1);
    CL.shape([[-s * 0.7, -s * 0.55], [s * 0.2, -s * 0.7], [s * 1.05, -s * 0.45], [s * 1.25, s * 0.05], [s * 1.0, s * 0.42], [-s * 0.55, s * 0.45], [-s * 0.85, 0]], color, { lw: Math.max(2, s * 0.26), cast: 0.3 });
    CL.stroke([[-s * 0.7, s * 0.22], [s * 1.1, s * 0.2]], s * 0.16, CL.INK, { taper: 0.3 });
    c.restore();
  };

  // big pie-cut eye; look -1..1; lid 0..1 closes from the top; mood tilts the brow line
  CL.eye = (x, y, w, h, lx = 0, ly = 0, o = {}) => {
    const c = G.ctx;
    const blink = o.blink || 0;
    if (blink > 0.7) {
      CL.stroke([[x - w, y + h * 0.1], [x, y + h * 0.4], [x + w, y + h * 0.1]], Math.max(2, w * 0.35), CL.INK, { taper: 0.3 });
      return;
    }
    const sclera = CL.ellipse(x, y, w, h);
    c.beginPath();
    trace(c, sclera);
    c.fillStyle = o.white || '#fffdf6';
    c.fill();
    c.save();
    c.clip();
    // coloured iris ring then the pie-cut pupil
    const px = x + lx * w * 0.38,
      py = y + ly * h * 0.3 + h * 0.08;
    if (o.iris) {
      c.fillStyle = o.iris;
      c.beginPath();
      c.ellipse(px, py, w * 0.66, h * 0.62, 0, 0, Math.PI * 2);
      c.fill();
    }
    c.fillStyle = CL.INK;
    const cut = -Math.PI / 2 + 0.6;
    c.beginPath();
    c.moveTo(px, py);
    c.ellipse(px, py, w * (o.iris ? 0.44 : 0.56), h * (o.iris ? 0.46 : 0.66), 0, cut + 0.45, cut - 0.45 + Math.PI * 2);
    c.closePath();
    c.fill();
    if (o.lid || blink > 0) {
      const lid = Math.max(o.lid || 0, blink);
      c.fillStyle = o.lidColor || '#e9dcc0';
      c.fillRect(x - w * 2, y - h - 1, w * 4, h * 2 * lid + 1);
    }
    c.restore();
    CL.outline(sclera, Math.max(1.6, w * 0.32));
    if (o.lid) CL.stroke([[x - w * 1.05, y - h + h * 2 * o.lid], [x + w * 1.05, y - h + h * 2 * o.lid - (o.lidTilt || 0) * h]], Math.max(2, w * 0.4), CL.INK, { taper: 0.2 });
  };
  CL.brow = (x, y, w, tilt = 0, thick = 3) => {
    CL.stroke([[x - w, y + tilt * w * 0.5], [x, y - w * 0.18], [x + w, y - tilt * w * 0.5]], thick, CL.INK, { taper: 0.45 });
  };

  // wide toothy grin like the reel's goons. open 0..1
  CL.grin = (x, y, w, h, o = {}) => {
    const c = G.ctx;
    const open = o.open == null ? 0.6 : o.open;
    const hh = h * (0.35 + open * 0.65);
    const poly = CL.smooth([[x - w, y - hh * 0.35], [x, y - hh * 0.55 - (o.smirk || 0)], [x + w, y - hh * 0.35 - (o.smirk || 0) * 1.5], [x + w * 0.7, y + hh * 0.55], [x, y + hh * 0.75], [x - w * 0.7, y + hh * 0.55]], true, 5);
    c.beginPath();
    trace(c, poly);
    c.fillStyle = '#6a1418';
    c.fill();
    c.save();
    c.clip();
    if (o.tongue !== false) {
      c.fillStyle = '#e0505a';
      c.beginPath();
      c.ellipse(x + w * 0.15, y + hh * 0.7, w * 0.55, hh * 0.45, 0, 0, Math.PI * 2);
      c.fill();
    }
    const teeth = o.teeth || '#f6e7b8';
    c.fillStyle = teeth;
    const th = hh * (o.gritted ? 1 : 0.42);
    c.fillRect(x - w * 1.2, y - hh, w * 2.4, th + hh * 0.35);
    if (o.bottom !== false && !o.gritted) c.fillRect(x - w * 1.2, y + hh * 0.52, w * 2.4, hh);
    c.strokeStyle = 'rgba(40,20,10,0.8)';
    c.lineWidth = Math.max(1, w * 0.06);
    const k = o.nTeeth || 5;
    for (let i = 1; i < k; i++) {
      const tx = x - w + (i * 2 * w) / k;
      c.beginPath();
      c.moveTo(tx, y - hh);
      c.lineTo(tx, y - hh * 0.65 + th);
      c.stroke();
    }
    if (o.gritted) {
      c.beginPath();
      c.moveTo(x - w * 1.2, y - hh + th * 0.5);
      c.lineTo(x + w * 1.2, y - hh + th * 0.5);
      c.stroke();
    }
    c.restore();
    CL.outline(poly, Math.max(2, w * 0.2));
  };

  CL.star = (x, y, r, fill = '#f6d44a', points = 5, rot = 0, o = {}) => {
    const p = [];
    for (let i = 0; i < points * 2; i++) {
      const a = rot + (i / (points * 2)) * Math.PI * 2 - Math.PI / 2;
      const rr = i % 2 ? r * (o.inner || 0.45) : r;
      p.push([x + Math.cos(a) * rr, y + Math.sin(a) * rr]);
    }
    return CL.shape(p, fill, Object.assign({ sharp: true, lw: Math.max(1.5, r * 0.18), cast: 0.18 }, o));
  };

  // soft ground shadow (purple-grey, like the reel)
  CL.ground = (x, y, rx, ry) => {
    const c = G.ctx;
    c.fillStyle = 'rgba(70,50,90,0.28)';
    c.beginPath();
    c.ellipse(x, y, rx, ry || rx * 0.28, 0, 0, Math.PI * 2);
    c.fill();
  };

  // speed lines trailing opposite to dir
  CL.speedLines = (x, y, dir, n = 4, len = 30, spread = 30, w = 2.5) => {
    for (let i = 0; i < n; i++) {
      const oy = (i / (n - 1) - 0.5) * spread;
      CL.stroke([[x - dir * 6, y + oy], [x - dir * (6 + len * (0.6 + 0.4 * ((i * 37) % 5) / 5)), y + oy]], w, CL.INK, { taper: 0.5 });
    }
  };
  // little dust cloud puff (cartoon "poof")
  CL.puff = (x, y, r, col = '#f3ead8') => {
    CL.shape([[x - r, y], [x - r * 0.7, y - r * 0.8], [x, y - r], [x + r * 0.8, y - r * 0.7], [x + r, y + r * 0.1], [x + r * 0.4, y + r * 0.6], [x - r * 0.5, y + r * 0.55]], col, { lw: Math.max(1.4, r * 0.18), cast: 0.25, hl: false });
  };
})();
