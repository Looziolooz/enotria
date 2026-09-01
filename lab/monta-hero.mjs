/**
 * monta-hero.mjs — mette il guerriero in testa al film, prima della nave.
 *
 * Il video sorgente (Warrior_standing_in_strong_wind) non e' un'altra cosa
 * incollata davanti: e' lo STESSO disegno della clip-1. Stesso teal, stessi
 * archi a greca concentrici, stesso sole d'oro mezzo affondato
 * nell'orizzonte. Cambia solo la scala del mondo — e nell'ultimo fotogramma,
 * posata sull'orizzonte a destra, c'e' gia' una piccola nave nera.
 *
 * Quindi il raccordo non e' una transizione: e' un cambio di mondo attorno a
 * un punto che resta fermo. Il sole. Misurato:
 *   guerriero f192 — disco d'oro centro (0.512, 0.825), raggio ~189 px,
 *                    orizzonte a py 0.825
 *   nave      f1   — disco d'oro centro (0.235, 0.775), raggio ~70 px,
 *                    linea di mare a py 0.775
 * Con A quasi fermo (z 1.12) e B che riapre da 2.5 sul suo sole, i due
 * dischi cadono nello stesso punto dello schermo (y ~0.81) e l'orizzonte
 * combacia a meno di mezzo punto percentuale. Il guerriero si dissolve, il
 * mare si apre, il sole non si e' mosso.
 *
 * Il filmato del guerriero arretra da solo per tutti i 192 fotogrammi
 * (misurato: la fascia di greca in alto passa da 973 a 812 px di larghezza).
 * Per questo la camera sul lato A quasi non lavora: dove il filmato si
 * muove, la camera sta ferma.
 *
 * Uso: node lab/monta-hero.mjs
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdtempSync, readdirSync, renameSync, rmSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const D = join(ROOT, 'public/frames/film');
const M = join(ROOT, 'public/frames-m/film');
const CLIP = join(ROOT, '_sorgenti/video/Warrior_standing_in_strong_wind_202609011402.mp4');
const pad = (n) => String(n).padStart(4, '0');

const N_HERO = 192;   /* la clip intera: 8 s a 24 fps */
const N_PONTE = 30;   /* zona-ponte, come tutti gli altri raccordi */
const DELTA = N_HERO + N_PONTE;   /* 222 */

if (!existsSync(CLIP)) throw new Error('clip del guerriero non trovata: ' + CLIP);

const segF = join(ROOT, 'public/dati/segmenti.json');
const seg = JSON.parse(readFileSync(segF, 'utf8'));
if (seg.segmenti[0].id !== 'nave') throw new Error('il film non comincia piu\' con la nave: gia\' montato?');

const N_VECCHIO = seg.film.n;
const N_NUOVO = N_VECCHIO + DELTA;
console.log(`guerriero: ${N_HERO} fotogrammi + ${N_PONTE} di zona-ponte`);
console.log(`film ${N_VECCHIO} -> ${N_NUOVO}`);

/* ── 1) tutto il film esistente slitta in avanti di 222, dal fondo ── */
for (let i = N_VECCHIO; i >= 1; i--) {
  for (const dir of [D, M]) {
    const src = join(dir, pad(i) + '.webp');
    if (existsSync(src)) renameSync(src, join(dir, pad(i + DELTA) + '.webp'));
  }
}

/* ── 2) il guerriero diventa 0001-0192, nei due tier ──
   q90/q70 invece di q82/q62: e' l'immagine piu' vista del sito e il
   disegno e' piatto (grandi campiture di teal, sfumature lunghe), dove
   il WebP basso mostra bande. Su arte piatta il sovrapprezzo e' minimo. */
for (const [dir, larg, q] of [[D, 1280, 90], [M, 720, 70]]) {
  const tmp = mkdtempSync(join(tmpdir(), 'oen-hero-'));
  execFileSync('ffmpeg', ['-y', '-v', 'error', '-i', CLIP, '-an',
    '-vf', `scale=${larg}:-2`, '-vsync', '0',
    '-c:v', 'libwebp', '-quality', String(q), join(tmp, '%04d.webp')]);
  const file = readdirSync(tmp).sort();
  if (file.length !== N_HERO) throw new Error(`attesi ${N_HERO} fotogrammi, estratti ${file.length}`);
  file.forEach((f, i) => renameSync(join(tmp, f), join(dir, pad(1 + i) + '.webp')));
  rmSync(tmp, { recursive: true, force: true });
}

/* ── 3) zona-ponte 0193-0222 ──
   Questi fotogrammi non si vedono mai: dentro il ponte lo shader lavora
   sui due fermi-immagine (frameA/frameB) e fuori sul film vivo. Servono
   come spazio di scroll — e come rete di sicurezza se ponti.json non
   arrivasse. Per questo sono una dissolvenza vera, non un riempitivo. */
for (const [dir, q] of [[D, 82], [M, 62]]) {
  const A = join(dir, pad(N_HERO) + '.webp');
  const B = join(dir, pad(DELTA + 1) + '.webp');
  for (let i = 0; i < N_PONTE; i++) {
    const alpha = (i + 1) / (N_PONTE + 1);
    execFileSync('ffmpeg', ['-y', '-v', 'error', '-i', A, '-i', B,
      '-filter_complex',
      `[1:v]format=yuva444p,colorchannelmixer=aa=${alpha.toFixed(4)}[b];[0:v][b]overlay,format=yuv420p`,
      '-c:v', 'libwebp', '-quality', String(q),
      join(dir, pad(N_HERO + 1 + i) + '.webp')]);
  }
}

const suD = readdirSync(D).length, suM = readdirSync(M).length;
if (suD !== N_NUOVO || suM !== N_NUOVO) throw new Error(`su disco d=${suD} m=${suM}, attesi ${N_NUOVO}`);

/* ── 4) segmenti ── */
seg.film.n = N_NUOVO;
const slittati = seg.segmenti.map((s) => ({ ...s, da: s.da + DELTA, a: s.a + DELTA }));
seg.segmenti = [
  { id: 'enotro', da: 1, a: N_HERO, n: N_HERO,
    sorgente: 'Warrior_standing_in_strong_wind_202609011402.mp4' },
  { id: 'ponte-enotro-nave', da: N_HERO + 1, a: DELTA, n: N_PONTE,
    sorgente: 'lab/ponti/enotro-nave (raccordo vivo sul sole)' },
  ...slittati,
];
seg.segmenti.forEach((s, i, a) => {
  s.giunzione_in = i === 0 ? null
    : { at: +((a[i - 1].a) / N_NUOVO).toFixed(4), modo: '—', verso: a[i - 1].id + '→' + s.id };
  s.giunzione_out = i === a.length - 1 ? null
    : { at: +(s.a / N_NUOVO).toFixed(4), modo: '—', verso: s.id + '→' + a[i + 1].id };
});
seg.verifica = 'film v6: il guerriero apre il film, e il sole d oro porta dentro la marina';
writeFileSync(segF, JSON.stringify(seg, null, 1) + '\n');
writeFileSync(join(ROOT, 'public/dati/frames.json'),
  JSON.stringify([{ scena: 1, clip: 'film', n: N_NUOVO, w: 1280, h: 720, fps: 24 }], null, 1) + '\n');

/* ── 5) ponti: slittano tutti, e in testa entra quello del sole ── */
const ponF = join(ROOT, 'public/dati/ponti.json');
const pon = JSON.parse(readFileSync(ponF, 'utf8'));
pon.ponti = [
  {
    id: 'enotro-nave',
    da: N_HERO + 1, a: DELTA,
    frameA: N_HERO, frameB: DELTA + 1,
    A: { px: 0.512, py: 0.825, z: 1.12 },
    B: { px: 0.235, py: 0.651, z: 2.5 },
    apice: 0.5,
    fusione: 0.34,
    dir: [-0.006, 0],
    preA: 40,
    postB: 75,
    nota: 'il sole d oro sull orizzonte: nei due quadri e lo stesso disco, al centro degli stessi archi a greca. La camera sul guerriero quasi non si muove — il filmato sta gia arretrando da solo — e riapre dal sole della marina. Non si vede un taglio: cambia il mondo intorno al sole, che resta dov era.',
  },
  ...pon.ponti.map((p) => ({
    ...p, da: p.da + DELTA, a: p.a + DELTA,
    frameA: p.frameA + DELTA, frameB: p.frameB + DELTA,
  })),
];
writeFileSync(ponF, JSON.stringify(pon, null, 1) + '\n');

/* ── 6) inquadrature ── */
const inqF = join(ROOT, 'public/dati/inquadrature.json');
const inq = JSON.parse(readFileSync(inqF, 'utf8'));
inq.inquadrature = inq.inquadrature.map((x) => ({ ...x, da: x.da + DELTA, a: x.a + DELTA }));
writeFileSync(inqF, JSON.stringify(inq, null, 1) + '\n');

/* ── 7) copione: tutto slitta, tranne il titolo ──
   La battuta 'hero' non segue il film: e' il titolo della pagina, e deve
   restare dov'e' sempre stata — nel primo secondo. Ora quel secondo e' il
   guerriero, e il titolo gli si posa accanto (st-hero sta a sinistra, dove
   il quadro e' vuoto). Tutto il resto del copione e' legato a un'immagine
   precisa e slitta con lei. */
const copF = join(ROOT, 'public/dati/copione.json');
const cop = JSON.parse(readFileSync(copF, 'utf8'));
const nuovoCop = cop.map((b) => {
  if (b.peso === 'hero') return b;
  const f = Math.round(b.at * (N_VECCHIO - 1)) + 1;
  return { ...b, at: +((f + DELTA - 1) / (N_NUOVO - 1)).toFixed(4) };
});
writeFileSync(copF, JSON.stringify(nuovoCop, null, 1) + '\n');

/* ── 8) luma, ricalcolata su tutto il film ── */
const raw = join(ROOT, 'lab/luma-tmp.raw');
execFileSync('ffmpeg', ['-y', '-v', 'error', '-start_number', '1', '-i', join(D, '%04d.webp'),
  '-vf', 'scale=1:1', '-f', 'rawvideo', '-pix_fmt', 'gray', raw]);
const buf = readFileSync(raw);
if (buf.length !== N_NUOVO) throw new Error(`luma su ${buf.length} fotogrammi, attesi ${N_NUOVO}`);
writeFileSync(join(ROOT, 'public/dati/luma.json'),
  JSON.stringify({ n: buf.length, chiaro: [...buf].map((v) => (v > 128 ? 1 : 0)) }) + '\n');
rmSync(raw);

/* ── 9) il primo fotogramma di riserva (mostrato prima che il WebGL parta) ── */
execFileSync('ffmpeg', ['-y', '-v', 'error', '-i', join(D, '0001.webp'),
  '-c:v', 'libwebp', '-quality', '90', join(ROOT, 'public/img/seq/film-first.webp')]);

/* ── 10) l'archivio dei fermi prima dell'ingrandimento segue la numerazione ── */
const ARCH = join(ROOT, '_sorgenti/fermi-prima-dell-ingrandimento');
if (existsSync(ARCH)) {
  readdirSync(ARCH).filter((f) => f.endsWith('.webp'))
    .map((f) => parseInt(f, 10)).sort((a, b) => b - a)
    .forEach((n) => renameSync(join(ARCH, pad(n) + '.webp'), join(ARCH, pad(n + DELTA) + '.webp')));
}

console.log('\nnuova struttura:');
seg.segmenti.forEach((s) => console.log('  ' + String(s.da).padStart(4) + '-' + String(s.a).padStart(4) + '  ' + s.id));
console.log(`\nponti: ${pon.ponti.length} · luma su ${buf.length} fotogrammi`);
