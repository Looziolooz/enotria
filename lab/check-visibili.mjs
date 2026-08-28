import { chromium } from 'playwright-core';
import http from 'http'; import fs from 'fs'; import path from 'path';
const DIST=path.resolve('dist');
const MIME={'.html':'text/html','.js':'application/javascript','.css':'text/css','.webp':'image/webp','.json':'application/json','.woff2':'font/woff2'};
const srv=await new Promise(r=>{const s=http.createServer((q,res)=>{let u=decodeURIComponent(q.url.split('?')[0]);if(u==='/')u='/index.html';const f=path.join(DIST,u);if(fs.existsSync(f)&&fs.statSync(f).isFile()){res.setHeader('Content-Type',MIME[path.extname(f)]||'application/octet-stream');fs.createReadStream(f).pipe(res);}else{res.statusCode=404;res.end(u);}});s.listen(4408,()=>r(s));});
const b=await chromium.launch({executablePath:'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',headless:true});
const p=await b.newPage({viewport:{width:1440,height:900}});
const quattroCentoQuattro=[]; p.on('response',r=>{if(r.status()===404)quattroCentoQuattro.push(r.url().split('/').slice(-3).join('/'));});
await p.goto('http://localhost:4408/',{waitUntil:'networkidle'});
await p.waitForTimeout(2000);
const H=await p.evaluate(()=>document.body.scrollHeight);
console.log('altezza',H);
for(const frac of [0.02,0.08,0.15,0.22,0.33,0.45,0.57,0.68,0.80,0.92]){
  await p.evaluate(v=>window.scrollTo(0,v), Math.round(H*frac));
  await p.waitForTimeout(1200);
  const r=await p.evaluate(()=>{
    const vis=[...document.querySelectorAll('.stage-text[data-stage-text]')]
      .map(d=>({at:+d.dataset.at, op:+(d.firstElementChild?getComputedStyle(d.firstElementChild).opacity:0)}))
      .filter(x=>x.op>0.05);
    return {attuale:window.__attuale, vis:vis.map(v=>v.at+'@'+v.op.toFixed(2))};
  });
  console.log(`  ${(frac*100).toFixed(0).padStart(3)}%  __attuale=${r.attuale===undefined?'undef':(+r.attuale).toFixed(3)}  visibili: ${r.vis.length? r.vis.join(' '):'—'}`);
}
console.log('404 unici:', [...new Set(quattroCentoQuattro)].slice(0,5));
await b.close(); srv.close();
