// 13.5–15.67  The ribbon tears through a storm of questions, knots up and inflates into
//             the word "many" — then an umbrella rises to cover it all.
import { THREE, mat, glossy, mesh, keyLight, setCam, makeCam, vpHelpers } from '../kit3d.js';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';
import * as P from '../props.js';
import * as T from '../textures.js';
import { cloudSprite } from '../draw2d.js';
import { kf, E, prog, pop, lerp, wobble, clamp, rng, TAU } from '../util.js';

export default function ribbonScene(ctx) {
  const { W, H } = ctx;
  const scene = new THREE.Scene(), cam = makeCam(34);
  scene.userData.envI = 0.6;
  scene.add(new THREE.HemisphereLight(0xffffff, 0xffe0ea, 1.2));
  keyLight(scene, [-3, 7, 8], { intensity: 1.5, size: 9, radius: 6 });
  const fill = new THREE.DirectionalLight(0xffc8e0, 0.7); fill.position.set(5, -2, 4); scene.add(fill);

  const ribbon = new P.Ribbon(260, 0xe5213f); scene.add(ribbon.mesh);
  const knot = mesh(new THREE.TorusKnotGeometry(0.62, 0.27, 180, 24, 2, 3), glossy(0xe01a36, { roughness: 0.08 }), { vp: 0xd9938f }); scene.add(knot);

  // sticky-note questions
  const NOTE_COLS = ['#ffb38a', '#ff9fc6', '#c9a5f2', '#8fdcf2', '#ffe08a', '#ffb38a', '#b99cff', '#ff9fc6', '#8fdcf2', '#ffd0a8'];
  const r = rng(40);
  const notes = T.COPY.stickies.map((msg, i) => {
    const m = P.sticky(msg, NOTE_COLS[i % NOTE_COLS.length], 0.95); scene.add(m);
    const a = (i / T.COPY.stickies.length) * TAU + 0.3;
    return { m, delay: 0.1 + i * 0.085, y: (r() - 0.5) * 4.4, z: -1.5 + r() * 3.5, spin: [r() * 4 - 2, r() * 4 - 2, r() * 2 - 1], speed: 16 + r() * 8,
      home: [Math.cos(a) * (3.3 + (i % 2) * 1.0), Math.sin(a) * (1.5 + (i % 3) * 0.35) - 0.1, -0.6 - (i % 3) * 0.4], tilt: (r() - 0.5) * 0.5 };
  });

  // inflated "many"
  const letters = [...'many'].map((ch, i) => {
    const geo = new TextGeometry(ch, { font: ctx.font3d, size: 1.55, depth: 0.42, curveSegments: 10, bevelEnabled: true, bevelThickness: 0.24, bevelSize: 0.13, bevelSegments: 10 });
    geo.computeBoundingBox();
    const col = new THREE.Color(0xff78b4).lerp(new THREE.Color(0xc293ff), i / 3);
    const m = mesh(geo, glossy(col, { roughness: 0.22, clearcoat: 1, sheen: 0.6, sheenColor: 0xffffff }), { vp: 0x8fb89a });
    return { m, w: geo.boundingBox.max.x - geo.boundingBox.min.x, x0: geo.boundingBox.min.x };
  });
  const gap = -0.02, total = letters.reduce((s, l) => s + l.w + gap, -gap);
  let x = -total / 2;
  const word = new THREE.Group(); scene.add(word);
  letters.forEach((l) => { const holder = new THREE.Group(); holder.position.set(x + l.w / 2, 0, 0); l.m.position.set(-l.x0 - l.w / 2, -0.62, -0.3); holder.add(l.m); word.add(holder); l.h = holder; x += l.w + gap; });

  const umb = P.umbrella(); scene.add(umb);
  vpHelpers(scene, { size: 30, div: 30, y: -3.2, gizmos: [[-3, 2.5, 3], [3.5, 3, 2]] });

  const clouds = [cloudSprite(1400, 700, 3, '255,214,224'), cloudSprite(1400, 700, 5, '255,255,255'), cloudSprite(1200, 600, 8, '255,226,206')];

  function render(lt, t) {
    setCam(cam, [wobble(t, 7) * 0.12, 0.1 + wobble(t, 8) * 0.08, 11], [0, 0, 0], kf(lt, [[0, -8], [1.2, 3], [2.17, -4]]), 34);

    // ribbon: streaks left-to-right with one loop, then balls up into the knot
    const head = E.outCubic(prog(lt, -0.35, 0.4)), gather = E.inCubic(prog(lt, 0.95, 1.3));
    ribbon.mesh.visible = gather < 0.999;
    ribbon.set((u) => {
      const s = u * head, th = TAU * E.inOut(prog(s, 0.22, 0.42)), R = 1.25;
      let px = lerp(11, -11, s) + R * Math.sin(th) * 1.2, py = 0.3 - 1.6 * (s - 0.5) + 0.5 * Math.sin(s * 9 + lt * 5) + R * (1 - Math.cos(th)) - (th > 0 && th < TAU ? 0.6 : 0);
      let pz = 1.0 * Math.sin(s * 5 + lt * 3) + 0.8 * Math.sin(th);
      const k = 1 - gather; px *= k; py *= k; pz *= k;
      const tw = s * 10 + lt * 4;
      return { p: [px, py, pz], n: [0.2 * Math.sin(tw), Math.cos(tw * 0.6) * 0.85, Math.sin(tw * 0.6) * 0.6 + 0.15], w: 0.5 * (0.5 + 0.5 * k) * Math.min(1, u * 14 + 0.1) };
    });

    const ks = pop(lt, 1.12, 0.3, 2.0) * (1 - E.inCubic(prog(lt, 1.5, 1.66)));
    knot.visible = ks > 0.001; knot.scale.setScalar(Math.max(0.001, ks * (1 + 0.5 * prog(lt, 1.2, 1.6))));
    knot.rotation.set(lt * 3.2, lt * 4.1, lt * 2);

    letters.forEach((l, i) => {
      const s = pop(lt, 1.56 + i * 0.035, 0.34, 2.6);
      l.h.visible = s > 0.001; l.h.scale.setScalar(Math.max(0.001, s));
      l.h.rotation.set(Math.sin(lt * 3 + i) * 0.05, Math.sin(lt * 2.3 + i * 2) * 0.12, Math.sin(lt * 2.7 + i * 1.3) * 0.04 + (1 - s) * 0.4);
      l.h.position.y = Math.sin(lt * 3.1 + i * 0.9) * 0.06;
    });
    word.scale.setScalar(1.25 + 0.1 * prog(lt, 1.56, 2.17));
    word.position.y = 0.15;

    notes.forEach((n, i) => {
      const f = lt - n.delay, hk = E.inOutCubic(prog(lt, 0.9 + i * 0.02, 1.5 + i * 0.02));
      const fx = 13 - f * n.speed, fy = n.y + Math.sin(f * 3 + i) * 0.4;
      n.m.visible = f > 0;
      n.m.position.set(lerp(((fx + 14) % 28 + 28) % 28 - 14, n.home[0], hk), lerp(fy, n.home[1], hk), lerp(n.z, n.home[2], hk));
      const sp = (1 - hk);
      n.m.rotation.set(n.spin[0] * f * sp * 1.5 + 0.1 * hk, n.spin[1] * f * sp * 1.5 + n.tilt * hk, n.spin[2] * f * sp + n.tilt * 0.6 * hk);
      n.m.scale.setScalar(lerp(1.5, 1.2, hk));
    });

    // umbrella rises from below until its canopy fills the frame
    const up = E.inOutCubic(prog(lt, 1.72, 2.17));
    umb.visible = up > 0.001;
    umb.position.set(0.2, lerp(-9.5, -1.2, up), 4.2);
    umb.rotation.set(lerp(0.9, 0.55, up), lt * 1.5, 0.08);
    umb.scale.setScalar(2.6);

    const g = ctx.g;
    if (ctx.viewport) ctx.fill(ctx.VP_BG);
    else {
      const grd = g.createLinearGradient(0, 0, 0, H); grd.addColorStop(0, '#fff7f4'); grd.addColorStop(1, '#fdeef0');
      g.fillStyle = grd; g.fillRect(0, 0, W, H);
      const drift = lt * 260;
      g.globalAlpha = 0.9; g.drawImage(clouds[0], -300 - drift * 0.5, -120, 1700, 800); g.drawImage(clouds[2], W - 1100 - drift * 0.35, H - 640, 1500, 760);
      g.drawImage(clouds[1], 200 - drift * 0.7, H * 0.35, 1900, 900); g.globalAlpha = 1;
    }
    ctx.draw3d(scene, cam);
    return { glow: 0.4, htw: 0.12, ht: 0.12 * prog(lt, 1.5, 1.8), grain: 0.09, flash: Math.max((1 - E.outCubic(prog(lt, 0, 0.25))) * 0.6, (1 - E.outCubic(prog(lt, 1.56, 1.8))) * 0.5 * (lt >= 1.56 ? 1 : 0)), markColor: 'rgba(120,90,130,.5)' };
  }

  return [{ id: 'ribbon', start: 13.5, end: 15.67, render, blur: (lt) => (lt < 1.2 ? { n: 9, shutter: 0.8 } : lt > 1.75 ? { n: 4, shutter: 0.7 } : null) }];
}
