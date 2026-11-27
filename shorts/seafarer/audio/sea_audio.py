# Sound for "Strong" (a seafarer's wife): an original quiet score + synthesized room/sea SFX timed to the picture
# (studio/src/videos/sea/story.ts), mixed under the user's voice. Output: mix.wav (48 kHz stereo, picture length),
# stems/ and cues.md. Run: python3 -I sea_audio.py  (from this folder)
import sys, os, wave
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from dsp import SR, ns, rng, pan, place, fades, dbg, lp, hp, bp, colored, smooth_noise, integrated, norm_to, read_wav, make_ir, convolve_st
import sfx_gen as G
import instruments as I

FPS, TOTAL = 30, 2580
DUR = TOTAL / FPS
N = ns(DUR)
F = I.m2f
cues = []
r = rng(7)

# ---------------------------------------------------------------- music (original; F major / D minor, 72 bpm)
B = 60 / 72
mus = np.zeros((2, N))
def note(x, t, p=0.0, g=1.0): place(mus, pan(x, p) if x.ndim == 1 else x, t, g)
def sec(name, a, b): cues.append(f"| music | {name} | {a:.2f}-{b:.2f} s |")
# chords as MIDI triads (root in the bass)
CH = {"F": [53, 57, 60], "C": [48, 55, 60], "Dm": [50, 57, 62], "Bb": [46, 53, 58], "Gm": [43, 55, 58], "Am": [45, 52, 57], "C/E": [52, 55, 60]}
def bar(ch, t, bars=1, vel=0.4, arp=True, pad=True, bright=0.35, padv=0.18):
    n = CH[ch]
    if pad: note(I.pad([F(m + 12) for m in n], bars * 4 * B, padv, r, att=0.8, rel=1.4, warm=1100), t)
    note(I.pluck(F(n[0] - 12), vel * 1.1, r, dur=2.6, bright=0.15), t, -0.1)
    if arp:
        pat = [n[0], n[1], n[2], n[1] + 12, n[2] + 12, n[1] + 12, n[2], n[1]]
        for b in range(bars):
            for k, m in enumerate(pat): note(I.pluck(F(m + 12), vel * (0.95 if k % 4 == 0 else 0.7), r, dur=1.6, bright=bright), t + b * 4 * B + k * B / 2, 0.25 * (-1) ** k)
def prog(seq, t0, t1, **kw):
    t, k = t0, 0
    while t < t1 - 0.5:
        bar(seq[k % len(seq)], t, **kw); t += 4 * B; k += 1
    return t
def mel(notes, t0, step, vel=0.4, inst="box", p=0.3):
    for k, m in enumerate(notes):
        if m is None: continue
        x = I.musicbox(F(m), vel, r, dur=2.0) if inst == "box" else I.vibes(F(m), vel, r, dur=2.4, trem_depth=0.08)
        note(x, t0 + k * step, p)
# 0-18.7 what they see: warm, hopeful, light
prog(["F", "C", "Dm", "Bb"], 0.0, 18.7, vel=0.42)
mel([72, 74, 76, None, 77, 76, 74, 72, None, 74, 72, 69], 1.0, 2 * B, 0.32)
sec("what they see (F major, arpeggios + music box)", 0, 18.7)
# 18.7-44.4 what they don't see: minor, sparse, slower (whole-bar chords, single high notes)
t = 18.8
for ch in ["Dm", "Bb", "F", "C", "Dm", "Bb", "Gm", "C"]:
    if t > 41.6: break
    bar(ch, t, arp=False, vel=0.3, padv=0.16)
    note(I.pluck(F(CH[ch][2] + 12), 0.28, r, dur=2.4, bright=0.25), t + 2 * B, 0.3)
    t += 4 * B
mel([81, None, 79, None, 77, None, 76, None, 74, None, None, None, 77, None, 76, 74], 21.0, B, 0.22, inst="vibes")
note(I.pad([F(62), F(65), F(69)], 4.0, 0.12, r, att=1.5, rel=2.0, warm=800), 40.6)  # held under "are you okay?"
sec("what they don't see (D minor, sparse)", 18.7, 44.4)
# 44.4-49.2 independent, strong: firmer pulse
for k in range(int((49.1 - 44.4) / (B / 2))): note(I.pluck(F([50, 57, 62, 57][k % 4]), 0.5, r, dur=0.8, bright=0.3), 44.4 + k * B / 2, -0.15 * (-1) ** k)
note(I.pad([F(62), F(65), F(69)], 2.4, 0.16, r), 44.4); note(I.pad([F(58), F(62), F(65)], 2.4, 0.16, r), 46.9)
sec("independent / strong (pulse)", 44.4, 49.2)
# 49.2-56.5 don't want to be strong: almost nothing; one low pad + a falling line
note(I.pad([F(46), F(53), F(58)], 4.2, 0.18, r, att=1.0, rel=2.0, warm=700), 49.3)
note(I.pad([F(43), F(50), F(58)], 3.4, 0.18, r, att=1.0, rel=2.4, warm=700), 53.6)
mel([77, None, 74, None, 72, None, 70], 50.2, B, 0.2, inst="vibes")
sec("breakdown (Bb, Gm)", 49.2, 56.5)
# 56.5-69 only a wife understands... lonely, tired, cries: arpeggios come back, minor, building
t = prog(["Dm", "Bb", "F", "C"], 56.5, 69.0, vel=0.34, padv=0.16)
sec("building (Dm Bb F C)", 56.5, 69.0)
# 69-86 continues to live, love, hold together; to all wives; human too: major lift, melody, final chord
prog(["F", "C", "Dm", "Bb", "F", "C"], 69.0, 82.0, vel=0.46, bright=0.45, padv=0.22)
mel([72, 76, 79, 77, None, 76, 74, 72, 74, None, 76, 77, 79, None, 81, 79, 77], 69.2, B, 0.34)
note(I.pad([F(65), F(69), F(72), F(77)], 4.2, 0.24, r, att=0.6, rel=3.0, warm=1200), 82.0)
note(I.pluck(F(41), 0.6, r, dur=4.0, bright=0.15), 82.0); note(I.musicbox(F(84), 0.3, r, dur=3.0), 82.4, 0.3); note(I.musicbox(F(81), 0.25, r, dur=3.0), 83.2, -0.3)
sec("lift + resolution (F major), final chord 82 s", 69.0, 86.0)

# ---------------------------------------------------------------- SFX
sfx = np.zeros((2, N))
def fx(x, t, p=0.0, g=1.0, name=None):
    place(sfx, pan(x, p) if x.ndim == 1 else x, t, g)
    if name: cues.append(f"| sfx | {name} | {t:.2f} s |")
def bed(x, t0, t1, g=1.0, fade=0.6, name=None):
    x = x if x.ndim == 2 else pan(x, 0.0)
    n = min(x.shape[1], ns(t1 - t0)); y = x[:, :n].copy(); k = ns(fade)
    y[:, :k] *= np.linspace(0, 1, k)[None]; y[:, -k:] *= np.linspace(1, 0, k)[None]
    place(sfx, y, t0, g)
    if name: cues.append(f"| sfx | {name} | {t0:.2f}-{t1:.2f} s |")
def tick(t, g=0.5): fx(G.clink(r, 2600, 0.03, 0.7), t, 0.35, g)
def horn(dur, f0=98.0):
    n = ns(dur); tt = np.arange(n) / SR; y = np.zeros(n)
    for d in (0, 1.006, 1.5): y += sum(np.sin(2 * np.pi * f0 * (d or 1) * k * tt) / k for k in range(1, 12)) if d != 1.5 else 0.4 * np.sin(2 * np.pi * f0 * 1.5 * tt)
    env = np.minimum(1, tt / 0.25) * np.minimum(1, (dur - tt) / 0.6)
    return lp(y * env, 900) * 0.25
def sizzle(dur): n = ns(dur); return bp(colored(n, r, 0.0), 2500, 9000) * (0.6 + 0.4 * smooth_noise(n, r, 9)) * 0.3
def water_run(dur): n = ns(dur); return bp(colored(n, r, -0.5), 400, 5000) * (0.7 + 0.3 * smooth_noise(n, r, 6)) * 0.35
def rain(dur):
    n = ns(dur); y = bp(colored(n, r, -0.3), 300, 7000) * 0.25
    drops = np.zeros(n)
    for _ in range(int(dur * 22)): i = r.integers(0, n - 2000); drops[i:i + 1200] += np.exp(-np.arange(1200) / 120) * np.sin(np.arange(1200) * r.uniform(0.2, 0.5)) * r.uniform(0.1, 0.4)
    return np.stack([y + drops * 0.6, np.roll(y, 300) + np.roll(drops, 900) * 0.6])
def thunder(dur=3.0): n = ns(dur); tt = np.arange(n) / SR; return lp(colored(n, r, -1.0), 180) * np.exp(-tt / 1.0) * np.minimum(1, tt / 0.3) * 1.2
def rustle(dur=0.4): n = ns(dur); return hp(colored(n, r, 0.0), 1800) * smooth_noise(n, r, 25) ** 2 * 0.4
def thump(g=1.0): n = ns(0.25); tt = np.arange(n) / SR; return (np.sin(2 * np.pi * 70 * tt) * np.exp(-tt / 0.06) + lp(colored(n, r, 0), 500) * np.exp(-tt / 0.03) * 0.5) * g
def taps(t0, t1):
    t = t0
    while t < t1: fx(G.clink(r, r.uniform(3500, 4200), 0.015, 0.4), t, 0.1, 0.25); t += r.uniform(0.11, 0.2)

# 0-2.6 street: breeze, birds, her steps
bed(G.breeze(5.4, r, 0.7), 0.0, 5.3, 0.6, name="street breeze"); bed(G.bird_chirps(5.0, r, 0.4), 0.0, 2.6, 0.5)
for k in range(5): fx(G.stroll_step(r, 0.4), 0.15 + k * 0.55, -0.2, 0.5)
# 2.6-5.3 the ship at sea: waves, a long low horn
bed(G.water_bed(3.2, r, 0.6), 2.5, 5.4, 0.9, name="sea"); fx(horn(2.2), 3.0, 0.0, 0.9, name="ship horn")
# 5.3-12.3 home day: sizzle, plate, paper, footsteps
bed(sizzle(2.2), 5.3, 7.3, 0.8, name="frying"); fx(G.clink(r, 1800, 0.12), 7.45, 0.2, 0.6, name="plate on table"); fx(G.clink(r, 2300, 0.1), 7.62, -0.1, 0.4)
fx(rustle(0.5), 8.8, 0.1, 0.8, name="papers"); fx(rustle(0.3), 9.4, -0.1, 0.6)
for k in range(5): fx(G.stroll_step(r, 0.3), 9.9 + k * 0.48, 0.0, 0.4)
# 12.3-18.7 at the store: chatter, laughs, the ball
bed(G.breeze(6.6, r, 0.6), 12.3, 18.8, 0.5)
for k, b0 in enumerate([180, 230, 210]): bed(G.babble(6.0, r, b0, 1.0 + 0.1 * k, active=0.5), 12.5, 18.4, 0.12, name="neighbours chatting" if k == 0 else None)
for k in range(6): fx(thump(0.5), 12.8 + k * 0.91, -0.3, 0.6)
# 18.7-20.1: the street sound drains away (picture holds on her face)
# 20.1-23 alone at the table: clock
for k in range(3): tick(20.3 + k, 0.5)
# 23-26.4 bed: crickets, clock
bed(G.crickets(3.6, r), 22.9, 26.5, 0.35, name="crickets")
# 26.4-30.9 day: running steps, phone taps
for k in range(4): fx(G.stroll_step(r, 0.2), 26.35 + k * 0.25, -0.3, 0.6)
taps(28.7, 30.4)
# 30.9-34.2 waiting: the clock runs fast
t = 31.0
while t < 34.1: tick(t, 0.45); t += 0.32
bed(G.crickets(3.4, r), 30.9, 34.3, 0.25)
# 34.2-38.8 birthday: kids laughing, a party blower, small claps
for k, b0 in enumerate([330, 380]): bed(G.babble(4.4, r, b0, 1.4, rate=5.5, active=0.6), 34.3, 38.6, 0.1)
fx(I.fife(F(74), 0.5, 0.5, r), 35.2, 0.2, 0.5, name="party blower"); bed(G.applause(2.0, r, people=4), 36.0, 38.0, 0.35, name="claps")
# 38.8-44.4 the sink: water, dishes; everything stops before "are you okay?"
bed(water_run(3.5), 38.8, 42.25, 0.6, fade=0.2, name="tap running"); fx(G.clink(r, 1900, 0.1), 39.6, 0.3, 0.4); fx(G.clink(r, 2100, 0.1), 40.9, 0.3, 0.35)
# 44.4-49.2 wrench, the sack
for tt in (44.7, 45.3, 45.9): fx(G.clink(r, 1200, 0.08, 1.4), tt, 0.3, 0.5)
fx(thump(1.0), 47.2, 0.0, 0.8, name="rice sack");
for k in range(4): fx(G.stroll_step(r, 0.2), 47.4 + k * 0.5, 0.0, 0.4)
# 49.2-56.5 rain on the window, far thunder
bed(rain(7.4), 49.1, 56.5, 0.7, fade=0.8, name="rain"); fx(thunder(), 50.2, -0.2, 0.7, name="far thunder")
# 56.5-61.2 night town: sea, crickets
bed(G.water_bed(4.8, r, 0.4), 56.4, 61.3, 0.7); bed(G.crickets(4.8, r), 56.4, 61.3, 0.3)
# 61.2-66.1 dusk porch: waves, breeze
bed(G.water_bed(5.0, r, 0.3), 61.1, 66.2, 0.7); bed(G.breeze(5.0, r, 0.5), 61.1, 66.2, 0.4)
# 66.1-69 tired, cries: clock, crickets
tick(66.3, 0.4); tick(67.0, 0.35); bed(G.crickets(1.8, r), 67.3, 69.0, 0.3)
# 69-73.8 morning: curtains, birds, kids laughing
fx(G.whoosh(0.7, r, 0.3, 500, 2600), 69.05, 0.0, 0.5, name="curtains open"); bed(G.bird_chirps(4.8, r, 0.6), 69.0, 73.9, 0.5)
bed(G.babble(1.2, r, 360, 1.5, rate=6, active=0.9), 70.6, 71.9, 0.12, name="kids laughing")
# 73.8-86 the pier at sunset: waves, breeze, far horn twice
bed(G.water_bed(12.2, r, 0.5), 73.7, 86.0, 0.8, fade=1.5, name="waves at the pier"); bed(G.breeze(12.2, r, 0.5), 73.7, 86.0, 0.4, fade=1.5)
fx(horn(2.6, 92.0), 75.2, -0.3, 0.45, name="far ship horn"); fx(horn(3.0, 92.0), 83.6, -0.3, 0.35)

# ---------------------------------------------------------------- mix
v, sr = read_wav("../voice/voice.wav")
assert sr == SR, sr
v = v if v.ndim == 1 else v.mean(0)
voice = np.zeros((2, N)); place(voice, pan(v, 0.0), 0.0)
voice = norm_to(voice, -16.0, "integrated")
mus = norm_to(mus, -23.0, "integrated") * dbg(3.0)      # standard mix: music +3 dB
sfx = norm_to(sfx, -24.0, "integrated") * dbg(-6.0)     # standard mix: SFX -6 dB
env = np.abs(voice[0]); k = ns(0.08); env = np.convolve(env, np.ones(k) / k, "same")
duck = dbg(-4.0 * np.clip(env / (env.max() * 0.15), 0, 1))
mus *= duck
ir = make_ir(1.6, 5)
mus = 0.75 * mus + 0.25 * convolve_st(mus, ir)[:, :N]
tail = np.ones(N); a = ns(84.6); tail[a:] = np.linspace(1, 0, N - a) ** 1.5
mix = (voice + mus + sfx) * tail[None]
mix = norm_to(mix, -14.0, "integrated")
pk = np.abs(mix).max()
if pk > 0.95: mix *= 0.95 / pk
def save(path, x):
    with wave.open(path, "wb") as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes((np.clip(x, -1, 1).T * 32767).astype(np.int16).tobytes())
save("mix.wav", mix); save("stems/music.wav", mus); save("stems/sfx.wav", sfx); save("stems/voice.wav", voice)
open("cues.md", "w").write("# Cue sheet\n\n| layer | cue | time |\n|---|---|---|\n" + "\n".join(cues) + "\n")
print("mix", round(integrated(mix), 1), "LUFS; voice", round(integrated(voice), 1), "music", round(integrated(mus), 1), "sfx", round(integrated(sfx), 1), "len", mix.shape[1] / SR)
