// Run: npm i -D playwright && node <this file>
import { chromium } from 'playwright';
import fs from 'fs';
const b = await chromium.launch({ headless: true, args:['--disable-blink-features=AutomationControlled','--autoplay-policy=no-user-gesture-required'] });
const ctx = await b.newContext({ viewport:{width:1440,height:900}, locale:'en-GB',
  userAgent:'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36'});
const res={};
const urls=['https://apps.apple.com/us/app/revolut-send-spend-save/id932493382','https://www.revolut.com/','https://www.revolut.com/savings/','https://www.revolut.com/money-transfer/','https://www.revolut.com/revolut-ultra/','https://www.revolut.com/budgeting-app/','https://www.revolut.com/app/'];
for (const u of urls) {
  const p=await ctx.newPage(); const media=new Set();
  p.on('response', r=>{ const x=r.url(); const ct=r.headers()['content-type']||''; if(/\.(m3u8|mp4|webm|mov|json|lottie)(\?|$)/.test(x)&&!/analytics|segment|sentry|consent/.test(x) || ct.startsWith('video')) media.add(x); });
  try { await p.goto(u,{waitUntil:'domcontentloaded',timeout:45000}); await p.waitForTimeout(3000);
    for (let i=0;i<14;i++){ await p.mouse.wheel(0,700); await p.waitForTimeout(700); }
    const dom = await p.evaluate(()=>[...document.querySelectorAll('video')].map(v=>(v.currentSrc||v.src||[...v.querySelectorAll('source')].map(s=>s.src).join('|'))+' poster='+v.poster));
    res[u]={status:'ok', title:await p.title(), dom, net:[...media]};
  } catch(e){ res[u]={err:e.message.slice(0,100), net:[...media]}; }
  await p.close(); console.log(u, res[u].dom?.length, res[u].net.length);
}
fs.writeFileSync('vids.json',JSON.stringify(res,null,1)); await b.close();
