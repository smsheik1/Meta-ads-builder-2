# Wiggly Dusk Effect Format

This runnable Repo preserves the exact gathered prompt, guide, three native
SKAI before-and-after examples, their original reference photos, and one
additional source reference. It uses the shared Wiggly image runner so
validation, paid approval, retry caps, and visual finalization stay explicit.

Run from `v3`:

```bash
npm install
npm run format:skai-image -- check --format=dusk-effect
npm run format:skai-image -- smoke --format=dusk-effect
npm run format:skai-image -- init --format=dusk-effect --run=my-photo --input=/absolute/path/to/photo.jpg
npm run format:skai-image -- validate --format=dusk-effect --run=my-photo
npm run format:skai-image -- estimate --format=dusk-effect --run=my-photo
```

Generation requires `REPLICATE_API_TOKEN` and explicit approval:

```bash
npm run format:skai-image -- render --format=dusk-effect --run=my-photo --approve-paid
```

No Replicate proof call was made while packaging this Repo.

Model routes:

- Economy: `google/nano-banana-2-lite`
- Default: `google/nano-banana-2`
- Premium and creator source: `google/nano-banana-pro`
