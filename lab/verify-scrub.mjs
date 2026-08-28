/* Verifica dello scrub: lo scorrimento muove l'immagine, e da fermo NON si muove nulla.
   Sono le due prove complementari: la prima dice che segue il dito,
   la seconda che non c'e' niente che suoni per conto suo. */
import { chromium } from 'playwright-core';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
const CHROME = 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe';
const PORT = 4399;

const MIME = {
  '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css',
  '.webp': 'image/webp', '.mp4': 'video/mp4', '.json': 'application/json',
  '.woff2': 'font/woff2', '.png': 'image/png', '.svg': 'image/svg+xml',
};

function startServer(port) {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      let url = decodeURIComponent(req.url.split('?')[0]);
      if (url === '/') url = '/index.html';
      const fp = path.join(DIST, url);
      if (fs.existsSync(fp) && fs.statSync(fp).isFile()) {
        res.setHeader('Content-Type', MIME[path.extname(fp)] || 'application/octet-stream');
        fs.createReadStream(fp).pipe(res);
      } else { res.statusCode = 404; res.end('404'); }
    });
    server.listen(port, () => resolve(server));
  });
}

/* ⚠️ Confrontare i byte di due PNG non dice niente: sono compressi, e una minima
   variazione scombina tutto il flusso. Qui i pixel si decodificano davvero, con ffmpeg,
   riducendo a 96×54 in RGB grezzo: cosi' la differenza media e' una vera distanza
   fotometrica su scala 0-255. */
import { execFileSync } from 'child_process';

function pixels(png) {
  const out = execFileSync('ffmpeg', [
    '-v', 'error', '-f', 'image2pipe', '-i', 'pipe:0',
    '-vf', 'scale=96:54', '-f', 'rawvideo', '-pix_fmt', 'rgb24', 'pipe:1',
  ], { input: png, maxBuffer: 1 << 24 });
  return out;
}

function diff(a, b) {
  const pa = pixels(a), pb = pixels(b);
  const n = Math.min(pa.length, pb.length);
  let sum = 0;
  for (let i = 0; i < n; i++) sum += Math.abs(pa[i] - pb[i]);
  return n ? sum / n : 0;
}

const server = await startServer(PORT);
const browser = await chromium.launch({ executablePath: CHROME, headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));

await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle' });
await page.waitForTimeout(2500);

const H = await page.evaluate(() => document.body.scrollHeight);
console.log(`altezza ${H}px · ${(H / 900).toFixed(1)} schermate\n`);

const shot = async () => await page.screenshot({ clip: { x: 0, y: 0, width: 1440, height: 900 } });
const goto = async (y) => {
  await page.evaluate((v) => window.scrollTo(0, v), y);
  await page.waitForTimeout(1800);          /* lo smorzatore deve posarsi del tutto */
};

/* ── PROVA 1 — lo scroll muove l'immagine ── */
console.log('PROVA 1 — scorro: l\'immagine DEVE cambiare (soglia > 5)');
const punti = [0.12, 0.38, 0.63, 0.86];
let ok1 = 0, tot1 = 0;
for (const p of punti) {
  const base = Math.round(H * p);
  await goto(base); const a = await shot();
  await goto(base + 150); const b = await shot();
  await goto(base + 300); const c = await shot();
  const d1 = diff(a, b), d2 = diff(b, c);
  tot1 += 2; if (d1 > 5) ok1++; if (d2 > 5) ok1++;
  console.log(`  a ${(p * 100).toFixed(0)}%  +150px: ${d1.toFixed(1)}  ·  +300px: ${d2.toFixed(1)}`);
}
console.log(`  → ${ok1}/${tot1} coppie sopra soglia\n`);

/* ── PROVA 2 — da fermo non si muove niente ── */
console.log('PROVA 2 — fermo 6 secondi: gli scatti DEVONO essere identici (soglia < 1)');
await goto(Math.round(H * 0.44));
await page.waitForTimeout(1200);
const serie = [];
let prev = await shot();
for (let s = 0; s < 5; s++) {
  await page.waitForTimeout(1000);
  const cur = await shot();
  serie.push(diff(prev, cur));
  prev = cur;
}
console.log(`  differenze al secondo: ${serie.map((v) => v.toFixed(2)).join(' · ')}`);
const fermo = serie.every((v) => v < 1);
console.log(`  → ${fermo ? 'FERMO ✓' : 'QUALCOSA SI MUOVE DA SOLO ✗'}\n`);

/* ── PROVA 3 — bidirezionale ── */
console.log('PROVA 3 — scendo 300px e risalgo: DEVE tornare com\'era (soglia < 2)');
const y0 = Math.round(H * 0.55);
await goto(y0); const p0 = await shot();
await goto(y0 + 300);
await goto(y0); const p1 = await shot();
const dBack = diff(p0, p1);
console.log(`  differenza andata/ritorno: ${dBack.toFixed(2)} → ${dBack < 2 ? 'OK ✓' : 'NON TORNA ✗'}\n`);

/* ── PROVA 4 — niente <video>, niente <img> ── */
const conteggi = await page.evaluate(() => ({
  video: document.querySelectorAll('video').length,
  img: document.querySelectorAll('img').length,
  section: document.querySelectorAll('section').length,
  canvas: document.querySelectorAll('canvas').length,
}));
console.log('PROVA 4 — struttura');
console.log(`  video=${conteggi.video} (atteso 0) · img=${conteggi.img} (atteso 0) · section=${conteggi.section} (atteso 1) · canvas=${conteggi.canvas}`);

console.log(`\npageerror: ${errors.length}`);
if (errors.length) console.log(errors.slice(0, 5).join('\n'));

await browser.close();
server.close();
