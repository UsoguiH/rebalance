// Render a pose to MP4: node video.js URL OUT.mp4 FPS SECONDS   (silent)
const { chromium } = require('playwright');
const { spawn } = require('child_process');
(async () => {
  const [url, out, fps, dur] = process.argv.slice(2);
  const n = Math.round(+dur * +fps);
  const ff = spawn('ffmpeg', ['-v', 'error', '-y', '-f', 'image2pipe', '-framerate', fps, '-i', '-',
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '17', '-pix_fmt', 'yuv420p', '-r', fps, '-movflags', '+faststart', out], { stdio: ['pipe', 'inherit', 'inherit'] });
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1080, height: 1080 } });
  p.on('pageerror', e => console.log('ERR', e.message));
  await p.goto(url); await p.waitForFunction(() => window.READY);
  const c = await p.$('#c');
  for (let i = 0; i < n; i++) {
    await p.evaluate(t => render(t), i / +fps);
    const buf = await c.screenshot({ type: 'jpeg', quality: 95 });
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
  }
  ff.stdin.end(); await new Promise(r => ff.on('close', r)); await b.close(); console.log('done', out);
})();
