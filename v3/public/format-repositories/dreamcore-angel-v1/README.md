# Wiggly Dreamcore Angel Format

This runnable Repo preserves the exact prompt delivered by @skaigenerated, the native title cover, and six source transformation proofs. Each proof already contains one original-photo inset, so Wiggly does not add another. The final two CTA slides are intentionally excluded.

Run from `v3`:

```bash
npm install
npm run format:skai-image -- check --format=dreamcore-angel
npm run format:skai-image -- smoke --format=dreamcore-angel
npm run format:skai-image -- init --format=dreamcore-angel --run=my-dreamcore-angel --input=/absolute/path/to/3-by-4-portrait.jpg
npm run format:skai-image -- validate --format=dreamcore-angel --run=my-dreamcore-angel
npm run format:skai-image -- estimate --format=dreamcore-angel --run=my-dreamcore-angel
```

The input must already be 3:4. Add `--model=nano-banana-2-lite` or `--model=nano-banana-pro` to `init` to select the economy or premium route.

Generation requires `REPLICATE_API_TOKEN`. Stop after `estimate` and get the user's explicit approval before supplying the paid flag:

```bash
npm run format:skai-image -- render --format=dreamcore-angel --run=my-dreamcore-angel --approve-paid
```

No Replicate proof call was made while packaging this Repo.

- Economy: `google/nano-banana-2-lite`
- Default: `google/nano-banana-2`
- Premium: `google/nano-banana-pro`
- Model named on the source cover: GPT Image 2.0

The source model is recorded for provenance. Wiggly's official runtime uses the existing Replicate-backed Nano Banana lanes. The estimate is a packaged planning value, so verify Replicate's current rate immediately before paid approval.
