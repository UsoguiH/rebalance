import * as THREE from 'three';

// Follow camera. It keeps a fixed compass direction (looking north from the
// south, tilted down) and never spins with the camel, which keeps the
// joystick intuitive. It leads a little in the direction of travel and pulls
// back when running.

export function createCamera(ctx) {
  const camera = new THREE.PerspectiveCamera(38, innerWidth / innerHeight, 0.5, 600);
  // Looking down from the south. Portrait screens get a steeper angle so the
  // mud houses hide less of the camel.
  const dir = new THREE.Vector3();
  const setDir = () => dir.set(0, innerHeight > innerWidth ? 1.5 : 1.05, 1).normalize();
  setDir();
  const target = new THREE.Vector3();
  const lead = new THREE.Vector3();
  const rig = {
    camera,
    target,
    zoom: 1,        // 0.55 .. 1.6
    distance: 26,
    intro: 1,       // 1 → 0 during the opening fly-in
    shake: 0,
  };

  const portrait = () => innerHeight > innerWidth;

  rig.resize = () => {
    setDir();
    camera.aspect = innerWidth / innerHeight;
    camera.fov = portrait() ? 50 : 38;
    camera.updateProjectionMatrix();
  };
  rig.resize();

  rig.snap = (p) => {
    target.copy(p);
    camera.position.copy(p).addScaledVector(dir, rig.distance * rig.zoom);
    camera.lookAt(target);
  };

  rig.update = (dt, player, input) => {
    rig.zoom = THREE.MathUtils.clamp(rig.zoom + input.zoom, 0.55, 1.6);
    input.zoom = 0;

    const speedK = Math.min(1, Math.abs(player.speed) / player.maxSpeed);
    lead.copy(player.forwardVec).multiplyScalar(player.speed * 0.35);
    const want = player.position.clone().add(lead);
    want.y += 1.2;
    target.lerp(want, Math.min(1, dt * 4));

    // Intro: a little further back, framing the start island, then easing in
    // while the island grows into the world.
    const introK = rig.intro * rig.intro * (3 - 2 * rig.intro);
    const dist = rig.distance * rig.zoom * (1 + speedK * 0.12) + introK * (portrait() ? 17 : 7);
    const pos = target.clone().addScaledVector(dir, dist);
    camera.position.lerp(pos, Math.min(1, dt * 5));
    if (rig.shake > 0) {
      camera.position.x += (Math.random() - 0.5) * rig.shake;
      camera.position.y += (Math.random() - 0.5) * rig.shake;
      rig.shake = Math.max(0, rig.shake - dt * 2);
    }
    camera.lookAt(target);
  };

  return rig;
}
