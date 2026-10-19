// Jira scenes, part A: "Your team's work is everywhere." over floating app
// tiles, the clutter montage ("any update?"), and "But..." collapsing into a
// typed caret line. Times are seconds into the piece.
(function () {
  const S = (M.scenes = M.scenes || {});
  const J = M.jira;
  const C = J.C;
  const { W, H } = M;
  const tw = M.tw;

  // ---------------------------------------------------------------- intro
  // [slug, x, y, size, depth 0 far / 1 mid / 2 near, badge steps [[t, count]]]
  const TILES = [
    ['gmail', 290, 230, 150, 1, [[0.75, '3'], [1.35, '12'], [2.0, '27']]],
    ['googlesheets', 660, 165, 118, 0, []],
    ['googlecalendar', 1190, 190, 140, 1, [[1.05, '5']]],
    ['zoom', 1580, 290, 168, 2, [[1.7, '2']]],
    ['github', 1700, 800, 142, 1, [[1.55, '9'], [2.18, '99+']]],
    ['figma', 1290, 880, 120, 0, [[1.9, '4']]],
    ['confluence', 820, 900, 148, 1, [[1.2, '2']]],
    ['bitbucket', 470, 840, 126, 0, []],
    ['chat', 190, 840, 156, 2, [[0.9, '8'], [1.6, '42']]],
  ];
  const chatTile = (c, x, y, s, o) => {
    // a generic team-chat tile (drawn, not a brand)
    c.save();
    c.globalAlpha *= o.alpha ?? 1;
    c.translate(x, y);
    c.save();
    c.shadowColor = 'rgba(9,30,66,0.35)';
    c.shadowBlur = s * 0.18;
    c.shadowOffsetY = s * 0.06;
    M.fillRR(c, -s / 2, -s / 2, s, s, s * 0.24, '#ffffff');
    c.restore();
    J.chatBubble(c, -s * 0.3, -s * 0.24, '•••', { size: s * 0.16, fill: C.purple, ink: '#ffffff' });
    if (o.badge) J.badge(c, s * 0.42, -s * 0.42, s * 0.17 * (o.badgeScale ?? 1), o.badge);
    c.restore();
  };
  const INTRO_WORDS = [
    { s: 'Your', t0: 0.3 },
    { s: 'team’s', t0: 0.47 },
    { s: 'work', t0: 0.66 },
    { s: 'is', t0: 0.84 },
    { s: 'everywhere.', t0: 1.0, weight: 800 },
  ];
  const introCursor = (t) =>
    M.track(t, [[0.95, 760, 1130], [1.2, 900, 1030], [1.5, 1180, 960], [1.8, 1460, 890], [2.0, 1610, 830], [2.12, 1660, 790], [2.3, 1668, 782], [2.6, 1650, 800], [2.9, 1610, 850]]);
  // whip-zoom into "everywhere." at the end of the shot
  const whipS = (t) => Math.exp(M.key(t, [[2.92, 0], [3.4, 2.4, 'inCubic']]));

  S.intro = (c, t) => {
    const z = whipS(t);
    const shake = M.key(t, [[2.4, 0], [2.45, 1, 'outQuad'], [2.85, 0, 'outQuad']]);
    c.save();
    c.translate(W / 2, 560);
    c.scale(z, z);
    c.translate(-W / 2, -560);
    c.save();
    const bgS = 1.03 + t * 0.01;
    c.translate(W / 2, H / 2);
    c.scale(bgS, bgS);
    c.translate(-W / 2, -H / 2);
    c.drawImage(J.sky(), 0, 0);
    c.restore();
    // tiles, far to near
    const order = TILES.map((d, i) => [d, i]).sort((a, b) => a[0][4] - b[0][4]);
    for (const [[slug, x0, y0, s0, depth, steps], i] of order) {
      const t0 = 0.05 + i * 0.07;
      const pop = M.ease.outBack(M.prog(t, t0, t0 + 0.45), 1.8);
      if (pop <= 0) continue;
      const par = [0.6, 1, 1.5][depth];
      const x = x0 + Math.sin(t * 0.7 + i) * 10 * par + (x0 - W / 2) * t * 0.012 * par + Math.sin(t * 61 + i) * shake * 9;
      const y = y0 + Math.cos(t * 0.55 + i * 1.3) * 8 * par + Math.cos(t * 53 + i) * shake * 7;
      let badge = null;
      let bs = 0;
      for (const [bt, n] of steps) {
        if (t >= bt) {
          badge = n;
          // each new count pops the badge
          bs = M.ease.outBack(M.prog(t, bt, bt + 0.22), 2.6);
        }
      }
      // every badge pulses together on "everywhere"
      bs *= 1 + 0.35 * Math.sin(Math.PI * M.prog(t, 2.4, 2.7));
      const s = s0 * 1.35 * [0.86, 1, 1.12][depth] * pop;
      const draw = (l) =>
        slug === 'chat'
          ? chatTile(l, x, y, s, { badge, badgeScale: bs })
          : J.appTile(l, slug, x, y, s, { badge, badgeScale: bs, rot: Math.sin(t * 0.4 + i) * 0.05 });
      const blur = [3, 0, 5][depth];
      if (blur) M.withLayer(c, draw, { blur, alpha: depth === 0 ? 0.85 : 1 });
      else draw(c);
    }
    // the line, re-centring as each word lands
    M.wordLine(
      c,
      INTRO_WORDS.map((w) => Object.assign({ color: '#ffffff', weight: 600 }, w)),
      t,
      { size: 100, x: W / 2, y: 594, dur: 0.3, slide: 60, blurFrom: 14, track: -0.02 }
    );
    c.restore();

    // the rounded frame line
    const a = M.prog(t, 0.6, 0.68) * tw(t, 2.8, 2.92, 1, 0, 'linear');
    if (a > 0) {
      const ins = tw(t, 0.6, 0.82, -12, 21, 'outCubic');
      c.save();
      c.globalAlpha = 0.8 * a;
      M.strokeRR(c, ins, ins - 4, W - ins * 2, H - (ins - 4) * 2, 50, '#f4f7ff', 2);
      c.restore();
    }
    if (t > 0.95 && t < 2.95) {
      const [x, y] = introCursor(t);
      const press = M.key(t, [[2.1, 0], [2.17, 1, 'outQuad'], [2.3, 0, 'outQuad']]);
      M.cursor(c, x, y, 1.15, { press, rot: -0.2, alpha: M.prog(t, 0.95, 1.05) });
    }
    // motion blur of the whip, cheaply: a radial smear from the centre
    if (z > 1.05) {
      const cv = M.scratch();
      const l = cv.getContext('2d');
      l.drawImage(c.canvas, 0, 0);
      for (let i = 1; i <= 4; i++) {
        const k = 1 + (z - 1) * 0.03 * i;
        c.save();
        c.globalAlpha = 0.22;
        c.translate(W / 2, 560);
        c.scale(k, k);
        c.translate(-W / 2, -560);
        c.drawImage(cv, 0, 0);
        c.restore();
      }
      M.release();
    }
  };

  // ---------------------------------------------------------------- montage
  const NOTES = [
    [380, 280, 0.08, '#FFE380', 'fix login??'],
    [740, 250, -0.06, '#FFBDAD', 'ask Sam\nabout API'],
    [1110, 300, 0.05, '#B3D4FF', 'URGENT'],
    [1480, 260, -0.09, '#ABF5D1', 'Q3 plan?'],
    [520, 650, -0.05, '#B3D4FF', 'who owns\nthis?'],
    [890, 690, 0.07, '#FFE380', 'bug #12'],
    [1260, 640, -0.04, '#FFBDAD', 'update\nroadmap'],
    [1620, 700, 0.1, '#FFE380', '???'],
    [180, 620, 0.12, '#ABF5D1', 'call\ndesign'],
  ];
  const stickyWall = (c, k, zoom) => {
    c.fillStyle = M.rgrad(c, 960, 540, 100, 1200, [[0, '#efe8dc'], [1, '#cfc4b2']]);
    c.fillRect(0, 0, W, H);
    c.save();
    const z = zoom + k * 0.05;
    c.translate(960, 540);
    c.scale(z, z);
    c.translate(-960, -540);
    NOTES.forEach(([x, y, r, col, s], i) => {
      const p = M.ease.outBack(M.prog(k, i * 0.025, i * 0.025 + 0.18), 2);
      if (p > 0) J.sticky(c, x, y + (1 - p) * 40, 300 * Math.min(1, 0.6 + p * 0.4), r, col, s);
    });
    c.restore();
  };
  const ROWS = [
    ['Landing page', 'Sam', ['Blocked', '#ffd2cc', '#ae2a19']],
    ['API auth', '??', ['WIP??', '#fff0b3', '#7f5f01']],
    ['Pricing copy', 'Priya', ['Done?', '#dcfff1', '#216e4e']],
    ['Analytics', 'Jordan', ['Blocked', '#ffd2cc', '#ae2a19']],
    ['Mobile nav', '', ['???', '#ebecf0', '#44546f']],
    ['Release notes', 'Alex', ['WIP??', '#fff0b3', '#7f5f01']],
    ['Beta triage', 'Sam', ['see email', '#ebecf0', '#44546f']],
    ['Onboarding', 'Priya', ['Done?', '#dcfff1', '#216e4e']],
    ['Launch video', '??', ['Blocked', '#ffd2cc', '#ae2a19']],
  ];
  const sheet = (c, k) => {
    c.fillStyle = '#d5dbe3';
    c.fillRect(0, 0, W, H);
    const [x0, y0] = J.window(c, 190, 90, 1540, 900, 'roadmap_v7_FINAL_final (2).xlsx', { bar: '#e6f4ea' });
    M.icon(c, 'googlesheets', 290, 122, 34);
    // column letters and grid
    const cols = [x0, x0 + 60, x0 + 520, x0 + 800, x0 + 1100, x0 + 1540];
    c.fillStyle = '#f8f9fa';
    c.fillRect(x0, y0, 1540, 46);
    c.strokeStyle = '#dadce0';
    c.lineWidth = 1.5;
    for (let r = 0; r <= 16; r++) {
      c.beginPath();
      c.moveTo(x0, y0 + 46 + r * 52);
      c.lineTo(x0 + 1540, y0 + 46 + r * 52);
      c.stroke();
    }
    cols.forEach((x) => {
      c.beginPath();
      c.moveTo(x, y0);
      c.lineTo(x, y0 + 900);
      c.stroke();
    });
    ['A', 'B', 'C', 'D'].forEach((L, i) => M.text(c, L, (cols[i + 1] + cols[i + 2]) / 2, y0 + 31, { size: 20, weight: 500, color: '#5f6368', align: 'center' }));
    M.text(c, 'Task', cols[1] + 16, y0 + 46 + 36, { size: 24, weight: 700, color: '#202124' });
    M.text(c, 'Owner', cols[2] + 16, y0 + 46 + 36, { size: 24, weight: 700, color: '#202124' });
    M.text(c, 'Status', cols[3] + 16, y0 + 46 + 36, { size: 24, weight: 700, color: '#202124' });
    M.text(c, 'Last update', cols[4] + 16, y0 + 46 + 36, { size: 24, weight: 700, color: '#202124' });
    ROWS.forEach(([task, who, [st, bg, fg]], r) => {
      const y = y0 + 46 + (r + 1) * 52;
      M.text(c, String(r + 2), x0 + 30, y + 34, { size: 18, color: '#5f6368', align: 'center' });
      M.text(c, task, cols[1] + 16, y + 35, { size: 24, color: '#202124' });
      M.text(c, who, cols[2] + 16, y + 35, { size: 24, color: '#202124' });
      M.fillRR(c, cols[3] + 12, y + 9, 200, 34, 6, bg);
      M.text(c, st, cols[3] + 24, y + 33, { size: 21, weight: 600, color: fg });
      M.text(c, ['last week?', 'see Slack', 'Tuesday', '??', 'ask Sam'][r % 5], cols[4] + 16, y + 35, { size: 24, color: '#80868b' });
    });
    // the selection hops down the status column
    const sr = Math.floor(M.clamp(k / 0.09, 0, 8));
    c.strokeStyle = '#1a73e8';
    c.lineWidth = 4;
    c.strokeRect(cols[3], y0 + 46 + (sr + 1) * 52, cols[4] - cols[3], 52);
  };
  const MAILS = [
    ['Sam K.', 'Re: Re: Fwd: status update', '9:41'],
    ['Jordan', 'any update on the launch?', '9:38'],
    ['Priya', 'quick question re: deadline', '9:30'],
    ['Alex', 'Re: Re: Re: notes from sync', '9:12'],
    ['Sam K.', 'Fwd: who owns the API work?', '8:57'],
    ['Jordan', 'Re: any update?', '8:40'],
    ['Calendar', 'Status sync moved to 3pm', '8:31'],
  ];
  const inbox = (c, k) => {
    c.fillStyle = '#e9edf3';
    c.fillRect(0, 0, W, H);
    J.window(c, 230, 110, 1460, 860, 'Inbox (43)');
    M.icon(c, 'gmail', 330, 142, 34);
    const drop = M.ease.outCubic(M.prog(k, 0.02, 0.14));
    MAILS.forEach(([who, sub, at], i) => {
      const y = 200 + (i - 1 + drop) * 104;
      if (i === 0 && drop <= 0) return;
      c.save();
      c.globalAlpha = i === 0 ? drop : 1;
      c.fillStyle = i < 3 ? '#ffffff' : '#f6f8fc';
      c.fillRect(230, y, 1460, 102);
      c.fillStyle = '#e3e6ea';
      c.fillRect(230, y + 102, 1460, 2);
      J.avatar(c, 310, y + 51, 26, who[0], [C.blue4, C.purple, C.green, C.orange, C.teal][i % 5]);
      M.text(c, who, 360, y + 62, { size: 30, weight: i < 3 ? 700 : 500, color: '#202124' });
      M.text(c, sub, 620, y + 62, { size: 30, weight: i < 3 ? 700 : 400, color: '#202124' });
      M.text(c, at, 1640, y + 62, { size: 26, weight: i < 3 ? 700 : 400, color: '#5f6368', align: 'right' });
      c.restore();
    });
  };
  const CHATS = [
    ['Jordan', 'hey, quick one'],
    ['Jordan', 'where are we on this?'],
    ['Sam', 'not sure, check the sheet?'],
    ['Jordan', 'bumping this ↑'],
  ];
  const chat = (c, k) => {
    c.fillStyle = '#1a1d21';
    c.fillRect(0, 0, W, H);
    CHATS.forEach(([who, msg], i) => {
      const p = M.ease.outBack(M.prog(k, i * 0.04, i * 0.04 + 0.1), 1.8);
      if (p <= 0) return;
      const y = 180 + i * 190;
      J.avatar(c, 420, y + 40, 40, who[0], who === 'Sam' ? C.teal : C.orange);
      M.text(c, who, 490, y + 18, { size: 26, weight: 700, color: '#d1d2d3', alpha: p });
      c.save();
      c.translate(490, y + 40);
      c.scale(p, p);
      J.chatBubble(c, 0, 0, msg, { size: 46, fill: '#2c2f33', ink: '#ececec' });
      c.restore();
    });
  };
  const calendar = (c, k) => {
    c.fillStyle = '#f1f3f4';
    c.fillRect(0, 0, W, H);
    const [x0, y0] = J.window(c, 210, 100, 1500, 880, 'Week of the launch');
    M.icon(c, 'googlecalendar', 310, 132, 34);
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
    const cw = 1500 / 5;
    days.forEach((d, i) => M.text(c, d, x0 + cw * i + cw / 2, y0 + 50, { size: 28, weight: 600, color: '#3c4043', align: 'center' }));
    const BLOCKS = [
      [0, 0, 'Status sync'], [0, 2, 'Standup'], [0, 4, 'Sync re: sync'], [1, 1, 'Status sync'], [1, 3, 'Check-in'],
      [2, 0, 'Standup'], [2, 2, 'Status sync'], [2, 5, 'Retro?'], [3, 1, 'Sync re: sync'], [3, 4, 'Status sync'],
      [4, 0, 'Standup'], [4, 2, 'Status sync'], [4, 3, 'Where are we?'], [1, 5, 'Status sync'], [3, 5, 'Check-in'],
    ];
    BLOCKS.forEach(([d, s, label], i) => {
      const p = M.ease.outCubic(M.prog(k, i * 0.008, i * 0.008 + 0.08));
      if (p <= 0) return;
      const x = x0 + cw * d + 12;
      const y = y0 + 90 + s * 118;
      M.fillRR(c, x, y, (cw - 24) * p, 104, 12, ['#4285F4', '#7986CB', '#33B679', '#F6BF26', '#E67C73'][i % 5]);
      if (p > 0.6) M.text(c, label, x + 18, y + 44, { size: 26, weight: 600, color: '#ffffff' });
    });
  };
  const zoomCall = (c, k) => {
    c.fillStyle = '#111214';
    c.fillRect(0, 0, W, H);
    M.icon(c, 'zoom', 120, 90, 60, '#0B5CFF');
    const people = [['SK', C.teal], ['JL', C.orange], ['AM', C.purple], ['RT', C.green], ['PR', C.red], ['You', C.blue4]];
    people.forEach(([n, col], i) => {
      const x = 180 + (i % 3) * 540;
      const y = 150 + Math.floor(i / 3) * 400;
      M.fillRR(c, x, y, 520, 380, 18, '#232428');
      J.avatar(c, x + 260, y + 180, 82, n, col);
      M.text(c, n === 'You' ? 'You (muted)' : n, x + 22, y + 356, { size: 24, weight: 600, color: '#d0d0d0' });
    });
    const p = M.prog(k, 0.03, 0.08);
    M.fillRR(c, 760, 950, 400, 70, 35, `rgba(255,86,48,${p})`);
    M.text(c, 'You are muted', 960, 996, { size: 30, weight: 700, color: '#ffffff', align: 'center', alpha: p });
  };
  const whiteboard = (c, k) => {
    c.fillStyle = '#d9dde3';
    c.fillRect(0, 0, W, H);
    c.save();
    c.shadowColor = 'rgba(0,0,0,0.25)';
    c.shadowBlur = 30;
    M.fillRR(c, 150, 90, 1620, 900, 16, '#fbfcfd');
    c.restore();
    c.font = `700 92px ${J.HAND}`;
    c.fillStyle = '#1f4fbf';
    c.fillText('SPRINT PLAN??', 300, 260);
    c.font = `600 64px ${J.HAND}`;
    c.fillStyle = '#c0362c';
    c.fillText('launch → ??? → done?', 330, 420);
    c.fillStyle = '#2b2b2b';
    c.fillText('who: Sam? Jordan?', 330, 560);
    c.fillText('when: next wk (maybe)', 330, 680);
    c.strokeStyle = '#c0362c';
    c.lineWidth = 8;
    const p = M.ease.outCubic(M.prog(k, 0.02, 0.15));
    c.beginPath();
    c.ellipse(1340, 540, 260 * p, 170 * p, -0.2, 0, Math.PI * 2 * p);
    c.stroke();
    c.font = `700 76px ${J.HAND}`;
    c.fillStyle = '#c0362c';
    c.fillText('URGENT', 1205, 565);
  };
  const doc = (c, k) => {
    c.fillStyle = '#e4e7eb';
    c.fillRect(0, 0, W, H);
    c.save();
    c.shadowColor = 'rgba(0,0,0,0.2)';
    c.shadowBlur = 30;
    c.fillStyle = '#ffffff';
    c.fillRect(460, 60, 1000, 1100);
    c.restore();
    M.text(c, 'Status update (FINAL v3)', 540, 190, { size: 50, weight: 700, color: '#202124' });
    const lines = ['Launch is on track', 'Login bug: fixed?', 'API: waiting on Sam', 'Design: see Figma', 'Next steps: TBD'];
    lines.forEach((s, i) => {
      const y = 300 + i * 110;
      const w = M.text(c, s, 540, y, { size: 38, color: '#3c4043' });
      if (i === 0 || i === 4) {
        c.fillStyle = '#d93025';
        c.fillRect(540, y - 13, w * M.ease.outCubic(M.prog(k, 0.03 + i * 0.01, 0.12 + i * 0.01)), 4);
      }
    });
  };
  const notifications = (c, k) => {
    c.fillStyle = M.vgrad(c, 0, H, [[0, '#2b3a67'], [1, '#6b4fa0']]);
    c.fillRect(0, 0, W, H);
    const items = [
      ['Reminder', 'Send the weekly status'],
      ['Messages', '3 new: "any update?"'],
      ['Calendar', 'Status sync in 5 min'],
      ['Mail', 'Re: Re: Fwd: status update'],
    ];
    items.forEach(([app, msg], i) => {
      const p = M.ease.outBack(M.prog(k, i * 0.035, i * 0.035 + 0.1), 1.6);
      if (p <= 0) return;
      const y = 160 + i * 200 - (1 - p) * 60;
      c.save();
      c.globalAlpha = Math.min(1, p);
      M.fillRR(c, 560, y, 800, 170, 38, 'rgba(245,245,250,0.92)');
      M.fillRR(c, 600, y + 40, 90, 90, 22, [C.orange, C.green, C.blue4, C.red][i]);
      M.text(c, app, 720, y + 72, { size: 30, weight: 700, color: '#1c1c1e' });
      M.text(c, msg, 720, y + 122, { size: 34, color: '#3a3a3c' });
      c.restore();
    });
  };
  const anyUpdate = (c, k, bg, size, many) => {
    c.fillStyle = bg;
    c.fillRect(0, 0, W, H);
    if (!many) {
      const p = M.ease.outBack(M.prog(k, 0, 0.12), 2);
      const w = M.measure(c, 'any update?', size, 500) + size * 1.2;
      c.save();
      c.translate(960, 540);
      c.scale(p, p);
      J.chatBubble(c, -w / 2, -size * 0.95, 'any update?', { size });
      c.restore();
      return;
    }
    // they pile up until the screen is full of them
    const r = M.rng(77);
    const n = Math.floor(M.clamp(k / 0.7, 0, 1) * 60);
    for (let i = 0; i < n; i++) {
      const s = r.range(30, 90);
      const x = r.range(-80, W - 200);
      const y = r.range(-40, H - 80);
      const born = (i / 60) * 0.7;
      const p = M.ease.outBack(M.prog(k, born, born + 0.1), 2);
      const pal = [['#ffffff', C.navy], [C.blue4, '#ffffff'], ['#FFE380', '#3b2f00'], [C.purple, '#ffffff'], ['#ABF5D1', '#06402b']][i % 5];
      c.save();
      c.translate(x, y);
      c.scale(p, p);
      J.chatBubble(c, 0, 0, 'any update?', { size: s, fill: pal[0], ink: pal[1], tail: r() < 0.5 ? 'left' : 'right' });
      c.restore();
    }
    // a white flash hands over to "But..."
    const f = M.prog(k, 0.85, 1.0);
    if (f > 0) {
      c.fillStyle = `rgba(255,255,255,${f})`;
      c.fillRect(0, 0, W, H);
    }
  };

  const CARDS = [
    { at: 3.4, cap: 'Sticky Notes', draw: (c, k) => stickyWall(c, k, 1) },
    { at: 3.88, cap: 'Spreadsheet Tracker', draw: sheet },
    { at: 4.44, cap: 'Email Thread', draw: inbox },
    { at: 4.66, cap: 'Team Chat', draw: chat, light: true },
    { at: 4.88, cap: 'Status Meetings', draw: calendar },
    { at: 5.1, cap: 'Another Call', draw: zoomCall, light: true },
    { at: 5.31, cap: 'Whiteboard Plan', draw: whiteboard },
    { at: 5.51, cap: 'status_update_FINAL.docx', draw: doc },
    { at: 5.71, cap: 'Notifications', draw: notifications, light: true },
    { at: 5.91, cap: 'Sticky Notes', draw: (c, k) => stickyWall(c, k + 0.3, 1.25) },
    { at: 6.1, cap: 'any update?', draw: (c, k) => anyUpdate(c, k, C.blue1, 70) },
    { at: 6.36, cap: 'any update?', draw: (c, k) => anyUpdate(c, k, '#FFE380', 120) },
    { at: 6.62, cap: 'any update?', draw: (c, k) => anyUpdate(c, k, C.blue4, 0, true), light: true },
  ];
  S.montage = (c, t) => {
    let i = CARDS.length - 1;
    while (i > 0 && t < CARDS[i].at) i--;
    const cd = CARDS[i];
    const z = 1.16 + (t - cd.at) * 0.08;
    c.save();
    c.translate(W / 2, H / 2);
    c.scale(z, z);
    c.translate(-W / 2, -H / 2);
    cd.draw(c, t - cd.at);
    c.restore();
    M.caption(c, cd.cap, { y: 1006, color: cd.light ? 'rgba(255,255,255,0.6)' : 'rgba(9,30,66,0.5)' });
  };

  // ---------------------------------------------------------------- But...
  // spring rise with one upward overshoot (same feel as the One Button piece)
  const RISE = [[0, 520], [0.12, -60, 'outQuad'], [0.17, -105, 'outQuad'], [0.45, 0, 'inOutCubic']];
  const rise = (t, t0) => {
    const u = t - t0;
    if (u <= 0) return { y: 520, a: 0, blur: 0 };
    const y = M.key(u, RISE);
    const v = Math.abs(M.key(u + 0.01, RISE) - y);
    return { y, a: M.clamp(u / 0.06, 0, 1), blur: Math.min(30, v * 1.6) };
  };
  const BUT = { size: 486, base: 718, letters: [['B', 443, 7.555], ['u', 739, 7.585], ['t', 980, 7.62]], dots: [[1164, 7.81], [1292, 7.87], [1418, 7.92]] };
  const BUT_DX = {
    B: [[7.55, -110], [8.05, 0, 'outCubic']],
    u: [[7.58, -150], [8.0, 0, 'outCubic']],
    t: [[7.62, -300], [7.73, 50, 'outQuad'], [7.8, 0, 'inOutQuad']],
  };
  const drawBut = (c, t) => {
    const g = M.ease.inOutQuad(M.prog(t, 7.88, 8.06));
    c.save();
    c.translate(W / 2, H / 2);
    c.scale(1.12, 1.12);
    c.translate(-W / 2, -H / 2 + 40);
    if (g > 0) c.filter = `saturate(${1 - 0.6 * g}) brightness(${1 - 0.3 * g}) blur(${g * 3}px)`;
    c.drawImage(J.sky(), 0, 0);
    c.restore();
    for (const [ch, ix, t0] of BUT.letters) {
      const r = rise(t, t0);
      if (r.a <= 0) continue;
      const x = M.inkX(c, ch, ix, BUT.size, 500) + M.key(t, BUT_DX[ch]);
      M.withLayer(
        c,
        (l) => {
          const n = r.blur > 9 ? 7 : 1;
          for (let i = 0; i < n; i++) M.text(l, ch, x, BUT.base + r.y + (i - (n - 1) / 2) * r.blur * 0.45, { size: BUT.size, weight: 500, color: '#ffffff', alpha: n === 1 ? 1 : 0.26 });
        },
        { alpha: r.a, blur: r.blur * 0.25 }
      );
    }
    for (const [x, t0] of BUT.dots) {
      const r = rise(t, t0);
      if (r.a <= 0) continue;
      const sink = tw(t, t0 + 0.2, t0 + 0.45, -25, 0, 'inOutQuad');
      c.save();
      c.globalAlpha = r.a;
      c.fillStyle = '#fff';
      c.beginPath();
      c.arc(x + 26, BUT.base - 26 + r.y * 0.5 + sink, 26, 0, Math.PI * 2);
      c.fill();
      c.restore();
    }
  };

  // the typed line; the caret jumps ahead and each glyph blurs in just after
  const TYPE = 'But,what if one board';
  const BOLD_FROM = 16;
  const KEYS = [8.32, 8.36, 8.4, 8.46, 8.5, 8.58, 8.65, 8.69, 8.74, 8.82, 8.88, 8.94, 9.0, 9.05, 9.09, 9.13, 9.18, 9.24, 9.3, 9.36, 9.42];
  const TSIZE = 500;
  const TBASE = 720;
  // on-screen x of the caret, then a whip off to the left into "Meet Jira"
  const CARET = [
    [8.774, 1191], [8.871, 1239], [8.968, 1276], [9.064, 1344], [9.16, 1420], [9.257, 1482], [9.355, 1520],
    [9.453, 1536], [9.6, 1534], [9.75, 1500], [9.9, 1420], [10.05, 1280], [10.25, 300],
  ];
  const CARD = [
    [8.08, 0, 1920], [8.15, 40, 1880], [8.24, 110, 1800], [8.29, 190, 1730], [8.339, 287, 1643], [8.387, 417, 1520],
    [8.435, 561, 1375], [8.483, 759, 1193], [8.531, 840, 1169], [8.579, 967, 1161], [8.627, 1016, 1168],
    [8.677, 1100, 1194], [8.724, 1133, 1211], [8.774, 1191, 1243],
  ];
  const cardAt = (t) => {
    let i = 0;
    while (i < CARD.length - 2 && t > CARD[i + 1][0]) i++;
    const [t0, a0, b0] = CARD[i];
    const [t1, a1, b1] = CARD[i + 1];
    const u = M.clamp((t - t0) / (t1 - t0), 0, 1);
    return [M.lerp(a0, a1, u), M.lerp(b0, b1, u)];
  };
  const widths = {};
  const typedWidth = (c, n) => {
    if (widths[n] === undefined) {
      const head = TYPE.slice(0, Math.min(n, BOLD_FROM));
      const tail = TYPE.slice(BOLD_FROM, Math.max(BOLD_FROM, n));
      widths[n] = M.measure(c, head, TSIZE, 500, -0.02) + (tail ? M.measure(c, tail, TSIZE, 800, -0.02) : 0);
    }
    return widths[n];
  };
  const caretWorld = (c, t) => {
    let n = 0;
    while (n < KEYS.length && t >= KEYS[n]) n++;
    if (n === 0) return 0;
    return M.lerp(typedWidth(c, n - 1), typedWidth(c, n), M.ease.outCubic(M.clamp((t - KEYS[n - 1]) / 0.025, 0, 1))) + 47;
  };
  const drawTypedText = (c, t, off) => {
    for (let i = 0; i < KEYS.length; i++) {
      const p = M.prog(t, KEYS[i] + 0.025, KEYS[i] + 0.12);
      if (p <= 0) break;
      const ch = TYPE[i];
      if (ch === ' ') continue;
      const x = off + typedWidth(c, i);
      const bold = i >= BOLD_FROM;
      const o = { size: TSIZE, weight: bold ? 800 : 500, color: bold ? C.blue : C.ink, track: -0.02, blurFrom: 20 };
      if (p >= 1) M.text(c, ch, x, TBASE, o);
      else M.blurWord(c, ch, x, TBASE, M.ease.outQuad(p), o);
    }
  };
  const pastel = () =>
    M.pic('jira-pastel', W, H, (c) => {
      const r = M.rng(32);
      c.fillStyle = '#f2f6ff';
      c.fillRect(0, 0, W, H);
      c.filter = 'blur(90px)';
      for (let i = 0; i < 22; i++) {
        c.globalAlpha = r.range(0.35, 0.8);
        c.fillStyle = r() < 0.65 ? '#cfe1ff' : '#e8e2ff';
        c.beginPath();
        c.ellipse(r() * W, r.range(200, 950), r.range(150, 380), r.range(120, 260), 0, 0, Math.PI * 2);
        c.fill();
      }
      c.filter = 'none';
      c.globalAlpha = 1;
    });
  const caretX = (t) => (t < 8.774 ? cardAt(t)[0] : M.key(t, CARET.map(([a, b]) => [a, b, 'linear'])));

  S.but = (c, t) => {
    if (t < 8.08) return drawBut(c, t);
    c.drawImage(pastel(), 0, 0);
    const screenCaret = caretX(t);
    const off = screenCaret - caretWorld(c, t);
    const v = Math.abs(off - (caretX(t - 0.02) - caretWorld(c, t - 0.02)));
    const spread = v * 0.6;
    const n = M.clamp(Math.round(spread / 3), 1, 16);
    M.withLayer(
      c,
      (l) => {
        for (let i = 0; i < n; i++) {
          l.globalAlpha = 1 / (i + 1);
          drawTypedText(l, t, off - (i / Math.max(1, n - 1) - 0.5) * spread);
        }
      },
      { blur: Math.min(3, spread / 25) }
    );
    const dim = M.key(t, [[8.08, 0.92], [8.25, 0.8], [8.34, 0.28, 'inQuad'], [8.46, 0, 'outQuad']]);
    if (dim > 0) {
      c.fillStyle = `rgba(6,18,40,${dim})`;
      c.fillRect(0, 0, W, H);
    }
    if (t < 8.774) {
      // the "But..." shot narrows into the caret, darkening as it goes
      const [x0, x1] = cardAt(t);
      const k = M.prog(t, 7.95, 8.4);
      const top = M.lerp(0, 231, M.prog(t, 8.3, 8.72));
      const bot = M.lerp(H, 852, M.prog(t, 8.3, 8.72));
      M.withLayer(c, (l) => {
        l.save();
        l.beginPath();
        l.rect(x0, top, x1 - x0, bot - top);
        l.clip();
        const s = M.lerp(1, 0.86, k);
        l.translate(W / 2, H / 2);
        l.scale(s, s);
        l.translate(-W / 2, -H / 2);
        drawBut(l, t);
        l.restore();
        l.globalCompositeOperation = 'source-atop';
        l.fillStyle = `rgba(9,30,66,${0.15 * k + 0.8 * M.prog(t, 8.36, 8.58)})`;
        l.fillRect(0, 0, W, H);
      });
    } else {
      // caret, blinking while it waits
      const blink = t > 9.5 && t < 9.95 ? (Math.floor((t - 9.5) / 0.22) % 2 === 0 ? 1 : 0.15) : 1;
      c.fillStyle = `rgba(9,30,66,${blink})`;
      c.fillRect(screenCaret, 231, 52, 621);
    }
  };
})();
