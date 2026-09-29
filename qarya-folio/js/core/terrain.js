import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { P } from './palette.js';

// الأرض: one height function drives the ground mesh, the physics heightfield
// and every module that needs to sit something on the sand.
//
// Layout (metres, +X east, -Z north):
//   village plateau around the origin, flat;
//   an oasis pond to the north-east, sunk into the sand;
//   rolling dunes outside the village, growing into a wall of big dunes at
//   the edge of the playable area.

export const LAYOUT = {
  size: 260, // side of the terrain square
  village: { x: 0, z: 0, r: 40 },
  oasis: { x: 36, z: -34, r: 12, water: -0.9 },
  bounds: 100, // playable radius; the dunes rise steeply past it
  spawn: { x: 0, z: 30, heading: Math.PI }, // facing north, toward the village
};

// Small seeded value noise.
function hash(x, z) {
  const s = Math.sin(x * 127.1 + z * 311.7) * 43758.5453;
  return s - Math.floor(s);
}
function vnoise(x, z) {
  const xi = Math.floor(x), zi = Math.floor(z);
  const xf = x - xi, zf = z - zi;
  const u = xf * xf * (3 - 2 * xf), v = zf * zf * (3 - 2 * zf);
  const a = hash(xi, zi), b = hash(xi + 1, zi), c = hash(xi, zi + 1), d = hash(xi + 1, zi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
export function noise(x, z) {
  return vnoise(x, z) * 0.6 + vnoise(x * 2.1 + 7, z * 2.1 - 3) * 0.3 + vnoise(x * 4.3, z * 4.3) * 0.1;
}
const smooth = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

export function heightAt(x, z) {
  const { village, oasis, bounds } = LAYOUT;
  const dv = Math.hypot(x - village.x, z - village.z);

  // Dunes: ridges that run roughly north-west to south-east, softened by noise.
  const ridge = Math.abs(Math.sin((x * 0.7 + z * 0.45) * 0.09 + noise(x * 0.03, z * 0.03) * 3));
  let dunes = (1 - ridge) * 3.2 + noise(x * 0.05, z * 0.05) * 2.5;
  dunes *= smooth(village.r - 4, village.r + 22, dv);

  // Gentle ripple everywhere so the plateau isn't dead flat.
  let h = dunes + (noise(x * 0.25, z * 0.25) - 0.5) * 0.12;

  // The rim: big dunes that close the world.
  h += Math.pow(smooth(bounds - 8, bounds + 30, dv), 1.4) * 22;

  // Oasis bowl.
  const doa = Math.hypot(x - oasis.x, z - oasis.z);
  const bowl = 1 - smooth(oasis.r * 0.35, oasis.r * 1.5, doa);
  h = h * (1 - bowl) + (oasis.water - 1.4) * bowl;

  return h;
}

export function normalAt(x, z, out = new THREE.Vector3()) {
  const e = 0.35;
  const hx = heightAt(x + e, z) - heightAt(x - e, z);
  const hz = heightAt(x, z + e) - heightAt(x, z - e);
  return out.set(-hx, 2 * e, -hz).normalize();
}

// Ground mesh (faceted, vertex-coloured) + physics heightfield.
export function createTerrain({ scene, world, material, mobile }) {
  const { size } = LAYOUT;
  const seg = mobile ? 110 : 170;
  const geo = new THREE.PlaneGeometry(size, size, seg, seg).rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    pos.setY(i, heightAt(pos.getX(i), pos.getZ(i)));
  }
  const flat = geo.toNonIndexed();
  flat.computeVertexNormals();

  // Colour each triangle by its height and slope.
  const p = flat.attributes.position;
  const colors = new Float32Array(p.count * 3);
  const cLight = new THREE.Color(P.sandLight), cSand = new THREE.Color(P.sand);
  const cDeep = new THREE.Color(P.sandDeep), cWet = new THREE.Color('#9c7a4e');
  const c = new THREE.Color();
  const a = new THREE.Vector3(), b = new THREE.Vector3(), d = new THREE.Vector3(), n = new THREE.Vector3();
  for (let i = 0; i < p.count; i += 3) {
    a.fromBufferAttribute(p, i); b.fromBufferAttribute(p, i + 1); d.fromBufferAttribute(p, i + 2);
    n.subVectors(d, b).cross(a.clone().sub(b)).normalize();
    const cx = (a.x + b.x + d.x) / 3, cy = (a.y + b.y + d.y) / 3, cz = (a.z + b.z + d.z) / 3;
    const slope = 1 - Math.abs(n.y);
    // Sun comes from the south-west: faces tilted that way are lighter.
    const facing = n.x * -0.5 + n.z * 0.6;
    c.copy(cSand).lerp(cLight, Math.min(1, Math.max(0, 0.35 + facing * 1.5 + cy * 0.03)));
    c.lerp(cDeep, Math.min(0.6, slope * 1.4));
    const doa = Math.hypot(cx - LAYOUT.oasis.x, cz - LAYOUT.oasis.z);
    if (doa < LAYOUT.oasis.r * 1.45) c.lerp(cWet, (1 - doa / (LAYOUT.oasis.r * 1.45)) * 0.8);
    const jitter = (hash(Math.round(cx * 3), Math.round(cz * 3)) - 0.5) * 0.04;
    c.offsetHSL(0, 0, jitter);
    for (let k = 0; k < 3; k++) {
      colors[(i + k) * 3] = c.r; colors[(i + k) * 3 + 1] = c.g; colors[(i + k) * 3 + 2] = c.b;
    }
  }
  flat.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const mesh = new THREE.Mesh(flat, new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }));
  mesh.receiveShadow = true;
  mesh.name = 'terrain';
  scene.add(mesh);

  // Physics heightfield. Coarser than the mesh: collisions don't need facets.
  const es = 2;
  const n2 = Math.round(size / es) + 1;
  const data = [];
  for (let i = 0; i < n2; i++) {
    const row = [];
    for (let j = 0; j < n2; j++) row.push(heightAt(-size / 2 + i * es, size / 2 - j * es));
    data.push(row);
  }
  const shape = new CANNON.Heightfield(data, { elementSize: es });
  const body = new CANNON.Body({ mass: 0, material });
  body.addShape(shape);
  body.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
  body.position.set(-size / 2, 0, size / 2);
  world.addBody(body);

  return { mesh, body };
}
