# Wiggly 1 Selfie, 9 Images Format

This runnable Repo preserves the original selfie, nine exact prompts, and nine
source outputs gathered from @skaigenerated. Each selected scene is one
independent Replicate prediction so cost and retries stay visible.

Run from `v3`:

```bash
npm install
npm run format:skai-image -- check --format=selfie-nine-images
npm run format:skai-image -- smoke --format=selfie-nine-images
npm run format:skai-image -- init --format=selfie-nine-images --run=my-umbrella --variant=petal-umbrella --input=/absolute/path/to/selfie.jpg
npm run format:skai-image -- validate --format=selfie-nine-images --run=my-umbrella
npm run format:skai-image -- estimate --format=selfie-nine-images --run=my-umbrella
```

Generation requires `REPLICATE_API_TOKEN` and explicit approval:

```bash
npm run format:skai-image -- render --format=selfie-nine-images --run=my-umbrella --approve-paid
```

Use one run per selected variant. A complete nine-image set therefore uses nine
paid predictions. No Replicate proof call was made while packaging this Repo.

Model routes:

- Economy: `google/nano-banana-2-lite`
- Default/source: `google/nano-banana-2`
- Premium: `google/nano-banana-pro`
