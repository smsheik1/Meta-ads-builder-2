import type { ProductCatalog, ProductCatalogItem } from "../../research/types";

export const MAX_REVIEW_PRODUCT_SELECTION = 10;

export const isBestSellerProduct = (product: ProductCatalogItem) => product.badges?.includes("best-seller") || false;

export const sortReviewProductsForSelection = (products: ProductCatalogItem[]) => [...products].sort((a, b) => {
  const bestSellerDelta = Number(isBestSellerProduct(b)) - Number(isBestSellerProduct(a));
  if (bestSellerDelta) return bestSellerDelta;
  return a.title.localeCompare(b.title);
});

export const getDefaultReviewProductHandles = (catalog: ProductCatalog | null | undefined) => {
  const products = catalog?.products || [];
  const bestSellers = sortReviewProductsForSelection(products).filter(isBestSellerProduct);
  return bestSellers.slice(0, MAX_REVIEW_PRODUCT_SELECTION).map((product) => product.handle);
};

export const normalizeReviewProductHandles = (handles: string[] = []) => [...new Set(handles.map((handle) => handle.trim()).filter(Boolean))]
  .slice(0, MAX_REVIEW_PRODUCT_SELECTION);
