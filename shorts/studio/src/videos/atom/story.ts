// "Twice" (Tsutomu Yamaguchi, 1945): timeline, places, cameras and lens, timed to the user's voice-over
// (shorts/atomic/voice/phrases.json). Ricks-clips camera grammar: one camera that keeps moving, whips between places,
// kicks on impacts. The bombs are shown only as a white flash and a distant cloud (no injuries shown beyond bandages).
export const FPS = 30;
export const TOTAL = 2040; // 68 s
export const G = 0;
export type V3 = [number, number, number];
export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const smooth = (x: number) => { const u = clamp01(x); return u * u * (3 - 2 * u); };
export const glide = (u: number) => { const x = clamp01(u); return x * x * x * (x * (6 * x - 15) + 10); };
export const lerp = (a: number, b: number, k: number) => a + (b - a) * k;

// ---------------- places ----------------
export const STREET_W = 7; // house fronts at z = +-7, the road along x
export const CLOUD: V3 = [-230, 0, -330]; // the distant cloud, seen from the street
export const SHELTER: V3 = [300, 0, 300], TRAIN: V3 = [340, 0, 300], OFFICE: V3 = [380, 0, 300], MAPT: V3 = [420, 0, 300];
export const TREE: V3 = [16.5, 0, -4.6], BENCH: V3 = [20.2, 0, -0.9];
export const CAL: V3 = [6, 2.0, -6.9]; // calendar on a house front
export const h = (p: V3, x: number, y: number, z: number): V3 => [p[0] + x, p[1] + y, p[2] + z];
/** him walking down the street: x by time */
export const walkX = (t: number) => (t < 4 ? -2 + 0.6 * t : t < 16 ? 0 : t < 21 ? 0.9 * (t - 16) : 4.5);
/** bomb times (s) and cloud growth */
export const BOMB1 = 19.95, BOMB2 = 45.75;
export const cloudK = (tau: number) => smooth((tau - 0.3) / 6);

// ---------------- shots ----------------
export type Light = "day" | "golden" | "night" | "lamp";
export type Set = "street" | "shelter" | "train" | "office" | "map";
export type ShotDef = { id: number; a: number; b: number; light: Light; set: Set; tau: (t: number) => number; old?: boolean; cloudAt?: number; sunAz?: number; sunEl?: number };
const real = (t: number) => t;
export const SHOTS: ShotDef[] = [
  { id: 1, a: 0, b: 118, light: "day", set: "street", tau: real }, // survived an atomic bomb (flash)
  { id: 2, a: 118, b: 152, light: "day", set: "train", tau: real }, // took a train home
  { id: 3, a: 152, b: 207, light: "day", set: "office", tau: real }, // hit by a second one (flash)
  { id: 4, a: 207, b: 397, light: "day", set: "street", tau: real }, // his name, engineer, business trip
  { id: 5, a: 397, b: 478, light: "day", set: "street", tau: real }, // August sixth (calendar)
  { id: 6, a: 478, b: 629, light: "day", set: "street", tau: real }, // walking, the plane, the sky turns white
  { id: 7, a: 629, b: 810, light: "day", set: "street", tau: real, cloudAt: BOMB1 }, // three km; burns, eardrums
  { id: 8, a: 810, b: 866, light: "day", set: "street", tau: real, cloudAt: BOMB1 }, // but he survives
  { id: 9, a: 866, b: 950, light: "lamp", set: "shelter", tau: real }, // the shelter
  { id: 10, a: 950, b: 1020, light: "day", set: "train", tau: real }, // the train home
  { id: 11, a: 1020, b: 1110, light: "day", set: "office", tau: real }, // bandaged, at work
  { id: 12, a: 1110, b: 1310, light: "day", set: "office", tau: real }, // the boss: you're crazy
  { id: 13, a: 1310, b: 1425, light: "day", set: "office", tau: real }, // the window lights up (flash)
  { id: 14, a: 1425, b: 1610, light: "lamp", set: "map", tau: real }, // you see: clouds, Nagasaki
  { id: 15, a: 1610, b: 1745, light: "day", set: "street", tau: real, cloudAt: BOMB2 }, // three km again; survives
  { id: 16, a: 1745, b: 1950, light: "golden", set: "street", tau: real, old: true, sunAz: 150, sunEl: 12 }, // recognized
  { id: 17, a: 1950, b: TOTAL, light: "golden", set: "street", tau: real, old: true, sunAz: 150, sunEl: 12 }, // lived to 93
];
export const XFADE: Record<number, number> = {};
export const WHIP: number[] = [118, 152, 207, 478, 629, 866, 950, 1020, 1425, 1610, 1745, 1950];
/** white flashes: [frame, length] (the bombs; the office window) */
export const FLASHES: [number, number][] = [[88, 14], [189, 14], [598, 24], [1372, 24]];
export const shotAt = (f: number) => SHOTS.find((s) => f >= s.a && f < s.b) ?? SHOTS[SHOTS.length - 1];
export const layersAt = (f: number): { id: number; alpha: number }[] => [{ id: shotAt(f).id, alpha: 1 }];

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
    cur = k.cut ? full(k.s(f)) : mixC(cur, full(k.s(f)), glide((f - k.f) / (k.dur ?? 10)));
  }
  return cur;
};
const T = (f: number) => f / FPS;
const pushK = (f: number, f0: number, rate: number) => Math.exp(-rate * Math.max(0, f - f0));
const dolly = (pos: V3, look: V3, k: number, rest: Partial<Cam> = {}): Shot =>
  ({ pos: [look[0] + (pos[0] - look[0]) * k, look[1] + (pos[1] - look[1]) * k, look[2] + (pos[2] - look[2]) * k], look, ...rest });
const O = (x: number, y: number, z: number) => h(OFFICE, x, y, z);
const Tr = (x: number, y: number, z: number) => h(TRAIN, x, y, z);
const Sh = (x: number, y: number, z: number) => h(SHELTER, x, y, z);
const Mp = (x: number, y: number, z: number) => h(MAPT, x, y, z);
const hx = (f: number) => walkX(T(f));

const S1 = (f: number) => dolly([hx(f) + 4.2, 1.55, 1.6], [hx(f), 1.45, 0], pushK(f, 0, 0.003), { fov: 42, roll: 0.02 });
const S2 = (f: number) => dolly(Tr(0.5, 1.35, -1.8), Tr(0, 1.05, 1.0), pushK(f, 118, 0.004), { fov: 44 });
const S3 = (f: number) => dolly(O(0.2, 1.5, -2.6), O(0, 1.5, 1.9), pushK(f, 152, 0.004), { fov: 44 });
const S4 = (f: number) => { const a = 0.35 + 0.0042 * (f - 207); return { pos: [Math.cos(a) * 4.4, 1.6, Math.sin(a) * 4.4], look: [0, 1.4, 0], fov: 42 } as Shot; };
const S5 = (f: number) => dolly([CAL[0] + 0.3, CAL[1], CAL[2] + 2.2], [CAL[0], CAL[1] - 0.05, CAL[2]], pushK(f, 397, 0.004), { fov: 40, roll: -0.02 });
const S6a = (f: number) => dolly([hx(f) - 3.2, 1.3, 3.0], [hx(f) + 0.6, 1.8, -0.2], pushK(f, 478, 0.001), { fov: 46 });
const S6b = (f: number): Shot => ({ pos: [hx(f) - 2.5, 1.2, 1.5], look: [hx(f) + 10, 40, -6], fov: 52, roll: 0.03 });
const S7a = (f: number) => dolly([8, 9, 3], [-50, 30, -78], pushK(f, 629, 0.0015), { fov: 48 });
const S7b = (f: number) => dolly([4.5 + 2.2, 1.55, 1.5], [4.5, 1.42, 0], pushK(f, 700, 0.003), { fov: 38, roll: 0.03 });
const S8 = (f: number) => dolly([4.5 + 2.6, 0.9, 1.7], [4.5, 1.35, 0], pushK(f, 810, 0.003), { fov: 42 });
const S9 = (f: number) => dolly(Sh(0.4, 1.15, -1.5), Sh(0, 0.85, 1.0), pushK(f, 866, 0.003), { fov: 44 });
const S10 = (f: number) => dolly(Tr(-0.8, 1.35, -1.7), Tr(0, 1.05, 1.0), pushK(f, 950, 0.003), { fov: 44, roll: 0.02 });
const S11 = (f: number) => dolly(O(0.6, 1.6, -2.9), O(-0.9, 1.2, 1.3), pushK(f, 1020, 0.002), { fov: 46 });
const S12a = (f: number) => dolly(O(3.0, 1.55, -2.9), O(0.35, 1.35, 1.9), pushK(f, 1110, 0.0015), { fov: 48 });
const S12b = (f: number) => dolly(O(0.55, 1.35, 0.4), O(0.9, 1.2, 2.4), pushK(f, 1248, 0.003), { fov: 38, roll: -0.03 });
const S13 = (f: number) => dolly(O(0, 1.5, -2.3), O(0, 1.55, 2.4), pushK(f, 1310, 0.003), { fov: 46 });
const S14a = (f: number) => dolly(Mp(0.0, 1.75, -0.5), Mp(-0.2, 0.9, 0.3), pushK(f, 1425, 0.003), { fov: 40 });
const S14b = (f: number) => dolly(Mp(0.4, 1.9, -1.2), Mp(0.3, 0.9, -0.1), pushK(f, 1550, 0.003), { fov: 42 });
const S15a = (f: number) => dolly([14, 7, 4], [-44, 28, -77], pushK(f, 1610, 0.0015), { fov: 48 });
const S15b = (f: number) => dolly([6 + 2.3, 1.5, 1.5], [6, 1.4, 0], pushK(f, 1705, 0.003), { fov: 38 });
const S16 = (f: number) => dolly([20 + 2.6, 1.5, 2.0], [20, 1.4, 0], pushK(f, 1745, 0.002), { fov: 40 });
const S17 = (f: number): Shot => { const s = glide((f - 1975) / 60); return { pos: [lerp(BENCH[0] + 2.6, 30, s), lerp(1.3, 9, s), lerp(2.2, 12, s)], look: [lerp(BENCH[0], 10, s), lerp(1.1, 4, s), lerp(-0.9, -12, s)], fov: lerp(40, 50, s), roll: 0 }; };

const CAMS: Record<number, Key[]> = {
  1: [{ f: 0, s: S1 }], 2: [{ f: 118, s: S2 }], 3: [{ f: 152, s: S3 }], 4: [{ f: 207, s: S4 }], 5: [{ f: 397, s: S5 }],
  6: [{ f: 478, s: S6a }, { f: 545, dur: 30, s: S6b }],
  7: [{ f: 629, s: S7a }, { f: 700, dur: 8, s: S7b }],
  8: [{ f: 810, s: S8 }], 9: [{ f: 866, s: S9 }], 10: [{ f: 950, s: S10 }], 11: [{ f: 1020, s: S11 }],
  12: [{ f: 1110, s: S12a }, { f: 1248, dur: 8, s: S12b }], 13: [{ f: 1310, s: S13 }],
  14: [{ f: 1425, s: S14a }, { f: 1540, dur: 14, s: S14b }],
  15: [{ f: 1610, s: S15a }, { f: 1705, dur: 8, s: S15b }], 16: [{ f: 1745, s: S16 }], 17: [{ f: 1950, s: S16 }, { f: 1975, dur: 60, s: S17 }],
};
const KICKS: [number, number][] = [[88 / 30, 1.4], [189 / 30, 1.4], [BOMB1, 2.0], [BOMB2, 1.8], [27.2, 0.6]];
export const kickAt = (t: number) => {
  let a = 0;
  for (const [t0, g] of KICKS) { const n = Math.floor((t - t0) * FPS + 1e-6); if (n >= 0 && n < 9) a += g * (n % 2 ? -1 : 1) * (1 - n / 9) ** 1.5; }
  return a;
};
const whipAt = (f: number) => { for (const w of WHIP) { const k = (f - w) / 7; if (k >= 0 && k < 1) return 1 - glide(k); } return 0; };
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
  const L = Math.hypot(...d), hh = Math.hypot(d[0], d[2]) || 1, m = (3 / 640) * Math.tan((c.fov * Math.PI) / 360) * L * a;
  return { ...c, look: [c.look[0] - (d[2] / hh) * m, c.look[1] + 0.6 * m, c.look[2] + (d[0] / hh) * m], roll: c.roll + a * 0.004 };
};
export const whipAmount = whipAt;

// ---------------- lens ----------------
export type Dof = { f: number; dur?: number; cInf: number; focus?: (f: number) => V3 };
export const DOF: Dof[] = [
  { f: 0, cInf: 12 }, { f: 118, cInf: 10 }, { f: 207, cInf: 10 }, { f: 397, cInf: 16 }, { f: 478, cInf: 4 }, { f: 545, cInf: 0 },
  { f: 629, cInf: 0 }, { f: 700, cInf: 14 }, { f: 866, cInf: 10 }, { f: 1020, cInf: 6 }, { f: 1110, cInf: 10 }, { f: 1310, cInf: 6 },
  { f: 1425, cInf: 14 }, { f: 1610, cInf: 0 }, { f: 1705, cInf: 14 }, { f: 1745, cInf: 12 }, { f: 1975, dur: 50, cInf: 0 },
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
