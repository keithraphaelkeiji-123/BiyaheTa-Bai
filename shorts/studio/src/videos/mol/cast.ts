// Our cast as lit flat sprites in the 3D world. Each frame every character asks for a drawing (a key + a draw call);
// the pool keeps one canvas per distinct drawing, so soldiers marching in step share canvases (7 head shapes x 4
// outfits). Characters are yaw-only billboards shaded by cardShade() (scene tint, bright floor, side gradient toward
// the sun, painted crescent in the drawing); standing ones get a soft multiply contact blob. Effects are unlit cards.
// Cards, effects and blobs live on the NOINK layer so the world ink pass never outlines their quads.
import * as THREE from "three";
import {
  Pen, bodyFront, bodySide, fxShadow, fxContact, fxPuff, fxBurst, fxStars, fxSplash, fxCreak, fxRing, Outfit, Expr, FrontOpts, SideOpts,
} from "./toon";
import { FPS, SHOTS, V3, clamp01, TANK, TANK_R, LADDER, LAB, COURT, SHED, GOO, BURST, waveX, h } from "./story";
import { LIGHTS } from "./lights";
import { NOINK } from "./ink";
import { cardShade, blobMaterial, CARD_K } from "./cardshade";

// ---------------- canvas pool ----------------
type Entry = { cv: HTMLCanvasElement; tex: THREE.CanvasTexture; w: number; h: number };
export type Req = { key: string; w: number; h: number; k: number; draw: (p: Pen) => void; tex?: THREE.CanvasTexture };
const makeEntry = (w: number, h: number): Entry => {
  const cv = document.createElement("canvas");
  cv.width = w; cv.height = h;
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  return { cv, tex, w, h };
};
export class Pool {
  private live = new Map<string, Entry>();
  private free: Entry[] = [];
  private reqs: Req[] = [];
  req(key: string, w: number, h: number, k: number, draw: (p: Pen) => void) {
    const r: Req = { key: `${w}x${h}|${key}`, w, h, k, draw };
    this.reqs.push(r);
    return r;
  }
  flush() {
    const want = new Map<string, Req[]>();
    for (const r of this.reqs) { const l = want.get(r.key); if (l) l.push(r); else want.set(r.key, [r]); }
    for (const [key, e] of this.live) if (!want.has(key)) { this.live.delete(key); this.free.push(e); }
    for (const [key, rs] of want) {
      let e = this.live.get(key);
      if (!e) {
        const r = rs[0], i = this.free.findIndex((x) => x.w === r.w && x.h === r.h);
        e = i >= 0 ? this.free.splice(i, 1)[0] : makeEntry(r.w, r.h);
        const g = e.cv.getContext("2d")!;
        g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, e.w, e.h); g.setTransform(r.k, 0, 0, r.k, 0, 0);
        r.draw(new Pen(g));
        e.tex.needsUpdate = true;
        this.live.set(key, e);
      }
      for (const r of rs) r.tex = e.tex;
    }
    this.reqs = [];
  }
}

// ---------------- sprite meshes ----------------
const blank = (() => { const c = document.createElement("canvas"); c.width = c.height = 2; return new THREE.CanvasTexture(c); })();
export const SU = 0.00216; // metres per design unit: 1000 units = 2.16 m
export const SU_SWING = 2.3 / 1830; // swing canvas: rope of 1830 units = 2.3 m
const BODY = (() => { const g = new THREE.PlaneGeometry(600 * SU, 1000 * SU); g.translate(0, (975 - 500) * SU, 0); return g; })();
const CARD = new THREE.PlaneGeometry(1, 1);
/** world roots that hold actors (to find the scene's sun when world.ts does not pass it) */
const ROOTS = new Set<THREE.Object3D>();

/** lit flat character: cardShade() material, receives shadows (dims to the bright floor only), casts its silhouette
 *  when world.ts says so (golden). Drawn after the contact blobs (renderOrder 1). */
export class Actor {
  mesh: THREE.Mesh; mat: THREE.MeshLambertMaterial; dmat: THREE.MeshDepthMaterial; r: Req | null = null;
  constructor(parent: THREE.Object3D, geo: THREE.BufferGeometry = BODY) {
    this.mat = cardShade(new THREE.MeshLambertMaterial({ map: blank, alphaTest: 0.5, side: THREE.DoubleSide }));
    this.mat.alphaToCoverage = false; // A2C + MSAA left 1 px sky-depth seams on blurred far cards (POST)
    this.dmat = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: blank, alphaTest: 0.5, side: THREE.DoubleSide });
    this.mesh = new THREE.Mesh(geo, this.mat);
    this.mesh.customDepthMaterial = this.dmat;
    // rim width is in output pixels: tell the card shader the render height (1920 = 1080 x 1920 frame)
    this.mesh.onBeforeRender = (r) => { const rt = r.getRenderTarget(); CARD_K.uPx.value = (rt ? rt.height : r.domElement.height) / 1920; };
    this.mesh.castShadow = false; this.mesh.receiveShadow = true; this.mesh.visible = false;
    this.mesh.rotation.order = "YXZ"; this.mesh.renderOrder = 1; this.mesh.layers.set(NOINK);
    parent.add(this.mesh);
    ROOTS.add(parent);
  }
  bind() { const t = this.r?.tex; if (t) { this.mat.map = t; this.dmat.map = t; } }
}
/** unlit effect card: hard cut-out (ink drawings), soft see-through (dust, mist) or a multiply ground blob */
export class Fx {
  mesh: THREE.Mesh; mat: THREE.MeshBasicMaterial; soft: THREE.MeshBasicMaterial; blob: THREE.MeshBasicMaterial; r: Req | null = null;
  constructor(parent: THREE.Object3D) {
    this.mat = new THREE.MeshBasicMaterial({ map: blank, alphaTest: 0.5, side: THREE.DoubleSide });
    this.mat.alphaToCoverage = false; // A2C + MSAA left 1 px sky-depth seams on blurred far cards (POST)
    this.soft = new THREE.MeshBasicMaterial({ map: blank, transparent: true, depthWrite: false, side: THREE.DoubleSide });
    this.blob = blobMaterial(blank);
    this.mesh = new THREE.Mesh(CARD, this.mat);
    this.mesh.visible = false; this.mesh.layers.set(NOINK);
    parent.add(this.mesh);
  }
  use(soft: boolean) { this.mesh.material = soft ? this.soft : this.mat; }
  bind() {
    const t = this.r?.tex;
    if (!t) return;
    if (this.r!.key.includes("|blob|")) {
      // no mipmaps: at grazing views the mip chain averages the blob with its white surround and it fades out
      if (t.generateMipmaps) { t.generateMipmaps = false; t.minFilter = THREE.LinearFilter; t.needsUpdate = true; }
      this.blob.map = t; this.mesh.material = this.blob; this.mesh.renderOrder = 0.5;
    }
    else { this.mat.map = t; this.soft.map = t; this.mesh.renderOrder = 0; }
  }
}

// ---------------- placements ----------------
export type Place = {
  key: string; draw: (p: Pen) => void; x: number; y: number; z: number;
  scale?: number; mirror?: boolean; yaw?: number; geo?: "body" | "swing"; roll?: number; size?: [number, number, number];
};
export type FxPlace = { key: string; cw: number; ch: number; draw: (p: Pen) => void; x: number; y: number; z: number; w: number; h: number; flat?: boolean; rot?: number; soft?: boolean };
/** sun = world direction TOWARD the sun (optional: when absent the scene's shadow-casting light is used) */
export type CamInfo = { pos: THREE.Vector3; right: THREE.Vector3; sun?: THREE.Vector3 };

const hh = (i: number, s = 0) => { const v = Math.sin(i * 127.1 + s * 311.7) * 43758.5453; return v - Math.floor(v); };
const q = (v: number, n = 120) => Math.round(v * n) / n;
const vOf = (i: number) => (i * 7 + (i >> 2)) % 4;
/** head-shape seed: 7 shapes, so marching soldiers in step still share canvases */
const seedOf = (i: number) => ((i * 5 + 3) % 7) + 1;
/** drawing resolution by distance: [canvas w, h, scale from the 600 x 1000 design]; sized for the 1440 x 2560 final */
const tier = (d: number): [number, number, number] =>
  d < 3.2 ? [720, 1200, 1.2] : d < 6.5 ? [480, 800, 0.8] : d < 16 ? [240, 400, 0.4] : [150, 250, 0.25];

// ---------------- light ----------------
const SUN = new THREE.Vector3(0.5, 0.75, -0.4).normalize();
const tmp = new THREE.Vector3();
let LNAME: "day" | "golden" | "night" | "lamp" = "day";
const sunOf = (root: THREE.Object3D) => {
  let s: THREE.DirectionalLight | null = null;
  root.traverse((o) => { if (!s && o instanceof THREE.DirectionalLight && o.castShadow) s = o; });
  return s as THREE.DirectionalLight | null;
};
/** the sun of the world that is calling: the attached root whose sun target sits on this camera's view axis */
const findSun = (cam: CamInfo, out: THREE.Vector3) => {
  if (cam.sun) return out.copy(cam.sun).normalize();
  let best: THREE.DirectionalLight | null = null, err = Infinity;
  for (const r of ROOTS) {
    if (!r.parent) continue;
    const s = sunOf(r);
    if (!s) continue;
    const d = tmp.copy(s.target.position).sub(cam.pos), e = Math.abs(d.dot(cam.right)) / (d.length() || 1);
    if (e < err) { err = e; best = s; }
  }
  return best ? out.copy(best.position).sub(best.target.position).normalize() : out;
};
/** canvas angle the sun comes FROM on an upright card facing the camera, in 45-degree steps (small texture cache) */
const light2D = (cam: CamInfo, mirror: boolean) => {
  const sx = SUN.dot(cam.right) * (mirror ? -1 : 1), sy = -SUN.y;
  return Math.round(Math.atan2(sy, sx) / (Math.PI / 4)) * (Math.PI / 4);
};

/** front / side view and mirroring for someone at (x, z) walking along (dx, dz); fs = foreshortening of the walk */
const viewOf = (cam: CamInfo, x: number, z: number, dx: number, dz: number) => {
  const tx = cam.pos.x - x, tz = cam.pos.z - z, tl = Math.hypot(tx, tz) || 1;
  const c = (tx * dx + tz * dz) / tl;
  return { side: c < 0.57, mirror: dx * cam.right.x + dz * cam.right.z < 0, fs: Math.round(Math.sqrt(Math.max(0, 1 - c * c)) * 20) / 20 };
};

// ---------------- life: blinks and reaction timing ----------------
/** reference expression and action changes land 0-3 f before the word onset */
const LEAD = 2 / FPS;
/** eyelid 0 open .. 1 shut. Reference: gaps 0.5-2.3 s, 4-frame blink half / shut / shut / half, plus a blink across
 *  every expression swap (the shut frames hide the swap) */
const LID = [0.5, 1, 1, 0.5];
const SWAPS: Record<number, number[]> = {};
const lidAt = (t: number, i: number, swaps: number[] = []) => {
  const f = Math.round(t * FPS);
  for (const ts of swaps) { const k = f - Math.round((ts - LEAD) * FPS) + 1; if (k >= 0 && k < 4) return LID[k]; }
  let s = Math.round(-60 * hh(i, 9));
  for (let n = 0; s <= f && n < 400; n++) {
    const k = f - s;
    if (k >= 0 && k < 4) return LID[k];
    s += Math.round(15 + 54 * hh(i * 31 + n, 13)); // next blink 0.5-2.3 s later
  }
  return 0;
};
const fkey = (o: object) => JSON.stringify(o, (_k, v) => (typeof v === "number" ? q(v) : v));

type Who = { i: number; o: Outfit; okey: string };
/** one character drawing in the 600 x 1000 design space, sized by distance, lit from the scene's sun */
const person = (cam: CamInfo, who: Who, x: number, y: number, z: number, view: { side: boolean; mirror: boolean }, fo: FrontOpts, so: SideOpts, scale = 1): Place & { tierKey: string } => {
  const d = cam.pos.distanceTo(tmp.set(x, y + 1.2, z)) / scale;
  const [w, h, k] = tier(d);
  const mirror = view.side && view.mirror, light = light2D(cam, mirror), seed = seedOf(who.i);
  const f2: FrontOpts = { ...fo, light, seed }, s2: SideOpts = { ...so, light, seed };
  const key = view.side ? `S|${who.okey}|${fkey(s2)}` : `F|${who.okey}|${fkey(f2)}`;
  return {
    key, x, y, z, scale, mirror, tierKey: `${w}`,
    draw: (p) => (view.side ? bodySide(p, who.o, s2) : bodyFront(p, who.o, f2)),
    size: [w, h, k],
  };
};

/** ground shadow under a standing / sitting card (review rounds 2-4), multiply, blue-violet: a TIGHT contact pool right under
 *  the feet (~.5 on screen at the core) so nobody floats, plus by day (cards cast no real shadow) a lighter soft tail
 *  stretched AWAY from the sun, length ~1.6 m / tan(sun elevation), capped. Golden: world.ts casts real card shadows. */
const CONTACT: Record<"day" | "golden" | "night" | "lamp", [number, number, number]> = { day: [0.2, 0.21, 0.33], golden: [0.24, 0.2, 0.33], night: [0.3, 0.3, 0.42], lamp: [0.28, 0.25, 0.36] };
const TAIL: [number, number, number] = [0.42, 0.44, 0.62];
const toSrgb = (v: number) => { const c = clamp01(v); return c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055; };
const hexOf = (c: [number, number, number], k: number) => "#" + c.map((v) => Math.round(255 * toSrgb(1 - (1 - v) * k)).toString(16).padStart(2, "0")).join("");
const blob = (out: Stage, x: number, y: number, z: number, sc = 1, k = 1) => {
  const hl = Math.hypot(SUN.x, SUN.z) || 1, ox = -SUN.x / hl, oz = -SUN.z / hl, rot = Math.atan2(-ox, -oz);
  if (LNAME === "day") {
    const el = Math.asin(Math.min(0.99, Math.max(0.1, SUN.y)));
    const len = Math.min(2.4, Math.max(0.5, 1.6 / Math.tan(el))) * sc, h = len + 0.55 * sc, c = 0.3 * h; // feet at v = .2 of the card
    const tc = hexOf(TAIL, k);
    out.fx.push({ key: `blob|shadow|${tc}`, cw: 128, ch: 256, draw: (p) => fxShadow(p, tc), x: x + ox * c, y: y + 0.018, z: z + oz * c,
      w: 0.72 * sc, h, flat: true, rot });
  }
  const cc = hexOf(CONTACT[LNAME], k);
  out.fx.push({ key: `blob|contact|${cc}`, cw: 128, ch: 128, draw: (p) => fxContact(p, cc), x: x + ox * 0.03 * sc, y: y + 0.022, z: z + oz * 0.03 * sc,
    w: 0.52 * sc, h: 0.4 * sc, flat: true, rot });
};


export type Stage = { places: Place[]; fx: FxPlace[] };
/** the wall clock's time (world.ts sets it; minutes since midnight) */

// ---------------- our cast (all original) ----------------
const SK = ["#ffe2c2", "#f5c9a0", "#ecd0b6", "#c99067"];
const BOSS: Outfit = { jacket: "#2e2a36", pants: "#2e2a36", boots: "#1f1a20", hat: "tophat", moustache: "#4a3020", build: "stout", buttons: "#e8c45a", skin: "#ffe2c2" };
const KIDS: Outfit[] = [
  { jacket: "#c8643f", pants: "#3b3f52", boots: "#4a3426", hat: "cap", cap: "#6a5a4a", build: "kid", skin: SK[1] },
  { jacket: "#3f6fb5", pants: "#4a3a2a", boots: "#4a3426", hat: "cap", cap: "#4a4a52", build: "kid", skin: SK[0] },
  { jacket: "#5d7a3a", dress: "#d9a441", pants: "#3b3f52", boots: "#4a3426", hat: "long", hair: "#6a3a22", build: "kid", skin: SK[2] },
];
const FOLK: Outfit[] = [
  { jacket: "#5b6f8e", pants: "#3b3f52", boots: "#3a2a20", hat: "cap", cap: "#3a3d47", skin: SK[1], moustache: "#4a3020" },
  { jacket: "#8c3b4a", dress: "#d9c8a8", pants: "#3b3f52", boots: "#3a2a20", hat: "bonnet", skin: SK[0] },
  { jacket: "#7a6a5a", pants: "#3b3f52", boots: "#3a2a20", hat: "tophat", skin: SK[2] },
  { jacket: "#2f6a6a", dress: "#5a8fc2", pants: "#3b3f52", boots: "#3a2a20", hat: "bonnet", skin: SK[3] },
  { jacket: "#a85a3a", pants: "#2f3a52", boots: "#3a2a20", hat: "cap", cap: "#6a5a4a", skin: SK[3], build: "stout" },
  { jacket: "#6b5a8e", dress: "#e8c4a0", pants: "#3b3f52", boots: "#3a2a20", hat: "long", hair: "#3a2a22", skin: SK[1] },
];
const JUDGE: Outfit = { jacket: "#1a1a22", pants: "#1a1a22", boots: "#1a1a22", hat: "hair", hair: "#f0f0f0", moustache: "#f0f0f0", build: "stout", skin: SK[0] };
const SHADY: Outfit = { jacket: "#1f2128", pants: "#2a2d36", boots: "#1a1a1a", hat: "cap", cap: "#1f2128", skin: SK[2], moustache: "#1a1a1a" };
const KID_S = 0.7;
const TE = TANK[0] + TANK_R;

type Fig = { i: number; o: Outfit; key: string; at: V3; fo: FrontOpts; scale?: number; blob?: boolean; roll?: number };
const put = (cam: CamInfo, out: Stage, t: number, g: Fig) => {
  const [x, y, z] = g.at, sc = g.scale ?? 1;
  const fo: FrontOpts = { blink: lidAt(t, g.i), ...g.fo };
  const pl = person(cam, { i: g.i, o: g.o, okey: g.key }, x, y, z, { side: false, mirror: false }, fo, {}, sc);
  if (g.roll !== undefined) pl.roll = g.roll;
  out.places.push(pl);
  if (g.blob !== false) blob(out, x, y, z, sc);
};
const ex = (t: number, ...steps: [number, Expr][]): Expr => { let e = steps[0][1]; for (const [ts, x] of steps) if (t >= ts - LEAD) e = x; return e; };
const card = (out: Stage, key: string, cw: number, ch: number, draw: (p: Pen) => void, at: V3, w: number, hh: number, extra: Partial<FxPlace> = {}) =>
  out.fx.push({ key, cw, ch, draw, x: at[0], y: at[1], z: at[2], w, h: hh, ...extra });
const drip = (out: Stage, t: number, at: V3, k: number) => {
  const u = q(((t * 0.7 + k * 0.37) % 1), 20);
  card(out, `drip${u}`, 64, 256, (p) => { p.stroke([[32, 0], [32, 60 + 180 * u]], 14, "#5c2c10"); p.ell(32, 70 + 180 * u, 12, 16, "#5c2c10", 3); }, [at[0], at[1] - 0.6 * u, at[2]], 0.12, 0.5);
};
const smellLines = (out: Stage, t: number, at: V3, k: number) => {
  const u = q(((t * 0.45 + k * 0.33) % 1), 24);
  card(out, `smell${u}`, 128, 256, (p) => { const a = 1 - u; for (const dx of [-24, 0, 24]) { const pts: [number, number][] = []; for (let i = 0; i <= 16; i++) pts.push([64 + dx + 10 * Math.sin(i * 0.8 + u * 6), 240 - i * 14]); p.stroke(pts, 7 * a + 2, "#c98a5a"); } }, [at[0], at[1] + u * 0.8, at[2]], 0.5, 1.0, { soft: true });
};
const puff = (out: Stage, u: number, at: V3, s: number) => card(out, `puff${q(u, 30)}`, 300, 300, (p) => fxPuff(p, q(u, 30)), [at[0], at[1] + u * s * 0.3, at[2]], s * (0.6 + 0.6 * u), s * (0.6 + 0.6 * u), { soft: true });
const burstFx = (out: Stage, u: number, at: V3, s: number) => card(out, `burst${q(u, 30)}`, 500, 500, (p) => fxBurst(p, q(u, 30)), at, s, s);

/** people fleeing ahead of the wave, facing us */
const runners = (cam: CamInfo, out: Stage, t: number, tau: number) => {
  const X = waveX(tau);
  for (let i = 0; i < 7; i++) {
    const x = X + 2.4 + i * 1.1 + (i % 2) * 0.5, z = -4.2 + ((i * 3) % 7) * 1.35;
    put(cam, out, t, { i: 20 + i, o: i === 3 ? KIDS[0] : FOLK[i % 6], key: i === 3 ? "kid0" : `folk${i % 6}`, at: [x, 0, z], scale: i === 3 ? KID_S : 1,
      fo: { mode: "march", phase: q(((t * 2.6 + i * 0.3) % 1), 30), lift: 90, expr: i % 3 ? "shock" : "nervous", tilt: -6 } });
  }
};
/** people stuck in the goo (golden + night) */
const stuck = (cam: CamInfo, out: Stage, t: number, id: number) => {
  const spots: [number, number][] = [[-3.2, 0.4], [-0.6, -2.6], [2.4, 1.8], [-6.5, -1.2], [5.6, -3.4], [-9.5, 2.6]];
  spots.forEach(([x, z], i) => {
    const e: Expr = id === 8 ? (["nervous", "shock", "nervous", "pained", "shock", "nervous"] as Expr[])[i] : (["pained", "tired", "pained", "sad", "tired", "pained"] as Expr[])[i];
    const sc = i === 4 ? KID_S : 1;
    put(cam, out, t, { i: 40 + i, o: i === 4 ? KIDS[1] : FOLK[i % 6], key: i === 4 ? "kid1" : `folk${i % 6}`, at: [x, GOO - (i === 4 ? 0.45 : 0.7), z], scale: sc, blob: false,
      fo: { mode: "stand", expr: e, wave: id === 8 && i % 2 === 0 ? q(0.5 + 0.5 * Math.sin(t * (2.2 - 1.4 * clamp01((t - 39) / 4)) + i), 10) : undefined } });
  });
};

export const stage = (id: number, t: number, cam: CamInfo): Stage => {
  const out: Stage = { places: [], fx: [] };
  const s = SHOTS[id - 1], f = Math.round(t * FPS), tau = s.tau(t);
  LNAME = s.light;
  findSun(cam, SUN);
  const P = (g: Fig) => put(cam, out, t, g);
  switch (id) {
    case 1: runners(cam, out, t, tau); break;
    case 2: {
      P({ i: 1, o: BOSS, key: "boss", at: [TE + 1.8, 0, 1.6], fo: { mode: "stand", expr: ex(t, [0, "proud"], [11.3, "grin"]), prop: "point", facing: -1 } });
      P({ i: 30, o: FOLK[1], key: "folk1", at: [TE + 5.2, 0, -3.2], fo: { mode: "stand", expr: ex(t, [0, "neutral"], [9.4, "nervous"]), facing: -1 } });
      P({ i: 31, o: KIDS[2], key: "kid2", at: [TE + 4.4, 0, -2.4], fo: { mode: "stand", expr: "grin" }, scale: KID_S });
      break;
    }
    case 3: {
      for (let k = 0; k < 4; k++) drip(out, t, [TE + 0.03, 1.9 - k * 0.3, 0.25 + k * 0.35 - 0.6], k);
      card(out, "puddle", 256, 128, (p) => p.ell(128, 64, 120, 50, "#5c2c10", 4), [TE + 0.6, 0.015, 0.2], 1.4, 0.7, { flat: true });
      if (f >= 445) {
        P({ i: 10, o: KIDS[0], key: "kid0", at: [TE + 1.1, 0, 0.9], fo: { mode: "stand", expr: ex(t, [0, "grin"], [16.1, "lick"]), prop: "cup" }, scale: KID_S });
        P({ i: 11, o: KIDS[1], key: "kid1", at: [TE + 1.6, 0, -0.7], fo: { mode: "stand", expr: "laugh", prop: "cup" }, scale: KID_S });
        P({ i: 12, o: KIDS[2], key: "kid2", at: [TE + 2.3, 0, 0.3], fo: { mode: "stand", expr: "lick", prop: "cup" }, scale: KID_S });
      }
      break;
    }
    case 4: {
      if (f < 640) P({ i: 1, o: BOSS, key: "boss", at: [LADDER[0] + 0.6, 1.9, LADDER[2] + 0.35], blob: false,
        fo: { mode: "stand", expr: ex(t, [0, "nervous"], [19.2, "smile"], [19.9, "whistle"]), prop: "brushUp", wave: undefined } });
      if (f < 640) for (let k = 0; k < 2; k++) drip(out, t, [TE + 0.05, 3.2 - k * 0.6, LADDER[2] + 0.4 + k * 0.3], k);
      break;
    }
    case 5: P({ i: 1, o: BOSS, key: "boss", at: [TE + 1.9, 0, 1.6], fo: { mode: "stand", expr: ex(t, [0, "smile"], [24.3, "grin"]), wave: q(0.5 + 0.5 * Math.sin(t * 6), 10), facing: -1 } }); break;
    case 6: {
      const shocked = t > BURST - LEAD;
      [[4, -3.8], [7.5, 2.2], [10.5, -1.4], [13, 3.6], [2, 1.0]].forEach(([x, z], i) => P({ i: 50 + i, o: i === 4 ? KIDS[2] : FOLK[i], key: i === 4 ? "kid2" : `folk${i}`, at: [x - (shocked ? 0 : 0.3 * (t - 25.8)), 0, z], scale: i === 4 ? KID_S : 1,
        fo: { mode: shocked ? "stand" : "stroll", phase: q(((t * 1.6 + i * 0.27) % 1), 30), expr: shocked ? "shock" : (["smile", "smile_closed", "neutral", "grin", "grin"] as Expr[])[i], facing: -1 } }));
      if (tau > BURST && tau < BURST + 0.6) burstFx(out, (tau - BURST) / 0.6, [TANK[0] + TANK_R, 7, 0], 9);
      break;
    }
    case 7: {
      if (f < 1005) runners(cam, out, t, tau);
      else if (f < 1068) {
        const u = clamp01((t - 33.6) / 1.2);
        P({ i: 25, o: FOLK[4], key: "folk4", at: [SHED[0] + 4.5 + 3 * u, 0.5 + 1.6 * Math.sin(Math.PI * u), SHED[2] + 4.5], fo: { mode: u > 0 && u < 1 ? "fall" : "stand", expr: "shock" }, blob: u >= 1 });
        if (t > 34.0 && t < 34.6) puff(out, (t - 34.0) / 0.6, [SHED[0] + 4, 1.0, SHED[2] + 2.6], 3.5);
      } else if (t > 35.9 && t < 36.5) burstFx(out, (t - 35.9) / 0.6, [28, 6.0, 0], 4);
      break;
    }
    case 8: case 9: stuck(cam, out, t, id); break;
    case 10: for (let i = 0; i < 4; i++) card(out, "hatF", 200, 140, (p) => { p.ell(100, 100, 62, 30, "#3a3d47", 8, 180, 360); p.ell(100, 100, 92, 14, "#2f3540", 8); }, [-4 + i * 3.4, GOO + 0.08, -3 + ((i * 5) % 6)], 0.5, 0.35, { rot: 0.2 * i - 0.3 }); break;
    case 11: {
      if (f >= 1595) {
        const u = clamp01((t - 53.2) / 4.6);
        P({ i: 60, o: FOLK[0], key: "folk0", at: h(LAB, -3.7 + 1.5 * u, 0.62 - 1.0, 0.9), blob: false, fo: { mode: "march", phase: q(((t * 0.55) % 1), 30), lift: 30, expr: "pained", tilt: -10 } });
      }
      break;
    }
    case 12: {
      const k = t >= 58.4;
      P({ i: 1, o: BOSS, key: "boss", at: h(COURT, -1.2, 0, 0.0), fo: { mode: "stand", expr: ex(t, [0, "nervous"], [58.4, "stern"], [60.3, "shock"]), prop: k ? "point" : null, facing: -1 } });
      if (k) P({ i: 70, o: SHADY, key: "shady", at: h(COURT, -2.7, 0, 0.7), fo: { mode: "stand", expr: "nervous", prop: "bomb", facing: 1 } });
      const bang = (t > 60.2 && t < 60.45) || (t > 60.7 && t < 60.95);
      P({ i: 71, o: JUDGE, key: "judge", at: h(COURT, 1.6, 0.8, 2.75), blob: false, fo: { mode: "stand", expr: ex(t, [0, "neutral"], [60.1, "stern"]), prop: bang ? "gavelDown" : "gavelUp", facing: -1 } });
      break;
    }
    case 13: {
      P({ i: 12, o: KIDS[2], key: "kid2", at: [2.5, 0, 0.3], fo: { mode: "stand", expr: ex(t, [0, "neutral"], [63.6, "smile_closed"]) }, scale: KID_S });
      P({ i: 55, o: FOLK[5], key: "folk5", at: [0.6, 0, -1.6], fo: { mode: "stand", expr: ex(t, [0, "smile"], [64.4, "relief"]) } });
      for (let k = 0; k < 6; k++) smellLines(out, t, [1.0 + k * 1.1, 0.05, -2.5 + ((k * 3) % 5)], k);
      break;
    }
  }
  void GOO; void BURST; void fxStars; void fxSplash; void fxCreak; void fxRing;
  return out;
};
export { FPS };
