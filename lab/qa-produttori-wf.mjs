/**
 * qa-produttori-wf.mjs — screenshot della griglia produttori via CDP puro
 * (WebSocket nativo di Node, zero dipendenze). Porta 9341, profilo qa-prod2.
 *
 * Uso: node lab/qa-produttori-wf.mjs
 */
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';

const URL_SITO = 'http://localhost:4180/';
const DIR_SHOT = 'lab/qa-shots-wf';
const CHROME = 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe';
const PORTA = 9341;

mkdirSync(DIR_SHOT, { recursive: true });

const chrome = spawn(CHROME, [
  '--headless', '--enable-unsafe-swiftshader', '--hide-scrollbars',
  `--remote-debugging-port=${PORTA}`, '--user-data-dir=' + process.env.TEMP + '/qa-prod2',
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
  await dormi(5000);

  const info = await espr(`JSON.stringify({
    griglia: !!document.querySelector('.produttori-grid'),
    hPagina: document.body.scrollHeight,
  })`);
  console.log('boot →', info);

  await espr("document.querySelector('.produttori-grid').scrollIntoView()");
  await dormi(2000);
  console.log('scroll →', await espr('JSON.stringify({y: Math.round(window.scrollY)})'));

  const shot = await cmd('Page.captureScreenshot', { format: 'jpeg', quality: 80 });
  writeFileSync(`${DIR_SHOT}/produttori.jpg`, Buffer.from(shot.data, 'base64'));
  console.log(`Screenshot salvato in ${DIR_SHOT}/produttori.jpg`);

  // Secondo scatto: 380px più in alto, per vedere la riga di apertura e la testa delle card
  await espr('window.scrollBy(0, -380)');
  await dormi(1500);
  const shot2 = await cmd('Page.captureScreenshot', { format: 'jpeg', quality: 80 });
  writeFileSync(`${DIR_SHOT}/produttori-top.jpg`, Buffer.from(shot2.data, 'base64'));
  console.log(`Screenshot salvato in ${DIR_SHOT}/produttori-top.jpg`);
} catch (e) {
  console.error('QA fallita:', e.message);
  process.exitCode = 1;
} finally {
  try { ws && ws.close(); } catch { /* niente */ }
  chrome.kill();
}
