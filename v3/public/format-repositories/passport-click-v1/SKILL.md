---
name: wiggly-passport-click
description: Turn one portrait into a believable extreme-close-up passport post whose unexpectedly photogenic government photo becomes the hook, using the exact gathered SKAI prompt.
---

# Passport Click

Use the packaged runner and prompt. Do not call Replicate separately or create
another render path.

Ask one short question first:

> Which portrait should I turn into a Passport Click?

Use Nano Banana 2 by default, Nano Banana 2 Lite for economy, or Nano Banana
Pro for the premium and original source-model route.

```bash
npm run format:skai-image -- check --format=passport-click
npm run format:skai-image -- init --format=passport-click --run=<id> --input=<absolute-image-path>
npm run format:skai-image -- validate --format=passport-click --run=<id>
npm run format:skai-image -- estimate --format=passport-click --run=<id>
npm run format:skai-image -- render --format=passport-click --run=<id> --approve-paid
npm run format:skai-image -- inspect --format=passport-click --run=<id>
npm run format:skai-image -- inspect --format=passport-click --run=<id> --visual-pass --review-notes="<specific observations>"
npm run format:skai-image -- finalize --format=passport-click --run=<id> --approve-final
```

Hard rules:

- Preserve the source person's recognizable identity.
- Keep the government portrait straight-on, centered, neutral, and subtly photogenic.
- Let the passport fill approximately 97-100% of the frame and crop beyond every edge.
- Require believable security printing, lamination, wear, dust, scratches, and slight physical distortion.
- Accumulate print, smartphone, screenshot, and repost degradation without turning it into a clean product photo.
- Validate before spending.
- Never generate without `--approve-paid`.
- Persist and resume the same prediction ID.
- Never exceed three attempts.
- View the actual output and record notes before `--approve-final`.
- Never print, store, or commit `REPLICATE_API_TOKEN`.
