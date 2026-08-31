/**
 * taglia-ripetizioni.mjs — Toglie dal film i segmenti ripetitivi e rimappa
 * TUTTO cio che dipende dalla numerazione dei fotogrammi.
 *
 * Tagli decisi in revisione:
 *  1. raccolta + ponte in uscita — la raccolta avveniva due volte: a fine
 *     'vigna' lei ha gia staccato il grappolo.
 *  2. trasporto + ponte in uscita — il cesto veniva portato due volte:
 *     'vasca' lo porta E arriva alla pigiatura.
 *  3. arrivo del cantiniere (parte di 'anfora') — a fine 'pigiatura' e gia
 *     entrato in quadro, a inizio 'porta' ha gia l anfora in spalla: il suo
 *     arrivo era tempo morto. Gli ultimi 30 fotogrammi restano come spazio
 *     di scroll per un nuovo raccordo vivo che segue l ANFORA e le MANI.
 *
 * I fotogrammi rimossi vanno in _sorgenti/frames-tagliati/, non cancellati.
 * Uso: node lab/taglia-ripetizioni.mjs
 */
import { readFileSync, writeFileSync, mkdirSync, renameSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const pad = (n) => String(n).padStart(4, '0');
const D = join(ROOT, 'public/frames/film');
const M = join(ROOT, 'public/frames-m/film');
const ARCH = join(ROOT, '_sorgenti/frames-tagliati');

/* intervalli da togliere, numerazione attuale (1-based, inclusivi) */
const TAGLI = [
  { da: 667, a: 888, perche: 'raccolta + ponte: seconda raccolta dell uva' },
  { da: 963, a: 1184, perche: 'trasporto + ponte: secondo trasporto del cesto' },
  { da: 1569, a: 1730, perche: 'arrivo del cantiniere: tempo morto fra pigiatura e porta' },
];

/* il resto di 'anfora' diventa lo spazio del nuovo raccordo */
const NUOVO_PONTE = {
  daSegmento: 'anfora',
  id: 'pigiatura-porta',
  A: { px: 0.712, py: 0.652, z: 1.9 },   /* l anfora e le mani, alla vasca */
  B: { px: 0.766, py: 0.413, z: 1.7 },   /* la stessa anfora, in spalla alla porta */
  apice: 0.5,
  fusione: 0.26,
  dir: [0.018, -0.022],                   /* il gesto: l anfora sale e va a destra */
  preA: 55,
  postB: 55,
  nota: 'lo zoom segue l anfora e il movimento delle mani: si stringe su di lei alla vasca e si riapre quando e gia in spalla',
};

const seg = JSON.parse(readFileSync(join(ROOT, 'public/dati/segmenti.json'), 'utf8'));
const N_VECCHIO = seg.film.n;
const rimossi = TAGLI.reduce((s, t) => s + (t.a - t.da + 1), 0);
const N_NUOVO = N_VECCHIO - rimossi;

/* mappa vecchio -> nuovo (0 = rimosso) */
const mappa = new Int32Array(N_VECCHIO + 1);
let k = 0;
for (let i = 1; i <= N_VECCHIO; i++) {
  if (TAGLI.some((t) => i >= t.da && i <= t.a)) { mappa[i] = 0; continue; }
  mappa[i] = ++k;
}
if (k !== N_NUOVO) throw new Error('mappa incoerente: ' + k + ' vs ' + N_NUOVO);

/* ── 1) fotogrammi: archivia i tagliati, poi rinumera in ordine crescente ── */
mkdirSync(join(ARCH, 'd'), { recursive: true });
mkdirSync(join(ARCH, 'm'), { recursive: true });
for (const t of TAGLI) {
  for (let i = t.da; i <= t.a; i++) {
    for (const [dir, sub] of [[D, 'd'], [M, 'm']]) {
      const src = join(dir, pad(i) + '.webp');
      if (existsSync(src)) renameSync(src, join(ARCH, sub, pad(i) + '.webp'));
    }
  }
}
for (let i = 1; i <= N_VECCHIO; i++) {
  const n = mappa[i];
  if (!n || n === i) continue;
  for (const dir of [D, M]) {
    const src = join(dir, pad(i) + '.webp');
    if (existsSync(src)) renameSync(src, join(dir, pad(n) + '.webp'));
  }
}
const suD = readdirSync(D).length, suM = readdirSync(M).length;
if (suD !== N_NUOVO || suM !== N_NUOVO) throw new Error('fotogrammi su disco: d=' + suD + ' m=' + suM + ', attesi ' + N_NUOVO);

/* ── 2) segmenti: togli i tagliati, rinumera, ribattezza i ponti superstiti ── */
const vivi = seg.segmenti.filter((s) => {
  for (let i = s.da; i <= s.a; i++) if (mappa[i]) return true;
  return false;
});
const nuoviSeg = vivi.map((s) => {
  let da = s.da, a = s.a;
  while (da <= N_VECCHIO && mappa[da] === 0) da++;
  while (a >= 1 && mappa[a] === 0) a--;
  const out = { id: s.id, da: mappa[da], a: mappa[a], n: mappa[a] - mappa[da] + 1, sorgente: s.sorgente };
  if (s.id === NUOVO_PONTE.daSegmento) out.id = 'ponte-' + NUOVO_PONTE.id;
  return out;
});
/* i ponti superstiti ora collegano altro: rinominali dai vicini */
for (let i = 0; i < nuoviSeg.length; i++) {
  const s = nuoviSeg[i];
  if (!s.id.startsWith('ponte-')) continue;
  const prima = nuoviSeg[i - 1], dopo = nuoviSeg[i + 1];
  if (prima && dopo) s.id = 'ponte-' + prima.id + '-' + dopo.id;
}
nuoviSeg.forEach((s, i) => {
  s.giunzione_in = i === 0 ? null : { at: +((nuoviSeg[i - 1].a) / N_NUOVO).toFixed(4), modo: '—', verso: nuoviSeg[i - 1].id + '→' + s.id };
  s.giunzione_out = i === nuoviSeg.length - 1 ? null : { at: +(s.a / N_NUOVO).toFixed(4), modo: '—', verso: s.id + '→' + nuoviSeg[i + 1].id };
});
seg.film.n = N_NUOVO;
seg.segmenti = nuoviSeg;
seg.verifica = 'film v4: tolte le ripetizioni (raccolta, trasporto, arrivo del cantiniere); giunzioni via raccordi vivi';
writeFileSync(join(ROOT, 'public/dati/segmenti.json'), JSON.stringify(seg, null, 1) + '\n');
writeFileSync(join(ROOT, 'public/dati/frames.json'), JSON.stringify([{ scena: 1, clip: 'film', n: N_NUOVO, w: 1280, h: 720, fps: 24 }], null, 1) + '\n');

/* ── 3) ponti: superstiti rinumerati + il nuovo sull anfora ── */
const pon = JSON.parse(readFileSync(join(ROOT, 'public/dati/ponti.json'), 'utf8'));
const nuoviPonti = [];
for (const s of nuoviSeg) {
  if (!s.id.startsWith('ponte-')) continue;
  const base = { id: s.id.replace('ponte-', ''), da: s.da, a: s.a, frameA: s.da - 2, frameB: s.a };
  const orig = pon.ponti.find((p) => mappa[p.da] === s.da);
  if (orig) {
    nuoviPonti.push({ ...orig, ...base });
  } else {
    /* e il ponte nuovo, ricavato dal resto di 'anfora' */
    nuoviPonti.push({ ...base, A: NUOVO_PONTE.A, B: NUOVO_PONTE.B, apice: NUOVO_PONTE.apice,
      fusione: NUOVO_PONTE.fusione, dir: NUOVO_PONTE.dir, preA: NUOVO_PONTE.preA, postB: NUOVO_PONTE.postB, nota: NUOVO_PONTE.nota });
  }
}
pon.ponti = nuoviPonti;
writeFileSync(join(ROOT, 'public/dati/ponti.json'), JSON.stringify(pon, null, 1) + '\n');

/* ── 4) inquadrature: togli quelle nei tagli, rinumera ── */
const inqF = join(ROOT, 'public/dati/inquadrature.json');
const inq = JSON.parse(readFileSync(inqF, 'utf8'));
const primaInq = inq.inquadrature.length;
inq.inquadrature = inq.inquadrature
  .filter((x) => mappa[x.da] !== 0 && mappa[x.a] !== 0)
  .map((x) => ({ ...x, da: mappa[x.da], a: mappa[x.a] }));
writeFileSync(inqF, JSON.stringify(inq, null, 1) + '\n');

/* ── 5) copione: rimappa gli at; le battute dentro un taglio scendono
       alla giunzione, poi si distanziano per non accavallarsi ── */
const copF = join(ROOT, 'public/dati/copione.json');
const cop = JSON.parse(readFileSync(copF, 'utf8'));
const GAP = 34;
const battute = cop.map((b) => {
  const vecchio = Math.min(N_VECCHIO, Math.max(1, Math.round(b.at * (N_VECCHIO - 1)) + 1));
  let nuovo = mappa[vecchio];
  let spostata = false;
  if (!nuovo) {
    const t = TAGLI.find((t) => vecchio >= t.da && vecchio <= t.a);
    let j = t.da - 1;
    while (j >= 1 && !mappa[j]) j--;
    nuovo = mappa[j];
    spostata = true;
  }
  return { b, f: nuovo, spostata };
});
battute.sort((x, y) => x.f - y.f);
for (let i = 1; i < battute.length; i++) {
  if (battute[i].f - battute[i - 1].f < GAP) battute[i].f = Math.min(N_NUOVO, battute[i - 1].f + GAP);
}
const nuovoCop = battute.map(({ b, f }) => ({ ...b, at: +((f - 1) / (N_NUOVO - 1)).toFixed(4) }));
writeFileSync(copF, JSON.stringify(nuovoCop, null, 1) + '\n');

/* ── 6) luma: splice ── */
const lumF = join(ROOT, 'public/dati/luma.json');
const lum = JSON.parse(readFileSync(lumF, 'utf8'));
const chiaro = [];
for (let i = 1; i <= N_VECCHIO; i++) if (mappa[i]) chiaro.push(lum.chiaro[i - 1]);
writeFileSync(lumF, JSON.stringify({ n: chiaro.length, chiaro }) + '\n');

console.log('fotogrammi: ' + N_VECCHIO + ' -> ' + N_NUOVO + ' (tolti ' + rimossi + ')');
console.log('segmenti: ' + nuoviSeg.length + ' · ponti: ' + nuoviPonti.length + ' · inquadrature: ' + primaInq + ' -> ' + inq.inquadrature.length);
console.log('nuova struttura:');
nuoviSeg.forEach((s) => console.log('  ' + String(s.da).padStart(4) + '-' + String(s.a).padStart(4) + '  ' + s.id));
const sp = battute.filter((x) => x.spostata).map((x) => (x.b.testo || '').slice(0, 42));
console.log('battute ricollocate: ' + (sp.length ? sp.join(' | ') : 'nessuna'));
