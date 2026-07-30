---
name: wiggly-ccd-jpeg-filter
description: Give one existing photo an authentic noisy, compressed late-2000s consumer-camera rendering while preserving its composition, subject, lighting, and colors using the exact gathered SKAI prompt.
---

# CCD JPEG Filter

Use the packaged runner and prompt. Do not call Replicate separately or create
another render path.

Ask one short question first:

> Which photo should I give the CCD JPEG look?

Use Nano Banana 2 by default, Nano Banana 2 Lite for economy, or Nano Banana
Pro for the premium route. Use GPT Image 2 for the source-model route.

```bash
npm run format:skai-image -- check --format=ccd-jpeg-filter
npm run format:skai-image -- init --format=ccd-jpeg-filter --run=<id> --input=<absolute-image-path>
npm run format:skai-image -- validate --format=ccd-jpeg-filter --run=<id>
npm run format:skai-image -- estimate --format=ccd-jpeg-filter --run=<id>
npm run format:skai-image -- render --format=ccd-jpeg-filter --run=<id> --approve-paid
npm run format:skai-image -- inspect --format=ccd-jpeg-filter --run=<id>
npm run format:skai-image -- inspect --format=ccd-jpeg-filter --run=<id> --visual-pass --review-notes="<specific observations>"
npm run format:skai-image -- finalize --format=ccd-jpeg-filter --run=<id> --approve-final
```

Hard rules:

- Preserve the original composition, framing, perspective, lighting, subject, and colors.
- Change only the photographic rendering; do not add, remove, or restage scene content.
- Require dense electronic sensor noise, realistic JPEG artifacts, reduced micro-detail, weak sharpening, and low dynamic range.
- Keep the result accidental and consumer-digital, never cinematic film grain or an obvious retro overlay.
- Validate before spending.
- Never generate without `--approve-paid`.
- Persist and resume the same prediction ID.
- Never exceed three attempts.
- View the actual output and record notes before `--approve-final`.
- Never print, store, or commit `REPLICATE_API_TOKEN`.
