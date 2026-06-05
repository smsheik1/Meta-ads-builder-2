'use client';

import { ExternalLink, ImageIcon, SearchCheck, X } from 'lucide-react';
import type { ResearchQuality } from '@/features/research/researchQuality';
import type { WebsiteResearch } from '@/features/research/websiteResearch';
import type { AdScene } from './scene';

type BrandEvidenceDrawerProps = {
  open: boolean;
  quality: ResearchQuality | null;
  research: WebsiteResearch | null;
  scene: AdScene;
  onClose: () => void;
};

type EvidenceListProps = {
  emptyLabel: string;
  items: string[];
  title: string;
};

const nonEmpty = (items: string[]) => items.map((item) => item.trim()).filter(Boolean);

function EvidenceList({ emptyLabel, items, title }: EvidenceListProps) {
  const visibleItems = nonEmpty(items);

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-4">
      <h3 className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">
        {title}
      </h3>
      {visibleItems.length > 0 ? (
        <ul className="mt-3 space-y-2">
          {visibleItems.map((item) => (
            <li
              key={item}
              className="rounded-2xl bg-slate-50 px-3 py-2 text-sm font-bold leading-6 text-slate-700"
            >
              {item}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 rounded-2xl bg-slate-50 px-3 py-2 text-sm font-bold text-slate-400">
          {emptyLabel}
        </p>
      )}
    </section>
  );
}

const imageCandidates = (research: WebsiteResearch | null, scene: AdScene) => {
  const candidates = [
    { label: 'Logo', url: research?.logoUrl || scene.brand.logoUrl },
    { label: 'Favicon', url: research?.faviconUrl || scene.brand.faviconUrl },
    { label: 'Open graph image', url: research?.ogImageUrl },
  ];

  return candidates.filter((candidate, index, all) => (
    Boolean(candidate.url) &&
    all.findIndex((other) => other.url === candidate.url) === index
  )) as Array<{ label: string; url: string }>;
};

export function BrandEvidenceDrawer({
  open,
  quality,
  research,
  scene,
  onClose,
}: BrandEvidenceDrawerProps) {
  if (!open) return null;

  const receipts = scene.brand.receipts;
  const images = imageCandidates(research, scene);
  const colors = research?.colors.length ? research.colors : [scene.creative.accentColor, scene.creative.backgroundColor];
  const host = research?.host || new URL(scene.brand.websiteUrl).host;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/35 p-3 backdrop-blur-[2px] sm:p-5">
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="Close brand evidence"
        onClick={onClose}
      />
      <aside
        className="relative flex h-full w-full max-w-[620px] flex-col overflow-hidden rounded-[32px] border border-slate-200 bg-[#fbfaf6] shadow-[0_30px_120px_rgba(15,23,42,0.28)]"
        data-testid="brand-evidence-drawer"
      >
        <header className="flex items-start justify-between gap-4 border-b border-slate-200 bg-white px-5 py-5">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
              Brand evidence
            </p>
            <h2 className="mt-2 text-2xl font-black leading-tight text-slate-950">
              What Wiggly found for {scene.brand.name}
            </h2>
            <p className="mt-2 text-sm font-bold leading-6 text-slate-500">
              Read-only receipts from {host}. Use this to spot weak research before trusting the ad.
            </p>
          </div>
          <button
            type="button"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-slate-200 bg-slate-50 text-slate-500 transition hover:border-slate-300 hover:text-slate-950"
            aria-label="Close brand evidence"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-3xl border border-slate-200 bg-white p-4">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Quality</p>
              <p className="mt-2 text-2xl font-black text-slate-950">
                {quality ? `${quality.score}/100` : 'N/A'}
              </p>
              <p className="mt-1 text-xs font-bold uppercase tracking-wide text-slate-500">
                {quality?.level || 'No score yet'}
              </p>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-white p-4">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Copy read</p>
              <p className="mt-2 text-2xl font-black text-slate-950">
                {(research?.headings.length || 0) + (research?.paragraphs.length || 0)}
              </p>
              <p className="mt-1 text-xs font-bold uppercase tracking-wide text-slate-500">
                headings + snippets
              </p>
            </div>
            <a
              href={scene.brand.websiteUrl}
              target="_blank"
              rel="noreferrer"
              className="rounded-3xl border border-slate-200 bg-white p-4 transition hover:border-slate-300"
            >
              <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Website</p>
              <p className="mt-2 flex items-center gap-2 text-sm font-black leading-5 text-slate-950">
                {host}
                <ExternalLink className="h-3.5 w-3.5 shrink-0" />
              </p>
            </a>
          </div>

          <div className="mt-4 rounded-3xl border border-slate-200 bg-white p-4">
            <h3 className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">
              Research providers
            </h3>
            <div className="mt-3 flex flex-wrap gap-2">
              {(research?.providerStatus || []).map((provider) => (
                <span
                  key={`${provider.provider}-${provider.status}`}
                  className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-[11px] font-black uppercase tracking-wide text-slate-500"
                  title={provider.reason}
                >
                  {provider.provider} {provider.status}
                </span>
              ))}
              {!research?.providerStatus.length && (
                <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-[11px] font-black uppercase tracking-wide text-slate-400">
                  No provider status
                </span>
              )}
            </div>
          </div>

          <div className="mt-4 grid gap-4">
            <EvidenceList
              title="Specific claims"
              items={receipts.specificClaims}
              emptyLabel="No numbers, dates, results, or hard claims found yet."
            />
            <EvidenceList
              title="Buyer moments"
              items={receipts.buyerMoments}
              emptyLabel="No concrete buyer moments found yet."
            />
            <EvidenceList
              title="Exact site language"
              items={receipts.exactSiteLanguage}
              emptyLabel="No reusable site language found yet."
            />
            <EvidenceList
              title="Named proof"
              items={[...receipts.namedProof, ...receipts.reviews]}
              emptyLabel="No named testimonials or review proof found yet."
            />
          </div>

          <div className="mt-4 rounded-3xl border border-slate-200 bg-white p-4">
            <h3 className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">
              Brand assets
            </h3>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              {images.length > 0 ? images.map((image) => (
                <a
                  key={`${image.label}-${image.url}`}
                  href={image.url}
                  target="_blank"
                  rel="noreferrer"
                  className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 transition hover:border-slate-300"
                >
                  <div className="grid aspect-[4/3] place-items-center bg-white p-4">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={image.url}
                      alt=""
                      className="max-h-full max-w-full object-contain"
                    />
                  </div>
                  <p className="flex items-center gap-2 px-3 py-2 text-xs font-black text-slate-600">
                    <ImageIcon className="h-3.5 w-3.5" />
                    {image.label}
                  </p>
                </a>
              )) : (
                <p className="rounded-2xl bg-slate-50 px-3 py-2 text-sm font-bold text-slate-400 sm:col-span-3">
                  No image assets found yet.
                </p>
              )}
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {colors.map((color) => (
                <span
                  key={color}
                  className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 py-1 pl-1 pr-3 text-xs font-black text-slate-600"
                >
                  <span
                    className="h-6 w-6 rounded-full border border-slate-200"
                    style={{ backgroundColor: color }}
                  />
                  {color}
                </span>
              ))}
            </div>
          </div>

          <div className="mt-4 grid gap-4">
            <EvidenceList
              title="Headings"
              items={research?.headings.slice(0, 12) || []}
              emptyLabel="No headings available."
            />
            <EvidenceList
              title="Page snippets"
              items={research?.paragraphs.slice(0, 12) || []}
              emptyLabel="No page snippets available."
            />
          </div>
        </div>

        <footer className="border-t border-slate-200 bg-white px-5 py-4">
          <p className="flex items-center gap-2 text-xs font-black text-slate-500">
            <SearchCheck className="h-4 w-4" />
            Empty sections stay empty on purpose. Wiggly should not invent receipts.
          </p>
        </footer>
      </aside>
    </div>
  );
}
