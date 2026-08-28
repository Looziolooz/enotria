# Pear.no — lezioni di replica: bilancio tecnico ed esperienza riusabile

> **Cos'è questo file.** Traduzione integrale in italiano di `REPLICATION_LESSONS.md` del repo
> [amasun/Pear-no](https://github.com/amasun/Pear-no), scaricato e tradotto il **2026-08-26**.
> È il documento in cui l'autore di una replica di `pear.no` spiega **come è stato fatto**: la
> pipeline creativa del sito originale, lo scheletro di prompt, la timeline logica, il chroma key
> della griglia, la catena inchiostro SVG, e la tabella delle trappole con il principio di
> riparazione di ciascuna.
>
> **Perché sta in questo progetto.** Œnotria è la nostra prova deliberata di replicare il *metodo*
> di pear.no. Questo è il metodo, scritto da qualcun altro che ha fatto la stessa cosa. Le sezioni
> più utili qui sono la **1 (timeline logica)**, la **2 (sequenze di fotogrammi)** e la tabella
> delle trappole — coincidono con dove siamo adesso: `_sorgenti/video/` con le sequenze estratte e
> i raccordi fra atti.
>
> ⚠️ **Licenza.** Il repo di origine **non ha licenza** → tutti i diritti riservati. Questa
> traduzione è **materiale di consultazione interno**: si riusano le idee e le formule, **non** si
> copiano font, asset o codice da quel repo, e nulla di questo testo finisce in materiale cliente.
>
> Originale conservato nel vault: `Clippings/REPLICATION_LESSONS — Pear.no 复刻 (originale integrale).md`
> · Lettura ragionata con le formule estratte dal codice: `Design Systems/pear.no — la replica, letta dal codice.md`

---

## Obiettivo e confini

Questo progetto non ricostruisce una landing page statica a partire da un file di design: replica
**l'esperienza narrativa a scorrimento** di `pear.no`. Immagine, testo, linee della griglia, video
e sequenze di fotogrammi, moduli e scene sono tutti governati da **una sola timeline**.

Il documento tiene distinte due cose:

- **La pipeline creativa del sito originale**: materiali e metodo di produzione, così come li ha
  descritti pubblicamente il suo autore.
- **L'implementazione di questa replica**: le soluzioni React, Canvas, WebGL, SVG e CSS adottate
  per riprodurre quell'esperienza nel browser.

## La pipeline creativa del sito originale

La tesi centrale dell'autore non è «l'AI sostituisce la costruzione dei siti», ma: **comprimere
direzione visiva, produzione dei materiali e implementazione frontend in un unico flusso
strettamente accoppiato**.

1. **Fermi immagine**: le inquadrature vengono generate con **GPT Image 2** dentro Higgsfield.
2. **Un mondo visivo unitario**: si mantiene uno **scheletro di prompt riusabile**, perché ogni
   immagine condivida la stessa lingua pittorica, la stessa disciplina compositiva e la stessa
   logica degli spazi vuoti.
3. **Immagini lente**: i fermi vengono estesi in **clip cinematografiche a ritmo lento** con
   **Seedance 2**.
4. **Implementazione diretta**: il codice di produzione si scrive in **Claude Code**, con Fable 5,
   **senza passare da Figma**.
5. **Campionamento del colore**: l'oro e il celeste **non** sono una linea guida di marca decisa
   prima. Sono **estratti dal dipinto stesso** e solo dopo, a ritroso, diventano i colori
   dell'interfaccia.

Il valore del metodo sta in questo: **prima si fa esistere il materiale dentro un unico universo
visivo, poi il codice si occupa di ritmo, spazio e interazione.** Le immagini generate forniscono
soltanto la materia prima; la qualità del sito continua a dipendere da inquadratura, spazi vuoti,
stratificazione, controllo del tempo e gestione dei fotogrammi anomali.

### Cosa insegna lo scheletro di prompt

L'esempio dell'autore parte da un vincolo generale — «inquadratura larga, immagine singola, pittura
a olio neoclassica» — e poi specifica: cielo **cerulean-blue piatto e saturo**, figure e architettura
classiche, una pera dorata, anelli concentrici a mezzatinta, **un solo glitch arcobaleno**, una zona
pulita riservata al testo dell'interfaccia, e vincoli negativi come «niente gradiente, niente
vignettatura, nessun testo dentro l'immagine».

La formula riusabile è:

```
stile globale + inquadratura/composizione + soggetto e azione + materiali/texture
+ ancoraggio di colore + simbolo speciale + zona sicura per il testo + divieti espliciti
```

Fra questi, **la «zona sicura per il testo» e i «divieti espliciti» sono i più importanti**: sono
ciò che permette al materiale generato di **reggere un'interfaccia vera**, invece di poter fare
soltanto da immagine di sfondo.

### Il prompt integrale della scena d'esempio

Testo originale dell'esempio «un prompt, un'immagine» mostrato dall'autore — **da leggere in
inglese, non tradotto**: è la forma esatta che il modello riceve.

```text
"A wide cinematic scene painted as a single NEOCLASSICAL OIL PAINTING: smooth painterly rendering like Ingres and Jacques-Louis David, elegant idealized forms, NOT pixel art, NOT cross-stitch. A flat saturated cerulean-blue sky fills the entire canvas edge to edge, no gradient, no vignette. At the right, a tall white marble column; standing on its capital a young woman in white drapery with a red sash holds a single golden pear high above her head. From the pear, wide concentric rings rendered as coarse black-and-white halftone dither dots ripple outward across the sky like a broadcast signal, the rings thinning and spreading left. At the base of the column, a small crowd of robed figures looks up toward the pear. A single small rainbow glitch smear inside one ring segment only. Generous empty flat cerulean sky across the upper left for text. No text anywhere."
```

### Scomposizione della scena in strati e parole chiave

| Strato | A cosa serve | Elementi / parole chiave nell'originale |
| --- | --- | --- |
| Forma dell'output | Definisce per primi formato e senso dell'inquadratura, così da non ottenere un ritratto o un oggetto isolato | `wide cinematic scene`, `single` |
| Stile pittorico di fondo | Blocca la lingua visiva dell'intero mondo | `NEOCLASSICAL OIL PAINTING`, `smooth painterly rendering`, `Ingres`, `Jacques-Louis David`, `elegant idealized forms` |
| Vincoli negativi di medium | Esclude le texture a bassa fedeltà e gli stili pixelati verso cui il modello devia facilmente | `NOT pixel art`, `NOT cross-stitch` |
| Cielo e colore di base | Stabilisce l'ancoraggio cromatico più forte del quadro e la sua planarità | `flat saturated cerulean-blue sky`, `entire canvas edge to edge`, `no gradient`, `no vignette` |
| Composizione principale | Indica da dove parte lo sguardo, dove sta la figura e dov'è il baricentro | `At the right`, `tall white marble column`, `standing on its capital` |
| Figura | Dà al personaggio materiali, abito e postura classici espliciti | `young woman`, `white drapery`, `red sash` |
| Simbolo centrale | Mette l'oggetto di marca alla massima priorità visiva | `single golden pear`, `high above her head` |
| Lingua del segnale | Trasforma il simbolo di marca in una grafica di sfondo estendibile | `wide concentric rings`, `coarse black-and-white halftone dither dots`, `broadcast signal`, `rings thinning and spreading left` |
| Comparse narrative | Usa figure secondarie per dare scala, direzione e relazione di sguardo | `small crowd of robed figures`, `looks up toward the pear` |
| Anomalia limitata | Consente **un solo** punto di glitch digitale controllato, preservando l'ordine dell'immagine | `single small rainbow glitch smear`, `inside one ring segment only` |
| Zona sicura per la UI | Riserva al titolo e alla navigazione veri un'area che non disturbi la lettura | `Generous empty flat cerulean sky`, `upper left for text` |
| Vincolo «nessun testo» | Impedisce al modello di generare da sé testo incontrollabile | `No text anywhere` |

Questa tabella si legge come una **ricetta a ordine fisso**: **prima si fissano medium e formato,
poi il colore di fondo e la composizione principale, poi si innestano il simbolo di marca e la
texture ripetibile, e infine si lascia lo spazio per l'interfaccia chiudendo con i vincoli
negativi.**

La struttura merita di essere conservata così com'è: prima si blocca il genere pittorico e gli
artisti di riferimento, poi due `NOT` escludono il medium sbagliato; nella parte centrale si
aggiungono, uno strato alla volta, i simboli riconoscibili — la figura a destra, la pera dorata,
gli anelli di segnale a mezzatinta; alla fine si dichiarano la zona di testo in alto a sinistra e
il «nessun testo nell'immagine».

## Lo stack tecnico di questa replica

- **React + Vite**: scene componibili, gestione dello stato e build di produzione.
- **WebGL / GLSL nativi**: l'immagine del film hero, la maschera in chroma key e le transizioni.
- **Canvas 2D**: disegno delle sequenze WebP di FLY e transition, dissolvenza incrociata fra
  fotogrammi, e maschera delle linee sottili.
- **HTML / CSS 3D**: il modulo Application, i livelli in prospettiva, la profondità al passaggio
  del mouse e le ellissi orbitali.
- **Filtri SVG**: `feTurbulence`, `feDisplacementMap`, `feComponentTransfer` e `feComposite`
  compongono la comparsa a inchiostro assorbito del testo Ink.
- **Timeline di scorrimento**: tutto il sito usa un progresso **mappato**, indicato come `ROAD`,
  invece di prendere lo `scrollY` grezzo del browser come progresso dell'animazione.
- **Layout responsive**: desktop e mobile condividono gli stessi **nodi narrativi**, ma con
  inquadratura, ancoraggi degli oggetti, scala e ramo di sequenze **indipendenti**.

## Elementi chiave dell'implementazione

### 1. Una timeline «Road» calibrabile

`timeline.js` mappa lo scorrimento grezzo della pagina in un **progresso logico**, e fornisce anche
la **mappatura inversa**. Così ogni scena si preoccupa soltanto del proprio intervallo di Road: il
modello, Work, Terms / Ink, FAQ, FLY, Application, transition e Footer.

I vantaggi:

- Il clic su *Apply* in alto **atterra direttamente** sul Road di destinazione di Application,
  invece di attraversare in scorrimento morbido tutti i capitoli.
- Il pannello Road può mostrare il nome della fase, ed essere cliccato, trascinato e navigato da
  tastiera con precisione.
- Il mobile può avere una **distribuzione diversa della lunghezza di scorrimento**, e la narrazione
  resta comunque allineata agli stessi nodi logici.

> **Esperienza:** qualunque pagina narrativa a scorrimento lungo dovrebbe **prima definire il tempo
> logico**, e solo dopo mapparci dentro lo scorrimento fisico. Altrimenti, non appena una scena si
> allunga o il mobile cambia ritmo, **tutte le soglie vanno fuori controllo insieme.**

### 2. Il materiale non è una normale immagine di sfondo

Film e sequenze di fotogrammi vanno gestiti con una **formula di copertura esplicita**, con
**ancoraggi di inquadratura** e parametri di sovracampionamento — non affidandosi al solo
`object-fit: cover`. Soprattutto su mobile, riusare per sbaglio le proporzioni del desktop o la
cartella di sequenza sbagliata porta a figure stirate, composizione alla deriva o fotogrammi
adiacenti che non si raccordano.

In questa replica: la sequenza sceglie il proprio ramo **in base alla larghezza dello schermo**;
la scala di copertura si calcola **sulle dimensioni naturali** dell'immagine, e il progresso della
scena modifica l'inquadratura orizzontale. Il fotogramma di coda di FLY e la transition successiva
si **dissolvono l'uno nell'altro dentro una finestra di Road delimitata**, evitando lo stacco netto.

> **Esperienza:** dopo aver convertito un video generato in sequenza di fotogrammi, vanno
> controllati **segmento per segmento** il primo fotogramma, l'ultimo, l'orientamento
> orizzontale/verticale, la trasparenza e lo spazio colore. **Avere la cartella giusta non
> significa avere la continuità visiva giusta.**

### 3. Le linee della griglia sono scena, non interfaccia fissa

Linee verticali e orizzontali, stelle agli incroci, colori e posizione degli estremi si muovono,
si contraggono o scompaiono **insieme alla scena**. Devono essere **calcolate dallo stato della
timeline**, non essere un insieme di decorazioni `position: absolute` immobili.

I passaggi chiave:

- La maschera iniziale serve **solo** all'apertura: appena l'utente comincia a scorrere, va rimossa.
- Linee e segni di incrocio usano **coefficienti indipendenti** di entrata, tenuta e uscita.
- In un nodo di transizione come **Road 977**, tutti i segni di incrocio devono uscire **in
  sincrono**, per non lasciare in campo soltanto le due stelle in alto.
- Nel passaggio fra scene scure e chiare, il colore delle linee viene dalla **stessa sorgente di
  stato**, così da restare leggibile su entrambi i fondi.

### 4. L'effetto inchiostro richiede una vera composizione in alpha

Il testo a inchiostro **non è** «testo sfocato che appare in dissolvenza». La catena corretta è:

1. Generare un campo irregolare con **rumore frattale**.
2. Trasformare il rumore in una **maschera controllabile** tramite una **soglia sull'alpha**.
3. Applicare al testo sorgente uno **spostamento lieve**, che produce la perturbazione dei bordi
   tipica della carta che assorbe l'inchiostro.
4. Con **`feComposite operator="in"`**, **ritagliare il risultato spostato dentro la maschera di
   rumore**.
5. Ridurre nel tempo spostamento, sfocatura e contrasto, fino ad arrivare al testo nitido.

> **Se manca il passo 4**, l'effetto degrada in un normale spostamento sfocato e non si forma mai
> il bordo del «testo che emerge progressivamente dalla macchia d'inchiostro».

### 5. L'hover del modulo va risolto stabilmente sul layer di composizione

L'hover del modulo Application **non deve provocare cambi di layout**. Nella replica si usa
`translate3d + rotateZ + scale`: il campo corrente sale leggermente, avanza e si ingrandisce, gli
altri campi si attenuano un poco; e con `will-change: transform, filter, opacity` più una curva di
easing unica si lascia che il browser gestisca il cambiamento sul **layer di composizione**.

Un problema reale incontrato: una regola globale `.cf-f` **sovrascriveva** la transizione
`transform` interna al componente, causando salti e tremolii nell'hover. Passando a una regola con
scope più forte, `.cf .cf-f`, `transform`, `filter` e `opacity` sono entrati **nella stessa
transizione**, e il movimento si è stabilizzato.

> **Esperienza:** quando un'animazione **«sembra un problema di prestazioni»**, guarda **prima il
> CSS calcolato**, invece di aggiungere subito throttling o macchine a stati complicate. La causa
> vera è spesso **una regola che ne sovrascrive un'altra**.

## I punti di forza della soluzione

- **Materiale, testo e interazione condividono la stessa timeline**: il livello visivo e quello
  interattivo non sono stati spezzati in due pagine separate.
- **La replica è stata calibrata sul comportamento a runtime del sito originale**: soglie, maschere,
  entrate e uscite sono state verificate contro la logica catturata a runtime e le schermate delle
  scene, non soltanto indovinate dal visivo statico.
- **Un pannello di calibrazione operativo**: il Road è cliccabile, trascinabile e indirizzabile da
  tastiera, e la maniglia ha un'area di presa più generosa. È questo che rende efficiente il
  confronto e la correzione fotogramma per fotogramma.
- **Una strategia mobile spiegabile**: il mobile non è il desktop scalato, ma un adattamento
  indipendente di inquadratura, tipografia, ancoraggi, materiale di sequenza e aree di interazione.
- **Unità visiva ottenuta senza gradienti**: l'oro e il blu cerulean campionati dal dipinto,
  insieme a linee, mezzatinta, rumore e bordi d'inchiostro, formano un sistema **più materico** di
  quanto sia «colore di marca + gradiente CSS».

## Problemi ricorrenti nella replica, e principio di riparazione

| Problema | Causa vera | Principio di riparazione |
| --- | --- | --- |
| Schermo nero fra le scene, o fotogrammi fuori ordine | Finestra temporale interrotta, indice o sorgente della sequenza sbagliati | Dichiarare start/end di ogni segmento e **conservare le finestre di dissolvenza necessarie** |
| Immagini deformate su mobile | Uso di materiale desktop, o formula di copertura sbagliata | Usare il ramo di materiale mobile, e calcolare copertura e ancoraggio **sulle dimensioni naturali** |
| Testi in ordine inverso, o che sbordano nella scena successiva | Più gruppi di contenuto condividono la stessa condizione di progresso, sbagliata | Definire per **ogni gruppo** finestre indipendenti di comparsa, tenuta e uscita |
| L'inchiostro sembra una normale sfocatura | Al filtro SVG manca la composizione in alpha | Conservare per intero la catena soglia del rumore → spostamento → composite |
| *Apply* attraversa in dissolvenza tutto il sito | Uso di `behavior: smooth` | Usare la **mappatura inversa** della timeline e atterrare direttamente con `behavior: auto` |
| Hover che tremola | La transizione su `transform` è sovrascritta, oppure si animano proprietà di layout | Controllare il **computed style**; animare solo `transform` / `filter` / `opacity` |
| La griglia si stacca dall'immagine | Le linee sono scritte come decorazione fissa | Far derivare **posizione, lunghezza, colore e stelle** dallo stato della scena |

## Il flusso di lavoro consigliato per una replica

1. **Prima la tabella dei capitoli e del Road**: fissare i nodi di start, hold ed exit di tutte le
   scene.
2. **Poi un pannello di debug indirizzabile**: trascinamento, clic e salto da tastiera vanno
   supportati **fin dall'inizio dello sviluppo**.
3. **Bloccare l'inquadratura segmento per segmento**: correggere per primi il primo e l'ultimo
   fotogramma, le proporzioni e gli ancoraggi mobile.
4. **Solo dopo, gli strati sopra**: griglia, testi, shader, maschere ed effetti vanno costruiti
   **su un materiale già stabile**.
5. **Diagnosticare i problemi CSS dallo stile calcolato**: verificare quali `transition`, `filter`,
   `transform` e `opacity` sono realmente in vigore.
6. **Collaudo campionato su desktop e mobile**: coprire almeno apertura, parte centrale e uscita di
   ogni segmento, **più la giunzione fra due scene**.
7. **Costruire a ogni modifica**: evitare che una cosa funzioni solo nell'hot reload di sviluppo e
   poi la build di produzione mostri differenze di risorse o di stile.

## Conclusione

«GPT Image 2 + Seedance 2 + Claude Code / Fable 5» permette di generare in fretta materia prima
creativa riconoscibile per una pagina web, **ma non produce automaticamente un buon lavoro
interattivo**. Ciò che determina davvero la qualità del risultato è: un **mondo unitario nei
prompt**, la **continuità controllata del materiale**, una **timeline logica**, maschere e
composizione **corrette**, l'**inquadratura responsive**, e la **calibrazione paziente di ogni
singola giunzione fra le scene**.

Per un sito creativo, l'AI ha accorciato la distanza fra l'idea, il materiale e il codice. Non ha
eliminato l'ingegneria frontend, il motion design e il giudizio visivo: li ha soltanto concentrati
in modo più intenso sull'esperienza finale.

---

## Nota per chi lavora su Œnotria

Tre agganci diretti con lo stato attuale del progetto (`_sorgenti/video/`, `public/frames/`,
`public/frames-m/`, `lab/verify-*.mjs`):

1. **Sezione 1 — la timeline logica.** Se la coreografia degli atti è ancora legata a soglie di
   scroll fisiche, è il momento di introdurre un equivalente del Road: unità logiche + mappatura
   invertibile. La mappatura **inversa** serve appena esiste un link che deve *atterrare* su un
   atto invece di attraversarli tutti.
2. **Sezione 2 — le sequenze.** In `_sorgenti/video/` ci sono le cartelle `1`…`16` con i frame
   `ezgif-frame-NNN.png` (fra 12 e 30 fotogrammi ciascuna) più i raccordi `3-4`, `6-7`, `7-9`,
   `10-11`, `12-13`. **Mancano le cartelle `8` e `14`**, di cui esiste solo l'`.mp4`. Il documento
   dice esattamente cosa controllare prima di fidarsi: primo fotogramma, ultimo fotogramma,
   orientamento, trasparenza e spazio colore **di ogni segmento**, e una finestra di dissolvenza
   dichiarata su ogni giunzione.
3. **La tabella delle trappole** è la lista di controllo da rileggere prima di dire «fatto»: la
   riga sullo `scroll behavior`, quella sull'hover, e quella sulla griglia che si stacca
   dall'immagine sono le tre che si ripresentano sempre.
