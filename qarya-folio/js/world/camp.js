import * as THREE from 'three';
import { palmGeometry } from './nature/plants.js';
import { swayMaterial } from './nature/util.js';

// مخيّم البداية: the little camp around the spawn point, which is all you see
// on the start island. Two palms, a lantern post, a rug with cushions and a
// signpost pointing up the path to the village gate. It all sits to the sides
// so the camel's way north stays clear.

export function createCamp(ctx) {
  const { scene, P, Builder, physics, heightAt, LAYOUT } = ctx;
  const { x: sx, z: sz } = LAYOUT.spawn;
  const y0 = (x, z) => heightAt(sx + x, sz + z);
  const b = new Builder();

  // Palms (shared swaying material from the nature module).
  const sway = swayMaterial(); // { material, depth }
  for (const [x, z, v, ry] of [[-4.6, 1.6, 0, 2.2], [-5.4, -1.8, 2, 0.4], [4.9, 2.6, 1, -2.4]]) {
    const palm = palmGeometry(P, v);
    const m = new THREE.Mesh(palm.geometry, sway.material);
    m.customDepthMaterial = sway.depth;
    m.position.set(sx + x, y0(x, z) - 0.05, sz + z);
    m.rotation.y = ry;
    m.castShadow = true;
    m.receiveShadow = true;
    scene.add(m);
    physics.addCylinder({ radius: 0.4, height: 4, position: [sx + x, y0(x, z) + 2, sz + z] });
  }

  // Rug with cushions and a coffee pot, south-west of the camel.
  const rx = -2.6, rz = 4.2, ry = y0(rx, rz);
  const stripes = [P.crimson, P.saffron, P.indigo, P.saffron, P.crimson];
  stripes.forEach((c, i) => b.box([2.6, 0.04, 0.36], c, { position: [sx + rx, ry + 0.03, sz + rz - 0.72 + i * 0.36] }));
  b.box([2.8, 0.03, 1.95], P.cream, { position: [sx + rx, ry + 0.015, sz + rz] });
  for (const [cx, cz, c] of [[-0.9, -0.55, P.red], [0.2, -0.62, P.teal], [1.0, 0.5, P.orange]]) {
    b.box([0.62, 0.26, 0.42], c, { position: [sx + rx + cx, ry + 0.17, sz + rz + cz], rotation: [0, cx * 0.4, 0] });
  }
  b.cylinder(0.12, 0.17, 0.3, P.brass, { position: [sx + rx + 0.3, ry + 0.2, sz + rz + 0.35] }, 7);
  b.add(new THREE.ConeGeometry(0.12, 0.2, 7), P.brass, { position: [sx + rx + 0.3, ry + 0.45, sz + rz + 0.35] });
  b.cylinder(0.02, 0.04, 0.26, P.brass, { position: [sx + rx + 0.45, ry + 0.32, sz + rz + 0.35], rotation: [0, 0, -0.9] }, 4);

  // Clay pots near the palms.
  for (const [x, z, s] of [[-3.7, -0.4, 1], [-3.3, 0.3, 0.75], [4.2, 0.9, 0.9]]) {
    const y = y0(x, z);
    b.sphere(0.36 * s, P.mud, { position: [sx + x, y + 0.34 * s, sz + z], scale: [1, 1.1, 1] }, 1);
    b.cylinder(0.14 * s, 0.2 * s, 0.18 * s, P.mudDark, { position: [sx + x, y + 0.76 * s, sz + z] }, 7);
  }

  // Signpost: an arrow board pointing north to the village.
  const px = 2.7, pz = -1.2, py = y0(px, pz);
  b.cylinder(0.09, 0.11, 2.6, P.wood, { position: [sx + px, py + 1.3, sz + pz] }, 6);
  b.box([0.22, 0.16, 0.22], P.woodLight, { position: [sx + px, py + 2.65, sz + pz] });
  physics.addCylinder({ radius: 0.2, height: 2.6, position: [sx + px, py + 1.3, sz + pz] });

  // Lantern post, east of the rug.
  const lx = 3.3, lz = 4.4, ly = y0(lx, lz);
  b.cylinder(0.08, 0.1, 2.3, P.ink, { position: [sx + lx, ly + 1.15, sz + lz] }, 6);
  b.box([0.7, 0.06, 0.06], P.ink, { position: [sx + lx - 0.3, ly + 2.25, sz + lz] });
  b.add(new THREE.ConeGeometry(0.26, 0.22, 6), P.brass, { position: [sx + lx - 0.6, ly + 1.95, sz + lz] });
  b.cylinder(0.18, 0.18, 0.06, P.brass, { position: [sx + lx - 0.6, ly + 1.45, sz + lz] }, 6);
  physics.addCylinder({ radius: 0.18, height: 2.3, position: [sx + lx, ly + 1.15, sz + lz] });

  const mesh = b.build();
  scene.add(mesh);

  // Glowing lantern glass.
  const glass = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.13, 0.36, 6), new THREE.MeshBasicMaterial({ color: '#ffd58a' }));
  glass.position.set(sx + lx - 0.6, ly + 1.66, sz + lz);
  scene.add(glass);

  // Sign board with Arabic text.
  const c = document.createElement('canvas');
  c.width = 512; c.height = 160;
  const g = c.getContext('2d');
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const drawSign = () => {
    g.fillStyle = '#a8703f'; g.fillRect(0, 0, 512, 160);
    g.fillStyle = '#8a5a34'; for (let i = 0; i < 5; i++) g.fillRect(0, 18 + i * 30, 512, 4);
    g.strokeStyle = '#5c3a20'; g.lineWidth = 10; g.strokeRect(5, 5, 502, 150);
    g.fillStyle = '#fbf0dc'; g.direction = 'rtl'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = '700 70px "Reem Kufi", "Cairo", sans-serif';
    g.fillText('↑ القرية', 256, 84);
    tex.needsUpdate = true;
  };
  drawSign();
  document.fonts?.load('700 70px "Reem Kufi"', 'القرية').then(drawSign, () => {});
  const board = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.53, 0.08), [
    ctx.mat(P.woodLight), ctx.mat(P.woodLight), ctx.mat(P.woodLight), ctx.mat(P.woodLight),
    new THREE.MeshLambertMaterial({ map: tex }), ctx.mat(P.woodLight),
  ]);
  board.position.set(sx + px, py + 2.15, sz + pz);
  board.rotation.y = -0.35;
  board.castShadow = true;
  scene.add(board);

  return { update() {} };
}
