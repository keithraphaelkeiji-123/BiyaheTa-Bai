// "The Lake That Went Down the Drain": timeline, story physics, cameras and lens, timed to the voice words
// (shorts/lake-peigneur/voice/words.json). Camera grammar (STYLE_GUIDE.md 6.1): symmetric smootherstep glides of
// 18-40 f, cuts on big reframes, every hold pushes in 0.15-0.35 %/f (0.6 %/f on punch words), 7-frame kicks.
export const FPS = 30;
export const TOTAL = 2046;
export const D0 = 1.2; // shore ground height above the full lake surface (m)
export const LR = 120; // lake radius
export type V3 = [number, number, number];

export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const smooth = (x: number) => { const u = clamp01(x); return u * u * (3 - 2 * u); };
export const easeOut = (u: number) => 1 - (1 - clamp01(u)) ** 4;
export const glide = (u: number) => { const x = clamp01(u); return x * x * x * (x * (6 * x - 15) + 10); };

// ---------------- places ----------------
export const RIG: V3 = [0, 0, 0];
export const DECK = 1.6; // rig platform top
export const TUG: V3 = [24, 0, 16];
export const BARGES: V3[] = Array.from({ length: 11 }, (_, k) => [40 + (k % 2) * 1.5, 0, -46 + k * 8.2] as V3);
export const BOAT0: V3 = [-36, 0, -52];
export const ISLAND: V3 = [-40, 0, 112]; // hill centre (north shore)
export const CHUNK: V3 = [-30, 0, 72]; // the piece of island that slides in
export const TREES: V3[] = [[-38, 0, 66], [-24, 0, 70], [-31, 0, 78], [-18, 0, 76], [-44, 0, 74]];
export const HEAD: V3 = [-52, 0, 128]; // mine headframe on the island
export const MINE_Y = -70, CEIL_Y = -62; // salt mine room under the lake
export const TEA: V3 = [138, D0, -34]; // porch table on the east shore
export const CANAL_Z = 0, CANAL_W = 14;

// ---------------- story physics (tau = story time, s) ----------------
export const TILT0 = 19.95;
export const rigTilt = (tau: number) => 0.13 * smooth((tau - TILT0) / 1.1) + 0.02 * Math.sin(Math.max(0, tau - TILT0) * 9) * Math.exp(-Math.max(0, tau - TILT0) * 2);
export const STUCK = 19.0;
export const SPIN0 = 27.6;
/** whirlpool strength 0..1 */
export const swirl = (tau: number) => (tau < 36 ? smooth((tau - SPIN0) / 1.6) : tau < 59 ? 0 : 0);
/** water level of the lake (m); < -50 = no water */
export const level = (tau: number) => (tau < 36 ? -0.9 * smooth((tau - 29) / 7) : tau < 59.6 ? -99 : 0);
/** crater (sinkhole) radius once the lake is gone */
export const crater = (tau: number) => (tau >= 36 && tau < 59.6 ? 34 : 0);
/** things the whirlpool takes: time they reach the centre, spiral time before that */
export type Sw = { tS: number; dur: number };
export const SW_RIG: Sw = { tS: 30.9, dur: 1.4 };
export const SW_TUG: Sw = { tS: 31.95, dur: 1.6 };
export const SW_BARGE = (k: number): Sw => ({ tS: 32.45 + 0.17 * k, dur: 2.3 });
export const SW_TREE = (k: number): Sw => ({ tS: 34.8 + 0.12 * k, dur: 1.6 });
export const SW_CHUNK: Sw = { tS: 36.2, dur: 2.0 };
/** progress 0..1 along the spiral */
export const swU = (s: Sw, tau: number) => clamp01((tau - (s.tS - s.dur)) / s.dur);
/** position on the spiral from (x0, z0) into the centre: [x, z, sink depth, spin angle] */
export const spiral = (p0: V3, u: number): [number, number, number, number] => {
  const r0 = Math.hypot(p0[0], p0[2]), a0 = Math.atan2(p0[2], p0[0]);
  const e = u * u, r = r0 * (1 - e) ** 1.2, a = a0 + 3.2 * e;
  return [r * Math.cos(a), r * Math.sin(a), 14 * smooth((e - 0.75) / 0.25), 6 * e];
};
/** funnel depth at radius r */
export const funnel = (tau: number, r: number) => swirl(tau) * 9 * Math.exp(-((r / 16) ** 2));
/** the fishing boat drifts toward the middle from "His boat is moving" */
export const boatPos = (tau: number): V3 => {
  const k = 0.16 * smooth((tau - 25.6) / 3) + 0.04 * clamp01((tau - 28.6) / 6);
  return [BOAT0[0] * (1 - k), 0, BOAT0[2] * (1 - k)];
};
export const POP = [63.3, 63.75, 64.3]; // barges popping back up
export const SUGAR_IN = 49.1; // cube hits the tea
export const POKE = 45.6; // drill through the mine roof
export const holeR = (tau: number) => (tau < 46.3 ? 0.25 : tau < 51 ? 0.35 : 0.35 + 1.4 * smooth((tau - 51.6) / 1.6) + 2.2 * smooth((tau - 54.2) / 1.4));

// ---------------- shots ----------------
export type Light = "day" | "golden";
export type Set = "lake" | "mine" | "tea";
export type ShotDef = { id: number; a: number; b: number; light: Light; set: Set; tau: (t: number) => number; sunAz?: number; sunEl?: number };
export const SHOTS: ShotDef[] = [
  { id: 1, a: 0, b: 128, light: "day", set: "lake", tau: (t) => t + 13 }, // hook: the crew drilling
  { id: 2, a: 128, b: 182, light: "day", set: "lake", tau: (t) => t + 26.2 }, // hook: flash-forward to the whirlpool
  { id: 3, a: 182, b: 322, light: "day", set: "lake", tau: (t) => t }, // calm lake, fishing
  { id: 4, a: 322, b: 391, light: "day", set: "mine", tau: (t) => t }, // miners digging salt
  { id: 5, a: 391, b: 661, light: "day", set: "lake", tau: (t) => t }, // rig, stuck, tilt, jump
  { id: 6, a: 661, b: 822, light: "day", set: "lake", tau: (t) => t }, // fisherman: boat moving
  { id: 7, a: 822, b: 1081, light: "day", set: "lake", tau: (t) => t }, // whirlpool swallows everything
  { id: 8, a: 1081, b: 1142, light: "day", set: "lake", tau: (t) => t }, // three hours later: gone
  { id: 9, a: 1142, b: 1212, light: "day", set: "lake", tau: (t) => t }, // luckily: miners out
  { id: 10, a: 1212, b: 1280, light: "day", set: "mine", tau: (t) => t }, // unluckily: flooded mine
  { id: 11, a: 1280, b: 1430, light: "day", set: "mine", tau: (t) => t }, // the drill pokes the roof
  { id: 12, a: 1430, b: 1539, light: "day", set: "tea", tau: (t) => t }, // sugar cube in tea
  { id: 13, a: 1539, b: 1653, light: "day", set: "mine", tau: (t) => t }, // the hole gets wider
  { id: 14, a: 1653, b: 1793, light: "golden", set: "lake", tau: (t) => t }, // canal backwards, waterfall
  { id: 15, a: 1793, b: 1941, light: "day", set: "lake", tau: (t) => t }, // full again, barges pop up
  { id: 16, a: 1941, b: TOTAL, light: "day", set: "lake", tau: (t) => t }, // saltier, deeper
];
export const XFADE: Record<number, number> = { 4: 8, 5: 8, 8: 8, 10: 6, 12: 8, 13: 8, 14: 8, 15: 8 };
export const FLASH_AT = 182;
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
const mix = (a: Cam, b: Cam, k: number): Cam => ({
  pos: a.pos.map((v, i) => v + (b.pos[i] - v) * k) as V3, look: a.look.map((v, i) => v + (b.look[i] - v) * k) as V3,
  fov: a.fov + (b.fov - a.fov) * k, roll: a.roll + (b.roll - a.roll) * k,
});
const full = (c: Shot): Cam => ({ fov: 40, roll: 0, ...c });
const run = (keys: Key[], f: number) => {
  let cur = full(keys[0].s(f));
  for (let i = 1; i < keys.length; i++) {
    const k = keys[i];
    if (f < k.f) break;
    cur = k.cut ? full(k.s(f)) : mix(cur, full(k.s(f)), glide((f - k.f) / (k.dur ?? 24)));
  }
  return cur;
};
const T = (f: number) => f / FPS;
const pushK = (f: number, f0: number, rate: number, punch = 0, n = 35) => {
  const x = Math.max(0, f - f0);
  let s = rate * x;
  if (punch > rate) for (let i = 0; i < Math.min(x, n); i++) s += (punch - rate) * Math.max(0, Math.min(1, (i + 0.5) / 8, (n - i - 0.5) / 8));
  return Math.exp(-s);
};
const dolly = (pos: V3, look: V3, k: number, rest: Partial<Cam> = {}): Shot =>
  ({ pos: [look[0] + (pos[0] - look[0]) * k, look[1] + (pos[1] - look[1]) * k, look[2] + (pos[2] - look[2]) * k], look, ...rest });
const zoom = (pos: V3, look: V3, fov: number, k: number, rest: Partial<Cam> = {}): Shot =>
  ({ pos, look, fov: (360 / Math.PI) * Math.atan(Math.tan((fov * Math.PI) / 360) * k), ...rest });
const rolled = (s: (f: number) => Shot, roll: number) => (f: number): Shot => ({ ...s(f), roll });
const D = DECK;
const bp = (f: number) => boatPos(T(f));

// shot 1: crew drilling on the rig deck (low), then the turning drill pipe on "drilled one small hole"
const S1a = (f: number) => dolly([-7.5, D + 1.6, -9.5], [0.4, D + 2.4, 0.5], pushK(f, 0, 0.0025), { fov: 42, roll: -0.03 });
const S1b = (f: number) => dolly([-2.6, D + 1.2, -3.4], [0, D + 1.5, 0], pushK(f, 70, 0.003, 0.006, 30), { fov: 38, roll: 0.04 });
// shot 2: aerial over the whirlpool (flash-forward), pushing down into it on "drain"
const S2a = (f: number) => dolly([30, 46, -52], [0, -2, 0], pushK(f, 128, 0.003, 0.007, 35), { fov: 44, roll: 0.05 });
// shot 3: low over the calm water toward the boat, the rig far behind; MS of the fishermen on "fishing"
const S3a = (f: number) => dolly([BOAT0[0] - 18, 2.4, BOAT0[2] - 14], [BOAT0[0] + 4, 1.4, BOAT0[2] + 6], pushK(f, 182, 0.002), { fov: 44 });
const S3b = (f: number) => dolly([BOAT0[0] - 4.4, 2.5, BOAT0[2] - 4.8], [BOAT0[0], 1.2, BOAT0[2]], pushK(f, 290, 0.0025), { fov: 40, roll: -0.03 });
// shot 4: salt mine, miners swinging picks
const M = MINE_Y;
const S4a = (f: number) => dolly([-0.6, M + 2.3, -11], [-0.3, M + 1.1, 2.0], pushK(f, 322, 0.003), { fov: 46, roll: 0.03 });
// shot 5: rig wide from the water -> drill CU "stuck" -> low wide "tilt" -> crew jumping
const S5a = (f: number) => dolly([-26, 6, -30], [0, 9, 0], pushK(f, 391, 0.0025), { fov: 44 });
const S5b = (f: number) => dolly([-2.2, D + 1.3, -2.8], [0, D + 0.9, 0], pushK(f, 505, 0.002, 0.007, 30), { fov: 38 });
const S5c = (f: number) => dolly([-17, 1.5, -20], [0, 7, 0], pushK(f, 600, 0.0025), { fov: 46, roll: -0.05 });
const S5d = (f: number) => dolly([-11, 2.2, -12], [-3.5, 1.5, -3.2], pushK(f, 632, 0.003), { fov: 42, roll: 0.04 });
// shot 6: the fishermen (MS), then wider as the boat moves, then a turn toward the middle
const S6a = (f: number) => { const p = bp(f); return dolly([p[0] - 4.2, 2.5, p[2] - 4.8], [p[0], 1.2, p[2]], pushK(f, 661, 0.0025), { fov: 40 }); };
const S6b = (f: number) => { const p = bp(f); return dolly([p[0] - 9, 3.2, p[2] - 6], [p[0] + 2, 1.0, p[2] + 3], pushK(f, 770, 0.002), { fov: 42, roll: -0.04 }); };
const S6c = (f: number) => { const p = bp(f); return dolly([p[0] - 6, 3.4, p[2] - 8], [0, 3, 0], pushK(f, 794, 0.003, 0.007, 28), { fov: 38 }); };
// shot 7: whirlpool: aerial spin -> the rig goes -> tug -> barges (wide) -> trees -> island piece
const S7a = (f: number) => dolly([-34, 40, -40], [0, -1, 0], pushK(f, 822, 0.003), { fov: 46, roll: 0.06 });
const S7b = (f: number) => dolly([-22, 7, -22], [0, 2, 0], pushK(f, 885, 0.003, 0.007, 30), { fov: 42, roll: -0.05 });
const S7c = (f: number) => dolly([30, 30, -58], [8, -1, -4], pushK(f, 938, 0.0025), { fov: 46, roll: 0.04 });
const S7d = (f: number) => dolly([-6, 9, 32], [-28, 3, 72], pushK(f, 1020, 0.003), { fov: 42, roll: -0.04 });
const S7e = (f: number) => dolly([24, 26, 10], [-24, 0, 66], pushK(f, 1043, 0.0025, 0.006, 30), { fov: 44 });
// shot 8: the empty lake: high wide over the crater, push in on "gone"
const S8a = (f: number) => dolly([-34, 30, -46], [0, -10, 0], pushK(f, 1081, 0.0025, 0.006, 35), { fov: 46, roll: 0.03 });
// shot 9: miners running out of the headframe
const S9a = (f: number) => dolly([HEAD[0] + 10, 18.5, HEAD[2] - 12], [HEAD[0], 16.4, HEAD[2] - 2], pushK(f, 1142, 0.0025), { fov: 42, roll: 0.03 });
// shot 10: flooded mine tunnel, low at the water
const S10a = (f: number) => dolly([-12, M + 1.4, -14], [0, M + 1.2, -2], pushK(f, 1212, 0.003), { fov: 44, roll: -0.05 });
// shot 11: looking up at the mine roof; the drill pokes through on "poked"; water on "hole"
const S11a = (f: number) => dolly([-8, M + 1.8, -9], [0, CEIL_Y - 1.5, 0], pushK(f, 1280, 0.0025), { fov: 46 });
const S11b = (f: number) => dolly([-3.5, M + 3.5, -4], [0, CEIL_Y - 0.4, 0], pushK(f, 1360, 0.002, 0.007, 30), { fov: 40, roll: 0.04 });
// shot 12: macro on the tea cup; the cube drops in
const [tx, ty, tz] = TEA;
const S12a = (f: number) => dolly([tx - 0.62, ty + 1.12, tz - 0.42], [tx, ty + 0.86, tz], pushK(f, 1430, 0.0025, 0.006, 30), { fov: 38 });
const S12b = (f: number) => dolly([tx - 0.36, ty + 1.02, tz - 0.25], [tx, ty + 0.88, tz], pushK(f, 1495, 0.003), { fov: 36, roll: 0.03 });
// shot 13: the roof hole widening, water pouring
const S13a = (f: number) => dolly([-12, M + 2, -13], [0, M + 4, 0], pushK(f, 1539, 0.0025, 0.006, 30), { fov: 44, roll: -0.04 });
const S13b = (f: number) => dolly([-17, M + 1.5, -18], [0, M + 4.5, 0], pushK(f, 1630, 0.003), { fov: 46, roll: 0.04 });
// shot 14: golden: the canal running backwards across the empty bed, then the waterfall into the crater
const S14a = (f: number) => dolly([LR + 26, 14, 26], [LR - 30, 0, 0], pushK(f, 1653, 0.0025), { fov: 44 });
const S14b = (f: number) => dolly([2, -24, -16], [33, -12, 0], pushK(f, 1760, 0.002, 0.006, 30), { fov: 52, roll: 0.05 });
// shot 15: full again (aerial), then water level at the barges popping up
const S15a = (f: number) => dolly([-70, 44, -90], [0, 0, 0], pushK(f, 1793, 0.0025), { fov: 46 });
const S15b = (f: number) => dolly([-6, 2.2, -14], [10, 1.5, 4], pushK(f, 1870, 0.0025), { fov: 46, roll: -0.04 });
// shot 16: the fisherman tastes the water; crane up and out to the deep blue middle on "deeper"
const B16: V3 = [BOAT0[0] * 0.8, 0, BOAT0[2] * 0.8];
const S16a = (f: number) => dolly([B16[0] - 3.4, 1.7, B16[2] - 3.8], [B16[0], 1.25, B16[2]], pushK(f, 1941, 0.003, 0.006, 30), { fov: 40 });
const S16b = (f: number): Shot => {
  const a = S16a(2000), s = glide((f - 2000) / 46);
  const top: V3 = [B16[0] - 40, 70, B16[2] - 50];
  return { pos: a.pos.map((v, i) => v + (top[i] - v) * s) as V3, look: a.look.map((v, i) => v + ([0, -4, 0][i] - v) * s) as V3, fov: 40 + 6 * s, roll: 0 };
};

const CAMS: Record<number, Key[]> = {
  1: [{ f: 0, s: S1a }, { f: 70, dur: 28, s: S1b }],
  2: [{ f: 128, s: S2a }],
  3: [{ f: 182, s: S3a }, { f: 290, cut: true, s: S3b }],
  4: [{ f: 322, s: S4a }],
  5: [{ f: 391, s: S5a }, { f: 505, cut: true, s: S5b }, { f: 600, cut: true, s: S5c }, { f: 632, cut: true, s: S5d }],
  6: [{ f: 661, s: S6a }, { f: 770, cut: true, s: S6b }, { f: 794, dur: 30, s: S6c }],
  7: [{ f: 822, s: S7a }, { f: 885, cut: true, s: S7b }, { f: 938, cut: true, s: S7c }, { f: 1020, cut: true, s: S7d }, { f: 1043, cut: true, s: S7e }],
  8: [{ f: 1081, s: S8a }],
  9: [{ f: 1142, s: S9a }],
  10: [{ f: 1212, s: S10a }],
  11: [{ f: 1280, s: S11a }, { f: 1355, dur: 30, s: S11b }],
  12: [{ f: 1430, s: S12a }, { f: 1495, cut: true, s: S12b }],
  13: [{ f: 1539, s: S13a }, { f: 1620, dur: 36, s: S13b }],
  14: [{ f: 1653, s: S14a }, { f: 1745, cut: true, s: S14b }],
  15: [{ f: 1793, s: S15a }, { f: 1870, cut: true, s: S15b }],
  16: [{ f: 1941, s: S16a }, { f: 2000, cut: true, s: S16b }],
};

// impact kicks: sign flips every frame, ~3 px at 720p per unit, gone in 7 f
const KICKS: [number, number][] = [[STUCK, 0.8], [TILT0, 1], [21.45, 0.6], [30.9, 0.8], [POKE, 1.2], [SUGAR_IN, 0.5], [POP[0], 0.8], [POP[1], 0.7], [POP[2], 0.9]];
export const kickAt = (t: number) => {
  let a = 0;
  for (const [t0, g] of KICKS) {
    const n = Math.floor((t - t0) * FPS + 1e-6);
    if (n >= 0 && n < 7) a += g * (n % 2 ? -1 : 1) * (1 - n / 7) ** 1.5;
  }
  return a;
};
export const camAt = (id: number, f: number): Cam => {
  const c = run(CAMS[id], f), a = kickAt(T(f));
  if (!a) return c;
  const d: V3 = [c.look[0] - c.pos[0], c.look[1] - c.pos[1], c.look[2] - c.pos[2]];
  const L = Math.hypot(...d), h = Math.hypot(d[0], d[2]) || 1;
  const m = (3 / 640) * Math.tan((c.fov * Math.PI) / 360) * L * a;
  return { ...c, look: [c.look[0] - (d[2] / h) * m, c.look[1] + 0.6 * m, c.look[2] + (d[0] / h) * m], roll: c.roll + a * 0.004 };
};

// ---------------- lens ----------------
export type Dof = { f: number; dur?: number; cInf: number; focus?: (f: number) => V3 };
export const DOF: Dof[] = [
  { f: 0, cInf: 13 }, // crew on the deck (MS)
  { f: 70, dur: 28, cInf: 15 }, // drill CU
  { f: 128, cInf: 0 }, // whirlpool aerial
  { f: 182, cInf: 0 }, // calm lake wide
  { f: 290, cInf: 12, focus: () => [BOAT0[0], 1.4, BOAT0[2]] }, // fishermen MS
  { f: 322, cInf: 10 }, // miners
  { f: 391, cInf: 0 }, // rig wide
  { f: 505, cInf: 14 }, // drill CU
  { f: 600, cInf: 0 }, // tilt wide
  { f: 661, cInf: 12, focus: (f) => { const p = bp(f); return [p[0], 1.4, p[2]]; } }, // fishermen
  { f: 770, cInf: 0 }, // boat wide, then the middle
  { f: 885, cInf: 8 }, // rig going down (mild)
  { f: 938, cInf: 0 }, // aerial barges, trees, island
  { f: 1142, cInf: 9 }, // miners out
  { f: 1212, cInf: 10 }, // flooded tunnel
  { f: 1280, cInf: 0 }, // roof
  { f: 1430, cInf: 16, focus: () => [TEA[0], TEA[1] + 0.86, TEA[2]] }, // tea macro
  { f: 1539, cInf: 0 }, // roof hole
  { f: 1653, cInf: 0 }, // canal / waterfall
  { f: 1793, cInf: 0 }, // full lake
  { f: 1941, cInf: 12, focus: () => [B16[0], 1.3, B16[2]] }, // fisherman tastes
  { f: 2000, dur: 30, cInf: 0 }, // crane out
];
export const dofAt = (f: number) => {
  let i = 0; while (i + 1 < DOF.length && f >= DOF[i + 1].f) i++;
  const d = DOF[i], p = DOF[Math.max(0, i - 1)];
  const k = d.dur ? Math.min(1, (f - d.f) / d.dur) : 1;
  return { cInf: p.cInf + (d.cInf - p.cInf) * k, focus: d.focus };
};
export const B16P = B16;

// ---------------- terrain ----------------
export const RC = 34; // crater radius
/** lake-bed height inside the lake (before any crater) */
export const bedH = (r: number) => -3.2 * (1 - Math.min(1, (r / LR) ** 2)) - 0.15;
/** terrain height everywhere (bed, bank, land, island hill, canal) */
export const H = (x: number, z: number) => {
  const r = Math.hypot(x, z);
  let h = r < LR ? bedH(r) : r < LR + 5 ? -0.15 + (D0 + 0.15) * smooth((r - LR) / 5) : D0 + 0.6 * Math.sin(x * 0.03) * Math.sin(z * 0.025) * smooth((r - LR - 5) / 30);
  const d = Math.hypot(x - ISLAND[0], z - ISLAND[2]);
  h = Math.max(h, -3 + 18 * smooth((48 - d) / 30));
  if (x > LR - 12 && Math.abs(z - CANAL_Z) < CANAL_W / 2 + 4) {
    const e = smooth((Math.abs(z - CANAL_Z) - CANAL_W / 2) / 4);
    h = Math.min(h, -2.6 * (1 - e) + h * e);
  }
  return h;
};
