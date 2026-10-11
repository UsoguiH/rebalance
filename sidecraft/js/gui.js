// Menu GUI drawn on the canvas in the classic layout: stone buttons, sliders,
// text fields, dirt backgrounds, and every menu screen (title, world select,
// world creation, pause, death, options, sound, video, controls, statistics,
// chat). Coordinates are in GUI pixels; GUI.gs is the GUI scale.
(function () {
  const SC = window.SC;
  const F = SC.font;
  const GUI = (SC.gui = { screen: null, gs: 2, W: 320, H: 240, mx: 0, my: 0, t: 0 });
  const game = () => SC.game;
  const click = () => SC.audio && SC.audio.play('click');
  const GRAY = '#A0A0A0';

  // ---------- options and key bindings ----------
  const DEF_KEYS = {
    jump: 'Space', sneak: 'ShiftLeft', sprint: 'ControlLeft', left: 'KeyA', right: 'KeyD', up: 'KeyW', down: 'KeyS',
    attack: 'Mouse0', use: 'Mouse2', pick: 'Mouse1',
    drop: 'KeyQ', inventory: 'KeyE', swap: 'KeyF',
    hot1: 'Digit1', hot2: 'Digit2', hot3: 'Digit3', hot4: 'Digit4', hot5: 'Digit5', hot6: 'Digit6', hot7: 'Digit7', hot8: 'Digit8', hot9: 'Digit9',
    chat: 'KeyT', command: 'Slash', screenshot: 'F2', zoomIn: 'Equal', zoomOut: 'Minus',
  };
  SC.KEY_LIST = [
    ['Movement', [['jump', 'Jump'], ['sneak', 'Sneak'], ['sprint', 'Sprint'], ['left', 'Walk Left'], ['right', 'Walk Right'], ['up', 'Climb Up'], ['down', 'Climb Down']]],
    ['Gameplay', [['attack', 'Attack/Destroy'], ['pick', 'Pick Block'], ['use', 'Use Item/Place Block']]],
    ['Inventory', [['drop', 'Drop Selected Item'], ['inventory', 'Open/Close Inventory'], ['swap', 'Swap Item With Offhand'], ...[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => ['hot' + n, 'Hotbar Slot ' + n])]],
    ['Multiplayer', [['chat', 'Open Chat'], ['command', 'Open Command']]],
    ['Miscellaneous', [['screenshot', 'Take Screenshot'], ['zoomIn', 'Zoom In'], ['zoomOut', 'Zoom Out']]],
  ];
  const DEF_OPTS = {
    guiScale: 0, zoom: 0, smooth: true, brightness: 0.5, clouds: true, graphics: 'fancy', particles: 0, fullscreen: false,
    master: 1, music: 1, blocks: 1, hostile: 1, friendly: 1, players: 1, autoJump: true, chat: true, chatBg: 0.5,
  };
  let saved = {};
  try {
    saved = JSON.parse(localStorage.getItem('sidecraft.options') || '{}') || {};
  } catch (e) {
    saved = {};
  }
  SC.options = Object.assign({}, DEF_OPTS, saved);
  SC.options.keys = Object.assign({}, DEF_KEYS, saved.keys || {});
  SC.DEF_KEYS = DEF_KEYS;
  SC.saveOptions = () => {
    try {
      localStorage.setItem('sidecraft.options', JSON.stringify(SC.options));
    } catch (e) {}
    if (SC.audio && SC.audio.applyVolumes) SC.audio.applyVolumes();
  };
  const KEYNAMES = {
    Space: 'Space', ShiftLeft: 'Left Shift', ShiftRight: 'Right Shift', ControlLeft: 'Left Control', ControlRight: 'Right Control',
    AltLeft: 'Left Alt', AltRight: 'Right Alt', Mouse0: 'Left Button', Mouse1: 'Middle Button', Mouse2: 'Right Button',
    Mouse3: 'Button 4', Mouse4: 'Button 5', Enter: 'Enter', Tab: 'Tab', Backspace: 'Backspace', CapsLock: 'Caps Lock',
    ArrowUp: 'Up', ArrowDown: 'Down', ArrowLeft: 'Left', ArrowRight: 'Right', Slash: '/', Equal: '=', Minus: '-',
    Backquote: '`', BracketLeft: '[', BracketRight: ']', Semicolon: ';', Quote: "'", Comma: ',', Period: '.', Backslash: '\\',
  };
  SC.keyName = (code) => {
    if (!code) return 'Not bound';
    if (KEYNAMES[code]) return KEYNAMES[code];
    if (/^Key[A-Z]$/.test(code)) return code.slice(3);
    if (/^Digit\d$/.test(code)) return code.slice(5);
    if (/^Numpad/.test(code)) return 'Keypad ' + code.slice(6);
    return code;
  };
  SC.key = (a) => !!SC.input.down[SC.options.keys[a]];
  SC.keyPressed = (a) => !!SC.input.pressed[SC.options.keys[a]];
  SC.keyDouble = (a) => !!SC.input.doubleTap[SC.options.keys[a]];

  // ---------- scale ----------
  GUI.maxScale = () => {
    const cv = SC.renderer.cv;
    return Math.max(1, Math.floor(Math.min(cv.width / 320, cv.height / 240)));
  };
  GUI.metrics = () => {
    const cv = SC.renderer.cv;
    const auto = GUI.maxScale();
    GUI.gs = SC.options.guiScale ? Math.min(SC.options.guiScale, auto) : auto;
    GUI.W = Math.ceil(cv.width / GUI.gs);
    GUI.H = Math.ceil(cv.height / GUI.gs);
    GUI.mx = SC.input.mx / GUI.gs;
    GUI.my = SC.input.my / GUI.gs;
  };

  // ---------- textures ----------
  const TEX = {};
  function canvas(w, h) {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    return c;
  }
  function buttonTex(state) {
    // state 0 normal, 1 hovered, 2 disabled
    const c = canvas(200, 20);
    const g = c.getContext('2d');
    const r = SC.rng(31 + state);
    const face = state === 1 ? [126, 136, 191] : state === 2 ? [44, 44, 44] : [111, 111, 111];
    for (let y = 0; y < 20; y++)
      for (let x = 0; x < 200; x++) {
        const f = state === 2 ? 1 : 0.94 + r() * 0.12;
        g.fillStyle = SC.rgb(face, f);
        g.fillRect(x, y, 1, 1);
      }
    if (state !== 2) {
      const hi = state === 1 ? [168, 178, 230] : [170, 170, 170];
      const lo = state === 1 ? [80, 88, 140] : [86, 86, 86];
      g.fillStyle = SC.rgb(hi);
      g.fillRect(1, 1, 198, 1);
      g.fillRect(1, 1, 1, 17);
      g.fillStyle = SC.rgb(lo);
      g.fillRect(1, 17, 198, 2);
      g.fillRect(198, 2, 1, 16);
    }
    g.fillStyle = state === 1 ? '#FFFFFF' : '#000000';
    g.fillRect(0, 0, 200, 1);
    g.fillRect(0, 19, 200, 1);
    g.fillRect(0, 0, 1, 20);
    g.fillRect(199, 0, 1, 20);
    return c;
  }
  function dirtTile(f) {
    const c = canvas(32, 32);
    const g = c.getContext('2d');
    g.imageSmoothingEnabled = false;
    g.drawImage(SC.tex[SC.B.DIRT], 0, 0, 32, 32);
    g.fillStyle = `rgba(0,0,0,${1 - f})`;
    g.fillRect(0, 0, 32, 32);
    return c;
  }
  GUI.init = () => {
    TEX.btn = [buttonTex(0), buttonTex(1), buttonTex(2)];
    TEX.dirt = dirtTile(0.25);
    TEX.dirtDark = dirtTile(0.125);
    TEX.logo = makeLogo();
  };

  function makeLogo() {
    const word = 'SIDECRAFT';
    const B = 5, depth = 3;
    let cols = 0;
    for (const ch of word) cols += F.glyphs[ch].w + 1;
    cols -= 1;
    const W = cols * B + depth * 2 + 4, H = 7 * B + depth * 2 + 4;
    const c = canvas(W, H);
    const g = c.getContext('2d');
    g.imageSmoothingEnabled = false;
    const cells = [];
    let ox = 0;
    for (const ch of word) {
      const gl = F.glyphs[ch];
      for (let k = 0; k < gl.px.length; k += 2) cells.push([ox + gl.px[k], gl.px[k + 1]]);
      ox += gl.w + 1;
    }
    const stone = SC.tex[SC.B.STONE];
    const at = (x, y) => [2 + x * B, 2 + y * B];
    // black outline and extruded depth
    for (const [x, y] of cells) {
      const [px, py] = at(x, y);
      g.fillStyle = '#000';
      g.fillRect(px - 1, py - 1, B + 2 + depth, B + 2 + depth);
    }
    for (let d = depth; d >= 1; d--)
      for (const [x, y] of cells) {
        const [px, py] = at(x, y);
        g.fillStyle = d === depth ? '#2e2e2e' : '#4a4a4a';
        g.fillRect(px + d, py + d, B, B);
      }
    for (const [x, y] of cells) {
      const [px, py] = at(x, y);
      g.drawImage(stone, (x * 5) % 11, (y * 5) % 11, B, B, px, py, B, B);
      g.fillStyle = 'rgba(255,255,255,0.35)';
      g.fillRect(px, py, B, 1);
      g.fillRect(px, py, 1, B);
      g.fillStyle = 'rgba(0,0,0,0.3)';
      g.fillRect(px, py + B - 1, B, 1);
      g.fillRect(px + B - 1, py, 1, B);
    }
    return c;
  }

  GUI.drawButtonTex = (ctx, x, y, w, h, state) => {
    const t = TEX.btn[state];
    const hw = Math.floor(w / 2), rw = w - hw;
    const hh = Math.min(h, 20);
    ctx.drawImage(t, 0, 0, hw, hh - 2, x, y, hw, hh - 2);
    ctx.drawImage(t, 200 - rw, 0, rw, hh - 2, x + hw, y, rw, hh - 2);
    ctx.drawImage(t, 0, 18, hw, 2, x, y + hh - 2, hw, 2);
    ctx.drawImage(t, 200 - rw, 18, rw, 2, x + hw, y + hh - 2, rw, 2);
  };
  GUI.dirt = (ctx, x, y, w, h, dark) => {
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.clip();
    const t = dark ? TEX.dirtDark : TEX.dirt;
    for (let yy = Math.floor(y / 32) * 32; yy < y + h; yy += 32) for (let xx = Math.floor(x / 32) * 32; xx < x + w; xx += 32) ctx.drawImage(t, xx, yy);
    ctx.restore();
  };
  GUI.dim = (ctx) => {
    const grd = ctx.createLinearGradient(0, 0, 0, GUI.H);
    grd.addColorStop(0, 'rgba(16,16,16,0.75)');
    grd.addColorStop(1, 'rgba(16,16,16,0.82)');
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, GUI.W, GUI.H);
  };
  // the darker inset used behind lists
  GUI.listBg = (ctx, top, bottom) => {
    GUI.dirt(ctx, 0, 0, GUI.W, GUI.H);
    GUI.dirt(ctx, 0, top, GUI.W, bottom - top, true);
    let grd = ctx.createLinearGradient(0, top, 0, top + 4);
    grd.addColorStop(0, 'rgba(0,0,0,1)');
    grd.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grd;
    ctx.fillRect(0, top, GUI.W, 4);
    grd = ctx.createLinearGradient(0, bottom - 4, 0, bottom);
    grd.addColorStop(0, 'rgba(0,0,0,0)');
    grd.addColorStop(1, 'rgba(0,0,0,1)');
    ctx.fillStyle = grd;
    ctx.fillRect(0, bottom - 4, GUI.W, 4);
  };

  // ---------- widgets ----------
  class Button {
    constructor(x, y, w, label, onPress, o = {}) {
      Object.assign(this, { x, y, w, h: o.h || 20, label, onPress, active: o.active !== false, icon: o.icon });
    }
    text() {
      return typeof this.label === 'function' ? this.label() : this.label;
    }
    hover(mx, my) {
      return mx >= this.x && my >= this.y && mx < this.x + this.w && my < this.y + this.h;
    }
    draw(ctx, mx, my) {
      const hov = this.active && this.hover(mx, my);
      GUI.drawButtonTex(ctx, this.x, this.y, this.w, this.h, !this.active ? 2 : hov ? 1 : 0);
      if (this.icon) this.icon(ctx, this.x, this.y, this.active);
      else F.center(ctx, this.text(), this.x + this.w / 2, this.y + (this.h - 8) / 2, !this.active ? GRAY : hov ? '#FFFFA0' : '#E0E0E0');
    }
    mouseDown(mx, my, b) {
      if (b !== 0 || !this.active || !this.hover(mx, my)) return false;
      click();
      if (this.onPress) this.onPress(this);
      return true;
    }
  }
  class Slider extends Button {
    constructor(x, y, w, get, set, label) {
      super(x, y, w, label, null);
      this.get = get;
      this.set = set;
      this.drag = false;
    }
    draw(ctx, mx, my) {
      if (this.drag) {
        if (!SC.input.lmb) {
          this.drag = false;
          click();
        } else this.update(mx);
      }
      GUI.drawButtonTex(ctx, this.x, this.y, this.w, this.h, 2);
      const hov = this.hover(mx, my) || this.drag;
      const kx = this.x + Math.round(this.get() * (this.w - 8));
      GUI.drawButtonTex(ctx, kx, this.y, 8, this.h, hov ? 1 : 0);
      F.center(ctx, this.text(), this.x + this.w / 2, this.y + 6, hov ? '#FFFFA0' : '#E0E0E0');
    }
    update(mx) {
      this.set(SC.clamp((mx - this.x - 4) / (this.w - 8), 0, 1));
    }
    mouseDown(mx, my, b) {
      if (b !== 0 || !this.hover(mx, my)) return false;
      this.drag = true;
      this.update(mx);
      return true;
    }
  }
  class TextField {
    constructor(x, y, w, value = '', o = {}) {
      Object.assign(this, { x, y, w, h: o.h || 20, value, focused: false, max: o.max || 32, onEnter: o.onEnter, onChange: o.onChange, cursor: value.length, hint: o.hint || '' });
    }
    hover(mx, my) {
      return mx >= this.x && my >= this.y && mx < this.x + this.w && my < this.y + this.h;
    }
    draw(ctx) {
      ctx.fillStyle = this.focused ? '#FFFFFF' : GRAY;
      ctx.fillRect(this.x - 1, this.y - 1, this.w + 2, this.h + 2);
      ctx.fillStyle = '#000';
      ctx.fillRect(this.x, this.y, this.w, this.h);
      const ty = this.y + (this.h - 8) / 2;
      let shown = this.value;
      let start = 0;
      while (F.width(shown.slice(start)) > this.w - 10) start++;
      shown = shown.slice(start);
      if (!this.value && this.hint && !this.focused) F.draw(ctx, this.hint, this.x + 4, ty, '#707070');
      F.draw(ctx, shown, this.x + 4, ty, '#E0E0E0');
      if (this.focused && Math.floor(GUI.t * 3) % 2 === 0) {
        const cx = this.x + 4 + F.width(this.value.slice(start, this.cursor)) + (this.cursor > start ? 1 : 0);
        if (this.cursor >= this.value.length) F.draw(ctx, '_', cx, ty, '#E0E0E0');
        else {
          ctx.fillStyle = '#D0D0D0';
          ctx.fillRect(cx, ty - 1, 1, 10);
        }
      }
    }
    mouseDown(mx, my) {
      this.focused = this.hover(mx, my);
      if (this.focused) this.cursor = this.value.length;
      return this.focused;
    }
    insert(t) {
      t = t.replace(/[\u0000-\u001f§]/g, '');
      const v = (this.value.slice(0, this.cursor) + t + this.value.slice(this.cursor)).slice(0, this.max);
      this.cursor = Math.min(v.length, this.cursor + t.length);
      this.value = v;
      if (this.onChange) this.onChange(v);
    }
    key(e) {
      if (!this.focused) return false;
      const k = e.key;
      if (k === 'Backspace') {
        if (this.cursor > 0) {
          this.value = this.value.slice(0, this.cursor - 1) + this.value.slice(this.cursor);
          this.cursor--;
          if (this.onChange) this.onChange(this.value);
        }
      } else if (k === 'Delete') {
        this.value = this.value.slice(0, this.cursor) + this.value.slice(this.cursor + 1);
        if (this.onChange) this.onChange(this.value);
      } else if (k === 'ArrowLeft') this.cursor = Math.max(0, this.cursor - 1);
      else if (k === 'ArrowRight') this.cursor = Math.min(this.value.length, this.cursor + 1);
      else if (k === 'Home') this.cursor = 0;
      else if (k === 'End') this.cursor = this.value.length;
      else if (k === 'Enter') {
        if (this.onEnter) this.onEnter(this.value);
      } else if (k.length === 1 && !e.ctrlKey && !e.metaKey) this.insert(k);
      else if ((e.ctrlKey || e.metaKey) && k.toLowerCase() === 'a') this.cursor = this.value.length;
      else return k !== 'Escape' && k !== 'Tab';
      return true;
    }
  }
  GUI.Button = Button;
  GUI.Slider = Slider;
  GUI.TextField = TextField;

  // ---------- screens ----------
  class Screen {
    constructor(parent) {
      this.parent = parent || null;
      this.widgets = [];
      this.pause = true;
      this.bg = 'auto';
    }
    rebuild() {
      this.widgets = [];
      this.init();
    }
    init() {}
    add(w) {
      this.widgets.push(w);
      return w;
    }
    background(ctx) {
      const inGame = game().state !== 'title';
      if (this.bg === 'dirt' || (this.bg === 'auto' && !inGame)) GUI.dirt(ctx, 0, 0, GUI.W, GUI.H);
      else if (this.bg !== 'none') GUI.dim(ctx);
    }
    draw(ctx) {
      this.background(ctx);
      this.drawContent(ctx);
      for (const w of this.widgets) w.draw(ctx, GUI.mx, GUI.my);
      this.drawOver(ctx);
    }
    drawContent() {}
    drawOver() {}
    mouseDown(mx, my, b) {
      for (const w of this.widgets) if (w instanceof TextField) w.mouseDown(mx, my);
      for (const w of this.widgets) if (!(w instanceof TextField) && w.mouseDown(mx, my, b)) return true;
      return false;
    }
    wheel() {}
    key(e) {
      for (const w of this.widgets) if (w instanceof TextField && w.key(e)) return true;
      if (e.key === 'Tab') {
        const tfs = this.widgets.filter((w) => w instanceof TextField);
        if (tfs.length) {
          const i = tfs.findIndex((t) => t.focused);
          tfs.forEach((t) => (t.focused = false));
          tfs[(i + 1) % tfs.length].focused = true;
        }
        return true;
      }
      if (e.key === 'Escape') {
        this.back();
        return true;
      }
      return false;
    }
    back() {
      GUI.open(this.parent);
    }
    tick() {}
  }
  GUI.Screen = Screen;

  GUI.open = (s) => {
    GUI.screen = s || null;
    SC.input.down = {};
    SC.input.lmb = SC.input.rmb = false;
    if (s) {
      GUI.metrics();
      s.rebuild();
      GUI.lastSize = GUI.W + 'x' + GUI.H;
    }
    const cv = SC.renderer && SC.renderer.cv;
    if (cv) cv.style.cursor = s || game().ui || game().state !== 'play' ? 'default' : 'none';
  };

  GUI.draw = (ctx) => {
    if (!GUI.screen) return;
    if (GUI.lastSize !== GUI.W + 'x' + GUI.H) {
      GUI.lastSize = GUI.W + 'x' + GUI.H;
      GUI.screen.rebuild();
    }
    ctx.save();
    ctx.scale(GUI.gs, GUI.gs);
    ctx.imageSmoothingEnabled = false;
    GUI.screen.draw(ctx);
    ctx.restore();
  };
  GUI.keyDown = (e) => {
    if (!GUI.screen) return false;
    GUI.screen.key(e);
    return true;
  };
  GUI.mouseDown = (x, y, b) => {
    if (!GUI.screen) return false;
    GUI.metrics();
    GUI.screen.mouseDown(x / GUI.gs, y / GUI.gs, b);
    return true;
  };
  GUI.wheel = (d) => {
    if (!GUI.screen) return false;
    GUI.screen.wheel(d);
    return true;
  };
  GUI.paste = (text) => {
    const s = GUI.screen;
    if (!s) return;
    const tf = s.widgets.find((w) => w instanceof TextField && w.focused);
    if (tf) tf.insert(text);
  };

  // ---------- title ----------
  const SPLASHES = [
    'Now in 2D!', 'Sideways!', 'Also try Terraria!', 'Punch the tree!', '100% blocks!', 'Creepers included!', 'Flat, but deep!',
    'Tall grass is tall!', 'Ssssss...', 'Made with canvas!', 'No textures were harmed!', 'Pixel perfect!', 'One dimension short!',
    'Diamonds below!', 'Look sideways!', 'Synthesized sounds!', 'Hello, world!',
  ];
  class TitleScreen extends Screen {
    constructor() {
      super(null);
      this.bg = 'none';
      this.splash = SPLASHES[(Math.random() * SPLASHES.length) | 0];
    }
    init() {
      const { W, H } = GUI;
      const j = Math.floor(H / 4) + 48;
      this.add(new Button(W / 2 - 100, j, 200, 'Singleplayer', () => GUI.open(game().worldList().length ? new SelectWorldScreen(this) : new CreateWorldScreen(this))));
      this.add(new Button(W / 2 - 100, j + 24, 200, 'Multiplayer', null, { active: false }));
      this.add(new Button(W / 2 - 100, j + 48, 200, 'How to Play', () => GUI.open(new HelpScreen(this))));
      this.add(new Button(W / 2 - 124, j + 84, 20, '', null, { active: false, icon: globeIcon }));
      this.add(new Button(W / 2 - 100, j + 84, 98, 'Options...', () => GUI.open(new OptionsScreen(this))));
      this.add(new Button(W / 2 + 2, j + 84, 98, 'Quit Game', () => {
        game().save();
        window.close();
        setTimeout(() => (this.splash = 'Close the tab to quit!'), 150);
      }));
      this.add(new Button(W / 2 + 104, j + 84, 20, '', null, { active: false, icon: personIcon }));
    }
    background(ctx) {
      // the world pans behind; darken the edges a touch
      const grd = ctx.createLinearGradient(0, 0, 0, GUI.H);
      grd.addColorStop(0, 'rgba(0,0,0,0.15)');
      grd.addColorStop(1, 'rgba(0,0,0,0.35)');
      ctx.fillStyle = grd;
      ctx.fillRect(0, 0, GUI.W, GUI.H);
    }
    drawContent(ctx) {
      const { W, H } = GUI;
      const logo = TEX.logo;
      const lw = Math.min(274, W - 20);
      const lh = Math.round((logo.height / logo.width) * lw);
      ctx.drawImage(logo, Math.round(W / 2 - lw / 2), 30, lw, lh);
      ctx.save();
      ctx.translate(W / 2 + lw / 2 - 30, 30 + lh - 4);
      ctx.rotate(-0.35);
      const sc = (1.8 - Math.abs(Math.sin((performance.now() % 1000) / 1000 * Math.PI * 2) * 0.1)) * 100 / (F.width(this.splash) + 32);
      ctx.scale(sc, sc);
      F.center(ctx, this.splash, 0, -8, '#FFFF00');
      ctx.restore();
      F.draw(ctx, 'Sidecraft 1.0', 2, H - 10, '#FFFFFF');
      F.right(ctx, 'Fan-made tribute. Not affiliated with Mojang.', W - 2, H - 10, '#FFFFFF');
    }
    key() {
      return true;
    }
  }
  function globeIcon(ctx, x, y, active) {
    ctx.fillStyle = active ? '#E0E0E0' : '#8a8a8a';
    const px = [[7, 4], [8, 4], [9, 4], [10, 4], [11, 4], [6, 5], [12, 5], [5, 6], [13, 6], [5, 7], [9, 7], [13, 7], [5, 8], [6, 8], [7, 8], [8, 8], [9, 8], [10, 8], [11, 8], [12, 8], [13, 8], [5, 9], [9, 9], [13, 9], [5, 10], [13, 10], [6, 11], [12, 11], [7, 12], [8, 12], [9, 12], [10, 12], [11, 12], [9, 5], [9, 6], [9, 10], [9, 11], [8, 5], [10, 5], [8, 11], [10, 11]];
    for (const [a, b] of px) ctx.fillRect(x + a + 1, y + b + 1, 1, 1);
  }
  function personIcon(ctx, x, y, active) {
    ctx.fillStyle = active ? '#E0E0E0' : '#8a8a8a';
    ctx.fillRect(x + 9, y + 4, 2, 2);
    ctx.fillRect(x + 6, y + 7, 8, 2);
    ctx.fillRect(x + 9, y + 9, 2, 4);
    ctx.fillRect(x + 8, y + 13, 1, 3);
    ctx.fillRect(x + 11, y + 13, 1, 3);
  }

  // ---------- world selection ----------
  const fmtDate = (t) => {
    const d = new Date(t);
    const p = (n) => String(n).padStart(2, '0');
    let h = d.getHours();
    const ap = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return `${d.getMonth() + 1}/${d.getDate()}/${String(d.getFullYear()).slice(2)}, ${h}:${p(d.getMinutes())} ${ap}`;
  };
  const MODE_NAME = { survival: 'Survival', creative: 'Creative', hardcore: 'Hardcore' };
  const iconCache = {};
  function worldIcon(w) {
    if (!w.icon) return null;
    let im = iconCache[w.id];
    if (!im || im.src !== w.icon) {
      im = new Image();
      im.src = w.icon;
      iconCache[w.id] = im;
    }
    return im.complete && im.naturalWidth ? im : null;
  }
  class SelectWorldScreen extends Screen {
    constructor(parent) {
      super(parent);
      this.bg = 'dirt';
      this.sel = -1;
      this.scroll = 0;
      this.lastClick = 0;
      this.filter = '';
    }
    list() {
      const f = this.filter.toLowerCase();
      return game().worldList().filter((w) => !f || w.name.toLowerCase().includes(f));
    }
    init() {
      const { W, H } = GUI;
      this.search = this.add(new TextField(W / 2 - 100, 22, 200, this.filter, { max: 32, onChange: (v) => ((this.filter = v), (this.sel = -1)), hint: '' }));
      const has = () => this.sel >= 0 && this.list()[this.sel];
      const b1 = this.add(new Button(W / 2 - 154, H - 52, 150, 'Play Selected World', () => this.play()));
      this.add(new Button(W / 2 + 4, H - 52, 150, 'Create New World', () => GUI.open(new CreateWorldScreen(this))));
      const b3 = this.add(new Button(W / 2 - 154, H - 28, 72, 'Edit', () => GUI.open(new EditWorldScreen(this, this.list()[this.sel]))));
      const b4 = this.add(new Button(W / 2 - 76, H - 28, 72, 'Delete', () => {
        const w = this.list()[this.sel];
        GUI.open(new ConfirmScreen(this, 'Are you sure you want to delete this world?', `'${w.name}' will be lost forever! (A long time!)`, 'Delete', 'Cancel', (yes) => {
          if (yes) {
            game().deleteWorld(w.id);
            this.sel = -1;
          }
          GUI.open(game().worldList().length ? this : new CreateWorldScreen(this.parent));
        }));
      }));
      const b5 = this.add(new Button(W / 2 + 4, H - 28, 72, 'Re-Create', () => {
        const w = this.list()[this.sel];
        GUI.open(new CreateWorldScreen(this, w));
      }));
      this.add(new Button(W / 2 + 82, H - 28, 72, 'Cancel', () => this.back()));
      this.needSel = [b1, b3, b4, b5];
      for (const b of this.needSel) b.active = !!has();
    }
    play() {
      const w = this.list()[this.sel];
      if (w) game().playWorld(w.id);
    }
    draw(ctx) {
      for (const b of this.needSel) b.active = this.sel >= 0 && !!this.list()[this.sel];
      super.draw(ctx);
    }
    background(ctx) {
      GUI.listBg(ctx, 48, GUI.H - 64);
    }
    drawContent(ctx) {
      const { W, H } = GUI;
      F.center(ctx, 'Select World', W / 2, 8, '#FFFFFF');
      const top = 48, bottom = H - 64;
      const L = this.list();
      const maxScroll = Math.max(0, L.length * 36 + 4 - (bottom - top));
      this.scroll = SC.clamp(this.scroll, 0, maxScroll);
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, top, W, bottom - top);
      ctx.clip();
      const x = Math.floor(W / 2 - 110);
      L.forEach((w, i) => {
        const y = top + 4 + i * 36 - this.scroll;
        if (y > bottom || y + 36 < top) return;
        if (i === this.sel) {
          ctx.fillStyle = '#808080';
          ctx.fillRect(x - 2, y - 2, 224, 36);
          ctx.fillStyle = '#000';
          ctx.fillRect(x - 1, y - 1, 222, 34);
        }
        const im = worldIcon(w);
        if (im) ctx.drawImage(im, x, y, 32, 32);
        else ctx.drawImage(SC.tex[SC.B.GRASS], x, y, 32, 32);
        F.draw(ctx, w.name, x + 35, y + 1, '#FFFFFF');
        F.draw(ctx, `${w.id} (${fmtDate(w.last)})`, x + 35, y + 12, '#808080');
        const mode = w.mode === 'hardcore' ? '§4Hardcore Mode!' : MODE_NAME[w.mode] + ' Mode';
        F.draw(ctx, `${mode}§8${w.cheats && w.mode !== 'hardcore' ? ', Cheats' : ''}, Version: 1.0`, x + 35, y + 21, '#808080');
      });
      ctx.restore();
      if (maxScroll > 0) {
        const sx = W / 2 + 124;
        ctx.fillStyle = '#000';
        ctx.fillRect(sx, top, 6, bottom - top);
        const kh = Math.max(32, ((bottom - top) * (bottom - top)) / (L.length * 36 + 4));
        const ky = top + (this.scroll / maxScroll) * (bottom - top - kh);
        ctx.fillStyle = '#808080';
        ctx.fillRect(sx, ky, 6, kh);
        ctx.fillStyle = '#C0C0C0';
        ctx.fillRect(sx, ky, 5, kh - 1);
      }
    }
    mouseDown(mx, my, b) {
      if (super.mouseDown(mx, my, b)) return true;
      const top = 48, bottom = GUI.H - 64;
      const x = GUI.W / 2 - 110;
      if (my >= top && my < bottom && mx >= x - 2 && mx < x + 222) {
        const i = Math.floor((my - top - 4 + this.scroll) / 36);
        if (i >= 0 && i < this.list().length) {
          const now = performance.now();
          if (i === this.sel && now - this.lastClick < 300) this.play();
          else click();
          this.sel = i;
          this.lastClick = now;
        }
      }
      return true;
    }
    wheel(d) {
      this.scroll += d * 18;
    }
    key(e) {
      if (e.key === 'Enter' && this.sel >= 0) {
        this.play();
        return true;
      }
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        const n = this.list().length;
        if (n) this.sel = SC.clamp(this.sel + (e.key === 'ArrowDown' ? 1 : -1), 0, n - 1);
        return true;
      }
      return super.key(e);
    }
  }

  const MODE_DESC = {
    survival: ['Search for resources, craft, gain', 'levels, health and hunger'],
    hardcore: ['Same as survival mode, locked at hardest', 'difficulty, and one life only'],
    creative: ['Unlimited resources, free flying and', 'destroy blocks instantly'],
  };
  const DIFF = ['Peaceful', 'Easy', 'Normal', 'Hard'];
  SC.DIFF_NAMES = DIFF;
  class CreateWorldScreen extends Screen {
    constructor(parent, from) {
      super(parent);
      this.bg = 'dirt';
      this.s = {
        name: from ? from.name : 'New World',
        seed: from ? String(from.seed) : '',
        mode: from ? from.mode : 'survival',
        difficulty: from ? from.difficulty : 2,
        cheats: from ? !!from.cheats : false,
        structures: from ? from.structures !== false : true,
        type: from ? from.type || 'default' : 'default',
        bonus: from ? !!from.bonus : false,
      };
      this.more = false;
    }
    init() {
      const { W, H } = GUI;
      const s = this.s;
      if (!this.more) {
        this.nameField = this.add(new TextField(W / 2 - 100, 60, 200, s.name, { max: 32, onChange: (v) => (s.name = v), onEnter: () => this.create() }));
        this.nameField.focused = true;
        this.add(new Button(W / 2 - 155, 100, 150, () => 'Game Mode: ' + MODE_NAME[s.mode], () => {
          s.mode = s.mode === 'survival' ? 'hardcore' : s.mode === 'hardcore' ? 'creative' : 'survival';
          if (s.mode === 'creative') s.cheats = true;
          if (s.mode === 'survival') s.cheats = false;
          this.rebuild();
        }));
        this.add(new Button(W / 2 + 5, 100, 150, () => 'Difficulty: ' + (s.mode === 'hardcore' ? 'Hard' : DIFF[s.difficulty]), () => (s.difficulty = (s.difficulty + 1) % 4), { active: s.mode !== 'hardcore' }));
        this.add(new Button(W / 2 - 155, 151, 150, () => 'Allow Cheats: ' + (s.cheats && s.mode !== 'hardcore' ? 'ON' : 'OFF'), () => (s.cheats = !s.cheats), { active: s.mode !== 'hardcore' }));
        this.add(new Button(W / 2 + 5, 151, 150, 'Data Packs', null, { active: false }));
        this.add(new Button(W / 2 - 75, 187, 150, 'More World Options...', () => {
          this.more = true;
          this.rebuild();
        }));
      } else {
        this.seedField = this.add(new TextField(W / 2 - 100, 60, 200, s.seed, { max: 32, onChange: (v) => (s.seed = v), onEnter: () => this.create() }));
        this.seedField.focused = true;
        this.add(new Button(W / 2 - 155, 100, 150, () => 'Generate Structures: ' + (s.structures ? 'ON' : 'OFF'), () => (s.structures = !s.structures)));
        this.add(new Button(W / 2 + 5, 100, 150, () => 'World Type: ' + (s.type === 'flat' ? 'Superflat' : 'Default'), () => (s.type = s.type === 'flat' ? 'default' : 'flat')));
        this.add(new Button(W / 2 + 5, 151, 150, () => 'Bonus Chest: ' + (s.bonus ? 'ON' : 'OFF'), () => (s.bonus = !s.bonus)));
        this.add(new Button(W / 2 - 75, 187, 150, 'Done', () => {
          this.more = false;
          this.rebuild();
        }));
      }
      this.add(new Button(W / 2 - 155, H - 28, 150, 'Create New World', () => this.create()));
      this.add(new Button(W / 2 + 5, H - 28, 150, 'Cancel', () => this.back()));
    }
    create() {
      const s = this.s;
      if (!s.name.trim()) s.name = 'New World';
      game().createWorld(Object.assign({}, s, { difficulty: s.mode === 'hardcore' ? 3 : s.difficulty, cheats: s.mode !== 'hardcore' && s.cheats }));
    }
    drawContent(ctx) {
      const { W } = GUI;
      const s = this.s;
      F.center(ctx, 'Create New World', W / 2, 20, '#FFFFFF');
      if (!this.more) {
        F.draw(ctx, 'World Name', W / 2 - 100, 47, GRAY);
        F.draw(ctx, 'Will be saved in: ' + game().folderName(s.name || 'New World'), W / 2 - 100, 85, GRAY);
        MODE_DESC[s.mode].forEach((l, i) => F.draw(ctx, l, W / 2 - 150, 122 + i * 10, GRAY));
        F.draw(ctx, 'Commands like /gamemode, /give', W / 2 - 150, 172, GRAY);
      } else {
        F.draw(ctx, 'Seed for the world generator', W / 2 - 100, 47, GRAY);
        F.draw(ctx, 'Leave blank for a random seed', W / 2 - 100, 85, GRAY);
        F.draw(ctx, 'Dungeons and other structures', W / 2 - 150, 122, GRAY);
      }
    }
  }

  class EditWorldScreen extends Screen {
    constructor(parent, w) {
      super(parent);
      this.bg = 'dirt';
      this.w = w;
      this.name = w.name;
    }
    init() {
      const { W, H } = GUI;
      const y = Math.floor(H / 4);
      this.f = this.add(new TextField(W / 2 - 100, y + 18, 200, this.name, { max: 32, onChange: (v) => (this.name = v), onEnter: () => this.save() }));
      this.f.focused = true;
      this.add(new Button(W / 2 - 100, y + 48, 200, 'Reset Icon', () => {
        game().updateWorldMeta(this.w.id, { icon: null });
      }, { active: !!this.w.icon }));
      this.add(new Button(W / 2 - 100, y + 96 + 5, 98, 'Save', () => this.save()));
      this.add(new Button(W / 2 + 2, y + 96 + 5, 98, 'Cancel', () => this.back()));
    }
    save() {
      game().updateWorldMeta(this.w.id, { name: this.name.trim() || this.w.name });
      this.back();
    }
    drawContent(ctx) {
      F.center(ctx, 'Edit World', GUI.W / 2, 15, '#FFFFFF');
      F.draw(ctx, 'World Name', GUI.W / 2 - 100, Math.floor(GUI.H / 4) + 6, GRAY);
    }
  }

  class ConfirmScreen extends Screen {
    constructor(parent, title, msg, yes, no, cb) {
      super(parent);
      Object.assign(this, { title, msg, yes, no, cb });
      this.bg = 'dirt';
    }
    init() {
      const { W, H } = GUI;
      const y = Math.floor(H / 6) + 96;
      this.add(new Button(W / 2 - 155, y, 150, this.yes, () => this.cb(true)));
      this.add(new Button(W / 2 + 5, y, 150, this.no, () => this.cb(false)));
    }
    drawContent(ctx) {
      F.center(ctx, this.title, GUI.W / 2, 70, '#FFFFFF');
      F.wrap(this.msg, GUI.W - 50).forEach((l, i) => F.center(ctx, l, GUI.W / 2, 90 + i * 9, '#FFFFFF'));
    }
    back() {
      this.cb(false);
    }
  }

  class ProgressScreen extends Screen {
    constructor(title) {
      super(null);
      this.title = title;
      this.stage = '';
      this.progress = -1;
      this.bg = 'dirt';
    }
    drawContent(ctx) {
      const { W, H } = GUI;
      F.center(ctx, this.title, W / 2, H / 2 - 30, '#FFFFFF');
      if (this.stage) F.center(ctx, this.stage + (this.progress >= 0 ? ': ' + Math.floor(this.progress * 100) + '%' : ''), W / 2, H / 2 - 14, '#FFFFFF');
      if (this.progress >= 0) {
        const x = W / 2 - 50, y = H / 2 + 2;
        ctx.fillStyle = '#808080';
        ctx.fillRect(x, y, 100, 2);
        ctx.fillStyle = '#80FF80';
        ctx.fillRect(x, y, Math.round(100 * this.progress), 2);
      }
    }
    key() {
      return true;
    }
  }

  // ---------- in-game menus ----------
  class PauseScreen extends Screen {
    init() {
      const { W, H } = GUI;
      const y = Math.floor(H / 4) + 8;
      this.add(new Button(W / 2 - 102, y, 204, 'Back to Game', () => this.back()));
      this.add(new Button(W / 2 - 102, y + 24, 98, 'Advancements', null, { active: false }));
      this.add(new Button(W / 2 + 4, y + 24, 98, 'Statistics', () => GUI.open(new StatsScreen(this))));
      this.add(new Button(W / 2 - 102, y + 48, 98, 'How to Play', () => GUI.open(new HelpScreen(this))));
      this.add(new Button(W / 2 + 4, y + 48, 98, 'Screenshot', () => {
        GUI.open(null);
        requestAnimationFrame(() => requestAnimationFrame(() => game().screenshot()));
      }));
      this.add(new Button(W / 2 - 102, y + 72, 98, 'Options...', () => GUI.open(new OptionsScreen(this))));
      this.add(new Button(W / 2 + 4, y + 72, 98, 'Open to LAN', null, { active: false }));
      this.add(new Button(W / 2 - 102, y + 96, 204, 'Save and Quit to Title', () => game().quitToTitle()));
    }
    drawContent(ctx) {
      F.center(ctx, 'Game Menu', GUI.W / 2, 40, '#FFFFFF');
    }
    back() {
      GUI.open(null);
    }
  }

  class DeathScreen extends Screen {
    constructor(msg, score, hardcore) {
      super(null);
      Object.assign(this, { msg, score, hardcore });
      this.age = 0;
      this.pause = false;
      this.bg = 'none';
    }
    init() {
      const { W, H } = GUI;
      const y = Math.floor(H / 4);
      this.b1 = this.add(new Button(W / 2 - 100, y + 72, 200, this.hardcore ? 'Spectate World' : 'Respawn', () => (this.hardcore ? game().spectate() : game().respawn())));
      this.b2 = this.add(new Button(W / 2 - 100, y + 96, 200, 'Title Screen', () => {
        if (this.hardcore) game().quitToTitle();
        else
          GUI.open(new ConfirmScreen(this, 'Are you sure you want to quit?', 'You will respawn when you return.', 'Title Screen', 'Respawn', (yes) => {
            if (yes) {
              game().respawn(true);
              game().quitToTitle();
            } else game().respawn();
          }));
      }));
    }
    background(ctx) {
      const grd = ctx.createLinearGradient(0, 0, 0, GUI.H);
      grd.addColorStop(0, 'rgba(80,0,0,0.38)');
      grd.addColorStop(1, 'rgba(128,48,48,0.63)');
      ctx.fillStyle = grd;
      ctx.fillRect(0, 0, GUI.W, GUI.H);
    }
    draw(ctx) {
      this.age += 1 / 60;
      this.b1.active = this.b2.active = this.age > 1;
      super.draw(ctx);
    }
    drawContent(ctx) {
      const { W } = GUI;
      ctx.save();
      ctx.scale(2, 2);
      F.center(ctx, this.hardcore ? 'Game over!' : 'You Died!', W / 4, 30, '#FFFFFF');
      ctx.restore();
      F.center(ctx, this.msg, W / 2, 85, '#FFFFFF');
      F.center(ctx, 'Score: §e' + this.score, W / 2, 100, '#FFFFFF');
    }
    key() {
      return true;
    }
  }

  // ---------- options ----------
  const pct = (v) => Math.round(v * 100);
  class OptionsScreen extends Screen {
    init() {
      const { W, H } = GUI;
      const o = SC.options;
      const inGame = game().state !== 'title';
      const y0 = Math.floor(H / 6) - 12;
      const ZL = SC.Renderer.ZOOMS;
      this.add(new Slider(W / 2 - 155, y0, 150, () => (o.zoom ? (ZL.indexOf(o.zoom) + 1) / ZL.length : 0), (v) => {
        const i = Math.round(v * ZL.length) - 1;
        o.zoom = i < 0 ? 0 : ZL[i];
        SC.renderer.applyZoomOption();
      }, () => 'Zoom: ' + (o.zoom ? o.zoom + 'x' : 'Auto')));
      const w = game().world;
      const locked = !inGame || game().mode === 'hardcore';
      this.add(new Button(W / 2 + 5, y0, 150, () => 'Difficulty: ' + DIFF[inGame ? game().difficulty : 2], () => {
        game().difficulty = (game().difficulty + 1) % 4;
        game().updateWorldMeta(game().worldId, { difficulty: game().difficulty });
      }, { active: !locked && !!w }));
      const y = Math.floor(H / 6) + 42;
      const list = [
        ['Skin Customization...', null],
        ['Music & Sounds...', () => GUI.open(new SoundScreen(this))],
        ['Video Settings...', () => GUI.open(new VideoScreen(this))],
        ['Controls...', () => GUI.open(new ControlsScreen(this))],
        ['Language...', null],
        ['Chat Settings...', () => GUI.open(new ChatSettingsScreen(this))],
        ['Resource Packs...', null],
        ['Accessibility Settings...', null],
      ];
      list.forEach(([label, fn], i) => this.add(new Button(W / 2 - 155 + (i % 2) * 160, y + Math.floor(i / 2) * 24, 150, label, fn, { active: !!fn })));
      this.add(new Button(W / 2 - 100, Math.floor(H / 6) + 168, 200, 'Done', () => this.back()));
    }
    drawContent(ctx) {
      F.center(ctx, 'Options', GUI.W / 2, 15, '#FFFFFF');
    }
    back() {
      SC.saveOptions();
      super.back();
    }
  }
  class SoundScreen extends Screen {
    init() {
      const { W, H } = GUI;
      const o = SC.options;
      const y = Math.floor(H / 6) - 12;
      const vol = (key, name) => () => name + ': ' + (o[key] ? pct(o[key]) + '%' : 'OFF');
      const set = (key) => (v) => {
        o[key] = Math.round(v * 100) / 100;
        SC.audio.applyVolumes();
      };
      this.add(new Slider(W / 2 - 155, y, 310, () => o.master, set('master'), vol('master', 'Master Volume')));
      [['music', 'Music'], ['blocks', 'Blocks'], ['hostile', 'Hostile Creatures'], ['friendly', 'Friendly Creatures'], ['players', 'Players']].forEach(([k, n], i) =>
        this.add(new Slider(W / 2 - 155 + (i % 2) * 160, y + 24 + Math.floor(i / 2) * 24, 150, () => o[k], set(k), vol(k, n))),
      );
      this.add(new Button(W / 2 + 5, y + 72, 150, 'Subtitles: OFF', null, { active: false }));
      this.add(new Button(W / 2 - 100, Math.floor(H / 6) + 168, 200, 'Done', () => this.back()));
    }
    drawContent(ctx) {
      F.center(ctx, 'Music & Sounds', GUI.W / 2, 15, '#FFFFFF');
    }
    back() {
      SC.saveOptions();
      super.back();
    }
  }
  class VideoScreen extends Screen {
    init() {
      const { W, H } = GUI;
      const o = SC.options;
      const y = Math.floor(H / 6) - 12;
      const B = (i, label, fn) => this.add(new Button(W / 2 - 155 + (i % 2) * 160, y + Math.floor(i / 2) * 24, 150, label, fn));
      B(0, () => 'Graphics: ' + (o.graphics === 'fancy' ? 'Fancy' : 'Fast'), () => (o.graphics = o.graphics === 'fancy' ? 'fast' : 'fancy'));
      this.add(new Slider(W / 2 + 5, y, 150, () => o.brightness, (v) => (o.brightness = Math.round(v * 100) / 100), () => 'Brightness: ' + (o.brightness <= 0 ? 'Moody' : o.brightness >= 1 ? 'Bright' : '+' + pct(o.brightness) + '%')));
      B(2, () => 'Smooth Lighting: ' + (o.smooth ? 'ON' : 'OFF'), () => (o.smooth = !o.smooth));
      B(3, () => 'Particles: ' + ['All', 'Decreased', 'Minimal'][o.particles], () => (o.particles = (o.particles + 1) % 3));
      B(4, () => 'GUI Scale: ' + (o.guiScale ? o.guiScale : 'Auto'), () => {
        o.guiScale = (o.guiScale + 1) % (GUI.maxScale() + 1);
        SC.saveOptions();
        GUI.metrics();
        this.rebuild();
      });
      B(5, () => 'Fullscreen: ' + (document.fullscreenElement ? 'ON' : 'OFF'), () => {
        if (document.fullscreenElement) document.exitFullscreen();
        else document.documentElement.requestFullscreen && document.documentElement.requestFullscreen().catch(() => {});
      });
      B(6, () => 'Clouds: ' + (o.clouds ? 'Fancy' : 'OFF'), () => (o.clouds = !o.clouds));
      this.add(new Button(W / 2 - 100, Math.floor(H / 6) + 168, 200, 'Done', () => this.back()));
    }
    drawContent(ctx) {
      F.center(ctx, 'Video Settings', GUI.W / 2, 15, '#FFFFFF');
    }
    back() {
      SC.saveOptions();
      super.back();
    }
  }
  class ChatSettingsScreen extends Screen {
    init() {
      const { W, H } = GUI;
      const o = SC.options;
      const y = Math.floor(H / 6) - 12;
      this.add(new Button(W / 2 - 155, y, 150, () => 'Chat: ' + (o.chat ? 'Shown' : 'Hidden'), () => (o.chat = !o.chat)));
      this.add(new Slider(W / 2 + 5, y, 150, () => o.chatBg, (v) => (o.chatBg = Math.round(v * 100) / 100), () => 'Text Background: ' + pct(o.chatBg) + '%'));
      this.add(new Button(W / 2 - 100, Math.floor(H / 6) + 168, 200, 'Done', () => this.back()));
    }
    drawContent(ctx) {
      F.center(ctx, 'Chat Settings', GUI.W / 2, 15, '#FFFFFF');
    }
    back() {
      SC.saveOptions();
      super.back();
    }
  }

  class ControlsScreen extends Screen {
    constructor(parent) {
      super(parent);
      this.scroll = 0;
      this.waiting = null;
      this.bg = 'dirt';
      this.rows = [];
      for (const [cat, list] of SC.KEY_LIST) {
        this.rows.push({ cat });
        for (const [a, n] of list) this.rows.push({ a, n });
      }
    }
    init() {
      const { W, H } = GUI;
      const o = SC.options;
      this.add(new Button(W / 2 - 155, 18, 150, 'Mouse Settings...', null, { active: false }));
      this.add(new Button(W / 2 + 5, 18, 150, () => 'Auto-Jump: ' + (o.autoJump ? 'ON' : 'OFF'), () => (o.autoJump = !o.autoJump)));
      this.resetAll = this.add(new Button(W / 2 - 155, H - 29, 150, 'Reset Keys', () => {
        o.keys = Object.assign({}, DEF_KEYS);
        SC.saveOptions();
      }));
      this.add(new Button(W / 2 + 5, H - 29, 150, 'Done', () => this.back()));
      this.top = 48;
      this.bottom = H - 36;
    }
    background(ctx) {
      GUI.listBg(ctx, this.top, this.bottom);
    }
    rowButtons() {
      const o = SC.options;
      const out = [];
      const x0 = Math.floor(GUI.W / 2) - 155;
      this.rows.forEach((r, i) => {
        const y = this.top + 4 + i * 20 - this.scroll;
        if (r.cat || y < this.top - 20 || y > this.bottom) return;
        const code = o.keys[r.a];
        const conflict = code && Object.keys(o.keys).some((k) => k !== r.a && o.keys[k] === code);
        const kb = new Button(x0 + 160, y, 75, () => (this.waiting === r.a ? '> §e' + SC.keyName(code) + '§f <' : (conflict ? '§c' : '') + SC.keyName(code)), () => (this.waiting = r.a));
        const rb = new Button(x0 + 240, y, 50, 'Reset', () => {
          o.keys[r.a] = DEF_KEYS[r.a];
          SC.saveOptions();
        }, { active: code !== DEF_KEYS[r.a] });
        out.push({ r, y, kb, rb });
      });
      return out;
    }
    drawContent(ctx) {
      const { W } = GUI;
      F.center(ctx, 'Controls', W / 2, 8, '#FFFFFF');
      const maxScroll = Math.max(0, this.rows.length * 20 + 8 - (this.bottom - this.top));
      this.scroll = SC.clamp(this.scroll, 0, maxScroll);
      this.resetAll.active = Object.keys(DEF_KEYS).some((k) => SC.options.keys[k] !== DEF_KEYS[k]);
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, this.top, W, this.bottom - this.top);
      ctx.clip();
      const x0 = Math.floor(W / 2) - 155;
      this.rows.forEach((r, i) => {
        const y = this.top + 4 + i * 20 - this.scroll;
        if (r.cat) F.center(ctx, r.cat, W / 2, y + 6, '#FFFFFF');
      });
      this.btns = this.rowButtons();
      for (const b of this.btns) {
        F.right(ctx, b.r.n, x0 + 150, b.y + 6, '#FFFFFF');
        b.kb.draw(ctx, GUI.mx, GUI.my);
        b.rb.draw(ctx, GUI.mx, GUI.my);
      }
      ctx.restore();
    }
    mouseDown(mx, my, b) {
      if (this.waiting) {
        SC.options.keys[this.waiting] = 'Mouse' + b;
        this.waiting = null;
        SC.saveOptions();
        return true;
      }
      if (super.mouseDown(mx, my, b)) return true;
      if (my < this.top || my > this.bottom) return true;
      for (const bt of this.btns || []) if (bt.kb.mouseDown(mx, my, b) || bt.rb.mouseDown(mx, my, b)) return true;
      return true;
    }
    wheel(d) {
      this.scroll += d * 20;
    }
    key(e) {
      if (this.waiting) {
        SC.options.keys[this.waiting] = e.code === 'Escape' ? '' : e.code;
        this.waiting = null;
        SC.saveOptions();
        return true;
      }
      return super.key(e);
    }
    back() {
      SC.saveOptions();
      super.back();
    }
  }

  // ---------- statistics ----------
  const fmtTime = (s) => {
    s = Math.floor(s);
    if (s < 60) return s + ' s';
    if (s < 3600) return (s / 60).toFixed(2) + ' min';
    if (s < 86400) return (s / 3600).toFixed(2) + ' h';
    return (s / 86400).toFixed(2) + ' d';
  };
  const fmtDist = (m) => (m < 1000 ? m.toFixed(2) + ' m' : (m / 1000).toFixed(2) + ' km');
  class StatsScreen extends Screen {
    constructor(parent) {
      super(parent);
      this.tab = 'general';
      this.scroll = 0;
      this.bg = 'dirt';
    }
    init() {
      const { W, H } = GUI;
      this.top = 32;
      this.bottom = H - 64;
      const T = (x, label, tab) => this.add(new Button(x, H - 52, 80, label, () => {
        this.tab = tab;
        this.scroll = 0;
        this.rebuild();
      }, { active: this.tab !== tab }));
      T(W / 2 - 120, 'General', 'general');
      T(W / 2 - 40, 'Items', 'items');
      T(W / 2 + 40, 'Mobs', 'mobs');
      this.add(new Button(W / 2 - 100, H - 28, 200, 'Done', () => this.back()));
    }
    background(ctx) {
      GUI.listBg(ctx, this.top, this.bottom);
    }
    drawContent(ctx) {
      const { W } = GUI;
      F.center(ctx, 'Statistics', W / 2, 20, '#FFFFFF');
      const st = game().stats || {};
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, this.top, W, this.bottom - this.top);
      ctx.clip();
      let y = this.top + 4 - this.scroll;
      const x0 = W / 2 - 140, x1 = W / 2 + 140;
      let h = 0;
      if (this.tab === 'general') {
        const rows = [
          ['Games Quit', st.quits || 0],
          ['Time Played', fmtTime(st.playTime || 0)],
          ['Time Since Last Death', fmtTime(st.sinceDeath || 0)],
          ['Distance Walked', fmtDist(st.walk || 0)],
          ['Distance Sprinted', fmtDist(st.sprint || 0)],
          ['Distance Swum', fmtDist(st.swim || 0)],
          ['Distance Fallen', fmtDist(st.fallen || 0)],
          ['Distance Flown', fmtDist(st.flown || 0)],
          ['Jumps', st.jumps || 0],
          ['Damage Dealt', ((st.damageDealt || 0) / 2).toFixed(1)],
          ['Damage Taken', ((st.damageTaken || 0) / 2).toFixed(1)],
          ['Number of Deaths', st.deaths || 0],
          ['Mob Kills', st.mobKills || 0],
          ['Times Slept in a Bed', st.slept || 0],
          ['Items Dropped', st.dropped || 0],
          ['Blocks Mined', Object.values(st.mined || {}).reduce((a, b) => a + b, 0)],
          ['Items Crafted', Object.values(st.crafted || {}).reduce((a, b) => a + b, 0)],
        ];
        rows.forEach(([n, v], i) => {
          if (i % 2) {
            ctx.fillStyle = 'rgba(255,255,255,0.04)';
            ctx.fillRect(x0 - 4, y - 1, x1 - x0 + 8, 10);
          }
          F.draw(ctx, n, x0, y, i % 2 ? '#FFFFFF' : '#909090');
          F.right(ctx, String(v), x1, y, i % 2 ? '#FFFFFF' : '#909090');
          y += 10;
        });
        h = rows.length * 10;
      } else if (this.tab === 'items') {
        const ids = new Set([...Object.keys(st.mined || {}), ...Object.keys(st.crafted || {}), ...Object.keys(st.picked || {})].map(Number));
        F.right(ctx, 'Mined', x1 - 90, y, '#FFFFFF');
        F.right(ctx, 'Crafted', x1 - 45, y, '#FFFFFF');
        F.right(ctx, 'Picked Up', x1, y, '#FFFFFF');
        y += 14;
        const list = [...ids].filter((id) => SC.items[id]).sort((a, b) => a - b);
        if (!list.length) F.center(ctx, 'Nothing here yet', W / 2, y + 10, '#909090');
        for (const id of list) {
          ctx.drawImage(SC.icons[id], x0, y - 4, 16, 16);
          F.draw(ctx, SC.itemName(id), x0 + 20, y, '#FFFFFF');
          F.right(ctx, String((st.mined || {})[id] || '-'), x1 - 90, y, '#FFFFFF');
          F.right(ctx, String((st.crafted || {})[id] || '-'), x1 - 45, y, '#FFFFFF');
          F.right(ctx, String((st.picked || {})[id] || '-'), x1, y, '#FFFFFF');
          y += 18;
        }
        h = list.length * 18 + 14;
      } else {
        const kinds = ['zombie', 'skeleton', 'creeper', 'pig', 'sheep'];
        const name = { zombie: 'Zombie', skeleton: 'Skeleton', creeper: 'Creeper', pig: 'Pig', sheep: 'Sheep' };
        const plural = { zombie: 'Zombies', skeleton: 'Skeletons', creeper: 'Creepers', pig: 'Pigs', sheep: 'Sheep' };
        for (const k of kinds) {
          const kills = (st.killed || {})[k] || 0, by = (st.killedBy || {})[k] || 0;
          F.draw(ctx, name[k], x0, y, '#FFFFFF');
          F.draw(ctx, kills ? `You killed ${kills} ${kills === 1 ? name[k] : plural[k]}` : `You have never killed ${name[k]}`, x0 + 10, y + 10, '#909090');
          F.draw(ctx, by ? `${name[k]} killed you ${by} time${by === 1 ? '' : 's'}` : `You have never been killed by ${name[k]}`, x0 + 10, y + 20, '#909090');
          y += 34;
        }
        h = kinds.length * 34;
      }
      this.maxScroll = Math.max(0, h + 8 - (this.bottom - this.top));
      this.scroll = SC.clamp(this.scroll, 0, this.maxScroll);
      ctx.restore();
    }
    wheel(d) {
      this.scroll += d * 18;
    }
  }

  // ---------- help ----------
  const HELP = [
    '§eGetting started',
    'Punch a tree (hold left click) to collect logs. Press E and put logs in the crafting grid to make planks, then sticks and a Crafting Table. Place the table with right click and use it for tools.',
    '§eSurvive the night',
    'Zombies, skeletons and creepers come out in the dark. Build a shelter, place torches (coal over a stick), and sleep in a bed (3 wool over 3 planks) to skip the night.',
    '§eMining',
    'Stone needs a pickaxe. Iron needs a stone pickaxe, gold and diamond need iron. Smelt ore in a Furnace with coal or wood as fuel.',
    '§eControls',
    'A/D walk, Space jump, Shift sneak, double tap A/D or hold Ctrl to sprint. W/S climb ladders. Left click mines and attacks, right click places and uses. Shift + click works on background walls. E inventory, Q drop, F swap offhand, middle click picks a block, T chat, / commands, F1 hide HUD, F2 screenshot, F3 debug.',
    '§eInventory',
    'Click to pick up or put down a stack, right click to split or place one, Shift + click to move it across, 1-9 to swap with the hotbar, and double click to gather a stack.',
  ];
  class HelpScreen extends Screen {
    constructor(parent) {
      super(parent);
      this.scroll = 0;
      this.bg = 'dirt';
    }
    init() {
      this.add(new Button(GUI.W / 2 - 100, GUI.H - 28, 200, 'Done', () => this.back()));
      this.top = 32;
      this.bottom = GUI.H - 36;
    }
    background(ctx) {
      GUI.listBg(ctx, this.top, this.bottom);
    }
    drawContent(ctx) {
      const { W } = GUI;
      F.center(ctx, 'How to Play', W / 2, 16, '#FFFFFF');
      const lines = [];
      for (const p of HELP) {
        if (p.startsWith('§e')) lines.push('', p);
        else lines.push(...F.wrap(p, Math.min(300, W - 40)));
      }
      const max = Math.max(0, lines.length * 10 + 8 - (this.bottom - this.top));
      this.scroll = SC.clamp(this.scroll, 0, max);
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, this.top, W, this.bottom - this.top);
      ctx.clip();
      const x = Math.floor(W / 2 - Math.min(300, W - 40) / 2);
      lines.forEach((l, i) => F.draw(ctx, l, x, this.top + 2 + i * 10 - this.scroll, '#E0E0E0'));
      ctx.restore();
    }
    wheel(d) {
      this.scroll += d * 20;
    }
  }

  // ---------- chat ----------
  class ChatScreen extends Screen {
    constructor(initial = '') {
      super(null);
      this.initial = initial;
      this.pause = false;
      this.bg = 'none';
      this.hist = -1;
    }
    init() {
      this.field = this.add(new TextField(4, GUI.H - 12, GUI.W - 6, this.field ? this.field.value : this.initial, { max: 256, h: 12, onEnter: (v) => this.send(v) }));
      this.field.focused = true;
    }
    draw(ctx) {
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(2, GUI.H - 14, GUI.W - 4, 12);
      const f = this.field;
      F.draw(ctx, f.value, 4, GUI.H - 12, '#E0E0E0');
      if (Math.floor(GUI.t * 3) % 2 === 0) {
        const cx = 4 + F.width(f.value.slice(0, f.cursor)) + (f.cursor ? 1 : 0);
        if (f.cursor >= f.value.length) F.draw(ctx, '_', cx, GUI.H - 12, '#E0E0E0');
        else {
          ctx.fillStyle = '#D0D0D0';
          ctx.fillRect(cx, GUI.H - 13, 1, 10);
        }
      }
      // command suggestions
      if (f.value.startsWith('/') && !f.value.includes(' ')) {
        const m = game().commandNames().filter((c) => ('/' + c).startsWith(f.value));
        if (m.length && f.value.length > 1) {
          const w = Math.max(...m.map((c) => F.width('/' + c))) + 4;
          m.slice(0, 10).forEach((c, i) => {
            const y = GUI.H - 26 - i * 12;
            ctx.fillStyle = 'rgba(0,0,0,0.8)';
            ctx.fillRect(4, y, w, 12);
            F.draw(ctx, '/' + c, 6, y + 2, i === 0 ? '#FFFF55' : '#A0A0A0', false);
          });
        }
      }
    }
    send(v) {
      v = v.trim();
      GUI.open(null);
      if (!v) return;
      game().chatHistory.push(v);
      if (v.startsWith('/')) game().runCommand(v.slice(1));
      else game().chat('<Steve> ' + v);
    }
    key(e) {
      if (e.key === 'Escape') {
        GUI.open(null);
        return true;
      }
      const h = game().chatHistory;
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        if (!h.length) return true;
        this.hist = this.hist < 0 ? h.length : this.hist;
        this.hist = SC.clamp(this.hist + (e.key === 'ArrowUp' ? -1 : 1), 0, h.length);
        this.field.value = h[this.hist] || '';
        this.field.cursor = this.field.value.length;
        return true;
      }
      if (e.key === 'Tab') {
        const f = this.field;
        if (f.value.startsWith('/') && !f.value.includes(' ')) {
          const m = game().commandNames().filter((c) => ('/' + c).startsWith(f.value));
          if (m.length) {
            f.value = '/' + m[0] + ' ';
            f.cursor = f.value.length;
          }
        }
        return true;
      }
      return this.field.key(e);
    }
    mouseDown() {
      return true;
    }
  }

  Object.assign(GUI, {
    TitleScreen, SelectWorldScreen, CreateWorldScreen, PauseScreen, DeathScreen, OptionsScreen, ProgressScreen, ChatScreen,
    StatsScreen, HelpScreen, ConfirmScreen,
  });
})();
