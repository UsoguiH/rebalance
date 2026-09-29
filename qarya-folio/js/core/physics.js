import * as CANNON from 'cannon-es';

// Thin wrapper over cannon-es: static colliders for buildings, and dynamic
// props (pots, crates, barrels) whose meshes follow their bodies.

export function createPhysics({ events } = {}) {
  const world = new CANNON.World({ gravity: new CANNON.Vec3(0, -22, 0) });
  world.broadphase = new CANNON.SAPBroadphase(world);
  world.allowSleep = true;
  world.defaultContactMaterial.friction = 0.35;
  world.defaultContactMaterial.restitution = 0.15;

  // Every body made here shares one material, so the player can have its own
  // frictionless contact with all of them (see player.js).
  const material = new CANNON.Material('world');
  world.addContactMaterial(new CANNON.ContactMaterial(material, material, { friction: 0.35, restitution: 0.15 }));

  const synced = [];

  function place(body, { position = [0, 0, 0], rotationY = 0 }) {
    body.position.set(position[0], position[1], position[2]);
    if (rotationY) body.quaternion.setFromEuler(0, rotationY, 0);
  }

  // Dynamic props report hard knocks as 'prop:hit' { kind, speed, position }
  // so the audio module can clonk, clatter or splash.
  function finish(body, mesh, mass, kind) {
    body.material = material;
    world.addBody(body);
    if (mass > 0 && events) {
      let last = 0;
      body.addEventListener('collide', (ev) => {
        const speed = Math.abs(ev.contact.getImpactVelocityAlongNormal());
        const now = performance.now();
        if (speed < 1.2 || now - last < 90) return;
        last = now;
        events.emit('prop:hit', { kind: kind || 'wood', speed, position: body.position });
      });
    }
    if (mesh && mass > 0) {
      synced.push({ body, mesh });
      mesh.position.copy(body.position);
      mesh.quaternion.copy(body.quaternion);
    }
    return body;
  }

  const api = {
    world,
    CANNON,
    material,

    // Axis-aligned box (before rotationY). size = [w, h, d] full extents,
    // position = centre of the box.
    addBox({ size, position, rotationY = 0, mass = 0, mesh = null, kind }) {
      const body = new CANNON.Body({ mass, allowSleep: true, sleepSpeedLimit: 0.2, sleepTimeLimit: 1 });
      body.addShape(new CANNON.Box(new CANNON.Vec3(size[0] / 2, size[1] / 2, size[2] / 2)));
      place(body, { position, rotationY });
      if (mass > 0) { body.linearDamping = 0.15; body.angularDamping = 0.25; body.sleep(); }
      return finish(body, mesh, mass, kind);
    },

    // Upright cylinder, position = centre.
    addCylinder({ radius, height, position, mass = 0, mesh = null, kind, segments = 10 }) {
      const body = new CANNON.Body({ mass, allowSleep: true, sleepSpeedLimit: 0.2, sleepTimeLimit: 1 });
      body.addShape(new CANNON.Cylinder(radius, radius, height, segments));
      place(body, { position });
      if (mass > 0) { body.linearDamping = 0.15; body.angularDamping = 0.25; body.sleep(); }
      return finish(body, mesh, mass, kind);
    },

    addSphere({ radius, position, mass = 0, mesh = null, kind }) {
      const body = new CANNON.Body({ mass, allowSleep: true, sleepSpeedLimit: 0.2, sleepTimeLimit: 1 });
      body.addShape(new CANNON.Sphere(radius));
      place(body, { position });
      if (mass > 0) { body.linearDamping = 0.2; body.angularDamping = 0.3; body.sleep(); }
      return finish(body, mesh, mass, kind);
    },

    // Link any body to a mesh so it follows each frame.
    sync(body, mesh) { synced.push({ body, mesh }); },

    step(dt) {
      world.step(1 / 60, dt, 4);
      for (const s of synced) {
        s.mesh.position.set(s.body.position.x, s.body.position.y, s.body.position.z);
        s.mesh.quaternion.set(s.body.quaternion.x, s.body.quaternion.y, s.body.quaternion.z, s.body.quaternion.w);
      }
    },

    // Ray straight down against group-1 bodies (everything but the player);
    // returns hit distance or Infinity.
    rayDown(from, length) {
      const res = new CANNON.RaycastResult();
      const a = new CANNON.Vec3(from.x, from.y, from.z);
      const b = new CANNON.Vec3(from.x, from.y - length, from.z);
      world.raycastClosest(a, b, { skipBackfaces: true, collisionFilterMask: 1 }, res);
      if (!res.hasHit) return Infinity;
      return res.distance;
    },
  };
  return api;
}
