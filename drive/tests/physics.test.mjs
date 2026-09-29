// Run: node tests/physics.test.mjs
import assert from 'node:assert/strict';
import { RideController, PropSystem, CAMEL_R, CAMEL_OFF, gaitFor, strideLength } from '../js/physics.js';

let passed = 0;
const tests = [];
const test = (name, fn) => tests.push([name, fn]);
const flat = () => 0;
const NOINPUT = { throttle: 0, steer: 0, sprint: false, brake: false, call: false, reset: false };
const inp = (o) => Object.assign({}, NOINPUT, o);

function run(ride, seconds, input, fps = 60, cb) {
  const dt = 1 / fps;
  const n = Math.round(seconds * fps);
  for (let i = 0; i < n; i++) {
    const v = typeof input === 'function' ? input(i * dt) : input;
    ride.update(dt, v);
    if (cb) cb(ride.state, i * dt);
  }
}

test('acceleration: trot without sprint, gallop with sprint, gaits in order', () => {
  const r = new RideController({ heightAt: flat });
  assert.equal(r.state.gait, 'idle');
  const gaits = new Set();
  let maxNoSprint = 0;
  run(r, 8, inp({ throttle: 1 }), 60, (s) => { gaits.add(s.gait); maxNoSprint = Math.max(maxNoSprint, s.speed); });
  assert.ok(maxNoSprint <= 6.6 && maxNoSprint > 5.5, 'trot top speed ' + maxNoSprint);
  assert.equal(r.state.gait, 'trot');
  assert.ok(gaits.has('walk') && gaits.has('trot') && !gaits.has('gallop'));
  let t7 = -1, max = 0;
  run(r, 4, inp({ throttle: 1, sprint: true }), 60, (s, t) => {
    max = Math.max(max, s.speed);
    if (t7 < 0 && s.speed > 7) t7 = t;
  });
  assert.ok(t7 > 0 && t7 < 2.5, 'reaches gallop after ' + t7 + 's of sprint');
  assert.equal(r.state.gait, 'gallop');
  assert.ok(max > 10.5 && max <= 11.7, 'gallop speed ' + max);
  // from standstill to gallop (sprint from the beginning) within ~8 s
  const r2 = new RideController({ heightAt: flat });
  let tg = -1;
  run(r2, 10, inp({ throttle: 1, sprint: true }), 60, (s, t) => { if (tg < 0 && s.speed > 7) tg = t; });
  assert.ok(tg > 0 && tg < 6, 'standstill -> gallop in ' + tg);
  console.log(`   trot top ${maxNoSprint.toFixed(2)} m/s, gallop top ${max.toFixed(2)} m/s, rest->gallop ${tg.toFixed(2)} s`);
});

test('gait thresholds', () => {
  assert.equal(gaitFor(0.1), 'idle');
  assert.equal(gaitFor(0.5), 'walk');
  assert.equal(gaitFor(3.3), 'trot');
  assert.equal(gaitFor(7.1), 'gallop');
  assert.equal(gaitFor(-4), 'trot');
});

test('reverse is slow', () => {
  const r = new RideController({ heightAt: flat });
  let min = 0;
  run(r, 6, inp({ throttle: -1 }), 60, (s) => { min = Math.min(min, s.speed); });
  assert.ok(min < -1.6 && min >= -2.4, 'reverse speed ' + min);
});

test('braking stops quickly and flags braking', () => {
  const r = new RideController({ heightAt: flat });
  run(r, 3.5, inp({ throttle: 1, sprint: true }));
  assert.ok(r.state.speed > 9);
  let sawBraking = false, tStop = -1;
  run(r, 3, inp({ throttle: 1, brake: true }), 60, (s, t) => {
    if (s.braking) sawBraking = true;
    if (tStop < 0 && Math.abs(s.speed) < 0.3) tStop = t;
  });
  assert.ok(sawBraking);
  assert.ok(tStop > 0.5 && tStop < 2.5, 'stops in ' + tStop);
  assert.ok(r.state.speed < 0.3 && r.state.speed > -0.3);
});

test('coasting glides to rest (momentum, not instant)', () => {
  const r = new RideController({ heightAt: flat });
  run(r, 6, inp({ throttle: 1 }));
  run(r, 0.3, NOINPUT);
  assert.ok(r.state.speed > 4, 'still moving after 0.3 s: ' + r.state.speed);
  run(r, 4, NOINPUT);
  assert.ok(Math.abs(r.state.speed) < 0.3);
});

test('steering: right decreases heading, turn rate tighter at walk than gallop', () => {
  const walk = new RideController({ heightAt: flat });
  run(walk, 3, inp({ throttle: 0.35 }));
  const h0 = walk.state.heading;
  run(walk, 1, inp({ throttle: 0.35, steer: 1 }));
  const dWalk = walk.state.heading - h0;
  assert.ok(dWalk < 0, 'right steer must decrease heading');
  const gal = new RideController({ heightAt: flat });
  run(gal, 3.2, inp({ throttle: 1, sprint: true }));
  assert.ok(gal.state.speed > 10);
  const g0 = gal.state.heading;
  run(gal, 1, inp({ throttle: 1, sprint: true, steer: 1 }));
  const dGal = gal.state.heading - g0;
  assert.ok(dGal < 0);
  assert.ok(Math.abs(dWalk) > Math.abs(dGal) * 1.5, `walk ${dWalk.toFixed(2)} vs gallop ${dGal.toFixed(2)} rad/s`);
  // steering right moves the camel to -X (facing +Z)
  const r = new RideController({ heightAt: flat });
  run(r, 2, inp({ throttle: 1, steer: 1 }));
  assert.ok(r.state.x < -0.3, 'x=' + r.state.x);
  // standing still: can pivot slowly
  const p = new RideController({ heightAt: flat });
  run(p, 1, inp({ steer: -1 }));
  assert.ok(p.state.heading > 0.2 && p.state.heading < 1.2, 'pivot ' + p.state.heading);
  console.log(`   turn rate: walk ${Math.abs(dWalk).toFixed(2)} rad/s, gallop ${Math.abs(dGal).toFixed(2)} rad/s`);
});

test('slip: gallop + hard turn slips, straight running does not', () => {
  const r = new RideController({ heightAt: flat });
  run(r, 3.2, inp({ throttle: 1, sprint: true }));
  assert.ok(r.state.slip < 0.05, 'straight slip ' + r.state.slip);
  let maxSlip = 0;
  run(r, 1.0, inp({ throttle: 1, sprint: true, steer: 1 }), 60, (s) => { maxSlip = Math.max(maxSlip, s.slip); });
  assert.ok(maxSlip > 0.25, 'gallop turn slip ' + maxSlip);
  const w = new RideController({ heightAt: flat });
  run(w, 3, inp({ throttle: 0.4 }));
  let wSlip = 0;
  run(w, 1.5, inp({ throttle: 0.4, steer: 1 }), 60, (s) => { wSlip = Math.max(wSlip, s.slip); });
  assert.ok(wSlip < maxSlip * 0.5, `walk-turn slip ${wSlip} vs gallop ${maxSlip}`);
  console.log(`   slip: gallop turn ${maxSlip.toFixed(2)}, walk turn ${wSlip.toFixed(2)}`);
});

test('stamina: drains while sprinting, regens, cannot retrigger below 15%', () => {
  const r = new RideController({ heightAt: flat });
  const ev = [];
  r.on('sprintStart', () => ev.push('start'));
  r.on('sprintEnd', () => ev.push('end'));
  assert.equal(r.state.sprintEnergy, 1);
  let tEmpty = -1;
  for (let i = 0; i < 60 * 8 && tEmpty < 0; i++) {
    r.update(1 / 60, inp({ throttle: 1, sprint: true }));
    if (i > 6 && !r.state.sprint) tEmpty = i / 60;
  }
  assert.ok(tEmpty > 3.5 && tEmpty < 6, 'sprint lasted ' + tEmpty);
  assert.deepEqual(ev, ['start', 'end']);
  // holding the key while exhausted: no re-trigger (needs release)
  assert.equal(r.state.sprint, false);
  run(r, 2.0, inp({ throttle: 1, sprint: true }));
  assert.equal(r.state.sprint, false, 'holding the key after exhaustion must not auto-restart');
  assert.ok(r.state.sprintEnergy > 0.15, 'energy regenerated past 15% while key held: ' + r.state.sprintEnergy);
  // release, regen a bit, but under 15% pressing sprint does nothing
  // separate case: drain to ~0, release, and try again immediately (< 15%)
  const q = new RideController({ heightAt: flat });
  for (let i = 0; i < 60 * 8 && !(i > 6 && !q.state.sprint); i++) q.update(1 / 60, inp({ throttle: 1, sprint: true }));
  run(q, 0.3, inp({ throttle: 1 }));
  assert.ok(q.state.sprintEnergy < 0.15, 'energy ' + q.state.sprintEnergy);
  run(q, 0.1, inp({ throttle: 1, sprint: true }));
  assert.equal(q.state.sprint, false, 'no sprint below 15%');
  run(q, 1.5, inp({ throttle: 1 }));
  run(q, 0.2, inp({ throttle: 1, sprint: true }));
  assert.equal(q.state.sprint, true, 'sprint available again above 15%');
  run(r, 0.5, inp({ throttle: 1 }));
  // regen to > 15%, then sprint works again
  run(r, 3, inp({ throttle: 1 }));
  assert.ok(r.state.sprintEnergy > 0.3, 'regen ' + r.state.sprintEnergy);
  run(r, 0.2, inp({ throttle: 1, sprint: true }));
  assert.equal(r.state.sprint, true);
  // full recovery in ~ 8-10 s
  const r2 = new RideController({ heightAt: flat });
  run(r2, 3, inp({ throttle: 1, sprint: true }));
  const low = r2.state.sprintEnergy;
  run(r2, 3, inp({ throttle: 1 }));
  assert.ok(r2.state.sprintEnergy > low + 0.25);
  // sprint needs forward throttle
  const r3 = new RideController({ heightAt: flat });
  run(r3, 1, inp({ sprint: true }));
  assert.equal(r3.state.sprint, false);
  console.log(`   sprint lasts ${tEmpty.toFixed(2)} s from full`);
});

test('gaitPhase advances with distance (stride per gait)', () => {
  const r = new RideController({ heightAt: flat });
  run(r, 5, inp({ throttle: 1 }));
  let cycles = 0, dist = 0, last = r.state.gaitPhase;
  let lx = r.state.x, lz = r.state.z;
  run(r, 4, inp({ throttle: 1 }), 60, (s) => {
    let d = s.gaitPhase - last;
    if (d < -0.5) d += 1;
    if (d > 0.5) d -= 1;
    cycles += d; last = s.gaitPhase;
    dist += Math.hypot(s.x - lx, s.z - lz); lx = s.x; lz = s.z;
  });
  const stride = dist / cycles;
  assert.ok(Math.abs(stride - strideLength(6.4)) < 0.4, `stride ${stride} vs ${strideLength(6.4)}`);
  assert.ok(strideLength(2) < strideLength(5) && strideLength(5) < strideLength(10));
  // idle: phase does not run
  const idle = new RideController({ heightAt: flat });
  run(idle, 2, NOINPUT);
  assert.equal(idle.state.gaitPhase, 0);
});

test('wall: slides along a box, never penetrates', () => {
  const wall = { type: 'box', x: 5, z: 0, hx: 0.5, hz: 40, rot: 0 };
  const r = new RideController({ heightAt: flat, colliders: [wall] });
  r.reset(0, 0, Math.PI / 2 - 0.4); // forward ~ (0.92, 0.39): angled into the wall
  let maxX = -1e9, bumps = 0;
  r.on('bump', () => bumps++);
  run(r, 6, inp({ throttle: 1 }), 60, (s) => {
    const fx = Math.sin(s.heading);
    maxX = Math.max(maxX, s.x + fx * CAMEL_OFF + CAMEL_R);
  });
  assert.ok(maxX <= 4.5 + 0.1, 'penetrated: ' + maxX);
  assert.ok(r.state.z > 12, 'slid along the wall, z=' + r.state.z);
  assert.ok(r.state.speed > 3, 'kept speed while sliding ' + r.state.speed);
  assert.ok(bumps >= 1);
  console.log(`   wall slide: z=${r.state.z.toFixed(1)} speed=${r.state.speed.toFixed(1)} bumps=${bumps}`);
});

test('rotated box: corners and rotated faces collide', () => {
  const rot = Math.PI / 4;
  const box = { type: 'box', x: 0, z: 10, hx: 2, hz: 0.5, rot };
  const r = new RideController({ heightAt: flat, colliders: [box] });
  r.reset(0, 0, 0);
  let minD = 1e9;
  run(r, 6, inp({ throttle: 1 }), 60, (s) => {
    // distance from front circle centre to the rotated rectangle
    const cx = s.x + Math.sin(s.heading) * CAMEL_OFF, cz = s.z + Math.cos(s.heading) * CAMEL_OFF;
    const dx = cx - box.x, dz = cz - box.z;
    const lx = dx * Math.cos(rot) - dz * Math.sin(rot);
    const lz = dx * Math.sin(rot) + dz * Math.cos(rot);
    const qx = Math.max(Math.abs(lx) - box.hx, 0), qz = Math.max(Math.abs(lz) - box.hz, 0);
    minD = Math.min(minD, Math.hypot(qx, qz));
  });
  assert.ok(minD >= CAMEL_R - 0.05, 'min distance ' + minD);
});

test('circle bump: event strength scales with impact, no tunnelling at gallop', () => {
  const circ = { type: 'circle', x: 0, z: 30, r: 1.5 };
  const mk = () => new RideController({ heightAt: flat, colliders: [circ] });
  const strengths = [];
  const fast = mk();
  fast.on('bump', (e) => strengths.push(e));
  let minDist = 1e9;
  run(fast, 12, inp({ throttle: 1, sprint: true }), 60, (s) => {
    const fz = s.z + CAMEL_OFF;
    minDist = Math.min(minDist, Math.hypot(s.x, fz - 30));
  });
  assert.ok(strengths.length >= 1);
  assert.ok(strengths[0].strength > 0.5, 'gallop bump ' + strengths[0].strength);
  assert.ok(Math.abs(strengths[0].nz) > 0.9 && strengths[0].nz < 0, 'normal points back at camel');
  assert.ok(minDist >= 1.5 + CAMEL_R - 0.05, 'circle penetration ' + minDist);
  assert.ok(fast.state.lastBump && fast.state.lastBump.strength === strengths[strengths.length - 1].strength);
  // slow bump is weaker
  const slow = mk();
  const st2 = [];
  slow.on('bump', (e) => st2.push(e.strength));
  slow.reset(0, 20, 0);
  run(slow, 8, inp({ throttle: 0.4 }));
  assert.ok(st2.length === 0 || st2[0] < strengths[0].strength * 0.6, 'walk bump ' + st2[0]);
  console.log(`   bump strengths: gallop ${strengths[0].strength.toFixed(2)}, walk ${st2[0] ?? 'none(<threshold)'}`);
});

test('circle: glancing hit deflects around it (slides)', () => {
  const circ = { type: 'circle', x: 1.0, z: 15, r: 1.5 };
  const r = new RideController({ heightAt: flat, colliders: [circ] });
  run(r, 10, inp({ throttle: 1 }));
  assert.ok(r.state.z > 20, 'passed the circle, z=' + r.state.z);
});

test('boundary: soft wall stops a gallop without teleport', () => {
  const R = 60;
  const r = new RideController({ heightAt: flat, worldRadius: R });
  r.reset(0, 0, Math.PI / 2);
  let maxD = 0, maxJump = 0, lx = 0, lz = 0;
  run(r, 25, inp({ throttle: 1, sprint: true }), 60, (s) => {
    maxD = Math.max(maxD, Math.hypot(s.x, s.z));
    maxJump = Math.max(maxJump, Math.hypot(s.x - lx, s.z - lz));
    lx = s.x; lz = s.z;
  });
  assert.ok(maxD <= R + 1e-6, 'left the world: ' + maxD);
  assert.ok(maxD > R - 12, 'never got near the edge: ' + maxD);
  assert.ok(maxJump < 0.25, 'per-frame jump ' + maxJump);
  // steering back inward is possible
  run(r, 4, inp({ throttle: 1, steer: 1 }));
  assert.ok(Math.hypot(r.state.x, r.state.z) < R + 1e-6);
  console.log(`   boundary max radius ${maxD.toFixed(2)} of ${R}`);
});

test('slope: pitch/roll sign, uphill slower, downhill faster', () => {
  const hUp = (x, z) => 0.2 * z;
  const up = new RideController({ heightAt: hUp });
  run(up, 8, inp({ throttle: 1 }));
  assert.ok(up.state.pitch < -0.1, 'uphill nose up => pitch<0, got ' + up.state.pitch);
  assert.ok(Math.abs(up.state.roll) < 0.02);
  const dn = new RideController({ heightAt: hUp });
  dn.reset(0, 0, Math.PI);
  run(dn, 8, inp({ throttle: 1 }));
  assert.ok(dn.state.pitch > 0.1);
  const flatR = new RideController({ heightAt: flat });
  run(flatR, 8, inp({ throttle: 1 }));
  assert.ok(up.state.speed < flatR.state.speed - 0.5, `up ${up.state.speed} flat ${flatR.state.speed}`);
  assert.ok(dn.state.speed > flatR.state.speed - 0.01, `down ${dn.state.speed}`);
  const side = new RideController({ heightAt: (x) => 0.2 * x });
  run(side, 1, NOINPUT);
  // facing +Z, +X is the camel's left; ground rises to the left => right side lower => roll>0
  assert.ok(side.state.roll > 0.1, 'roll ' + side.state.roll);
  assert.ok(Math.abs(side.state.y) < 1e-9);
});

test('events: call (edge + cooldown), reset input', () => {
  const r = new RideController({ heightAt: flat });
  let calls = 0;
  r.on('call', () => calls++);
  run(r, 0.5, inp({ call: true }));
  assert.equal(calls, 1);
  run(r, 0.2, NOINPUT);
  run(r, 0.1, inp({ call: true }));
  assert.equal(calls, 1, 'cooldown');
  run(r, 1.5, NOINPUT);
  run(r, 0.1, inp({ call: true }));
  assert.equal(calls, 2);
  r.reset(10, -5, 1);
  run(r, 3, inp({ throttle: 1 }));
  assert.ok(Math.hypot(r.state.x - 10, r.state.z + 5) > 5);
  run(r, 0.1, inp({ reset: true }));
  assert.ok(Math.hypot(r.state.x - 10, r.state.z + 5) < 1.5);
  assert.equal(r.state.speed < 0.5, true);
});

test('determinism: identical runs give identical state', () => {
  const scripted = (t) => inp({ throttle: t < 8 ? 1 : 0.3, steer: Math.sin(t * 0.9), sprint: t > 2 && t < 5.5, brake: t > 9 && t < 9.6 });
  const world = [{ type: 'circle', x: 10, z: 20, r: 2 }, { type: 'box', x: -8, z: 12, hx: 3, hz: 1, rot: 0.6 }];
  const hf = (x, z) => Math.sin(x * 0.1) * Math.cos(z * 0.08) * 2;
  const a = new RideController({ heightAt: hf, colliders: world });
  const b = new RideController({ heightAt: hf, colliders: world });
  run(a, 20, scripted, 60);
  run(b, 20, scripted, 60);
  assert.equal(JSON.stringify(a.state), JSON.stringify(b.state));
});

test('fps independence: 30 / 60 / 144 fps give near-identical trajectories', () => {
  const scripted = (t) => inp({
    throttle: t < 14 ? 1 : 0.2,
    steer: t < 4 ? 0 : t < 7 ? 0.6 : t < 10 ? -0.8 : 0.2,
    sprint: t > 1 && t < 4.5,
    brake: t > 12 && t < 12.8,
  });
  const hf = (x, z) => Math.sin(x * 0.1) * Math.cos(z * 0.08) * 2;
  const res = [30, 60, 144, 240].map((fps) => {
    const r = new RideController({ heightAt: hf, worldRadius: 500 });
    run(r, 18, scripted, fps);
    return r.state;
  });
  const ref = res[1];
  for (const s of res) {
    const d = Math.hypot(s.x - ref.x, s.z - ref.z);
    assert.ok(d < 0.6, `position differs by ${d.toFixed(3)} m`);
    assert.ok(Math.abs(s.heading - ref.heading) < 0.03, 'heading');
    assert.ok(Math.abs(s.speed - ref.speed) < 0.15, 'speed');
  }
  const d30 = Math.hypot(res[0].x - res[2].x, res[0].z - res[2].z);
  console.log(`   30fps vs 144fps final position delta: ${d30.toFixed(3)} m after ~${Math.hypot(ref.x, ref.z).toFixed(0)} m of travel`);
  // huge frame gaps are clamped, not exploded
  const r = new RideController({ heightAt: flat });
  r.update(5, inp({ throttle: 1 }));
  assert.ok(Math.abs(r.state.speed) < 6.6 && Number.isFinite(r.state.x));
});

test('smoothness: interpolated state has no per-frame jitter at 144 fps', () => {
  const r = new RideController({ heightAt: flat });
  run(r, 4, inp({ throttle: 1 }), 144);
  let lx = r.state.x, lz = r.state.z, minD = 1e9, maxD = 0;
  run(r, 2, inp({ throttle: 1 }), 144, (s) => {
    const d = Math.hypot(s.x - lx, s.z - lz); lx = s.x; lz = s.z;
    minD = Math.min(minD, d); maxD = Math.max(maxD, d);
  });
  assert.ok(maxD - minD < 0.005, `frame step varies ${minD}..${maxD}`);
});

// ---------------------------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------------------------

function mockRide(x, z, heading, speed) {
  const rec = { nudges: [], shifts: [] };
  return {
    rec, mass: 600,
    state: { x, z, heading, vx: Math.sin(heading) * speed, vz: Math.cos(heading) * speed },
    nudge(dx, dz) { rec.nudges.push([dx, dz]); this.state.vx += dx; this.state.vz += dz; },
    shift(dx, dz) { rec.shifts.push([dx, dz]); this.state.x += dx; this.state.z += dz; },
  };
}

test('props: camel-vs-prop momentum transfer conserves momentum, camel barely slows', () => {
  const ps = new PropSystem({ heightAt: flat });
  const id = ps.add({ x: 0, z: 2.0, mass: 25, friction: 0, restitution: 0.2, type: 'crate' });
  const ride = mockRide(0, 0, 0, 6);
  const p0 = 600 * 6;
  for (let i = 0; i < 12; i++) { ride.state.z += ride.state.vz / 60; ps.update(1 / 60, ride); }
  const b = ps.get(id);
  assert.ok(b.vz > 6, 'crate should be launched faster than the camel: ' + b.vz);
  const pAfter = 600 * ride.state.vz + 25 * b.vz;
  assert.ok(Math.abs(pAfter - p0) / p0 < 0.01, `momentum ${pAfter} vs ${p0}`);
  assert.ok(ride.state.vz > 5.7, 'camel slowed too much ' + ride.state.vz);
  assert.ok(ride.state.vz < 6.0);
  // heavier prop slows the camel more
  const ps2 = new PropSystem({ heightAt: flat });
  const id2 = ps2.add({ x: 0, z: 2.0, mass: 300, friction: 0, restitution: 0.1 });
  const ride2 = mockRide(0, 0, 0, 6);
  for (let i = 0; i < 12; i++) { ride2.state.z += ride2.state.vz / 60; ps2.update(1 / 60, ride2); }
  assert.ok(ride2.state.vz < ride.state.vz - 0.5);
  assert.ok(Math.abs(600 * ride2.state.vz + 300 * ps2.get(id2).vz - p0) / p0 < 0.01);
  console.log(`   crate(25kg): camel ${ride.state.vz.toFixed(2)} m/s, crate ${b.vz.toFixed(2)}; boulder(300kg): camel ${ride2.state.vz.toFixed(2)}`);
});

test('props: real camel pushes a crate ahead with only a slight slowdown', () => {
  const run1 = (withCrate) => {
    const r = new RideController({ heightAt: flat });
    const ps = new PropSystem({ heightAt: flat });
    let id;
    if (withCrate) id = ps.add({ x: 0, z: 6, type: 'crate' });
    let vmax = 0;
    for (let i = 0; i < 60 * 6; i++) {
      r.update(1 / 60, inp({ throttle: 1 }));
      ps.update(1 / 60, r);
      vmax = Math.max(vmax, r.state.speed);
    }
    return { speed: r.state.speed, z: r.state.z, crate: id ? ps.get(id) : null, vmax };
  };
  const free = run1(false);
  const pushed = run1(true);
  assert.ok(pushed.crate.z > 6 + 2, 'crate was pushed: z=' + pushed.crate.z);
  assert.ok(pushed.speed > free.speed * 0.85, `slowed too much ${pushed.speed} vs ${free.speed}`);
  assert.ok(pushed.crate.asleep === false || pushed.crate.z > 6);
});

test('props: body-body collision conserves momentum; sleeping when at rest', () => {
  const ps = new PropSystem({ heightAt: flat });
  const a = ps.add({ x: 0, z: 0, mass: 10, friction: 0, restitution: 0.5, vx: 4, type: 'crate' });
  const b = ps.add({ x: 3, z: 0.05, mass: 5, friction: 0, restitution: 0.5, type: 'crate' });
  const A = ps.get(a), B = ps.get(b);
  const p0x = 10 * 4;
  for (let i = 0; i < 60; i++) ps.update(1 / 60, null);
  const px = 10 * A.vx + 5 * B.vx;
  assert.ok(Math.abs(px - p0x) < 0.5, `momentum ${px}`);
  assert.ok(B.vx > A.vx, 'lighter body ends faster');
  // sleeping
  const ps2 = new PropSystem({ heightAt: flat });
  const id = ps2.add({ x: 0, z: 0, vx: 6, type: 'crate' });
  assert.equal(ps2.get(id).asleep, false);
  for (let i = 0; i < 60 * 4; i++) ps2.update(1 / 60, null);
  assert.equal(ps2.get(id).asleep, true, 'came to rest and slept');
  assert.equal(ps2.get(id).vx, 0);
  // asleep props stay put and cost nothing
  const x = ps2.get(id).x;
  for (let i = 0; i < 60; i++) ps2.update(1 / 60, null);
  assert.equal(ps2.get(id).x, x);
  assert.equal(ps2.awakeCount, 0);
  // a slow camel touching a sleeping prop wakes it
  const ride = mockRide(x - 1.9, ps2.get(id).z, Math.PI / 2, 2);
  for (let i = 0; i < 20; i++) { ride.state.x += 2 / 60; ps2.update(1 / 60, ride); }
  assert.ok(ps2.get(id).x > x + 0.01 || ps2.get(id).asleep === false, 'woken by camel');
});

test('props: hops on hard hit, land on terrain, ball rolls & bounces', () => {
  const hf = (x, z) => 0.3 * Math.sin(x * 0.2);
  const ps = new PropSystem({ heightAt: hf });
  const id = ps.add({ x: 0, z: 2.0, type: 'ball' });
  const ride = mockRide(0, 0, 0, 10);
  let maxY = -1, maxRoll = 0;
  for (let i = 0; i < 120; i++) {
    if (i < 20) ride.state.z += ride.state.vz / 60; // camel runs into the ball, then stops
    else { ride.state.vz = 0; ride.state.vx = 0; }
    ps.update(1 / 60, ride);
    maxY = Math.max(maxY, ps.get(id).y - hf(ps.get(id).x, ps.get(id).z));
    maxRoll = Math.max(maxRoll, ps.get(id).roll);
  }
  assert.ok(maxY > 0.2, 'ball hopped: ' + maxY);
  const b = ps.get(id);
  assert.ok(b.roll > 2, 'ball rolled ' + b.roll);
  const gy = hf(b.x, b.z);
  assert.ok(b.y >= gy - 1e-9);
  // eventually lands & rests on the terrain
  for (let i = 0; i < 60 * 30; i++) ps.update(1 / 60, null);
  assert.ok(Math.abs(b.y - hf(b.x, b.z)) < 1e-6);
});

test('props: static circle and box colliders contain props (no tunnelling)', () => {
  const cols = [
    { type: 'box', x: 10, z: 0, hx: 0.5, hz: 20, rot: 0 },
    { type: 'circle', x: 5, z: 8, r: 1 },
  ];
  const ps = new PropSystem({ heightAt: flat, colliders: cols });
  const a = ps.add({ x: 0, z: 0, vx: 14, type: 'ball' });
  const b = ps.add({ x: 5, z: 3, vz: 12, type: 'crate' });
  let maxX = -1, minDc = 1e9;
  for (let i = 0; i < 240; i++) {
    ps.update(1 / 60, null);
    maxX = Math.max(maxX, ps.get(a).x + ps.get(a).r);
    const B = ps.get(b);
    minDc = Math.min(minDc, Math.hypot(B.x - 5, B.z - 8) - B.r);
  }
  assert.ok(maxX <= 9.5 + 1e-6, 'ball crossed wall ' + maxX);
  assert.ok(minDc >= 1 - 1e-6, 'crate entered circle ' + minDc);
  assert.ok(ps.get(a).x < 9.5);
});

test('props: camel pushing a prop into a wall does not squeeze through it', () => {
  const wall = { type: 'box', x: 0, z: 12, hx: 20, hz: 0.5, rot: 0 };
  const r = new RideController({ heightAt: flat, colliders: [wall] });
  const ps = new PropSystem({ heightAt: flat, colliders: [wall] });
  const id = ps.add({ x: 0, z: 8, type: 'barrel' });
  let maxZ = 0, maxCz = 0;
  for (let i = 0; i < 60 * 8; i++) {
    r.update(1 / 60, inp({ throttle: 1 }));
    ps.update(1 / 60, r);
    maxZ = Math.max(maxZ, ps.get(id).z + ps.get(id).r);
    maxCz = Math.max(maxCz, r.state.z + CAMEL_OFF + CAMEL_R);
  }
  assert.ok(maxZ <= 11.5 + 0.05, 'prop through wall ' + maxZ);
  assert.ok(maxCz <= 11.5 + 0.2, 'camel through wall ' + maxCz);
});

test('props: determinism and frame-size robustness', () => {
  const build = () => {
    const ps = new PropSystem({ heightAt: (x, z) => Math.sin(x * 0.3) * 0.2, colliders: [{ type: 'circle', x: 3, z: 3, r: 1 }] });
    for (let i = 0; i < 30; i++) ps.add({ x: (i % 6) * 1.1 - 3, z: Math.floor(i / 6) * 1.1 - 3, type: i % 3 ? 'crate' : 'ball' });
    return ps;
  };
  const drive = (ps, fps) => {
    const r = new RideController({ heightAt: (x, z) => Math.sin(x * 0.3) * 0.2 });
    r.reset(-8, 0, Math.PI / 2);
    for (let i = 0; i < 4 * fps; i++) { r.update(1 / fps, inp({ throttle: 1 })); ps.update(1 / fps, r); }
    return ps;
  };
  const a = drive(build(), 60), b = drive(build(), 60);
  assert.equal(JSON.stringify(a.bodies), JSON.stringify(b.bodies));
  const c = drive(build(), 144);
  for (const body of c.bodies) assert.ok(Number.isFinite(body.x) && Number.isFinite(body.y) && Math.hypot(body.x, body.z) < 30);
});

test('props: benchmark 150 props at 60 fps (camel plowing through)', () => {
  const rnd = (() => { let s = 12345; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); })();
  const hf = (x, z) => Math.sin(x * 0.05) * Math.cos(z * 0.05) * 3;
  const cols = [];
  for (let i = 0; i < 200; i++) cols.push(i % 2 ? { type: 'circle', x: (rnd() - 0.5) * 120, z: (rnd() - 0.5) * 120, r: 0.8 } : { type: 'box', x: (rnd() - 0.5) * 120, z: (rnd() - 0.5) * 120, hx: 1.5, hz: 0.6, rot: rnd() * 3 });
  const ride = new RideController({ heightAt: hf }); // free-running camel so it really plows through the props
  const ps = new PropSystem({ heightAt: hf, colliders: cols });
  const types = ['crate', 'barrel', 'jar', 'ball', 'cone'];
  for (let i = 0; i < 150; i++) ps.add({ x: (rnd() - 0.5) * 40, z: (rnd() - 0.5) * 40, type: types[i % 5] });
  ride.reset(-30, -4, Math.PI / 2);
  const frames = 60 * 20;
  const times = [];
  let awakeMax = 0;
  for (let i = 0; i < frames; i++) {
    const t = i / 60;
    ride.update(1 / 60, inp({ throttle: 1, sprint: t < 4, steer: Math.sin(t * 0.7) * 0.25 }));
    const t0 = process.hrtime.bigint();
    ps.update(1 / 60, ride);
    times.push(Number(process.hrtime.bigint() - t0) / 1e6);
    awakeMax = Math.max(awakeMax, ps.awakeCount);
  }
  times.sort((a, b) => a - b);
  const avg = times.reduce((a, b) => a + b, 0) / times.length;
  console.log(`   150 props: avg ${avg.toFixed(3)} ms/step, p99 ${times[Math.floor(times.length * 0.99)].toFixed(3)} ms, max ${times[times.length - 1].toFixed(3)} ms (peak awake ${awakeMax})`);
  assert.ok(avg < 2, 'too slow: ' + avg);
  // worst case: everything awake
  const ps2 = new PropSystem({ heightAt: hf, colliders: cols });
  for (let i = 0; i < 150; i++) ps2.add({ x: (rnd() - 0.5) * 30, z: (rnd() - 0.5) * 30, type: types[i % 5], vx: (rnd() - 0.5) * 8, vz: (rnd() - 0.5) * 8 });
  const t0 = process.hrtime.bigint();
  const n = 120;
  for (let i = 0; i < n; i++) ps2.update(1 / 60, ride);
  console.log(`   150 props all awake (chaos): ${(Number(process.hrtime.bigint() - t0) / 1e6 / n).toFixed(3)} ms/step`);
  const t1 = process.hrtime.bigint();
  for (let i = 0; i < 6000; i++) ride.update(1 / 60, inp({ throttle: 1, steer: Math.sin(i * 0.01) }));
  console.log(`   ride controller: ${(Number(process.hrtime.bigint() - t1) / 1e6 / 6000).toFixed(4)} ms/frame (2 fixed steps, 200 colliders)`);
});

// ---------------------------------------------------------------------------------------------
let failed = 0;
for (const [name, fn] of tests) {
  try {
    fn();
    passed++;
    console.log('ok   ' + name);
  } catch (e) {
    failed++;
    console.log('FAIL ' + name + '\n     ' + (e && e.stack ? e.stack.split('\n').slice(0, 4).join('\n     ') : e));
  }
}
console.log(`\n${passed}/${tests.length} passed`);
process.exit(failed ? 1 : 0);
