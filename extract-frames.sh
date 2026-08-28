#!/bin/bash
# Estrae i fotogrammi dai 15 video: desktop (1280×720) e mobile (720p)
PROJ="C:/Users/loren/Desktop/dev-projects/oenotria"
VIDIR="$PROJ/public/video/video prompts"
DESK="$PROJ/public/frames"
MOB="$PROJ/public/frames-m"

# Contatori per il report
DESK_TOTAL=0
MOB_TOTAL=0
DESK_SIZES=()
MOB_SIZES=()

for i in $(seq 1 15); do
  NN=$(printf "%02d" $i)
  IN="$VIDIR/$i.mp4"
  OUTD="$DESK/$NN"
  OUTM="$MOB/$NN"

  echo "=== Scena $NN ==="

  # Desktop: fps=24, quality=62, 1280×720 (gia' nativo)
  ffmpeg -y -i "$IN" -vf "fps=24,scale=1280:-2" -c:v libwebp -quality 62 "$OUTD/%04d.webp" 2>/dev/null

  # Mobile: fps=24, quality=42, scale=720
  ffmpeg -y -i "$IN" -vf "fps=24,scale=720:-2" -c:v libwebp -quality 42 "$OUTM/%04d.webp" 2>/dev/null

  # Conta e dimensioni
  DESK_COUNT=$(ls "$OUTD"/*.webp 2>/dev/null | wc -l)
  MOB_COUNT=$(ls "$OUTM"/*.webp 2>/dev/null | wc -l)

  DESK_SIZE=$(du -sk "$OUTD" 2>/dev/null | cut -f1)
  MOB_SIZE=$(du -sk "$OUTM" 2>/dev/null | cut -f1)

  DESK_TOTAL=$((DESK_TOTAL + DESK_SIZE))
  MOB_TOTAL=$((MOB_TOTAL + MOB_SIZE))

  echo "  Desktop: $DESK_COUNT frames, ${DESK_SIZE}KB"
  echo "  Mobile:  $MOB_COUNT frames, ${MOB_SIZE}KB"

  DESK_SIZES+=("$DESK_SIZE")
  MOB_SIZES+=("$MOB_SIZE")
done

echo ""
echo "=== TOTALE ==="
echo "Desktop: ${DESK_TOTAL}KB ($(( DESK_TOTAL / 1024 ))MB)"
echo "Mobile:  ${MOB_TOTAL}KB ($(( MOB_TOTAL / 1024 ))MB)"
echo ""
echo "=== PER SCENA (desktop) ==="
for i in $(seq 0 14); do
  NN=$(printf "%02d" $((i+1)))
  echo "  Scena $NN: ${DESK_SIZES[$i]}KB"
done
echo ""
echo "=== PER SCENA (mobile) ==="
for i in $(seq 0 14); do
  NN=$(printf "%02d" $((i+1)))
  echo "  Scena $NN: ${MOB_SIZES[$i]}KB"
done
