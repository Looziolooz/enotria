set -e
cd "C:/Users/loren/Desktop/dev-projects/oenotria"
OUT="public/frames/film"; OUTM="public/frames-m/film"
rm -rf "$OUT" "$OUTM"; mkdir -p "$OUT" "$OUTM"

# Lista in formato concat: UNA sola chiamata ffmpeg per set, invece di
# una per fotogramma. Git Bash non regge migliaia di fork (Win32 299).
CC="lab/concat.txt"; : > "$CC"
while IFS= read -r f; do
  printf "file '%s'\nduration 0.04\n" "$(cygpath -m -a "$f" 2>/dev/null || echo "$f")" >> "$CC"
done < lab/ordine-film.txt
tail -1 lab/ordine-film.txt | while IFS= read -r f; do
  printf "file '%s'\n" "$(cygpath -m -a "$f" 2>/dev/null || echo "$f")" >> "$CC"
done

echo "== desktop =="
ffmpeg -nostdin -v error -y -f concat -safe 0 -i "$CC" \
  -vf "scale=1280:-2" -c:v libwebp -quality 62 -start_number 1 "$OUT/%04d.webp"
echo "== mobile =="
ffmpeg -nostdin -v error -y -f concat -safe 0 -i "$CC" \
  -vf "scale=720:-2" -c:v libwebp -quality 58 -start_number 1 "$OUTM/%04d.webp"

echo "desktop: $(ls "$OUT" | wc -l) · mobile: $(ls "$OUTM" | wc -l)"
du -sh "$OUT" "$OUTM"
