/* Misura il ponte di colore fra la scena 2 (tempio) e la 3.
   La domanda: il colore viene TENUTO per un tratto, o solo sfiorato?
   Metodo: si cammina lungo il confine e per ogni posizione si misura quanto
   l'inquadratura e' piatta (deviazione standard dei pixel). Dentro il ponte
   la deviazione deve crollare e RESTARE bassa per piu' posizioni di fila. */
import { chromium } from 'playwright-core';
import { execFileSync } from 'child_process';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.join(path.resolve(__dirname, '..'), 'dist');
const CHROME = 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe';
const PORT = 4400;
const MIME = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.webp': 'image/webp', '.json': 'application/json', '.woff2': 'font/woff2', '.png': 'image/png' };

const server = await new Promise((res) => {
  const s = http.createServer((req, r) => {
    let u = decodeURIComponent(req.url.split('?')[0]); if (u === '/') u = '/index.html';
    const fp = path.join(DIST, u);
    if (fs.existsSync(fp) && fs.statSync(fp).isFile()) {
      r.setHeader('Content-Type', MIME[path.extname(fp)] || 'application/octet-stream');
      fs.createReadStream(fp).pipe(r);
    } else { r.statusCode = 404; r.end(); }
  });
  s.listen(PORT, () => res(s));
});

function stats(png) {
  const px = execFileSync('ffmpeg', ['-v', 'error', '-f', 'image2pipe', '-i', 'pipe:0',
    '-vf', 'scale=96:54', '-f', 'rawvideo', '-pix_fmt', 'rgb24', 'pipe:1'],
    { input: png, maxBuffer: 1 << 24 });
  let m = 0; for (let i = 0; i < px.length; i++) m += px[i]; m /= px.length;
  let v = 0; for (let i = 0; i < px.length; i++) v += (px[i] - m) ** 2; v /= px.length;
  /* colore medio per canale */
  let r = 0, g = 0, b = 0, n = px.length / 3;
  for (let i = 0; i < px.length; i += 3) { r += px[i]; g += px[i + 1]; b += px[i + 2]; }
  return { dev: Math.sqrt(v), rgb: [Math.round(r / n), Math.round(g / n), Math.round(b / n)], px };
}

const browser = await chromium.launch({ executablePath: CHROME, headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle' });
await page.waitForTimeout(2500);
const H = await page.evaluate(() => document.body.scrollHeight);

/* Intervallo e passo dalla riga di comando: il pianoro puo' essere piu' stretto
   del passo di campionamento, e allora lo si scavalca senza vederlo. */
const DA = Number(process.argv[2] ?? 0.15);
const A = Number(process.argv[3] ?? 0.32);
const PASSO = Number(process.argv[4] ?? 0.0075);

console.log(`da ${(DA * 100).toFixed(2)}% a ${(A * 100).toFixed(2)}% · passo ${(PASSO * 100).toFixed(3)}% (${Math.round(PASSO * 36250)}px)\n`);
console.log('posizione   deviazione   colore medio');
const righe = [];
for (let p = DA; p <= A + 1e-9; p += PASSO) {
  await page.evaluate((v) => window.scrollTo(0, v), Math.round(H * p));
  await page.waitForTimeout(1400);
  const s = stats(await page.screenshot({ clip: { x: 0, y: 0, width: 1440, height: 900 } }));
  righe.push({ p, ...s });
  const barra = '█'.repeat(Math.max(1, Math.round(s.dev / 2)));
  console.log(`  ${(p * 100).toFixed(1)}%      ${s.dev.toFixed(1).padStart(5)}   rgb(${s.rgb.join(',')})  ${barra}`);
}

/* Il pianoro: posizioni consecutive con deviazione sotto un quarto del massimo */
const maxDev = Math.max(...righe.map((r) => r.dev));
const soglia = maxDev / 4;
let best = 0, cur = 0;
for (const r of righe) { if (r.dev < soglia) { cur++; best = Math.max(best, cur); } else cur = 0; }

console.log(`\ndeviazione massima ${maxDev.toFixed(1)} · soglia pianoro ${soglia.toFixed(1)}`);
console.log(`posizioni consecutive dentro il colore: ${best} su ${righe.length}`);
console.log(best >= 3
  ? '→ il colore E\' TENUTO ✓  (non solo sfiorato)'
  : '→ il colore e\' solo sfiorato ✗');

await browser.close(); server.close();
