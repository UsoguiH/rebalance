// 0.00–3.35  The messy desk: a phone buzzing with unchecked AI tool calls.
import { THREE, mat, mesh, keyLight, setCam, makeCam, cursorMesh, vpHelpers, box } from '../kit3d.js';
import * as P from '../props.js';
import * as T from '../textures.js';
import { kf, E, prog, pop, lerp, wobble } from '../util.js';

export default function deskScene(ctx) {
  const scene = new THREE.Scene(), cam = makeCam(30);
  scene.userData.envI = 0.28;
  scene.add(new THREE.HemisphereLight(0xfff0ff, 0x9a6cff, 0.95));
  keyLight(scene, [-6, 6.5, -3.5], { intensity: 1.9, size: 9, color: 0xfff4f8, radius: 6 });

  const tex = T.deskTex(); tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(3, 3);
  scene.add(mesh(new THREE.PlaneGeometry(40, 40), mat(0xffffff, { map: tex, roughness: 0.85 }), { rot: [-Math.PI / 2, 0, 0], cast: false, vp: 0x9fc9a8 }));

  const phone = P.phone(); phone.rotation.set(-Math.PI / 2, 0, -0.06); phone.position.set(0, 0.045, 0); scene.add(phone);
  const paper = P.paperSheet(1.75, 2.3, T.sketchTex(3, 0), 0.6); paper.position.set(1.45, 0.012, 0.2); paper.rotation.y = -0.42; scene.add(paper);
  const buzz = P.buzzer(); buzz.position.set(-1.42, 0, 0.12); buzz.rotation.y = 0.5; scene.add(buzz);
  const cup = P.penCup(); cup.position.set(-1.05, 0, -2.25); scene.add(cup);
  const hp = P.headphones(); hp.rotation.set(-Math.PI / 2, 0, 0.4); hp.position.set(-0.9, 0.16, 3.1); scene.add(hp);
  const chair = P.chair(); chair.position.set(4.4, -1.35, 2.2); chair.rotation.y = -0.9; scene.add(chair);
  for (const [x, z, c, ry] of [[-3.0, 1.75, 0xf46aa8, 0.5], [-2.75, 1.5, 0xff9fc6, 0.2], [-3.3, -1.2, 0xb07cff, -0.3]]) {
    scene.add(mesh(box(0.7, 0.16, 0.7, 0.03), mat(c, { roughness: 0.7 }), { pos: [x, 0.08, z], rot: [0, ry, 0] }));
  }
  const cursor = cursorMesh(0xdcc6ff, 0.34); scene.add(cursor);
  const cursorBig = cursorMesh(0x7a4be6, 1); scene.add(cursorBig);

  // Tool-call notifications that burst out of the phone.
  const defs = [
    { a: 0.92, to: [-0.98, 0.75, -0.12], roll: 0.22, s: 0.72 },
    { a: 1.02, to: [1.05, 0.95, -0.3], roll: -0.1, s: 0.78 },
    { a: 1.5, to: [-0.8, 1.35, 0.65], roll: 0.5, s: 0.7 },
    { a: 1.66, to: [1.15, 1.55, 0.55], roll: -0.42, s: 0.74 },
  ];
  const cards = defs.map((d, i) => {
    const [sender, msg, col] = T.COPY.chats[i];
    const c = P.card(1.9, 0.53, T.notifTex(sender, msg, col)); c.userData = d; scene.add(c); return c;
  });
  const hero = P.card(1.9, 0.53, T.notifTex(...T.COPY.hero, true)); scene.add(hero);

  vpHelpers(scene, { gizmos: [[-2.2, 2.4, -1.5], [2.6, 2.8, 1.2]], paths: [[[0.8, 0.1, 0.6], [1.2, 0.8, 1.2], [1.6, 1.6, 2.2], [2.2, 1.2, 3.2]]] });

  function render(lt) {
    const p = kf(lt, [
      [0.0, [0.25, 6.4, 1.3, 0.2, 0, 0.1, -15]],
      [1.0, [0.15, 5.7, 1.3, 0.1, 0, 0.1, -9], E.inOut],
      [1.75, [0.05, 5.9, 1.9, 0.0, 0, 0.15, 7], E.inOutCubic],
      [2.35, [0.4, 5.2, 3.6, 0.2, 0.2, 0.4, 20], E.inOutCubic],
      [3.0, [1.0, 3.9, 5.4, 0.45, 0.7, 0.5, 30], E.inOut],
      [3.35, [3.6, 2.6, 6.8, 2.4, 1.2, 0.0, 64], E.inCubic],
    ]);
    const hx = wobble(lt, 1, 1.2) * 0.05, hz = wobble(lt, 2, 1.1) * 0.05;
    setCam(cam, [p[0] + hx, p[1], p[2] + hz], [p[3], p[4], p[5]], p[6], lerp(30, 38, prog(lt, 2.2, 3.35)));

    // phone buzzes just before each notification
    const buzzAmt = Math.max(0, 1 - Math.abs(lt - 0.95) / 0.22) + Math.max(0, 1 - Math.abs(lt - 1.58) / 0.22);
    phone.rotation.z = -0.06 + Math.sin(lt * 90) * 0.02 * buzzAmt;
    phone.position.y = 0.045 + 0.03 * buzzAmt;

    // paper lifts off the desk as things escalate
    const lift = E.inOutCubic(prog(lt, 1.55, 2.5));
    paper.position.set(1.45 + lift * 0.5, 0.012 + lift * 1.5, 0.2 - lift * 0.5);
    paper.rotation.set(lift * -0.5, -0.42 - lift * 0.5, lift * 0.35);

    cards.forEach((c) => {
      const d = c.userData, s = pop(lt, d.a, 0.4, 2.4), fly = E.inCubic(prog(lt, 2.3, 3.2));
      c.visible = s > 0.001;
      const k = E.outCubic(prog(lt, d.a, d.a + 0.45));
      c.position.set(lerp(0, d.to[0], k) * (1 + fly * 1.6), lerp(0.1, d.to[1], k) + fly * 2.2 + Math.sin(lt * 2 + d.a * 9) * 0.03, lerp(0, d.to[2], k) * (1 + fly * 1.3));
      c.quaternion.copy(cam.quaternion); c.rotateZ(d.roll + fly * d.roll * 2 + 0.26); c.rotateX(-0.25 * (1 - k));
      c.scale.setScalar(Math.max(0.001, s * d.s * (1 + fly * 0.5)));
    });
    const hs = pop(lt, 2.05, 0.45, 2.0), out = E.inCubic(prog(lt, 3.0, 3.35));
    hero.visible = hs > 0.001;
    hero.position.set(0.1 - out * 1.2, lerp(0.3, 2.35, E.outCubic(prog(lt, 2.05, 2.6))) + out * 0.5, 0.75 + out);
    hero.quaternion.copy(cam.quaternion); hero.rotateZ(0.2 + out * 0.9); hero.rotateY(-0.12);
    hero.scale.setScalar(Math.max(0.001, hs * (1.0 + 0.25 * prog(lt, 2.3, 3.0))));

    // small flat pointer nudging around the phone, then the chunky 3D one swings in
    cursor.visible = lt < 2.0;
    cursor.position.set(0.72 + Math.sin(lt * 2.4) * 0.07, 0.07, 0.42 + Math.cos(lt * 1.9) * 0.09);
    cursor.rotation.set(-Math.PI / 2, 0, 0.1);
    const cb = E.outCubic(prog(lt, 1.7, 2.7));
    cursorBig.visible = cb > 0;
    cursorBig.position.set(lerp(0.8, 1.65, cb), lerp(0.2, 1.9, cb), lerp(0.6, 2.3, cb));
    cursorBig.quaternion.copy(cam.quaternion); cursorBig.rotateZ(0.15 + (1 - cb) * 0.6); cursorBig.rotateX(-0.35); cursorBig.rotateY(0.3);
    cursorBig.scale.setScalar(lerp(0.2, 0.95, cb));

    ctx.fill(ctx.viewport ? ctx.VP_BG : '#c9a5f2');
    ctx.draw3d(scene, cam);
    return { glow: 0.3, ht: 0.3, htw: 0.16, vignette: 0.12, flash: E.inQuad(prog(lt, 3.2, 3.35)) * 0.55, flashColor: '#ffe6f6' };
  }

  return [{ id: 'desk', start: 0, end: 3.35, render, blur: (lt) => (lt > 2.95 ? { n: 10, shutter: 0.9 } : lt > 1.5 && lt < 2.4 ? { n: 3, shutter: 0.6 } : null) }];
}
