# Wiggly Fake It Till You Make It Format

This runnable Repo preserves the eight exact prompts and eight native carousel
examples gathered from @skaigenerated. Each selected scene is one independent
Replicate prediction so cost and retries stay visible.

Run from `v3`:

```bash
npm install
npm run format:skai-image -- check --format=fake-it-till-you-make-it
npm run format:skai-image -- smoke --format=fake-it-till-you-make-it
npm run format:skai-image -- init --format=fake-it-till-you-make-it --run=my-selfie --variant=yellow-pirelli-cap --input=/absolute/path/to/portrait.jpg
npm run format:skai-image -- validate --format=fake-it-till-you-make-it --run=my-selfie
npm run format:skai-image -- estimate --format=fake-it-till-you-make-it --run=my-selfie
```

Generation requires `REPLICATE_API_TOKEN` and explicit approval:

```bash
npm run format:skai-image -- render --format=fake-it-till-you-make-it --run=my-selfie --approve-paid
```

Use one run per selected variant. A complete eight-image set uses eight paid
predictions. No Replicate proof call was made while packaging this Repo.

Model routes:

- Economy: `google/nano-banana-2-lite`
- Default: `google/nano-banana-2`
- Premium/source: `google/nano-banana-pro`
