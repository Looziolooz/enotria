import { chromium } from 'playwright-core';
import http from 'http'; import fs from 'fs'; import path from 'path';
const DIST=path.resolve('dist');
const MIME={'.html':'text/html','.js':'application/javascript','.css':'text/css','.webp':'image/webp','.json':'application/json','.woff2':'font/woff2'};
const srv=await new Promise(r=>{const s=http.createServer((q,res)=>{let u=decodeURIComponent(q.url.split('?')[0]);if(u==='/')u='/index.html';const f=path.join(DIST,u);if(fs.existsSync(f)&&fs.statSync(f).isFile()){res.setHeader('Content-Type',MIME[path.extname(f)]||'application/octet-stream');fs.createReadStream(f).pipe(res);}else{res.statusCode=404;res.end();}});s.listen(4416,()=>r(s));});
const b=await chromium.launch({executablePath:'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',headless:true});
const p=await b.newPage({viewport:{width:1440,height:900}});
const err=[]; p.on('pageerror',e=>err.push(e.message));
await p.goto('http://localhost:4416/',{waitUntil:'networkidle'});
await p.waitForTimeout(4000);
const stageH=47700;
const righe=[];
for(const at of [0.045,0.100,0.245,0.470,0.660,0.890]){
  await p.evaluate(v=>window.scrollTo(0,v), Math.round(at*stageH));
  await p.waitForTimeout(1300);
  const r=await p.evaluate(()=>{
    const c=document.querySelector('.inserti');
    const vis=[...document.querySelectorAll('.inserto')].filter(n=>+n.style.opacity>0.05);
    return {tono:c&&c.classList.contains('inserti--inchiostro')?'inchiostro':'calce',
      visibili:vis.length, op:vis.map(n=>(+n.style.opacity).toFixed(2)).join(',')};
  });
  righe.push(`${(at*100).toFixed(1)}% → ${r.tono}, ${r.visibili} segno/i (${r.op})`);
}
righe.forEach(x=>console.log('  '+x));
await p.evaluate(v=>window.scrollTo(0,v), Math.round(0.245*stageH));
await p.waitForTimeout(1500);
await p.screenshot({path:'lab/shots/inserti.png', clip:{x:0,y:0,width:1440,height:900}});
console.log('pageerror:',err.length);
await b.close(); srv.close();
