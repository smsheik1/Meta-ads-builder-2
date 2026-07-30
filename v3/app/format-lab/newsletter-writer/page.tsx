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
  const newsletter = readJson<Newsletter>("goldens/holden-brand-newsletter.json");

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

        <section data-testid="newsletter-writer-proof">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold">See the finished format</h2>
              <p className="mt-1 text-sm text-slate-600">
                Real Holden Brand proof built from its public website, with no past newsletters supplied.
              </p>
            </div>
            <Badge variant="outline">Website-only profile · low confidence</Badge>
          </div>

          <div className="mt-5 grid items-start gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(280px,0.6fr)]">
            <article
              className="overflow-hidden rounded-md border border-slate-300 bg-white shadow-sm"
              data-testid="holden-newsletter-preview"
            >
              <div className="border-b border-slate-200 bg-slate-50 px-5 py-4">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
                  Holden Brand · Newsletter proof
                </p>
                <h3 className="mt-2 text-xl font-bold">{newsletter.subjectLines[0]?.text}</h3>
                <p className="mt-1 text-sm text-slate-600">{newsletter.previewText}</p>
              </div>
              <div className="space-y-4 px-5 py-6 text-[15px] leading-7 text-slate-800">
                {newsletter.body.split("\n\n").map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
                <Button asChild className="mt-2">
                  <a href={newsletter.cta.url}>{newsletter.cta.text}</a>
                </Button>
              </div>
            </article>

            <aside className="space-y-6">
              <div>
                <h3 className="font-bold">Three distinct inbox angles</h3>
                <ol className="mt-3 space-y-2">
                  {newsletter.subjectLines.map((subject, index) => (
                    <li key={subject.text} className="rounded-md border border-slate-300 bg-white p-3 text-sm">
                      <span className="font-bold">{index + 1}. {subject.text}</span>
                      <span className="mt-1 block text-slate-500">{subject.angle}</span>
                    </li>
                  ))}
                </ol>
              </div>
              <div className="border-l-4 border-cyan-500 pl-4">
                <h3 className="font-bold">Why it works</h3>
                <ul className="mt-2 space-y-2 text-sm text-slate-700">
                  <li>Specific company history replaces generic longevity claims.</li>
                  <li>Every factual statement maps back to a Holden page.</li>
                  <li>The central argument turns history into buyer value.</li>
                  <li>One fact-and-voice review removes unsupported flourishes.</li>
                </ul>
              </div>
              <p className="text-sm text-slate-600">
                Add three to five past emails and the same workflow upgrades from a website-informed
                voice to a high-confidence newsletter voice.
              </p>
            </aside>
          </div>
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
              npm run format:newsletter -- init --run=&lt;id&gt; --brand-url=&lt;url&gt;<br />
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
