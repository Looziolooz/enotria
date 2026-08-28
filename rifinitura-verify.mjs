/**
 * rifinitura-verify.mjs — v5: proper posti + video via window.__vidData
 */
import { chromium } from 'playwright-core';
import { execSync } from 'child_process';
import { mkdirSync } from 'fs';
import { createHash } from 'crypto';
const CHROME = 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe';
const URL = 'http://localhost:4321';
const SHOTS = 'lab/shots';
mkdirSync(SHOTS, { recursive: true });
async function main() {
  const R = {};
  try {
    const o = execSync('node C:/tmp/auteur-tools/slopscan.mjs .', { cwd: 'C:/Users/loren/Desktop/dev-projects/oenotria', encoding: 'utf-8', timeout: 30000 });
    R.slopscan = o.trim(); R.slopscanPass = /0\s+fails/.test(o);
  } catch(e) { R.slopscan = (e.stdout||'')+(e.stderr||e.message); R.slopscanPass = false; }
  const browser = await chromium.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox','--autoplay-policy=no-user-gesture-required'] });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(e.message));
  await page.goto(URL, { waitUntil: 'networkidle', timeout: 15000 });
  await page.waitForTimeout(3000);
  const sh = await page.evaluate(() => document.documentElement.scrollHeight - window.innerHeight);

  /* 1a AUTOPLAY */
  const tests = [{n:'atto-IV',p:0.487},{n:'atto-V',p:0.630},{n:'atto-VI',p:0.773}];
  const autoR = [];
  for (const t of tests) {
    await page.evaluate(sy => window.scrollTo(0, sy), Math.round(sh*t.p));
    await page.waitForTimeout(2500);
    const s1 = await page.evaluate(() => { const d=window.__vidData; if(!d)return null; return d.map((v,i)=>v?{i,pa:v.video.paused,t:v.video.currentTime,r:v.video.readyState,l:v.video.loop}:null); });
    await page.waitForTimeout(1500);
    const s2 = await page.evaluate(() => { const d=window.__vidData; if(!d)return null; return d.map((v,i)=>v?{i,pa:v.video.paused,t:v.video.currentTime,r:v.video.readyState}:null); });
    let any=false, mdt=0;
    if(s1&&s2) for(let i=0;i<s1.length;i++){if(s1[i]&&!s1[i].pa)any=true; if(s1[i]&&s2[i]){const dt=Math.abs(s2[i].t-s1[i].t); if(dt>mdt)mdt=dt;}}
    const ss1=await page.screenshot(); await page.waitForTimeout(1500); const ss2=await page.screenshot();
    const si=createHash('md5').update(ss1).digest('hex')===createHash('md5').update(ss2).digest('hex');
    autoR.push({n:t.n,any,mdt:Math.round(mdt*1000)/1000,si,s1,s2});
  }
  R.auto=autoR;

  /* 1b POSTI */
  R.pos = await page.evaluate(() => {
    const bs=document.querySelectorAll('.stage-text[data-stage-text]');
    const res=[];
    for(let i=0;i<Math.min(8,bs.length);i++){
      const b=bs[i], m=b.className.match(/st-(sl|tr|bl|cr|tl|br)/), pos=m?m[0]:'??';
      const cs=getComputedStyle(b), txt=(b.querySelector('.stage-text__title')||b.querySelector('.stage-text__body')||b).textContent?.slice(0,40);
      res.push({i:i+1,pos,l:cs.left,r:cs.right,t:cs.top,b:cs.bottom,mw:cs.maxWidth,txt});
    }
    return res;
  });

  /* 1c LETTERE */
  R.let = await page.evaluate(() => {
    for(const b of document.querySelectorAll('.stage-text[data-stage-text]')){
      const ti=b.querySelector('.stage-text__title'); if(!ti)continue;
      const sp=ti.querySelectorAll('.sl'); if(!sp.length)continue;
      const dl=Array.from(sp).map(s=>parseFloat(s.style.transitionDelay));
      let mono=true; for(let i=1;i<dl.length;i++){if(dl[i]<=dl[i-1]){mono=false;break;}}
      b.classList.add('acceso'); const op=getComputedStyle(sp[0]).opacity;
      return {n:sp.length,dl:dl.slice(0,10),mono,op,ok:mono&&sp.length>3};
    }
    return null;
  });

  /* 2 24 SHOTS */
  for(let i=0;i<24;i++){
    const y=Math.round((sh*i)/23);
    await page.evaluate(sy=>window.scrollTo(0,sy),y);
    await page.waitForTimeout(400);
    await page.screenshot({path:`${SHOTS}/${String(i+1).padStart(2,'0')}-pos${String(y).padStart(7,'0')}.png`});
  }
  R.ph=await page.evaluate(()=>document.documentElement.scrollHeight);

  /* REPORT */
  console.log('\n=== RIFINITURA FINALE ===\n');
  console.log('1a AUTOPLAY:');
  for(const r of autoR){
    console.log('  '+r.n+': playing='+!r.any+' dt='+r.mdt+'s ssDiff='+!r.si);
    if(r.s1) r.s1.forEach(v=>{if(v)console.log('    vid['+v.i+']: paused='+v.pa+' t='+v.t.toFixed(3)+' ready='+v.r+' loop='+v.l);});
  }
  console.log('\n1b POSTI:');
  for(const p of R.pos) console.log('  #'+p.i+' ['+p.pos+'] L:'+p.l+' R:'+p.r+' T:'+p.t+' B:'+p.b+' "'+p.txt+'"');
  console.log('\n1c LETTERE:');
  if(R.let) console.log('  span='+R.let.n+' mono='+R.let.mono+' op='+R.let.op+' delays='+R.let.dl.join(', ')+'ms -> '+(R.let.ok?'PASS':'FAIL'));
  console.log('\n1d pageerror: '+(errs.length===0?'zero PASS':errs.length+' FAIL'));
  errs.forEach(e=>console.log('  -> '+e));
  console.log('  slopscan: '+(R.slopscanPass?'0 fails PASS':'FAIL'));
  console.log('  '+R.slopscan);
  console.log('  altezza: '+R.ph+'px');
  console.log('\n2 24 SCREENSHOT in lab/shots/');
  await browser.close();
}
main().catch(e=>{console.error(e);process.exit(1);});
