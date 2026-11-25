# Sound for "The Sweetest Disaster" (Boston, 1919): an original ragtime-flavoured score (piano-like plucks, tuba,
# woodblock) about 6 dB under the Adam voice, cutting out on "Twenty-one people died", a low-key explanation bed,
# and synthesized SFX on every drip, swish, pop, boom, crunch and gavel. Output: mix.wav (48 kHz stereo, 68 s),
# stems/ and cues.md. Run: python3 -I mol_audio.py (from this folder)
import sys, os, wave
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from dsp import SR, ns, rng, pan, place, dbg, lp, hp, bp, colored, smooth_noise, integrated, norm_to, read_wav, make_ir, convolve_st
import sfx_gen as G
import instruments as I

FPS, TOTAL = 30, 2040
DUR = TOTAL / FPS
N = ns(DUR)
F = I.m2f
cues = []
r = rng(19)

# ---------------------------------------------------------------- music
mus = np.zeros((2, N))
def note(x, t, p=0.0, g=1.0): place(mus, pan(x, p) if x.ndim == 1 else x, t, g)
def sec(name, a, b): cues.append(f"| music | {name} | {a:.2f}-{b:.2f} s |")
B = 60 / 112  # ragtime two-step
CH = {"C": [48, 52, 55, 60], "G7": [43, 47, 50, 53], "F": [41, 45, 48, 53], "A7": [45, 49, 52, 55], "Dm": [50, 53, 57, 62], "D7": [50, 54, 57, 60]}
MEL = [72, 76, 79, 76, 77, 76, 74, 72, 71, 74, 77, 74, 76, 74, 72, None]
def rag(t0, t1, seq, vel=0.5, mel=True, base=0):
    t, k = t0, 0
    while t < t1 - 0.05:
        c = CH[seq[(k // 4) % len(seq)]]
        if k % 2 == 0: note(I.brass(F(c[0] - 12 + base), B * 0.9, vel * 0.8, r, kind="tuba"), t, -0.1)  # oom
        else: [note(I.pluck(F(m + base), vel * 0.5, r, dur=0.35, bright=0.55), t, 0.15) for m in c[1:]]  # pah
        if mel and MEL[k % 16] is not None: note(I.pluck(F(MEL[k % 16] + base), vel * 0.75, r, dur=0.5, bright=0.6), t + (B * 0.5 if k % 4 == 3 else 0), 0.3)
        if k % 2 == 1: note(G.clink(r, 1400, 0.03, 0.6), t + B * 0.5, -0.3, 0.12)  # woodblock-ish tick
        k += 1; t += B
rag(0.0, 5.6, ["C", "G7", "C", "A7"], 0.55)
sec("hook rag (C)", 0, 5.6)
rag(5.9, 25.6, ["F", "C", "G7", "C", "Dm", "G7", "C", "C"], 0.45)
sec("the tank / leaks / paint (rag)", 5.9, 25.6)
# 25.8-27.75 a warm afternoon: the band stops, a rising tremolo, then the burst (stop dead)
for k in range(10): note(I.vibes(F(60 + k), 0.25 + 0.03 * k, r, dur=0.4), 25.8 + k * 0.19, 0.2 * (-1) ** k)
# 28-37.5 the wave: fast low chase (minor), timpani
t, k = 28.0, 0
while t < 37.4:
    note(I.pluck(F([45, 52, 48, 52][k % 4]), 0.7, r, dur=0.3, bright=0.3), t, -0.1)
    if k % 4 == 0: note(I.timpani(F(33), 0.6, r, dur=0.7), t, 0)
    k += 1; t += B / 2
sec("the wave (chase, A minor)", 28.0, 37.4)
# 37.9-46.9 sunset into night: slow, thinning, falling
for k, ch in enumerate(["Dm", "A7", "Dm", "A7"]):
    note(I.pad([F(m + 12) for m in CH[ch][1:]], 2.3, 0.18 - 0.03 * k, r, att=0.4, rel=1.0, warm=900), 37.9 + k * 2.25)
for k, m in enumerate([74, 73, 72, 71, 70, 69]): note(I.vibes(F(m), 0.25, r, dur=1.4, trem_depth=0.1), 38.4 + k * 1.4, 0.3)
sec("sunset into night (falling)", 37.9, 46.9)
# 46.98-48.7: silence on "Twenty-one people died"
# 48.8-57.9 explanation: low-key bed, one amber bell motif
note(I.pad([F(38), F(45), F(50)], 9.0, 0.16, r, att=1.0, rel=1.5, warm=600), 48.8)
for k, m in enumerate([62, 65, 69, 67, 65, 62]): note(I.musicbox(F(m + 12), 0.25, r, dur=1.6), 49.2 + k * 1.45, -0.2)
sec("viscosity (low pad + bell)", 48.8, 57.9)
# 58.2-61.7 the court: two stabs, then the rag again, lighter, to the end
note(I.brass(F(41), 0.4, 0.6, r, kind="tuba"), 58.3); note(I.brass(F(40), 0.5, 0.6, r, kind="tuba"), 59.9)
rag(61.9, 66.9, ["C", "F", "G7", "C"], 0.4)
note(I.pluck(F(48), 0.6, r, dur=1.4, bright=0.2), 66.9); [note(I.pluck(F(m), 0.4, r, dur=1.2, bright=0.5), 66.9, 0.2) for m in (64, 67, 72)]
sec("court stabs; summer rag; final chord 66.9", 58.2, 68.0)

# ---------------------------------------------------------------- SFX
sfx = np.zeros((2, N))
def fx(x, t, p=0.0, g=1.0, name=None):
    place(sfx, pan(x, p) if x.ndim == 1 else x, t, g)
    if name: cues.append(f"| sfx | {name} | {t:.2f} s |")
def bed(x, t0, t1, g=1.0, fade=0.4, name=None):
    x = x if x.ndim == 2 else pan(x, 0.0)
    n = min(x.shape[1], ns(t1 - t0)); y = x[:, :n].copy(); k = ns(fade)
    y[:, :k] *= np.linspace(0, 1, k)[None]; y[:, -k:] *= np.linspace(1, 0, k)[None]
    place(sfx, y, t0, g)
    if name: cues.append(f"| sfx | {name} | {t0:.2f}-{t1:.2f} s |")
def drip(): n = ns(0.12); tt = np.arange(n) / SR; f0 = r.uniform(700, 1100); return np.sin(2 * np.pi * (f0 + 1800 * tt) * tt) * np.exp(-tt / 0.03) * 0.6
def roar(dur): n = ns(dur); return lp(colored(n, r, -0.8), 900) * (0.7 + 0.3 * smooth_noise(n, r, 4)) * 1.2
def boom(): n = ns(2.2); tt = np.arange(n) / SR; return (np.sin(2 * np.pi * (55 - 15 * tt) * tt) * np.exp(-tt / 0.5) + lp(colored(n, r, -0.5), 400) * np.exp(-tt / 0.35)) * 1.2
def squelch(): n = ns(0.35); tt = np.arange(n) / SR; return bp(colored(n, r, 0), 200, 1200) * np.exp(-tt / 0.08) * np.sin(2 * np.pi * 9 * tt) ** 2 * 1.5
def swish(): return G.whoosh(0.35, r, 0.3, 600, 3000)
def sniff(): n = ns(0.4); tt = np.arange(n) / SR; return hp(colored(n, r, 0), 1500) * (np.sin(np.pi * tt / 0.4) ** 2) * 0.5
def gavel(): return G.hammer_hit(r, 1.0)
WHIPS = [180, 1128, 1255, 1395, 1455, 1740, 1855]
for f in WHIPS: fx(G.whoosh(0.32, r, 0.45, 400, 3200), f / FPS - 0.12, 0.0, 0.7)
cues.append("| sfx | whip whooshes | " + ", ".join(f"{f / FPS:.2f}" for f in WHIPS) + " s |")
# hook: the roar behind the runners, panicked steps
bed(roar(5.8), 0.0, 5.7, 0.8, name="wave roar (hook)")
for k in range(12): fx(G.stroll_step(r, 0.6), 0.1 + k * 0.42, 0.2 * (-1) ** k, 0.5)
# street ambience through the calm part
bed(G.breeze(20, r, 0.6), 6.0, 25.6, 0.45, name="street breeze")
bed(G.bird_chirps(20, r, 0.3), 6.0, 25.6, 0.3)
# leaks + kids
for k in range(9): fx(drip(), 12.9 + k * 0.45, 0.2, 0.7)
cues.append("| sfx | drips | 12.9-16.5 s |")
fx(G.clink(r, 2600, 0.06), 15.2, -0.1, 0.4); fx(G.clink(r, 2900, 0.06), 15.9, 0.2, 0.4)
# paint brush
for k in range(6): fx(swish(), 19.9 + k * 0.28, 0.1, 0.45)
cues.append("| sfx | brush strokes | 19.9-21.4 s |")
# tiny bucket
fx(G.clink(r, 3400, 0.05, 1.2), 24.2, 0.1, 0.6, name="tiny bucket ping")
# burst: rivet pops then the boom
for k in range(6): fx(G.bolt_snap(r), 27.15 + k * 0.1, 0.3 * (-1) ** k, 0.6)
fx(boom(), BURST := 27.75, 0.0, 1.0, name="tank bursts")
# the wave: roar, wood crunch at the shed, metal groan at the bridge
bed(roar(9.6), 27.9, 37.6, 1.0, name="wave roar")
fx(G.timber_tear(r, 0.9), 34.0, -0.3, 0.9, name="shed crunch"); fx(G.wood_crack(r), 34.2, -0.2, 0.7)
fx(G.chain_groan(1.6, r, 0.4, 1.0), 35.8, 0.2, 0.9, name="bridge bends")
# sunset into night: squelches slowing down, cold wind
for k, t in enumerate([39.6, 40.9, 42.0, 42.9, 44.4, 45.6]): fx(squelch(), t, 0.3 * (-1) ** k, 0.7 - 0.08 * k)
bed(G.breeze(9.0, r, 0.4, bright=600), 38.0, 46.9, 0.5, name="cold wind")
# 46.98-48.7 silence
# lab: room tone, a slow gloop
bed(lp(colored(ns(9.2), r, -1.0), 300) * 0.1, 48.8, 58.0, 0.6)
for t in (50.0, 54.3, 55.8, 57.2): fx(squelch(), t, 0.0, 0.5)
# court
fx(gavel(), 60.25, 0.2, 0.9, name="gavel"); fx(gavel(), 60.75, 0.2, 0.9)
# summer: birds, a sniff
bed(G.bird_chirps(6.0, r, 0.6), 62.0, 68.0, 0.5, name="summer birds"); fx(sniff(), 63.6, 0.0, 0.8, name="sniff"); fx(sniff(), 64.2, 0.0, 0.7)

# ---------------------------------------------------------------- mix
v, sr = read_wav("../voice/voice.wav")
assert sr == SR, sr
v = v if v.ndim == 1 else v.mean(0)
voice = np.zeros((2, N)); place(voice, pan(v, 0.0), 0.0)
voice = norm_to(voice, -16.0, "integrated")
mus = norm_to(mus, -20.0, "integrated")                 # ~6 dB under the voice after ducking (ricks-clips-style)
sfx = norm_to(sfx, -24.0, "integrated")
env = np.abs(voice[0]); k = ns(0.08); env = np.convolve(env, np.ones(k) / k, "same")
mus *= dbg(-3.0 * np.clip(env / (env.max() * 0.15), 0, 1))
ir = make_ir(1.0, 7)
mus = 0.85 * mus + 0.15 * convolve_st(mus, ir)[:, :N]
mix = voice + mus + sfx
tail = np.ones(N); a = ns(67.0); tail[a:] = np.linspace(1, 0, N - a) ** 1.5
mix = norm_to(mix * tail[None], -14.0, "integrated")
A = np.abs(mix); mix = np.sign(mix) * np.where(A > 0.6, 0.6 + 0.35 * np.tanh((A - 0.6) / 0.35), A)  # soft limiter for the boom
def save(path, x):
    with wave.open(path, "wb") as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes((np.clip(x, -1, 1).T * 32767).astype(np.int16).tobytes())
save("mix.wav", mix); save("stems/music.wav", mus); save("stems/sfx.wav", sfx); save("stems/voice.wav", voice)
open("cues.md", "w").write("# Cue sheet\n\n| layer | cue | time |\n|---|---|---|\n" + "\n".join(cues) + "\n")
print("mix", round(integrated(mix), 1), "LUFS; voice", round(integrated(voice), 1), "music", round(integrated(mus), 1), "sfx", round(integrated(sfx), 1), "len", mix.shape[1] / SR)
