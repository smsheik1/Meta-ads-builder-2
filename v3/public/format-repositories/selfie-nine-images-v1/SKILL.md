---
name: wiggly-selfie-nine-images
description: Turn one selfie into a consistent nine-scene surreal editorial photo set using the exact gathered SKAI prompts.
---

# 1 Selfie, 9 Images

Use the packaged runner and prompt variants. Do not call Replicate separately
or create another render path.

Ask one short question at a time:

1. Which selfie should I use?
2. Do you want one scene or the complete nine-image set?

Variants:

`petal-umbrella`, `cloud`, `chair`, `mirror`, `staircase`, `bed`,
`phone-booth`, `grocery-cart`, `door`

For each selected variant, use a unique run id:

```bash
npm run format:skai-image -- init --format=selfie-nine-images --run=<id> --variant=<variant> --input=<absolute-image-path>
npm run format:skai-image -- validate --format=selfie-nine-images --run=<id>
npm run format:skai-image -- estimate --format=selfie-nine-images --run=<id>
npm run format:skai-image -- render --format=selfie-nine-images --run=<id> --approve-paid
npm run format:skai-image -- inspect --format=selfie-nine-images --run=<id>
npm run format:skai-image -- inspect --format=selfie-nine-images --run=<id> --visual-pass --review-notes="<specific observations>"
npm run format:skai-image -- finalize --format=selfie-nine-images --run=<id> --approve-final
```

Hard rules:

- Preserve the same person, outfit, skin tone, and proportions across scenes.
- State that one scene is one paid prediction; all nine means nine predictions.
- Validate every run before spending.
- Never generate without `--approve-paid`.
- Persist and resume each prediction id.
- Never exceed three attempts for any scene.
- View every output and record scene-specific notes before finalizing.
- Never print, store, or commit `REPLICATE_API_TOKEN`.
