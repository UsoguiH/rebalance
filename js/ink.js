// Ink: the rubber-hose drawing kit. Every outline "boils" (re-jitters) at 10 fps,
// giving the hand-inked, frame-by-frame look of a 1930s cel cartoon.
(function () {
  const K = (G.ink = {});
  K.INK = '#1d1510';
  K.PAPER = '#f4e6c6';
  K.C = {
    ink: '#1d1510',
    paper: '#f4e6c6',
    cream: '#fbf1d9',
    white: '#fffaf0',
    red: '#d4392b',
    darkred: '#8e2219',
    blue: '#3c6ea6',
    navy: '#233e63',
    yellow: '#f2c440',
    orange: '#ec8a2e',
    green: '#6b9a4a',
    dgreen: '#3f6a34',
    pink: '#ff5fa8',
    brown: '#8a5a3b',
    dbrown: '#5b3a26',
    tan: '#d9b27c',
    teal: '#4b9a93',
    purple: '#7b4f8f',
    grey: '#9a8e80',
    gold: '#e9b739',
    sky: '#9fc6d4',
  };
  K.F = {
    shout: '"Chango", "Arial Black", Impact, sans-serif',
    deco: '"Limelight", "Georgia", serif',
    type: '"Special Elite", "Courier New", monospace',
  };

  let seedBase = 0,
    seedN = 0;
  K.amt = 1.25; // boil amplitude in px
  K.seed = (s) => {
    seedBase = s * 977.31;
    seedN = 0;
  };
  const j = (K.j = () => {
    seedN++;
    return (G.hash(seedBase + seedN * 7.137 + G.boil * 31.73) - 0.5) * 2;
  });

  const ctx = () => G.ctx;

  function smoothClosed(c, pts) {
    const n = pts.length;
    const mx = (pts[n - 1][0] + pts[0][0]) / 2,
      my = (pts[n - 1][1] + pts[0][1]) / 2;
    c.moveTo(mx, my);
    for (let i = 0; i < n; i++) {
      const p = pts[i],
        q = pts[(i + 1) % n];
      c.quadraticCurveTo(p[0], p[1], (p[0] + q[0]) / 2, (p[1] + q[1]) / 2);
    }
    c.closePath();
  }
  K.smoothClosed = smoothClosed;

  function paint(c, fill, lw, stroke) {
    if (fill) {
      c.fillStyle = fill;
      c.fill();
    }
    if (lw !== 0) {
      c.lineWidth = lw == null ? 3 : lw;
      c.strokeStyle = stroke || K.INK;
      c.stroke();
    }
  }

  // Wobbly ellipse. o: {rot, lw, n, amt, hl (highlight), stroke, shade}
  K.blob = (x, y, rx, ry, fill, o = {}) => {
    const c = ctx();
    const n = o.n || Math.max(10, Math.min(22, Math.round((rx + ry) / 5)));
    const a = o.amt == null ? K.amt : o.amt;
    const rot = o.rot || 0;
    const cs = Math.cos(rot),
      sn = Math.sin(rot);
    const pts = [];
    for (let i = 0; i < n; i++) {
      const t = (i / n) * Math.PI * 2;
      const px = Math.cos(t) * rx + j() * a,
        py = Math.sin(t) * ry + j() * a;
      pts.push([x + px * cs - py * sn, y + px * sn + py * cs]);
    }
    c.beginPath();
    smoothClosed(c, pts);
    if (fill && (o.shade || o.hl)) {
      c.fillStyle = fill;
      c.fill();
      c.save();
      c.clip();
      if (o.shade) {
        c.fillStyle = 'rgba(40,20,10,0.16)';
        c.beginPath();
        c.ellipse(x + rx * 0.35, y + ry * 0.4, rx * 1.05, ry * 0.95, 0, 0, Math.PI * 2);
        c.fill();
      }
      if (o.hl) {
        c.fillStyle = 'rgba(255,255,240,0.42)';
        c.beginPath();
        c.ellipse(x - rx * 0.38, y - ry * 0.42, rx * 0.32, ry * 0.2, -0.6, 0, Math.PI * 2);
        c.fill();
      }
      c.restore();
      c.beginPath();
      smoothClosed(c, pts);
      paint(c, null, o.lw, o.stroke);
    } else paint(c, fill, o.lw, o.stroke);
  };

  // Wobbly polygon (smooth or sharp)
  K.shape = (pts, fill, o = {}) => {
    const c = ctx();
    const a = o.amt == null ? K.amt : o.amt;
    const jp = pts.map((p) => [p[0] + j() * a, p[1] + j() * a]);
    c.beginPath();
    if (o.smooth) smoothClosed(c, jp);
    else {
      c.moveTo(jp[0][0], jp[0][1]);
      for (let i = 1; i < jp.length; i++) c.lineTo(jp[i][0], jp[i][1]);
      c.closePath();
    }
    c.lineJoin = 'round';
    paint(c, fill, o.lw, o.stroke);
  };

  // Rounded rect with boil
  K.rrect = (x, y, w, h, r, fill, o = {}) => {
    const c = ctx();
    const a = o.amt == null ? K.amt : o.amt;
    const q = () => j() * a;
    r = Math.min(r, w / 2, h / 2);
    c.beginPath();
    c.moveTo(x + r + q(), y + q());
    c.lineTo(x + w - r + q(), y + q());
    c.quadraticCurveTo(x + w + q(), y + q(), x + w + q(), y + r + q());
    c.lineTo(x + w + q(), y + h - r + q());
    c.quadraticCurveTo(x + w + q(), y + h + q(), x + w - r + q(), y + h + q());
    c.lineTo(x + r + q(), y + h + q());
    c.quadraticCurveTo(x + q(), y + h + q(), x + q(), y + h - r + q());
    c.lineTo(x + q(), y + r + q());
    c.quadraticCurveTo(x + q(), y + q(), x + r + q(), y + q());
    c.closePath();
    paint(c, fill, o.lw, o.stroke);
  };

  // Open wobbly stroke through points
  K.line = (pts, lw = 3, color = K.INK, o = {}) => {
    const c = ctx();
    const a = o.amt == null ? K.amt : o.amt;
    c.beginPath();
    const jp = pts.map((p) => [p[0] + j() * a, p[1] + j() * a]);
    c.moveTo(jp[0][0], jp[0][1]);
    if (o.smooth && jp.length > 2) {
      for (let i = 1; i < jp.length - 1; i++) {
        const p = jp[i],
          q = jp[i + 1];
        c.quadraticCurveTo(p[0], p[1], i === jp.length - 2 ? q[0] : (p[0] + q[0]) / 2, i === jp.length - 2 ? q[1] : (p[1] + q[1]) / 2);
      }
    } else for (let i = 1; i < jp.length; i++) c.lineTo(jp[i][0], jp[i][1]);
    c.lineCap = 'round';
    c.lineJoin = 'round';
    c.lineWidth = lw;
    c.strokeStyle = color;
    c.stroke();
  };

  // Rubber-hose limb: a single bendy ink tube
  K.hose = (x1, y1, x2, y2, bend = 6, w = 5, color = K.INK) => {
    const c = ctx();
    const mx = (x1 + x2) / 2,
      my = (y1 + y2) / 2;
    const dx = x2 - x1,
      dy = y2 - y1;
    const l = Math.hypot(dx, dy) || 1;
    const cx = mx + (-dy / l) * bend + j() * 0.8,
      cy = my + (dx / l) * bend + j() * 0.8;
    c.beginPath();
    c.moveTo(x1, y1);
    c.quadraticCurveTo(cx, cy, x2 + j() * 0.5, y2 + j() * 0.5);
    c.lineCap = 'round';
    c.lineWidth = w;
    c.strokeStyle = color;
    c.stroke();
  };

  // White four-finger glove. pose: 'fist' | 'point' | 'open' | 'wave'
  K.glove = (x, y, s = 7, rot = 0, pose = 'fist') => {
    const c = ctx();
    c.save();
    c.translate(x, y);
    c.rotate(rot);
    if (pose === 'point') {
      K.rrect(s * 0.3, -s * 0.32, s * 1.25, s * 0.62, s * 0.3, K.C.white, { lw: 2.2, amt: 0.5 });
    }
    if (pose === 'open' || pose === 'wave') {
      for (let i = -1; i <= 1; i++) K.blob(s * 0.9, i * s * 0.45, s * 0.42, s * 0.26, K.C.white, { lw: 2, rot: i * 0.35, amt: 0.4 });
    }
    K.blob(0, 0, s, s * 0.9, K.C.white, { lw: 2.4, amt: 0.6 });
    K.blob(-s * 0.2, -s * 0.72, s * 0.38, s * 0.3, K.C.white, { lw: 2, amt: 0.4 }); // thumb
    K.line([[-s * 0.25, -s * 0.25], [s * 0.35, -s * 0.2]], 1.4);
    K.line([[-s * 0.25, s * 0.2], [s * 0.35, s * 0.18]], 1.4);
    // cuff
    K.rrect(-s * 1.35, -s * 0.55, s * 0.5, s * 1.1, 2, K.C.white, { lw: 2, amt: 0.4 });
    c.restore();
  };

  K.shoe = (x, y, s = 9, flip = 1, color = '#4a2f22') => {
    K.blob(x + flip * s * 0.35, y, s, s * 0.58, color, { lw: 2.6, hl: true });
  };

  // Classic pie-cut eye. lx/ly in -1..1 = where it looks. blink 0..1
  K.pieEye = (x, y, w, h, lx = 0, ly = 0, blink = 0, white = true) => {
    const c = ctx();
    if (blink > 0.6) {
      K.line([[x - w, y], [x, y + h * 0.25], [x + w, y]], 2.5, K.INK, { smooth: true, amt: 0.4 });
      return;
    }
    if (white) K.blob(x, y, w, h, K.C.white, { lw: 2.2, amt: 0.5 });
    const px = x + lx * w * 0.4,
      py = y + ly * h * 0.35 + h * 0.1;
    const pw = w * 0.52,
      ph = h * 0.68;
    c.beginPath();
    const cut = -Math.PI / 2 + 0.55;
    c.moveTo(px, py);
    c.ellipse(px, py, pw, ph, 0, cut + 0.42, cut - 0.42 + Math.PI * 2);
    c.closePath();
    c.fillStyle = K.INK;
    c.fill();
  };

  // A pair of eyes that can be squinted/angry via lid angle
  K.lid = (x, y, w, h, angle) => {
    const c = ctx();
    c.save();
    c.beginPath();
    c.ellipse(x, y, w + 1, h + 1, 0, 0, Math.PI * 2);
    c.clip();
    c.translate(x, y - h * 0.55);
    c.rotate(angle);
    c.fillStyle = K.INK;
    c.fillRect(-w * 2, -h * 2, w * 4, h * 1.6);
    c.restore();
  };

  K.shadow = (x, y, rx, ry) => {
    const c = ctx();
    c.fillStyle = 'rgba(30,18,10,0.28)';
    c.beginPath();
    c.ellipse(x, y, rx, ry || rx * 0.32, 0, 0, Math.PI * 2);
    c.fill();
  };

  K.star = (x, y, r, fill = K.C.yellow, pts = 5, rot = 0, o = {}) => {
    const p = [];
    for (let i = 0; i < pts * 2; i++) {
      const a = rot + (i / (pts * 2)) * Math.PI * 2 - Math.PI / 2;
      const rr = i % 2 ? r * 0.45 : r;
      p.push([x + Math.cos(a) * rr, y + Math.sin(a) * rr]);
    }
    K.shape(p, fill, Object.assign({ lw: 2.2, amt: 0.6 }, o));
  };

  K.coin = (x, y, r = 7) => {
    K.blob(x, y, r, r, K.C.gold, { lw: 2, hl: true, amt: 0.5 });
    K.blob(x, y, r * 0.55, r * 0.55, null, { lw: 1.4, amt: 0.4 });
  };

  // Vintage cartoon text with fat ink outline + drop shadow.
  // o: {font, fill, align, rot, wave, lw, shadow, baseline, alpha, spacing}
  K.text = (str, x, y, size, o = {}) => {
    const c = ctx();
    const font = o.font || K.F.shout;
    c.save();
    c.translate(x, y);
    if (o.rot) c.rotate(o.rot);
    if (o.alpha != null) c.globalAlpha = o.alpha;
    c.font = `${o.weight || ''} ${size}px ${font}`;
    c.textAlign = o.align || 'center';
    c.textBaseline = o.baseline || 'middle';
    c.lineJoin = 'round';
    const lw = o.lw == null ? Math.max(2, size * 0.16) : o.lw;
    const fill = o.fill || K.C.cream;
    if (o.wave) {
      // per-letter wobble, the letters dance like a title card
      const chars = [...str];
      const widths = chars.map((ch) => c.measureText(ch).width);
      const total = widths.reduce((a, b) => a + b, 0);
      let cx = c.textAlign === 'center' ? -total / 2 : c.textAlign === 'right' ? -total : 0;
      c.textAlign = 'left';
      chars.forEach((ch, i) => {
        const bob = Math.sin(G.animT * 5 + i * 0.7) * o.wave;
        const r = G.hash(i * 3.1 + G.boil * 1.7) * 0.08 - 0.04;
        c.save();
        c.translate(cx + widths[i] / 2, bob);
        c.rotate(r);
        if (o.shadow !== false) {
          c.fillStyle = K.INK;
          c.fillText(ch, -widths[i] / 2 + size * 0.06, size * 0.08);
        }
        if (lw) {
          c.lineWidth = lw;
          c.strokeStyle = o.stroke || K.INK;
          c.strokeText(ch, -widths[i] / 2, 0);
        }
        c.fillStyle = fill;
        c.fillText(ch, -widths[i] / 2, 0);
        c.restore();
        cx += widths[i];
      });
    } else {
      if (o.shadow !== false && lw) {
        c.fillStyle = K.INK;
        c.fillText(str, size * 0.06, size * 0.08);
      }
      if (lw) {
        c.lineWidth = lw;
        c.strokeStyle = o.stroke || K.INK;
        c.strokeText(str, 0, 0);
      }
      c.fillStyle = fill;
      c.fillText(str, 0, 0);
    }
    c.restore();
  };

  // Plain text (no outline) for paragraphs; returns lines drawn
  K.para = (str, x, y, maxW, size, o = {}) => {
    const c = ctx();
    c.save();
    c.font = `${size}px ${o.font || K.F.type}`;
    c.fillStyle = o.fill || K.INK;
    c.textAlign = o.align || 'left';
    c.textBaseline = 'top';
    const lines = K.wrap(str, maxW, size, o.font);
    const lh = size * (o.lh || 1.35);
    lines.forEach((l, i) => c.fillText(l, x, y + i * lh));
    c.restore();
    return lines.length;
  };
  K.wrap = (str, maxW, size, font) => {
    const c = ctx();
    c.save();
    c.font = `${size}px ${font || K.F.type}`;
    const out = [];
    str.split('\n').forEach((para) => {
      let line = '';
      para.split(' ').forEach((w) => {
        const t = line ? line + ' ' + w : w;
        if (c.measureText(t).width > maxW && line) {
          out.push(line);
          line = w;
        } else line = t;
      });
      out.push(line);
    });
    c.restore();
    return out;
  };

  // Paper card, slightly tilted, with drop shadow (Cuphead-style UI plates)
  K.card = (x, y, w, h, o = {}) => {
    const c = ctx();
    c.save();
    c.translate(x + w / 2, y + h / 2);
    if (o.rot) c.rotate(o.rot);
    c.fillStyle = 'rgba(20,10,5,0.35)';
    c.fillRect(-w / 2 + 6, -h / 2 + 7, w, h);
    K.rrect(-w / 2, -h / 2, w, h, o.r == null ? 8 : o.r, o.fill || K.C.cream, { lw: o.lw || 3.5, amt: 0.8 });
    if (o.inner !== false) K.rrect(-w / 2 + 6, -h / 2 + 6, w - 12, h - 12, 5, null, { lw: 1.5, amt: 0.6 });
    c.restore();
  };

  // Soft painted background blob (static, no outline) for watercolour backdrops
  K.wash = (x, y, rx, ry, color, alpha = 1) => {
    const c = ctx();
    const g = c.createRadialGradient(x, y, 0, x, y, Math.max(rx, ry));
    g.addColorStop(0, color);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    c.save();
    c.globalAlpha = alpha;
    c.fillStyle = g;
    c.beginPath();
    c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    c.fill();
    c.restore();
  };

  K.mix = (a, b, t) => {
    const pa = parseInt(a.slice(1), 16),
      pb = parseInt(b.slice(1), 16);
    const r = Math.round(((pa >> 16) & 255) * (1 - t) + ((pb >> 16) & 255) * t);
    const g = Math.round(((pa >> 8) & 255) * (1 - t) + ((pb >> 8) & 255) * t);
    const bl = Math.round((pa & 255) * (1 - t) + (pb & 255) * t);
    return '#' + ((1 << 24) | (r << 16) | (g << 8) | bl).toString(16).slice(1);
  };

  // Film-strip frame (used in UI and cutscenes)
  K.filmStrip = (x, y, w, h, frames = 5) => {
    const c = ctx();
    c.fillStyle = K.INK;
    c.fillRect(x, y, w, h);
    c.fillStyle = K.C.paper;
    const holes = Math.floor(w / 18);
    for (let i = 0; i < holes; i++) {
      c.fillRect(x + 6 + i * 18, y + 3, 9, 5);
      c.fillRect(x + 6 + i * 18, y + h - 8, 9, 5);
    }
  };
})();
