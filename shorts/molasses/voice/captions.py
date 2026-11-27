# Word captions without ASR: words spread over each sentence's exact span by syllable weight (+ a beat after commas),
# then short words paired (one or two words on screen, as in the reference style). Writes captions.json.
import json, re
segs = json.load(open("voice/segments.json"))
NUM = {"1919": 4}
def syl(w):
    w0 = re.sub(r"[^A-Za-z0-9-]", "", w)
    if w0 in NUM: return NUM[w0]
    n = 0
    for part in w0.lower().split("-"):
        v = re.findall(r"[aeiouy]+", part)
        c = len(v) - (1 if part.endswith("e") and len(v) > 1 and not part.endswith("le") else 0)
        n += max(1, c)
    return max(1, n)
words = []
for s in segs:
    ws = s["text"].split()
    wt = [syl(w) + (0.6 if w.endswith(",") else 0) + 0.35 for w in ws]
    T = s["end"] - s["start"]; acc = s["start"]; tot = sum(wt)
    for w, x in zip(ws, wt):
        d = T * x / tot; words.append({"w": w, "a": round(acc, 3), "b": round(acc + d, 3)}); acc += d
caps = []; i = 0
while i < len(words):
    w = words[i]
    if i + 1 < len(words):
        n = words[i + 1]; same = abs(n["a"] - w["b"]) < 0.05
        short = len(re.sub(r"\W", "", w["w"])) <= 2 or len(re.sub(r"\W", "", n["w"])) <= 2
        if same and short and not w["w"][-1] in ".,?!" and len(w["w"]) + len(n["w"]) <= 11:
            caps.append({"t": w["w"] + " " + n["w"], "a": w["a"], "b": n["b"]}); i += 2; continue
    caps.append({"t": w["w"], "a": w["a"], "b": w["b"]}); i += 1
json.dump(caps, open("voice/captions.json", "w"), indent=0)
print(len(words), "words ->", len(caps), "captions"); print([c["t"] for c in caps[:30]])
