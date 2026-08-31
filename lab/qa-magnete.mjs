/* QA delle schede magnetiche: clicca due punti e verifica che la scheda
   si apra vicino al punto (non nel pannello lontano) e che ci scivoli. */
import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';
const dormi = (ms) => new Promise((r) => setTimeout(r, ms));
const chrome = spawn('C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  ['--headless', '--enable-unsafe-swiftshader', '--hide-scrollbars', '--remote-debugging-port=9390',
   '--user-data-dir=' + process.env.TEMP + '/qa-mag', '--window-size=1400,900', 'about:blank'], { stdio: 'ignore' });
let wsUrl;
for (let i = 0; i < 26; i++) {
  try { const r = await fetch('http://127.0.0.1:9390/json'); const t = (await r.json()).find((x) => x.type === 'page'); if (t) { wsUrl = t.webSocketDebuggerUrl; break; } } catch {}
  await dormi(500);
}
const ws = new WebSocket(wsUrl);
await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
let seq = 0; const A = new Map();
ws.onmessage = (e) => { const m = JSON.parse(e.data); if (m.id && A.has(m.id)) { A.get(m.id)(m.result); A.delete(m.id); } };
const cmd = (m, p = {}) => new Promise((res) => { const id = ++seq; A.set(id, res); ws.send(JSON.stringify({ id, method: m, params: p })); });
const ev = async (x) => { const r = await cmd('Runtime.evaluate', { expression: x, returnByValue: true }); return r && r.result ? r.result.value : undefined; };
await cmd('Page.enable'); await cmd('Runtime.enable');
await cmd('Page.navigate', { url: 'http://localhost:4180/' });
await dormi(7000);
await ev("document.querySelector('.cartina__mappa').scrollIntoView({block:'center'})");
await dormi(1200);
for (const [nome, sel] of [['ciro', 2], ['cosenza', 8]]) {
  await ev(`(function(){var p=document.querySelectorAll('.cartina__punto')[${sel}]; p.dispatchEvent(new MouseEvent('click',{bubbles:true}));})()`);
  await dormi(900);
  const m = await ev(`(function(){
    var mg=document.querySelector('.cartina__magnete'); var p=document.querySelectorAll('.cartina__punto')[${sel}];
    if(!mg||!p) return 'assente';
    var a=mg.getBoundingClientRect(), b=p.getBoundingClientRect();
    var dx=Math.round(Math.abs((a.left+a.width/2)-(b.left+b.width/2)));
    var dy=Math.round(Math.abs((a.top+a.height/2)-(b.top+b.height/2)));
    return JSON.stringify({aperta:mg.classList.contains('aperta'), distanzaX:dx, distanzaY:dy, titolo:(mg.textContent.match(/[A-ZÀ-Ú][^\n]{3,40}/)||[''])[0].trim()});
  })()`);
  console.log(nome, '→', m);
  const s = await cmd('Page.captureScreenshot', { format: 'jpeg', quality: 76 });
  writeFileSync(`lab/qa-shots-final/magnete-${nome}.jpg`, Buffer.from(s.data, 'base64'));
}
ws.close(); chrome.kill(); process.exit(0);
