import * as THREE from "three";
import { speak, presentTool } from "./butler.js?v=4";
import { SCRIPTS } from "./script.js";
import {
  setupPhysicalRenderer,
  brushedMetal,
  blackMetal,
  honedStone,
  roundedBoxGeometry,
  contactShadow,
  castRealisticShadows
} from "./visuals.js?v=4";

const COPY = SCRIPTS.generation;
const state = { fmt: "bip39", sig: "single", ven: "one" };
const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
const canvas = document.getElementById("c");
const readout = document.getElementById("readout");

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight, false);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0b0e13);
scene.fog = new THREE.Fog(0x0b0e13, 14, 31);
setupPhysicalRenderer(THREE, renderer, scene, 1.13);
const camera = new THREE.PerspectiveCamera(52, innerWidth / innerHeight, 0.1, 60);
let yaw = -0.08;
let yawT = -0.08;
let pitch = 0.3;
let dist = 11;
let distT = 11;
let aspectPull = innerWidth < innerHeight ? 1.35 : 1;
const look = new THREE.Vector3(0, 1.45, 0);
const lookT = look.clone();
function frame(point, distance){
  lookT.copy(point);
  distT = distance;
}
function placeCamera(){
  const d = dist * aspectPull;
  camera.position.set(
    look.x + Math.sin(yaw) * d * Math.cos(pitch),
    look.y + 1.7 + Math.sin(pitch) * d * 0.55,
    look.z + Math.cos(yaw) * d * Math.cos(pitch)
  );
  camera.lookAt(look);
}
function resize(){
  renderer.setSize(innerWidth, innerHeight, false);
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  aspectPull = camera.aspect < 1 ? 1.35 : 1;
}
addEventListener("resize", resize);

const ambient = new THREE.AmbientLight(0x748096, 0.58);
scene.add(ambient);
const key = new THREE.SpotLight(0xfff1cf, 260, 30, Math.PI / 5, 0.45, 1.4);
key.position.set(1, 10, 6);
key.target.position.set(0, 1.2, 0);
key.castShadow = true;
key.shadow.mapSize.set(1024, 1024);
scene.add(key, key.target);
const rim = new THREE.PointLight(0xfbdc7b, 75, 25);
rim.position.set(-5, 6, 1);
scene.add(rim);
const cool = new THREE.PointLight(0x4d6f9f, 55, 22);
cool.position.set(6, 4, -4);
scene.add(cool);
const follow = new THREE.SpotLight(0xfff4da, 0, 18, Math.PI / 7, 0.38, 1.4);
follow.position.set(0, 8, 5);
scene.add(follow, follow.target);
let focusObj = null;
function focusOn(object, distance = 6.2){
  focusObj = object;
  if (object) frame(object.position, distance);
  else frame(new THREE.Vector3(0, 1.45, 0), 11);
}

const floor = new THREE.Mesh(
  new THREE.CircleGeometry(14, 64),
  honedStone(THREE, 0x11161e)
);
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
scene.add(floor);
const floorRing = new THREE.Mesh(
  new THREE.RingGeometry(5.4, 5.52, 96),
  brushedMetal(THREE, 0xd8b354, 0.21)
);
floorRing.material.emissive = new THREE.Color(0x3a2f0c);
floorRing.material.emissiveIntensity = 0.14;
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

const table = new THREE.Group();
const top = new THREE.Mesh(
  new THREE.BoxGeometry(6.8, 0.28, 3.45),
  honedStone(THREE, 0x242830)
);
top.position.y = 1.34;
top.castShadow = true;
top.receiveShadow = true;
table.add(top);
const edge = new THREE.Group();
const edgeMaterial = brushedMetal(THREE, 0xd8b354, 0.22);
[
  [6.95, 0.08, 0.07, 0, 0, -1.765],
  [6.95, 0.08, 0.07, 0, 0, 1.765],
  [0.07, 0.08, 3.46, -3.44, 0, 0],
  [0.07, 0.08, 3.46, 3.44, 0, 0]
].forEach(part => {
  const bar = new THREE.Mesh(
    new THREE.BoxGeometry(part[0], part[1], part[2]),
    edgeMaterial
  );
  bar.position.set(part[3], part[4], part[5]);
  edge.add(bar);
});
edge.position.y = 1.5;
table.add(edge);
for (const x of [-2.8, 2.8]){
  for (const z of [-1.25, 1.25]){
    const leg = new THREE.Mesh(
      new THREE.CylinderGeometry(0.11, 0.15, 1.35, 12),
      blackMetal(THREE, 0x171b22, 0.28)
    );
    leg.position.set(x, 0.65, z);
    leg.castShadow = true;
    table.add(leg);
  }
}
castRealisticShadows(table);
scene.add(table);
const tableShadow = contactShadow(THREE, 7.8, 4.25, 0.68);
tableShadow.position.y = 0.018;
scene.add(tableShadow);

function textTexture(lines, options = {}){
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 320;
  const x = c.getContext("2d");
  x.fillStyle = options.background || "#10141b";
  x.fillRect(0, 0, c.width, c.height);
  const g = x.createLinearGradient(0, 0, c.width, c.height);
  g.addColorStop(0, "rgba(255,255,255,.10)");
  g.addColorStop(1, "rgba(0,0,0,.12)");
  x.fillStyle = g;
  x.fillRect(0, 0, c.width, c.height);
  x.strokeStyle = options.border || "#FBDC7B";
  x.lineWidth = 10;
  x.strokeRect(8, 8, 496, 304);
  x.textAlign = "center";
  x.textBaseline = "middle";
  x.fillStyle = options.color || "#E9E4D6";
  x.font = options.font || "bold 42px Menlo, monospace";
  lines.forEach((line, index) => x.fillText(line, 256, 105 + index * 66));
  const texture = new THREE.CanvasTexture(c);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

const clickables = [];
function mark(group, mesh, kind){
  mesh.userData.owner = group;
  mesh.userData.kind = kind;
  clickables.push(mesh);
}
function setDeviceScreen(device, lines, color = "#FBDC7B"){
  const oldMap = device.userData.screen.material.map;
  device.userData.screen.material.map = textTexture(lines, {
    background: "#080b0f", border: color, color
  });
  device.userData.screen.material.needsUpdate = true;
  if (oldMap) oldMap.dispose();
}
function makeDevice(variant){
  const group = new THREE.Group();
  const widths = [1.25, 1.05, 1.42];
  const heights = [1.72, 1.42, 1.55];
  const colors = [0x252c37, 0x31423d, 0x3b332d];
  const body = new THREE.Mesh(
    roundedBoxGeometry(
      THREE,
      widths[variant],
      heights[variant],
      0.34 + variant * 0.04,
      0.09
    ),
    blackMetal(THREE, colors[variant], 0.24)
  );
  body.castShadow = true;
  group.add(body);
  const screen = new THREE.Mesh(
    new THREE.PlaneGeometry(widths[variant] * 0.76, heights[variant] * 0.42),
    new THREE.MeshStandardMaterial({
      map: textTexture(["RNG", "READY"], { background: "#080b0f" }),
      emissive: 0xfbdc7b, emissiveIntensity: 0.16, metalness: 0.1,
      roughness: 0.55, toneMapped: false
    })
  );
  screen.position.set(0, heights[variant] * 0.17, 0.245 + variant * 0.025);
  group.add(screen);
  const button = new THREE.Mesh(
    new THREE.CylinderGeometry(0.11, 0.11, 0.045, 18),
    new THREE.MeshStandardMaterial({ color: 0xfbdc7b, metalness: 1, roughness: 0.25 })
  );
  button.rotation.x = Math.PI / 2;
  button.position.set(0, -heights[variant] * 0.28, 0.2 + variant * 0.02);
  group.add(button);
  group.userData.screen = screen;
  group.userData.kind = "device";
  mark(group, body, "device");
  mark(group, screen, "device");
  return group;
}

function makeDie(index){
  const group = new THREE.Group();
  const die = new THREE.Mesh(
    roundedBoxGeometry(THREE, 0.46, 0.46, 0.46, 0.085),
    new THREE.MeshPhysicalMaterial({
      color: 0xeee8db,
      metalness: 0.02,
      roughness: 0.34,
      clearcoat: 0.28,
      clearcoatRoughness: 0.24,
      envMapIntensity: 1.05
    })
  );
  die.castShadow = true;
  group.add(die);
  const pipGeo = new THREE.SphereGeometry(0.038, 10, 6);
  const pipMat = new THREE.MeshStandardMaterial({ color: 0x111317, roughness: 0.7 });
  const layouts = [
    [[0, 0]],
    [[-0.12, -0.12], [0.12, 0.12]],
    [[-0.12, -0.12], [0, 0], [0.12, 0.12]],
    [[-0.12, -0.12], [-0.12, 0.12], [0.12, -0.12], [0.12, 0.12]]
  ];
  layouts[index % layouts.length].forEach(point => {
    const pip = new THREE.Mesh(pipGeo, pipMat);
    pip.position.set(point[0], 0.235, point[1]);
    group.add(pip);
  });
  group.userData.velocity = new THREE.Vector3();
  mark(group, die, "dice");
  return group;
}
const diceGroup = new THREE.Group();
const dice = [];
for (let i = 0; i < 7; i++){
  const die = makeDie(i);
  die.position.set((i % 4) * 0.52 - 0.78, 0, Math.floor(i / 4) * 0.58 - 0.3);
  die.rotation.set(i * 0.27, i * 0.51, i * 0.19);
  diceGroup.add(die);
  dice.push(die);
}
diceGroup.userData.kind = "dice";
scene.add(diceGroup);

const worksheet = new THREE.Group();
const sheet = new THREE.Mesh(
  roundedBoxGeometry(THREE, 2.7, 1.85, 0.06, 0.05),
  new THREE.MeshPhysicalMaterial({
    color: 0xd8d0bd,
    roughness: 0.72,
    sheen: 0.2,
    sheenColor: 0xfff1d0,
    envMapIntensity: 0.45
  })
);
sheet.rotation.x = -Math.PI / 2;
sheet.castShadow = true;
worksheet.add(sheet);
const sheetFace = new THREE.Mesh(
  new THREE.PlaneGeometry(2.58, 1.73),
  new THREE.MeshStandardMaterial({
    map: textTexture(["CODEX32", "CHECK BY HAND"], {
      background: "#d9d2bf", color: "#171a1f", border: "#2a3242",
      font: "bold 36px Menlo, monospace"
    }),
    roughness: 0.82
  })
);
sheetFace.rotation.x = -Math.PI / 2;
sheetFace.position.y = 0.058;
worksheet.add(sheetFace);
const pencil = new THREE.Mesh(
  new THREE.CylinderGeometry(0.035, 0.035, 2.25, 10),
  new THREE.MeshStandardMaterial({ color: 0x2f343a, metalness: 0.22, roughness: 0.5 })
);
pencil.rotation.z = Math.PI / 2;
pencil.rotation.y = 0.32;
pencil.position.y = 0.12;
worksheet.add(pencil);
worksheet.userData.kind = "worksheet";
mark(worksheet, sheet, "worksheet");
mark(worksheet, sheetFace, "worksheet");
scene.add(worksheet);

const keyCard = new THREE.Group();
const keyBase = new THREE.Mesh(
  roundedBoxGeometry(THREE, 2.2, 1.35, 0.12, 0.08),
  blackMetal(THREE, 0x20262f, 0.25)
);
keyBase.rotation.x = -Math.PI / 2;
keyBase.castShadow = true;
keyCard.add(keyBase);
const keyFace = new THREE.Mesh(
  new THREE.PlaneGeometry(2.05, 1.2),
  new THREE.MeshStandardMaterial({
    map: textTexture(["BIP-32 KEY", "NO WORDS"], {
      background: "#151a22", color: "#E9E4D6", border: "#8C95A4",
      font: "bold 38px Menlo, monospace"
    }),
    metalness: 0.3, roughness: 0.5
  })
);
keyFace.rotation.x = -Math.PI / 2;
keyFace.position.y = 0.092;
keyCard.add(keyFace);
keyCard.userData.kind = "device";
mark(keyCard, keyBase, "device");
mark(keyCard, keyFace, "device");
scene.add(keyCard);

const devices = [makeDevice(0), makeDevice(1), makeDevice(2)];
devices.forEach(device => {
  castRealisticShadows(device);
  scene.add(device);
});
const targets = new Map();
let rolling = false;
let rollTime = 0;
function setTarget(object, x, y, z, visible = true){
  const wasVisible = object.visible;
  targets.set(object, { position: new THREE.Vector3(x, y, z), visible });
  if (visible && !wasVisible){
    object.position.set(x, y, z);
    object.visible = true;
  }
}
function resetCeremony(){
  readout.textContent = "Ceremony ready";
  rolling = false;
  devices.forEach(device => setDeviceScreen(device, ["RNG", "READY"]));
}
function relayout(){
  const multi = state.sig === "multi";
  const showDice = true;
  const showWorksheet = state.fmt === "codex32";
  const showKeyCard = state.fmt === "bip32";
  setTarget(diceGroup, showWorksheet ? -1.8 : -1.25, 1.78, 0.25, showDice);
  setTarget(worksheet, 0.2, 1.72, 0.1, showWorksheet);
  setTarget(keyCard, -0.75, 1.72, 0.15, showKeyCard);
  const spots = multi
    ? [[-1.9, 2.4, -0.75], [0.25, 2.42, -1.0], [2.35, 2.4, -0.68]]
    : [[1.25, 2.4, -0.35], [0, 2.4, -1], [0, 2.4, -1]];
  devices.forEach((device, index) => {
    const spot = spots[index];
    setTarget(device, spot[0], spot[1], spot[2], multi || index === 0);
    const variant = multi && state.ven === "multi" ? index : 0;
    const body = device.children[0];
    body.material.color.setHex([0x252c37, 0x31423d, 0x3b332d][variant]);
    device.rotation.y = multi ? (index - 1) * -0.18 : -0.08;
  });
  const hero = showWorksheet ? worksheet : showKeyCard ? keyCard : diceGroup;
  focusOn(hero, 6.2);
  setTimeout(() => focusOn(null), reduced ? 0 : 1400);
  resetCeremony();
}
relayout();
document.getElementById("device-entropy").addEventListener("click", () => {
  rolling = false;
  presentTool("device", "Seed", 850);
  devices.filter(device => device.visible).forEach(device => setDeviceScreen(device, ["SEED", "SEALED"]));
  readout.textContent = "Device entropy accepted";
  focusOn(devices[0], 5.7);
  speak(COPY.device);
  setTimeout(() => focusOn(null), reduced ? 0 : 2600);
});
document.getElementById("roll-dice").addEventListener("click", () => {
  rolling = true;
  presentTool("dice", "Entropy", 900);
  rollTime = 0;
  dice.forEach((die, index) => {
    die.userData.velocity.set(5 + index * 0.32, 6.2 - index * 0.21, 4.5 + index * 0.18);
  });
  readout.textContent = "Physical entropy in motion";
  focusOn(diceGroup, 5.4);
  speak(COPY.dice);
});

function wireChips(id, key, callback){
  document.getElementById(id).addEventListener("click", event => {
    const button = event.target.closest(".chip");
    if (!button || button.disabled) return;
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
  const trayKind = value === "codex32" ? "paper" : value === "bip32" ? "device" : "dice";
  presentTool(trayKind, value, 800);
  setTimeout(relayout, reduced ? 0 : 420);
  speak(COPY.format[value]);
});
wireChips("sig", "sig", value => {
  if (value === "single"){
    state.ven = "one";
    document.querySelectorAll("#ven .chip").forEach(chip => {
      chip.classList.toggle("on", chip.dataset.v === "one");
    });
  }
  syncVendorLock();
  presentTool("device", value === "multi" ? "Three signers" : "One signer", 800);
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
  if (moved) return;
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
  focusOn(owner, 5.4);
  speak(COPY.object[kind]);
});
addEventListener("wheel", event => {
  distT = THREE.MathUtils.clamp(distT + event.deltaY * 0.01, 6, 15);
}, { passive: true });

const clock = new THREE.Clock();
function tick(){
  requestAnimationFrame(tick);
  const dt = Math.min(clock.getDelta(), 0.05);
  if (!reduced && !dragging) yawT += Math.sin(clock.elapsedTime * 0.16) * 0.00025;
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
    follow.intensity += (220 - follow.intensity) * dt * 3;
    ambient.intensity += (0.2 - ambient.intensity) * dt * 3;
    key.intensity += (95 - key.intensity) * dt * 3;
  } else {
    follow.intensity += (0 - follow.intensity) * dt * 3;
    ambient.intensity += (0.58 - ambient.intensity) * dt * 3;
    key.intensity += (260 - key.intensity) * dt * 3;
  }
  if (rolling){
    rollTime += dt;
    dice.forEach((die, index) => {
      die.rotation.x += die.userData.velocity.x * dt;
      die.rotation.y += die.userData.velocity.y * dt;
      die.rotation.z += die.userData.velocity.z * dt;
      die.position.y = Math.abs(Math.sin(rollTime * 6 + index)) * 0.24;
    });
    if (rollTime > 1.7){
      rolling = false;
      dice.forEach(die => die.position.y = 0);
      devices.filter(device => device.visible).forEach(device => setDeviceScreen(device, ["DICE", "MIXED"]));
      readout.textContent = "Observable entropy recorded";
      if (state.fmt === "codex32") worksheet.children[1].material.emissive = new THREE.Color(0xfbdc7b);
      setTimeout(() => focusOn(null), reduced ? 0 : 1600);
    }
  }
  renderer.render(scene, camera);
}
speak(COPY.welcome, 500);
presentTool("dice", "Entropy", 1200);
tick();
