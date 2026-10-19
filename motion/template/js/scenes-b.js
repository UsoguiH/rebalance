// Template scenes, part B: the reveal (the brand tile and wordmark, then the
// product's own UI living through three beats), "No more <pain>.", and the 3D
// arch of the second "No more ...". Times are on each scene's own clock.
(function () {
  const S = M.scenes;
  const T = M.tpl;
  const C = T.C;
  const K = M.CONTENT;
  const R = K.reveal;
  const { W, H } = M;

  // ---------------------------------------------------------------- the reveal
  // The product UI lives in one panel. Its beats, on this scene's clock:
  //   11.4  the hero element arrives         12.0-12.42  first action (cursor)
  //   12.56-12.94  second action, then done  12.95 confetti, 13.08-13.24 quick restyles
  const PANEL = { x: 210, y: 140, w: 1500, h: 820 };
  const A1 = [12.0, 12.42];
  const A2 = [12.56, 12.94];
  const THEMES = [[0, 'light'], [13.08, 'dark'], [13.16, 'brand'], [13.24, 'light']];
  const theme = (name) => {
    const dark = name === 'dark';
    const brand = name === 'brand';
    return {
      name,
      dark,
      brand,
      bg: dark ? '#1d2125' : brand ? C.brand : '#ffffff',
      fg: dark || brand ? '#ffffff' : C.navy,
      sub: dark ? '#9fadbc' : brand ? 'rgba(255,255,255,0.75)' : C.sub,
      well: dark ? '#161a1d' : brand ? 'rgba(255,255,255,0.16)' : C.page,
      card: dark ? 'dark' : 'light',
    };
  };
  // the panel chrome: shadowed sheet, title, subtitle, avatars and the action button
  const chrome = (c, th) => {
    c.save();
    c.shadowColor = 'rgba(9,30,66,0.25)';
    c.shadowBlur = 60;
    c.shadowOffsetY = 20;
    M.fillRR(c, PANEL.x, PANEL.y, PANEL.w, PANEL.h, 28, th.bg);
    c.restore();
    const title = R.title || K.brand.name;
    const tw = M.text(c, title, 330, 222, { size: T.fit(c, title, 36, 700, 560), weight: 700, color: th.fg });
    if (R.subtitle) M.text(c, R.subtitle, 330 + tw + 40, 220, { size: T.fit(c, R.subtitle, 24, 500, 1380 - 370 - tw), weight: 500, color: th.sub });
    ['NK', 'SK', 'AM', 'JL'].forEach((n, i) => T.avatar(c, 1430 + i * 30, 210, 22, n, [C.red, C.teal, C.purple, C.orange][i]));
    M.fillRR(c, 1555, 186, 120, 48, 8, th.brand ? C.purple : C.brand);
    const btn = R.button || 'Share';
    M.text(c, btn, 1615, 218, { size: T.fit(c, btn, 22, 700, 100), weight: 700, color: '#ffffff', align: 'center' });
  };
  const HERO = {};

  // --- board: columns of cards; a new card drops in and is dragged across to done
  {
    const COLS = [250, 730, 1210];
    const CW = 460;
    const CARD_W = 428;
    const CARD_H = 116;
    const GAP = 14;
    const slot = (col, idx) => [COLS[col] + 16, 336 + idx * (CARD_H + GAP)];
    // where each card sits over time: [t, col, idx]; moves ease over 0.22s
    const PLAN = [
      [[0, 0, 0], [11.42, 0, 1], [12.05, 0, 0]],
      [[0, 0, 1], [11.44, 0, 2], [12.07, 0, 1]],
      [[0, 0, 2], [11.46, 0, 3], [12.09, 0, 2]],
      [[0, 1, 0], [12.28, 1, 1], [12.62, 1, 0]],
      [[0, 1, 1], [12.3, 1, 2], [12.64, 1, 1]],
      [[0, 2, 0], [12.76, 2, 1]],
      [[0, 2, 1], [12.78, 2, 2]],
      [[0, 2, 2], [12.8, 2, 3]],
    ];
    const cardPos = (i, t) => {
      const ks = PLAN[i];
      let j = 0;
      while (j < ks.length - 1 && t >= ks[j + 1][0]) j++;
      const [x1, y1] = slot(ks[j][1], ks[j][2]);
      if (j === 0) return [x1, y1];
      const [x0, y0] = slot(ks[j - 1][1], ks[j - 1][2]);
      const u = M.ease.outCubic(M.prog(t, ks[j][0], ks[j][0] + 0.22));
      return [M.lerp(x0, x1, u), M.lerp(y0, y1, u)];
    };
    const heroPos = (t) => {
      const [ax, ay] = slot(0, 0);
      const [bx, by] = slot(1, 0);
      const [cx, cy] = slot(2, 0);
      if (t < A1[0]) return { x: ax, y: ay - (1 - M.ease.outBack(M.prog(t, 11.4, 11.66), 1.4)) * 260, lift: 0, rot: 0 };
      const leg = (t0, t1, x0, y0, x1, y1) => {
        const u = M.ease.inOutCubic(M.prog(t, t0, t1));
        const lift = Math.sin(Math.PI * M.prog(t, t0 - 0.05, t1 + 0.08));
        return { x: M.lerp(x0, x1, u), y: M.lerp(y0, y1, u) - Math.sin(Math.PI * u) * 60, lift, rot: Math.sin(Math.PI * u) * 0.06 };
      };
      if (t < A2[0]) return leg(A1[0], A1[1], ax, ay, bx, by);
      return leg(A2[0], A2[1], bx, by, cx, cy);
    };
    const names = R.columns || ['TO DO', 'IN PROGRESS', 'DONE'];
    HERO.board = {
      draw(c, t, th) {
        chrome(c, th);
        const counts = [t < 11.42 ? 3 : t < 12.05 ? 4 : 3, t < 12.3 ? 2 : t < 12.62 ? 3 : 2, t < 12.78 ? 3 : 4];
        COLS.forEach((x, i) => {
          M.fillRR(c, x, 270, CW, 660, 16, th.well);
          M.text(c, `${names[i]}  ${counts[i]}`, x + 20, 310, { size: 20, weight: 700, color: th.dark ? '#9fadbc' : th.brand ? '#ffffff' : C.sub, track: 0.04 });
        });
        for (let i = 0; i < 8; i++) {
          const [x, y] = cardPos(i, t);
          T.card(c, x, y, CARD_W, CARD_H, i, { theme: th.card });
        }
        if (t >= 11.4) {
          const h = heroPos(t);
          const done = M.prog(t, A2[1], A2[1] + 0.3);
          c.save();
          c.globalAlpha *= M.prog(t, 11.4, 11.46);
          T.card(c, h.x, h.y, CARD_W, CARD_H, T.ITEMS.length > 8 ? 8 : 0, { lift: h.lift, rot: h.rot, theme: th.card, done });
          c.restore();
          if (t < 11.75) {
            // a sparkle where it lands
            const sp = M.prog(t, 11.55, 11.75);
            c.save();
            c.globalAlpha = 1 - sp;
            c.strokeStyle = C.light;
            c.lineWidth = 4;
            M.rr(c, h.x - sp * 20, h.y - sp * 20, CARD_W + sp * 40, CARD_H + sp * 40, 14);
            c.stroke();
            c.restore();
          }
        }
      },
      burst: () => [slot(2, 0)[0] + CARD_W / 2, slot(2, 0)[1] + CARD_H / 2],
      cursor(t) {
        const h = heroPos(t);
        const grab = [h.x + 300, h.y + 64];
        if (t < 11.98) return M.track(t, [[11.62, 1400, 1150], [11.8, 900, 700], [11.98, grab[0], grab[1]]]);
        if (t < A2[1] + 0.02) return grab;
        return M.track(t, [[A2[1] + 0.02, grab[0], grab[1]], [13.15, grab[0] + 260, grab[1] + 260]]);
      },
      press: (t) => (t > A1[0] - 0.03 && t < A1[1]) || (t > A2[0] - 0.03 && t < A2[1]),
    };
  }

  // --- dashboard: KPI tiles count up, a chart grows, and the newest row turns done
  {
    const kpis = R.kpis || [['Total', 1280, '', '+12%'], ['Active', 640, '', '+8%'], ['Done', 312, '', '+21%']];
    const rows = R.rows || [['Item #1042', ''], ['Item #1041', ''], ['Item #1040', ''], ['Item #1039', '']];
    const [pending, done] = R.status || ['Pending', 'Done'];
    const BARS = R.chart || [0.42, 0.55, 0.48, 0.62, 0.58, 0.7, 0.66, 0.78, 0.74, 0.86, 0.82, 0.95];
    const fmt = (v, pre) => pre + Math.round(v).toLocaleString('en-US');
    const KX = [250, 730, 1210];
    const CH = { x: 250, y: 450, w: 900, h: 480 };
    const LS = { x: 1190, y: 450, w: 480 };
    const rowY = (i) => LS.y + 70 + i * 96;
    HERO.dashboard = {
      draw(c, t, th) {
        chrome(c, th);
        // KPI tiles: they count up as the panel arrives; the first one pulses on the first action
        kpis.slice(0, 3).forEach(([label, value, pre, delta], i) => {
          const x = KX[i];
          M.fillRR(c, x, 270, 460, 150, 16, th.well);
          M.text(c, label, x + 24, 312, { size: T.fit(c, label, 22, 600, 300), weight: 600, color: th.sub });
          const grow = M.ease.outCubic(M.prog(t, 11.1 + i * 0.06, 11.7 + i * 0.06));
          const bump = i === 0 ? M.ease.outCubic(M.prog(t, A1[0] + 0.1, A1[1])) : 0;
          const v = value * (0.6 + 0.4 * grow) * (1 + 0.04 * bump);
          const s = fmt(v, pre || '');
          M.text(c, s, x + 24, 392, { size: T.fit(c, fmt(value * 1.04, pre || ''), 54, 700, 300), weight: 700, color: th.fg, track: -0.01 });
          if (delta) T.lozenge(c, x + 460 - 24 - (M.measure(c, delta, 18, 700, 0.02) + 16), 304, delta, th.dark ? '#1c3a2e' : '#dcfff1', th.dark ? '#7ee2b8' : '#216e4e');
          if (i === 0 && t > A1[0] && t < A1[1] + 0.3) {
            const r = M.prog(t, A1[0] + 0.05, A1[1] + 0.3);
            c.save();
            c.globalAlpha = 1 - r;
            c.strokeStyle = C.light;
            c.lineWidth = 4;
            M.rr(c, x - r * 16, 270 - r * 16, 460 + r * 32, 150 + r * 32, 18);
            c.stroke();
            c.restore();
          }
        });
        // the chart: bars rise with the hero beat, then a trend line draws over them
        M.fillRR(c, CH.x, CH.y, CH.w, CH.h, 16, th.well);
        M.text(c, R.chartLabel || 'Last 12 weeks', CH.x + 24, CH.y + 44, { size: 22, weight: 600, color: th.sub });
        const bw = (CH.w - 80) / BARS.length;
        const base = CH.y + CH.h - 36;
        const top = CH.y + 80;
        const pts = [];
        BARS.forEach((b, i) => {
          const g = M.ease.outBack(M.prog(t, 11.4 + i * 0.025, 11.7 + i * 0.025), 1.4);
          const hh = (base - top) * b * g;
          const x = CH.x + 40 + i * bw + bw * 0.18;
          if (hh > 1) M.fillRR(c, x, base - hh, bw * 0.64, hh, 8, i === BARS.length - 1 ? C.brand : th.dark ? '#2c333a' : th.brand ? 'rgba(255,255,255,0.35)' : C.tint);
          pts.push([x + bw * 0.32, base - (base - top) * b - 24]);
        });
        const ln = M.ease.inOutCubic(M.prog(t, A1[0], A1[1]));
        if (ln > 0) {
          c.save();
          c.strokeStyle = th.brand ? '#ffffff' : C.light;
          c.lineWidth = 6;
          c.lineCap = 'round';
          c.lineJoin = 'round';
          const n = ln * (pts.length - 1);
          c.beginPath();
          pts.forEach(([x, y], i) => {
            if (i > Math.ceil(n)) return;
            const [px, py] = i > n ? [M.lerp(pts[i - 1][0], x, n - (i - 1)), M.lerp(pts[i - 1][1], y, n - (i - 1))] : [x, y];
            if (i) c.lineTo(px, py);
            else c.moveTo(px, py);
          });
          c.stroke();
          c.restore();
        }
        // the list: the newest row slides in, then its status flips to done
        M.text(c, R.listLabel || 'Latest', LS.x, LS.y + 30, { size: 22, weight: 600, color: th.sub });
        rows.slice(0, 4).forEach(([name, amount], i) => {
          const isNew = i === 0;
          const enter = isNew ? M.ease.outBack(M.prog(t, 11.4, 11.66), 1.4) : 1;
          if (enter <= 0) return;
          // the older rows step down to make room for the new one
          const y = isNew ? rowY(0) - (1 - enter) * 60 : M.lerp(rowY(i - 1), rowY(i), M.ease.outCubic(M.prog(t, 11.4, 11.62)));
          c.save();
          c.globalAlpha *= M.clamp(enter, 0, 1);
          M.fillRR(c, LS.x, y, LS.w, 84, 14, th.dark ? '#22272b' : '#ffffff');
          c.save();
          c.globalAlpha *= 0.6;
          M.strokeRR(c, LS.x, y, LS.w, 84, 14, th.dark ? '#38414a' : C.line, 2);
          c.restore();
          M.text(c, name, LS.x + 22, y + 36, { size: T.fit(c, name, 24, 600, 250), weight: 600, color: th.dark ? '#dee4ea' : C.navy });
          if (amount) M.text(c, amount, LS.x + 22, y + 66, { size: 20, weight: 500, color: th.dark ? '#9fadbc' : C.sub });
          const flip = isNew ? M.prog(t, A2[1] - 0.04, A2[1] + 0.1) : 1;
          const st = flip > 0.5 ? done : pending;
          const [bg, fg] = flip > 0.5 ? ['#dcfff1', '#216e4e'] : ['#fff0b3', '#7f5f01'];
          const lw = M.measure(c, st.toUpperCase(), 17, 700, 0.02) + 16;
          T.lozenge(c, LS.x + LS.w - 22 - lw, y + 42, st.toUpperCase(), bg, fg, 17);
          if (isNew) T.check(c, LS.x + LS.w - 40 - lw, y + 42, 15, M.prog(t, A2[1], A2[1] + 0.3));
          c.restore();
        });
      },
      burst: () => [LS.x + LS.w / 2, rowY(0) + 42],
      cursor(t) {
        const a = [KX[0] + 300, 360];
        const b = [LS.x + LS.w - 70, rowY(0) + 44];
        if (t < A1[0]) return M.track(t, [[11.62, 1400, 1150], [11.8, 900, 700], [11.98, a[0], a[1]]]);
        if (t < A2[0]) return M.track(t, [[A1[1], a[0], a[1]], [A2[0] - 0.02, b[0], b[1]]]);
        if (t < A2[1] + 0.02) return b;
        return M.track(t, [[A2[1] + 0.02, b[0], b[1]], [13.15, b[0] + 200, b[1] + 260]]);
      },
      press: (t) => (t > A1[0] - 0.03 && t < A1[0] + 0.12) || (t > A2[1] - 0.12 && t < A2[1] + 0.02),
    };
  }

  // --- chat: the prompt is typed and sent, the answer streams in, the result card lands
  {
    const prompt = R.prompt || 'Do the thing for me';
    const reply = R.reply || ['Done. Here it is.'];
    const result = R.result || [K.brand.name, 'Ready'];
    const BOX = { x: 330, y: 820, w: 1260, h: 92 };
    const SEND = [BOX.x + BOX.w - 56, BOX.y + BOX.h / 2];
    const typedN = (t) => Math.floor(M.clamp((t - 11.42) / 0.42, 0, 1) * prompt.length);
    HERO.chat = {
      draw(c, t, th) {
        chrome(c, th);
        const sent = t >= 11.98;
        // the user's message bubble, right-aligned once sent
        if (sent) {
          const p = M.ease.outBack(M.prog(t, 11.98, 12.2), 1.6);
          const size = T.fit(c, prompt, 34, 500, 900);
          const w = M.measure(c, prompt, size, 500) + size * 1.2;
          c.save();
          c.globalAlpha *= M.clamp(p, 0, 1);
          c.translate(1590 - w, 300 + (1 - p) * 40);
          T.chatBubble(c, 0, 0, prompt, { size, fill: C.brand, ink: '#ffffff', tail: 'right' });
          c.restore();
        }
        // the answer streams in word by word with the first action
        if (t > A1[0] + 0.05) {
          T.brandTile(c, 362, 452, 56, { flat: true });
          let n = Math.floor(M.prog(t, A1[0] + 0.05, A1[1] + 0.1) * reply.join(' ').split(' ').length + 0.999);
          reply.slice(0, 3).forEach((ln, i) => {
            const ws = ln.split(' ');
            const shown = ws.slice(0, Math.max(0, n)).join(' ');
            n -= ws.length;
            if (shown) M.text(c, shown, 410, 466 + i * 52, { size: T.fit(c, ln, 32, 500, 1160), weight: 500, color: th.fg });
          });
        }
        // the result card pops with the second action and is ticked done
        const rp = M.ease.outBack(M.prog(t, A2[0], A2[0] + 0.24), 1.5);
        if (rp > 0) {
          c.save();
          c.globalAlpha *= M.clamp(rp * 1.5, 0, 1);
          c.translate(410, 650);
          c.scale(0.9 + 0.1 * rp, 0.9 + 0.1 * rp);
          c.save();
          c.shadowColor = 'rgba(9,30,66,0.2)';
          c.shadowBlur = 30;
          c.shadowOffsetY = 10;
          M.fillRR(c, 0, -60, 640, 120, 18, th.dark ? '#22272b' : '#ffffff');
          c.restore();
          T.brandTile(c, 60, 0, 72, {});
          M.text(c, result[0], 116, -6, { size: T.fit(c, result[0], 30, 700, 400), weight: 700, color: th.dark ? '#dee4ea' : C.navy });
          if (result[1]) M.text(c, result[1], 116, 30, { size: T.fit(c, result[1], 22, 500, 400), weight: 500, color: th.dark ? '#9fadbc' : C.sub });
          T.check(c, 590, 0, 20, M.prog(t, A2[1], A2[1] + 0.3));
          c.restore();
        }
        // the input box, typing the prompt until it is sent
        M.fillRR(c, BOX.x, BOX.y, BOX.w, BOX.h, BOX.h / 2, th.well);
        const typed = sent ? '' : prompt.slice(0, typedN(t));
        const ps = T.fit(c, prompt, 30, 500, BOX.w - 160);
        if (typed) M.text(c, typed, BOX.x + 40, BOX.y + BOX.h / 2 + 11, { size: ps, weight: 500, color: th.fg });
        else M.text(c, R.placeholder || 'Ask anything…', BOX.x + 40, BOX.y + BOX.h / 2 + 11, { size: 30, weight: 500, color: th.sub, alpha: 0.7 });
        if (!sent && t > 11.42 && Math.floor(t / 0.25) % 2 === 0) {
          const cx = BOX.x + 44 + M.measure(c, typed, ps, 500);
          c.fillStyle = th.fg;
          c.fillRect(cx, BOX.y + 26, 3, BOX.h - 52);
        }
        c.fillStyle = C.brand;
        c.beginPath();
        c.arc(SEND[0], SEND[1], 30, 0, Math.PI * 2);
        c.fill();
        c.strokeStyle = '#ffffff';
        c.lineWidth = 5;
        c.lineCap = 'round';
        c.lineJoin = 'round';
        c.beginPath();
        c.moveTo(SEND[0], SEND[1] + 13);
        c.lineTo(SEND[0], SEND[1] - 13);
        c.moveTo(SEND[0] - 11, SEND[1] - 2);
        c.lineTo(SEND[0], SEND[1] - 13);
        c.lineTo(SEND[0] + 11, SEND[1] - 2);
        c.stroke();
      },
      burst: () => [1000, 650],
      cursor(t) {
        const done = [1000, 668];
        if (t < 11.98) return M.track(t, [[11.62, 1400, 1150], [11.8, 1500, 960], [11.96, SEND[0] + 6, SEND[1] + 8]]);
        if (t < A2[1]) return M.track(t, [[11.98, SEND[0] + 6, SEND[1] + 8], [A2[0], 1300, 760], [A2[1] - 0.04, done[0], done[1]]]);
        return M.track(t, [[A2[1], done[0], done[1]], [13.15, done[0] + 240, done[1] + 240]]);
      },
      press: (t) => (t > 11.93 && t < 12.03) || (t > A2[1] - 0.1 && t < A2[1] + 0.02),
    };
  }
  T.HERO = HERO;

  S.reveal = (c, t) => {
    const hero = HERO[R.type] || HERO.board;
    c.fillStyle = M.rgrad(c, 960, 480, 100, 1300, [[0, '#ffffff'], [1, C.wash]]);
    c.fillRect(0, 0, W, H);
    // logo beat: the tile springs in, the wordmark slides out from behind it
    const pull = M.ease.inOutCubic(M.prog(t, 11.0, 11.42));
    const pop = M.ease.outBack(M.prog(t, 10.27, 10.62), 1.9);
    const wm = M.ease.outCubic(M.prog(t, 10.5, 10.85));
    const name = K.brand.name;
    const wsize0 = T.fit(c, name, 180, 800, 1100, -0.03);
    // the lockup (tile + wordmark) is centred as a group
    const half = (260 * 0.62 - 130 + M.measure(c, name, wsize0, 800, -0.03)) / 2;
    const ts = M.lerp(260, 52, pull);
    const tx = M.lerp(960 - half * wm, 270, pull);
    const ty = M.lerp(530, 206, pull);
    if (pull > 0) {
      const bs = M.lerp(0.7, 1, M.ease.outCubic(pull));
      M.withLayer(
        c,
        (l) => {
          l.translate(960, 550);
          l.scale(bs, bs);
          l.translate(-960, -550);
          const th = theme(THEMES.filter(([at]) => t >= at).pop()[1]);
          hero.draw(l, t, th);
          const [bx, by] = hero.burst();
          T.confetti(l, t - 12.95, bx, by);
        },
        { alpha: M.prog(t, 11.05, 11.3) }
      );
    }
    T.brandTile(c, tx, ty, ts * pop, { draw: M.prog(t, 10.4, 10.7) });
    const wsize = M.lerp(wsize0, 36, pull);
    if (wm > 0 && pull < 1) {
      M.blurWord(c, name, tx + ts * 0.62, ty + wsize * 0.36, wm, { size: wsize, weight: 800, color: C.navy, blurFrom: 14, track: -0.03, alpha: 1 - M.ease.inQuad(pull) });
    }
    if (t > 11.62 && t < 13.15) {
      const [x, y] = hero.cursor(t);
      M.cursor(c, x, y, 1.6, { press: hero.press(t) ? 0.7 : 0, rot: -0.25 });
    }
    // white-out into the next line
    const f = M.prog(t, 13.26, 13.4);
    if (f > 0) {
      c.fillStyle = `rgba(233,235,238,${f})`;
      c.fillRect(0, 0, W, H);
    }
  };

  // ---------------------------------------------------------------- No more <pain>.
  const NW = T.words(K.noMore[0]);
  const NM_T = T.rhythm(NW.length, [13.5, 13.58, 13.68, 13.86]);
  const NM = NW.map((w, i) => ({ s: w.s, t0: NM_T[i], weight: w.accent ? 800 : 400, color: w.accent ? C.text : C.ink }));
  const bubble = (c, t, ax, ay) => {
    if (t < 14.3) return;
    const r = M.key(t, [[14.3, 6], [14.37, 22, 'outQuad'], [14.46, 100, 'outQuad'], [14.53, 124, 'outQuad'], [14.62, 98, 'inOutQuad'], [14.7, 92, 'outQuad'], [14.85, 106, 'outQuad'], [15.4, 112, 'linear']]);
    const grow = M.prog(t, 14.37, 14.49);
    const cx = M.lerp(ax + 10, ax + 115, grow);
    const cy = M.lerp(ay - 10, ay - 120, grow);
    c.save();
    c.fillStyle = C.brand;
    c.beginPath();
    c.arc(ax, ay, Math.min(10, 4 + (t - 14.3) * 80), 0, Math.PI * 2);
    c.fill();
    if (grow > 0) {
      c.beginPath();
      c.arc(cx, cy, r, 0, Math.PI * 2);
      c.arc(cx - r * 0.5, cy + r * 0.5, r * 0.58, 0, Math.PI * 2);
      c.fill();
      // check mark draws on, then turns green with a ring burst
      const d = M.prog(t, 14.5, 14.66);
      const g = M.prog(t, 14.7, 14.85);
      c.save();
      c.translate(cx, cy);
      c.strokeStyle = '#ffffff';
      c.lineWidth = r * 0.16;
      c.lineCap = 'round';
      c.lineJoin = 'round';
      if (g > 0) {
        c.fillStyle = C.green;
        c.beginPath();
        c.arc(0, 0, r * 0.62 * M.ease.outBack(g, 2), 0, Math.PI * 2);
        c.fill();
        c.save();
        c.globalAlpha = 1 - g;
        c.lineWidth = 6;
        c.strokeStyle = C.green;
        c.beginPath();
        c.arc(0, 0, r * (1 + g * 0.6), 0, Math.PI * 2);
        c.stroke();
        c.restore();
      }
      const pts = [[-0.36, 0.02], [-0.1, 0.28], [0.4, -0.26]].map(([x, y]) => [x * r, y * r]);
      const l1 = Math.hypot(pts[1][0] - pts[0][0], pts[1][1] - pts[0][1]);
      const l2 = Math.hypot(pts[2][0] - pts[1][0], pts[2][1] - pts[1][1]);
      c.setLineDash([(l1 + l2) * d, 9999]);
      c.beginPath();
      c.moveTo(...pts[0]);
      c.lineTo(...pts[1]);
      c.lineTo(...pts[2]);
      c.stroke();
      c.restore();
    }
    c.restore();
  };
  let nmSize = 0;
  S.noMore = (c, t) => {
    if (t < 13.4) return S.reveal(c, t);
    c.fillStyle = C.grey;
    c.fillRect(0, 0, W, H);
    // leave room for the bubble after the last word
    if (!nmSize) nmSize = T.fit(c, T.plain(K.noMore[0]), 118, 600, 1480, -0.02);
    const z = 1 + Math.max(0, t - 14.2) * 0.06;
    c.save();
    c.translate(1300, 540);
    c.scale(z, z);
    c.translate(-1300, -540);
    const boxes = M.wordLine(c, NM, t, { size: nmSize, x: W / 2, y: 580, dur: 0.18, slide: 110, blurFrom: 12, track: -0.02 });
    c.restore();
    // the reaction bubble rides the end of the last word
    const last = boxes[boxes.length - 1];
    if (last && last.x !== undefined) {
      const ex = (last.x + last.ww - 1300) * z + 1300;
      bubble(c, t, ex + 10, 580 - nmSize * 0.93);
    }
    if (t > 14.75) {
      const tr = [[14.75, -40, 760], [14.85, 200, 850], [15.0, 520, 900], [15.15, 760, 860], [15.3, 900, 760], [15.55, 960, 700], [15.8, 1000, 650]];
      const [x, y] = M.track(t, tr);
      const [x0, y0] = M.track(t - 0.03, tr);
      M.cursorSmear(c, x0, y0, x, y, 1.0);
    }
  };

  // ---------------------------------------------------------------- the arch
  // glyphs laid on a 3D arch: [text, accent?, weight, size, appear time]; the accent
  // is set letter by letter at jittered sizes, a space keeps its width but draws nothing
  const ARCH = [];
  {
    const words = T.words(K.noMore[1]);
    const LET = [150, 128, 120, 132, 168, 124, 128, 120, 138];
    let n = 0;
    let after = 0;
    words.forEach((w, wi) => {
      if (w.accent) {
        if (wi && words[wi - 1].accent) ARCH.push([' ', 1, 800, 130, 0]);
        w.s.split('').forEach((ch) => ARCH.push([ch, 1, 800, LET[n % LET.length], 15.34 + n++ * 0.012]));
      } else if (!n) ARCH.push([w.s, 0, 500, ARCH.length === 0 ? 170 : 104, 15.3 + ARCH.length * 0.02]);
      else ARCH.push([w.s, 0, 500, 110, 15.35 + n * 0.012 + after++ * 0.03]);
    });
  }
  const cardsPlate = () =>
    M.pic('tpl-dark-cards', W, H, (c) => {
      c.fillStyle = M.rgrad(c, 960, 520, 100, 1150, [[0, C.deep[0]], [1, C.deep[1]]]);
      c.fillRect(0, 0, W, H);
      const floatCard = (x, y, rot, i) => {
        c.save();
        c.translate(x, y);
        c.rotate(rot);
        c.filter = 'blur(5px)';
        c.globalAlpha = 0.55;
        T.card(c, -214, -58, 428, 116, i, { theme: 'dark' });
        c.restore();
      };
      [[240, 130, -0.4], [1720, 170, 0.5], [160, 930, 0.3], [1760, 920, -0.35], [980, 1010, 0.05], [1000, 60, -0.06]].forEach(([x, y, r], i) => floatCard(x, y, r, i + 1));
      c.filter = 'none';
      c.globalAlpha = 1;
    });
  let archScale = 0;
  S.arch = (c, t) => {
    const k = (t - 15.3) / 1.9;
    c.save();
    c.translate(W / 2, H / 2);
    c.rotate(k * 0.03);
    c.scale(1.04 + k * 0.04, 1.04 + k * 0.04);
    c.translate(-W / 2, -H / 2);
    c.drawImage(cardsPlate(), 0, 0);
    c.restore();
    // lay the glyphs along an arc that slowly orbits
    const Rr = 1300;
    const cx = 960;
    const cy = 1680 + k * 40;
    const sp = 0.03;
    const gapAfter = (i) => (ARCH[i][1] && ARCH[i + 1] && ARCH[i + 1][1] ? 0.004 : sp);
    // shrink a long line so the arch stays on screen
    if (!archScale) {
      let glyphs = 0;
      let gaps = 0;
      ARCH.forEach(([s, , wt, size], i) => {
        glyphs += M.measure(c, s, size, wt, -0.02) / Rr;
        gaps += gapAfter(i);
      });
      archScale = glyphs + gaps > 1.3 ? Math.max(0.45, (1.3 - gaps) / glyphs) : 1;
    }
    let span = 0;
    ARCH.forEach(([s, , wt, size], i) => (span += (M.measure(c, s, size, wt, -0.02) * archScale) / Rr + gapAfter(i)));
    let a = -span / 2 + k * 0.05;
    ARCH.forEach(([s, accent, wt, size0, t0], i) => {
      const size = size0 * archScale;
      const p = M.ease.outBack(M.prog(t, t0, t0 + 0.22), 2);
      const ww = M.measure(c, s, size, wt, -0.02);
      const da = (ww / Rr) * 0.5;
      a += da;
      const x = cx + Math.sin(a) * Rr;
      const y = cy - Math.cos(a) * Rr + (i === 0 ? 40 : 0);
      a += da + gapAfter(i);
      if (p <= 0 || s === ' ') return;
      const draw = (l, dx, col) => {
        l.save();
        l.translate(x + dx, y + (1 - p) * 60);
        l.rotate(a - da);
        l.scale(p, p);
        M.text(l, s, 0, size * 0.36, { size, weight: wt, color: col, align: 'center', track: -0.02 });
        l.restore();
      };
      const blur = i === 0 ? 3 : i === 1 ? 1 : 0;
      M.withLayer(
        c,
        (l) => {
          if (accent) {
            l.save();
            l.shadowColor = 'rgba(255,60,40,0.7)';
            l.shadowBlur = 18;
            draw(l, 0, '#ff2a1a');
            l.restore();
          } else {
            l.globalCompositeOperation = 'lighter';
            draw(l, -blur * 1.4 - 2, 'rgba(255,60,60,0.85)');
            draw(l, blur * 1.4 + 2, 'rgba(40,200,255,0.8)');
            l.globalCompositeOperation = 'source-over';
            draw(l, 0, 'rgba(240,244,255,0.9)');
          }
        },
        { blur }
      );
    });
    const [x, y] = M.track(t, [[15.3, 940, 520], [15.6, 990, 470], [16.2, 1100, 430], [16.8, 1240, 400], [17.2, 1320, 390]]);
    M.cursor(c, x, y, 0.95, { rot: -0.5 });
  };
})();
