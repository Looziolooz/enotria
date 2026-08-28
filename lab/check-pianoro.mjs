import { chromium } from 'playwright-core';
import http from 'http'; import fs from 'fs'; import path from 'path';
const DIST=path.resolve('dist');
const MIME={'.html':'text/html','.js':'application/javascript','.css':'text/css','.webp':'image/webp','.json':'application/json','.woff2':'font/woff2'};
const srv=await new Promise(r=>{const s=http.createServer((q,res)=>{let u=decodeURIComponent(q.url.split('?')[0]);if(u==='/')u='/index.html';const f=path.join(DIST,u);if(fs.existsSync(f)&&fs.statSync(f).isFile()){res.setHeader('Content-Type',MIME[path.extname(f)]||'application/octet-stream');fs.createReadStream(f).pipe(res);}else{res.statusCode=404;res.end();}});s.listen(4413,()=>r(s));});
const b=await chromium.launch({executablePath:'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',headless:true});
const p=await b.newPage({viewport:{width:1440,height:900}});
await p.goto('http://localhost:4413/',{waitUntil:'networkidle'});
await p.waitForTimeout(2200);
const H=await p.evaluate(()=>document.body.scrollHeight);
/* battuta della colonia (at 0.386 sul palco): campiono la sua finestra */
const at=0.386, stageH=47700;
const serie=[];
for(const off of [-0.020,-0.012,-0.006,0,0.006,0.012,0.018,0.024]){
  await p.evaluate(v=>window.scrollTo(0,v), Math.round((at+off)*stageH));
  await p.waitForTimeout(1100);
  const op=await p.evaluate(()=>{
    const a=document.querySelector('.stage-text.acceso');
    return a?+getComputedStyle(a.firstElementChild).opacity:0;
  });
  serie.push(`${off>=0?'+':''}${(off*1000).toFixed(0)}‰:${op.toFixed(2)}`);
}
console.log('opacita lungo la finestra:', serie.join('  '));
await p.evaluate(v=>window.scrollTo(0,v), Math.round(at*stageH));
await p.waitForTimeout(1400);
await p.screenshot({path:'lab/shots/pianoro-colonia.png', clip:{x:0,y:0,width:1440,height:900}});
await b.close(); srv.close();
