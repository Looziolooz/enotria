set -e
cd "C:/Users/loren/Desktop/dev-projects/oenotria"
L="lab/ordine-film.txt"; OUT="public/frames/film"; OUTM="public/frames-m/film"
rm -rf "$OUT" "$OUTM"; mkdir -p "$OUT" "$OUTM"
TOT=$(wc -l < "$L"); B=250; n=0
while [ $n -lt $TOT ]; do
  fine=$(( n + B )); [ $fine -gt $TOT ] && fine=$TOT
  CC="lab/blocco.txt"; : > "$CC"
  sed -n "$((n+1)),${fine}p" "$L" | while IFS= read -r f; do
    printf "file '%s'\nduration 0.04\n" "$(cygpath -m -a "$f")" >> "$CC"
  done
  sed -n "${fine}p" "$L" | while IFS= read -r f; do
    printf "file '%s'\n" "$(cygpath -m -a "$f")" >> "$CC"
  done
  ffmpeg -nostdin -v error -y -f concat -safe 0 -i "$CC" -vf "scale=1280:-2" \
    -c:v libwebp -quality 62 -start_number $((n+1)) "$OUT/%04d.webp"
  ffmpeg -nostdin -v error -y -f concat -safe 0 -i "$CC" -vf "scale=720:-2" \
    -c:v libwebp -quality 58 -start_number $((n+1)) "$OUTM/%04d.webp"
  n=$fine
  echo "  $n / $TOT"
done
