// World core for Sunsprings, CA: layout data, terrain height field, raised curbs/lots,
// walkable platforms (ramps, bleachers, bridges), static colliders, AI road graph,
// the painted 4K town ground texture and the minimap image.
import * as THREE from 'three';
import { clamp, smoothstep, fbm, ridged, noise2, rng, lerp } from './core.js';
import { canvas, toTex, terrainTex, rockTex, detailTex } from './textures.js';

export const FLAT = 300; // half size of the flat town basin
export const CORNER = 50;
export const PAINT = 300; // painted ground covers [-PAINT, PAINT]
export const PAINT_RES = 4096;
export const BOUND = 355; // hard boundary (distance outside flat rect is limited)

// ---------- layout ----------
// roads: centerline segments. mark: 'dy' double yellow, 'y' dashed yellow, 'w' none
export const ROADS = [
  { x1: 0, z1: -150, x2: 0, z2: 250, w: 20, mark: 'dy', lanes: 2, name: 'Main St' },
  { x1: -110, z1: -150, x2: -110, z2: 250, w: 14, mark: 'y', lanes: 1, name: '1st Ave' },
  { x1: 120, z1: -150, x2: 120, z2: 250, w: 14, mark: 'y', lanes: 1, name: '3rd Ave' },
  { x1: -240, z1: -150, x2: -240, z2: 250, w: 12, mark: 'y', lanes: 1, name: 'West Rd' },
  { x1: 240, z1: -150, x2: 240, z2: 250, w: 12, mark: 'y', lanes: 1, name: 'East Rd' },
  { x1: -240, z1: -150, x2: 240, z2: -150, w: 16, mark: 'dy', lanes: 1, name: 'North Blvd' },
  { x1: -240, z1: -50, x2: 240, z2: -50, w: 14, mark: 'y', lanes: 1, name: 'Oak St' },
  { x1: -110, z1: 50, x2: 240, z2: 50, w: 14, mark: 'y', lanes: 1, name: 'Center St' },
  { x1: -240, z1: 150, x2: 240, z2: 150, w: 14, mark: 'y', lanes: 1, name: 'Elm St' },
  { x1: -240, z1: 250, x2: 240, z2: 250, w: 12, mark: 'y', lanes: 1, name: 'South Rd' },
  // short spur up to the courthouse plaza
  { x1: 0, z1: -150, x2: 0, z2: -160, w: 20, mark: 'w', lanes: 1, name: 'Court Way' },
];
export const ROUNDABOUT = { x: 0, z: -50, r: 15, island: 9 };

// raised blocks (sidewalk + lot), x0,z0,x1,z1
export const BLOCKS = [
  { x0: -234, z0: -142, x1: -117, z1: -57, id: 'waterworks' },
  { x0: -103, z0: -142, x1: -10, z1: -57, id: 'dtNW' },
  { x0: 10, z0: -142, x1: 113, z1: -57, id: 'dtNE' },
  { x0: 127, z0: -142, x1: 234, z1: -57, id: 'church' },
  { x0: -234, z0: -43, x1: -117, z1: 143, id: 'school' },
  { x0: -103, z0: -43, x1: -10, z1: 43, id: 'dtW' },
  { x0: 10, z0: -43, x1: 113, z1: 43, id: 'dtE' },
  { x0: 127, z0: -43, x1: 234, z1: 43, id: 'hospital' },
  { x0: -103, z0: 57, x1: -10, z1: 143, id: 'gas' },
  { x0: 10, z0: 57, x1: 113, z1: 143, id: 'market' },
  { x0: 127, z0: 57, x1: 234, z1: 143, id: 'housesE' },
  { x0: -234, z0: 157, x1: -117, z1: 244, id: 'housesSW' },
  { x0: -103, z0: 157, x1: -10, z1: 244, id: 'housesS' },
  { x0: 10, z0: 157, x1: 113, z1: 244, id: 'park' },
  { x0: 127, z0: 157, x1: 234, z1: 244, id: 'easthigh' },
  { x0: -70, z0: -250, x1: 70, z1: -160, id: 'court' },
];
export const CURB = 0.16;
export const SIDEWALK = 4.5;

export const RADAR_SITE = { x: 322, z: -318, r: 58, h: 13 };

// ---------- terrain ----------
function sdRoundRect(x, z, half, r) {
  const qx = Math.abs(x) - half + r, qz = Math.abs(z) - half + r;
  const ox = Math.max(qx, 0), oz = Math.max(qz, 0);
  return Math.hypot(ox, oz) + Math.min(Math.max(qx, qz), 0) - r;
}
export function outside(x, z) {
  return sdRoundRect(x, z, FLAT, CORNER);
}

export function terrainH(x, z) {
  const d = outside(x, z);
  if (d <= 0) return 0;
  const n = fbm(x * 0.006 + 13, z * 0.006 - 7, 4);
  const rock = ridged(x * 0.011, z * 0.011, 4);
  const rise = smoothstep(4, 210, d);
  let h = rise * (55 + n * 70) + Math.pow(rise, 2) * rock * 45;
  // small bumps near the shoulder
  h += smoothstep(0, 30, d) * (noise2(x * 0.08, z * 0.08) - 0.5) * 1.2;
  // radar plateau
  const rd = Math.hypot(x - RADAR_SITE.x, z - RADAR_SITE.z);
  const pm = 1 - smoothstep(RADAR_SITE.r * 0.7, RADAR_SITE.r, rd);
  if (pm > 0) h = lerp(h, RADAR_SITE.h + (noise2(x * 0.1, z * 0.1) - 0.5) * 0.6, pm);
  return h;
}

// ---------- spatial hash ----------
class Grid {
  constructor(cell) {
    this.cell = cell;
    this.map = new Map();
  }
  key(ix, iz) {
    return ix * 73856093 ^ iz * 19349663;
  }
  insert(item, x0, z0, x1, z1) {
    const c = this.cell;
    for (let ix = Math.floor(x0 / c); ix <= Math.floor(x1 / c); ix++)
      for (let iz = Math.floor(z0 / c); iz <= Math.floor(z1 / c); iz++) {
        const k = this.key(ix, iz);
        let a = this.map.get(k);
        if (!a) this.map.set(k, (a = []));
        a.push(item);
      }
  }
  remove(item) {
    for (const a of this.map.values()) {
      const i = a.indexOf(item);
      if (i >= 0) a.splice(i, 1);
    }
  }
  at(x, z) {
    return this.map.get(this.key(Math.floor(x / this.cell), Math.floor(z / this.cell))) || EMPTY;
  }
  query(x0, z0, x1, z1, out) {
    const c = this.cell;
    out.length = 0;
    const stamp = ++this.stamp || (this.stamp = 1);
    for (let ix = Math.floor(x0 / c); ix <= Math.floor(x1 / c); ix++)
      for (let iz = Math.floor(z0 / c); iz <= Math.floor(z1 / c); iz++) {
        const a = this.map.get(this.key(ix, iz));
        if (!a) continue;
        for (const it of a)
          if (it._stamp !== stamp) {
            it._stamp = stamp;
            out.push(it);
          }
      }
    return out;
  }
}
const EMPTY = [];

// ---------- world ----------
export class World {
  constructor() {
    this.colliders = new Grid(16);
    this.platforms = new Grid(16);
    this.colliderList = [];
    this.platformList = [];
    this.nodes = [];
    this.spawns = [];
    this.pickupSpots = [];
    this.healthSpots = [];
    this.healthBays = [];
    this.targets = []; // destructible landmarks
    this.animated = [];
    this.lights = [];
    this._q = [];
    this.minimap = null;
    this.mapImage = null;
  }

  // --- colliders ---
  addBox(cx, cz, w, d, rot = 0, y0 = 0, y1 = 50, data = {}) {
    const c = Math.cos(rot), s = Math.sin(rot);
    const col = { type: 'box', cx, cz, hx: w / 2, hz: d / 2, c, s, rot, y0, y1, ...data };
    const ex = Math.abs(c) * col.hx + Math.abs(s) * col.hz;
    const ez = Math.abs(s) * col.hx + Math.abs(c) * col.hz;
    col.ex = ex;
    col.ez = ez;
    this.colliders.insert(col, cx - ex, cz - ez, cx + ex, cz + ez);
    this.colliderList.push(col);
    return col;
  }
  addCircle(cx, cz, r, y0 = 0, y1 = 50, data = {}) {
    const col = { type: 'circle', cx, cz, r, y0, y1, ex: r, ez: r, ...data };
    this.colliders.insert(col, cx - r, cz - r, cx + r, cz + r);
    this.colliderList.push(col);
    return col;
  }
  removeCollider(col) {
    this.colliders.remove(col);
    const i = this.colliderList.indexOf(col);
    if (i >= 0) this.colliderList.splice(i, 1);
    col.dead = true;
  }
  // platforms: flat rect, ramp rect (height varies along local z from yA at -hz to yB at +hz), circle
  addPlatform(p) {
    if (p.type === 'circle') {
      this.platforms.insert(p, p.cx - p.r, p.cz - p.r, p.cx + p.r, p.cz + p.r);
    } else {
      p.c = Math.cos(p.rot || 0);
      p.s = Math.sin(p.rot || 0);
      const ex = Math.abs(p.c) * p.hx + Math.abs(p.s) * p.hz;
      const ez = Math.abs(p.s) * p.hx + Math.abs(p.c) * p.hz;
      this.platforms.insert(p, p.cx - ex, p.cz - ez, p.cx + ex, p.cz + ez);
    }
    this.platformList.push(p);
    return p;
  }

  // height of the drivable surface under (x,z) for something currently at height y
  groundHeight(x, z, y = 1e9) {
    let best = terrainH(x, z);
    const list = this.platforms.at(x, z);
    for (let i = 0; i < list.length; i++) {
      const p = list[i];
      let top;
      if (p.type === 'circle') {
        const dx = x - p.cx, dz = z - p.cz;
        if (dx * dx + dz * dz > p.r * p.r) continue;
        top = p.y;
      } else {
        const dx = x - p.cx, dz = z - p.cz;
        const lx = dx * p.c - dz * p.s;
        const lz = dx * p.s + dz * p.c;
        if (lx < -p.hx || lx > p.hx || lz < -p.hz || lz > p.hz) continue;
        if (p.ramp) top = lerp(p.yA, p.yB, (lz + p.hz) / (2 * p.hz));
        else top = p.y;
        if (p.steps) top = Math.floor(top / p.steps) * p.steps + p.steps * 0.5; // bleacher steps feel
      }
      if (top > best && top <= y + 1.6) best = top;
    }
    return best;
  }
  terrainNormal(x, z, out) {
    const e = 1.5;
    const hL = terrainH(x - e, z), hR = terrainH(x + e, z);
    const hD = terrainH(x, z - e), hU = terrainH(x, z + e);
    return out.set(hL - hR, 2 * e, hD - hU).normalize();
  }

  // push a circle (x,z,r at height y..y+h) out of static colliders. returns contacts
  collideCircle(pos, r, y, h, contacts) {
    contacts.length = 0;
    const list = this.colliders.query(pos.x - r - 1, pos.z - r - 1, pos.x + r + 1, pos.z + r + 1, this._q);
    for (let i = 0; i < list.length; i++) {
      const col = list[i];
      if (col.dead || y + h < col.y0 || y > col.y1) continue;
      if (col.type === 'circle') {
        const dx = pos.x - col.cx, dz = pos.z - col.cz;
        const d2 = dx * dx + dz * dz;
        const rr = r + col.r;
        if (d2 >= rr * rr) continue;
        const d = Math.sqrt(d2) || 0.001;
        const pen = rr - d;
        const nx = dx / d, nz = dz / d;
        pos.x += nx * pen;
        pos.z += nz * pen;
        contacts.push({ nx, nz, pen, col });
      } else {
        const dx = pos.x - col.cx, dz = pos.z - col.cz;
        const lx = dx * col.c - dz * col.s;
        const lz = dx * col.s + dz * col.c;
        const qx = clamp(lx, -col.hx, col.hx), qz = clamp(lz, -col.hz, col.hz);
        let ddx = lx - qx, ddz = lz - qz;
        let d2 = ddx * ddx + ddz * ddz;
        let lnx, lnz, pen;
        if (d2 > 1e-8) {
          if (d2 >= r * r) continue;
          const d = Math.sqrt(d2);
          lnx = ddx / d;
          lnz = ddz / d;
          pen = r - d;
        } else {
          // center inside box: push out along the shallowest axis
          const px = col.hx - Math.abs(lx), pz = col.hz - Math.abs(lz);
          if (px < pz) {
            lnx = Math.sign(lx) || 1;
            lnz = 0;
            pen = px + r;
          } else {
            lnx = 0;
            lnz = Math.sign(lz) || 1;
            pen = pz + r;
          }
        }
        // back to world space (inverse rotation)
        const nx = lnx * col.c + lnz * col.s;
        const nz = -lnx * col.s + lnz * col.c;
        pos.x += nx * pen;
        pos.z += nz * pen;
        contacts.push({ nx, nz, pen, col });
      }
    }
    // hard boundary
    const d = outside(pos.x, pos.z);
    if (d > BOUND - FLAT) {
      const e = 1;
      const gx = outside(pos.x + e, pos.z) - outside(pos.x - e, pos.z);
      const gz = outside(pos.x, pos.z + e) - outside(pos.x, pos.z - e);
      const l = Math.hypot(gx, gz) || 1;
      const pen = d - (BOUND - FLAT);
      pos.x -= (gx / l) * pen;
      pos.z -= (gz / l) * pen;
      contacts.push({ nx: -gx / l, nz: -gz / l, pen, col: null });
    }
    return contacts;
  }

  // segment test against tall colliders (line of sight / projectile sweep)
  segmentBlocked(ax, ay, az, bx, by, bz, ignoreLow = 2.5) {
    const list = this.colliders.query(Math.min(ax, bx) - 1, Math.min(az, bz) - 1, Math.max(ax, bx) + 1, Math.max(az, bz) + 1, this._q);
    for (let i = 0; i < list.length; i++) {
      const col = list[i];
      if (col.dead || col.y1 < ignoreLow) continue;
      const t = segHit(col, ax, az, bx, bz);
      if (t >= 0) {
        const y = ay + (by - ay) * t;
        if (y >= col.y0 && y <= col.y1) return t;
      }
    }
    return -1;
  }
  // point inside any solid collider (for projectiles)
  pointSolid(x, y, z) {
    const list = this.colliders.at(x, z);
    for (let i = 0; i < list.length; i++) {
      const col = list[i];
      if (col.dead || y < col.y0 || y > col.y1) continue;
      if (col.type === 'circle') {
        const dx = x - col.cx, dz = z - col.cz;
        if (dx * dx + dz * dz < col.r * col.r) return col;
      } else {
        const dx = x - col.cx, dz = z - col.cz;
        const lx = dx * col.c - dz * col.s;
        const lz = dx * col.s + dz * col.c;
        if (Math.abs(lx) <= col.hx && Math.abs(lz) <= col.hz) return col;
      }
    }
    return null;
  }

  // ---------- AI road graph ----------
  buildGraph() {
    const nodes = (this.nodes = []);
    const find = (x, z) => nodes.find((n) => Math.abs(n.x - x) < 0.5 && Math.abs(n.z - z) < 0.5);
    const node = (x, z) => {
      let n = find(x, z);
      if (!n) {
        n = { x, z, id: nodes.length, links: [] };
        nodes.push(n);
      }
      return n;
    };
    const link = (a, b) => {
      if (a === b || a.links.includes(b)) return;
      a.links.push(b);
      b.links.push(a);
    };
    // nodes along every road, split every ~45 m and at every crossing
    for (const r of ROADS) {
      const pts = [];
      const horiz = r.z1 === r.z2;
      const a = horiz ? r.x1 : r.z1, b = horiz ? r.x2 : r.z2;
      const cross = new Set([a, b]);
      for (const o of ROADS) {
        if (o === r) continue;
        if (horiz && o.x1 === o.x2 && o.x1 > Math.min(a, b) - 1 && o.x1 < Math.max(a, b) + 1 && r.z1 >= Math.min(o.z1, o.z2) - 1 && r.z1 <= Math.max(o.z1, o.z2) + 1) cross.add(o.x1);
        if (!horiz && o.z1 === o.z2 && o.z1 > Math.min(a, b) - 1 && o.z1 < Math.max(a, b) + 1 && r.x1 >= Math.min(o.x1, o.x2) - 1 && r.x1 <= Math.max(o.x1, o.x2) + 1) cross.add(o.z1);
      }
      const stops = [...cross].sort((p, q) => p - q);
      for (let i = 0; i < stops.length; i++) {
        pts.push(stops[i]);
        if (i < stops.length - 1) {
          const len = stops[i + 1] - stops[i];
          const k = Math.floor(len / 45);
          for (let j = 1; j <= k; j++) pts.push(stops[i] + (len * j) / (k + 1));
        }
      }
      let prev = null;
      for (const p of pts) {
        const n = horiz ? node(p, r.z1) : node(r.x1, p);
        if (prev) link(prev, n);
        prev = n;
      }
    }
    // extra open-ground nodes: outer dirt belt, lots, plaza
    const extra = [
      [-275, -275], [0, -278], [275, -275], [275, 0], [275, 270], [0, 280], [-275, 270], [-275, 0],
      [-275, -150], [275, -150], [-275, 150], [275, 150], [-150, 280], [150, 280], [-150, -278], [150, -278],
      [0, -185], [-45, -185], [45, -185], [RADAR_SITE.x - 25, RADAR_SITE.z + 20],
      [35, 100], [70, 100], [80, 120], [-45, 100], [-70, 120], [-175, 50], [-175, 90], [-175, 10], [180, 0], [180, 100], [-60, 200], [60, 200], [180, 200],
    ];
    for (const [x, z] of extra) {
      const n = node(x, z);
      // link to nearby nodes with clear line
      const near = nodes
        .filter((o) => o !== n && Math.hypot(o.x - n.x, o.z - n.z) < 95)
        .sort((p, q) => Math.hypot(p.x - n.x, p.z - n.z) - Math.hypot(q.x - n.x, q.z - n.z));
      let k = 0;
      for (const o of near) {
        if (k >= 4) break;
        if (this.segmentBlocked(n.x, 1, n.z, o.x, 1, o.z, 0.5) < 0) {
          link(n, o);
          k++;
        }
      }
    }
  }
  nearestNode(x, z, needLOS = false) {
    let best = null, bd = 1e18;
    for (const n of this.nodes) {
      const d = (n.x - x) ** 2 + (n.z - z) ** 2;
      if (d < bd) {
        if (needLOS && this.segmentBlocked(x, 1, z, n.x, 1, n.z, 0.5) >= 0) continue;
        bd = d;
        best = n;
      }
    }
    return best || this.nearestNode(x, z, false);
  }
  path(from, to) {
    // A*
    if (from === to) return [to];
    const open = [from];
    const g = new Map([[from, 0]]);
    const f = new Map([[from, Math.hypot(from.x - to.x, from.z - to.z)]]);
    const came = new Map();
    const closed = new Set();
    while (open.length) {
      let bi = 0;
      for (let i = 1; i < open.length; i++) if (f.get(open[i]) < f.get(open[bi])) bi = i;
      const cur = open.splice(bi, 1)[0];
      if (cur === to) {
        const out = [cur];
        let c = cur;
        while (came.has(c)) {
          c = came.get(c);
          out.unshift(c);
        }
        return out;
      }
      closed.add(cur);
      for (const nb of cur.links) {
        if (closed.has(nb)) continue;
        const ng = g.get(cur) + Math.hypot(nb.x - cur.x, nb.z - cur.z);
        if (!g.has(nb) || ng < g.get(nb)) {
          came.set(nb, cur);
          g.set(nb, ng);
          f.set(nb, ng + Math.hypot(nb.x - to.x, nb.z - to.z));
          if (!open.includes(nb)) open.push(nb);
        }
      }
    }
    return [to];
  }

  // ---------- painted ground ----------
  paintGround() {
    const S = PAINT_RES;
    const c = canvas(S, S);
    const ctx = c.getContext('2d');
    const k = S / (PAINT * 2);
    const X = (x) => (x + PAINT) * k;
    const Z = (z) => (z + PAINT) * k;
    const r = rng(1234);

    // noise tile for organic variation
    const tile = canvas(512, 512);
    {
      const t = tile.getContext('2d');
      const img = t.createImageData(512, 512);
      for (let i = 0; i < 512 * 512; i++) {
        const x = i % 512, y = (i / 512) | 0;
        const n = fbm(x / 64, y / 64, 4, 2, 0.55);
        const v = 0.75 + n * 0.5;
        img.data[i * 4] = 152 * v;
        img.data[i * 4 + 1] = 128 * v;
        img.data[i * 4 + 2] = 84 * v;
        img.data[i * 4 + 3] = 255;
      }
      t.putImageData(img, 0, 0);
    }
    ctx.fillStyle = ctx.createPattern(tile, 'repeat');
    ctx.fillRect(0, 0, S, S);
    // dry grass patches
    for (let i = 0; i < 2600; i++) {
      ctx.fillStyle = r() < 0.5 ? 'rgba(98,92,48,0.25)' : 'rgba(120,96,64,0.25)';
      ctx.beginPath();
      ctx.ellipse(r() * S, r() * S, 10 + r() * 60, 8 + r() * 40, r() * 3, 0, Math.PI * 2);
      ctx.fill();
    }

    const rect = (x0, z0, x1, z1) => [X(x0), Z(z0), (x1 - x0) * k, (z1 - z0) * k];
    const asphalt = (x0, z0, x1, z1, shade = 1) => {
      const g = Math.round(76 * shade);
      ctx.fillStyle = `rgb(${g},${g - 2},${g - 5})`;
      ctx.fillRect(...rect(x0, z0, x1, z1));
    };
    const lawn = (x0, z0, x1, z1, col = 'rgba(90,104,44,0.9)') => {
      ctx.fillStyle = col;
      ctx.fillRect(...rect(x0, z0, x1, z1));
      for (let i = 0; i < ((x1 - x0) * (z1 - z0)) / 40; i++) {
        ctx.fillStyle = r() < 0.5 ? 'rgba(130,112,62,0.35)' : 'rgba(70,74,36,0.35)';
        ctx.beginPath();
        ctx.ellipse(X(x0 + r() * (x1 - x0)), Z(z0 + r() * (z1 - z0)), 3 + r() * 14, 2 + r() * 10, r() * 3, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    // blocks: sidewalk ring + interior
    this.lots = [];
    for (const b of BLOCKS) {
      ctx.fillStyle = '#9b958a';
      ctx.fillRect(...rect(b.x0, b.z0, b.x1, b.z1));
      // sidewalk joints
      ctx.strokeStyle = 'rgba(60,55,48,0.5)';
      ctx.lineWidth = 1;
      for (let x = b.x0; x <= b.x1; x += 1.6) {
        ctx.beginPath();
        ctx.moveTo(X(x), Z(b.z0));
        ctx.lineTo(X(x), Z(b.z0 + SIDEWALK));
        ctx.moveTo(X(x), Z(b.z1 - SIDEWALK));
        ctx.lineTo(X(x), Z(b.z1));
        ctx.stroke();
      }
      for (let z = b.z0; z <= b.z1; z += 1.6) {
        ctx.beginPath();
        ctx.moveTo(X(b.x0), Z(z));
        ctx.lineTo(X(b.x0 + SIDEWALK), Z(z));
        ctx.moveTo(X(b.x1 - SIDEWALK), Z(z));
        ctx.lineTo(X(b.x1), Z(z));
        ctx.stroke();
      }
      const ix0 = b.x0 + SIDEWALK, iz0 = b.z0 + SIDEWALK, ix1 = b.x1 - SIDEWALK, iz1 = b.z1 - SIDEWALK;
      b.inner = { x0: ix0, z0: iz0, x1: ix1, z1: iz1 };
      // default interior: lawn with dirt
      lawn(ix0, iz0, ix1, iz1);
    }

    // roads
    for (const rd of ROADS) {
      const hw = rd.w / 2;
      if (rd.z1 === rd.z2) asphalt(Math.min(rd.x1, rd.x2) - hw, rd.z1 - hw, Math.max(rd.x1, rd.x2) + hw, rd.z1 + hw);
      else asphalt(rd.x1 - hw, Math.min(rd.z1, rd.z2) - hw, rd.x1 + hw, Math.max(rd.z1, rd.z2) + hw);
    }
    // roundabout ring
    ctx.fillStyle = 'rgb(76,74,71)';
    ctx.beginPath();
    ctx.arc(X(ROUNDABOUT.x), Z(ROUNDABOUT.z), ROUNDABOUT.r * k + 10 * k, 0, Math.PI * 2);
    ctx.fill();

    // asphalt variation: patches, oil, cracks, tar seams
    const roadAt = (x, z) => this.onRoad(x, z);
    for (let i = 0; i < 9000; i++) {
      const x = -PAINT + r() * PAINT * 2, z = -PAINT + r() * PAINT * 2;
      if (!roadAt(x, z)) continue;
      const t = r();
      if (t < 0.45) {
        ctx.fillStyle = `rgba(${r() < 0.5 ? '30,30,32' : '95,93,88'},${0.08 + r() * 0.12})`;
        ctx.beginPath();
        ctx.ellipse(X(x), Z(z), (1 + r() * 4) * k, (0.6 + r() * 2.5) * k, r() * 3, 0, Math.PI * 2);
        ctx.fill();
      } else if (t < 0.7) {
        ctx.strokeStyle = 'rgba(25,24,22,0.55)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        let px = X(x), pz = Z(z);
        ctx.moveTo(px, pz);
        for (let j = 0; j < 6; j++) {
          px += (r() - 0.5) * 22;
          pz += (r() - 0.5) * 22;
          ctx.lineTo(px, pz);
        }
        ctx.stroke();
      } else if (t < 0.8) {
        // patch
        ctx.fillStyle = 'rgba(42,41,40,0.75)';
        ctx.fillRect(X(x), Z(z), (2 + r() * 5) * k, (1.5 + r() * 4) * k);
      } else if (t < 0.86) {
        // skid marks
        ctx.strokeStyle = 'rgba(15,15,15,0.35)';
        ctx.lineWidth = 0.35 * k;
        const a = r() * Math.PI * 2, len = 6 + r() * 16, curve = (r() - 0.5) * 0.08;
        for (const off of [-0.8, 0.8]) {
          ctx.beginPath();
          let px = x + Math.cos(a + Math.PI / 2) * off, pz = z + Math.sin(a + Math.PI / 2) * off, aa = a;
          ctx.moveTo(X(px), Z(pz));
          for (let j = 0; j < 12; j++) {
            aa += curve;
            px += (Math.cos(aa) * len) / 12;
            pz += (Math.sin(aa) * len) / 12;
            ctx.lineTo(X(px), Z(pz));
          }
          ctx.stroke();
        }
      }
    }

    // lane markings
    const yellow = 'rgba(214,170,52,0.9)';
    const white = 'rgba(226,222,210,0.85)';
    // a point of a horizontal road is inside an intersection when it lies in a vertical road band
    // (and vice versa)
    const inIntersection = (x, z, horiz) => {
      for (const o of ROADS) {
        const oh = o.z1 === o.z2;
        if (oh === horiz) continue;
        const hw = o.w / 2;
        if (oh) {
          if (Math.abs(z - o.z1) < hw && x >= Math.min(o.x1, o.x2) - hw && x <= Math.max(o.x1, o.x2) + hw) return true;
        } else if (Math.abs(x - o.x1) < hw && z >= Math.min(o.z1, o.z2) - hw && z <= Math.max(o.z1, o.z2) + hw) return true;
      }
      return Math.hypot(x - ROUNDABOUT.x, z - ROUNDABOUT.z) < ROUNDABOUT.r + 12;
    };
    const line = (x0, z0, x1, z1, wid, col, dash) => {
      ctx.strokeStyle = col;
      ctx.lineWidth = wid * k;
      ctx.setLineDash(dash ? dash.map((d) => d * k) : []);
      ctx.beginPath();
      ctx.moveTo(X(x0), Z(z0));
      ctx.lineTo(X(x1), Z(z1));
      ctx.stroke();
      ctx.setLineDash([]);
    };
    for (const rd of ROADS) {
      if (rd.mark === 'w') continue;
      const horiz = rd.z1 === rd.z2;
      const a = horiz ? Math.min(rd.x1, rd.x2) : Math.min(rd.z1, rd.z2);
      const b = horiz ? Math.max(rd.x1, rd.x2) : Math.max(rd.z1, rd.z2);
      // walk in 1 m steps, emitting runs outside intersections
      let runStart = null;
      const emit = (s, e) => {
        if (e - s < 2) return;
        const P = (t, off) => (horiz ? [t, rd.z1 + off] : [rd.x1 + off, t]);
        if (rd.mark === 'dy') {
          line(...P(s, -0.22), ...P(e, -0.22), 0.16, yellow);
          line(...P(s, 0.22), ...P(e, 0.22), 0.16, yellow);
        } else line(...P(s, 0), ...P(e, 0), 0.16, yellow, [3, 3.5]);
        if (rd.lanes === 2) {
          line(...P(s, -rd.w / 4), ...P(e, -rd.w / 4), 0.14, white, [3, 6]);
          line(...P(s, rd.w / 4), ...P(e, rd.w / 4), 0.14, white, [3, 6]);
        }
        // edge lines
        line(...P(s, -rd.w / 2 + 0.5), ...P(e, -rd.w / 2 + 0.5), 0.12, 'rgba(220,214,200,0.55)');
        line(...P(s, rd.w / 2 - 0.5), ...P(e, rd.w / 2 - 0.5), 0.12, 'rgba(220,214,200,0.55)');
        // turn arrows + stop bars + crosswalks at both ends
        for (const [end, dir] of [
          [s, 1],
          [e, -1],
        ]) {
          if (Math.abs(end - a) < 1 || Math.abs(end - b) < 1) continue;
          // crosswalk (zebra), just outside the intersection box
          for (let o = -rd.w / 2 + 0.6; o < rd.w / 2 - 0.6; o += 1.1) {
            const p0 = P(end + dir * 0.4, o), p1 = P(end + dir * 3.2, o);
            line(p0[0], p0[1], p1[0], p1[1], 0.6, 'rgba(228,224,214,0.85)');
          }
          // stop bar
          const sb0 = P(end + dir * 4.2, dir > 0 ? 0 : 0), sb1 = P(end + dir * 4.2, dir > 0 ? rd.w / 2 - 0.5 : -rd.w / 2 + 0.5);
          line(sb0[0], sb0[1], sb1[0], sb1[1], 0.45, white);
          // arrow in the approach lane
          const laneOff = dir > 0 ? rd.w / 4 : -rd.w / 4;
          const ap = P(end + dir * 9, laneOff);
          this.paintArrow(ctx, X(ap[0]), Z(ap[1]), horiz ? (dir > 0 ? Math.PI : 0) : dir > 0 ? -Math.PI / 2 : Math.PI / 2, k);
        }
      };
      for (let t = a; t <= b; t += 1) {
        const x = horiz ? t : rd.x1, z = horiz ? rd.z1 : t;
        const blocked = inIntersection(x, z, horiz);
        if (!blocked && runStart === null) runStart = t;
        if ((blocked || t + 1 > b) && runStart !== null) {
          emit(runStart, blocked ? t : b);
          runStart = null;
        }
      }
    }
    // roundabout: island + yield dashes
    ctx.fillStyle = '#9b958a';
    ctx.beginPath();
    ctx.arc(X(ROUNDABOUT.x), Z(ROUNDABOUT.z), ROUNDABOUT.island * k, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(96,98,52,0.95)';
    ctx.beginPath();
    ctx.arc(X(ROUNDABOUT.x), Z(ROUNDABOUT.z), (ROUNDABOUT.island - 1.2) * k, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = white;
    ctx.lineWidth = 0.3 * k;
    ctx.setLineDash([1.5 * k, 1.5 * k]);
    ctx.beginPath();
    ctx.arc(X(ROUNDABOUT.x), Z(ROUNDABOUT.z), (ROUNDABOUT.r + 9) * k, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // manholes + storm drains along roads
    for (let i = 0; i < 260; i++) {
      const rd = ROADS[i % ROADS.length];
      const t = r();
      const x = lerp(rd.x1, rd.x2, t), z = lerp(rd.z1, rd.z2, t);
      const off = (r() - 0.5) * rd.w * 0.6;
      const px = rd.z1 === rd.z2 ? x : x + off, pz = rd.z1 === rd.z2 ? z + off : z;
      ctx.fillStyle = 'rgba(40,38,34,0.9)';
      ctx.beginPath();
      ctx.arc(X(px), Z(pz), 0.45 * k, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(110,105,95,0.6)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    this.groundCanvas = c;
    this.groundCtx = ctx;
    this.paintK = k;
    this.PX = X;
    this.PZ = Z;
    return { ctx, X, Z, k, rect, asphalt, lawn, r };
  }
  paintArrow(ctx, x, y, ang, k) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(ang);
    ctx.fillStyle = 'rgba(226,222,210,0.8)';
    const s = k;
    ctx.fillRect(-3.2 * s, -0.18 * s, 3.2 * s, 0.36 * s);
    ctx.beginPath();
    ctx.moveTo(0, -0.7 * s);
    ctx.lineTo(1.3 * s, 0);
    ctx.lineTo(0, 0.7 * s);
    ctx.fill();
    ctx.restore();
  }
  onRoad(x, z) {
    for (const rd of ROADS) {
      const hw = rd.w / 2;
      if (rd.z1 === rd.z2) {
        if (Math.abs(z - rd.z1) <= hw && x >= Math.min(rd.x1, rd.x2) - hw && x <= Math.max(rd.x1, rd.x2) + hw) return true;
      } else if (Math.abs(x - rd.x1) <= hw && z >= Math.min(rd.z1, rd.z2) - hw && z <= Math.max(rd.z1, rd.z2) + hw) return true;
    }
    const dr = Math.hypot(x - ROUNDABOUT.x, z - ROUNDABOUT.z);
    return dr < ROUNDABOUT.r + 10 && dr > ROUNDABOUT.island;
  }
  inBlock(x, z) {
    for (const b of BLOCKS) if (x > b.x0 && x < b.x1 && z > b.z0 && z < b.z1) return b;
    return null;
  }

  // ---------- terrain mesh with town ground ----------
  buildGround(scene) {
    const groundTex = toTex(this.groundCanvas, { repeat: false });
    groundTex.wrapS = groundTex.wrapT = THREE.ClampToEdgeWrapping;
    // canvas rows map to +z directly (world z grows downward on the painted map)
    groundTex.flipY = false;
    this.groundTex = groundTex;
    const tTex = terrainTex();
    const rTex = rockTex();
    const dTex = detailTex();
    const mat = new THREE.MeshStandardMaterial({ roughness: 0.93, metalness: 0, color: 0xffffff });
    mat.onBeforeCompile = (sh) => {
      sh.uniforms.uTown = { value: groundTex };
      sh.uniforms.uTerrain = { value: tTex };
      sh.uniforms.uRock = { value: rTex };
      sh.uniforms.uDetail = { value: dTex };
      sh.uniforms.uPaint = { value: PAINT };
      sh.vertexShader = sh.vertexShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vWPos;\nvarying vec3 vWNor;')
        .replace(
          '#include <worldpos_vertex>',
          '#include <worldpos_vertex>\nvWPos = (modelMatrix * vec4(transformed, 1.0)).xyz;\nvWNor = normalize(mat3(modelMatrix) * objectNormal);',
        );
      sh.fragmentShader = sh.fragmentShader
        .replace(
          '#include <common>',
          `#include <common>
          varying vec3 vWPos; varying vec3 vWNor;
          uniform sampler2D uTown, uTerrain, uRock, uDetail; uniform float uPaint;`,
        )
        .replace(
          '#include <map_fragment>',
          `
          vec2 tuv = (vWPos.xz + uPaint) / (2.0 * uPaint);
          vec3 town = texture2D(uTown, tuv).rgb;
          vec3 terr = texture2D(uTerrain, vWPos.xz / 9.0).rgb;
          terr = mix(terr, texture2D(uTerrain, vWPos.xz / 61.0).rgb, 0.5);
          // triplanar-ish rock on steep slopes
          vec3 rockX = texture2D(uRock, vWPos.zy / 14.0).rgb;
          vec3 rockZ = texture2D(uRock, vWPos.xy / 14.0).rgb;
          vec3 rock = mix(rockZ, rockX, abs(vWNor.x) / (abs(vWNor.x) + abs(vWNor.z) + 1e-4));
          float steep = smoothstep(0.86, 0.62, vWNor.y);
          terr = mix(terr, rock, steep);
          vec2 edge = smoothstep(vec2(uPaint - 6.0), vec2(uPaint), abs(vWPos.xz));
          float tw = max(edge.x, edge.y);
          vec3 base = mix(town, terr, tw);
          // curb faces: concrete
          float side = 1.0 - smoothstep(0.35, 0.6, abs(vWNor.y));
          base = mix(base, vec3(0.52, 0.5, 0.46) * (0.85 + 0.15 * texture2D(uDetail, vWPos.xy * 0.5).r), side * (1.0 - tw));
          float det = texture2D(uDetail, vWPos.xz / 3.0).r * 0.6 + texture2D(uDetail, vWPos.xz / 0.9).r * 0.4;
          base *= 0.72 + det * 0.56;
          diffuseColor.rgb *= base;
          `,
        );
    };
    this.groundMat = mat;

    // terrain grid
    const size = 1280, seg = 320;
    const geo = new THREE.PlaneGeometry(size, size, seg, seg);
    geo.rotateX(-Math.PI / 2);
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) p.setY(i, terrainH(p.getX(i), p.getZ(i)) - 0.02);
    geo.computeVertexNormals();
    const terrain = new THREE.Mesh(geo, mat);
    terrain.receiveShadow = true;
    terrain.castShadow = true;
    terrain.matrixAutoUpdate = false;
    scene.add(terrain);
    this.terrain = terrain;

    // far mountain ring: a jagged silhouette 2-3 km out, low on the horizon
    const far = new THREE.CylinderGeometry(1, 1, 1, 160, 4, true);
    const fp = far.attributes.position;
    for (let i = 0; i < fp.count; i++) {
      const x = fp.getX(i), z = fp.getZ(i);
      const a = Math.atan2(z, x);
      const yN = fp.getY(i) + 0.5; // 0 bottom .. 1 top
      const h = 110 + fbm(Math.cos(a) * 3 + 9, Math.sin(a) * 3, 5) * 260 + ridged(Math.cos(a) * 7, Math.sin(a) * 7, 3) * 140;
      const rad = lerp(2600, 2150, yN);
      fp.setXYZ(i, Math.cos(a) * rad, yN * h - 30, Math.sin(a) * rad);
    }
    far.computeVertexNormals();
    const farMat = new THREE.MeshStandardMaterial({ color: 0x8b6a45, roughness: 1, side: THREE.DoubleSide });
    const farMesh = new THREE.Mesh(far, farMat);
    scene.add(farMesh);
    this.farMountains = farMesh;
  }

  // raised slabs for blocks (top samples the painted texture, sides are curbs)
  buildBlocks(batch) {
    for (const b of BLOCKS) {
      const w = b.x1 - b.x0, d = b.z1 - b.z0;
      const cx = (b.x0 + b.x1) / 2, cz = (b.z0 + b.z1) / 2;
      batch.walls('ground', cx, cz, w, d, -0.3, CURB + 0.3, 0, 1, 1);
      batch.top('ground', cx, cz, w, d, CURB, 0, 1);
      this.addPlatform({ type: 'rect', cx, cz, hx: w / 2, hz: d / 2, rot: 0, y: CURB });
    }
    // roundabout island
    const isl = new THREE.CylinderGeometry(ROUNDABOUT.island, ROUNDABOUT.island, 0.35, 40, 1);
    batch.geo('ground', isl, new THREE.Matrix4().makeTranslation(ROUNDABOUT.x, 0, ROUNDABOUT.z));
    this.addPlatform({ type: 'circle', cx: ROUNDABOUT.x, cz: ROUNDABOUT.z, r: ROUNDABOUT.island, y: 0.17 });
  }

  // top-down minimap image (grayscale, roads bright)
  buildMinimap() {
    const S = 1024;
    const c = canvas(S, S);
    const ctx = c.getContext('2d');
    const half = 380;
    const k = S / (half * 2);
    const X = (x) => (x + half) * k, Z = (z) => (z + half) * k;
    ctx.fillStyle = '#2b2b2b';
    ctx.fillRect(0, 0, S, S);
    // hills shading
    const img = ctx.getImageData(0, 0, S, S);
    for (let y = 0; y < S; y += 2)
      for (let x = 0; x < S; x += 2) {
        const wx = x / k - half, wz = y / k - half;
        const h = terrainH(wx, wz);
        const v = h > 0.5 ? 46 + Math.min(40, h * 0.6) : 52;
        for (let dy = 0; dy < 2; dy++)
          for (let dx = 0; dx < 2; dx++) {
            const i = ((y + dy) * S + x + dx) * 4;
            img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
            img.data[i + 3] = 255;
          }
      }
    ctx.putImageData(img, 0, 0);
    // blocks
    for (const b of BLOCKS) {
      ctx.fillStyle = '#5a5a58';
      ctx.fillRect(X(b.x0), Z(b.z0), (b.x1 - b.x0) * k, (b.z1 - b.z0) * k);
    }
    // roads
    ctx.fillStyle = '#a9a9a5';
    for (const rd of ROADS) {
      const hw = rd.w / 2;
      if (rd.z1 === rd.z2) ctx.fillRect(X(Math.min(rd.x1, rd.x2) - hw), Z(rd.z1 - hw), (Math.abs(rd.x2 - rd.x1) + rd.w) * k, rd.w * k);
      else ctx.fillRect(X(rd.x1 - hw), Z(Math.min(rd.z1, rd.z2) - hw), rd.w * k, (Math.abs(rd.z2 - rd.z1) + rd.w) * k);
    }
    ctx.strokeStyle = '#a9a9a5';
    ctx.lineWidth = 10 * k;
    ctx.beginPath();
    ctx.arc(X(ROUNDABOUT.x), Z(ROUNDABOUT.z), (ROUNDABOUT.r + 4) * k, 0, Math.PI * 2);
    ctx.stroke();
    // buildings (dark)
    ctx.fillStyle = '#1b1b1b';
    for (const col of this.colliderList) {
      if (col.y1 < 3 || col.minimap === false) continue;
      ctx.save();
      ctx.translate(X(col.cx), Z(col.cz));
      if (col.type === 'circle') {
        ctx.beginPath();
        ctx.arc(0, 0, col.r * k, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.rotate(-col.rot);
        ctx.fillRect(-col.hx * k, -col.hz * k, col.hx * 2 * k, col.hz * 2 * k);
      }
      ctx.restore();
    }
    this.minimap = { canvas: c, half, k };
  }
}

// segment (2D) vs collider; returns t in [0,1] or -1
function segHit(col, ax, az, bx, bz) {
  if (col.type === 'circle') {
    const dx = bx - ax, dz = bz - az;
    const fx = ax - col.cx, fz = az - col.cz;
    const a = dx * dx + dz * dz;
    const b = 2 * (fx * dx + fz * dz);
    const c = fx * fx + fz * fz - col.r * col.r;
    const disc = b * b - 4 * a * c;
    if (disc < 0) return -1;
    const s = Math.sqrt(disc);
    let t = (-b - s) / (2 * a);
    if (t >= 0 && t <= 1) return t;
    t = (-b + s) / (2 * a);
    if (t >= 0 && t <= 1 && c < 0) return 0;
    return -1;
  }
  // into local space
  const lax = (ax - col.cx) * col.c - (az - col.cz) * col.s;
  const laz = (ax - col.cx) * col.s + (az - col.cz) * col.c;
  const lbx = (bx - col.cx) * col.c - (bz - col.cz) * col.s;
  const lbz = (bx - col.cx) * col.s + (bz - col.cz) * col.c;
  const dx = lbx - lax, dz = lbz - laz;
  let t0 = 0, t1 = 1;
  for (const [p, d, h] of [
    [lax, dx, col.hx],
    [laz, dz, col.hz],
  ]) {
    if (Math.abs(d) < 1e-9) {
      if (p < -h || p > h) return -1;
    } else {
      let ta = (-h - p) / d, tb = (h - p) / d;
      if (ta > tb) [ta, tb] = [tb, ta];
      t0 = Math.max(t0, ta);
      t1 = Math.min(t1, tb);
      if (t0 > t1) return -1;
    }
  }
  return t0;
}
