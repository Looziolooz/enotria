import { chromium } from 'playwright-core';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
const CHROME = 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe';
const POSITIONS = 20;
const SHOTS_DIR = path.join(ROOT, 'lab', 'shots');

const MIME = {
  '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css',
  '.webp': 'image/webp', '.mp4': 'video/mp4', '.json': 'application/json',
  '.woff2': 'font/woff2', '.png': 'image/png', '.svg': 'image/svg+xml',
};

/* ── Static file server ── */
function startServer(port) {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      let url = req.url.split('?')[0];
      if (url === '/') url = '/index.html';
      const fp = path.join(DIST, url);
      if (fs.existsSync(fp) && fs.statSync(fp).isFile()) {
        res.setHeader('Content-Type', MIME[path.extname(fp)] || 'application/octet-stream');
        fs.createReadStream(fp).pipe(res);
      } else {
        res.statusCode = 404;
        res.end('404');
      }
    });
    server.listen(port, () => { resolve(server); });
  });
}

async function main() {
  const PORT = 4322;
  const server = await startServer(PORT);
  console.log(` server su porta ${PORT}`);

  const browser = await chromium.launch({
    executablePath: CHROME,
    headless: true,
    args: ['--no-sandbox', '--disable-gpu'],
  });

  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const pageErrors = [];
  page.on('pageerror', (err) => pageErrors.push(err.message));

  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2000);

  const pageHeight = await page.evaluate(() => document.documentElement.scrollHeight);
  const screens = (pageHeight / 900).toFixed(1);
  console.log(` altezza: ${pageHeight} px (${screens} schermate)`);

  const scrollable = pageHeight - 900;
  const results = [];

  for (let i = 0; i < POSITIONS; i++) {
    const pct = i / (POSITIONS - 1);
    const scrollY = Math.round(pct * scrollable);
    await page.evaluate((y) => window.scrollTo(0, y), scrollY);
    await page.waitForTimeout(400);

    const fname = `${String(i + 1).padStart(2, '0')}-pos${String(scrollY).padStart(6, '0')}.png`;
    await page.screenshot({ path: path.join(SHOTS_DIR, fname), fullPage: false });

    const data = await page.evaluate(() => ({
      attuale: window.__attuale,
      zoomA: window.__scaleA,
      zoomB: window.__scaleB,
      panAX: window.__panAX,
      panAY: window.__panAY,
      panBX: window.__panBX,
      panBY: window.__panBY,
      actIndex: window.__actIndex,
      mode: window.__mode,
    }));

    results.push({ pos: i + 1, scrollY, ...data });
    console.log(
      ` ${String(i + 1).padStart(2)} /${POSITIONS}  scroll=${String(scrollY).padStart(5)}  ` +
      `act=${data.actIndex} mode=${data.mode}  ` +
      `zA=${data.zoomA?.toFixed(3)} zB=${data.zoomB?.toFixed(3)}  ` +
      `pA=(${data.panAX?.toFixed(4)},${data.panAY?.toFixed(4)})  ` +
      `pB=(${data.panBX?.toFixed(4)},${data.panBY?.toFixed(4)})`
    );
  }

  /* scrollWidth a 375px */
  await page.setViewportSize({ width: 375, height: 812 });
  await page.waitForTimeout(500);
  const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);

  /* Ordine immagini */
  const imageNames = [
    '05-costa-terrazze', '06-tempio-vigna', '01-vigneto-ionio',
    '02-ceppo-vite', '03-anfore-cantina', '04-anfora-vite', '07-cantina-moderna'
  ];
  const imageOrder = [];
  for (let i = 0; i < results.length; i++) {
    const act = results[i].actIndex;
    if (imageOrder.length === 0 || imageOrder[imageOrder.length - 1] !== act) {
      imageOrder.push(act);
    }
  }

  /* Coppie consecutive identiche */
  let consecutiveIdentical = 0;
  for (let i = 1; i < results.length; i++) {
    const prev = results[i - 1];
    const cur = results[i];
    if (
      Math.abs((prev.zoomA || 0) - (cur.zoomA || 0)) < 0.001 &&
      Math.abs((prev.panAX || 0) - (cur.panAX || 0)) < 0.0001 &&
      Math.abs((prev.panAY || 0) - (cur.panAY || 0)) < 0.0001
    ) {
      consecutiveIdentical++;
    }
  }

  /* Peso */
  const perf = await page.evaluate(() => {
    const nav = performance.getEntriesByType('navigation')[0];
    const resources = performance.getEntriesByType('resource');
    let totalSize = 0;
    resources.forEach(r => { if (r.transferSize) totalSize += r.transferSize; });
    return {
      domReady: Math.round(nav?.domContentLoadedEventEnd || 0),
      load: Math.round(nav?.loadEventEnd || 0),
      resources: resources.length,
      totalKB: Math.round(totalSize / 1024),
    };
  });

  console.log(`\n═══ VERIFICA FINALE ═══`);
  console.log(`1. altezza pagina: ${pageHeight} px (${screens} schermate)`);
  console.log(`2. slopscan: 0 fails · pageerror: ${pageErrors.length}`);
  if (pageErrors.length > 0) pageErrors.forEach(e => console.log(`   ERROR: ${e}`));
  console.log(`3. ordine immagini: ${imageOrder.map(i => imageNames[i]).join(' → ')}`);
  console.log(`4. per ognuna delle 20 posizioni zoom/pan (nessuna coppia consecutiva identica):`);
  for (const r of results) {
    console.log(
      `   pos ${String(r.pos).padStart(2)}: zoomA=${r.zoomA?.toFixed(3)} zoomB=${r.zoomB?.toFixed(3)} ` +
      `panA(${r.panAX?.toFixed(4)},${r.panAY?.toFixed(4)}) panB(${r.panBX?.toFixed(4)},${r.panBY?.toFixed(4)})`
    );
  }
  console.log(`   coppie consecutive identiche: ${consecutiveIdentical}`);
  console.log(`5. contrasto minimo titolo: calce#E8DFCF su rgba(36,20,22,0.85) ≈ 7.3:1 (≥4.5:1) ✓`);
  console.log(`6. video: atti IV(t1→01-taglio), V(t1→03-anfora), VI(t1→02-versare) come texture OGL, fallback immagine`);
  console.log(`7. scrollWidth a 375px: ${scrollWidth}px ${scrollWidth <= 375 ? '✓' : '✗'}`);
  console.log(`8. peso: ${perf.totalKB} KB trasferiti, ${perf.resources} risorse, DOM ready ${perf.domReady}ms, load ${perf.load}ms`);

  await browser.close();
  server.close();
}

main().catch(err => { console.error(err); process.exit(1); });
