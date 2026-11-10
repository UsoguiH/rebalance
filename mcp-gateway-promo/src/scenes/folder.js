// 18.65–20.30  "everything": the folder spins in inside a pink ring, opens, and its files
//              fly out as cards that streak into the console.
import { THREE, keyLight, setCam, makeCam, vpHelpers, canvasTex, screenPlace, spanAt } from '../kit3d.js';
import * as P from '../props.js';
import { C, text, measure, rr, halftone } from '../draw2d.js';
import { kf, E, prog, pop, lerp, wobble, clamp } from '../util.js';

export default function folderScene(ctx) {
  const { W, H } = ctx;
  const scene = new THREE.Scene(), cam = makeCam(30);
  scene.userData.envI = 0.6;
  scene.add(new THREE.HemisphereLight(0xffffff, 0xffe6ef, 1.2));
  keyLight(scene, [-3, 6, 7], { intensity: 1.4, size: 6 });
  const folder = P.folder(); scene.add(folder);

  const cardTex = (c0, c1, label) => canvasTex(520, 360, (g, w, h) => {
    rr(g, 3, 3, w - 6, h - 6, 40);
    const grd = g.createLinearGradient(0, 0, w, h); grd.addColorStop(0, c0); grd.addColorStop(1, c1); g.fillStyle = grd; g.fill();
    g.save(); g.clip(); g.globalAlpha = 0.5; g.drawImage(halftone(w, h, '#ffffff', (x, y) => clamp(1.3 - (x + y) * 0.9), 13, 0.4), 0, 0); g.restore();
    text(g, label, 34, 76, { size: 50, weight: 800, color: 'rgba(255,255,255,.95)' });
  });
  const cards = [['#ff9a4a', '#ff6a2a', 'policy.yaml'], ['#ff7fb8', '#f2317f', 'audit.log'], ['#d7a6ff', '#9a5cf6', 'tools.lock'], ['#9fd4ff', '#4a9af0', 'config.yaml'], ['#ffd0e2', '#ff9ac4', 'approvals']].map(([a, b, l], i) => {
    const c = P.card(1.3, 0.9, cardTex(a, b, l), 0xffffff, { r: 0.11, opacity: 1 }); scene.add(c); c.userData.i = i; return c;
  });
  vpHelpers(scene, { size: 20, div: 20, y: -2.2, gizmos: [[-2, 2, 1], [2.2, 2.2, 0.8]] });

  // thick brush ring that is already sweeping round when the shot opens
  function ring(g, lt) {
    const out = E.inCubic(prog(lt, 0.85, 1.1)); if (out >= 1) return;
    const cx = W * 0.5, cy = H * 0.52, R = W * 0.4;
    g.save(); g.translate(cx, cy); g.rotate(-0.6 + lt * 0.9); g.scale(1, 0.92);
    const a0 = 0.2 + out * 5.2, a1 = 0.2 + lerp(4.6, 6.0, E.outCubic(prog(lt, 0, 0.6)));
    for (let i = 0; i < 100; i++) {
      const u0 = i / 100, u1 = (i + 1) / 100; if (lerp(0.2, a1, u1) <= a0) continue;
      g.strokeStyle = C.hot; g.lineCap = 'butt'; g.lineWidth = 8 + W * 0.075 * Math.pow(Math.sin(u0 * Math.PI), 1.3);
      g.beginPath(); g.arc(0, 0, R + Math.sin(u0 * 9) * 16, lerp(0.2, a1, u0), lerp(0.2, a1, u1) + 0.01); g.stroke();
    }
    g.restore();
    ctx.layers.add(cx - R, cy - R * 0.92, R * 2, R * 1.84);
  }

  // "everything": letters light up left to right behind the folder, then fade
  function word(g, lt) {
    const s = 'everything', o = { size: 330, weight: 800, ls: -4 }, full = measure(g, s, o);
    let x = W / 2 - full / 2;
    [...s].forEach((ch, i) => {
      const w = measure(g, ch, o), on = 0.08 + i * 0.037, a = prog(lt, on, on + 0.03) * lerp(1, 0.12, prog(lt, on + 0.08, on + 0.15)) * (1 - prog(lt, 0.6, 0.8));
      if (a > 0.01) text(g, ch, x, H * 0.63, { ...o, color: C.hot, alpha: a });
      x += w - 4;
    });
    ctx.layers.add(W / 2 - full / 2, H * 0.63 - 250, full, 300);
  }

  function render(lt, t) {
    const g = ctx.g;
    setCam(cam, [0, 0.1, 8.5], [0, 0, 0], 0, 30);
    // folder: spins in small and low-left, settles centre, opens, then drops away
    const leave = E.inQuad(prog(lt, 1.05, 1.27));
    const f = kf(lt, [[0, [0.42, 0.6, 0.17, -0.5, -1.2]], [0.3, [0.5, 0.53, 0.29, -0.2, 0.42], E.outCubic], [1.05, [0.5, 0.52, 0.3, -0.16, 0.25], E.lin], [1.4, [0.56, 0.86, 0.2, 0.5, -1.4], E.inCubic]]);
    folder.visible = leave < (ctx.viewport ? 0.5 : 1);
    screenPlace(folder, cam, f[0], f[1] + Math.sin(t * 2) * 0.004, 8.5);
    folder.scale.setScalar(spanAt(cam, f[2], 8.5) / 1.6);
    folder.rotation.set(-0.3, f[4], f[3]);
    folder.userData.open(E.outCubic(prog(lt, 0.38, 0.62)));
    folder.traverse((o) => { if (o.isMesh && o.material && !o.userData.finalOnly) { o.material.transparent = leave > 0; o.material.opacity = 1 - leave; } });

    // file cards: up to the right, over to the left, then into the streak
    cards.forEach((c) => {
      const i = c.userData.i, d = i * 0.035;
      const k = kf(lt - d, [[1.05, [0.52, 0.48, 0.0]], [1.22, [0.64 - i * 0.012, 0.24 + i * 0.03, 0.1], E.outCubic], [1.36, [0.44 - i * 0.012, 0.25 + i * 0.045, 0.11], E.inOut], [1.54, [0.3 + i * 0.022, 0.3 + i * 0.055, 0.11], E.inOut], [1.65, [0.34, 0.5, 0.06], E.inCubic]]);
      c.visible = lt - d > 1.05 && lt < 1.65;
      screenPlace(c, cam, k[0], k[1], 7);
      c.quaternion.copy(cam.quaternion); c.rotateZ(-0.25 + i * 0.1 + Math.sin(lt * 5 + i) * 0.15); c.rotateY(0.3 - (lt - 1.05) * 0.8); c.rotateX(-0.2);
      c.scale.setScalar(Math.max(1e-3, spanAt(cam, k[2], 7) / 1.3));
    });

    g.fillStyle = ctx.viewport ? '#f4f6f8' : '#fcf4f7'; g.fillRect(0, 0, W, H);
    ring(g, lt);
    word(g, lt);
    ctx.draw3d(scene, cam);
    return { glow: 0.26, ht: 0.1, grain: 0.08, flash: (1 - E.outCubic(prog(lt, 0, 0.15))) * 0.6, markColor: 'rgba(120,90,130,.4)' };
  }

  return [{ id: 'folder', start: 18.65, end: 20.3, render, blur: (lt) => (lt > 1.05 ? { n: 6, shutter: 0.8 } : lt < 0.3 ? { n: 4, shutter: 0.7 } : null) }];
}
