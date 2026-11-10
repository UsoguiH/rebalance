// 23.27–25.57  Sign-off: the mark is drawn in one stroke over the product name and repo.
import { C, text, measure, rr, drawLogo, spline, LOGO_PTS } from '../draw2d.js';
import { shieldIcon, COPY } from '../textures.js';
import { E, prog, pop, lerp, rng, clamp } from '../util.js';

export default function logoScene(ctx) {
  const { W, H } = ctx;

  function render(lt) {
    const g = ctx.g;
    g.fillStyle = '#eeecef'; g.fillRect(0, 0, W, H);
    // "tool calls" shrinks up and away
    const sh = E.outExpo(prog(lt, 0, 0.16)), gone = prog(lt, 0.28, 0.45);
    if (gone < 1) {
      g.save(); g.translate(W / 2, lerp(H * 0.5 + 44, H * 0.5 + 12, sh)); const s = lerp(1, 0.2, sh) * (1 - 0.3 * prog(lt, 0.1, 0.4)); g.scale(s, s);
      text(g, 'tool calls', 0, 0, { size: 250, weight: 700, color: C.pink, align: 'center', ls: -4, alpha: 1 - gone }); g.restore();
    }
    // footer strip
    const fu = E.outExpo(prog(lt, 0.2, 0.55)), fy = H - H * 0.255 * fu;
    g.fillStyle = '#e3e1e6'; g.fillRect(0, fy, W, H * 0.26);
    const a = prog(lt, 0.3, 0.6);
    for (let i = 0; i < 3; i++) shieldIcon(g, W / 2 - 46 + i * 46, fy + 50, 15, `rgba(27,22,64,${0.55 * a})`, '#e3e1e6');
    text(g, 'Open source · runs on-prem', W / 2, fy + 106, { size: 24, weight: 500, color: `rgba(27,22,64,${0.5 * a})`, align: 'center', family: 'Inter' });
    const rw = text(g, COPY.repo, W / 2, fy + 148, { size: 34, weight: 700, color: `rgba(27,22,64,${0.85 * a})`, align: 'center' });
    g.fillStyle = `rgba(27,22,64,${0.6 * a})`; g.fillRect(W / 2 - rw / 2, fy + 156, rw, 3);
    const tags = 'Auth · ABAC · Taint tracking · Approvals · DLP · Audit', twd = measure(g, tags, { size: 25, weight: 600, family: 'Inter' });
    g.fillStyle = `rgba(27,22,64,${0.82 * a})`; rr(g, W / 2 - twd / 2 - 14, fy + 186, twd + 28, 40, 4); g.fill();
    text(g, tags, W / 2, fy + 215, { size: 25, weight: 600, color: `rgba(255,255,255,${a})`, align: 'center', family: 'Inter' });
    text(g, COPY.tagline, W / 2, fy + 258, { size: 21, weight: 400, color: `rgba(27,22,64,${0.45 * a})`, align: 'center', family: 'Inter' });
    ctx.layers.add(W / 2 - 420, fy + 26, 840, 240);

    // the mark
    const draw = E.inOut(prog(lt, 0.42, 1.2)), cx = W / 2, cy = H * 0.43, sc = 1.45;
    const grd = g.createLinearGradient(cx - 150, cy - 110, cx + 150, cy + 120); grd.addColorStop(0, '#ff7a6b'); grd.addColorStop(0.5, '#f2317f'); grd.addColorStop(1, '#d81b74');
    drawLogo(g, cx, cy, sc, draw, grd, 14);
    if (draw > 0 && draw < 1) { // ink flecks thrown off the brush tip
      const [px, py] = spline(LOGO_PTS, draw), r = rng(Math.floor(lt * 30));
      g.fillStyle = '#f2317f';
      for (let i = 0; i < 5; i++) { g.beginPath(); g.arc(cx + px * sc + (r() - 0.5) * 70, cy + py * sc + (r() - 0.5) * 70, 1.5 + r() * 4, 0, 6.283); g.fill(); }
    }
    const wp = E.outCubic(prog(lt, 1.15, 1.35));
    if (wp > 0) text(g, COPY.product, cx, cy + 168 + (1 - wp) * 16, { size: 50, weight: 800, color: C.ink, align: 'center', ls: 1, alpha: wp });
    ctx.layers.add(cx - 170, cy - 130, 340, 260, { path: LOGO_PTS.filter((_, i) => i % 3 === 0).map(([x, y]) => [cx + x * sc, cy + y * sc]) });
    if (wp > 0) ctx.layers.add(cx - 170, cy + 134, 340, 56);
    return { glow: 0.14, grain: 0.07, mark: 0 };
  }

  return [{ id: 'logo', start: 23.27, end: 25.57, render, flat: true }];
}
