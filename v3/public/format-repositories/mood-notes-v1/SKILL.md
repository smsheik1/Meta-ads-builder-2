---
name: wiggly-mood-notes
description: Transform one lifestyle photo into an annotated visual journal using the exact gathered SKAI prompt.
---

# Mood Notes

Use the packaged runner and prompt. Do not call Replicate separately or create
another render path.

Ask one short question first:

> Which photo should I turn into a personal Mood Notes journal image?

Use Nano Banana 2 by default, Nano Banana 2 Lite for economy, or Nano Banana
Pro only when the user requests the source/premium route.

```bash
npm run format:skai-image -- check --format=mood-notes
npm run format:skai-image -- init --format=mood-notes --run=<id> --input=<absolute-image-path>
npm run format:skai-image -- validate --format=mood-notes --run=<id>
npm run format:skai-image -- estimate --format=mood-notes --run=<id>
npm run format:skai-image -- render --format=mood-notes --run=<id> --approve-paid
npm run format:skai-image -- inspect --format=mood-notes --run=<id>
npm run format:skai-image -- inspect --format=mood-notes --run=<id> --visual-pass --review-notes="<specific observations>"
npm run format:skai-image -- finalize --format=mood-notes --run=<id> --approve-final
```

Hard rules:

- Preserve the original subjects, objects, composition, lighting, and atmosphere.
- Keep annotations short, specific, legible, and sparse.
- Keep the music player compact and away from important subjects.
- Validate before spending.
- Never generate without `--approve-paid`.
- Persist and resume the same prediction ID.
- Never exceed three attempts.
- View the actual output and record notes before `--approve-final`.
- Never print, store, or commit `REPLICATE_API_TOKEN`.
