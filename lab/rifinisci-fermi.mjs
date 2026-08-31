/**
 * rifinisci-fermi.mjs — rialza la qualita' dei soli fotogrammi che vengono
 * INGRANDITI.
 *
 * Il film e' codificato in WebP q62: giusto per fotogrammi che scorrono a
 * grandezza naturale, troppo poco per i dodici fermi-immagine su cui i
 * raccordi zoomano fino a 2,6x — li' gli artefatti di compressione si
 * ingrandiscono insieme all'immagine. Questo script li riestrae dalle
 * clip sorgente a q95 (mobile q88) e li rimette al loro posto.
 *
 * Nessun modello, nessun ingrandimento inventato: sono gli stessi pixel,
 * codificati meglio. Il salto vero sui primi piani si otterrebbe solo
 * generando la clip gia' stretta (vedi ASSETS.md) o con un ingranditore
 * AI sui soli dodici file (vedi la voce QualityScaler nel vault).
 *
 * Uso: node lab/rifinisci-fermi.mjs
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync, statSync, mkdirSync, copyFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CLIP = join(ROOT, '_sorgenti/video/hf-foto/videoflow');
const D = join(ROOT, 'public/frames/film');
const M = join(ROOT, 'public/frames-m/film');
const ARCH = join(ROOT, '_sorgenti/fermi-prima-della-rifinitura');
const pad = (n) => String(n).padStart(4, '0');

const seg = JSON.parse(readFileSync(join(ROOT, 'public/dati/segmenti.json'), 'utf8')).segmenti;
const ponti = JSON.parse(readFileSync(join(ROOT, 'public/dati/ponti.json'), 'utf8')).ponti;

const dentro = (f) => seg.find((s) => f >= s.da && f <= s.a);
const fermi = [...new Set(ponti.flatMap((p) => [p.frameA, p.frameB]))].sort((a, b) => a - b);

mkdirSync(ARCH, { recursive: true });
let fatti = 0, saltati = 0, guadagno = 0;

for (const f of fermi) {
  const s = dentro(f);
  if (!s || !s.sorgente || s.sorgente.startsWith('lab/')) {
    console.log(`${pad(f)}: dentro '${s ? s.id : '?'}' — non e' una clip sorgente, saltato`);
    saltati++;
    continue;
  }
  const mp4 = join(CLIP, s.sorgente);
  if (!existsSync(mp4)) { console.log(`${pad(f)}: manca ${s.sorgente}, saltato`); saltati++; continue; }

  /* i segmenti superstiti conservano l'allineamento con la loro clip:
     il fotogramma n del segmento e' il fotogramma n della clip */
  const offset = f - s.da + 1;
  const dest = join(D, pad(f) + '.webp');
  const destM = join(M, pad(f) + '.webp');
  const prima = statSync(dest).size;
  copyFileSync(dest, join(ARCH, pad(f) + '.webp'));

  const sel = `select='eq(n\\,${offset - 1})'`;
  execFileSync('ffmpeg', ['-y', '-v', 'error', '-i', mp4, '-vf', `${sel},scale=1280:-2`,
    '-frames:v', '1', '-c:v', 'libwebp', '-quality', '95', dest]);
  execFileSync('ffmpeg', ['-y', '-v', 'error', '-i', mp4, '-vf', `${sel},scale=720:-2`,
    '-frames:v', '1', '-c:v', 'libwebp', '-quality', '88', destM]);

  const dopo = statSync(dest).size;
  guadagno += dopo - prima;
  console.log(`${pad(f)}: ${s.sorgente} fotogramma ${offset} — ${Math.round(prima / 1024)} → ${Math.round(dopo / 1024)} KB`);
  fatti++;
}

console.log(`\n${fatti} fermi rifiniti, ${saltati} saltati. Peso aggiunto: ${Math.round(guadagno / 1024)} KB.`);
console.log(`Originali in _sorgenti/fermi-prima-della-rifinitura/`);
