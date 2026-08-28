/**
 * qa-scrub.mjs — QA dello scrub: pilota Chrome headless via CDP puro
 * (WebSocket nativo di Node 24, zero dipendenze), scrolla il film a tappe
 * e verifica che il contatore avanzi e la pagina sopravviva.
 *
 * Uso: node lab/qa-scrub.mjs [url] [dirScreenshot]
 */
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';

const URL_SITO = process.argv[2] || 'http://localhost:5173/';
const DIR_SHOT = process.argv[3] || 'lab/qa-shots';
const CHROME = 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe';
const PORTA = 9333;

mkdirSync(DIR_SHOT, { recursive: true });

const chrome = spawn(CHROME, [
  '--headless', '--enable-unsafe-swiftshader', '--hide-scrollbars',
  `--remote-debugging-port=${PORTA}`, '--user-data-dir=' + process.env.TEMP + '/qa-scrub-profile',
  '--window-size=1280,800', 'about:blank',
], { stdio: 'ignore' });

const dormi = (ms) => new Promise((r) => setTimeout(r, ms));

async function targetWs() {
  for (let i = 0; i < 20; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${PORTA}/json`);
      const tabs = await res.json();
      const t = tabs.find((x) => x.type === 'page');
      if (t) return t.webSocketDebuggerUrl;
    } catch { /* chrome non ancora su */ }
    await dormi(500);
  }
  throw new Error('Chrome CDP non raggiungibile');
}

let ws, seq = 0;
const attese = new Map();
function cmd(method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = ++seq;
    attese.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params }));
  });
}
async function espr(expression) {
  const r = await cmd('Runtime.evaluate', { expression, returnByValue: true });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.text + ' ' + (r.exceptionDetails.exception?.description || ''));
  return r.result.value;
}

try {
  ws = new WebSocket(await targetWs());
  await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
  ws.onmessage = (ev) => {
    const m = JSON.parse(ev.data);
    if (m.id && attese.has(m.id)) { attese.get(m.id).resolve(m.result); attese.delete(m.id); }
  };

  await cmd('Page.enable');
  await cmd('Runtime.enable');
  await cmd('Page.navigate', { url: URL_SITO });
  await dormi(6000);

  const contatore = "((document.body.innerText.match(/(\\d+) \\/ (\\d+)/)||[])[1]||'—')";
  console.log('boot →', await espr(`JSON.stringify({contatore: ${contatore}, hPagina: document.body.scrollHeight})`));

  const tappe = [0.10, 0.25, 0.42, 0.60, 0.78, 0.95];
  for (const t of tappe) {
    await espr(`window.scrollTo(0, document.body.scrollHeight * ${t})`);
    await dormi(5000);
    const stato = await espr(`JSON.stringify({t: ${t}, y: Math.round(window.scrollY), contatore: ${contatore}})`);
    console.log('tappa →', stato);
    const shot = await cmd('Page.captureScreenshot', { format: 'jpeg', quality: 70 });
    writeFileSync(`${DIR_SHOT}/scrub-${String(Math.round(t * 100)).padStart(2, '0')}.jpg`, Buffer.from(shot.data, 'base64'));
  }
  console.log(`Screenshot in ${DIR_SHOT}/. Se il contatore avanza con t, lo scrub reagisce allo scroll.`);
} catch (e) {
  console.error('QA fallita:', e.message);
  process.exitCode = 1;
} finally {
  try { ws && ws.close(); } catch { /* niente */ }
  chrome.kill();
}
