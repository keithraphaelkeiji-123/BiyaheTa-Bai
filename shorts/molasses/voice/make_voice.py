# Adam (Kokoro am_adam, free, local) reads script.txt sentence by sentence with fixed pauses; writes voice_raw.wav
# and segments.json (exact sentence start/end times, used for picture timing and word captions).
import sys, soundfile as sf, numpy as np, json, re
from kokoro_onnx import Kokoro
D = sys.argv[1]
k = Kokoro(f"{D}/kokoro-v1.0.onnx", f"{D}/voices-v1.0.bin")
SAY = {"1919": "nineteen nineteen"}
sr = 24000
out = [np.zeros(int(0.12 * sr))]; t = 0.12; segs = []
paras = [p for p in open("script.txt").read().split("\n") if p.strip()]
for pi, p in enumerate(paras):
    sents = re.findall(r"[^.?!]+[.?!]", p)
    for si, s in enumerate(sents):
        s = s.strip(); say = s
        for a_, b_ in SAY.items(): say = say.replace(a_, b_)
        a, sr = k.create(say, voice="am_adam", speed=1.07, lang="en-us")
        idx = np.where(np.abs(a) > 0.01)[0]; a = a[max(0, idx[0] - 240): idx[-1] + 480]
        segs.append({"text": s, "para": pi, "start": round(t, 3), "end": round(t + len(a) / sr, 3)})
        out.append(a); t += len(a) / sr
        gap = 0.45 if si == len(sents) - 1 else 0.2
        out.append(np.zeros(int(gap * sr))); t += gap
sf.write("voice/voice_raw.wav", np.concatenate(out), sr)
json.dump(segs, open("voice/segments.json", "w"), indent=0)
print(len(segs), "sentences", round(t, 2), "s", segs[0])
