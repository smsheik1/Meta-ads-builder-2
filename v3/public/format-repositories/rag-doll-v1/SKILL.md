---
name: wiggly-rag-doll
description: Transform one portrait into a handcrafted felt character using the exact gathered SKAI prompt.
---

# Rag Doll

Use the packaged runner and prompt. Do not call Replicate separately or create
another render path.

Ask one short question first:

> Which photo should I turn into a handmade felt character?

Use Nano Banana 2 by default, Nano Banana 2 Lite for economy, or Nano Banana
Pro only when the user requests the source/premium route.

```bash
npm run format:skai-image -- check --format=rag-doll
npm run format:skai-image -- init --format=rag-doll --run=<id> --input=<absolute-image-path>
npm run format:skai-image -- validate --format=rag-doll --run=<id>
npm run format:skai-image -- estimate --format=rag-doll --run=<id>
npm run format:skai-image -- render --format=rag-doll --run=<id> --approve-paid
npm run format:skai-image -- inspect --format=rag-doll --run=<id>
npm run format:skai-image -- inspect --format=rag-doll --run=<id> --visual-pass --review-notes="<specific observations>"
npm run format:skai-image -- finalize --format=rag-doll --run=<id> --approve-final
```

Hard rules:

- Preserve the subject, pose, expression, clothing, and composition.
- Transform every visible material into wool felt.
- Validate before spending.
- Never generate without `--approve-paid`.
- Persist and resume the same prediction ID.
- Never exceed three attempts.
- View the actual output and record notes before `--approve-final`.
- Never print, store, or commit `REPLICATE_API_TOKEN`.
