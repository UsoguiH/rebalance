// 3.35–9.05  The room: fly to the laptop, press the big "Connect" pill, and it's live.
import { THREE, mat, glossy, mesh, keyLight, setCam, makeCam, cursorMesh, vpHelpers, box } from '../kit3d.js';
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
  const clock = mesh(new THREE.CylinderGeometry(0.75, 0.75, 0.1, 40), mat(0xfff4fa, { roughness: 0.4 }), { pos: [-7.9, 6.6, 0.5], rot: [0, 0, Math.PI / 2], vp: 0xd9938f }); scene.add(clock);

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
    [P.headphones(), [2.15, DY, 0.75], [0, 0.4, 0], [2.4, 1.5, 1.4]],
    [P.mug(), [-1.95, DY, 0.85], [0, 1, 0], [-2.2, 1.0, 1.6]],
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
  const blob = new THREE.Mesh(new THREE.PlaneGeometry(2.3, 0.9), new THREE.MeshBasicMaterial({ map: T.canvasTex ? null : null, color: 0x5a2a8a, transparent: true, opacity: 0.0, depthWrite: false }));
  blob.rotation.x = -Math.PI / 2; blob.userData.finalOnly = true; scene.add(blob);
  const setLayer = (o, l) => o.traverse((c) => c.layers.set(l));
  setLayer(pill, 1);

  vpHelpers(scene, { size: 40, div: 40, gizmos: [[-3, 7, 4], [3.5, 6.5, 2], [0.5, 7.5, -3]], paths: [[[-2, 2.6, 7], [-0.8, 3.8, 3.5], [0.3, 3.7, 0.8], [0.35, 3.3, -0.5]]] });

  const PILL = [0.06, DY + 0.62, -0.12];
  const PRESS = 3.95; // local time of the click

  function render(lt, t) {
    const live = lt >= 4.3;
    lap.userData.screen.material.map = live ? texLive : texIdle;
    const macro = E.inOutCubic(prog(lt, 2.55, 3.05)) * (1 - prog(lt, 4.28, 4.3));

    const cp = kf(lt, [
      [0.0, [-6.2, 3.1, 9.8, 0.6, 3.0, 0, -22, 40]],
      [0.5, [-5.2, 3.3, 9.0, 0.5, 3.0, 0, -13, 40], E.outCubic],
      [1.4, [-3.4, 3.7, 7.2, 0.3, 3.1, 0, -9, 38], E.inOut],
      [2.0, [-1.4, 3.85, 4.4, 0, 3.4, -0.4, -4, 36], E.inOutCubic],
      [2.6, [-0.75, 3.75, 2.9, 0.02, 3.5, -0.6, -6, 34], E.inOut],
      [3.05, [-0.95, 3.5, 3.3, PILL[0], PILL[1] - 0.02, PILL[2], -9, 30], E.inOutCubic],
      [4.28, [-0.45, 3.42, 2.45, PILL[0] + 0.03, PILL[1], PILL[2], -7, 30], E.lin],
      [4.3, [-0.5, 3.5, 2.6, 0, 3.45, -0.2, -6, 36], E.lin],
      [4.75, [-1.7, 3.95, 6.4, 0, 3.5, 0, -5, 38], E.outExpo],
      [5.35, [0.4, 4.0, 6.9, 0, 3.5, 0, 3, 38], E.inOut],
      [5.7, [1.6, 3.6, 5.0, 0.2, 3.6, 0, 34, 30], E.inCubic],
    ]);
    setCam(cam, [cp[0] + wobble(t, 3) * 0.04, cp[1] + wobble(t, 4) * 0.03, cp[2]], [cp[3], cp[4], cp[5]], cp[6], cp[7]);

    // blast: props fly off the desk at lt 4.3
    const bl = E.outExpo(prog(lt, 4.3, 5.5)), drift = prog(lt, 4.3, 5.7);
    loose.forEach(({ o, base, rot, dir, spin }) => {
      const k = (bl * 0.85 + drift * 0.35) * 0.55;
      o.position.set(base[0] + dir[0] * k, base[1] + dir[1] * k, base[2] + dir[2] * k);
      o.rotation.set(rot[0] + spin[0] * k * 1.6, rot[1] + spin[1] * k * 1.6, rot[2] + spin[2] * k * 1.6);
    });

    // pill: pops out of the on-screen button, gets pressed, then is blown away
    const press = E.outCubic(prog(lt, PRESS, PRESS + 0.08)) * (1 - E.outBack(prog(lt, PRESS + 0.16, PRESS + 0.34)));
    const pin = pop(lt, 2.5, 0.5, 1.6);
    pill.visible = pin > 0.001 && lt < 5.2;
    const away = E.outCubic(prog(lt, 4.3, 5.2));
    pill.position.set(PILL[0] + away * -2.6, lerp(DY + 0.75, PILL[1], E.outCubic(prog(lt, 2.5, 3.0))) + away * 1.6, lerp(-0.9, PILL[2], E.outCubic(prog(lt, 2.5, 3.0))) - press * 0.07 + away * 1.5);
    pill.rotation.set(-0.16 + away * 1.4, 0.2 - away * 2, 0.02 + away);
    pill.scale.set(0.5 * pin * (1 + press * 0.04) * (1 - away * 0.5), 0.5 * pin * (1 - press * 0.1) * (1 - away * 0.5), 0.5 * pin * (1 - away * 0.5));
    const lit = clamp(prog(lt, PRESS + 0.02, PRESS + 0.1));
    pill.userData.labelLit.material.opacity = lit; pill.userData.label.material.opacity = 1 - lit;
    pill.userData.body.material.emissive.setHex(0xff7ae0); pill.userData.body.material.emissiveIntensity = lit * 0.55;

    // pointer: a long swoop across the room, then the macro click
    const inMacro = lt >= 2.6 && lt < 4.3;
    setLayer(cursor, inMacro ? 1 : 0);
    let cs, pos;
    if (lt < 2.6) {
      const c = kf(lt, [[0, [-3.4, 2.2, 7.6, 0.75]], [0.9, [-2.4, 3.2, 5.2, 0.62], E.outCubic], [1.7, [-0.7, 3.8, 2.4, 0.45], E.inOut], [2.35, [0.32, 3.42, -0.42, 0.16], E.inOutCubic], [2.6, [0.32, 3.38, -0.5, 0.1], E.lin]]);
      pos = [c[0], c[1] + Math.sin(lt * 5) * 0.05, c[2]]; cs = c[3];
    } else if (lt < 4.3) {
      const c = kf(lt, [[2.9, [2.2, 4.3, 0.4, 0.34]], [3.5, [0.62, DY + 0.5, 0.2, 0.36], E.outCubic], [PRESS, [0.52, DY + 0.5, 0.16, 0.36], E.inOut], [PRESS + 0.08, [0.5, DY + 0.5, 0.07, 0.34], E.outCubic], [4.28, [0.52, DY + 0.5, 0.15, 0.36], E.outBack]]);
      pos = [c[0], c[1], c[2]]; cs = c[3];
    } else {
      const k = E.outExpo(prog(lt, 4.3, 5.3));
      pos = [0.5 + k * 1.1, DY + 0.5 + k * 1.5, 0.2 + k * 2.2]; cs = 0.36 + k * 0.2;
    }
    cursor.position.set(...pos); cursor.scale.setScalar(cs);
    cursor.quaternion.copy(cam.quaternion); cursor.rotateZ(0.12 + (lt > 4.3 ? (lt - 4.3) * 2.2 : 0)); cursor.rotateX(-0.45); cursor.rotateY(0.35);

    // ---- composite -------------------------------------------------------------------------
    const g = ctx.g;
    ctx.fill(ctx.viewport ? ctx.VP_BG : '#f3e6fb');
    if (macro > 0.01 && !ctx.viewport) {
      cam.layers.set(0); ctx.draw3d(scene, cam, { blur: 11 * macro });
      cam.layers.set(1); ctx.draw3d(scene, cam);
      cam.layers.enableAll();
    } else { cam.layers.enableAll(); ctx.draw3d(scene, cam); }

    if (!ctx.viewport) {
      // pink light wash from the left wall + sparkles on the click
      const wash = g.createLinearGradient(0, 0, W * 0.5, 0);
      wash.addColorStop(0, 'rgba(255,90,190,.5)'); wash.addColorStop(1, 'rgba(255,90,190,0)');
      g.save(); g.globalCompositeOperation = 'screen'; g.fillStyle = wash; g.fillRect(0, 0, W, H); g.restore();
      const sp = prog(lt, PRESS, PRESS + 0.5);
      if (sp > 0 && sp < 1) {
        const rr = rng(77); g.save(); g.fillStyle = '#fff';
        for (let i = 0; i < 40; i++) {
          const a = rr() * 6.283, d = (120 + rr() * 520) * E.outCubic(sp), s = (3 + rr() * 6) * (1 - sp);
          g.globalAlpha = 1 - sp; g.beginPath(); g.arc(W * 0.56 + Math.cos(a) * d * 1.4, H * 0.5 + Math.sin(a) * d * 0.6, s, 0, 6.283); g.fill();
        }
        g.restore();
      }
    }

    // "IT'S LIVE!!!!" typewriter, lower-left
    if (lt >= 4.45 && lt < 5.5) {
      const full = "IT'S LIVE!!!!", n = Math.floor(prog(lt, 4.5, 4.95) * full.length + 0.001), a = 1 - prog(lt, 5.3, 5.5);
      const small = 'EVERY CALL CHECKED', n2 = Math.floor(prog(lt, 4.45, 4.7) * small.length + 0.001);
      const tg = g.createRadialGradient(120, H * 0.78, 0, 120, H * 0.78, 760);
      tg.addColorStop(0, `rgba(150,60,230,${0.6 * a})`); tg.addColorStop(1, 'rgba(150,60,230,0)');
      g.fillStyle = tg; g.fillRect(0, 0, W, H);
      g.save(); g.shadowColor = 'rgba(110,30,200,.6)'; g.shadowBlur = 22;
      text(g, small.slice(0, n2), 74, H * 0.705, { size: 30, weight: 500, color: 'rgba(255,255,255,.85)', ls: 2, alpha: a });
      const w = text(g, full.slice(0, n), 70, H * 0.705 + 70, { size: 76, weight: 500, color: '#fff', ls: -1, alpha: a });
      g.restore();
      if (n < full.length || Math.floor(lt * 8) % 2) { g.fillStyle = `rgba(255,255,255,${a})`; g.fillRect(74 + w + 8, H * 0.705 + 14, 5, 60); }
      ctx.layers.add(70, H * 0.705 - 30, Math.max(40, w), 110);
    }

    const bars = E.inOutCubic(prog(lt, 2.0, 2.3)) * (1 - E.inOutCubic(prog(lt, 5.25, 5.5)));
    const flash = Math.max(1 - E.outCubic(prog(lt, 0, 0.35)), (1 - E.outCubic(prog(lt, 4.3, 4.9))) * 0.75 * (lt >= 4.3 ? 1 : 0), E.inQuad(prog(lt, 5.45, 5.7)), (1 - prog(lt, PRESS + 0.02, PRESS + 0.3)) * 0.3 * (lt >= PRESS ? 1 : 0));
    return { glow: 0.42 + 0.2 * (live ? 1 : 0), ht: 0.32, htw: 0.3, bars, flash: clamp(flash) * (lt < 0.4 ? 0.6 : 1), flashColor: lt < 0.4 ? '#ffe6f6' : '#ffffff' };
  }

  return [{ id: 'room', start: 3.35, end: 9.05, render,
    blur: (lt) => (lt < 0.45 ? { n: 8, shutter: 0.9 } : (lt > 2.0 && lt < 3.05) ? { n: 3, shutter: 0.5 } : (lt >= 4.3 && lt < 4.8) ? { n: 5, shutter: 0.7 } : lt > 5.4 ? { n: 8, shutter: 0.9 } : null) }];
}
