// 3D world: floor, crowd, the three characters and props.
// Everything is built once; shots.js poses it for a given time.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { Line2 } from 'three/addons/lines/Line2.js';
import { LineSegments2 } from 'three/addons/lines/LineSegments2.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
import { LineGeometry } from 'three/addons/lines/LineGeometry.js';
import { LineSegmentsGeometry } from 'three/addons/lines/LineSegmentsGeometry.js';

export const COL = {
  bg: 0xffffff,
  crowd: 0xd3d4d9,
  dark: 0x43474e,
  vip: 0x55585e,
  hero: 0xffffff,
  ink: 0x1e1f22,
  yellow: 0xf4d73c,
  red: 0xe42c44,
};

// ---------- figure geometry (shared) ----------
const BODY_TOP = 1.56;     // where the taper meets the dome
const BODY_R_TOP = 0.3;
const BODY_R_BOT = 0.18;
const HEAD_R = 0.215;
const NECK_GAP = 0.18;
export const BODY_H = BODY_TOP + BODY_R_TOP;
export const HEAD_Y = BODY_H + NECK_GAP + HEAD_R;

function bodyGeometry() {
  const p = [new THREE.Vector2(0, 0)];
  const e = 0.035;
  for (let i = 0; i <= 5; i++) {
    const a = -Math.PI / 2 + (i / 5) * (Math.PI / 2);
    p.push(new THREE.Vector2(BODY_R_BOT - e + e * Math.cos(a), e + e * Math.sin(a)));
  }
  for (let i = 1; i <= 8; i++) {
    const k = i / 8;
    p.push(new THREE.Vector2(BODY_R_BOT + (BODY_R_TOP - BODY_R_BOT) * k, e + (BODY_TOP - e) * k));
  }
  for (let i = 1; i <= 20; i++) {
    const a = (i / 20) * (Math.PI / 2);
    p.push(new THREE.Vector2(Math.max(1e-4, BODY_R_TOP * Math.cos(a)), BODY_TOP + BODY_R_TOP * Math.sin(a)));
  }
  const g = new THREE.LatheGeometry(p, 56);
  g.computeVertexNormals();
  return g;
}

const GEO = {
  body: bodyGeometry(),
  head: new THREE.SphereGeometry(HEAD_R, 40, 28),
  cube: new RoundedBoxGeometry(0.45, 0.44, 0.42, 5, 0.095),
  arm: new THREE.CapsuleGeometry(0.043, 0.66, 6, 12),
  eye: new THREE.SphereGeometry(0.03, 12, 10),
  smile: new THREE.TorusGeometry(0.055, 0.011, 8, 24, 2.1),
  shadow: new THREE.PlaneGeometry(1, 1),
};
GEO.arm.translate(0, -0.37, 0); // pivot at the shoulder

// Inverted-hull outline: pushes vertices out along their normals.
export function outlineMaterial(color = COL.ink, thickness = 0.02, opacity = 1) {
  return new THREE.ShaderMaterial({
    uniforms: {
      color: { value: new THREE.Color(color) },
      thickness: { value: thickness },
      opacity: { value: opacity },
    },
    vertexShader: /* glsl */ `
      uniform float thickness;
      void main() {
        vec3 p = position + normalize(normal) * thickness;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 color; uniform float opacity;
      void main() { gl_FragColor = vec4(color, opacity); }`,
    side: THREE.BackSide,
    transparent: true,
  });
}

function shadowTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  const r = g.createRadialGradient(64, 64, 4, 64, 64, 64);
  r.addColorStop(0, 'rgba(60,60,70,0.55)');
  r.addColorStop(0.45, 'rgba(60,60,70,0.28)');
  r.addColorStop(1, 'rgba(60,60,70,0)');
  g.fillStyle = r;
  g.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
const SHADOW_TEX = shadowTexture();

// ---------- Figure ----------
export class Figure {
  constructor(kind, { color, scale = 1 } = {}) {
    this.kind = kind;
    this.root = new THREE.Group();
    this.root.scale.setScalar(scale);
    this.base = scale;
    const c = color ?? (kind === 'connector' ? COL.dark : kind === 'hero' ? COL.hero : kind === 'vip' ? COL.vip : COL.crowd);
    this.mat = new THREE.MeshStandardMaterial({ color: c, roughness: kind === 'hero' ? 0.9 : 0.75, metalness: 0, transparent: true });
    if (kind === 'hero') {
      this.mat.emissive = new THREE.Color(0xffffff);
      this.mat.emissiveIntensity = 0.32;
    }

    this.tilt = new THREE.Group(); // lean while walking
    this.root.add(this.tilt);

    this.body = new THREE.Mesh(GEO.body, this.mat);
    this.tilt.add(this.body);

    this.headPivot = new THREE.Group();
    this.headPivot.position.y = HEAD_Y;
    this.tilt.add(this.headPivot);

    if (kind === 'connector') {
      this.head = new THREE.Mesh(GEO.cube, new THREE.MeshStandardMaterial({ color: 0x3b3e44, roughness: 0.6 }));
      this.head.position.y = 0.02;
      const face = new THREE.MeshBasicMaterial({ color: 0xf4f4f4 });
      const eL = new THREE.Mesh(GEO.eye, face), eR = new THREE.Mesh(GEO.eye, face);
      eL.scale.set(0.95, 1.25, 0.35); eR.scale.copy(eL.scale);
      eL.position.set(-0.075, 0.04, 0.212); eR.position.set(0.075, 0.04, 0.212);
      const sm = new THREE.Mesh(GEO.smile, face);
      sm.rotation.z = -Math.PI / 2 - 1.05;
      sm.position.set(0, -0.01, 0.212);
      sm.scale.z = 0.4;
      this.face = new THREE.Group();
      this.face.add(eL, eR, sm);
      this.head.add(this.face);
    } else {
      this.head = new THREE.Mesh(GEO.head, this.mat);
    }
    this.headPivot.add(this.head);

    // arms (connector always, hero/vip on demand)
    this.arms = [];
    if (kind !== 'crowd') {
      for (const side of [-1, 1]) {
        const piv = new THREE.Group();
        piv.position.set(side * 0.285, BODY_TOP + 0.02, 0);
        const m = new THREE.Mesh(GEO.arm, kind === 'connector' ? this.mat : this.mat);
        piv.add(m);
        piv.rotation.z = side * 0.1;
        this.tilt.add(piv);
        this.arms.push(piv);
      }
      if (kind !== 'connector') this.arms.forEach((a) => (a.visible = false));
    }

    this.outlines = [];
    if (kind === 'hero') this.addOutline(COL.ink, 0.016);

    this.shadow = new THREE.Mesh(
      GEO.shadow,
      new THREE.MeshBasicMaterial({ map: SHADOW_TEX, transparent: true, depthWrite: false, fog: true })
    );
    this.shadow.rotation.x = -Math.PI / 2;
    this.shadow.position.set(0.06, 0.004, 0.05);
    this.shadow.scale.set(1.05, 0.95, 1);
    this.shadow.renderOrder = -1;
    this.root.add(this.shadow);

    this.body.castShadow = false;
  }

  addOutline(color, thickness) {
    const mat = outlineMaterial(color, thickness);
    const meshes = [this.body, this.head, ...this.arms.map((a) => a.children[0])];
    const out = [];
    for (const m of meshes) {
      if (this.kind === 'connector' && m === this.head) continue;
      const o = new THREE.Mesh(m.geometry, mat);
      o.raycast = () => {};
      m.add(o);
      out.push(o);
    }
    this.outlines.push({ mat, meshes: out });
    return mat;
  }

  // pose: { x, z, y, ry, yaw, opacity, armL, armR, lean, visible, s }
  pose(p) {
    const r = this.root;
    r.visible = p.visible !== false;
    r.position.set(p.x ?? 0, p.y ?? 0, p.z ?? 0);
    r.rotation.y = p.ry ?? 0;
    r.scale.setScalar(this.base * (p.s ?? 1));
    this.headPivot.rotation.y = p.yaw ?? 0;
    this.tilt.rotation.x = p.lean ?? 0;
    this.tilt.position.y = p.bob ?? 0;
    const op = p.opacity ?? 1;
    this.mat.opacity = op;
    this.mat.depthWrite = op > 0.98;
    if (this.head.material !== this.mat) this.head.material.opacity = op;
    this.shadow.material.opacity = op;
    if (this.arms.length) {
      const [L, R] = this.arms;
      const a = p.armL, b = p.armR;
      if (this.kind !== 'connector') { L.visible = !!a; R.visible = !!b; }
      L.rotation.set(a?.fx ?? 0, 0, -(a?.raise ?? 0.1));
      R.rotation.set(b?.fx ?? 0, 0, b?.raise ?? 0.1);
    }
  }
}

// ---------- floor ----------
function floorTexture() {
  const N = 8, PX = 256;
  const c = document.createElement('canvas');
  c.width = c.height = N * PX;
  const g = c.getContext('2d');
  g.fillStyle = '#ffffff';
  g.fillRect(0, 0, c.width, c.height);
  g.strokeStyle = 'rgba(150,150,160,0.32)';
  g.lineWidth = 2;
  for (let i = 0; i <= N; i++) {
    g.beginPath(); g.moveTo(i * PX, 0); g.lineTo(i * PX, c.height); g.stroke();
    g.beginPath(); g.moveTo(0, i * PX); g.lineTo(c.width, i * PX); g.stroke();
  }
  // sparse "+" registration marks
  const rnd = mulberry(7);
  g.strokeStyle = 'rgba(70,70,80,0.75)';
  g.lineWidth = 3;
  for (let i = 0; i < 9; i++) {
    const x = (Math.floor(rnd() * N) + 0.5) * PX, y = (Math.floor(rnd() * N) + 0.5) * PX, s = 34;
    g.beginPath(); g.moveTo(x - s, y); g.lineTo(x + s, y); g.moveTo(x, y - s); g.lineTo(x, y + s); g.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 16;
  return t;
}

export function mulberry(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------- fat lines ----------
export function makeLine(points, { color = COL.yellow, width = 4, dashed = false, dash = 0.12, gap = 0.08, opacity = 1 } = {}) {
  const geo = new LineGeometry();
  geo.setPositions(points.flatMap((p) => [p.x, p.y, p.z]));
  const mat = new LineMaterial({ color, linewidth: width, dashed, dashSize: dash, gapSize: gap, transparent: true, opacity, worldUnits: false });
  const line = new Line2(geo, mat);
  line.computeLineDistances();
  line.userData.full = points;
  return line;
}

// Show the first `k` (0..1) of a polyline.
export function setLineProgress(line, k) {
  const pts = line.userData.full;
  const n = pts.length - 1;
  const f = Math.max(0, Math.min(1, k)) * n;
  const i = Math.floor(f);
  const out = pts.slice(0, i + 1);
  if (i < n) out.push(pts[i].clone().lerp(pts[i + 1], f - i));
  if (out.length < 2) { line.visible = false; return; }
  line.visible = true;
  line.geometry.dispose();
  const geo = new LineGeometry();
  geo.setPositions(out.flatMap((p) => [p.x, p.y, p.z]));
  line.geometry = geo;
  line.computeLineDistances();
}

function boxEdges(w, h, d, color, width) {
  const box = new THREE.EdgesGeometry(new THREE.BoxGeometry(w, h, d));
  const geo = new LineSegmentsGeometry().setPositions(box.attributes.position.array);
  return new LineSegments2(geo, new LineMaterial({ color, linewidth: width, transparent: true }));
}

function questionMark() {
  const g = new THREE.Group();
  const pts = [];
  for (let i = 0; i <= 18; i++) {
    const a = Math.PI * 1.05 - (i / 18) * Math.PI * 1.45;
    pts.push(new THREE.Vector3(0.24 * Math.cos(a), 0.62 + 0.3 * Math.sin(a), 0));
  }
  pts.push(new THREE.Vector3(0.02, 0.22, 0), new THREE.Vector3(0, 0.02, 0), new THREE.Vector3(0, -0.14, 0));
  const curve = new THREE.CatmullRomCurve3(pts);
  const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 0.35, roughness: 0.9 });
  const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 80, 0.055, 14, false), mat);
  const dot = new THREE.Mesh(new THREE.SphereGeometry(0.075, 20, 16), mat);
  dot.position.y = -0.36;
  const om = outlineMaterial(COL.ink, 0.018);
  for (const m of [tube, dot]) {
    m.add(new THREE.Mesh(m.geometry, om));
    g.add(m);
  }
  g.userData.mat = mat;
  g.userData.outline = om;
  return g;
}

// ---------- world ----------
export function buildWorld() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(COL.bg);
  scene.fog = new THREE.Fog(COL.bg, 14, 42);

  scene.add(new THREE.HemisphereLight(0xffffff, 0xb9bac2, 2.1));
  const key = new THREE.DirectionalLight(0xffffff, 1.55);
  key.position.set(-5, 9, 7);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xffffff, 0.35);
  fill.position.set(6, 3, -4);
  scene.add(fill);

  const ftex = floorTexture();
  ftex.repeat.set(30, 30);
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(240, 240),
    new THREE.MeshBasicMaterial({ map: ftex, color: 0xf1f1f3 })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, 0, 0);
  scene.add(floor);

  const W = { scene, floor, crowd: [], groups: {} };

  // Crowd groups: [name, cx, cz, count, spread]
  const rnd = mulberry(11);
  const GROUPS = [
    ['left', -1.5, -6.3, 8, 0.95],
    ['conn', 2.05, -6.4, 8, 0.8],
    ['stageAud', -7.2, -12.6, 11, 1.4],
    ['ceo', -3.2, -15.2, 7, 1.0],
    ['far1', 0.6, -12.5, 4, 0.6],
    ['far2', 5.6, -11.5, 3, 0.5],
    ['far3', 8.2, -6.5, 3, 0.55],
    ['east', 7.6, -15.5, 6, 0.9],
    ['west', -9.5, -6.0, 5, 0.8],
    ['back', -1.5, -21.0, 6, 1.0],
    ['back2', 4.0, -20.0, 5, 0.8],
    ['g5', 12.0, -16.0, 5, 0.8],
    ['g6', 18.0, -12.0, 5, 0.8],
    ['g8', 16.0, 3.0, 4, 0.7],
    ['g9', 20.0, -1.0, 4, 0.7],
    ['g10', 13.0, 6.0, 4, 0.7],
    ['g11', 4.0, 4.0, 3, 0.6],
  ];
  // hand-placed ring around the connector (offsets from his spot)
  const CONN_RING = [[-0.9, 0.6], [-0.5, 1.15], [1.05, 0.5], [0.1, -0.95], [0.75, -0.6], [-0.65, -0.85], [-1.35, -0.2], [1.3, -1.3]];
  for (const [name, cx, cz, n, spread] of GROUPS) {
    const members = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + rnd() * 0.7;
      const r = spread * (0.45 + rnd() * 0.6);
      const f = new Figure('crowd', { scale: 0.94 + rnd() * 0.12 });
      let x = cx + Math.cos(a) * r, z = cz + Math.sin(a) * r;
      if (name === 'conn') { x = 2.05 + CONN_RING[i][0]; z = -6.4 + CONN_RING[i][1]; }
      // face the group centre
      const ry = Math.atan2(cx - x, cz - z);
      f.home = { x, z, ry, yaw: (rnd() - 0.5) * 0.6 };
      f.pose(f.home);
      scene.add(f.root);
      members.push(f);
      W.crowd.push(f);
    }
    W.groups[name] = { cx, cz, members };
  }

  // loose field of singles and pairs east of the start (the wide shots)
  const lanes = [[[2.0, -6.4], [2.4, -5.4], [4.8, -4.9], [7.0, -5.5], [7.6, -6.1]], [[7.6, -6.1], [11.4, -2.6]],
    [[7.6, -6.1], [6.4, -7.2], [4.3, -8.6]], [[9.2, -3.5], [7.2, -5.2], [3.35, -7.95]], [[3.4, -7.9], [4.6, -8.4]]];
  const segDist = (x, z, a, b) => {
    const dx = b[0] - a[0], dz = b[1] - a[1], k = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / (dx * dx + dz * dz)));
    return Math.hypot(x - a[0] - dx * k, z - a[1] - dz * k);
  };
  const clear = (x, z) => lanes.every((l) => l.every((p, i) => i === 0 || segDist(x, z, l[i - 1], p) > 1.0));
  W.groups.field = { members: [] };
  for (let gx = 5.0; gx < 24; gx += 2.3) {
    for (let gz = -20; gz < 5; gz += 2.3) {
      if (rnd() < 0.3) continue;
      const n = rnd() < 0.45 ? 2 : 1;
      const bx = gx + (rnd() - 0.5) * 1.3, bz = gz + (rnd() - 0.5) * 1.3;
      for (let i = 0; i < n; i++) {
        const x = bx + i * 0.62 + (rnd() - 0.5) * 0.1, z = bz + (rnd() - 0.5) * 0.3;
        if (!clear(x, z) || Math.hypot(x - 7.9, z - 6.9 + 13.8) < 1.0) continue;
        const f = new Figure('crowd', { scale: 0.94 + rnd() * 0.12 });
        f.home = { x, z, ry: (rnd() - 0.5) * 2.5, yaw: (rnd() - 0.5) * 0.6 };
        f.pose(f.home);
        scene.add(f.root);
        W.crowd.push(f);
        W.groups.field.members.push(f);
      }
    }
  }

  // Characters
  W.connector = new Figure('connector');
  W.hero = new Figure('hero');
  W.speaker = new Figure('vip');
  W.ceo = new Figure('vip');
  scene.add(W.connector.root, W.hero.root, W.speaker.root, W.ceo.root);

  // Podium (glass box) for the speaker
  W.podium = new THREE.Group();
  const glass = new THREE.Mesh(
    new THREE.BoxGeometry(2.5, 0.85, 1.5),
    new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.35, depthWrite: false })
  );
  glass.position.y = 0.425;
  const edges = boxEdges(2.5, 0.85, 1.5, 0x55565c, 2.2);
  edges.position.y = 0.425;
  W.podium.add(glass, edges);
  W.podium.position.set(-7.2, 0, -12.6);
  scene.add(W.podium);

  // Props for the last shot
  W.question = questionMark();
  scene.add(W.question);
  W.panel = new THREE.Group();
  const pm = new THREE.Mesh(
    new THREE.PlaneGeometry(2.3, 3.4),
    new THREE.MeshBasicMaterial({ color: 0x9d9ea6, transparent: true, opacity: 0.38, depthWrite: false, side: THREE.DoubleSide })
  );
  pm.position.y = 1.7;
  const pe = new THREE.EdgesGeometry(new THREE.PlaneGeometry(2.3, 3.4));
  const pel = new LineSegments2(new LineSegmentsGeometry().setPositions(pe.attributes.position.array), new LineMaterial({ color: 0x6c6d73, linewidth: 2.2, transparent: true }));
  pel.position.y = 1.7;
  W.panel.add(pm, pel);
  W.panel.userData = { plane: pm, edge: pel };
  scene.add(W.panel);

  W.lines = new THREE.Group();
  scene.add(W.lines);
  return W;
}
