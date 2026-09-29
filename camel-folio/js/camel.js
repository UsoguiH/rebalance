import * as THREE from 'three';
import { rugTexture } from './textures.js';

const FUR = '#c9965a';
const FUR_DARK = '#a8743e';
const FUR_LIGHT = '#dcb27a';

function mat(color, extra = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.9, metalness: 0, flatShading: true, ...extra });
}

function mesh(geo, material, { x = 0, y = 0, z = 0, sx = 1, sy = 1, sz = 1, rx = 0, ry = 0, rz = 0 } = {}) {
  const m = new THREE.Mesh(geo, material);
  m.position.set(x, y, z);
  m.scale.set(sx, sy, sz);
  m.rotation.set(rx, ry, rz);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

const tmp = new THREE.Vector3();
const tmp2 = new THREE.Vector3();

// A camel built from primitives, with a joint hierarchy we animate by hand.
// Local forward is +Z.
export class Camel {
  constructor() {
    this.group = new THREE.Group();
    this.position = this.group.position;
    this.heading = Math.PI; // facing -Z (up the screen) at start
    this.speed = 0;
    this.forwardSpeed = 0;
    this.prevFs = 0;
    this.vel = new THREE.Vector3();
    this.angVel = 0;
    this.spring = { y: 0, yV: 0, pitch: 0, pitchV: 0, roll: 0, rollV: 0 };
    this.onBump = null;
    this.vy = 0;
    this.onGround = true;
    this.phase = 0;
    this.gait = 0; // 0 idle .. 1 full stride
    this.turnRate = 0;
    this.time = 0;
    this.blinkT = 2;
    this.lookT = 0;
    this.lookTarget = 0;
    this.chew = 0;
    this.radius = 1.3;
    this.inWater = false;
    this.onStep = null; // (side, strength) => void
    this.onLand = null;
    this.build();
    this.group.rotation.y = this.heading;
  }

  build() {
    const fur = mat(FUR);
    const furDark = mat(FUR_DARK);
    const furLight = mat(FUR_LIGHT);
    const black = mat('#1d140e', { roughness: 0.4 });
    const white = mat('#fff8ec');
    const sphere = new THREE.SphereGeometry(1, 14, 10);
    const lowSphere = new THREE.SphereGeometry(1, 9, 7);

    // Body pivot sits at hip height; it bobs and rolls with the gait.
    const body = (this.body = new THREE.Group());
    body.position.y = 1.72;
    this.group.add(body);

    this.torso = mesh(sphere, fur, { sx: 0.68, sy: 0.6, sz: 1.22 });
    body.add(this.torso);
    // Belly, chest and rump shapes give a less blobby silhouette.
    body.add(mesh(sphere, furLight, { y: -0.18, z: 0.1, sx: 0.6, sy: 0.45, sz: 1.0 }));
    body.add(mesh(sphere, fur, { y: 0.02, z: 0.78, sx: 0.58, sy: 0.6, sz: 0.55 }));
    body.add(mesh(sphere, fur, { y: 0.05, z: -0.85, sx: 0.6, sy: 0.55, sz: 0.5 }));
    this.hump = mesh(sphere, furDark, { y: 0.5, z: -0.05, sx: 0.5, sy: 0.55, sz: 0.62 });
    body.add(this.hump);

    // Saddle blanket draped over the hump, with tassels.
    const rug = rugTexture('#b5473a', '#2f6f73', '#f2c14e');
    rug.repeat.set(2, 1);
    const blanketGeo = new THREE.CylinderGeometry(0.78, 0.78, 0.95, 20, 1, true, -Math.PI * 0.62, Math.PI * 1.24);
    blanketGeo.rotateZ(Math.PI / 2);
    blanketGeo.rotateY(Math.PI / 2);
    const blanket = mesh(blanketGeo, new THREE.MeshStandardMaterial({ map: rug, roughness: 1, side: THREE.DoubleSide }), { y: 0.02, z: -0.05, sy: 0.95, sx: 0.93 });
    body.add(blanket);
    const tasselGeo = new THREE.ConeGeometry(0.06, 0.2, 5);
    const tasselMats = [mat('#f2c14e'), mat('#b5473a'), mat('#2f6f73')];
    this.tassels = new THREE.Group();
    for (let i = 0; i < 10; i++) {
      const side = i < 5 ? -1 : 1;
      const k = i % 5;
      const t = mesh(tasselGeo, tasselMats[k % 3], { x: side * 0.73, y: -0.5, z: -0.4 + k * 0.2, rx: Math.PI });
      this.tassels.add(t);
    }
    body.add(this.tassels);

    // Tail.
    this.tail = new THREE.Group();
    this.tail.position.set(0, 0.2, -1.18);
    this.tail.rotation.x = -0.35;
    const tailMesh = mesh(new THREE.CylinderGeometry(0.03, 0.06, 0.8, 6), furDark, { y: -0.4 });
    const tuft = mesh(lowSphere, black, { y: -0.82, sx: 0.08, sy: 0.14, sz: 0.08 });
    this.tail.add(tailMesh, tuft);
    body.add(this.tail);

    // Neck: two segments for the camel's S-curve, then the head.
    this.neck = new THREE.Group();
    this.neck.position.set(0, 0.12, 1.05);
    this.neck.rotation.x = 1.0;
    body.add(this.neck);
    this.neck.add(mesh(new THREE.CylinderGeometry(0.2, 0.3, 0.95, 10), fur, { y: 0.45 }));
    this.neck.add(mesh(sphere, fur, { y: 0.0, sx: 0.32, sy: 0.32, sz: 0.36 }));
    this.neck2 = new THREE.Group();
    this.neck2.position.y = 0.9;
    this.neck2.rotation.x = -1.05;
    this.neck.add(this.neck2);
    this.neck2.add(mesh(sphere, fur, { sx: 0.2, sy: 0.2, sz: 0.2 }));
    this.neck2.add(mesh(new THREE.CylinderGeometry(0.17, 0.2, 0.75, 10), fur, { y: 0.36 }));
    // Throat hair ridge.
    this.neck2.add(mesh(lowSphere, furDark, { y: 0.3, z: -0.1, sx: 0.1, sy: 0.4, sz: 0.1 }));

    this.head = new THREE.Group();
    this.head.position.y = 0.78;
    this.head.rotation.x = 0.1;
    this.neck2.add(this.head);
    this.head.add(mesh(sphere, fur, { y: 0.05, z: 0.08, sx: 0.23, sy: 0.24, sz: 0.34 }));
    this.head.add(mesh(sphere, furLight, { y: -0.04, z: 0.42, sx: 0.17, sy: 0.17, sz: 0.24 }));
    // Split upper lip.
    this.head.add(mesh(lowSphere, furLight, { x: 0.06, y: -0.1, z: 0.6, sx: 0.08, sy: 0.07, sz: 0.08 }));
    this.head.add(mesh(lowSphere, furLight, { x: -0.06, y: -0.1, z: 0.6, sx: 0.08, sy: 0.07, sz: 0.08 }));
    // Lower jaw (chews).
    this.jaw = new THREE.Group();
    this.jaw.position.set(0, -0.12, 0.25);
    this.jaw.add(mesh(sphere, furDark, { z: 0.22, sx: 0.12, sy: 0.06, sz: 0.2 }));
    this.head.add(this.jaw);
    // Nostrils.
    for (const s of [-1, 1]) this.head.add(mesh(lowSphere, black, { x: s * 0.08, y: 0.0, z: 0.63, sx: 0.025, sy: 0.02, sz: 0.02 }));
    // Eyes with lids for blinking.
    this.eyes = [];
    for (const s of [-1, 1]) {
      const eye = new THREE.Group();
      eye.position.set(s * 0.19, 0.13, 0.2);
      eye.add(mesh(lowSphere, white, { sx: 0.075, sy: 0.075, sz: 0.075 }));
      eye.add(mesh(lowSphere, black, { x: s * 0.03, z: 0.03, sx: 0.05, sy: 0.055, sz: 0.05 }));
      eye.add(mesh(lowSphere, fur, { x: 0, y: 0.05, sx: 0.085, sy: 0.04, sz: 0.085 }));
      this.head.add(eye);
      this.eyes.push(eye);
    }
    // Ears.
    this.ears = [];
    for (const s of [-1, 1]) {
      const ear = new THREE.Group();
      ear.position.set(s * 0.15, 0.25, -0.05);
      ear.rotation.z = -s * 0.5;
      ear.add(mesh(new THREE.ConeGeometry(0.06, 0.18, 6), fur, { y: 0.07 }));
      this.head.add(ear);
      this.ears.push(ear);
    }
    // Bridle: red halter around the muzzle with a gold ring.
    const rope = mat('#b5473a');
    this.head.add(mesh(new THREE.TorusGeometry(0.2, 0.025, 6, 16), rope, { z: 0.4, y: -0.02, sx: 0.95, sy: 0.95 }));
    this.head.add(mesh(new THREE.TorusGeometry(0.26, 0.022, 6, 16), rope, { z: 0.08, y: 0.03, ry: Math.PI / 2, rz: 0.2 }));
    this.head.add(mesh(new THREE.TorusGeometry(0.05, 0.015, 6, 10), mat('#f2c14e', { metalness: 0.6, roughness: 0.3 }), { x: 0.2, y: -0.08, z: 0.4, ry: Math.PI / 2 }));

    // Legs: hip -> upper -> knee -> lower -> foot.
    this.legs = [];
    const upperGeo = new THREE.CylinderGeometry(0.14, 0.1, 0.78, 8);
    const lowerGeo = new THREE.CylinderGeometry(0.085, 0.07, 0.62, 8);
    const legDefs = [
      { x: 0.33, z: 0.78, side: 1, front: true },
      { x: -0.33, z: 0.78, side: -1, front: true },
      { x: 0.33, z: -0.78, side: 1, front: false },
      { x: -0.33, z: -0.78, side: -1, front: false },
    ];
    for (const d of legDefs) {
      const hip = new THREE.Group();
      hip.position.set(d.x, -0.28, d.z);
      body.add(hip);
      hip.add(mesh(sphere, fur, { y: -0.05, sx: 0.2, sy: 0.3, sz: 0.25 }));
      hip.add(mesh(upperGeo, fur, { y: -0.39 }));
      const knee = new THREE.Group();
      knee.position.y = -0.78;
      hip.add(knee);
      knee.add(mesh(lowSphere, furDark, { sx: 0.12, sy: 0.12, sz: 0.12 }));
      knee.add(mesh(lowerGeo, fur, { y: -0.31 }));
      const foot = mesh(sphere, furDark, { y: -0.64, z: 0.05, sx: 0.17, sy: 0.07, sz: 0.22 });
      knee.add(foot);
      // Pacing gait: legs on the same side share a phase.
      this.legs.push({ hip, knee, foot, ...d, offset: d.side > 0 ? 0 : Math.PI, lastSin: 0 });
    }

    this.group.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  }

  forward(out = tmp) {
    return out.set(Math.sin(this.heading), 0, Math.cos(this.heading));
  }

  // input: { throttle, steer (keyboard, -1..1), stick: {x, y, active} (screen space), run, jump }
  // Keyboard drives like a vehicle: up/down is throttle, left/right steers relative to the camel.
  // The touch stick points where to go (camera-relative) and feeds the same momentum model.
  update(dt, input, camForward, world) {
    this.time += dt;
    const fwd = this.forward();
    const rx = -fwd.z, rz = fwd.x; // camel's right on the ground plane
    let fs = this.vel.x * fwd.x + this.vel.z * fwd.z; // forward speed
    let ss = this.vel.x * rx + this.vel.z * rz; // sideways (drift) speed

    let throttle = input.throttle || 0;
    let steer = input.steer || 0;
    const st = input.stick;
    if (st && st.active && Math.hypot(st.x, st.y) > 0.08) {
      const mag = Math.min(1, Math.hypot(st.x, st.y));
      const cx = camForward.x, cz = camForward.z;
      const dx = cx * st.y + cz * st.x;
      const dz = cz * st.y - cx * st.x;
      let diff = Math.atan2(dx, dz) - this.heading;
      diff = Math.atan2(Math.sin(diff), Math.cos(diff));
      steer = Math.max(-1, Math.min(1, diff * 2.2));
      throttle = mag * Math.max(0, Math.cos(diff));
    }

    const boost = input.run;
    const maxF = (boost ? 17 : 10) * (this.inWater ? 0.55 : 1);
    const onGround = this.onGround;
    if (throttle > 0) {
      if (fs < 0) fs = Math.min(0, fs + 30 * dt); // braking out of reverse
      else if (fs < maxF * throttle) fs = Math.min(maxF * throttle, fs + (boost ? 26 : 18) * throttle * dt);
      else fs += (maxF * throttle - fs) * Math.min(1, dt * 2);
    } else if (throttle < 0) {
      if (fs > 0.3) fs = Math.max(0, fs - 32 * dt); // brake
      else fs = Math.max(-4.5, fs - 12 * dt); // reverse
    } else {
      fs *= Math.exp(-dt * (onGround ? 2.4 : 0.3)); // coast to a stop
      if (Math.abs(fs) < 0.05) fs = 0;
    }
    // Grip kills sideways speed; less grip while boosting lets the camel slide into turns.
    if (onGround) ss *= Math.exp(-dt * (boost ? 3.5 : 9));

    // Steering: faster when moving, reversed when backing up, and a slow pivot on the spot.
    const moving = Math.min(1, Math.abs(fs) / 5);
    const dir = fs < -0.2 ? -1 : 1;
    const targetAng = steer * (1.1 + moving * 1.6) * dir * (boost ? 0.85 : 1);
    this.angVel += (targetAng - this.angVel) * Math.min(1, dt * 10);
    this.heading += this.angVel * dt;
    this.turnRate = this.angVel;

    const f2 = this.forward(tmp2);
    const r2x = -f2.z, r2z = f2.x;
    this.vel.set(f2.x * fs + r2x * ss, 0, f2.z * fs + r2z * ss);

    // Move, then bounce off static colliders.
    const px = this.position.x + this.vel.x * dt;
    const pz = this.position.z + this.vel.z * dt;
    const res = world.resolve(px, pz, this.radius);
    const nx = res.x - px, nz = res.z - pz;
    const nl = Math.hypot(nx, nz);
    if (nl > 1e-5) {
      const ux = nx / nl, uz = nz / nl;
      const vn = this.vel.x * ux + this.vel.z * uz;
      if (vn < 0) {
        this.vel.x -= 1.35 * vn * ux;
        this.vel.z -= 1.35 * vn * uz;
        if (-vn > 3 && this.onBump) this.onBump(-vn);
        this.spring.pitchV += vn * 0.08;
      }
    }
    this.position.x = res.x;
    this.position.z = res.z;
    this.forwardSpeed = this.vel.x * f2.x + this.vel.z * f2.z;
    this.speed = Math.abs(this.forwardSpeed);

    // Suspension-like springs driven by acceleration and turning.
    const accel = (this.forwardSpeed - this.prevFs) / Math.max(dt, 1e-4);
    this.prevFs = this.forwardSpeed;
    const sp = this.spring;
    const pitchTarget = Math.max(-0.14, Math.min(0.14, -accel * 0.006));
    const rollTarget = Math.max(-0.2, Math.min(0.2, this.forwardSpeed * this.angVel * 0.012));
    sp.pitchV += ((pitchTarget - sp.pitch) * 90 - sp.pitchV * 9) * dt;
    sp.pitch += sp.pitchV * dt;
    sp.rollV += ((rollTarget - sp.roll) * 80 - sp.rollV * 8) * dt;
    sp.roll += sp.rollV * dt;
    sp.yV += ((0 - sp.y) * 120 - sp.yV * 8) * dt;
    sp.y += sp.yV * dt;

    // Jump and gravity.
    const ground = world.heightAt(this.position.x, this.position.z);
    if (input.jump && this.onGround) {
      this.vy = 9.5;
      this.onGround = false;
      sp.yV -= 2.5; // crouch before the leap
    }
    if (!this.onGround) {
      this.vy -= 28 * dt;
      this.position.y += this.vy * dt;
      if (this.position.y <= ground) {
        this.position.y = ground;
        this.onGround = true;
        sp.yV -= Math.min(6, Math.abs(this.vy) * 0.35); // squash on landing
        if (this.onLand) this.onLand(Math.abs(this.vy));
        this.vy = 0;
      }
    } else {
      this.position.y += (ground - this.position.y) * Math.min(1, dt * 12);
    }

    this.group.rotation.y = this.heading;
    this.animate(dt);
  }

  // Drop in from the sky (intro).
  dropFrom(height) {
    this.position.y = height;
    this.onGround = false;
    this.vy = 0;
  }

  animate(dt) {
    const speed = this.speed;
    const targetGait = Math.min(1, speed / 6.5);
    this.gait += (targetGait - this.gait) * Math.min(1, dt * 6);
    const running = Math.max(0, Math.min(1, (speed - 7) / 5));
    // Stride length grows when running so legs don't spin like a cartoon.
    const stride = 2.3 + running * 1.4;
    this.phase += (this.forwardSpeed / stride) * Math.PI * 2 * dt;
    const g = this.gait;
    const amp = 0.32 + running * 0.22;
    const air = this.onGround ? 0 : 1;

    for (const leg of this.legs) {
      const p = this.phase + leg.offset;
      const s = Math.sin(p);
      const c = Math.cos(p);
      const swing = Math.max(0, c); // foot moving forward = in the air
      const hipAngle = -s * amp * g;
      const kneeBend = swing * (0.55 + running * 0.45) * g;
      // Airborne: tuck the legs.
      leg.hip.rotation.x = THREE.MathUtils.lerp(hipAngle, leg.front ? -0.5 : 0.6, air * 0.8);
      leg.knee.rotation.x = THREE.MathUtils.lerp(kneeBend, 1.4, air * 0.8);
      // Foot plants when the swing ends (sin crosses +1 from below).
      if (this.onGround && g > 0.15 && leg.lastSin < 0.97 && s >= 0.97 && this.onStep) {
        leg.foot.getWorldPosition(tmp);
        this.onStep(leg, tmp, g * (0.6 + running * 0.6));
      }
      leg.lastSin = s;
    }

    // Pacing sway, bob, and a lean into turns.
    const breathe = Math.sin(this.time * 1.8) * 0.012;
    const bob = Math.cos(this.phase * 2) * 0.05 * g + running * 0.03 * Math.abs(Math.sin(this.phase));
    const sp = this.spring;
    this.body.position.y = 1.72 + bob + breathe + sp.y * 0.35;
    this.body.rotation.z = Math.sin(this.phase) * 0.06 * g + sp.roll;
    this.body.rotation.x = -running * 0.06 + sp.pitch + (this.onGround ? 0 : -this.vy * 0.015);
    // Squash and stretch from the vertical spring.
    const sq = 1 + Math.max(-0.12, Math.min(0.12, sp.y * 0.6));
    this.body.scale.set(1 / Math.sqrt(sq), sq, 1 / Math.sqrt(sq));
    this.torso.scale.y = 0.6 + breathe;

    // Neck swings forward/back with each step, reaches out when running.
    this.neck.rotation.x = 1.0 + Math.sin(this.phase * 2) * 0.06 * g + running * 0.25;
    this.neck2.rotation.x = -1.05 - running * 0.1;

    // Idle: look around now and then.
    this.lookT -= dt;
    if (this.lookT <= 0) {
      this.lookT = 2 + Math.random() * 4;
      this.lookTarget = g < 0.2 ? (Math.random() - 0.5) * 1.1 : 0;
    }
    const look = g < 0.2 ? this.lookTarget : -this.turnRate * 0.08;
    this.neck.rotation.y += (look - this.neck.rotation.y) * Math.min(1, dt * 2.5);
    this.head.rotation.z = -this.neck.rotation.y * 0.3;

    // Chewing when idle.
    this.chew += dt * (g < 0.2 ? 7 : 0);
    this.jaw.rotation.x = Math.max(0, Math.sin(this.chew)) * 0.12;
    this.jaw.position.x = Math.sin(this.chew * 0.5) * 0.02;

    // Blink.
    this.blinkT -= dt;
    const blink = this.blinkT < 0.12 ? 0.1 : 1;
    if (this.blinkT < 0) this.blinkT = 2 + Math.random() * 4;
    for (const e of this.eyes) e.scale.y = blink;

    // Ears twitch, tail and tassels swing.
    const t = this.time;
    this.ears[0].rotation.x = Math.sin(t * 0.7) > 0.95 ? -0.4 : 0;
    this.ears[1].rotation.x = Math.sin(t * 0.9 + 2) > 0.95 ? -0.4 : 0;
    this.tail.rotation.z = Math.sin(t * 2 + this.phase) * (0.15 + g * 0.2);
    this.tail.rotation.x = -0.35 - running * 0.4;
    this.tassels.children.forEach((ts, i) => {
      ts.rotation.x = Math.PI + Math.sin(this.phase * 2 + i) * 0.25 * g;
    });
  }

  // A little head toss while grunting.
  grunt() {
    this.head.rotation.x = -0.35;
    const back = () => {
      this.head.rotation.x += (0.1 - this.head.rotation.x) * 0.1;
      if (Math.abs(this.head.rotation.x - 0.1) > 0.01) requestAnimationFrame(back);
    };
    setTimeout(back, 350);
  }
}
