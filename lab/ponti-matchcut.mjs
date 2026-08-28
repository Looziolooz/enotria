/**
 * ponti-matchcut.mjs — Ponti "match cut" fra i segmenti del film v2.
 *
 * Al posto delle transizioni shader: dall'ultimo fotogramma del segmento N si
 * zooma su un dettaglio che esiste anche nel primo fotogramma del segmento N+1;
 * all'apice le due immagini si SOVRAPPONGONO in dissolvenza (6 frame) mentre
 * mostrano lo stesso soggetto a pieno quadro; poi si de-zooma nel segmento N+1.
 * 12 + 6 + 12 = 30 fotogrammi per ponte, fermi immagine: sotto scrub leggono
 * come punch-in voluti, non come "transizione".
 *
 * Output: lab/ponti/<id>/d/*.webp (1280) e /m/*.webp (720), 30 frame per ponte.
 * Poi lab/assembla-film-v3.mjs li monta nel film.
 *
 * Uso: node lab/ponti-matchcut.mjs
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, rmSync, readdirSync, copyFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const FILM = join(ROOT, 'public/frames/film');
const OUT = join(ROOT, 'lab/ponti');
const K = 12;      // frame di zoom per lato
const KB = 6;      // frame di sovrapposizione all'apice
const UP = 6400;   // upscale pre-zoom contro la sgranatura

/* Giunzioni: frame A (ultimo del segmento) e B (primo del successivo),
   dettaglio condiviso come (px, py) centro in frazioni e f = larghezza
   del dettaglio in frazione del quadro. Scelti a occhio sulle coppie
   con griglia al 10% (2026-08-28). */
/* Coordinate raffinate con lab/misura-dettagli.mjs (centroide del colore del
   dettaglio); solo le due giunzioni a texture (muretti, legno) restano a occhio. */
const PONTI = [
  { id: 'nave-approdo',    a: 192,  b: 193,  A: [0.236, 0.721, 0.13], B: [0.236, 0.723, 0.15], dettaglio: 'il sole' },
  { id: 'approdo-vigna',   a: 384,  b: 385,  A: [0.17, 0.72, 0.30],  B: [0.25, 0.62, 0.30],  dettaglio: 'muretti e filari' },
  { id: 'vigna-raccolta',  a: 576,  b: 577,  A: [0.294, 0.287, 0.07], B: [0.771, 0.300, 0.133], dettaglio: 'il grappolo' },
  { id: 'raccolta-scambio',a: 768,  b: 769,  A: [0.239, 0.321, 0.07], B: [0.779, 0.497, 0.125], dettaglio: 'il grappolo' },
  { id: 'scambio-trasporto',a: 812, b: 813,  A: [0.244, 0.637, 0.097], B: [0.414, 0.583, 0.07], dettaglio: 'il grappolo' },
  { id: 'trasporto-vasca', a: 1004, b: 1005, A: [0.550, 0.588, 0.17],  B: [0.474, 0.660, 0.092], dettaglio: 'il cesto colmo' },
  { id: 'travaso-rubinetto',a: 2396,b: 2397, A: [0.35, 0.80, 0.30],  B: [0.20, 0.75, 0.30],  dettaglio: 'il legno della botte' },
  { id: 'rubinetto-vino',  a: 2519, b: 2520, A: [0.564, 0.673, 0.078], B: [0.457, 0.747, 0.152], dettaglio: 'il vino nel calice' },
];

const zoomDi = (f) => Math.min(Math.max(0.62 / f, 1.8), 3.2);
const pad = (n) => String(n).padStart(4, '0');
const ff = (args) => execFileSync('ffmpeg', ['-y', '-v', 'error', ...args], { stdio: ['ignore', 'inherit', 'inherit'] });

/* Un lato di zoom: da pieno quadro al dettaglio (reverse=false) o viceversa. */
function lato(srcFrame, [px, py, f], reverse, outDir, prefix) {
  const Z = zoomDi(f);
  // p: progresso dello zoom 0→1 (smoothstep); reverse inverte la rampa
  const p = reverse ? `(1-on/${K - 1})` : `(on/${K - 1})`;
  const ss = `(${p}*${p}*(3-2*${p}))`;
  const z = `1+${(Z - 1).toFixed(4)}*${ss}`;
  const x = `clip(iw*(0.5+(${px}-0.5)*${ss}) - iw/(2*zoom), 0, iw-iw/zoom)`;
  const y = `clip(ih*(0.5+(${py}-0.5)*${ss}) - ih/(2*zoom), 0, ih-ih/zoom)`;
  ff(['-loop', '1', '-i', join(FILM, `${pad(srcFrame)}.webp`),
    '-vf', `scale=${UP}:-2,zoompan=z='${z}':x='${x}':y='${y}':d=1:s=1280x720:fps=24`,
    '-frames:v', String(K), join(outDir, `${prefix}%02d.png`)]);
}

/* Apice: il crop fermo del dettaglio, per la sovrapposizione. */
function apice(srcFrame, [px, py, f], outPng) {
  const Z = zoomDi(f);
  const cw = (1 / Z).toFixed(5);
  const cx = Math.min(Math.max(px - 1 / (2 * Z), 0), 1 - 1 / Z).toFixed(5);
  const cy = Math.min(Math.max(py - 1 / (2 * Z), 0), 1 - 1 / Z).toFixed(5);
  ff(['-i', join(FILM, `${pad(srcFrame)}.webp`),
    '-vf', `scale=${UP}:-2,crop=iw*${cw}:ih*${cw}:iw*${cx}:ih*${cy},scale=1280:720`,
    '-frames:v', '1', outPng]);
}

rmSync(OUT, { recursive: true, force: true });

for (const g of PONTI) {
  const dir = join(OUT, g.id);
  const tmp = join(dir, 'tmp');
  mkdirSync(tmp, { recursive: true });
  mkdirSync(join(dir, 'd'), { recursive: true });
  mkdirSync(join(dir, 'm'), { recursive: true });

  lato(g.a, g.A, false, tmp, 'in-');
  lato(g.b, g.B, true, tmp, 'out-');
  apice(g.a, g.A, join(tmp, 'apice-a.png'));
  apice(g.b, g.B, join(tmp, 'apice-b.png'));

  // sovrapposizione all'apice: alpha smoothstep su KB frame
  for (let k = 1; k <= KB; k++) {
    const t = k / (KB + 1);
    const alpha = (t * t * (3 - 2 * t)).toFixed(4);
    ff(['-i', join(tmp, 'apice-a.png'), '-i', join(tmp, 'apice-b.png'),
      '-filter_complex', `[1:v]format=rgba,colorchannelmixer=aa=${alpha}[b];[0:v][b]overlay=format=auto`,
      '-frames:v', '1', join(tmp, `mix-${String(k).padStart(2, '0')}.png`)]);
  }

  // sequenza finale del ponte: in-* + mix-* + out-* → webp d/ e m/
  const seq = [
    ...readdirSync(tmp).filter((f) => f.startsWith('in-')).sort(),
    ...readdirSync(tmp).filter((f) => f.startsWith('mix-')).sort(),
    ...readdirSync(tmp).filter((f) => f.startsWith('out-')).sort(),
  ];
  seq.forEach((f, i) => copyFileSync(join(tmp, f), join(tmp, `seq-${String(i + 1).padStart(2, '0')}.png`)));
  ff(['-i', join(tmp, 'seq-%02d.png'), '-vf', 'scale=1280:-2', '-c:v', 'libwebp', '-quality', '62', join(dir, 'd', '%02d.webp')]);
  ff(['-i', join(tmp, 'seq-%02d.png'), '-vf', 'scale=720:-2', '-c:v', 'libwebp', '-quality', '42', join(dir, 'm', '%02d.webp')]);
  rmSync(tmp, { recursive: true, force: true });
  console.log(`${g.id}: ${seq.length} frame (${g.dettaglio}, Z=${zoomDi(g.A[2]).toFixed(1)}→${zoomDi(g.B[2]).toFixed(1)})`);
}
console.log('Ponti pronti in lab/ponti/. Ora: node lab/assembla-film-v3.mjs');
