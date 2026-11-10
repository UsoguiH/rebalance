// 9.37–11.37  Macro: a marker inks the policy line across the page (five set-ups).
// 11.67–13.43 Top-down: the mark is drawn in glossy red, then peels away as a ribbon.
import { THREE, mat, glossy, mesh, keyLight, setCam, topCam, screenPlace, spanAt, makeCam, cursorMesh, vpHelpers, canvasTex } from '../kit3d.js';
import * as P from '../props.js';
import * as T from '../textures.js';
import { LOGO_PTS, spline, drawLogo, scribbleLine, text } from '../draw2d.js';
import { kf, E, prog, lerp, wobble, clamp, rng } from '../util.js';

function whiteStage(size = 9) {
  const scene = new THREE.Scene();
  scene.userData.envI = 0.5;
  scene.add(new THREE.HemisphereLight(0xffffff, 0xd9def5, 1.1));
  keyLight(scene, [-4.5, 7, 3.5], { intensity: 1.35, size, radius: 7 });
  scene.add(mesh(new THREE.PlaneGeometry(60, 60), mat(0xf3f2f8, { roughness: 0.8 }), { rot: [-Math.PI / 2, 0, 0], cast: false, vp: 0x9fc9a8 }));
  return scene;
}
const sheet = (w, h, tex, pos, ry, vp = 0xc9d6b0) => mesh(new THREE.PlaneGeometry(w, h), mat(0xffffff, { map: tex, roughness: 0.95 }), { pos, rot: [-Math.PI / 2, 0, ry], cast: false, vp });

// The stroke: a long line that hooks back on itself, as [x, z] for u in 0..1.
const HOOK = 0.72, HR = 0.42;
function inkPath(u) {
  if (u <= HOOK) { const k = u / HOOK; return [lerp(-3.0, 1.1, k), 0.55 - 0.08 * k]; }
  const a = ((u - HOOK) / (1 - HOOK)) * Math.PI * 1.15;
  return [1.1 + Math.sin(a) * HR, 0.47 - HR + Math.cos(a) * HR];
}

export default function markerScenes(ctx) {
  const { W, H } = ctx;
  const UP = new THREE.Vector3(0, 1, 0);

  // ---------- macro ------------------------------------------------------------------------
  const A = whiteStage(), camA = makeCam(32);
  A.add(sheet(3.6, 4.6, T.sketchTex(7, 1), [-0.4, 0.004, -0.3], 0.2));
  A.add(sheet(3.0, 3.9, T.sketchTex(8, 0), [2.9, 0.002, -0.9], -0.25));
  A.add(sheet(2.6, 3.4, T.sketchTex(9, 1), [-3.4, 0.003, 1.2], 0.5));
  const cupA = P.penCup({ seed: 14 }); cupA.position.set(-1.6, 0, -1.3); cupA.scale.setScalar(1.3); A.add(cupA);
  for (const [x, z, ry] of [[-0.4, -0.25, 0.5], [-0.2, -0.2, 0.9], [-1.5, 1.2, 2.2], [-1.25, 1.32, 2.7], [-1.7, 1.45, 0.3], [2.1, 1.0, 1.2]]) { const c = P.paperclip(); c.position.set(x, 0.02, z); c.rotation.y = ry; A.add(c); }
  const SEG = 160, ink = new THREE.BufferGeometry(), ip = [], ii = [];
  for (let i = 0; i <= SEG; i++) {
    const [x, z] = inkPath(i / SEG), [x2, z2] = inkPath(Math.min(1, i / SEG + 0.004)), [x0, z0] = inkPath(Math.max(0, i / SEG - 0.004));
    const dx = x2 - x0, dz = z2 - z0, l = Math.hypot(dx, dz) || 1, w = 0.045 * (0.85 + 0.25 * Math.sin(i * 0.7));
    ip.push(x - (dz / l) * w, 0.008, z + (dx / l) * w, x + (dz / l) * w, 0.008, z - (dx / l) * w);
    if (i < SEG) { const a = i * 2; ii.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
  }
  ink.setAttribute('position', new THREE.Float32BufferAttribute(ip, 3)); ink.setIndex(ii); ink.computeVertexNormals();
  A.add(mesh(ink, mat(0x35323f, { roughness: 0.5, side: THREE.DoubleSide }), { cast: false, vp: 0x2a2a2a }));
  const markA = P.marker(); A.add(markA);
  vpHelpers(A, { gizmos: [[-1.5, 2.2, 1.5], [1.8, 2.4, -0.5]], paths: [[[-3, 0.05, 0.55], [-1, 0.05, 0.5], [1.1, 0.05, 0.47], [1.5, 0.05, 0.1], [1.0, 0.05, -0.3]]] });

  const M = [0.25, 0.66, 1.1, 1.7]; // set-up cuts (local time)
  function macro(lt, t) {
    const sh = M.filter((c) => lt >= c).length;
    const u = kf(lt, [[0, 0.3], [0.6, 0.3], [M[1], 0.34, E.lin], [M[2], 0.6, E.lin], [1.5, HOOK + 0.12, E.lin], [M[3], 0.97, E.outQuad], [2.0, 1, E.lin]]);
    const [tx, tz] = inkPath(u);
    ink.setDrawRange(0, Math.floor(u * SEG) * 6);
    let c, lean = [0.45, 1, -0.15], hover = 0;
    if (sh === 0) { // whip in: the frame is still spinning
      const k = prog(lt, 0, M[0]);
      c = [-2.4, 0.9, 1.6, -1.6, 0.5, -1.0, lerp(-160, -78, E.outCubic(k)), 34]; hover = 0.9; lean = [1, 0.25, 0.4];
    } else if (sh === 1) { // pen holder big on the left, marker lying across the bottom
      const k = prog(lt, M[0], M[1]);
      c = [lerp(-2.5, -2.9, k), lerp(0.85, 0.7, k), lerp(1.7, 1.9, k), -1.5, 0.45, -0.8, lerp(-70, -22, E.outCubic(k)), 34];
      hover = lerp(0.7, 0.08, E.inOut(k)); lean = [lerp(1, 0.2, E.inCubic(k)), lerp(0.25, 1, k), 0.35];
    } else if (sh === 2) { // drawing, medium
      const k = prog(lt, M[1], M[2]);
      c = [tx + lerp(-0.5, -0.9, k), lerp(2.0, 1.6, k), tz + lerp(3.3, 2.9, k), tx - 0.75, 0.55, tz - 0.2, -4, 30];
    } else if (sh === 3) { // close orbit around the nib as the stroke hooks back
      const k = prog(lt, M[2], M[3]), a = lerp(0.55, -0.95, E.inOut(k)), R = 2.15;
      c = [tx + Math.sin(a) * R - 0.2, lerp(1.05, 0.95, k), tz + Math.cos(a) * R, tx - 0.25, 0.5, tz - 0.05, lerp(-6, 8, k), 30];
      lean = [lerp(0.45, 0.1, k), 1, lerp(-0.15, 0.05, k)];
    } else { // pull up and away
      const k = prog(lt, M[3], 2.0);
      c = [tx + lerp(0.2, 2.4, E.inQuad(k)), lerp(1.4, 5.2, E.inQuad(k)), tz + lerp(2.4, 4.4, k), tx + 0.1, 0.2, tz - 0.2, lerp(6, 34, E.inQuad(k)), 34];
      hover = E.inCubic(k) * 0.5; lean = [0.5 + k * 0.5, 1, -0.3 * k];
    }
    markA.position.set(tx, 0.012 + hover, tz);
    markA.quaternion.setFromUnitVectors(UP, new THREE.Vector3(...lean).normalize());
    setCam(camA, [c[0] + wobble(t, 5) * 0.02, c[1], c[2]], [c[3], c[4], c[5]], c[6], c[7]);
    ctx.fill(ctx.viewport ? ctx.VP_BG : '#f3f2f8');
    ctx.draw3d(A, camA);
    // pink wipe from the top-left corner that hides the cut at 10.03
    const g = ctx.g, wp = prog(lt, 0.53, 0.8);
    if (wp > 0 && wp < 1 && !ctx.viewport) {
      g.save(); g.fillStyle = '#ff2d7a'; const s = Math.sin(wp * Math.PI);
      g.beginPath(); g.moveTo(0, 0); g.lineTo(W * 0.75 * s, 0); g.quadraticCurveTo(W * 0.32 * s, H * 0.1 * s, W * 0.1 * s, H * 0.42 * s); g.lineTo(0, H * 0.5 * s); g.closePath(); g.fill(); g.restore();
    }
    const bars = (1 - E.outCubic(prog(lt, 0, 0.3))) * 0.3;
    return { glow: 0.36, htw: 0.2, grain: 0.1, bars, flash: Math.max((1 - E.outCubic(prog(lt, 0, 0.2))) * 0.3, E.inQuad(prog(lt, 1.92, 2.0)) * 0.5), markColor: 'rgba(90,80,120,.55)' };
  }

  // ---------- top-down ---------------------------------------------------------------------
  const B = whiteStage(10), camB = makeCam(30);
  B.add(sheet(2.7, 2.0, T.sketchTex(7, 1), [-2.95, 0.004, -0.75], 0.1));
  B.add(sheet(2.2, 1.6, T.sketchTex(9, 0), [-0.3, 0.006, 1.6], -0.08, 0xc8c0e6));
  B.add(sheet(2.3, 1.7, T.sketchTex(10, 1), [1.6, 0.004, -2.6], 0.12));
  const board = new THREE.Group(); board.rotation.y = 0.16; B.add(board);
  const cb = P.clipboard(); cb.rotation.y = 0; board.add(cb);
  const LS = 0.0085;
  const pageTex = canvasTex(1024, 700, (g, w, h) => {
    g.fillStyle = '#fbfaf7'; g.fillRect(0, 0, w, h);
    const r = rng(3); g.strokeStyle = 'rgba(70,64,84,.45)'; g.lineWidth = 3; g.lineCap = 'round';
    drawLogo(g, w / 2, h / 2, (LS / 2.9) * 1024, 1, 'rgba(70,64,84,.28)', 5);
    for (let i = 0; i < 5; i++) scribbleLine(g, 60, 560 + i * 24, 200 + r() * 200, 560 + i * 24, r, 4);
    scribbleLine(g, 700, 90, 940, 96, r, 5); scribbleLine(g, 740, 120, 940, 124, r, 5);
    text(g, 'v3 — final?', 70, 110, { size: 56, weight: 700, family: 'Caveat', color: 'rgba(60,54,74,.7)' });
  });
  const PY = 0.085; // clipboard top
  const page = mesh(new THREE.PlaneGeometry(2.9, 1.98), mat(0xffffff, { map: pageTex, roughness: 0.95 }), { pos: [0.1, PY + 0.012, 0], rot: [-Math.PI / 2, 0, -0.07], vp: 0xc9d6b0, cast: false }); board.add(page);
  const tube = P.logoTube(0.042, 0xe5213f, LS); tube.position.set(0.1, PY + 0.056, 0); tube.rotation.y = 0.07; board.add(tube);
  const sc = P.scissors(); sc.position.set(0.5, 0, 1.45); sc.rotation.y = 0.9; sc.scale.setScalar(1.05); B.add(sc);
  const st = P.sticky('ship it\nfriday!', '#ff9fc6', 1.15); st.rotation.set(-Math.PI / 2, 0, -0.14); st.position.set(2.75, 0.02, 0.8); B.add(st);
  const cupB = P.penCup({ seed: 3 }); cupB.position.set(-1.4, 0, -1.2); cupB.scale.setScalar(0.9); B.add(cupB);
  B.add(mesh(new THREE.CylinderGeometry(0.035, 0.035, 1.7, 8), mat(0xf2475f), { pos: [-3.5, 0.04, 0.55], rot: [0, 0.3, Math.PI / 2] }));
  const cur = cursorMesh(0x8b5cf6, 0.3); B.add(cur);
  const markB = P.marker(); markB.scale.setScalar(0.62); B.add(markB);
  const ribbon = new P.Ribbon(180, 0xe5213f); B.add(ribbon.mesh);
  vpHelpers(B, { gizmos: [[-2.6, 2.5, -1.2], [2.6, 2.6, 1.5]], paths: [[[0.8, 0.2, -0.6], [2, 1.2, -0.8], [4, 2.2, -1.2], [7, 3, -1.6]]] });
  const tipWorld = (u) => { const [x, y] = spline(LOGO_PTS, u); return tube.localToWorld(new THREE.Vector3(x * LS, 0, y * LS)); };

  function top(lt, t) {
    const k2 = E.inOut(prog(lt, 1.0, 1.76));
    topCam(camB, lerp(0.05, 0.7, k2) + wobble(t, 6) * 0.03, lerp(-0.56, -0.2, k2), lerp(6.9, 6.5, prog(lt, 0, 1.0)) - k2 * 1.3, lerp(4, 0, prog(lt, 0, 1.0)) - k2 * 13);
    B.updateMatrixWorld(true);
    const draw = E.inOut(prog(lt, 0.08, 0.42)), peel = E.inOutCubic(prog(lt, 0.98, 1.5));
    tube.userData.reveal(draw, peel);
    // marker: draws, rests on the page, then lifts to the top of frame
    const tw = tipWorld(draw), lift = E.inOutCubic(prog(lt, 0.95, 1.35));
    if (lift <= 0) { markB.position.set(tw.x, tw.y, tw.z); markB.quaternion.setFromUnitVectors(UP, new THREE.Vector3(0.75, 0.55, -0.35).normalize()); }
    else {
      const a = new THREE.Vector3(tw.x, tw.y, tw.z); screenPlace(markB, camB, 0.565, lerp(0.5, 0.36, lift), lerp(6.4, 4.6, lift));
      markB.position.lerpVectors(a, markB.position.clone(), lift);
      markB.quaternion.copy(camB.quaternion); markB.rotateZ(0.12); markB.rotateX(lerp(1.0, 0.25, lift));
    }
    // small pointer drifting near the page corner, then floating
    const cl = E.inOut(prog(lt, 1.0, 1.4));
    screenPlace(cur, camB, lerp(0.525, 0.585, cl), lerp(0.83, 0.42, cl), lerp(6.6, 4.8, cl));
    cur.quaternion.copy(camB.quaternion); cur.rotateZ(0.5 - cl * 0.9); cur.scale.setScalar(spanAt(camB, 0.022, lerp(6.6, 4.8, cl)));
    // ribbon peels off the end of the mark and streams out to the right
    const endW = tipWorld(1), k = E.outCubic(prog(lt, 0.98, 1.6)), flow = lt * 3.2;
    ribbon.mesh.visible = k > 0.001;
    ribbon.set((u) => {
      const d = u * k, tw2 = u * 9 - flow;
      return {
        p: [endW.x + d * 8.5, endW.y + 0.25 + 0.9 * Math.sin(d * 3) + 0.22 * Math.sin(u * 11 - flow * 1.6) * Math.min(1, d * 4), endW.z - d * 0.5 + 0.34 * Math.sin(u * 8 - flow * 1.2) * Math.min(1, d * 3)],
        n: [0.25 * Math.sin(tw2), 0.45 + 0.4 * Math.cos(tw2), 0.75 * Math.sin(tw2 * 0.7) + 0.35], w: 0.24 * Math.min(1, u * 9 + 0.12),
      };
    });
    ctx.fill(ctx.viewport ? ctx.VP_BG : '#f3f2f8');
    ctx.draw3d(B, camB);
    return { glow: 0.36, htw: 0.22, grain: 0.1, flash: Math.max((1 - E.outCubic(prog(lt, 0, 0.25))) * 0.7, E.inQuad(prog(lt, 1.66, 1.76)) * 0.7), markColor: 'rgba(90,80,120,.55)' };
  }

  return [
    { id: 'marker', start: 9.37, end: 11.37, render: macro, blur: (lt) => (lt < 0.66 || lt > 1.75 ? { n: 6, shutter: 0.8 } : lt >= 1.1 ? { n: 2, shutter: 0.5 } : null) },
    { id: 'topdown', start: 11.67, end: 13.43, render: top, blur: (lt) => (lt > 1.0 ? { n: 4, shutter: 0.7 } : null) },
  ];
}
