import { chromium } from 'playwright-core';
import http from 'http'; import fs from 'fs'; import path from 'path';
const DIST=path.resolve('dist');
const MIME={'.html':'text/html','.js':'application/javascript','.css':'text/css','.webp':'image/webp','.json':'application/json','.woff2':'font/woff2'};
const srv=await new Promise(r=>{const s=http.createServer((q,res)=>{let u=decodeURIComponent(q.url.split('?')[0]);if(u==='/')u='/index.html';const f=path.join(DIST,u);if(fs.existsSync(f)&&fs.statSync(f).isFile()){res.setHeader('Content-Type',MIME[path.extname(f)]||'application/octet-stream');fs.createReadStream(f).pipe(res);}else{res.statusCode=404;res.end();}});s.listen(4418,()=>r(s));});
const b=await chromium.launch({executablePath:'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',headless:true});
const p=await b.newPage({viewport:{width:1440,height:900}});
await p.goto('http://localhost:4418/',{waitUntil:'domcontentloaded'});
await p.waitForTimeout(2500);
const info=await p.evaluate(()=>{
  const caps=[...document.querySelectorAll('.cap')];
  return {n:caps.length, righe:caps.map(c=>{
    const r=c.getBoundingClientRect();
    const fig=c.querySelector('.cap__fig'), txt=c.querySelector('.cap__testo');
    const cs=getComputedStyle(c);
    return {top:Math.round(r.top+scrollY), h:Math.round(r.height),
      figX:Math.round(fig.getBoundingClientRect().x), txtX:Math.round(txt.getBoundingClientRect().x),
      fondo:cs.backgroundColor};
  })};
});
console.log('capitoli:',info.n);
info.righe.forEach((r,i)=>console.log(`  ${i+1}: top ${r.top} h ${r.h} · fig@${r.figX} testo@${r.txtX} · ${r.fondo}`));
await p.evaluate(y=>window.scrollTo(0,y), info.righe[0].top);
await p.waitForTimeout(900);
await p.screenshot({path:'lab/shots/cap-1.png', clip:{x:0,y:0,width:1440,height:900}});
await p.evaluate(y=>window.scrollTo(0,y), info.righe[2].top);
await p.waitForTimeout(900);
await p.screenshot({path:'lab/shots/cap-3.png', clip:{x:0,y:0,width:1440,height:900}});
await b.close(); srv.close();
