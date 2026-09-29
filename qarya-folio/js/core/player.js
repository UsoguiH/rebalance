import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { LAYOUT, heightAt, normalAt } from './terrain.js';

// The ride. Physics is a single sphere the camel sits on: it rolls over the
// dunes, bumps into walls and knocks props over. Steering sets its
// horizontal velocity directly, so it handles like a toy car: quick to
// accelerate, drifts a little in turns, and hops on Space.

const RADIUS = 0.75;
const WALK = 7.5;   // m/s
const RUN = 13;     // m/s with boost
const BACK = 4;
const TURN = 2.6;   // rad/s at full speed

export function createPlayer(ctx) {
  const { physics, events, input } = ctx;
  const body = new CANNON.Body({
    mass: 6,
    shape: new CANNON.Sphere(RADIUS),
    fixedRotation: true,
    linearDamping: 0.05,
    allowSleep: false,
    collisionFilterGroup: 2,
  });
  body.material = new CANNON.Material({ friction: 0, restitution: 0 });
  physics.world.addBody(body);
  physics.world.addContactMaterial(new CANNON.ContactMaterial(body.material, physics.material, { friction: 0, restitution: 0 }));

  const state = {
    body,
    heading: LAYOUT.spawn.heading,
    speed: 0,        // signed forward speed, m/s
    turnRate: 0,     // rad/s, for leaning
    grounded: false,
    airTime: 0,
    boost: false,
    position: new THREE.Vector3(),
    forwardVec: new THREE.Vector3(),
    visual: null,    // set by main: the camel ({ group, update })
    maxSpeed: RUN,
  };

  function reset() {
    const { x, z, heading } = LAYOUT.spawn;
    body.position.set(x, heightAt(x, z) + RADIUS + 0.6, z);
    body.velocity.set(0, 0, 0);
    state.heading = heading;
    state.speed = 0;
  }
  reset();
  events.on('player:reset', reset);

  // Teleport (menu jumps to a section).
  events.on('player:teleport', ({ x, z, heading }) => {
    body.position.set(x, heightAt(x, z) + RADIUS + 0.8, z);
    body.velocity.set(0, 0, 0);
    if (heading !== undefined) state.heading = heading;
    state.speed = 0;
  });

  const up = new THREE.Vector3(0, 1, 0);
  const n = new THREE.Vector3();
  const tiltQ = new THREE.Quaternion();
  const yawQ = new THREE.Quaternion();

  state.update = (dt, t) => {
    // Grounded if the sphere's bottom is near a surface.
    const p = body.position;
    const dist = physics.rayDown({ x: p.x, y: p.y, z: p.z }, RADIUS + 0.35);
    state.grounded = dist < RADIUS + 0.3;
    state.airTime = state.grounded ? 0 : state.airTime + dt;

    // Target speed and turning from input.
    let target = 0;
    let steer = 0;
    state.boost = input.boost;
    if (input.stick) {
      const want = Math.atan2(input.stick.x, input.stick.z);
      let diff = want - state.heading;
      diff = Math.atan2(Math.sin(diff), Math.cos(diff));
      steer = THREE.MathUtils.clamp(diff * 2.2, -1, 1);
      const align = Math.max(0, Math.cos(diff));
      target = (input.boost ? RUN : WALK) * input.stick.mag * (0.35 + 0.65 * align);
    } else {
      steer = input.turn;
      if (input.forward > 0) target = input.boost ? RUN : WALK;
      else if (input.forward < 0) target = -BACK;
    }

    const accel = state.grounded ? (Math.abs(target) > Math.abs(state.speed) ? 14 : 18) : 3;
    state.speed += THREE.MathUtils.clamp(target - state.speed, -accel * dt, accel * dt);

    // Turn: stronger when moving, a slow pivot when standing still.
    const speedK = Math.min(1, Math.abs(state.speed) / 4);
    const turnRate = steer * TURN * (0.45 + 0.55 * speedK) * (state.speed < -0.1 ? -1 : 1);
    state.turnRate += (turnRate - state.turnRate) * Math.min(1, dt * 10);
    state.heading += state.turnRate * dt;

    const fx = Math.sin(state.heading), fz = Math.cos(state.heading);
    state.forwardVec.set(fx, 0, fz);

    // Blend velocity toward heading * speed. In the air, keep momentum.
    const grip = state.grounded ? Math.min(1, dt * (state.boost ? 6 : 9)) : Math.min(1, dt * 0.8);
    body.velocity.x += (fx * state.speed - body.velocity.x) * grip;
    body.velocity.z += (fz * state.speed - body.velocity.z) * grip;

    // Hug the ground on downhill runs instead of flying off every crest.
    if (state.grounded && body.velocity.y > 0.5 && state.airTime === 0 && !state.jumping) body.velocity.y *= 0.9;

    if (input.take('jump') && state.grounded) {
      body.velocity.y = 8.5;
      state.jumping = true;
      events.emit('player:jump');
    }
    if (state.jumping && state.grounded && body.velocity.y <= 0.1) {
      state.jumping = false;
      events.emit('player:land');
    }

    // Soft world edge: push back toward the centre past the bounds.
    const r = Math.hypot(p.x, p.z);
    if (r > LAYOUT.bounds) {
      const k = (r - LAYOUT.bounds) * 2;
      body.velocity.x -= (p.x / r) * k * dt * 10;
      body.velocity.z -= (p.z / r) * k * dt * 10;
    }
    if (p.y < -20) reset();

    // Visual: feet on the sand under the sphere, tilted with the ground.
    state.position.set(p.x, p.y - RADIUS, p.z);
    const v = state.visual;
    if (v) {
      v.group.position.copy(state.position);
      const ground = heightAt(p.x, p.z);
      if (state.grounded && Math.abs(state.position.y - ground) < 0.4) v.group.position.y = Math.max(v.group.position.y, ground);
      normalAt(p.x, p.z, n);
      if (!state.grounded) n.lerp(up, 0.6).normalize();
      tiltQ.setFromUnitVectors(up, n);
      yawQ.setFromAxisAngle(up, state.heading);
      v.group.quaternion.slerp(tiltQ.multiply(yawQ), Math.min(1, dt * 8));
      v.update(dt, {
        t,
        speed: state.speed,
        maxSpeed: RUN,
        turn: state.turnRate / TURN,
        grounded: state.grounded,
        jumping: !!state.jumping,
        vy: body.velocity.y,
        boost: state.boost && Math.abs(state.speed) > WALK * 0.9,
      });
    }
  };

  return state;
}
