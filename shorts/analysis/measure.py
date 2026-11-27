# Measure a vertical short frame by frame at 30 fps: cuts/flashes/dissolves, camera motion (phase correlation),
# light/contrast/colour (luma, saturation, warm/cool, shadow + highlight colour), caption position and swap rate,
# audio loudness and pauses. Usage: python3 -I measure.py <video> <out.json>
import sys, json, subprocess, numpy as np
V, OUT = sys.argv[1], sys.argv[2]
W, H = 144, 256
raw = subprocess.run(["ffmpeg", "-v", "error", "-i", V, "-vf", f"fps=30,scale={W}:{H}", "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], capture_output=True).stdout
fr = np.frombuffer(raw, np.uint8).reshape(-1, H, W, 3).astype(np.float32) / 255
n = len(fr); R, G, B = fr[..., 0], fr[..., 1], fr[..., 2]
Y = 0.2126 * R + 0.7152 * G + 0.0722 * B
mx, mn = fr.max(-1), fr.min(-1); S = np.where(mx > 1e-3, (mx - mn) / np.maximum(mx, 1e-3), 0)
# exclude the caption band (60-80 % height) from picture stats
band = np.ones((H, W), bool); band[int(H * .6):int(H * .8)] = False
def pct(a, q): return float(np.percentile(a, q))
per = []
for i in range(n):
    y = Y[i][band]; c = fr[i][band]
    lo = y <= np.percentile(y, 10); hi = y >= np.percentile(y, 90)
    per.append(dict(mean=float(y.mean()), std=float(y.std()), p2=pct(y, 2), p98=pct(y, 98), sat=float(S[i][band].mean()),
                    warm=float((c[:, 0] - c[:, 2]).mean()), shadow=c[lo].mean(0).round(3).tolist(), hi=c[hi].mean(0).round(3).tolist()))
# frame differences, hist distance -> cuts / flashes / dissolves
d = np.array([0.0] + [float(np.abs(Y[i] - Y[i - 1]).mean()) for i in range(1, n)])
def hist(y): h, _ = np.histogram(y, 32, (0, 1)); return h / h.sum()
hd = np.array([0.0] + [float(0.5 * np.abs(hist(Y[i]) - hist(Y[i - 1])).sum()) for i in range(1, n)])
med = np.array([np.median(d[max(0, i - 15):i + 16]) for i in range(n)])
spikes = [i for i in range(1, n) if d[i] > max(0.06, 4 * med[i])]
flashes = [i for i in range(1, n) if per[i]["mean"] - per[i - 1]["mean"] > 0.15]
cuts = [i for i in spikes if hd[i] > 0.35 and i not in flashes]
# camera motion: phase correlation between consecutive frames (luma, centre crop above the captions)
def shift(a, b):
    A, Bf = np.fft.fft2(a), np.fft.fft2(b); X = A * np.conj(Bf); X /= np.abs(X) + 1e-9
    r = np.abs(np.fft.ifft2(X)); k = np.unravel_index(r.argmax(), r.shape)
    dy, dx = [k[j] if k[j] < r.shape[j] / 2 else k[j] - r.shape[j] for j in (0, 1)]
    return float(np.hypot(dx, dy)), float(r.max())
W2, H2 = 360, 640
raw2 = subprocess.run(["ffmpeg", "-v", "error", "-i", V, "-vf", f"fps=30,scale={W2}:{H2},format=gray", "-f", "rawvideo", "-"], capture_output=True).stdout
Y2 = np.frombuffer(raw2, np.uint8).reshape(-1, H2, W2).astype(np.float32) / 255
win = np.outer(np.hanning(int(H2 * .55)), np.hanning(W2))
mv = [0.0] + [shift(Y2[i][: int(H2 * .55)] * win, Y2[i - 1][: int(H2 * .55)] * win)[0] for i in range(1, min(n, len(Y2)))]
mv = np.array(mv + [0.0] * (n - len(mv))) * (720 / W2)  # px/frame at 720 wide
# move bursts: runs of frames moving > 1 px; profile = speed in the run's first 8 frames
runs, cur = [], []
for i, m in enumerate(mv):
    if m > 1.0 and i not in set(cuts): cur.append(m)
    elif cur: runs.append(cur); cur = []
if cur: runs.append(cur)
runs = [r for r in runs if len(r) >= 3]
peak_at = [int(np.argmax(r)) for r in runs]
cutset = set(cuts) | set(flashes)
mvc = np.array([m for i, m in enumerate(mv) if i not in cutset])
# shot lengths between hard cuts
b = [0] + cuts + [n]; shots = [(b[i + 1] - b[i]) / 30 for i in range(len(b) - 1)]
# caption band: count frames where the band changes strongly (word swaps)
cb = Y2[:, int(H2 * .64):int(H2 * .78), int(W2 * .08):int(W2 * .92)]
wm = cb > 0.93
white = wm.mean((1, 2))
swaps = [i for i in range(1, len(wm)) if (wm[i] ^ wm[i - 1]).mean() > 0.35 * max(wm[i].mean(), wm[i - 1].mean(), 1e-4) and max(wm[i].mean(), wm[i - 1].mean()) > 0.004]
caps_dur = np.diff([0] + swaps + [len(wm)]) / 30
rows = (Y[:, :, int(W * .2):int(W * .8)] > 0.95).mean(2)  # white-pixel share per row
capy = int(np.argmax(np.median(rows, 0)[int(H * .3):int(H * .95)])) + int(H * .3)
# audio
au = subprocess.run(["ffmpeg", "-i", V, "-af", "ebur128=peak=true", "-f", "null", "-"], capture_output=True, text=True).stderr
I = float(au.split("I:")[-1].split("LUFS")[0]); LRA = float(au.split("LRA:")[-1].split("LU")[0])
sil = subprocess.run(["ffmpeg", "-i", V, "-af", "silencedetect=n=-35dB:d=0.25", "-f", "null", "-"], capture_output=True, text=True).stderr
sil_n = sil.count("silence_end")
A = lambda k: np.array([p[k] for p in per])
res = dict(video=V.split("/")[-1], frames=n, seconds=round(n / 30, 2),
  luma=dict(mean=round(float(np.median(A("mean"))), 3), std=round(float(np.median(A("std"))), 3), p2=round(float(np.median(A("p2"))), 3), p98=round(float(np.median(A("p98"))), 3),
            mean_range=[round(float(A("mean").min()), 3), round(float(A("mean").max()), 3)]),
  saturation=round(float(np.median(A("sat"))), 3), warm_minus_blue=round(float(np.median(A("warm"))), 3),
  shadow_rgb=np.median(np.array([p["shadow"] for p in per]), 0).round(3).tolist(), highlight_rgb=np.median(np.array([p["hi"] for p in per]), 0).round(3).tolist(),
  hard_cuts=len(cuts), cut_frames=cuts, flashes=len(flashes), flash_frames=flashes, median_shot_s=round(float(np.median(shots)), 2), shots_s=[round(s, 2) for s in shots],
  motion=dict(still_pct=round(float((mvc < 0.5).mean() * 100), 1), moving_pct=round(float((mvc >= 0.5).mean() * 100), 1), median_px=round(float(np.median(mvc)), 2),
              p90_px=round(float(np.percentile(mvc, 90)), 2), max_px=round(float(mvc.max()), 1), fast_pct=round(float((mvc > 8).mean() * 100), 1)),
  captions=dict(swaps=len(swaps), swaps_per_s=round(len(swaps) / (n / 30), 2), median_on_s=round(float(np.median(caps_dur)), 2), band_row_pct=round(capy / H * 100, 1), white_px_pct=round(float(np.median(white)) * 100, 2), swap_frames=swaps),
  move_bursts=dict(count=len(runs), per_min=round(len(runs) / (n / 1800), 1), median_len_f=int(np.median([len(r) for r in runs])) if runs else 0, peak_in_first_2f_pct=round(100 * float(np.mean([p <= 1 for p in peak_at])), 1) if runs else 0,
    median_peak_px=round(float(np.median([max(r) for r in runs])), 1) if runs else 0),
  audio=dict(LUFS=I, LRA=LRA, pauses_over_250ms=sil_n),
  timeline=[dict(t=round(i / 30, 1), luma=round(per[i]["mean"], 3), sat=round(per[i]["sat"], 3), warm=round(per[i]["warm"], 3)) for i in range(0, n, 30)])
json.dump(res, open(OUT, "w"), indent=1)
print(json.dumps({k: v for k, v in res.items() if k not in ("timeline", "shots_s", "cut_frames", "flash_frames")} | {"captions": {k2: v2 for k2, v2 in res["captions"].items() if k2 != "swap_frames"}}))
