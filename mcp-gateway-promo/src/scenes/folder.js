// 18.67–20.55  "everything": the folder spins in, opens, and its files burst out as cards.
import { THREE, keyLight, setCam, makeCam, vpHelpers, canvasTex } from '../kit3d.js';
import * as P from '../props.js';
import { C, text, rr, halftone } from '../draw2d.js';
import { kf, E, prog, pop, lerp, wobble, clamp, TAU } from '../util.js';

export default function folderScene(ctx) {
  const { W, H } = ctx;
  const scene = new THREE.Scene(), cam = makeCam(30);
  scene.userData.envI = 0.55;
  scene.add(new THREE.HemisphereLight(0xffffff, 0xffe6ef, 1.25));
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

  function ring(g, lt) {
    const p = E.outCubic(prog(lt, 0.25, 1.25)); if (p <= 0) return;
    const out = prog(lt, 1.3, 1.5); if (out >= 1) return;
    const cx = W * 0.5, cy = H * 0.52, R = 600;
    g.save(); g.translate(cx, cy); g.rotate(-0.5 + lt * 1.1); g.scale(1, 0.94);
    const a0 = 1.2 + out * 4.5, a1 = 1.2 + p * 5.6;
    for (let i = 0; i < 90; i++) {
      const u0 = i / 90, u1 = (i + 1) / 90; if (lerp(a0, a1, u1) <= a0) continue;
      g.strokeStyle = C.hot; g.lineCap = 'butt'; g.lineWidth = 6 + 70 * Math.pow(Math.sin(u0 * Math.PI), 1.5);
      g.beginPath(); g.arc(0, 0, R + Math.sin(u0 * 9) * 14, lerp(a0, a1, u0), lerp(a0, a1, u1) + 0.01); g.stroke();
    }
    g.restore();
    ctx.layers.add(cx - R, cy - R * 0.94, R * 2, R * 1.88);
  }

  function render(lt, t) {
    const g = ctx.g;
    setCam(cam, [0, 0.1, 8.5], [0, 0, 0], kf(lt, [[0, -6], [1.3, 3]]), 30);
    const open = E.outBack(prog(lt, 0.78, 1.08), 1.2), leave = E.inCubic(prog(lt, 1.36, 1.6));
    const s = pop(lt, 0.0, 0.42, 1.8) * (1 - leave);
    folder.visible = s > 0.001;
    folder.scale.setScalar(Math.max(0.001, 1.38 * s));
    folder.position.set(0.05, -0.1 - leave * 2.5 + Math.sin(t * 2) * 0.04, 0);
    folder.rotation.set(-0.25 - open * 0.25, kf(lt, [[0, -2.6], [0.45, 0.42, E.outCubic], [0.8, 0.3], [1.36, -0.25], [1.6, -2.4, E.inCubic]]), -0.2 + open * 0.1);
    folder.userData.flap.rotation.x = open * 0.95;
    folder.userData.files.forEach((f, i) => { const k = E.outBack(prog(lt, 0.86 + i * 0.07, 1.2 + i * 0.07), 1.4); f.position.y = k * (0.34 + i * 0.2); f.rotation.z = k * (i - 1) * 0.07; });

    cards.forEach((c) => {
      const i = c.userData.i, k = E.outCubic(prog(lt, 1.34 + i * 0.025, 1.7 + i * 0.025)), gather = E.inCubic(prog(lt, 1.66, 1.86));
      c.visible = k > 0.001 && gather < 1;
      const a = -0.9 + i * 0.5;
      c.position.set(lerp(0, Math.cos(a) * 1.9 - 0.4, k) * (1 - gather) + gather * 1.0, lerp(-0.2, 0.9 + Math.sin(a) * 0.7, k) * (1 - gather * 0.9), i * 0.12 + k * 0.6);
      c.rotation.set(-0.3 + k * 0.2, lerp(-2.2, 0.35 - i * 0.12, k), lerp(0.9, -0.2 + i * 0.08, k));
      c.scale.setScalar(Math.max(0.001, k * (1 - gather * 0.7)));
    });

    g.fillStyle = ctx.viewport ? '#f4f6f8' : '#fcf4f7'; g.fillRect(0, 0, W, H);
    ring(g, lt);
    // "everything" streams past behind the folder
    const tx = lerp(W * 0.86, -W * 0.5, prog(lt, 0.28, 1.02));
    if (lt > 0.28 && lt < 1.02) { text(g, 'everything', tx, H * 0.6, { size: 300, weight: 800, color: C.hot, ls: -6 }); ctx.layers.add(tx, H * 0.6 - 230, 1500, 290); }
    ctx.draw3d(scene, cam);
    // pink smear that carries us into the UI
    const sm = prog(lt, 1.74, 1.88);
    if (sm > 0) {
      const x0 = lerp(W * 0.52, W * 0.2, sm), x1 = lerp(W * 0.62, W * 1.1, E.outCubic(sm));
      const grd = g.createLinearGradient(x0, 0, x1, 0); grd.addColorStop(0, 'rgba(255,45,134,0)'); grd.addColorStop(0.5, C.hot); grd.addColorStop(1, '#ff7ab0');
      g.fillStyle = grd; rr(g, x0, H * 0.4, x1 - x0, H * 0.2, 30); g.fill();
    }
    return { glow: 0.26, ht: 0.1, grain: 0.08, flash: (1 - E.outCubic(prog(lt, 0, 0.25))) * 0.9, markColor: 'rgba(120,90,130,.4)' };
  }

  return [{ id: 'folder', start: 18.67, end: 20.55, render, blur: (lt) => (lt > 1.34 ? { n: 6, shutter: 0.8 } : lt < 1.02 ? { n: 6, shutter: 0.45 } : null) }];
}
