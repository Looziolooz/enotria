import { chromium } from 'playwright-core';
import http from 'http'; import fs from 'fs'; import path from 'path';
const DIST=path.resolve('dist');
const MIME={'.html':'text/html','.js':'application/javascript','.css':'text/css','.webp':'image/webp','.json':'application/json','.woff2':'font/woff2','.png':'image/png'};
const srv=await new Promise(r=>{const s=http.createServer((q,res)=>{let u=decodeURIComponent(q.url.split('?')[0]);if(u==='/')u='/index.html';const f=path.join(DIST,u);if(fs.existsSync(f)&&fs.statSync(f).isFile()){res.setHeader('Content-Type',MIME[path.extname(f)]||'application/octet-stream');fs.createReadStream(f).pipe(res);}else{res.statusCode=404;res.end();}});s.listen(4429,()=>r(s));});
const b=await chromium.launch({executablePath:'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',headless:true});
const p=await b.newPage({viewport:{width:1440,height:900}});
const err=[]; p.on('pageerror',e=>err.push(e.message));
await p.goto('http://localhost:4429/',{waitUntil:'networkidle'});
await p.waitForTimeout(4000);
const H=await p.evaluate(()=>{const a=document.querySelector('[data-act="produttori"]');return Math.round(a.getBoundingClientRect().top+scrollY);});
const f=await p.evaluate(()=>{
  const t=document.querySelector('.stage-text__hero,.stage-text__title');
  return t?getComputedStyle(t).fontFamily:'?';});
console.log('font display:', f);
/* una didascalia su pergamena */
let y0=null;
for(let i=0;i<80 && !y0;i++){
  const y=Math.round(H*(0.02+i*0.005));
  await p.evaluate(v=>window.scrollTo(0,v), y);
  await p.waitForTimeout(220);
  const r=await p.evaluate(()=>{const c=document.querySelector('.stage-text.acceso:not(.capitolo)');
    return c ? {y:scrollY, op:+getComputedStyle(c.firstElementChild).opacity} : null;});
  if(r && r.op>0.88) y0=r.y;
}
if(y0){ await p.evaluate(v=>window.scrollTo(0,v), y0); await p.waitForTimeout(1000);
  await p.screenshot({path:'lab/shots/perg-palco.png', clip:{x:0,y:0,width:1440,height:900}}); }
await p.evaluate(y=>window.scrollTo(0,y+700), H);
await p.waitForTimeout(1500);
await p.screenshot({path:'lab/shots/perg-schede.png', clip:{x:0,y:0,width:1440,height:900}});
console.log('pageerror:', err.length);
await b.close(); srv.close();
