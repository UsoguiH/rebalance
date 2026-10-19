// Template art: a palette derived from the brand colour, the plates, app tiles with
// real brand marks, the brand tile, a small product UI kit (cards, lozenges,
// avatars) and the clutter props for the montage. Everything reads M.CONTENT.
(function () {
  const T = (M.tpl = {});
  const { W, H } = M;
  const K = M.CONTENT;

  // ---------- colour ----------
  const hex2rgb = (h) => {
    const n = parseInt(h.replace('#', '').replace(/^(.)(.)(.)$/, '$1$1$2$2$3$3'), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  };
  const rgb2hsl = ([r, g, b]) => {
    r /= 255;
    g /= 255;
    b /= 255;
    const mx = Math.max(r, g, b);
    const mn = Math.min(r, g, b);
    const l = (mx + mn) / 2;
    if (mx === mn) return [0, 0, l];
    const d = mx - mn;
    const s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
    const h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
    return [h * 60, s, l];
  };
  const hsl = (h, s, l) => {
    s = M.clamp(s, 0, 1);
    l = M.clamp(l, 0, 1);
    const k = (n) => (n + h / 30) % 12;
    const a = s * Math.min(l, 1 - l);
    const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
    return '#' + [f(0), f(8), f(4)].map((v) => Math.round(v * 255).toString(16).padStart(2, '0')).join('');
  };
  T.rgb = hex2rgb;

  // the palette: brand shades by lightness, neutrals tinted toward the brand hue,
  // and fixed status accents. brand.colors can override any key.
  const [h, s, l] = rgb2hsl(hex2rgb(K.brand.color));
  const ns = Math.min(s, 0.8);
  const C = (T.C = Object.assign(
    {
      brand: K.brand.color,
      light: hsl(h, s, M.clamp(l + 0.17, 0.5, 0.72)),
      lighter: hsl(h, s, M.clamp(l + 0.25, 0.62, 0.8)),
      tint: hsl(h, s, 0.94),
      wash: hsl(h, s, 0.92),
      // accent for text on light pages, and on dark ones
      text: l > 0.55 ? hsl(h, s, 0.42) : K.brand.color,
      onDark: hsl(h, s, Math.max(l, 0.66)),
      navy: hsl(h, ns * 0.68, 0.2),
      ink: hsl(h, ns * 0.95, 0.145),
      sub: hsl(h, ns * 0.22, 0.44),
      line: hsl(h, ns * 0.16, 0.88),
      page: hsl(h, ns * 0.16, 0.96),
      grey: '#e9ebee',
      sky: [hsl(h, s * 0.85, 0.16), hsl(h, s * 0.9, 0.37), hsl(h, s, 0.62), hsl(h, s, 0.78)],
      deep: [hsl(h, ns * 0.65, 0.17), hsl(h, ns * 0.6, 0.05)],
      night: hex2rgb(hsl(h, ns * 0.66, 0.058)),
      haze: [hsl(h, s, 0.97), hsl(h, s, 0.9), hsl(h + 40, s * 0.8, 0.93)],
      green: '#36B37E',
      yellow: '#FFAB00',
      red: '#FF5630',
      purple: '#6554C0',
      teal: '#00B8D9',
      orange: '#FF8B00',
    },
    K.brand.colors || {}
  ));
  T.ACCENTS = [C.purple, C.teal, C.orange, C.green, C.red, C.light];
  T.HAND = '"Caveat", "Comic Sans MS", cursive';

  // ---------- text helpers ----------
  // "No more *chasing* updates." -> [{s, accent}], one entry per word
  T.words = (line) => {
    const out = [];
    let on = false;
    for (const tok of line.split(/\s+/).filter(Boolean)) {
      const open = tok.startsWith('*');
      const close = tok.endsWith('*') && (tok.length > 1 || !open);
      if (open) on = true;
      out.push({ s: tok.replace(/\*/g, ''), accent: on });
      if (close) on = false;
    }
    return out;
  };
  T.plain = (line) => line.replace(/\*/g, '');
  // the largest size (up to size) at which s fits in maxW
  T.fit = (c, s, size, weight, maxW, track = 0) => {
    const w = M.measure(c, s, size, weight, track);
    return w > maxW ? (size * maxW) / w : size;
  };

  // ---------- voice sync ----------
  // Each scene keeps its own clock: local time = piece time + T.OFF[scene] (they are
  // the offsets in main.js). T.cues gives the local entrance time of each on-screen
  // word: the moment the voice says it (from timing.js, written by tools/align.py),
  // or the template's own rhythm when there is no take or the word is not spoken.
  T.OFF = { intro: 0, montage: 0, but: 0, noMore: 0.66, arch: 0.165, once: 0.144, ring: 0.136, wall: 0.118, end: 0.05 };
  const norm = (w) => w.toLowerCase().replace(/[’']/g, "'").replace(/[^a-z0-9']/g, '');
  T.cues = (slot, words, defaults, scene, lead = 0.05) => {
    const said = ((M.TIMING || {})[slot] || []).map(([w, t]) => [norm(w), t]);
    const out = defaults.slice();
    let j = 0;
    let shift = null;
    words.forEach((w, i) => {
      const n = norm(w);
      let k = j;
      while (k < said.length && said[k][0] !== n && !(n.length > 3 && said[k][0].startsWith(n.slice(0, 4)))) k++;
      if (n && k < said.length) {
        const t = said[k][1] + T.OFF[scene] - lead;
        shift = t - defaults[i];
        out[i] = t;
        j = k + 1;
      } else if (shift !== null) out[i] = defaults[i] + shift;
    });
    for (let i = 1; i < out.length; i++) out[i] = Math.max(out[i], out[i - 1] + 0.05);
    return out;
  };
  // n times following a reference rhythm (times of the template's own words)
  T.rhythm = (n, ref) => {
    if (n <= 1) return [ref[0]];
    const out = [];
    for (let i = 0; i < n; i++) {
      const u = (i / (n - 1)) * (ref.length - 1);
      const a = Math.floor(u);
      const b = Math.min(ref.length - 1, a + 1);
      out.push(M.lerp(ref[a], ref[b], u - a));
    }
    return out;
  };

  // ---------- plates ----------
  // deep brand sky with drifting soft light; the intro and "But..." backdrop
  T.sky = () =>
    M.pic('tpl-sky', W, H, (c) => {
      const r = M.rng(41);
      c.fillStyle = M.vgrad(c, 0, H, [[0, C.sky[0]], [0.45, C.sky[1]], [0.8, C.sky[2]], [1, C.sky[3]]]);
      c.fillRect(0, 0, W, H);
      c.filter = 'blur(60px)';
      for (let i = 0; i < 26; i++) {
        c.globalAlpha = r.range(0.08, 0.3);
        c.fillStyle = r() < 0.5 ? C.lighter : '#ffffff';
        c.beginPath();
        c.ellipse(r() * W, r.range(300, 1100), r.range(120, 360), r.range(60, 160), 0, 0, Math.PI * 2);
        c.fill();
      }
      c.filter = 'blur(10px)';
      for (let i = 0; i < 40; i++) {
        c.globalAlpha = r.range(0.06, 0.22);
        c.fillStyle = '#ffffff';
        c.beginPath();
        c.arc(r() * W, r() * H, r.range(8, 40), 0, Math.PI * 2);
        c.fill();
      }
      c.globalAlpha = 1;
      c.filter = 'none';
    });
  // pale brand haze behind the typed line
  T.pastel = () =>
    M.pic('tpl-pastel', W, H, (c) => {
      const r = M.rng(32);
      c.fillStyle = C.haze[0];
      c.fillRect(0, 0, W, H);
      c.filter = 'blur(90px)';
      for (let i = 0; i < 22; i++) {
        c.globalAlpha = r.range(0.35, 0.8);
        c.fillStyle = r() < 0.65 ? C.haze[1] : C.haze[2];
        c.beginPath();
        c.ellipse(r() * W, r.range(200, 950), r.range(150, 380), r.range(120, 260), 0, 0, Math.PI * 2);
        c.fill();
      }
      c.filter = 'none';
      c.globalAlpha = 1;
    });

  // ---------- tiles and marks ----------
  // a white app tile carrying a real brand mark ('chat' draws a generic chat tile)
  T.appTile = (c, slug, x, y, s, { badge = null, badgeScale = 1, alpha = 1, rot = 0, dark = false } = {}) => {
    if (alpha <= 0.01 || s <= 1) return;
    c.save();
    c.globalAlpha *= alpha;
    c.translate(x, y);
    c.rotate(rot);
    c.save();
    c.shadowColor = 'rgba(9,30,66,0.35)';
    c.shadowBlur = s * 0.18;
    c.shadowOffsetY = s * 0.06;
    M.fillRR(c, -s / 2, -s / 2, s, s, s * 0.24, dark ? '#1d2125' : '#ffffff');
    c.restore();
    if (slug === 'chat' || !M.ICONS[slug]) T.chatBubble(c, -s * 0.3, -s * 0.24, '•••', { size: s * 0.16, fill: C.purple, ink: '#ffffff' });
    else M.icon(c, slug, 0, 0, s * 0.5, slug === 'github' && dark ? '#ffffff' : null);
    if (badge !== null && badgeScale > 0.01) T.badge(c, s * 0.42, -s * 0.42, s * 0.17 * badgeScale, badge);
    c.restore();
  };
  T.badge = (c, x, y, r, text) => {
    c.save();
    const w = Math.max(r * 2, M.measure(c, text, r * 1.15, 700) + r * 0.9);
    M.fillRR(c, x - w / 2, y - r, w, r * 2, r, C.red);
    c.lineWidth = r * 0.18;
    c.strokeStyle = '#ffffff';
    M.rr(c, x - w / 2, y - r, w, r * 2, r);
    c.stroke();
    M.text(c, text, x, y + r * 0.4, { size: r * 1.15, weight: 700, color: '#ffffff', align: 'center' });
    c.restore();
  };
  // the brand's mark at (x, y): its Simple Icons glyph, or a monogram
  T.mark = (c, x, y, s, color = '#ffffff') => {
    if (K.brand.icon && M.ICONS[K.brand.icon]) return M.icon(c, K.brand.icon, x, y, s, color);
    const ch = (K.brand.monogram || K.brand.name[0]).toUpperCase();
    M.text(c, ch, x, y + s * 0.36, { size: s * 1.05, weight: 800, color, align: 'center' });
  };
  // the brand tile: a gradient square with the white mark; draw 0..1 grows the mark in
  T.brandTile = (c, x, y, s, { draw = 1, alpha = 1, flat = false } = {}) => {
    if (s <= 1 || alpha <= 0.01) return;
    c.save();
    c.globalAlpha *= alpha;
    const g = c.createLinearGradient(x - s / 2, y - s / 2, x + s / 2, y + s / 2);
    g.addColorStop(0, C.light);
    g.addColorStop(1, flat ? C.light : C.brand);
    if (!flat) {
      c.save();
      c.shadowColor = M.rgba(hex2rgb(C.brand), 0.45);
      c.shadowBlur = s * 0.25;
      c.shadowOffsetY = s * 0.08;
      M.fillRR(c, x - s / 2, y - s / 2, s, s, s * 0.24, g);
      c.restore();
    } else M.fillRR(c, x - s / 2, y - s / 2, s, s, s * 0.24, g);
    if (draw > 0) {
      const k = M.ease.outBack(M.clamp(draw, 0, 1), 1.6);
      c.globalAlpha *= M.clamp(draw * 2, 0, 1);
      T.mark(c, x, y, s * 0.56 * k, K.brand.markColor || '#ffffff');
    }
    c.restore();
  };

  // ---------- product UI kit ----------
  T.avatar = (c, x, y, r, initials, color) => {
    c.save();
    c.fillStyle = color;
    c.beginPath();
    c.arc(x, y, r, 0, Math.PI * 2);
    c.fill();
    c.lineWidth = r * 0.12;
    c.strokeStyle = '#ffffff';
    c.stroke();
    M.text(c, initials, x, y + r * 0.36, { size: r * 0.95, weight: 700, color: '#ffffff', align: 'center' });
    c.restore();
  };
  T.lozenge = (c, x, y, text, bg, fg, size = 18) => {
    const w = M.measure(c, text, size, 700, 0.02) + size * 0.9;
    const h = size * 1.45;
    M.fillRR(c, x, y - h / 2, w, h, size * 0.25, bg);
    M.text(c, text, x + size * 0.45, y + size * 0.36, { size, weight: 700, color: fg, track: 0.02 });
    return w;
  };
  // item type icons: story (green bookmark), bug (red dot), task (brand check)
  T.typeIcon = (c, x, y, s, type) => {
    const col = { story: C.green, bug: C.red, task: C.light }[type];
    M.fillRR(c, x, y, s, s, s * 0.2, col);
    c.save();
    c.fillStyle = '#ffffff';
    c.strokeStyle = '#ffffff';
    c.lineWidth = s * 0.13;
    c.lineCap = 'round';
    c.lineJoin = 'round';
    if (type === 'story') {
      c.beginPath();
      c.moveTo(x + s * 0.3, y + s * 0.22);
      c.lineTo(x + s * 0.7, y + s * 0.22);
      c.lineTo(x + s * 0.7, y + s * 0.8);
      c.lineTo(x + s * 0.5, y + s * 0.64);
      c.lineTo(x + s * 0.3, y + s * 0.8);
      c.closePath();
      c.fill();
    } else if (type === 'bug') {
      c.beginPath();
      c.arc(x + s / 2, y + s / 2, s * 0.22, 0, Math.PI * 2);
      c.fill();
    } else {
      c.beginPath();
      c.moveTo(x + s * 0.27, y + s * 0.52);
      c.lineTo(x + s * 0.44, y + s * 0.68);
      c.lineTo(x + s * 0.74, y + s * 0.34);
      c.stroke();
    }
    c.restore();
  };
  // the product's items (board cards, ring cards): titles from the content, the rest
  // generated so every piece gets a believable set
  const WHO = ['AM', 'SK', 'JL', 'RT', 'NK'];
  const TYPES = ['story', 'bug', 'task'];
  const itemTitles = (K.reveal && K.reveal.cards) || K.items || [];
  T.ITEMS = itemTitles.map((title, i) => ({
    key: `${K.brand.key || K.brand.name.slice(0, 3).toUpperCase()}-${[101, 104, 112, 97, 99, 90, 88, 85, 128][i % 9] + Math.floor(i / 9) * 40}`,
    title,
    type: TYPES[[0, 1, 2, 0, 2, 0, 1, 2, 0][i % 9]],
    who: WHO[[0, 1, 2, 3, 0, 4, 1, 2, 4][i % 9]],
    col: [C.purple, C.teal, C.orange, C.green, C.purple, C.red, C.teal, C.orange, C.red][i % 9],
    pts: [3, 2, 1, 2, 3, 5, 2, 1, 5][i % 9],
  }));
  // one product card; theme picks light/dark; done adds the green check
  T.card = (c, x, y, w, h, item, { lift = 0, rot = 0, theme = 'light', done = 0 } = {}) => {
    const is = typeof item === 'number' ? T.ITEMS[item % T.ITEMS.length] : item;
    const dark = theme === 'dark';
    c.save();
    c.translate(x + w / 2, y + h / 2);
    c.rotate(rot);
    c.scale(1 + lift * 0.04, 1 + lift * 0.04);
    c.translate(-w / 2, -h / 2);
    c.save();
    c.shadowColor = `rgba(9,30,66,${0.18 + lift * 0.25})`;
    c.shadowBlur = 6 + lift * 34;
    c.shadowOffsetY = 2 + lift * 16;
    M.fillRR(c, 0, 0, w, h, 10, dark ? '#22272b' : '#ffffff');
    c.restore();
    M.text(c, is.title, 20, 42, { size: T.fit(c, is.title, 24, 500, w - 40), weight: 500, color: dark ? '#dee4ea' : C.navy });
    T.typeIcon(c, 20, h - 42, 24, is.type);
    M.text(c, is.key, 54, h - 23, { size: 18, weight: 600, color: dark ? '#9fadbc' : C.sub, track: 0.01 });
    M.fillRR(c, w - 104, h - 42, 34, 24, 12, dark ? '#38414a' : C.line);
    M.text(c, String(is.pts), w - 87, h - 23, { size: 16, weight: 700, color: dark ? '#dee4ea' : C.navy, align: 'center' });
    T.avatar(c, w - 36, h - 30, 17, is.who, is.col);
    if (done > 0) T.check(c, w - 34, 32, 16, done);
    c.restore();
  };
  // a green check disc that pops in with done 0..1
  T.check = (c, x, y, r, done) => {
    c.save();
    c.globalAlpha *= M.clamp(done * 3, 0, 1);
    const k = M.ease.outBack(M.clamp(done, 0, 1), 2.4);
    c.translate(x, y);
    c.scale(k, k);
    c.fillStyle = C.green;
    c.beginPath();
    c.arc(0, 0, r, 0, Math.PI * 2);
    c.fill();
    c.strokeStyle = '#ffffff';
    c.lineWidth = r * 0.225;
    c.lineCap = 'round';
    c.lineJoin = 'round';
    c.beginPath();
    c.moveTo(-r * 0.44, 0);
    c.lineTo(-r * 0.12, r * 0.31);
    c.lineTo(r * 0.44, -r * 0.31);
    c.stroke();
    c.restore();
  };

  // ---------- montage props ----------
  T.sticky = (c, x, y, s, rot, fill, text, ink = '#3b2f00') => {
    c.save();
    c.translate(x, y);
    c.rotate(rot);
    c.save();
    c.shadowColor = 'rgba(0,0,0,0.28)';
    c.shadowBlur = 18;
    c.shadowOffsetY = 8;
    c.fillStyle = fill;
    c.fillRect(-s / 2, -s / 2, s, s);
    c.restore();
    c.fillStyle = 'rgba(0,0,0,0.06)';
    c.fillRect(-s / 2, s / 2 - s * 0.12, s, s * 0.12);
    c.fillStyle = ink;
    c.textAlign = 'center';
    const lines = text.split('\n');
    c.font = `500 ${s * 0.2}px ${T.HAND}`;
    const widest = Math.max(...lines.map((ln) => c.measureText(ln).width));
    if (widest > s * 0.86) c.font = `500 ${(s * 0.2 * s * 0.86) / widest}px ${T.HAND}`;
    lines.forEach((ln, i) => c.fillText(ln, 0, (i - (lines.length - 1) / 2) * s * 0.23 + s * 0.06));
    c.restore();
  };
  // a macOS-style window frame; returns the content origin
  T.window = (c, x, y, w, h, title, { dark = false, bar = null } = {}) => {
    c.save();
    c.shadowColor = 'rgba(0,0,0,0.3)';
    c.shadowBlur = 40;
    c.shadowOffsetY = 16;
    M.fillRR(c, x, y, w, h, 22, dark ? '#1e1f22' : '#ffffff');
    c.restore();
    c.save();
    M.rr(c, x, y, w, h, 22);
    c.clip();
    c.fillStyle = bar || (dark ? '#2b2d31' : '#f1f2f4');
    c.fillRect(x, y, w, 64);
    c.restore();
    ['#ff5f57', '#febc2e', '#28c840'].forEach((col, i) => {
      c.fillStyle = col;
      c.beginPath();
      c.arc(x + 32 + i * 26, y + 32, 9, 0, Math.PI * 2);
      c.fill();
    });
    if (title) M.text(c, title, x + w / 2, y + 41, { size: T.fit(c, title, 22, 600, w - 320), weight: 600, color: dark ? '#c9ccd1' : '#44474d', align: 'center' });
    return [x, y + 64];
  };
  T.chatBubble = (c, x, y, text, { size = 40, fill = '#ffffff', ink = C.navy, tail = 'left', alpha = 1 } = {}) => {
    if (alpha <= 0.01) return 0;
    c.save();
    c.globalAlpha *= alpha;
    const w = M.measure(c, text, size, 500) + size * 1.2;
    const h = size * 1.9;
    c.save();
    c.shadowColor = 'rgba(9,30,66,0.25)';
    c.shadowBlur = size * 0.6;
    c.shadowOffsetY = size * 0.15;
    M.fillRR(c, x, y, w, h, h * 0.42, fill);
    c.beginPath();
    if (tail === 'left') {
      c.moveTo(x + h * 0.25, y + h * 0.7);
      c.quadraticCurveTo(x - h * 0.05, y + h * 1.08, x - h * 0.12, y + h);
      c.quadraticCurveTo(x + h * 0.25, y + h * 0.98, x + h * 0.55, y + h * 0.85);
    } else {
      c.moveTo(x + w - h * 0.25, y + h * 0.7);
      c.quadraticCurveTo(x + w + h * 0.05, y + h * 1.08, x + w + h * 0.12, y + h);
      c.quadraticCurveTo(x + w - h * 0.25, y + h * 0.98, x + w - h * 0.55, y + h * 0.85);
    }
    c.fillStyle = fill;
    c.fill();
    c.restore();
    M.text(c, text, x + size * 0.6, y + h * 0.5 + size * 0.36, { size, weight: 500, color: ink });
    c.restore();
    return w;
  };
  // confetti burst from (x0, y0), k seconds after it fires
  T.confetti = (c, k, x0, y0) => {
    if (k < 0 || k > 0.9) return;
    const r = M.rng(9);
    for (let i = 0; i < 46; i++) {
      const a = r.range(-Math.PI * 0.95, -Math.PI * 0.05);
      const v = r.range(500, 1100);
      const x = x0 + Math.cos(a) * v * k;
      const y = y0 + Math.sin(a) * v * k + 1400 * k * k;
      c.save();
      c.globalAlpha = 1 - M.prog(k, 0.55, 0.9);
      c.translate(x, y);
      c.rotate(r() * 6 + k * r.range(-14, 14));
      c.fillStyle = [C.light, C.green, C.yellow, C.red, C.purple, C.teal][i % 6];
      c.fillRect(-7, -4, 14, 8);
      c.restore();
    }
  };
})();
