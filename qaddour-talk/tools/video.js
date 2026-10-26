// Render the page frame by frame into ffmpeg: node video.js URL OUT.mp4 FPS DURATION AUDIO
const { chromium } = require('playwright');
const { spawn } = require('child_process');
(async () => {
  const [url, out, fps, dur, audio] = process.argv.slice(2);
  const n = Math.ceil(+dur * +fps);
  const ff = spawn('ffmpeg', ['-v', 'error', '-y', '-f', 'image2pipe', '-framerate', fps, '-i', '-', '-i', audio,
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p', '-r', fps,
    '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart', out], { stdio: ['pipe', 'inherit', 'inherit'] });
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
  p.on('pageerror', e => console.log('ERR', e.message));
  await p.goto(url); await p.waitForFunction(() => window.READY, null, { timeout: 30000 });
  const c = await p.$('#c'); const t0 = Date.now();
  for (let i = 0; i < n; i++) {
    await p.evaluate(t => render(t), i / +fps);
    const buf = await c.screenshot({ type: 'jpeg', quality: 94 });
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    if (i % 300 === 0) console.log(`frame ${i}/${n} ${((Date.now() - t0) / 1000).toFixed(0)}s`);
  }
  ff.stdin.end(); await new Promise(r => ff.on('close', r)); await b.close();
  console.log('done', out);
})();
