import { X } from "lucide-react";
import type { StoredWebsiteResearchResult } from "@/features/research/types";

const summarizeJson = (value: unknown) => JSON.stringify(value ?? {}, null, 2);

const uniqueNonEmptyStrings = (items: Array<string | null | undefined>) => (
  Array.from(new Set(items.map((item) => item?.trim()).filter((item): item is string => Boolean(item))))
);

const getBrandDumpImages = (result: StoredWebsiteResearchResult) => uniqueNonEmptyStrings([
  result.brand.logoUrl,
  result.brand.faviconUrl,
  result.brand.ogImageUrl,
  result.brand.screenshotUrl,
]);

const getUsefulClaims = (result: StoredWebsiteResearchResult) => uniqueNonEmptyStrings([
  result.brandBrief.offer,
  ...result.brandBrief.buyerMoments,
  ...result.brandBrief.proof,
  result.brandBrief.ctaDirection,
]);

export function BrandDumpModal({
  result,
  onClose,
}: {
  result: StoredWebsiteResearchResult;
  onClose: () => void;
}) {
  const brandImages = getBrandDumpImages(result);
  const usefulClaims = getUsefulClaims(result);
  const fonts = uniqueNonEmptyStrings([
    result.brand.fonts.heading ? `Heading: ${result.brand.fonts.heading}` : null,
    result.brand.fonts.body ? `Body: ${result.brand.fonts.body}` : null,
    result.brand.fonts.feel !== "unknown" ? `Feel: ${result.brand.fonts.feel}` : null,
  ]);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/55 p-4"
      data-brand-dump-modal="legacy"
      role="dialog"
      aria-modal="true"
      aria-label="Full brand dump"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section className="flex h-[86vh] w-full max-w-6xl flex-col overflow-hidden rounded-[1.5rem] border border-slate-300 bg-white shadow-2xl shadow-slate-950/30">
        <header className="flex items-start justify-between gap-4 border-b border-slate-200 bg-white px-6 py-5">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Full brand dump</p>
            <h2 className="mt-1 text-3xl font-black leading-tight text-slate-950">{result.brand.name}</h2>
            <p className="mt-1 max-w-2xl text-base font-semibold text-slate-600">{result.finalUrl}</p>
          </div>
          <button
            type="button"
            aria-label="Close brand dump"
            onClick={onClose}
            className="grid size-12 shrink-0 place-items-center rounded-2xl border border-slate-200 bg-white text-slate-500 transition hover:-translate-y-0.5 hover:border-slate-300 hover:text-slate-950"
          >
            <X className="size-5" />
          </button>
        </header>

        <div className="grid min-h-0 flex-1 gap-0 overflow-hidden lg:grid-cols-[0.92fr_1.08fr]">
          <div className="min-h-0 overflow-y-auto border-r border-slate-200 bg-slate-50/70 px-6 py-5">
            <div className="grid gap-5">
              <section className="rounded-[1.25rem] border border-slate-200 bg-white p-4 shadow-sm">
                <h3 className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Images Firecrawl found</h3>
                {brandImages.length ? (
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    {brandImages.map((imageUrl) => (
                      <a
                        key={imageUrl}
                        href={imageUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="group overflow-hidden rounded-2xl border border-slate-200 bg-slate-50"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          alt=""
                          className="h-28 w-full object-contain p-3 transition group-hover:scale-105"
                          src={imageUrl}
                        />
                      </a>
                    ))}
                  </div>
                ) : (
                  <p className="mt-3 rounded-2xl bg-slate-50 px-4 py-3 text-sm font-bold text-slate-400">[]</p>
                )}
              </section>

              <section className="rounded-[1.25rem] border border-slate-200 bg-white p-4 shadow-sm">
                <h3 className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Colors</h3>
                {result.brand.colors.length ? (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {result.brand.colors.map((color) => (
                      <span
                        key={color}
                        className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-black text-slate-500"
                      >
                        <span className="size-4 rounded-full border border-slate-200" style={{ backgroundColor: color }} />
                        {color}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="mt-3 rounded-2xl bg-slate-50 px-4 py-3 text-sm font-bold text-slate-400">[]</p>
                )}
              </section>

              <section className="rounded-[1.25rem] border border-slate-200 bg-white p-4 shadow-sm">
                <EvidenceList title="Fonts" items={fonts} />
                <div className="mt-5">
                  <EvidenceList title="Vibe tags" items={result.brand.vibeTags} />
                </div>
              </section>

              <section className="rounded-[1.25rem] border border-slate-200 bg-white p-4 shadow-sm">
                <h3 className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Provider status</h3>
                {result.providerStatus.length ? (
                  <div className="mt-3 grid gap-2">
                    {result.providerStatus.map((provider) => (
                      <div key={`${provider.provider}-${provider.reason}`} className="rounded-2xl bg-slate-50 px-4 py-3">
                        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                          {provider.provider} · {provider.status}
                        </p>
                        <p className="mt-1 text-sm font-semibold leading-6 text-slate-700">{provider.reason}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-3 rounded-2xl bg-slate-50 px-4 py-3 text-sm font-bold text-slate-400">[]</p>
                )}
              </section>
            </div>
          </div>

          <div className="min-h-0 overflow-y-auto bg-white px-6 py-5">
            <div className="grid gap-5">
              <section className="rounded-[1.25rem] border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-base font-black leading-7 text-slate-700">{result.brand.description}</p>
              </section>

              <section className="rounded-[1.25rem] border border-slate-200 bg-white p-4 shadow-sm">
                <EvidenceList title="Useful claims" items={usefulClaims} />
              </section>

              <section className="rounded-[1.25rem] border border-slate-200 bg-white p-4 shadow-sm">
                <div className="grid gap-5">
                  <EvidenceList title="Offer" items={[result.brandBrief.offer]} />
                  <EvidenceList title="Audience" items={[result.brandBrief.audience]} />
                  <EvidenceList title="Buyer moments" items={result.brandBrief.buyerMoments} />
                  <EvidenceList title="Proof" items={result.brandBrief.proof} />
                  <EvidenceList title="Site language" items={result.brandBrief.siteLanguage} />
                  <EvidenceList title="CTA direction" items={[result.brandBrief.ctaDirection]} />
                  <EvidenceList title="Visual notes" items={result.brandBrief.visualNotes} />
                  <EvidenceList title="Ignored junk" items={result.brandBrief.droppedNoiseSummary} />
                </div>
              </section>

              <JsonDump title="Metadata JSON" value={result.metadata} />
              <JsonDump title="Branding JSON" value={result.branding} />
              <TextDump title="Raw website text" value={result.evidence.rawMarkdown} />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function JsonDump({ title, value }: { title: string; value: unknown }) {
  return <TextDump title={title} value={summarizeJson(value)} />;
}

function TextDump({ title, value }: { title: string; value: string }) {
  return (
    <section className="rounded-[1.25rem] border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">{title}</h3>
      <pre className="mt-3 max-h-72 overflow-auto whitespace-pre-wrap rounded-2xl bg-slate-950 px-4 py-3 text-xs font-bold leading-5 text-slate-100">
        {value.trim() || "[]"}
      </pre>
    </section>
  );
}

function EvidenceList({ title, items }: { title: string; items: string[] }) {
  const cleanedItems = items.map((item) => item.trim()).filter(Boolean);

  return (
    <section>
      <h3 className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">{title}</h3>
      {cleanedItems.length ? (
        <ul className="mt-3 grid gap-2">
          {cleanedItems.map((item) => (
            <li key={item} className="rounded-2xl bg-slate-50 px-4 py-3 text-sm font-semibold leading-6 text-slate-700">
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
