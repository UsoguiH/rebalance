// Baku Madarame — single-panel 3D reconstruction.
// The panel (speech boxes removed) is projection-mapped onto a height-field mesh built from a depth map
// (Depth Anything V2) + artwork-driven micro-relief.  The mesh is displaced along rays from the reference
// camera, so the default view is pixel-identical to the panel while orbiting reveals real volume.
// Assets are built by tools/build_assets.py.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const P = new URLSearchParams(location.search);
const shot = P.has('shot');
const ASPECT = 1033 / 1256;          // panel aspect
const PH = 1 / ASPECT;               // plane height for width 1
const FOV = 30;
const DIST = (PH / 2) / Math.tan(THREE.MathUtils.degToRad(FOV / 2)) * 1.02;

const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(shot ? 1 : Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
document.body.appendChild(renderer.domElement);
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x120708);
const camera = new THREE.PerspectiveCamera(FOV, innerWidth / innerHeight, 0.05, 50);
camera.position.set(0, 0, DIST);

const loader = new THREE.TextureLoader();
const load = (u, srgb) => new Promise(r => loader.load(u, t => {
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  t.minFilter = THREE.LinearMipmapLinearFilter; t.magFilter = THREE.LinearFilter;
  t.anisotropy = renderer.capabilities.getMaxAnisotropy(); t.generateMipmaps = true; r(t);
}));
const [color, depth, normal, back] = await Promise.all([
  load('assets/relief/color.jpg', true), load('assets/relief/depth.png', false),
  load('assets/relief/normal.png', false), load('assets/relief/back.jpg', true)]);

const U = {
  uColor: { value: color }, uDepth: { value: depth }, uNormal: { value: normal },
  uScale: { value: 0.55 }, uCamDist: { value: DIST }, uLight: { value: 0.6 },
  uLightDir: { value: new THREE.Vector3(-0.55, 0.6, 0.75).normalize() },
  uPH: { value: PH }, uCell: { value: new THREE.Vector2(1 / 516, 1 / 628) }, uStretch: { value: 7.0 },
};
const mat = new THREE.ShaderMaterial({
  uniforms: U, side: THREE.DoubleSide,
  vertexShader: /* glsl */`
    uniform sampler2D uDepth; uniform float uScale, uCamDist, uPH; uniform vec2 uCell;
    varying vec2 vUv; varying float vH; varying float vStretch; varying vec3 vPos;
    vec3 disp(vec2 q){
      float z = texture2D(uDepth, q).r;
      float h = (z - 0.35) * uScale;                       // towards camera = +
      vec3 C = vec3(0.0, 0.0, uCamDist);
      vec3 p = vec3(q.x - 0.5, (q.y - 0.5) * uPH, 0.0);
      return C + (p - C) * ((uCamDist - h) / uCamDist);     // slide along the reference-camera ray
    }
    float strech(vec3 P, vec2 d){
      vec3 e = disp(clamp(uv + d, 0.0, 1.0)) - P;
      vec3 v = normalize(cameraPosition - P);
      float len = length(e);
      float sn = length(cross(e / max(len, 1e-6), v));      // 0 when the edge points along the view ray
      return len * sn / (uCell.x);
    }
    void main(){
      vUv = uv; vH = texture2D(uDepth, uv).r;
      vec3 p = disp(uv); vPos = p;
      vStretch = max(max(strech(p, vec2( uCell.x, 0.0)), strech(p, vec2(-uCell.x, 0.0))),
                     max(strech(p, vec2(0.0,  uCell.y)), strech(p, vec2(0.0, -uCell.y))));
      gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
    }`,
  fragmentShader: /* glsl */`
    uniform sampler2D uColor, uNormal; uniform float uLight, uScale, uStretch; uniform vec3 uLightDir;
    varying vec2 vUv; varying float vH; varying float vStretch; varying vec3 vPos;
    void main(){
      if (vStretch > uStretch) discard;                    // rubber-sheet cells across depth cliffs -> back layer shows through
      vec3 albedo = texture2D(uColor, vUv).rgb;
      vec3 n = texture2D(uNormal, vUv).rgb * 2.0 - 1.0;
      n.xy *= uScale / 0.5; n = normalize(n);
      vec3 L = normalize(uLightDir);
      vec3 V = normalize(cameraPosition - vPos);
      float d = dot(n, L) - L.z;                           // 0 on a flat facing surface -> default look preserved
      float lum = dot(albedo, vec3(0.333));
      float rim = pow(1.0 - clamp(dot(n, V), 0.0, 1.0), 2.5);
      vec3 col = albedo * (1.0 + uLight * 0.75 * d);
      col += uLight * vec3(1.0, 0.72, 0.45) * 0.08 * rim * smoothstep(0.1, 0.8, lum);
      float spec = pow(clamp(dot(reflect(-L, n), V), 0.0, 1.0), 38.0);
      col += uLight * 0.08 * spec * smoothstep(0.35, 0.9, lum);
      gl_FragColor = vec4(col, 1.0);
      #include <colorspace_fragment>
    }`,
});
const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, PH, 516, 628), mat);
scene.add(mesh);

// back layer: backdrop with the figure removed, flat, slightly behind everything
const backMat = new THREE.MeshBasicMaterial({ map: back });
const backMesh = new THREE.Mesh(new THREE.PlaneGeometry(1, PH), backMat);
const bz = -(0.35 * 0.55) - 0.02, k = (DIST - bz) / DIST;     // sits on the same camera rays as the panel
backMesh.position.z = bz; backMesh.scale.setScalar(k);
scene.add(backMesh);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true; controls.dampingFactor = 0.08; controls.enablePan = false;
controls.minAzimuthAngle = -0.75; controls.maxAzimuthAngle = 0.75;
controls.minPolarAngle = Math.PI / 2 - 0.45; controls.maxPolarAngle = Math.PI / 2 + 0.35;
controls.minDistance = DIST * 0.45; controls.maxDistance = DIST * 1.3;
controls.target.set(0, 0, 0);
function setView(az, pol, dist = DIST) {
  const r = dist, a = az, p = Math.PI / 2 - pol;
  camera.position.set(r * Math.sin(p) * Math.sin(a), r * Math.cos(p), r * Math.sin(p) * Math.cos(a));
  camera.lookAt(0, 0, 0); controls.update();
}

function resize() {
  renderer.setSize(innerWidth, innerHeight);
  camera.aspect = innerWidth / innerHeight;
  // keep the whole panel visible on narrow screens
  camera.fov = innerWidth / innerHeight < ASPECT ? THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(FOV / 2)) * ASPECT / camera.aspect)) : FOV;
  camera.updateProjectionMatrix();
}
addEventListener('resize', resize); resize();
document.getElementById('msg')?.remove();

if (shot) {
  document.getElementById('ui')?.remove();
  U.uScale.value = parseFloat(P.get('depth') ?? 0.55); U.uLight.value = parseFloat(P.get('light') ?? 0.6);
  setView(parseFloat(P.get('az') ?? 0) * Math.PI / 180, parseFloat(P.get('pol') ?? 0) * Math.PI / 180, DIST * parseFloat(P.get('zoom') ?? 1));
  renderer.render(scene, camera);
  window.__ready = true;
} else {
  const $ = id => document.getElementById(id);
  $('depth').oninput = e => { U.uScale.value = +e.target.value; };
  $('light').oninput = e => { U.uLight.value = +e.target.value; };
  let sway = true, t0 = performance.now();
  $('sway').onchange = e => { sway = e.target.checked; t0 = performance.now(); };
  controls.addEventListener('start', () => { sway = false; $('sway').checked = false; });
  $('reset').onclick = () => { sway = false; $('sway').checked = false; setView(0, 0); };
  (function loop(now) {
    if (sway) setView(Math.sin((now - t0) / 1600) * 0.30, Math.sin((now - t0) / 2300) * 0.07);
    controls.update(); renderer.render(scene, camera); requestAnimationFrame(loop);
  })(performance.now());
}
