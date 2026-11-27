#!/bin/bash
# "Strong" (seafarer's wife): gather 12 remote chunks + the local one, mux the mix, upscale to 1080x1920
set -e
cd "$(dirname "$0")/.."
P=out/sea/parts
RS="199-397 398-596 597-795 796-994 995-1193 1194-1392 1393-1591 1592-1790 1791-1989 1990-2188 2189-2387 2388-2579"
for R in $RS; do
  [ -s $P/part_$R.mp4 ] && continue
  git -C ../.. fetch --depth=1 origin render/sea-$R
  git -C ../.. show FETCH_HEAD:shorts/renders/part_$R.mp4 > $P/part_$R.mp4
done
( echo "file 'part_0-198.mp4'"; for R in $RS; do echo "file 'part_$R.mp4'"; done ) > $P/list.txt
ffmpeg -v error -y -f concat -safe 0 -i $P/list.txt -c copy out/sea/video_540.mp4
ffmpeg -v error -y -i out/sea/video_540.mp4 -i ../seafarer/audio/mix.wav -map 0:v:0 -map 1:a:0 \
  -vf "scale=1080:1920:flags=lanczos" -c:v libx264 -crf 18 -preset slow -pix_fmt yuv420p -c:a aac -b:a 192k -shortest \
  ../seafarer/Strong_Seafarers_Wife.mp4
ffprobe -v error -show_entries format=duration:stream=width,height,nb_frames -of compact ../seafarer/Strong_Seafarers_Wife.mp4
