import { chromium } from 'playwright-core';
import http from 'http'; import fs from 'fs'; import path from 'path';
const DIST=path.resolve('dist');
const MIME={'.html':'text/html','.js':'application/javascript','.css':'text/css','.webp':'image/webp','.json':'application/json','.woff2':'font/woff2','.png':'image/png'};
const srv=await new Promise(r=>{const s=http.createServer((q,res)=>{let u=decodeURIComponent(q.url.split('?')[0]);if(u==='/')u='/index.html';const f=path.join(DIST,u);if(fs.existsSync(f)&&fs.statSync(f).isFile()){res.setHeader('Content-Type',MIME[path.extname(f)]||'application/octet-stream');fs.createReadStream(f).pipe(res);}else{res.statusCode=404;res.end();}});s.listen(4430,()=>r(s));});
const b=await chromium.launch({executablePath:'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',headless:true});
const p=await b.newPage({viewport:{width:1440,height:900}});
const err=[]; p.on('pageerror',e=>err.push(e.message));
await p.goto('http://localhost:4430/',{waitUntil:'networkidle'});
await p.waitForTimeout(3800);
const H=await p.evaluate(()=>{const a=document.querySelector('[data-act="produttori"]');return Math.round(a.getBoundingClientRect().top+scrollY);});
const at=0.396, w=0.05;
for(const [nome,off] of [['a',-0.028],['b',-0.010],['c',0.008],['d',0.026]]){
  await p.evaluate(v=>window.scrollTo(0,v), Math.round((at+off)*H));
  await p.waitForTimeout(1500);
  await p.screenshot({path:`lab/shots/porte-${nome}.png`, clip:{x:0,y:0,width:1440,height:900}});
}
console.log('pageerror:', err.length);
await b.close(); srv.close();
