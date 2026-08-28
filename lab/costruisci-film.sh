set -e
cd "C:/Users/loren/Desktop/dev-projects/oenotria"
SRC="_sorgenti/video/tutti-frames"
HF="lab/hf-transizioni"
OUT="public/frames/film"
OUTM="public/frames-m/film"
rm -rf "$OUT" "$OUTM"; mkdir -p "$OUT" "$OUTM"

# 1) ordine: i fotogrammi del committente, piu' le transizioni ai suoi punti
LISTA="lab/ordine-film.txt"; : > "$LISTA"
# LA TRAVERSATA APRE IL FILM: si arriva dal mare, e solo dopo si vede
# la costa terrazzata che i Greci trovarono.
# un fotogramma su due: la traversata passa da 25,6 a 12,8 schermate,
# e tutto il racconto dipinto raddoppia di respiro.
ls "$HF/enotro"/a_*.png | sort | awk 'NR%2==1' >> "$LISTA"
ls "$HF/enotro"/b_*.png | sort | awk 'NR%2==1' >> "$LISTA"
for f in $(ls "$SRC" | sort); do
  n=$(echo "$f" | sed 's/ezgif-frame-\([0-9]*\)\.png/\1/')
  echo "$SRC/$f" >> "$LISTA"
  case "$n" in
    039) echo "$HF/pietra-1.png" >> "$LISTA"; for i in $(seq 2 12); do echo "$HF/pietra-t$i.png" >> "$LISTA"; done; echo "$HF/pietra-5.png" >> "$LISTA";;
  esac
done
# la cantina moderna: il tuo montaggio l'aveva persa (clip 13, 14, 15
# assenti da tutti-frames). La recupero dal video originale.
ls "$HF/cantina"/c_*.png | sort | awk 'NR%2==1' >> "$LISTA"
echo "$HF/t8.png" >> "$LISTA"
TOT=$(wc -l < "$LISTA")
echo "totale fotogrammi: $TOT"

# 2) misura la luminanza media di ognuno
LUMA="lab/luma.txt"; : > "$LUMA"
while read -r p; do
  v=$(ffmpeg -nostdin -v error -i "$p" -vf "scale=1:1" -f rawvideo -pix_fmt gray - 2>/dev/null | od -An -tu1 | tr -d ' \n')
  echo "${v:-128}" >> "$LUMA"
done < "$LISTA"
MED=$(sort -n "$LUMA" | awk '{a[NR]=$1} END{print a[int(NR/2)+1]}')
echo "luminanza mediana: $MED"

# 3) converti equalizzando: ogni fotogramma entro il 6% dalla mediana
i=0
paste -d'|' "$LISTA" "$LUMA" | while IFS='|' read -r p l; do
  i=$((i+1)); nn=$(printf "%04d" $i)
  lo=$(( MED * 94 / 100 )); hi=$(( MED * 106 / 100 ))
  b=0
  if [ "$l" -lt "$lo" ]; then b=$(( (lo - l) )); fi
  if [ "$l" -gt "$hi" ]; then b=$(( -(l - hi) )); fi
  bf=$(awk -v x=$b 'BEGIN{printf "%.4f", x/255}')
  ffmpeg -nostdin -v error -y -i "$p" -vf "eq=brightness=$bf,scale=1280:-2" -c:v libwebp -quality 62 "$OUT/$nn.webp"
  ffmpeg -nostdin -v error -y -i "$p" -vf "eq=brightness=$bf,scale=720:-2"  -c:v libwebp -quality 58 "$OUTM/$nn.webp"
done
echo "conversione finita: $(ls "$OUT" | wc -l) desktop, $(ls "$OUTM" | wc -l) mobile"
du -sh "$OUT" "$OUTM"
