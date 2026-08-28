import { chromium } from 'playwright-core';
import http from 'http'; import fs from 'fs'; import path from 'path';
const DIST=path.resolve('dist');
const MIME={'.html':'text/html','.js':'application/javascript','.css':'text/css','.webp':'image/webp','.json':'application/json','.woff2':'font/woff2'};
const srv=await new Promise(r=>{const s=http.createServer((q,res)=>{let u=decodeURIComponent(q.url.split('?')[0]);if(u==='/')u='/index.html';const f=path.join(DIST,u);if(fs.existsSync(f)&&fs.statSync(f).isFile()){res.setHeader('Content-Type',MIME[path.extname(f)]||'application/octet-stream');fs.createReadStream(f).pipe(res);}else{res.statusCode=404;res.end();}});s.listen(4410,()=>r(s));});
const b=await chromium.launch({executablePath:'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',headless:true});
const p=await b.newPage({viewport:{width:1440,height:900}});
await p.goto('http://localhost:4410/',{waitUntil:'networkidle'});
await p.waitForTimeout(2200);
const H=await p.evaluate(()=>document.body.scrollHeight);
await p.evaluate(v=>window.scrollTo(0,v), Math.round(H*0.215));
await p.waitForTimeout(1600);
const r=await p.evaluate(()=>{
  const a=document.querySelector('.stage-text.acceso');
  if(!a) return {acceso:false};
  const rect=a.getBoundingClientRect();
  const inner=a.firstElementChild;
  const ri=inner.getBoundingClientRect();
  const cs=getComputedStyle(a), ci=getComputedStyle(inner);
  return {cls:a.className, rect:{x:Math.round(rect.x),y:Math.round(rect.y),w:Math.round(rect.width),h:Math.round(rect.height)},
    innerRect:{x:Math.round(ri.x),y:Math.round(ri.y),w:Math.round(ri.width),h:Math.round(ri.height)},
    blocco:{pos:cs.position, display:cs.display, opacity:cs.opacity, visibility:cs.visibility, zIndex:cs.zIndex},
    inner:{opacity:ci.opacity, transform:ci.transform.slice(0,60), mask:(ci.maskImage||ci.webkitMaskImage||'').slice(0,40)},
    genitore: a.parentElement.id || a.parentElement.className,
    genitoreCS: (()=>{const g=getComputedStyle(a.parentElement);return {pos:g.position,z:g.zIndex,h:Math.round(a.parentElement.getBoundingClientRect().height)}})(),
  };
});
console.log(JSON.stringify(r,null,1));
await b.close(); srv.close();
