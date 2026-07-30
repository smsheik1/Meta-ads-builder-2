# Wiggly Light Silhouette Format

This runnable Repo preserves the exact gathered prompt, source guide, original
carousel cover, and seven native SKAI examples. It uses the shared Wiggly image
runner so validation, paid approval, retry caps, and visual finalization stay
explicit.

Run from `v3`:

```bash
npm install
npm run format:skai-image -- check --format=light-silhouette
npm run format:skai-image -- smoke --format=light-silhouette
npm run format:skai-image -- init --format=light-silhouette --run=my-photo --input=/absolute/path/to/photo.jpg
npm run format:skai-image -- validate --format=light-silhouette --run=my-photo
npm run format:skai-image -- estimate --format=light-silhouette --run=my-photo
```

Generation requires `REPLICATE_API_TOKEN` and explicit approval:

```bash
npm run format:skai-image -- render --format=light-silhouette --run=my-photo --approve-paid
```

No Replicate proof call was made while packaging this Repo.

Model routes:

- Economy: `google/nano-banana-2-lite`
- Default: `google/nano-banana-2`
- Premium: `google/nano-banana-pro`

The creator guide labels its examples as GPT Image 2. That remains source
provenance; the runnable kit uses Replicate-hosted Nano Banana 2 by default,
Lite for economy, and Pro for premium.

Every native example already contains the creator-published original photo in a
rounded top-right inset. Separate reference files are direct crops of those
insets for provenance and local smoke validation.
