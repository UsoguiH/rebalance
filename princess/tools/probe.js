// Headless match probe: node princess/tools/probe.js [seconds] [size] [every]
// Runs a bot-only match fast-forwarded in Chromium and prints the state over time.
const path = require('path');
const fs = require('fs');
const http = require('http');
let chromium;
try {
  ({ chromium } = require('playwright'));
} catch (e) {
  ({ chromium } = require('/opt/node22/lib/node_modules/playwright'));
}
(async () => {
  const [secs = '300', size = '8', every = '30'] = process.argv.slice(2);
  const root = path.join(__dirname, '..');
  const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.woff2': 'font/woff2' };
  const server = http.createServer((req, res) => {
    const file = path.join(root, decodeURIComponent(req.url.split('?')[0]));
    if (!file.startsWith(root) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      res.writeHead(404);
      return res.end();
    }
    res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const exe = fs.existsSync('/opt/pw-browsers/chromium-1194/chrome-linux/chrome') ? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' : undefined;
  const browser = await chromium.launch({ executablePath: exe, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 640, height: 360 } });
  page.on('pageerror', (e) => console.log('PAGE ERROR', e.message, e.stack));
  page.on('console', (m) => m.type() === 'error' && console.log('console', m.text()));
  await page.goto(`http://127.0.0.1:${server.address().port}/index.html?play=1&size=${size}&lowres=1`);
  await page.waitForFunction(() => window.__ready, null, { timeout: 120000 });
  // let the player be a bot too
  await page.evaluate(() => {
    const g = window.__game;
    g.render = () => {};
  });
  const t0 = Date.now();
  for (let t = 0; t < +secs; t += +every) {
    const s = await page.evaluate((every) => {
      const g = window.__game;
      const step = 1 / 30;
      const a = performance.now();
      for (let k = 0; k < every / step; k++) g.update(step);
      const ms = (performance.now() - a) / (every / step);
      const cls = (team) => g.units.filter((u) => u.team === team && u.alive).map((u) => u.cls[0] + (u.carrying ? '*' : '') + (u.carryingPrincess ? 'P' : '')).join('');
      const jobs = (team) => g.brains.filter((b) => b.u.team === team).map((b) => (b.job ? b.job.kind : '-')).join(',');
      return {
        time: g.time.toFixed(0),
        msPerStep: ms.toFixed(1),
        res: g.teams.map((t) => `${t.wood}w/${t.ore}o`).join(' | '),
        up: g.hatMachines.filter((h) => h.upgraded).map((h) => h.team + h.cls).join(' '),
        cat: g.catapults.map((c) => c.done).join(','),
        gates: g.gates.map((x) => x.hp.toFixed(0)).join(','),
        outposts: g.outposts.map((o) => o.owner).join(','),
        princess: g.princesses.map((p) => `${p.state}:${p.calories.toFixed(0)}:${p.carriers.length}`).join(' | '),
        kills: g.stats.kills.join(':'),
        rescues: g.stats.rescues.join(':'),
        blue: cls(0),
        red: cls(1),
        jobsB: jobs(0),
        jobsR: jobs(1),
        win: g.teams.map((t) => t.winT.toFixed(0)).join(','),
        over: g.over ? 'WINNER ' + g.winner : '',
        items: g.items.list.length,
        fx: g.fx.parts.length + '/' + g.fx.decals.length,
      };
    }, +every);
    console.log(JSON.stringify(s));
    if (s.over) break;
  }
  console.log('wall', Date.now() - t0, 'ms');
  await browser.close();
  server.close();
})();
