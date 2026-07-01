import type { StoredWebsiteResearchResult } from "@/features/research/types";
import {
  isBestSellerProduct,
  sortReviewProductsForSelection,
} from "@/features/formats/reviews/productSelection";

const getCreativeBriefHighlights = (result: StoredWebsiteResearchResult | null) => {
  if (!result) return [];

  return [
    { label: "Offer", value: result.brandBrief.offer },
    { label: "Audience", value: result.brandBrief.audience },
    { label: "Hook", value: result.brandBrief.buyerMoments[0] || result.brandBrief.proof[0] || result.brand.description },
  ].filter((item) => item.value.trim());
};

const getCreativeBriefProducts = (result: StoredWebsiteResearchResult | null) => {
  const products = sortReviewProductsForSelection(result?.productCatalog?.products || []);
  return products.slice(0, 5);
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
  const products = getCreativeBriefProducts(result);
  const productCount = result.productCatalog?.summary.productCount || products.length;
  const bestSellerCount = result.productCatalog?.summary.bestSellerCount || products.filter(isBestSellerProduct).length;

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
        {products.length ? (
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Products</p>
            <p className="mt-1 text-xs font-black uppercase tracking-[0.12em] text-slate-500">
              {productCount} found{bestSellerCount ? ` · ${bestSellerCount} best sellers` : ""}
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5" data-create-brief-products="true">
              {products.map((product) => (
                <span
                  key={product.handle}
                  className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-black leading-4 text-slate-700"
                >
                  {product.title}{isBestSellerProduct(product) ? " · best seller" : ""}
                </span>
              ))}
            </div>
          </div>
        ) : null}
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
