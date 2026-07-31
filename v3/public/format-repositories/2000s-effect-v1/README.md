# Wiggly 2000s Effect Format

This runnable Repo preserves the exact prompt delivered by @skaigenerated, its native title cover, and eight source transformation proofs. Each proof already contains one original-photo inset, so Wiggly does not add another. The final two CTA slides are intentionally excluded.

Run from `v3`:

```bash
npm install
npm run format:skai-image -- check --format=2000s-effect
npm run format:skai-image -- smoke --format=2000s-effect
npm run format:skai-image -- init --format=2000s-effect --run=my-2000s-effect --input=/absolute/path/to/3-by-4-photo.jpg
npm run format:skai-image -- validate --format=2000s-effect --run=my-2000s-effect
npm run format:skai-image -- estimate --format=2000s-effect --run=my-2000s-effect
```

The input must already be 3:4. Add `--model=nano-banana-2-lite` or `--model=nano-banana-pro` to `init` to select the economy or premium route.

Generation requires `REPLICATE_API_TOKEN`. Stop after `estimate` and get the user's explicit approval before supplying the paid flag:

```bash
npm run format:skai-image -- render --format=2000s-effect --run=my-2000s-effect --approve-paid
```

No Replicate proof call was made while packaging this Repo.

- Economy: `google/nano-banana-2-lite`
- Default: `google/nano-banana-2`
- Premium: `google/nano-banana-pro`
- Model named on the source post: GPT Image 2

The source model is recorded for provenance. Wiggly's official runtime uses the existing Replicate-backed Nano Banana lanes. The estimate is a packaged planning value, so verify Replicate's current rate immediately before paid approval.
