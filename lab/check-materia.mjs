import { chromium } from 'playwright-core';
import http from 'http'; import fs from 'fs'; import path from 'path';
const DIST=path.resolve('dist');
const MIME={'.html':'text/html','.js':'application/javascript','.css':'text/css','.webp':'image/webp','.json':'application/json','.woff2':'font/woff2'};
const srv=await new Promise(r=>{const s=http.createServer((q,res)=>{let u=decodeURIComponent(q.url.split('?')[0]);if(u==='/')u='/index.html';const f=path.join(DIST,u);if(fs.existsSync(f)&&fs.statSync(f).isFile()){res.setHeader('Content-Type',MIME[path.extname(f)]||'application/octet-stream');fs.createReadStream(f).pipe(res);}else{res.statusCode=404;res.end();}});s.listen(4411,()=>r(s));});
const b=await chromium.launch({executablePath:'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',headless:true});
const p=await b.newPage({viewport:{width:1440,height:900}});
const err=[]; p.on('pageerror',e=>err.push(e.message));
await p.goto('http://localhost:4411/',{waitUntil:'networkidle'});
await p.waitForTimeout(2200);
const H=await p.evaluate(()=>document.body.scrollHeight);
for(const [nome,frac] of [['titolo-hero',0.021],['nota-pergamena',0.142],['chiusa',0.978]]){
  await p.evaluate(v=>window.scrollTo(0,v), Math.round(H*frac));
  await p.waitForTimeout(1700);
  await p.screenshot({path:`lab/shots/materia-${nome}.png`, clip:{x:0,y:0,width:1440,height:900}});
}
const r=await p.evaluate(()=>({
  pennellate:document.querySelectorAll('.stage-text.pennellata').length,
  pergamene:document.querySelectorAll('.stage-text.pergamena').length,
  numerale:(document.querySelector('.stage-text__label')||{}).textContent||'',
}));
console.log(JSON.stringify(r)); console.log('pageerror:',err.length);
await b.close(); srv.close();
