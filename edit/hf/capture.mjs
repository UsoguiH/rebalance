import puppeteer from 'puppeteer-core';
import fs from 'fs';
const F='/home/user/rebalance/edit/hf/node_modules/@fontsource/baloo-bhaijaan-2/files/';
const b64=(f)=>fs.readFileSync(F+f).toString('base64');
let css='';
for(const w of [400,500,600,700,800]) css+=`@font-face{font-family:'Baloo Bhaijaan 2';font-weight:${w};src:url(data:font/woff2;base64,${b64(`baloo-bhaijaan-2-arabic-${w}-normal.woff2`)}) format('woff2');unicode-range:U+0600-06FF,U+200C-200E,U+2010-2011,U+204F,U+2E41,U+FB50-FDFF,U+FE80-FEFC;}\n`;
for(const w of [400,700,800]) css+=`@font-face{font-family:'Baloo Bhaijaan 2';font-weight:${w};src:url(data:font/woff2;base64,${b64(`baloo-bhaijaan-2-latin-${w}-normal.woff2`)}) format('woff2');unicode-range:U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+2000-206F,U+2074,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD;}\n`;
const shots=process.argv.slice(2);   // name=hash[@waitMs]
const br=await puppeteer.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox','--disable-gpu'],headless:true});
for(const spec of shots){
  const [name,rest]=spec.split('='); const [hash,wait]=rest.split('@');
  const pg=await br.newPage();
  await pg.setViewport({width:430,height:875,deviceScaleFactor:3,isMobile:true,hasTouch:true});
  await pg.setRequestInterception(true);
  pg.on('request',r=>{const u=r.url();
    if(u.includes('fonts.googleapis.com')) return r.respond({status:200,contentType:'text/css',body:css});
    if(u.includes('fonts.gstatic.com')) return r.abort();
    if(!u.startsWith('http://localhost')&&!u.startsWith('data:')) return r.abort();
    r.continue();});
  pg.on('pageerror',e=>console.log(name,'pageerror',e.message));
  await pg.goto('http://localhost:8080/preview.html#'+hash,{waitUntil:'load'});
  await pg.evaluate(()=>document.fonts.ready);
  await new Promise(r=>setTimeout(r,Number(wait||1500)));
  await pg.screenshot({path:`/home/user/rebalance/edit/shots/${name}.png`});
  console.log('ok',name); await pg.close();
}
await br.close();
