import * as THREE from 'three';
export function createDecor(ctx, zonesMod) {
  const group = new THREE.Group();
  return { group, update() {}, setNight() {}, stamp() {}, dispose() {}, palms: [] };
}
