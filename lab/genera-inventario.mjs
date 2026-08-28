/**
 * genera-inventario.mjs — Deriva la tabella dei segmenti del film (metodo pear.no:
 * «Animation Asset Inventory») da public/dati/tagli.json + frames.json.
 *
 * Fonte di verità: i markdown/JSON del runtime. Questo file NON inventa numeri:
 *  - i confini dei segmenti vengono dalle frazioni `at` dei 18 tagli × n fotogrammi;
 *  - se _sorgenti/video è presente e ffprobe è nel PATH, ogni conteggio viene
 *    verificato contro durata_clip × 24 fps (tolleranza ±1 per arrotondamento).
 *
 * Output:
 *  - public/dati/segmenti.json  (consumabile dal runtime/debug)
 *  - tabella markdown su stdout (da incollare in ASSETS.md)
 *
 * Uso:  node lab/genera-inventario.mjs
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const FPS = 24;

/* Ordine di regia (dal montaggio del committente) → file sorgente in _sorgenti/video. */
const SORGENTI = [
  ['15',    '15.mp4'],
  ['1a',    '1a.mp4'],
  ['1b',    '1b.mp4'],
  ['1c',    '1c.mp4'],
  ['2',     '2.mp4'],
  ['3',     '3.mp4'],
  ['3a4',   '3a- 4 - Trim.mp4'],
  ['4',     '4.mp4'],
  ['6',     '6.mp4'],
  ['6a7',   '6a-7 - Trim.mp4'],
  ['7',     '7.mp4'],
  ['7a9',   '7a-9.mp4'],
  ['9',     '9.mp4'],
  ['10',    '10 - Trim.mp4'],
  ['10a11', '10a-11 - Trim.mp4'],
  ['11',    '11.mp4'],
  ['12',    '12.mp4'],
  ['12a13', '12a-13.mp4'],
  ['14',    '14.mp4'],
];

const tagli = JSON.parse(readFileSync(join(ROOT, 'public/dati/tagli.json'), 'utf8')).tagli;
const film = JSON.parse(readFileSync(join(ROOT, 'public/dati/frames.json'), 'utf8'))[0];
const N = film.n;

if (tagli.length !== SORGENTI.length - 1) {
  throw new Error(`Attesi ${SORGENTI.length - 1} tagli per ${SORGENTI.length} segmenti, trovati ${tagli.length}`);
}

/* Confini: il segmento k va da (taglio k-1)+1 al taglio k; il primo parte da 1, l'ultimo chiude a N. */
const confini = tagli.map((t) => Math.round(t.at * N));
const segmenti = SORGENTI.map(([id, sorgente], i) => {
  const da = i === 0 ? 1 : confini[i - 1] + 1;
  const a = i === SORGENTI.length - 1 ? N : confini[i];
  return {
    id,
    ordine: i + 1,
    da,
    a,
    n: a - da + 1,
    sorgente: `_sorgenti/video/${sorgente}`,
    giunzione_in: i === 0 ? null : { at: tagli[i - 1].at, modo: tagli[i - 1].modo, verso: tagli[i - 1].verso },
    giunzione_out: i === SORGENTI.length - 1 ? null : { at: tagli[i].at, modo: tagli[i].modo, verso: tagli[i].verso },
  };
});

/* Verifica contro le sorgenti, se disponibili. */
const videoDir = join(ROOT, '_sorgenti/video');
let verifica = 'sorgenti non presenti: verifica ffprobe saltata';
if (existsSync(videoDir)) {
  try {
    let scarti = 0;
    for (const s of segmenti) {
      const file = join(ROOT, s.sorgente);
      const durata = parseFloat(execFileSync('ffprobe', [
        '-v', 'error', '-select_streams', 'v:0',
        '-show_entries', 'stream=duration', '-of', 'csv=p=0', file,
      ], { encoding: 'utf8' }).trim());
      const atteso = durata * FPS;
      const scarto = Math.abs(atteso - s.n);
      s.verifica = { durata_s: durata, frame_attesi: Math.round(atteso * 10) / 10, scarto: Math.round(scarto * 10) / 10 };
      if (scarto > 1.02) { scarti++; console.error(`⚠ ${s.id}: derivati ${s.n}, attesi ${atteso.toFixed(1)} da ${s.sorgente}`); }
    }
    verifica = scarti === 0
      ? `ffprobe: tutti i ${segmenti.length} segmenti entro ±1 fotogramma dalla durata sorgente`
      : `ffprobe: ${scarti} segmenti oltre la tolleranza — controllare`;
  } catch (e) {
    verifica = `ffprobe non eseguibile (${e.message.split('\n')[0]}) — verifica saltata`;
  }
}

const somma = segmenti.reduce((acc, s) => acc + s.n, 0);
if (somma !== N) throw new Error(`La somma dei segmenti (${somma}) non torna con il film (${N})`);

const out = {
  generato_da: 'lab/genera-inventario.mjs — derivato, non modificare a mano',
  film: { n: N, w: film.w, h: film.h, fps: FPS, tier: ['frames/film (1280)', 'frames-m/film (720)'] },
  verifica,
  segmenti,
};
writeFileSync(join(ROOT, 'public/dati/segmenti.json'), JSON.stringify(out, null, 1) + '\n');
console.log(`public/dati/segmenti.json scritto — ${segmenti.length} segmenti, ${N} fotogrammi. ${verifica}\n`);

/* Tabella markdown per ASSETS.md */
console.log('| Segmento | Tipo asset | Fotogrammi / tier | Intervallo nel film | Sorgente |');
console.log('|---|---|---|---|---|');
for (const s of segmenti) {
  const nome = s.sorgente.replace('_sorgenti/video/', '');
  console.log(`| ${s.id} | Sequenza WebP | ${s.n} | ${String(s.da).padStart(4, '0')}–${String(s.a).padStart(4, '0')} | \`${nome}\` |`);
}
console.log(`| **Totale** | | **${N} / tier** | 0001–${N} | 19 clip |`);
