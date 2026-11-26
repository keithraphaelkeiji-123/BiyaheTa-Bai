# Style Guide: 2D cartoon cards in a 3D toon world

All numbers below were **measured** from the reference channel's latest 20 vertical shorts
(snapshot of 2026-10-30): 720x1280, 30 fps, **32,337 frames**, burned-in caption band masked before every
measurement. Source: the measurement reports in the `claude-animated-shorts` skill
(`references/reports/*.md`, `references/STYLE_BIBLE.md`). The reference videos and transcripts are private
study material: they are not stored here, and no script, character or shot of theirs is copied.

Units: **px@720** = pixels at 720x1280 (×1.5 for 1080x1920). **f** = frame at 30 fps. Y' = luma 0-1.
Where a value was not measured, the table says **not measured**.

---

## 1. Format

| Item | Value |
|---|---|
| Frame | vertical 9:16, 30 fps |
| Length | 31-78 s, median ~60 s |
| Start | voice starts at frame 1-4: no intro, logo, outro or call to action |
| End | video ends on the last spoken word |

## 2. Lighting

### 2.1 Key light direction (az from the view axis: 0° = sun ahead/backlight, 90° = side, 180° = behind camera; ±15°)

| Light | Frames | Direction | Azimuth | Elevation |
|---|---|---|---|---|
| Day | 20 | side-back from screen right: 6/20; soft frontal (facade shots): 7/20; top: 2/20; rest side | side-back 50-70°, side 95-100°, frontal 150-170° | 40-65° (median ~50°) |
| Sunset | 15 | **backlit, sun ahead or in frame: 10/15** | 0-40° | 3-15° (one at 25°) |
| Night | 9 | blue/violet ambient + warm practicals (lamps, windows, torches), moon top | – | – |
| Interior | 18 | window shafts / patches, bare bulbs, sconces | – | – |

### 2.2 Time of day share (grade study, 1,901 classified frames)

| Set | Frames | Share |
|---|---|---|
| Day | 552 | 29 % |
| Golden/sunset | 162 | 9 % |
| Night | 352 | 19 % |
| Interior | 835 | 44 % |

Lighting follows the story beat: noon → sunset → night-blue for the explanation section.

### 2.3 Warm vs cool

| Measure | Day | Sunset | Night | Interior |
|---|---|---|---|---|
| Dark-band hue / chroma C* | 39° / 12.4 (warm) | 8° / 15.4 (magenta-red) | 300° / 33.3 (violet) | 330° / 15.4 |
| Bright-band hue / chroma C* | 79° / 6.7 | 60° / 37.0 | 320° / 20.5 | 53° / 19.1 |
| Warm brights − darks (b*) | −0.2 | **+26** | +17 | +22 |
| Head colour (white albedo = light colour) | #f8f1ef | #fddeb6 / #fde7d0 | moon #b1ace7, #edd9f7 | warm lamp #fcdfbd |

## 3. Contrast and colour (per-frame medians)

| Measure | Day | Golden | Night | Interior | All |
|---|---|---|---|---|---|
| Y' p1 | 0.134 | 0.124 | 0.068 | 0.084 | 0.095 |
| Y' p5 | 0.205 | 0.180 | 0.087 | 0.121 | 0.137 |
| Y' p50 (median brightness) | **0.571** | 0.516 | 0.243 | 0.448 | 0.449 |
| Y' p95 | 0.895 | 0.828 | 0.669 | 0.870 | 0.857 |
| Y' p99 | 0.967 | 0.912 | 0.817 | 0.942 | 0.943 |
| Y' std (contrast) | 0.202 | 0.182 | 0.176 | 0.221 | 0.205 |
| Non-ink Y' p5 (how dark the darks get) | **0.234** | 0.211 | 0.088 | 0.129 | 0.151 |
| HSV saturation p50 | 0.429 | 0.448 | 0.611 | 0.422 | 0.467 |
| HSV saturation p90 | 0.737 | 0.671 | 0.840 | 0.764 | 0.762 |
| Lit chroma C*ab p50 (L* 40-85) | 33.8 | 36.8 | 36.7 | 28.4 | 31.9 |
| Lit chroma C*ab p90 | **54.9** | 53.0 | 64.4 | 54.9 | 56.6 |
| Local contrast (9x9 high-pass std) | 0.072 | 0.051 | 0.048 | 0.066 | 0.062 |
| Black point RGB (darkest 0.5 %) | 35,19,20 | 48,16,22 | 9,10,38 | 23,12,20 | 25,13,22 |
| White point RGB (brightest 0.5 %) | 254,251,246 | 254,240,220 | 242,230,236 | 253,246,239 | 253,247,240 |
| Vignette corner / centre | 0.856 | 0.754 | 0.461 | 0.671 | 0.719 |
| Vignette mid-edge / centre | 0.975 | 0.952 | 0.753 | 0.866 | 0.904 |
| Shadow share (Y' < 0.3) | 0.17 | 0.20 | 0.61 | 0.36 | 0.34 |
| Highlight share (Y' > 0.7) | 0.28 | 0.26 | 0.05 | 0.24 | 0.22 |

- Blacks are never pure black: they are warm-lifted (day black point 35,19,20).
- Day hue mix by saturation weight (mids): orange 40 %, azure 28 %, chartreuse 9 %, red 7 %.
- Golden hue mix: about 25 % violet, blue, magenta and rose in the shadows.

### Sky

| | Day (n 37) | Golden (n 3) |
|---|---|---|
| Upper sky | #5e93d9 (S 0.54) | #9a7e7f mauve |
| Just above skyline | #9fb6e6 (S 0.32) | #ffd18a |
| Horizon / upper luminance | 1.28 (1.18-1.40) | 1.55 (1.49-1.87) |
| Aerial haze, distance to horizon colour (far → near) | 0.41 → 0.69 | 0.60 → 0.78 |
| Haze colour | blue #94cefe, lavender #a7a3af | pink #db9594, peach #d1a57c; night fog violet #877aea |

## 4. Shadows

### 4.1 Colour (shade ÷ lit, same surface, linear light)

| Light | Y ratio | R | G | B | Result |
|---|---|---|---|---|---|
| Day, wood deck (4 samples) | **0.49-0.52** | .54-.56 | .46-.50 | .47-.50 | same hue, saturation +.02 to +.13 |
| Day, deep under sails | 0.28 | .28 | .29 | .32 | – |
| Day, grass | 0.65 | .55 | .66 | .53 | stays green |
| Day, grey steel | 0.60 | .56 | .58 | .81 | bluish only on grey metal |
| Sunset, sand (4 samples) | **0.15-0.27** | .08-.15 | .16-.30 | **1.35-3.04** | violet-blue replacement: #db9044 → #5b5173 |
| Night, sand under warm lamp | 0.51 | .47 | .51 | .91 | purple |
| Interior, sun patch on green wall | 0.69 | .27 | .82 | 4.85 | light patch replaces the colour |

### 4.2 Softness (10-90 % edge width)

| Shadow | Width px@720 |
|---|---|
| In focus (sun patch, blob, chest) | **2.8-12.5** (0.4-1.7 % of frame width) |
| Foreground, out of focus | 15.8-123.8: the softness comes from depth of field, not the light |
| Dusty sun shaft | 48.1 |

### 4.3 Length and type

| | Value |
|---|---|
| Day cast shadows | short (sun elevation 40-65°). Length in px: **not measured** |
| Sunset cast shadows | long, pointing toward the camera (sun elevation 3-15°). Length in px: **not measured** |
| Character shadow, day | soft elliptical blob offset away from the sun, Y ratio 0.52-0.74, edge 3-12 px |
| Character shadow, sunset | long soft figure silhouettes |
| Interiors | often no character shadow |
| Ambient occlusion | none. Contact = ink line + cast shadow; small props get an 8-11 px ramp (25 % darker) |

## 5. Effects

### 5.1 Ink outlines on the 3D world (width at 1080 px wide)

| Edge type | Has a line | Width median (IQR) |
|---|---|---|
| Depth jump | 19/26 | **3.09** (2.38-4.46) |
| Silhouette vs sky | 6/8 | 3.04 (2.06-3.73) |
| Convex crease | 8/10 | 2.17 (1.85-3.16) |
| Contact with ground | 3/5 | 2.42 (1.70-3.04) |
| Wall/floor joins, baseboards, sea horizon | **0/3** | none |
| Character outline (drawn on the card) | 4/5 | 4.57 (3.57-5.17), dark plum |

- Ink colour near-black #0b0a0c. Ink covers 45.1 % of strong edges; ink pixels are 1.7 % of the frame.

### 5.2 Depth of field

| Shot | Share with DOF on | Background blur sigma px@720 |
|---|---|---|
| Close-up | 42 % | 4.2 (2.8-4.4) |
| Medium | 21 % | 4.0 (1.9-4.9) |
| Full | 18 % | 2.7 (2.0-3.4) |
| Wide | 24 % | 1.9 (1.4-2.5) |
| Inserts | 46 % | 2.8 |

- Foreground object in 20 % of frames, blurred to sigma 3.7-7.8.
- No rack focus inside shots. Whole-frame blur pulses of 0.3-1 s (sigma 3.6-5) at some transitions.

### 5.3 Glow, flashes, shakes, sprites

| Effect | Measured |
|---|---|
| Bloom | emissive sources only (sun, moon, lamps, fire). e-fold 14-21 px@720. White faces never glow |
| Setting sun glow | core 90 px, r50 188 px |
| Moon glow | core 10-20 px, r50 30-38 px, r10 64-144 px |
| Specular | metal props only, one soft broad highlight |
| Rim light | none (head rim ratio 1.02-1.04) |
| Film grain | none |
| Flash transitions | 4-frame flashes (most detected "cuts") |
| Impact shake | offset flips sign **every frame**, ~3 px@720, roll ±0.1-0.35°, gone in 6-8 f; push-in stops at the hit |
| Hand-held float | none (residual 0.08 px median) |
| 2D effect sprites | muzzle fire, glow bursts, sparkles, splashes, speed lines, dust puffs, music notes, stars, light shafts. Counts: **not measured** |

## 6. Movement

### 6.1 Camera (20 videos)

| Measure | Median (range) |
|---|---|
| Hold (< 0.3 px/f) | 10 % of frames (1-27 %) |
| Drift (0.3-2 px/f) | 24 % (4-38 %) |
| Move (≥ 2 px/f) | **65 %** (34-94 %) |
| Median speed | 3.6 px/f (1.3-12.9) |
| p90 speed | 16.9 px/f (9.7-29.4) |
| Moves per 10 s | **6.0** (2.9-8) |
| Peak speed of a move | **13.7 px/f** (p25 5.9, p75 24.6, p90 36) |
| Ease in / ease out | **10 f / 10 f**, ~23 f total; 62 % symmetric, 18 % ease-out, 20 % ease-in |
| Size of one move | 101 px, zoom 23 % |
| Push-in on quiet frames | active in 70 % of them, 83 % push in; 0.14 %/f median (p75 0.34, p90 0.70) |
| Push-in runs ≥ 12 f | 336 push-ins vs 180 pull-outs; median 35 f, +22 %, 0.61 %/f |
| Roll moves | 3.2 per 10 s, median 3.6° over 18 f (p75 8.1°, p90 17.5°) |
| Whip pans | 0.45 per minute, 45-93 px/f for 7-25 f, 2-3 f ramps, heavy directional motion blur |
| Snap zoom (one example) | 0.4 → 5.9 %/f, +38 % in 14 f |
| Crane pull-back (one example) | up to −4.6 %/f, ~45 f speeding up, ~60 f slowing down |
| Camera height | median 0.79 × character height; 82 % eye level, 11 % high, 3 % low, 3 % top-down |
| Head top in frame (y from top) | CU 0.28, MS 0.35, FS 0.38, WS 0.50; horizon 0.45 |

### 6.2 Characters

| Measure | Value |
|---|---|
| Drawing rate | on ones (a new pose every frame while moving) |
| Step | 9-12 f per step (2.5-3.3 steps/s) |
| Body bob | 3-7 % of height, lowest at foot contact |
| Lean | 1° at passing → 5-7° at contact |
| Feet | planted: stance foot ≤ 1.1 px/f while the ground moves 7.2 px/f |
| Idle | none: still figures are frozen (0.01-0.8 px over 32 f) |
| Blinks | every 0.5-2.3 s, 4 f (half, shut, shut, half), plus one on every expression swap |
| Reactions | land **0-3 f before** the word; swaps are instant (1 f) |
| Action | 2-3 f crouch before a jump; spear: 3 f wind-up, ~6 f hold, 1-frame strike, 4-5 f impact ring |
| Turns | 1-4 f |
| Squash/stretch, smears, line boil | none |
| Mouths | change on ones, correlation 0.47 with voice loudness, lead by 0-1 f |
| Proportions | ~3.5 head-heights tall, legs 1.4 head-heights; stick limbs ~0.055 of head width |
| Faces | brightness V 0.97 (0.86-1.0); side gradient 14 % toward the light; top 11 % brighter |

## 7. Cuts and transitions

| Measure | Value |
|---|---|
| Hard cuts | **0-1 per video in 12/20 videos** |
| Transition types | continuous camera moves following an object, whip pans with motion blur, fly-through, 6-8 f crossfade on a change of place, 4 f flash |
| Shot length | not measured as a number: with 0-1 hard cuts, most videos are one continuous camera with ~6 moves per 10 s |

## 8. Sound

| Measure | Value |
|---|---|
| Voice | one male narrator, steady |
| Speaking rate | **3.5-4.1 words/s, median 3.7** |
| Pauses | word gaps > 0.25 s add up to < 1 s per video |
| Loudness | −14 LUFS integrated, loudness range ~2.4 LU (heavily compressed) |
| Music + SFX bed | 5-10 dB below the voice |
| Visual sync | reactions 0-3 f before the word |
| Music genre, SFX count per minute | not measured |

## 9. Script

Measured on all 20 transcripts. The transcripts are not reproduced here.

| Part | Rule | Count |
|---|---|---|
| Hook | paradox stated as fact in sentence 1, no setup. ~10-16 words | 20/20 |
| Setting | 1-2 lines, present tense, concrete details: time of day, a named everyman, numbers | 20/20 |
| Build-up | 3-6 escalation beats; others doubt or mock in short dialogue lines; stakes climb. 1-2 exaggeration jokes | 20/20 |
| Mystery beat | one question or "Wait, ...?" | ~1 per video |
| Pivot | "You see," → the real mechanism, often with an everyday analogy ("Ever ...?", "picture your body as ...") | 14/20 use "You see," |
| Twist / payoff | ironic, in the last 1-2 sentences; the video ends on the last word | 20/20 |
| Modes | story mode (third person, named everyman, present tense) or second person "Imagine you're ..." | – |
| Sentence length | median ~13.5 words; contractions, plain spoken English | – |
| Word count | 3.7 words/s × 31-78 s = **~115-290 words, ~220 for a 60 s video** (derived from rate × length) | – |

---

## 10. How we use this

Our videos copy these numbers, not the channel's content: own stories, own characters, own voice, no captions.
Starting values for the three.js + Remotion renderer are in the skill's `templates/bridge/` (lights.ts, ink.ts,
lensblur.ts, grade.ts, story.ts).

---

# Study 2: four uploaded reference videos, measured frame by frame (2026-11-26)

Source: the 4 videos the user uploaded (the other 16 of the "latest 20" could not be downloaded: YouTube is blocked
from this machine). All measured at 30 fps with `shorts/analysis/measure.py` (every frame) plus the burned-in captions
read word by word (no speech-recognition model is reachable here). The videos and full transcripts stay private and are
not in this repository. Short quotes below are for analysis only; our scripts and characters are always our own.

| | A: sleep / steel balls | B: storm oil | C: job in Japan | D: railroad gaps |
|---|---|---|---|---|
| Length | 39.1 s | 64.6 s | 60.5 s | 65.2 s |
| Source size | 360×640 | 720×1280 | 720×1280 | 720×1280 |
| Frame rate | 30 | 30 | 30 | 30 |

## S2.1 Lighting, contrast and colour (median of every frame; caption band excluded)

| | A | B | C | D |
|---|---|---|---|---|
| Luma mean (0-1) | 0.23 | 0.38 | 0.56 | 0.46 |
| Luma mean, darkest → brightest frame | 0.10 → 0.60 | 0.17 → 0.91 | 0.26 → 0.92 | 0.17 → 0.87 |
| Contrast (luma std) | 0.20 | 0.25 | 0.19 | 0.19 |
| Black point (2nd percentile) | 0.03 | 0.06 | 0.10 | 0.13 |
| White point (98th percentile) | 0.81 | 0.99 | 0.85 | 0.89 |
| Saturation (mean) | 0.46 | 0.62 | 0.42 | 0.50 |
| Warm − blue (R−B mean) | +0.08 | −0.01 | −0.14 | +0.10 |
| Shadow colour (RGB of the darkest 10 %) | 0.05 0.04 0.04 (near black) | 0.12 0.07 0.14 (purple) | 0.12 0.16 0.33 (blue) | 0.23 0.13 0.17 (mauve) |
| Highlight colour (brightest 10 %) | 0.78 0.67 0.61 (warm) | 0.90 0.91 0.92 (neutral) | 0.88 0.80 0.79 (warm) | 0.84 0.75 0.81 (warm pink) |

Lighting arc (luma mean per 10 s):

| | 0-10 | 10-20 | 20-30 | 30-40 | 40-50 | 50-60 | 60+ |
|---|---|---|---|---|---|---|---|
| A | 0.23 | 0.21 | 0.29 | 0.26 | | | |
| B | 0.46 | 0.45 | 0.39 | 0.28 | 0.43 | 0.42 | 0.32 |
| C | 0.51 | 0.60 | 0.64 | 0.48 | 0.55 | 0.38 | |
| D | 0.37 | 0.48 | 0.41 | 0.41 | 0.48 | 0.47 | 0.57 |

What the numbers show:
- **Shadows are coloured, never grey**: purple, blue or mauve in 3 of 4. Only the night-room video (A) has near-black shadows.
- **Highlights stay warm** (red above blue) in 3 of 4: warm key light, cool shadows.
- **Light follows the story**. B goes from day (0.46) to storm night (0.28) and back to a warm lamp-lit galley for the
  explanation (0.43), then a dark-blue sea for the payoff (0.32). C ends darker and bluer for the reveal (0.38). The
  explanation section ("You see, ...") is lit differently from the story in all 4.
- **A single hard light in the dark** for night or explanation scenes: A is a bare bulb over the character in a black room, and C ends
  on a wall lamp with blue walls. One amber accent in a cool scene.
- Saturation 0.42-0.62: strong but not neon. Contrast std 0.19-0.25.

## S2.2 Movement (camera, measured by phase correlation, px per frame at 720 wide)

| | A | B | C | D |
|---|---|---|---|---|
| Frames with the camera still (< 0.5 px/f) | 39 % | 22 % | 19 % | 22 % |
| Median camera speed | 2.0 | 2.8 | 4.0 | 4.5 |
| Fast frames (> 8 px/f) | 11 % | 27 % | 29 % | 38 % |
| 90th percentile speed | 8.9 | 18.1 | 20.4 | 32.0 |
| Fastest frame (whips) | 158 | 71 | 307 | 286 |
| Move bursts per minute | 54 | 49 | 34 | 41 |
| Median burst length | 7 f | 15 f | 35 f | 23 f |
| Median burst peak | 6 px/f | 6 px/f | 11 px/f | 20 px/f |

- **The camera is almost never still**: still on only 19-39 % of frames. It drifts, pushes, tracks and orbits all the time.
- **About 40-55 separate camera moves per minute**, so a new movement roughly every 1.1-1.8 s.
- **Whips of 150-300 px per frame** replace cuts when the place changes (see S2.4).
- Characters are mostly framed big: medium close-ups and close-ups of the face fill 40-60 % of the frame height in
  about half the 1 fps samples. Every subject is centred in the upper 2/3, above the captions.

## S2.3 Effects (seen in the 1-frame-per-second sheets)

- **X-ray / hologram cut-away**: a translucent blue body showing a pink brain (A).
- **Info-graphic overlays inside the scene**: depth levels labelled AWAKE / LIGHT SLEEP / DEEP SLEEP, a corkboard
  of idea cards joined by red string (A), and a phone screen showing "Inbox (0) / No new mail" (C). Labels are in-world
  signs and screens, not floating captions.
- **Signs and props carry the jokes**: FIRE button, "CAREER DEVELOPMENT ROOM" door sign (C), "THE CLICKETY CLACK LINE"
  newspaper, a MAY calendar page (D), "STORM OIL" tin (B).
- **Colour-coded state change on objects**: the rail gaps glow purple → yellow as they close (D), and the boss's face turns purple
  when angry (D).
- **Big physical payoffs**: wave walls, smoke and fire explosions (B, D), light shafts through storm clouds (B), and
  sound rings around a crash (A).
- **Anger and emotion marks**: steam puffs from the head, sweat drops, and huge open mouths in extreme close-up (B, C, D).

## S2.4 Cuts and transitions

| | A | B | C | D |
|---|---|---|---|---|
| Hard cuts | 1 | 1 | 0 | 0 |
| White flashes | 0 | 0 | 0 | 0 |

- **0-1 hard cuts per video.** Places change through:
  - whip pans (150-300 px/f, about 4-8 frames),
  - fly-throughs (into a porthole, a window or a screen),
  - zooms into an object that becomes the next scene (the soup bowl turns into the sea in B),
  - or the camera following a moving thing (oil stream, grappling hook, train).
- Each video is effectively **one continuous camera**.

## S2.5 Captions (burned in)

| | A | B | C | D |
|---|---|---|---|---|
| Text centre (% of frame height) | 70.6 % | 70.2 % | 70.3 % | 70.3 % |
| Letter height (px at 1920 tall) | ~48 | ~51 | ~51 | ~51 |
| Caption cards (word changes) | ~113 | ~230 | ~239 | ~207 |
| Words per card | 1-3 (mostly 1) | 1-3 | 1-3 | 1-3 |

- **Style**:
  - white heavy sans (Arial-Black-like), with a thick black outline and a soft dark drop shadow,
  - centred horizontally, mostly in sentence case,
  - keeps the punctuation ("wake up a genius," / "deck.").
- **Hard swaps**: no scale or pop animation. The word size is constant from its first frame.
- **Timing**: a card stays up while its word is spoken, about 0.25-0.3 s per word, and never goes blank between words.
- **Pairing**: 2-3 word cards appear for short function words ("a pirate", "the sea", "your old desk", "into the plates").

## S2.6 Sound

| | A | B | C | D |
|---|---|---|---|---|
| Loudness (integrated) | −15.6 LUFS | −14.0 | −14.0 | −14.0 |
| Loudness range | 3.5 LU | 2.4 | 1.8 | 3.2 |
| Silences > 0.25 s (below −35 dB) | 0 | 0 | 0 | 0 |

- **No silence at all**: the voice runs without pauses longer than 0.25 s, and music or SFX fill every gap.
- Heavily compressed (LRA 1.8-3.5).

## S2.7 Script (read word by word from the captions)

| | A | B | C | D |
|---|---|---|---|---|
| Words | 145 | 245 | 223 | 213 |
| Pace | 3.71 w/s | 3.79 w/s | 3.68 w/s | 3.27 w/s |
| Sentences | 12 | 21 | 16 | 20 |
| Words per sentence (median, range) | 10.5 (5-26) | 9 (4-32) | 12.5 (3-37) | 9 (3-24) |
| Hook length | 14 words | 21 words | 13 words | 9 words |
| "You see," at | 3.8 s (10 %) | 42.8 s (66 %) | 49.1 s (81 %) | 3.3 s (5 %) |
| Questions | 0 | 3 | 1 | 0 |
| Last sentence | 11 words | 32 words | 18 words | 20 words |
| Mode | 2nd person ("if you...") | 3rd person story ("He...") | 2nd person ("Imagine your boss...") | 3rd person story ("He...") |

All four together: median sentence 9 words, mean 12. Pace 3.3-3.8 words per second.

**The formula, as written in all 4:**
1. **Hook = one sentence, an absurd action or paradox stated as plain fact, no setup** (9-21 words):
   - "He sawed gaps into a railroad every 39 feet."
   - "He poured cooking oil into the sea with a pirate ship so close behind..."
   - "If you fall asleep holding two steel balls, you might wake up a genius."
   - "It's impossible to get fired in Japan, but companies found something way worse."
2. **"You see," has two jobs**:
   - Early (5-10 %): it opens the setup right after the hook (A, D).
   - Late (66-81 %): it opens the real explanation after the story (B, C).
3. **Setup with stakes in 1-2 sentences**, present tense, concrete numbers and details (39 feet, a canyon "so deep you
   can't see the bottom", "six", "three years", "50 yards").
4. **Escalation beats** start with "But", "So", "And", "Then":
   - B: 3 "But", 3 "And"; D: 3 "And".
   - Each beat makes it worse or makes the hero look dumber: others mock him in short quoted lines ("You're wrecking my railroad." /
     "you're making soup?"), a rival seems to win, the boss is "thrilled".
5. **A "weird" turn**: "Now, here's the weird part." (A) / "something weird happens." (D) / "Then one Monday... he's
   gone." (C).
6. **Explanation with an everyday analogy**:
   - "Ever blown on a bowl of soup?" (B),
   - a named concept: "a strange halfway state called hypnagogia" (A),
   - the real rule: "Japanese law makes it almost impossible to fire someone, but there's no law against making
     them miserable." (C).
7. **Ironic payoff = the last sentence**, often a callback to the hook's props:
   - "wake up holding the idea instead of the balls." (A)
   - the wave "drops straight onto the pirates' deck." (B)
   - "nobody can do nothing forever." (C)
   - the perfect railroad "kicks sideways like a snake right as a train rolls onto it." (D)

   The video ends on that last word: no outro, no call to action.
8. **Tone**: deadpan and plain, with contractions. Each video has 1-2 exaggeration jokes, such as "Sounds like the worst nap
   ever." and "the pirates couldn't be happier. Why waste a cannonball when the storm will do it for free?"

## S2.8 Differences from Study 1 (the earlier 20-video study above)

- **More camera motion than measured before.** Here the camera is still only 19-39 % of frames, against ~80 % "holds" in the old
  study. These four newer videos move constantly, with 34-54 separate moves a minute.
- **Captions sit at 70 % height** (measured), with a thick outline rather than a thin one.
- One video (C) is drawn almost fully 2D (flat illustrated rooms with heavy outlines). The other three are 3D toon
  worlds. Characters are the same in all four: white round heads, black stick limbs, pill-shaped bodies, small hats.
