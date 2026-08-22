// Shared physical-rendering kit. Everything is generated locally so the
// experience keeps its zero-runtime-network boundary.

const textureCache = new Map();

function seeded(index){
  const x = Math.sin(index * 91.733 + 17.17) * 43758.5453;
  return x - Math.floor(x);
}

function textureFromCanvas(THREE, key, draw, color = false){
  const cacheKey = key + (color ? ":color" : ":data");
  if (textureCache.has(cacheKey)) return textureCache.get(cacheKey);
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;
  const context = canvas.getContext("2d");
  draw(context, canvas.width, canvas.height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.anisotropy = 8;
  if (color) texture.colorSpace = THREE.SRGBColorSpace;
  textureCache.set(cacheKey, texture);
  return texture;
}

function brushedDataTexture(THREE){
  return textureFromCanvas(THREE, "brushed-metal", (context, width, height) => {
    context.fillStyle = "#8f8f8f";
    context.fillRect(0, 0, width, height);
    for (let y = 0; y < height; y++){
      const value = Math.floor(92 + seeded(y) * 80);
      context.fillStyle = "rgb(" + value + "," + value + "," + value + ")";
      context.fillRect(0, y, width, 1);
    }
    for (let i = 0; i < 180; i++){
      const y = Math.floor(seeded(i + 800) * height);
      const alpha = 0.04 + seeded(i + 1200) * 0.12;
      context.strokeStyle = "rgba(255,255,255," + alpha + ")";
      context.beginPath();
      context.moveTo(seeded(i + 30) * width * 0.2, y);
      context.lineTo(width * (0.55 + seeded(i + 60) * 0.45), y + seeded(i + 90) * 2);
      context.stroke();
    }
  });
}

function stoneDataTexture(THREE){
  return textureFromCanvas(THREE, "stone", (context, width, height) => {
    const image = context.createImageData(width, height);
    for (let i = 0; i < width * height; i++){
      const value = Math.floor(95 + seeded(i) * 70);
      image.data[i * 4] = value;
      image.data[i * 4 + 1] = value;
      image.data[i * 4 + 2] = value;
      image.data[i * 4 + 3] = 255;
    }
    context.putImageData(image, 0, 0);
    context.globalAlpha = 0.2;
    for (let i = 0; i < 55; i++){
      context.strokeStyle = i % 2 ? "#ffffff" : "#000000";
      context.beginPath();
      const y = seeded(i + 2000) * height;
      context.moveTo(0, y);
      context.bezierCurveTo(
        width * 0.3, y + seeded(i + 2100) * 26 - 13,
        width * 0.7, y + seeded(i + 2200) * 26 - 13,
        width, y + seeded(i + 2300) * 18 - 9
      );
      context.stroke();
    }
    context.globalAlpha = 1;
  });
}

function woodColorTexture(THREE){
  return textureFromCanvas(THREE, "walnut-color", (context, width, height) => {
    const base = context.createLinearGradient(0, 0, 0, height);
    base.addColorStop(0, "#7a4727");
    base.addColorStop(0.48, "#58301d");
    base.addColorStop(1, "#3a2016");
    context.fillStyle = base;
    context.fillRect(0, 0, width, height);

    const plankHeight = height / 4;
    for (let plank = 0; plank < 4; plank++){
      const y = plank * plankHeight;
      context.fillStyle = plank % 2 ? "rgba(25,10,4,.12)" : "rgba(255,194,116,.055)";
      context.fillRect(0, y, width, plankHeight);
      context.fillStyle = "rgba(18,8,4,.58)";
      context.fillRect(0, y, width, 2);
      for (let grain = 0; grain < 34; grain++){
        const seed = plank * 100 + grain;
        const gy = y + 8 + seeded(seed + 4100) * (plankHeight - 16);
        const drift = seeded(seed + 4200) * 16 - 8;
        context.strokeStyle = grain % 3 === 0
          ? "rgba(34,13,5,.34)"
          : "rgba(218,133,70,.18)";
        context.lineWidth = 0.7 + seeded(seed + 4300) * 1.5;
        context.beginPath();
        context.moveTo(-20, gy);
        context.bezierCurveTo(width * 0.28, gy + drift, width * 0.68, gy - drift, width + 20, gy + drift * 0.35);
        context.stroke();
      }
    }

    for (let knot = 0; knot < 5; knot++){
      const x = 60 + seeded(knot + 5100) * (width - 120);
      const y = 35 + seeded(knot + 5200) * (height - 70);
      context.strokeStyle = "rgba(28,10,4,.34)";
      context.lineWidth = 2;
      context.beginPath();
      context.ellipse(x, y, 11 + seeded(knot + 5300) * 18, 4 + seeded(knot + 5400) * 7, 0, 0, Math.PI * 2);
      context.stroke();
    }
  }, true);
}

function woodDataTexture(THREE){
  return textureFromCanvas(THREE, "walnut-height", (context, width, height) => {
    context.fillStyle = "#858585";
    context.fillRect(0, 0, width, height);
    for (let y = 0; y < height; y++){
      const wave = Math.sin(y * 0.18) * 7 + Math.sin(y * 0.047) * 11;
      const value = Math.round(120 + wave + seeded(y + 6100) * 12);
      context.fillStyle = `rgb(${value},${value},${value})`;
      context.fillRect(0, y, width, 1);
    }
    context.fillStyle = "#464646";
    for (let plank = 0; plank < 4; plank++) context.fillRect(0, plank * height / 4, width, 2);
  });
}

export function setupPhysicalRenderer(THREE, renderer, scene, exposure = 1.08){
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = exposure;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const environment = new THREE.Scene();
  environment.background = new THREE.Color(0x07080a);
  const panelMaterial = color => new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide });
  const panels = [
    { size: [9, 5], position: [-4.5, 5.5, 4], rotation: [0, 0.65, 0], color: 0xffefd0 },
    { size: [7, 4], position: [5.5, 4, 1], rotation: [0, -0.8, 0], color: 0xa9c8ff },
    { size: [6, 3], position: [0, 7.5, -3], rotation: [Math.PI / 2, 0, 0], color: 0xffd77f },
    { size: [12, 7], position: [0, 3, -8], rotation: [0, 0, 0], color: 0x151b24 }
  ];
  panels.forEach(panel => {
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(panel.size[0], panel.size[1]),
      panelMaterial(panel.color)
    );
    mesh.position.set(...panel.position);
    mesh.rotation.set(...panel.rotation);
    environment.add(mesh);
  });
  const envFloor = new THREE.Mesh(
    new THREE.CircleGeometry(12, 48),
    new THREE.MeshBasicMaterial({ color: 0x23262b, side: THREE.DoubleSide })
  );
  envFloor.rotation.x = -Math.PI / 2;
  environment.add(envFloor);

  const pmrem = new THREE.PMREMGenerator(renderer);
  pmrem.compileCubemapShader();
  const target = pmrem.fromScene(environment, 0.035, 0.1, 40);
  scene.environment = target.texture;
  scene.userData.environmentTexture = target.texture;
  environment.traverse(object => {
    if (object.geometry) object.geometry.dispose();
    if (object.material) object.material.dispose();
  });
  pmrem.dispose();
  return target.texture;
}

export function brushedMetal(THREE, color = 0xa7adb4, roughness = 0.25){
  const micro = brushedDataTexture(THREE).clone();
  micro.needsUpdate = true;
  micro.repeat.set(1.8, 8);
  return new THREE.MeshPhysicalMaterial({
    color,
    metalness: 1,
    roughness,
    roughnessMap: micro,
    bumpMap: micro,
    bumpScale: 0.012,
    anisotropy: 0.75,
    anisotropyRotation: Math.PI / 2,
    clearcoat: 0.18,
    clearcoatRoughness: 0.24,
    envMapIntensity: 1.55
  });
}

export function blackMetal(THREE, color = 0x1b2027, roughness = 0.3){
  const micro = brushedDataTexture(THREE).clone();
  micro.needsUpdate = true;
  micro.repeat.set(2, 6);
  return new THREE.MeshPhysicalMaterial({
    color,
    metalness: 0.92,
    roughness,
    roughnessMap: micro,
    bumpMap: micro,
    bumpScale: 0.008,
    clearcoat: 0.32,
    clearcoatRoughness: 0.2,
    envMapIntensity: 1.35
  });
}

export function honedStone(THREE, color = 0x171b21){
  const data = stoneDataTexture(THREE);
  data.repeat.set(5, 5);
  return new THREE.MeshPhysicalMaterial({
    color,
    metalness: 0.18,
    roughness: 0.82,
    roughnessMap: data,
    bumpMap: data,
    bumpScale: 0.025,
    clearcoat: 0.04,
    clearcoatRoughness: 0.72,
    envMapIntensity: 0.56
  });
}

export function walnutWood(THREE){
  const colorMap = woodColorTexture(THREE).clone();
  const grainMap = woodDataTexture(THREE).clone();
  colorMap.repeat.set(3.2, 1.5);
  grainMap.repeat.set(3.2, 1.5);
  colorMap.needsUpdate = true;
  grainMap.needsUpdate = true;
  return new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    map: colorMap,
    roughness: 0.46,
    roughnessMap: grainMap,
    bumpMap: grainMap,
    bumpScale: 0.035,
    metalness: 0,
    clearcoat: 0.32,
    clearcoatRoughness: 0.38,
    envMapIntensity: 0.9
  });
}

export function roundedBoxGeometry(THREE, width, height, depth, radius = 0.08){
  const halfWidth = width / 2;
  const halfHeight = height / 2;
  const shape = new THREE.Shape();
  shape.moveTo(-halfWidth + radius, -halfHeight);
  shape.lineTo(halfWidth - radius, -halfHeight);
  shape.quadraticCurveTo(halfWidth, -halfHeight, halfWidth, -halfHeight + radius);
  shape.lineTo(halfWidth, halfHeight - radius);
  shape.quadraticCurveTo(halfWidth, halfHeight, halfWidth - radius, halfHeight);
  shape.lineTo(-halfWidth + radius, halfHeight);
  shape.quadraticCurveTo(-halfWidth, halfHeight, -halfWidth, halfHeight - radius);
  shape.lineTo(-halfWidth, -halfHeight + radius);
  shape.quadraticCurveTo(-halfWidth, -halfHeight, -halfWidth + radius, -halfHeight);
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelSize: Math.min(radius * 0.32, depth * 0.22),
    bevelThickness: Math.min(radius * 0.32, depth * 0.22),
    bevelSegments: 3,
    curveSegments: 10,
    steps: 1
  });
  geometry.translate(0, 0, -depth / 2);
  geometry.computeVertexNormals();
  return geometry;
}

function contactShadowTexture(THREE){
  return textureFromCanvas(THREE, "contact-shadow", (context, width, height) => {
    const gradient = context.createRadialGradient(
      width / 2, height / 2, 0,
      width / 2, height / 2, width / 2
    );
    gradient.addColorStop(0, "rgba(0,0,0,.68)");
    gradient.addColorStop(0.45, "rgba(0,0,0,.34)");
    gradient.addColorStop(1, "rgba(0,0,0,0)");
    context.fillStyle = gradient;
    context.fillRect(0, 0, width, height);
  }, true);
}

export function contactShadow(THREE, width, depth, opacity = 0.7){
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(width, depth),
    new THREE.MeshBasicMaterial({
      map: contactShadowTexture(THREE),
      transparent: true,
      opacity,
      depthWrite: false,
      toneMapped: false
    })
  );
  mesh.rotation.x = -Math.PI / 2;
  mesh.renderOrder = 1;
  return mesh;
}

export function castRealisticShadows(root){
  root.traverse(object => {
    if (!object.isMesh) return;
    object.castShadow = true;
    object.receiveShadow = true;
  });
}
