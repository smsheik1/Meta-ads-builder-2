import * as THREE from "three";
import { ColladaLoader } from "../vendor/loaders/ColladaLoader.js";
import { createMixamoRetargeter } from "./mixamo-retarget.js";

const params = new URLSearchParams(location.search);
const labMode = params.get("mode") === "lab";
const canvas = document.querySelector("#canvas");
const title = document.querySelector("#title");
const clipLabel = document.querySelector("#clip-label");
const errorPanel = document.querySelector("#error");
const LOAD_TIMEOUT_MS = 15_000;

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: !labMode });
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
const selectionState = {
  generation: 0,
  phase: labMode ? "loading" : "ready",
  targetCharacterPack: null,
  targetMotionRecord: null,
};
let resumeAfterContextRestore = true;
let webglStatus = "ready";

canvas.addEventListener("webglcontextlost", handleWebglContextLost);
canvas.addEventListener("webglcontextrestored", handleWebglContextRestored);

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
  const loaded = await loadCachedCharacter(characterPack);
  commitPreparedSelection(characterPack, loaded, motion);

  window.motionInfo = motionInfo();
  window.renderFrame = renderFrame;
  renderFrame(0);
  window.__MIXAMO_MOTION_READY__ = true;
}

async function initializeLab() {
  document.body.classList.add("lab");
  const [catalog, starterManifest, userManifest] = await Promise.all([
    readJson("../../assets/character-packs.json"),
    readJson("../../assets/motions/manifest.json"),
    readOptionalJson("../../user-motions/manifest.json", { motions: [] }),
  ]);
  const manifest = { motions: [...starterManifest.motions, ...(userManifest.motions || [])] };
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
  bindLabControls();
  selectionState.targetCharacterPack = initialCharacter;
  selectionState.targetMotionRecord = initialRecord;
  await requestSelection({}, { throwOnError: true });
  requestAnimationFrame(animate);

  window.__DANCE_LAB_READY__ = true;
}

async function readOptionalJson(url, fallback) {
  try {
    return await readJson(url);
  } catch {
    return fallback;
  }
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
      if (pack.id === state.characterId && selectionState.phase === "ready") return restart();
      await requestSelection({ characterPack: pack });
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
      if (motion.id === state.motionId && selectionState.phase === "ready") return restart();
      await requestSelection({ motionRecord: motion });
    });
    container.append(button);
  });
}

async function requestSelection(
  {
    characterPack = selectionState.targetCharacterPack,
    motionRecord = selectionState.targetMotionRecord,
  } = {},
  { throwOnError = false } = {},
) {
  if (!characterPack || !motionRecord) throw new Error("A character and motion are required");
  selectionState.targetCharacterPack = characterPack;
  selectionState.targetMotionRecord = motionRecord;
  const generation = ++selectionState.generation;
  setSelectionPhase("loading");
  clearError();
  try {
    const [loaded, motion] = await Promise.all([
      loadCachedCharacter(characterPack),
      loadMotion(motionRecord),
    ]);
    if (generation !== selectionState.generation) return false;
    commitPreparedSelection(characterPack, loaded, motion);
    updateLabSelection();
    setSelectionPhase("ready");
    return true;
  } catch (error) {
    if (generation !== selectionState.generation) return false;
    setSelectionPhase("error");
    showError(error);
    if (throwOnError) throw error;
    return false;
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

function setSelectionPhase(phase) {
  selectionState.phase = phase;
  setBusy(phase === "loading" || phase === "recovering");
  updateRuntimeDataset();
}

function setBusy(busy) {
  const shell = document.querySelector("#lab-shell");
  shell.setAttribute("aria-busy", String(busy));
  for (const button of document.querySelectorAll(".stage-actions button")) button.disabled = busy;
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
  updateRuntimeDataset();
}

function updatePlaybackButtons() {
  const button = document.querySelector("#play-toggle");
  if (!button) return;
  button.textContent = state.playing ? "Pause" : "Play";
  button.setAttribute("aria-pressed", String(!state.playing));
}

function restart() {
  if (!state.retargeter) return;
  state.currentFrame = 0;
  state.startedAt = performance.now();
  state.playing = true;
  if (webglStatus === "ready") renderFrame(0);
  if (labMode) updatePlaybackButtons();
}

async function loadMotion(record) {
  return cacheLoad(
    motionCache,
    record.id,
    () => readJson(`../../${record.file}`),
    `motion ${record.label}`,
  );
}

async function loadCachedCharacter(characterPack) {
  return cacheLoad(
    characterCache,
    characterPack.id,
    () => loadCharacter(characterPack),
    `character ${characterPack.label}`,
  );
}

function commitPreparedSelection(characterPack, loaded, motion) {
  const sameCharacter = state.characterRoot === loaded.characterRoot;
  if (sameCharacter) state.retargeter?.resetPose();
  const nextRetargeter = createMixamoRetargeter({
    characterRoot: loaded.characterRoot,
    character: loaded.character,
    profile: characterPack.motionProfile,
    clip: motion,
  });
  if (!sameCharacter) {
    state.retargeter?.resetPose();
    if (state.characterRoot) scene.remove(state.characterRoot);
    scene.add(loaded.characterRoot);
  }
  state.character = loaded.character;
  state.characterId = characterPack.id;
  state.characterPack = characterPack;
  state.characterRoot = loaded.characterRoot;
  state.motion = motion;
  state.motionId = motion.id;
  state.retargeter = nextRetargeter;
  restart();
}

function cacheLoad(cache, key, load, label) {
  if (cache.has(key)) return cache.get(key);
  let timer;
  let pending;
  pending = Promise.race([
    load(),
    new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error(`Timed out loading ${label}`)), LOAD_TIMEOUT_MS);
    }),
  ])
    .finally(() => clearTimeout(timer))
    .catch((error) => {
      if (cache.get(key) === pending) cache.delete(key);
      throw error;
    });
  cache.set(key, pending);
  return pending;
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

function handleWebglContextLost(event) {
  event.preventDefault();
  resumeAfterContextRestore = state.playing;
  state.playing = false;
  webglStatus = "lost";
  if (labMode && selectionState.phase !== "loading") setSelectionPhase("recovering");
  updatePlaybackButtons();
  updateRuntimeDataset();
}

function handleWebglContextRestored() {
  webglStatus = "ready";
  if (state.retargeter) {
    state.playing = resumeAfterContextRestore;
    state.startedAt = performance.now() - state.currentFrame * 1000 / state.motion.fps;
    renderFrame(state.currentFrame);
  }
  if (labMode && selectionState.phase === "recovering") setSelectionPhase("ready");
  clearError();
  updatePlaybackButtons();
  updateRuntimeDataset();
}

function animate(now) {
  try {
    if (document.hidden || webglStatus === "lost") return;
    if (state.retargeter && state.playing) {
      const elapsed = Math.max(0, now - state.startedAt);
      const frame = Math.floor(elapsed * state.motion.fps / 1000) % state.motion.frameCount;
      if (frame !== state.currentFrame) renderFrame(frame);
    } else {
      renderer.render(scene, camera);
    }
  } catch (error) {
    state.playing = false;
    if (labMode) setSelectionPhase("error");
    showError(error);
  } finally {
    requestAnimationFrame(animate);
  }
}

function renderFrame(index) {
  if (!state.retargeter) return null;
  state.currentFrame = index;
  const diagnostics = state.retargeter.applyFrame(index);
  renderer.render(scene, camera);
  updateRuntimeDataset();
  return diagnostics;
}

function updateRuntimeDataset() {
  if (!labMode) return;
  const shell = document.querySelector("#lab-shell");
  shell.dataset.currentFrame = String(state.currentFrame);
  shell.dataset.selectionPhase = selectionState.phase;
  shell.dataset.webglStatus = webglStatus;
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

function clearError() {
  errorPanel.style.display = "none";
  errorPanel.textContent = "";
}
