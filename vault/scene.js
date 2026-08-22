// The At-rest vault. One scene, one point: what a backup must really
// survive. Seeds alone cannot recover a multisig; the descriptor plate
// makes that visible.

import * as THREE from "three";
import { makeButler, speak } from "./butler.js?v=2";
import { SCRIPTS, emptyWalletLines } from "./script.js";
import { WORDS } from "./vendor/bip39-en.js";
import { masterFromMnemonic } from "./vendor/bip32.js";

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

const state = { fmt: "bip39", sig: "single", ven: "one", hasDescriptor: false,
  pass: "", path: "std", scr: "segwit" };
const FUNDS_BTC = 0.21, BTC_USD = 114000;
// the demo wallet that actually holds funds: these words, no passphrase,
// m/84'/0'/0', native segwit. Everything else opens empty or not at all.
const TRUE_WORDS = ["abandon","abandon","abandon","abandon","abandon","abandon",
  "abandon","abandon","abandon","abandon","abandon","about"];
const TRUE_FP = "73C5DA0A";
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
const amb = new THREE.AmbientLight(0x6a7484, 0.5); scene.add(amb);
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
  new THREE.MeshStandardMaterial({ color: 0x10141b, metalness: 0.4, roughness: 0.32 }));
floor.rotation.x = -Math.PI/2; floor.receiveShadow = true; scene.add(floor);
// inlaid gold ring on the floor
const ring = new THREE.Mesh(new THREE.RingGeometry(5.6, 5.75, 96),
  new THREE.MeshStandardMaterial({ color: 0xfbdc7b, metalness: 1, roughness: 0.35,
    emissive: 0x7a6a2e, emissiveIntensity: 0.25 }));
ring.rotation.x = -Math.PI/2; ring.position.y = 0.01; scene.add(ring);
// curved back wall
const wallMat = new THREE.MeshStandardMaterial({ color: 0x141922, roughness: 0.85, side: THREE.BackSide });
const wall = new THREE.Mesh(new THREE.CylinderGeometry(13.5, 13.5, 12, 48, 1, true), wallMat);
wall.position.y = 6; scene.add(wall);
// The vault door is a working mechanical landmark: housing, jamb, hinges,
// locking dogs, wheel, and a deep strongroom behind it.
const steel = new THREE.MeshStandardMaterial({
  color: 0x545d69, metalness: 0.93, roughness: 0.27
});
const darkSteel = new THREE.MeshStandardMaterial({
  color: 0x252c35, metalness: 0.9, roughness: 0.34
});
const edgeSteel = new THREE.MeshStandardMaterial({
  color: 0x939ba6, metalness: 0.96, roughness: 0.22
});
const goldSteel = new THREE.MeshStandardMaterial({
  color: 0xfbdc7b, metalness: 1, roughness: 0.24,
  emissive: 0x554716, emissiveIntensity: 0.16
});
const vaultHousing = new THREE.Group();
const housingParts = [
  [0, 7.15, -13.3, 8.6, 0.75, 1.5],
  [0, -0.35, -13.3, 8.6, 0.75, 1.5],
  [-4.05, 3.4, -13.3, 0.75, 7.0, 1.5],
  [4.05, 3.4, -13.3, 0.75, 7.0, 1.5]
];
housingParts.forEach(part => {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(part[3], part[4], part[5]),
    darkSteel
  );
  mesh.position.set(part[0], part[1], part[2]);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  vaultHousing.add(mesh);
});
const jamb = new THREE.Mesh(
  new THREE.CylinderGeometry(3.62, 3.62, 1.7, 72, 1, true),
  new THREE.MeshStandardMaterial({
    color: 0x333b46, metalness: 0.94, roughness: 0.28,
    side: THREE.DoubleSide
  })
);
jamb.rotation.x = Math.PI / 2;
jamb.position.set(0, 3.4, -13.28);
vaultHousing.add(jamb);
const frameRing = new THREE.Mesh(new THREE.TorusGeometry(3.6, 0.38, 24, 96), steel);
frameRing.position.set(0, 3.4, -12.48);
frameRing.castShadow = true;
vaultHousing.add(frameRing);
scene.add(vaultHousing);

const vaultTunnel = new THREE.Mesh(
  new THREE.CylinderGeometry(3.18, 3.18, 5.1, 72, 1, true),
  new THREE.MeshStandardMaterial({
    color: 0x1d232c, metalness: 0.72, roughness: 0.48,
    side: THREE.BackSide
  })
);
vaultTunnel.rotation.x = Math.PI / 2;
vaultTunnel.position.set(0, 3.4, -15.75);
scene.add(vaultTunnel);
const depositWall = new THREE.Group();
for (let row = 0; row < 4; row++){
  for (let col = 0; col < 5; col++){
    const box = new THREE.Mesh(
      new THREE.BoxGeometry(0.8, 0.62, 0.12),
      new THREE.MeshStandardMaterial({
        color: 0x454d58, metalness: 0.9, roughness: 0.31
      })
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
  darkSteel
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
const spokeMat = new THREE.MeshStandardMaterial({
  color: 0xc8cdd2, metalness: 0.96, roughness: 0.2
});
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
const vaultFunds = new THREE.Group();
const coinPedestal = new THREE.Mesh(
  new THREE.CylinderGeometry(0.9, 1.05, 0.65, 32),
  darkSteel
);
coinPedestal.position.set(0, 1.75, -16.2);
vaultFunds.add(coinPedestal);
for (let i = 0; i < 7; i++){
  const coin = new THREE.Mesh(
    new THREE.CylinderGeometry(0.54, 0.54, 0.11, 40),
    new THREE.MeshStandardMaterial({
      color: 0xfbdc7b, metalness: 1, roughness: 0.22,
      emissive: 0x5c4b18, emissiveIntensity: 0.38
    })
  );
  coin.position.set((i % 2) * 0.46 - 0.23, 2.13 + i * 0.11, -16.2);
  coin.rotation.z = (i % 2 ? -1 : 1) * 0.03;
  vaultFunds.add(coin);
}
vaultFunds.visible = false;
scene.add(vaultFunds);


// ---------- plates ----------
const FACE = {
  bip39: t => { t.font = "30px Georgia";
    const rows = ["SEED PLATE",""];
    for (let i = 0; i < 12; i += 3) rows.push(words.slice(i, i+3).join("  "));
    rows.forEach((l,i)=>t.fillText(l,36,64+i*52)); },
  bip32: t => { t.font = "26px Menlo, monospace";
    const x = master ? master.xprv : "deriving...";
    const rows = ["KEY FILE", ""];
    for (let i = 0; i < x.length; i += 26) rows.push(x.slice(i, i+26));
    rows.slice(0, 6).forEach((l,i)=>t.fillText(l,30,58+i*52)); },
  codex32:t => { t.font = "38px Menlo, monospace"; ["CODEX32 PLATE","","MS12NAMEA320ZYXWV","checksummed by hand","no device trusted"].forEach((l,i)=>t.fillText(l,36,86+i*62)); },
  descriptor: t => { t.font = "38px Menlo, monospace"; ["THE DESCRIPTOR","","wsh(sortedmulti(2,","xpub1..., xpub2...))","quorum + paths + script"].forEach((l,i)=>t.fillText(l,36,86+i*62)); },
};
function plateTexture(kind, tint){
  const c = document.createElement("canvas"); c.width = 512; c.height = 512;
  const t = c.getContext("2d");
  const g = t.createLinearGradient(0,0,512,384);
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
    new THREE.MeshStandardMaterial({
      color: 0x6f767e, metalness: 0.96, roughness: 0.3
    })
  );
  back.position.set(-0.08, 0.08, -0.11);
  back.rotation.z = -0.025;
  back.castShadow = true;
  group.add(back);
  const front = new THREE.Mesh(
    plateBodyGeo,
    new THREE.MeshStandardMaterial({
      color: 0xb8bdc2, metalness: 0.96, roughness: 0.26
    })
  );
  front.castShadow = true;
  front.userData.owner = group;
  group.add(front);
  const face = new THREE.Mesh(
    new THREE.PlaneGeometry(2.12, 2.12),
    new THREE.MeshStandardMaterial({
      metalness: 0.76, roughness: 0.38,
      emissive: 0x000000, emissiveIntensity: 1
    })
  );
  face.position.z = 0.082;
  face.userData.owner = group;
  group.add(face);
  const screwMaterial = new THREE.MeshStandardMaterial({
    color: 0x3f454c, metalness: 0.98, roughness: 0.2
  });
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
  scene.add(group);
  return group;
}
for (let i = 0; i < 3; i++) plates.push(makePlateAssembly("seed"));
const descPlate = makePlateAssembly("descriptor");

const butler = makeButler(THREE);
scene.add(butler);

// ---------- layout per state ----------
const targets = new Map(); // mesh -> {p:Vector3, visible}
function setTarget(m, x, y, z, visible = true){ targets.set(m, { p: new THREE.Vector3(x,y,z), visible }); m.visible = m.visible || visible; }
const fpEl = document.getElementById("fp");
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
function closeDoor(){ doorTarget = 0; vaultFunds.visible = false; fundsEl.classList.remove("show"); }
const fundsEl = document.getElementById("funds");
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
  updateFp();
  const multi = state.sig === "multi";
  const tints = (multi && state.ven === "multi") ? VENDOR_TINTS_DIFF : VENDOR_TINTS_SAME;
  plates.forEach((m, i) => {
    const material = m.userData.faceMesh.material;
    if (material.map) material.map.dispose();
    material.map = plateTexture(state.fmt, tints[i]);
    material.needsUpdate = true;
    if (multi){
      const spots = [[-3.6, 0.2, 0.48],[0, 3.2, 0],[3.8, 0.4, -0.46]];
      const [sx, sz, ry] = spots[i];
      setTarget(m, sx, 1.02, sz, true); m.userData.ry = ry;
    } else { setTarget(m, 0, 1.02, 2.6, i === 0); m.userData.ry = 0; }
  });
  const descriptorMaterial = descPlate.userData.faceMesh.material;
  if (descriptorMaterial.map) descriptorMaterial.map.dispose();
  descriptorMaterial.map = plateTexture("descriptor", "#b6ab86");
  descriptorMaterial.needsUpdate = true;
  if (multi){ setTarget(descPlate, 6.2, 1.02, -2.4, true); descPlate.userData.ry = -0.7; }
  else { setTarget(descPlate, 6.2, 1.02, -2.4, false); state.hasDescriptor = false; }
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
    editor.hidden = false; reviewWords();
    speak(["Read the plate. Change a word if you like. Then try the recovery and see which wallet, if any, those words open."]);
    return;
  }
  if (m.userData.kind === "descriptor" && state.sig === "multi" && !state.hasDescriptor && awaitingDescriptor){
    state.hasDescriptor = true; awaitingDescriptor = false;
    m.position.y += 0.001; setTarget(m, 0, 1.02, 1.4, true); m.userData.ry = 0;
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
wireChips("fmt", "fmt", v => { closeDoor(); relayout(); focusOn(null); speak([L.fmt[v]]); });
wireChips("sig", "sig", v => {
  if (v === "single"){ state.ven = "one";
    document.querySelectorAll("#ven .chip").forEach(c => c.classList.toggle("on", c.dataset.v === "one")); }
  syncVendorLock(); closeDoor(); relayout(); resetSafe(); focusOn(null); speak([L.sig[v]]);
});
document.getElementById("ven").addEventListener("click", e => {
  if (state.sig === "single" && e.target.closest(".chip")) speak([L.venLocked]);
});
wireChips("ven", "ven", v => { relayout(); focusOn(null); speak([L.ven[v]]); });
wireChips("pass", "pass", v => {
  closeDoor(); updateFp(); focusOn(null);
  speak([L.pass[v ? "butler" : "none"]]);
});
wireChips("path", "path", v => { closeDoor(); focusOn(null); speak([L.path[v]]); });
wireChips("scr", "scr", v => { closeDoor(); focusOn(null); speak([L.scr[v]]); });
syncVendorLock();

// ---------- the editable plate ----------
const editor = document.getElementById("editor"), edGrid = document.getElementById("ed-grid"),
      edNote = document.getElementById("ed-note");
let lastOpts = [];
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
  words = [...edGrid.querySelectorAll("input")].map(i => i.value.trim().toLowerCase());
  [...edGrid.querySelectorAll("input")].forEach(i =>
    i.classList.toggle("bad", WORDS.indexOf(i.value.trim().toLowerCase()) < 0));
  wordsValid = await validMnemonic(words);
  wordsMatch = words.join(" ") === TRUE_WORDS.join(" ");
  // the checksum follows the first 11 words automatically; the last word
  // must come from the 128 that fit. Offer them on the last input.
  const lastInp = edGrid.querySelector('input[data-i="11"]');
  const opts = await validLastWords(words.slice(0, 11));
  lastOpts = opts;
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
    : wordsMatch ? "The original seed. The funded wallet exists behind these words."
    : "Valid words, different seed. A wallet exists for them. It has never held a coin.";
  closeDoor(); relayout(); updateFp();
}
edGrid.addEventListener("input", () => { clearTimeout(edGrid._t); edGrid._t = setTimeout(reviewWords, 350); });
document.getElementById("ed-close").addEventListener("click", () => { editor.hidden = true; });
// recovery
let recovering = false, awaitingDescriptor = false, failFlash = 0;
let doorOpenT = 0, wheelSpin = 0, wheelVel = 0, shakeT = 0;
const btn = document.getElementById("recover");
function resetSafe(){ awaitingDescriptor = false; state.hasDescriptor = false; doorTarget = 0; }
let doorTarget = 0;
btn.addEventListener("click", () => {
  if (recovering) return;
  recovering = true; btn.disabled = true;
  focusObj = null; frame(new THREE.Vector3(0, 3.4, -12.9), 9.5);
  const done = ok => setTimeout(() => {
    recovering = false; btn.disabled = false;
    if (!ok && state.sig === "multi"){ awaitingDescriptor = true; focusOn(descPlate, 6); }
    else if (!ok) focusOn(null);
    else setTimeout(() => focusOn(null), 2600);
  }, 2400);
  if (state.sig === "single"){
    if (state.fmt === "bip39" && !wordsValid){
      speak(L.recoverNoSeed); animateRebuild(false); done(false);
    } else {
      const rightContext = state.pass === "" && state.path === "std" && state.scr === "segwit";
      const funded = (state.fmt !== "bip39" || wordsMatch) && rightContext;
      vaultFunds.visible = funded;
      fundsEl.classList.toggle("show", funded);
      speak(funded ? L.recoverFunded : emptyWalletLines(state));
      animateRebuild(true); done(true);
    }
  }
  else if (!state.hasDescriptor){ speak(L.recoverMultiFail); animateRebuild(false); done(false); }
  else { vaultFunds.visible = true; fundsEl.classList.add("show"); speak(L.recoverMultiOk); animateRebuild(true); done(true); }
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
    amb.intensity += (0.5 - amb.intensity)*dt*3;
    key.intensity += (260 - key.intensity)*dt*3;
  }
  for (const [m,t] of targets){
    if (t.visible) m.visible = true;
    m.position.lerp(t.p, reduced ? 1 : 0.12);
    if (!t.visible && m.position.distanceTo(t.p) < 0.05) m.visible = false;
    if (m.userData.pulse > 0){ m.userData.pulse -= dt*2;
      m.scale.setScalar(1 + Math.sin(m.userData.pulse*Math.PI)*0.08); }
    else m.scale.setScalar(1);
    // a focused plate turns square to the visitor; the rest hold their angle
    const ry = (m === focusObj) ? yaw : (m.userData.ry || 0);
    m.rotation.y += (ry - m.rotation.y) * (reduced ? 1 : dt*3);
  }
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
  doorPivot.rotation.y = doorOpenT * 1.15;
  glowDisc.material.opacity = doorOpenT * 0.5;
  glowLight.intensity = doorOpenT * 55;
  if (failFlash > 0){ failFlash -= dt;
    rim.intensity = 90 + Math.sin(failFlash*20)*40;
    doorRim.material.color.setHex(0xde8a66);
  } else { rim.intensity = 90; doorRim.material.color.setHex(0xfbdc7b); }
  renderer.render(scene, camera);
}
speak(L.welcome, 600);
tick();
