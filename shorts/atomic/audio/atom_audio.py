# Sound for "Twice" (Tsutomu Yamaguchi): a quiet, respectful piano-and-pad score in D minor about 6 dB under the
# user's voice, and synthesized SFX: steps, street, shipyard, the bomber's drone, the two flashes and rumbles,
# ringing ears, shelter, train, office, map paper, birds and applause at the end. No gore, no screams.
# Output: mix.wav (48 kHz stereo, 68 s), stems/, cues.md. Run: python3 -I atom_audio.py (from this folder)
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
r = rng(45)

# ---------------------------------------------------------------- music
mus = np.zeros((2, N))
def note(x, t, p=0.0, g=1.0): place(mus, pan(x, p) if x.ndim == 1 else x, t, g)
def sec(name, a, b): cues.append(f"| music | {name} | {a:.2f}-{b:.2f} s |")
B = 60 / 76
CH = {"Dm": [38, 50, 53, 57], "Bb": [34, 50, 53, 58], "Gm": [43, 50, 55, 58], "A": [33, 49, 52, 57], "F": [41, 48, 53, 57], "C": [36, 48, 52, 55]}
MOT = [69, 65, 62, 64, 65, None, 64, 61]
def piano(t0, t1, seq, vel=0.45, mel=True, base=0, padv=0.12):
    t, k = t0, 0
    while t < t1 - 0.05:
        c = CH[seq[(k // 4) % len(seq)]]
        if k % 4 == 0:
            note(I.pluck(F(c[0] + base), vel * 0.9, r, dur=2.6, bright=0.25), t, -0.15)
            note(I.pad([F(m + base) for m in c[1:]], 4 * B, padv, r, att=0.5, rel=0.8, warm=800), t)
        note(I.pluck(F(c[1 + k % 3] + 12 + base), vel * 0.45, r, dur=1.2, bright=0.4), t + B * 0.5, 0.2)
        if mel and MOT[k % 8] is not None: note(I.pluck(F(MOT[k % 8] + base), vel * 0.7, r, dur=1.6, bright=0.5), t, 0.1)
        k += 1; t += B
piano(0.0, 7.0, ["Dm", "Bb", "Gm", "A"], 0.5)
sec("hook (piano, D minor)", 0, 7.0)
piano(7.2, 16.0, ["F", "C", "Dm", "Bb"], 0.4, mel=False)
sec("Hiroshima, Aug 6 (calm, major-ish)", 7.2, 16.0)
note(I.pad([F(50), F(57), F(62)], 4.2, 0.18, r, att=1.5, rel=0.6, warm=700), 16.0)  # the plane: a held, uneasy chord
for k in range(6): note(I.vibes(F(74 + k), 0.18 + 0.03 * k, r, dur=0.6, trem_depth=0.1), 17.3 + k * 0.42, 0.2 * (-1) ** k)
# 19.93 the flash: music stops; 20.9-27.0 a low drone under the injuries
note(I.pad([F(38), F(45)], 6.4, 0.16, r, att=1.0, rel=1.4, warm=400), 20.7)
sec("plane / flash / aftermath drone", 16.0, 27.0)
# 27.7 "he survives": a single warm chord; then shelter / train / work (slow piano)
note(I.pad([F(50), F(53), F(57), F(62)], 2.2, 0.2, r, att=0.2, rel=1.0, warm=1000), 27.6)
piano(28.8, 37.0, ["Dm", "Gm", "Bb", "A"], 0.36)
piano(37.1, 43.6, ["Gm", "Dm", "A", "A"], 0.4, mel=False)
sec("shelter, train, work, the boss", 27.6, 43.6)
# 45.73 second flash: stop. 47.4-53.6 'you see': ticking explanation (music box over a pad)
note(I.pad([F(43), F(50), F(55)], 6.4, 0.14, r, att=0.8, rel=1.0, warm=700), 47.3)
for k, m in enumerate([74, 77, 76, 74, 72, 74, 69, 70]): note(I.musicbox(F(m), 0.25, r, dur=1.2), 47.5 + k * 0.76, -0.2)
sec("you see (music box)", 47.3, 53.7)
note(I.pad([F(38), F(45), F(50)], 4.8, 0.17, r, att=0.6, rel=1.2, warm=500), 53.7)
sec("Nagasaki again (low)", 53.7, 58.6)
# 58.8-68 decades later: the motif in D major, gentle, ending on a held chord
CH.update({"D": [38, 50, 54, 57], "G": [43, 50, 55, 59], "Em": [40, 52, 55, 59], "A7": [33, 49, 52, 55]})
MOT[:] = [69, 66, 62, 64, 66, None, 64, 62]
piano(58.7, 66.0, ["D", "G", "Em", "A7"], 0.42)
note(I.pluck(F(38), 0.5, r, dur=2.4, bright=0.2), 66.0); [note(I.pluck(F(m), 0.35, r, dur=2.0, bright=0.45), 66.0, 0.2) for m in (62, 66, 69, 74)]
note(I.pad([F(50), F(54), F(57)], 2.0, 0.14, r, att=0.3, rel=1.0, warm=900), 66.0)
sec("decades later (D major), final chord 66.0", 58.7, 68.0)

# ---------------------------------------------------------------- SFX
sfx = np.zeros((2, N))
def fx(x, t, p=0.0, g=1.0, name=None):
    place(sfx, pan(x, p) if x.ndim == 1 else x, t, g)
    if name: cues.append(f"| sfx | {name} | {t:.2f} s |")
def bed(x, t0, t1, g=1.0, fade=0.3, name=None):
    x = x if x.ndim == 2 else pan(x, 0.0)
    n = min(x.shape[1], ns(t1 - t0)); y = x[:, :n].copy(); k = ns(fade)
    y[:, :k] *= np.linspace(0, 1, k)[None]; y[:, -k:] *= np.linspace(1, 0, k)[None]
    place(sfx, y, t0, g)
    if name: cues.append(f"| sfx | {name} | {t0:.2f}-{t1:.2f} s |")
def boom(dur=3.5, f0=48):
    n = ns(dur); tt = np.arange(n) / SR
    return (np.sin(2 * np.pi * (f0 - 12 * tt / dur) * tt) * np.exp(-tt / 0.9) + lp(colored(n, r, -0.8), 300) * np.exp(-tt / 1.1) * 1.4) * 1.1
def flash_whine():
    n = ns(0.5); tt = np.arange(n) / SR
    return (hp(colored(n, r, 0), 3000) * 0.4 + np.sin(2 * np.pi * (2500 + 3000 * tt) * tt) * 0.15) * np.minimum(1, tt / 0.45) ** 2
def rumble(dur): n = ns(dur); return lp(colored(n, r, -1.0), 160) * (0.6 + 0.4 * smooth_noise(n, r, 1.5)) * 1.6
def drone(dur):
    n = ns(dur); tt = np.arange(n) / SR; env = np.sin(np.pi * tt / dur) ** 1.5
    x = sum(np.sin(2 * np.pi * f * (1 + 0.004 * np.sin(2 * np.pi * 0.3 * tt)) * tt) / (k + 1) for k, f in enumerate([92, 184, 276, 97, 194]))
    return (x * 0.3 + lp(colored(n, r, -0.5), 500) * 0.4) * env
def ringing(dur):
    n = ns(dur); tt = np.arange(n) / SR
    return np.sin(2 * np.pi * 3700 * tt) * 0.12 * np.minimum(1, tt / 0.15) * np.exp(-tt / (dur * 0.5))
def clack(): n = ns(0.09); tt = np.arange(n) / SR; return bp(colored(n, r, -0.3), 150, 1800) * np.exp(-tt / 0.02) * 1.4
def train(t0, t1, name):
    bed(lp(colored(ns(t1 - t0 + 0.4), r, -0.9), 500) * 0.5, t0, t1, 0.9, name=name)
    t = t0 + 0.05
    while t < t1 - 0.1: fx(clack(), t, 0.1, 0.7); fx(clack(), t + 0.14, -0.1, 0.55); t += 0.62
def room(t0, t1, g=0.12): bed(lp(colored(ns(t1 - t0 + 0.4), r, -1.0), 400) * g, t0, t1, 1.0)
def paper(): return G.whoosh(0.25, r, 0.2, 2500, 7000) * 0.6

WHIPS = [118, 152, 207, 478, 629, 866, 950, 1020, 1425, 1610, 1745, 1950]
for f in WHIPS: fx(G.whoosh(0.3, r, 0.4, 400, 3200), f / FPS - 0.12, 0.0, 0.65)
cues.append("| sfx | whip whooshes | " + ", ".join(f"{f / FPS:.2f}" for f in WHIPS) + " s |")
# hook: street, the first flash, the train, the office, the second flash
bed(G.breeze(4.0, r, 0.5), 0.0, 3.9, 0.5, name="street (hook)")
for k in range(6): fx(G.stroll_step(r, 0.4), 0.15 + k * 0.48, 0.15 * (-1) ** k, 0.5)
fx(flash_whine(), 88 / 30 - 0.45, 0.0, 0.8); fx(boom(1.0), 88 / 30, 0.0, 0.8, name="flash 1 (hook)")
train(3.95, 5.13, "train (hook)")
room(5.13, 6.9); fx(flash_whine(), 189 / 30 - 0.45, 0.0, 0.8); fx(boom(1.0), 189 / 30, 0.0, 0.8, name="flash 2 (hook)")
# 6.9-16 Hiroshima street, the shipyard far off
bed(G.breeze(9.5, r, 0.5), 6.9, 16.1, 0.5, name="street breeze"); bed(G.bird_chirps(9.5, r, 0.4), 6.9, 16.1, 0.35)
for t in (8.0, 9.4, 11.3, 12.6, 14.9): fx(G.hammer_hit(r, 0.4), t, 0.6, 0.18)
cues.append("| sfx | distant shipyard hammers | 8.0-14.9 s |")
fx(G.clink(r, 1800, 0.05, 0.6), 13.25, -0.2, 0.3, name="calendar tap")
# 16-20 walking; the bomber's drone grows; 19.93 the flash
for k in range(7): fx(G.stroll_step(r, 0.4), 16.05 + k * 0.5, 0.15 * (-1) ** k, 0.45)
bed(drone(4.3), 15.7, 20.0, 1.0, fade=0.05, name="bomber drone")
fx(flash_whine(), 19.93 - 0.45, 0.0, 1.0); fx(boom(4.0), 19.93, 0.0, 1.0, name="flash + blast (far)")
bed(rumble(6.0), 20.6, 26.5, 0.9, name="rumble / cloud rising")
fx(ringing(3.6), 25.0, 0.0, 0.8, name="ringing ears")
# 28.9-31.7 shelter; 31.7-34 train; 34-47 office
room(28.9, 31.75, 0.2); [fx(G.clink(r, 2200, 0.04, 0.5), t, 0.3, 0.2) for t in (29.6, 30.9)]
cues.append("| sfx | shelter room tone, drips | 28.9-31.7 s |")
train(31.7, 34.0, "train home")
room(34.0, 47.4)
for t in (35.0, 36.1, 38.3, 40.0): fx(paper(), t, 0.3, 0.5)
fx(flash_whine(), 45.73 - 0.45, 0.0, 1.0); fx(boom(3.4, 44), 45.73, 0.0, 1.0, name="window flash + blast (far)")
for k in range(8): fx(G.clink(r, 3200 + 300 * k, 0.05, 0.8), 45.85 + k * 0.05, 0.3 * (-1) ** k, 0.3)
cues.append("| sfx | window rattle | 45.85 s |")
# 47.4-53.6 the map table
for t in (47.6, 50.5): fx(paper(), t, -0.2, 0.6)
bed(drone(2.2) * 0.5, 51.6, 53.7, 0.6, fade=0.1, name="toy plane drone")
# 53.7-58.6 Nagasaki: low rumble
bed(rumble(5.0), 53.7, 58.6, 0.8, name="rumble (Nagasaki)")
# 58.8-68 decades later: birds, applause
bed(G.bird_chirps(9.2, r, 0.5), 58.8, 68.0, 0.4, name="birds")
bed(G.applause(4.0, r, people=14), 61.3, 64.8, 0.5, fade=0.8, name="applause")

# ---------------------------------------------------------------- mix
v, sr = read_wav("../voice/voice.wav")
assert sr == SR, sr
v = v if v.ndim == 1 else v.mean(0)
voice = np.zeros((2, N)); place(voice, pan(v[:N], 0.0), 0.0)
voice = norm_to(voice, -16.0, "integrated")
mus = norm_to(mus, -20.0, "integrated")
sfx = norm_to(sfx, -24.0, "integrated")
env = np.abs(voice[0]); k = ns(0.08); env = np.convolve(env, np.ones(k) / k, "same")
mus *= dbg(-3.0 * np.clip(env / (env.max() * 0.15), 0, 1))
ir = make_ir(1.4, 7)
mus = 0.8 * mus + 0.2 * convolve_st(mus, ir)[:, :N]
mix = voice + mus + sfx
tail = np.ones(N); a = ns(67.2); tail[a:] = np.linspace(1, 0, N - a) ** 1.5
mix = norm_to(mix * tail[None], -14.0, "integrated")
A = np.abs(mix); mix = np.sign(mix) * np.where(A > 0.6, 0.6 + 0.35 * np.tanh((A - 0.6) / 0.35), A)
def save(path, x):
    with wave.open(path, "wb") as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes((np.clip(x, -1, 1).T * 32767).astype(np.int16).tobytes())
save("mix.wav", mix); save("stems/music.wav", mus); save("stems/sfx.wav", sfx); save("stems/voice.wav", voice)
open("cues.md", "w").write("# Cue sheet\n\n| layer | cue | time |\n|---|---|---|\n" + "\n".join(cues) + "\n")
print("mix", round(integrated(mix), 1), "LUFS; voice", round(integrated(voice), 1), "music", round(integrated(mus), 1), "sfx", round(integrated(sfx), 1), "len", mix.shape[1] / SR)
