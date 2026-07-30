# Wiggly Doodle Art Format

This runnable Repo preserves the exact gathered prompt, source notes, original
carousel cover, and five native SKAI examples. It uses the shared Wiggly image
runner so validation, paid approval, retry caps, and visual finalization stay
explicit.

Run from `v3`:

```bash
npm install
npm run format:skai-image -- check --format=doodle-art
npm run format:skai-image -- smoke --format=doodle-art
npm run format:skai-image -- init --format=doodle-art --run=my-photo --input=/absolute/path/to/photo.jpg
npm run format:skai-image -- validate --format=doodle-art --run=my-photo
npm run format:skai-image -- estimate --format=doodle-art --run=my-photo
```

Generation requires `REPLICATE_API_TOKEN` and explicit approval:

```bash
npm run format:skai-image -- render --format=doodle-art --run=my-photo --approve-paid
```

No Replicate proof call was made while packaging this Repo.

Model routes:

- Economy: `google/nano-banana-2-lite`
- Default: `google/nano-banana-2`
- Premium: `google/nano-banana-pro`

The creator guide labels its examples as GPT Image 2. That remains source
provenance; the runnable kit uses Replicate-hosted Nano Banana 2 by default,
Lite for economy, and Pro for premium.

The creator did not publish the original input photos. The top-right comparison
insets are documented photorealistic reconstructions made with Codex's built-in
image generator. They are visual stand-ins, never represented as creator assets.
