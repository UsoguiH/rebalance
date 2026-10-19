// Chibi soldiers and princesses. Every limb is built from primitives, then baked into
// one vertex-coloured mesh (plus its ink hull) so a full 32-player battle stays cheap.
// Animation is procedural: walk cycles, swings, charges, carrying, swimming and deaths.
import * as THREE from 'three';
import { m, gradient, inkMesh, mergeGeometries } from './toon.js';
import { faceTex, shadowTex, planksTex } from './tex.js';
import { TEAM_COLORS } from './castle.js';
import { rng, TAU, lerp, clamp } from './util.js';

const B = (w, h, d) => new THREE.BoxGeometry(w, h, d);
const CY = (rt, rb, h, s = 10) => new THREE.CylinderGeometry(rt, rb, h, s);
const SP = (r, w = 10, h = 8) => new THREE.SphereGeometry(r, w, h);
const GOLD = '#f5c63c', STEEL = '#cfd5de', WOOD = '#9a5a26', SKIN = '#f6d3b9';

// rounded cube: a box pulled part way toward a sphere
function roundBox(w, h, d, k = 0.42, seg = 5) {
  const g = new THREE.BoxGeometry(1, 1, 1, seg, seg, seg);
  const p = g.attributes.position, v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const n = v.clone().normalize().multiplyScalar(0.62);
    v.lerp(n, k);
    p.setXYZ(i, v.x * w, v.y * h, v.z * d);
  }
  g.computeVertexNormals();
  return g;
}

// Merge every untextured mesh under `group` into one vertex-coloured mesh.
function bake(group, mat) {
  group.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(group.matrixWorld).invert();
  const geos = [], remove = [];
  group.traverse((o) => {
    if (!o.isMesh || o === group || o.userData.keep || o.userData.isOutline || o.material.map || !o.material.color) return;
    if (o.parent && o.parent.userData.keep) return;
    let g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
    for (const n of Object.keys(g.attributes)) if (n !== 'position' && n !== 'normal') g.deleteAttribute(n);
    const mtx = new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld);
    g.applyMatrix4(mtx);
    const c = o.material.color;
    const cols = new Float32Array(g.attributes.position.count * 3);
    for (let i = 0; i < cols.length; i += 3) {
      cols[i] = c.r;
      cols[i + 1] = c.g;
      cols[i + 2] = c.b;
    }
    g.setAttribute('color', new THREE.BufferAttribute(cols, 3));
    geos.push(g);
    remove.push(o);
  });
  for (const o of remove) o.parent.remove(o);
  if (!geos.length) return null;
  const merged = mergeGeometries(geos);
  const mesh = new THREE.Mesh(merged, mat);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  group.add(mesh);
  inkMesh(mesh, 0.034);
  return mesh;
}

// ---------------------------------------------------------------- appearance tables
export const CLASS_INFO = {
  villager: { hearts: 2, speed: 6.4, label: 'Villager' },
  worker: { hearts: 4, speed: 5.9, label: 'Worker' },
  warrior: { hearts: 6, speed: 5.2, label: 'Warrior' },
  ranger: { hearts: 5, speed: 5.5, label: 'Ranger' },
  mage: { hearts: 4, speed: 5.5, label: 'Mage' },
  priest: { hearts: 4, speed: 5.5, label: 'Priest' },
};
const HAIR = ['#f2c84a', '#8a4a1c', '#3a2414', '#d9772a', '#f0dc8a', '#5a3018'];
const SKINS = ['#f6d3b9', '#f3c9a6', '#e8b48e', '#c98d64'];
const IRIS = ['#3fb36a', '#3a8fe0', '#47b06a', '#2f9e8f', '#7a5a2a'];

// ---------------------------------------------------------------- hats
function hat(cls, col, up) {
  const g = new THREE.Group();
  const main = col.main, dark = col.dark;
  switch (cls) {
    case 'worker': {
      // knitted stocking cap with a floppy tip
      g.add(m(roundBox(1.02, 0.42, 0.98, 0.5), main, 0, 0.2, -0.02));
      g.add(m(new THREE.ConeGeometry(0.36, 0.55, 10), main, 0.02, 0.58, 0.05, { rx: 0.35 }));
      g.add(m(CY(0.52, 0.52, 0.14, 14), dark, 0, 0.02, -0.02, { s: [1, 1, 0.95] }));
      break;
    }
    case 'warrior': {
      // full helm with a face window, crest ridge and curling horns
      // dome over the top, a back plate and cheek guards leave a window for the face
      g.add(m(roundBox(1.16, 0.62, 1.1, 0.5), main, 0, 0.3, -0.02));
      g.add(m(roundBox(1.12, 0.95, 0.55, 0.5), main, 0, -0.1, -0.28));
      for (const s of [-1, 1]) g.add(m(roundBox(0.22, 0.75, 0.62, 0.4), main, s * 0.5, -0.18, 0.12));
      g.add(m(B(0.84, 0.1, 0.12), GOLD, 0, 0.05, 0.53));
      for (const s of [-1, 1]) g.add(m(B(0.1, 0.6, 0.12), GOLD, s * 0.41, -0.22, 0.43));
      g.add(m(B(0.16, 0.34, 0.9), main, 0, 0.66, -0.05));
      for (const s of [-1, 1]) {
        const horn = new THREE.Group();
        horn.position.set(s * 0.52, 0.18, -0.05);
        horn.add(m(new THREE.ConeGeometry(0.16, 0.5, 8), main, s * 0.12, 0.12, 0, { rz: -s * 1.0 }));
        horn.add(m(new THREE.ConeGeometry(0.11, 0.38, 8), main, s * 0.33, 0.4, 0, { rz: -s * 0.15 }));
        g.add(horn);
      }
      if (up) g.add(m(new THREE.ConeGeometry(0.1, 0.5, 6), GOLD, 0, 0.82, 0));
      break;
    }
    case 'ranger': {
      // pointed cap with a curled brim and a long feather
      g.add(m(roundBox(1.05, 0.5, 1.0, 0.45), main, 0, 0.2, -0.04));
      g.add(m(new THREE.ConeGeometry(0.45, 0.6, 10), main, 0, 0.6, -0.15, { rx: -0.5, s: [1, 1, 0.75] }));
      g.add(m(CY(0.66, 0.7, 0.08, 16), dark, 0, 0.0, 0.02, { s: [1, 1, 1.05], rx: 0.08 }));
      g.add(m(B(0.08, 0.75, 0.16), '#f8d64a', 0.42, 0.55, -0.25, { rz: -0.7, rx: 0.3 }));
      if (up) g.add(m(CY(0.72, 0.75, 0.06, 16), '#fff3c0', 0, 0.06, 0.02));
      break;
    }
    case 'mage': {
      g.add(m(CY(0.58, 0.6, 0.18, 16), '#f6d44a', 0, 0.04, 0));
      if (up) g.add(m(CY(0.95, 0.95, 0.06, 18), main, 0, -0.02, 0.05));
      const cone = new THREE.ConeGeometry(0.56, 1.35, 14, 4);
      const p = cone.attributes.position;
      for (let i = 0; i < p.count; i++) {
        const y = p.getY(i) + 0.675;
        p.setZ(i, p.getZ(i) - y * y * 0.18);
      }
      cone.computeVertexNormals();
      g.add(m(cone, main, 0, 0.78, 0));
      break;
    }
    case 'priest': {
      // mitre: white with a coloured cross and trim (dark priests wear black)
      const base = up ? '#2a2030' : '#fbfbf6';
      const trim = up ? '#7a3cc8' : main;
      const mit = new THREE.ConeGeometry(0.55, 1.15, 4, 1);
      mit.rotateY(Math.PI / 4);
      mit.scale(1, 1, 0.75);
      g.add(m(mit, base, 0, 0.6, 0));
      g.add(m(CY(0.55, 0.56, 0.18, 14), trim, 0, 0.06, 0, { s: [1, 1, 0.92] }));
      g.add(m(B(0.13, 0.5, 0.05), trim, 0, 0.5, 0.35, { rx: -0.25 }));
      g.add(m(B(0.38, 0.12, 0.05), trim, 0, 0.6, 0.33, { rx: -0.25 }));
      break;
    }
  }
  return g;
}

function hair(style, colr) {
  const g = new THREE.Group();
  // bowl cut over the top, back and sides of the head
  const bowl = roundBox(1.06, 0.5, 1.0, 0.5);
  g.add(m(bowl, colr, 0, 0.3, -0.06));
  g.add(m(roundBox(1.04, 0.7, 0.5, 0.5), colr, 0, 0.0, -0.24));
  for (const s of [-1, 1]) g.add(m(B(0.12, 0.55, 0.5), colr, s * 0.49, 0.02, -0.02));
  // fringe spikes over the forehead
  for (let i = 0; i < 5; i++) {
    const x = -0.36 + i * 0.18;
    g.add(m(new THREE.ConeGeometry(0.12, 0.26, 4), colr, x, 0.22, 0.44, { rx: Math.PI * 0.9, rz: (i - 2) * 0.14 }));
  }
  if (style === 1) g.add(m(SP(0.18, 8, 6), colr, 0, 0.55, -0.2)); // tuft
  if (style === 2) for (let i = 0; i < 3; i++) g.add(m(new THREE.ConeGeometry(0.12, 0.4, 5), colr, -0.15 + i * 0.15, 0.55, -0.1, { rz: (i - 1) * 0.4 }));
  return g;
}

// ---------------------------------------------------------------- weapons
export function weapon(kind, col) {
  const g = new THREE.Group();
  switch (kind) {
    case 'axe':
      g.add(m(CY(0.05, 0.05, 1.0, 6), WOOD, 0, 0.35, 0));
      g.add(m(B(0.08, 0.36, 0.38), STEEL, 0, 0.72, 0.18));
      g.add(m(B(0.085, 0.4, 0.06), '#f0f3f8', 0, 0.72, 0.38));
      break;
    case 'bomb':
      g.add(m(SP(0.24, 12, 10), '#2a2a32', 0, 0.12, 0.1));
      g.add(m(CY(0.06, 0.07, 0.1, 8), '#6b6f78', 0, 0.38, 0.1));
      g.add(m(CY(0.015, 0.015, 0.14, 4), '#c8a060', 0.02, 0.48, 0.1));
      break;
    case 'sword':
      g.add(m(B(0.09, 0.95, 0.24), STEEL, 0, 0.72, 0));
      g.add(m(new THREE.ConeGeometry(0.12, 0.22, 4), STEEL, 0, 1.28, 0, { ry: Math.PI / 4, s: [0.6, 1, 1.4] }));
      g.add(m(B(0.14, 0.12, 0.6), GOLD, 0, 0.22, 0));
      g.add(m(CY(0.05, 0.05, 0.25, 6), '#7a3a18', 0, 0.06, 0));
      g.add(m(SP(0.07, 6, 4), GOLD, 0, -0.08, 0));
      break;
    case 'glaive':
      g.add(m(CY(0.05, 0.05, 2.0, 6), '#8a3a1c', 0, 0.55, 0));
      g.add(m(B(0.08, 0.7, 0.32), STEEL, 0, 1.75, 0.12, { rx: -0.15 }));
      g.add(m(B(0.09, 0.45, 0.12), '#f0f3f8', 0, 1.75, 0.3, { rx: -0.15 }));
      g.add(m(B(0.14, 0.12, 0.36), GOLD, 0, 1.4, 0.05));
      g.add(m(SP(0.08, 6, 4), '#e33a2a', 0, 1.42, 0.25));
      break;
    case 'bow': {
      const arc = new THREE.TorusGeometry(0.55, 0.045, 5, 16, Math.PI * 0.95);
      g.add(m(arc, '#c8762e', 0, 0, 0, { rz: -Math.PI * 0.475 + Math.PI / 2, ry: Math.PI / 2 }));
      g.add(m(CY(0.01, 0.01, 1.08, 3), '#fff6dc', 0, 0, -0.06, { noInk: true, ry: 0 }));
      break;
    }
    case 'blunderbuss':
      g.add(m(B(0.14, 0.18, 0.7), '#8a4a1c', 0, 0, -0.1));
      g.add(m(CY(0.08, 0.17, 0.75, 10), '#e0b24a', 0, 0.05, 0.55, { rx: Math.PI / 2 }));
      g.add(m(CY(0.19, 0.19, 0.08, 10), '#f5d36a', 0, 0.05, 0.92, { rx: Math.PI / 2 }));
      break;
    case 'staffFire':
    case 'staffIce':
      g.add(m(CY(0.045, 0.06, 1.6, 6), '#8a4a1c', 0, 0.55, 0, { rz: 0.04 }));
      g.add(m(new THREE.TorusGeometry(0.12, 0.04, 5, 10), '#8a4a1c', 0.02, 1.38, 0, { ry: Math.PI / 2 }));
      if (kind === 'staffIce') g.add(m(new THREE.OctahedronGeometry(0.16), '#bfefff', 0.02, 1.55, 0, { s: [0.7, 1.3, 0.7] }));
      else g.add(m(SP(0.11, 8, 6), '#ffd23a', 0.02, 1.48, 0));
      break;
    case 'staffHoly':
    case 'staffDark': {
      const head = kind === 'staffHoly' ? col.main : '#8a3cd8';
      g.add(m(CY(0.045, 0.045, 1.55, 6), kind === 'staffHoly' ? '#e8e8e0' : '#3a3040', 0, 0.55, 0));
      if (kind === 'staffHoly') {
        for (const [x, y] of [[0, 0.28], [0, -0.28], [0.28, 0], [-0.28, 0]]) g.add(m(B(0.22, 0.22, 0.08), head, x, 1.55 + y, 0));
        g.add(m(SP(0.11, 8, 6), GOLD, 0, 1.55, 0.03));
      } else {
        g.add(m(new THREE.TorusGeometry(0.28, 0.05, 6, 5), head, 0, 1.6, 0));
        g.add(m(new THREE.OctahedronGeometry(0.12), '#d39aff', 0, 1.6, 0));
      }
      break;
    }
  }
  return g;
}
function shield(col) {
  const g = new THREE.Group();
  g.add(m(CY(0.42, 0.42, 0.1, 16), col.main, 0, 0, 0, { rx: Math.PI / 2 }));
  g.add(m(new THREE.TorusGeometry(0.42, 0.06, 6, 18), GOLD, 0, 0, 0));
  g.add(m(SP(0.12, 8, 6), GOLD, 0, 0, 0.05, { s: [1, 1, 0.6] }));
  g.add(m(CY(0.27, 0.27, 0.12, 14), col.light, 0, 0, 0.01, { rx: Math.PI / 2 }));
  return g;
}

// ---------------------------------------------------------------- character
export class CharModel {
  constructor(team, cls, opts = {}) {
    this.team = team;
    this.cls = cls;
    this.upgraded = !!opts.upgraded;
    this.alt = !!opts.alt; // using the upgraded weapon
    this.seed = opts.seed ?? 1;
    this.root = new THREE.Group();
    this.mat = new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: gradient([0.62, 0.86, 1.0]) });
    this.mat.emissive = new THREE.Color(0x000000);
    this.flash = 0;
    this.build();
    this.t = Math.random() * 10;
    this.anim = { run: 0, swing: -1, swingKind: 'chop', charge: 0, carry: 0, swim: 0, block: 0, dead: 0, sit: 0, hurt: 0, cast: 0, throwT: -1 };
  }

  build() {
    const R = rng(this.seed * 31 + 7);
    const col = TEAM_COLORS[this.team];
    const cls = this.cls;
    const skin = R.pick(SKINS), hairCol = R.pick(HAIR), iris = R.pick(IRIS);
    this.skin = skin;
    const root = this.root;
    while (root.children.length) root.remove(root.children[0]);
    const body = new THREE.Group();
    body.name = 'body';
    root.add(body);
    this.body = body;
    // shadow blob
    const shadow = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 1.2), new THREE.MeshBasicMaterial({ map: shadowTex(), transparent: true, depthWrite: false }));
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.03;
    shadow.renderOrder = 1;
    root.add(shadow);
    this.shadow = shadow;

    const robe = cls === 'mage' || cls === 'priest';
    const tunic = cls === 'priest' ? (this.upgraded && this.alt ? '#3a2a48' : '#fbfbf6') : col.main;
    const trim = cls === 'priest' ? (this.alt ? '#8a3cd8' : col.main) : cls === 'warrior' ? GOLD : '#f6d44a';
    // torso
    const torso = new THREE.Group();
    torso.position.y = 0.42;
    body.add(torso);
    if (robe) {
      torso.add(m(CY(0.26, 0.42, 0.62, 12), tunic, 0, 0.12, 0));
      torso.add(m(CY(0.43, 0.43, 0.08, 12), trim, 0, -0.17, 0));
      torso.add(m(B(0.12, 0.5, 0.05), trim, 0, 0.16, 0.33, { rx: -0.25 }));
      if (cls === 'priest') torso.add(m(CY(0.29, 0.3, 0.09, 12), GOLD, 0, 0.22, 0));
    } else {
      torso.add(m(roundBox(0.56, 0.42, 0.4, 0.35), tunic, 0, 0.17, 0));
      torso.add(m(CY(0.3, 0.32, 0.08, 12), trim, 0, 0.02, 0, { s: [1, 1, 0.72] }));
      if (cls === 'worker') {
        torso.add(m(B(0.3, 0.24, 0.05), '#f6d44a', 0, 0.2, 0.2));
        torso.add(m(B(0.5, 0.06, 0.42), '#8a8f99', 0, 0.36, 0));
      }
      if (cls === 'warrior') {
        for (const s of [-1, 1]) torso.add(m(SP(0.17, 8, 6), col.main, s * 0.32, 0.33, 0, { s: [1, 0.7, 1] }));
        torso.add(m(B(0.2, 0.2, 0.05), GOLD, 0, 0.2, 0.2));
      }
      if (cls === 'ranger') {
        // quiver on the back
        torso.add(m(CY(0.1, 0.1, 0.5, 8), '#8a4a1c', 0.12, 0.3, -0.24, { rz: -0.4 }));
        for (let i = 0; i < 3; i++) torso.add(m(B(0.04, 0.12, 0.08), '#fbfbf6', 0.2 + i * 0.03, 0.58, -0.24 + (i - 1) * 0.04, { rz: -0.4, noInk: true }));
      }
      if (cls === 'villager') torso.add(m(B(0.1, 0.1, 0.05), GOLD, 0, 0.03, 0.2));
    }
    // legs
    const legs = [];
    for (const s of [-1, 1]) {
      const leg = new THREE.Group();
      leg.position.set(s * 0.13, 0.32, 0);
      leg.add(m(CY(0.09, 0.08, 0.2, 8), robe ? tunic : col.dark, 0, -0.1, 0));
      leg.add(m(roundBox(0.18, 0.13, 0.27, 0.4, 3), cls === 'villager' ? '#c43a22' : col.dark, 0, -0.25, 0.04));
      body.add(leg);
      legs.push(leg);
    }
    this.legs = legs;
    // arms
    const arms = [];
    for (const s of [-1, 1]) {
      const arm = new THREE.Group();
      arm.position.set(s * 0.33, 0.78, 0);
      arm.add(m(CY(0.075, 0.07, 0.26, 8), cls === 'worker' ? '#a8adb8' : tunic, 0, -0.12, 0));
      const hand = new THREE.Group();
      hand.position.y = -0.3;
      hand.add(m(roundBox(0.17, 0.17, 0.17, 0.5, 3), cls === 'warrior' || cls === 'ranger' ? col.dark : skin, 0, 0, 0));
      arm.add(hand);
      arm.userData.hand = hand;
      body.add(arm);
      arms.push(arm);
    }
    this.arms = arms;
    // head
    const head = new THREE.Group();
    head.position.set(0, 1.15, 0.02);
    body.add(head);
    this.head = head;
    const headGeo = roundBox(0.98, 0.86, 0.86, 0.38);
    const skinMat = new THREE.MeshToonMaterial({ color: skin, gradientMap: gradient([0.62, 0.86, 1.0]) });
    this.skinMat = skinMat;
    const headMesh = new THREE.Mesh(headGeo, skinMat);
    headMesh.userData.keep = true;
    headMesh.castShadow = true;
    head.add(headMesh);
    inkMesh(headMesh, 0.034);
    // face decal sitting just in front of the head
    this.faceMats = {};
    for (const mood of ['angry', 'hurt', 'dead', 'shout', 'happy']) this.faceMats[mood] = new THREE.MeshBasicMaterial({ map: faceTex(skin, iris, mood), transparent: false });
    const faceGeo = new THREE.PlaneGeometry(0.8, 0.72, 6, 6);
    const fp = faceGeo.attributes.position;
    for (let i = 0; i < fp.count; i++) {
      const x = fp.getX(i), y = fp.getY(i);
      fp.setZ(i, -(x * x) * 0.32 - (y * y) * 0.22);
    }
    const face = new THREE.Mesh(faceGeo, this.faceMats.angry);
    face.position.set(0, -0.06, 0.478);
    face.userData.keep = true;
    head.add(face);
    this.face = face;
    for (const s of [-1, 1]) head.add(m(SP(0.12, 8, 6), skin, s * 0.5, -0.06, 0, { s: [0.6, 1, 1] }));
    // hair and hat
    if (cls === 'villager' || cls === 'worker' || cls === 'ranger' || cls === 'mage') {
      const h = hair(R.int(0, 2), hairCol);
      if (cls !== 'villager') h.scale.set(1, 0.55, 1);
      head.add(h);
    }
    if (cls !== 'villager') {
      const ht = hat(cls, col, this.upgraded);
      ht.position.y = cls === 'warrior' ? 0.02 : cls === 'priest' || cls === 'mage' ? 0.36 : 0.3;
      head.add(ht);
    }
    if (cls === 'mage' || cls === 'priest') {
      // beards for the old casters
      if (R() < 0.6) head.add(m(new THREE.ConeGeometry(0.25, 0.45, 8), cls === 'priest' ? '#e8e2d8' : hairCol, 0, -0.5, 0.33, { rx: Math.PI }));
    }
    // weapons
    const [wR, wL] = this.weaponKinds();
    const right = arms[1].userData.hand, left = arms[0].userData.hand;
    if (wR) {
      const w = weapon(wR, col);
      const hold = { axe: 1.25, sword: 1.15, glaive: 0.35, staffFire: 0.2, staffIce: 0.2, staffHoly: 0.2, staffDark: 0.2 };
      if (wR === 'bomb') w.position.set(0, -0.05, 0.05);
      else if (wR === 'blunderbuss') w.position.set(0, -0.02, 0.1);
      else w.rotation.x = hold[wR] ?? Math.PI / 2;
      if (wR.startsWith('staff') || wR === 'glaive') w.position.y = -0.5;
      right.add(w);
      this.weaponR = w;
    } else this.weaponR = null;
    if (wL === 'shield') {
      const s = shield(col);
      s.position.set(-0.08, 0, 0.12);
      s.rotation.y = -0.2;
      left.add(s);
      this.shieldMesh = s;
    } else if (wL === 'bow') {
      const b = weapon('bow', col);
      b.position.set(0, 0, 0.1);
      left.add(b);
    }
    // bake each moving part into one mesh
    bake(torso, this.mat);
    for (const l of legs) bake(l, this.mat);
    for (const a of arms) bake(a, this.mat);
    bake(head, this.mat);
    if (this.weaponR) bake(this.weaponR, this.mat);
  }

  weaponKinds() {
    const alt = this.upgraded && this.alt;
    switch (this.cls) {
      case 'worker': return [alt ? 'bomb' : 'axe', null];
      case 'warrior': return alt ? ['glaive', null] : ['sword', 'shield'];
      case 'ranger': return alt ? ['blunderbuss', null] : [null, 'bow'];
      case 'mage': return [alt ? 'staffIce' : 'staffFire', null];
      case 'priest': return [alt ? 'staffDark' : 'staffHoly', null];
      default: return [null, null];
    }
  }

  setMood(mood) {
    if (this.face.material !== this.faceMats[mood]) this.face.material = this.faceMats[mood];
  }

  hit() {
    this.flash = 1;
    this.anim.hurt = 1;
  }

  // Procedural animation. state: { speed, dt, moving }
  update(dt, st) {
    const a = this.anim;
    this.t += dt;
    const t = this.t;
    const run = (a.run = lerp(a.run, st.moving ? 1 : 0, 1 - Math.exp(-dt * 12)));
    const freq = 2.1 * (st.speedMul ?? 1);
    const ph = t * TAU * freq;
    const body = this.body, [legL, legR] = this.legs, [armL, armR] = this.arms;
    // reset
    body.position.set(0, 0, 0);
    body.rotation.set(0, 0, 0);
    this.head.rotation.set(-0.12, 0, 0);
    armL.rotation.set(0, 0, 0);
    armR.rotation.set(0, 0, 0);
    legL.rotation.set(0, 0, 0);
    legR.rotation.set(0, 0, 0);

    if (a.dead > 0) {
      // topple backwards, then lie still
      const k = clamp(a.dead * 3, 0, 1);
      const e = 1 - Math.pow(1 - k, 3);
      body.rotation.x = -e * (Math.PI / 2 - 0.08);
      body.position.y = 0.25 * Math.sin(k * Math.PI) * (1 - k) + e * 0.42;
      body.position.z = -e * 0.15;
      armL.rotation.z = e * 1.2;
      armR.rotation.z = -e * 1.2;
      legL.rotation.x = e * 0.3;
      legR.rotation.x = -e * 0.2;
      this.setMood('dead');
      this.shadow.scale.setScalar(1.4);
      this.updateFlash(dt);
      return;
    }

    // run cycle
    const swing = Math.sin(ph) * 0.9 * run;
    legL.rotation.x = swing;
    legR.rotation.x = -swing;
    armL.rotation.x = -swing * 0.8;
    armR.rotation.x = swing * 0.8;
    body.position.y = Math.abs(Math.sin(ph)) * 0.09 * run + Math.sin(t * 2.2) * 0.015 * (1 - run);
    body.rotation.x = 0.12 * run;
    this.head.rotation.z = Math.sin(ph) * 0.05 * run;
    // idle sway of arms
    armL.rotation.z = 0.12 + Math.sin(t * 2) * 0.03;
    armR.rotation.z = -0.12 - Math.sin(t * 2) * 0.03;

    if (a.swim > 0) {
      body.position.y -= 0.85 * a.swim;
      armL.rotation.x = -1.6 + Math.sin(t * 7) * 0.8;
      armR.rotation.x = -1.6 - Math.sin(t * 7) * 0.8;
      body.rotation.x = 0.35;
    }

    if (a.sit > 0) {
      body.position.y = -0.22 * a.sit;
      legL.rotation.x = -1.4 * a.sit;
      legR.rotation.x = -1.4 * a.sit;
    }

    if (a.carry > 0) {
      // arms raised to hold something over the head
      const k = a.carry;
      armL.rotation.x = lerp(armL.rotation.x, -2.9, k);
      armR.rotation.x = lerp(armR.rotation.x, -2.9, k);
      armL.rotation.z = lerp(armL.rotation.z, -0.35, k);
      armR.rotation.z = lerp(armR.rotation.z, 0.35, k);
    }

    if (a.block > 0) {
      armL.rotation.x = -1.4 * a.block;
      armL.rotation.y = 0.6 * a.block;
    }

    // charging: weapon drawn back and trembling
    if (a.charge > 0) {
      const c = a.charge, shake = Math.sin(t * 60) * 0.04 * c;
      if (this.cls === 'ranger' && !(this.upgraded && this.alt)) {
        armL.rotation.x = -1.5;
        armR.rotation.x = -1.5;
        armR.rotation.y = 0.5 + c * 0.4;
      } else if (this.cls === 'mage' || this.cls === 'priest') {
        armR.rotation.x = -2.6 + shake;
        armL.rotation.x = -1.2;
      } else {
        armR.rotation.x = -2.6 - c * 0.3 + shake;
        armR.rotation.z = -0.3;
        body.rotation.y = -0.4 * c;
      }
    }

    // attack swing (0..1)
    if (a.swing >= 0) {
      const s = a.swing;
      const kind = a.swingKind;
      if (kind === 'spin') {
        body.rotation.y = s * TAU * 1.0;
        armR.rotation.x = -1.6;
        armR.rotation.z = -1.2;
      } else if (kind === 'slap') {
        const k = s < 0.3 ? s / 0.3 : 1 - (s - 0.3) / 0.7;
        armR.rotation.x = -1.4;
        armR.rotation.y = -1.6 + k * 2.4;
        body.rotation.y = 0.4 - k * 0.8;
      } else if (kind === 'shoot') {
        armL.rotation.x = -1.5;
        armR.rotation.x = -1.5;
        armR.rotation.y = s < 0.2 ? 0.8 : 0.8 - (s - 0.2) * 1.0;
        body.position.z = -Math.sin(s * Math.PI) * 0.06;
      } else if (kind === 'gun') {
        armR.rotation.x = -1.55 - Math.sin(s * Math.PI) * 0.6;
        armL.rotation.x = -1.4;
        body.position.z = -Math.sin(s * Math.PI) * 0.15;
      } else if (kind === 'cast') {
        armR.rotation.x = -2.8 + Math.sin(s * Math.PI) * 1.8;
        body.rotation.x = 0.1 + Math.sin(s * Math.PI) * 0.15;
      } else if (kind === 'throw') {
        armR.rotation.x = s < 0.35 ? -1.0 - (s / 0.35) * 2.0 : -3.0 + ((s - 0.35) / 0.65) * 3.2;
      } else if (kind === 'thrust') {
        const k = Math.sin(s * Math.PI);
        armR.rotation.x = -1.4 - k * 0.2;
        body.position.z = k * 0.3;
        body.rotation.x = 0.2 * k;
      } else {
        // overhead chop / slash
        const wind = 0.28;
        const k = s < wind ? s / wind : 1 - (s - wind) / (1 - wind);
        const down = s < wind ? 0 : Math.min(1, (s - wind) / 0.22);
        armR.rotation.x = s < wind ? -1.2 - k * 1.7 : -2.9 + down * 3.3 - (1 - k) * 0.0;
        armR.rotation.z = -0.25;
        body.rotation.y = s < wind ? -0.3 * k : -0.3 + down * 0.6;
        body.rotation.x = 0.1 + down * 0.15 * (1 - (s - wind) / (1 - wind));
      }
    }

    if (a.hurt > 0) {
      body.rotation.x -= a.hurt * 0.35;
      this.head.rotation.z += Math.sin(a.hurt * 20) * 0.15 * a.hurt;
      a.hurt = Math.max(0, a.hurt - dt * 4);
      this.setMood('hurt');
    } else if (a.swing >= 0 || a.charge > 0.2) this.setMood('shout');
    else this.setMood(st.mood || 'angry');

    this.shadow.scale.setScalar(1 - body.position.y * 0.6);
    this.shadow.position.y = (st.groundOffset ?? 0) + 0.03;
    this.updateFlash(dt);
  }

  updateFlash(dt) {
    if (this.flash > 0) {
      this.flash = Math.max(0, this.flash - dt * 6);
      const f = this.flash;
      this.mat.emissive.setRGB(f, f * 0.9, f * 0.9);
      this.skinMat.emissive.setRGB(f, f * 0.9, f * 0.9);
    }
  }

  dispose() {
    this.root.traverse((o) => {
      if (o.isMesh && o.geometry && !o.userData.isOutline) o.geometry.dispose();
    });
    this.mat.dispose();
    this.skinMat.dispose();
  }
}

// ---------------------------------------------------------------- princess
// team: whose princess she is. stage 0..3 (fatness), continuous `fat` 0..1.
export class PrincessModel {
  constructor(team) {
    this.team = team;
    this.root = new THREE.Group();
    this.mat = new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: gradient([0.64, 0.88, 1.0]) });
    this.mat.emissive = new THREE.Color(0);
    this.fat = 0;
    this.t = 0;
    this.build();
  }
  build() {
    const blue = this.team === 0;
    const dress = blue ? '#4fb3f0' : '#f07898';
    const dress2 = blue ? '#e8f6ff' : '#ffffff';
    const hairCol = blue ? '#a8521e' : '#f6d24a';
    const crown = blue ? '#5fd0ff' : '#ff9ab8';
    const skin = '#f8d7c2';
    const root = this.root;
    const body = new THREE.Group();
    root.add(body);
    this.body = body;
    const shadow = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 1.8), new THREE.MeshBasicMaterial({ map: shadowTex(), transparent: true, depthWrite: false }));
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.03;
    root.add(shadow);
    this.shadow = shadow;
    // the dress is a squashable bell
    const skirt = new THREE.Group();
    skirt.add(m(CY(0.32, 0.62, 0.75, 16), dress, 0, 0.38, 0));
    skirt.add(m(CY(0.6, 0.64, 0.14, 16), dress2, 0, 0.22, 0));
    skirt.add(m(CY(0.45, 0.5, 0.1, 16), dress2, 0, 0.52, 0));
    skirt.add(m(SP(0.36, 14, 10), dress, 0, 0.82, 0, { s: [1, 0.9, 0.85] }));
    // bow
    for (const s of [-1, 1]) skirt.add(m(new THREE.ConeGeometry(0.12, 0.22, 4), '#ffffff', s * 0.13, 0.75, 0.33, { rz: s * Math.PI / 2 }));
    skirt.add(m(SP(0.06, 6, 4), '#ffffff', 0, 0.75, 0.35));
    body.add(skirt);
    this.skirt = skirt;
    const arms = [];
    for (const s of [-1, 1]) {
      const arm = new THREE.Group();
      arm.position.set(s * 0.38, 0.95, 0);
      arm.add(m(CY(0.1, 0.09, 0.32, 8), dress, 0, -0.14, 0));
      arm.add(m(SP(0.1, 8, 6), skin, 0, -0.34, 0));
      body.add(arm);
      arms.push(arm);
    }
    this.arms = arms;
    const head = new THREE.Group();
    head.position.y = 1.42;
    body.add(head);
    this.head = head;
    const skinMat = new THREE.MeshToonMaterial({ color: skin, gradientMap: gradient([0.64, 0.88, 1.0]) });
    this.skinMat = skinMat;
    const hm = new THREE.Mesh(roundBox(0.9, 0.82, 0.82, 0.48), skinMat);
    hm.userData.keep = true;
    hm.castShadow = true;
    head.add(hm);
    inkMesh(hm, 0.034);
    this.faces = { sad: princessFace(skin, blue, 'sad'), happy: princessFace(skin, blue, 'happy'), eat: princessFace(skin, blue, 'eat') };
    const faceGeo = new THREE.PlaneGeometry(0.76, 0.7, 6, 6);
    const fp = faceGeo.attributes.position;
    for (let i = 0; i < fp.count; i++) fp.setZ(i, -(fp.getX(i) ** 2) * 0.32 - fp.getY(i) ** 2 * 0.2);
    this.face = new THREE.Mesh(faceGeo, this.faces.sad);
    this.face.position.set(0, -0.06, 0.42);
    this.face.userData.keep = true;
    head.add(this.face);
    // hair: blonde curls or an auburn braided up-do
    const hg = new THREE.Group();
    hg.add(m(roundBox(0.98, 0.55, 0.92, 0.5), hairCol, 0, 0.24, -0.04));
    if (blue) {
      hg.add(m(new THREE.TorusGeometry(0.36, 0.13, 8, 16), hairCol, 0, 0.42, -0.1, { rx: Math.PI / 2.3 }));
      hg.add(m(SP(0.24, 10, 8), hairCol, 0, 0.62, -0.18));
    } else {
      for (const s of [-1, 1]) for (let i = 0; i < 3; i++) hg.add(m(SP(0.16, 8, 6), hairCol, s * 0.48, 0.05 - i * 0.2, -0.08 - i * 0.02));
      for (let i = 0; i < 4; i++) hg.add(m(SP(0.15, 8, 6), hairCol, -0.3 + i * 0.2, 0.32, 0.36));
    }
    head.add(hg);
    // tiara
    const tiara = new THREE.Group();
    tiara.position.set(0, 0.5, 0.1);
    tiara.add(m(CY(0.3, 0.32, 0.08, 10), crown, 0, 0, 0));
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI - Math.PI;
      tiara.add(m(new THREE.ConeGeometry(0.06, 0.18, 4), crown, Math.cos(a) * 0.3, 0.12, -Math.sin(a) * 0.3 * 0 + (i % 2) * 0.0 + Math.sin(a + Math.PI) * 0.3));
    }
    head.add(tiara);
    bake(skirt, this.mat);
    for (const a of arms) bake(a, this.mat);
    bake(head, this.mat);
  }
  setMood(mood) {
    if (this.face.material !== this.faces[mood]) this.face.material = this.faces[mood];
  }
  // fat: 0..1 continuous; carried: 0..1; t time
  update(dt, st = {}) {
    this.t += dt;
    const f = this.fat;
    const w = 1 + f * 1.9, h = 1 + f * 0.35;
    this.skirt.scale.set(w, h, w * 0.95);
    this.arms[0].position.x = -0.38 * w;
    this.arms[1].position.x = 0.38 * w;
    this.arms[0].position.y = this.arms[1].position.y = 0.95 * h;
    this.head.position.y = 1.42 * h - f * 0.1;
    this.head.scale.setScalar(1 + f * 0.35);
    this.shadow.scale.setScalar(w);
    const t = this.t;
    this.body.rotation.set(0, 0, 0);
    this.body.position.set(0, 0, 0);
    if (st.carried) {
      this.body.rotation.x = -1.35;
      this.body.position.y = 1.2 + Math.sin(t * 12) * 0.05;
      this.arms[0].rotation.x = this.arms[1].rotation.x = -2.6 + Math.sin(t * 10) * 0.4;
      this.setMood('sad');
    } else if (st.eating > 0) {
      this.arms[1].rotation.x = -2.2 + Math.sin(t * 16) * 0.4;
      this.setMood('eat');
    } else {
      this.arms[0].rotation.x = Math.sin(t * 2) * 0.1;
      this.arms[1].rotation.x = -Math.sin(t * 2) * 0.1;
      this.arms[0].rotation.z = -0.3;
      this.arms[1].rotation.z = 0.3;
      this.body.position.y = Math.abs(Math.sin(t * (st.happy ? 6 : 1.5))) * (st.happy ? 0.25 : 0.03);
      this.setMood(st.happy ? 'happy' : 'sad');
    }
  }
}

function princessFace(skin, blue, mood) {
  // reuse the canvas painter through a dedicated key
  const tex = faceTex(skin, blue ? '#3a8fe0' : '#41b46a', mood === 'happy' ? 'happy' : mood === 'eat' ? 'shout' : 'sad', 'princess' + (blue ? 'b' : 'r'));
  return new THREE.MeshBasicMaterial({ map: tex });
}

export { planksTex };

// A loose hat lying on the ground (pickups from hat machines and fallen soldiers).
const hatMats = {};
export function hatModel(cls, team, upgraded = false) {
  const g = new THREE.Group();
  const h = hat(cls, TEAM_COLORS[team], upgraded);
  if (cls === 'warrior') h.position.y = 0.45;
  g.add(h);
  const key = 'hat';
  if (!hatMats[key]) hatMats[key] = new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: gradient([0.62, 0.86, 1.0]) });
  bake(g, hatMats[key]);
  g.traverse((o) => o.isMesh && !o.userData.isOutline && (o.castShadow = true));
  g.scale.setScalar(0.8);
  return g;
}
