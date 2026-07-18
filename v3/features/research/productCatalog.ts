import type {
  ProductCatalog,
  ProductCatalogItem,
  ResearchProviderStatus,
  WebsiteResearchResult,
} from "./types";
import { normalizePublicWebsiteUrl } from "./url";

const SHOPIFY_PRODUCTS_LIMIT = 250;
const DEFAULT_TIMEOUT_MS = 5_000;
const BEST_SELLER_COLLECTION_HANDLES = [
  "best-sellers",
  "bestsellers",
  "best-selling",
  "best-seller",
];

type ShopifyProduct = {
  title?: string;
  handle?: string;
  vendor?: string;
  product_type?: string;
  tags?: string[];
  images?: Array<{
    src?: string;
    alt?: string | null;
  }>;
  variants?: Array<{
    price?: string;
    available?: boolean;
    currency_code?: string;
  }>;
};

type WooCommerceStoreProduct = {
  name?: string;
  slug?: string;
  permalink?: string;
  type?: string;
  is_in_stock?: boolean;
  prices?: {
    price?: string;
    currency_code?: string;
    currency_minor_unit?: number;
  };
  images?: Array<{
    src?: string;
    alt?: string;
    name?: string;
  }>;
};

const toNumberOrNull = (value: string | undefined) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

const wooPriceToNumberOrNull = (value: string | undefined, minorUnit: number | undefined) => {
  const number = Number(value);
  if (!Number.isFinite(number)) return null;
  return number / (10 ** (Number.isFinite(minorUnit) ? Number(minorUnit) : 2));
};

const decodeHtml = (value: string) => value
  .replace(/&amp;/g, "&")
  .replace(/&quot;/g, "\"")
  .replace(/&#39;/g, "'")
  .replace(/&lt;/g, "<")
  .replace(/&gt;/g, ">");

const productHandleFromUrl = (value: string) => {
  const match = value.match(/\/products\/([^/?#<"']+)/i);
  return match ? decodeURIComponent(match[1] || "").trim() : "";
};

const titleFromHandle = (handle: string) => handle
  .split("-")
  .filter(Boolean)
  .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
  .join(" ");

const firstMetadataText = (metadata: Record<string, unknown>, keys: string[]) => keys
  .map((key) => metadata[key])
  .find((value) => typeof value === "string" && value.trim())
  ?.toString()
  .trim() || "";

const productTitleFromMetadata = (metadata: Record<string, unknown>, fallbackHandle: string) => {
  const title = firstMetadataText(metadata, ["og:title", "ogTitle", "twitter:title", "title"])
    .split(/[|–—]/u)[0]
    .replace(/\s+/g, " ")
    .trim();
  return title || titleFromHandle(fallbackHandle);
};

const toHttpsImageUrl = (value: string) => {
  try {
    const parsed = new URL(value);
    if (parsed.protocol === "http:") parsed.protocol = "https:";
    return parsed.toString();
  } catch {
    return null;
  }
};

export const buildDirectProductPageCatalog = (
  research: Pick<WebsiteResearchResult, "finalUrl" | "metadata" | "websiteUrl"> & {
    brand: Pick<WebsiteResearchResult["brand"], "name" | "ogImageUrl">;
  },
): { catalog: ProductCatalog; providerStatus: ResearchProviderStatus } | null => {
  const productUrl = research.finalUrl || research.websiteUrl;
  const handle = productHandleFromUrl(productUrl);
  const metadata = research.metadata;
  const imageUrl = toHttpsImageUrl(firstMetadataText(metadata, [
    "og:image:secure_url",
    "ogImage",
    "og:image",
    "twitter:image",
  ]) || research.brand.ogImageUrl || "");

  if (!handle || !imageUrl) return null;

  const title = productTitleFromMetadata(metadata, handle);
  const price = toNumberOrNull(firstMetadataText(metadata, ["og:price:amount", "product:price:amount"]));
  const currency = firstMetadataText(metadata, ["og:price:currency", "product:price:currency"]) || null;
  const product: ProductCatalogItem = {
    title,
    handle,
    url: productUrl,
    imageUrl,
    imageAlt: title,
    productType: null,
    vendor: research.brand.name || null,
    priceMin: price,
    priceMax: price,
    currency,
    available: null,
    badges: [],
  };

  return {
    catalog: {
      provider: "scraped-product-page",
      sourceUrl: productUrl,
      groups: { bestSellers: [] },
      summary: { productCount: 1, bestSellerCount: 0 },
      products: [product],
    },
    providerStatus: {
      provider: "product-catalog",
      status: "used",
      reason: `Catalog endpoint was unavailable; used the submitted product page for ${title}.`,
    },
  };
};

const productLooksBestSellerTagged = (product: ShopifyProduct) => {
  const text = [
    product.title,
    product.handle,
    ...(product.tags || []),
  ].join(" ");
  return /\bbest[\s-]*seller(s)?\b|\bbestseller(s)?\b/i.test(text);
};

const toProductCatalogItem = (
  product: ShopifyProduct,
  origin: string,
  bestSellerHandles: Set<string>,
): ProductCatalogItem | null => {
  const title = String(product.title || "").trim();
  const handle = String(product.handle || "").trim();
  if (!title || !handle) return null;
  const prices = (product.variants || [])
    .map((variant) => toNumberOrNull(variant.price))
    .filter((value): value is number => value !== null);
  const firstImage = product.images?.find((image) => image.src);
  const firstVariant = product.variants?.[0];

  return {
    title,
    handle,
    url: new URL(`/products/${handle}`, origin).toString(),
    imageUrl: firstImage?.src || null,
    imageAlt: firstImage?.alt || null,
    productType: product.product_type || null,
    vendor: product.vendor || null,
    priceMin: prices.length ? Math.min(...prices) : null,
    priceMax: prices.length ? Math.max(...prices) : null,
    currency: firstVariant?.currency_code || null,
    available: product.variants?.some((variant) => variant.available) ?? null,
    badges: bestSellerHandles.has(handle) || productLooksBestSellerTagged(product) ? ["best-seller"] : [],
  };
};

const toWooCommerceCatalogItem = (
  product: WooCommerceStoreProduct,
  origin: string,
  bestSellerHandles: Set<string>,
): ProductCatalogItem | null => {
  const title = String(product.name || "").trim();
  const handle = String(product.slug || productHandleFromUrl(product.permalink || "")).trim();
  if (!title || !handle) return null;
  const firstImage = product.images?.find((image) => image.src);
  const price = wooPriceToNumberOrNull(product.prices?.price, product.prices?.currency_minor_unit);

  return {
    title,
    handle,
    url: product.permalink || new URL(`/product/${handle}`, origin).toString(),
    imageUrl: firstImage?.src || null,
    imageAlt: firstImage?.alt || firstImage?.name || null,
    productType: product.type || null,
    vendor: null,
    priceMin: price,
    priceMax: price,
    currency: product.prices?.currency_code || null,
    available: typeof product.is_in_stock === "boolean" ? product.is_in_stock : null,
    badges: bestSellerHandles.has(handle) ? ["best-seller"] : [],
  };
};

const fetchWithTimeout = async (
  fetcher: typeof fetch,
  url: string,
  timeoutMs: number,
  accept: string,
) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetcher(url, {
      headers: {
        accept,
        "user-agent": "Mozilla/5.0",
      },
      signal: controller.signal,
    });
    if (!response.ok) return null;
    return response;
  } finally {
    clearTimeout(timeout);
  }
};

const firstImageFromCard = (cardHtml: string) => {
  const src = cardHtml.match(/\ssrc="([^"]+)"/i)?.[1];
  if (src) return decodeHtml(src);
  const srcSet = cardHtml.match(/\ssrcSet="([^"]+)"/i)?.[1] || cardHtml.match(/\ssrcset="([^"]+)"/i)?.[1];
  const firstSrcSetUrl = srcSet?.split(/\s+\d+w\s*,?/)[0]?.trim();
  return firstSrcSetUrl ? decodeHtml(firstSrcSetUrl) : null;
};

const titleFromCard = (cardHtml: string, handle: string) => {
  const alt = cardHtml.match(/\salt="([^"]+)"/i)?.[1];
  const cleanAlt = alt ? decodeHtml(alt).split("|")[0]?.trim() : "";
  return cleanAlt || titleFromHandle(handle);
};

const parseProductCardsFromCollectionHtml = (
  html: string,
  origin: string,
  bestSellerHandles: Set<string>,
) => {
  const cards = html.split(/<div[^>]+class="[^"]*\bproduct-card\b[^"]*"[^>]*>/i).slice(1);
  const seen = new Set<string>();
  const products: ProductCatalogItem[] = [];

  for (const card of cards) {
    const href = card.match(/href="([^"]*\/products\/[^"]+)"/i)?.[1];
    if (!href) continue;
    const handle = productHandleFromUrl(href);
    if (!handle || seen.has(handle)) continue;
    seen.add(handle);
    bestSellerHandles.add(handle);

    products.push({
      title: titleFromCard(card, handle),
      handle,
      url: new URL(`/products/${handle}`, origin).toString(),
      imageUrl: firstImageFromCard(card),
      imageAlt: card.match(/\salt="([^"]+)"/i)?.[1] ? decodeHtml(card.match(/\salt="([^"]+)"/i)?.[1] || "") : null,
      productType: null,
      vendor: null,
      priceMin: null,
      priceMax: null,
      currency: null,
      available: null,
      badges: ["best-seller"],
    });
  }

  return products;
};

const fetchBestSellerHandles = async (
  fetcher: typeof fetch,
  origin: string,
  timeoutMs: number,
): Promise<{ handles: Set<string>; products: ProductCatalogItem[] }> => {
  const handles = new Set<string>();
  const productsByHandle = new Map<string, ProductCatalogItem>();
  await Promise.all(BEST_SELLER_COLLECTION_HANDLES.map(async (collectionHandle) => {
    const jsonUrl = new URL(`/collections/${collectionHandle}/products.json?limit=${SHOPIFY_PRODUCTS_LIMIT}`, origin).toString();
    try {
      const response = await fetchWithTimeout(fetcher, jsonUrl, timeoutMs, "application/json");
      const payload = await response?.json() as { products?: ShopifyProduct[] } | undefined;
      for (const product of payload?.products || []) {
        const handle = String(product.handle || "").trim();
        if (handle) handles.add(handle);
      }
    } catch {
      // Best-seller grouping is useful context, but a slow/missing collection
      // should not make the product catalog disappear.
    }

    if (!handles.size) {
      try {
        const htmlUrl = new URL(`/collections/${collectionHandle}`, origin).toString();
        const html = await (await fetchWithTimeout(fetcher, htmlUrl, timeoutMs, "text/html,application/xml,text/xml"))?.text();
        if (!html) return;
        for (const product of parseProductCardsFromCollectionHtml(html, origin, handles)) {
          productsByHandle.set(product.handle, product);
        }
      } catch {
        // Same as above: best-seller detection is a bonus.
      }
    }
  }));
  return { handles, products: [...productsByHandle.values()] };
};

const parseProductSitemapXml = (xml: string, origin: string, bestSellerHandles: Set<string>) => {
  const products: ProductCatalogItem[] = [];
  const seen = new Set<string>();
  for (const match of xml.matchAll(/<loc>\s*(https?:\/\/[^<]+\/products\/[^<]+)\s*<\/loc>/gi)) {
    const productUrl = decodeHtml(match[1] || "");
    const handle = productHandleFromUrl(productUrl);
    if (!handle || seen.has(handle)) continue;
    seen.add(handle);
    products.push({
      title: titleFromHandle(handle),
      handle,
      url: new URL(`/products/${handle}`, origin).toString(),
      imageUrl: null,
      imageAlt: null,
      productType: null,
      vendor: null,
      priceMin: null,
      priceMax: null,
      currency: null,
      available: null,
      badges: bestSellerHandles.has(handle) ? ["best-seller"] : [],
    });
    if (products.length >= SHOPIFY_PRODUCTS_LIMIT) break;
  }
  return products;
};

const fetchSitemapProducts = async (
  fetcher: typeof fetch,
  origin: string,
  timeoutMs: number,
  bestSellerHandles: Set<string>,
) => {
  const sitemapCandidates = new Set<string>([
    new URL("/sitemap_products_1.xml", origin).toString(),
    new URL("/sitemap-products.xml", origin).toString(),
  ]);

  try {
    const sitemapIndexUrl = new URL("/sitemap.xml", origin).toString();
    const sitemapIndex = await (await fetchWithTimeout(fetcher, sitemapIndexUrl, timeoutMs, "application/xml,text/xml,text/html"))?.text();
    for (const match of (sitemapIndex || "").matchAll(/<loc>\s*(https?:\/\/[^<]+product[^<]+\.xml)\s*<\/loc>/gi)) {
      sitemapCandidates.add(decodeHtml(match[1] || ""));
    }
  } catch {
    // Direct product sitemap candidates below still cover common Shopify cases.
  }

  for (const sitemapUrl of sitemapCandidates) {
    try {
      const xml = await (await fetchWithTimeout(fetcher, sitemapUrl, timeoutMs, "application/xml,text/xml,text/html"))?.text();
      if (!xml) continue;
      const products = parseProductSitemapXml(xml, origin, bestSellerHandles);
      if (products.length) return { sourceUrl: sitemapUrl, products };
    } catch {
      // Try the next sitemap candidate.
    }
  }

  return null;
};

const fetchWooCommerceProducts = async (
  fetcher: typeof fetch,
  origin: string,
  timeoutMs: number,
) => {
  const sourceUrl = new URL("/wp-json/wc/store/v1/products?per_page=100", origin).toString();
  const popularUrl = new URL("/wp-json/wc/store/v1/products?per_page=10&orderby=popularity", origin).toString();
  const bestSellerHandles = new Set<string>();

  try {
    const popularResponse = await fetchWithTimeout(fetcher, popularUrl, timeoutMs, "application/json");
    const popularProducts = await popularResponse?.json() as WooCommerceStoreProduct[] | undefined;
    for (const product of Array.isArray(popularProducts) ? popularProducts : []) {
      const handle = String(product.slug || productHandleFromUrl(product.permalink || "")).trim();
      if (handle) bestSellerHandles.add(handle);
    }
  } catch {
    // Popularity ordering is a useful best-seller signal, but plain products
    // are still enough for product selection/photoshoots.
  }

  try {
    const response = await fetchWithTimeout(fetcher, sourceUrl, timeoutMs, "application/json");
    const payload = await response?.json() as WooCommerceStoreProduct[] | undefined;
    const products = (Array.isArray(payload) ? payload : [])
      .map((product) => toWooCommerceCatalogItem(product, origin, bestSellerHandles))
      .filter((product): product is ProductCatalogItem => Boolean(product));

    return products.length ? { sourceUrl, products } : null;
  } catch {
    return null;
  }
};

const buildCatalogResult = (
  provider: ProductCatalog["provider"],
  sourceUrl: string,
  products: ProductCatalogItem[],
  reasonContext: string,
) => {
  const bestSellers = products
    .filter((product) => product.badges.includes("best-seller"))
    .map((product) => product.handle);
  const context = reasonContext ? ` ${reasonContext}` : "";

  return {
    catalog: {
      provider,
      sourceUrl,
      groups: { bestSellers },
      summary: {
        productCount: products.length,
        bestSellerCount: bestSellers.length,
      },
      products,
    },
    providerStatus: {
      provider: "product-catalog" as const,
      status: "used" as const,
      reason: `Loaded ${products.length} ecommerce products${context} with ${bestSellers.length} explicit best sellers.`,
    },
  };
};

const mergeProductsWithFallbackImages = (
  products: ProductCatalogItem[],
  fallbackProducts: ProductCatalogItem[],
  bestSellerHandles: Set<string>,
) => {
  const productsByHandle = new Map<string, ProductCatalogItem>();
  for (const product of products) productsByHandle.set(product.handle, product);

  for (const product of fallbackProducts) {
    const existing = productsByHandle.get(product.handle);
    productsByHandle.set(product.handle, {
      ...(existing || product),
      imageUrl: existing?.imageUrl || product.imageUrl,
      imageAlt: existing?.imageAlt || product.imageAlt,
      badges: bestSellerHandles.has(product.handle)
        ? ["best-seller"]
        : (existing?.badges.length ? existing.badges : product.badges),
    });
  }

  return [...productsByHandle.values()];
};

export async function fetchEcommerceProductCatalog(
  inputUrl: string,
  options: {
    fetcher?: typeof fetch;
    timeoutMs?: number;
  } = {},
): Promise<{
  catalog: ProductCatalog | null;
  providerStatus: ResearchProviderStatus;
}> {
  const websiteUrl = normalizePublicWebsiteUrl(inputUrl);
  const sourceUrl = new URL(`/products.json?limit=${SHOPIFY_PRODUCTS_LIMIT}`, websiteUrl.origin).toString();
  const isDirectProductPage = /\/products\//i.test(websiteUrl.pathname);

  try {
    const fetcher = options.fetcher ?? fetch;
    const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    let response = await fetchWithTimeout(fetcher, sourceUrl, timeoutMs, "application/json");
    // A direct product page is the one place where losing the catalog blocks the
    // user from choosing the exact item they just submitted. Retry one transient
    // catalog miss before falling back to brand-level story options.
    if (!response && isDirectProductPage) {
      response = await fetchWithTimeout(fetcher, sourceUrl, timeoutMs, "application/json");
    }
    const payload = await response?.json() as { products?: ShopifyProduct[] } | undefined;
    const explicitBestSellers = await fetchBestSellerHandles(fetcher, websiteUrl.origin, timeoutMs);
    const products = (payload?.products || [])
      .map((product) => toProductCatalogItem(product, websiteUrl.origin, explicitBestSellers.handles))
      .filter((product): product is ProductCatalogItem => Boolean(product));

    if (!products.length) {
      const wooCommerceProducts = await fetchWooCommerceProducts(fetcher, websiteUrl.origin, timeoutMs);
      if (wooCommerceProducts?.products.length) {
        return buildCatalogResult(
          "woocommerce-store-api",
          wooCommerceProducts.sourceUrl,
          wooCommerceProducts.products,
          "from WooCommerce Store API",
        );
      }
    }

    if (!products.length || !products.some((product) => product.imageUrl)) {
      const sitemapProducts = await fetchSitemapProducts(fetcher, websiteUrl.origin, timeoutMs, explicitBestSellers.handles);
      const fallbackProducts = mergeProductsWithFallbackImages(
        products,
        [...explicitBestSellers.products, ...(sitemapProducts?.products || [])],
        explicitBestSellers.handles,
      );

      if (fallbackProducts.length && (!products.length || fallbackProducts.some((product) => product.imageUrl))) {
        return buildCatalogResult(
          "shopify-product-sitemap",
          sitemapProducts?.sourceUrl || new URL("/collections/best-sellers", websiteUrl.origin).toString(),
          fallbackProducts,
          products.length ? "with images from sitemap/collection fallbacks" : "from sitemap/collection fallbacks",
        );
      }
    }

    if (!products.length) {
      return {
        catalog: null,
        providerStatus: {
          provider: "product-catalog",
          status: "skipped",
          reason: "No Shopify product catalog found.",
        },
      };
    }

    return buildCatalogResult("shopify-products-json", sourceUrl, products, "");
  } catch (error) {
    return {
      catalog: null,
      providerStatus: {
        provider: "product-catalog",
        status: "failed",
        reason: error instanceof Error ? error.message : "Product catalog fetch failed.",
      },
    };
  }
}
