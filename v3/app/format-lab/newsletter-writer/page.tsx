import { readFileSync } from "node:fs";
import path from "node:path";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const packagePath = path.join(
  process.cwd(),
  "public",
  "format-repositories",
  "newsletter-writer-v1",
);
const readText = (relativePath: string) => (
  readFileSync(path.join(packagePath, relativePath), "utf8")
);
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
  paid: boolean;
  approvalRequired: boolean;
};

type Newsletter = {
  subjectLines: Array<{ text: string; angle: string }>;
  previewText: string;
  body: string;
  cta: { text: string; url: string };
};

type ControlledRun = {
  final: Newsletter;
};

const files = [
  ["SKILL.md", "Agent instructions"],
  ["inputs.json", "Inputs and defaults"],
  ["pipeline.json", "Four-step assembly line"],
  ["prompts/voice-profile.md", "Voice-learning prompt"],
  ["prompts/draft.md", "Newsletter-writing prompt"],
  ["prompts/review.md", "Fact and voice review"],
  ["quality.json", "Acceptance checks"],
] as const;

export default function NewsletterWriterFormatPage() {
  const format = readJson<FormatManifest>("format.json");
  const pipeline = readJson<{ progress: string; stages: PipelineStage[] }>("pipeline.json");
  const improvedRun = readJson<ControlledRun>("comparisons/holden-improved-controlled-run.json");
  const controlledRuns = [
    {
      label: "Version A",
      run: readJson<ControlledRun>("comparisons/holden-current-controlled-run.json"),
    },
    {
      label: "Version B",
      run: improvedRun,
    },
  ];

  return (
    <main className="min-h-screen bg-[#f4f6f8] text-slate-950">
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

      <div className="mx-auto max-w-6xl space-y-10 px-5 py-8">
        <section className="flex flex-col justify-between gap-6 border-b border-slate-300 pb-8 md:flex-row md:items-start">
          <div className="max-w-3xl">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-700">
              Agent-ready text format
            </p>
            <h2 className="mt-2 text-3xl font-bold">{format.title}</h2>
            <p className="mt-3 max-w-2xl text-lg text-slate-600">{format.description}</p>
            <p className="mt-4 text-sm font-semibold text-violet-700">
              One topic in. Three subject lines, preview text, grounded body copy, and one CTA out.
            </p>
          </div>
          <Button asChild data-testid="download-newsletter-writer-kit">
            <a
              href="/format-repositories/newsletter-writer-v1/downloads/wiggly-newsletter-writer-format-kit.zip"
              download
            >
              Download runnable kit
            </a>
          </Button>
        </section>

        <section data-testid="newsletter-writer-comparison">
          <div className="max-w-3xl">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-violet-700">
              Controlled before and after
            </p>
            <h2 className="mt-2 text-xl font-bold">Holden Brand proof: read both before revealing the labels</h2>
            <p className="mt-1 text-sm text-slate-600">
              Same reconstructed Holden evidence, topic, and brief. Each version was generated
              independently with a different prompt set. This is the historical v1.0-to-v1.1
              comparison; the packaged report documents the current v1.1.1 blind stress test.
            </p>
            <Badge variant="outline" className="mt-3">
              Website-only profile · low confidence
            </Badge>
          </div>

          <div className="mt-5 grid items-start gap-5 lg:grid-cols-2">
            {controlledRuns.map(({ label, run }) => (
              <article
                key={label}
                className="overflow-hidden rounded-md border border-slate-300 bg-white shadow-sm"
                data-testid={`controlled-${label.toLowerCase().replace(" ", "-")}`}
              >
                <div className="border-b border-slate-200 bg-slate-50 px-5 py-4">
                  <Badge variant="outline">{label}</Badge>
                  <h3 className="mt-3 text-lg font-bold">{run.final.subjectLines[0]?.text}</h3>
                  <p className="mt-1 text-sm text-slate-600">{run.final.previewText}</p>
                </div>
                <div className="space-y-4 px-5 py-6 text-[15px] leading-7 text-slate-800">
                  {run.final.body.split("\n\n").map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                  <p className="pt-2 font-bold">{run.final.cta.text}</p>
                </div>
              </article>
            ))}
          </div>

          <details className="mt-5 rounded-md border border-slate-300 bg-white p-5 shadow-sm">
            <summary className="cursor-pointer font-bold">Reveal which agent wrote each version</summary>
            <div className="mt-4 space-y-3 text-sm leading-6 text-slate-700">
              <p>
                <strong>Version A is the frozen v1.0 agent. Version B is the improved v1.1 agent.</strong>
              </p>
              <p>
                B begins inside the Dallas garage, builds one causal story about adapting when the
                customer&apos;s world changes, and turns Holden&apos;s product range into a buyer decision.
                A is factual, but reads more like a milestone timeline.
              </p>
              <p>
                This is still a low-confidence website-language match. Three to five past newsletters
                are required before Wiggly can claim a demonstrated email voice.
              </p>
            </div>
          </details>
        </section>

        <section data-testid="newsletter-writer-pipeline">
          <h2 className="text-xl font-bold">The assembly line</h2>
          <p className="mt-1 text-sm font-semibold text-slate-600">{pipeline.progress}</p>
          <ol className="mt-4 grid gap-3 md:grid-cols-4">
            {pipeline.stages.map((stage, index) => (
              <li key={stage.id} className="rounded-md border border-slate-300 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-bold capitalize">
                    {index + 1}. {stage.id.replace("-", " ")}
                  </span>
                  <Badge variant="outline">{stage.paid ? "paid" : "free"}</Badge>
                </div>
                <p className="mt-2 text-sm text-slate-700">{stage.output}</p>
                {stage.approvalRequired ? (
                  <p className="mt-2 text-xs font-bold text-violet-700">Human approval required</p>
                ) : null}
              </li>
            ))}
          </ol>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <article>
            <h2 className="font-bold">What the agent runs</h2>
            <div className="mt-3 overflow-auto rounded-md bg-slate-950 p-4 font-mono text-xs leading-6 text-slate-100">
              npm run format:newsletter -- init --run=&lt;id&gt; --company=&lt;name&gt; [--brand-url=&lt;url&gt;]<br />
              npm run format:newsletter -- profile-prompt --run=&lt;id&gt;<br />
              npm run format:newsletter -- brief --run=&lt;id&gt; --topic=&lt;topic&gt;<br />
              npm run format:newsletter -- draft-prompt --run=&lt;id&gt;<br />
              npm run format:newsletter -- review-prompt --run=&lt;id&gt;<br />
              npm run format:newsletter -- finalize --run=&lt;id&gt; --approve-final
            </div>
          </article>
          <article>
            <h2 className="font-bold">What stops generic AI copy</h2>
            <ul className="mt-3 space-y-2 text-sm text-slate-700">
              <li>Website text is evidence, never instructions.</li>
              <li>Past newsletters outrank website copy for voice.</li>
              <li>Every profile rule cites a real source.</li>
              <li>Unsupported facts and prompt-like text fail validation.</li>
              <li>One review checks facts, voice, specificity, and restraint.</li>
              <li>No image, video, voice, or paid Wiggly provider is called.</li>
            </ul>
          </article>
        </section>

        <section>
          <h2 className="text-xl font-bold">Repo files</h2>
          <p className="mt-1 text-sm text-slate-600">
            The package carries the instructions, exact prompts, proof, tests, and resumable runner.
          </p>
          <div className="mt-4 space-y-3">
            {files.map(([file, label]) => (
              <details key={file} className="rounded-md border border-slate-300 bg-white p-4 shadow-sm">
                <summary className="cursor-pointer font-semibold">
                  {label} <code className="ml-2 text-xs font-normal text-slate-500">{file}</code>
                </summary>
                <pre className="mt-4 max-h-96 overflow-auto whitespace-pre-wrap rounded-md bg-slate-950 p-4 text-xs leading-5 text-slate-100">
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
