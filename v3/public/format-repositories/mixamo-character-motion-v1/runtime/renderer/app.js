import * as THREE from "three";
import { ColladaLoader } from "../vendor/loaders/ColladaLoader.js";
import { createMixamoRetargeter } from "./mixamo-retarget.js";

const params = new URLSearchParams(location.search);
const labMode = params.get("mode") === "lab";
const canvas = document.querySelector("#canvas");
const title = document.querySelector("#title");
const clipLabel = document.querySelector("#clip-label");
const errorPanel = document.querySelector("#error");

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1);
renderer.setSize(1280, 720, false);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
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

const floor = new THREE.Mesh(
  new THREE.CircleGeometry(4.6, 96),
  new THREE.MeshStandardMaterial({ color: 0xd9f7fb, roughness: 0.78, metalness: 0.02 }),
);
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

const state = {
  character: null,
  characterId: null,
  characterPack: null,
  characterRoot: null,
  currentFrame: 0,
  motion: null,
  motionId: null,
  playing: true,
  retargeter: null,
  startedAt: performance.now(),
};
const characterCache = new Map();
const motionCache = new Map();

try {
  if (labMode) await initializeLab();
  else await initializeRenderer();
} catch (error) {
  showError(error);
  throw error;
}

async function initializeRenderer() {
  const inputUrl = params.get("input");
  const motionUrl = params.get("motion");
  if (!inputUrl || !motionUrl) throw new Error("Renderer requires input and motion query parameters");

  const [input, catalog, motion] = await Promise.all([
    readJson(inputUrl),
    readJson("../../assets/character-packs.json"),
    readJson(motionUrl),
  ]);
  const characterPack = catalog.packs.find((pack) => pack.id === input.characterId);
  if (!characterPack) throw new Error(`Unknown character: ${input.characterId}`);

  document.body.style.background = `radial-gradient(circle at 50% 28%, rgba(255,255,255,.2), transparent 36%), linear-gradient(145deg, ${input.background || "#0b3558"} 0%, #08718c 52%, #082b50 100%)`;
  title.textContent = input.title;
  await activateCharacter(characterPack);
  activateMotion(motion);

  window.motionInfo = motionInfo();
  window.renderFrame = renderFrame;
  renderFrame(0);
  window.__MIXAMO_MOTION_READY__ = true;
}

async function initializeLab() {
  document.body.classList.add("lab");
  const [catalog, manifest] = await Promise.all([
    readJson("../../assets/character-packs.json"),
    readJson("../../assets/motions/manifest.json"),
  ]);
  const packs = catalog.packs.filter((pack) => pack.status === "motion-ready");
  const initialCharacter = packs.find((pack) => pack.id === params.get("character"))
    || packs.find((pack) => pack.id === catalog.defaultCharacterId)
    || packs[0];
  const initialRecord = manifest.motions.find((motion) => motion.id === params.get("motion"))
    || manifest.motions.find((motion) => motion.id === "hip-hop-dancing")
    || manifest.motions[0];
  if (!initialCharacter || !initialRecord) throw new Error("Dance Lab needs at least one character and one motion");

  document.querySelector("#motion-count").textContent = `${manifest.motions.length} motions`;
  renderCharacterButtons(packs);
  renderMotionButtons(manifest.motions);
  state.motion = await loadMotion(initialRecord);
  state.motionId = initialRecord.id;
  await activateCharacter(initialCharacter);
  activateMotion(state.motion);
  updateLabSelection();
  bindLabControls();
  requestAnimationFrame(animate);

  window.__DANCE_LAB_READY__ = true;
}

function renderCharacterButtons(packs) {
  const container = document.querySelector("#character-selector");
  for (const pack of packs) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "character-button";
    button.dataset.characterId = pack.id;
    button.textContent = pack.label.replace(" SquarePants", "");
    button.addEventListener("click", async () => {
      if (pack.id === state.characterId) return restart();
      await runSelection(async () => {
        await activateCharacter(pack);
        activateMotion(state.motion);
      });
    });
    container.append(button);
  }
}

function renderMotionButtons(motions) {
  const container = document.querySelector("#motion-grid");
  motions.forEach((motion, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "motion-button";
    button.dataset.motionId = motion.id;
    button.setAttribute("aria-label", `Play ${motion.label}`);

    const number = document.createElement("span");
    number.className = "motion-number";
    number.textContent = String(index + 1).padStart(2, "0");
    const label = document.createElement("span");
    label.className = "motion-name";
    label.textContent = motion.label;
    const duration = document.createElement("span");
    duration.className = "motion-duration";
    duration.textContent = `${motion.durationSeconds.toFixed(1)}s`;
    button.append(number, label, duration);

    button.addEventListener("click", async () => {
      if (motion.id === state.motionId) return restart();
      await runSelection(async () => {
        state.motion = await loadMotion(motion);
        state.motionId = motion.id;
        activateMotion(state.motion);
      });
    });
    container.append(button);
  });
}

async function runSelection(action) {
  setBusy(true);
  try {
    await action();
    updateLabSelection();
  } catch (error) {
    showError(error);
  } finally {
    setBusy(false);
  }
}

function bindLabControls() {
  document.querySelector("#play-toggle").addEventListener("click", () => {
    state.playing = !state.playing;
    if (state.playing) state.startedAt = performance.now() - state.currentFrame * 1000 / state.motion.fps;
    updatePlaybackButtons();
  });
  document.querySelector("#restart").addEventListener("click", restart);
  const toggle = document.querySelector("#download-toggle");
  const menu = document.querySelector("#download-menu");
  toggle.addEventListener("click", (event) => {
    event.stopPropagation();
    const open = menu.hidden;
    menu.hidden = !open;
    toggle.setAttribute("aria-expanded", String(open));
  });
  menu.addEventListener("click", (event) => event.stopPropagation());
  for (const button of menu.querySelectorAll("[data-export-format]")) {
    button.addEventListener("click", () => downloadSelection(button.dataset.exportFormat));
  }
  document.addEventListener("click", closeDownloadMenu);
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeDownloadMenu();
  });
}

function closeDownloadMenu() {
  document.querySelector("#download-menu").hidden = true;
  document.querySelector("#download-toggle").setAttribute("aria-expanded", "false");
}

async function downloadSelection(format) {
  const toggle = document.querySelector("#download-toggle");
  const status = document.querySelector("#export-status");
  const characterId = state.characterId;
  const motionId = state.motionId;
  closeDownloadMenu();
  toggle.disabled = true;
  toggle.textContent = "Rendering…";
  status.textContent = `Rendering ${format.toUpperCase()} for ${state.characterPack.label}.`;
  try {
    const response = await fetch("/api/format-lab/character-dance-lab/export", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ characterId, motionId, format }),
    });
    if (!response.ok) {
      const problem = await response.json().catch(() => ({}));
      throw new Error(problem.error || `Export failed with ${response.status}`);
    }
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${characterId}-${motionId}.${format}`;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toggle.textContent = "Downloaded ✓";
    status.textContent = `${format.toUpperCase()} downloaded.`;
  } catch (error) {
    console.error(error);
    toggle.textContent = "Export failed";
    status.textContent = error instanceof Error ? error.message : String(error);
  } finally {
    setTimeout(() => {
      toggle.disabled = false;
      toggle.textContent = "Download ↑";
    }, 1800);
  }
}

function setBusy(busy) {
  document.querySelector("#lab-shell").setAttribute("aria-busy", String(busy));
  for (const button of document.querySelectorAll("#controls button")) button.disabled = busy;
}

function updateLabSelection() {
  const shell = document.querySelector("#lab-shell");
  shell.dataset.characterId = state.characterId;
  shell.dataset.loadedCharacterCount = String(characterCache.size);
  shell.dataset.loadedMotionCount = String(motionCache.size);
  shell.dataset.motionId = state.motionId;
  for (const button of document.querySelectorAll("[data-character-id]")) {
    button.setAttribute("aria-pressed", String(button.dataset.characterId === state.characterId));
  }
  for (const button of document.querySelectorAll("[data-motion-id]")) {
    button.setAttribute("aria-pressed", String(button.dataset.motionId === state.motionId));
  }
  title.textContent = state.characterPack.label;
  clipLabel.textContent = `${state.motion.label} · ${state.motion.frameCount} frames`;
  document.querySelector("#now-playing").textContent = `${state.characterPack.label} · ${state.motion.label}`;
  updatePlaybackButtons();
}

function updatePlaybackButtons() {
  const button = document.querySelector("#play-toggle");
  button.textContent = state.playing ? "Pause" : "Play";
  button.setAttribute("aria-pressed", String(!state.playing));
}

function restart() {
  if (!state.retargeter) return;
  state.currentFrame = 0;
  state.startedAt = performance.now();
  state.playing = true;
  renderFrame(0);
  if (labMode) updatePlaybackButtons();
}

async function loadMotion(record) {
  if (!motionCache.has(record.id)) motionCache.set(record.id, readJson(`../../${record.file}`));
  return motionCache.get(record.id);
}

async function activateCharacter(characterPack) {
  state.retargeter?.resetPose();
  state.retargeter = null;
  if (state.characterRoot) scene.remove(state.characterRoot);
  if (!characterCache.has(characterPack.id)) characterCache.set(characterPack.id, loadCharacter(characterPack));
  const loaded = await characterCache.get(characterPack.id);
  state.character = loaded.character;
  state.characterId = characterPack.id;
  state.characterPack = characterPack;
  state.characterRoot = loaded.characterRoot;
  scene.add(state.characterRoot);
}

function activateMotion(motion) {
  state.retargeter?.resetPose();
  state.motion = motion;
  state.motionId = motion.id;
  state.retargeter = createMixamoRetargeter({
    characterRoot: state.characterRoot,
    character: state.character,
    profile: state.characterPack.motionProfile,
    clip: motion,
  });
  clipLabel.textContent = `${motion.label} · ${motion.frameCount} frames`;
  restart();
}

async function loadCharacter(characterPack) {
  const manager = new THREE.LoadingManager();
  const assetsReady = new Promise((resolve, reject) => {
    manager.onLoad = resolve;
    manager.onError = (url) => reject(new Error(`Could not load character asset: ${url}`));
  });
  const characterLoader = new ColladaLoader(manager);
  const collada = await characterLoader.loadAsync(new URL(`../../${characterPack.model}`, location.href).href);
  const character = collada.scene;
  const characterRoot = new THREE.Group();
  character.rotation.set(-Math.PI / 2, 0, 0);
  characterRoot.add(character);

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
  await assetsReady;

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
  return { character, characterRoot };
}

function animate(now) {
  if (state.retargeter && state.playing) {
    const frame = Math.floor((now - state.startedAt) * state.motion.fps / 1000) % state.motion.frameCount;
    if (frame !== state.currentFrame) renderFrame(frame);
  } else {
    renderer.render(scene, camera);
  }
  requestAnimationFrame(animate);
}

function renderFrame(index) {
  state.currentFrame = index;
  const diagnostics = state.retargeter.applyFrame(index);
  renderer.render(scene, camera);
  return diagnostics;
}

function motionInfo() {
  return {
    kind: state.motion.kind,
    id: state.motion.id,
    label: state.motion.label,
    fps: state.motion.fps,
    frameCount: state.motion.frameCount,
    durationSeconds: state.motion.durationSeconds,
    sourceEndTimeSeconds: state.motion.sourceEndTimeSeconds,
    mappedBoneCount: state.retargeter.mappedBoneCount,
    motionScale: state.retargeter.motionScale,
  };
}

async function readJson(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Could not load ${response.url}: ${response.status}`);
  return response.json();
}

function showError(error) {
  errorPanel.style.display = "grid";
  errorPanel.textContent = error?.stack || error?.message || String(error);
}
