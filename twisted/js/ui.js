// Menus and full-screen cards drawn on the 2D overlay: the scratched chrome TWISTED METAL
// logo, main menu with red brush-stroke highlight, mode select, vehicle select (stat wheel,
// specials, red brushed name banner), options, the Sunsprings loading card with tips,
// pause and the end-of-match results panel.
import { G, clamp, rng, saveSettings } from './core.js';
import { input } from './input.js';
import { audio } from './audio.js';
import { VEHICLES } from './vehicles.js';

const COND = 'Oswald, "Arial Narrow", sans-serif';
const TIPS = [
  'Double tap the gas for turbo. Turbo slowly recharges on its own.',
  'Hold the stalker missile fire button to charge it. A full charge makes it hunt harder.',
  'Freeze an enemy, then follow up with a power missile. It cannot miss a frozen car.',
  'Drive into the garage inside Bruner\'s Foodsource to repair your vehicle.',
  'Napalm: press fire again in mid-air to drop the canister on the spot.',
  'Remote bombs stick to cars. Press fire again to detonate.',
  'Shoot the radar dishes on the ridge for a light show.',
  'Shields block everything for a few seconds. Save energy for the homing specials.',
  'Ram damage depends on speed and weight. Darkside hits like a freight train.',
  'Knock the head off the diner mascot. You know you want to.',
  'When your engine is shocked, mash the gas to restart it.',
  'Drive up the stadium bleachers and launch off the top.',
];
const MODES = [
  { id: 'dm', name: 'DEATH MATCH', desc: 'Every car for itself. First to the kill limit, or the most kills when time runs out.' },
  { id: 'lms', name: 'LAST MAN STANDING', desc: 'Three lives each. The last vehicle running wins.' },
  { id: 'hunted', name: 'HUNTED', desc: 'One car is the prey. Kill the prey to become the prey. Score by surviving as the prey.' },
  { id: 'endurance', name: 'ENDURANCE', desc: 'Survive waves of enemies that keep coming. How long can you last?' },
];

export class UI {
  constructor(hud) {
    this.hud = hud;
    this.ctx = hud.ctx;
    this.screen = 'title';
    this.sel = 0;
    this.t = 0;
    this.vehicleIdx = 0;
    this.mode = MODES[0];
    this.tip = TIPS[0];
    this.onStart = null;
    this.onQuit = null;
    this.onResume = null;
    this.onSelectVehicle = null;
    this.results = null;
    this.brush = makeBrushes();
    this.scratches = rng(7);
  }
  go(screen) {
    this.screen = screen;
    this.sel = 0;
    this.t = 0;
    if (screen === 'select' && this.onSelectVehicle) this.onSelectVehicle(VEHICLES[this.vehicleIdx].id);
  }

  update(dt) {
    this.t += dt;
    const i = input;
    const nav = (n) => {
      if (i.up) {
        this.sel = (this.sel - 1 + n) % n;
        audio.ui('tick');
      }
      if (i.down) {
        this.sel = (this.sel + 1) % n;
        audio.ui('tick');
      }
    };
    switch (this.screen) {
      case 'title':
        if (i.any && this.t > 0.5) {
          audio.unlock();
          audio.music('menu');
          audio.ui('select');
          this.go('main');
        }
        break;
      case 'main': {
        const items = this.mainItems();
        nav(items.length);
        if (i.confirm) {
          audio.ui('select');
          const it = items[this.sel];
          if (it === 'ONE PLAYER') this.go('modes');
          else if (it === 'QUICK ACTION') {
            this.mode = MODES[0];
            this.vehicleIdx = Math.floor(Math.random() * VEHICLES.length);
            this.start();
          } else if (it === 'OPTIONS') this.go('options');
          else if (it === 'HOW TO PLAY') this.go('help');
        }
        break;
      }
      case 'modes':
        nav(MODES.length);
        if (i.confirm) {
          audio.ui('select');
          this.mode = MODES[this.sel];
          this.go('select');
        }
        if (i.back) {
          audio.ui('back');
          this.go('main');
        }
        break;
      case 'select':
        if (i.navLeft || i.navRight) {
          this.vehicleIdx = (this.vehicleIdx + (i.navRight ? 1 : -1) + VEHICLES.length) % VEHICLES.length;
          audio.ui('tick');
          this.t = 0;
          if (this.onSelectVehicle) this.onSelectVehicle(VEHICLES[this.vehicleIdx].id);
        }
        if (i.confirm && this.t > 0.15) {
          audio.ui('select');
          this.start();
        }
        if (i.back) {
          audio.ui('back');
          this.go('modes');
        }
        break;
      case 'options': {
        const opts = this.optionRows();
        nav(opts.length);
        const row = opts[this.sel];
        if (i.navLeft || i.navRight) {
          row.change(i.navRight ? 1 : -1);
          audio.ui('tick');
          audio.setVolume();
          saveSettings();
        }
        if (i.back || (i.confirm && row.id === 'back')) {
          audio.ui('back');
          this.go('main');
        }
        break;
      }
      case 'help':
        if (i.back || i.confirm) {
          audio.ui('back');
          this.go('main');
        }
        break;
      case 'loading':
        break;
      case 'pause': {
        const items = ['RESUME', 'RESTART', 'OPTIONS', 'QUIT TO MENU'];
        nav(items.length);
        if (i.pause || i.back) this.onResume && this.onResume();
        else if (i.confirm) {
          audio.ui('select');
          const it = items[this.sel];
          if (it === 'RESUME') this.onResume && this.onResume();
          if (it === 'RESTART') this.start();
          if (it === 'OPTIONS') this.go('pauseOptions');
          if (it === 'QUIT TO MENU') this.onQuit && this.onQuit();
        }
        break;
      }
      case 'pauseOptions': {
        const opts = this.optionRows();
        nav(opts.length);
        const row = opts[this.sel];
        if (i.navLeft || i.navRight) {
          row.change(i.navRight ? 1 : -1);
          audio.setVolume();
          saveSettings();
        }
        if (i.back || (i.confirm && row.id === 'back')) this.go('pause');
        break;
      }
      case 'results':
        if (this.t > 1.2 && i.confirm) {
          audio.ui('select');
          this.onQuit && this.onQuit();
        }
        break;
    }
  }
  mainItems() {
    return ['ONE PLAYER', 'QUICK ACTION', 'OPTIONS', 'HOW TO PLAY'];
  }
  start() {
    this.tip = TIPS[Math.floor(Math.random() * TIPS.length)];
    if (this.onStart) this.onStart({ mode: this.mode.id, modeName: this.mode.name, vehicle: VEHICLES[this.vehicleIdx].id });
  }
  optionRows() {
    const s = G.settings;
    const pct = (v) => `${Math.round(v * 100)}%`;
    return [
      { id: 'opp', label: 'OPPONENTS', value: String(s.opponents), change: (d) => (s.opponents = clamp(s.opponents + d, 1, 9)) },
      { id: 'diff', label: 'DIFFICULTY', value: ['EASY', 'NORMAL', 'TWISTED'][s.difficulty], change: (d) => (s.difficulty = clamp(s.difficulty + d, 0, 2)) },
      { id: 'vol', label: 'SOUND VOLUME', value: pct(s.volume), change: (d) => (s.volume = clamp(Math.round((s.volume + d * 0.1) * 10) / 10, 0, 1)) },
      { id: 'mus', label: 'MUSIC VOLUME', value: pct(s.music), change: (d) => (s.music = clamp(Math.round((s.music + d * 0.1) * 10) / 10, 0, 1)) },
      { id: 'q', label: 'GRAPHICS', value: ['PERFORMANCE', 'QUALITY'][s.quality], change: (d) => (s.quality = clamp(s.quality + d, 0, 1)) },
      { id: 'back', label: 'BACK', value: '', change: () => {} },
    ];
  }

  // ---------- drawing ----------
  draw() {
    const c = this.ctx;
    const W = this.hud.w, H = this.hud.h, s = this.hud.s;
    const dpr = this.hud.dpr;
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.clearRect(0, 0, W, H);
    switch (this.screen) {
      case 'title':
        this.vignette(0.55);
        this.logo(W * 0.07, H * 0.12, s * 1.15);
        if (Math.sin(this.t * 4) > -0.3) this.hud.text('CLICK OR PRESS ANY KEY', W * 0.5, H * 0.86, 22 * s, '#d8d0bc', 'center', 500);
        this.hud.text('UNOFFICIAL FAN RECREATION. TWISTED METAL IS A TRADEMARK OF SONY INTERACTIVE ENTERTAINMENT.', W * 0.5, H * 0.96, 10 * s, 'rgba(200,190,170,0.55)', 'center', 400, null);
        break;
      case 'main':
        this.vignette(0.5);
        this.logo(W * 0.06, H * 0.08, s);
        this.menuList(this.mainItems(), W * 0.07, H * 0.58, s);
        this.prompts(s, W, H, [
          ['↑↓', 'PREV/NEXT'],
          [input.hint('confirm'), 'SELECT'],
        ]);
        break;
      case 'modes': {
        this.vignette(0.6);
        this.logo(W * 0.06, H * 0.08, s * 0.7);
        this.hud.text('OFFLINE 1P MODE SELECT', W * 0.07, H * 0.47, 15 * s, '#a8a090', 'left', 500);
        this.menuList(MODES.map((m) => m.name), W * 0.07, H * 0.55, s);
        const m = MODES[this.sel];
        this.wrap(m.desc, W * 0.07, H * 0.86, 520 * s, 15 * s, '#cfc6b2');
        this.prompts(s, W, H, [
          ['↑↓', 'PREV/NEXT'],
          [input.hint('confirm'), 'SELECT'],
          [input.hint('back'), 'BACK'],
        ]);
        break;
      }
      case 'select':
        this.vehicleSelect(s, W, H);
        break;
      case 'options':
      case 'pauseOptions':
        if (this.screen === 'options') this.vignette(0.65);
        else this.dim(0.6);
        this.hud.text('OPTIONS', W * 0.07, H * 0.2, 44 * s, '#e8862a', 'left', 700);
        this.optionList(s, W, H);
        this.prompts(s, W, H, [
          ['↑↓', 'PREV/NEXT'],
          ['←→', 'CHANGE'],
          [input.hint('back'), 'BACK'],
        ]);
        break;
      case 'help':
        this.dim(0.82);
        this.help(s, W, H);
        break;
      case 'loading':
        this.loading(s, W, H);
        break;
      case 'pause':
        this.dim(0.55);
        this.hud.text('PAUSED', W * 0.07, H * 0.3, 52 * s, '#e8862a', 'left', 700);
        this.menuList(['RESUME', 'RESTART', 'OPTIONS', 'QUIT TO MENU'], W * 0.07, H * 0.45, s);
        this.controlsCard(s, W * 0.55, H * 0.25);
        break;
      case 'results':
        this.resultsCard(s, W, H);
        break;
    }
  }
  dim(a) {
    const c = this.ctx;
    c.fillStyle = `rgba(6,4,3,${a})`;
    c.fillRect(0, 0, this.hud.w, this.hud.h);
  }
  vignette(a) {
    const c = this.ctx;
    const W = this.hud.w, H = this.hud.h;
    const g = c.createRadialGradient(W * 0.6, H * 0.45, H * 0.2, W * 0.5, H * 0.5, W * 0.75);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, `rgba(0,0,0,${a})`);
    c.fillStyle = g;
    c.fillRect(0, 0, W, H);
    // left fade for menu legibility
    const l = c.createLinearGradient(0, 0, W * 0.55, 0);
    l.addColorStop(0, 'rgba(0,0,0,0.75)');
    l.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = l;
    c.fillRect(0, 0, W, H);
  }

  // scratched chrome logo
  logo(x, y, s) {
    const c = this.ctx;
    const size = 92 * s;
    c.save();
    c.font = `400 ${size}px "Black Ops One", Impact, sans-serif`;
    c.textBaseline = 'top';
    c.textAlign = 'left';
    const lines = ['TWISTED', 'METAL'];
    lines.forEach((ln, i) => {
      const ly = y + i * size * 0.9;
      const lx = x + i * size * 0.18;
      // extrusion
      for (let k = 6; k > 0; k--) {
        c.fillStyle = `rgba(20,18,16,${0.9})`;
        c.fillText(ln, lx + k * 1.2 * s, ly + k * 1.4 * s);
      }
      const g = c.createLinearGradient(0, ly, 0, ly + size);
      g.addColorStop(0, '#f2f0ea');
      g.addColorStop(0.35, '#a9a59c');
      g.addColorStop(0.5, '#5d5a55');
      g.addColorStop(0.62, '#c9c5bc');
      g.addColorStop(1, '#6d6a64');
      c.fillStyle = g;
      c.fillText(ln, lx, ly);
      c.lineWidth = 2 * s;
      c.strokeStyle = 'rgba(20,18,16,0.9)';
      c.strokeText(ln, lx, ly);
      // scratches clipped to the letters
      c.save();
      c.globalCompositeOperation = 'source-atop';
      const r = rng(3 + i);
      for (let k = 0; k < 70; k++) {
        c.strokeStyle = r() < 0.5 ? 'rgba(30,26,22,0.55)' : 'rgba(255,255,255,0.45)';
        c.lineWidth = r() * 1.5 + 0.3;
        const sx = lx + r() * size * 4.2, sy = ly + r() * size;
        c.beginPath();
        c.moveTo(sx, sy);
        c.lineTo(sx + (r() - 0.5) * 60 * s, sy + (r() - 0.5) * 14 * s);
        c.stroke();
      }
      c.restore();
    });
    // claw slash behind
    c.globalCompositeOperation = 'destination-over';
    c.strokeStyle = 'rgba(160,150,140,0.28)';
    c.lineWidth = 5 * s;
    for (let k = 0; k < 3; k++) {
      c.beginPath();
      c.moveTo(x - 10 * s, y + size * (1.55 + k * 0.16));
      c.lineTo(x + size * 3.6, y + size * (1.05 + k * 0.16));
      c.stroke();
    }
    c.restore();
  }
  menuList(items, x, y, s) {
    const c = this.ctx;
    items.forEach((it, i) => {
      const yy = y + i * 34 * s;
      const sel = i === this.sel;
      if (sel) {
        // red brush stroke behind the selected item
        c.save();
        c.globalAlpha = 0.95;
        c.drawImage(this.brush.red, x - 14 * s, yy - 15 * s, 300 * s, 30 * s);
        c.restore();
      }
      this.hud.text(it, x, yy, 24 * s, sel ? '#ffffff' : '#bdb5a3', 'left', sel ? 600 : 500, sel ? 'rgba(60,0,0,0.6)' : 'rgba(0,0,0,0.6)');
    });
  }
  optionList(s, W, H) {
    const rows = this.optionRows();
    const x = W * 0.07, y = H * 0.33;
    rows.forEach((r, i) => {
      const yy = y + i * 36 * s;
      const sel = i === this.sel;
      if (sel) this.ctx.drawImage(this.brush.red, x - 14 * s, yy - 15 * s, 520 * s, 30 * s);
      this.hud.text(r.label, x, yy, 22 * s, sel ? '#ffffff' : '#bdb5a3', 'left', 500);
      if (r.value) this.hud.text(`◂  ${r.value}  ▸`, x + 420 * s, yy, 20 * s, sel ? '#ffd23a' : '#d8d0bc', 'center', 500);
    });
  }
  prompts(s, W, H, list) {
    let x = W * 0.07;
    const y = H * 0.95;
    for (const [k, label] of list) {
      const c = this.ctx;
      c.font = `600 ${13 * s}px ${COND}`;
      const kw = c.measureText(k).width + 12 * s;
      c.fillStyle = 'rgba(220,210,190,0.15)';
      c.fillRect(x, y - 10 * s, kw, 20 * s);
      this.hud.text(k, x + kw / 2, y, 13 * s, '#e8e0cc', 'center', 600, null);
      this.hud.text(label, x + kw + 8 * s, y, 13 * s, '#a8a090', 'left', 500, null);
      x += kw + c.measureText(label).width + 40 * s;
    }
  }
  wrap(text, x, y, maxW, size, color) {
    const c = this.ctx;
    c.font = `500 ${size}px ${COND}`;
    const words = text.split(' ');
    let line = '', yy = y;
    for (const w of words) {
      const t = line ? line + ' ' + w : w;
      if (c.measureText(t).width > maxW) {
        this.hud.text(line, x, yy, size, color, 'left', 500);
        line = w;
        yy += size * 1.35;
      } else line = t;
    }
    if (line) this.hud.text(line, x, yy, size, color, 'left', 500);
  }

  vehicleSelect(s, W, H) {
    const c = this.ctx;
    const v = VEHICLES[this.vehicleIdx];
    // bottom fade + grunge frame
    const g = c.createLinearGradient(0, H * 0.55, 0, H);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, 'rgba(0,0,0,0.65)');
    c.fillStyle = g;
    c.fillRect(0, 0, W, H);
    c.strokeStyle = 'rgba(40,30,24,0.9)';
    c.lineWidth = 16 * s;
    c.strokeRect(0, 0, W, H);
    // stat wheel (top right)
    const cx = W - 140 * s, cy = 120 * s, R = 62 * s;
    c.save();
    c.fillStyle = 'rgba(10,8,6,0.75)';
    c.beginPath();
    c.arc(cx, cy, R + 8 * s, 0, Math.PI * 2);
    c.fill();
    c.strokeStyle = '#8a1a14';
    c.lineWidth = 3 * s;
    c.stroke();
    const wedges = [
      ['speed', -Math.PI * 0.5 - (Math.PI * 2) / 3, -Math.PI * 0.5],
      ['armor', -Math.PI * 0.5, -Math.PI * 0.5 + (Math.PI * 2) / 3],
      ['special', -Math.PI * 0.5 + (Math.PI * 2) / 3, -Math.PI * 0.5 + (Math.PI * 4) / 3],
    ];
    const anim = clamp(this.t * 3, 0, 1);
    for (const [k, a0, a1] of wedges) {
      const rr = (R * (0.25 + 0.75 * (v.rating[k] / 5))) * anim;
      c.fillStyle = '#c8261c';
      c.beginPath();
      c.moveTo(cx, cy);
      c.arc(cx, cy, rr, a0 + 0.04, a1 - 0.04);
      c.closePath();
      c.fill();
      // ring guides
      c.strokeStyle = 'rgba(200,180,160,0.18)';
      c.lineWidth = 1;
      for (let i = 1; i <= 5; i++) {
        c.beginPath();
        c.arc(cx, cy, R * (0.25 + 0.15 * i), a0 + 0.04, a1 - 0.04);
        c.stroke();
      }
    }
    c.restore();
    c.save();
    c.translate(cx, cy);
    const lbl = (t, a) => {
      c.save();
      c.rotate(a);
      this.hud.text(t, 0, -R - 18 * s, 13 * s, '#e8e0cc', 'center', 600, 'rgba(0,0,0,0.8)');
      c.restore();
    };
    lbl('SPEED', -0.75);
    lbl('ARMOR', 0.75);
    c.restore();
    this.hud.text('SPECIAL', cx, cy + R + 22 * s, 12 * s, '#e8e0cc', 'center', 600);
    this.hud.text('SPECIAL WEAPONS', cx, cy + R + 48 * s, 16 * s, '#e8e0cc', 'center', 600);
    v.specialsText.forEach((t, i) => this.hud.text(t, cx, cy + R + 70 * s + i * 20 * s, 15 * s, '#cfc6b2', 'center', 500));
    // stats line
    this.hud.text(`HEALTH ${v.hp}   SPEED ${v.mph[0]}/${v.mph[1]} MPH`, cx, cy + R + 120 * s, 12 * s, '#a8a090', 'center', 500);
    // name banner (bottom right)
    const bw = 430 * s, bh = 92 * s;
    const bx = W - bw - 60 * s, by = H - bh - 80 * s;
    c.drawImage(this.brush.banner, bx, by, bw, bh);
    c.drawImage(this.brush.red, bx + 40 * s, by - 26 * s, bw - 80 * s, 30 * s);
    this.hud.text(this.mode.id === 'dm' ? 'Select Main Vehicle' : 'Select Vehicle', bx + bw / 2, by - 11 * s, 17 * s, '#ffffff', 'center', 600, 'rgba(60,0,0,0.7)');
    const font = NAME_FONTS[v.id] || '"Black Ops One", Impact, sans-serif';
    const pop = 1 + Math.max(0, 0.15 - this.t) * 2;
    c.save();
    c.translate(bx + bw / 2, by + bh / 2 + 4 * s);
    c.scale(pop, pop);
    this.hud.text(v.name.toUpperCase(), 0, 0, 50 * s, '#f6e7c8', 'center', 400, 'rgba(60,8,4,0.95)', font);
    c.restore();
    // arrows
    c.fillStyle = '#e8e0cc';
    for (const d of [-1, 1]) {
      const ax = d < 0 ? bx + 18 * s : bx + bw - 18 * s, ay = by + bh / 2;
      c.beginPath();
      c.moveTo(ax + d * 10 * s, ay);
      c.lineTo(ax - d * 6 * s, ay - 12 * s);
      c.lineTo(ax - d * 6 * s, ay + 12 * s);
      c.closePath();
      c.fill();
    }
    this.hud.text(`DRIVER: ${v.driver.toUpperCase()}`, bx + bw / 2, by + bh + 14 * s, 12 * s, '#a8a090', 'center', 500);
    this.hud.text(`${this.vehicleIdx + 1} / ${VEHICLES.length}`, 40 * s, 40 * s, 14 * s, '#a8a090', 'left', 500);
    this.hud.text(this.mode.name, 40 * s, 62 * s, 20 * s, '#e8862a', 'left', 700);
    this.prompts(s, W, H, [
      [input.hint('nav'), 'PREV/NEXT'],
      [input.hint('confirm'), 'SELECT'],
      [input.hint('back'), 'BACK'],
    ]);
  }

  loading(s, W, H) {
    const c = this.ctx;
    c.fillStyle = '#0a0706';
    c.fillRect(0, 0, W, H);
    // backdrop: rendered town shot, tinted
    if (this.backdrop) {
      c.globalAlpha = 0.75;
      const iw = this.backdrop.width, ih = this.backdrop.height;
      const sc = Math.max(W / iw, H / ih);
      c.drawImage(this.backdrop, (W - iw * sc) / 2, (H - ih * sc) / 2, iw * sc, ih * sc);
      c.globalAlpha = 1;
      c.fillStyle = 'rgba(40,6,4,0.45)';
      c.fillRect(0, 0, W, H);
    }
    // blood splatter band behind the logo
    c.drawImage(this.brush.splat, W * 0.12, H * 0.06, W * 0.76, H * 0.36);
    // map logo: "Sunsprings" + "CALIFORNIA"
    c.save();
    c.translate(W / 2, H * 0.2);
    c.rotate(-0.03);
    this.hud.text('Sunsprings', 0, 0, 84 * s, '#f2c24a', 'center', 400, 'rgba(70,10,0,0.95)', 'Rye, serif');
    this.hud.text('C A L I F O R N I A', 0, 54 * s, 24 * s, '#f6ead0', 'center', 600, 'rgba(70,10,0,0.9)');
    // sun burst above the S
    c.strokeStyle = '#f2c24a';
    c.lineWidth = 3 * s;
    for (let i = 0; i < 9; i++) {
      const a = -Math.PI + (i / 8) * Math.PI;
      c.beginPath();
      c.moveTo(-150 * s + Math.cos(a) * 26 * s, -54 * s + Math.sin(a) * 26 * s);
      c.lineTo(-150 * s + Math.cos(a) * 40 * s, -54 * s + Math.sin(a) * 40 * s);
      c.stroke();
    }
    c.restore();
    // tip box
    const tw = 640 * s;
    c.fillStyle = 'rgba(8,4,3,0.75)';
    c.fillRect(W / 2 - tw / 2, H * 0.62, tw, 80 * s);
    this.hud.text('TWISTED TIPS', W / 2, H * 0.62 + 18 * s, 16 * s, '#e8241c', 'center', 600);
    this.hud.text(this.tip, W / 2, H * 0.62 + 50 * s, 16 * s, '#e8241c', 'center', 500);
    this.hud.text(this.mode.name, W / 2, H * 0.55, 22 * s, '#efe6d0', 'center', 600);
    // spinner
    c.save();
    c.translate(36 * s, H - 36 * s);
    c.rotate(this.t * 5);
    c.strokeStyle = '#d8d0bc';
    c.lineWidth = 3 * s;
    c.beginPath();
    c.arc(0, 0, 12 * s, 0, Math.PI * 1.5);
    c.stroke();
    c.restore();
    if (this.loadText) this.hud.text(this.loadText, 60 * s, H - 36 * s, 13 * s, '#a8a090', 'left', 500);
  }

  help(s, W, H) {
    this.hud.text('HOW TO PLAY', W * 0.07, H * 0.12, 44 * s, '#e8862a', 'left', 700);
    this.controlsCard(s, W * 0.07, H * 0.2);
    const lines = [
      'Destroy every other vehicle in Sunsprings, California.',
      'Pick up weapons from the glowing icons. Green crosses repair you.',
      'Your special weapon (S) recharges over time. Each car has its own,',
      'plus an alternate special on the alt-fire button.',
      'Energy (blue bar) powers freeze, shield and mines. Turbo (yellow) recharges slowly.',
      "Drive into Bruner's Foodsource for the garage health bay.",
    ];
    lines.forEach((l, i) => this.hud.text(l, W * 0.52, H * 0.24 + i * 28 * s, 15 * s, '#d8d0bc', 'left', 500));
    this.prompts(s, W, H, [[input.hint('back'), 'BACK']]);
  }
  controlsCard(s, x, y) {
    const rows = [
      ['W / ↑', 'Gas'],
      ['S / ↓', 'Brake / reverse'],
      ['A D / ← →', 'Steer'],
      ['SHIFT', 'Turbo'],
      ['SPACE', 'Tight turn (handbrake)'],
      ['J / LEFT MOUSE', 'Machine gun'],
      ['K / RIGHT MOUSE', 'Fire weapon (hold to charge)'],
      ['Q / E', 'Cycle weapons'],
      ['L', 'Alternate special'],
      ['C', 'Jump'],
      ['1  2  3', 'Freeze  Shield  Drop mine'],
      ['R (hold)', 'Rear fire'],
      ['V (hold)', 'Look back'],
      ['TAB', 'Scoreboard'],
      ['ESC / P', 'Pause'],
      ['M', 'Mute'],
    ];
    rows.forEach(([k, a], i) => {
      this.hud.text(k, x, y + i * 24 * s, 14 * s, '#ffd23a', 'left', 600);
      this.hud.text(a, x + 170 * s, y + i * 24 * s, 14 * s, '#d8d0bc', 'left', 500);
    });
    this.hud.text('Gamepad: PS-style layout (X gas, □ brake, L2 MG, R2 fire, L1/R1 cycle, D-pad energy, △ alt).', x, y + rows.length * 24 * s + 8 * s, 12 * s, '#a8a090', 'left', 400);
  }
  resultsCard(s, W, H) {
    const r = this.results;
    if (!r) return;
    const c = this.ctx;
    const pw = 470 * s, ph = 240 * s;
    const x = W / 2 - pw / 2, y = H * 0.52;
    c.fillStyle = 'rgba(14,10,8,0.85)';
    c.fillRect(x, y, pw, ph);
    c.drawImage(this.brush.red, x - 4 * s, y - 4 * s, pw + 8 * s, 40 * s);
    this.hud.text(`${r.modeName} - Sunsprings, CA`, W / 2, y + 16 * s, 18 * s, '#ffffff', 'center', 600, 'rgba(60,0,0,0.8)');
    this.hud.text(r.win ? 'VICTORY' : 'DEFEATED', W / 2, y + 62 * s, 34 * s, r.win ? '#f2c24a' : '#c8261c', 'center', 700);
    const rows = [
      ['Finish Time', r.time],
      ['Kills', String(r.kills)],
      ['Deaths', String(r.deaths)],
      ['Place', r.place],
    ];
    rows.forEach(([a, b], i) => {
      this.hud.text(a, x + 120 * s, y + (104 + i * 26) * s, 15 * s, '#cfc6b2', 'left', 500);
      this.hud.text(b, x + pw - 120 * s, y + (104 + i * 26) * s, 15 * s, '#ffffff', 'right', 600);
    });
    if (this.t > 1.2) this.prompts(s, W, H, [[input.hint('confirm'), 'CONTINUE']]);
  }
}

const NAME_FONTS = {
  sweettooth: 'Rye, serif',
  meatwagon: 'Rye, serif',
  kamikaze: '"Black Ops One", Impact, sans-serif',
  reaper: '"Pirata One", serif',
  shadow: '"Pirata One", serif',
  vermin: 'Rye, serif',
  junkyarddog: 'Rye, serif',
};

// pre-rendered brush stroke images (red highlight, name banner, blood splatter)
function makeBrushes() {
  const mk = (w, h, fn) => {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    fn(c.getContext('2d'), w, h);
    return c;
  };
  const r = rng(12);
  const stroke = (x, w, h, color, rough) => {
    x.fillStyle = color;
    x.beginPath();
    x.moveTo(0, h * 0.25);
    for (let i = 0; i <= 40; i++) x.lineTo((i / 40) * w, h * (0.12 + r() * rough));
    for (let i = 40; i >= 0; i--) x.lineTo((i / 40) * w, h * (0.88 - r() * rough));
    x.closePath();
    x.fill();
    // bristle streaks
    for (let i = 0; i < 40; i++) {
      x.fillStyle = r() < 0.5 ? 'rgba(0,0,0,0.18)' : 'rgba(255,120,100,0.12)';
      x.fillRect(r() * w * 0.2, h * (0.15 + r() * 0.7), w * (0.4 + r() * 0.6), 1 + r() * 2);
    }
  };
  return {
    red: mk(600, 60, (x, w, h) => stroke(x, w, h, '#b8221a', 0.18)),
    banner: mk(860, 184, (x, w, h) => {
      stroke(x, w, h, '#a81c14', 0.12);
      x.globalCompositeOperation = 'source-atop';
      const g = x.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, 'rgba(255,255,255,0.15)');
      g.addColorStop(1, 'rgba(0,0,0,0.35)');
      x.fillStyle = g;
      x.fillRect(0, 0, w, h);
    }),
    splat: mk(900, 420, (x, w, h) => {
      for (let i = 0; i < 260; i++) {
        const cx = w * (0.1 + r() * 0.8), cy = h * (0.25 + r() * 0.5);
        const rad = 3 + r() * r() * 46;
        x.fillStyle = `rgba(${120 + r() * 60},${8 + r() * 14},${6 + r() * 10},${0.5 + r() * 0.5})`;
        x.beginPath();
        x.ellipse(cx, cy, rad * (1 + r() * 2.5), rad, (r() - 0.5) * 0.4, 0, Math.PI * 2);
        x.fill();
      }
      for (let i = 0; i < 40; i++) {
        x.fillStyle = 'rgba(140,14,10,0.8)';
        x.fillRect(w * (0.15 + r() * 0.7), h * (0.5 + r() * 0.2), 2 + r() * 3, r() * h * 0.35);
      }
    }),
  };
}
