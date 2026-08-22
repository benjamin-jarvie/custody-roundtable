import * as THREE from "three";
import { speak, presentTool } from "./butler.js?v=4";
import { SCRIPTS } from "./script.js?v=2";
import {
  setupPhysicalRenderer,
  brushedMetal,
  blackMetal,
  honedStone,
  walnutWood,
  roundedBoxGeometry,
  contactShadow,
  castRealisticShadows
} from "./visuals.js?v=5";

const COPY = SCRIPTS.inUse;
const state = { fmt: "bip39", sig: "single", ven: "one", platform: "desktop" };
const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
const canvas = document.getElementById("c");
const readout = document.getElementById("readout");
const walkButton = document.getElementById("walk-psbt");

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight, false);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.08;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0b0e13);
scene.fog = new THREE.Fog(0x0b0e13, 13, 30);
setupPhysicalRenderer(THREE, renderer, scene, 1.12);
const camera = new THREE.PerspectiveCamera(53, innerWidth / innerHeight, 0.1, 60);
let yaw = 0.08;
let yawT = 0.08;
let pitch = 0.28;
let dist = 11.5;
let distT = 11.5;
let aspectPull = innerWidth < innerHeight ? 1.4 : 1;
const look = new THREE.Vector3(0, 1.6, -0.2);
const lookT = look.clone();
function frame(point, distance){
  lookT.copy(point);
  distT = distance;
}
function placeCamera(){
  const d = dist * aspectPull;
  camera.position.set(
    look.x + Math.sin(yaw) * d * Math.cos(pitch),
    look.y + 1.65 + Math.sin(pitch) * d * 0.55,
    look.z + Math.cos(yaw) * d * Math.cos(pitch)
  );
  camera.lookAt(look);
}
function resize(){
  renderer.setSize(innerWidth, innerHeight, false);
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  aspectPull = camera.aspect < 1 ? 1.4 : 1;
}
addEventListener("resize", resize);

const ambient = new THREE.AmbientLight(0x718099, 0.58);
scene.add(ambient);
const key = new THREE.SpotLight(0xfff1d2, 240, 30, Math.PI / 5, 0.45, 1.4);
key.position.set(1, 10, 6);
key.target.position.set(0, 1.3, -0.3);
key.castShadow = true;
key.shadow.mapSize.set(1024, 1024);
scene.add(key, key.target);
const gold = new THREE.PointLight(0xfbdc7b, 80, 27);
gold.position.set(-5, 6, 2);
scene.add(gold);
const cool = new THREE.PointLight(0x4b74a8, 65, 25);
cool.position.set(5, 5, -4);
scene.add(cool);
const follow = new THREE.SpotLight(0xfff4dc, 0, 18, Math.PI / 7, 0.38, 1.4);
follow.position.set(0, 8, 5);
scene.add(follow, follow.target);
let focusObj = null;
function focusOn(object, distance = 5.8){
  focusObj = object;
  if (object) frame(object.position, distance);
  else frame(new THREE.Vector3(0, 1.6, -0.2), 11.5);
}

const floor = new THREE.Mesh(
  new THREE.CircleGeometry(14, 64),
  honedStone(THREE, 0x10151c)
);
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
scene.add(floor);
const floorRing = new THREE.Mesh(
  new THREE.RingGeometry(5.5, 5.62, 96),
  new THREE.MeshStandardMaterial({
    color: 0xfbdc7b, metalness: 1, roughness: 0.34,
    emissive: 0x4a3c15, emissiveIntensity: 0.2
  })
);
floorRing.rotation.x = -Math.PI / 2;
floorRing.position.y = 0.01;
scene.add(floorRing);
const wall = new THREE.Mesh(
  new THREE.CylinderGeometry(13.5, 13.5, 12, 48, 1, true),
  honedStone(THREE, 0x141922)
);
wall.material.side = THREE.BackSide;
wall.position.y = 6;
scene.add(wall);

const desk = new THREE.Group();
const deskTop = new THREE.Mesh(
  new THREE.BoxGeometry(7.8, 0.25, 2.75),
  walnutWood(THREE)
);
deskTop.position.set(0, 1.23, -0.25);
deskTop.castShadow = true;
deskTop.receiveShadow = true;
desk.add(deskTop);
const deskEdge = new THREE.Group();
const deskEdgeMaterial = brushedMetal(THREE, 0xd8b354, 0.21);
[
  [7.95, 0.06, 0.07, 0, 0, -1.405],
  [7.95, 0.06, 0.07, 0, 0, 1.405],
  [0.07, 0.06, 2.74, -3.94, 0, 0],
  [0.07, 0.06, 2.74, 3.94, 0, 0]
].forEach(part => {
  const bar = new THREE.Mesh(
    new THREE.BoxGeometry(part[0], part[1], part[2]),
    deskEdgeMaterial
  );
  bar.position.set(part[3], part[4], part[5]);
  deskEdge.add(bar);
});
deskEdge.position.set(0, 1.38, -0.25);
desk.add(deskEdge);
for (const x of [-3.45, 3.45]){
  for (const z of [-1.15, 0.65]){
    const leg = new THREE.Mesh(
      new THREE.CylinderGeometry(0.1, 0.14, 1.2, 12),
      blackMetal(THREE, 0x171b22, 0.28)
    );
    leg.position.set(x, 0.6, z);
    leg.castShadow = true;
    desk.add(leg);
  }
}
castRealisticShadows(desk);
scene.add(desk);
const deskShadow = contactShadow(THREE, 8.6, 3.8, 0.7);
deskShadow.position.y = 0.018;
scene.add(deskShadow);

function screenTexture(lines, options = {}){
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 320;
  const x = c.getContext("2d");
  x.fillStyle = options.background || "#070a0f";
  x.fillRect(0, 0, c.width, c.height);
  x.strokeStyle = options.border || "#FBDC7B";
  x.lineWidth = 10;
  x.strokeRect(8, 8, 496, 304);
  x.textAlign = "center";
  x.textBaseline = "middle";
  x.fillStyle = options.color || "#E9E4D6";
  x.font = options.font || "bold 39px Menlo, monospace";
  lines.forEach((line, index) => x.fillText(line, 256, 105 + index * 68));
  const texture = new THREE.CanvasTexture(c);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}
function qrTexture(){
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 256;
  const x = c.getContext("2d");
  x.fillStyle = "#e9e4d6";
  x.fillRect(0, 0, 256, 256);
  x.fillStyle = "#0c0f14";
  const n = 21;
  const cell = 10;
  const offset = 23;
  function finder(cx, cy){
    x.fillRect(offset + cx * cell, offset + cy * cell, 7 * cell, 7 * cell);
    x.fillStyle = "#e9e4d6";
    x.fillRect(offset + (cx + 1) * cell, offset + (cy + 1) * cell, 5 * cell, 5 * cell);
    x.fillStyle = "#0c0f14";
    x.fillRect(offset + (cx + 2) * cell, offset + (cy + 2) * cell, 3 * cell, 3 * cell);
  }
  finder(0, 0);
  finder(14, 0);
  finder(0, 14);
  for (let row = 0; row < n; row++){
    for (let col = 0; col < n; col++){
      const inFinder = (col < 8 && row < 8) || (col > 12 && row < 8) || (col < 8 && row > 12);
      if (!inFinder && ((row * 17 + col * 11 + row * col) % 7 < 3)){
        x.fillRect(offset + col * cell, offset + row * cell, cell, cell);
      }
    }
  }
  const texture = new THREE.CanvasTexture(c);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.magFilter = THREE.NearestFilter;
  return texture;
}

const clickables = [];
function mark(group, mesh, kind){
  mesh.userData.owner = group;
  mesh.userData.kind = kind;
  clickables.push(mesh);
}
function makeMonitor(){
  const group = new THREE.Group();
  const body = new THREE.Mesh(
    roundedBoxGeometry(THREE, 2.35, 1.48, 0.2, 0.08),
    blackMetal(THREE, 0x272e39, 0.24)
  );
  body.castShadow = true;
  group.add(body);
  const screen = new THREE.Mesh(
    new THREE.PlaneGeometry(2.08, 1.2),
    new THREE.MeshStandardMaterial({
      map: screenTexture(["WATCH ONLY", "PSBT READY"]),
      emissive: 0xfbdc7b, emissiveIntensity: 0.16, roughness: 0.52,
      toneMapped: false
    })
  );
  screen.position.z = 0.16;
  group.add(screen);
  const stand = new THREE.Mesh(
    new THREE.CylinderGeometry(0.08, 0.11, 0.8, 12),
    new THREE.MeshStandardMaterial({ color: 0x20262f, metalness: 0.8, roughness: 0.35 })
  );
  stand.position.y = -1.0;
  group.add(stand);
  const foot = new THREE.Mesh(
    new THREE.BoxGeometry(1.15, 0.08, 0.7),
    new THREE.MeshStandardMaterial({ color: 0x20262f, metalness: 0.8, roughness: 0.35 })
  );
  foot.position.set(0, -1.38, 0.2);
  group.add(foot);
  group.userData.screen = screen;
  mark(group, body, "monitor");
  mark(group, screen, "monitor");
  return group;
}
function setWatchScreen(lines, color = "#FBDC7B"){
  const oldMap = activeWatch.userData.screen.material.map;
  activeWatch.userData.screen.material.map = screenTexture(lines, { border: color, color });
  activeWatch.userData.screen.material.emissive.set(color);
  activeWatch.userData.screen.material.needsUpdate = true;
  if (oldMap) oldMap.dispose();
}
function makePhone(){
  const group = new THREE.Group();
  const body = new THREE.Mesh(
    roundedBoxGeometry(THREE, 0.88, 1.62, 0.16, 0.14),
    blackMetal(THREE, 0x202833, 0.22)
  );
  group.add(body);
  const screen = new THREE.Mesh(
    new THREE.PlaneGeometry(0.7, 1.24),
    new THREE.MeshStandardMaterial({
      map: screenTexture(["WATCH ONLY", "PSBT READY"]),
      emissive: 0xfbdc7b, emissiveIntensity: 0.16, roughness: 0.5,
      toneMapped: false
    })
  );
  screen.position.z = 0.125;
  group.add(screen);
  const stand = new THREE.Mesh(
    new THREE.BoxGeometry(0.66, 0.08, 0.5),
    blackMetal(THREE, 0x171d25, 0.26)
  );
  stand.position.set(0, -0.86, 0.13);
  group.add(stand);
  group.userData.screen = screen;
  mark(group, body, "monitor");
  mark(group, screen, "monitor");
  return group;
}
function makeSigner(variant){
  const group = new THREE.Group();
  const widths = [1.1, 1.35, 0.95];
  const heights = [1.55, 1.34, 1.68];
  const depths = [0.36, 0.42, 0.3];
  const colors = [0x252c37, 0x30423b, 0x40352e];
  const body = new THREE.Mesh(
    roundedBoxGeometry(
      THREE,
      widths[variant],
      heights[variant],
      depths[variant],
      0.09
    ),
    blackMetal(THREE, colors[variant], 0.24)
  );
  body.castShadow = true;
  group.add(body);
  const screen = new THREE.Mesh(
    new THREE.PlaneGeometry(widths[variant] * 0.77, heights[variant] * 0.45),
    new THREE.MeshStandardMaterial({
      map: screenTexture(["BIP-39", "WAITING"]),
      emissive: 0xfbdc7b, emissiveIntensity: 0.13, roughness: 0.55,
      toneMapped: false
    })
  );
  screen.position.set(0, heights[variant] * 0.14, depths[variant] / 2 + 0.058);
  group.add(screen);
  for (let i = 0; i < 3; i++){
    const button = new THREE.Mesh(
      new THREE.CylinderGeometry(0.055, 0.055, 0.025, 12),
      new THREE.MeshStandardMaterial({
        color: i === 1 ? 0xfbdc7b : 0x8c95a4,
        metalness: 0.82, roughness: 0.3
      })
    );
    button.rotation.x = Math.PI / 2;
    button.position.set((i - 1) * 0.2, -heights[variant] * 0.28, depths[variant] / 2 + 0.018);
    group.add(button);
  }
  group.userData.screen = screen;
  group.userData.variant = variant;
  mark(group, body, "signer");
  mark(group, screen, "signer");
  return group;
}
function setSigner(signer, lines, color = "#FBDC7B"){
  const oldMap = signer.userData.screen.material.map;
  signer.userData.screen.material.map = screenTexture(lines, { border: color, color });
  signer.userData.screen.material.emissive.set(color);
  signer.userData.screen.material.needsUpdate = true;
  if (oldMap) oldMap.dispose();
}

const monitor = makeMonitor();
monitor.position.set(-2.85, 2.75, -0.2);
castRealisticShadows(monitor);
scene.add(monitor);
const phone = makePhone();
phone.position.set(-2.85, 2.22, -0.2);
castRealisticShadows(phone);
scene.add(phone);
let activeWatch = monitor;
const signers = [makeSigner(0), makeSigner(1), makeSigner(2)];
signers.forEach(signer => {
  castRealisticShadows(signer);
  scene.add(signer);
});

const psbt = new THREE.Group();
const envelope = new THREE.Mesh(
  roundedBoxGeometry(THREE, 1.0, 0.72, 0.12, 0.06),
  brushedMetal(THREE, 0x4b5563, 0.22)
);
envelope.rotation.x = -Math.PI / 2;
envelope.material.emissive = new THREE.Color(0x251f0a);
envelope.material.emissiveIntensity = 0.16;
envelope.castShadow = true;
psbt.add(envelope);
const qr = new THREE.Mesh(
  new THREE.PlaneGeometry(0.62, 0.62),
  new THREE.MeshBasicMaterial({ map: qrTexture(), side: THREE.DoubleSide })
);
qr.rotation.x = -Math.PI / 2;
qr.position.y = 0.065;
psbt.add(qr);
psbt.userData.kind = "psbt";
mark(psbt, envelope, "psbt");
mark(psbt, qr, "psbt");
scene.add(psbt);
const pathLine = new THREE.Line(
  new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]),
  new THREE.LineDashedMaterial({
    color: 0xfbdc7b, dashSize: 0.2, gapSize: 0.13,
    transparent: true, opacity: 0.65
  })
);
pathLine.visible = false;
scene.add(pathLine);

const targets = new Map();
function setTarget(object, x, y, z, visible = true){
  const wasVisible = object.visible;
  targets.set(object, { position: new THREE.Vector3(x, y, z), visible });
  if (visible && !wasVisible){
    object.position.set(x, y, z);
    object.visible = true;
  }
}
function formatStateLines(){
  if (state.fmt === "bip32") return ["BIP-32", "RAW KEY LOADED"];
  if (state.fmt === "codex32") return ["CODEX32", "DECODED"];
  return ["BIP-39", "WORDS LOADED"];
}
function resetSigning(){
  transfer.active = false;
  transfer.pause = 0;
  transfer.step = 0;
  pathLine.visible = false;
  walkButton.disabled = false;
  const start = activeWatch.position.clone().add(
    state.platform === "desktop"
      ? new THREE.Vector3(1.1, -0.98, 0.62)
      : new THREE.Vector3(0.9, -0.42, 0.58)
  );
  psbt.position.copy(start);
  psbt.rotation.set(0, 0, 0);
  setWatchScreen(["WATCH ONLY", "PSBT READY"]);
  signers.forEach(signer => setSigner(signer, formatStateLines()));
  readout.textContent = "PSBT unsigned";
}
function relayout(){
  const multi = state.sig === "multi";
  activeWatch = state.platform === "phone" ? phone : monitor;
  setTarget(monitor, -2.85, 2.75, -0.2, state.platform === "desktop");
  setTarget(phone, -2.85, 2.22, -0.2, state.platform === "phone");
  const spots = multi
    ? [[-0.65, 2.22, -0.5], [1.15, 2.2, -0.85], [2.85, 2.28, -0.4]]
    : [[1.1, 2.25, -0.5], [0, 2.2, -0.8], [0, 2.2, -0.8]];
  signers.forEach((signer, index) => {
    const spot = spots[index];
    setTarget(signer, spot[0], spot[1], spot[2], multi || index === 0);
    const body = signer.children[0];
    const variant = multi && state.ven === "multi" ? index : 0;
    body.material.color.setHex([0x252c37, 0x30423b, 0x40352e][variant]);
    signer.rotation.y = multi ? (index - 1) * -0.18 : -0.05;
    if (multi && state.ven === "one"){
      const normalizers = [[1,1,1],[0.82,1.16,0.86],[1.16,0.92,1.18]];
      signer.scale.set(...normalizers[index]);
    } else signer.scale.set(1,1,1);
  });
  resetSigning();
  focusOn(null);
}

const transfer = {
  active: false,
  points: [],
  owners: [],
  step: 0,
  time: 0,
  pause: 0,
  signatures: 0
};
function startTransfer(){
  if (transfer.active) return;
  const required = state.sig === "multi" ? 2 : 1;
  const start = activeWatch.position.clone().add(
    state.platform === "desktop"
      ? new THREE.Vector3(1.1, -0.98, 0.62)
      : new THREE.Vector3(0.9, -0.42, 0.58)
  );
  const points = [start];
  const owners = [activeWatch];
  for (let i = 0; i < required; i++){
    points.push(signers[i].position.clone().add(new THREE.Vector3(0, 0.2, 0.6)));
    owners.push(signers[i]);
  }
  points.push(start.clone());
  owners.push(activeWatch);
  transfer.active = true;
  transfer.points = points;
  transfer.owners = owners;
  transfer.step = 0;
  transfer.time = 0;
  transfer.pause = 0;
  transfer.signatures = 0;
  psbt.position.copy(points[0]);
  walkButton.disabled = true;
  readout.textContent = "PSBT crossing the air gap";
  setWatchScreen(["PSBT", "IN FLIGHT"]);
  speak(COPY.transferStart);
  focusOn(psbt, 5.4);
}
walkButton.addEventListener("click", () => {
  if (transfer.active) return;
  walkButton.disabled = true;
  presentTool("psbt", "PSBT", 760);
  setTimeout(startTransfer, reduced ? 0 : 480);
});

function arrive(owner){
  if (owner === activeWatch){
    if (transfer.step + 1 === transfer.points.length - 1){
      setWatchScreen(["READY TO", "BROADCAST"], "#8FC79A");
      readout.textContent = "Signed transaction ready";
      speak(COPY.transferDone);
      transfer.active = false;
      walkButton.disabled = false;
      setTimeout(() => focusOn(null), reduced ? 0 : 2600);
    }
    return;
  }
  transfer.signatures += 1;
  setSigner(owner, ["SIGNED", transfer.signatures + " OF " + (state.sig === "multi" ? "2" : "1")], "#8FC79A");
  readout.textContent = "Signature " + transfer.signatures + " attached";
  speak(COPY.transferStep(transfer.signatures));
  focusOn(owner, 5.2);
}

function wireChips(id, key, callback){
  document.getElementById(id).addEventListener("click", event => {
    const button = event.target.closest(".chip");
    if (!button || button.disabled || transfer.active) return;
    document.querySelectorAll("#" + id + " .chip").forEach(chip => chip.classList.remove("on"));
    button.classList.add("on");
    state[key] = button.dataset.v;
    callback(button.dataset.v);
  });
}
function syncVendorLock(){
  const locked = state.sig === "single";
  document.querySelectorAll("#ven .chip").forEach(chip => chip.disabled = locked);
}
wireChips("fmt", "fmt", value => {
  relayout();
  speak(COPY.format[value]);
});
wireChips("platform", "platform", value => {
  relayout();
  presentTool(value === "phone" ? "device" : "psbt", value, 800);
  speak([COPY.platform[value]]);
});
wireChips("sig", "sig", value => {
  if (value === "single"){
    state.ven = "one";
    document.querySelectorAll("#ven .chip").forEach(chip => {
      chip.classList.toggle("on", chip.dataset.v === "one");
    });
  }
  syncVendorLock();
  relayout();
  speak(COPY.signers[value]);
});
document.getElementById("ven").addEventListener("click", event => {
  if (state.sig === "single" && event.target.closest(".chip")) speak(COPY.vendorLocked);
});
wireChips("ven", "ven", value => {
  relayout();
  speak(COPY.vendors[value]);
});
syncVendorLock();
relayout();

const ray = new THREE.Raycaster();
const pointer = new THREE.Vector2();
let dragging = false;
let moved = false;
let px = 0;
let py = 0;
canvas.addEventListener("pointerdown", event => {
  dragging = true;
  moved = false;
  px = event.clientX;
  py = event.clientY;
});
addEventListener("pointermove", event => {
  if (!dragging) return;
  const dx = event.clientX - px;
  const dy = event.clientY - py;
  if (Math.abs(dx) + Math.abs(dy) > 4) moved = true;
  yawT = THREE.MathUtils.clamp(yawT + dx * 0.004, -0.58, 0.58);
  pitch = THREE.MathUtils.clamp(pitch + dy * 0.002, 0.14, 0.58);
  px = event.clientX;
  py = event.clientY;
});
addEventListener("pointerup", event => {
  dragging = false;
  if (moved || transfer.active) return;
  if (event.target !== canvas) return;
  pointer.x = event.clientX / innerWidth * 2 - 1;
  pointer.y = -(event.clientY / innerHeight) * 2 + 1;
  ray.setFromCamera(pointer, camera);
  const hit = ray.intersectObjects(clickables, false).find(item => item.object.visible);
  if (!hit){
    focusOn(null);
    return;
  }
  const owner = hit.object.userData.owner;
  const kind = hit.object.userData.kind;
  focusOn(owner, 5.2);
  speak(COPY.object[kind]);
});
addEventListener("wheel", event => {
  distT = THREE.MathUtils.clamp(distT + event.deltaY * 0.01, 6, 15);
}, { passive: true });

const clock = new THREE.Clock();
function updateTransfer(dt){
  if (!transfer.active) return;
  if (transfer.pause > 0){
    transfer.pause -= dt;
    if (transfer.pause <= 0){
      transfer.time = 0;
      transfer.step += 1;
      if (transfer.step >= transfer.points.length - 1) return;
    }
    return;
  }
  const from = transfer.points[transfer.step];
  const to = transfer.points[transfer.step + 1];
  transfer.time += dt / 1.25;
  const t = THREE.MathUtils.smoothstep(Math.min(transfer.time, 1), 0, 1);
  psbt.position.lerpVectors(from, to, t);
  psbt.position.y += Math.sin(t * Math.PI) * 0.52;
  psbt.rotation.y += dt * 1.8;
  pathLine.geometry.setFromPoints([from, to]);
  pathLine.computeLineDistances();
  pathLine.visible = true;
  if (transfer.time >= 1){
    psbt.position.copy(to);
    pathLine.visible = false;
    const owner = transfer.owners[transfer.step + 1];
    arrive(owner);
    if (transfer.active) transfer.pause = reduced ? 0.05 : 0.75;
  }
}
function tick(){
  requestAnimationFrame(tick);
  const dt = Math.min(clock.getDelta(), 0.05);
  if (!reduced && !dragging) yawT += Math.sin(clock.elapsedTime * 0.15) * 0.00025;
  yaw += (yawT - yaw) * 0.08;
  look.lerp(lookT, reduced ? 1 : dt * 2.4);
  dist += (distT - dist) * (reduced ? 1 : dt * 2.4);
  placeCamera();
  for (const [object, target] of targets){
    if (target.visible) object.visible = true;
    object.position.lerp(target.position, reduced ? 1 : 0.1);
    if (!target.visible && object.position.distanceTo(target.position) < 0.06) object.visible = false;
  }
  if (focusObj){
    follow.target.position.lerp(focusObj.position, dt * 4);
    follow.position.lerp(new THREE.Vector3(focusObj.position.x, 8, focusObj.position.z + 4.5), dt * 4);
    follow.intensity += (225 - follow.intensity) * dt * 3;
    ambient.intensity += (0.19 - ambient.intensity) * dt * 3;
    key.intensity += (90 - key.intensity) * dt * 3;
  } else {
    follow.intensity += (0 - follow.intensity) * dt * 3;
    ambient.intensity += (0.58 - ambient.intensity) * dt * 3;
    key.intensity += (240 - key.intensity) * dt * 3;
  }
  updateTransfer(dt);
  renderer.render(scene, camera);
}
speak(COPY.welcome, 500);
presentTool("psbt", "PSBT", 1200);
tick();
