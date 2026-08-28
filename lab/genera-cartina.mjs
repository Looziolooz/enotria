/**
 * genera-cartina.mjs — Genera i tracciati SVG di src/cartina.js dai confini reali.
 *
 * Fonte: _sorgenti/cartina/it-{reg,prov}.geojson (openpolis/geojson-italy,
 * derivato ISTAT, CC-BY-4.0). Proiezione equirettangolare corretta con
 * cos(lat media), adattata alla viewBox 0 0 400 620 con margine.
 * Semplificazione Douglas-Peucker in unità viewBox.
 *
 * Output:
 *  - stdout: i blocchi CONTORNO / PROVINCE / PUNTO da incollare in src/cartina.js
 *  - lab/cartina-preview.html: anteprima statica per il controllo visivo
 *
 * Uso:  node lab/genera-cartina.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const VB = { w: 400, h: 620, margine: 26 };
const TOLL = 1.6; // tolleranza DP in unità viewBox

/* ── carica e filtra Calabria (ISTAT reg 18; prov CS 78, CZ 79, RC 80, KR 101, VV 102) ── */
const reg = JSON.parse(readFileSync(join(ROOT, '_sorgenti/cartina/it-reg.geojson'), 'utf8'));
const prov = JSON.parse(readFileSync(join(ROOT, '_sorgenti/cartina/it-prov.geojson'), 'utf8'));

const calabria = reg.features.find((f) => f.properties.reg_istat_code_num === 18);
if (!calabria) throw new Error('Calabria non trovata nel geojson regioni');

const PROV_ID = { 78: 'cosenza', 79: 'catanzaro', 80: 'reggio-calabria', 101: 'crotone', 102: 'vibo-valentia' };
const provCal = prov.features.filter((f) => PROV_ID[f.properties.prov_istat_code_num]);
if (provCal.length !== 5) throw new Error(`Attese 5 province, trovate ${provCal.length}`);

/* ── anello maggiore di un (Multi)Polygon ── */
function anelloMaggiore(geom) {
  const polys = geom.type === 'Polygon' ? [geom.coordinates] : geom.coordinates;
  let best = null, bestN = -1;
  for (const p of polys) if (p[0].length > bestN) { bestN = p[0].length; best = p[0]; }
  return best;
}

/* ── proiezione: adattata sull'estensione della regione ── */
const anelloReg = anelloMaggiore(calabria.geometry);
const lats = anelloReg.map((c) => c[1]), lons = anelloReg.map((c) => c[0]);
const latMin = Math.min(...lats), latMax = Math.max(...lats);
const lonMin = Math.min(...lons), lonMax = Math.max(...lons);
const k = Math.cos(((latMin + latMax) / 2) * Math.PI / 180);

const spanX = (lonMax - lonMin) * k, spanY = latMax - latMin;
const scala = Math.min((VB.w - 2 * VB.margine) / spanX, (VB.h - 2 * VB.margine) / spanY);
const offX = (VB.w - spanX * scala) / 2, offY = (VB.h - spanY * scala) / 2;

const proietta = ([lon, lat]) => [
  offX + (lon - lonMin) * k * scala,
  offY + (latMax - lat) * scala,
];

/* ── Douglas-Peucker ── */
function dp(pts, toll) {
  if (pts.length < 3) return pts;
  const [a, b] = [pts[0], pts[pts.length - 1]];
  let iMax = 0, dMax = 0;
  for (let i = 1; i < pts.length - 1; i++) {
    const [x, y] = pts[i];
    const dx = b[0] - a[0], dy = b[1] - a[1];
    const d = Math.abs(dy * x - dx * y + b[0] * a[1] - b[1] * a[0]) / (Math.hypot(dx, dy) || 1);
    if (d > dMax) { dMax = d; iMax = i; }
  }
  if (dMax <= toll) return [a, b];
  return dp(pts.slice(0, iMax + 1), toll).slice(0, -1).concat(dp(pts.slice(iMax), toll));
}

function pathDa(anello, toll) {
  let pts = anello.map(proietta);
  // anello chiuso: togli il duplicato finale e spezza sul punto più lontano dal primo,
  // altrimenti DP con estremi coincidenti collassa tutto
  const [x0, y0] = pts[0];
  if (Math.hypot(pts[pts.length - 1][0] - x0, pts[pts.length - 1][1] - y0) < 1e-9) pts = pts.slice(0, -1);
  let iFar = 0, dFar = -1;
  for (let i = 1; i < pts.length; i++) {
    const d = Math.hypot(pts[i][0] - x0, pts[i][1] - y0);
    if (d > dFar) { dFar = d; iFar = i; }
  }
  const meta1 = dp(pts.slice(0, iFar + 1), toll);
  const meta2 = dp(pts.slice(iFar).concat([pts[0]]), toll);
  const tutti = meta1.slice(0, -1).concat(meta2.slice(0, -1));
  const r = (v) => Math.round(v);
  return 'M' + tutti.map(([x, y]) => `${r(x)} ${r(y)}`).join(' L') + ' Z';
}

function centroide(anello) {
  const pts = anello.map(proietta);
  const n = pts.length;
  const c = pts.reduce((s, p) => [s[0] + p[0], s[1] + p[1]], [0, 0]);
  return [Math.round(c[0] / n), Math.round(c[1] / n)];
}

/* ── 9 zone DOC: coordinate reali del comune/area di riferimento ── */
const DOC = {
  ciro:     [17.128, 39.369], // Cirò Marina
  melissa:  [17.103, 39.310], // Melissa
  santanna: [17.095, 38.959], // Isola di Capo Rizzuto
  bivongi:  [16.452, 38.482], // Bivongi
  greco:    [16.148, 38.086], // Bianco
  lamezia:  [16.310, 38.960], // piana lametina
  savuto:   [16.320, 39.180], // valle del Savuto (Rogliano)
  scavigna: [16.164, 39.036], // Nocera Terinese
  cosenza:  [16.254, 39.298], // Cosenza
};

/* ── output ── */
const contorno = pathDa(anelloReg, TOLL);
console.log(`// CONTORNO — ${contorno.split('L').length} punti`);
console.log(`var CONTORNO =\n  '${contorno}';\n`);

const provOut = {};
for (const f of provCal) {
  const id = PROV_ID[f.properties.prov_istat_code_num];
  const anello = anelloMaggiore(f.geometry);
  provOut[id] = { d: pathDa(anello, TOLL), label: centroide(anello) };
  console.log(`// ${id}: ${provOut[id].d.split('L').length} punti, centroide ${provOut[id].label}`);
  console.log(`'${provOut[id].d}'\n`);
}

console.log('// PUNTO (proiezione delle coordinate reali):');
for (const [id, coord] of Object.entries(DOC)) {
  const [x, y] = proietta(coord).map(Math.round);
  console.log(`  ${id}: { x: ${x}, y: ${y} },`);
}

/* ── anteprima ── */
const provSvg = Object.entries(provOut).map(([id, p]) =>
  `<path fill="rgba(180,140,60,.12)" stroke="#8a6d3b" stroke-width="0.8" d="${p.d}"><title>${id}</title></path>
   <text x="${p.label[0]}" y="${p.label[1]}" text-anchor="middle" font-size="9" fill="#c9a227" font-family="monospace">${id.toUpperCase()}</text>`
).join('\n');
const puntiSvg = Object.entries(DOC).map(([id, c]) => {
  const [x, y] = proietta(c).map(Math.round);
  return `<circle cx="${x}" cy="${y}" r="3.5" fill="#c9a227"/><text x="${x + 8}" y="${y - 5}" font-size="8" fill="#ddd" font-family="monospace">${id}</text>`;
}).join('\n');

writeFileSync(join(ROOT, 'lab/cartina-preview.html'), `<!doctype html>
<html><head><meta charset="utf-8"><title>anteprima cartina</title></head>
<body style="background:#151210;margin:2rem">
<svg viewBox="0 0 ${VB.w} ${VB.h}" width="440" style="display:block;margin:auto">
<path fill="none" stroke="#ddd" stroke-width="1.4" d="${contorno}"/>
${provSvg}
${puntiSvg}
</svg></body></html>\n`);
console.log('\nlab/cartina-preview.html scritto.');
