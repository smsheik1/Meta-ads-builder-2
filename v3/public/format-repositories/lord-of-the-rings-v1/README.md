# Wiggly Lord of the Rings Format

This runnable Repo preserves the exact prompt delivered by @skaigenerated, the
native before-and-after carousel cover, and five native source examples. A
separate Wiggly proof uses one fixture image so agents can inspect a truthful
input and output without calling a paid provider.

Run from `v3`:

```bash
npm install
npm run format:skai-image -- check --format=lord-of-the-rings
npm run format:skai-image -- smoke --format=lord-of-the-rings
npm run format:skai-image -- init --format=lord-of-the-rings --run=my-lotr-grade --input=/absolute/path/to/3-by-4-image.jpg
npm run format:skai-image -- validate --format=lord-of-the-rings --run=my-lotr-grade
npm run format:skai-image -- estimate --format=lord-of-the-rings --run=my-lotr-grade
```

The input must already be 3:4 so the fixed output route can honor the prompt's
composition-preservation rule. Add `--model=nano-banana-2-lite` or
`--model=nano-banana-pro` to `init` to select the economy or premium route.

Generation requires `REPLICATE_API_TOKEN`. Stop after `estimate` and get the
user's explicit approval before supplying the paid flag:

```bash
npm run format:skai-image -- render --format=lord-of-the-rings --run=my-lotr-grade --approve-paid
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
