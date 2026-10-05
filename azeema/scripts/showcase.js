// Renders a showcase video + poster for every design (for TikTok/Snap/Instagram), and the site's OG image.
//   npm run showcase            → all themes
//   npm run showcase sage lilac → selected themes
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import app from '../server.js';
import { config } from '../src/config.js';
import { renderInvitation, closeRenderer } from '../src/render.js';
import { DEMOS } from '../public/js/shared/invite.js';

const out = path.join(config.root, 'marketing', 'videos');
fs.mkdirSync(out, { recursive: true });
const themes = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(DEMOS);
const srv = app.listen(0);
const port = srv.address().port;

for (const t of themes) {
  const t0 = Date.now();
  const dir = path.join(out, `_${t}`);
  await renderInvitation(t, { url: `http://127.0.0.1:${port}/v/demo-${t}?token=${config.renderToken}`, outDir: dir });
  fs.renameSync(path.join(dir, 'video.mp4'), path.join(out, `${t}.mp4`));
  fs.renameSync(path.join(dir, 'poster.jpg'), path.join(out, `${t}.jpg`));
  fs.rmSync(dir, { recursive: true, force: true });
  console.log(`✓ ${t}  ${((Date.now() - t0) / 1000).toFixed(0)}s`);
}

// OG image (1200×630): three posters on the brand paper colour
const og = ['lilac', 'sage', 'arch'].map((t) => path.join(out, `${t}.jpg`));
if (og.every((f) => fs.existsSync(f))) {
  execFileSync('ffmpeg', ['-loglevel', 'error', '-y', ...og.flatMap((f) => ['-i', f]), '-filter_complex',
    '[0]scale=-1:560[a];[1]scale=-1:560[b];[2]scale=-1:560[c];color=c=0xF7F5EE:s=1200x630[bg];' +
    '[bg][a]overlay=150:35[x];[x][b]overlay=442:35[y];[y][c]overlay=734:35', '-frames:v', '1', '-q:v', '3',
    path.join(config.root, 'public', 'img', 'og.jpg')]);
  console.log('✓ public/img/og.jpg');
}
srv.close();
await closeRenderer();
