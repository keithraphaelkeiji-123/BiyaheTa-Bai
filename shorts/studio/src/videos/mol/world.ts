// "The Sweetest Disaster" as one three.js scene: sky, the harbour, Commercial Street (cobbles, brick rowhouses, gas
// lamps, snow on the cornices), the molasses tank (paint goes from steel to brown, the wall panels burst outward),
// the ladder and the tiny test bucket, the wooden shed, the elevated railway that bends, the wave and the goo it
// leaves, and two small interiors far from town (the viscosity table, the courtroom). update(id, f, camera) is a pure
// function of id + f.
import * as THREE from "three";
import { Batch, boxGeo, V, lam, quad, Kit } from "./build";
import { ctex, cloudHD, cobbleHD, planksHD, rng, facadeHD } from "./paint";
import { LIGHTS, LOOK, LightPreset, LName } from "./lights";
import { TONE, CHAR, LFB, untone, twoTone } from "./shade";
import { NOINK } from "./ink";
import { CARD_K } from "./cardshade";
import { Pool, Actor, Fx, stage } from "./cast";
import {
  FPS, SHOTS, STREET_W, TANK, TANK_R, TANK_H, RAIL_X, RAIL_Y, SHED, LAB, COURT, LADDER, BURST, PAINT0, PAINT1, SHOVE, BEND, GOO,
  waveX, waveH, cold, camAt, ShotDef, clamp01, smooth,
} from "./story";

export const loadKit = () => Promise.resolve({} as Kit);

const col = (c: string) => lam("c" + c, () => ({ color: c }));
const mesh = (g: THREE.BufferGeometry, m: THREE.Material, parent: THREE.Object3D, cast = true) => {
  const o = new THREE.Mesh(g, m); o.castShadow = cast; o.receiveShadow = true; parent.add(o); return o;
};
const bx = (b: Batch, m: THREE.Material, x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, tile = 0) => b.add(boxGeo(V(x0, y0, z0), V(x1, y1, z1), tile), m);
const glowM = (r: number, g: number, b: number) => new THREE.MeshBasicMaterial({ color: new THREE.Color(r, g, b), fog: false });
const walkTex = () => ctex("bostonWalk", 512, 512, (g, r) => {
  g.fillStyle = "#b9ad9c"; g.fillRect(0, 0, 512, 512);
  for (let j = 0; j < 8; j++) for (let i = 0; i < 4; i++) { g.fillStyle = `rgba(${90 + r() * 30},${70 + r() * 20},60,${0.06 + r() * 0.08})`; g.fillRect(i * 128 + 3, j * 64 + 3, 122, 58); }
  g.strokeStyle = "rgba(70,55,45,0.35)"; g.lineWidth = 3; for (let k = 0; k <= 512; k += 128) { g.beginPath(); g.moveTo(k, 0); g.lineTo(k, 512); g.stroke(); } for (let k = 0; k <= 512; k += 64) { g.beginPath(); g.moveTo(0, k); g.lineTo(512, k); g.stroke(); }
});
const plateTex = () => ctex("tankPlates", 1024, 512, (g) => {
  g.fillStyle = "#ffffff"; g.fillRect(0, 0, 1024, 512);
  for (let y = 0; y < 512; y += 64) {
    g.fillStyle = "rgba(0,0,0,0.18)"; g.fillRect(0, y, 1024, 4); g.fillStyle = "rgba(255,255,255,0.4)"; g.fillRect(0, y + 4, 1024, 3);
    for (let x = 0; x < 1024; x += 16) { g.fillStyle = "rgba(0,0,0,0.3)"; g.beginPath(); g.arc(x + 8, y + 10, 2.6, 0, 7); g.fill(); }
    const off = (y / 64) % 2 ? 0 : 64;
    for (let x = off; x < 1024; x += 128) { g.fillStyle = "rgba(0,0,0,0.15)"; g.fillRect(x, y, 3, 64); }
  }
});
const gooTex = () => ctex("goo", 512, 512, (g, r) => {
  g.fillStyle = "#ffffff"; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 60; i++) { g.strokeStyle = `rgba(255,236,200,${0.2 + r() * 0.3})`; g.lineWidth = 2 + r() * 5; g.beginPath(); const x = r() * 512, y = r() * 512; g.ellipse(x, y, 20 + r() * 60, 6 + r() * 14, r() * 3, 0, 4); g.stroke(); }
  for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(60,30,10,${0.15 + r() * 0.2})`; g.beginPath(); g.ellipse(r() * 512, r() * 512, 10 + r() * 40, 5 + r() * 15, r() * 3, 0, 7); g.fill(); }
});
const panelTex = (key: string, base: string) => ctex(key, 512, 512, (g, r) => {
  g.fillStyle = base; g.fillRect(0, 0, 512, 512);
  for (let x = 0; x < 512; x += 64) { g.fillStyle = "rgba(0,0,0,0.18)"; g.fillRect(x, 0, 4, 512); g.fillStyle = "rgba(255,255,255,0.08)"; g.fillRect(x + 8, 0, 6, 512); }
  for (let i = 0; i < 40; i++) { g.fillStyle = "rgba(40,20,10,0.06)"; g.fillRect(r() * 512, r() * 512, 2, 40 + r() * 80); }
});
const discTex = () => ctex("sunDisc2", 128, 128, (g) => {
  const gr = g.createRadialGradient(64, 64, 52, 64, 64, 64); gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
});
const STEEL = new THREE.Color("#8d98a6"), BROWN = new THREE.Color("#6e3d1e");

export class World {
  root = new THREE.Group();
  private pool = new Pool();
  private actors: Actor[] = [];
  private fxs: Fx[] = [];
  private hemi: THREE.HemisphereLight; private sun: THREE.DirectionalLight;
  private sky: THREE.Mesh; private skyMat: THREE.ShaderMaterial;
  private fog = new THREE.Fog("#bccbec", 25, 420);
  private disc: THREE.Sprite;
  private sunCache = new Map<number, THREE.Vector3>();
  private cloudMaps: Record<LName, THREE.Texture[]>;
  private clouds: THREE.Mesh[] = [];
  private WU: Record<string, THREE.IUniform>;
  private street = new THREE.Group(); private lab = new THREE.Group(); private court = new THREE.Group();
  private tankWhole: THREE.Mesh; private tankPanels: THREE.Mesh[] = []; private tankM: THREE.MeshLambertMaterial; private tankTop: THREE.Mesh;
  private ladder = new THREE.Group(); private bucket: THREE.Mesh; private snow: THREE.Mesh[] = [];
  private shed = new THREE.Group(); private railL = new THREE.Group(); private railR = new THREE.Group(); private train = new THREE.Group();
  private wave: THREE.Mesh; private wavePos: THREE.BufferAttribute; private waveUV: Float32Array; private goo: THREE.Mesh; private gooM: THREE.MeshPhongMaterial;
  private lamps: THREE.Mesh[] = []; private wreck = new THREE.Group();
  private spoon = new THREE.Group(); private thermo: THREE.Mesh; private labLamp: THREE.Mesh; private trough: THREE.Mesh;
  private frustum = new THREE.Frustum();
  private m4 = new THREE.Matrix4(); private v = new THREE.Vector3(); private sph = new THREE.Sphere();

  constructor(_kit: Kit, shadowSize = 4096) {
    const R = this.root;
    // ---- sky + light ----
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
    this.disc = new THREE.Sprite(new THREE.SpriteMaterial({ map: discTex(), color: new THREE.Color(6.0, 4.4, 2.4), fog: false, depthWrite: false }));
    this.disc.frustumCulled = false; this.disc.layers.set(NOINK); R.add(this.disc);
    this.hemi = new THREE.HemisphereLight("#cfe6ff", "#6c5c8c", 1.1);
    this.sun = new THREE.DirectionalLight("#fff0d6", 2.6); this.sun.castShadow = true; this.sun.shadow.mapSize.set(shadowSize, shadowSize);
    R.add(this.hemi, this.sun, this.sun.target);
    const pal = (k: LName) => LOOK[k].cloud;
    this.cloudMaps = { day: [0, 1, 2, 3].map((k) => cloudHD(k, pal("day"))), golden: [0, 1, 2, 3].map((k) => cloudHD(k, pal("golden"))), night: [0, 1, 2, 3].map((k) => cloudHD(k, pal("night"))), lamp: [0, 1, 2, 3].map((k) => cloudHD(k, pal("night"))) };
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2 + 0.3, d = 620 + (i % 3) * 60, w = 130 + (i % 4) * 30;
      const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: this.cloudMaps.day[i % 4], color: new THREE.Color(1.1, 1.1, 1.1), transparent: true, depthWrite: false, fog: false }));
      m.position.set(Math.cos(a) * d, 90 + (i % 4) * 34, Math.sin(a) * d); m.scale.set(w, w / 2, 1); m.layers.set(NOINK);
      this.clouds.push(m); R.add(m);
    }
    // ---- harbour water (west of the tank yard) ----
    this.WU = { wNearC: { value: new THREE.Color() }, wMidC: { value: new THREE.Color() }, wFarC: { value: new THREE.Color() }, wCrest: { value: new THREE.Color() }, wTrough: { value: new THREE.Color() }, wShade: { value: new THREE.Vector3(0.5, 0.56, 0.72) }, wTime: { value: 0 } };
    const waterM = new THREE.MeshLambertMaterial({ color: 0xffffff });
    waterM.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, this.WU);
      sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nvarying vec3 vWP;").replace("#include <project_vertex>", "#include <project_vertex>\nvWP = (modelMatrix * vec4(transformed, 1.0)).xyz;");
      sh.fragmentShader = sh.fragmentShader.replace("#include <common>", SEA_DECL).replace("#include <map_fragment>", SEA_COL)
        .replace("#include <lights_fragment_begin>", "float sunVis = 1.0;\n" + LFB)
        .replace("#include <lights_fragment_end>", "#include <lights_fragment_end>\n  reflectedLight.directDiffuse = diffuseColor.rgb * mix(wShade, vec3(1.0), sunVis);\n  reflectedLight.indirectDiffuse = vec3(0.0);");
    };
    waterM.customProgramCacheKey = () => "harbour1";
    const wg = new THREE.PlaneGeometry(1400, 2000); wg.rotateX(-Math.PI / 2); wg.translate(-62 - 700, -1.6, 0);
    const sea = new THREE.Mesh(wg, waterM); sea.receiveShadow = true; this.street.add(sea);

    // ---- the street ----
    const S = this.street, sb = new Batch();
    const cob = cobbleHD(); cob.wrapS = cob.wrapT = THREE.RepeatWrapping;
    const cobM = lam("cobbleHD", () => ({ map: cob }));
    sb.add(quad(V(-62, 0, STREET_W - 1.6), V(200, 0, STREET_W - 1.6), V(200, 0, -STREET_W + 1.6), V(-62, 0, -STREET_W + 1.6), 66, 3), cobM);
    const walk = lam("bostonWalk", () => ({ map: walkTex() }));
    for (const s of [-1, 1]) bx(sb, walk, -62, 0, s > 0 ? STREET_W - 1.6 : -STREET_W - 0.1, 200, 0.12, s > 0 ? STREET_W + 0.1 : -STREET_W + 1.6, 2);
    const yard = lam("yardDirt", () => ({ color: "#9a8a72" }));
    bx(sb, yard, -62, -0.02, -60, -26, 0.0, 60, 0); // the tank yard
    bx(sb, lam("quay", () => ({ color: "#8f8a80" })), -64, -2.5, -60, -62, 0.05, 60);
    bx(sb, col("#a89a84"), -26, -0.02, -60, 200, 0.0, -STREET_W - 0.1); bx(sb, col("#a89a84"), -26, -0.02, STREET_W + 0.1, 200, 0.0, 60);
    // brick rowhouses both sides (fronts at +-STREET_W), with a gap for the shed on the south side
    const BRICKS = ["#b5533f", "#a84a3a", "#c06a4a", "#9a4436", "#b86048"];
    let k = 0;
    for (const side of [-1, 1]) for (let x = -24; x < 110; k++) {
      const w = 7.5 + (k % 3) * 1.5, ht = 9.5 + (k % 4) * 2.8, d = 12;
      if (side < 0 && x < SHED[0] + 5 && x + w > SHED[0] - 5) { x = SHED[0] + 5.5; continue; }
      if (x + w > RAIL_X - 3 && x < RAIL_X + 3) { x = RAIL_X + 3; continue; }
      const front = lam(`bf${k}`, () => ({ map: facadeHD(`bf${k}`, w, ht, { wall: BRICKS[k % 5], shutter: ["#2f4f3f", "#3f3f5a", "#5a3a2a"][k % 3], door: true, brick: true }) }));
      const sideM = col(BRICKS[k % 5]);
      const z0 = side * STREET_W, z1 = side * (STREET_W + d), x0 = x, x1 = x + w;
      if (side > 0) sb.add(quad(V(x1, 0, z0), V(x0, 0, z0), V(x0, ht, z0), V(x1, ht, z0)), front);
      else sb.add(quad(V(x0, 0, z0), V(x1, 0, z0), V(x1, ht, z0), V(x0, ht, z0)), front);
      bx(sb, sideM, x0, 0, Math.min(z0, z1) + (side > 0 ? 0.01 : 0), x1, ht, Math.max(z0, z1) - (side < 0 ? 0.01 : 0));
      bx(sb, col("#e9dcc4"), x0 - 0.1, ht, Math.min(z0, z1) - 0.25, x1 + 0.1, ht + 0.45, Math.max(z0, z1) + 0.25); // cornice
      const sn = mesh(boxGeo(V(x0, ht + 0.45, Math.min(z0, z1) - 0.2), V(x1, ht + 0.6, Math.max(z0, z1) + 0.2)), col("#f4f6fa"), S, false); this.snow.push(sn);
      x += w + 0.02;
    }
    // gas lamps
    const lampPost = col("#2f3540");
    for (let x = -18; x < 100; x += 13) for (const s of [-1, 1]) {
      const z = s * (STREET_W - 0.9);
      bx(sb, lampPost, x - 0.07, 0.1, z - 0.07, x + 0.07, 3.6, z + 0.07);
      bx(sb, lampPost, x - 0.22, 3.6, z - 0.22, x + 0.22, 3.68, z + 0.22);
      const b = new THREE.Mesh(new THREE.SphereGeometry(0.17, 10, 8), glowM(4, 2.6, 1.1)); b.position.set(x, 3.85, z); b.layers.set(NOINK); S.add(b); this.lamps.push(b);
    }
    // the elevated railway across the street: columns, then two girder halves that can buckle about their columns
    const iron = twoTone(new THREE.MeshPhongMaterial({ color: "#3e4a55", specular: "#7a8590", shininess: 30 }), 0.12);
    for (const s of [-1, 1]) for (const zc of [s * (STREET_W - 0.4), s * 30]) bx(sb, iron, RAIL_X - 0.35, 0, zc - 0.35, RAIL_X + 0.35, RAIL_Y, zc + 0.35);
    const half = (g: THREE.Group, s: number) => {
      const gb = new Batch(), L = STREET_W - 0.4;
      bx(gb, iron, -1.4, -0.9, 0, 1.4, 0, -s * L); bx(gb, iron, -1.5, 0, 0, 1.5, 0.18, -s * L);
      for (let zz = 0.6; zz < L; zz += 1.2) gb.add(new THREE.BoxGeometry(0.1, 0.9, 1.4).rotateX(0.6 * s).translate(1.38, -0.45, -s * zz), iron);
      for (const r of [-0.72, 0.72]) bx(gb, col("#6a5a4a"), r - 0.08, 0.18, 0, r + 0.08, 0.32, -s * L);
      gb.build(g); g.position.set(RAIL_X, RAIL_Y, s * (STREET_W - 0.4)); S.add(g);
    };
    half(this.railL, 1); half(this.railR, -1);
    for (const s of [-1, 1]) { const gb = new Batch(); bx(gb, iron, RAIL_X - 1.4, RAIL_Y - 0.9, s * (STREET_W - 0.4), RAIL_X + 1.4, RAIL_Y, s * 60); bx(gb, iron, RAIL_X - 1.5, RAIL_Y, s * (STREET_W - 0.4), RAIL_X + 1.5, RAIL_Y + 0.18, s * 60); gb.build(S); }
    // a train car parked on the far span
    const tb = new Batch();
    bx(tb, col("#2f6a4a"), -1.3, 0.3, -6, 1.3, 2.9, 6, 2); bx(tb, col("#e9dcc4"), -1.35, 1.6, -5.8, 1.35, 2.3, 5.8); bx(tb, col("#3a3d47"), -1.45, 2.9, -6.2, 1.45, 3.2, 6.2);
    tb.build(this.train); this.train.position.set(RAIL_X, RAIL_Y + 0.18, 17); S.add(this.train);
    // the shed (wood) in its gap
    const sh = new Batch(), plank = lam("shedPlanks", () => ({ map: panelTex("shedTex", "#a8784a") }));
    bx(sh, plank, -3, 0, -2.5, 3, 3.4, 2.5, 2); bx(sh, col("#5a3a2a"), -3.3, 3.4, -2.8, 3.3, 3.7, 2.8);
    bx(sh, col("#4a2e1e"), -0.6, 0, 2.5, 0.6, 2.1, 2.56);
    sh.build(this.shed); this.shed.position.set(...SHED); S.add(this.shed);
    // the tank: whole (before) and 24 wall panels (after the burst), a roof cone; a fence around the yard
    this.tankM = twoTone(new THREE.MeshLambertMaterial({ color: STEEL.clone(), map: plateTex() })) as THREE.MeshLambertMaterial;
    if (this.tankM.map) { this.tankM.map.wrapS = this.tankM.map.wrapT = THREE.RepeatWrapping; this.tankM.map.repeat.set(6, 2); }
    const [TX, , TZ] = TANK;
    this.tankWhole = mesh(new THREE.CylinderGeometry(TANK_R, TANK_R, TANK_H, 64, 1, true).translate(0, TANK_H / 2, 0), this.tankM, S); this.tankWhole.position.set(TX, 0, TZ);
    this.tankTop = mesh(new THREE.ConeGeometry(TANK_R + 0.2, 2.2, 64).translate(0, TANK_H + 1.1, 0), this.tankM, S); this.tankTop.position.set(TX, 0, TZ);
    const NP = 24;
    for (let i = 0; i < NP; i++) {
      const a0 = (i / NP) * Math.PI * 2, da = (Math.PI * 2) / NP;
      const g = new THREE.CylinderGeometry(TANK_R, TANK_R, TANK_H, 4, 1, true, a0, da);
      const am = a0 + da / 2, px = TANK_R * Math.sin(am), pz = TANK_R * Math.cos(am);
      g.translate(-px, TANK_H / 2, -pz); // pivot at the panel's foot
      const p = mesh(g, this.tankM, S); p.position.set(TX + px, 0, TZ + pz); p.rotation.order = "YXZ"; p.userData = { am };
      this.tankPanels.push(p);
    }
    // molasses left in the broken tank
    mesh(new THREE.CylinderGeometry(TANK_R - 0.2, TANK_R - 0.2, 0.8, 48).translate(TX, 0.4, TZ), col("#4a2410"), this.wreck, false);
    S.add(this.wreck);
    // ladder + tiny bucket
    const lb = new Batch();
    for (const s of [-1, 1]) bx(lb, col("#a8724a"), -0.06, 0, s * 0.3 - 0.04, 0.06, 6.2, s * 0.3 + 0.04);
    for (let y = 0.35; y < 6.2; y += 0.38) bx(lb, col("#a8724a"), -0.04, y, -0.3, 0.04, y + 0.05, 0.3);
    lb.build(this.ladder); this.ladder.position.set(LADDER[0] + 0.2, 0, LADDER[2]); this.ladder.rotation.z = 0.12; S.add(this.ladder);
    this.bucket = mesh(new THREE.CylinderGeometry(0.09, 0.07, 0.12, 14).translate(TX + TANK_R + 1.0, 0.06, TZ + 0.9), col("#8d949c"), S);
    mesh(new THREE.CircleGeometry(0.085, 14).rotateX(-Math.PI / 2).translate(TX + TANK_R + 1.0, 0.115, TZ + 0.9), col("#6ab0e0"), this.bucket, false);
    // the wave: a grid in the street corridor, its x-span and height profile set every frame
    const WN = 60, WZ = 12, wvg = new THREE.PlaneGeometry(1, 1, WN, WZ); wvg.rotateX(-Math.PI / 2);
    this.wavePos = wvg.attributes.position as THREE.BufferAttribute;
    this.waveUV = Float32Array.from({ length: this.wavePos.count * 2 }, (_, i) => (i % 2 ? this.wavePos.getZ(i >> 1) : this.wavePos.getX(i >> 1)) + 0.5);
    this.gooM = twoTone(new THREE.MeshPhongMaterial({ color: "#5c2c10", specular: "#ffcf9a", shininess: 70, map: gooTex() }), 0.2) as THREE.MeshPhongMaterial;
    if (this.gooM.map) { this.gooM.map.wrapS = this.gooM.map.wrapT = THREE.RepeatWrapping; this.gooM.map.repeat.set(4, 1); }
    this.wave = new THREE.Mesh(wvg, this.gooM); this.wave.castShadow = true; this.wave.receiveShadow = true; this.wave.frustumCulled = false; S.add(this.wave);
    const gg = new THREE.PlaneGeometry(1, 1); gg.rotateX(-Math.PI / 2);
    this.goo = new THREE.Mesh(gg, this.gooM); this.goo.receiveShadow = true; S.add(this.goo);
    sb.build(S);
    R.add(S);

    // ---- the viscosity table (dark room, one amber lamp) ----
    const Lg = this.lab, lbch = new Batch();
    const darkWall = lam("labWall", () => ({ map: panelTex("labWallTex", "#3a3440") }));
    bx(lbch, lam("labFloor", () => ({ map: planksHD() })), -6, -0.2, -5, 6, 0, 5, 2);
    bx(lbch, darkWall, -6, 0, 3.0, 6, 4, 3.2, 3); bx(lbch, darkWall, -6.2, 0, -5, -6, 4, 3.2, 3);
    bx(lbch, col("#7a4a2a"), -0.9, 0.82, -0.5, 0.9, 0.9, 0.5); for (const [a, b] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) bx(lbch, col("#5a3a2a"), a * 0.82 - 0.05, 0, b * 0.42 - 0.05, a * 0.82 + 0.05, 0.82, b * 0.42 + 0.05);
    // the jar of molasses and the thermometer stand
    lbch.add(new THREE.CylinderGeometry(0.17, 0.17, 0.26, 28).translate(0.25, 1.03, 0), col("#4a2410"));
    lbch.add(new THREE.TorusGeometry(0.175, 0.012, 6, 28).rotateX(Math.PI / 2).translate(0.25, 1.2, 0), col("#cfe6f6"));
    lbch.add(new THREE.CylinderGeometry(0.03, 0.04, 0.6, 10).translate(-0.35, 1.2, 0.05), col("#e9ecef"));
    lbch.add(new THREE.SphereGeometry(0.05, 12, 8).translate(-0.35, 0.93, 0.05), col("#d2453c"));
    // the wading trough
    bx(lbch, col("#5a4a3a"), -4.2, 0, -0.2, -0.9, 0.7, 0.0); bx(lbch, col("#5a4a3a"), -4.2, 0, 1.8, -0.9, 0.7, 2.0); bx(lbch, col("#5a4a3a"), -4.4, 0, -0.2, -4.2, 0.7, 2.0); bx(lbch, col("#5a4a3a"), -0.9, 0, -0.2, -0.7, 0.7, 2.0);
    lbch.build(Lg);
    this.trough = mesh(new THREE.BoxGeometry(3.3, 0.04, 1.8).translate(-2.55, 0.62, 0.9), this.gooM, Lg, false);
    const gl = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.19, 0.32, 28, 1, true).translate(0.25, 1.06, 0), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.75, 0.85, 0.95), transparent: true, opacity: 0.12, depthWrite: false }));
    gl.layers.set(NOINK); Lg.add(gl);
    this.thermo = mesh(new THREE.CylinderGeometry(0.014, 0.014, 1, 8).translate(0, 0.5, 0), glowM(2.4, 0.3, 0.2), Lg, false); this.thermo.position.set(-0.35, 0.95, 0.08); this.thermo.layers.set(NOINK);
    const sp = new Batch(); sp.add(new THREE.BoxGeometry(0.03, 0.42, 0.012).translate(0, 0.21, 0), col("#c9ced4")); sp.add(new THREE.SphereGeometry(0.045, 12, 8).scale(1, 0.5, 1.4).translate(0, 0, 0), col("#c9ced4")); sp.build(this.spoon);
    this.spoon.position.set(0.25, 1.13, 0); Lg.add(this.spoon);
    this.labLamp = new THREE.Mesh(new THREE.SphereGeometry(0.14, 12, 8), glowM(5, 2.8, 0.9)); this.labLamp.position.set(0.0, 2.3, 0.2); this.labLamp.layers.set(NOINK); Lg.add(this.labLamp);
    mesh(new THREE.ConeGeometry(0.4, 0.3, 20, 1, true).translate(0, 2.45, 0.2), lam("labShade", () => ({ color: "#2f3540", side: THREE.DoubleSide })), Lg, false);
    Lg.position.set(...LAB); R.add(Lg);

    // ---- the courtroom ----
    const Cg = this.court, cb = new Batch();
    const panel = lam("courtWall", () => ({ map: panelTex("courtWallTex", "#7a4a2a") }));
    bx(cb, lam("courtFloor", () => ({ map: planksHD() })), -6, -0.2, -4, 6, 0, 5, 2);
    bx(cb, panel, -6, 0, 3.6, 6, 4.5, 3.8, 3); bx(cb, panel, -6.2, 0, -4, -6, 4.5, 3.8, 3); bx(cb, panel, 6, 0, -4, 6.2, 4.5, 3.8, 3);
    bx(cb, col("#5a3420"), 0.2, 0, 2.2, 3.0, 1.35, 3.0); bx(cb, col("#4a2a18"), 0.1, 1.35, 2.1, 3.1, 1.45, 3.1); // judge's bench
    bx(cb, col("#5a3420"), -3.4, 0, 0.6, -0.6, 0.95, 0.75); // the stand rail
    for (let i = 0; i < 3; i++) bx(cb, col("#6a4028"), -4.5 + i * 1.6, 0, -2.6, -3.3 + i * 1.6, 0.9, -2.2);
    cb.build(Cg);
    const seal = ctex("courtSeal", 256, 256, (g) => { g.fillStyle = "#e8c45a"; g.beginPath(); g.arc(128, 128, 118, 0, 7); g.fill(); g.strokeStyle = "#7a5a1a"; g.lineWidth = 10; g.stroke(); g.beginPath(); g.arc(128, 128, 80, 0, 7); g.stroke(); g.fillStyle = "#7a5a1a"; g.beginPath(); g.moveTo(128, 70); g.lineTo(150, 128); g.lineTo(128, 186); g.lineTo(106, 128); g.closePath(); g.fill(); });
    const sg = new THREE.CircleGeometry(0.6, 32); sg.rotateY(Math.PI); sg.translate(1.6, 3.2, 3.58); mesh(sg, lam("courtSeal", () => ({ map: seal })), Cg, false);
    Cg.position.set(...COURT); R.add(Cg);
  }

  private shotSun(id: number, s: ShotDef, L: LightPreset) {
    let v = this.sunCache.get(id);
    if (v) return v;
    let fx = 0, fz = 0;
    for (let f = s.a; f < s.b; f += 3) { const c = camAt(id, f), x = c.look[0] - c.pos[0], z = c.look[2] - c.pos[2], n = Math.hypot(x, z) || 1; fx += x / n; fz += z / n; }
    const n = Math.hypot(fx, fz) || 1; fx /= n; fz /= n;
    const az = THREE.MathUtils.degToRad(s.sunAz ?? L.az), el = THREE.MathUtils.degToRad(s.sunEl ?? L.el);
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
    const night = s.light === "night" || s.light === "lamp";
    // ---- light ----
    const sunDir = this.shotSun(id, s, L);
    this.hemi.color.set(L.sky); this.hemi.groundColor.set(L.ground); this.hemi.intensity = L.hemiI;
    this.sun.color.set(L.sunCol); this.sun.intensity = L.sunI;
    let Rr = THREE.MathUtils.clamp(dist * 1.15 + 9, 8, 90);
    if (s.set !== "street") Rr = 8;
    this.sun.position.copy(focus).addScaledVector(sunDir, 300); this.sun.target.position.copy(focus);
    const sc = this.sun.shadow.camera;
    sc.left = -Rr; sc.right = Rr; sc.top = Rr; sc.bottom = -Rr; sc.near = 20; sc.far = 600; sc.updateProjectionMatrix();
    this.sun.shadow.bias = L.bias; this.sun.shadow.normalBias = L.normalBias * (Rr / 12);
    TONE.uLitCol.value.set(...L.lit); TONE.uShadeCol.value.set(...L.shade); TONE.uShadeLift.value.set(...L.lift);
    TONE.uLambert.value = L.lambert; TONE.uSideK.value = L.sideK; TONE.uTerm.value = L.term; TONE.uBounce.value.set(...K.bounce); TONE.uSat.value = K.sat;
    CHAR.uCharTint.value.set(...L.charTint); CHAR.uCharShade.value = L.charShade; CHAR.uGrad.value = L.charGrad;
    CHAR.uBodyGrad.value = L.bodyGrad; CHAR.uSideTint.value.set(...L.sideTint);
    CARD_K.uGain.value = s.light === "night" ? 0.85 : s.light === "lamp" ? 0.97 : 1.03;
    // ---- sky ----
    const su = this.skyMat.uniforms;
    K.sky.c.forEach((hx, i) => untone(hx, su["c" + i].value));
    const e = K.sky.e.map((deg) => THREE.MathUtils.degToRad(deg));
    su.e.value.set(e[1], e[2], e[3], e[4]);
    this.sky.position.copy(cam.position);
    untone(L.fog, this.fog.color); this.fog.near = L.fogNear; this.fog.far = L.fogFar;
    if (s.set === "lab") { this.fog.near = 2; this.fog.far = 16; this.fog.color.setRGB(0.05, 0.045, 0.06); }
    if (s.set === "court") { this.fog.near = 30; this.fog.far = 200; }
    scene.fog = this.fog; scene.background = null;
    const dm = this.disc.material as THREE.SpriteMaterial;
    this.disc.visible = s.set === "street" && (s.light === "golden" || s.light === "night");
    if (this.disc.visible) {
      const dir = s.light === "golden" ? V(-1, 0.08, -0.15).normalize() : V(-0.6, 0.45, 0.5).normalize();
      if (s.light === "golden") dm.color.setRGB(6.0, 4.4, 2.4); else dm.color.setRGB(3.0, 3.2, 3.6);
      this.disc.position.copy(cam.position).addScaledVector(dir, 900); this.disc.scale.setScalar(2 * 900 * Math.tan(THREE.MathUtils.degToRad(1.6)));
    }
    for (let i = 0; i < this.clouds.length; i++) { const m = this.clouds[i]; m.visible = s.set === "street"; m.lookAt(cam.position.x, m.position.y, cam.position.z); (m.material as THREE.MeshBasicMaterial).map = this.cloudMaps[s.light][i % 4]; }
    const W = this.WU, wc = K.water;
    untone(wc.near, W.wNearC.value); untone(wc.mid, W.wMidC.value); untone(wc.far, W.wFarC.value); untone(wc.crest, W.wCrest.value); untone(wc.trough, W.wTrough.value);
    W.wShade.value.set(...wc.shade); W.wTime.value = t;
    // ---- sets ----
    this.street.visible = s.set === "street"; this.lab.visible = s.set === "lab"; this.court.visible = s.set === "court";
    for (const m of this.lamps) m.visible = night;
    for (const sn of this.snow) sn.visible = !s.summer;
    // ---- the tank ----
    const paint = clamp01((tau - PAINT0) / (PAINT1 - PAINT0));
    const burst = tau >= BURST && !s.summer;
    this.tankM.color.copy(STEEL).lerp(BROWN, tau >= PAINT1 ? 1 : paint);
    if (this.tankM.map) this.tankM.map.offset.y = 0;
    this.tankWhole.visible = !burst && !s.summer; this.tankTop.visible = !burst && !s.summer;
    this.wreck.visible = burst;
    const bu = smooth((tau - BURST) / 0.9);
    for (const [i, p] of this.tankPanels.entries()) {
      p.visible = burst;
      if (!burst) continue;
      const am = p.userData.am as number, j = 0.75 + 0.5 * Math.abs(Math.sin(i * 12.9898));
      p.rotation.set(0, am, 0); p.rotateX(1.35 * bu * j);
    }
    this.ladder.visible = !burst && !s.summer && tau > 17.5;
    this.bucket.visible = id === 5;
    // ---- wave + goo ----
    const X = waveX(tau), Hh = waveH(tau), x0 = TANK[0] + TANK_R - 0.5;
    this.wave.visible = burst && X > x0 + 0.5;
    if (this.wave.visible) {
      const p = this.wavePos, n = p.count;
      for (let k = 0; k < n; k++) {
        const u = this.waveUV[2 * k], v = this.waveUV[2 * k + 1]; // 0..1 along x, across z
        const x = x0 + (X - x0) * u, z = (v - 0.5) * 2 * (STREET_W - 0.05);
        const nose = smooth((1 - u) * (X - x0) / Math.max(1.6, Hh * 0.45)); // rounded front over the last ~H metres
        const ridge = 1 + 0.12 * Math.sin(u * 18 - t * 9 + v * 3);
        const y = Math.max(0.02, (GOO + (Hh - GOO) * Math.pow(u, 1.5)) * nose * ridge * (0.9 + 0.1 * Math.cos((v - 0.5) * 3)));
        p.setXYZ(k, x, y, z);
      }
      p.needsUpdate = true; this.wave.geometry.computeVertexNormals();
    }
    const gooOn = (burst && tau > BURST + 3) || (s.set === "street" && tau > 38 && !s.summer);
    this.goo.visible = gooOn && s.set === "street";
    if (this.goo.visible) { const xe = Math.min(X, 44); this.goo.scale.set(xe - x0, 1, 2 * STREET_W + 6); this.goo.position.set((xe + x0) / 2, GOO * 0.98, 0); }
    this.gooM.color.set("#5c2c10").lerp(new THREE.Color("#3a1c0c"), cold(tau));
    if (this.gooM.map) this.gooM.map.offset.x = burst && tau < 39 ? -t * 0.6 : 0;
    // ---- shed + bridge ----
    const sv = smooth((tau - SHOVE) / 0.8);
    this.shed.position.set(SHED[0] + 5 * sv, 0.5 * sv, SHED[2] - 1.2 * sv); this.shed.rotation.set(-0.2 * sv, 0.35 * sv, 0.3 * sv);
    this.shed.visible = !s.summer || true;
    if (s.summer) { this.shed.position.set(...SHED); this.shed.rotation.set(0, 0, 0); }
    const bend = s.summer ? 0 : smooth((tau - BEND) / 0.7);
    this.railL.rotation.x = -0.24 * bend; this.railR.rotation.x = 0.24 * bend;
    this.train.rotation.x = 0;
    // ---- lab ----
    if (s.set === "lab") {
      const k = clamp01((t - 52.6) / 2.0);
      this.thermo.scale.y = 0.55 - 0.42 * k; (this.thermo.material as THREE.MeshBasicMaterial).color.setRGB(2.4 - 2.0 * k, 0.3 + 0.6 * k, 0.2 + 2.2 * k);
      const sink = clamp01((t - 48.8) / 2.0);
      this.spoon.position.y = 1.13 - 0.06 * sink; this.spoon.rotation.z = 0.35 - 0.35 * smooth((t - 51.0) / 0.6);
    }
    // ---- cast + effects ----
    const right = V(0, 0, 0).setFromMatrixColumn(cam.matrixWorld, 0);
    const st = stage(id, t, { pos: cam.position, right, sun: sunDir });
    this.frustum.setFromProjectionMatrix(this.m4.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse));
    let ai = 0;
    const used: Actor[] = [];
    for (const p of st.places) {
      const sc2 = p.scale ?? 1;
      if (!this.frustum.intersectsSphere(this.sph.set(this.v.set(p.x, p.y + 1.1 * sc2, p.z), 3.5))) continue;
      const a = this.actor(ai++);
      const [w, hgt, kk] = p.size ?? [300, 500, 0.5];
      a.r = this.pool.req(p.key, w, hgt, kk, p.draw);
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

const SEA_DECL = `#include <common>
varying vec3 vWP;
uniform vec3 wNearC, wMidC, wFarC, wCrest, wTrough, wShade;
uniform float wTime;`;
const SEA_COL = `
  vec3 wV = vWP - cameraPosition;
  float wd = length(wV);
  float wDep = asin(clamp(-wV.y / wd, 0.0, 1.0));
  float wf = 1.0 - smoothstep(0.0, 0.42, wDep);
  vec3 wc = mix(mix(wNearC, wMidC, smoothstep(0.0, 0.55, wf)), wFarC, smoothstep(0.55, 1.0, wf));
  float rip = sin(vWP.x * 0.55 + wTime * 0.9) * sin(vWP.z * 0.47 - wTime * 0.7);
  wc = mix(wc, wCrest, smoothstep(0.8, 0.98, rip) * 0.45 * (1.0 - smoothstep(60.0, 260.0, wd)));
  diffuseColor.rgb = wc;`;
