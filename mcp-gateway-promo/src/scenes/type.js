// 21.60–23.27  Kinetic type: start!!!! / Securing / Real / tool calls
import { C, text, measure, makeCanvas } from '../draw2d.js';
import { dots, scribbles } from './flashes.js';
import { E, prog, lerp, rng, clamp, kf } from '../util.js';

export default function typeScene(ctx) {
  const { W, H } = ctx;
  // magenta brush-and-halftone texture used behind "start!!!!"
  const tex = makeCanvas(W, H);
  {
    const g = tex.getContext('2d'), r = rng(90);
    g.fillStyle = '#fff5fb'; g.fillRect(0, 0, W, H);
    for (let i = 0; i < 60; i++) {
      g.save(); g.translate(r() * W, r() * H); g.rotate(-0.6 + (r() - 0.5) * 0.5);
      g.fillStyle = `rgba(240,70,200,${0.1 + r() * 0.3})`; g.fillRect(-200 - r() * 300, -12 - r() * 30, 400 + r() * 700, 24 + r() * 70); g.restore();
    }
    dots(g, -200, -100, W * 0.7, H * 0.9, 'rgba(236,60,190,.5)', 15);
    dots(g, W * 0.55, H * 0.35, W * 0.6, H * 0.8, 'rgba(236,60,190,.42)', 15);
    scribbles(g, W, H, 'rgba(226,40,170,.45)', 77, 10);
  }
  const BEATS = [0.13, 0.23, 0.37, 0.47]; // violet | white+magenta | texture | texture+slab | white+square

  function start(lt) {
    const g = ctx.g, f = BEATS.filter((b) => lt >= b).length;
    const o = { size: 150, weight: 800, align: 'center', ls: -2 };
    if (f === 0) {
      const grd = g.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, W * 0.7); grd.addColorStop(0, '#9c8cff'); grd.addColorStop(1, '#7a66f2');
      g.fillStyle = grd; g.fillRect(0, 0, W, H);
      g.save(); g.translate(W / 2, H / 2 + 40); g.rotate(-0.03);
      text(g, 'start!!!!', 0, 0, { size: 230, weight: 800, align: 'center', color: null, stroke: 'rgba(255,255,255,.92)', lw: 3.5, ls: 4 }); g.restore();
    } else if (f === 1) {
      g.fillStyle = '#ffffff'; g.fillRect(0, 0, W, H);
      text(g, 'start!!!!!', W * 0.5, H / 2 + 46, { ...o, color: '#f02bd0' });
      g.fillStyle = '#8f8a92'; g.fillRect(W * 0.705, 0, W * 0.1, H); g.fillStyle = '#0c0b10'; g.fillRect(W * 0.795, 0, W * 0.21, H);
    } else if (f === 2 || f === 3) {
      g.drawImage(tex, 0, 0);
      text(g, f === 2 ? 'start!!!' : 'start!!!!', W / 2, H / 2 + 46, { ...o, color: C.ink });
      if (f === 3) { g.fillStyle = 'rgba(96,84,104,.92)'; g.fillRect(0, 0, W * 0.165, H); }
    } else {
      g.fillStyle = '#ffffff'; g.fillRect(0, 0, W, H);
      text(g, 'start!!!!', W / 2, H / 2 + 46, { ...o, color: C.ink });
      g.fillStyle = C.pink; g.fillRect(W * 0.915, H / 2 - 22, 44, 44);
    }
    const w = f === 0 ? 900 : 760;
    ctx.layers.add(W / 2 - w / 2, H / 2 - 120, w, 200);
    return { glow: 0.2, grain: 0.13, flash: (1 - prog(lt, 0, 0.05)) * 0.8, markColor: f === 0 ? 'rgba(255,255,255,.8)' : 'rgba(120,90,130,.4)' };
  }

  function securing(lt) {
    const g = ctx.g;
    g.fillStyle = '#f4f2f3'; g.fillRect(0, 0, W, H);
    const o = { size: 78, weight: 600, ls: -1 }, w = measure(g, 'Securing', o);
    const swap = E.inOutCubic(prog(lt, 0.05, 0.16)), y = H / 2 + 26;
    const tx = lerp(W * 0.555, W * 0.5, swap) - w / 2;
    text(g, 'Securing', tx, y, { ...o, color: lt < 0.09 ? C.pink : C.ink });
    const sq = lerp(tx + w + 46, tx - 70 - prog(lt, 0.16, 0.4) * 130, swap);
    g.fillStyle = C.pink; g.fillRect(sq, y - 40, 26, 26);
    ctx.layers.add(tx, y - 76, w, 100, { path: [[tx - 80, y - 28], [tx + w / 2, y - 28]] }); ctx.layers.add(sq, y - 40, 26, 26);
    return { glow: 0.14, grain: 0.07, markColor: 'rgba(120,90,130,.35)' };
  }

  function real(lt) {
    const g = ctx.g;
    g.fillStyle = '#f4f2f3'; g.fillRect(0, 0, W, H);
    // left edge of the word, in frame widths: slams in, then keeps drifting left
    const x = W * kf(lt, [[0, 1.0], [0.13, 0.15, E.outQuad], [0.23, -0.05, E.lin], [0.6, -0.42, E.lin]]);
    text(g, 'Real', x, H * 0.9, { size: 1240, weight: 700, color: C.pink, ls: -30 });
    ctx.layers.add(x, H * 0.02, 2300, H * 0.9, { path: [[W * 0.9, H / 2], [W * 0.5, H / 2], [W * 0.1, H / 2]] });
    return { glow: 0.14, grain: 0.07, mark: 0 };
  }

  function toolcalls(lt) {
    const g = ctx.g;
    g.fillStyle = '#eeecef'; g.fillRect(0, 0, W, H);
    g.save(); g.translate(W / 2, H * 0.5 + 44);
    text(g, 'tool calls', 0, 0, { size: 250, weight: 700, color: C.pink, align: 'center', ls: -4 }); g.restore();
    ctx.layers.add(W / 2 - 540, H * 0.5 - 160, 1080, 250);
    return { glow: 0.14, grain: 0.07, markColor: 'rgba(120,90,130,.35)' };
  }

  return [
    { id: 'start', start: 21.6, end: 22.17, render: start, flat: true },
    { id: 'securing', start: 22.17, end: 22.57, render: securing, flat: true, blur: () => ({ n: 3, shutter: 0.6 }) },
    { id: 'real', start: 22.57, end: 23.17, render: real, flat: true, blur: () => ({ n: 16, shutter: 0.8 }) },
    { id: 'toolcalls', start: 23.17, end: 23.27, render: toolcalls, flat: true },
  ];
}
