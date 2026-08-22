// The At-rest vault. One scene, one point: what a backup must really
// survive. Seeds alone cannot recover a multisig; the descriptor plate
// makes that visible.

import * as THREE from "three";
import { speak, presentTool } from "./butler.js?v=4";
import { SCRIPTS, emptyWalletLines } from "./script.js?v=2";
import { WORDS } from "./vendor/bip39-en.js";
import { masterFromMnemonic } from "./vendor/bip32.js";
import {
  setupPhysicalRenderer,
  brushedMetal,
  blackMetal,
  honedStone,
  castRealisticShadows
} from "./visuals.js?v=5";

// real BIP-39 checksum: 12 words = 128 bits entropy + 4-bit checksum
// the 12th word carries the checksum: 7 entropy bits + 4 checksum bits.
// For any first 11 words there are exactly 128 valid final words.
async function validLastWords(first11){
  const idx = first11.map(w => WORDS.indexOf(w));
  if (idx.some(i => i < 0)) return [];
  let bits = "";
  for (const i of idx) bits += i.toString(2).padStart(11, "0"); // 121 bits
  const out = [];
  for (let v = 0; v < 128; v++){
    const ent = bits + v.toString(2).padStart(7, "0"); // 128 bits
    const bytes = new Uint8Array(16);
    for (let i = 0; i < 16; i++) bytes[i] = parseInt(ent.slice(i*8, i*8+8), 2);
    const h = new Uint8Array(await crypto.subtle.digest("SHA-256", bytes));
    const cs = h[0] >> 4;
    out.push(WORDS[(v << 4) | cs]);
  }
  return out;
}
async function validMnemonic(ws){
  const idx = ws.map(w => WORDS.indexOf(w));
  if (idx.some(i => i < 0)) return false;
  let bits = "";
  for (const i of idx) bits += i.toString(2).padStart(11, "0");
  const ent = bits.slice(0, 128), cs = bits.slice(128);
  const bytes = new Uint8Array(16);
  for (let i = 0; i < 16; i++) bytes[i] = parseInt(ent.slice(i*8, i*8+8), 2);
  const h = new Uint8Array(await crypto.subtle.digest("SHA-256", bytes));
  return cs === h[0].toString(2).padStart(8, "0").slice(0, 4);
}

const SCRIPT_PRESETS = {
  single: {
    legacy: { path: "m/44'/0'/0'", label: "Legacy P2PKH" },
    nested: { path: "m/49'/0'/0'", label: "Nested SegWit" },
    segwit: { path: "m/84'/0'/0'", label: "Native SegWit" },
    taproot: { path: "m/86'/0'/0'", label: "Single-key Taproot" }
  },
  multi: {
    nested: { path: "m/48'/0'/0'/1'", label: "Nested multisig compatibility" },
    segwit: { path: "m/48'/0'/0'/2'", label: "Native multisig compatibility" }
  }
};
const state = { fmt: "bip39", sig: "single", ven: "one", hasDescriptor: false,
  pass: "", path: SCRIPT_PRESETS.single.segwit.path, scr: "segwit" };
// A published BIP test vector used only to verify deterministic wallet identity:
// these words, no passphrase, m/84'/0'/0', native SegWit. No balance is implied.
const TRUE_WORDS = ["abandon","abandon","abandon","abandon","abandon","abandon",
  "abandon","abandon","abandon","abandon","abandon","about"];
let words = TRUE_WORDS.slice();
let wordsValid = true, wordsMatch = true;
const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

// ---------- renderer / camera ----------
const canvas = document.getElementById("c");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0c0f14);
scene.fog = new THREE.Fog(0x0c0f14, 14, 30);
setupPhysicalRenderer(THREE, renderer, scene, 1.16);
const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 60);
let yaw = 0, pitch = 0.35, dist = 11, yawT = 0;
// the frame: what the camera and the light are giving to the visitor
const look = new THREE.Vector3(0, 1.2, 0);
const lookT = new THREE.Vector3(0, 1.2, 0);
let distT = 11;
const OVERVIEW = { p: new THREE.Vector3(0, 1.2, 0), d: 11 };
function frame(p, d){ lookT.copy(p); distT = d; }
function placeCamera(){
  const d = dist * aspectPull;
  camera.position.set(
    look.x + Math.sin(yaw)*d*Math.cos(pitch),
    look.y + 1.8 + Math.sin(pitch)*d*0.6,
    look.z + Math.cos(yaw)*d*Math.cos(pitch));
  camera.lookAt(look);
}
let aspectPull = 1;
function resize(){
  renderer.setSize(innerWidth, innerHeight, false);
  camera.aspect = innerWidth/innerHeight; camera.updateProjectionMatrix();
  aspectPull = camera.aspect < 1 ? 1.45 : 1;
}
addEventListener("resize", resize); resize();

// ---------- lights ----------
const amb = new THREE.AmbientLight(0x6a7484, 0.56); scene.add(amb);
// the follow spot: whatever it holds is the one thing in focus
const spot = new THREE.SpotLight(0xfff2cf, 0, 22, Math.PI/8, 0.35, 1.5);
spot.position.set(0, 9, 6); scene.add(spot, spot.target);
let focusObj = null;
function focusOn(obj, d = 5.5){
  focusObj = obj;
  if (obj){ frame(obj.position, d); }
  else frame(OVERVIEW.p, OVERVIEW.d);
}
const rim = new THREE.PointLight(0xfbdc7b, 90, 34); rim.position.set(4, 7, 3); scene.add(rim);
const cool = new THREE.PointLight(0x4a6a9a, 40, 28); cool.position.set(-6, 5, -2); scene.add(cool);
const key = new THREE.SpotLight(0xfff4d6, 260, 30, Math.PI/5, 0.45, 1.4);
key.position.set(0, 11, 4); key.target.position.set(0, 0, 1);
key.castShadow = true; key.shadow.mapSize.set(1024,1024);
scene.add(key, key.target);
const doorSpot = new THREE.SpotLight(0xfbdc7b, 140, 28, Math.PI/7, 0.5, 1.6);
doorSpot.position.set(0, 9, -6); doorSpot.target.position.set(0, 3.4, -13);
scene.add(doorSpot, doorSpot.target);

// ---------- room ----------
const floor = new THREE.Mesh(new THREE.CircleGeometry(14, 64),
  honedStone(THREE, 0x10141b));
floor.rotation.x = -Math.PI/2; floor.receiveShadow = true; scene.add(floor);
// inlaid gold ring on the floor
const ring = new THREE.Mesh(new THREE.RingGeometry(5.6, 5.75, 96),
  brushedMetal(THREE, 0xd8b354, 0.2));
ring.material.emissive = new THREE.Color(0x46380e);
ring.material.emissiveIntensity = 0.16;
ring.rotation.x = -Math.PI/2; ring.position.y = 0.01; scene.add(ring);
// curved back wall
const wallMat = honedStone(THREE, 0x141922);
wallMat.side = THREE.BackSide;
const wall = new THREE.Mesh(new THREE.CylinderGeometry(13.5, 13.5, 12, 48, 1, true), wallMat);
wall.position.y = 6; scene.add(wall);
// The vault door is a working mechanical landmark: housing, jamb, hinges,
// locking dogs, wheel, and a deep strongroom behind it.
const steel = brushedMetal(THREE, 0x66707b, 0.2);
const darkSteel = blackMetal(THREE, 0x252c35, 0.26);
const edgeSteel = brushedMetal(THREE, 0xaeb5bd, 0.17);
const goldSteel = brushedMetal(THREE, 0xd8b354, 0.18);
goldSteel.emissive = new THREE.Color(0x40330c);
goldSteel.emissiveIntensity = 0.12;
const housingSteel = brushedMetal(THREE, 0x59636e, 0.28);
const vaultHousing = new THREE.Group();
const housingParts = [
  [0, 7.2, -13.3, 9.0, 0.8, 1.5],
  [0, 0.35, -13.3, 9.0, 0.7, 1.5],
  [-4.25, 3.75, -13.3, 0.75, 7.5, 1.5],
  [4.25, 3.75, -13.3, 0.75, 7.5, 1.5]
];
housingParts.forEach(part => {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(part[3], part[4], part[5]),
    housingSteel
  );
  mesh.position.set(part[0], part[1], part[2]);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  vaultHousing.add(mesh);
});
const jamb = new THREE.Mesh(
  new THREE.CylinderGeometry(3.62, 3.62, 1.7, 72, 1, true),
  blackMetal(THREE, 0x333b46, 0.22)
);
jamb.material.side = THREE.DoubleSide;
jamb.rotation.x = Math.PI / 2;
jamb.position.set(0, 3.4, -13.28);
vaultHousing.add(jamb);
const frameRing = new THREE.Mesh(new THREE.TorusGeometry(3.6, 0.38, 24, 96), steel);
frameRing.position.set(0, 3.4, -12.48);
frameRing.castShadow = true;
vaultHousing.add(frameRing);
scene.add(vaultHousing);
castRealisticShadows(vaultHousing);

const vaultTunnel = new THREE.Mesh(
  new THREE.CylinderGeometry(3.18, 3.18, 5.1, 72, 1, true),
  blackMetal(THREE, 0x1d232c, 0.42)
);
vaultTunnel.material.side = THREE.BackSide;
vaultTunnel.rotation.x = Math.PI / 2;
vaultTunnel.position.set(0, 3.4, -15.75);
scene.add(vaultTunnel);
const depositWall = new THREE.Group();
const depositMaterial = brushedMetal(THREE, 0x59616d, 0.24);
for (let row = 0; row < 4; row++){
  for (let col = 0; col < 5; col++){
    const box = new THREE.Mesh(
      new THREE.BoxGeometry(0.8, 0.62, 0.12),
      depositMaterial
    );
    box.position.set((col - 2) * 0.9, 2.25 + row * 0.72, -18.15);
    depositWall.add(box);
    const keyhole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.025, 0.025, 0.025, 10),
      goldSteel
    );
    keyhole.rotation.x = Math.PI / 2;
    keyhole.position.set(box.position.x + 0.24, box.position.y, -18.08);
    depositWall.add(keyhole);
  }
}
castRealisticShadows(depositWall);
scene.add(depositWall);

const doorPivot = new THREE.Group();
const doorG = new THREE.Group();
const wheelG = new THREE.Group();
const doorFace = new THREE.Mesh(
  new THREE.CylinderGeometry(3.34, 3.34, 0.86, 72, 4),
  steel
);
doorFace.rotation.x = Math.PI / 2;
doorFace.castShadow = true;
doorG.add(doorFace);
const innerFace = new THREE.Mesh(
  new THREE.CylinderGeometry(2.62, 2.62, 0.12, 72),
  brushedMetal(THREE, 0x858d96, 0.2)
);
innerFace.rotation.x = Math.PI / 2;
innerFace.position.z = 0.48;
doorG.add(innerFace);
for (const radius of [1.2, 2.15, 2.95]){
  const groove = new THREE.Mesh(
    new THREE.TorusGeometry(radius, 0.045, 10, 72),
    edgeSteel
  );
  groove.position.z = 0.56;
  doorG.add(groove);
}
const doorRim = new THREE.Mesh(
  new THREE.TorusGeometry(3.33, 0.13, 16, 96),
  goldSteel.clone()
);
doorRim.position.z = 0.5;
doorG.add(doorRim);
const hub = new THREE.Mesh(
  new THREE.CylinderGeometry(0.54, 0.54, 0.72, 32),
  goldSteel
);
hub.rotation.x = Math.PI / 2;
hub.position.z = 0.67;
wheelG.add(hub);
const spokeMat = brushedMetal(THREE, 0xd0d5da, 0.16);
for (let i = 0; i < 3; i++){
  const angle = i * Math.PI / 3;
  const spoke = new THREE.Mesh(
    new THREE.CylinderGeometry(0.085, 0.085, 3.0, 14),
    spokeMat
  );
  spoke.rotation.z = angle;
  spoke.position.z = 0.72;
  wheelG.add(spoke);
  for (const direction of [-1, 1]){
    const handle = new THREE.Mesh(
      new THREE.CylinderGeometry(0.13, 0.13, 0.4, 16),
      darkSteel
    );
    handle.rotation.x = Math.PI / 2;
    handle.position.set(
      Math.sin(angle) * 1.5 * direction,
      Math.cos(angle) * 1.5 * direction,
      0.86
    );
    wheelG.add(handle);
  }
}
for (let i = 0; i < 12; i++){
  const angle = i / 12 * Math.PI * 2;
  const bolt = new THREE.Mesh(
    new THREE.CylinderGeometry(0.15, 0.15, 0.75, 16),
    edgeSteel
  );
  bolt.rotation.x = Math.PI / 2;
  bolt.position.set(Math.cos(angle) * 2.82, Math.sin(angle) * 2.82, 0.18);
  doorG.add(bolt);
}
doorG.add(wheelG);
castRealisticShadows(doorG);
for (const y of [-1.85, 0, 1.85]){
  const arm = new THREE.Mesh(
    new THREE.BoxGeometry(1.15, 0.28, 0.42),
    edgeSteel
  );
  arm.position.set(0.55, y, 0.16);
  doorG.add(arm);
}
doorG.position.x = 3.4;
doorPivot.add(doorG);
doorPivot.position.set(-3.4, 3.4, -12.55);
scene.add(doorPivot);
for (const y of [1.55, 3.4, 5.25]){
  const barrel = new THREE.Mesh(
    new THREE.CylinderGeometry(0.23, 0.23, 1.0, 20),
    edgeSteel
  );
  barrel.position.set(-3.58, y, -12.18);
  barrel.castShadow = true;
  scene.add(barrel);
}

const glowDisc = new THREE.Mesh(
  new THREE.CircleGeometry(3.0, 64),
  new THREE.MeshBasicMaterial({ color: 0x8f7735, transparent: true, opacity: 0 })
);
glowDisc.position.set(0, 3.4, -18.25);
scene.add(glowDisc);
const glowLight = new THREE.PointLight(0xfbdc7b, 0, 22);
glowLight.position.set(0, 3.6, -15.2);
scene.add(glowLight);
function vaultStatusTexture(){
  const canvas = document.createElement("canvas");
  canvas.width = 768;
  canvas.height = 420;
  const context = canvas.getContext("2d");
  const gradient = context.createLinearGradient(0, 0, 768, 420);
  gradient.addColorStop(0, "#111821");
  gradient.addColorStop(1, "#070b10");
  context.fillStyle = gradient;
  context.fillRect(0, 0, 768, 420);
  context.strokeStyle = "#FBDC7B";
  context.lineWidth = 12;
  context.strokeRect(16, 16, 736, 388);
  context.textAlign = "center";
  context.fillStyle = "#A9E1B2";
  context.font = "700 54px -apple-system, sans-serif";
  context.fillText("IDENTITY MATCHED", 384, 130);
  context.fillStyle = "#E9E4D6";
  context.font = "700 48px Menlo, monospace";
  context.fillText("BALANCE: NOT SCANNED", 384, 220);
  context.fillStyle = "#C4CBD5";
  context.font = "30px -apple-system, sans-serif";
  context.fillText("Watch-only data is required for a real balance.", 384, 306);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}
const vaultRecoveryStatus = new THREE.Group();
const statusFrame = new THREE.Mesh(
  new THREE.BoxGeometry(5.55, 3.2, 0.2),
  brushedMetal(THREE, 0x707984, 0.2)
);
vaultRecoveryStatus.add(statusFrame);
const statusFace = new THREE.Mesh(
  new THREE.PlaneGeometry(5.25, 2.9),
  new THREE.MeshBasicMaterial({ map: vaultStatusTexture(), toneMapped: false })
);
statusFace.position.z = 0.115;
vaultRecoveryStatus.add(statusFace);
vaultRecoveryStatus.position.set(0, 3.4, -12.78);
castRealisticShadows(vaultRecoveryStatus);
vaultRecoveryStatus.visible = false;
scene.add(vaultRecoveryStatus);


// ---------- plates ----------
const FACE = {
  bip39: t => { t.font = "30px Georgia";
    const rows = ["SEED PLATE",""];
    for (let i = 0; i < 12; i += 3) rows.push(words.slice(i, i+3).join("  "));
    rows.forEach((l,i)=>t.fillText(l,36,64+i*52)); },
  bip32: t => { t.font = "22px Menlo, monospace";
    const x = master ? master.xprv : "deriving...";
    const rows = ["KEY FILE", ""];
    for (let i = 0; i < x.length; i += 24) rows.push(x.slice(i, i+24));
    rows.slice(0, 7).forEach((l,i)=>t.fillText(l,30,50+i*58)); },
  codex32:t => { t.font = "38px Menlo, monospace"; ["CODEX32 PLATE","","MS12NAMEA320ZYXWV","checksummed by hand","no device trusted"].forEach((l,i)=>t.fillText(l,36,86+i*62)); },
  descriptor: t => { t.font = "38px Menlo, monospace"; ["THE DESCRIPTOR","","wsh(sortedmulti(2,","xpub1..., xpub2...))","quorum + paths + script"].forEach((l,i)=>t.fillText(l,36,86+i*62)); },
};
function plateTexture(kind, tint){
  const c = document.createElement("canvas"); c.width = 512; c.height = 512;
  const t = c.getContext("2d");
  const g = t.createLinearGradient(0,0,512,512);
  g.addColorStop(0, "#d8dadd");
  g.addColorStop(0.42, tint);
  g.addColorStop(1, "#7b8188");
  t.fillStyle = g; t.fillRect(0,0,512,512);
  for (let y = 0; y < 512; y += 4){
    t.strokeStyle = y % 12 === 0 ? "rgba(255,255,255,.10)" : "rgba(22,28,34,.035)";
    t.beginPath();
    t.moveTo(0, y + 0.5);
    t.lineTo(512, y + 0.5);
    t.stroke();
  }
  t.strokeStyle = kind === "descriptor" ? "#9b7f2d" : "#59616a";
  t.lineWidth = 7; t.strokeRect(9,9,494,494);
  t.fillStyle = kind === "descriptor" ? "#3d3211" : "#252a30";
  t.textBaseline = "alphabetic";
  FACE[kind](t);
  const texture = new THREE.CanvasTexture(c);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return texture;
}
const VENDOR_TINTS_SAME = ["#a4a8ad","#a4a8ad","#a4a8ad"];
const VENDOR_TINTS_DIFF = ["#a4a8ad","#8f969f","#aaa38f"];
function roundedPlateGeometry(width, height, radius, depth){
  const x = -width / 2;
  const y = -height / 2;
  const shape = new THREE.Shape();
  shape.moveTo(x + radius, y);
  shape.lineTo(x + width - radius, y);
  shape.quadraticCurveTo(x + width, y, x + width, y + radius);
  shape.lineTo(x + width, y + height - radius);
  shape.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  shape.lineTo(x + radius, y + height);
  shape.quadraticCurveTo(x, y + height, x, y + height - radius);
  shape.lineTo(x, y + radius);
  shape.quadraticCurveTo(x, y, x + radius, y);
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelThickness: 0.035,
    bevelSize: 0.035,
    bevelSegments: 3,
    curveSegments: 12
  });
  geometry.translate(0, 0, -depth / 2);
  return geometry;
}
const plateBodyGeo = roundedPlateGeometry(2.3, 2.3, 0.18, 0.09);
const plates = [];
function makePlateAssembly(kind){
  const group = new THREE.Group();
  group.userData.kind = kind;
  const back = new THREE.Mesh(
    plateBodyGeo,
    brushedMetal(THREE, 0x777f88, 0.24)
  );
  back.position.set(0, 0, -0.085);
  back.rotation.z = 0;
  back.castShadow = true;
  group.add(back);
  const front = new THREE.Mesh(
    plateBodyGeo,
    brushedMetal(THREE, 0xc2c7cc, 0.19)
  );
  front.castShadow = true;
  front.userData.owner = group;
  group.add(front);
  const face = new THREE.Mesh(
    new THREE.PlaneGeometry(2.12, 2.12),
    new THREE.MeshPhysicalMaterial({
      metalness: 0.45, roughness: 0.34,
      clearcoat: 0.14, clearcoatRoughness: 0.28,
      envMapIntensity: 0.92,
      emissive: 0x000000, emissiveIntensity: 1
    })
  );
  face.position.z = 0.098;
  face.userData.owner = group;
  group.add(face);
  const screwMaterial = brushedMetal(THREE, 0x3f454c, 0.14);
  for (const x of [0.94]){
    for (const y of [-0.86, 0.86]){
      const screw = new THREE.Mesh(
        new THREE.CylinderGeometry(0.065, 0.065, 0.045, 18),
        screwMaterial
      );
      screw.rotation.x = Math.PI / 2;
      screw.position.set(x, y, 0.105);
      screw.userData.owner = group;
      group.add(screw);
      const slot = new THREE.Mesh(
        new THREE.BoxGeometry(0.075, 0.012, 0.012),
        new THREE.MeshBasicMaterial({ color: 0x171a1e })
      );
      slot.position.set(x, y, 0.13);
      slot.rotation.z = (x + y) * 0.3;
      slot.userData.owner = group;
      group.add(slot);
    }
  }
  group.userData.faceMesh = face;
  group.rotation.x = -0.12;
  castRealisticShadows(group);
  scene.add(group);
  return group;
}
for (let i = 0; i < 3; i++) plates.push(makePlateAssembly("seed"));
const descPlate = makePlateAssembly("descriptor");

// ---------- layout per state ----------
const targets = new Map(); // mesh -> {p:Vector3, visible}
function setTarget(m, x, y, z, visible = true){ targets.set(m, { p: new THREE.Vector3(x,y,z), visible }); m.visible = m.visible || visible; }
const fpEl = document.getElementById("fp");
const pathDisplay = document.getElementById("path-display");
function activePolicy(){
  const policies = SCRIPT_PRESETS[state.sig];
  return policies[state.scr] || policies.segwit;
}
function syncPolicyControls(){
  const multi = state.sig === "multi";
  if (multi && !SCRIPT_PRESETS.multi[state.scr]) state.scr = "segwit";
  const policy = activePolicy();
  state.path = policy.path;
  pathDisplay.textContent = policy.path;
  document.querySelectorAll("#scr .chip").forEach(button => {
    const supported = !multi || Boolean(SCRIPT_PRESETS.multi[button.dataset.v]);
    button.disabled = !supported;
    button.classList.toggle("on", button.dataset.v === state.scr);
  });
}
let master = null; // { fp, xprv } of the current seed, computed for real
let fpRun = 0;
async function updateFp(){
  const run = ++fpRun;
  // Every format resolves to a BIP-32 root, so every format has a
  // fingerprint. BIP-39 uses the engraved words + passphrase; the other
  // formats carry the demo seed directly.
  const ws = state.fmt === "bip39" ? words : TRUE_WORDS;
  const pass = state.fmt === "bip39" ? state.pass : "";
  if (state.fmt === "bip39" && !wordsValid){
    master = null; fpEl.textContent = "no seed"; fpEl.className = "fp off"; return;
  }
  fpEl.textContent = "computing...";
  const m = await masterFromMnemonic(ws, pass);
  if (run !== fpRun) return; // a newer edit superseded this one
  master = m;
  fpEl.textContent = m.fp;
  fpEl.className = (state.fmt !== "bip39" || (wordsMatch && pass === "")) ? "fp" : "fp off";
  if (state.fmt === "bip32") relayoutPlates();
}
function closeDoor(){ doorTarget = 0; vaultRecoveryStatus.visible = false; }
function relayoutPlates(){
  const multi = state.sig === "multi";
  const tints = (multi && state.ven === "multi") ? VENDOR_TINTS_DIFF : VENDOR_TINTS_SAME;
  plates.forEach((m, i) => {
    const material = m.userData.faceMesh.material;
    if (material.map) material.map.dispose();
    material.map = plateTexture(state.fmt, tints[i]);
    material.needsUpdate = true;
  });
}
function relayout(instant = false){
  syncPolicyControls();
  updateFp();
  const multi = state.sig === "multi";
  const tints = (multi && state.ven === "multi") ? VENDOR_TINTS_DIFF : VENDOR_TINTS_SAME;
  plates.forEach((m, i) => {
    const material = m.userData.faceMesh.material;
    if (material.map) material.map.dispose();
    material.map = plateTexture(state.fmt, tints[i]);
    material.needsUpdate = true;
    if (multi){
      const spots = [[0, 2.65, 0],[-3.65, 0.45, 0.5],[3.65, 0.45, -0.5]];
      const [sx, sz, ry] = spots[i];
      setTarget(m, sx, 1.38, sz, true); m.userData.ry = ry;
    } else if (i === 0){
      setTarget(m, 0, 1.38, 2.6, true); m.userData.ry = 0;
    } else {
      const exitX = i === 1 ? -8.2 : 8.2;
      setTarget(m, exitX, 1.38, -1.1, false); m.userData.ry = i === 1 ? 0.7 : -0.7;
    }
  });
  const descriptorMaterial = descPlate.userData.faceMesh.material;
  if (descriptorMaterial.map) descriptorMaterial.map.dispose();
  descriptorMaterial.map = plateTexture("descriptor", "#b6ab86");
  descriptorMaterial.needsUpdate = true;
  if (multi){ setTarget(descPlate, 5.8, 1.38, -2.1, true); descPlate.userData.ry = -0.62; }
  else { setTarget(descPlate, 9.4, 1.38, -1.8, false); state.hasDescriptor = false; }
  if (instant) for (const [m,t] of targets){ m.position.copy(t.p); m.visible = t.visible; }
}
relayout(true);

// ---------- copy ----------
const L = SCRIPTS.atRest;

// ---------- interaction ----------
const ray = new THREE.Raycaster(), ptr = new THREE.Vector2();
let dragging = false, moved = false, px = 0, py = 0;
canvas.addEventListener("pointerdown", e => { dragging = true; moved = false; px = e.clientX; py = e.clientY; });
addEventListener("pointermove", e => {
  if (!dragging) return;
  const dx = e.clientX - px, dy = e.clientY - py;
  if (Math.abs(dx) + Math.abs(dy) > 4) moved = true;
  yawT = THREE.MathUtils.clamp(yawT + dx * 0.004, -0.55, 0.55);
  pitch = THREE.MathUtils.clamp(pitch + dy * 0.002, 0.15, 0.6);
  px = e.clientX; py = e.clientY;
});
addEventListener("pointerup", e => {
  dragging = false;
  if (moved) return;
  // taps on the HTML overlays (editor, chips, captions) are theirs alone;
  // only the canvas talks to the 3D scene
  if (e.target !== canvas) return;
  ptr.x = (e.clientX/innerWidth)*2-1; ptr.y = -(e.clientY/innerHeight)*2+1;
  ray.setFromCamera(ptr, camera);
  const hit = ray.intersectObjects([...plates, descPlate], true).find(h => h.object.visible);
  if (!hit){ focusOn(null); return; }
  const m = hit.object.userData.owner || hit.object;
  pulse(m); focusOn(m);
  if (m.userData.kind === "seed" && state.fmt === "bip39" && state.sig === "single"){
    editor.hidden = false;
    passInput.value = state.pass;
    reviewWords();
    speak(["Read the plate. Change a word if you like. Then try the recovery and see which wallet, if any, those words open."]);
    return;
  }
  if (m.userData.kind === "descriptor" && state.sig === "multi" && !state.hasDescriptor && awaitingDescriptor){
    state.hasDescriptor = true; awaitingDescriptor = false;
    m.position.y += 0.001; setTarget(m, 0, 1.38, 1.4, true); m.userData.ry = 0;
    presentTool("plate", "Descriptor", 850);
    speak(["The descriptor joins the seeds. Try the recovery again."]);
  } else speak([L.plate[m.userData.kind]]);
});
addEventListener("wheel", e => { distT = THREE.MathUtils.clamp(distT + e.deltaY*0.01, 6, 16); });
// pinch: two active pointers change the camera distance
const touches = new Map();
canvas.addEventListener("pointerdown", e => touches.set(e.pointerId, [e.clientX, e.clientY]));
addEventListener("pointermove", e => {
  if (!touches.has(e.pointerId)) return;
  if (touches.size === 2){
    const pts = [...touches.values()];
    const before = Math.hypot(pts[0][0]-pts[1][0], pts[0][1]-pts[1][1]);
    touches.set(e.pointerId, [e.clientX, e.clientY]);
    const now = [...touches.values()];
    const after = Math.hypot(now[0][0]-now[1][0], now[0][1]-now[1][1]);
    distT = THREE.MathUtils.clamp(distT + (before-after)*0.03, 6, 16);
  } else touches.set(e.pointerId, [e.clientX, e.clientY]);
});
addEventListener("pointerup", e => touches.delete(e.pointerId));
addEventListener("pointercancel", e => touches.delete(e.pointerId));

function pulse(m){ m.userData.pulse = 1; }

// chips
function wireChips(id, key, onPick){
  document.getElementById(id).addEventListener("click", e => {
    const b = e.target.closest(".chip"); if (!b || b.disabled) return;
    document.querySelectorAll(`#${id} .chip`).forEach(c => c.classList.remove("on"));
    b.classList.add("on"); state[key] = b.dataset.v; onPick(b.dataset.v);
  });
}
function syncVendorLock(){
  const locked = state.sig === "single";
  document.querySelectorAll("#ven .chip").forEach(c => c.disabled = locked);
}
wireChips("fmt", "fmt", v => {
  closeDoor();
  editor.hidden = true;
  if (v !== "bip39"){
    state.pass = "";
    passInput.value = "";
  }
  presentTool("plate", v, 800);
  setTimeout(relayout, reduced ? 0 : 420);
  focusOn(null);
  speak([L.fmt[v]]);
});
wireChips("sig", "sig", v => {
  editor.hidden = true;
  if (v === "single"){ state.ven = "one";
    document.querySelectorAll("#ven .chip").forEach(c => c.classList.toggle("on", c.dataset.v === "one")); }
  syncVendorLock(); syncPolicyControls(); closeDoor(); relayout(); resetSafe(); focusOn(null); speak([L.sig[v]]);
});
document.getElementById("ven").addEventListener("click", e => {
  if (state.sig === "single" && e.target.closest(".chip")) speak([L.venLocked]);
});
wireChips("ven", "ven", v => { relayout(); focusOn(null); speak([L.ven[v]]); });
wireChips("scr", "scr", v => {
  syncPolicyControls();
  closeDoor();
  focusOn(null);
  speak([L.scr[v]]);
});
syncVendorLock();
syncPolicyControls();

// ---------- the editable plate ----------
const editor = document.getElementById("editor"), edGrid = document.getElementById("ed-grid"),
      edNote = document.getElementById("ed-note");
const passInput = document.getElementById("ed-passin");
let reviewRun = 0;
function positionEditorOnPlate(){
  if (editor.hidden) return;
  const plate = plates[0];
  plate.updateMatrixWorld(true);
  const project = local => {
    const point = plate.localToWorld(local.clone()).project(camera);
    return {
      x: (point.x * 0.5 + 0.5) * innerWidth,
      y: (-point.y * 0.5 + 0.5) * innerHeight
    };
  };
  const center = project(new THREE.Vector3(0, 0, 0.13));
  const left = project(new THREE.Vector3(-1.15, 0, 0.13));
  const right = project(new THREE.Vector3(1.15, 0, 0.13));
  const plateWidth = Math.max(1, Math.hypot(right.x - left.x, right.y - left.y));
  const scale = THREE.MathUtils.clamp(plateWidth / 430, 0.68, 1.16);
  editor.style.left = center.x + "px";
  editor.style.top = center.y + "px";
  editor.style.transform = "translate(-50%,-50%) scale(" + scale + ")";
}
words.forEach((w, i) => {
  const inp = document.createElement("input");
  inp.value = w; inp.dataset.i = i; inp.autocapitalize = "off"; inp.spellcheck = false;
  // four letters name a BIP-39 word uniquely; finish it for the typist
  inp.addEventListener("input", () => {
    const v = inp.value.trim().toLowerCase();
    if (v.length >= 4){
      const hits = WORDS.filter(w2 => w2.startsWith(v));
      if (hits.length === 1 && hits[0] !== v){ inp.value = hits[0]; }
    }
  });
  inp.addEventListener("focus", () => inp.select());
  if (i === 11){
    inp.addEventListener("focus", () => document.getElementById("cs-pick").classList.add("open"));
  } else {
    inp.addEventListener("focus", () => document.getElementById("cs-pick").classList.remove("open"));
  }
  edGrid.appendChild(inp);
});
async function reviewWords(){
  const run = ++reviewRun;
  const nextWords = [...edGrid.querySelectorAll("input")].map(i => i.value.trim().toLowerCase());
  const [nextValid, opts] = await Promise.all([
    validMnemonic(nextWords),
    validLastWords(nextWords.slice(0, 11))
  ]);
  if (run !== reviewRun) return;
  words = nextWords;
  wordsValid = nextValid;
  wordsMatch = words.join(" ") === TRUE_WORDS.join(" ");
  [...edGrid.querySelectorAll("input")].forEach(input =>
    input.classList.toggle("bad", WORDS.indexOf(input.value.trim().toLowerCase()) < 0));
  const lastInp = edGrid.querySelector('input[data-i="11"]');
  const pick = document.getElementById("cs-pick");
  pick.replaceChildren(...opts.map(w => {
    const b = document.createElement("button"); b.type = "button"; b.textContent = w;
    b.addEventListener("click", () => { lastInp.value = w; pick.classList.remove("open"); reviewWords(); });
    return b;
  }));
  lastInp.classList.toggle("bad", opts.length > 0 && !opts.includes(words[11]));
  if (!opts.length) pick.classList.remove("open");
  edNote.textContent = !wordsValid
    ? (opts.length ? "The checksum lives in the last word. For these 11 words, exactly 128 final words fit. Tap the last word to choose one."
                   : "A word in red is not on the BIP-39 list, so no checksum can exist yet. Fix it first.")
    : wordsMatch ? "Known test vector. Wallet identity can be derived; balance has not been scanned."
    : "Valid words, different wallet identity. Balance has not been scanned.";
  closeDoor(); relayout();
}
edGrid.addEventListener("input", () => { clearTimeout(edGrid._t); edGrid._t = setTimeout(reviewWords, 350); });
passInput.addEventListener("input", () => {
  clearTimeout(passInput._t);
  passInput._t = setTimeout(() => {
    state.pass = passInput.value;
    closeDoor();
    updateFp();
    speak([state.pass ? L.pass.butler : L.pass.none]);
  }, 350);
});
document.getElementById("ed-close").addEventListener("click", () => {
  editor.hidden = true;
  focusOn(null);
});
// recovery
let recovering = false, awaitingDescriptor = false, failFlash = 0;
let doorOpenT = 0, wheelSpin = 0, wheelVel = 0, shakeT = 0;
const btn = document.getElementById("recover");
function resetSafe(){ awaitingDescriptor = false; state.hasDescriptor = false; doorTarget = 0; }
let doorTarget = 0;
btn.addEventListener("click", () => {
  if (recovering) return;
  presentTool("plate", "Recovery", 760);
  recovering = true; btn.disabled = true;
  focusObj = null; frame(new THREE.Vector3(0, 3.4, -12.9), 11.5);
  const done = ok => setTimeout(() => {
    recovering = false; btn.disabled = false;
    if (!ok && state.sig === "multi"){ awaitingDescriptor = true; focusOn(descPlate, 6); }
    else if (!ok) focusOn(null);
    else setTimeout(() => focusOn(null), 2600);
  }, 2400);
  if (state.sig === "single"){
    if (state.fmt === "bip39" && !wordsValid){
      speak(L.recoverNoSeed);
      wheelVel = 0;
      rebuildOk = null;
      failFlash = 1;
      shakeT = 0.22;
      done(false);
    } else {
      const rightContext = state.pass === "" && state.scr === "segwit";
      const identityMatched = (state.fmt !== "bip39" || wordsMatch) && rightContext;
      vaultRecoveryStatus.visible = identityMatched;
      speak(identityMatched ? L.recoverFunded : emptyWalletLines(state));
      animateRebuild(true); done(true);
    }
  }
  else if (!state.hasDescriptor){ speak(L.recoverMultiFail); animateRebuild(false); done(false); }
  else {
    vaultRecoveryStatus.visible = true;
    speak(L.recoverMultiOk);
    animateRebuild(true);
    done(true);
  }
});
let rebuildOk = null, rebuildT = 0;
function animateRebuild(ok){ rebuildOk = ok; rebuildT = 0; wheelVel = 6; doorTarget = 0; }

// ---------- loop ----------
const clock = new THREE.Clock();
function tick(){
  requestAnimationFrame(tick);
  const dt = Math.min(clock.getDelta(), 0.05);
  if (!reduced && !dragging) yawT += Math.sin(clock.elapsedTime*0.15)*0.0003;
  yaw += (yawT - yaw)*0.08;
  look.lerp(lookT, reduced ? 1 : dt*2.2);
  dist += (distT - dist) * (reduced ? 1 : dt*2.2);
  placeCamera();
  // the follow spot holds the focused object; the room leans dark around it
  if (focusObj){
    spot.target.position.lerp(focusObj.position, dt*4);
    spot.position.lerp(new THREE.Vector3(focusObj.position.x, 8, focusObj.position.z + 5), dt*4);
    spot.intensity += (240 - spot.intensity)*dt*3;
    amb.intensity += (0.22 - amb.intensity)*dt*3;
    key.intensity += (90 - key.intensity)*dt*3;
  } else {
    spot.intensity += (0 - spot.intensity)*dt*3;
    amb.intensity += (0.56 - amb.intensity)*dt*3;
    key.intensity += (260 - key.intensity)*dt*3;
  }
  for (const [m,t] of targets){
    if (t.visible) m.visible = true;
    m.position.lerp(t.p, reduced ? 1 : 1 - Math.exp(-dt * 5.2));
    if (!t.visible && m.position.distanceTo(t.p) < 0.05) m.visible = false;
    if (m.userData.pulse > 0){ m.userData.pulse -= dt*2;
      m.scale.setScalar(1 + Math.sin(m.userData.pulse*Math.PI)*0.08); }
    else m.scale.setScalar(1);
    // a focused plate turns square to the visitor; the rest hold their angle
    const ry = (m === focusObj) ? yaw : (m.userData.ry || 0);
    m.rotation.y += (ry - m.rotation.y) * (reduced ? 1 : dt*3);
  }
  positionEditorOnPlate();
  const descriptorFace = descPlate.userData.faceMesh.material;
  if (awaitingDescriptor && descPlate.visible){
    descriptorFace.emissive.setHex(0xfbdc7b);
    descriptorFace.emissiveIntensity = 0.22 + 0.14*Math.sin(clock.elapsedTime*4);
  } else {
    descriptorFace.emissive.setHex(0x000000);
    descriptorFace.emissiveIntensity = 0;
  }
  // the wheel spins while recovery runs; the door decides
  wheelSpin += wheelVel * dt; wheelG.rotation.z = wheelSpin;
  if (rebuildOk !== null){
    rebuildT += dt;
    if (rebuildT > 1.4){
      if (rebuildOk){ doorTarget = 1; }
      else { failFlash = 1; shakeT = 0.5; }
      wheelVel = 0; rebuildOk = null;
    }
  } else wheelVel *= (1 - dt*2);
  if (shakeT > 0){ shakeT -= dt;
    doorPivot.position.x = -3.4 + Math.sin(shakeT*60)*0.06*shakeT;
  } else doorPivot.position.x = -3.4;
  doorOpenT += ((doorTarget) - doorOpenT) * (reduced ? 1 : dt*1.6);
  doorPivot.rotation.y = -doorOpenT * 1.28;
  glowDisc.material.opacity = doorOpenT * 0.5;
  glowLight.intensity = doorOpenT * 55;
  if (failFlash > 0){ failFlash -= dt;
    rim.intensity = 90 + Math.sin(failFlash*20)*40;
    doorRim.material.color.setHex(0xde8a66);
  } else { rim.intensity = 90; doorRim.material.color.setHex(0xfbdc7b); }
  renderer.render(scene, camera);
}
speak(L.welcome, 600);
presentTool("plate", "Seed plate", 1200);
tick();
