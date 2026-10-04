// Orchestrator. Each module is owned by one agent — do NOT edit another agent's file.
//   src/body.js   (Builder A)  torso, suit, arms, hands, legs, boots, throne
//   src/head.js   (Builder B)  neck, head, face, hair, eyepatch/monocle
//   src/style.js  (Style agent) materials, outlines, lighting, backdrop, camera, post-processing
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { buildBody } from './src/body.js';
import { buildHead } from './src/head.js';
import * as style from './src/style.js';

const shotMode = new URLSearchParams(location.search).has('shot');
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(shotMode ? 1 : Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
const stage = style.createStage(THREE, renderer, scene); // -> { camera, target, render(), resize(w,h) }

const body = buildBody(THREE, style);           // origin = floor centre; userData.neck = Vector3 where head attaches
const head = buildHead(THREE, style);           // origin = base of neck
head.position.copy(body.userData.neck || new THREE.Vector3(0, 1.3, 0));
const baku = new THREE.Group();
baku.name = 'baku';
baku.add(body, head);
scene.add(baku);
style.finalize?.(THREE, scene, baku, stage);    // outlines etc.

addEventListener('resize', () => { renderer.setSize(innerWidth, innerHeight); stage.resize(innerWidth, innerHeight); });
stage.resize(innerWidth, innerHeight);

if (shotMode) {
  stage.render();
  window.__ready = true;
} else {
  const controls = new OrbitControls(stage.camera, renderer.domElement);
  controls.target.copy(stage.target);
  controls.enableDamping = true;
  const home = { p: stage.camera.position.clone(), t: stage.target.clone() };
  addEventListener('dblclick', () => { stage.camera.position.copy(home.p); controls.target.copy(home.t); });
  (function loop() { controls.update(); stage.render(); requestAnimationFrame(loop); })();
}
