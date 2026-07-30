---
name: wiggly-blue-phosphor
description: Apply the exact gathered SKAI Blue Phosphor Filter to one photograph while preserving the source image.
---

# Blue Phosphor Filter

Use the packaged runner and exact prompt. Do not call Replicate separately or
create another render path.

Ask one short question:

> Which photo should I apply the Blue Phosphor Filter to?

Then run:

```bash
npm run format:skai-image -- init --format=blue-phosphor --run=<id> --input=<absolute-image-path>
npm run format:skai-image -- validate --format=blue-phosphor --run=<id>
npm run format:skai-image -- estimate --format=blue-phosphor --run=<id>
npm run format:skai-image -- render --format=blue-phosphor --run=<id> --approve-paid
npm run format:skai-image -- inspect --format=blue-phosphor --run=<id>
npm run format:skai-image -- inspect --format=blue-phosphor --run=<id> --visual-pass --review-notes="<specific observations>"
npm run format:skai-image -- finalize --format=blue-phosphor --run=<id> --approve-final
```

Hard rules:

- Preserve the source identity, clothing, pose, composition, lighting, and background.
- Keep the exact gathered prompt and negative prompt unless the user explicitly requests a change.
- Use Nano Banana 2 by default, Lite for economy, or Pro for premium and creator-source fidelity.
- Validate before spending and never render without `--approve-paid`.
- Persist and resume the prediction ID.
- Never exceed three attempts.
- View the output and record specific visual-review notes before finalizing.
- Never print, store, or commit `REPLICATE_API_TOKEN`.
