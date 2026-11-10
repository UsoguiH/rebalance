// three.js toolkit: one shared renderer, pastel materials, primitive builders and the
// flat-shaded "viewport" override used for the Final vs. Viewport comparison.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { makeCanvas } from './draw2d.js';
import { rad } from './util.js';

export { THREE, RoundedBoxGeometry };

const VP_COLORS = [0xd9938f, 0x8fa6d9, 0xb592d9, 0xd9b98f, 0x8fd6bd, 0xd98fc0, 0x6a7f6f, 0xcfd98f, 0x9a8fd9, 0xe0a070];
export const VP_BG = '#a8c8ad';

export class Kit {
  constructor(w, h) {
    const r = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
    r.setPixelRatio(1); r.setSize(w, h, false);
    r.shadowMap.enabled = true; r.shadowMap.type = THREE.PCFSoftShadowMap;
    r.toneMapping = THREE.NeutralToneMapping; r.toneMappingExposure = 1.0;
    r.outputColorSpace = THREE.SRGBColorSpace;
    r.setClearColor(0x000000, 0);
    this.renderer = r; this.canvas = r.domElement; this.w = w; this.h = h;
    const pm = new THREE.PMREMGenerator(r);
    this.env = pm.fromScene(new RoomEnvironment(), 0.04).texture;
    this.vpMats = new Map();
    this.vpN = 0;
  }

  // Render and return the WebGL canvas. In viewport mode every mesh gets a flat clay colour.
  render(scene, camera, viewport = false) {
    const r = this.renderer;
    if (!scene.environment) { scene.environment = this.env; scene.environmentIntensity = scene.userData.envI ?? 0.55; }
    const swapped = [];
    const helpers = scene.userData.vpHelpers;
    if (helpers) helpers.visible = viewport;
    if (viewport) {
      scene.traverse((o) => {
        if (o.userData.finalOnly) { swapped.push([o, null, o.visible]); o.visible = false; return; }
        if (!o.isMesh || o.userData.keepMat) return;
        let m = this.vpMats.get(o.uuid);
        if (!m) {
          const col = o.userData.vp ?? VP_COLORS[this.vpN++ % VP_COLORS.length];
          m = new THREE.MeshLambertMaterial({ color: col, side: THREE.DoubleSide });
          this.vpMats.set(o.uuid, m);
        }
        swapped.push([o, o.material, o.visible]); o.material = m;
      });
      scene.environmentIntensity = 0.0;
    } else {
      scene.traverse((o) => { if (o.userData.vpOnly) { swapped.push([o, null, o.visible]); o.visible = false; } });
    }
    r.render(scene, camera);
    for (const [o, m, vis] of swapped) { if (m) o.material = m; o.visible = vis; }
    if (viewport) scene.environmentIntensity = scene.userData.envI ?? 0.55;
    return this.canvas;
  }
}

// ---- materials ------------------------------------------------------------------------------
export function mat(color, o = {}) {
  const physical = o.clearcoat != null || o.sheen != null || o.transmission != null || o.iridescence != null;
  const M = physical ? THREE.MeshPhysicalMaterial : THREE.MeshStandardMaterial;
  return new M({ color, roughness: 0.55, metalness: 0, ...o });
}
export const glossy = (color, o = {}) => mat(color, { roughness: 0.18, clearcoat: 1, clearcoatRoughness: 0.12, ...o });
export const matte = (color, o = {}) => mat(color, { roughness: 0.9, ...o });

export function canvasTex(w, h, draw) {
  const c = makeCanvas(w, h);
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; t.generateMipmaps = true;
  return t;
}

// ---- geometry -------------------------------------------------------------------------------
export function roundedRectShape(w, h, r) {
  const s = new THREE.Shape(), x = -w / 2, y = -h / 2;
  r = Math.min(r, w / 2, h / 2);
  s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.absarc(x + w - r, y + r, r, -Math.PI / 2, 0);
  s.lineTo(x + w, y + h - r); s.absarc(x + w - r, y + h - r, r, 0, Math.PI / 2);
  s.lineTo(x + r, y + h); s.absarc(x + r, y + h - r, r, Math.PI / 2, Math.PI);
  s.lineTo(x, y + r); s.absarc(x + r, y + r, r, Math.PI, Math.PI * 1.5);
  return s;
}

// Polygon with rounded corners.
export function roundedPoly(pts, r) {
  const s = new THREE.Shape(), n = pts.length;
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i + n - 1) % n], p1 = pts[i], p2 = pts[(i + 1) % n];
    const v0 = new THREE.Vector2(p0[0] - p1[0], p0[1] - p1[1]).normalize();
    const v2 = new THREE.Vector2(p2[0] - p1[0], p2[1] - p1[1]).normalize();
    const a = [p1[0] + v0.x * r, p1[1] + v0.y * r], b = [p1[0] + v2.x * r, p1[1] + v2.y * r];
    if (i === 0) s.moveTo(a[0], a[1]); else s.lineTo(a[0], a[1]);
    s.quadraticCurveTo(p1[0], p1[1], b[0], b[1]);
  }
  s.closePath();
  return s;
}

// Extruded rounded slab centred on the origin, facing +Z.
export function slab(w, h, r, depth = 0.05, bevel = 0.015, segs = 3) {
  const g = new THREE.ExtrudeGeometry(roundedRectShape(w, h, r), {
    depth, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelSegments: segs, curveSegments: 10,
  });
  g.translate(0, 0, -depth / 2);
  return g;
}

export function box(w, h, d, r = 0.02) { return new RoundedBoxGeometry(w, h, d, 3, Math.min(r, w / 2, h / 2, d / 2)); }

// A textured face (transparent canvas texture) floating just above a slab.
export function decal(w, h, tex, o = {}) {
  const m = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, toneMapped: false, ...o });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), m);
  mesh.userData.finalOnly = true;
  return mesh;
}

export function mesh(geo, material, o = {}) {
  const m = new THREE.Mesh(geo, material);
  m.castShadow = o.cast ?? true; m.receiveShadow = o.receive ?? true;
  if (o.pos) m.position.set(...o.pos);
  if (o.rot) m.rotation.set(...o.rot);
  if (o.scale) (Array.isArray(o.scale) ? m.scale.set(...o.scale) : m.scale.setScalar(o.scale));
  if (o.vp != null) m.userData.vp = o.vp;
  return m;
}

// The chunky 3D pointer arrow.
export function cursorMesh(color = 0x7a4be6, size = 1) {
  const shape = roundedPoly([[0, 0], [0.98, -0.5], [0.52, -0.62], [0.36, -1.12]], 0.09);
  const g = new THREE.ExtrudeGeometry(shape, { depth: 0.16, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.05, bevelSegments: 4, curveSegments: 8 });
  g.translate(-0.45, 0.55, -0.08);
  const m = mesh(g, glossy(color, { roughness: 0.32, clearcoatRoughness: 0.3 }), { vp: 0xd9a08f });
  m.scale.setScalar(size);
  return m;
}

export function keyLight(scene, pos, o = {}) {
  const l = new THREE.DirectionalLight(o.color ?? 0xffffff, o.intensity ?? 2.6);
  l.position.set(...pos);
  l.castShadow = true;
  const s = o.size ?? 8;
  Object.assign(l.shadow.camera, { left: -s, right: s, top: s, bottom: -s, near: 0.5, far: o.far ?? 60 });
  l.shadow.mapSize.set(o.map ?? 2048, o.map ?? 2048);
  l.shadow.bias = -0.0004; l.shadow.normalBias = 0.02; l.shadow.radius = o.radius ?? 5;
  if (o.target) { l.target.position.set(...o.target); scene.add(l.target); }
  scene.add(l);
  return l;
}

// Position a camera with a look-at target, dutch roll (degrees) and field of view.
export function setCam(cam, pos, target, roll = 0, fov = null) {
  cam.position.set(pos[0], pos[1], pos[2]);
  cam.up.set(0, 1, 0);
  cam.lookAt(target[0], target[1], target[2]);
  if (roll) cam.rotateZ(rad(roll));
  if (fov && fov !== cam.fov) { cam.fov = fov; cam.updateProjectionMatrix(); }
  cam.updateMatrixWorld();
}

// Top-down camera described the way a layout is read off a frame: the desk point at the centre
// of frame (cx, cz), how many world units the frame is wide (fw), and how far the picture is
// rotated counter-clockwise (rot, degrees). lean = [x, z] tips the camera off vertical.
export function topCam(cam, cx, cz, fw, rot = 0, lean = [0, 0], fov = 30) {
  const h = fw / (2 * Math.tan(rad(fov / 2)) * cam.aspect);
  setCam(cam, [cx + lean[0] * h, h, cz + lean[1] * h + 1e-3], [cx, 0, cz], 0, fov);
  // make "screen up" a fixed world direction so rot is stable even when leaning
  const a = rad(rot), up = new THREE.Vector3(Math.sin(a), 0, -Math.cos(a));
  cam.up.copy(up); cam.lookAt(cx, 0, cz); cam.up.set(0, 1, 0); cam.updateMatrixWorld();
  return h;
}

// Put an object on the ray through screen point (sx, sy in 0..1, y down) at distance d from the camera.
const _v = new THREE.Vector3();
export function screenPlace(obj, cam, sx, sy, d) {
  _v.set(sx * 2 - 1, 1 - sy * 2, 0.5).unproject(cam).sub(cam.position).normalize();
  obj.position.copy(cam.position).addScaledVector(_v, d);
  return obj;
}
// World size that spans `frac` of the frame width at distance d.
export const spanAt = (cam, frac, d) => frac * 2 * d * Math.tan(rad(cam.fov / 2)) * cam.aspect;
// Desk point (y = 0) seen at screen (sx, sy).
export function deskAt(cam, sx, sy, y = 0) {
  _v.set(sx * 2 - 1, 1 - sy * 2, 0.5).unproject(cam).sub(cam.position);
  const k = (y - cam.position.y) / _v.y;
  return [cam.position.x + _v.x * k, y, cam.position.z + _v.z * k];
}

export function makeCam(fov = 35, aspect = 16 / 9) { return new THREE.PerspectiveCamera(fov, aspect, 0.05, 200); }

// Blender-ish viewport dressing: floor grid plus dashed light/camera gizmos.
export function vpHelpers(scene, o = {}) {
  const grp = new THREE.Group();
  const grid = new THREE.GridHelper(o.size ?? 30, o.div ?? 30, 0x55665a, 0x86a08c);
  grid.position.y = o.y ?? 0.002; grp.add(grid);
  const lm = new THREE.LineBasicMaterial({ color: 0x1d2a22 });
  for (const p of o.gizmos ?? [[2.5, 3, -1], [-3, 4, 2]]) {
    const pts = [];
    for (let i = 0; i <= 40; i++) { const a = (i / 40) * Math.PI * 2; pts.push(new THREE.Vector3(Math.cos(a) * 0.45, 0, Math.sin(a) * 0.45)); }
    const ring = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), lm);
    ring.position.set(...p); grp.add(ring);
    const stem = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(...p), new THREE.Vector3(p[0], 0, p[2])]), lm);
    grp.add(stem);
  }
  for (const path of o.paths ?? []) {
    const curve = new THREE.CatmullRomCurve3(path.map((p) => new THREE.Vector3(...p)));
    grp.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(curve.getPoints(60)), lm));
  }
  grp.visible = false;
  scene.add(grp); scene.userData.vpHelpers = grp;
  return grp;
}
