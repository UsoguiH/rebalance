// "Steve vs Herobrine": eight pages, each drawn in real time against the narration.
// Coordinates are page pixels (1080×1920); keep content between y≈220 and y≈1480 so
// TikTok/Reels captions never cover it.

import * as G from '../../discipline-video/src/geom.js';
import { Strokes, Text } from '../../discipline-video/src/ink.js';
import * as B from './blocks.js';

export function buildStory({ look, font, P, vt, cuts, voiceEnd }) {
  const scenes = [];
  const starts = [0, ...cuts.map(vt)];
  const W0 = look.w, BIG = look.size;

  function scene() {
    const s = { idx: scenes.length, from: starts[scenes.length], els: [], cams: [] };
    const add = (el) => { s.els.push(el); return el; };
    s.p = (ph) => P(ph, s.from);
    s.text = (str, x, y, k, t0, t1, o = {}) => add(new Text(font, str, x, y, BIG * k, t0, t1, { color: o.soft ? look.soft : o.accent ? look.accent : look.ink, align: o.align }));
    s.ink = (strokes, t0, t1, o = {}) => add(new Strokes(strokes, t0, t1, { w: W0 * (o.k ?? 1.3), color: o.accent ? look.accent : look.ink, boil: 0 }));
    s.shade = (strokes, t0, t1) => add(new Strokes(strokes, t0, t1, { w: W0 * 0.75, color: look.ink, boil: 0, ease: (v) => v }));
    s.cam = (t, d, x, y, z) => s.cams.push({ t, d, x, y, z });
    scenes.push(s);
    return s;
  }
  const hatchGap = look.hatchGap;
  const darkPatch = (cx, cy, rx, ry, eyeW = 34) => {
    const eyes = [[cx - eyeW - 14, cy - 10, eyeW, 20], [cx + 14, cy - 10, eyeW, 20]];
    const [bb, inside] = B.ellipseRegion(cx, cy, rx, ry);
    const holes = eyes.map(([x, y, w, h]) => [x - 4, y - 4, w + 8, h + 8]);
    return { shade: [...B.hatch(bb, inside, { gap: hatchGap, holes }), ...B.hatch(bb, inside, { gap: hatchGap * 1.4, angle: 0.75, holes, seed: 9 })], eyes };
  };

  // ── 1. The rule ───────────────────────────────────────────────────────────
  {
    const s = scene();
    s.cam(0, 0, 540, 860, 1.0);
    const a = s.p('every minecraft world has a rule');
    s.text('Rule #1', 540, 330, 1.25, a.s, a.e + 0.2);
    const b = s.p('nobody tells you');
    s.ink(B.squareMoon(840, 640, 150), b.s, b.e + 0.3);
    const c = s.p("don't stay out after dark");
    s.text("don't stay out after dark.", 540, 480, 0.78, c.s, c.e + 0.2);
    const d = s.p('because someone');
    s.ink([...B.ground(110, 980, 1200), ...B.tree(230, 1200, 1.2), ...B.tree(880, 1200, 1.2)], c.e + 0.2, d.e + 0.35, { k: 1.1 });
    const e = s.p('is always watching');
    const patch = darkPatch(560, 1060, 175, 100, 44);
    s.shade(patch.shade, e.s - 0.1, e.e - 0.1);
    s.ink(B.glow(patch.eyes, 16), e.e - 0.1, e.e + 0.25, { accent: true, k: 0.9 });
    s.cam(e.s + 0.2, 1.4, 560, 1060, 1.65);
  }

  // ── 2. Day one ────────────────────────────────────────────────────────────
  {
    const s = scene();
    s.cam(0, 0, 540, 720, 1.12);
    const a = s.p('day one');
    s.text('DAY 1', 540, 330, 1.3, a.s - 0.1, a.e + 0.35);
    const b = s.p('steve punches');
    const steve = B.blocky(290, 960, 1.5, 'punch');
    s.ink(steve.ink, b.s - 0.1, b.e + 0.25);
    const c = s.p('his first tree');
    s.ink([...B.tree(700, 960, 1.25), ...G.line(110, 960, 970, 960, { wob: 2 })], b.e + 0.25, c.e + 0.3);
    s.ink([...G.line(560, 680, 610, 668, { over: 0 }), ...G.line(560, 712, 614, 718, { over: 0 }), ...G.line(566, 646, 604, 624, { over: 0 })], c.e + 0.3, c.e + 0.45, { accent: true, k: 1 });
    const d = s.p('builds this tiny little wooden house');
    s.cam(d.s - 0.3, 1.0, 540, 1080, 1.0);
    s.ink(B.house(500, 1420, 1.35), d.s - 0.1, d.e + 0.3);
    const e = s.p('kind of ugly');
    s.text('(kind of ugly)', 820, 1110, 0.58, e.s - 0.6, e.e, { soft: true });
    s.ink(G.arrow(800, 1140, 690, 1225, { head: 20 }), e.e, e.e + 0.3, { k: 1 });
    const f = s.p('puts one torch by the door');
    const t = B.torch(610, 1420, 1.25);
    s.ink(t.stick, f.s, f.s + 0.6);
    s.ink([...t.flame, ...B.rays(612, 1292, 44, 66, 7)], f.s + 0.6, f.e + 0.2, { accent: true, k: 1 });
    const g = s.p('life was simple');
    s.cam(g.s - 0.5, 1.0, 540, 880, 0.97);
    s.text('life was simple.', 540, 470, 0.68, g.s - 0.2, g.e + 0.3, { soft: true });
  }

  // ── 3. The third night ────────────────────────────────────────────────────
  {
    const s = scene();
    s.cam(0, 0, 540, 720, 1.1);
    const a = s.p('but on the third night');
    s.text('NIGHT 3', 540, 330, 1.3, a.s - 0.1, a.e + 0.2);
    const b = s.p('things started to change');
    s.text('things started to change...', 540, 450, 0.6, b.s, b.e + 0.2, { soft: true });
    const c = s.p('the trees lost their leaves');
    s.ink(B.tree(220, 1060, 1.3, false), c.s - 0.1, c.s + 0.7);
    s.ink(B.fallingLeaves(250, 720, 7), c.s + 0.7, c.e + 0.3, { k: 1 });
    const d = s.p('tunnels showed up that steve never dug');
    s.ink(B.hill(520, 820, 5, 3, 82), d.s - 0.1, d.s + 1.2, { k: 1.1 });
    const [bb, inside] = B.rectRegion(604, 904, 160, 160);
    s.shade(B.hatch(bb, inside, { gap: hatchGap * 0.8 }), d.s + 1.2, d.e);
    s.text('?', 960, 800, 1.2, d.e, d.e + 0.3, { accent: true });
    const e = s.p('and at the edge of the fog');
    s.cam(e.s - 0.3, 1.0, 540, 1080, 1.0);
    s.ink(B.fog(110, 970, 1170, 3), e.s, e.e + 0.2, { k: 1 });
    const f = s.p('two white eyes');
    const patch = darkPatch(560, 1370, 200, 110, 50);
    s.shade(patch.shade, f.s - 0.3, f.e - 0.1);
    s.ink(B.glow(patch.eyes, 18), f.e - 0.1, f.e + 0.25, { accent: true, k: 0.9 });
    s.cam(f.s - 0.2, 1.3, 560, 1370, 1.8);
  }

  // ── 4. Herobrine ──────────────────────────────────────────────────────────
  {
    const s = scene();
    s.cam(0, 0, 540, 860, 1.0);
    const a = s.p('herobrine');
    s.text('HEROBRINE', 540, 330, 1.3, a.s - 0.2, a.s + 0.75, { accent: true });
    const h = B.blocky(540, 1330, 2.4, 'stand', { herobrine: true, gap: hatchGap });
    s.ink(h.ink, a.s + 0.75, a.s + 1.45);
    const b = s.p('the ghost in the code');
    s.shade(h.shade, b.s - 0.1, b.e + 0.3);
    s.text('the ghost in the code', 540, 450, 0.6, b.e + 0.3, b.e + 0.75, { soft: true });
    const c = s.p('no sound');
    s.ink(B.speaker(185, 980, 1.4), c.s - 0.2, c.e);
    s.ink(G.cross(200, 980, 0.95), c.e, c.e + 0.3, { accent: true, k: 1.2 });
    const d = s.p('no shadow');
    s.ink(G.ellipse(880, 990, 95, 30, { wob: 1 }), d.s - 0.1, d.e);
    s.ink(G.cross(880, 990, 0.95), d.e, d.e + 0.3, { accent: true, k: 1.2 });
    const e = s.p('just watching');
    s.ink(B.glow(h.eyes, 22), e.s, e.s + 0.4, { accent: true, k: 0.9 });
    s.text('just watching...', 540, 1455, 0.62, e.s + 0.4, e.e + 0.3, { soft: true });
    s.cam(e.s, 1.6, 540, 800, 1.5);
  }

  // ── 5. Steve ran ──────────────────────────────────────────────────────────
  {
    const s = scene();
    s.cam(0, 0, 540, 660, 1.02);
    const a = s.p('so steve ran');
    const P1 = [90, 250, 430, 380], P2 = [560, 250, 430, 380], P3 = [90, 660, 430, 380], P4 = [560, 660, 430, 380];
    s.ink([...B.panel(...P1), ...B.panel(...P2), ...B.panel(...P3), ...B.panel(...P4)], a.s - 0.25, a.s + 0.25, { k: 1 });
    s.ink([...B.blocky(330, 610, 1.1, 'run').ink, ...B.speedLines(215, 370, 4, 60)], a.s + 0.25, a.e + 0.35, { k: 1.1 });
    const b = s.p('he blocked the door');
    s.ink([...B.box(735, 410, 70, 190), ...B.box(705, 410, 64, 64), ...B.box(769, 474, 64, 64), ...B.box(705, 538, 64, 62)], b.s - 0.1, b.e + 0.2, { k: 1.1 });
    const c = s.p('he dug straight down');
    s.ink([...B.box(260, 700, 90, 300), ...G.arrow(400, 720, 400, 960, { head: 22, bend: 0 })], c.s - 0.1, c.e + 0.2, { k: 1.1 });
    const d = s.p('he hid in the dark');
    const [bb, inside] = B.rectRegion(566, 666, 418, 368);
    const eyes = [[740, 830, 22, 12], [790, 830, 22, 12]];
    s.shade(B.hatch(bb, inside, { gap: hatchGap * 1.1, holes: eyes }), d.s - 0.1, d.e + 0.25);
    const e = s.p('but every time he turned around');
    s.cam(e.s - 0.2, 1.0, 540, 1250, 1.12);
    s.ink(B.panel(90, 1070, 900, 410), e.s - 0.2, e.s + 0.3, { k: 1 });
    s.ink(B.blocky(210, 1450, 0.9, 'scared').ink, e.s + 0.3, e.e + 0.1, { k: 1.1 });
    const f = s.p('herobrine was closer');
    const hs = [[470, 1450, 0.5], [650, 1450, 0.7], [860, 1450, 0.95]];
    hs.forEach(([x, y, k], i) => {
      const h = B.blocky(x, y, k, 'stand', { herobrine: true, gap: hatchGap * 0.8 });
      const t0 = e.e + 0.1 + i * ((f.e - e.e) / 3);
      s.ink(h.ink, t0, t0 + 0.35, { k: 1 });
      s.shade(h.shade, t0 + 0.35, t0 + 0.6);
    });
  }

  // ── 6. Steve stops running ────────────────────────────────────────────────
  {
    const s = scene();
    s.cam(0, 0, 540, 800, 1.05);
    const a = s.p('and then steve stopped running');
    s.text('Steve stopped running.', 540, 330, 0.85, a.s - 0.1, a.s + 1.4);
    const steve = B.blocky(300, 1250, 1.6, 'hold');
    s.ink(steve.ink, a.s + 1.4, a.e + 0.35);
    const b = s.p('he mined iron');
    s.ink(B.pickaxe(steve.hand[0] - 24, steve.hand[1] + 24, 1.1), b.s - 0.1, b.s + 0.35);
    s.ink(B.oreBlock(660, 800, 150), b.s + 0.35, b.e + 0.3);
    const c = s.p('he crafted a sword');
    s.ink(B.sword(620, 1420, 1.7), c.s - 0.1, c.e + 0.2);
    const d = s.p('lit up every corner of his world');
    s.cam(d.s - 0.3, 1.2, 540, 960, 0.92);
    const corners = [[150, 600], [935, 560], [150, 1460], [935, 1460]];
    const beats = [d.s + 0.3, d.e - 0.3, P('one torch', d.s).s, P('a time', d.s).s];
    corners.forEach(([x, y], i) => {
      const t = B.torch(x, y, 1.05);
      s.ink(t.stick, beats[i] - 0.1, beats[i] + 0.15, { k: 1.1 });
      s.ink([...t.flame, ...B.rays(x + 1, y - 108, 38, 58, 7)], beats[i] + 0.15, beats[i] + 0.45, { accent: true, k: 1 });
    });
  }

  // ── 7. Herobrine steps back ───────────────────────────────────────────────
  {
    const s = scene();
    s.cam(0, 0, 540, 940, 1.0);
    const a = s.p('so when herobrine came back');
    const h = B.blocky(790, 1300, 1.6, 'stand', { herobrine: true, gap: hatchGap });
    s.ink(h.ink, a.s - 0.1, a.s + 0.7);
    s.shade(h.shade, a.s + 0.7, a.e + 0.2);
    const b = s.p('the night was full of light');
    const steve = B.blocky(280, 1300, 1.6, 'ready');
    s.ink([...steve.ink, ...B.sword(steve.hand[0] - 14, steve.hand[1] + 14, 0.8)], a.e + 0.2, b.s + 0.6);
    [120, 330, 540, 700, 960].forEach((x, i) => {
      const t0 = b.s + 0.6 + i * 0.22, tt = B.torch(x, 1450, 0.6);
      s.ink([...tt.stick, ...G.line(x - 40, 1450, x + 40, 1450, { wob: 1 })], t0, t0 + 0.12, { k: 1 });
      s.ink([...tt.flame, ...B.rays(x, 1388, 22, 38, 6)], t0 + 0.12, t0 + 0.22, { accent: true, k: 0.9 });
    });
    const c = s.p('for the first time ever');
    s.text('for the first time ever...', 540, 360, 0.6, c.s, c.e + 0.3, { soft: true });
    const d = s.p('herobrine took a step back');
    s.cam(d.s - 0.4, 1.1, 790, 1060, 1.3);
    s.ink([...G.line(930, 1000, 990, 1000, { over: 0 }), ...G.line(940, 1060, 1010, 1060, { over: 0 }), ...G.line(930, 1120, 990, 1120, { over: 0 })], d.s, d.s + 0.4, { k: 1 });
    s.text('step back!', 790, 860, 0.75, d.s + 0.4, d.e + 0.35, { accent: true });
  }

  // ── 8. Ready ──────────────────────────────────────────────────────────────
  {
    const s = scene();
    s.cam(0, 0, 540, 720, 1.05);
    const a = s.p("steve didn't win because he was");
    s.text("Steve didn't win because he was", 540, 330, 0.55, a.s - 0.2, a.e, { soft: true });
    const b = s.p('stronger');
    const st = s.text('stronger', 540, 450, 0.95, b.s - 0.1, b.e + 0.2);
    s.ink(G.strike(st.bbox[0], st.bbox[2], 425), b.e + 0.25, b.e + 0.55, { accent: true, k: 1.4 });
    const c = s.p('he won because he was ready');
    s.text('READY.', 540, 660, 1.7, P('ready', c.s).s - 0.15, c.e + 0.4, { accent: true });
    const d = s.p('darkness only wins where you stop placing torches');
    s.text('Darkness only wins where', 540, 800, 0.62, d.s, d.s + 1.1);
    s.text('you stop placing torches.', 540, 890, 0.62, d.s + 1.1, d.e + 0.2);
    const e = s.p('how many torches did you place today');
    s.cam(e.s - 0.6, 1.2, 540, 1080, 1.0);
    const t = B.torch(540, 1390, 2.5);
    s.ink(t.stick, e.s - 0.7, e.s);
    s.ink([...t.flame, ...B.rays(542, 1130, 80, 125, 9)], e.s, e.s + 0.7, { accent: true });
    s.text('how many did YOU place today?', 540, 1460, 0.58, e.s + 0.7, e.e + 0.4);
  }

  const duration = vt(voiceEnd) + 2.8;
  return { scenes, duration };
}
