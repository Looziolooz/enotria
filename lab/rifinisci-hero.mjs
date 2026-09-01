/**
 * rifinisci-hero.mjs — riporta i fotogrammi del guerriero allo standard del film.
 *
 * Li avevo estratti a q90 pensando che il disegno piatto avrebbe mostrato
 * bande. Misurato sul fotogramma 100: q82 -> SSIM 0.9890 a 72 KB, q90 ->
 * 0.9939 a 109 KB, e nelle campiture di teal amplificate a contrasto 9 le
 * due versioni sono identiche. +51% di peso per niente che si veda: vale
 * qui la stessa conclusione presa il 31 agosto per il resto del film.
 *
 * Resta alto il solo fotogramma 192: e' il fermo-immagine del raccordo, e
 * quello viene davvero ingrandito. Va a q95 e poi all'ingrandimento AI.
 *
 * Uso: node lab/rifinisci-hero.mjs
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdtempSync, readdirSync, renameSync, rmSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const D = join(ROOT, 'public/frames/film');
const M = join(ROOT, 'public/frames-m/film');
const CLIP = join(ROOT, '_sorgenti/video/Warrior_standing_in_strong_wind_202609011402.mp4');
const pad = (n) => String(n).padStart(4, '0');
const N_HERO = 192, N_PONTE = 30, DELTA = N_HERO + N_PONTE;

const peso = (dir, da, a) => {
  let t = 0;
  for (let i = da; i <= a; i++) t += statSync(join(dir, pad(i) + '.webp')).size;
  return Math.round(t / 1024 / 1024) + ' MB';
};
console.log(`prima: desktop ${peso(D, 1, N_HERO)} · mobile ${peso(M, 1, N_HERO)}`);

/* ── 1) i 192 fotogrammi tornano allo standard del film ── */
for (const [dir, larg, q] of [[D, 1280, 82], [M, 720, 62]]) {
  const tmp = mkdtempSync(join(tmpdir(), 'oen-rif-'));
  execFileSync('ffmpeg', ['-y', '-v', 'error', '-i', CLIP, '-an',
    '-vf', `scale=${larg}:-2`, '-vsync', '0',
    '-c:v', 'libwebp', '-quality', String(q), join(tmp, '%04d.webp')]);
  const file = readdirSync(tmp).sort();
  if (file.length !== N_HERO) throw new Error(`attesi ${N_HERO}, estratti ${file.length}`);
  file.forEach((f, i) => renameSync(join(tmp, f), join(dir, pad(1 + i) + '.webp')));
  rmSync(tmp, { recursive: true, force: true });
}

/* ── 2) il fermo del raccordo resta a q95: li' si ingrandisce davvero ── */
for (const [dir, larg] of [[D, 1280], [M, 720]]) {
  execFileSync('ffmpeg', ['-y', '-v', 'error', '-i', CLIP, '-an',
    '-vf', `select='eq(n\\,${N_HERO - 1})',scale=${larg}:-2`, '-vsync', '0',
    '-c:v', 'libwebp', '-quality', '95', join(dir, pad(N_HERO) + '.webp')]);
}

/* ── 3) la zona-ponte si rifa sui fotogrammi nuovi ── */
for (const [dir, q] of [[D, 82], [M, 62]]) {
  const A = join(dir, pad(N_HERO) + '.webp');
  const B = join(dir, pad(DELTA + 1) + '.webp');
  for (let i = 0; i < N_PONTE; i++) {
    const alpha = ((i + 1) / (N_PONTE + 1)).toFixed(4);
    execFileSync('ffmpeg', ['-y', '-v', 'error', '-i', A, '-i', B,
      '-filter_complex',
      `[1:v]format=yuva444p,colorchannelmixer=aa=${alpha}[b];[0:v][b]overlay,format=yuv420p`,
      '-c:v', 'libwebp', '-quality', String(q), join(dir, pad(N_HERO + 1 + i) + '.webp')]);
  }
}

/* ── 4) primo fotogramma di riserva ── */
execFileSync('ffmpeg', ['-y', '-v', 'error', '-i', join(D, '0001.webp'),
  '-c:v', 'libwebp', '-quality', '90', join(ROOT, 'public/img/seq/film-first.webp')]);

/* ── 5) luma: ricalcolata sui soli 222 fotogrammi rifatti ── */
const lumaF = join(ROOT, 'public/dati/luma.json');
const luma = JSON.parse(readFileSync(lumaF, 'utf8'));
const raw = join(ROOT, 'lab/luma-hero.raw');
execFileSync('ffmpeg', ['-y', '-v', 'error', '-start_number', '1', '-i', join(D, '%04d.webp'),
  '-frames:v', String(DELTA), '-vf', 'scale=1:1', '-f', 'rawvideo', '-pix_fmt', 'gray', raw]);
const buf = readFileSync(raw);
if (buf.length !== DELTA) throw new Error(`luma su ${buf.length}, attesi ${DELTA}`);
[...buf].forEach((v, i) => { luma.chiaro[i] = v > 128 ? 1 : 0; });
writeFileSync(lumaF, JSON.stringify(luma) + '\n');
rmSync(raw);

console.log(`dopo:  desktop ${peso(D, 1, N_HERO)} · mobile ${peso(M, 1, N_HERO)}`);
console.log(`fermo del raccordo 0192: ${Math.round(statSync(join(D, '0192.webp')).size / 1024)} KB (q95)`);
