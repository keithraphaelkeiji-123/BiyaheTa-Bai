// "Strong" (seafarer's wife): timeline, places, cameras and lens, timed to the user's voice-over
// (shorts/seafarer/voice/voice.wav, phrase times from its pauses). Camera grammar from STYLE_GUIDE.md: smootherstep
// glides, cuts on big reframes, every hold pushes in slowly (this piece is quiet: 0.1-0.25 %/f, no impact kicks).
export const FPS = 30;
export const TOTAL = 2580; // 86 s: 84 s of voice + a short music tail
export const G = 1.2; // town ground height (the sea is at 0)
export type V3 = [number, number, number];

export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const smooth = (x: number) => { const u = clamp01(x); return u * u * (3 - 2 * u); };
export const glide = (u: number) => { const x = clamp01(u); return x * x * x * (x * (6 * x - 15) + 10); };

// ---------------- places ----------------
// town: seawall at z = 0 (sea for z < 0), road along x (z 6..12), houses face the sea with their fronts at z = 17
export const ROAD_Z0 = 6, ROAD_Z1 = 12, FRONT_Z = 17;
export const HOUSE_X = 0; // our house
export const STORE: V3 = [-13, G, FRONT_Z]; // the sari-sari store window
export const PORCH: V3 = [HOUSE_X, G, 15.6]; // porch bench in front of our house
export const PIER_X = 34, PIER_L = 46, PIER_Y = G + 0.15;
export const MOM_PIER: V3 = [PIER_X + 0.2, PIER_Y, -PIER_L + 3.2];
// the home interior (a dollhouse set far from the town): floor at HOME[1], back wall at local z = +3.5, open front
export const HOME: V3 = [300, G, 300];
export const BEDR: V3 = [340, G, 300];
export const SHIP_DAY: V3 = [0, 0, -520];
export const SHIP_FAR: V3 = [-330, 0, -900];
export const h = (p: V3, x: number, y: number, z: number): V3 => [p[0] + x, p[1] + y, p[2] + z];
// home furniture (local)
export const TABLE: V3 = [0.6, 0, 0.4]; // dining table centre, top at 0.76
export const STOVE: V3 = [3.1, 0, 3.0];
export const SINK: V3 = [4.3, 0, 3.0];
export const SOFA: V3 = [-3.6, 0, 2.75];
export const WINDOW: [number, number, number, number] = [-1.7, 0.1, 1.0, 2.25]; // home back-window x0, x1, y0, y1
export const BED: V3 = [-1.4, 0, 1.25]; // bedroom bed centre

// ---------------- shots ----------------
export type Light = "day" | "golden" | "night" | "lamp";
export type Set = "town" | "ship" | "home" | "bed";
export type ShotDef = { id: number; a: number; b: number; light: Light; set: Set; rain?: boolean; sunAz?: number; sunEl?: number };
export const SHOTS: ShotDef[] = [
  { id: 1, a: 0, b: 78, light: "day", set: "town" }, // people say... (street, neighbours)
  { id: 2, a: 78, b: 160, light: "day", set: "ship" }, // ...my husband is a seafarer
  { id: 3, a: 160, b: 368, light: "day", set: "home", sunAz: 60, sunEl: 55 }, // managing, family, decisions, everything
  { id: 4, a: 368, b: 560, light: "day", set: "town" }, // smiling, laughing, living
  { id: 5, a: 560, b: 604, light: "day", set: "town" }, // what they don't see (smile fades)
  { id: 6, a: 604, b: 690, light: "lamp", set: "home" }, // loneliness: alone at the table
  { id: 7, a: 690, b: 790, light: "night", set: "bed" }, // nights: the empty side of the bed
  { id: 8, a: 790, b: 927, light: "day", set: "home", sunAz: 60, sunEl: 55 }, // something happens: the certificate; texting him
  { id: 9, a: 927, b: 1027, light: "lamp", set: "home" }, // wait for his call
  { id: 10, a: 1027, b: 1165, light: "lamp", set: "home" }, // special occasions: birthday
  { id: 11, a: 1165, b: 1331, light: "lamp", set: "home" }, // dishes alone; "are you okay?"
  { id: 12, a: 1331, b: 1475, light: "day", set: "home", sunAz: 60, sunEl: 55 }, // independent, strong
  { id: 13, a: 1475, b: 1615, light: "lamp", set: "home", rain: true }, // don't want to be strong (rain)
  { id: 14, a: 1615, b: 1693, light: "lamp", set: "home", rain: true }, // husband home: the photo
  { id: 15, a: 1693, b: 1835, light: "night", set: "town" }, // only a seafarer's wife: every window
  { id: 16, a: 1835, b: 1987, light: "golden", set: "town" }, // behind every strong wife... lonely (porch)
  { id: 17, a: 1987, b: 2018, light: "lamp", set: "home" }, // tired
  { id: 18, a: 2018, b: 2070, light: "night", set: "bed" }, // cries sometimes
  { id: 19, a: 2070, b: 2213, light: "day", set: "home", sunAz: 60, sunEl: 55 }, // live, love, hold her family together
  { id: 20, a: 2213, b: 2330, light: "golden", set: "town" }, // to all the seafarer's wives (pier, toward the sea)
  { id: 21, a: 2330, b: 2445, light: "golden", set: "town", sunAz: 165, sunEl: 9 }, // it's okay to be strong / weak (faces)
  { id: 22, a: 2445, b: TOTAL, light: "golden", set: "town", sunAz: 165, sunEl: 9 }, // you're human, too
];
export const XFADE: Record<number, number> = { 2: 8, 3: 10, 4: 10, 6: 12, 7: 12, 8: 12, 9: 10, 10: 10, 11: 10, 12: 10, 13: 12, 15: 12, 16: 14, 17: 6, 18: 6, 19: 8, 20: 14 };
export const FLASH_AT = -100;
export const shotAt = (f: number) => SHOTS.find((s) => f >= s.a && f < s.b) ?? SHOTS[SHOTS.length - 1];
export const layersAt = (f: number): { id: number; alpha: number }[] => {
  for (const s of SHOTS) {
    const x = XFADE[s.id];
    if (x && f >= s.a - x / 2 && f < s.a + x / 2) return [{ id: s.id - 1, alpha: 1 }, { id: s.id, alpha: (f - (s.a - x / 2) + 1) / (x + 1) }];
  }
  return [{ id: shotAt(f).id, alpha: 1 }];
};
/** voice phrase times (s), used for expression changes and cuts */
export const PH = {
  dontSee: 18.76, loneliness: 20.13, something: 26.42, tell: 28.6, wait: 30.92, areYouOk: 42.39,
  lonely: 64.13, tired: 66.09, cries: 67.37, live: 69.0, love: 70.65, together: 71.36, weak: 78.5, human: 81.65,
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
    cur = k.cut ? full(k.s(f)) : mixC(cur, full(k.s(f)), glide((f - k.f) / (k.dur ?? 24)));
  }
  return cur;
};
const pushK = (f: number, f0: number, rate: number) => Math.exp(-rate * Math.max(0, f - f0));
const dolly = (pos: V3, look: V3, k: number, rest: Partial<Cam> = {}): Shot =>
  ({ pos: [look[0] + (pos[0] - look[0]) * k, look[1] + (pos[1] - look[1]) * k, look[2] + (pos[2] - look[2]) * k], look, ...rest });
const H = (x: number, y: number, z: number) => h(HOME, x, y, z);
const B = (x: number, y: number, z: number) => h(BEDR, x, y, z);
const S = (x: number, y: number, z: number) => h(SHIP_DAY, x, y, z);

// shot 1: low on the road: she walks by with her girl and a grocery bag, the neighbours at the store watch
const S1a = (f: number) => dolly([-4, G + 1.5, 1.5], [-10.5, G + 1.2, 13], pushK(f, 0, 0.002), { fov: 42, roll: 0.02 });
// shot 2: over the sea to the cargo ship (day), a slow lateral glide
const S2a = (f: number) => { const u = (f - 78) / 82; return { pos: S(70 - 22 * u, 16, -130), look: S(-6 + 8 * u, 6, 0), fov: 40, roll: -0.02 } as Shot; };
// shot 3: home montage: stove MS, serving the kids, bills, the wide room with the calendar
const S3a = (f: number) => dolly(H(1.3, 1.45, 0.6), H(3.0, 1.35, 2.8), pushK(f, 160, 0.0025), { fov: 40 });
const S3b = (f: number) => dolly(H(-1.0, 1.7, -3.0), H(1.05, 1.0, 0.6), pushK(f, 218, 0.002), { fov: 44, roll: -0.02 });
const S3c = (f: number) => dolly(H(0.2, 1.5, -1.3), H(0.7, 1.05, 0.9), pushK(f, 261, 0.003), { fov: 38 });
const S3d = (f: number) => dolly(H(-0.5, 1.9, -6.6), H(0.3, 1.2, 1.8), pushK(f, 292, 0.0015), { fov: 46 });
// shot 4: at the store: her face smiling, then the group laughing with the kids at play
const S4a = (f: number) => dolly([-11.6, G + 1.65, 12.4], [-12.0, G + 1.45, 15.4], pushK(f, 368, 0.0015), { fov: 38 });
const S4b = (f: number) => dolly([-6.5, G + 2.2, 6.5], [-12.4, G + 1.1, 14.6], pushK(f, 430, 0.0015), { fov: 44, roll: 0.02 });
// shot 5: her face, closer; the smile fades
const S5a = (f: number) => dolly([-11.85, G + 1.6, 13.3], [-12.0, G + 1.5, 15.4], pushK(f, 560, 0.003), { fov: 34 });
// shot 6: night, alone at the table, high and wide
const S6a = (f: number) => dolly(H(-2.2, 3.1, -3.6), H(0.5, 0.8, 0.6), pushK(f, 604, 0.0018), { fov: 44, roll: 0.02 });
// shot 7: bedroom: from the foot of the bed, low
const S7a = (f: number) => dolly(B(-1.0, 1.35, -2.6), B(-1.4, 0.55, 1.4), pushK(f, 690, 0.002), { fov: 44 });
// shot 8: the girl runs in with her certificate; then mom texting (MS)
const S8a = (f: number) => dolly(H(-1.2, 1.5, -2.4), H(0.4, 1.0, 0.8), pushK(f, 790, 0.002), { fov: 42 });
const S8b = (f: number) => dolly(H(0.55, 1.4, -0.9), H(0.85, 1.12, 1.15), pushK(f, 858, 0.0025), { fov: 40 });
// shot 9: sofa at night, the phone in her lap, the clock
const S9a = (f: number) => dolly(H(-2.4, 1.4, -0.6), H(-3.6, 1.15, 2.9), pushK(f, 927, 0.002), { fov: 42, roll: -0.02 });
// shot 10: birthday at the table
const S10a = (f: number) => dolly(H(0.6, 1.75, -2.9), H(0.55, 1.05, 0.8), pushK(f, 1027, 0.0018), { fov: 48 });
// shot 11: at the sink alone (side), then her face on "are you okay?"
const S11a = (f: number) => dolly(H(1.6, 1.55, 0.9), H(4.1, 1.2, 2.7), pushK(f, 1165, 0.0015), { fov: 42 });
const S11b = (f: number) => dolly(H(3.4, 1.62, 1.55), H(3.9, 1.6, 2.45), pushK(f, 1270, 0.003), { fov: 34 });
// shot 12: the wrench at the sink; carrying the rice sack
const S12a = (f: number) => dolly(H(2.0, 1.4, 0.4), H(4.2, 1.0, 2.7), pushK(f, 1331, 0.002), { fov: 40 });
const S12b = (f: number) => dolly(H(-1.5, 1.3, -2.6), H(-0.6, 1.1, 0.6), pushK(f, 1410, 0.002), { fov: 42, roll: 0.02 });
// shot 13: rain: sitting on the floor against the sofa, the dark window
const S13a = (f: number) => dolly(H(-1.0, 1.0, -1.2), H(-3.2, 0.7, 2.2), pushK(f, 1475, 0.0018), { fov: 46 });
// shot 14: the photo held to her chest, close
const S14a = (f: number) => dolly(H(-2.5, 0.95, 0.45), H(-3.12, 0.66, 2.13), pushK(f, 1615, 0.0025), { fov: 38 });
// shot 15: night town from over the sea: lit windows, a wife at every door
const S15a = (f: number) => dolly([3, G + 10, -30], [-2, G + 2.2, 16], pushK(f, 1693, 0.0015), { fov: 46 });
// shot 16: dusk porch: wide from the side, then her face
const S16a = (f: number) => dolly([-7.5, G + 1.6, 9.5], [0.2, G + 1.2, 15.4], pushK(f, 1835, 0.0015), { fov: 42 });
const S16b = (f: number) => dolly([-0.75, G + 1.4, 13.9], [-0.2, G + 1.3, 16.15], pushK(f, 1922, 0.002), { fov: 36 });
// shot 17: asleep on the bills
const S17a = (f: number) => dolly(H(0.45, 1.45, -0.7), H(1.0, 0.98, 1.1), pushK(f, 1987, 0.003), { fov: 40 });
// shot 18: crying on the bed
const S18a = (f: number) => dolly(B(0.0, 1.2, -1.2), B(-1.2, 0.95, 0.9), pushK(f, 2018, 0.003), { fov: 38 });
// shot 19: the window opens (morning); hugging the kids; together with dad on the phone
const S19a = (f: number) => dolly(H(-0.2, 1.4, -1.6), H(-0.8, 1.35, 3.0), pushK(f, 2070, 0.002), { fov: 42 });
const S19b = (f: number) => dolly(H(-1.8, 1.3, -1.6), H(-1.9, 1.0, 1.3), pushK(f, 2118, 0.0025), { fov: 40 });
const S19c = (f: number) => dolly(H(-1.75, 1.35, -1.3), H(-1.9, 1.15, 1.3), pushK(f, 2140, 0.002), { fov: 40 });
// shot 20: the pier at sunset: wives and kids waving at the ship on the horizon, then her and the kids
const S20a = (f: number) => dolly([PIER_X + 8, PIER_Y + 3.0, -PIER_L + 15], [PIER_X - 0.5, PIER_Y + 1.1, -PIER_L - 4], pushK(f, 2213, 0.0012), { fov: 46, roll: -0.02 });
const S20b = (f: number) => dolly([PIER_X - 1.3, PIER_Y + 1.3, -PIER_L - 0.6], [PIER_X + 0.1, PIER_Y + 1.0, -PIER_L + 3.4], pushK(f, 2330, 0.002), { fov: 42 });
// shot 21: her face (soft smile), then crane up to the sun and the ship
const S21a = (f: number) => dolly([PIER_X - 0.15, PIER_Y + 1.6, -PIER_L + 1.4], [PIER_X + 0.2, PIER_Y + 1.53, -PIER_L + 3.2], pushK(f, 2445, 0.0025), { fov: 34 });
const S21b = (f: number): Shot => {
  const a = S21a(2500), s = glide((f - 2500) / 70);
  const top: V3 = [PIER_X - 3, PIER_Y + 9, -PIER_L + 12], tl: V3 = [PIER_X - 110, 8, -PIER_L - 260];
  return { pos: a.pos.map((v, i) => v + (top[i] - v) * s) as V3, look: a.look.map((v, i) => v + (tl[i] - v) * s) as V3, fov: 34 + 12 * s, roll: 0 };
};

const CAMS: Record<number, Key[]> = {
  1: [{ f: 0, s: S1a }],
  2: [{ f: 78, s: S2a }],
  3: [{ f: 160, s: S3a }, { f: 218, cut: true, s: S3b }, { f: 261, cut: true, s: S3c }, { f: 292, cut: true, s: S3d }],
  4: [{ f: 368, s: S4a }, { f: 430, cut: true, s: S4b }],
  5: [{ f: 560, s: S5a }],
  6: [{ f: 604, s: S6a }],
  7: [{ f: 690, s: S7a }],
  8: [{ f: 790, s: S8a }, { f: 858, cut: true, s: S8b }],
  9: [{ f: 927, s: S9a }],
  10: [{ f: 1027, s: S10a }],
  11: [{ f: 1165, s: S11a }, { f: 1270, cut: true, s: S11b }],
  12: [{ f: 1331, s: S12a }, { f: 1410, cut: true, s: S12b }],
  13: [{ f: 1475, s: S13a }],
  14: [{ f: 1615, s: S14a }],
  15: [{ f: 1693, s: S15a }],
  16: [{ f: 1835, s: S16a }, { f: 1922, cut: true, s: S16b }],
  17: [{ f: 1987, s: S17a }],
  18: [{ f: 2018, s: S18a }],
  19: [{ f: 2070, s: S19a }, { f: 2118, cut: true, s: S19b }, { f: 2140, cut: true, s: S19c }],
  20: [{ f: 2213, s: S20a }],
  21: [{ f: 2330, s: S20b }],
  22: [{ f: 2445, s: S21a }, { f: 2500, cut: false, dur: 70, s: S21b }],
};
export const camAt = (id: number, f: number): Cam => run(CAMS[id], f);

// ---------------- lens ----------------
export type Dof = { f: number; dur?: number; cInf: number; focus?: (f: number) => V3 };
export const DOF: Dof[] = [
  { f: 0, cInf: 8 }, { f: 78, cInf: 0 }, { f: 160, cInf: 12 }, { f: 292, cInf: 4 }, { f: 368, cInf: 14 }, { f: 430, cInf: 8 },
  { f: 560, cInf: 16 }, { f: 604, cInf: 6 }, { f: 690, cInf: 10 }, { f: 790, cInf: 8 }, { f: 858, cInf: 14 }, { f: 927, cInf: 10 },
  { f: 1027, cInf: 10 }, { f: 1165, cInf: 10 }, { f: 1270, cInf: 16 }, { f: 1331, cInf: 10 }, { f: 1475, cInf: 10 }, { f: 1615, cInf: 16 },
  { f: 1693, cInf: 0 }, { f: 1835, cInf: 6 }, { f: 1922, cInf: 16 }, { f: 1987, cInf: 14 }, { f: 2018, cInf: 14 }, { f: 2070, cInf: 10 },
  { f: 2213, cInf: 0 }, { f: 2330, cInf: 12 }, { f: 2445, cInf: 16 }, { f: 2500, dur: 50, cInf: 0 },
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
