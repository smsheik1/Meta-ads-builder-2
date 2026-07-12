"use client";

import { useAction } from "convex/react";
import { ArrowLeft, ChevronRight, FlaskConical, LoaderCircle, RotateCw, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { api } from "@/convex/_generated/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loadLocalDraft } from "@/features/builder/localRepository";
import type { FormatDraft } from "@/features/builder/model";
import { isStoredWebsiteResearchFailure, type StoredWebsiteResearchResponse, type StoredWebsiteResearchResult } from "@/features/research/types";
import { AdRenderSurface } from "@/features/render/AdRenderSurface";
import {
  createMakerFormatTestDraftFixture,
  createMakerFormatTestGenerationFixture,
  makerTestResearchFixture,
} from "@/features/formats/static-package/testFixture";
import {
  createMakerFormatTestContract,
  createMakerFormatTestScenes,
  getDefaultMakerTestProductHandle,
  nextMakerTestVariationIndex,
  selectMakerTestProduct,
  type MakerFormatTestContract,
  type MakerFormatTestGeneration,
} from "@/features/formats/static-package/testRuntime";
import type { StaticPackageAdScene } from "@/features/scene/types";
import { getV3ConvexUrl } from "@/lib/convexEnv";
import { getAnonymousId } from "./createSession";

type TestStatus = "loading" | "ready" | "researching" | "researched" | "generating" | "generated" | "error";
type RunResearch = (url: string) => Promise<StoredWebsiteResearchResponse>;
type RunGeneration = (input: {
  answers: Array<{ question: string; answer: string }>;
  contract: MakerFormatTestContract;
  productHandle: string;
  research: StoredWebsiteResearchResult;
}) => Promise<MakerFormatTestGeneration>;

const isTypingTarget = (target: EventTarget | null) => target instanceof HTMLElement && (
  target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT", "BUTTON"].includes(target.tagName)
);

function MakerFormatTestSession({ draftId, fixture, runGeneration, runResearch }: {
  draftId: string;
  fixture: boolean;
  runGeneration: RunGeneration;
  runResearch: RunResearch;
}) {
  const [draft, setDraft] = useState<FormatDraft | null>(null);
  const [url, setUrl] = useState(fixture ? "davids-cookies.test" : "");
  const [status, setStatus] = useState<TestStatus>("loading");
  const [research, setResearch] = useState<StoredWebsiteResearchResult | null>(null);
  const [selectedProductHandle, setSelectedProductHandle] = useState("");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [scenes, setScenes] = useState<StaticPackageAdScene[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [error, setError] = useState("");

  useEffect(() => {
    try {
      const stored = loadLocalDraft(draftId);
      if (!stored) throw new Error("This Format draft was not found in this browser.");
      if (stored.status !== "draft") throw new Error("Maker Test Mode only runs unpublished drafts.");
      setDraft(stored);
      setStatus("ready");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "The Format draft could not be opened.");
      setStatus("error");
    }
  }, [draftId]);

  const contract = useMemo(() => draft ? createMakerFormatTestContract(draft) : null, [draft]);
  const products = research?.productCatalog?.products || [];
  const selectedProduct = research && (products.length <= 1 || selectedProductHandle) ? selectMakerTestProduct(
    research.productCatalog,
    selectedProductHandle || getDefaultMakerTestProductHandle(research.productCatalog),
  ) : null;
  const questionsComplete = contract ? contract.questions.every((question) => answers[question]?.trim()) : false;
  const productComplete = products.length <= 1 || Boolean(selectedProductHandle);
  const selectedScene = scenes[selectedIndex] || null;
  const busy = status === "researching" || status === "generating";

  const advanceVariation = () => {
    if (status !== "generated") return;
    setSelectedIndex((index) => nextMakerTestVariationIndex(index, scenes.length));
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code !== "Space" || isTypingTarget(event.target) || status !== "generated") return;
      event.preventDefault();
      advanceVariation();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  const researchWebsite = async (event: React.FormEvent) => {
    event.preventDefault();
    setStatus("researching");
    setError("");
    setScenes([]);
    setResearch(null);
    setSelectedProductHandle("");
    setAnswers({});
    try {
      const next = await runResearch(url);
      if (isStoredWebsiteResearchFailure(next)) throw new Error(next.error);
      setResearch(next);
      setSelectedProductHandle(getDefaultMakerTestProductHandle(next.productCatalog));
      setStatus("researched");
    } catch (researchError) {
      setError(researchError instanceof Error ? researchError.message : "Website research failed.");
      setStatus("error");
    }
  };

  const generateTestAds = async () => {
    if (!draft || !contract || !research) return;
    setStatus("generating");
    setError("");
    try {
      const product = selectMakerTestProduct(research.productCatalog, selectedProductHandle);
      const answerList = contract.questions.map((question) => ({ question, answer: answers[question] || "" }));
      const generation = await runGeneration({ answers: answerList, contract, productHandle: product?.handle || "", research });
      setScenes(createMakerFormatTestScenes({ draft, generation, product, research }));
      setSelectedIndex(0);
      setStatus("generated");
    } catch (generationError) {
      setError(generationError instanceof Error ? generationError.message : "Test generation failed.");
      setStatus("error");
    }
  };

  return (
    <main className="min-h-screen bg-[#f6f2e8] text-slate-950" data-maker-test-mode="true">
      <header className="border-b border-black/10 bg-white/75 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4">
          <div className="flex min-w-0 items-center gap-3">
            <Badge className="bg-violet-100 text-violet-800"><FlaskConical /> Maker Test Mode</Badge>
            <p className="truncate text-sm font-black">{draft?.title || "Opening Format…"}</p>
          </div>
          <Button asChild variant="outline"><a href={`/builder?draft=${encodeURIComponent(draftId)}`}><ArrowLeft /> Back to builder</a></Button>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-8 px-5 py-8 lg:grid-cols-[minmax(330px,0.78fr)_minmax(520px,1.22fr)]">
        <section className="space-y-5">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-violet-600">Test the formula, not a name swap</p>
            <h1 className="mt-3 text-4xl font-black leading-[0.98] tracking-[-0.045em]">Can this Format make a great ad for a completely different brand?</h1>
          </div>

          <form className="rounded-3xl border border-black/10 bg-white p-5 shadow-sm" onSubmit={researchWebsite}>
            <Label htmlFor="maker-test-url">Brand website</Label>
            <div className="mt-2 flex gap-2">
              <Input id="maker-test-url" aria-label="Brand website" disabled={busy} placeholder="davids-cookies.com" required value={url} onChange={(event) => setUrl(event.target.value)} />
              <Button disabled={!draft || busy || !url.trim()} type="submit">
                {status === "researching" ? <LoaderCircle className="animate-spin" /> : <Sparkles />}
                Read site
              </Button>
            </div>
            {status === "researching" ? <p className="mt-3 text-sm font-bold text-violet-700" role="status">Reading the brand, offer, proof, and products…</p> : null}
          </form>

          {research ? (
            <section className="rounded-3xl border border-black/10 bg-white p-5 shadow-sm" data-maker-test-brand-summary="true">
              <div className="flex items-start gap-3">
                {research.brand.logoUrl || research.brand.faviconUrl ? <img alt={`${research.brand.name} logo`} className="size-12 rounded-xl object-contain" src={research.brand.logoUrl || research.brand.faviconUrl || ""} /> : null}
                <div><p className="text-lg font-black">{research.brand.name}</p><p className="mt-1 text-sm font-semibold text-slate-500">{research.brandBrief.offer}</p></div>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl bg-slate-50 p-3"><p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Audience</p><p className="mt-1 text-sm font-bold">{research.brandBrief.audience}</p></div>
                <div className="rounded-2xl bg-slate-50 p-3"><p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Strongest moment</p><p className="mt-1 text-sm font-bold">{research.brandBrief.buyerMoments[0] || research.brand.description}</p></div>
              </div>
              <details className="mt-4 rounded-2xl border border-slate-200 p-3 text-sm"><summary className="cursor-pointer font-black">Full creative brief</summary><div className="mt-3 space-y-2 text-slate-600"><p><strong>Proof:</strong> {research.brandBrief.proof.join(" · ") || "None found"}</p><p><strong>Site language:</strong> {research.brandBrief.siteLanguage.join(" · ") || "None found"}</p><p><strong>CTA direction:</strong> {research.brandBrief.ctaDirection}</p></div></details>
            </section>
          ) : null}

          {research && products.length ? (
            <section className="rounded-3xl border border-black/10 bg-white p-5 shadow-sm">
              <Label htmlFor="maker-test-product">Product to advertise</Label>
              <p className="mt-1 text-xs font-semibold text-slate-500">{products.length} products found. Pick the one this test should use.</p>
              <select id="maker-test-product" aria-label="Product to advertise" className="mt-3 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold" value={selectedProductHandle} onChange={(event) => setSelectedProductHandle(event.target.value)}>
                {products.length > 1 ? <option value="">Choose a product</option> : null}
                {products.map((product) => <option key={product.handle} value={product.handle}>{product.title}</option>)}
              </select>
              {selectedProduct ? <div className="mt-3 flex items-center gap-3 rounded-2xl bg-slate-50 p-3">{selectedProduct.imageUrl ? <img alt={selectedProduct.imageAlt || selectedProduct.title} className="size-16 rounded-xl object-contain" src={selectedProduct.imageUrl} /> : null}<div><p className="font-black">{selectedProduct.title}</p><p className="text-xs font-semibold text-slate-500">{selectedProduct.productType || "Product"}</p></div></div> : null}
            </section>
          ) : null}

          {research && contract?.questions.length ? (
            <section className="rounded-3xl border border-black/10 bg-white p-5 shadow-sm"><p className="text-sm font-black">A few things the website could not answer</p><div className="mt-4 space-y-4">{contract.questions.map((question, index) => <div key={question}><Label htmlFor={`maker-question-${index}`}>{question}</Label><Input id={`maker-question-${index}`} className="mt-2" value={answers[question] || ""} onChange={(event) => setAnswers((current) => ({ ...current, [question]: event.target.value }))} /></div>)}</div></section>
          ) : null}

          {research ? <Button className="h-12 w-full rounded-2xl text-base font-black" disabled={busy || !productComplete || !questionsComplete} onClick={() => void generateTestAds()}><Sparkles /> Generate test ads</Button> : null}
          {status === "generating" ? <p className="text-center text-sm font-bold text-violet-700" role="status">Writing three different creative directions and fitting every linked slot…</p> : null}
          {error ? <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700" role="alert">{error}</div> : null}
        </section>

        <section className="lg:sticky lg:top-6 lg:self-start">
          <div className="rounded-[34px] border border-black/10 bg-[#e8e4da] p-5 shadow-inner">
            <div className="mx-auto aspect-square w-full max-w-[680px] overflow-hidden rounded-2xl bg-white shadow-2xl" data-maker-test-preview="true">
              {selectedScene ? <AdRenderSurface scene={selectedScene} motionMode="idle" /> : <div className="grid h-full place-items-center p-10 text-center"><div><FlaskConical className="mx-auto size-10 text-violet-500" /><p className="mt-4 text-xl font-black">Your cross-brand test will appear here.</p><p className="mt-2 text-sm font-semibold text-slate-500">Read a website, choose a product, then generate three directions.</p></div></div>}
            </div>
          </div>
          {selectedScene ? (
            <div className="mt-4 rounded-3xl border border-black/10 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-4"><div><Badge variant="secondary">Variation {selectedIndex + 1} of {scenes.length}</Badge><h2 className="mt-3 text-2xl font-black">{selectedScene.creative.headline}</h2><p className="mt-1 text-sm font-semibold leading-6 text-slate-500">{selectedScene.creative.subheadline}</p></div><Button aria-label="Next variation" size="icon" onClick={advanceVariation}><ChevronRight /></Button></div>
              <div className="mt-4 grid grid-cols-3 gap-2">{scenes.map((scene, index) => <button key={scene.creative.angleId} type="button" className={`rounded-xl border px-2 py-2 text-xs font-black ${selectedIndex === index ? "border-violet-500 bg-violet-50 text-violet-800" : "border-slate-200"}`} onClick={() => setSelectedIndex(index)}>{scene.creative.headline}</button>)}</div>
              <Button className="mt-4 w-full rounded-2xl" variant="outline" onClick={advanceVariation}><RotateCw /> Press spacebar for the next direction</Button>
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
}

function MakerFormatTestConnected({ draftId }: { draftId: string }) {
  const runWebsiteResearch = useAction(api.researchRuns.runWebsiteResearch);
  return <MakerFormatTestSession draftId={draftId} fixture={false} runResearch={(url) => runWebsiteResearch({ anonymousId: getAnonymousId(), url }) as Promise<StoredWebsiteResearchResponse>} runGeneration={async (input) => {
    const response = await fetch("/api/maker/test-format", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(input) });
    const payload = await response.json() as { generation?: MakerFormatTestGeneration; error?: string };
    if (!response.ok || !payload.generation) throw new Error(payload.error || "Test generation stopped without three ads.");
    return payload.generation;
  }} />;
}

export function MakerFormatTestClient({ draftId, fixture }: { draftId: string; fixture: boolean }) {
  if (fixture) return <MakerFormatTestSession draftId={draftId} fixture runResearch={async () => { await new Promise((resolve) => setTimeout(resolve, 300)); return structuredClone(makerTestResearchFixture); }} runGeneration={async ({ contract }) => { await new Promise((resolve) => setTimeout(resolve, 450)); return createMakerFormatTestGenerationFixture(contract); }} />;
  if (!getV3ConvexUrl()) return <main className="grid min-h-screen place-items-center bg-[#f6f2e8] p-6"><div className="max-w-xl rounded-3xl border border-amber-200 bg-amber-50 p-8"><h1 className="text-3xl font-black">Website research is not connected.</h1><p className="mt-3 font-semibold text-amber-900">Add NEXT_PUBLIC_V3_CONVEX_URL before testing this Format with a live brand.</p></div></main>;
  return <MakerFormatTestConnected draftId={draftId} />;
}
