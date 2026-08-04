# LinkedIn Showcase Wrapper

Turn one already-approved video into the 16:9 process card Wiggly uses on LinkedIn.

The right side is the untouched approved output; the left side shows what made it: the brand logo, the featured product (or the business hero product when no product appears), and Wiggly.

The user supplies only the approved video and official brand website; the fresh agent inspects the video, sources the official logo and exact featured/hero product itself, and records both source URLs without requiring another Wiggly Repo.

## Quick start

Run commands from the kit's `v3` directory.

First, read `prompts/asset-sourcing.md`, inspect the approved video, and use the official website to download the logo and featured/hero-product image; then create the input JSON and run:

```bash
npm install
npm run format:linkedin-showcase -- check
npm run format:linkedin-showcase -- init --run=my-showcase --input=/absolute/path/to/input.json
npm run format:linkedin-showcase -- validate --run=my-showcase
npm run format:linkedin-showcase -- render --run=my-showcase
npm run format:linkedin-showcase -- inspect --run=my-showcase
```

Watch the complete MP4 and open the generated contact sheet, then finalize it:

```bash
npm run format:linkedin-showcase -- finalize --run=my-showcase --approve-final --review-note="All four ingredients are clean and the full video plays correctly."
```

The process costs $0 in provider charges and requires no API key.

## Input example

```json
{
  "version": 1,
  "brandWebsite": "https://example.com/",
  "approvedVideo": {
    "name": "Finished vertical ad",
    "path": "./final.mp4",
    "approved": true,
    "approvalNote": "Approved after watching the complete cut",
    "sourceFormat": "three-d-breakdown"
  },
  "brand": {
    "name": "Example Brand",
    "logo": { "name": "Example Brand logo", "path": "./logo.png", "sourceUrl": "https://example.com/official-logo.png" }
  },
  "featuredProduct": { "name": "Example product", "path": "./product.png", "sourceUrl": "https://example.com/products/example" },
  "outputName": "example-linkedin-showcase"
}
```

If the video has no featured product, omit `featuredProduct` and provide `heroProduct` instead.
