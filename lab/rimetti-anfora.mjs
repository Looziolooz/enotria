/**
 * rimetti-anfora.mjs — rimette nel film il gesto del cantiniere.
 *
 * Nel taglio del 31 agosto avevo tolto l'intero segmento 'anfora' come
 * "arrivo del cantiniere, tempo morto". Sbagliato: dentro quei fotogrammi
 * non c'era solo l'arrivo, c'era il GESTO — prende l'anfora da terra, se la
 * mette in spalla e va verso la porta verde. Senza, dal mosto che cola si
 * passa a lui gia' sulla soglia: manca l'atto che lega le due cose.
 *
 * Si rimette la parte che conta (clip-8 dal fotogramma 60: presa,
 * sollevamento, cammino) e si lascia fuori l'arrivo lento (0-59), che era
 * davvero tempo morto. La zona-ponte di 30 fotogrammi che restava viene
 * riassorbita: con il gesto per intero il raccordo non serve piu', la
 * continuita' la fa l'azione.
 *
 * Uso: node lab/rimetti-anfora.mjs
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdtempSync, readdirSync, renameSync, rmSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const D = join(ROOT, 'public/frames/film');
const M = join(ROOT, 'public/frames-m/film');
const CLIP = join(ROOT, '_sorgenti/video/hf-foto/videoflow/clip-8.mp4');
const pad = (n) => String(n).padStart(4, '0');

const DA_CLIP = 60;      /* dove comincia il gesto: la mano che afferra */
const A_CLIP = 191;      /* fine clip: e' dentro la porta */
const NUOVI = A_CLIP - DA_CLIP + 1;   /* 132 */

const segF = join(ROOT, 'public/dati/segmenti.json');
const seg = JSON.parse(readFileSync(segF, 'utf8'));
const ponte = seg.segmenti.find((s) => s.id === 'ponte-pigiatura-porta');
if (!ponte) throw new Error('la zona-ponte pigiatura-porta non c\'e\' piu\': film gia\' modificato?');

const INIZIO = ponte.da;                 /* qui comincia il nuovo segmento */
const VECCHI = ponte.a - ponte.da + 1;   /* 30 fotogrammi da sostituire */
const DELTA = NUOVI - VECCHI;            /* +102 */
const N_VECCHIO = seg.film.n;
const N_NUOVO = N_VECCHIO + DELTA;

console.log(`inserisco ${NUOVI} fotogrammi (clip-8 ${DA_CLIP}-${A_CLIP}) al posto dei ${VECCHI} della zona-ponte`);
console.log(`film ${N_VECCHIO} -> ${N_NUOVO}`);

/* ── 1) sposta in avanti tutto cio' che sta dopo la zona-ponte, dal fondo ── */
for (let i = N_VECCHIO; i > ponte.a; i--) {
  for (const dir of [D, M]) {
    const src = join(dir, pad(i) + '.webp');
    if (existsSync(src)) renameSync(src, join(dir, pad(i + DELTA) + '.webp'));
  }
}

/* ── 2) estrai il gesto dalla clip e mettilo al suo posto ── */
const sel = `select='between(n\\,${DA_CLIP}\\,${A_CLIP})'`;
for (const [dir, larg, q] of [[D, 1280, 88], [M, 720, 62]]) {
  const tmp = mkdtempSync(join(tmpdir(), 'oen-anf-'));
  execFileSync('ffmpeg', ['-y', '-v', 'error', '-i', CLIP, '-vf', `${sel},scale=${larg}:-2`,
    '-vsync', '0', '-c:v', 'libwebp', '-quality', String(q), join(tmp, '%04d.webp')]);
  const file = readdirSync(tmp).sort();
  if (file.length !== NUOVI) throw new Error(`attesi ${NUOVI} fotogrammi, estratti ${file.length}`);
  file.forEach((f, i) => renameSync(join(tmp, f), join(dir, pad(INIZIO + i) + '.webp')));
  rmSync(tmp, { recursive: true, force: true });
}
const suD = readdirSync(D).length, suM = readdirSync(M).length;
if (suD !== N_NUOVO || suM !== N_NUOVO) throw new Error(`su disco d=${suD} m=${suM}, attesi ${N_NUOVO}`);

/* ── 3) segmenti: la zona-ponte diventa il segmento 'anfora' ── */
seg.film.n = N_NUOVO;
seg.segmenti = seg.segmenti.map((s) => {
  if (s.id === 'ponte-pigiatura-porta') {
    return { id: 'anfora', da: INIZIO, a: INIZIO + NUOVI - 1, n: NUOVI, sorgente: 'clip-8.mp4' };
  }
  if (s.da > ponte.a) return { ...s, da: s.da + DELTA, a: s.a + DELTA };
  return s;
});
seg.segmenti.forEach((s, i, a) => {
  s.giunzione_in = i === 0 ? null : { at: +((a[i - 1].a) / N_NUOVO).toFixed(4), modo: '—', verso: a[i - 1].id + '→' + s.id };
  s.giunzione_out = i === a.length - 1 ? null : { at: +(s.a / N_NUOVO).toFixed(4), modo: '—', verso: s.id + '→' + a[i + 1].id };
});
seg.verifica = 'film v5: rimesso il gesto del cantiniere (anfora da terra alla spalla, poi la porta verde)';
writeFileSync(segF, JSON.stringify(seg, null, 1) + '\n');
writeFileSync(join(ROOT, 'public/dati/frames.json'),
  JSON.stringify([{ scena: 1, clip: 'film', n: N_NUOVO, w: 1280, h: 720, fps: 24 }], null, 1) + '\n');

/* ── 4) ponti: via quello di pigiatura-porta (ora c'e' l'azione vera), gli altri slittano ── */
const ponF = join(ROOT, 'public/dati/ponti.json');
const pon = JSON.parse(readFileSync(ponF, 'utf8'));
pon.ponti = pon.ponti
  .filter((p) => p.id !== 'pigiatura-porta')
  .map((p) => (p.da > ponte.a
    ? { ...p, da: p.da + DELTA, a: p.a + DELTA, frameA: p.frameA + DELTA, frameB: p.frameB + DELTA }
    : p));
writeFileSync(ponF, JSON.stringify(pon, null, 1) + '\n');

/* ── 5) inquadrature: slittano quelle dopo ── */
const inqF = join(ROOT, 'public/dati/inquadrature.json');
const inq = JSON.parse(readFileSync(inqF, 'utf8'));
inq.inquadrature = inq.inquadrature.map((x) => (x.da > ponte.a ? { ...x, da: x.da + DELTA, a: x.a + DELTA } : x));
writeFileSync(inqF, JSON.stringify(inq, null, 1) + '\n');

/* ── 6) copione: le battute dopo il punto d'inserimento slittano ── */
const copF = join(ROOT, 'public/dati/copione.json');
const cop = JSON.parse(readFileSync(copF, 'utf8'));
const nuovoCop = cop.map((b) => {
  const f = Math.round(b.at * (N_VECCHIO - 1)) + 1;
  const nf = f > ponte.a ? f + DELTA : f;
  return { ...b, at: +((nf - 1) / (N_NUOVO - 1)).toFixed(4) };
});
writeFileSync(copF, JSON.stringify(nuovoCop, null, 1) + '\n');

/* ── 7) luma: ricalcolata sul film nuovo ── */
const raw = join(ROOT, 'lab/luma-tmp.raw');
execFileSync('ffmpeg', ['-y', '-v', 'error', '-start_number', '1', '-i', join(D, '%04d.webp'),
  '-vf', 'scale=1:1', '-f', 'rawvideo', '-pix_fmt', 'gray', raw]);
const buf = readFileSync(raw);
writeFileSync(join(ROOT, 'public/dati/luma.json'),
  JSON.stringify({ n: buf.length, chiaro: [...buf].map((v) => (v > 128 ? 1 : 0)) }) + '\n');
rmSync(raw);

console.log('\nnuova struttura:');
seg.segmenti.forEach((s) => console.log('  ' + String(s.da).padStart(4) + '-' + String(s.a).padStart(4) + '  ' + s.id));
console.log(`\nponti rimasti: ${pon.ponti.length} · luma su ${buf.length} fotogrammi`);
