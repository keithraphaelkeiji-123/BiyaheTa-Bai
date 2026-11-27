# Sound for "The Lake That Went Down the Drain": an original score + synthesized SFX timed to the picture
# (studio/src/videos/lake/story.ts), mixed under the voice. Output: mix.wav (48 kHz stereo, exact picture length),
# stems/ and cues.md. Run: python3 -I lake_audio.py  (from this folder)
import sys, os, wave
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from dsp import SR, ns, rng, pan, place, fades, dbg, lp, hp, bp, colored, smooth_noise, integrated, norm_to, read_wav, widen, make_ir, convolve_st
import sfx_gen as G
import instruments as I

import json
WP = json.load(open("../voice/warp.json"))
W = lambda t: float(np.interp(t, WP["old"], WP["new"]))  # old picture time -> new voice time
D = lambda t, d: W(t + d) - W(t)  # a duration starting at old time t, in new time
FPS, TOTAL = 30, WP["total"]
DUR = TOTAL / FPS
N = ns(DUR)
F = I.m2f
cues = []

# ---------------------------------------------------------------- music (original, F major / D minor, 100 bpm)
B = 60 / 100  # beat (s)
mus = np.zeros((2, N))
def note(x, t, p=0.0, g=1.0):
    place(mus, pan(x, p) if x.ndim == 1 else x, W(t), g)
def sec(name, a, b): cues.append(f"| music | {name} | {W(a):.2f}-{W(b):.2f} s |")
r = rng(11)
# hook 0-6.07: bouncy pizzicato riff + vibes
RIFF = [65, 69, 72, 69, 70, 69, 67, 65]
def riff(t0, t1, base=0, vel=0.6, bass=True):
    k, t = 0, t0
    while t < t1 - 0.05:
        note(I.pluck(F(RIFF[k % 8] + base), vel * (1 if k % 2 == 0 else 0.75), r), t, -0.2)
        if bass and k % 2 == 0: note(I.pluck(F([41, 41, 46, 48][(k // 2) % 4] + base), vel * 0.9, r, dur=1.1, bright=0.2), t, 0.1)
        k += 1; t += B / 2
riff(0.0, 6.0)
for k, m in enumerate([77, 81, 84]): note(I.vibes(F(m), 0.45, r), 0.3 + k * 1.8, 0.3)
sec("hook riff", 0, 6.07)
# calm lake 6.1-13: gentle vibes over a slow pluck
for k in range(12): note(I.pluck(F([65, 72, 69, 72][k % 4]), 0.4, r, bright=0.3), 6.1 + k * B, 0.0)
for k, m in enumerate([81, 79, 77, 76]): note(I.vibes(F(m), 0.35, r), 6.3 + k * 1.6, 0.25)
note(I.pad([F(50), F(57), F(62)], D(10.6, 2.4), 0.25, r), 10.6)  # "far below": dark pad under the miners
sec("calm + mine pad", 6.1, 13.0)
# rig 13-19: busy riff, lower
riff(13.0, 19.0, base=-12, vel=0.5)
sec("rig riff", 13.0, 19.0)
# stuck/tilt/jump 19-22: stop; one low stab on stuck and tilt
for t in (19.0, 19.95): note(I.pluck(F(38), 0.9, r, dur=1.4, bright=0.1), t, 0)
# fisherman 22-27.4: tiptoe suspense (staccato low plucks, rising)
for k in range(int((27.4 - 22.1) / (B / 2))): note(I.pluck(F(50 + (k // 4)), 0.45, r, dur=0.5, bright=0.3), 22.1 + k * B / 2, 0.15 * (-1) ** k)
sec("suspense", 22.0, 27.4)
# whirlpool 27.4-37.6: driving low ostinato + snare roll crescendo + swirling vibes
k = 0
t = 27.4
while t < 37.4:
    note(I.pluck(F([38, 45, 41, 45][k % 4]), 0.75, r, dur=0.5, bright=0.2), t, -0.1)
    if k % 2 == 0: note(I.timpani(F(38), 0.35 + 0.04 * (t - 27.4), r, dur=0.6), t, 0)
    k += 1; t += B / 2
for (ts, vs) in I.snare_roll(27.6, 37.5, 0.12, 0.7, r, rate=16.0): note(I.snare(vs, r, dur=0.2, buzz=True), ts, 0.1)
for k in range(10): note(I.vibes(F([74, 77, 81, 84, 81, 77][k % 6]), 0.3, r, dur=0.9), 28 + k * 0.9, 0.5 * (-1) ** k)
sec("whirlpool", 27.4, 37.6)
# "gone" 37.67: music cuts out (punchline). Luckily 38.06: major sting; Unluckily 40.39: minor sting
for m in (65, 69, 72, 77): note(I.glock(F(m + 12), 0.5, r), 38.1 + (m - 65) * 0.02, 0.2)
for m in (62, 65, 69): note(I.pluck(F(m - 12), 0.7, r, dur=1.4, bright=0.25), 40.42, 0)
note(I.brass(F(38), 1.3, 0.6, r, kind="tuba", fall=-2.0), 40.5, 0)  # sad trombone-ish tuba fall
sec("stings", 38.0, 42.6)
# explanation 42.66-55.1: "You see" thinking groove: soft pluck ostinato + vibes melody
for k in range(int((55.0 - 42.7) / (B / 2))):
    note(I.pluck(F([62, 69, 65, 69][k % 4]), 0.38, r, dur=0.6, bright=0.35), 42.7 + k * B / 2, -0.25)
MEL = [74, 76, 77, 81, 79, 77, 76, 74, 72, 74, 77, 76]
for k, m in enumerate(MEL): note(I.vibes(F(m), 0.33, r), 42.9 + k * 1.0, 0.3)
note(I.pad([F(50), F(57), F(65)], D(42.7, 12), 0.18, r, att=1.5), 42.7)
sec("explanation", 42.66, 55.1)
# canal + waterfall 55.1-59.7: big swell
note(I.pad([F(46), F(53), F(58), F(62)], D(55.1, 4.4), 0.35, r, att=2.5), 55.1)
for k in range(8): note(I.pluck(F(46 + [0, 7, 12, 16][k % 4]), 0.5, r, dur=0.8), 55.2 + k * 0.55, 0)
note(I.cymbal(0.45, r), 59.2, 0)
sec("waterfall swell", 55.1, 59.7)
# full again + pops 59.7-64.7: hook riff returns; a glock "boing" on each pop
riff(59.75, 64.7)
for tp in (63.3, 63.75, 64.3): note(I.glock(F(84 + int((tp - 63.3) * 4)), 0.55, r), tp, 0.3)
sec("refill riff", 59.75, 64.7)
# ending 64.7-68.2: two stabs, then a deep low note on "deeper"; the video ends on the word
note(I.pluck(F(65), 0.6, r), 64.96); note(I.pluck(F(64), 0.6, r), 66.34)
note(I.pluck(F(29), 1.0, r, dur=2.0, bright=0.1), 67.65); note(I.timpani(F(29), 0.8, r, dur=1.8), 67.65)
sec("ending", 64.7, DUR)
mus *= np.clip(1 - np.maximum(0, np.arange(N) / SR - (DUR - 0.25)) / 0.25, 0, 1)  # tail fades into the cut
# music dropout on "gone"
t_ax = np.arange(N) / SR
mus *= np.where((t_ax > W(37.55)) & (t_ax < W(38.05)), 0.0, 1.0)

# ---------------------------------------------------------------- SFX
sfx = np.zeros((2, N))
def fx(name, x, t, g=1.0, p=0.0):
    place(sfx, pan(x, p) if np.asarray(x).ndim == 1 else x, W(t), g); cues.append(f"| sfx | {name} | {W(t):.2f} s |")
q = rng(3)
def hum(dur, f0=55, g=0.25):  # drill motor
    n = ns(dur); t = np.arange(n) / SR
    y = sum(np.sin(2 * np.pi * f0 * k * t) / k for k in range(1, 6)) * (0.8 + 0.2 * np.sin(2 * np.pi * 7 * t))
    return fades(lp(y + 0.3 * colored(n, q, 0.5), 900) * g, 0.2, 0.2)
def roar(dur, lo=80, hi=1400, rise=1.0, g=0.6):
    n = ns(dur); t = np.arange(n) / SR
    env = np.clip(t / rise, 0, 1) * (0.7 + 0.3 * smooth_noise(n, q, 1.5))
    return fades(widen(bp(colored(n, q, 1.0), lo, hi, 2) * env * g, q), 0.3, 0.6)
def gulp(g=0.8):
    t = np.arange(ns(0.6)) / SR
    y = np.sin(2 * np.pi * (220 * np.exp(-t * 4) + 60) * t) * np.exp(-t * 6) + G.bubbles(0.6, q, 300 * np.exp(-t * 3) + 10, 200, 1500) * 0.6
    return fades(y * g, 0.002, 0.1)
def boing(f0=180):
    t = np.arange(ns(0.5)) / SR
    return fades(np.sin(2 * np.pi * (f0 + 120 * np.sin(2 * np.pi * 9 * t) * np.exp(-t * 6)) * t) * np.exp(-t * 5) * 0.6, 0.002, 0.08)
def clank(): return fades(G.hammer_hit(q, 1.2), 0, 0.05)
# ambience
fx("lake ambience: breeze + birds", G.breeze(D(0, 13), q, 0.5) + 0.6 * np.vstack([G.bird_chirps(D(0, 13), q, 0.4)] * 2), 0.0, 0.5)
fx("lake ambience 2", G.breeze(D(13, 14.6), q, 0.5), 13.0, 0.5)
fx("mine rumble", hum(D(10.6, 3), 40, 0.2), 10.6, 0.8)
fx("drill hum", hum(D(0, 6)), 0.0, 0.6); fx("drill hum", hum(D(13, 6)), 13.0, 0.6)
fx("whoosh into flash-forward", G.whoosh(0.6, q, 0.4), 3.9, 0.7)
fx("whirlpool roar (hook)", roar(D(4.27, 1.9), rise=0.4), 4.27, 0.7)
fx("flash whoosh", G.whoosh(0.5, q, 0.42), 5.6, 0.8)
fx("drill stuck clank", clank(), 19.0, 1.0)
fx("rig creak", G.creak(D(19.1, 2), q), 19.1, 0.7)
fx("rig tilt groan", G.chain_groan(1.5, q, t0=0), 19.95, 0.7)
for i in range(3): fx(f"crew splash {i}", G.splash_big(q), 21.95 + i * 0.22, 0.35, -0.3 + 0.3 * i)
fx("boat lapping", G.water_bed(D(22, 5.4), q, 0.6), 22.0, 0.5)
fx("whirlpool roar", roar(D(27.4, 9), 60, 1200, rise=2.5, g=0.8), 27.4, 1.0)
for t in (30.9, 31.95): fx("gulp (rig/tug)", gulp(1.0), t - 0.1, 0.9)
for k in range(11): fx(f"barge gulp {k}", gulp(0.6), 32.35 + 0.17 * k, 0.6, -0.5 + 0.1 * k)
for k in range(5): fx(f"tree crack {k}", G.wood_crack(q), 33.6 + 0.12 * k, 0.5)
fx("island crumble", G.timber_tear(q, 1.4), 34.9, 0.6)
fx("empty lake wind", G.breeze(D(36.1, 1.9), q, 0.7, bright=600), 36.1, 0.6)
for k in range(4): fx(f"miner hurrah {k}", G.hurrah(q, 1.0 + 0.1 * k, 1.0), 38.15 + 0.25 * k, 0.25, -0.4 + 0.25 * k)
fx("mine flood rush", roar(D(40.4, 2.2), 100, 1800, rise=0.3, g=0.7), 40.4, 0.8)
fx("drill pokes the roof", G.wood_crack(q), 45.6, 0.9); fx("roof crack clank", clank(), 45.62, 0.6)
fx("water jet", roar(D(46.3, 2.3), 200, 2600, rise=0.2, g=0.6), 46.3, 0.8)
fx("sugar cube plop", G.bubbles(0.4, q, 60, 400, 2200), 49.08, 0.9)
fx("sugar fizz", G.bubbles(D(49.2, 2.4), q, 140, 1500, 5000, (0.002, 0.006)), 49.2, 0.4)
fx("hole widens rush", roar(D(51.3, 3.6), 80, 1600, rise=1.2, g=0.8), 51.3, 0.9)
fx("canal rush + waterfall", roar(D(55.1, 4.6), 60, 1800, rise=1.5, g=0.9), 55.1, 0.9)
fx("refill lapping", G.water_bed(D(59.8, 3), q, 0.5), 59.8, 0.5)
for k, tp in enumerate((63.3, 63.75, 64.3)):
    fx(f"barge pop splash {k}", G.splash_big(q), tp, 0.45, -0.3 + 0.3 * k); fx(f"pop boing {k}", boing(160 + 40 * k), tp, 0.5)
fx("salty sputter", G.oof(q, "oof"), 65.9, 0.4)
fx("crane whoosh", G.whoosh(1.2, q, 0.7, f_lo=200, f_hi=1200, width=1.0), 66.65, 0.6)

# ---------------------------------------------------------------- mix
vt, sr = None, None
import wave as W_
with W_.open("../voice/voice_elevenlabs.wav", "rb") as w:
    sr = w.getframerate(); v = np.frombuffer(w.readframes(w.getnframes()), np.int16).astype(float) / 32768
assert sr == SR
voice = np.zeros((2, N)); place(voice, v, 0.0)
voice = norm_to(voice, -16.0, "integrated")
mus = norm_to(mus, -23.0, "integrated") * dbg(3.0)      # standard mix: music +3 dB
sfx = norm_to(sfx, -24.0, "integrated") * dbg(-6.0)     # standard mix: SFX -6 dB
# duck the music under the voice (sidechain-ish, 4 dB)
env = np.abs(voice[0]); k = ns(0.08); env = np.convolve(env, np.ones(k) / k, "same")
duck = dbg(-4.0 * np.clip(env / (env.max() * 0.15), 0, 1))
mus *= duck
ir = make_ir(0.9, 5)
mus = 0.85 * mus + 0.15 * convolve_st(mus, ir)[:, :N]
mix = voice + mus + sfx
mix = norm_to(mix, -14.0, "integrated")
pk = np.abs(mix).max()
if pk > 0.95: mix *= 0.95 / pk
os.makedirs("stems", exist_ok=True)
def save(path, x):
    with W_.open(path, "wb") as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes((np.clip(x, -1, 1).T * 32767).astype(np.int16).tobytes())
save("mix.wav", mix); save("stems/music.wav", mus); save("stems/sfx.wav", sfx); save("stems/voice.wav", voice)
open("cues.md", "w").write("# Cue sheet\n\n| layer | cue | time |\n|---|---|---|\n" + "\n".join(cues) + "\n")
print("mix", round(integrated(mix), 1), "LUFS; voice", round(integrated(voice), 1), "music", round(integrated(mus), 1), "sfx", round(integrated(sfx), 1), "len", mix.shape[1] / SR)
