# Asset sourcing

The Repo must work when no parent Format exists.

## User inputs

- One approved finished video.
- One official brand website.

Do not ask the user to locate ordinary public brand assets that the agent can source itself.

## Decide ingredient two

Watch or inspect the approved video before researching assets.

- If a specific product appears, use that exact product and set `featuredProduct`.
- If no product appears, choose the business's real hero product or primary offering from the official website and set `heroProduct`.
- Never set both merely as a fallback stack; `featuredProduct` has priority only when it truly appears in the video.

## Source the images

1. Research the official website with the host agent's web tools.
2. Find the cleanest official brand logo, preferring a transparent PNG or SVG from the site's header, footer, metadata, or brand kit.
3. Find the cleanest official product or hero-offering image from its product page or homepage.
4. Download both images locally without editing their identity, packaging, wordmark, or colors.
5. Save the exact page or asset URL in each image's `sourceUrl` field.
6. If the user supplied an image, save `sourceUrl` as `user-provided`.

Do not use image generation, search-result thumbnails, social reposts, mockups, or an image copied from another Wiggly Repo when the official site is available.

## Quality gate

- The logo is the real brand mark, not text recreated by the agent.
- The product matches the one visible in the approved video.
- A hero offering is used only when the video contains no featured product.
- Both local files open successfully and keep source provenance.
