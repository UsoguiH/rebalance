import * as THREE from 'three';
import { G, shade } from './kit.js';

// أغراض تتدحرج: clay pots, crates and baskets the camel can knock over.
// Each prop is a cannon body with an invisible proxy Object3D (the physics
// module syncs it); the visible meshes are one InstancedMesh per kind, so 40
// props cost 3 draw calls.

export function createProps(ctx) {
  const { P, physics, heightAt, Builder } = ctx;

  const types = {
    pot: {
      h: 0.64, r: 0.28, mass: 0.9, kind: 'pot', shape: 'cyl',
      geo() {
        const b = new Builder();
        b.add(G.lathe('prop-pot', [[0, -0.32], [0.17, -0.31], [0.28, -0.14], [0.29, 0.0], [0.22, 0.17], [0.12, 0.25], [0.11, 0.29], [0.15, 0.32], [0, 0.32]], 8), '#b8663a');
        b.cylinder(0.285, 0.29, 0.07, P.cream, { position: [0, -0.06, 0] }, 8);
        b.cylinder(0.26, 0.28, 0.04, P.mudDark, { position: [0, 0.04, 0] }, 8);
        return b.build().geometry;
      },
    },
    crate: {
      h: 0.7, w: 0.7, mass: 2, kind: 'wood', shape: 'box',
      geo() {
        const b = new Builder();
        const s = 0.7, e = 0.09, c = shade(P.wood, 0.02);
        b.box([s - 0.02, s - 0.02, s - 0.02], P.woodLight);
        for (const [x, y] of [[-1, -1], [-1, 1], [1, -1], [1, 1]]) {
          b.box([s, e, e], c, { position: [0, y * (s / 2 - e / 2), x * (s / 2 - e / 2)] });
          b.box([e, s, e], c, { position: [x * (s / 2 - e / 2), 0, y * (s / 2 - e / 2)] });
          b.box([e, e, s], c, { position: [x * (s / 2 - e / 2), y * (s / 2 - e / 2), 0] });
        }
        for (const sd of [-1, 1]) {
          b.box([0.08, 0.72, 0.02], c, { position: [0, 0, sd * (s / 2)], rotation: [0, 0, Math.PI / 4] });
          b.box([0.02, 0.72, 0.08], c, { position: [sd * (s / 2), 0, 0], rotation: [Math.PI / 4, 0, 0] });
        }
        return b.build().geometry;
      },
    },
    basket: {
      h: 0.44, r: 0.3, mass: 0.7, kind: 'fabric', shape: 'cyl',
      geo() {
        const b = new Builder();
        b.cylinder(0.33, 0.25, 0.42, '#d6b06a', { position: [0, -0.01, 0] }, 9);
        b.cylinder(0.335, 0.33, 0.07, P.red, { position: [0, 0.1, 0] }, 9);
        b.cylinder(0.3, 0.27, 0.05, '#b98f4d', { position: [0, -0.12, 0] }, 9);
        b.cylinder(0.29, 0.29, 0.04, P.date, { position: [0, 0.19, 0] }, 9);
        for (let i = 0; i < 7; i++) b.sphere(0.07, i % 2 ? P.date : '#6e2416', { position: [Math.sin(i * 2.3) * 0.17 * (i % 3) / 2, 0.22, Math.cos(i * 2.3) * 0.17 * (i % 3) / 2] }, 0);
        return b.build().geometry;
      },
    },
  };

  const items = { pot: [], crate: [], basket: [] };
  const tint = new THREE.Color();

  // Add one prop standing on the sand at (x, z), or at an explicit y (centre).
  function add(type, x, z, rotY = 0, y = null) {
    const T = types[type];
    const cy = y === null ? heightAt(x, z) + T.h / 2 + 0.02 : y;
    const proxy = new THREE.Object3D();
    let body;
    if (T.shape === 'box') {
      body = physics.addBox({ size: [T.w, T.h, T.w], position: [x, cy, z], rotationY: rotY, mass: T.mass, mesh: proxy, kind: T.kind });
    } else {
      body = physics.addCylinder({ radius: T.r, height: T.h, position: [x, cy, z], mass: T.mass, mesh: proxy, kind: T.kind });
    }
    items[type].push({ proxy, body });
    return body;
  }

  let meshes = [];
  function build(scene) {
    for (const [type, list] of Object.entries(items)) {
      if (!list.length) continue;
      const mesh = new THREE.InstancedMesh(types[type].geo(), flatMat(), list.length);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.frustumCulled = false;
      mesh.name = 'village-props-' + type;
      list.forEach((it, i) => {
        tint.setHSL(0.08, 0.2, 0.88 + ((i * 37) % 11) / 90);
        mesh.setColorAt(i, tint);
      });
      mesh.instanceColor.needsUpdate = true;
      meshes.push({ mesh, list });
      scene.add(mesh);
    }
    update();
  }

  let mat = null;
  function flatMat() {
    if (!mat) mat = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });
    return mat;
  }

  function update() {
    for (const { mesh, list } of meshes) {
      let dirty = false;
      for (let i = 0; i < list.length; i++) {
        const { proxy, body } = list[i];
        if (body.sleepState === 2 && proxy.userData.done) continue;
        proxy.updateMatrix();
        mesh.setMatrixAt(i, proxy.matrix);
        proxy.userData.done = true;
        dirty = true;
      }
      if (dirty) mesh.instanceMatrix.needsUpdate = true;
    }
  }

  const count = () => Object.values(items).reduce((n, l) => n + l.length, 0);
  return { add, build, update, count, types };
}
