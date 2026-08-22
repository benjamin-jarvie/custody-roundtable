import * as THREE from "three";
import { speak, presentTool } from "./butler.js?v=4";
import {
  setupPhysicalRenderer,
  brushedMetal,
  blackMetal,
  honedStone,
  roundedBoxGeometry,
  contactShadow,
  castRealisticShadows
} from "./visuals.js?v=5";

const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
const portrait = innerWidth <= 600;
const canvas = document.getElementById("c");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight, false);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.08;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0b0e13);
scene.fog = new THREE.Fog(0x0b0e13, 11, 27);
setupPhysicalRenderer(THREE, renderer, scene, 1.14);
const camera = new THREE.PerspectiveCamera(52, innerWidth / innerHeight, 0.1, 50);
camera.position.set(0, portrait ? 4.3 : 3.6, portrait ? 13.5 : 11.2);
camera.lookAt(0, 2.1, 0);
function resize(){
  renderer.setSize(innerWidth, innerHeight, false);
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
}
addEventListener("resize", resize);

scene.add(new THREE.AmbientLight(0x748098, 0.58));
const key = new THREE.SpotLight(0xfff1d2, 250, 26, Math.PI / 5, 0.45, 1.4);
key.position.set(0, 10, 6);
key.target.position.set(0, 1.8, 0);
key.castShadow = true;
key.shadow.mapSize.set(1024, 1024);
scene.add(key, key.target);
const gold = new THREE.PointLight(0xfbdc7b, 85, 24);
gold.position.set(-4, 5, 3);
scene.add(gold);
const cool = new THREE.PointLight(0x4d73a2, 55, 22);
cool.position.set(5, 4, -2);
scene.add(cool);

const floor = new THREE.Mesh(
  new THREE.CircleGeometry(12, 64),
  honedStone(THREE, 0x11161e)
);
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
scene.add(floor);
const ring = new THREE.Mesh(
  new THREE.RingGeometry(5.25, 5.37, 96),
  new THREE.MeshStandardMaterial({
    color: 0xfbdc7b, metalness: 1, roughness: 0.3,
    emissive: 0x4c3e15, emissiveIntensity: 0.2
  })
);
ring.rotation.x = -Math.PI / 2;
ring.position.y = 0.01;
scene.add(ring);
const wall = new THREE.Mesh(
  new THREE.CylinderGeometry(11.5, 11.5, 10, 48, 1, true),
  honedStone(THREE, 0x151a22)
);
wall.material.side = THREE.BackSide;
wall.position.y = 5;
scene.add(wall);

function doorTexture(title, subtitle){
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 768;
  const x = c.getContext("2d");
  const gradient = x.createLinearGradient(0, 0, 512, 768);
  gradient.addColorStop(0, "#303845");
  gradient.addColorStop(1, "#141922");
  x.fillStyle = gradient;
  x.fillRect(0, 0, 512, 768);
  x.strokeStyle = "#FBDC7B";
  x.lineWidth = 16;
  x.strokeRect(16, 16, 480, 736);
  x.textAlign = "center";
  x.fillStyle = "#FBDC7B";
  x.font = "bold 44px -apple-system, sans-serif";
  x.fillText(title.toUpperCase(), 256, 330);
  x.fillStyle = "#E9E4D6";
  x.font = "30px Georgia, serif";
  x.fillText(subtitle, 256, 390);
  x.fillStyle = "#FBDC7B";
  x.beginPath();
  x.arc(420, 390, 16, 0, Math.PI * 2);
  x.fill();
  const texture = new THREE.CanvasTexture(c);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

const definitions = [
  { title: "Generation", subtitle: "Where trust begins", href: "generation.html" },
  { title: "In use", subtitle: "Where judgment signs", href: "in-use.html" },
  { title: "At rest", subtitle: "Where recovery proves", href: "at-rest.html" }
];
const doors = [];
const clickable = [];
const doorWidth = portrait ? 1.0 : 1.65;
const doorHeight = portrait ? 2.45 : 3.4;
const spacing = portrait ? 1.18 : 2.35;
definitions.forEach((definition, index) => {
  const group = new THREE.Group();
  const frame = new THREE.Mesh(
    roundedBoxGeometry(THREE, doorWidth + 0.18, doorHeight + 0.2, 0.32, 0.08),
    brushedMetal(THREE, 0xe2bd5b, 0.2)
  );
  frame.material.emissive = new THREE.Color(0x2f260a);
  frame.material.emissiveIntensity = 0.1;
  frame.castShadow = true;
  group.add(frame);
  const doorMap = doorTexture(definition.title, definition.subtitle);
  const doorMaterial = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    map: doorMap,
    metalness: 0.28,
    roughness: 0.34,
    clearcoat: 0.24,
    clearcoatRoughness: 0.28,
    emissive: 0x5b4922,
    emissiveMap: doorMap,
    emissiveIntensity: 0.1,
    envMapIntensity: 0.8
  });
  const face = new THREE.Mesh(
    new THREE.PlaneGeometry(doorWidth, doorHeight),
    doorMaterial
  );
  face.position.z = 0.235;
  face.userData.href = definition.href;
  group.add(face);
  const x = (index - 1) * spacing;
  group.position.set(x, portrait ? 2.6 : 2.35, index === 1 ? -0.35 : 0);
  group.rotation.y = (index - 1) * -0.12;
  castRealisticShadows(group);
  scene.add(group);
  const shadow = contactShadow(THREE, doorWidth * 1.8, 1.45, 0.82);
  shadow.position.set(x, 0.025, group.position.z + 0.15);
  scene.add(shadow);
  doors.push(group);
  clickable.push(face);
});

const ray = new THREE.Raycaster();
const pointer = new THREE.Vector2();
canvas.addEventListener("pointerup", event => {
  pointer.x = event.clientX / innerWidth * 2 - 1;
  pointer.y = -(event.clientY / innerHeight) * 2 + 1;
  ray.setFromCamera(pointer, camera);
  const hit = ray.intersectObjects(clickable, false)[0];
  if (hit) location.href = hit.object.userData.href;
});

const clock = new THREE.Clock();
function tick(){
  requestAnimationFrame(tick);
  const dt = Math.min(clock.getDelta(), 0.05);
  if (!reduced){
    doors.forEach((door, index) => {
      door.position.y += Math.sin(clock.elapsedTime * 0.7 + index) * dt * 0.018;
    });
  }
  renderer.render(scene, camera);
}
speak([
  "Welcome to the Custody Vault. Every seed lives three lives.",
  "Choose a door. We will begin where trust begins, where judgment signs, or where recovery proves the truth."
], 450);
presentTool("doors", "Choose", 1250);
tick();
