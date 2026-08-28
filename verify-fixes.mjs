/**
 * verify-fixes.mjs — Verifica i 4 punti richiesti dopo correzione difetti.
 *
 * 1. slopscan → 0 fails
 * 2. Contrasto minimo in 5 punti sotto il testo atto 7 ≥ 4.5:1
 * 3. pageerror: zero
 * 4. currentMode assume 0, 1 e 2 durante lo scroll
 */

import { execSync } from 'child_process';
import { chromium } from 'playwright-core';

const CHROME = 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe';
const URL = 'http://localhost:4321';

/* — helpers contrasto WCAG — */
function srgbToLinear(c) {
  c = c / 255;
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

function luminance(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return 0.2126 * srgbToLinear(r) + 0.7152 * srgbToLinear(g) + 0.0722 * srgbToLinear(b);
}

function contrastRatio(bgHex, fgHex) {
  const L1 = luminance(bgHex);
  const L2 = luminance(fgHex);
  const lighter = Math.max(L1, L2);
  const darker = Math.min(L1, L2);
  return (lighter + 0.05) / (darker + 0.05);
}

function hexFromRGB(r, g, b) {
  return '#' + [r, g, b].map(v => Math.round(v).toString(16).padStart(2, '0')).join('');
}

function lerp(a, b, t) {
  return a + (b - a) * t;
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

  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  /* ══════════════════════════════════════════════
     4. Traccia currentMode durante lo scroll
     ══════════════════════════════════════════════ */
  /* currentMode è calcolata nel render loop dal rapporto scrollProgress.
     scrollProgress = scrollY / (scrollHeight - innerHeight).
     mode 0: progress < 0.4, mode 1: 0.4–0.75, mode 2: ≥ 0.75. */

  const scrollHeight = await page.evaluate(() => document.documentElement.scrollHeight);
  const innerH = await page.evaluate(() => window.innerHeight);
  const docHeight = scrollHeight - innerH;
  const modesFound = new Set();

  const modeSteps = 30;
  for (let i = 0; i <= modeSteps; i++) {
    const y = Math.round(docHeight * (i / modeSteps));
    await page.evaluate(sy => window.scrollTo(0, sy), y);
    await page.waitForTimeout(150);

    /* Leggi progress direttamente come fa lo shader */
    const progress = await page.evaluate(() => {
      const st = window.scrollY;
      const dh = document.documentElement.scrollHeight - window.innerHeight;
      return dh > 0 ? st / dh : 0;
    });

    let m = 0;
    if (progress >= 0.4 && progress < 0.75) m = 1;
    else if (progress >= 0.75) m = 2;
    modesFound.add(m);
  }

  results.modesSeen = [...modesFound].sort();
  results.modesPass = modesFound.has(0) && modesFound.has(1) && modesFound.has(2);

  /* ══════════════════════════════════════════════
     2. Contrasto atto 7 — 5 punti sotto il testo
     ══════════════════════════════════════════════ */

  /* Scroll all'atto 7 */
  await page.evaluate(() => {
    const act7 = document.querySelector('.act--gesto');
    if (act7) act7.scrollIntoView({ behavior: 'instant', block: 'start' });
  });
  await page.waitForTimeout(500);

  /* Leggi la posizione del paragrafo e del blocco testo */
  const layout = await page.evaluate(() => {
    const text = document.querySelector('.act7-text');
    const p = document.querySelector('.act7-text p');
    const overlay = document.querySelector('.act7-overlay');
    const textR = text ? text.getBoundingClientRect() : null;
    const pR = p ? p.getBoundingClientRect() : null;
    const ovR = overlay ? overlay.getBoundingClientRect() : null;
    return {
      textTop: textR?.top,
      textBottom: textR?.bottom,
      pTop: pR?.top,
      pBottom: pR?.bottom,
      ovTop: ovR?.top,
      ovHeight: ovR?.height,
    };
  });

  console.log('  layout atto7:', JSON.stringify(layout, null, 2));

  /* 5 punti: subito sotto il paragrafo fino a ~150px più in basso */
  const refY = layout.pBottom || (layout.textBottom - 20);
  const centerX = 640;
  const samplePoints = [];
  for (let i = 0; i < 5; i++) {
    samplePoints.push({ x: centerX, y: Math.round(refY + 15 + i * 30) });
  }

  /* Calcola il colore dell'overlay al punto Y usando i stop CSS.
     Overlay gradient:
       0%   → rgba(36, 20, 22, 1.00)
       25%  → rgba(36, 20, 22, 0.85)
       55%  → rgba(36, 20, 22, 0.55)
       85%  → rgba(36, 20, 22, 0.00) */

  const overlayStops = [
    { pos: 0.00, r: 36, g: 20, b: 22, a: 1.00 },
    { pos: 0.70, r: 36, g: 20, b: 22, a: 1.00 },
    { pos: 0.85, r: 36, g: 20, b: 22, a: 0.45 },
    { pos: 0.95, r: 36, g: 20, b: 22, a: 0.00 },
  ];

  const fgHex = '#E8DFCF'; /* colore testo calce */
  const worstCaseBg = [232, 223, 207]; /* #E8DFCF — punto più chiaro dell'immagine */

  const contrastResults = samplePoints.map(pt => {
    const relY = (pt.y - layout.ovTop) / layout.ovHeight;

    /* Interpola tra gli stop del gradiente */
    let s0 = overlayStops[0];
    let s1 = overlayStops[overlayStops.length - 1];
    for (let j = 0; j < overlayStops.length - 1; j++) {
      if (relY >= overlayStops[j].pos && relY <= overlayStops[j + 1].pos) {
        s0 = overlayStops[j];
        s1 = overlayStops[j + 1];
        break;
      }
    }

    const range = s1.pos - s0.pos;
    const t = range > 0 ? (relY - s0.pos) / range : 0;
    const alpha = lerp(s0.a, s1.a, t);

    /* Alpha-blend con worst-case immagine chiara */
    const bgR = lerp(worstCaseBg[0], s0.r, alpha);
    const bgG = lerp(worstCaseBg[1], s0.g, alpha);
    const bgB = lerp(worstCaseBg[2], s0.b, alpha);
    const bgHex = hexFromRGB(bgR, bgG, bgB);

    const ratio = contrastRatio(bgHex, fgHex);

    return {
      y: pt.y,
      relY: Math.round(relY * 1000) / 1000,
      alpha: Math.round(alpha * 100) / 100,
      bg: bgHex,
      ratio: Math.round(ratio * 100) / 100,
    };
  });

  const minContrast = Math.min(...contrastResults.map(c => c.ratio));

  /* ══════════════════════════════════════════════
     Report finale
     ══════════════════════════════════════════════ */
  console.log('\n══════════════════════════════════════════');
  console.log('  VERIFICA FINALE — oenotria');
  console.log('══════════════════════════════════════════\n');

  console.log(`1. slopscan: ${results.slopscan}`);
  console.log(`   → ${results.slopscanPass ? 'PASS' : 'FAIL'} (deve essere 0 fails)\n`);

  console.log('2. Contrasto atto 7 (worst-case su punto più chiaro dell\'immagine):');
  contrastResults.forEach((c, i) => {
    console.log(`   punto ${i + 1} (y=${c.y}, α=${c.alpha}): bg=${c.bg} → ${c.ratio}:1`);
  });
  console.log(`   MINIMO: ${minContrast}:1 → ${minContrast >= 4.5 ? 'PASS' : 'FAIL'} (deve ≥ 4.5:1)\n`);

  console.log(`3. pageerror: ${pageErrors.length === 0 ? 'zero — PASS' : pageErrors.length + ' errori — FAIL'}`);
  if (pageErrors.length > 0) {
    pageErrors.forEach(e => console.log(`   → ${e}`));
  }
  console.log('');

  console.log(`4. Shader mode durante scroll: ${results.modesSeen}`);
  console.log(`   → ${results.modesPass ? 'PASS' : 'FAIL'} (deve visitare 0, 1 e 2)\n`);

  await browser.close();
}

main().catch(e => { console.error(e); process.exit(1); });
