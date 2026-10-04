// Baku Madarame (Usogui) — a free-standing, fully rotatable 3D object.
//   geometry : TripoSR single-image-to-3D reconstruction of the panel (assets/object3d/figure.glb), oriented + smoothed
//   colour   : the panel is projection-mapped from the original view onto every surface that faces it and is not occluded
//              (exact face / suit / hands); the sides and back get colours diffused outward from the front.
//   extras   : pedestal with plaque, throne backdrop that fades as you walk around, "Download .glb"
// Pipeline scripts live in tools/ (infer.py, post.py, calib.py).
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';

const P = new URLSearchParams(location.search);
const shot = P.has('shot');
const FOV = 14;

const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(shot ? 1 : Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
document.body.appendChild(renderer.domElement);
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x120708);
const camera = new THREE.PerspectiveCamera(FOV, innerWidth / innerHeight, 0.5, 80);

// ---------- load
const loadImg = u => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = u; });
const A = 'assets/object3d/';
const [gltf, projImg, bdImg, proj, layout] = await Promise.all([
  new Promise((res, rej) => new GLTFLoader().load(A + 'figure.glb', res, undefined, rej)),
  loadImg(A + 'proj_tex.png'), loadImg(A + 'backdrop.jpg'),
  fetch(A + 'proj.json').then(r => r.json()), fetch(A + 'layout.json').then(r => r.json()),
]);
let srcMesh; gltf.scene.traverse(o => { if (o.isMesh && !srcMesh) srcMesh = o; });
const srcGeo = srcMesh.geometry;
const NV = srcGeo.attributes.position.count;
const pos = srcGeo.attributes.position.array;
const index = srcGeo.index ? srcGeo.index.array : null;
srcGeo.computeVertexNormals();
const nrm = srcGeo.attributes.normal.array;
const mcol = srcGeo.attributes.color;                       // the model's own (dull) vertex colours

// ---------- the projector: the camera TripoSR reconstructed from (fov 40, distance 1.9, on +Z) + calibrated 2D similarity
const projCam = new THREE.PerspectiveCamera(40, 1, 0.5, 4);
projCam.position.set(0, 0, 1.9); projCam.lookAt(0, 0, 0); projCam.updateMatrixWorld(); projCam.updateProjectionMatrix();
const PV = new THREE.Matrix4().multiplyMatrices(projCam.projectionMatrix, projCam.matrixWorldInverse);

// depth pass from the projector (for occlusion)
const DR = 1024;
const rt = new THREE.WebGLRenderTarget(DR, DR, { type: THREE.FloatType, format: THREE.RGBAFormat, minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter, depthBuffer: true });
const depthMat = new THREE.ShaderMaterial({
  side: THREE.DoubleSide,
  vertexShader: 'varying float vD; void main(){ vec4 mv = modelViewMatrix*vec4(position,1.0); vD = -mv.z; gl_Position = projectionMatrix*mv; }',
  fragmentShader: 'varying float vD; void main(){ gl_FragColor = vec4(vD,0.0,0.0,1.0); }',
});
const depthMesh = new THREE.Mesh(srcGeo, depthMat);
const dScene = new THREE.Scene(); dScene.add(depthMesh);
renderer.setRenderTarget(rt); renderer.setClearColor(0x000000, 1); renderer.clear();
{ const bg = new THREE.Color(); renderer.getClearColor(bg); renderer.setClearColor(new THREE.Color(100, 100, 100), 1); renderer.clear(); renderer.render(dScene, projCam); }
const depth = new Float32Array(DR * DR * 4);
renderer.readRenderTargetPixels(rt, 0, 0, DR, DR, depth);
renderer.setRenderTarget(null); renderer.setClearColor(0x120708, 1);
rt.dispose();
const dAt = (x, y) => depth[((Math.min(DR - 1, Math.max(0, y)) * DR) + Math.min(DR - 1, Math.max(0, x))) * 4];

// panel texture on the CPU
const TX = projImg.width, TY = projImg.height;
const cv = document.createElement('canvas'); cv.width = TX; cv.height = TY;
const cx = cv.getContext('2d', { willReadFrequently: true }); cx.drawImage(projImg, 0, 0);
const tpx = cx.getImageData(0, 0, TX, TY).data;
const sample = (u, v) => {                                  // bilinear, v up
  const x = u * TX - 0.5, y = (1 - v) * TY - 0.5; const x0 = Math.floor(x), y0 = Math.floor(y), fx = x - x0, fy = y - y0;
  const out = [0, 0, 0, 0];
  for (let j = 0; j < 2; j++) for (let i = 0; i < 2; i++) {
    const xx = Math.min(TX - 1, Math.max(0, x0 + i)), yy = Math.min(TY - 1, Math.max(0, y0 + j)); const k = (yy * TX + xx) * 4, w = (i ? fx : 1 - fx) * (j ? fy : 1 - fy);
    for (let c = 0; c < 4; c++) out[c] += tpx[k + c] * w;
  }
  return out;
};
const s2l = c => Math.pow(c / 255, 2.2);

// ---------- per-vertex projection weights
const UV = new Float32Array(NV * 2), WT = new Float32Array(NV), PC = new Float32Array(NV * 3), SRC = new Uint8Array(NV);
const v4 = new THREE.Vector4();
for (let i = 0; i < NV; i++) {
  const x = pos[i * 3], y = pos[i * 3 + 1], z = pos[i * 3 + 2];
  v4.set(x, y, z, 1).applyMatrix4(PV); const nx = v4.x / v4.w, ny = v4.y / v4.w;
  const u0 = nx * 0.5 + 0.5, v0 = ny * 0.5 + 0.5;
  const u = 0.5 + proj.scale * (u0 - 0.5) + proj.dx, v = 0.5 + proj.scale * (v0 - 0.5) + proj.dy;   // calibrated similarity
  UV[i * 2] = u; UV[i * 2 + 1] = v;
  let w = 0;
  if (u > 0 && u < 1 && v > 0 && v < 1) {
    // facing the projector
    const dx = -x, dy = -y, dz = 1.9 - z, dl = Math.hypot(dx, dy, dz);
    const f = (nrm[i * 3] * dx + nrm[i * 3 + 1] * dy + nrm[i * 3 + 2] * dz) / dl;
    // not occluded (3x3 min of the projector depth buffer)
    const px = Math.round(u0 * DR - 0.5), py = Math.round(v0 * DR - 0.5), dv = 1.9 - z;
    let dmin = 1e9; for (let j = -1; j <= 1; j++) for (let k = -1; k <= 1; k++) dmin = Math.min(dmin, dAt(px + k, py + j));
    const vis = dv - dmin < 0.02 ? 1 : 0;
    const t = sample(u, v);
    const a = THREE.MathUtils.smoothstep(t[3], 90, 200);
    w = vis * THREE.MathUtils.smoothstep(f, 0.16, 0.5) * a;
    SRC[i] = (vis && a > 0.8 && f > 0.2 && f < 0.62) ? 1 : 0;
    PC[i * 3] = s2l(t[0]); PC[i * 3 + 1] = s2l(t[1]); PC[i * 3 + 2] = s2l(t[2]);
  }
  WT[i] = w;
}

// ---------- base colours for the unseen sides/back: nearest projected rim colours (white suit / hair), then smoothed
const adj = (() => {
  const n = NV, cnt = new Uint32Array(n + 1); const ix = index; const nt = ix.length / 3;
  for (let t = 0; t < nt; t++) { for (let k = 0; k < 3; k++) cnt[ix[t * 3 + k] + 1] += 2; }
  for (let i = 0; i < n; i++) cnt[i + 1] += cnt[i];
  const off = cnt.slice(0, n), list = new Uint32Array(cnt[n]);
  for (let t = 0; t < nt; t++) for (let k = 0; k < 3; k++) { const a = ix[t * 3 + k], b = ix[t * 3 + (k + 1) % 3]; list[off[a]++] = b; list[off[b]++] = a; }
  return { start: cnt, list };
})();
const BC = new Float32Array(NV * 3);
{
  const CELL = 0.05, grid = new Map(), key3 = (x, y, z) => (x * 73856093) ^ (y * 19349663) ^ (z * 83492791);
  const cell = v => Math.floor(v / CELL);
  let nSrc = 0;
  for (let i = 0; i < NV; i += 2) if (SRC[i]) {                         // subsample the sources
    const k = key3(cell(pos[i * 3]), cell(pos[i * 3 + 1]), cell(pos[i * 3 + 2])); let l = grid.get(k); if (!l) grid.set(k, l = []); l.push(i); nSrc++;
  }
  const gain = 1.12;
  for (let i = 0; i < NV; i++) {
    const x = pos[i * 3], y = pos[i * 3 + 1], z = pos[i * 3 + 2], cx0 = cell(x), cy0 = cell(y), cz0 = cell(z);
    let r = 0, g = 0, b = 0, wsum = 0, found = 0;
    for (let ring = 0; ring <= 12 && (found < 10 || ring <= 1); ring++) {
      for (let dx = -ring; dx <= ring; dx++) for (let dy = -ring; dy <= ring; dy++) for (let dz = -ring; dz <= ring; dz++) {
        if (Math.max(Math.abs(dx), Math.abs(dy), Math.abs(dz)) !== ring) continue;
        const l = grid.get(key3(cx0 + dx, cy0 + dy, cz0 + dz)); if (!l) continue;
        for (const j of l) { const ex = pos[j * 3] - x, ey = pos[j * 3 + 1] - y, ez = pos[j * 3 + 2] - z; const w = 1 / (ex * ex + ey * ey + ez * ez + 4e-4); r += PC[j * 3] * w; g += PC[j * 3 + 1] * w; b += PC[j * 3 + 2] * w; wsum += w; found++; }
      }
    }
    if (wsum > 0) { BC[i * 3] = Math.min(1, r / wsum * gain); BC[i * 3 + 1] = Math.min(1, g / wsum * gain); BC[i * 3 + 2] = Math.min(1, b / wsum * gain); }
    else { BC[i * 3] = BC[i * 3 + 1] = BC[i * 3 + 2] = 0.8; }
    const m = 0.10;  // a hint of the model's own variation
    BC[i * 3] = BC[i * 3] * (1 - m) + Math.min(1, s2l(mcol.getX(i) * 255) * 1.5) * m; BC[i * 3 + 1] = BC[i * 3 + 1] * (1 - m) + Math.min(1, s2l(mcol.getY(i) * 255) * 1.5) * m; BC[i * 3 + 2] = BC[i * 3 + 2] * (1 - m) + Math.min(1, s2l(mcol.getZ(i) * 255) * 1.5) * m;
  }
  const tmp = new Float32Array(NV * 3);
  for (let it = 0; it < 24; it++) {                                        // smooth over the surface
    for (let i = 0; i < NV; i++) { let r = BC[i * 3], g = BC[i * 3 + 1], b = BC[i * 3 + 2], c = 1; const s0 = adj.start[i], e0 = adj.start[i + 1];
      for (let k = s0; k < e0; k++) { const j = adj.list[k] * 3; r += BC[j]; g += BC[j + 1]; b += BC[j + 2]; c++; }
      tmp[i * 3] = r / c; tmp[i * 3 + 1] = g / c; tmp[i * 3 + 2] = b / c; }
    BC.set(tmp);
  }
  for (let i = 0; i < NV; i++) if (WT[i] > 0.6) { BC[i * 3] = PC[i * 3]; BC[i * 3 + 1] = PC[i * 3 + 1]; BC[i * 3 + 2] = PC[i * 3 + 2]; }   // under the shell: exactly the panel
  window.__src = nSrc;
}

// ---------- meshes
const baseGeo = new THREE.BufferGeometry();
baseGeo.setAttribute('position', srcGeo.attributes.position); baseGeo.setAttribute('normal', srcGeo.attributes.normal);
baseGeo.setAttribute('color', new THREE.BufferAttribute(BC, 3)); baseGeo.setIndex(srcGeo.index);
const baseMesh = new THREE.Mesh(baseGeo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, metalness: 0 }));
baseMesh.name = 'Baku_base';

// front "shell": the triangles that carry the panel, slightly lifted along the normal, alpha-faded by the projection weight
const tex = new THREE.Texture(projImg); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = renderer.capabilities.getMaxAnisotropy(); tex.needsUpdate = true;
const shellIdx = []; for (let t = 0; t < index.length; t += 3) { const a = index[t], b = index[t + 1], c = index[t + 2]; if (Math.max(WT[a], WT[b], WT[c]) > 0.02) shellIdx.push(a, b, c); }
const shellPos = new Float32Array(NV * 3), shellCol = new Float32Array(NV * 4);
const LIFT = 0.0016;
for (let i = 0; i < NV; i++) { for (let k = 0; k < 3; k++) shellPos[i * 3 + k] = pos[i * 3 + k] + nrm[i * 3 + k] * LIFT; shellCol[i * 4] = shellCol[i * 4 + 1] = shellCol[i * 4 + 2] = 1; shellCol[i * 4 + 3] = THREE.MathUtils.smoothstep(WT[i], 0.05, 0.75); }
const shellGeo = new THREE.BufferGeometry();
shellGeo.setAttribute('position', new THREE.BufferAttribute(shellPos, 3)); shellGeo.setAttribute('normal', srcGeo.attributes.normal);
shellGeo.setAttribute('uv', new THREE.BufferAttribute(UV, 2)); shellGeo.setAttribute('color', new THREE.BufferAttribute(shellCol, 4)); shellGeo.setIndex(shellIdx);
const shellMesh = new THREE.Mesh(shellGeo, new THREE.MeshStandardMaterial({ map: tex, vertexColors: true, transparent: true, depthWrite: false, roughness: 0.85, metalness: 0,
  emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.5, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
shellMesh.name = 'Baku_panel_projection'; shellMesh.renderOrder = 2;

const baku = new THREE.Group(); baku.name = 'Baku_Madarame'; baku.add(baseMesh, shellMesh);
const box = new THREE.Box3().setFromObject(baseMesh); const yMin = box.min.y, yMax = box.max.y;
scene.add(baku);

// ---------- pedestal with plaque
const ped = new THREE.Group(); ped.name = 'Pedestal';
const mk = (w, h, d, color, y, rough = 0.5, metal = 0) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal })); m.position.y = y; return m; };
const PW = 0.92, PD = 0.82;
ped.add(mk(PW + 0.06, 0.03, PD + 0.06, 0xc9a227, yMin - 0.015, 0.3, 0.85));
ped.add(mk(PW, 0.12, PD, 0x4b0f1c, yMin - 0.03 - 0.06, 0.55));
ped.add(mk(PW + 0.06, 0.03, PD + 0.06, 0xc9a227, yMin - 0.03 - 0.12 - 0.015, 0.3, 0.85));
const plaqueTex = (() => {
  const c = document.createElement('canvas'); c.width = 1024; c.height = 140; const g = c.getContext('2d');
  g.fillStyle = '#b8901c'; g.fillRect(0, 0, 1024, 140); g.strokeStyle = '#6b4e08'; g.lineWidth = 6; g.strokeRect(6, 6, 1012, 128);
  g.fillStyle = '#2a1a02'; g.textAlign = 'center'; g.font = 'bold 54px Georgia, serif'; g.fillText('BAKU MADARAME', 512, 66);
  g.font = 'italic 34px Georgia, serif'; g.fillText('“The Kings are the top authority.”', 512, 112);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; })();
const plaque = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.7 * 140 / 1024), new THREE.MeshStandardMaterial({ map: plaqueTex, roughness: 0.4, metalness: 0.5 }));
plaque.position.set(0, yMin - 0.03 - 0.06, PD / 2 + 0.002); ped.add(plaque);
scene.add(ped);

// ---------- backdrop: the throne/wall of the panel, registered to the projection (so it lines up with the figure from the front)
const tex2 = new THREE.Texture(bdImg); tex2.colorSpace = THREE.SRGBColorSpace; tex2.anisotropy = 8; tex2.needsUpdate = true;
const HALF = 1.9 * Math.tan(THREE.MathUtils.degToRad(20));        // half-extent of the projector frustum at the origin plane
const { x0, y0, ox, oy, s, W, H } = layout;
const toX = px => ((((px - x0 + ox) / s) - 0.5 - proj.dx) / proj.scale) * 2 * HALF;
const toY = py => (((1 - (py - y0 + oy) / s) - 0.5 - proj.dy) / proj.scale) * 2 * HALF;
const bx0 = toX(0), bx1 = toX(W), by0 = toY(H), by1 = toY(0);
const BDZ = -0.55;
const bdMat = new THREE.MeshBasicMaterial({ map: tex2, transparent: true, side: THREE.DoubleSide, depthWrite: false });
const bd = new THREE.Mesh(new THREE.PlaneGeometry(bx1 - bx0, by1 - by0), bdMat);
const DIST = (((yMax - yMin) + 0.5) / 2 * 1.18) / Math.tan(THREE.MathUtils.degToRad(FOV / 2));
const bk = (DIST - BDZ) / DIST;       // farther plane: scale up so it keeps the same angular size
bd.position.set(((bx0 + bx1) / 2) * bk, ((by0 + by1) / 2) * bk, BDZ); bd.scale.setScalar(bk); bd.renderOrder = -1;
scene.add(bd);

// ---------- lights
scene.add(new THREE.HemisphereLight(0xffffff, 0x7a4a4a, 0.75));
const key = new THREE.DirectionalLight(0xfff1dc, 1.5); key.position.set(-1.4, 2.0, 3.0); scene.add(key);
const fill = new THREE.DirectionalLight(0xffc9a0, 0.5); fill.position.set(2.2, 0.4, 1.6); scene.add(fill);
const rimL = new THREE.DirectionalLight(0xffe0b5, 0.9); rimL.position.set(1.0, 1.2, -3.0); scene.add(rimL);
const back = new THREE.DirectionalLight(0xffffff, 0.9); back.position.set(-1.0, 0.6, -3.0); scene.add(back);

// ---------- camera / controls
const target = new THREE.Vector3(0, (yMin + yMax) / 2 - 0.08, 0);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true; controls.dampingFactor = 0.08; controls.screenSpacePanning = true;
controls.minDistance = DIST * 0.25; controls.maxDistance = DIST * 1.8; controls.minPolarAngle = 0.12; controls.maxPolarAngle = Math.PI - 0.3;
controls.target.copy(target); controls.autoRotateSpeed = 1.6;
const setView = (azDeg, polDeg, zoom = 1) => {
  const a = THREE.MathUtils.degToRad(azDeg), p = THREE.MathUtils.degToRad(90 - polDeg), r = DIST * zoom;
  camera.position.set(target.x + r * Math.sin(p) * Math.sin(a), target.y + r * Math.cos(p), target.z + r * Math.sin(p) * Math.cos(a));
  camera.lookAt(target); controls.update();
};
const resize = () => {
  renderer.setSize(innerWidth, innerHeight); camera.aspect = innerWidth / innerHeight;
  camera.fov = camera.aspect < 0.8 ? THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(FOV / 2)) * 0.8 / camera.aspect)) : FOV;
  camera.updateProjectionMatrix();
};
addEventListener('resize', resize); resize();
document.getElementById('msg')?.remove();

let showBd = true;
const fadeBackdrop = () => {
  const az = Math.abs(Math.atan2(camera.position.x - controls.target.x, camera.position.z - controls.target.z));
  bdMat.opacity = showBd ? 1 - THREE.MathUtils.smoothstep(az, 0.45, 1.1) : 0; bd.visible = bdMat.opacity > 0.01;
};

window.__exportGLB = () => new Promise(res => {
  const tmp = new THREE.Group(); tmp.add(baku.clone(), ped.clone());
  new GLTFExporter().parse(tmp, buf => { const b = new Uint8Array(buf); let str = ''; for (let i = 0; i < b.length; i += 0x8000) str += String.fromCharCode.apply(null, b.subarray(i, i + 0x8000)); res(btoa(str)); }, console.error, { binary: true });
});
window.__stats = { verts: NV, tris: index.length / 3, shellTris: shellIdx.length / 3, projected: WT.reduce((a, w) => a + (w > 0.6), 0) };

if (shot) {
  document.getElementById('ui')?.remove();
  showBd = P.get('bd') !== '0';
  setView(parseFloat(P.get('az') ?? 0), parseFloat(P.get('pol') ?? 0), parseFloat(P.get('zoom') ?? 1));
  fadeBackdrop(); renderer.render(scene, camera); window.__ready = true;
} else {
  const $ = id => document.getElementById(id);
  setView(0, 0); controls.autoRotate = true;
  $('spin').onchange = e => { controls.autoRotate = e.target.checked; };
  $('bd').onchange = e => { showBd = e.target.checked; };
  $('reset').onclick = () => { controls.autoRotate = false; $('spin').checked = false; controls.target.copy(target); setView(0, 0); };
  $('glb').onclick = async () => { const b64 = await window.__exportGLB(); const a = document.createElement('a'); a.href = 'data:model/gltf-binary;base64,' + b64; a.download = 'baku_madarame.glb'; a.click(); };
  controls.addEventListener('start', () => { controls.autoRotate = false; $('spin').checked = false; });
  (function loop() { controls.update(); fadeBackdrop(); renderer.render(scene, camera); requestAnimationFrame(loop); })();
}
