---
name: wiggly-cinematic-photographer
description: Create one moody editorial photographer portrait from the exact gathered SKAI prompt.
---

# Cinematic Photographer

Use the packaged runner and prompt. Do not call Replicate separately or create another render path.

Ask one short question first:

> Should I use the exact packaged photographer concept, or do you want to change the subject while keeping the cinematic recipe?

Use Nano Banana 2 by default, Nano Banana 2 Lite for economy, or GPT Image 2 when the user asks for the source model. The exact source prompt is the validated default.

```bash
npm run format:skai-image -- check --format=cinematic-photographer
npm run format:skai-image -- init --format=cinematic-photographer --run=<id>
npm run format:skai-image -- validate --format=cinematic-photographer --run=<id>
npm run format:skai-image -- estimate --format=cinematic-photographer --run=<id>
npm run format:skai-image -- render --format=cinematic-photographer --run=<id> --approve-paid
npm run format:skai-image -- inspect --format=cinematic-photographer --run=<id>
npm run format:skai-image -- inspect --format=cinematic-photographer --run=<id> --visual-pass --review-notes="<specific observations>"
npm run format:skai-image -- finalize --format=cinematic-photographer --run=<id> --approve-final
```

Hard rules:

- Keep the packaged prompt exact unless the user explicitly asks to change the subject.
- Validate before spending.
- Never generate without `--approve-paid`.
- Persist and resume the same prediction ID.
- Never exceed three attempts.
- View the actual output and record notes before `--approve-final`.
- Never print, store, or commit `REPLICATE_API_TOKEN`.
