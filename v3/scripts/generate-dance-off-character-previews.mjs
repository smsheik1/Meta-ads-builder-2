import { createHash } from "node:crypto";
import { createReadStream, existsSync } from "node:fs";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const scriptRoot = path.dirname(fileURLToPath(import.meta.url));
const v3Root = path.resolve(scriptRoot, "..");
const workspaceRoot = path.resolve(v3Root, "..");
const nodeModulesRoot = path.join(workspaceRoot, "node_modules");
const motionRepoRoot = path.join(
  v3Root,
  "public/format-repositories/mixamo-character-motion-v1",
);
const previewRoot = path.join(
  v3Root,
  "public/discovery/bikini-bottom-dance-off/character-previews",
);
const previewBackground = "#f4f6f8";
const characterManifestPath = path.join(
  motionRepoRoot,
  "assets/character-packs.json",
);

const args = new Map(
  process.argv.slice(2).map((argument) => {
    const [key, ...value] = argument.split("=");
    return [key, value.join("=") || true];
  }),
);
const selectedCharacterIds = String(args.get("--character") || "")
  .split(",")
  .map((characterId) => characterId.trim())
  .filter(Boolean);
const force = args.has("--force");

const mimeTypes = new Map([
  [".css", "text/css; charset=utf-8"],
  [".dae", "model/vnd.collada+xml"],
  [".gif", "image/gif"],
  [".glb", "model/gltf-binary"],
  [".jpeg", "image/jpeg"],
  [".jpg", "image/jpeg"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".png", "image/png"],
  [".webp", "image/webp"],
]);

function sha256(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

function resolveAllowedFile(root, requestPath) {
  const candidate = path.resolve(root, `.${requestPath}`);
  if (candidate !== root && !candidate.startsWith(`${root}${path.sep}`)) {
    throw new Error(`Refusing to serve path outside ${root}: ${requestPath}`);
  }
  return candidate;
}

function exporterHtml() {
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <script type="importmap">
      {"imports":{"three":"/node_modules/three/build/three.module.js"}}
    </script>
  </head>
  <body>
    <script type="module">
      import * as THREE from "three";
      import { ColladaLoader } from "/node_modules/three/examples/jsm/loaders/ColladaLoader.js";
      import { GLTFExporter } from "/node_modules/three/examples/jsm/exporters/GLTFExporter.js";

      window.exportCharacter = async (characterPack) => {
        const manager = new THREE.LoadingManager();
        const assetsReady = new Promise((resolve, reject) => {
          manager.onLoad = resolve;
          manager.onError = (url) => reject(new Error(\`Could not load character asset: \${url}\`));
        });
        const loader = new ColladaLoader(manager);
        const collada = await loader.loadAsync(\`/motion-repo/\${characterPack.model}\`);
        const character = collada.scene;
        const characterRoot = new THREE.Group();
        characterRoot.name = characterPack.id;
        character.rotation.set(characterPack.pitch ?? -Math.PI / 2, 0, 0);
        characterRoot.add(character);

        character.traverse((object) => {
          if (!object.isMesh) return;
          // The official runtime's unlit materials ignore authored vertex colors.
          // glTF consumers always multiply COLOR_0 into the base color, so remove
          // that attribute to preserve the runtime's actual textured appearance.
          object.geometry?.deleteAttribute("color");
          const sources = Array.isArray(object.material) ? object.material : [object.material];
          const materials = sources.map((source) => {
            const textureSource = source.map?.image?.currentSrc || source.map?.image?.src || "";
            const texturePath = textureSource.split(/[?#]/, 1)[0];
            const opacity = characterPack.materialOpacities?.[source.name] ?? 1;
            const transparent = opacity < 1
              || characterPack.transparentMaterials?.includes(source.name)
              || characterPack.transparentTextures?.some((filename) => texturePath.endsWith(filename));
            if (source.map) {
              source.map.magFilter = THREE.NearestFilter;
              source.map.minFilter = THREE.NearestMipmapNearestFilter;
              source.map.colorSpace = THREE.SRGBColorSpace;
              source.map.needsUpdate = true;
            }
            const material = new THREE.MeshBasicMaterial({
              map: source.map || null,
              color: 0xffffff,
              side: THREE.DoubleSide,
              transparent,
              opacity,
              alphaTest: transparent ? 0.08 : 0,
              depthWrite: !transparent,
              toneMapped: false,
            });
            material.name = source.name;
            return material;
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

        const exporter = new GLTFExporter();
        const result = await exporter.parseAsync(characterRoot, {
          binary: true,
          onlyVisible: true,
          trs: false,
        });
        const blob = new Blob([result], { type: "model/gltf-binary" });
        const link = document.createElement("a");
        link.download = \`\${characterPack.id}.glb\`;
        link.href = URL.createObjectURL(blob);
        document.body.append(link);
        link.click();
        link.remove();
        setTimeout(() => URL.revokeObjectURL(link.href), 1000);
        return { bytes: result.byteLength };
      };
    </script>
  </body>
</html>`;
}

function posterHtml() {
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <style>
      html, body { width: 100%; height: 100%; margin: 0; overflow: hidden; background: ${previewBackground}; }
      model-viewer { display: block; width: 800px; height: 1000px; background: ${previewBackground}; }
    </style>
    <script type="module" src="/node_modules/@google/model-viewer/dist/model-viewer.min.js"></script>
  </head>
  <body>
    <model-viewer
      id="preview"
      alt="Character preview"
      camera-controls
      interaction-prompt="none"
      camera-orbit="0deg 75deg 105%"
      field-of-view="30deg"
      shadow-intensity="0"
      exposure="1"
    ></model-viewer>
    <script>
      window.loadPreview = async (characterId) => {
        await customElements.whenDefined("model-viewer");
        const viewer = document.getElementById("preview");
        const loaded = new Promise((resolve, reject) => {
          viewer.addEventListener("load", resolve, { once: true });
          viewer.addEventListener("error", (event) => reject(new Error(event.detail?.message || "Model preview failed")), { once: true });
        });
        viewer.src = \`/previews/\${characterId}.glb\`;
        await loaded;
        await viewer.updateComplete;
        viewer.jumpCameraToGoal();
        await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        return true;
      };
    </script>
  </body>
</html>`;
}

async function serveFile(response, filePath) {
  const fileStats = await stat(filePath);
  if (!fileStats.isFile()) throw new Error("Not a file");
  response.writeHead(200, {
    "Content-Length": fileStats.size,
    "Content-Type": mimeTypes.get(path.extname(filePath).toLowerCase()) || "application/octet-stream",
  });
  createReadStream(filePath).pipe(response);
}

async function createPreviewServer() {
  const server = createServer(async (request, response) => {
    try {
      const requestUrl = new URL(request.url || "/", "http://127.0.0.1");
      const pathname = decodeURIComponent(requestUrl.pathname);
      if (pathname === "/exporter.html") {
        response.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        response.end(exporterHtml());
        return;
      }
      if (pathname === "/poster.html") {
        response.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        response.end(posterHtml());
        return;
      }
      const routes = [
        ["/node_modules", nodeModulesRoot],
        ["/motion-repo", motionRepoRoot],
        ["/previews", previewRoot],
      ];
      const route = routes.find(([prefix]) => pathname === prefix || pathname.startsWith(`${prefix}/`));
      if (!route) {
        response.writeHead(404).end("Not found");
        return;
      }
      const [prefix, root] = route;
      await serveFile(response, resolveAllowedFile(root, pathname.slice(prefix.length)));
    } catch (error) {
      response.writeHead(404).end(error instanceof Error ? error.message : "Not found");
    }
  });
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Preview server did not bind a TCP port.");
  return { server, origin: `http://127.0.0.1:${address.port}` };
}

async function exportCharacter(page, origin, characterPack, outputPath) {
  await page.goto(`${origin}/exporter.html`, { waitUntil: "load" });
  await page.waitForFunction(() => typeof window.exportCharacter === "function");
  const [download, result] = await Promise.all([
    page.waitForEvent("download"),
    page.evaluate((pack) => window.exportCharacter(pack), characterPack),
  ]);
  await download.saveAs(outputPath);
  return result;
}

async function renderPoster(page, origin, characterId, outputPath) {
  await page.goto(`${origin}/poster.html`, { waitUntil: "load" });
  await page.evaluate((id) => window.loadPreview(id), characterId);
  await page.screenshot({ path: outputPath, type: "png" });
}

async function buildProvenance(characterPacks) {
  const previews = [];
  for (const characterPack of characterPacks) {
    const modelPath = path.join(previewRoot, `${characterPack.id}.glb`);
    const imagePath = path.join(previewRoot, `${characterPack.id}.png`);
    if (!existsSync(modelPath) || !existsSync(imagePath)) {
      throw new Error(`Missing preview pair for ${characterPack.id}. Run the generator without --character.`);
    }
    const [model, image] = await Promise.all([readFile(modelPath), readFile(imagePath)]);
    previews.push({
      characterId: characterPack.id,
      imageSha256: sha256(image),
      imageDimensions: { width: 800, height: 1000 },
      modelSha256: sha256(model),
    });
  }
  return {
    schemaVersion: 1,
    purpose: "Browser-ready interactive previews for the Bikini Bottom Dance Off Included Assets section",
    background: previewBackground,
    interactivePreviewDimensions: { width: 800, height: 1000 },
    source: `The ${characterPacks.length} motion-ready character rigs packaged in mixamo-character-motion-v1/assets/character-packs.json`,
    method: `All ${characterPacks.length} browser-ready GLBs and clean neutral-background posters are exported from the official runtime's Collada loader with the packaged scale and transparency rules. The packaged Collada rigs remain the production source of truth.`,
    previews,
  };
}

async function main() {
  if (!existsSync(nodeModulesRoot)) {
    throw new Error(`Missing workspace dependencies at ${nodeModulesRoot}. Run npm install first.`);
  }
  await mkdir(previewRoot, { recursive: true });
  const characterManifest = JSON.parse(await readFile(characterManifestPath, "utf8"));
  const characterPacks = characterManifest.packs.filter((pack) => pack.status === "motion-ready");
  const selectedPacks = selectedCharacterIds.length > 0
    ? characterPacks.filter((pack) => selectedCharacterIds.includes(pack.id))
    : characterPacks;
  const unknownCharacterIds = selectedCharacterIds.filter(
    (characterId) => !selectedPacks.some((pack) => pack.id === characterId),
  );
  if (unknownCharacterIds.length > 0) {
    throw new Error(`Unknown motion-ready character(s): ${unknownCharacterIds.join(", ")}`);
  }

  const { server, origin } = await createPreviewServer();
  const bundledChromium = chromium.executablePath();
  const systemChrome = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
  const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
    || (existsSync(bundledChromium) ? bundledChromium : null)
    || (existsSync(systemChrome) ? systemChrome : null);
  const browser = await chromium.launch({
    headless: true,
    ...(executablePath ? { executablePath } : {}),
  });
  const context = await browser.newContext({
    acceptDownloads: true,
    viewport: { width: 800, height: 1000 },
  });
  const page = await context.newPage();
  page.on("console", (message) => {
    if (message.type() === "error") console.error(`[browser] ${message.text()}`);
  });
  try {
    for (const characterPack of selectedPacks) {
      const modelPath = path.join(previewRoot, `${characterPack.id}.glb`);
      const imagePath = path.join(previewRoot, `${characterPack.id}.png`);
      if (!force && existsSync(modelPath) && existsSync(imagePath)) {
        console.log(`Keeping existing preview: ${characterPack.id}`);
        continue;
      }
      console.log(`Exporting ${characterPack.id}...`);
      const result = await exportCharacter(page, origin, characterPack, modelPath);
      await renderPoster(page, origin, characterPack.id, imagePath);
      const [modelStats, imageStats] = await Promise.all([stat(modelPath), stat(imagePath)]);
      if (modelStats.size <= 250_000) throw new Error(`${characterPack.id}.glb is unexpectedly small.`);
      if (imageStats.size <= 5_000) throw new Error(`${characterPack.id}.png is unexpectedly small.`);
      console.log(`Exported ${characterPack.id}: ${result.bytes} GLB bytes, ${imageStats.size} poster bytes`);
    }
    const provenance = await buildProvenance(characterPacks);
    await writeFile(
      path.join(previewRoot, "provenance.json"),
      `${JSON.stringify(provenance, null, 2)}\n`,
    );
  } finally {
    await context.close();
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
  console.log(`Preview catalog ready: ${characterPacks.length} characters.`);
}

await main();
