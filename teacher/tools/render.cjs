// Render the poses to video, frame-exact (uses the page's __renderAt hook).
//   npx http-server -p 8765 .            (from the repo root, in another terminal)
//   node teacher/tools/render.cjs [outDir] [fps] [poseId ...]
// Needs Playwright + Chromium and ffmpeg. Writes <id>.mp4 and <id>.gif per pose, and showcase.mp4.
const { chromium } = require('playwright');
const { execSync } = require('child_process');
const fs = require('fs'), path = require('path');
(async () => {
  const [outDir = 'teacher/out', fpsArg = '30', ...only] = process.argv.slice(2);
  const fps = +fpsArg, W = 600, H = 810;
  fs.mkdirSync(outDir, { recursive: true });
  const b = await chromium.launch();
  const page = await b.newPage({ viewport: { width: 400, height: 540 }, deviceScaleFactor: 1.5 });
  await page.goto('http://localhost:8765/teacher/index.html?solo=idle');
  await page.waitForFunction(() => window.__ready);
  const poses = (await page.evaluate(() => window.__poses)).filter((p) => !only.length || only.includes(p.id));
  const list = [];
  for (const p of poses) {
    await page.goto(`http://localhost:8765/teacher/index.html?solo=${p.id}`);
    await page.waitForFunction(() => window.__ready); await page.waitForTimeout(200);
    const dir = path.join(outDir, `frames-${p.id}`);
    fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir);
    const n = Math.round((p.period / 1000) * fps);
    for (let i = 0; i < n; i++) {
      await page.evaluate((t) => window.__renderAt(t), (i * 1000) / fps);
      await page.screenshot({ path: path.join(dir, `${String(i).padStart(4, '0')}.png`) });
    }
    const mp4 = path.join(outDir, `${p.id}.mp4`);
    execSync(`ffmpeg -y -loglevel error -framerate ${fps} -i ${dir}/%04d.png -vf "format=yuv420p" -c:v libx264 -crf 18 -movflags +faststart ${mp4}`);
    execSync(`ffmpeg -y -loglevel error -framerate ${fps} -i ${dir}/%04d.png -vf "scale=300:-1:flags=lanczos,split[a][b];[a]palettegen=reserve_transparent=0[p];[b][p]paletteuse" ${path.join(outDir, p.id + '.gif')}`);
    fs.rmSync(dir, { recursive: true, force: true });
    list.push(`file '${path.resolve(mp4)}'`, `file '${path.resolve(mp4)}'`); // each loop twice in the showcase
    console.log('rendered', p.id);
  }
  await b.close();
  fs.writeFileSync(path.join(outDir, 'list.txt'), list.join('\n'));
  execSync(`ffmpeg -y -loglevel error -f concat -safe 0 -i ${path.join(outDir, 'list.txt')} -c copy ${path.join(outDir, 'showcase.mp4')}`);
  fs.rmSync(path.join(outDir, 'list.txt'));
})();
