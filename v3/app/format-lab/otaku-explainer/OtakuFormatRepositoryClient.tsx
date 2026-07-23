"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type EditableFile = {
  id: string;
  label: string;
  path: string;
  description: string;
  value: string;
};

type Asset = { id: string; label: string; localPath: string; src: string };

type Run = {
  id: string;
  title: string;
  input: { topic: string; storyWorld: string; cast: string[] };
  provider: string;
  model: string;
  voiceAssignments: Record<string, string>;
  scenes: unknown[];
  videoSrc: string;
};

type AgentRun = {
  id: string;
  status: string;
  attemptCount: number;
  finalAttempt?: number;
  latest?: {
    videoSrc?: string;
    contactSheetSrc?: string;
    report?: string;
  };
};

type FormatManifest = {
  id: string;
  version: string;
  title: string;
  description: string;
  status: string;
};

const componentLinks = [
  ["agent-loop", "Agent loop"],
  ["instructions", "Instructions"],
  ["user-inputs", "User inputs"],
  ["fixed-assets", "Fixed assets"],
  ["ai-content", "AI content"],
  ["scene-slots", "Scene slots"],
  ["renderer", "Renderer"],
  ["audio", "Audio"],
  ["quality", "Quality checks"],
  ["outputs", "Final output"],
] as const;

export function OtakuFormatRepositoryClient({
  agentRuns,
  assets,
  downloadUrl,
  files,
  format,
  referenceVideo,
  runs,
}: {
  agentRuns: AgentRun[];
  assets: Asset[];
  downloadUrl: string;
  files: EditableFile[];
  format: FormatManifest;
  referenceVideo: string;
  runs: Run[];
}) {
  const [fileValues, setFileValues] = useState<Record<string, string | null>>(
    () => Object.fromEntries(files.map((file) => [file.id, file.value])) as Record<string, string>,
  );
  const [editing, setEditing] = useState<Record<string, boolean>>({});
  const [assetValues, setAssetValues] = useState<Record<string, string | null>>(() => Object.fromEntries(assets.map((asset) => [asset.id, asset.src])));
  const [outputValues, setOutputValues] = useState<Record<string, boolean>>(() => Object.fromEntries(runs.map((run) => [run.id, true])));
  const [copied, setCopied] = useState(false);

  const dirtyTextFiles = files.filter((file) => fileValues[file.id] !== file.value).length;
  const dirtyAssets = assets.filter((asset) => assetValues[asset.id] !== asset.src).length;
  const dirtyOutputs = runs.filter((run) => !outputValues[run.id]).length;
  const dirtyCount = dirtyTextFiles + dirtyAssets + dirtyOutputs;
  const needsRerun = dirtyTextFiles + dirtyAssets > 0;
  const worldFiles = files.filter((candidate) => candidate.id.startsWith("world-"));
  const sceneFiles = files.filter((candidate) => candidate.id.startsWith("scene-"));
  const statusText = needsRerun
    ? `Needs rerun · ${dirtyCount} change${dirtyCount === 1 ? "" : "s"}`
    : dirtyOutputs > 0
      ? `Local draft · ${dirtyOutputs} output${dirtyOutputs === 1 ? "" : "s"} deleted`
      : "Matches saved runs";

  const file = (id: string) => files.find((candidate) => candidate.id === id)!;

  const updateFile = (id: string, value: string | null) => {
    setFileValues((current) => ({ ...current, [id]: value }));
  };

  const renderFile = (id: string) => {
    const definition = file(id);
    const value = fileValues[id];
    const isEditing = editing[id];
    return (
      <article className="rounded-lg border border-slate-300 bg-white p-4 shadow-sm" data-testid={`file-${id}`}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="font-semibold text-slate-950">{definition.label}</h3>
            <p className="mt-1 text-sm text-slate-600">{definition.description}</p>
            <code className="mt-2 block text-xs text-slate-500">{definition.path}</code>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={() => setEditing((current) => ({ ...current, [id]: !current[id] }))}>
              {isEditing ? "Close editor" : "Edit"}
            </Button>
            <Button size="sm" variant="outline" onClick={() => updateFile(id, value === null ? definition.value : null)}>
              {value === null ? "Restore" : "Delete"}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => updateFile(id, definition.value)}>Reset</Button>
          </div>
        </div>
        {value === null ? (
          <p className="mt-4 rounded-md border border-dashed border-rose-300 bg-rose-50 p-4 text-sm text-rose-800">Deleted from this local draft.</p>
        ) : isEditing ? (
          <Textarea
            aria-label={`Edit ${definition.label}`}
            className="mt-4 min-h-72 font-mono text-xs leading-5"
            value={value}
            onChange={(event) => updateFile(id, event.target.value)}
          />
        ) : (
          <pre className="mt-4 max-h-64 overflow-auto whitespace-pre-wrap rounded-md bg-slate-950 p-4 text-xs leading-5 text-slate-100">{value}</pre>
        )}
      </article>
    );
  };

  const copyRerunCommand = async () => {
    await navigator.clipboard.writeText("npm run prototype:otaku -- validate --run=<run-id>\nnpm run prototype:otaku -- render --run=<run-id> --approve-loop\nnpm run prototype:otaku -- inspect --run=<run-id>\nnpm run prototype:otaku -- finalize --run=<run-id>");
    setCopied(true);
  };

  return (
    <main className="min-h-screen bg-[#f6f8fa] text-slate-900">
      <header className="border-b border-slate-300 bg-slate-950 text-white">
        <div className="mx-auto max-w-7xl px-5 py-4">
          <p className="text-sm text-slate-400">Wiggly / Format Lab /</p>
          <div className="mt-1 flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold">{format.id}</h1>
            <Badge variant="secondary">{format.status}</Badge>
            <span className="text-sm text-slate-400">v{format.version}</span>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-6 px-5 py-6 lg:grid-cols-[220px_minmax(0,1fr)]">
        <aside className="h-fit rounded-lg border border-slate-300 bg-white p-3 lg:sticky lg:top-5">
          <p className="px-2 pb-2 text-xs font-bold uppercase tracking-wider text-slate-500">Format files</p>
          <nav className="grid gap-1" aria-label="Format components">
            {componentLinks.map(([href, label], index) => (
              <a key={href} href={`#${href}`} className="rounded-md px-2 py-2 text-sm hover:bg-slate-100">
                <span className="mr-2 text-slate-400">{index + 1}.</span>{label}
              </a>
            ))}
          </nav>
        </aside>

        <div className="min-w-0 space-y-8">
          <section className="rounded-lg border border-slate-300 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="max-w-3xl">
                <h2 className="text-xl font-bold">{format.title}</h2>
                <p className="mt-2 text-slate-600">{format.description}</p>
              </div>
              <Badge className={needsRerun || dirtyOutputs > 0 ? "bg-amber-500 text-black" : "bg-emerald-600"} data-testid="rerun-status">
                {statusText}
              </Badge>
            </div>
            <div className="mt-5 flex flex-wrap items-center justify-between gap-4 rounded-md border border-violet-300 bg-violet-50 p-4">
              <div className="max-w-2xl">
                <h3 className="font-bold text-violet-950">Give an agent the working Format—not screenshots of it</h3>
                <p className="mt-1 text-sm text-violet-900">
                  The kit contains the renderer, runner, rules, layouts, and assets. Unzip it and tell Claude or Codex to read <code>SKILL.md</code>. It must use the packaged renderer, not rebuild one.
                </p>
              </div>
              <Button asChild data-testid="download-format-kit">
                <a href={downloadUrl} download>Download runnable Format Kit</a>
              </Button>
            </div>
            {needsRerun && (
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950">
                <span>Your draft changed. The saved videos stay honest until you rerun the Format.</span>
                <Button size="sm" variant="outline" onClick={copyRerunCommand}>{copied ? "Copied" : "Copy rerun commands"}</Button>
              </div>
            )}
          </section>

          <section id="agent-loop" className="scroll-mt-5 space-y-4">
            <div>
              <h2 className="text-xl font-bold">1. Agent loop</h2>
              <p className="mt-1 text-sm text-slate-600">Claude or Codex can download this package, use its existing renderer, check what is missing, plan a lesson, render it, inspect it, and improve it up to two times.</p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <article className="rounded-lg border border-slate-300 bg-white p-4 shadow-sm">
                <h3 className="font-semibold">What it needs</h3>
                <ul className="mt-3 grid gap-2 text-sm text-slate-700">
                  <li><code>FISH_STUDIO_APIKEY</code> in <code>v3/.env.local</code></li>
                  <li>Node, FFmpeg, FFprobe, and Remotion installed locally</li>
                  <li>Serper only when a new story world needs assets</li>
                </ul>
              </article>
              <article className="rounded-lg border border-slate-300 bg-white p-4 shadow-sm">
                <h3 className="font-semibold">What it will not use</h3>
                <p className="mt-3 text-sm text-slate-700">No OpenRouter planner, Replicate, GPU, image generation, or video generation. Secret values never enter the Format files or reports.</p>
              </article>
            </div>
            {renderFile("agent-skill")}
            {renderFile("requirements")}
            {worldFiles.map((worldFile) => <div key={worldFile.id}>{renderFile(worldFile.id)}</div>)}
            {renderFile("layouts")}
          </section>

          <section className="grid gap-5 md:grid-cols-2">
            <div className="rounded-lg border border-slate-300 bg-white p-4 shadow-sm">
              <h2 className="font-bold">Original reference</h2>
              <video className="mt-3 aspect-[9/16] max-h-[620px] w-full rounded-md bg-black object-contain" controls preload="metadata" src={referenceVideo} />
            </div>
            <div className="rounded-lg border border-slate-300 bg-white p-4 shadow-sm">
              <h2 className="font-bold">What this proves</h2>
              <ol className="mt-4 grid gap-3 text-sm">
                <li className="rounded-md bg-slate-100 p-3"><strong>Rebuild:</strong> Recreate the reference format with a reusable scene contract.</li>
                <li className="rounded-md bg-slate-100 p-3"><strong>New topic:</strong> Teach a different lesson without changing the renderer.</li>
                <li className="rounded-md bg-slate-100 p-3"><strong>New world:</strong> Research and package different characters without adding world-specific code.</li>
              </ol>
            </div>
          </section>

          <section id="instructions" className="scroll-mt-5 space-y-3">
            <h2 className="text-xl font-bold">2. Instructions</h2>
            {renderFile("instructions")}
          </section>

          <section id="user-inputs" className="scroll-mt-5 space-y-3">
            <h2 className="text-xl font-bold">3. User inputs</h2>
            {renderFile("inputs")}
          </section>

          <section id="fixed-assets" className="scroll-mt-5 space-y-3">
            <h2 className="text-xl font-bold">4. Fixed assets</h2>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {assets.map((asset) => {
                const src = assetValues[asset.id];
                return (
                  <article key={asset.id} className="rounded-lg border border-slate-300 bg-white p-3 shadow-sm" data-testid={`asset-${asset.id}`}>
                    {src ? <img className="aspect-video w-full rounded-md bg-slate-100 object-contain" src={src} alt={asset.label} /> : <div className="grid aspect-video place-items-center rounded-md border border-dashed border-rose-300 bg-rose-50 text-sm text-rose-800">Deleted</div>}
                    <h3 className="mt-3 font-semibold">{asset.label}</h3>
                    <code className="block truncate text-xs text-slate-500">{asset.localPath}</code>
                    <Input
                      aria-label={`Replace ${asset.label}`}
                      className="mt-3 h-auto py-2"
                      type="file"
                      accept="image/*"
                      onChange={(event) => {
                        const replacement = event.target.files?.[0];
                        if (replacement) setAssetValues((current) => ({ ...current, [asset.id]: URL.createObjectURL(replacement) }));
                      }}
                    />
                    <div className="mt-2 flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => setAssetValues((current) => ({ ...current, [asset.id]: src ? null : asset.src }))}>{src ? "Delete" : "Restore"}</Button>
                      <Button size="sm" variant="ghost" onClick={() => setAssetValues((current) => ({ ...current, [asset.id]: asset.src }))}>Reset</Button>
                    </div>
                  </article>
                );
              })}
            </div>
            {renderFile("assets")}
          </section>

          <section id="ai-content" className="scroll-mt-5 space-y-3">
            <h2 className="text-xl font-bold">5. AI-generated content</h2>
            {renderFile("script-prompt")}
            {renderFile("image-prompt")}
          </section>

          <section id="scene-slots" className="scroll-mt-5 space-y-3">
            <h2 className="text-xl font-bold">6. Scene slots</h2>
            {sceneFiles.map((sceneFile) => <div key={sceneFile.id}>{renderFile(sceneFile.id)}</div>)}
          </section>

          <section id="renderer" className="scroll-mt-5 space-y-3">
            <h2 className="text-xl font-bold">7. Renderer</h2>
            {renderFile("renderer")}
          </section>

          <section id="audio" className="scroll-mt-5 space-y-3">
            <h2 className="text-xl font-bold">8. Audio</h2>
            {renderFile("audio")}
          </section>

          <section id="quality" className="scroll-mt-5 space-y-3">
            <h2 className="text-xl font-bold">9. Quality checks</h2>
            {renderFile("quality")}
          </section>

          <section id="outputs" className="scroll-mt-5 space-y-4">
            <h2 className="text-xl font-bold">10. Final output</h2>
            <div className="grid gap-5 xl:grid-cols-3">
              {runs.map((run) => (
                <article key={run.id} className="rounded-lg border border-slate-300 bg-white p-4 shadow-sm" data-testid={`run-${run.id}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-bold">{run.title}</h3>
                      <p className="mt-1 text-sm text-slate-600">{run.input.storyWorld} · {run.scenes.length} scenes</p>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => setOutputValues((current) => ({ ...current, [run.id]: !current[run.id] }))}>
                      {outputValues[run.id] ? "Delete" : "Restore"}
                    </Button>
                  </div>
                  {outputValues[run.id] ? (
                    <video className="mt-3 aspect-[9/16] w-full rounded-md bg-black object-contain" controls preload="metadata" src={run.videoSrc} />
                  ) : (
                    <div className="mt-3 grid aspect-[9/16] place-items-center rounded-md border border-dashed border-rose-300 bg-rose-50 text-sm text-rose-800">Output deleted from this local draft.</div>
                  )}
                  <dl className="mt-3 grid gap-2 text-xs">
                    <div><dt className="font-bold">Topic</dt><dd>{run.input.topic}</dd></div>
                    <div><dt className="font-bold">Cast</dt><dd>{run.input.cast.join(", ")}</dd></div>
                    <div><dt className="font-bold">Voice model</dt><dd>{run.provider} / {run.model}</dd></div>
                  </dl>
                </article>
              ))}
            </div>
            <div className="space-y-3 pt-4">
              <div>
                <h3 className="text-lg font-bold">Agent runs</h3>
                <p className="mt-1 text-sm text-slate-600">Drafts, the latest contact sheet, quality report, and final video appear here after refresh.</p>
              </div>
              {agentRuns.length === 0 ? (
                <div className="rounded-lg border border-dashed border-slate-300 bg-white p-5 text-sm text-slate-600" data-testid="agent-runs-empty">
                  No agent run yet. The packaged proof videos above remain available.
                </div>
              ) : (
                <div className="grid gap-5 xl:grid-cols-2">
                  {agentRuns.map((run) => (
                    <article key={run.id} className="rounded-lg border border-slate-300 bg-white p-4 shadow-sm" data-testid={`agent-run-${run.id}`}>
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <h4 className="font-bold">{run.id}</h4>
                        <Badge variant={run.status === "finalized" ? "default" : "secondary"}>{run.status}</Badge>
                      </div>
                      <p className="mt-2 text-sm text-slate-600">{run.attemptCount} of 3 render attempts used{run.finalAttempt ? ` · final attempt ${run.finalAttempt}` : ""}.</p>
                      {run.latest?.contactSheetSrc ? <img className="mt-3 w-full rounded-md border border-slate-200" src={run.latest.contactSheetSrc} alt={`Contact sheet for ${run.id}`} /> : null}
                      {run.latest?.videoSrc ? <video className="mt-3 aspect-[9/16] max-h-[620px] w-full rounded-md bg-black object-contain" controls preload="metadata" src={run.latest.videoSrc} /> : null}
                      {!run.latest && <p className="mt-3 rounded-md bg-slate-100 p-3 text-sm">Draft created. The scene plan has not been rendered.</p>}
                      {run.latest?.report ? (
                        <details className="mt-3 rounded-md border border-slate-200 p-3">
                          <summary className="cursor-pointer text-sm font-semibold">Latest quality report</summary>
                          <pre className="mt-3 max-h-72 overflow-auto whitespace-pre-wrap text-xs leading-5">{run.latest.report}</pre>
                        </details>
                      ) : null}
                    </article>
                  ))}
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
