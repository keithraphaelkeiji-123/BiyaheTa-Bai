// "Twice" as one three.js scene: sky, a 1945 street of wooden houses with tiled roofs and a shipyard with cranes, the
// bomber, the distant cloud, and four small interiors far from the street (air-raid shelter, train carriage, office,
// map table). update(id, f, camera) is a pure function of id + f.
import * as THREE from "three";
import { Batch, boxGeo, V, lam, quad, tri, Kit } from "./build";
import { ctex, cloudHD, planksHD, roofHD, rng } from "./paint";
import { LIGHTS, LOOK, LightPreset, LName } from "./lights";
import { TONE, CHAR, LFB, untone, twoTone } from "./shade";
import { NOINK } from "./ink";
import { CARD_K } from "./cardshade";
import { Pool, Actor, Fx, stage } from "./cast";
import { FPS, SHOTS, STREET_W, CLOUD, SHELTER, TRAIN, OFFICE, MAPT, TREE, BENCH, FLASHES, cloudK, camAt, ShotDef, clamp01, smooth } from "./story";

export const loadKit = () => Promise.resolve({} as Kit);
const col = (c: string) => lam("c" + c, () => ({ color: c }));
const mesh = (g: THREE.BufferGeometry, m: THREE.Material, parent: THREE.Object3D, cast = true) => { const o = new THREE.Mesh(g, m); o.castShadow = cast; o.receiveShadow = true; parent.add(o); return o; };
const bx = (b: Batch, m: THREE.Material, x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, tile = 0) => b.add(boxGeo(V(x0, y0, z0), V(x1, y1, z1), tile), m);
const glowM = (r: number, g: number, b: number) => new THREE.MeshBasicMaterial({ color: new THREE.Color(r, g, b), fog: false });
const dirtTex = (key: string, base: string) => ctex(key, 512, 512, (g, r) => {
  g.fillStyle = base; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 500; i++) { g.fillStyle = r() > 0.5 ? "rgba(255,255,255,0.06)" : "rgba(60,40,20,0.08)"; g.beginPath(); g.ellipse(r() * 512, r() * 512, 3 + r() * 14, 2 + r() * 8, r() * 3, 0, 7); g.fill(); }
});
const jpWall = (key: string, plaster: string, wood: string) => ctex(key, 512, 512, (g, r) => {
  g.fillStyle = plaster; g.fillRect(0, 0, 512, 300);
  g.fillStyle = wood; g.fillRect(0, 300, 512, 212);
  for (let x = 0; x < 512; x += 16) { g.fillStyle = "rgba(0,0,0,0.12)"; g.fillRect(x, 300, 2, 212); }
  g.fillStyle = "#3a2618"; for (const x of [0, 168, 336, 504]) g.fillRect(x, 0, 10, 512); g.fillRect(0, 292, 512, 12); g.fillRect(0, 0, 512, 10);
  for (const x0 of [40, 210]) { g.fillStyle = "#f4ecd8"; g.fillRect(x0, 70, 110, 160); g.strokeStyle = "#3a2618"; g.lineWidth = 4; g.strokeRect(x0, 70, 110, 160); g.lineWidth = 2; for (let k = 1; k < 4; k++) { g.beginPath(); g.moveTo(x0 + k * 27.5, 70); g.lineTo(x0 + k * 27.5, 230); g.stroke(); } for (let k = 1; k < 5; k++) { g.beginPath(); g.moveTo(x0, 70 + k * 32); g.lineTo(x0 + 110, 70 + k * 32); g.stroke(); } }
  for (let i = 0; i < 30; i++) { g.fillStyle = `rgba(90,70,50,${0.03 + r() * 0.05})`; g.beginPath(); g.ellipse(r() * 512, r() * 300, 20 + r() * 40, 10 + r() * 20, 0, 0, 7); g.fill(); }
});
const mapTex = () => ctex("kyushuMap", 1024, 704, (g) => {
  g.fillStyle = "#3d7fb5"; g.fillRect(0, 0, 1024, 704);
  g.strokeStyle = "rgba(255,255,255,0.12)"; g.lineWidth = 2; for (let x = 0; x < 1024; x += 64) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 704); g.stroke(); } for (let y = 0; y < 704; y += 64) { g.beginPath(); g.moveTo(0, y); g.lineTo(1024, y); g.stroke(); }
  const land = (pts: [number, number][]) => { g.fillStyle = "#d9c79a"; g.strokeStyle = "#5a4a30"; g.lineWidth = 6; g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); g.fill(); g.stroke(); };
  land([[560, 120], [700, 90], [760, 170], [720, 330], [760, 470], [690, 640], [560, 690], [470, 600], [430, 520], [330, 470], [280, 400], [350, 330], [420, 300], [470, 210]]); // Kyushu
  land([[600, 20], [1024, 0], [1024, 170], [860, 140], [700, 60]]); // tip of Honshu
  g.fillStyle = "#b9d99a"; g.beginPath(); g.ellipse(560, 420, 90, 140, 0.2, 0, 7); g.fill();
  const city = (x: number, y: number, name: string) => { g.fillStyle = "#c8323a"; g.beginPath(); g.arc(x, y, 14, 0, 7); g.fill(); g.strokeStyle = "#fff"; g.lineWidth = 4; g.stroke(); g.font = "bold 34px sans-serif"; g.fillStyle = "#241726"; g.fillText(name, x + 22, y + 12); };
  city(640, 150, "KOKURA"); city(330, 450, "NAGASAKI");
});
const landTex = () => ctex("trainLand", 1024, 256, (g, r) => {
  const sky = g.createLinearGradient(0, 0, 0, 120); sky.addColorStop(0, "#7fb8e8"); sky.addColorStop(1, "#cfe6f6"); g.fillStyle = sky; g.fillRect(0, 0, 1024, 256);
  g.fillStyle = "#6a8aa8"; g.beginPath(); g.moveTo(0, 130); for (let x = 0; x <= 1024; x += 64) g.lineTo(x, 90 + 40 * Math.sin(x * 0.013) + 15 * Math.sin(x * 0.05)); g.lineTo(1024, 256); g.lineTo(0, 256); g.fill();
  g.fillStyle = "#7aa84c"; g.fillRect(0, 150, 1024, 106);
  for (let i = 0; i < 40; i++) { g.fillStyle = ["#5a8f3a", "#8fbf5a", "#6aa04a"][i % 3]; g.fillRect(r() * 1024, 150 + r() * 90, 60 + r() * 120, 8 + r() * 18); }
  for (let i = 0; i < 14; i++) { const x = r() * 1024; g.fillStyle = "#3f6f2f"; g.beginPath(); g.arc(x, 150, 18 + r() * 14, Math.PI, 0); g.fill(); }
});
const discTex = () => ctex("flashDisc", 128, 128, (g) => { const gr = g.createRadialGradient(64, 64, 10, 64, 64, 64); gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); });
const flashAt = (f: number) => Math.max(0, ...FLASHES.map(([f0, len]) => (f >= f0 - 2 && f < f0 + len ? Math.exp((-3.2 * Math.max(0, f - f0)) / len) : 0)));

export class World {
  root = new THREE.Group();
  private pool = new Pool(); private actors: Actor[] = []; private fxs: Fx[] = [];
  private hemi: THREE.HemisphereLight; private sun: THREE.DirectionalLight;
  private sky: THREE.Mesh; private skyMat: THREE.ShaderMaterial; private fog = new THREE.Fog("#bccbec", 25, 420);
  private disc: THREE.Sprite; private sunCache = new Map<number, THREE.Vector3>();
  private cloudMaps: Record<LName, THREE.Texture[]>; private clouds: THREE.Mesh[] = [];
  private street = new THREE.Group(); private shelter = new THREE.Group(); private train = new THREE.Group(); private office = new THREE.Group(); private mapRoom = new THREE.Group();
  private plane = new THREE.Group(); private mush = new THREE.Group(); private mushGlow: THREE.Mesh; private blossom = new THREE.Group();
  private landTex: THREE.Texture; private winGlow: THREE.Mesh; private toy = new THREE.Group(); private lamps: THREE.Mesh[] = [];
  private frustum = new THREE.Frustum(); private m4 = new THREE.Matrix4(); private v = new THREE.Vector3(); private sph = new THREE.Sphere();

  constructor(_kit: Kit, shadowSize = 4096) {
    const R = this.root;
    this.skyMat = new THREE.ShaderMaterial({
      uniforms: { c0: { value: new THREE.Color() }, c1: { value: new THREE.Color() }, c2: { value: new THREE.Color() }, c3: { value: new THREE.Color() }, c4: { value: new THREE.Color() }, e: { value: new THREE.Vector4() }, wash: { value: 0 } },
      vertexShader: "varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
      fragmentShader: `uniform vec3 c0, c1, c2, c3, c4; uniform vec4 e; uniform float wash; varying vec3 vP;
        void main(){ float el = asin(clamp(normalize(vP).y, -1.0, 1.0));
          vec3 c = mix(c0, c1, smoothstep(0.0, e.x, el)); c = mix(c, c2, smoothstep(e.x, e.y, el)); c = mix(c, c3, smoothstep(e.y, e.z, el)); c = mix(c, c4, smoothstep(e.z, e.w, el));
          gl_FragColor = vec4(mix(c, vec3(3.0), wash), 1.0); }`,
      side: THREE.BackSide, depthWrite: false, fog: false,
    });
    this.sky = new THREE.Mesh(new THREE.SphereGeometry(1100, 48, 24), this.skyMat); this.sky.renderOrder = -1; this.sky.frustumCulled = false; this.sky.layers.set(NOINK); R.add(this.sky);
    this.disc = new THREE.Sprite(new THREE.SpriteMaterial({ map: discTex(), color: new THREE.Color(6, 6, 5.5), fog: false, depthWrite: false })); this.disc.frustumCulled = false; this.disc.layers.set(NOINK); R.add(this.disc);
    this.hemi = new THREE.HemisphereLight("#cfe6ff", "#6c5c8c", 1.1);
    this.sun = new THREE.DirectionalLight("#fff0d6", 2.6); this.sun.castShadow = true; this.sun.shadow.mapSize.set(shadowSize, shadowSize); R.add(this.hemi, this.sun, this.sun.target);
    const pal = (k: LName) => LOOK[k].cloud;
    this.cloudMaps = { day: [0, 1, 2, 3].map((k) => cloudHD(k, pal("day"))), golden: [0, 1, 2, 3].map((k) => cloudHD(k, pal("golden"))), night: [0, 1, 2, 3].map((k) => cloudHD(k, pal("night"))), lamp: [0, 1, 2, 3].map((k) => cloudHD(k, pal("night"))) };
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2 + 0.3, d = 620 + (i % 3) * 60, w = 130 + (i % 4) * 30;
      const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: this.cloudMaps.day[i % 4], color: new THREE.Color(1.1, 1.1, 1.1), transparent: true, depthWrite: false, fog: false }));
      m.position.set(Math.cos(a) * d, 90 + (i % 4) * 34, Math.sin(a) * d); m.scale.set(w, w / 2, 1); m.layers.set(NOINK); this.clouds.push(m); R.add(m);
    }

    // ---- the street (1945): dirt road, wooden houses with tiled roofs, poles, the shipyard ----
    const S = this.street, sb = new Batch();
    const road = lam("road45", () => ({ map: dirtTex("road45", "#b39a74") }));
    if (road.map) { road.map.wrapS = road.map.wrapT = THREE.RepeatWrapping; }
    sb.add(quad(V(-80, 0, STREET_W), V(160, 0, STREET_W), V(160, 0, -STREET_W), V(-80, 0, -STREET_W), 60, 4), road);
    bx(sb, lam("earth45", () => ({ map: dirtTex("earth45", "#8f7a5a") })), -400, -0.06, -400, 400, -0.02, 400, 6);
    const roofM = lam("tileRoof", () => ({ map: roofHD("#4a505c", true), side: THREE.DoubleSide }));
    const walls = [jpWall("jw0", "#e8dcc4", "#6a4a30"), jpWall("jw1", "#ded2b8", "#5a3a24"), jpWall("jw2", "#efe4cc", "#7a5638")];
    let k = 0;
    for (const side of [-1, 1]) for (let x = -60; x < 64; k++) {
      const w = 6.5 + (k % 3) * 1.2, ht = k % 3 === 1 ? 6.0 : 3.4, d = 7;
      const wm = lam(`jpw${k % 3}`, () => ({ map: walls[k % 3] }));
      const z0 = side * STREET_W, z1 = side * (STREET_W + d), x0 = x, x1 = x + w, zm = (z0 + z1) / 2;
      bx(sb, wm, x0, 0, Math.min(z0, z1), x1, ht, Math.max(z0, z1));
      const o = 0.8, rh = 1.8;
      sb.add(quad(V(x1 + o, ht - 0.1, z0 - side * o), V(x0 - o, ht - 0.1, z0 - side * o), V(x0 - o, ht + rh, zm), V(x1 + o, ht + rh, zm), 2, 1), roofM);
      sb.add(quad(V(x0 - o, ht - 0.1, z1 + side * o), V(x1 + o, ht - 0.1, z1 + side * o), V(x1 + o, ht + rh, zm), V(x0 - o, ht + rh, zm), 2, 1), roofM);
      sb.add(tri(V(x0, ht, z0), V(x0, ht, z1), V(x0, ht + rh, zm)), col("#3a2618")); sb.add(tri(V(x1, ht, z1), V(x1, ht, z0), V(x1, ht + rh, zm)), col("#3a2618"));
      if (k % 4 === 0) bx(sb, col("#4a3a2a"), x0 + 1, 2.4, z0 - side * 0.8, x1 - 1, 2.55, z0); // little awning
      x += w + 0.4;
    }
    for (let x = -50; x < 70; x += 16) { bx(sb, col("#5a4a3a"), x - 0.12, 0, STREET_W - 1.0, x + 0.12, 8, STREET_W - 0.76); bx(sb, col("#5a4a3a"), x - 1.1, 7.2, STREET_W - 1.0, x + 1.1, 7.35, STREET_W - 0.76); }
    // shipyard at the east end: two cranes, a hull on the slipway, the harbour
    const crane = col("#9a4a32");
    for (const [cx, cz] of [[80, -4], [98, 5]]) {
      for (const [a, b] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) bx(sb, crane, cx + a * 1.6 - 0.2, 0, cz + b * 1.6 - 0.2, cx + a * 1.6 + 0.2, 26, cz + b * 1.6 + 0.2);
      for (let y = 3; y < 26; y += 3) bx(sb, crane, cx - 1.8, y, cz - 1.8, cx + 1.8, y + 0.25, cz + 1.8);
      bx(sb, crane, cx - 14, 26, cz - 0.6, cx + 8, 27.4, cz + 0.6); bx(sb, col("#3a3d47"), cx - 13, 18, cz - 0.05, cx - 12.9, 26, cz + 0.05);
    }
    bx(sb, col("#5a6270"), 82, 0, -2.5, 116, 7, 2.5); bx(sb, col("#8a4a32"), 82, 0, -2.6, 116, 2, 2.6);
    sb.build(S);
    const wM = new THREE.MeshLambertMaterial({ color: "#3d6f9a" }); const sea = new THREE.Mesh(new THREE.PlaneGeometry(2000, 2000).rotateX(-Math.PI / 2).translate(1120, -0.8, 0), wM); S.add(sea);
    // cherry tree + bench (only in the old-age shots)
    const tb = new Batch();
    tb.add(new THREE.CylinderGeometry(0.22, 0.34, 3.2, 8).translate(TREE[0], 1.6, TREE[2]), col("#5a3a2a"));
    const rr = rng(5);
    for (let i = 0; i < 14; i++) tb.add(new THREE.IcosahedronGeometry(0.8 + rr() * 0.6, 2).translate(TREE[0] + (rr() - 0.5) * 3.6, 3.4 + rr() * 1.8, TREE[2] + (rr() - 0.5) * 3.6), col(["#ffc8e8", "#ffe0f0", "#f8b4dc"][i % 3]));
    bx(tb, col("#8a5a3c"), BENCH[0] - 1.0, 0.42, BENCH[2] - 0.25, BENCH[0] + 1.0, 0.5, BENCH[2] + 0.25); for (const s of [-1, 1]) bx(tb, col("#5a3a2a"), BENCH[0] + s * 0.9 - 0.05, 0, BENCH[2] - 0.2, BENCH[0] + s * 0.9 + 0.05, 0.42, BENCH[2] + 0.2);
    tb.build(this.blossom); S.add(this.blossom);
    // the bomber (high, small) and the distant cloud
    const pb = new Batch(), al = col("#c9ced4");
    pb.add(new THREE.CylinderGeometry(1.4, 1.1, 30, 12).rotateZ(Math.PI / 2), al); pb.add(new THREE.SphereGeometry(1.4, 12, 8).translate(15, 0, 0), al);
    bx(pb, al, -3, -0.2, -21, 3, 0.2, 21); bx(pb, al, -15, -0.15, -6, -11, 0.15, 6); bx(pb, al, -15, 0, -0.15, -11, 5, 0.15);
    for (const z of [-12, -6, 6, 12]) pb.add(new THREE.CylinderGeometry(0.6, 0.6, 3, 8).rotateZ(Math.PI / 2).translate(1.5, -0.6, z), col("#5a6270"));
    pb.build(this.plane); S.add(this.plane);
    const cm = (c: string) => lam("cloud" + c, () => ({ color: c }));
    const mb = new Batch();
    for (let i = 0; i < 9; i++) mb.add(new THREE.IcosahedronGeometry(9 - i * 0.3, 1).translate(Math.sin(i * 2.1) * 2, 8 + i * 11, Math.cos(i * 2.1) * 2), cm(i % 2 ? "#d8cbb4" : "#c9b9a0"));
    for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2; mb.add(new THREE.IcosahedronGeometry(16 + (i % 3) * 3, 1).translate(Math.cos(a) * 26, 112 + (i % 2) * 8, Math.sin(a) * 26), cm(["#e8dccb", "#d8cbb4", "#c9b9a0"][i % 3])); }
    for (let i = 0; i < 6; i++) mb.add(new THREE.IcosahedronGeometry(22, 1).translate(Math.cos(i) * 10, 130 + i * 3, Math.sin(i) * 10), cm("#eee4d4"));
    for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2; mb.add(new THREE.IcosahedronGeometry(10, 1).translate(Math.cos(a) * 34, 4, Math.sin(a) * 34), cm("#b9a88e")); }
    mb.build(this.mush, false);
    this.mushGlow = new THREE.Mesh(new THREE.SphereGeometry(14, 16, 12), glowM(4, 1.6, 0.4)); this.mushGlow.position.y = 100; this.mushGlow.layers.set(NOINK); this.mush.add(this.mushGlow);
    this.mush.position.set(...CLOUD); S.add(this.mush);
    R.add(S);

    // ---- air-raid shelter (dug into the earth, one lamp) ----
    const Sh = this.shelter, shb = new Batch(), earth = lam("shelterEarth", () => ({ map: dirtTex("shelterEarth", "#6a5238") }));
    bx(shb, earth, -3, -0.2, -3, 3, 0, 3, 1.5); bx(shb, earth, -3, 0, 2.2, 3, 2.4, 2.6, 1.5); bx(shb, earth, -3.2, 0, -3, -2.8, 2.4, 2.6, 1.5); bx(shb, earth, 2.8, 0, -3, 3.2, 2.4, 2.6, 1.5); bx(shb, earth, -3, 2.4, -3, 3, 2.7, 2.6, 1.5);
    for (const x of [-2, 0, 2]) { bx(shb, col("#5a3a24"), x - 0.1, 0, 2.0, x + 0.1, 2.4, 2.2); bx(shb, col("#5a3a24"), x - 0.12, 2.25, -3, x + 0.12, 2.4, 2.6); }
    bx(shb, col("#7a5638"), -2.2, 0.38, 1.4, 2.2, 0.46, 1.9); for (const x of [-2, 0, 2]) bx(shb, col("#5a3a24"), x - 0.05, 0, 1.45, x + 0.05, 0.38, 1.85);
    shb.build(Sh);
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8), glowM(5, 3, 1.1)); lamp.position.set(0.6, 1.9, 1.6); lamp.layers.set(NOINK); Sh.add(lamp); this.lamps.push(lamp);
    Sh.position.set(...SHELTER); R.add(Sh);

    // ---- train carriage (windows on the far wall, the countryside scrolling past) ----
    const Tr = this.train, trb = new Batch(), wood = lam("carWood", () => ({ map: planksHD() })), green = col("#4f7a5a"), cream = col("#efe4cc");
    bx(trb, wood, -6, -0.2, -2, 6, 0, 1.6, 2);
    for (let x = -6; x < 6; x += 1.6) { bx(trb, cream, x, 0, 1.6, x + 0.4, 2.6, 1.75); }
    bx(trb, cream, -6, 0, 1.6, 6, 0.95, 1.75); bx(trb, cream, -6, 1.85, 1.6, 6, 2.6, 1.75); bx(trb, cream, -6, 2.6, -2, 6, 2.75, 1.75);
    for (let x = -5.4; x < 6; x += 1.6) { bx(trb, green, x, 0.38, 0.75, x + 1.2, 0.48, 1.4); bx(trb, green, x, 0.48, 1.3, x + 1.2, 1.0, 1.42); }
    trb.build(Tr);
    this.landTex = landTex(); this.landTex.wrapS = THREE.RepeatWrapping; this.landTex.repeat.set(2, 1);
    const land = new THREE.Mesh(new THREE.PlaneGeometry(40, 10).translate(0, 2, 8).rotateY(Math.PI), new THREE.MeshBasicMaterial({ map: this.landTex, fog: false })); land.layers.set(NOINK); land.rotation.y = Math.PI; land.position.z = 0; Tr.add(land);
    land.geometry = new THREE.PlaneGeometry(40, 10).translate(0, 2, 0); land.rotation.y = Math.PI; land.position.set(0, 0, 8);
    Tr.position.set(...TRAIN); R.add(Tr);

    // ---- the office in Nagasaki: wood panels, a big window, desks ----
    const Of = this.office, ob = new Batch(), panel = lam("officePanel", () => ({ map: jpWall("officeWall", "#e8e0cc", "#6a4a30") }));
    bx(ob, lam("officeFloor", () => ({ map: planksHD() })), -5, -0.2, -3, 5, 0, 4.2, 2);
    bx(ob, panel, -5, 0, 4, -1.7, 3, 4.2, 3); bx(ob, panel, 1.7, 0, 4, 5, 3, 4.2, 3); bx(ob, panel, -1.7, 0, 4, 1.7, 1.0, 4.2, 3); bx(ob, panel, -1.7, 2.6, 4, 1.7, 3, 4.2, 3);
    bx(ob, panel, -5.2, 0, -3, -5, 3, 4.2, 3); bx(ob, panel, 5, 0, -3, 5.2, 3, 4.2, 3);
    for (const x of [-1.7, -0.6, 0.5, 1.6]) bx(ob, col("#3a2618"), x - 0.04, 1.0, 3.96, x + 0.06, 2.6, 4.02); bx(ob, col("#3a2618"), -1.7, 1.75, 3.96, 1.7, 1.83, 4.02);
    const desk = col("#7a4a2a");
    bx(ob, desk, 0.1, 0.72, 1.95, 1.7, 0.78, 2.75); bx(ob, desk, 0.1, 0, 1.95, 1.7, 0.72, 2.05);
    for (const [x, z] of [[-3.2, 0.2], [3.2, 0.6]]) { bx(ob, desk, x - 0.7, 0.72, z - 0.4, x + 0.7, 0.78, z + 0.4); bx(ob, desk, x - 0.7, 0, z - 0.4, x - 0.62, 0.72, z + 0.4); bx(ob, desk, x + 0.62, 0, z - 0.4, x + 0.7, 0.72, z + 0.4); }
    for (let i = 0; i < 3; i++) ob.add(new THREE.PlaneGeometry(0.22, 0.3).rotateX(-Math.PI / 2).rotateY(i * 0.3).translate(0.5 + i * 0.3, 0.785, 2.3), col("#fbf8ef"));
    ob.build(Of);
    this.winGlow = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 1.6).rotateY(Math.PI).translate(0, 1.8, 4.6), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.7, 0.85, 1), fog: false })); this.winGlow.layers.set(NOINK); Of.add(this.winGlow);
    Of.position.set(...OFFICE); R.add(Of);

    // ---- the map table (dark room, one lamp) ----
    const Mr = this.mapRoom, mrb = new Batch(), dark = lam("mapWall", () => ({ map: jpWall("mapWallTex", "#5a5060", "#3a3040") }));
    bx(mrb, lam("mapFloor", () => ({ map: planksHD() })), -5, -0.2, -4, 5, 0, 4, 2); bx(mrb, dark, -5, 0, 2.5, 5, 3.2, 2.7, 3); bx(mrb, dark, -5.2, 0, -4, -5, 3.2, 2.7, 3);
    bx(mrb, col("#6a4028"), -1.0, 0.8, -0.65, 1.0, 0.88, 0.65); for (const [a, b] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) bx(mrb, col("#4a2a18"), a * 0.92 - 0.05, 0, b * 0.57 - 0.05, a * 0.92 + 0.05, 0.8, b * 0.57 + 0.05);
    mrb.add(new THREE.PlaneGeometry(1.8, 1.24).rotateX(-Math.PI / 2).rotateY(Math.PI).translate(0, 0.885, 0), lam("kyushuMap", () => ({ map: mapTex() })));
    mrb.build(Mr);
    const tp = new Batch(); tp.add(new THREE.CylinderGeometry(0.018, 0.014, 0.16, 8).rotateZ(Math.PI / 2), col("#c9ced4")); bx(tp, col("#c9ced4"), -0.02, -0.004, -0.11, 0.02, 0.004, 0.11); bx(tp, col("#c9ced4"), -0.075, 0, -0.035, -0.06, 0.03, 0.035); tp.build(this.toy); Mr.add(this.toy);
    const ml = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 8), glowM(5, 2.8, 0.9)); ml.position.set(0, 2.2, 0); ml.layers.set(NOINK); Mr.add(ml); this.lamps.push(ml);
    mesh(new THREE.ConeGeometry(0.4, 0.3, 20, 1, true).translate(0, 2.35, 0), lam("mapShade", () => ({ color: "#2f3540", side: THREE.DoubleSide })), Mr, false);
    Mr.position.set(...MAPT); R.add(Mr);
  }

  private shotSun(id: number, s: ShotDef, L: LightPreset) {
    let v = this.sunCache.get(id); if (v) return v;
    let fx = 0, fz = 0;
    for (let f = s.a; f < s.b; f += 3) { const c = camAt(id, f), x = c.look[0] - c.pos[0], z = c.look[2] - c.pos[2], n = Math.hypot(x, z) || 1; fx += x / n; fz += z / n; }
    const n = Math.hypot(fx, fz) || 1; fx /= n; fz /= n;
    const az = THREE.MathUtils.degToRad(s.sunAz ?? L.az), el = THREE.MathUtils.degToRad(s.sunEl ?? L.el);
    v = new THREE.Vector3((fx * Math.cos(az) - fz * Math.sin(az)) * Math.cos(el), Math.sin(el), (fz * Math.cos(az) + fx * Math.sin(az)) * Math.cos(el)).normalize();
    this.sunCache.set(id, v); return v;
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
    const sunDir = this.shotSun(id, s, L), fl = flashAt(f);
    this.hemi.color.set(L.sky); this.hemi.groundColor.set(L.ground); this.hemi.intensity = L.hemiI;
    this.sun.color.set(L.sunCol); this.sun.intensity = L.sunI;
    const Rr = s.set === "street" ? THREE.MathUtils.clamp(dist * 1.15 + 9, 8, 90) : 7;
    this.sun.position.copy(focus).addScaledVector(sunDir, 300); this.sun.target.position.copy(focus);
    const sc = this.sun.shadow.camera; sc.left = -Rr; sc.right = Rr; sc.top = Rr; sc.bottom = -Rr; sc.near = 20; sc.far = 600; sc.updateProjectionMatrix();
    this.sun.shadow.bias = L.bias; this.sun.shadow.normalBias = L.normalBias * (Rr / 12);
    TONE.uLitCol.value.set(...L.lit).multiplyScalar(1 + 1.5 * fl); TONE.uShadeCol.value.set(...L.shade).multiplyScalar(1 + 3 * fl); TONE.uShadeLift.value.set(...L.lift);
    TONE.uLambert.value = L.lambert; TONE.uSideK.value = L.sideK; TONE.uTerm.value = L.term; TONE.uBounce.value.set(...K.bounce); TONE.uSat.value = K.sat;
    CHAR.uCharTint.value.set(...L.charTint); CHAR.uCharShade.value = L.charShade; CHAR.uGrad.value = L.charGrad; CHAR.uBodyGrad.value = L.bodyGrad; CHAR.uSideTint.value.set(...L.sideTint);
    CARD_K.uGain.value = (s.light === "lamp" ? 0.97 : 1.03) * (1 + 0.8 * fl);
    const su = this.skyMat.uniforms;
    K.sky.c.forEach((hx, i) => untone(hx, su["c" + i].value));
    const e = K.sky.e.map((deg) => THREE.MathUtils.degToRad(deg)); su.e.value.set(e[1], e[2], e[3], e[4]); su.wash.value = fl;
    this.sky.position.copy(cam.position);
    untone(L.fog, this.fog.color); this.fog.near = L.fogNear; this.fog.far = s.set === "street" ? 700 : L.fogFar;
    if (s.set === "shelter" || s.set === "map") { this.fog.near = 3; this.fog.far = 18; this.fog.color.setRGB(0.05, 0.045, 0.06); }
    scene.fog = this.fog; scene.background = null;
    for (let i = 0; i < this.clouds.length; i++) { const m = this.clouds[i]; m.visible = s.set === "street"; m.lookAt(cam.position.x, m.position.y, cam.position.z); (m.material as THREE.MeshBasicMaterial).map = this.cloudMaps[s.light][i % 4]; }
    // sets
    this.street.visible = s.set === "street"; this.shelter.visible = s.set === "shelter"; this.train.visible = s.set === "train"; this.office.visible = s.set === "office"; this.mapRoom.visible = s.set === "map";
    this.blossom.visible = !!s.old;
    // the flash: a white disc at the cloud's place, the sky washed white
    this.disc.visible = s.set === "street" && fl > 0.02;
    if (this.disc.visible) { this.disc.position.set(CLOUD[0], 90, CLOUD[2]); this.disc.scale.setScalar(900 * fl + 200); }
    // the bomber crosses overhead in shot 6
    this.plane.visible = id === 6 && t > 17.0 && t < 20.8;
    if (this.plane.visible) { const u = (t - 17.0) / 3.8; this.plane.position.set(-120 + 260 * u, 95, -30 + 20 * u); this.plane.rotation.set(0, 0.08, 0); }
    // the distant cloud grows after each bomb
    const ck = s.cloudAt ? cloudK(tau - s.cloudAt) : id === 6 && tau > 19.95 ? cloudK(tau - 19.95) : 0;
    this.mush.visible = ck > 0.01 && s.set === "street";
    if (this.mush.visible) { this.mush.scale.set(1.7 * (0.4 + 0.6 * ck), 1.7 * (0.15 + 0.85 * ck), 1.7 * (0.4 + 0.6 * ck)); (this.mushGlow.material as THREE.MeshBasicMaterial).color.setRGB(4 * (1 - 0.7 * ck), 1.6 * (1 - 0.7 * ck), 0.4); }
    // train landscape scrolls; office window flashes
    this.landTex.offset.x = t * 0.35;
    const wf = id === 13 ? flashAt(f) : id === 3 ? flashAt(f) : 0;
    (this.winGlow.material as THREE.MeshBasicMaterial).color.setRGB(0.7 + 5 * wf, 0.85 + 5 * wf, 1 + 4.5 * wf);
    // the toy plane on the map: circling over Kokura, then gliding to Nagasaki
    if (s.set === "map") {
      const K0: [number, number] = [-0.225, 0.356], N0: [number, number] = [0.32, -0.17];
      const g = smooth((t - 51.7) / 1.8), a = t * 2.2;
      const x = (K0[0] + 0.07 * Math.cos(a)) * (1 - g) + N0[0] * g, z = (K0[1] + 0.07 * Math.sin(a)) * (1 - g) + N0[1] * g;
      this.toy.position.set(x, 1.05, z); this.toy.rotation.set(0, g > 0.02 && g < 0.98 ? Math.atan2(-(N0[1] - K0[1]), N0[0] - K0[0]) : -a - Math.PI / 2, 0);
    }
    for (const m of this.lamps) m.visible = true;
    // cast + effects
    const right = V(0, 0, 0).setFromMatrixColumn(cam.matrixWorld, 0);
    const st = stage(id, t, { pos: cam.position, right, sun: sunDir });
    this.frustum.setFromProjectionMatrix(this.m4.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse));
    let ai = 0; const used: Actor[] = [];
    for (const p of st.places) {
      const sc2 = p.scale ?? 1;
      if (!this.frustum.intersectsSphere(this.sph.set(this.v.set(p.x, p.y + 1.1 * sc2, p.z), 3.5))) continue;
      const a = this.actor(ai++); const [w, hgt, kk] = p.size ?? [300, 500, 0.5];
      a.r = this.pool.req(p.key, w, hgt, kk, p.draw); a.mesh.visible = true; a.mesh.position.set(p.x, p.y, p.z);
      a.mesh.rotation.set(0, p.yaw ?? Math.atan2(cam.position.x - p.x, cam.position.z - p.z), p.roll ?? 0);
      a.mesh.scale.set(p.mirror ? -sc2 : sc2, sc2, sc2); a.mesh.castShadow = L.actorShadow; used.push(a);
    }
    for (let i = ai; i < this.actors.length; i++) this.actors[i].mesh.visible = false;
    let fi = 0; const fused: Fx[] = [];
    for (const p of st.fx) {
      if (!this.frustum.intersectsSphere(this.sph.set(this.v.set(p.x, p.y, p.z), Math.max(p.w, p.h)))) continue;
      const e2 = this.fx(fi++); e2.r = this.pool.req(p.key, p.cw, p.ch, 1, p.draw);
      e2.use(!!p.soft); e2.mesh.visible = true; e2.mesh.position.set(p.x, p.y, p.z);
      if (p.flat) e2.mesh.rotation.set(-Math.PI / 2, 0, p.rot ?? 0); else { e2.mesh.quaternion.copy(cam.quaternion); e2.mesh.rotateZ(p.rot ?? 0); }
      e2.mesh.scale.set(p.w, p.h, 1); fused.push(e2);
    }
    for (let i = fi; i < this.fxs.length; i++) this.fxs[i].mesh.visible = false;
    this.pool.flush(); for (const a of used) a.bind(); for (const e3 of fused) e3.bind();
    void clamp01; void twoTone; void mesh;
    return focus;
  }
}
