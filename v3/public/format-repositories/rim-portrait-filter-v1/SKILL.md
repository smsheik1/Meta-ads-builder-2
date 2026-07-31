---
name: wiggly-rim-portrait-filter
description: Turn one portrait into a centered sculptural silhouette using the exact gathered SKAI rim-light prompt.
---

# Rim Portrait Filter

Use the packaged runner and exact prompt. Do not call Replicate separately or
create another render path.

Ask one short question:

> Which portrait should I turn into a Rim Portrait?

Then run:

```bash
npm run format:skai-image -- init --format=rim-portrait-filter --run=<id> --input=<absolute-image-path>
npm run format:skai-image -- validate --format=rim-portrait-filter --run=<id>
npm run format:skai-image -- estimate --format=rim-portrait-filter --run=<id>
npm run format:skai-image -- render --format=rim-portrait-filter --run=<id> --approve-paid
npm run format:skai-image -- inspect --format=rim-portrait-filter --run=<id>
npm run format:skai-image -- inspect --format=rim-portrait-filter --run=<id> --visual-pass --review-notes="<specific observations>"
npm run format:skai-image -- finalize --format=rim-portrait-filter --run=<id> --approve-final
```

Hard rules:

- Preserve the source identity.
- Keep the exact gathered prompt unless the user explicitly requests a change.
- Use Nano Banana 2 by default, Lite for economy, or Pro for premium and the creator's source route.
- Validate before spending and never render without `--approve-paid`.
- Persist and resume the prediction id.
- Never exceed three attempts.
- View the output and record specific visual-review notes before finalizing.
- Never print, store, or commit `REPLICATE_API_TOKEN`.
