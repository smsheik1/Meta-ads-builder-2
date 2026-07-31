# Wiggly Soft Glow Filter Format

This runnable Repo preserves the exact prompt delivered by @skaigenerated, the
native title cover, six native before-and-after examples, and one extracted
source inset for a truthful hero comparison. The final two carousel CTA slides
are intentionally excluded.

Run from `v3`:

```bash
npm install
npm run format:skai-image -- check --format=soft-glow-filter
npm run format:skai-image -- smoke --format=soft-glow-filter
npm run format:skai-image -- init --format=soft-glow-filter --run=my-soft-glow --input=/absolute/path/to/3-by-4-image.jpg
npm run format:skai-image -- validate --format=soft-glow-filter --run=my-soft-glow
npm run format:skai-image -- estimate --format=soft-glow-filter --run=my-soft-glow
```

The input must already be 3:4 so the fixed output route can preserve the source
framing. Add `--model=nano-banana-2-lite` or `--model=nano-banana-pro` to
`init` to select the economy or premium route.

Generation requires `REPLICATE_API_TOKEN`. Stop after `estimate` and get the
user's explicit approval before supplying the paid flag:

```bash
npm run format:skai-image -- render --format=soft-glow-filter --run=my-soft-glow --approve-paid
```

No Replicate proof call was made while packaging this Repo.

- Economy: `google/nano-banana-2-lite`
- Default: `google/nano-banana-2`
- Premium: `google/nano-banana-pro`
- Model named in the source guide: `openai/gpt-image-2`

The source model is recorded for provenance. The runnable lanes use the
lower-cost Nano Banana routes requested for Wiggly and preserve the carousel's
3:4 output shape. Re-run `estimate` immediately before approval because
provider pricing can change.
