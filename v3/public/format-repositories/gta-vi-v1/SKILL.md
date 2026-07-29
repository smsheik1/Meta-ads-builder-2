---
name: wiggly-gta-vi
description: Transform one portrait into a grounded, cinematic GTA VI-inspired character using the exact gathered SKAI prompt.
---

# GTA VI

Use the packaged runner and prompt. Do not call Replicate separately or create
another render path.

Ask one short question first:

> Which photo should I transform into a cinematic GTA VI-style character?

Use Nano Banana 2 by default, Nano Banana 2 Lite for economy, or Nano Banana
Pro only when the user requests the source/premium route.

```bash
npm run format:skai-image -- check --format=gta-vi
npm run format:skai-image -- init --format=gta-vi --run=<id> --input=<absolute-image-path>
npm run format:skai-image -- validate --format=gta-vi --run=<id>
npm run format:skai-image -- estimate --format=gta-vi --run=<id>
npm run format:skai-image -- render --format=gta-vi --run=<id> --approve-paid
npm run format:skai-image -- inspect --format=gta-vi --run=<id>
npm run format:skai-image -- inspect --format=gta-vi --run=<id> --visual-pass --review-notes="<specific observations>"
npm run format:skai-image -- finalize --format=gta-vi --run=<id> --approve-final
```

Hard rules:

- Preserve the subject, pose, expression, and composition.
- Validate before spending.
- Never generate without `--approve-paid`.
- Persist and resume the same prediction ID.
- Never exceed three attempts.
- View the actual output and record notes before `--approve-final`.
- Never print, store, or commit `REPLICATE_API_TOKEN`.
