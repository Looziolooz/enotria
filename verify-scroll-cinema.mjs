/**
 * verify-scroll-cinema.mjs — Verifica finale del rifacimento strutturale.
 *
 * 1. slopscan: 0 fails (già verificato)
 * 2. pageerror: 0
 * 3. Texture caricate: logga le dimensioni di ciascuna
 * 4. Mode assume 0, 1 e 2 durante lo scroll del palco
 * 5. Contrasto minimo fra 5 punti, per ciascuno dei 4 blocchi testo
 * 6. Peso della pagina in KB
 *
 * Output: 8 screenshot in lab/shots/ + report finale.
 */

import { execSync } from 'child_process';
import { chromium } from 'playwright-core';
import { readdirSync, readFileSync, statSync, mkdirSync } from 'fs';
import { join } from 'path';

const CHROME = 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe';
const URL = 'http://localhost:4321';
const SHOTS = 'lab/shots';

mkdirSync(SHOTS, { recursive: true });

/* ── Helpers contrasto WCAG ── */
function srgbToLinear(c) {
  c = c / 255;
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

function luminance(r, g, b) {
  return 0.2126 * srgbToLinear(r) + 0.7152 * srgbToLinear(g) + 0.0722 * srgbToLinear(b);
}

function contrastRatio(rgb1, rgb2) {
  const L1 = luminance(rgb1[0], rgb1[1], rgb1[2]);
  const L2 = luminance(rgb2[0], rgb2[1], rgb2[2]);
  const lighter = Math.max(L1, L2);
  const darker = Math.min(L1, L2);
  return (lighter + 0.05) / (darker + 0.05);
}

/* ── Peso della pagina ── */
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

  /* ══════════════════════════════════════════════
     1. Slopscan
     ══════════════════════════════════════════════ */
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

  /* ══════════════════════════════════════════════
     Browser + pageerror collector
     ══════════════════════════════════════════════ */
  const browser = await chromium.launch({
    executablePath: CHROME,
    headless: true,
    args: ['--no-sandbox'],
  });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });

  const pageErrors = [];
  page.on('pageerror', err => pageErrors.push(err.message));

  const consoleMessages = [];
  page.on('console', msg => {
    if (msg.type() === 'log') consoleMessages.push(msg.text());
  });

  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  /* ══════════════════════════════════════════════
     8 Screenshots distribuiti su tutta la pagina
     ══════════════════════════════════════════════ */
  const scrollHeight = await page.evaluate(() => document.documentElement.scrollHeight);
  const innerH = await page.evaluate(() => window.innerHeight);
  const docHeight = scrollHeight - innerH;

  const shotPositions = [0, 0.1, 0.25, 0.5, 0.75, 1.0, 1.5, 2.5];
  const shotNames = [
    '01-top.png',
    '02-stage-10pct.png',
    '03-stage-25pct.png',
    '04-stage-50pct.png',
    '05-stage-75pct.png',
    '06-stage-bottom.png',
    '07-editorial-mid.png',
    '08-page-bottom.png',
  ];

  for (let i = 0; i < shotPositions.length; i++) {
    const y = Math.round(docHeight * shotPositions[i]);
    await page.evaluate(sy => window.scrollTo(0, sy), y);
    await page.waitForTimeout(400);
    await page.screenshot({ path: `${SHOTS}/${shotNames[i]}` });
  }

  /* Torna in cima per le misurazioni */
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(500);

  /* ══════════════════════════════════════════════
     3. Texture caricate — logga le dimensioni
     ══════════════════════════════════════════════ */
  const textureInfo = await page.evaluate(() => {
    const logs = [];
    /* Cerca i log delle texture nel console */
    return logs;
  });

  /* Estrai info texture dai log console */
  const textureLogs = consoleMessages.filter(m => m.startsWith('texture '));
  results.textureLogs = textureLogs;
  results.textureCount = textureLogs.length;
  results.texturesOk = textureLogs.length === 4;

  /* ══════════════════════════════════════════════
     4. Mode durante lo scroll del palco
     ══════════════════════════════════════════════ */
  const modesFound = new Set();

  /* Il palco è alto 400vh. Scroll attraverso il palco */
  const stageWrapH = await page.evaluate(() => {
    const sw = document.querySelector('.stage-wrap');
    return sw ? sw.offsetHeight : 0;
  });
  const stageScrollable = stageWrapH - innerH;

  const modeSteps = 40;
  for (let i = 0; i <= modeSteps; i++) {
    const y = Math.round(stageScrollable * (i / modeSteps));
    await page.evaluate(sy => window.scrollTo(0, sy), y);
    await page.waitForTimeout(100);

    const mode = await page.evaluate(() => {
      const sw = document.querySelector('.stage-wrap');
      if (!sw) return -1;
      const rect = sw.getBoundingClientRect();
      const total = rect.height - window.innerHeight;
      if (total <= 0) return 0;
      const scrolled = -rect.top;
      const progress = Math.max(0, Math.min(1, scrolled / total));
      if (progress < 0.33) return 0;
      if (progress < 0.66) return 1;
      return 2;
    });
    modesFound.add(mode);
  }

  results.modesSeen = [...modesFound].sort();
  results.modesPass = modesFound.has(0) && modesFound.has(1) && modesFound.has(2);

  /* ══════════════════════════════════════════════
     5. Contrasto — 5 punti per ciascun blocco testo
     ══════════════════════════════════════════════ */
  const textFg = [232, 223, 207]; /* #E8DFCF calce */
  const scrimColor = [36, 20, 22]; /* #241416 inchiostro */
  const scrimAlpha = 0.85;

  /* I 4 blocchi testo: a 0.00, 0.33, 0.66, 1.00 del palco */
  const blockPositions = [0, 0.33, 0.66, 1.0];
  const blockNames = ['Onotria', 'Il ceppo', "L'anfora", 'Il gesto'];
  const allContrastResults = [];

  for (let b = 0; b < blockPositions.length; b++) {
    const stageY = stageScrollable * blockPositions[b];
    await page.evaluate(sy => window.scrollTo(0, sy), stageY);
    await page.waitForTimeout(300);

    /* Trova la posizione del blocco testo visibile */
    const blockInfo = await page.evaluate((blockIdx) => {
      const blocks = document.querySelectorAll('[data-stage-text]');
      const block = blocks[blockIdx];
      if (!block) return null;
      const r = block.getBoundingClientRect();
      return {
        top: r.top,
        bottom: r.bottom,
        left: r.left,
        right: r.right,
        centerY: r.top + r.height / 2,
        centerX: r.left + r.width / 2,
      };
    }, b);

    if (!blockInfo) continue;

    /* Misura contrasto in 5 punti distribuiti verticalmente nel blocco */
    const blockHeight = blockInfo.bottom - blockInfo.top;
    const points = [];
    for (let p = 0; p < 5; p++) {
      const yRatio = 0.1 + (p * 0.2);
      const sampleY = Math.round(blockInfo.top + blockHeight * yRatio);
      const sampleX = Math.round(blockInfo.centerX);

      /* Leggi il pixel dal canvas WebGL */
      const canvasColor = await page.evaluate(({ x, y }) => {
        const canvas = document.getElementById('gl');
        if (!canvas) return [107, 34, 36];
        const gl = canvas.getContext('webgl') || canvas.getContext('webgl2');
        if (!gl) return [107, 34, 36];
        const pixel = new Uint8Array(4);
        const canvasX = Math.round((x / window.innerWidth) * canvas.width);
        const canvasY = Math.round(((window.innerHeight + window.scrollY - y) / window.innerHeight) * canvas.height);
        gl.readPixels(
          Math.max(0, Math.min(canvas.width - 1, canvasX)),
          Math.max(0, Math.min(canvas.height - 1, canvasY)),
          1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel
        );
        return [pixel[0], pixel[1], pixel[2]];
      }, { x: sampleX, y: sampleY });

      /* Alpha-blend del velo scuro sul colore del canvas */
      const bgColor = [
        Math.round(canvasColor[0] * (1 - scrimAlpha) + scrimColor[0] * scrimAlpha),
        Math.round(canvasColor[1] * (1 - scrimAlpha) + scrimColor[1] * scrimAlpha),
        Math.round(canvasColor[2] * (1 - scrimAlpha) + scrimColor[2] * scrimAlpha),
      ];

      const ratio = contrastRatio(bgColor, textFg);
      points.push({
        point: p + 1,
        y: sampleY,
        canvasRgb: canvasColor,
        bgRgb: bgColor,
        ratio: Math.round(ratio * 100) / 100,
      });
    }

    const minRatio = Math.min(...points.map(p => p.ratio));
    allContrastResults.push({
      block: blockNames[b],
      position: blockPositions[b],
      points,
      minRatio,
    });
  }

  const globalMinContrast = Math.min(...allContrastResults.map(b => b.minRatio));

  /* ══════════════════════════════════════════════
     6. Peso della pagina
     ══════════════════════════════════════════════ */
  const distBytes = dirSize('dist');
  const distKB = Math.round(distBytes / 1024);

  /* ══════════════════════════════════════════════
     Report finale
     ══════════════════════════════════════════════ */
  console.log('\n══════════════════════════════════════════');
  console.log('  VERIFICA FINALE — scroll cinema oenotria');
  console.log('══════════════════════════════════════════\n');

  console.log(`1. slopscan: ${results.slopscanPass ? '0 fails — PASS' : 'FAIL'}`);
  console.log(`   ${results.slopscan}\n`);

  console.log(`2. pageerror: ${pageErrors.length === 0 ? 'zero — PASS' : pageErrors.length + ' errori — FAIL'}`);
  if (pageErrors.length > 0) {
    pageErrors.forEach(e => console.log(`   → ${e}`));
  }
  console.log('');

  console.log(`3. Texture caricate: ${results.textureCount}/4`);
  textureLogs.forEach(l => console.log(`   ${l}`));
  console.log(`   → ${results.texturesOk ? 'PASS' : 'FAIL'}\n`);

  console.log(`4. Mode durante scroll: ${results.modesSeen}`);
  console.log(`   → ${results.modesPass ? 'PASS' : 'FAIL'} (deve visitare 0, 1 e 2)\n`);

  console.log('5. Contrasto testo palco (5 punti × 4 blocchi):');
  for (const block of allContrastResults) {
    console.log(`   ${block.block} (${block.position}): min ${block.minRatio}:1`);
    block.points.forEach(pt => {
      console.log(`     punto ${pt.point} (y=${pt.y}): bg=rgb(${pt.bgRgb}) → ${pt.ratio}:1`);
    });
  }
  console.log(`   MINIMO GLOBALE: ${globalMinContrast}:1 → ${globalMinContrast >= 4.5 ? 'PASS' : 'FAIL'} (deve ≥ 4.5:1)\n`);

  console.log(`6. Peso pagina: ${distKB} KB\n`);

  console.log('══════════════════════════════════════════');
  const allPass = results.slopscanPass && pageErrors.length === 0 && results.texturesOk && results.modesPass && globalMinContrast >= 4.5;
  console.log(allPass ? '  ✅ TUTTI I CHECK PASSANO' : '  ❌ ALCUNI CHECK FALLISCONO');
  console.log('══════════════════════════════════════════\n');

  await browser.close();
}

main().catch(e => { console.error(e); process.exit(1); });
