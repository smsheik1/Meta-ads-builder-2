# Wiggly Sparkling Effect Format

This runnable Repo preserves the exact gathered prompt, source notes, original
carousel cover, and four native SKAI before-and-after examples. It uses the
shared Wiggly image runner so validation, paid approval, retry caps, and visual
finalization stay explicit.

Run from `v3`:

```bash
npm install
npm run format:skai-image -- check --format=sparkling-effect
npm run format:skai-image -- smoke --format=sparkling-effect
npm run format:skai-image -- init --format=sparkling-effect --run=my-photo --input=/absolute/path/to/photo.jpg
npm run format:skai-image -- validate --format=sparkling-effect --run=my-photo
npm run format:skai-image -- estimate --format=sparkling-effect --run=my-photo
```

Generation requires `REPLICATE_API_TOKEN` and explicit approval:

```bash
npm run format:skai-image -- render --format=sparkling-effect --run=my-photo --approve-paid
```

No Replicate proof call was made while packaging this Repo.

Model routes:

- Economy: `google/nano-banana-2-lite`
- Default: `google/nano-banana-2`
- Premium: `google/nano-banana-pro`

The creator guide labels its examples as GPT Image 2. That source model is
recorded as provenance; the runnable Wiggly routes use Replicate.
