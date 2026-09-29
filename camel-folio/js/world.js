import * as THREE from 'three';
import { mergeGeometries } from 'three-addons';
import { profile, projects, contact, ui } from './content.js';
import { sandTexture, groundText, boardTexture, signTexture, rugTexture, FONT_DISPLAY } from './textures.js';

export const PLAY_RADIUS = 66;

export const ZONES = {
  welcome: { x: 0, z: 0 },
  projects: { x: 0, z: -40 },
  about: { x: -42, z: -8 },
  skills: { x: -32, z: 26 },
  contact: { x: 40, z: -6 },
  playground: { x: 30, z: 30 },
  oasis: { x: -4, z: 44 },
};

const SKY_TOP = new THREE.Color('#6fb0d8');
const SKY_HORIZON = new THREE.Color('#f7d7a8');
export const SUN_DIR = new THREE.Vector3(-0.55, 0.75, 0.38).normalize();

// ---------- deterministic noise ----------
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
function smoothstep(a, b, x) {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}
let seed = 7;
function rand() {
  seed = (seed * 16807) % 2147483647;
  return (seed - 1) / 2147483646;
}

export function heightAt(x, z) {
  const r = Math.hypot(x, z);
  if (r < 58) return 0;
  const t = smoothstep(58, 110, r);
  const dunes = vnoise(x * 0.035, z * 0.035) * 0.7 + vnoise(x * 0.08 + 9, z * 0.08) * 0.3;
  // Crest lines make it read as dunes rather than hills.
  const crest = Math.pow(Math.abs(Math.sin(x * 0.045 + z * 0.02 + dunes * 3)), 0.6);
  return t * t * (6 + dunes * 16 + crest * 6);
}

// ---------- geometry helpers ----------
function part(geo, color, matrix) {
  let g = geo.index ? geo.toNonIndexed() : geo;
  g.deleteAttribute('uv');
  if (matrix) g.applyMatrix4(matrix);
  const c = new THREE.Color(color);
  const n = g.attributes.position.count;
  const arr = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { arr[i * 3] = c.r; arr[i * 3 + 1] = c.g; arr[i * 3 + 2] = c.b; }
  g.setAttribute('color', new THREE.BufferAttribute(arr, 3));
  return g;
}
const M = new THREE.Matrix4();
const Q = new THREE.Quaternion();
const E = new THREE.Euler();
const V = new THREE.Vector3();
const S = new THREE.Vector3();
function mtx(x, y, z, rx = 0, ry = 0, rz = 0, sx = 1, sy = sx, sz = sx) {
  return new THREE.Matrix4().compose(V.set(x, y, z), Q.setFromEuler(E.set(rx, ry, rz)), S.set(sx, sy, sz));
}

// A drooping palm frond built as a folded strip along +X.
function frondGeometry(len = 3.4, width = 0.7, seg = 7) {
  const pos = [];
  const pts = [];
  for (let i = 0; i <= seg; i++) {
    const v = i / seg;
    const x = v * len;
    const y = v * 1.1 - v * v * 2.4;
    const w = width * Math.sin(Math.PI * Math.min(1, v * 1.15 + 0.08)) * (1 - v * 0.4);
    pts.push({ c: [x, y + 0.08, 0], l: [x, y - 0.05, -w], r: [x, y - 0.05, w] });
  }
  for (let i = 0; i < seg; i++) {
    const a = pts[i], b = pts[i + 1];
    pos.push(...a.c, ...a.l, ...b.c, ...a.l, ...b.l, ...b.c);
    pos.push(...a.c, ...b.c, ...a.r, ...a.r, ...b.c, ...b.r);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  return g;
}

function palmGeometry() {
  const parts = [];
  const segs = 8;
  const h = 6.4;
  let prev = new THREE.Vector3(0, 0, 0);
  for (let i = 0; i < segs; i++) {
    const t0 = i / segs, t1 = (i + 1) / segs;
    const p0 = new THREE.Vector3(Math.pow(t0, 2) * 1.2, t0 * h, 0);
    const p1 = new THREE.Vector3(Math.pow(t1, 2) * 1.2, t1 * h, 0);
    const dir = p1.clone().sub(p0);
    const len = dir.length();
    const g = new THREE.CylinderGeometry(0.26 - t1 * 0.08, 0.3 - t0 * 0.08, len * 1.04, 7);
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
    const m = new THREE.Matrix4().compose(p0.clone().lerp(p1, 0.5), q, new THREE.Vector3(1, 1, 1));
    parts.push(part(g, i % 2 ? '#8b5a33' : '#76492a', m));
    prev = p1;
  }
  const top = prev;
  parts.push(part(new THREE.SphereGeometry(0.4, 7, 5), '#6d4426', mtx(top.x, top.y, top.z)));
  const fronds = 9;
  for (let k = 0; k < fronds; k++) {
    const a = (k / fronds) * Math.PI * 2 + (k % 2) * 0.2;
    const tilt = (k % 3) * 0.12 - 0.1;
    const color = k % 2 ? '#5f8a3a' : '#4f7a31';
    parts.push(part(frondGeometry(3.2 + (k % 3) * 0.4), color, mtx(top.x, top.y + 0.1, top.z, 0, a, tilt)));
  }
  for (let d = 0; d < 7; d++) {
    const a = d * 0.9;
    parts.push(part(new THREE.IcosahedronGeometry(0.13, 0), '#c0692b', mtx(top.x + Math.cos(a) * 0.35, top.y - 0.35 - (d % 2) * 0.15, top.z + Math.sin(a) * 0.35)));
  }
  return mergeGeometries(parts);
}

function rockGeometry(variant) {
  seed = 100 + variant * 17;
  const g = new THREE.IcosahedronGeometry(1, 1);
  const p = g.attributes.position;
  const cache = new Map();
  for (let i = 0; i < p.count; i++) {
    const key = `${p.getX(i).toFixed(3)},${p.getY(i).toFixed(3)},${p.getZ(i).toFixed(3)}`;
    if (!cache.has(key)) cache.set(key, 0.75 + rand() * 0.45);
    const k = cache.get(key);
    p.setXYZ(i, p.getX(i) * k, Math.max(-0.3, p.getY(i)) * k * 0.75, p.getZ(i) * k);
  }
  return part(g, ['#c77b4b', '#b8693f', '#d08c5a'][variant % 3]);
}

function shrubGeometry() {
  const parts = [];
  for (let i = 0; i < 6; i++) {
    const a = i * 1.1;
    parts.push(part(new THREE.ConeGeometry(0.22, 0.9, 5), i % 2 ? '#8d9a57' : '#7a8a4b', mtx(Math.cos(a) * 0.25, 0.4, Math.sin(a) * 0.25, Math.sin(a) * 0.35, 0, Math.cos(a) * 0.35)));
  }
  return mergeGeometries(parts);
}

export class World {
  constructor(scene, { mobile = false, touch = false } = {}) {
    this.scene = scene;
    this.mobile = mobile;
    this.touch = touch;
    this.colliders = []; // {x, z, r}
    this.triggers = []; // {x, z, r, id, label, action, pad}
    this.animated = []; // (t, dt) => void
    this.decorMat = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.95, side: THREE.DoubleSide });
    this.wood = new THREE.MeshStandardMaterial({ color: '#8a5a34', roughness: 0.9, flatShading: true });
    this.water = null;

    this.buildSky();
    this.buildLights();
    this.buildGround();
    this.buildWelcome();
    this.buildProjects();
    this.buildTent();
    this.buildSkillsArea();
    this.buildContact();
    this.buildPlayground();
    this.buildOasis();
    this.buildScatter();
    this.buildBirds();
  }

  addCollider(x, z, r) { this.colliders.push({ x, z, r }); }

  // Push a circle out of static colliders and keep it inside the play area.
  resolve(x, z, r) {
    for (let pass = 0; pass < 2; pass++) {
      for (const c of this.colliders) {
        const dx = x - c.x, dz = z - c.z;
        const min = r + c.r;
        const d2 = dx * dx + dz * dz;
        if (d2 < min * min && d2 > 1e-6) {
          const d = Math.sqrt(d2);
          x = c.x + (dx / d) * min;
          z = c.z + (dz / d) * min;
        }
      }
    }
    const d = Math.hypot(x, z);
    if (d > PLAY_RADIUS) { x *= PLAY_RADIUS / d; z *= PLAY_RADIUS / d; }
    return { x, z };
  }

  heightAt(x, z) { return heightAt(x, z); }

  inPond(x, z) {
    const p = ZONES.oasis;
    return Math.hypot(x - p.x, z - p.z) < this.pondRadius - 0.6;
  }

  // ---------- environment ----------
  buildSky() {
    const geo = new THREE.SphereGeometry(400, 32, 16);
    const mat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
      uniforms: {
        top: { value: SKY_TOP },
        horizon: { value: SKY_HORIZON },
        sunDir: { value: SUN_DIR },
      },
      vertexShader: `varying vec3 vDir; void main(){ vDir = normalize(position); vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0); gl_Position = p.xyww; }`,
      fragmentShader: `uniform vec3 top; uniform vec3 horizon; uniform vec3 sunDir; varying vec3 vDir;
        void main(){ float h = vDir.y; vec3 col = mix(horizon, top, smoothstep(0.0, 0.45, h));
          float s = max(dot(normalize(vDir), sunDir), 0.0);
          col += vec3(1.0, 0.85, 0.6) * (pow(s, 400.0) * 2.0 + pow(s, 12.0) * 0.25);
          gl_FragColor = vec4(col, 1.0); }`,
    });
    this.sky = new THREE.Mesh(geo, mat);
    this.sky.renderOrder = -1;
    this.sky.frustumCulled = false;
    this.scene.add(this.sky);
    this.scene.fog = new THREE.Fog(SKY_HORIZON, 70, 190);
    this.scene.background = SKY_HORIZON.clone();
  }

  buildLights() {
    const hemi = new THREE.HemisphereLight('#fff0d6', '#d19a62', 1.35);
    this.scene.add(hemi);
    const sun = (this.sun = new THREE.DirectionalLight('#fff0d8', 2.4));
    sun.castShadow = true;
    const size = this.mobile ? 1024 : 2048;
    sun.shadow.mapSize.set(size, size);
    const s = 30;
    Object.assign(sun.shadow.camera, { left: -s, right: s, top: s, bottom: -s, near: 1, far: 120 });
    sun.shadow.bias = -0.0005;
    sun.shadow.normalBias = 0.04;
    this.scene.add(sun, sun.target);
  }

  followSun(target) {
    this.sun.position.copy(target).addScaledVector(SUN_DIR, 60);
    this.sun.target.position.copy(target);
    this.sky.position.copy(target);
  }

  buildGround() {
    const size = 360;
    const seg = this.mobile ? 150 : 220;
    const geo = new THREE.PlaneGeometry(size, size, seg, seg);
    geo.rotateX(-Math.PI / 2);
    const p = geo.attributes.position;
    const colors = new Float32Array(p.count * 3);
    const base = new THREE.Color('#ecc690');
    const shade = new THREE.Color('#d9a56a');
    const c = new THREE.Color();
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), z = p.getZ(i);
      const y = heightAt(x, z);
      p.setY(i, y);
      c.copy(base).lerp(shade, Math.min(1, y / 18) * 0.6 + vnoise(x * 0.05, z * 0.05) * 0.25);
      colors.set([c.r, c.g, c.b], i * 3);
    }
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.computeVertexNormals();
    const tex = sandTexture(this.mobile ? 256 : 512);
    tex.repeat.set(size / 14, size / 14);
    const mat = new THREE.MeshStandardMaterial({ map: tex, vertexColors: true, roughness: 1 });
    const ground = new THREE.Mesh(geo, mat);
    ground.receiveShadow = true;
    this.scene.add(ground);
    this.ground = ground;
  }

  groundLabel(lines, x, z, w, h, opts = {}) {
    const tex = groundText(lines, { width: 2048, height: Math.round((2048 * h) / w), ...opts });
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.MeshStandardMaterial({ map: tex, transparent: true, depthWrite: false, roughness: 1, polygonOffset: true, polygonOffsetFactor: -2 }),
    );
    m.rotation.x = -Math.PI / 2;
    m.rotation.z = opts.rot || 0;
    m.position.set(x, 0.03, z);
    m.receiveShadow = true;
    this.scene.add(m);
    return m;
  }

  // A glowing pad on the sand. Standing on it lets you open the section.
  addTrigger({ id, x, z, r = 2.4, label, action, color = '#f2c14e' }) {
    const group = new THREE.Group();
    group.position.set(x, 0.04, z);
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(r - 0.25, r, 40),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.85, depthWrite: false }),
    );
    ring.rotation.x = -Math.PI / 2;
    const fill = new THREE.Mesh(
      new THREE.CircleGeometry(r - 0.35, 40),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.18, depthWrite: false }),
    );
    fill.rotation.x = -Math.PI / 2;
    group.add(ring, fill);
    this.scene.add(group);
    const t = { id, x, z, r, label, action, group, ring, fill, active: 0 };
    this.triggers.push(t);
    return t;
  }

  signPost(x, z, entries) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 4.2, 7), this.wood);
    post.position.set(x, 2.1, z);
    post.castShadow = true;
    this.scene.add(post);
    this.addCollider(x, z, 0.35);
    entries.forEach((e, i) => {
      const tex = signTexture(e.label, { bg: e.bg || '#8a5a34', w: 768, h: 192 });
      const side = new THREE.MeshStandardMaterial({ color: '#6d4426', flatShading: true });
      const face = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9 });
      const board = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.62, 0.1), [side, side, side, side, face, face]);
      const angle = Math.atan2(e.x - x, e.z - z);
      const g = new THREE.Group();
      g.position.set(x, 3.6 - i * 0.78, z);
      // Board extends from the post toward its target.
      g.rotation.y = angle - Math.PI / 2;
      board.position.x = 1.25;
      board.castShadow = true;
      g.add(board);
      this.scene.add(g);
    });
  }

  buildWelcome() {
    // The name itself stands in the sand as physical letters (see props.js).
    this.groundLabel([
      { text: profile.role, size: 110, font: '"Cairo", sans-serif', alpha: 0.85 },
    ], 0, -6.2, 22, 1.8);
    this.hintLabel = this.groundLabel([
      { text: this.touch ?'اسحب على الشاشة لتحريك الجمل' : '↑ للتقدم   ← → للالتفاف   Shift للإسراع', size: 120, font: '"Cairo", sans-serif', weight: 700, alpha: 0.8 },
    ], 0, 5.2, this.touch ? 10 : 15, this.touch ? 1.1 : 1.6);

    const s = ui.sections;
    this.signPost(-5, -2.5, [
      { label: s.projects, ...ZONES.projects },
      { label: s.about, ...ZONES.about },
      { label: s.skills, ...ZONES.skills },
      { label: s.contact, ...ZONES.contact, bg: '#2f6f73' },
      { label: s.playground, ...ZONES.playground, bg: '#b5473a' },
    ]);
  }

  buildProjects() {
    const { x: cx, z: cz } = ZONES.projects;
    this.groundLabel([{ text: ui.sections.projects, size: 300 }], cx, cz + 11, 16, 3.4);
    const spacing = 9;
    const startX = cx + ((projects.length - 1) * spacing) / 2;
    const frameMat = new THREE.MeshStandardMaterial({ color: '#6d4426', flatShading: true, roughness: 0.9 });
    // Right-to-left reading order: first project on the right.
    projects.forEach((p, i) => {
      const x = startX - i * spacing;
      const z = cz;
      const g = new THREE.Group();
      g.position.set(x, 0, z);
      for (const sx of [-2.3, 2.3]) {
        const post = new THREE.Mesh(new THREE.BoxGeometry(0.3, 5, 0.3), frameMat);
        post.position.set(sx, 2.5, 0);
        post.castShadow = true;
        g.add(post);
        this.addCollider(x + sx, z, 0.45);
      }
      this.addCollider(x, z, 0.8);
      const face = new THREE.MeshStandardMaterial({ map: boardTexture(p), roughness: 0.85 });
      const board = new THREE.Mesh(new THREE.BoxGeometry(4.6, 2.88, 0.14), [frameMat, frameMat, frameMat, frameMat, face, frameMat]);
      board.position.set(0, 3.2, 0.1);
      board.castShadow = true;
      g.add(board);
      const cap = new THREE.Mesh(new THREE.BoxGeometry(5.3, 0.25, 0.7), frameMat);
      cap.position.set(0, 5.05, 0);
      cap.castShadow = true;
      g.add(cap);
      // Small rug in front of the board.
      const rug = new THREE.Mesh(new THREE.PlaneGeometry(4.4, 3), new THREE.MeshStandardMaterial({ map: rugTexture(p.color, p.accent, '#f4e3c1'), roughness: 1 }));
      rug.rotation.x = -Math.PI / 2;
      rug.position.set(0, 0.02, 3.6);
      rug.receiveShadow = true;
      g.add(rug);
      this.scene.add(g);
      this.addTrigger({ id: `project:${p.id}`, x, z: z + 3.6, r: 2.1, label: p.title, color: p.accent, action: { type: 'project', project: p } });
    });
  }

  buildTent() {
    const { x: cx, z: cz } = ZONES.about;
    const g = new THREE.Group();
    g.position.set(cx, 0, cz);
    // Tent faces +X (toward the start area).
    g.rotation.y = Math.PI / 2;
    const W = 11, D = 6.5;
    // Striped goat-hair roof: dark with pale bands.
    const c = document.createElement('canvas');
    c.width = 256; c.height = 256;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#2e2420';
    ctx.fillRect(0, 0, 256, 256);
    for (let y = 0; y < 256; y += 32) { ctx.fillStyle = '#e8d8bc'; ctx.fillRect(0, y + 22, 256, 5); }
    for (let i = 0; i < 1400; i++) { ctx.fillStyle = `rgba(0,0,0,${Math.random() * 0.15})`; ctx.fillRect(Math.random() * 256, Math.random() * 256, 2, 2); }
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(1, 3);
    const fabric = new THREE.MeshStandardMaterial({ map: tex, roughness: 1, side: THREE.DoubleSide, flatShading: true });
    const roof = new THREE.PlaneGeometry(W, D, 22, 8);
    const p = roof.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i);
      // Peaks over the three rows of poles, sagging between them.
      const peaks = Math.pow(Math.abs(Math.cos((x / W) * Math.PI * 2)), 0.5) * 0.5;
      const slope = 3.1 - Math.abs(y) * 0.28;
      p.setZ(i, slope + peaks);
    }
    roof.rotateX(-Math.PI / 2);
    roof.computeVertexNormals();
    const roofMesh = new THREE.Mesh(roof, fabric);
    roofMesh.castShadow = true;
    roofMesh.receiveShadow = true;
    g.add(roofMesh);
    // Back wall.
    const back = new THREE.Mesh(new THREE.PlaneGeometry(W, 2.4, 8, 2), fabric);
    back.position.set(0, 1.2, -D / 2);
    back.castShadow = true;
    g.add(back);
    for (const s of [-1, 1]) {
      const side = new THREE.Mesh(new THREE.PlaneGeometry(D, 2.3), fabric);
      side.rotation.y = Math.PI / 2;
      side.position.set((s * W) / 2, 1.15, 0);
      g.add(side);
    }
    // Poles.
    for (const px of [-W / 2 + 0.3, 0, W / 2 - 0.3]) for (const pz of [-D / 2 + 0.3, 0, D / 2 - 0.3]) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, pz === 0 ? 3.6 : 2.3, 6), this.wood);
      pole.position.set(px, pz === 0 ? 1.8 : 1.15, pz);
      pole.castShadow = true;
      g.add(pole);
    }
    // Rug, cushions, the dallah coffee pot, cups and a fire.
    const rug = new THREE.Mesh(new THREE.PlaneGeometry(W - 1, D - 1), new THREE.MeshStandardMaterial({ map: rugTexture('#8e2f2a', '#f2c14e', '#2f6f73'), roughness: 1 }));
    rug.material.map.repeat.set(3, 2);
    rug.rotation.x = -Math.PI / 2;
    rug.position.y = 0.03;
    rug.receiveShadow = true;
    g.add(rug);
    const cushionColors = ['#b5473a', '#2f6f73', '#f2c14e', '#8e2f2a', '#3b3a6b'];
    for (let i = 0; i < 7; i++) {
      const cush = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.5, 0.5), new THREE.MeshStandardMaterial({ color: cushionColors[i % 5], roughness: 1, flatShading: true }));
      cush.position.set(-W / 2 + 1.2 + i * 1.45, 0.28, -D / 2 + 0.6);
      cush.rotation.x = -0.2;
      cush.castShadow = true;
      g.add(cush);
    }
    const gold = new THREE.MeshStandardMaterial({ color: '#d6a640', metalness: 0.8, roughness: 0.3, flatShading: true });
    const dallahPts = [[0, 0], [0.32, 0], [0.34, 0.08], [0.26, 0.3], [0.17, 0.42], [0.2, 0.5], [0.12, 0.62], [0.1, 0.75], [0.16, 0.82], [0.02, 0.95]].map(([a, b]) => new THREE.Vector2(a, b));
    const dallah = new THREE.Mesh(new THREE.LatheGeometry(dallahPts, 12), gold);
    dallah.position.set(0.8, 0.03, 0.4);
    dallah.castShadow = true;
    const spout = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.07, 0.6, 6), gold);
    spout.position.set(0.25, 0.45, 0);
    spout.rotation.z = -0.9;
    dallah.add(spout);
    const handle = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.025, 5, 10, Math.PI), gold);
    handle.position.set(-0.22, 0.45, 0);
    handle.rotation.z = Math.PI / 2;
    dallah.add(handle);
    g.add(dallah);
    for (let i = 0; i < 3; i++) {
      const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.06, 0.1, 8), new THREE.MeshStandardMaterial({ color: '#f4e3c1' }));
      cup.position.set(1.4 + i * 0.25, 0.08, 0.7);
      g.add(cup);
    }
    // Fire pit in front of the tent.
    const fire = new THREE.Group();
    fire.position.set(0, 0, D / 2 + 2.4);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const st = new THREE.Mesh(new THREE.DodecahedronGeometry(0.28, 0), new THREE.MeshStandardMaterial({ color: '#7d6a5a', flatShading: true }));
      st.position.set(Math.cos(a) * 0.8, 0.15, Math.sin(a) * 0.8);
      st.castShadow = true;
      fire.add(st);
    }
    const flameMat = new THREE.MeshBasicMaterial({ color: '#ffb347', transparent: true, opacity: 0.9 });
    const flames = [];
    for (let i = 0; i < 3; i++) {
      const f = new THREE.Mesh(new THREE.ConeGeometry(0.28 - i * 0.06, 0.9 - i * 0.2, 6), i ? new THREE.MeshBasicMaterial({ color: i === 1 ? '#ff7a2f' : '#ffe08a' }) : flameMat);
      f.position.y = 0.45;
      fire.add(f);
      flames.push(f);
    }
    g.add(fire);
    this.animated.push((t) => {
      flames.forEach((f, i) => {
        f.scale.set(1, 0.8 + Math.sin(t * (9 + i * 3) + i) * 0.2 + Math.random() * 0.08, 1);
        f.rotation.y = t * (1 + i);
      });
    });
    if (!this.mobile) {
      const light = new THREE.PointLight('#ff9a4a', 6, 9, 1.6);
      light.position.set(0, 1, 0);
      fire.add(light);
      this.animated.push((t) => { light.intensity = 5 + Math.sin(t * 13) * 0.8 + Math.random() * 0.6; });
    }
    this.scene.add(g);

    // Colliders around the tent footprint (world space; tent rotated 90°).
    g.updateMatrixWorld();
    for (let i = -5; i <= 5; i++) {
      const w = new THREE.Vector3(i, 0, -D / 2 + 0.4).applyMatrix4(g.matrixWorld);
      this.addCollider(w.x, w.z, 0.7);
      const inner = new THREE.Vector3(i, 0, 0).applyMatrix4(g.matrixWorld);
      this.addCollider(inner.x, inner.z, 1.2);
      if (Math.abs(i) === 5) for (const zz of [-1.5, 1.5, 2.6]) {
        const sw = new THREE.Vector3(i * 1.05, 0, zz).applyMatrix4(g.matrixWorld);
        this.addCollider(sw.x, sw.z, 0.6);
      }
    }
    const fw = new THREE.Vector3(0, 0, D / 2 + 2.4).applyMatrix4(g.matrixWorld);
    this.addCollider(fw.x, fw.z, 1.1);

    const entrance = new THREE.Vector3(-3.4, 0, D / 2 + 2.6).applyMatrix4(g.matrixWorld);
    this.addTrigger({ id: 'about', x: entrance.x, z: entrance.z, r: 2.2, label: ui.sections.about, action: { type: 'about' } });
    this.groundLabel([{ text: ui.sections.about, size: 300 }], cx + 2, cz + 11, 12, 2.8);
  }

  buildSkillsArea() {
    const { x, z } = ZONES.skills;
    this.groundLabel([{ text: ui.sections.skills, size: 300 }], x, z + 7.5, 13, 3);
    this.addTrigger({ id: 'skills', x: x + 6, z: z + 4, r: 2, label: ui.sections.skills, action: { type: 'skills' } });
  }

  buildContact() {
    const { x: cx, z: cz } = ZONES.contact;
    this.groundLabel([{ text: ui.sections.contact, size: 300 }], cx - 3, cz + 12, 12, 2.8);
    // Stone well.
    const stone = new THREE.MeshStandardMaterial({ color: '#b9a58a', flatShading: true, roughness: 1 });
    const well = new THREE.Group();
    well.position.set(cx + 2, 0, cz);
    const ring = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.8, 1.1, 12, 1, true), stone);
    ring.position.y = 0.55;
    ring.material.side = THREE.DoubleSide;
    ring.castShadow = true;
    const lip = new THREE.Mesh(new THREE.TorusGeometry(1.65, 0.2, 5, 12), stone);
    lip.rotation.x = Math.PI / 2;
    lip.position.y = 1.1;
    const waterDisc = new THREE.Mesh(new THREE.CircleGeometry(1.5, 16), new THREE.MeshStandardMaterial({ color: '#1f4d52', roughness: 0.2 }));
    waterDisc.rotation.x = -Math.PI / 2;
    waterDisc.position.y = 0.5;
    well.add(ring, lip, waterDisc);
    for (const s of [-1, 1]) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.22, 2.8, 0.22), this.wood);
      post.position.set(s * 1.75, 1.4, 0);
      post.castShadow = true;
      well.add(post);
    }
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 3.8, 6), this.wood);
    beam.rotation.z = Math.PI / 2;
    beam.position.y = 2.7;
    const rope = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.3, 4), new THREE.MeshStandardMaterial({ color: '#d8c49b' }));
    rope.position.y = 2.05;
    const bucket = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.2, 0.35, 8), this.wood);
    bucket.position.y = 1.3;
    well.add(beam, rope, bucket);
    this.animated.push((t) => { bucket.rotation.y = Math.sin(t * 0.8) * 0.4; rope.rotation.z = Math.sin(t * 0.9) * 0.03; });
    this.scene.add(well);
    this.addCollider(cx + 2, cz, 2.0);

    // One post and pad per contact link, in an arc west of the well.
    contact.forEach((c, i) => {
      const a = (-0.62 + (i / (contact.length - 1)) * 1.24) * 1.1;
      const px = cx + 2 - Math.cos(a) * 8.5;
      const pz = cz + Math.sin(a) * 9;
      const board = new THREE.Mesh(
        new THREE.BoxGeometry(2.4, 1.4, 0.12),
        [this.wood, this.wood, this.wood, this.wood,
          new THREE.MeshStandardMaterial({ map: signTexture(c.label, { bg: c.color, sub: c.value, w: 768, h: 448 }) }),
          new THREE.MeshStandardMaterial({ map: signTexture(c.label, { bg: c.color, sub: c.value, w: 768, h: 448 }) })],
      );
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 2.4, 6), this.wood);
      const g = new THREE.Group();
      g.position.set(px, 0, pz);
      g.rotation.y = Math.atan2(-(px - (cx + 2)), -(pz - cz)) + Math.PI;
      post.position.y = 1.2;
      board.position.y = 2.4;
      board.castShadow = post.castShadow = true;
      g.add(post, board);
      this.scene.add(g);
      this.addCollider(px, pz, 0.4);
      const fwd = new THREE.Vector3(0, 0, 2.6).applyAxisAngle(new THREE.Vector3(0, 1, 0), g.rotation.y);
      this.addTrigger({ id: `contact:${c.id}`, x: px + fwd.x, z: pz + fwd.z, r: 1.5, label: c.label, color: c.color, action: { type: 'link', item: c } });
    });
  }

  buildPlayground() {
    const { x, z } = ZONES.playground;
    // A lane of rugs leading to the jars.
    const lane = new THREE.Mesh(new THREE.PlaneGeometry(4.5, 18), new THREE.MeshStandardMaterial({ map: rugTexture('#2f6f73', '#f4e3c1', '#b5473a'), roughness: 1 }));
    lane.material.map.repeat.set(1, 4);
    lane.rotation.x = -Math.PI / 2;
    lane.position.set(x, 0.025, z + 2);
    lane.receiveShadow = true;
    this.scene.add(lane);
    this.groundLabel([{ text: ui.sections.playground, size: 260 }], x - 7.5, z + 6, 10, 2.4);
    this.jarOrigin = { x, z: z - 5 };
    this.resetTrigger = this.addTrigger({ id: 'reset', x: x + 6.5, z: z + 11, r: 1.6, label: ui.reset, color: '#b5473a', action: { type: 'reset' } });
  }

  buildOasis() {
    const { x, z } = ZONES.oasis;
    const R = (this.pondRadius = 8);
    const shore = new THREE.Mesh(new THREE.CircleGeometry(R + 1.6, 40), new THREE.MeshStandardMaterial({ color: '#c79a62', roughness: 1, transparent: true, opacity: 0.8 }));
    shore.rotation.x = -Math.PI / 2;
    shore.position.set(x, 0.015, z);
    shore.receiveShadow = true;
    this.scene.add(shore);
    const water = new THREE.Mesh(
      new THREE.CircleGeometry(R, 48),
      new THREE.ShaderMaterial({
        transparent: true,
        uniforms: { t: { value: 0 }, center: { value: new THREE.Vector2(x, z) }, R: { value: R } },
        vertexShader: `varying vec2 vW; void main(){ vec4 w = modelMatrix * vec4(position,1.0); vW = w.xz; gl_Position = projectionMatrix * viewMatrix * w; }`,
        fragmentShader: `uniform float t; uniform vec2 center; uniform float R; varying vec2 vW;
          void main(){ float d = length(vW - center) / R;
            vec3 deep = vec3(0.12, 0.45, 0.5); vec3 shallow = vec3(0.35, 0.75, 0.72);
            vec3 col = mix(deep, shallow, smoothstep(0.3, 1.0, d));
            float w = sin(vW.x * 1.3 + t * 1.5) * sin(vW.y * 1.1 - t * 1.2) + sin((vW.x + vW.y) * 2.1 + t * 2.0) * 0.5;
            col += smoothstep(0.9, 1.4, w) * 0.25;
            col += smoothstep(0.92, 1.0, d) * 0.35;
            gl_FragColor = vec4(col, 0.88); }`,
      }),
    );
    water.rotation.x = -Math.PI / 2;
    water.position.set(x, 0.05, z);
    this.scene.add(water);
    this.water = water;
    this.animated.push((t) => { water.material.uniforms.t.value = t; });
    // Reeds on the bank.
    const reedGeo = new THREE.ConeGeometry(0.05, 1.6, 4);
    const reedMat = new THREE.MeshStandardMaterial({ color: '#6f8f3a', flatShading: true });
    const reeds = new THREE.InstancedMesh(reedGeo, reedMat, 60);
    seed = 42;
    for (let i = 0; i < 60; i++) {
      const a = rand() * Math.PI * 2;
      const r = R - 0.4 + rand() * 1.2;
      reeds.setMatrixAt(i, mtx(x + Math.cos(a) * r, 0.7, z + Math.sin(a) * r, (rand() - 0.5) * 0.3, 0, (rand() - 0.5) * 0.3, 1, 0.6 + rand() * 0.6, 1));
    }
    this.scene.add(reeds);
    this.groundLabel([{ text: ui.sections.oasis, size: 260 }], x, z - R - 3.5, 10, 2.4);
  }

  buildScatter() {
    seed = 11;
    const palm = palmGeometry();
    const palms = [];
    // Ring of palms around the oasis.
    const o = ZONES.oasis;
    for (let i = 0; i < 11; i++) {
      const a = (i / 11) * Math.PI * 2 + rand() * 0.3;
      const r = this.pondRadius + 3 + rand() * 3;
      palms.push([o.x + Math.cos(a) * r, o.z + Math.sin(a) * r]);
    }
    // Groves elsewhere, avoiding the zones.
    const groves = [[18, 8], [-18, -22], [22, -26], [-22, 8], [12, 50], [-40, 42], [50, 18], [-52, -30], [45, -38], [0, 20]];
    for (const [gx, gz] of groves) {
      const n = 2 + Math.floor(rand() * 3);
      for (let i = 0; i < n; i++) palms.push([gx + (rand() - 0.5) * 7, gz + (rand() - 0.5) * 7]);
    }
    // Palms on the dunes beyond the play area.
    for (let i = 0; i < 26; i++) {
      const a = rand() * Math.PI * 2;
      const r = 72 + rand() * 50;
      palms.push([Math.cos(a) * r, Math.sin(a) * r]);
    }
    const palmMesh = new THREE.InstancedMesh(palm, this.decorMat, palms.length);
    palms.forEach(([px, pz], i) => {
      const s = 0.8 + rand() * 0.5;
      palmMesh.setMatrixAt(i, mtx(px, heightAt(px, pz) - 0.1, pz, 0, rand() * Math.PI * 2, 0, s));
      if (Math.hypot(px, pz) < PLAY_RADIUS + 3) this.addCollider(px, pz, 0.45 * s);
    });
    palmMesh.castShadow = true;
    palmMesh.receiveShadow = true;
    this.scene.add(palmMesh);
    this.palmMesh = palmMesh;
    this.palmBase = palms.map((_, i) => { const m = new THREE.Matrix4(); palmMesh.getMatrixAt(i, m); return m; });

    // Rocks.
    for (let v = 0; v < 3; v++) {
      const list = [];
      for (let i = 0; i < 14; i++) {
        const a = rand() * Math.PI * 2;
        const far = rand() < 0.5;
        const r = far ? 64 + rand() * 60 : 12 + rand() * 50;
        const px = Math.cos(a) * r, pz = Math.sin(a) * r;
        if (!far && this.nearZone(px, pz, 13)) continue;
        list.push([px, pz, far ? 2 + rand() * 4 : 0.6 + rand() * 1.4]);
      }
      const rocks = new THREE.InstancedMesh(rockGeometry(v), this.decorMat, list.length);
      list.forEach(([px, pz, s], i) => {
        rocks.setMatrixAt(i, mtx(px, heightAt(px, pz), pz, 0, rand() * 6, 0, s, s * (0.7 + rand() * 0.5), s));
        if (Math.hypot(px, pz) < PLAY_RADIUS + s) this.addCollider(px, pz, s * 0.85);
      });
      rocks.castShadow = rocks.receiveShadow = true;
      this.scene.add(rocks);
    }

    // Shrubs (no collision).
    const shrubs = [];
    for (let i = 0; i < (this.mobile ? 50 : 90); i++) {
      const a = rand() * Math.PI * 2;
      const r = 8 + rand() * 100;
      const px = Math.cos(a) * r, pz = Math.sin(a) * r;
      if (r < PLAY_RADIUS && this.nearZone(px, pz, 9)) continue;
      shrubs.push([px, pz]);
    }
    const shrubMesh = new THREE.InstancedMesh(shrubGeometry(), this.decorMat, shrubs.length);
    shrubs.forEach(([px, pz], i) => shrubMesh.setMatrixAt(i, mtx(px, heightAt(px, pz), pz, 0, rand() * 6, 0, 0.7 + rand() * 0.8)));
    shrubMesh.castShadow = true;
    this.scene.add(shrubMesh);
  }

  nearZone(x, z, r) {
    if (Math.hypot(x, z) < 12) return true;
    return Object.values(ZONES).some((q) => Math.hypot(x - q.x, z - q.z) < r + 6);
  }

  // A few birds circling high over the oasis.
  buildBirds() {
    const mat = new THREE.MeshBasicMaterial({ color: '#3a2a22', side: THREE.DoubleSide });
    const birds = [];
    for (let i = 0; i < 5; i++) {
      const b = new THREE.Group();
      const wingGeo = new THREE.BufferGeometry();
      wingGeo.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0.2, 0, 0, -0.2, 1, 0, 0], 3));
      const l = new THREE.Mesh(wingGeo, mat);
      const r = new THREE.Mesh(wingGeo, mat);
      r.rotation.y = Math.PI;
      b.add(l, r);
      b.userData = { l, r, a: i * 1.3, rad: 10 + i * 3, h: 16 + i * 1.5, sp: 0.18 + i * 0.03 };
      this.scene.add(b);
      birds.push(b);
    }
    const o = ZONES.oasis;
    this.animated.push((t) => {
      for (const b of birds) {
        const u = b.userData;
        const a = u.a + t * u.sp;
        b.position.set(o.x + Math.cos(a) * u.rad, u.h + Math.sin(t + u.a) * 0.5, o.z - 10 + Math.sin(a) * u.rad);
        b.rotation.y = -a;
        const f = Math.sin(t * 8 + u.a) * 0.5;
        u.l.rotation.z = f;
        u.r.rotation.z = -f;
      }
    });
  }

  // Palms sway in the wind (instance matrices re-composed with a small tilt).
  swayPalms(t) {
    if (!this.palmMesh) return;
    const m = new THREE.Matrix4();
    const r = new THREE.Matrix4();
    for (let i = 0; i < this.palmBase.length; i++) {
      r.makeRotationZ(Math.sin(t * 0.9 + i) * 0.025);
      m.multiplyMatrices(this.palmBase[i], r);
      this.palmMesh.setMatrixAt(i, m);
    }
    this.palmMesh.instanceMatrix.needsUpdate = true;
  }

  update(t, dt) {
    for (const f of this.animated) f(t, dt);
    this.swayPalms(t);
  }
}

export { FONT_DISPLAY };
