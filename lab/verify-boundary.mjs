/* verify-boundary.mjs — Misura la fluidita' ai confini di scena.
   Per ognuno dei 3 confini, campiona 12 posizioni a cavallo (passo ~40px),
   calcola la differenza fra scatti consecutivi, e verifica che non ci sia
   un picco isolato (rapporto max/median < 2.0). */
import { chromium } from 'playwright-core';
import { execFileSync } from 'child_process';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
const CHROME = 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe';
const PORT = 4401;

const MIME = {
  '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css',
  '.webp': 'image/webp', '.json': 'application/json', '.woff2': 'font/woff2',
  '.png': 'image/png', '.svg': 'image/svg+xml',
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

function pixels(png) {
  return execFileSync('ffmpeg', [
    '-v', 'error', '-f', 'image2pipe', '-i', 'pipe:0',
    '-vf', 'scale=96:54', '-f', 'rawvideo', '-pix_fmt', 'rgb24', 'pipe:1',
  ], { input: png, maxBuffer: 1 << 24 });
}

function diff(a, b) {
  const pa = pixels(a), pb = pixels(b);
  const n = Math.min(pa.length, pb.length);
  let sum = 0;
  for (let i = 0; i < n; i++) sum += Math.abs(pa[i] - pb[i]);
  return n ? sum / n : 0;
}

/* ── Parametri ── */
const VH = { scene: 400, raccordo: 200 };
const TOTALE_VH = 5200; /* somma di tutti i SCENES[].vh */
const PASSO = 40;       /* pixel fra campioni */
const CAMPIONI = 12;    /* campioni per confine */

/* Confini: indices within SCENES array */
/* 0: terrazze(01) → tempio(02) — fine scena 0 */
/* 1: tempio(03) → r1 — fine scena 2 */
/* 2: volto(07) → vendemmia(08) — fine scena 6 */

/* Calcola fine di ogni scena in vh */
const fineVH = [];
let cum = 0;
const sceneVH = [400,400,400,200,400,200,400,400,200,400,200,400,200,400,200,400];
for (let i = 0; i < sceneVH.length; i++) {
  cum += sceneVH[i];
  fineVH.push(cum);
}
const confini = [
  { nome: '01→02 (terrazze→tempio)', fineVH: fineVH[0] },
  { nome: '03→r1 (tempio→raccordo1)', fineVH: fineVH[2] },
  { nome: '07→08 (volto→vendemmia)', fineVH: fineVH[6] },
];

const server = await startServer(PORT);
const browser = await chromium.launch({ executablePath: CHROME, headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));

await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle' });
await page.waitForTimeout(3000);

const H = await page.evaluate(() => document.body.scrollHeight);

const shot = async () => await page.screenshot({ clip: { x: 0, y: 0, width: 1440, height: 900 } });
const goto = async (y) => {
  await page.evaluate((v) => window.scrollTo(0, v), y);
  await page.waitForTimeout(1800);
};

let tuttiVerdi = true;

for (const c of confini) {
  const centroY = Math.round((c.fineVH / TOTALE_VH) * H);
  const startY = centroY - Math.round((CAMPIONI / 2) * PASSO);

  const diffs = [];
  /* Primo scatto */
  await goto(startY);
  let prev = await shot();

  for (let i = 1; i < CAMPIONI; i++) {
    await goto(startY + i * PASSO);
    const cur = await shot();
    diffs.push(diff(prev, cur));
    prev = cur;
  }

  /* Calcola statistiche */
  const sorted = [...diffs].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];
  const max = Math.max(...diffs);
  const ratio = median > 0 ? max / median : Infinity;

  const passa = ratio < 2.0;
  if (!passa) tuttiVerdi = false;

  console.log(`\n══ ${c.nome} ══`);
  console.log(`  serie: [${diffs.map((d) => d.toFixed(1)).join(', ')}]`);
  console.log(`  mediana: ${median.toFixed(1)} · massimo: ${max.toFixed(1)} · max/med: ${ratio.toFixed(2)} → ${passa ? '✓' : '✗'}`);
}

console.log(`\n\npageerror: ${errors.length}`);
if (errors.length) console.log(errors.slice(0, 5).join('\n'));

console.log(`\nverdetto: ${tuttiVerdi ? 'TUTTI VERDI ✓' : 'QUALCUNO NON PASSA ✗'}`);

await browser.close();
server.close();
