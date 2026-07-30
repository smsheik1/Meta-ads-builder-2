---
name: wiggly-sparkling-effect
description: Apply the exact gathered SKAI Sparkling Effect prompt to one photograph.
---

# Sparkling Effect

Use the packaged runner and exact prompt. Do not call Replicate separately or
create another render path.

Ask one short question:

> Which photo should I give the Sparkling Effect?

Then run:

```bash
npm run format:skai-image -- init --format=sparkling-effect --run=<id> --input=<absolute-image-path>
npm run format:skai-image -- validate --format=sparkling-effect --run=<id>
npm run format:skai-image -- estimate --format=sparkling-effect --run=<id>
npm run format:skai-image -- render --format=sparkling-effect --run=<id> --approve-paid
npm run format:skai-image -- inspect --format=sparkling-effect --run=<id>
npm run format:skai-image -- inspect --format=sparkling-effect --run=<id> --visual-pass --review-notes="<specific observations>"
npm run format:skai-image -- finalize --format=sparkling-effect --run=<id> --approve-final
```

Hard rules:

- Keep the exact gathered prompt unless the user explicitly requests a change.
- Use Nano Banana 2 by default, Lite for economy, or Pro for premium.
- Treat GPT Image 2 as creator provenance, not as the packaged Replicate route.
- Validate before spending and never render without `--approve-paid`.
- Persist and resume the prediction ID.
- Never exceed three attempts.
- View the output and record specific visual-review notes before finalizing.
- Never print, store, or commit `REPLICATE_API_TOKEN`.
