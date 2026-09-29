import * as THREE from 'three';
import { buildCamel, DIM } from './model.js';

// الجمل — a toy dromedary with a procedural rig.
//
// Legs are placed with 2-bone IK toward foot targets on the sand, so feet
// plant while the body bobs. The gait is a pace (both legs on one side move
// together) whose cadence follows |speed|; boost blends into a bouncier,
// bounding run. Tassels, the bell and the chin tassel are little verlet
// pendulums that feel the camel's acceleration.

const { clamp, lerp } = THREE.MathUtils;
const TAU = Math.PI * 2;
const frac = (x) => x - Math.floor(x);
const approach = (cur, target, rate, dt) => cur + (target - cur) * (1 - Math.exp(-rate * dt));

// phase offsets per leg: LF, RF, LH, RH
const PACE = [0, 0.5, 0.04, 0.54];
const BOUND = [0, 0.12, 0.5, 0.62];

export function createCamel(ctx) {
  const M = buildCamel(ctx);
  const { group, rig, torso, neckBase, neck, head, jaw, eyes, ears, tail, legs, pendulums, reins, bits, pommel } = M;
  group.userData.triangles = M.tris;

  const st = {
    phase: 0, moveK: 0, boostK: 0, air: 0, airT: 0,
    squash: 0, squashV: 0,
    wasJumping: false, wasGrounded: true, minVy: 0,
    grunt: 0, blink: 0, nextBlink: 1.5,
    ear: [0, 0], earV: [0, 0], nextEar: 2.5,
    prevSpeed: 0, prevVy: 0, fwdAcc: 0, vertAcc: 0,
    lean: 0, look: 0,
  };

  const hipV = new THREE.Vector3();
  const tgt = new THREE.Vector3();

  function solveLeg(leg, target, footPitch) {
    hipV.copy(leg.hip).applyMatrix4(torso.matrix);
    leg.root.position.copy(hipV);
    const dz = target.z - hipV.z, dy = target.y - hipV.y;
    const L1 = DIM.L1, L2 = DIM.L2;
    const r = clamp(Math.hypot(dz, dy), 0.35, L1 + L2 - 0.002);
    const phi = Math.atan2(-dz, -dy);
    const alpha = Math.acos(clamp((L1 * L1 + r * r - L2 * L2) / (2 * L1 * r), -1, 1));
    const beta = Math.PI - Math.acos(clamp((L1 * L1 + L2 * L2 - r * r) / (2 * L1 * L2), -1, 1));
    const k = leg.front ? 1 : -1; // front "knee" points forward, hind hock points back
    const t1 = phi - k * alpha;
    const t2 = k * beta;
    leg.upper.rotation.x = t1;
    leg.knee.rotation.x = t2;
    leg.foot.rotation.x = -(t1 + t2) + footPitch;
  }

  // ---- pendulums (verlet in group space) ----
  const gInv = new THREE.Matrix4();
  const gq = new THREE.Quaternion();
  const pq = new THREE.Quaternion();
  const pv = new THREE.Vector3();
  const dir = new THREE.Vector3();
  const vel = new THREE.Vector3();
  const DOWN = new THREE.Vector3(0, -1, 0);
  const acc = new THREE.Vector3();

  function stepPendulums(dt) {
    gInv.copy(group.matrixWorld).invert();
    group.getWorldQuaternion(gq).invert();
    for (const p of pendulums) {
      p.pivot.getWorldPosition(pv).applyMatrix4(gInv);
      if (!p.bob) {
        p.bob = pv.clone().addScaledVector(DOWN, p.len);
        p.prev = p.bob.clone();
      }
      vel.subVectors(p.bob, p.prev).multiplyScalar(Math.pow(p.damp, dt * 60) );
      p.prev.copy(p.bob);
      p.bob.add(vel).addScaledVector(acc, dt * dt);
      dir.subVectors(p.bob, pv);
      if (dir.lengthSq() < 1e-8) dir.copy(DOWN);
      dir.normalize();
      // keep it from swinging up through the body
      if (dir.y > 0.2) { dir.y = 0.2; dir.normalize(); }
      p.bob.copy(pv).addScaledVector(dir, p.len);
      // express the direction in the pivot parent's frame
      p.pivot.parent.getWorldQuaternion(pq);
      pq.premultiply(gq).invert();
      dir.applyQuaternion(pq);
      p.pivot.quaternion.setFromUnitVectors(DOWN, dir);
    }
  }

  // ---- reins: two sagging segments per side ----
  const a = new THREE.Vector3(), c = new THREE.Vector3(), mid = new THREE.Vector3();
  const Y = new THREE.Vector3(0, 1, 0);
  function segment(mesh, p0, p1) {
    mesh.position.addVectors(p0, p1).multiplyScalar(0.5);
    dir.subVectors(p1, p0);
    const len = dir.length();
    mesh.scale.set(1, len, 1);
    mesh.quaternion.setFromUnitVectors(Y, dir.divideScalar(len || 1));
  }
  function updateReins() {
    for (let i = 0; i < 2; i++) {
      bits[i].getWorldPosition(a).applyMatrix4(gInv);
      pommel.getWorldPosition(c).applyMatrix4(gInv);
      c.x += (i ? -1 : 1) * 0.06;
      mid.lerpVectors(a, c, 0.45);
      mid.y -= 0.16 + st.air * -0.1;
      mid.x += (i ? -1 : 1) * 0.1;
      segment(reins[i * 2], a, mid);
      segment(reins[i * 2 + 1], mid, c);
    }
  }

  function update(dt, s) {
    dt = Math.min(dt, 1 / 20);
    const t = s.t;
    const v = s.speed;
    const av = Math.abs(v);

    // ---- state blends ----
    st.moveK = approach(st.moveK, clamp(av / 2.5, 0, 1), 6, dt);
    st.boostK = approach(st.boostK, s.boost && av > 3 ? 1 : 0, 4, dt);
    st.airT = s.grounded ? 0 : st.airT + dt;
    const inAir = s.jumping || st.airT > 0.2;
    // tuck most around the apex, reach for the ground when falling
    const airTarget = inAir ? clamp(1 - Math.max(0, -s.vy - 2) / 7, 0.35, 1) : 0;
    st.air = approach(st.air, airTarget, inAir ? 9 : 14, dt);
    if (!s.grounded || s.jumping) st.minVy = Math.min(st.minVy, s.vy);

    // take-off stretch, landing squash
    if (s.jumping && !st.wasJumping) st.squashV += 1.4;
    const landed = (st.wasJumping && !s.jumping) || (!st.wasGrounded && s.grounded && st.minVy < -5 && !s.jumping);
    if (landed) {
      const impact = clamp(-st.minVy / 9, 0.35, 1.2);
      st.squashV -= 2.6 * impact;
      st.minVy = 0;
    }
    if (s.grounded && !s.jumping) st.minVy = Math.min(0, st.minVy * 0.5);
    st.wasJumping = s.jumping;
    st.wasGrounded = s.grounded;
    st.squashV += (-170 * st.squash - 11 * st.squashV) * dt;
    st.squash = clamp(st.squash + st.squashV * dt, -0.3, 0.2);
    rig.scale.set(1 - st.squash * 0.55, 1 + st.squash, 1 - st.squash * 0.55);

    // accelerations felt by the dangly bits
    const fwdAcc = clamp((v - st.prevSpeed) / Math.max(dt, 1e-3), -25, 25);
    st.prevSpeed = v;
    st.fwdAcc = approach(st.fwdAcc, fwdAcc, 12, dt);
    const vAcc = clamp((s.vy - st.prevVy) / Math.max(dt, 1e-3), -30, 30);
    st.prevVy = s.vy;
    st.vertAcc = approach(st.vertAcc, s.grounded && !s.jumping ? 0 : vAcc, 10, dt);
    const latAcc = v * s.turn * 2.6;

    // ---- gait ----
    const cadence = 0.5 + 0.25 * av + st.boostK * 0.3;
    st.phase += dt * cadence * (v < 0 ? -1 : 1) * (0.25 + 0.75 * st.moveK);
    const ph = st.phase;
    const mk = st.moveK * (1 - st.air);
    const bk = st.boostK;
    const duty = lerp(0.6, 0.4, bk);
    const halfStride = mk * lerp(0.3, 0.44, bk);
    const lift = mk * lerp(0.2, 0.34, bk);

    // ---- torso ----
    const idle = (1 - st.moveK) * (1 - st.air);
    const breath = Math.sin(t * 1.9);
    const paceBob = Math.cos((ph - duty / 2) * TAU * 2) * 0.025;
    const runBob = Math.sin((ph - 0.1) * TAU) * 0.09;
    const bob = mk * lerp(paceBob, runBob, bk);
    const paceRoll = Math.sin(ph * TAU) * 0.07 * (1 - bk);
    st.lean = approach(st.lean, clamp(-v * s.turn * 0.022, -0.2, 0.2), 5, dt);
    torso.position.set(
      Math.sin(t * 0.45) * 0.015 * idle,
      DIM.torsoY + bob - 0.02 * mk + breath * 0.008 * idle + st.air * 0.08,
      0);
    torso.rotation.set(
      mk * bk * Math.cos(ph * TAU) * 0.07 - 0.03 * st.fwdAcc / 20 + st.air * (s.vy > 0 ? -0.1 : 0.06),
      0,
      mk * paceRoll + st.lean);
    torso.scale.set(1 + breath * 0.01 * idle, 1 + breath * 0.015 * idle, 1);
    torso.updateMatrix();

    // ---- legs ----
    for (let i = 0; i < 4; i++) {
      const leg = legs[i];
      const off = lerp(PACE[i], BOUND[i], bk);
      const u = frac(ph + off);
      let z, y, pitch;
      if (u < duty) {
        const k = u / duty;
        z = halfStride * (1 - 2 * k);
        y = 0;
        pitch = 0;
      } else {
        const k = (u - duty) / (1 - duty);
        const e = k * k * (3 - 2 * k);
        z = halfStride * (-1 + 2 * e);
        y = lift * Math.sin(Math.PI * k);
        pitch = 0.6 * Math.sin(Math.PI * k) * (v < 0 ? -0.5 : 1) * mk;
      }
      tgt.set(0, DIM.PAD + y, leg.home + z + (leg.front ? 0.05 : -0.03) * mk * bk);
      // in the air: tuck under the body
      if (st.air > 0.001) {
        hipV.copy(leg.hip).applyMatrix4(torso.matrix);
        const tuckY = hipV.y - (leg.front ? 0.78 : 0.82);
        const tuckZ = hipV.z + (leg.front ? 0.12 : -0.22);
        tgt.y = lerp(tgt.y, tuckY, st.air);
        tgt.z = lerp(tgt.z, tuckZ, st.air);
        pitch = lerp(pitch, leg.front ? 0.9 : 0.4, st.air);
      }
      solveLeg(leg, tgt, pitch);
    }

    // ---- neck & head ----
    if (st.grunt > 0) st.grunt = Math.max(0, st.grunt - dt);
    const gk = st.grunt > 0 ? Math.sin(Math.PI * Math.pow(1 - st.grunt / 0.8, 0.6)) : 0;
    st.look = approach(st.look, clamp(s.turn * 0.45, -0.45, 0.45), 4, dt);
    const idleLook = (Math.sin(t * 0.31) * 0.6 + Math.sin(t * 0.17 + 1) * 0.4) * 0.35 * idle;
    neckBase.rotation.y = st.look + idleLook * 0.5;
    const counterBob = -bob * 2.2;
    const nod = mk * Math.sin(ph * TAU * 2 + 0.8) * 0.05 * (1 - bk) + mk * bk * Math.sin(ph * TAU + 1.5) * 0.12;
    neck[0].rotation.x = DIM.neckRest[0] + counterBob + nod - st.air * 0.35 + bk * mk * 0.12 + breath * 0.015 * idle;
    neck[1].rotation.x = DIM.neckRest[1] + st.air * 0.35 + bk * mk * 0.1 - gk * 0.25;
    neck[2].rotation.x = DIM.neckRest[2] + st.air * 0.2 - gk * 0.45 - counterBob * 0.5;
    const absNeck = neck[0].rotation.x + neck[1].rotation.x + neck[2].rotation.x;
    head.rotation.x = -absNeck - gk * 0.55 + st.air * 0.15 + nod * 0.5 + Math.sin(t * 0.6) * 0.04 * idle;
    head.rotation.y = idleLook * 0.8 + st.look * 0.4;
    head.rotation.z = gk * Math.sin(t * 28) * 0.08 + Math.sin(t * 0.5) * 0.05 * idle;

    // jaw: chewing when idle, wide open for a grunt
    const chew = idle * (1 - gk);
    jaw.rotation.x = gk * 0.55 + chew * (0.5 + 0.5 * Math.sin(t * 9)) * 0.08 + st.air * 0.1;
    jaw.rotation.y = chew * Math.sin(t * 4.5) * 0.1;

    // blink
    st.nextBlink -= dt;
    if (st.nextBlink <= 0) { st.blink = 0.16; st.nextBlink = 1.8 + Math.random() * 3.5; }
    let eyeY = 1;
    if (st.blink > 0) { st.blink = Math.max(0, st.blink - dt); eyeY = 1 - 0.88 * Math.sin(Math.PI * (1 - st.blink / 0.16)); }
    if (gk > 0) eyeY = Math.min(eyeY, 1 - gk * 0.6); // squint while grunting
    for (const e of eyes) e.scale.y = eyeY;

    // ear flicks
    st.nextEar -= dt;
    if (st.nextEar <= 0) {
      const which = Math.random() < 0.5 ? 0 : 1;
      st.earV[which] += 14 + Math.random() * 8;
      if (Math.random() < 0.3) st.earV[1 - which] += 12;
      st.nextEar = 1.5 + Math.random() * 4;
    }
    for (let i = 0; i < 2; i++) {
      st.earV[i] += (-260 * st.ear[i] - 9 * st.earV[i]) * dt;
      st.ear[i] += st.earV[i] * dt;
      const e = ears[i], r = e.userData.rest, sx = i === 0 ? 1 : -1;
      const back = st.air * 0.6 + gk * 0.8 + bk * mk * 0.5;
      e.rotation.x = r.x - back + st.ear[i] * 0.4;
      e.rotation.z = r.z + sx * st.ear[i] * 0.5 + sx * back * 0.3;
    }

    // tail
    const sway = Math.sin(ph * TAU) * 0.25 * mk + Math.sin(t * 1.3) * 0.18 * idle + Math.sin(t * 3.1) * 0.08 * idle * (Math.sin(t * 0.4) > 0.6 ? 1 : 0);
    tail[0].rotation.x = 0.35 + 0.7 * bk * mk + st.air * 0.8 - st.fwdAcc * 0.01;
    tail[0].rotation.z = sway;
    tail[1].rotation.x = 0.12 + 0.2 * bk * mk + st.air * 0.2;
    tail[1].rotation.z = Math.sin(ph * TAU - 0.9) * 0.25 * mk + Math.sin(t * 1.3 - 0.8) * 0.2 * idle;
    tail[2].rotation.x = 0.1;
    tail[2].rotation.z = Math.sin(ph * TAU - 1.8) * 0.3 * mk + Math.sin(t * 1.3 - 1.6) * 0.25 * idle;

    // ---- secondary motion ----
    group.updateMatrixWorld(true);
    acc.set(-latAcc, -9.8 - st.vertAcc, -st.fwdAcc);
    stepPendulums(dt);
    updateReins();
  }

  function grunt() {
    st.grunt = 0.8;
  }

  // settle the pose once so the first frame is right
  update(1 / 60, { t: 0, speed: 0, maxSpeed: 13, turn: 0, grounded: true, jumping: false, vy: 0, boost: false });

  return { group, update, grunt };
}
