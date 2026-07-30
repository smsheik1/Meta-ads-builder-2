---
name: wiggly-fake-it-till-you-make-it
description: Turn one portrait into up to eight believable lifestyle posts using the exact gathered SKAI prompts.
---

# Fake It Till You Make It

Use the packaged runner and prompt variants. Do not call Replicate separately
or create another render path.

Ask one short question at a time:

1. Which portrait should I use?
2. Do you want one scene or the complete eight-image set?

Variants:

`sheet-mask-mirror`, `luxury-bathroom`, `shooting-range`,
`yellow-pirelli-cap`, `tropical-hat`, `nyc-bench`, `concrete-cafe`,
`bed-mask`

For each selected variant, use a unique run id:

```bash
npm run format:skai-image -- init --format=fake-it-till-you-make-it --run=<id> --variant=<variant> --input=<absolute-image-path>
npm run format:skai-image -- validate --format=fake-it-till-you-make-it --run=<id>
npm run format:skai-image -- estimate --format=fake-it-till-you-make-it --run=<id>
npm run format:skai-image -- render --format=fake-it-till-you-make-it --run=<id> --approve-paid
npm run format:skai-image -- inspect --format=fake-it-till-you-make-it --run=<id>
npm run format:skai-image -- inspect --format=fake-it-till-you-make-it --run=<id> --visual-pass --review-notes="<specific observations>"
npm run format:skai-image -- finalize --format=fake-it-till-you-make-it --run=<id> --approve-final
```

Hard rules:

- Preserve the reference identity unless the user explicitly requests a new subject.
- Keep the selected gathered prompt exact.
- State that one scene is one paid prediction; all eight means eight predictions.
- Validate every run before spending.
- Never generate without `--approve-paid`.
- Persist and resume each prediction id.
- Never exceed three attempts for any scene.
- View every output and record scene-specific notes before finalizing.
- Never print, store, or commit `REPLICATE_API_TOKEN`.
