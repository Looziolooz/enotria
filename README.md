# ŒNOTRIA — La terra del vino aveva un nome greco

Esperienza web scroll-driven sul vino calabrese e la Magna Grecia, costruita con il
metodo pear.no (`METODO-pear-no.md`): un film di 1737 fotogrammi scrubbato dallo
scroll, 18 giunzioni calibrate una a una, overlay a tratto guidati dallo stato di scena.

## Cos'è

Una **proposta di concept rivolta alla Regione Calabria**: un contenitore permanente per
promuovere i vini calabresi, ancorato al fatto che la Calabria fu Magna Grecia e che i Greci
chiamarono questa terra *Oinotria*, la terra del vino.

**Non è legato a nessun evento, nessuna fiera, nessuna manifestazione.** È un asset che dura.

## Cosa non è

- **Non è un sito ufficiale della Regione Calabria.**
- Non è un e-commerce, non vende nulla.
- Non raccoglie dati personali, non ha form, non ha newsletter.
- Non è un sito di cantine: i produttori compaiono come referenze con link al loro sito,
  non sono clienti, non pagano.

## Stato dei moduli

| Modulo | Stato | Descrizione |
|---|---|---|
| Film scrub | PRONTO | 1737 fotogrammi WebP / tier (desktop 1280 + mobile 720), scrub con smorzamento esponenziale, scroll 5300 vh |
| Tagli | PRONTO | 18/18 giunzioni coperte, ognuna con un modo GLSL diverso dalle vicine (17 modi, 0–16) |
| Inserti a tratto | PRONTO | Segni greci + 19 ornamenti SVG, ribaltamento chiaro/scuro via `luma.json` |
| Copione | PRONTO | 18 battute, riscritte senza trattini lunghi, avverbi in -mente, gerundi |
| Cartina Calabria | PRONTO | 9 zone DOC reali in SVG vettoriale, 5 province, directory cantine minori |
| Produttori | PRONTO | 6 schede solo testo da `produttori.json` — vincolo: niente loghi né foto reali |
| Card testo | IN SOSPESO | Nudo vs lastra, confronto via `?schede=nudo\|lastra` — decide il committente |
| Intermezzi HyperFrames | DA MONTARE | 6 composizioni pronte, punti di innesto da rifare sui 19 segmenti |

## Inventario asset

La mappa completa segmento→fotogrammi→sorgente è in **`ASSETS.md`** (struttura
«Animation Asset Inventory» di pear.no), derivata e verificata da:

```bash
node lab/genera-inventario.mjs   # → public/dati/segmenti.json + tabella markdown
```

## Architettura

```
Browser
 ├─ index.html ─────────── struttura, fascia proposta, sezioni narrative
 ├─ src/main.js ────────── boot: choreo + shader + produttori + cartina
 │   ├─ choreo.js ──────── coreografia dichiarativa (data-beat + IntersectionObserver)
 │   ├─ shader-setup.js ── OGL: film scrub, precarico, tagli, render loop
 │   ├─ shader.js ──────── fragment shader, 17 modi di transizione (0–16)
 │   ├─ inserti.js ─────── overlay a tratto, chiaro/scuro da luma.json
 │   ├─ linee.js ───────── griglia come scena, non decorazione fissa
 │   └─ cartina.js ─────── cartina interattiva Calabria vinicola
 └─ public/
     ├─ frames/film/ ───── 1737 webp desktop · frames-m/film/ mobile
     ├─ dati/ ──────────── frames · tagli · segmenti · copione · luma · produttori
     ├─ img/ ───────────── texture palco, ceramica, segni, texture
     └─ fonts/ ─────────── 9 woff2 self-hosted
```

## Stack tecnico

- Vite + Tailwind CSS v4
- OGL (WebGL minimo, ~10 KB)
- Nessuna libreria di animazione (no GSAP, no Lenis, no Three.js)
- Nessun `<img>` nel flusso: sequenze e figure come canvas/background (principio «images: 0»)

## Setup

```bash
npm install
npm run dev     # http://localhost:5173/
npm run build   # build di produzione in dist/
```

## Verifiche

Gli script `verify-*.mjs` (radice e `lab/`) controllano scrub, regia, atti e vincoli.
Prima di dire «fatto», la lista di controllo è la tabella delle trappole in
`METODO-pear-no.md` (scroll behavior, hover sul layer di composizione, griglia
agganciata alla scena).

## Vincoli

- Zero marchi di terzi, zero riferimenti a manifestazioni
- Niente loghi né foto di produttori reali, in nessuna forma (decisione registrata nel vault, 2026-08-27)
- Nessun superlativo turistico; tono editoriale, non promozionale
- I nomi di cantine, denominazioni e vitigni appartengono ai rispettivi titolari

## Licenza

Proposta indipendente. Nessuna affiliazione istituzionale, nessun rapporto commerciale in essere.
Nessun asset riusato dal repo `amasun/Pear-no` (metodo sì, file no).
