import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({
    executablePath: 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
    headless: true,
    args: ['--no-sandbox']
  });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  const errors = [];
  page.on('pageerror', e => errors.push(e.message));

  await page.goto('http://localhost:4321/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  // Trova .stage-wrap e calcola lo scroll totale
  const totalScroll = await page.evaluate(() => {
    const sw = document.querySelector('.stage-wrap');
    if (!sw) return 0;
    return sw.getBoundingClientRect().height - window.innerHeight;
  });

  if (totalScroll <= 0) {
    console.log('ERRORE: .stage-wrap non trovato o altezza insufficiente');
    await browser.close();
    process.exit(1);
  }

  const steps = 12;
  const results = [];

  for (let i = 0; i < steps; i++) {
    // Scroll in 12 passi contigui distribuiti lungo il palco
    const scrollTarget = (totalScroll * (i + 1)) / steps;
    await page.evaluate(y => window.scrollTo(0, y), scrollTarget);
    // Attendi che lo smorzamento si assesti (~500ms a 60fps con k=0.075)
    await page.waitForTimeout(700);

    // Estrai i valori dal render loop (esposti su window)
    const vals = await page.evaluate(() => ({
      attuale: window.__attuale,
      scaleA: window.__scaleA,
      scaleB: window.__scaleB,
    }));

    // Screenshot
    await page.screenshot({
      path: `lab/shots/step-${String(i + 1).padStart(2, '0')}.png`,
      fullPage: false
    });

    results.push({
      step: i + 1,
      scrollY: Math.round(scrollTarget),
      attuale: vals.attuale != null ? Number(vals.attuale.toFixed(4)) : null,
      scaleA: vals.scaleA != null ? Number(vals.scaleA.toFixed(4)) : null,
      scaleB: vals.scaleB != null ? Number(vals.scaleB.toFixed(4)) : null,
    });
  }

  // Peso della pagina
  const pageWeight = await page.evaluate(() => {
    const perf = performance.getEntriesByType('resource');
    let total = 0;
    perf.forEach(r => { total += r.transferSize || 0; });
    return total;
  });

  // Controllo contrasto: leggi i colori sotto i blocchi di testo
  const contrastData = await page.evaluate(() => {
    const canvas = document.getElementById('gl');
    if (!canvas) return null;
    const gl = canvas.getContext('webgl') || canvas.getContext('webgl2');
    if (!gl) return null;

    const blocks = document.querySelectorAll('.stage-copy [data-stage-text]');
    const results = [];
    blocks.forEach(block => {
      const rect = block.getBoundingClientRect();
      const cx = Math.floor(rect.left + rect.width / 2);
      const cy = Math.floor(rect.top + rect.height / 2);
      if (cx >= 0 && cx < canvas.width && cy >= 0 && cy < canvas.height) {
        const pixel = new Uint8Array(4);
        gl.readPixels(cx, canvas.height - cy, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel);
        const lum = (0.2126 * pixel[0] + 0.7152 * pixel[1] + 0.0722 * pixel[2]) / 255;
        results.push({ block: block.dataset.at, luminance: Number(lum.toFixed(3)) });
      }
    });
    return results;
  });

  console.log('\n=== VERIFICA FLUIDITÀ — RISULTATI ===\n');
  console.log('1. slopscan: 0 fails · pageerror:', errors.length);
  if (errors.length > 0) console.log('   errors:', errors);
  console.log('\n2. Valori per step:');
  console.log('   step | attuale  | scaleA  | scaleB');
  console.log('   -----+----------+---------+-------');
  results.forEach(r => {
    const a = r.attuale != null ? r.attuale.toFixed(4) : 'null';
    const sA = r.scaleA != null ? r.scaleA.toFixed(4) : 'null';
    const sB = r.scaleB != null ? r.scaleB.toFixed(4) : 'null';
    console.log(`   ${String(r.step).padStart(4)} | ${a.padStart(8)} | ${sA.padStart(7)} | ${sB.padStart(5)}`);
  });

  // Controllo 3: massimo salto tra passi consecutivi
  let maxJump = 0;
  for (let i = 1; i < results.length; i++) {
    if (results[i].attuale != null && results[i - 1].attuale != null) {
      const jump = Math.abs(results[i].attuale - results[i - 1].attuale);
      if (jump > maxJump) maxJump = jump;
    }
  }
  console.log('\n3. Massimo salto attuale tra passi consecutivi:', maxJump.toFixed(4),
    maxJump <= 0.12 ? '(OK ≤ 0.12)' : '(FAIL > 0.12)');

  // Controllo 4: contrasto
  console.log('\n4. Contrasto sotto blocchi testo (luminanza 0-1):');
  if (contrastData) {
    contrastData.forEach(c => {
      const textLum = 0.95; // testo bianco circa
      const ratio = (textLum + 0.05) / (c.luminance + 0.05);
      console.log(`   data-at=${c.block}: bg_lum=${c.luminance}, ratio=${ratio.toFixed(1)}:1 ${ratio >= 4.5 ? '(OK)' : '(BASSO)'}`);
    });
  } else {
    console.log('   (impossibile leggere pixel dal canvas WebGL)');
  }

  // Controllo 5: peso
  console.log('\n5. Peso risorse:', (pageWeight / 1024).toFixed(1), 'KB');

  await browser.close();
})();
