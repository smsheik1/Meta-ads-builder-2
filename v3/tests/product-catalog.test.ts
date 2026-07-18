import assert from "node:assert/strict";
import {
  buildDirectProductPageCatalog,
  fetchEcommerceProductCatalog,
  mergeDirectProductPageIntoCatalog,
} from "../features/research/productCatalog";
import { getDefaultReviewProductHandles } from "../features/formats/reviews/productSelection";

const jsonResponse = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { "content-type": "application/json" },
});

const textResponse = (body: string, status = 200, contentType = "text/html") => new Response(body, {
  status,
  headers: { "content-type": contentType },
});

const fetchFromRoutes = (routes: Array<[RegExp, () => Response]>) => async (input: RequestInfo | URL) => {
  const url = String(input);
  return routes.find(([pattern]) => pattern.test(url))?.[1]() || textResponse("", 404);
};

const payload = {
  products: [
    {
      title: "2LB Square Signature Tin Butter Pecan Meltaway",
      handle: "2lb-square-signature-tin-butter-pecan-meltaway",
      vendor: "David's Cookies",
      product_type: "Cookies",
      images: [{
        src: "https://cdn.shopify.com/s/files/1/0820/0831/0046/files/ButterpecanmeltawaysTin2lbs.01.jpg?v=1778784592",
        alt: "Butter Pecan Meltaway Tin",
      }],
      variants: [{
        price: "59.95",
        available: true,
        currency_code: "USD",
      }],
    },
    {
      title: "Assorted Brownie Tin",
      handle: "assorted-brownie-tin",
      vendor: "David's Cookies",
      product_type: "Brownies",
      images: [],
      variants: [{
        price: "49.95",
        available: true,
        currency_code: "USD",
      }],
    },
    {
      title: "",
      handle: "",
      images: [],
      variants: [],
    },
  ],
};

const result = await fetchEcommerceProductCatalog("https://davidscookies.com/", {
  fetcher: async (input, init) => {
    assert.ok(init?.headers && (init.headers as Record<string, string>).accept);
    return fetchFromRoutes([
      [/\/collections\/best-sellers\/products\.json/, () => jsonResponse({
        products: [{
          title: "2LB Square Signature Tin Butter Pecan Meltaway",
          handle: "2lb-square-signature-tin-butter-pecan-meltaway",
        }],
      })],
      [/\/collections\//, () => jsonResponse({ products: [] })],
      [/\/products\.json\?limit=250$/, () => jsonResponse(payload)],
    ])(input);
  },
});

assert.equal(result.providerStatus.status, "used");
assert.equal(result.catalog?.products.length, 2);
assert.equal(result.catalog?.summary.productCount, 2);
assert.equal(result.catalog?.summary.bestSellerCount, 1);
assert.deepEqual(result.catalog?.groups.bestSellers, ["2lb-square-signature-tin-butter-pecan-meltaway"]);
assert.equal(result.catalog?.products[0]?.title, "2LB Square Signature Tin Butter Pecan Meltaway");
assert.equal(result.catalog?.products[0]?.handle, "2lb-square-signature-tin-butter-pecan-meltaway");
assert.equal(result.catalog?.products[0]?.url, "https://davidscookies.com/products/2lb-square-signature-tin-butter-pecan-meltaway");
assert.equal(result.catalog?.products[0]?.imageUrl, "https://cdn.shopify.com/s/files/1/0820/0831/0046/files/ButterpecanmeltawaysTin2lbs.01.jpg?v=1778784592");
assert.equal(result.catalog?.products[0]?.priceMin, 59.95);
assert.equal(result.catalog?.products[0]?.available, true);
assert.deepEqual(result.catalog?.products[0]?.badges, ["best-seller"]);
assert.deepEqual(result.catalog?.products[1]?.badges, []);
assert.deepEqual(getDefaultReviewProductHandles(result.catalog), ["2lb-square-signature-tin-butter-pecan-meltaway"]);

const empty = await fetchEcommerceProductCatalog("https://example.com/", {
  fetcher: async () => jsonResponse({ products: [] }),
});
assert.equal(empty.catalog, null);
assert.equal(empty.providerStatus.status, "skipped");

let directProductCatalogAttempts = 0;
const directProductRetry = await fetchEcommerceProductCatalog("https://therabody.test/products/theragun-pro-plus", {
  fetcher: async (input) => {
    const url = String(input);
    if (/^https:\/\/therabody\.test\/products\.json\?limit=250$/.test(url)) {
      directProductCatalogAttempts += 1;
      return directProductCatalogAttempts === 1
        ? textResponse("temporarily unavailable", 503, "text/plain")
        : jsonResponse(payload);
    }
    if (/\/collections\//.test(url)) return jsonResponse({ products: [] });
    return textResponse("", 404);
  },
});

assert.equal(directProductCatalogAttempts, 2);
assert.equal(directProductRetry.catalog?.products.length, 2);

const directProductPageCatalog = buildDirectProductPageCatalog({
  websiteUrl: "https://therabody.test/products/theragun-pro-plus",
  finalUrl: "https://therabody.test/products/theragun-pro-plus",
  brand: {
    name: "Therabody",
    ogImageUrl: "http://cdn.therabody.test/theragun-pro-plus.png",
  },
  metadata: {
    "og:title": "Theragun PRO Plus | Powerful Percussive Massage | Therabody",
    "og:image:secure_url": "https://cdn.therabody.test/theragun-pro-plus.png",
    "og:price:amount": "649.99",
    "og:price:currency": "USD",
  },
});

assert.equal(directProductPageCatalog?.catalog.provider, "scraped-product-page");
assert.equal(directProductPageCatalog?.catalog.products[0]?.title, "Theragun PRO Plus");
assert.equal(directProductPageCatalog?.catalog.products[0]?.handle, "theragun-pro-plus");
assert.equal(directProductPageCatalog?.catalog.products[0]?.imageUrl, "https://cdn.therabody.test/theragun-pro-plus.png");
assert.equal(directProductPageCatalog?.catalog.products[0]?.priceMin, 649.99);

const mergedDirectProductCatalog = mergeDirectProductPageIntoCatalog(
  result.catalog!,
  {
    websiteUrl: "https://therabody.test/products/theragun-pro-plus",
    finalUrl: "https://therabody.test/products/theragun-pro-plus",
    brand: {
      name: "Therabody",
      ogImageUrl: "https://cdn.therabody.test/theragun-pro-plus.png",
    },
    metadata: {
      "og:title": "Theragun PRO Plus | Powerful Percussive Massage | Therabody",
      "og:image:secure_url": "https://cdn.therabody.test/theragun-pro-plus.png",
    },
  },
);

assert.equal(mergedDirectProductCatalog.products.length, 3);
assert.equal(mergedDirectProductCatalog.products[0]?.handle, "theragun-pro-plus");
assert.equal(mergedDirectProductCatalog.products[0]?.title, "Theragun PRO Plus");

const headlessShopify = await fetchEcommerceProductCatalog("https://skims.test/", {
  fetcher: fetchFromRoutes([
    [/\/products\.json\?limit=250/, () => textResponse("<html>not found</html>", 404)],
    [/\/sitemap\.xml$/, () => textResponse(`<?xml version="1.0"?><sitemapindex>
        <sitemap><loc>https://skims.test/sitemap-products.xml</loc></sitemap>
      </sitemapindex>`, 200, "application/xml")],
    [/\/sitemap-products\.xml$/, () => textResponse(`<?xml version="1.0"?><urlset>
        <url><loc>https://skims.test/products/fits-everybody-t-shirt-onyx</loc></url>
        <url><loc>https://skims.test/products/cotton-rib-boxer-brief-clay</loc></url>
      </urlset>`, 200, "application/xml")],
    [/\/collections\/best-sellers/, () => textResponse(`<html>
        <div class="product-card">
          <a href="/products/fits-everybody-t-shirt-onyx">
            <img src="https://skims.test/fits.webp?auto=format&amp;w=800" alt="FITS EVERYBODY T-SHIRT | ONYX CAMPAIGN IMAGE" />
          </a>
        </div>
      </html>`)],
  ]),
});

assert.equal(headlessShopify.providerStatus.status, "used");
assert.equal(headlessShopify.catalog?.provider, "shopify-product-sitemap");
assert.equal(headlessShopify.catalog?.products.length, 2);
assert.equal(headlessShopify.catalog?.summary.bestSellerCount, 1);
assert.equal(headlessShopify.catalog?.products[0]?.handle, "fits-everybody-t-shirt-onyx");
assert.equal(headlessShopify.catalog?.products[0]?.imageUrl, "https://skims.test/fits.webp?auto=format&w=800");
assert.deepEqual(headlessShopify.catalog?.groups.bestSellers, ["fits-everybody-t-shirt-onyx"]);

const shopifyWithoutJsonImages = await fetchEcommerceProductCatalog("https://imagefix.test/", {
  fetcher: fetchFromRoutes([
    [/^https:\/\/imagefix\.test\/products\.json\?limit=250$/, () => jsonResponse({
      products: [{
        title: "Red Gift Tin",
        handle: "red-gift-tin",
        images: [],
        variants: [{ price: "39.00", available: true, currency_code: "USD" }],
      }],
    })],
    [/\/collections\/[^/]+\/products\.json/, () => textResponse("", 404, "application/json")],
    [/\/collections\//, () => textResponse(`<html>
        <div class="product-card">
          <a href="/products/red-gift-tin">
            <img src="https://imagefix.test/red-gift-tin.png" alt="Red Gift Tin" />
          </a>
        </div>
      </html>`)],
  ]),
});

assert.equal(shopifyWithoutJsonImages.providerStatus.status, "used");
assert.equal(shopifyWithoutJsonImages.catalog?.products.length, 1);
assert.equal(shopifyWithoutJsonImages.catalog?.products[0]?.handle, "red-gift-tin");
assert.equal(shopifyWithoutJsonImages.catalog?.products[0]?.imageUrl, "https://imagefix.test/red-gift-tin.png");

const wooCommerce = await fetchEcommerceProductCatalog("https://cookies.test/", {
  fetcher: fetchFromRoutes([
    [/\/products\.json\?limit=250/, () => textResponse("<html>not shopify</html>", 404)],
    [/\/collections\//, () => textResponse("<html></html>", 404)],
    [/\/wp-json\/wc\/store\/v1\/products\?per_page=10&orderby=popularity/, () => jsonResponse([{
      name: "Chocolate Cookie Box",
      slug: "chocolate-cookie-box",
      permalink: "https://cookies.test/product/chocolate-cookie-box/",
    }])],
    [/\/wp-json\/wc\/store\/v1\/products\?per_page=100/, () => jsonResponse([{
      name: "Chocolate Cookie Box",
      slug: "chocolate-cookie-box",
      permalink: "https://cookies.test/product/chocolate-cookie-box/",
      type: "simple",
      is_in_stock: true,
      prices: { price: "2499", currency_code: "USD", currency_minor_unit: 2 },
      images: [{ src: "https://cookies.test/chocolate.jpg", alt: "Chocolate Cookie Box" }],
    }])],
  ]),
});

assert.equal(wooCommerce.providerStatus.status, "used");
assert.equal(wooCommerce.catalog?.provider, "woocommerce-store-api");
assert.equal(wooCommerce.catalog?.products[0]?.title, "Chocolate Cookie Box");
assert.equal(wooCommerce.catalog?.products[0]?.handle, "chocolate-cookie-box");
assert.equal(wooCommerce.catalog?.products[0]?.imageUrl, "https://cookies.test/chocolate.jpg");
assert.equal(wooCommerce.catalog?.products[0]?.priceMin, 24.99);
assert.equal(wooCommerce.catalog?.summary.bestSellerCount, 1);
assert.deepEqual(wooCommerce.catalog?.groups.bestSellers, ["chocolate-cookie-box"]);

console.log("product-catalog tests passed");
