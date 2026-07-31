# Wiggly Moody Pink Effect Format

This runnable Repo preserves the exact prompt delivered by @skaigenerated and
six native carousel images. Every published image already includes one
original-photo inset, so Wiggly does not add another. The final two CTA slides
are intentionally excluded.

Run from `v3`:

```bash
npm install
npm run format:skai-image -- check --format=moody-pink-effect
npm run format:skai-image -- smoke --format=moody-pink-effect
npm run format:skai-image -- init --format=moody-pink-effect --run=my-moody-pink --input=/absolute/path/to/3-by-4-image.jpg
npm run format:skai-image -- validate --format=moody-pink-effect --run=my-moody-pink
npm run format:skai-image -- estimate --format=moody-pink-effect --run=my-moody-pink
```

The input must already be 3:4 so the fixed output route can preserve the source
framing. Add `--model=nano-banana-2-lite` or `--model=nano-banana-pro` to
`init` to select the economy or premium route.

Generation requires `REPLICATE_API_TOKEN`. Stop after `estimate` and get the
user's explicit approval before supplying the paid flag:

```bash
npm run format:skai-image -- render --format=moody-pink-effect --run=my-moody-pink --approve-paid
```

No Replicate proof call was made while packaging this Repo.

- Economy: `google/nano-banana-2-lite`
- Default: `google/nano-banana-2`
- Premium: `google/nano-banana-pro`
- Model named in the source guide: `google/nano-banana-pro`

The source model is recorded for provenance. The default route uses the
lower-cost Nano Banana 2 while preserving the carousel's 3:4 output shape.
The estimate is a packaged planning value, so verify Replicate's current rate
immediately before paid approval.
