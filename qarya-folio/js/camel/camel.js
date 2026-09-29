import * as THREE from 'three';

// STUB — replaced by the camel agent. Contract: see ARCHITECTURE.md.
export function createCamel(ctx) {
  const group = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1, 2), ctx.mat(ctx.P.camel));
  body.position.y = 1.6;
  body.castShadow = true;
  group.add(body);
  return { group, update() {}, grunt() {} };
}
