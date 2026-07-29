import { readFileSync } from "node:fs";
import path from "node:path";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const packagePath = path.join(
  process.cwd(),
  "public",
  "format-repositories",
  "fortnite-filter-v1",
);
const readText = (relativePath: string) =>
  readFileSync(path.join(packagePath, relativePath), "utf8");
const readJson = <T,>(relativePath: string) =>
  JSON.parse(readText(relativePath)) as T;

type FormatManifest = {
  id: string;
  version: string;
  title: string;
  description: string;
  status: string;
};

type Pipeline = {
  progress: string;
  stages: Array<{
    id: string;
    output: string;
    paid: boolean;
    approvalRequired: boolean;
  }>;
};

type Golden = {
  id: string;
  type: string;
  title: string;
  inputPath: string | null;
  imagePath: string;
  model: string;
  whyItWorks: string[];
};

const files = [
  ["SKILL.md", "Agent instructions"],
  ["requirements.json", "Replicate BYOK requirements"],
  ["inputs.json", "Input contract and model routing"],
  ["pipeline.json", "Paid-call and resume contract"],
  ["prompts/transform.txt", "Exact gathered prompt"],
  ["quality.json", "Automatic and visual gates"],
  ["proofs.json", "Prediction provenance"],
] as const;

export default function FortniteFilterFormatPage() {
  const format = readJson<FormatManifest>("format.json");
  const pipeline = readJson<Pipeline>("pipeline.json");
  const goldens = readJson<{ purpose: string; examples: Golden[] }>("goldens.json");
  const source = goldens.examples.find((example) => example.type === "source-reference");
  const proofs = goldens.examples.filter((example) => example.type === "replicate-proof");

  return (
    <main className="min-h-screen bg-[#f4efe4] text-[#11111d]">
      <header className="border-b-2 border-[#11111d] bg-[#191936] text-white">
        <div className="mx-auto max-w-6xl px-5 py-5">
          <p className="text-sm text-indigo-200">Wiggly / Format Lab /</p>
          <div className="mt-1 flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-black">{format.id}</h1>
            <Badge className="bg-[#b7ff3c] text-[#11111d]">{format.status}</Badge>
            <span className="text-sm text-indigo-200">v{format.version}</span>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl space-y-8 px-5 py-8">
        <section className="rounded-xl border-2 border-[#11111d] bg-white p-6 shadow-[6px_6px_0_#11111d]">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div className="max-w-3xl">
              <h2 className="text-4xl font-black">{format.title}</h2>
              <p className="mt-3 text-lg font-semibold text-slate-600">{format.description}</p>
              <p className="mt-4 text-sm font-black text-indigo-700">
                One portrait in. One inspected 3:4 JPG out.
              </p>
            </div>
            <Button asChild data-testid="download-fortnite-filter-kit">
              <a
                href="/format-repositories/fortnite-filter-v1/downloads/wiggly-fortnite-filter-format-kit.zip"
                download
              >
                Download runnable kit
              </a>
            </Button>
          </div>
        </section>

        <section data-testid="fortnite-filter-proofs">
          <h2 className="text-2xl font-black">Two real Replicate proofs</h2>
          <p className="mt-1 max-w-3xl text-sm font-semibold text-slate-600">{goldens.purpose}</p>
          <div className="mt-5 grid gap-6 md:grid-cols-2">
            {proofs.map((proof) => (
              <article
                key={proof.id}
                className="overflow-hidden rounded-xl border-2 border-[#11111d] bg-white shadow-[5px_5px_0_#11111d]"
              >
                <div className="grid grid-cols-2">
                  <img
                    className="aspect-[3/4] w-full object-cover"
                    src={`/format-repositories/fortnite-filter-v1/${proof.inputPath}`}
                    alt={`Input for ${proof.title}`}
                  />
                  <img
                    className="aspect-[3/4] w-full object-cover"
                    src={`/format-repositories/fortnite-filter-v1/${proof.imagePath}`}
                    alt={`Output for ${proof.title}`}
                  />
                </div>
                <div className="p-5">
                  <Badge variant="outline">{proof.model}</Badge>
                  <h3 className="mt-3 text-2xl font-black">{proof.title}</h3>
                  <ul className="mt-3 list-disc space-y-1 pl-5 text-sm font-semibold text-slate-700">
                    {proof.whyItWorks.map((reason) => <li key={reason}>{reason}</li>)}
                  </ul>
                </div>
              </article>
            ))}
          </div>
        </section>

        {source ? (
          <section className="grid gap-6 rounded-xl border-2 border-[#11111d] bg-[#d9d7ff] p-6 md:grid-cols-[280px_1fr]">
            <img
              className="aspect-[3/4] w-full rounded-lg border-2 border-[#11111d] object-cover"
              src={`/format-repositories/fortnite-filter-v1/${source.imagePath}`}
              alt="Original @skaigenerated Fortnite Filter example"
            />
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-indigo-800">Gathered source</p>
              <h2 className="mt-2 text-3xl font-black">The exact prompt stays packaged</h2>
              <p className="mt-4 whitespace-pre-wrap rounded-lg bg-[#11111d] p-5 font-mono text-sm leading-6 text-white">
                {readText("prompts/transform.txt")}
              </p>
              <p className="mt-4 text-sm font-bold">
                Source guide: @skaigenerated · model shown: Nano Banana Pro
              </p>
            </div>
          </section>
        ) : null}

        <section data-testid="fortnite-filter-pipeline">
          <h2 className="text-2xl font-black">The official run</h2>
          <p className="mt-1 text-sm font-black text-slate-600">{pipeline.progress}</p>
          <ol className="mt-4 grid gap-4 md:grid-cols-4">
            {pipeline.stages.map((stage, index) => (
              <li key={stage.id} className="rounded-lg border-2 border-[#11111d] bg-white p-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-black">{index + 1}. {stage.id}</span>
                  <Badge variant={stage.paid ? "default" : "outline"}>
                    {stage.paid ? "paid" : "free"}
                  </Badge>
                </div>
                <p className="mt-3 text-sm font-semibold text-slate-700">{stage.output}</p>
                {stage.approvalRequired ? (
                  <p className="mt-3 text-xs font-black text-indigo-700">Explicit approval required</p>
                ) : null}
              </li>
            ))}
          </ol>
        </section>

        <section className="grid gap-5 lg:grid-cols-2">
          <article className="rounded-xl border-2 border-[#11111d] bg-white p-5">
            <h2 className="text-xl font-black">Model routes</h2>
            <ul className="mt-4 space-y-3 text-sm font-semibold text-slate-700">
              <li><strong>Economy:</strong> Nano Banana 2 Lite</li>
              <li><strong>Default:</strong> Nano Banana 2</li>
              <li><strong>Premium/source guide:</strong> Nano Banana Pro</li>
            </ul>
          </article>
          <article className="rounded-xl border-2 border-[#11111d] bg-white p-5">
            <h2 className="text-xl font-black">What prevents waste</h2>
            <ul className="mt-4 space-y-3 text-sm font-semibold text-slate-700">
              <li>The portrait validates before spending.</li>
              <li>Paid generation needs an explicit flag.</li>
              <li>The prediction ID is saved before polling.</li>
              <li>Interrupted jobs resume instead of duplicating.</li>
              <li>Three attempts is the hard cap.</li>
            </ul>
          </article>
        </section>

        <section>
          <h2 className="text-2xl font-black">Repo files</h2>
          <div className="mt-4 space-y-3">
            {files.map(([file, label]) => (
              <details key={file} className="rounded-lg border-2 border-[#11111d] bg-white p-4">
                <summary className="cursor-pointer font-black">
                  {label} <code className="ml-2 text-xs font-normal text-slate-500">{file}</code>
                </summary>
                <pre className="mt-4 max-h-96 overflow-auto whitespace-pre-wrap rounded-md bg-[#11111d] p-4 text-xs leading-5 text-white">
                  {readText(file)}
                </pre>
              </details>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
