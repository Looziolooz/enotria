import { chromium } from 'playwright-core';
import http from 'http'; import fs from 'fs'; import path from 'path';
const DIST=path.resolve('dist');
const MIME={'.html':'text/html','.js':'application/javascript','.css':'text/css','.webp':'image/webp','.json':'application/json','.woff2':'font/woff2','.png':'image/png'};
const srv=await new Promise(r=>{const s=http.createServer((q,res)=>{let u=decodeURIComponent(q.url.split('?')[0]);if(u==='/')u='/index.html';const f=path.join(DIST,u);if(fs.existsSync(f)&&fs.statSync(f).isFile()){res.setHeader('Content-Type',MIME[path.extname(f)]||'application/octet-stream');fs.createReadStream(f).pipe(res);}else{res.statusCode=404;res.end();}});s.listen(4431,()=>r(s));});
const b=await chromium.launch({executablePath:'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',headless:true});
for (const modo of ['nudo','lastra']) {
  const p=await b.newPage({viewport:{width:1440,height:900}});
  await p.goto(`http://localhost:4431/?schede=${modo}`,{waitUntil:'networkidle'});
  await p.waitForTimeout(3800);
  const H=await p.evaluate(()=>{const a=document.querySelector('[data-act="produttori"]');return Math.round(a.getBoundingClientRect().top+scrollY);});
  /* cerco la stessa battuta in entrambi i modi */
  let y=null;
  for(let i=0;i<90 && !y;i++){
    const yy=Math.round(H*(0.06+i*0.004));
    await p.evaluate(v=>window.scrollTo(0,v), yy);
    await p.waitForTimeout(200);
    const r=await p.evaluate(()=>{const c=document.querySelector('.stage-text.acceso:not(.capitolo)');
      return c ? {y:scrollY, op:+getComputedStyle(c.firstElementChild).opacity} : null;});
    if(r && r.op>0.9) y=r.y;
  }
  if(y){ await p.evaluate(v=>window.scrollTo(0,v), y); await p.waitForTimeout(1100);
    await p.screenshot({path:`lab/shots/schede-${modo}.png`, clip:{x:0,y:0,width:1440,height:900}});
    console.log(`${modo}: scatto a y=${y}`);
  } else console.log(`${modo}: nessuna battuta trovata`);
  await p.close();
}
await b.close(); srv.close();
