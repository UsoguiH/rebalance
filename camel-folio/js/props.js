import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { skills } from './content.js';
import { crateTexture } from './textures.js';
import { ZONES } from './world.js';

const up = new CANNON.Vec3(0, 1, 0);
const tmpV = new CANNON.Vec3();

// Clay jar silhouette (radius, height) for the lathe.
const JAR_PROFILE = [[0, 0], [0.2, 0], [0.26, 0.08], [0.32, 0.35], [0.3, 0.62], [0.2, 0.82], [0.13, 0.9], [0.16, 1.0], [0.15, 1.05], [0, 1.05]];
const JAR_H = 1.05;

export class Props {
  constructor(scene, world, audio) {
    this.scene = scene;
    this.world = world;
    this.audio = audio;
    this.items = [];
    this.jars = [];
    this.knocked = 0;
    this.onJarsChange = null;

    const phys = (this.phys = new CANNON.World({ gravity: new CANNON.Vec3(0, -22, 0) }));
    phys.broadphase = new CANNON.SAPBroadphase(phys);
    phys.allowSleep = true;
    phys.defaultContactMaterial.friction = 0.35;
    phys.defaultContactMaterial.restitution = 0.25;

    const ground = new CANNON.Body({ type: CANNON.Body.STATIC, shape: new CANNON.Plane() });
    ground.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
    phys.addBody(ground);

    // Static colliders mirror the ones the camel uses.
    for (const c of world.colliders) {
      if (Math.hypot(c.x, c.z) > 70) continue;
      const b = new CANNON.Body({ type: CANNON.Body.STATIC, shape: new CANNON.Cylinder(c.r, c.r, 4, 8) });
      b.position.set(c.x, 2, c.z);
      phys.addBody(b);
    }

    // The camel is a kinematic compound: body sphere, head sphere, and a box for the legs.
    const camel = (this.camelBody = new CANNON.Body({ type: CANNON.Body.KINEMATIC, mass: 0 }));
    camel.allowSleep = false;
    camel.addShape(new CANNON.Sphere(1.05), new CANNON.Vec3(0, 1.55, 0));
    camel.addShape(new CANNON.Sphere(0.45), new CANNON.Vec3(0, 2.6, 1.7));
    camel.addShape(new CANNON.Box(new CANNON.Vec3(0.45, 0.55, 1.0)), new CANNON.Vec3(0, 0.6, 0));
    phys.addBody(camel);

    this.buildCrates();
    this.buildJars();
    this.buildBall();
  }

  add(body, mesh, kind) {
    body.sleepSpeedLimit = 0.2;
    body.sleepTimeLimit = 0.6;
    body.linearDamping = 0.05;
    body.angularDamping = 0.1;
    this.phys.addBody(body);
    this.scene.add(mesh);
    const item = { body, mesh, kind, home: { p: body.position.clone(), q: body.quaternion.clone() } };
    body.addEventListener('collide', (e) => {
      const v = Math.abs(e.contact.getImpactVelocityAlongNormal());
      this.audio.hit(kind, v, body.id);
    });
    this.items.push(item);
    return item;
  }

  buildCrates() {
    const { x, z } = ZONES.skills;
    const geo = new THREE.BoxGeometry(1.1, 1.1, 1.1);
    const tints = ['#c8894f', '#b97a44', '#d49a5c'];
    // A pyramid: 4 + 3 + 2 + 1.
    let n = 0;
    for (let row = 0; row < 4 && n < skills.length; row++) {
      const count = 4 - row;
      for (let i = 0; i < count && n < skills.length; i++, n++) {
        const tex = crateTexture(skills[n], tints[n % 3]);
        const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9 });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.castShadow = mesh.receiveShadow = true;
        const body = new CANNON.Body({ mass: 1.6, shape: new CANNON.Box(new CANNON.Vec3(0.55, 0.55, 0.55)) });
        // Crates face the start area (south-east), readable from the default camera.
        body.position.set(x + (i - (count - 1) / 2) * 1.16, 0.55 + row * 1.1, z);
        body.quaternion.setFromEuler(0, 0.35, 0);
        this.add(body, mesh, 'crate');
      }
    }
  }

  buildJars() {
    const { x, z } = this.world.jarOrigin;
    const pts = JAR_PROFILE.map(([r, h]) => new THREE.Vector2(r, h - JAR_H / 2));
    const geo = new THREE.LatheGeometry(pts, 14);
    const colors = ['#c0663a', '#b15a33', '#cf7a46'];
    const bandGeo = new THREE.CylinderGeometry(0.33, 0.33, 0.07, 14, 1, true);
    // Bowling triangle 1-2-3-4, apex toward the lane (+Z).
    let k = 0;
    for (let row = 0; row < 4; row++) {
      for (let i = 0; i <= row; i++) {
        const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: colors[k % 3], roughness: 0.8, flatShading: true }));
        const band = new THREE.Mesh(bandGeo, new THREE.MeshStandardMaterial({ color: '#f4e3c1', side: THREE.DoubleSide }));
        band.position.y = -0.1;
        mesh.add(band);
        mesh.castShadow = mesh.receiveShadow = true;
        const body = new CANNON.Body({ mass: 0.9, shape: new CANNON.Cylinder(0.2, 0.3, JAR_H, 10) });
        body.position.set(x + (i - row / 2) * 1.05, JAR_H / 2 + 0.01, z - row * 0.95);
        const item = this.add(body, mesh, 'jar');
        item.down = false;
        this.jars.push(item);
        k++;
      }
    }
  }

  buildBall() {
    const c = document.createElement('canvas');
    c.width = 256; c.height = 128;
    const ctx = c.getContext('2d');
    const cols = ['#b5473a', '#f4e3c1', '#2f6f73', '#f2c14e'];
    for (let i = 0; i < 8; i++) { ctx.fillStyle = cols[i % 4]; ctx.fillRect(i * 32, 0, 32, 128); }
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.7, 20, 14), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6 }));
    mesh.castShadow = true;
    const body = new CANNON.Body({ mass: 0.5, shape: new CANNON.Sphere(0.7) });
    body.position.set(7, 0.7, -3);
    this.add(body, mesh, 'ball');
    body.linearDamping = 0.25;
    body.angularDamping = 0.3;
  }

  resetJars() {
    for (const j of this.jars) this.restore(j);
    this.knocked = 0;
    for (const j of this.jars) j.down = false;
    if (this.onJarsChange) this.onJarsChange(0, this.jars.length, false);
  }

  restore(item) {
    const b = item.body;
    b.position.copy(item.home.p);
    b.quaternion.copy(item.home.q);
    b.velocity.setZero();
    b.angularVelocity.setZero();
    b.wakeUp();
  }

  // Move the kinematic camel body to match the visual camel.
  syncCamel(camel, dt) {
    const b = this.camelBody;
    const nx = camel.position.x, ny = camel.position.y, nz = camel.position.z;
    if (dt > 0) b.velocity.set((nx - b.position.x) / dt, (ny - b.position.y) / dt, (nz - b.position.z) / dt);
    b.position.set(nx, ny, nz);
    b.quaternion.setFromEuler(0, camel.heading, 0);
  }

  update(dt) {
    this.phys.step(1 / 60, dt, 4);
    for (const it of this.items) {
      it.mesh.position.copy(it.body.position);
      it.mesh.quaternion.copy(it.body.quaternion);
      // Anything that escapes the play area goes home.
      if (it.body.position.y < -5 || Math.hypot(it.body.position.x, it.body.position.z) > 80) this.restore(it);
    }
    let count = 0;
    for (const j of this.jars) {
      if (!j.down) {
        j.body.quaternion.vmult(up, tmpV);
        const moved = j.body.position.distanceTo(j.home.p);
        if (tmpV.y < 0.6 || moved > 1.4) j.down = true;
      }
      if (j.down) count++;
    }
    if (count !== this.knocked) {
      this.knocked = count;
      if (this.onJarsChange) this.onJarsChange(count, this.jars.length, count === this.jars.length);
    }
  }
}
