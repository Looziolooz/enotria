/**
 * choreo.js — Declarative choreography per gli atti DOM (produttori, chiusa).
 *
 * Vocabolario negli attributi data-*, letto da IntersectionObserver.
 * Zero librerie di timeline. Replica il metodo di pear.no.
 *
 * NOTA: gli elementi dentro .stage-copy sono animati dal render loop
 * in shader-setup.js (progresso del palco), non da questo modulo.
 */

var STAGGER_MS = 90;

/**
 * splitText ricorsivo: preserva <br/>, <em> e ogni altro tag inline.
 * Cammina su childNodes: nodo testo → spezza in <span class="split-letter">,
 * nodo elemento → conserva com'è e scende dentro.
 */
function splitText(el) {
  el.setAttribute('aria-label', el.textContent);
  _splitChildren(el);
}

function _splitChildren(parent) {
  var nodes = Array.from(parent.childNodes);
  parent.textContent = '';
  for (var i = 0; i < nodes.length; i++) {
    var node = nodes[i];
    if (node.nodeType === Node.TEXT_NODE) {
      /* Le lettere vanno raggruppate PER PAROLA. Ogni lettera e' uno span
         inline-block e il browser puo' andare a capo fra due span qualsiasi:
         senza il gruppo-parola la chiusa si spezzava in "esse / re". */
      var text = node.textContent;
      var parole = text.split(/(\s+)/);
      for (var w = 0; w < parole.length; w++) {
        var pezzo = parole[w];
        if (pezzo === '') continue;
        if (/^\s+$/.test(pezzo)) {
          parent.appendChild(document.createTextNode(' '));
          continue;
        }
        var gruppo = document.createElement('span');
        gruppo.className = 'parola';
        for (var j = 0; j < pezzo.length; j++) {
          var span = document.createElement('span');
          span.className = 'split-letter';
          span.textContent = pezzo[j];
          gruppo.appendChild(span);
        }
        parent.appendChild(gruppo);
      }
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      var clone = node.cloneNode(false);
      parent.appendChild(clone);
      _splitChildren(clone);
    }
  }
}

function handleExit(el) {
  var dir = el.dataset.out;
  if (!dir) return;
  el.classList.add('exit');
  setTimeout(function () {
    el.classList.remove('exit');
    el.classList.remove('on');
  }, 900);
}

/**
 * IntersectionObserver: anima gli atti DOM (produttori, chiusa)
 * quando entrano nel viewport. Gli .stage-copy sono gestiti
 * separatamente dal render loop di shader-setup.js.
 */
function onSectionEnter(entries) {
  for (var i = 0; i < entries.length; i++) {
    var entry = entries[i];
    if (!entry.isIntersecting) continue;
    var act = entry.target;

    /* Ignora .stage-copy: animato dal render loop del palco */
    if (act.closest && act.closest('.stage-copy')) continue;

    var beats = act.querySelectorAll('[data-beat]');
    var sorted = Array.from(beats).sort(function (a, b) {
      return parseFloat(a.dataset.at) - parseFloat(b.dataset.at);
    });
    for (var j = 0; j < sorted.length; j++) {
      (function (el, delay) {
        setTimeout(function () {
          el.classList.add('on');
        }, delay);
      })(sorted[j], j * STAGGER_MS);
    }
  }
}

function onSectionExit(entries) {
  for (var i = 0; i < entries.length; i++) {
    var entry = entries[i];
    if (entry.isIntersecting) continue;

    /* Ignora .stage-copy */
    if (entry.target.closest && entry.target.closest('.stage-copy')) continue;

    var beats = entry.target.querySelectorAll('[data-beat].on');
    for (var j = 0; j < beats.length; j++) {
      handleExit(beats[j]);
    }
  }
}

export function initChoreo() {
  /* Split testo per [data-c] (titoli produttori, chiusa) */
  document.querySelectorAll('[data-c]').forEach(splitText);

  var enterObserver = new IntersectionObserver(onSectionEnter, {
    threshold: 0.15,
  });

  var exitObserver = new IntersectionObserver(onSectionExit, {
    threshold: 0.05,
  });

  /* Osserva solo gli atti DOM (produttori, chiusa) */
  var acts = document.querySelectorAll('.act');
  for (var i = 0; i < acts.length; i++) {
    enterObserver.observe(acts[i]);
    exitObserver.observe(acts[i]);
  }

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    document.querySelectorAll('[data-beat]').forEach(function (el) {
      el.classList.add('on');
    });
  }
}
