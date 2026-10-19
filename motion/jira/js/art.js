// Jira art: the sky plate, app tiles with real brand marks, the Jira tile, and a
// small Jira UI kit (issue cards, lozenges, avatars, the board) plus the clutter
// props for the montage (sticky notes, chat, calendar, inbox).
(function () {
  const J = (M.jira = {});
  const { W, H } = M;

  // Atlassian palette
  J.C = {
    blue: '#0052CC',
    blue5: '#0065FF',
    blue4: '#2684FF',
    blue3: '#4C9AFF',
    blue1: '#DEEBFF',
    navy: '#172B4D',
    ink: '#091E42',
    sub: '#5E6C84',
    line: '#DFE1E6',
    page: '#F4F5F7',
    green: '#36B37E',
    green1: '#E3FCEF',
    yellow: '#FFAB00',
    red: '#FF5630',
    purple: '#6554C0',
    teal: '#00B8D9',
    orange: '#FF8B00',
  };
  const C = J.C;
  J.HAND = '"Caveat", "Comic Sans MS", cursive';

  // ---------- plates ----------
  // deep blue sky with drifting soft light; the intro and "But..." backdrop
  J.sky = () =>
    M.pic('jira-sky', W, H, (c) => {
      const r = M.rng(41);
      c.fillStyle = M.vgrad(c, 0, H, [[0, '#071f4d'], [0.45, '#0b4bb0'], [0.8, '#3d8bff'], [1, '#8cc0ff']]);
      c.fillRect(0, 0, W, H);
      c.filter = 'blur(60px)';
      for (let i = 0; i < 26; i++) {
        c.globalAlpha = r.range(0.08, 0.3);
        c.fillStyle = r() < 0.5 ? '#9fd0ff' : '#ffffff';
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

  // ---------- tiles and marks ----------
  // a white app tile carrying a real brand mark; badge is a count string or null
  J.appTile = (c, slug, x, y, s, { badge = null, badgeScale = 1, alpha = 1, rot = 0, dark = false } = {}) => {
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
    M.icon(c, slug, 0, 0, s * 0.5, slug === 'github' && dark ? '#ffffff' : null);
    if (badge !== null && badgeScale > 0.01) J.badge(c, s * 0.42, -s * 0.42, s * 0.17 * badgeScale, badge);
    c.restore();
  };
  J.badge = (c, x, y, r, text) => {
    c.save();
    c.fillStyle = C.red;
    const w = Math.max(r * 2, M.measure(c, text, r * 1.15, 700) + r * 0.9);
    M.fillRR(c, x - w / 2, y - r, w, r * 2, r, C.red);
    c.lineWidth = r * 0.18;
    c.strokeStyle = '#ffffff';
    M.rr(c, x - w / 2, y - r, w, r * 2, r);
    c.stroke();
    M.text(c, text, x, y + r * 0.4, { size: r * 1.15, weight: 700, color: '#ffffff', align: 'center' });
    c.restore();
  };
  // the Jira app tile: blue gradient, white mark; draw 0..1 grows the mark in
  J.jiraTile = (c, x, y, s, { draw = 1, alpha = 1, flat = false } = {}) => {
    if (s <= 1 || alpha <= 0.01) return;
    c.save();
    c.globalAlpha *= alpha;
    const g = c.createLinearGradient(x - s / 2, y - s / 2, x + s / 2, y + s / 2);
    g.addColorStop(0, flat ? C.blue4 : '#2f8bff');
    g.addColorStop(1, flat ? C.blue4 : C.blue);
    if (!flat) {
      c.save();
      c.shadowColor = 'rgba(0,82,204,0.45)';
      c.shadowBlur = s * 0.25;
      c.shadowOffsetY = s * 0.08;
      M.fillRR(c, x - s / 2, y - s / 2, s, s, s * 0.24, g);
      c.restore();
    } else M.fillRR(c, x - s / 2, y - s / 2, s, s, s * 0.24, g);
    if (draw > 0) {
      const k = M.ease.outBack(M.clamp(draw, 0, 1), 1.6);
      c.globalAlpha *= M.clamp(draw * 2, 0, 1);
      M.icon(c, 'jira', x, y, s * 0.56 * k, '#ffffff');
    }
    c.restore();
  };

  // ---------- Jira UI kit ----------
  J.avatar = (c, x, y, r, initials, color) => {
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
  J.lozenge = (c, x, y, text, bg, fg, size = 18) => {
    const w = M.measure(c, text, size, 700, 0.02) + size * 0.9;
    const h = size * 1.45;
    M.fillRR(c, x, y - h / 2, w, h, size * 0.25, bg);
    M.text(c, text, x + size * 0.45, y + size * 0.36, { size, weight: 700, color: fg, track: 0.02 });
    return w;
  };
  // issue type icons: story (green bookmark), bug (red dot), task (blue check)
  J.typeIcon = (c, x, y, s, type) => {
    const col = { story: C.green, bug: C.red, task: C.blue4 }[type];
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
  J.ISSUES = {
    101: { key: 'JRA-101', title: 'Design landing page', type: 'story', who: 'AM', col: C.purple, pts: 3 },
    104: { key: 'JRA-104', title: 'Fix login timeout', type: 'bug', who: 'SK', col: C.teal, pts: 2 },
    112: { key: 'JRA-112', title: 'Set up analytics', type: 'task', who: 'JL', col: C.orange, pts: 1 },
    97: { key: 'JRA-97', title: 'Pricing page copy', type: 'story', who: 'RT', col: C.green, pts: 2 },
    99: { key: 'JRA-99', title: 'Mobile nav polish', type: 'task', who: 'AM', col: C.purple, pts: 3 },
    90: { key: 'JRA-90', title: 'Onboarding emails', type: 'story', who: 'NK', col: C.red, pts: 5 },
    88: { key: 'JRA-88', title: 'Beta feedback triage', type: 'bug', who: 'SK', col: C.teal, pts: 2 },
    85: { key: 'JRA-85', title: 'Release notes', type: 'task', who: 'JL', col: C.orange, pts: 1 },
    128: { key: 'JRA-128', title: 'Plan launch campaign', type: 'story', who: 'NK', col: C.red, pts: 5 },
  };
  // one board card; theme picks light/dark; done adds the green check
  J.card = (c, x, y, w, h, id, { lift = 0, rot = 0, theme = 'light', done = 0 } = {}) => {
    const is = J.ISSUES[id];
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
    M.text(c, is.title, 20, 42, { size: 24, weight: 500, color: dark ? '#dee4ea' : C.navy });
    J.typeIcon(c, 20, h - 42, 24, is.type);
    M.text(c, is.key, 54, h - 23, { size: 18, weight: 600, color: dark ? '#9fadbc' : C.sub, track: 0.01 });
    // story points and assignee
    M.fillRR(c, w - 104, h - 42, 34, 24, 12, dark ? '#38414a' : C.line);
    M.text(c, String(is.pts), w - 87, h - 23, { size: 16, weight: 700, color: dark ? '#dee4ea' : C.navy, align: 'center' });
    J.avatar(c, w - 36, h - 30, 17, is.who, is.col);
    if (done > 0) {
      c.save();
      c.globalAlpha *= M.clamp(done * 3, 0, 1);
      const k = M.ease.outBack(M.clamp(done, 0, 1), 2.4);
      c.translate(w - 34, 32);
      c.scale(k, k);
      c.fillStyle = C.green;
      c.beginPath();
      c.arc(0, 0, 16, 0, Math.PI * 2);
      c.fill();
      c.strokeStyle = '#ffffff';
      c.lineWidth = 3.6;
      c.lineCap = 'round';
      c.lineJoin = 'round';
      c.beginPath();
      c.moveTo(-7, 0);
      c.lineTo(-2, 5);
      c.lineTo(7, -5);
      c.stroke();
      c.restore();
    }
    c.restore();
  };

  // ---------- montage props ----------
  J.sticky = (c, x, y, s, rot, fill, text, ink = '#3b2f00') => {
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
    // a little curl shadow along the bottom
    c.fillStyle = 'rgba(0,0,0,0.06)';
    c.fillRect(-s / 2, s / 2 - s * 0.12, s, s * 0.12);
    c.fillStyle = ink;
    c.font = `500 ${s * 0.2}px ${J.HAND}`;
    c.textAlign = 'center';
    const lines = text.split('\n');
    lines.forEach((ln, i) => c.fillText(ln, 0, (i - (lines.length - 1) / 2) * s * 0.23 + s * 0.06));
    c.restore();
  };
  // a macOS-style window frame; returns the content origin
  J.window = (c, x, y, w, h, title, { dark = false, bar = null } = {}) => {
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
    if (title) M.text(c, title, x + w / 2, y + 41, { size: 22, weight: 600, color: dark ? '#c9ccd1' : '#44474d', align: 'center' });
    return [x, y + 64];
  };
  J.chatBubble = (c, x, y, text, { size = 40, fill = '#ffffff', ink = C.navy, tail = 'left', alpha = 1 } = {}) => {
    if (alpha <= 0.01) return;
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
})();
