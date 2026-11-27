#!/bin/bash
# renders the lake short in 4 chunks at 720x1280; skips chunks already done
cd "$(dirname "$0")/.."
P='{"post":{"shadow":2048,"dpr":0.5}}'
for R in 0-511 512-1023 1024-1535 1536-2045; do
  O=out/lake/parts540/p_$R.mp4
  [ -f $O.done ] && continue
  node scripts/speed.mjs "$P" 0.5 $R $O 2 > out/lake/parts540/log_$R.txt 2>&1 && touch $O.done
done
echo ALLDONE > out/lake/parts540/ALLDONE
