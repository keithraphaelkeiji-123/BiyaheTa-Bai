// "Strong" as one three.js scene: sky + moon, the sea, a seaside street of painted concrete houses with tin roofs,
// the sari-sari store, coconut palms, outrigger boats, the pier, a cargo ship, and two dollhouse interiors far from
// the town (the home: kitchen island, dining table, sofa, window; the bedroom). update(id, f, camera) poses
// everything for shot `id` at frame f (a pure function of id + f).
import * as THREE from "three";
import { Batch, boxGeo, V, lam, quad, tri, Kit } from "./build";
import { ctex, cloudHD, grassHD, planksHD, rng, facadeHD } from "./paint";
import { LIGHTS, LOOK, LightPreset, LName } from "./lights";
import { TONE, CHAR, LFB, untone } from "./shade";
import { NOINK } from "./ink";
import { CARD_K } from "./cardshade";
import { Pool, Actor, Fx, stage, CLOCK } from "./cast";
import { portrait } from "./toon";
import {
  FPS, G, SHOTS, ROAD_Z0, ROAD_Z1, FRONT_Z, HOUSE_X, STORE, PORCH, PIER_X, PIER_L, PIER_Y, HOME, BEDR, SHIP_DAY, SHIP_FAR,
  TABLE, SOFA, WINDOW, BED, camAt, V3, ShotDef, clamp01,
} from "./story";

export const loadKit = () => Promise.resolve({} as Kit);

// ---------------- helpers ----------------
const col = (c: string) => lam("c" + c, () => ({ color: c }));
const mesh = (g: THREE.BufferGeometry, m: THREE.Material, parent: THREE.Object3D, cast = true) => {
  const o = new THREE.Mesh(g, m); o.castShadow = cast; o.receiveShadow = true; parent.add(o); return o;
};
const bx = (b: Batch, m: THREE.Material, x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, tile = 0) => b.add(boxGeo(V(x0, y0, z0), V(x1, y1, z1), tile), m);
const glowM = (r: number, g: number, b: number) => new THREE.MeshBasicMaterial({ color: new THREE.Color(r, g, b), fog: false });
const hullGeo = (L: number, W: number, y0: number, y1: number, bow = 0.3) => {
  const s = new THREE.Shape();
  s.moveTo(-L / 2, -W / 2); s.lineTo(L / 2 - L * bow, -W / 2); s.quadraticCurveTo(L / 2, -W / 2, L / 2, 0); s.quadraticCurveTo(L / 2, W / 2, L / 2 - L * bow, W / 2); s.lineTo(-L / 2, W / 2); s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: y1 - y0, bevelEnabled: false });
  g.rotateX(-Math.PI / 2); g.translate(0, y0, 0);
  return g;
};
const tinTex = (c: string) => ctex("tin" + c, 512, 512, (g, r) => {
  g.fillStyle = c; g.fillRect(0, 0, 512, 512);
  for (let x = 0; x < 512; x += 32) { g.fillStyle = "rgba(255,255,255,0.16)"; g.fillRect(x, 0, 10, 512); g.fillStyle = "rgba(0,0,0,0.14)"; g.fillRect(x + 18, 0, 8, 512); }
  for (let i = 0; i < 14; i++) { g.fillStyle = `rgba(120,60,30,${0.06 + r() * 0.1})`; g.beginPath(); g.ellipse(r() * 512, r() * 512, 20 + r() * 60, 8 + r() * 20, 0, 0, 7); g.fill(); }
});
const concreteTex = (key: string, base: string) => ctex(key, 512, 512, (g, r) => {
  g.fillStyle = base; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 400; i++) { g.fillStyle = r() > 0.5 ? "rgba(255,255,255,0.05)" : "rgba(60,50,40,0.06)"; g.fillRect(r() * 512, r() * 512, 2 + r() * 8, 2 + r() * 8); }
  g.fillStyle = "rgba(60,50,40,0.18)"; g.fillRect(0, 0, 512, 3); g.fillRect(0, 0, 3, 512);
});
const tileTex = () => ctex("floorTile", 512, 512, (g, r) => {
  for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) {
    g.fillStyle = (i + j) % 2 ? "#e9d8bc" : "#e2cdae"; g.fillRect(i * 128, j * 128, 128, 128);
    g.fillStyle = "rgba(255,255,255,0.08)"; g.fillRect(i * 128 + 8, j * 128 + 8, 40 + r() * 40, 6);
  }
  g.strokeStyle = "rgba(120,100,80,0.45)"; g.lineWidth = 3;
  for (let k = 0; k <= 512; k += 128) { g.beginPath(); g.moveTo(k, 0); g.lineTo(k, 512); g.moveTo(0, k); g.lineTo(512, k); g.stroke(); }
});
const wallTex = (key: string, top: string, low: string) => ctex(key, 512, 512, (g, r) => {
  g.fillStyle = top; g.fillRect(0, 0, 512, 512);
  g.fillStyle = low; g.fillRect(0, 330, 512, 182);
  g.fillStyle = "rgba(255,255,255,0.35)"; g.fillRect(0, 322, 512, 10);
  for (let i = 0; i < 30; i++) { g.fillStyle = r() > 0.5 ? "rgba(255,255,255,0.05)" : "rgba(90,70,50,0.04)"; g.beginPath(); g.ellipse(r() * 512, r() * 512, 20 + r() * 60, 10 + r() * 40, 0, 0, 7); g.fill(); }
});
const rugTex = () => ctex("rug", 512, 256, (g) => {
  g.fillStyle = "#b5533f"; g.fillRect(0, 0, 512, 256);
  g.strokeStyle = "#f2c94c"; g.lineWidth = 10; g.strokeRect(24, 24, 464, 208);
  g.strokeStyle = "#3f6fb5"; g.lineWidth = 6; g.strokeRect(48, 48, 416, 160);
  for (let i = 0; i < 6; i++) { g.fillStyle = i % 2 ? "#f2c94c" : "#3f6fb5"; g.beginPath(); g.moveTo(96 + i * 64, 128); g.lineTo(128 + i * 64, 96); g.lineTo(160 + i * 64, 128); g.lineTo(128 + i * 64, 160); g.closePath(); g.fill(); }
});
const quiltTex = () => ctex("quilt", 512, 512, (g) => {
  const cs = ["#7ab0e0", "#f2c94c", "#e88a9a", "#9ccf8a", "#f4f1ea"];
  for (let j = 0; j < 8; j++) for (let i = 0; i < 8; i++) { g.fillStyle = cs[(i * 3 + j * 2) % 5]; g.fillRect(i * 64, j * 64, 64, 64); }
  g.strokeStyle = "rgba(60,40,60,0.35)"; g.lineWidth = 3;
  for (let k = 0; k <= 512; k += 64) { g.beginPath(); g.moveTo(k, 0); g.lineTo(k, 512); g.moveTo(0, k); g.lineTo(512, k); g.stroke(); }
});
const calendarTex = () => ctex("calendar", 256, 320, (g) => {
  g.fillStyle = "#fbf8ef"; g.fillRect(0, 0, 256, 320);
  g.fillStyle = "#d2453c"; g.fillRect(0, 0, 256, 70);
  g.fillStyle = "#f4f1ea"; g.fillRect(40, 22, 176, 26);
  g.strokeStyle = "#9aa4b8"; g.lineWidth = 2;
  for (let j = 0; j < 5; j++) for (let i = 0; i < 7; i++) {
    const x = 12 + i * 33, y = 84 + j * 46; g.strokeRect(x, y, 31, 42);
    if (j * 7 + i < 26) { g.strokeStyle = "#d2453c"; g.lineWidth = 4; g.beginPath(); g.moveTo(x + 6, y + 8); g.lineTo(x + 25, y + 34); g.moveTo(x + 25, y + 8); g.lineTo(x + 6, y + 34); g.stroke(); g.strokeStyle = "#9aa4b8"; g.lineWidth = 2; }
    if (j * 7 + i === 33) { g.strokeStyle = "#3b7fd0"; g.lineWidth = 4; g.beginPath(); g.arc(x + 15, y + 21, 17, 0, 7); g.stroke(); g.strokeStyle = "#9aa4b8"; g.lineWidth = 2; }
  }
});
const photoTex = () => ctex("dadPhoto", 256, 320, (g) => {
  const cv = g.canvas as HTMLCanvasElement; void cv;
  g.fillStyle = "#6e4426"; g.fillRect(0, 0, 256, 320);
  const P = { g, ol: 12, rot: null } as unknown as Parameters<typeof portrait>[0];
  void P;
  g.fillStyle = "#cfe6f6"; g.fillRect(22, 22, 212, 276);
  // a simple painted portrait: white uniform, cap, smile
  g.fillStyle = "#f4f4f0"; g.beginPath(); g.ellipse(128, 300, 96, 70, 0, Math.PI, 0); g.fill();
  g.strokeStyle = "#241726"; g.lineWidth = 5; g.stroke();
  g.fillStyle = "#1f2a44"; g.fillRect(118, 236, 20, 60);
  g.fillStyle = "#e0a77c"; g.beginPath(); g.ellipse(128, 160, 56, 64, 0, 0, 7); g.fill(); g.stroke();
  g.fillStyle = "#f4f4f0"; g.beginPath(); g.ellipse(128, 112, 64, 30, 0, Math.PI, 0); g.fill(); g.stroke();
  g.fillStyle = "#1f2a44"; g.fillRect(64, 108, 128, 14); g.strokeRect(64, 108, 128, 14);
  g.fillStyle = "#e8c45a"; g.beginPath(); g.arc(128, 98, 8, 0, 7); g.fill();
  g.fillStyle = "#241726"; g.beginPath(); g.arc(106, 160, 5, 0, 7); g.arc(150, 160, 5, 0, 7); g.fill();
  g.beginPath(); g.lineWidth = 5; g.arc(128, 182, 18, 0.2, Math.PI - 0.2); g.stroke();
});
const weddingTex = () => ctex("wedding", 320, 256, (g) => {
  g.fillStyle = "#e9d6a0"; g.fillRect(0, 0, 320, 256);
  g.fillStyle = "#f6e9e4"; g.fillRect(18, 18, 284, 220);
  const head = (x: number, hair: string, skin: string) => { g.fillStyle = hair; g.beginPath(); g.ellipse(x, 120, 44, 56, 0, 0, 7); g.fill(); g.fillStyle = skin; g.beginPath(); g.ellipse(x, 110, 34, 40, 0, 0, 7); g.fill(); g.strokeStyle = "#241726"; g.lineWidth = 4; g.stroke(); g.fillStyle = "#241726"; g.beginPath(); g.arc(x - 11, 108, 4, 0, 7); g.arc(x + 11, 108, 4, 0, 7); g.fill(); g.beginPath(); g.arc(x, 122, 12, 0.3, Math.PI - 0.3); g.stroke(); };
  g.fillStyle = "#f4f4f0"; g.fillRect(70, 160, 80, 80); g.fillStyle = "#2b2f3a"; g.fillRect(170, 160, 80, 80);
  head(110, "#2e211c", "#e8b48c"); head(210, "#241a16", "#d9a57c");
});
const curtainTex = (c: string) => ctex("curtain" + c, 256, 512, (g) => {
  g.fillStyle = c; g.fillRect(0, 0, 256, 512);
  for (let x = 0; x < 256; x += 32) { g.fillStyle = "rgba(0,0,0,0.12)"; g.fillRect(x + 20, 0, 10, 512); g.fillStyle = "rgba(255,255,255,0.15)"; g.fillRect(x + 4, 0, 8, 512); }
  g.fillStyle = "rgba(255,255,255,0.5)"; for (let y = 30; y < 512; y += 90) for (let x = 20; x < 256; x += 64) { g.beginPath(); g.arc(x, y, 8, 0, 7); g.fill(); }
});
const bannerTex = () => ctex("banner", 1024, 128, (g) => {
  const cs = ["#d2453c", "#f2c94c", "#3b7fd0", "#5aa84c", "#e88a9a"];
  g.strokeStyle = "#241726"; g.lineWidth = 4; g.beginPath(); g.moveTo(0, 12); g.quadraticCurveTo(512, 40, 1024, 12); g.stroke();
  for (let i = 0; i < 12; i++) { const x = 20 + i * 84, y = 14 + 26 * Math.sin((i / 11) * Math.PI) * 0.8; g.fillStyle = cs[i % 5]; g.beginPath(); g.moveTo(x, y); g.lineTo(x + 70, y); g.lineTo(x + 35, y + 90); g.closePath(); g.fill(); g.stroke(); }
});
const discTex = () => ctex("moonDisc", 128, 128, (g) => {
  const gr = g.createRadialGradient(64, 64, 52, 64, 64, 64); gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
});
const rainTex = () => ctex("rainStreaks", 256, 512, (g, r) => {
  g.clearRect(0, 0, 256, 512);
  for (let i = 0; i < 90; i++) { g.strokeStyle = `rgba(200,220,255,${0.25 + r() * 0.4})`; g.lineWidth = 1.5 + r() * 2; const x = r() * 256, y = r() * 512, l = 30 + r() * 60; g.beginPath(); g.moveTo(x, y); g.lineTo(x - 6, y + l); g.stroke(); g.beginPath(); g.moveTo(x, y - 512); g.lineTo(x - 6, y - 512 + l); g.stroke(); }
});

// ---------------- palms, boats ----------------
const palm = (b: Batch, x: number, z: number, y: number, seed: number) => {
  const r = rng(seed), hgt = 7 + r() * 3, lean = 0.6 + r() * 0.8, la = r() * Math.PI * 2;
  const trunk = col("#9a7a5a"), frond = col(["#4f9a45", "#5aa84c", "#468a3e"][seed % 3]);
  const pts: THREE.Vector3[] = [];
  for (let k = 0; k <= 6; k++) { const t = k / 6; pts.push(V(x + Math.cos(la) * lean * t * t * 2, y + hgt * t, z + Math.sin(la) * lean * t * t * 2)); }
  for (let k = 0; k < 6; k++) {
    const a = pts[k], c = pts[k + 1], L = a.distanceTo(c), g = new THREE.CylinderGeometry(0.17 - k * 0.012, 0.21 - k * 0.012, L, 8);
    g.applyMatrix4(new THREE.Matrix4().compose(a.clone().add(c).multiplyScalar(0.5), new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), c.clone().sub(a).normalize()), V(1, 1, 1)));
    b.add(g, trunk);
  }
  const top = pts[6];
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + r(), L = 3.2 + r() * 0.8, droop = 1.4 + r() * 0.6;
    const s = new THREE.Shape(); s.moveTo(0, 0); s.quadraticCurveTo(L * 0.5, 0.55, L, 0); s.quadraticCurveTo(L * 0.5, -0.55, 0, 0);
    const g = new THREE.ShapeGeometry(s, 6); const p = g.attributes.position as THREE.BufferAttribute;
    for (let k = 0; k < p.count; k++) { const u = p.getX(k) / L; p.setZ(k, -droop * u * u); }
    g.rotateX(-Math.PI / 2); g.computeVertexNormals();
    g.applyMatrix4(new THREE.Matrix4().makeRotationY(a)); g.translate(top.x, top.y, top.z);
    b.add(g, frond);
  }
  for (let i = 0; i < 3; i++) b.add(new THREE.SphereGeometry(0.22, 8, 6).translate(top.x + Math.cos(i * 2.1) * 0.25, top.y - 0.3, top.z + Math.sin(i * 2.1) * 0.25), col("#6a8a3a"));
};
const bangka = (b: Batch, x: number, z: number, yaw: number, c: string) => {
  const m = new THREE.Matrix4().makeRotationY(yaw).setPosition(x, 0, z);
  b.add(hullGeo(6, 0.9, -0.2, 0.45, 0.4), col("#f4f1ea"), m);
  b.add(boxGeo(V(-2.6, 0.3, -0.46), V(2.0, 0.42, 0.46)), col(c), m);
  for (const s of [-1, 1]) {
    b.add(new THREE.CylinderGeometry(0.07, 0.07, 5, 6).rotateZ(Math.PI / 2).translate(0, 0.05, s * 1.9), col("#d9c08a"), m);
    for (const px of [-1.2, 1.2]) b.add(new THREE.CylinderGeometry(0.04, 0.04, 1.9, 6).rotateX(Math.PI / 2).translate(px, 0.4, s * 0.95), col("#d9c08a"), m);
  }
};

type House = { x: number; w: number; h: number; wins: [number, number, number][] };

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
  private town = new THREE.Group(); private home = new THREE.Group(); private bedroom = new THREE.Group();
  private ship = new THREE.Group(); private shipLights: THREE.Mesh[] = [];
  private nightGlow = new THREE.Group(); private homeLamp: THREE.Mesh; private bedLamp: THREE.Mesh;
  private birthday = new THREE.Group(); private candles: THREE.Mesh[] = [];
  private rain: THREE.Mesh[] = []; private rainTex: THREE.Texture;
  private curtL: THREE.Mesh; private curtR: THREE.Mesh;
  private hourH: THREE.Mesh; private minH: THREE.Mesh;
  private bills = new THREE.Group(); private dishes = new THREE.Group();
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

    // ---- the sea ----
    this.WU = {
      wNearC: { value: new THREE.Color() }, wMidC: { value: new THREE.Color() }, wFarC: { value: new THREE.Color() },
      wCrest: { value: new THREE.Color() }, wTrough: { value: new THREE.Color() }, wShade: { value: new THREE.Vector3(0.5, 0.56, 0.72) }, wTime: { value: 0 },
    };
    const waterM = new THREE.MeshLambertMaterial({ color: 0xffffff });
    waterM.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, this.WU);
      sh.vertexShader = sh.vertexShader
        .replace("#include <common>", "#include <common>\nvarying vec3 vWP;")
        .replace("#include <project_vertex>", "#include <project_vertex>\nvWP = (modelMatrix * vec4(transformed, 1.0)).xyz;");
      sh.fragmentShader = sh.fragmentShader
        .replace("#include <common>", SEA_DECL)
        .replace("#include <map_fragment>", SEA_COL)
        .replace("#include <lights_fragment_begin>", "float sunVis = 1.0;\n" + LFB)
        .replace("#include <lights_fragment_end>", "#include <lights_fragment_end>\n  reflectedLight.directDiffuse = diffuseColor.rgb * mix(wShade, vec3(1.0), sunVis);\n  reflectedLight.indirectDiffuse = vec3(0.0);");
    };
    waterM.customProgramCacheKey = () => "seaWater1";
    const wg = new THREE.PlaneGeometry(4000, 2600, 1, 1); wg.rotateX(-Math.PI / 2); wg.translate(0, 0, -1300);
    const sea = new THREE.Mesh(wg, waterM); sea.receiveShadow = true; sea.frustumCulled = false; R.add(sea);

    // ---- the town ----
    const T = this.town, tb = new Batch();
    const grass = lam("grassHD", () => ({ map: grassHD() }));
    if (grass.map) { grass.map.wrapS = grass.map.wrapT = THREE.RepeatWrapping; grass.map.anisotropy = 16; }
    const ground = new THREE.PlaneGeometry(900, 500); ground.rotateX(-Math.PI / 2); ground.translate(0, G, 250);
    const guv = ground.attributes.uv as THREE.BufferAttribute; for (let k = 0; k < guv.count; k++) guv.setXY(k, guv.getX(k) * 150, guv.getY(k) * 83);
    tb.add(ground, grass);
    const road = lam("road", () => ({ map: concreteTex("roadTex", "#b9b2a6") })), walk = lam("walk", () => ({ map: concreteTex("walkTex", "#d8d0c0") }));
    tb.add(quad(V(-450, G + 0.02, ROAD_Z1), V(450, G + 0.02, ROAD_Z1), V(450, G + 0.02, ROAD_Z0), V(-450, G + 0.02, ROAD_Z0), 225, 3), road);
    tb.add(quad(V(-450, G + 0.03, ROAD_Z0), V(450, G + 0.03, ROAD_Z0), V(450, G + 0.03, 0), V(-450, G + 0.03, 0), 300, 2), walk);
    tb.add(quad(V(-450, G + 0.03, FRONT_Z), V(450, G + 0.03, FRONT_Z), V(450, G + 0.03, ROAD_Z1), V(-450, G + 0.03, ROAD_Z1), 300, 2), walk);
    const wall = lam("seawall", () => ({ map: concreteTex("seawallTex", "#bdb4a4") }));
    bx(tb, wall, -450, -2, -0.6, 450, G + 0.55, 0, 2); // seawall with a low parapet
    // houses: painted concrete, tin roofs, fronts at FRONT_Z facing the sea (-z)
    const WALLS = ["#f2c9a0", "#bfe0d0", "#f4e3a1", "#c9d7f0", "#f3b9b0", "#e9d6f0", "#d8ecb8"];
    const ROOFS = ["#a8452f", "#4f7f9a", "#8f97a8", "#5f8f5a", "#b0663a"];
    const SHUT = ["#3f7fbf", "#5aa84c", "#c8463c", "#7a4a2a", "#3f6fb5"];
    const houses: House[] = [];
    let hi = 0;
    for (let x = -64; x <= 76; x += 11.5, hi++) {
      const w = 8.6 + (hi % 3) * 0.6, two = hi % 3 === 1 || x === HOUSE_X + 0 * 1, hgt = two ? 5.8 : 3.3, d = 8;
      const cx = Math.abs(x - HOUSE_X) < 1 ? HOUSE_X : x;
      const wallC = cx === HOUSE_X ? "#f2d3a8" : WALLS[hi % WALLS.length];
      const front = lam(`ph${hi}`, () => ({ map: facadeHD(`ph${hi}`, w, hgt, { wall: wallC, shutter: SHUT[hi % SHUT.length], door: true }) }));
      const side = lam(`phs${hi}`, () => ({ map: facadeHD(`phs${hi}`, d, hgt, { wall: wallC, shutter: SHUT[hi % SHUT.length] }) }));
      const z0 = FRONT_Z, z1 = FRONT_Z + d, x0 = cx - w / 2, x1 = cx + w / 2;
      tb.add(quad(V(x1, G, z0), V(x0, G, z0), V(x0, G + hgt, z0), V(x1, G + hgt, z0)), front);
      tb.add(quad(V(x0, G, z0), V(x0, G, z1), V(x0, G + hgt, z1), V(x0, G + hgt, z0)), side);
      tb.add(quad(V(x1, G, z1), V(x1, G, z0), V(x1, G + hgt, z0), V(x1, G + hgt, z1)), side);
      tb.add(quad(V(x0, G, z1), V(x1, G, z1), V(x1, G + hgt, z1), V(x0, G + hgt, z1)), side);
      const rh = 1.6, o = 0.5, rm = lam("tin" + ROOFS[hi % ROOFS.length], () => ({ map: tinTex(ROOFS[hi % ROOFS.length]), side: THREE.DoubleSide }));
      const zm = (z0 + z1) / 2;
      tb.add(quad(V(x1 + o, G + hgt - 0.2, z0 - o), V(x0 - o, G + hgt - 0.2, z0 - o), V(x0 - o, G + hgt + rh, zm), V(x1 + o, G + hgt + rh, zm), 2, 1), rm);
      tb.add(quad(V(x0 - o, G + hgt - 0.2, z1 + o), V(x1 + o, G + hgt - 0.2, z1 + o), V(x1 + o, G + hgt + rh, zm), V(x0 - o, G + hgt + rh, zm), 2, 1), rm);
      const wc = col(wallC);
      tb.add(tri(V(x0, G + hgt, z0), V(x0, G + hgt, z1), V(x0, G + hgt + rh, zm)), wc);
      tb.add(tri(V(x1, G + hgt, z1), V(x1, G + hgt, z0), V(x1, G + hgt + rh, zm)), wc);
      // window glow panels (night): facadeHD's window grid, the door slot skipped
      const floors = Math.max(1, Math.floor(hgt / 2.8)), n = Math.max(1, Math.floor(w / 2.2)), wins: [number, number, number][] = [];
      for (let fl = 0; fl < floors; fl++) for (let i = 0; i < n; i++) { if (fl === 0 && i === Math.floor(n / 2)) continue; wins.push([x1 - ((i + 0.5) / n) * w, G + fl * 2.8 + 0.9, z0]); }
      houses.push({ x: cx, w, h: hgt, wins });
    }
    // our porch: slab, two posts, a tin awning, the bench
    const porchM = lam("porchSlab", () => ({ map: concreteTex("porchTex", "#cfc4b2") }));
    bx(tb, porchM, HOUSE_X - 3.4, G, 14.4, HOUSE_X + 3.4, G + 0.15, FRONT_Z, 1);
    for (const s of [-1, 1]) bx(tb, col("#f4f1ea"), HOUSE_X + s * 3.2 - 0.09, G + 0.15, 14.5, HOUSE_X + s * 3.2 + 0.09, G + 2.7, 14.68);
    tb.add(quad(V(HOUSE_X + 3.6, G + 2.6, 14.2), V(HOUSE_X - 3.6, G + 2.6, 14.2), V(HOUSE_X - 3.6, G + 3.0, FRONT_Z), V(HOUSE_X + 3.6, G + 3.0, FRONT_Z), 2, 1), lam("tin#4f7f9a", () => ({ map: tinTex("#4f7f9a"), side: THREE.DoubleSide })));
    const wood = col("#a8724a");
    bx(tb, wood, PORCH[0] - 1.1, G + 0.42, PORCH[2] - 0.25 + 0.6, PORCH[0] + 1.1, G + 0.5, PORCH[2] + 0.25 + 0.6);
    for (const s of [-1, 1]) bx(tb, wood, PORCH[0] + s * 1.0 - 0.05, G + 0.15, PORCH[2] + 0.4, PORCH[0] + s * 1.0 + 0.05, G + 0.42, PORCH[2] + 0.8);
    bx(tb, wood, PORCH[0] - 1.1, G + 0.5, PORCH[2] + 0.8, PORCH[0] + 1.1, G + 0.95, PORCH[2] + 0.86);
    // potted plants
    for (const [px, pz] of [[HOUSE_X - 2.7, 15.0], [HOUSE_X + 2.7, 15.0], [STORE[0] + 3.4, 16.4]] as const) {
      tb.add(new THREE.CylinderGeometry(0.25, 0.19, 0.4, 12).translate(px, G + 0.2, pz), col("#b8684a"));
      tb.add(new THREE.IcosahedronGeometry(0.42, 1).translate(px, G + 0.75, pz), col("#4f9a45"));
    }
    // the sari-sari store: counter, grille window, striped awning, snack strips
    const sx = STORE[0];
    bx(tb, col("#e9c46a"), sx - 2.0, G, FRONT_Z - 0.5, sx + 2.0, G + 1.05, FRONT_Z);
    bx(tb, col("#7a4a2a"), sx - 2.1, G + 1.05, FRONT_Z - 0.6, sx + 2.1, G + 1.12, FRONT_Z);
    const aw = ctex("awning", 512, 128, (g) => { for (let i = 0; i < 16; i++) { g.fillStyle = i % 2 ? "#f4f1ea" : "#d2453c"; g.fillRect(i * 32, 0, 32, 128); } });
    tb.add(quad(V(sx + 2.4, G + 2.4, FRONT_Z - 1.3), V(sx - 2.4, G + 2.4, FRONT_Z - 1.3), V(sx - 2.4, G + 2.9, FRONT_Z), V(sx + 2.4, G + 2.9, FRONT_Z)), lam("awning", () => ({ map: aw, side: THREE.DoubleSide })));
    const snacks = ctex("snacks", 512, 256, (g, r) => {
      g.fillStyle = "#3a2a2a"; g.fillRect(0, 0, 512, 256);
      const cs = ["#f2c531", "#d2453c", "#3b7fd0", "#5aa84c", "#f08a2c", "#e88a9a"];
      for (let j = 0; j < 3; j++) for (let i = 0; i < 16; i++) { g.fillStyle = cs[Math.floor(r() * 6)]; g.fillRect(4 + i * 32, 8 + j * 82, 26, 70); g.fillStyle = "rgba(255,255,255,0.5)"; g.fillRect(8 + i * 32, 14 + j * 82, 18, 8); }
    });
    tb.add(quad(V(sx + 1.9, G + 1.12, FRONT_Z - 0.02), V(sx - 1.9, G + 1.12, FRONT_Z - 0.02), V(sx - 1.9, G + 2.35, FRONT_Z - 0.02), V(sx + 1.9, G + 2.35, FRONT_Z - 0.02)), lam("snacks", () => ({ map: snacks })));
    // palms along the seawall and between houses, an electric line of posts
    let ps = 1;
    for (let x = -80; x < 100; x += 13 + (ps % 3) * 3, ps++) if (Math.abs(x - PIER_X) > 4) palm(tb, x, 2.0 + (ps % 2) * 1.2, G, ps);
    for (let x = -58; x < 80; x += 23) palm(tb, x + 5.8, FRONT_Z + 9.5, G, 40 + Math.round(x));
    for (let x = -70; x < 90; x += 24) bx(tb, col("#8a7a6a"), x - 0.12, G, ROAD_Z1 + 0.7, x + 0.12, G + 7.5, ROAD_Z1 + 0.94);
    // the pier
    const deck = lam("pierDeck", () => ({ map: planksHD() }));
    bx(tb, deck, PIER_X - 2, PIER_Y - 0.25, -PIER_L, PIER_X + 2, PIER_Y, 0.2, 2);
    for (let z = -PIER_L + 1; z < 0; z += 4) for (const s of [-1, 1]) tb.add(new THREE.CylinderGeometry(0.18, 0.18, 3.4, 8).translate(PIER_X + s * 1.85, PIER_Y - 1.8, z), col("#6e4a30"));
    for (const z of [-PIER_L + 1.2, -PIER_L / 2]) for (const s of [-1, 1]) tb.add(new THREE.CylinderGeometry(0.16, 0.2, 0.5, 10).translate(PIER_X + s * 1.6, PIER_Y + 0.25, z), col("#3a3d47"));
    for (let z = -PIER_L + 0.2; z < 0; z += 2.5) for (const s of [-1, 1]) bx(tb, col("#7a4a2a"), PIER_X + s * 1.95 - 0.05, PIER_Y, z - 0.05, PIER_X + s * 1.95 + 0.05, PIER_Y + 0.95, z + 0.05);
    for (const s of [-1, 1]) bx(tb, col("#a8724a"), PIER_X + s * 1.95 - 0.07, PIER_Y + 0.9, -PIER_L + 0.2, PIER_X + s * 1.95 + 0.07, PIER_Y + 1.0, 0);
    // boats
    bangka(tb, -14, -7, 0.3, "#3f7fbf"); bangka(tb, -5, -11, -0.2, "#d2453c"); bangka(tb, 18, -8, 0.5, "#5aa84c"); bangka(tb, 46, -14, -0.4, "#f2c531");
    tb.build(T);
    // night window glow
    const winGlow = glowM(2.4, 1.6, 0.8), winQ = new THREE.PlaneGeometry(1.0, 1.25);
    for (const hs of houses) for (const [x, y, z] of hs.wins) { const m = new THREE.Mesh(winQ, winGlow); m.position.set(x, y + 0.66, z - 0.03); m.rotation.y = Math.PI; m.layers.set(NOINK); this.nightGlow.add(m); }
    const bulbM = glowM(4, 3, 1.6);
    for (let x = -70; x < 90; x += 24) { const m = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), bulbM); m.position.set(x, G + 6.8, ROAD_Z1 + 0.4); m.layers.set(NOINK); this.nightGlow.add(m); }
    const porchBulb = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 8), bulbM); porchBulb.position.set(HOUSE_X, G + 2.5, 16.6); porchBulb.layers.set(NOINK); this.nightGlow.add(porchBulb);
    T.add(this.nightGlow);
    R.add(T);

    // ---- the cargo ship ----
    const S = this.ship, sb = new Batch();
    sb.add(hullGeo(84, 14, -3, 3.5, 0.16), col("#b5413a"));
    sb.add(hullGeo(84.2, 14.2, -3.2, -1.2, 0.16), col("#2f3a52"));
    bx(sb, col("#c9c4b8"), -40, 3.5, -6.6, 32, 3.7, 6.6);
    const ccols = ["#3f7fbf", "#d8a23a", "#c8463c", "#4f9a5a", "#7a5a9a", "#e2e2e2", "#2f6f8f"];
    for (let i = 0; i < 9; i++) for (let k = 0; k < 4; k++) for (let lv = 0; lv < 2 + ((i + k) % 2); lv++) bx(sb, col(ccols[(i * 3 + k * 5 + lv) % 7]), -14 + i * 4.8, 3.7 + lv * 2.6, -6 + k * 3.05, -14 + i * 4.8 + 4.6, 3.7 + lv * 2.6 + 2.5, -6 + k * 3.05 + 2.9, 2);
    bx(sb, col("#f4f1ea"), -38, 3.7, -6, -26, 16, 6, 3); // bridge house
    bx(sb, col("#f4f1ea"), -39, 16, -7.4, -25, 16.6, 7.4);
    sb.add(new THREE.CylinderGeometry(1.4, 1.6, 6, 14).translate(-35, 19, 0), col("#d2453c"));
    bx(sb, col("#2f3a52"), -37, 21.4, -1.5, -33, 22.2, 1.5);
    for (const s of [-1, 1]) for (let x = -40; x < 36; x += 2) bx(sb, col("#f4f1ea"), x - 0.04, 3.7, s * 6.55 - 0.04, x + 0.04, 4.8, s * 6.55 + 0.04);
    for (const s of [-1, 1]) bx(sb, col("#f4f1ea"), -40, 4.7, s * 6.55 - 0.05, 36, 4.82, s * 6.55 + 0.05);
    sb.add(new THREE.CylinderGeometry(0.12, 0.12, 10, 6).translate(36, 8.5, 0), col("#f4f1ea"));
    sb.build(S);
    const shipWin = glowM(3.0, 2.2, 1.1), sq = new THREE.PlaneGeometry(1.4, 0.9);
    for (let fl = 0; fl < 3; fl++) for (let i = 0; i < 6; i++) for (const s of [-1, 1]) { const m = new THREE.Mesh(sq, shipWin); m.position.set(-36.5 + i * 1.9, 6.5 + fl * 3.2, s * 6.04); m.rotation.y = s > 0 ? 0 : Math.PI; m.layers.set(NOINK); S.add(m); this.shipLights.push(m); }
    for (const [x, y, c] of [[36, 13.6, glowM(4, 4, 3.6)], [-35, 22.6, glowM(4, 1, 0.8)], [10, 5.2, glowM(0.6, 4, 0.8)]] as const) { const m = new THREE.Mesh(new THREE.SphereGeometry(0.35, 10, 8), c); m.position.set(x, y, 0); m.layers.set(NOINK); S.add(m); this.shipLights.push(m); }
    R.add(S);

    // ---- the home (local coordinates, floor at 0) ----
    const Hm = this.home, hb = new Batch();
    const floor = lam("floorTile", () => ({ map: tileTex() })), wallM = lam("homeWall", () => ({ map: wallTex("homeWallTex", "#f3e2c0", "#d9b98f") }));
    bx(hb, floor, -5.2, -0.2, -3.6, 5.2, 0, 3.6, 1.2);
    const [w0, w1, wy0, wy1] = WINDOW, HT = 2.9, BZ = 3.5;
    bx(hb, wallM, -5.2, 0, BZ, w0, HT, BZ + 0.2, 2.9); bx(hb, wallM, w1, 0, BZ, 5.2, HT, BZ + 0.2, 2.9);
    bx(hb, wallM, w0, 0, BZ, w1, wy0, BZ + 0.2, 2.9); bx(hb, wallM, w0, wy1, BZ, w1, HT, BZ + 0.2, 2.9);
    bx(hb, wallM, -5.4, 0, -3.6, -5.2, HT, 3.7, 2.9); bx(hb, wallM, 5.2, 0, -3.6, 5.4, HT, 3.7, 2.9);
    // window frame + sill
    const trim = col("#f4f1ea");
    bx(hb, trim, w0 - 0.08, wy0 - 0.08, BZ - 0.12, w1 + 0.08, wy0, BZ + 0.05); bx(hb, trim, w0 - 0.08, wy1, BZ - 0.06, w1 + 0.08, wy1 + 0.08, BZ + 0.05);
    bx(hb, trim, w0 - 0.08, wy0, BZ - 0.06, w0, wy1, BZ + 0.05); bx(hb, trim, w1, wy0, BZ - 0.06, w1 + 0.08, wy1, BZ + 0.05);
    bx(hb, trim, (w0 + w1) / 2 - 0.03, wy0, BZ + 0.08, (w0 + w1) / 2 + 0.03, wy1, BZ + 0.12);
    // door in the left wall
    bx(hb, col("#8a5a3c"), -5.22, 0, -2.6, -5.15, 2.1, -1.6);
    // kitchen: back cabinets, fridge, island with stove + sink
    const cab = col("#7fb5a0"), top = col("#e9e4da");
    bx(hb, cab, 1.2, 0, 2.95, 5.2, 0.88, BZ); bx(hb, top, 1.15, 0.88, 2.9, 5.2, 0.94, BZ);
    bx(hb, cab, 2.0, 1.55, 3.1, 5.2, 2.25, BZ);
    bx(hb, col("#e8ecef"), 0.4, 0, 2.85, 1.15, 1.75, BZ);
    bx(hb, col("#c9ced4"), 0.98, 0.9, 2.84, 1.02, 1.4, 2.86);
    bx(hb, cab, 2.2, 0, 1.85, 4.8, 0.86, 2.55); bx(hb, top, 2.15, 0.86, 1.8, 4.85, 0.92, 2.6);
    bx(hb, col("#2f3540"), 2.6, 0.92, 1.95, 3.4, 0.95, 2.45);
    hb.add(new THREE.CylinderGeometry(0.2, 0.18, 0.22, 16).translate(3.0, 1.06, 2.2), col("#c8463c"));
    bx(hb, col("#b9c0c8"), 3.85, 0.8, 1.95, 4.55, 0.93, 2.45);
    hb.add(new THREE.CylinderGeometry(0.025, 0.025, 0.3, 8).translate(4.2, 1.07, 2.5), col("#b9c0c8"));
    // dining table + chairs
    const [tx, , tz] = TABLE, tw = col("#a8724a"), tdk = col("#8a5a3c");
    bx(hb, tw, tx - 0.85, 0.72, tz - 0.48, tx + 0.85, 0.78, tz + 0.48);
    for (const [sx2, sz2] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) bx(hb, tdk, tx + sx2 * 0.75 - 0.04, 0, tz + sz2 * 0.4 - 0.04, tx + sx2 * 0.75 + 0.04, 0.72, tz + sz2 * 0.4 + 0.04);
    const chair = (cx: number, cz: number, facing: number) => {
      bx(hb, tdk, cx - 0.22, 0.43, cz - 0.22, cx + 0.22, 0.48, cz + 0.22);
      for (const [a, b] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) bx(hb, tdk, cx + a * 0.19 - 0.025, 0, cz + b * 0.19 - 0.025, cx + a * 0.19 + 0.025, 0.43, cz + b * 0.19 + 0.025);
      const bz = cz + facing * 0.21; bx(hb, tdk, cx - 0.22, 0.48, bz - 0.03, cx + 0.22, 1.0, bz + 0.03);
    };
    chair(tx - 0.35, tz + 0.72, 1); chair(tx + 0.45, tz + 0.72, 1); chair(tx - 1.12, tz, 1); chair(tx + 1.12, tz, 1);
    // sofa + coffee table + rug
    const [fx, , fz] = SOFA, sofaM = col("#5b7fb8"), cush = col("#6e93cc");
    bx(hb, sofaM, fx - 1.2, 0, fz - 0.4, fx + 1.2, 0.42, fz + 0.45); bx(hb, sofaM, fx - 1.2, 0.42, fz + 0.2, fx + 1.2, 0.95, fz + 0.45);
    for (const s of [-1, 1]) bx(hb, sofaM, fx + s * 1.1 - 0.12, 0.42, fz - 0.4, fx + s * 1.1 + 0.12, 0.65, fz + 0.45);
    for (const s of [-1, 1]) bx(hb, cush, fx + s * 0.5 - 0.46, 0.42, fz - 0.36, fx + s * 0.5 + 0.46, 0.52, fz + 0.2);
    bx(hb, tw, fx - 0.5, 0.36, fz - 1.4, fx + 0.5, 0.42, fz - 0.9); for (const [a, b] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) bx(hb, tdk, fx + a * 0.44 - 0.03, 0, fz - 1.15 + b * 0.2 - 0.03, fx + a * 0.44 + 0.03, 0.36, fz - 1.15 + b * 0.2 + 0.03);
    hb.add(quad(V(fx - 1.5, 0.01, fz - 0.2), V(fx + 1.5, 0.01, fz - 0.2), V(fx + 1.5, 0.01, fz - 2.0), V(fx - 1.5, 0.01, fz - 2.0)), lam("rug", () => ({ map: rugTex() })));
    // plant, shelf with a radio
    hb.add(new THREE.CylinderGeometry(0.22, 0.17, 0.45, 12).translate(-4.7, 0.22, 3.1), col("#b8684a"));
    hb.add(new THREE.IcosahedronGeometry(0.45, 1).translate(-4.7, 0.85, 3.1), col("#4f9a45"));
    bx(hb, tw, -5.2, 1.0, -0.4, -4.85, 1.05, 1.2);
    // wall items: the photo of dad, the calendar, the clock face
    const wallPic = (tex: THREE.Texture, key: string, cx: number, cy: number, w: number, hgt: number, z = BZ - 0.02) => hb.add(quad(V(cx - w / 2, cy - hgt / 2, z), V(cx + w / 2, cy - hgt / 2, z), V(cx + w / 2, cy + hgt / 2, z), V(cx - w / 2, cy + hgt / 2, z)).rotateY(0), lam(key, () => ({ map: tex })));
    void wallPic;
    const pic = (tex: THREE.Texture, key: string, cx: number, cy: number, w: number, hgt: number) => {
      const g = new THREE.PlaneGeometry(w, hgt); g.rotateY(Math.PI); g.translate(cx, cy, BZ - 0.015); hb.add(g, lam(key, () => ({ map: tex })));
    };
    pic(photoTex(), "dadPhoto", -3.0, 1.75, 0.5, 0.62);
    pic(calendarTex(), "calendar", 1.5, 2.05, 0.42, 0.52);
    const clockFace = ctex("clockFace", 256, 256, (g) => { g.fillStyle = "#f7f1e1"; g.strokeStyle = "#221f2e"; g.lineWidth = 14; g.beginPath(); g.arc(128, 128, 112, 0, 7); g.fill(); g.stroke(); g.lineCap = "round"; for (let i = 0; i < 12; i++) { const a = (i * Math.PI) / 6; g.lineWidth = 8; g.beginPath(); g.moveTo(128 + 80 * Math.cos(a), 128 + 80 * Math.sin(a)); g.lineTo(128 + 98 * Math.cos(a), 128 + 98 * Math.sin(a)); g.stroke(); } });
    const cf = new THREE.CircleGeometry(0.24, 32); cf.rotateY(Math.PI); cf.translate(-4.2, 2.2, BZ - 0.015); hb.add(cf, lam("clockFace", () => ({ map: clockFace })));
    hb.build(Hm);
    this.hourH = mesh(new THREE.BoxGeometry(0.025, 0.13, 0.01).translate(0, 0.055, 0), col("#221f2e"), Hm, false); this.hourH.position.set(-4.2, 2.2, BZ - 0.03);
    this.minH = mesh(new THREE.BoxGeometry(0.018, 0.19, 0.01).translate(0, 0.085, 0), col("#221f2e"), Hm, false); this.minH.position.set(-4.2, 2.2, BZ - 0.035);
    // curtains (they slide open in shot 19)
    const ctM = lam("curtainBlue", () => ({ map: curtainTex("#e7b8c8"), side: THREE.DoubleSide }));
    this.curtL = mesh(new THREE.PlaneGeometry(1.0, 1.55).translate(0.5, 0, 0), ctM, Hm, false); this.curtR = mesh(new THREE.PlaneGeometry(1.0, 1.55).translate(-0.5, 0, 0), ctM, Hm, false);
    this.curtL.position.set(w0 - 0.15, (wy0 + wy1) / 2 + 0.05, BZ - 0.1); this.curtR.position.set(w1 + 0.15, (wy0 + wy1) / 2 + 0.05, BZ - 0.1);
    // ceiling lamp over the table
    this.homeLamp = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 8), glowM(4, 3, 1.6)); this.homeLamp.position.set(tx, 2.25, tz); this.homeLamp.layers.set(NOINK); Hm.add(this.homeLamp);
    mesh(new THREE.ConeGeometry(0.32, 0.25, 20, 1, true).translate(tx, 2.38, tz), lam("shade", () => ({ color: "#f2c94c", side: THREE.DoubleSide })), Hm, false);
    mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.4, 4).translate(tx, 2.7, tz), col("#221f2e"), Hm, false);
    // birthday: banner, balloons, cake with candles
    const B = this.birthday;
    const bn = new THREE.PlaneGeometry(3.4, 0.42); bn.rotateY(Math.PI); bn.translate(0.6, 2.42, BZ - 0.03);
    const bm = new THREE.Mesh(bn, lam("banner", () => ({ map: bannerTex(), transparent: true, alphaTest: 0.5 }))); B.add(bm);
    for (const [x, y, z, c] of [[-1.3, 1.9, 3.1, "#d2453c"], [-1.0, 2.1, 3.2, "#f2c94c"], [2.3, 2.0, 3.2, "#3b7fd0"], [2.6, 1.85, 3.0, "#e88a9a"], [2.0, 1.75, 3.25, "#5aa84c"]] as const) {
      mesh(new THREE.SphereGeometry(0.2, 16, 12).scale(1, 1.18, 1).translate(x, y, z), col(c), B, false);
      mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.9, 4).translate(x, y - 0.65, z), col("#f4f1ea"), B, false);
    }
    mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.16, 24).translate(tx, 0.86, tz + 0.05), col("#f7e1ea"), B);
    mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.03, 24).translate(tx, 0.95, tz + 0.05), col("#e88a9a"), B);
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2, cxp = tx + Math.cos(a) * 0.11, czp = tz + 0.05 + Math.sin(a) * 0.11;
      mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.08, 6).translate(cxp, 1.0, czp), col(["#3b7fd0", "#f2c94c", "#5aa84c", "#d2453c", "#7a5a9a"][i]), B, false);
      const fl = new THREE.Mesh(new THREE.SphereGeometry(0.014, 8, 6).scale(1, 1.6, 1), glowM(5, 3.2, 1)); fl.position.set(cxp, 1.06, czp); fl.layers.set(NOINK); B.add(fl); this.candles.push(fl);
    }
    Hm.add(B);
    // bills on the table, dishes at the sink
    for (let i = 0; i < 4; i++) mesh(new THREE.PlaneGeometry(0.21, 0.29).rotateX(-Math.PI / 2).rotateY(i * 0.4 - 0.5).translate(tx - 0.1 + i * 0.12, 0.785 + i * 0.002, tz + 0.15 + (i % 2) * 0.08), col("#fbf8ef"), this.bills, false);
    bx(new Batch(), col("#2f3540"), 0, 0, 0, 0, 0, 0);
    mesh(new THREE.BoxGeometry(0.09, 0.02, 0.14).translate(tx + 0.35, 0.79, tz + 0.1), col("#3a3d47"), this.bills, false);
    Hm.add(this.bills);
    for (let i = 0; i < 4; i++) mesh(new THREE.CylinderGeometry(0.14, 0.12, 0.02, 20).translate(3.75, 0.93 + i * 0.022, 2.2), col("#f7f4ee"), this.dishes, false);
    for (let i = 0; i < 3; i++) mesh(new THREE.CylinderGeometry(0.04, 0.035, 0.1, 12).translate(3.55 + i * 0.09, 0.97, 2.42), col("#cfe6f6"), this.dishes, false);
    Hm.add(this.dishes);
    // rain on the window (night)
    this.rainTex = rainTex();
    const rq = new THREE.PlaneGeometry(w1 - w0, wy1 - wy0); rq.rotateY(Math.PI);
    for (const k of [0, 1]) { const r = new THREE.Mesh(rq, new THREE.MeshBasicMaterial({ map: this.rainTex, transparent: true, depthWrite: false, fog: false, opacity: 0.8 })); r.position.set((w0 + w1) / 2, (wy0 + wy1) / 2, BZ + 0.05 + k * 0.08); r.layers.set(NOINK); Hm.add(r); this.rain.push(r); }
    Hm.position.set(...HOME); R.add(Hm);

    // ---- the bedroom ----
    const Bd = this.bedroom, bb = new Batch();
    const bfloor = lam("planksHD", () => ({ map: planksHD() })), bwall = lam("bedWall", () => ({ map: wallTex("bedWallTex", "#d9e4f2", "#b9c8e0") }));
    bx(bb, bfloor, -3.4, -0.2, -2.6, 3.4, 0, 2.6, 2);
    const BW = 2.5, bw0 = 0.5, bw1 = 2.1, by0 = 1.0, by1 = 2.2;
    bx(bb, bwall, -3.4, 0, BW, bw0, 2.8, BW + 0.2, 2.8); bx(bb, bwall, bw1, 0, BW, 3.4, 2.8, BW + 0.2, 2.8);
    bx(bb, bwall, bw0, 0, BW, bw1, by0, BW + 0.2, 2.8); bx(bb, bwall, bw0, by1, BW, bw1, 2.8, BW + 0.2, 2.8);
    bx(bb, bwall, -3.6, 0, -2.6, -3.4, 2.8, 2.7, 2.8); bx(bb, bwall, 3.4, 0, -2.6, 3.6, 2.8, 2.7, 2.8);
    bx(bb, trim, bw0 - 0.08, by0 - 0.08, BW - 0.12, bw1 + 0.08, by0, BW + 0.05); bx(bb, trim, bw0 - 0.08, by1, BW - 0.06, bw1 + 0.08, by1 + 0.08, BW + 0.05);
    bx(bb, trim, bw0 - 0.08, by0, BW - 0.06, bw0, by1, BW + 0.05); bx(bb, trim, bw1, by0, BW - 0.06, bw1 + 0.08, by1, BW + 0.05);
    // the bed: headboard on the left wall, two pillows (hers near, his far)
    const [ex, , ez] = BED;
    bx(bb, col("#8a5a3c"), ex - 1.05, 0, ez - 0.85, ex + 1.05, 0.32, ez + 0.85);
    bx(bb, col("#f4f1ea"), ex - 1.0, 0.32, ez - 0.8, ex + 1.0, 0.52, ez + 0.8);
    bb.add(boxGeo(V(ex - 0.45, 0.52, ez - 0.82), V(ex + 1.02, 0.6, ez + 0.82)), lam("quilt", () => ({ map: quiltTex() })));
    bx(bb, col("#8a5a3c"), ex - 1.15, 0, ez - 0.9, ex - 1.05, 1.15, ez + 0.9);
    for (const s of [-1, 1]) bb.add(new THREE.CapsuleGeometry(0.12, 0.42, 6, 12).rotateX(Math.PI / 2).scale(1, 0.7, 1).translate(ex - 0.75, 0.6, ez + s * 0.38), col("#fbfaf6"));
    // nightstand + lamp, wardrobe, wedding photo
    bx(bb, col("#a8724a"), ex - 1.0, 0, ez + 1.0, ex - 0.45, 0.55, ez + 1.45);
    bb.add(new THREE.CylinderGeometry(0.05, 0.08, 0.25, 12).translate(ex - 0.72, 0.68, ez + 1.22), col("#d9c08a"));
    bb.add(new THREE.ConeGeometry(0.17, 0.2, 18, 1, true).translate(ex - 0.72, 0.9, ez + 1.22), lam("shade", () => ({ color: "#f2c94c", side: THREE.DoubleSide })));
    bx(bb, col("#7a4a2a"), 2.3, 0, 0.9, 3.4, 2.1, 2.45);
    { const g = new THREE.PlaneGeometry(0.62, 0.5); g.rotateY(-Math.PI / 2); g.rotateY(Math.PI); g.translate(-3.38, 1.6, 0.6); bb.add(g, lam("wedding", () => ({ map: weddingTex() }))); }
    bb.build(Bd);
    this.bedLamp = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 8), glowM(4, 3, 1.6)); this.bedLamp.position.set(ex - 0.72, 0.85, ez + 1.22); this.bedLamp.layers.set(NOINK); Bd.add(this.bedLamp);
    Bd.position.set(...BEDR); R.add(Bd);
  }

  /** camera-relative sun, frozen per shot */
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
    const t = f / FPS, s = SHOTS[id - 1], L = LIGHTS[s.light], K = LOOK[s.light];
    const c = camAt(id, f);
    cam.position.set(...c.pos); cam.up.set(0, 1, 0); cam.lookAt(...c.look); cam.rotateZ(c.roll);
    cam.fov = c.fov; cam.near = 0.05; cam.far = 1500; cam.updateProjectionMatrix(); cam.updateMatrixWorld();
    const focus = V(...c.look), dist = cam.position.distanceTo(focus);
    cam.layers.enable(NOINK);
    const night = s.light === "night" || s.light === "lamp";
    // ---- light rig ----
    const sunDir = this.shotSun(id, s, L);
    this.hemi.color.set(L.sky); this.hemi.groundColor.set(L.ground); this.hemi.intensity = L.hemiI;
    this.sun.color.set(L.sunCol); this.sun.intensity = L.sunI;
    let Rr = THREE.MathUtils.clamp(dist * 1.15 + 7, 6, 120);
    if (s.set === "home" || s.set === "bed") Rr = 9;
    if (s.set === "ship") Rr = 70;
    this.sun.position.copy(focus).addScaledVector(sunDir, 300); this.sun.target.position.copy(focus);
    const sc = this.sun.shadow.camera;
    sc.left = -Rr; sc.right = Rr; sc.top = Rr; sc.bottom = -Rr; sc.near = 20; sc.far = 600; sc.updateProjectionMatrix();
    this.sun.shadow.bias = L.bias; this.sun.shadow.normalBias = L.normalBias * (Rr / 12);
    TONE.uLitCol.value.set(...L.lit); TONE.uShadeCol.value.set(...L.shade); TONE.uShadeLift.value.set(...L.lift);
    TONE.uLambert.value = L.lambert; TONE.uSideK.value = L.sideK; TONE.uTerm.value = L.term; TONE.uBounce.value.set(...K.bounce); TONE.uSat.value = K.sat;
    CHAR.uCharTint.value.set(...L.charTint); CHAR.uCharShade.value = L.charShade; CHAR.uGrad.value = L.charGrad;
    CHAR.uBodyGrad.value = L.bodyGrad; CHAR.uSideTint.value.set(...L.sideTint);
    CARD_K.uGain.value = s.light === "night" ? 0.78 : s.light === "lamp" ? 0.95 : 1.03;
    // ---- sky, fog, moon/sun disc, clouds ----
    const su = this.skyMat.uniforms;
    K.sky.c.forEach((hx, i) => untone(hx, su["c" + i].value));
    const e = K.sky.e.map((deg) => THREE.MathUtils.degToRad(deg));
    su.e.value.set(e[1], e[2], e[3], e[4]);
    this.sky.position.copy(cam.position);
    untone(L.fog, this.fog.color); this.fog.near = L.fogNear; this.fog.far = L.fogFar;
    if (s.set === "home" || s.set === "bed") { this.fog.near = 60; this.fog.far = 600; }
    if (s.set === "ship") { this.fog.near = 80; this.fog.far = 900; }
    scene.fog = this.fog; scene.background = null;
    const dm = this.disc.material as THREE.SpriteMaterial;
    this.disc.visible = s.light === "golden" || night;
    if (this.disc.visible) {
      // golden: the sun low over the sea, straight down the pier; night: the moon, seen through the window or over the sea
      const dir = s.light === "golden" ? V(-0.42, 0.06, -1).normalize() : s.set === "bed" ? V(0.45, 0.42, 1).normalize() : s.set === "home" ? V(-0.1, 0.38, 1).normalize() : V(0.3, 0.3, -1).normalize();
      if (s.light === "golden") dm.color.setRGB(6.0, 4.4, 2.4); else dm.color.setRGB(3.0, 3.2, 3.6);
      this.disc.position.copy(cam.position).addScaledVector(dir, 900); this.disc.scale.setScalar(2 * 900 * Math.tan(THREE.MathUtils.degToRad(s.light === "golden" ? 1.9 : 1.4)));
    }
    for (let i = 0; i < this.clouds.length; i++) { const m = this.clouds[i]; m.lookAt(cam.position.x, m.position.y, cam.position.z); (m.material as THREE.MeshBasicMaterial).map = this.cloudMaps[s.light][i % 4]; }
    // ---- sea ----
    const W = this.WU, wc = K.water;
    untone(wc.near, W.wNearC.value); untone(wc.mid, W.wMidC.value); untone(wc.far, W.wFarC.value);
    untone(wc.crest, W.wCrest.value); untone(wc.trough, W.wTrough.value);
    W.wShade.value.set(...wc.shade); W.wTime.value = t;
    // ---- sets ----
    this.town.visible = s.set === "town" || s.set === "ship";
    this.nightGlow.visible = s.light === "night" && s.set === "town";
    this.home.visible = s.set === "home"; this.bedroom.visible = s.set === "bed";
    this.ship.visible = s.set === "ship" || id >= 20 || id === 16 || id === 15;
    const shipAt: V3 = s.set === "ship" ? SHIP_DAY : SHIP_FAR;
    this.ship.position.set(shipAt[0] + (s.set === "ship" ? -1.4 * (t - 2.6) : 0), 0.08 * Math.sin(t * 0.8), shipAt[2]);
    this.ship.rotation.set(0.006 * Math.sin(t * 0.7), s.set === "ship" ? Math.PI : Math.PI * 0.94, 0.01 * Math.sin(t * 0.9));
    for (const m of this.shipLights) m.visible = night || s.light === "golden";
    this.homeLamp.visible = s.light === "lamp"; this.bedLamp.visible = night;
    this.birthday.visible = id === 10;
    for (const [i, fl] of this.candles.entries()) fl.scale.set(1, 1 + 0.25 * Math.sin(t * 17 + i * 2), 1);
    this.bills.visible = id === 3 || id === 17;
    this.dishes.visible = id === 11 || id === 12;
    for (const r of this.rain) r.visible = !!s.rain;
    this.rainTex.offset.y = -t * 1.3;
    // the clock: time runs fast while she waits (shot 9), otherwise real time
    const mins = id === 9 ? 21 * 60 + 40 + (f - 927) * 1.6 : id === 13 || id === 14 ? 23 * 60 + 10 + t / 6 : s.light === "lamp" ? 20 * 60 + 30 + t / 6 : 8 * 60 + 15 + t / 6;
    this.minH.rotation.z = -((mins % 60) / 60) * Math.PI * 2 * -1 * -1; this.hourH.rotation.z = -(((mins / 60) % 12) / 12) * Math.PI * 2;
    this.minH.rotation.z = -((mins % 60) / 60) * Math.PI * 2;
    CLOCK.mins = mins;
    // curtains: closed at night, open by day; shot 19 opens them on "live"
    const open = id === 19 ? clamp01((t - 69.1) / 0.9) : night ? 0.1 : 1;
    this.curtL.scale.x = 1 - 0.62 * open; this.curtR.scale.x = 1 - 0.62 * open;
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
      const [w, hgt, k] = p.size ?? [300, 500, 0.5];
      a.r = this.pool.req(p.key, w, hgt, k, p.draw);
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
    void STORE; void PIER_X; void PIER_L; void PIER_Y; void PORCH;
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
  float rip2 = sin(vWP.x * 0.13 - wTime * 0.4 + vWP.z * 0.07) * sin(vWP.z * 0.11 + wTime * 0.5);
  wc = mix(wc, wCrest, smoothstep(0.8, 0.98, rip) * 0.45 * (1.0 - smoothstep(60.0, 260.0, wd)));
  wc = mix(wc, wTrough, smoothstep(0.6, 0.95, rip2) * 0.25);
  diffuseColor.rgb = wc;`;
