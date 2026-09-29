// physics.js — arcade camel-riding dynamics + pushable props.
// Pure math: no DOM, no three.js. Runs in the browser and in plain node.
//
// Conventions (see ARCHITECTURE.md): metres, Y up, heading h -> forward = (sin h, cos h) on XZ.
// Steering: input.steer > 0 turns RIGHT (clockwise from above) which DECREASES heading.
// Body tilt (state.pitch / state.roll) is defined so a consumer can apply it directly:
//     root.rotation.set(state.pitch, state.heading, state.roll, 'YXZ')
//   pitch > 0 = nose DOWN (three.js rotation.x sign; going downhill), pitch < 0 = nose up (uphill)
//   roll  > 0 = right side DOWN / left side up (three.js rotation.z sign for a +Z-facing model)
// Box collider rotation `rot` matches THREE `mesh.rotation.y = rot` (local +X -> (cos rot, -sin rot)).

const PI = Math.PI;
const TAU = Math.PI * 2;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (a, b, x) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};
function wrapAngle(a) {
  a %= TAU;
  if (a > PI) a -= TAU;
  else if (a < -PI) a += TAU;
  return a;
}

/** Camel body = two circles along the heading. */
export const CAMEL_R = 0.6;
export const CAMEL_OFF = 0.6; // circle centres at +/- this along heading (1.2 m apart)
export const CAMEL_MASS = 600;

/** Fixed internal timestep of the ride controller (Hz-independent behaviour). */
export const RIDE_STEP = 1 / 120;

/** Tuning constants of the ride model. Pass `tuning: {...}` to override any of them. */
export const RIDE_TUNING = {
  vRun: 6.4, // top speed without sprint (a fast trot)
  vSprint: 11.5, // gallop top speed
  vReverse: 2.2, // camels back up slowly
  accel: 2.8, // m/s^2 ramp up to trot
  accelSprint: 3.6,
  accelK: 1.6, // proportional gain toward the target speed (soft approach to top speed)
  coastDecel: 3.4, // release throttle -> glides to rest in ~2 s from a trot
  reverseBrake: 7.0, // pressing "back" while moving forward
  reverseAccel: 1.8,
  brakeDecel: 11.0, // brake key
  turnLow: 1.8, // rad/s at a walk
  turnHigh: 0.85, // rad/s at a gallop
  pivotMin: 0.35, // fraction of turn rate when standing still (camel pivots slowly)
  yawTau: 0.12, // yaw-rate smoothing (s)
  throttleTauUp: 0.3,
  throttleTauDown: 0.18,
  steerTauUp: 0.14,
  steerTauDown: 0.1,
  gripLow: 9.0, // 1/s lateral velocity decay at low speed
  gripHigh: 3.2, // ... at a gallop (drifty)
  driftMax: 0.46, // fraction of heading change the velocity does NOT follow at full gallop + full steer
  sprintDrain: 0.22, // stamina per second (about 4.5 s of full sprint)
  sprintRegen: 0.12, // per second
  sprintRegenSlow: 0.17, // per second when nearly stopped
  sprintMinStart: 0.15,
  slopeSpeedK: 1.1, // max speed multiplier = 1 - k*grade
  slopeAccelK: 4.0, // extra uphill deceleration = k*grade
  tiltTau: 0.12,
  boundaryMargin: 9, // soft wall starts this far inside worldRadius
  wallRestitution: 0.15,
  bumpMinImpact: 1.2, // m/s below which no 'bump' event
  bumpFullImpact: 10.0, // m/s -> strength 1
  bumpCooldown: 0.25,
  callCooldown: 1.2,
};

// gait thresholds (m/s) and stride lengths (metres of ground per full gait cycle)
export const GAIT_IDLE = 0.3;
export const GAIT_WALK = 3.2;
export const GAIT_TROT = 7.0;
const STRIDE_SPEEDS = [0, 3.2, 7, 11.5];
const STRIDE_LENGTHS = [1.7, 3.0, 4.4, 6.0];
export function strideLength(speed) {
  const s = Math.abs(speed);
  if (s >= STRIDE_SPEEDS[3]) return STRIDE_LENGTHS[3];
  for (let i = 1; i < 4; i++) {
    if (s <= STRIDE_SPEEDS[i]) {
      const t = (s - STRIDE_SPEEDS[i - 1]) / (STRIDE_SPEEDS[i] - STRIDE_SPEEDS[i - 1]);
      return lerp(STRIDE_LENGTHS[i - 1], STRIDE_LENGTHS[i], t);
    }
  }
  return STRIDE_LENGTHS[3];
}
export function gaitFor(speed) {
  const s = Math.abs(speed);
  return s < GAIT_IDLE ? 'idle' : s < GAIT_WALK ? 'walk' : s < GAIT_TROT ? 'trot' : 'gallop';
}

// ---------------------------------------------------------------------------------------------
// Static collider grid + circle-vs-collider test
// ---------------------------------------------------------------------------------------------

export class StaticGrid {
  constructor(colliders = [], cell = 8) {
    this.cell = cell;
    this.entries = [];
    this.map = new Map();
    this._stamp = 0;
    this.count = -1;
    this.rebuild(colliders);
  }

  rebuild(colliders) {
    this.source = colliders || [];
    this.count = this.source.length;
    this.entries.length = 0;
    this.map.clear();
    const cell = this.cell;
    for (const c of this.source) {
      let e;
      if (c.type === 'box') {
        const rot = c.rot || 0;
        const cos = Math.cos(rot);
        const sin = Math.sin(rot);
        e = {
          box: true, x: c.x, z: c.z, hx: c.hx, hz: c.hz, cos, sin,
          ex: Math.abs(cos) * c.hx + Math.abs(sin) * c.hz,
          ez: Math.abs(sin) * c.hx + Math.abs(cos) * c.hz,
          stamp: 0, src: c,
        };
      } else if (c.type === 'circle') {
        e = { box: false, x: c.x, z: c.z, r: c.r, ex: c.r, ez: c.r, stamp: 0, src: c };
      } else continue;
      this.entries.push(e);
      const x0 = Math.floor((e.x - e.ex) / cell), x1 = Math.floor((e.x + e.ex) / cell);
      const z0 = Math.floor((e.z - e.ez) / cell), z1 = Math.floor((e.z + e.ez) / cell);
      for (let cx = x0; cx <= x1; cx++) {
        for (let cz = z0; cz <= z1; cz++) {
          const k = this._key(cx, cz);
          let arr = this.map.get(k);
          if (!arr) this.map.set(k, (arr = []));
          arr.push(e);
        }
      }
    }
  }

  _key(cx, cz) {
    return (cx + 4096) * 8192 + (cz + 4096);
  }

  /** Fill `out` with entries whose cells overlap the circle (x,z,r). */
  query(x, z, r, out) {
    out.length = 0;
    const cell = this.cell;
    const stamp = ++this._stamp;
    const x0 = Math.floor((x - r) / cell), x1 = Math.floor((x + r) / cell);
    const z0 = Math.floor((z - r) / cell), z1 = Math.floor((z + r) / cell);
    for (let cx = x0; cx <= x1; cx++) {
      for (let cz = z0; cz <= z1; cz++) {
        const arr = this.map.get(this._key(cx, cz));
        if (!arr) continue;
        for (let i = 0; i < arr.length; i++) {
          const e = arr[i];
          if (e.stamp !== stamp) {
            e.stamp = stamp;
            out.push(e);
          }
        }
      }
    }
    return out;
  }
}

/**
 * Circle (px,pz,r) vs static entry. On overlap fills out {nx,nz,pen}: normal points from the
 * collider TOWARD the circle, pen = penetration depth. Returns true on overlap.
 */
export function circleVsEntry(e, px, pz, r, out) {
  const dx = px - e.x;
  const dz = pz - e.z;
  if (!e.box) {
    const rr = r + e.r;
    const d2 = dx * dx + dz * dz;
    if (d2 >= rr * rr) return false;
    const d = Math.sqrt(d2);
    if (d < 1e-6) {
      out.nx = 1; out.nz = 0; out.pen = rr;
    } else {
      out.nx = dx / d; out.nz = dz / d; out.pen = rr - d;
    }
    return true;
  }
  const lx = dx * e.cos - dz * e.sin;
  const lz = dx * e.sin + dz * e.cos;
  const cx = lx < -e.hx ? -e.hx : lx > e.hx ? e.hx : lx;
  const cz = lz < -e.hz ? -e.hz : lz > e.hz ? e.hz : lz;
  const ddx = lx - cx;
  const ddz = lz - cz;
  const d2 = ddx * ddx + ddz * ddz;
  let nlx, nlz, pen;
  if (d2 > 1e-12) {
    if (d2 >= r * r) return false;
    const d = Math.sqrt(d2);
    nlx = ddx / d; nlz = ddz / d; pen = r - d;
  } else {
    const penX = e.hx - Math.abs(lx);
    const penZ = e.hz - Math.abs(lz);
    if (penX < penZ) { nlx = lx < 0 ? -1 : 1; nlz = 0; pen = penX + r; }
    else { nlx = 0; nlz = lz < 0 ? -1 : 1; pen = penZ + r; }
  }
  out.nx = nlx * e.cos + nlz * e.sin;
  out.nz = -nlx * e.sin + nlz * e.cos;
  out.pen = pen;
  return true;
}

// ---------------------------------------------------------------------------------------------
// Tiny event emitter
// ---------------------------------------------------------------------------------------------
class Emitter {
  constructor() { this._h = Object.create(null); }
  on(evt, fn) {
    (this._h[evt] || (this._h[evt] = [])).push(fn);
    return () => this.off(evt, fn);
  }
  off(evt, fn) {
    const a = this._h[evt];
    if (!a) return;
    const i = a.indexOf(fn);
    if (i >= 0) a.splice(i, 1);
  }
  emit(evt, data) {
    const a = this._h[evt];
    if (!a) return;
    for (const fn of a.slice()) {
      try { fn(data); } catch (err) { if (typeof console !== 'undefined') console.error(err); }
    }
  }
}

// ---------------------------------------------------------------------------------------------
// RideController
// ---------------------------------------------------------------------------------------------

export class RideController extends Emitter {
  /**
   * @param {{heightAt?:(x:number,z:number)=>number, colliders?:Array, worldRadius?:number, tuning?:object}} opts
   */
  constructor({ heightAt, colliders, worldRadius = 140, tuning } = {}) {
    super();
    this.heightAt = heightAt || (() => 0);
    this.colliders = colliders || [];
    this.worldRadius = worldRadius;
    this.T = Object.assign({}, RIDE_TUNING, tuning || {});
    this.grid = new StaticGrid(this.colliders, 8);
    this._q = [];
    this._c = { nx: 0, nz: 0, pen: 0 };

    this.state = {
      x: 0, y: 0, z: 0, heading: 0, speed: 0, vx: 0, vz: 0,
      steer: 0, throttle: 0, sprint: false, sprintEnergy: 1, braking: false,
      slip: 0, gaitPhase: 0, gait: 'idle', pitch: 0, roll: 0, grounded: true, lastBump: null,
      // extras (not in the contract, harmless)
      time: 0, grade: 0, yawRate: 0, calling: false,
    };
    this.mass = CAMEL_MASS;
    this._acc = 0;
    this._spawn = { x: 0, z: 0, h: 0 };
    this._callPrev = false;
    this._resetPrev = false;
    this.reset(0, 0, 0);
  }

  setColliders(colliders) {
    this.colliders = colliders || [];
    this.grid.rebuild(this.colliders);
  }

  /** Teleport/restart at (x,z) with heading h. Also remembers it as the spawn for input.reset. */
  reset(x = 0, z = 0, h = 0) {
    this._spawn = { x, z, h };
    this._teleport(x, z, h);
  }

  _teleport(x, z, h) {
    this.x = x; this.z = z; this.h = h;
    this.px = x; this.pz = z; this.ph = h;
    this.vx = 0; this.vz = 0;
    this.throttle = 0; this.steer = 0; this.yawRate = 0;
    this.pitch = 0; this.roll = 0; this.ppitch = 0; this.proll = 0;
    this.phase = 0; this.pphase = 0;
    this.sprintOn = false; this.energy = 1; this.exhausted = false;
    this.slipV = 0;
    this.time = 0; this._bumpT = -10; this._callT = -10;
    this._acc = 0;
    this._in = { throttle: 0, steer: 0, sprint: false, brake: false };
    this.lastBump = null;
    this._wallT = 0; this._wtx = 0; this._wtz = 1;
    this.braking = false;
    this.gait = 'idle';
    this.grade = 0;
    this._tilt(true);
    this._publish(0);
  }

  /** Add velocity (used by PropSystem for momentum transfer back to the camel). */
  nudge(dvx, dvz) {
    this.vx += dvx;
    this.vz += dvz;
  }

  /** Move the camel body (used by PropSystem when a prop is pinned against a wall). */
  shift(dx, dz) {
    this.x += dx; this.z += dz;
    this.px += dx; this.pz += dz;
    this.state.x += dx; this.state.z += dz;
  }

  update(dt, input) {
    const inp = input || {};
    if (!(dt > 0)) dt = 0;
    if (dt > 0.1) dt = 0.1;

    // per-frame input snapshot (sampled once per frame, held across the fixed steps)
    const i = this._in;
    i.throttle = clamp(+inp.throttle || 0, -1, 1);
    i.steer = clamp(+inp.steer || 0, -1, 1);
    i.sprint = !!inp.sprint;
    i.brake = !!inp.brake;

    // edge-triggered actions
    const call = !!inp.call;
    if (call && !this._callPrev && this.time - this._callT > this.T.callCooldown) {
      this._callT = this.time;
      this.emit('call', { x: this.state.x, z: this.state.z });
    }
    this._callPrev = call;
    const rst = !!inp.reset;
    if (rst && !this._resetPrev) {
      const s = this._spawn;
      this._teleport(s.x, s.z, s.h);
    }
    this._resetPrev = rst;

    if (this.grid.count !== this.colliders.length) this.grid.rebuild(this.colliders);

    this._acc += dt;
    const H = RIDE_STEP;
    while (this._acc >= H - 1e-9) {
      this._acc -= H;
      this.px = this.x; this.pz = this.z; this.ph = this.h;
      this.ppitch = this.pitch; this.proll = this.roll; this.pphase = this.phase;
      this._step(H);
    }
    if (this._acc < 0) this._acc = 0;
    this._publish(this._acc / H);
  }

  _step(h) {
    const T = this.T;
    const inp = this._in;
    this.time += h;

    // --- smoothed inputs ------------------------------------------------------------------
    const tIn = inp.brake ? 0 : inp.throttle;
    const tauT = Math.abs(tIn) > Math.abs(this.throttle) ? T.throttleTauUp : T.throttleTauDown;
    this.throttle += (tIn - this.throttle) * (1 - Math.exp(-h / tauT));
    const tauS = Math.abs(inp.steer) > Math.abs(this.steer) ? T.steerTauUp : T.steerTauDown;
    this.steer += (inp.steer - this.steer) * (1 - Math.exp(-h / tauS));

    // --- heading / velocity decomposition ------------------------------------------------
    let fx = Math.sin(this.h), fz = Math.cos(this.h);
    let vf = this.vx * fx + this.vz * fz;
    const speedAbs = Math.abs(vf);

    // sprint (stamina)
    const wantSprint = inp.sprint && inp.throttle > 0.1 && !inp.brake;
    if (!inp.sprint) this.exhausted = false; // released the key: exhaustion lock is cleared
    if (this.sprintOn) {
      if (!wantSprint || this.energy <= 0) {
        if (this.energy <= 0) { this.energy = 0; this.exhausted = true; }
        this._endSprint();
      }
    } else if (wantSprint && !this.exhausted && this.energy >= T.sprintMinStart) {
      this.sprintOn = true;
      this.emit('sprintStart', { energy: this.energy });
    }
    if (this.sprintOn) {
      this.energy = Math.max(0, this.energy - T.sprintDrain * h);
    } else {
      const regen = speedAbs < 3 ? T.sprintRegenSlow : T.sprintRegen;
      this.energy = Math.min(1, this.energy + regen * h);
    }

    // --- terrain slope ---------------------------------------------------------------------
    this._tilt(false, h);
    const grade = this.grade;

    // --- yaw -------------------------------------------------------------------------------
    const turnMax = lerp(T.turnLow, T.turnHigh, smooth(2.0, 11.0, speedAbs));
    const pivot = clamp(T.pivotMin + speedAbs / 1.5, 0, 1);
    const yawTarget = -this.steer * turnMax * pivot; // steer > 0 = right = heading decreases
    this.yawRate += (yawTarget - this.yawRate) * (1 - Math.exp(-h / T.yawTau));
    const dh = this.yawRate * h;
    this.h += dh;
    // velocity follows the heading, except for the "drift" fraction (produces lateral slip)
    const drift =
      0.04 +
      T.driftMax * smooth(4.5, 11.0, speedAbs) * (0.4 + 0.6 * Math.abs(this.steer)) +
      (this.braking ? 0.25 * smooth(2, 8, speedAbs) : 0);
    const rot = dh * (1 - clamp(drift, 0, 0.9));
    if (rot !== 0) {
      const c = Math.cos(rot), s = Math.sin(rot);
      const nvx = this.vx * c + this.vz * s;
      const nvz = -this.vx * s + this.vz * c;
      this.vx = nvx; this.vz = nvz;
    }
    fx = Math.sin(this.h); fz = Math.cos(this.h);
    const rx = -fz, rz = fx; // right vector
    vf = this.vx * fx + this.vz * fz;
    let vl = this.vx * rx + this.vz * rz;

    // --- longitudinal drive ------------------------------------------------------------------
    const gradeMult = clamp(1 - T.slopeSpeedK * grade, 0.6, 1.12);
    const vMax = (this.sprintOn ? T.vSprint : T.vRun) * gradeMult;
    const th = this.throttle;
    const target = th >= 0 ? th * vMax : th * T.vReverse;
    const brakeHeld = inp.brake;
    this.braking = brakeHeld && Math.abs(vf) > 0.3;
    if (brakeHeld) {
      const d = Math.min(Math.abs(vf), T.brakeDecel * h);
      vf -= Math.sign(vf) * d;
    } else {
      const diff = target - vf;
      let up, down;
      if (vf < 0) { up = 3.0; down = T.reverseAccel; }
      else {
        up = this.sprintOn ? T.accelSprint : T.accel;
        down = target < 0 ? T.reverseBrake : T.coastDecel;
      }
      if (vf < 0 && target > vf && target >= 0) up = 6.0;
      let dv = clamp(T.accelK * diff, -down, up);
      // at idle throttle keep gliding to a stop rather than asymptotically creeping
      if (Math.abs(target) < 0.05 && Math.abs(vf) < 0.4) dv = -Math.sign(vf) * Math.min(Math.abs(vf), down * 1.2);
      vf += dv * h;
    }
    // slope: uphill bleeds speed, downhill gives a little
    vf -= T.slopeAccelK * grade * h * (vf > 0 ? 1 : 0.5) * (Math.abs(vf) > 0.2 ? 1 : 0);
    // lateral grip
    let grip = lerp(T.gripLow, T.gripHigh, smooth(2, 11, speedAbs));
    if (this.braking) grip *= 0.55;
    vl *= Math.exp(-grip * h);

    this.vx = fx * vf + rx * vl;
    this.vz = fz * vf + rz * vl;

    // --- integrate ---------------------------------------------------------------------------
    const ox = this.x, oz = this.z;
    this.x += this.vx * h;
    this.z += this.vz * h;

    // --- soft world boundary -------------------------------------------------------------------
    this._boundary(h);

    // --- static collisions ---------------------------------------------------------------------
    this._collide(h);

    // --- gait / phase ---------------------------------------------------------------------------
    const moved = Math.hypot(this.x - ox, this.z - oz);
    const vfNow = this.vx * Math.sin(this.h) + this.vz * Math.cos(this.h);
    if (Math.abs(vfNow) >= GAIT_IDLE) this.phase += moved / strideLength(vfNow);
    this.gait = gaitFor(vfNow);

    // slip (smoothed lateral speed + braking skid)
    const fx2 = Math.sin(this.h), fz2 = Math.cos(this.h);
    const latNow = Math.abs(this.vx * -fz2 + this.vz * fx2);
    let slipT = latNow / 2.5;
    if (this.braking) slipT += 0.6 * smooth(2, 8, Math.abs(vfNow));
    this.slipV += (clamp(slipT, 0, 1) - this.slipV) * (1 - Math.exp(-h / 0.1));
  }

  _endSprint() {
    this.sprintOn = false;
    this.emit('sprintEnd', { energy: this.energy });
  }

  _tilt(snap, h = RIDE_STEP) {
    const T = this.T;
    const L = 1.2, W = 0.6;
    const fx = Math.sin(this.h), fz = Math.cos(this.h);
    const rx = -fz, rz = fx;
    const hf = this.heightAt(this.x + fx * L, this.z + fz * L);
    const hb = this.heightAt(this.x - fx * L, this.z - fz * L);
    const hr = this.heightAt(this.x + rx * W, this.z + rz * W);
    const hl = this.heightAt(this.x - rx * W, this.z - rz * W);
    this.grade = (hf - hb) / (2 * L);
    const pT = clamp(Math.atan2(hb - hf, 2 * L), -0.6, 0.6);
    const rT = clamp(Math.atan2(hl - hr, 2 * W), -0.5, 0.5);
    if (snap) {
      this.pitch = pT; this.roll = rT; this.ppitch = pT; this.proll = rT;
    } else {
      const k = 1 - Math.exp(-h / T.tiltTau);
      this.pitch += (pT - this.pitch) * k;
      this.roll += (rT - this.roll) * k;
    }
  }

  _boundary(h) {
    const R = this.worldRadius;
    const m = this.T.boundaryMargin;
    const inner = R - m;
    const dist = Math.hypot(this.x, this.z);
    if (dist <= inner) return;
    const nx = this.x / dist, nz = this.z / dist; // outward
    const t = Math.min(1, (dist - inner) / m);
    const vout = this.vx * nx + this.vz * nz;
    if (vout > 0) {
      const k = Math.min(1, (3 + 12 * t) * h);
      this.vx -= nx * vout * k;
      this.vz -= nz * vout * k;
    }
    // smooth inward push (quadratic ramp)
    const a = 26 * t * t * h;
    this.vx -= nx * a;
    this.vz -= nz * a;
    if (dist > R) {
      this.x = nx * R;
      this.z = nz * R;
      const vo = this.vx * nx + this.vz * nz;
      if (vo > 0) { this.vx -= nx * vo; this.vz -= nz * vo; }
    }
  }

  _collide(h) {
    const T = this.T;
    const c = this._c;
    let bestImpact = 0, bnx = 0, bnz = 0, bx = 0, bz = 0;
    let touched = false;
    let tnx = 0, tnz = 0;
    for (let pass = 0; pass < 2; pass++) {
      const fx = Math.sin(this.h), fz = Math.cos(this.h);
      for (let k = 1; k >= -1; k -= 2) {
        const cx = this.x + fx * CAMEL_OFF * k;
        const cz = this.z + fz * CAMEL_OFF * k;
        const list = this.grid.query(cx, cz, CAMEL_R + 0.05, this._q);
        for (let i = 0; i < list.length; i++) {
          // recompute circle centre: earlier contacts in this loop may have shifted the body
          const px = this.x + fx * CAMEL_OFF * k;
          const pz = this.z + fz * CAMEL_OFF * k;
          if (!circleVsEntry(list[i], px, pz, CAMEL_R, c)) continue;
          this.x += c.nx * c.pen;
          this.z += c.nz * c.pen;
          const vn = this.vx * c.nx + this.vz * c.nz;
          if (vn < 0) {
            const impact = -vn;
            const e = impact > 1.0 ? T.wallRestitution : 0;
            this.vx -= (1 + e) * vn * c.nx;
            this.vz -= (1 + e) * vn * c.nz;
            if (impact > bestImpact) {
              bestImpact = impact; bnx = c.nx; bnz = c.nz;
              bx = px - c.nx * CAMEL_R; bz = pz - c.nz * CAMEL_R;
            }
          }
          touched = true; tnx = c.nx; tnz = c.nz;
        }
      }
    }
    if (touched) {
      // scrape friction on the tangent; remember the wall tangent for the deflection assist
      const kf = Math.exp(-0.4 * h);
      this.vx *= kf; this.vz *= kf;
      this._wallT = 0.15;
      this._wtx = -tnz; this._wtz = tnx;
    }
    if (this._wallT > 0) {
      // gentle yaw toward the wall tangent so the camel deflects along the wall instead of
      // sticking to it (only while the rider is pushing forward)
      this._wallT -= h;
      const fx = Math.sin(this.h), fz = Math.cos(this.h);
      let tx = this._wtx, tz = this._wtz;
      let w = tx * fx + tz * fz;
      if (w < 0) { tx = -tx; tz = -tz; w = -w; }
      if (w > 0.15 && this.throttle > 0.05) {
        const diff = wrapAngle(Math.atan2(tx, tz) - this.h);
        const rate = clamp(diff * 4.0 * smooth(0.15, 0.4, w), -1.6, 1.6);
        this.h += rate * h;
      }
    }
    if (bestImpact > T.bumpMinImpact && this.time - this._bumpT > T.bumpCooldown) {
      this._bumpT = this.time;
      const strength = clamp((bestImpact - 1) / (T.bumpFullImpact - 1), 0, 1);
      this.lastBump = { t: this.time, strength, nx: bnx, nz: bnz, x: bx, z: bz };
      if (strength > 0.75 && this.sprintOn) this._endSprint();
      this.emit('bump', { strength, x: bx, z: bz, nx: bnx, nz: bnz });
    }
  }

  _publish(alpha) {
    const s = this.state;
    const a = clamp(alpha, 0, 1);
    s.x = lerp(this.px, this.x, a);
    s.z = lerp(this.pz, this.z, a);
    s.y = this.heightAt(s.x, s.z);
    s.heading = wrapAngle(lerp(this.ph, this.h, a));
    const fx = Math.sin(this.h), fz = Math.cos(this.h);
    s.vx = this.vx; s.vz = this.vz;
    s.speed = this.vx * fx + this.vz * fz;
    s.steer = this.steer;
    s.throttle = this.throttle;
    s.sprint = this.sprintOn;
    s.sprintEnergy = this.energy;
    s.braking = this.braking;
    s.slip = this.slipV;
    const ph = lerp(this.pphase, this.phase, a);
    s.gaitPhase = ph - Math.floor(ph);
    s.gait = this.gait;
    s.pitch = lerp(this.ppitch, this.pitch, a);
    s.roll = lerp(this.proll, this.roll, a);
    s.grounded = true;
    s.lastBump = this.lastBump;
    s.time = this.time;
    s.grade = this.grade;
    s.yawRate = this.yawRate;
    s.calling = this.time - this._callT < 0.9;
  }
}

// ---------------------------------------------------------------------------------------------
// PropSystem
// ---------------------------------------------------------------------------------------------

/** Presets for common desert props. `friction` = ground deceleration in m/s^2. */
export const PROP_TYPES = {
  crate: { r: 0.5, mass: 25, friction: 5.5, restitution: 0.2, hop: 0.5, rolls: false },
  barrel: { r: 0.45, mass: 35, friction: 3.5, restitution: 0.25, hop: 0.4, rolls: true },
  jar: { r: 0.35, mass: 8, friction: 5.0, restitution: 0.3, hop: 1.0, rolls: false },
  ball: { r: 0.4, mass: 0.6, friction: 0.6, restitution: 0.75, hop: 1.3, rolls: true },
  football: { r: 0.4, mass: 0.6, friction: 0.6, restitution: 0.75, hop: 1.3, rolls: true },
  cone: { r: 0.3, mass: 2.5, friction: 6.0, restitution: 0.15, hop: 0.8, rolls: false },
  default: { r: 0.5, mass: 10, friction: 5.0, restitution: 0.25, hop: 0.6, rolls: false },
};

const GRAVITY = 9.81;
const PROP_STEP_MAX = 1 / 60;

export class PropSystem extends Emitter {
  /**
   * @param {{heightAt?:Function, colliders?:Array, worldRadius?:number}} opts
   */
  constructor({ heightAt, colliders, worldRadius = 140 } = {}) {
    super();
    this.heightAt = heightAt || (() => 0);
    this.colliders = colliders || [];
    this.worldRadius = worldRadius;
    this.grid = new StaticGrid(this.colliders, 8);
    this.bodies = [];
    this._byId = new Map();
    this._nextId = 1;
    this.time = 0;
    this._q = [];
    this._c = { nx: 0, nz: 0, pen: 0 };
    // broadphase hash for body-body
    this._hSize = 1024;
    this._head = new Int32Array(this._hSize);
    this._next = new Int32Array(64);
    this._mark = new Int32Array(64);
    this._markStamp = 0;
    this._cellSize = 1;
    this._maxR = 0.5;
    this.awakeCount = 0;
  }

  setColliders(colliders) {
    this.colliders = colliders || [];
    this.grid.rebuild(this.colliders);
  }

  /** Add a body. Returns its id. Bodies start asleep unless given a velocity / lift. */
  add({ x = 0, z = 0, r, mass, type = 'crate', restitution, friction, hop, rolls, vx = 0, vz = 0, y, vy = 0, yaw = 0 } = {}) {
    const P = PROP_TYPES[type] || PROP_TYPES.default;
    const rr = r ?? P.r;
    const m = mass ?? P.mass;
    const gy = this.heightAt(x, z);
    const b = {
      id: this._nextId++, type, x, z, y: y ?? gy, vx, vy, vz, r: rr, mass: m, invMass: 1 / m,
      yaw, spin: 0, roll: 0, rdx: 0, rdz: 1,
      restitution: restitution ?? P.restitution, friction: friction ?? P.friction,
      hop: hop ?? P.hop, rolls: rolls ?? P.rolls,
      asleep: true, sleepT: 0, grounded: true, _pin: false, _hitT: -10,
    };
    if (vx || vz || vy || b.y > gy + 1e-3) { b.asleep = false; b.grounded = false; }
    this.bodies.push(b);
    this._byId.set(b.id, b);
    if (this._next.length < this.bodies.length) {
      const n = this.bodies.length * 2;
      this._next = new Int32Array(n);
      this._mark = new Int32Array(n);
    }
    if (rr > this._maxR) this._maxR = rr;
    this._cellSize = Math.max(1, this._maxR * 2);
    return b.id;
  }

  get(id) { return this._byId.get(id); }

  remove(id) {
    const b = this._byId.get(id);
    if (!b) return false;
    this._byId.delete(id);
    this.bodies.splice(this.bodies.indexOf(b), 1);
    return true;
  }

  wake(id) {
    const b = this._byId.get(id);
    if (b) { b.asleep = false; b.sleepT = 0; }
  }

  /** Apply an impulse (kg*m/s) to a body, waking it. */
  impulse(id, jx, jz, jy = 0) {
    const b = this._byId.get(id);
    if (!b) return;
    b.asleep = false; b.sleepT = 0;
    b.vx += jx * b.invMass; b.vz += jz * b.invMass;
    if (jy) { b.vy += jy * b.invMass; b.grounded = false; }
  }

  update(dt, ride) {
    if (!(dt > 0)) return;
    if (dt > 0.1) dt = 0.1;
    // equal sub-steps of at most 1/60 s covering exactly dt
    const n = Math.max(1, Math.ceil(dt / PROP_STEP_MAX - 1e-6));
    const h = dt / n;
    for (let i = 0; i < n; i++) this._step(h, ride);
  }

  _step(h, ride) {
    this.time += h;
    const bodies = this.bodies;
    const N = bodies.length;
    const hasRide = !!(ride && ride.state);

    // 1) integrate awake bodies
    let awake = 0;
    for (let i = 0; i < N; i++) {
      const b = bodies[i];
      b._pin = false;
      if (b.asleep) continue;
      awake++;
      this._integrate(b, h);
    }
    this.awakeCount = awake;

    // 2) camel vs props
    if (hasRide) this._camel(h, ride, false);

    // 3) prop vs prop
    if (awake > 0) this._bodyBody(h);

    // 4) props vs static colliders + world boundary
    for (let i = 0; i < N; i++) {
      const b = bodies[i];
      if (b.asleep) continue;
      this._statics(b, h);
      this._bound(b);
    }

    // 5) props pinned against walls push back on the camel
    if (hasRide) this._camel(h, ride, true);
  }

  _integrate(b, h) {
    const gy = this.heightAt(b.x, b.z);
    // vertical
    if (b.y > gy + 1e-3 || b.vy > 0) {
      b.grounded = false;
      b.vy -= GRAVITY * h;
      b.y += b.vy * h;
      if (b.y <= gy) {
        b.y = gy;
        if (b.vy < -1.2) {
          b.vy = -b.vy * b.restitution * 0.7;
          b.vx *= 0.94; b.vz *= 0.94;
        } else { b.vy = 0; b.grounded = true; }
      }
    } else {
      b.y = gy; b.vy = 0; b.grounded = true;
    }
    if (b.grounded) {
      // downhill acceleration from terrain gradient (only matters for rollers on real slopes)
      const e = 0.4;
      const gxs = (this.heightAt(b.x + e, b.z) - this.heightAt(b.x - e, b.z)) / (2 * e);
      const gzs = (this.heightAt(b.x, b.z + e) - this.heightAt(b.x, b.z - e)) / (2 * e);
      const k = GRAVITY * (b.rolls ? 0.7 : 0.35);
      b.vx -= gxs * k * h;
      b.vz -= gzs * k * h;
      // ground friction (constant deceleration)
      const sp = Math.hypot(b.vx, b.vz);
      if (sp > 0) {
        const dec = b.friction * h;
        const ns = sp > dec ? (sp - dec) / sp : 0;
        b.vx *= ns; b.vz *= ns;
      }
      b.spin *= Math.exp(-2.5 * h);
    } else {
      b.spin *= Math.exp(-0.3 * h);
    }
    b.x += b.vx * h;
    b.z += b.vz * h;
    b.yaw += b.spin * h;
    const sp = Math.hypot(b.vx, b.vz);
    if (b.rolls && sp > 0.05) {
      b.roll += (sp * h) / b.r;
      b.rdx = b.vx / sp; b.rdz = b.vz / sp;
    }
    // sleeping
    if (b.grounded && sp < 0.06 && Math.abs(b.spin) < 0.25) {
      b.sleepT += h;
      if (b.sleepT > 0.5) {
        b.asleep = true; b.vx = 0; b.vz = 0; b.vy = 0; b.spin = 0;
      }
    } else b.sleepT = 0;
  }

  _hit(b, impact, x, z) {
    if (impact < 0.8 || this.time - b._hitT < 0.15) return;
    b._hitT = this.time;
    this.emit('hit', { id: b.id, type: b.type, strength: clamp((impact - 0.5) / 8, 0, 1), x, z });
  }

  _camel(h, ride, pinnedOnly) {
    const s = ride.state;
    const fx = Math.sin(s.heading), fz = Math.cos(s.heading);
    const mc = ride.mass || CAMEL_MASS;
    const invMc = 1 / mc;
    const bodies = this.bodies;
    const reach = CAMEL_OFF + CAMEL_R + this._maxR + 0.05;
    for (let i = 0; i < bodies.length; i++) {
      const b = bodies[i];
      if (pinnedOnly && !b._pin) continue;
      if (Math.abs(b.x - s.x) > reach || Math.abs(b.z - s.z) > reach) continue;
      if (b.y - s.y > 1.6) continue; // hopping above the camel
      for (let k = 1; k >= -1; k -= 2) {
        const cx = s.x + fx * CAMEL_OFF * k;
        const cz = s.z + fz * CAMEL_OFF * k;
        let dx = b.x - cx, dz = b.z - cz;
        const rr = b.r + CAMEL_R;
        const d2 = dx * dx + dz * dz;
        if (d2 >= rr * rr) continue;
        let d = Math.sqrt(d2), nx, nz;
        if (d < 1e-5) { nx = fx * k; nz = fz * k; d = 0; } else { nx = dx / d; nz = dz / d; }
        const pen = rr - d;
        if (b.asleep) { b.asleep = false; b.sleepT = 0; }
        // separation: the prop takes it, unless it is pinned against a wall (camel yields)
        if (b._pin) {
          ride.shift && ride.shift(-nx * pen, -nz * pen);
        } else {
          b.x += nx * pen; b.z += nz * pen;
        }
        // velocity: 1-D impulse along the normal, camel of mass mc vs prop
        const rvx = b.vx - s.vx, rvz = b.vz - s.vz;
        const vn = rvx * nx + rvz * nz;
        if (vn < 0) {
          const e = b.restitution;
          const j = (-(1 + e) * vn) / (invMc + b.invMass);
          b.vx += nx * j * b.invMass; b.vz += nz * j * b.invMass;
          if (ride.nudge) ride.nudge(-nx * j * invMc, -nz * j * invMc);
          const impact = -vn;
          // tumble: tangential relative speed becomes spin (visual)
          const vt = rvx * -nz + rvz * nx;
          b.spin += clamp(vt / b.r, -12, 12) * 0.35 * Math.min(1, 6 / (1 + b.mass * 0.05)) * 0.3;
          // hop when hit hard
          if (impact > 2.5 && b.hop > 0) {
            const vy = Math.min(4.5, (impact - 1.5) * 0.4 * b.hop);
            if (vy > b.vy) { b.vy = vy; b.grounded = false; }
          }
          this._hit(b, impact, b.x, b.z);
        }
      }
    }
  }

  _hash(cx, cz) {
    return (((cx * 73856093) ^ (cz * 19349663)) >>> 0) & (this._hSize - 1);
  }

  _bodyBody(h) {
    const bodies = this.bodies;
    const N = bodies.length;
    if (N < 2) return;
    const head = this._head, next = this._next, mark = this._mark;
    const inv = 1 / this._cellSize;
    head.fill(-1);
    for (let i = 0; i < N; i++) {
      const b = bodies[i];
      const cell = this._hash(Math.floor(b.x * inv), Math.floor(b.z * inv));
      next[i] = head[cell];
      head[cell] = i;
    }
    for (let i = 0; i < N; i++) {
      const a = bodies[i];
      if (a.asleep) continue;
      const cx = Math.floor(a.x * inv), cz = Math.floor(a.z * inv);
      const stamp = ++this._markStamp;
      for (let ox = -1; ox <= 1; ox++) {
        for (let oz = -1; oz <= 1; oz++) {
          let j = head[this._hash(cx + ox, cz + oz)];
          while (j !== -1) {
            const jj = j;
            j = next[j];
            if (jj === i || mark[jj] === stamp) continue;
            mark[jj] = stamp;
            const b = bodies[jj];
            if (!b.asleep && jj < i) continue; // pair handled from the lower index
            this._pair(a, b, h);
          }
        }
      }
    }
  }

  _pair(a, b, h) {
    const dx = b.x - a.x, dz = b.z - a.z;
    const rr = a.r + b.r;
    const d2 = dx * dx + dz * dz;
    if (d2 >= rr * rr) return;
    if (Math.abs(a.y - b.y) > rr) return;
    let d = Math.sqrt(d2), nx, nz;
    if (d < 1e-5) { nx = 1; nz = 0; d = 0; } else { nx = dx / d; nz = dz / d; }
    const pen = rr - d;
    let vn = (b.vx - a.vx) * nx + (b.vz - a.vz) * nz;
    let ia = a.invMass, ib = b.invMass;
    if (b.asleep) {
      if (-vn > 0.4) { b.asleep = false; b.sleepT = 0; }
      else ib = 0; // resting neighbour acts as immovable
    }
    const tot = ia + ib;
    if (tot === 0) return;
    const corr = pen * 0.9;
    a.x -= nx * corr * (ia / tot); a.z -= nz * corr * (ia / tot);
    b.x += nx * corr * (ib / tot); b.z += nz * corr * (ib / tot);
    if (vn < 0) {
      const e = Math.min(a.restitution, b.restitution);
      const j = (-(1 + e) * vn) / tot;
      a.vx -= nx * j * ia; a.vz -= nz * j * ia;
      b.vx += nx * j * ib; b.vz += nz * j * ib;
      // tangential -> spin (visual tumble)
      const vt = (b.vx - a.vx) * -nz + (b.vz - a.vz) * nx;
      a.spin -= clamp(vt / a.r, -10, 10) * 0.2;
      b.spin += clamp(vt / b.r, -10, 10) * 0.2;
      if (b.asleep === false && ib > 0 && j * ib > 0.05) b.sleepT = 0;
      a.sleepT = 0;
      this._hit(a, -vn, a.x, a.z);
    }
  }

  _statics(b, h) {
    const c = this._c;
    const list = this.grid.query(b.x, b.z, b.r + 0.05, this._q);
    for (let i = 0; i < list.length; i++) {
      if (!circleVsEntry(list[i], b.x, b.z, b.r, c)) continue;
      b.x += c.nx * c.pen; b.z += c.nz * c.pen;
      b._pin = true;
      const vn = b.vx * c.nx + b.vz * c.nz;
      if (vn < 0) {
        const e = b.restitution;
        b.vx -= (1 + e) * vn * c.nx;
        b.vz -= (1 + e) * vn * c.nz;
        const vt = b.vx * -c.nz + b.vz * c.nx;
        b.spin += clamp(vt / b.r, -10, 10) * 0.15;
        this._hit(b, -vn, b.x, b.z);
      }
    }
  }

  _bound(b) {
    const R = this.worldRadius - b.r;
    const d = Math.hypot(b.x, b.z);
    if (d > R) {
      const nx = b.x / d, nz = b.z / d;
      b.x = nx * R; b.z = nz * R;
      const vn = b.vx * nx + b.vz * nz;
      if (vn > 0) { b.vx -= (1 + b.restitution) * vn * nx; b.vz -= (1 + b.restitution) * vn * nz; }
    }
  }
}
