/* verify-montaggio.mjs — Verifica i 4 punti richiesti dal brief di montaggio. */
import { chromium } from 'playwright-core';
import http from 'http';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';
import { execFileSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
const CHROME = 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe';
const PORT = 4399;
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'oenotria-'));

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

/* Converte un'immagine (webp/png) in raw RGB 96x54 */
function toRaw(inputPath) {
  const rawPath = path.join(TMP, 'raw-' + path.basename(inputPath, path.extname(inputPath)) + '-' + Date.now() + '.rgb');
  execFileSync('ffmpeg', [
    '-v', 'error', '-i', inputPath, '-vf', 'scale=96:54', '-f', 'rawvideo', '-pix_fmt', 'rgb24', rawPath,
  ]);
  const buf = fs.readFileSync(rawPath);
  fs.unlinkSync(rawPath);
  return buf;
}

function diffPaths(a, b) {
  const pa = toRaw(a), pb = toRaw(b);
  const n = Math.min(pa.length, pb.length);
  let sum = 0;
  for (let i = 0; i < n; i++) sum += Math.abs(pa[i] - pb[i]);
  return n ? sum / n : 0;
}

function avgColorWebp(webpPath) {
  const rawPath = path.join(TMP, 'avg-' + Date.now() + '.rgb');
  execFileSync('ffmpeg', [
    '-v', 'error', '-i', webpPath, '-vf', 'scale=1:1', '-f', 'rawvideo', '-pix_fmt', 'rgb24', rawPath,
  ]);
  const px = fs.readFileSync(rawPath);
  fs.unlinkSync(rawPath);
  if (px.length >= 3) return [px[0], px[1], px[2]];
  return [0, 0, 0];
}

function pixelDeviation(inputPath) {
  const p = toRaw(inputPath);
  let r = 0, g = 0, b = 0;
  const n = p.length / 3;
  for (let i = 0; i < p.length; i += 3) { r += p[i]; g += p[i+1]; b += p[i+2]; }
  const ar = r/n, ag = g/n, ab = b/n;
  let sum = 0;
  for (let i = 0; i < p.length; i += 3) {
    sum += Math.abs(p[i] - ar) + Math.abs(p[i+1] - ag) + Math.abs(p[i+2] - ab);
  }
  return n ? sum / n / 3 : 0;
}

async function shotFile() {
  const buf = await page.screenshot({ clip: { x: 0, y: 0, width: 1440, height: 900 } });
  const fp = path.join(TMP, 'shot-' + Date.now() + '.png');
  fs.writeFileSync(fp, buf);
  return fp;
}

const server = await startServer(PORT);
const browser = await chromium.launch({ executablePath: CHROME, headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));

await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle' });
await page.waitForTimeout(2500);

const H = await page.evaluate(() => document.body.scrollHeight);
const screens = (H / 900).toFixed(1);
console.log(`altezza ${H}px · ${screens} schermate\n`);

async function gotoProgress(targetProgress) {
  await page.evaluate((tp) => {
    const stage = document.querySelector('.stage');
    const rect = stage.getBoundingClientRect();
    const total = rect.height - window.innerHeight;
    window.scrollTo(0, tp * total);
  }, targetProgress);
  await page.waitForTimeout(3000);
}

async function readState() {
  return page.evaluate(() => ({
    attuale: window.__attuale,
    sceneIndex: window.__sceneIndex,
    frameIndex: window.__frameIndex,
    mode: window.__mode,
    transition: window.__transition,
  }));
}

const framesData = JSON.parse(fs.readFileSync(path.join(ROOT, 'public/dati/frames.json'), 'utf8'));
const VH = 445;
const totalVh = VH * 9;

const sceneBounds = [];
let cum = 0;
for (let i = 0; i < 9; i++) {
  sceneBounds.push({ start: cum / totalVh, end: (cum + VH) / totalVh });
  cum += VH;
}

/* ── PUNTO 1: ordine delle 9 scene ── */
console.log('PUNTO 1 — ordine scene');
const folderOrder = [];
for (let i = 0; i < 9; i++) {
  const midProgress = (sceneBounds[i].start + sceneBounds[i].end) / 2;
  await gotoProgress(midProgress);
  const state = await readState();
  const folders = ['01','03','06','07','08','09','12','14','15'];
  folderOrder.push(folders[state.sceneIndex]);
}
const expected = '01,03,06,07,08,09,12,14,15';
const actual = folderOrder.join(',');
console.log(`  atteso: ${expected}`);
console.log(`  reale:  ${actual}`);
console.log(`  → ${actual === expected ? 'OK ✓' : 'ERRORE ✗'}\n`);

/* ── PUNTO 2: zoom tempio (scena 1, clip 03) ── */
console.log('PUNTO 2 — zoom tempio (scena 2 / index 1)');
const scene1 = sceneBounds[1];

await gotoProgress(scene1.start + 0.01);
const s1start = await readState();
console.log(`  inizio:  scene=${s1start.sceneIndex} frame=${s1start.frameIndex}`);

await gotoProgress(scene1.start + 0.30 * (scene1.end - scene1.start));
const s1_30 = await readState();
console.log(`  al 30%:  scene=${s1_30.sceneIndex} frame=${s1_30.frameIndex}`);

await gotoProgress(scene1.start + 0.50 * (scene1.end - scene1.start));
const s1_50 = await readState();
console.log(`  al 50%:  scene=${s1_50.sceneIndex} frame=${s1_50.frameIndex}`);

await gotoProgress(scene1.end - 0.01);
const s1end = await readState();
const n03 = framesData[1].n;
console.log(`  fine:    scene=${s1end.sceneIndex} frame=${s1end.frameIndex} (${n03} totali)`);

console.log(`  frame=0 a inizio: ${s1start.frameIndex === 0 ? 'OK ✓' : 'ERRORE ✗'}`);
console.log(`  frame=0 al 30%:   ${s1_30.frameIndex === 0 ? 'OK ✓' : 'ERRORE ✗'}`);
console.log(`  frame>0 al 50%:   ${s1_50.frameIndex > 0 ? 'OK ✓' : 'ERRORE ✗'}`);
console.log(`  frame=ultimo fine: ${s1end.frameIndex >= n03 - 2 ? 'OK ✓' : 'ERRORE ✗'}\n`);

/* ── PUNTO 3: giunzione 4→5 — confronta scatti browser al confine ── */
console.log('PUNTO 3 — giunzione 4→5 (clip 07 → 08, index 3→4)');
const scene3bound = sceneBounds[3].start;

/* Screenshot subito PRIMA del confine (scene 3, fine) */
await gotoProgress(scene3bound - 0.003);
await page.waitForTimeout(500);
const shotBefore = await shotFile();

/* Screenshot subito DOPO il confine (scene 4, inizio) */
await gotoProgress(scene3bound + 0.003);
await page.waitForTimeout(500);
const shotAfter = await shotFile();

const dCut = diffPaths(shotBefore, shotAfter);
console.log(`  scatto prima del taglio: ${shotBefore}`);
console.log(`  scatto dopo il taglio:  ${shotAfter}`);
console.log(`  differenza scatti browser: ${dCut.toFixed(1)} → ${dCut < 5 ? 'OK ✓ (taglio invisibile)' : dCut < 15 ? 'ACCETTABILE' : 'ATTENZIONE: ' + dCut.toFixed(1)}`);
console.log();

/* ── PUNTO 4: raccordo colore fra scena 2 e 3 ── */
console.log('PUNTO 4 — raccordo colore (scena 2→3, clip 03→06)');
const scene2 = sceneBounds[1];
const scene3 = sceneBounds[2];

const color03 = avgColorWebp(path.join(ROOT, 'public/frames/03/0064.webp'));
const color06 = avgColorWebp(path.join(ROOT, 'public/frames/06/0001.webp'));
const bridgeRGB = [
  Math.round((color03[0] + color06[0]) / 2),
  Math.round((color03[1] + color06[1]) / 2),
  Math.round((color03[2] + color06[2]) / 2),
];
console.log(`  ultimo 03: rgb(${color03.join(', ')})`);
console.log(`  primo 06:  rgb(${color06.join(', ')})`);
console.log(`  ponte:     rgb(${bridgeRGB.join(', ')})`);

/* Screenshot prima del ponte (scena 2, subito prima della transizione) */
await gotoProgress(scene2.start + 0.92 * (scene2.end - scene2.start));
await page.waitForTimeout(500);
const shotPre = await shotFile();

/* Screenshot durante il ponte (color dissolve — campo pieno) */
await gotoProgress(scene2.start + 0.96 * (scene2.end - scene2.start));
await page.waitForTimeout(500);
const shotMid = await shotFile();

/* Screenshot dopo il ponte (scena 3, subito dopo la transizione) */
await gotoProgress(scene3.start + 0.04 * (scene3.end - scene3.start));
await page.waitForTimeout(500);
const shotPost = await shotFile();

const devMid = pixelDeviation(shotMid);
const dPrePost = diffPaths(shotPre, shotPost);
console.log(`  deviazione pixel scatto centrale: ${devMid.toFixed(1)} (basso = campo piatto)`);
console.log(`  differenza scatto prima/dopo:     ${dPrePost.toFixed(1)} → ${dPrePost < 12 ? 'OK ✓' : 'ATTENZIONE: ' + dPrePost.toFixed(1)}`);

/* ── Riporto ── */
console.log(`\n─── RIPORTO ───`);
console.log(`1. ordine scene: ${actual}`);
console.log(`2. tempio: inizio frame=${s1start.frameIndex}, 30% frame=${s1_30.frameIndex}, 50% frame=${s1_50.frameIndex}, fine frame=${s1end.frameIndex}`);
console.log(`3. giunzione 4→5: diff scatti browser ${dCut.toFixed(1)} (< 5 = ok)`);
console.log(`4. raccordo colore: rgb(${bridgeRGB.join(', ')}), dev centrale=${devMid.toFixed(1)}, diff pre/post=${dPrePost.toFixed(1)} (< 12 = ok)`);
console.log(`5. altezza ${H}px · ${screens} schermate · pageerror ${errors.length}`);

if (errors.length) console.log(errors.slice(0, 5).join('\n'));

await browser.close();
server.close();
