#!/bin/bash
# HD molasses short, pass 3: the street scenes re-rendered with the ground z-fighting fix (render/molhq3-*),
# the lab + court chunks 1470-1763 kept from pass 1 (render/molhq-*). Full 1080x1920, no upscale.
set -e
cd "$(dirname "$0")/.."
P=out/mol/hq3_parts; mkdir -p $P
ORDER="1470-1567 1568-1665 1666-1763 "
for R in $ORDER; do
  [ -s $P/part_$R.mp4 ] && continue
  case " 1470-1567 1568-1665 1666-1763 " in *" $R "*) B=render/molhq-$R;; *) B=render/molhq3-$R;; esac
  git -C ../.. fetch --depth=1 origin $B
  git -C ../.. show FETCH_HEAD:shorts/renders/part_$R.mp4 > $P/part_$R.mp4
done
( for R in $ORDER; do echo "file 'part_$R.mp4'"; done ) > $P/list.txt
ffmpeg -v error -y -f concat -safe 0 -i $P/list.txt -c copy out/mol/video_hq3.mp4
ffmpeg -v error -y -i out/mol/video_hq3.mp4 -i ../molasses/audio/mix.wav -map 0:v:0 -map 1:a:0 \
  -c:v libx264 -b:v 9M -maxrate 12M -bufsize 18M -preset slow -pix_fmt yuv420p -c:a aac -b:a 192k -shortest \
  ../molasses/The_Sweetest_Disaster_HD.mp4
ffprobe -v error -show_entries format=duration,size:stream=width,height,nb_frames -of compact ../molasses/The_Sweetest_Disaster_HD.mp4
