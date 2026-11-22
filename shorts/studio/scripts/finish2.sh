#!/bin/bash
# v2 (ElevenLabs voice): gather 12 remote chunks + the local one (0-390 re-split after a container restart), mux the new mix, upscale to 1080x1920
set -e
cd "$(dirname "$0")/.."
P=out/lake/el
for R in 56-111 112-167 168-223 224-279 280-335 336-390 391-781 782-1172 1173-1563 1564-1954 1955-2345 2346-2733; do
  [ -s $P/part_$R.mp4 ] && continue
  git -C ../.. fetch --depth=1 origin render/lake2-$R
  git -C ../.. show FETCH_HEAD:shorts/renders/part_$R.mp4 > $P/part_$R.mp4
done
printf "file '%s'\n" part_0-55.mp4 part_56-111.mp4 part_112-167.mp4 part_168-223.mp4 part_224-279.mp4 part_280-335.mp4 part_336-390.mp4 part_391-781.mp4 part_782-1172.mp4 part_1173-1563.mp4 part_1564-1954.mp4 part_1955-2345.mp4 part_2346-2733.mp4 > $P/list.txt
ffmpeg -v error -y -f concat -safe 0 -i $P/list.txt -c copy out/lake/video2_540.mp4
ffmpeg -v error -y -i out/lake/video2_540.mp4 -i ../lake-peigneur/audio/mix.wav -map 0:v:0 -map 1:a:0 \
  -vf "scale=1080:1920:flags=lanczos" -c:v libx264 -crf 18 -preset slow -pix_fmt yuv420p -c:a aac -b:a 192k -shortest \
  ../lake-peigneur/The_Lake_That_Went_Down_the_Drain_v2.mp4
ffprobe -v error -show_entries format=duration:stream=width,height,nb_frames -of compact ../lake-peigneur/The_Lake_That_Went_Down_the_Drain_v2.mp4
