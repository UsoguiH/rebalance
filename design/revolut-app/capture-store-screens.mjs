// Run: npm i -D playwright && node <this file>
import { chromium } from 'playwright';
import fs from 'fs';
const b = await chromium.launch({ headless: true, args:['--disable-blink-features=AutomationControlled'] });
const ctx = await b.newContext({ viewport:{width:1440,height:1000}, locale:'en-GB',
  userAgent:'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36'});
const p = await ctx.newPage();
const media = new Set();
p.on('response', r => { const u=r.url(); if (/\.(m3u8|mp4|webm)(\?|$)/.test(u)) media.add(u); });
const out = {};
for (const [name,url] of [['appstore','https://apps.apple.com/gb/app/revolut-send-spend-save/id932493382'],['play','https://play.google.com/store/apps/details?id=com.revolut.revolut&hl=en_GB']]) {
  try {
    const r = await p.goto(url,{waitUntil:'domcontentloaded',timeout:45000}); await p.waitForTimeout(5000);
    for (const t of ['Accept all','Reject all']) { const l=p.getByRole('button',{name:t}); if(await l.count()){await l.first().click().catch(()=>{});break;} }
    await p.mouse.wheel(0,800); await p.waitForTimeout(2500);
    await p.screenshot({path:`${name}.png`});
    out[name] = await p.evaluate(() => {
      const s=new Set();
      document.querySelectorAll('img, source').forEach(i=>{ const v=(i.srcset||i.src||'').split(',').map(x=>x.trim().split(' ')[0]).pop(); if(v) s.add(v); });
      document.querySelectorAll('video').forEach(v=>{ s.add('VIDEO '+(v.src||v.querySelector('source')?.src||'')+' poster '+v.poster) });
      return [...s];
    });
    console.log(name, r?.status(), await p.title(), out[name].length);
  } catch(e){ console.log(name,'ERR',e.message.slice(0,120)); }
}
out.media=[...media];
fs.writeFileSync('stores.json', JSON.stringify(out,null,1));
await b.close();
