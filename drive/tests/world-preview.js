import * as THREE from 'three';
import { createWorld } from '../js/world.js';
const q = new URLSearchParams(location.search);
const quality = q.get('q') || 'med';
const W = +(q.get('w') || 800), H = +(q.get('h') || 450);
const renderer = new THREE.WebGLRenderer({ antialias: false, preserveDrawingBuffer: true });
renderer.setPixelRatio(1); renderer.setSize(W, H);
document.body.appendChild(renderer.domElement);
const scene = new THREE.Scene();
const cam = new THREE.PerspectiveCamera(58, W / H, 0.3, 700);
const t0 = performance.now();
const world = createWorld({ quality });
world.configureRenderer(renderer);
world.applyTo(scene);
window.world = world; window.renderer = renderer; window.THREE = THREE;
window.buildMs = performance.now() - t0;
let time = 0;
window.shot = (o) => {
  const { pos, look, tod, t = 3, fov } = o;
  if (tod !== undefined) world.setTimeOfDay(tod);
  if (fov) { cam.fov = fov; cam.updateProjectionMatrix(); }
  const p = o.player || { x: look[0], y: 0, z: look[2] };
  cam.position.set(pos[0], pos[1], pos[2]); cam.lookAt(look[0], look[1], look[2]);
  for (let i = 0; i < 4; i++) { time += t / 4; world.update(t / 4, time, p); }
  renderer.info.reset();
  renderer.render(scene, cam);
  const i = renderer.info;
  return { calls: i.render.calls, tris: i.render.triangles, geos: i.memory.geometries, tex: i.memory.textures };
};
window.ready = true;
