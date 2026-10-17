import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

// ---------------------------------------------------------------------------
// UI: slides, dots, next / get started, skip, swipe
// ---------------------------------------------------------------------------
const SLIDES = 3;
const screenEl = document.getElementById('screen');
const copies = [...document.querySelectorAll('.slide-copy')];
const dots = [...document.querySelectorAll('.dot')];
const nextBtn = document.getElementById('next');
const skipBtn = document.getElementById('skip');
let slide = 0;
const listeners = [];

function go(n) {
  n = Math.max(0, Math.min(SLIDES - 1, n));
  if (n === slide) return;
  slide = n;
  copies.forEach((c, i) => c.classList.toggle('is-active', i === n));
  dots.forEach((d, i) => {
    d.classList.toggle('is-active', i === n);
    d.setAttribute('aria-selected', String(i === n));
  });
  const last = n === SLIDES - 1;
  nextBtn.classList.toggle('is-last', last);
  nextBtn.setAttribute('aria-label', last ? 'Get started' : 'Next');
  skipBtn.hidden = last;
  listeners.forEach((fn) => fn(n));
}

nextBtn.addEventListener('click', () => go(slide === SLIDES - 1 ? 0 : slide + 1));
skipBtn.addEventListener('click', () => go(SLIDES - 1));
window.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowRight') go(slide + 1);
  if (e.key === 'ArrowLeft') go(slide - 1);
});
let dragX = null;
screenEl.addEventListener('pointerdown', (e) => { if (!e.target.closest('button')) dragX = e.clientX; });
window.addEventListener('pointerup', (e) => {
  if (dragX === null) return;
  const dx = e.clientX - dragX;
  dragX = null;
  if (Math.abs(dx) > 40) go(slide + (dx < 0 ? 1 : -1));
});
// Allow deep links like #2 for the third slide.
const hashSlide = parseInt(location.hash.slice(1), 10);

// ---------------------------------------------------------------------------
// Three.js setup
// ---------------------------------------------------------------------------
const canvas = document.getElementById('scene');
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
} catch (err) {
  document.documentElement.classList.add('no-webgl');
  if (hashSlide > 0) go(hashSlide);
  throw err;
}
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.setClearColor(0x000000, 0);

const scene = new THREE.Scene();
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(makeEnvScene(), 0.03).texture;

// Reflection environment: the onboarding gradient wrapped around a sphere, plus a few
// soft studio panels, so metal and gloss pick up blue, violet, pink and peach.
function makeEnvScene() {
  const env = new THREE.Scene();
  const sky = new THREE.Mesh(new THREE.SphereGeometry(20, 48, 24), new THREE.ShaderMaterial({
    side: THREE.BackSide,
    uniforms: {},
    vertexShader: 'varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: `varying vec3 vP;
      vec3 ramp(float t){
        vec3 c0 = vec3(0.0, 0.10, 0.92);
        vec3 c1 = vec3(0.30, 0.42, 0.95);
        vec3 c2 = vec3(0.62, 0.55, 0.92);
        vec3 c3 = vec3(0.97, 0.55, 0.80);
        vec3 c4 = vec3(0.98, 0.70, 0.42);
        if (t < 0.25) return mix(c0, c1, t / 0.25);
        if (t < 0.5) return mix(c1, c2, (t - 0.25) / 0.25);
        if (t < 0.75) return mix(c2, c3, (t - 0.5) / 0.25);
        return mix(c3, c4, (t - 0.75) / 0.25);
      }
      void main(){
        vec3 d = normalize(vP);
        float t = clamp(0.5 - d.y * 0.62, 0.0, 1.0);
        vec3 col = ramp(t);
        // teal sweep on the left, magenta on the right
        col = mix(col, vec3(0.25, 0.85, 0.9), smoothstep(0.5, 1.0, -d.x) * 0.45 * (1.0 - abs(d.y)));
        col = mix(col, vec3(1.0, 0.45, 0.85), smoothstep(0.5, 1.0, d.x) * 0.4 * (1.0 - abs(d.y)));
        gl_FragColor = vec4(col, 1.0);
      }`,
  }));
  env.add(sky);
  const panel = (w, h, pos, color, intensity) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(intensity), side: THREE.DoubleSide }));
    m.position.set(...pos);
    m.lookAt(0, 0, 0);
    env.add(m);
  };
  panel(8, 4, [-6, 9, 8], 0xffffff, 2.4);
  panel(3, 10, [10, 2, 4], 0xffc6ea, 1.6);
  panel(3, 8, [-10, 0, 2], 0x9ff2ff, 1.3);
  panel(10, 2, [0, -8, 6], 0xffd2a8, 1.2);
  return env;
}

const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
const CAM_BASE = new THREE.Vector3(0, 0.55, 10.5);
const lookTarget = new THREE.Vector3(0, -0.35, 0);

// Lighting: cool sky from above, warm pink/peach bounce from the gradient below.
scene.add(new THREE.HemisphereLight(0x8fa2ff, 0xf29ac0, 0.4));
const key = new THREE.DirectionalLight(0xfff1ee, 0.9);
key.position.set(-3, 5, 6);
scene.add(key);
const rim = new THREE.DirectionalLight(0xff8fd8, 1.6);
rim.position.set(5, 1, -2);
scene.add(rim);
const fill = new THREE.DirectionalLight(0x6f8dff, 1.1);
fill.position.set(-5, -1, 2);
scene.add(fill);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const rbox = (w, h, d, r, seg = 4) => new RoundedBoxGeometry(w, h, d, seg, Math.min(r, w / 2, h / 2, d / 2) - 1e-4);

function roundedRectShape(w, h, r, cx = 0, cy = 0, hole = false) {
  const s = hole ? new THREE.Path() : new THREE.Shape();
  const x = cx - w / 2, y = cy - h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r);
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h);
  s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r);
  s.quadraticCurveTo(x, y, x + r, y);
  return s;
}

function frameGeometry(w, h, r, thickness, depth) {
  const shape = roundedRectShape(w, h, r);
  shape.holes.push(roundedRectShape(w - thickness * 2, h - thickness * 2, Math.max(r - thickness, 0.01), 0, 0, true));
  const g = new THREE.ExtrudeGeometry(shape, {
    depth, bevelEnabled: true, bevelThickness: depth * 0.35, bevelSize: thickness * 0.3, bevelSegments: 3, curveSegments: 10,
  });
  g.translate(0, 0, -depth / 2);
  return g;
}

function canvasTexture(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

const mat = {
  shell: (color, sheen = 0xb6a8ff, irid = 1) => new THREE.MeshPhysicalMaterial({
    color, metalness: 0.8, roughness: 0.26, clearcoat: 1, clearcoatRoughness: 0.08,
    iridescence: irid, iridescenceIOR: 1.6, iridescenceThicknessRange: [300, 800],
    sheen: 0.35, sheenColor: new THREE.Color(sheen), envMapIntensity: 1.05,
  }),
  plastic: (color, rough = 0.38) => new THREE.MeshPhysicalMaterial({
    color, roughness: rough, metalness: 0.05, clearcoat: 0.6, clearcoatRoughness: 0.3, envMapIntensity: 0.9,
  }),
  metal: (color, rough = 0.28) => new THREE.MeshStandardMaterial({ color, metalness: 0.85, roughness: rough, envMapIntensity: 1.2 }),
  matte: (color, rough = 0.85) => new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: 0 }),
};

function clamp01(t) { return Math.max(0, Math.min(1, t)); }

// ---------------------------------------------------------------------------
// Globe badge texture (dark oval with a lime globe and plane)
// ---------------------------------------------------------------------------
const badgeTex = canvasTexture(256, 320, (g, w, h) => {
  const grd = g.createRadialGradient(w * 0.45, h * 0.4, 10, w / 2, h / 2, w * 0.7);
  grd.addColorStop(0, '#2a2f5c');
  grd.addColorStop(1, '#0c0d22');
  g.fillStyle = grd;
  g.fillRect(0, 0, w, h);
  g.save();
  g.translate(w / 2, h / 2 + 6);
  g.shadowColor = 'rgba(190, 240, 120, 0.9)';
  g.shadowBlur = 22;
  g.strokeStyle = '#c4ec7c';
  g.lineWidth = 7;
  g.beginPath(); g.arc(0, 0, 62, 0, Math.PI * 2); g.stroke();
  g.lineWidth = 4;
  g.beginPath(); g.ellipse(0, 0, 28, 62, 0, 0, Math.PI * 2); g.stroke();
  g.beginPath(); g.moveTo(-62, 0); g.lineTo(62, 0); g.stroke();
  g.beginPath(); g.moveTo(-54, -30); g.quadraticCurveTo(0, -20, 54, -30); g.stroke();
  g.beginPath(); g.moveTo(-54, 30); g.quadraticCurveTo(0, 40, 54, 30); g.stroke();
  // continents
  g.fillStyle = '#9ee08a';
  g.beginPath(); g.ellipse(-18, -16, 20, 14, -0.5, 0, Math.PI * 2); g.fill();
  g.beginPath(); g.ellipse(20, 22, 14, 18, 0.4, 0, Math.PI * 2); g.fill();
  // stand
  g.strokeStyle = '#c4ec7c'; g.lineWidth = 6;
  g.beginPath(); g.arc(0, 0, 80, Math.PI * 0.2, Math.PI * 0.8); g.stroke();
  g.beginPath(); g.moveTo(0, 80); g.lineTo(0, 100); g.moveTo(-24, 102); g.lineTo(24, 102); g.stroke();
  // plane
  g.translate(30, -54);
  g.rotate(-0.6);
  g.fillStyle = '#f2ffe0';
  g.shadowBlur = 10;
  g.beginPath();
  g.moveTo(0, -30); g.quadraticCurveTo(6, -26, 5, -6); g.lineTo(28, 6); g.lineTo(28, 12); g.lineTo(5, 6);
  g.lineTo(4, 22); g.lineTo(12, 28); g.lineTo(12, 32); g.lineTo(0, 28); g.lineTo(-12, 32); g.lineTo(-12, 28);
  g.lineTo(-4, 22); g.lineTo(-5, 6); g.lineTo(-28, 12); g.lineTo(-28, 6); g.lineTo(-5, -6); g.quadraticCurveTo(-6, -26, 0, -30);
  g.fill();
  g.restore();
});

// Interior of the open case: deep blue with darker walls for a sense of depth
const cavityTex = canvasTexture(256, 320, (g, w, h) => {
  g.fillStyle = '#3442b8';
  g.fillRect(0, 0, w, h);
  const edge = (x0, y0, x1, y1) => {
    const grd = g.createLinearGradient(x0, y0, x1, y1);
    grd.addColorStop(0, 'rgba(10, 12, 60, 0.9)');
    grd.addColorStop(1, 'rgba(10, 12, 60, 0)');
    return grd;
  };
  g.fillStyle = edge(0, 0, 0, 60); g.fillRect(0, 0, w, 60);
  g.fillStyle = edge(0, h, 0, h - 40); g.fillRect(0, h - 40, w, 40);
  g.fillStyle = edge(0, 0, 50, 0); g.fillRect(0, 0, 50, h);
  g.fillStyle = edge(w, 0, w - 40, 0); g.fillRect(w - 40, 0, 40, h);
});

function planarUV(geo, w, h) {
  const p = geo.attributes.position;
  const uvs = new Float32Array(p.count * 2);
  for (let i = 0; i < p.count; i++) {
    uvs[i * 2] = p.getX(i) / w + 0.5;
    uvs[i * 2 + 1] = p.getY(i) / h + 0.5;
  }
  geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
}

// ---------------------------------------------------------------------------
// Suitcase
// ---------------------------------------------------------------------------
const W = 1.3, H = 1.62, D = 0.86, R = 0.24;

function makeSuitcase({ body = 0x8c9cff, sheen = 0x8fd8ff, accent = 0xb4c40c, trim = 0xd8c39d, wheel = 0xe7b49c, hero = false, lining = 0xaab6f2, irid = 1 } = {}) {
  const root = new THREE.Group();
  const shellMat = mat.shell(body, sheen, irid);
  if (irid < 1) { shellMat.metalness = 0.25; shellMat.roughness = 0.3; }
  const accentMat = mat.plastic(accent, 0.32);
  const trimMat = mat.metal(trim, 0.3);
  const wheelMat = mat.metal(wheel, 0.32);
  const half = D / 2;

  // Back shell: sits behind the seam (z < 0)
  const back = new THREE.Mesh(rbox(W, H, half, R, 5), shellMat);
  back.position.z = -half / 2;
  root.add(back);

  // Lid pivots around the left edge of the seam
  const hinge = new THREE.Group();
  hinge.position.set(-W / 2, 0, 0);
  root.add(hinge);
  const lid = new THREE.Group();
  lid.position.set(W / 2, 0, half / 2);
  hinge.add(lid);
  lid.add(new THREE.Mesh(rbox(W, H, half, R, 5), shellMat));

  // Seam trim: a thin metal frame on each shell edge
  const seamGeo = frameGeometry(W + 0.012, H + 0.012, R * 0.9, 0.05, 0.03);
  const seamBack = new THREE.Mesh(seamGeo, trimMat);
  seamBack.position.z = -0.012;
  root.add(seamBack);
  const seamLid = new THREE.Mesh(seamGeo, trimMat);
  seamLid.position.z = -half / 2 + 0.012;
  lid.add(seamLid);

  // Front face details on the lid: a raised pillow panel split by two deep vertical
  // grooves, a pill-shaped emboss at the top, a slot at the bottom and the glass badge.
  const fz = half / 2; // lid front face (lid local)
  const panelH = H * 0.8;
  const centreW = W * 0.5;
  const groove = 0.06;
  const sideW = (W - 0.2 - centreW) / 2 - groove;
  const centre = new THREE.Mesh(rbox(centreW, panelH, 0.12, 0.055), shellMat);
  centre.position.set(0, 0, fz + 0.02);
  lid.add(centre);
  for (const sx of [-1, 1]) {
    const strip = new THREE.Mesh(rbox(sideW, panelH * 0.94, 0.12, 0.05), shellMat);
    strip.position.set(sx * (centreW / 2 + groove + sideW / 2), 0, fz + 0.02);
    lid.add(strip);
  }
  const darkMat = shellMat.clone();
  darkMat.color = new THREE.Color(body).multiplyScalar(0.55);
  const grooveFill = new THREE.Mesh(rbox(W - 0.2, panelH * 0.9, 0.04, 0.02), darkMat);
  grooveFill.position.set(0, 0, fz + 0.005);
  lid.add(grooveFill);
  const emboss = new THREE.Mesh(frameGeometry(0.36, 0.17, 0.085, 0.05, 0.06), shellMat);
  emboss.position.set(0, H * 0.3, fz + 0.1);
  lid.add(emboss);
  const embossIn = new THREE.Mesh(rbox(0.27, 0.08, 0.02, 0.04), darkMat);
  embossIn.position.set(0, H * 0.3, fz + 0.08);
  lid.add(embossIn);
  const lowSlot = new THREE.Mesh(rbox(0.3, 0.055, 0.03, 0.027), darkMat);
  lowSlot.position.set(0, -H * 0.33, fz + 0.075);
  lid.add(lowSlot);
  const lowLip = new THREE.Mesh(frameGeometry(0.34, 0.09, 0.045, 0.022, 0.03), shellMat);
  lowLip.position.set(0, -H * 0.33, fz + 0.09);
  lid.add(lowLip);

  // Glass badge: a dark oval with a glowing globe, in a thin metal rim
  const badgeRim = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.05, 48), trimMat);
  badgeRim.rotation.x = Math.PI / 2;
  badgeRim.scale.set(1, 1, 1.38);
  badgeRim.position.set(0, -0.06, fz + 0.09);
  lid.add(badgeRim);
  const badge = new THREE.Mesh(new THREE.CircleGeometry(0.135, 48), new THREE.MeshPhysicalMaterial({
    map: badgeTex, emissiveMap: badgeTex, emissive: 0xffffff, emissiveIntensity: 0.6,
    roughness: 0.08, clearcoat: 1, metalness: 0.1,
  }));
  badge.scale.set(1, 1.38, 1);
  badge.position.set(0, -0.06, fz + 0.117);
  lid.add(badge);

  // Corner bumpers: chunky lime caps that wrap each corner, front and side
  const capGeo = rbox(0.36, 0.36, half + 0.12, 0.15, 5);
  for (const sx of [-1, 1]) for (const sy of [-1, 1]) {
    const cb = new THREE.Mesh(capGeo, accentMat);
    cb.position.set(sx * (W / 2 - 0.12), sy * (H / 2 - 0.12), -half / 2 - 0.06);
    root.add(cb);
    const cl = new THREE.Mesh(capGeo, accentMat);
    cl.position.set(sx * (W / 2 - 0.12), sy * (H / 2 - 0.12), 0.06);
    lid.add(cl);
  }

  // Telescoping handle
  const handle = new THREE.Group();
  handle.position.set(0, H / 2, -half * 0.55);
  for (const sx of [-1, 1]) {
    const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.032, 0.62, 16), trimMat);
    tube.position.set(sx * 0.27, 0.31, 0);
    handle.add(tube);
    const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.16, 16), accentMat);
    sleeve.position.set(sx * 0.27, 0.58, 0);
    handle.add(sleeve);
  }
  const grip = new THREE.Mesh(rbox(0.7, 0.13, 0.15, 0.06), accentMat);
  grip.position.y = 0.68;
  handle.add(grip);
  const base = new THREE.Mesh(rbox(0.74, 0.06, 0.2, 0.03), accentMat);
  base.position.y = 0.01;
  handle.add(base);
  root.add(handle);

  // Side carry handle (right side)
  const side = new THREE.Mesh(rbox(0.08, 0.6, 0.14, 0.04), accentMat);
  side.position.set(W / 2 + 0.03, 0, -half * 0.35);
  root.add(side);

  // Spinner wheels
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const wg = new THREE.Group();
    wg.position.set(sx * (W / 2 - 0.15), -H / 2 - 0.06, sz * half * 0.62);
    const house = new THREE.Mesh(rbox(0.2, 0.14, 0.2, 0.06), accentMat);
    wg.add(house);
    for (const ox of [-0.06, 0.06]) {
      const wh = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.06, 28), wheelMat);
      wh.rotation.z = Math.PI / 2;
      wh.position.set(ox, -0.13, 0);
      wg.add(wh);
      const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.066, 16), accentMat);
      hub.rotation.z = Math.PI / 2;
      hub.position.set(ox, -0.13, 0);
      wg.add(hub);
    }
    root.add(wg);
  }

  // Interior surfaces (seen when the lid opens)
  const innerGeo = new THREE.ShapeGeometry(roundedRectShape(W - 0.12, H - 0.12, R * 0.7), 8);
  planarUV(innerGeo, W - 0.12, H - 0.12);
  const inner = new THREE.Mesh(innerGeo, new THREE.MeshStandardMaterial({ map: cavityTex, roughness: 0.75 }));
  inner.position.z = 0.004;
  root.add(inner);
  const linerMat = mat.shell(lining, 0xbff0ff, 0.6);
  linerMat.metalness = 0.45;
  const liner = new THREE.Mesh(new THREE.ShapeGeometry(roundedRectShape(W - 0.12, H - 0.12, R * 0.7), 8), linerMat);
  liner.rotation.y = Math.PI;
  liner.position.z = -half / 2 - 0.004;
  lid.add(liner);
  const pocket = new THREE.Mesh(rbox(W * 0.66, H * 0.5, 0.03, 0.05), linerMat);
  pocket.position.set(0, -H * 0.12, -half / 2 - 0.02);
  lid.add(pocket);

  if (hero) {
    // Stickers on the right side
    const stickerHeart = new THREE.Mesh(new THREE.CircleGeometry(0.07, 24), mat.plastic(0xff8fc4, 0.4));
    stickerHeart.position.set(W / 2 + 0.002, H * 0.18, -half * 0.75);
    stickerHeart.rotation.y = Math.PI / 2;
    root.add(stickerHeart);
    const stickerStar = new THREE.Mesh(new THREE.CircleGeometry(0.055, 5), mat.plastic(0xa9f0ff, 0.4));
    stickerStar.position.set(W / 2 + 0.002, H * 0.3, -half * 0.3);
    stickerStar.rotation.y = Math.PI / 2;
    root.add(stickerStar);
  }

  return { root, hinge, lid, back };
}

// ---------------------------------------------------------------------------
// Packed items for slide 2
// ---------------------------------------------------------------------------
function stripes(colorA, colorB, n = 14) {
  return canvasTexture(256, 256, (g, w, h) => {
    g.fillStyle = colorA; g.fillRect(0, 0, w, h);
    g.fillStyle = colorB;
    for (let i = 0; i < n; i++) g.fillRect((i + 0.5) * (w / n), 0, w / n / 3, h);
  });
}

function makeItems() {
  const items = new THREE.Group();
  const list = [];
  const add = (obj, pos, rot = [0, 0, 0], delay = 0, float = 0) => {
    obj.position.set(...pos);
    obj.rotation.set(...rot);
    obj.userData = { base: obj.position.clone(), rot: obj.rotation.clone(), delay, float };
    items.add(obj);
    list.push(obj);
    return obj;
  };

  // Folded clothes
  const pink = new THREE.Mesh(rbox(0.86, 0.17, 0.32, 0.07), mat.matte(0xf3a9c4, 0.9));
  add(pink, [-0.05, -0.55, 0.16], [0, 0, 0.02], 0.05);
  const lilac = new THREE.Mesh(rbox(0.84, 0.15, 0.3, 0.07), mat.matte(0xd9c7f7, 0.9));
  add(lilac, [-0.08, -0.69, 0.13], [0, 0, -0.02], 0.02);
  const shirtTex = stripes('#eef0ff', '#7e8fdd', 18);
  const shirt = new THREE.Group();
  const shirtBody = new THREE.Mesh(rbox(0.8, 0.17, 0.34, 0.07), new THREE.MeshStandardMaterial({ map: shirtTex, roughness: 0.85 }));
  shirt.add(shirtBody);
  const collar = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.03, 8, 20, Math.PI), new THREE.MeshStandardMaterial({ color: 0xf2f3ff, roughness: 0.8 }));
  collar.position.set(0.12, 0.09, 0.08);
  collar.rotation.x = -Math.PI / 2;
  shirt.add(collar);
  add(shirt, [-0.1, -0.38, 0.22], [0.08, 0, -0.06], 0.1);
  const tee = new THREE.Mesh(rbox(0.78, 0.16, 0.3, 0.07), mat.matte(0xcdbcf2, 0.9));
  add(tee, [0.0, 0.1, 0.1], [0, 0, 0.03], 0.12);

  // Passport
  const passportTex = canvasTexture(160, 220, (g, w, h) => {
    g.fillStyle = '#b7756a'; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#f3d6b2'; g.fillStyle = '#f3d6b2'; g.lineWidth = 4;
    g.font = '600 18px Manrope, sans-serif'; g.textAlign = 'center';
    g.fillText('PASSPORT', w / 2, 46);
    g.beginPath(); g.arc(w / 2, h / 2 + 10, 34, 0, Math.PI * 2); g.stroke();
    g.beginPath(); g.ellipse(w / 2, h / 2 + 10, 14, 34, 0, 0, Math.PI * 2); g.stroke();
    g.beginPath(); g.moveTo(w / 2 - 34, h / 2 + 10); g.lineTo(w / 2 + 34, h / 2 + 10); g.stroke();
    g.fillRect(w / 2 - 12, h - 40, 24, 12);
  });
  const passport = new THREE.Group();
  passport.add(new THREE.Mesh(rbox(0.36, 0.48, 0.045, 0.03), mat.matte(0xa3655c, 0.7)));
  const pfront = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.46), new THREE.MeshStandardMaterial({ map: passportTex, roughness: 0.6 }));
  pfront.position.z = 0.024;
  passport.add(pfront);
  add(passport, [-0.28, 0.2, 0.3], [0.1, 0.15, 0.22], 0.2, 1);

  // Sunglasses
  const glasses = new THREE.Group();
  const lensMat = new THREE.MeshPhysicalMaterial({ color: 0x6a2e14, roughness: 0.05, metalness: 0.2, clearcoat: 1, transparent: true, opacity: 0.88 });
  const frameMat = mat.plastic(0x8a4a24, 0.3);
  for (const sx of [-1, 1]) {
    const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.02, 28), lensMat);
    lens.rotation.x = Math.PI / 2;
    lens.position.x = sx * 0.12;
    glasses.add(lens);
    const rimG = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.014, 8, 28), frameMat);
    rimG.position.x = sx * 0.12;
    glasses.add(rimG);
    const arm = new THREE.Mesh(rbox(0.02, 0.02, 0.26, 0.009), frameMat);
    arm.position.set(sx * 0.22, 0.03, -0.13);
    glasses.add(arm);
  }
  const bridge = new THREE.Mesh(new THREE.TorusGeometry(0.035, 0.012, 6, 12, Math.PI), frameMat);
  bridge.position.y = 0.02;
  glasses.add(bridge);
  add(glasses, [-0.25, -0.12, 0.42], [0.35, -0.2, 0.32], 0.26, 0.6);

  // Camera
  const cam = new THREE.Group();
  cam.add(new THREE.Mesh(rbox(0.42, 0.26, 0.16, 0.04), mat.plastic(0xe9dcd8, 0.4)));
  const camTop = new THREE.Mesh(rbox(0.42, 0.1, 0.162, 0.03), mat.plastic(0x2b2635, 0.5));
  camTop.position.y = 0.1;
  cam.add(camTop);
  const lensBarrel = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.095, 0.12, 32), mat.metal(0x3a3442, 0.35));
  lensBarrel.rotation.x = Math.PI / 2;
  lensBarrel.position.set(0.02, -0.02, 0.12);
  cam.add(lensBarrel);
  const glass = new THREE.Mesh(new THREE.CircleGeometry(0.065, 32), new THREE.MeshPhysicalMaterial({ color: 0x223355, roughness: 0.05, metalness: 0.5, clearcoat: 1 }));
  glass.position.set(0.02, -0.02, 0.181);
  cam.add(glass);
  const shutter = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.04, 16), mat.metal(0xd7c3a8));
  shutter.position.set(-0.13, 0.17, 0);
  cam.add(shutter);
  add(cam, [0.3, 0.22, 0.34], [0.12, -0.25, -0.12], 0.3, 0.8);

  // Headphones
  const phones = new THREE.Group();
  const phoneMat = mat.plastic(0x8fc7e6, 0.35);
  const band = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.035, 12, 40, Math.PI), phoneMat);
  phones.add(band);
  for (const sx of [-1, 1]) {
    const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.08, 28), phoneMat);
    cup.rotation.z = Math.PI / 2;
    cup.position.set(sx * 0.2, -0.04, 0);
    phones.add(cup);
    const pad = new THREE.Mesh(new THREE.TorusGeometry(0.065, 0.025, 10, 24), mat.matte(0xc8e6f6));
    pad.rotation.y = Math.PI / 2;
    pad.position.set(sx * 0.16, -0.04, 0);
    phones.add(pad);
  }
  add(phones, [0.28, -0.2, 0.38], [0.5, -0.5, 0.15], 0.34, 0.5);

  // Clear toiletry pouch with bottles
  const pouch = new THREE.Group();
  pouch.add(new THREE.Mesh(rbox(0.44, 0.3, 0.2, 0.06), new THREE.MeshPhysicalMaterial({
    color: 0xffffff, roughness: 0.08, transmission: 0.9, thickness: 0.2, transparent: true, opacity: 0.55, clearcoat: 1,
  })));
  const zip = new THREE.Mesh(rbox(0.46, 0.03, 0.04, 0.012), mat.metal(0xd8c39d));
  zip.position.set(0, 0.14, 0.06);
  pouch.add(zip);
  [[-0.12, 0xf5e9df], [0, 0xd8f0ee], [0.12, 0xf6d7e8]].forEach(([x, c], i) => {
    const b = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.18 - i * 0.02, 16), mat.plastic(c, 0.3));
    b.position.set(x, -0.03, 0);
    pouch.add(b);
  });
  add(pouch, [0.3, -0.58, 0.25], [0.05, -0.15, 0.04], 0.16, 0.3);

  // Notebook and tickets above the case
  const book = new THREE.Group();
  const pageMat = mat.matte(0xf6ecdf, 0.8);
  for (const sx of [-1, 1]) {
    const p = new THREE.Mesh(rbox(0.22, 0.3, 0.02, 0.01), pageMat);
    p.position.x = sx * 0.11;
    p.rotation.y = sx * -0.25;
    book.add(p);
  }
  const cover = new THREE.Mesh(rbox(0.48, 0.32, 0.012, 0.006), mat.matte(0xb4876d, 0.7));
  cover.position.z = -0.03;
  book.add(cover);
  add(book, [0.08, 0.72, 0.3], [0.1, 0.2, 0.22], 0.38, 1.4);

  const tickets = new THREE.Group();
  const ticketTex = canvasTexture(128, 256, (g, w, h) => {
    g.fillStyle = '#f8f4f6'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#9fb5e8'; g.fillRect(0, 0, w, 40);
    g.fillStyle = '#c8c3d8';
    for (let i = 0; i < 6; i++) g.fillRect(16, 60 + i * 26, 60 + (i % 3) * 14, 8);
  });
  for (let i = 0; i < 3; i++) {
    const t = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.34), new THREE.MeshStandardMaterial({ map: ticketTex, side: THREE.DoubleSide, roughness: 0.7 }));
    t.position.set(i * 0.05, i * 0.02, i * 0.01);
    t.rotation.z = -0.25 - i * 0.12;
    tickets.add(t);
  }
  add(tickets, [0.38, 0.86, 0.2], [0.2, -0.3, 0], 0.42, 1.2);

  // Floating travel adapter (lime cube)
  const adapter = new THREE.Group();
  adapter.add(new THREE.Mesh(rbox(0.2, 0.2, 0.2, 0.05), mat.plastic(0xd1dc2a, 0.35)));
  for (const p of [[-0.04, 0.03], [0.04, 0.03], [0, -0.05]]) {
    const pin = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.03, 8), mat.matte(0x3b3a2a));
    pin.rotation.x = Math.PI / 2;
    pin.position.set(p[0], p[1], 0.105);
    adapter.add(pin);
  }
  add(adapter, [-0.25, 0.98, 0.35], [0.4, 0.6, 0.2], 0.46, 1.8);

  return { items, list };
}

// ---------------------------------------------------------------------------
// Helical text ribbons ("TRAVEL LIKE NEVER BEFORE", "LET'S GET READY!")
// ---------------------------------------------------------------------------
// The lettering is printed on the inside of a ribbon wound into a helix around the
// suitcase, as in the original: the back passes read normally (seen from inside),
// the front pass crosses in front of the case mirrored, and the case hides what is
// behind it. Each word is placed at an angle (radians, 0 = straight behind the case,
// increasing clockwise seen from above).
//
// Letters are signed-distance-field glyphs: one bent quad per letter, sampled from a
// small SDF atlas and antialiased in the shader, so edges stay sharp and smooth at any
// size, angle or screen density.

// Signed distance field atlas (after Mapbox's TinySDF)
const SDF_FONT_PX = 112, SDF_PAD = 14, SDF_RADIUS = 14, SDF_CUTOFF = 0.25;
const DISPLAY_FONT = '"Archivo Black", "Arial Black", Impact, sans-serif';

function edt1d(grid, offset, stride, length, f, v, z) {
  v[0] = 0; z[0] = -1e20; z[1] = 1e20; f[0] = grid[offset];
  for (let q = 1, k = 0, s = 0; q < length; q++) {
    f[q] = grid[offset + q * stride];
    const q2 = q * q;
    do {
      const r = v[k];
      s = (f[q] - f[r] + q2 - r * r) / (q - r) / 2;
    } while (s <= z[k] && --k > -1);
    k++; v[k] = q; z[k] = s; z[k + 1] = 1e20;
  }
  for (let q = 0, k = 0; q < length; q++) {
    while (z[k + 1] < q) k++;
    const r = v[k], qr = q - r;
    grid[offset + q * stride] = f[r] + qr * qr;
  }
}
function edt(grid, w, h) {
  const n = Math.max(w, h);
  const f = new Float64Array(n), v = new Uint16Array(n), z = new Float64Array(n + 1);
  for (let x = 0; x < w; x++) edt1d(grid, x, w, h, f, v, z);
  for (let y = 0; y < h; y++) edt1d(grid, y * w, 1, w, f, v, z);
}

function buildGlyphAtlas(chars) {
  const c = document.createElement('canvas');
  const g = c.getContext('2d', { willReadFrequently: true });
  const font = `400 ${SDF_FONT_PX}px ${DISPLAY_FONT}`;
  g.font = font;
  const cellH = Math.ceil(SDF_FONT_PX * 1.05) + SDF_PAD * 2;
  const baseline = SDF_PAD + Math.round(SDF_FONT_PX * 0.86);
  const metrics = {};
  const atlasW = 1024;
  let x = 0, y = 0;
  for (const ch of chars) {
    const adv = g.measureText(ch).width;
    const w = Math.ceil(adv) + SDF_PAD * 2;
    if (x + w > atlasW) { x = 0; y += cellH; }
    metrics[ch] = { x, y, w, h: cellH, adv };
    x += w;
  }
  const atlasH = y + cellH;
  c.width = atlasW; c.height = atlasH;
  const out = g.createImageData(atlasW, atlasH);
  for (const ch of chars) {
    const m = metrics[ch];
    // Rasterise the glyph alone, then turn its coverage into distances.
    const gc = document.createElement('canvas');
    gc.width = m.w; gc.height = m.h;
    const gg = gc.getContext('2d', { willReadFrequently: true });
    gg.font = font;
    gg.fillStyle = '#000';
    gg.textBaseline = 'alphabetic';
    gg.fillText(ch, SDF_PAD, baseline);
    const alpha = gg.getImageData(0, 0, m.w, m.h).data;
    const len = m.w * m.h;
    const outer = new Float64Array(len), inner = new Float64Array(len);
    for (let i = 0; i < len; i++) {
      const a = alpha[i * 4 + 3] / 255;
      if (a === 1) { outer[i] = 0; inner[i] = 1e20; }
      else if (a === 0) { outer[i] = 1e20; inner[i] = 0; }
      else { const d = Math.max(0, 0.5 - a); outer[i] = d * d; const e = Math.max(0, a - 0.5); inner[i] = e * e; }
    }
    edt(outer, m.w, m.h);
    edt(inner, m.w, m.h);
    for (let py = 0; py < m.h; py++) for (let px = 0; px < m.w; px++) {
      const i = py * m.w + px;
      const d = Math.sqrt(outer[i]) - Math.sqrt(inner[i]);
      const val = Math.round(255 - 255 * (d / SDF_RADIUS + SDF_CUTOFF));
      const o = ((m.y + py) * atlasW + m.x + px) * 4;
      const cv = Math.max(0, Math.min(255, val));
      out.data[o] = out.data[o + 1] = out.data[o + 2] = cv;
      out.data[o + 3] = 255;
    }
  }
  g.putImageData(out, 0, 0);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.NoColorSpace;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return { tex, metrics, atlasW, atlasH, baseline, cellH };
}

const glyphMaterialShader = {
  vertexShader: `
    varying vec2 vUv; varying float vV;
    attribute float glyphV;
    void main() {
      vUv = uv; vV = glyphV;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }`,
  fragmentShader: `
    uniform sampler2D map; uniform vec3 colorTop; uniform vec3 colorBottom; uniform float opacity;
    varying vec2 vUv; varying float vV;
    void main() {
      float d = texture2D(map, vUv).r;
      float w = max(fwidth(d), 0.002) * 0.7;
      float a = smoothstep(${(1 - SDF_CUTOFF).toFixed(3)} - w, ${(1 - SDF_CUTOFF).toFixed(3)} + w, d) * opacity;
      if (a < 0.004) discard;
      gl_FragColor = vec4(mix(colorBottom, colorTop, vV), a);
    }`,
};

const textRibbons = [];

// spec: words [[text, angle]], radius, height (cap band), pitch per turn, from/to angles
function makeRibbon(words, { radius = 1.1, height = 0.46, pitch = 2.3, from = -1, to = 7.3 } = {}) {
  const group = new THREE.Group();
  const material = new THREE.ShaderMaterial({
    ...glyphMaterialShader,
    uniforms: {
      map: { value: null },
      colorTop: { value: new THREE.Color(0xfdf3f6) },
      colorBottom: { value: new THREE.Color(0xf3dbe4) },
      opacity: { value: 1 },
    },
    side: THREE.DoubleSide, transparent: true, depthWrite: false,
  });
  material.extensions = { derivatives: true };
  const mesh = new THREE.Mesh(new THREE.BufferGeometry(), material);
  mesh.renderOrder = 5;
  mesh.frustumCulled = false;
  group.add(mesh);
  const rb = { group, mesh, material, words, radius, height, pitch, from, to, quads: [], last: '' };
  // Animated by GSAP: spread (0 = squashed ring, 1 = full helix), spin, opacity, anchor
  rb.params = { spread: 1, spin: 0, opacity: 0, anchor: 'top' };

  rb.layout = (atlas) => {
    material.uniforms.map.value = atlas.tex;
    const em = height * 1.38;                  // world size of one em (caps fill the band)
    const k = em / SDF_FONT_PX;               // world units per atlas pixel
    const baseY = -height * 0.5;              // baseline sits at the bottom of the cap band
    const COLS = 6;
    rb.quads = [];
    for (const [word, angle] of words) {
      const chars = [...word];
      const total = chars.reduce((s, ch) => s + atlas.metrics[ch].adv * k, 0);
      let s = (angle - from) * radius - total / 2;
      for (const ch of chars) {
        const m = atlas.metrics[ch];
        rb.quads.push({
          s0: s - SDF_PAD * k, s1: s - SDF_PAD * k + m.w * k,
          y0: baseY - (m.h - atlas.baseline) * k, y1: baseY + atlas.baseline * k,
          u0: m.x / atlas.atlasW, u1: (m.x + m.w) / atlas.atlasW,
          v0: 1 - (m.y + m.h) / atlas.atlasH, v1: 1 - m.y / atlas.atlasH,
        });
        s += m.adv * k;
      }
    }
    const nq = rb.quads.length;
    const verts = nq * (COLS + 1) * 2;
    const geo = new THREE.BufferGeometry();
    const uv = new Float32Array(verts * 2), gv = new Float32Array(verts), idx = [];
    rb.quads.forEach((q, qi) => {
      for (let j = 0; j <= COLS; j++) {
        const t = j / COLS;
        const vi = (qi * (COLS + 1) + j) * 2;
        const u = q.u0 + (q.u1 - q.u0) * t;
        uv.set([u, q.v0, u, q.v1], vi * 2);
        gv[vi] = 0; gv[vi + 1] = 1;
        if (j < COLS) idx.push(vi, vi + 2, vi + 1, vi + 1, vi + 2, vi + 3);
      }
    });
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(verts * 3), 3));
    geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    geo.setAttribute('glyphV', new THREE.BufferAttribute(gv, 1));
    geo.setIndex(idx);
    mesh.geometry.dispose();
    mesh.geometry = geo;
    rb.cols = COLS;
    rb.last = '';
  };

  // The drop per turn is eased so the ribbon runs nearly level across the back and falls
  // steeply down the sides and across the front, as in the original.
  const drop = (phi) => (pitch * (phi - 0.75 * Math.sin(phi))) / (Math.PI * 2);
  const y0 = drop(from), span = drop(to) - y0;
  rb.shape = (spread, anchor) => {
    const key = spread.toFixed(4) + anchor;
    if (key === rb.last || !rb.quads.length) return;
    rb.last = key;
    const p = mesh.geometry.attributes.position.array;
    rb.quads.forEach((q, qi) => {
      for (let j = 0; j <= rb.cols; j++) {
        const s = q.s0 + (q.s1 - q.s0) * (j / rb.cols);
        const phi = from + s / radius;
        const x = Math.sin(phi) * radius, z = -Math.cos(phi) * radius;
        const g = (drop(phi) - y0) / span;
        const yc = anchor === 'top' ? span / 2 - span * g * spread : -span / 2 + span * (1 - g) * spread;
        const vi = (qi * (rb.cols + 1) + j) * 2;
        p.set([x, yc + q.y0, z, x, yc + q.y1, z], vi * 3);
      }
    });
    mesh.geometry.attributes.position.needsUpdate = true;
  };

  rb.apply = () => {
    const { spread, spin, opacity, anchor } = rb.params;
    group.visible = opacity > 0.002 && rb.quads.length > 0;
    if (!group.visible) return;
    rb.shape(spread, anchor);
    mesh.rotation.y = spin;
    material.uniforms.opacity.value = opacity;
  };
  textRibbons.push(rb);
  return rb;
}

// Build the glyph atlas once the display face is ready (or after a short wait).
const fontReady = Promise.race([
  document.fonts
    ? Promise.all([document.fonts.load(`400 100px ${DISPLAY_FONT}`), document.fonts.load('800 35px Manrope'), document.fonts.load('500 12px Manrope')])
      .then(() => document.fonts.ready)
    : Promise.resolve(),
  new Promise((r) => setTimeout(r, 2500)),
]).catch(() => {});
const ribbonsReady = fontReady.then(() => {
  const chars = new Set();
  textRibbons.forEach((rb) => rb.words.forEach(([w]) => [...w].forEach((ch) => chars.add(ch))));
  const atlas = buildGlyphAtlas([...chars]);
  textRibbons.forEach((rb) => rb.layout(atlas));
});

// ---------------------------------------------------------------------------
// Luggage carousel for slide 3
// ---------------------------------------------------------------------------
function makeCarousel() {
  const group = new THREE.Group();
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(3.2, 0, -7.5),
    new THREE.Vector3(2.0, 0, -4.4),
    new THREE.Vector3(0.3, 0, -1.8),
    new THREE.Vector3(-0.15, 0, 0.3),
    new THREE.Vector3(0.9, 0, 1.5),
    new THREE.Vector3(2.7, 0, 2.0),
    new THREE.Vector3(4.6, 0, 2.3),
  ], false, 'catmullrom', 0.4);

  // Belt base (dark trough) and edges
  const beltW = 2.6;
  const slatMat = new THREE.MeshStandardMaterial({ color: 0x5b5057, roughness: 0.45, metalness: 0.1, envMapIntensity: 0.4 });
  const slatGeo = rbox(beltW, 0.06, 0.2, 0.03, 2);
  const slats = [];
  const N = 120;
  for (let i = 0; i < N; i++) {
    const s = new THREE.Mesh(slatGeo, slatMat);
    group.add(s);
    slats.push(s);
  }
  // Solid bed under the slats
  const bedPos = [], bedIdx = [];
  const BS = 160;
  for (let i = 0; i <= BS; i++) {
    const t = i / BS;
    const p = curve.getPointAt(t);
    const tan = curve.getTangentAt(t);
    const n = new THREE.Vector3(-tan.z, 0, tan.x).normalize();
    for (const side of [-1, 1]) {
      const q = p.clone().addScaledVector(n, side * (beltW / 2 + 0.05));
      bedPos.push(q.x, -0.06, q.z);
    }
    if (i < BS) bedIdx.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2);
  }
  const bedGeo = new THREE.BufferGeometry();
  bedGeo.setAttribute('position', new THREE.Float32BufferAttribute(bedPos, 3));
  bedGeo.setIndex(bedIdx);
  bedGeo.computeVertexNormals();
  group.add(new THREE.Mesh(bedGeo, new THREE.MeshStandardMaterial({ color: 0x1c171c, roughness: 0.9, side: THREE.DoubleSide })));

  const railMat = mat.metal(0xd9c9d6, 0.25);
  const sideMat = new THREE.MeshStandardMaterial({ color: 0x8a7f8c, roughness: 0.35, metalness: 0.6 });
  for (const off of [-1, 1]) {
    const pts = curve.getSpacedPoints(120).map((p, i, arr) => {
      const t = i / (arr.length - 1);
      const tan = curve.getTangentAt(t);
      const n = new THREE.Vector3(-tan.z, 0, tan.x).normalize();
      return p.clone().addScaledVector(n, off * (beltW / 2 + 0.08));
    });
    const railCurve = new THREE.CatmullRomCurve3(pts);
    const rail = new THREE.Mesh(new THREE.TubeGeometry(railCurve, 200, 0.09, 12, false), railMat);
    rail.position.y = 0.04;
    group.add(rail);
    const skirtPts = pts.map((p) => p.clone().setY(-0.25));
    const skirt = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(skirtPts), 200, 0.16, 8, false), sideMat);
    group.add(skirt);
  }

  // X-ray tunnel at the belt entry
  const tunnel = new THREE.Group();
  const shellShape = roundedRectShape(3.3, 2.5, 0.6);
  shellShape.holes.push(roundedRectShape(2.8, 2.05, 0.4, 0, -0.12, true));
  const tunnelGeo = new THREE.ExtrudeGeometry(shellShape, { depth: 1.8, bevelEnabled: true, bevelThickness: 0.12, bevelSize: 0.1, bevelSegments: 4, curveSegments: 12 });
  tunnelGeo.translate(0, 0, -0.9);
  tunnel.add(new THREE.Mesh(tunnelGeo, mat.plastic(0xecd3d9, 0.32)));
  const curtainTex = canvasTexture(256, 256, (g, w, h) => {
    g.fillStyle = '#3d2c33'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 16; i++) {
      g.fillStyle = i % 2 ? '#5a3f45' : '#4a333a';
      g.fillRect(i * 16 + 1, 0, 14, h);
    }
  });
  const curtain = new THREE.Mesh(new THREE.PlaneGeometry(2.8, 2.05), new THREE.MeshStandardMaterial({ map: curtainTex, roughness: 0.8 }));
  curtain.position.set(0, -0.12, 0.6);
  tunnel.add(curtain);
  const lightBar = new THREE.Mesh(rbox(1.3, 0.12, 0.05, 0.05), new THREE.MeshStandardMaterial({ color: 0xbfe6ff, emissive: 0x9fd6ff, emissiveIntensity: 1.1 }));
  lightBar.position.set(-0.2, 0.98, 1.0);
  tunnel.add(lightBar);
  const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.06, 16, 12), new THREE.MeshStandardMaterial({ color: 0xffa040, emissive: 0xff8a20, emissiveIntensity: 2 }));
  lamp.position.set(0.9, 0.98, 1.0);
  tunnel.add(lamp);
  const tStart = curve.getPointAt(0.14);
  const tTan = curve.getTangentAt(0.14);
  tunnel.position.copy(tStart).setY(1.05);
  tunnel.rotation.y = Math.atan2(tTan.x, tTan.z);
  group.add(tunnel);

  // Other luggage riding the belt
  const others = [];
  // pose: 'up' stands on its wheels, 'side' lies on its side, 'back' lies face up
  const place = (sc, [x, z], pose, yaw, scale) => {
    const r = sc.root;
    r.scale.setScalar(scale);
    const lift = pose === 'up' ? H / 2 + 0.22 : pose === 'side' ? W / 2 + 0.06 : D / 2 + 0.08;
    r.position.set(x, lift * scale, z);
    r.rotation.set(pose === 'back' ? -Math.PI / 2 : 0, yaw, pose === 'side' ? Math.PI / 2 : 0, 'YXZ');
    r.userData = { base: r.position.clone() };
    group.add(r);
    others.push(sc);
  };
  const yellow = makeSuitcase({ irid: 0.15, body: 0xf6c23e, sheen: 0xffe3a0, accent: 0xf6a838, trim: 0xf3d79a, wheel: 0xf0c27a, lining: 0xf6d27a });
  place(yellow, [-1.15, -0.75], 'side', 0.25, 0.86);
  const orange = makeSuitcase({ irid: 0.15, body: 0xf47a1e, sheen: 0xffb080, accent: 0xf3b48e, trim: 0xf6c9a6, wheel: 0xf0a780, lining: 0xf6a070 });
  place(orange, [-0.55, 0.3], 'up', 0.35, 0.62);
  const teal = makeSuitcase({ irid: 0.3, body: 0x5cc4cf, sheen: 0xa8f0ff, accent: 0xd1dc2a, trim: 0xd8c39d, wheel: 0xd9b9a0, lining: 0x9fe0e6 });
  place(teal, [-0.25, -2.9], 'side', -0.1, 0.86);
  const tealSmall = makeSuitcase({ irid: 0.3, body: 0x86d6de, sheen: 0xd0f8ff, accent: 0xf5a7d2, trim: 0xd8c39d, wheel: 0xf0c6d8, lining: 0x9fe0e6 });
  place(tealSmall, [2.1, 2.0], 'up', -0.3, 0.6);

  return { group, curve, slats, others, beltW };
}

// ---------------------------------------------------------------------------
// Build the scene
// ---------------------------------------------------------------------------
const world = new THREE.Group();
scene.add(world);

const hero = makeSuitcase({ hero: true });
const heroRig = new THREE.Group(); // animated transform
heroRig.add(hero.root);
world.add(heroRig);
const { items, list: itemList } = makeItems();
hero.back.add(items);
items.position.z = D / 4 + 0.005; // just in front of the back shell's open face
items.scale.setScalar(1.2);

const ring1 = makeRibbon([['TRAVEL', 0], ['LIKE', 1.8], ['NEVER', 3.75], ['BEFORE', Math.PI * 2]],
  { radius: 1.2, height: 0.42, pitch: 2.75, from: -1.1, to: Math.PI * 2 + 1.1 });
world.add(ring1.group);
// Slide 3's ribbon is two coordinated strands so each word lands where it does in the
// reference: LET'S across the top left, READY! down the lower left, GET down the right.
const ring2 = makeRibbon([["LET'S", 0], ['READY!', 5.0]],
  { radius: 1.9, height: 0.56, pitch: 3.4, from: -1.15, to: 6.6 });
world.add(ring2.group);
const ring2b = makeRibbon([['GET', 1.4]], { radius: 1.9, height: 0.56, pitch: 3.4, from: 0.2, to: 2.6 });
world.add(ring2b.group);

const carousel = makeCarousel();
const BELT_Y = -0.5 - (H / 2 + 0.22) * 0.92;
world.add(carousel.group);

// The carousel is drawn first as a backdrop; the hero case and ribbons are drawn over
// it with fresh depth, so the lettering passes in front of the belt and other luggage
// (as in the original) while still wrapping behind the hero case.
const FRONT = 1;
const toFront = (o) => o.traverse((c) => c.layers.set(FRONT));
toFront(heroRig);
toFront(ring1.group);
toFront(ring2.group);
toFront(ring2b.group);
scene.traverse((c) => { if (c.isLight) c.layers.enableAll(); });
renderer.autoClear = false;
function render() {
  renderer.clear();
  camera.layers.set(0);
  renderer.render(scene, camera);
  renderer.clearDepth();
  camera.layers.set(FRONT);
  renderer.render(scene, camera);
}

// ---------------------------------------------------------------------------
// Choreography (GSAP), timed against the reference recording
// ---------------------------------------------------------------------------
const { gsap } = window;
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const POSES = [
  { x: 0, y: -0.8, z: 0, ry: -0.15, rx: 0.1, rz: -0.05, s: 1.02, lid: 0, items: 0, belt: 0, camY: 0.55 },
  { x: 0.38, y: -0.9, z: 0, ry: -Math.PI * 2 - 0.3, rx: 0.24, rz: 0.04, s: 1.12, lid: 1, items: 1, belt: 0, camY: 0.55 },
  { x: 0.3, y: -0.5, z: 0.75, ry: -Math.PI * 4 - 0.58, rx: 0, rz: 0, s: 0.92, lid: 0, items: 0, belt: 1, camY: 4.2 },
];
const state = { ...POSES[0], loopTurn: 0 };

// --- Ribbon timelines -------------------------------------------------------
// Enter: the lettering starts squashed into a ring at the top and uncoils down around
// the case while spinning into place. On slide 1 it then breathes: every few seconds it
// coils back up and unwinds again (the original's looping clip), with the case turning.
function ribbonIntro(rbs, { delay = 0, loop = false, turn = false } = {}) {
  const ps = rbs.map((rb) => rb.params);
  gsap.killTweensOf(ps);
  if (turn) gsap.killTweensOf(state, 'loopTurn');
  const tl = gsap.timeline({ delay });
  tl.set(ps, { anchor: 'top', spread: 0, spin: Math.PI * 0.9, opacity: 0 })
    .to(ps, { opacity: 1, duration: 0.18, ease: 'power1.out' }, 0)
    .to(ps, { spread: 1, duration: 1.0, ease: 'power3.out' }, 0)
    .to(ps, { spin: 0, duration: 1.1, ease: 'power3.out' }, 0);
  if (turn) tl.fromTo(state, { loopTurn: 0 }, { loopTurn: -0.38, duration: 1.6, ease: 'power2.out' }, 0);
  if (loop && !reduceMotion) {
    tl.add(() => {
      const breathe = gsap.timeline({ repeat: -1, repeatDelay: 2.4, delay: 2.4 });
      breathe
        .to(ps, { spread: 0, spin: -Math.PI * 0.9, duration: 0.55, ease: 'power2.in' })
        .set(ps, { spin: Math.PI * 0.9 })
        .to(ps, { spread: 1, spin: 0, duration: 1.0, ease: 'power3.out' });
      if (turn) {
        breathe.to(state, { loopTurn: 0, duration: 0.55, ease: 'power2.in' }, 0)
          .to(state, { loopTurn: -0.38, duration: 1.6, ease: 'power2.out' }, 0.55);
      }
      rbs.forEach((rb) => { rb.loop = breathe; });
    });
  }
  return tl;
}

// Exit: spin hard and collapse onto the bottom coil while fading.
function ribbonExit(rbs) {
  const ps = rbs.map((rb) => rb.params).filter((p) => p.opacity > 0.002);
  rbs.forEach((rb) => { rb.loop?.kill(); rb.loop = null; });
  gsap.killTweensOf(rbs.map((rb) => rb.params));
  if (!ps.length) return;
  gsap.set(ps, { anchor: 'bottom' });
  gsap.timeline()
    .to(ps, { spin: '-=3.4', duration: 0.6, ease: 'power2.in' }, 0)
    .to(ps, { spread: 0, duration: 0.6, ease: 'power2.inOut' }, 0)
    .to(ps, { opacity: 0, duration: 0.3, ease: 'power1.in' }, 0.28);
}

// --- Copy (SplitText) -------------------------------------------------------
// Titles leave together in a quick blur, then come back line by line, letter by letter.
const copySplits = copies.map((section) => {
  const lines = [...section.querySelectorAll('.ln')];
  const p = section.querySelector('p');
  return { section, lines, p, chars: [] };
});
let copyReady = false;
function splitCopy() {
  if (!window.SplitText) return;
  gsap.registerPlugin(window.SplitText);
  copySplits.forEach((c) => {
    c.chars = c.lines.map((ln) => new window.SplitText(ln, { type: 'chars', charsClass: 'ch' }).chars);
  });
  copyReady = true;
  screenEl.classList.add('gsap-copy');
}
function copyOut(i) {
  const c = copySplits[i];
  if (!c) return;
  const targets = [...c.chars.flat(), ...(c.p ? [c.p] : [])];
  if (!targets.length) return;
  gsap.killTweensOf(targets);
  gsap.to(targets, { autoAlpha: 0, filter: 'blur(10px)', y: -4, duration: 0.18, ease: 'power1.in', stagger: 0.004 });
}
function copyIn(i, delay = 0.3) {
  const c = copySplits[i];
  if (!c) return;
  c.chars.forEach((chars, li) => {
    if (!chars.length) return;
    gsap.killTweensOf(chars);
    gsap.fromTo(chars, { autoAlpha: 0, filter: 'blur(12px)', y: 10 },
      { autoAlpha: 1, filter: 'blur(0px)', y: 0, duration: 0.55, ease: 'power3.out', stagger: 0.022, delay: delay + li * 0.14 });
  });
  if (c.p) {
    gsap.killTweensOf(c.p);
    gsap.fromTo(c.p, { autoAlpha: 0, filter: 'blur(8px)', y: 6 },
      { autoAlpha: 1, filter: 'blur(0px)', y: 0, duration: 0.5, ease: 'power2.out', delay: delay + 0.3 });
  }
}

// --- Slide changes ------------------------------------------------------------
let sceneTl = null;
function enterSlide(n, prev, instant = false) {
  const pose = POSES[n];
  sceneTl?.kill();
  if (instant) {
    Object.assign(state, pose);
    return;
  }
  const tl = gsap.timeline();
  sceneTl = tl;
  const to = (keys, at, duration, ease) => {
    const vars = { duration, ease };
    keys.forEach((k) => { vars[k] = pose[k]; });
    tl.to(state, vars, at);
  };
  if (n === 1 && prev === 0) {
    // Spin a full turn, swing the lid open, pop the packed items
    state.ry += state.loopTurn;
    gsap.killTweensOf(state, 'loopTurn');
    state.loopTurn = 0;
    to(['ry'], 0.05, 0.85, 'power3.inOut');
    to(['x', 'y', 's'], 0.1, 0.85, 'power3.inOut');
    to(['rx', 'rz'], 0.15, 0.7, 'power2.inOut');
    to(['lid'], 0.3, 0.75, 'back.out(1.2)');
    to(['items'], 0.42, 0.65, 'none');
  } else if (n === 2 && prev === 1) {
    // Carousel slides in, the open case rides onto it, the lid shuts as it turns
    to(['x', 'y', 'z', 's', 'rx', 'rz'], 0.1, 0.65, 'power3.out');
    to(['belt', 'camY'], 0.1, 0.7, 'power3.out');
    to(['items'], 0.66, 0.25, 'power1.in');
    to(['lid'], 0.72, 0.35, 'power2.inOut');
    to(['ry'], 0.66, 0.55, 'power2.inOut');
  } else {
    // Any other move: take the short way round and ease everything together
    const d = state.ry + state.loopTurn - pose.ry;
    state.ry = pose.ry + (d - Math.round(d / (Math.PI * 2)) * Math.PI * 2);
    gsap.killTweensOf(state, 'loopTurn');
    state.loopTurn = 0;
    to(Object.keys(pose), 0, 0.8, 'power3.inOut');
  }

  if (n === 0) ribbonIntro([ring1], { delay: 0.35, loop: true, turn: true });
  else ribbonExit([ring1]);
  if (n === 2) ribbonIntro([ring2, ring2b], { delay: 0.35 });
  else ribbonExit([ring2, ring2b]);

  if (copyReady) {
    copyOut(prev);
    copyIn(n);
  }
}
let prevSlide = 0;
listeners.push((n) => { enterSlide(n, prevSlide); prevSlide = n; });

function layout() {
  const rect = canvas.getBoundingClientRect();
  const w = Math.max(1, rect.width), h = Math.max(1, rect.height);
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  // Keep the composition framed on wide or narrow screens: fit width as well as height.
  const refAspect = 390 / 844;
  const widthFit = Math.max(1, refAspect / camera.aspect);
  camera.userData.dist = CAM_BASE.z * Math.max(1, Math.min(widthFit, 1.6)) * (camera.aspect > 0.9 ? 1.15 : 1);
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', layout);
new ResizeObserver(layout).observe(canvas);
layout();

if (hashSlide > 0) {
  go(hashSlide);
  enterSlide(hashSlide, 0, true);
  prevSlide = hashSlide;
}

// First appearance: split the copy once fonts are in, then start the slide's ribbon.
Promise.all([fontReady, ribbonsReady]).then(() => {
  splitCopy();
  copySplits.forEach((c, i) => {
    const targets = [...c.chars.flat(), ...(c.p ? [c.p] : [])];
    if (i !== slide && targets.length) gsap.set(targets, { autoAlpha: 0 });
  });
  if (slide === 0) ribbonIntro([ring1], { delay: 0.15, loop: true, turn: true });
  if (slide === 2) ribbonIntro([ring2, ring2b], { delay: 0.15 });
});

// ---------------------------------------------------------------------------
// Frame loop
// ---------------------------------------------------------------------------
const tmpV = new THREE.Vector3();
let simT = 0;

function update() {
  simT = gsap.ticker.time;

  const bob = Math.sin(simT * 1.6) * 0.03 * (1 - state.belt);
  heroRig.position.set(state.x, state.y + bob, state.z);
  heroRig.rotation.set(state.rx, state.ry + state.loopTurn, state.rz);
  heroRig.scale.setScalar(state.s);
  hero.hinge.rotation.y = -Math.max(0, state.lid) * 1.66;

  // Items pop in with a stagger and float
  itemList.forEach((it) => {
    const d = it.userData;
    const p = clamp01((state.items - d.delay * 0.6) / (1 - d.delay * 0.6));
    const e = p <= 0 ? 0 : 1 - Math.pow(1 - p, 3) * Math.cos(p * Math.PI * 0.5);
    it.scale.setScalar(Math.max(0.0001, e));
    it.visible = p > 0.001;
    const fl = d.float * 0.035;
    it.position.set(d.base.x, d.base.y + Math.sin(simT * 1.4 + d.delay * 9) * fl + (1 - e) * -0.2, d.base.z + d.float * 0.06 * e);
    it.rotation.set(d.rot.x + Math.sin(simT * 0.9 + d.delay * 7) * 0.04 * d.float, d.rot.y, d.rot.z + Math.cos(simT * 1.1 + d.delay * 5) * 0.05 * d.float);
  });

  // Ribbon 1 wraps the floating case on slide 1
  ring1.group.position.set(state.x + 0.02, state.y + 0.12 + bob, state.z);
  ring1.group.rotation.set(-0.12, 0.3, 0.06);
  ring1.apply();

  // Ribbon 2 wraps the case on the carousel
  ring2.group.position.set(POSES[2].x - 0.3, POSES[2].y + 0.2, POSES[2].z);
  ring2.group.rotation.set(-0.2, -0.3, 0.68, 'ZXY');
  ring2.apply();
  ring2b.group.position.set(POSES[2].x + 0.3, POSES[2].y + 0.5, POSES[2].z);
  ring2b.group.rotation.set(-0.1, 0.9, 1.4, 'ZXY');
  ring2b.apply();

  // Carousel slides in from the right and the belt runs
  const b = state.belt;
  carousel.group.visible = b > 0.01;
  carousel.group.position.set((1 - b) * 7.5, BELT_Y, -(1 - b) * 1.5);
  const beltT = simT * 0.012;
  const N = carousel.slats.length;
  carousel.slats.forEach((s, i) => {
    const t = ((i / N + beltT) % 1 + 1) % 1;
    carousel.curve.getPointAt(t, s.position);
    carousel.curve.getTangentAt(t, tmpV);
    s.rotation.set(0, Math.atan2(tmpV.x, tmpV.z), 0);
  });
  carousel.others.forEach((o, i) => {
    const base = o.root.userData.base;
    o.root.position.set(base.x, base.y + Math.abs(Math.sin(simT * 2.2 + i * 1.7)) * 0.01, base.z + Math.sin(simT * 0.35 + i) * 0.04);
  });

  // Camera: rises on the last slide to look down onto the carousel
  const dist = camera.userData.dist || CAM_BASE.z;
  camera.position.set(CAM_BASE.x, state.camY, dist);
  lookTarget.set(0, -0.35 - (state.camY - CAM_BASE.y) * 0.08, 0);
  camera.lookAt(lookTarget);

  render();
}
// GSAP's ticker drives both the tweens and the render, so they stay in lockstep.
gsap.ticker.add(update);

// Debug/screenshot hook
window.__traveme = { go };
