/**
 * qa-ponti.mjs — fotografa l'apice di TUTTI i raccordi, nel browser.
 *
 * Serve dopo ogni rimontaggio: legge ponti.json, per ogni raccordo porta lo
 * scroll sul fotogramma d'apice e scatta. Cosi' un raccordo che si e' spostato
 * di qualche fotogramma, o un fermo-immagine sbagliato, si vede subito.
 *
 * Uso: node lab/qa-ponti.mjs [url] [dirScreenshot]
 */
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync, readFileSync } from 'node:fs';

const URL_SITO = process.argv[2] || 'http://localhost:4180/';
const DIR_SHOT = process.argv[3] || 'lab/qa-shots-ponti';
const CHROME = 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe';
const PORTA = 9338;

const nFilm = JSON.parse(readFileSync('public/dati/frames.json', 'utf8'))[0].n;
const PONTI = JSON.parse(readFileSync('public/dati/ponti.json', 'utf8')).ponti;

mkdirSync(DIR_SHOT, { recursive: true });
const chrome = spawn(CHROME, [
  '--headless', '--enable-unsafe-swiftshader', '--hide-scrollbars',
  `--remote-debugging-port=${PORTA}`, '--user-data-dir=' + process.env.TEMP + '/qa-ponti-profile',
  '--window-size=1440,810', 'about:blank',
], { stdio: 'ignore' });

const dormi = (ms) => new Promise((r) => setTimeout(r, ms));
async function targetWs() {
  for (let i = 0; i < 24; i++) {
    try {
      const tabs = await (await fetch(`http://127.0.0.1:${PORTA}/json`)).json();
      const t = tabs.find((x) => x.type === 'page');
      if (t) return t.webSocketDebuggerUrl;
    } catch { /* chrome non ancora su */ }
    await dormi(500);
  }
  throw new Error('Chrome CDP non raggiungibile');
}
let ws, seq = 0;
const attese = new Map();
const cmd = (method, params = {}) => new Promise((resolve, reject) => {
  const id = ++seq; attese.set(id, { resolve, reject });
  ws.send(JSON.stringify({ id, method, params }));
});
async function espr(expression) {
  const r = await cmd('Runtime.evaluate', { expression, returnByValue: true });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.text);
  return r.result.value;
}

try {
  ws = new WebSocket(await targetWs());
  await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
  ws.onmessage = (ev) => {
    const m = JSON.parse(ev.data);
    if (m.id && attese.has(m.id)) { attese.get(m.id).resolve(m.result); attese.delete(m.id); }
  };
  await cmd('Page.enable'); await cmd('Runtime.enable');
  await cmd('Page.navigate', { url: URL_SITO + (URL_SITO.includes('?') ? '&' : '?') + 'qa' });
  await dormi(7000);

  const letturaHud = "((document.body.innerText.match(/KAPE\\s*(\\d+)\\s*\\/\\s*(\\d+)/)||[])[1]||'—')";
  let errori = 0;
  for (const p of PONTI) {
    const apice = Math.round(p.da + (p.a - p.da) * (p.apice !== undefined ? p.apice : 0.5));
    await espr(`(() => {
      var s = document.querySelector('.stage');
      var top = s.getBoundingClientRect().top + window.scrollY;
      window.scrollTo(0, Math.round(top + (s.offsetHeight - window.innerHeight) * ${apice - 1} / ${nFilm - 1}));
    })()`);
    await dormi(2800);
    const hud = await espr(letturaHud);
    const shot = await cmd('Page.captureScreenshot', { format: 'jpeg', quality: 80 });
    writeFileSync(`${DIR_SHOT}/${String(apice).padStart(4, '0')}-${p.id}.jpg`, Buffer.from(shot.data, 'base64'));
    const ok = hud !== '—' && Math.abs(Number(hud) - apice) <= 3;
    if (!ok) errori++;
    console.log(`  ${p.id.padEnd(26)} apice f${String(apice).padStart(4)}  hud=${String(hud).padStart(4)}  `
      + `A=${p.frameA} (z ${p.A.z})  B=${p.frameB} (z ${p.B.z})  ${ok ? 'ok' : 'FUORI POSTO'}`);
  }
  console.log(`\n${PONTI.length - errori}/${PONTI.length} raccordi al loro posto · screenshot in ${DIR_SHOT}/`);
  if (errori) process.exitCode = 1;
} catch (e) {
  console.error('QA fallita:', e.message);
  process.exitCode = 1;
} finally {
  try { ws && ws.close(); } catch { /* niente */ }
  chrome.kill();
}
