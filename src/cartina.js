/**
 * cartina.js — la Calabria vinicola come disegno a tratto.
 *
 * I tracciati (contorno, province) e le posizioni dei perni DOC sono DERIVATI
 * dai confini reali ISTAT (openpolis/geojson-italy, CC-BY-4.0), proiettati e
 * semplificati da `lab/genera-cartina.mjs`. Per rigenerarli:
 *   node lab/genera-cartina.mjs
 * Non ridisegnare a mano: la resa resta a tratto, la geometria e' quella vera.
 *
 * Nessuna libreria: un solo export `initCartina()`, chiamato da main.js
 * dopo renderProduttori(). Tutta l'interazione e' addEventListener diretto,
 * come in inserti.js. Solo testo e SVG a tratto: niente loghi, niente foto.
 */

var NS = 'http://www.w3.org/2000/svg';

/* ——— Il profilo: il contorno reale della regione, semplificato (131 punti).
   viewBox 0 0 400 620, nord in alto, proiezione equirettangolare. ——— */
var CONTORNO =
  'M112 198 L102 183 L92 177 L84 147 L81 144 L75 109 L71 105 L76 98 L69 82 L72 73 L81 62 L87 61 ' +
  'L91 66 L95 64 L97 67 L103 62 L113 67 L121 64 L124 67 L118 74 L120 82 L125 85 L127 90 L137 87 ' +
  'L144 88 L148 83 L160 89 L160 81 L170 79 L180 81 L187 89 L188 83 L184 79 L196 58 L195 51 L199 42 ' +
  'L198 32 L201 26 L204 29 L220 30 L222 33 L233 29 L241 30 L245 33 L237 42 L236 53 L241 73 L224 96 ' +
  'L214 115 L215 126 L222 133 L220 147 L240 159 L270 159 L289 180 L308 191 L319 194 L324 204 ' +
  'L331 210 L346 215 L337 239 L336 254 L344 265 L337 290 L338 294 L342 296 L341 301 L344 306 ' +
  'L356 310 L348 318 L349 329 L334 345 L332 340 L324 338 L320 342 L312 334 L306 334 L274 343 ' +
  'L239 364 L223 391 L228 399 L232 445 L233 457 L229 466 L210 486 L180 499 L150 538 L146 565 ' +
  'L140 579 L130 592 L116 594 L101 591 L70 594 L53 584 L45 571 L45 568 L49 562 L44 547 L49 538 ' +
  'L45 525 L44 516 L45 514 L56 509 L67 507 L76 501 L82 492 L84 482 L89 475 L93 465 L99 459 ' +
  'L100 452 L103 433 L83 415 L85 408 L92 401 L107 396 L114 388 L125 387 L138 391 L145 389 ' +
  'L154 380 L161 359 L160 337 L148 330 L137 310 L130 282 L127 242 L117 208 Z';

/* ——— Le 9 zone DOC. Dati verificati, da fonte enologica nota. ——— */
var ZONE = [
  { id: 'ciro', nome: 'Cirò', provincia: 'crotone', tipo: 'DOC',
    comuni: 'Cirò, Cirò Marina, Crucoli, Melissa (KR)',
    vitigni: ['Gaglioppo', 'Greco Bianco'],
    nota: 'La zona classica, sulla costa ionica dove sorgeva Krimisa. Il rosso è Gaglioppo; il bianco, Greco.' },
  { id: 'melissa', nome: 'Melissa', provincia: 'crotone', tipo: 'DOC',
    comuni: 'Melissa e comuni del crotonese',
    vitigni: ['Gaglioppo', 'Greco Bianco'],
    nota: 'Confina con il Cirò e ne condivide le uve: colline d’argilla che scendono verso lo Ionio.' },
  { id: 'santanna', nome: 'S. Anna di Isola Capo Rizzuto', breve: 'S. Anna', provincia: 'crotone', tipo: 'DOC',
    comuni: 'Isola di Capo Rizzuto, Crotone (KR)',
    vitigni: ['Gaglioppo', 'Nerello'],
    nota: 'Il promontorio a sud di Capo Colonna, dove il tempio di Hera guardava le rotte del vino.' },
  { id: 'bivongi', nome: 'Bivongi', provincia: 'reggio-calabria', tipo: 'DOC',
    comuni: 'Bivongi, Stilo e la vallata dello Stilaro (RC)',
    vitigni: ['Gaglioppo', 'Greco Nero'],
    nota: 'Fra le Serre e il mare, la valle bizantina dello Stilaro: vigne di collina su terre minerali.' },
  { id: 'greco', nome: 'Greco di Bianco', provincia: 'reggio-calabria', tipo: 'DOC',
    comuni: 'Bianco, Casignana (RC)',
    vitigni: ['Greco Bianco'],
    nota: 'Un passito da uve stese al sole, fra i più antichi d’Italia: il gesto greco rimasto intatto.' },
  { id: 'lamezia', nome: 'Lamezia', provincia: 'catanzaro', tipo: 'DOC',
    comuni: 'La piana lametina (CZ)',
    vitigni: ['Nerello Calabrese', 'Gaglioppo', 'Greco Nero'],
    nota: 'La piana sul Tirreno, all’istmo più stretto d’Italia: qui il vino guardava a occidente.' },
  { id: 'savuto', nome: 'Savuto', provincia: 'cosenza', tipo: 'DOC',
    comuni: 'La valle del Savuto (CS/CZ)',
    vitigni: ['Gaglioppo', 'Magliocco'],
    nota: 'Vigne ripide lungo il fiume: il vino che i Romani chiamavano Sabutum.' },
  { id: 'scavigna', nome: 'Scavigna', provincia: 'catanzaro', tipo: 'DOC',
    comuni: 'Nocera Terinese, Falerna (CZ)',
    vitigni: ['Magliocco', 'Gaglioppo'],
    nota: 'Piccola denominazione di collina fra Savuto e mare, terrazze strette e rese basse.' },
  { id: 'cosenza', nome: 'Terre di Cosenza', provincia: 'cosenza', tipo: 'DOC',
    comuni: 'Il cosentino, dal Pollino alla Sila',
    vitigni: ['Magliocco', 'Pecorello', 'Guarnaccia'],
    nota: 'La DOC più estesa: qui regna il Magliocco, e a Saracena si tramanda il Moscato al governo.' },
];

/* Perno di ogni zona = proiezione delle coordinate reali del comune/area di
   riferimento (vedi lab/genera-cartina.mjs). `sin` guida l'etichetta a
   sinistra quando il punto sta sul bordo destro, perche' non esca dal riquadro. */
var PUNTO = {
  ciro:     { x: 341, y: 224, sin: true },
  melissa:  { x: 336, y: 239, sin: true },
  santanna: { x: 334, y: 328, sin: true },
  bivongi:  { x: 207, y: 450 },
  greco:    { x: 146, y: 551 },
  lamezia:  { x: 179, y: 328 },
  savuto:   { x: 181, y: 272 },
  scavigna: { x: 150, y: 308, sin: true },
  cosenza:  { x: 167, y: 242 },
};

/* ——— Le 5 province: confini reali ISTAT, semplificati.
   Ogni gruppo ha una macchia di colore, un'etichetta mono, i suoi punti. ——— */
var PROVINCE = [
  {
    id: 'cosenza', nome: 'COSENZA', accento: 'terra',
    regione: 'M112 198 L102 183 L92 177 L84 147 L81 144 L75 109 L71 105 L76 98 L69 82 L72 73 ' +
      'L81 62 L87 61 L91 66 L95 64 L97 67 L103 62 L113 67 L121 64 L124 67 L118 74 L120 82 ' +
      'L125 85 L127 90 L137 87 L144 88 L148 83 L160 89 L160 81 L170 79 L180 81 L187 89 L188 83 ' +
      'L184 79 L196 58 L195 51 L199 42 L198 32 L201 26 L204 29 L220 30 L222 33 L233 29 L241 30 ' +
      'L245 33 L237 42 L236 53 L241 73 L224 96 L214 115 L215 126 L222 133 L220 147 L240 159 ' +
      'L270 159 L289 180 L306 191 L320 195 L307 206 L306 217 L296 212 L298 220 L291 222 L289 227 ' +
      'L284 228 L283 231 L274 228 L270 229 L268 225 L262 225 L262 228 L257 227 L257 235 L268 243 ' +
      'L265 255 L271 268 L255 268 L252 265 L242 267 L236 269 L233 274 L224 280 L221 276 L217 277 ' +
      'L216 282 L212 287 L219 290 L212 290 L213 303 L210 305 L205 300 L201 302 L195 291 L189 293 ' +
      'L185 290 L176 292 L168 289 L163 294 L159 291 L160 297 L146 305 L142 303 L136 305 L130 282 ' +
      'L127 242 L117 208 Z',
    label: [176, 150],
  },
  {
    id: 'crotone', nome: 'CROTONE', accento: 'terra',
    regione: 'M270 268 L265 255 L268 243 L257 235 L257 227 L262 228 L262 225 L268 225 L270 229 ' +
      'L274 228 L283 231 L284 228 L289 227 L291 222 L298 220 L296 212 L306 217 L307 206 L320 195 ' +
      'L324 204 L331 210 L346 215 L337 239 L336 254 L344 265 L337 290 L338 294 L342 296 L341 301 ' +
      'L344 306 L356 310 L348 318 L349 329 L334 345 L333 341 L327 339 L322 339 L320 342 L312 334 ' +
      'L294 336 L299 330 L294 324 L294 317 L279 305 L268 301 L262 303 L244 284 L252 283 L250 278 ' +
      'L242 276 L239 268 L252 265 L255 268 Z',
    label: [300, 288],
  },
  {
    id: 'catanzaro', nome: 'CATANZARO', accento: 'ionio',
    regione: 'M202 429 L203 424 L200 421 L193 419 L190 417 L192 414 L182 409 L186 405 L182 400 ' +
      'L186 392 L184 389 L191 383 L188 371 L181 369 L174 363 L168 364 L171 365 L172 371 L167 367 ' +
      'L159 366 L160 337 L148 330 L137 310 L136 305 L142 303 L146 305 L160 297 L159 291 L163 294 ' +
      'L168 289 L176 292 L185 290 L189 293 L195 291 L201 302 L205 300 L210 305 L213 303 L212 290 ' +
      'L219 290 L212 287 L216 282 L217 277 L221 276 L224 280 L239 268 L242 276 L250 278 L252 284 ' +
      'L244 284 L252 294 L256 295 L262 303 L268 301 L284 307 L294 317 L294 324 L299 330 L294 336 ' +
      'L272 344 L241 362 L230 377 L230 380 L223 392 L228 399 L232 453 L226 452 L224 454 L207 442 ' +
      'L198 442 L198 439 L201 440 L204 435 L200 431 Z',
    label: [238, 350],
  },
  {
    id: 'vibo-valentia', nome: 'VIBO VALENTIA', accento: 'terra',
    regione: 'M165 447 L163 445 L155 446 L144 436 L137 435 L133 429 L118 441 L109 439 L107 442 ' +
      'L101 443 L103 433 L83 415 L85 408 L92 401 L107 396 L114 388 L124 387 L137 391 L143 390 ' +
      'L154 381 L159 366 L167 367 L172 371 L171 365 L168 364 L176 363 L181 369 L188 371 L191 383 ' +
      'L184 389 L186 392 L182 400 L186 405 L182 409 L190 413 L191 418 L198 420 L203 425 L200 431 ' +
      'L194 426 L189 430 L186 436 L187 445 L194 451 L195 459 L187 463 L177 463 L170 459 L170 454 Z',
    label: [138, 414],
  },
  {
    id: 'reggio-calabria', nome: 'REGGIO CALABRIA', accento: 'ionio',
    regione: 'M147 558 L140 578 L130 592 L116 594 L101 591 L72 594 L64 592 L53 584 L45 571 ' +
      'L45 568 L49 562 L44 549 L49 538 L45 525 L45 514 L68 507 L79 498 L93 465 L99 459 L100 452 ' +
      'L101 443 L107 442 L108 439 L118 441 L133 429 L137 435 L144 436 L155 446 L163 445 L168 450 ' +
      'L170 459 L177 463 L187 463 L195 459 L194 451 L188 446 L186 440 L189 430 L195 426 L204 435 ' +
      'L198 442 L207 442 L224 454 L226 452 L232 453 L231 462 L210 486 L180 499 L150 538 Z',
    label: [131, 505],
  },
];

var NOME_PROVINCIA = {
  cosenza: 'Cosenza',
  crotone: 'Crotone',
  catanzaro: 'Catanzaro',
  'vibo-valentia': 'Vibo Valentia',
  'reggio-calabria': 'Reggio Calabria',
};

var IGT = 'Calabria · Val di Neto · Lipuda · Locride · Palizzi · Pellaro · Scilla · Costa Viola · Arghillà';
var AUTOCTONI = 'Gaglioppo · Magliocco Canino · Magliocco Dolce · Greco Bianco · Mantonico · Pecorello · Greco Nero · Nerello Calabrese · Guarnaccia · Castiglione · Prunesta · Moscatello di Saracena';

/* ——— Directory leggera: solo nome + area, dal materiale del committente.
   Trascritta, deduplicata fra le due fonti, divisa per provincia. ——— */
var ALTRE_CANTINE = {
  cosenza: ['Cantine Viola', 'Feudo dei Sanseverino', 'Masseria Falvo 1727', 'Casa Vinicola Gialdino',
    'Davide Morrone', 'Terre di Balbia', 'La Peschiera', 'Tenute Mirabelli', 'Serracavallo', 'Chimento',
    'Antiche Vigne', 'Colacino Wines', 'Az. Agr. Dell’Aquila', 'Az. Agr. Granata',
    'Az. Agr. Grutteria Niccolò', 'Az. Agr. Le Conche', 'Az. Agr. Monte Re 1958', 'Az. Agr. Nesci',
    'Az. Agr. Pacelli Francesco', 'Az. Vitivinicola Stoli', 'Antichi Vigneti Sculco', 'Akroneo',
    'Feudo della Sagitta', 'Kalabrian Wine', 'La Collinetta di Nicola Merenda',
    'Librandi Antonio & Nicodemo', 'Maddalona del Casato', 'Magna Graecia Vini', 'Poderi Marini',
    'Prebenda', 'Rocca Brettia - Kairos 45', 'Serragiumenta', 'Spadafora 1915', 'Tenuta Corno Valano',
    'Tenuta del Castello', 'Tenuta del Travale', 'Tenuta Renda', 'Tenuta Santa Venere', 'Vigneti Vumbaca'],
  catanzaro: ['Odoardi', 'Lento', 'Nicotera Severisio', 'Statti', 'Dell’Aera', 'Cantina Campana',
    'Cantine Benvenuto', 'Giraldi & Giraldi', 'Soc. Agr. Zito', 'Stamati Viticoltori',
    'Tenuta Sposato', 'Tenute Ferrari'],
  crotone: ['Cantine Greco', 'Fezzigna Vini', 'Cantine Bruni', 'Cantine de Luca', 'Garrubba',
    'Tenuta Leonetti', 'Cantina Val di Neto', 'Ceraudo', 'La Pizzuta del Principe', 'Russo & Longo',
    'Marrelli Wines', 'Brigante Vigneti & Cantina', '’A Vita', 'Barone Macrì', 'Cantina Salvatore Caparra',
    'Cantina dell’Acquila', 'Cantine de Mare', 'Cantine Vulcano', 'Casa Vinicola Lucà',
    'Cataldo Calabretta', 'Cote di Franze', 'Du Cropio Winery', 'Montescudiero', 'Scala', 'Sergio Arcuri',
    'Tenuta del Conte', 'Biagio Diana', 'Fattorie Greco (Igreco)', 'Campoverde', 'Esposito Vini',
    'Serracavallo', 'Tenuta Santoro', 'Terre di Vita'],
  'vibo-valentia': ['Casa Comerci', 'Tramontana Vini'],
  'reggio-calabria': ['Criserà', 'Battaglia Vini Tramontana', 'Consolato Malaspina', 'Cantina Visalli',
    'Nino Altomonte', 'Santino Lucà', 'Vigne del Greco di Bianco', 'Baroni Gr Macrì',
    'Cantine Lavorata', 'Feudo Gagliardi'],
};

function crea(tag, attrs) {
  var el = document.createElementNS(NS, tag);
  for (var k in attrs) el.setAttribute(k, attrs[k]);
  return el;
}

/* —— Prende un elemento (o torna undefined) — */
function trovato(id) { return document.getElementById(id); }

var contenitore = null;   /* .cartina__mappa */
var pannello = null;      /* #cartina-scheda */
var punti = {};           /* id zona -> <g> */
var gruppi = {};          /* id provincia -> <g> */

function schedaZona(z) {
  var chip = z.vitigni.map(function (v) {
    return '<span class="cartina__vitigno">' + v + '</span>';
  }).join('');
  return (
    '<p class="mono cartina__scheda-tipo">' + z.tipo + ' · ' + NOME_PROVINCIA[z.provincia] + '</p>' +
    '<h3 class="cartina__scheda-nome">' + z.nome + '</h3>' +
    '<p class="cartina__scheda-comuni">' + z.comuni + '</p>' +
    '<div class="cartina__scheda-vitigni">' + chip + '</div>' +
    '<p class="cartina__scheda-nota">' + z.nota + '</p>'
  );
}

function schedaProvincia(pid) {
  var cantine = ALTRE_CANTINE[pid] || [];
  var items = cantine.map(function (n) { return '<li>' + n + '</li>'; }).join('');
  return (
    '<h3 class="cartina__scheda-nome">' + NOME_PROVINCIA[pid] + '</h3>' +
    '<p class="mono cartina__scheda-label">Altre cantine della zona</p>' +
    '<ul class="cartina__cantine">' + items + '</ul>' +
    '<p class="cartina__fonte">Elenco fornito dal committente, non verificato scheda per scheda: solo nome e area.</p>'
  );
}

function setAttivi(tipo, id) {
  for (var zid in punti) {
    punti[zid].classList.toggle('cartina__punto--attivo', tipo === 'zona' && zid === id);
  }
  for (var pid in gruppi) {
    gruppi[pid].classList.toggle('cartina__provincia--attiva', tipo === 'provincia' && pid === id);
  }
}

function lega(el, cb) {
  el.addEventListener('click', cb);
  el.addEventListener('mouseenter', cb);
  el.addEventListener('focus', cb);
  el.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); cb(); }
  });
}

function costruisciSvg() {
  var svg = crea('svg', {
    viewBox: '0 0 400 620',
    role: 'img',
    'aria-label': 'Cartina stilizzata delle denominazioni vinicole della Calabria: nove zone DOC in cinque province, disegnata a tratto.',
    class: 'cartina__svg',
  });

  svg.appendChild(crea('path', { class: 'cartina__costa', d: CONTORNO }));

  PROVINCE.forEach(function (pr) {
    var g = crea('g', { 'data-provincia': pr.id });
    gruppi[pr.id] = g;

    g.appendChild(crea('path', {
      class: 'cartina__regione cartina__regione--' + pr.accento,
      d: pr.regione,
    }));

    var lb = crea('text', {
      class: 'cartina__provincia',
      x: pr.label[0], y: pr.label[1],
      'text-anchor': 'middle',
      tabindex: '0', role: 'button',
      'aria-label': pr.nome + ' — le cantine della provincia',
    });
    lb.textContent = pr.nome;
    lega(lb, function () {
      pannello.innerHTML = schedaProvincia(pr.id);
      setAttivi('provincia', pr.id);
    });
    g.appendChild(lb);

    svg.appendChild(g);
  });

  ZONE.forEach(function (z) {
    var p = PUNTO[z.id];
    var g = crea('g', {
      class: 'cartina__punto',
      transform: 'translate(' + p.x + ' ' + p.y + ')',
      tabindex: '0', role: 'button',
      'aria-label': z.nome + ' — ' + z.tipo,
    });
    punti[z.id] = g;

    g.appendChild(crea('circle', { class: 'cartina__alone', r: 16 }));
    g.appendChild(crea('circle', { class: 'cartina__perno', r: 3.5 }));

    var et = crea('text', {
      class: 'cartina__punto-etichetta',
      'text-anchor': p.sin ? 'end' : 'start',
      x: p.sin ? -10 : 10,
      y: -6,
    });
    et.textContent = z.breve || z.nome;
    g.appendChild(et);

    lega(g, function () {
      pannello.innerHTML = schedaZona(z);
      setAttivi('zona', z.id);
    });

    gruppi[z.provincia].appendChild(g);
  });

  return svg;
}

export function initCartina() {
  contenitore = trovato('cartina-mappa');
  pannello = trovato('cartina-scheda');
  if (!contenitore || !pannello) return;

  contenitore.appendChild(costruisciSvg());

  var rIgt = trovato('cartina-igt');
  var rAut = trovato('cartina-autoctoni');
  if (rIgt) rIgt.textContent = IGT;
  if (rAut) rAut.textContent = AUTOCTONI;

  pannello.innerHTML =
    '<p class="mono cartina__scheda-tipo">Cartina</p>' +
    '<h3 class="cartina__scheda-nome">Nove zone, un territorio</h3>' +
    '<p class="cartina__scheda-nota">Scegli una denominazione o una provincia sulla cartina per leggerne vitigni e comuni.</p>';
}
