// 3.23–9.07  The room: fly to the laptop, press the big "Connect" pill, and it's live.
// Sub-shots and their cut times are taken from the reference: 3.33 wide, 4.07 dutch,
// 5.20 laptop, 5.95 macro (press at 6.87), 7.53 live, 8.33 wider, whip out by 9.07.
import { THREE, mat, glossy, mesh, keyLight, setCam, makeCam, cursorMesh, vpHelpers, box, screenPlace, spanAt } from '../kit3d.js';
import * as P from '../props.js';
import * as T from '../textures.js';
import { C, text, measure } from '../draw2d.js';
import { kf, E, prog, pop, lerp, wobble, clamp, rng } from '../util.js';

export default function roomScene(ctx) {
  const { W, H } = ctx;
  const scene = new THREE.Scene(), cam = makeCam(38);
  scene.userData.envI = 0.35;
  const hemi = new THREE.HemisphereLight(0xffffff, 0xcfa2ff, 1.05); hemi.layers.enableAll(); scene.add(hemi);
  const key = keyLight(scene, [-5, 9, 6], { intensity: 1.5, size: 10, color: 0xfff6fb, radius: 6 }); key.layers.enableAll();
  const rim = new THREE.DirectionalLight(0xffd0ee, 1.3); rim.position.set(1, 6, -7); rim.layers.enableAll(); scene.add(rim);

  // shell
  scene.add(mesh(new THREE.PlaneGeometry(60, 60), mat(0xd9bdf7, { roughness: 0.8 }), { rot: [-Math.PI / 2, 0, 0], cast: false, vp: 0x8fa6d9 }));
  scene.add(mesh(new THREE.PlaneGeometry(60, 30), mat(0xf3e6fb, { roughness: 0.9 }), { pos: [0, 15, -4.2], cast: false, vp: 0x9fc9a8 }));
  scene.add(mesh(new THREE.PlaneGeometry(30, 30), mat(0xf59ac8, { roughness: 0.9 }), { pos: [-8, 15, 0], rot: [0, Math.PI / 2, 0], cast: false, vp: 0x4f6654 }));
  const win = new THREE.Mesh(new THREE.PlaneGeometry(7.5, 5.2), new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false }));
  win.position.set(0.6, 5.9, -4.15); win.userData.vp = 0x9cc3e0; scene.add(win);
  const frameMat = mat(0xf7c5de, { roughness: 0.6 });
  for (const [x, y, w, h] of [[0.6, 8.55, 7.9, 0.22], [0.6, 3.25, 7.9, 0.22], [-3.25, 5.9, 0.22, 5.5], [4.45, 5.9, 0.22, 5.5], [0.6, 5.9, 0.14, 5.3], [0.6, 6.4, 7.6, 0.12]]) {
    scene.add(mesh(box(w, h, 0.14, 0.03), frameMat, { pos: [x, y, -4.1], vp: 0xd9b98f }));
  }
  const clock = P.wallClock(); clock.position.set(-7.9, 6.6, 0.5); clock.rotation.y = Math.PI / 2; scene.add(clock);

  const DY = 2.67; // desk-top height
  scene.add(P.desk(9.4, 3.4, 2.6));
  const texIdle = T.consoleTex('idle'), texLive = T.consoleTex('live');
  const lap = P.laptop(texIdle); lap.position.set(0, DY, 0.1); scene.add(lap);
  const chair = P.chair(); chair.position.set(5.6, 0, 0.9); chair.rotation.y = -1.9; chair.scale.setScalar(1.25); scene.add(chair);
  const cup = P.penCup({ seed: 9 }); cup.position.set(2.9, DY, -0.7); scene.add(cup);
  for (const [i, c] of [0xf46aa8, 0xb07cff, 0xffc2dc].entries()) scene.add(mesh(box(1.25, 0.14, 0.9, 0.03), mat(c, { roughness: 0.7 }), { pos: [-3.1, DY + 0.07 + i * 0.14, -0.3], rot: [0, 0.15 * i - 0.1, 0] }));

  // loose props that get blown off the desk when the gateway goes live
  const r = rng(21);
  const loose = [
    [P.headphones(), [2.15, DY, 0.75], [0, 0.4, 0], [0.5, 1.4, 0.9]],
    [P.mug(), [-1.95, DY, 0.85], [0, 1, 0], [-0.3, 0.7, 1.4]],
    [P.buzzer(), [-2.1, DY, -0.55], [0, 0.3, 0], [-2.9, 2.1, 0.3]],
    [P.marker(), [0.4, DY + 0.1, 1.35], [0, 0, 1.45], [0.3, 0.3, 1.9]],
    [P.marker(), [3.1, DY + 0.1, 0.7], [0, 0.6, 1.5], [2.9, 2.4, 0.2]],
    [P.phone(), [3.0, DY + 0.05, 1.2], [-Math.PI / 2, 0, 0.3], [2.6, 0.4, 2.2]],
    [P.sticky('ship\nit!', '#ffd166', 0.6), [-1.2, DY + 0.01, 1.2], [-Math.PI / 2, 0, 0.2], [-1.8, 2.6, 0.9]],
    [P.sticky('zero\ntrust', '#ff9fc6', 0.6), [1.35, DY + 0.01, 1.35], [-Math.PI / 2, 0, -0.3], [1.2, 2.9, 0.4]],
    [P.sticky('audit\nall', '#c9a5f2', 0.6), [-2.9, DY + 0.5, 0.9], [-Math.PI / 2, 0, 0.5], [-3.4, 1.7, 1.2]],
  ].map(([o, base, rot, dir]) => { o.position.set(...base); o.rotation.set(...rot); scene.add(o); return { o, base, rot, dir, spin: [r() * 2 - 1, r() * 2 - 1, r() * 2 - 1] }; });
  loose[3].o.scale.setScalar(0.6); loose[4].o.scale.setScalar(0.6);

  // hero pill + pointer live on layer 1 so the background can be defocused separately
  const pill = P.pillButton(T.COPY.button); scene.add(pill);
  const cursor = cursorMesh(0x7a4be6, 1); scene.add(cursor);
  const setLayer = (o, l) => o.traverse((c) => c.layers.set(l));
  setLayer(pill, 1);

  vpHelpers(scene, { size: 40, div: 40, gizmos: [[-3, 7, 4], [3.5, 6.5, 2], [0.5, 7.5, -3]], paths: [[[-2, 2.6, 7], [-0.8, 3.8, 3.5], [0.3, 3.7, 0.8], [0.35, 3.3, -0.5]]] });

  const PILL = [0.06, DY + 0.66, -0.1];
  const T0 = 3.23, PRESS = 6.87 - T0, LIVE = 7.53 - T0, END = 9.07 - T0;
  const CUTS = [3.33, 4.07, 5.2, 5.95, 7.53, 8.33].map((t) => t - T0);
  const shotOf = (lt) => CUTS.filter((c) => lt >= c).length; // 0..6
  const add = (a, b, k) => a.map((v, i) => v + b[i] * k);
  const DIR = new THREE.Vector3(-0.26, 0.09, 1).normalize().toArray();

  function camera(lt, t) {
    const sh = shotOf(lt); let c;
    if (sh === 0) c = [-0.7, 4.2, 1.1, 0.25, 4.0, -1.0, 38, 34];
    else if (sh === 1) c = kf(lt, [[CUTS[0], [0.5, 3.1, 9.9, 0.3, 3.8, 0, 1.5, 38]], [CUTS[1], [0.35, 3.15, 9.0, 0.3, 3.8, 0, 1.5, 38], E.outQuad]]);
    else if (sh === 2) c = kf(lt, [[CUTS[1], [-6.4, 3.3, 12.2, 0.4, 4.2, 0, -19, 38]], [CUTS[2], [-5.6, 3.4, 10.6, 0.4, 4.1, 0, -15, 38], E.lin]]);
    else if (sh === 3) c = kf(lt, [[CUTS[2], [-1.2, 3.7, 14, 0.05, 3.5, 0, -2, 36]], [5.6 - T0, [-1.1, 3.75, 10.6, 0.05, 3.5, 0, -2, 36], E.lin], [5.8 - T0, [-0.9, 3.8, 5.2, 0.05, 3.55, -0.4, -4, 36], E.inQuad], [CUTS[3], [-0.7, 3.8, 2.7, 0.04, 3.55, -0.7, -6, 34], E.lin]]);
    else if (sh === 4) {
      // macro: orbit distance and framing follow the pill's size on screen in the reference
      const d = kf(lt, [[CUTS[3], 3.9], [6.3 - T0, 2.95, E.outCubic], [PRESS, 2.85, E.lin], [7.2 - T0, 2.4, E.outCubic], [LIVE, 2.75, E.inOut]]);
      const off = kf(lt, [[CUTS[3], 0.0], [6.3 - T0, 0.3, E.outCubic], [7.2 - T0, 0.36, E.inOut], [LIVE, 0.3]]);
      const pos = add(PILL, DIR, d);
      c = [pos[0] - off, pos[1], pos[2], PILL[0] - off, PILL[1] - 0.02, PILL[2], -5, 30];
    } else if (sh === 5) c = kf(lt, [[LIVE, [-1.2, 4.35, 4.3, -0.55, 3.4, 0, -5, 36]], [8.0 - T0, [-0.5, 4.25, 5.6, 0.25, 3.45, 0, -3, 36], E.outCubic], [CUTS[5], [-0.2, 4.2, 5.9, 0.45, 3.5, 0, -2, 36], E.lin]]);
    else c = kf(lt, [[CUTS[5], [-2.6, 4.3, 7.6, 0.8, 3.6, 0, 5, 38]], [8.7 - T0, [-2.2, 4.25, 7.0, 0.7, 3.6, 0, 9, 38], E.lin], [END, [-0.3, 3.8, 4.2, 0.5, 3.4, 0, 34, 34], E.inCubic]]);
    setCam(cam, [c[0] + wobble(t, 3) * 0.03, c[1] + wobble(t, 4) * 0.02, c[2]], [c[3], c[4], c[5]], c[6], c[7]);
    return sh;
  }

  function render(lt, t) {
    const live = lt >= LIVE;
    lap.userData.screen.material.map = live ? texLive : texIdle;
    const sh = camera(lt, t);
    const macro = sh === 4 ? E.outCubic(prog(lt, CUTS[3], CUTS[3] + 0.3)) : sh === 3 ? E.inCubic(prog(lt, 5.7 - T0, CUTS[3])) * 0.6 : 0;

    // blast: props fly off the desk when it goes live
    const bl = E.outExpo(prog(lt, LIVE, LIVE + 1.1)), drift = prog(lt, LIVE, END);
    loose.forEach(({ o, base, rot, dir, spin }) => {
      const k = (bl * 0.85 + drift * 0.35) * 0.55;
      o.position.set(base[0] + dir[0] * k, base[1] + dir[1] * k, base[2] + dir[2] * k);
      o.rotation.set(rot[0] + spin[0] * k * 1.6, rot[1] + spin[1] * k * 1.6, rot[2] + spin[2] * k * 1.6);
    });

    // pill: pops out of the on-screen button, is pressed and held, then blown away
    const press = E.outCubic(prog(lt, PRESS, PRESS + 0.08)) * (1 - E.outBack(prog(lt, 7.38 - T0, LIVE)));
    const pin = pop(lt, 5.72 - T0, 0.4, 1.6), rise = E.outCubic(prog(lt, 5.72 - T0, 6.1 - T0)), away = E.outCubic(prog(lt, LIVE, LIVE + 0.9));
    pill.visible = pin > 0.001 && lt < LIVE + 0.9;
    pill.position.set(PILL[0] + away * -2.4, lerp(DY + 0.78, PILL[1], rise) + away * 1.3, lerp(-0.95, PILL[2], rise) - press * 0.07 + away * 1.4);
    pill.rotation.set(-0.14 + away * 1.4, 0.16 - away * 2, 0.05 + away);
    const ps = 0.5 * pin * (1 - away * 0.55);
    pill.scale.set(ps * (1 + press * 0.05), ps * (1 - press * 0.1), ps);
    const lit = clamp(prog(lt, PRESS + 0.02, PRESS + 0.1));
    pill.userData.labelLit.material.opacity = lit; pill.userData.label.material.opacity = 1 - lit;
    pill.userData.body.material.emissive.setHex(0xff7ae0); pill.userData.body.material.emissiveIntensity = lit * 0.55;

    // pointer
    setLayer(cursor, sh === 4 ? 1 : 0);
    cursor.visible = true;
    let sp; // [sx, sy, widthFrac, dist, spin]
    if (sh <= 1) sp = kf(lt, [[0, [0.47, 0.57, 0.05, 5.5, 0.9]], [CUTS[1], [0.56, 0.66, 0.075, 5.0, 0.3], E.lin]]);
    else if (sh === 2) sp = kf(lt, [[CUTS[1], [0.4, 0.76, 0.08, 3.2, 0.5]], [4.6 - T0, [0.45, 0.83, 0.15, 2.6, 0.2], E.lin], [5.0 - T0, [0.5, 0.95, 0.22, 2.2, 0], E.lin], [CUTS[2], [0.52, 1.25, 0.26, 2.0, -0.2], E.inQuad]]);
    else if (sh === 3) sp = kf(lt, [[CUTS[2], [0.6, 0.35, 0.012, 9, 0.4]], [5.6 - T0, [0.54, 0.5, 0.012, 8, 0.1], E.outCubic], [CUTS[3], [0.6, 0.62, 0.03, 2.4, 0], E.inOut]]);
    else if (sh === 4) sp = kf(lt, [[CUTS[3], [1.05, 0.2, 0.1, 2.2, 0.5]], [6.15 - T0, [1.02, 0.3, 0.1, 2.2, 0.5]], [6.48 - T0, [0.69, 0.585, 0.105, 2.3, 0], E.outCubic], [PRESS, [0.675, 0.6, 0.105, 2.3, 0], E.inOut], [PRESS + 0.07, [0.67, 0.6, 0.097, 2.42, 0], E.outCubic], [7.25 - T0, [0.63, 0.63, 0.12, 2.0, 0.05], E.inOut], [LIVE, [0.62, 0.86, 0.13, 1.9, 0.25], E.inCubic]]);
    else if (sh === 5) sp = kf(lt, [[LIVE, [0.58, 0.6, 0.04, 4.0, 0.2]], [8.0 - T0, [0.68, 0.48, 0.045, 4.4, 0.6], E.outCubic], [CUTS[5], [0.67, 0.44, 0.045, 4.6, 0.8], E.lin]]);
    else sp = kf(lt, [[CUTS[5], [0.55, 0.42, 0.03, 6.5, 1.0]], [END, [0.6, 0.3, 0.05, 4.0, 2.2], E.inQuad]]);
    screenPlace(cursor, cam, sp[0], sp[1], sp[3]);
    cursor.quaternion.copy(cam.quaternion); cursor.rotateZ(0.12 + sp[4]); cursor.rotateX(sh <= 1 ? -1.1 : -0.45); cursor.rotateY(0.35);
    cursor.scale.setScalar(spanAt(cam, sp[2], sp[3]));

    // ---- composite -------------------------------------------------------------------------
    const g = ctx.g;
    ctx.fill(ctx.viewport ? ctx.VP_BG : '#f3e6fb');
    if (macro > 0.01 && !ctx.viewport) {
      cam.layers.set(0); ctx.draw3d(scene, cam, { blur: 12 * macro });
      cam.layers.set(1); ctx.draw3d(scene, cam);
      cam.layers.enableAll();
    } else { cam.layers.enableAll(); ctx.draw3d(scene, cam); }

    if (!ctx.viewport) {
      // pink light wash from the left wall
      const wash = g.createLinearGradient(0, 0, W * 0.5, 0);
      wash.addColorStop(0, 'rgba(255,90,190,.5)'); wash.addColorStop(1, 'rgba(255,90,190,0)');
      g.save(); g.globalCompositeOperation = 'screen'; g.fillStyle = wash; g.fillRect(0, 0, W, H); g.restore();
      // sparkles on the click
      const sp2 = prog(lt, PRESS, PRESS + 0.5);
      if (sp2 > 0 && sp2 < 1) {
        const rr = rng(77); g.save(); g.fillStyle = '#fff';
        for (let i = 0; i < 40; i++) {
          const a = rr() * 6.283, d = (120 + rr() * 520) * E.outCubic(sp2), s = (3 + rr() * 6) * (1 - sp2);
          g.globalAlpha = 1 - sp2; g.beginPath(); g.arc(W * 0.62 + Math.cos(a) * d * 1.4, H * 0.5 + Math.sin(a) * d * 0.6, s, 0, 6.283); g.fill();
        }
        g.restore();
      }
      // dark wipe that hides the cut at 4.07
      const wp = prog(lt, 3.96 - T0, CUTS[1] + 0.02);
      if (wp > 0 && lt < CUTS[1]) {
        g.save(); g.fillStyle = '#231a33'; g.filter = 'blur(14px)';
        g.beginPath(); g.ellipse(lerp(W * 1.55, W * 0.35, wp), H * 0.55, W * 0.62, H * 0.95, 0.25, 0, 6.283); g.fill(); g.restore();
      }
      // comic speed lines racing in from the left as the shot whips out
      const sl = prog(lt, 8.72 - T0, END);
      if (sl > 0) {
        const rr = rng(5); g.save();
        for (let i = 0; i < 14; i++) {
          const y = H * (0.12 + 0.76 * rr()), len = (200 + rr() * 700) * sl * 1.4, th = 8 + rr() * 30;
          g.fillStyle = '#ffffff'; g.strokeStyle = 'rgba(40,20,70,.8)'; g.lineWidth = 3;
          g.beginPath(); g.moveTo(-20, y - th / 2); g.lineTo(len, y + (H / 2 - y) * 0.2); g.lineTo(-20, y + th / 2); g.closePath(); g.fill(); g.stroke();
        }
        g.restore();
      }
    }

    // "IT'S LIVE!!!!" typewriter, lower-left, during the first live set-up
    if (sh === 5) {
      const full = "IT'S LIVE!!!!", n = Math.floor(prog(lt, 7.72 - T0, 8.05 - T0) * full.length + 0.001);
      const small = 'EVERY CALL CHECKED', n2 = Math.floor(prog(lt, 7.58 - T0, 7.8 - T0) * small.length + 0.001);
      const tg = g.createRadialGradient(100, H * 0.76, 0, 100, H * 0.76, 700);
      tg.addColorStop(0, 'rgba(150,60,230,.55)'); tg.addColorStop(1, 'rgba(150,60,230,0)');
      g.fillStyle = tg; g.fillRect(0, 0, W, H);
      g.save(); g.shadowColor = 'rgba(110,30,200,.6)'; g.shadowBlur = 22;
      text(g, small.slice(0, n2), 40, H * 0.728, { size: 26, weight: 500, color: 'rgba(255,255,255,.85)', ls: 2 });
      const w = text(g, full.slice(0, n), 36, H * 0.728 + 60, { size: 66, weight: 500, color: '#fff', ls: -1 });
      g.restore();
      if (n < full.length || Math.floor(lt * 8) % 2) { g.fillStyle = '#fff'; g.fillRect(40 + w + 8, H * 0.728 + 12, 5, 52); }
      ctx.layers.add(36, H * 0.728 - 26, Math.max(40, w), 96);
    }

    const bars = sh < 3 ? 0 : sh === 3 ? E.inOutCubic(prog(lt, CUTS[2] + 0.1, CUTS[2] + 0.4)) : sh === 4 ? 1 : lerp(1, 0.64, E.outCubic(prog(lt, LIVE, 8.0 - T0))) * (1 - E.inCubic(prog(lt, 8.95 - T0, END)));
    const flash = Math.max(
      lt < CUTS[0] ? 0.35 : (1 - E.outCubic(prog(lt, CUTS[0], CUTS[0] + 0.3))) * 0.6,
      live ? (1 - E.outCubic(prog(lt, LIVE, LIVE + 0.5))) * 0.7 : 0,
      lt >= PRESS ? (1 - prog(lt, PRESS + 0.02, PRESS + 0.3)) * 0.28 : 0,
      E.inQuad(prog(lt, 8.72 - T0, END)));
    return { glow: 0.42 + 0.18 * (live ? 1 : 0), ht: 0.32, htw: 0.3, bars, flash: clamp(flash), flashColor: lt < 0.4 ? '#ffe6f6' : '#ffffff' };
  }

  return [{ id: 'room', start: T0, end: T0 + END, render,
    blur: (lt) => (lt < CUTS[0] + 0.25 ? { n: 6, shutter: 0.8 } : (lt > 3.9 - T0 && lt < CUTS[1] + 0.1) ? { n: 4, shutter: 0.7 } : (lt > CUTS[2] && lt < CUTS[3] + 0.3) ? { n: 3, shutter: 0.5 } : (lt >= LIVE && lt < LIVE + 0.45) ? { n: 5, shutter: 0.7 } : lt > 8.7 - T0 ? { n: 8, shutter: 0.9 } : null) }];
}
