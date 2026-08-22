// The At-rest vault. One scene, one point: what a backup must really
// survive. Seeds alone cannot recover a multisig; the descriptor plate
// makes that visible.

import * as THREE from "three";
import { makeButlerTexture, speak } from "./butler.js";
import { WORDS } from "./vendor/bip39-en.js";

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
  pass: "none", path: "std", scr: "segwit" };
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
// the vault door, the room's landmark
const doorPivot = new THREE.Group();
const doorG = new THREE.Group();
const wheelG = new THREE.Group();
const doorFace = new THREE.Mesh(new THREE.CylinderGeometry(3.4, 3.4, 0.55, 48),
  new THREE.MeshStandardMaterial({ color: 0x232a36, metalness: 0.85, roughness: 0.3 }));
doorFace.rotation.x = Math.PI/2; doorG.add(doorFace);
const doorRim = new THREE.Mesh(new THREE.TorusGeometry(3.4, 0.16, 16, 64),
  new THREE.MeshStandardMaterial({ color: 0xfbdc7b, metalness: 1, roughness: 0.25 }));
doorG.add(doorRim);
const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.7, 24),
  new THREE.MeshStandardMaterial({ color: 0xfbdc7b, metalness: 1, roughness: 0.3 }));
hub.rotation.x = Math.PI/2; hub.position.z = 0.35; wheelG.add(hub);
for (let i = 0; i < 3; i++){
  const spoke = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 2.6, 12),
    new THREE.MeshStandardMaterial({ color: 0xe9e4d6, metalness: 0.9, roughness: 0.3 }));
  spoke.rotation.z = i * Math.PI/3; spoke.position.z = 0.42; wheelG.add(spoke);
}
for (let i = 0; i < 8; i++){
  const a = i/8 * Math.PI*2;
  const bolt = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.65, 12),
    new THREE.MeshStandardMaterial({ color: 0x8c95a4, metalness: 0.9, roughness: 0.35 }));
  bolt.rotation.x = Math.PI/2;
  bolt.position.set(Math.cos(a)*2.9, Math.sin(a)*2.9, 0.05); doorG.add(bolt);
}
doorG.add(wheelG);
// door hangs on a hinge at its left edge so it can swing open
doorG.position.x = 3.4;
doorPivot.add(doorG);
doorPivot.position.set(-3.4, 3.4, -12.9); scene.add(doorPivot);
// the lit strongroom behind the door, seen only when it opens
const glowDisc = new THREE.Mesh(new THREE.CircleGeometry(3.2, 48),
  new THREE.MeshBasicMaterial({ color: 0x9a7f35, transparent: true, opacity: 0 }));
glowDisc.position.set(0, 3.4, -13.15); scene.add(glowDisc);
const glowLight = new THREE.PointLight(0xfbdc7b, 0, 20);
glowLight.position.set(0, 3.4, -11.5); scene.add(glowLight);
// what the door opens ONTO: a stack of coin, or nothing at all
const vaultFunds = new THREE.Group();
for (let i = 0; i < 5; i++){
  const coin = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.12, 32),
    new THREE.MeshStandardMaterial({ color: 0xfbdc7b, metalness: 1, roughness: 0.25,
      emissive: 0x6a5a20, emissiveIntensity: 0.4 }));
  coin.position.set((i%2)*0.5-0.25, 2.2 + i*0.14, -12.6);
  vaultFunds.add(coin);
}
vaultFunds.visible = false; scene.add(vaultFunds);
// pedestals get added under plates in relayout


// ---------- plates ----------
const FACE = {
  bip39: t => { t.font = "30px Georgia";
    const rows = ["SEED PLATE",""];
    for (let i = 0; i < 12; i += 3) rows.push(words.slice(i, i+3).join("  "));
    rows.forEach((l,i)=>t.fillText(l,36,64+i*52)); },
  bip32: t => { t.font = "40px Menlo, monospace"; ["KEY FILE","","raw BIP-32 material","no words exist","every copy spends"].forEach((l,i)=>t.fillText(l,36,86+i*62)); },
  codex32:t => { t.font = "38px Menlo, monospace"; ["CODEX32 PLATE","","MS12NAMEA320ZYXWV","checksummed by hand","no device trusted"].forEach((l,i)=>t.fillText(l,36,86+i*62)); },
  descriptor: t => { t.font = "38px Menlo, monospace"; ["THE DESCRIPTOR","","wsh(sortedmulti(2,","xpub1..., xpub2...))","quorum + paths + script"].forEach((l,i)=>t.fillText(l,36,86+i*62)); },
};
function plateTexture(kind, tint){
  const c = document.createElement("canvas"); c.width = 512; c.height = 384;
  const t = c.getContext("2d");
  const g = t.createLinearGradient(0,0,512,384);
  g.addColorStop(0, tint); g.addColorStop(1, "#20262f");
  t.fillStyle = g; t.fillRect(0,0,512,384);
  t.strokeStyle = kind === "descriptor" ? "#FBDC7B" : "#4a5468";
  t.lineWidth = 10; t.strokeRect(8,8,496,368);
  t.fillStyle = kind === "descriptor" ? "#FBDC7B" : "#c9c4b6";
  FACE[kind](t);
  return new THREE.CanvasTexture(c);
}
const VENDOR_TINTS_SAME = ["#39424f","#39424f","#39424f"];
const VENDOR_TINTS_DIFF = ["#39424f","#4f4436","#36494a"];
const plateGeo = new THREE.BoxGeometry(2.6, 1.95, 0.16);
const plates = [];
function makePlate(){
  const m = new THREE.Mesh(plateGeo, new THREE.MeshStandardMaterial({ metalness: 0.75, roughness: 0.35 }));
  m.userData.kind = "seed"; m.castShadow = true; m.rotation.x = -0.12;
  scene.add(m); plates.push(m); return m;
}
for (let i = 0; i < 3; i++) makePlate();
const descPlate = new THREE.Mesh(plateGeo, new THREE.MeshStandardMaterial({ metalness: 0.8, roughness: 0.3 }));
descPlate.userData.kind = "descriptor"; descPlate.castShadow = true; descPlate.rotation.x = -0.12; scene.add(descPlate);
// pedestals: one per possible plate position, shown/hidden with layout



// butler billboard
const butler = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(makeButlerTexture()), transparent: true }));
butler.scale.set(1.8, 3.6, 1); butler.position.set(-5.0, 1.8, 3.4); scene.add(butler);

// ---------- layout per state ----------
const targets = new Map(); // mesh -> {p:Vector3, visible}
function setTarget(m, x, y, z, visible = true){ targets.set(m, { p: new THREE.Vector3(x,y,z), visible }); m.visible = m.visible || visible; }
const fpEl = document.getElementById("fp");
function updateFp(){
  // the fingerprint belongs to the seed. Different words, different root.
  if (state.fmt !== "bip39"){ fpEl.textContent = "n/a"; fpEl.className = "fp"; return; }
  if (!wordsValid){ fpEl.textContent = "no seed"; fpEl.className = "fp off"; return; }
  if (wordsMatch && state.pass === "none"){ fpEl.textContent = TRUE_FP; fpEl.className = "fp"; }
  else { fpEl.textContent = "unknown root"; fpEl.className = "fp off"; }
}
function closeDoor(){ doorTarget = 0; vaultFunds.visible = false; }
function relayout(instant = false){
  updateFp();
  const multi = state.sig === "multi";
  const tints = (multi && state.ven === "multi") ? VENDOR_TINTS_DIFF : VENDOR_TINTS_SAME;
  plates.forEach((m, i) => {
    m.material.map = plateTexture(state.fmt, tints[i]); m.material.needsUpdate = true;
    if (multi){
      const spots = [[-4.4, 0.2, 0.55],[0, 3.2, 0],[4.2, 0.4, -0.5]];
      const [sx, sz, ry] = spots[i];
      setTarget(m, sx, 1.02, sz, true); m.userData.ry = ry;
    } else { setTarget(m, 0, 1.02, 2.6, i === 0); m.userData.ry = 0; }
  });
  descPlate.material.map = plateTexture("descriptor", "#2c2a20"); descPlate.material.needsUpdate = true;
  if (multi){ setTarget(descPlate, 6.2, 1.02, -2.4, true); descPlate.userData.ry = -0.7; }
  else { setTarget(descPlate, 6.2, 1.02, -2.4, false); state.hasDescriptor = false; }
  if (instant) for (const [m,t] of targets){ m.position.copy(t.p); m.visible = t.visible; }
}
relayout(true);

// ---------- copy ----------
const L = {
  welcome: ["Welcome to the vault. This is where your seed sleeps.",
    "Choose a setup, then try a recovery. I will tell you the truth about what survives."],
  fmt: {
    bip39: "BIP-39. Twenty-four words on metal. Remember: the words restore only the simplest wallet unless the path, script type and fingerprint survive beside them.",
    bip32: "Raw BIP-32. No words exist. The backup is a file, and every unencrypted copy is a full spend key.",
    codex32: "Codex32. A checksummed string you can verify by hand, with no device trusted. The checksum protects the copy, not the context." },
  sig: {
    single: "One key, one plate. Whoever holds it holds everything. Protection and risk in one object.",
    multi: "A quorum now guards the funds. Three plates, and they must live in three different places: one fire, one burglary, one location lost, and the quorum survives. And notice the gold plate: the descriptor. Remember it." },
  ven: {
    one: "All devices from one maker. One firmware bug still touches every key.",
    multi: "Different makers for each key. No single company remains in your trust path. This is what vendor diversity buys." },
  venLocked: "Vendor diversity only becomes a choice once more than one device signs. Choose multisig first.",
  plate: {
    seed: "A seed plate. Fire-proof, flood-proof. It is not rot-proof against missing context: path, script type, fingerprint.",
    descriptor: "The descriptor: every cosigner's public key, the quorum, the paths. Without it, the seeds are three perfect keys to a door nobody can find." },
  pass: { none: "No passphrase. The words alone are the whole secret.",
    butler: "A passphrase now stands beside the words. It is a second secret with no checksum: a typo is undetectable, and it opens a different, valid, empty wallet." },
  path: { std: "The standard path. Wallets agree to look here by convention, nothing more.",
    alt: "A different derivation path. Same seed, different neighborhood: the addresses that held your coin are no longer where the wallet looks." },
  scr: { segwit: "Native SegWit. The script your funded addresses were built with.",
    legacy: "Legacy script. Valid, older, and a different address for every key: your coin is not on these addresses." },
  recoverFunded: ["The wheel turns, the door opens, and the coin is there.",
    "Words, path, script and passphrase all matched the wallet that was funded. That is the full recovery set. Lose any one part, and watch what happens."],
  recoverEmpty: st => ["The door opens... on nothing.",
    "This is the trap. " + (st.pass !== "none" ? "The passphrase changed the seed's root, so this is a different, valid wallet that has never held a coin."
      : st.path !== "std" ? "The path points the wallet at a different neighborhood of addresses. Your coin sits untouched somewhere this wallet will never look."
      : st.scr !== "segwit" ? "The script type builds different addresses from the same keys. Correct seed, empty view."
      : "These are valid words for a wallet that has never held a coin."),
    "Nothing was destroyed. But a person restoring from backup would see an empty balance and believe the coin gone. Every part of the recovery set must survive, together."],
  recoverNoSeed: ["The wheel spins... and stops. The door refuses.",
    "The last word failed its arithmetic. The checksum inside it does not match the other eleven, so wallet software rejects the whole phrase before trying. No wallet, empty or full, exists behind these words.",
    "Tap the plate: the last word offers the 128 words that would fit."],
  recoverMultiFail: ["Watch closely. Three seeds, all present, all correct...",
    "And the door does not move. Seeds alone are not enough for multisig. The wallet needs the descriptor: every cosigner's xpub, the quorum, the paths.",
    "Most people learn this too late. Tap the gold plate to add the descriptor, then try again."],
  recoverMultiOk: ["Seeds and descriptor together. Now the door opens.",
    "This is the verdict: multisig costs more plates, more ceremony, and one more thing that must survive. It buys you the removal of every single point of failure. Decide with open eyes."],
};

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
  const hit = ray.intersectObjects([...plates, descPlate]).find(h => h.object.visible);
  if (!hit){ focusOn(null); return; }
  const m = hit.object;
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
wireChips("pass", "pass", v => { closeDoor(); updateFp(); focusOn(null); speak([L.pass[v]]); });
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
      const rightContext = state.pass === "none" && state.path === "std" && state.scr === "segwit";
      const funded = (state.fmt !== "bip39" || wordsMatch) && rightContext;
      vaultFunds.visible = funded;
      speak(funded ? L.recoverFunded : L.recoverEmpty(state));
      animateRebuild(true); done(true);
    }
  }
  else if (!state.hasDescriptor){ speak(L.recoverMultiFail); animateRebuild(false); done(false); }
  else { vaultFunds.visible = true; speak(L.recoverMultiOk); animateRebuild(true); done(true); }
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
  if (awaitingDescriptor && descPlate.visible)
    descPlate.material.emissive = new THREE.Color(0xfbdc7b).multiplyScalar(0.25 + 0.2*Math.sin(clock.elapsedTime*4));
  else descPlate.material.emissive = new THREE.Color(0x000000);
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
