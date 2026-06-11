import type { StoredWebsiteResearchResult } from "@/features/research/types";

const getCreativeBriefHighlights = (result: StoredWebsiteResearchResult | null) => {
  if (!result) return [];

  return [
    { label: "Offer", value: result.brandBrief.offer },
    { label: "Audience", value: result.brandBrief.audience },
    { label: "Hook", value: result.brandBrief.buyerMoments[0] || result.brandBrief.proof[0] || result.brand.description },
  ].filter((item) => item.value.trim());
};

export function CreateCreativeBriefCard({
  onOpenDetails,
  result,
}: {
  onOpenDetails: () => void;
  result: StoredWebsiteResearchResult | null;
}) {
  if (!result) return null;

  const creativeBriefHighlights = getCreativeBriefHighlights(result);

  return (
    <section
      className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm"
      data-create-creative-brief-card="legacy"
    >
      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Creative brief</p>
      <div className="mt-3 space-y-3">
        {creativeBriefHighlights.map((item) => (
          <div key={item.label}>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">{item.label}</p>
            <p className="mt-1 text-sm font-black leading-5 text-slate-900">{item.value}</p>
          </div>
        ))}
      </div>
      <div className="mt-4 flex justify-end">
        <button
          type="button"
          onClick={onOpenDetails}
          className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white shadow-lg shadow-slate-950/15 transition hover:bg-slate-800"
        >
          More
        </button>
      </div>
    </section>
  );
}
