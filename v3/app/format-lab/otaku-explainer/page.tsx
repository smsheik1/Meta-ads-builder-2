import { readFileSync } from "node:fs";
import path from "node:path";
import { OtakuFormatRepositoryClient } from "./OtakuFormatRepositoryClient";

const packagePath = path.join(process.cwd(), "public", "format-repositories", "otaku-explainer-v1");
const readText = (relativePath: string) => readFileSync(path.join(packagePath, relativePath), "utf8");
const readJson = <T,>(relativePath: string) => JSON.parse(readText(relativePath)) as T;

type AssetManifest = {
  characters: Array<{ id: string; label: string; localPath: string }>;
  backgrounds: Array<{ id: string; label: string; localPath: string }>;
};

type RunRecord = {
  id: string;
  title: string;
  input: { topic: string; storyWorld: string; cast: string[] };
  provider: string;
  model: string;
  voiceAssignments: Record<string, string>;
  output: string;
  scenes: unknown[];
};

const textFiles = [
  { id: "instructions", label: "Format instructions", path: "README.md", description: "What this Format does and how to run it." },
  { id: "inputs", label: "User inputs", path: "inputs.json", description: "The topic, story world, and cast the Format needs." },
  { id: "assets", label: "Fixed assets", path: "assets.json", description: "Character cutouts, backgrounds, source links, and local files." },
  { id: "script-prompt", label: "Script prompt", path: "prompts/script-system.md", description: "How the lesson becomes dialogue that fits the story world." },
  { id: "image-prompt", label: "Image search rules", path: "prompts/image-search.md", description: "How to find grounded backgrounds and clean character art." },
  { id: "naruto-compilers-scenes", label: "Naruto compiler scenes", path: "scenes/naruto-compilers.json", description: "The scene-by-scene plan for the close reconstruction." },
  { id: "naruto-mcp-scenes", label: "Naruto MCP scenes", path: "scenes/naruto-mcp.json", description: "The same Format teaching a new topic." },
  { id: "yugioh-compilers-scenes", label: "Yu-Gi-Oh compiler scenes", path: "scenes/yugioh-compilers.json", description: "The same lesson moved into a different story world." },
  { id: "renderer", label: "Renderer", path: "renderer/OtakuFormatRenderer.tsx", description: "The visual rules: moving background, characters, bubble, props, and active speaker." },
  { id: "audio", label: "Audio setup", path: "audio.json", description: "Voice IDs, Fish model, speaking speed, and music level." },
  { id: "quality", label: "Quality checks", path: "quality.json", description: "The checks every rerun should pass." },
].map((file) => ({ ...file, value: readText(file.path) }));

const runIds = ["naruto-compilers", "naruto-mcp", "yugioh-compilers"];

export default function OtakuExplainerFormatPage() {
  const assets = readJson<AssetManifest>("assets.json");
  const runs = runIds.map((runId) => readJson<RunRecord>(`outputs/${runId}.run.json`));

  return (
    <OtakuFormatRepositoryClient
      assets={[...assets.characters, ...assets.backgrounds].map((asset) => ({
        ...asset,
        src: `/format-repositories/otaku-explainer-v1/${asset.localPath}`,
      }))}
      files={textFiles}
      referenceVideo="/format-repositories/otaku-explainer-v1/assets/reference/reference.mp4"
      runs={runs.map((run) => ({
        ...run,
        videoSrc: `/${run.output}`,
      }))}
    />
  );
}
