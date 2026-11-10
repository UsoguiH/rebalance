// Timeline + compositor. `createPromo()` returns { renderAt(t, mode) } which paints one
// deterministic frame; the page player and the offline renderer both drive it.
import { loadFonts, makeCanvas, makeGrain, halftone, Layers, C, text } from './draw2d.js';
import { Kit, VP_BG } from './kit3d.js';
import { clamp } from './util.js';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import { loadModels } from './models.js';
import deskScene from './scenes/desk.js';
import roomScene from './scenes/room.js';
import flashA from './scenes/flashes.js';
import markerScene from './scenes/marker.js';
import ribbonScene from './scenes/ribbon.js';
import skyScene from './scenes/sky.js';
import folderScene from './scenes/folder.js';
import uiScene from './scenes/ui.js';
import typeScene from './scenes/type.js';
import logoScene from './scenes/logo.js';

export const W = 1920, H = 1080, FPS = 30, DURATION = 25.6;

const POST = { glow: 0.3, ht: 0, htw: 0, grain: 0.08, bars: 0, barColor: '#08070b', flash: 0, flashColor: '#ffffff', vignette: 0, mark: 1, markColor: 'rgba(255,255,255,.8)' };

export async function createPromo(o = {}) {
  await loadFonts(o.fontBase);
  const s3 = o.scale3d ?? 1;
  const kit = new Kit(Math.round(W * s3), Math.round(H * s3));
  await loadModels(kit, o.assetBase);
  const out = o.canvas || makeCanvas(W, H), og = out.getContext('2d');
  const frame = makeCanvas(W, H), fg = frame.getContext('2d');
  const acc = makeCanvas(W, H), ag = acc.getContext('2d');
  const small = makeCanvas(W / 4, H / 4), sg = small.getContext('2d');
  const grain = makeGrain();
  const layers = new Layers();
  const font3d = new FontLoader().parse(await (await fetch(`${o.fontBase || './vendor/fonts/'}helvetiker_bold.typeface.json`)).json());

  const corner = (x, y) => clamp(1.0 - Math.hypot(x, (1 - y) * 0.75) * 2.6) + clamp(0.9 - Math.hypot(1 - x, y * 0.75) * 3.0);
  const htPink = halftone(W, H, '#e83aa8', corner, 13, 0.5);
  const htWhite = halftone(W, H, '#ffffff', (x, y) => clamp(0.9 - Math.hypot(x, y * 0.7) * 2.8) + clamp(0.9 - Math.hypot(1 - x, (1 - y) * 0.75) * 2.8), 13, 0.5);

  const ctx = {
    W, H, kit, g: fg, layers, font3d, viewport: false, mode: 'final',
    // Draw a three.js scene into the frame. opts: blur (px), alpha, bg (css colour painted first)
    draw3d(scene, camera, opts = {}) {
      const c = kit.render(scene, camera, ctx.viewport);
      const g = ctx.g;
      g.save();
      if (opts.alpha != null) g.globalAlpha = opts.alpha;
      if (opts.blur && !ctx.viewport) g.filter = `blur(${opts.blur}px)`;
      g.drawImage(c, 0, 0, W, H);
      g.restore();
    },
    fill(color) { const g = ctx.g; g.save(); g.fillStyle = ctx.viewport && typeof color === 'string' && ctx.vpBg ? ctx.vpBg : color; g.fillRect(0, 0, W, H); g.restore(); },
    VP_BG,
  };

  const scenes = [deskScene, roomScene, flashA, markerScene, ribbonScene, skyScene, folderScene, uiScene, typeScene, logoScene]
    .flatMap((make) => make(ctx)).sort((a, b) => a.start - b.start);

  function sceneAt(t) {
    for (let i = scenes.length - 1; i >= 0; i--) if (t >= scenes[i].start) return scenes[i];
    return scenes[0];
  }

  function renderAt(time, mode = 'final') {
    const t = clamp(time, 0, DURATION - 1e-4);
    ctx.viewport = mode === 'viewport'; ctx.mode = mode;
    const sc = sceneAt(t);
    const mb = (!ctx.viewport && sc.blur ? sc.blur(t - sc.start, t) : null) || { n: 1, shutter: 0 };
    let post = POST;
    for (let i = 0; i < mb.n; i++) {
      const ts = mb.n === 1 ? t : clamp(t + ((i + 0.5) / mb.n - 0.5) * mb.shutter / FPS, sc.start, sc.end - 1e-4);
      fg.setTransform(1, 0, 0, 1, 0, 0); fg.globalAlpha = 1; fg.globalCompositeOperation = 'source-over'; fg.filter = 'none';
      fg.clearRect(0, 0, W, H);
      layers.begin(ctx.viewport && sc.flat);
      const p = sc.render(ts - sc.start, ts) || {};
      if (ctx.viewport && sc.flat) layers.draw(fg);
      if (i === mb.n - 1 || mb.n === 1) post = { ...POST, ...p };
      ag.globalAlpha = 1 / (i + 1);
      ag.drawImage(frame, 0, 0);
    }
    ag.globalAlpha = 1;

    og.setTransform(1, 0, 0, 1, 0, 0); og.globalAlpha = 1; og.globalCompositeOperation = 'source-over'; og.filter = 'none';
    og.drawImage(acc, 0, 0);
    if (ctx.viewport) {
      if (post.flash > 0) { og.globalAlpha = post.flash; og.fillStyle = post.flashColor; og.fillRect(0, 0, W, H); og.globalAlpha = 1; }
      text(og, '@UsoguiH', W / 2, H - 34, { size: 30, weight: 500, color: 'rgba(255,255,255,.85)', align: 'center', family: 'Inter' });
      return out;
    }
    // glow: blurred highlights screened back over the frame
    if (post.glow > 0) {
      sg.filter = 'blur(7px) brightness(0.86) contrast(1.5) saturate(1.25)';
      sg.drawImage(acc, 0, 0, small.width, small.height);
      sg.filter = 'none';
      og.globalCompositeOperation = 'screen'; og.globalAlpha = post.glow;
      og.drawImage(small, 0, 0, W, H);
      og.globalCompositeOperation = 'source-over'; og.globalAlpha = 1;
    }
    if (post.ht > 0) { og.globalAlpha = post.ht; og.drawImage(htPink, 0, 0); og.globalAlpha = 1; }
    if (post.htw > 0) { og.globalAlpha = post.htw; og.drawImage(htWhite, 0, 0); og.globalAlpha = 1; }
    if (post.vignette > 0) {
      const v = og.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 1.05);
      v.addColorStop(0, 'rgba(60,20,110,0)'); v.addColorStop(1, `rgba(60,20,110,${post.vignette})`);
      og.fillStyle = v; og.fillRect(0, 0, W, H);
    }
    if (post.flash > 0) { og.globalAlpha = clamp(post.flash); og.fillStyle = post.flashColor; og.fillRect(0, 0, W, H); og.globalAlpha = 1; }
    if (post.grain > 0) {
      const fi = Math.floor(t * FPS), gc = grain[fi % grain.length], ox = (fi * 131) % gc.width, oy = (fi * 71) % gc.height;
      og.globalCompositeOperation = 'overlay'; og.globalAlpha = post.grain;
      for (let y = -oy; y < H; y += gc.height) for (let x = -ox; x < W; x += gc.width) og.drawImage(gc, x, y);
      og.globalCompositeOperation = 'source-over'; og.globalAlpha = 1;
    }
    if (post.bars > 0) {
      const bh = H * 0.205 * post.bars;
      og.fillStyle = post.barColor; og.fillRect(0, 0, W, bh); og.fillRect(0, H - bh, W, bh);
    }
    if (post.mark > 0) text(og, '@UsoguiH', W / 2, H - 34, { size: 30, weight: 500, color: post.markColor, align: 'center', family: 'Inter', alpha: post.mark });
    return out;
  }

  return { renderAt, canvas: out, duration: DURATION, fps: FPS, scenes, W, H };
}
