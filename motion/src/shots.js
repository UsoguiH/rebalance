// The Director poses the world and camera for any time t.
// All times derive from word cues (see cues.json), so a new voice-over
// re-times the whole piece.
import * as THREE from 'three';
import { HEAD_Y, COL, Figure, makeLine, setLineProgress } from './world.js';

const clamp01 = (x) => Math.max(0, Math.min(1, x));
export const E = {
  lin: (x) => x,
  io: (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2),
  io5: (x) => (x < 0.5 ? 16 * x ** 5 : 1 - Math.pow(-2 * x + 2, 5) / 2),
  out: (x) => 1 - Math.pow(1 - x, 3),
  out5: (x) => 1 - Math.pow(1 - x, 5),
  in: (x) => x * x * x,
  back: (x) => { const c = 1.9; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); },
};
export const seg = (t, a, b, e = E.io) => e(clamp01((t - a) / (b - a)));
const lerp = (a, b, k) => a + (b - a) * k;
const lerpA = (a, b, k) => a.map((v, i) => lerp(v, b[i], k));
const V = (a) => new THREE.Vector3(...a);
const RAD = Math.PI / 180;
// camera on a sphere around target: yaw 0 = looking toward -z
function orbit(tg, dist, yaw, pitch) {
  const y = yaw * RAD, p = pitch * RAD;
  return { pos: [tg[0] + dist * Math.sin(y) * Math.cos(p), tg[1] + dist * Math.sin(p), tg[2] + dist * Math.cos(y) * Math.cos(p)], look: tg };
}

// keys: [{t, pos, look, fov, e}] — segment i eases into key i with key.e
function camAt(keys, t) {
  if (t <= keys[0].t) return keys[0];
  for (let i = 1; i < keys.length; i++) {
    const a = keys[i - 1], b = keys[i];
    if (t <= b.t) {
      const k = (b.e || E.io)(clamp01((t - a.t) / Math.max(1e-6, b.t - a.t)));
      return { pos: lerpA(a.pos, b.pos, k), look: lerpA(a.look, b.look, k), fov: lerp(a.fov ?? 38, b.fov ?? 38, k), roll: lerp(a.roll ?? 0, b.roll ?? 0, k) };
    }
  }
  return keys[keys.length - 1];
}

// Position along a polyline path [[x,z],...] at k (0..1) with heading.
function along(path, k) {
  const L = [];
  let tot = 0;
  for (let i = 1; i < path.length; i++) { const d = Math.hypot(path[i][0] - path[i - 1][0], path[i][1] - path[i - 1][1]); L.push(d); tot += d; }
  let s = clamp01(k) * tot;
  for (let i = 0; i < L.length; i++) {
    if (s <= L[i] || i === L.length - 1) {
      const f = L[i] ? s / L[i] : 0;
      const a = path[i], b = path[i + 1];
      return { x: lerp(a[0], b[0], f), z: lerp(a[1], b[1], f), ry: Math.atan2(b[0] - a[0], b[1] - a[1]) };
    }
    s -= L[i];
  }
}
const angLerp = (a, b, k) => { let d = ((b - a + Math.PI * 3) % (Math.PI * 2)) - Math.PI; return a + d * k; };

export class Director {
  constructor(world, camera, cues) {
    this.w = world;
    this.cam = camera;
    this.c = (id, end) => cues.at(id, end);
    this.duration = cues.duration;
    this.build();
  }

  build() {
    const c = this.c, w = this.w;
    // Characters' fixed spots
    this.P = {
      conn0: [2.05, -6.4],
      stage: [-7.2, -12.6],
      ceo: [-4.1, -12.9],
      conn1: [7.6, -6.1],          // after "he never stays in one group"
      ellipse: [11.4, -2.6],       // where the new guy appears
      conn2: [4.3, -8.6],          // walks off to the next group
    };
    w.podium.position.set(this.P.stage[0], 0, this.P.stage[1]);
    // move the "far3" group so the connector joins it
    this.regroup('far3', 7.9, -6.9);
    this.regroup('far1', 3.9, -9.6);

    // camera keys — orbit(target, distance, yaw°, pitch°); the reference uses a long lens,
    // distances below come from measured on-screen sizes at fov 38.
    const conn = this.P.conn0, s = this.P.stage;
    const skip = c('skip'), find = c('find'), say = c('say'), he = c('he'), and2 = c('and2');
    const thats = c('thats'), but = c('but'), hell = c('hell'), so = c('so'), im = c('im'), youre = c('youre');
    this.shotStarts = { skip, find, say, he, and2, thats, but, hell, so, im, youre };
    const C1 = this.P.conn1, C2 = this.P.conn2, EL = this.P.ellipse;
    const K = (t, tg, dist, yaw, pitch, e = E.lin, fov = 38) => ({ t, ...orbit(tg, dist, yaw, pitch), fov, e });
    const mid = (a, b, y) => [(a[0] + b[0]) / 2, y, (a[1] + b[1]) / 2];
    this.camKeys = [
      K(0, [0.6, 0, -7.5], 46, 4, 50),
      K(0.33, [0.6, 0, -7.5], 45, 4, 50),
      K(0.86, [0.3, 1.85, -6.6], 18, 0, 6.5, E.io),
      K(skip - 0.43, [0.35, 1.85, -6.6], 17.6, 1.2, 6.3),
      // whip to the speaker
      K(skip - 0.1, [s[0] + 1.55, 1.6, s[1] - 0.15], 13.3, 0, 8, E.io5),
      K(find - 0.78, [s[0] + 1.55, 1.6, s[1] - 0.15], 12.3, -1.5, 7.5),
      // whip to the connector
      K(find - 0.42, [conn[0], 1.6, conn[1]], 9.0, 4, 7, E.io5),
      K(c('half'), [conn[0], 1.6, conn[1]], 8.7, 8, 7),
      K(c('half') + 0.65, [conn[0], 0.9, conn[1] - 0.8], 21, 6, 15, E.io),
      K(say - 0.42, [conn[0], 0.9, conn[1] - 0.8], 21.5, 7, 15),
      // DANIEL close-up
      K(say - 0.1, [conn[0], 2.45, conn[1]], 5.9, -2, 6, E.io5),
      K(he - 0.3, [conn[0], 2.45, conn[1]], 5.6, -3, 6),
    ];
    this.follow = (p) => orbit([p.x + 0.35, 1.5, p.z], 8.2, -6, 5.5);
    this.followFrom = he - 0.3;
    this.followTo = and2 - 0.32;
    this.camKeys2 = [
      K(and2 + 0.18, [(C1[0] + EL[0]) / 2, 1.05, (C1[1] + EL[1]) / 2], 15.5, 0, 9, E.io5),
      K(thats - 0.3, [(C1[0] + EL[0]) / 2, 1.05, (C1[1] + EL[1]) / 2], 15, 1, 8.8),
      // push in: TONIGHT. THAT'S YOU.
      K(thats + 0.3, [C1[0] + 0.3, 2.2, C1[1] + 0.25], 5.4, 20, 5, E.io5),
      K(but - 0.25, [C1[0] + 0.3, 2.2, C1[1] + 0.25], 5.1, 21, 5),
      // front two-shot
      K(but + 0.12, [C1[0] + 0.45, 1.85, C1[1]], 6.9, 2, 4, E.io5),
      K(c('work') + 0.5, [C1[0] + 0.45, 1.85, C1[1]], 6.6, 2.5, 4),
      // pull back: HE'LL FORGET YOU
      K(c('work') + 0.85, [C1[0] - 0.9, 1.2, C1[1] - 1.4], 16, 4, 9, E.io5),
      K(so - 0.45, [C1[0] - 1.1, 1.2, C1[1] - 1.4], 15.5, 6, 9),
      // swing round to the hand-off
      K(so + 0.38, [C2[0] - 0.45, 2.3, C2[1] + 0.3], 5.4, -8, 5, E.io5),
      K(im - 0.33, [C2[0] - 0.45, 2.3, C2[1] + 0.3], 5.1, -9, 5),
      // card (hard cut)
      K(im - 0.32, [C2[0] - 0.35, 1.95, C2[1]], 8.2, 0, 6),
      K(youre - 0.62, [C2[0] - 0.35, 1.95, C2[1]], 7.9, 0.5, 6),
      // final (hard cut), then push in
      K(youre - 0.61, [C2[0] - 0.2, 1.7, C2[1]], 8.6, 0, 8),
      K(youre + 0.05, [C2[0] - 0.2, 1.7, C2[1]], 8.3, 0, 8),
      K(youre + 0.6, [C2[0] - 0.45, 2.35, C2[1] + 0.3], 4.6, 6, 4, E.io5),
      K(this.duration - 0.45, [C2[0] - 0.45, 2.35, C2[1] + 0.3], 4.4, 6.5, 4),
      K(this.duration, [C2[0] - 0.2, 1.7, C2[1]], 8.6, 0, 8, E.io),
    ];

    // walking path for "he never stays in one group"
    this.walk1 = [conn, [conn[0] + 0.35, conn[1] + 1.0], [conn[0] + 2.75, conn[1] + 1.5], [C1[0] - 0.6, C1[1] + 0.6], C1];
    this.walk1Line = makeLine(this.walk1.map(([x, z]) => V([x, 0.01, z])), { color: COL.yellow, width: 3 });
    w.lines.add(this.walk1Line);

    // yellow arcs: who he knows
    const targets = [[conn[0] - 1.6, conn[1] - 0.4], [conn[0] + 1.3, conn[1] - 0.8], [conn[0] - 0.6, conn[1] - 2.2], [conn[0] + 2.2, conn[1] + 0.6], [conn[0] - 2.6, conn[1] + 0.8]];
    this.arcs = targets.map(([x, z], i) => {
      const a = V([conn[0], 1.55, conn[1]]), b = V([x, 1.7, z]);
      const mid = a.clone().lerp(b, 0.5); mid.y += 0.9 + 0.2 * i;
      const curve = new THREE.QuadraticBezierCurve3(a, mid, b);
      const line = makeLine(curve.getPoints(40), { color: COL.yellow, width: 2.6 });
      w.lines.add(line);
      return line;
    });

    // dashed spot where the new guy appears
    const ell = [];
    for (let i = 0; i <= 64; i++) { const a = (i / 64) * Math.PI * 2; ell.push(V([this.P.ellipse[0] + Math.cos(a) * 0.95, 0.012, this.P.ellipse[1] + Math.sin(a) * 0.6])); }
    this.ellipse = makeLine(ell, { color: 0x77787e, width: 2, dashed: true, dash: 0.1, gap: 0.08 });
    w.lines.add(this.ellipse);

    // yellow floor arc in the last shot
    const fa = [];
    for (let i = 0; i <= 40; i++) { const k = i / 40; fa.push(V([C2[0] - 1.6 + 3.4 * k, 0.012, C2[1] - 0.6 - Math.sin(k * Math.PI) * 1.4])); }
    this.floorArc = makeLine(fa, { color: COL.yellow, width: 2.4 });
    w.lines.add(this.floorArc);

    // groups that get the yellow rim at the end
    this.rimmed = [];
    // figures that light up at the end (left edge of the final frame)
    this.rimmed = [[-2.05, 0.6], [-1.55, -2.4], [-2.6, -1.2]].map(([dx, dz]) => {
      const f = new Figure('crowd');
      f.home = { x: C2[0] + dx, z: C2[1] + dz, ry: 0.8, yaw: 0 };
      w.scene.add(f.root);
      w.crowd.push(f);
      f.keep = true;
      return f;
    });
    for (const f of this.rimmed) f.rim = f.addOutline(COL.yellow, 0.03);
  }

  regroup(name, cx, cz) {
    const g = this.w.groups[name];
    const dx = cx - g.cx, dz = cz - g.cz;
    for (const f of g.members) { f.home.x += dx; f.home.z += dz; }
    g.cx = cx; g.cz = cz;
  }

  camera(t) {
    if (t < this.followFrom) return camAt(this.camKeys, t);
    if (t < this.followTo) {
      // follow the walking connector
      const p = this.connector(t);
      const k = seg(t, this.followFrom, this.followFrom + 0.45, E.io5);
      const prev = camAt(this.camKeys, this.followFrom);
      const want = { ...this.follow(p), fov: 38 };
      return { pos: lerpA(prev.pos, want.pos, k), look: lerpA(prev.look, want.look, k), fov: 38 };
    }
    const p = this.connector(this.followTo - 1e-4);
    const keys = [{ t: this.followTo, ...this.follow(p), fov: 38 }, ...this.camKeys2];
    return camAt(keys, t);
  }

  cameraSpeed(t, dt) {
    const a = this.camera(t), b = this.camera(t + dt);
    const dp = Math.hypot(...a.pos.map((v, i) => v - b.pos[i]));
    const da = new THREE.Vector3(...a.look).sub(V(a.pos)).normalize().angleTo(new THREE.Vector3(...b.look).sub(V(b.pos)).normalize());
    return dp * 0.35 + da * 6;
  }

  // ---- connector pose over time ----
  connector(t) {
    const c = this.c;
    const [x0, z0] = this.P.conn0;
    const p = { x: x0, z: z0, ry: 0, yaw: 0, armL: { raise: 0.1 }, armR: { raise: 0.1 }, lean: 0, bob: 0 };
    // looks around the room
    p.yaw = 0.25 * Math.sin(t * 1.3);
    // "the guy who knows half the room": turns to people, waves
    const k1 = seg(t, c('the4') - 0.1, c('the4') + 0.35);
    p.ry = -0.55 * k1 * (1 - seg(t, c('room'), c('room') + 0.4));
    if (t > c('the4') - 0.1 && t < c('say')) {
      const w = seg(t, c('the4'), c('the4') + 0.3, E.out) * (1 - seg(t, c('half'), c('half') + 0.35));
      p.armR = { raise: 0.1 + w * (1.2 + 0.25 * Math.sin((t - c('the4')) * 14)) };
      p.yaw = -0.4 * k1 + 0.6 * seg(t, c('knows') - 0.1, c('knows') + 0.25) * (1 - seg(t, c('room'), c('room') + 0.3));
    }
    // DANIEL: facing camera, then waves on "you'll spot him fast"
    if (t >= c('say') - 0.2 && t < c('he') - 0.2) {
      p.ry = 0; p.yaw = 0.08 * Math.sin(t * 2);
      const w = seg(t, c('youll') - 0.15, c('youll') + 0.15, E.out) * (1 - seg(t, c('fast') + 0.55, c('fast') + 0.8));
      p.armL = { raise: 0.1 + w * (0.95 + 0.3 * Math.sin((t - c('youll')) * 12)) };
    }
    // walks to the next group
    const w0 = c('he') - 0.15, w1 = c('group') + 0.2;
    if (t >= c('he') - 0.2) {
      const k = seg(t, w0, w1, (x) => E.io(x));
      const q = along(this.walk1, k);
      p.x = q.x; p.z = q.z;
      const turn = seg(t, w0 - 0.1, w0 + 0.25);
      p.ry = angLerp(0, q.ry, turn);
      const moving = k > 0.01 && k < 0.99;
      if (moving) { p.bob = 0.03 * Math.abs(Math.sin(t * 9)); p.lean = 0.06; p.yaw = -0.55 * turn; }
      p.armL = { raise: 0.1 + 0.08 * Math.sin(t * 9) };
      p.armR = { raise: 0.1 - 0.08 * Math.sin(t * 9) };
      if (k >= 0.99) {
        // settles facing the camera-ish, then waves the new guy over
        p.ry = angLerp(q.ry, 0.35, seg(t, w1, w1 + 0.4));
        const wv = seg(t, c('who2') - 0.1, c('who2') + 0.15, E.out) * (1 - seg(t, c('over') + 0.25, c('over') + 0.5));
        p.armR = { raise: 0.1 + wv * (2.3 + 0.35 * Math.sin((t - c('who2')) * 13)) };
        p.ry = angLerp(p.ry, 0.9, seg(t, c('over'), c('tonight')));
      }
    }
    // tonight: faces the hero
    if (t >= c('thats') - 0.3) { p.ry = 0.55; p.yaw = 0.3; }
    // behind shot: both face away from camera
    if (t >= c('but') - 0.05) {
      p.ry = 0.9; p.yaw = 0.35;
      // turns and leaves
      const lk = seg(t, c('work') + 0.1, hellEnd(c), E.io);
      if (t > c('work')) {
        const path = [this.P.conn1, [this.P.conn1[0] - 1.2, this.P.conn1[1] - 1.1], this.P.conn2];
        const q = along(path, lk);
        p.x = q.x; p.z = q.z;
        p.ry = angLerp(0.9, q.ry, seg(t, c('work') + 0.05, c('work') + 0.35));
        p.yaw = 0;
        if (lk > 0.01 && lk < 0.99) { p.bob = 0.03 * Math.abs(Math.sin(t * 9)); p.lean = 0.06; }
        if (lk >= 0.99) p.ry = angLerp(q.ry, 0.2, seg(t, hellEnd(c), hellEnd(c) + 0.5));
      }
    }
    // hand-off: faces the hero
    if (t >= c('so') + 0.1) { p.x = this.P.conn2[0]; p.z = this.P.conn2[1]; p.ry = -0.5; p.yaw = -0.25; p.bob = 0; p.lean = 0; }
    if (t >= c('im') - 0.32) { p.x = this.P.conn2[0] + 0.25; p.z = this.P.conn2[1] - 0.2; p.ry = -0.45; p.yaw = -0.35; }
    if (t >= c('youre') - 0.61) { p.x = this.P.conn2[0] + 0.55; p.z = this.P.conn2[1] + 0.3; p.ry = -0.6; p.yaw = -0.5; }
    return p;
  }

  hero(t) {
    const c = this.c;
    const p = { x: -0.45, z: 5.3, y: 0, ry: Math.PI, visible: true };
    // rises into frame
    p.y = -2.7 * (1 - seg(t, 0.82, 1.18, E.out));
    if (t > c('skip') - 0.6) {
      // walks past the speaker shot, foreground right
      // head drifts up through the bottom-right of frame (body below frame)
      const k = seg(t, c('speaker') + 0.2, c('find') - 0.45, E.lin);
      const cp = camAt(this.camKeys, t).pos;
      p.x = cp[0] + lerp(1.0, 0.45, k); p.z = cp[2] - 5.0; p.y = lerp(-1.5, -0.85, k); p.ry = -2.4;
      p.visible = t > c('speaker');
    }
    if (t > c('find') - 0.6) p.visible = false;
    // appears in the dashed spot, walks to the connector
    if (t > c('new') - 0.1) {
      const [ex, ez] = this.P.ellipse, [cx, cz] = this.P.conn1;
      const pop = seg(t, c('guy2') - 0.12, c('guy2') + 0.2, E.back);
      const k = seg(t, c('over') + 0.15, c('tonight') + 0.55, E.io);
      p.visible = true;
      p.s = Math.max(0.001, pop);
      p.x = lerp(ex, cx + 0.62, k); p.z = lerp(ez, cz + 0.42, k);
      p.y = 0;
      p.ry = k > 0 && k < 1 ? -Math.PI / 2 - 0.2 : Math.PI + 0.9;
      if (k > 0.02 && k < 0.98) { p.bob = 0.03 * Math.abs(Math.sin(t * 9)); p.lean = 0.06; }
      if (t > c('thats') - 0.3) p.ry = Math.PI + 0.9;
    }
    // "a quick hey": from behind, raises his arm
    if (t >= c('but') - 0.05) {
      p.x = this.P.conn1[0] + 0.6; p.z = this.P.conn1[1] + 0.3; p.ry = -0.25; p.s = 1;
      const up = seg(t, c('a') - 0.05, c('quick') + 0.1, E.out) * (1 - seg(t, c('wont') + 0.2, c('work') + 0.2));
      p.armR = { raise: 0.05 - 0.55 * up, fx: -up * (2.5 + 0.15 * Math.sin((t - c('a')) * 10)) };
    }
    // left behind, then walks in from the right
    if (t >= c('work') + 0.3) {
      const k = seg(t, c('next') - 0.45, c('group2') + 0.25, E.io);
      p.x = lerp(this.P.conn1[0] + 1.6, this.P.conn1[0] - 0.4, k);
      p.z = lerp(this.P.conn1[1] + 2.6, this.P.conn1[1] + 0.9, k);
      p.ry = k > 0 && k < 1 ? -2.2 : Math.PI;
      if (k > 0.02 && k < 0.98) { p.bob = 0.03 * Math.abs(Math.sin(t * 9)); p.lean = 0.06; }
      p.armL = null; p.armR = null;
    }
    // follows up with a job
    if (t >= c('so') - 0.3) {
      const C2 = this.P.conn2;
      const k = seg(t, c('so') - 0.3, c('give') + 0.15, E.io);
      p.x = lerp(this.P.conn1[0] - 0.4, C2[0] - 0.95, k);
      p.z = lerp(this.P.conn1[1] + 0.9, C2[1] + 0.65, k);
      p.ry = k < 1 ? -2.5 : Math.PI - 0.6;
      if (k > 0.02 && k < 0.98) { p.bob = 0.03 * Math.abs(Math.sin(t * 9)); p.lean = 0.06; }
      if (k >= 1) p.ry = 0.85;
    }
    if (t >= c('im') - 0.32) { p.x = this.P.conn2[0] - 1.0; p.z = this.P.conn2[1] + 0.6; p.ry = 0.5; p.armR = null; }
    if (t >= c('youre') - 0.61) { p.x = this.P.conn2[0] - 0.7; p.z = this.P.conn2[1] + 0.9; p.ry = 0.2; }
    return p;
  }

  apply(t) {
    const c = this.c, w = this.w;
    // crowd idles; washed out during the speaker shot
    const ghost = seg(t, c('skip') - 0.5, c('skip') - 0.35) * (1 - seg(t, c('find') - 0.55, c('find') - 0.4));
    for (const f of w.crowd) {
      const h = f.home;
      const sway = Math.sin(t * 0.9 + h.x * 1.7 + h.z) * 0.12;
      f.pose({ x: h.x, z: h.z, ry: h.ry, yaw: h.yaw + sway, opacity: 1 - 0.55 * ghost });
    }
    // yellow rims in the final shot
    const rim = seg(t, c('who3') + 0.6, c('youre') - 0.6);
    for (const f of this.rimmed) f.rim.uniforms.opacity.value = rim;

    w.connector.pose(this.connector(t));
    // close shots of the pair: clear the space around and in front of them
    if (t > c('thats') - 0.32) {
      const cam = this.camera(t), hp = this.hero(t), cp = this.connector(t);
      const subs = [cp, ...(hp.visible !== false ? [hp] : [])];
      for (const f of w.crowd) {
        for (const sb of subs) {
          const near = Math.hypot(f.home.x - sb.x, f.home.z - sb.z) < 1.15;
          const ax = sb.x - cam.pos[0], az = sb.z - cam.pos[2], L = Math.hypot(ax, az);
          const bx = f.home.x - cam.pos[0], bz = f.home.z - cam.pos[2];
          const along = (bx * ax + bz * az) / L, side = Math.abs(bx * az - bz * ax) / L;
          if (!f.keep && (near || (along > 0 && along < L && side / along < 0.12 + 0.7 / L))) f.root.visible = false;
        }
      }
    }
    // nothing right in front of the lens
    {
      const cp = this.camera(t).pos;
      for (const f of w.crowd) if (Math.hypot(f.home.x - cp[0], f.home.z - cp[2]) < 2.8) f.root.visible = false;
    }
    // keep the connector in clear view while he walks / in the wide shot
    if (t > this.followFrom + 0.2 && t < c('thats') - 0.2) {
      const cam = this.camera(t), cp = this.connector(t);
      const ax = cp.x - cam.pos[0], az = cp.z - cam.pos[2], L = Math.hypot(ax, az);
      for (const f of w.crowd) {
        const bx = f.home.x - cam.pos[0], bz = f.home.z - cam.pos[2];
        const along = (bx * ax + bz * az) / L, side = Math.abs(bx * az - bz * ax) / L;
        if (along > 0 && along < L - 0.3 && side / along < 0.2 + 0.6 / L) f.root.visible = false;
      }
    }
    w.hero.pose(this.hero(t));

    // speaker on the podium, gesturing; the CEO
    const st = this.P.stage;
    w.speaker.pose({ x: st[0], y: 0.85, z: st[1], ry: 0.15, yaw: 0.2 * Math.sin(t * 1.6), armL: { raise: 0.75 + 0.15 * Math.sin(t * 3) , fx: -0.5 } });
    w.ceo.pose({ x: this.P.ceo[0], z: this.P.ceo[1], ry: -0.3, yaw: 0.1 * Math.sin(t) });
    w.podium.visible = true;

    // yellow lines
    const arcK = seg(t, c('the4') + 0.05, c('half'), E.out);
    const arcOff = seg(t, c('say') - 0.45, c('say') - 0.4);
    this.arcs.forEach((l, i) => {
      setLineProgress(l, seg(t, c('the4') + 0.05 + i * 0.18, c('the4') + 0.6 + i * 0.18, E.out));
      l.visible = l.visible && arcK > 0 && arcOff < 1;
    });
    const trail = seg(t, c('he') + 0.25, c('group') + 0.2, E.io);
    setLineProgress(this.walk1Line, trail);
    this.walk1Line.visible = this.walk1Line.visible && t < c('and2') + 0.2;
    this.ellipse.visible = t > c('and2') + 0.2 && t < c('tonight') + 0.2;
    this.ellipse.material.opacity = seg(t, c('and2') + 0.2, c('and2') + 0.5) * (1 - seg(t, c('over'), c('tonight') + 0.2));
    setLineProgress(this.floorArc, seg(t, c('youre') - 0.5, c('youre') + 0.4, E.out));
    this.floorArc.visible = this.floorArc.visible && t > c('youre') - 0.62;

    // question mark + glass panel at the end
    const C2 = this.P.conn2;
    const qk = seg(t, c('youre') + 0.5, c('youre') + 0.9, E.back);
    w.question.visible = qk > 0.001;
    w.question.position.set(C2[0] - 0.3, 2.45 + 0.3 * qk, C2[1] - 2.3);
    w.question.scale.setScalar(0.62 * Math.max(0.001, qk));
    w.question.rotation.y = -0.15;
    const pk = seg(t, c('youre') + 0.7, c('youre') + 1.05, E.out5) * (1 - seg(t, this.duration - 0.45, this.duration, E.in));
    w.panel.visible = pk > 0.001;
    w.panel.position.set(C2[0] - 0.05, -3.4 * (1 - pk), C2[1] - 2.6);
    w.panel.rotation.y = -0.3;

    // fog: wide shots see further

    // camera
    const cam = this.camera(t);
    this.cam.position.set(...cam.pos);
    this.cam.up.set(0, 1, 0);
    this.cam.lookAt(...cam.look);
    if (this.cam.fov !== cam.fov) { this.cam.fov = cam.fov; this.cam.updateProjectionMatrix(); }
    // fog follows framing distance: subject crisp, background falls off to white
    const fd = Math.hypot(cam.pos[0] - cam.look[0], cam.pos[1] - cam.look[1], cam.pos[2] - cam.look[2]);
    w.scene.fog.near = fd * 0.95;
    w.scene.fog.far = fd * 2.1 + 4;
    this.cam.updateMatrixWorld();
    w.scene.updateMatrixWorld();
  }

  // world-space anchors for the 2D overlay
  anchor(name) {
    const w = this.w;
    const v = new THREE.Vector3();
    switch (name) {
      case 'connHead': return w.connector.headPivot.getWorldPosition(v);
      case 'connFeet': return w.connector.root.getWorldPosition(v);
      case 'speakerHead': return w.speaker.headPivot.getWorldPosition(v);
      case 'ceoHead': return w.ceo.headPivot.getWorldPosition(v);
      case 'heroHead': return w.hero.headPivot.getWorldPosition(v);
      case 'heroHand': return w.hero.arms[1].children[0].localToWorld(v.set(0, -0.74, 0));
      case 'heroHandL': return w.hero.arms[0].children[0].localToWorld(v.set(0, -0.74, 0));
    }
  }
}

function hellEnd(c) { return c('group2') + 0.2; }
export { HEAD_Y };
