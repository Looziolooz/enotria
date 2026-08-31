/**
 * rifinisci-film.mjs — rialza la qualita' del film DOVE si vede, e solo li'.
 *
 * Misurato il 2026-08-31 sul fotogramma 100 di clip-3:
 *  - desktop a grandezza naturale, q62 → q82: SSIM 0.962 → 0.972, ma +50%
 *    di peso e a 3x di ingrandimento le due versioni sono indistinguibili.
 *    Il limite non e' il WebP: e' la compressione H.264 della clip sorgente.
 *    Quindi il desktop **non si tocca** dove il fotogramma scorre a 1:1.
 *  - mobile q42 → q62: SSIM 0.939 → 0.952 e si VEDE (le foglie smettono di
 *    impastarsi), per +4 KB a fotogramma. Il tier mobile era vent'anni
 *    indietro rispetto al desktop: la' il guadagno e' reale.
 *
 * Quindi:
 *  1. tutto il tier MOBILE passa da q42 a q62;
 *  2. sul DESKTOP salgono a q88 i soli fotogrammi dentro le inquadrature
 *     (ingranditi 1,8–2,2x), dove gli artefatti si ingrandiscono con l'immagine;
 *  3. le zone-ponte cotte si saltano: non vengono mai mostrate (i raccordi
 *     sono vivi e usano i fermi-immagine delle inquadrature vicine);
 *  4. alla fine si rilancia lab/rifinisci-fermi.mjs, perche' i dodici fermi
 *     dei raccordi restino a q95.
 *
 * Estrazione a lotti: una chiamata ffmpeg per segmento, non per fotogramma.
 * Uso: node lab/rifinisci-film.mjs
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync, mkdtempSync, readdirSync, renameSync, rmSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CLIP = join(ROOT, '_sorgenti/video/hf-foto/videoflow');
const D = join(ROOT, 'public/frames/film');
const M = join(ROOT, 'public/frames-m/film');
const pad = (n) => String(n).padStart(4, '0');

const seg = JSON.parse(readFileSync(join(ROOT, 'public/dati/segmenti.json'), 'utf8')).segmenti;
const inq = JSON.parse(readFileSync(join(ROOT, 'public/dati/inquadrature.json'), 'utf8')).inquadrature;

/* intervalli ingranditi, code comprese */
const ZONE = inq.map((x) => [x.da - (x.entra || 30), x.a + (x.esce || 30)]);
const ingrandito = (f) => ZONE.some(([a, b]) => f >= a && f <= b);

function peso(dir) {
  let t = 0;
  for (const f of readdirSync(dir)) t += statSync(join(dir, f)).size;
  return Math.round(t / 1048576);
}

const primaD = peso(D), primaM = peso(M);
let lottiD = 0, lottiM = 0;

for (const s of seg) {
  if (!s.sorgente || s.sorgente.startsWith('lab/')) continue;   /* zona cotta: mai mostrata */
  const mp4 = join(CLIP, s.sorgente);
  if (!existsSync(mp4)) { console.log(`${s.id}: manca ${s.sorgente}, saltato`); continue; }

  const n = s.a - s.da + 1;
  const primoOffset = 0;              /* i segmenti superstiti partono dal fotogramma 1 della clip */
  const ultimoOffset = n - 1;
  const sel = `select='between(n\\,${primoOffset}\\,${ultimoOffset})'`;

  /* ── mobile: sempre, q62 ── */
  const tmpM = mkdtempSync(join(tmpdir(), 'oen-m-'));
  execFileSync('ffmpeg', ['-y', '-v', 'error', '-i', mp4, '-vf', `${sel},scale=720:-2`,
    '-vsync', '0', '-c:v', 'libwebp', '-quality', '62', join(tmpM, '%04d.webp')]);
  const fileM = readdirSync(tmpM).sort();
  fileM.forEach((f, i) => renameSync(join(tmpM, f), join(M, pad(s.da + i) + '.webp')));
  rmSync(tmpM, { recursive: true, force: true });
  lottiM++;

  /* ── desktop: solo se il segmento tocca un'inquadratura, q88 ── */
  const tocca = [];
  for (let f = s.da; f <= s.a; f++) if (ingrandito(f)) tocca.push(f);
  if (tocca.length) {
    const tmpD = mkdtempSync(join(tmpdir(), 'oen-d-'));
    execFileSync('ffmpeg', ['-y', '-v', 'error', '-i', mp4, '-vf', `${sel},scale=1280:-2`,
      '-vsync', '0', '-c:v', 'libwebp', '-quality', '88', join(tmpD, '%04d.webp')]);
    const fileD = readdirSync(tmpD).sort();
    fileD.forEach((f, i) => {
      const num = s.da + i;
      if (ingrandito(num)) renameSync(join(tmpD, f), join(D, pad(num) + '.webp'));
    });
    rmSync(tmpD, { recursive: true, force: true });
    lottiD++;
    console.log(`${s.id.padEnd(26)} mobile q62 (${n}) · desktop q88 su ${tocca.length}`);
  } else {
    console.log(`${s.id.padEnd(26)} mobile q62 (${n}) · desktop invariato`);
  }
}

console.log(`\nlotti: ${lottiM} mobile, ${lottiD} desktop`);
console.log(`peso desktop ${primaD} → ${peso(D)} MB · mobile ${primaM} → ${peso(M)} MB`);
console.log('\nOra rilancio i dodici fermi dei raccordi a q95…');
execFileSync('node', [join(ROOT, 'lab/rifinisci-fermi.mjs')], { stdio: 'inherit' });
