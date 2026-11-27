#!/bin/bash
# "Twice" (atom short): fetch the 13 full-res chunks (render/atom-*; local files in out/atom/parts win), join, mux the mix.
set -e
cd "$(dirname "$0")/.."
P=out/atom/parts; mkdir -p $P
ORDER="0-156 157-313 314-470 471-627 628-784 785-941 942-1097 1098-1254 1255-1411 1412-1568 1569-1725 1726-1882 1883-2039"
# 1726-1882 was re-rendered as two halves (local 1726-1803 + render/atom-1804-1882).
if [ ! -s $P/part_1726-1882.mp4 ]; then
  [ -s $P/half_1804-1882.mp4 ] || { git -C ../.. fetch --depth=1 origin render/atom-1804-1882 &&
    git -C ../.. show FETCH_HEAD:shorts/renders/part_1804-1882.mp4 > $P/half_1804-1882.mp4; }
  printf "file 'half_1726-1803.mp4'\nfile 'half_1804-1882.mp4'\n" > $P/halves.txt
  ffmpeg -v error -y -f concat -safe 0 -i $P/halves.txt -c copy $P/part_1726-1882.mp4
fi
for R in $ORDER; do
  [ -s $P/part_$R.mp4 ] && continue
  git -C ../.. fetch --depth=1 origin render/atom-$R
  git -C ../.. show FETCH_HEAD:shorts/renders/part_$R.mp4 > $P/part_$R.mp4
done
( for R in $ORDER; do echo "file 'part_$R.mp4'"; done ) > $P/list.txt
ffmpeg -v error -y -f concat -safe 0 -i $P/list.txt -c copy out/atom/video.mp4
ffmpeg -v error -y -i out/atom/video.mp4 -i ../atomic/audio/mix.wav -map 0:v:0 -map 1:a:0 \
  -c:v libx264 -b:v 9M -maxrate 12M -bufsize 18M -preset slow -pix_fmt yuv420p -c:a aac -b:a 192k -shortest \
  ../atomic/Twice.mp4
ffprobe -v error -show_entries format=duration,size:stream=width,height,nb_frames -of compact ../atomic/Twice.mp4
