# Cartina interattiva della Calabria vinicola — specifica per opencode

Progetto: `C:\Users\loren\Desktop\dev-projects\oenotria`. ESEGUI, NON PIANIFICARE: scrivi i file
veri sul disco, nessuna conferma, nessuna domanda. Al termine RIPORTA i percorsi scritti e le righe
di ciascuno — non un riassunto di intenzioni.

## Cosa esiste già (non riscriverlo, usalo come riferimento di stile)

- `src/inserti.js` — motore di overlay a tratto: un array di definizioni `{ at, x, y, s, r, o }`
  animate su `progresso` (0..1 del film), con SVG inline in `currentColor`, ribaltamento
  chiaro/scuro via classe `.inserti--inchiostro` pilotata da `public/dati/luma.json`. Contiene
  gia' un dizionario `ORNA_SVG` con `ellisse`, `arco`, `squadra`, `croce`, `meandro`, `easing`,
  `anfora` — riusa questi stessi tracciati SVG per la cartina, non inventarne di nuovi stili.
- `src/styles.css` — palette: `--color-fondo:#0B0A09` `--color-terra:#6B2224` `--color-calce:#E8DFCF`
  `--color-ionio:#1F5E5B` `--color-inchiostro:#241416`; ambra accento `#e8b06a`; font
  `--font-display:"EB Garamond"` (titoli, weight 300) `--font-body:"Instrument Sans"`
  `--font-mono:"JetBrains Mono"` (etichette, uppercase, letter-spacing .08em); un solo easing
  `cubic-bezier(0.22, 1, 0.36, 1)`; righe sottili `1px rgba(232,223,207,.14)`.
- `public/dati/produttori.json` — 6 schede esistenti (Ippolito 1845, Fattoria San Francesco,
  Cantina Malena, Caparra & Siciliani, Senatore Vini, Baroni Capoano), campi
  `nome, comune, denominazione, riga, uve, sito`. NON CANCELLARE queste sei, NON toccare i loro campi.
- `src/main.js` — `renderProduttori()` legge `produttori.json` e popola `#produttori-grid` dentro
  `index.html` all'`data-act="produttori"` (righe 94-110 circa).
- `index.html` riga 107: `<div class="banda-bottiglie" data-beat="1" data-at="0.12" aria-hidden="true"></div>`
  seguita da `<div class="produttori-grid" id="produttori-grid">`.

⛔ NON toccare: font, palette, il testo del copione, le 6 schede produttore esistenti, `src/shader.js`,
`src/shader-setup.js`, `src/inserti.js` (solo leggerlo per copiare i tracciati SVG).
⛔ NIENTE loghi, NIENTE foto di aziende scaricate dal web: la cartina e le nuove voci sono SOLO testo
e SVG a tratto disegnato da noi. Questo vincolo e' del committente, non negoziabile.
⛔ NIENTE dato inventato: per le aziende elencate sotto conosciamo SOLO nome + area geografica
(dalla posizione sulla mappa sorgente). NON scrivere comune, denominazione o vitigni per loro:
solo nome e macro-area. I campi completi restano riservati alle 6 (+ eventuali altre con dati certi
gia' in produttori.json) e alle 9 zone DOC sotto, che hanno vitigni da fonte enologica nota (non dal
flyer).

## Parte A — `src/cartina.js` (nuovo file)

Modulo ES, nessuna libreria, un solo `export function initCartina()` chiamato da `src/main.js` dopo
`renderProduttori()`. Costruisce un SVG (`viewBox 0 0 400 620`) con:

1. **Contorno della Calabria stilizzato** (un solo `<path>`, tratto 1px `currentColor`, riempimento
   `none`) — NON deve pretendere precisione cartografica: e' un disegno a tratto coerente con lo
   stile del sito (vedi `arco`, `meandro` in inserti.js), non una mappa GIS. Dillo in un commento nel
   file.
2. **5 province come regioni raggruppate**, non confini precisi: Cosenza (nord), Catanzaro
   (centro-nord), Crotone (centro-est, costa ionica), Vibo Valentia (centro-ovest), Reggio Calabria
   (sud). Ogni provincia e' un `<g data-provincia="...">` con un'etichetta mono e un colore di
   accento leggero (varianti di opacita' di `--color-terra` o `--color-ionio`, MAI nuovi colori).
3. **9 zone DOC come punti cliccabili/hover**, dati gia' pronti (usali esattamente, sono verificati):

```js
var ZONE = [
  { id:'ciro', nome:'Cirò', provincia:'crotone', tipo:'DOC',
    comuni:'Cirò, Cirò Marina, Crucoli, Melissa (KR)',
    vitigni:['Gaglioppo','Greco Bianco'],
    nota:'La zona classica, sulla costa ionica dove sorgeva Krimisa. Il rosso è Gaglioppo; il bianco, Greco.' },
  { id:'melissa', nome:'Melissa', provincia:'crotone', tipo:'DOC',
    comuni:'Melissa e comuni del crotonese',
    vitigni:['Gaglioppo','Greco Bianco'],
    nota:'Confina con il Cirò e ne condivide le uve: colline d’argilla che scendono verso lo Ionio.' },
  { id:'santanna', nome:'S. Anna di Isola Capo Rizzuto', provincia:'crotone', tipo:'DOC',
    comuni:'Isola di Capo Rizzuto, Crotone (KR)',
    vitigni:['Gaglioppo','Nerello'],
    nota:'Il promontorio a sud di Capo Colonna, dove il tempio di Hera guardava le rotte del vino.' },
  { id:'bivongi', nome:'Bivongi', provincia:'reggio-calabria', tipo:'DOC',
    comuni:'Bivongi, Stilo e la vallata dello Stilaro (RC)',
    vitigni:['Gaglioppo','Greco Nero'],
    nota:'Fra le Serre e il mare, la valle bizantina dello Stilaro: vigne di collina su terre minerali.' },
  { id:'greco', nome:'Greco di Bianco', provincia:'reggio-calabria', tipo:'DOC',
    comuni:'Bianco, Casignana (RC)',
    vitigni:['Greco Bianco'],
    nota:'Un passito da uve stese al sole, fra i più antichi d’Italia: il gesto greco rimasto intatto.' },
  { id:'lamezia', nome:'Lamezia', provincia:'catanzaro', tipo:'DOC',
    comuni:'La piana lametina (CZ)',
    vitigni:['Nerello Calabrese','Gaglioppo','Greco Nero'],
    nota:'La piana sul Tirreno, all’istmo più stretto d’Italia: qui il vino guardava a occidente.' },
  { id:'savuto', nome:'Savuto', provincia:'cosenza', tipo:'DOC',
    comuni:'La valle del Savuto (CS/CZ)',
    vitigni:['Gaglioppo','Magliocco'],
    nota:'Vigne ripide lungo il fiume: il vino che i Romani chiamavano Sabutum.' },
  { id:'scavigna', nome:'Scavigna', provincia:'catanzaro', tipo:'DOC',
    comuni:'Nocera Terinese, Falerna (CZ)',
    vitigni:['Magliocco','Gaglioppo'],
    nota:'Piccola denominazione di collina fra Savuto e mare, terrazze strette e rese basse.' },
  { id:'cosenza', nome:'Terre di Cosenza', provincia:'cosenza', tipo:'DOC',
    comuni:'Il cosentino, dal Pollino alla Sila',
    vitigni:['Magliocco','Pecorello','Guarnaccia'],
    nota:'La DOC più estesa: qui regna il Magliocco, e a Saracena si tramanda il Moscato al governo.' },
];
```

   Posiziona i punti dentro l'area della rispettiva provincia (coordinate approssimative coerenti
   col contorno che disegni — nord in alto). Click o hover apre un pannello laterale (vedi Parte B)
   con nome, comuni, vitigni, nota.

4. **IGT** come riga mono fissa, non interattiva: `Calabria · Val di Neto · Lipuda · Locride ·
   Palizzi · Pellaro · Scilla · Costa Viola · Arghillà`.

5. **Vitigni autoctoni** come riga mono fissa: `Gaglioppo · Magliocco Canino · Magliocco Dolce ·
   Greco Bianco · Mantonico · Pecorello · Greco Nero · Nerello Calabrese · Guarnaccia · Castiglione ·
   Prunesta · Moscatello di Saracena`.

6. **Directory leggera "altre cantine della zona"**, raggruppata per provincia, SOLO nome (nessun
   altro campo), da mostrare come elenco mono compatto sotto la mappa o dentro il pannello di ogni
   provincia. Fonte: due immagini fornite dal committente (un flyer Regione Calabria/Rosso Calabria
   per Vinitaly 2018, e un elenco "Vini" + "Distillati e liquori"). Nomi trascritti, deduplica fra le
   due fonti, dividi per provincia usando la posizione sul flyer originale (nord→sud):

```js
var ALTRE_CANTINE = {
  cosenza: ['Cantine Viola','Feudo dei Sanseverino','Masseria Falvo 1727','Casa Vinicola Gialdino',
    'Davide Morrone','Terre di Balbia','La Peschiera','Tenute Mirabelli','Serracavallo','Chimento',
    'Antiche Vigne','Colacino Wines','Az. Agr. Dell’Aquila','Az. Agr. Granata',
    'Az. Agr. Grutteria Niccolò','Az. Agr. Le Conche','Az. Agr. Monte Re 1958','Az. Agr. Nesci',
    'Az. Agr. Pacelli Francesco','Az. Vitivinicola Stoli','Antichi Vigneti Sculco','Akroneo',
    'Feudo della Sagitta','Kalabrian Wine','La Collinetta di Nicola Merenda',
    'Librandi Antonio & Nicodemo','Maddalona del Casato','Magna Graecia Vini','Poderi Marini',
    'Prebenda','Rocca Brettia - Kairos 45','Serragiumenta','Spadafora 1915','Tenuta Corno Valano',
    'Tenuta del Castello','Tenuta del Travale','Tenuta Renda','Tenuta Santa Venere','Vigneti Vumbaca'],
  catanzaro: ['Odoardi','Lento','Nicotera Severisio','Statti','Dell’Aera','Cantina Campana',
    'Cantine Benvenuto','Giraldi & Giraldi','Soc. Agr. Zito','Stamati Viticoltori',
    'Tenuta Sposato','Tenute Ferrari'],
  crotone: ['Cantine Greco','Fezzigna Vini','Cantine Bruni','Cantine de Luca','Garrubba',
    'Tenuta Leonetti','Cantina Val di Neto','Ceraudo','La Pizzuta del Principe','Russo & Longo',
    'Marrelli Wines','Brigante Vigneti & Cantina','’A Vita','Barone Macrì','Cantina Salvatore Caparra',
    'Cantina dell’Acquila','Cantine de Mare','Cantine Vulcano','Casa Vinicola Lucà',
    'Cataldo Calabretta','Cote di Franze','Du Cropio Winery','Montescudiero','Scala','Sergio Arcuri',
    'Tenuta del Conte','Biagio Diana','Fattorie Greco (Igreco)','Campoverde','Esposito Vini',
    'Serracavallo','Tenuta Santoro','Terre di Vita'],
  'vibo-valentia': ['Casa Comerci','Tramontana Vini'],
  'reggio-calabria': ['Criserà','Battaglia Vini Tramontana','Consolato Malaspina','Cantina Visalli',
    'Nino Altomonte','Santino Lucà','Vigne del Greco di Bianco','Baroni Gr Macrì',
    'Cantine Lavorata','Feudo Gagliardi'],
};
```

   Etichetta sopra l'elenco: `mono` piccolo, `"Altre cantine della zona"` — e SOTTO, una riga di
   provenienza in corsivo/opacity ridotta: `"Elenco fornito dal committente, non verificato scheda
   per scheda: solo nome e area."` — importante, non ometterla: e' la trasparenza sul dato.

7. Interazione: click/hover su un punto DOC o su un'etichetta provincia aggiorna il pannello
   (Parte B). Nessuna libreria: `addEventListener` diretto, come fa gia' `inserti.js`.
8. Accessibilita': `role="img"` sull'svg con `aria-label`, i punti sono `<g tabindex="0" role="button"
   aria-label="...">` con gestione `keydown` Invio/Spazio (copia il pattern, non serve identico).

## Parte B — markup in `index.html`

Subito PRIMA di `<div class="produttori-grid" id="produttori-grid">` (dopo la riga
`<div class="banda-bottiglie" ...></div>`), inserisci:

```html
<div class="spacer-sm"></div>
<p class="mono" data-beat="1" data-at="0.10" style="letter-spacing:.14em;">
  Le zone
</p>
<h2 class="display t-h2" data-beat="1" data-at="0.10" data-c>
  Nove denominazioni, cinque province, gli stessi vitigni di tremila anni fa.
</h2>
<div class="cartina" data-beat="2" data-at="0.14">
  <div class="cartina__mappa" id="cartina-mappa"></div>
  <div class="cartina__pannello" id="cartina-scheda"></div>
</div>
<div class="cartina__legenda">
  <p class="mono cartina__riga" id="cartina-igt"></p>
  <p class="mono cartina__riga cartina__riga--autoctoni" id="cartina-autoctoni"></p>
</div>
```

Rispetta la convenzione `data-beat`/`data-at` gia' usata nella section (guarda le righe intorno,
sono la coreografia di `choreo.js`: non serve capirla a fondo, solo replicarne la forma).

## Parte C — CSS in `src/styles.css` (in fondo al file, sezione nuova commentata)

- `.cartina` — grid a due colonne su desktop (`1.4fr 1fr`, gap generoso), una colonna sotto 820px
  (stesso breakpoint gia' usato altrove nel file per `.cap`).
- `.cartina__mappa svg` — `width:100%`, contorno Calabria `stroke: var(--color-calce)` opacity .5.
- `.cartina__punto .cartina__perno` — cerchio pieno ambra `#e8b06a`; `.cartina__alone` — cerchio
  grande trasparente che si accende in hover/focus/attivo (`fill: rgba(232,176,106,.12)`).
- `.cartina__punto--attivo .cartina__perno` — leggermente piu' grande, transizione con l'easing unico
  del progetto.
- `.cartina__pannello` — sulla falsariga della lastra scura gia' usata nel Capitolo (fondo
  `rgba(11,10,9,.72)`, bordo `1px solid rgba(232,223,207,.14)`), NON vetro/backdrop-filter (era stato
  scartato dal committente altrove nel progetto — non reintrodurlo).
- Elenco "altre cantine": mono, colonne responsive (`columns: 2` su desktop, `1` sotto 820px),
  riga-fonte in opacity .45, font-size leggermente ridotto.
- Tutte le transizioni sull'unico easing `cubic-bezier(0.22, 1, 0.36, 1)` gia' definito come
  `var(--ease)`.

## Parte D — `src/main.js`

Aggiungi `import { initCartina } from './cartina.js';` e chiama `initCartina();` dentro il listener
`DOMContentLoaded` esistente, dopo `renderProduttori();`.

## Verifica — obbligatoria, riporta i numeri

```bash
npm run build
node lab/verify-scrub.mjs
```

Riporta: esito build, `img=` e `canvas=` da verify-scrub (non devono peggiorare rispetto a prima:
attesi `img=0`, `canvas=2`), numero di zone DOC renderizzate, numero di voci nella directory leggera
per provincia, e conferma che le 6 schede esistenti in `produttori.json` sono intatte
(`git diff --stat public/dati/produttori.json` deve risultare vuoto).

# Report: percorsi scritti, righe di ciascuno, esiti dei comandi sopra.
