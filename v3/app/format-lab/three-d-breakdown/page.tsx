import { readFileSync } from "node:fs";
import path from "node:path";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const packagePath = path.join(process.cwd(), "public", "format-repositories", "three-d-breakdown-v1");
const readText = (relativePath: string) => readFileSync(path.join(packagePath, relativePath), "utf8");
const readJson = <T,>(relativePath: string) => JSON.parse(readText(relativePath)) as T;

type FormatManifest = {
  id: string;
  version: string;
  title: string;
  description: string;
  status: string;
};

type PipelineStage = {
  id: string;
  output: string;
  paidMedia: boolean;
  approvalRequired: boolean;
  enabled?: boolean;
  oneCallAtATime?: boolean;
};

const files = [
  ["SKILL.md", "Agent instructions"],
  ["requirements.json", "Requirements"],
  ["inputs.json", "Inputs"],
  ["pipeline.json", "Pipeline"],
  ["scene-contract.json", "Scene contract"],
  ["assets.json", "Assets"],
  ["quality.json", "Quality checks"],
] as const;

export default function ThreeDBreakdownRepositoryPage() {
  const format = readJson<FormatManifest>("format.json");
  const pipeline = readJson<{ stages: PipelineStage[] }>("pipeline.json");

  return (
    <main className="min-h-screen bg-[#f6f8fa] text-slate-950">
      <header className="border-b border-slate-800 bg-slate-950 text-white">
        <div className="mx-auto max-w-6xl px-5 py-5">
          <p className="text-sm text-slate-400">Wiggly / Format Lab /</p>
          <div className="mt-1 flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold">{format.id}</h1>
            <Badge variant="secondary">{format.status}</Badge>
            <span className="text-sm text-slate-400">v{format.version}</span>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl space-y-7 px-5 py-7">
        <section className="rounded-xl border border-slate-300 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div className="max-w-3xl">
              <h2 className="text-2xl font-bold">{format.title}</h2>
              <p className="mt-2 text-slate-600">{format.description}</p>
            </div>
            <Button asChild data-testid="download-three-d-format-kit">
              <a href="/format-repositories/three-d-breakdown-v1/downloads/wiggly-three-d-breakdown-format-kit.zip" download>
                Download runnable kit
              </a>
            </Button>
          </div>
          <div className="mt-5 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950" data-testid="video-phase-boundary">
            <strong>Clip checkpoint:</strong> planning, storyboard images, production anchors, and two approved video clips are available. Voice generation and final composition remain locked.
          </div>
        </section>

        <section>
          <h2 className="text-xl font-bold">The assembly line</h2>
          <p className="mt-1 text-sm text-slate-600">Every paid media step is visible and waits for a human.</p>
          <ol className="mt-4 grid gap-3 md:grid-cols-2">
            {pipeline.stages.map((stage, index) => (
              <li key={stage.id} className="rounded-lg border border-slate-300 bg-white p-4 shadow-sm" data-testid={`pipeline-${stage.id}`}>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-bold">{index + 1}. {stage.id}</span>
                  <Badge variant={stage.enabled === false ? "outline" : stage.paidMedia ? "secondary" : "default"}>
                    {stage.enabled === false ? "locked" : stage.paidMedia ? "paid media" : "planning"}
                  </Badge>
                </div>
                <p className="mt-2 text-sm text-slate-700">{stage.output}</p>
                {stage.oneCallAtATime ? <p className="mt-2 text-xs font-semibold text-violet-700">One manual call at a time</p> : null}
              </li>
            ))}
          </ol>
        </section>

        <section className="grid gap-5 lg:grid-cols-[360px_minmax(0,1fr)]">
          <article className="rounded-lg border border-slate-300 bg-white p-4 shadow-sm">
            <h2 className="font-bold">Fixed Style B reference</h2>
            <p className="mt-1 text-sm text-slate-600">The visual master reused by the existing Wiggly pipeline and this Repo runner.</p>
            <Image
              alt="3D Breakdown Style B reference"
              className="mt-4 h-auto w-full rounded-md border border-slate-200"
              height={1024}
              src="/format-repositories/three-d-breakdown-v1/assets/ecommerce-teardown-style-reference-clean-v7.jpg"
              width={576}
            />
          </article>
          <article className="rounded-lg border border-slate-300 bg-white p-4 shadow-sm">
            <h2 className="font-bold">What the agent receives</h2>
            <ul className="mt-3 grid gap-2 text-sm text-slate-700">
              <li>One Format skill explaining the exact loop and stopping rule.</li>
              <li>BYOK requirements that report key names without exposing values.</li>
              <li>The same story directors, prompt builders, scene validator, and renderer source used by Wiggly.</li>
              <li>A free smoke test and a fixture that prove the Style B contract without calling a provider.</li>
                <li>A local runner that permits one explicitly approved image or video clip at a time.</li>
            </ul>
            <div className="mt-4 rounded-md bg-slate-950 p-4 font-mono text-xs leading-6 text-slate-100">
              npm run format:three-d -- check --stage=plan<br />
              npm run format:three-d -- validate --run=&lt;run-id&gt;<br />
              npm run format:three-d -- inspect --run=&lt;run-id&gt;
            </div>
          </article>
        </section>

        <section>
          <h2 className="text-xl font-bold">Repo files</h2>
          <p className="mt-1 text-sm text-slate-600">These are the instructions and contracts an agent reads before it acts.</p>
          <div className="mt-4 space-y-3">
            {files.map(([file, label]) => (
              <details key={file} className="rounded-lg border border-slate-300 bg-white p-4 shadow-sm">
                <summary className="cursor-pointer font-semibold">{label} <code className="ml-2 text-xs font-normal text-slate-500">{file}</code></summary>
                <pre className="mt-4 max-h-96 overflow-auto whitespace-pre-wrap rounded-md bg-slate-950 p-4 text-xs leading-5 text-slate-100">{readText(file)}</pre>
              </details>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
