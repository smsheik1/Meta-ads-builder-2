import * as THREE from "three";
import { ColladaLoader } from "../../node_modules/three/examples/jsm/loaders/ColladaLoader.js";

const canvas = document.querySelector("#canvas");
const status = document.querySelector("#status");
const playButton = document.querySelector("#play");
const query = new URLSearchParams(location.search);
const captureMode = query.has("capture");
const contentUrl = new URL(query.get("content") || "../../fixtures/smoke/content.json", location.href);
const motionUrl = new URL(query.get("motion") || "../../fixtures/smoke/motion.json", location.href);
const audioUrl = new URL(query.get("audio") || "../../fixtures/smoke/audio.wav", location.href);
const content = await fetch(contentUrl).then((response) => {
  if (!response.ok) throw new Error(`Could not load content: ${response.status}`);
  return response.json();
});
const contentAssetUrl = (path) => new URL(path, contentUrl).href;
const characterCatalog = await fetch("../../assets/character-packs.json").then((response) => {
  if (!response.ok) throw new Error(`Could not load character catalog: ${response.status}`);
  return response.json();
});
const characterId = content.characterId || characterCatalog.defaultCharacterId;
const characterPack = characterCatalog.packs.find((candidate) => candidate.id === characterId);
if (!characterPack) throw new Error(`Unknown characterId: ${characterId}`);
if (!characterPack.rig || characterPack.status !== "presenter-ready") {
  throw new Error(`${characterPack.label} is ${characterPack.status} and cannot anchor the presenter rig yet.`);
}

document.title = `SNN — ${content.headline}`;
document.querySelector("#headline").textContent = content.headline;
document.querySelector("#location-bug").textContent = content.locationBug;
document.querySelector("#ticker-copy").textContent = content.tickerItems.join("   •   ");
const initialFrame = () => {
  const value = Number.parseInt(location.hash.slice(1), 10);
  return Number.isFinite(value) ? value : 0;
};
document.body.classList.toggle("capture", captureMode);

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
renderer.setSize(window.innerWidth, window.innerHeight, false);
renderer.setPixelRatio(1);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x031225, 0.048);

const camera = new THREE.PerspectiveCamera(29, window.innerWidth / window.innerHeight, 0.05, 100);
camera.position.set(0, 1.25, 5.15);
camera.lookAt(0, 1.03, 0);

scene.add(new THREE.HemisphereLight(0xaee8ff, 0x07101c, 2.15));
const keyLight = new THREE.DirectionalLight(0xffffff, 3.6);
keyLight.position.set(-2.2, 4.8, 4.2);
keyLight.castShadow = true;
keyLight.shadow.mapSize.set(2048, 2048);
scene.add(keyLight);
const rimLight = new THREE.PointLight(0x20d9ff, 22, 8, 1.6);
rimLight.position.set(2.8, 2.4, -0.6);
scene.add(rimLight);
const warmLight = new THREE.PointLight(0xff3e65, 8, 6, 2);
warmLight.position.set(-2.8, 1.8, 0.3);
scene.add(warmLight);

const studio = new THREE.Group();
scene.add(studio);

function box(width, height, depth, color, x, y, z, options = {}) {
  const material = new THREE.MeshStandardMaterial({
    color,
    roughness: options.roughness ?? 0.42,
    metalness: options.metalness ?? 0.28,
    emissive: options.emissive ?? 0x000000,
    emissiveIntensity: options.emissiveIntensity ?? 0,
  });
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  studio.add(mesh);
  return mesh;
}

box(8.2, 3.8, 0.18, 0x061b34, 0, 1.7, -1.35, { roughness: 0.7 });
box(8.6, 0.16, 5.4, 0x071525, 0, -0.02, 0.45, { roughness: 0.56, metalness: 0.08 });

for (let index = -3; index <= 3; index += 1) {
  const strip = box(0.035, 3.2, 0.035, index % 2 ? 0x0aa8dd : 0x1753a8, index * 1.03, 1.72, -1.19, {
    emissive: index % 2 ? 0x087fb1 : 0x133c88,
    emissiveIntensity: 2.1,
  });
  strip.material.transparent = true;
  strip.material.opacity = 0.72;
}

const screenCanvas = document.createElement("canvas");
screenCanvas.width = 1024;
screenCanvas.height = 640;
const screenContext = screenCanvas.getContext("2d");

function loadStoryImage(source) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => resolve(image), { once: true });
    image.addEventListener("error", () => reject(new Error(`Could not load ${source}`)), { once: true });
    image.src = source;
  });
}

const storySlides = await Promise.all(content.slides.map(async (slide) => ({
  ...slide,
  image: slide.image ? await loadStoryImage(contentAssetUrl(slide.image)) : undefined,
})));

function fillFittedText(text, x, y, size, maxWidth, options = {}) {
  const weight = options.weight ?? 900;
  const family = options.family ?? "Arial Black, Arial";
  const minimum = options.minimum ?? 18;
  let fitted = size;
  do {
    screenContext.font = `${weight} ${fitted}px ${family}`;
    if (screenContext.measureText(text).width <= maxWidth) break;
    fitted -= 2;
  } while (fitted > minimum);
  screenContext.fillText(text, x, y);
}

function drawCover(image, x = 0, y = 0, width = 1024, height = 640) {
  const scale = Math.max(width / image.naturalWidth, height / image.naturalHeight);
  const sourceWidth = width / scale;
  const sourceHeight = height / scale;
  const sourceX = (image.naturalWidth - sourceWidth) * 0.5;
  const sourceY = (image.naturalHeight - sourceHeight) * 0.5;
  screenContext.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, x, y, width, height);
}

function drawContain(image, x, y, width, height) {
  const scale = Math.min(width / image.naturalWidth, height / image.naturalHeight);
  const drawWidth = image.naturalWidth * scale;
  const drawHeight = image.naturalHeight * scale;
  screenContext.drawImage(image, x + (width - drawWidth) * 0.5, y + (height - drawHeight) * 0.5, drawWidth, drawHeight);
}

function drawRetroBackdrop() {
  const gradient = screenContext.createLinearGradient(0, 0, 1024, 640);
  gradient.addColorStop(0, "#9c72d4");
  gradient.addColorStop(1, "#6654b7");
  screenContext.fillStyle = gradient;
  screenContext.fillRect(0, 0, 1024, 640);
  screenContext.globalAlpha = 0.11;
  screenContext.fillStyle = "#261f55";
  for (let index = 0; index < 38; index += 1) {
    const x = (index * 173) % 1040;
    const y = (index * 89) % 680;
    screenContext.beginPath();
    screenContext.arc(x, y, 18 + (index % 5) * 11, 0, Math.PI * 2);
    screenContext.fill();
  }
  screenContext.globalAlpha = 1;
  screenContext.strokeStyle = "#0a4d67";
  screenContext.lineWidth = 34;
  screenContext.strokeRect(16, 16, 992, 608);
  screenContext.strokeStyle = "#e6bf57";
  screenContext.lineWidth = 12;
  screenContext.strokeRect(38, 38, 948, 564);
}

function drawFishAnchor(x, y, scale = 1) {
  screenContext.save();
  screenContext.translate(x, y);
  screenContext.scale(scale, scale);
  screenContext.fillStyle = "#d7d6a5";
  screenContext.strokeStyle = "#183c42";
  screenContext.lineWidth = 8;
  screenContext.beginPath();
  screenContext.ellipse(0, 0, 112, 164, -0.05, 0, Math.PI * 2);
  screenContext.fill();
  screenContext.stroke();
  screenContext.beginPath();
  screenContext.moveTo(-78, 50);
  screenContext.lineTo(-154, 96);
  screenContext.lineTo(-76, 108);
  screenContext.closePath();
  screenContext.fill();
  screenContext.stroke();
  screenContext.beginPath();
  screenContext.moveTo(76, 40);
  screenContext.lineTo(154, 88);
  screenContext.lineTo(74, 102);
  screenContext.closePath();
  screenContext.fill();
  screenContext.stroke();
  screenContext.fillStyle = "#fff7cd";
  screenContext.beginPath();
  screenContext.arc(35, -66, 25, 0, Math.PI * 2);
  screenContext.fill();
  screenContext.stroke();
  screenContext.fillStyle = "#132a32";
  screenContext.beginPath();
  screenContext.arc(42, -63, 9, 0, Math.PI * 2);
  screenContext.fill();
  screenContext.beginPath();
  screenContext.arc(22, 25, 9, 0, Math.PI * 2);
  screenContext.fill();
  screenContext.beginPath();
  screenContext.arc(49, 32, 9, 0, Math.PI * 2);
  screenContext.fill();
  screenContext.beginPath();
  screenContext.arc(75, 39, 9, 0, Math.PI * 2);
  screenContext.fill();
  screenContext.restore();
}

function drawPhotoSlide(slide) {
  drawCover(slide.image);
  const shade = screenContext.createLinearGradient(0, 300, 0, 640);
  shade.addColorStop(0, "rgba(4,9,24,0)");
  shade.addColorStop(1, "rgba(4,9,24,.94)");
  screenContext.fillStyle = shade;
  screenContext.fillRect(0, 240, 1024, 400);
  screenContext.fillStyle = "#f4cb4f";
  screenContext.fillRect(55, 468, 56, 9);
  screenContext.fillStyle = "white";
  fillFittedText(slide.label, 55, 548, 66, 900);
  screenContext.fillStyle = "#78ebff";
  fillFittedText(slide.kicker, 58, 590, 27, 900, { weight: 800, family: "Arial", minimum: 20 });
}

function drawMonitor(time) {
  const slide = storySlides.find((candidate) => time >= candidate.start && time < candidate.end) || storySlides.at(-1);
  screenContext.clearRect(0, 0, 1024, 640);

  if (slide.type === "alert") {
    drawRetroBackdrop();
    drawFishAnchor(195, 352, 0.88);
    screenContext.fillStyle = "#e63143";
    screenContext.beginPath();
    screenContext.roundRect(370, 92, 540, 76, 15);
    screenContext.fill();
    screenContext.fillStyle = "white";
    fillFittedText(slide.eyebrow, 402, 145, 40, 480);
    screenContext.fillStyle = "#fff4c8";
    fillFittedText(slide.titleLines[0], 372, 286, 76, 570);
    fillFittedText(slide.titleLines[1], 372, 378, 76, 570);
    screenContext.fillStyle = "#183c42";
    fillFittedText(slide.subhead, 373, 455, 29, 590, { weight: 800, family: "Arial", minimum: 18 });
  } else if (slide.type === "poster") {
    screenContext.fillStyle = "#c9a86e";
    screenContext.fillRect(0, 0, 1024, 640);
    drawContain(slide.image, 0, 0, 1024, 640);
    screenContext.fillStyle = "rgba(24,13,5,.78)";
    screenContext.fillRect(0, 535, 1024, 105);
    screenContext.fillStyle = "#fff1c6";
    fillFittedText(slide.caption, 210, 598, 37, 650);
  } else if (slide.type === "photo") {
    drawPhotoSlide(slide);
  } else if (slide.type === "jab") {
    drawRetroBackdrop();
    screenContext.save();
    screenContext.translate(225, 335);
    screenContext.rotate(-0.13);
    screenContext.fillStyle = "#d49b40";
    screenContext.fillRect(-20, -185, 40, 350);
    screenContext.fillStyle = "#7a4b20";
    for (let y = -135; y < 125; y += 55) screenContext.fillRect(-9, y, 18, 20);
    screenContext.restore();
    screenContext.fillStyle = "#e63143";
    screenContext.beginPath();
    screenContext.roundRect(405, 93, 500, 70, 13);
    screenContext.fill();
    screenContext.fillStyle = "white";
    fillFittedText(slide.eyebrow, 452, 141, 34, 425);
    screenContext.fillStyle = "#fff4c8";
    fillFittedText(slide.titleLines[0], 430, 278, 62, 490);
    fillFittedText(slide.titleLines[1], 430, 355, 62, 490);
    screenContext.fillStyle = "#173a45";
    fillFittedText(slide.subhead, 430, 430, 27, 500, { weight: 800, family: "Arial", minimum: 18 });
  } else if (slide.type === "details") {
    drawRetroBackdrop();
    screenContext.fillStyle = "#173d51";
    screenContext.beginPath();
    screenContext.roundRect(105, 92, 814, 452, 28);
    screenContext.fill();
    screenContext.strokeStyle = "#f3cb54";
    screenContext.lineWidth = 9;
    screenContext.stroke();
    screenContext.fillStyle = "#79ebff";
    fillFittedText(slide.eyebrow, 190, 173, 40, 650);
    screenContext.fillStyle = "white";
    fillFittedText(slide.primaryLines[0], 285, 292, 68, 565);
    fillFittedText(slide.primaryLines[1], 234, 386, 68, 640);
    screenContext.fillStyle = "#f3cb54";
    fillFittedText(slide.footer, 370, 469, 34, 400, { weight: 800, family: "Arial", minimum: 20 });
  } else if (slide.type === "notice") {
    drawRetroBackdrop();
    screenContext.fillStyle = "#fff4c8";
    screenContext.fillStyle = "#e63143";
    screenContext.beginPath();
    screenContext.roundRect(352, 80, 560, 68, 14);
    screenContext.fill();
    screenContext.fillStyle = "white";
    fillFittedText(slide.eyebrow, 448, 125, 31, 420);
    screenContext.fillStyle = "#fff4c8";
    fillFittedText(slide.badge, 94, 330, 86, 190);
    screenContext.fillStyle = "#173a45";
    fillFittedText(slide.titleLines[0], 335, 255, 49, 590);
    fillFittedText(slide.titleLines[1], 458, 329, 65, 420);
    screenContext.fillStyle = "#f3cb54";
    screenContext.beginPath();
    screenContext.roundRect(325, 375, 615, 74, 14);
    screenContext.fill();
    screenContext.fillStyle = "#173a45";
    fillFittedText(slide.footer, 383, 423, 29, 530);
  } else if (slide.type === "cta") {
    drawCover(slide.image);
    screenContext.fillStyle = "rgba(21,10,3,.78)";
    screenContext.fillRect(0, 0, 1024, 640);
    screenContext.fillStyle = "#fff1c6";
    fillFittedText(slide.title, 257, 208, 74, 530);
    screenContext.fillStyle = "#e63143";
    screenContext.beginPath();
    screenContext.roundRect(274, 252, 476, 94, 18);
    screenContext.fill();
    screenContext.fillStyle = "white";
    fillFittedText(slide.button, 327, 314, 45, 390);
    screenContext.fillStyle = "#f3cb54";
    fillFittedText(slide.details, 227, 424, 38, 620);
    screenContext.fillStyle = "white";
    fillFittedText(slide.footer, 203, 491, 27, 650, { weight: 700, family: "Arial", minimum: 18 });
  } else {
    drawRetroBackdrop();
    drawFishAnchor(192, 350, 0.8);
    screenContext.fillStyle = "#e63143";
    screenContext.beginPath();
    screenContext.roundRect(385, 105, 530, 72, 14);
    screenContext.fill();
    screenContext.fillStyle = "white";
    fillFittedText(slide.eyebrow, 423, 153, 34, 450);
    screenContext.fillStyle = "#fff4c8";
    fillFittedText(slide.titleLines[0], 370, 288, 58, 560);
    fillFittedText(slide.titleLines[1], 470, 358, 58, 390);
    screenContext.fillStyle = "#173a45";
    fillFittedText(slide.footer, 373, 438, 29, 560, { weight: 800, family: "Arial", minimum: 18 });
  }

  const fade = Math.min(1, (time - slide.start) / 0.22, (slide.end - time) / 0.22);
  if (fade < 1) {
    screenContext.fillStyle = `rgba(5, 19, 39, ${Math.max(0, 1 - fade)})`;
    screenContext.fillRect(0, 0, 1024, 640);
  }
}

drawMonitor(0);
const screenTexture = new THREE.CanvasTexture(screenCanvas);
screenTexture.colorSpace = THREE.SRGBColorSpace;
const storyScreen = new THREE.Mesh(
  new THREE.PlaneGeometry(2.32, 1.45),
  new THREE.MeshBasicMaterial({ map: screenTexture, toneMapped: false }),
);
storyScreen.position.set(1.92, 1.56, -1.19);
studio.add(storyScreen);
box(2.46, 1.59, 0.08, 0x0b1521, 1.92, 1.56, -1.25, { metalness: 0.74, roughness: 0.23 });
storyScreen.position.z = -1.14;

box(3.28, 0.84, 0.58, 0x063263, -0.42, 0.11, 0.92, { metalness: 0.54, roughness: 0.26 });
box(3.58, 0.12, 0.78, 0xdcefff, -0.42, 0.57, 0.82, { metalness: 0.14, roughness: 0.22 });
const deskAccent = box(2.62, 0.07, 0.05, 0x13d7ff, -0.42, 0.34, 1.23, {
  emissive: 0x0aa8ef,
  emissiveIntensity: 4,
});
deskAccent.material.toneMapped = false;

const motion = await fetch(motionUrl).then((response) => {
  if (!response.ok) throw new Error(`Could not load motion: ${response.status}`);
  return response.json();
});
const loader = new ColladaLoader();
const collada = await loader.loadAsync(new URL(`../../${characterPack.model}`, location.href).href);
const character = collada.scene;
const characterRoot = new THREE.Group();
// The export declares Z-up. Keep the loader's axis correction explicit so the
// character's authored Z dimension becomes vertical in the Three.js scene.
character.rotation.set(-Math.PI / 2, 0, 0);
characterRoot.add(character);
scene.add(characterRoot);

const characterTextures = new Set();
character.traverse((object) => {
  if (object.isMesh) {
    object.castShadow = true;
    object.receiveShadow = true;
    const sourceMaterials = Array.isArray(object.material) ? object.material : [object.material];
    const materials = sourceMaterials.map((source) => {
      const textureSource = source.map?.image?.currentSrc || source.map?.image?.src || "";
      const texturePath = textureSource.split(/[?#]/, 1)[0];
      const isTransparentOverlay = characterPack.transparentMaterials?.includes(source.name)
        || characterPack.transparentTextures?.some((filename) => texturePath.endsWith(filename));
      if (source.map) {
        characterTextures.add(source.map);
        source.map.magFilter = THREE.NearestFilter;
        source.map.minFilter = THREE.NearestMipmapNearestFilter;
        source.map.colorSpace = THREE.SRGBColorSpace;
      }
      return new THREE.MeshBasicMaterial({
        map: source.map || null,
        color: 0xffffff,
        side: THREE.DoubleSide,
        transparent: isTransparentOverlay,
        alphaTest: isTransparentOverlay ? 0.08 : 0,
        toneMapped: false,
      });
    });
    object.material = Array.isArray(object.material) ? materials : materials[0];
  }
});

await Promise.all([...characterTextures].map((texture) => {
  const image = texture.image;
  if (!image || image.complete) return Promise.resolve();
  return new Promise((resolve) => {
    image.addEventListener("load", resolve, { once: true });
    image.addEventListener("error", resolve, { once: true });
  });
}));

let bounds = new THREE.Box3().setFromObject(character);
// Keep the original game units at a comfortable seated-news-anchor scale.
const modelScale = characterPack.scale;
character.scale.setScalar(modelScale);
character.updateMatrixWorld(true);
bounds = new THREE.Box3().setFromObject(character);
const scaledCenter = bounds.getCenter(new THREE.Vector3());
character.position.x -= scaledCenter.x;
character.position.y -= bounds.min.y;
character.position.z -= scaledCenter.z;
characterRoot.position.z = -0.05;
characterRoot.position.y = characterPack.rootY || 0;
characterRoot.rotation.y = characterPack.yaw || 0;
character.updateMatrixWorld(true);

const bones = {};
character.traverse((object) => {
  if (object.isBone) bones[object.name] = object;
});
const rest = new Map();
for (const bone of Object.values(bones)) {
  rest.set(bone, {
    position: bone.position.clone(),
    quaternion: bone.quaternion.clone(),
    scale: bone.scale.clone(),
  });
}

const temp = {
  a: new THREE.Vector3(),
  b: new THREE.Vector3(),
  localDelta: new THREE.Vector3(),
  current: new THREE.Vector3(),
  target: new THREE.Vector3(),
  world: new THREE.Quaternion(),
  parent: new THREE.Quaternion(),
  delta: new THREE.Quaternion(),
  desired: new THREE.Quaternion(),
};

function resetBones() {
  for (const [bone, transform] of rest.entries()) {
    bone.position.copy(transform.position);
    bone.quaternion.copy(transform.quaternion);
    bone.scale.copy(transform.scale);
  }
  character.updateMatrixWorld(true);
}

const gestureTemplates = {
  intro_open: {
    upperL: [0.78, 0.28, 0.05], foreL: [0.94, 0.24, 0.04],
    upperR: [-0.62, 0.24, 0.08], foreR: [-0.72, 0.30, 0.06],
    lean: -0.02, turn: -0.04,
  },
  present_screen: {
    upperL: [0.84, 0.48, 0.03], foreL: [0.98, 0.22, 0.02],
    upperR: [-0.34, 0.20, 0.08], foreR: [0.12, 0.48, 0.05],
    lean: 0.04, turn: -0.12,
  },
  incredulous: {
    upperL: [0.80, 0.50, 0.02], foreL: [0.96, 0.22, 0.02],
    upperR: [-0.34, 0.24, 0.08], foreR: [0.16, 0.50, 0.05],
    lean: 0.075, turn: 0.04,
  },
  big_reveal: {
    upperL: [0.68, 0.68, 0.02], foreL: [0.76, 0.56, 0.02],
    upperR: [-0.68, 0.68, 0.02], foreR: [-0.76, 0.56, 0.02],
    lean: 0.10, turn: 0,
  },
  verdict: {
    upperL: [0.34, 0.22, 0.07], foreL: [0.28, 0.34, 0.04],
    upperR: [-0.78, 0.42, 0.03], foreR: [-0.92, 0.26, 0.02],
    lean: 0.055, turn: 0.11,
  },
  button: {
    upperL: [0.56, 0.30, 0.06], foreL: [0.62, 0.34, 0.04],
    upperR: [-0.56, 0.30, 0.06], foreR: [-0.62, 0.34, 0.04],
    lean: 0, turn: -0.04,
  },
};

const gestureTimeline = [
  { at: 0, name: "intro_open" },
  { at: 1.75, name: "present_screen" },
  { at: 3.75, name: "incredulous" },
  { at: 5.75, name: "big_reveal" },
  { at: 7.85, name: "verdict" },
  { at: 9.55, name: "button" },
];

function expandGesture(pose) {
  return {
    upperL: new THREE.Vector3(...pose.upperL).normalize(),
    foreL: new THREE.Vector3(...pose.foreL).normalize(),
    upperR: new THREE.Vector3(...pose.upperR).normalize(),
    foreR: new THREE.Vector3(...pose.foreR).normalize(),
    lean: pose.lean,
    turn: pose.turn,
  };
}

function interpolateGesture(from, to, mix) {
  const blendVector = (name) => from[name].clone().lerp(to[name], mix).normalize();
  return {
    upperL: blendVector("upperL"),
    foreL: blendVector("foreL"),
    upperR: blendVector("upperR"),
    foreR: blendVector("foreR"),
    lean: THREE.MathUtils.lerp(from.lean, to.lean, mix),
    turn: THREE.MathUtils.lerp(from.turn, to.turn, mix),
  };
}

function gesturePoseAt(time) {
  let currentIndex = gestureTimeline.findLastIndex((cue) => cue.at <= time);
  currentIndex = Math.max(0, currentIndex);
  const current = expandGesture(gestureTemplates[gestureTimeline[currentIndex].name]);
  const nextCue = gestureTimeline[currentIndex + 1];
  if (!nextCue) return current;
  const transitionDuration = 0.24;
  const transitionStart = nextCue.at - transitionDuration;
  if (time <= transitionStart) return current;
  const next = expandGesture(gestureTemplates[nextCue.name]);
  let mix = THREE.MathUtils.clamp((time - transitionStart) / transitionDuration, 0, 1);
  mix = mix * mix * (3 - 2 * mix);
  return interpolateGesture(current, next, mix);
}

function deskSafeDirection(scripted, minimumY) {
  const direction = scripted.clone();
  direction.y = Math.max(minimumY, direction.y);
  direction.z = THREE.MathUtils.clamp(direction.z, -0.08, 0.16);
  return direction.normalize();
}

function screenPoint(points, name) {
  const value = points[`${name}_screen`];
  return value ? new THREE.Vector3(value[0], value[1], value[2] || 0) : null;
}

function trackedDirection(points, startName, endName, lowerBehindDesk = false) {
  const start = screenPoint(points, startName);
  const end = screenPoint(points, endName);
  if (!start || !end) return null;
  let vertical = start.y - end.y;
  if (lowerBehindDesk && end.y > 0.48) {
    vertical -= THREE.MathUtils.clamp((end.y - 0.48) * 1.65, 0, 0.19);
  }
  return new THREE.Vector3(end.x - start.x, vertical, 0).normalize();
}

function trackedHandDirection(points, side) {
  const wrist = screenPoint(points, `${side}_wrist`);
  if (!wrist || wrist.y > 0.50) return null;
  return trackedDirection(points, `${side}_wrist`, `${side}_index`);
}

function trackedBodyPose(points) {
  const leftShoulder = screenPoint(points, "left_shoulder");
  const rightShoulder = screenPoint(points, "right_shoulder");
  const leftHip = screenPoint(points, "left_hip");
  const rightHip = screenPoint(points, "right_hip");
  const nose = screenPoint(points, "nose");
  if (!leftShoulder || !rightShoulder || !leftHip || !rightHip || !nose) return null;
  const shoulderMidX = (leftShoulder.x + rightShoulder.x) * 0.5;
  const hipMidX = (leftHip.x + rightHip.x) * 0.5;
  return {
    roll: THREE.MathUtils.clamp((shoulderMidX - hipMidX) * 1.4, -0.09, 0.09),
    turn: THREE.MathUtils.clamp((nose.x - shoulderMidX) * 1.6, -0.16, 0.16),
  };
}

function offsetBoneInWorld(bone, x, y, z) {
  if (!bone?.parent) return;
  character.updateMatrixWorld(true);
  bone.parent.getWorldQuaternion(temp.parent).invert();
  temp.localDelta.set(x, y, z).applyQuaternion(temp.parent);
  bone.position.copy(rest.get(bone).position).add(temp.localDelta);
  character.updateMatrixWorld(true);
}

function aimBone(boneName, childName, targetDirection, blend = 0.82) {
  const bone = bones[boneName];
  const child = bones[childName];
  if (!bone || !child || !targetDirection) return;
  character.updateMatrixWorld(true);
  bone.getWorldPosition(temp.a);
  child.getWorldPosition(temp.b);
  temp.current.copy(temp.b).sub(temp.a).normalize();
  temp.target.copy(temp.current).lerp(targetDirection, blend).normalize();
  temp.delta.setFromUnitVectors(temp.current, temp.target);
  bone.getWorldQuaternion(temp.world);
  temp.desired.copy(temp.delta).multiply(temp.world);
  bone.parent.getWorldQuaternion(temp.parent).invert();
  bone.quaternion.copy(temp.parent.multiply(temp.desired));
  character.updateMatrixWorld(true);
}

function applyFrame(index) {
  const frame = motion.frames[Math.max(0, Math.min(motion.frames.length - 1, index))];
  drawMonitor(frame.t);
  screenTexture.needsUpdate = true;
  resetBones();
  const points = frame.points || {};
  const time = frame.t;
  const storyPose = gesturePoseAt(time);
  const upperL = trackedDirection(points, "left_shoulder", "left_elbow");
  const foreL = trackedDirection(points, "left_elbow", "left_wrist", true);
  const handL = trackedHandDirection(points, "left");
  const upperR = trackedDirection(points, "right_shoulder", "right_elbow");
  const foreR = trackedDirection(points, "right_elbow", "right_wrist", true);
  const handR = trackedHandDirection(points, "right");
  const bodyPose = trackedBodyPose(points);

  const leftArm = characterPack.rig.leftArm;
  const rightArm = characterPack.rig.rightArm;
  aimBone(leftArm.upper, leftArm.elbow, upperL || deskSafeDirection(storyPose.upperL, 0.08), 0.92);
  aimBone(leftArm.forearm, leftArm.forearmTip, foreL || deskSafeDirection(storyPose.foreL, 0.22), 0.94);
  aimBone(leftArm.hand, leftArm.handTip, handL, 0.72);
  aimBone(rightArm.upper, rightArm.elbow, upperR || deskSafeDirection(storyPose.upperR, 0.08), 0.92);
  aimBone(rightArm.forearm, rightArm.forearmTip, foreR || deskSafeDirection(storyPose.foreR, 0.22), 0.94);
  aimBone(rightArm.hand, rightArm.handTip, handR, 0.72);

  const chest = bones[characterPack.rig.chest];
  if (chest) {
    const base = rest.get(chest).quaternion;
    const trackedRoll = bodyPose?.roll ?? 0;
    const emphasisLean = (bodyPose ? 0.015 : storyPose.lean) + frame.mouth * 0.018;
    chest.quaternion.copy(base).multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(emphasisLean, 0, trackedRoll)));
  }

  const head = bones[characterPack.rig.head];
  if (head) {
    const base = rest.get(head).quaternion;
    const nod = Math.sin(time * 2.15) * 0.028 + frame.mouth * 0.045;
    const turn = bodyPose?.turn ?? storyPose.turn;
    head.quaternion.copy(base).multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(nod, turn, 0)));
  }

  const mouthRig = characterPack.rig.mouth;
  const mouth = bones[mouthRig.center];
  if (mouth) {
    const speechOpen = Math.pow(THREE.MathUtils.clamp((frame.mouth - 0.08) / 0.92, 0, 1), 0.85);
    if (mouthRig.mode === "octopus") {
      const base = rest.get(mouth).scale;
      mouth.scale.set(base.x * (1 - speechOpen * 0.08), base.y, base.z * (0.92 + speechOpen * 1.35));
      offsetBoneInWorld(mouth, 0, -0.052 * speechOpen, 0.006 * speechOpen);
      offsetBoneInWorld(bones[mouthRig.leftCorner], -0.012 * speechOpen, -0.027 * speechOpen, 0.004 * speechOpen);
      offsetBoneInWorld(bones[mouthRig.rightCorner], 0.012 * speechOpen, -0.027 * speechOpen, 0.004 * speechOpen);
    } else if (mouthRig.mode === "jaw") {
      offsetBoneInWorld(mouth, 0, -0.045 * speechOpen, 0.004 * speechOpen);
      offsetBoneInWorld(bones[mouthRig.lower], 0, -0.018 * speechOpen, 0.003 * speechOpen);
    }
  }

  const blinkPhase = time % 4.15;
  const blink = blinkPhase > 3.94 ? Math.sin(((blinkPhase - 3.94) / 0.21) * Math.PI) : 0;
  const blinkRig = characterPack.rig.blink;
  if (blinkRig.mode === "scale") {
    for (const name of blinkRig.bones) {
      const eye = bones[name];
      if (!eye) continue;
      const base = rest.get(eye).scale;
      eye.scale.set(base.x, base.y * (1 - blink * 0.82), base.z);
    }
  } else if (blinkRig.mode === "lids") {
    for (const name of blinkRig.upper) offsetBoneInWorld(bones[name], 0, -0.018 * blink, 0);
    for (const name of blinkRig.lower) offsetBoneInWorld(bones[name], 0, 0.018 * blink, 0);
  }

  character.updateMatrixWorld(true);
  renderer.render(scene, camera);
  return frame;
}

window.renderFrame = (index) => applyFrame(index);
window.motionInfo = { fps: motion.fps, duration: motion.duration, frameCount: motion.frameCount };
applyFrame(initialFrame());
window.__SNN_READY__ = true;
document.body.dataset.ready = "true";
status.textContent = `${characterPack.label} is ready`;
if (!captureMode) playButton.hidden = false;

let animationHandle = null;
playButton.addEventListener("click", async () => {
  if (animationHandle) cancelAnimationFrame(animationHandle);
  const audio = new Audio(audioUrl);
  await audio.play();
  playButton.hidden = true;
  const start = performance.now();
  const tick = () => {
    const elapsed = (performance.now() - start) / 1000;
    const index = Math.min(motion.frameCount - 1, Math.floor(elapsed * motion.fps));
    applyFrame(index);
    if (elapsed < motion.duration) animationHandle = requestAnimationFrame(tick);
    else playButton.hidden = false;
  };
  tick();
});

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  applyFrame(initialFrame());
});

window.addEventListener("hashchange", () => applyFrame(initialFrame()));
