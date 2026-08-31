/**
 * capitoli.js — i quadri dei capitoli sono video, e partono al passaggio
 * del cursore.
 *
 * Regole:
 *  - il file NON si scarica finche' non serve (`preload="none"`, sorgente
 *    messa alla prima interazione): la pagina resta leggera come prima;
 *  - il poster e' il primo fotogramma del video, quindi da fermo il quadro
 *    e' identico all'immagine che c'era;
 *  - uscendo col cursore il video torna al primo fotogramma: il capitolo
 *    resta un quadro, non un video in loop che distrae mentre si legge;
 *  - dove il cursore non esiste (telefono, tavoletta) il video parte da
 *    solo quando il quadro entra in vista e si ferma quando esce;
 *  - con `prefers-reduced-motion` non parte mai: resta il poster.
 */

var PUNTATORE_FINE = typeof window !== 'undefined' &&
  window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches;
var MOTO_RIDOTTO = typeof window !== 'undefined' &&
  window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function sorgente(video) {
  if (video.dataset.src && !video.src) {
    video.src = video.dataset.src;
  }
}

function avvia(video) {
  if (MOTO_RIDOTTO) return;
  sorgente(video);
  var p = video.play();
  if (p && p.catch) p.catch(function () { /* autoplay negato: resta il poster */ });
  video.parentElement.classList.add('in-moto');
}

function ferma(video, azzera) {
  video.pause();
  if (azzera) { try { video.currentTime = 0; } catch (e) { /* non ancora pronto */ } }
  video.parentElement.classList.remove('in-moto');
}

export function initCapitoli() {
  var video = document.querySelectorAll('.cap__fig video[data-src]');
  if (!video.length) return;

  if (PUNTATORE_FINE) {
    for (var i = 0; i < video.length; i++) {
      (function (v) {
        var fig = v.parentElement;
        fig.addEventListener('mouseenter', function () { avvia(v); });
        fig.addEventListener('mouseleave', function () { ferma(v, true); });
        /* da tastiera: il quadro e' raggiungibile e risponde allo stesso modo */
        fig.tabIndex = 0;
        fig.addEventListener('focus', function () { avvia(v); });
        fig.addEventListener('blur', function () { ferma(v, true); });
      })(video[i]);
    }
    return;
  }

  /* Senza cursore: il quadro si anima quando lo si guarda */
  if (!('IntersectionObserver' in window)) return;
  var osservatore = new IntersectionObserver(function (voci) {
    for (var j = 0; j < voci.length; j++) {
      var v = voci[j].target;
      if (voci[j].isIntersecting) avvia(v); else ferma(v, false);
    }
  }, { threshold: 0.55 });
  for (var k = 0; k < video.length; k++) osservatore.observe(video[k]);
}
