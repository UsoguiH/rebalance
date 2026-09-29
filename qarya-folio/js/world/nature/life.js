import * as THREE from 'three';
import { Builder } from '../../core/builder.js';
import { flapMaterial, rng } from './util.js';

// الحياة: kites circling over the oasis, butterflies by the shore,
// dragonflies darting over the water, and the camel's footprints.

function birdGeometry() {
  const b = new Builder();
  const body = '#4a3526', wing = '#5e4330', tip = '#2e2019';
  b.add(new THREE.OctahedronGeometry(0.22, 0), body, { scale: [0.8, 0.7, 2.6] });
  b.add(new THREE.ConeGeometry(0.08, 0.2, 4), '#d8a336', { position: [0, 0, 0.62], rotation: [Math.PI / 2, 0, 0] });
  b.add(new THREE.ConeGeometry(0.18, 0.45, 3), tip, { position: [0, 0, -0.62], rotation: [-Math.PI / 2, 0, 0], scale: [1.6, 1, 0.3] });
  for (const s of [-1, 1]) {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute([
      0.05 * s, 0, 0.3, 0.05 * s, 0, -0.25, 0.75 * s, 0.02, 0.05,
      0.75 * s, 0.02, 0.05, 0.05 * s, 0, -0.25, 0.75 * s, 0.02, -0.25,
      0.75 * s, 0.02, 0.05, 0.75 * s, 0.02, -0.25, 1.35 * s, 0.05, -0.35,
    ], 3));
    g.computeVertexNormals();
    b.add(g, wing);
    const t = new THREE.BufferGeometry();
    t.setAttribute('position', new THREE.Float32BufferAttribute([0.75 * s, 0.021, 0.05, 1.35 * s, 0.051, -0.35, 1.1 * s, 0.04, -0.05], 3));
    t.computeVertexNormals();
    b.add(t, tip);
  }
  return b.build().geometry;
}

function butterflyGeometry() {
  const b = new Builder();
  b.cylinder(0.012, 0.012, 0.14, '#3a2a20', { rotation: [Math.PI / 2, 0, 0] }, 3);
  for (const s of [-1, 1]) {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute([
      0.02 * s, 0, 0.05, 0.16 * s, 0, 0.14, 0.2 * s, 0, 0.0,
      0.02 * s, 0, 0.05, 0.2 * s, 0, 0.0, 0.02 * s, 0, -0.03,
      0.02 * s, 0, -0.03, 0.14 * s, 0, -0.02, 0.1 * s, 0, -0.12,
    ], 3));
    g.computeVertexNormals();
    b.add(g, '#ffffff');
  }
  return b.build().geometry;
}

function dragonflyGeometry() {
  const b = new Builder();
  b.cylinder(0.018, 0.012, 0.42, '#1f8a8a', { rotation: [Math.PI / 2, 0, 0], position: [0, 0, -0.1] }, 4);
  b.sphere(0.04, '#2e3f7f', { position: [0, 0, 0.13] }, 0);
  for (const s of [-1, 1]) {
    for (const zo of [0.05, -0.03]) {
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute([
        0.02 * s, 0, zo + 0.02, 0.3 * s, 0, zo + 0.01, 0.3 * s, 0, zo - 0.04,
        0.02 * s, 0, zo + 0.02, 0.3 * s, 0, zo - 0.04, 0.02 * s, 0, zo - 0.03,
      ], 3));
      g.computeVertexNormals();
      b.add(g, '#dff4f0');
    }
  }
  return b.build().geometry;
}

export function createLife(ctx, groundH, shore) {
  const { scene, LAYOUT, mobile, P } = ctx;
  const { oasis } = LAYOUT;
  const rand = rng(4242);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(0, 0, 0, 'YXZ'), v = new THREE.Vector3(), s = new THREE.Vector3(1, 1, 1);

  // Birds: slow circles, banking into the turn, some over the village too.
  const nB = mobile ? 5 : 8;
  const birds = new THREE.InstancedMesh(birdGeometry(), flapMaterial({ freq: 7, amp: 0.55, bias: 0.12, glide: true }), nB);
  birds.castShadow = true;
  birds.frustumCulled = false;
  const bData = [];
  for (let i = 0; i < nB; i++) {
    const overOasis = i < nB - 2;
    bData.push({
      cx: overOasis ? oasis.x + (rand() - 0.5) * 6 : (rand() - 0.5) * 30,
      cz: overOasis ? oasis.z + (rand() - 0.5) * 6 : (rand() - 0.5) * 30,
      r: 8 + rand() * 12, y: 13 + rand() * 7, w: (0.18 + rand() * 0.12) * (rand() < 0.3 ? -1 : 1), a: rand() * 6.28, bob: rand() * 6.28,
    });
  }
  scene.add(birds);

  // Butterflies near the shore greenery.
  const nF = mobile ? 5 : 10;
  const flies = new THREE.InstancedMesh(butterflyGeometry(), flapMaterial({ freq: 17, amp: 0.9, bias: 0.3 }), nF);
  flies.frustumCulled = false;
  const fCols = ['#f0b12e', '#fbf0dc', '#e8742a', '#8fc4e8', '#f4a9b8'];
  const fData = [];
  for (let i = 0; i < nF; i++) {
    const a = rand() * Math.PI * 2, r = shore.at(a) + 1.5 + rand() * 3;
    const x = oasis.x + Math.cos(a) * r, z = oasis.z + Math.sin(a) * r;
    fData.push({ x, z, a, r, ph: rand() * 20, sp: 0.4 + rand() * 0.4 });
    flies.setColorAt(i, new THREE.Color(fCols[i % fCols.length]));
  }
  scene.add(flies);

  // Dragonflies: hover, then dart to a new spot over the water.
  const nD = mobile ? 3 : 6;
  const drag = new THREE.InstancedMesh(dragonflyGeometry(), flapMaterial({ freq: 42, amp: 0.3, bias: 0.05 }), nD);
  drag.frustumCulled = false;
  const dData = [];
  const waterPoint = (out) => {
    const a = rand() * Math.PI * 2, r = (0.35 + rand() * 0.55) * shore.at(a);
    out.x = oasis.x + Math.cos(a) * r; out.z = oasis.z + Math.sin(a) * r; out.y = oasis.water + 0.35 + rand() * 0.7;
    return out;
  };
  for (let i = 0; i < nD; i++) {
    const p = waterPoint({}), tgt = waterPoint({});
    dData.push({ ...p, tx: tgt.x, tz: tgt.z, ty: tgt.y, wait: rand() * 2, head: 0 });
    drag.setColorAt(i, new THREE.Color(i % 2 ? '#ffffff' : '#ffd0a0'));
  }
  scene.add(drag);

  // Footprints: a ring buffer of fading oval prints.
  const nP = mobile ? 70 : 140;
  const printGeo = new THREE.CircleGeometry(0.16, 8).rotateX(-Math.PI / 2);
  printGeo.scale(0.85, 1, 1.25);
  const fade = new THREE.InstancedBufferAttribute(new Float32Array(nP), 1);
  printGeo.setAttribute('aFade', fade);
  const printMat = new THREE.MeshLambertMaterial({ color: '#9c6a3c', transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  printMat.onBeforeCompile = (sh) => {
    sh.vertexShader = 'attribute float aFade;\nvarying float vFade;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvFade = aFade;');
    sh.fragmentShader = 'varying float vFade;\n' + sh.fragmentShader.replace('#include <color_fragment>', '#include <color_fragment>\ndiffuseColor.a *= vFade * 0.5;');
  };
  printMat.customProgramCacheKey = () => 'qarya-print';
  const prints = new THREE.InstancedMesh(printGeo, printMat, nP);
  prints.frustumCulled = false;
  prints.receiveShadow = true;
  prints.renderOrder = 2;
  for (let i = 0; i < nP; i++) prints.setMatrixAt(i, m.makeScale(0, 0, 0));
  scene.add(prints);
  const born = new Float32Array(nP).fill(-100);
  let head = 0, travelled = 0, side = 1;
  const last = new THREE.Vector3(NaN, 0, 0);
  const nrm = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0), qn = new THREE.Quaternion(), qy = new THREE.Quaternion();
  const LIFE = 14;

  function dropPrint(x, z, heading, t) {
    const y = groundH(x, z);
    if (y < oasis.water + 0.02) return;
    ctx.normalAt(x, z, nrm);
    qn.setFromUnitVectors(up, nrm);
    qy.setFromAxisAngle(up, heading);
    q.multiplyQuaternions(qn, qy);
    m.compose(v.set(x, y + 0.03, z), q, s.set(1, 1, 1));
    prints.setMatrixAt(head, m);
    born[head] = t;
    head = (head + 1) % nP;
    prints.instanceMatrix.needsUpdate = true;
  }

  return {
    update(dt, t) {
      // Birds.
      for (let i = 0; i < nB; i++) {
        const b = bData[i];
        b.a += b.w * dt;
        const x = b.cx + Math.cos(b.a) * b.r, z = b.cz + Math.sin(b.a) * b.r;
        const y = b.y + Math.sin(t * 0.3 + b.bob) * 1.2;
        const heading = Math.atan2(-Math.sin(b.a) * Math.sign(b.w), Math.cos(b.a) * Math.sign(b.w));
        e.set(0, heading, -Math.sign(b.w) * 0.35);
        q.setFromEuler(e);
        m.compose(v.set(x, y, z), q, s.set(1, 1, 1));
        birds.setMatrixAt(i, m);
      }
      birds.instanceMatrix.needsUpdate = true;

      // Butterflies: wander around their anchor.
      for (let i = 0; i < nF; i++) {
        const f = fData[i];
        const tt = t * f.sp + f.ph;
        const x = f.x + Math.sin(tt * 1.3) * 1.6 + Math.sin(tt * 3.1) * 0.3;
        const z = f.z + Math.cos(tt * 0.9) * 1.6 + Math.cos(tt * 2.7) * 0.3;
        const y = groundH(x, z) + 0.7 + Math.sin(tt * 2.2) * 0.35 + Math.abs(Math.sin(tt * 7)) * 0.12;
        const dx = Math.cos(tt * 1.3) * 1.3, dz = -Math.sin(tt * 0.9) * 0.9;
        e.set(0.25, Math.atan2(dx, dz), 0);
        q.setFromEuler(e);
        m.compose(v.set(x, Math.max(y, oasis.water + 0.5), z), q, s.set(1.4, 1.4, 1.4));
        flies.setMatrixAt(i, m);
      }
      flies.instanceMatrix.needsUpdate = true;

      // Dragonflies.
      for (let i = 0; i < nD; i++) {
        const d = dData[i];
        if (d.wait > 0) {
          d.wait -= dt;
          if (d.wait <= 0) { const p = waterPoint({}); d.tx = p.x; d.tz = p.z; d.ty = p.y; }
        } else {
          const k = Math.min(1, dt * 3.5);
          d.x += (d.tx - d.x) * k; d.y += (d.ty - d.y) * k; d.z += (d.tz - d.z) * k;
          if (Math.hypot(d.tx - d.x, d.tz - d.z) < 0.08) d.wait = 0.6 + rand() * 2.2;
        }
        const want = Math.atan2(d.tx - d.x, d.tz - d.z);
        if (d.wait <= 0) d.head = want;
        e.set(0, d.head, 0);
        q.setFromEuler(e);
        m.compose(v.set(d.x + Math.sin(t * 9 + i) * 0.02, d.y + Math.sin(t * 5 + i) * 0.04, d.z), q, s.set(1.2, 1.2, 1.2));
        drag.setMatrixAt(i, m);
      }
      drag.instanceMatrix.needsUpdate = true;

      // Footprints.
      const pl = ctx.player;
      if (pl) {
        const p = pl.position;
        const gh = groundH(p.x, p.z);
        const onSand = pl.grounded && Math.abs(p.y - gh) < 0.45 && Math.abs(pl.speed) > 0.4;
        if (last.x !== last.x || !onSand) last.copy(p);
        else {
          travelled += Math.hypot(p.x - last.x, p.z - last.z);
          last.copy(p);
          const stride = 0.95;
          while (travelled > stride) {
            travelled -= stride;
            const h = pl.heading;
            const rx = Math.cos(h), rz = -Math.sin(h);
            side = -side;
            // Two feet land close together: front and back pair on this side.
            const fx = Math.sin(h), fz = Math.cos(h);
            dropPrint(p.x + rx * 0.33 * side + fx * 0.35, p.z + rz * 0.33 * side + fz * 0.35, h, t);
            dropPrint(p.x + rx * 0.3 * side - fx * 0.55, p.z + rz * 0.3 * side - fz * 0.55, h, t);
          }
        }
      }
      const fa = fade.array;
      for (let i = 0; i < nP; i++) {
        const age = t - born[i];
        fa[i] = age < 0 || age > LIFE ? 0 : Math.min(1, age * 4) * (1 - Math.pow(age / LIFE, 2));
      }
      fade.needsUpdate = true;
    },
  };
}
