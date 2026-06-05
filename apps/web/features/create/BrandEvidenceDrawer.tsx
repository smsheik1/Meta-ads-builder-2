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

const toDebugJson = (value: unknown) => JSON.stringify(value, null, 2);

function EvidenceList({ emptyLabel, items, title }: EvidenceListProps) {
  const visibleItems = nonEmpty(items);

  return (
    <section>
      <h3 className="text-sm font-black uppercase tracking-wide text-slate-500">
        {title}
      </h3>
      {visibleItems.length > 0 ? (
        <ul className="mt-3 space-y-2">
          {visibleItems.map((item) => (
            <li
              key={item}
              className="rounded-2xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-black leading-5 text-slate-900"
            >
              {item}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-sm font-bold text-slate-600">
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
  const fullResearchDump = {
    research,
    quality,
    sceneBrand: scene.brand,
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4">
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="Close brand evidence"
        onClick={onClose}
      />
      <aside
        className="relative flex h-[86vh] w-full max-w-6xl flex-col overflow-hidden rounded-[28px] border border-slate-300 bg-white shadow-2xl shadow-slate-950/30"
        data-testid="brand-evidence-drawer"
      >
        <header className="flex items-start justify-between gap-4 border-b border-slate-200 bg-white px-6 py-5">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">
              Full brand dump
            </p>
            <h2 className="mt-1 text-3xl font-black leading-tight text-slate-950">
              {scene.brand.name}
            </h2>
            <p className="mt-1 max-w-2xl text-base font-bold text-slate-600">
              {scene.brand.websiteUrl}
            </p>
          </div>
          <button
            type="button"
            className="grid h-12 w-12 shrink-0 place-items-center rounded-full border border-slate-300 bg-white text-slate-800 shadow-sm transition hover:bg-slate-50"
            aria-label="Close brand evidence"
            onClick={onClose}
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="grid min-h-0 flex-1 overflow-hidden lg:grid-cols-[0.92fr_1.08fr]">
          <div className="min-h-0 overflow-y-auto border-r border-slate-200 bg-white p-6">
            <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-1">
              <div className="rounded-2xl border border-slate-300 bg-white p-3 shadow-sm">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Quality</p>
                <p className="mt-1 text-2xl font-black text-slate-950">
                  {quality ? `${quality.score}/100` : 'N/A'}
                </p>
                <p className="mt-1 text-xs font-bold uppercase tracking-wide text-slate-600">
                  {quality?.level || 'No score yet'}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-300 bg-white p-3 shadow-sm">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Copy read</p>
                <p className="mt-1 text-2xl font-black text-slate-950">
                  {(research?.headings.length || 0) + (research?.paragraphs.length || 0)}
                </p>
                <p className="mt-1 text-xs font-bold uppercase tracking-wide text-slate-600">
                  headings + snippets
                </p>
              </div>
              <a
                href={scene.brand.websiteUrl}
                target="_blank"
                rel="noreferrer"
                className="rounded-2xl border border-slate-300 bg-white p-3 shadow-sm transition hover:bg-slate-50"
              >
                <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Website</p>
                <p className="mt-2 flex items-center gap-2 text-sm font-black leading-5 text-slate-950">
                  {host}
                  <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                </p>
              </a>
            </div>

            <section className="mt-6">
              <h3 className="text-sm font-black uppercase tracking-wide text-slate-500">Images Firecrawl found</h3>
              {images.length > 0 ? (
                <div className="mt-3 grid grid-cols-2 gap-3">
                  {images.map((image) => (
                    <a
                      key={`${image.label}-${image.url}`}
                      href={image.url}
                      target="_blank"
                      rel="noreferrer"
                      className="group overflow-hidden rounded-2xl border border-slate-300 bg-white p-3 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                    >
                      <div className="flex aspect-[1.5] items-center justify-center rounded-xl bg-slate-50 p-3">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={image.url}
                          alt=""
                          className="max-h-full max-w-full object-contain"
                        />
                      </div>
                      <p className="mt-2 flex items-center gap-2 text-xs font-black text-slate-800">
                        <ImageIcon className="h-3.5 w-3.5 shrink-0" />
                        {image.label}
                      </p>
                      <p className="mt-1 line-clamp-2 break-all text-xs font-bold leading-4 text-slate-600 group-hover:text-slate-900">
                        {image.url}
                      </p>
                    </a>
                  ))}
                </div>
              ) : (
                <p className="mt-2 text-sm font-bold text-slate-600">No images came back yet.</p>
              )}
            </section>

            <section className="mt-6">
              <h3 className="text-sm font-black uppercase tracking-wide text-slate-500">Colors</h3>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {colors.map((color, index) => (
                  <div key={`${color}-${index}`} className="flex items-center gap-3 rounded-2xl border border-slate-300 bg-white p-2.5">
                    <span
                      className="h-9 w-9 shrink-0 rounded-xl border border-slate-200 shadow-inner"
                      style={{ backgroundColor: color }}
                    />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-black text-slate-900">Color {index + 1}</span>
                      <span className="block text-xs font-bold text-slate-600">{color}</span>
                    </span>
                  </div>
                ))}
              </div>
            </section>

            <section className="mt-6">
              <h3 className="text-sm font-black uppercase tracking-wide text-slate-500">Research providers</h3>
              <div className="mt-3 flex flex-wrap gap-2">
                {(research?.providerStatus || []).map((provider) => (
                  <span
                    key={`${provider.provider}-${provider.status}`}
                    className="rounded-full border border-slate-300 bg-white px-3 py-2 text-xs font-black uppercase tracking-wide text-slate-700"
                    title={provider.reason}
                  >
                    {provider.provider} {provider.status}
                  </span>
                ))}
                {!research?.providerStatus.length && (
                  <span className="rounded-full border border-slate-300 bg-white px-3 py-2 text-xs font-black uppercase tracking-wide text-slate-500">
                    No provider status
                  </span>
                )}
              </div>
            </section>
          </div>

          <div className="min-h-0 overflow-y-auto bg-white p-6">
            <div className="space-y-6">
              <EvidenceList
                title="Useful claims"
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
              <section>
                <h3 className="text-sm font-black uppercase tracking-wide text-slate-500">Headings</h3>
                <pre className="mt-3 max-h-56 overflow-auto rounded-2xl border border-slate-800 bg-slate-950 p-4 font-mono text-sm font-bold leading-6 text-white">
                  {(research?.headings.slice(0, 12) || []).join('\n') || 'No headings available.'}
                </pre>
              </section>
              <section>
                <h3 className="text-sm font-black uppercase tracking-wide text-slate-500">Page snippets</h3>
                <pre className="mt-3 max-h-72 overflow-auto rounded-2xl border border-slate-800 bg-slate-950 p-4 font-mono text-sm font-bold leading-6 text-white">
                  {(research?.paragraphs.slice(0, 12) || []).join('\n\n') || 'No page snippets available.'}
                </pre>
              </section>
              <section>
                <h3 className="text-sm font-black uppercase tracking-wide text-slate-500">Full structured dump</h3>
                <pre
                  className="mt-3 max-h-96 overflow-auto rounded-2xl border border-slate-800 bg-slate-950 p-4 font-mono text-xs font-bold leading-5 text-white"
                  data-testid="full-structured-brand-dump"
                >
                  {toDebugJson(fullResearchDump)}
                </pre>
              </section>
            </div>
          </div>
        </div>

        <footer className="border-t border-slate-200 bg-white px-6 py-4">
          <p className="flex items-center gap-2 text-xs font-black text-slate-500">
            <SearchCheck className="h-4 w-4" />
            Empty sections stay empty on purpose. Wiggly should not invent receipts.
          </p>
        </footer>
      </aside>
    </div>
  );
}
