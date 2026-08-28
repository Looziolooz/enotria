import { chromium } from 'playwright-core';
import http from 'http'; import fs from 'fs'; import path from 'path';
const DIST=path.resolve('dist');
const MIME={'.html':'text/html','.js':'application/javascript','.css':'text/css','.webp':'image/webp','.json':'application/json','.woff2':'font/woff2','.png':'image/png'};
const srv=await new Promise(r=>{const s=http.createServer((q,res)=>{let u=decodeURIComponent(q.url.split('?')[0]);if(u==='/')u='/index.html';const f=path.join(DIST,u);if(fs.existsSync(f)&&fs.statSync(f).isFile()){res.setHeader('Content-Type',MIME[path.extname(f)]||'application/octet-stream');fs.createReadStream(f).pipe(res);}else{res.statusCode=404;res.end();}});s.listen(4423,()=>r(s));});
const b=await chromium.launch({executablePath:'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',headless:true});
const p=await b.newPage({viewport:{width:1440,height:900}});
const err=[]; p.on('pageerror',e=>err.push(e.message));
await p.goto('http://localhost:4423/',{waitUntil:'networkidle'});
await p.waitForTimeout(3500);
const stageH=await p.evaluate(()=>{const a=document.querySelector('[data-act="produttori"]');return Math.round(a.getBoundingClientRect().top+scrollY);});
/* la hero e' a at 0.008: campiono l'ingresso in quattro momenti */
const serie=[];
for(const at of [0.1900,0.1945,0.1990,0.2100]){
  await p.evaluate(v=>window.scrollTo(0,v), Math.round(at*stageH));
  await p.waitForTimeout(1400);
  const r=await p.evaluate(()=>{
    const bl=document.querySelector('.stage-text.acceso');const t=bl&&bl.querySelector('.stage-text__title, .stage-text__hero, .stage-text__capitolo');
    if(!t) return null;
    return {rivela:getComputedStyle(t).getPropertyValue('--rivela').trim(),
            op:+getComputedStyle(t.closest('.stage-text__inner')||t).opacity};
  });
  serie.push(`${(at*100).toFixed(2)}% → --rivela ${r?r.rivela:'?'}`);
  await p.screenshot({path:`lab/shots/riv-${(at*10000).toFixed(0)}.png`, clip:{x:0,y:0,width:1440,height:900}});
}
serie.forEach(x=>console.log('  '+x));
console.log('pageerror:', err.length);
await b.close(); srv.close();
