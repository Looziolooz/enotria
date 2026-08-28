/**
 * linee.js — la costellazione di pear.no.
 *
 * Un canvas 2D sopra la scena disegna punti che si spostano piano e le
 * linee che li collegano quando sono abbastanza vicini. Le linee non sono
 * decorazione a caso: compaiono solo dentro alcune finestre del film, si
 * tracciano e si ritirano, e legano il testo alla scena.
 *
 * Niente librerie: due dozzine di punti e un ciclo che gia' esiste.
 */

var cv = null, cx = null, punti = [], W = 0, H = 0, dpr = 1;

/* Finestre in cui la costellazione appare, sul progresso 0..1 del film */
var FINESTRE = [
  { da: 0.030, a: 0.105 },
  { da: 0.300, a: 0.375 },
  { da: 0.590, a: 0.665 },
  { da: 0.860, a: 0.930 },
];

function ridimensiona() {
  if (!cv) return;
  dpr = Math.min(2, window.devicePixelRatio || 1);
  W = cv.clientWidth; H = cv.clientHeight;
  cv.width = Math.round(W * dpr);
  cv.height = Math.round(H * dpr);
  cx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

export function initLinee() {
  cv = document.createElement('canvas');
  cv.className = 'linee';
  cv.setAttribute('aria-hidden', 'true');
  var pin = document.querySelector('.pin');
  (pin || document.body).appendChild(cv);
  cx = cv.getContext('2d');
  ridimensiona();
  window.addEventListener('resize', ridimensiona);

  /* Punti distribuiti, con una deriva lentissima ciascuno */
  for (var i = 0; i < 22; i++) {
    punti.push({
      bx: Math.random(), by: Math.random(),
      fase: Math.random() * Math.PI * 2,
      amp: 0.012 + Math.random() * 0.022,
      vel: 0.15 + Math.random() * 0.25,
    });
  }
}

/* Quanto e' accesa la costellazione a questo punto del film: 0..1 */
function intensita(p) {
  for (var i = 0; i < FINESTRE.length; i++) {
    var f = FINESTRE[i];
    if (p < f.da || p > f.a) continue;
    var t = (p - f.da) / (f.a - f.da);          /* 0..1 dentro la finestra */
    return Math.sin(t * Math.PI);              /* sale e si ritira */
  }
  return 0;
}

export function aggiornaLinee(progresso, tempo, chiaro) {
  if (!cx) return;
  var k = intensita(progresso);
  cx.clearRect(0, 0, W, H);
  if (k < 0.01) return;

  /* posizione corrente dei punti */
  var pos = [];
  for (var i = 0; i < punti.length; i++) {
    var q = punti[i];
    pos.push({
      x: (q.bx + Math.cos(tempo * 0.00016 * q.vel + q.fase) * q.amp) * W,
      y: (q.by + Math.sin(tempo * 0.00013 * q.vel + q.fase) * q.amp) * H,
    });
  }

  var tinta = chiaro ? '36, 20, 22' : '232, 223, 207';
  var soglia = Math.min(W, H) * 0.30;

  /* le linee: piu' sono vicini i punti, piu' il tratto e' pieno */
  cx.lineWidth = 1;
  for (var a = 0; a < pos.length; a++) {
    for (var b = a + 1; b < pos.length; b++) {
      var dx = pos[a].x - pos[b].x, dy = pos[a].y - pos[b].y;
      var d = Math.sqrt(dx * dx + dy * dy);
      if (d > soglia) continue;
      var forza = (1 - d / soglia) * k * 0.45;
      cx.strokeStyle = 'rgba(' + tinta + ',' + forza.toFixed(3) + ')';
      cx.beginPath();
      cx.moveTo(pos[a].x, pos[a].y);
      cx.lineTo(pos[b].x, pos[b].y);
      cx.stroke();
    }
  }

  /* i nodi */
  for (var n = 0; n < pos.length; n++) {
    cx.fillStyle = 'rgba(' + tinta + ',' + (k * 0.55).toFixed(3) + ')';
    cx.beginPath();
    cx.arc(pos[n].x, pos[n].y, 1.6, 0, Math.PI * 2);
    cx.fill();
  }
}
