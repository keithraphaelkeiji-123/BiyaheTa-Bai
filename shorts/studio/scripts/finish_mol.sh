#!/bin/bash
# "The Sweetest Disaster": gather 12 remote chunks + the local one, mux the mix, upscale to 1080x1920
set -e
cd "$(dirname "$0")/.."
P=out/mol/parts
RS="157-313 314-470 471-627 628-784 785-941 942-1098 1099-1255 1256-1412 1413-1569 1570-1726 1727-1883 1884-2039"
for R in $RS; do
  [ -s $P/part_$R.mp4 ] && continue
  git -C ../.. fetch --depth=1 origin render/mol-$R
  git -C ../.. show FETCH_HEAD:shorts/renders/part_$R.mp4 > $P/part_$R.mp4
done
( echo "file 'part_0-156.mp4'"; for R in $RS; do echo "file 'part_$R.mp4'"; done ) > $P/list.txt
ffmpeg -v error -y -f concat -safe 0 -i $P/list.txt -c copy out/mol/video_540.mp4
ffmpeg -v error -y -i out/mol/video_540.mp4 -i ../molasses/audio/mix.wav -map 0:v:0 -map 1:a:0 \
  -vf "scale=1080:1920:flags=lanczos" -c:v libx264 -crf 18 -preset slow -pix_fmt yuv420p -c:a aac -b:a 192k -shortest \
  ../molasses/The_Sweetest_Disaster.mp4
ffprobe -v error -show_entries format=duration:stream=width,height,nb_frames -of compact ../molasses/The_Sweetest_Disaster.mp4
