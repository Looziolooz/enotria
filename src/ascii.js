/**
 * ascii.js — lo strumento che legge il dipinto.
 *
 * Il sito ha due registri: la pittura antica e lo strumento moderno che la
 * misura (il contatore KAPE, i nomi greci, la barra a trattini). Questo e'
 * l'ultimo pezzo di quello strumento: il fotogramma corrente, riletto come
 * caratteri, accanto al contatore. La stessa immagine, vista dal lato
 * della macchina.
 *
 * Compare solo mentre il film scorre e svanisce appena ci si ferma: e' una
 * lettura, non una decorazione.
 *
 * Niente WebGL: il fotogramma e' gia' un'immagine caricata (la texture
 * tiene il suo `image`), quindi si disegna in un canvas 2D minuscolo e si
 * legge da li'. Nessun readPixels, nessuno stallo della GPU.
 */

/* Dal piu' scuro al piu' chiaro. La rampa e' corta apposta: con troppi
   livelli il blocco diventa rumore, con pochi resta leggibile. */
var RAMPA = ' .:-=+*#%@';
var COL = 26;
var RIG = 13;

var el = null;
var pittura = null;   /* canvas 2D di servizio */
var ctx = null;
var ultimo = -1;

export function initAscii() {
  if (typeof document === 'undefined') return;
  var hud = document.querySelector('.hud');
  if (!hud) return;
  el = document.createElement('pre');
  el.className = 'hud__ascii';
  el.setAttribute('aria-hidden', 'true');
  hud.appendChild(el);

  pittura = document.createElement('canvas');
  pittura.width = COL;
  pittura.height = RIG;
  ctx = pittura.getContext('2d', { willReadFrequently: true });
}

/**
 * @param {HTMLImageElement} immagine  il fotogramma mostrato ora
 * @param {number} indice             quale fotogramma e' (per non rifare il lavoro)
 * @param {number} velocita           0 fermo, 1 scrub veloce
 */
export function aggiornaAscii(immagine, indice, velocita) {
  if (!el || !ctx) return;

  /* si accende solo mentre il film si muove */
  el.style.opacity = velocita > 0.06 ? String(Math.min(0.5, velocita * 1.6)) : '0';
  if (velocita <= 0.06) return;

  /* un fotogramma su otto: la lettura non deve costare quanto il film */
  if (indice === ultimo || (indice % 8) !== 0) return;
  ultimo = indice;
  if (!immagine || !immagine.naturalWidth) return;

  try {
    ctx.drawImage(immagine, 0, 0, COL, RIG);
  } catch (e) { return; }   /* immagine non ancora decodificata */

  var d = ctx.getImageData(0, 0, COL, RIG).data;
  var righe = [];
  for (var y = 0; y < RIG; y++) {
    var riga = '';
    for (var x = 0; x < COL; x++) {
      var i = (y * COL + x) * 4;
      /* luminanza Rec.709, la stessa formula del lift() nello shader */
      var l = (0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]) / 255;
      riga += RAMPA.charAt(Math.min(RAMPA.length - 1, Math.round(l * (RAMPA.length - 1))));
    }
    righe.push(riga);
  }
  el.textContent = righe.join('\n');
}
