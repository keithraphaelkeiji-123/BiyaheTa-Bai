#!/bin/bash
# join the 4 chunks, mux the mix, upscale to 1080x1920, run QA
set -e
cd "$(dirname "$0")/.."
P=out/lake/parts
printf "file '%s'\n" p_0-511.mp4 p_512-1023.mp4 p_1024-1535.mp4 p_1536-2045.mp4 > $P/list.txt
ffmpeg -v error -y -f concat -safe 0 -i $P/list.txt -c copy out/lake/video_720.mp4
ffmpeg -v error -y -i out/lake/video_720.mp4 -i ../lake-peigneur/audio/mix.wav -map 0:v:0 -map 1:a:0 \
  -vf "scale=1080:1920:flags=lanczos" -c:v libx264 -crf 18 -preset slow -pix_fmt yuv420p -c:a aac -b:a 192k -shortest \
  ../lake-peigneur/The_Lake_That_Went_Down_the_Drain.mp4
ffprobe -v error -show_entries format=duration:stream=width,height,nb_frames -of compact ../lake-peigneur/The_Lake_That_Went_Down_the_Drain.mp4
