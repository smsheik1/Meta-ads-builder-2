import {
  Camera,
  Check,
  Download,
  FileText,
  Loader2,
  RotateCcw,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
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
import {
  PRODUCT_PHOTOSHOOT_SHOT_COUNT,
  hasUsableProductPhotoshootBoard,
  type ProductPhotoshootBoard,
} from "@/features/product-photoshoot/photoshoot";
import type { ProductCatalog } from "@/features/research/types";
import { useState } from "react";

type ProductPhotoshootStatus = "idle" | "loading" | "ready" | "error";

export function CreateProductPhotoshootSheet({
  board,
  canGenerate,
  catalog,
  error,
  onGenerate,
  onRegenerateFailedShots,
  onRegenerateShot,
  onSelectedProductChange,
  selectedProductHandle,
  shotBusyIndex,
  status,
}: {
  board: ProductPhotoshootBoard | null;
  canGenerate: boolean;
  catalog: ProductCatalog | null | undefined;
  error: string;
  onGenerate: () => void;
  onRegenerateFailedShots: () => void;
  onRegenerateShot: (shotIndex: number) => void;
  onSelectedProductChange: (handle: string) => void;
  selectedProductHandle: string;
  shotBusyIndex: number | null;
  status: ProductPhotoshootStatus;
}) {
  const [query, setQuery] = useState("");
  const products = sortReviewProductsForSelection(catalog?.products || []).filter((product) => product.imageUrl);
  const selectedProduct = products.find((product) => product.handle === selectedProductHandle) || products[0];
  const filteredProducts = products.filter((product) => {
    const text = `${product.title} ${product.productType || ""} ${product.vendor || ""}`.toLowerCase();
    return text.includes(query.trim().toLowerCase());
  });
  const busy = status === "loading";
  const hasUsableBoard = hasUsableProductPhotoshootBoard(board);
  const readyShotCount = board?.shots.filter((shot) => shot.status === "ok" && shot.image?.url).length || 0;
  const failedShotCount = board?.shots.filter((shot) => shot.status === "failed").length || 0;
  const canRetryFailedShots = hasUsableBoard && failedShotCount > 0;

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={!canGenerate && !board}
          className="h-auto min-h-16 w-full justify-start rounded-2xl border-slate-200 bg-white px-4 py-3 text-left shadow-lg shadow-slate-950/5"
          data-product-photoshoot-trigger="true"
        >
          <span className="flex w-full items-center gap-3">
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Camera className="size-4" />}
            <span className="min-w-0">
              <span className="block truncate text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
                Product photoshoot
              </span>
              <span className="block truncate text-sm font-black tracking-normal text-slate-800">
                {busy ? "Generating six shots" : hasUsableBoard ? "View photoshoot" : "Generate product shots"}
              </span>
            </span>
          </span>
        </Button>
      </SheetTrigger>
      <SheetContent className="w-[860px] overflow-y-auto border-slate-200 bg-white p-0 sm:max-w-[900px]">
        <SheetHeader className="border-b border-slate-200 px-5 py-5 text-left">
          <SheetTitle className="text-2xl font-black tracking-tight text-slate-950">
            Product photoshoot
          </SheetTitle>
          <SheetDescription className="font-semibold text-slate-500">
            Pick one product, then generate six ad-ready stills with the product locked from its real image.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-5 p-5">
          {products.length ? (
            <section className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Product reference</p>
                  <p className="mt-1 text-sm font-bold text-slate-500">
                    {catalog?.summary.productCount || products.length} products found · {catalog?.summary.bestSellerCount || products.filter(isBestSellerProduct).length} best sellers
                  </p>
                </div>
                <div className="flex min-w-[220px] items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-2">
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

              <div className="flex gap-3 overflow-x-auto pb-1" data-product-photoshoot-products="true">
                {filteredProducts.slice(0, 18).map((product) => {
                  const selected = product.handle === selectedProduct?.handle;
                  return (
                    <button
                      key={product.handle}
                      type="button"
                      onClick={() => onSelectedProductChange(product.handle)}
                      className={`relative w-36 shrink-0 overflow-hidden rounded-2xl border bg-white text-left shadow-sm transition ${
                        selected
                          ? "border-amber-400 ring-2 ring-amber-300"
                          : "border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      <div className="aspect-square bg-slate-100">
                        <img
                          alt={product.imageAlt || product.title}
                          src={product.imageUrl || ""}
                          className="size-full object-cover"
                        />
                      </div>
                      {selected ? (
                        <span className="absolute right-2 top-2 grid size-7 place-items-center rounded-lg bg-amber-200 text-slate-950 shadow-sm">
                          <Check className="size-4" />
                        </span>
                      ) : null}
                      {isBestSellerProduct(product) ? (
                        <span className="absolute left-2 top-2 rounded-full bg-amber-300 px-2 py-1 text-[9px] font-black uppercase tracking-[0.1em] text-slate-950">
                          Best seller
                        </span>
                      ) : null}
                      <p className="line-clamp-2 min-h-11 p-2 text-xs font-black leading-5 text-slate-950">
                        {product.title}
                      </p>
                    </button>
                  );
                })}
              </div>
            </section>
          ) : (
            <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-5 text-sm font-bold leading-6 text-slate-500">
              Product photoshoots need an ecommerce product with an image. Submit a Shopify-style store first.
            </div>
          )}

          <div className="grid gap-2">
            {canRetryFailedShots ? (
              <Button
                type="button"
                variant="outline"
                onClick={onRegenerateFailedShots}
                disabled={busy || shotBusyIndex !== null}
                className="h-11 w-full rounded-2xl border-amber-200 bg-amber-50 text-xs font-black uppercase tracking-[0.12em] text-amber-900 hover:bg-amber-100"
                data-product-photoshoot-regenerate-failed="true"
              >
                {shotBusyIndex !== null ? <Loader2 className="mr-2 size-4 animate-spin" /> : <RotateCcw className="mr-2 size-4" />}
                Retry failed shots
              </Button>
            ) : null}
            <Button
              type="button"
              onClick={onGenerate}
              disabled={!canGenerate || busy || shotBusyIndex !== null}
              className="h-11 w-full rounded-2xl bg-slate-950 text-xs font-black uppercase tracking-[0.12em] text-white hover:bg-slate-800"
              data-product-photoshoot-generate="true"
            >
              {busy ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Camera className="mr-2 size-4" />}
              {hasUsableBoard ? "Regenerate all shots" : "Generate photoshoot"}
            </Button>
          </div>

          {error ? (
            <p className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold leading-5 text-red-700">
              {error}
            </p>
          ) : null}

          {busy ? (
            <div className="grid min-h-72 place-items-center rounded-3xl border border-slate-200 bg-slate-50 text-sm font-black uppercase tracking-[0.12em] text-slate-500">
              Generating product stills
            </div>
          ) : board && !hasUsableBoard ? (
            <div
              className="rounded-3xl border border-dashed border-amber-200 bg-amber-50 p-5 text-sm font-bold leading-6 text-amber-900"
              data-product-photoshoot-empty-board="true"
            >
              No usable product shots were stored. Add Replicate credit and generate again.
            </div>
          ) : hasUsableBoard && board ? (
            <section className="space-y-3" data-product-photoshoot-board="true">
              <div className="flex items-end justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
                    {readyShotCount} of {PRODUCT_PHOTOSHOOT_SHOT_COUNT} shots ready
                    {failedShotCount ? ` · ${failedShotCount} needs retry` : ""}
                  </p>
                  <p className="mt-1 text-lg font-black text-slate-950">{board.product.title}</p>
                </div>
                <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-black text-slate-600">
                  {board.aspectRatio}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                {board.shots.map((shot) => (
                  <article
                    key={shot.shotIndex}
                    className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-lg shadow-slate-950/5"
                  >
                    <div className="bg-slate-950">
                      {shot.image?.url ? (
                        <img
                          alt=""
                          className="aspect-[4/5] w-full object-cover"
                          src={shot.image.url}
                        />
                      ) : (
                        <div className="grid aspect-[4/5] place-items-center px-4 text-center text-xs font-bold text-white/60">
                          {shot.status === "failed" ? "Image failed" : "No image"}
                        </div>
                      )}
                    </div>
                    <div className="space-y-2 p-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
                          {shot.label}
                        </p>
                        <span className={`rounded-full px-2 py-1 text-[10px] font-black uppercase tracking-[0.12em] ${
                          shot.status === "failed"
                            ? "bg-red-50 text-red-600"
                            : shot.status === "ok"
                              ? "bg-emerald-50 text-emerald-600"
                              : "bg-slate-100 text-slate-500"
                        }`}
                        >
                          {shot.status}
                        </span>
                      </div>
                      {shot.error ? <p className="text-xs font-bold text-red-600">{shot.error}</p> : null}
                      <div className="grid grid-cols-3 gap-2 pt-1">
                        <Button
                          type="button"
                          variant="outline"
                          disabled={busy || shotBusyIndex !== null}
                          onClick={() => onRegenerateShot(shot.shotIndex)}
                          className="h-9 rounded-2xl border-slate-200 text-[10px] font-black uppercase tracking-[0.12em]"
                          data-product-shot-regenerate={shot.shotIndex}
                        >
                          {shotBusyIndex === shot.shotIndex ? (
                            <Loader2 className="size-3 animate-spin" />
                          ) : (
                            <RotateCcw className="size-3" />
                          )}
                        </Button>
                        {shot.image?.url ? (
                          <a
                            className="grid h-9 place-items-center rounded-2xl border border-slate-200 text-slate-700"
                            href={shot.image.url}
                            download
                            title="Download shot"
                          >
                            <Download className="size-3" />
                          </a>
                        ) : (
                          <span className="grid h-9 place-items-center rounded-2xl border border-slate-200 text-slate-300">
                            <Download className="size-3" />
                          </span>
                        )}
                        <details
                          className="group rounded-2xl border border-slate-200 bg-white"
                          data-product-shot-prompt={shot.shotIndex}
                        >
                          <summary className="flex h-9 cursor-pointer list-none items-center justify-center gap-2 rounded-2xl text-[10px] font-black uppercase tracking-[0.12em] text-slate-700 [&::-webkit-details-marker]:hidden">
                            <FileText className="size-3" />
                          </summary>
                          <pre className="absolute z-10 mt-2 max-h-56 max-w-sm overflow-auto whitespace-pre-wrap rounded-2xl bg-slate-950 p-3 text-[11px] font-bold leading-5 text-slate-100 shadow-2xl">
                            {shot.prompt}
                          </pre>
                        </details>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}
