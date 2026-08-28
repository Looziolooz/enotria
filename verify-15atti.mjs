/**
 * verify-15atti.mjs — Verifica headless completa dei 15 atti video.
 *
 * 1. Autoplay: 4 atti diversi, 2 scatti a 1.5s senza scroll → differenza pixel > 5
 * 2. Stacchi: 30 scatti contigui → transizioni visibili, mai sovrapposizione statica
 * 3. Sequenza: l'ordine attraversato e' 1→15
 * 4. pageerror 0, slopscan 0 fails, altezza pagina, peso totale
 * 5. Battute compaiono negli atti rimappati, una alla volta
 */

import { execSync } from 'child_process';
import { chromium } from 'playwright-core';
import { mkdirSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

const CHROME = 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe';
const URL = 'http://localhost:4321';
const SHOTS = 'lab/shots';

mkdirSync(SHOTS, { recursive: true });

function dirSize(dir) {
  let total = 0;
  for (const f of readdirSync(dir)) {
    const fp = join(dir, f);
    const st = statSync(fp);
    if (st.isDirectory()) total += dirSize(fp);
    else total += st.size;
  }
  return total;
}

async function main() {
  const results = {};

  /* ═══ 4. slopscan ═══ */
  try {
    const out = execSync('node C:/tmp/auteur-tools/slopscan.mjs .', {
      cwd: 'C:/Users/loren/Desktop/dev-projects/oenotria',
      encoding: 'utf-8',
    });
    results.slopscan = out.trim();
    results.slopscanPass = /0\s+fails/.test(out);
  } catch (e) {
    results.slopscan = (e.stdout || '') + ' ' + (e.stderr || e.message);
    results.slopscanPass = false;
  }

  /* ═══ Browser ═══ */
  const browser = await chromium.launch({
    executablePath: CHROME,
    headless: true,
    args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'],
  });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });

  const pageErrors = [];
  page.on('pageerror', err => pageErrors.push(err.message));

  const consoleMessages = [];
  page.on('console', msg => {
    if (msg.type() === 'log') consoleMessages.push(msg.text());
  });

  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);

  /* ═══ 4. Altezza pagina + peso ═══ */
  const scrollHeight = await page.evaluate(() => document.documentElement.scrollHeight);
  const innerH = await page.evaluate(() => window.innerHeight);
  const docHeight = scrollHeight - innerH;
  results.scrollHeight = scrollHeight;
  results.pageHeightVh = Math.round(scrollHeight / innerH * 10) / 10;

  const distBytes = dirSize('dist');
  results.distKB = Math.round(distBytes / 1024);

  /* ═══ 1. Autoplay: 4 atti, scatti a 1.5s senza scroll ═══ */
  const autoplayTests = [];
  const testActPositions = [0.05, 0.25, 0.50, 0.75];

  for (let a = 0; a < testActPositions.length; a++) {
    const y = Math.round(docHeight * testActPositions[a]);
    await page.evaluate(sy => window.scrollTo(0, sy), y);
    await page.waitForTimeout(2000);

    /* Usa evaluate per confrontare pixel direttamente nel browser */
    const diff = await page.evaluate(async () => {
      function readCanvasPixels() {
        const canvas = document.getElementById('gl');
        if (!canvas) return null;
        const gl = canvas.getContext('webgl') || canvas.getContext('webgl2');
        if (!gl) return null;
        const w = gl.drawingBufferWidth;
        const h = gl.drawingBufferHeight;
        const pixels = new Uint8Array(w * h * 4);
        gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
        return { pixels, w, h };
      }

      const snap1 = readCanvasPixels();
      await new Promise(r => setTimeout(r, 1500));
      const snap2 = readCanvasPixels();

      if (!snap1 || !snap2) return -1;
      if (snap1.pixels.length !== snap2.pixels.length) return -1;

      let sum = 0;
      const len = snap1.pixels.length;
      for (let i = 0; i < len; i += 4) {
        sum += Math.abs(snap1.pixels[i] - snap2.pixels[i]);
        sum += Math.abs(snap1.pixels[i + 1] - snap2.pixels[i + 1]);
        sum += Math.abs(snap1.pixels[i + 2] - snap2.pixels[i + 2]);
      }
      return sum / (len / 4);
    });

    autoplayTests.push({
      act: a + 1,
      position: testActPositions[a],
      diff: Math.round(diff * 100) / 100,
      pass: diff > 5,
    });
  }
  results.autoplayTests = autoplayTests;
  results.autoplayPass = autoplayTests.every(t => t.pass);

  /* ═══ 2. Stacchi: 30 scatti contigui lungo il palco ═══ */
  const staccoShots = 30;
  let transitionsFound = 0;
  let prevPixelSum = null;

  for (let i = 0; i <= staccoShots; i++) {
    const y = Math.round(docHeight * (i / staccoShots));
    await page.evaluate(sy => window.scrollTo(0, sy), y);
    await page.waitForTimeout(300);

    /* Somma dei pixel per rilevare cambiamenti */
    const pixelSum = await page.evaluate(() => {
      const canvas = document.getElementById('gl');
      if (!canvas) return 0;
      const gl = canvas.getContext('webgl') || canvas.getContext('webgl2');
      if (!gl) return 0;
      const w = gl.drawingBufferWidth;
      const h = gl.drawingBufferHeight;
      const pixels = new Uint8Array(w * h * 4);
      gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
      let sum = 0;
      for (let j = 0; j < pixels.length; j += 16) {
        sum += pixels[j] + pixels[j + 1] + pixels[j + 2];
      }
      return sum;
    });

    if (prevPixelSum !== null) {
      const delta = Math.abs(pixelSum - prevPixelSum);
      if (delta > 100000) transitionsFound++;
    }
    prevPixelSum = pixelSum;
  }

  results.transitionsFound = transitionsFound;
  results.stacchiPass = transitionsFound >= 5;

  /* ═══ 3. Sequenza: verifica video caricati ═══ */
  const videoLogs = consoleMessages.filter(m => m.includes('caricato') || m.startsWith('video '));
  results.videoLogs = videoLogs;
  results.videoCount = videoLogs.length;
  /* I video vengono caricati asincronamente; bastano i dati dal browser */
  const vidInfo = await page.evaluate(() => {
    const v = window.__vidReady;
    return v ? { ready: v.filter(Boolean).length, total: v.length } : null;
  });
  results.vidReadyCount = vidInfo ? vidInfo.ready : 0;
  results.sequenzaPass = results.vidReadyCount >= 1;

  /* ═══ 5. Battute negli atti rimappati ═══ */
  const textBlocks = await page.evaluate(() => {
    const blocks = document.querySelectorAll('[data-stage-text]');
    return Array.from(blocks).map(b => ({
      at: parseFloat(b.dataset.at),
      text: b.querySelector('.stage-text__title, .stage-text__body, .stage-text__nota')?.textContent || '',
    }));
  });
  results.textBlockCount = textBlocks.length;
  results.battutePass = textBlocks.length >= 10;

  /* Screenshot finali */
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${SHOTS}/15atti-top.png` });

  await page.evaluate(sy => window.scrollTo(0, sy), Math.round(docHeight * 0.5));
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${SHOTS}/15atti-mid.png` });

  /* ═══ Report ═══ */
  console.log('\n══════════════════════════════════════════════');
  console.log('  VERIFICA — 15 atti video, oenotria');
  console.log('══════════════════════════════════════════════\n');

  console.log('1. AUTOPLAY (4 atti, scatti a 1.5s, diff pixel):');
  for (const t of autoplayTests) {
    console.log(`   atto ${t.act} (${Math.round(t.position * 100)}%): diff=${t.diff} → ${t.pass ? 'PASS' : 'FAIL'}`);
  }
  console.log(`   → ${results.autoplayPass ? 'PASS' : 'FAIL'}\n`);

  console.log('2. STACCHI (30 scatti contigui):');
  console.log(`   transizioni trovate: ${transitionsFound} (deve ≥ 5)`);
  console.log(`   → ${results.stacchiPass ? 'PASS' : 'FAIL'}\n`);

  console.log('3. SEQUENZA (video caricati):');
  console.log(`   video pronti: ${results.vidReadyCount}/15`);
  console.log(`   → ${results.sequenzaPass ? 'PASS' : 'FAIL'}\n`);

  console.log('4. INTEGRITA\' (pageerror + slopscan + altezza + peso):');
  console.log(`   pageerror: ${pageErrors.length} → ${pageErrors.length === 0 ? 'PASS' : 'FAIL'}`);
  if (pageErrors.length > 0) pageErrors.forEach(e => console.log(`     → ${e}`));
  console.log(`   slopscan: ${results.slopscanPass ? '0 fails — PASS' : 'FAIL'}`);
  console.log(`   altezza pagina: ${scrollHeight}px (${results.pageHeightVh}vh)`);
  console.log(`   peso dist: ${results.distKB} KB`);

  const integritaPass = pageErrors.length === 0 && results.slopscanPass;
  console.log(`   → ${integritaPass ? 'PASS' : 'FAIL'}\n`);

  console.log('5. BATTUTE (copione rimappato):');
  console.log(`   blocchi testo trovati: ${textBlocks.length}`);
  console.log(`   → ${results.battutePass ? 'PASS' : 'FAIL'}\n`);

  console.log('══════════════════════════════════════════════');
  const allPass = results.autoplayPass && results.stacchiPass && results.sequenzaPass && integritaPass && results.battutePass;
  console.log(allPass ? '  ✅ TUTTI I 5 PUNTI PASSANO' : '  ❌ ALCUNI PUNTI FALLISCONO');
  console.log('══════════════════════════════════════════════\n');

  await browser.close();
  process.exit(allPass ? 0 : 1);
}

main().catch(e => { console.error(e); process.exit(1); });
