---
name: wiggly-red-dead-redemption
description: Transform one photo into a cinematic 1899 Western video-game scene using the exact gathered SKAI prompt.
---

# Red Dead Redemption

Use the packaged runner and prompt. Do not call Replicate separately or create
another render path.

Ask one short question first:

> Which photo should I turn into a Red Dead Redemption-style scene?

Use Nano Banana 2 by default, Nano Banana 2 Lite for economy, or Nano Banana
Pro only when the user requests the source/premium route.

```bash
npm run format:skai-image -- check --format=red-dead-redemption
npm run format:skai-image -- init --format=red-dead-redemption --run=<id> --input=<absolute-image-path>
npm run format:skai-image -- validate --format=red-dead-redemption --run=<id>
npm run format:skai-image -- estimate --format=red-dead-redemption --run=<id>
npm run format:skai-image -- render --format=red-dead-redemption --run=<id> --approve-paid
npm run format:skai-image -- inspect --format=red-dead-redemption --run=<id>
npm run format:skai-image -- inspect --format=red-dead-redemption --run=<id> --visual-pass --review-notes="<specific observations>"
npm run format:skai-image -- finalize --format=red-dead-redemption --run=<id> --approve-final
```

Hard rules:

- Preserve the exact composition, pose, expression, framing, camera angle, and layout.
- Adapt the subject's identity, clothing, props, and setting consistently to 1899.
- Keep the result recognizably video-game imagery rather than live action or illustration.
- Validate before spending.
- Never generate without `--approve-paid`.
- Persist and resume the same prediction ID.
- Never exceed three attempts.
- View the actual output and record notes before `--approve-final`.
- Never print, store, or commit `REPLICATE_API_TOKEN`.
