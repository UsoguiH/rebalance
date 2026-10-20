#!/usr/bin/env bash
# QA stills for a piece: renders the moments worth checking (every montage card, each
# beat of the reveal, every scene) and tiles them into one contact sheet, 4 across in
# time order. About 15 s; look at the sheet before rendering the whole film.
#   motion/tools/qa.sh motion/acme            -> motion/frames/acme-qa/sheet.jpg
#   motion/tools/qa.sh motion/acme /tmp/qa
set -euo pipefail
piece=$(cd "${1:?usage: qa.sh motion/<piece> [out-dir]}" && pwd)
slug=$(basename "$piece")
here=$(cd "$(dirname "$0")" && pwd)
out=$(mkdir -p "${2:-$here/../frames/$slug-qa}" && cd "${2:-$here/../frames/$slug-qa}" && pwd)
# intro | 13 montage cards | But, typed line | reveal beats | the line scenes | features | end
TIMES=1.0,1.9,2.6,3.6,4.1,4.55,4.77,4.99,5.2,5.41,5.61,5.81,6.0,6.2,6.45,6.9,7.8,9.2,10.6,11.2,11.8,12.4,14.6,16.3,18.3,19.2,19.9,20.6,21.5,22.4,24.8,26.4
rm -f "$out"/t*.jpg "$out"/sheet.jpg
(cd "$here/.." && node tools/render.js --page "$slug/index.html" --out "$out" --times "$TIMES" --jpeg) | tail -1
# number the stills in time order for the tiler
i=0
for t in ${TIMES//,/ }; do
  cp "$out/t$(printf %.3f "$t").jpg" "$out/seq$(printf %03d $i).jpg"
  i=$((i + 1))
done
ffmpeg -v error -y -i "$out/seq%03d.jpg" -vf "scale=480:-1,tile=4x$(((i + 3) / 4)):padding=6:color=white" -frames:v 1 "$out/sheet.jpg"
rm -f "$out"/seq*.jpg
echo "sheet: $out/sheet.jpg"
echo "times, left to right, top to bottom: $TIMES"
