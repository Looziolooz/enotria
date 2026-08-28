import { chromium } from 'playwright-core';
import http from 'http'; import fs from 'fs'; import path from 'path';
const DIST=path.resolve('dist');
const MIME={'.html':'text/html','.js':'application/javascript','.css':'text/css','.webp':'image/webp','.json':'application/json','.woff2':'font/woff2','.png':'image/png'};
const srv=await new Promise(r=>{const s=http.createServer((q,res)=>{let u=decodeURIComponent(q.url.split('?')[0]);if(u==='/')u='/index.html';const f=path.join(DIST,u);if(fs.existsSync(f)&&fs.statSync(f).isFile()){res.setHeader('Content-Type',MIME[path.extname(f)]||'application/octet-stream');fs.createReadStream(f).pipe(res);}else{res.statusCode=404;res.end();}});s.listen(4425,()=>r(s));});
const b=await chromium.launch({executablePath:'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',headless:true});
const p=await b.newPage({viewport:{width:1440,height:900}});
await p.goto('http://localhost:4425/',{waitUntil:'networkidle'});
await p.waitForTimeout(3500);
const H=await p.evaluate(()=>{const a=document.querySelector('[data-act="produttori"]');return Math.round(a.getBoundingClientRect().top+scrollY);});
/* cerco dove il capitolo greco e' acceso */
let trovato=null;
for(let i=0;i<=60 && !trovato;i++){
  const y=Math.round(H*(0.10+i*0.002));
  await p.evaluate(v=>window.scrollTo(0,v), y);
  await p.waitForTimeout(240);
  const r=await p.evaluate(()=>{
    const c=document.querySelector('.stage-text.capitolo.acceso');
    if(!c) return null;
    const t=c.querySelector('.stage-text__capitolo'), m=c.querySelector('.stage-text__meta');
    return {testo:(t&&t.textContent||'').slice(0,20), meta:(m&&m.textContent)||'(nessuno)',
            op:+getComputedStyle(c.firstElementChild).opacity};
  });
  if(r && r.op>0.8) trovato={y,...r};
}
if(trovato){
  console.log('capitolo a y='+trovato.y+' · testo "'+trovato.testo+'" · sotto: "'+trovato.meta+'"');
  await p.screenshot({path:'lab/shots/capitolo-leggibile.png', clip:{x:0,y:0,width:1440,height:900}});
} else console.log('capitolo non trovato acceso');
await b.close(); srv.close();
