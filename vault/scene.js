// The At-rest vault. One scene, one point: what a backup must really
// survive. Seeds alone cannot recover a multisig; the descriptor plate
// makes that visible.

import * as THREE from "three";
import { makeButlerTexture, speak } from "./butler.js";

const state = { fmt: "bip39", sig: "single", ven: "one", hasDescriptor: false };
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
function placeCamera(){
  camera.position.set(Math.sin(yaw)*dist*Math.cos(pitch), 3+Math.sin(pitch)*dist*0.6, Math.cos(yaw)*dist*Math.cos(pitch));
  camera.lookAt(0, 1.2, 0);
}
function resize(){
  renderer.setSize(innerWidth, innerHeight, false);
  camera.aspect = innerWidth/innerHeight; camera.updateProjectionMatrix();
}
addEventListener("resize", resize); resize();

// ---------- lights ----------
scene.add(new THREE.AmbientLight(0x6a7484, 0.5));
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
const doorG = new THREE.Group();
const doorFace = new THREE.Mesh(new THREE.CylinderGeometry(3.4, 3.4, 0.55, 48),
  new THREE.MeshStandardMaterial({ color: 0x232a36, metalness: 0.85, roughness: 0.3 }));
doorFace.rotation.x = Math.PI/2; doorG.add(doorFace);
const doorRim = new THREE.Mesh(new THREE.TorusGeometry(3.4, 0.16, 16, 64),
  new THREE.MeshStandardMaterial({ color: 0xfbdc7b, metalness: 1, roughness: 0.25 }));
doorG.add(doorRim);
const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.7, 24),
  new THREE.MeshStandardMaterial({ color: 0xfbdc7b, metalness: 1, roughness: 0.3 }));
hub.rotation.x = Math.PI/2; hub.position.z = 0.35; doorG.add(hub);
for (let i = 0; i < 3; i++){
  const spoke = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 2.6, 12),
    new THREE.MeshStandardMaterial({ color: 0xe9e4d6, metalness: 0.9, roughness: 0.3 }));
  spoke.rotation.z = i * Math.PI/3; spoke.position.z = 0.42; doorG.add(spoke);
}
for (let i = 0; i < 8; i++){
  const a = i/8 * Math.PI*2;
  const bolt = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.65, 12),
    new THREE.MeshStandardMaterial({ color: 0x8c95a4, metalness: 0.9, roughness: 0.35 }));
  bolt.rotation.x = Math.PI/2;
  bolt.position.set(Math.cos(a)*2.9, Math.sin(a)*2.9, 0.05); doorG.add(bolt);
}
doorG.position.set(0, 3.4, -12.9); scene.add(doorG);
// pedestals get added under plates in relayout

// location map on the back wall
const mapCanvas = document.createElement("canvas"); mapCanvas.width = 512; mapCanvas.height = 256;
const mapTex = new THREE.CanvasTexture(mapCanvas);
const mapMesh = new THREE.Mesh(new THREE.PlaneGeometry(6, 3),
  new THREE.MeshBasicMaterial({ map: mapTex, transparent: true }));
mapMesh.position.set(-6.2, 3.6, -8.5); mapMesh.rotation.y = 0.55; scene.add(mapMesh);
const mapFrame = new THREE.Mesh(new THREE.PlaneGeometry(6.3, 3.3),
  new THREE.MeshStandardMaterial({ color: 0x0a0d12, metalness: 0.5, roughness: 0.5 }));
mapFrame.position.copy(mapMesh.position); mapFrame.rotation.copy(mapMesh.rotation);
mapFrame.position.x -= 0.02; mapFrame.translateZ(-0.03); scene.add(mapFrame);
function drawMap(spread){
  const x = mapCanvas.getContext("2d");
  x.clearRect(0,0,512,256);
  x.strokeStyle = "#2A3242"; x.lineWidth = 2; x.strokeRect(6,6,500,244);
  x.strokeStyle = "#3a4456";
  x.beginPath(); x.moveTo(40,180); x.bezierCurveTo(140,60,300,220,470,90); x.stroke();
  x.fillStyle = "#8C95A4"; x.font = "16px Georgia";
  x.fillText(spread ? "Three locations. One loss is survivable." : "One location. One fire is total.", 30, 236);
  const pts = spread ? [[110,120],[260,150],[400,100]] : [[256,130]];
  for (const [px,py] of pts){
    x.fillStyle = "#FBDC7B"; x.beginPath(); x.arc(px,py,7,0,7); x.fill();
    x.strokeStyle = "#FBDC7B"; x.beginPath(); x.arc(px,py,13,0,7); x.stroke();
  }
  mapTex.needsUpdate = true;
}

// ---------- plates ----------
const FACE = {
  bip39: t => { t.font = "22px Georgia"; ["abandon ability able","about above absent","absorb abstract absurd","...24 words"].forEach((l,i)=>t.fillText(l,20,54+i*34)); },
  bip32: t => { t.font = "26px Menlo, monospace"; ["wallet.dat","descriptor backup","raw key material","no words exist"].forEach((l,i)=>t.fillText(l,20,58+i*36)); },
  codex32:t => { t.font = "24px Menlo, monospace"; ["MS12NAMEA320ZYXWV","checksummed string","verify by hand","no device trusted"].forEach((l,i)=>t.fillText(l,20,56+i*36)); },
  descriptor: t => { t.font = "20px Menlo, monospace"; ["wsh(sortedmulti(2,","xpub1...,xpub2...,","xpub3...))","quorum + paths + script"].forEach((l,i)=>t.fillText(l,18,52+i*34)); },
};
function plateTexture(kind, tint){
  const c = document.createElement("canvas"); c.width = 256; c.height = 192;
  const t = c.getContext("2d");
  const g = t.createLinearGradient(0,0,256,192);
  g.addColorStop(0, tint); g.addColorStop(1, "#20262f");
  t.fillStyle = g; t.fillRect(0,0,256,192);
  t.strokeStyle = kind === "descriptor" ? "#FBDC7B" : "#3a4456";
  t.lineWidth = 6; t.strokeRect(4,4,248,184);
  t.fillStyle = kind === "descriptor" ? "#FBDC7B" : "#c9c4b6";
  FACE[kind](t);
  return new THREE.CanvasTexture(c);
}
const VENDOR_TINTS_SAME = ["#39424f","#39424f","#39424f"];
const VENDOR_TINTS_DIFF = ["#39424f","#4f4436","#36494a"];
const plateGeo = new THREE.BoxGeometry(2.2, 0.16, 1.65);
const plates = [];
function makePlate(){
  const m = new THREE.Mesh(plateGeo, new THREE.MeshStandardMaterial({ metalness: 0.75, roughness: 0.35 }));
  m.userData.kind = "seed"; m.castShadow = true; scene.add(m); plates.push(m); return m;
}
for (let i = 0; i < 3; i++) makePlate();
const descPlate = new THREE.Mesh(plateGeo, new THREE.MeshStandardMaterial({ metalness: 0.8, roughness: 0.3 }));
descPlate.userData.kind = "descriptor"; descPlate.castShadow = true; scene.add(descPlate);
// pedestals: one per possible plate position, shown/hidden with layout
// each tool is presented the butler's way: on a tray, on a slim stand
const trayMat = new THREE.MeshStandardMaterial({ color: 0xd8d3c6, metalness: 0.95, roughness: 0.22 });
const trayRimMat = new THREE.MeshStandardMaterial({ color: 0xfbdc7b, metalness: 1, roughness: 0.3 });
const standMat = new THREE.MeshStandardMaterial({ color: 0x0a0c10, metalness: 0.7, roughness: 0.4 });
const peds = [];
for (let i = 0; i < 5; i++){
  const g = new THREE.Group();
  const tray = new THREE.Mesh(new THREE.CylinderGeometry(1.45, 1.45, 0.07, 40), trayMat);
  tray.position.y = 0.62; tray.receiveShadow = true; g.add(tray);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(1.45, 0.045, 10, 48), trayRimMat);
  rim.rotation.x = Math.PI/2; rim.position.y = 0.66; g.add(rim);
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.62, 12), standMat);
  stem.position.y = 0.31; g.add(stem);
  const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.65, 0.08, 24), standMat);
  foot.position.y = 0.04; foot.receiveShadow = true; g.add(foot);
  g.visible = false; scene.add(g); peds.push(g);
}
function placePed(i, x, z, visible){ peds[i].position.set(x, 0, z); peds[i].visible = visible; }

// the safe: what recovery rebuilds
const safeGeo = new THREE.BoxGeometry(2.6, 2.6, 2.6);
const safeWire = new THREE.LineSegments(new THREE.EdgesGeometry(safeGeo),
  new THREE.LineBasicMaterial({ color: 0x8c95a4 }));
safeWire.position.set(3.9, 1.52, -3.2); scene.add(safeWire);
const safePad = new THREE.Mesh(new THREE.CylinderGeometry(2.1, 2.3, 0.22, 32),
  new THREE.MeshStandardMaterial({ color: 0x1a212c, metalness: 0.5, roughness: 0.45 }));
safePad.position.set(3.9, 0.11, -3.2); safePad.receiveShadow = true; scene.add(safePad);
const safeSolid = new THREE.Mesh(safeGeo, new THREE.MeshStandardMaterial({
  color: 0x1b2230, metalness: 0.6, roughness: 0.4, transparent: true, opacity: 0 }));
safeSolid.position.copy(safeWire.position); scene.add(safeSolid);
const dial = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.09, 12, 32),
  new THREE.MeshStandardMaterial({ color: 0xfbdc7b, metalness: 0.9, roughness: 0.2, transparent: true, opacity: 0 }));
dial.position.set(3.9, 1.52, -1.85); scene.add(dial);

// butler billboard
const butler = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(makeButlerTexture()), transparent: true }));
butler.scale.set(1.8, 3.6, 1); butler.position.set(-5.0, 1.8, 3.4); scene.add(butler);

// ---------- layout per state ----------
const targets = new Map(); // mesh -> {p:Vector3, visible}
function setTarget(m, x, y, z, visible = true){ targets.set(m, { p: new THREE.Vector3(x,y,z), visible }); m.visible = m.visible || visible; }
function relayout(instant = false){
  const multi = state.sig === "multi";
  const tints = (multi && state.ven === "multi") ? VENDOR_TINTS_DIFF : VENDOR_TINTS_SAME;
  plates.forEach((m, i) => {
    m.material.map = plateTexture(state.fmt, tints[i]); m.material.needsUpdate = true;
    if (multi){ setTarget(m, (i-1)*3.4, 0.76, 2.2 + (i===1?0.8:0)); placePed(i, (i-1)*3.4, 2.2 + (i===1?0.8:0), true); }
    else { setTarget(m, 0, 0.76 + i*0.18, 2.4, i === 0); placePed(i, 0, 2.4, i === 0); }
  });
  descPlate.material.map = plateTexture("descriptor", "#2c2a20"); descPlate.material.needsUpdate = true;
  if (multi){ setTarget(descPlate, 5.2, 0.76, -0.4, true); placePed(3, 5.2, -0.4, true); }
  else { setTarget(descPlate, 5.2, 0.76, -0.4, false); placePed(3, 0, 0, false); state.hasDescriptor = false; }
  drawMap(multi);
  if (instant) for (const [m,t] of targets){ m.position.copy(t.p); m.visible = t.visible; }
}
relayout(true);

// ---------- copy ----------
const L = {
  welcome: ["Welcome to the vault. This is where your seed sleeps.",
    "Choose a setup on the right, then try a recovery. I will tell you the truth about what survives."],
  fmt: {
    bip39: "BIP-39. Twenty-four words on metal. Remember: the words restore only the simplest wallet unless the path, script type and fingerprint survive beside them.",
    bip32: "Raw BIP-32. No words exist. The backup is a file, and every unencrypted copy is a full spend key.",
    codex32: "Codex32. A checksummed string you can verify by hand, with no device trusted. The checksum protects the copy, not the context." },
  sig: {
    single: "One key, one plate. Whoever holds it holds everything. Protection and risk in one object.",
    multi: "A quorum now guards the funds. Three plates, held apart. And notice the gold-edged plate: the descriptor. Remember it." },
  ven: {
    one: "All devices from one maker. One firmware bug still touches every key.",
    multi: "Different makers for each key. No single company remains in your trust path. This is what vendor diversity buys." },
  venLocked: "Vendor diversity only becomes a choice once more than one device signs. Choose multisig first.",
  plate: {
    seed: "A seed plate. Fire-proof, flood-proof. It is not rot-proof against missing context: path, script type, fingerprint.",
    descriptor: "The descriptor: every cosigner's public key, the quorum, the paths. Without it, the seeds are three perfect keys to a door nobody can find." },
  recoverSingleOk: ["The safe rebuilds. One seed was enough, this time.",
    "It was enough because the wallet was simple. Path, script type and fingerprint were the defaults. Change any of them, and words alone open a correct-looking, empty wallet."],
  recoverMultiFail: ["Watch closely. Three seeds, all present, all correct...",
    "And the safe stays open bones. Seeds alone are not enough for multisig. The wallet needs the descriptor: every cosigner's xpub, the quorum, the paths.",
    "Most people learn this too late. Tap the gold plate to add the descriptor, then try again."],
  recoverMultiOk: ["Seeds and descriptor together. Now the safe rebuilds.",
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
  ptr.x = (e.clientX/innerWidth)*2-1; ptr.y = -(e.clientY/innerHeight)*2+1;
  ray.setFromCamera(ptr, camera);
  const hit = ray.intersectObjects([...plates, descPlate]).find(h => h.object.visible);
  if (!hit) return;
  const m = hit.object;
  pulse(m);
  if (m.userData.kind === "descriptor" && state.sig === "multi" && !state.hasDescriptor && awaitingDescriptor){
    state.hasDescriptor = true; awaitingDescriptor = false;
    m.position.y += 0.001; setTarget(m, 0, 0.76, 0.2, true); placePed(4, 0, 0.2, true); placePed(3, 0, 0, false);
    speak(["The descriptor joins the seeds. Try the recovery again."]);
  } else speak([L.plate[m.userData.kind]]);
});
addEventListener("wheel", e => { dist = THREE.MathUtils.clamp(dist + e.deltaY*0.01, 7, 16); });

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
wireChips("fmt", "fmt", v => { relayout(); speak([L.fmt[v]]); });
wireChips("sig", "sig", v => {
  if (v === "single"){ state.ven = "one";
    document.querySelectorAll("#ven .chip").forEach(c => c.classList.toggle("on", c.dataset.v === "one")); }
  syncVendorLock(); relayout(); resetSafe(); speak([L.sig[v]]);
});
document.getElementById("ven").addEventListener("click", e => {
  if (state.sig === "single" && e.target.closest(".chip")) speak([L.venLocked]);
});
wireChips("ven", "ven", v => { relayout(); speak([L.ven[v]]); });
syncVendorLock();

// recovery
let recovering = false, awaitingDescriptor = false, safeOpacity = 0, dialSpin = 0, failFlash = 0;
const btn = document.getElementById("recover");
function resetSafe(){ safeOpacity = 0; awaitingDescriptor = false; state.hasDescriptor = false; }
btn.addEventListener("click", () => {
  if (recovering) return;
  recovering = true; btn.disabled = true; safeOpacity = 0;
  const done = ok => setTimeout(() => {
    recovering = false; btn.disabled = false;
    if (!ok){ awaitingDescriptor = true; }
  }, 2400);
  if (state.sig === "single"){ speak(L.recoverSingleOk); animateRebuild(true); done(true); }
  else if (!state.hasDescriptor){ speak(L.recoverMultiFail); animateRebuild(false); done(false); }
  else { speak(L.recoverMultiOk); animateRebuild(true); done(true); }
});
let rebuildOk = null, rebuildT = 0;
function animateRebuild(ok){ rebuildOk = ok; rebuildT = 0; }

// ---------- loop ----------
const clock = new THREE.Clock();
function tick(){
  requestAnimationFrame(tick);
  const dt = Math.min(clock.getDelta(), 0.05);
  if (!reduced && !dragging) yawT += Math.sin(clock.elapsedTime*0.15)*0.0003;
  yaw += (yawT - yaw)*0.08; placeCamera();
  for (const [m,t] of targets){
    if (t.visible) m.visible = true;
    m.position.lerp(t.p, reduced ? 1 : 0.12);
    if (!t.visible && m.position.distanceTo(t.p) < 0.05) m.visible = false;
    if (m.userData.pulse > 0){ m.userData.pulse -= dt*2;
      m.scale.setScalar(1 + Math.sin(m.userData.pulse*Math.PI)*0.08); }
    else m.scale.setScalar(1);
  }
  if (awaitingDescriptor && descPlate.visible)
    descPlate.material.emissive = new THREE.Color(0xfbdc7b).multiplyScalar(0.25 + 0.2*Math.sin(clock.elapsedTime*4));
  else descPlate.material.emissive = new THREE.Color(0x000000);
  if (rebuildOk !== null){
    rebuildT += dt;
    dialSpin += dt * 4;
    dial.rotation.z = dialSpin;
    if (rebuildOk){
      safeOpacity = Math.min(1, rebuildT/1.6);
      safeWire.material.color.set(0x8fc79a);
    } else if (rebuildT > 1.2){
      failFlash = 1; rebuildOk = null;
      safeWire.material.color.set(0xde8a66);
    }
    safeSolid.material.opacity = safeOpacity * 0.9;
    dial.material.opacity = safeOpacity;
    if (rebuildT > 2.2) rebuildOk = null;
  }
  if (failFlash > 0){ failFlash -= dt;
    rim.intensity = 60 + Math.sin(failFlash*20)*30;
  } else rim.intensity = 60;
  renderer.render(scene, camera);
}
speak(L.welcome, 600);
tick();
