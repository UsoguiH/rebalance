// HUD, laid out after the Twisted Metal (2012) screen: rotating minimap top-left with the
// scoreboard/event feed under it, "Opponents: N" on the left, damage callouts at the top,
// 7-segment timer + energy d-pad + sidearm ammo bottom-left, weapon carousel bottom-center,
// health and turbo bars bottom-right, enemy name tags with health triangles, the red
// lock-on reticle, off-screen arrows and big center messages.
import * as THREE from 'three';
import { clamp, G, lerp } from './core.js';
import { CAROUSEL, WEAPON_INFO } from './weapons.js';

const VW = 1280, VH = 720;
const _v = new THREE.Vector3();
const COND = 'Oswald, "Arial Narrow", sans-serif';

export class HUD {
  constructor(canvas) {
    this.cv = canvas;
    this.ctx = canvas.getContext('2d');
    this.damageLines = [];
    this.feed = [];
    this.center = null;
    this.centerT = 0;
    this.killMsg = null;
    this.killT = 0;
    this.pickupMsg = null;
    this.pickupT = 0;
    this.warn = null;
    this.warnT = 0;
    this.agg = new Map();
    this.flash = 0;
    this.scale = 1;
    this.splats = [];
  }
  // blood droplets on the "lens" after running someone over
  splat(amount = 1) {
    const n = Math.round(6 + amount * 16);
    for (let i = 0; i < n; i++) {
      const big = Math.random() < 0.25;
      this.splats.push({
        x: Math.random(), y: Math.random() * 0.85, r: (big ? 16 : 5) + Math.random() * (big ? 26 : 12), t: 0, life: 2.5 + Math.random() * 2,
        drip: big && Math.random() < 0.6 ? 20 + Math.random() * 60 : 0, seed: Math.random() * 1000,
      });
    }
  }
  drawSplats(dt) {
    const c = this.ctx, W = this.w, H = this.h, s = this.s;
    this.splats = this.splats.filter((p) => (p.t += dt) < p.life);
    for (const p of this.splats) {
      const a = clamp((p.life - p.t) / 1.2, 0, 1) * 0.85;
      const x = p.x * W, y = p.y * H, r = p.r * s;
      c.globalAlpha = a;
      c.fillStyle = '#5a0604';
      c.beginPath();
      for (let k = 0; k <= 10; k++) {
        const ang = (k / 10) * Math.PI * 2;
        const rr = r * (0.75 + 0.35 * Math.sin(p.seed + k * 2.3));
        if (k === 0) c.moveTo(x + Math.cos(ang) * rr, y + Math.sin(ang) * rr);
        else c.lineTo(x + Math.cos(ang) * rr, y + Math.sin(ang) * rr);
      }
      c.fill();
      c.fillStyle = 'rgba(150,20,14,0.9)';
      c.beginPath();
      c.arc(x - r * 0.2, y - r * 0.2, r * 0.55, 0, Math.PI * 2);
      c.fill();
      if (p.drip) {
        c.fillStyle = '#5a0604';
        c.fillRect(x - r * 0.12, y, r * 0.24, Math.min(p.drip, p.t * 30) * s);
      }
      c.globalAlpha = 1;
    }
  }
  resize(w, h, dpr) {
    this.cv.width = Math.round(w * dpr);
    this.cv.height = Math.round(h * dpr);
    this.w = w;
    this.h = h;
    this.dpr = dpr;
    // virtual 1280x720 layout scaled by height, anchored to the edges
    this.s = h / VH;
  }

  // ----- messages -----
  damageText(weapon, dmg) {
    // aggregate rapid hits from the same weapon ("Machine Gun 13 damage")
    const now = G.time;
    let a = this.agg.get(weapon);
    if (a && now - a.t < 0.9) {
      a.dmg += dmg;
      a.t = now;
      a.line.text = this.fmtDamage(weapon, a.dmg);
      a.line.t = 0;
      return;
    }
    const line = { text: this.fmtDamage(weapon, dmg), t: 0 };
    this.damageLines.unshift(line);
    if (this.damageLines.length > 3) this.damageLines.pop();
    this.agg.set(weapon, { dmg, t: now, line });
  }
  fmtDamage(weapon, dmg) {
    const d = Math.max(1, Math.round(dmg));
    if (/Machine Gun|Turret|Gun|Flame Thrower|Napalm|Ram Damage|Sidearm/.test(weapon)) return `${weapon} ${d} damage`;
    return `${weapon} Hit ${d} damage`;
  }
  event(text, color = '#ffffff') {
    this.feed.unshift({ text, color, t: 0 });
    if (this.feed.length > 4) this.feed.pop();
  }
  bigCenter(text, color = '#e8862a', dur = 2.6, size = 64) {
    this.center = { text, color, size };
    this.centerT = dur;
  }
  kill(text) {
    this.killMsg = text;
    this.killT = 2.4;
  }
  pickup(text) {
    this.pickupMsg = text;
    this.pickupT = 1.8;
  }
  warning(text, dur = 1.6) {
    this.warn = text;
    this.warnT = dur;
  }

  // ----- drawing helpers -----
  text(t, x, y, size, color, align = 'left', weight = 600, outline = 'rgba(0,0,0,0.85)', font = COND) {
    const c = this.ctx;
    c.font = `${weight} ${size}px ${font}`;
    c.textAlign = align;
    c.textBaseline = 'middle';
    if (outline) {
      c.lineJoin = 'round';
      c.strokeStyle = outline;
      c.lineWidth = Math.max(2, size * 0.16);
      c.strokeText(t, x, y);
    }
    c.fillStyle = color;
    c.fillText(t, x, y);
  }

  draw(dt, state) {
    const c = this.ctx;
    const dpr = this.dpr;
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.clearRect(0, 0, this.w, this.h);
    const p = G.player;
    if (!p || state.hidden) return;
    const s = this.s;
    const W = this.w, H = this.h;
    this.flash = Math.max(0, this.flash - dt);
    for (const l of this.damageLines) l.t += dt;
    this.damageLines = this.damageLines.filter((l) => l.t < 2.4);
    for (const f of this.feed) f.t += dt;
    this.feed = this.feed.filter((f) => f.t < 5);
    this.centerT -= dt;
    this.killT -= dt;
    this.pickupT -= dt;
    this.warnT -= dt;

    this.drawSplats(dt);
    if (!state.minimal) {
      this.markers(state);
      this.minimap(20 * s, 40 * s, 148 * s, state);
      // scoreboard rows + feed under the minimap
      let fy = 40 * s + 148 * s + 16 * s;
      if (state.scoreRows) {
        for (const r of state.scoreRows) {
          this.text(String(r.rank), 24 * s, fy, 13 * s, r.me ? '#ffd23a' : '#ffffff', 'left', 600);
          this.text(r.name, 40 * s, fy, 13 * s, r.me ? '#ffd23a' : '#ffffff', 'left', 500);
          this.text(String(r.score), 160 * s, fy, 13 * s, r.me ? '#ffd23a' : '#ffffff', 'right', 600);
          fy += 16 * s;
        }
      }
      for (const f of this.feed) {
        const a = clamp((5 - f.t) / 0.6, 0, 1);
        c.globalAlpha = a;
        this.text(f.text, 22 * s, fy, 12 * s, f.color, 'left', 500);
        c.globalAlpha = 1;
        fy += 15 * s;
      }
      // opponents count
      if (state.opponentsLabel) this.text(state.opponentsLabel, 38 * s, 380 * s, 17 * s, '#f2efe6', 'left', 500);
    }

    // damage callouts (top center)
    this.damageLines.forEach((l, i) => {
      const a = clamp((2.4 - l.t) / 0.5, 0, 1);
      c.globalAlpha = a * (i === 0 ? 1 : 0.75);
      const size = (i === 0 ? 24 : 15) * s;
      const y = i === 0 ? 62 * s : (62 - 22 - (i - 1) * 16) * s;
      this.text(l.text, W / 2, y, size, i === 0 ? '#e6e23a' : '#d8d6b0', 'center', 600);
      c.globalAlpha = 1;
    });
    // warning (targeted / stalled) and kill message
    if (this.warnT > 0 && this.warn) {
      c.globalAlpha = clamp(this.warnT / 0.3, 0, 1) * (0.65 + 0.35 * Math.sin(G.time * 18));
      this.text(this.warn, W / 2, H * 0.55, 19 * s, '#ff3a2a', 'center', 600);
      c.globalAlpha = 1;
    }
    if (this.killT > 0 && this.killMsg) {
      const a = clamp(this.killT / 0.4, 0, 1);
      const pop = 1 + Math.max(0, this.killT - 2.1) * 1.2;
      c.globalAlpha = a;
      this.text(this.killMsg, W * 0.5, H * 0.43, 36 * s * pop, '#ffffff', 'center', 700);
      c.globalAlpha = 1;
    }
    if (this.centerT > 0 && this.center) {
      const a = clamp(this.centerT / 0.5, 0, 1);
      c.globalAlpha = a;
      const lines = this.center.text.split('\n');
      lines.forEach((ln, i) => this.text(ln, W / 2, H * 0.36 + (i - (lines.length - 1) / 2) * this.center.size * s * 1.05, this.center.size * s, this.center.color, 'center', 700, 'rgba(40,10,0,0.9)'));
      c.globalAlpha = 1;
    }
    if (this.pickupT > 0 && this.pickupMsg) {
      c.globalAlpha = clamp(this.pickupT / 0.4, 0, 1);
      this.text(this.pickupMsg, W / 2, H * 0.835, 15 * s, '#ffffff', 'center', 500);
      c.globalAlpha = 1;
    }
    if (p.stalled > 0) {
      c.globalAlpha = 0.7 + 0.3 * Math.sin(G.time * 14);
      this.text('Press Buttons To Restart Engine', W / 2, H * 0.6, 19 * s, '#ff4a4a', 'center', 600);
      c.globalAlpha = 1;
    }

    if (state.minimal) return;
    this.bottomLeft(s, H, state);
    this.carousel(s, W, H);
    this.bars(s, W, H);
    if (state.respawn) {
      this.text(state.respawn, W / 2, H * 0.7, 26 * s, '#ffffff', 'center', 600);
    }
    if (state.scoreboard) this.scoreboard(state.scoreboard, s, W, H);
  }

  // ----- minimap (rotates with the player, north follows heading) -----
  minimap(x, y, size, state) {
    const c = this.ctx;
    const mm = G.world.minimap;
    const p = G.player;
    const range = 110; // meters shown from center to edge
    c.save();
    c.fillStyle = '#1e1e1e';
    c.fillRect(x, y, size, size);
    c.beginPath();
    c.rect(x, y, size, size);
    c.clip();
    c.translate(x + size / 2, y + size / 2);
    const k = size / 2 / range;
    c.rotate(p.yaw + Math.PI);
    c.scale(k / mm.k, k / mm.k);
    c.translate(-(p.pos.x + mm.half) * mm.k, -(p.pos.z + mm.half) * mm.k);
    c.globalAlpha = 0.95;
    c.drawImage(mm.canvas, 0, 0);
    c.globalAlpha = 1;
    c.restore();
    // icons (computed in rotated frame)
    const rot = p.yaw + Math.PI;
    const cs = Math.cos(rot), sn = Math.sin(rot);
    const toMap = (wx, wz) => {
      const dx = (wx - p.pos.x) * k, dz = (wz - p.pos.z) * k;
      return [x + size / 2 + dx * cs - dz * sn, y + size / 2 + dx * sn + dz * cs];
    };
    const inside = (mx, my, m = 3) => mx > x + m && mx < x + size - m && my > y + m && my < y + size - m;
    c.save();
    c.beginPath();
    c.rect(x, y, size, size);
    c.clip();
    for (const pk of G.weapons.pickups) {
      if (!pk.active) continue;
      const [mx, my] = toMap(pk.x, pk.z);
      if (!inside(mx, my)) continue;
      if (pk.kind === 'health') {
        c.fillStyle = '#3affb0';
        c.fillRect(mx - 3, my - 1, 6, 2);
        c.fillRect(mx - 1, my - 3, 2, 6);
      } else {
        c.fillStyle = pk.kind === 'turbo' ? '#ffd23a' : '#e8e8e8';
        c.fillRect(mx - 1.5, my - 1.5, 3, 3);
      }
    }
    for (const b of G.world.healthBays) {
      const [mx, my] = toMap(b.x, b.z);
      if (!inside(mx, my)) continue;
      c.fillStyle = b.cooldown > 0 ? '#5a6a64' : '#3affb0';
      c.fillRect(mx - 5, my - 1.5, 10, 3);
      c.fillRect(mx - 1.5, my - 5, 3, 10);
    }
    for (const o of G.cars) {
      if (o === p || !o.alive) continue;
      if (o.invisible > 0) continue;
      let [mx, my] = toMap(o.pos.x, o.pos.z);
      const edge = !inside(mx, my, 6);
      mx = clamp(mx, x + 6, x + size - 6);
      my = clamp(my, y + 6, y + size - 6);
      const ally = G.teams && o.team === p.team && p.team !== 0;
      c.save();
      c.translate(mx, my);
      c.rotate(-(o.yaw - p.yaw));
      c.fillStyle = ally ? '#3ad83a' : o === G.hunted ? '#ffd23a' : '#ff3a2a';
      c.globalAlpha = edge ? 0.7 : 1;
      c.beginPath();
      c.moveTo(0, -5.5);
      c.lineTo(4, 4);
      c.lineTo(-4, 4);
      c.closePath();
      c.fill();
      c.restore();
    }
    // radar dishes and other targets
    for (const tg of G.world.targets) {
      if (tg.dead) continue;
      const [mx, my] = toMap(tg.pos.x, tg.pos.z);
      if (!inside(mx, my)) continue;
      c.strokeStyle = '#c8c8c8';
      c.lineWidth = 1;
      c.beginPath();
      c.arc(mx, my, 3, 0, Math.PI * 2);
      c.stroke();
    }
    c.restore();
    // player arrow
    c.save();
    c.translate(x + size / 2, y + size / 2);
    c.fillStyle = '#ffffff';
    c.strokeStyle = '#d8241c';
    c.lineWidth = 1.5;
    c.beginPath();
    c.moveTo(0, -7);
    c.lineTo(5, 6);
    c.lineTo(0, 3);
    c.lineTo(-5, 6);
    c.closePath();
    c.fill();
    c.stroke();
    c.restore();
    // frame
    c.strokeStyle = 'rgba(235,232,222,0.9)';
    c.lineWidth = 2;
    c.strokeRect(x, y, size, size);
    c.strokeStyle = 'rgba(0,0,0,0.6)';
    c.lineWidth = 1;
    c.strokeRect(x - 1.5, y - 1.5, size + 3, size + 3);
    void state;
  }

  // ----- name tags, health triangles, lock reticle, off-screen arrows -----
  markers(state) {
    const c = this.ctx;
    const cam = G.camera;
    const p = G.player;
    const W = this.w, H = this.h, s = this.s;
    for (const o of G.cars) {
      if (o === p || !o.alive || o.invisible > 0) continue;
      _v.set(o.pos.x, o.pos.y + o.height + 1.2, o.pos.z).project(cam);
      const behind = _v.z > 1;
      let sx = (_v.x * 0.5 + 0.5) * W, sy = (-_v.y * 0.5 + 0.5) * H;
      const dist = o.pos.distanceTo(p.pos);
      const ally = G.teams && o.team === p.team && p.team !== 0;
      if (behind || sx < 0 || sx > W || sy < 0 || sy > H) {
        // off-screen arrow on the nearest edge
        if (behind) {
          sx = W - sx;
          sy = H + 50;
        }
        const ex = clamp(sx, 14 * s, W - 14 * s), ey = clamp(sy, 14 * s, H - 14 * s);
        const ang = Math.atan2(sy - ey, sx - ex) || (behind ? Math.PI / 2 : 0);
        c.save();
        c.translate(ex, ey);
        c.rotate(ang);
        c.fillStyle = ally ? '#3ad83a' : '#e0241c';
        c.beginPath();
        c.moveTo(9 * s, 0);
        c.lineTo(-5 * s, -7 * s);
        c.lineTo(-5 * s, 7 * s);
        c.closePath();
        c.fill();
        c.restore();
        continue;
      }
      if (dist > 260) continue;
      if (G.world.segmentBlocked(G.camera.position.x, G.camera.position.y, G.camera.position.z, o.pos.x, o.pos.y + 1.5, o.pos.z, 4) >= 0 && dist > 40) continue;
      const a = clamp(1.4 - dist / 220, 0.35, 1);
      c.globalAlpha = a;
      const label = o.name;
      this.text(label, sx, sy - 14 * s, 13 * s, ally ? '#3ad83a' : '#e8241c', 'center', 600, 'rgba(0,0,0,0.7)');
      // health triangle (green -> yellow -> orange -> red)
      const hf = o.hpFrac;
      const col = ally ? '#3ad83a' : hf > 0.75 ? '#c84aff' : hf > 0.5 ? '#ffd23a' : hf > 0.25 ? '#ff8a1a' : '#ff1a1a';
      c.fillStyle = col;
      c.strokeStyle = 'rgba(0,0,0,0.8)';
      c.lineWidth = 1.5;
      c.beginPath();
      c.moveTo(sx - 9 * s, sy - 4 * s);
      c.lineTo(sx + 9 * s, sy - 4 * s);
      c.lineTo(sx, sy + 6 * s);
      c.closePath();
      c.fill();
      c.stroke();
      c.fillStyle = '#ffffff';
      c.fillRect(sx - 7 * s, sy - 7 * s, 14 * s * hf, 2 * s);
      c.globalAlpha = 1;
    }
    // lock-on reticle around the target, or a small crosshair ahead
    const t = p.target;
    if (t && t.alive) {
      _v.set(t.pos.x, t.pos.y + t.height * 0.5, t.pos.z).project(cam);
      if (_v.z < 1) {
        const sx = (_v.x * 0.5 + 0.5) * W, sy = (-_v.y * 0.5 + 0.5) * H;
        const r = clamp(900 / (t.pos.distanceTo(p.pos) + 20), 14, 34) * s;
        const spin = G.time * 1.5;
        c.strokeStyle = '#e0241c';
        c.lineWidth = 2.5 * s;
        c.beginPath();
        c.arc(sx, sy, r, 0, Math.PI * 2);
        c.stroke();
        c.lineWidth = 1.5 * s;
        c.beginPath();
        c.arc(sx, sy, r * 0.62, 0, Math.PI * 2);
        c.stroke();
        for (let i = 0; i < 4; i++) {
          const a = spin + (i * Math.PI) / 2;
          c.beginPath();
          c.moveTo(sx + Math.cos(a) * r * 0.8, sy + Math.sin(a) * r * 0.8);
          c.lineTo(sx + Math.cos(a) * r * 1.35, sy + Math.sin(a) * r * 1.35);
          c.stroke();
        }
        c.fillStyle = '#e0241c';
        c.beginPath();
        c.arc(sx, sy, 2 * s, 0, Math.PI * 2);
        c.fill();
      }
    } else if (!state.noCrosshair) {
      _v.copy(p.pos).addScaledVector(p.forward, 40);
      _v.y += 1.5;
      _v.project(cam);
      if (_v.z < 1) {
        const sx = (_v.x * 0.5 + 0.5) * W, sy = (-_v.y * 0.5 + 0.5) * H;
        c.strokeStyle = 'rgba(255,255,255,0.85)';
        c.lineWidth = 1.5 * s;
        c.beginPath();
        c.arc(sx, sy, 11 * s, 0, Math.PI * 2);
        c.stroke();
        for (let i = 0; i < 4; i++) {
          const a = (i * Math.PI) / 2;
          c.beginPath();
          c.moveTo(sx + Math.cos(a) * 7 * s, sy + Math.sin(a) * 7 * s);
          c.lineTo(sx + Math.cos(a) * 15 * s, sy + Math.sin(a) * 15 * s);
          c.stroke();
        }
      }
    }
  }

  // ----- bottom-left: timer, energy d-pad, sidearm ammo -----
  bottomLeft(s, H, state) {
    const c = this.ctx;
    const p = G.player;
    // timer box
    const tx = 58 * s, ty = H - 89 * s, tw = 84 * s, th = 28 * s;
    if (state.timer !== undefined && state.timer !== null) {
      c.fillStyle = 'rgba(12,10,6,0.85)';
      roundRect(c, tx, ty, tw, th, 4 * s);
      c.fill();
      c.strokeStyle = '#e8a62a';
      c.lineWidth = 2 * s;
      c.stroke();
      const t = Math.max(0, state.timer);
      const mm = Math.floor(t / 60), ss = Math.floor(t % 60);
      const str = `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
      seg7(c, str, tx + 8 * s, ty + 5 * s, 18 * s, state.timer < 30 && Math.sin(G.time * 8) > 0 ? '#ff5a2a' : '#f2c22a');
    }
    // energy d-pad: up freeze, right shield, down mine, left rear fire
    const cx = 52 * s, cy = H - 44 * s, d = 15 * s;
    const items = [
      ['freeze', 0, -1, 45],
      ['shield', 1, 0, 50],
      ['mine', 0, 1, 25],
      ['rear', -1, 0, 0],
    ];
    for (const [k, ox, oy, cost] of items) {
      const ok = k === 'rear' ? true : p.energy >= cost;
      const active = k === 'rear' ? G.input.rear : false;
      dpadIcon(c, cx + ox * d, cy + oy * d, 12 * s, k, ok, active);
    }
    // energy bar under the d-pad
    const bx = 22 * s, by = H - 18 * s, bw = 64 * s, bh = 6 * s;
    c.fillStyle = 'rgba(0,0,0,0.6)';
    c.fillRect(bx - 1, by - 1, bw + 2, bh + 2);
    const eg = c.createLinearGradient(0, by, 0, by + bh);
    eg.addColorStop(0, '#8ad0ff');
    eg.addColorStop(1, '#1a6ad8');
    c.fillStyle = eg;
    c.fillRect(bx, by, bw * (p.energy / 100), bh);
    c.strokeStyle = 'rgba(200,230,255,0.6)';
    c.lineWidth = 1;
    c.strokeRect(bx, by, bw, bh);
    // sidearm: machine gun icon + ammo
    const ix = 102 * s, iy = H - 46 * s;
    weaponIcon(c, 'mg', ix + 18 * s, iy, 26 * s, '#e8e6dc');
    this.text(String(Math.floor(p.mgAmmo)), ix + 6 * s, iy - 13 * s, 12 * s, '#ffffff', 'center', 600);
    // bullets row
    c.fillStyle = '#d8d6cc';
    for (let i = 0; i < 4; i++) c.fillRect(ix + 2 * s + i * 7 * s, iy + 9 * s, 4 * s, 8 * s * clamp(p.mgAmmo / 100 - i * 0.25, 0, 0.25) * 4);
  }

  // ----- weapon carousel (bottom center) -----
  carousel(s, W, H) {
    const c = this.ctx;
    const p = G.player;
    const slots = CAROUSEL;
    const gap = 37 * s;
    const x0 = W / 2 - ((slots.length - 1) * gap) / 2;
    const y = H - 30 * s;
    slots.forEach((k, i) => {
      const x = x0 + i * gap;
      const sel = p.selected === k;
      let count = k === 'special' ? (p.def.special.fuel ? Math.round(p.fuel) : p.special) : p.weapons[k];
      const has = k === 'special' ? true : count > 0;
      const size = (sel ? 30 : 22) * s;
      c.globalAlpha = has ? (sel ? 1 : 0.8) : 0.18;
      const col = sel ? (k === 'special' ? '#f2c22a' : '#ff8ab0') : '#d8d6cc';
      if (k === 'special') {
        this.text('S', x, y, size * 1.2, col, 'center', 700, 'rgba(0,0,0,0.7)', 'Rye, serif');
        // regen progress ring for the special
        if (!p.def.special.fuel && p.special < p.def.special.ammo) {
          c.strokeStyle = 'rgba(242,194,42,0.8)';
          c.lineWidth = 2 * s;
          c.beginPath();
          c.arc(x, y, 15 * s, -Math.PI / 2, -Math.PI / 2 + (p.specialRegen / p.def.special.regen) * Math.PI * 2);
          c.stroke();
        }
        if (p.charge > 0 && p.charging === 'special') {
          c.fillStyle = '#ffffff';
          c.fillRect(x - 14 * s, y + 16 * s, 28 * s * clamp(p.charge / 2, 0, 1), 3 * s);
        }
      } else weaponIcon(c, k, x, y, size, col);
      c.globalAlpha = has ? 1 : 0.18;
      if (has && count !== undefined) this.text(String(count), x, y - size * 0.85, 11 * s, '#ffffff', 'center', 600);
      c.globalAlpha = 1;
    });
    // selected weapon caption when charging stalker / sniper
    if ((p.charging === 'stalker' || p.charging === 'sniper') && p.charge > 0) {
      c.fillStyle = '#ffffff';
      c.fillRect(W / 2 - 40 * s, y + 18 * s, 80 * s * clamp(p.charge / 1.5, 0, 1), 3 * s);
    }
    void WEAPON_INFO;
  }

  // ----- health + turbo bars (bottom right) -----
  bars(s, W, H) {
    const c = this.ctx;
    const p = G.player;
    const x = W - 220 * s, w = 170 * s;
    const hy = H - 60 * s, hh = 13 * s;
    const ty = H - 37 * s, th = 10 * s;
    const hf = p.hpFrac;
    const flash = p.hitFlash > 0 ? p.hitFlash : 0;
    barFrame(c, x, hy, w, hh, s);
    const hcol = hf > 0.55 ? ['#c8ff6a', '#3aa81a'] : hf > 0.3 ? ['#fff07a', '#c8a01a'] : hf > 0.15 ? ['#ffb05a', '#d8601a'] : ['#ff7a5a', '#c01a10'];
    const g = c.createLinearGradient(0, hy, 0, hy + hh);
    g.addColorStop(0, hcol[0]);
    g.addColorStop(1, hcol[1]);
    c.fillStyle = g;
    c.fillRect(x + 2 * s, hy + 2 * s, (w - 4 * s) * hf, hh - 4 * s);
    if (flash) {
      c.fillStyle = `rgba(255,255,255,${flash * 0.6})`;
      c.fillRect(x + 2 * s, hy + 2 * s, (w - 4 * s) * hf, hh - 4 * s);
    }
    // gloss line + segment ticks
    c.fillStyle = 'rgba(255,255,255,0.25)';
    c.fillRect(x + 2 * s, hy + 2 * s, (w - 4 * s) * hf, 2 * s);
    c.fillStyle = 'rgba(0,0,0,0.25)';
    for (let i = 1; i < 10; i++) c.fillRect(x + (w * i) / 10, hy + 2 * s, 1, hh - 4 * s);
    iconBox(c, x + w + 6 * s, hy - 1 * s, 15 * s, '+', '#9ad8ff');
    barFrame(c, x, ty, w, th, s);
    const tg = c.createLinearGradient(0, ty, 0, ty + th);
    tg.addColorStop(0, '#fff08a');
    tg.addColorStop(1, '#c8a01a');
    c.fillStyle = tg;
    c.fillRect(x + 2 * s, ty + 2 * s, (w - 4 * s) * (p.turbo / 100), th - 4 * s);
    iconBox(c, x + w + 6 * s, ty - 2.5 * s, 13 * s, '▼', '#f2c22a');
  }

  scoreboard(rows, s, W, H) {
    const c = this.ctx;
    const bw = 420 * s, bh = (60 + rows.length * 26) * s;
    const x = W / 2 - bw / 2, y = H / 2 - bh / 2;
    c.fillStyle = 'rgba(10,8,6,0.82)';
    c.fillRect(x, y, bw, bh);
    c.strokeStyle = '#8a1a14';
    c.lineWidth = 3 * s;
    c.strokeRect(x, y, bw, bh);
    this.text('SCOREBOARD', x + 16 * s, y + 22 * s, 20 * s, '#e8862a', 'left', 700);
    this.text('KILLS', x + bw - 120 * s, y + 22 * s, 13 * s, '#a8a49a', 'center', 600);
    this.text('DEATHS', x + bw - 50 * s, y + 22 * s, 13 * s, '#a8a49a', 'center', 600);
    rows.forEach((r, i) => {
      const yy = y + (52 + i * 26) * s;
      const col = r.me ? '#ffd23a' : '#efebe2';
      this.text(`${i + 1}. ${r.name}`, x + 16 * s, yy, 15 * s, col, 'left', 500);
      this.text(r.vehicle, x + 190 * s, yy, 12 * s, '#a8a49a', 'left', 400);
      this.text(String(r.kills), x + bw - 120 * s, yy, 15 * s, col, 'center', 600);
      this.text(String(r.deaths), x + bw - 50 * s, yy, 15 * s, col, 'center', 600);
    });
  }
}

// ---------- primitives ----------
function roundRect(c, x, y, w, h, r) {
  c.beginPath();
  c.moveTo(x + r, y);
  c.arcTo(x + w, y, x + w, y + h, r);
  c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r);
  c.arcTo(x, y, x + w, y, r);
  c.closePath();
}
function barFrame(c, x, y, w, h, s) {
  c.fillStyle = 'rgba(8,8,8,0.8)';
  c.beginPath();
  c.moveTo(x + 4 * s, y);
  c.lineTo(x + w, y);
  c.lineTo(x + w - 4 * s, y + h);
  c.lineTo(x, y + h);
  c.closePath();
  c.fill();
  c.strokeStyle = 'rgba(220,220,210,0.55)';
  c.lineWidth = 1;
  c.stroke();
}
function iconBox(c, x, y, sz, glyph, color) {
  c.fillStyle = 'rgba(10,20,40,0.85)';
  c.fillRect(x, y, sz, sz);
  c.strokeStyle = color;
  c.lineWidth = 1.2;
  c.strokeRect(x, y, sz, sz);
  c.fillStyle = color;
  c.font = `700 ${sz * 0.9}px Oswald, sans-serif`;
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.fillText(glyph, x + sz / 2, y + sz / 2 + 1);
}
// seven segment digits
const SEG = {
  0: 'abcdef', 1: 'bc', 2: 'abged', 3: 'abgcd', 4: 'fgbc', 5: 'afgcd', 6: 'afgedc', 7: 'abc', 8: 'abcdefg', 9: 'abcfgd',
};
function seg7(c, str, x, y, h, color) {
  const w = h * 0.5, t = h * 0.13;
  let cx = x;
  for (const ch of str) {
    if (ch === ':') {
      c.fillStyle = color;
      c.fillRect(cx + t * 0.4, y + h * 0.28, t, t);
      c.fillRect(cx + t * 0.4, y + h * 0.66, t, t);
      cx += t * 2.2;
      continue;
    }
    const on = SEG[ch] || '';
    const segs = {
      a: [cx + t, y, w - 2 * t, t],
      b: [cx + w - t, y + t, t, h / 2 - 1.5 * t],
      c: [cx + w - t, y + h / 2 + t / 2, t, h / 2 - 1.5 * t],
      d: [cx + t, y + h - t, w - 2 * t, t],
      e: [cx, y + h / 2 + t / 2, t, h / 2 - 1.5 * t],
      f: [cx, y + t, t, h / 2 - 1.5 * t],
      g: [cx + t, y + h / 2 - t / 2, w - 2 * t, t],
    };
    for (const k of 'abcdefg') {
      c.fillStyle = on.includes(k) ? color : 'rgba(80,60,20,0.35)';
      c.fillRect(...segs[k]);
    }
    cx += w + t * 1.4;
  }
}
function dpadIcon(c, x, y, r, kind, ok, active) {
  c.save();
  c.translate(x, y);
  c.globalAlpha = ok ? 1 : 0.35;
  // rounded diamond tile
  const g = c.createLinearGradient(0, -r, 0, r);
  g.addColorStop(0, active ? '#ffffff' : '#7ac0ff');
  g.addColorStop(1, active ? '#9ad0ff' : '#1a5ab8');
  c.fillStyle = g;
  c.strokeStyle = 'rgba(220,240,255,0.9)';
  c.lineWidth = 1.2;
  c.beginPath();
  c.moveTo(0, -r);
  c.lineTo(r * 0.85, -r * 0.15);
  c.lineTo(r * 0.85, r * 0.55);
  c.lineTo(0, r);
  c.lineTo(-r * 0.85, r * 0.55);
  c.lineTo(-r * 0.85, -r * 0.15);
  c.closePath();
  c.fill();
  c.stroke();
  c.strokeStyle = '#ffffff';
  c.fillStyle = '#ffffff';
  c.lineWidth = 1.6;
  const k = r * 0.45;
  if (kind === 'freeze') {
    c.beginPath();
    c.moveTo(k * 0.3, -k);
    c.lineTo(-k * 0.4, k * 0.1);
    c.lineTo(k * 0.2, k * 0.1);
    c.lineTo(-k * 0.3, k * 1.1);
    c.stroke();
  } else if (kind === 'shield') {
    c.beginPath();
    c.moveTo(0, -k);
    c.lineTo(k * 0.8, -k * 0.6);
    c.lineTo(k * 0.6, k * 0.5);
    c.lineTo(0, k);
    c.lineTo(-k * 0.6, k * 0.5);
    c.lineTo(-k * 0.8, -k * 0.6);
    c.closePath();
    c.stroke();
  } else if (kind === 'mine') {
    c.beginPath();
    c.arc(0, 0, k * 0.6, 0, Math.PI * 2);
    c.fill();
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      c.beginPath();
      c.moveTo(Math.cos(a) * k * 0.6, Math.sin(a) * k * 0.6);
      c.lineTo(Math.cos(a) * k, Math.sin(a) * k);
      c.stroke();
    }
  } else {
    // car with rear motion lines
    c.fillRect(-k * 0.5, -k * 0.5, k, k * 0.8);
    c.beginPath();
    c.moveTo(-k, k * 0.6);
    c.lineTo(k, k * 0.6);
    c.moveTo(-k * 0.8, k * 0.95);
    c.lineTo(k * 0.8, k * 0.95);
    c.stroke();
  }
  c.restore();
}
// weapon silhouettes for the carousel
export function weaponIcon(c, kind, x, y, size, color) {
  c.save();
  c.translate(x, y);
  const s = size / 30;
  c.scale(s, s);
  c.fillStyle = color;
  c.strokeStyle = color;
  c.lineWidth = 2;
  const missile = (len = 22, w = 4, fins = true) => {
    c.beginPath();
    c.moveTo(0, -len / 2 - 5);
    c.lineTo(w, -len / 2);
    c.lineTo(w, len / 2);
    c.lineTo(-w, len / 2);
    c.lineTo(-w, -len / 2);
    c.closePath();
    c.fill();
    if (fins) {
      c.beginPath();
      c.moveTo(w, len / 2 - 6);
      c.lineTo(w + 5, len / 2 + 3);
      c.lineTo(w, len / 2);
      c.moveTo(-w, len / 2 - 6);
      c.lineTo(-w - 5, len / 2 + 3);
      c.lineTo(-w, len / 2);
      c.fill();
    }
  };
  switch (kind) {
    case 'fire':
      missile();
      c.fillStyle = '#ff7a2a';
      c.beginPath();
      c.moveTo(-3, 12);
      c.lineTo(0, 18);
      c.lineTo(3, 12);
      c.fill();
      break;
    case 'homing':
      missile(18, 3.5);
      c.beginPath();
      c.arc(0, 0, 10, 0, Math.PI * 1.6);
      c.stroke();
      break;
    case 'power':
      missile(24, 5.5);
      break;
    case 'stalker':
      missile(20, 4);
      c.beginPath();
      c.moveTo(-9, -6);
      c.lineTo(9, -6);
      c.stroke();
      break;
    case 'napalm':
      c.fillRect(-6, -9, 12, 18);
      c.beginPath();
      c.moveTo(-3, -9);
      c.lineTo(0, -15);
      c.lineTo(3, -9);
      c.fill();
      break;
    case 'ricochet':
      c.fillRect(-7, -4, 14, 9);
      c.beginPath();
      c.arc(-5, 7, 3, 0, Math.PI * 2);
      c.arc(5, 7, 3, 0, Math.PI * 2);
      c.fill();
      break;
    case 'remote':
      c.beginPath();
      c.arc(0, 2, 8, 0, Math.PI * 2);
      c.fill();
      c.fillRect(-1, -12, 2, 8);
      break;
    case 'shotgun':
      c.fillRect(-12, -3, 22, 4);
      c.fillRect(-12, 1, 6, 8);
      break;
    case 'sniper':
      c.fillRect(-14, -2, 28, 3);
      c.fillRect(-6, -7, 8, 4);
      c.fillRect(-12, 1, 5, 7);
      break;
    case 'mg':
      c.fillRect(-14, -3, 22, 5);
      c.fillRect(8, -2, 7, 2);
      c.fillRect(-12, 2, 5, 7);
      c.fillRect(-6, 2, 3, 5);
      break;
  }
  c.restore();
}
void lerp;
