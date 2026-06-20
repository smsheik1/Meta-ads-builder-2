import { useState } from "react";
import { Check, Search, X } from "lucide-react";
import {
  MAX_REVIEW_PRODUCT_SELECTION,
  isBestSellerProduct,
  sortReviewProductsForSelection,
} from "@/features/formats/reviews/productSelection";
import type { ProductCatalog } from "@/features/research/types";

export function CreateReviewsProductPicker({
  catalog,
  selectedHandles,
  onSelectionChange,
}: {
  catalog: ProductCatalog | null | undefined;
  selectedHandles: string[];
  onSelectionChange: (handles: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const products = sortReviewProductsForSelection(catalog?.products || []);
  const selectedSet = new Set(selectedHandles);
  const productCount = catalog?.summary?.productCount || products.length;
  const bestSellerCount = catalog?.summary?.bestSellerCount || products.filter(isBestSellerProduct).length;
  const filteredProducts = products.filter((product) => {
    const text = `${product.title} ${product.productType || ""} ${product.vendor || ""}`.toLowerCase();
    return text.includes(query.trim().toLowerCase());
  });

  const toggleProduct = (handle: string) => {
    if (selectedSet.has(handle)) {
      onSelectionChange(selectedHandles.filter((value) => value !== handle));
      return;
    }
    if (selectedHandles.length >= MAX_REVIEW_PRODUCT_SELECTION) return;
    onSelectionChange([...selectedHandles, handle]);
  };

  if (!catalog) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs font-bold leading-5 text-slate-500">
        Submit a website to look for proof products.
      </div>
    );
  }

  if (!catalog.products.length) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs font-bold leading-5 text-slate-500">
        No product catalog found. Reviews will use site-wide proof.
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Proof products</p>
          <p className="mt-1 text-sm font-black text-slate-950">
            {productCount} products found · {bestSellerCount} best sellers
          </p>
          <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">
            {selectedHandles.length ? `${selectedHandles.length} selected for review proof` : "Pick products to prioritize."}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="shrink-0 rounded-full bg-slate-950 px-4 py-2 text-xs font-black text-white shadow-sm transition hover:bg-slate-800"
        >
          Choose
        </button>
      </div>

      {open ? (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-slate-950/55 px-3 py-5"
          role="dialog"
          aria-modal="true"
          aria-label="Choose products for review proof"
        >
          <div className="flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-[28px] bg-white shadow-2xl shadow-slate-950/30">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 p-5 sm:p-6">
              <div>
                <h2 className="text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">Choose proof products</h2>
                <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-slate-500">
                  Best sellers are preselected. Pick up to {MAX_REVIEW_PRODUCT_SELECTION} products Wiggly should prioritize when finding real reviews.
                </p>
              </div>
              <button
                type="button"
                aria-label="Close product picker"
                onClick={() => setOpen(false)}
                className="grid size-10 shrink-0 place-items-center rounded-full bg-slate-100 text-slate-600 transition hover:bg-slate-200"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 px-5 py-3 sm:px-6">
              <button
                type="button"
                onClick={() => onSelectionChange(products
                  .filter(isBestSellerProduct)
                  .slice(0, MAX_REVIEW_PRODUCT_SELECTION)
                  .map((product) => product.handle))}
                className="rounded-full bg-amber-100 px-3 py-1.5 text-xs font-black text-amber-800 transition hover:bg-amber-200"
              >
                Best sellers
              </button>
              <button
                type="button"
                onClick={() => onSelectionChange([])}
                className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-black text-slate-600 transition hover:bg-slate-200"
              >
                Clear
              </button>
              <span className="rounded-full bg-slate-950 px-3 py-1.5 text-xs font-black text-white">
                {selectedHandles.length}/{MAX_REVIEW_PRODUCT_SELECTION} selected
              </span>
              <div className="ml-auto flex min-w-[220px] flex-1 items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-2 sm:max-w-sm">
                <Search className="size-4 shrink-0 text-slate-400" />
                <input
                  suppressHydrationWarning
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  className="w-full bg-transparent text-sm font-semibold text-slate-900 outline-none placeholder:text-slate-400"
                  placeholder="Search products"
                />
              </div>
            </div>

            <div className="overflow-y-auto p-5 sm:p-6">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {filteredProducts.map((product) => {
                  const selected = selectedSet.has(product.handle);
                  const disabled = !selected && selectedHandles.length >= MAX_REVIEW_PRODUCT_SELECTION;
                  return (
                    <button
                      key={product.handle}
                      type="button"
                      disabled={disabled}
                      onClick={() => toggleProduct(product.handle)}
                      className={`group relative overflow-hidden rounded-2xl border bg-white text-left shadow-sm transition ${
                        selected
                          ? "border-amber-400 ring-2 ring-amber-300"
                          : "border-slate-200 hover:border-slate-300"
                      } ${disabled ? "cursor-not-allowed opacity-45" : ""}`}
                    >
                      <div className="aspect-square bg-slate-100">
                        {product.imageUrl ? (
                          <img
                            alt={product.imageAlt || product.title}
                            src={product.imageUrl}
                            className="size-full object-cover"
                          />
                        ) : (
                          <div className="grid size-full place-items-center px-3 text-center text-xs font-black text-slate-400">
                            No image
                          </div>
                        )}
                      </div>
                      <span className={`absolute right-2 top-2 grid size-8 place-items-center rounded-lg border text-sm font-black shadow-sm ${
                        selected ? "border-amber-400 bg-amber-200 text-slate-950" : "border-slate-200 bg-white/90 text-slate-300"
                      }`}>
                        {selected ? <Check className="size-4" /> : null}
                      </span>
                      {isBestSellerProduct(product) ? (
                        <span className="absolute left-2 top-2 rounded-full bg-amber-300 px-2 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-slate-950">
                          Best seller
                        </span>
                      ) : null}
                      <div className="p-3">
                        <p className="line-clamp-2 min-h-10 text-sm font-black leading-5 text-slate-950">{product.title}</p>
                        {product.priceMin !== null ? (
                          <p className="mt-1 text-xs font-bold text-slate-500">
                            ${product.priceMin.toFixed(2)}
                          </p>
                        ) : null}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 p-5 sm:p-6">
              <p className="text-xs font-bold leading-5 text-slate-500">
                Product choice only prioritizes where Wiggly looks for verbatim reviews. It will not invent product proof.
              </p>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white transition hover:bg-slate-800"
              >
                Use selected products
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
