# Wiggly Blue Phosphor Filter Format

This runnable Repo preserves the exact prompt, negative prompt, guide, seven
native SKAI examples, and their original-photo reference insets. It uses the
shared Wiggly image runner so validation, paid approval, retry caps, and visual
finalization stay explicit.

Run from `v3`:

```bash
npm install
npm run format:skai-image -- check --format=blue-phosphor
npm run format:skai-image -- smoke --format=blue-phosphor
npm run format:skai-image -- init --format=blue-phosphor --run=my-photo --input=/absolute/path/to/photo.jpg
npm run format:skai-image -- validate --format=blue-phosphor --run=my-photo
npm run format:skai-image -- estimate --format=blue-phosphor --run=my-photo
```

Generation requires `REPLICATE_API_TOKEN` and explicit approval:

```bash
npm run format:skai-image -- render --format=blue-phosphor --run=my-photo --approve-paid
```

No Replicate proof call was made while packaging this Repo.

Model routes:

- Economy: `google/nano-banana-2-lite`
- Default: `google/nano-banana-2`
- Premium and creator source: `google/nano-banana-pro`
