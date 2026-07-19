"use client";

import { useMemo, useState } from "react";
import { Check, Search, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  isBestSellerProduct,
  sortReviewProductsForSelection,
} from "@/features/formats/reviews/productSelection";
import type {
  ThreeDBreakdownStorySubject,
  ThreeDBreakdownStorySubjectKind,
} from "@/features/formats/three-d-breakdown/storySubject";
import type { ProductCatalog } from "@/features/research/types";

const options: Array<{
  kind: ThreeDBreakdownStorySubjectKind;
  title: string;
  description: string;
}> = [
  {
    kind: "product",
    title: "A specific product",
    description: "Lock the script, visuals, and CTA to one real item from this website.",
  },
  {
    kind: "brand",
    title: "Tell the brand story",
    description: "Explain why this approach exists, or its origin when the website proves it.",
  },
  {
    kind: "customer-problem",
    title: "Expose a customer problem",
    description: "Find the hidden friction or truth buyers have not noticed.",
  },
  {
    kind: "custom",
    title: "Start with my angle",
    description: "Give Wiggly the premise, audience, use case, or campaign moment.",
  },
];

export function CreateThreeDBreakdownSubjectPicker({
  catalog,
  onContinue,
}: {
  catalog: ProductCatalog | null | undefined;
  onContinue: (subject: ThreeDBreakdownStorySubject) => void;
}) {
  const products = useMemo(
    () => sortReviewProductsForSelection(catalog?.products || []),
    [catalog?.products],
  );
  const [kind, setKind] = useState<ThreeDBreakdownStorySubjectKind>("brand");
  const [productHandle, setProductHandle] = useState("");
  const [brief, setBrief] = useState("");
  const [search, setSearch] = useState("");
  const selectedProduct = products.find((product) => product.handle === productHandle) || null;
  const filteredProducts = products.filter((product) => (
    [product.title, product.productType || "", product.vendor || ""]
      .join(" ")
      .toLowerCase()
      .includes(search.trim().toLowerCase())
  ));
  const ready = kind === "product"
    ? Boolean(selectedProduct?.imageUrl)
    : kind === "custom"
      ? brief.trim().length >= 8
      : true;

  const continueToDirections = () => {
    if (!ready) return;
    onContinue({
      kind,
      ...(kind === "product" ? { productHandle } : {}),
      ...(kind === "custom" ? { brief: brief.trim() } : {}),
    });
  };

  return (
    <section className="rounded-[1.6rem] border border-slate-200 bg-white p-4 shadow-xl shadow-slate-950/6" data-three-d-subject-picker="true">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Step 1</p>
          <h3 className="mt-1 text-lg font-black text-slate-950">What should this breakdown be about?</h3>
          <p className="mt-1 text-[11px] font-bold leading-4 text-slate-500">Pick the subject before Wiggly writes five story concepts.</p>
        </div>
        <Sparkles className="mt-1 size-5 text-sky-500" />
      </div>

      <div className="mt-4 grid gap-2">
        {options.map((option) => {
          const selected = kind === option.kind;
          return (
            <button
              key={option.kind}
              type="button"
              onClick={() => setKind(option.kind)}
              className={[
                "rounded-2xl border p-3 text-left transition",
                selected ? "border-slate-950 bg-slate-950 text-white" : "border-slate-200 bg-slate-50 text-slate-950 hover:border-slate-300",
              ].join(" ")}
              data-three-d-subject-option={option.kind}
            >
              <p className="text-sm font-black">{option.title}</p>
              <p className={["mt-1 text-[11px] font-semibold leading-4", selected ? "text-white/70" : "text-slate-500"].join(" ")}>{option.description}</p>
            </button>
          );
        })}
      </div>

      {kind === "product" ? (
        <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 p-3">
          {products.length ? (
            <Sheet>
              <SheetTrigger asChild>
                <Button type="button" variant="outline" className="h-auto w-full justify-between rounded-xl border-slate-200 bg-white px-3 py-2 text-left hover:bg-white" data-three-d-choose-product="true">
                  <span>
                    <span className="block text-[10px] font-black uppercase tracking-[0.13em] text-slate-400">Product</span>
                    <span className="mt-1 block text-xs font-black text-slate-950">{selectedProduct ? selectedProduct.title : "Choose from all " + products.length + " products"}</span>
                  </span>
                  <span className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">Browse</span>
                </Button>
              </SheetTrigger>
              <SheetContent className="flex w-full flex-col border-slate-200 bg-white p-0 sm:max-w-3xl">
                <SheetHeader className="border-b border-slate-200 px-6 py-5 text-left">
                  <SheetTitle className="text-2xl font-black tracking-tight text-slate-950">Choose a product</SheetTitle>
                  <SheetDescription className="font-semibold leading-6 text-slate-500">Every product found on this website is here. Wiggly will keep your selection locked through the script, product image, and CTA.</SheetDescription>
                </SheetHeader>
                <div className="border-b border-slate-200 px-6 py-4">
                  <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                    <Search className="size-4 text-slate-400" />
                    <input suppressHydrationWarning value={search} onChange={(event) => setSearch(event.target.value)} className="w-full bg-transparent text-sm font-semibold text-slate-950 outline-none placeholder:text-slate-400" placeholder="Search all products" />
                  </label>
                </div>
                <div className="grid flex-1 auto-rows-max grid-cols-2 items-start gap-3 overflow-y-auto p-6 sm:grid-cols-3">
                  {filteredProducts.map((product) => {
                    const selected = product.handle === productHandle;
                    const usable = Boolean(product.imageUrl);
                    return (
                      <button
                        key={product.handle}
                        type="button"
                        onClick={() => usable && setProductHandle(product.handle)}
                        disabled={!usable}
                        className={[
                          "relative min-h-[18.5rem] overflow-hidden rounded-2xl border bg-white text-left shadow-sm transition",
                          selected ? "border-slate-950 ring-2 ring-slate-950" : "border-slate-200 hover:border-slate-300",
                          usable ? "" : "cursor-not-allowed opacity-55",
                        ].join(" ")}
                        data-three-d-product={product.handle}
                      >
                        <div className="aspect-square bg-slate-100">
                          {product.imageUrl ? <img src={product.imageUrl} alt={product.imageAlt || product.title} className="size-full object-cover" /> : <div className="grid size-full place-items-center px-3 text-center text-xs font-black text-slate-400">No product image</div>}
                        </div>
                        {selected ? <span className="absolute right-2 top-2 grid size-7 place-items-center rounded-lg bg-slate-950 text-white shadow-sm"><Check className="size-4" /></span> : null}
                        {isBestSellerProduct(product) ? <span className="absolute left-2 top-2 rounded-full bg-amber-300 px-2 py-1 text-[9px] font-black uppercase tracking-[0.1em] text-slate-950">Best seller</span> : null}
                        <div className="p-3">
                          <p className="line-clamp-2 min-h-10 text-xs font-black leading-5 text-slate-950">{product.title}</p>
                          {!usable ? <p className="mt-1 text-[10px] font-bold text-slate-400">Needs a product image</p> : null}
                        </div>
                      </button>
                    );
                  })}
                </div>
                <div className="border-t border-slate-200 p-5">
                  <SheetClose asChild>
                    <Button type="button" disabled={!selectedProduct?.imageUrl} className="w-full rounded-xl bg-slate-950 text-xs font-black uppercase tracking-[0.12em] text-white">Use selected product</Button>
                  </SheetClose>
                </div>
              </SheetContent>
            </Sheet>
          ) : (
            <p className="text-xs font-bold leading-5 text-slate-500">This website did not expose a product catalog. Choose a brand, customer problem, or custom story instead.</p>
          )}
        </div>
      ) : null}

      {kind === "custom" ? (
        <label className="mt-3 block">
          <span className="text-[10px] font-black uppercase tracking-[0.13em] text-slate-400">Your direction</span>
          <textarea suppressHydrationWarning value={brief} onChange={(event) => setBrief(event.target.value)} className="mt-2 min-h-24 w-full resize-y rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm font-semibold leading-5 text-slate-950 outline-none placeholder:text-slate-400 focus:border-slate-950" placeholder="Explain the premise, audience, use case, or campaign moment." data-three-d-custom-brief="true" />
        </label>
      ) : null}

      <Button type="button" onClick={continueToDirections} disabled={!ready} className="mt-4 h-10 w-full rounded-2xl bg-slate-950 text-xs font-black uppercase tracking-[0.12em] text-white" data-three-d-subject-continue="true">
        Generate 5 story concepts
      </Button>
    </section>
  );
}
