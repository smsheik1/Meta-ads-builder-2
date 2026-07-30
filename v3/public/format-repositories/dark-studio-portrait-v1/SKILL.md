---
name: wiggly-dark-studio-portrait
description: Turn one portrait into a grainy, high-contrast monochrome studio portrait using the exact gathered SKAI prompt.
---

# Dark Studio Portrait

Use the packaged runner and exact prompt. Do not call Replicate separately or
create another render path.

Ask one short question:

> Which portrait should I turn into a Dark Studio Portrait?

Then run:

```bash
npm run format:skai-image -- init --format=dark-studio-portrait --run=<id> --input=<absolute-image-path>
npm run format:skai-image -- validate --format=dark-studio-portrait --run=<id>
npm run format:skai-image -- estimate --format=dark-studio-portrait --run=<id>
npm run format:skai-image -- render --format=dark-studio-portrait --run=<id> --approve-paid
npm run format:skai-image -- inspect --format=dark-studio-portrait --run=<id>
npm run format:skai-image -- inspect --format=dark-studio-portrait --run=<id> --visual-pass --review-notes="<specific observations>"
npm run format:skai-image -- finalize --format=dark-studio-portrait --run=<id> --approve-final
```

Hard rules:

- Preserve the source identity.
- Keep the exact gathered prompt unless the user explicitly requests a change.
- Use Nano Banana 2 by default, Lite for economy, Pro for premium, or GPT Image 2 for the creator's source route.
- Validate before spending and never render without `--approve-paid`.
- Persist and resume the prediction id.
- Never exceed three attempts.
- View the output and record specific visual-review notes before finalizing.
- Never print, store, or commit `REPLICATE_API_TOKEN`.
