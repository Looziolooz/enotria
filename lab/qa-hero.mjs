/**
 * qa-hero.mjs — verifica l'apertura del film: il guerriero, il raccordo sul
 * sole, e l'ingresso della marina. Porta lo scroll su fotogrammi PRECISI
 * (non su percentuali della pagina) e fotografa.
 *
 * Uso: node lab/qa-hero.mjs [url] [dirScreenshot]
 */
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync, readFileSync } from 'node:fs';

const URL_SITO = process.argv[2] || 'http://localhost:4180/';
const DIR_SHOT = process.argv[3] || 'lab/qa-shots-hero';
const CHROME = 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe';
const PORTA = 9337;

/* fotogrammi 1-based: il guerriero, la corsa del raccordo, la marina */
const TAPPE = [
  [1, 'apertura'], [40, 'guerriero'], [110, 'guerriero-largo'],
  [160, 'discesa-pre'], [192, 'ultimo-guerriero'],
  [200, 'ponte-inizio'], [207, 'ponte-apice'], [215, 'ponte-fine'],
  [230, 'marina-riapre'], [270, 'marina'], [400, 'nave'],
];

mkdirSync(DIR_SHOT, { recursive: true });
const chrome = spawn(CHROME, [
  '--headless', '--enable-unsafe-swiftshader', '--hide-scrollbars',
  `--remote-debugging-port=${PORTA}`, '--user-data-dir=' + process.env.TEMP + '/qa-hero-profile',
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
  /* ?qa: senza preserveDrawingBuffer readPixels torna sempre nero */
  await cmd('Page.navigate', { url: URL_SITO + (URL_SITO.includes('?') ? '&' : '?') + 'qa' });
  await dormi(7000);

  const nFilm = JSON.parse(readFileSync('public/dati/frames.json', 'utf8'))[0].n;
  const letturaHud = "((document.body.innerText.match(/KAPE\\s*(\\d+)\\s*\\/\\s*(\\d+)/)||[])[1]||'—')";
  console.log('boot → film di', nFilm, 'fotogrammi · hud', await espr(letturaHud));

  /* y di scroll per un fotogramma preciso: progress = -rect.top / (h - vh) */
  const vaiA = (f) => espr(`(() => {
    var s = document.querySelector('.stage');
    var top = s.getBoundingClientRect().top + window.scrollY;
    var corsa = s.offsetHeight - window.innerHeight;
    window.scrollTo(0, Math.round(top + corsa * ${(f - 1)} / ${nFilm - 1}));
    return Math.round(window.scrollY);
  })()`);

  let errori = 0;
  for (const [f, nome] of TAPPE) {
    await vaiA(f);
    await dormi(2600);          /* lo smorzamento deve arrivare a destinazione */
    const hud = await espr(letturaHud);
    const scarto = hud === '—' ? null : Math.abs(Number(hud) - f);
    const shot = await cmd('Page.captureScreenshot', { format: 'jpeg', quality: 78 });
    writeFileSync(`${DIR_SHOT}/${String(f).padStart(4, '0')}-${nome}.jpg`, Buffer.from(shot.data, 'base64'));
    /* il canvas e' nero? media dei pixel su un campione */
    const buio = await espr(`(() => {
      var c = document.getElementById('gl');
      var g = c.getContext('webgl2') || c.getContext('webgl');
      var p = new Uint8Array(4 * 64 * 64);
      g.readPixels(c.width/2 - 32, c.height/2 - 32, 64, 64, g.RGBA, g.UNSIGNED_BYTE, p);
      var s = 0; for (var i = 0; i < p.length; i += 4) s += p[i] + p[i+1] + p[i+2];
      return Math.round(s / (64 * 64 * 3));
    })()`);
    const ok = scarto !== null && scarto <= 3 && buio > 12;
    if (!ok) errori++;
    console.log(`  f${String(f).padStart(4)} ${nome.padEnd(18)} hud=${String(hud).padStart(4)} `
      + `scarto=${scarto === null ? '?' : scarto} luminanza=${String(buio).padStart(3)} ${ok ? 'ok' : 'DA GUARDARE'}`);
  }
  console.log(`\n${TAPPE.length - errori}/${TAPPE.length} tappe a posto · screenshot in ${DIR_SHOT}/`);
  if (errori) process.exitCode = 1;
} catch (e) {
  console.error('QA fallita:', e.message);
  process.exitCode = 1;
} finally {
  try { ws && ws.close(); } catch { /* niente */ }
  chrome.kill();
}
