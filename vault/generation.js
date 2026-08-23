import * as THREE from "three";
import { speak, presentTool } from "./butler.js?v=4";
import { SCRIPTS } from "./script.js?v=6";
import {
  getJourneyState,
  updateJourney,
  journeyChoicePatch,
  syncChoiceControls,
  mountJourneyStations,
  completeStation,
  getSessionMnemonic,
  setSessionMnemonic
} from "./journey.js?v=3";
import { WORDS, generateMnemonic, validLastWords, validMnemonic } from "./mnemonic.js?v=1";
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

const COPY = SCRIPTS.generation;
const savedJourney = getJourneyState();
const state = { fmt: savedJourney.format, sig: savedJourney.signers, ven: savedJourney.vendors };
const DEMO_WORDS = ["abandon","abandon","abandon","abandon","abandon","abandon",
  "abandon","abandon","abandon","abandon","abandon","about"];
let paperWords = getSessionMnemonic(DEMO_WORDS);
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
  walnutWood(THREE)
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
    roundedBoxGeometry(THREE, 0.3, 0.3, 0.3, 0.055),
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
  const pipGeo = new THREE.SphereGeometry(0.024, 10, 6);
  const pipMat = new THREE.MeshStandardMaterial({ color: 0x111317, roughness: 0.7 });
  const layouts = [
    [[0, 0]],
    [[-0.075, -0.075], [0.075, 0.075]],
    [[-0.075, -0.075], [0, 0], [0.075, 0.075]],
    [[-0.075, -0.075], [-0.075, 0.075], [0.075, -0.075], [0.075, 0.075]]
  ];
  layouts[index % layouts.length].forEach(point => {
    const pip = new THREE.Mesh(pipGeo, pipMat);
    pip.position.set(point[0], 0.153, point[1]);
    group.add(pip);
  });
  group.userData.velocity = new THREE.Vector3();
  mark(group, die, "dice");
  return group;
}
const diceGroup = new THREE.Group();
const dice = [];
for (let i = 0; i < 5; i++){
  const die = makeDie(i);
  die.position.set((i % 3) * 0.34 - 0.34, 0, Math.floor(i / 3) * 0.36 - 0.18);
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

function seedPaperTexture(words){
  const canvas = document.createElement("canvas");
  canvas.width = 768;
  canvas.height = 480;
  const context = canvas.getContext("2d");
  const paperGradient = context.createLinearGradient(0, 0, 768, 480);
  paperGradient.addColorStop(0, "#f2e8c9");
  paperGradient.addColorStop(1, "#d8c8a1");
  context.fillStyle = paperGradient;
  context.fillRect(0, 0, 768, 480);
  context.strokeStyle = "rgba(101,74,39,.16)";
  context.lineWidth = 2;
  for (let y = 112; y < 440; y += 78){
    context.beginPath(); context.moveTo(46, y); context.lineTo(722, y); context.stroke();
  }
  context.fillStyle = "#4f3b26";
  context.font = "600 24px -apple-system, sans-serif";
  context.fillText("WORKING SEED PAPER", 46, 58);
  context.font = "34px Bradley Hand, Chalkboard, Georgia, serif";
  words.forEach((word, index) => {
    const column = index % 3;
    const row = Math.floor(index / 3);
    context.fillText((index + 1) + ". " + word, 50 + column * 236, 102 + row * 78);
  });
  context.fillStyle = "#8b7454";
  context.font = "20px -apple-system, sans-serif";
  context.fillText("Working copy. Prove it, then move it to steel.", 46, 455);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

const seedPaper = new THREE.Group();
const paperBase = new THREE.Mesh(
  roundedBoxGeometry(THREE, 3.25, 2.1, 0.07, 0.025),
  new THREE.MeshPhysicalMaterial({
    color: 0xd8c8a1,
    roughness: 0.9,
    clearcoat: 0.02,
    sheen: 0.18,
    sheenColor: 0xfff1d0,
    envMapIntensity: 0.42
  })
);
paperBase.rotation.x = -Math.PI / 2;
seedPaper.add(paperBase);
const paperFace = new THREE.Mesh(
  new THREE.PlaneGeometry(3.12, 1.98),
  new THREE.MeshBasicMaterial({ map: seedPaperTexture(paperWords), toneMapped: false })
);
paperFace.rotation.x = -Math.PI / 2;
paperFace.position.y = 0.045;
seedPaper.add(paperFace);
seedPaper.userData.kind = "paper";
mark(seedPaper, paperBase, "paper");
mark(seedPaper, paperFace, "paper");
castRealisticShadows(seedPaper);
scene.add(seedPaper);

function updatePaperTexture(){
  const oldMap = paperFace.material.map;
  paperFace.material.map = seedPaperTexture(paperWords);
  paperFace.material.needsUpdate = true;
  oldMap?.dispose();
}

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
keyCard.userData.kind = "keyfile";
mark(keyCard, keyBase, "keyfile");
mark(keyCard, keyFace, "keyfile");
scene.add(keyCard);

const devices = [makeDevice(0), makeDevice(1), makeDevice(2)];
devices.forEach(device => {
  castRealisticShadows(device);
  scene.add(device);
});
const targets = new Map();
let journeyStations = null;
const deviceAction = document.getElementById("device-entropy");
const diceAction = document.getElementById("roll-dice");
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
  sheetFace.material.emissive.setHex(0x000000);
  sheetFace.material.emissiveIntensity = 0;
  devices.forEach(device => setDeviceScreen(device, ["RNG", "READY"]));
}
function updateActions(){
  if (state.fmt === "bip32"){
    deviceAction.textContent = "Use key generator";
    diceAction.textContent = "Add dice entropy";
  } else if (state.fmt === "codex32"){
    deviceAction.textContent = "Use worksheet";
    diceAction.textContent = "Roll the dice";
  } else {
    deviceAction.textContent = "Trust the chip";
    diceAction.textContent = "Roll the dice";
  }
}
function relayout(){
  const multi = state.sig === "multi";
  const showDice = state.fmt !== "bip32";
  const showWorksheet = state.fmt === "codex32";
  const showKeyCard = state.fmt === "bip32";
  const showPaper = state.fmt === "bip39";
  const showDevices = state.fmt !== "codex32";
  setTarget(diceGroup, -2.45, 1.66, 0.32, showDice);
  setTarget(worksheet, -0.45, 1.72, 0.05, showWorksheet);
  setTarget(keyCard, -0.65, 1.72, 0.12, showKeyCard);
  setTarget(seedPaper, 0, 1.72, 0.22, showPaper);
  const spots = multi
    ? [[-1.9, 2.4, -0.75], [0.25, 2.42, -1.0], [2.35, 2.4, -0.68]]
    : [[2.45, 2.4, -0.35], [0, 2.4, -1], [0, 2.4, -1]];
  devices.forEach((device, index) => {
    const spot = spots[index];
    const shouldShow = showDevices && (multi || index === 0);
    if (shouldShow) setTarget(device, spot[0], spot[1], spot[2], true);
    else setTarget(device, index === 1 ? -3.5 : 3.5, 0.5, -1.4, false);
    const variant = multi && state.ven === "multi" ? index : 0;
    const body = device.children[0];
    body.material.color.setHex([0x252c37, 0x31423d, 0x3b332d][variant]);
    device.rotation.y = multi ? (index - 1) * -0.18 : -0.08;
    if (multi && state.ven === "one"){
      const normalizers = [[1,1,1],[1.19,1.21,0.9],[0.88,1.11,1.13]];
      device.scale.set(...normalizers[index]);
    } else device.scale.set(1,1,1);
  });
  const hero = showWorksheet ? worksheet : showKeyCard ? keyCard : seedPaper;
  focusOn(hero, 6.2);
  setTimeout(() => focusOn(null), reduced ? 0 : 1400);
  updateActions();
  resetCeremony();
}
relayout();
async function writeGeneratedPaper(source){
  const generated = await generateMnemonic();
  paperWords = generated.words;
  setSessionMnemonic(paperWords);
  updatePaperTexture();
  syncPaperEditor();
  completeStation(1);
  completeStation(2);
  journeyStations?.select(3);
  readout.textContent = "128 bits encoded with a valid checksum";
  focusOn(seedPaper, 5.2);
  speak(source === "dice" ? COPY.dice : COPY.device);
}

deviceAction.addEventListener("click", async () => {
  if (state.fmt === "bip39"){
    presentTool("device", "Entropy", 850);
    await writeGeneratedPaper("device");
    return;
  }
  if (state.fmt === "codex32"){
    presentTool("paper", "Worksheet", 850);
    readout.textContent = "Manual worksheet selected";
    focusOn(worksheet, 5.5);
    speak([COPY.object.worksheet]);
  } else {
    presentTool("device", "Seed", 850);
    devices.filter(device => device.visible).forEach(device => setDeviceScreen(device, ["SEED", "SEALED"]));
    readout.textContent = state.fmt === "bip32" ? "Raw key material generated" : "Device entropy accepted";
    focusOn(devices[0], 5.7);
    speak(COPY.device);
  }
  setTimeout(() => focusOn(null), reduced ? 0 : 2600);
});
diceAction.addEventListener("click", async () => {
  if (state.fmt === "bip39"){
    presentTool("dice", "Entropy", 900);
    await writeGeneratedPaper("dice");
    return;
  }
  if (!diceGroup.visible) setTarget(diceGroup, -2.45, 1.66, 0.32, true);
  presentTool("dice", "Entropy", 900);
  readout.textContent = "128 bits sourced without a physics simulation";
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
    updateJourney(journeyChoicePatch(key, state[key]));
    callback(button.dataset.v);
  });
}
function syncVendorLock(){
  const locked = state.sig === "single";
  document.querySelectorAll("#ven .chip").forEach(chip => chip.disabled = locked);
}
wireChips("fmt", "fmt", value => {
  paperEditor.hidden = true;
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
syncChoiceControls(state);
journeyStations = mountJourneyStations("generation", station => {
  if (state.sig === "single" && state.fmt !== "codex32"){
    if (station === 3){
      setTarget(devices[0], 2.8, 2.28, -1.12, true);
      devices[0].scale.setScalar(0.78);
      seedPaper.rotation.x = 0.3;
    } else {
      setTarget(devices[0], 2.45, 2.4, -0.35, true);
      devices[0].scale.setScalar(1);
      seedPaper.rotation.x = 0;
    }
  }
  if (station === 1) focusOn(state.fmt === "bip32" ? keyCard : diceGroup, 6.2);
  if (station === 2) focusOn(state.fmt === "codex32" ? worksheet : state.fmt === "bip32" ? keyCard : seedPaper, 5.6);
  if (station === 3 && state.fmt === "bip39") focusOn(seedPaper, 6.0);
});

const paperEditor = document.getElementById("paper-editor");
const paperGrid = document.getElementById("paper-grid");
const paperNote = document.getElementById("paper-note");
const paperChecksum = document.getElementById("paper-checksum");
let paperReviewRun = 0;

paperWords.forEach((word, index) => {
  const input = document.createElement("input");
  input.value = word;
  input.dataset.index = String(index);
  input.autocapitalize = "off";
  input.spellcheck = false;
  input.setAttribute("aria-label", "Seed word " + (index + 1));
  input.addEventListener("input", () => {
    const value = input.value.trim().toLowerCase();
    if (value.length >= 4){
      const matches = WORDS.filter(candidate => candidate.startsWith(value));
      if (matches.length === 1 && matches[0] !== value) input.value = matches[0];
    }
  });
  input.addEventListener("focus", () => {
    input.select();
    paperChecksum.classList.toggle("open", index === 11);
  });
  paperGrid.appendChild(input);
});

function syncPaperEditor(){
  const inputs = [...paperGrid.querySelectorAll("input")];
  inputs.forEach((input, index) => { input.value = paperWords[index] || ""; });
}

async function reviewPaperWords(){
  const run = ++paperReviewRun;
  const nextWords = [...paperGrid.querySelectorAll("input")]
    .map(input => input.value.trim().toLowerCase());
  const [valid, options] = await Promise.all([
    validMnemonic(nextWords),
    validLastWords(nextWords.slice(0, 11))
  ]);
  if (run !== paperReviewRun) return;
  paperWords = nextWords;
  setSessionMnemonic(paperWords);
  [...paperGrid.querySelectorAll("input")].forEach(input => {
    input.classList.toggle("bad", !WORDS.includes(input.value.trim().toLowerCase()));
  });
  const finalInput = paperGrid.querySelector('input[data-index="11"]');
  finalInput.classList.toggle("bad", options.length > 0 && !options.includes(paperWords[11]));
  paperChecksum.replaceChildren(...options.map(word => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = word;
    button.addEventListener("click", () => {
      finalInput.value = word;
      paperChecksum.classList.remove("open");
      reviewPaperWords();
    });
    return button;
  }));
  paperNote.textContent = valid
    ? "Checksum valid. This working copy is ready for the recovery drill."
    : options.length
      ? "The first eleven words allow exactly 128 checksum-valid final words."
      : "Fix the red word before a checksum can exist.";
  updatePaperTexture();
}

paperGrid.addEventListener("input", () => {
  clearTimeout(paperGrid._timer);
  paperGrid._timer = setTimeout(reviewPaperWords, 320);
});

document.getElementById("paper-done").addEventListener("click", async () => {
  await reviewPaperWords();
  if (await validMnemonic(paperWords)) completeStation(3);
  paperEditor.hidden = true;
  focusOn(null);
});

function positionPaperEditor(){
  if (paperEditor.hidden || !seedPaper.visible) return;
  seedPaper.updateMatrixWorld(true);
  const project = local => {
    const point = seedPaper.localToWorld(local.clone()).project(camera);
    return {
      x: (point.x * 0.5 + 0.5) * innerWidth,
      y: (-point.y * 0.5 + 0.5) * innerHeight
    };
  };
  const center = project(new THREE.Vector3(0, 0.07, 0));
  const left = project(new THREE.Vector3(-1.62, 0.07, 0));
  const right = project(new THREE.Vector3(1.62, 0.07, 0));
  const width = Math.max(1, Math.hypot(right.x - left.x, right.y - left.y));
  const scale = THREE.MathUtils.clamp(width / 430, 0.66, 1.08);
  paperEditor.style.left = center.x + "px";
  paperEditor.style.top = center.y + "px";
  paperEditor.style.transform = "translate(-50%,-50%) scale(" + scale + ")";
}

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
  if (event.target !== canvas) return;
  pointer.x = event.clientX / innerWidth * 2 - 1;
  pointer.y = -(event.clientY / innerHeight) * 2 + 1;
  ray.setFromCamera(pointer, camera);
  const hit = ray.intersectObjects(clickables, false).find(item =>
    item.object.visible && (!item.object.userData.owner || item.object.userData.owner.visible));
  if (!hit){
    focusOn(null);
    return;
  }
  const owner = hit.object.userData.owner;
  const kind = hit.object.userData.kind;
  focusOn(owner, 5.4);
  if (kind === "paper" && state.fmt === "bip39" && journeyStations.station === 3){
    syncPaperEditor();
    paperEditor.hidden = false;
    positionPaperEditor();
    speak([COPY.object.paper]);
    return;
  }
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
  positionPaperEditor();
  renderer.render(scene, camera);
}
speak(COPY.welcome, 500);
presentTool("dice", "Entropy", 1200);
tick();
