# ASSETS — ŒNOTRIA

Inventario nella struttura «Animation Asset Inventory» del metodo pear.no
(vedi `METODO-pear-no.md`). Ogni asset è self-hosted in `public/` — nessun URL esterno.

La tabella dei segmenti è **derivata**: la rigenera `node lab/genera-inventario.mjs`
(legge `public/dati/tagli.json` + `frames.json`, verifica ogni conteggio con ffprobe
sulle sorgenti, scrive `public/dati/segmenti.json` e ristampa la tabella qui sotto).
Non correggerla a mano.

## Inventario asset di animazione — FILM v2 (racconto unico, 2026-08-28)

Il film è **un'unica sequenza logica** di 2759 fotogrammi WebP (architettura «flat
film»), scrubbata dallo scroll: il racconto unico in stile pear.no (keyframe nano
banana/Higgsfield + clip Flow/Veo con primo e ultimo fotogramma fissati). *"/ tier"*
= desktop e mobile hanno ciascuno il set completo: `public/frames/film/` (1280×720,
q62) e `public/frames-m/film/` (720p, q42), 24 fps. Montato da
`lab/monta-film-v2.sh` (manifest: `lab/film-v2-manifest.json`).
**v3 (stesso giorno):** le transizioni shader sono state sostituite da **8 ponti
match-cut** (zoom su un dettaglio condiviso + 6 fotogrammi di sovrapposizione
all'apice — il sole, il grappolo, il cesto, il vino), generati in locale da
`lab/ponti-matchcut.mjs` (coordinate misurate da `lab/misura-dettagli.mjs`) e
montati da `lab/assembla-film-v3.mjs`: totale **2999 fotogrammi / tier**,
`tagli.json` vuoto. Gli inserti sono ridotti a 6 glifi, uno per scena, solo dove
rimano col contenuto. La tabella qui sotto è la v2 (i soli segmenti di clip);
i confini v3 con i ponti stanno in `public/dati/segmenti.json`.

| Segmento | Tipo asset | Fotogrammi / tier | Intervallo nel film | Sorgente |
|---|---|---|---|---|
| nave | Sequenza WebP | 192 | 0001–0192 | `Clip-1.mp4` |
| approdo | Sequenza WebP | 192 | 0193–0384 | `clip-2.mp4` |
| vigna | Sequenza WebP | 192 | 0385–0576 | `clip-3.mp4` |
| raccolta | Sequenza WebP | 192 | 0577–0768 | `clip3-1.mp4` |
| scambio | Sequenza WebP | 44 | 0769–0812 | `clip-4.mp4` |
| trasporto | Sequenza WebP | 192 | 0813–1004 | `clip-5.mp4` |
| vasca | Sequenza WebP | 192 | 1005–1196 | `clip-6.mp4` |
| pigiatura | Sequenza WebP | 192 | 1197–1388 | `clip-7.mp4` |
| anfora | Sequenza WebP | 192 | 1389–1580 | `clip-8.mp4` |
| porta | Sequenza WebP | 192 | 1581–1772 | `clip-9.mp4` |
| mondi | Sequenza WebP | 192 | 1773–1964 | `clip-10.mp4` |
| botti | Sequenza WebP | 192 | 1965–2156 | `clip-11.mp4` |
| travaso | Sequenza WebP | 240 | 2157–2396 | `clip-12.mp4` |
| rubinetto | Sequenza WebP | 123 | 2397–2519 | `clip-13.mp4` |
| dentro-il-vino | Sequenza WebP | 240 | 2520–2759 | `clip-14.mp4` |
| **Totale** | | **2759 / tier** | 0001–2759 | 15 clip in `_sorgenti/video/hf-foto/videoflow/` |

L'ultimo fotogramma (campo rubino, `rgb(97,21,23)`) è anche il fondo della pagina:
`--color-rubino: #611517` in `src/styles.css`. Palco allungato a 8400vh per tenere
il passo di ~3vh a fotogramma. Il film v1 (1737 frame, 19 clip) è archiviato in
`_sorgenti/frames-vecchi/film-v1{,-m}/`.

**Peso:** desktop ~89 MB, mobile ~39 MB.

## Texture del palco (OGL)

Generate con Higgsfield `nano_banana_pro`, 2026-08-25, 6 crediti totali. In `public/img/`:

| # | File | Soggetto |
|---|------|----------|
| 1 | `01-vigneto-ionio.webp` | Terrazze di vigna sul mare Ionio, muretti a secco |
| 2 | `02-ceppo-vite.webp` | Ceppo di vite nodoso su terra rossa spaccata |
| 3 | `03-anfore-cantina.webp` | Anfore interrate in cantina, un taglio di luce |
| 4 | `04-anfora-vite.webp` (+ `@1280`) | Anfora e vite sul pietrisco |
| 5 | `05-costa-terrazze.webp` · `06-tempio-vigna.webp` · `07-cantina-moderna.webp` | Riserve, stessa serie |

## Immagini di corredo (`public/img/`)

| Cartella | File | Contenuto | Nota |
|---|---|---|---|
| `ceramica/` | 4 webp | dioniso, donna, re, vigna — stile ceramica a figure rosse | Rese come `background-image` (principio «img=0») |
| `enotro/` | 2 webp | mappa-rotta, re-enotro | |
| `segni/` | 9 png | anfora, busti, colonna, cratere, filosofo, lucerna, nave… | Segni a tratto per gli overlay (`src/inserti.js`) |
| `seq/` | 31 webp | primo/ultimo fotogramma per scena (`NN-first`/`NN-last`) | Diagnostica giunzioni, non montati |
| `texture/` | 3 webp | legno-botte, pennellata, pergamena | |
| `produttori/` | 3 webp | `bottiglie-01/02/03` — bottiglie **generiche, senza etichette riconducibili a marchi** | Vincolo attivo: niente loghi né foto di produttori reali (decisione 2026-08-27, vedi vault `Decisions/`) |

## Fonts (`public/fonts/`)

9 woff2 self-hosted: EB Garamond, Fraunces, GFS Didot (greco), Instrument Sans,
JetBrains Mono — ciascuno regular + italic dove serve.

## Dati (`public/dati/`)

| File | Ruolo |
|---|---|
| `frames.json` | Manifest del film (1737 · 1280×720 · 24 fps) |
| `tagli.json` | 18 giunzioni: posizione `at`, modo shader, larghezza, colore, verso |
| `segmenti.json` | **Derivato** da `lab/genera-inventario.mjs` — mappa segmento→fotogrammi |
| `copione.json` | 18 battute con posizione `at`, peso, greco |
| `luma.json` | Luminanza per fotogramma → ribaltamento chiaro/scuro degli inserti |
| `produttori.json` | 6 cantine reali DOC Cirò — **solo testo**, dati verificati |

## Sorgenti non montate e scarti (`_sorgenti/`)

| Dove | Cosa | Stato |
|---|---|---|
| `video/fuori1–8.mp4` | 8 clip scartate al montaggio | Tenute come riserva |
| `video/Camera_zooming…`, `Figure_cutting…`, `Pouring_wine…`, `Three_figures…`, `Winemaker…`, `Zooming…` | Export AI con nome descrittivo (2026-08-25) — materiale grezzo pre-rimontaggio | Le versioni montate sono i file numerati |
| `video/1..16/`, `tutti-frames/` | Estrazioni ezgif a bassa cadenza (12–30 f/clip) | Superate dal film a 24 fps |
| `frames-vecchi/` | Frame dell'architettura precedente a 15+2 scene, con tier `m-*` e transizioni `t1–t8` | Storico, non referenziato dal runtime |
| `films/` | 3 mp4 nominati + 15 `seq-*.mp4` (concat intermedi) | Intermedi di lavorazione |
| `img-inutilizzate/` | 4 png Higgsfield + 7 webp `_orig` | Scarti tenuti per confronto |
| `video/revisione.html` | Pagina di revisione clip per il committente | Strumento, non asset |
| `cartina/` | `it-reg.geojson` + `it-prov.geojson` — confini ISTAT via openpolis/geojson-italy (CC-BY-4.0, scaricati 2026-08-28) | Sorgente dei tracciati SVG di `src/cartina.js`, rigenerabili con `node lab/genera-cartina.mjs` |
| `video/gemini-foto/` | KF-1.A/1.B (+ tentativi v1 scartati) — nano banana in Gemini, 2026-08-28 | Keyframe atto I del film unico v3 |
| `video/hf-foto/` | 15 keyframe KF-2.A→10.B — Higgsfield `nano_banana_pro` 2k, 2026-08-28, 34 crediti (17 gen., 2 tentativi tessera scartati) + copie di 1.A/1.B e `contact-sheet.png` | Catena completa per il film unico v3 (`lab/prompts-gemini-keyframes.md`); prossimo passo: clip in Flow (`lab/prompts-flow-video.md`) |

## Intramezzi HyperFrames — pronti, da usare

Sei composizioni HTML già scritte, **non ancora montate nel film**:

`dev-projects/hyperframes-studio/oenotria-intermezzi/compositions/`
- `int-1-oinos` · `int-2-oinotria` · `int-3-gaglioppo`
- `int-4-greco` · `int-5-krimisa` · `int-6-sybaris`

Cartelli con le parole greche del racconto. Scritti il 2026-08-25 per il montaggio
a sette atti; la sequenza attuale ha 19 segmenti, quindi **i punti di innesto vanno
rifatti**, il testo no.

**Come aprirle:**
```bash
cd ~/Desktop/dev-projects/hyperframes-studio/oenotria-intermezzi
export PUPPETEER_SKIP_DOWNLOAD=true
export PUPPETEER_EXECUTABLE_PATH="C:/Program Files (x86)/Google/Chrome/Application/chrome.exe"
npx hyperframes preview      # studio su localhost:3002
npx hyperframes check        # cancello obbligatorio: lint, layout, contrasto WCAG
npx hyperframes render       # → renders/<nome>_<data>.mp4
```

⚠️ Il primo tentativo (25 ago) era morto perche' puppeteer non riusciva a scaricarsi
Chromium (`EPERM` sulla cache npx). Si aggira puntando al Chrome gia' installato con
le due variabili qui sopra — non serve toccare i permessi.
Il progetto e' pinnato a hyperframes 0.8.6 (ultima 0.8.16).

## Generazione e licenze

| Campo | Valore |
|-------|--------|
| Immagini | Higgsfield `nano_banana_pro`, 2026-08-25, 6 crediti (4 texture) |
| Video | Generazione AI via Higgsfield (export 2026-08-25) + rimontaggio/trim del committente (2026-08-26/27) |
| Vincolo | Zero asset di terzi: niente loghi, niente foto prodotto di cantine reali, niente asset dal repo `amasun/Pear-no` (nessuna licenza) |
| Hosting | Tutto in `public/`, nessun URL esterno |
