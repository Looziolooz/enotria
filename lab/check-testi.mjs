import { chromium } from 'playwright-core';
import http from 'http'; import fs from 'fs'; import path from 'path';
const DIST=path.resolve('dist');
const MIME={'.html':'text/html','.js':'application/javascript','.css':'text/css','.webp':'image/webp','.json':'application/json','.woff2':'font/woff2'};
const srv=await new Promise(r=>{const s=http.createServer((q,res)=>{let u=decodeURIComponent(q.url.split('?')[0]);if(u==='/')u='/index.html';const f=path.join(DIST,u);if(fs.existsSync(f)&&fs.statSync(f).isFile()){res.setHeader('Content-Type',MIME[path.extname(f)]||'application/octet-stream');fs.createReadStream(f).pipe(res);}else{res.statusCode=404;res.end();}});s.listen(4407,()=>r(s));});
const b=await chromium.launch({executablePath:'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',headless:true});
const p=await b.newPage({viewport:{width:1440,height:900}});
const err=[]; p.on('pageerror',e=>err.push(e.message)); p.on('console',m=>{if(m.type()==='error')err.push('console: '+m.text());});
await p.goto('http://localhost:4407/',{waitUntil:'networkidle'});
await p.waitForTimeout(2500);
const info=await p.evaluate(()=>({
  blocchi:[...document.querySelectorAll('.stage-text[data-stage-text]')].map(d=>({at:d.dataset.at,cls:d.className,txt:(d.textContent||'').trim().slice(0,40)})),
  container:!!document.getElementById('stage-copy'),
  altezza:document.body.scrollHeight,
}));
console.log('container stage-copy:',info.container);
console.log('blocchi generati:',info.blocchi.length);
info.blocchi.slice(0,20).forEach(x=>console.log('  at',x.at,'|',x.txt));
console.log('altezza:',info.altezza);
if(err.length){console.log('ERRORI:');err.slice(0,6).forEach(e=>console.log(' ',e));}else console.log('nessun errore');
await b.close(); srv.close();
