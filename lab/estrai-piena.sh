set -e
cd "C:/Users/loren/Desktop/dev-projects/oenotria"
SV="_sorgenti/video"; OUT="lab/piena"
rm -rf "$OUT"; mkdir -p "$OUT"
node -e '
const fs=require("fs");
const piano=JSON.parse(fs.readFileSync("lab/piano-estrazione.json","utf8"));
piano.forEach((p,i)=>console.log([String(i).padStart(2,"0"),p.cart,p.file,p.da,p.a].join("\t")));
' > lab/piano.tsv
while IFS=$'\t' read -r idx cart file da a; do
  src="$SV/$file"
  [ -f "$src" ] || { echo "MANCA: $file"; continue; }
  dur=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$src")
  ss=$(awk -v d="$dur" -v x="$da" 'BEGIN{printf "%.3f", d*x}')
  to=$(awk -v d="$dur" -v x="$a"  'BEGIN{printf "%.3f", d*x}')
  mkdir -p "$OUT/$idx"
  ffmpeg -nostdin -v error -y -ss "$ss" -to "$to" -i "$src" -vf "fps=24,scale=1280:-2" "$OUT/$idx/f_%03d.png"
  echo "$cart: $(ls "$OUT/$idx" | wc -l) fotogrammi (era $(printf '%s' "$da")→$(printf '%s' "$a"))"
done < lab/piano.tsv
echo "TOTALE: $(find "$OUT" -name 'f_*.png' | wc -l) fotogrammi dipinti"
