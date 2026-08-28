import { chromium } from 'playwright-core';
import { execFileSync } from 'child_process';
import http from 'http'; import fs from 'fs'; import path from 'path';
const DIST=path.resolve('dist');
const MIME={'.html':'text/html','.js':'application/javascript','.css':'text/css','.webp':'image/webp','.json':'application/json','.woff2':'font/woff2'};
const srv=await new Promise(r=>{const s=http.createServer((q,res)=>{let u=decodeURIComponent(q.url.split('?')[0]);if(u==='/')u='/index.html';const f=path.join(DIST,u);if(fs.existsSync(f)&&fs.statSync(f).isFile()){res.setHeader('Content-Type',MIME[path.extname(f)]||'application/octet-stream');fs.createReadStream(f).pipe(res);}else{res.statusCode=404;res.end();}});s.listen(4417,()=>r(s));});
const b=await chromium.launch({executablePath:'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',headless:true});
const p=await b.newPage({viewport:{width:1440,height:900}});
const err=[]; p.on('pageerror',e=>err.push(e.message));
await p.goto('http://localhost:4417/',{waitUntil:'networkidle'});
await p.waitForTimeout(4000);
const stageH=47700;
function px(png){return execFileSync('ffmpeg',['-v','error','-f','image2pipe','-i','pipe:0','-vf','scale=64:36','-f','rawvideo','-pix_fmt','rgb24','pipe:1'],{input:png,maxBuffer:1<<24});}
function diff(a,b){const A=px(a),B=px(b);let s=0;for(let i=0;i<A.length;i++)s+=Math.abs(A[i]-B[i]);return s/A.length;}
const nomi={0:'sinistra',1:'destra',2:'centro',4:'iride',5:'veneziana',6:'serranda',7:'pixel',8:'sfalsata'};
const tagli=JSON.parse(fs.readFileSync('public/dati/tagli.json','utf8')).tagli;
/* tre tagli: campiono attraverso la finestra e verifico che l'effetto lavori */
for(const t of [tagli[0],tagli[3],tagli[11]]){
  const scatti=[];
  for(const off of [-0.014,-0.006,0,0.006,0.014]){
    await p.evaluate(v=>window.scrollTo(0,v), Math.round((t.at+off)*stageH));
    await p.waitForTimeout(1100);
    scatti.push(await p.screenshot({clip:{x:0,y:0,width:1440,height:900}}));
  }
  const d=[]; for(let i=1;i<scatti.length;i++) d.push(diff(scatti[i-1],scatti[i]).toFixed(1));
  const modo=await p.evaluate(()=>window.__modoTaglio);
  console.log(`  ${(t.at*100).toFixed(1)}%  ${nomi[t.modo].padEnd(10)} differenze: ${d.join(' · ')}`);
  fs.writeFileSync(`lab/shots/taglio-${nomi[t.modo]}.png`, scatti[2]);
}
console.log('pageerror:',err.length);
await b.close(); srv.close();
