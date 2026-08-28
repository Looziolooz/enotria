/**
 * build-chain.mjs — Ricostruisce la catena seguendo il montaggio del committente.
 *
 * 1. Legge _rinomina-mappa.csv e i file presenti in tutti-frames/
 * 2. Raggruppa in segmenti continui (stessa clip)
 * 3. Estrae i frame dagli MP4 a 24 fps, 1280px (desktop) + 720px (mobile)
 * 4. Inserisce le 8 transizioni (t1-t8) ai punti giusti
 * 5. Equalizza colori (luminanza/saturazione ±6% mediana)
 * 6. Campiona il colore di t8 per lo sfondo pagina
 * 7. Scrive public/dati/frames.json
 */

import { execFileSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, '_sorgenti', 'video');
const TUTTI = path.join(SRC, 'tutti-frames');
const OUT_DESKTOP = path.join(ROOT, 'public', 'frames');
const OUT_MOBILE = path.join(ROOT, 'public', 'frames-m');
const OUT_DATI = path.join(ROOT, 'public', 'dati');
const TRANS_IMG = path.join(ROOT, 'lab', 'hf-transizioni');

/* ── Mappa cartella → file MP4 sorgente ── */
const FOLDER_TO_MP4 = {
  '1': '1.mp4',
  '2': '2.mp4',
  '3': '3.mp4',
  '3-4': 'transizione da 3 a 4.mp4',
  '4': '4.mp4',
  '5': '5.mp4',
  '6': '6.mp4',
  '6-7': 'transizione 6-7.mp4',
  '7': '7.mp4',
  '7-9': 'transizione 7-9.mp4',
  '9': '9.mp4',
  '10': '10.mp4',
  '10-11': 'transizione 10-11.mp4',
  '11': '11.mp4',
  '12': '12.mp4',
  '12-13': 'transizione 12-13.mp4',
  '13': '13.mp4',
  '15': '15.mp4',
  '16': 'transizione 16.mp4',
};

/* ── Clip invertite (dal chain originale) ── */
const INVERTI = { '2': true };

/* ── Transizioni da inserire ── */
const TRANSIZIONI = [
  { imgs: ['t1', 't2'], dopoFrame: 39 },
  { imgs: ['t3', 't4', 't5'], dopoFrame: 212 },
  { imgs: ['t6', 't7'], dopoFrame: 291 },
  { imgs: ['t8'], dopoFrame: 381 },
];

/* ══════════════════════════════════════════════════════════════════════
   FASE 1 — Parsing mappa + raggruppamento segmenti
   ══════════════════════════════════════════════════════════════════════ */

function parseMappa() {
  const csv = fs.readFileSync(path.join(SRC, '_rinomina-mappa.csv'), 'utf8');
  const lines = csv.trim().split('\n').slice(1); // salta header
  return lines.map(line => {
    const [progressivo, cartella, , nomeNuovo] = line.split(',');
    return {
      num: parseInt(progressivo, 10),
      cartella: cartella.trim(),
      file: nomeNuovo.trim(),
    };
  });
}

function getPresentFiles() {
  return new Set(fs.readdirSync(TUTTI).filter(f => f.endsWith('.png')));
}

function groupIntoSegments(mappa, present) {
  const filtrato = mappa.filter(m => present.has(m.file));
  const segments = [];
  let cur = null;

  for (const entry of filtrato) {
    if (!cur || cur.cartella !== entry.cartella) {
      if (cur) segments.push(cur);
      cur = {
        cartella: entry.cartella,
        firstNum: entry.num,
        lastNum: entry.num,
        files: [entry],
      };
    } else {
      cur.lastNum = entry.num;
      cur.files.push(entry);
    }
  }
  if (cur) segments.push(cur);
  return segments;
}

/* ══════════════════════════════════════════════════════════════════════
   FASE 2 — Calcolo intervallo di estrazione per ogni segmento
   ══════════════════════════════════════════════════════════════════════ */

function getMP4Duration(mp4Path) {
  const out = execFileSync('ffprobe', [
    '-v', 'error', '-show_entries', 'format=duration',
    '-of', 'csv=p=0', mp4Path,
  ], { encoding: 'utf8' }).trim();
  return parseFloat(out);
}

function getMP4FrameCount(mp4Path) {
  const out = execFileSync('ffprobe', [
    '-v', 'error', '-select_streams', 'v:0',
    '-show_entries', 'stream=nb_frames',
    '-of', 'csv=p=0', mp4Path,
  ], { encoding: 'utf8' }).trim();
  return parseInt(out, 10);
}

function countFramesInFolder(folder) {
  const dir = path.join(SRC, folder);
  if (!fs.existsSync(dir)) return 0;
  return fs.readdirSync(dir).filter(f => f.endsWith('.png')).length;
}

function computeSegmentRanges(segments) {
  /* Conta i frame ezgif totali per ogni cartella (per calcolare posizione relativa) */
  const folderCounts = {};
  for (const seg of segments) {
    if (!folderCounts[seg.cartella]) {
      folderCounts[seg.cartella] = countFramesInFolder(seg.cartella);
    }
  }

  const result = [];
  for (const seg of segments) {
    const mp4Name = FOLDER_TO_MP4[seg.cartella];
    if (!mp4Name) {
      console.error(`Nessun MP4 per la cartella "${seg.cartella}"`);
      continue;
    }
    const mp4Path = path.join(SRC, mp4Name);
    if (!fs.existsSync(mp4Path)) {
      console.error(`MP4 non trovato: ${mp4Path}`);
      continue;
    }

    const totalEzgif = folderCounts[seg.cartella];
    const dur = getMP4Duration(mp4Path);
    const totalMP4Frames = getMP4FrameCount(mp4Path);

    /* Posizione relativa del primo e ultimo frame ezgif nella cartella */
    const localIndices = seg.files.map(f => {
      const match = f.file.match(/ezgif-frame-(\d+)\.png/);
      return match ? parseInt(match[1], 10) - 1 : 0; // 0-based
    });

    /* Dentro la cartella, l'indice locale è l'ordine rispetto al totale.
       Il numero ezglobale ci dice la posizione, ma dobbiamo risalire alla
       posizione locale nella cartella (quale frame ezgif è, dal primo
       dell'ultima clip della stessa cartella). */
    const firstGlobal = seg.firstNum;
    const lastGlobal = seg.lastNum;

    /* Trova il primo ezgif frame di questa cartella nella mappa */
    const mappaCompleta = parseMappa();
    const cartellaFrames = mappaCompleta.filter(m => m.cartella === seg.cartella);
    const firstInFolder = cartellaFrames[0].num;
    const localFirst = firstGlobal - firstInFolder; // indice locale 0-based
    const localLast = lastGlobal - firstInFolder;

    const da = localFirst / Math.max(1, totalEzgif - 1);
    const a = localLast / Math.max(1, totalEzgif - 1);

    /* Frame MP4 corrispondenti */
    const startFrame = Math.round(da * (totalMP4Frames - 1));
    const endFrame = Math.round(a * (totalMP4Frames - 1));
    const n = endFrame - startFrame + 1;

    result.push({
      ...seg,
      mp4Path,
      mp4Name,
      da,
      a,
      startFrame,
      endFrame,
      n,
      totalMP4Frames,
      duration: dur,
      inverti: !!INVERTI[seg.cartella],
    });
  }
  return result;
}

/* ══════════════════════════════════════════════════════════════════════
   FASE 3 — Estrazione frame da MP4
   ══════════════════════════════════════════════════════════════════════ */

function extractSegment(segIdx, seg, width, outDir) {
  const folderName = String(segIdx + 1).padStart(2, '0');
  const outPath = path.join(outDir, folderName);
  fs.mkdirSync(outPath, { recursive: true });

  const startTime = seg.startFrame / 24; // fps = 24
  const endTime = (seg.endFrame + 1) / 24;

  const vf = `scale=${width}:-2,fps=24`;
  const args = [
    '-v', 'error',
    '-ss', String(startTime),
    '-to', String(endTime),
    '-i', seg.mp4Path,
    '-vf', vf,
    '-c:v', 'libwebp',
    '-q:v', '80',
    path.join(outPath, '%04d.webp'),
  ];

  try {
    execFileSync('ffmpeg', args, { stdio: 'pipe' });
  } catch (e) {
    console.error(`Errore estrazione segmento ${folderName}:`, e.message.slice(0, 200));
  }

  return outPath;
}

/* ══════════════════════════════════════════════════════════════════════
   FASE 4 — Conversione transizioni in WebP
   ══════════════════════════════════════════════════════════════════════ */

function convertTransition(imgName, width, outDir) {
  const folderName = imgName;
  const outPath = path.join(outDir, folderName);
  fs.mkdirSync(outPath, { recursive: true });

  const srcPng = path.join(TRANS_IMG, imgName + '.png');
  if (!fs.existsSync(srcPng)) {
    console.error(`Transizione non trovata: ${srcPng}`);
    return null;
  }

  /* Ogni transizione diventa 16 frame (fermo immagine ripetuto) */
  const N_FRAMES = 16;
  const args = [
    '-v', 'error',
    '-i', srcPng,
    '-vf', `scale=${width}:-2`,
    '-c:v', 'libwebp',
    '-q:v', '80',
    '-frames:v', '1',
    path.join(outPath, '0001.webp'),
  ];

  try {
    execFileSync('ffmpeg', args, { stdio: 'pipe' });
    /* Copia lo stesso frame N volte per la durata dello scroll */
    const single = path.join(outPath, '0001.webp');
    for (let i = 2; i <= N_FRAMES; i++) {
      fs.copyFileSync(single, path.join(outPath, String(i).padStart(4, '0') + '.webp'));
    }
  } catch (e) {
    console.error(`Errore conversione transizione ${imgName}:`, e.message.slice(0, 200));
  }

  return outPath;
}

/* ══════════════════════════════════════════════════════════════════════
   FASE 5 — Equalizzazione colori
   ══════════════════════════════════════════════════════════════════════ */

function measureSegmentColor(segPath) {
  /* Prende il frame centrale del segmento e misura luminanza + saturazione
     usando crop al centro + output raw RGB24 per calcolo manuale. */
  const frames = fs.readdirSync(segPath).filter(f => f.endsWith('.webp')).sort();
  if (frames.length === 0) return { lum: 0, sat: 0 };

  const midFrame = path.join(segPath, frames[Math.floor(frames.length / 2)]);

  try {
    /* Crop 100x100 pixel centrali, scala a 1x1 per media, output raw RGB */
    const raw = execFileSync('ffmpeg', [
      '-v', 'error',
      '-i', midFrame,
      '-vf', 'crop=100:100:(iw-100)/2:(ih-100)/2,scale=1:1',
      '-f', 'rawvideo',
      '-pix_fmt', 'rgb24',
      'pipe:1',
    ], { maxBuffer: 1 << 20, timeout: 10000 });

    if (raw.length >= 3) {
      const r = raw[0];
      const g = raw[1];
      const b = raw[2];

      /* BT.709 luminanza */
      const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;

      /* Saturazione semplice: differenza max-min / media */
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const avg = (r + g + b) / 3;
      const sat = avg > 0 ? ((max - min) / avg) * 128 : 0;

      return { lum, sat };
    }
  } catch (e) {
    /* fallback */
  }
  return { lum: 128, sat: 64 };
}
  }
}

function measureAllSegments(segmentDirs) {
  const results = [];
  for (const dir of segmentDirs) {
    const colors = measureSegmentColor(dir);
    results.push({ dir, ...colors });
  }
  return results;
}

function median(arr) {
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function equalizeSegments(segmentDirs, measurements) {
  const lums = measurements.map(m => m.lum).filter(l => l > 0);
  const sats = measurements.map(m => m.sat).filter(s => s > 0);

  if (lums.length === 0 || sats.length === 0) {
    console.log('  Nessun dato per equalizzazione');
    return [];
  }

  const medLum = median(lums);
  const medSat = median(sats);

  const corrections = measurements.map((m, i) => {
    /* Luminanza: eq brightness è lineare -1..1, applica correzione proporzionale */
    const lumRatio = m.lum > 0 ? m.lum / medLum : 1;
    const brightness = Math.max(-0.06, Math.min(0.06, (1 - lumRatio) * 0.3));

    /* Saturazione: moltiplicatore 0.94..1.06 */
    const satRatio = m.sat > 0 ? m.sat / medSat : 1;
    const saturation = Math.max(0.94, Math.min(1.06, 1 / satRatio));

    return { dir: segmentDirs[i], brightness, saturation, lumBefore: m.lum, satBefore: m.sat };
  });

  /* Applica correzioni */
  for (const corr of corrections) {
    if (Math.abs(corr.brightness) < 0.002 && Math.abs(corr.saturation - 1) < 0.002) continue;

    const frames = fs.readdirSync(corr.dir).filter(f => f.endsWith('.webp')).sort();
    for (const frame of frames) {
      const fp = path.join(corr.dir, frame);
      const tmp = fp + '.tmp.webp';
      try {
        execFileSync('ffmpeg', [
          '-v', 'error',
          '-i', fp,
          '-vf', `eq=brightness=${corr.brightness.toFixed(4)}:saturation=${corr.saturation.toFixed(4)}`,
          '-c:v', 'libwebp',
          '-q:v', '80',
          tmp,
        ], { stdio: 'pipe' });
        fs.renameSync(tmp, fp);
      } catch (e) {
        /* ignora errori singoli */
      }
    }
  }

  return corrections;
}

/* ══════════════════════════════════════════════════════════════════════
   FASE 6 — Campionamento colore t8
   ══════════════════════════════════════════════════════════════════════ */

function sampleT8Color() {
  const t8Dir = path.join(OUT_DESKTOP, 't8');
  const frame = path.join(t8Dir, '0001.webp');
  if (!fs.existsSync(frame)) return '#0B0A09';

  try {
    /* Estrai pixel centrali e calcola media RGB */
    const out = execFileSync('ffmpeg', [
      '-v', 'error',
      '-i', frame,
      '-vf', 'crop=iw/3:ih/3:iw/3:ih/3,scale=1:1',
      '-f', 'rawvideo',
      '-pix_fmt', 'rgb24',
      'pipe:1',
    ], { maxBuffer: 1 << 20 });

    if (out.length >= 3) {
      const r = out[0];
      const g = out[1];
      const b = out[2];
      return '#' + [r, g, b].map(c => c.toString(16).padStart(2, '0')).join('');
    }
  } catch (e) {
    /* fallback */
  }
  return '#0B0A09';
}

/* ══════════════════════════════════════════════════════════════════════
   MAIN
   ══════════════════════════════════════════════════════════════════════ */

console.log('=== BUILD CHAIN — Montaggio committente ===\n');

/* 1. Parsing */
const mappa = parseMappa();
const present = getPresentFiles();
console.log(`Mappa: ${mappa.length} entry · presenti: ${present.size}`);

/* 2. Raggruppamento */
const rawSegments = groupIntoSegments(mappa, present);
console.log(`Segmenti grezzi: ${rawSegments.length}`);

/* 3. Intervalli di estrazione */
const segments = computeSegmentRanges(rawSegments);
console.log(`Segmenti con intervallo: ${segments.length}`);

/* Stampa riepilogo segmenti */
let totalFrames = 0;
for (let i = 0; i < segments.length; i++) {
  const s = segments[i];
  totalFrames += s.n;
  console.log(`  s${String(i + 1).padStart(2, '0')}: cartella ${s.cartella.padEnd(5)} · MP4 ${s.mp4Name.slice(0, 20).padEnd(20)} · frame ${s.startFrame}-${s.endFrame} (${s.n} frame)${s.inverti ? ' INVERTITO' : ''}`);
}
console.log(`Totale frame contenuto: ${totalFrames}\n`);

/* 4. Estrazione desktop (1280px) */
console.log('--- Estrazione desktop (1280px) ---');
const desktopDirs = [];
for (let i = 0; i < segments.length; i++) {
  const dir = extractSegment(i, segments[i], 1280, OUT_DESKTOP);
  desktopDirs.push(dir);
  process.stdout.write(`  s${String(i + 1).padStart(2, '0')} `);
}
console.log('\n');

/* 5. Estrazione mobile (720px) */
console.log('--- Estrazione mobile (720px) ---');
const mobileDirs = [];
for (let i = 0; i < segments.length; i++) {
  const dir = extractSegment(i, segments[i], 720, OUT_MOBILE);
  mobileDirs.push(dir);
  process.stdout.write(`  s${String(i + 1).padStart(2, '0')} `);
}
console.log('\n');

/* 6. Conversione transizioni */
console.log('--- Transizioni ---');
const transNames = ['t1', 't2', 't3', 't4', 't5', 't6', 't7', 't8'];
const N_TRANS_FRAMES = 16;

/* Conversione desktop */
for (const name of transNames) {
  convertTransition(name, 1280, OUT_DESKTOP);
  console.log(`  ${name} → desktop`);
}

/* Conversione mobile */
for (const name of transNames) {
  convertTransition(name, 720, OUT_MOBILE);
  console.log(`  ${name} → mobile`);
}
console.log('');

/* 7. Inserimento transizioni nella sequenza */
console.log('--- Inserimento transizioni ---');

/* Costruisci la sequenza finale: segmenti + transizioni */
const sequenza = [];
let frameNum = 0;

for (let i = 0; i < segments.length; i++) {
  const seg = segments[i];

  /* Controlla se c'è una transizione dopo questo segmento */
  const transDopo = TRANSIZIONI.find(t => t.dopoFrame === seg.lastNum);

  /* Aggiungi segmento contenuto */
  const folderDesktop = String(i + 1).padStart(2, '0');
  const nFrames = fs.readdirSync(path.join(OUT_DESKTOP, folderDesktop)).filter(f => f.endsWith('.webp')).length;
  sequenza.push({
    tipo: 'contenuto',
    clip: folderDesktop,
    cartella: seg.cartella,
    n: nFrames,
    inverti: seg.inverti || undefined,
    mp4Name: seg.mp4Name,
  });

  /* Aggiungi transizioni se presenti */
  if (transDopo) {
    for (const tName of transDopo.imgs) {
      const tFrames = fs.readdirSync(path.join(OUT_DESKTOP, tName)).filter(f => f.endsWith('.webp')).length;
      sequenza.push({
        tipo: 'transizione',
        clip: tName,
        n: tFrames,
      });
      console.log(`  ${tName} dopo frame ${transDopo.dopoFrame} (${tFrames} frame)`);
    }
  }
}

console.log(`Sequenza totale: ${sequenza.length} elementi\n`);

/* 8. Equalizzazione colori */
console.log('--- Equalizzazione colori ---');

/* Misura colori di tutti i segmenti di contenuto */
const contentDirs = sequenza
  .filter(s => s.tipo === 'contenuto')
  .map(s => path.join(OUT_DESKTOP, s.clip));

const measurements = measureAllSegments(contentDirs);

/* Stampa tabella prima */
console.log('  PRIMA:');
for (const m of measurements) {
  const name = path.basename(m.dir);
  console.log(`    ${name}: lum=${m.lum.toFixed(1)} sat=${m.sat.toFixed(1)}`);
}

/* Equalizza */
const corrections = equalizeSegments(contentDirs, measurements);

/* Misura di nuovo dopo equalizzazione */
const afterMeasurements = measureAllSegments(contentDirs);
console.log('  DOPO:');
for (const m of afterMeasurements) {
  const name = path.basename(m.dir);
  console.log(`    ${name}: lum=${m.lum.toFixed(1)} sat=${m.sat.toFixed(1)}`);
}

/* Verifica scarto massimo */
const afterLums = afterMeasurements.map(m => m.lum);
const afterSats = afterMeasurements.map(m => m.sat);
const medL = median(afterLums);
const medS = median(afterSats);
const maxLumDev = Math.max(...afterLums.map(l => Math.abs(l - medL) / medL * 100));
const maxSatDev = Math.max(...afterSats.map(s => Math.abs(s - medS) / medS * 100));
console.log(`\n  Scarto max dalla mediana: luminanza ${maxLumDev.toFixed(1)}% · saturazione ${maxSatDev.toFixed(1)}%`);
console.log(`  Soglia: ±6% → ${maxLumDev <= 6 && maxSatDev <= 6 ? 'OK ✓' : 'FUORI RANGE ✗'}\n`);

/* 9. Campionamento colore t8 */
const t8Color = sampleT8Color();
console.log(`--- Colore t8 campionato: ${t8Color} ---\n`);

/* 10. Scrittura frames.json */
console.log('--- Scrittura frames.json ---');

const framesJSON = [];
for (let i = 0; i < sequenza.length; i++) {
  const s = sequenza[i];
  const entry = {
    scena: i + 1,
    clip: s.clip,
    n: s.n,
    w: 1280,
    h: 720,
    fps: 24,
  };
  if (s.inverti) entry.inverti = true;
  framesJSON.push(entry);
}

fs.writeFileSync(
  path.join(OUT_DATI, 'frames.json'),
  JSON.stringify(framesJSON, null, 2) + '\n'
);

console.log(`Scritti ${framesJSON.length} segmenti in frames.json\n`);

/* ── Riepilogo finale ── */
console.log('=== RIEPILOGO ===');
console.log(`Segmenti contenuto: ${sequenza.filter(s => s.tipo === 'contenuto').length}`);
console.log(`Transizioni: ${sequenza.filter(s => s.tipo === 'transizione').length}`);
console.log(`Frame totali: ${totalFrames + transNames.length * N_TRANS_FRAMES}`);

/* Peso cartelle */
function dirSize(dir) {
  let total = 0;
  for (const f of fs.readdirSync(dir)) {
    const fp = path.join(dir, f);
    if (fs.statSync(fp).isFile()) total += fs.statSync(fp).size;
  }
  return total;
}

let desktopSize = 0;
for (const s of sequenza) {
  const dir = path.join(OUT_DESKTOP, s.clip);
  if (fs.existsSync(dir)) desktopSize += dirSize(dir);
}
let mobileSize = 0;
for (const s of sequenza) {
  const dir = path.join(OUT_MOBILE, s.clip);
  if (fs.existsSync(dir)) mobileSize += dirSize(dir);
}

console.log(`Peso desktop (public/frames): ${(desktopSize / 1e6).toFixed(1)} MB`);
console.log(`Peso mobile (public/frames-m): ${(mobileSize / 1e6).toFixed(1)} MB`);
console.log(`Colore sfondo t8: ${t8Color}`);
console.log(`\nFatto.`);
