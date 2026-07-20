"use client";

import type { ProductCatalog } from "@/features/research/types";

export function CreateThreeDSubjectPicker({
  catalog,
  needsSpecificPage,
  selectedHandle,
  subjectUrl,
  onSelectedHandleChange,
  onSubjectUrlChange,
}: {
  catalog?: ProductCatalog | null;
  needsSpecificPage: boolean;
  selectedHandle: string;
  subjectUrl: string;
  onSelectedHandleChange: (handle: string) => void;
  onSubjectUrlChange: (url: string) => void;
}) {
  const products = catalog?.products || [];
  const selectedProduct = products.find((product) => product.handle === selectedHandle);

  if (products.length) {
    return (
      <label className="block">
        <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Video subject</span>
        <select
          suppressHydrationWarning
          aria-label="3D Breakdown subject"
          className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-black text-slate-900 outline-none transition focus:border-indigo-300 focus:bg-white focus:ring-4 focus:ring-indigo-500/10"
          value={selectedHandle}
          onChange={(event) => onSelectedHandleChange(event.target.value)}
        >
          <option value="">Choose what this video is about</option>
          <option value="brand-overview">The whole brand</option>
          {products.map((product) => (
            <option key={product.handle} value={product.handle}>{product.title}</option>
          ))}
        </select>
        <span className="mt-1.5 block text-xs font-semibold leading-5 text-slate-500">
          {selectedProduct
            ? `Wiggly will read ${selectedProduct.title}'s product page before writing the story.`
            : selectedHandle === "brand-overview"
              ? "Wiggly will use the whole brand when this page has enough concrete detail."
              : `${products.length} products found. Pick one, or use the whole brand.`}
        </span>
      </label>
    );
  }

  if (!needsSpecificPage) return null;
  return (
    <label className="block">
      <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Product or feature page</span>
      <input
        suppressHydrationWarning
        aria-label="3D Breakdown product page"
        className="h-12 w-full rounded-2xl border border-amber-200 bg-amber-50 px-4 text-sm font-bold text-slate-900 outline-none transition focus:border-amber-300 focus:bg-white focus:ring-4 focus:ring-amber-500/10"
        type="url"
        placeholder="https://brand.com/product/..."
        value={subjectUrl}
        onChange={(event) => onSubjectUrlChange(event.target.value)}
      />
      <span className="mt-1.5 block text-xs font-semibold leading-5 text-slate-500">
        The homepage is too broad for a useful 3D story. Paste one specific product or feature page.
      </span>
    </label>
  );
}
