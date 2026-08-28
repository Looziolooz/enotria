/**
 * assembla-film-v3.mjs — Film v3 = film v2 + ponti match-cut al posto delle
 * transizioni shader. Inserisce i 30 frame di ogni ponte dopo il segmento
 * d'origine, rinumera entrambi i tier, riscrive frames/segmenti/tagli/luma.
 * Uso: node lab/assembla-film-v3.mjs
 */
import { execFileSync } from 'node:child_process';
import { copyFileSync, readdirSync, readFileSync, writeFileSync, mkdirSync, rmSync, renameSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const pad = (n) => String(n).padStart(4, '0');

const man = JSON.parse(readFileSync(join(ROOT, 'lab/film-v2-manifest.json'), 'utf8'));
const PONTI_DOPO = {  // id segmento → id ponte da inserire dopo
  nave: 'nave-approdo', approdo: 'approdo-vigna', vigna: 'vigna-raccolta',
  raccolta: 'raccolta-scambio', scambio: 'scambio-trasporto', trasporto: 'trasporto-vasca',
  travaso: 'travaso-rubinetto', rubinetto: 'rubinetto-vino',
};

const D_OLD = join(ROOT, 'public/frames/film');
const M_OLD = join(ROOT, 'public/frames-m/film');
const D_NEW = join(ROOT, 'public/frames/film-v3');
const M_NEW = join(ROOT, 'public/frames-m/film-v3');
rmSync(D_NEW, { recursive: true, force: true });
rmSync(M_NEW, { recursive: true, force: true });
mkdirSync(D_NEW, { recursive: true });
mkdirSync(M_NEW, { recursive: true });

let n = 0;
const segmenti = [];
const metti = (srcD, srcM) => { n++; copyFileSync(srcD, join(D_NEW, pad(n) + '.webp')); copyFileSync(srcM, join(M_NEW, pad(n) + '.webp')); };

for (const s of man) {
  const da = n + 1;
  for (let i = s.da; i <= s.a; i++) metti(join(D_OLD, pad(i) + '.webp'), join(M_OLD, pad(i) + '.webp'));
  segmenti.push({ id: s.id, da, a: n, n: n - da + 1, sorgente: s.sorgente });
  const ponte = PONTI_DOPO[s.id];
  if (ponte) {
    const dir = join(ROOT, 'lab/ponti', ponte);
    const frames = readdirSync(join(dir, 'd')).sort();
    const pda = n + 1;
    for (const f of frames) metti(join(dir, 'd', f), join(dir, 'm', f));
    segmenti.push({ id: 'ponte-' + ponte, da: pda, a: n, n: n - pda + 1, sorgente: 'lab/ponti/' + ponte + ' (match cut)' });
  }
}

// swap
rmSync(D_OLD, { recursive: true, force: true });
rmSync(M_OLD, { recursive: true, force: true });
renameSync(D_NEW, D_OLD);
renameSync(M_NEW, M_OLD);

// dati derivati
writeFileSync(join(ROOT, 'public/dati/frames.json'), JSON.stringify([{ scena: 1, clip: 'film', n, w: 1280, h: 720, fps: 24 }], null, 1) + '\n');
const segOut = segmenti.map((s, i) => ({
  ...s,
  giunzione_in: i === 0 ? null : { at: +((segmenti[i - 1].a) / n).toFixed(4), modo: '—', verso: segmenti[i - 1].id + '→' + s.id },
  giunzione_out: i === segmenti.length - 1 ? null : { at: +(s.a / n).toFixed(4), modo: '—', verso: s.id + '→' + segmenti[i + 1].id },
}));
writeFileSync(join(ROOT, 'public/dati/segmenti.json'), JSON.stringify({
  generato_da: 'lab/assembla-film-v3.mjs — derivato, non modificare a mano',
  film: { n, w: 1280, h: 720, fps: 24, tier: ['frames/film (1280)', 'frames-m/film (720)'] },
  verifica: 'film v3: giunzioni via ponti match-cut (zoom su dettaglio condiviso + sovrapposizione), niente transizioni shader',
  segmenti: segOut,
}, null, 1) + '\n');
writeFileSync(join(ROOT, 'public/dati/tagli.json'), JSON.stringify({ tagli: [] }, null, 1) + '\n');

// luma in un passaggio
execFileSync('ffmpeg', ['-y', '-v', 'error', '-start_number', '1', '-i', join(D_OLD, '%04d.webp'),
  '-vf', 'scale=1:1', '-f', 'rawvideo', '-pix_fmt', 'gray', join(ROOT, 'lab/luma-v3.raw')]);
const buf = readFileSync(join(ROOT, 'lab/luma-v3.raw'));
writeFileSync(join(ROOT, 'public/dati/luma.json'), JSON.stringify({ n: buf.length, chiaro: [...buf].map(v => v > 128 ? 1 : 0) }) + '\n');
rmSync(join(ROOT, 'lab/luma-v3.raw'));

console.log(`Film v3: ${n} fotogrammi (${segmenti.length} segmenti, di cui ${segmenti.filter(s => s.id.startsWith('ponte-')).length} ponti). tagli.json svuotato, luma rigenerata.`);
