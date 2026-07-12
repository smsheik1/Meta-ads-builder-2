"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Check, ChevronLeft, FileImage, Layers3, LoaderCircle, Sparkles, Upload } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { getV3ConvexUrl } from "@/lib/convexEnv";
import { BuilderCanvas } from "./BuilderCanvas";
import { BuilderInspector } from "./BuilderInspector";
import { useBuilderInteractionActions, useSelectedBuilderLayerId } from "./interactionStore";
import { loadLocalDraft, loadLocalVersion, publishLocalDraft, saveLocalDraft } from "./localRepository";
import { assertFormatDraft, flattenStaticLayers, makerAnalysisSchema, updateFormatDraft, validateFormatDraft, type FormatDraft, type FormatVersion } from "./model";
import { createSavedReferenceDraftFixture } from "./savedReferenceFixture";

type UploadReference = { fileName: string; imageUrl: string; file?: File };

export function MakerBuilderClient() {
  const [reference, setReference] = useState<UploadReference | null>(null);
  const [draft, setDraft] = useState<FormatDraft | null>(null);
  const [version, setVersion] = useState<FormatVersion | null>(null);
  const [status, setStatus] = useState<"idle" | "analyzing" | "ready" | "published" | "failed">("idle");
  const [message, setMessage] = useState("Upload one saved ad to start.");
  const [analysisSeconds, setAnalysisSeconds] = useState(0);
  const selectedLayerId = useSelectedBuilderLayerId();
  const interactionActions = useBuilderInteractionActions();
  const readOnly = Boolean(version);
  const cloudDisconnected = !getV3ConvexUrl();
  const activeDraft = draft;
  const visibleScene = version?.scene || activeDraft?.scene || null;
  const layers = useMemo(() => visibleScene ? flattenStaticLayers(visibleScene.layout.layers) : [], [visibleScene]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const versionId = params.get("version");
    const draftId = params.get("draft");
    try {
      if (versionId) {
        const storedVersion = loadLocalVersion(versionId);
        if (!storedVersion) throw new Error("Published version was not found in this browser.");
        setVersion(storedVersion);
        setDraft(loadLocalDraft(storedVersion.draftId));
        setStatus("published");
        setMessage(`Published version ${storedVersion.version} reopened unchanged.`);
      } else if (draftId) {
        const storedDraft = loadLocalDraft(draftId);
        if (!storedDraft) throw new Error("Draft was not found in this browser.");
        setDraft(storedDraft);
        setReference(storedDraft.reference);
        setStatus("ready");
        setMessage("Draft reopened from this browser.");
      }
    } catch (error) {
      setStatus("failed");
      setMessage(error instanceof Error ? error.message : "Saved work could not be reopened.");
    }
  }, []);

  useEffect(() => {
    if (status !== "analyzing") {
      setAnalysisSeconds(0);
      return;
    }
    const startedAt = Date.now();
    const timer = window.setInterval(() => setAnalysisSeconds(Math.floor((Date.now() - startedAt) / 1000)), 1_000);
    return () => window.clearInterval(timer);
  }, [status]);

  const draftChanged = (nextDraft: FormatDraft) => {
    saveLocalDraft(nextDraft);
    setDraft(nextDraft);
    setStatus("ready");
    setMessage("Saved in this browser.");
  };

  const referenceSelected = (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setStatus("failed");
      setMessage("Choose an image file.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setReference({ fileName: file.name, imageUrl: String(reader.result || ""), file });
      setStatus("idle");
      setMessage("Reference ready. Build the editable draft when you are ready.");
    };
    reader.onerror = () => {
      setStatus("failed");
      setMessage("The reference image could not be read.");
    };
    reader.readAsDataURL(file);
  };

  const analyzeReference = async () => {
    if (!reference?.file) return;
    setStatus("analyzing");
    setMessage("Reading text, understanding the formula, and separating editable assets…");
    try {
      const fixture = new URLSearchParams(window.location.search).get("analysisFixture");
      if (fixture === "invalid") {
        const invalid = makerAnalysisSchema.safeParse({ formula: {}, fields: [], lists: [], assets: [], reroll_groups: [], maker_questions: [] });
        if (!invalid.success) throw new Error("The analysis response failed the Maker schema.");
      }
      let nextDraft: FormatDraft;
      let readyMessage: string;
      if (fixture === "saved") {
        await new Promise((resolve) => window.setTimeout(resolve, 180));
        nextDraft = createSavedReferenceDraftFixture({
          id: crypto.randomUUID(),
          fileName: reference.fileName,
          imageUrl: reference.imageUrl,
        });
        readyMessage = "Editable draft built from the saved live-analysis fixture. No API call was made.";
      } else {
        const form = new FormData();
        form.set("reference", reference.file);
        const response = await fetch("/api/builder/analyze", { method: "POST", body: form });
        const payload = await response.json() as {
          draft?: unknown;
          error?: string;
          warnings?: string[];
          timing?: { ocrSeconds?: number; semanticSeconds?: number; samSeconds?: number };
        };
        if (!response.ok || !payload.draft) throw new Error(payload.error || "Reference analysis stopped without a draft.");
        nextDraft = assertFormatDraft(payload.draft);
        const totalSeconds = Object.values(payload.timing || {}).reduce((total, value) => total + (value || 0), 0);
        readyMessage = payload.warnings?.length
          ? `Draft built in ${Math.round(totalSeconds)}s with ${payload.warnings.length} item${payload.warnings.length === 1 ? "" : "s"} to review.`
          : `Editable draft built from this reference in ${Math.round(totalSeconds)}s.`;
      }
      saveLocalDraft(nextDraft);
      setDraft(nextDraft);
      setVersion(null);
      interactionActions.interactionReset();
      setStatus("ready");
      setMessage(readyMessage);
      window.history.replaceState({}, "", `/builder?draft=${encodeURIComponent(nextDraft.id)}`);
    } catch (error) {
      setStatus("failed");
      setMessage(error instanceof Error && error.message.startsWith("Analysis stopped:")
        ? error.message
        : `Analysis stopped: ${error instanceof Error ? error.message : "The response was invalid."} Nothing was repaired or retried.`);
    }
  };

  const publish = () => {
    if (!draft) return;
    const validation = validateFormatDraft(draft);
    if (!validation.valid) {
      setStatus("failed");
      setMessage(`Resolve ${validation.errors.length} publish issue${validation.errors.length === 1 ? "" : "s"} first.`);
      return;
    }
    const published = publishLocalDraft(draft);
    setDraft(published.draft);
    setVersion(published.version);
    setStatus("published");
    setMessage(`Version ${published.version.version} published and frozen.`);
    interactionActions.interactionReset();
    window.history.replaceState({}, "", `/builder?version=${encodeURIComponent(published.version.id)}`);
  };

  if (!activeDraft && !version) {
    return (
      <main className={cn("min-h-screen bg-[#f6f2e8] px-5 py-8 text-slate-950", cloudDisconnected && "mt-8 min-h-[calc(100vh-2rem)]")}>
        <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-6xl flex-col">
          <header className="flex items-center justify-between">
            <a href="/" className="flex items-center gap-2 text-sm font-black tracking-tight"><ChevronLeft className="size-4" /> Wiggly</a>
            <Badge variant="outline" className="border-black/15 bg-white/60">Maker workspace</Badge>
          </header>
          <section className="grid flex-1 items-center gap-12 py-12 lg:grid-cols-[0.9fr_1.1fr]">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.18em] text-violet-600">Make formats without code</p>
              <h1 className="mt-4 max-w-xl text-5xl font-black leading-[0.96] tracking-[-0.055em] sm:text-7xl">Turn a saved ad into something your whole team can reuse.</h1>
              <p className="mt-6 max-w-lg text-lg font-semibold leading-7 text-slate-600">Upload one reference. Wiggly builds the editable formula; you correct the details and publish it.</p>
              <div className="mt-8 flex flex-wrap gap-3 text-sm font-bold text-slate-600">
                <span className="rounded-full bg-white px-4 py-2 shadow-sm">One ad at a time</span>
                <span className="rounded-full bg-white px-4 py-2 shadow-sm">Static images</span>
                <span className="rounded-full bg-white px-4 py-2 shadow-sm">No code</span>
              </div>
            </div>
            <div className="rounded-[32px] border border-black/10 bg-white p-5 shadow-[0_32px_90px_rgba(15,23,42,0.12)] sm:p-8" data-builder-upload-card="true">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-black">Reference ad</p>
                  <p className="mt-1 text-sm leading-5 text-slate-500">A screenshot, feed ad, poster, or design you saved.</p>
                </div>
                <div className="rounded-2xl bg-violet-100 p-3 text-violet-700"><FileImage className="size-6" /></div>
              </div>
              <Label className="mt-6 flex min-h-72 cursor-pointer items-center justify-center overflow-hidden rounded-3xl border-2 border-dashed border-slate-200 bg-slate-50 text-center transition hover:border-violet-300 hover:bg-violet-50/50" htmlFor="reference-upload">
                {reference?.imageUrl ? (
                  <img alt="Selected reference" className="max-h-96 w-full object-contain" src={reference.imageUrl} />
                ) : (
                  <span className="flex flex-col items-center px-6">
                    <Upload className="size-8 text-violet-600" />
                    <span className="mt-4 text-base font-black">Choose an image</span>
                    <span className="mt-1 text-sm font-medium text-slate-500">PNG, JPG, or WebP</span>
                  </span>
                )}
              </Label>
              <Input id="reference-upload" className="sr-only" type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => referenceSelected(event.target.files?.[0])} />
              <div className="mt-5 flex items-center justify-between gap-4">
                <p className={`text-sm font-semibold ${status === "failed" ? "text-red-600" : "text-slate-500"}`} role="status">
                  {message}{status === "analyzing" ? ` ${analysisSeconds}s` : ""}
                </p>
                <Button className="shrink-0 rounded-full px-5" disabled={!reference || status === "analyzing"} onClick={analyzeReference}>
                  {status === "analyzing" ? <LoaderCircle className="animate-spin" /> : <Sparkles />}
                  Build draft
                </Button>
              </div>
            </div>
          </section>
        </div>
      </main>
    );
  }

  if (!activeDraft || !visibleScene) return null;

  return (
    <main className={cn("flex h-screen min-h-[720px] flex-col overflow-hidden bg-[#f6f2e8] text-slate-950", cloudDisconnected && "mt-8 h-[calc(100vh-2rem)]")} data-maker-builder="true">
      <header className="flex h-16 shrink-0 items-center justify-between gap-4 border-b border-black/10 bg-[#f6f2e8] px-5">
        <div className="flex min-w-0 items-center gap-4">
          <a href="/" className="flex shrink-0 items-center gap-2 text-sm font-black"><ChevronLeft className="size-4" /> Wiggly</a>
          <div className="h-6 w-px bg-black/10" />
          <Input
            aria-label="Format title"
            className="h-9 max-w-64 border-transparent bg-transparent px-2 text-sm font-black shadow-none hover:border-slate-200 focus-visible:border-slate-300"
            disabled={readOnly}
            value={version?.title || activeDraft.title}
            onChange={(event) => draftChanged(updateFormatDraft(activeDraft, { title: event.target.value }))}
          />
          <Badge className={cn("whitespace-nowrap", readOnly ? "bg-emerald-100 text-emerald-800" : "bg-violet-100 text-violet-800")}>{readOnly ? `Published v${version?.version}` : "Draft"}</Badge>
        </div>
        <div className="flex items-center gap-3">
          <p className={`hidden text-xs font-bold md:block ${status === "failed" ? "text-red-600" : "text-slate-500"}`} role="status">{message}</p>
          {readOnly ? (
            <Button variant="outline" onClick={() => window.location.assign(`/builder?draft=${encodeURIComponent(activeDraft.id)}`)}>Open draft</Button>
          ) : (
            <Button disabled={!validateFormatDraft(activeDraft).valid} onClick={publish}><Check /> Publish version</Button>
          )}
        </div>
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-[240px_minmax(480px,1fr)_340px]">
        <aside className="min-h-0 border-r border-black/10 bg-white p-4" data-builder-layers="true">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-black"><Layers3 className="size-4" /> Layers</h2>
            <Badge variant="secondary">{layers.length}</Badge>
          </div>
          <div className="mt-4 space-y-1 overflow-y-auto">
            {layers.slice().sort((left, right) => right.zIndex - left.zIndex).map((layer) => (
              <Button
                key={layer.id}
                variant={selectedLayerId === layer.id ? "secondary" : "ghost"}
                className="h-auto w-full justify-start gap-3 px-3 py-2.5 text-left"
                onClick={() => interactionActions.selectionChanged(layer.id)}
              >
                <span className={`size-2 shrink-0 rounded-full ${layer.locked ? "bg-amber-400" : "bg-violet-500"}`} />
                <span className="min-w-0 flex-1 truncate text-xs font-bold">{layer.name}</span>
              </Button>
            ))}
          </div>
          <div className="mt-5 rounded-2xl bg-slate-50 p-3">
            <p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-400">Reference</p>
            {activeDraft.reference.imageUrl ? <img alt="Original reference" className="mt-3 aspect-square w-full rounded-xl border border-slate-200 object-contain" src={activeDraft.reference.imageUrl} /> : null}
            <p className="mt-2 truncate text-xs font-semibold text-slate-500">{activeDraft.reference.fileName}</p>
          </div>
        </aside>

        <section className="min-h-0 p-5">
          <BuilderCanvas readOnly={readOnly} scene={visibleScene} sceneChanged={(scene) => draftChanged(updateFormatDraft(activeDraft, { scene }))} />
        </section>

        <BuilderInspector draft={activeDraft} draftChanged={draftChanged} readOnly={readOnly} selectedLayerId={selectedLayerId} />
      </div>
    </main>
  );
}
