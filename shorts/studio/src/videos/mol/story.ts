// "The Sweetest Disaster" (Boston, 1919): timeline, places, story physics, cameras and lens, timed to the Adam voice
// (shorts/molasses/voice/segments.json). Camera grammar from the user's ricks-clips-style skill: one camera that keeps
// moving (push, track, orbit, crane), place changes by fast whips instead of plain cuts, snap zooms + shake on impacts.
export const FPS = 30;
export const TOTAL = 2040; // 68 s
export const G = 0; // street level
export type V3 = [number, number, number];

export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const smooth = (x: number) => { const u = clamp01(x); return u * u * (3 - 2 * u); };
export const glide = (u: number) => { const x = clamp01(u); return x * x * x * (x * (6 * x - 15) + 10); };
export const lerp = (a: number, b: number, k: number) => a + (b - a) * k;

// ---------------- places ----------------
// Commercial Street runs along x; brick fronts at z = +-7.5; the tank stands in its yard at the west end, the harbour
// behind it; the elevated railway crosses the street at x = RAIL_X; a wooden shed stands in a gap on the south side.
export const STREET_W = 7.5;
export const TANK: V3 = [-42, 0, 0];
export const TANK_R = 13.5, TANK_H = 15;
export const RAIL_X = 28, RAIL_Y = 6.4;
export const SHED: V3 = [18, 0, -11.2];
export const LAB: V3 = [300, 0, 300];
export const COURT: V3 = [340, 0, 300];
export const h = (p: V3, x: number, y: number, z: number): V3 => [p[0] + x, p[1] + y, p[2] + z];
export const LADDER: V3 = [TANK[0] + TANK_R + 0.3, 0, -3.2];

// ---------------- story physics (tau = story time, s) ----------------
export const BURST = 27.75;
export const PAINT0 = 19.95, PAINT1 = 21.4; // the tank turns brown
/** front of the wave along the street (x) */
const XS: [number, number][] = [[BURST, -28.5], [BURST + 2.7, -5], [34.3, 18], [36.2, 28], [38.0, 36], [42, 44], [99, 44]];
export const waveX = (tau: number) => {
  if (tau <= XS[0][0]) return XS[0][1];
  for (let i = 1; i < XS.length; i++) if (tau <= XS[i][0]) { const [t0, x0] = XS[i - 1], [t1, x1] = XS[i]; return x0 + ((x1 - x0) * (tau - t0)) / (t1 - t0); }
  return XS[XS.length - 1][1];
};
/** wave height at its front */
export const waveH = (tau: number) => (tau < BURST ? 0 : 0.95 + 8.5 * Math.exp(-(tau - BURST) / 5.5));
/** depth of the goo left on the street */
export const GOO = 0.95;
export const SHOVE = 34.0, BEND = 35.9;
/** viscosity "cold" amount 0..1 (sunset into night) */
export const cold = (tau: number) => smooth((tau - 38.5) / 7);

// ---------------- shots ----------------
export type Light = "day" | "golden" | "night" | "lamp";
export type Set = "street" | "lab" | "court";
export type ShotDef = { id: number; a: number; b: number; light: Light; set: Set; tau: (t: number) => number; summer?: boolean; sunAz?: number; sunEl?: number };
const real = (t: number) => t;
export const SHOTS: ShotDef[] = [
  { id: 1, a: 0, b: 180, light: "day", set: "street", tau: (t) => 31.2 + t * 0.55 }, // hook: the wave (flash-forward)
  { id: 2, a: 180, b: 385, light: "day", set: "street", tau: real }, // the tank, five stories tall
  { id: 3, a: 385, b: 525, light: "day", set: "street", tau: real }, // leaks, kids with cups
  { id: 4, a: 525, b: 690, light: "day", set: "street", tau: real }, // painted brown
  { id: 5, a: 690, b: 772, light: "day", set: "street", tau: real }, // never tested with water
  { id: 6, a: 772, b: 858, light: "day", set: "street", tau: real }, // a warm afternoon: it bursts
  { id: 7, a: 858, b: 1128, light: "day", set: "street", tau: real }, // the wave, the shed, the train bridge
  { id: 8, a: 1128, b: 1255, light: "golden", set: "street", tau: real }, // the sun goes down
  { id: 9, a: 1255, b: 1395, light: "night", set: "street", tau: real }, // thicker, stuck
  { id: 10, a: 1395, b: 1455, light: "night", set: "street", tau: real }, // twenty-one people died
  { id: 11, a: 1455, b: 1740, light: "lamp", set: "lab", tau: real }, // viscosity
  { id: 12, a: 1740, b: 1855, light: "lamp", set: "court", tau: real }, // anarchists / the court
  { id: 13, a: 1855, b: TOTAL, light: "day", set: "street", tau: real, summer: true }, // decades later: it smells sweet
];
/** place changes: a fast whip (motion streak + blend) instead of a plain cut */
export const XFADE: Record<number, number> = { 2: 6, 8: 8, 9: 8, 10: 6, 11: 8, 12: 8, 13: 8 };
export const WHIP: number[] = [180, 1128, 1255, 1395, 1455, 1740, 1855];
export const FLASH_AT = -100;
export const shotAt = (f: number) => SHOTS.find((s) => f >= s.a && f < s.b) ?? SHOTS[SHOTS.length - 1];
export const layersAt = (f: number): { id: number; alpha: number }[] => {
  for (const s of SHOTS) {
    const x = XFADE[s.id];
    if (x && f >= s.a - x / 2 && f < s.a + x / 2) return [{ id: s.id - 1, alpha: 1 }, { id: s.id, alpha: (f - (s.a - x / 2) + 1) / (x + 1) }];
  }
  return [{ id: shotAt(f).id, alpha: 1 }];
};

// ---------------- camera ----------------
export type Cam = { pos: V3; look: V3; fov: number; roll: number };
type Shot = Partial<Cam> & { pos: V3; look: V3 };
type Key = { f: number; dur?: number; cut?: boolean; s: (f: number) => Shot };
const mixC = (a: Cam, b: Cam, k: number): Cam => ({
  pos: a.pos.map((v, i) => v + (b.pos[i] - v) * k) as V3, look: a.look.map((v, i) => v + (b.look[i] - v) * k) as V3,
  fov: a.fov + (b.fov - a.fov) * k, roll: a.roll + (b.roll - a.roll) * k,
});
const full = (c: Shot): Cam => ({ fov: 40, roll: 0, ...c });
const run = (keys: Key[], f: number) => {
  let cur = full(keys[0].s(f));
  for (let i = 1; i < keys.length; i++) {
    const k = keys[i];
    if (f < k.f) break;
    cur = k.cut ? full(k.s(f)) : mixC(cur, full(k.s(f)), glide((f - k.f) / (k.dur ?? 12)));
  }
  return cur;
};
const T = (f: number) => f / FPS;
const pushK = (f: number, f0: number, rate: number) => Math.exp(-rate * Math.max(0, f - f0));
const dolly = (pos: V3, look: V3, k: number, rest: Partial<Cam> = {}): Shot =>
  ({ pos: [look[0] + (pos[0] - look[0]) * k, look[1] + (pos[1] - look[1]) * k, look[2] + (pos[2] - look[2]) * k], look, ...rest });
const [TX, , TZ] = TANK, TE = TX + TANK_R; // tank east face
const Lb = (x: number, y: number, z: number) => h(LAB, x, y, z);
const Ct = (x: number, y: number, z: number) => h(COURT, x, y, z);
const orbit = (c: V3, r: number, y: number, a: number, look: V3, rest: Partial<Cam> = {}): Shot => ({ pos: [c[0] + r * Math.cos(a), y, c[2] + r * Math.sin(a)], look, ...rest });

// 1 hook: low in the street, people run at us, the brown wall right behind them; the camera backs away
const S1 = (f: number) => { const x = waveX(31.2 + T(f) * 0.55); return { pos: [x + 19 - 0.015 * f, 2.6, 2.4], look: [x - 2, 3.6, -0.4], fov: 46, roll: 0.03 } as Shot; };
// 2 the tank: the boss at its foot, then crane up its wall on "five stories tall"
const S2a = (f: number) => dolly([TE + 6.5, 1.55, 6.5], [TE + 1.8, 1.4, 1.6], pushK(f, 180, 0.0025), { fov: 40, roll: -0.02 });
const S2b = (f: number) => { const u = glide((f - 335) / 50); return { pos: [lerp(TE + 8, TE + 30, u), lerp(2, 4, u), lerp(5, 4, u)], look: [TX + 2, lerp(4, TANK_H * 0.62, u), TZ], fov: lerp(46, 52, u) } as Shot; };
// 3 the leaky seam, then the kids with cups
const S3a = (f: number) => dolly([TE + 3.2, 1.7, 2.8], [TE, 1.4, 0.4], pushK(f, 385, 0.003), { fov: 38 });
const S3b = (f: number) => dolly([TE + 4.5, 1.15, 3.8], [TE + 1.2, 0.95, 0.2], pushK(f, 445, 0.0025), { fov: 42, roll: 0.03 });
// 4 the boss on the ladder painting; then pull back to the whole brown tank
const S4a = (f: number) => orbit([LADDER[0], 0, LADDER[2]], 5.6, 3.0, 0.75 + 0.0012 * (f - 525), [LADDER[0] - 0.2, 2.9, LADDER[2]], { fov: 42 });
const S4b = (f: number) => dolly([TE + 34, 4.5, 3.5], [TX, 8, TZ], pushK(f, 645, -0.0008), { fov: 50 });
// 5 the tiny water bucket
const S5 = (f: number) => dolly([TE + 4.2, 1.3, 3.4], [TE + 1.3, 0.9, 1.1], pushK(f, 690, 0.003), { fov: 38, roll: -0.03 });
// 6 a calm warm afternoon down the street; burst
const S6 = (f: number) => dolly([22, 2.0, 3.2], [TX + 4, 7, 0], pushK(f, 772, 0.0015), { fov: 40 });
// 7 the wave: fly backwards ahead of it; the shed; the bridge from below
const S7a = (f: number) => { const x = waveX(T(f)); return { pos: [x + 17, 2.8, 2.6], look: [x - 2, 3.8, -0.6], fov: 50, roll: 0.04 } as Shot; };
const S7b = (f: number) => dolly([SHED[0] + 12, 3.4, -1.0], [SHED[0] + 1.5, 2.0, SHED[2] + 1.0], pushK(f, 1005, 0.002), { fov: 48, roll: -0.04 });
const S7c = (f: number) => dolly([RAIL_X + 13, 1.4, 5.5], [RAIL_X, RAIL_Y - 0.5, 0], pushK(f, 1068, 0.003), { fov: 46, roll: 0.05 });
// 8 golden: the drowned street, people stuck in it; slow push
const S8 = (f: number) => dolly([12, 2.4, 5], [-2, 1.1, -0.5], pushK(f, 1128, 0.0016), { fov: 44 });
// 9 night: closer on the stuck people
const S9 = (f: number) => dolly([0.8, 1.7, 3.6], [-2.4, 1.15, 0.2], pushK(f, 1255, 0.0025), { fov: 40, roll: 0.02 });
// 10 night wide, high and still
const S10 = (f: number) => dolly([40, 14, 0.5], [-8, 0.6, 0], pushK(f, 1395, 0.001), { fov: 46 });
// 11 the viscosity table: jar macro, the spoon, the thermometer, the wading man
const S11a = (f: number) => dolly(Lb(-0.2, 1.35, -1.25), Lb(0, 1.05, 0), pushK(f, 1455, 0.002), { fov: 38 });
const S11b = (f: number) => dolly(Lb(0.55, 1.25, -0.75), Lb(0.25, 1.05, 0), pushK(f, 1520, 0.0025), { fov: 36, roll: 0.03 });
const S11c = (f: number) => dolly(Lb(-2.2, 1.6, -3.6), Lb(-2.6, 0.9, 0.8), pushK(f, 1595, 0.002), { fov: 44 });
// 12 the court: the boss points at the "anarchist"; whip to the judge
const S12a = (f: number) => dolly(Ct(-1.9, 1.6, -4.4), Ct(-1.9, 1.3, 0.3), pushK(f, 1740, 0.0025), { fov: 48 });
const S12b = (f: number) => dolly(Ct(-1.0, 1.9, -1.6), Ct(1.6, 2.1, 2.2), pushK(f, 1800, 0.003), { fov: 40, roll: -0.03 });
// 13 summer, decades later: a kid sniffs the air; crane up over the roofs
const S13a = (f: number) => dolly([6, 1.4, 3.0], [2.5, 1.15, 0.3], pushK(f, 1855, 0.002), { fov: 40 });
const S13b = (f: number): Shot => { const s = glide((f - 1955) / 80); return { pos: [lerp(5.6, 40, s), lerp(1.45, 24, s), lerp(2.9, 2, s)], look: [lerp(2.5, -10, s), lerp(1.15, 2, s), lerp(0.3, 0, s)], fov: lerp(40, 50, s), roll: 0 }; };

const CAMS: Record<number, Key[]> = {
  1: [{ f: 0, s: S1 }],
  2: [{ f: 180, s: S2a }, { f: 335, dur: 50, s: S2b }],
  3: [{ f: 385, s: S3a }, { f: 445, dur: 9, s: S3b }],
  4: [{ f: 525, s: S4a }, { f: 640, dur: 9, s: S4b }],
  5: [{ f: 690, s: S5 }],
  6: [{ f: 772, s: S6 }],
  7: [{ f: 858, s: S7a }, { f: 1005, dur: 9, s: S7b }, { f: 1068, dur: 9, s: S7c }],
  8: [{ f: 1128, s: S8 }],
  9: [{ f: 1255, s: S9 }],
  10: [{ f: 1395, s: S10 }],
  11: [{ f: 1455, s: S11a }, { f: 1520, dur: 9, s: S11b }, { f: 1595, dur: 10, s: S11c }],
  12: [{ f: 1740, s: S12a }, { f: 1800, dur: 9, s: S12b }],
  13: [{ f: 1855, s: S13a }, { f: 1955, dur: 80, s: S13b }],
};
// impact kicks: sign flips every frame, gone in 7 f (rivets, burst, shed, bridge, gavel)
const KICKS: [number, number][] = [[BURST, 1.6], [BURST + 0.25, 0.8], [SHOVE, 1.0], [BEND, 1.3], [60.25, 0.7], [60.75, 0.7]];
export const kickAt = (t: number) => {
  let a = 0;
  for (const [t0, g] of KICKS) {
    const n = Math.floor((t - t0) * FPS + 1e-6);
    if (n >= 0 && n < 7) a += g * (n % 2 ? -1 : 1) * (1 - n / 7) ** 1.5;
  }
  return a;
};
/** whip: the first frames of a new place come in with a fast sideways swing (and the layer blend in the video) */
const whipAt = (f: number) => { for (const w of WHIP) { const k = (f - w) / 7; if (k >= 0 && k < 1) return (1 - glide(k)) ; } return 0; };
export const camAt = (id: number, f: number): Cam => {
  let c = run(CAMS[id], f);
  const w = whipAt(f);
  if (w) {
    const d: V3 = [c.look[0] - c.pos[0], c.look[1] - c.pos[1], c.look[2] - c.pos[2]];
    const L = Math.hypot(...d), hh = Math.hypot(d[0], d[2]) || 1, m = 0.55 * L * w;
    c = { ...c, look: [c.look[0] - (d[2] / hh) * m, c.look[1], c.look[2] + (d[0] / hh) * m], roll: c.roll + 0.08 * w };
  }
  const a = kickAt(T(f));
  if (!a) return c;
  const d: V3 = [c.look[0] - c.pos[0], c.look[1] - c.pos[1], c.look[2] - c.pos[2]];
  const L = Math.hypot(...d), hh = Math.hypot(d[0], d[2]) || 1;
  const m = (3 / 640) * Math.tan((c.fov * Math.PI) / 360) * L * a;
  return { ...c, look: [c.look[0] - (d[2] / hh) * m, c.look[1] + 0.6 * m, c.look[2] + (d[0] / hh) * m], roll: c.roll + a * 0.004 };
};
export const whipAmount = whipAt;

// ---------------- lens ----------------
export type Dof = { f: number; dur?: number; cInf: number; focus?: (f: number) => V3 };
export const DOF: Dof[] = [
  { f: 0, cInf: 6 }, { f: 180, cInf: 12 }, { f: 335, dur: 40, cInf: 0 }, { f: 385, cInf: 14 }, { f: 525, cInf: 10 }, { f: 640, cInf: 0 },
  { f: 690, cInf: 14 }, { f: 772, cInf: 0 }, { f: 858, cInf: 4 }, { f: 1005, cInf: 6 }, { f: 1068, cInf: 0 }, { f: 1128, cInf: 6 },
  { f: 1255, cInf: 12 }, { f: 1395, cInf: 0 }, { f: 1455, cInf: 16 }, { f: 1595, cInf: 8 }, { f: 1740, cInf: 10 }, { f: 1855, cInf: 12 }, { f: 1955, dur: 60, cInf: 0 },
];
export const dofAt = (f: number) => {
  let i = 0; while (i + 1 < DOF.length && f >= DOF[i + 1].f) i++;
  const d = DOF[i], p = DOF[Math.max(0, i - 1)];
  const k = d.dur ? Math.min(1, (f - d.f) / d.dur) : 1;
  return { cInf: p.cInf + (d.cInf - p.cInf) * k, focus: d.focus };
};
export const OUT_FRAMES = TOTAL;
export const remapF = (f: number) => f;
export const D0 = G;
