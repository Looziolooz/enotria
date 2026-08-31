
/* Carattere delle schede, scelto dall'indirizzo: ?schede=nudo | lastra
   Serve a confrontarli sullo stesso fotogramma invece che a memoria. */
(function () {
  var q = new URLSearchParams(location.search).get('schede') || 'nudo';
  if (q === 'nudo' || q === 'lastra') document.documentElement.classList.add('schede-' + q);
})();
/**
 * main.js — Entry point. Inizializza coreografia + OGL shader + produttori.
 *
 * Stack: Vite + Tailwind v4 + OGL (npm).
 * Nessun GSAP, nessun Lenis, nessun Three.js.
 */

import { initChoreo } from './choreo.js';
import { initShader } from './shader-setup.js';
import { initCartina } from './cartina.js';
import { initCapitoli } from './capitoli.js';
import { initAscii } from './ascii.js';

/* ── Render schede produttori da dati/produttori.json ── */
async function renderProduttori() {
  var grid = document.getElementById('produttori-grid');
  if (!grid) return;

  try {
    var res = await fetch('/dati/produttori.json');
    var produttori = await res.json();

    for (var i = 0; i < produttori.length; i++) {
      var p = produttori[i];
      var card = document.createElement('div');
      card.className = 'produttore-card';
      card.setAttribute('data-beat', String(i + 2));
      card.setAttribute('data-at', String(0.22 + i * 0.10));

      var uveHtml = p.uve.map(function (u) {
        return '<span class="produttore-card__uva">' + u + '</span>';
      }).join('');

      var linkHtml = p.sito
        ? '<a href="' + p.sito + '" target="_blank" rel="noopener noreferrer">Il loro sito &nearr;</a>'
        : '<a href="#" aria-disabled="true">Il loro sito &nearr;</a>';

      card.innerHTML =
        '<p class="produttore-card__n mono" aria-hidden="true">ΟΙ·' + String(i + 1).padStart(2, '0') + '</p>' +
        '<p class="produttore-card__nome">' + p.nome + '</p>' +
        '<p class="produttore-card__meta">' + p.comune + ' · ' + p.denominazione + '</p>' +
        '<p class="produttore-card__riga">' + p.riga + '</p>' +
        '<div class="produttore-card__uve">' + uveHtml + '</div>' +
        '<p class="produttore-card__link">' + linkHtml + '</p>';

      grid.appendChild(card);
    }
  } catch (e) {
    console.error('Errore caricamento produttori:', e);
  }
}

/* ── Boot ── */
document.addEventListener('DOMContentLoaded', function () {
  initChoreo();
  initShader();
  renderProduttori();
  initCartina();
  initCapitoli();
  setTimeout(initAscii, 400);   /* dopo che lo shader ha creato la HUD */
});
