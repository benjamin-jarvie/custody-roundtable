// Shared host for all three lifecycle scenes. The visual is a lightweight
// photographic billboard so the scene keeps the performance profile of v1.

const say = document.getElementById("say");
let timer = null;
let queue = [];

export function makeButler(THREE, options = {}){
  const portrait = innerWidth <= 600;
  const texture = new THREE.TextureLoader().load("./butler-host.webp");
  texture.colorSpace = THREE.SRGBColorSpace;
  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    alphaTest: 0.025,
    depthWrite: false,
    toneMapped: false,
  });
  const sprite = new THREE.Sprite(material);
  const scale = options.scale || (portrait ? [1.8, 2.7, 1] : [2.65, 3.98, 1]);
  const position = options.position || (portrait ? [-1.65, 1.68, 3.0] : [-4.35, 2.02, 3.25]);
  sprite.scale.set(...scale);
  sprite.position.set(...position);
  sprite.renderOrder = 4;
  sprite.userData.tray = new THREE.Vector3(
    position[0] - scale[0] * 0.34,
    position[1] + scale[1] * 0.13,
    position[2] + 0.12
  );
  return sprite;
}

export function speak(lines, delay = 0){
  queue = Array.isArray(lines) ? lines.slice() : [lines];
  clearTimeout(timer);
  const next = () => {
    if (!queue.length || !say) return;
    const line = queue.shift();
    say.textContent = line;
    if (queue.length) {
      timer = setTimeout(next, Math.max(2600, line.length * 55));
    }
  };
  timer = setTimeout(next, delay);
}

export function stopSpeaking(){
  clearTimeout(timer);
  queue = [];
}
