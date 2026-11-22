// Lake Peigneur as one three.js scene: sky, terrain (land, lake bed, island hill, canal), the lake surface with a
// whirlpool funnel, the drilling rig, tug, barges, fishing boat, island trees and the piece that slides in, the mine
// headframe, houses, the porch tea table, the salt mine room under the lake, the canal stream and the waterfall.
// update(id, f, camera) poses everything for shot `id` at frame f (pure function of id + f).
import * as THREE from "three";
import { Batch, boxGeo, V, lam, house, Kit } from "./build";
import { ctex, cloudHD, stoneHD, grassHD, planksHD, beamHD, rng } from "./paint";
import { LIGHTS, LOOK, LightPreset } from "./lights";
import { TONE, CHAR, LFB, twoTone, untone } from "./shade";
import { NOINK } from "./ink";
import { Pool, Actor, Fx, stage, boatAt, boatY, POP_AT } from "./cast";
import {
  FPS, D0, LR, RC, SHOTS, RIG, DECK, TUG, BARGES, ISLAND, CHUNK, TREES, HEAD, MINE_Y, CEIL_Y, TEA, CANAL_Z, CANAL_W,
  camAt, rigTilt, swirl, level, crater, funnel, swU, spiral, SW_RIG, SW_TUG, SW_BARGE, SW_TREE, SW_CHUNK, POP, SUGAR_IN, POKE, holeR,
  H, bedH, V3, smooth, clamp01, ShotDef, Sw,
} from "./story";

export const loadKit = () => Promise.resolve({} as Kit);

// ---------------- small helpers ----------------
const beamBetween = (a: THREE.Vector3, b: THREE.Vector3, th: number) => {
  const g = new THREE.BoxGeometry(th, a.distanceTo(b), th);
  const m = new THREE.Matrix4().compose(a.clone().add(b).multiplyScalar(0.5), new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), b.clone().sub(a).normalize()), V(1, 1, 1));
  return g.applyMatrix4(m);
};
const col = (c: string) => lam("c" + c, () => ({ color: c }));
const mesh = (g: THREE.BufferGeometry, m: THREE.Material, parent: THREE.Object3D, cast = true) => {
  const o = new THREE.Mesh(g, m); o.castShadow = cast; o.receiveShadow = true; parent.add(o); return o;
};
/** hull: a box with a pointed bow (+x), from y0 to y1 */
const hullGeo = (L: number, W: number, y0: number, y1: number, bow = 0.3) => {
  const s = new THREE.Shape();
  s.moveTo(-L / 2, -W / 2); s.lineTo(L / 2 - L * bow, -W / 2); s.quadraticCurveTo(L / 2, -W / 2, L / 2, 0); s.quadraticCurveTo(L / 2, W / 2, L / 2 - L * bow, W / 2); s.lineTo(-L / 2, W / 2); s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: y1 - y0, bevelEnabled: false });
  g.rotateX(-Math.PI / 2); g.translate(0, y0, 0);
  return g;
};
const saltTex = () => stoneHD("saltHD", ["#efe9e2", "#e4dcd4", "#f4f0ea", "#dcd2ca"], "#b9aea6");
const mudTex = () => ctex("mudHD", 1024, 1024, (g, r) => {
  g.fillStyle = "#8a7258"; g.fillRect(0, 0, 1024, 1024);
  for (let i = 0; i < 900; i++) { g.fillStyle = ["#7d664e", "#957c60", "#806a52", "#9a8366"][i % 4]; g.beginPath(); g.ellipse(r() * 1024, r() * 1024, 10 + r() * 40, 6 + r() * 20, r() * 3, 0, 7); g.fill(); }
  g.strokeStyle = "rgba(60,44,30,0.5)"; g.lineWidth = 3;
  for (let i = 0; i < 60; i++) { g.beginPath(); let x = r() * 1024, y = r() * 1024; g.moveTo(x, y); for (let k = 0; k < 5; k++) { x += (r() - 0.5) * 80; y += (r() - 0.5) * 80; g.lineTo(x, y); } g.stroke(); }
});
const streakTex = (key: string, base: string, light: string) => ctex(key, 256, 512, (g, r) => {
  g.fillStyle = base; g.fillRect(0, 0, 256, 512);
  for (let i = 0; i < 70; i++) { g.fillStyle = i % 3 ? light : "rgba(255,255,255,0.9)"; const x = r() * 256, w = 3 + r() * 10, y = r() * 512, h = 60 + r() * 220; g.fillRect(x, y, w, h); g.fillRect(x, y - 512, w, h); }
});
const discTex = () => ctex("sunDisc", 128, 128, (g) => {
  const gr = g.createRadialGradient(64, 64, 58, 64, 64, 64); gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
});

type Swimmer = { o: THREE.Object3D; p0: V3; sw: Sw; y0: number };

export class World {
  root = new THREE.Group();
  private pool = new Pool();
  private actors: Actor[] = [];
  private fxs: Fx[] = [];
  private hemi: THREE.HemisphereLight; private sun: THREE.DirectionalLight;
  private sky: THREE.Mesh; private skyMat: THREE.ShaderMaterial;
  private fog = new THREE.Fog("#bccbec", 25, 420);
  private sunDisc: THREE.Sprite;
  private sunCache = new Map<number, THREE.Vector3>();
  private cloudMaps: Record<"day" | "golden", THREE.Texture[]>;
  private clouds: THREE.Mesh[] = [];
  private WU: Record<string, THREE.IUniform>;
  private water: THREE.Mesh; private canalWater: THREE.Mesh;
  private bedDisk: THREE.Mesh; private craterM: THREE.Mesh;
  private rig = new THREE.Group(); private pipe: THREE.Mesh;
  private tug = new THREE.Group(); private barges: THREE.Group[] = []; private popB: THREE.Group[] = [];
  private boat = new THREE.Group();
  private trees: THREE.Group[] = []; private chunk = new THREE.Group();
  private swimmers: Swimmer[] = [];
  private mine = new THREE.Group(); private mineWater: THREE.Mesh; private bit: THREE.Mesh; private jet: THREE.Mesh; private holeDisk: THREE.Mesh;
  private stream: THREE.Mesh; private fall: THREE.Mesh; private flowTex: THREE.Texture[] = [];
  private cube: THREE.Mesh; private tea = new THREE.Group();
  private frustum = new THREE.Frustum();
  private m4 = new THREE.Matrix4(); private v = new THREE.Vector3(); private sph = new THREE.Sphere();

  constructor(_kit: Kit, shadowSize = 4096) {
    const R = this.root;
    // ---- sky + light (template values) ----
    this.skyMat = new THREE.ShaderMaterial({
      uniforms: { c0: { value: new THREE.Color() }, c1: { value: new THREE.Color() }, c2: { value: new THREE.Color() }, c3: { value: new THREE.Color() }, c4: { value: new THREE.Color() }, e: { value: new THREE.Vector4() } },
      vertexShader: "varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
      fragmentShader: `uniform vec3 c0, c1, c2, c3, c4; uniform vec4 e; varying vec3 vP;
        void main(){ float el = asin(clamp(normalize(vP).y, -1.0, 1.0));
          vec3 c = mix(c0, c1, smoothstep(0.0, e.x, el)); c = mix(c, c2, smoothstep(e.x, e.y, el));
          c = mix(c, c3, smoothstep(e.y, e.z, el)); c = mix(c, c4, smoothstep(e.z, e.w, el)); gl_FragColor = vec4(c, 1.0); }`,
      side: THREE.BackSide, depthWrite: false, fog: false,
    });
    this.sky = new THREE.Mesh(new THREE.SphereGeometry(1100, 48, 24), this.skyMat);
    this.sky.renderOrder = -1; this.sky.frustumCulled = false; this.sky.layers.set(NOINK); R.add(this.sky);
    this.sunDisc = new THREE.Sprite(new THREE.SpriteMaterial({ map: discTex(), color: new THREE.Color(6.0, 4.4, 2.4), fog: false, depthWrite: false }));
    this.sunDisc.frustumCulled = false; this.sunDisc.layers.set(NOINK); R.add(this.sunDisc);
    this.hemi = new THREE.HemisphereLight("#cfe6ff", "#6c5c8c", 1.1);
    this.sun = new THREE.DirectionalLight("#fff0d6", 2.6); this.sun.castShadow = true; this.sun.shadow.mapSize.set(shadowSize, shadowSize);
    R.add(this.hemi, this.sun, this.sun.target);
    this.cloudMaps = { day: [0, 1, 2, 3].map((k) => cloudHD(k, LOOK.day.cloud)), golden: [0, 1, 2, 3].map((k) => cloudHD(k, LOOK.golden.cloud)) };
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2 + 0.3, d = 620 + (i % 3) * 60, w = 130 + (i % 4) * 30;
      const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: this.cloudMaps.day[i % 4], color: new THREE.Color(1.1, 1.1, 1.1), transparent: true, depthWrite: false, fog: false }));
      m.position.set(Math.cos(a) * d, 120 + (i % 4) * 38, Math.sin(a) * d); m.scale.set(w, w / 2, 1); m.layers.set(NOINK);
      this.clouds.push(m); R.add(m);
    }

    // ---- terrain: one height grid, triangles split into grass (land) and mud (bed); far land as flat quads ----
    const grass = lam("grassHD", () => ({ map: grassHD() })), mud = lam("mudHD", () => ({ map: mudTex() }));
    for (const m of [grass, mud]) if (m.map) { m.map.wrapS = m.map.wrapT = THREE.RepeatWrapping; m.map.anisotropy = 16; }
    const E = 260, S = 4, N = (2 * E) / S + 1;
    const P: number[] = [], NRM: number[] = [], UV: number[] = [];
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
      const x = -E + i * S, z = -E + j * S, y = H(x, z);
      const nx = H(x - 0.5, z) - H(x + 0.5, z), nz = H(x, z - 0.5) - H(x, z + 0.5), nl = Math.hypot(nx, 1, nz);
      P.push(x, y, z); NRM.push(nx / nl, 1 / nl, nz / nl); UV.push(x / 6, z / 6);
    }
    const land: number[] = [], bed: number[] = [], disk: number[] = [];
    for (let j = 0; j < N - 1; j++) for (let i = 0; i < N - 1; i++) {
      const a = j * N + i, b = a + 1, c = a + N, d = c + 1;
      for (const t of [[a, c, b], [b, c, d]]) {
        const ys = t.map((k) => P[k * 3 + 1]), xs = t.map((k) => P[k * 3]), zs = t.map((k) => P[k * 3 + 2]);
        const cx = (xs[0] + xs[1] + xs[2]) / 3, cz = (zs[0] + zs[1] + zs[2]) / 3, my = (ys[0] + ys[1] + ys[2]) / 3;
        (Math.hypot(cx, cz) < RC && my < -1 ? disk : my > 0.35 ? land : bed).push(...t);
      }
    }
    const grid = (idx: number[]) => {
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.Float32BufferAttribute(P, 3)); g.setAttribute("normal", new THREE.Float32BufferAttribute(NRM, 3));
      g.setAttribute("uv", new THREE.Float32BufferAttribute(UV, 2)); g.setIndex(idx); return g;
    };
    mesh(grid(land), grass, R, false); mesh(grid(bed), mud, R, false);
    this.bedDisk = mesh(grid(disk), mud, R, false);
    const far = new Batch();
    const flat = (x0: number, x1: number, z0: number, z1: number, y = D0) => {
      const g = new THREE.PlaneGeometry(x1 - x0, z1 - z0); g.rotateX(-Math.PI / 2); g.translate((x0 + x1) / 2, y, (z0 + z1) / 2);
      const uv = g.attributes.uv as THREE.BufferAttribute; for (let k = 0; k < uv.count; k++) uv.setXY(k, uv.getX(k) * (x1 - x0) / 6, uv.getY(k) * (z1 - z0) / 6);
      return g;
    };
    far.add(flat(-900, -E, -900, 900), grass); far.add(flat(-E, E, -900, -E), grass); far.add(flat(-E, E, E, 900), grass);
    far.add(flat(E, 900, -900, CANAL_Z - CANAL_W / 2 - 4), grass); far.add(flat(E, 900, CANAL_Z + CANAL_W / 2 + 4, 900), grass);
    far.add(flat(E, 900, CANAL_Z - CANAL_W / 2 - 4, CANAL_Z + CANAL_W / 2 + 4, -2.6), mud);
    far.build(R, false);
    // crater: an inverted cone under the bed disk
    const cg = new THREE.CylinderGeometry(RC + 1, 3, 38, 48, 8, true); cg.translate(0, bedH(RC) - 19, 0);
    const cp = cg.attributes.position as THREE.BufferAttribute, cc: number[] = [];
    for (let k = 0; k < cp.count; k++) { const d = clamp01((bedH(RC) - cp.getY(k)) / 22), v = 0.75 - 0.6 * d; cc.push(v, v * 0.95, v * 1.05); }
    cg.setAttribute("color", new THREE.Float32BufferAttribute(cc, 3));
    const cap = new THREE.CircleGeometry(3.2, 24).rotateX(-Math.PI / 2).translate(0, bedH(RC) - 37.9, 0);
    this.craterM = mesh(cg, lam("craterMud", () => ({ map: mudTex(), side: THREE.DoubleSide, color: "#b9a48c", vertexColors: true })), R, false);
    this.craterM.add(new THREE.Mesh(cap, col("#2a2018")));

    // ---- water: polar grid, funnel in the vertex shader, swirl bands in the fragment shader ----
    const wPos: number[] = [], wIdx: number[] = [], NA = 128, NRr = 70;
    for (let k = 0; k <= NRr; k++) { const r = (LR + 4) * (k / NRr) ** 1.6; for (let a = 0; a < NA; a++) { const th = (a / NA) * Math.PI * 2; wPos.push(r * Math.cos(th), 0, r * Math.sin(th)); } }
    for (let k = 0; k < NRr; k++) for (let a = 0; a < NA; a++) { const i0 = k * NA + a, i1 = k * NA + ((a + 1) % NA), i2 = i0 + NA, i3 = i1 + NA; wIdx.push(i0, i1, i2, i1, i3, i2); }
    const wg = new THREE.BufferGeometry(); wg.setAttribute("position", new THREE.Float32BufferAttribute(wPos, 3)); wg.setIndex(wIdx); wg.computeVertexNormals();
    this.WU = {
      wNearC: { value: new THREE.Color() }, wMidC: { value: new THREE.Color() }, wFarC: { value: new THREE.Color() },
      wCrest: { value: new THREE.Color() }, wTrough: { value: new THREE.Color() }, wDeep: { value: new THREE.Color("#0a1f4a") },
      wShade: { value: new THREE.Vector3(0.5, 0.56, 0.72) }, wTime: { value: 0 }, wLevel: { value: 0 }, wSwirl: { value: 0 }, wDeepK: { value: 0 },
    };
    const waterM = new THREE.MeshLambertMaterial({ color: 0xffffff });
    waterM.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, this.WU);
      sh.vertexShader = sh.vertexShader
        .replace("#include <common>", "#include <common>\nvarying vec3 vWP; uniform float wLevel, wSwirl;")
        .replace("#include <begin_vertex>", "vec3 transformed = position; float rr = length(position.xz); transformed.y = wLevel - wSwirl * 9.0 * exp(-pow(rr / 16.0, 2.0));")
        .replace("#include <project_vertex>", "#include <project_vertex>\nvWP = (modelMatrix * vec4(transformed, 1.0)).xyz;");
      sh.fragmentShader = sh.fragmentShader
        .replace("#include <common>", WATER_DECL)
        .replace("#include <map_fragment>", WATER_COL)
        .replace("#include <lights_fragment_begin>", "float sunVis = 1.0;\n" + LFB)
        .replace("#include <lights_fragment_end>", "#include <lights_fragment_end>\n  reflectedLight.directDiffuse = diffuseColor.rgb * mix(wShade, vec3(1.0), sunVis);\n  reflectedLight.indirectDiffuse = vec3(0.0);");
    };
    waterM.customProgramCacheKey = () => "lakeWater1";
    this.water = new THREE.Mesh(wg, waterM); this.water.receiveShadow = true; this.water.frustumCulled = false; R.add(this.water);
    const cw = new THREE.PlaneGeometry(900 - (LR - 8), CANAL_W + 6); cw.rotateX(-Math.PI / 2); cw.translate((900 + LR - 8) / 2, -0.35, CANAL_Z);
    this.canalWater = new THREE.Mesh(cw, waterM); this.canalWater.receiveShadow = true; R.add(this.canalWater);

    // ---- the drilling rig (group pivots at the lake centre) ----
    const red = col("#c8463c"), white = col("#efe9de"), steel = twoTone(new THREE.MeshPhongMaterial({ color: "#7d838c", specular: "#9a9a9a", shininess: 40 }), 0.15);
    const deck = lam("deckPlanks", () => ({ map: planksHD() })), hullM = col("#44506a"), rust = col("#a0583a");
    mesh(hullGeo(15, 10, -0.9, DECK - 0.15, 0.08), hullM, this.rig);
    mesh(boxGeo(V(-7.2, DECK - 0.15, -4.8), V(7.2, DECK, 4.8), 3), deck, this.rig);
    const legs: [number, number][] = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
    for (const [sx, sz] of legs) mesh(beamBetween(V(3.4 * sx, DECK, 3.4 * sz), V(0.7 * sx, DECK + 24, 0.7 * sz), 0.32), red, this.rig);
    for (let k = 1; k < 7; k++) {
      const y = DECK + k * 3.4, w = 3.4 - (2.7 * k * 3.4) / 24;
      for (let e = 0; e < 4; e++) {
        const [ax, az] = legs[e], [bx, bz] = legs[(e + 1) % 4];
        mesh(beamBetween(V(w * ax, y, w * az), V(w * bx, y, w * bz), 0.2), k % 2 ? white : red, this.rig);
        if (k < 6) { const w2 = 3.4 - (2.7 * (k + 1) * 3.4) / 24; mesh(beamBetween(V(w * ax, y, w * az), V(w2 * bx, y + 3.4, w2 * bz), 0.12), white, this.rig); }
      }
    }
    mesh(boxGeo(V(-1.1, DECK + 24, -1.1), V(1.1, DECK + 25.2, 1.1)), red, this.rig);
    mesh(boxGeo(V(3.6, DECK, -4.2), V(7, DECK + 2.8, -0.6), 2), col("#e3b04a"), this.rig); // drawworks shed
    mesh(boxGeo(V(3.4, DECK + 2.8, -4.4), V(7.2, DECK + 3.1, -0.4)), rust, this.rig);
    mesh(new THREE.CylinderGeometry(1.2, 1.2, 0.45, 24).translate(0, DECK + 0.22, 0), steel, this.rig); // turntable
    this.pipe = mesh(new THREE.CylinderGeometry(0.16, 0.16, 30, 10).translate(0, DECK + 9, 0), steel, this.rig);
    for (const [x, z] of [[-6, 3.8], [-4.6, 3.8], [5.5, 3.6]] as const) mesh(new THREE.CylinderGeometry(0.5, 0.5, 1.1, 14).translate(x, DECK + 0.55, z), col(["#3f7fbf", "#3f7fbf", "#d8a23a"][Math.round(x) % 3 === 0 ? 2 : 0]), this.rig);
    mesh(boxGeo(V(-7.2, DECK, 4.6), V(7.2, DECK + 1.0, 4.8)), white, this.rig); // rail
    R.add(this.rig);
    this.swimmers.push({ o: this.rig, p0: RIG, sw: SW_RIG, y0: 0 });

    // ---- tug ----
    mesh(hullGeo(9, 3.6, -0.7, 1.0), col("#2f3f5a"), this.tug);
    mesh(boxGeo(V(-4.2, 1.0, -1.7), V(3.6, 1.15, 1.7)), col("#c9473d"), this.tug);
    mesh(boxGeo(V(-2.4, 1.15, -1.2), V(0.8, 3.3, 1.2), 1.5), white, this.tug);
    mesh(boxGeo(V(-2.6, 3.3, -1.35), V(1.0, 3.55, 1.35)), col("#c9473d"), this.tug);
    mesh(new THREE.CylinderGeometry(0.35, 0.35, 1.6, 12).translate(-1.6, 4.3, 0), col("#202530"), this.tug);
    this.tug.position.set(...TUG); this.tug.rotation.y = 0.6; R.add(this.tug);
    this.swimmers.push({ o: this.tug, p0: TUG, sw: SW_TUG, y0: 0 });
    // ---- barges (11 moored, 3 that pop back up later) ----
    const barge = (k: number) => {
      const g = new THREE.Group();
      mesh(boxGeo(V(-6, -0.8, -2.8), V(6, 1.0, 2.8), 2), col(["#8f4e34", "#6b6f78", "#7a5a3a"][k % 3]), g);
      mesh(boxGeo(V(-5.6, 1.0, -2.4), V(5.6, 1.15, 2.4)), col("#5a4a3a"), g);
      for (let c = 0; c < 3; c++) mesh(boxGeo(V(-4.6 + c * 3.2, 1.15, -1.6), V(-2.4 + c * 3.2, 2.4 + (c % 2) * 0.6, 1.6), 1.5), col(["#3f7fbf", "#d8a23a", "#c8463c", "#4f9a5a"][(k + c) % 4]), g);
      return g;
    };
    BARGES.forEach((p, k) => { const g = barge(k); g.position.set(...p); g.rotation.y = Math.PI / 2 + 0.06 * k; R.add(g); this.barges.push(g); this.swimmers.push({ o: g, p0: p, sw: SW_BARGE(k), y0: 0 }); });
    POP_AT.forEach((p, k) => { const g = barge(k + 4); g.position.set(...p); g.rotation.y = 0.7 + k; R.add(g); this.popB.push(g); });
    // ---- fishing boat ----
    mesh(hullGeo(4.4, 1.6, -0.25, 0.45, 0.35), col("#e8e0d0"), this.boat);
    mesh(boxGeo(V(-2.0, 0.45, -0.82), V(1.5, 0.55, 0.82)), col("#3f7fbf"), this.boat);
    mesh(boxGeo(V(-1.0, 0.28, -0.7), V(1.0, 0.36, 0.7)), col("#a8724a"), this.boat);
    R.add(this.boat);

    // ---- island: trees, house, headframe; the piece that slides in ----
    const tree = (s: number, seed: number) => {
      const g = new THREE.Group(), r = rng(seed);
      mesh(new THREE.CylinderGeometry(0.28 * s, 0.4 * s, 3.2 * s, 8).translate(0, 1.6 * s, 0), col("#8a5a3c"), g);
      for (let k = 0; k < 3; k++) mesh(new THREE.IcosahedronGeometry((1.9 - k * 0.35) * s, 1).translate((r() - 0.5) * 1.2 * s, (3.6 + k * 1.3) * s, (r() - 0.5) * 1.2 * s), col(["#4f9a45", "#5aa84c", "#468a3e"][k]), g);
      return g;
    };
    const stat = new Batch();
    const rr = rng(7);
    for (let i = 0; i < 46; i++) {
      const a = rr() * Math.PI * 2, d = 8 + rr() * 30, x = ISLAND[0] + Math.cos(a) * d, z = ISLAND[2] + Math.sin(a) * d;
      if (H(x, z) < 1.2 || Math.hypot(x - HEAD[0], z - HEAD[2]) < 9 || Math.hypot(x - CHUNK[0], z - CHUNK[2]) < 12) continue;
      const t = tree(0.9 + rr() * 0.6, i); t.position.set(x, H(x, z) - 0.2, z); stat.addObject(t, new THREE.Matrix4());
    }
    for (let i = 0; i < 70; i++) { // trees on the shore
      const a = rr() * Math.PI * 2, d = LR + 14 + rr() * 90, x = Math.cos(a) * d, z = Math.sin(a) * d;
      if (Math.abs(z - CANAL_Z) < 16 && x > 0) continue;
      if (Math.hypot(x - TEA[0], z - TEA[2]) < 18) continue;
      const t = tree(1 + rr() * 0.7, 100 + i); t.position.set(x, H(x, z) - 0.2, z); stat.addObject(t, new THREE.Matrix4());
    }
    // houses on the east and south shores
    [[150, -70, -Math.PI / 2], [152, 40, -Math.PI / 2], [148, -34, -Math.PI / 2 + 0.1], [60, -150, 0], [20, -158, 0.1], [-60, -152, -0.1], [-150, -40, Math.PI / 2], [-30, 150, Math.PI]].forEach(([x, z, yaw], i) =>
      house(stat, x, z, yaw, 9 + (i % 3) * 2, 7, 6 + (i % 2) * 1.5, i, H(x, z)));
    const hy = H(HEAD[0], HEAD[2]);
    // headframe: two A-legs and a wheel on top, a hoist house with a door
    for (const s of [-1, 1]) { stat.add(beamBetween(V(HEAD[0] - 3, hy, HEAD[2] + 2 * s), V(HEAD[0], hy + 14, HEAD[2] + 0.6 * s), 0.35), red); stat.add(beamBetween(V(HEAD[0] + 3, hy, HEAD[2] + 2 * s), V(HEAD[0], hy + 14, HEAD[2] + 0.6 * s), 0.35), red); }
    const wheel = new THREE.TorusGeometry(1.6, 0.18, 8, 24); wheel.translate(HEAD[0], hy + 14.3, HEAD[2]); stat.add(wheel, col("#2f3540"));
    stat.add(boxGeo(V(HEAD[0] - 4, hy, HEAD[2] - 1.2), V(HEAD[0] + 4, hy + 4.2, HEAD[2] + 6), 2), col("#d9c8a8"));
    stat.add(boxGeo(V(HEAD[0] - 1.1, hy, HEAD[2] - 1.25), V(HEAD[0] + 1.1, hy + 2.6, HEAD[2] - 1.2)), col("#2a2230"));
    stat.add(boxGeo(V(HEAD[0] - 4.4, hy + 4.2, HEAD[2] - 1.6), V(HEAD[0] + 4.4, hy + 4.6, HEAD[2] + 6.4)), rust);
    // porch with the tea table on the east shore
    const ty = TEA[1];
    stat.add(boxGeo(V(TEA[0] - 3, ty - 0.1, TEA[2] - 3), V(TEA[0] + 4, ty + 0.05, TEA[2] + 3), 1), lam("porch", () => ({ map: beamHD() })));
    stat.add(boxGeo(V(TEA[0] - 0.6, ty + 0.72, TEA[2] - 0.6), V(TEA[0] + 0.6, ty + 0.78, TEA[2] + 0.6)), col("#d84a4a"));
    for (const [sx, sz] of legs) stat.add(boxGeo(V(TEA[0] + 0.5 * sx - 0.04, ty, TEA[2] + 0.5 * sz - 0.04), V(TEA[0] + 0.5 * sx + 0.04, ty + 0.72, TEA[2] + 0.5 * sz + 0.04)), col("#8a5a3c"));
    stat.build(R);
    TREES.forEach((p, k) => { const t = tree(1.2, 300 + k); t.position.set(p[0], H(p[0], p[2]) - 0.2, p[2]); R.add(t); this.trees.push(t); });
    // island piece
    const cy = H(CHUNK[0], CHUNK[2]);
    mesh(new THREE.CylinderGeometry(7, 6, cy + 3.5, 9).translate(0, (cy - 3.5) / 2, 0), mud, this.chunk);
    mesh(new THREE.CylinderGeometry(7.05, 7.05, 0.3, 9).translate(0, cy + 0.05, 0), grass, this.chunk);
    const ct = tree(1.0, 400); ct.position.set(1.5, cy, -1); this.chunk.add(ct);
    this.chunk.position.set(CHUNK[0], 0, CHUNK[2]); R.add(this.chunk);
    this.trees.forEach((t, k) => this.swimmers.push({ o: t, p0: TREES[k], sw: SW_TREE(k), y0: t.position.y }));
    this.swimmers.push({ o: this.chunk, p0: CHUNK, sw: SW_CHUNK, y0: 0 });

    // ---- tea set (mug, tea, sugar cube, sugar bowl) ----
    const mug = new THREE.CylinderGeometry(0.048, 0.042, 0.1, 24, 1, true).translate(0, 0.05, 0);
    mesh(mug, lam("mug", () => ({ color: "#f2efe8", side: THREE.DoubleSide })), this.tea);
    mesh(new THREE.CircleGeometry(0.042, 24).rotateX(-Math.PI / 2).translate(0, 0.002, 0), col("#f2efe8"), this.tea);
    mesh(new THREE.TorusGeometry(0.028, 0.008, 8, 16, Math.PI).rotateZ(-Math.PI / 2).translate(0.048, 0.05, 0), col("#f2efe8"), this.tea);
    mesh(new THREE.CircleGeometry(0.046, 24).rotateX(-Math.PI / 2).translate(0, 0.085, 0), col("#9a5a26"), this.tea);
    mesh(new THREE.CylinderGeometry(0.05, 0.04, 0.05, 20).translate(-0.16, 0.025, 0.1), col("#6aa7d8"), this.tea);
    for (let k = 0; k < 4; k++) mesh(boxGeo(V(-0.18 + (k % 2) * 0.022, 0.05, 0.085 + (k >> 1) * 0.022), V(-0.162 + (k % 2) * 0.022, 0.068, 0.103 + (k >> 1) * 0.022)), col("#fbfaf6"), this.tea);
    this.cube = mesh(new THREE.BoxGeometry(0.018, 0.018, 0.018), col("#fbfaf6"), this.tea);
    this.tea.position.set(TEA[0], ty + 0.78, TEA[2]); R.add(this.tea);

    // ---- salt mine room under the lake ----
    const salt = lam("salt", () => ({ map: saltTex() }));
    const room = new Batch();
    room.add(boxGeo(V(-34, MINE_Y - 1, -40), V(34, MINE_Y, 34), 3), salt);
    room.add(boxGeo(V(-34, CEIL_Y, -40), V(34, CEIL_Y + 1, 34), 3, true), salt);
    room.add(boxGeo(V(-35, MINE_Y - 1, 34), V(35, CEIL_Y + 1, 35), 3), salt);
    room.add(boxGeo(V(-35, MINE_Y - 1, -41), V(35, CEIL_Y + 1, -40), 3), salt);
    room.add(boxGeo(V(-35, MINE_Y - 1, -41), V(-34, CEIL_Y + 1, 35), 3), salt);
    room.add(boxGeo(V(34, MINE_Y - 1, -41), V(35, CEIL_Y + 1, 35), 3), salt);
    for (const px of [-18, 0, 18]) for (const pz of [-24, 14]) room.add(boxGeo(V(px - 3.5, MINE_Y, pz - 3.5), V(px + 3.5, CEIL_Y, pz + 3.5), 3), salt);
    for (const px of [-18, 18]) room.add(boxGeo(V(px - 3.5, MINE_Y, -5), V(px + 3.5, CEIL_Y, 2), 3), salt);
    // rails on the floor and a mine cart
    for (const s of [-0.5, 0.5]) room.add(boxGeo(V(-30, MINE_Y, 6 + s), V(30, MINE_Y + 0.12, 6.1 + s)), steel);
    room.add(boxGeo(V(7, MINE_Y + 0.3, 5.1), V(9.4, MINE_Y + 1.5, 7.0), 1), rust);
    room.add(boxGeo(V(7.2, MINE_Y + 1.5, 5.3), V(9.2, MINE_Y + 1.8, 6.8)), col("#f4f1ea"));
    room.build(this.mine, false);
    // lamps along the walls (emissive: they bloom)
    const lampM = new THREE.MeshBasicMaterial({ color: new THREE.Color(4.5, 3.2, 1.6) });
    for (const [x, z] of [[-14, -20.4], [14, -20.4], [-14.4, 10.4], [14.4, 10.4], [-21.6, -1], [21.6, -1], [0, 17.6], [0, -27.6]] as const) {
      const l = new THREE.Mesh(new THREE.SphereGeometry(0.25, 12, 8), lampM); l.position.set(x, CEIL_Y - 1.6, z); l.layers.set(NOINK); this.mine.add(l);
    }
    const mw = new THREE.PlaneGeometry(68, 74); mw.rotateX(-Math.PI / 2); mw.translate(0, 0, -3);
    this.mineWater = new THREE.Mesh(mw, waterM.clone()); this.mineWater.receiveShadow = false;
    (this.mineWater.material as THREE.MeshLambertMaterial).onBeforeCompile = waterM.onBeforeCompile;
    (this.mineWater.material as THREE.MeshLambertMaterial).customProgramCacheKey = () => "mineWater1";
    this.mine.add(this.mineWater);
    this.bit = mesh(new THREE.ConeGeometry(0.5, 1.4, 12).rotateX(Math.PI).translate(0, 0, 0), steel, this.mine, false);
    this.holeDisk = new THREE.Mesh(new THREE.CircleGeometry(1, 24).rotateX(Math.PI / 2), new THREE.MeshBasicMaterial({ color: "#1d2a44" }));
    this.holeDisk.position.set(0, CEIL_Y - 0.02, 0); this.mine.add(this.holeDisk);
    const jT = streakTex("jetTex", "#5fb6e0", "#bfe8f6"); jT.wrapT = THREE.RepeatWrapping; this.flowTex.push(jT);
    this.jet = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, CEIL_Y - MINE_Y, 20, 1, true).translate(0, (CEIL_Y + MINE_Y) / 2, 0), new THREE.MeshBasicMaterial({ map: jT, transparent: true, opacity: 0.92 }));
    this.jet.layers.set(NOINK); this.mine.add(this.jet);
    R.add(this.mine);

    // ---- canal stream (reversed flow) and the waterfall into the crater ----
    const sT = streakTex("streamTex", "#3a8fc0", "#8fd0ea"); sT.wrapS = sT.wrapT = THREE.RepeatWrapping; sT.repeat.set(2, 6); this.flowTex.push(sT);
    const sg = new THREE.PlaneGeometry(LR + 8 - RC, 10, 30, 1); sg.rotateX(-Math.PI / 2); sg.rotateY(Math.PI / 2);
    const sp = sg.attributes.position as THREE.BufferAttribute;
    for (let k = 0; k < sp.count; k++) { const x = (LR + 8 + RC) / 2 + sp.getZ(k), z = CANAL_Z + sp.getX(k); sp.setXYZ(k, x, H(x, z) + 0.25, z); }
    sg.computeVertexNormals();
    this.stream = new THREE.Mesh(sg, new THREE.MeshBasicMaterial({ map: sT })); R.add(this.stream);
    const fT = streakTex("fallTex", "#7cc6ea", "#e6f6fc"); fT.wrapS = fT.wrapT = THREE.RepeatWrapping; fT.repeat.set(3, 2); this.flowTex.push(fT);
    const fg = new THREE.CylinderGeometry(RC + 0.4, 2.5, 38, 24, 8, true, -0.16, 0.32); fg.translate(0, bedH(RC) - 19, 0); fg.rotateY(Math.PI / 2);
    this.fall = new THREE.Mesh(fg, new THREE.MeshBasicMaterial({ map: fT, side: THREE.DoubleSide, transparent: true, opacity: 0.95 })); this.fall.layers.set(NOINK); R.add(this.fall);
  }

  /** camera-relative sun, frozen per shot */
  private shotSun(id: number, s: ShotDef, L: LightPreset) {
    let v = this.sunCache.get(id);
    if (v) return v;
    let fx = 0, fz = 0;
    for (let f = s.a; f < s.b; f += 3) { const c = camAt(id, f), x = c.look[0] - c.pos[0], z = c.look[2] - c.pos[2], n = Math.hypot(x, z) || 1; fx += x / n; fz += z / n; }
    const n = Math.hypot(fx, fz) || 1; fx /= n; fz /= n;
    const az = THREE.MathUtils.degToRad(s.sunAz ?? (s.set === "mine" ? 120 : L.az)), el = THREE.MathUtils.degToRad(s.sunEl ?? (s.set === "mine" ? 50 : L.el));
    const hx = fx * Math.cos(az) - fz * Math.sin(az), hz = fz * Math.cos(az) + fx * Math.sin(az);
    v = new THREE.Vector3(hx * Math.cos(el), Math.sin(el), hz * Math.cos(el)).normalize();
    this.sunCache.set(id, v);
    return v;
  }
  private actor(i: number) { while (this.actors.length <= i) this.actors.push(new Actor(this.root)); return this.actors[i]; }
  private fx(i: number) { while (this.fxs.length <= i) this.fxs.push(new Fx(this.root)); return this.fxs[i]; }

  update(id: number, f: number, cam: THREE.PerspectiveCamera, scene: THREE.Scene) {
    const t = f / FPS, s = SHOTS[id - 1], tau = s.tau(t), L = LIGHTS[s.light], K = LOOK[s.light];
    const c = camAt(id, f);
    cam.position.set(...c.pos); cam.up.set(0, 1, 0); cam.lookAt(...c.look); cam.rotateZ(c.roll);
    cam.fov = c.fov; cam.near = 0.05; cam.far = 1500; cam.updateProjectionMatrix(); cam.updateMatrixWorld();
    const focus = V(...c.look), dist = cam.position.distanceTo(focus);
    cam.layers.enable(NOINK);
    // ---- light rig ----
    const sunDir = this.shotSun(id, s, L);
    this.hemi.color.set(L.sky); this.hemi.groundColor.set(L.ground); this.hemi.intensity = L.hemiI;
    this.sun.color.set(L.sunCol); this.sun.intensity = L.sunI;
    let Rr = THREE.MathUtils.clamp(dist * 1.15 + 7, 6, 120);
    if (s.light === "golden" && s.set === "lake") Rr = Math.max(Rr, 60);
    this.sun.position.copy(focus).addScaledVector(sunDir, 300); this.sun.target.position.copy(focus);
    const sc = this.sun.shadow.camera;
    sc.left = -Rr; sc.right = Rr; sc.top = Rr; sc.bottom = -Rr; sc.near = 20; sc.far = 600; sc.updateProjectionMatrix();
    this.sun.shadow.bias = L.bias; this.sun.shadow.normalBias = L.normalBias * (Rr / 12);
    TONE.uLitCol.value.set(...L.lit); TONE.uShadeCol.value.set(...L.shade); TONE.uShadeLift.value.set(...L.lift);
    TONE.uLambert.value = L.lambert; TONE.uSideK.value = L.sideK; TONE.uTerm.value = L.term; TONE.uBounce.value.set(...K.bounce); TONE.uSat.value = K.sat;
    CHAR.uCharTint.value.set(...L.charTint); CHAR.uCharShade.value = L.charShade; CHAR.uGrad.value = L.charGrad;
    CHAR.uBodyGrad.value = L.bodyGrad; CHAR.uSideTint.value.set(...L.sideTint);
    // ---- sky, fog, sun disc, clouds ----
    const su = this.skyMat.uniforms;
    K.sky.c.forEach((h, i) => untone(h, su["c" + i].value));
    const e = K.sky.e.map((deg) => THREE.MathUtils.degToRad(deg));
    su.e.value.set(e[1], e[2], e[3], e[4]);
    this.sky.position.copy(cam.position);
    untone(L.fog, this.fog.color); this.fog.near = L.fogNear; this.fog.far = L.fogFar;
    if (s.set === "mine") { this.fog.near = 30; this.fog.far = 140; }
    scene.fog = this.fog; scene.background = null;
    this.sunDisc.visible = s.light === "golden" && s.set === "lake";
    if (this.sunDisc.visible) { this.sunDisc.position.copy(cam.position).addScaledVector(sunDir, 900); this.sunDisc.scale.setScalar(2 * 900 * Math.tan(THREE.MathUtils.degToRad(1.7))); }
    for (let i = 0; i < this.clouds.length; i++) { const m = this.clouds[i]; m.lookAt(cam.position.x, m.position.y, cam.position.z); (m.material as THREE.MeshBasicMaterial).map = this.cloudMaps[s.light][i % 4]; }
    // ---- water ----
    const W = this.WU, wc = K.water, lv = level(tau);
    untone(wc.near, W.wNearC.value); untone(wc.mid, W.wMidC.value); untone(wc.far, W.wFarC.value);
    untone(wc.crest, W.wCrest.value); untone(wc.trough, W.wTrough.value);
    W.wShade.value.set(...wc.shade); W.wTime.value = t; W.wLevel.value = lv; W.wSwirl.value = swirl(tau); W.wDeepK.value = id >= 15 ? 1 : 0;
    this.water.visible = lv > -50 && s.set === "lake";
    const empty = crater(tau) > 0;
    const spin = swirl(tau) > 0.01;
    this.bedDisk.visible = !empty && !spin; this.craterM.visible = (empty || spin) && s.set === "lake";
    this.canalWater.visible = s.set !== "mine";
    // ---- things the whirlpool takes ----
    for (const w of this.swimmers) {
      const u = swU(w.sw, tau), gone = tau >= w.sw.tS || (tau >= 59 && w.o !== this.rig);
      w.o.visible = !gone && !(tau > 36 && tau < 59.6) && s.set !== "mine";
      if (!w.o.visible) continue;
      const [x, z, sink, spin] = spiral(w.p0, u);
      const isTree = this.trees.includes(w.o as THREE.Group);
      const fallK = isTree ? smooth((tau - (w.sw.tS - w.sw.dur - 0.5)) / 0.5) : 0;
      const ground = isTree || w.o === this.chunk ? (u > 0 ? Math.min(w.y0, level(tau) - funnel(tau, Math.hypot(x, z)) - 0.3) : w.y0) : level(tau) - funnel(tau, Math.hypot(x, z));
      w.o.position.set(x, (u > 0 ? ground : w.y0 + (isTree ? 0 : ground)) - sink, z);
      const bob = 0.04 * Math.sin(t * 1.6 + x);
      if (w.o === this.rig) w.o.rotation.set(0, spin * 0.5, rigTilt(tau) + 0.5 * u * u);
      else if (isTree) w.o.rotation.set(-1.4 * fallK, spin * 0.4, 0.3 * u);
      else w.o.rotation.set(bob + 0.4 * u * u, (w.o === this.tug ? 0.6 : w.o === this.chunk ? 0 : Math.PI / 2) + spin, 0.25 * u);
    }
    // pipe: turns while drilling (visible stripes via rotation), stops when stuck
    this.pipe.rotation.y = tau < 19.0 ? t * 6 : 19 * 6;
    // pop-up barges (shot 15): hidden below until their pop, then a springy rise
    this.popB.forEach((g, k) => {
      const dt = tau - POP[k];
      g.visible = s.set === "lake" && tau >= 59.6 && dt > -0.05;
      const rise = dt < 0 ? -5 : -5 * Math.exp(-dt * 3.2) * Math.cos(dt * 7) + 0.6 * Math.exp(-dt * 2) * Math.sin(dt * 10);
      g.position.y = Math.min(1.8, rise) + 0.04 * Math.sin(t * 1.5 + k);
      g.rotation.x = 0.35 * Math.exp(-dt * 2) * Math.sin(dt * 6 + k);
    });
    // fishing boat
    const bp = boatAt(tau, id), by = boatY(tau, id);
    this.boat.visible = s.set === "lake" && [3, 6, 7, 8, 15, 16].includes(id);
    this.boat.position.set(bp[0], by, bp[2]); this.boat.rotation.set(0.03 * Math.sin(t * 1.3), 0.4, (empty ? 0.12 : 0.04 * Math.sin(t * 1.1)));
    // ---- mine ----
    this.mine.visible = s.set === "mine";
    if (this.mine.visible) {
      const flooded = id === 10, rising = id === 13 ? MINE_Y + 0.05 + 1.0 * clamp01((tau - 51.3) / 3.8) : MINE_Y + 2.2;
      this.mineWater.visible = id === 10 || id === 13;
      this.mineWater.position.y = flooded ? MINE_Y + 2.2 : rising;
      const mm = (this.mineWater.material as THREE.MeshLambertMaterial);
      void mm;
      const drillIn = id === 11 ? smooth((tau - (POKE - 0.25)) / 0.25) : id === 13 ? 1 : 0;
      this.bit.visible = id === 11 || id === 13;
      this.bit.position.set(0, CEIL_Y + 0.9 - 2.1 * drillIn, 0);
      const hr = id === 11 ? (tau > POKE ? holeR(tau) : 0.01) : id === 13 ? holeR(tau) : 0;
      this.holeDisk.visible = hr > 0.02; this.holeDisk.scale.setScalar(Math.max(hr, 0.01));
      const jetOn = (id === 11 && tau > 46.3) || id === 13;
      this.jet.visible = jetOn; this.jet.scale.set(Math.max(0.05, hr * 0.9), 1, Math.max(0.05, hr * 0.9));
    }
    for (const tx of this.flowTex) tx.offset.y = -t * 1.6;
    // ---- canal stream + waterfall (shot 14) ----
    this.stream.visible = this.fall.visible = id === 14;
    // ---- tea ----
    this.tea.visible = s.set === "tea" || s.set === "lake";
    const drop = clamp01((tau - (SUGAR_IN - 0.45)) / 0.45), melt = clamp01((tau - SUGAR_IN) / 2.6);
    this.cube.visible = s.set === "tea" && melt < 0.98;
    this.cube.position.set(0.004, 0.32 - (0.32 - 0.085) * drop * drop, 0.002); this.cube.scale.setScalar(Math.max(0.05, 1 - melt));
    this.cube.rotation.set(drop * 2.2, drop * 1.3, 0);
    // ---- cast + effects ----
    const right = V(0, 0, 0).setFromMatrixColumn(cam.matrixWorld, 0);
    const st = stage(id, t, { pos: cam.position, right, sun: sunDir });
    if (s.set === "tea" && tau > SUGAR_IN - 0.05) addTeaFx(st, tau);
    if (id === 11 && tau > POKE && tau < POKE + 0.4) { const u = (tau - POKE) / 0.4; st.fx.push(burst(u, [0, CEIL_Y - 0.8, 0], 3)); }
    if ((id === 11 && tau > 46.3) || id === 13) for (let i = 0; i < 4; i++) { const u = (t * 1.6 + i / 4) % 1; st.fx.push(puff(u, [Math.cos(i * 1.7) * 1.4, (id === 13 ? this.mineWater.position.y : MINE_Y) + 0.5, Math.sin(i * 1.7) * 1.4], 2.4)); }
    if (id === 14) for (let i = 0; i < 5; i++) { const u = (t * 1.2 + i / 5) % 1; st.fx.push(puff(u, [RC - 4 + Math.cos(i) * 2, bedH(RC) - 36, CANAL_Z - 5 + i * 2.5], 6)); }
    this.frustum.setFromProjectionMatrix(this.m4.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse));
    let ai = 0;
    const used: Actor[] = [];
    for (const p of st.places) {
      const sc2 = p.scale ?? 1;
      if (!this.frustum.intersectsSphere(this.sph.set(this.v.set(p.x, p.y + 1.1 * sc2, p.z), 3.5))) continue;
      const a = this.actor(ai++);
      const [w, h, k] = p.size ?? [300, 500, 0.5];
      a.r = this.pool.req(p.key, w, h, k, p.draw);
      a.mesh.visible = true; a.mesh.position.set(p.x, p.y, p.z);
      a.mesh.rotation.set(0, p.yaw ?? Math.atan2(cam.position.x - p.x, cam.position.z - p.z), p.roll ?? 0);
      a.mesh.scale.set(p.mirror ? -sc2 : sc2, sc2, sc2);
      a.mesh.castShadow = L.actorShadow;
      used.push(a);
    }
    for (let i = ai; i < this.actors.length; i++) this.actors[i].mesh.visible = false;
    let fi = 0;
    const fused: Fx[] = [];
    for (const p of st.fx) {
      if (!this.frustum.intersectsSphere(this.sph.set(this.v.set(p.x, p.y, p.z), Math.max(p.w, p.h)))) continue;
      const e2 = this.fx(fi++);
      e2.r = this.pool.req(p.key, p.cw, p.ch, 1, p.draw);
      e2.use(!!p.soft); e2.mesh.visible = true; e2.mesh.position.set(p.x, p.y, p.z);
      if (p.flat) e2.mesh.rotation.set(-Math.PI / 2, 0, p.rot ?? 0);
      else { e2.mesh.quaternion.copy(cam.quaternion); e2.mesh.rotateZ(p.rot ?? 0); }
      e2.mesh.scale.set(p.w, p.h, 1);
      fused.push(e2);
    }
    for (let i = fi; i < this.fxs.length; i++) this.fxs[i].mesh.visible = false;
    this.pool.flush();
    for (const a of used) a.bind();
    for (const e3 of fused) e3.bind();
    return focus;
  }
}

// ---------------- effect cards used by world.ts ----------------
import { fxBurst, fxPuff, fxRing, Pen } from "./toon";
const qq = (v: number, n = 30) => Math.round(v * n) / n;
const burst = (u: number, at: V3, s: number) => ({ key: `burst${qq(u)}`, cw: 500, ch: 500, draw: (p: Pen) => fxBurst(p, qq(u)), x: at[0], y: at[1], z: at[2], w: s, h: s });
const puff = (u: number, at: V3, s: number) => ({ key: `puff${qq(u)}`, cw: 300, ch: 300, draw: (p: Pen) => fxPuff(p, qq(u)), x: at[0], y: at[1] + u * s * 0.3, z: at[2], w: s * (0.6 + 0.6 * u), h: s * (0.6 + 0.6 * u), soft: true });
const addTeaFx = (st: { fx: { key: string; cw: number; ch: number; draw: (p: Pen) => void; x: number; y: number; z: number; w: number; h: number; flat?: boolean; soft?: boolean }[] }, tau: number) => {
  const y = TEA[1] + 0.78 + 0.087;
  for (let i = 0; i < 3; i++) {
    const u = qq(((tau - SUGAR_IN) * 0.8 + i / 3) % 1);
    st.fx.push({ key: `ring${u}`, cw: 600, ch: 600, draw: (p) => fxRing(p, u), x: TEA[0], y, z: TEA[2], w: 0.09, h: 0.09, flat: true });
  }
  if (tau < SUGAR_IN + 0.35) { const u = (tau - SUGAR_IN) / 0.35; st.fx.push({ key: `puff${qq(u)}`, cw: 300, ch: 300, draw: (p) => fxPuff(p, qq(u)), x: TEA[0], y: y + 0.02, z: TEA[2] - 0.01, w: 0.06, h: 0.06 }); }
};

const WATER_DECL = `#include <common>
varying vec3 vWP;
uniform vec3 wNearC, wMidC, wFarC, wCrest, wTrough, wDeep, wShade;
uniform float wTime, wSwirl, wDeepK;`;
const WATER_COL = `
  vec3 wV = vWP - cameraPosition;
  float wd = length(wV);
  float wDep = asin(clamp(-wV.y / wd, 0.0, 1.0));
  float wf = 1.0 - smoothstep(0.0, 0.42, wDep);
  vec3 wc = mix(mix(wNearC, wMidC, smoothstep(0.0, 0.55, wf)), wFarC, smoothstep(0.55, 1.0, wf));
  float r = length(vWP.xz) + 0.001;
  float th = atan(vWP.z, vWP.x);
  // calm ripples: two drifting sine fields
  float rip = sin(vWP.x * 0.55 + wTime * 0.9) * sin(vWP.z * 0.47 - wTime * 0.7);
  wc = mix(wc, wCrest, smoothstep(0.82, 0.98, rip) * 0.5 * (1.0 - wSwirl));
  // whirlpool: log-spiral foam bands, stronger toward the centre, dark throat
  float ph = th * 3.0 + log(r) * 7.0 - wTime * 5.0;
  float band = smoothstep(0.25, 0.75, sin(ph)) * wSwirl * exp(-r / 70.0);
  float band2 = smoothstep(0.85, 0.98, sin(ph * 0.5 + 1.3)) * wSwirl * exp(-r / 50.0);
  wc = mix(wc, wTrough, wSwirl * 0.75 * exp(-r / 40.0));
  wc = mix(wc, wCrest, band * 0.85);
  wc = mix(wc, vec3(1.0), band2 * 0.9);
  wc = mix(wc, wDeep, wSwirl * exp(-pow(r / 9.0, 2.0)));
  // the new deep middle after the refill
  wc = mix(wc, wDeep, wDeepK * 0.8 * (1.0 - smoothstep(24.0, 60.0, r)));
  diffuseColor.rgb = wc;`;
