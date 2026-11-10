// 15.83–18.67  Blue sky: the umbrella floats over "Secured", then the feature panel slides up.
import { THREE, keyLight, setCam, makeCam, vpHelpers } from '../kit3d.js';
import * as P from '../props.js';
import { C, text, measure, font, rr, cloudSprite, makeCanvas } from '../draw2d.js';
import { shieldIcon } from '../textures.js';
import { kf, E, prog, pop, lerp, wobble, clamp } from '../util.js';

export default function skyScene(ctx) {
  const { W, H } = ctx;
  const scene = new THREE.Scene(), cam = makeCam(30);
  scene.userData.envI = 0.5;
  scene.add(new THREE.HemisphereLight(0xffffff, 0xbfd9ff, 1.25));
  const key = keyLight(scene, [-4, 7, 6], { intensity: 1.5, size: 5 });
  const umb = P.umbrella(); scene.add(umb);
  vpHelpers(scene, { size: 24, div: 24, y: -2.4, gizmos: [[-2.5, 2.2, 1], [2.6, 2.4, 0.5]] });

  const clouds = [cloudSprite(1500, 750, 11), cloudSprite(1300, 650, 12), cloudSprite(1500, 750, 13), cloudSprite(1100, 560, 14)];
  const WORD = 'Secured';
  const BULLETS = ['18-stage security pipeline', '2FA login + OAuth 2.1 onboarding', 'ABAC policy, deny-by-default', 'Human-in-the-loop approvals', 'Prompt-injection taint tracking', 'Saudi PII DLP masking', 'Tamper-evident audit chain', '19-page admin console · AR/EN'];

  function sky(g, lt) {
    const grd = g.createLinearGradient(0, 0, 0, H); grd.addColorStop(0, '#4fb0ea'); grd.addColorStop(0.6, '#8fd2f4'); grd.addColorStop(1, '#c9ecfa');
    g.fillStyle = grd; g.fillRect(0, 0, W, H);
    const sun = g.createRadialGradient(W * 0.08, H * 0.02, 0, W * 0.08, H * 0.02, W * 0.75);
    sun.addColorStop(0, 'rgba(255,255,255,.9)'); sun.addColorStop(0.2, 'rgba(255,255,255,.3)'); sun.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = sun; g.fillRect(0, 0, W, H);
    const d = lt * 40;
    g.globalAlpha = 0.85;
    g.drawImage(clouds[0], -620 + d, H * 0.55, 1500, 750);
    g.drawImage(clouds[1], W - 760 + d * 0.6, -260, 1300, 650);
    g.drawImage(clouds[2], W * 0.58 + d * 1.2, H * 0.6, 1500, 750);
    g.drawImage(clouds[3], -140 + d * 0.8, -150, 900, 470);
    g.globalAlpha = 1;
  }

  function word(g, lt) {
    const inA = prog(lt, 0.12, 0.5), exit = prog(lt, 1.5, 1.72);
    if (inA <= 0 || exit >= 1) return;
    const size = 290, y = H * 0.585, o = { size, weight: 800, ls: -6 };
    const scale = lerp(0.72, 1, E.outCubic(prog(lt, 0.12, 0.7))) * (1 + 0.05 * prog(lt, 0.7, 1.5));
    const full = measure(g, WORD, o);
    // which letter carries the pink accent
    const hot = lt < 0.5 ? 0 : lt < 0.88 ? WORD.length - 1 : lt < 1.12 ? 2 : -1;
    g.save(); g.translate(W / 2, y); g.scale(scale, scale); g.translate(-full / 2, 0);
    let x = 0;
    [...WORD].forEach((ch, i) => {
      const w = measure(g, ch, o), a = clamp(inA * 2.2 - i * 0.12) * (1 - exit);
      let dx = 0;
      if (i === WORD.length - 1) dx = (1 - E.outCubic(prog(lt, 0.42, 0.66))) * 160;
      text(g, ch, x + dx, 0, { ...o, color: i === hot ? C.hot : '#ffffff', alpha: a });
      x += w - 6;
    });
    g.restore();
    if (exit > 0) { // outlined echo that blows outward as the word leaves
      g.save(); g.translate(W / 2, y); const s2 = scale * (1 + exit * 0.75); g.scale(s2, s2);
      text(g, WORD, 0, 0, { ...o, align: 'center', color: null, stroke: `rgba(255,255,255,${0.8 * (1 - exit)})`, lw: 3 });
      g.restore();
    }
    const tag = (s, x0, a0) => {
      const p = pop(lt, a0, 0.3, 2.2) * (1 - exit); if (p <= 0) return;
      g.save(); g.translate(x0, y + 62 * scale); g.scale(p, p);
      text(g, s, 0, 0, { size: 50, weight: 700, color: C.hot, align: 'center' }); g.restore();
      ctx.layers.add(x0 - 130, y + 62 * scale - 44, 260, 60);
    };
    tag('zero-trust', W / 2 - full * 0.27 * scale, 0.62);
    tag('on-prem', W / 2 + full * 0.27 * scale, 0.84);
    ctx.layers.add(W / 2 - full * scale / 2, y - 200 * scale, full * scale, 240 * scale);
  }

  function thumb(g, x, y, w, h, i) {
    const cols = [['#ffd9c7', '#ff8f6b'], ['#e8ddff', '#8b5cf6'], ['#ffd6ea', '#f2317f']][i];
    g.save(); rr(g, x, y, w, h, 14); g.clip();
    const grd = g.createLinearGradient(x, y, x + w, y + h); grd.addColorStop(0, cols[0]); grd.addColorStop(1, '#ffffff');
    g.fillStyle = grd; g.fillRect(x, y, w, h);
    g.fillStyle = 'rgba(255,255,255,.85)'; g.fillRect(x, y, w, 20);
    g.fillStyle = cols[1];
    if (i === 0) { for (let k = 0; k < 4; k++) { rr(g, x + 16 + k * 52, y + 36 + (k % 2) * 10, 40, 64 - (k % 2) * 10, 6); g.fill(); } }
    else if (i === 1) { shieldIcon(g, x + w / 2, y + h / 2 + 10, 34, cols[1]); }
    else { for (let k = 0; k < 4; k++) { rr(g, x + 16, y + 34 + k * 19, 90 + ((k * 53) % 90), 10, 5); g.fill(); } }
    g.restore();
  }

  function panel(g, lt) {
    const up = E.outExpo(prog(lt, 1.62, 2.05)); if (up <= 0) return;
    const ph = H * 0.375, y0 = H - ph * up;
    g.fillStyle = '#fbf8f9'; g.fillRect(0, y0, W, ph + 2);
    const words = (list, x, y, t0, size = 64) => {
      let cx = x;
      list.forEach(([s, col, a0], i) => {
        const p = prog(lt, a0, a0 + 0.14); if (p <= 0) return;
        const c = typeof col === 'function' ? col(lt) : col;
        const w = text(g, s, cx, y + (1 - E.outCubic(p)) * 18, { size, weight: 700, color: c, alpha: p, ls: -1 });
        cx += w + size * 0.26;
      });
      return cx - x;
    };
    const pinkThenInk = (a) => (t) => (t < a ? C.pink : C.ink);
    words([['One', C.ink, 1.84], ['gateway', C.ink, 1.94]], 62, y0 + 92, 0);
    words([['Guards', C.ink, 2.04], ['Every', C.ink, 2.12], ['Tool', pinkThenInk(2.5), 2.2], ['Call', pinkThenInk(2.5), 2.26]], 62, y0 + 162, 0);
    for (let i = 0; i < 3; i++) {
      const p = pop(lt, 1.96 + i * 0.07, 0.3, 1.8); if (p <= 0) continue;
      g.save(); g.translate(62 + i * 250 + 112, y0 + 262); g.scale(p, p); thumb(g, -112, -62, 224, 124, i); g.restore();
      text(g, ['On-prem · Docker', 'Zero-trust PEP', '~340 tests green'][i], 62 + i * 250, y0 + 362, { size: 19, weight: 500, color: 'rgba(27,22,64,.45)', family: 'Inter', alpha: prog(lt, 2.2, 2.4) });
    }
    const bx = 1250, a = prog(lt, 1.9, 2.05);
    g.fillStyle = `rgba(247,196,160,${a})`; rr(g, bx, y0 + 46, 150, 12, 6); g.fill();
    BULLETS.forEach((s, i) => {
      const p = prog(lt, 1.98 + i * 0.045, 2.12 + i * 0.045); if (p <= 0) return;
      const y = y0 + 96 + i * 34;
      if (i === BULLETS.length - 1) { g.fillStyle = `rgba(250,214,190,${p})`; rr(g, bx + 24, y - 23, measure(g, s, { size: 25, weight: 500, family: 'Inter' }) + 14, 31, 6); g.fill(); }
      g.fillStyle = `rgba(27,22,64,${0.7 * p})`; g.beginPath(); g.arc(bx + 8, y - 8, 4, 0, 6.283); g.fill();
      text(g, s, bx + 30, y, { size: 25, weight: 500, color: C.ink, family: 'Inter', alpha: p });
    });
    ctx.layers.add(62, y0 + 40, 700, 130); ctx.layers.add(62, y0 + 200, 724, 124); ctx.layers.add(bx, y0 + 40, 520, 330);
  }

  function render(lt, t) {
    const g = ctx.g;
    const rise = E.inOutCubic(prog(lt, 1.55, 2.05));
    setCam(cam, [0, 0.2, 9.5], [0, 0, 0], 0, 30);
    umb.position.set(wobble(t, 9, 0.8) * 0.08, lerp(0.3, 1.12, rise) + Math.sin(t * 2.2) * 0.07, 0);
    umb.rotation.set(0.3, t * 0.55, Math.sin(t * 1.3) * 0.07 - 0.05);
    umb.scale.setScalar(lerp(1.15, 0.95, rise) * lerp(1.5, 1, E.outCubic(prog(lt, 0, 0.5))));

    if (ctx.viewport) { g.fillStyle = '#cfd6dd'; g.fillRect(0, 0, W, H); } else sky(g, lt);
    word(g, lt);
    ctx.draw3d(scene, cam);
    panel(g, lt);

    // opening: white letterbox + pink swoosh
    const open = 1 - E.outCubic(prog(lt, 0, 0.3));
    if (open > 0) {
      const bh = H * 0.25 * open; g.fillStyle = '#ffffff'; g.fillRect(0, 0, W, bh); g.fillRect(0, H - bh, W, bh);
      g.strokeStyle = C.hot; g.lineWidth = 9 * open; g.lineCap = 'round';
      g.beginPath(); g.moveTo(W * 0.25, H * 0.42); g.quadraticCurveTo(W * 0.27, H * 0.62, W * (0.3 + 0.35 * (1 - open)), H * 0.62); g.stroke();
    }
    // closing: small pointer + fade to white
    const end = prog(lt, 2.66, 2.84);
    return { glow: 0.22, htw: 0.1, grain: 0.08, flash: Math.max(E.inQuad(end), (1 - prog(lt, 0, 0.12)) * 0.5), markColor: lt > 1.7 ? 'rgba(90,80,120,.4)' : 'rgba(255,255,255,.8)' };
  }

  return [{ id: 'sky', start: 15.83, end: 18.67, render, blur: (lt) => (lt > 1.5 && lt < 2.0 ? { n: 3, shutter: 0.6 } : null) }];
}
