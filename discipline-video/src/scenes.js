// The film, scene by scene. Every scene lives somewhere on one big page; the pen
// draws a connecting line from one scene to the next while the camera follows.

import * as G from './geom.js';
import { ACCENT, Custom, drawStrokesAt, GREY, INK, Strokes, Text } from './ink.js';
import { clamp, ease, inv, lerp, rng } from './util.js';

export function buildFilm({ fonts, P, vt, voiceEnd, cuts }) {
  const els = [];
  const fx = [];
  const sfx = [];
  const scenes = [];
  const transitions = [];
  const punches = [];
  let overview = null;

  function scene(cx, cy, from) {
    const s = { idx: scenes.length, cx, cy, from, els: [], group: 'a' };
    const add = (el) => { el.scene = s.idx; el.group = s.group; els.push(el); s.els.push(el); return el; };
    s.p = (ph) => P(ph, from);
    s.ink = (strokes, t0, t1, o) => add(new Strokes(G.place(strokes, cx, cy), t0, t1, o));
    s.text = (font, str, x, y, size, t0, t1, o) => add(new Text(fonts[font], str, cx + x, cy + y, size, t0, t1, o));
    s.custom = (t0, t1, bb, draw, o = {}) => add(new Custom(t0, t1, [bb[0] + cx, bb[1] + cy, bb[2] + cx, bb[3] + cy], (ctx, t, env, el) => {
      ctx.save(); ctx.translate(cx, cy); draw(ctx, t, env, el); ctx.restore();
    }, { ...o, tip: o.tip && ((t) => { const p = o.tip(t); return p && [p[0] + cx, p[1] + cy]; }) }));
    scenes.push(s);
    return s;
  }

  const sceneStarts = [0, ...cuts.map(vt)];

  // ── 1. The Pen ──────────────────────────────────────────────────────────
  {
    const s = scene(0, 0, sceneStarts[0]);
    const a = s.p('every single day');
    s.text('hand', 'Every single day,', 0, -430, 104, a.s - 0.05, a.e + 0.1);
    const b = s.p('write one line');
    s.ink(G.line(-380, -300, 380, -300, { wob: 3.5 }), b.s - 0.1, b.e + 0.3, { w: 12 });
    const c = s.p('of your story');
    s.text('hand', 'of your story.', 0, -185, 70, c.s, c.e + 0.15, { color: GREY });
    const d = s.p('whether you mean to');
    s.ink(G.figure(-40, 330, 1.35, 'hold'), d.s - 0.1, d.e + 0.3, { w: 7 });
    const e = s.p('or not');
    s.ink(G.penDoodle(44, 124, 150, -1.0, 20), e.s - 0.1, e.e + 0.1, { w: 6 });
    const f = s.p('most people never notice');
    s.text('hand', 'most people never notice...', 0, 500, 60, f.s, f.e + 0.3, { color: GREY });
    const g = s.p('holding the pen');
    s.ink(G.ellipse(84, 58, 105, 118, { wob: 2 }), g.s, g.e + 0.35, { w: 7, color: ACCENT });
  }

  // ── 2. The Lie of Motivation ────────────────────────────────────────────
  {
    const s = scene(1250, 1100, sceneStarts[1]);
    const a = s.p('we wait to feel ready');
    s.text('hand', 'We wait to feel ready.', 0, -540, 92, a.s - 0.05, a.e + 0.1);
    const b = s.p('we wait for motivation');
    s.ink(G.figure(-280, 230, 1.15, 'stand'), a.e + 0.1, b.s + 0.45, { w: 6 });
    s.ink(G.signpost(40, 230, -105, 400, 96), b.s + 0.45, b.s + 0.95, { w: 6 });
    s.text('marker', 'MOTIVATION', 100, -87, 50, b.s + 0.95, b.e + 0.35);
    const c = s.p("like it's a train");
    const c2 = s.p('pull up');
    s.ink(G.tracks(-460, 440, 268), c.s - 0.1, c.e + 0.3, { w: 4, color: GREY });
    s.ink(G.train(320, 262, 0.85), c.e + 0.3, c2.e, { w: 5 });
    const d = s.p('somewhere better');
    const clock = { x: 330, y: -330, r: 62 };
    s.ink(G.clockFace(clock.x, clock.y, clock.r), d.s - 0.3, d.e + 0.1, { w: 5 });
    s.custom(d.e + 0.1, d.e + 0.2, [clock.x - 80, clock.y - 80, clock.x + 80, clock.y + 80], (ctx, t, env, el) => {
      const k = (t - el.t0) * 2.2;
      drawStrokesAt(ctx, G.hands(clock.x, clock.y, clock.r, k * 0.4 - 1, k * 4.8 - Math.PI / 2), env.step, 3, { w: 5, boil: 0 });
    });
    const e = s.p('but motivation is weather');
    s.text('hand', 'motivation =', 40, -400, 80, e.s, e.e - 0.35, { align: 'right' });
    s.text('hand', 'weather.', 64, -400, 80, e.e - 0.35, e.e + 0.15, { align: 'left', color: ACCENT });
    const f = s.p('it shows up when it wants');
    s.ink(G.cloud(-260, -170, 0.85), e.e + 0.15, f.s + 0.25, { w: 6 });
    const g = s.p('and it leaves without saying goodbye');
    s.ink(G.sun(-30, -240, 40), f.s + 0.25, f.e + 0.1, { w: 6, fade: [g.s + 0.2, g.s + 1.0] });
    s.ink(G.rain(-350, -120, 190, 150, 8), g.s + 0.3, g.e, { w: 4, color: GREY });
  }

  // ── 3. What Discipline Is ───────────────────────────────────────────────
  {
    const s = scene(0, 2200, sceneStarts[2]);
    const a = s.p("discipline isn't punishment");
    s.text('marker', 'DISCIPLINE', 0, -530, 132, a.s - 0.1, a.s + 0.75);
    const pun = s.p('punishment');
    const t1 = s.text('hand', 'punishment', 0, -400, 84, a.s + 0.75, pun.e + 0.05, { color: GREY });
    s.ink(G.strike(t1.bbox[0] - s.cx, t1.bbox[2] - s.cx, -425), pun.e + 0.1, pun.e + 0.4, { w: 7, color: ACCENT });
    const b = s.p('being hard on yourself');
    const t2 = s.text('hand', 'being hard on yourself', 0, -285, 72, b.s - 0.1, b.e + 0.05, { color: GREY });
    s.ink(G.strike(t2.bbox[0] - s.cx, t2.bbox[2] - s.cx, -306), b.e + 0.1, b.e + 0.45, { w: 7, color: ACCENT });
    const c = s.p('is keeping a promise');
    s.text('hand', '= keeping a promise', 0, -150, 88, c.s - 0.1, c.e + 0.15);
    const d = s.p('to the one person');
    s.ink(G.mirror(-60, 190, 130, 172), d.s - 0.1, d.e + 0.35, { w: 6 });
    const e = s.p('you can never hide from');
    s.ink(G.figure(-60, 320, 0.84, 'stand'), e.s - 0.05, e.e + 0.05, { w: 5 });
    const f = s.p('you', e.e + 0.1);
    s.text('marker', 'you.', 300, 300, 118, f.s - 0.1, f.e + 0.2, { color: ACCENT });
    s.ink(G.ellipse(300, 258, 160, 100, { wob: 2 }), f.e + 0.2, f.e + 0.6, { w: 6, color: ACCENT });
  }

  // ── 4. Small & Boring ───────────────────────────────────────────────────
  {
    const s = scene(1250, 3300, sceneStarts[3]);
    const a = s.p('one big moment');
    const t0 = s.text('hand', 'one big moment', 0, -545, 90, a.s - 0.1, a.e);
    s.ink(G.strike(t0.bbox[0] - s.cx, t0.bbox[2] - s.cx, -570), a.e + 0.05, a.e + 0.35, { w: 7, color: ACCENT });
    const b = s.p('small');
    s.text('hand', 'small.', -200, -420, 76, b.s - 0.1, b.e + 0.15);
    const c = s.p('boring');
    s.text('hand', 'boring.', 190, -420, 76, c.s - 0.1, c.e + 0.2);
    const rows = [
      ['10 pages', 'not the whole book', 'the whole book', (x, y) => G.book(x, y, 0.85)],
      ['one set', 'not the whole body', 'the whole body', (x, y) => G.dumbbell(x, y, 0.85)],
      ['one honest hour', 'not a perfect life', 'a perfect life', (x, y) => [...G.clockFace(x, y, 44), ...G.hands(x, y, 44, -0.5, -Math.PI / 2)]],
    ];
    const labels = ['10 pages', '1 set', '1 honest hour'];
    rows.forEach(([main, notPh, grey, icon], i) => {
      const y = -280 + i * 175;
      const m = s.p(main);
      const n = s.p(notPh);
      s.ink(icon(-330, y - 22), m.s - 0.45, m.s + 0.05, { w: 5 });
      s.text('hand', labels[i], -230, y, 76, m.s, m.e + 0.15, { align: 'left' });
      const gt = s.text('hand', grey, -230, y + 56, 52, n.s, n.e + 0.05, { align: 'left', color: GREY });
      s.ink(G.strike(gt.bbox[0] - s.cx, gt.bbox[2] - s.cx, y + 40), n.e + 0.05, n.e + 0.3, { w: 4, color: GREY });
    });
    const d = s.p('one line');
    const e = s.p('then another');
    const marks = tallyMarks(-210, 320, 12);
    s.ink([marks[0]], d.s, d.e + 0.1, { w: 9 });
    marks.slice(1).forEach((m, i) => {
      const t = e.s - 0.1 + i * 0.1;
      s.ink([m], t, t + 0.12, { w: 9, ease: (v) => v });
    });
  }

  // ── 5. The Shaky Line ───────────────────────────────────────────────────
  {
    const s = scene(0, 4400, sceneStarts[4]);
    const a = s.p("here's the hard part");
    fx.push({ type: 'mood', t0: a.s - 0.6, t1: P('nobody claps').s - 0.3 });
    s.text('hand', "Here's the hard part.", 0, -545, 92, a.s - 0.05, a.e + 0.1);
    const b = s.p('some days the line will be ugly');
    const ugly = s.p('ugly');
    const jag = [];
    const jr = rng(21);
    for (let x = -400, k = 0; x <= 380; x += 22 + jr() * 46, k++) jag.push([x, -360 + (k % 2 ? -1 : 1) * (4 + jr() * 22) + (jr() - 0.5) * 10]);
    s.ink(G.path(jag, { wob: 5 }), b.s, ugly.s + 0.1, { w: 9 });
    s.text('hand', 'ugly', -400, -405, 54, ugly.s + 0.1, ugly.e + 0.25, { align: 'left', color: GREY });
    const c = s.p('shaky');
    s.ink(G.tremble(-400, -235, 380, 16, 0.42), c.s - 0.15, c.e + 0.45, { w: 6 });
    s.text('hand', 'shaky', -400, -280, 54, c.e + 0.45, c.e + 0.75, { align: 'left', color: GREY });
    const d = s.p('barely there');
    s.ink(G.dashed(-400, -115, 380, 22, 34), d.s - 0.1, d.e + 0.2, { w: 4, alpha: 0.45 });
    s.text('hand', 'barely there', -400, -160, 54, d.e + 0.2, d.e + 0.55, { align: 'left', color: GREY, alpha: 0.6 });
    const e = s.p('write it anyway');
    const any = s.p('anyway');
    s.text('marker', 'WRITE IT', 0, 70, 132, e.s - 0.1, any.s, { color: ACCENT });
    s.text('marker', 'ANYWAY.', 0, 215, 132, any.s, any.e + 0.3, { color: ACCENT });
    punches.push({ t: any.s + 0.1, a: 0.07 });
    const f = s.p('because a shaky line');
    const g = s.p('still counts');
    s.ink(G.tremble(-370, 470, -90, 10, 0.5), f.s, f.e + 0.15, { w: 6 });
    s.ink(G.check(-230, 370, 1.2), g.s, g.e + 0.1, { w: 9, color: ACCENT });
    const h = s.p('a blank page');
    const k = s.p('never does');
    s.ink(G.page(230, 400, 150, 190), h.s - 0.1, h.e + 0.15, { w: 5 });
    s.ink(G.cross(230, 400, 1.0), k.s, k.e + 0.1, { w: 7 });
  }

  // ── 6. Nobody Watching ──────────────────────────────────────────────────
  {
    const s = scene(1250, 5500, sceneStarts[5]);
    const a = s.p('nobody claps');
    const am = s.p('at 5 am');
    const hourA = -Math.PI / 2 + (5 / 12) * Math.PI * 2;
    s.ink([...G.alarmClock(-250, -500, 80), ...G.hands(-250, -500, 80, hourA, -Math.PI / 2)], a.s - 0.1, am.s + 0.05, { w: 6 });
    s.text('marker', '5:00 AM', -120, -470, 90, am.s, am.e + 0.3, { align: 'left' });
    const b = s.p('nobody sees');
    const c = s.p('the rep you almost skipped');
    s.ink(G.seats(0, 70, 5, 3, 86, 62), b.s - 0.15, c.s + 0.2, { w: 4, color: GREY });
    s.ink([...G.line(-190, -20, 190, -20, { wob: 2 }), ...G.figure(0, -24, 0.95, 'lift'), ...G.line(-95, -250, 95, -250, { wob: 1 }),
      ...G.rect(-118, -280, 22, 60, { over: 2 }), ...G.rect(96, -280, 22, 60, { over: 2 })], c.s + 0.2, c.e + 0.2, { w: 6 });
    const d = s.p('the night');
    s.ink(G.moon(340, -300, 52), d.s - 0.3, d.e + 0.15, { w: 6 });
    const no = s.p('said no');
    s.text('marker', 'NO.', 300, -150, 92, no.s, no.e + 0.25);
    const yes = s.p('when yes was easier');
    const yt = s.text('hand', 'yes', 300, -50, 72, yes.s + 0.1, yes.s + 0.6, { color: GREY });
    s.ink(G.scribble(yt.bbox[0] - s.cx - 8, yt.bbox[1] - s.cy, yt.width + 16, yt.bbox[3] - yt.bbox[1]), yes.s + 0.7, yes.e + 0.2, { w: 5 });
    const good = s.p('good');
    s.group = 'b';
    s.text('marker', 'Good.', 0, 600, 150, good.s - 0.05, good.e + 0.25);
    const e = s.p("that's where it's built");
    s.ink([...G.rect(-320, 700, 640, 460), ...G.lamp(0, 700, 1)], e.s - 0.1, e.e + 0.2, { w: 5 });
    const f = s.p("in the rooms nobody's watching");
    s.ink([...G.line(-60, 885, -230, 1140, { wob: 1 }), ...G.line(60, 885, 230, 1140, { wob: 1 })], f.s, f.s + 0.4, { w: 3, color: GREY });
    s.ink([...G.figure(-20, 1150, 0.95, 'hold'), ...G.penDoodle(32, 1018, 70, -1.0, 12)], f.s + 0.4, f.e + 0.2, { w: 5 });
    const g = s.p('every promise you keep');
    s.group = 'c';
    const h = s.p('becomes proof');
    s.text('hand', 'every kept promise', 0, 1265, 72, g.s, h.s + 0.1);
    const proofT = P('proof', h.s + 0.2).s;
    sfx.push({ type: 'stamp', t: proofT + 0.12 });
    const stamp = s.text('marker', 'PROOF', 0, 1435, 140, 0, 0.001, { color: ACCENT, rot: -0.08 });
    stamp.t0 = proofT;
    stamp.t1 = proofT + 0.01;
    stamp.xform = (t) => ({ s: lerp(1.7, 1, ease.out(inv(proofT, proofT + 0.14, t))) });
    stamp.alphaAt = (t) => ease.out(inv(proofT, proofT + 0.1, t));
    s.ink(G.rect(-235, 1305, 470, 165, { over: 4 }), proofT + 0.12, proofT + 0.13, { w: 8, color: ACCENT, ease: (v) => v });
    const i = s.p('is louder than any');
    const ex = s.p('excuse');
    s.text('hand', 'louder than any', 120, 1590, 76, i.s, i.e + 0.1, { align: 'right' });
    s.text('hand', 'excuse', 140, 1590, 76, ex.s, ex.e + 0.1, {
      align: 'left', color: GREY,
      xform: (t) => ({ s: lerp(1, 0.62, ease.inOut(inv(ex.e + 0.2, ex.e + 1.0, t))) }),
    });
  }

  // ── 7. The Staircase ────────────────────────────────────────────────────
  const stairs = { x0: -380, y0: 560, tw: 124, rh: 92, n: 6 };
  {
    const s = scene(0, 6700, sceneStarts[6]);
    const a = s.p('and then one day');
    s.text('hand', 'one day...', -60, -540, 84, a.s, a.e + 0.25, { color: GREY, fade: [P('a staircase', a.s).s, P('a staircase', a.s).s + 0.6] });
    const marks = tallyMarks(-250, 250, 12);
    const lines = s.p('all those small boring shaky lines');
    const markEls = marks.map((m, i) => {
      const t = lines.s + 0.3 + i * 0.2;
      return s.ink([m], t, t + 0.16, { w: 9, until: Infinity });
    });
    const sc = s.p('a staircase');
    const morph0 = sc.s - 0.15;
    sfx.push({ type: 'drop', t: sc.s });
    // Tally marks fly into place as the steps of a staircase.
    const steps = [];
    for (let k = 0; k < stairs.n; k++) {
      const x = stairs.x0 + k * stairs.tw, y = stairs.y0 - k * stairs.rh;
      steps.push([[x, y], [x, y - stairs.rh]], [[x, y - stairs.rh], [x + stairs.tw, y - stairs.rh]]);
    }
    markEls.forEach((el) => { el.fade = [morph0, morph0 + 0.01]; });
    s.custom(morph0, morph0 + 0.01, [-520, -200, 520, 650], (ctx, t, env) => {
      steps.forEach((seg, i) => {
        const m = marks[i];
        const a0 = m[0], a1 = m[m.length - 1];
        const p = ease.back(inv(morph0 + i * 0.07, morph0 + i * 0.07 + 0.55, t));
        const P0 = [lerp(a0[0], seg[0][0], p), lerp(a0[1], seg[0][1], p)];
        const P1 = [lerp(a1[0], seg[1][0], p), lerp(a1[1], seg[1][1], p)];
        drawStrokesAt(ctx, [[P0, [(P0[0] + P1[0]) / 2, (P0[1] + P1[1]) / 2], P1]], env.step, 40 + i, { w: 9, boil: 1 });
      });
    });
    const top = stairs.x0 + stairs.n * stairs.tw, topY = stairs.y0 - stairs.n * stairs.rh;
    s.ink([...G.line(stairs.x0 - 110, stairs.y0, stairs.x0, stairs.y0, { wob: 1.5 }), ...G.line(top, topY, top, stairs.y0, { wob: 1.5 }),
      ...G.line(stairs.x0, stairs.y0, top, stairs.y0, { wob: 1.5 })], morph0 + 1.0, morph0 + 1.4, { w: 5, color: GREY });
    s.ink(G.flag(top - 30, topY), morph0 + 1.4, morph0 + 1.7, { w: 6, color: ACCENT });

    const b = s.p("you didn't find a new life");
    const c = s.p('you wrote one');
    const d = s.p('line by line');
    s.text('hand', "You didn't find a new life.", 0, -520, 80, b.s, b.e + 0.15);
    s.text('marker', 'You wrote one.', 0, -385, 108, c.s - 0.05, c.e + 0.25, { color: ACCENT });
    s.text('hand', 'line by line.', -250, 60, 70, d.s, d.e + 0.2, { color: GREY });
    // The figure climbs one step per beat until it reaches the flag.
    const figs = { stand: G.figureUnits('stand'), step: G.figureUnits('step'), cheer: G.figureUnits('cheer') };
    const climb0 = b.s - 0.2, climb1 = d.e + 0.2;
    const spots = [[stairs.x0 - 60, stairs.y0]];
    for (let k = 0; k < stairs.n; k++) spots.push([stairs.x0 + k * stairs.tw + stairs.tw * 0.5, stairs.y0 - (k + 1) * stairs.rh]);
    s.custom(climb0, climb0 + 0.3, [-520, -300, 520, 650], (ctx, t, env, el) => {
      const hop = (climb1 - climb0) / stairs.n;
      const u = clamp((t - climb0) / hop, 0, stairs.n);
      const k = Math.min(stairs.n - 1, Math.floor(u)), f = u >= stairs.n ? 1 : u - k;
      const p = ease.inOut(clamp(f / 0.55));
      const A = spots[k], B = spots[k + 1];
      const x = lerp(A[0], B[0], p), y = lerp(A[1], B[1], p) - Math.sin(Math.PI * p) * 60;
      const pose = u >= stairs.n ? figs.cheer : p > 0 && p < 1 ? figs.step : figs.stand;
      ctx.globalAlpha *= ease.out(inv(climb0, climb0 + 0.3, t));
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(0.9, 0.9);
      drawStrokesAt(ctx, pose, env.step, 77, { w: 6.5, boil: 1 });
      ctx.restore();
    });
    s.lookBack = { at: P('you look back', from(sceneStarts[6])).s - 0.15, glow: lines, push: P('have become', from(sceneStarts[6])).s - 0.35 };
  }

  // ── 8. Pick Up the Pen ──────────────────────────────────────────────────
  {
    const s = scene(1250, 8500, sceneStarts[7]);
    const a = s.p("so don't wait to feel ready");
    s.text('hand', "So don't wait to feel ready.", 0, -500, 84, a.s - 0.05, a.e + 0.1);
    const b = s.p("you won't");
    s.text('hand', "You won't.", 0, -385, 84, b.s - 0.05, b.e + 0.15, { color: GREY });
    const c = s.p('just pick up the pen');
    s.ink(G.penDoodle(-230, -110, 470, -0.42, 48), c.s - 0.05, c.e + 0.1, { w: 7 });
    const d = s.p("and write today's line");
    s.text('hand', "Write today's line.", 0, 120, 110, d.s + 0.2, d.e + 0.25, { color: ACCENT });
    const end = d.e + 0.35;
    s.ink(G.line(-120, 230, -128, 380, { wob: 2 }), end + 0.2, end + 0.5, { w: 13, color: INK });
    s.text('hand', 'Day 1', 0, 335, 86, end + 0.6, end + 1.2, { align: 'left' });
  }

  // ── Connecting lines + camera transitions between scenes ────────────────
  const firstTip = (sc) => {
    const el = sc.els.filter((e) => e.tip(e.t0 + 0.01)).sort((x, y) => x.t0 - y.t0)[0];
    return el.tip(el.t0 + 0.01);
  };
  const connectors = [];
  for (let i = 0; i < scenes.length - 1; i++) {
    const A = scenes[i], B = scenes[i + 1];
    const lastT1 = Math.max(...A.els.filter((e) => e.t1 < B.from + 2).map((e) => e.t1));
    const start = Math.max(lastT1 - 0.05, B.from - 0.9);
    const firstT0 = Math.min(...B.els.map((e) => e.t0));
    const end = Math.max(start + 0.7, firstT0 - 0.02);
    const lastEl = A.els.filter((e) => e.tip(e.t1 - 0.01)).sort((x, y) => x.t1 - y.t1).pop();
    const p0 = lastEl.tip(lastEl.t1 - 0.01), p1 = firstTip(B);
    const mid = [(p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2];
    const loop = [];
    for (let k = 0; k <= 12; k++) {
      const ang = Math.PI / 2 - (k / 12) * Math.PI * 2 * (p1[0] > p0[0] ? 1 : -1);
      loop.push([mid[0] + Math.cos(ang) * 46, mid[1] - 46 + Math.sin(ang) * 46]);
    }
    const pts = [p0, [lerp(p0[0], mid[0], 0.5), lerp(p0[1], mid[1], 0.5) + 120], ...loop, [lerp(mid[0], p1[0], 0.5), lerp(mid[1], p1[1], 0.5) - 120], p1];
    const strokes = G.curve(pts, { wob: 3 });
    const el = new Strokes(strokes, start, end, { w: 5, color: GREY, ease: ease.inOut, fade: [end + 0.6, end + 1.6], fadeTo: 0.35 });
    el.scene = i;
    els.push(el);
    connectors.push(strokes[0]);
    el.frame = false;
    transitions.push({ t0: start, t1: end, el });
    sfx.push({ type: 'whoosh', t: start, d: end - start });
  }

  // ── Scene 7's look back over the whole page ─────────────────────────────
  {
    const s7 = scenes[6];
    let x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity;
    for (const e of els) {
      if (e.scene > 6) continue;
      x1 = Math.min(x1, e.bbox[0]); y1 = Math.min(y1, e.bbox[1]); x2 = Math.max(x2, e.bbox[2]); y2 = Math.max(y2, e.bbox[3]);
    }
    const z = Math.min((1080 * 0.88) / (x2 - x1), (1920 * 0.8) / (y2 - y1));
    const lb = s7.lookBack;
    overview = { t0: lb.at, t1: lb.push, x: (x1 + x2) / 2, y: (y1 + y2) / 2 - 60 / z, z };
    const glow = new Strokes(connectors.slice(0, 6), lb.glow.s - 0.2, lb.glow.e + 0.1, { w: 18, color: ACCENT, ease: ease.inOut, fade: [lb.push + 0.2, lb.push + 0.9] });
    glow.scene = 6;
    glow.frame = false;
    els.push(glow);
  }

  const duration = vt(voiceEnd) + 5.0;
  fx.push({ type: 'fadeout', t0: duration - 1.3, t1: duration });
  return { els, transitions, overview, punches, fx, sfx, duration, scenes };

  function from(t) { return t; }
}

// A row of tally marks: groups of four uprights with a diagonal slash.
function tallyMarks(x, y, n) {
  const out = [];
  let gx = x;
  for (let i = 0; i < n; i++) {
    const k = i % 5;
    if (k < 4) out.push(G.line(gx + k * 36, y - 62, gx + k * 36 + 3, y + 62, { wob: 2.5 })[0]);
    else { out.push(G.line(gx - 22, y + 36, gx + 3 * 36 + 22, y - 36, { wob: 2 })[0]); gx += 5 * 36 + 20; }
  }
  return out;
}

