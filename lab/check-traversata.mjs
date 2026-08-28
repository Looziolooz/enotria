import { chromium } from 'playwright-core';
import http from 'http'; import fs from 'fs'; import path from 'path';
const DIST=path.resolve('dist');
const MIME={'.html':'text/html','.js':'application/javascript','.css':'text/css','.webp':'image/webp','.json':'application/json','.woff2':'font/woff2','.png':'image/png'};
const srv=await new Promise(r=>{const s=http.createServer((q,res)=>{let u=decodeURIComponent(q.url.split('?')[0]);if(u==='/')u='/index.html';const f=path.join(DIST,u);if(fs.existsSync(f)&&fs.statSync(f).isFile()){res.setHeader('Content-Type',MIME[path.extname(f)]||'application/octet-stream');fs.createReadStream(f).pipe(res);}else{res.statusCode=404;res.end();}});s.listen(4419,()=>r(s));});
const b=await chromium.launch({executablePath:'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',headless:true});
const p=await b.newPage({viewport:{width:1440,height:900}});
const err=[],q404=[]; p.on('pageerror',e=>err.push(e.message));
p.on('response',r=>{if(r.status()===404)q404.push(r.url().split('/').slice(-2).join('/'));});
await p.goto('http://localhost:4419/',{waitUntil:'networkidle'});
await p.waitForTimeout(4000);
const stageH=await p.evaluate(()=>{const a=document.querySelector('[data-act="produttori"]');return Math.round(a.getBoundingClientRect().top+scrollY);});
console.log('palco alto', stageH, 'px');
for(const [nome,at] of [['mare-tempio',0.487],['tenda-mappa',0.228],['rivelazione',0.538]]){
  await p.evaluate(v=>window.scrollTo(0,v), Math.round(at*stageH));
  await p.waitForTimeout(2200);
  await p.screenshot({path:`lab/shots/tr-${nome}.png`, clip:{x:0,y:0,width:1440,height:900}});
}
console.log('pageerror:',err.length,'· 404:',[...new Set(q404)].slice(0,3));
await b.close(); srv.close();
