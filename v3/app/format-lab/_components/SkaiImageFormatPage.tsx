import { readFileSync } from "node:fs";
import path from "node:path";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type FormatManifest = {
  id: string;
  version: string;
  title: string;
  description: string;
  status: string;
  source: {
    creator: string;
    postUrl: string;
    resourceUrl?: string;
    modelShown: string;
  };
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

type Runtime = {
  input: { mode: "none" | "image" };
  expectedOutputs: number;
  promptPath: string;
  promptVariants?: Record<string, string>;
  modelRoutes: Record<string, {
    label: string;
    lane: string;
    aspectRatio: string;
  }>;
};

type Golden = {
  id: string;
  title: string;
  imagePath: string;
  model: string;
  whyItWorks: string[];
};

const repoFilesBeforePrompts = [
  ["SKILL.md", "Agent instructions"],
  ["requirements.json", "Replicate BYOK requirements"],
  ["inputs.json", "Input contract and model routing"],
  ["pipeline.json", "Paid-call and resume contract"],
] as const;

const repoFilesAfterPrompts = [
  ["quality.json", "Automatic and visual gates"],
] as const;

export function SkaiImageFormatPage({ slug }: { slug: string }) {
  const repository = `${slug}-v1`;
  const packagePath = path.join(
    process.cwd(),
    "public",
    "format-repositories",
    repository,
  );
  const readText = (relativePath: string) =>
    readFileSync(path.join(packagePath, relativePath), "utf8");
  const readJson = <T,>(relativePath: string) =>
    JSON.parse(readText(relativePath)) as T;
  const format = readJson<FormatManifest>("format.json");
  const pipeline = readJson<Pipeline>("pipeline.json");
  const runtime = readJson<Runtime>("runtime.json");
  const goldens = readJson<{ purpose: string; examples: Golden[] }>("goldens.json");
  const prompts = Object.entries(
    runtime.promptVariants ?? { default: runtime.promptPath },
  );
  const repoFiles = [
    ...repoFilesBeforePrompts,
    ...prompts.map(([variant, promptPath]) => [
      promptPath,
      prompts.length === 1
        ? "Exact gathered prompt"
        : `Exact ${variant.replaceAll("-", " ")} prompt`,
    ] as const),
    ...repoFilesAfterPrompts,
  ];
  const outputNoun = runtime.expectedOutputs === 1 ? "image" : "images";

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
                {runtime.input.mode === "image" ? "One source image" : "One exact concept"} in.{" "}
                {prompts.length > 1
                  ? `${prompts.length} selectable scenes; one inspected image per selected scene.`
                  : `${runtime.expectedOutputs} inspected ${outputNoun} out.`}
              </p>
            </div>
            <Button asChild data-testid={`download-${slug}-kit`}>
              <a
                href={`/format-repositories/${repository}/downloads/wiggly-${slug}-format-kit.zip`}
                download
              >
                Download runnable kit
              </a>
            </Button>
          </div>
        </section>

        <section data-testid={`${slug}-source-proof`}>
          <h2 className="text-2xl font-black">Gathered source proof</h2>
          <p className="mt-1 max-w-3xl text-sm font-semibold text-slate-600">{goldens.purpose}</p>
          <div className="mt-5 grid gap-6 md:grid-cols-2">
            {goldens.examples.map((example) => (
              <article
                key={example.id}
                className="overflow-hidden rounded-xl border-2 border-[#11111d] bg-white shadow-[5px_5px_0_#11111d]"
              >
                <img
                  className="aspect-[4/5] w-full object-cover"
                  src={`/format-repositories/${repository}/${example.imagePath}`}
                  alt={example.title}
                />
                <div className="p-5">
                  <Badge variant="outline">{example.model}</Badge>
                  <h3 className="mt-3 text-2xl font-black">{example.title}</h3>
                  <ul className="mt-3 list-disc space-y-1 pl-5 text-sm font-semibold text-slate-700">
                    {example.whyItWorks.map((reason) => <li key={reason}>{reason}</li>)}
                  </ul>
                </div>
              </article>
            ))}
            <article className="rounded-xl border-2 border-[#11111d] bg-[#d9d7ff] p-6">
              <p className="text-xs font-black uppercase tracking-widest text-indigo-800">
                Exact gathered {prompts.length === 1 ? "prompt" : "prompts"}
              </p>
              {prompts.length === 1 ? (
                <p className="mt-4 whitespace-pre-wrap rounded-lg bg-[#11111d] p-5 font-mono text-sm leading-6 text-white">
                  {readText(prompts[0][1])}
                </p>
              ) : (
                <div className="mt-4 space-y-3">
                  {prompts.map(([variant, promptPath], index) => (
                    <details
                      key={variant}
                      open={index === 0}
                      className="rounded-lg bg-[#11111d] p-4 text-white"
                    >
                      <summary className="cursor-pointer font-black capitalize">
                        {variant.replaceAll("-", " ")}
                      </summary>
                      <p className="mt-4 whitespace-pre-wrap font-mono text-sm leading-6">
                        {readText(promptPath)}
                      </p>
                    </details>
                  ))}
                </div>
              )}
              <p className="mt-4 text-sm font-bold">
                Source: {format.source.creator} · model shown: {format.source.modelShown}
              </p>
              <div className="mt-4 flex flex-wrap gap-3 text-sm font-black text-indigo-800">
                <a href={format.source.postUrl}>Instagram post</a>
                {format.source.resourceUrl ? <a href={format.source.resourceUrl}>Source guide</a> : null}
              </div>
            </article>
          </div>
        </section>

        <section data-testid={`${slug}-pipeline`}>
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
              {Object.values(runtime.modelRoutes).map((route) => (
                <li key={`${route.lane}-${route.label}`}>
                  <strong>{route.lane}:</strong> {route.label} · {route.aspectRatio}
                </li>
              ))}
            </ul>
          </article>
          <article className="rounded-xl border-2 border-[#11111d] bg-white p-5">
            <h2 className="text-xl font-black">What prevents waste</h2>
            <ul className="mt-4 space-y-3 text-sm font-semibold text-slate-700">
              <li>The complete contract validates locally before spending.</li>
              <li>Paid generation needs an explicit approval flag.</li>
              <li>The prediction ID is saved before polling.</li>
              <li>Interrupted jobs resume instead of duplicating.</li>
              <li>Three attempts is the hard cap.</li>
            </ul>
          </article>
        </section>

        <section>
          <h2 className="text-2xl font-black">Repo files</h2>
          <div className="mt-4 space-y-3">
            {repoFiles.map(([file, label]) => (
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
