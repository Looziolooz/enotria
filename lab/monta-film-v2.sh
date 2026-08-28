#!/bin/bash
# monta-film-v2.sh — Monta il film v2 (catena Flow/Veo) nel formato del runtime:
# estrae i fotogrammi di ogni clip IN ORDINE in public/frames/film (1280, q62)
# e public/frames-m/film (720, q42), numerazione globale continua, e scrive
# lab/film-v2-manifest.json con i confini di ogni segmento.
# Uso: bash lab/monta-film-v2.sh  (dalla radice del progetto)
set -e
PROJ="C:/Users/loren/Desktop/dev-projects/oenotria"
SRC="$PROJ/_sorgenti/video/hf-foto/videoflow"
DESK="$PROJ/public/frames/film"
MOB="$PROJ/public/frames-m/film"
TMP="$PROJ/lab/_tmp-frames"

# Ordine di regia del film v2 — id segmento : file sorgente
CLIPS=(
  "nave:Clip-1.mp4"
  "approdo:clip-2.mp4"
  "vigna:clip-3.mp4"
  "raccolta:clip3-1.mp4"
  "scambio:clip-4.mp4"
  "trasporto:clip-5.mp4"
  "vasca:clip-6.mp4"
  "pigiatura:clip-7.mp4"
  "anfora:clip-8.mp4"
  "porta:clip-9.mp4"
  "mondi:clip-10.mp4"
  "botti:clip-11.mp4"
  "travaso:clip-12.mp4"
  "rubinetto:clip-13.mp4"
  "dentro-il-vino:clip-14.mp4"
)

mkdir -p "$DESK" "$MOB" "$TMP"
rm -f "$DESK"/*.webp "$MOB"/*.webp

N=0
MANIFEST='['
for entry in "${CLIPS[@]}"; do
  ID="${entry%%:*}"; FILE="${entry#*:}"
  rm -f "$TMP"/*.webp
  ffmpeg -y -v error -i "$SRC/$FILE" -vf "fps=24,scale=1280:-2" -c:v libwebp -quality 62 "$TMP/%04d.webp"
  COUNT=$(ls "$TMP"/*.webp | wc -l)
  DA=$((N + 1))
  for f in "$TMP"/*.webp; do
    N=$((N + 1))
    mv "$f" "$DESK/$(printf '%04d' $N).webp"
  done
  # mobile: stessa clip, tier 720
  rm -f "$TMP"/*.webp
  ffmpeg -y -v error -i "$SRC/$FILE" -vf "fps=24,scale=720:-2" -c:v libwebp -quality 42 "$TMP/%04d.webp"
  M=$DA
  for f in "$TMP"/*.webp; do
    mv "$f" "$MOB/$(printf '%04d' $M).webp"
    M=$((M + 1))
  done
  MANIFEST="$MANIFEST{\"id\":\"$ID\",\"sorgente\":\"$FILE\",\"da\":$DA,\"a\":$N,\"n\":$COUNT},"
  echo "  $ID ($FILE): frame $DA-$N ($COUNT)"
done
MANIFEST="${MANIFEST%,}]"
echo "$MANIFEST" > "$PROJ/lab/film-v2-manifest.json"
rmdir "$TMP" 2>/dev/null || true

echo ""
echo "Totale: $N fotogrammi per tier."
echo "Desktop: $(du -sk "$DESK" | cut -f1) KB · Mobile: $(du -sk "$MOB" | cut -f1) KB"
echo "Manifest: lab/film-v2-manifest.json"
