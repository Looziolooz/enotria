# Œnotria — keyframe per Gemini (nano banana) · v3

**v3 (2026-08-28).** Regola delle distanze: **campo lunghissimo SOLO nelle prime due
scene** (l'arrivo dal mare). Dalla scena 3 in poi è **tutto ravvicinato** — mezza
figura o dettaglio — perché la storia è fatta di mani e gesti. La distanza non cambia
mai dentro una scena, e nemmeno fra le scene 3–5 (stessa mezza figura: la catena dei
fotogrammi condivisi resta intera). Gli stacchi veri sono solo ai cambi di luogo:
**2→3** (dal mare alla vigna), **6→7** (dalla vigna all'aia), **8→9** (dall'aia alla
cantina).

Tipi di blocco:
- **[GENERA]** → genera da zero. **Allega sempre KF-1.B più il miglior keyframe già
  approvato** come riferimento di stile.
- **[EDIT]** → carica il file indicato e incolla il prompt: modifica un dettaglio,
  MAI l'inquadratura. (Il "riquadra più vicino" via edit non funziona: incolla figure.)
- **[RIUSA]** → stesso file rinominato, zero generazioni.

Salvare come `KF-n.x` in `_sorgenti/video/gemini-foto/`.

## Geografia fissa del mondo (dal round 1: si adotta)

Collina terrazzata e colonna a **sinistra**; mare piatto a **destra**; sole e anelli
a meandro bassi sul mare. Luce sempre da sinistra nelle scene ravvicinate.

## REGOLE FISSE — chiudere OGNI prompt con questo blocco

```
The grape clusters are dark blue-black with a dusty matte bloom — they do NOT glow,
no golden halo, no golden grapes. Nothing floats in the air: every vine grows from the
ground, every object rests on something. The thin pale-gold Greek meander rings stay
flat in the sky, BEHIND everything, radiating from one single point — never in front
of figures, never a spiral tunnel. At most ONE small red-figure pottery patch embedded
inside one ring band, far from the figures, never larger than the sun disc.
Flat saturated deep teal sky edge to edge, no gradient, no clouds.
Empty area in the UPPER LEFT for interface text. No text anywhere.
```

## Stile (testa di ogni prompt [GENERA])

```
A wide cinematic 16:9 scene in a flat graphic neoclassical style, matching EXACTLY the
attached reference images: flat saturated deep teal sky, crisp thin pale-gold Greek
meander rings, landscape and figures painted like a neoclassical oil painting with
soft controlled brushwork, warm afternoon light from the left. NOT a photograph,
NOT a 3D render, NOT pixel art.
```

---

## KF-1.A · KF-1.B — FATTE, si tengono ✔ *(campo lunghissimo)*

## KF-2.A — Lo sbarco · [GENERA — allega KF-1.B]

**Inquadratura: CAMPO LUNGHISSIMO, come la scena 1 — figure alte al massimo un sesto
del quadro. È l'ultima scena da lontano.**

```
[STILE] + EXTREME WIDE SHOT, same distance as the reference image: all figures are
tiny, at most one sixth of the frame height. The Greek ship from the reference is now
beached on a pale shore at the RIGHT edge, sail lowered. Near the ship, two tiny robed
figures unload cargo. A third tiny figure — a young man in a short off-white exomis
with one bare shoulder — walks away from the ship toward the LEFT along the wet shore,
carrying a terracotta amphora on his shoulder. At the far LEFT edge, the first slopes
of a terraced vineyard hill begin to rise. The sun low over the sea, thin meander
rings radiating from it across the sky. [REGOLE FISSE]
```

## KF-2.B — A riva, verso la collina · [EDIT su KF-2.A]

```
Keep this painting exactly as it is — same extreme wide framing, same tiny figure
scale, same beached ship at the right, same sky and rings — and change only this:
the young man with the amphora on his shoulder has walked further left and now stands
at the foot of the terraced vineyard hill at the left edge, seen from behind, starting
to climb the first low dry-stone steps. The two figures by the ship keep unloading.
Do not enlarge any figure, do not move the camera closer. No text anywhere.
```

---

**STACCO 2→3** — dal campo lunghissimo si taglia sulla mezza figura: finisce
l'arrivo, comincia la storia delle mani. Da qui in poi TUTTO è ravvicinato.

## KF-3.A — Fra i filari · [GENERA — allega KF-2.B]

**Inquadratura: MEZZA FIGURA (dalla vita in su) — vale per TUTTE le scene 3–5.**

```
[STILE] + MEDIUM SHOT, waist-up: a young woman in a white linen chiton with a
terracotta-red sash, dark hair gathered low at the neck, seen from the waist up in
profile facing RIGHT, walking slowly between vine rows — she occupies the LEFT half
of the frame. Around and behind her, dark olive vine leaves and hanging dark
blue-black grape clusters with a dusty matte bloom, all growing from vines rooted
below the frame. Behind them, in flat painted planes: the teal sky with thin pale-gold
meander rings and a sliver of flat teal sea at the right. Warm light from the left.
[REGOLE FISSE]
```

## KF-3.B — Davanti al grappolo · [EDIT su KF-3.A]

```
Keep this painting exactly as it is — same medium waist-up framing, same woman, same
vines, same sky — and change only this: she has stopped, and her right arm reaches
toward ONE dark grape cluster hanging from a vine branch at the RIGHT of the frame,
her fingers almost touching the stem. Do not change the framing, do not add any
other figure. No text anywhere.
```

## KF-4.A · [RIUSA il file KF-3.B]

## KF-4.B — Il grappolo staccato · [EDIT su KF-3.B]

```
Keep this painting exactly as it is — same medium waist-up framing, same woman, same
vine branch, same sky — and change only this: the grape cluster is now detached from
the vine, held in her raised hand, still dark blue-black with its dusty matte bloom,
NOT glowing. The vine branch keeps its leaves. Do not change the framing.
No text anywhere.
```

## KF-5.A — La seconda mano · [EDIT su KF-4.B]

```
Keep this painting exactly as it is — same framing, same woman holding the dark grape
cluster — and add only this: from the RIGHT edge enters a young man's bare forearm
with an open hand, palm up, reaching toward the cluster. Nothing else changes.
No text anywhere.
```

## KF-5.B — Lo scambio compiuto · [EDIT su KF-5.A]

```
Keep this painting exactly as it is — same medium framing, same light — and change
only this: the young man is now visible at the RIGHT edge from the waist up — short
off-white exomis with one bare shoulder, plain leather belt, short dark curly hair —
facing the woman in profile. The dark grape cluster now rests in his open hand, held
low over the rim of a wide wicker basket heaped with dark grapes that enters the
frame at the bottom edge. Do not change the framing, do not add other figures.
No text anywhere.
```

## KF-6.A · [RIUSA il file KF-5.B]

## KF-6.B — All'ingresso dell'aia · [GENERA — allega KF-5.B]

**Inquadratura: MEZZA FIGURA in movimento — lui col cesto, arrivato all'aia.**

```
[STILE] + MEDIUM SHOT, waist-up: the same young man from the attached reference —
short off-white exomis with one bare shoulder, plain leather belt, short dark curly
hair — seen from the waist up, walking toward the RIGHT, carrying the wide wicker
basket heaped with dark grapes against his hip. Behind him the vine rows recede;
ahead of him, entering the frame at the RIGHT edge, a warm white stone wall and the
corner of a waist-high stone pressing vat. Teal sky with thin meander rings above.
Warm light from the left. [REGOLE FISSE]
```

---

**STACCO 6→7** — cambio di luogo: dentro l'aia, sulla vasca.

## KF-7.A — Il cesto nella vasca · [GENERA — allega KF-6.B]

**Inquadratura: MEDIO-STRETTA sulla vasca — la vasca riempie il quadro, le figure
tagliate al busto.**

```
[STILE] + MEDIUM-CLOSE SHOT on the stone pressing vat: the waist-high square stone
vat with a spout at its base fills the lower half of the frame. At the LEFT, the
young man in the off-white exomis, cropped at the chest, tips the wicker basket and
pours dark grapes down into the vat. Inside the vat, the young woman in the white
chiton with the terracotta-red sash, the chiton knotted at the knee, cropped at the
waist by the vat's rim, one hand on a wooden rail above it. Behind them the warm
white wall and the teal sky with thin meander rings. Warm light from the left.
[REGOLE FISSE]
```

## KF-7.B — Il mosto cola · [EDIT su KF-7.A]

```
Keep this painting exactly as it is — same medium-close framing on the vat, same
figures — and change only this: the basket is now empty, lowered at the man's side;
the woman treads the grapes inside the vat; and from the vat's spout a thin stream of
warm amber must flows down into a tall terracotta amphora with a painted meander band
set on the ground below the spout. The stream is liquid, matte, NOT glowing light.
Do not change the framing. No text anywhere.
```

## KF-8.A — Entra il cantiniere · [EDIT su KF-7.B]

```
Keep this painting exactly as it is — same framing, same flowing must — and add only
this: from the RIGHT edge enters an older bearded man in a darker olive-brown
himation draped over one shoulder, cropped at the chest like the others, stepping
calmly toward the amphora below the spout. Nothing else changes. No text anywhere.
```

## KF-8.B — L'anfora spalleggiata · [EDIT su KF-8.A]

```
Keep this painting exactly as it is — same framing — and change only this: the older
bearded man now carries the tall amphora with the painted meander band on his
shoulder, turned toward the RIGHT edge where a dark doorway opens in the warm white
wall — its interior a deep teal shadow, not black. The must no longer flows; the
young man and woman rest by the vat, still. Do not change the framing.
No text anywhere.
```

---

**STACCO 8→9** — cambio di luogo: dentro la cantina.

## KF-9.A — La discesa in cantina · [GENERA — allega KF-8.B]

**Inquadratura: MEZZA FIGURA in interno — lui nella lama di luce, le anfore intorno
tagliate dal quadro.**

```
[STILE, senza cielo] + MEDIUM SHOT, waist-up, inside a cool dark cellar: the older
bearded man in the olive-brown himation, seen from the waist up, steps down through
a single shaft of warm golden light falling diagonally from the upper RIGHT, the tall
amphora with the painted meander band on his shoulder. Around him, the shoulders and
necks of terracotta amphorae buried in the earth emerge from the bottom edge of the
frame, in receding rows. The shadows are a deep saturated teal field, NOT black.
Faint thin meander rings in the teal shadow around the light shaft only. Empty teal
shadow in the UPPER LEFT for interface text. No text anywhere.
```

## ⚠ Scena 9 rifatta — il cantiniere resta IN PIEDI

I due file già generati escono dal montaggio (rinominarli, non cancellarli):
- `KF-9.A.png` (inginocchiato sul gradino) → `KF-9-inginocchiato-scartato.png` —
  resta la **base dell'edit** per il nuovo 9.A;
- `KF-9.B.png` (anfora interrata) → `KF-9-interrata-scartata.png` — nel finale nuovo
  l'anfora non si seppellisce, si consegna. Anche `KF-10.A.png` (sua copia) va tolto.

## KF-9.A — In piedi nella luce · [EDIT in Gemini su KF-9-inginocchiato-scartato]

```
Keep this painting exactly as it is — same cellar, same buried amphorae emerging from
the bottom edge, same single shaft of warm golden light from the upper right, same
deep teal shadows — and change only this: the older bearded man now STANDS FULLY
UPRIGHT in the center of the light shaft, both feet planted on the earth floor, legs
straight, NOT kneeling, NOT stepping down, the tall amphora with the painted meander
band still resting on his shoulder, held with one hand. Calm, monumental stance.
Nothing else changes. No text anywhere.
```

## KF-9.B — L'anfora offerta · [EDIT su KF-9.A nuovo]

```
Keep this painting exactly as it is — same cellar, same light shaft, same man standing
fully upright — and change only this: he has lowered the amphora from his shoulder
and now holds it with BOTH hands in front of his chest, slightly forward, like an
offering, still standing straight. The meander band on the amphora catches the golden
light. Nothing else changes. No text anywhere.
```

---

# IL FINALE — Lo scambio fra antichità e modernità (scene 10–12)

L'ultimo passaggio della staffetta: il cantiniere antico consegna l'anfora a un
**vignaiolo moderno**, l'ambiente stacca da antico a moderno **con gli stessi colori**
(ombre teal, luce dorata, terracotta), e i fotogrammi si stringono sempre di più —
il passato esce di quadro. Higgsfield è a 1,85 crediti: **questi frame (i due nuovi
della scena 9 + i 6 del finale) si generano in Gemini**, a catena dal file
`KF-9-inginocchiato-scartato.png`.

**Cast nuovo — IL VIGNAIOLO MODERNO (descrizione fissa, copiare alla lettera):**

⚠️ v2 del volto: la prima versione ("short dark hair with grey at the temples")
somigliava a George Clooney e **Flow blocca i video con volti di celebrità**. Tratti
nuovi scelti apposta per allontanare la somiglianza; il guardrail finale va sempre
incluso.

```
THE MODERN WINEMAKER: a man in his fifties with a broad weathered Mediterranean
farmer's face, a prominent strong nose, deep-set dark eyes under heavy brows, a
short grizzled salt-and-pepper beard, and short cropped receding hair. He wears a
plain off-white shirt with sleeves rolled to the elbow and a dark waxed-cotton work
apron; weathered capable hands. An anonymous invented face, NOT resembling any real
actor, celebrity or public figure. No logos, no writing on the clothes.
```

**Correzione dei frame già generati** (10.B, 11.A, 11.B, 13.A — dove il volto si
vede; 12.A e 12.B sono solo mani e non vanno toccati). Edit su ciascun file, uno
alla volta, SENZA rifare la catena:

```
Keep this painting exactly as it is — same framing, same scene, same clothes, same
light, same everything — and change ONLY the modern winemaker's face and head: give
him a broad weathered Mediterranean farmer's face with a prominent strong nose,
deep-set dark eyes under heavy brows, a short grizzled salt-and-pepper beard, and
short cropped receding hair. An anonymous invented face, NOT resembling any real
actor, celebrity or public figure. Same painting style. Nothing else changes.
No text anywhere.
```

## KF-10.A — Le braccia moderne · [EDIT su KF-9.B nuovo]

```
Keep this painting exactly as it is — same cellar, same framing, same shaft of warm
golden light, same older bearded man standing fully upright holding the amphora with
the painted meander band with both hands in front of his chest — and add only this:
from the RIGHT edge enter two modern arms, in plain off-white shirt sleeves rolled to
the elbow, hands open and extended toward the amphora, ready to receive it. Only the
arms are visible, entering from the right edge. Nothing else changes. No text anywhere.
```

## KF-10.B — Lo scambio dell'anfora · [EDIT su KF-10.A]

La stanza È lo scambio: metà antica, metà moderna, la lama di luce come confine.

```
Keep the same framing, the same shaft of warm golden light in the center, the same
deep saturated teal shadows, and change this: the older bearded man in the olive-brown
himation, at the LEFT, passes the tall amphora with the painted meander band into the
hands of a modern winemaker now visible at the RIGHT from the waist up — a man in his
forties in a plain off-white shirt with sleeves rolled to the elbow and a dark work
apron, short dark hair with grey at the temples. All four hands hold the amphora
together in the light shaft, in calm profile. BEHIND the old man, at the left, the
ancient cellar with buried amphorae; BEHIND the winemaker, at the right, rows of
modern oak barrique barrels emerge from the teal shadow. The light shaft is the
border between the two worlds. Same painting style, same palette. No logos, no text
anywhere.
```

---

**STACCO 10→11** — l'ambiente diventa tutto moderno; da qui inquadrature più strette.

## KF-11.A — Il travaso · [GENERA in Gemini — allega KF-10.B]

**Inquadratura: MEDIO-STRETTA sulla botte — le figure tagliate al petto.**

```
A wide cinematic 16:9 scene in a flat graphic neoclassical style, matching EXACTLY
the palette, brushwork and figures of the attached reference painting, painted like a
neoclassical oil painting, NOT a photograph. MEDIUM-CLOSE SHOT inside a modern winery
cellar: rows of oak barrique barrels on steel racks recede into deep saturated teal
shadows, NOT black; one warm golden light from the upper right. The modern winemaker
from the reference — off-white shirt with rolled sleeves, dark work apron, short dark
hair with grey at the temples — cropped at the chest, tilts the tall terracotta
amphora with the painted meander band over the open round bung of one oak barrel,
and a stream of ruby-red wine flows down from the amphora into the barrel. The
stream is liquid and matte, NOT glowing. The amphora is the only ancient object in
the room. Empty teal shadow in the UPPER LEFT for interface text. No logos, no text
anywhere.
```

## KF-11.B — L'anfora posata · [EDIT su KF-11.A]

```
Keep this painting exactly as it is — same modern cellar, same barrels, same light,
same winemaker — and change only this: the amphora is now empty and set down gently
on the floor beside the barrel, leaning against it; the barrel's bung is closed with
a wooden stopper. His hands rest on the amphora's shoulder for a moment. Nothing
else changes. No text anywhere.
```

---

**STACCO 11→12** — ancora più vicino: solo le mani, il rubinetto, il calice.

## KF-12.A — Il rubinetto della botte · [GENERA in Gemini — allega KF-11.B]

**Inquadratura: STRETTA sulle mani — il passato è ormai fuori quadro.**

```
A wide cinematic 16:9 scene in a flat graphic neoclassical style, matching EXACTLY
the palette and brushwork of the attached reference painting, painted like a
neoclassical oil painting, NOT a photograph. CLOSE SHOT: the head of one oak barrique
barrel fills the LEFT half of the frame, with a small brass tasting tap; the modern
winemaker's hands — rolled off-white sleeves, weathered hands — hold a single modern
stemmed wine glass under the tap, and a thin stream of ruby-red wine runs from the
tap into the glass. The wine is matte, NOT glowing. Behind, out of focus in flat
painted planes, the teal shadows of the cellar and one warm golden light from the
upper right. Faint thin pale-gold meander rings in the teal shadow, behind
everything. Empty teal shadow in the UPPER LEFT for interface text. No logos, no
text anywhere.
```

## KF-12.B — Il calice alzato · [EDIT su KF-12.A]

Il gesto finale rima con la raccolta (4.B): ciò che si è ricevuto, si alza.

```
Keep this painting exactly as it is — same close framing, same barrel with the brass
tap at the left, same teal shadows and golden light — and change only this: the glass
of ruby-red wine is now raised up into the warm light at the RIGHT, held high in his
hand toward the light source, the wine catching the glow but staying matte, NOT
glowing; and thin pale-gold meander rings ripple outward from the raised glass
through the teal shadow, behind everything. No text anywhere.
```

---

**STACCO 12→13** — l'inquadratura si allarga quel tanto da includere il volto: l'unico
momento in cui il vignaiolo si vede bere. Poi l'unico zoom del film: dentro il vino.

## KF-13.A — Il vignaiolo beve · [GENERA in Gemini — allega KF-12.B e KF-11.A]

**Inquadratura: MEDIO-STRETTA di profilo — testa e spalle, il calice alla bocca.**

```
A wide cinematic 16:9 scene in a flat graphic neoclassical style, matching EXACTLY
the palette, brushwork and figure of the attached reference paintings, painted like
a neoclassical oil painting, NOT a photograph. MEDIUM-CLOSE SHOT, head and shoulders
in profile facing LEFT: the modern winemaker — man in his forties, plain off-white
shirt with rolled sleeves, dark work apron, short dark hair with grey at the temples —
drinks calmly from the stemmed glass of ruby-red wine, the glass tilted at his lips,
his eyes closed. Behind him, out of focus in flat painted planes, the deep saturated
teal shadows of the modern cellar with the rows of oak barrels, and the one warm
golden light from the upper right falling on his face and on the glass. The wine is
matte, NOT glowing. Faint thin pale-gold meander rings in the teal shadow, behind
everything. Empty teal shadow in the UPPER LEFT for interface text. No logos, no
text anywhere.
```

## KF-13.B — Dentro il vino · [GENERA in Gemini — allega KF-13.A]

L'ultimo fotogramma È lo sfondo: campo rubino pieno, quasi piatto, che diventa il
background della sezione di pagina dopo il film. Dal file finale si campiona l'HEX
per `styles.css` — la pagina continua il colore del film.

```
An abstract full-frame close-up, matching the painting style and palette of the
attached reference: the camera is now INSIDE the glass of wine. Deep ruby-red wine
fills the ENTIRE 16:9 frame edge to edge — an almost flat saturated ruby color field
with only the faintest painterly texture and a very subtle slow swirl of slightly
darker ruby, like wine settling in the glass. No glass edges visible, no reflections,
no highlights, no vignette, no gradient toward the corners, no other colors. In the
lower right area only, one very faint concentric Greek meander ring in a slightly
deeper ruby tone, barely visible, tone on tone. Nothing else. No text anywhere.
```

---

## Checklist del contact sheet (prima dei video)

1. Campo lunghissimo SOLO in 1 e 2; dalla 3 in poi tutto a mezza figura o più stretto;
   nel finale (10→12) i quadri si stringono ancora: mezza figura → petto → mani.
2. La distanza NON cambia mai dentro una scena; i cambi di scena/distanza (2→3, 6→7,
   8→9, 10→11, 11→12, 12→13) NON sono più stacchi: sono clip-ponte in Flow (v4),
   la camera viaggia da un quadro all'altro.
3. Una sola donna, un solo uomo giovane, un solo anziano, un solo vignaiolo moderno —
   mai figure duplicate.
4. Grappoli e vino scuri e opachi, MAI luminosi; niente oggetti sospesi a mezz'aria.
5. Anelli a meandro dietro tutto, da un solo centro; ceramica piccola solo nell'atto I.
6. Luce da sinistra (in cantina: dall'alto a destra, costante da 9.A in poi).
7. Ombre SEMPRE teal saturo, mai nere — è ciò che tiene insieme antico e moderno.
8. Niente loghi, niente scritte su vestiti, bottiglie o botti — vincolo di progetto.
9. Se un keyframe deriva: rifare SOLO quello (edit sul file buono più vicino).
