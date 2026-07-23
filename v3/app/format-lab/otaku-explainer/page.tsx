import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { OtakuFormatRepositoryClient } from "./OtakuFormatRepositoryClient";

const packagePath = path.join(process.cwd(), "public", "format-repositories", "otaku-explainer-v1");
const readText = (relativePath: string) => readFileSync(path.join(packagePath, relativePath), "utf8");
const readJson = <T,>(relativePath: string) => JSON.parse(readText(relativePath)) as T;

export const dynamic = "force-dynamic";

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

type AgentRunState = {
  id: string;
  status: string;
  attempts: Array<{
    number: number;
    status: string;
    output: string;
    contactSheet: string;
    report: string;
  }>;
  finalAttempt?: number;
};

const textFiles = [
  { id: "instructions", label: "Format instructions", path: "README.md", description: "What this Format does and how to run it." },
  { id: "agent-skill", label: "Agent skill", path: "SKILL.md", description: "The complete loop an agent follows without the user explaining the Format." },
  { id: "requirements", label: "Requirements", path: "requirements.json", description: "The key names and local tools needed, without any secret values." },
  { id: "world-naruto", label: "Naruto world pack", path: "worlds/naruto.json", description: "Lesson roles mapped to Naruto characters, voices, backgrounds, and lore." },
  { id: "world-yugioh", label: "Yu-Gi-Oh world pack", path: "worlds/yugioh.json", description: "The same lesson roles mapped to a different packaged story world." },
  { id: "world-danny", label: "Danny Phantom world pack", path: "worlds/danny-phantom.json", description: "A world pack researched and assembled by the agent from the Repo instructions." },
  { id: "layouts", label: "Approved layouts", path: "layouts.json", description: "Reusable two- and three-character positions. Scene writers do not invent coordinates." },
  { id: "inputs", label: "User inputs", path: "inputs.json", description: "The topic, story world, and cast the Format needs." },
  { id: "assets", label: "Fixed assets", path: "assets.json", description: "Character cutouts, backgrounds, source links, and local files." },
  { id: "script-prompt", label: "Script prompt", path: "prompts/script-system.md", description: "How the lesson becomes dialogue that fits the story world." },
  { id: "image-prompt", label: "Image search rules", path: "prompts/image-search.md", description: "How to find grounded backgrounds and clean character art." },
  { id: "naruto-compilers-scenes", label: "Naruto compiler scenes", path: "scenes/naruto-compilers.json", description: "The scene-by-scene plan for the close reconstruction." },
  { id: "naruto-mcp-scenes", label: "Naruto MCP scenes", path: "scenes/naruto-mcp.json", description: "The same Format teaching a new topic." },
  { id: "yugioh-compilers-scenes", label: "Yu-Gi-Oh compiler scenes", path: "scenes/yugioh-compilers.json", description: "The same lesson moved into a different story world." },
  { id: "naruto-apis-scenes", label: "Naruto API scenes", path: "scenes/naruto-apis.json", description: "The control run created by the agent from the Format instructions." },
  { id: "danny-apis-scenes", label: "Danny Phantom API scenes", path: "scenes/danny-apis.json", description: "The same API lesson moved into a world the agent researched itself." },
  { id: "renderer", label: "Renderer", path: "renderer/OtakuFormatRenderer.tsx", description: "The visual rules: moving background, characters, bubble, props, and active speaker." },
  { id: "audio", label: "Audio setup", path: "audio.json", description: "Voice IDs, Fish model, speaking speed, and music level." },
  { id: "quality", label: "Quality checks", path: "quality.json", description: "The checks every rerun should pass." },
].map((file) => ({ ...file, value: readText(file.path) }));

const runIds = ["naruto-compilers", "naruto-mcp", "yugioh-compilers", "naruto-apis", "danny-apis"];

function readAgentRuns() {
  const root = path.join(packagePath, "agent-runs");
  if (!existsSync(root)) return [];
  return readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && existsSync(path.join(root, entry.name, "state.json")))
    .map((entry) => {
      const state = JSON.parse(readFileSync(path.join(root, entry.name, "state.json"), "utf8")) as AgentRunState;
      const latest = state.attempts.at(-1);
      const reportPath = latest ? path.join(packagePath, latest.report) : "";
      return {
        id: state.id,
        status: state.status,
        attemptCount: state.attempts.length,
        finalAttempt: state.finalAttempt,
        latest: latest ? {
          videoSrc: existsSync(path.join(packagePath, latest.output)) ? `/format-repositories/otaku-explainer-v1/${latest.output}` : undefined,
          contactSheetSrc: existsSync(path.join(packagePath, latest.contactSheet)) ? `/format-repositories/otaku-explainer-v1/${latest.contactSheet}` : undefined,
          report: existsSync(reportPath) ? readFileSync(reportPath, "utf8") : undefined,
        } : undefined,
      };
    })
    .sort((a, b) => a.id.localeCompare(b.id));
}

export default function OtakuExplainerFormatPage() {
  const assets = readJson<AssetManifest>("assets.json");
  const runs = runIds.map((runId) => readJson<RunRecord>(`outputs/${runId}.run.json`));
  const agentRuns = readAgentRuns();

  return (
    <OtakuFormatRepositoryClient
      assets={[...assets.characters, ...assets.backgrounds].map((asset) => ({
        ...asset,
        src: `/format-repositories/otaku-explainer-v1/${asset.localPath}`,
      }))}
      files={textFiles}
      agentRuns={agentRuns}
      referenceVideo="/format-repositories/otaku-explainer-v1/assets/reference/reference.mp4"
      runs={runs.map((run) => ({
        ...run,
        videoSrc: `/${run.output}`,
      }))}
    />
  );
}
