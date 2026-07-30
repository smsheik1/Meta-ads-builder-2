---
name: wiggly-dusk-effect
description: Apply the exact gathered SKAI Dusk Effect prompt to one outdoor photograph.
---

# Dusk Effect

Use the packaged runner and exact prompt. Do not call Replicate separately or
create another render path.

Ask one short question:

> Which outdoor photo should I give the Dusk Effect?

Then run:

```bash
npm run format:skai-image -- init --format=dusk-effect --run=<id> --input=<absolute-image-path>
npm run format:skai-image -- validate --format=dusk-effect --run=<id>
npm run format:skai-image -- estimate --format=dusk-effect --run=<id>
npm run format:skai-image -- render --format=dusk-effect --run=<id> --approve-paid
npm run format:skai-image -- inspect --format=dusk-effect --run=<id>
npm run format:skai-image -- inspect --format=dusk-effect --run=<id> --visual-pass --review-notes="<specific observations>"
npm run format:skai-image -- finalize --format=dusk-effect --run=<id> --approve-final
```

Hard rules:

- Keep the exact gathered prompt unless the user explicitly requests a change.
- Use Nano Banana 2 by default, Lite for economy, or Pro for premium and creator-source fidelity.
- Validate before spending and never render without `--approve-paid`.
- Persist and resume the prediction ID.
- Never exceed three attempts.
- View the output and record specific visual-review notes before finalizing.
- Never print, store, or commit `REPLICATE_API_TOKEN`.
