#!/bin/bash
# "The Sweetest Disaster" at full 1080x1920 (no upscale): gather 20 remote chunks + the local one, mux the mix
set -e
cd "$(dirname "$0")/.."
P=out/mol/hq_parts
RS="98-195 196-293 294-391 392-489 490-587 588-685 686-783 784-881 882-979 980-1077 1078-1175 1176-1273 1274-1371 1372-1469 1470-1567 1568-1665 1666-1763 1764-1861 1862-1959 1960-2039"
REDO="1078-1175 1176-1273 1274-1371 1372-1469 1764-1861"  # re-rendered with the dusk/night/judge fixes
for R in $RS; do
  [ -s $P/part_$R.mp4 ] && continue
  B=render/molhq-$R; case " $REDO " in *" $R "*) B=render/molhq2-$R;; esac
  git -C ../.. fetch --depth=1 origin $B
  git -C ../.. show FETCH_HEAD:shorts/renders/part_$R.mp4 > $P/part_$R.mp4
done
( echo "file 'part_0-97.mp4'"; for R in $RS; do echo "file 'part_$R.mp4'"; done ) > $P/list.txt
ffmpeg -v error -y -f concat -safe 0 -i $P/list.txt -c copy out/mol/video_hq.mp4
ffmpeg -v error -y -i out/mol/video_hq.mp4 -i ../molasses/audio/mix.wav -map 0:v:0 -map 1:a:0 \
  -c:v libx264 -b:v 9M -maxrate 12M -bufsize 18M -preset slow -pix_fmt yuv420p -c:a aac -b:a 192k -shortest \
  ../molasses/The_Sweetest_Disaster_HD.mp4
ffprobe -v error -show_entries format=duration,size:stream=width,height,nb_frames -of compact ../molasses/The_Sweetest_Disaster_HD.mp4
