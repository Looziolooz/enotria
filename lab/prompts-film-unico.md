# Œnotria — il film unico. Prompt di mondo, scene e staffetta

Rifacimento completo del film con il metodo pear.no applicato davvero: **una storia sola,
un mondo pittorico solo, e ogni scena che consegna fisicamente qualcosa alla successiva**
(come lo scambio della pera). Le giunzioni non si mascherano più con lo shader: si
costruiscono in generazione, con il **keyframe condiviso**.

---

## 1 · Il meccanismo che elimina le discrepanze

```
scena N                                scena N+1
[keyframe A] ──video──▶ [keyframe B] = [keyframe B] ──video──▶ [keyframe C]
```

1. Si generano prima **tutti i fotogrammi chiave** (immagini fisse), in ordine, ognuno
   derivato dal precedente. Si approvano le immagini PRIMA di spendere crediti video.
2. Ogni clip si genera **image-to-video con primo E ultimo fotogramma fissati**
   (start frame + end frame). Così l'ultimo fotogramma della clip N è pixel-per-pixel
   il primo della clip N+1: la concatenazione è perfetta per costruzione.
3. Movimenti **lenti, un solo gesto per clip, una sola mossa di camera** (o nessuna).
   È il ritmo pear.no: slow-motion pittorico, mai azione concitata.
4. La pipeline a valle non cambia: mp4 → `extract-frames` a 24 fps → film flat →
   scrub. `tagli.json` si riduce ai soli stacchi voluti (cambio d'atto), non serve più
   a nascondere le cuciture.

---

## 2 · Lo scheletro di mondo (da premettere a OGNI prompt immagine)

Ordine pear.no: forma d'uscita → stile → negativi di media → àncora colore → poi la scena.
Del metodo pear.no riusiamo il meccanismo, **non la palette esatta** (regola del vault):
il cerulean è loro; i nostri ancoraggi sono lo Ionio e l'oro del vino.

```
SKELETON — incollare all'inizio di ogni prompt immagine:

A wide cinematic scene painted as a single NEOCLASSICAL OIL PAINTING: smooth painterly
rendering in the manner of Ingres and Jacques-Louis David, elegant idealized forms,
soft controlled brushwork, NOT pixel art, NOT cross-stitch, NOT photograph, NOT 3D render.
A flat saturated deep Ionian teal sky fills the canvas edge to edge, no gradient,
no vignette, no clouds. Color anchors: deep Ionian teal (background), warm amber-gold
(wine, grapes' bloom, key object), terracotta red (sashes, pottery), warm white marble
and off-white linen (figures, architecture), dark olive green (vine leaves).
From the key golden object, thin concentric GREEK MEANDER-PATTERN rings in pale gold
ripple outward across the flat sky like a signal, thinning as they spread.
A single small area where the paint dissolves into black-and-terracotta red-figure
pottery texture, inside one ring segment only — nowhere else.
Generous empty flat teal sky reserved in the UPPER LEFT for interface text.
No text anywhere, no letters, no watermark.
```

Note operative:
- **UPPER LEFT** = zona franca per titoli/copione: coerente col layout attuale del sito.
- La **greca** sostituisce gli anelli halftone della pera: stesso ruolo (linguaggio-segnale
  ripetibile), simbolo nostro — e si aggancia agli ornamenti già in `src/inserti.js`.
- L'**anomalia unica** (vernice che si sgrana in ceramica a figure rosse) sostituisce il
  rainbow glitch: una sola, piccola, sempre dentro un segmento di anello.
- Nelle scene di interno (cantina) il cielo teal non c'è: l'àncora resta nel testo come
  «flat deep teal shadow field» al posto del nero — vedi scena 9.

---

## 3 · Il cast (descrizioni FISSE — copiare alla lettera, mai riformulare)

```
THE HARVESTER: a young woman in a white linen chiton with a terracotta-red sash at the
waist, dark hair gathered low at the neck, bare arms, standing among vine rows.

THE CARRIER: a young man in a short off-white exomis leaving one shoulder bare, a plain
leather belt, short dark curly hair, strong forearms.

THE CELLARMAN: an older bearded man in a darker olive-brown himation draped over one
shoulder, weathered hands, calm deliberate movements.
```

```
THE BASKET: a wide low wicker basket with two side handles, heaped with black grapes
with a dusty amber-gold bloom.

THE AMPHORA: a tall terracotta amphora with two vertical handles and a narrow foot,
unglazed, with a single painted meander band at the shoulder.
```

## 4 · Gli ambienti (FISSI — copiare alla lettera)

```
ENV-SEA: open Ionian sea rendered as flat layered teal bands, a single Greek ship with
one square off-white sail, thin gold wave lines like a meander pattern.

ENV-VINEYARD: terraced vineyard on a hillside above the flat teal sea, low dry-stone
walls, vine rows with dark olive leaves and black grape clusters, warm afternoon light
coming from the sea side (screen left), one white marble column on the ridge.

ENV-YARD: a sunlit stone courtyard beside the vineyard, a waist-high square stone
pressing vat with a spout, terracotta amphorae standing along a warm white wall,
the flat teal sky above the wall, light still from screen left.

ENV-CELLAR: a cool dark cellar with amphorae buried to their shoulders in the earth
floor in two rows, one single shaft of warm golden light falling from a high opening,
deep teal shadow field instead of black.
```

Regole di continuità valide OVUNQUE:
- luce **sempre da sinistra** (dal mare) — mai cambiare lato;
- camera sempre dallo stesso lato dell'azione (regola dei 180°): la staffetta si muove
  **da sinistra verso destra** per tutto il film;
- un solo gesto per scena, slow motion, «figures move with slow ceremonial calm»;
- niente volti in primo piano ravvicinato (deriva dei volti = discrepanza garantita).

---

## 5 · La storia — staffetta in 10 scene

| # | Scena | Oggetto-staffetta | Giunzione con la successiva |
|---|-------|-------------------|------------------------------|
| 1 | Il mare e la nave | la nave | stacco d'atto (tenuto morbido) |
| 2 | Lo sbarco | l'anfora scaricata | keyframe condiviso |
| 3 | La vite trovata | la mano verso il grappolo | **match cut** sulla mano |
| 4 | La raccolta | il grappolo staccato | keyframe condiviso |
| 5 | Lo scambio di mano | il grappolo passa | keyframe condiviso |
| 6 | Il trasporto del cesto | il cesto | keyframe condiviso |
| 7 | La pigiatura | il mosto che cola | keyframe condiviso |
| 8 | L'anfora spalleggiata | l'anfora piena | keyframe condiviso |
| 9 | La cantina | l'anfora interrata | dissolvenza lenta |
| 10 | Il presente | il calice d'oro | chiusa |

Atto I (1–3) è la parte iniziale che già piace, ristilizzata. Atto II (4–8) è la
staffetta della vendemmia. Atto III (9–10) chiude su cantina e presente.

---

## 6 · Le scene — keyframe e prompt video

Convenzione: **KF-n.A** = primo fotogramma della scena n; **KF-n.B** = ultimo.
Dove c'è keyframe condiviso, **KF-n.B è KF-(n+1).A: si genera UNA volta e si riusa il
file**, non si rigenera. Ogni prompt immagine = `SKELETON + ENV + CAST + righe qui sotto`.

### Scena 1 — Il mare e la nave  *(ENV-SEA)*
- **KF-1.A**: `The ship far away, small, high on the horizon line, sails toward the lower
  right. Meander rings ripple from the golden sun low over the sea.`
- **KF-1.B**: `The same ship much closer, crossing the middle of the canvas, sail full,
  thin gold wave lines beneath the hull.`
- **VIDEO** (5s): `The ship glides slowly from the distance toward the viewer across flat
  teal water bands, sail swelling gently, gold wave lines drifting; slow ceremonial pace,
  camera locked, painterly texture stable, no flicker.`

### Scena 2 — Lo sbarco  *(ENV-SEA → riva)*
- **KF-2.A**: `The ship beached at the right edge on a pale shore, THE CARRIER wading
  in shallow water carrying THE AMPHORA on one shoulder toward the left, two robed
  figures behind him unloading.`
- **KF-2.B**: `THE CARRIER at the left edge stepping onto the shore, amphora on his
  shoulder, the terraced hillside of ENV-VINEYARD rising behind him.`
- **VIDEO** (5s): `The figure wades slowly ashore left, water rippling in flat painted
  bands, the others move gently behind; camera locked, slow ceremonial pace.`

### Scena 3 — La vite trovata  *(ENV-VINEYARD)*
- **KF-3.A**: `Wide: THE HARVESTER standing among the vine rows, discovering wild vines
  heavy with black grapes; the marble column on the ridge, sea flat behind.`
- **KF-3.B**: `Medium close: her bare arm reaching toward one hanging black grape
  cluster with amber-gold bloom, fingers almost touching it, vine leaves around.`
- **VIDEO** (4s): `Slow push-in from wide to medium as she raises her arm toward the
  cluster; leaves sway barely; nothing else moves.`

### Scena 4 — La raccolta  *(ENV-VINEYARD · match cut dalla 3)*
- **KF-4.A**: **= KF-3.B** (stessa immagine, stessa inquadratura).
- **KF-4.B**: `The cluster detached, held up in her hand against the flat teal sky,
  meander rings rippling outward from the cluster.`
- **VIDEO** (4s): `Her fingers close on the stem, the cluster comes free in slow motion,
  she lifts it against the sky; the meander rings breathe outward once; camera locked.`

### Scena 5 — Lo scambio di mano  *(ENV-VINEYARD · il momento-pera)*
- **KF-5.A**: **= KF-4.B**, con in più: `a second hand — THE CARRIER's — entering from
  the right edge, open.`
- **KF-5.B**: `Both figures in profile, her hand laying the cluster into his open hand
  above THE BASKET heaped with grapes, held between them.`
- **VIDEO** (5s): `The cluster passes slowly from her hand to his, both figures in calm
  profile, and comes to rest on the heaped basket; slow ceremonial exchange, camera locked.`
  *(La scena-firma: se una sola clip merita una take in più, è questa.)*

### Scena 6 — Il trasporto  *(ENV-VINEYARD → ENV-YARD)*
- **KF-6.A**: **= KF-5.B**.
- **KF-6.B**: `THE CARRIER walking away along the terrace path toward the right, basket
  held against his hip, the stone courtyard of ENV-YARD visible ahead at the right edge.`
- **VIDEO** (5s): `He turns with the basket and walks the terrace path above the flat
  sea toward the courtyard; slow steady walk, camera tracks gently right at his pace.`

### Scena 7 — La pigiatura  *(ENV-YARD)*
- **KF-7.A**: `THE CARRIER tipping the basket of grapes into the stone pressing vat;
  THE HARVESTER already inside the vat, holding a wooden rail, chiton knotted at the knee.`
- **KF-7.B**: `Her feet pressing the grapes; a stream of amber-gold must flowing from
  the vat's spout into THE AMPHORA set below it, meander rings rippling from the stream.`
- **VIDEO** (5s): `Grapes tumble slowly into the vat, she treads with slow rhythmic
  steps, the golden must begins to flow from the spout; camera drifts slightly down
  toward the amphora; slow ceremonial pace.`

### Scena 8 — L'anfora  *(ENV-YARD · stesso ambiente, come chiesto)*
- **KF-8.A**: **= KF-7.B**, con in più: `THE CELLARMAN entering from the left,
  approaching the filled amphora.`
- **KF-8.B**: `THE CELLARMAN carrying the amphora on his shoulder toward a dark doorway
  in the warm white wall at the right, the doorway interior a deep teal shadow.`
- **VIDEO** (5s): `He stoops, lifts the amphora to his shoulder with slow deliberate
  care and walks toward the dark doorway; camera locked; the others still.`

### Scena 9 — La cantina  *(ENV-CELLAR)*
- **KF-9.A**: `THE CELLARMAN stepping down into the cellar through the shaft of golden
  light, amphora on his shoulder, buried amphorae in rows around him.`
- **KF-9.B**: `Still life: the amphora now set into the earth beside the others, the
  shaft of light falling exactly on its meander band; the man gone.`
- **VIDEO** (6s): `He descends, kneels, settles the amphora into the earth among the
  others and withdraws into the teal shadow; dust motes drift in the light shaft;
  very slow, almost still.`

### Scena 10 — Il presente  *(chiusa)*
- **KF-10.A**: **= KF-9.B**.
- **KF-10.B**: `The same cellar composition, but a single kylix cup of amber-gold wine
  now stands in the light shaft on the earth above the buried amphora; meander rings
  ripple outward from the cup across the teal shadow; upper left kept empty for text.`
- **VIDEO** (6s): `Centuries pass in one slow dissolve of light: the shaft of light
  breathes, and the golden kylix fades into presence in the light; nothing else changes.`

---

## 7 · Ordine di lavorazione e costi

1. **Round immagini** — generare i keyframe in QUESTO ordine (ognuno serve al
   successivo): 1.A, 1.B, 2.A, 2.B, 3.A, 3.B(=4.A), 4.B, 5.A, 5.B(=6.A), 6.B, 7.A,
   7.B(=8.A), 8.B, 9.A, 9.B(=10.A), 10.B → **16 immagini**. Per i keyframe condivisi
   «con in più» (5.A, 8.A): partire dal file dell'immagine base e chiedere solo
   l'aggiunta (edit/inpaint), non rigenerare da zero.
2. **Cancello di approvazione**: si guardano le 16 immagini in fila come contact sheet.
   Coerenza di cast, luce da sinistra, direzione sinistra→destra, anomalia unica.
   Solo dopo l'ok si passa ai video.
3. **Round video** — 10 clip image-to-video con primo+ultimo fotogramma fissati,
   prompt VIDEO qui sopra. 16:9, la durata indicata per scena (4–6s).
4. **Tier mobile**: stesso keyframe, reframe 9:16 (o outpaint verticale) — mai
   rigenerare la scena da capo per il mobile.
5. Poi la pipeline nota: `extract-frames` 24 fps → film flat → `genera-inventario.mjs`.

Costi (ordine di grandezza, da listino Higgsfield noto: ~7,5 crediti per 5s):
16 immagini + 10 clip desktop ≈ **75–90 crediti video + il costo immagini**, prima del
tier mobile. I prompt e le reference **escono dalla rete** via Higgsfield: già accettato
su questo progetto, si ricorda e basta.

⚠️ Vincoli che restano: niente loghi né foto di produttori reali in nessun fotogramma;
niente testo dentro le immagini (il copione resta HTML sopra il film); gli asset finiscono
in `public/` e si registrano in `ASSETS.md` con prompt, data e crediti.
