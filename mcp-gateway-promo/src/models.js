// Real 3D models (glTF) for the devices and stationery, loaded once and normalised so each
// prop keeps a simple convention the scenes can rely on. Credits: assets/CREDITS.md.
import { THREE, glossy, mat, slab, decal, mesh } from './kit3d.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
import { clone as cloneSkinned } from 'three/addons/utils/SkeletonUtils.js';
import * as T from './textures.js';
import { makeCanvas } from './draw2d.js';
import { rng, TAU } from './util.js';

const NAMES = ['laptop', 'phone', 'marker', 'pencup', 'headphones', 'chair', 'mug', 'scissors', 'paperclip', 'umbrella', 'folder', 'button', 'wall_clock', 'clipboard', 'office_notepads'];
const VP = { laptop: 0xd9b98f, phone: 0xd9938f, marker: 0xb592d9, pencup: 0x6a7f6f, headphones: 0xd98fc0, chair: 0x8fa6d9, mug: 0xcfd98f, scissors: 0x8fd6bd, paperclip: 0xd98fc0, umbrella: 0x9aa6d6, folder: 0xd9b98f, button: 0xe0a070, wall_clock: 0xd9938f, clipboard: 0xb592d9, office_notepads: 0xd9b98f };
const src = {};
const G = () => new THREE.Group();

export async function loadModels(kit, base = './assets/') {
  const loader = new GLTFLoader();
  const [hdr] = await Promise.all([
    new RGBELoader().loadAsync(`${base}hdri/studio_small_08_1k.hdr`),
    ...NAMES.map(async (n) => {
      const g = await loader.loadAsync(`${base}models/${n}.glb`);
      g.scene.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; o.userData.vp = VP[n]; if (o.isSkinnedMesh) o.frustumCulled = false; } });
      src[n] = g;
    }),
  ]);
  hdr.mapping = THREE.EquirectangularReflectionMapping;
  const pm = new THREE.PMREMGenerator(kit.renderer);
  kit.env = pm.fromEquirectangular(hdr).texture; hdr.dispose();
  prepare();
}

const byMat = (root, name) => { const out = []; root.traverse((o) => { if (o.isMesh && o.material.name === name) out.push(o); }); return out; };
const byName = (root, name) => { let r = null; root.traverse((o) => { if (o.name === name) r = o; }); return r; };

// Repaint a texture through a canvas filter (used to turn the teal scissor handles red).
function filtered(tex, filter) {
  const img = tex.image, c = makeCanvas(img.width, img.height), g = c.getContext('2d');
  g.filter = filter; g.drawImage(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.flipY = tex.flipY; t.colorSpace = tex.colorSpace; t.wrapS = tex.wrapS; t.wrapT = tex.wrapT; t.anisotropy = 8;
  return t;
}

// One-time look adjustments on the source models.
function prepare() {
  // phone: pink finish instead of sierra blue
  src.phone.scene.traverse((o) => {
    if (!o.isMesh) return; const n = o.material.name;
    if (['Frame', 'Frame2', 'Camera_Frame', 'Camera_Frame.001', 'Logo'].includes(n)) o.material.color.set(0xffc9d6);
    if (n === 'Body') o.material.color.set(0xf7b3c4);
    if (n === 'Antenna') o.material.color.set(0xd99aa8);
    if (n === 'Gray_Glass') o.material.color.set(0x4a2732);
  });
  // chair: purple shell, chrome-ish legs
  src.chair.scene.traverse((o) => {
    if (!o.isMesh) return;
    o.material = o.material.clone();
    if (o.name === 'Object_4') { o.material.color.set(0x9a63f0); o.material.map = null; o.material.roughness = 0.35; }
    else { o.material.color.set(0xe8e2f6); o.material.map = null; o.material.metalness = 0.85; o.material.roughness = 0.25; }
  });
  // marker: pose uncapped (the rig's own animation), hide the cap, pink body
  {
    const g = src.marker.scene, mixer = new THREE.AnimationMixer(g);
    src.marker.animations.forEach((a) => mixer.clipAction(a).play()); mixer.setTime(4.5);
    const pose = []; g.traverse((o) => pose.push([o, o.position.clone(), o.quaternion.clone(), o.scale.clone()]));
    mixer.stopAllAction(); mixer.uncacheRoot(g);
    for (const [o, p, q, sc] of pose) { o.position.copy(p); o.quaternion.copy(q); o.scale.copy(sc); }
    const cap = byName(g, 'Bone001_01'), body = byName(g, 'Bone_00');
    if (cap && body) { cap.position.copy(body.position); cap.scale.setScalar(1e-4); }
    g.traverse((o) => { if (o.isMesh) o.material.color.setRGB(1.75, 0.62, 1.15); });
  }
  // scissors: red handles
  src.scissors.scene.traverse((o) => { if (o.isMesh && o.material.map && !o.material.userData.done) { o.material.map = filtered(o.material.map, 'hue-rotate(178deg) saturate(1.25)'); o.material.userData.done = true; } });
  // paper clip: red enamel
  src.paperclip.scene.traverse((o) => { if (o.isMesh) o.material = glossy(0xf2475f, { roughness: 0.25, metalness: 0.2 }); });
  // umbrella: pink canopy, lilac lining, purple shaft and handle
  src.umbrella.scene.traverse((o) => {
    if (!o.isMesh) return; const n = o.material.name;
    if (n === 'Material.001') { o.material.color.set(0xff78b6); o.material.roughness = 0.45; o.material.side = THREE.DoubleSide; }
    else if (n === 'Material.002') { o.material.color.set(0xc79bff); o.material.metalness = 0; o.material.roughness = 0.5; o.material.side = THREE.DoubleSide; }
    else if (n === 'Material.005' || n === 'Material.007' || n === 'Material.009') { o.material.color.set(0xb07cff); o.material.metalness = 0.5; o.material.roughness = 0.3; }
    else { o.material.color.set(0xd9c2ff); o.material.metalness = 0.6; o.material.roughness = 0.35; }
  });
  // mug: warm white glaze
  src.mug.scene.traverse((o) => { if (o.isMesh) { o.material.color.set(0xfff4ec); o.material.roughness = 0.25; } });
  // clipboard: violet board
  src.clipboard.scene.traverse((o) => { if (o.isMesh) { o.material.map = null; o.material.color.set(0xa860f2); o.material.roughness = 0.5; } });
  // notepads: pink paper
  src.office_notepads.scene.traverse((o) => { if (o.isMesh) o.material.color.setRGB(1.3, 0.85, 1.1); });
}

function inst(name) { return name === 'marker' || name === 'folder' ? cloneSkinned(src[name].scene) : src[name].scene.clone(true); }

// Wrap a model so that it is scaled by `s`, rotated, and positioned with its bounds anchored.
// anchor: 'bottom' puts min-y at 0 (centred in x/z); 'center' centres all three axes.
function fit(model, s, { rot = [0, 0, 0], anchor = 'bottom' } = {}) {
  const inner = G(); inner.add(model); inner.rotation.set(...rot); inner.scale.setScalar(s);
  const outer = G(); outer.add(inner); outer.updateMatrixWorld(true);
  const b = new THREE.Box3().setFromObject(outer, true), c = b.getCenter(new THREE.Vector3());
  inner.position.set(-c.x, anchor === 'bottom' ? -b.min.y : -c.y, -c.z);
  return outer;
}

// ---- props ----------------------------------------------------------------------------------
// Phone: centred, screen facing +Z, 1.66 tall. userData.screen is the lock-screen face.
export function phone() {
  const g = fit(inst('phone'), 1.675, { rot: [0, Math.PI, 0], anchor: 'center' });
  const scr = decal(0.744, 1.598, T.lockScreenTex()); scr.position.z = 0.056; g.add(scr);
  g.userData.screen = scr;
  return g;
}

// Laptop: base on y=0, keyboard toward +Z, hinge along the back. userData.lid / userData.screen.
export function laptop(screenTex) {
  const m = inst('laptop'), S = 0.87;
  const lid = G(); lid.position.set(0, 0.0, -1.262); m.add(lid);
  for (const n of ['Object_3', 'Object_5', 'Object_7', 'Object_8']) { const o = byName(m, n); if (o) lid.attach(o); }
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(3.5, 2.2), new THREE.MeshBasicMaterial({ map: screenTex, toneMapped: false }));
  scr.position.set(0, 1.262, 0.006); scr.userData.finalOnly = true; lid.add(scr);
  lid.rotation.x = -0.24;
  const g = G(); m.scale.setScalar(S); m.position.y = 0.14 * S; g.add(m);
  g.userData.lid = lid; g.userData.screen = scr; g.userData.deckY = 0.14 * S;
  return g;
}

// Marker: nib at the origin, barrel along +Y (about 2.2 long).
export function marker() {
  const m = inst('marker');
  m.traverse((o) => { if (o.isSkinnedMesh) o.frustumCulled = false; });
  const inner = G(); inner.add(m); inner.rotation.z = Math.PI; inner.scale.setScalar(0.00246);
  const g = G(); g.add(inner); g.updateMatrixWorld(true);
  const b = new THREE.Box3().setFromObject(g, true), c = b.getCenter(new THREE.Vector3());
  inner.position.set(-c.x, -b.min.y, -c.z);
  return g;
}

const PENCILS = [0xf2617a, 0x56b6f7, 0xf7a035, 0x7ad37f, 0xb26cf5, 0xff8fb8, 0x4fd6c8, 0xf5d04f];
// Wire-mesh pen holder with its pens plus a handful of coloured pencils. Base on y=0, radius ~0.34.
export function penCup(o = {}) {
  const g = fit(inst('pencup'), 0.43), r = rng(o.seed ?? 4);
  for (let i = 0; i < 7; i++) {
    const pg = G(), col = PENCILS[(i + (o.seed ?? 0)) % PENCILS.length], len = 1.0 + r() * 0.3;
    pg.add(mesh(new THREE.CylinderGeometry(0.028, 0.028, len, 6), mat(col, { roughness: 0.45 }), { pos: [0, len / 2, 0] }));
    pg.add(mesh(new THREE.ConeGeometry(0.028, 0.1, 6), mat(0xf0d2ac, { roughness: 0.7 }), { pos: [0, len + 0.05, 0] }));
    pg.add(mesh(new THREE.ConeGeometry(0.011, 0.04, 6), mat(col), { pos: [0, len + 0.09, 0] }));
    const a = r() * TAU, tilt = 0.1 + r() * 0.16, rad = 0.05 + r() * 0.1;
    pg.position.set(Math.cos(a) * rad, 0.06, Math.sin(a) * rad);
    pg.rotation.set(Math.sin(a) * tilt, r() * 3, -Math.cos(a) * tilt);
    g.add(pg);
  }
  return g;
}

// Headphones standing upright on y=0, about 1.05 wide.
export const headphones = () => fit(inst('headphones'), 6.2);
export const mug = () => fit(inst('mug'), 5.6);
// Eames-style chair on y=0, seat facing +Z, about 3.1 tall.
export const chair = () => fit(inst('chair'), 2.9);
export const wallClock = () => fit(inst('wall_clock'), 4.6, { anchor: 'center' });
// Clipboard lying on y=0, long side along X (about 3.4 x 2.3).
export const clipboard = () => fit(inst('clipboard'), 10.2, { rot: [0, Math.PI / 2, 0] });
export const notepads = () => fit(inst('office_notepads'), 2.4);
// Scissors lying flat on y=0, blades toward -Z, about 1.3 long.
export const scissors = () => fit(inst('scissors'), 0.26, { rot: [-Math.PI / 2, 0, Math.PI / 2] });
// Paper clip lying flat, about 0.85 long.
export const paperclip = () => fit(inst('paperclip'), 0.21);

// "Don't push" button on a pink plinth: the kill switch.
export function buzzer() {
  const g = G();
  g.add(mesh(slab(0.74, 0.74, 0.16, 0.09, 0.03), glossy(0xf05a8e), { rot: [-Math.PI / 2, 0, 0], pos: [0, 0.075, 0], vp: 0xd98fc0 }));
  const b = fit(inst('button'), 0.27); b.position.y = 0.14; g.add(b);
  return g;
}

// Umbrella with its shaft on the Y axis and the canopy centred on the origin (radius ~1.25).
export function umbrella() {
  const m = inst('umbrella');
  const axis = new THREE.Vector3(1.91, 1.86, -0.93).normalize(); // handle -> tip in model space
  const inner = G(); inner.add(m); inner.quaternion.setFromUnitVectors(axis, new THREE.Vector3(0, 1, 0)); inner.scale.setScalar(0.52);
  const g = G(); g.add(inner); g.updateMatrixWorld(true);
  const canopy = byMat(g, 'Material.001')[0], b = new THREE.Box3().setFromObject(canopy, true), c = b.getCenter(new THREE.Vector3());
  inner.position.set(-c.x, -c.y + 0.1, -c.z);
  return g;
}

// Folder standing upright, facing +Z, centred, 1.6 wide. userData.open(k) drives its flap rig.
export function folder() {
  const m = inst('folder');
  const g = fit(m, 0.00875, { anchor: 'center' });
  const mixer = new THREE.AnimationMixer(m), clip = src.folder.animations[0];
  mixer.clipAction(clip).play(); mixer.setTime(0); g.updateMatrixWorld(true);
  // brand mark on the front flap, labels on the sheets — parented to the rig's bones
  const front = byName(m, 'FolderFront_04');
  const logo = decal(0.62, 0.62, T.logoTex('#b0164f')); logo.position.set(0, -0.08, 0.2); g.add(logo); g.updateMatrixWorld(true);
  if (front) front.attach(logo);
  ['Paper1_01', 'Paper2_02', 'Paper3_03'].forEach((bn, i) => {
    const bone = byName(m, bn); if (!bone) return;
    const lab = decal(1.2, 0.3, T.labelTex(['policy.yaml', 'audit.log', 'config.yaml'][i])); lab.position.set(0, 0.3, 0.02 + i * 0.012); g.add(lab); g.updateMatrixWorld(true);
    bone.attach(lab);
  });
  g.userData.open = (k) => { mixer.setTime(Math.max(0, Math.min(1, k)) * 0.3); };
  return g;
}
