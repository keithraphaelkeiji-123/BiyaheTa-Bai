#!/bin/bash
# gather the remote chunks, join with the local one, mux the mix, upscale to 1080x1920
set -e
cd "$(dirname "$0")/.."
P=out/lake/parts540
for R in 512-767 768-1023 1024-1279 1280-1535 1536-1791 1792-2045; do
  [ -f $P/part_$R.mp4 ] && continue
  git -C ../.. fetch --depth=1 origin render/lake-$R
  git -C ../.. show FETCH_HEAD:shorts/renders/part_$R.mp4 > $P/part_$R.mp4
done
cp $P/p_0-511.mp4 $P/part_0-511.mp4
printf "file '%s'\n" part_0-511.mp4 part_512-767.mp4 part_768-1023.mp4 part_1024-1279.mp4 part_1280-1535.mp4 part_1536-1791.mp4 part_1792-2045.mp4 > $P/list.txt
ffmpeg -v error -y -f concat -safe 0 -i $P/list.txt -c copy out/lake/video_540.mp4
ffmpeg -v error -y -i out/lake/video_540.mp4 -i ../lake-peigneur/audio/mix.wav -map 0:v:0 -map 1:a:0 \
  -vf "scale=1080:1920:flags=lanczos" -c:v libx264 -crf 18 -preset slow -pix_fmt yuv420p -c:a aac -b:a 192k -shortest \
  ../lake-peigneur/The_Lake_That_Went_Down_the_Drain.mp4
ffprobe -v error -show_entries format=duration:stream=width,height,nb_frames -of compact ../lake-peigneur/The_Lake_That_Went_Down_the_Drain.mp4
