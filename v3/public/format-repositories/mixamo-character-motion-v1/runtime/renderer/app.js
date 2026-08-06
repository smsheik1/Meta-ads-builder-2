import * as THREE from "three";
import { ColladaLoader } from "../../node_modules/three/examples/jsm/loaders/ColladaLoader.js";
import { createMixamoRetargeter } from "./mixamo-retarget.js";

const params = new URLSearchParams(location.search);
const inputUrl = params.get("input");
const motionUrl = params.get("motion");
if (!inputUrl || !motionUrl) throw new Error("Renderer requires input and motion query parameters");

const [input, catalog, motion] = await Promise.all([
  fetch(inputUrl).then(checkResponse).then((response) => response.json()),
  fetch("../../assets/character-packs.json").then(checkResponse).then((response) => response.json()),
  fetch(motionUrl).then(checkResponse).then((response) => response.json()),
]);
const characterPack = catalog.packs.find((pack) => pack.id === input.characterId);
if (!characterPack) throw new Error(`Unknown character: ${input.characterId}`);

document.body.style.background = `radial-gradient(circle at 50% 28%, rgba(255,255,255,.2), transparent 36%), linear-gradient(145deg, ${input.background || "#0b3558"} 0%, #08718c 52%, #082b50 100%)`;
document.querySelector("#title").textContent = input.title;
document.querySelector("#clip-label").textContent = `${motion.label} · ${motion.frameCount} original frames`;

const canvas = document.querySelector("#canvas");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1);
renderer.setSize(1280, 720, false);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(28, 1280 / 720, 0.05, 100);
camera.position.set(0, 2.8, 9);
camera.lookAt(0, 1.65, 0);

scene.add(new THREE.HemisphereLight(0xeafaff, 0x18384e, 2.7));
const key = new THREE.DirectionalLight(0xffffff, 3.2);
key.position.set(-3, 7, 5);
key.castShadow = true;
key.shadow.mapSize.set(2048, 2048);
key.shadow.camera.left = -5;
key.shadow.camera.right = 5;
key.shadow.camera.top = 5;
key.shadow.camera.bottom = -1;
scene.add(key);
const rim = new THREE.DirectionalLight(0x68e4ff, 2.2);
rim.position.set(5, 4, -4);
scene.add(rim);

const floorMaterial = new THREE.MeshStandardMaterial({ color: 0xd9f7fb, roughness: 0.78, metalness: 0.02 });
const floor = new THREE.Mesh(new THREE.CircleGeometry(4.6, 96), floorMaterial);
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
floor.position.y = -0.012;
scene.add(floor);
const ring = new THREE.Mesh(
  new THREE.TorusGeometry(3.65, 0.027, 12, 96),
  new THREE.MeshBasicMaterial({ color: 0x89f5ff, transparent: true, opacity: 0.82, toneMapped: false }),
);
ring.rotation.x = Math.PI / 2;
ring.position.y = 0.006;
scene.add(ring);

const loader = new ColladaLoader();
const collada = await loader.loadAsync(new URL(`../../${characterPack.model}`, location.href).href);
const character = collada.scene;
const characterRoot = new THREE.Group();
character.rotation.set(-Math.PI / 2, 0, 0);
characterRoot.add(character);
scene.add(characterRoot);

const textures = new Set();
character.traverse((object) => {
  if (!object.isMesh) return;
  object.castShadow = true;
  object.receiveShadow = true;
  const sources = Array.isArray(object.material) ? object.material : [object.material];
  const materials = sources.map((source) => {
    const textureSource = source.map?.image?.currentSrc || source.map?.image?.src || "";
    const texturePath = textureSource.split(/[?#]/, 1)[0];
    const transparent = characterPack.transparentMaterials?.includes(source.name)
      || characterPack.transparentTextures?.some((filename) => texturePath.endsWith(filename));
    if (source.map) {
      textures.add(source.map);
      source.map.magFilter = THREE.NearestFilter;
      source.map.minFilter = THREE.NearestMipmapNearestFilter;
      source.map.colorSpace = THREE.SRGBColorSpace;
    }
    return new THREE.MeshBasicMaterial({
      map: source.map || null,
      color: 0xffffff,
      side: THREE.DoubleSide,
      transparent,
      alphaTest: transparent ? 0.08 : 0,
      toneMapped: false,
    });
  });
  object.material = Array.isArray(object.material) ? materials : materials[0];
});

await Promise.all([...textures].map((texture) => {
  const image = texture.image;
  if (!image || image.complete) return Promise.resolve();
  return new Promise((resolve) => {
    image.addEventListener("load", resolve, { once: true });
    image.addEventListener("error", resolve, { once: true });
  });
}));

character.scale.setScalar(characterPack.scale);
character.updateMatrixWorld(true);
const bounds = new THREE.Box3().setFromObject(character);
const center = bounds.getCenter(new THREE.Vector3());
character.position.x -= center.x;
character.position.y -= bounds.min.y;
character.position.z -= center.z;
characterRoot.rotation.y = characterPack.yaw || 0;
characterRoot.position.y = characterPack.rootY || 0;
characterRoot.updateMatrixWorld(true);

const retargeter = createMixamoRetargeter({
  characterRoot,
  character,
  profile: characterPack.motionProfile,
  clip: motion,
});

function renderFrame(index) {
  const diagnostics = retargeter.applyFrame(index);
  renderer.render(scene, camera);
  return diagnostics;
}

window.motionInfo = {
  kind: motion.kind,
  id: motion.id,
  label: motion.label,
  fps: motion.fps,
  frameCount: motion.frameCount,
  durationSeconds: motion.durationSeconds,
  sourceEndTimeSeconds: motion.sourceEndTimeSeconds,
  mappedBoneCount: retargeter.mappedBoneCount,
  motionScale: retargeter.motionScale,
};
window.renderFrame = renderFrame;
renderFrame(0);
window.__MIXAMO_MOTION_READY__ = true;

function checkResponse(response) {
  if (!response.ok) throw new Error(`Could not load ${response.url}: ${response.status}`);
  return response;
}

window.addEventListener("error", (event) => {
  const error = document.querySelector("#error");
  error.style.display = "grid";
  error.textContent = event.error?.stack || event.message;
});

