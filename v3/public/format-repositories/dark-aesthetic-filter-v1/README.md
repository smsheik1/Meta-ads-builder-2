# Wiggly Dark Aesthetic Filter Format

This runnable Repo preserves the exact prompt delivered by @skaigenerated, its native title cover, and ten source transformation proofs. Each proof already contains one original-photo inset, so Wiggly does not add another. The final two CTA slides are intentionally excluded.

Run from `v3`:

```bash
npm install
npm run format:skai-image -- check --format=dark-aesthetic-filter
npm run format:skai-image -- smoke --format=dark-aesthetic-filter
npm run format:skai-image -- init --format=dark-aesthetic-filter --run=my-dark-aesthetic-filter --input=/absolute/path/to/3-by-4-portrait.jpg
npm run format:skai-image -- validate --format=dark-aesthetic-filter --run=my-dark-aesthetic-filter
npm run format:skai-image -- estimate --format=dark-aesthetic-filter --run=my-dark-aesthetic-filter
```

The input must already be 3:4. Add `--model=nano-banana-2-lite` or `--model=nano-banana-pro` to `init` to select the economy or premium route.

Generation requires `REPLICATE_API_TOKEN`. Stop after `estimate` and get the user's explicit approval before supplying the paid flag:

```bash
npm run format:skai-image -- render --format=dark-aesthetic-filter --run=my-dark-aesthetic-filter --approve-paid
```

No Replicate proof call was made while packaging this Repo.

- Economy: `google/nano-banana-2-lite`
- Default: `google/nano-banana-2`
- Premium: `google/nano-banana-pro`
- Model named on the source post: Nano Banana 2

The source model is recorded for provenance. Wiggly's official runtime uses the existing Replicate-backed Nano Banana lanes. The estimate is a packaged planning value, so verify Replicate's current rate immediately before paid approval.
