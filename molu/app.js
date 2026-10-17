import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const { gsap } = window;
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const clamp01 = (t) => Math.max(0, Math.min(1, t));

// ---------------------------------------------------------------------------
// Copy (Molu's own onboarding strings, Arabic first)
// ---------------------------------------------------------------------------
const COPY = {
  ar: {
    lang: 'English', skip: 'تخطي', start: 'ابدأ الآن', next: 'التالي', brand: 'مولو', now: 'الآن',
    push: 'تذكير: موعدك اليوم الساعة ٤:٣٠ م في فيلفت سبا', booked: 'تم تأكيد الحجز',
    slides: [
      { h: ['جمالك وأناقتك…', 'بضغطة'], p: 'أفضل الصالونات والحلاقين في الرياض. احجز خلال ثوانٍ.' },
      { h: ['عالمٌ لحواء…', 'وعالمٌ لآدم'], p: 'صالونات للسيدات وحلاقون للرجال. اختر عالمك، وتقدر تبدّل متى ما شئت.' },
      { h: ['احجز وأنت مطمّن'], p: 'بدون اتصالات، بدون انتظار، بدون رسوم.' },
    ],
    ribbons: {
      hero: ['جمالك', 'وأناقتك', '•', 'بضغطة', '•', 'مولو'],
      worlds: ['حواء', '•', 'آدم', '•', 'حواء', '•', 'آدم'],
      calm: ['بدون', 'اتصالات', '•', 'بدون', 'انتظار', '•', 'بدون', 'رسوم'],
    },
  },
  en: {
    lang: 'العربية', skip: 'Skip', start: 'Get started', next: 'Next', brand: 'Molu', now: 'now',
    push: 'Reminder: Velvet Spa today at 4:30 PM', booked: 'Booking confirmed',
    slides: [
      { h: ['Look your best,', 'in one tap'], p: 'The best salons and barbers in Riyadh. Book in seconds.' },
      { h: ['A world for Eve,', 'a world for Adam'], p: 'Salons for women, barbers for men. Pick yours — you can switch any time.' },
      { h: ['Book with total', 'peace of mind'], p: 'No calls, no waiting, no fees.' },
    ],
    ribbons: {
      hero: ['LOOK', 'YOUR', 'BEST', '•', 'IN', 'ONE', 'TAP'],
      worlds: ['EVE', '•', 'ADAM', '•', 'EVE', '•', 'ADAM'],
      calm: ['NO', 'CALLS', '•', 'NO', 'WAITING', '•', 'NO', 'FEES'],
    },
  },
};
const FONTS = {
  ar: { display: '700 {px}px "Readex Pro"', sample: 'حواء آدم بضغطة' },
  en: { display: '900 {px}px "DM Sans"', sample: 'LOOK EVE ADAM' },
};
let lang = 'ar';
try { if (localStorage.getItem('molu:lang') === 'en') lang = 'en'; } catch (e) { /* storage blocked */ }

// ---------------------------------------------------------------------------
// UI: slides, progress, next / get started, skip, swipe, language
// ---------------------------------------------------------------------------
const SLIDES = 3;
const screenEl = document.getElementById('screen');
const copies = [...document.querySelectorAll('.slide-copy')];
const bars = [...document.querySelectorAll('.bar')];
const nextBtn = document.getElementById('next');
const nextLabel = nextBtn.querySelector('.label');
const skipBtn = document.getElementById('skip');
const langBtn = document.getElementById('lang');
const push = document.getElementById('push');
const stamp = document.getElementById('stamp');
let slide = 0;
const listeners = [];

function go(n) {
  n = Math.max(0, Math.min(SLIDES - 1, n));
  if (n === slide) return;
  const prev = slide;
  slide = n;
  copies.forEach((c, i) => c.classList.toggle('is-active', i === n));
  listeners.forEach((fn) => fn(n, prev));
}
nextBtn.addEventListener('click', () => go(slide === SLIDES - 1 ? 0 : slide + 1));
skipBtn.addEventListener('click', () => go(SLIDES - 1));
langBtn.addEventListener('click', () => setLang(lang === 'ar' ? 'en' : 'ar'));
window.addEventListener('keydown', (e) => {
  const fwd = lang === 'ar' ? 'ArrowLeft' : 'ArrowRight';
  const back = lang === 'ar' ? 'ArrowRight' : 'ArrowLeft';
  if (e.key === fwd) go(slide + 1);
  if (e.key === back) go(slide - 1);
});
let dragX = null;
screenEl.addEventListener('pointerdown', (e) => { if (!e.target.closest('button')) dragX = e.clientX; });
window.addEventListener('pointerup', (e) => {
  if (dragX === null) return;
  const dx = (e.clientX - dragX) * (lang === 'ar' ? -1 : 1);
  dragX = null;
  if (Math.abs(dx) > 40) go(slide + (dx < 0 ? 1 : -1));
});
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
  throw err;
}
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.setClearColor(0x000000, 0);

const scene = new THREE.Scene();
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(makeEnvScene(), 0.03).texture;

// Reflections: Molu's rose gradient wrapped around a sphere, plus soft studio panels.
function makeEnvScene() {
  const env = new THREE.Scene();
  env.add(new THREE.Mesh(new THREE.SphereGeometry(20, 48, 24), new THREE.ShaderMaterial({
    side: THREE.BackSide,
    vertexShader: 'varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: `varying vec3 vP;
      void main(){
        float t = clamp(0.5 - normalize(vP).y * 0.6, 0.0, 1.0);
        vec3 top = vec3(0.70, 0.01, 0.25), mid = vec3(1.0, 0.22, 0.36), low = vec3(1.0, 0.88, 0.90);
        vec3 c = t < 0.5 ? mix(top, mid, t / 0.5) : mix(mid, low, (t - 0.5) / 0.5);
        gl_FragColor = vec4(c, 1.0);
      }`,
  })));
  const panel = (w, h, pos, color, k) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(k), side: THREE.DoubleSide }));
    m.position.set(...pos);
    m.lookAt(0, 0, 0);
    env.add(m);
  };
  panel(8, 4, [-6, 9, 8], 0xffffff, 2.6);
  panel(3, 10, [10, 2, 4], 0xffd0dc, 1.6);
  panel(10, 2, [0, -8, 6], 0xfff0f3, 1.4);
  return env;
}

const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
const CAM_Z = 10.5;
const lookTarget = new THREE.Vector3(0, -0.35, 0);

scene.add(new THREE.HemisphereLight(0xffffff, 0xff7d93, 0.9));
const key = new THREE.DirectionalLight(0xfff4f0, 1.6);
key.position.set(-3, 5, 6);
scene.add(key);
const rim = new THREE.DirectionalLight(0xff5c86, 1.4);
rim.position.set(5, 1, -3);
scene.add(rim);

const rbox = (w, h, d, r, seg = 3) => new RoundedBoxGeometry(w, h, d, seg, Math.min(r, w / 2, h / 2, d / 2) - 1e-4);

// ---------------------------------------------------------------------------
// The fox: Molu's low-poly mark, extruded into a faceted 3D head.
// Coordinates are the logo's own (0-100 SVG units, y down) plus a height per vertex.
// The head splits down the middle into its Adam (charcoal) and Eve (rose) halves.
// ---------------------------------------------------------------------------
const FOX_K = 0.0175; // world units per SVG unit
const V = {
  C0: [50, 30, 14], E: [50, 46, 18], M: [50, 70, 23], N: [50, 94, 19],
  L1: [37, 29, 11], L2: [24, 11, 2], L3: [19, 36, 6], L4: [11, 50, 3], L5: [14, 64, 5], L6: [30, 78, 10], L7: [44, 91, 13],
  LM: [40, 64, 18], LC: [28, 58, 12], LE: [37, 45, 14],
  R1: [63, 28, 11], R2: [80, 4, 2], R3: [85, 38, 6], R4: [95, 50, 3], R5: [90, 62, 5], R6: [72, 76, 10], R7: [56, 90, 13],
  RM: [60, 64, 18], RC: [74, 60, 12], RE: [62, 47, 14],
};
const FACES = {
  adam: [['C0', 'L1', 'E'], ['L1', 'LE', 'E'], ['L1', 'L3', 'LE'], ['L1', 'L2', 'L3'], ['L3', 'L4', 'LC'], ['L3', 'LC', 'LE'],
    ['LE', 'LC', 'LM'], ['LE', 'LM', 'E'], ['E', 'LM', 'M'], ['L4', 'L5', 'LC']],
  adamCheek: [['L5', 'L6', 'LC'], ['LC', 'L6', 'LM'], ['L6', 'L7', 'LM'], ['LM', 'L7', 'M'], ['M', 'L7', 'N']],
  eve: [['C0', 'E', 'R1'], ['R1', 'E', 'RE'], ['R1', 'RE', 'R3'], ['R1', 'R3', 'R2'], ['R3', 'RC', 'R4'], ['R3', 'RE', 'RC'],
    ['RE', 'RM', 'RC'], ['RE', 'E', 'RM'], ['E', 'M', 'RM']],
  eveCheek: [['R4', 'RC', 'R5'], ['R5', 'RC', 'R6'], ['RC', 'RM', 'R6'], ['R6', 'RM', 'R7'], ['RM', 'M', 'R7'], ['M', 'N', 'R7']],
};
const FOX_COLORS = {
  adam: '#352f2c', adamCheek: '#8c7d67', eve: '#bd4b61', eveCheek: '#f6ece4',
  adamEar: '#5e534c', eveEar: '#7a2a3a', eye: '#0d0c0b', adamBack: '#2a2523', eveBack: '#9e3a50',
};
const OUTLINE = ['C0', 'R1', 'R2', 'R3', 'R4', 'R5', 'R6', 'R7', 'N', 'L7', 'L6', 'L5', 'L4', 'L3', 'L2', 'L1'];
const backZ = (z) => -4 - z * 0.35;

function quadPath(p0, c, p1, n = 6) {
  const out = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n, a = (1 - t) * (1 - t), b = 2 * (1 - t) * t, d = t * t;
    out.push([a * p0[0] + b * c[0] + d * p1[0], a * p0[1] + b * c[1] + d * p1[1]]);
  }
  return out;
}

function buildFox() {
  const toW = ([x, y, z]) => new THREE.Vector3((x - 50) * FOX_K, (50 - y) * FOX_K, z * FOX_K);
  const halves = { adam: { pos: [], col: [] }, eve: { pos: [], col: [] } };
  const baseTris = [];
  const color = (hex) => new THREE.Color(hex);

  function tri(side, a, b, c, hex, facing = 1) {
    const ab = new THREE.Vector3().subVectors(b, a), ac = new THREE.Vector3().subVectors(c, a);
    const n = new THREE.Vector3().crossVectors(ab, ac);
    const want = facing;
    const flip = (want === 1 && n.z < 0) || (want === -1 && n.z > 0);
    const list = flip ? [a, c, b] : [a, b, c];
    const col = color(hex);
    for (const v of list) {
      halves[side].pos.push(v.x, v.y, v.z);
      halves[side].col.push(col.r, col.g, col.b);
    }
  }
  function triSide(side, a, b, c, hex, outward) {
    // Winding chosen so the normal points along `outward`
    const n = new THREE.Vector3().crossVectors(new THREE.Vector3().subVectors(b, a), new THREE.Vector3().subVectors(c, a));
    const list = n.dot(outward) < 0 ? [a, c, b] : [a, b, c];
    const col = color(hex);
    for (const v of list) { halves[side].pos.push(v.x, v.y, v.z); halves[side].col.push(col.r, col.g, col.b); }
  }

  // Front facets
  for (const [group, faces] of Object.entries(FACES)) {
    const side = group.startsWith('adam') ? 'adam' : 'eve';
    for (const f of faces) {
      tri(side, toW(V[f[0]]), toW(V[f[1]]), toW(V[f[2]]), FOX_COLORS[group]);
      baseTris.push(f.map((k) => V[k]));
    }
  }

  // Height of the front surface under any logo point (for the inlaid details)
  function heightAt(x, y) {
    for (const [a, b, c] of baseTris) {
      const d = (b[1] - c[1]) * (a[0] - c[0]) + (c[0] - b[0]) * (a[1] - c[1]);
      const l1 = ((b[1] - c[1]) * (x - c[0]) + (c[0] - b[0]) * (y - c[1])) / d;
      const l2 = ((c[1] - a[1]) * (x - c[0]) + (a[0] - c[0]) * (y - c[1])) / d;
      const l3 = 1 - l1 - l2;
      if (l1 >= -0.02 && l2 >= -0.02 && l3 >= -0.02) return l1 * a[2] + l2 * b[2] + l3 * c[2];
    }
    return 10;
  }
  function inlay(side, pts, hex, lift = 0.5) {
    const v2 = pts.map(([x, y]) => new THREE.Vector2(x, y));
    const tris = THREE.ShapeUtils.triangulateShape(v2, []);
    for (const [i, j, k] of tris) {
      const p = [pts[i], pts[j], pts[k]].map(([x, y]) => toW([x, y, heightAt(x, y) + lift]));
      tri(side, p[0], p[1], p[2], hex);
    }
  }
  inlay('adam', [[26, 17], [22, 34], [33, 30]], FOX_COLORS.adamEar);
  inlay('eve', [[79, 11], [82, 34], [68, 29]], FOX_COLORS.eveEar);
  inlay('adam', [...quadPath([30, 44], [37, 44.5], [44, 49]), ...quadPath([44, 49], [36.5, 51.5], [30, 44]).slice(1, -1)], FOX_COLORS.eye, 0.7);
  inlay('eve', [...quadPath([68, 49], [62, 44], [56, 48]), ...quadPath([56, 48], [62, 52], [68, 49]).slice(1, -1)], FOX_COLORS.eye, 0.7);
  inlay('adam', [[44, 84], [50, 81.6], [50, 93]], FOX_COLORS.eye, 0.7);
  inlay('eve', [[50, 81.6], [56, 84], [50, 93]], FOX_COLORS.eye, 0.7);

  // Back surface
  const outline2 = OUTLINE.map((k) => new THREE.Vector2(V[k][0], V[k][1]));
  for (const [i, j, k] of THREE.ShapeUtils.triangulateShape(outline2, [])) {
    const ks = [OUTLINE[i], OUTLINE[j], OUTLINE[k]];
    const cx = (V[ks[0]][0] + V[ks[1]][0] + V[ks[2]][0]) / 3;
    const side = cx < 50 ? 'adam' : 'eve';
    const p = ks.map((q) => toW([V[q][0], V[q][1], backZ(V[q][2])]));
    tri(side, p[0], p[1], p[2], FOX_COLORS[side + 'Back'], -1);
  }
  // A back triangle can straddle the centre line; keep halves closed with a centre cap.
  // Side walls around the outline
  for (let i = 0; i < OUTLINE.length; i++) {
    const a = V[OUTLINE[i]], b = V[OUTLINE[(i + 1) % OUTLINE.length]];
    const side = (a[0] + b[0]) / 2 < 50 ? 'adam' : 'eve';
    const af = toW(a), bf = toW(b), ab = toW([a[0], a[1], backZ(a[2])]), bb = toW([b[0], b[1], backZ(b[2])]);
    const mid = new THREE.Vector3().addVectors(af, bf).multiplyScalar(0.5).setZ(0);
    const out = mid.clone().sub(new THREE.Vector3(0, (50 - 52) * FOX_K, 0)).normalize();
    const hex = side === 'adam' ? FOX_COLORS.adamBack : FOX_COLORS.eveBack;
    triSide(side, af, bf, bb, hex, out);
    triSide(side, af, bb, ab, hex, out);
  }
  // Centre caps, seen when the halves part
  const centre = ['C0', 'E', 'M', 'N'];
  const capFront = centre.map((k) => V[k]);
  const capPts = [...capFront.map((v) => [v[1], v[2]]), ...capFront.slice().reverse().map((v) => [v[1], backZ(v[2])])];
  const capTris = THREE.ShapeUtils.triangulateShape(capPts.map(([y, z]) => new THREE.Vector2(y, z)), []);
  for (const [side, nx, hex] of [['adam', 1, '#1c1816'], ['eve', -1, '#7d2c3f']]) {
    for (const [i, j, k] of capTris) {
      const p = [capPts[i], capPts[j], capPts[k]].map(([y, z]) => toW([50, y, z]));
      triSide(side, p[0], p[1], p[2], hex, new THREE.Vector3(nx, 0, 0));
    }
  }

  const material = new THREE.MeshPhysicalMaterial({
    vertexColors: true, flatShading: true, roughness: 0.42, metalness: 0.05, clearcoat: 0.55, clearcoatRoughness: 0.25, envMapIntensity: 0.9,
  });
  const make = (side) => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(halves[side].pos, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(halves[side].col, 3));
    g.computeVertexNormals();
    const mesh = new THREE.Mesh(g, material);
    const grp = new THREE.Group();
    grp.add(mesh);
    return grp;
  };
  const root = new THREE.Group();
  const adam = make('adam');
  const eve = make('eve');
  // Eye glints
  const glint = new THREE.MeshBasicMaterial({ color: 0xffffff });
  for (const [grp, x, y] of [[adam, 39, 46.6], [eve, 60, 46.6]]) {
    const s = new THREE.Mesh(new THREE.SphereGeometry(0.022, 8, 6), glint);
    s.position.copy(toW([x, y, heightAt(x, y) + 1.2]));
    grp.add(s);
  }
  root.add(adam, eve);
  // Centre the head on its visual middle
  root.children.forEach((c) => c.position.y = 0);
  const pivot = new THREE.Group();
  root.position.set(0, (52 - 50) * FOX_K, -0.05);
  pivot.add(root);
  return { pivot, adam, eve };
}

// ---------------------------------------------------------------------------
// Props: a few salon and barber tools in the same faceted style
// ---------------------------------------------------------------------------
const flat = (color, rough = 0.45, metal = 0) => new THREE.MeshPhysicalMaterial({ color, flatShading: true, roughness: rough, metalness: metal, clearcoat: 0.4, clearcoatRoughness: 0.3 });
function makeProps() {
  const props = {};
  // Nail polish
  const polish = new THREE.Group();
  const bottle = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 0.22, 6), flat(0xff385c, 0.2));
  polish.add(bottle);
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.055, 0.2, 6), flat(0x222222, 0.3));
  cap.position.y = 0.21;
  polish.add(cap);
  props.polish = polish;
  // Lipstick
  const lip = new THREE.Group();
  const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.2, 8), flat(0xd8b48a, 0.22, 0.8));
  lip.add(tube);
  const bullet = new THREE.Mesh(new THREE.CylinderGeometry(0.0, 0.055, 0.16, 8), flat(0xc8034f, 0.3));
  bullet.position.y = 0.18;
  bullet.rotation.z = 0.25;
  lip.add(bullet);
  props.lip = lip;
  // Hand mirror
  const mirror = new THREE.Group();
  mirror.add(new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.04, 6, 14), flat(0xf6ece4, 0.35)));
  const glass = new THREE.Mesh(new THREE.CircleGeometry(0.16, 14), new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 1, roughness: 0.05 }));
  mirror.add(glass);
  const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.04, 0.24, 6), flat(0xf6ece4, 0.35));
  handle.position.y = -0.3;
  mirror.add(handle);
  props.mirror = mirror;
  // Comb
  const comb = new THREE.Group();
  comb.add(new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.07, 0.035), flat(0x352f2c, 0.35)));
  const toothGeo = new THREE.BoxGeometry(0.02, 0.13, 0.03);
  const toothMat = flat(0x352f2c, 0.35);
  for (let i = 0; i < 12; i++) {
    const t = new THREE.Mesh(toothGeo, toothMat);
    t.position.set(-0.2 + i * 0.036, -0.09, 0);
    comb.add(t);
  }
  props.comb = comb;
  // Scissors
  const scissors = new THREE.Group();
  for (const s of [-1, 1]) {
    const arm = new THREE.Group();
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.36, 0.02), flat(0xe7e3ea, 0.15, 0.9));
    blade.position.y = 0.18;
    arm.add(blade);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.018, 5, 10), flat(0x8c7d67, 0.35));
    ring.position.set(s * 0.05, -0.06, 0);
    arm.add(ring);
    arm.rotation.z = s * 0.28;
    scissors.add(arm);
  }
  props.scissors = scissors;
  // Straight razor
  const razor = new THREE.Group();
  const grip = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.32, 0.05), flat(0x8c7d67, 0.4));
  razor.add(grip);
  const edge = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.22, 0.012), flat(0xe7e3ea, 0.12, 0.9));
  edge.position.set(0.05, 0.22, 0);
  edge.rotation.z = -0.35;
  razor.add(edge);
  props.razor = razor;
  // Sparkles
  const sparkMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  props.spark1 = new THREE.Mesh(new THREE.OctahedronGeometry(0.07), sparkMat);
  props.spark2 = new THREE.Mesh(new THREE.OctahedronGeometry(0.05), sparkMat);
  props.spark3 = new THREE.Mesh(new THREE.OctahedronGeometry(0.06), sparkMat);
  return props;
}

// Where each prop sits on each slide: [x, y, z, scale, tiltZ]
const PROP_LAYOUT = [
  { polish: [0.9, 0.55, 0.55, 0.9, 0.3], lip: [0.55, 0.95, 0.2, 0.8, -0.4], mirror: [0.95, -0.7, 0.45, 0.8, -0.3],
    comb: [-0.9, 0.45, 0.5, 0.85, 0.5], scissors: [-0.92, -0.72, 0.55, 0.9, 0.4], razor: [-0.55, 0.95, 0.25, 0.8, 0.5],
    spark1: [1.02, 0.05, 0.6, 1, 0], spark2: [-1.02, 0.02, 0.4, 1, 0], spark3: [0.1, -1.08, 0.7, 1, 0] },
  { polish: [0.95, 0.75, 0.4, 0.85, 0.2], lip: [1.05, -0.65, 0.3, 0.85, -0.3], mirror: [0.6, -1.15, 0.35, 0.75, -0.25],
    comb: [-0.95, 0.75, 0.4, 0.85, 0.35], scissors: [-1.05, -0.65, 0.4, 0.85, 0.3], razor: [-0.6, -1.15, 0.35, 0.75, 0.4],
    spark1: [0.05, 1.2, 0.5, 1, 0], spark2: [-0.05, -0.05, 0.9, 0.8, 0], spark3: [0.02, -1.2, 0.6, 1, 0] },
  { polish: [0.5, 0, -0.4, 0, 0], lip: [0.3, 0.3, -0.4, 0, 0], mirror: [0.4, -0.3, -0.4, 0, 0],
    comb: [-0.5, 0, -0.4, 0, 0], scissors: [-0.3, 0.3, -0.4, 0, 0], razor: [-0.4, -0.3, -0.4, 0, 0],
    spark1: [1.02, 0.35, 0.5, 1, 0], spark2: [-1.02, 0.25, 0.4, 0.9, 0], spark3: [0.85, -0.75, 0.6, 1, 0] },
];

// ---------------------------------------------------------------------------
// Helical text ribbons. Words are signed-distance-field images (one per word, so
// Arabic letters join correctly), each bent along the helix on its own strip of
// quads and antialiased in the shader. The lettering is printed on the inside of
// the ribbon: back passes read normally, front passes are mirrored and cross in
// front of the head. In Arabic the helix winds the other way so words read right
// to left.
// ---------------------------------------------------------------------------
const SDF_PX = 96, SDF_PAD = 14, SDF_RADIUS = 14, SDF_CUTOFF = 0.25;

function edt1d(grid, offset, stride, length, f, v, z) {
  v[0] = 0; z[0] = -1e20; z[1] = 1e20; f[0] = grid[offset];
  for (let q = 1, k = 0, s = 0; q < length; q++) {
    f[q] = grid[offset + q * stride];
    const q2 = q * q;
    do { const r = v[k]; s = (f[q] - f[r] + q2 - r * r) / (q - r) / 2; } while (s <= z[k] && --k > -1);
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

const atlasCache = {};
function buildWordAtlas(l) {
  if (atlasCache[l]) return atlasCache[l];
  const words = new Set();
  Object.values(COPY[l].ribbons).forEach((ws) => ws.forEach((w) => words.add(w)));
  const font = FONTS[l].display.replace('{px}', SDF_PX);
  const cellH = Math.round(SDF_PX * 1.5) + SDF_PAD * 2;
  const baseline = SDF_PAD + Math.round(SDF_PX * 1.06);
  const measure = document.createElement('canvas').getContext('2d');
  measure.font = font;
  const atlasW = 2048;
  const metrics = {};
  let x = 0, y = 0;
  for (const w of words) {
    const adv = measure.measureText(w).width;
    const cw = Math.ceil(adv) + SDF_PAD * 2;
    if (x + cw > atlasW) { x = 0; y += cellH; }
    metrics[w] = { x, y, w: cw, h: cellH, adv };
    x += cw;
  }
  const atlasH = y + cellH;
  const out = new ImageData(atlasW, atlasH);
  for (let i = 3; i < out.data.length; i += 4) out.data[i] = 255;
  for (const w of words) {
    const m = metrics[w];
    const gc = document.createElement('canvas');
    gc.width = m.w; gc.height = m.h;
    const g = gc.getContext('2d', { willReadFrequently: true });
    g.font = font;
    g.direction = l === 'ar' ? 'rtl' : 'ltr';
    g.textAlign = 'left';
    g.textBaseline = 'alphabetic';
    g.fillStyle = '#000';
    g.fillText(w, SDF_PAD, baseline);
    const alpha = g.getImageData(0, 0, m.w, m.h).data;
    const len = m.w * m.h;
    const outer = new Float64Array(len), inner = new Float64Array(len);
    for (let i = 0; i < len; i++) {
      const a = alpha[i * 4 + 3] / 255;
      if (a === 1) { outer[i] = 0; inner[i] = 1e20; } else if (a === 0) { outer[i] = 1e20; inner[i] = 0; } else {
        const d = Math.max(0, 0.5 - a); outer[i] = d * d; const e = Math.max(0, a - 0.5); inner[i] = e * e;
      }
    }
    edt(outer, m.w, m.h);
    edt(inner, m.w, m.h);
    for (let py = 0; py < m.h; py++) for (let px = 0; px < m.w; px++) {
      const i = py * m.w + px;
      const d = Math.sqrt(outer[i]) - Math.sqrt(inner[i]);
      const val = Math.max(0, Math.min(255, Math.round(255 - 255 * (d / SDF_RADIUS + SDF_CUTOFF))));
      const o = ((m.y + py) * atlasW + m.x + px) * 4;
      out.data[o] = out.data[o + 1] = out.data[o + 2] = val;
    }
  }
  const c = document.createElement('canvas');
  c.width = atlasW; c.height = atlasH;
  c.getContext('2d').putImageData(out, 0, 0);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.NoColorSpace;
  tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  atlasCache[l] = { tex, metrics, atlasW, atlasH, baseline };
  return atlasCache[l];
}

const glyphShader = {
  vertexShader: `
    varying vec2 vUv; varying float vV;
    attribute float glyphV;
    void main() { vUv = uv; vV = glyphV; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
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

function makeRibbon(key, { radius = 1.3, height = 0.42, pitch = 2.4, from = -1.1, to = Math.PI * 2 + 1.1, colorTop = 0xffffff, colorBottom = 0xffe3ea } = {}) {
  const material = new THREE.ShaderMaterial({
    ...glyphShader,
    uniforms: { map: { value: null }, colorTop: { value: new THREE.Color(colorTop) }, colorBottom: { value: new THREE.Color(colorBottom) }, opacity: { value: 1 } },
    side: THREE.DoubleSide, transparent: true, depthWrite: false,
  });
  material.extensions = { derivatives: true };
  const mesh = new THREE.Mesh(new THREE.BufferGeometry(), material);
  mesh.frustumCulled = false;
  mesh.renderOrder = 5;
  const group = new THREE.Group();
  group.add(mesh);
  const rb = { key, group, mesh, material, radius, height, pitch, from, to, quads: [], last: '', hand: 1 };
  // Animated by GSAP: spread (0 = wound into one ring, 1 = full helix), the anchored
  // end, spin about the helix axis, and opacity.
  rb.params = { spread: 1, spin: 0, opacity: 0, anchor: 'top' };

  rb.layout = (l) => {
    const atlas = buildWordAtlas(l);
    const words = COPY[l].ribbons[key];
    material.uniforms.map.value = atlas.tex;
    rb.hand = l === 'ar' ? -1 : 1;
    const em = height * (l === 'ar' ? 1.12 : 1.38);
    const k = em / SDF_PX;
    const baseY = -height * (l === 'ar' ? 0.3 : 0.5);
    const L = (to - from) * radius;
    const margin = height * 0.6;
    const widths = words.map((w) => atlas.metrics[w].adv * k);
    const total = widths.reduce((a, b) => a + b, 0);
    const gap = Math.max(height * 0.28, (L - 2 * margin - total) / Math.max(1, words.length - 1));
    let s = margin;
    rb.quads = [];
    words.forEach((w, i) => {
      const m = atlas.metrics[w];
      const s0 = s - SDF_PAD * k, s1 = s0 + m.w * k;
      let u0 = m.x / atlas.atlasW, u1 = (m.x + m.w) / atlas.atlasW;
      if (rb.hand < 0) [u0, u1] = [u1, u0];
      rb.quads.push({
        s0, s1, u0, u1,
        y0: baseY - (m.h - atlas.baseline) * k, y1: baseY + atlas.baseline * k,
        v0: 1 - (m.y + m.h) / atlas.atlasH, v1: 1 - m.y / atlas.atlasH,
        cols: Math.max(4, Math.ceil((s1 - s0) / 0.05)),
      });
      s += widths[i] + gap;
    });
    let verts = 0;
    rb.quads.forEach((q) => { q.base = verts; verts += (q.cols + 1) * 2; });
    const uv = new Float32Array(verts * 2), gv = new Float32Array(verts), idx = [];
    rb.quads.forEach((q) => {
      for (let j = 0; j <= q.cols; j++) {
        const t = j / q.cols, vi = q.base + j * 2, u = q.u0 + (q.u1 - q.u0) * t;
        uv.set([u, q.v0, u, q.v1], vi * 2);
        gv[vi] = 0; gv[vi + 1] = 1;
        if (j < q.cols) idx.push(vi, vi + 2, vi + 1, vi + 1, vi + 2, vi + 3);
      }
    });
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(verts * 3), 3));
    geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    geo.setAttribute('glyphV', new THREE.BufferAttribute(gv, 1));
    geo.setIndex(idx);
    mesh.geometry.dispose();
    mesh.geometry = geo;
    rb.last = '';
  };

  // The drop per turn is eased so the ribbon runs nearly level across the back and
  // falls steeply down the sides and across the front.
  const drop = (phi) => (pitch * (phi - 0.75 * Math.sin(phi))) / (Math.PI * 2);
  const y0 = drop(from), span = drop(to) - y0;
  rb.shape = (spread, anchor) => {
    const keyS = spread.toFixed(5) + anchor + rb.hand;
    if (keyS === rb.last || !rb.quads.length) return;
    rb.last = keyS;
    const p = mesh.geometry.attributes.position.array;
    for (const q of rb.quads) {
      for (let j = 0; j <= q.cols; j++) {
        const s = q.s0 + (q.s1 - q.s0) * (j / q.cols);
        const phi = from + s / radius;
        const x = rb.hand * Math.sin(phi) * radius, z = -Math.cos(phi) * radius;
        const g = (drop(phi) - y0) / span;
        const yc = anchor === 'top' ? span / 2 - span * g * spread - (1 - spread) * 0.3 : -span / 2 + span * (1 - g) * spread;
        p.set([x, yc + q.y0, z, x, yc + q.y1, z], (q.base + j * 2) * 3);
      }
    }
    mesh.geometry.attributes.position.needsUpdate = true;
  };
  rb.apply = () => {
    const { spread, spin, opacity, anchor } = rb.params;
    group.visible = opacity > 0.002 && rb.quads.length > 0;
    if (!group.visible) return;
    rb.shape(spread, anchor);
    mesh.rotation.y = spin * rb.hand;
    material.uniforms.opacity.value = opacity;
  };
  return rb;
}

// ---------------------------------------------------------------------------
// Build the scene
// ---------------------------------------------------------------------------
const fox = buildFox();
const heroRig = new THREE.Group();
heroRig.add(fox.pivot);
scene.add(heroRig);

const props = makeProps();
const propRig = new THREE.Group();
Object.values(props).forEach((p) => propRig.add(p));
scene.add(propRig);

const ribbons = {
  hero: makeRibbon('hero', { radius: 1.08, height: 0.36, pitch: 2.25, from: -1.15, to: Math.PI * 2 + 1.15 }),
  worlds: makeRibbon('worlds', { radius: 1.18, height: 0.38, pitch: 2.3, from: -1.15, to: Math.PI * 2 + 1.15 }),
  calm: makeRibbon('calm', { radius: 1.1, height: 0.3, pitch: 2.0, from: -1.15, to: Math.PI * 2 + 1.25 }),
};
Object.values(ribbons).forEach((r) => scene.add(r.group));

// ---------------------------------------------------------------------------
// Copy and language
// ---------------------------------------------------------------------------
let splits = [];
function fillCopy() {
  const c = COPY[lang];
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  document.querySelectorAll('[data-i18n]').forEach((el) => { el.textContent = c[el.dataset.i18n]; });
  copies.forEach((sec, i) => {
    sec.querySelector('h1').innerHTML = c.slides[i].h.map((t) => `<span class="ln">${t}</span>`).join('');
    sec.querySelector('p').textContent = c.slides[i].p;
  });
}
// Latin titles animate letter by letter; Arabic animates by word, so letters stay joined.
function splitCopy() {
  splits.forEach((s) => s.revert());
  splits = [];
  copies.forEach((sec) => {
    sec.units = [...sec.querySelectorAll('.ln')].map((ln) => {
      if (!window.SplitText) return [ln];
      const sp = new window.SplitText(ln, lang === 'ar' ? { type: 'words', wordsClass: 'wd' } : { type: 'chars', charsClass: 'ch' });
      splits.push(sp);
      return lang === 'ar' ? sp.words : sp.chars;
    });
    sec.para = sec.querySelector('p');
  });
  screenEl.classList.add('gsap-copy');
}
const copyTargets = (sec) => [...sec.units.flat(), sec.para];
function copyOut(i) {
  const sec = copies[i];
  if (!sec?.units) return;
  const t = copyTargets(sec);
  gsap.killTweensOf(t);
  gsap.to(t, { autoAlpha: 0, filter: 'blur(10px)', y: -4, duration: 0.18, ease: 'power1.in', stagger: 0.004 });
}
function copyIn(i, delay = 0.3) {
  const sec = copies[i];
  if (!sec?.units) return;
  sec.units.forEach((units, li) => {
    gsap.killTweensOf(units);
    gsap.fromTo(units, { autoAlpha: 0, filter: 'blur(12px)', y: 10 },
      { autoAlpha: 1, filter: 'blur(0px)', y: 0, duration: 0.55, ease: 'power3.out', stagger: lang === 'ar' ? 0.07 : 0.022, delay: delay + li * 0.14 });
  });
  gsap.killTweensOf(sec.para);
  gsap.fromTo(sec.para, { autoAlpha: 0, filter: 'blur(8px)', y: 6 }, { autoAlpha: 1, filter: 'blur(0px)', y: 0, duration: 0.5, ease: 'power2.out', delay: delay + 0.32 });
}

// ---------------------------------------------------------------------------
// Choreography (GSAP)
// ---------------------------------------------------------------------------
const POSES = [
  { x: 0, y: -0.72, z: 0, ry: -0.42, rx: 0.08, rz: 0.04, s: 1.1, split: 0 },
  { x: 0, y: -0.75, z: 0, ry: -Math.PI * 2, rx: 0.05, rz: 0, s: 1.02, split: 1 },
  { x: 0, y: -1.1, z: 0, ry: -Math.PI * 2 + 0.38, rx: 0.12, rz: -0.03, s: 0.9, split: 0 },
];
const state = { ...POSES[0], loopTurn: 0, pulse: 0 };
const propState = Object.fromEntries(Object.keys(props).map((k) => {
  const [x, y, z, s, tz] = PROP_LAYOUT[0][k];
  return [k, { x, y, z, s: 0, tz }];
}));

const LOOP = 2.4;
function ribbonIntro(list, { delay = 0, loop = false, turn = false, duration = 0.75 } = {}) {
  const ps = list.map((rb) => rb.params);
  list.forEach((rb) => { rb.loop?.kill(); rb.loop = null; });
  gsap.killTweensOf(ps);
  if (turn) gsap.killTweensOf(state, 'loopTurn');
  const cycle = (d = 0) => {
    const tl = gsap.timeline({ delay: d });
    tl.set(ps, { anchor: 'top', spread: 0, spin: Math.PI, opacity: 1 })
      .to(ps, { spread: 1, duration, ease: 'power2.inOut' }, 0)
      .to(ps, { spin: 0, duration: duration * 1.05, ease: 'power2.out' }, 0);
    if (turn) tl.fromTo(state, { loopTurn: 0 }, { loopTurn: 0.34, duration: 1.8, ease: 'power2.out' }, 0);
    return tl;
  };
  cycle(delay);
  if (loop && !reduceMotion) {
    const looper = gsap.timeline({ delay: delay + LOOP, repeat: -1, repeatDelay: LOOP - 0.08 });
    looper.to(ps, { opacity: 0, duration: 0.08, ease: 'none' }).add(() => { cycle(); });
    list.forEach((rb) => { rb.loop = looper; });
  }
}
function ribbonExit(list) {
  list.forEach((rb) => { rb.loop?.kill(); rb.loop = null; });
  const ps = list.map((rb) => rb.params);
  gsap.killTweensOf(ps);
  const live = ps.filter((p) => p.opacity > 0.002);
  if (!live.length) return;
  gsap.set(live, { anchor: 'bottom' });
  gsap.timeline()
    .to(live, { spin: '-=3.4', duration: 0.55, ease: 'power2.in' }, 0)
    .to(live, { spread: 0, duration: 0.55, ease: 'power2.inOut' }, 0)
    .to(live, { opacity: 0, duration: 0.25, ease: 'power1.in' }, 0.3);
}
function ribbonsFor(n) {
  return n === 0 ? [[ribbons.hero], { loop: true, turn: true }] : n === 1 ? [[ribbons.worlds], {}] : [[ribbons.calm], {}];
}

function propsTo(n, { delay = 0, instant = false } = {}) {
  Object.entries(PROP_LAYOUT[n]).forEach(([k, [x, y, z, s, tz]], i) => {
    const st = propState[k];
    gsap.killTweensOf(st);
    if (instant) { Object.assign(st, { x, y, z, s, tz }); return; }
    const leaving = s === 0;
    gsap.to(st, {
      x, y, z, tz, s, duration: leaving ? 0.35 : 0.7, ease: leaving ? 'power2.in' : 'back.out(1.6)', delay: delay + (leaving ? 0 : i * 0.04),
    });
  });
}

function cardsFor(n, instant = false) {
  gsap.killTweensOf([push, stamp]);
  if (n === 2) {
    if (instant) { gsap.set([push, stamp], { autoAlpha: 1, y: 0, scale: 1, rotate: (i) => (i === 1 ? -4 : 0), xPercent: (i) => (i === 1 ? -50 : 0) }); return; }
    gsap.fromTo(push, { autoAlpha: 0, y: -26, scale: 0.96 }, { autoAlpha: 1, y: 0, scale: 1, duration: 0.6, ease: 'back.out(1.5)', delay: 0.75 });
    gsap.fromTo(stamp, { autoAlpha: 0, scale: 0.5, xPercent: -50, rotate: -8 }, { autoAlpha: 1, scale: 1, rotate: -4, duration: 0.55, ease: 'back.out(2.2)', delay: 1.15 });
  } else if (instant) {
    gsap.set([push, stamp], { autoAlpha: 0 });
  } else {
    const shown = [push, stamp].filter((el) => getComputedStyle(el).visibility !== 'hidden');
    if (shown.length) gsap.to(shown, { autoAlpha: 0, y: -10, duration: 0.2, ease: 'power1.in' });
  }
}

function buttonFor(n, instant = false) {
  const last = n === SLIDES - 1;
  nextBtn.setAttribute('aria-label', last ? COPY[lang].start : COPY[lang].next);
  const w = last ? nextLabel.scrollWidth : 0;
  const d = instant ? 0 : 0.55;
  gsap.to(nextLabel, { width: w, marginInlineEnd: last ? 8 : 0, opacity: last ? 1 : 0, duration: d, ease: 'power3.out' });
  gsap.to(nextBtn, { '--g': last ? 1 : 0, paddingInline: last ? 24 : 16, duration: d, ease: 'power2.out' });
  skipBtn.hidden = last;
  bars.forEach((b, i) => {
    gsap.to(b, { width: i === n ? 30 : 10, duration: d, ease: 'power3.out' });
    gsap.to(b.querySelector('i'), { scaleX: i <= n ? 1 : 0, duration: d, ease: 'power2.out' });
    b.setAttribute('aria-selected', String(i === n));
  });
}

let sceneTl = null;
function enterSlide(n, prev, instant = false) {
  const pose = POSES[n];
  sceneTl?.kill();
  buttonFor(n, instant);
  cardsFor(n, instant);
  if (instant) {
    Object.assign(state, pose, { loopTurn: 0 });
    propsTo(n, { instant: true });
    return;
  }
  const tl = gsap.timeline();
  sceneTl = tl;
  const to = (keys, at, duration, ease) => {
    const vars = { duration, ease };
    keys.forEach((k) => { vars[k] = pose[k]; });
    tl.to(state, vars, at);
  };
  state.ry += state.loopTurn;
  gsap.killTweensOf(state, 'loopTurn');
  state.loopTurn = 0;
  if (n === 1 && prev === 0) {
    // A full spin, then the head parts into its Adam and Eve halves
    to(['ry'], 0.05, 0.9, 'power3.inOut');
    to(['x', 'y', 's', 'rx', 'rz'], 0.1, 0.8, 'power3.inOut');
    to(['split'], 0.62, 0.75, 'back.out(1.4)');
    propsTo(1, { delay: 0.55 });
  } else if (n === 2 && prev === 1) {
    // The halves snap back together with a little pulse, then settle lower
    to(['split'], 0.05, 0.42, 'power3.in');
    tl.to(state, { pulse: 1, duration: 0.12, ease: 'power2.out' }, 0.47).to(state, { pulse: 0, duration: 0.5, ease: 'elastic.out(1, 0.45)' }, 0.59);
    to(['ry', 'rx', 'rz'], 0.4, 0.8, 'power3.inOut');
    to(['x', 'y', 's'], 0.35, 0.8, 'power3.inOut');
    propsTo(2);
  } else {
    // Any other move: take the short way round and ease everything together
    const d = state.ry - pose.ry;
    state.ry = pose.ry + (d - Math.round(d / (Math.PI * 2)) * Math.PI * 2);
    to(Object.keys(pose), 0, 0.8, 'power3.inOut');
    propsTo(n, { delay: 0.2 });
  }
  const [inList, opts] = ribbonsFor(n);
  ribbonsFor(prev)[0].forEach((rb) => { if (!inList.includes(rb)) ribbonExit([rb]); });
  ribbonIntro(inList, { delay: n === 1 ? 1.0 : n === 2 ? 0.6 : 0.3, ...opts });
  copyOut(prev);
  copyIn(n);
}
listeners.push((n, prev) => enterSlide(n, prev));

// ---------------------------------------------------------------------------
// Startup and language switching
// ---------------------------------------------------------------------------
function fontsReady(l) {
  if (!document.fonts) return Promise.resolve();
  const titles = l === 'ar' ? '700 34px "Readex Pro"' : '700 36px "DM Sans"';
  return Promise.race([
    Promise.all([
      document.fonts.load(FONTS[l].display.replace('{px}', 100), FONTS[l].sample),
      document.fonts.load(titles, COPY[l].slides.map((s) => s.h.join(' ')).join(' ')),
      document.fonts.load(l === 'ar' ? '400 14px "Readex Pro"' : '400 14px "DM Sans"', COPY[l].slides[0].p),
    ]),
    new Promise((r) => setTimeout(r, 3000)),
  ]).catch(() => {});
}

async function setLang(l, first = false) {
  lang = l;
  try { localStorage.setItem('molu:lang', l); } catch (e) { /* storage blocked */ }
  fillCopy();
  await fontsReady(l);
  splitCopy();
  copies.forEach((sec, i) => { if (i !== slide) gsap.set(copyTargets(sec), { autoAlpha: 0 }); });
  if (!first) copyIn(slide, 0.05);
  Object.values(ribbons).forEach((rb) => rb.layout(l));
  buttonFor(slide, true);
  const [list, opts] = ribbonsFor(slide);
  ribbonIntro(list, { delay: first ? 0.2 : 0.05, ...opts });
}

if (hashSlide > 0 && hashSlide < SLIDES) {
  slide = hashSlide;
  copies.forEach((c, i) => c.classList.toggle('is-active', i === slide));
  enterSlide(slide, 0, true);
} else {
  propsTo(0, { delay: 0.25 });
}
gsap.set([push, stamp], { autoAlpha: 0, xPercent: (i) => (i === 1 ? -50 : 0) });
buttonFor(slide, true);
if (slide === 2) cardsFor(2, true);
setLang(lang, true);

// ---------------------------------------------------------------------------
// Layout and frame loop
// ---------------------------------------------------------------------------
function layout() {
  const rect = canvas.getBoundingClientRect();
  const w = Math.max(1, rect.width), h = Math.max(1, rect.height);
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  const widthFit = Math.max(1, (390 / 844) / camera.aspect);
  camera.userData.dist = CAM_Z * Math.max(1, Math.min(widthFit, 1.6)) * (camera.aspect > 0.9 ? 1.15 : 1);
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', layout);
new ResizeObserver(layout).observe(canvas);
layout();

const tmp = new THREE.Vector3();
function update() {
  const t = gsap.ticker.time;
  const bob = Math.sin(t * 1.5) * 0.04;
  const sway = Math.sin(t * 0.6) * 0.06;
  heroRig.position.set(state.x, state.y + bob, state.z);
  heroRig.rotation.set(state.rx, state.ry + state.loopTurn * (lang === 'ar' ? -1 : 1) + sway, state.rz);
  heroRig.scale.setScalar(state.s * (1 + state.pulse * 0.07));
  const sp = state.split;
  fox.adam.position.set(-sp * 0.42, 0, 0);
  fox.adam.rotation.set(0, -sp * 0.22, sp * 0.06);
  fox.eve.position.set(sp * 0.42, 0, 0);
  fox.eve.rotation.set(0, sp * 0.22, -sp * 0.06);

  // Props
  Object.entries(props).forEach(([k, obj], i) => {
    const st = propState[k];
    obj.visible = st.s > 0.002;
    obj.position.set(st.x, st.y + Math.sin(t * 1.3 + i * 1.7) * 0.05 + state.y + 0.55, st.z);
    obj.rotation.set(Math.sin(t * 0.7 + i) * 0.25, t * (0.5 + (i % 3) * 0.15) + i, st.tz + Math.sin(t * 0.9 + i * 2) * 0.12);
    obj.scale.setScalar(Math.max(0.0001, st.s) * (k.startsWith('spark') ? 0.8 + 0.3 * Math.sin(t * 3 + i) : 1));
  });

  // Ribbons follow the head; on slide 2 each half wears its own ring
  const hero = ribbons.hero;
  hero.group.position.set(state.x, state.y + 0.1 + bob, state.z);
  hero.group.rotation.set(-0.1, 0.25, lang === 'ar' ? -0.08 : 0.08);
  ribbons.worlds.group.position.set(state.x, state.y + 0.08 + bob, state.z);
  ribbons.worlds.group.rotation.set(-0.08, 0, lang === 'ar' ? 0.1 : -0.1);
  ribbons.calm.group.position.set(state.x, state.y + 0.05 + bob, state.z);
  ribbons.calm.group.rotation.set(-0.12, -0.2, lang === 'ar' ? 0.1 : -0.1);
  Object.values(ribbons).forEach((rb) => rb.apply());

  const dist = camera.userData.dist || CAM_Z;
  camera.position.set(0, 0.55, dist);
  camera.lookAt(lookTarget);
  renderer.render(scene, camera);
}
gsap.ticker.add(update);

// Debug/screenshot hook
window.__molu = { go, setLang };
