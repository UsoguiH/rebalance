// OWNER: Builder B. Origin = base of neck. Face the camera (+Z). Units ~ metres, head height ~0.25.
// Keep: head.userData.cheek = Vector3 (head-local) where the propped hand's knuckles should touch.
export function buildHead(THREE, style) {
  const g = new THREE.Group();
  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.12, 32, 24), style.toon(0xf0c9a8));
  skull.position.y = 0.2;
  g.add(skull);
  g.userData.cheek = new THREE.Vector3(0.09, 0.15, 0.09);
  return g;
}
