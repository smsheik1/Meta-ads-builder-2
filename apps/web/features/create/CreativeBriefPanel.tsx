import type { ResearchQuality } from '@/features/research/researchQuality';
import type { WebsiteResearch } from '@/features/research/websiteResearch';
import type { AdScene } from './scene';

type CreativeBriefPanelProps = {
  scene: AdScene;
  research: WebsiteResearch | null;
  quality: ResearchQuality | null;
};

export function CreativeBriefPanel({ scene, research, quality }: CreativeBriefPanelProps) {
  const firstReceipt = scene.brand.receipts.specificClaims[0] ||
    scene.brand.receipts.exactSiteLanguage[0] ||
    scene.brand.receipts.buyerMoments[0] ||
    'No specific receipt found yet.';

  return (
    <section className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-[0_24px_70px_rgba(15,23,42,0.08)]">
      <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">
        Creative brief
      </p>
      <dl className="mt-4 space-y-4">
        <div>
          <dt className="text-xs font-black uppercase tracking-wide text-slate-400">Offer</dt>
          <dd className="mt-1 text-sm font-black leading-6 text-slate-950">{scene.brand.offer}</dd>
        </div>
        <div>
          <dt className="text-xs font-black uppercase tracking-wide text-slate-400">Audience</dt>
          <dd className="mt-1 text-sm font-black leading-6 text-slate-950">{scene.brand.audience}</dd>
        </div>
        <div>
          <dt className="text-xs font-black uppercase tracking-wide text-slate-400">Receipt</dt>
          <dd className="mt-1 text-sm font-black leading-6 text-slate-950">{firstReceipt}</dd>
        </div>
      </dl>
      {research && (
        <div className="mt-4 space-y-3">
          <p className="text-xs font-bold text-slate-500">
            Read {research.headings.length} headings and {research.paragraphs.length} page snippets from {research.host}
            {quality ? ` · ${quality.level} research (${quality.score}/100)` : ''}.
          </p>
          <div className="flex flex-wrap gap-2">
            {research.providerStatus.map((provider) => (
              <span
                key={`${provider.provider}-${provider.status}`}
                className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-black uppercase tracking-wide text-slate-500"
                title={provider.reason}
              >
                {provider.provider} {provider.status}
              </span>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
