# Wiggly 80s Toon Format

This runnable Repo preserves the exact prompt delivered by @skaigenerated, its native title cover, and seven source transformation proofs. Every saved proof already contains one original-photo inset, so Wiggly does not add another. The final two CTA slides are intentionally excluded.

Run from `v3`:

```bash
npm install
npm run format:skai-image -- check --format=80s-toon
npm run format:skai-image -- smoke --format=80s-toon
npm run format:skai-image -- init --format=80s-toon --run=my-toon --input=/absolute/path/to/3-by-4-photo.jpg
npm run format:skai-image -- validate --format=80s-toon --run=my-toon
npm run format:skai-image -- estimate --format=80s-toon --run=my-toon
```

The input must already be 3:4. Add `--model=nano-banana-2-lite` for economy or `--model=nano-banana-pro` for the source-recommended route.

Generation requires `REPLICATE_API_TOKEN`. Stop after `estimate` and get the user's explicit approval before supplying the paid flag:

```bash
npm run format:skai-image -- render --format=80s-toon --run=my-toon --approve-paid
```

No Replicate proof call was made while packaging this Repo.

- Economy: `google/nano-banana-2-lite`
- Default: `google/nano-banana-2`
- Source-recommended: `google/nano-banana-pro`

The estimate is a packaged planning value, so verify Replicate's current rate immediately before paid approval.
