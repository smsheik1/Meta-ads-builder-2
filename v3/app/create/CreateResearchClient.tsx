"use client";

import { useState } from "react";
import { useAction } from "convex/react";
import { Loader2, Search, ShieldAlert, Wand2 } from "lucide-react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import type { StoredWebsiteResearchResult } from "@/features/research/types";
import { AdRenderSurface } from "@/features/render/AdRenderSurface";
import type { AdScene } from "@/features/scene/types";

const anonymousIdKey = "wiggly:v3:anonymous-id";

const getAnonymousId = () => {
  if (typeof window === "undefined") return "server";
  const existing = window.localStorage.getItem(anonymousIdKey);
  if (existing) return existing;

  const next = window.crypto.randomUUID();
  window.localStorage.setItem(anonymousIdKey, next);
  return next;
};

const pillClass = "rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-slate-400 shadow-sm";

function ResearchConnected() {
  const runWebsiteResearch = useAction(api.researchRuns.runWebsiteResearch);
  const generateAdScenes = useAction(api.adScenes.generateFromResearch);
  const [url, setUrl] = useState("ogtool.com");
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [adStatus, setAdStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [result, setResult] = useState<StoredWebsiteResearchResult | null>(null);
  const [adScenes, setAdScenes] = useState<AdScene[]>([]);
  const [selectedScene, setSelectedScene] = useState<AdScene | null>(null);
  const [adStatusNote, setAdStatusNote] = useState("");
  const [error, setError] = useState("");

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus("loading");
    setAdStatus("idle");
    setAdScenes([]);
    setSelectedScene(null);
    setAdStatusNote("");
    setError("");

    try {
      const nextResult = await runWebsiteResearch({
        anonymousId: getAnonymousId(),
        url,
      }) as StoredWebsiteResearchResult;
      setResult(nextResult);
      setStatus("ready");
    } catch (nextError) {
      setStatus("error");
      setError(nextError instanceof Error ? nextError.message : "Website research failed.");
    }
  };

  const onGenerateAds = async (count = 50) => {
    if (!result) return;
    setAdStatus("loading");
    setAdStatusNote("");
    setError("");

    try {
      const nextGeneration = await generateAdScenes({
        researchRunId: result.researchRunId as Id<"researchRuns">,
        count,
      }) as {
        scenes: AdScene[];
        providerStatus: { reason: string; status: string };
      };
      setAdScenes(nextGeneration.scenes);
      setSelectedScene(nextGeneration.scenes[0] || null);
      setAdStatusNote(nextGeneration.providerStatus.reason);
      setAdStatus("ready");
    } catch (nextError) {
      setAdStatus("error");
      setError(nextError instanceof Error ? nextError.message : "Ad idea generation failed.");
    }
  };

  return (
    <section className="mx-auto grid min-h-[calc(100vh-5rem)] max-w-7xl grid-cols-[0.85fr_1.15fr] items-start gap-10">
      <div className="pt-8">
        <p className={pillClass}>Phase 3 renderer engine</p>
        <h1 className="mt-7 text-7xl font-black leading-[0.92] tracking-normal">
          Paste a site. Turn evidence into ads.
        </h1>
        <p className="mt-6 max-w-xl text-lg font-bold leading-8 text-slate-500">
          Firecrawl reads the page, Convex stores the proof, then OpenRouter turns that evidence into 50 AdScene candidates.
        </p>

        <form
          onSubmit={onSubmit}
          className="mt-10 rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_24px_70px_rgba(15,23,42,0.10)]"
        >
          <label className="text-sm font-black text-slate-900" htmlFor="website-url">
            Website
          </label>
          <input
            id="website-url"
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            className="mt-3 w-full rounded-full border border-slate-200 bg-slate-50 px-6 py-4 text-lg font-bold text-slate-900 outline-none transition focus:border-slate-950 focus:bg-white"
            placeholder="https://yourbrand.com"
          />
          <button
            type="submit"
            disabled={status === "loading"}
            className="mt-5 inline-flex w-full items-center justify-center gap-3 rounded-full bg-slate-950 px-6 py-4 text-base font-black text-white shadow-[0_18px_40px_rgba(15,23,42,0.18)] transition hover:translate-y-[-1px] disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            {status === "loading" ? <Loader2 className="size-5 animate-spin" /> : <Search className="size-5" />}
            {status === "loading" ? "Reading website" : "Read website"}
          </button>
        </form>

        {result ? (
          <div className="mt-5 rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-black uppercase tracking-[0.16em] text-slate-400">Next step</p>
                <p className="mt-2 text-lg font-black text-slate-900">Generate 50 ad ideas from this research.</p>
              </div>
              <button
                type="button"
                disabled={adStatus === "loading"}
                onClick={() => void onGenerateAds(50)}
                className="inline-flex shrink-0 items-center justify-center gap-3 rounded-full bg-slate-950 px-6 py-4 text-sm font-black text-white shadow-[0_18px_40px_rgba(15,23,42,0.18)] transition hover:translate-y-[-1px] disabled:cursor-not-allowed disabled:bg-slate-400"
              >
                {adStatus === "loading" ? <Loader2 className="size-5 animate-spin" /> : <Wand2 className="size-5" />}
                {adStatus === "loading" ? "Writing ideas" : "Generate 50"}
              </button>
            </div>
            {adStatusNote ? (
              <p className="mt-4 rounded-2xl bg-slate-50 px-4 py-3 text-sm font-bold leading-6 text-slate-500">
                {adStatusNote}
              </p>
            ) : null}
          </div>
        ) : null}

        {status === "error" || adStatus === "error" ? (
          <div className="mt-5 rounded-[22px] border border-red-100 bg-red-50 p-4 text-sm font-black leading-6 text-red-700">
            {error}
          </div>
        ) : null}
      </div>

      <div className="grid gap-5">
        <div className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-[0_26px_80px_rgba(15,23,42,0.10)]">
          <p className={pillClass}>Selected preview</p>
          {selectedScene ? (
            <div className="mx-auto mt-6 max-w-[440px] rounded-[34px] bg-slate-950 p-3 shadow-[0_30px_90px_rgba(15,23,42,0.22)]">
              <div className="overflow-hidden rounded-[26px] bg-white">
                <AdRenderSurface scene={selectedScene} timeSeconds={1.1} />
              </div>
            </div>
          ) : (
            <p className="mt-6 text-base font-bold leading-7 text-slate-500">
              Generate ad ideas to preview the first typed AdScene through the shared renderer.
            </p>
          )}
        </div>

        <div className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-[0_26px_80px_rgba(15,23,42,0.10)]">
          <p className={pillClass}>Generated AdScenes</p>
          {adScenes.length ? (
            <div className="mt-6 grid max-h-[680px] gap-3 overflow-auto pr-2">
              {adScenes.map((scene) => (
                <button
                  type="button"
                  key={`${scene.metadata.generationBatchId}-${scene.metadata.candidateIndex}`}
                  onClick={() => setSelectedScene(scene)}
                  className={`rounded-3xl border p-5 text-left transition hover:-translate-y-0.5 ${
                    selectedScene === scene
                      ? "border-slate-950 bg-white shadow-[0_18px_50px_rgba(15,23,42,0.12)]"
                      : "border-slate-200 bg-slate-50"
                  }`}
                >
                  <div className="flex items-center justify-between gap-4">
                    <span className="rounded-full bg-white px-3 py-2 text-xs font-black uppercase tracking-[0.14em] text-slate-400">
                      {scene.creative.headlineType.replace(/_/g, " ")}
                    </span>
                    <span className="text-xs font-black text-slate-400">
                      #{scene.metadata.candidateIndex + 1}
                    </span>
                  </div>
                  <h3 className="mt-4 text-2xl font-black leading-tight text-slate-950">
                    {scene.creative.headline}
                  </h3>
                  <p className="mt-3 text-sm font-bold leading-6 text-slate-600">
                    {scene.creative.subheadline}
                  </p>
                  <p className="mt-4 inline-flex rounded-full bg-slate-950 px-4 py-2 text-xs font-black text-white">
                    {scene.creative.ctaText}
                  </p>
                  <p className="mt-4 text-xs font-bold leading-5 text-slate-400">
                    Proof: {scene.creative.selectedProof}
                  </p>
                </button>
              ))}
            </div>
          ) : (
            <p className="mt-6 text-base font-bold leading-7 text-slate-500">
              After research, generate the 50 typed AdScene candidates that future formats will render.
            </p>
          )}
        </div>

        <div className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-[0_26px_80px_rgba(15,23,42,0.10)]">
          <p className={pillClass}>Brand snapshot</p>
          {result ? (
            <div className="mt-6 grid gap-5">
              <div className="flex items-start gap-4">
                {result.brand.logoUrl || result.brand.faviconUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    alt=""
                    className="size-14 rounded-2xl border border-slate-200 object-contain p-2"
                    src={result.brand.logoUrl || result.brand.faviconUrl || ""}
                  />
                ) : null}
                <div>
                  <h2 className="text-3xl font-black leading-tight">{result.brand.name}</h2>
                  <p className="mt-2 text-sm font-bold text-slate-500">{result.finalUrl}</p>
                </div>
              </div>
              <p className="text-lg font-black leading-8 text-slate-700">{result.brand.description}</p>
              <div className="flex flex-wrap gap-2">
                {result.brand.colors.map((color) => (
                  <span
                    key={color}
                    className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-black text-slate-500"
                  >
                    <span className="size-4 rounded-full border border-slate-200" style={{ backgroundColor: color }} />
                    {color}
                  </span>
                ))}
                {result.brand.vibeTags.map((tag) => (
                  <span key={tag} className="rounded-full bg-slate-100 px-3 py-2 text-xs font-black text-slate-500">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <p className="mt-6 text-base font-bold leading-7 text-slate-500">
              Run research to see the normalized brand snapshot Convex will pass into ad formats.
            </p>
          )}
        </div>

        <div className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-[0_26px_80px_rgba(15,23,42,0.10)]">
          <p className={pillClass}>Raw evidence</p>
          {result ? (
            <div className="mt-6 grid gap-6">
              <EvidenceList title="Site language" items={result.evidence.receipts.exactSiteLanguage} />
              <EvidenceList title="Specific claims" items={result.evidence.receipts.specificClaims} />
              <EvidenceList title="Buyer moments" items={result.evidence.receipts.buyerMoments} />
              <EvidenceList title="Named proof" items={result.evidence.receipts.namedProof} />
            </div>
          ) : (
            <p className="mt-6 text-base font-bold leading-7 text-slate-500">
              The point of this phase is transparency. No mystery prompt yet, just the facts Wiggly found.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

function EvidenceList({ title, items }: { title: string; items: string[] }) {
  return (
    <section>
      <h3 className="text-sm font-black uppercase tracking-[0.14em] text-slate-400">{title}</h3>
      {items.length ? (
        <ul className="mt-3 grid gap-2">
          {items.map((item) => (
            <li key={item} className="rounded-2xl bg-slate-50 px-4 py-3 text-sm font-bold leading-6 text-slate-700">
              {item}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 rounded-2xl bg-slate-50 px-4 py-3 text-sm font-bold text-slate-400">[]</p>
      )}
    </section>
  );
}

export function CreateResearchClient() {
  const convexConfigured = Boolean(process.env.NEXT_PUBLIC_CONVEX_URL);

  if (!convexConfigured) {
    return (
      <section className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-4xl items-center">
        <div className="rounded-[30px] border border-amber-200 bg-amber-50 p-8 text-amber-900 shadow-sm">
          <ShieldAlert className="size-8" />
          <h1 className="mt-5 text-4xl font-black">Convex is missing.</h1>
          <p className="mt-4 text-lg font-bold leading-8">
            Add NEXT_PUBLIC_CONVEX_URL to v3/.env.local before running Phase 1 research.
          </p>
        </div>
      </section>
    );
  }

  return <ResearchConnected />;
}
