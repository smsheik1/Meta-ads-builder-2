---
name: wiggly-old-money-shot
description: Transform one portrait into a timeless black-and-white old-money editorial beside a classic roadster using the exact gathered SKAI prompt.
---

# Old Money Shot

Use the packaged runner and prompt. Do not call Replicate separately or create
another render path.

Ask one short question first:

> Which portrait should I turn into an Old Money Shot?

Use Nano Banana 2 by default, Nano Banana 2 Lite for economy, or Nano Banana
Pro for a premium alternative. Use GPT Image 2 only when the user requests the
source-model route.

```bash
npm run format:skai-image -- check --format=old-money-shot
npm run format:skai-image -- init --format=old-money-shot --run=<id> --input=<absolute-image-path>
npm run format:skai-image -- validate --format=old-money-shot --run=<id>
npm run format:skai-image -- estimate --format=old-money-shot --run=<id>
npm run format:skai-image -- render --format=old-money-shot --run=<id> --approve-paid
npm run format:skai-image -- inspect --format=old-money-shot --run=<id>
npm run format:skai-image -- inspect --format=old-money-shot --run=<id> --visual-pass --review-notes="<specific observations>"
npm run format:skai-image -- finalize --format=old-money-shot --run=<id> --approve-final
```

Hard rules:

- Preserve the subject's recognizable identity and contemplative three-quarter gaze.
- Keep the low camera angle, classic roadster, open-collar shirt, tailored pants, and relaxed styling.
- Keep the result monochrome, deeply contrasted, softly lit, visibly grainy, and editorial rather than glossy or modern.
- Validate before spending.
- Never generate without `--approve-paid`.
- Persist and resume the same prediction ID.
- Never exceed three attempts.
- View the actual output and record notes before `--approve-final`.
- Never print, store, or commit `REPLICATE_API_TOKEN`.
