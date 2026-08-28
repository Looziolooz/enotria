/**
 * shader-setup.js — Scroll-world: 16 elementi (9 scene + 5 raccordi video + 2 ponti colore).
 *
 * Modello: lo scroll scrubba una sequenza di fotogrammi webp (no <video>).
 * Ogni elemento ha N fotogrammi caricati come Texture OGL.
 * Il progresso smorzato (attuale, non bersaglio) sceglie il fotogramma.
 *
 * Gestione memoria: massimo 3 scene in GPU contemporaneamente.
 * Precarica la successiva al 50%, scarica le scene a >2 di distanza.
 *
 * Nessun listener scroll separato: tutto dentro requestAnimationFrame.
 * Un solo easing ovunque: cubic-bezier(0.22, 1, 0.36, 1).
 *
 * Regola generale: camera e filmato non si muovono mai insieme.
 * Dove il filmato ha un movimento suo, la camera sta ferma.
 * La camera lavora solo dove il filmato e' quasi immobile.
 */

import { Renderer, Triangle, Program, Mesh, Texture } from 'ogl';
import { initLinee, aggiornaLinee } from './linee.js';
import { initInserti, aggiornaInserti } from './inserti.js';
import { VERT, FRAG } from './shader.js';

/* ══════════════════════════════════════════════════════════════════════
   16 ELEMENTI — 9 scene + 5 raccordi video + 2 ponti colore.
   Catena: 01 → ponteA → 02(r) → 03 → r1 → 06 → r2 → 07 → 08 →
           r3 → 09 → r4 → 12 → r5 → 14 → r6 → 15
   ══════════════════════════════════════════════════════════════════════ */
var VH_PER_SCENE = 400;
var VH_PER_RACCORDO = 200;
/* Il film e' UNA sequenza continua: il montaggio del committente
   (_sorgenti/video/tutti-frames) piu' le transizioni dipinte innestate
   ai suoi punti. Niente scene separate, niente stacchi calcolati:
   il movimento e' tutto dentro i fotogrammi. */
var SCENES = [
  { vh: 5300, zoomStart: 1.00, zoom: 1.00, panStart: [0, 0], pan: [0, 0] },
];

/* Una sola cartella, un solo film */
var CLIP_FOLDERS = ['film'];
var SCENE_INDICES = [0];
var BRIDGE_INDICES = [];

/* ── Mappa sceneIdx → cartella clip ── */
var CLIP_FOLDERS = ['film'];

/* ── Indici delle scene (no raccordi, no ponti) ── */
var SCENE_INDICES = [0, 1, 2, 4, 6, 7, 9, 11, 14];

/* ── Indici dei ponti colore ── */
var BRIDGE_INDICES = [0, 2];

/* ── Parametri scena tempio (index 2, clip 03) ── */
var TEMPLE = {
  idx: -1,
  zoomOutStart: 1.22,
  zoomOutEnd: 1.00,
  zoomInStart: 1.00,
  zoomInEnd: 1.45,
  phase1End: 0.35,
  phase3Start: 0.88,
};

/* ── Colore ponte A: mare (fra 01 e 02) — turchese dal quarto centrale dell'ultimo frame ── */
var BRIDGE_A_COLOR = [50 / 255, 103 / 255, 108 / 255];

/* ── Colore ponte B: pietra (fra 03 e r1) — gia' verificato ── */
var BRIDGE_B_COLOR = [146 / 255, 118 / 255, 88 / 255];

/* ── Finestra di transizione ── */
var TRANSITION_PCT = 0.20;
var BRIDGE_TRANSITION_PCT = 0.26;

/* ── Numero di frame da incrociare durante lo stacco ── */
var CROSSFADE_FRAMES = 20;

/* ── Soglia per taglio diretto vs dissolvenza (differenza media pixel) ── */
var CUT_THRESHOLD = 8;

/* ── Differenze precalcolate fra ultimo frame di un elemento e primo del successivo ── */
var seamDiffs = [];

/* ── Stato globale ── */
var stageEl = null;
var stageProgress = 0;
var bersaglio = 0;
var attuale = 0;
var TAGLI = [];
var FINESTRA_TAGLIO = 0.034;   /* meta' finestra, in progresso di film */
var lastFrameTime = performance.now();

/* ── Dati scene da frames.json ── */
var framesData = [];

/* ── Texture per scena: sceneFrames[sceneIdx] = [Texture, ...] ── */
var sceneFrames = [];

/* ── Limiti progresso precalcolati ── */
var totalVh = 0;
var sceneEnds = [];

/* ── Fallback textures (primo/ultimo frame di ogni scena da /img/seq/) ── */
var fallbackTextures = [];

/* ══════════════════════════════════════════════════════════════════════
   Utilita
   ══════════════════════════════════════════════════════════════════════ */

function lerp(a, b, t) { return a + (b - a) * t; }
function clamp01(v) { return Math.max(0, Math.min(1, v)); }

/* ══════════════════════════════════════════════════════════════════════
   Caricamento singolo frame come Texture OGL
   ══════════════════════════════════════════════════════════════════════ */

function loadFrame(gl, url) {
  return new Promise(function (resolve) {
    var img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = function () {
      var tex = new Texture(gl, { image: img });
      tex.image = img;
      tex.needsUpdate = true;
      tex._realWidth = img.naturalWidth;
      tex._realHeight = img.naturalHeight;
      resolve(tex);
    };
    img.onerror = function () {
      resolve(null);
    };
    img.src = url;
  });
}

/* ══════════════════════════════════════════════════════════════════════
   Caricamento fallback (singola immagine da /img/seq/)
   ══════════════════════════════════════════════════════════════════════ */

function loadFallback(gl, sceneIdx) {
  var nn = CLIP_FOLDERS[sceneIdx];
  return loadFrame(gl, '/img/seq/' + nn + '-first.webp');
}

/* ══════════════════════════════════════════════════════════════════════
   Caricamento di una scena intera (tutti i frame)
   Carica in batch di 8 per frame per non bloccare il render.
   ══════════════════════════════════════════════════════════════════════ */

function loadScene(gl, sceneIdx) {
  if (sceneFrames[sceneIdx] && sceneFrames[sceneIdx]._loaded) return Promise.resolve();
  if (sceneFrames[sceneIdx] && sceneFrames[sceneIdx]._loading) return Promise.resolve();

  var data = framesData[sceneIdx];
  if (!data) return Promise.resolve();

  sceneFrames[sceneIdx] = [];
  sceneFrames[sceneIdx]._loading = true;
  sceneFrames[sceneIdx]._loaded = false;

  var nn = CLIP_FOLDERS[sceneIdx];
  var basePath = '/frames/' + nn + '/';
  var BATCH = 24;
  var total = data.n;

  function loadBatch(start) {
    var promises = [];
    for (var i = start; i < Math.min(start + BATCH, total); i++) {
      var frameNum = String(i + 1).padStart(4, '0');
      promises.push(loadFrame(gl, basePath + frameNum + '.webp'));
    }
    return Promise.all(promises).then(function (textures) {
      for (var j = 0; j < textures.length; j++) {
        sceneFrames[sceneIdx][start + j] = textures[j];
      }
      if (start + BATCH < total) {
        return new Promise(function (resolve) {
          requestAnimationFrame(function () {
            loadBatch(start + BATCH).then(resolve);
          });
        });
      }
    });
  }

  return loadBatch(0).then(function () {
    sceneFrames[sceneIdx]._loaded = true;
    sceneFrames[sceneIdx]._loading = false;
  });
}

/* ══════════════════════════════════════════════════════════════════════
   Scarico di una scena (rilascia texture GPU)
   ══════════════════════════════════════════════════════════════════════ */

function unloadScene(gl, sceneIdx) {
  var frames = sceneFrames[sceneIdx];
  if (!frames) return;
  for (var i = 0; i < frames.length; i++) {
    if (frames[i] && frames[i].destroy) {
      frames[i].destroy(gl);
    }
  }
  sceneFrames[sceneIdx] = [];
  sceneFrames[sceneIdx]._loaded = false;
  sceneFrames[sceneIdx]._loading = false;
}

/* ══════════════════════════════════════════════════════════════════════
   Texture per indice — fallback alla texture placeholder se il
   frame non e' ancora caricato.
   ══════════════════════════════════════════════════════════════════════ */

function getFrameTex(sceneIdx, frameIdx) {
  var frames = sceneFrames[sceneIdx];
  if (frames && frames[frameIdx]) return frames[frameIdx];
  /* Fallback: primo frame della scena, poi fallback statico, poi nero */
  if (frames && frames[0]) return frames[0];
  if (fallbackTextures[sceneIdx]) return fallbackTextures[sceneIdx];
  return null;
}

/* ══════════════════════════════════════════════════════════════════════
   Gestione memoria: precarica e scarico scene
   ══════════════════════════════════════════════════════════════════════ */

var _preloadQueue = [];

function manageSceneMemory(gl, currentIdx) {
  /* Precarica la successiva quando la corrente supera il 50% */
  if (currentIdx < SCENES.length - 1) {
    var data = framesData[currentIdx];
    if (data) {
      var sceneStart = currentIdx === 0 ? 0 : sceneEnds[currentIdx - 1];
      var sceneDur = sceneEnds[currentIdx] - sceneStart;
      var localProg = sceneDur > 0 ? (attuale - sceneStart) / sceneDur : 0;
      if (localProg > 0.5) {
        var nextIdx = currentIdx + 1;
        if (!sceneFrames[nextIdx] || (!sceneFrames[nextIdx]._loaded && !sceneFrames[nextIdx]._loading)) {
          if (_preloadQueue.indexOf(nextIdx) === -1) {
            _preloadQueue.push(nextIdx);
            loadScene(gl, nextIdx);
          }
        }
      }
    }
  }

  /* Scarica le scene a piu' di 2 di distanza */
  for (var i = 0; i < sceneFrames.length; i++) {
    if (Math.abs(i - currentIdx) > 2) {
      if (sceneFrames[i] && sceneFrames[i]._loaded) {
        unloadScene(gl, i);
      }
    }
  }
}

/* ══════════════════════════════════════════════════════════════════════
   Calcolo progresso del palco sticky
   ══════════════════════════════════════════════════════════════════════ */

function computeStageProgress() {
  if (!stageEl) return;
  var rect = stageEl.getBoundingClientRect();
  var total = rect.height - window.innerHeight;
  if (total <= 0) return;
  var scrolled = -rect.top;
  stageProgress = clamp01(scrolled / total);
}

/* ══════════════════════════════════════════════════════════════════════
   Trova scena corrente e progresso locale
   ══════════════════════════════════════════════════════════════════════ */

function findScene(progress) {
  for (var i = 0; i < SCENES.length; i++) {
    if (progress <= sceneEnds[i] || i === SCENES.length - 1) {
      var start = i === 0 ? 0 : sceneEnds[i - 1];
      var dur = sceneEnds[i] - start;
      var local = dur > 0 ? clamp01((progress - start) / dur) : 0;
      return { idx: i, local: local };
    }
  }
  return { idx: 0, local: 0 };
}

/* ══════════════════════════════════════════════════════════════════════
   Calcolo zoom/pan per le scene tempio (index 1 e 2).
   Camera e filmato non si muovono mai insieme.
   ══════════════════════════════════════════════════════════════════════ */

function templeCamera(localProgress, sceneIdx) {
  /* Fase 1: 0→35% — camera arretra da 1.22 a 1.00, pan a zero, film fermo su frame 0 */
  if (localProgress <= TEMPLE.phase1End) {
    var t1 = localProgress / TEMPLE.phase1End;
    return {
      zoom: lerp(TEMPLE.zoomOutStart, TEMPLE.zoomOutEnd, t1),
      panX: 0,
      panY: 0,
      filmFrame: 0,
    };
  }

  /* Fase 2: 35%→88% — camera ferma a 1.00, film scorre da frame 0 a ultimo */
  if (localProgress <= TEMPLE.phase3Start) {
    var data = framesData[sceneIdx];
    var n = data ? data.n : 64;
    var filmT = (localProgress - TEMPLE.phase1End) / (TEMPLE.phase3Start - TEMPLE.phase1End);
    return {
      zoom: TEMPLE.zoomInStart,
      panX: 0,
      panY: 0,
      filmFrame: Math.round(clamp01(filmT) * (n - 1)),
    };
  }

  /* Fase 3: 88%→100% — camera spinge 1.00→1.45 sull'ultimo fotogramma */
  var t3 = (localProgress - TEMPLE.phase3Start) / (1 - TEMPLE.phase3Start);
  var data = framesData[sceneIdx];
  var n = data ? data.n : 64;
  return {
    zoom: lerp(TEMPLE.zoomInStart, TEMPLE.zoomInEnd, clamp01(t3)),
    panX: 0,
    panY: 0,
    filmFrame: n - 1,
  };
}

/* ══════════════════════════════════════════════════════════════════════
   Tipo di transizione fra elementi adiacenti
   ══════════════════════════════════════════════════════════════════════ */

function transitionType(sceneIdx) {
  /* Ponte colore A: fra 01 e 02 (index 0→1) */
  if (sceneIdx === 0) return 'bridgeA';
  return 'normal';
}

/* ══════════════════════════════════════════════════════════════════════
   Indice frame effettivo — gestisce clip invertite
   ══════════════════════════════════════════════════════════════════════ */

function effectiveFrame(sceneIdx, frameIdx) {
  var data = framesData[sceneIdx];
  if (!data) return frameIdx;
  if (data.inverti) return data.n - 1 - frameIdx;
  return frameIdx;
}

/* ══════════════════════════════════════════════════════════════════════
   Selezione frame e calcolo transizione
   ══════════════════════════════════════════════════════════════════════ */

function selectFrames(sceneIdx, localProgress) {
  var data = framesData[sceneIdx];
  if (!data) return { frameA: 0, inTransition: false, transProgress: 0, shaderMode: 0 };

  var n = data.n;
  var tType = transitionType(sceneIdx);
  var transPct = (tType === 'bridgeA' || tType === 'bridgeB') ? BRIDGE_TRANSITION_PCT : TRANSITION_PCT;
  var transStart = 1 - transPct;
  var inTransition = localProgress > transStart && sceneIdx < SCENES.length - 1;

  /* Scena tempio (index 2 = clip 03): il frame e' calcolato separatamente */
  if (sceneIdx === TEMPLE.idx && !inTransition) {
    var tc = templeCamera(localProgress, sceneIdx);
    return {
      frameA: tc.filmFrame,
      inTransition: false,
      transProgress: 0,
      shaderMode: 0,
    };
  }

  /* Dissolvenza colore (ponti A e B): usa shader mode 3.
     Il ponte dissolve through colore pieno: la texture entrante resta ferma
     al primo frame (frameB = 0) per evitare un salto al confine scena. */
  if (inTransition && (tType === 'bridgeA' || tType === 'bridgeB')) {
    var transProgress = clamp01((localProgress - transStart) / transPct);
    var fadeFrame = Math.min(CROSSFADE_FRAMES - 1, Math.round(transProgress * (CROSSFADE_FRAMES - 1)));
    var frameA = n - CROSSFADE_FRAMES + fadeFrame;
    /* smoothstep: addolcisce entrata e uscita della miscela */
    var bp = transProgress;
    bp = bp * bp * (3 - 2 * bp);
    return {
      frameA: Math.max(0, Math.min(n - 1, frameA)),
      frameB: 0,
      inTransition: true,
      transProgress: transProgress,
      _blendProgress: bp,
      shaderMode: 3,
      _bridgeColor: tType === 'bridgeA' ? BRIDGE_A_COLOR : BRIDGE_B_COLOR,
    };
  }

  /* Transizione normale: dissolvenza incrociata o taglio diretto */
  if (inTransition) {
    var transProgress = clamp01((localProgress - transStart) / transPct);
    var diff = seamDiffs[sceneIdx] !== undefined ? seamDiffs[sceneIdx] : 100;

    /* Taglio diretto se la differenza e' sotto la soglia */
    if (diff < CUT_THRESHOLD) {
      return {
        frameA: n - 1,
        frameB: 0,
        inTransition: true,
        transProgress: 1,
        shaderMode: 0,
        _directCut: true,
      };
    }

    /* Dissolvenza incrociata: fadeFrame muove il frameA verso l'ultimo */
    var fadeFrame = Math.min(CROSSFADE_FRAMES - 1, Math.round(transProgress * (CROSSFADE_FRAMES - 1)));
    var frameA = n - CROSSFADE_FRAMES + fadeFrame;
    var frameB = Math.round(transProgress * (CROSSFADE_FRAMES - 1));
    var dataNext = framesData[sceneIdx + 1];
    var nNext = dataNext ? dataNext.n : 96;
    frameB = Math.min(frameB, nNext - 1);
    var bp = transProgress;
    bp = bp * bp * (3 - 2 * bp);
    return {
      frameA: Math.max(0, Math.min(n - 1, frameA)),
      frameB: frameB,
      inTransition: true,
      transProgress: transProgress,
      _blendProgress: bp,
      shaderMode: sceneIdx % 3,
    };
  }

  /* Normale: mappa progresso a frame */
  var frameA = Math.round(localProgress * (n - 1));
  return {
    frameA: Math.max(0, Math.min(n - 1, frameA)),
    inTransition: false,
    transProgress: 0,
    shaderMode: 0
  };
}

/* ══════════════════════════════════════════════════════════════════════
   Calcolo differenza fra ultimo frame di un elemento e primo del successivo
   (confronto multimedia via canvas offscreen)
   ══════════════════════════════════════════════════════════════════════ */

function computeSeamDiffs() {
  var canvas = document.createElement('canvas');
  canvas.width = 96;
  canvas.height = 54;
  var ctx = canvas.getContext('2d', { willReadFrequently: true });

  for (var i = 0; i < SCENES.length - 1; i++) {
    var dataA = framesData[i];
    var dataB = framesData[i + 1];
    if (!dataA || !dataB) { seamDiffs[i] = 100; continue; }

    var lastIdx = effectiveFrame(i, dataA.n - 1);
    var firstIdx = effectiveFrame(i + 1, 0);

    var imgA = sceneFrames[i] && sceneFrames[i][lastIdx] ? sceneFrames[i][lastIdx].image : null;
    var imgB = sceneFrames[i + 1] && sceneFrames[i + 1][firstIdx] ? sceneFrames[i + 1][firstIdx].image : null;

    if (!imgA || !imgB) { seamDiffs[i] = 100; continue; }

    ctx.drawImage(imgA, 0, 0, 96, 54);
    var pxABuf = ctx.getImageData(0, 0, 96, 54).data;

    ctx.drawImage(imgB, 0, 0, 96, 54);
    var pxBBuf = ctx.getImageData(0, 0, 96, 54).data;

    var sum = 0;
    var len = Math.min(pxABuf.length, pxBBuf.length);
    for (var j = 0; j < len; j++) sum += Math.abs(pxABuf[j] - pxBBuf[j]);
    seamDiffs[i] = len > 0 ? sum / len : 0;
  }
}

/* ══════════════════════════════════════════════════════════════════════
   Generazione blocchi testo del palco — redistribuiti su 9 scene
   Nessuna battuta durante i raccordi e i ponti colore.
   ══════════════════════════════════════════════════════════════════════ */

/**
 * Mappa atto → indice scena (0-based).
 * 9 scene nella catena di 16 elementi.
 */
var ATTO_TO_SCENE = { 1: 0, 3: 2, 5: 4, 7: 6, 9: 9, 11: 11, 14: 13 };

function generateStageText(copione) {
  var container = document.getElementById('stage-copy');
  if (!container) return;

  /* Precalcola inizi assoluti delle scene */
  var sceneStarts = [];
  var cum = 0;
  for (var i = 0; i < SCENES.length; i++) {
    sceneStarts.push(cum / totalVh);
    cum += SCENES[i].vh;
  }

  /* Regia: sei posti sullo schermo, mai due di fila allo stesso angolo */
  var posti = ['st-sl', 'st-tr', 'st-bl', 'st-cr', 'st-tl', 'st-br'];

  for (var i = 0; i < copione.length; i++) {
    var entry = copione[i];
    var sceneIdx = ATTO_TO_SCENE[entry.atto];
    if (sceneIdx === undefined) continue;
    if (sceneIdx < 0 || sceneIdx >= SCENES.length) continue;

    var sceneStart = sceneStarts[sceneIdx];
    var sceneDur = SCENES[sceneIdx].vh / totalVh;
    var globalAt = sceneStart + entry.at * sceneDur;

    var div = document.createElement('div');
    div.className = 'stage-text ' + posti[i % posti.length];
    /* Materia per peso: i titoli entrano dentro una pennellata,
       le note stanno su pergamena con inchiostro scuro. */
    if (entry.peso === 'titolo') div.className += ' pennellata';
    if (entry.peso === 'nota') div.className += ' pergamena';
    if (entry.peso === 'hero') div.className = 'stage-text st-hero pennellata';
    if (entry.peso === 'capitolo') {
      div.className = 'stage-text st-capitolo capitolo';
      if (entry.tinta === 'scura') div.className += ' capitolo--scuro';
    }
    div.setAttribute('data-stage-text', '');
    div.setAttribute('data-at', String(globalAt.toFixed(4)));

    /* Arco ellittico: una linea sottile che si disegna mentre la battuta
       entra, e lega il blocco alla scena invece di lasciarlo galleggiare.
       E' la grammatica di pear.no: geometria netta sopra pittura morbida. */
    var arco = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    arco.setAttribute('class', 'stage-text__arco');
    arco.setAttribute('viewBox', '0 0 400 200');
    arco.setAttribute('preserveAspectRatio', 'none');
    arco.setAttribute('aria-hidden', 'true');
    var ell = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    /* mezza ellisse: parte dal margine sinistro, scavalca il blocco, scende a destra */
    ell.setAttribute('d', 'M 4 190 A 220 150 0 0 1 396 40');
    ell.setAttribute('class', 'stage-text__ellisse');
    ell.setAttribute('pathLength', '1');
    arco.appendChild(ell);
    var punto = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    punto.setAttribute('cx', '396'); punto.setAttribute('cy', '40'); punto.setAttribute('r', '3');
    punto.setAttribute('class', 'stage-text__punto');
    arco.appendChild(punto);

    var inner = document.createElement('div');
    inner.className = 'stage-text__inner';
    /* l'arco sta sul blocco esterno, NON dentro l'inner: la maschera a
       pennellata dell'inner lo tagliava via, ed era invisibile */
    div.appendChild(arco);

    /* Numerazione classica dei capitoli: i numerali greci (Α΄=1, Β΄=2 …)
       col keraia, il segno che nell'uso antico distingue il numero dalla
       lettera. Cadono in GFS Didot per unicode-range, da soli. */
    var NUMERALI = ['Α΄','Β΄','Γ΄','Δ΄','Ε΄','Ϛ΄','Ζ΄','Η΄','Θ΄','Ι΄','ΙΑ΄','ΙΒ΄','ΙΓ΄','ΙΔ΄','ΙΕ΄','ΙϚ΄','ΙΖ΄','ΙΗ΄'];
    var label = null;
    if (entry.peso !== 'capitolo') {
    label = document.createElement('p');
    label.className = 'mono stage-text__label';
    var num = NUMERALI[i] || '';
    label.textContent = entry.occhiello ? (num + ' · ' + entry.occhiello) : num;
    if (entry.greco === 'occhiello') label.classList.add('greco');
    inner.appendChild(label);
    }

    var textEl = document.createElement('p');
    if (entry.greco === 'testo') textEl.classList.add('greco');
    if (entry.peso === 'capitolo') textEl.classList.add('stage-text__capitolo');
    if (entry.peso === 'titolo' || entry.peso === 'capitolo' || entry.peso === 'hero') {
      /* l'assegnazione secca cancellava la classe del capitolo:
         il corpo grande va conservato */
      textEl.className = 'display ' + (entry.peso === 'capitolo' ? 'stage-text__capitolo'
        : entry.peso === 'hero' ? 'stage-text__hero' : 'stage-text__title');
      if (entry.greco === 'testo') textEl.classList.add('greco');
      /* Le lettere vanno raggruppate PER PAROLA: ogni lettera e' uno span
         inline-block, e il browser spezza la riga fra due span anche in
         mezzo a una parola («conquista / re»). Il gruppo-parola e'
         indivisibile, l'a-capo torna possibile solo agli spazi. */
      var parole = entry.testo.split(' ');
      var totale = entry.testo.length;
      var charDelay = Math.min(35, Math.round(400 / Math.max(1, totale)));
      var c = 0;
      for (var w = 0; w < parole.length; w++) {
        if (w > 0) textEl.appendChild(document.createTextNode(' '));
        var gruppo = document.createElement('span');
        gruppo.className = 'parola';
        var lettere = parole[w].split('');
        for (var l = 0; l < lettere.length; l++) {
          var sp = document.createElement('span');
          sp.className = 'sl';
          sp.style.transitionDelay = (c * charDelay) + 'ms';
          sp.textContent = lettere[l];
          gruppo.appendChild(sp);
          c++;
        }
        textEl.appendChild(gruppo);
        c++; /* lo spazio conta nel ritmo */
      }
      textEl.setAttribute('aria-label', entry.testo);
    } else {
      textEl.className = entry.peso === 'nota' ? 'mono stage-text__nota' : 't-lead stage-text__body';
      textEl.textContent = entry.testo;
    }
    inner.appendChild(textEl);
    if (entry.meta) {
      var meta = document.createElement('p');
      meta.className = 'mono stage-text__meta';
      meta.textContent = entry.meta;
      inner.appendChild(meta);
    }
    div.appendChild(inner);
    container.appendChild(div);
  }
}

/* ══════════════════════════════════════════════════════════════════════
   Anima i blocchi testo — logica pear.no con due fasi:
   1) Ingresso/loop: testo composto, visibile, leggero movimento
   2) Uscita (ultimi 10% di visibilita): scale down, blur, translate via
   ══════════════════════════════════════════════════════════════════════ */

function animateStageText(progress) {
  var blocks = document.querySelectorAll('.stage-text[data-stage-text]');
  var entranceWindow = 0.025;
  /* Il profilo che rende leggibile una battuta non e' la durata della
     finestra (allargarla farebbe sovrapporre battute vicine) ma la sua
     forma: entrata rapida, PIANORO lungo a piena opacita', uscita breve.
     Prima la rampa occupava tutta la finestra: il testo era pieno solo
     un istante prima di sparire. */
  var exitStart = 0.45;

  for (var i = 0; i < blocks.length; i++) {
    var block = blocks[i];
    var inner = block.firstElementChild;
    var at = parseFloat(block.dataset.at);

    var local = (progress - at) / entranceWindow;

    var dx = parseFloat(block.dataset.dx || 0);
    var dy = parseFloat(block.dataset.dy || 0);

    /* ── Non visibile ── */
    if (local < -1 || local > 1) {
      block.classList.remove('acceso');
      inner.style.opacity = '0';
      inner.style.transform = 'translate3d(' + dx + 'px,' + (dy - 10) + 'px,0) scale(0.96)';
      inner.style.filter = 'blur(5px)';
      continue;
    }

    /* ── Visibile: calcola entry e exit ── */
    /* piena opacita' gia' a un quarto della finestra, poi pianoro */
    var entryT = Math.max(0, Math.min(1, (local + 1) / 0.5));
    var exitT = 0;
    if (local > exitStart) {
      exitT = (local - exitStart) / (1 - exitStart);
    }

    block.classList.add('acceso');

    var entryScale = lerp(0.96, 1, entryT);
    var entryBlur = lerp(5, 0, entryT);
    var entryOpacity = entryT;

    var exitScale = lerp(1, 0.96, exitT);
    var exitBlur = lerp(0, 5, exitT);
    var exitOpacity = lerp(1, 0, exitT);
    var exitDx = dx !== 0 ? dx * exitT * 0.8 : 0;
    var exitDy = dy !== 0 ? dy * exitT * 0.8 : -10 * exitT;

    var scale = lerp(entryScale, 0.96, exitT);
    var blur = lerp(entryBlur, 5, exitT);
    var opacity = lerp(entryOpacity, 0, exitT);
    /* Deriva: per tutta la finestra di visibilita' il blocco continua a
       scivolare nella direzione da cui e' entrato e cresce di un filo,
       assecondando lo zoom che sta dentro i fotogrammi. Senza questo il
       testo resta immobile mentre il mondo si muove, e si stacca. */
    var derivaT = Math.max(0, Math.min(1, (local + 1) * 0.5));
    var derivaScala = lerp(1.0, 1.05, derivaT);
    var derivaX = dx * 0.22 * derivaT;
    var derivaY = dy * 0.22 * derivaT;

    /* respiro: un moto lentissimo, ampiezza 3px, fase diversa per blocco.
       E' cio' che distingue una scheda viva da una appiccicata. */
    var respiro = Math.sin(performance.now() / 1400 + i * 1.7) * 3;
    var tx = dx * (1 - entryT) * 0.3 + exitDx + derivaX;
    var ty = (dy - 10) * (1 - entryT) * 0.3 + exitDy + derivaY + respiro;
    scale = scale * derivaScala;

    /* L'arco si disegna con l'ingresso e si ritira con l'uscita:
       stroke-dashoffset da 1 (invisibile) a 0 (tracciato completo). */
    /* ── Rivelazione mascherata ──
       Il titolo non sfuma: viene SCOPERTO da una maschera che attraversa.
       --rivela va da 0 a 112 durante l'ingresso; oltre il 100 la maschera
       e' uscita del tutto e il testo resta pieno. */
    var titolo = block.querySelector('.stage-text__title, .stage-text__hero, .stage-text__capitolo');
    if (titolo) {
      /* corsa piu' rapida: la maschera esce di scena entro il primo 70%
         dell'ingresso, cosi' il titolo resta pieno molto prima e non
         resta mai mezza parola nascosta */
      var scoperto = Math.max(0, Math.min(1, entryT / 0.70));
      titolo.style.setProperty('--rivela', (scoperto * 112).toFixed(1) + '%');
    }

    var ellisse = block.querySelector('.stage-text__ellisse');
    if (ellisse) {
      var tracciato = Math.max(0, Math.min(1, entryT * 1.15));
      ellisse.style.strokeDashoffset = String(1 - tracciato);
      ellisse.style.opacity = String(opacity * 0.9);
    }

    inner.style.opacity = String(opacity);
    inner.style.transform = 'translate3d(' + tx + 'px,' + ty + 'px,0) scale(' + scale + ')';
    inner.style.filter = 'blur(' + blur + 'px)';
  }
}

/* ══════════════════════════════════════════════════════════════════════
   initShader — punto di ingresso
   ══════════════════════════════════════════════════════════════════════ */
/* ── HUD: contatore di fotogramma in mono + fila di pixel ──
   Decorazione moderna che da' un battito costante alla pagina, e copre
   le tenute lunghe fra uno zoom e l'altro: qualcosa si muove sempre. */
var hudEl = null, hudUltimo = -1;
function aggiornaHud(progresso) {
  var n = (framesData[0] && framesData[0].n) || 1;
  var frame = Math.max(0, Math.min(n - 1, Math.round(progresso * (n - 1))));
  if (frame === hudUltimo) return;
  hudUltimo = frame;
  if (!hudEl) {
    hudEl = document.createElement('div');
    hudEl.className = 'hud mono';
    hudEl.setAttribute('aria-hidden', 'true');
    var testo = document.createElement('span');
    testo.className = 'hud__testo';
    hudEl.appendChild(testo);
    var fila = document.createElement('span');
    fila.className = 'hud__pixel';
    for (var k = 0; k < 12; k++) fila.appendChild(document.createElement('i'));
    hudEl.appendChild(fila);
    var cur = document.createElement('span');
    cur.className = 'hud__cursore';
    cur.textContent = '▌';
    hudEl.appendChild(cur);
    document.body.appendChild(hudEl);
  }
  hudEl.firstChild.textContent = 'KAPE ' + String(frame + 1).padStart(3, '0') + ' / ' + n;
  var pieni = Math.round((frame / (n - 1)) * 12);
  var dots = hudEl.querySelector('.hud__pixel').children;
  for (var k = 0; k < 12; k++) dots[k].className = k < pieni ? 'on' : '';
}

/* Il fotogramma corrente e' chiaro? Serve a linee e inserti per
   scegliere inchiostro o calce. */
var _lumaChiaro = null;
function fotogrammaChiaro(p) {
  if (!_lumaChiaro) return false;
  var i = Math.max(0, Math.min(_lumaChiaro.length - 1, Math.round(p * (_lumaChiaro.length - 1))));
  return !!_lumaChiaro[i];
}

export function initShader() {
  var canvas = document.getElementById('gl');
  if (!canvas) return;

  stageEl = document.querySelector('.stage');
  initInserti();
  initLinee();
  fetch('/dati/luma.json').then(function (r) { return r.json(); })
    .then(function (d) { _lumaChiaro = d.chiaro; }).catch(function () {});

  var renderer = new Renderer({
    canvas: canvas,
    dpr: Math.min(window.devicePixelRatio, 2),
    alpha: false,
    antialias: false,
    preserveDrawingBuffer: true,
  });

  var gl = renderer.gl;
  gl.clearColor(0x0b / 255, 0x0a / 255, 0x09 / 255, 1);

  var geometry = new Triangle(gl);
  var program = new Program(gl, {
    vertex: VERT,
    fragment: FRAG,
    uniforms: {
      t1: { value: new Texture(gl) },
      t2: { value: new Texture(gl) },
      progress: { value: 0 },
      mode: { value: 0 },
      res: { value: [gl.canvas.width, gl.canvas.height] },
      img: { value: [1, 1] },
      zoomA: { value: 1.0 },
      zoomB: { value: 1.0 },
      panA: { value: [0, 0] },
      panB: { value: [0, 0] },
      bridgeColor: { value: BRIDGE_B_COLOR },
    },
  });

  var mesh = new Mesh(gl, { geometry: geometry, program: program });
  var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ── Precalcola limiti progresso ── */
  totalVh = 0;
  for (var i = 0; i < SCENES.length; i++) totalVh += SCENES[i].vh;
  var cum = 0;
  for (var i = 0; i < SCENES.length; i++) {
    cum += SCENES[i].vh;
    sceneEnds.push(cum / totalVh);
  }

  /* ── Riduci le transizioni per elementi piu' corti ── */
  for (var i = 0; i < SCENES.length; i++) {
    var n = framesData[i] ? framesData[i].n : 96;
    SCENES[i]._crossfadeFrames = Math.min(CROSSFADE_FRAMES, Math.floor(n * 0.12));
  }

  /* ── Carica frames.json e avvia ── */
  /* ── Punti di taglio del film ──
     Il film e' una sequenza unica, ma nei punti dove cambia la clip
     d'origine c'e' uno stacco netto. Li' facciamo lavorare lo shader:
     fotogramma prima come texture A, fotogramma dopo come B, e un
     effetto diverso per ogni taglio. */
  fetch('/dati/tagli.json')
    .then(function (r) { return r.json(); })
    .then(function (d) { TAGLI = d.tagli || []; })
    .catch(function () { TAGLI = []; });

  fetch('/dati/frames.json')
    .then(function (r) { return r.json(); })
    .then(function (data) {
      framesData = data;

      /* Carica fallback per tutti gli elementi */
      var fallbackPromises = [];
      for (var i = 0; i < SCENES.length; i++) {
        fallbackPromises.push(loadFallback(gl, i));
      }
      return Promise.all(fallbackPromises);
    })
    .then(function (fallbacks) {
      fallbackTextures = fallbacks;

      /* Il render NON aspetta il film intero: parte subito sul fallback,
         e il film (2999 frame) si carica dietro. Prima questo gate teneva
         lo schermo nero per minuti senza alcun indicatore. */
      if (fallbackTextures[0]) {
        program.uniforms.img.value = [fallbackTextures[0]._realWidth, fallbackTextures[0]._realHeight];
      }
      loadScene(gl, 0).then(function () {
        if (sceneFrames[0] && sceneFrames[0][0]) {
          program.uniforms.img.value = [sceneFrames[0][0]._realWidth, sceneFrames[0][0]._realHeight];
        }
        /* Le differenze di giunzione hanno senso solo a film completo */
        computeSeamDiffs();
      }).catch(function (e) { console.error('caricamento film:', e); });

      /* Carica copione */
      return fetch('/dati/copione.json')
        .then(function (r) { return r.json(); })
        .then(function (copione) { generateStageText(copione); })
        .catch(function () { console.warn('copione.json non trovato'); });
    })
    .then(function () {
      /* Avvia il render loop */
      requestAnimationFrame(render);
    })
    .catch(function (e) { console.error('avvio palco fallito:', e); requestAnimationFrame(render); });

  /* ══════════════════════════════════════════════════════════════════════
     Render loop
     ══════════════════════════════════════════════════════════════════════ */
  function render() {
    requestAnimationFrame(render);

    if (reducedMotion) {
      renderer.render({ scene: mesh });
      return;
    }

    var now = performance.now();
    var dt = (now - lastFrameTime) / 1000;
    lastFrameTime = now;

    computeStageProgress();
    bersaglio = stageProgress;
    var k = 1 - Math.pow(1 - 0.075, dt * 60);
    attuale += (bersaglio - attuale) * k;

    /* ── Trova scena corrente e progresso locale ── */
    var scene = findScene(attuale);

    /* ── Gestione memoria ── */
    manageSceneMemory(gl, scene.idx);

    /* ── Seleziona frame e transizione ── */
    var sel = selectFrames(scene.idx, scene.local);

    /* ── Zoom e pan ── */
    var zoomAVal, panAX, panAY;
    var zoomBVal, panBX, panBY;

    if (sel.inTransition && sel._directCut) {
      /* Taglio diretto: B assesta esattamente come A — nessun salto zoom/pan */
      zoomAVal = SCENES[scene.idx].zoom;
      panAX = SCENES[scene.idx].pan[0];
      panAY = SCENES[scene.idx].pan[1];
      zoomBVal = zoomAVal;
      panBX = panAX;
      panBY = panAY;
    } else if (sel.inTransition) {
      /* A: estrapola oltre localProgress=1 — overshoot */
      var tPct = (transitionType(scene.idx) === 'bridgeA' || transitionType(scene.idx) === 'bridgeB')
        ? BRIDGE_TRANSITION_PCT : TRANSITION_PCT;
      var overShoot = 1 + sel.transProgress * tPct;
      zoomAVal = lerp(SCENES[scene.idx].zoomStart, SCENES[scene.idx].zoom, overShoot);
      panAX = lerp(SCENES[scene.idx].panStart[0], SCENES[scene.idx].pan[0], overShoot);
      panAY = lerp(SCENES[scene.idx].panStart[1], SCENES[scene.idx].pan[1], overShoot);

      var nxt = SCENES[scene.idx + 1];
      var isBridge = transitionType(scene.idx) === 'bridgeA' || transitionType(scene.idx) === 'bridgeB';
      if (isBridge) {
        /* Il ponte dissolve through colore: B parte dal primo zoom della scena entrante */
        zoomBVal = nxt.zoomStart;
        panBX = nxt.panStart[0];
        panBY = nxt.panStart[1];
      } else {
        /* Dissolvenza incrociata: B parte con leggero zoom d'ingresso 1.06→1.00 */
        zoomBVal = lerp(1.06, 1.00, sel.transProgress);
        panBX = lerp(nxt.panStart[0], nxt.pan[0], sel.transProgress);
        panBY = lerp(nxt.panStart[1], nxt.pan[1], sel.transProgress);
      }
    } else if (scene.idx === TEMPLE.idx) {
      /* Scena tempio: zoom/pan dal calcolo speciale */
      var tc = templeCamera(scene.local, scene.idx);
      zoomAVal = tc.zoom;
      panAX = tc.panX;
      panAY = tc.panY;
      zoomBVal = zoomAVal;
      panBX = panAX;
      panBY = panAY;
    } else {
      zoomAVal = lerp(SCENES[scene.idx].zoomStart, SCENES[scene.idx].zoom, scene.local);
      panAX = lerp(SCENES[scene.idx].panStart[0], SCENES[scene.idx].pan[0], scene.local);
      panAY = lerp(SCENES[scene.idx].panStart[1], SCENES[scene.idx].pan[1], scene.local);
      zoomBVal = zoomAVal;
      panBX = panAX;
      panBY = panAY;
    }

    /* ── Clamp zoom e pan ── */
    zoomAVal = Math.max(zoomAVal, 1.0);
    zoomBVal = Math.max(zoomBVal, 1.0);
    var maxPanA = Math.max(0, (1 - 1 / zoomAVal) * 0.5 - 0.002);
    var maxPanB = Math.max(0, (1 - 1 / zoomBVal) * 0.5 - 0.002);
    panAX = Math.max(-maxPanA, Math.min(maxPanA, panAX));
    panAY = Math.max(-maxPanA, Math.min(maxPanA, panAY));
    panBX = Math.max(-maxPanB, Math.min(maxPanB, panBX));
    panBY = Math.max(-maxPanB, Math.min(maxPanB, panBY));

    /* ── Assegna uniform ── */
    program.uniforms.zoomA.value = zoomAVal;
    program.uniforms.zoomB.value = zoomBVal;
    program.uniforms.panA.value = [panAX, panAY];
    program.uniforms.panB.value = [panBX, panBY];
    /* ── Stacco sul taglio del film ──
       Il film e' continuo, ma dove cambia la clip d'origine c'e' un salto
       secco. In una finestra stretta attorno a quel punto mostriamo
       insieme il fotogramma prima e quello dopo, e li facciamo scambiare
       da uno degli effetti (iride, veneziana, serranda, pixel, sfalsata…).
       Fuori dalla finestra il disegno resta a una texture sola. */
    var taglio = null, tProg = 0;
    for (var ti = 0; ti < TAGLI.length; ti++) {
      /* ogni stacco puo' avere la sua durata: la rivelazione dopo la
         schermata monocolore e' molto piu' lenta delle altre */
      var wTaglio = TAGLI[ti].w || FINESTRA_TAGLIO;
      var d = (attuale - TAGLI[ti].at) / wTaglio;
      if (d >= -1 && d <= 1) { taglio = TAGLI[ti]; tProg = (d + 1) * 0.5; break; }
    }

    if (taglio) {
      program.uniforms.progress.value = tProg;
      program.uniforms.mode.value = taglio.modo;
      /* Il colore della tendina: ogni stacco porta il suo, campionato dai
         fotogrammi che collega. Senza questo tutte le tende sarebbero
         dello stesso colore, e la tinta non direbbe piu' niente. */
      if (taglio.col) program.uniforms.bridgeColor.value = taglio.col;
    } else {
      program.uniforms.progress.value = sel.inTransition
        ? (sel._blendProgress !== undefined ? sel._blendProgress : sel.transProgress)
        : 0;
      program.uniforms.mode.value = sel.shaderMode >= 0 ? sel.shaderMode : 0;
    }

    /* ── Assegna colore ponte se necessario ── */
    if (sel._bridgeColor) {
      program.uniforms.bridgeColor.value = sel._bridgeColor;
    }

    /* ── Assegna texture A e B ── */
    var frameAEffective = effectiveFrame(scene.idx, sel.frameA);
    var texA = getFrameTex(scene.idx, frameAEffective);
    if (texA) {
      program.uniforms.t1.value = texA;
      program.uniforms.img.value = [texA._realWidth, texA._realHeight];
    }

    if (taglio) {
      /* A = ultimo fotogramma prima del taglio, B = primo dopo:
         li scelgo dal manifesto, non dalla scena (che qui e' una sola). */
      var nTot = (framesData[0] && framesData[0].n) || 1;
      var iTaglio = Math.round(taglio.at * (nTot - 1));
      var tA = getFrameTex(0, Math.max(0, iTaglio - 1));
      var tB = getFrameTex(0, Math.min(nTot - 1, iTaglio));
      if (tA) { program.uniforms.t1.value = tA; program.uniforms.img.value = [tA._realWidth, tA._realHeight]; }
      if (tB) { program.uniforms.t2.value = tB; }
    } else if (sel.inTransition) {
      var frameBRaw = sel.frameB !== undefined ? sel.frameB : 0;
      var frameBEff = effectiveFrame(scene.idx + 1, frameBRaw);
      var texB = getFrameTex(scene.idx + 1, frameBEff);
      if (texB) {
        program.uniforms.t2.value = texB;
      }
    }

    renderer.render({ scene: mesh });
    animateStageText(bersaglio);
    aggiornaHud(attuale);
    aggiornaInserti(attuale);
    aggiornaLinee(attuale, performance.now(), fotogrammaChiaro(attuale));
  }

  renderer.setSize(window.innerWidth, window.innerHeight);
  program.uniforms.res.value = [gl.canvas.width, gl.canvas.height];

  var resizeTimer = null;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      renderer.setSize(window.innerWidth, window.innerHeight);
      program.uniforms.res.value = [gl.canvas.width, gl.canvas.height];
    }, 150);
  });
}
