---
name: wiggly-chrome-void
description: Surround one fashion photo with photoreal liquid-chrome sculpture while preserving the subject, outfit, pose, camera, and original color using the exact gathered SKAI prompt.
---

# Chrome Void

Use the packaged runner and prompt. Do not call Replicate separately or create
another render path.

Ask one short question first:

> Which photo should I surround with the Chrome Void?

Use Nano Banana 2 by default, Nano Banana 2 Lite for economy, or Nano Banana
Pro for the premium or source-model route.

```bash
npm run format:skai-image -- check --format=chrome-void
npm run format:skai-image -- init --format=chrome-void --run=<id> --input=<absolute-image-path>
npm run format:skai-image -- validate --format=chrome-void --run=<id>
npm run format:skai-image -- estimate --format=chrome-void --run=<id>
npm run format:skai-image -- render --format=chrome-void --run=<id> --approve-paid
npm run format:skai-image -- inspect --format=chrome-void --run=<id>
npm run format:skai-image -- inspect --format=chrome-void --run=<id> --visual-pass --review-notes="<specific observations>"
npm run format:skai-image -- finalize --format=chrome-void --run=<id> --approve-final
```

Hard rules:

- Preserve identity, facial features, hair, skin tone, outfit, pose, body proportions, camera angle, and original colors.
- Surround the subject with organic liquid-chrome structures without covering the face or important body parts.
- Require believable reflections, contact shadows, depth, perspective, soft daylight, and premium fashion-editorial finish.
- Validate before spending.
- Never generate without `--approve-paid`.
- Persist and resume the same prediction ID.
- Never exceed three attempts.
- View the actual output and record notes before `--approve-final`.
- Never print, store, or commit `REPLICATE_API_TOKEN`.
