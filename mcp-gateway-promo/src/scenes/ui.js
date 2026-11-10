// 20.30–21.57  The console: "Go beyond API keys." with connectors and control tags popping in.
import { C, text, measure, rr } from '../draw2d.js';
import { shieldIcon } from '../textures.js';
import { E, prog, pop, lerp, clamp } from '../util.js';

const NAV = ['Overview', 'Tools', 'Approvals', 'Audit log', 'Policy'];
const TAGS = ['Auth', 'ABAC', 'Taint', 'HITL', 'DLP', 'Audit'];
const TILES = [['postgres', '83 tools', '#4f9bd9', '#cfe6fa'], ['gitea', '116 tools', '#58b368', '#d8f0dc'], ['files', '6 tools', '#f2a03d', '#fde6c8'], ['browser', '8 tools', '#e0567a', '#fbd3de'], ['qdrant', '10 tools', '#8b5cf6', '#e4d9ff'], ['reports', '2 tools', '#2e2a4f', '#d9d6ea']];

export default function uiScene(ctx) {
  const { W, H } = ctx;

  function navIcon(g, x, y, i) {
    g.save(); g.strokeStyle = C.ink; g.lineWidth = 2.5; g.lineJoin = 'round';
    if (i === 0) g.strokeRect(x - 9, y - 9, 18, 18);
    else if (i === 1) { g.beginPath(); g.moveTo(x - 7, y - 9); g.lineTo(x + 9, y); g.lineTo(x - 7, y + 9); g.closePath(); g.stroke(); }
    else if (i === 2) { g.beginPath(); g.moveTo(x - 9, y); g.lineTo(x - 2, y + 7); g.lineTo(x + 10, y - 7); g.stroke(); }
    else if (i === 3) { g.strokeRect(x - 8, y - 10, 16, 20); g.beginPath(); g.moveTo(x - 4, y - 3); g.lineTo(x + 4, y - 3); g.moveTo(x - 4, y + 3); g.lineTo(x + 4, y + 3); g.stroke(); }
    else { g.beginPath(); g.arc(x, y, 9, 0, 6.283); g.stroke(); }
    g.restore();
  }

  function render(lt) {
    const g = ctx.g;
    g.fillStyle = '#f6f3f4'; g.fillRect(0, 0, W, H);
    const exit = E.inCubic(prog(lt, 1.14, 1.27));
    g.save(); g.translate(-exit * 260, 0);

    // sidebar
    const sx = lerp(-320, 0, E.outExpo(prog(lt, 0.0, 0.3)));
    g.save(); g.translate(sx, 0);
    const sb = g.createLinearGradient(0, 0, 300, 0); sb.addColorStop(0, '#efe6de'); sb.addColorStop(1, 'rgba(246,243,244,0)');
    g.fillStyle = sb; g.fillRect(0, 0, 300, H);
    NAV.forEach((s, i) => { navIcon(g, 56, 62 + i * 68, i); text(g, s, 92, 70 + i * 68, { size: 24, weight: 600, color: C.ink, family: 'Inter' }); });
    rr(g, 26, H - 178, 262, 62, 14); g.fillStyle = '#ece3da'; g.fill(); g.strokeStyle = 'rgba(27,22,64,.15)'; g.lineWidth = 2; g.stroke();
    text(g, 'Open Console', 157, H - 139, { size: 23, weight: 600, color: C.ink, align: 'center', family: 'Inter' });
    rr(g, 26, H - 100, 262, 62, 14); g.fillStyle = '#e8734f'; g.fill();
    text(g, 'Connect AI', 157, H - 61, { size: 23, weight: 600, color: '#fff', align: 'center', family: 'Inter' });
    g.restore();
    ctx.layers.add(sx + 26, 30, 262, 330); ctx.layers.add(sx + 26, H - 178, 262, 140);

    // centre group
    const cx = W * 0.515, cy = H * 0.5, zoom = 0.68 - 0.03 * prog(lt, 0.3, 1.27);
    g.save(); g.translate(cx, cy); g.scale(zoom, zoom);
    const tw = 172, th = 112, gapx = 10, total = TILES.length * tw + (TILES.length - 1) * gapx;
    const settle = E.outCubic(prog(lt, 0.0, 0.36));
    if (settle < 0.98) { // the strip arrives as a horizontal smear
      const sw = lerp(total * 1.6, total, settle), grd = g.createLinearGradient(-sw / 2, 0, sw / 2, 0);
      TILES.forEach((t, i) => grd.addColorStop(i / (TILES.length - 1), t[2]));
      g.globalAlpha = 1 - settle; g.fillStyle = grd; g.filter = `blur(${Math.round(26 * (1 - settle))}px)`;
      g.fillRect(-sw / 2 - (1 - settle) * 420, -th / 2, sw, th); g.filter = 'none'; g.globalAlpha = 1;
    }
    TILES.forEach(([name, n, c0, c1], i) => {
      const x = -total / 2 + i * (tw + gapx) - (1 - settle) * (360 - i * 40);
      g.globalAlpha = clamp(settle * 1.6 - 0.3);
      rr(g, x, -th / 2, tw, th, 14); const grd = g.createLinearGradient(x, -th / 2, x + tw, th / 2); grd.addColorStop(0, c0); grd.addColorStop(1, c1); g.fillStyle = grd; g.fill();
      rr(g, x + 14, -th / 2 + 14, 40, 40, 10); g.fillStyle = 'rgba(255,255,255,.92)'; g.fill(); shieldIcon(g, x + 34, -th / 2 + 34, 12, c0, '#fff');
      text(g, name, x + 14, th / 2 - 34, { size: 23, weight: 700, color: i === 5 ? '#fff' : C.ink });
      text(g, n, x + 14, th / 2 - 13, { size: 15, weight: 500, color: 'rgba(27,22,64,.55)', family: 'Inter' });
      g.globalAlpha = 1;
    });
    ctx.layers.add(cx - total / 2 * zoom, cy - th / 2 * zoom, total * zoom, th * zoom, { path: [[cx + 620, cy], [cx + 420, cy], [cx + 200, cy], [cx, cy]] });

    // headline, word by word; last words land pink then settle to ink
    const o = { size: 58, weight: 600, ls: -1 }, words = [['Go', 0.38], ['beyond', 0.48], ['API', 0.66], ['keys.', 0.69]];
    const fullW = measure(g, 'Go beyond API keys.', o);
    let x = -fullW / 2;
    words.forEach(([s, a0], i) => {
      const p = prog(lt, a0, a0 + 0.12), w = measure(g, s + ' ', o);
      if (p > 0) text(g, s, x, -th / 2 - 30 + (1 - E.outCubic(p)) * 14, { ...o, color: i >= 2 && lt < 0.8 ? C.pink : C.ink, alpha: p });
      x += w;
    });
    ctx.layers.add(cx - fullW / 2 * zoom, cy - (th / 2 + 84) * zoom, fullW * zoom, 66 * zoom);

    // control tags
    const tgw = 150, tgap = 22, tt = TAGS.length * tgw + (TAGS.length - 1) * tgap;
    TAGS.forEach((s, i) => {
      const p = pop(lt, 0.48 + i * 0.09, 0.2, 2.4); if (p <= 0) return;
      const tx = -tt / 2 + i * (tgw + tgap) + tgw / 2, ty = th / 2 + 62;
      g.save(); g.translate(tx, ty); g.scale(p, p);
      rr(g, -tgw / 2, -23, tgw, 46, 23); g.fillStyle = '#3f8fe0'; g.fill();
      text(g, s, 0, 9, { size: 24, weight: 700, color: '#fff', align: 'center' }); g.restore();
      ctx.layers.add(cx + (tx - tgw / 2) * zoom, cy + (ty - 23) * zoom, tgw * zoom, 46 * zoom);
    });
    g.restore(); g.restore();

    return { glow: 0.16, grain: 0.07, flash: Math.max((1 - prog(lt, 0, 0.14)) * 0.5, 0), markColor: 'rgba(120,90,130,.35)' };
  }

  return [{ id: 'ui', start: 20.3, end: 21.57, render, flat: true, blur: (lt) => (lt < 0.36 || lt > 1.14 ? { n: 4, shutter: 0.8 } : null) }];
}
