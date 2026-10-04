// OWNER: Style agent. Baseline only — replace freely, but keep this exported API:
//   toon(hex, opts?)          -> THREE.Material   (builders use this for EVERY surface)
//   createStage(THREE, renderer, scene) -> { camera, target, render(), resize(w,h) }
//   finalize?(THREE, scene, root, stage)  (called after the model is added; add outlines etc.)
import * as THREE from 'three';

export function toon(hex, opts = {}) {
  return new THREE.MeshToonMaterial({ color: hex, ...opts });
}

export function createStage(_T, renderer, scene) {
  scene.background = new THREE.Color(0xa01830);
  const camera = new THREE.PerspectiveCamera(32, 1156 / 1264, 0.1, 100);
  camera.position.set(0, 1.1, 6.2);
  const target = new THREE.Vector3(0, 1.05, 0);
  camera.lookAt(target);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x884444, 1.2));
  const key = new THREE.DirectionalLight(0xffffff, 2); key.position.set(-3, 4, 5); scene.add(key);
  return {
    camera, target,
    render() { renderer.render(scene, camera); },
    resize(w, h) { camera.aspect = w / h; camera.updateProjectionMatrix(); },
  };
}
