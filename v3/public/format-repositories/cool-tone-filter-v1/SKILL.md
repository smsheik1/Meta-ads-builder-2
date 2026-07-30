---
name: wiggly-cool-tone-filter
description: Apply the exact gathered SKAI Cool Tone Filter prompt to one photograph.
---

# Cool Tone Filter

Use the packaged runner and exact prompt. Do not call Replicate separately or
create another render path.

Ask one short question:

> Which photo should I give the Cool Tone Filter?

Then run:

```bash
npm run format:skai-image -- init --format=cool-tone-filter --run=<id> --input=<absolute-image-path>
npm run format:skai-image -- validate --format=cool-tone-filter --run=<id>
npm run format:skai-image -- estimate --format=cool-tone-filter --run=<id>
npm run format:skai-image -- render --format=cool-tone-filter --run=<id> --approve-paid
npm run format:skai-image -- inspect --format=cool-tone-filter --run=<id>
npm run format:skai-image -- inspect --format=cool-tone-filter --run=<id> --visual-pass --review-notes="<specific observations>"
npm run format:skai-image -- finalize --format=cool-tone-filter --run=<id> --approve-final
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
