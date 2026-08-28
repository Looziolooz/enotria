/**
 * misura-dettagli.mjs — Centroide preciso dei dettagli condivisi dei ponti.
 * Legge il frame via ffmpeg (rgb24 1280x720), maschera il colore del dettaglio
 * dentro una finestra attorno alla stima a occhio, stampa px/py raffinati.
 */
import { execFileSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const W = 1280, H = 720;

const MASCHERE = {
  sole:     (r, g, b) => r > 190 && g > 110 && g < 200 && b < 100,
  uva:      (r, g, b) => b > r && r < 115 && g < 100 && b > 70 && b < 175,
  vino:     (r, g, b) => r > 80 && r > g * 1.8 && b < 90,
};

const MISURE = [
  ['0192', 'sole', 0.235, 0.685], ['0193', 'sole', 0.285, 0.655],
  ['0576', 'uva', 0.245, 0.32],  ['0577', 'uva', 0.79, 0.30],
  ['0768', 'uva', 0.235, 0.28],  ['0769', 'uva', 0.765, 0.50],
  ['0812', 'uva', 0.29, 0.63],   ['0813', 'uva', 0.335, 0.50],
  ['1004', 'uva', 0.29, 0.67],   ['1005', 'uva', 0.425, 0.70],
  ['2519', 'vino', 0.55, 0.60],  ['2520', 'vino', 0.43, 0.55],
];
const FINESTRA = 0.16; // semi-lato della finestra di ricerca

for (const [frame, tipo, ex, ey] of MISURE) {
  const raw = execFileSync('ffmpeg', ['-v', 'error', '-i',
    join(ROOT, 'public/frames/film', frame + '.webp'),
    '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], { maxBuffer: 8 * W * H });
  const test = MASCHERE[tipo];
  const x0 = Math.max(0, Math.round((ex - FINESTRA) * W)), x1 = Math.min(W, Math.round((ex + FINESTRA) * W));
  const y0 = Math.max(0, Math.round((ey - FINESTRA) * H)), y1 = Math.min(H, Math.round((ey + FINESTRA) * H));
  let sx = 0, sy = 0, n = 0;
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
    const i = (y * W + x) * 3;
    if (test(raw[i], raw[i + 1], raw[i + 2])) { sx += x; sy += y; n++; }
  }
  if (n < 50) { console.log(`${frame} ${tipo}: SOLO ${n} px — tenere stima (${ex}, ${ey})`); continue; }
  // f = larghezza del dettaglio: dal conteggio pixel, come lato del quadrato equivalente
  const f = Math.sqrt(n) / W;
  console.log(`${frame} ${tipo}: px=${(sx / n / W).toFixed(3)} py=${(sy / n / H).toFixed(3)} f≈${(f * 2).toFixed(3)} (${n}px, stima era ${ex},${ey})`);
}
