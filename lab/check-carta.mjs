import { chromium } from 'playwright-core';
import http from 'http'; import fs from 'fs'; import path from 'path';
const DIST=path.resolve('dist');
const MIME={'.html':'text/html','.js':'application/javascript','.css':'text/css','.webp':'image/webp','.json':'application/json','.woff2':'font/woff2','.png':'image/png'};
const srv=await new Promise(r=>{const s=http.createServer((q,res)=>{let u=decodeURIComponent(q.url.split('?')[0]);if(u==='/')u='/index.html';const f=path.join(DIST,u);if(fs.existsSync(f)&&fs.statSync(f).isFile()){res.setHeader('Content-Type',MIME[path.extname(f)]||'application/octet-stream');fs.createReadStream(f).pipe(res);}else{res.statusCode=404;res.end();}});s.listen(4426,()=>r(s));});
const b=await chromium.launch({executablePath:'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',headless:true});
const p=await b.newPage({viewport:{width:1440,height:900}});
const err=[]; p.on('pageerror',e=>err.push(e.message));
await p.goto('http://localhost:4426/',{waitUntil:'networkidle'});
await p.waitForTimeout(3500);
const H=await p.evaluate(()=>{const a=document.querySelector('[data-act="produttori"]');return Math.round(a.getBoundingClientRect().top+scrollY);});
console.log('palco', H, 'px =', (H/900).toFixed(0), 'schermate');
/* una didascalia sul palco */
let vis=null;
for(let i=0;i<70 && !vis;i++){
  const y=Math.round(H*(0.02+i*0.006));
  await p.evaluate(v=>window.scrollTo(0,v), y);
  await p.waitForTimeout(230);
  const r=await p.evaluate(()=>{const c=document.querySelector('.stage-text.acceso:not(.capitolo):not(.pergamena)');
    return c ? {y:scrollY, op:+getComputedStyle(c.firstElementChild).opacity} : null;});
  if(r && r.op>0.85) vis=r;
}
if(vis){ await p.evaluate(v=>window.scrollTo(0,v), vis.y); await p.waitForTimeout(900);
  await p.screenshot({path:'lab/shots/carta-palco.png', clip:{x:0,y:0,width:1440,height:900}}); }
/* le schede produttore */
await p.evaluate(y=>window.scrollTo(0,y+1400), H);
await p.waitForTimeout(1400);
await p.screenshot({path:'lab/shots/carta-schede.png', clip:{x:0,y:0,width:1440,height:900}});
console.log('pageerror:', err.length);
await b.close(); srv.close();
