// OWNER: Builder A. Origin = floor centre under the throne seat. Units ~ metres, +Z toward camera.
// Keep: group.userData.neck = Vector3 (body-local) where the head attaches.
export function buildBody(THREE, style) {
  const g = new THREE.Group();
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.2, 0.5, 8, 16), style.toon(0xf4f4f4));
  torso.position.set(0, 0.95, 0);
  g.add(torso);
  g.userData.neck = new THREE.Vector3(0, 1.3, 0);
  return g;
}
