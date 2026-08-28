import { chromium } from 'playwright-core';
import http from 'http'; import fs from 'fs'; import path from 'path';
const DIST=path.resolve('dist');
const MIME={'.html':'text/html','.js':'application/javascript','.css':'text/css','.webp':'image/webp','.json':'application/json','.woff2':'font/woff2','.png':'image/png'};
const srv=await new Promise(r=>{const s=http.createServer((q,res)=>{let u=decodeURIComponent(q.url.split('?')[0]);if(u==='/')u='/index.html';const f=path.join(DIST,u);if(fs.existsSync(f)&&fs.statSync(f).isFile()){res.setHeader('Content-Type',MIME[path.extname(f)]||'application/octet-stream');fs.createReadStream(f).pipe(res);}else{res.statusCode=404;res.end();}});s.listen(4424,()=>r(s));});
const b=await chromium.launch({executablePath:'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',headless:true});
const p=await b.newPage({viewport:{width:1440,height:900}});
await p.goto('http://localhost:4424/',{waitUntil:'networkidle'});
await p.waitForTimeout(3500);
const H=await p.evaluate(()=>{const a=document.querySelector('[data-act="produttori"]');return Math.round(a.getBoundingClientRect().top+scrollY);});
const trovati=[];
for(let i=0;i<=44;i++){
  const y=Math.round(H*(0.150+i*0.0025));
  await p.evaluate(v=>window.scrollTo(0,v), y);
  await p.waitForTimeout(260);
  const r=await p.evaluate(()=>{
    const bl=document.querySelector('.stage-text.acceso');
    if(!bl) return null;
    const t=bl.querySelector('.stage-text__title, .stage-text__hero, .stage-text__capitolo');
    if(!t) return null;
    return {at:bl.dataset.at, riv:getComputedStyle(t).getPropertyValue('--rivela').trim()};
  });
  if(r && r.riv && parseFloat(r.riv)<111) trovati.push({y, ...r});
}
console.log('posizioni con maschera a meta corsa:', trovati.length);
trovati.slice(0,6).forEach(x=>console.log('  y='+x.y+'  beat@'+x.at+'  --rivela '+x.riv));
if(trovati.length){
  const m=trovati[Math.floor(trovati.length/2)];
  await p.evaluate(v=>window.scrollTo(0,v), m.y);
  await p.waitForTimeout(900);
  await p.screenshot({path:'lab/shots/rivelazione.png', clip:{x:0,y:0,width:1440,height:900}});
  console.log('scatto a y='+m.y+' con --rivela '+m.riv);
}
await b.close(); srv.close();
