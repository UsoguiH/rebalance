// 0.00–3.23  The desk from above: a phone buzzing with unchecked AI tool calls.
// Three camera set-ups, cut at 1.53 and 2.33, blocked against the reference frame by frame.
import { THREE, mat, mesh, keyLight, setCam, topCam, screenPlace, spanAt, deskAt, makeCam, cursorMesh, vpHelpers } from '../kit3d.js';
import * as P from '../props.js';
import * as T from '../textures.js';
import { kf, E, prog, pop, lerp, wobble, clamp } from '../util.js';

export const DESK_END = 3.23;

export default function deskScene(ctx) {
  const scene = new THREE.Scene(), cam = makeCam(30);
  scene.userData.envI = 0.3;
  scene.add(new THREE.HemisphereLight(0xfff0ff, 0x9a6cff, 0.95));
  keyLight(scene, [5.5, 6.5, -5], { intensity: 1.9, size: 10, color: 0xfff4f8, radius: 6 });

  const tex = T.deskTex(); tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(3, 3);
  const floor = mesh(new THREE.PlaneGeometry(60, 60), mat(0xffffff, { map: tex, roughness: 0.85 }), { rot: [-Math.PI / 2, 0, 0.6], cast: false, vp: 0x9fc9a8 }); scene.add(floor);

  const phone = P.phone(); phone.rotation.set(-Math.PI / 2, 0, 0.03); scene.add(phone);
  const paper = P.paperSheet(1.7, 2.25, T.sketchTex(3, 0), 0.6); scene.add(paper);
  const buzz = P.buzzer(); buzz.rotation.y = 0.35; buzz.scale.setScalar(0.66); scene.add(buzz);
  const cup = P.penCup(); cup.position.set(-1.95, 0, -1.45); cup.scale.setScalar(1.15); scene.add(cup);
  const hp = P.headphones(); hp.rotation.set(-Math.PI / 2, 0, 0.5); scene.add(hp);
  const chair = P.chair(); scene.add(chair);
  const pads = P.notepads(); scene.add(pads);
  const table = mesh(new THREE.BoxGeometry(5, 0.12, 3.2), mat(0xffffff, { roughness: 0.5 }), { vp: 0x8fa6d9 }); scene.add(table);
  const cursor = cursorMesh(0xdcc6ff, 1); scene.add(cursor);

  // Tool-call notifications. Each has a pose per camera set-up: [sx, sy, widthFrac, rotDeg]
  const cards = [
    { a: 0.92, s1: [0.39, 0.5, 0.115, 12], s2: [[0.33, 0.68, 0.19, 68], [0.3, 0.75, 0.23, 73]], s3: [[0.32, 0.45, 0.06, 60], [0.25, 0.4, 0.05, 70]] },
    { a: 0.96, s1: [0.68, 0.44, 0.21, -3], s2: [[0.66, 0.42, 0.23, -18], [0.72, 0.42, 0.29, -25]], s3: [[0.52, 0.2, 0.07, -25], [0.6, 0.08, 0.06, -35]] },
    { a: 1.5, s1: null, s2: [[0.47, 0.5, 0.14, 8], [0.47, 0.5, 0.18, 8]], s3: [[0.36, 0.14, 0.05, 30], [0.3, 0.02, 0.05, 40]] },
    { a: 1.6, s1: null, s2: [[0.41, 0.37, 0.05, 10], [0.39, 0.3, 0.07, 14]], s3: [[0.7, 0.3, 0.05, -50], [0.8, 0.2, 0.04, -60]] },
  ].map((d, i) => {
    const [sender, msg, col] = T.COPY.chats[i];
    const c = P.card(1.9, 0.53, T.notifTex(sender, msg, col)); c.userData = d; scene.add(c); return c;
  });
  const hero = P.card(1.9, 0.53, T.notifTex(...T.COPY.hero, true)); scene.add(hero);
  const CARD_W = 1.9;

  vpHelpers(scene, { gizmos: [[-2.2, 2.4, -1.5], [2.6, 2.8, 1.2]], paths: [[[0.9, 0.1, 0.45], [0.5, 0.3, 0.5], [0.6, 1.2, 0.6], [1.2, 1.6, 1.4]]] });

  // off-desk dressing placed once, by where it must appear in set-ups 2 and 3
  pads.position.set(-2.9, 0, 1.5); pads.rotation.y = 0.3; pads.scale.setScalar(0.55);
  for (const [x, z, c, ry] of [[-2.63, 0.92, 0xf46aa8, 0.5], [-2.2, 1.5, 0xff9fc6, 0.1]]) scene.add(mesh(new THREE.BoxGeometry(0.44, 0.26, 0.44), mat(c, { roughness: 0.6 }), { pos: [x, 0.15, z], rot: [0, ry, 0] }));
  hp.position.set(-1.7, 0.16, 2.55);
  topCam(cam, 0.55, 1.3, 11.7, 29, [-0.25, 0.45], 34);
  chair.position.set(...deskAt(cam, 0.9, 0.86, -2.3)); chair.rotation.y = -0.5; chair.scale.setScalar(1.7);
  table.position.set(-5.2, -0.5, 3.4); table.rotation.y = 0.2;

  const card = (c, pose, s) => {
    const d = 3.2;
    screenPlace(c, cam, pose[0], pose[1], d);
    c.quaternion.copy(cam.quaternion); c.rotateZ((pose[3] * Math.PI) / 180);
    c.scale.setScalar(Math.max(1e-3, (spanAt(cam, pose[2], d) / CARD_W) * s));
  };
  const mix = (a, b, k) => a.map((v, i) => lerp(v, b[i], k));

  function render(lt) {
    const setup = lt < 1.53 ? 1 : lt < 2.33 ? 2 : 3;
    const hx = wobble(lt, 1, 1.1) * 0.03, hz = wobble(lt, 2, 1.3) * 0.03;
    if (setup === 1) {
      const k = prog(lt, 0, 1.53);
      topCam(cam, lerp(0.06, 0.14, k) + hx, lerp(-0.02, 0.08, k) + hz, lerp(4.75, 7.25, k), lerp(1, -3, k));
    } else if (setup === 2) {
      const k = prog(lt, 1.53, 2.33);
      topCam(cam, lerp(0.2, 0.3, k) + hx, lerp(-0.1, -0.2, k) + hz, lerp(7.4, 8.3, k), lerp(9, 16, k), [0.03, 0.1 + 0.06 * k]);
    } else {
      const k = E.inOut(prog(lt, 2.33, 3.0)), w = E.inCubic(prog(lt, 2.95, DESK_END));
      topCam(cam, lerp(0.4, 0.7, k) + w * 2.0, lerp(1.1, 1.5, k) + w * 0.6, lerp(12.5, 11.0, k) - w * 3.6, lerp(24, 34, k) + w * 26, [lerp(-0.2, -0.3, k) - w * 0.2, lerp(0.4, 0.5, k) + w * 0.2], 34);
    }

    // phone buzzes just before the notifications burst out
    const bz = Math.max(0, 1 - Math.abs(lt - 0.9) / 0.2) + Math.max(0, 1 - Math.abs(lt - 1.5) / 0.15);
    phone.position.set(0, 0.06 + 0.02 * bz, 0); phone.rotation.z = 0.03 + Math.sin(lt * 95) * 0.018 * bz;

    // the kill-switch button slides in toward the phone
    buzz.position.set(lerp(-1.86, -0.84, E.outCubic(prog(lt, 0, 1.15))), 0, -0.03);

    // paper: on the desk, then lifted and thrown toward the camera
    const lift = E.inOutCubic(prog(lt, 1.45, 2.2)), fly = E.inOutCubic(prog(lt, 2.2, 3.0));
    if (setup === 1) { paper.position.set(1.22, 0.012, 0.08); paper.rotation.set(0, -0.3, 0); paper.scale.setScalar(1); }
    else {
      const k = setup === 2 ? prog(lt, 1.53, 2.33) : prog(lt, 2.33, DESK_END);
      const pp = setup === 2 ? [lerp(0.69, 0.75, k), lerp(0.42, 0.36, k), lerp(6.6, 5.4, k)] : [lerp(0.66, 0.72, k), lerp(0.5, 0.56, k), lerp(7.5, 6.5, k)];
      screenPlace(paper, cam, pp[0], pp[1], pp[2]);
      paper.quaternion.copy(cam.quaternion); paper.rotateX(Math.PI / 2 - 0.45 - 0.3 * lift); paper.rotateY(-0.5 - fly * 0.8); paper.rotateZ(0.25 + fly * 0.5);
    }

    cards.forEach((c) => {
      const d = c.userData, s = pop(lt, d.a, 0.34, 2.2);
      c.visible = s > 0.001 && !(setup === 1 && !d.s1);
      if (!c.visible) return;
      if (setup === 1) {
        // grow out of the phone toward the resting pose
        const k = E.outCubic(prog(lt, d.a, d.a + 0.32));
        card(c, [lerp(0.49, d.s1[0], k), lerp(0.5, d.s1[1], k), d.s1[2], d.s1[3]], s);
      } else if (setup === 2) card(c, mix(d.s2[0], d.s2[1], E.outQuad(prog(lt, 1.53, 2.33))), s);
      else card(c, mix(d.s3[0], d.s3[1], E.inQuad(prog(lt, 2.33, 3.1))), 1);
    });

    // hero card: appears in set-up 3, tumbles away on the whip
    hero.visible = setup === 3;
    if (hero.visible) {
      const s = pop(lt, 2.33, 0.3, 1.8), k = prog(lt, 2.33, 2.95), w = E.inQuad(prog(lt, 2.95, DESK_END));
      card(hero, [lerp(0.48, 0.52, k) - w * 0.03, lerp(0.55, 0.58, k) + w * 0.08, lerp(0.3, 0.34, k) + w * 0.05, lerp(8, 11, k) + w * 42], s);
    }

    // pointer: small and flat by the phone, then big and floating
    if (setup === 1) {
      const c = kf(lt, [[0, [0.97, 0.43, 0.42]], [1.1, [0.72, 0.5, 0.32], E.inOut], [1.53, [0.74, 0.62, 0.34]]]);
      cursor.position.set(c[0], 0.09, c[1]); cursor.rotation.set(-Math.PI / 2, 0, 0.15); cursor.scale.setScalar(c[2]);
      cursor.material.color.set(0xdcc6ff).lerp(new THREE.Color(0x8b5cf6), prog(lt, 0.7, 1.2));
    } else {
      const c = setup === 2
        ? kf(lt, [[1.53, [0.55, 0.57, 0.1, 0.3]], [2.33, [0.585, 0.6, 0.17, 0.1], E.outQuad]])
        : kf(lt, [[2.33, [0.57, 0.7, 0.18, 0.1]], [2.75, [0.6, 0.76, 0.2, -0.1], E.outQuad], [3.0, [0.56, 0.72, 0.09, 0.2], E.inOut], [DESK_END, [0.5, 0.68, 0.04, 0.4]]]);
      const d = 3.0; screenPlace(cursor, cam, c[0], c[1], d);
      cursor.quaternion.copy(cam.quaternion); cursor.rotateZ(c[3] + 0.5); cursor.rotateX(-0.35); cursor.rotateY(0.25);
      cursor.scale.setScalar(spanAt(cam, c[2], d));
      cursor.material.color.set(setup === 2 ? 0xc9aeff : 0x7a4be6).lerp(new THREE.Color(0x7a4be6), prog(lt, 1.9, 2.33));
    }

    ctx.fill(ctx.viewport ? ctx.VP_BG : '#c9a5f2');
    ctx.draw3d(scene, cam);
    return { glow: 0.3, ht: 0.3, htw: 0.16, vignette: 0.12, flash: E.inQuad(prog(lt, 3.08, DESK_END)) * 0.5, flashColor: '#ffe6f6' };
  }

  return [{ id: 'desk', start: 0, end: DESK_END, render, blur: (lt) => (lt > 2.9 ? { n: 10, shutter: 0.9 } : null) }];
}
