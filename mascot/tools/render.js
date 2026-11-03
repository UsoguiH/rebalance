// render.js: export every pose as a looping MP4 and GIF (and optionally PNG frames).
//
//   node mascot/tools/render.js                 # all clips → mascot/renders/
//   node mascot/tools/render.js jump wave       # just these
//   FPS=60 SIZE=720 BG=transparent FRAMES=1 node mascot/tools/render.js
//
// Needs Playwright (Chromium) and ffmpeg. MP4s are rendered at 60 fps by default;
// GIFs at 30 fps (GIF can't hold 60 cleanly). BG=transparent keeps PNG frames and
// writes a transparent WebM instead of the MP4.
const { chromium } = require('playwright');
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'renders');
const FPS = +(process.env.FPS || 60);
const SIZE = +(process.env.SIZE || 640);
const W = Math.round(SIZE * 0.8 / 2) * 2, H = SIZE;
const BG = process.env.BG || '#faeddd';
const transparent = BG === 'transparent';

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('file://' + path.join(ROOT, 'tools', 'frame.html'));
  await page.evaluate(() => window.ready);
  let list = await page.evaluate(() => window.clipList());
  const only = process.argv.slice(2);
  if (only.length) list = list.filter((c) => only.includes(c.id));

  for (const { id, dur } of list) {
    const dir = path.join(OUT, 'frames', id);
    fs.rmSync(dir, { recursive: true, force: true });
    fs.mkdirSync(dir, { recursive: true });
    const n = Math.round((dur / 1000) * FPS);
    for (let i = 0; i < n; i++) {
      const b64 = await page.evaluate(([id, t, w, h, bg]) => window.drawAt(id, t, w, h, bg), [id, (i * 1000) / FPS, W, H, transparent ? '' : BG]);
      fs.writeFileSync(path.join(dir, String(i).padStart(4, '0') + '.png'), Buffer.from(b64, 'base64'));
    }
    const input = ['-y', '-loglevel', 'error', '-framerate', String(FPS), '-i', path.join(dir, '%04d.png')];
    if (transparent) {
      execFileSync('ffmpeg', [...input, '-c:v', 'libvpx-vp9', '-pix_fmt', 'yuva420p', '-b:v', '0', '-crf', '30', path.join(OUT, id + '.webm')]);
    } else {
      execFileSync('ffmpeg', [...input, '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-preset', 'slow', '-crf', '20', '-movflags', '+faststart', path.join(OUT, id + '.mp4')]);
    }
    const gw = Math.round(W * 0.6 / 2) * 2;
    execFileSync('ffmpeg', [...input, '-vf',
      `fps=30,scale=${gw}:-1:flags=lanczos,split[a][b];[a]palettegen=reserve_transparent=${transparent ? 1 : 0}:stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=4`,
      '-loop', '0', path.join(OUT, id + '.gif')]);
    if (!process.env.FRAMES) fs.rmSync(dir, { recursive: true, force: true });
    console.log(`${id}: ${n} frames`);
  }
  if (!process.env.FRAMES) fs.rmSync(path.join(OUT, 'frames'), { recursive: true, force: true });
  await browser.close();
})();
