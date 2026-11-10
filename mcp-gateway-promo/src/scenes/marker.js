// 9.5–11.5   Macro: a marker inks the policy line across the page.
// 11.67–13.5 Top-down: the mark is drawn in glossy red, then peels away as a ribbon.
import { THREE, mat, glossy, mesh, keyLight, setCam, makeCam, cursorMesh, vpHelpers, slab, canvasTex } from '../kit3d.js';
import * as P from '../props.js';
import * as T from '../textures.js';
import { LOGO_PTS, spline, drawLogo, scribbleLine, text } from '../draw2d.js';
import { kf, E, prog, lerp, wobble, clamp, rng } from '../util.js';

function whiteStage(size = 9) {
  const scene = new THREE.Scene();
  scene.userData.envI = 0.45;
  scene.add(new THREE.HemisphereLight(0xffffff, 0xd9def5, 1.15));
  keyLight(scene, [-4.5, 7, 3.5], { intensity: 1.35, size, radius: 7 });
  scene.add(mesh(new THREE.PlaneGeometry(60, 60), mat(0xf3f2f8, { roughness: 0.8 }), { rot: [-Math.PI / 2, 0, 0], cast: false, vp: 0x9fc9a8 }));
  return scene;
}

const sheet = (w, h, tex, pos, ry, vp = 0xc9d6b0) => mesh(new THREE.PlaneGeometry(w, h), mat(0xffffff, { map: tex, roughness: 0.95 }), { pos, rot: [-Math.PI / 2, 0, ry], cast: false, vp });

export default function markerScenes(ctx) {
  const { W, H } = ctx;

  // ---------- macro ------------------------------------------------------------------------
  const A = whiteStage(), camA = makeCam(32);
  A.add(sheet(3.4, 4.4, T.sketchTex(7, 1), [-0.6, 0.004, 0.1], 0.2));
  A.add(sheet(3.0, 3.9, T.sketchTex(8, 0), [2.6, 0.002, -0.8], -0.25));
  const cupA = P.penCup({ color: 0xb9b6c9, seed: 14 }); cupA.position.set(-2.7, 0, -0.7); cupA.scale.setScalar(1.25); A.add(cupA);
  for (const [x, z, ry] of [[0.25, -0.35, 0.5], [0.47, -0.28, 0.9], [-1.0, 1.25, 2.2], [-0.78, 1.36, 2.7], [1.5, 1.15, 1.2], [1.75, 1.02, 0.4]]) { const c = P.paperclip(); c.position.set(x, 0.02, z); c.rotation.y = ry; A.add(c); }
  const inkPath = (u) => { const x = lerp(-2.3, 1.7, u); return [x, 0.55 + 0.1 * Math.sin(x * 1.1) - 0.1 * u, 0]; }; // [x, z]
  const SEG = 120, ink = new THREE.BufferGeometry(), ip = [], ii = [];
  for (let i = 0; i <= SEG; i++) {
    const [x, z] = inkPath(i / SEG), w = 0.042 * (0.8 + 0.3 * Math.sin(i * 0.7));
    ip.push(x, 0.008, z - w, x, 0.008, z + w);
    if (i < SEG) { const a = i * 2; ii.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
  }
  ink.setAttribute('position', new THREE.Float32BufferAttribute(ip, 3)); ink.setIndex(ii); ink.computeVertexNormals();
  A.add(mesh(ink, mat(0x35323f, { roughness: 0.5, side: THREE.DoubleSide }), { cast: false, vp: 0x2a2a2a }));
  const markA = P.marker(); A.add(markA);
  const UP = new THREE.Vector3(0, 1, 0);
  vpHelpers(A, { gizmos: [[-1.5, 2.2, 1.5], [1.8, 2.4, -0.5]], paths: [[[-2.3, 0.05, 0.55], [-1, 0.05, 0.5], [0.4, 0.05, 0.52], [1.7, 0.05, 0.42]]] });

  function macro(lt, t) {
    const u = kf(lt, [[0, 0], [0.4, 0.0], [0.5, 0.06, E.lin], [1.8, 0.88, E.inOut], [2.0, 0.94, E.lin]]);
    const [tx, tz] = inkPath(u), hover = (1 - E.outCubic(prog(lt, 0.15, 0.42))) * 0.6;
    ink.setDrawRange(0, Math.floor(u * SEG) * 6);
    markA.position.set(tx, 0.012 + hover, tz);
    const lean = new THREE.Vector3(0.5 + 0.15 * Math.sin(lt * 3), 1, 0.3).normalize();
    markA.quaternion.setFromUnitVectors(UP, lean);
    let c;
    if (lt < 0.5) c = kf(lt, [[0, [-3.6, 0.5, 2.5, -2.2, 0.45, 0.1, -16, 32]], [0.5, [-3.2, 0.6, 2.2, -2.0, 0.4, 0.2, -10, 32], E.outCubic]]);
    else if (lt < 1.8) c = kf(lt, [[0.5, [tx + 1.3, 1.25, 2.5, tx + 0.2, 0.35, tz - 0.1, -12, 30]], [1.2, [tx + 0.1, 0.75, 2.7, tx, 0.3, tz, 3, 30], E.inOut], [1.8, [tx - 1.4, 0.6, 2.2, tx - 0.1, 0.35, tz, 11, 30], E.inOut]]);
    else c = kf(lt, [[1.8, [1.2, 2.8, 3.8, 0.4, 0.2, 0.3, 16, 34]], [2.0, [2.0, 3.8, 4.4, 0.2, 0, 0, 30, 34], E.inQuad]]);
    setCam(camA, [c[0] + wobble(t, 5) * 0.03, c[1], c[2]], [c[3], c[4], c[5]], c[6], c[7]);
    ctx.fill(ctx.viewport ? ctx.VP_BG : '#f3f2f8');
    ctx.draw3d(A, camA);
    // pink wipe that hides the cut at lt 0.5
    const g = ctx.g, wp = prog(lt, 0.36, 0.66);
    if (wp > 0 && wp < 1 && !ctx.viewport) {
      g.save(); g.fillStyle = '#ff2d7a';
      g.beginPath(); g.ellipse(lerp(-W * 0.5, W * 1.6, wp), lerp(-H * 0.4, H * 1.3, wp), W * 0.75, H * 0.62, -0.5, 0, 6.283); g.fill(); g.restore();
    }
    return { glow: 0.36, htw: 0.2, grain: 0.1, flash: Math.max((1 - E.outCubic(prog(lt, 0, 0.2))) * 0.6, E.inQuad(prog(lt, 1.9, 2.0)) * 0.6), markColor: 'rgba(90,80,120,.55)' };
  }

  // ---------- top-down ---------------------------------------------------------------------
  const B = whiteStage(10), camB = makeCam(30);
  B.add(sheet(2.6, 3.3, T.sketchTex(7, 1), [-3.3, 0.004, 0.1], 0.14));
  B.add(sheet(2.2, 1.7, T.sketchTex(9, 0), [-2.1, 0.006, 1.9], -0.2));
  B.add(sheet(2.4, 1.7, T.sketchTex(10, 1), [0.5, 0.004, -2.3], 0.1));
  const board = new THREE.Group(); board.rotation.y = 0.13; B.add(board);
  board.add(mesh(slab(3.5, 2.4, 0.12, 0.05, 0.015), glossy(0xa45cf0, { roughness: 0.45 }), { rot: [-Math.PI / 2, 0, 0], pos: [0, 0.04, 0], vp: 0xb592d9 }));
  const LS = 0.0085;
  const pageTex = canvasTex(1024, 700, (g, w, h) => {
    g.fillStyle = '#fbfaf7'; g.fillRect(0, 0, w, h);
    const r = rng(3); g.strokeStyle = 'rgba(70,64,84,.45)'; g.lineWidth = 3; g.lineCap = 'round';
    drawLogo(g, w / 2, h / 2, (LS / 2.9) * 1024, 1, 'rgba(70,64,84,.28)', 5);
    for (let i = 0; i < 5; i++) scribbleLine(g, 60, 560 + i * 24, 200 + r() * 200, 560 + i * 24, r, 4);
    scribbleLine(g, 700, 90, 940, 96, r, 5); scribbleLine(g, 740, 120, 940, 124, r, 5);
    text(g, 'v3 — final?', 70, 110, { size: 56, weight: 700, family: 'Caveat', color: 'rgba(60,54,74,.7)' });
  });
  const page = mesh(new THREE.PlaneGeometry(2.9, 1.98), mat(0xffffff, { map: pageTex, roughness: 0.95 }), { pos: [0.05, 0.092, 0], rot: [-Math.PI / 2, 0, -0.07], vp: 0xc9d6b0, cast: false }); board.add(page);
  const tube = P.logoTube(0.042, 0xe5213f, LS); tube.position.set(0.05, 0.136, 0); tube.rotation.y = 0.07; board.add(tube);
  const sc = P.scissors(); sc.position.set(1.95, 0, 1.55); sc.rotation.y = 0.9; sc.scale.setScalar(1.25); B.add(sc);
  const st = P.sticky('ship it\nfriday!', '#ff9fc6', 1.25); st.rotation.set(-Math.PI / 2, 0, -0.18); st.position.set(2.95, 0.02, 0.5); B.add(st);
  const cupB = P.penCup({ color: 0xb9b6c9, seed: 3 }); cupB.position.set(-1.95, 0, -1.45); B.add(cupB);
  B.add(mesh(new THREE.CylinderGeometry(0.035, 0.035, 1.7, 8), mat(0xf2475f), { pos: [-2.3, 0.04, 1.2], rot: [0, 0.5, Math.PI / 2] }));
  const cur = cursorMesh(0x8b5cf6, 0.3); cur.rotation.set(-Math.PI / 2, 0, 0.2); cur.position.set(1.2, 0.14, 0.72); B.add(cur);
  const markB = P.marker(); markB.scale.setScalar(0.8); B.add(markB);
  const ribbon = new P.Ribbon(160, 0xe5213f); B.add(ribbon.mesh);
  vpHelpers(B, { gizmos: [[-2.6, 2.5, -1.2], [2.6, 2.6, 1.5]], paths: [[[0.8, 0.2, -0.6], [2, 1.2, -0.8], [4, 2.2, -1.2], [7, 3, -1.6]]] });
  const tipWorld = (u) => { const [x, y] = spline(LOGO_PTS, u); return board.localToWorld(tube.localToWorld(new THREE.Vector3(x * LS, 0, y * LS)).sub(new THREE.Vector3()).clone()); };

  function top(lt, t) {
    const c = kf(lt, [[0, [0.1, 8.4, 1.3, 0, 0, 0.1, -10]], [1.0, [0.1, 7.3, 1.3, 0, 0, 0.1, 4], E.outCubic], [1.83, [2.2, 5.0, 2.6, 1.6, 0.8, 0, 28], E.inCubic]]);
    setCam(camB, [c[0] + wobble(t, 6) * 0.04, c[1], c[2]], [c[3], c[4], c[5]], c[6]);
    B.updateMatrixWorld(true);
    const draw = E.inOut(prog(lt, 0.08, 0.92)), peel = E.inOutCubic(prog(lt, 1.0, 1.6));
    tube.userData.reveal(draw, peel);
    const tw = tipWorld(draw), lift = E.outCubic(prog(lt, 0.95, 1.4));
    markB.position.set(tw.x + lift * 1.2, tw.y + lift * 1.6, tw.z - lift * 1.4);
    markB.quaternion.setFromUnitVectors(UP, new THREE.Vector3(0.35, 1, 0.55 - lift * 0.3).normalize()); markB.rotateY(lift * 2);
    const endW = tipWorld(1), k = E.outCubic(prog(lt, 0.98, 1.75));
    ribbon.mesh.visible = k > 0.001;
    ribbon.set((u) => {
      const d = u * k, tw2 = u * 7 + lt * 5;
      return {
        p: [endW.x + d * 9.5, endW.y + d * 3.2 + 0.35 * Math.sin(u * 8 + lt * 7) * d * 2, endW.z - d * 1.6 + 0.5 * Math.sin(u * 6 + lt * 4) * d],
        n: [0.15 * Math.sin(tw2), Math.cos(tw2) * 0.6, Math.sin(tw2) * 0.8 + 0.2], w: 0.2 * Math.min(1, u * 10 + 0.15),
      };
    });
    ctx.fill(ctx.viewport ? ctx.VP_BG : '#f3f2f8');
    ctx.draw3d(B, camB);
    return { glow: 0.36, htw: 0.22, grain: 0.1, flash: Math.max((1 - E.outCubic(prog(lt, 0, 0.22))) * 0.55, E.inQuad(prog(lt, 1.68, 1.83)) * 0.8), markColor: 'rgba(90,80,120,.55)' };
  }

  return [
    { id: 'marker', start: 9.5, end: 11.5, render: macro, blur: (lt) => ((lt > 0.3 && lt < 0.7) || lt > 1.75 ? { n: 6, shutter: 0.8 } : null) },
    { id: 'topdown', start: 11.67, end: 13.5, render: top, blur: (lt) => (lt > 1.35 ? { n: 6, shutter: 0.8 } : null) },
  ];
}
