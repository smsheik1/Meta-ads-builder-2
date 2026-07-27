# Wiggly Reviews Format Kit

Turn real website reviews into eight proof-first static ads.

## What You Get

- Four product proof cards
- Four minimal quote cards
- Eight 1080 x 1350 PNGs
- The exact source quote and URL for every ad
- Saved progress that another agent can resume

## Quick Start

```bash
npm install
npm run check:kit
npm run format:reviews -- init --run=my-brand --url=https://example.com
```

Fill `agent-runs/my-brand/research.json`, then:

```bash
npm run format:reviews -- prompt --run=my-brand
```

Use the generated prompt yourself. Save four framings in `variants.json`, then:

```bash
npm run format:reviews -- validate --run=my-brand
npm run format:reviews -- estimate --run=my-brand
npm run format:reviews -- render --run=my-brand
npm run format:reviews -- inspect --run=my-brand
npm run format:reviews -- finalize --run=my-brand --approve-final
```

## Free Proof

```bash
npm run format:reviews -- smoke --run=free-proof
npm run format:reviews -- render --run=free-proof
npm run format:reviews -- inspect --run=free-proof
```

No image, video, voice, Replicate, or Wiggly generation provider is used.

The current image templates show the exact customer quote, product, and brand. Headline and CTA framing are saved in `scenes.json` for handoff or later editing; they are not baked into the PNGs.
