/**
 * inserti.js — segni dell'antica Grecia sparsi lungo il film.
 *
 * Disegni a tratto, senza sfondo, in `currentColor`: il colore si ribalta
 * da solo secondo la luminanza del fotogramma sotto, letta da
 * `dati/luma.json` (misurata a monte, un valore per fotogramma).
 * Su fondo chiaro diventano inchiostro, su fondo scuro calce.
 *
 * Nessuna libreria, nessun listener di scroll: il ciclo che gia' esiste
 * chiama `aggiornaInserti(progresso)`.
 */

/* ── I segni: immagini a tratto chiavate in trasparenza, usate come
   MASCHERA. Il colore non sta nel file: lo mette il contenitore, e si
   ribalta con la luminanza del fotogramma sotto. ── */
var GLIFI = {
  'busto-dio':   '/img/segni/busto-dio.png',
  'busto-donna': '/img/segni/busto-donna.png',
  'anfora':      '/img/segni/anfora.png',
  'nave':        '/img/segni/nave.png',
  'colonna':     '/img/segni/colonna.png',
  'cratere':     '/img/segni/cratere.png',
  'statua':      '/img/segni/statua.png',
  'filosofo':    '/img/segni/filosofo.png',
  'lucerna':     '/img/segni/lucerna.png',
};

/* ── Dove cadono: UN glifo per scena, SOLO dove rima col contenuto ──
   Film v3 (2999 fotogrammi, ponti match-cut fra i segmenti): ogni segno
   sta nel CUORE del suo segmento (at = centro, w tale da spegnersi prima
   del ponte), al bordo opposto all'azione, e commenta la scena — l'anfora
   sullo sbarco delle anfore, la colonna sulla vigna, la lucerna sull'
   ingresso in cantina. Niente segni su: nave (iconica da sola), scambio
   (troppo corto), scene affollate, ponti, finale rubino.
   Ricalcolare gli `at` da public/dati/segmenti.json se il montaggio cambia. */
var SEGNI = [
  { g: 'anfora',      at: 0.106, x: '102%', y: '30%', s: 280, r: 3 },   /* approdo */
  { g: 'colonna',     at: 0.180, x: '-3%',  y: '40%', s: 310, r: 0 },   /* vigna */
  { g: 'busto-donna', at: 0.254, x: '102%', y: '66%', s: 300, r: -2 },  /* raccolta */
  { g: 'cratere',     at: 0.491, x: '-3%',  y: '34%', s: 280, r: -3 },  /* pigiatura */
  { g: 'lucerna',     at: 0.619, x: '-3%',  y: '30%', s: 240, r: 3 },   /* porta */
  { g: 'busto-dio',   at: 0.683, x: '102%', y: '62%', s: 300, r: 2 },   /* i mondi */
];

var NS = 'http://www.w3.org/2000/svg';
var contenitore = null;
var nodi = [];
var chiaro = null;      /* 1 per fotogramma chiaro, 0 per scuro */
var nFotogrammi = 1;
var ultimoTono = null;

function creaSegno(def) {
  var el = document.createElement('div');
  el.className = 'inserto';
  el.setAttribute('aria-hidden', 'true');
  el.style.left = def.x;
  el.style.top = def.y;
  el.style.width = def.s + 'px';
  el.style.height = def.s + 'px';
  var url = 'url("' + GLIFI[def.g] + '")';
  el.style.webkitMaskImage = url;
  el.style.maskImage = url;
  el.dataset.at = String(def.at);
  el.dataset.r = String(def.r);
  if (def.w) el.dataset.w = String(def.w);
  return el;
}

export function initInserti() {
  contenitore = document.createElement('div');
  contenitore.className = 'inserti';
  contenitore.setAttribute('aria-hidden', 'true');
  for (var i = 0; i < SEGNI.length; i++) {
    var n = creaSegno(SEGNI[i]);
    contenitore.appendChild(n);
    nodi.push(n);
  }
  var pin = document.querySelector('.pin');
  (pin || document.body).appendChild(contenitore);

  fetch('/dati/luma.json')
    .then(function (r) { return r.json(); })
    .then(function (d) { chiaro = d.chiaro; nFotogrammi = d.n || 1; })
    .catch(function () { /* senza manifesto restano chiari: nessun errore */ });
}

/* Chiamata dal ciclo esistente. `progresso` e' 0..1 sul film. */
export function aggiornaInserti(progresso) {
  if (!contenitore) return;

  /* ── Tono: lo decide la luminanza del fotogramma sotto ── */
  if (chiaro) {
    var idx = Math.max(0, Math.min(nFotogrammi - 1, Math.round(progresso * (nFotogrammi - 1))));
    var tono = chiaro[idx] ? 'scuro' : 'chiaro';
    if (tono !== ultimoTono) {
      ultimoTono = tono;
      contenitore.classList.toggle('inserti--inchiostro', tono === 'scuro');
    }
  }

  /* ── Comparsa: finestra stretta attorno al proprio punto ── */
  var finestra = 0.026;
  for (var i = 0; i < nodi.length; i++) {
    var n = nodi[i];
    var at = parseFloat(n.dataset.at);
    var f = parseFloat(n.dataset.w) || finestra;
    var d = (progresso - at) / f;      /* -1 .. 1 dentro la finestra */
    if (d < -1 || d > 1) {
      if (n.style.opacity !== '0') { n.style.opacity = '0'; }
      continue;
    }
    /* profilo: sale, tiene, scende */
    var t = 1 - Math.abs(d);
    var op = Math.min(1, t * 2.2) * (parseFloat(n.dataset.o) || 0.78);
    var rot = parseFloat(n.dataset.r) + d * 5;
    var sc = 0.92 + t * 0.12;
    n.style.opacity = String(op);
    n.style.transform = 'translate(-50%,-50%) rotate(' + rot + 'deg) scale(' + sc + ')';
  }
}
